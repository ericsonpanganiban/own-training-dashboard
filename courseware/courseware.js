// ---------- Courseware: a lobby for training material links, shown as tiles with a preview ----------
// Each tile is a link to a doc, sheet, slide deck, video or page. The preview is, in order of what's
// available: the file's own thumbnail (Google Drive, YouTube), the first lines of a Google Doc, or a
// colored cover for its type. Stored in courseware/{id}: title, url, category, note, preview, created_at.
(function () {
  const use = (name) => (window.TrainerUse ? window.TrainerUse(name) : Promise.resolve(null));
  const dbReady = use("db");
  const uid = () => `c${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  const esc = (s) => escapeHtml(s == null ? "" : s);
  const plural = (n, w) => `${n} ${n === 1 ? w : `${w}s`}`;
  const cc = () => window.CoachingCompass;

  // ---- Kinds of material, worked out from the link ----
  const KINDS = {
    doc: { label: "Google Doc", color: "#2563eb", icon: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6M9 9h2"/>' },
    sheet: { label: "Google Sheet", color: "#16a34a", icon: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M4 15h16M10 4v16"/>' },
    slides: { label: "Slides", color: "#f59e0b", icon: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>' },
    form: { label: "Form", color: "#7c3aed", icon: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>' },
    folder: { label: "Drive folder", color: "#0891b2", icon: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' },
    pdf: { label: "PDF", color: "#dc2626", icon: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8.5 16.5h1.5a1.2 1.2 0 0 0 0-2.4H8.5v4M13 18.2v-4h1a2 2 0 0 1 0 4z"/>' },
    video: { label: "Video", color: "#e11d48", icon: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9.5 5 2.5-5 2.5z"/>' },
    notion: { label: "Notion page", color: "#52525b", icon: '<path d="M5 4h11l3 3v13H5z"/><path d="M9 9v7M9 9l6 7V9"/>' },
    file: { label: "Drive file", color: "#0ea5e9", icon: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>' },
    link: { label: "Link", color: "#64748b", icon: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>' },
  };
  function cleanUrl(raw) {
    let u = String(raw || "").trim();
    if (!u) return "";
    if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = `https://${u}`;
    try {
      const x = new URL(u);
      return (x.protocol === "http:" || x.protocol === "https:") && x.hostname.includes(".") ? x.href : "";
    } catch {
      return "";
    }
  }
  const driveId = (url) => (/\/d\/([a-zA-Z0-9_-]{15,})/.exec(url) || /[?&]id=([a-zA-Z0-9_-]{15,})/.exec(url) || [])[1] || "";
  const youtubeId = (url) => (/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/.exec(url) || [])[1] || "";
  function kindOf(url) {
    let x;
    try {
      x = new URL(url);
    } catch {
      return "link";
    }
    const h = x.hostname.replace(/^www\./, ""), path = x.pathname;
    if (h === "docs.google.com") return path.startsWith("/spreadsheets") ? "sheet" : path.startsWith("/presentation") ? "slides" : path.startsWith("/forms") ? "form" : "doc";
    if (h === "drive.google.com" || h === "drive.usercontent.google.com") return path.includes("/folders/") ? "folder" : "file";
    if (/\.pdf$/i.test(path)) return "pdf";
    if (/(^|\.)(youtube\.com|youtu\.be|vimeo\.com|loom\.com|wistia\.com)$/.test(h) || /\.(mp4|mov|webm)$/i.test(path)) return "video";
    if (/(^|\.)notion\.(so|site)$|(^|\.)notion\.com$/.test(h)) return "notion";
    return "link";
  }
  const hostOf = (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  };
  // A preview image the browser can fetch with no sign-in: YouTube's poster, or Drive's thumbnail for
  // anyone already signed in to Google. If it doesn't load, the tile falls back to the snippet or cover.
  function thumbOf(item) {
    const yt = youtubeId(item.url);
    if (yt) return `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;
    const id = driveId(item.url);
    if (id && item.kind !== "folder") return `https://drive.google.com/thumbnail?id=${id}&sz=w480`;
    return "";
  }

  // ---- Storage ----
  const mem = { items: [] };
  let db = null;
  let items = [];
  let loaded = false;
  const listeners = new Set();
  const notify = () => listeners.forEach((f) => f());
  dbReady.then((d) => {
    db = d;
    if (!db) {
      loaded = true;
      return notify();
    }
    db.collection("courseware").orderBy("created_at", "desc").onSnapshot(
      (snap) => {
        items = snap.docs.map((doc) => ({ id: doc.id, ...JSON.parse(JSON.stringify(doc.data() || {})) }));
        loaded = true;
        notify();
      },
      () => ((loaded = true), notify())
    );
  });
  const all = () => (db ? items : mem.items);
  function save(item) {
    const { id, ...fields } = item;
    // Shown right away; the saved copy follows.
    const list = db ? items : mem.items;
    const next = list.some((x) => x.id === id) ? list.map((x) => (x.id === id ? item : x)) : [item, ...list];
    if (db) items = next;
    else mem.items = next;
    notify();
    return db ? db.doc(`courseware/${id}`).set(fields) : Promise.resolve();
  }
  function remove(id) {
    if (db) items = items.filter((x) => x.id !== id);
    else mem.items = mem.items.filter((x) => x.id !== id);
    notify();
    return db ? db.doc(`courseware/${id}`).delete() : Promise.resolve();
  }

  // ---- Previews: the first lines of a Google Doc ----
  const previewing = new Set();
  const linesOf = (text) =>
    String(text || "")
      .replace(/\r/g, "")
      .split("\n")
      .map((l) => l.replace(/\s+/g, " ").trim())
      .filter((l) => l && !/^\W*(table of contents|contents)\W*$/i.test(l) && !/^[\d.\s]+$/.test(l));
  // A name made up from the link, like "Google Doc · docs.google.com", or the file's own name for a PDF.
  function autoTitle(url, kind) {
    try {
      const last = decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).pop() || "");
      if (/\.[a-z0-9]{2,5}$/i.test(last) && last.length > 4) return last.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[-_]+/g, " ");
    } catch {}
    return `${KINDS[kind].label} · ${hostOf(url)}`;
  }
  function loadPreview(item, force) {
    const api = cc();
    if (!api?.readDriveText || !driveId(item.url) || item.kind === "folder" || previewing.has(item.id)) return Promise.resolve();
    if (!force && item.preview?.at) return Promise.resolve();
    previewing.add(item.id);
    notify();
    return api
      .readDriveText(item.url)
      .then((text) => ({ lines: linesOf(text), at: new Date().toISOString() }), () => ({ lines: [], at: new Date().toISOString(), failed: true }))
      .then(({ lines, at, failed }) => {
        const cur = all().find((x) => x.id === item.id) || item;
        let title = cur.title;
        // With no name typed, the document's own first line is a better one.
        if (cur.auto_title && lines[0] && lines[0].length <= 90) title = lines.shift();
        else if (lines[0] && lines[0].toLowerCase() === String(title).toLowerCase()) lines.shift();
        return save({ ...cur, title, preview: { text: lines.join("  ·  ").slice(0, 260), at, ...(failed ? { failed: true } : {}) } });
      })
      .catch(() => {})
      .finally(() => {
        previewing.delete(item.id);
        notify();
      });
  }

  // ---- UI ----
  const ui = { el: null, q: "", cat: "", note: "" };
  const norm = (s) => String(s || "").trim().replace(/\s+/g, " ");
  const categories = () => {
    const m = new Map();
    all().forEach((x) => x.category && m.set(x.category, (m.get(x.category) || 0) + 1));
    return [...m].sort((a, b) => a[0].localeCompare(b[0]));
  };
  const visible = () => {
    const q = ui.q.trim().toLowerCase();
    return all().filter((x) => (!ui.cat || (ui.cat === "__none" ? !x.category : x.category === ui.cat)) && (!q || `${x.title} ${x.note || ""} ${x.category || ""} ${KINDS[x.kind]?.label || ""} ${hostOf(x.url)}`.toLowerCase().includes(q)));
  };

  function tileHtml(x) {
    const k = KINDS[x.kind] || KINDS.link;
    const thumb = thumbOf(x);
    const busy = previewing.has(x.id);
    const snippet = x.preview?.text;
    return `<li class="cw-tile" data-id="${esc(x.id)}">
      <a class="cw-preview" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer" style="--k:${k.color}" aria-label="Open ${esc(x.title)}">
        <span class="cw-cover"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${k.icon}</svg><b>${esc(k.label)}</b></span>
        ${snippet ? `<span class="cw-page" aria-hidden="true"><span class="cw-page-title">${esc(x.title)}</span>${esc(snippet)}</span>` : ""}
        ${busy ? `<span class="cw-busy">Reading the first lines…</span>` : ""}
        ${thumb ? `<img class="cw-thumb" src="${esc(thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : ""}
      </a>
      <div class="cw-meta">
        <div class="cw-title"><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer" title="${esc(x.title)}">${esc(x.title)}</a>
          <button type="button" class="square-btn kebab" data-cw-menu="${esc(x.id)}" aria-label="Options for ${esc(x.title)}">⋮</button></div>
        <div class="cw-tags"><span class="chip" style="--k:${k.color}">${esc(k.label)}</span>${x.category ? `<span class="chip cw-cat">${esc(x.category)}</span>` : ""}</div>
        ${x.note ? `<p class="cw-note">${esc(x.note)}</p>` : ""}
        <small class="muted cw-host">${esc(hostOf(x.url))}</small>
      </div>
    </li>`;
  }

  function draw() {
    const el = ui.el;
    if (!el) return;
    const keep = el.querySelector(".cw-body")?.scrollTop || 0;
    const list = visible();
    const cats = categories();
    const total = all().length;
    const uncategorized = all().filter((x) => !x.category).length;
    const chip = (key, label, n) => `<button type="button" class="cw-chip${ui.cat === key ? " is-on" : ""}" data-cw-cat="${esc(key)}">${esc(label)}${n != null ? ` <small>${n}</small>` : ""}</button>`;
    el.innerHTML = `
      <div class="cw-root">
        <div class="cw-top">
          <div class="cw-heading"><h3>Courseware</h3><span class="muted">${total ? `${plural(total, "item")} of training material` : "Training material, all in one place"}</span></div>
          <input type="search" class="cw-search" data-cw-search placeholder="Search material" value="${esc(ui.q)}" aria-label="Search courseware" autocomplete="off" />
          <button type="button" class="btn-primary" data-cw-add>+ Add material</button>
        </div>
        ${total && (cats.length || uncategorized !== total) ? `<div class="cw-chips" role="group" aria-label="Filter by category">${chip("", "All", total)}${cats.map(([c, n]) => chip(c, c, n)).join("")}${cats.length && uncategorized ? chip("__none", "Uncategorized", uncategorized) : ""}</div>` : ""}
        ${ui.note ? `<p class="quiz-note" role="status">${ui.note}</p>` : ""}
        <div class="cw-body">
          ${
            !loaded
              ? `<p class="muted">Loading…</p>`
              : !total
                ? `<div class="cw-empty"><h3>No material yet</h3><p class="muted">Paste the links to your training material: Google Docs, Sheets, Slides, PDFs, videos, anything with a link. Each shows up here as a tile with a preview.</p><button type="button" class="btn-primary" data-cw-add>+ Add material</button></div>`
                : list.length
                  ? `<ul class="cw-grid">${list.map(tileHtml).join("")}</ul>`
                  : `<p class="muted">Nothing matches that. <button type="button" class="linkish" data-cw-clear>Clear the search and filter</button></p>`
          }
        </div>
      </div>`;
    const body = el.querySelector(".cw-body");
    if (body) body.scrollTop = keep;
    // A preview image that doesn't load just hides, leaving the snippet or cover beneath it.
    el.querySelectorAll(".cw-thumb").forEach((img) => {
      img.addEventListener("error", () => img.remove(), { once: true });
      img.addEventListener("load", () => img.naturalWidth < 40 && img.remove(), { once: true });
    });
    window.TrainerDesk?.setCrumbs("courseware", ui.cat ? [{ label: ui.cat === "__none" ? "Uncategorized" : ui.cat }] : [], () => ((ui.cat = ""), (ui.q = ""), draw()));
  }

  // ---- Add / edit / delete ----
  function sheet(html, cls = "") {
    const win = ui.el?.closest(".window");
    if (!win || win.querySelector(".sheet")) return null;
    const s = document.createElement("div");
    s.className = "sheet";
    s.innerHTML = `<form class="sheet-card ${cls}" role="dialog" novalidate>${html}</form>`;
    win.appendChild(s);
    const close = () => s.remove();
    s.addEventListener("click", (e) => (e.target === s || e.target.closest("[data-cancel]")) && close());
    s.addEventListener("keydown", (e) => e.key === "Escape" && close());
    return { s, close };
  }
  function openForm(item) {
    const editing = !!item;
    const cats = categories().map(([c]) => c);
    const x = sheet(`
      <h3>${editing ? "Edit material" : "Add material"}</h3>
      <label class="cw-field">Link
        <input type="url" name="url" placeholder="https://docs.google.com/…" value="${esc(item?.url || "")}" autocomplete="off" /></label>
      <label class="cw-field">Name <small class="muted">(optional, filled in from the link)</small>
        <input type="text" name="title" placeholder="e.g. Week 1 — Refund policy" value="${esc(item?.title || "")}" autocomplete="off" /></label>
      <label class="cw-field">Category <small class="muted">(optional)</small>
        <input type="text" name="category" list="cw-cats" placeholder="e.g. Week 1, Policies, Videos" value="${esc(item?.category || "")}" autocomplete="off" />
        <datalist id="cw-cats">${cats.map((c) => `<option value="${esc(c)}"></option>`).join("")}</datalist></label>
      <label class="cw-field">Note <small class="muted">(optional)</small>
        <input type="text" name="note" placeholder="What it covers, when to use it" value="${esc(item?.note || "")}" autocomplete="off" /></label>
      <p class="sheet-status" data-status role="status"></p>
      <div class="sheet-actions"><button type="button" class="btn" data-cancel>Cancel</button><button type="submit" class="btn-primary">${editing ? "Save" : "Add"}</button></div>`, "cw-form");
    if (!x) return;
    const f = x.s.querySelector("form");
    const status = x.s.querySelector("[data-status]");
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const url = cleanUrl(f.url.value);
      if (!url) return void (status.textContent = "Enter a link that starts with http:// or https://.");
      const kind = kindOf(url);
      const typed = norm(f.title.value);
      const title = typed || (item && item.url === url && !item.auto_title ? item.title : "") || autoTitle(url, kind);
      const record = {
        ...(item || {}),
        id: item?.id || uid(),
        title,
        auto_title: !typed,
        url,
        kind,
        category: norm(f.category.value),
        note: norm(f.note.value),
        created_at: item?.created_at || new Date().toISOString(),
      };
      // A different link needs a new preview.
      if (item && item.url !== url) delete record.preview;
      x.close();
      ui.note = "";
      save(record).catch(() => (ui.note = "Couldn't save that. Try again.")).finally(() => draw());
      loadPreview(record, true);
    });
    (editing ? f.title : f.url).focus();
  }
  function confirmDelete(item) {
    const x = sheet(`<h3>Delete “${esc(item.title)}”?</h3>
      <p class="muted">Only this tile is removed. The file or page it points to isn't touched.</p>
      <div class="sheet-actions"><button type="button" class="btn" data-cancel>Cancel</button><button type="button" class="btn-danger" data-yes>Delete</button></div>`);
    if (!x) return;
    x.s.querySelector("[data-yes]").addEventListener("click", () => {
      remove(item.id).catch(() => {}).finally(() => (x.close(), draw()));
    });
    x.s.querySelector("[data-cancel]").focus();
  }
  function onClick(e) {
    const b = e.target.closest("button");
    if (!b) return;
    const ds = b.dataset;
    if ("cwAdd" in ds) return openForm(null);
    if ("cwClear" in ds) return ((ui.q = ""), (ui.cat = ""), draw());
    if ("cwCat" in ds) return ((ui.cat = ds.cwCat), draw());
    if (ds.cwMenu) {
      e.stopPropagation();
      const item = all().find((x) => x.id === ds.cwMenu);
      if (!item) return;
      const canPreview = !!driveId(item.url) && item.kind !== "folder" && !!cc()?.readDriveText;
      return openMenu(b, [
        { label: "Open", run: () => window.open(item.url, "_blank", "noopener,noreferrer") },
        { label: "Copy link", run: () => navigator.clipboard?.writeText(item.url) },
        ...(canPreview ? [{ label: "Refresh preview", run: () => loadPreview(item, true) }] : []),
        { label: "Edit", run: () => openForm(item) },
        { label: "Delete", danger: true, run: () => confirmDelete(item) },
      ]);
    }
  }

  window.TrainerCourseware = {
    render(el) {
      ui.el = el;
      el.classList.add("flush", "cw-host");
      el.addEventListener("click", onClick);
      el.addEventListener("input", (e) => {
        if (!("cwSearch" in e.target.dataset)) return;
        ui.q = e.target.value;
        // Filter the tiles without redrawing the search box, so typing is never interrupted.
        const grid = el.querySelector(".cw-body");
        const list = visible();
        if (grid) grid.innerHTML = list.length ? `<ul class="cw-grid">${list.map(tileHtml).join("")}</ul>` : `<p class="muted">Nothing matches that. <button type="button" class="linkish" data-cw-clear>Clear the search and filter</button></p>`;
        el.querySelectorAll(".cw-thumb").forEach((img) => img.addEventListener("error", () => img.remove(), { once: true }));
      });
      const redraw = () => {
        if (!ui.el || (ui.el.contains(document.activeElement) && document.activeElement.matches("input, textarea, select"))) return;
        draw();
      };
      listeners.add(redraw);
      ui.off = () => listeners.delete(redraw);
      draw();
      // Docs saved before previews existed get one the first time the lobby opens.
      dbReady.then(() => setTimeout(() => all().filter((x) => !x.preview?.at && driveId(x.url) && x.kind !== "folder").slice(0, 6).forEach((x) => loadPreview(x)), 400));
    },
    onClose() {
      ui.off?.();
      ui.el = null;
    },
    _kindOf: kindOf,
  };
})();
