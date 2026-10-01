// ---------- Notifications: one inbox for the whole dashboard, and Ops Updates ----------
// Apps register a source with TrainerNotify.register({ id, label, app, poll, every, cfg }). While the dashboard is
// open, each source is checked when it is due (default hourly; Ops Updates every 30 minutes) and on "Check now";
// poll() returns the new things it found, and they land here as notifications: the bell in the menu bar lists them
// across all apps.
// Ops Updates reads three Slack channels the owner names (CP Gen, Care, Notion Update Requests) and can forward
// a message to a cohort's Slack channel (the one set in Attendance).
//   notifications/{id}                       source, title, body, full, at, read, app, link, forwarded[]
//   notification_settings/{notion|ops_cp_gen|ops_care}   channel_id, link_base, last_ts, last_checked, error
//   (the Notion Update Requests page keeps the original "notion" document, so earlier updates carry over)
(function () {
  const use = (name) => Promise.resolve().then(() => (window.claude ? window.claude.use(name) : null)).catch(() => null);
  const dbReady = use("db");
  const esc = (s) => escapeHtml(s == null ? "" : s);
  const HOUR = 3600000;
  const HALF_HOUR = 1800000;
  const slack = () => window.TrainerSlack;
  const cc = () => window.CoachingCompass;

  // ---- Storage (db, or memory) ----
  let db = null;
  let notes = [];
  const cfgs = {}; // settings documents by id
  const CFG_IDS = ["notion", "ops_cp_gen", "ops_care"];
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
    CFG_IDS.forEach((id) =>
      db.doc(`notification_settings/${id}`).onSnapshot(
        (snap) => {
          cfgs[id] = snap.exists ? JSON.parse(JSON.stringify(snap.data() || {})) : {};
          notify();
        },
        () => {}
      )
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
  const cfgOf = (id) => cfgs[id] || {};
  function saveSettings(id, patch) {
    cfgs[id] = { ...cfgOf(id), ...patch };
    notify();
    return db ? db.doc(`notification_settings/${id}`).set(cfgs[id]).catch(() => {}) : Promise.resolve();
  }

  // ---- Polling ----
  const state = { running: false, last: 0, results: {} };
  const LAST_KEY = "trainer.lastNotifyRuns";
  let lastRun = {}; // source id -> when it was last checked
  try {
    lastRun = JSON.parse(localStorage.getItem(LAST_KEY) || "{}") || {};
    state.last = Math.max(0, ...Object.values(lastRun).map(Number));
  } catch {}
  const due = (src) => Date.now() - (lastRun[src.id] || 0) >= (src.every || HOUR) - 30000;
  // Checks the sources named in `only` (or all of them) regardless of schedule, or, with `onlyDue`, just the ones that are due.
  async function runAll(why, only, onlyDue) {
    if (state.running) return;
    state.running = true;
    notify();
    await dbReady;
    for (const src of sources.values()) {
      if (only && !only.includes(src.id)) continue;
      if (onlyDue && !due(src)) continue;
      try {
        const found = (await src.poll({ known: (id) => known.has(id), settings: () => cfgOf(src.cfg), saveSettings: (patch) => saveSettings(src.cfg, patch) })) || [];
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
      lastRun[src.id] = Date.now();
    }
    state.last = Date.now();
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify(lastRun));
    } catch {}
    state.running = false;
    notify();
  }
  function startSchedule() {
    // Whatever is due shortly after the dashboard opens, then a look every 5 minutes for anything that has come due.
    setTimeout(() => runAll("open", null, true), 6000);
    setInterval(() => runAll("tick", null, true), 300000);
    // A laptop that slept through a check catches up when the tab wakes.
    document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && runAll("wake", null, true));
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
  // Slack's markup turned into the markdown a forwarded message is sent in.
  const toMarkdown = (t) =>
    String(t || "")
      .replace(/<(https?:[^|>]+)\|([^>]+)>/g, "[$2]($1)")
      .replace(/<(https?:[^>]+)>/g, "$1")
      .replace(/<@[A-Z0-9]+>/g, "@someone")
      .replace(/<!(channel|here|everyone)>/g, "@$1")
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1**$2**")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .trim()
      .slice(0, 3500);
  const firstUrl = (t) => (String(t || "").match(/<(https?:[^|>]+)(?:\|[^>]*)?>/) || String(t || "").match(/(https?:\/\/\S+)/) || [])[1] || "";
  // A channel ID, or a Slack link that contains one (…/archives/C0123ABCD45).
  function parseChannelInput(raw) {
    const v = String(raw || "").trim();
    const id = (/\/archives\/([A-Z0-9]{8,})/.exec(v) || /^#?([CGD][A-Z0-9]{8,})$/.exec(v) || [])[1] || "";
    const base = /^(https:\/\/[^/]+)\/archives\//.exec(v)?.[1] || "";
    return { id, base };
  }
  const permalink = (cfg, ts) => (cfg.link_base && cfg.channel_id ? `${cfg.link_base}/archives/${cfg.channel_id}/p${String(ts).replace(".", "")}` : "");

  // The Ops Updates sources: new messages in the channel the owner named for each page.
  const PAGES = [
    { key: "cp_gen", name: "CP Gen", source: "ops_cp_gen", cfg: "ops_cp_gen", prefix: "ops_cp_gen" },
    { key: "care", name: "Care", source: "ops_care", cfg: "ops_care", prefix: "ops_care" },
    // The first version of this app was a single Notion channel; its settings and updates carry over here.
    { key: "requests", name: "Notion Update Requests", source: "notion", cfg: "notion", prefix: "notion" },
  ];
  function pollPage(page) {
    return async function (ctx) {
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
          id: `${page.prefix}:${cfg.channel_id}:${m.ts}`,
          title: (lines[0] || `${page.name} update`).slice(0, 140),
          body: lines.slice(1).join(" ").slice(0, 420),
          full: toMarkdown(m.text),
          at: new Date(parseFloat(m.ts) * 1000).toISOString(),
          link: permalink(cfg, m.ts) || firstUrl(m.text),
          from: m.who,
        };
      });
    };
  }

  function register(src) {
    sources.set(src.id, src);
  }
  PAGES.forEach((pg) => register({ id: pg.source, label: `Ops Updates · ${pg.name}`, app: "notion", cfg: pg.cfg, every: HALF_HOUR, poll: pollPage(pg) }));

  window.TrainerNotify = { register, runAll, unread, markRead, onChange: (f) => (listeners.add(f), () => listeners.delete(f)), list: () => notes, status: () => ({ ...state }), sources: () => [...sources.values()].map((x) => ({ id: x.id, every: x.every || HOUR })) };

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
    // Unread counts on the dock icons of the apps the notifications belong to.
    const byApp = {};
    notes.forEach((x) => !x.read && x.app && (byApp[x.app] = (byApp[x.app] || 0) + 1));
    if (typeof updateDockBadges === "function") updateDockBadges(byApp);
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
          : `<li class="np-empty">Nothing yet. Notifications from your apps collect here and are checked automatically while the dashboard is open (Ops Updates every 30 minutes, Quiz replies hourly).</li>`
      }</ul>
      <div class="np-foot">${st.last ? `Last checked ${esc(when(new Date(st.last).toISOString()))}` : "Not checked yet"} · automatic checks while the dashboard is open</div>`;
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
        const pg = PAGES.find((x) => x.source === n.source);
        if (pg) window.TrainerNotion?.showPage(pg.key);
        if (n.app && APPS[n.app]) openApp(n.app);
      }
    });
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", onKey, true);
  });
  listeners.add(drawBell);
  drawBell();

  // ---- The Ops Updates app ----
  const PAGE_KEY = "trainer.opsPage";
  const ui = { el: null, page: "", editing: false, msg: "" };
  try {
    ui.page = localStorage.getItem(PAGE_KEY) || "";
  } catch {}
  if (!PAGES.some((x) => x.key === ui.page)) ui.page = PAGES[0].key;
  const pageNow = () => PAGES.find((x) => x.key === ui.page) || PAGES[0];
  const chip = (n) => (n.read ? "" : `<span class="chip ok">New</span>`);

  // Cohorts as the Attendance app has them: its Slack channel ID is the one used here, so it is only ever set once.
  function cohortChannels() {
    const api = cc();
    if (!api) return [];
    const today = typeof localToday === "function" ? localToday() : "";
    const order = { active: 0, upcoming: 1, completed: 2, unscheduled: 3 };
    const st = (c) => (typeof scheduleStatus === "function" ? scheduleStatus(cohortSchedule(c.training_start_date), today) : "unscheduled");
    return api
      .data()
      .cohorts.map((c) => ({ c, status: st(c), channel: String(c.attendance_channel_id || "").trim() }))
      .sort((a, b) => order[a.status] - order[b.status] || String(b.c.training_start_date || "").localeCompare(String(a.c.training_start_date || "")));
  }

  function draw() {
    const el = ui.el;
    if (!el) return;
    const pg = pageNow();
    const cfg = cfgOf(pg.cfg);
    const mine = notes.filter((n) => n.source === pg.source);
    const checking = state.running;
    const newCount = mine.filter((n) => !n.read).length;
    const status = state.results[pg.source];
    const setup = !cfg.channel_id || ui.editing;
    const tabs = PAGES.map((x) => {
      const n = notes.filter((m) => m.source === x.source && !m.read).length;
      return `<button type="button" role="tab" data-nt-page="${x.key}" aria-selected="${x.key === pg.key}">${esc(x.name)}${n ? ` <span class="tab-count">${n}</span>` : ""}</button>`;
    }).join("");
    el.innerHTML = `
      <div class="nt-root">
        <div class="nt-top">
          <div class="nt-heading"><h3>Ops Updates</h3><span class="muted">Slack updates, checked every 30 minutes</span></div>
          <button type="button" class="btn" data-nt-check${checking ? " disabled" : ""}>${checking ? "Checking…" : "↻ Check now"}</button>
        </div>
        <div class="quiz-tabs nt-tabs" role="tablist" aria-label="Ops Updates pages">${tabs}</div>
        <section class="nt-setup">
          ${
            setup
              ? `<form data-nt-form novalidate>
                  <label class="cw-field">Slack channel for ${esc(pg.name)}
                    <input type="text" name="channel" value="${esc(cfg.channel_id || "")}" placeholder="Channel ID (like C0123ABC45) or a link to the channel" autocomplete="off" /></label>
                  <p class="muted nt-help">In Slack, right-click the channel › <b>Copy link</b> and paste it here, or paste the channel ID. Nothing is built into the code; each page has its own channel.</p>
                  <p class="sheet-status" data-nt-status role="status">${esc(ui.msg)}</p>
                  <div class="nt-row"><button type="submit" class="btn-primary">Save channel</button>${cfg.channel_id ? `<button type="button" class="btn" data-nt-cancel>Cancel</button>` : ""}</div>
                </form>`
              : `<div class="nt-channel"><span>${esc(pg.name)} reads <b>${esc(cfg.channel_id)}</b></span><button type="button" class="linkish" data-nt-edit>Change channel</button></div>
                 <small class="muted">${cfg.error ? `<b class="warn-text">${esc(cfg.error)}</b> · ` : ""}${cfg.last_checked ? `Last checked ${esc(when(cfg.last_checked))}${status ? (status.added ? ` · ${status.added} new` : " · nothing new") : ""}` : "Not checked yet"} · checked every 30 minutes while the dashboard is open</small>`
          }
        </section>
        ${ui.msg && !setup ? `<p class="quiz-note" role="status">${esc(ui.msg)}</p>` : ""}
        ${
          cfg.channel_id && !setup
            ? `<div class="nt-feed-head"><h4>${esc(pg.name)}${newCount ? ` <span class="chip ok">${newCount} new</span>` : ""}</h4>${newCount ? `<button type="button" class="linkish" data-nt-read-all>Mark all read</button>` : ""}</div>
               ${
                 mine.length
                   ? `<ul class="nt-feed">${mine
                       .map(
                         (n) => `<li class="nt-item${n.read ? "" : " is-new"}">
                          <div class="nt-item-top"><b>${esc(n.title)}</b>${chip(n)}</div>
                          ${n.body ? `<p>${esc(n.body)}</p>` : ""}
                          ${(n.forwarded || []).length ? `<div class="nt-fwd">${n.forwarded.map((f) => `<span class="chip ok" title="${esc(when(f.at))}">Forwarded to ${esc(f.cohort)} ✓</span>`).join("")}</div>` : ""}
                          <div class="nt-item-foot"><small class="muted">${esc(when(n.at))}${n.from ? ` · ${esc(n.from)}` : ""}</small>
                            ${n.link ? `<a href="${esc(n.link)}" target="_blank" rel="noopener noreferrer">Open</a>` : ""}
                            <button type="button" class="linkish" data-nt-forward="${esc(n.id)}">Forward to a cohort…</button>
                            <button type="button" class="linkish" data-nt-toggle="${esc(n.id)}">${n.read ? "Mark unread" : "Mark read"}</button></div>
                        </li>`
                       )
                       .join("")}</ul>`
                   : `<p class="muted">No updates yet. ${checking ? "Checking…" : "New messages in the channel show up here after the next check."}</p>`
               }`
            : ""
        }
      </div>`;
    window.TrainerDesk?.setCrumbs("notion", [{ label: pg.name }], () => ((ui.editing = false), draw()));
  }
  async function saveChannel(form) {
    const pg = pageNow();
    const cfg = cfgOf(pg.cfg);
    const { id, base } = parseChannelInput(form.channel.value);
    const status = form.querySelector("[data-nt-status]");
    if (!id) return void (status.textContent = "That doesn't look like a Slack channel ID or link. IDs start with C (or G) and have letters and numbers, like C0123ABC45.");
    const changed = id !== cfg.channel_id;
    ui.editing = false;
    ui.msg = "";
    await saveSettings(pg.cfg, { channel_id: id, link_base: base || (changed ? "" : cfg.link_base || ""), ...(changed ? { last_ts: "", last_checked: "", error: "" } : {}), updated_at: new Date().toISOString() });
    draw();
    runAll("manual", [pg.source]);
  }

  // ---- Forwarding a message to cohort channels ----
  function sheet(html) {
    const win = ui.el?.closest(".window");
    if (!win || win.querySelector(".sheet")) return null;
    const s = document.createElement("div");
    s.className = "sheet";
    s.innerHTML = `<form class="sheet-card nt-fwd-card" role="dialog" aria-label="Forward to a cohort" novalidate>${html}</form>`;
    win.appendChild(s);
    const close = () => s.remove();
    s.addEventListener("click", (e) => (e.target === s || e.target.closest("[data-cancel]")) && close());
    s.addEventListener("keydown", (e) => e.key === "Escape" && close());
    return { s, close };
  }
  function openForward(noteId) {
    const n = notes.find((x) => x.id === noteId);
    if (!n) return;
    const pg = PAGES.find((x) => x.source === n.source) || pageNow();
    const rows = cohortChannels();
    const original = (n.full || [n.title, n.body].filter(Boolean).join("\n\n")).trim();
    const draft = [`**Forwarded from Ops Updates · ${pg.name}**`, "", original, n.link ? `\n[Open in Slack](${n.link})` : ""].join("\n").trim();
    const STATUS = { active: "Current batch", upcoming: "Upcoming", completed: "Completed", unscheduled: "No start date" };
    const x = sheet(`
      <h3>Forward to a cohort</h3>
      <p class="muted nt-help">Goes to the cohort's Slack channel from your account, exactly as written below. Each cohort's channel is the one set in Attendance.</p>
      <label class="cw-field">Message <small class="muted">(edit it, or add your own note on top)</small>
        <textarea name="message" rows="5">${esc(draft)}</textarea></label>
      <div class="nt-cohorts" role="group" aria-label="Cohorts">
        ${
          rows.length
            ? rows
                .map(
                  ({ c, status, channel }) => `<label class="pick${channel ? "" : " taken"}"><input type="checkbox" name="cohort" value="${esc(c.id)}"${channel ? "" : " disabled"} />
                    <span>${esc(c.name)} <small>${esc(STATUS[status] || status)} · ${channel ? `Slack channel ${esc(channel)}` : "No Slack channel yet. Set it in Attendance."}</small></span></label>`
                )
                .join("")
            : `<p class="muted">No cohorts yet. Add one in Cohorts, and its Slack channel in Attendance.</p>`
        }
      </div>
      <p class="sheet-status" data-status role="status"></p>
      <div class="sheet-actions"><button type="button" class="btn" data-cancel>Cancel</button><button type="submit" class="btn-primary" data-send disabled>Forward</button></div>`);
    if (!x) return;
    const f = x.s.querySelector("form");
    const send = x.s.querySelector("[data-send]");
    const status = x.s.querySelector("[data-status]");
    const picked = () => rows.filter(({ c }) => f.querySelector(`input[value="${CSS.escape(c.id)}"]`)?.checked);
    const sync = () => {
      const k = picked().length;
      send.disabled = !k || !f.message.value.trim();
      send.textContent = k ? `Forward to ${k} cohort${k === 1 ? "" : "s"}` : "Forward";
    };
    f.addEventListener("input", sync);
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const targets = picked();
      const message = f.message.value.trim();
      const s = slack();
      if (!targets.length || !message) return;
      if (!s) return void (status.textContent = "Slack isn't available right now.");
      send.disabled = true;
      const done = [], failed = [];
      for (const [i, t] of targets.entries()) {
        status.textContent = `Sending ${i + 1} of ${targets.length}: ${t.c.name}…`;
        try {
          await s.call("slack_send_message", { channel_id: t.channel, message });
          done.push({ cohort_id: t.c.id, cohort: t.c.name, at: new Date().toISOString() });
        } catch (err) {
          failed.push(`${t.c.name}: ${s.errorText(err)}`);
        }
      }
      if (done.length) {
        const cur = notes.find((q) => q.id === n.id) || n;
        await putNote({ ...cur, forwarded: [...(cur.forwarded || []), ...done] });
      }
      if (!failed.length) {
        x.close();
        ui.msg = `Forwarded to ${done.map((d) => d.cohort).join(", ")} ✓`;
        return draw();
      }
      status.innerHTML = `${done.length ? `Sent to ${esc(done.map((d) => d.cohort).join(", "))}. ` : ""}<b class="warn-text">Couldn't send:</b> ${esc(failed.join(" · "))}`;
      // Cohorts that went through are not offered again.
      done.forEach((d) => {
        const box = f.querySelector(`input[value="${CSS.escape(d.cohort_id)}"]`);
        if (box) (box.checked = false), (box.disabled = true);
      });
      sync();
    });
    f.querySelector("input:not([disabled])")?.focus();
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
        if (ds.ntPage) return window.TrainerNotion.showPage(ds.ntPage);
        if ("ntEdit" in ds) return ((ui.editing = true), (ui.msg = ""), draw(), el.querySelector("[name=channel]")?.focus());
        if ("ntCancel" in ds) return ((ui.editing = false), (ui.msg = ""), draw());
        if ("ntCheck" in ds) return void runAll("manual", PAGES.map((x) => x.source));
        if ("ntReadAll" in ds) return markRead(notes.filter((n) => n.source === pageNow().source && !n.read).map((n) => n.id));
        if (ds.ntForward) return openForward(ds.ntForward);
        if (ds.ntToggle) {
          const n = notes.find((x) => x.id === ds.ntToggle);
          if (n) markRead([n.id], !n.read);
        }
      });
      const redraw = () => {
        if (!ui.el || (ui.el.contains(document.activeElement) && document.activeElement.matches("input, textarea"))) return;
        draw();
      };
      listeners.add(redraw);
      ui.off = () => listeners.delete(redraw);
      draw();
      // Opening the app checks whatever is due.
      dbReady.then(() => setTimeout(() => runAll("open-app", PAGES.map((x) => x.source), true), 300));
    },
    showPage(key) {
      if (!PAGES.some((x) => x.key === key)) return;
      ui.page = key;
      ui.editing = false;
      ui.msg = "";
      try {
        localStorage.setItem(PAGE_KEY, key);
      } catch {}
      draw();
    },
    onClose() {
      ui.off?.();
      ui.el = null;
    },
    _parseChannelInput: parseChannelInput,
  };

  startSchedule();
})();
