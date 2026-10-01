// ---------- Notifications: one inbox for the whole dashboard, and the Notion app ----------
// Apps register a source with TrainerNotify.register({ id, label, app, poll }). Every hour (while the
// dashboard is open) and on "Check now", each source's poll() returns the new things it found, and
// they land here as notifications: the bell in the menu bar lists them across all apps.
// The Notion app is the first source: it reads a Slack channel the owner names (Notion's update messages).
//   notifications/{id}                  source, title, body, at, read, app, link
//   notification_settings/notion        channel_id, link_base, last_ts, last_checked, error
(function () {
  const use = (name) => Promise.resolve().then(() => (window.claude ? window.claude.use(name) : null)).catch(() => null);
  const dbReady = use("db");
  const esc = (s) => escapeHtml(s == null ? "" : s);
  const HOUR = 3600000;
  const slack = () => window.TrainerSlack;

  // ---- Storage (db, or memory) ----
  let db = null;
  let notes = [];
  let settingsDoc = {};
  const listeners = new Set();
  const notify = () => listeners.forEach((f) => f());
  const sources = new Map();
  const known = new Set();
  dbReady.then((d) => {
    db = d;
    if (!db) return;
    db.collection("notifications").orderBy("at", "desc").limit(200).onSnapshot(
      (snap) => {
        notes = snap.docs.map((doc) => ({ id: doc.id, ...JSON.parse(JSON.stringify(doc.data() || {})) }));
        notes.forEach((n) => known.add(n.id));
        notify();
      },
      () => {}
    );
    db.doc("notification_settings/notion").onSnapshot(
      (snap) => {
        settingsDoc = snap.exists ? JSON.parse(JSON.stringify(snap.data() || {})) : {};
        notify();
      },
      () => {}
    );
  });
  const unread = (source) => notes.filter((n) => !n.read && (!source || n.source === source));

  function putNote(n) {
    known.add(n.id);
    notes = [n, ...notes.filter((x) => x.id !== n.id)].sort((a, b) => (b.at || "").localeCompare(a.at || ""));
    notify();
    if (!db) return Promise.resolve();
    const { id, ...fields } = n;
    return db.doc(`notifications/${id}`).set(fields).catch(() => {});
  }
  function markRead(ids, read = true) {
    ids.forEach((id) => {
      const n = notes.find((x) => x.id === id);
      if (n && !!n.read !== read) putNote({ ...n, read });
    });
  }
  function saveSettings(patch) {
    settingsDoc = { ...settingsDoc, ...patch };
    notify();
    return db ? db.doc("notification_settings/notion").set(settingsDoc).catch(() => {}) : Promise.resolve();
  }

  // ---- Polling ----
  const state = { running: false, last: 0, results: {} };
  const LAST_KEY = "trainer.lastNotifyRun";
  try {
    state.last = Number(localStorage.getItem(LAST_KEY)) || 0;
  } catch {}
  async function runAll(why) {
    if (state.running) return;
    state.running = true;
    notify();
    await dbReady;
    for (const src of sources.values()) {
      try {
        const found = (await src.poll({ known: (id) => known.has(id), settings: () => settingsDoc, saveSettings })) || [];
        let added = 0;
        for (const it of found) {
          if (known.has(it.id)) continue;
          added++;
          await putNote({ source: src.id, app: src.app, read: false, ...it });
        }
        state.results[src.id] = { at: new Date().toISOString(), added, error: "" };
      } catch (e) {
        state.results[src.id] = { at: new Date().toISOString(), added: 0, error: slack()?.errorText ? slack().errorText(e) : "Couldn't check." };
      }
    }
    state.last = Date.now();
    try {
      localStorage.setItem(LAST_KEY, String(state.last));
    } catch {}
    state.running = false;
    notify();
  }
  function startSchedule() {
    // A check shortly after the dashboard opens (if the last one is over an hour old), then every hour.
    setTimeout(() => Date.now() - state.last > HOUR && runAll("open"), 6000);
    setInterval(() => runAll("hourly"), HOUR);
    // A laptop that slept through the hour catches up when the tab wakes.
    document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && Date.now() - state.last > HOUR && runAll("wake"));
  }

  // ---- Reading Slack messages ----
  const metaLine = /^(Reactions|Thread)\b.*$/;
  function parseChannel(raw) {
    const text = String(raw || "");
    return text
      .split(/(?=^=== Message from )/m)
      .filter((b) => b.startsWith("=== Message from "))
      .map((b) => {
        const lines = b.split("\n");
        const i = lines.findIndex((l) => /^Message TS:/.test(l));
        return {
          who: b.match(/^=== Message from (.*?)(?:\s*<[^>]*>)?\s*\(/m)?.[1] || "",
          ts: b.match(/^Message TS:\s*(\S+)/m)?.[1] || "",
          text: lines.slice(i + 1).filter((l) => !metaLine.test(l.trim())).join("\n").trim(),
        };
      })
      .filter((m) => m.ts);
  }
  // Slack's own markup turned into plain text.
  const plain = (t) =>
    String(t || "")
      .replace(/<(https?:[^|>]+)\|([^>]+)>/g, "$2")
      .replace(/<(https?:[^>]+)>/g, "$1")
      .replace(/<@[A-Z0-9]+>/g, "@someone")
      .replace(/[*_~`]/g, "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .trim();
  const firstUrl = (t) => (String(t || "").match(/<(https?:[^|>]+)(?:\|[^>]*)?>/) || String(t || "").match(/(https?:\/\/\S+)/) || [])[1] || "";
  // A channel ID, or a Slack link that contains one (…/archives/C0123ABCD45).
  function parseChannelInput(raw) {
    const v = String(raw || "").trim();
    const id = (/\/archives\/([A-Z0-9]{8,})/.exec(v) || /^#?([CGD][A-Z0-9]{8,})$/.exec(v) || [])[1] || "";
    const base = /^(https:\/\/[^/]+)\/archives\//.exec(v)?.[1] || "";
    return { id, base };
  }
  const permalink = (cfg, ts) => (cfg.link_base && cfg.channel_id ? `${cfg.link_base}/archives/${cfg.channel_id}/p${String(ts).replace(".", "")}` : "");

  // The Notion source: new messages in the channel the owner named.
  async function pollNotion(ctx) {
    const cfg = ctx.settings();
    if (!cfg.channel_id) return [];
    const s = slack();
    if (!s) throw new Error("Slack isn't available");
    const args = { channel_id: cfg.channel_id, limit: cfg.last_ts ? 50 : 10, response_format: "detailed" };
    if (cfg.last_ts) args.oldest = cfg.last_ts;
    let msgs;
    try {
      const r = await s.call("slack_read_channel", args, { cache: false });
      msgs = parseChannel(r?.payload?.messages);
    } catch (e) {
      await ctx.saveSettings({ last_checked: new Date().toISOString(), error: s.errorText(e) });
      throw e;
    }
    msgs = msgs.filter((m) => m.text && (!cfg.last_ts || parseFloat(m.ts) > parseFloat(cfg.last_ts))).sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));
    const newest = msgs.length ? msgs[msgs.length - 1].ts : cfg.last_ts || "";
    await ctx.saveSettings({ last_checked: new Date().toISOString(), last_ts: newest, error: "" });
    return msgs.map((m) => {
      const lines = plain(m.text).split("\n").map((l) => l.trim()).filter(Boolean);
      return {
        id: `notion:${cfg.channel_id}:${m.ts}`,
        title: (lines[0] || "Notion update").slice(0, 140),
        body: lines.slice(1).join(" ").slice(0, 420),
        at: new Date(parseFloat(m.ts) * 1000).toISOString(),
        link: permalink(cfg, m.ts) || firstUrl(m.text),
        from: m.who,
      };
    });
  }

  function register(src) {
    sources.set(src.id, src);
  }
  register({ id: "notion", label: "Notion updates", app: "notion", poll: pollNotion });

  window.TrainerNotify = { register, runAll, unread, markRead, onChange: (f) => (listeners.add(f), () => listeners.delete(f)), list: () => notes, status: () => ({ ...state }) };

  // ---- Time ----
  const when = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const mins = Math.round((Date.now() - d) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    if (mins < 60 * 24 && d.toDateString() === new Date().toDateString()) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };
  const sourceLabel = (id) => sources.get(id)?.label || id;

  // ---- The bell in the menu bar ----
  const bell = document.createElement("button");
  bell.type = "button";
  bell.id = "bell";
  bell.setAttribute("aria-label", "Notifications");
  bell.setAttribute("aria-haspopup", "true");
  bell.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg><span class="bell-badge" hidden></span>`;
  document.querySelector(".menubar-right")?.prepend(bell);
  let panel = null;
  const badge = bell.querySelector(".bell-badge");
  function drawBell() {
    const n = unread().length;
    badge.hidden = !n;
    badge.textContent = n > 99 ? "99+" : String(n);
    bell.setAttribute("aria-label", n ? `Notifications, ${n} unread` : "Notifications");
    if (panel) drawPanel();
  }
  function drawPanel() {
    const list = notes.slice(0, 40);
    const st = state;
    panel.innerHTML = `
      <div class="np-head"><b>Notifications</b>
        <span class="np-actions"><button type="button" data-np-all${unread().length ? "" : " disabled"}>Mark all read</button><button type="button" data-np-check${st.running ? " disabled" : ""}>${st.running ? "Checking…" : "Check now"}</button></span></div>
      <ul class="np-list">${
        list.length
          ? list
              .map(
                (n) => `<li><button type="button" class="np-item${n.read ? "" : " is-new"}" data-np-open="${esc(n.id)}">
                  <span class="np-src">${esc(sourceLabel(n.source))} · ${esc(when(n.at))}</span>
                  <span class="np-title">${esc(n.title)}</span>
                  ${n.body ? `<span class="np-body">${esc(n.body)}</span>` : ""}</button></li>`
              )
              .join("")
          : `<li class="np-empty">Nothing yet. Notifications from your apps collect here, and are checked every hour while the dashboard is open.</li>`
      }</ul>
      <div class="np-foot">${st.last ? `Last checked ${esc(when(new Date(st.last).toISOString()))}` : "Not checked yet"} · every hour</div>`;
  }
  function closePanel() {
    panel?.remove();
    panel = null;
    document.removeEventListener("pointerdown", outside, true);
    document.removeEventListener("keydown", onKey, true);
    bell.setAttribute("aria-expanded", "false");
  }
  const outside = (e) => panel && !panel.contains(e.target) && !bell.contains(e.target) && closePanel();
  const onKey = (e) => e.key === "Escape" && closePanel();
  bell.addEventListener("click", () => {
    if (panel) return closePanel();
    panel = document.createElement("div");
    panel.className = "notif-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Notifications");
    document.body.appendChild(panel);
    bell.setAttribute("aria-expanded", "true");
    drawPanel();
    panel.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if ("npAll" in b.dataset) return markRead(unread().map((n) => n.id));
      if ("npCheck" in b.dataset) return void runAll("manual");
      if (b.dataset.npOpen) {
        const n = notes.find((x) => x.id === b.dataset.npOpen);
        if (!n) return;
        markRead([n.id]);
        closePanel();
        if (n.app && APPS[n.app]) openApp(n.app);
      }
    });
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", onKey, true);
  });
  listeners.add(drawBell);
  drawBell();

  // ---- The Notion app ----
  const ui = { el: null, busy: false, msg: "", editing: false };
  function chip(n) {
    return n.read ? "" : `<span class="chip ok">New</span>`;
  }
  function draw() {
    const el = ui.el;
    if (!el) return;
    const cfg = settingsDoc;
    const mine = notes.filter((n) => n.source === "notion");
    const checking = state.running;
    const newCount = mine.filter((n) => !n.read).length;
    const status = state.results.notion;
    const setup = !cfg.channel_id || ui.editing;
    el.innerHTML = `
      <div class="nt-root">
        <div class="nt-top">
          <div class="nt-heading"><h3>Notion</h3><span class="muted">Updates from your Notion channel on Slack</span></div>
          ${cfg.channel_id && !setup ? `<button type="button" class="btn" data-nt-check${checking ? " disabled" : ""}>${checking ? "Checking…" : "↻ Check now"}</button>` : ""}
        </div>
        <section class="nt-setup">
          ${
            setup
              ? `<form data-nt-form novalidate>
                  <label class="cw-field">Slack channel to read
                    <input type="text" name="channel" value="${esc(cfg.channel_id || "")}" placeholder="Channel ID (like C0123ABC45) or a link to the channel" autocomplete="off" /></label>
                  <p class="muted nt-help">In Slack, right-click the channel › <b>Copy link</b> and paste it here, or paste the channel ID. It's checked every hour while this dashboard is open; nothing is built into the code.</p>
                  <p class="sheet-status" data-nt-status role="status">${esc(ui.msg)}</p>
                  <div class="nt-row"><button type="submit" class="btn-primary">Save channel</button>${cfg.channel_id ? `<button type="button" class="btn" data-nt-cancel>Cancel</button>` : ""}</div>
                </form>`
              : `<div class="nt-channel"><span>Reading <b>${esc(cfg.channel_id)}</b>${cfg.link_base ? "" : ""}</span><button type="button" class="linkish" data-nt-edit>Change channel</button></div>
                 <small class="muted">${cfg.error ? `<b class="warn-text">${esc(cfg.error)}</b> · ` : ""}${cfg.last_checked ? `Last checked ${esc(when(cfg.last_checked))}${status ? (status.added ? ` · ${status.added} new` : " · nothing new") : ""}` : "Not checked yet"} · checked every hour while the dashboard is open</small>`
          }
        </section>
        ${ui.msg && !setup ? `<p class="quiz-note" role="status">${esc(ui.msg)}</p>` : ""}
        ${
          cfg.channel_id && !setup
            ? `<div class="nt-feed-head"><h4>Updates${newCount ? ` <span class="chip ok">${newCount} new</span>` : ""}</h4>${newCount ? `<button type="button" class="linkish" data-nt-read-all>Mark all read</button>` : ""}</div>
               ${
                 mine.length
                   ? `<ul class="nt-feed">${mine
                       .map(
                         (n) => `<li class="nt-item${n.read ? "" : " is-new"}">
                          <div class="nt-item-top"><b>${esc(n.title)}</b>${chip(n)}</div>
                          ${n.body ? `<p>${esc(n.body)}</p>` : ""}
                          <div class="nt-item-foot"><small class="muted">${esc(when(n.at))}${n.from ? ` · ${esc(n.from)}` : ""}</small>
                            ${n.link ? `<a href="${esc(n.link)}" target="_blank" rel="noopener noreferrer">Open</a>` : ""}
                            <button type="button" class="linkish" data-nt-toggle="${esc(n.id)}">${n.read ? "Mark unread" : "Mark read"}</button></div>
                        </li>`
                       )
                       .join("")}</ul>`
                   : `<p class="muted">No updates yet. ${checking ? "Checking…" : "New messages in the channel show up here after the next check."}</p>`
               }`
            : ""
        }
      </div>`;
    window.TrainerDesk?.setCrumbs("notion", [], () => ((ui.editing = false), draw()));
  }
  async function saveChannel(form) {
    const { id, base } = parseChannelInput(form.channel.value);
    const status = form.querySelector("[data-nt-status]");
    if (!id) return void (status.textContent = "That doesn't look like a Slack channel ID or link. IDs start with C (or G) and have letters and numbers, like C0123ABC45.");
    const changed = id !== settingsDoc.channel_id;
    ui.editing = false;
    ui.msg = "";
    await saveSettings({ channel_id: id, link_base: base || (changed ? "" : settingsDoc.link_base || ""), ...(changed ? { last_ts: "", last_checked: "", error: "" } : {}), updated_at: new Date().toISOString() });
    draw();
    runAll("manual");
  }
  window.TrainerNotion = {
    render(el) {
      ui.el = el;
      el.classList.add("flush", "nt-host");
      el.addEventListener("submit", (e) => {
        e.preventDefault();
        const f = e.target.closest("[data-nt-form]");
        if (f) saveChannel(f);
      });
      el.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        const ds = b.dataset;
        if ("ntEdit" in ds) return ((ui.editing = true), (ui.msg = ""), draw(), el.querySelector("[name=channel]")?.focus());
        if ("ntCancel" in ds) return ((ui.editing = false), (ui.msg = ""), draw());
        if ("ntCheck" in ds) return void runAll("manual");
        if ("ntReadAll" in ds) return markRead(notes.filter((n) => n.source === "notion" && !n.read).map((n) => n.id));
        if (ds.ntToggle) {
          const n = notes.find((x) => x.id === ds.ntToggle);
          if (n) markRead([n.id], !n.read);
        }
      });
      const redraw = () => {
        if (!ui.el || (ui.el.contains(document.activeElement) && document.activeElement.matches("input"))) return;
        draw();
      };
      listeners.add(redraw);
      ui.off = () => listeners.delete(redraw);
      draw();
      // Opening the app while it has never checked, or hasn't in an hour, checks now.
      dbReady.then(() => setTimeout(() => settingsDoc.channel_id && Date.now() - state.last > HOUR && runAll("open-app"), 300));
    },
    onClose() {
      ui.off?.();
      ui.el = null;
    },
    _parseChannelInput: parseChannelInput,
  };

  startSchedule();
})();
