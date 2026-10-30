// Data: export everything saved in this dashboard to one file, and import such a file into another copy (for example
// after moving the artifact to another Claude organization). Documents are read and written through TrainerUse("db"),
// so they land in the signed-in Trainer's own workspace. Settings that belong to people (Training Managers, Viewers,
// the published Trainer summary) are not exported: they point at accounts of the old organization.
(function () {
  const bar = document.querySelector(".menubar-left");
  if (!bar) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "menu-link";
  btn.id = "dataBtn";
  btn.textContent = "Data";
  btn.setAttribute("aria-haspopup", "dialog");
  bar.appendChild(btn);

  const esc = (s) => escapeHtml(String(s == null ? "" : s));
  // Top-level collections and the sub-collections that hang off their documents.
  const TREE = [
    ["cohorts", ["breaks", "attendance"]],
    ["trainees", ["notes"]],
    ["quizzes", ["runs"]],
    ["analyses", []],
    ["spot_checks", []],
    ["spot_analyses", []],
    ["ind_analyses", []],
    ["speed_weeks", []],
    ["settings", []],
    ["quiz_trash", []],
    ["quiz_analyses", []],
    ["quiz_settings", []],
    ["csq", []],
    ["todos", []],
    ["hr_docs", []],
    ["reminders", []],
    ["notifications", []],
    ["courseware", []],
  ];
  const FORMAT = "trainer-desk-export";
  const plain = (v) => JSON.parse(JSON.stringify(v == null ? {} : v));
  let box = null;
  let state = { msg: "", bad: false, busy: false, pending: null };

  async function exportAll(progress) {
    const db = await window.TrainerUse("db");
    if (!db) throw new Error("The database isn't available right now.");
    const docs = [];
    const read = async (path) => {
      const snap = await db.collection(path).get();
      return snap.docs.map((d) => ({ id: d.id, data: plain(d.data()) }));
    };
    for (const [coll, subs] of TREE) {
      progress(`Reading ${coll}…`);
      const rows = await read(coll);
      for (const r of rows) {
        docs.push({ path: `${coll}/${r.id}`, data: r.data });
        for (const sub of subs) {
          const kids = await read(`${coll}/${r.id}/${sub}`).catch(() => []);
          kids.forEach((k) => docs.push({ path: `${coll}/${r.id}/${sub}/${k.id}`, data: k.data }));
        }
      }
    }
    return { format: FORMAT, version: 1, exported_at: new Date().toISOString(), docs };
  }

  async function importAll(bundle, progress) {
    const db = await window.TrainerUse("db");
    if (!db) throw new Error("The database isn't available right now.");
    let ok = 0;
    const failed = [];
    for (let i = 0; i < bundle.docs.length; i++) {
      const d = bundle.docs[i];
      if (i % 10 === 0) progress(`Importing ${i + 1} of ${bundle.docs.length}…`);
      try {
        await db.doc(d.path).set(d.data);
        ok++;
      } catch (e) {
        failed.push(d.path);
      }
    }
    return { ok, failed };
  }

  const body = () => `
    <p>Everything you have saved here (classes, trainees and their notes, attendance and break logs, quizzes and their runs, spot checks, QA and Speed weeks, HR documents, reminders, Ops Updates and settings) lives in this artifact's database. Moving the artifact to another Claude organization does not move it. Use these two steps to carry it over.</p>
    <h3>Export</h3>
    <p>Saves one file with all of it. Keep the file private: it holds trainee details and HR documents.</p>
    <p><button type="button" class="btn btn-primary" data-data-export${state.busy ? " disabled" : ""}>Export all data</button></p>
    <h3>Import</h3>
    <p>Choose an export file made by Trainer Desk. Documents with the same name are replaced; nothing is deleted. Import into the new copy before you start using it.</p>
    <p><input type="file" accept="application/json,.json" data-data-file${state.busy ? " disabled" : ""}></p>
    ${state.pending ? `<p>This file has <b>${state.pending.docs.length}</b> documents (exported ${esc(new Date(state.pending.exported_at).toLocaleString())}). <button type="button" class="btn btn-primary" data-data-import${state.busy ? " disabled" : ""}>Import them now</button></p>` : ""}
    ${state.msg ? `<p class="${state.bad ? "bad-text" : "ok-text"}" role="status">${esc(state.msg)}</p>` : ""}
    <p class="muted"><small>Not carried over: Training Manager and Viewer lists, other Trainers' workspaces, and each Trainer's published summary. Add people again in Settings in the new copy.</small></p>`;

  function paint() {
    const b = box && box.querySelector(".about-body");
    if (b) b.innerHTML = body();
  }
  const say = (m, bad) => {
    state.msg = m;
    state.bad = !!bad;
    paint();
  };

  async function onExport() {
    state.busy = true;
    say("Reading your data…");
    try {
      const bundle = await exportAll((m) => say(m));
      const dl = await window.TrainerUse("downloads").catch(() => null);
      if (!dl || !dl.save) throw new Error("Downloading isn't available in this view.");
      await dl.save({ filename: `trainer-desk-export-${new Date().toISOString().slice(0, 10)}.json`, data: JSON.stringify(bundle) });
      state.busy = false;
      say(`Exported ${bundle.docs.length} documents ✓`);
    } catch (e) {
      state.busy = false;
      say(e && e.message ? e.message : "Couldn't export. Try again.", true);
    }
  }
  async function onFile(file) {
    state.pending = null;
    if (!file) return say("");
    try {
      const b = JSON.parse(await file.text());
      if (!b || b.format !== FORMAT || !Array.isArray(b.docs)) throw new Error("bad");
      if (b.docs.some((d) => !d || typeof d.path !== "string" || !/^[A-Za-z0-9_\-.~:@+]+(\/[A-Za-z0-9_\-.~:@+]+)+$/.test(d.path))) throw new Error("bad");
      state.pending = b;
      say("");
    } catch (e) {
      say("That isn't a Trainer Desk export file.", true);
    }
  }
  async function onImport() {
    if (!state.pending) return;
    state.busy = true;
    say("Importing…");
    try {
      const r = await importAll(state.pending, (m) => say(m));
      state.busy = false;
      state.pending = null;
      say(r.failed.length ? `Imported ${r.ok}. Couldn't write ${r.failed.length}: ${r.failed.slice(0, 5).join(", ")}${r.failed.length > 5 ? "…" : ""}` : `Imported ${r.ok} documents ✓ Reload the page to see them everywhere.`, !!r.failed.length);
    } catch (e) {
      state.busy = false;
      say(e && e.message ? e.message : "Couldn't import. Try again.", true);
    }
  }

  function close() {
    if (!box) return;
    box.remove();
    box = null;
    btn.setAttribute("aria-expanded", "false");
    btn.focus();
  }
  function open() {
    if (box) return close();
    state = { msg: "", bad: false, busy: false, pending: null };
    box = document.createElement("div");
    box.className = "about-overlay";
    box.innerHTML = `<div class="about-card" role="dialog" aria-modal="true" aria-labelledby="dataTitle">
      <div class="about-head"><div><h2 id="dataTitle">Export and import data</h2><small>Move your dashboard to another copy</small></div>
      <button type="button" class="btn" data-data-close>Close</button></div>
      <div class="about-body">${body()}</div></div>`;
    document.body.appendChild(box);
    btn.setAttribute("aria-expanded", "true");
    box.addEventListener("click", (e) => {
      if (e.target === box || e.target.closest("[data-data-close]")) return close();
      if (e.target.closest("[data-data-export]")) onExport();
      else if (e.target.closest("[data-data-import]")) onImport();
    });
    box.addEventListener("change", (e) => e.target.matches("[data-data-file]") && onFile(e.target.files[0]));
    box.addEventListener("keydown", (e) => e.key === "Escape" && close());
    box.querySelector("[data-data-close]").focus();
  }
  btn.addEventListener("click", open);
})();
