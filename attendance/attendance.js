// ---------- Attendance (Slack check-ins + 20-day points grid) ----------
// Ported from the Trainer Dashboard (Alpha) Attendance tab. Cohorts and trainees come from
// Settings → Roster (window.CoachingCompass), so there is no separate class list here.
// Where it keeps things:
//   cohorts/{id}            attendance_channel_id, attendance_custom_message,
//                           attendance_days { traineeId: { "1".."20": status } }
//   cohorts/{id}/attendance one record per check-in sent (thread ts, grades)
//   trainees/{id}           slack_user_id, matched from the work email
// Days 1–20 are the cohort's own schedule (5 on, 2 off from the start date), the same one
// Cohorts and My Class use.
(function () {
  const SLACK = "Slack";
  const DRIVE = "Google Drive";
  const PRESENT_MIN = 5; // a reply within 5 minutes is Present
  const LATE_MIN = 15; // within 15 minutes is Late, later is Absent
  const AUTO_CHECK_MS = 10 * 60 * 1000;
  const STATUS_LABEL = { present: "Present", late: "Late", absent: "Absent" };

  // NCNS is worth double the worst late/absent tier, as in the original.
  const DAY_OPTIONS = [
    { value: "", label: "—", short: "", points: 0 },
    { value: "ontime", label: "On time", short: "On time", points: 0 },
    { value: "late25", label: ".25 (15m–2h30m late)", short: ".25", points: 0.25 },
    { value: "late50", label: ".50 (2h31m–5h late)", short: ".50", points: 0.5 },
    { value: "late75", label: ".75 (5h1m–7h30m late)", short: ".75", points: 0.75 },
    { value: "late100", label: "1.00 (7h31m+ late)", short: "1.00", points: 1 },
    { value: "absent", label: "Absent", short: "Absent", points: 1 },
    { value: "ncns", label: "2.00 (NCNS)", short: "NCNS", points: 2 },
  ];
  const POINTS = Object.fromEntries(DAY_OPTIONS.map((o) => [o.value, o.points]));
  const SHORT = Object.fromEntries(DAY_OPTIONS.map((o) => [o.value, o.short]));

  // Capabilities, requested once for the page.
  const use = (name) => Promise.resolve().then(() => (window.claude ? window.claude.use(name) : null)).catch(() => null);
  const mcpReady = use("mcp");
  const dbReady = use("db");

  const cc = () => window.CoachingCompass;

  // ---- Small helpers ----
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const timeAgo = (ms) => {
    const min = Math.round((Date.now() - ms) / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };
  const slackError = (err) =>
    err?.code === "not_granted"
      ? "Slack isn't connected for this dashboard. Allow Slack when the dashboard asks, then try again."
      : `Slack didn't respond${err?.message ? ` (${err.message})` : ""}. Try again.`;
  const driveError = (err) =>
    err?.code === "not_granted" ? "Google Drive isn't connected for this dashboard." : "Google Drive didn't respond. Try again.";
  const needMcp = () =>
    mcpReady.then((m) => {
      if (!m) throw Object.assign(new Error("not connected"), { code: "not_granted" });
      return m;
    });

  // The cohort's 20 training days, as ISO dates.
  function trainingDays(cohort) {
    const s = cohortSchedule(cohort.training_start_date);
    if (!s) return [];
    const days = [];
    s.weeks.forEach((w) => {
      for (let d = new Date(`${w.start}T00:00:00`); isoDate(d) <= w.end; d.setDate(d.getDate() + 1)) days.push(isoDate(d));
    });
    return days;
  }

  function membersOf(cohort) {
    const byId = new Map(cc().data().trainees.map((t) => [t.id, t]));
    return (cohort.trainee_ids || [])
      .map((id) => byId.get(id))
      .filter(Boolean)
      .sort((a, b) => isInactive(a) - isInactive(b) || (a.name || "").localeCompare(b.name || ""));
  }

  // An inactive trainee's upcoming days don't count and can't be set.
  const lockedDay = (t, date, today) => isInactive(t) && date && date > today;

  function totalPoints(t, days, dates, today) {
    let total = 0;
    for (let n = 1; n <= TRAINING_DAYS; n++) if (!lockedDay(t, dates[n - 1], today)) total += POINTS[days?.[n] || ""] || 0;
    return total;
  }

  // ---- Slack output parsing (the tools return one formatted text block) ----
  // Channel history: "=== Message from Name <email> (U123) at … ===" then "Message TS: 123.456".
  function parseChannelMessages(raw) {
    return String(raw || "")
      .split(/(?=^=== Message from )/m)
      .filter((b) => b.startsWith("=== Message from "))
      .map((b) => {
        const head = b.match(/^=== Message from (.+?)\s*(?:<([^>]*)>)?\s*(?:\(([^)]+)\))?\s+at /m);
        const ts = b.match(/^Message TS:\s*(\S+)/m);
        return { name: head?.[1]?.trim() || "", userId: head?.[3] || "", ts: ts?.[1] || null };
      })
      .filter((m) => m.ts);
  }

  // Thread replies: "--- Reply 1 of 3 ---" then "From: Name <email> (U123)" and "Message TS: …".
  function parseThreadReplies(raw) {
    return String(raw || "")
      .split(/(?=^--- Reply \d+ of \d+ ---)/m)
      .filter((b) => /^--- Reply \d+ of \d+ ---/.test(b))
      .map((b) => {
        const from = b.match(/^From:\s*(.+?)\s*(?:<([^>]*)>)?\s*(?:\(([^)]+)\))?\s*$/m);
        const ts = b.match(/^Message TS:\s*(\S+)/m);
        return { name: from?.[1]?.trim() || "", userId: from?.[3]?.trim() || "", ts: ts?.[1]?.trim() || null };
      })
      .filter((r) => r.ts);
  }

  function parseUserSearch(raw) {
    return String(raw || "")
      .split(/(?=^### Result \d+ of \d+)/m)
      .filter((b) => /^### Result \d+ of \d+/.test(b))
      .map((b) => ({ userId: b.match(/^User ID:\s*(\S+)/m)?.[1], email: (b.match(/^Email:\s*(\S+)/m)?.[1] || "").toLowerCase() }))
      .filter((u) => u.userId);
  }

  // ---- Grading ----
  function sessionStatus(delayMin) {
    if (delayMin == null) return "absent";
    if (delayMin <= PRESENT_MIN) return "present";
    if (delayMin <= LATE_MIN) return "late";
    return "absent";
  }

  // The grid's own tiers (15m / 2h30m / 5h / 7h30m). No reply is Absent, never NCNS:
  // NCNS is marked by hand.
  function dayStatusFromDelay(delayMin) {
    if (delayMin == null) return "absent";
    if (delayMin <= 15) return "ontime";
    if (delayMin <= 150) return "late25";
    if (delayMin <= 300) return "late50";
    if (delayMin <= 450) return "late75";
    return "late100";
  }

  const sessionDayIndex = (cohort, session) => trainingDays(cohort).indexOf(isoDate(new Date(session.sentAt)));
  function sessionDayLabel(cohort, session) {
    const i = sessionDayIndex(cohort, session);
    return i === -1 ? null : `Day ${i + 1} · ${fmtShort(trainingDays(cohort)[i])}`;
  }

  // Slack search can't find a full email address, but finds the part before @. A hit is only
  // accepted when its full email matches, so it can't land on someone at another domain.
  function resolveSlackIds(members, onProgress) {
    const todo = members.filter((t) => !t.slack_user_id && t.email);
    if (!todo.length) return Promise.resolve();
    return mcpReady.then((mcp) => {
      if (!mcp) return;
      onProgress?.(`Matching ${plural(todo.length, "trainee")} to Slack by work email…`);
      return todo.reduce(
        (chain, t) =>
          chain.then(() => {
            const email = t.email.trim().toLowerCase();
            const local = email.split("@")[0];
            return mcp
              .callTool(SLACK, "slack_search_users", { query: local, keywords: [local], natural_language_query: "" })
              .then((r) => {
                const hit = parseUserSearch(r?.payload?.results).find((u) => u.email === email);
                if (!hit) return;
                t.slack_user_id = hit.userId;
                return cc().updateTrainee(t.id, { slack_user_id: hit.userId });
              })
              .catch(() => {});
          }),
        Promise.resolve()
      );
    });
  }

  // ---- Check-in records (cohorts/{id}/attendance) ----
  const localSessions = new Map(); // used when there's no db (local preview)
  function loadSessions(cohortId) {
    return dbReady.then((db) => {
      if (!db || String(cohortId).startsWith("local-")) return (localSessions.get(cohortId) || []).slice(0, 5);
      return db
        .doc(`cohorts/${cohortId}`)
        .collection("attendance")
        .orderBy("sentAt", "desc")
        .limit(5)
        .get()
        .then((qs) => qs.docs.map((d) => ({ id: d.id, ...JSON.parse(JSON.stringify(d.data() || {})) })));
    });
  }
  function saveSession(cohortId, session) {
    const { id, ...fields } = session;
    return dbReady.then((db) => {
      if (!db || String(cohortId).startsWith("local-")) {
        const list = (localSessions.get(cohortId) || []).filter((s) => s.id !== id);
        localSessions.set(cohortId, [session, ...list].sort((a, b) => b.sentAt - a.sentAt));
        return;
      }
      return db.doc(`cohorts/${cohortId}`).collection("attendance").doc(id).set(fields);
    });
  }

  function sendCheckIn(cohort, channelId, message) {
    const sentAt = Date.now();
    let mcp;
    return needMcp()
      .then((m) => ((mcp = m), mcp.callTool(SLACK, "slack_send_message", { channel_id: channelId, message })))
      .then(() => mcp.callTool(SLACK, "slack_read_channel", { channel_id: channelId, limit: 5, response_format: "detailed" }))
      .then((r) => {
        // The newest message right after our send is ours; these channels are quiet.
        const mine = parseChannelMessages(r?.payload?.messages).sort((a, b) => parseFloat(b.ts) - parseFloat(a.ts))[0];
        if (!mine) throw Object.assign(new Error("not found"), { code: "not_found" });
        const session = {
          id: `s${sentAt}`,
          sentAt,
          sentAtTs: mine.ts,
          channelId,
          presentCutoffMin: PRESENT_MIN,
          lateCutoffMin: LATE_MIN,
          message,
          checkedAt: null,
          responses: {},
        };
        return saveSession(cohort.id, session).then(() => session);
      });
  }

  // Earliest reply per Slack user in the check-in thread, in ms.
  function replyMap(session) {
    return needMcp()
      .then((mcp) => mcp.callTool(SLACK, "slack_read_thread", { channel_id: session.channelId, message_ts: session.sentAtTs, response_format: "detailed" }))
      .then((r) => {
        const map = {};
        parseThreadReplies(r?.payload?.messages).forEach((reply) => {
          if (!reply.userId) return;
          const ms = parseFloat(reply.ts) * 1000;
          if (!map[reply.userId] || ms < map[reply.userId]) map[reply.userId] = ms;
        });
        return map;
      });
  }

  // Grades the active trainees, saves the grades on the check-in, and writes them into the
  // matching day of the grid. A check-in sent outside the 20 days only updates its own record.
  function checkReplies(cohort, session) {
    const members = membersOf(cohort).filter((t) => !isInactive(t));
    return resolveSlackIds(members)
      .then(() => replyMap(session))
      .then((map) => {
        const base = session.sentAtTs ? parseFloat(session.sentAtTs) * 1000 : session.sentAt;
        const responses = {};
        members.forEach((t) => {
          const replyMs = t.slack_user_id ? map[t.slack_user_id] : null;
          const delayMin = replyMs ? Math.max(0, Math.round((replyMs - base) / 60000)) : null;
          responses[t.id] = { status: sessionStatus(delayMin), replyAtMs: replyMs || null, delayMin, matched: !!t.slack_user_id };
        });
        const graded = { ...session, responses, checkedAt: Date.now() };
        return saveSession(cohort.id, graded).then(() => {
          const dayIndex = sessionDayIndex(cohort, session);
          if (dayIndex === -1) return graded;
          const fresh = cc().data().cohorts.find((c) => c.id === cohort.id) || cohort;
          const all = JSON.parse(JSON.stringify(fresh.attendance_days || {}));
          Object.entries(responses).forEach(([id, r]) => {
            if (!r.matched) return; // no Slack match: keep whatever is in that cell
            all[id] = { ...(all[id] || {}), [dayIndex + 1]: dayStatusFromDelay(r.delayMin) };
          });
          return cc().updateCohort(cohort.id, { attendance_days: all }).then(() => graded);
        });
      });
  }

  function pingNonRepliers(cohort, session) {
    const members = membersOf(cohort).filter((t) => !isInactive(t));
    return resolveSlackIds(members)
      .then(() => replyMap(session))
      .then((map) => {
        const missing = members.filter((t) => !(t.slack_user_id && map[t.slack_user_id]));
        if (!missing.length) return 0;
        const tagged = missing.filter((t) => t.slack_user_id).map((t) => `<@${t.slack_user_id}>`);
        const untagged = missing.filter((t) => !t.slack_user_id).map((t) => t.name || "Trainee");
        const lines = [":bell: *Still waiting on a reply from:*"];
        if (tagged.length) lines.push(tagged.join(" "));
        if (untagged.length) lines.push(`(no Slack match on file: ${untagged.join(", ")})`);
        lines.push("Please reply in this thread to be marked present.");
        return needMcp()
          .then((mcp) => mcp.callTool(SLACK, "slack_send_message", { channel_id: session.channelId, message: lines.join("\n"), thread_ts: session.sentAtTs }))
          .then(() => missing.length);
      });
  }

  // <!channel> is Slack's real @channel mention; plain "@channel" text wouldn't notify anyone.
  const defaultMessage = (cohort) =>
    [`<!channel> :wave: Attendance check-in — ${cohort.name || "Training"}`, "Reply \"Logged In\" directly in this thread to be marked present for today’s session."].join("\n");

  // ---- CSV export: the grid, a per-trainee analysis and a cohort summary in one sheet ----
  function buildCsv(cohort) {
    const dates = trainingDays(cohort);
    const today = localToday();
    const members = membersOf(cohort);
    const all = cohort.attendance_days || {};
    const cell = (v) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rate = (n, d) => (d ? `${Math.round((n / d) * 1000) / 10}%` : "—");
    const dayName = (n) => `Day ${n}${dates[n - 1] ? ` (${fmtShort(dates[n - 1])})` : ""}`;
    const rows = [["Trainee", "Status", ...Array.from({ length: TRAINING_DAYS }, (_, i) => dayName(i + 1)), "Total Points"]];
    const tally = {};
    for (let n = 1; n <= TRAINING_DAYS; n++) tally[n] = { ontime: 0, graded: 0 };
    const stats = [];
    const sum = { active: 0, ontime: 0, late: 0, absent: 0, ncns: 0, graded: 0, points: 0 };
    members.forEach((t) => {
      const days = all[t.id] || {};
      const status = isInactive(t) ? "Inactive" : "Active";
      if (status === "Active") sum.active++;
      const c = { ontime: 0, late: 0, absent: 0, ncns: 0, graded: 0 };
      const row = [t.name || "Trainee", status];
      for (let n = 1; n <= TRAINING_DAYS; n++) {
        const v = lockedDay(t, dates[n - 1], today) ? "" : days[n] || "";
        row.push(SHORT[v] ?? v);
        if (!v) continue;
        c.graded++;
        tally[n].graded++;
        if (v === "ontime") (c.ontime++, tally[n].ontime++);
        else if (v === "absent") c.absent++;
        else if (v === "ncns") c.ncns++;
        else c.late++;
      }
      const points = totalPoints(t, days, dates, today);
      row.push(points);
      rows.push(row);
      stats.push([t.name || "Trainee", status, c.graded, c.ontime, c.late, c.absent, c.ncns, rate(c.ontime, c.graded), points]);
      ["ontime", "late", "absent", "ncns", "graded"].forEach((k) => (sum[k] += c[k]));
      sum.points += points;
    });
    rows.push([], ["Per-Trainee Attendance Analysis"], ["Trainee", "Status", "Days Graded", "On-time Days", "Late Days", "Absent Days", "NCNS Days", "On-time Rate", "Total Points"], ...stats);
    rows.push(
      [],
      ["Cohort Summary"],
      ["Total trainees", members.length],
      ["Active", sum.active],
      ["Inactive", members.length - sum.active],
      ["Average total points / trainee", members.length ? Math.round((sum.points / members.length) * 100) / 100 : 0],
      ["Cohort on-time rate", rate(sum.ontime, sum.graded)],
      ["Total late incidents (all trainees)", sum.late],
      ["Total absences (all trainees)", sum.absent],
      ["Total NCNS incidents (all trainees)", sum.ncns]
    );
    // Weakest and strongest day, among days someone has been graded on.
    const graded = Object.keys(tally).map(Number).filter((n) => tally[n].graded);
    if (graded.length) {
      const r = (n) => tally[n].ontime / tally[n].graded;
      const sorted = graded.slice().sort((a, b) => r(a) - r(b));
      rows.push(["Weakest day (lowest on-time rate)", `${dayName(sorted[0])} — ${rate(tally[sorted[0]].ontime, tally[sorted[0]].graded)} on time`]);
      const best = sorted[sorted.length - 1];
      rows.push(["Strongest day (highest on-time rate)", `${dayName(best)} — ${rate(tally[best].ontime, tally[best].graded)} on time`]);
    }
    return rows.map((row) => row.map(cell).join(",")).join("\n");
  }

  function exportToSheet(cohort) {
    const title = `Attendance — ${cohort.name || "Cohort"} — ${localToday()}`;
    return needMcp()
      .then((mcp) => mcp.callTool(DRIVE, "create_file", { title, textContent: buildCsv(cohort), contentMimeType: "text/csv" }))
      .then((r) => {
        const p = r?.payload || {};
        const url = p.viewUrl || (p.id ? `https://docs.google.com/spreadsheets/d/${p.id}/edit` : null);
        if (!url) throw new Error("no link");
        return url;
      });
  }

  // ---- Window UI ----
  const ui = {
    el: null,
    unsubscribe: null,
    filter: "",
    open: new Set(), // expanded cohorts
    touched: new Set(), // cohorts the viewer expanded or collapsed by hand
    sessions: new Map(), // cohortId -> recent check-ins (newest first)
    loading: new Set(),
    status: new Map(), // `${cohortId}:${slot}` -> text shown next to a button
    busy: new Set(),
    channelDraft: new Map(),
    scroll: new Map(), // cohortId -> grid scrollLeft, kept across redraws
  };
  const setStatus = (cohortId, slot, text) => (ui.status.set(`${cohortId}:${slot}`, text), draw());
  const statusText = (cohortId, slot) => ui.status.get(`${cohortId}:${slot}`) || "";

  function refreshSessions(cohortId) {
    ui.loading.add(cohortId);
    return loadSessions(cohortId)
      .then((list) => ui.sessions.set(cohortId, list))
      .catch(() => ui.sessions.set(cohortId, null))
      .finally(() => (ui.loading.delete(cohortId), draw()));
  }

  function toast(text) {
    const win = ui.el?.closest(".window");
    if (!win) return;
    const t = document.createElement("div");
    t.className = "att-toast";
    t.textContent = text;
    win.appendChild(t);
    setTimeout(() => t.remove(), 4500);
  }

  function gridHtml(cohort, members) {
    if (!members.length) return `<p class="muted">No trainees in this cohort yet. Add them from Cohorts with + Add Trainee.</p>`;
    const dates = trainingDays(cohort);
    const today = localToday();
    const all = cohort.attendance_days || {};
    const cols = 2 + TRAINING_DAYS;
    const row = (t) => {
      const days = all[t.id] || {};
      const cells = Array.from({ length: TRAINING_DAYS }, (_, i) => {
        const n = i + 1;
        if (lockedDay(t, dates[i], today)) return `<td><span class="muted" title="Inactive — upcoming days don't count">—</span></td>`;
        const cur = days[n] || "";
        return `<td class="${dates[i] === today ? "att-today" : ""}"><select class="att-day${cur ? ` v-${cur}` : ""}" data-day="${escapeHtml(cohort.id)}|${escapeHtml(t.id)}|${n}" aria-label="${escapeHtml(t.name)}, Day ${n}">${DAY_OPTIONS.map(
          (o) => `<option value="${o.value}"${o.value === cur ? " selected" : ""}>${escapeHtml(o.label)}</option>`
        ).join("")}</select></td>`;
      }).join("");
      return `<tr class="${isInactive(t) ? "is-inactive" : ""}"><td class="att-name">${escapeHtml(t.name || "Trainee")}</td><td class="att-total">${totalPoints(t, days, dates, today).toFixed(2)}</td>${cells}</tr>`;
    };
    const group = (label, list, empty) =>
      `<tr class="att-group"><td colspan="${cols}"><span>${label} (${list.length})</span></td></tr>` +
      (list.length ? list.map(row).join("") : `<tr><td colspan="${cols}" class="muted att-empty">${empty}</td></tr>`);
    const heads = Array.from({ length: TRAINING_DAYS }, (_, i) => `<th class="${dates[i] === today ? "att-today" : ""}">Day ${i + 1}${dates[i] ? `<small>${fmtShort(dates[i])}</small>` : ""}</th>`).join("");
    return `
      <div class="att-grid-wrap" data-grid="${escapeHtml(cohort.id)}">
        <table class="att-grid">
          <thead>
            <tr><th class="att-name att-total-edge" colspan="2"></th><th colspan="10" class="att-phase">Classroom (Days 1–10)</th><th colspan="10" class="att-phase nest">Nesting (Days 11–20)</th></tr>
            <tr><th class="att-name">Trainee</th><th class="att-total">Total Points</th>${heads}</tr>
          </thead>
          <tbody>
            ${group("Active", members.filter((t) => !isInactive(t)), "No active trainees.")}
            ${group("Inactive", members.filter(isInactive), "No inactive trainees.")}
          </tbody>
        </table>
      </div>
      <input type="range" class="grid-scroll-slider" data-slider="${escapeHtml(cohort.id)}" min="0" value="0" aria-label="Scroll the attendance table sideways" />`;
  }

  function coverageText(members) {
    const active = members.filter((t) => !isInactive(t));
    const matched = active.filter((t) => t.slack_user_id).length;
    const byEmail = active.filter((t) => !t.slack_user_id && t.email).length;
    const noEmail = active.length - matched - byEmail;
    if (!active.length) return "No active trainees to check in.";
    return (
      `${matched} of ${active.length} active trainees matched to Slack` +
      (byEmail ? ` · ${byEmail} will be matched by work email on the next send or check` : "") +
      (noEmail ? ` · ${noEmail} missing a work email (Settings → Roster)` : "")
    );
  }

  function cardHtml(cohort, today) {
    const s = cohortSchedule(cohort.training_start_date);
    const status = scheduleStatus(s, today);
    const members = membersOf(cohort);
    const inactive = members.filter(isInactive).length;
    const open = ui.open.has(cohort.id);
    const id = escapeHtml(cohort.id);
    const sessions = ui.sessions.get(cohort.id);
    const latest = sessions?.[0];
    const channel = ui.channelDraft.has(cohort.id) ? ui.channelDraft.get(cohort.id) : cohort.attendance_channel_id || "";
    const busy = (slot) => (ui.busy.has(`${cohort.id}:${slot}`) ? " disabled" : "");
    const where =
      status === "active" ? (() => { const p = scheduleProgress(s, today); return `${p.label} · Day ${p.day} of ${TRAINING_DAYS}`; })()
      : status === "upcoming" ? `Starts ${fmtDate(s.start)}`
      : status === "completed" ? `Finished ${fmtDate(s.end)}`
      : "No start date";
    let sessionLine;
    if (ui.loading.has(cohort.id) && !sessions) sessionLine = "Loading check-ins…";
    else if (sessions === null) sessionLine = "Couldn't load past check-ins.";
    else if (!latest) sessionLine = "No check-ins sent yet.";
    else sessionLine = `Latest: ${sessionDayLabel(cohort, latest) ? `${sessionDayLabel(cohort, latest)} · ` : ""}sent ${timeAgo(latest.sentAt)}${latest.checkedAt ? ` · graded ${timeAgo(latest.checkedAt)}` : " · not graded yet"}`;

    return `
      <li class="cohort-row att-card${open ? " open" : ""}">
        <div class="row-main">
          <button type="button" class="row-toggle" data-att-toggle="${id}" aria-expanded="${open}">
            <span class="chev" aria-hidden="true">›</span>
            <span><b>${escapeHtml(cohort.name)}</b><small>${escapeHtml(cohort.department || "No department")} · ${escapeHtml(cohort.team_lead || "No team lead")}</small></span>
          </button>
          <span class="row-cell">${s ? escapeHtml(fmtRange(s.start, s.end)) : "—"}</span>
          <span class="row-cell muted">${escapeHtml(where)}</span>
          <span class="row-cell">${members.length - inactive} active${inactive ? ` · ${inactive} inactive` : ""}</span>
          <button type="button" class="btn btn-small" data-att-cohorts>Open in Cohorts</button>
        </div>
        ${
          open
            ? `<div class="row-detail att-detail">
                ${
                  s
                    ? `<p class="cd-lines">Classroom Training: ${fmtShort(s.classroom.start)} – ${fmtShort(s.classroom.end)} · Nesting: ${fmtShort(s.nesting.start)} – ${fmtShort(s.nesting.end)}</p>`
                    : `<p class="cd-lines muted">No start date yet, so the days below have no dates. Set one in Cohorts.</p>`
                }
                ${gridHtml(cohort, members)}
                <div class="att-controls">
                  <div class="att-line">
                    <input type="text" class="att-channel" data-att-channel="${id}" value="${escapeHtml(channel)}" placeholder="This cohort's Slack channel ID (e.g. C0123456789)" spellcheck="false" />
                    <button type="button" class="btn btn-small" data-att-save-channel="${id}"${busy("channel")}>Save Channel</button>
                    <span class="att-note" role="status">${escapeHtml(statusText(cohort.id, "channel"))}</span>
                  </div>
                  <div class="att-line">
                    <button type="button" class="btn-primary btn-small" data-att-send="${id}"${busy("send")}>Send Check-in…</button>
                    <button type="button" class="btn btn-small" data-att-check="${id}"${latest ? "" : " disabled"}${busy("check")}>${latest?.checkedAt ? "Re-check Replies" : "Check Replies"}</button>
                    <button type="button" class="btn btn-small" data-att-ping="${id}"${latest ? "" : " disabled"}${busy("ping")}>Ping No-Replies</button>
                    <button type="button" class="square-btn att-icon" data-att-responses="${id}" title="Latest check-in responses" aria-label="Latest check-in responses"${latest ? "" : " disabled"}>📋</button>
                    <button type="button" class="square-btn att-icon" data-att-history="${id}" title="Check-in history" aria-label="Check-in history">🕘</button>
                    <button type="button" class="btn btn-small att-export" data-att-export="${id}"${busy("export")}>Export to Google Sheet</button>
                  </div>
                  <p class="att-note" role="status">${statusText(cohort.id, "action") ? escapeHtml(statusText(cohort.id, "action")) : escapeHtml(sessionLine)}</p>
                  ${statusText(cohort.id, "export") ? `<p class="att-note" role="status">${statusText(cohort.id, "export")}</p>` : ""}
                  <p class="att-note">${escapeHtml(coverageText(members))}</p>
                </div>
              </div>`
            : ""
        }
      </li>`;
  }

  function draw() {
    const el = ui.el;
    if (!el || !cc()) return; // ui.el is cleared when the window closes
    // Keep the viewer's place across a redraw: window scroll, each grid's sideways scroll,
    // and the field they're typing in.
    const top = el.scrollTop;
    el.querySelectorAll("[data-grid]").forEach((g) => ui.scroll.set(g.dataset.grid, g.scrollLeft));
    const focused = document.activeElement?.closest?.("[data-att-channel]")?.dataset.attChannel;

    const today = localToday();
    const { cohorts } = cc().data();
    const statusOf = (c) => scheduleStatus(cohortSchedule(c.training_start_date), today);
    // Active cohorts open by default until the viewer collapses one.
    cohorts.forEach((c) => {
      if (!ui.touched.has(c.id) && statusOf(c) === "active") ui.open.add(c.id);
    });
    const groups = [
      { key: "active", title: "Active", sort: (a, b) => a.training_start_date.localeCompare(b.training_start_date) },
      { key: "upcoming", title: "Upcoming", sort: (a, b) => a.training_start_date.localeCompare(b.training_start_date) },
      { key: "completed", title: "Completed", sort: (a, b) => b.training_start_date.localeCompare(a.training_start_date) },
      { key: "unscheduled", title: "No start date", sort: (a, b) => a.name.localeCompare(b.name) },
    ].filter((g) => !ui.filter || g.key === ui.filter);

    el.innerHTML = `
      <div class="app-head">
        <div>
          <h3>Attendance</h3>
          <p class="muted att-sub">Slack check-ins for your cohorts: set a channel, send a check-in, then grade who replied and when.</p>
        </div>
        <label class="att-filter">Show
          <select data-att-filter>
            <option value="">All cohorts</option>
            ${["active", "upcoming", "completed"].map((k) => `<option value="${k}"${ui.filter === k ? " selected" : ""}>${k[0].toUpperCase() + k.slice(1)} only</option>`).join("")}
          </select>
        </label>
      </div>
      <p class="muted att-legend">Points: On time 0 · .25 (15m–2h30m late) · .50 (2h31m–5h) · .75 (5h1m–7h30m) · 1.00 (7h31m+ late) · Absent 1 · NCNS 2. Replies within ${PRESENT_MIN} min are Present, within ${LATE_MIN} min Late.</p>
      ${
        !cohorts.length
          ? `<p class="muted">No cohorts yet. Add one in Cohorts with + Add Class.</p>`
          : groups
              .map((g) => {
                const list = cohorts.filter((c) => statusOf(c) === g.key).sort(g.sort);
                if (!list.length) {
                  return g.key === "unscheduled" ? "" : `<section class="cohort-section"><h4>${g.title} <span class="muted">0</span></h4><p class="muted empty">No ${g.title.toLowerCase()} cohorts.</p></section>`;
                }
                return `<section class="cohort-section">
                  <h4>${g.title} <span class="muted">${list.length}</span></h4>
                  <ul class="cohort-list">${list.map((c) => cardHtml(c, today)).join("")}</ul>
                </section>`;
              })
              .join("")
      }`;

    el.scrollTop = top;
    el.querySelectorAll("[data-grid]").forEach((g) => {
      const slider = el.querySelector(`[data-slider="${CSS.escape(g.dataset.grid)}"]`);
      const sync = () => {
        const max = Math.max(0, g.scrollWidth - g.clientWidth);
        slider.max = String(max);
        slider.hidden = max === 0;
        slider.value = String(g.scrollLeft);
      };
      g.scrollLeft = ui.scroll.get(g.dataset.grid) || 0;
      slider.addEventListener("input", () => (g.scrollLeft = Number(slider.value)));
      g.addEventListener("scroll", () => ((slider.value = String(g.scrollLeft)), ui.scroll.set(g.dataset.grid, g.scrollLeft)));
      new ResizeObserver(sync).observe(g);
    });
    if (focused) {
      const input = el.querySelector(`[data-att-channel="${CSS.escape(focused)}"]`);
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    }
    // Load check-ins for open cohorts the first time they're shown.
    cohorts.forEach((c) => {
      if (ui.open.has(c.id) && !ui.sessions.has(c.id) && !ui.loading.has(c.id)) refreshSessions(c.id);
    });
  }

  const cohortById = (id) => cc().data().cohorts.find((c) => c.id === id);

  // One task at a time per button; the redraw after it finishes re-enables it.
  function run(cohortId, slot, task) {
    const key = `${cohortId}:${slot}`;
    if (ui.busy.has(key)) return;
    ui.busy.add(key);
    draw();
    Promise.resolve()
      .then(task)
      .finally(() => (ui.busy.delete(key), draw()));
  }

  function onClick(e) {
    const t = e.target.closest("button");
    if (!t || t.disabled) return;
    const d = t.dataset;
    if (d.attToggle) {
      ui.touched.add(d.attToggle);
      ui.open.has(d.attToggle) ? ui.open.delete(d.attToggle) : ui.open.add(d.attToggle);
      draw();
    } else if ("attCohorts" in d) openApp("cohorts");
    else if (d.attSaveChannel) saveChannel(d.attSaveChannel);
    else if (d.attSend) openCompose(d.attSend);
    else if (d.attCheck) doCheck(d.attCheck);
    else if (d.attPing) doPing(d.attPing);
    else if (d.attResponses) openResponses(d.attResponses);
    else if (d.attHistory) openHistory(d.attHistory);
    else if (d.attExport) doExport(d.attExport);
  }

  function onChange(e) {
    if (e.target.matches("[data-att-filter]")) {
      ui.filter = e.target.value;
      draw();
      return;
    }
    const cell = e.target.closest("[data-day]");
    if (!cell) return;
    const [cohortId, traineeId, day] = cell.dataset.day.split("|");
    const cohort = cohortById(cohortId);
    if (!cohort) return;
    const all = JSON.parse(JSON.stringify(cohort.attendance_days || {}));
    all[traineeId] = { ...(all[traineeId] || {}), [day]: cell.value };
    cell.blur(); // lets the redraw that follows the save update the total
    cc()
      .updateCohort(cohortId, { attendance_days: all })
      .catch(() => {
        setStatus(cohortId, "action", "Couldn't save that day's status. Try again.");
      });
  }

  function onInput(e) {
    const input = e.target.closest("[data-att-channel]");
    if (input) ui.channelDraft.set(input.dataset.attChannel, input.value);
  }

  function saveChannel(cohortId) {
    const value = (ui.channelDraft.get(cohortId) ?? cohortById(cohortId)?.attendance_channel_id ?? "").trim();
    run(cohortId, "channel", () => {
      ui.status.set(`${cohortId}:channel`, "Saving…");
      return cc()
        .updateCohort(cohortId, { attendance_channel_id: value })
        .then(() => (ui.channelDraft.delete(cohortId), ui.status.set(`${cohortId}:channel`, "Channel saved ✓")))
        .catch(() => ui.status.set(`${cohortId}:channel`, "Couldn't save. Try again."));
    });
  }

  function doCheck(cohortId) {
    const cohort = cohortById(cohortId);
    const session = ui.sessions.get(cohortId)?.[0];
    if (!cohort || !session) return;
    run(cohortId, "check", () => {
      ui.status.set(`${cohortId}:action`, "Reading replies…");
      return checkReplies(cohort, session)
        .then(() => ui.status.set(`${cohortId}:action`, "Replies graded ✓"))
        .catch((err) => ui.status.set(`${cohortId}:action`, slackError(err)))
        .then(() => refreshSessions(cohortId));
    });
  }

  function doPing(cohortId) {
    const cohort = cohortById(cohortId);
    const session = ui.sessions.get(cohortId)?.[0];
    if (!cohort || !session) return;
    run(cohortId, "ping", () => {
      ui.status.set(`${cohortId}:action`, "Checking who hasn't replied…");
      return pingNonRepliers(cohort, session)
        .then((n) => ui.status.set(`${cohortId}:action`, n ? `Ping sent to ${plural(n, "trainee")} ✓` : "Everyone's replied, nothing to ping."))
        .catch((err) => ui.status.set(`${cohortId}:action`, slackError(err)));
    });
  }

  function doExport(cohortId) {
    const cohort = cohortById(cohortId);
    if (!cohort) return;
    run(cohortId, "export", () => {
      ui.status.set(`${cohortId}:export`, "Preparing export…");
      return exportToSheet(cohort)
        .then((url) => ui.status.set(`${cohortId}:export`, `Exported ✓ <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Open in Google Sheets</a>`))
        .catch((err) => ui.status.set(`${cohortId}:export`, escapeHtml(`Couldn't export. ${driveError(err)}`)));
    });
  }

  // ---- Sheets (modals inside the window) ----
  function openSheet(html, wide) {
    const win = ui.el?.closest(".window");
    if (!win || win.querySelector(".sheet")) return null;
    const sheet = document.createElement("div");
    sheet.className = "sheet";
    sheet.innerHTML = `<div class="sheet-card${wide ? " att-wide" : ""}" role="dialog">${html}</div>`;
    win.appendChild(sheet);
    const close = () => sheet.remove();
    sheet.querySelectorAll("[data-cancel]").forEach((b) => b.addEventListener("click", close));
    sheet.addEventListener("keydown", (e) => e.key === "Escape" && close());
    sheet.addEventListener("click", (e) => e.target === sheet && close());
    return { sheet, close };
  }

  // Edit the message before it goes out. A changed message becomes this cohort's default;
  // Reset to Default goes back to the built-in wording.
  function openCompose(cohortId) {
    const cohort = cohortById(cohortId);
    if (!cohort) return;
    const channelId = (ui.channelDraft.get(cohortId) ?? cohort.attendance_channel_id ?? "").trim();
    if (!channelId) {
      setStatus(cohortId, "action", "Add this cohort's Slack channel ID first, then Save Channel.");
      return;
    }
    const template = defaultMessage(cohort);
    const initial = cohort.attendance_custom_message || template;
    const s = openSheet(
      `<h3>Send attendance check-in · ${escapeHtml(cohort.name)}</h3>
       <p class="muted att-sub">It posts to channel ${escapeHtml(channelId)} exactly as written.</p>
       <textarea class="att-compose" rows="5"></textarea>
       <p class="att-note att-changed" hidden>This edited message will be saved as this cohort's default for future check-ins. Reset to Default brings back the original wording.</p>
       <p class="sheet-status" role="status"></p>
       <div class="sheet-actions att-compose-actions">
         <button type="button" class="btn" data-reset>Reset to Default</button>
         <span class="att-spacer"></span>
         <button type="button" class="btn" data-cancel>Cancel</button>
         <button type="button" class="btn-primary" data-send>Send</button>
       </div>`,
      true
    );
    if (!s) return;
    const text = s.sheet.querySelector("textarea");
    const note = s.sheet.querySelector(".att-changed");
    const status = s.sheet.querySelector(".sheet-status");
    const send = s.sheet.querySelector("[data-send]");
    text.value = initial;
    const changed = () => (note.hidden = text.value === initial);
    text.addEventListener("input", changed);
    s.sheet.querySelector("[data-reset]").addEventListener("click", () => ((text.value = template), changed(), text.focus()));
    send.addEventListener("click", () => {
      const message = text.value.trim();
      if (!message) {
        status.textContent = "The message can't be empty.";
        return;
      }
      send.disabled = true;
      status.textContent = "Matching trainees to Slack…";
      cc()
        .updateCohort(cohortId, { attendance_custom_message: message === template ? "" : message })
        .catch(() => {});
      resolveSlackIds(membersOf(cohort).filter((t) => !isInactive(t)), (m) => (status.textContent = m))
        .then(() => ((status.textContent = "Sending to Slack…"), sendCheckIn(cohort, channelId, message)))
        .then((session) => {
          s.close();
          toast("Check-in sent ✓");
          ui.status.delete(`${cohortId}:action`);
          ui.sessions.set(cohortId, [session, ...(ui.sessions.get(cohortId) || [])].slice(0, 5));
          draw();
          // Grades itself 10 minutes later while this page stays open; Check Replies is the fallback.
          setTimeout(() => {
            const fresh = cohortById(cohortId);
            if (fresh) checkReplies(fresh, session).then(() => refreshSessions(cohortId)).catch(() => {});
          }, AUTO_CHECK_MS);
        })
        .catch((err) => {
          send.disabled = false;
          status.textContent =
            err?.code === "not_found" ? "Sent to Slack, but couldn't find it in the channel afterwards. Check Slack before sending again." : slackError(err);
        });
    });
    text.focus();
  }

  function responsesTable(cohort, session) {
    const members = membersOf(cohort).filter((t) => !isInactive(t) || session.responses?.[t.id]);
    if (!members.length) return `<p class="muted">No active trainees in this cohort.</p>`;
    const rows = members
      .map((t) => {
        const r = session.responses?.[t.id];
        const label = r ? (r.matched === false ? "No Slack match" : STATUS_LABEL[r.status]) : t.slack_user_id ? "Not graded yet" : "No Slack match";
        const when = r?.replyAtMs ? `${r.delayMin}m after send` : "—";
        return `<tr><td>${escapeHtml(t.name)}</td><td>${escapeHtml(label)}</td><td>${escapeHtml(when)}</td></tr>`;
      })
      .join("");
    return `<div class="att-table-wrap"><table><thead><tr><th>Trainee</th><th>Status</th><th>Replied</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function sessionMeta(cohort, session) {
    const day = sessionDayLabel(cohort, session);
    return `${day ? `${day} · ` : ""}Sent ${timeAgo(session.sentAt)}${session.checkedAt ? ` · graded ${timeAgo(session.checkedAt)}` : " · not graded yet"}`;
  }

  function openResponses(cohortId, sessionId) {
    const cohort = cohortById(cohortId);
    const list = ui.sessions.get(cohortId) || [];
    const session = sessionId ? list.find((x) => x.id === sessionId) : list[0];
    if (!cohort || !session) return;
    ui.el.closest(".window").querySelector(".sheet")?.remove();
    openSheet(
      `<h3>${escapeHtml(sessionDayLabel(cohort, session) || "Check-in responses")}</h3>
       <p class="muted att-sub">${escapeHtml(sessionMeta(cohort, session))}</p>
       ${responsesTable(cohort, session)}
       <div class="sheet-actions"><button type="button" class="btn-primary" data-cancel>Close</button></div>`,
      true
    )?.sheet.querySelector("[data-cancel]").focus();
  }

  function openHistory(cohortId) {
    const cohort = cohortById(cohortId);
    if (!cohort) return;
    const list = ui.sessions.get(cohortId) || [];
    const s = openSheet(
      `<h3>Check-in history · ${escapeHtml(cohort.name)}</h3>
       ${
         list.length
           ? `<ul class="att-history">${list
               .map((x) => `<li><span>${escapeHtml(sessionMeta(cohort, x))}</span><button type="button" class="square-btn att-icon" data-session="${escapeHtml(x.id)}" title="View responses" aria-label="View responses">📋</button></li>`)
               .join("")}</ul><p class="muted att-sub">Shows the last 5 check-ins.</p>`
           : `<p class="muted">No check-ins sent yet.</p>`
       }
       <div class="sheet-actions"><button type="button" class="btn-primary" data-cancel>Close</button></div>`,
      true
    );
    s?.sheet.querySelectorAll("[data-session]").forEach((b) => b.addEventListener("click", () => openResponses(cohortId, b.dataset.session)));
    s?.sheet.querySelector("[data-cancel]").focus();
  }

  window.TrainerAttendance = {
    render(el) {
      if (!cc()) {
        el.innerHTML = `<p class="muted">Attendance isn't available right now.</p>`;
        return;
      }
      ui.el = el;
      el.classList.add("att-body");
      el.addEventListener("click", onClick);
      el.addEventListener("change", onChange);
      el.addEventListener("input", onInput);
      ui.sessions.clear(); // fresh check-ins each time the window opens
      draw();
      ui.unsubscribe = cc().onChange(() => {
        // Don't rebuild under an open day menu; it redraws on the change that follows.
        if (document.activeElement?.matches?.("select.att-day")) return;
        draw();
      });
    },
    onClose() {
      ui.unsubscribe?.();
      ui.el = null;
    },
  };
})();
