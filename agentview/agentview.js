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
    return (trainees[0] || {}).id || "";
  };
  const canSwitch = () => !window.TrainerWS || !window.TrainerWS.isViewer;
  window.TrainerView = {
    get mode() { return state.mode; },
    get agentId() { return state.agentId; },
    canSwitch,
    onChange(fn) { subs.add(fn); return () => subs.delete(fn); },
    set(mode, agentId) {
      const m = mode === "agent" ? "agent" : "trainer";
      if (m === "agent") state.agentId = agentId || state.agentId || firstAgent();
      else if (agentId) state.agentId = agentId;
      const changed = m !== state.mode;
      state.mode = m;
      document.body.classList.toggle("agent-mode", m === "agent");
      subs.forEach((f) => { try { f(changed); } catch (e) {} });
    },
  };

  // ---- The scorecard ----
  function goalsOf(cohort) {
    const g = (cohort && cohort.team_goals) || {};
    const n = (k) => (g[k] !== "" && g[k] != null && !isNaN(Number(g[k])) ? Number(g[k]) : null);
    return { qa: n("qa"), speed: n("speed"), attendance: n("attendance"), quiz: n("quiz"), spot: n("spot") };
  }
  const DAYLBL = { ontime: "On time", late25: "Late (.25)", late50: "Late (.50)", late75: "Late (.75)", late100: "Late (1.00)", absent: "Absent", ncns: "No call, no show" };
  const chip = (met) => (met == null ? "" : `<span class="ag-chip ${met ? "ok" : "no"}">${met ? "Goal met" : "Below goal"}</span>`);
  const stat = (label, value, hint, met) => `<div class="ag-stat"><div class="ag-v">${value}</div><div class="ag-l">${esc(label)}</div><div class="ag-h">${hint || ""}</div>${chip(met)}</div>`;

  function quizPart(qr, goal) {
    if (!qr) return `<p class="ag-empty">Quiz results aren't available right now.</p>`;
    const items = (qr.items || []).filter((x) => x.pct != null);
    if (!items.length) return `<p class="ag-empty">No quiz results yet.</p>`;
    return `<table class="ag-table"><thead><tr><th>Quiz</th><th>Score</th><th>Passing</th></tr></thead><tbody>${items
      .map((x) => `<tr><td>${esc(x.title)}${x.week ? ` <small>Week ${x.week}</small>` : ""}</td><td class="${x.pct >= x.passing ? "ag-ok" : "ag-no"}"><b>${x.pct}%</b></td><td>${x.passing}%</td></tr>`)
      .join("")}</tbody></table>`;
  }

  function scorecardHtml(t, quiz) {
    const c = cohortOf(t.id);
    const g = goalsOf(c);
    const api = cc();
    const perf = api.traineePerformance(t.id);
    const sp = api.traineeSpeed(t.id);
    const spot = api.traineeSpot(t.id);
    const pts = window.TrainerAttendance && window.TrainerAttendance.points && c ? window.TrainerAttendance.points(c.id, t.id) : null;
    const all = perf.weeks.reduce((a, w) => ({ pass: a.pass + w.pass, total: a.total + w.total }), { pass: 0, total: 0 });
    const qaPct = all.total ? (all.pass / all.total) * 100 : null;
    const speeds = sp.weeks.map((w) => w.value).filter((v) => v != null);
    const spAvg = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null;
    const quizAvg = quiz && quiz.taken ? (quiz.weighted != null ? quiz.weighted : quiz.avg) : null;
    const spotAvg = spot.avg;
    const stats = [
      stat("Attendance points", pts == null ? "—" : num(pts), g.attendance != null ? `0 is best · goal at most ${num(g.attendance)}` : "0 is best", pts == null || g.attendance == null ? null : pts <= g.attendance),
      stat("QA score", qaPct == null ? "—" : `${Math.round(qaPct)}%`, all.total ? `${num(all.pass)} of ${all.total} audits passed${g.qa != null ? ` · goal ${num(g.qa)}%` : ""}` : "no audits yet", qaPct == null || g.qa == null ? null : qaPct >= g.qa),
      stat("Speed", spAvg == null ? "—" : num(spAvg), spAvg == null ? "no Speed yet" : `min per ticket, lower is faster${g.speed != null ? ` · goal ${num(g.speed)}` : ""}`, spAvg == null || g.speed == null ? null : spAvg <= g.speed),
      stat("Quiz average", quizAvg == null ? "—" : `${quizAvg}%`, quiz ? (quiz.taken ? `${quiz.taken} quiz${quiz.taken === 1 ? "" : "zes"} taken` : "no quizzes yet") : "loading…", quizAvg == null || g.quiz == null ? null : quizAvg >= g.quiz),
      stat("Spot checks", spotAvg == null ? "—" : `${num(spotAvg)}%`, spot.count ? `${spot.count} spot check${spot.count === 1 ? "" : "s"}${g.spot != null ? ` · goal ${num(g.spot)}%` : ""}` : "none yet", spotAvg == null || g.spot == null ? null : spotAvg >= g.spot),
    ].join("");

    const qaRows = perf.weeks
      .map((w) => {
        const b = w.brief || {};
        return `<tr><td><b>Week ${esc(w.week)}</b></td><td class="${g.qa != null && w.total && (w.pass / w.total) * 100 >= g.qa ? "ag-ok" : g.qa != null && w.total ? "ag-no" : ""}">${w.total ? `<b>${Math.round((w.pass / w.total) * 100)}%</b> <small>${num(w.pass)} of ${w.total}</small>` : "—"}</td><td>${(b.strengths || []).length ? `<div><span class="ag-tag good">Doing well</span> ${(b.strengths || []).map(esc).join(" · ")}</div>` : ""}${(b.recurring_issues || []).length ? `<div><span class="ag-tag watch">To work on</span> ${(b.recurring_issues || []).map(esc).join(" · ")}</div>` : ""}</td></tr>`;
      })
      .join("");
    const spRows = sp.weeks
      .map((w) => `<tr><td><b>Week ${esc(w.week)}</b></td><td class="${g.speed != null && w.value != null ? (w.value <= g.speed ? "ag-ok" : "ag-no") : ""}"><b>${w.value == null ? "—" : num(w.value)}</b></td><td>${num(w.hours)} h</td><td>${num(w.tickets)} tickets</td></tr>`)
      .join("");
    const days = (c && c.attendance_days && c.attendance_days[t.id]) || {};
    const late = Object.keys(days).filter((k) => days[k] && days[k] !== "ontime").sort((a, b) => +a - +b);
    const graded = Object.keys(days).filter((k) => days[k]).length;
    const spotRows = spot.nesting
      .map((x) => `<div class="ag-spot"><div class="ag-spot-top"><b>${num(Number(x.score))}%</b> <small>${esc(dshort(x.created_at))}${/^https?:\/\//i.test(x.ticket || "") ? ` · <a href="${esc(x.ticket)}" target="_blank" rel="noopener">Open ticket</a>` : ""}</small><span class="ag-chip ${x.reply || x.ack_at ? "ok" : "plain"}">${x.reply || x.ack_at ? "Acknowledged" : x.slack_sent_at ? "Awaiting your reply" : "Not sent yet"}</span></div><p><b>Communication.</b> ${esc(x.comms)}</p><p><b>Resolution.</b> ${esc(x.resolution)}</p></div>`)
      .join("");
    const sends = (t.coaching_sends || []).slice().reverse();
    const sendRows = sends.map((x) => `<tr><td>${esc(dshort(x.sent_at))}</td><td>${esc(x.label)}</td><td>${x.reply || x.ack_at ? `<span class="ag-chip ok">Acknowledged</span>` : `<span class="ag-chip plain">Awaiting your reply</span>`}</td></tr>`).join("");

    return `<div class="ag-page">
      <div class="ag-head"><div><h2>${esc(t.name || "Agent")}</h2><p>${c ? esc(c.name) : "No class"}${c && c.training_start_date ? ` · started ${esc(dshort(c.training_start_date + "T00:00:00"))}` : ""}${inactive(t) ? " · inactive" : ""}</p></div></div>
      <div class="ag-stats">${stats}</div>
      <section class="ag-sec"><h3>QA by week</h3>${qaRows ? `<table class="ag-table"><thead><tr><th>Week</th><th>Score</th><th>Feedback</th></tr></thead><tbody>${qaRows}</tbody></table>` : `<p class="ag-empty">No QA weeks yet.</p>`}</section>
      <section class="ag-sec"><h3>Speed by week</h3>${spRows ? `<table class="ag-table"><thead><tr><th>Week</th><th>Min per ticket</th><th>Hours</th><th>Cleared</th></tr></thead><tbody>${spRows}</tbody></table>` : `<p class="ag-empty">No Speed yet.</p>`}</section>
      <section class="ag-sec"><h3>Attendance</h3>${graded ? `<p>${graded} day${graded === 1 ? "" : "s"} graded, ${graded - late.length} on time.${late.length ? ` Not on time: ${late.map((k) => `Day ${k} (${esc(DAYLBL[days[k]] || days[k])})`).join(", ")}.` : " Nothing missed."}</p>` : `<p class="ag-empty">No attendance recorded yet.</p>`}</section>
      <section class="ag-sec"><h3>Quizzes</h3><div data-ag-quiz>${quizPart(quiz, g.quiz)}</div></section>
      <section class="ag-sec"><h3>Spot checks</h3>${spotRows || `<p class="ag-empty">No spot checks yet.</p>`}</section>
      <section class="ag-sec"><h3>Coaching you received</h3>${sendRows ? `<table class="ag-table"><thead><tr><th>Sent</th><th>About</th><th>Status</th></tr></thead><tbody>${sendRows}</tbody></table>` : `<p class="ag-empty">No coaching sent yet.</p>`}</section>
      <p class="ag-foot">This page is read-only. Reply to coaching and spot checks in Slack.</p>
    </div>`;
  }

  // Draws the scorecard for one agent into `el`, then fills in quizzes when they have loaded.
  async function mount(el, traineeId) {
    const t = roster().trainees.find((x) => x.id === traineeId);
    if (!t) {
      el.innerHTML = `<p class="ag-empty">Pick an agent to see their scorecard.</p>`;
      return;
    }
    el.innerHTML = scorecardHtml(t, null);
    const q = window.TrainerQuiz && window.TrainerQuiz.traineeResults ? await window.TrainerQuiz.traineeResults(traineeId).catch(() => null) : null;
    if (!el.isConnected || el.dataset.agent !== traineeId) return;
    el.innerHTML = scorecardHtml(t, q);
  }
  window.AgentScorecard = { mount };

  // ---- Picker shared by both apps ----
  function agentOptions(selected) {
    const { cohorts, trainees } = roster();
    const byId = new Map(trainees.map((t) => [t.id, t]));
    return cohorts
      .slice()
      .sort((a, b) => String(b.training_start_date || "").localeCompare(String(a.training_start_date || "")))
      .map((c) => {
        const ts = (c.trainee_ids || []).map((id) => byId.get(id)).filter(Boolean).sort((a, b) => (inactive(a) - inactive(b)) || String(a.name).localeCompare(String(b.name)));
        return `<optgroup label="${esc(c.name)}">${ts.map((t) => `<option value="${esc(t.id)}"${t.id === selected ? " selected" : ""}>${esc(t.name)}${inactive(t) ? " (Inactive)" : ""}</option>`).join("")}</optgroup>`;
      })
      .join("");
  }

  // ---- App: Agent View (Trainer view): preview what an agent sees ----
  let previewEl = null, off = null;
  APPS.agentview = {
    title: "Agent View",
    icon: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    color: "#0d9488",
    render(el) {
      previewEl = el;
      el.classList.add("ag-app");
      if (!state.agentId) state.agentId = firstAgent();
      const draw = (first) => {
        if (!first && !el.isConnected) return;
        const keep = el.querySelector("#agPick") ? el.querySelector("#agPick").value : state.agentId;
        state.agentId = keep || state.agentId;
        el.innerHTML = `
          <div class="ag-intro">
            <h3>Agent View</h3>
            <p>This is exactly what an agent sees: their own scorecard and nothing else. It is read-only. They don't see other agents, your notes, HR documents or any pass/fail projection, and they can't enter or change anything. You gather and enter everything in the Trainer view.</p>
            <div class="ag-bar">
              <label for="agPick">Preview as</label>
              <select id="agPick">${agentOptions(state.agentId)}</select>
              <button type="button" class="btn btn-primary" data-ag-open>Open the Agent view</button>
            </div>
          </div>
          <div class="ag-frame"><div class="ag-frame-bar"><span class="ag-dot"></span> Previewing what ${esc((roster().trainees.find((t) => t.id === state.agentId) || {}).name || "the agent")} sees</div><div class="ag-body" data-agent="${esc(state.agentId)}"></div></div>`;
        const body = el.querySelector(".ag-body");
        mount(body, state.agentId);
      };
      el.addEventListener("change", (e) => {
        if (e.target.id === "agPick") {
          state.agentId = e.target.value;
          draw();
        }
      });
      el.addEventListener("click", (e) => {
        if (e.target.closest("[data-ag-open]")) window.TrainerView.set("agent", state.agentId);
      });
      draw(true);
      off = cc() ? cc().onChange(() => { if (el.isConnected && !el.contains(document.activeElement)) draw(); }) : null;
    },
    onClose() {
      if (off) off();
      off = null;
      previewEl = null;
    },
  };

  // ---- App: My Scorecard (Agent view): the page an agent gets ----
  APPS.agentcard = {
    title: "My Scorecard",
    icon: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    color: "#0d9488",
    render(el) {
      el.classList.add("ag-app");
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

  if (forced) {
    const go = () => window.TrainerView.set("agent");
    if (window.TrainerWS && window.TrainerWS.ready) window.TrainerWS.ready.then(() => setTimeout(go, 400), () => setTimeout(go, 400));
    else setTimeout(go, 400);
  }
  try { if (document.querySelector(".dock-item") && typeof rebuildDock === "function") rebuildDock(); } catch (e) {}
})();
