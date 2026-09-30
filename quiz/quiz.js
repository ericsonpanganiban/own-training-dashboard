// ---------- Quiz (write, send over Slack, check, score) ----------
// Quizzes are written by hand (multiple choice, true/false, short answer), sent to a cohort's
// active trainees as Slack DMs, and checked from their replies: multiple choice and true/false
// automatically, short answers by Claude against the answer key. Any result can be overridden.
// Where it keeps things:
//   quizzes/{id}                  title, description, passing (%), questions[]
//   quizzes/{id}/runs/{runId}     one send: the quiz as sent, recipients, responses and scores
(function () {
  const cc = () => window.CoachingCompass;
  const slack = () => window.TrainerSlack;
  const use = (name) => Promise.resolve().then(() => (window.claude ? window.claude.use(name) : null)).catch(() => null);
  const dbReady = use("db");
  const sampleReady = use("sample");

  const TYPES = { mc: "Multiple choice", tf: "True / False", short: "Short answer" };
  const LETTERS = "ABCDEF";
  const uid = () => Math.random().toString(36).slice(2, 10);
  const plural = (n, w) => `${n} ${n === 1 ? w : w.endsWith("y") && !/[aeiou]y$/.test(w) ? `${w.slice(0, -1)}ies` : `${w}s`}`;
  const pctText = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : "—");
  const stamp = (iso) => (iso ? fmtStamp(iso) : "");

  const blankQuestion = (type) =>
    type === "mc"
      ? { id: uid(), type, prompt: "", choices: ["", ""], answer: 0, points: 1 }
      : type === "tf"
        ? { id: uid(), type, prompt: "", answer: true, points: 1 }
        : { id: uid(), type: "short", prompt: "", answer: "", points: 1 };

  // ---- Storage (db, or memory when there's no db) ----
  const mem = { quizzes: [], runs: {} };
  let db = null;
  const listeners = new Set();
  const notify = () => listeners.forEach((f) => f());
  let quizzes = [];
  let quizzesLoaded = false;
  dbReady.then((d) => {
    db = d;
    if (!db) {
      quizzesLoaded = true;
      return notify();
    }
    db.collection("quizzes").orderBy("updated_at", "desc").onSnapshot(
      (snap) => {
        quizzes = snap.docs.map((doc) => ({ id: doc.id, ...JSON.parse(JSON.stringify(doc.data() || {})) }));
        quizzesLoaded = true;
        notify();
      },
      () => ((quizzesLoaded = true), notify())
    );
  });
  const allQuizzes = () => (db ? quizzes : mem.quizzes);

  function saveQuiz(quiz) {
    const { id, ...fields } = quiz;
    fields.updated_at = new Date().toISOString();
    if (!db) {
      mem.quizzes = [{ id, ...fields }, ...mem.quizzes.filter((q) => q.id !== id)];
      notify();
      return Promise.resolve();
    }
    return db.doc(`quizzes/${id}`).set(fields);
  }
  function deleteQuiz(id) {
    if (!db) {
      mem.quizzes = mem.quizzes.filter((q) => q.id !== id);
      notify();
      return Promise.resolve();
    }
    return db.doc(`quizzes/${id}`).delete();
  }

  // Runs of the selected quiz, kept live.
  let runs = [];
  let runsFor = null;
  let runsUnsub = null;
  function watchRuns(quizId) {
    if (runsFor === quizId) return;
    runsUnsub?.();
    runsUnsub = null;
    runsFor = quizId;
    runs = [];
    if (!quizId) return;
    if (!db) {
      runs = mem.runs[quizId] || [];
      return;
    }
    runsUnsub = db
      .doc(`quizzes/${quizId}`)
      .collection("runs")
      .orderBy("sent_at", "desc")
      .onSnapshot(
        (snap) => {
          runs = snap.docs.map((doc) => ({ id: doc.id, ...JSON.parse(JSON.stringify(doc.data() || {})) }));
          notify();
        },
        () => notify()
      );
  }
  function saveRun(quizId, run) {
    const { id, ...fields } = run;
    if (!db) {
      mem.runs[quizId] = [run, ...(mem.runs[quizId] || []).filter((r) => r.id !== id)].sort((a, b) => b.sent_at.localeCompare(a.sent_at));
      if (runsFor === quizId) runs = mem.runs[quizId];
      notify();
      return Promise.resolve();
    }
    return db.doc(`quizzes/${quizId}`).collection("runs").doc(id).set(fields);
  }

  // ---- The Slack message ----
  function quizMessage(quiz) {
    const lines = [`**📝 Quiz: ${quiz.title || "Quiz"}**`];
    if (quiz.description?.trim()) lines.push(quiz.description.trim());
    quiz.questions.forEach((q, i) => {
      lines.push("");
      const tag = q.type === "tf" ? " _(True or False)_" : q.type === "short" ? " _(Short answer)_" : "";
      lines.push(`**${i + 1}.**${tag} ${q.prompt.trim()}`);
      if (q.type === "mc") q.choices.forEach((c, j) => lines.push(`${LETTERS[j]}) ${c.trim()}`));
    });
    lines.push("", "Reply to this message with your answers, one per line, like:");
    quiz.questions.slice(0, 3).forEach((q, i) => lines.push(`${i + 1}. ${q.type === "mc" ? "B" : q.type === "tf" ? "True" : "your answer"}`));
    return lines.join("\n");
  }

  // ---- Reading replies (the Slack tools return one formatted text block) ----
  // Channel history: "=== Message from Name <email> (U123) at … ===", "Message TS: …", then the text.
  // Threads: "--- Reply 1 of 3 ---", "From: Name <email> (U123)", "Time: …", "Message TS: …", then the text.
  const metaLine = /^(Reactions|Thread|Files?|Attachments?|Forwarded message from)\b.*$/;
  function bodyAfterTs(block) {
    const lines = block.split("\n");
    const i = lines.findIndex((l) => /^Message TS:/.test(l));
    return lines
      .slice(i + 1)
      .filter((l) => !metaLine.test(l.trim()))
      .join("\n")
      .trim();
  }
  function parseChannel(raw) {
    const text = String(raw || "");
    const channel = text.match(/^Channel:.*\(([A-Z0-9]+)\)\s*$/m)?.[1] || null;
    const messages = text
      .split(/(?=^=== Message from )/m)
      .filter((b) => b.startsWith("=== Message from "))
      .map((b) => ({ userId: b.match(/^=== Message from .*?\(([A-Z0-9]+)\)\s+at /m)?.[1] || "", ts: b.match(/^Message TS:\s*(\S+)/m)?.[1] || "", text: bodyAfterTs(b) }))
      .filter((m) => m.ts);
    return { channel, messages };
  }
  function parseThread(raw) {
    return String(raw || "")
      .split(/(?=^--- Reply \d+ of \d+ ---)/m)
      .filter((b) => /^--- Reply \d+ of \d+ ---/.test(b))
      .map((b) => ({ userId: b.match(/^From:.*\(([A-Z0-9]+)\)\s*$/m)?.[1] || "", ts: b.match(/^Message TS:\s*(\S+)/m)?.[1] || "", text: bodyAfterTs(b) }))
      .filter((m) => m.ts);
  }

  // Everything the trainee wrote after the quiz: thread replies and plain DM messages.
  async function traineeReplies(rec) {
    const s = slack();
    const found = new Map();
    const keep = (m) => m.userId === rec.slack_user_id && parseFloat(m.ts) > parseFloat(rec.ts) && m.text && found.set(m.ts, m);
    const errors = [];
    await s
      .call("slack_read_thread", { channel_id: rec.channel || rec.slack_user_id, message_ts: rec.ts, response_format: "detailed" }, { cache: false })
      .then((r) => parseThread(r?.payload?.messages).forEach(keep))
      .catch((e) => errors.push(e));
    await s
      .call("slack_read_channel", { channel_id: rec.slack_user_id, oldest: rec.ts, limit: 50, response_format: "detailed" }, { cache: false })
      .then((r) => parseChannel(r?.payload?.messages).messages.forEach(keep))
      .catch((e) => errors.push(e));
    if (errors.length === 2) throw errors[0];
    return [...found.values()].sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts)).map((m) => m.text).join("\n");
  }

  // ---- Checking ----
  // "1. B", "1) b", "Q1: true", "#2 - answer"; lines without a number continue the answer above.
  function parseAnswers(text, count) {
    const clean = String(text || "")
      .replace(/[*_`~]/g, "")
      .replace(/\s+(?=(?:q(?:uestion)?\s*)?\d{1,2}\s*[.)]\s)/gi, "\n");
    const answers = {};
    let current = null;
    clean.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*(?:q(?:uestion)?\s*)?#?(\d{1,2})\s*(?:[.):\-–]\s*|\s+)(.*)$/i);
      if (m && +m[1] >= 1 && +m[1] <= count) {
        current = +m[1];
        answers[current] = m[2].trim();
      } else if (current && line.trim()) answers[current] = `${answers[current]} ${line.trim()}`.trim();
    });
    if (!Object.keys(answers).length && count === 1 && clean.trim()) answers[1] = clean.trim();
    return answers;
  }
  function mcChoice(q, raw) {
    const a = String(raw || "").trim();
    if (!a) return null;
    const letter = a.match(/^\(?([a-f])\)?(?=$|[\s.):,-])/i);
    if (letter) {
      const i = LETTERS.indexOf(letter[1].toUpperCase());
      if (i < q.choices.length) return i;
    }
    const low = a.toLowerCase();
    const exact = q.choices.findIndex((c) => c.trim().toLowerCase() === low);
    if (exact !== -1) return exact;
    const partial = q.choices.findIndex((c) => c.trim().length >= 3 && (low.includes(c.trim().toLowerCase()) || (low.length >= 3 && c.toLowerCase().includes(low))));
    return partial === -1 ? null : partial;
  }
  const tfValue = (raw) => {
    const a = String(raw || "").trim().toLowerCase();
    if (/^(t|true|yes|y|tama|correct)\b/.test(a)) return true;
    if (/^(f|false|no|n|mali|wrong)\b/.test(a)) return false;
    return null;
  };

  // Short answers go to Claude in one call per check; without Claude they wait for a manual mark.
  async function gradeShort(items) {
    if (!items.length) return {};
    const sample = await sampleReady;
    if (!sample) return {};
    const prompt = [
      "You are grading short-answer quiz responses from call-center trainees.",
      "For each item, decide if the trainee's answer is correct: it must match the meaning of the answer key (wording may differ; minor typos are fine; a vague or partly wrong answer is not correct).",
      'Reply with JSON only: {"results":[{"key":"<key>","correct":true|false,"reason":"<one short sentence>"}]}',
      "",
      JSON.stringify(items.map((x) => ({ key: x.key, question: x.question, answer_key: x.expected, trainee_answer: x.answer }))),
    ].join("\n");
    try {
      const out = await sample.json(prompt, { modelTier: "quick" });
      const map = {};
      (out?.results || []).forEach((r) => r && r.key && (map[r.key] = { correct: !!r.correct, reason: String(r.reason || "") }));
      return map;
    } catch {
      return {};
    }
  }

  // Grades one reply against the quiz as sent. Manual marks are kept while the answer is unchanged.
  function gradeLocal(quiz, text, previous) {
    const answers = parseAnswers(text, quiz.questions.length);
    const results = {};
    const pendingShort = [];
    quiz.questions.forEach((q, i) => {
      const raw = answers[i + 1] ?? "";
      const prev = previous?.results?.[q.id];
      if (prev?.by === "manual" && prev.answer === raw) return void (results[q.id] = prev);
      if (!raw) return void (results[q.id] = { answer: "", correct: false, by: "auto", reason: "No answer" });
      if (q.type === "mc") {
        const pick = mcChoice(q, raw);
        results[q.id] = { answer: raw, correct: pick === q.answer, by: "auto", reason: pick === null ? "Couldn't match a choice" : `Picked ${LETTERS[pick]}` };
      } else if (q.type === "tf") {
        const v = tfValue(raw);
        results[q.id] = { answer: raw, correct: v === q.answer, by: "auto", reason: v === null ? "Not true or false" : v ? "Said True" : "Said False" };
      } else {
        if (prev && prev.answer === raw && prev.by === "claude") return void (results[q.id] = prev);
        results[q.id] = { answer: raw, correct: null, by: "pending", reason: "Waiting for review" };
        pendingShort.push({ qid: q.id, question: q.prompt, expected: q.answer, answer: raw });
      }
    });
    return { answers, results, pendingShort };
  }
  function score(quiz, results) {
    let earned = 0, total = 0, pending = 0;
    quiz.questions.forEach((q) => {
      const pts = Number(q.points) || 1;
      total += pts;
      const r = results?.[q.id];
      if (r?.correct === true) earned += pts;
      if (r?.correct === null || r?.correct === undefined) pending++;
    });
    return { earned, total, pct: total ? Math.round((earned / total) * 100) : 0, pending };
  }

  // Grades a batch of replies: { traineeId: text } → responses (merged with the run's existing ones).
  async function gradeReplies(run, replies, source) {
    const quiz = run.quiz;
    const responses = { ...(run.responses || {}) };
    const allShort = [];
    Object.entries(replies).forEach(([tid, text]) => {
      const g = gradeLocal(quiz, text, responses[tid]);
      responses[tid] = { text, results: g.results, source, checked_at: new Date().toISOString() };
      g.pendingShort.forEach((x) => allShort.push({ ...x, key: `${tid}|${x.qid}` }));
    });
    const graded = await gradeShort(allShort);
    allShort.forEach((x) => {
      const [tid, qid] = x.key.split("|");
      const g = graded[x.key];
      if (g) responses[tid].results[qid] = { answer: x.answer, correct: g.correct, by: "claude", reason: g.reason };
      else responses[tid].results[qid].reason = "Needs your review";
    });
    Object.keys(replies).forEach((tid) => Object.assign(responses[tid], score(quiz, responses[tid].results)));
    return responses;
  }

  // ---- Window UI ----
  const ui = {
    el: null,
    selected: null,
    tab: "questions",
    draft: null, // working copy of the selected quiz
    saveTimer: null,
    saveState: "",
    cohortId: "",
    runId: null,
    busy: "",
    note: "",
  };
  const current = () => allQuizzes().find((q) => q.id === ui.selected) || null;

  function select(id) {
    flushSave();
    ui.selected = id;
    const q = current();
    ui.draft = q ? JSON.parse(JSON.stringify(q)) : null;
    if (ui.draft) ui.draft.questions = ui.draft.questions || [];
    ui.runId = null;
    ui.note = "";
    watchRuns(id);
    draw();
  }
  function queueSave() {
    clearTimeout(ui.saveTimer);
    ui.saveState = "Saving…";
    drawSaveState();
    ui.saveTimer = setTimeout(flushSave, 700);
  }
  function flushSave() {
    if (!ui.saveTimer || !ui.draft) return;
    clearTimeout(ui.saveTimer);
    ui.saveTimer = null;
    const copy = JSON.parse(JSON.stringify(ui.draft));
    saveQuiz(copy).then(
      () => ((ui.saveState = `Saved · ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`), drawSaveState()),
      () => ((ui.saveState = "Couldn't save. Keep this window open and try again."), drawSaveState())
    );
  }
  const drawSaveState = () => {
    const el = ui.el?.querySelector("[data-save-state]");
    if (el) el.textContent = ui.saveState;
  };

  // Problems that stop a quiz from being sent.
  function quizProblems(quiz) {
    const out = [];
    if (!quiz.questions.length) out.push("Add at least one question.");
    quiz.questions.forEach((q, i) => {
      const n = i + 1;
      if (!q.prompt.trim()) out.push(`Question ${n} has no question text.`);
      if (q.type === "mc") {
        if (q.choices.filter((c) => c.trim()).length < 2) out.push(`Question ${n} needs at least two choices.`);
        if (!q.choices[q.answer]?.trim()) out.push(`Question ${n}: mark the correct choice.`);
      }
      if (q.type === "short" && !String(q.answer).trim()) out.push(`Question ${n} needs an answer key so it can be checked.`);
    });
    return out;
  }

  function lastRunAvg(quizId) {
    const list = quizId === runsFor ? runs : [];
    const r = list[0];
    if (!r) return "";
    const done = Object.values(r.responses || {}).filter((x) => x.total);
    return done.length ? ` · last avg ${Math.round(done.reduce((a, x) => a + x.pct, 0) / done.length)}%` : "";
  }

  function sidebarHtml() {
    const list = allQuizzes();
    return `
      <aside class="quiz-side">
        <button type="button" class="btn-primary quiz-new" data-new>+ New quiz</button>
        ${
          !quizzesLoaded
            ? `<p class="muted quiz-side-note">Loading…</p>`
            : !list.length
              ? `<p class="muted quiz-side-note">No quizzes yet.</p>`
              : `<ul class="quiz-list">${list
                  .map(
                    (q) => `<li><button type="button" data-pick="${escapeHtml(q.id)}"${q.id === ui.selected ? ' aria-current="true"' : ""}>
                      <b>${escapeHtml(q.title || "Untitled quiz")}</b>
                      <small>${plural((q.questions || []).length, "question")}${escapeHtml(lastRunAvg(q.id))}</small></button></li>`
                  )
                  .join("")}</ul>`
        }
      </aside>`;
  }

  function questionHtml(q, i, count) {
    const id = escapeHtml(q.id);
    const typeSelect = `<select data-q-type="${id}" aria-label="Question type">${Object.entries(TYPES)
      .map(([k, v]) => `<option value="${k}"${k === q.type ? " selected" : ""}>${v}</option>`)
      .join("")}</select>`;
    let answerHtml;
    if (q.type === "mc")
      answerHtml = `<div class="q-choices">${q.choices
        .map(
          (c, j) => `<div class="q-choice">
            <label class="q-correct" title="Mark as the correct answer"><input type="radio" name="ans-${id}" data-q-answer="${id}" value="${j}"${q.answer === j ? " checked" : ""} /> ${LETTERS[j]}</label>
            <input type="text" data-q-choice="${id}|${j}" value="${escapeHtml(c)}" placeholder="Choice ${LETTERS[j]}" />
            ${q.choices.length > 2 ? `<button type="button" class="q-x" data-q-remove-choice="${id}|${j}" aria-label="Remove choice ${LETTERS[j]}">×</button>` : ""}
          </div>`
        )
        .join("")}
        ${q.choices.length < LETTERS.length ? `<button type="button" class="btn btn-small" data-q-add-choice="${id}">+ Add choice</button>` : ""}
        <p class="muted q-help">Pick the circle next to the correct choice.</p></div>`;
    else if (q.type === "tf")
      answerHtml = `<div class="q-tf">Correct answer:
        <label><input type="radio" name="ans-${id}" data-q-answer="${id}" value="true"${q.answer === true ? " checked" : ""} /> True</label>
        <label><input type="radio" name="ans-${id}" data-q-answer="${id}" value="false"${q.answer === false ? " checked" : ""} /> False</label></div>`;
    else
      answerHtml = `<label class="q-key"><span>Answer key <span class="muted">(what a correct answer must say; Claude checks replies against it)</span></span>
        <textarea rows="2" data-q-key="${id}" placeholder="e.g. Verify the customer's email and ZIP code before discussing the account.">${escapeHtml(q.answer)}</textarea></label>`;
    return `
      <li class="q-card" data-q="${id}">
        <div class="q-head">
          <b>Question ${i + 1}</b>${typeSelect}
          <label class="q-points">Points <input type="number" min="1" max="100" step="1" data-q-points="${id}" value="${escapeHtml(q.points)}" /></label>
          <span class="q-tools">
            <button type="button" class="square-btn" data-q-move="${id}|-1"${i === 0 ? " disabled" : ""} aria-label="Move question up">↑</button>
            <button type="button" class="square-btn" data-q-move="${id}|1"${i === count - 1 ? " disabled" : ""} aria-label="Move question down">↓</button>
            <button type="button" class="square-btn" data-q-delete="${id}" aria-label="Delete question ${i + 1}">🗑</button>
          </span>
        </div>
        <textarea class="q-prompt" rows="2" data-q-prompt="${id}" placeholder="Type the question">${escapeHtml(q.prompt)}</textarea>
        ${answerHtml}
      </li>`;
  }

  function questionsTabHtml(d) {
    const pts = d.questions.reduce((a, q) => a + (Number(q.points) || 1), 0);
    return `
      <div class="quiz-fields">
        <label>Quiz title<input type="text" data-f-title value="${escapeHtml(d.title)}" placeholder="e.g. Week 1 · Refund policy" /></label>
        <label><span>Instructions <span class="muted">(optional, shown above the questions)</span></span><textarea rows="2" data-f-desc placeholder="e.g. Answer within today's shift.">${escapeHtml(d.description || "")}</textarea></label>
        <label class="quiz-pass">Passing score <span><input type="number" min="1" max="100" data-f-pass value="${escapeHtml(d.passing ?? 80)}" /> %</span></label>
      </div>
      <p class="muted quiz-count">${plural(d.questions.length, "question")} · ${plural(pts, "point")} total</p>
      <ol class="q-list">${d.questions.map((q, i) => questionHtml(q, i, d.questions.length)).join("")}</ol>
      <div class="q-add">Add a question:
        <button type="button" class="btn btn-small" data-q-add="mc">+ Multiple choice</button>
        <button type="button" class="btn btn-small" data-q-add="tf">+ True / False</button>
        <button type="button" class="btn btn-small" data-q-add="short">+ Short answer</button>
      </div>`;
  }

  function cohortOptions() {
    const today = localToday();
    const order = { active: 0, upcoming: 1, completed: 2, unscheduled: 3 };
    return cc()
      .data()
      .cohorts.map((c) => ({ c, st: scheduleStatus(cohortSchedule(c.training_start_date), today) }))
      .sort((a, b) => order[a.st] - order[b.st] || (a.c.name || "").localeCompare(b.c.name || ""));
  }
  const cohortMembers = (cohortId) => {
    const { cohorts, trainees } = cc().data();
    const c = cohorts.find((x) => x.id === cohortId);
    const byId = new Map(trainees.map((t) => [t.id, t]));
    return (c?.trainee_ids || []).map((id) => byId.get(id)).filter(Boolean);
  };

  function sendTabHtml(d) {
    const problems = quizProblems(d);
    const opts = cohortOptions();
    if (!ui.cohortId && opts.length) ui.cohortId = (opts.find((o) => o.st === "active") || opts[0]).c.id;
    const members = ui.cohortId ? cohortMembers(ui.cohortId).filter((t) => !isInactive(t)) : [];
    const noEmail = members.filter((t) => !t.slack_user_id && !t.email);
    return `
      ${problems.length ? `<div class="quiz-warn"><b>Fix these before sending:</b><ul>${problems.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul></div>` : ""}
      <div class="quiz-send-row">
        <label>Send to cohort
          <select data-send-cohort>${
            opts.length
              ? opts.map(({ c, st }) => `<option value="${escapeHtml(c.id)}"${c.id === ui.cohortId ? " selected" : ""}>${escapeHtml(c.name)} · ${st === "unscheduled" ? "no start date" : st}</option>`).join("")
              : `<option value="">No cohorts yet</option>`
          }</select></label>
        <button type="button" class="btn-primary" data-send${problems.length || !members.length || ui.busy ? " disabled" : ""}>${ui.busy === "send" ? "Sending…" : `Send to ${plural(members.length, "active trainee")}`}</button>
      </div>
      <p class="muted quiz-send-help">Each active trainee gets the quiz as a Slack direct message from you, and replies with their answers. Inactive trainees are left out.${
        noEmail.length ? ` <b class="warn-text">${noEmail.map((t) => escapeHtml(t.name)).join(", ")} ${noEmail.length === 1 ? "has" : "have"} no work email in Settings → Roster, so ${noEmail.length === 1 ? "they" : "they"} can't be reached on Slack.</b>` : ""
      }</p>
      ${ui.note ? `<p class="quiz-note" role="status">${ui.note}</p>` : ""}
      <h4 class="quiz-h">Message preview <span class="muted quiz-h-note">** shows as bold and _ as italics in Slack</span></h4>
      <pre class="quiz-preview">${escapeHtml(quizMessage(d))}</pre>`;
  }

  function resultsTabHtml(d) {
    if (!runs.length) return `<p class="muted">Not sent yet. Send it from the Send tab; results show up here.</p>${ui.note ? `<p class="quiz-note" role="status">${ui.note}</p>` : ""}`;
    const run = runs.find((r) => r.id === ui.runId) || runs[0];
    ui.runId = run.id;
    const quiz = run.quiz;
    const recs = Object.entries(run.recipients || {});
    const resp = run.responses || {};
    const sent = recs.filter(([, r]) => r.sent);
    // Answers typed in by hand count too, even for someone Slack couldn't reach.
    const reachable = recs.filter(([tid, r]) => r.sent || resp[tid]?.text);
    const answered = reachable.filter(([tid]) => resp[tid]?.text);
    const scored = answered.map(([tid]) => resp[tid]);
    const avg = scored.length ? Math.round(scored.reduce((a, x) => a + x.pct, 0) / scored.length) : null;
    const pass = quiz.passing ?? 80;
    const passed = scored.filter((x) => x.pct >= pass).length;
    const pending = scored.reduce((a, x) => a + (x.pending || 0), 0);
    const perQ = quiz.questions.map((q, i) => {
      const got = scored.filter((x) => x.results?.[q.id]?.correct === true).length;
      return { q, i, got, of: scored.length };
    });
    const rows = recs
      .map(([tid, r]) => ({ tid, r, x: resp[tid] }))
      .sort((a, b) => (b.x?.pct ?? -1) - (a.x?.pct ?? -1) || a.r.name.localeCompare(b.r.name));
    return `
      <div class="quiz-run-row">
        <label>Send
          <select data-run>${runs
            .map((r) => `<option value="${escapeHtml(r.id)}"${r.id === run.id ? " selected" : ""}>${escapeHtml(stamp(r.sent_at))} · ${escapeHtml(r.cohort_name || "Cohort")}</option>`)
            .join("")}</select></label>
        <button type="button" class="btn-primary" data-check${ui.busy ? " disabled" : ""}>${ui.busy === "check" ? "Checking replies…" : "↻ Check replies"}</button>
      </div>
      ${ui.note ? `<p class="quiz-note" role="status">${ui.note}</p>` : ""}
      <div class="stats quiz-stats">
        <div class="stat"><div class="value">${answered.length}<span class="of"> / ${reachable.length}</span></div><div class="label">Replied</div>${sent.length < recs.length ? `<div class="hint">${plural(recs.length - sent.length, "trainee")} not reached on Slack</div>` : ""}</div>
        <div class="stat"><div class="value">${avg === null ? "—" : `${avg}%`}</div><div class="label">Average score</div></div>
        <div class="stat"><div class="value">${scored.length ? `${passed}<span class="of"> / ${scored.length}</span>` : "—"}</div><div class="label">Passed (${pass}% or more)</div></div>
        <div class="stat"><div class="value">${pending}</div><div class="label">Answers to review</div><div class="hint">${pending ? "Open a trainee to mark them" : "Nothing waiting"}</div></div>
      </div>
      <h4 class="quiz-h">By question</h4>
      <ul class="quiz-byq">${perQ
        .map(
          ({ q, i, got, of }) => `<li><span class="byq-n">${i + 1}</span><span class="byq-text">${escapeHtml(q.prompt)}<small>${TYPES[q.type]}</small></span>
            <span class="byq-bar" aria-hidden="true"><span style="width:${of ? Math.round((got / of) * 100) : 0}%"></span></span><span class="byq-pct">${of ? `${pctText(got, of)} <small>${got}/${of}</small>` : "—"}</span></li>`
        )
        .join("")}</ul>
      <h4 class="quiz-h">By trainee</h4>
      <table class="quiz-table"><thead><tr><th>Trainee</th><th>Status</th><th>Score</th><th></th></tr></thead><tbody>${rows
        .map(({ tid, r, x }) => {
          const status = x?.text
            ? (x.pending ? `<span class="chip warn">${plural(x.pending, "answer")} to review</span>` : x.pct >= pass ? `<span class="chip ok">Passed</span>` : `<span class="chip bad">Below ${pass}%</span>`) +
              (x.source === "manual" ? ` <small class="muted">entered by hand</small>` : "")
            : !r.sent
              ? `<span class="chip bad">Not sent</span> <small class="muted">${escapeHtml(r.error || "")}</small>`
              : `<span class="chip">No reply yet</span>`;
          return `<tr><td>${escapeHtml(r.name)}</td><td>${status}</td><td>${x?.text ? `<b>${x.pct}%</b> <small class="muted">${x.earned}/${x.total} pts</small>` : "—"}</td>
            <td><button type="button" class="btn btn-small" data-view="${escapeHtml(tid)}">${x?.text ? "View answers" : "Enter answers"}</button></td></tr>`;
        })
        .join("")}</tbody></table>
      <p class="muted quiz-send-help">Scores use the quiz as it was sent on ${escapeHtml(stamp(run.sent_at))}, so later edits to the questions don't change them.</p>`;
  }

  function draw() {
    const el = ui.el;
    if (!el || !cc()) return;
    const d = ui.draft;
    const top = el.querySelector(".quiz-main")?.scrollTop || 0;
    el.innerHTML = `
      <div class="quiz-layout">
        ${sidebarHtml()}
        <section class="quiz-main app-body">
          ${
            !d
              ? `<div class="quiz-empty"><h3>Quiz</h3><p class="muted">Write a quiz, send it to a cohort over Slack, and check the replies. Multiple choice and true/false are checked automatically; short answers are checked by Claude against your answer key, and you can override any result.</p>
                  <button type="button" class="btn-primary" data-new>+ New quiz</button></div>`
              : `<div class="quiz-top">
                  <h3>${escapeHtml(d.title || "Untitled quiz")}</h3>
                  <span class="muted quiz-save" data-save-state role="status">${escapeHtml(ui.saveState)}</span>
                  <button type="button" class="square-btn kebab" data-quiz-menu aria-label="Quiz options">⋮</button>
                </div>
                <div class="quiz-tabs" role="tablist">${[
                  ["questions", "Questions"],
                  ["send", "Send"],
                  ["results", `Results${runs.length ? ` (${runs.length})` : ""}`],
                ]
                  .map(([k, v]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${ui.tab === k}">${v}</button>`)
                  .join("")}</div>
                <div class="quiz-body">${ui.tab === "questions" ? questionsTabHtml(d) : ui.tab === "send" ? sendTabHtml(d) : resultsTabHtml(d)}</div>`
          }
        </section>
      </div>`;
    const main = el.querySelector(".quiz-main");
    if (main) main.scrollTop = top;
  }

  // ---- Editing (inputs update the draft without redrawing, so typing is never interrupted) ----
  const findQ = (id) => ui.draft?.questions.find((q) => q.id === id);
  function onInput(e) {
    const t = e.target, d = ui.draft;
    if (!d) return;
    const ds = t.dataset;
    if ("fTitle" in ds) {
      d.title = t.value;
      const h = ui.el.querySelector(".quiz-top h3");
      if (h) h.textContent = t.value || "Untitled quiz";
    } else if ("fDesc" in ds) d.description = t.value;
    else if ("fPass" in ds) d.passing = Math.min(100, Math.max(1, Number(t.value) || 80));
    else if (ds.qPrompt) findQ(ds.qPrompt).prompt = t.value;
    else if (ds.qKey) findQ(ds.qKey).answer = t.value;
    else if (ds.qPoints) findQ(ds.qPoints).points = Math.max(1, Number(t.value) || 1);
    else if (ds.qChoice) {
      const [qid, j] = ds.qChoice.split("|");
      findQ(qid).choices[+j] = t.value;
    } else return;
    queueSave();
  }
  function onChange(e) {
    const t = e.target, ds = t.dataset, d = ui.draft;
    if (ds.qAnswer) {
      const q = findQ(ds.qAnswer);
      q.answer = q.type === "tf" ? t.value === "true" : Number(t.value);
      return queueSave();
    }
    if (ds.qType) {
      const q = findQ(ds.qType);
      const fresh = blankQuestion(t.value);
      Object.assign(q, { type: t.value, choices: fresh.choices, answer: fresh.answer });
      if (t.value !== "mc") delete q.choices;
      queueSave();
      return draw();
    }
    if ("sendCohort" in ds) {
      ui.cohortId = t.value;
      ui.note = "";
      return draw();
    }
    if ("run" in ds) {
      ui.runId = t.value;
      ui.note = "";
      return draw();
    }
    if (d && ("fPass" in ds || "qPoints" in ds)) draw();
  }

  function onClick(e) {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    const ds = b.dataset, d = ui.draft;
    if ("new" in ds) return createQuiz();
    if (ds.pick) return select(ds.pick);
    if (ds.tab) {
      flushSave();
      ui.tab = ds.tab;
      ui.note = "";
      return draw();
    }
    if ("quizMenu" in ds) {
      e.stopPropagation();
      return openMenu(b, [
        { label: "Duplicate", run: () => createQuiz(d) },
        { label: "Delete quiz", danger: true, run: () => confirmDelete() },
      ]);
    }
    if (!d) return;
    if (ds.qAdd) {
      d.questions.push(blankQuestion(ds.qAdd));
      queueSave();
      draw();
      ui.el.querySelector(`[data-q-prompt="${CSS.escape(d.questions.at(-1).id)}"]`)?.focus();
      return;
    }
    if (ds.qDelete) {
      d.questions = d.questions.filter((q) => q.id !== ds.qDelete);
      queueSave();
      return draw();
    }
    if (ds.qMove) {
      const [id, dir] = ds.qMove.split("|");
      const i = d.questions.findIndex((q) => q.id === id), j = i + Number(dir);
      if (j < 0 || j >= d.questions.length) return;
      [d.questions[i], d.questions[j]] = [d.questions[j], d.questions[i]];
      queueSave();
      draw();
      return ui.el.querySelector(`[data-q-move="${CSS.escape(id)}|${dir}"]`)?.focus();
    }
    if (ds.qAddChoice) {
      findQ(ds.qAddChoice).choices.push("");
      queueSave();
      return draw();
    }
    if (ds.qRemoveChoice) {
      const [qid, j] = ds.qRemoveChoice.split("|");
      const q = findQ(qid);
      q.choices.splice(+j, 1);
      if (q.answer === +j) q.answer = 0;
      else if (q.answer > +j) q.answer--;
      queueSave();
      return draw();
    }
    if ("send" in ds) return confirmSend();
    if ("check" in ds) return checkReplies();
    if (ds.view) return openTrainee(ds.view);
  }

  function createQuiz(from) {
    flushSave();
    const now = new Date().toISOString();
    const quiz = from
      ? { ...JSON.parse(JSON.stringify(from)), id: `q${Date.now()}`, title: `${from.title || "Untitled quiz"} (copy)`, created_at: now }
      : { id: `q${Date.now()}`, title: "Untitled quiz", description: "", passing: 80, questions: [blankQuestion("mc")], created_at: now };
    saveQuiz(quiz).then(() => {
      ui.tab = "questions";
      select(quiz.id);
      if (!current()) {
        // The db snapshot hasn't arrived yet; show the new quiz straight away.
        ui.draft = JSON.parse(JSON.stringify(quiz));
        draw();
      }
      ui.el?.querySelector("[data-f-title]")?.select();
    });
  }

  function sheet(html, cls = "") {
    const win = ui.el?.closest(".window");
    if (!win || win.querySelector(".sheet")) return null;
    const s = document.createElement("div");
    s.className = "sheet";
    s.innerHTML = `<div class="sheet-card ${cls}" role="dialog">${html}</div>`;
    win.appendChild(s);
    const close = () => s.remove();
    s.addEventListener("click", (e) => (e.target === s || e.target.closest("[data-cancel]")) && close());
    s.addEventListener("keydown", (e) => e.key === "Escape" && close());
    return { s, close };
  }

  function confirmDelete() {
    const d = ui.draft;
    const x = sheet(`<h3>Delete “${escapeHtml(d.title || "Untitled quiz")}”?</h3>
      <p class="muted">The quiz and its results are removed. Slack messages already sent stay in Slack. This can't be undone.</p>
      <div class="sheet-actions"><button type="button" class="btn" data-cancel>Cancel</button><button type="button" class="btn-danger" data-yes>Delete quiz</button></div>`);
    if (!x) return;
    x.s.querySelector("[data-yes]").addEventListener("click", () => {
      clearTimeout(ui.saveTimer);
      ui.saveTimer = null;
      deleteQuiz(d.id).then(() => {
        x.close();
        ui.selected = null;
        ui.draft = null;
        watchRuns(null);
        draw();
      });
    });
    x.s.querySelector("[data-cancel]").focus();
  }

  // ---- Sending ----
  function confirmSend() {
    flushSave();
    const d = JSON.parse(JSON.stringify(ui.draft));
    const cohort = cc().data().cohorts.find((c) => c.id === ui.cohortId);
    const members = cohortMembers(ui.cohortId).filter((t) => !isInactive(t));
    if (!cohort || !members.length) return;
    const x = sheet(
      `<h3>Send “${escapeHtml(d.title)}” to ${escapeHtml(cohort.name)}?</h3>
      <p class="muted">${plural(members.length, "trainee")} will get it as a Slack direct message from you: ${members.map((t) => escapeHtml(t.name)).join(", ")}.</p>
      <div class="sheet-actions"><button type="button" class="btn" data-cancel>Cancel</button><button type="button" class="btn-primary" data-yes>Send now</button></div>`,
      "quiz-confirm"
    );
    if (!x) return;
    x.s.querySelector("[data-yes]").addEventListener("click", () => {
      x.close();
      sendQuiz(d, cohort, members);
    });
    x.s.querySelector("[data-yes]").focus();
  }

  async function sendQuiz(quiz, cohort, members) {
    const s = slack();
    if (!s) {
      ui.note = "Slack isn't available right now.";
      return draw();
    }
    const run = {
      id: `r${Date.now()}`,
      sent_at: new Date().toISOString(),
      cohort_id: cohort.id,
      cohort_name: cohort.name,
      quiz: { title: quiz.title, description: quiz.description || "", passing: quiz.passing ?? 80, questions: quiz.questions },
      recipients: {},
      responses: {},
    };
    const message = quizMessage(quiz);
    ui.busy = "send";
    let ok = 0;
    for (const [i, t] of members.entries()) {
      ui.note = escapeHtml(`Sending ${i + 1} of ${members.length}: ${t.name}…`);
      draw();
      const rec = { name: t.name, slack_user_id: null, channel: null, ts: null, sent: false, error: "" };
      try {
        const userId = await s.userIdFor(t);
        if (!userId) throw Object.assign(new Error(t.email ? "No Slack account matches their work email" : "No work email on file"), { plain: true });
        rec.slack_user_id = userId;
        await s.sendDirect(userId, message);
        // The newest message in the DM right after sending is the quiz; its ts anchors the replies.
        const r = await s.call("slack_read_channel", { channel_id: userId, limit: 3, response_format: "detailed" }, { cache: false });
        const parsed = parseChannel(r?.payload?.messages);
        const mine = parsed.messages.filter((m) => m.userId !== userId).sort((a, b) => parseFloat(b.ts) - parseFloat(a.ts))[0];
        rec.channel = parsed.channel;
        rec.ts = mine?.ts || String(Date.parse(run.sent_at) / 1000);
        rec.sent = true;
        ok++;
      } catch (err) {
        rec.error = err?.plain ? err.message : s.errorText(err);
      }
      run.recipients[t.id] = rec;
    }
    await saveRun(ui.selected, run).catch(() => {});
    ui.busy = "";
    ui.runId = run.id;
    ui.tab = "results";
    ui.note = escapeHtml(ok === members.length ? `Sent to ${plural(ok, "trainee")} ✓ Click “Check replies” once they've answered.` : `Sent to ${ok} of ${members.length}. See “Not sent” below for why.`);
    draw();
  }

  // ---- Checking replies ----
  async function checkReplies() {
    const run = runs.find((r) => r.id === ui.runId);
    const s = slack();
    if (!run || !s) return;
    ui.busy = "check";
    ui.note = "Reading replies on Slack…";
    draw();
    const replies = {};
    let failed = 0;
    for (const [tid, rec] of Object.entries(run.recipients || {})) {
      if (!rec.sent || !rec.slack_user_id) continue;
      if (run.responses?.[tid]?.source === "manual") continue; // typed in by hand; keep it
      try {
        const text = await traineeReplies(rec);
        if (text) replies[tid] = text;
      } catch {
        failed++;
      }
    }
    const n = Object.keys(replies).length;
    if (n) ui.note = `Checking ${plural(n, "reply")}…`;
    draw();
    try {
      const responses = await gradeReplies(run, replies, "slack");
      await saveRun(ui.selected, { ...run, responses });
      const waiting = Object.values(responses).reduce((a, x) => a + (x.pending || 0), 0);
      ui.note = escapeHtml(
        `${n ? `Checked ${plural(n, "reply")} ✓` : "No new replies yet."}${failed ? ` Couldn't read ${failed} DM${failed === 1 ? "" : "s"}; try again.` : ""}${waiting ? ` ${plural(waiting, "short answer")} still need${waiting === 1 ? "s" : ""} your review.` : ""}`
      );
    } catch {
      ui.note = "Couldn't save the results. Try again.";
    }
    ui.busy = "";
    draw();
  }

  // One trainee: their answers, what was checked and why, with manual marks and hand entry.
  function openTrainee(tid) {
    const run = runs.find((r) => r.id === ui.runId);
    if (!run) return;
    const quiz = run.quiz;
    const rec = run.recipients[tid];
    const x = sheet("", "quiz-detail");
    if (!x) return;
    let editing = !run.responses?.[tid]?.text;
    let local = null; // this sheet's last save, used until the saved copy comes back
    const latest = () => {
      const fromDb = runs.find((r) => r.id === run.id) || run;
      const mine = local?.responses?.[tid], theirs = fromDb.responses?.[tid];
      return mine && (!theirs || (mine.checked_at || "") > (theirs.checked_at || "")) ? local : fromDb;
    };
    const render = () => {
      const live = latest();
      const resp = live.responses?.[tid];
      const sc = resp ? score(quiz, resp.results) : null;
      x.s.querySelector(".sheet-card").innerHTML = `
        <h3>${escapeHtml(rec.name)} · ${escapeHtml(quiz.title)}</h3>
        <p class="muted">${resp?.text ? `<b>${sc.pct}%</b> · ${sc.earned}/${sc.total} points${sc.pending ? ` · ${plural(sc.pending, "answer")} to review` : ""} · ${resp.source === "manual" ? "entered by hand" : "from Slack"} · checked ${escapeHtml(stamp(resp.checked_at))}` : "No answers yet."}</p>
        ${
          editing
            ? `<label class="quiz-paste">Their answers, one per line (e.g. “1. B”)
                <textarea rows="${Math.min(12, quiz.questions.length + 2)}" data-paste>${escapeHtml(resp?.text || "")}</textarea></label>
               <p class="sheet-status" data-status></p>
               <div class="sheet-actions"><button type="button" class="btn" data-${resp?.text ? "stop-edit" : "cancel"}>Cancel</button><button type="button" class="btn-primary" data-grade>Check these answers</button></div>`
            : `<ol class="quiz-answers">${quiz.questions
                .map((q, i) => {
                  const r = resp.results?.[q.id] || {};
                  const key = q.type === "mc" ? `${LETTERS[q.answer]}) ${q.choices[q.answer]}` : q.type === "tf" ? (q.answer ? "True" : "False") : q.answer;
                  const chip = r.correct === true ? `<span class="chip ok">Correct</span>` : r.correct === false ? `<span class="chip bad">Wrong</span>` : `<span class="chip warn">To review</span>`;
                  return `<li>
                    <div class="qa-q"><b>${i + 1}.</b> ${escapeHtml(q.prompt)} <small class="muted">${TYPES[q.type]} · ${Number(q.points) || 1} pt</small></div>
                    <div class="qa-row"><span class="qa-label">Answered</span><span>${r.answer ? escapeHtml(r.answer) : '<i class="muted">No answer</i>'}</span></div>
                    <div class="qa-row"><span class="qa-label">Key</span><span>${escapeHtml(key)}</span></div>
                    <div class="qa-row"><span class="qa-label">Result</span><span>${chip} <small class="muted">${escapeHtml(r.by === "manual" ? "Marked by you" : r.by === "claude" ? `Claude: ${r.reason}` : r.reason || "")}</small></span></div>
                    <div class="qa-mark"><button type="button" class="btn btn-small" data-mark="${escapeHtml(q.id)}|1">Mark correct</button><button type="button" class="btn btn-small" data-mark="${escapeHtml(q.id)}|0">Mark wrong</button></div>
                  </li>`;
                })
                .join("")}</ol>
               <details class="quiz-raw"><summary>Their reply as written</summary><pre>${escapeHtml(resp.text)}</pre></details>
               <div class="sheet-actions"><button type="button" class="btn" data-edit>Edit answers</button><span class="flex"></span><button type="button" class="btn-primary" data-cancel>Close</button></div>`
        }`;
      x.s.querySelector("[data-paste]")?.focus();
    };
    render();
    x.s.addEventListener("click", async (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const live = latest();
      if ("edit" in b.dataset) return (editing = true), render();
      if ("stopEdit" in b.dataset) return (editing = false), render();
      if ("grade" in b.dataset) {
        const text = x.s.querySelector("[data-paste]").value.trim();
        const status = x.s.querySelector("[data-status]");
        if (!text) return void (status.textContent = "Type or paste their answers first.");
        b.disabled = true;
        status.textContent = "Checking…";
        const responses = await gradeReplies(live, { [tid]: text }, "manual");
        local = { ...live, responses };
        await saveRun(ui.selected, local).catch(() => (status.textContent = "Couldn't save. Try again."));
        editing = false;
        return render();
      }
      if (b.dataset.mark) {
        const [qid, v] = b.dataset.mark.split("|");
        const resp = JSON.parse(JSON.stringify(live.responses[tid]));
        const r = resp.results[qid] || { answer: "" };
        resp.results[qid] = { ...r, correct: v === "1", by: "manual", reason: "Marked by you" };
        Object.assign(resp, score(quiz, resp.results), { checked_at: new Date().toISOString() });
        local = { ...live, responses: { ...live.responses, [tid]: resp } };
        await saveRun(ui.selected, local).catch(() => {});
        return render();
      }
    });
    const off = (() => {
      const f = () => x.s.isConnected && !editing && render();
      listeners.add(f);
      return () => listeners.delete(f);
    })();
    new MutationObserver((_, obs) => !x.s.isConnected && (off(), obs.disconnect())).observe(x.s.parentElement, { childList: true });
  }

  window.TrainerQuiz = {
    render(el) {
      ui.el = el;
      el.classList.add("flush", "quiz-root");
      el.addEventListener("input", onInput);
      el.addEventListener("change", onChange);
      el.addEventListener("click", onClick);
      const redraw = () => {
        if (!ui.el) return;
        // Never redraw under the cursor; the next change will catch up.
        if (ui.el.contains(document.activeElement) && document.activeElement.matches("input, textarea, select")) return;
        // Take the saved copy of the open quiz unless there are edits still waiting to save.
        const q = current();
        if (q && !ui.saveTimer) ui.draft = { ...JSON.parse(JSON.stringify(q)), questions: q.questions || [] };
        draw();
      };
      listeners.add(redraw);
      ui.offData = () => listeners.delete(redraw);
      ui.offCc = cc()?.onChange(() => ui.tab === "send" && draw());
      if (!ui.selected && allQuizzes().length) select(allQuizzes()[0].id);
      else draw();
    },
    onClose() {
      flushSave();
      ui.offData?.();
      ui.offCc?.();
      ui.el = null;
    },
    // For tests and reuse.
    _parseAnswers: parseAnswers,
  };
})();
