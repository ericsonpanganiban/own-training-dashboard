// The agent scorecard as HTML, from a plain data object (see collect() in agentview.js for its shape). Pure: no page
// globals, so the same code runs inside the dashboard preview and on the standalone agent page.
(function (root) {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (v) => String(Math.round(v * 100) / 100);
  const dshort = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "");
  const chip = (met) => (met == null ? "" : `<span class="ag-chip ${met ? "ok" : "no"}">${met ? "Goal met" : "Below goal"}</span>`);
  const stat = (label, value, hint, met) => `<div class="ag-stat"><div class="ag-v">${value}</div><div class="ag-l">${esc(label)}</div><div class="ag-h">${hint || ""}</div>${chip(met)}</div>`;

  function html(d) {
    const g = d.goals || {};
    const qa = d.qa || { pass: 0, total: 0, weeks: [] };
    const sp = d.speed || { avg: null, weeks: [] };
    const qz = d.quiz || null;
    const spot = d.spot || { avg: null, count: 0, items: [] };
    const att = d.att || { points: null, graded: 0, late: [] };
    const qaPct = qa.total ? (qa.pass / qa.total) * 100 : null;
    const quizAvg = qz && qz.taken ? (qz.weighted != null ? qz.weighted : qz.avg) : null;
    const stats = [
      stat("Attendance points", att.points == null ? "—" : num(att.points), g.attendance != null ? `0 is best · goal at most ${num(g.attendance)}` : "0 is best", att.points == null || g.attendance == null ? null : att.points <= g.attendance),
      stat("QA score", qaPct == null ? "—" : `${Math.round(qaPct)}%`, qa.total ? `${num(qa.pass)} of ${qa.total} audits passed${g.qa != null ? ` · goal ${num(g.qa)}%` : ""}` : "no audits yet", qaPct == null || g.qa == null ? null : qaPct >= g.qa),
      stat("Speed", sp.avg == null ? "—" : num(sp.avg), sp.avg == null ? "no Speed yet" : `min per ticket, lower is faster${g.speed != null ? ` · goal ${num(g.speed)}` : ""}`, sp.avg == null || g.speed == null ? null : sp.avg <= g.speed),
      stat("Quiz average", quizAvg == null ? "—" : `${quizAvg}%`, qz ? (qz.taken ? `${qz.taken} quiz${qz.taken === 1 ? "" : "zes"} taken` : "no quizzes yet") : "loading…", quizAvg == null || g.quiz == null ? null : quizAvg >= g.quiz),
      stat("Spot checks", spot.avg == null ? "—" : `${num(spot.avg)}%`, spot.count ? `${spot.count} spot check${spot.count === 1 ? "" : "s"}${g.spot != null ? ` · goal ${num(g.spot)}%` : ""}` : "none yet", spot.avg == null || g.spot == null ? null : spot.avg >= g.spot),
    ].join("");

    const goalRow = (label, goal, shown, met, unit, dir) => `<tr><td><b>${esc(label)}</b></td><td>${goal == null ? `<span class="ag-empty">Not set</span>` : `${dir} ${num(goal)}${unit}`}</td><td>${shown}</td><td>${met == null ? "—" : `<span class="ag-chip ${met ? "ok" : "no"}">${met ? "Goal met" : "Below goal"}</span>`}</td></tr>`;
    const goalRows = [
      goalRow("QA score", g.qa, qaPct == null ? "—" : `${Math.round(qaPct)}%`, qaPct == null || g.qa == null ? null : qaPct >= g.qa, "%", "at least"),
      goalRow("Speed (min per ticket)", g.speed, sp.avg == null ? "—" : num(sp.avg), sp.avg == null || g.speed == null ? null : sp.avg <= g.speed, "", "at most"),
      goalRow("Attendance points", g.attendance, att.points == null ? "—" : num(att.points), att.points == null || g.attendance == null ? null : att.points <= g.attendance, "", "at most"),
      goalRow("Quiz average", g.quiz, quizAvg == null ? "—" : `${quizAvg}%`, quizAvg == null || g.quiz == null ? null : quizAvg >= g.quiz, "%", "at least"),
      goalRow("Spot checks", g.spot, spot.avg == null ? "—" : `${num(spot.avg)}%`, spot.avg == null || g.spot == null ? null : spot.avg >= g.spot, "%", "at least"),
    ].join("");
    const anyGoal = ["qa", "speed", "attendance", "quiz", "spot"].some((k) => g[k] != null);
    const who = [d.lead ? `Team lead: <b>${esc(d.lead)}</b>` : "", d.dept ? `Department: <b>${esc(d.dept)}</b>` : ""].filter(Boolean).join(" · ");

    const qaRows = qa.weeks.map((w) => {
      const pct = w.total ? (w.pass / w.total) * 100 : null;
      return `<tr><td><b>Week ${esc(w.week)}</b></td><td class="${g.qa != null && pct != null ? (pct >= g.qa ? "ag-ok" : "ag-no") : ""}">${pct == null ? "—" : `<b>${Math.round(pct)}%</b> <small>${num(w.pass)} of ${w.total}</small>`}</td><td>${(w.strengths || []).length ? `<div><span class="ag-tag good">Doing well</span> ${w.strengths.map(esc).join(" · ")}</div>` : ""}${(w.issues || []).length ? `<div><span class="ag-tag watch">To work on</span> ${w.issues.map(esc).join(" · ")}</div>` : ""}</td></tr>`;
    }).join("");
    const spRows = sp.weeks.map((w) => `<tr><td><b>Week ${esc(w.week)}</b></td><td class="${g.speed != null && w.value != null ? (w.value <= g.speed ? "ag-ok" : "ag-no") : ""}"><b>${w.value == null ? "—" : num(w.value)}</b></td><td>${num(w.hours)} h</td><td>${num(w.tickets)} tickets</td></tr>`).join("");
    const quizRows = qz && (qz.items || []).length
      ? `<table class="ag-table"><thead><tr><th>Quiz</th><th>Score</th><th>Passing</th></tr></thead><tbody>${qz.items.map((x) => `<tr><td>${esc(x.title)}${x.week ? ` <small>Week ${esc(x.week)}</small>` : ""}${(x.answers || []).length ? `<details class="ag-ans"><summary>See your answers (${x.answers.filter((a) => a.ok === true).length} of ${x.answers.length} correct)</summary>${x.answers.map((a, i) => `<div class="ag-a ${a.ok === true ? "ok" : a.ok === false ? "no" : ""}"><p><b>${i + 1}. ${esc(a.q)}</b></p><p>Your answer: ${a.a ? esc(a.a) : "<i>no answer</i>"} <span class="ag-chip ${a.ok === true ? "ok" : a.ok === false ? "no" : "plain"}">${a.ok === true ? "Correct" : a.ok === false ? "Missed" : "Awaiting review"}</span></p>${a.ok === false && a.key ? `<p class="ag-key">Correct answer: ${esc(a.key)}</p>` : ""}</div>`).join("")}</details>` : ""}</td><td class="${x.pct >= x.passing ? "ag-ok" : "ag-no"}"><b>${esc(x.pct)}%</b></td><td>${esc(x.passing)}%</td></tr>`).join("")}</tbody></table>`
      : `<p class="ag-empty">${qz ? "No quiz results yet." : "Quiz results aren't available right now."}</p>`;
    const spotRows = spot.items.map((x) => `<div class="ag-spot"><div class="ag-spot-top"><b>${num(Number(x.score))}%</b> <small>${esc(dshort(x.date))}${/^https?:\/\//i.test(x.ticket || "") ? ` · <a href="${esc(x.ticket)}" target="_blank" rel="noopener noreferrer">Open ticket</a>` : ""}</small><span class="ag-chip ${x.ack === "ack" ? "ok" : "plain"}">${x.ack === "ack" ? "Acknowledged" : x.ack === "wait" ? "Awaiting your reply" : "Not sent yet"}</span></div><p><b>Communication.</b> ${esc(x.comms)}</p><p><b>Resolution.</b> ${esc(x.resolution)}</p></div>`).join("");
    const coachRows = (d.coaching || []).map((x) => `<tr><td>${esc(dshort(x.date))}</td><td>${esc(x.label)}</td><td>${x.ack ? `<span class="ag-chip ok">Acknowledged</span>` : `<span class="ag-chip plain">Awaiting your reply</span>`}</td></tr>`).join("");
    const late = att.late || [];

    return `<div class="ag-page">
      <div class="ag-head">${d.photo && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(d.photo) ? `<img class="ag-photo" src="${d.photo}" alt="">` : ""}<div><h2>Hi, ${esc(String(d.name || "there").trim().split(/\s+/)[0])}!</h2><div class="ag-fullname">${esc(d.name || "")}</div><p>${d.cohort ? esc(d.cohort) : "No class"}${d.started ? ` · started ${esc(dshort(d.started + "T00:00:00"))}` : ""}${d.inactive ? " · inactive" : ""}</p></div></div>
      ${who ? `<p class="ag-who">${who}</p>` : ""}
      <div class="ag-stats">${stats}</div>
      <section class="ag-sec"><h3>Your goals</h3>${anyGoal ? `<table class="ag-table"><thead><tr><th>Measure</th><th>Goal</th><th>You now</th><th>Status</th></tr></thead><tbody>${goalRows}</tbody></table>` : `<p class="ag-empty">No goals have been set for your class yet.</p>`}</section>
      <section class="ag-sec"><h3>QA by week</h3>${qaRows ? `<table class="ag-table"><thead><tr><th>Week</th><th>Score</th><th>Feedback</th></tr></thead><tbody>${qaRows}</tbody></table>` : `<p class="ag-empty">No QA weeks yet.</p>`}</section>
      <section class="ag-sec"><h3>Speed by week</h3>${spRows ? `<table class="ag-table"><thead><tr><th>Week</th><th>Min per ticket</th><th>Hours</th><th>Cleared</th></tr></thead><tbody>${spRows}</tbody></table>` : `<p class="ag-empty">No Speed yet.</p>`}</section>
      <section class="ag-sec"><h3>Attendance</h3>${att.graded ? `<p>${att.graded} day${att.graded === 1 ? "" : "s"} graded, ${att.graded - late.length} on time.${late.length ? ` Not on time: ${late.map((x) => `Day ${esc(x.day)} (${esc(x.label)})`).join(", ")}.` : " Nothing missed."}</p>` : `<p class="ag-empty">No attendance recorded yet.</p>`}</section>
      <section class="ag-sec"><h3>Quizzes</h3>${quizRows}</section>
      <section class="ag-sec"><h3>Spot checks</h3>${spotRows || `<p class="ag-empty">No spot checks yet.</p>`}</section>
      <section class="ag-sec"><h3>Coaching you received</h3>${coachRows ? `<table class="ag-table"><thead><tr><th>Sent</th><th>About</th><th>Status</th></tr></thead><tbody>${coachRows}</tbody></table>` : `<p class="ag-empty">No coaching sent yet.</p>`}</section>
      <p class="ag-foot">${d.generated_at ? `Updated ${esc(new Date(d.generated_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }))}. ` : ""}This page is read-only. Reply to coaching and spot checks in Slack.</p>
    </div>`;
  }
  root.AgentCard = Object.assign(root.AgentCard || {}, { html, esc });
})(typeof window !== "undefined" ? window : globalThis);
