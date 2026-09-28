// ---------- Sample data (replace with real data source later) ----------
const MY_CLASS = {
  name: "Customer Care Onboarding — Batch 12",
  trainees: [
    { name: "Alex Rivera", progress: 82, status: "On track" },
    { name: "Jamie Cruz", progress: 64, status: "On track" },
    { name: "Sam Lee", progress: 41, status: "Needs support" },
    { name: "Taylor Santos", progress: 95, status: "Ahead" },
    { name: "Jordan Reyes", progress: 58, status: "On track" },
  ],
};

const COHORTS = [
  { name: "Batch 12", program: "Customer Care Onboarding", start: "2026-09-07", size: 5, status: "active" },
  { name: "Batch 13", program: "Customer Care Onboarding", start: "2026-10-12", size: 8, status: "upcoming" },
  { name: "Batch 11", program: "Customer Care Onboarding", start: "2026-08-03", size: 7, status: "completed" },
  { name: "Upskill A", program: "Escalations Handling", start: "2026-09-21", size: 4, status: "active" },
];

// ---------- Settings (persisted per browser) ----------
const DEFAULT_SETTINGS = { version: 2, theme: "system", wallpaper: "default", iconSize: 64, magnify: true, dockOrder: [] };

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("trainer.settings") || "{}");
    // Version 2 made dock icons 8px bigger; carry a saved size over.
    if (saved.iconSize && !saved.version) saved.iconSize += 8;
    return { ...DEFAULT_SETTINGS, ...saved, version: DEFAULT_SETTINGS.version };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  try {
    localStorage.setItem("trainer.settings", JSON.stringify(settings));
  } catch {}
}

function applySettings() {
  if (settings.theme === "system") delete document.body.dataset.appearance;
  else document.body.dataset.appearance = settings.theme;
  document.body.dataset.wallpaper = settings.wallpaper;
  document.documentElement.style.setProperty("--icon-size", `${settings.iconSize}px`);
}

const settings = loadSettings();

