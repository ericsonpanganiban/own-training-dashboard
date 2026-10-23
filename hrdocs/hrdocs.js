// HR Docs: fill in a form, get a formal document (Notice to Explain, Notice of Decision, Deliberation Document, or a
// blank one), edit the wording, save it on this workspace, copy it or export it to Google Docs.
// Documents live in hr_docs/ of the viewer's workspace (through TrainerUse, so the usual Trainer / read-only rules apply).
(function () {
  "use strict";
  if (typeof APPS === "undefined" || APPS.hrdocs) return;
  const esc = (s) => escapeHtml(String(s == null ? "" : s));
  const pad = (n) => String(n).padStart(2, "0");
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const longDate = (v) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : v || "";
  };
  const shortDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "");
  const inactive = (t) => (typeof isInactive === "function" ? isInactive(t) : t.cohort_status === "inactive");
  const line = (s, n = 36) => (s ? s : "_".repeat(n));

  // ---- Templates. A field is { key, label, kind: text|date|area|select, options?, polish?, hint?, def? } ----
  const DECISIONS = ["Dismissed: no violation found", "Verbal reminder", "Written warning", "Final written warning", "Suspension", "Termination for just cause", "Other (see details)"];
  const TEMPLATES = {
    nte: {
      name: "Notice to Explain",
      blurb: "Tells the person what they are accused of and asks for a written explanation.",
      fields: [
        { key: "incident_date", label: "Date of incident", kind: "date" },
        { key: "subject", label: "Subject / short title of the incident", kind: "text", hint: "e.g. Unauthorized absence on October 15" },
        { key: "incident", label: "What happened", kind: "area", polish: true, hint: "State the facts: who, what, when, where. No opinions." },
        { key: "policy", label: "Policy or rule violated", kind: "text", hint: "e.g. Code of Conduct, Section 4.2 (Attendance)" },
        { key: "reply_within", label: "Reply within", kind: "select", options: ["24 hours", "48 hours", "72 hours", "5 calendar days"], def: "48 hours" },
        { key: "hearing", label: "Administrative hearing (optional)", kind: "text", hint: "Date, time and place or link, if any" },
      ],
      build: (f, c) =>
        [
          "NOTICE TO EXPLAIN",
          "",
          `Date: ${longDate(f.date)}`,
          `To: ${c.employee}${f.position ? `, ${f.position}` : ""}${c.cohort ? ` (${c.cohort})` : ""}`,
          `From: ${f.issuer}${f.issuer_role ? `, ${f.issuer_role}` : ""}`,
          `Subject: ${f.subject || "Notice to Explain"}`,
          "",
          `Dear ${c.first},`,
          "",
          `This is to formally inform you that on ${longDate(f.incident_date) || "[date]"}, the following was reported and recorded:`,
          "",
          f.incident || "[Describe the incident.]",
          "",
          f.policy ? `This conduct may constitute a violation of: ${f.policy}.` : "This conduct may constitute a violation of company policy.",
          "",
          `In line with due process, you are directed to submit a written explanation of why no disciplinary action should be taken against you. Your written explanation must be submitted within ${f.reply_within || "48 hours"} from your receipt of this notice.`,
          "",
          ...(f.hearing ? [`An administrative hearing is set for ${f.hearing}. You may bring any document or witness that supports your explanation.`, ""] : []),
          "Failure to submit your written explanation within the period given will be treated as a waiver of your right to explain, and the matter will be decided on the basis of the available records.",
          "",
          "Please acknowledge receipt of this notice by signing below.",
          "",
          "",
          `${line(f.issuer)}`,
          `${f.issuer_role || "Issued by"}`,
          "",
          "",
          "Received by: ____________________________",
          "Signature over printed name",
          "Date and time received: ____________________",
        ].join("\n"),
    },
    nod: {
      name: "Notice of Decision",
      blurb: "Tells the person the findings and the decision after their explanation was reviewed.",
      fields: [
        { key: "nte_date", label: "Date of the Notice to Explain", kind: "date" },
        { key: "subject", label: "Subject / short title of the case", kind: "text" },
        { key: "incident", label: "Summary of the charge", kind: "area", polish: true },
        { key: "explanation", label: "Explanation (summary)", kind: "area", polish: true, hint: "Write \"No explanation was submitted\" if none was." },
        { key: "findings", label: "Findings", kind: "area", polish: true, hint: "What the evidence and the explanation established." },
        { key: "decision", label: "Decision", kind: "select", options: DECISIONS, def: "Written warning" },
        { key: "detail", label: "Penalty details (optional)", kind: "text", hint: "e.g. 3 working days without pay, Oct 28-30" },
        { key: "effective", label: "Effective date", kind: "date" },
      ],
      build: (f, c) =>
        [
          "NOTICE OF DECISION",
          "",
          `Date: ${longDate(f.date)}`,
          `To: ${c.employee}${f.position ? `, ${f.position}` : ""}${c.cohort ? ` (${c.cohort})` : ""}`,
          `From: ${f.issuer}${f.issuer_role ? `, ${f.issuer_role}` : ""}`,
          `Subject: ${f.subject ? `Decision: ${f.subject}` : "Notice of Decision"}`,
          "",
          `Dear ${c.first},`,
          "",
          `This refers to the Notice to Explain dated ${longDate(f.nte_date) || "[date]"} regarding the following:`,
          "",
          f.incident || "[Summary of the charge.]",
          "",
          "Your explanation:",
          f.explanation || "[Summary of the explanation.]",
          "",
          "Findings:",
          f.findings || "[What the evidence and the explanation established.]",
          "",
          `Decision: ${f.decision || "[Decision]"}${f.detail ? `. ${f.detail}` : ""}.`,
          "",
          ...(f.effective ? [`This decision is effective ${longDate(f.effective)}.`, ""] : []),
          "Please acknowledge receipt of this notice by signing below.",
          "",
          "",
          `${line(f.issuer)}`,
          `${f.issuer_role || "Issued by"}`,
          "",
          "",
          "Received by: ____________________________",
          "Signature over printed name",
          "Date and time received: ____________________",
        ].join("\n"),
    },
    delib: {
      name: "Deliberation Document",
      blurb: "The record of how the case was weighed: facts, explanation, evidence, analysis and recommendation.",
      fields: [
        { key: "case_ref", label: "Case title or reference", kind: "text" },
        { key: "meeting", label: "Date and place of deliberation", kind: "text", hint: "e.g. October 22, 2026, 3:00 PM, Zoom" },
        { key: "panel", label: "Panel members (one per line)", kind: "area" },
        { key: "charge", label: "Charge or allegation", kind: "area", polish: true },
        { key: "facts", label: "Facts of the case", kind: "area", polish: true },
        { key: "explanation", label: "Explanation", kind: "area", polish: true },
        { key: "evidence", label: "Evidence reviewed (one per line)", kind: "area" },
        { key: "issues", label: "Issues", kind: "area", hint: "e.g. Was the rule violated? Is the penalty proportionate?" },
        { key: "analysis", label: "Discussion and analysis", kind: "area", polish: true },
        { key: "decision", label: "Recommendation", kind: "select", options: DECISIONS, def: "Written warning" },
        { key: "detail", label: "Recommendation details (optional)", kind: "text" },
      ],
      build: (f, c) => {
        const list = (s, empty) => (String(s || "").trim() ? String(s).trim().split(/\r?\n/).filter(Boolean).map((x, i) => `${i + 1}. ${x.replace(/^\s*(\d+[.)]|[-•*])\s*/, "")}`).join("\n") : empty);
        return [
          "DELIBERATION DOCUMENT",
          "",
          `Case: ${f.case_ref || "[Case title]"}`,
          `Name: ${c.employee}${f.position ? `, ${f.position}` : ""}${c.cohort ? ` (${c.cohort})` : ""}`,
          `Date prepared: ${longDate(f.date)}`,
          `Deliberation: ${f.meeting || "[date and place]"}`,
          `Prepared by: ${f.issuer}${f.issuer_role ? `, ${f.issuer_role}` : ""}`,
          "",
          "PANEL",
          list(f.panel, "[Panel members]"),
          "",
          "CHARGE",
          f.charge || "[Charge or allegation]",
          "",
          "FACTS OF THE CASE",
          f.facts || "[Facts]",
          "",
          "EXPLANATION",
          f.explanation || "[Explanation, or that none was submitted]",
          "",
          "EVIDENCE REVIEWED",
          list(f.evidence, "[Evidence]"),
          "",
          "ISSUES",
          f.issues || "[Issues for resolution]",
          "",
          "DISCUSSION AND ANALYSIS",
          f.analysis || "[Discussion]",
          "",
          "RECOMMENDATION",
          `${f.decision || "[Recommendation]"}${f.detail ? `: ${f.detail}` : ""}.`,
          "",
          "",
          `${line(f.issuer)}`,
          `${f.issuer_role || "Prepared by"}`,
        ].join("\n");
      },
    },
    blank: {
      name: "Blank document",
      blurb: "Start from an empty page with the heading and details filled in.",
      fields: [{ key: "subject", label: "Title", kind: "text" }],
      build: (f, c) => [(f.subject || "DOCUMENT").toUpperCase(), "", `Date: ${longDate(f.date)}`, `To: ${c.employee}`, `From: ${f.issuer}${f.issuer_role ? `, ${f.issuer_role}` : ""}`, "", `Dear ${c.first},`, "", "", "", `${line(f.issuer)}`, `${f.issuer_role || ""}`].join("\n"),
    },
  };
  const ORDER = ["nte", "nod", "delib", "blank"];
  const FOLLOW = { nte: ["nod", "delib"], delib: ["nod"], nod: [], blank: [] };

  let db = null, docs = [], unsubs = [], root = null, offCc = null;
  let view = "list"; // list | edit
  let cur = null; // the document being edited: { id, type, employee_id, fields, text, edited, status, created_at }
  let msg = "";
  let msgUrl = "";
  let busy = {};
  let filter = "all";
  let pendingDel = ""; // two clicks to delete (confirm dialogs are blocked in the page)

  const trainees = () => (window.CoachingCompass ? window.CoachingCompass.data().trainees : []);
  const cohortOf = (id) => {
    const cc = window.CoachingCompass;
    return cc ? cc.data().cohorts.find((c) => (c.trainee_ids || []).includes(id)) : null;
  };
  const ctx = () => {
    const t = trainees().find((x) => x.id === cur.employee_id);
    const name = t ? t.name : cur.fields.employee_name || "[Name]";
    return { employee: name, first: String(name).split(/\s+/)[0] || "there", cohort: (cohortOf(cur.employee_id) || {}).name || "" };
  };
  const rebuild = () => {
    cur.text = TEMPLATES[cur.type].build(cur.fields, ctx());
    cur.edited = false;
  };
  const me = () => (window.TrainerWS && window.TrainerWS.ws && window.TrainerWS.ws.name) || "";

  function newDoc(type, from) {
    const T = TEMPLATES[type];
    const base = { date: today(), position: "", issuer: me(), issuer_role: "Trainer" };
    T.fields.forEach((fd) => (base[fd.key] = fd.def || ""));
    if (from) {
      // Carry over what the two documents share.
      const keep = ["position", "issuer", "issuer_role", "subject", "incident", "explanation", "decision", "detail", "policy", "case_ref"];
      keep.forEach((k) => {
        if (from.fields[k] && (k in base)) base[k] = from.fields[k];
      });
      if (from.type === "nte" && type === "nod") base.nte_date = from.fields.date || "";
      if (from.type === "nte" && type === "delib") {
        base.charge = [from.fields.incident, from.fields.policy ? `Policy: ${from.fields.policy}` : ""].filter(Boolean).join("\n");
        base.facts = from.fields.incident || "";
        base.case_ref = from.fields.subject || "";
      }
      if (from.type === "delib" && type === "nod") {
        base.incident = from.fields.charge || "";
        base.findings = from.fields.analysis || "";
      }
    }
    cur = { id: "", type, employee_id: from ? from.employee_id : "", fields: base, text: "", edited: false, status: "draft", created_at: "" };
    rebuild();
    view = "edit";
    msg = "";
  }

  // ---- Screens ----
  function shell(el) {
    root = el;
    el.innerHTML = `<div class="hrd"><div class="hrd-body"></div></div>`;
  }
  const body = () => root && root.querySelector(".hrd-body");

  function listHtml() {
    const shown = docs.filter((d) => filter === "all" || d.type === filter).sort((a, b) => String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)));
    return `
      <p class="hrd-sub">Create a document from a template, edit the wording, then copy it or export it to Google Docs. These are general drafts: have HR or legal review them before they are issued.</p>
      <div class="hrd-new">${ORDER.map((k) => `<button type="button" class="hrd-card" data-hrd-new="${k}"><b>${esc(TEMPLATES[k].name)}</b><small>${esc(TEMPLATES[k].blurb)}</small></button>`).join("")}</div>
      <div class="hrd-head"><h4>Saved documents</h4>
        <select data-hrd-filter aria-label="Filter by type"><option value="all">All types</option>${ORDER.map((k) => `<option value="${k}"${filter === k ? " selected" : ""}>${esc(TEMPLATES[k].name)}</option>`).join("")}</select></div>
      ${msg ? `<p class="hrd-msg" role="status">${esc(msg)}</p>` : ""}
      ${
        shown.length
          ? shown
              .map(
                (d) => `<div class="hrd-row"><div class="hrd-main"><b>${esc(TEMPLATES[d.type]?.name || d.type)}</b> · ${esc(d.employee_name || "No name")}
                <small>${esc(d.status === "issued" ? `Issued ${shortDate(d.issued_at)}` : "Draft")} · updated ${esc(shortDate(d.updated_at || d.created_at))}</small></div>
                <span class="chip ${d.status === "issued" ? "hrd-issued" : ""}">${d.status === "issued" ? "Issued" : "Draft"}</span>
                <span class="hrd-acts"><button type="button" class="btn" data-hrd-open="${esc(d.id)}">Open</button><button type="button" class="btn${pendingDel === d.id ? " hrd-danger" : ""}" data-hrd-del="${esc(d.id)}">${pendingDel === d.id ? "Click again to delete" : "Delete"}</button></span></div>`
              )
              .join("")
          : `<div class="hrd-empty">${docs.length ? "No documents of this type." : "No documents yet. Pick a template above."}</div>`
      }`;
  }

  function fieldHtml(fd) {
    const v = cur.fields[fd.key] || "";
    const id = `hrd-${fd.key}`;
    const hint = fd.hint ? `<small class="muted">${esc(fd.hint)}</small>` : "";
    let input;
    if (fd.kind === "area") input = `<textarea id="${id}" data-hrd-f="${fd.key}" rows="4">${esc(v)}</textarea>`;
    else if (fd.kind === "select") input = `<select id="${id}" data-hrd-f="${fd.key}">${fd.options.map((o) => `<option${o === v ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    else input = `<input id="${id}" type="${fd.kind === "date" ? "date" : "text"}" data-hrd-f="${fd.key}" value="${esc(v)}" autocomplete="off">`;
    const polish = fd.polish ? ` <button type="button" class="linkish" data-hrd-polish="${fd.key}"${busy["p" + fd.key] ? " disabled" : ""}>${busy["p" + fd.key] ? "Polishing…" : "Polish wording with Claude"}</button>` : "";
    return `<label class="hrd-f" for="${id}"><span>${esc(fd.label)}${polish}</span>${input}${hint}</label>`;
  }

  function editHtml() {
    const T = TEMPLATES[cur.type];
    const emps = trainees()
      .slice()
      .sort((a, b) => (inactive(a) - inactive(b)) || String(a.name).localeCompare(String(b.name)));
    const follow = FOLLOW[cur.type].filter((k) => cur.id);
    return `
      <div class="hrd-head"><h4>${esc(T.name)}${cur.status === "issued" ? ` <span class="chip hrd-issued">Issued</span>` : ""}</h4>
        <button type="button" class="btn" data-hrd-back>← All documents</button></div>
      <div class="hrd-grid">
        <label class="hrd-f"><span>Name</span><select data-hrd-emp><option value="">Pick a name…</option>${emps.map((t) => `<option value="${esc(t.id)}"${t.id === cur.employee_id ? " selected" : ""}>${esc(t.name)}${inactive(t) ? " (Inactive)" : ""}</option>`).join("")}</select></label>
        <label class="hrd-f"><span>Position</span><input type="text" data-hrd-f="position" value="${esc(cur.fields.position)}" placeholder="e.g. Customer Care Trainee"></label>
        <label class="hrd-f"><span>Date of notice</span><input type="date" data-hrd-f="date" value="${esc(cur.fields.date)}"></label>
        <label class="hrd-f"><span>Issued by</span><input type="text" data-hrd-f="issuer" value="${esc(cur.fields.issuer)}"></label>
        <label class="hrd-f"><span>Role</span><input type="text" data-hrd-f="issuer_role" value="${esc(cur.fields.issuer_role)}"></label>
      </div>
      <div class="hrd-fields">${T.fields.map(fieldHtml).join("")}</div>
      <div class="hrd-head"><h4>Document</h4><span class="hrd-acts"><button type="button" class="btn" data-hrd-rebuild title="Rewrite the document from the fields above (discards manual edits)">Rebuild from fields</button></span></div>
      <textarea class="hrd-text" data-hrd-text rows="22" spellcheck="true">${esc(cur.text)}</textarea>
      <p class="hrd-note" data-hrd-note>${cur.edited ? "You edited the document by hand: changing the fields above no longer rewrites it. Use Rebuild from fields to start over." : "The document updates as you fill in the fields. Edit it directly to fine-tune the wording."}</p>
      ${msg ? `<p class="hrd-msg" role="status">${esc(msg)}${msgUrl ? ` <a href="${esc(msgUrl)}" target="_blank" rel="noopener noreferrer">Open in Google Docs</a>` : ""}</p>` : ""}
      <div class="hrd-bar">
        <button type="button" class="btn btn-primary" data-hrd-save${busy.save ? " disabled" : ""}>${busy.save ? "Saving…" : cur.id ? "Save changes" : "Save draft"}</button>
        <button type="button" class="btn" data-hrd-copy>Copy</button>
        <button type="button" class="btn" data-hrd-export${busy.export ? " disabled" : ""}>${busy.export ? "Exporting…" : "Export to Google Docs"}</button>
        ${cur.id && cur.status !== "issued" ? `<button type="button" class="btn" data-hrd-issue title="Mark as given to them">Mark as issued</button>` : ""}
        ${cur.id && cur.status === "issued" ? `<button type="button" class="btn" data-hrd-unissue>Back to draft</button>` : ""}
        ${follow.map((k) => `<button type="button" class="btn" data-hrd-next="${k}">Start ${esc(TEMPLATES[k].name)} from this</button>`).join("")}
      </div>`;
  }

  function paint() {
    const b = body();
    if (!b) return;
    b.innerHTML = view === "list" ? listHtml() : editHtml();
  }
  const say = (m) => {
    msg = m;
    msgUrl = "";
    paint();
  };

  // ---- Data ----
  function connect() {
    if (db || !window.TrainerUse) return;
    window.TrainerUse("db").then((d) => {
      if (!d || db || !root || !root.isConnected) return;
      db = d;
      unsubs.push(
        db.collection("hr_docs").onSnapshot((snap) => {
          docs = snap.docs.map((x) => ({ id: x.id, ...(x.data() || {}) }));
          if (view === "list" && root && root.isConnected) paint();
        })
      );
    }).catch(() => {});
  }
  const record = () => {
    const c = ctx();
    return { type: cur.type, employee_id: cur.employee_id, employee_name: cur.employee_id ? c.employee : cur.fields.employee_name || "", fields: cur.fields, text: cur.text, edited: !!cur.edited, status: cur.status, issued_at: cur.issued_at || "", updated_at: new Date().toISOString() };
  };
  async function save() {
    if (!db) return say("Saving isn't available right now.");
    busy.save = true;
    paint();
    try {
      const rec = record();
      if (cur.id) await db.doc("hr_docs/" + cur.id).update(rec);
      else {
        rec.created_at = new Date().toISOString();
        const r = await db.collection("hr_docs").add(rec);
        cur.id = (r && r.id) || cur.id;
        cur.created_at = rec.created_at;
      }
      msg = "Saved ✓";
    } catch (e) {
      msg = "Couldn't save. Try again.";
    }
    delete busy.save;
    paint();
  }
  async function setStatus(status) {
    cur.status = status;
    cur.issued_at = status === "issued" ? new Date().toISOString() : "";
    await save();
    if (msg === "Saved ✓") say(status === "issued" ? "Marked as issued ✓" : "Back to draft.");
  }
  function htmlDoc() {
    const lines = cur.text.split("\n");
    const title = lines[0] || "";
    const rest = lines.slice(1).join("\n");
    return `<html><head><meta charset="utf-8"><title>${esc(title)}</title></head><body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.4"><h2 style="text-align:center;margin-bottom:18pt">${esc(title)}</h2><div style="white-space:pre-wrap">${esc(rest)}</div></body></html>`;
  }
  async function exportDoc() {
    const mcp = await window.TrainerUse("mcp").catch(() => null);
    if (!mcp) return say("Google Drive isn't available in this view. Use Copy instead.");
    busy.export = true;
    msg = "Exporting to Google Docs…";
    msgUrl = "";
    paint();
    const title = `${TEMPLATES[cur.type].name} — ${ctx().employee} — ${cur.fields.date || today()}`;
    try {
      const r = await mcp.callTool("Google Drive", "create_file", { title, textContent: htmlDoc(), contentMimeType: "text/html" });
      const p = (r && r.payload) || {};
      const url = p.viewUrl || (p.id ? `https://docs.google.com/document/d/${p.id}/edit` : "");
      if (!url) throw new Error("no link");
      msg = "Exported to Google Docs ✓";
      msgUrl = url;
    } catch (e) {
      msg = e && e.code === "not_granted" ? "Google Drive isn't allowed from this page. Allow it from the Permissions menu." : "Couldn't export to Google Docs. Use Copy instead.";
    }
    delete busy.export;
    paint();
  }
  function copy() {
    const ok = () => say("Copied. Paste it into a document.");
    const bad = () => say("Couldn't copy. Select the text and copy it yourself.");
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(cur.text).then(ok, bad);
    else bad();
  }
  async function polish(key) {
    const text = String(cur.fields[key] || "").trim();
    if (!text) return say("Write something in that box first.");
    const sample = await window.TrainerUse("sample").catch(() => null);
    if (!sample) return say("Claude isn't available in this view.");
    busy["p" + key] = true;
    paint();
    const prompt = `Rewrite the text below as formal, neutral, factual wording for an HR document (for example a Notice to Explain). Keep every fact exactly as given. Do not add facts, names, dates, numbers, accusations or conclusions that are not in the text. Do not add a greeting or heading. Plain text only. Output only the rewritten text.\n\nTEXT:\n${text}`;
    try {
      const out = await sample(prompt, { cache: false });
      const t = String(out && out.text || "").trim();
      if (!t) throw new Error("empty");
      cur.fields[key] = t;
      if (!cur.edited) rebuild();
      msg = "Reworded. Check it before you issue the document.";
    } catch (e) {
      msg = e && e.code === "rate_limited" ? "Too many requests. Wait a minute and try again." : "Claude couldn't reword that just now. Try again.";
    }
    delete busy["p" + key];
    paint();
  }

  // ---- Events ----
  function onClick(e) {
    const b = e.target.closest("button");
    if (!b) return;
    const d = b.dataset;
    if (d.hrdNew) {
      newDoc(d.hrdNew);
      paint();
    } else if (d.hrdOpen) {
      const x = docs.find((y) => y.id === d.hrdOpen);
      if (!x) return;
      cur = { id: x.id, type: x.type, employee_id: x.employee_id || "", fields: { ...(x.fields || {}) }, text: x.text || "", edited: !!x.edited, status: x.status || "draft", issued_at: x.issued_at || "", created_at: x.created_at };
      view = "edit";
      msg = "";
      paint();
    } else if (d.hrdDel) {
      const x = docs.find((y) => y.id === d.hrdDel);
      if (!x || !db) return;
      if (pendingDel !== x.id) {
        pendingDel = x.id;
        return paint();
      }
      pendingDel = "";
      db.doc("hr_docs/" + x.id).delete().then(() => say("Deleted."), () => say("Couldn't delete. Try again."));
    } else if ("hrdBack" in d) {
      view = "list";
      pendingDel = "";
      msg = "";
      paint();
    } else if ("hrdRebuild" in d) {
      rebuild();
      msg = "Rebuilt from the fields.";
      paint();
    } else if ("hrdSave" in d) save();
    else if ("hrdCopy" in d) copy();
    else if ("hrdExport" in d) exportDoc();
    else if ("hrdIssue" in d) setStatus("issued");
    else if ("hrdUnissue" in d) setStatus("draft");
    else if (d.hrdNext) {
      const from = { ...cur, fields: { ...cur.fields } };
      newDoc(d.hrdNext, from);
      paint();
    } else if (d.hrdPolish) polish(d.hrdPolish);
  }
  function onInput(e) {
    const t = e.target;
    if (!cur || view !== "edit") return;
    if (t.matches("[data-hrd-f]")) {
      cur.fields[t.dataset.hrdF] = t.value;
      if (!cur.edited) {
        rebuild();
        const ta = root.querySelector("[data-hrd-text]");
        if (ta) ta.value = cur.text;
      }
    } else if (t.matches("[data-hrd-text]")) {
      cur.text = t.value;
      if (!cur.edited) {
        cur.edited = true;
        const n = root.querySelector("[data-hrd-note]");
        if (n) n.textContent = "You edited the document by hand: changing the fields above no longer rewrites it. Use Rebuild from fields to start over.";
      }
    }
  }
  function onChange(e) {
    const t = e.target;
    if (t.matches("[data-hrd-filter]")) {
      filter = t.value;
      paint();
    } else if (t.matches("[data-hrd-emp]")) {
      cur.employee_id = t.value;
      const tr = trainees().find((x) => x.id === t.value);
      if (tr && !cur.fields.position) cur.fields.position = "Trainee";
      if (!cur.edited) rebuild();
      paint();
    } else if (t.matches("select[data-hrd-f]")) onInput(e);
  }

  APPS.hrdocs = {
    title: "HR Docs",
    icon: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6M9 8h2"/>',
    color: "#b45309",
    render(el) {
      view = "list";
      cur = null;
      msg = "";
      shell(el);
      el.addEventListener("click", onClick);
      el.addEventListener("input", onInput);
      el.addEventListener("change", onChange);
      paint();
      connect();
      offCc = window.CoachingCompass ? window.CoachingCompass.onChange(() => { if (root && root.isConnected && view === "list") paint(); }) : null;
    },
    onClose() {
      unsubs.forEach((u) => { try { u(); } catch (e) {} });
      unsubs = [];
      db = null; docs = []; busy = {};
      if (offCc) offCc();
      offCc = null; root = null; cur = null;
    },
  };
  try { if (document.querySelector(".dock-item") && typeof rebuildDock === "function") rebuildDock(); } catch (e) {}
})();
