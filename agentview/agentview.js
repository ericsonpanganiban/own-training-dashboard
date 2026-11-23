// Trainer view and Agent view.
//   Trainer view: the full dashboard, for the person who gathers the data and enters everything.
//   Agent view: a read-only scorecard for one agent, for the agents the Trainer shares it with. An agent sees their own
//   numbers (goals, attendance, QA, Speed, quizzes, spot checks, coaching received) and nothing about anyone else, no
//   notes, no HR documents and no pass/fail projection.
// "Agent View" is an app in the Trainer view to see exactly what an agent sees, or to switch the whole page into it.
(function () {
  "use strict";
  if (typeof APPS === "undefined" || APPS.agentview) return;
  const esc = (s) => escapeHtml(String(s == null ? "" : s));
  const num = (v) => String(Math.round(v * 100) / 100);
  const dshort = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "");
  const cc = () => window.CoachingCompass;
  const inactive = (t) => (typeof isInactive === "function" ? isInactive(t) : t.cohort_status === "inactive");

  // ---- The current view ----
  const state = { mode: "trainer", agentId: "" };
  const subs = new Set();
  const forced = /(^|[#&])agent(=|&|$)/.test(location.hash || "");
  const roster = () => {
    const d = cc() && cc().data();
    return d ? d : { cohorts: [], trainees: [] };
  };
  const cohortOf = (id) => roster().cohorts.find((c) => (c.trainee_ids || []).includes(id)) || null;
  // First agent still in training, newest cohort first: who the preview starts on.
  const firstAgent = () => {
    const { cohorts, trainees } = roster();
    const byId = new Map(trainees.map((t) => [t.id, t]));
    const list = cohorts.slice().sort((a, b) => String(b.training_start_date || "").localeCompare(String(a.training_start_date || "")));
    for (const c of list) {
      const t = (c.trainee_ids || []).map((id) => byId.get(id)).find((x) => x && !inactive(x));
      if (t) return t.id;
    }
    return (trainees.find((x) => !inactive(x)) || {}).id || "";
  };
  // Trainer view is for the owner only. Everyone else (Viewers, other seat holders) gets the Agent view.
  const isOwner = () => !!(window.TrainerWS && window.TrainerWS.isOwner);
  const canSwitch = () => isOwner();
  window.TrainerView = {
    get mode() { return state.mode; },
    get agentId() { return state.agentId; },
    canSwitch,
    onChange(fn) { subs.add(fn); return () => subs.delete(fn); },
    set(mode, agentId) {
      const m = mode === "agent" || !isOwner() ? "agent" : "trainer";
      if (m === "agent") state.agentId = agentId || state.agentId || firstAgent();
      else if (agentId) state.agentId = agentId;
      const changed = m !== state.mode;
      state.mode = m;
      document.body.classList.toggle("agent-mode", m === "agent");
      subs.forEach((f) => { try { f(changed); } catch (e) {} });
    },
  };

  // ---- The scorecard: collect one agent's numbers into a plain object, and draw it with AgentCard.html ----
  const DAYLBL = { ontime: "On time", late25: "Late (.25)", late50: "Late (.50)", late75: "Late (.75)", late100: "Late (1.00)", absent: "Absent", ncns: "No call, no show" };
  function goalsOf(cohort) {
    const g = (cohort && cohort.team_goals) || {};
    const n = (k) => (g[k] !== "" && g[k] != null && !isNaN(Number(g[k])) ? Number(g[k]) : null);
    return { qa: n("qa"), speed: n("speed"), attendance: n("attendance"), quiz: n("quiz"), spot: n("spot") };
  }
  async function collect(t, withQuiz) {
    const c = cohortOf(t.id);
    const api = cc();
    const perf = api.traineePerformance(t.id);
    const sp = api.traineeSpeed(t.id);
    const spot = api.traineeSpot(t.id);
    const pts = window.TrainerAttendance && window.TrainerAttendance.points && c ? window.TrainerAttendance.points(c.id, t.id) : null;
    const speeds = sp.weeks.map((w) => w.value).filter((v) => v != null);
    const days = (c && c.attendance_days && c.attendance_days[t.id]) || {};
    const graded = Object.keys(days).filter((k) => days[k]);
    let quiz = null;
    if (withQuiz && window.TrainerQuiz && window.TrainerQuiz.traineeResults) {
      const q = await window.TrainerQuiz.traineeResults(t.id).catch(() => null);
      if (q) quiz = { avg: q.avg, weighted: q.weighted, taken: q.taken, items: (q.items || []).filter((x) => x.pct != null).map((x) => ({ title: x.title, week: x.week || 0, pct: x.pct, passing: x.passing, date: x.sent_at || "", answers: (x.answers || []).map((a) => ({ q: String(a.question || "").slice(0, 600), a: String(a.answer || "").slice(0, 600), ok: a.correct, key: String(a.key || "").slice(0, 600) })) })) };
    }
    return {
      v: 1,
      name: t.name || "Agent",
      cohort: c ? c.name : "",
      started: c ? c.training_start_date || "" : "",
      inactive: inactive(t),
      lead: String(t.team_lead || (c && c.team_lead) || "").trim(),
      dept: String(t.department || (c && c.department) || "").trim(),
      goals: goalsOf(c),
      att: { points: pts, graded: graded.length, late: graded.filter((k) => days[k] !== "ontime").sort((a, b) => +a - +b).map((k) => ({ day: k, label: DAYLBL[days[k]] || days[k] })) },
      qa: { pass: perf.weeks.reduce((a, w) => a + w.pass, 0), total: perf.weeks.reduce((a, w) => a + w.total, 0), weeks: perf.weeks.map((w) => ({ week: w.week, pass: w.pass, total: w.total, strengths: (w.brief && w.brief.strengths) || [], issues: (w.brief && w.brief.recurring_issues) || [] })) },
      speed: { avg: speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null, weeks: sp.weeks.map((w) => ({ week: w.week, value: w.value, hours: w.hours, tickets: w.tickets })) },
      quiz,
      spot: { avg: spot.avg, count: spot.count, items: spot.nesting.map((x) => ({ date: x.created_at, score: x.score, ticket: x.ticket, comms: x.comms, resolution: x.resolution, ack: x.reply || x.ack_at ? "ack" : x.slack_sent_at ? "wait" : "none" })) },
      coaching: (t.coaching_sends || []).slice().reverse().map((x) => ({ date: x.sent_at, label: x.label, ack: !!(x.reply || x.ack_at) })),
      generated_at: new Date().toISOString(),
    };
  }

  // Draws the scorecard for one agent into `el`, then fills in quizzes when they have loaded.
  async function mount(el, traineeId) {
    const t = roster().trainees.find((x) => x.id === traineeId);
    if (!t) {
      el.innerHTML = `<p class="ag-empty">Pick an agent to see their scorecard.</p>`;
      return;
    }
    if (inactive(t)) {
      el.innerHTML = `<p class="ag-empty">This profile isn't available. ${esc(t.name || "This agent")} is marked Inactive, so their Agent view is turned off.</p>`;
      return;
    }
    el.innerHTML = AgentCard.html(await collect(t, false));
    const full = await collect(t, true);
    if (!el.isConnected || el.dataset.agent !== traineeId) return;
    el.innerHTML = AgentCard.html(full);
  }
  window.AgentScorecard = { mount, collect };

  // ---- Picker shared by both apps ----
  function agentOptions(selected) {
    const { cohorts } = roster();
    const trainees = roster().trainees.filter((t) => !inactive(t)); // Inactive agents have no Agent view
    const byId = new Map(trainees.map((t) => [t.id, t]));
    const opt = (t) => `<option value="${esc(t.id)}"${t.id === selected ? " selected" : ""}>${esc(t.name || "Unnamed")}${inactive(t) ? " (Inactive)" : ""}</option>`;
    const sorted = (list) => list.slice().sort((a, b) => (inactive(a) - inactive(b)) || String(a.name).localeCompare(String(b.name)));
    const inClass = new Set();
    const groups = cohorts
      .slice()
      .sort((a, b) => String(b.training_start_date || "").localeCompare(String(a.training_start_date || "")))
      .map((c) => {
        const ts = (c.trainee_ids || []).map((id) => byId.get(id)).filter(Boolean);
        ts.forEach((t) => inClass.add(t.id));
        return ts.length ? `<optgroup label="${esc(c.name)}">${sorted(ts).map(opt).join("")}</optgroup>` : "";
      })
      .join("");
    // Everyone on the roster is listed, including trainees who aren't in a class yet.
    const rest = trainees.filter((t) => !inClass.has(t.id));
    return groups + (rest.length ? `<optgroup label="Not in a class">${sorted(rest).map(opt).join("")}</optgroup>` : "") || `<option value="">No agents on the roster yet</option>`;
  }

  // ---- App: Agent View (Trainer view): preview what an agent sees, and manage their access ----
  let off = null;
  const copy = (text, done) => {
    const ok = () => done("Copied.");
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, () => done("Couldn't copy."));
    else done("Couldn't copy.");
  };
  APPS.agentview = {
    title: "Agent View",
    icon: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    color: "#0d9488",
    render(el) {
      el.classList.add("ag-app");
      if (!state.agentId) state.agentId = firstAgent();
      const ui = { tab: "preview", cohort: "", msg: "", busy: false, url: "", unsubs: [], db: null, bundle: null };
      const nameOf = (id) => (roster().trainees.find((t) => t.id === id) || {}).name || "the agent";

      const tabs = () => `<div class="ag-tabs" role="tablist"><button type="button" role="tab" class="${ui.tab === "preview" ? "on" : ""}" data-ag-tab="preview" aria-selected="${ui.tab === "preview"}">Preview</button><button type="button" role="tab" class="${ui.tab === "access" ? "on" : ""}" data-ag-tab="access" aria-selected="${ui.tab === "access"}">Access and publishing</button></div>`;

      const previewHtml = () => `
        <div class="ag-intro">
          <h3>Agent View</h3>
          <p>This is what an agent sees: their own scorecard and nothing else. It is read-only. They don't see other agents, your notes, HR documents or any pass/fail projection, and they can't enter or change anything. You gather and enter everything in the Trainer view. Agents get in with their work email (see Access and publishing).</p>
          <div class="ag-bar">
            <label for="agPick">Preview as</label>
            <select id="agPick">${agentOptions(state.agentId)}</select>
            <button type="button" class="btn btn-primary" data-ag-open>Open the Agent view</button>
          </div>
        </div>
        <div class="ag-frame"><div class="ag-frame-bar"><span class="ag-dot"></span> Previewing what ${esc(nameOf(state.agentId))} sees</div><div class="ag-body" data-agent="${esc(state.agentId)}"></div></div>`;

      const accessRows = () => {
        const { cohorts, trainees } = roster();
        const byId = new Map(trainees.map((t) => [t.id, t]));
        const pool = ui.cohort ? ((cohorts.find((c) => c.id === ui.cohort) || {}).trainee_ids || []).map((id) => byId.get(id)).filter(Boolean) : trainees;
        return pool.slice().sort((a, b) => (inactive(a) - inactive(b)) || String(a.name).localeCompare(String(b.name))).map((t) => {
          const email = String(t.email || "").trim();
          return `<tr class="${inactive(t) ? "is-inactive" : ""}"><td>${esc(t.name)}${inactive(t) ? " <small>(Inactive)</small>" : ""}</td>
            <td>${email ? esc(email) : `<span class="ag-warn">No work email. Add it in Settings → Roster.</span>`}</td>
            <td class="ag-acts">${inactive(t) ? `<span class="muted">Agent view off (Inactive)</span>` : email ? `<button type="button" class="linkish" data-ag-copyinv="${esc(t.id)}">Copy invite</button> · <button type="button" class="linkish" data-ag-slackinv="${esc(t.id)}">Send on Slack</button>` : ""}</td></tr>`;
        }).join("");
      };
      const accessHtml = () => {
        const { cohorts } = roster();
        const b = ui.bundle;
        return `
        <div class="ag-intro">
          <h3>Access and publishing</h3>
          <p>Agents sign in with just their <b>work email</b> (the one on the roster) and see their own scorecard. Anyone who opens this dashboard who isn't you gets only this sign-in. Agents marked <b>Inactive</b> can't sign in.</p>
          <p>Note: with email only, anyone who knows a colleague's work email can open that colleague's scorecard.</p>
          <ol class="ag-steps"><li>Make sure every agent has their work email on the roster (Settings → Roster).</li><li>Send each agent the link: <b>Copy invite</b> or <b>Send on Slack</b>. Inside this dashboard their numbers are always current.</li><li>For agents who shouldn't open this dashboard (or have no Claude seat): <b>Build agent data</b>, then ask Claude to <b>publish the agent page</b> and paste its link below. That page is a snapshot, so build and republish to refresh it.</li></ol>
          <div class="ag-bar"><label for="agCohort">Class</label><select id="agCohort"><option value="">All classes</option>${cohorts.map((c) => `<option value="${esc(c.id)}"${c.id === ui.cohort ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
            <label for="agUrl">Agent page link</label><input id="agUrl" type="url" placeholder="Leave empty to invite agents to this dashboard" value="${esc(ui.url)}" style="min-width:300px"><button type="button" class="btn" data-ag-saveurl>Save link</button></div>
        </div>
        <div class="ag-tablewrap"><table class="ag-table ag-access"><thead><tr><th>Agent</th><th>Work email</th><th></th></tr></thead><tbody>${accessRows()}</tbody></table></div>
        <div class="ag-actions">
          <button type="button" class="btn btn-primary" data-ag-build${ui.busy ? " disabled" : ""}>${ui.busy ? "Building…" : "Build agent data"}</button>
          ${b ? `<button type="button" class="btn" data-ag-download>Download the locked data</button>` : ""}
          <span class="ag-msg" role="status">${esc(ui.msg)}</span>
        </div>
        ${b ? `<p class="ag-note">Last built ${esc(new Date(b.generated_at).toLocaleString())}: ${b.count} agent${b.count === 1 ? "" : "s"} can sign in.</p>` : ""}`;
      };

      const draw = (first) => {
        if (!first && !el.isConnected) return;
        el.innerHTML = tabs() + (ui.tab === "preview" ? previewHtml() : accessHtml());
        if (ui.tab === "preview") mount(el.querySelector(".ag-body"), state.agentId);
      };
      const say = (m) => { ui.msg = m; if (ui.tab === "access") draw(); };

      // The bundle summary and agent page link live in the database; only the Trainer writes them.
      const connect = () => {
        if (ui.db || !window.TrainerUse) return;
        window.TrainerUse("db").then((db) => {
          if (!db || ui.db || !el.isConnected) return;
          ui.db = db;
          ui.unsubs.push(db.doc("agent_bundle/current").onSnapshot((snap) => { const d = snap.exists ? snap.data() : null; ui.bundle = d ? { generated_at: d.generated_at, count: d.count || (d.records || []).length } : null; if (ui.tab === "access" && !el.contains(document.activeElement)) draw(); }));
          ui.unsubs.push(db.doc("settings/agent_page").onSnapshot((snap) => { ui.url = (snap.exists && (snap.data() || {}).url) || ""; if (ui.tab === "access" && !el.contains(document.activeElement)) draw(); }));
        }).catch(() => {});
      };
      const inviteText = (t) => {
        const first = String(t.name || "").split(/\s+/)[0] || "there";
        const link = ui.url || location.href.split("#")[0];
        return `Hi ${first}, your training scorecard is ready: ${link}\nSign in with your work email (${String(t.email || "").trim()}).\nIt shows your goals, attendance, QA, Speed, quizzes, spot checks and coaching.`;
      };
      const traineeById = (id) => roster().trainees.find((t) => t.id === id);

      el.addEventListener("change", (e) => {
        if (e.target.id === "agPick") { state.agentId = e.target.value; draw(); }
        else if (e.target.id === "agCohort") { ui.cohort = e.target.value; draw(); }
      });
      el.addEventListener("click", async (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        const d = b.dataset;
        if (d.agTab) { ui.tab = d.agTab; ui.msg = ""; draw(); if (ui.tab === "access") connect(); }
        else if ("agOpen" in d) window.TrainerView.set("agent", state.agentId);
        else if ("agSaveurl" in d) {
          const v = (el.querySelector("#agUrl").value || "").trim();
          if (!ui.db) return say("Saving isn't available right now.");
          await ui.db.doc("settings/agent_page").set({ url: v, updated_at: new Date().toISOString() }).then(() => say("Link saved."), () => say("Couldn't save the link."));
        } else if (d.agCopyinv) {
          const t = traineeById(d.agCopyinv);
          if (t) copy(inviteText(t), say);
        } else if (d.agSlackinv) {
          const t = traineeById(d.agSlackinv);
          if (!t || !window.TrainerSlack) return say("Slack isn't available right now.");
          if (!ui.url) return say("Save the agent page link first.");
          say(`Sending to ${t.name}…`);
          try {
            const uid = await window.TrainerSlack.userIdFor(t);
            if (!uid) throw new Error("none");
            await window.TrainerSlack.sendDirect(uid, inviteText(t));
            say(`Invite sent to ${t.name} on Slack ✓`);
          } catch (err) { say(`Couldn't reach ${t.name} on Slack.`); }
        } else if ("agBuild" in d) {
          if (!ui.db) return say("Saving isn't available right now.");
          ui.busy = true; say("Building…");
          const { trainees } = roster();
          const records = [], skipped = [];
          for (const t of trainees) {
            if (inactive(t)) continue; // Inactive agents get no Agent view
            const email = String(t.email || "").trim();
            if (!email) { skipped.push(t.name); continue; }
            try { records.push(await AgentLock.lock(email, "", await collect(t, true))); } catch (err) { skipped.push(t.name); }
          }
          const doc = { v: 1, generated_at: new Date().toISOString(), count: records.length, records };
          try {
            await ui.db.doc("agent_bundle/current").set(doc);
            ui.busy = false;
            say(`Built for ${records.length} agent${records.length === 1 ? "" : "s"}${skipped.length ? `. Skipped (no work email): ${skipped.slice(0, 6).join(", ")}${skipped.length > 6 ? "…" : ""}` : ""}. Now ask Claude to publish the agent page.`);
          } catch (err) { ui.busy = false; say("Couldn't save the agent data."); }
        } else if ("agDownload" in d) {
          const db = ui.db; if (!db) return;
          const snap = await db.doc("agent_bundle/current").get();
          const dl = await window.TrainerUse("downloads").catch(() => null);
          if (!snap.exists || !dl || !dl.save) return say("Nothing to download yet.");
          dl.save({ filename: "agent-scorecards-locked.json", data: JSON.stringify(snap.data()) }).then(() => say("Downloaded."), () => say("Couldn't download."));
        }
      });
      draw(true);
      off = cc() ? cc().onChange(() => { if (el.isConnected && ui.tab === "preview" && !el.contains(document.activeElement)) draw(); }) : null;
      ui.cleanup = () => { ui.unsubs.forEach((u) => { try { u(); } catch (e) {} }); };
      APPS.agentview._ui = ui;
    },
    onClose() {
      if (off) off();
      off = null;
      if (APPS.agentview._ui && APPS.agentview._ui.cleanup) APPS.agentview._ui.cleanup();
    },
  };

  // ---- Sign in for anyone who isn't the owner: work email and code open only their own locked scorecard ----
  // Remembered in this browser until Sign out, so a refresh doesn't ask again.
  const KEY = "td_agent_email";
  const saved = { get() { try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; } }, set(v) { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch (e) {} } };
  function gate(el) {
    let off = null;
    const show = (msg) => {
      el.innerHTML = `<form class="ag-gate" autocomplete="off"><h2>Your scorecard</h2><p>Enter your work email to see your scorecard.</p>
        <label>Work email<input type="email" id="gEmail" required autocomplete="username" inputmode="email"></label>
        <button type="submit" class="btn btn-primary" id="gGo">View my scorecard</button><p class="ag-gerr" id="gErr" role="alert">${esc(msg || "")}</p></form>`;
    };
    // Returns an error message, or "" once the scorecard is open; null while the roster is still loading.
    const open = (email) => {
      const want = AgentLock.norm(email);
      const { trainees } = roster();
      if (!trainees.length) return null;
      const t = trainees.find((x) => AgentLock.norm(x.email || "") === want);
      if (!t) return "We couldn't find that email. Use the work email your trainer has on file.";
      if (inactive(t)) return "This profile isn't available.";
      saved.set(want);
      el.innerHTML = `<div class="ag-previewbar"><span>${esc(t.name)}</span><button type="button" class="btn" data-ag-signout>Sign out</button></div><div class="ag-body"></div>`;
      mount(el.querySelector(".ag-body"), t.id);
      return "";
    };
    const remembered = saved.get();
    if (remembered) {
      el.innerHTML = `<p class="ag-empty" style="text-align:center;margin-top:12vh">Opening your scorecard…</p>`;
      const tryOpen = () => {
        const r = open(remembered);
        if (r === null) return false; // still loading
        if (off) { off(); off = null; }
        if (r) { saved.set(""); show(r); }
        return true;
      };
      if (!tryOpen()) {
        off = cc() ? cc().onChange(tryOpen) : null;
        setTimeout(() => { if (off) { off(); off = null; } if (!el.querySelector(".ag-body") && !el.querySelector("#gEmail")) show(); }, 15000);
      }
    } else show();
    el.addEventListener("submit", (e) => {
      e.preventDefault();
      const r = open(el.querySelector("#gEmail").value);
      if (r) el.querySelector("#gErr").textContent = r;
      else if (r === null) el.querySelector("#gErr").textContent = "Still loading. Try again in a moment.";
    });
    el.addEventListener("click", (e) => { if (e.target.closest("[data-ag-signout]")) { saved.set(""); show(); } });
  }

  // ---- App: My Scorecard (Agent view): the page an agent gets ----
  APPS.agentcard = {
    title: "My Scorecard",
    icon: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    color: "#0d9488",
    render(el) {
      el.classList.add("ag-app");
      if (!isOwner()) return gate(el);
      const draw = (first) => {
        if (!first && !el.isConnected) return;
        const id = state.agentId;
        const preview = canSwitch();
        el.innerHTML = `${preview ? `<div class="ag-previewbar"><span>Agent view. You're looking at the page as</span><select id="agPick2">${agentOptions(id)}</select><button type="button" class="btn" data-ag-exit>Back to Trainer view</button></div>` : ""}<div class="ag-body" data-agent="${esc(id)}"></div>`;
        mount(el.querySelector(".ag-body"), id);
      };
      el.addEventListener("change", (e) => {
        if (e.target.id === "agPick2") {
          state.agentId = e.target.value;
          draw();
        }
      });
      el.addEventListener("click", (e) => {
        if (e.target.closest("[data-ag-exit]")) window.TrainerView.set("trainer");
      });
      draw(true);
      const off2 = cc() ? cc().onChange(() => { if (el.isConnected && !el.contains(document.activeElement)) draw(); }) : null;
      APPS.agentcard._off = off2;
    },
    onClose() {
      if (APPS.agentcard._off) APPS.agentcard._off();
      APPS.agentcard._off = null;
    },
  };

  // ---- The Trainer | Agent switch in the menu bar ----
  const right = document.querySelector(".menubar-right");
  if (right) {
    const sw = document.createElement("span");
    sw.className = "view-switch";
    sw.setAttribute("role", "group");
    sw.setAttribute("aria-label", "View");
    sw.innerHTML = `<button type="button" data-view="trainer">Trainer view</button><button type="button" data-view="agent">Agent view</button>`;
    right.insertBefore(sw, right.firstChild);
    const paint = () => {
      sw.hidden = !canSwitch();
      sw.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.view === state.mode));
    };
    sw.addEventListener("click", (e) => {
      const b = e.target.closest("[data-view]");
      if (b && b.dataset.view !== state.mode) window.TrainerView.set(b.dataset.view);
    });
    window.TrainerView.onChange(paint);
    paint();
    if (window.TrainerWS && window.TrainerWS.ready) window.TrainerWS.ready.then(paint, paint);
  }

  // Switching view swaps the taskbar and the open pages, with no reload.
  window.TrainerView.onChange((changed) => {
    if (!changed) return;
    [...openWindows.keys()].forEach((id) => closeApp(id));
    const brand = document.querySelector(".brand");
    if (brand) brand.textContent = state.mode === "agent" ? "Agent view" : appRole() === "manager" ? "Training Manager" : "Trainer";
    rebuildDock();
    const ids = visibleAppIds();
    const first = state.mode === "agent" ? "agentcard" : ids.includes("today") ? "today" : ids[0];
    if (first && APPS[first]) openApp(first);
  });

  {
    const lock = () => { if (!isOwner() && state.mode !== "agent") window.TrainerView.set("agent"); };
    if (window.TrainerWS && window.TrainerWS.ready) window.TrainerWS.ready.then(() => setTimeout(lock, 300), () => setTimeout(lock, 300));
  }
  if (forced) {
    const go = () => window.TrainerView.set("agent");
    if (window.TrainerWS && window.TrainerWS.ready) window.TrainerWS.ready.then(() => setTimeout(go, 400), () => setTimeout(go, 400));
    else setTimeout(go, 400);
  }
  try { if (document.querySelector(".dock-item") && typeof rebuildDock === "function") rebuildDock(); } catch (e) {}
})();
