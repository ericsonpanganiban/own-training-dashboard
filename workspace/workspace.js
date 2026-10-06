// ---------- Workspaces: one Trainer, one workspace; a Training Manager reads them all ----------
// Loaded before every other script. Everything the apps save goes into the viewer's own workspace:
//   the artifact owner's workspace is the database root (where all existing data already lives);
//   anyone else's is workspaces/<their id>/…
// Shared across everyone (never prefixed): courseware, config/ (the managers list), trainers/ (each
// Trainer's directory entry and summary), the owner's default look, and each viewer's private data/users/.
// The apps get their database through TrainerUse("db"), which hands back a database already pointed at the
// workspace being shown. Viewing another Trainer's workspace is read-only: writes are refused here, and the
// database rules refuse them as well.
//   trainers/<id>   { id, base: "root" | "own", summary, summary_at, updated_at }   written by that Trainer
//   config/managers { ids: [...] }                                                 written by the owner
(function () {
  const rawUse = (name) => Promise.resolve().then(() => (window.claude ? window.claude.use(name) : null)).catch(() => null);
  const SHARED = [/^assignments(\/|$)/, /^added(\/|$)/, /^courseware(\/|$)/, /^config(\/|$)/, /^trainers(\/|$)/, /^workspaces(\/|$)/, /^data\/users(\/|$)/, /^settings\/dashboard_(defaults|wallpaper)$/];
  const isShared = (p) => SHARED.some((r) => r.test(p));
  const VIEW_KEY = "trainer.viewAs";
  const PREVIEW_KEY = "trainer.previewManager";
  const store = {
    get(k) {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    set(k, v) {
      try {
        if (v == null) localStorage.removeItem(k);
        else localStorage.setItem(k, v);
      } catch {}
    },
  };

  // Ten animal avatars to pick from (shown instead of the profile photo when chosen).
  const ANIMALS = [
    { key: "dog", emoji: "🐶", label: "Dog", bg: "#ffe3b3" },
    { key: "cat", emoji: "🐱", label: "Cat", bg: "#ffd6e0" },
    { key: "fox", emoji: "🦊", label: "Fox", bg: "#ffd0a8" },
    { key: "panda", emoji: "🐼", label: "Panda", bg: "#e4e4ea" },
    { key: "koala", emoji: "🐨", label: "Koala", bg: "#d6dcf0" },
    { key: "lion", emoji: "🦁", label: "Lion", bg: "#ffe9a8" },
    { key: "tiger", emoji: "🐯", label: "Tiger", bg: "#ffd9a0" },
    { key: "frog", emoji: "🐸", label: "Frog", bg: "#c9efc4" },
    { key: "monkey", emoji: "🐵", label: "Monkey", bg: "#e8d3bd" },
    { key: "penguin", emoji: "🐧", label: "Penguin", bg: "#cfe4f7" },
  ];
  const animalOf = (key) => ANIMALS.find((a) => a.key === key) || null;
  const ws = {
    animal: "", // this viewer's chosen animal avatar ("" = their profile photo)
    ready: null,
    id: "", // this viewer's id, "" when the platform gives none
    name: "",
    email: "", // this viewer's email when the platform shares it
    avatar: "",
    color: "",
    isOwner: false,
    canEdit: false,
    base: "", // path prefix of this viewer's own workspace
    viewing: null, // { id, base } while looking at someone else's workspace (read-only)
    readOnly: false,
    managerIds: [],
    isManagerId: false,
    isViewer: false, // someone the owner added in Settings → Viewers: the owner's dashboard, read-only
    previewing: false, // the owner looking at the Training Manager
    role: "trainer", // "trainer" | "manager": what shell to show
    db: null, // the real database
  };
  const listeners = new Set();
  const changed = () => listeners.forEach((f) => { try { f(); } catch {} });

  const baseFor = (id, kind) => (kind === "root" ? "" : `workspaces/${id}/`);
  const activeBase = () => (ws.viewing ? ws.viewing.base : ws.base);

  // ---- The scoped database ----
  let lastNotice = 0;
  const refused = () => {
    if (Date.now() - lastNotice > 4000) {
      lastNotice = Date.now();
      toast("You're viewing another Trainer's dashboard, which is read-only.");
    }
    return Promise.reject({ code: "read_only", message: "Read-only: you're viewing another Trainer's dashboard." });
  };
  const guard = (fn) => (...a) => (ws.readOnly ? refused() : fn(...a));
  function wrapDoc(r) {
    return {
      id: r.id,
      path: r.path,
      get: () => r.get(),
      set: guard((d) => r.set(d)),
      update: guard((d) => r.update(d)),
      delete: guard(() => r.delete()),
      acquire: guard((o) => r.acquire(o)),
      onSnapshot: (...a) => r.onSnapshot(...a),
      collection: (p) => wrapColl(r.collection(p)),
    };
  }
  function wrapQuery(q) {
    return {
      where: (...a) => wrapQuery(q.where(...a)),
      orderBy: (...a) => wrapQuery(q.orderBy(...a)),
      limit: (n) => wrapQuery(q.limit(n)),
      get: () => q.get(),
      onSnapshot: (...a) => q.onSnapshot(...a),
    };
  }
  function wrapColl(c) {
    return { ...wrapQuery(c), doc: (id) => wrapDoc(c.doc(id)), add: guard((d) => c.add(d)) };
  }
  const scoped = (db) => ({
    doc: (p) => wrapDoc(db.doc(isShared(p) ? p : activeBase() + p)),
    collection: (p) => wrapColl(db.collection(isShared(p) ? p : activeBase() + p)),
  });

  // ---- Small on-screen notices ----
  function toast(text) {
    const t = document.createElement("div");
    t.className = "ws-toast";
    t.setAttribute("role", "status");
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4500);
  }

  function setRole() {
    ws.role = !ws.viewing && (ws.isManagerId || ws.previewing) ? "manager" : "trainer";
  }

  // ---- Starting up: who is this, which workspace, and are they a manager ----
  ws.ready = (async () => {
    const user = await rawUse("user");
    let me = null;
    try {
      me = user ? await user.me() : null;
    } catch {}
    ws.id = me?.id || "";
    ws.name = me?.name || "";
    ws.email = (me?.email || "").trim().toLowerCase();
    ws.avatar = me?.avatarUrl || "";
    ws.color = me?.color || "";
    ws.isOwner = !!me?.isOwner;
    ws.canEdit = !!me?.canEdit;
    ws.base = ws.isOwner || !ws.id ? "" : baseFor(ws.id, "own");
    const saved = (() => {
      try {
        return JSON.parse(store.get(VIEW_KEY) || "null");
      } catch {
        return null;
      }
    })();
    store.set(VIEW_KEY, null); // switching to another Trainer's dashboard is gone: Trainers open as windows now
    if (false && saved?.id && saved.id !== ws.id) {
      ws.viewing = { id: String(saved.id), base: saved.kind === "root" ? "" : baseFor(saved.id, "own"), kind: saved.kind === "root" ? "root" : "own" };
      ws.readOnly = true;
    }
    ws.previewing = ws.isOwner && store.get(PREVIEW_KEY) === "1";
    const db = await rawUse("db");
    ws.db = db;
    if (db && ws.id) {
      try {
        const snap = await db.doc(`trainers/${ws.id}`).get();
        ws.animal = (snap.exists && animalOf(snap.data()?.animal) && snap.data().animal) || "";
      } catch {}
    }
    if (db) {
      // The managers list decides the shell, so wait for its first answer (but never long).
      await new Promise((resolve) => {
        let done = false;
        const fin = () => !done && ((done = true), resolve());
        setTimeout(fin, 2500);
        try {
          db.doc("config/managers").onSnapshot(
            (snap) => {
              const d = (snap.exists && snap.data()) || {};
              ws.managerIds = Array.isArray(d.ids) ? d.ids.map(String) : [];
              ws.isManagerId = !!ws.id && ws.managerIds.includes(ws.id);
              setRole();
              fin();
              changed();
            },
            () => fin()
          );
        } catch {
          fin();
        }
      });
    }
    // A Viewer sees the owner's dashboard (the database root) and can't change anything.
    if (db && ws.id && !ws.isOwner && !ws.isManagerId) {
      try {
        const snap = await db.doc("config/viewers").get();
        const d = (snap.exists && snap.data()) || {};
        const ids = Array.isArray(d.ids) ? d.ids.map(String) : [];
        const emails = Array.isArray(d.emails) ? d.emails.map((e) => String(e).trim().toLowerCase()) : [];
        // Added by name (their id) or by work email, for people the name search can't offer.
        if (ids.includes(ws.id) || (ws.email && emails.includes(ws.email))) {
          ws.isViewer = true;
          ws.viewing = { id: "", base: "", kind: "root", viewer: true };
          ws.readOnly = true;
        }
      } catch {}
    }
    setRole();
    // A Trainer's own entry in the directory (the Training Manager lists Trainers from these).
    if (db && ws.id && !ws.viewing) {
      db.doc(`trainers/${ws.id}`).update({ id: ws.id, base: ws.isOwner ? "root" : "own", updated_at: new Date().toISOString() }).catch(() =>
        db.doc(`trainers/${ws.id}`).set({ id: ws.id, base: ws.isOwner ? "root" : "own", updated_at: new Date().toISOString() }).catch(() => {})
      );
    }
    drawBanner();
    return ws;
  })();

  // ---- Banner: viewing someone else's dashboard, or previewing the Training Manager ----
  function drawBanner() {
    document.getElementById("ws-banner")?.remove();
    document.body.classList.toggle("ws-readonly", ws.readOnly);
    if (ws.readOnly) installViewGuard();
    if (!ws.viewing) return;
    const bar = document.createElement("div");
    bar.id = "ws-banner";
    bar.setAttribute("role", "status");
    bar.innerHTML = ws.isViewer
      ? `<span class="wb-text">View only · you can look at the classes, trainees and results, but can't make changes</span>`
      : ws.viewing
      ? `<span class="wb-text" data-ws-who>Viewing a Trainer's dashboard · read-only</span><button type="button" data-ws-back>${ws.isManagerId || ws.previewing ? "Back to Training Manager" : "Back to my dashboard"}</button>`
      : `<span class="wb-text">Previewing the Training Manager</span><button type="button" data-ws-exit-preview>Exit preview</button>`;
    document.body.appendChild(bar);
    bar.addEventListener("click", (e) => {
      if (e.target.closest("[data-ws-back]")) api.stopViewing();
      if (e.target.closest("[data-ws-exit-preview]")) api.setPreview(false);
    });
    // The name of whoever is being viewed.
    if (ws.viewing && !ws.isViewer) {
      rawUse("user")
        .then((u) => u?.profiles([ws.viewing.id]))
        .then((ps) => {
          const n = ps?.[ws.viewing.id]?.name;
          const el = bar.querySelector("[data-ws-who]");
          if (el) el.textContent = `Viewing ${n || "a Trainer"}'s dashboard · read-only`;
        })
        .catch(() => {});
    }
  }

  // While read-only, buttons that would change something say so instead of opening a form that can't be saved
  // (the database refuses the writes anyway). Anything for looking (opening rows, Performance, Copy, tabs) works.
  const WRITE_TEXT = /^(\+|add\b|edit\b|delete\b|remove\b|save\b|send\b|mark\b|reopen\b|set\b|create\b|import\b|pull\b|check\b|re-check\b|ping\b|analy[sz]e\b|generate\b|export\b|invite\b|new\b|resend\b|post\b|submit\b|rename\b|move\b|clear\b|reset\b|apply\b|assign\b|archive\b|restore\b|update\b|confirm\b|override\b|publish\b|⋮|×)/i;
  const WRITE_SEL = "[data-trainee-menu], [data-cohort-menu], .kebab, .kebab-btn, [data-toggle-active], [data-complete-cohort], [data-att-send], [data-att-check], [data-att-ping], .att-export, [data-add-trainee], .square-btn.kebab";
  let guardInstalled = false;
  function installViewGuard() {
    if (guardInstalled) return;
    guardInstalled = true;
    document.addEventListener(
      "click",
      (e) => {
        if (!ws.readOnly) return;
        const b = e.target.closest && e.target.closest("button, [role=menuitem]");
        if (!b || b.closest("#ws-banner, .dock, [data-copy-view]")) return;
        const text = (b.innerText || b.getAttribute("aria-label") || "").trim();
        if (b.matches(WRITE_SEL) || WRITE_TEXT.test(text)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          toast(ws.isViewer ? "View only: you can't make changes." : "You're viewing another Trainer's dashboard, which is read-only.");
        }
      },
      true
    );
  }

  const reload = () => {
    try {
      location.reload();
    } catch {
      toast("Reload the page to switch.");
    }
  };

  const api = {
    ws,
    ready: ws.ready,
    get role() {
      return ws.role;
    },
    get readOnly() {
      return ws.readOnly;
    },
    get viewing() {
      return ws.viewing;
    },
    get isOwner() {
      return ws.isOwner;
    },
    get isViewer() {
      return ws.isViewer;
    },
    get id() {
      return ws.id;
    },
    get managerIds() {
      return ws.managerIds.slice();
    },
    onChange: (f) => (listeners.add(f), () => listeners.delete(f)),
    // Open another Trainer's dashboard, read-only. `entry` is a directory record ({ id, base }).
    viewAs(entry) {
      if (!entry?.id || entry.id === ws.id) return api.stopViewing();
      store.set(VIEW_KEY, JSON.stringify({ id: entry.id, kind: entry.base === "root" ? "root" : "own" }));
      reload();
    },
    stopViewing() {
      store.set(VIEW_KEY, null);
      reload();
    },
    // The owner switching between their Trainer dashboard and the Training Manager: no reload, the shell swaps.
    setPreview(on) {
      if (!ws.isOwner) return;
      ws.previewing = !!on;
      store.set(PREVIEW_KEY, on ? "1" : null);
      setRole();
      changed();
    },
    toast,
    animals: ANIMALS,
    animalOf,
    get animal() {
      return ws.animal;
    },
    // The avatar as HTML: the chosen animal, else the photo, else the initial. `cls` is the circle's class.
    avatarHtml({ animal, photo, color, name }, cls) {
      const a = animalOf(animal);
      const e = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
      if (a) return `<span class="${cls}" style="background:${a.bg}" title="${e(a.label)}">${a.emoji}</span>`;
      if (photo) return `<img class="${cls}" src="${e(photo)}" alt="" />`;
      return `<span class="${cls}" style="background:${e(color || "#c7d7ff")}">${e(((name || "T").trim()[0] || "T").toUpperCase())}</span>`;
    },
    setAnimal(key) {
      if (!ws.id || ws.readOnly) return Promise.resolve();
      ws.animal = animalOf(key) ? key : "";
      changed();
      const doc = ws.db?.doc(`trainers/${ws.id}`);
      if (!doc) return Promise.resolve();
      const fields = { id: ws.id, base: ws.isOwner ? "root" : "own", animal: ws.animal, updated_at: new Date().toISOString() };
      return doc.update(fields).catch(() => doc.set(fields)).catch(() => {});
    },
  };
  window.TrainerWS = api;
  // What the apps call for a capability; the database comes back pointed at the workspace being shown.
  // While viewing someone else's dashboard nothing goes out to Slack and nothing is trashed in Drive.
  const OUTWARD = /send|schedule|reaction|create_|update_|add_|delete|trash|share/i;
  const guardedMcp = (mcp) => {
    if (!mcp) return mcp;
    const wrapped = Object.assign({}, mcp);
    if (typeof mcp.callTool === "function")
      wrapped.callTool = (server, tool, ...rest) => {
        const isDriveExport = /drive/i.test(server) && /^create_file$/.test(tool);
        if (ws.readOnly && !isDriveExport && OUTWARD.test(tool)) {
          toast("You're viewing another Trainer's dashboard, which is read-only.");
          return Promise.reject({ code: "read_only", message: "Read-only: you're viewing another Trainer's dashboard." });
        }
        return mcp.callTool(server, tool, ...rest);
      };
    return wrapped;
  };
  window.TrainerUse = (name) =>
    name === "db" ? ws.ready.then(() => (ws.db ? scoped(ws.db) : null)) : name === "mcp" ? ws.ready.then(() => rawUse("mcp")).then(guardedMcp) : rawUse(name);
})();
