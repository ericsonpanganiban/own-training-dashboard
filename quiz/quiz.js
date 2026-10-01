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
  const plural = (n, w) => `${n} ${n === 1 ? w : w.endsWith("z") ? `${w}zes` : w.endsWith("y") && !/[aeiou]y$/.test(w) ? `${w.slice(0, -1)}ies` : `${w}s`}`;
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
          if (allRuns) allRuns[quizId] = runs;
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
      if (allRuns) allRuns[quizId] = mem.runs[quizId];
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
      const sentAt = responses[tid]?.feedback_sent_at;
      responses[tid] = { text, results: g.results, source, checked_at: new Date().toISOString(), ...(sentAt ? { feedback_sent_at: sentAt } : {}) };
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
  // Side panel sections. The roster is each cohort's trainees from Cohorts; a quiz goes to a cohort.
  const SECTIONS = [
    { key: "roster", label: "Roster", icon: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-4-6"/>' },
    { key: "send", label: "Send Quiz", icon: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>' },
    { key: "check", label: "Check Quiz", icon: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' },
    { key: "buckets", label: "Quiz Buckets", icon: '<path d="M3 7h18l-2 13H5z"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/>' },
    { key: "links", label: "Quiz Links", icon: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>' },
    { key: "resources", label: "Resources", icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' },
    { key: "trash", label: "Trash", icon: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>' },
  ];
  const SECTION_KEY = "trainer.quizSection";

  // Quiz types and their weight in a trainee's weighted average (quiz_settings/weights).
  const DEFAULT_TYPES = [
    { id: "short", name: "Short quiz", weight: 30 },
    { id: "weekly", name: "Weekly quiz", weight: 70 },
  ];
  let quizTypes = DEFAULT_TYPES;
  dbReady.then((d) => {
    if (!d) return;
    d.doc("quiz_settings/weights").onSnapshot(
      (snap) => {
        const got = snap?.exists ? JSON.parse(JSON.stringify(snap.data() || {})).types : null;
        quizTypes = Array.isArray(got) && got.length ? got : DEFAULT_TYPES;
        notify();
      },
      () => {}
    );
  });
  function saveQuizTypes(types) {
    quizTypes = types;
    notify();
    return db ? db.doc("quiz_settings/weights").set({ types, updated_at: new Date().toISOString() }) : Promise.resolve();
  }
  const typeOf = (quiz) => quizTypes.find((t) => t.id === quiz?.category) || null;
  const savedSection = (() => {
    try {
      return localStorage.getItem(SECTION_KEY);
    } catch {
      return null;
    }
  })();

  const ui = {
    el: null,
    section: SECTIONS.some((x) => x.key === savedSection) ? savedSection : "roster",
    selected: null,
    draft: null, // working copy of the selected quiz
    saveTimer: null,
    saveState: "",
    cohortId: "",
    runId: null,
    traineeId: null, // Roster: the trainee whose quiz page is open
    checkView: "", // Check Quiz: "" (results) or "all" (every trainee's answers on one page)
    onlyWrong: false, // All answers: show only wrong / to-review answers
    checkCohort: "", // Check Quiz: the cohort being checked ("" = pick a cohort)
    anLevel: "cohort", // Analyze at: pool | cohort | trainee
    anTrainee: "",
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
    ui.checkView = "";
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

  function navHtml() {
    return `
      <nav class="quiz-side" aria-label="Quiz sections">
        ${SECTIONS.map(
          (x) => `<button type="button" class="quiz-nav" data-section="${x.key}"${x.key === ui.section ? ' aria-current="page"' : ""}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${x.icon}</svg>
            <span>${x.label}</span></button>`
        ).join("")}
      </nav>`;
  }

  // The quiz list inside Quiz Buckets.
  function bucketListHtml() {
    const list = allQuizzes();
    return `
      <aside class="bucket-list">
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
                      <small>${typeOf(q) ? `${escapeHtml(typeOf(q).name)} · ` : "No type · "}${plural((q.questions || []).length, "question")}${escapeHtml(lastRunAvg(q.id))}</small></button></li>`
                  )
                  .join("")}</ul>`
        }
      </aside>`;
  }

  // Pick which quiz Send Quiz / Check Quiz work on.
  function quizPickerHtml(label) {
    const list = allQuizzes();
    return `<label>${label}
      <select data-pick-quiz>${list.map((q) => `<option value="${escapeHtml(q.id)}"${q.id === ui.selected ? " selected" : ""}>${escapeHtml(q.title || "Untitled quiz")}</option>`).join("")}</select></label>`;
  }
  const noQuizzes = () =>
    `<p class="muted">No quizzes yet. Write one in <button type="button" class="linkish" data-section="buckets">Quiz Buckets</button> first.</p>`;

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
        <div class="quiz-row2">
          <label class="quiz-pass">Passing score <span><input type="number" min="1" max="100" data-f-pass value="${escapeHtml(d.passing ?? 80)}" /> %</span></label>
          <label class="quiz-type">Quiz type
            <select data-f-type>
              <option value=""${typeOf(d) ? "" : " selected"}>— Choose a type —</option>
              ${quizTypes.map((t) => `<option value="${escapeHtml(t.id)}"${d.category === t.id ? " selected" : ""}>${escapeHtml(t.name)} · ${Number(t.weight) || 0}% of the weighted average</option>`).join("")}
            </select></label>
          <button type="button" class="linkish quiz-type-edit" data-edit-weights>Edit types & weights</button>
        </div>
        ${typeOf(d) ? "" : `<p class="warn-text quiz-type-warn">Pick a type so this quiz counts toward the weighted average.</p>`}
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

  // Who gets the quiz: picked from the chosen cohort. Active trainees Slack can reach start ticked;
  // inactive trainees start unticked but can be added; anyone without a work email can't be picked.
  const reachable = (t) => !!(t.slack_user_id || t.email);
  function pickedIds() {
    const members = ui.cohortId ? cohortMembers(ui.cohortId) : [];
    if (ui.picks?.cohortId !== ui.cohortId) ui.picks = { cohortId: ui.cohortId, ids: new Set(members.filter((t) => !isInactive(t) && reachable(t)).map((t) => t.id)) };
    // Drop anyone who has left the cohort since.
    const ids = new Set(members.map((t) => t.id));
    [...ui.picks.ids].forEach((id) => !ids.has(id) && ui.picks.ids.delete(id));
    return ui.picks.ids;
  }
  const pickedMembers = () => {
    const ids = pickedIds();
    return cohortMembers(ui.cohortId).filter((t) => ids.has(t.id) && reachable(t));
  };
  function recipientsHtml() {
    const members = cohortMembers(ui.cohortId);
    if (!members.length) return `<p class="muted">No trainees in this cohort yet. Add them from Cohorts with + Add Trainee.</p>`;
    const ids = pickedIds();
    const row = (t) => {
      const can = reachable(t);
      return `<label class="pick-row${can ? "" : " is-off"}"><input type="checkbox" data-pick-trainee="${escapeHtml(t.id)}"${ids.has(t.id) && can ? " checked" : ""}${can ? "" : " disabled"} />
        <span class="pick-name">${escapeHtml(t.name)}</span>
        ${isInactive(t) ? `<span class="chip">Inactive</span>` : ""}
        ${can ? (t.slack_user_id ? "" : `<small class="muted">Matched on first send</small>`) : `<small class="bad-text">No work email, can't be reached</small>`}</label>`;
    };
    const active = members.filter((t) => !isInactive(t)), inactive = members.filter(isInactive);
    const n = pickedMembers().length;
    return `
      <div class="pick-head">
        <b>Trainees</b> <span class="muted">${n} of ${members.filter(reachable).length} picked</span>
        <span class="pick-tools"><button type="button" class="linkish" data-pick-all="active">All active</button> · <button type="button" class="linkish" data-pick-all="all">Everyone</button> · <button type="button" class="linkish" data-pick-all="none">None</button></span>
      </div>
      <div class="pick-grid">${active.map(row).join("")}</div>
      ${inactive.length ? `<p class="muted pick-sub">Inactive</p><div class="pick-grid">${inactive.map(row).join("")}</div>` : ""}`;
  }

  function sendTabHtml(d) {
    const problems = quizProblems(d);
    const opts = cohortOptions();
    if (!ui.cohortId && opts.length) ui.cohortId = (opts.find((o) => o.st === "active") || opts[0]).c.id;
    const members = ui.cohortId ? pickedMembers() : [];
    return `
      ${problems.length ? `<div class="quiz-warn"><b>Fix these before sending:</b><ul>${problems.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul></div>` : ""}
      <div class="quiz-send-row">
        ${quizPickerHtml("Quiz")}
        <label>Send to cohort
          <select data-send-cohort>${
            opts.length
              ? opts.map(({ c, st }) => `<option value="${escapeHtml(c.id)}"${c.id === ui.cohortId ? " selected" : ""}>${escapeHtml(c.name)} · ${st === "unscheduled" ? "no start date" : st}</option>`).join("")
              : `<option value="">No cohorts yet</option>`
          }</select></label>
        <button type="button" class="btn-primary" data-send${problems.length || !members.length || ui.busy ? " disabled" : ""}>${ui.busy === "send" ? "Sending…" : members.length ? `Send to ${plural(members.length, "trainee")}` : "Pick trainees to send to"}</button>
      </div>
      <div class="pick-box">${ui.cohortId ? recipientsHtml() : ""}</div>
      <p class="muted quiz-send-help">Each picked trainee gets the quiz as a Slack direct message from you, and replies with their answers. Add a missing work email in Settings → Roster.</p>
      ${ui.note ? `<p class="quiz-note" role="status">${ui.note}</p>` : ""}
      <h4 class="quiz-h">Message preview <span class="muted quiz-h-note">** shows as bold and _ as italics in Slack</span></h4>
      <pre class="quiz-preview">${escapeHtml(quizMessage(d))}</pre>`;
  }

  // ---- Check Quiz: cohorts first, then a cohort's quizzes and sends ----
  // Quizzes sent to a cohort, newest send first: [{ quizId, title, lastAt, sends }].
  function quizzesSentTo(cohortId) {
    const byId = new Map(allQuizzes().map((q) => [q.id, q]));
    return Object.entries(allRuns || {})
      .map(([quizId, list]) => {
        const mine = list.filter((r) => r.cohort_id === cohortId);
        if (!mine.length || !byId.has(quizId)) return null;
        const lastAt = mine.reduce((m, r) => (r.sent_at > m ? r.sent_at : m), "");
        return { quizId, title: byId.get(quizId).title || mine[0].quiz?.title || "Untitled quiz", lastAt, sends: mine.length };
      })
      .filter(Boolean)
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }
  function cohortCheckStats(cohortId) {
    let sent = 0, answered = 0, sum = 0, lastAt = "";
    Object.values(allRuns || {}).forEach((list) =>
      list.forEach((r) => {
        if (r.cohort_id !== cohortId) return;
        if (r.sent_at > lastAt) lastAt = r.sent_at;
        Object.entries(r.recipients || {}).forEach(([tid, rec]) => {
          const x = r.responses?.[tid];
          if (rec.sent || x?.text) sent++;
          if (x?.text && x.total) (answered++, (sum += x.pct));
        });
      })
    );
    return { sent, answered, avg: answered ? Math.round(sum / answered) : null, lastAt };
  }
  const STATUS_LABEL = { active: "Current batch", upcoming: "Upcoming", completed: "Completed", unscheduled: "No start date" };

  function enterCohort(id) {
    ui.checkCohort = id;
    ui.checkView = "";
    ui.note = "";
    ui.anLevel = "cohort";
    ui.anTrainee = "";
    const sent = quizzesSentTo(id);
    if (sent.length && !sent.some((x) => x.quizId === ui.selected)) return select(sent[0].quizId);
    ui.runId = null;
    draw();
  }

  function checkHtml() {
    if (!allQuizzes().length) return noQuizzes();
    if (!allRuns) {
      loadAllRuns().then(() => ui.el && ui.section === "check" && draw());
      return `<p class="muted">Loading sends…</p>`;
    }
    const cohort = ui.checkCohort && cc().data().cohorts.find((c) => c.id === ui.checkCohort);
    if (!cohort) {
      ui.checkCohort = "";
      return checkLandingHtml();
    }
    return cohortCheckHtml(cohort);
  }

  // The cohort level: every cohort (current batch first) and a trainee finder across all of them.
  function checkLandingHtml() {
    const opts = cohortOptions();
    if (!opts.length) return `<p class="muted">No cohorts yet. Add one in Cohorts, then send it a quiz.</p>`;
    const { trainees } = cc().data();
    const ownerOf = new Map();
    opts.forEach(({ c }) => (c.trainee_ids || []).forEach((id) => ownerOf.set(id, c)));
    const card = ({ c, st }) => {
      const s = cohortCheckStats(c.id);
      const n = (c.trainee_ids || []).length;
      const qn = quizzesSentTo(c.id).length;
      return `<button type="button" class="cohort-card${st === "active" ? " is-current" : ""}" data-check-cohort="${escapeHtml(c.id)}">
        <span class="cc-top"><b>${escapeHtml(c.name)}</b><span class="chip${st === "active" ? " ok" : ""}">${STATUS_LABEL[st] || st}</span></span>
        <span class="muted">${plural(n, "trainee")} · ${qn ? `${plural(qn, "quiz")} sent` : "No quizzes sent yet"}</span>
        <span class="cc-nums"><span><b>${s.avg === null ? "—" : `${s.avg}%`}</b><small>Average score</small></span><span><b>${s.sent ? pctText(s.answered, s.sent) : "—"}</b><small>Answered</small></span><span><b>${s.lastAt ? escapeHtml(fmtDate(s.lastAt.slice(0, 10))) : "—"}</b><small>Last sent</small></span></span>
      </button>`;
    };
    const people = trainees
      .filter((t) => ownerOf.has(t.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => `<li data-name="${escapeHtml(`${t.name} ${t.email || ""} ${t.crm_name || ""}`.toLowerCase())}" hidden><button type="button" class="trainee-link" data-check-cohort="${escapeHtml(ownerOf.get(t.id).id)}" data-find-tid="${escapeHtml(t.id)}">${escapeHtml(t.name)}</button> <small class="muted">${escapeHtml(ownerOf.get(t.id).name)}</small></li>`)
      .join("");
    return `
      <p class="muted quiz-send-help">Pick a cohort to see its quizzes, replies and scores. Your current batch is first.</p>
      <label class="find-box">Find a trainee <input type="search" data-find-any placeholder="Type a name or email" autocomplete="off" /></label>
      <ul class="find-list" data-find-list>${people}</ul>
      <p class="muted find-none" data-find-none hidden>No trainee in any cohort matches that.</p>
      <div class="cohort-cards">${opts.map(card).join("")}</div>`;
  }

  function cohortCheckHtml(cohort) {
    const sentQs = quizzesSentTo(cohort.id);
    const cohortSelect = `<label>Cohort
      <select data-check-cohort-select>${cohortOptions()
        .map(({ c, st }) => `<option value="${escapeHtml(c.id)}"${c.id === cohort.id ? " selected" : ""}>${escapeHtml(c.name)} · ${escapeHtml(STATUS_LABEL[st] || st)}</option>`)
        .join("")}</select></label>`;
    const back = `<button type="button" class="btn btn-small" data-check-home>‹ All cohorts</button>`;
    const note = ui.note ? `<p class="quiz-note" role="status">${ui.note}</p>` : "";
    if (!sentQs.length)
      return `<div class="quiz-run-row">${back}${cohortSelect}</div>${note}<p class="muted">No quizzes sent to ${escapeHtml(cohort.name)} yet. Send one from <button type="button" class="linkish" data-section="send">Send Quiz</button>; results show up here.</p>`;
    const inList = sentQs.some((x) => x.quizId === ui.selected);
    const quizSelect = `<label>Quiz
      <select data-pick-quiz>${sentQs
        .map((x) => `<option value="${escapeHtml(x.quizId)}"${x.quizId === ui.selected ? " selected" : ""}>${escapeHtml(x.title)}</option>`)
        .join("")}${inList ? "" : `<option value="${escapeHtml(ui.selected || "")}" selected>${escapeHtml(ui.draft?.title || "Quiz")} (not sent here)</option>`}</select></label>`;
    const cruns = runsFor === ui.selected ? runs.filter((r) => r.cohort_id === cohort.id) : [];
    if (!cruns.length)
      return `<div class="quiz-run-row">${back}${cohortSelect}${quizSelect}</div>${note}<p class="muted">${inList ? "Loading…" : `This quiz hasn't been sent to ${escapeHtml(cohort.name)}.`}</p>`;
    const run = cruns.find((r) => r.id === ui.runId) || cruns[0];
    ui.runId = run.id;
    const controls = `<div class="quiz-run-row">${back}${cohortSelect}${quizSelect}
        <label>Sent
          <select data-run>${cruns.map((r) => `<option value="${escapeHtml(r.id)}"${r.id === run.id ? " selected" : ""}>${escapeHtml(stamp(r.sent_at))}</option>`).join("")}</select></label>
        <button type="button" class="btn-primary" data-check${ui.busy ? " disabled" : ""}>${ui.busy === "check" ? "Checking replies…" : "↻ Check replies"}</button>
      </div>${note}`;
    return controls + (ui.checkView === "all" ? allAnswersHtml(run, cohort) : resultsHtml(run, cohort));
  }

  function resultsHtml(run, cohort) {
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
      <div class="stats quiz-stats">
        <div class="stat"><div class="value">${answered.length}<span class="of"> / ${reachable.length}</span></div><div class="label">Replied</div>${sent.length < recs.length ? `<div class="hint">${plural(recs.length - sent.length, "trainee")} not reached on Slack</div>` : ""}</div>
        <div class="stat"><div class="value">${avg === null ? "—" : `${avg}%`}</div><div class="label">Average score</div></div>
        <div class="stat"><div class="value">${scored.length ? `${passed}<span class="of"> / ${scored.length}</span>` : "—"}</div><div class="label">Passed (${pass}% or more)</div></div>
        <div class="stat"><div class="value">${pending}</div><div class="label">Answers to review</div><div class="hint">${pending ? "Open a trainee to mark them" : "Nothing waiting"}</div></div>
      </div>
      <div class="review-tools"><button type="button" class="btn" data-all-answers${scored.length ? "" : " disabled"}>View all answers</button><small class="muted">Every trainee's answer to each question on one page.</small></div>
      ${analysisPanelHtml(cohort)}
      <h4 class="quiz-h">By question</h4>
      <ul class="quiz-byq">${perQ
        .map(
          ({ q, i, got, of }) => `<li><span class="byq-n">${i + 1}</span><span class="byq-text">${escapeHtml(q.prompt)}<small>${TYPES[q.type]}</small></span>
            <span class="byq-bar" aria-hidden="true"><span style="width:${of ? Math.round((got / of) * 100) : 0}%"></span></span><span class="byq-pct">${of ? `${pctText(got, of)} <small>${got}/${of}</small>` : "—"}</span></li>`
        )
        .join("")}</ul>
      <div class="by-trainee-head"><h4 class="quiz-h">By trainee</h4><input type="search" data-find-row placeholder="Find a trainee" aria-label="Find a trainee" autocomplete="off" /></div>
      <table class="quiz-table" data-find-table><thead><tr><th>Trainee</th><th>Status</th><th>Score</th><th></th></tr></thead><tbody>${rows
        .map(({ tid, r, x }) => {
          const status = x?.text
            ? (x.pending ? `<span class="chip warn">${plural(x.pending, "answer")} to review</span>` : x.pct >= pass ? `<span class="chip ok">Passed</span>` : `<span class="chip bad">Below ${pass}%</span>`) +
              (x.source === "manual" ? ` <small class="muted">entered by hand</small>` : "") +
              (x.feedback_sent_at ? ` <small class="muted" title="Result sent ${escapeHtml(stamp(x.feedback_sent_at))}">· result sent ✓</small>` : "")
            : !r.sent
              ? `<span class="chip bad">Not sent</span> <small class="muted">${escapeHtml(r.error || "")}</small>`
              : `<span class="chip">No reply yet</span>`;
          return `<tr data-name="${escapeHtml(r.name.toLowerCase())}"><td>${escapeHtml(r.name)}</td><td>${status}</td><td>${x?.text ? `<b>${x.pct}%</b> <small class="muted">${x.earned}/${x.total} pts</small>` : "—"}</td>
            <td><button type="button" class="btn btn-small" data-view="${escapeHtml(tid)}">${x?.text ? "View answers" : "Enter answers"}</button></td></tr>`;
        })
        .join("")}</tbody></table>
      <p class="muted quiz-send-help">Scores use the quiz as it was sent on ${escapeHtml(stamp(run.sent_at))}, so later edits to the questions don't change them.</p>`;
  }

  // ---- Reviewing answers: every answer on one page, and Claude's read on common mistakes ----
  const answeredOf = (run) => Object.entries(run.responses || {}).filter(([, x]) => x?.text);
  const keyText = (q) => (q.type === "mc" ? `${LETTERS[q.answer]}) ${q.choices[q.answer]}` : q.type === "tf" ? (q.answer ? "True" : "False") : String(q.answer || ""));
  const resultChip = (r) =>
    r?.correct === true ? `<span class="chip ok">Correct</span>` : r?.correct === false ? `<span class="chip bad">Wrong</span>` : `<span class="chip warn">To review</span>`;

  // Saved analyses, one per quiz and level: quiz_analyses/{quizId}__{pool|cohort|trainee}__{all|cohortId|traineeId}.
  const analyses = {};
  dbReady.then((d) => {
    if (!d) return;
    d.collection("quiz_analyses").onSnapshot(
      (snap) => {
        snap.docs.forEach((doc) => (analyses[doc.id] = JSON.parse(JSON.stringify(doc.data() || {}))));
        notify();
      },
      () => {}
    );
  });
  const analysisId = (quizId, level, key) => `${quizId}__${level}__${key}`;
  function saveAnalysis(id, rec) {
    analyses[id] = rec;
    if (!db) return notify(), Promise.resolve();
    return db.doc(`quiz_analyses/${id}`).set(rec);
  }
  const LEVELS = { pool: "Entire pool", cohort: "Cohort", trainee: "One trainee" };

  // The answers one level covers, for the selected quiz: every cohort, one cohort, or one trainee.
  function scopeAnswers(level, key) {
    const list = runsFor === ui.selected ? runs : allRuns?.[ui.selected] || [];
    const picked = level === "cohort" ? list.filter((r) => r.cohort_id === key) : list;
    const entries = [];
    picked.forEach((run) => answeredOf(run).forEach(([tid, x]) => (level !== "trainee" || tid === key) && entries.push({ tid, run, x })));
    const quiz = picked.find((r) => entries.some((e) => e.run === r))?.quiz || picked[0]?.quiz;
    return { entries, quiz, cohorts: new Set(entries.map((e) => e.run.cohort_id)).size };
  }
  const scopeSig = (entries) => entries.map((e) => `${e.run.id}:${e.tid}:${e.x.checked_at || ""}`).sort().join("|");
  function levelKey(level, cohort) {
    return level === "pool" ? "all" : level === "cohort" ? cohort.id : ui.anTrainee;
  }

  function analysisPanelHtml(cohort) {
    const level = LEVELS[ui.anLevel] ? ui.anLevel : "cohort";
    // Trainees who answered this quiz in this cohort, for the one-trainee level.
    const { entries: inCohort } = scopeAnswers("cohort", cohort.id);
    const names = new Map(inCohort.map((e) => [e.tid, e.run.recipients?.[e.tid]?.name || "Trainee"]));
    if (level === "trainee" && !names.has(ui.anTrainee)) ui.anTrainee = [...names.keys()][0] || "";
    const key = levelKey(level, cohort);
    const saved = key ? analyses[analysisId(ui.selected, level, key)] : null;
    // Before levels existed, an analysis was saved on the send itself; show it for the cohort.
    const legacy = !saved && level === "cohort" ? runs.find((r) => r.cohort_id === cohort.id && r.analysis?.result)?.analysis : null;
    const { entries } = key ? scopeAnswers(level, key) : { entries: [] };
    const has = (lv, k) => !!(k && analyses[analysisId(ui.selected, lv, k)]);
    const tabs = [
      ["pool", "Entire pool", has("pool", "all")],
      ["cohort", cohort.name, has("cohort", cohort.id)],
      ["trainee", "One trainee", [...names.keys()].some((t) => has("trainee", t))],
    ];
    const label = level === "pool" ? "entire pool" : level === "cohort" ? cohort.name : names.get(key) || "trainee";
    const scope =
      level === "pool"
        ? (() => {
            const s = scopeAnswers("pool", "all");
            return `Everyone who answered this quiz: ${plural(s.entries.length, "answer set")} from ${plural(s.cohorts, "cohort")}.`;
          })()
        : level === "cohort"
          ? `${plural(entries.length, "trainee")} in ${escapeHtml(cohort.name)} answered this quiz.`
          : names.size
            ? `<label class="an-pick">Trainee <select data-an-trainee>${[...names].map(([tid, n]) => `<option value="${escapeHtml(tid)}"${tid === key ? " selected" : ""}>${escapeHtml(n)}${has("trainee", tid) ? " ✓" : ""}</option>`).join("")}</select></label>`
            : "No one in this cohort has answered yet.";
    const busy = ui.busy === `analyze:${level}:${key}`;
    return `<section class="analysis-panel" aria-label="Analyze answers">
      <div class="quiz-tabs an-tabs" role="tablist" aria-label="Analyze at">${tabs
        .map(([lv, name, done]) => `<button type="button" role="tab" data-an-level="${lv}" aria-selected="${lv === level}">${escapeHtml(name)}${done ? ' <span class="an-dot" title="Analyzed">●</span>' : ""}</button>`)
        .join("")}</div>
      <div class="an-body">
        <div class="an-row"><span class="muted">${scope}</span>
          <button type="button" class="btn" data-analyze="${level}"${entries.length && !ui.busy ? "" : " disabled"}>${busy ? "Claude is reading the answers…" : saved || legacy ? `✨ Analyze ${escapeHtml(label)} again` : `✨ Analyze ${escapeHtml(label)}`}</button></div>
        ${saved || legacy ? analysisHtml(saved || legacy, level, saved ? saved.sig !== scopeSig(entries) : false) : `<p class="muted an-empty">Not analyzed yet. Each level is analyzed on its own, so you can compare what Claude finds for the pool, the cohort and one trainee.</p>`}
      </div>
    </section>`;
  }

  function analysisHtml(a, level, stale) {
    const r = a.result || {};
    const qs = (list) => (list?.length ? `<small class="muted">Q${list.join(", Q")}</small>` : "");
    const one = level === "trainee";
    return `<div class="analysis-card">
      <div class="analysis-head"><h4>✨ What Claude noticed</h4><small class="muted">${one ? "their answers" : plural(a.answered || 0, "answer set")} · ${escapeHtml(stamp(a.at))}</small></div>
      ${stale ? `<p class="quiz-note">Answers have changed since this analysis. Analyze again to include them.</p>` : ""}
      ${r.summary ? `<p class="analysis-summary">${escapeHtml(r.summary)}</p>` : ""}
      ${
        r.rediscuss?.length
          ? `<h5>${one ? "Topics to coach them on" : "Topics to re-discuss"}</h5><ol class="analysis-list">${r.rediscuss
              .map((t) => `<li><span class="chip ${t.priority === "high" ? "bad" : t.priority === "medium" ? "warn" : ""}">${escapeHtml(t.priority || "medium")}</span> <b>${escapeHtml(t.topic)}</b> ${qs(t.questions)}<div class="muted">${escapeHtml(t.why || "")}</div></li>`)
              .join("")}</ol>`
          : ""
      }
      ${
        r.common_mistakes?.length
          ? `<h5>${one ? "Their mistakes" : "Common mistakes"}</h5><ul class="analysis-list">${r.common_mistakes
              .map((m) => `<li><b>${escapeHtml(m.mistake)}</b> ${qs(m.questions)}${!one && m.count ? ` <small class="muted">· ${m.count}${m.of ? ` of ${m.of}` : ""}</small>` : ""}${m.where ? ` <small class="muted">· ${escapeHtml(m.where)}</small>` : ""}${m.example ? `<div class="muted">e.g. “${escapeHtml(m.example)}”</div>` : ""}</li>`)
              .join("")}</ul>`
          : `<p class="muted">${one ? "No mistakes." : "No mistake came up more than once."}</p>`
      }
      ${r.strengths?.length ? `<h5>What went well</h5><ul class="analysis-list">${r.strengths.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
    </div>`;
  }

  // Every trainee's answer to every question in this send, grouped by question.
  function allAnswersHtml(run, cohort) {
    const quiz = run.quiz;
    const answered = answeredOf(run);
    const names = (tid) => run.recipients?.[tid]?.name || "Trainee";
    const sorted = answered.slice().sort(([a], [b]) => names(a).localeCompare(names(b)));
    const cards = quiz.questions
      .map((q, i) => {
        const rows = sorted.map(([tid, x]) => ({ tid, r: x.results?.[q.id] || { answer: "", correct: false } }));
        const got = rows.filter((x) => x.r.correct === true).length;
        const shown = ui.onlyWrong ? rows.filter((x) => x.r.correct !== true) : rows;
        return `<section class="aa-card">
          <div class="aa-q"><span class="byq-n">${i + 1}</span><div><b>${escapeHtml(q.prompt)}</b>
            <small class="muted">${TYPES[q.type]} · ${Number(q.points) || 1} pt · ${pctText(got, rows.length)} correct (${got}/${rows.length})</small>
            ${q.type === "mc" ? `<div class="aa-choices">${q.choices.map((c, j) => `<span class="${j === q.answer ? "is-key" : ""}">${LETTERS[j]}) ${escapeHtml(c)}</span>`).join("")}</div>` : ""}
            <div class="aa-key"><span class="qa-label">Key</span> ${escapeHtml(keyText(q))}</div></div></div>
          ${
            shown.length
              ? `<table class="quiz-table aa-table"><tbody>${shown
                  .map(
                    ({ tid, r }) => `<tr><td><button type="button" class="trainee-link" data-view="${escapeHtml(tid)}">${escapeHtml(names(tid))}</button></td>
                      <td class="aa-answer">${r.answer ? escapeHtml(r.answer) : '<i class="muted">No answer</i>'}</td>
                      <td>${resultChip(r)} <small class="muted">${escapeHtml(r.by === "manual" ? "Marked by you" : r.by === "claude" ? `Claude: ${r.reason || ""}` : r.reason || "")}</small></td></tr>`
                  )
                  .join("")}</tbody></table>`
              : `<p class="muted aa-none">${rows.length ? "Everyone got this right ✓" : "No answers yet."}</p>`
          }
        </section>`;
      })
      .join("");
    return `
      <div class="aa-top">
        <button type="button" class="btn btn-small" data-results>‹ Results</button>
        <span class="muted">${escapeHtml(quiz.title)} · sent ${escapeHtml(stamp(run.sent_at))} · ${plural(answered.length, "trainee")} answered</span>
        <label class="aa-filter"><input type="checkbox" data-only-wrong${ui.onlyWrong ? " checked" : ""} /> Only wrong or to review</label>
      </div>
      ${analysisPanelHtml(cohort)}
      ${answered.length ? cards : `<p class="muted">No one has answered yet. Click “Check replies” first.</p>`}`;
  }

  async function analyzeAnswers(level) {
    const cohort = cc().data().cohorts.find((c) => c.id === ui.checkCohort);
    if (!cohort || !LEVELS[level]) return;
    const key = levelKey(level, cohort);
    const { entries, quiz } = key ? scopeAnswers(level, key) : { entries: [] };
    if (!entries.length || !quiz) return;
    const sample = await sampleReady;
    if (!sample) {
      ui.note = "Claude isn't available on this page right now.";
      return draw();
    }
    ui.busy = `analyze:${level}:${key}`;
    ui.note = "";
    draw();
    const cohortName = (id) => cc().data().cohorts.find((c) => c.id === id)?.name || "Unknown cohort";
    // Trainees are numbered, not named: Claude only needs the answers to find patterns.
    const num = new Map();
    entries.forEach((e) => num.has(e.tid) || num.set(e.tid, num.size + 1));
    const data = quiz.questions.map((q, i) => ({
      n: i + 1,
      type: TYPES[q.type],
      question: q.prompt,
      choices: q.type === "mc" ? q.choices.map((c, j) => `${LETTERS[j]}) ${c}`) : undefined,
      correct_answer: keyText(q),
      answers: entries
        .filter((e) => e.x.results?.[q.id])
        .map((e) => {
          const r = e.x.results[q.id];
          return {
            trainee: num.get(e.tid),
            ...(level === "pool" ? { cohort: cohortName(e.run.cohort_id) } : {}),
            answer: r.answer || "(no answer)",
            result: r.correct === true ? "correct" : r.correct === false ? "wrong" : "not reviewed yet",
          };
        }),
    }));
    const who =
      level === "trainee"
        ? "These are ONE trainee's answers. Explain what they got wrong and the misunderstanding behind it, and the topics to coach this trainee on. For each mistake, \"count\" is 1 and \"of\" is 1."
        : level === "pool"
          ? "These are answers from every cohort that took the quiz (each answer names its cohort). Find the common mistakes across the whole pool, and in \"where\" say whether each is spread across cohorts or mostly in one (name it)."
          : "These are one cohort's answers. Find the common mistakes in this class.";
    const prompt = [
      "You help a trainer of new customer-support trainees review a quiz.",
      who,
      "Rules: use only the answers below. A common mistake is one that 2 or more trainees made (with 3 or fewer answers, a single mistake can count). For multiple choice, name the wrong choice picked and the misunderstanding it shows. For short answers, describe what was missing or misunderstood. Name topics by the concept (e.g. \"refund window for cancelled jobs\"), not by question number. Priority: high = most got it wrong or it is a serious misunderstanding; medium = several did; low = minor. Order topics by priority. Keep every sentence short and plain.",
      'Reply with JSON only: {"summary":"2-3 sentences","common_mistakes":[{"questions":[2],"mistake":"…","count":3,"of":5,"where":"spread across cohorts | mostly <cohort> | empty","example":"a short wrong answer, quoted, or empty"}],"rediscuss":[{"topic":"…","why":"…","questions":[2,5],"priority":"high|medium|low"}],"strengths":["what went well"]}',
      "",
      `Quiz: ${quiz.title} (${plural(num.size, "trainee")})`,
      JSON.stringify(data),
    ].join("\n");
    try {
      const out = await sample.json(prompt, { modelTier: "default" });
      const list = (v) => (Array.isArray(v) ? v : []);
      const nums = (v) => list(v).map(Number).filter((n) => n >= 1 && n <= quiz.questions.length);
      const result = {
        summary: String(out?.summary || ""),
        common_mistakes: list(out?.common_mistakes)
          .filter((m) => m?.mistake)
          .map((m) => ({ questions: nums(m.questions), mistake: String(m.mistake), count: Number(m.count) || 0, of: Number(m.of) || num.size, where: level === "pool" ? String(m.where || "") : "", example: String(m.example || "") })),
        rediscuss: list(out?.rediscuss)
          .filter((t) => t?.topic)
          .map((t) => ({ topic: String(t.topic), why: String(t.why || ""), questions: nums(t.questions), priority: ["high", "medium", "low"].includes(t.priority) ? t.priority : "medium" })),
        strengths: list(out?.strengths).map(String).filter(Boolean),
      };
      if (!result.summary && !result.common_mistakes.length && !result.rediscuss.length) throw new Error("empty");
      await saveAnalysis(analysisId(ui.selected, level, key), { quiz_id: ui.selected, level, key, at: new Date().toISOString(), answered: entries.length, sig: scopeSig(entries), result });
    } catch (e) {
      ui.note = e?.code === "rate_limited" ? "Claude is busy right now. Try again in a minute." : e?.code === "not_granted" ? "Claude isn't allowed for this page. Allow it when asked, then try again." : "Couldn't analyze the answers. Try again.";
    }
    ui.busy = "";
    draw();
  }

  // The result message a trainee gets on Slack: score, then every question with their answer and the result.
  function feedbackMessage(quiz, resp, name) {
    const pass = quiz.passing ?? 80;
    const sc = score(quiz, resp.results);
    const lines = [`**📝 Your result: ${quiz.title || "Quiz"}**`, `Hi ${String(name || "").split(" ")[0] || "there"}! You scored **${sc.pct}%** (${sc.earned}/${sc.total} points). ${sc.pct >= pass ? "Passed ✅" : `The passing score is ${pass}%.`}`];
    if (sc.pending) lines.push(`_${plural(sc.pending, "answer")} still being reviewed._`);
    lines.push("", "**Your answers:**");
    quiz.questions.forEach((q, i) => {
      const r = resp.results?.[q.id] || {};
      lines.push("", `**${i + 1}.** ${q.prompt}`, `Your answer: ${r.answer || "(no answer)"}`);
      if (r.correct === true) lines.push("Result: ✅ Correct");
      else if (r.correct === false) lines.push("Result: ❌ Wrong", `Correct answer: ${keyText(q)}`);
      else lines.push("Result: ⏳ Still being reviewed");
      // Claude's reason on a short answer says what was right or missing; manual and auto reasons are for you.
      if (r.by === "claude" && r.reason) lines.push(`Feedback: ${r.reason}`);
    });
    if (!sc.pending && sc.earned === sc.total) lines.push("", "Every answer correct. Great work! 🎉");
    return lines.join("\n");
  }

  function showSection(key) {
    flushSave();
    ui.section = key;
    ui.traineeId = null;
    ui.checkView = "";
    ui.note = "";
    try {
      localStorage.setItem(SECTION_KEY, key);
    } catch {}
    // Send and Check work on a quiz; start with the newest one.
    if ((key === "send" || key === "check") && !ui.selected && allQuizzes().length) return select(allQuizzes()[0].id);
    if (key === "roster" || key === "check") loadAllRuns().then(() => ui.el && ui.section === key && draw());
    draw();
  }

  // ---- Roster: the chosen cohort's trainees, whether Slack can reach them, and their quiz scores ----
  let allRuns = null; // { quizId: runs[] } across every quiz, for the roster's scores
  function loadAllRuns() {
    const list = allQuizzes();
    if (!db) {
      allRuns = Object.fromEntries(list.map((q) => [q.id, mem.runs[q.id] || []]));
      return Promise.resolve();
    }
    return Promise.all(
      list.map((q) =>
        db
          .doc(`quizzes/${q.id}`)
          .collection("runs")
          .orderBy("sent_at", "desc")
          .get()
          .then((snap) => [q.id, snap.docs.map((doc) => ({ id: doc.id, ...JSON.parse(JSON.stringify(doc.data() || {})) }))])
          .catch(() => [q.id, []])
      )
    ).then((pairs) => (allRuns = Object.fromEntries(pairs)));
  }
  // Per trainee: quizzes sent/taken, the average within each quiz type, and the weighted average.
  // A quiz counts under the type it has now, so re-typing a quiz updates past scores too. Types a
  // trainee has no scores in are left out and the remaining weights are scaled up to 100%.
  function traineeQuizStats(tid) {
    const out = { sent: 0, taken: 0, sum: 0, latest: null, byType: {}, untyped: 0, weighted: null };
    const quizById = new Map(allQuizzes().map((q) => [q.id, q]));
    Object.entries(allRuns || {}).forEach(([quizId, list]) =>
      list.forEach((r) => {
        if (!r.recipients?.[tid]) return;
        out.sent++;
        const x = r.responses?.[tid];
        if (x?.text && x.total) {
          out.taken++;
          out.sum += x.pct;
          const type = typeOf(quizById.get(quizId));
          if (type) {
            const b = (out.byType[type.id] = out.byType[type.id] || { sum: 0, n: 0 });
            b.sum += x.pct;
            b.n++;
          } else out.untyped++;
          if (!out.latest || r.sent_at > out.latest.at) out.latest = { at: r.sent_at, title: r.quiz?.title || "Quiz", pct: x.pct, pass: x.pct >= (r.quiz?.passing ?? 80) };
        }
      })
    );
    let wsum = 0, w = 0;
    quizTypes.forEach((t) => {
      const b = out.byType[t.id];
      if (!b?.n || !(Number(t.weight) > 0)) return;
      wsum += (b.sum / b.n) * Number(t.weight);
      w += Number(t.weight);
    });
    out.weighted = w ? Math.round((wsum / w) * 10) / 10 : null;
    out.weightsUsed = w;
    return out;
  }
  const weightsLine = () => quizTypes.map((t) => `${escapeHtml(t.name)} ${Number(t.weight) || 0}%`).join(" · ");
  function rosterHtml() {
    const opts = cohortOptions();
    if (!opts.length) return `<p class="muted">No cohorts yet. Add one in Cohorts with + Add Class, then add trainees to it.</p>`;
    if (!ui.cohortId || !opts.some((o) => o.c.id === ui.cohortId)) ui.cohortId = (opts.find((o) => o.st === "active") || opts[0]).c.id;
    const members = cohortMembers(ui.cohortId);
    const slackCell = (t) =>
      t.slack_user_id ? `<span class="chip ok">Matched</span>` : t.email ? `<span class="chip">Matched on first send</span>` : `<span class="chip bad">No work email</span>`;
    const row = (t) => {
      const st = traineeQuizStats(t.id);
      const inactive = isInactive(t);
      const typeCells = quizTypes
        .map((ty) => {
          const b = st.byType[ty.id];
          return `<td>${b?.n ? `${Math.round(b.sum / b.n)}% <small class="muted">(${b.n})</small>` : '<span class="muted">—</span>'}</td>`;
        })
        .join("");
      const scaled = st.weighted !== null && st.weightsUsed < 100;
      return `<tr class="${inactive ? "is-inactive" : ""}">
        <td><button type="button" class="trainee-link" data-open-trainee="${escapeHtml(t.id)}" title="See ${escapeHtml(t.name)}'s quizzes and scores">${escapeHtml(t.name)}</button><small class="muted roster-crm">${escapeHtml(t.email || t.crm_name || "")}</small></td>
        <td>${inactive ? `<span class="chip">Inactive</span>` : `<span class="chip ok">Active</span>`}</td>
        <td>${slackCell(t)}</td>
        <td>${allRuns ? (st.sent ? `${st.taken} of ${st.sent}` : '<span class="muted">None yet</span>') : "…"}</td>
        ${typeCells}
        <td class="weighted">${st.weighted !== null ? `<b>${st.weighted}%</b>${scaled ? ` <small class="muted" title="Only some quiz types have scores yet, so their weights are scaled to 100%">partial</small>` : ""}` : st.untyped ? '<small class="muted">Set quiz types</small>' : '<span class="muted">—</span>'}</td>
        <td>${st.latest ? `${escapeHtml(st.latest.title)} · <b class="${st.latest.pass ? "ok-text" : "bad-text"}">${st.latest.pct}%</b>` : '<span class="muted">—</span>'}</td>
      </tr>`;
    };
    const active = members.filter((t) => !isInactive(t)), inactive = members.filter(isInactive);
    const cannot = active.filter((t) => !t.slack_user_id && !t.email).length;
    return `
      <div class="quiz-send-row">
        <label>Cohort
          <select data-roster-cohort>${opts.map(({ c, st }) => `<option value="${escapeHtml(c.id)}"${c.id === ui.cohortId ? " selected" : ""}>${escapeHtml(c.name)} · ${st === "unscheduled" ? "no start date" : st}</option>`).join("")}</select></label>
        <button type="button" class="btn" data-roster-refresh>↻ Refresh scores</button>
      </div>
      <div class="weights-line"><b>Weighted average</b> = ${weightsLine()} <button type="button" class="linkish" data-edit-weights>Edit weights</button></div>
      <p class="muted quiz-send-help">${plural(active.length, "active trainee")}, ticked by default in Send Quiz${inactive.length ? ` · ${inactive.length} inactive, unticked by default` : ""}${cannot ? ` · <b class="warn-text">${cannot} can't be reached on Slack (no work email)</b>` : ""}. Change who's in the cohort, or Active / Inactive, in Cohorts.</p>
      ${
        members.length
          ? `<table class="quiz-table roster-table"><thead><tr><th>Trainee</th><th>Status</th><th>Slack</th><th>Quizzes taken</th>${quizTypes.map((ty) => `<th>${escapeHtml(ty.name)} <small class="muted">${Number(ty.weight) || 0}%</small></th>`).join("")}<th>Weighted average</th><th>Latest</th></tr></thead>
              <tbody>${[...active, ...inactive].map(row).join("")}</tbody></table>`
          : `<p class="muted">No trainees in this cohort yet. Add them from Cohorts with + Add Trainee.</p>`
      }`;
  }

  // One trainee's page (from the Roster): every quiz sent to them, whether they answered, and their scores.
  function patchAllRuns(quizId, run) {
    if (!allRuns) return;
    allRuns[quizId] = [run, ...(allRuns[quizId] || []).filter((r) => r.id !== run.id)].sort((a, b) => (b.sent_at || "").localeCompare(a.sent_at || ""));
  }
  function traineePageHtml(t) {
    const st = traineeQuizStats(t.id);
    const quizById = new Map(allQuizzes().map((q) => [q.id, q]));
    const cohort = cc().data().cohorts.find((c) => (c.trainee_ids || []).includes(t.id));
    const rows = Object.entries(allRuns || {})
      .flatMap(([quizId, list]) => list.filter((r) => r.recipients?.[t.id]).map((r) => ({ quizId, r, rec: r.recipients[t.id], x: r.responses?.[t.id] })))
      .sort((a, b) => (b.r.sent_at || "").localeCompare(a.r.sent_at || ""));
    const answered = rows.filter((row) => row.x?.text);
    const passedN = answered.filter((row) => row.x.total && row.x.pct >= (row.r.quiz?.passing ?? 80)).length;
    const scaled = st.weighted !== null && st.weightsUsed < 100;
    const typeTiles = quizTypes
      .map((ty) => {
        const b = st.byType[ty.id];
        return `<div class="stat"><div class="value">${b?.n ? `${Math.round(b.sum / b.n)}%` : "—"}</div><div class="label">${escapeHtml(ty.name)} average</div><div class="hint">${b?.n ? plural(b.n, "quiz") : "No scores yet"} · ${Number(ty.weight) || 0}% of the weighted average</div></div>`;
      })
      .join("");
    const row = ({ quizId, r, rec, x }) => {
      const quiz = r.quiz || {};
      const pass = quiz.passing ?? 80;
      const type = typeOf(quizById.get(quizId));
      const status = x?.text
        ? `<span class="chip ok">Answered</span>${x.source === "manual" ? ` <small class="muted">entered by hand</small>` : ""}`
        : !rec.sent
          ? `<span class="chip bad">Not sent</span> <small class="muted">${escapeHtml(rec.error || "")}</small>`
          : `<span class="chip">No reply yet</span>`;
      const result = x?.text
        ? x.pending
          ? `<span class="chip warn">${plural(x.pending, "answer")} to review</span>`
          : x.pct >= pass
            ? `<span class="chip ok">Passed</span>`
            : `<span class="chip bad">Below ${pass}%</span>`
        : '<span class="muted">—</span>';
      return `<tr>
        <td><b>${escapeHtml(quiz.title || quizById.get(quizId)?.title || "Quiz")}</b><small class="muted roster-crm">${plural((quiz.questions || []).length, "question")}${r.cohort_name ? ` · ${escapeHtml(r.cohort_name)}` : ""}</small></td>
        <td>${type ? `<span class="chip">${escapeHtml(type.name)}</span>` : '<span class="muted">—</span>'}</td>
        <td>${escapeHtml(stamp(r.sent_at))}</td>
        <td>${status}</td>
        <td>${x?.text ? `<b>${x.pct}%</b> <small class="muted">${x.earned}/${x.total} pts</small>` : "—"}</td>
        <td>${result}</td>
        <td><button type="button" class="btn btn-small" data-trainee-run="${escapeHtml(quizId)}|${escapeHtml(r.id)}">${x?.text ? "View answers" : "Enter answers"}</button></td>
      </tr>`;
    };
    return `
      <div class="quiz-top trainee-top">
        <button type="button" class="btn btn-small" data-back-roster>‹ Roster</button>
        <h3>${escapeHtml(t.name)}</h3>
        <span class="muted quiz-sub">${[t.email || t.crm_name, cohort?.name, isInactive(t) ? "Inactive" : "Active"].filter(Boolean).map(escapeHtml).join(" · ")}</span>
        <button type="button" class="btn" data-roster-refresh>↻ Refresh scores</button>
      </div>
      ${
        !allRuns
          ? `<p class="muted">Loading quizzes…</p>`
          : `<div class="stats quiz-stats">
              <div class="stat"><div class="value">${st.weighted !== null ? `${st.weighted}%` : "—"}</div><div class="label">Weighted average</div><div class="hint">${st.weighted === null ? "No scores yet" : scaled ? "Partial: only some quiz types have scores" : weightsLine()}</div></div>
              <div class="stat"><div class="value">${answered.length}<span class="of"> / ${rows.length}</span></div><div class="label">Quizzes answered</div><div class="hint">${rows.length - answered.length ? `${plural(rows.length - answered.length, "quiz")} not answered yet` : rows.length ? "All answered" : "None sent yet"}</div></div>
              <div class="stat"><div class="value">${answered.length ? `${passedN}<span class="of"> / ${answered.length}</span>` : "—"}</div><div class="label">Passed</div></div>
              ${typeTiles}
            </div>
            <h4 class="quiz-h">Quizzes sent to ${escapeHtml(t.name.split(" ")[0])}</h4>
            ${
              rows.length
                ? `<table class="quiz-table trainee-quiz-table"><thead><tr><th>Quiz</th><th>Type</th><th>Sent</th><th>Status</th><th>Score</th><th>Result</th><th></th></tr></thead><tbody>${rows.map(row).join("")}</tbody></table>
                   <p class="muted quiz-send-help">Newest first. Scores use each quiz as it was sent, so later edits to the questions don't change them.</p>`
                : `<p class="muted">No quizzes sent to ${escapeHtml(t.name)} yet. Send one from <button type="button" class="linkish" data-section="send">Send Quiz</button>.</p>`
            }`
      }`;
  }

  // ---- Quiz Links and Resources: saved links (title, URL, note) ----
  const LINK_KIND = {
    links: { coll: "quiz_links", noun: "link", empty: "No quiz links yet. Save links to quizzes kept elsewhere, like a Google Form, so they're in one place.", placeholder: "e.g. Week 2 Google Form" },
    resources: { coll: "quiz_resources", noun: "resource", empty: "No resources yet. Save study material and references trainees need for quizzes.", placeholder: "e.g. Refund policy SOP" },
  };
  const linkStore = { links: [], resources: [] };
  const linkLoaded = { links: false, resources: false };
  dbReady.then((d) => {
    Object.entries(LINK_KIND).forEach(([kind, k]) => {
      if (!d) return (linkLoaded[kind] = true);
      d.collection(k.coll).orderBy("created_at", "desc").onSnapshot(
        (snap) => {
          linkStore[kind] = snap.docs.map((doc) => ({ id: doc.id, ...JSON.parse(JSON.stringify(doc.data() || {})) }));
          linkLoaded[kind] = true;
          notify();
        },
        () => ((linkLoaded[kind] = true), notify())
      );
    });
  });
  const cleanUrl = (u) => {
    const v = String(u || "").trim();
    if (!v) return "";
    const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      const url = new URL(withProto);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  };
  function saveLink(kind, item) {
    const { id, ...fields } = item;
    // Shown right away (the saved copy follows), so the list is current even while typing the next one.
    const had = linkStore[kind].some((x) => x.id === id);
    linkStore[kind] = had ? linkStore[kind].map((x) => (x.id === id ? item : x)) : [item, ...linkStore[kind]];
    if (!db) {
      notify();
      return Promise.resolve();
    }
    return db.doc(`${LINK_KIND[kind].coll}/${id}`).set(fields);
  }
  function linkListHtml(kind) {
    const k = LINK_KIND[kind];
    const list = linkStore[kind];
    return `
      <form class="link-form" data-link-form="${kind}" novalidate>
        <input type="text" data-link-title placeholder="Title (${escapeHtml(k.placeholder)})" aria-label="Title" />
        <input type="url" data-link-url placeholder="https://…" aria-label="Link" />
        <input type="text" data-link-note placeholder="Note (optional)" aria-label="Note" />
        <button type="button" class="btn-primary" data-link-add="${kind}">Add ${k.noun}</button>
      </form>
      <p class="sheet-status" data-link-status="${kind}" role="status"></p>
      ${
        !linkLoaded[kind]
          ? `<p class="muted">Loading…</p>`
          : !list.length
            ? `<p class="muted">${escapeHtml(k.empty)}</p>`
            : `<ul class="link-list">${list
                .map(
                  (x) => `<li>
                    <div class="link-main"><a href="${escapeHtml(x.url)}" target="_blank" rel="noopener noreferrer"><b>${escapeHtml(x.title)}</b></a>
                      <small class="muted">${escapeHtml(x.url)}</small>${x.note ? `<p>${escapeHtml(x.note)}</p>` : ""}</div>
                    <button type="button" class="btn btn-small" data-link-copy="${escapeHtml(x.url)}">Copy link</button>
                    <button type="button" class="square-btn kebab" data-link-menu="${kind}|${escapeHtml(x.id)}" aria-label="Options for ${escapeHtml(x.title)}">⋮</button>
                  </li>`
                )
                .join("")}</ul>`
      }`;
  }
  // ---- Ask Claude for quiz questions (Resources) ----
  // A request, optionally grounded in saved resources (Google Drive links are read in full) or pasted
  // material. Claude suggests questions with answers; picked ones are added to a new or existing quiz.
  const ai = { request: "", count: 5, types: { mc: true, tf: true, short: true }, use: new Set(), paste: "", busy: false, status: "", suggestions: [], target: "new", added: "" };
  const MATERIAL_LIMIT = 40000; // characters of material per request (a Claude call from a page is capped)
  const isDriveLink = (u) => /(docs|drive)\.google\.com\//.test(u || "");

  function aiBoxHtml() {
    const res = linkStore.resources;
    const picked = ai.suggestions.filter((q) => q.pick).length;
    const quizzesList = allQuizzes();
    return `
      <section class="ai-box">
        <h4 class="ai-title">✨ Ask Claude for quiz questions</h4>
        <textarea data-ai-request rows="3" placeholder="e.g. 8 questions on the refund policy for week-1 trainees. Mostly multiple choice, focus on the 24-hour rule.">${escapeHtml(ai.request)}</textarea>
        <div class="ai-opts">
          <label>How many <input type="number" min="1" max="25" data-ai-count value="${ai.count}" /></label>
          <span class="ai-types">Types:
            ${Object.entries(TYPES).map(([k, v]) => `<label><input type="checkbox" data-ai-type="${k}"${ai.types[k] ? " checked" : ""} /> ${v}</label>`).join("")}
          </span>
        </div>
        ${
          res.length
            ? `<fieldset class="ai-use"><legend>Base them on these resources <span class="muted">(optional)</span></legend>
                ${res
                  .map(
                    (x) => `<label><input type="checkbox" data-ai-use="${escapeHtml(x.id)}"${ai.use.has(x.id) ? " checked" : ""} /> ${escapeHtml(x.title)}
                      <small class="muted">${isDriveLink(x.url) ? "Claude reads this Google Doc" : "Claude sees the title and note only"}</small></label>`
                  )
                  .join("")}</fieldset>`
            : ""
        }
        <details class="ai-paste"${ai.paste ? " open" : ""}><summary>Or paste material for Claude to use</summary>
          <textarea data-ai-paste rows="5" placeholder="Paste an SOP, policy or module text. Questions will come only from it.">${escapeHtml(ai.paste)}</textarea></details>
        <div class="ai-actions">
          <button type="button" class="btn-primary" data-ai-go${ai.busy ? " disabled" : ""}>${ai.busy ? "Thinking…" : ai.suggestions.length ? "Suggest again" : "Suggest questions"}</button>
          <span class="sheet-status" role="status">${escapeHtml(ai.status)}</span>
        </div>
        ${
          ai.suggestions.length
            ? `<ol class="ai-list">${ai.suggestions.map(aiQuestionHtml).join("")}</ol>
               <div class="ai-add">
                 <label>Add ${plural(picked, "picked question")} to
                   <select data-ai-target>
                     <option value="new"${ai.target === "new" ? " selected" : ""}>A new quiz</option>
                     ${quizzesList.map((q) => `<option value="${escapeHtml(q.id)}"${ai.target === q.id ? " selected" : ""}>${escapeHtml(q.title || "Untitled quiz")}</option>`).join("")}
                   </select></label>
                 <button type="button" class="btn-primary" data-ai-add${picked ? "" : " disabled"}>Add to quiz</button>
                 ${ai.added ? `<span class="ai-added">${ai.added}</span>` : ""}
               </div>`
            : ""
        }
      </section>`;
  }

  function aiQuestionHtml(q, i) {
    const body =
      q.type === "mc"
        ? `<ul class="ai-choices">${q.choices.map((c, j) => `<li class="${j === q.answer ? "is-answer" : ""}">${LETTERS[j]}) ${escapeHtml(c)}${j === q.answer ? " ✓" : ""}</li>`).join("")}</ul>`
        : q.type === "tf"
          ? `<p class="ai-key">Answer: <b>${q.answer ? "True" : "False"}</b></p>`
          : `<p class="ai-key">Answer key: ${escapeHtml(q.answer)}</p>`;
    return `<li class="ai-q${q.pick ? "" : " is-off"}">
      <label class="ai-pick"><input type="checkbox" data-ai-pick="${i}"${q.pick ? " checked" : ""} aria-label="Use question ${i + 1}" /></label>
      <div><div class="ai-q-head"><span class="chip">${TYPES[q.type]}</span>${q.source ? `<small class="muted">From: ${escapeHtml(q.source)}</small>` : ""}</div>
        <p class="ai-prompt">${escapeHtml(q.prompt)}</p>${body}</div>
    </li>`;
  }

  // Turns Claude's reply into questions the editor understands; anything malformed is dropped.
  function cleanSuggestions(out) {
    return (out?.questions || [])
      .map((q) => {
        const type = ["mc", "tf", "short"].includes(q?.type) ? q.type : null;
        const prompt = String(q?.prompt || "").trim();
        if (!type || !prompt || !ai.types[type]) return null;
        const base = { id: uid(), type, prompt, points: Math.max(1, Math.round(Number(q.points) || 1)), source: String(q.source || "").trim(), pick: true };
        if (type === "mc") {
          const choices = (Array.isArray(q.choices) ? q.choices : []).map((c) => String(c).trim()).filter(Boolean).slice(0, LETTERS.length);
          const answer = Number(q.answer);
          if (choices.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= choices.length) return null;
          return { ...base, choices, answer };
        }
        if (type === "tf") {
          const v = q.answer === true || q.answer === false ? q.answer : String(q.answer).toLowerCase() === "true" ? true : String(q.answer).toLowerCase() === "false" ? false : null;
          return v === null ? null : { ...base, answer: v };
        }
        const key = String(q.answer || "").trim();
        return key ? { ...base, answer: key } : null;
      })
      .filter(Boolean);
  }

  async function suggestQuestions() {
    const request = ai.request.trim();
    const types = Object.keys(ai.types).filter((k) => ai.types[k]);
    if (!request) return setAi("Type what you'd like questions about.");
    if (!types.length) return setAi("Pick at least one question type.");
    const sample = await sampleReady;
    if (!sample) return setAi("Claude isn't available in this view of the dashboard.");
    ai.busy = true;
    setAi("Gathering material…");
    // Material: picked resources (Drive links read in full) and anything pasted.
    const parts = [];
    const skipped = [];
    for (const x of linkStore.resources.filter((r) => ai.use.has(r.id))) {
      if (isDriveLink(x.url) && cc()?.readDriveText) {
        try {
          const text = await cc().readDriveText(x.url);
          parts.push(`### ${x.title}${x.note ? ` (${x.note})` : ""}\n${text}`);
          continue;
        } catch (e) {
          skipped.push(`${x.title} (${e?.message || "couldn't be read"})`);
        }
      }
      parts.push(`### ${x.title}\n${x.note ? `Note: ${x.note}\n` : ""}(Only the title${x.note ? " and note" : ""} of this resource is available.)`);
    }
    if (ai.paste.trim()) parts.push(`### Pasted material\n${ai.paste.trim()}`);
    let material = parts.join("\n\n");
    const cut = material.length > MATERIAL_LIMIT;
    if (cut) material = material.slice(0, MATERIAL_LIMIT);
    setAi("Claude is writing questions…");
    const prompt = [
      "You write quiz questions for new customer-support trainees at a home-cleaning company.",
      `Trainer's request: ${request}`,
      `Write ${ai.count} questions. Allowed types: ${types.map((k) => `${k} (${TYPES[k]})`).join(", ")}.`,
      material
        ? "Base every question and answer ONLY on the material below. Don't invent policy details that aren't in it. In \"source\", name the material (and section) each question comes from."
        : "No material was given, so keep to general, widely true customer-support practice, and leave \"source\" empty.",
      "Rules: one clear correct answer per question; multiple choice has 3-4 plausible choices; true/false statements are unambiguous; short answers have an answer key saying what a correct answer must include.",
      'Reply with JSON only: {"questions":[{"type":"mc","prompt":"…","choices":["…","…","…"],"answer":0,"points":1,"source":"…"},{"type":"tf","prompt":"…","answer":true,"points":1,"source":"…"},{"type":"short","prompt":"…","answer":"what a correct answer must say","points":1,"source":"…"}]}',
      "For mc, \"answer\" is the 0-based index of the correct choice.",
      material ? `\n--- MATERIAL ---\n${material}` : "",
    ].join("\n");
    try {
      const out = await sample.json(prompt, { modelTier: "default" });
      const qs = cleanSuggestions(out);
      ai.suggestions = qs;
      ai.added = "";
      setAi(
        qs.length
          ? `${plural(qs.length, "question")} suggested. Untick any you don't want, then add them to a quiz.${cut ? " The material was long, so only the first part was used." : ""}${skipped.length ? ` Couldn't read: ${skipped.join(", ")}.` : ""}`
          : "Claude didn't return usable questions. Try rewording the request."
      );
    } catch (e) {
      setAi(e?.code === "rate_limited" ? "Claude is busy right now. Try again in a minute." : e?.code === "not_granted" ? "Claude isn't allowed for this page. Allow it when asked, then try again." : "Couldn't get suggestions. Try again.");
    }
    ai.busy = false;
    draw();
  }
  function setAi(msg) {
    ai.status = msg;
    draw();
  }

  function addSuggestions() {
    const picked = ai.suggestions.filter((q) => q.pick).map(({ pick, source, ...q }) => ({ ...q, id: uid() }));
    if (!picked.length) return;
    const now = new Date().toISOString();
    let quiz, isNew = ai.target === "new";
    if (isNew) {
      const title = ai.request.trim().replace(/\s+/g, " ").slice(0, 60) || "Suggested quiz";
      quiz = { id: `q${Date.now()}`, title, description: "", passing: 80, questions: picked, created_at: now };
    } else {
      const base = ui.draft?.id === ai.target ? ui.draft : allQuizzes().find((q) => q.id === ai.target);
      if (!base) return;
      quiz = { ...JSON.parse(JSON.stringify(base)), questions: [...(base.questions || []), ...picked] };
      if (ui.draft?.id === quiz.id) {
        clearTimeout(ui.saveTimer);
        ui.saveTimer = null;
        ui.draft = JSON.parse(JSON.stringify(quiz));
      }
    }
    saveQuiz(quiz).then(
      () => {
        ai.target = quiz.id;
        ai.suggestions = ai.suggestions.map((q) => (q.pick ? { ...q, pick: false, used: true } : q));
        ai.added = `Added ${plural(picked.length, "question")} to “${escapeHtml(quiz.title)}” ✓ <button type="button" class="linkish" data-open-quiz="${escapeHtml(quiz.id)}">Open in Quiz Buckets</button>`;
        draw();
      },
      () => setAi("Couldn't add them. Try again.")
    );
  }

  function addLink(kind) {
    const form = ui.el.querySelector(`[data-link-form="${kind}"]`);
    const status = ui.el.querySelector(`[data-link-status="${kind}"]`);
    const title = form.querySelector("[data-link-title]").value.trim();
    const url = cleanUrl(form.querySelector("[data-link-url]").value);
    const note = form.querySelector("[data-link-note]").value.trim();
    if (!title) return void ((status.textContent = "Give it a title."), form.querySelector("[data-link-title]").focus());
    if (!url) return void ((status.textContent = "Add a valid link (starting with https://)."), form.querySelector("[data-link-url]").focus());
    status.textContent = "Saving…";
    saveLink(kind, { id: `l${Date.now()}`, title, url, note, created_at: new Date().toISOString() }).then(
      () => ((status.textContent = ""), draw(), ui.el.querySelector(`[data-link-form="${kind}"] [data-link-title]`)?.focus()),
      () => (status.textContent = "Couldn't save. Try again.")
    );
  }
  function editLink(kind, id) {
    const x = linkStore[kind].find((l) => l.id === id);
    if (!x) return;
    const sh = sheet(`<h3>Edit ${LINK_KIND[kind].noun}</h3>
      <label class="field"><span>Title</span><input type="text" data-e-title value="${escapeHtml(x.title)}" /></label>
      <label class="field"><span>Link</span><input type="url" data-e-url value="${escapeHtml(x.url)}" /></label>
      <label class="field"><span>Note</span><input type="text" data-e-note value="${escapeHtml(x.note || "")}" /></label>
      <p class="sheet-status" data-e-status></p>
      <div class="sheet-actions"><button type="button" class="btn" data-cancel>Cancel</button><button type="button" class="btn-primary" data-yes>Save</button></div>`);
    if (!sh) return;
    const $ = (q) => sh.s.querySelector(q);
    $("[data-yes]").addEventListener("click", () => {
      const title = $("[data-e-title]").value.trim(), url = cleanUrl($("[data-e-url]").value);
      if (!title || !url) return void ($("[data-e-status]").textContent = !title ? "Give it a title." : "Add a valid link.");
      saveLink(kind, { ...x, title, url, note: $("[data-e-note]").value.trim() }).then(sh.close, () => ($("[data-e-status]").textContent = "Couldn't save. Try again."));
    });
    $("[data-e-title]").focus();
  }
  function removeLink(kind, id) {
    const x = linkStore[kind].find((l) => l.id === id);
    if (!x) return;
    const sh = sheet(`<h3>Delete “${escapeHtml(x.title)}”?</h3><p class="muted">It moves to Trash for ${TRASH_DAYS} days. Only the saved link is removed; the page it points to isn't touched.</p>
      <div class="sheet-actions"><button type="button" class="btn" data-cancel>Cancel</button><button type="button" class="btn-danger" data-yes>Move to Trash</button></div>`);
    if (!sh) return;
    sh.s.querySelector("[data-yes]").addEventListener("click", () => {
      const done = () => sh.close();
      toTrash(kind, x.title, JSON.parse(JSON.stringify(x))).catch(() => {});
      if (!db) {
        linkStore[kind] = linkStore[kind].filter((l) => l.id !== id);
        notify();
        return done();
      }
      db.doc(`${LINK_KIND[kind].coll}/${id}`).delete().then(done, done);
    });
    sh.s.querySelector("[data-cancel]").focus();
  }

  // ---- Trash: deleted quizzes, questions, links and resources, kept 30 days (quiz_trash/{id}) ----
  // A trashed quiz keeps its sends and results where they are, so restoring it brings everything back.
  const TRASH_DAYS = 30;
  const DAY = 86400000;
  const TRASH_KIND = { quiz: "Quiz", question: "Question", links: "Quiz link", resources: "Resource" };
  let trash = [];
  let trashLoaded = false;
  dbReady.then((d) => {
    if (!d) return void (trashLoaded = true);
    d.collection("quiz_trash").orderBy("deleted_at", "desc").onSnapshot(
      (snap) => {
        trash = snap.docs.map((doc) => ({ id: doc.id, ...JSON.parse(JSON.stringify(doc.data() || {})) }));
        trashLoaded = true;
        purgeExpired();
        notify();
      },
      () => ((trashLoaded = true), notify())
    );
  });
  function toTrash(kind, title, data, extra = {}) {
    const now = Date.now();
    const item = { id: `t${now}${uid()}`, kind, title: title || "Untitled", data, deleted_at: new Date(now).toISOString(), expires_at: new Date(now + TRASH_DAYS * DAY).toISOString(), ...extra };
    trash = [item, ...trash];
    if (!db) return notify(), Promise.resolve();
    const { id, ...fields } = item;
    return db.doc(`quiz_trash/${id}`).set(fields);
  }
  function dropTrashItem(id) {
    trash = trash.filter((t) => t.id !== id);
    if (!db) return notify(), Promise.resolve();
    return db.doc(`quiz_trash/${id}`).delete();
  }
  const daysLeft = (t) => Math.max(0, Math.ceil((Date.parse(t.expires_at) - Date.now()) / DAY));
  // Past 30 days, an item is deleted for good the next time the Quiz app loads the trash.
  let purging = false;
  function purgeExpired() {
    if (purging) return;
    const old = trash.filter((t) => Date.parse(t.expires_at) <= Date.now());
    if (!old.length) return;
    purging = true;
    Promise.all(old.map(deleteForever)).finally(() => (purging = false));
  }
  // Deleting for good: a quiz also takes its sends, results and saved analyses with it.
  async function deleteForever(t) {
    if (t.kind === "quiz") {
      const qid = t.data?.id;
      if (qid && !allQuizzes().some((q) => q.id === qid)) {
        if (!db) delete mem.runs[qid];
        else {
          const snap = await db.doc(`quizzes/${qid}`).collection("runs").get().catch(() => null);
          await Promise.all((snap?.docs || []).map((doc) => db.doc(`quizzes/${qid}`).collection("runs").doc(doc.id).delete().catch(() => {})));
          await Promise.all(Object.keys(analyses).filter((k) => k.startsWith(`${qid}__`)).map((k) => (delete analyses[k], db.doc(`quiz_analyses/${k}`).delete().catch(() => {}))));
        }
      }
    }
    return dropTrashItem(t.id);
  }
  async function restoreTrash(id) {
    const t = trash.find((x) => x.id === id);
    if (!t) return;
    if (t.kind === "quiz") await saveQuiz(t.data);
    else if (t.kind === "links" || t.kind === "resources") await saveLink(t.kind, t.data);
    else if (t.kind === "question") {
      const quiz = t.quiz_id === ui.draft?.id ? ui.draft : allQuizzes().find((q) => q.id === t.quiz_id);
      if (!quiz) {
        ui.note = `“${escapeHtml(t.quiz_title || "Its quiz")}” isn't in Quiz Buckets. Restore the quiz first, then this question.`;
        return draw();
      }
      const questions = [...(quiz.questions || [])];
      questions.splice(Math.min(t.index ?? questions.length, questions.length), 0, t.data);
      if (quiz === ui.draft) {
        ui.draft.questions = questions;
        queueSave();
      } else await saveQuiz({ ...JSON.parse(JSON.stringify(quiz)), questions });
    }
    await dropTrashItem(id);
    ui.note = `Restored “${escapeHtml(t.title)}”${t.kind === "question" ? ` to ${escapeHtml(t.quiz_title || "its quiz")}` : t.kind === "quiz" ? " to Quiz Buckets, with its sends and results" : ""}.`;
    if (t.kind === "quiz") loadAllRuns().then(() => ui.el && draw());
    draw();
  }
  function confirmForever(ids) {
    const items = trash.filter((t) => ids.includes(t.id));
    if (!items.length) return;
    const one = items.length === 1 ? items[0] : null;
    const x = sheet(`<h3>${one ? `Delete “${escapeHtml(one.title)}” for good?` : `Empty the trash (${plural(items.length, "item")})?`}</h3>
      <p class="muted">${items.some((t) => t.kind === "quiz") ? "A quiz goes with its sends, results and Claude's analyses. " : ""}This can't be undone.</p>
      <div class="sheet-actions"><button type="button" class="btn" data-cancel>Cancel</button><button type="button" class="btn-danger" data-yes>${one ? "Delete for good" : "Empty trash"}</button></div>`);
    if (!x) return;
    x.s.querySelector("[data-yes]").addEventListener("click", (e) => {
      e.target.disabled = true;
      Promise.all(items.map(deleteForever)).finally(() => {
        x.close();
        ui.note = one ? `Deleted “${escapeHtml(one.title)}” for good.` : "Trash emptied.";
        draw();
      });
    });
    x.s.querySelector("[data-cancel]").focus();
  }
  function trashHtml() {
    const note = ui.note ? `<p class="quiz-note" role="status">${ui.note}</p>` : "";
    if (!trashLoaded) return `<p class="muted">Loading…</p>`;
    const live = trash.filter((t) => Date.parse(t.expires_at) > Date.now());
    if (!live.length) return `${note}<p class="muted">Trash is empty. Deleted quizzes, questions, quiz links and resources wait here for ${TRASH_DAYS} days, so you can restore them.</p>`;
    const where = (t) =>
      t.kind === "question"
        ? `From ${escapeHtml(t.quiz_title || "a quiz")}`
        : t.kind === "quiz"
          ? `${plural((t.data?.questions || []).length, "question")}${t.sends ? ` · ${plural(t.sends, "send")} and results kept` : ""}`
          : escapeHtml(t.data?.url || "");
    return `${note}
      <div class="trash-head"><span class="muted">${plural(live.length, "item")} · each is deleted for good ${TRASH_DAYS} days after it was deleted</span>
        <button type="button" class="btn btn-danger-ghost" data-trash-empty>Empty trash</button></div>
      <table class="quiz-table trash-table"><thead><tr><th>Item</th><th>Type</th><th>Deleted</th><th>Deleted for good</th><th></th></tr></thead><tbody>${live
        .map((t) => {
          const left = daysLeft(t);
          return `<tr><td><b>${escapeHtml(t.title)}</b><small class="muted roster-crm">${where(t)}</small></td>
            <td><span class="chip">${TRASH_KIND[t.kind] || t.kind}</span></td>
            <td>${escapeHtml(stamp(t.deleted_at))}</td>
            <td><span class="${left <= 3 ? "bad-text" : "muted"}">${left <= 1 ? "Within a day" : `In ${left} days`}</span></td>
            <td><div class="trash-actions"><button type="button" class="btn btn-small" data-trash-restore="${escapeHtml(t.id)}">Restore</button><button type="button" class="btn btn-small btn-danger-ghost" data-trash-forever="${escapeHtml(t.id)}">Delete for good</button></div></td></tr>`;
        })
        .join("")}</tbody></table>`;
  }

  function sectionHtml() {
    const d = ui.draft;
    const head = (title, sub) => `<div class="quiz-top"><h3>${title}</h3>${sub || ""}</div>`;
    switch (ui.section) {
      case "roster": {
        const t = ui.traineeId && cc().data().trainees.find((x) => x.id === ui.traineeId);
        if (t) return traineePageHtml(t);
        ui.traineeId = null;
        return head("Roster", `<span class="muted quiz-sub">From Cohorts; pick who gets each quiz in Send Quiz</span>`) + rosterHtml();
      }
      case "send":
        return head("Send Quiz") + (d ? sendTabHtml(d) : noQuizzes());
      case "check":
        return head("Check Quiz") + checkHtml();
      case "buckets":
        return `<div class="bucket-layout">${bucketListHtml()}<div class="bucket-editor">${
          d
            ? `<div class="quiz-top">
                <h3>${escapeHtml(d.title || "Untitled quiz")}</h3>
                <span class="muted quiz-save" data-save-state role="status">${escapeHtml(ui.saveState)}</span>
                <button type="button" class="square-btn kebab" data-quiz-menu aria-label="Quiz options">⋮</button>
              </div>${questionsTabHtml(d)}`
            : `<div class="quiz-empty"><h3>Quiz Buckets</h3><p class="muted">Your quizzes live here. Write the questions (multiple choice, true/false or short answer), then send the quiz from Send Quiz and score it in Check Quiz.</p>
                <button type="button" class="btn-primary" data-new>+ New quiz</button></div>`
        }</div></div>`;
      case "links":
        return head("Quiz Links", `<span class="muted quiz-sub">Links to quizzes kept elsewhere, like Google Forms</span>`) + linkListHtml("links");
      case "trash":
        return head("Trash", `<span class="muted quiz-sub">Deleted items, kept ${TRASH_DAYS} days</span>`) + trashHtml();
      case "resources":
        return head("Resources", `<span class="muted quiz-sub">Study material and references for quizzes</span>`) + aiBoxHtml() + `<h4 class="quiz-h">Saved resources</h4>` + linkListHtml("resources");
    }
    return "";
  }

  function draw() {
    const el = ui.el;
    if (!el || !cc()) return;
    const top = el.querySelector(".quiz-main")?.scrollTop || 0;
    el.innerHTML = `
      <div class="quiz-layout">
        ${navHtml()}
        <section class="quiz-main app-body${ui.section === "buckets" ? " is-buckets" : ""}">${sectionHtml()}</section>
      </div>`;
    const main = el.querySelector(".quiz-main");
    if (main) main.scrollTop = top;
    drawCrumbs();
  }

  // Breadcrumbs in the window bar: Quiz › section › trainee or quiz.
  function drawCrumbs() {
    const sec = SECTIONS.find((x) => x.key === ui.section);
    const items = [{ label: sec?.label || "Quiz" }];
    const t = ui.section === "roster" && ui.traineeId && cc()?.data().trainees.find((x) => x.id === ui.traineeId);
    const d = ui.draft;
    if (t) items.push({ label: t.name });
    else if (ui.section === "check") {
      const cohort = ui.checkCohort && cc()?.data().cohorts.find((c) => c.id === ui.checkCohort);
      if (cohort) {
        items.push({ label: cohort.name });
        if (d) items.push({ label: d.title || "Untitled quiz", go: ui.checkView === "all" ? () => ((ui.checkView = ""), draw()) : null });
        if (ui.checkView === "all") items.push({ label: "All answers" });
        items[0].go = () => ((ui.checkCohort = ""), (ui.checkView = ""), draw());
      }
    } else if (d && ["buckets", "send"].includes(ui.section)) items.push({ label: d.title || "Untitled quiz" });
    if (items.length > 1 && !items[0].go) items[0].go = () => showSection(ui.section);
    window.TrainerDesk?.setCrumbs("quiz", items, () => showSection("roster"));
  }

  // ---- Editing (inputs update the draft without redrawing, so typing is never interrupted) ----
  const findQ = (id) => ui.draft?.questions.find((q) => q.id === id);
  // Trainee finders filter what's on screen without a redraw, so typing is never interrupted.
  function findFilter(input) {
    const q = input.value.trim().toLowerCase();
    if ("findAny" in input.dataset) {
      let shown = 0;
      ui.el.querySelectorAll("[data-find-list] li").forEach((li) => {
        li.hidden = !q || !li.dataset.name.includes(q);
        if (!li.hidden) shown++;
      });
      const none = ui.el.querySelector("[data-find-none]");
      if (none) none.hidden = !q || shown > 0;
    } else ui.el.querySelectorAll("[data-find-table] tbody tr").forEach((tr) => (tr.hidden = !!q && !tr.dataset.name.includes(q)));
  }
  function onInput(e) {
    const t = e.target, d = ui.draft;
    const ds = t.dataset;
    if ("findAny" in ds || "findRow" in ds) return findFilter(t);
    if ("aiRequest" in ds) return void (ai.request = t.value);
    if ("aiPaste" in ds) return void (ai.paste = t.value);
    if ("aiCount" in ds) return void (ai.count = Math.min(25, Math.max(1, Math.round(Number(t.value) || 5))));
    if (!d) return;
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
    if ("pickQuiz" in ds) return select(t.value);
    if ("fType" in ds && d) {
      d.category = t.value || null;
      queueSave();
      return draw();
    }
    if (ds.pickTrainee) {
      const ids = pickedIds();
      t.checked ? ids.add(ds.pickTrainee) : ids.delete(ds.pickTrainee);
      return draw();
    }
    if (ds.aiType) return void (ai.types[ds.aiType] = t.checked);
    if (ds.aiUse) return void (t.checked ? ai.use.add(ds.aiUse) : ai.use.delete(ds.aiUse));
    if (ds.aiPick !== undefined) {
      ai.suggestions[+ds.aiPick].pick = t.checked;
      return draw();
    }
    if ("aiTarget" in ds) return void (ai.target = t.value);
    if ("sendCohort" in ds || "rosterCohort" in ds) {
      ui.cohortId = t.value;
      ui.note = "";
      return draw();
    }
    if ("checkCohortSelect" in ds) return enterCohort(t.value);
    if ("anTrainee" in ds) {
      ui.anTrainee = t.value;
      return draw();
    }
    if ("onlyWrong" in ds) {
      ui.onlyWrong = t.checked;
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
    if (ds.section) return showSection(ds.section);
    if (ds.openTrainee || "backRoster" in ds) {
      ui.traineeId = ds.openTrainee || null;
      draw();
      const main = ui.el.querySelector(".quiz-main");
      if (main) main.scrollTop = 0;
      return;
    }
    if (ds.traineeRun) {
      const [quizId, runId] = ds.traineeRun.split("|");
      return openTrainee(ui.traineeId, quizId, runId);
    }
    if (ds.linkAdd) return addLink(ds.linkAdd);
    if (ds.linkMenu) {
      e.stopPropagation();
      const [kind, id] = ds.linkMenu.split("|");
      return openMenu(b, [
        { label: "Edit", run: () => editLink(kind, id) },
        { label: "Delete", danger: true, run: () => removeLink(kind, id) },
      ]);
    }
    if (ds.linkCopy) {
      navigator.clipboard?.writeText(ds.linkCopy).then(() => ((b.textContent = "Copied ✓"), setTimeout(() => b.isConnected && (b.textContent = "Copy link"), 1500)));
      return;
    }
    if ("rosterRefresh" in ds) return loadAllRuns().then(draw);
    if ("editWeights" in ds) return openWeights();
    if (ds.pickAll) {
      const ids = pickedIds();
      ids.clear();
      cohortMembers(ui.cohortId)
        .filter((m) => reachable(m) && (ds.pickAll === "all" || (ds.pickAll === "active" && !isInactive(m))))
        .forEach((m) => ids.add(m.id));
      return draw();
    }
    if ("aiGo" in ds) return suggestQuestions();
    if ("aiAdd" in ds) return addSuggestions();
    if (ds.openQuiz) {
      ui.section = "buckets";
      return select(ds.openQuiz);
    }
    if ("quizMenu" in ds) {
      e.stopPropagation();
      return openMenu(b, [
        { label: "Duplicate", run: () => createQuiz(d) },
        { label: "Delete quiz", danger: true, run: () => confirmDelete() },
      ]);
    }
    if (ds.analyze) return analyzeAnswers(ds.analyze);
    if (ds.anLevel) {
      ui.anLevel = ds.anLevel;
      return draw();
    }
    if (ds.checkCohort) return enterCohort(ds.checkCohort);
    if (ds.trashRestore) return void restoreTrash(ds.trashRestore);
    if (ds.trashForever) return confirmForever([ds.trashForever]);
    if ("trashEmpty" in ds) return confirmForever(trash.map((t) => t.id));
    if (!d) return;
    if (ds.qAdd) {
      d.questions.push(blankQuestion(ds.qAdd));
      queueSave();
      draw();
      ui.el.querySelector(`[data-q-prompt="${CSS.escape(d.questions.at(-1).id)}"]`)?.focus();
      return;
    }
    if (ds.qDelete) {
      const index = d.questions.findIndex((q) => q.id === ds.qDelete);
      const q = d.questions[index];
      // Blank questions just go; anything written is kept in Trash.
      if (q && (q.prompt.trim() || (q.choices || []).some((c) => c.trim()) || (q.type === "short" && String(q.answer || "").trim())))
        toTrash("question", q.prompt.trim() || "Untitled question", JSON.parse(JSON.stringify(q)), { quiz_id: d.id, quiz_title: d.title || "Untitled quiz", index }).catch(() => {});
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
    if ("allAnswers" in ds || "results" in ds) {
      ui.checkView = "allAnswers" in ds ? "all" : "";
      ui.note = "";
      draw();
      const main = ui.el.querySelector(".quiz-main");
      if (main) main.scrollTop = 0;
      return;
    }
    if ("checkHome" in ds) {
      ui.checkCohort = "";
      ui.checkView = "";
      ui.note = "";
      return draw();
    }
    if (ds.view) return openTrainee(ds.view);
  }

  function createQuiz(from) {
    flushSave();
    const now = new Date().toISOString();
    const quiz = from
      ? { ...JSON.parse(JSON.stringify(from)), id: `q${Date.now()}`, title: `${from.title || "Untitled quiz"} (copy)`, created_at: now }
      : { id: `q${Date.now()}`, title: "Untitled quiz", description: "", passing: 80, questions: [blankQuestion("mc")], created_at: now };
    saveQuiz(quiz).then(() => {
      ui.section = "buckets";
      select(quiz.id);
      if (!current()) {
        // The db snapshot hasn't arrived yet; show the new quiz straight away.
        ui.draft = JSON.parse(JSON.stringify(quiz));
        draw();
      }
      ui.el?.querySelector("[data-f-title]")?.select();
    });
  }

  // Quiz types and weights. Weights must add up to 100%.
  function openWeights() {
    let rows = quizTypes.map((t) => ({ ...t }));
    const x = sheet("", "weights-card");
    if (!x) return;
    const card = x.s.querySelector(".sheet-card");
    const total = () => rows.reduce((a, r) => a + (Number(r.weight) || 0), 0);
    const render = () => {
      const used = new Set(allQuizzes().map((q) => q.category).filter(Boolean));
      card.innerHTML = `
        <h3>Quiz types & weights</h3>
        <p class="muted">Each quiz gets a type. A trainee's weighted average is their average in each type times that type's weight. Weights must add up to 100%.</p>
        <div class="weights-rows">${rows
          .map(
            (r, i) => `<div class="weights-row">
              <input type="text" data-w-name="${i}" value="${escapeHtml(r.name)}" placeholder="Type name" aria-label="Type name" />
              <span class="weights-pct"><input type="number" min="0" max="100" data-w-weight="${i}" value="${escapeHtml(r.weight)}" aria-label="Weight for ${escapeHtml(r.name)}" /> %</span>
              <button type="button" class="q-x" data-w-remove="${i}" aria-label="Remove ${escapeHtml(r.name)}"${rows.length === 1 || used.has(r.id) ? ` disabled title="${used.has(r.id) ? "Quizzes use this type" : ""}"` : ""}>×</button>
            </div>`
          )
          .join("")}</div>
        <button type="button" class="btn btn-small" data-w-add>+ Add a type</button>
        <p class="weights-total ${total() === 100 ? "ok-text" : "bad-text"}" data-w-total>Total: ${total()}%${total() === 100 ? " ✓" : " (must be 100%)"}</p>
        <p class="sheet-status" data-w-status></p>
        <div class="sheet-actions"><button type="button" class="btn" data-cancel>Cancel</button><button type="button" class="btn-primary" data-w-save>Save</button></div>`;
    };
    render();
    card.addEventListener("input", (e) => {
      const t = e.target;
      if (t.dataset.wName !== undefined) rows[+t.dataset.wName].name = t.value;
      if (t.dataset.wWeight !== undefined) {
        rows[+t.dataset.wWeight].weight = Math.max(0, Math.min(100, Math.round(Number(t.value) || 0)));
        const el = card.querySelector("[data-w-total]"), sum = total();
        el.textContent = `Total: ${sum}%${sum === 100 ? " ✓" : " (must be 100%)"}`;
        el.className = `weights-total ${sum === 100 ? "ok-text" : "bad-text"}`;
      }
    });
    card.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b || b.disabled) return;
      if ("wAdd" in b.dataset) {
        rows.push({ id: uid(), name: "", weight: 0 });
        render();
        return card.querySelectorAll("[data-w-name]")[rows.length - 1]?.focus();
      }
      if (b.dataset.wRemove !== undefined) {
        rows.splice(+b.dataset.wRemove, 1);
        return render();
      }
      if ("wSave" in b.dataset) {
        const status = card.querySelector("[data-w-status]");
        rows = rows.map((r) => ({ ...r, name: r.name.trim() }));
        if (rows.some((r) => !r.name)) return void (status.textContent = "Give every type a name.");
        if (total() !== 100) return void (status.textContent = "Weights must add up to 100%.");
        saveQuizTypes(rows).then(
          () => {
            x.close();
            draw();
          },
          () => (status.textContent = "Couldn't save. Try again.")
        );
      }
    });
    card.querySelector("[data-w-name]")?.focus();
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
      <p class="muted">It moves to Trash with its results for ${TRASH_DAYS} days, and you can restore it from there. Slack messages already sent stay in Slack.</p>
      <div class="sheet-actions"><button type="button" class="btn" data-cancel>Cancel</button><button type="button" class="btn-danger" data-yes>Move to Trash</button></div>`);
    if (!x) return;
    x.s.querySelector("[data-yes]").addEventListener("click", () => {
      clearTimeout(ui.saveTimer);
      ui.saveTimer = null;
      const sends = runsFor === d.id ? runs.length : allRuns?.[d.id]?.length || 0;
      const copy = JSON.parse(JSON.stringify(d));
      toTrash("quiz", d.title || "Untitled quiz", copy, { sends })
        .then(() => deleteQuiz(d.id))
        .then(() => {
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
    const members = pickedMembers();
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
    if (allRuns) patchAllRuns(ui.selected, run);
    ui.runId = run.id;
    ui.section = "check";
    ui.checkCohort = cohort.id;
    ui.checkView = "";
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
  // Opened from Check Quiz (the selected quiz and send) or from a trainee's page (any quiz and send).
  function openTrainee(tid, quizId = ui.selected, runId = ui.runId) {
    const pool = () => (quizId === runsFor ? runs : allRuns?.[quizId] || []);
    const run = pool().find((r) => r.id === runId);
    if (!run?.recipients?.[tid]) return;
    const quiz = run.quiz;
    const rec = run.recipients[tid];
    const x = sheet("", "quiz-detail");
    if (!x) return;
    let editing = !run.responses?.[tid]?.text;
    let sending = false; // writing the result message to send on Slack
    let feedback = ""; // that message, kept while the sheet redraws
    let local = null; // this sheet's last save, used until the saved copy comes back
    const latest = () => {
      const fromDb = pool().find((r) => r.id === run.id) || run;
      const mine = local?.responses?.[tid], theirs = fromDb.responses?.[tid];
      return mine && (!theirs || (mine.checked_at || "") > (theirs.checked_at || "")) ? local : fromDb;
    };
    const render = () => {
      const live = latest();
      const resp = live.responses?.[tid];
      const sc = resp ? score(quiz, resp.results) : null;
      x.s.querySelector(".sheet-card").innerHTML = `
        <h3>${escapeHtml(rec.name)} · ${escapeHtml(quiz.title)}</h3>
        <p class="muted">${resp?.text ? `<b>${sc.pct}%</b> · ${sc.earned}/${sc.total} points${sc.pending ? ` · ${plural(sc.pending, "answer")} to review` : ""} · ${resp.source === "manual" ? "entered by hand" : "from Slack"} · checked ${escapeHtml(stamp(resp.checked_at))}${resp.feedback_sent_at ? ` · <b>result sent ${escapeHtml(stamp(resp.feedback_sent_at))}</b>` : ""}` : "No answers yet."}</p>
        ${
          sending
            ? `<p class="quiz-send-help">Goes to ${escapeHtml(rec.name)} as a Slack DM from you. Change anything before sending, like adding a note of your own.</p>
               <label class="quiz-paste">Message
                 <textarea rows="10" data-feedback>${escapeHtml(feedback)}</textarea></label>
               ${rec.ts ? `<label class="aa-filter"><input type="checkbox" data-in-thread checked /> Reply in the quiz's thread, so it sits under the quiz</label>` : ""}
               <p class="sheet-status" data-status role="status"></p>
               <div class="sheet-actions"><button type="button" class="btn" data-stop-send>Back</button><button type="button" class="btn-primary" data-send-feedback>Send on Slack</button></div>`
            : editing
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
               <p class="sheet-status" data-status role="status">${sentNote}</p>
               <div class="sheet-actions"><button type="button" class="btn" data-edit>Edit answers</button><button type="button" class="btn" data-all-from-sheet>All trainees' answers</button><span class="flex"></span><button type="button" class="btn" data-start-send${sc.pending ? ' title="Some answers still need your review"' : ""}>${resp.feedback_sent_at ? "Send result again" : "Send result to trainee"}</button><button type="button" class="btn-primary" data-cancel>Close</button></div>`
        }`;
      x.s.querySelector("[data-paste], [data-feedback]")?.focus();
    };
    let sentNote = "";
    render();
    x.s.addEventListener("input", (e) => "feedback" in e.target.dataset && (feedback = e.target.value));
    x.s.addEventListener("click", async (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const live = latest();
      sentNote = "";
      if ("edit" in b.dataset) return (editing = true), render();
      if ("startSend" in b.dataset) {
        feedback = feedbackMessage(quiz, live.responses[tid], rec.name);
        sending = true;
        return render();
      }
      if ("stopSend" in b.dataset) return (sending = false), render();
      if ("allFromSheet" in b.dataset) {
        x.close();
        if (ui.section !== "check") {
          ui.section = "check";
          try {
            localStorage.setItem(SECTION_KEY, "check");
          } catch {}
        }
        ui.traineeId = null;
        ui.checkCohort = run.cohort_id || "";
        if (ui.selected !== quizId) select(quizId);
        ui.runId = runId;
        ui.checkView = "all";
        ui.note = "";
        return draw();
      }
      if ("sendFeedback" in b.dataset) {
        const status = x.s.querySelector("[data-status]");
        const message = feedback.trim();
        if (!message) return void (status.textContent = "Write the message first.");
        const s = slack();
        if (!s) return void (status.textContent = "Slack isn't available right now.");
        b.disabled = true;
        status.textContent = "Sending…";
        try {
          const trainee = cc()?.data().trainees.find((t) => t.id === tid);
          const userId = rec.slack_user_id || (trainee ? await s.userIdFor(trainee) : null);
          if (!userId) throw Object.assign(new Error("Couldn't find them on Slack. Check their work email in Settings → Roster."), { plain: true });
          const args = { channel_id: userId, message };
          if (rec.ts && x.s.querySelector("[data-in-thread]")?.checked) {
            args.channel_id = rec.channel || userId;
            args.thread_ts = rec.ts;
          }
          await s.call("slack_send_message", args);
        } catch (err) {
          b.disabled = false;
          return void (status.textContent = err?.plain ? err.message : s.errorText(err));
        }
        const resp = { ...live.responses[tid], feedback_sent_at: new Date().toISOString() };
        local = { ...live, responses: { ...live.responses, [tid]: resp } };
        patchAllRuns(quizId, local);
        await saveRun(quizId, local).catch(() => {});
        sending = false;
        sentNote = `Result sent to ${rec.name} on Slack ✓`;
        return render();
      }
      if ("stopEdit" in b.dataset) return (editing = false), render();
      if ("grade" in b.dataset) {
        const text = x.s.querySelector("[data-paste]").value.trim();
        const status = x.s.querySelector("[data-status]");
        if (!text) return void (status.textContent = "Type or paste their answers first.");
        b.disabled = true;
        status.textContent = "Checking…";
        const responses = await gradeReplies(live, { [tid]: text }, "manual");
        local = { ...live, responses };
        patchAllRuns(quizId, local);
        await saveRun(quizId, local).catch(() => (status.textContent = "Couldn't save. Try again."));
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
        patchAllRuns(quizId, local);
        await saveRun(quizId, local).catch(() => {});
        return render();
      }
    });
    const off = (() => {
      const f = () => x.s.isConnected && !editing && !sending && render();
      listeners.add(f);
      return () => listeners.delete(f);
    })();
    new MutationObserver((_, obs) => !x.s.isConnected && (off(), obs.disconnect())).observe(x.s.parentElement, { childList: true });
  }

  // Hourly (from the dashboard's notification check): who has replied to a recent quiz and hasn't been graded yet.
  // Read-only: nothing is graded or saved here; the notification points to Check Quiz.
  window.TrainerNotify?.register({
    id: "quiz",
    label: "Quiz replies",
    app: "quiz",
    async poll() {
      const s = slack();
      if (!s) return [];
      await dbReady;
      await loadAllRuns();
      const cutoff = Date.now() - 14 * 86400000;
      const out = [];
      let reads = 0;
      for (const [quizId, list] of Object.entries(allRuns || {})) {
        for (const run of list) {
          if (Date.parse(run.sent_at) < cutoff) continue;
          for (const [tid, rec] of Object.entries(run.recipients || {})) {
            if (!rec.sent || !rec.slack_user_id || !rec.ts || run.responses?.[tid]?.text || reads >= 30) continue;
            const id = `quiz:${run.id}:${tid}`;
            reads++;
            try {
              const text = await traineeReplies(rec);
              if (text.trim())
                out.push({
                  id,
                  title: `${rec.name} replied to “${run.quiz?.title || "a quiz"}”`,
                  body: "Open Check Quiz and click Check replies to grade it.",
                  at: new Date().toISOString(),
                });
            } catch {
              /* one DM that can't be read shouldn't stop the rest */
            }
          }
        }
      }
      return out;
    },
  });

  window.TrainerQuiz = {
    render(el) {
      ui.el = el;
      el.classList.add("flush", "quiz-root");
      el.addEventListener("input", onInput);
      el.addEventListener("change", onChange);
      el.addEventListener("click", onClick);
      // Enter in a link form adds the link.
      el.addEventListener("keydown", (e) => {
        const f = e.target.closest?.("[data-link-form]");
        if (f && e.key === "Enter") {
          e.preventDefault();
          addLink(f.dataset.linkForm);
        }
      });
      el.addEventListener("submit", (e) => e.preventDefault());
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
      ui.offCc = cc()?.onChange(() => (ui.section === "send" || ui.section === "roster") && draw());
      if (ui.section === "roster") loadAllRuns().then(() => ui.el && draw());
      if (!ui.selected && allQuizzes().length) select(allQuizzes()[0].id);
      else draw();
    },
    onClose() {
      flushSave();
      ui.offData?.();
      ui.offCc?.();
      ui.el = null;
    },
    // One trainee's quiz results for Performance: every quiz they answered with its score, and the
    // questions they missed (their "opportunities"). Resolves { ready, avg, weighted, taken, sent, items }.
    traineeResults(traineeId) {
      const waitQuizzes = (n = 0) => (quizzesLoaded || n > 40 ? Promise.resolve() : new Promise((r) => setTimeout(r, 100)).then(() => waitQuizzes(n + 1)));
      return dbReady.then(waitQuizzes).then(() => loadAllRuns()).then(() => {
        const st = traineeQuizStats(traineeId);
        const quizById = new Map(allQuizzes().map((q) => [q.id, q]));
        const items = Object.entries(allRuns || {})
          .flatMap(([quizId, list]) => list.filter((r) => r.recipients?.[traineeId]).map((r) => ({ quizId, r, x: r.responses?.[traineeId] })))
          .sort((a, b) => (b.r.sent_at || "").localeCompare(a.r.sent_at || ""))
          .map(({ quizId, r, x }) => {
            const quiz = r.quiz || {};
            const answered = !!(x?.text && x.total);
            const missed = answered
              ? (quiz.questions || [])
                  .filter((q) => x.results?.[q.id]?.correct === false)
                  .map((q) => ({ question: q.prompt, answer: x.results[q.id].answer || "", correct: keyText(q) }))
              : [];
            return {
              title: quiz.title || quizById.get(quizId)?.title || "Quiz",
              type: typeOf(quizById.get(quizId))?.name || "",
              typeId: typeOf(quizById.get(quizId))?.id || "",
              sent_at: r.sent_at || "",
              status: answered ? "Answered" : r.recipients[traineeId].sent ? "No reply yet" : "Not sent",
              pct: answered ? x.pct : null,
              earned: answered ? x.earned : null,
              total: answered ? x.total : null,
              passing: quiz.passing ?? 80,
              pending: answered ? x.pending || 0 : 0,
              missed,
            };
          });
        return { avg: st.taken ? Math.round(st.sum / st.taken) : null, weighted: st.weighted, taken: st.taken, sent: st.sent, items, types: quizTypes.map((t) => ({ id: t.id, name: t.name, weight: Number(t.weight) || 0 })) };
      });
    },
    // For tests and reuse.
    _parseAnswers: parseAnswers,
  };
})();
