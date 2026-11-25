// Team Lead view: read-only access to every cohort, its roster and each trainee's performance, for the
// people the owner lists in Settings › Team Leads. Cohort › Roster › Trainee, with an individual and a team report.
// Nothing here writes: no inputs, no sends.
(function () {
  "use strict";
  if (typeof APPS === "undefined" || APPS.tlview) return;
  const esc = (s) => escapeHtml(String(s == null ? "" : s));
  const num = (v) => String(Math.round(v * 100) / 100);
  const cc = () => window.CoachingCompass;
  const dshort = (iso) => (iso ? new Date(String(iso).length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "");
  const roster = () => (cc() && cc().data()) || { cohorts: [], trainees: [] };
  const inactive = (t) => (typeof isInactive === "function" ? isInactive(t) : t.cohort_status === "inactive");
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const NOTE_LABEL = { coaching: "Coaching", behavioral: "Behavioral", performance: "Performance" };

  // One trainee's headline numbers and projection. `quiz` is TrainerQuiz.cohortScores() for their cohort.
  function metricsOf(c, t, quiz) {
    const api = cc();
    const qa = t.crm_name && api.qaSummary ? api.qaSummary([t.crm_name]) : null;
    const speeds = api.traineeSpeed(t.id).weeks.map((w) => w.value).filter((v) => v != null);
    const q = quiz && quiz[t.id];
    const m = {
      qa: qa && qa.total ? (qa.pass / qa.total) * 100 : null,
      speed: avg(speeds),
      quiz: q && q.taken ? (q.weighted != null ? q.weighted : q.avg) : null,
      spot: api.traineeSpot ? api.traineeSpot(t.id).avg : null,
      att: window.TrainerAttendance && window.TrainerAttendance.points && c ? window.TrainerAttendance.points(c.id, t.id) : null,
      status: null, missed: [],
    };
    const manual = t.trainee_status && t.trainee_status.mode === "manual" ? t.trainee_status.value : "";
    if (manual) m.status = manual;
    else if (c && typeof evaluateTrainee === "function" && typeof hasGoals === "function" && hasGoals(c)) {
      try {
        const ev = evaluateTrainee(c, t, quiz);
        m.status = ev.status;
        m.missed = ev.checks.filter((k) => !k.met).map((k) => k.label);
      } catch (e) {}
    }
    return m;
  }
  const STATUS = { pass: ["Projected to pass", "ok"], fail: ["Projected to fail", "no"], resigned: ["Resigned", "plain"], terminated: ["Terminated", "plain"] };
  const badge = (st) => (st && STATUS[st] ? `<span class="tl-badge ${STATUS[st][1]}">${STATUS[st][0]}</span>` : `<span class="tl-badge plain">No projection</span>`);
  const cell = (v, unit, goal, dir) => {
    if (v == null) return `<td class="tl-n">—</td>`;
    const met = goal == null ? null : dir === "min" ? v >= goal : v <= goal;
    return `<td class="tl-n ${met == null ? "" : met ? "ok" : "no"}">${num(v)}${unit}</td>`;
  };
  const goalsOf = (c) => {
    const g = (c && c.team_goals) || {};
    const n = (k) => (g[k] !== "" && g[k] != null && !isNaN(Number(g[k])) ? Number(g[k]) : null);
    return { qa: n("qa"), speed: n("speed"), attendance: n("attendance"), quiz: n("quiz"), spot: n("spot") };
  };
  const avatar = (t, size) => {
    const ok = typeof t.photo === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(t.photo);
    const ini = String(t.name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("");
    return `<span class="tl-av" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.4)}px">${ok ? `<img src="${esc(t.photo)}" alt="">` : esc(ini)}</span>`;
  };

  // Collect the CSS the scorecard and reports use, so a downloaded report looks the same on its own.
  function reportCss() {
    let css = "";
    for (const sheet of [...document.styleSheets]) {
      let rules;
      try { rules = sheet.cssRules; } catch (e) { continue; }
      for (const r of [...(rules || [])]) if (/\.(ag|tl)-/.test(r.cssText) && !/body\.|\.window|#dock/.test(r.cssText)) css += r.cssText + "\n";
    }
    return css;
  }
  async function download(title, inner) {
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>:root{--muted:#6b7280;--line:#e5e7eb;--card:#fff;--success-bg:rgba(52,199,89,.12);--success-ink:#1d7a3a}body{margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#111827;background:#fff;line-height:1.5}${reportCss()}</style></head><body>${inner}</body></html>`;
    const dl = window.claude && window.claude.use ? await window.claude.use("downloads").catch(() => null) : null;
    const filename = `${title.replace(/[^\w\- ]+/g, "").replace(/\s+/g, "_").slice(0, 80) || "report"}.html`;
    if (dl && dl.save) return dl.save({ filename, data: html }).then(() => "Saved.", () => "");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = filename;
    a.click();
    return "Saved.";
  }
  function printReport(inner) {
    let box = document.getElementById("tlPrint");
    if (!box) { box = document.createElement("div"); box.id = "tlPrint"; document.body.appendChild(box); }
    box.innerHTML = inner;
    document.body.classList.add("tl-printing");
    const done = () => { document.body.classList.remove("tl-printing"); box.innerHTML = ""; window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    try { window.print(); } catch (e) { done(); }
    setTimeout(() => { if (!window.matchMedia || !window.matchMedia("print").matches) done(); }, 1500);
  }

  APPS.tlview = {
    title: "Team Lead View",
    dockLabel: "Team Lead",
    icon: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 11l2 2 4-4"/>',
    color: "#6366f1",
    custom: true,
    render(el) {
      el.classList.add("tl-app");
      const ui = { level: "cohorts", cohortId: "", traineeId: "", report: "", quiz: {}, notes: null, notesFor: "", offNotes: null, card: null, cardFor: "", msg: "" };
      const crumbs = () => {
        const { cohorts, trainees } = roster();
        const c = cohorts.find((x) => x.id === ui.cohortId);
        const t = trainees.find((x) => x.id === ui.traineeId);
        const items = [];
        if (c) items.push({ label: c.name, go: ui.level !== "roster" ? () => go("roster", c.id) : null });
        if (t && (ui.level === "trainee" || ui.report === "ind")) items.push({ label: t.name, go: ui.level !== "trainee" ? () => go("trainee", c && c.id, t.id) : null });
        if (ui.level === "report") items.push({ label: ui.report === "team" ? "Team report" : "Individual report" });
        if (window.TrainerDesk) window.TrainerDesk.setCrumbs("tlview", items, () => go("cohorts"));
      };
      const go = (level, cohortId, traineeId, report) => {
        ui.level = level;
        if (cohortId !== undefined) ui.cohortId = cohortId || "";
        if (traineeId !== undefined) ui.traineeId = traineeId || "";
        ui.report = report || "";
        ui.msg = "";
        draw();
        el.scrollTop = 0;
        const sc = el.closest(".content"); if (sc) sc.scrollTop = 0;
      };
      const loadQuiz = (c) => {
        if (!c || ui.quiz[c.id] || !window.TrainerQuiz || !window.TrainerQuiz.cohortScores) return;
        ui.quiz[c.id] = "loading";
        window.TrainerQuiz.cohortScores(c.trainee_ids || []).then((q) => { ui.quiz[c.id] = q || {}; draw(); }, () => { ui.quiz[c.id] = {}; draw(); });
      };
      const quizOf = (c) => (c && ui.quiz[c.id] && ui.quiz[c.id] !== "loading" ? ui.quiz[c.id] : null);
      const members = (c) => {
        const byId = new Map(roster().trainees.map((t) => [t.id, t]));
        return (c.trainee_ids || []).map((id) => byId.get(id)).filter(Boolean).sort((a, b) => (inactive(a) - inactive(b)) || String(a.name).localeCompare(String(b.name)));
      };
      const watchNotes = (id) => {
        if (ui.notesFor === id) return;
        if (ui.offNotes) ui.offNotes();
        ui.notesFor = id; ui.notes = null;
        ui.offNotes = cc() && cc().notes ? cc().notes.subscribe(id, (list) => { ui.notes = list || []; if (el.isConnected) draw(); }) : null;
      };
      const loadCard = async (t) => {
        if (!window.AgentScorecard) return;
        const want = t.id;
        ui.cardFor = want;
        const d = await window.AgentScorecard.collect(t, true).catch(() => null);
        if (ui.cardFor !== want || !d) return;
        ui.card = Object.assign(d, { audience: "tl" });
        if (el.isConnected) draw();
      };
      const notesHtml = () => {
        if (ui.notes == null) return `<p class="ag-empty">Loading notes…</p>`;
        if (!ui.notes.length) return `<p class="ag-empty">No notes from the trainer yet.</p>`;
        return ui.notes.map((n) => `<div class="tl-note"><div class="tl-note-h"><span class="ag-chip plain">${esc(NOTE_LABEL[n.category] || n.category || "Note")}</span><small>${esc(dshort(n.created_at))}</small></div><p>${esc(n.text || "")}</p></div>`).join("");
      };

      // ---- Cohorts ----
      const cohortsHtml = () => {
        const list = roster().cohorts.slice().sort((a, b) => String(b.training_start_date || "").localeCompare(String(a.training_start_date || "")));
        if (!list.length) return `<p class="ag-empty">No cohorts yet.</p>`;
        return `<div class="tl-cards">${list.map((c) => {
          loadQuiz(c);
          const ms = members(c), q = quizOf(c);
          const tally = { pass: 0, fail: 0 };
          ms.forEach((t) => { const m = metricsOf(c, t, q); if (m.status === "pass" || m.status === "fail") tally[m.status]++; });
          return `<button type="button" class="tl-card" data-tl-cohort="${esc(c.id)}"><b>${esc(c.name)}</b>
            <small>${c.training_start_date ? `Started ${esc(dshort(c.training_start_date))}` : "No start date"}${c.department ? ` · ${esc(c.department)}` : ""}${c.team_lead ? ` · TL ${esc(c.team_lead)}` : ""}</small>
            <span class="tl-card-n">${ms.length} trainee${ms.length === 1 ? "" : "s"}</span>
            <span class="tl-card-st"><span class="tl-badge ok">${tally.pass} on track</span><span class="tl-badge no">${tally.fail} at risk</span></span></button>`;
        }).join("")}</div>`;
      };

      // ---- Roster ----
      const rosterRows = (c) => {
        const q = quizOf(c), g = goalsOf(c);
        return members(c).map((t) => {
          const m = metricsOf(c, t, q);
          return { t, m, html: `<tr class="${inactive(t) ? "is-inactive" : ""}" data-tl-trainee="${esc(t.id)}" tabindex="0"><td><span class="tl-namecell">${avatar(t, 30)}<span><b>${esc(t.name)}</b>${inactive(t) ? " <small>(Inactive)</small>" : ""}<small class="tl-sub">${esc([t.team_lead, t.department].filter(Boolean).join(" · "))}</small></span></span></td>
            <td>${badge(m.status)}${m.missed.length ? `<small class="tl-sub">Missed: ${esc(m.missed.join(", "))}</small>` : ""}</td>
            ${cell(m.qa, "%", g.qa, "min")}${cell(m.speed, "", g.speed, "max")}${cell(m.quiz, "%", g.quiz, "min")}${cell(m.spot, "%", g.spot, "min")}${cell(m.att, "", g.attendance, "max")}</tr>` };
        });
      };
      const rosterTable = (c, rows) => `<div class="tl-tablewrap"><table class="ag-table tl-table"><thead><tr><th>Trainee</th><th>Projection</th><th>QA</th><th>Speed<br><small>min/ticket</small></th><th>Quiz</th><th>Spot checks</th><th>Attendance<br><small>points</small></th></tr></thead><tbody>${rows.map((r) => r.html).join("") || `<tr><td colspan="7" class="ag-empty">No trainees in this cohort.</td></tr>`}</tbody></table></div>`;
      const goalLine = (c) => {
        const g = goalsOf(c);
        const bits = [g.qa != null && `QA ≥ ${num(g.qa)}%`, g.speed != null && `Speed ≤ ${num(g.speed)}`, g.quiz != null && `Quiz ≥ ${num(g.quiz)}%`, g.spot != null && `Spot checks ≥ ${num(g.spot)}%`, g.attendance != null && `Attendance ≤ ${num(g.attendance)} pts`].filter(Boolean);
        return bits.length ? `Goals: ${bits.join(" · ")}` : "No goals set for this cohort.";
      };
      const rosterHtml = () => {
        const c = roster().cohorts.find((x) => x.id === ui.cohortId);
        if (!c) return `<p class="ag-empty">That cohort isn't available.</p>`;
        loadQuiz(c);
        const rows = rosterRows(c);
        return `<div class="tl-head"><div><h2>${esc(c.name)}</h2><p class="tl-sub">${esc(goalLine(c))}</p></div>
          <button type="button" class="btn btn-primary" data-tl-teamreport>Team report</button></div>
          ${rosterTable(c, rows)}<p class="tl-sub">Green meets the cohort goal, red misses it. Click a trainee for their full results.</p>`;
      };

      // ---- Trainee ----
      const traineeHtml = () => {
        const t = roster().trainees.find((x) => x.id === ui.traineeId);
        if (!t) return `<p class="ag-empty">That trainee isn't available.</p>`;
        watchNotes(t.id);
        if (ui.cardFor !== t.id) { ui.card = null; loadCard(t); }
        return `<div class="tl-head"><div></div><button type="button" class="btn btn-primary" data-tl-indreport>Individual report</button></div>
          ${ui.card ? AgentCard.html(ui.card) : `<p class="ag-empty">Loading ${esc(t.name)}'s results…</p>`}
          <div class="ag-page"><section class="ag-sec"><h3>Trainer's notes</h3>${notesHtml()}</section></div>`;
      };

      // ---- Reports ----
      const teamReportInner = () => {
        const c = roster().cohorts.find((x) => x.id === ui.cohortId);
        if (!c) return "";
        const q = quizOf(c), rows = rosterRows(c);
        const act = rows.filter((r) => !inactive(r.t));
        const col = (k) => avg(act.map((r) => r.m[k]).filter((v) => v != null));
        const tally = { pass: 0, fail: 0, none: 0 };
        act.forEach((r) => (r.m.status === "pass" || r.m.status === "fail" ? tally[r.m.status]++ : tally.none++));
        const risk = act.filter((r) => r.m.status === "fail");
        const fmt = (v, u) => (v == null ? "—" : `${num(v)}${u}`);
        return `<div class="tl-report"><h1>Team report: ${esc(c.name)}</h1>
          <p class="tl-sub">${c.training_start_date ? `Started ${esc(dshort(c.training_start_date))} · ` : ""}${act.length} active trainee${act.length === 1 ? "" : "s"} · Generated ${esc(new Date().toLocaleString())}</p>
          <p class="tl-sub">${esc(goalLine(c))}</p>
          <div class="ag-stats">
            <div class="ag-stat"><div class="ag-v">${tally.pass}</div><div class="ag-l">Projected to pass</div></div>
            <div class="ag-stat"><div class="ag-v">${tally.fail}</div><div class="ag-l">Projected to fail</div></div>
            <div class="ag-stat"><div class="ag-v">${fmt(col("qa"), "%")}</div><div class="ag-l">Average QA</div></div>
            <div class="ag-stat"><div class="ag-v">${fmt(col("speed"), "")}</div><div class="ag-l">Average Speed</div><div class="ag-h">min per ticket</div></div>
            <div class="ag-stat"><div class="ag-v">${fmt(col("quiz"), "%")}</div><div class="ag-l">Average quiz</div></div>
            <div class="ag-stat"><div class="ag-v">${fmt(col("spot"), "%")}</div><div class="ag-l">Average spot check</div></div>
          </div>
          <section class="ag-sec"><h3>Needs attention</h3>${risk.length ? `<ul>${risk.map((r) => `<li><b>${esc(r.t.name)}</b>${r.m.missed.length ? `: below goal on ${esc(r.m.missed.join(", "))}` : ""}</li>`).join("")}</ul>` : `<p class="ag-empty">Nobody is projected to fail.</p>`}</section>
          <section class="ag-sec"><h3>Every trainee</h3>${rosterTable(c, rows)}</section></div>`;
      };
      const indReportInner = () => {
        const t = roster().trainees.find((x) => x.id === ui.traineeId);
        if (!t || !ui.card) return "";
        return `<div class="tl-report"><h1>Individual report: ${esc(t.name)}</h1><p class="tl-sub">Generated ${esc(new Date().toLocaleString())}</p>${AgentCard.html(ui.card)}<div class="ag-page"><section class="ag-sec"><h3>Trainer's notes</h3>${notesHtml()}</section></div></div>`;
      };
      const reportHtml = () => {
        if (ui.report === "ind" && !ui.card) { const t = roster().trainees.find((x) => x.id === ui.traineeId); if (t && ui.cardFor !== t.id) loadCard(t); if (t) watchNotes(t.id); return `<p class="ag-empty">Building the report…</p>`; }
        const inner = ui.report === "team" ? teamReportInner() : indReportInner();
        return `<div class="tl-head tl-noprint"><div></div><span class="tl-acts"><button type="button" class="btn" data-tl-print>Print or save as PDF</button><button type="button" class="btn btn-primary" data-tl-download>Download</button><span class="tl-msg" role="status">${esc(ui.msg)}</span></span></div>${inner}`;
      };

      const draw = () => {
        if (!el.isConnected && el.childElementCount) return;
        const body = ui.level === "roster" ? rosterHtml() : ui.level === "trainee" ? traineeHtml() : ui.level === "report" ? reportHtml() : `<div class="tl-head"><div><h2>Cohorts</h2><p class="tl-sub">Pick a cohort to see its roster.</p></div></div>${cohortsHtml()}`;
        el.innerHTML = `<div class="tl-bar">Team Lead view · read-only</div><div class="tl-wrap">${body}</div>`;
        crumbs();
      };

      el.addEventListener("click", async (e) => {
        const b = e.target.closest("[data-tl-cohort],[data-tl-trainee],[data-tl-teamreport],[data-tl-indreport],[data-tl-print],[data-tl-download]");
        if (!b || e.target.closest("a")) return;
        const d = b.dataset;
        if (d.tlCohort) go("roster", d.tlCohort);
        else if (d.tlTrainee) go("trainee", undefined, d.tlTrainee);
        else if ("tlTeamreport" in d) go("report", undefined, undefined, "team");
        else if ("tlIndreport" in d) go("report", undefined, undefined, "ind");
        else if ("tlPrint" in d) printReport(ui.report === "team" ? teamReportInner() : indReportInner());
        else if ("tlDownload" in d) {
          const c = roster().cohorts.find((x) => x.id === ui.cohortId), t = roster().trainees.find((x) => x.id === ui.traineeId);
          const title = ui.report === "team" ? `Team report ${c ? c.name : ""}` : `Individual report ${t ? t.name : ""}`;
          ui.msg = await download(title, ui.report === "team" ? teamReportInner() : indReportInner()).catch(() => "Couldn't save the file.");
          const m = el.querySelector(".tl-msg"); if (m) m.textContent = ui.msg;
        }
      });
      el.addEventListener("keydown", (e) => { const r = e.target.closest("[data-tl-trainee]"); if (r && e.key === "Enter") go("trainee", undefined, r.dataset.tlTrainee); });

      draw();
      const off1 = cc() ? cc().onChange(() => { if (ui.level === "trainee" || ui.report === "ind") { const t = roster().trainees.find((x) => x.id === ui.traineeId); if (t) loadCard(t); } draw(); }) : null;
      const off2 = window.TrainerQuiz && window.TrainerQuiz.onChange ? window.TrainerQuiz.onChange(() => { ui.quiz = {}; draw(); }) : null;
      APPS.tlview._off = () => { if (off1) off1(); if (off2) off2(); if (ui.offNotes) ui.offNotes(); };
    },
    onClose() {
      if (APPS.tlview._off) APPS.tlview._off();
      APPS.tlview._off = null;
    },
  };
})();
