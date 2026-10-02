// ---------- Training Manager: every Trainer's numbers in one place ----------
// Each Trainer's dashboard writes a small summary of its own cohorts to trainers/<id> (see publishSummary in app.js):
//   summary { cohorts: [{ id, name, department, start, status, trainees, active, inactive, resigned, terminated,
//                          pass, fail, none, qa:{pass,total}, speed:{sum,n}, quiz:{sum,n}, goals:{qa,quiz,speed} }], overdue }
// The Training Manager reads those documents and shows them side by side. Names and photos come from the profiles of the
// ids in the directory; only ids are stored. "View dashboard" opens that Trainer's real workspace, read-only.
(function () {
  const esc = (s) => escapeHtml(s == null ? "" : s);
  const WS = () => window.TrainerWS;
  const listeners = new Set();
  const notify = () => listeners.forEach((f) => { try { f(); } catch {} });
  let dir = []; // [{ id, base, summary, summary_at, updated_at }]
  let people = {}; // id -> { name, avatarUrl, color }
  let loaded = false;
  let started = false;

  async function resolveNames() {
    const user = await window.TrainerUse("user");
    if (!user?.profiles) return;
    const ids = dir.map((d) => d.id);
    if (!ids.length) return;
    try {
      people = await user.profiles(ids);
      notify();
    } catch {}
  }
  async function start() {
    if (started) return;
    started = true;
    const db = await window.TrainerUse("db");
    if (!db) {
      loaded = true;
      return notify();
    }
    db.collection("trainers").onSnapshot(
      (snap) => {
        dir = snap.docs.map((d) => ({ id: d.id, ...JSON.parse(JSON.stringify(d.data() || {})) }));
        loaded = true;
        notify();
        resolveNames();
      },
      () => ((loaded = true), notify())
    );
  }

  // ---- Numbers ----
  const pct = (a) => (a && a.total ? Math.round((a.pass / a.total) * 100) : null);
  const mean = (a) => (a && a.n ? Math.round((a.sum / a.n) * 10) / 10 : null);
  const fmt = (v, unit = "") => (v == null ? "—" : `${v}${unit}`);
  const sum = (list, f) => list.reduce((n, x) => n + (f(x) || 0), 0);
  function rollup(cohorts) {
    const cs = cohorts || [];
    const pool = (k) => cs.reduce((a, c) => (c[k] ? { pass: a.pass + (c[k].pass || 0), total: a.total + (c[k].total || 0), sum: a.sum + (c[k].sum || 0), n: a.n + (c[k].n || 0) } : a), { pass: 0, total: 0, sum: 0, n: 0 });
    const qa = pool("qa"), sp = pool("speed"), qz = pool("quiz");
    return {
      count: cs.length,
      active: sum(cs, (c) => c.active),
      inactive: sum(cs, (c) => c.inactive),
      pass: sum(cs, (c) => c.pass),
      fail: sum(cs, (c) => c.fail),
      none: sum(cs, (c) => c.none),
      qa: qa.total ? Math.round((qa.pass / qa.total) * 100) : null,
      speed: sp.n ? Math.round((sp.sum / sp.n) * 10) / 10 : null,
      quiz: qz.n ? Math.round(qz.sum / qz.n) : null,
    };
  }
  // One row per Trainer who has published a summary.
  function trainers() {
    return dir
      .map((d) => {
        const cs = d.summary?.cohorts || [];
        const p = people[d.id] || {};
        return { id: d.id, base: d.base, name: p.name || "", avatar: p.avatarUrl || "", color: p.color || "", cohorts: cs, overdue: d.summary?.overdue || 0, at: d.summary_at || "", has: !!d.summary, ...rollup(cs) };
      })
      .sort((a, b) => (a.name || "~").localeCompare(b.name || "~"));
  }
  const nameOf = (t) => t.name || "Trainer";
  const initials = (t) => (t.name || "T").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const avatar = (t) => (t.avatar ? `<img class="mg-av" src="${esc(t.avatar)}" alt="" />` : `<span class="mg-av" style="background:${esc(t.color || "#c7d7ff")}">${esc(initials(t))}</span>`);
  const ago = (iso) => {
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (!iso || isNaN(m)) return "never";
    return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
  };

  // ---- Needs attention ----
  function attention(list) {
    const out = [];
    list.forEach((t) => {
      if (t.fail) out.push({ sev: 3, icon: "⚠", title: `${nameOf(t)} · ${t.fail} trainee${t.fail === 1 ? "" : "s"} projected to fail`, sub: t.cohorts.filter((c) => c.fail).map((c) => c.name).join(", "), tag: "projection" });
      if (t.overdue) out.push({ sev: 2, icon: "⏰", title: `${nameOf(t)} · ${t.overdue} overdue reminder${t.overdue === 1 ? "" : "s"}`, sub: "", tag: "reminders" });
      t.cohorts.forEach((c) => {
        const q = pct(c.qa), s = mean(c.speed), z = mean(c.quiz);
        if (c.goals?.qa > 0 && q != null && q < c.goals.qa) out.push({ sev: 2, icon: "📉", title: `${nameOf(t)} · QA ${q}% vs goal ${c.goals.qa}%`, sub: c.name, tag: "QA" });
        if (c.goals?.speed > 0 && s != null && s > c.goals.speed) out.push({ sev: 2, icon: "🐢", title: `${nameOf(t)} · speed ${s} vs goal ${c.goals.speed}`, sub: c.name, tag: "Speed" });
        if (c.goals?.quiz > 0 && z != null && z < c.goals.quiz) out.push({ sev: 1, icon: "📝", title: `${nameOf(t)} · quiz ${z}% vs goal ${c.goals.quiz}%`, sub: c.name, tag: "Quiz" });
      });
    });
    return out.sort((a, b) => b.sev - a.sev).slice(0, 8);
  }
  const stale = (t) => !t.has;

  // ---- Apps ----
  const bar = (t) => {
    const tot = t.pass + t.fail + t.none || 1;
    return `<div class="mg-bar" title="${t.pass} pass · ${t.none} no projection · ${t.fail} fail"><i class="pass" style="width:${(t.pass / tot) * 100}%"></i><i class="none" style="width:${(t.none / tot) * 100}%"></i><i class="fail" style="width:${(t.fail / tot) * 100}%"></i></div>`;
  };
  const kpi = (v, label, hint) => `<div class="mg-kpi"><div class="mg-v">${v}</div><div class="mg-l">${label}</div>${hint ? `<div class="mg-h">${hint}</div>` : ""}</div>`;
  const empty = (list) =>
    !loaded
      ? `<p class="muted">Loading Trainers…</p>`
      : !list.length
        ? `<p class="muted">No Trainers have published their numbers yet. Each Trainer's dashboard publishes a summary the first time it's opened.</p>`
        : "";
  const viewBtn = (t) => `<button type="button" class="btn btn-small" data-mg-view="${esc(t.id)}" data-mg-base="${esc(t.base || "own")}">View dashboard</button>`;

  function overview(list) {
    const all = rollup(list.flatMap((t) => t.cohorts));
    const att = attention(list);
    const metric = ui.metric;
    const vals = list.map((t) => ({ t, v: t[metric] })).filter((x) => x.v != null).sort((a, b) => (metric === "speed" ? a.v - b.v : b.v - a.v));
    const max = Math.max(...vals.map((x) => x.v), 1);
    return `
      <div class="mg-kpis">
        ${kpi(list.length, "Trainers", `${all.count} cohort${all.count === 1 ? "" : "s"}`)}
        ${kpi(all.active, "Active trainees", `${all.inactive} inactive`)}
        ${kpi(fmt(all.qa, "%"), "Avg QA")}
        ${kpi(fmt(all.speed), "Avg speed (min/ticket)")}
        ${kpi(fmt(all.quiz, "%"), "Avg quiz score")}
        ${kpi(all.fail, "Projected to fail", `of ${all.active + all.inactive} trainees`)}
      </div>
      <div class="mg-grid">
        <div><h4 class="mg-h2">Trainers</h4><div class="mg-cards">${list
          .map(
            (t) => `<div class="mg-card">
              <div class="mg-card-h">${avatar(t)}<div><b>${esc(nameOf(t))}</b><small>${esc(t.cohorts.map((c) => c.name).join(" · ") || "No cohorts yet")}</small></div>
                <span class="mg-pill ${t.fail ? "bad" : "ok"}">${t.fail ? `${t.fail} projected to fail` : "On track"}</span></div>
              <div class="mg-m"><div><b>${t.active}</b><span>Active trainees</span></div><div><b>${fmt(t.qa, "%")}</b><span>QA</span></div><div><b>${fmt(t.speed)}</b><span>Speed</span></div></div>
              <div class="mg-m"><div><b>${fmt(t.quiz, "%")}</b><span>Quiz</span></div><div><b>${t.fail}</b><span>Projected fail</span></div><div><b class="${t.overdue ? "bad" : ""}">${t.overdue}</b><span>Overdue reminders</span></div></div>
              ${bar(t)}
              <div class="mg-leg"><span><b>${t.pass}</b> pass</span><span><b>${t.none}</b> no projection</span><span><b>${t.fail}</b> fail</span></div>
              <div class="mg-card-f"><small class="muted">${stale(t) ? "No summary yet" : `Updated ${esc(ago(t.at))}`}</small>${viewBtn(t)}</div>
            </div>`
          )
          .join("")}</div></div>
        <div>
          <div class="mg-panel"><h4 class="mg-h2">Needs attention</h4>${
            att.length ? att.map((a) => `<div class="mg-row"><span>${a.icon}</span><div>${esc(a.title)}${a.sub ? `<small>${esc(a.sub)}</small>` : ""}</div><span class="mg-t">${esc(a.tag)}</span></div>`).join("") : `<p class="muted">Nothing needs attention.</p>`
          }</div>
          <div class="mg-panel"><h4 class="mg-h2">Projection across all trainees</h4>${bar(all)}<div class="mg-leg"><span><b>${all.pass}</b> pass</span><span><b>${all.none}</b> none</span><span><b>${all.fail}</b> fail</span></div></div>
          <div class="mg-panel"><h4 class="mg-h2">Compare Trainers</h4>
            <div class="mg-tabs">${["qa", "speed", "quiz"].map((m) => `<button type="button" class="${m === metric ? "on" : ""}" data-mg-metric="${m}">${{ qa: "QA", speed: "Speed", quiz: "Quiz" }[m]}</button>`).join("")}</div>
            ${vals.length ? `<div class="mg-compare">${vals.map(({ t, v }) => `<span>${esc(nameOf(t))}</span><div class="mg-track"><i style="width:${Math.max(3, (v / max) * 100)}%"></i></div><b>${v}${metric === "speed" ? "" : "%"}</b>`).join("")}</div>${metric === "speed" ? `<p class="muted mg-note">Minutes per ticket; shorter is faster.</p>` : ""}` : `<p class="muted">No data yet.</p>`}
          </div></div>
      </div>`;
  }

  function trainersTable(list) {
    return `<div class="mg-table-wrap"><table class="mg-table"><thead><tr><th>Trainer</th><th>Cohorts</th><th>Active</th><th>QA</th><th>Speed</th><th>Quiz</th><th>Pass</th><th>Fail</th><th>Overdue</th><th>Updated</th><th></th></tr></thead><tbody>${list
      .map(
        (t) => `<tr><td class="mg-name">${avatar(t)} ${esc(nameOf(t))}</td><td>${t.cohorts.length}</td><td>${t.active}</td><td>${fmt(t.qa, "%")}</td><td>${fmt(t.speed)}</td><td>${fmt(t.quiz, "%")}</td><td>${t.pass}</td><td class="${t.fail ? "bad" : ""}">${t.fail}</td><td class="${t.overdue ? "bad" : ""}">${t.overdue}</td><td class="muted">${stale(t) ? "—" : esc(ago(t.at))}</td><td>${viewBtn(t)}</td></tr>`
      )
      .join("")}</tbody></table></div>`;
  }

  const cohortRows = (list) => list.flatMap((t) => t.cohorts.map((c) => ({ t, c }))).sort((a, b) => String(b.c.start || "").localeCompare(String(a.c.start || "")));
  function cohortsTable(list) {
    const rows = cohortRows(list);
    if (!rows.length) return `<p class="muted">No cohorts yet.</p>`;
    return `<div class="mg-table-wrap"><table class="mg-table"><thead><tr><th>Cohort</th><th>Trainer</th><th>Department</th><th>Starts</th><th>Status</th><th>Active</th><th>QA</th><th>Speed</th><th>Quiz</th><th>Pass</th><th>Fail</th></tr></thead><tbody>${rows
      .map(
        ({ t, c }) => `<tr><td><b>${esc(c.name)}</b></td><td>${esc(nameOf(t))}</td><td>${esc(c.department || "—")}</td><td>${esc(c.start || "—")}</td><td><span class="mg-pill">${esc(c.status || "")}</span></td><td>${c.active}${c.inactive ? ` <small class="muted">+${c.inactive} inactive</small>` : ""}</td><td>${fmt(pct(c.qa), "%")}</td><td>${fmt(mean(c.speed))}</td><td>${fmt(mean(c.quiz), "%")}</td><td>${c.pass}</td><td class="${c.fail ? "bad" : ""}">${c.fail}</td></tr>`
      )
      .join("")}</tbody></table></div>`;
  }

  function performance(list) {
    const metric = ui.metric;
    const label = { qa: "QA", speed: "Speed (min/ticket)", quiz: "Quiz" }[metric];
    const value = (c) => (metric === "qa" ? pct(c.qa) : metric === "speed" ? mean(c.speed) : mean(c.quiz));
    const rows = cohortRows(list).map(({ t, c }) => ({ t, c, v: value(c) })).filter((x) => x.v != null).sort((a, b) => (metric === "speed" ? a.v - b.v : b.v - a.v));
    const max = Math.max(...rows.map((x) => x.v), 1);
    return `<div class="mg-tabs mg-tabs-big">${["qa", "speed", "quiz"].map((m) => `<button type="button" class="${m === metric ? "on" : ""}" data-mg-metric="${m}">${{ qa: "QA", speed: "Speed", quiz: "Quiz" }[m]}</button>`).join("")}</div>
      <h4 class="mg-h2">${esc(label)} by cohort</h4>
      ${
        rows.length
          ? `<div class="mg-compare wide">${rows
              .map(({ t, c, v }) => {
                const goal = c.goals?.[metric];
                const met = goal > 0 ? (metric === "speed" ? v <= goal : v >= goal) : null;
                return `<span><b>${esc(c.name)}</b><small>${esc(nameOf(t))}</small></span><div class="mg-track"><i class="${met === false ? "bad" : ""}" style="width:${Math.max(3, (v / max) * 100)}%"></i></div><b>${v}${metric === "speed" ? "" : "%"}</b><small class="${met === false ? "bad" : "muted"}">${goal > 0 ? `goal ${goal}${metric === "speed" ? "" : "%"}` : ""}</small>`;
              })
              .join("")}</div>`
          : `<p class="muted">No ${esc(label)} data yet.</p>`
      }`;
  }

  // ---- Reports ----
  const csvCellM = (v) => {
    let t = v == null ? "" : String(v);
    if (typeof v === "string" && /^[=+@]|^-(?!\d)/.test(t)) t = `'${t}`;
    return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const tableRows = (kind, list) =>
    kind === "trainers"
      ? [["Trainer", "Cohorts", "Active trainees", "Inactive", "QA %", "Speed (min/ticket)", "Quiz %", "Projected pass", "No projection", "Projected fail", "Overdue reminders", "Updated"], ...list.map((t) => [nameOf(t), t.cohorts.length, t.active, t.inactive, t.qa ?? "", t.speed ?? "", t.quiz ?? "", t.pass, t.none, t.fail, t.overdue, t.at])]
      : [["Cohort", "Trainer", "Department", "Start date", "Status", "Active", "Inactive", "QA %", "Speed (min/ticket)", "Quiz %", "Projected pass", "No projection", "Projected fail"], ...cohortRows(list).map(({ t, c }) => [c.name, nameOf(t), c.department || "", c.start || "", c.status || "", c.active, c.inactive, pct(c.qa) ?? "", mean(c.speed) ?? "", mean(c.quiz) ?? "", c.pass, c.none, c.fail])];
  const toCsvM = (rows) => rows.map((r) => r.map(csvCellM).join(",")).join("\n");
  const toTsvM = (rows) => rows.map((r) => r.map((v) => String(v ?? "").replace(/[\t\n\r]+/g, " ")).join("\t")).join("\n");
  function reports(list) {
    return `<div class="mg-report">
      <p class="muted">Two reports built from what each Trainer has published. Copy pastes into any sheet; Export creates a Google Sheet in your Drive.</p>
      ${["trainers", "cohorts"]
        .map(
          (k) => `<section class="mg-panel"><h4 class="mg-h2">${k === "trainers" ? "Trainers summary" : "Cohorts summary"}</h4>
            <div class="mg-actions"><button type="button" class="btn" data-mg-copy="${k}">Copy</button><button type="button" class="btn-primary" data-mg-export="${k}">Export to Google Sheets</button><span class="sheet-status" data-mg-status="${k}" role="status">${esc(ui.msg[k] || "")}</span></div></section>`
        )
        .join("")}
    </div>`;
  }

  const ui = { metric: "qa", msg: {} };
  const insts = {}; // one open window per Training Manager app: kind -> { el, off }
  const TITLES = { overview: "Overview", trainers: "Trainers", cohorts: "Cohorts", performance: "Performance", reports: "Reports" };
  function draw(inst) {
    if (!inst?.el) return;
    const list = trainers();
    const body = empty(list) || { overview, trainers: trainersTable, cohorts: cohortsTable, performance, reports }[inst.kind](list);
    inst.el.innerHTML = `<div class="mg-root"><div class="mg-top"><div><h3>${esc(TITLES[inst.kind])}</h3><span class="muted">All Trainers · read-only</span></div></div>${body}</div>`;
  }
  const drawAll = () => Object.values(insts).forEach(draw);
  const statusEl = (kind) => insts[kind]?.el?.querySelector(`[data-mg-status="${kind}"]`);
  async function exportReport(kind) {
    const say = (m) => {
      ui.msg[kind] = m;
      const s = statusEl("reports");
      const el = s && s.closest(".mg-report")?.querySelector(`[data-mg-status="${kind}"]`);
      if (el) el.textContent = m;
    };
    const cc = window.CoachingCompass;
    if (!cc?.exportGoogleSheet) return say("Google Sheets export isn't available here.");
    say("Exporting…");
    try {
      const doc = await cc.exportGoogleSheet(`${kind === "trainers" ? "Trainers" : "Cohorts"} summary — ${new Date().toLocaleDateString()}`, toCsvM(tableRows(kind, trainers())));
      const el = insts.reports?.el?.querySelector(`[data-mg-status="${kind}"]`);
      if (el) el.innerHTML = doc.link ? `Exported · <a href="${esc(doc.link)}" target="_blank" rel="noopener noreferrer">Open sheet</a>` : "Exported to Google Sheets. Look for it in Drive.";
      ui.msg[kind] = "";
    } catch (e) {
      say(e?.cancelled ? "" : e?.message || "Couldn't export. Try again.");
    }
  }
  async function copyReport(kind) {
    const rows = tableRows(kind, trainers());
    const out = insts.reports?.el?.querySelector(`[data-mg-status="${kind}"]`);
    const ok = rows.length > 1 && (await copyText(toTsvM(rows)));
    if (out) out.textContent = rows.length < 2 ? "Nothing to copy yet." : ok ? `Copied ${rows.length - 1} row${rows.length === 2 ? "" : "s"}. Paste into a sheet.` : "Couldn't copy. Your browser blocked the clipboard.";
  }
  window.TrainerManager = {
    start,
    onChange: (f) => (listeners.add(f), () => listeners.delete(f)),
    trainers,
    loaded: () => loaded,
    render(el, kind) {
      insts[kind]?.off?.();
      const inst = (insts[kind] = { el, kind, off: null });
      el.classList.add("flush", "mg-host");
      start();
      el.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.mgView) return WS()?.viewAs({ id: b.dataset.mgView, base: b.dataset.mgBase });
        if (b.dataset.mgMetric) return void ((ui.metric = b.dataset.mgMetric), drawAll());
        if (b.dataset.mgCopy) return void copyReport(b.dataset.mgCopy);
        if (b.dataset.mgExport) return void exportReport(b.dataset.mgExport);
      });
      inst.off = window.TrainerManager.onChange(() => draw(inst));
      draw(inst);
    },
    onClose(kind) {
      insts[kind]?.off?.();
      delete insts[kind];
    },
  };
})();
