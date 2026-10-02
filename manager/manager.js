// ---------- Training Manager: every Trainer's numbers in one place ----------
// Each Trainer's dashboard writes a small summary of its own cohorts to trainers/<id> (see publishSummary in app.js):
//   summary { cohorts: [{ id, aid, name, department, start, status, trainees, passed, cpTrainees, cpPassed, active, inactive,
//                          resigned, terminated, pass, fail, none, qa:{pass,total}, speed:{sum,n}, quiz:{sum,n},
//                          goals:{qa,quiz,speed,attendance}, people:[…] }], overdue }
// The Training Manager reads those documents and shows them side by side. Names and photos come from the profiles of the ids
// in the directory; only ids are stored.
//   added/<id>        a Trainer profile the manager made: { id, name, user_id (optional link to a person), animal, hidden }
//   assignments/<id>  a class the manager created for a Trainer: { name, department, team_lead, training_start_date, trainer_ref }
//                     (trainer_ref is a profile id or a person's id); that Trainer's dashboard copies it into their Cohorts once.
(function () {
  const esc = (s) => escapeHtml(s == null ? "" : s);
  const WS = () => window.TrainerWS;
  const listeners = new Set();
  const notify = () => listeners.forEach((f) => { try { f(); } catch {} });
  const clone = (d) => JSON.parse(JSON.stringify(d || {}));
  let dir = []; // directory entries: [{ id, base, animal, summary, summary_at }]
  let added = []; // profiles the manager made
  let assigns = []; // classes the manager created
  let people = {}; // person id -> { name, avatarUrl, color }
  let loaded = false;
  let started = false;

  async function resolveNames() {
    const user = await window.TrainerUse("user");
    if (!user?.profiles) return;
    const ids = [...new Set([...dir.map((d) => d.id), ...added.map((p) => p.user_id).filter(Boolean)])];
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
    const watch = (name, set) =>
      db.collection(name).onSnapshot(
        (snap) => {
          set(snap.docs.map((d) => ({ id: d.id, ...clone(d.data()) })));
          loaded = true;
          notify();
          resolveNames();
        },
        () => ((loaded = true), notify())
      );
    // Entries from the first version of Add Trainer were just a person's id (no name, no link): treat that id as the link.
    watch("added", (v) => (added = v.map((p) => (p.user_id === undefined && p.name === undefined ? { ...p, user_id: p.id } : p))));
    watch("assignments", (v) => (assigns = v));
    watch("trainers", (v) => (dir = v));
  }

  // ---- Numbers ----
  const pct = (a) => (a && a.total ? Math.round((a.pass / a.total) * 100) : null);
  const mean = (a) => (a && a.n ? Math.round((a.sum / a.n) * 10) / 10 : null);
  const rate = (p, t) => (t ? Math.round((p / t) * 100) : null);
  const fmt = (v, unit = "") => (v == null ? "—" : `${v}${unit}`);
  const sum = (list, f) => list.reduce((n, x) => n + (f(x) || 0), 0);
  function rollup(cohorts) {
    const cs = cohorts || [];
    const pool = (k) => cs.reduce((a, c) => (c[k] ? { pass: a.pass + (c[k].pass || 0), total: a.total + (c[k].total || 0), sum: a.sum + (c[k].sum || 0), n: a.n + (c[k].n || 0) } : a), { pass: 0, total: 0, sum: 0, n: 0 });
    const qa = pool("qa"), sp = pool("speed"), qz = pool("quiz");
    const trainees = sum(cs, (c) => c.trainees), passed = sum(cs, (c) => c.passed), cpT = sum(cs, (c) => c.cpTrainees), cpP = sum(cs, (c) => c.cpPassed);
    return {
      count: cs.length,
      trainees,
      passed,
      passRate: rate(passed, trainees), // trainees who passed nesting, of everyone in the cohorts
      passRateC: rate(passed - cpP, trainees - cpT),
      passRateCp: rate(cpP, cpT),
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

  // ---- Trainers: the profiles a manager made, plus anyone who has opened the dashboard ----
  function trainers() {
    const claimed = new Set(added.map((p) => p.user_id).filter(Boolean));
    const raw = [
      ...added.filter((p) => !p.hidden).map((p) => ({ key: p.id, profile: p, uid: p.user_id || "", d: p.user_id ? dir.find((x) => x.id === p.user_id) : null })),
      ...dir.filter((d) => !claimed.has(d.id)).map((d) => ({ key: d.id, profile: null, uid: d.id, d })),
    ];
    return raw
      .map(({ key, profile, uid, d }) => {
        const cs = d?.summary?.cohorts || [];
        const p = people[uid] || {};
        return {
          id: key,
          uid,
          profile,
          base: d?.base || "own",
          animal: profile?.animal || d?.animal || "",
          name: profile?.name || p.name || "",
          avatar: p.avatarUrl || "",
          color: p.color || "",
          cohorts: cs,
          overdue: d?.summary?.overdue || 0,
          at: d?.summary_at || "",
          has: !!d?.summary,
          ...rollup(cs),
        };
      })
      .sort((a, b) => (a.name || "~").localeCompare(b.name || "~"));
  }
  const nameOf = (t) => t.name || "Trainer";
  const avatar = (t) => WS().avatarHtml({ animal: t.animal, photo: t.avatar, color: t.color, name: t.name }, "mg-av");
  const ago = (iso) => {
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (!iso || isNaN(m)) return "never";
    return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
  };

  // ---- Classes the manager creates (assignments) ----
  const idOf = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  async function saveAssignment(fields, id) {
    const db = await window.TrainerUse("db");
    if (!db) throw new Error("no db");
    const aid = id || idOf("a");
    const old = assigns.find((a) => a.id === aid);
    await db.doc(`assignments/${aid}`).set({ ...fields, created_by: old?.created_by || WS()?.id || "", created_at: old?.created_at || new Date().toISOString(), updated_at: new Date().toISOString() });
  }
  async function deleteAssignment(id) {
    const db = await window.TrainerUse("db");
    await db.doc(`assignments/${id}`).delete();
  }
  // Which Trainer (by person id) a class is for: its trainer_ref is a profile id or a person's id.
  function targetOf(a) {
    const profile = added.find((p) => p.id === a.trainer_ref);
    return profile ? profile.user_id || "" : a.trainer_ref || "";
  }

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

  // ---- Pieces ----
  const METRICS = { qa: "QA", speed: "Speed", quiz: "Quiz", passRate: "Pass rate" };
  const unitOf = (m) => (m === "speed" ? "" : "%");
  const bar = (t) => {
    const tot = t.pass + t.fail + t.none || 1;
    return `<div class="mg-bar" title="${t.pass} projected pass · ${t.none} no projection · ${t.fail} projected fail"><i class="pass" style="width:${(t.pass / tot) * 100}%"></i><i class="none" style="width:${(t.none / tot) * 100}%"></i><i class="fail" style="width:${(t.fail / tot) * 100}%"></i></div>`;
  };
  const kpi = (v, label, hint) => `<div class="mg-kpi"><div class="mg-v">${v}</div><div class="mg-l">${label}</div>${hint ? `<div class="mg-h">${hint}</div>` : ""}</div>`;
  const dots = (attr) => `<button type="button" class="square-btn kebab" ${attr} title="Options" aria-label="Options">⋮</button>`;
  const empty = (list) =>
    !loaded
      ? `<p class="muted">Loading Trainers…</p>`
      : !list.length
        ? `<p class="muted">No Trainers yet. Use + Add Trainer, or wait for Trainers to open the dashboard.</p>`
        : "";
  const passHint = (r) => (r.trainees ? `${r.passed} of ${r.trainees} passed nesting${r.passRateC != null && r.passRateCp != null ? ` · C ${r.passRateC}% · CP ${r.passRateCp}%` : ""}` : "");
  const tabs = (current, attr) => `<div class="mg-tabs">${Object.entries(METRICS).map(([k, l]) => `<button type="button" class="${k === current ? "on" : ""}" ${attr}="${k}">${l}</button>`).join("")}</div>`;

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
        ${kpi(fmt(all.passRate, "%"), "Pass rate", passHint(all))}
        ${kpi(fmt(all.qa, "%"), "Avg QA")}
        ${kpi(fmt(all.speed), "Avg speed (min/ticket)")}
        ${kpi(fmt(all.quiz, "%"), "Avg quiz score")}
        ${kpi(all.fail, "Projected to fail", `of ${all.active + all.inactive} trainees`)}
      </div>
      <div class="mg-grid">
        <div><h4 class="mg-h2">Trainers</h4><div class="mg-cards">${list
          .map(
            (t) => `<div class="mg-card">
              <div class="mg-card-h">${avatar(t)}<div><b>${esc(nameOf(t))}</b><small>${esc(t.cohorts.map((c) => c.name).join(" · ") || (t.has ? "No cohorts yet" : "Hasn't opened the dashboard yet"))}</small></div>
                <span class="mg-pill ${t.fail ? "bad" : "ok"}">${t.fail ? `${t.fail} projected to fail` : "On track"}</span>${dots(`data-mg-menu="${esc(t.id)}"`)}</div>
              <div class="mg-m mg-m4"><div><b>${t.active}</b><span>Active</span></div><div><b>${fmt(t.passRate, "%")}</b><span>Pass rate</span></div><div><b>${fmt(t.qa, "%")}</b><span>QA</span></div><div><b>${fmt(t.speed)}</b><span>Speed</span></div></div>
              <div class="mg-m"><div><b>${fmt(t.quiz, "%")}</b><span>Quiz</span></div><div><b>${t.fail}</b><span>Projected fail</span></div><div><b class="${t.overdue ? "bad" : ""}">${t.overdue}</b><span>Overdue reminders</span></div></div>
              ${bar(t)}
              <div class="mg-leg"><span><b>${t.pass}</b> projected pass</span><span><b>${t.none}</b> none</span><span><b>${t.fail}</b> projected fail</span></div>
              <div class="mg-card-f"><small class="muted">${t.has ? `Updated ${esc(ago(t.at))}` : "No summary yet"}</small><button type="button" class="btn btn-small" data-mg-open="${esc(t.id)}">Open</button></div>
            </div>`
          )
          .join("")}</div></div>
        <div>
          <div class="mg-panel"><h4 class="mg-h2">Needs attention</h4>${
            att.length ? att.map((a) => `<div class="mg-row"><span>${a.icon}</span><div>${esc(a.title)}${a.sub ? `<small>${esc(a.sub)}</small>` : ""}</div><span class="mg-t">${esc(a.tag)}</span></div>`).join("") : `<p class="muted">Nothing needs attention.</p>`
          }</div>
          <div class="mg-panel"><h4 class="mg-h2">Projection across all trainees</h4>${bar(all)}<div class="mg-leg"><span><b>${all.pass}</b> pass</span><span><b>${all.none}</b> none</span><span><b>${all.fail}</b> fail</span></div></div>
          <div class="mg-panel"><h4 class="mg-h2">Compare Trainers</h4>
            ${tabs(metric, "data-mg-metric")}
            ${vals.length ? `<div class="mg-compare">${vals.map(({ t, v }) => `<span>${esc(nameOf(t))}</span><div class="mg-track"><i style="width:${Math.max(3, (v / max) * 100)}%"></i></div><b>${v}${unitOf(metric)}</b>`).join("")}</div>${metric === "speed" ? `<p class="muted mg-note">Minutes per ticket; shorter is faster.</p>` : ""}` : `<p class="muted">No data yet.</p>`}
          </div></div>
      </div>`;
  }

  // The class a Trainer is running now: cohorts in training (not completed); else the next one coming up.
  const currentClass = (t) => {
    const active = t.cohorts.filter((c) => c.status === "active").map((c) => c.name);
    if (active.length) return esc(active.join(", "));
    const next = t.cohorts.filter((c) => c.status === "upcoming").sort((x, y) => String(x.start).localeCompare(String(y.start)))[0];
    return next ? `<span class="muted">${esc(next.name)} (upcoming)</span>` : `<span class="muted">—</span>`;
  };
  function trainersTable(list) {
    return `<div class="mg-table-wrap"><table class="mg-table"><thead><tr><th>Trainer</th><th>Current class</th><th>Cohorts</th><th>Active</th><th>Pass rate</th><th>QA</th><th>Speed</th><th>Quiz</th><th>Projected pass</th><th>Projected fail</th><th>Overdue</th><th>Updated</th><th></th><th></th></tr></thead><tbody>${list
      .map(
        (t) => `<tr><td class="mg-name">${avatar(t)} ${esc(nameOf(t))}${t.has ? "" : ` <small class="muted">not opened yet</small>`}</td><td>${currentClass(t)}</td><td>${t.cohorts.length}</td><td>${t.active}</td><td>${fmt(t.passRate, "%")}</td><td>${fmt(t.qa, "%")}</td><td>${fmt(t.speed)}</td><td>${fmt(t.quiz, "%")}</td><td>${t.pass}</td><td class="${t.fail ? "bad" : ""}">${t.fail}</td><td class="${t.overdue ? "bad" : ""}">${t.overdue}</td><td class="muted">${t.has ? esc(ago(t.at)) : "—"}</td><td><button type="button" class="btn btn-small" data-mg-open="${esc(t.id)}">Open</button></td><td>${dots(`data-mg-menu="${esc(t.id)}"`)}</td></tr>`
      )
      .join("")}</tbody></table></div>`;
  }

  // Cohorts from every Trainer, plus classes the manager created that the Trainer hasn't opened yet.
  function cohortRows(list) {
    const rows = list.flatMap((t) => t.cohorts.map((c) => ({ t, c })));
    const importedIds = new Set(rows.map((r) => r.c.aid).filter(Boolean));
    const pending = assigns
      .filter((a) => !importedIds.has(a.id))
      .map((a) => ({ t: list.find((x) => x.id === a.trainer_ref) || list.find((x) => x.uid && x.uid === targetOf(a)) || { id: a.trainer_ref, name: "", cohorts: [] }, a, c: { id: a.id, aid: a.id, name: a.name, department: a.department, start: a.training_start_date, status: "waiting", pending: true } }));
    return [...rows, ...pending].sort((x, y) => String(y.c.start || "").localeCompare(String(x.c.start || "")));
  }
  function cohortsTable(list) {
    const rows = cohortRows(list);
    if (!rows.length) return `<p class="muted">No cohorts yet. Use + Add Class to create one for a Trainer.</p>`;
    return `<div class="mg-table-wrap"><table class="mg-table"><thead><tr><th>Cohort</th><th>Trainer</th><th>Department</th><th>Starts</th><th>Status</th><th>Active</th><th>Pass rate</th><th>QA</th><th>Speed</th><th>Quiz</th><th>Projected pass</th><th>Projected fail</th><th></th></tr></thead><tbody>${rows
      .map(({ t, c, a }) => {
        const managed = assigns.find((x) => x.id === c.aid);
        const status = c.pending ? `<span class="mg-pill warn">Waiting for Trainer</span>` : `<span class="mg-pill">${esc(c.status || "")}</span>`;
        const tail = c.pending
          ? `<td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td>`
          : `<td>${c.active}${c.inactive ? ` <small class="muted">+${c.inactive} inactive</small>` : ""}</td><td>${fmt(rate(c.passed, c.trainees), "%")}</td><td>${fmt(pct(c.qa), "%")}</td><td>${fmt(mean(c.speed))}</td><td>${fmt(mean(c.quiz), "%")}</td><td>${c.pass}</td><td class="${c.fail ? "bad" : ""}">${c.fail}</td>`;
        return `<tr><td><b>${esc(c.name)}</b>${managed ? ` <small class="muted">assigned</small>` : ""}</td><td>${esc(nameOf(t))}</td><td>${esc(c.department || "—")}</td><td>${esc(c.start || "—")}</td><td>${status}</td>${tail}<td>${managed ? dots(`data-mg-class-menu="${esc(managed.id)}"`) : ""}</td></tr>`;
      })
      .join("")}</tbody></table></div>`;
  }

  function performance(list) {
    const metric = ui.metric;
    const label = { qa: "QA", speed: "Speed (min/ticket)", quiz: "Quiz", passRate: "Pass rate" }[metric];
    const value = (c) => (metric === "qa" ? pct(c.qa) : metric === "speed" ? mean(c.speed) : metric === "quiz" ? mean(c.quiz) : rate(c.passed, c.trainees));
    const rows = list.flatMap((t) => t.cohorts.map((c) => ({ t, c, v: value(c) }))).filter((x) => x.v != null).sort((a, b) => (metric === "speed" ? a.v - b.v : b.v - a.v));
    const max = Math.max(...rows.map((x) => x.v), 1);
    return `${tabs(metric, "data-mg-metric").replace("mg-tabs", "mg-tabs mg-tabs-big")}
      <h4 class="mg-h2">${esc(label)} by cohort</h4>
      ${
        rows.length
          ? `<div class="mg-compare wide">${rows
              .map(({ t, c, v }) => {
                const goal = c.goals?.[metric];
                const met = goal > 0 ? (metric === "speed" ? v <= goal : v >= goal) : null;
                return `<span><b>${esc(c.name)}</b><small>${esc(nameOf(t))}</small></span><div class="mg-track"><i class="${met === false ? "bad" : ""}" style="width:${Math.max(3, (v / max) * 100)}%"></i></div><b>${v}${unitOf(metric)}</b><small class="${met === false ? "bad" : "muted"}">${goal > 0 ? `goal ${goal}${unitOf(metric)}` : ""}</small>`;
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
      ? [["Trainer", "Cohorts", "Active trainees", "Inactive", "Pass rate %", "QA %", "Speed (min/ticket)", "Quiz %", "Projected pass", "No projection", "Projected fail", "Overdue reminders", "Updated"], ...list.map((t) => [nameOf(t), t.cohorts.length, t.active, t.inactive, t.passRate ?? "", t.qa ?? "", t.speed ?? "", t.quiz ?? "", t.pass, t.none, t.fail, t.overdue, t.at])]
      : [["Cohort", "Trainer", "Department", "Start date", "Status", "Active", "Inactive", "Pass rate %", "QA %", "Speed (min/ticket)", "Quiz %", "Projected pass", "No projection", "Projected fail"], ...cohortRows(list).filter((r) => !r.c.pending).map(({ t, c }) => [c.name, nameOf(t), c.department || "", c.start || "", c.status || "", c.active, c.inactive, rate(c.passed, c.trainees) ?? "", pct(c.qa) ?? "", mean(c.speed) ?? "", mean(c.quiz) ?? "", c.pass, c.none, c.fail])];
  const toCsvM = (rows) => rows.map((r) => r.map(csvCellM).join(",")).join("\n");
  const toTsvM = (rows) => rows.map((r) => r.map((v) => String(v ?? "").replace(/[\t\n\r]+/g, " ")).join("\t")).join("\n");
  function reports() {
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

  // ---- A Trainer's window: their cohorts and trainees, read-only, as a window on the manager's desktop ----
  const TS = { pass: ["Projected to pass", "ok"], fail: ["Projected to fail", "bad"], resigned: ["Resigned", "warn"], terminated: ["Terminated", "dark"] };
  const goalClass = (v, goal, dir) => (goal == null || goal === "" || v == null ? "" : (dir === "min" ? v >= goal : v <= goal) ? "met" : "miss");
  function trainerWindowHtml(t) {
    if (!t) return `<p class="muted">This Trainer isn't in the list any more.</p>`;
    const head = `<div class="mg-tw-head">${avatar(t)}<div><b>${esc(nameOf(t))}</b><small class="muted">Read-only · ${t.has ? `updated ${esc(ago(t.at))}` : "hasn't published yet"}</small></div></div>`;
    if (!t.has) return `${head}<p class="muted">${esc(nameOf(t))} hasn't opened the dashboard yet, so there's nothing to show. Their cohorts and trainees appear here after they do.</p>`;
    const kp = `<div class="mg-kpis mg-kpis-sm">${kpi(t.active, "Active trainees", `${t.inactive} inactive`)}${kpi(fmt(t.passRate, "%"), "Pass rate", passHint(t))}${kpi(fmt(t.qa, "%"), "QA")}${kpi(fmt(t.speed), "Speed")}${kpi(fmt(t.quiz, "%"), "Quiz")}${kpi(t.fail, "Projected fail", `${t.pass} projected pass`)}${kpi(t.overdue, "Overdue reminders")}</div>`;
    const cohort = (c) => {
      const g = c.goals || {};
      const chip = (label, v, goal, dir, unit) => `<span class="mg-chip ${goalClass(v, goal, dir)}">${label} ${fmt(v, unit)}${goal != null ? ` <small>goal ${dir === "min" ? "≥" : "≤"} ${goal}${unit}</small>` : ""}</span>`;
      const rows = (c.people || [])
        .slice()
        .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name))
        .map((p) => {
          const st = TS[p.ts];
          return `<tr class="${p.active ? "" : "is-inactive"}"><td>${esc(p.name)}</td><td>${p.active ? "Active" : "Inactive"}</td><td>${st ? `<span class="tstatus ts-${esc(p.ts)}">${esc(st[0])}${p.auto ? " <small>auto</small>" : ""}</span>` : `<span class="muted">—</span>`}</td><td>${p.nest ? "Passed" : "—"}</td><td class="${goalClass(p.qa, g.qa, "min")}">${fmt(p.qa, "%")}</td><td class="${goalClass(p.speed, g.speed, "max")}">${fmt(p.speed)}</td><td class="${goalClass(p.quiz, g.quiz, "min")}">${fmt(p.quiz, "%")}</td><td class="${goalClass(p.att, g.attendance, "max")}">${fmt(p.att)}</td></tr>`;
        })
        .join("");
      return `<section class="mg-panel"><div class="mg-cohort-h"><b>${esc(c.name)}</b><span class="muted">${esc([c.department, c.start && `starts ${c.start}`, c.status].filter(Boolean).join(" · "))}</span></div>
        <div class="mg-chips"><span class="mg-chip">Pass rate ${fmt(rate(c.passed, c.trainees), "%")}</span>${chip("QA", pct(c.qa), g.qa, "min", "%")}${chip("Speed", mean(c.speed), g.speed, "max", "")}${chip("Quiz", mean(c.quiz), g.quiz, "min", "%")}</div>
        ${rows ? `<div class="mg-table-wrap"><table class="mg-table"><thead><tr><th>Trainee</th><th>Status</th><th>Projection</th><th>Nesting</th><th>QA</th><th>Speed</th><th>Quiz</th><th>Attendance pts</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p class="muted">No trainees in this cohort.</p>`}</section>`;
    };
    return `${head}${kp}${t.cohorts.length ? t.cohorts.map(cohort).join("") : `<p class="muted">No cohorts yet.</p>`}`;
  }
  const windows = {}; // app key -> unsubscribe
  function openTrainerWindow(id) {
    const key = `mgt_${id}`;
    const t0 = trainers().find((x) => x.id === id);
    const title = `${t0 ? nameOf(t0) : "Trainer"} · Trainer`;
    if (typeof APPS !== "undefined" && !APPS[key]) {
      APPS[key] = {
        title,
        icon: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
        color: "#3b82f6",
        custom: true,
        render(el) {
          el.classList.add("flush", "mg-host");
          const paint = () => (el.innerHTML = `<div class="mg-root">${trainerWindowHtml(trainers().find((x) => x.id === id))}</div>`);
          paint();
          windows[key]?.();
          windows[key] = window.TrainerManager.onChange(paint);
        },
        onClose() {
          windows[key]?.();
          delete windows[key];
        },
      };
    }
    if (typeof APPS !== "undefined" && APPS[key]) APPS[key].title = title;
    start();
    openApp(key);
  }

  // ---- A Trainer profile: add, edit, delete ----
  const sheetIn = (el, html) => {
    const win = el.closest(".window");
    if (!win || win.querySelector(".sheet")) return null;
    const sheet = document.createElement("div");
    sheet.className = "sheet";
    sheet.innerHTML = `<form class="sheet-card" novalidate>${html}</form>`;
    win.appendChild(sheet);
    const close = () => sheet.remove();
    sheet.addEventListener("keydown", (e) => e.key === "Escape" && close());
    sheet.querySelector("form").addEventListener("submit", (e) => e.preventDefault());
    sheet.querySelectorAll("[data-cancel]").forEach((b) => b.addEventListener("click", close));
    return { sheet, close };
  };
  // Add Trainer / Edit: a profile (name, optional link to a person, avatar).
  function openProfile(el, t) {
    const animals = WS().animals;
    const st = { name: t?.name || "", uid: t?.uid || "", animal: t?.profile?.animal || (t?.profile ? "" : t?.animal || "") };
    const ui2 = sheetIn(
      el,
      `<h3>${t ? "Edit Trainer" : "Add Trainer"}</h3>
      <label class="field"><span>Name</span><input id="mg-p-name" type="text" placeholder="e.g. Maya Santos" value="${esc(st.name)}" autocomplete="off" /></label>
      <div class="field"><span>Linked account <small class="muted">(optional)</small></span>
        <div id="mg-p-link" class="mg-link"></div>
        <input id="mg-p-q" type="search" placeholder="Search to link their dashboard account" autocomplete="off" />
        <div id="mg-p-hits" class="mg-hits"></div></div>
      <div class="field"><span>Avatar</span><div class="animal-grid" id="mg-p-animals">${animals.map((a) => `<button type="button" class="animal" data-animal="${a.key}" style="background:${a.bg}" title="${esc(a.label)}" aria-label="${esc(a.label)}">${a.emoji}</button>`).join("")}<button type="button" class="animal-none" data-animal="">None</button></div></div>
      <p class="muted mg-add-note">Linking connects this profile to the person's own dashboard, so their cohorts and numbers show here. They also need Contributor access through Share to save their own data.</p>
      <p class="sheet-status" id="mg-p-status" role="status"></p>
      <div class="sheet-actions"><button type="button" class="btn" data-cancel>Cancel</button><button type="submit" class="btn-primary">${t ? "Save" : "Add Trainer"}</button></div>`
    );
    if (!ui2) return;
    const { sheet, close } = ui2;
    const q = (s) => sheet.querySelector(s);
    const paint = async () => {
      q("#mg-p-animals").querySelectorAll("[data-animal]").forEach((b) => b.classList.toggle("is-on", b.dataset.animal === st.animal));
      const link = q("#mg-p-link");
      if (!st.uid) link.innerHTML = `<small class="muted">Not linked</small>`;
      else {
        const user = await window.TrainerUse("user");
        const ps = user?.profiles ? await user.profiles([st.uid]) : {};
        link.innerHTML = `<span class="mg-link-name"></span> <button type="button" class="btn btn-small" data-unlink>Unlink</button>`;
        link.querySelector(".mg-link-name").textContent = ps[st.uid]?.name || "Linked";
      }
    };
    paint();
    q("#mg-p-name").addEventListener("input", (e) => (st.name = e.target.value));
    q("#mg-p-animals").addEventListener("click", (e) => {
      const b = e.target.closest("[data-animal]");
      if (b) {
        st.animal = b.dataset.animal;
        paint();
      }
    });
    q("#mg-p-link").addEventListener("click", (e) => {
      if (e.target.closest("[data-unlink]")) {
        st.uid = "";
        paint();
      }
    });
    let timer = null;
    q("#mg-p-q").addEventListener("input", (e) => {
      clearTimeout(timer);
      const text = e.target.value.trim();
      timer = setTimeout(async () => {
        const hits = q("#mg-p-hits");
        if (!text) return void (hits.innerHTML = "");
        const user = await window.TrainerUse("user");
        const found = user?.search ? await user.search(text) : [];
        hits.innerHTML = found.length ? found.map((h) => `<div class="mg-hit"><span class="mg-hit-name"></span><button type="button" class="btn btn-small" data-pick="${esc(h.id)}">Link</button></div>`).join("") : `<p class="muted">Nobody found.</p>`;
        hits.querySelectorAll(".mg-hit-name").forEach((n, i) => (n.textContent = found[i].name || "Someone"));
      }, 250);
    });
    q("#mg-p-hits").addEventListener("click", (e) => {
      const b = e.target.closest("[data-pick]");
      if (!b) return;
      st.uid = b.dataset.pick;
      if (!st.name.trim()) {
        st.name = b.closest(".mg-hit").querySelector(".mg-hit-name").textContent;
        q("#mg-p-name").value = st.name;
      }
      q("#mg-p-hits").innerHTML = "";
      q("#mg-p-q").value = "";
      paint();
    });
    sheet.querySelector("form").addEventListener("submit", async () => {
      const status = q("#mg-p-status");
      if (!st.name.trim()) return void (status.textContent = "Give the Trainer a name.");
      status.textContent = "Saving…";
      try {
        const db = await window.TrainerUse("db");
        // A Trainer who only has a directory entry gets a profile whose id is their person id.
        const id = t?.profile?.id || (t?.uid ? t.uid : idOf("p"));
        await db.doc(`added/${id}`).set({ id, name: st.name.trim(), user_id: st.uid || "", animal: st.animal || "", hidden: false, added_by: t?.profile?.added_by || WS()?.id || "", added_at: t?.profile?.added_at || new Date().toISOString(), updated_at: new Date().toISOString() });
        close();
      } catch {
        status.textContent = "Couldn't save. Try again.";
      }
    });
    q("#mg-p-name").focus();
  }
  function openDeleteTrainer(el, t) {
    const ui2 = sheetIn(
      el,
      `<h3>Delete Trainer</h3>
      <p>Remove <b class="mg-del-name"></b> from the Training Manager?</p>
      <p class="muted mg-add-note">Their own dashboard and data are not touched. Classes you assigned to them stay as they are.</p>
      <p class="sheet-status" id="mg-d-status" role="status"></p>
      <div class="sheet-actions"><button type="button" class="btn" data-cancel>Cancel</button><button type="submit" class="btn-danger">Delete</button></div>`
    );
    if (!ui2) return;
    ui2.sheet.querySelector(".mg-del-name").textContent = nameOf(t);
    ui2.sheet.querySelector("form").addEventListener("submit", async () => {
      const status = ui2.sheet.querySelector("#mg-d-status");
      status.textContent = "Removing…";
      try {
        const db = await window.TrainerUse("db");
        // A profile with nobody linked just goes. Anyone who has their own dashboard is hidden instead, so they don't reappear.
        if (t.profile && !t.profile.user_id) await db.doc(`added/${t.profile.id}`).delete();
        else {
          const id = t.profile?.id || t.uid;
          await db.doc(`added/${id}`).set({ ...(t.profile || {}), id, user_id: t.uid || t.profile?.user_id || "", hidden: true, updated_at: new Date().toISOString() });
        }
        ui2.close();
      } catch {
        status.textContent = "Couldn't delete. Try again.";
      }
    });
  }
  function openDeleteClass(el, a) {
    const ui2 = sheetIn(
      el,
      `<h3>Delete class</h3>
      <p>Delete <b class="mg-del-name"></b>?</p>
      <p class="muted mg-add-note">If the Trainer has already opened it, their copy in Cohorts stays.</p>
      <p class="sheet-status" id="mg-d-status" role="status"></p>
      <div class="sheet-actions"><button type="button" class="btn" data-cancel>Cancel</button><button type="submit" class="btn-danger">Delete</button></div>`
    );
    if (!ui2) return;
    ui2.sheet.querySelector(".mg-del-name").textContent = a.name || "this class";
    ui2.sheet.querySelector("form").addEventListener("submit", async () => {
      try {
        await deleteAssignment(a.id);
        ui2.close();
      } catch {
        ui2.sheet.querySelector("#mg-d-status").textContent = "Couldn't delete. Try again.";
      }
    });
  }
  function trainerMenu(anchor, id, inst) {
    const t = trainers().find((x) => x.id === id);
    if (!t || typeof openMenu !== "function") return;
    openMenu(anchor, [
      { label: "Edit", run: () => openProfile(inst.el, t) },
      { label: "Delete", danger: true, run: () => openDeleteTrainer(inst.el, t) },
    ]);
  }
  function classMenu(anchor, id, inst) {
    const a = assigns.find((x) => x.id === id);
    if (!a || typeof openMenu !== "function") return;
    openMenu(anchor, [
      { label: "Edit", run: () => openAddClass(inst.el, a.id, { assign: true, assignment: a }) },
      { label: "Delete", danger: true, run: () => openDeleteClass(inst.el, a) },
    ]);
  }

  // ---- The apps ----
  const ui = { metric: "qa", msg: {} };
  const insts = {}; // one open window per Training Manager app: kind -> { el, off }
  const TITLES = { overview: "Overview", trainers: "Trainers", cohorts: "Cohorts", performance: "Performance", reports: "Reports" };
  function draw(inst) {
    if (!inst?.el) return;
    const list = trainers();
    const raw = inst.kind === "cohorts" ? (loaded ? cohortsTable(list) : `<p class="muted">Loading…</p>`) : empty(list) || { overview, trainers: trainersTable, performance, reports }[inst.kind](list);
    const action = inst.kind === "trainers" ? `<button type="button" class="btn-primary" data-mg-add-open>+ Add Trainer</button>` : inst.kind === "cohorts" ? `<button type="button" class="btn-primary" data-mg-add-class>+ Add Class</button>` : "";
    inst.el.innerHTML = `<div class="mg-root"><div class="mg-top"><div><h3>${esc(TITLES[inst.kind])}</h3><span class="muted">All Trainers · read-only</span></div>${action}</div>${raw}</div>`;
  }
  const drawAll = () => Object.values(insts).forEach(draw);
  async function exportReport(kind) {
    const say = (m) => {
      ui.msg[kind] = m;
      const el = insts.reports?.el?.querySelector(`[data-mg-status="${kind}"]`);
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
    // For the Add Class form: the Trainers a class can be assigned to.
    trainerOptions: () => trainers().map((t) => ({ ref: t.id, name: nameOf(t) })),
    assignments: () => assigns.slice(),
    // Classes made for this person (by person id), for their own dashboard to copy into Cohorts.
    assignmentsFor: (uid) => assigns.filter((a) => uid && targetOf(a) === uid),
    saveAssignment,
    deleteAssignment,
    render(el, kind) {
      insts[kind]?.off?.();
      const inst = (insts[kind] = { el, kind, off: null });
      el.classList.add("flush", "mg-host");
      start();
      el.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.mgOpen) return openTrainerWindow(b.dataset.mgOpen);
        if (b.dataset.mgMenu) return trainerMenu(b, b.dataset.mgMenu, inst);
        if (b.dataset.mgClassMenu) return classMenu(b, b.dataset.mgClassMenu, inst);
        if ("mgAddOpen" in b.dataset) return openProfile(el, null);
        if ("mgAddClass" in b.dataset) return openAddClass(el, null, { assign: true });
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