// ---------- Apps ----------
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const APPS = {
  settings: {
    title: "Settings",
    icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    color: "#64748b",
    size: { w: 440, h: 340 },
    render(el) {
      el.innerHTML = `
        <div class="form-row">
          <label for="set-theme">Appearance</label>
          <select id="set-theme">
            <option value="system">Match system</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div class="form-row">
          <label for="set-wallpaper">Wallpaper</label>
          <select id="set-wallpaper">
            <option value="default">Dusk</option>
            <option value="ocean">Ocean</option>
            <option value="sunset">Sunset</option>
            <option value="forest">Forest</option>
          </select>
        </div>
        <div class="form-row">
          <label for="set-size">Dock icon size</label>
          <input id="set-size" type="range" min="48" max="88" step="2" />
        </div>
        <div class="form-row">
          <label for="set-magnify">Dock magnification</label>
          <input id="set-magnify" type="checkbox" />
        </div>`;
      const theme = el.querySelector("#set-theme");
      const wallpaper = el.querySelector("#set-wallpaper");
      const size = el.querySelector("#set-size");
      const magnify = el.querySelector("#set-magnify");
      theme.value = settings.theme;
      wallpaper.value = settings.wallpaper;
      size.value = settings.iconSize;
      magnify.checked = settings.magnify;

      const update = () => {
        settings.theme = theme.value;
        settings.wallpaper = wallpaper.value;
        settings.iconSize = Number(size.value);
        settings.magnify = magnify.checked;
        applySettings();
        saveSettings();
      };
      [theme, wallpaper, size, magnify].forEach((input) => input.addEventListener("input", update));
    },
  },

  myClass: {
    title: "My Class",
    icon: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12.5V17c3.3 2.3 8.7 2.3 12 0v-4.5"/><path d="M22 10v5"/>',
    color: "#3b82f6",
    size: { w: 560, h: 440 },
    render(el) {
      const { trainees } = MY_CLASS;
      const avg = Math.round(trainees.reduce((sum, t) => sum + t.progress, 0) / trainees.length);
      const atRisk = trainees.filter((t) => t.status === "Needs support").length;
      el.innerHTML = `
        <h3>${escapeHtml(MY_CLASS.name)}</h3>
        <div class="stats">
          <div class="stat"><div class="value">${trainees.length}</div><div class="label">Trainees</div></div>
          <div class="stat"><div class="value">${avg}%</div><div class="label">Avg. progress</div></div>
          <div class="stat"><div class="value">${atRisk}</div><div class="label">Need support</div></div>
        </div>
        <table>
          <thead><tr><th>Trainee</th><th style="width:40%">Progress</th><th>Status</th></tr></thead>
          <tbody>
            ${trainees
              .map(
                (t) => `
              <tr>
                <td>${escapeHtml(t.name)}</td>
                <td><div class="progress"><span style="width:${t.progress}%"></span></div>
                    <span class="muted" style="font-size:12px">${t.progress}%</span></td>
                <td>${escapeHtml(t.status)}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>`;
    },
  },

  coaching: {
    title: "Coaching Compass",
    icon: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    color: "#10b981",
    size: { w: 1040, h: 680 },
    // Coaching Compass boots once with the page (coaching-compass/), so its state
    // survives closing the window; the window only borrows its root element.
    render(el) {
      el.classList.add("embed");
      el.appendChild(document.getElementById("ccRoot"));
    },
    onClose() {
      document.getElementById("ccHolder").appendChild(document.getElementById("ccRoot"));
    },
  },

  cohorts: {
    title: "Cohorts",
    icon: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M21.5 20a6.5 6.5 0 0 0-4-6"/>',
    color: "#f59e0b",
    size: { w: 560, h: 400 },
    render(el) {
      const fmt = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      el.innerHTML = `
        <div class="cohort-grid">
          ${COHORTS.map(
            (c) => `
            <article class="cohort-card">
              <h4>${escapeHtml(c.name)}</h4>
              <div class="meta">${escapeHtml(c.program)}<br>Starts ${fmt(c.start)} · ${c.size} trainees</div>
              <span class="badge ${c.status}">${c.status}</span>
            </article>`
          ).join("")}
        </div>`;
    },
  },
};

// ---------- Window manager ----------
const desktop = document.getElementById("desktop");
const dock = document.getElementById("dock");
const template = document.getElementById("windowTemplate");
const activeAppLabel = document.getElementById("activeApp");
const openWindows = new Map(); // appId -> window element
let zCounter = 10;
let cascade = 0;

function focusWindow(win) {
  win.style.zIndex = ++zCounter;
  openWindows.forEach((w) => w.classList.toggle("inactive", w !== win));
  activeAppLabel.textContent = APPS[win.dataset.app].title;
}

function refreshActiveLabel() {
  const visible = [...openWindows.values()].filter((w) => !w.classList.contains("minimized"));
  if (!visible.length) {
    activeAppLabel.textContent = "Dashboard";
    return;
  }
  focusWindow(visible.reduce((top, w) => (Number(w.style.zIndex) > Number(top.style.zIndex) ? w : top)));
}

function openApp(appId) {
  const existing = openWindows.get(appId);
  if (existing) {
    existing.classList.remove("minimized");
    focusWindow(existing);
    return;
  }

  const app = APPS[appId];
  const win = template.content.firstElementChild.cloneNode(true);
  win.dataset.app = appId;
  win.setAttribute("aria-label", app.title);
  win.querySelector(".title").textContent = app.title;

  const bounds = desktop.getBoundingClientRect();
  const w = Math.min(app.size.w, bounds.width - 16);
  const h = Math.min(app.size.h, bounds.height - settings.iconSize - 70);
  const offset = (cascade++ % 6) * 28;
  win.style.width = `${w}px`;
  win.style.height = `${h}px`;
  win.style.left = `${Math.max(8, (bounds.width - w) / 2 - 80 + offset)}px`;
  win.style.top = `${Math.max(8, 40 + offset)}px`;

  app.render(win.querySelector(".content"));
  wireWindow(win, appId);
  desktop.appendChild(win);
  openWindows.set(appId, win);
  focusWindow(win);
  setRunning(appId, true);
}

function closeApp(appId) {
  const win = openWindows.get(appId);
  if (!win) return;
  openWindows.delete(appId);
  setRunning(appId, false);
  APPS[appId].onClose?.();
  win.classList.add("closing");
  win.addEventListener("animationend", () => win.remove(), { once: true });
  refreshActiveLabel();
}

function wireWindow(win, appId) {
  win.addEventListener("pointerdown", () => focusWindow(win));

  win.querySelector(".traffic").addEventListener("click", (e) => {
    const action = e.target.dataset.action;
    if (action === "close") closeApp(appId);
    if (action === "minimize") {
      win.classList.add("minimized");
      refreshActiveLabel();
    }
    if (action === "maximize") win.classList.toggle("maximized");
  });

  const titlebar = win.querySelector(".titlebar");
  titlebar.addEventListener("dblclick", (e) => {
    if (!e.target.closest(".traffic")) win.classList.toggle("maximized");
  });
  makeDraggable(titlebar, (dx, dy, start) => {
    if (win.classList.contains("maximized")) return;
    const bounds = desktop.getBoundingClientRect();
    const left = Math.min(Math.max(start.left + dx, -win.offsetWidth + 80), bounds.width - 80);
    const top = Math.min(Math.max(start.top + dy, 0), bounds.height - 40);
    win.style.left = `${left}px`;
    win.style.top = `${top}px`;
  }, () => ({ left: win.offsetLeft, top: win.offsetTop }), ".traffic");

  makeDraggable(win.querySelector(".resize-handle"), (dx, dy, start) => {
    if (win.classList.contains("maximized")) return;
    win.style.width = `${Math.max(320, start.w + dx)}px`;
    win.style.height = `${Math.max(220, start.h + dy)}px`;
  }, () => ({ w: win.offsetWidth, h: win.offsetHeight }));
}

function makeDraggable(handle, onMove, getStart, ignoreSelector) {
  handle.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || (ignoreSelector && e.target.closest(ignoreSelector))) return;
    e.preventDefault();
    const origin = { x: e.clientX, y: e.clientY };
    const start = getStart();
    handle.setPointerCapture(e.pointerId);
    const move = (ev) => onMove(ev.clientX - origin.x, ev.clientY - origin.y, start);
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  });
}

// ---------- Dock ----------
function setRunning(appId, running) {
  dock.querySelector(`[data-app="${appId}"]`)?.classList.toggle("running", running);
}

function dockOrder() {
  const ids = Object.keys(APPS);
  const saved = settings.dockOrder.filter((id) => ids.includes(id));
  return [...saved, ...ids.filter((id) => !saved.includes(id))];
}

function buildDock() {
  dockOrder().forEach((id) => {
    const app = APPS[id];
    const btn = document.createElement("button");
    btn.className = "dock-item";
    btn.dataset.app = id;
    btn.setAttribute("aria-label", app.title);
    btn.innerHTML = `
      <span class="dock-icon" style="background:${app.color}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${app.icon}</svg>
      </span>
      <span class="dock-label">${escapeHtml(app.title)}</span>`;
    btn.addEventListener("click", () => {
      if (!openWindows.has(id)) {
        btn.classList.remove("bounce");
        void btn.offsetWidth;
        btn.classList.add("bounce");
      }
      openApp(id);
    });
    enableDockDrag(btn);
    dock.appendChild(btn);
  });

  // macOS-style magnification: icons grow based on cursor distance.
  const items = () => [...dock.querySelectorAll(".dock-item")];
  dock.addEventListener("mousemove", (e) => {
    if (!settings.magnify || dock.classList.contains("reordering")) return;
    items().forEach((item) => {
      const rect = item.getBoundingClientRect();
      const dist = Math.abs(e.clientX - (rect.left + rect.width / 2));
      const scale = 1 + Math.max(0, 1 - dist / 140) * 0.5;
      item.style.setProperty("--size", `${settings.iconSize * scale}px`);
    });
  });
  dock.addEventListener("mouseleave", () => {
    items().forEach((item) => item.style.removeProperty("--size"));
  });
}

// Grab an icon and drag it sideways to move it; a short press still opens the app.
function enableDockDrag(item) {
  item.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const startX = e.clientX;
    let dragging = false;

    const move = (ev) => {
      if (!dragging) {
        if (Math.abs(ev.clientX - startX) < 6) return;
        dragging = true;
        item.setPointerCapture(ev.pointerId);
        dock.classList.add("reordering");
        item.classList.add("dragging");
        dock.querySelectorAll(".dock-item").forEach((i) => i.style.removeProperty("--size"));
      }
      // Swap with a neighbour once the pointer passes its middle.
      const siblings = [...dock.querySelectorAll(".dock-item:not(.dragging)")];
      const before = siblings.find((s) => {
        const r = s.getBoundingClientRect();
        return ev.clientX < r.left + r.width / 2;
      });
      if ((before || null) !== item.nextElementSibling) dock.insertBefore(item, before || null);
      item.style.transform = "";
      const home = item.getBoundingClientRect();
      item.style.transform = `translateX(${ev.clientX - (home.left + home.width / 2)}px)`;
    };

    const up = () => {
      item.removeEventListener("pointermove", move);
      item.removeEventListener("pointerup", up);
      item.removeEventListener("pointercancel", up);
      if (!dragging) return;
      item.style.transform = "";
      item.classList.remove("dragging");
      dock.classList.remove("reordering");
      settings.dockOrder = [...dock.querySelectorAll(".dock-item")].map((i) => i.dataset.app);
      saveSettings();
      // The click that follows a drag shouldn't open the app.
      item.addEventListener("click", (ce) => ce.stopImmediatePropagation(), { capture: true, once: true });
    };

    item.addEventListener("pointermove", move);
    item.addEventListener("pointerup", up);
    item.addEventListener("pointercancel", up);
  });
}

// ---------- Clock ----------
function tick() {
  document.getElementById("clock").textContent = new Date().toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

applySettings();
buildDock();
tick();
setInterval(tick, 15000);
