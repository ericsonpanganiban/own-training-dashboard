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
  const use = (name) => (window.TrainerUse ? window.TrainerUse(name) : Promise.resolve(null));
  const dbReady = use("db");
  const userReady = use("user");
  const esc = (s) => escapeHtml(s == null ? "" : s);
  const HOUR = 3600000;
  const HALF_HOUR = 1800000;
  const slack = () => window.TrainerSlack;
  const cc = () => window.CoachingCompass;

  // ---- Storage (db, or memory) ----
  let db = null;
  let notes = [];
  let rawNotes = [];
  let viewer = ""; // this viewer's id; personal notifications and reminders carry it as `owner`
  const mine = (x) => !x.owner || !viewer || x.owner === viewer;
  const cfgs = {}; // settings documents by id
  const CFG_IDS = ["notion", "ops_cp_gen", "ops_care", "ops_training_team"];
  const listeners = new Set();
  const notify = () => listeners.forEach((f) => f());
  const sources = new Map();
  const known = new Set();
  dbReady.then((d) => {
    db = d;
    if (!db) return;
    db.collection("notifications").orderBy("at", "desc").limit(200).onSnapshot(
      (snap) => {
        rawNotes = snap.docs.map((doc) => ({ id: doc.id, ...JSON.parse(JSON.stringify(doc.data() || {})) }));
        notes = rawNotes.filter(mine);
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
  userReady.then((u) => u && u.id && u.id()).then((id) => {
    if (!id) return;
    viewer = String(id);
    notes = rawNotes.filter(mine);
    notify();
  }).catch(() => {});

  // ---- Personal reminders: reminders/{id} { owner, title, details, due_at (ISO), done, notified_at } ----
  let reminders = [];
  let remindersLoaded = false;
  dbReady.then((d) => {
    if (!d) return void (remindersLoaded = true);
    d.collection("reminders").orderBy("due_at", "asc").onSnapshot(
      (snap) => {
        reminders = snap.docs.map((doc) => ({ id: doc.id, ...JSON.parse(JSON.stringify(doc.data() || {})) }));
        remindersLoaded = true;
        notify();
        checkReminders();
      },
      () => (remindersLoaded = true)
    );
  });
  const myReminders = () => reminders.filter(mine).sort((a, b) => (a.due_at || "").localeCompare(b.due_at || ""));
  const isDue = (r) => !r.done && r.due_at && new Date(r.due_at).getTime() <= Date.now();
  function saveReminder(r) {
    reminders = [r, ...reminders.filter((x) => x.id !== r.id)];
    notify();
    if (!db) return Promise.resolve();
    const { id, ...fields } = r;
    return db.doc(`reminders/${id}`).set(fields);
  }
  function removeReminder(id) {
    reminders = reminders.filter((x) => x.id !== id);
    notify();
    return db ? db.doc(`reminders/${id}`).delete().catch(() => {}) : Promise.resolve();
  }
  // ---- Alert when a reminder fires: a toast that stays until acted on, plus a short chime ----
  // Browsers only allow sound after the page has been clicked, so the audio context is woken on the first click.
  let audio = null;
  const wakeAudio = () => {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
    } catch {}
  };
  document.addEventListener("pointerdown", wakeAudio, { capture: true });
  document.addEventListener("keydown", wakeAudio, { capture: true });
  function chime() {
    try {
      if (!audio || audio.state !== "running") return;
      [[880, 0], [1175, 0.18], [1568, 0.36]].forEach(([freq, at]) => {
        const o = audio.createOscillator();
        const g = audio.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        const t0 = audio.currentTime + at;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
        o.connect(g).connect(audio.destination);
        o.start(t0);
        o.stop(t0 + 0.55);
      });
    } catch {}
  }
  function toastHost() {
    let h = document.getElementById("rem-toasts");
    if (!h) {
      h = document.createElement("div");
      h.id = "rem-toasts";
      h.setAttribute("aria-live", "assertive");
      document.body.appendChild(h);
      h.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        const t = e.target.closest(".rem-toast");
        if (!b || !t) return;
        const id = t.dataset.rem;
        if ("toastDone" in b.dataset) {
          const r = reminders.find((x) => x.id === id);
          if (r) saveReminder({ ...r, done: true, done_at: new Date().toISOString() }).catch(() => {});
          markRead([`reminder_${id}`]);
        }
        if ("toastOpen" in b.dataset) {
          markRead([`reminder_${id}`]);
          if (typeof openApp === "function") openApp("notion");
          window.TrainerNotion?.showPage("reminders");
        }
        t.remove();
      });
    }
    return h;
  }
  function showReminderToast(r) {
    const h = toastHost();
    if (h.querySelector(`[data-rem="${CSS.escape(r.id)}"]`)) return;
    const t = document.createElement("div");
    t.className = "rem-toast";
    t.dataset.rem = r.id;
    t.setAttribute("role", "alert");
    t.innerHTML = `<div class="rem-toast-head"><span class="rem-toast-icon" aria-hidden="true">⏰</span><b>${esc(r.title)}</b></div>
      ${r.details ? `<p>${esc(r.details)}</p>` : ""}
      <div class="rem-toast-foot"><button type="button" class="btn-primary btn-small" data-toast-done>Done</button><button type="button" class="btn btn-small" data-toast-open>Open</button><button type="button" class="btn btn-small" data-toast-dismiss>Dismiss</button></div>`;
    h.appendChild(t);
    chime();
  }

  // ---- Overdue flag: a small red hazard icon beside the bell while any reminder is overdue ----
  function drawBanner() {
    const over = myReminders().filter(isDue);
    let btn = document.getElementById("rem-flag");
    if (!over.length) return void btn?.remove();
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "rem-flag";
      btn.addEventListener("click", () => {
        if (typeof openApp === "function") openApp("notion");
        window.TrainerNotion?.showPage("reminders");
      });
      const bellEl = document.getElementById("bell");
      if (bellEl?.parentElement) bellEl.parentElement.insertBefore(btn, bellEl);
      else document.querySelector(".menubar-right")?.prepend(btn);
    }
    const label = `${over.length} overdue reminder${over.length === 1 ? "" : "s"}: ${over[0].title}${over.length > 1 ? ` and ${over.length - 1} more` : ""}`;
    btn.title = label;
    btn.setAttribute("aria-label", label);
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>${over.length > 1 ? `<span class="rf-count">${over.length}</span>` : ""}`;
  }
  // A reminder that has come due lands in the bell once (and badges Ops Updates on the dock).
  let remindersRunning = false;
  async function checkReminders() {
    if (remindersRunning || !remindersLoaded) return;
    remindersRunning = true;
    try {
      for (const r of myReminders().filter((x) => isDue(x) && !x.notified_at)) {
        const stamped = { ...r, notified_at: new Date().toISOString() };
        await saveReminder(stamped).catch(() => {});
        showReminderToast(r);
        await putNote({ id: `reminder_${r.id}`, source: "reminders", app: "notion", read: false, owner: r.owner || viewer, title: `Reminder: ${r.title}`, body: r.details || "", at: r.due_at });
      }
    } finally {
      remindersRunning = false;
    }
  }
  setInterval(() => (checkReminders(), drawBanner()), 30000);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && checkReminders());

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
    if (state.running || window.TrainerWS?.readOnly) return;
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
    { key: "training_team", name: "Training Team", source: "ops_training_team", cfg: "ops_training_team", prefix: "ops_training_team" },
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
  register({ id: "reminders", label: "Personal Reminders", app: "notion", every: HOUR, poll: async () => (await checkReminders(), []) });
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
        if (n.source === "reminders") window.TrainerNotion?.showPage("reminders");
        if (n.app && APPS[n.app]) openApp(n.app);
      }
    });
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", onKey, true);
  });
  listeners.add(drawBell);
  listeners.add(drawBanner);
  drawBell();

  // ---- The Ops Updates app ----
  const PAGE_KEY = "trainer.opsPage";
  const ui = { el: null, page: "", editing: false, msg: "", confirming: null, editRem: null };
  try {
    ui.page = localStorage.getItem(PAGE_KEY) || "";
  } catch {}
  if (!PAGES.some((x) => x.key === ui.page) && ui.page !== "reminders") ui.page = PAGES[0].key;
  const pageNow = () => PAGES.find((x) => x.key === ui.page) || PAGES[0];
  const chip = (n) => (n.read ? "" : `<span class="chip ok">New</span>`);

  // Cohorts as the Attendance app has them: its Slack channel ID is the one used here, so it is only ever set once.
  function cohortChannels() {
    const api = cc();
    if (!api) return [];
    const today = typeof localToday === "function" ? localToday() : "";
    const order = { active: 0, upcoming: 1, completed: 2, unscheduled: 3 };
    const st = (c) => (typeof cohortStatus === "function" ? cohortStatus(c, today) : "unscheduled");
    return api
      .data()
      .cohorts.map((c) => ({ c, status: st(c), channel: String(c.attendance_channel_id || "").trim() }))
      .sort((a, b) => order[a.status] - order[b.status] || String(b.c.training_start_date || "").localeCompare(String(a.c.training_start_date || "")));
  }

  function tabsHtml(active) {
    const tabs = PAGES.filter((x) => !x.managerOnly || window.TrainerWS?.role === "manager").map((x) => {
      const n = notes.filter((m) => m.source === x.source && !m.read).length;
      return `<button type="button" role="tab" data-nt-page="${x.key}" aria-selected="${x.key === active}">${esc(x.name)}${n ? ` <span class="tab-count">${n}</span>` : ""}</button>`;
    });
    const due = myReminders().filter(isDue).length;
    tabs.push(`<button type="button" role="tab" data-nt-page="reminders" aria-selected="${active === "reminders"}">Personal Reminders${due ? ` <span class="tab-count">${due}</span>` : ""}</button>`);
    return tabs.join("");
  }
  const dueText = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleString([], { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  };
  const pad2 = (n) => String(n).padStart(2, "0");
  const localDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const remForm = { title: "", details: "", date: "", time: "" };
  function drawReminders() {
    const el = ui.el;
    const now = new Date();
    if (!remForm.date) {
      const next = new Date(now.getTime() + HOUR);
      remForm.date = localDate(next);
      remForm.time = `${pad2(next.getHours())}:00`;
    }
    const list = myReminders();
    const dueNow = list.filter(isDue);
    const upcoming = list.filter((r) => !r.done && !isDue(r));
    const done = list.filter((r) => r.done).sort((a, b) => (b.done_at || "").localeCompare(a.done_at || "")).slice(0, 20);
    const late = (iso) => {
      const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
      return m < 1 ? "just now" : m < 60 ? `${m} min late` : m < 1440 ? `${Math.floor(m / 60)} h late` : `${Math.floor(m / 1440)} d late`;
    };
    const editItem = (r) => {
      const d = new Date(r.due_at);
      return `<li class="nt-item editing"><form data-rem-edit-form="${esc(r.id)}" novalidate>
          <label class="cw-field">Title<input type="text" name="title" value="${esc(r.title)}" autocomplete="off" /></label>
          <div class="rem-when">
            <label class="cw-field">Date<input type="date" name="date" value="${esc(isNaN(d) ? "" : localDate(d))}" /></label>
            <label class="cw-field">Time<input type="time" name="time" value="${esc(isNaN(d) ? "" : `${pad2(d.getHours())}:${pad2(d.getMinutes())}`)}" /></label>
          </div>
          <label class="cw-field">Details (what to do)<textarea name="details" rows="3">${esc(r.details || "")}</textarea></label>
          <p class="sheet-status" data-rem-edit-status role="status"></p>
          <div class="nt-row"><button type="submit" class="btn-primary btn-small">Save</button><button type="button" class="btn btn-small" data-rem-edit-cancel>Cancel</button></div>
        </form></li>`;
    };
    const item = (r, kind) => {
      if (ui.editRem === r.id) return editItem(r);
      return `<li class="nt-item${kind === "due" ? " is-overdue" : ""}">
        <div class="nt-item-top"><b>${esc(r.title)}</b>${kind === "due" ? `<span class="overdue-flag">OVERDUE · ${esc(late(r.due_at))}</span>` : kind === "done" ? `<span class="chip ok">Done</span>` : ""}
          <button type="button" class="square-btn kebab rem-menu" data-rem-menu="${esc(r.id)}" title="Reminder options" aria-label="Options for ${esc(r.title)}">⋮</button></div>
        <p class="muted">${esc(dueText(r.due_at))}</p>
        ${r.details ? `<p class="rem-details">${esc(r.details)}</p>` : ""}
        ${ui.confirming === r.id ? `<div class="nt-item-foot"><span>Delete this reminder?</span><button type="button" class="btn btn-small" data-rem-del-cancel>Cancel</button><button type="button" class="btn-danger btn-small" data-rem-del="${esc(r.id)}">Delete</button></div>` : ""}
        <div class="nt-item-foot">
          ${kind === "done" ? `<button type="button" class="btn btn-small" data-rem-undo="${esc(r.id)}">Mark not done</button>` : `<button type="button" class="${kind === "due" ? "btn-primary" : "btn"} btn-small" data-rem-done="${esc(r.id)}">Mark done</button>`}
        </div></li>`;
    };
    const group = (title, items, kind) => (items.length ? `<div class="nt-feed-head"><h4>${title} <span class="muted">${items.length}</span></h4></div><ul class="nt-feed">${items.map((r) => item(r, kind)).join("")}</ul>` : "");
    el.innerHTML = `
      <div class="nt-root">
        <div class="nt-sticky">
          <div class="nt-top"><div class="nt-heading"><h3>Ops Updates</h3><span class="muted">Personal reminders, only you see them</span></div></div>
          <div class="quiz-tabs nt-tabs" role="tablist" aria-label="Ops Updates pages">${tabsHtml("reminders")}</div>
        </div>
        ${dueNow.length ? `<div class="overdue-banner" role="alert"><span aria-hidden="true">⚠</span> ${dueNow.length} overdue reminder${dueNow.length === 1 ? "" : "s"}. Mark ${dueNow.length === 1 ? "it" : "them"} done once handled.</div>` : ""}
        ${group("Overdue", dueNow, "due")}
        <section class="nt-setup">
          <form data-rem-form novalidate>
            <label class="cw-field">Title<input type="text" name="title" value="${esc(remForm.title)}" placeholder="e.g. Send week 3 coaching notes" autocomplete="off" /></label>
            <div class="rem-when">
              <label class="cw-field">Date<input type="date" name="date" value="${esc(remForm.date)}" /></label>
              <label class="cw-field">Time<input type="time" name="time" value="${esc(remForm.time)}" /></label>
            </div>
            <label class="cw-field">Details (what to do)<textarea name="details" rows="3" placeholder="What needs to happen when this goes off">${esc(remForm.details)}</textarea></label>
            <p class="sheet-status" data-rem-status role="status">${esc(ui.msg)}</p>
            <div class="nt-row"><button type="submit" class="btn-primary">Add reminder</button></div>
          </form>
        </section>
        ${group("Upcoming", upcoming, "up")}${group("Done", done, "done")}
        ${list.length ? "" : `<p class="muted">No reminders yet. Add one above; it shows in the bell and on this app's dock icon when it comes due (while the dashboard is open).</p>`}
      </div>`;
    window.TrainerDesk?.setCrumbs("notion", [{ label: "Personal Reminders" }], () => draw());
  }

  function draw() {
    const el = ui.el;
    if (!el) return;
    if (ui.page === "reminders") return drawReminders();
    const pg = pageNow();
    const cfg = cfgOf(pg.cfg);
    const mine = notes.filter((n) => n.source === pg.source);
    const checking = state.running;
    const newCount = mine.filter((n) => !n.read).length;
    const status = state.results[pg.source];
    const setup = !cfg.channel_id || ui.editing;
    const tabs = tabsHtml(pg.key);
    el.innerHTML = `
      <div class="nt-root">
        <div class="nt-sticky">
        <div class="nt-top">
          <div class="nt-heading"><h3>Ops Updates</h3><span class="muted">Slack updates, checked every 30 minutes</span></div>
          <button type="button" class="btn" data-nt-check${checking ? " disabled" : ""}>${checking ? "Checking…" : "↻ Check now"}</button>
        </div>
        <div class="quiz-tabs nt-tabs" role="tablist" aria-label="Ops Updates pages">${tabs}</div>
        </div>
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
          pg.key === "training_team" && window.TrainerWS?.role === "manager" && cfg.channel_id && !setup
            ? `<form class="nt-compose" data-nt-compose novalidate>
                <label class="cw-field">Send a notification to the Training Team
                  <textarea name="message" rows="3" placeholder="Your message goes to the Training Team's Slack channel"></textarea></label>
                <p class="sheet-status" data-nt-compose-status role="status"></p>
                <div class="nt-row"><button type="submit" class="btn-primary">Send to Training Team</button></div>
              </form>`
            : ""
        }
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
  async function saveEdit(form) {
    const status = form.querySelector("[data-rem-edit-status]");
    const r = reminders.find((x) => x.id === form.dataset.remEditForm);
    if (!r) return void ((ui.editRem = null), draw());
    const title = form.title.value.trim();
    const due = form.date.value && form.time.value ? new Date(`${form.date.value}T${form.time.value}`) : null;
    if (!title) return void (status.textContent = "Give the reminder a title.");
    if (!due || isNaN(due)) return void (status.textContent = "Pick a date and a time.");
    const moved = due.toISOString() !== r.due_at;
    const future = due.getTime() > Date.now();
    status.textContent = "Saving…";
    try {
      // A new future time makes it fire again; the old alert and its bell entry are cleared.
      await saveReminder({ ...r, title, details: form.details.value.trim(), due_at: due.toISOString(), ...(moved && future ? { notified_at: "", done: false, done_at: "" } : {}), updated_at: new Date().toISOString() });
      if (moved && future) markRead([`reminder_${r.id}`]);
    } catch {
      return void (status.textContent = "Couldn't save the changes. Try again.");
    }
    ui.editRem = null;
    draw();
  }
  // Manager only: a message to the Training Team's Slack channel (the one set on the Training Team tab).
  async function sendToTeam(form) {
    const pg = PAGES.find((x) => x.key === "training_team");
    const status = form.querySelector("[data-nt-compose-status]");
    const message = form.message.value.trim();
    const channel = cfgOf(pg.cfg).channel_id;
    const s = slack();
    if (!message) return void (status.textContent = "Write a message first.");
    if (!channel) return void (status.textContent = "Set the Training Team's Slack channel first.");
    if (!s) return void (status.textContent = "Slack isn't available right now.");
    status.textContent = "Sending…";
    form.querySelector("button[type=submit]").disabled = true;
    try {
      await s.call("slack_send_message", { channel_id: channel, message });
      form.message.value = "";
      status.textContent = "Sent to the Training Team ✓";
    } catch (err) {
      status.textContent = s.errorText ? s.errorText(err) : "Couldn't send. Try again.";
    }
    form.querySelector("button[type=submit]").disabled = false;
  }
  async function addReminder(form) {
    const status = form.querySelector("[data-rem-status]");
    const title = form.title.value.trim();
    const due = form.date.value && form.time.value ? new Date(`${form.date.value}T${form.time.value}`) : null;
    if (!title) return void (status.textContent = "Give the reminder a title.");
    if (!due || isNaN(due)) return void (status.textContent = "Pick a date and a time.");
    if (due.getTime() <= Date.now()) return void (status.textContent = "That time has already passed. Pick a time in the future.");
    status.textContent = "Saving…";
    const id = `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    try {
      await saveReminder({ id, owner: viewer, title, details: form.details.value.trim(), due_at: due.toISOString(), done: false, notified_at: "", created_at: new Date().toISOString() });
    } catch {
      return void (status.textContent = "Couldn't save the reminder. Try again.");
    }
    Object.assign(remForm, { title: "", details: "", date: "", time: "" });
    ui.msg = "";
    draw();
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
        const r = e.target.closest("[data-rem-form]");
        if (r) addReminder(r);
        const tt = e.target.closest("[data-nt-compose]");
        if (tt) sendToTeam(tt);
        const ed = e.target.closest("[data-rem-edit-form]");
        if (ed) saveEdit(ed);
      });
      el.addEventListener("input", (e) => {
        const f = e.target.closest("[data-rem-form]");
        if (f && e.target.name in remForm) remForm[e.target.name] = e.target.value;
      });
      el.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        const ds = b.dataset;
        if (ds.ntPage) return window.TrainerNotion.showPage(ds.ntPage);
        if (ds.remDone || ds.remUndo) {
          const r = reminders.find((x) => x.id === (ds.remDone || ds.remUndo));
          if (r) saveReminder({ ...r, done: !!ds.remDone, done_at: ds.remDone ? new Date().toISOString() : "" }).catch(() => {});
          return;
        }
        if (ds.remMenu) {
          const r = reminders.find((x) => x.id === ds.remMenu);
          if (!r || typeof openMenu !== "function") return;
          return openMenu(b, [
            { label: "Edit", run: () => ((ui.editRem = r.id), (ui.confirming = null), draw(), el.querySelector("[data-rem-edit-form] [name=title]")?.focus()) },
            { label: r.done ? "Mark not done" : "Mark done", run: () => void saveReminder({ ...r, done: !r.done, done_at: r.done ? "" : new Date().toISOString() }).catch(() => {}) },
            { label: "Delete", danger: true, run: () => ((ui.confirming = r.id), draw()) },
          ]);
        }
        if ("remEditCancel" in ds) return ((ui.editRem = null), draw());
        if (ds.remAskDel) return ((ui.confirming = ds.remAskDel), draw());
        if ("remDelCancel" in ds) return ((ui.confirming = null), draw());
        if (ds.remDel) return ((ui.confirming = null), void removeReminder(ds.remDel));
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
    overdueCount: () => myReminders().filter(isDue).length,
    refresh: () => notify(),
    showPage(key) {
      if (!PAGES.some((x) => x.key === key) && key !== "reminders") return;
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
