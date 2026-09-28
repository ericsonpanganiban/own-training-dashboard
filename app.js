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


// ---------- Settings (persisted per browser) ----------
const DEFAULT_SETTINGS = { version: 2, theme: "system", wallpaper: "default", iconSize: 64, magnify: true, dockOrder: [], settingsPage: "appearance" };

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

// A wallpaper photo is kept apart from the settings so a large image can't stop them saving.
const PHOTO_KEY = "trainer.wallpaperPhoto";
let wallpaperPhoto = null;
try {
  wallpaperPhoto = localStorage.getItem(PHOTO_KEY);
} catch {}

function applySettings() {
  if (settings.theme === "system") delete document.body.dataset.appearance;
  else document.body.dataset.appearance = settings.theme;
  const wallpaper = settings.wallpaper === "photo" && !wallpaperPhoto ? "default" : settings.wallpaper;
  document.body.dataset.wallpaper = wallpaper;
  if (wallpaperPhoto) document.body.style.setProperty("--wallpaper-photo", `url("${wallpaperPhoto}")`);
  else document.body.style.removeProperty("--wallpaper-photo");
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
    size: { w: 780, h: 540 },
    custom: true,
    render(el) {
      el.classList.add("flush");
      el.innerHTML = `
        <div class="settings-layout">
          <nav class="settings-nav" aria-label="Settings pages">
            ${SETTINGS_PAGES.map(
              (p) => `<button type="button" data-page="${p.id}">
                <span class="nav-icon" style="background:${p.color}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p.icon}</svg></span>
                ${p.title}</button>`
            ).join("")}
          </nav>
          <div class="settings-page-slot"></div>
        </div>`;
      const slot = el.querySelector(".settings-page-slot");
      const show = (id) => {
        const page = SETTINGS_PAGES.find((p) => p.id === id) || SETTINGS_PAGES[0];
        settings.settingsPage = page.id;
        saveSettings();
        el.querySelectorAll(".settings-nav button").forEach((b) => {
          if (b.dataset.page === page.id) b.setAttribute("aria-current", "page");
          else b.removeAttribute("aria-current");
        });
        slot.replaceChildren();
        page.render(slot);
      };
      el.querySelector(".settings-nav").addEventListener("click", (e) => {
        const btn = e.target.closest("[data-page]");
        if (btn) show(btn.dataset.page);
      });
      show(settings.settingsPage);
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
    custom: true,
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
    size: { w: 920, h: 640 },
    // Cohorts, departments and team leads come from the shared roster (Settings → Roster),
    // the same records Coaching Compass uses.
    render(el) {
      const cc = window.CoachingCompass;
      if (!cc) {
        el.innerHTML = `<p class="muted">Cohorts aren't available right now.</p>`;
        return;
      }
      // Live C Side QA: pulled from the QA sheet when the window opens and on Refresh.
      const live = { status: "idle", result: null, error: null };
      const memberCrms = () => {
        const { cohorts, trainees } = cc.data();
        const ids = new Set(cohorts.flatMap((c) => c.trainee_ids || []));
        return trainees.filter((t) => ids.has(t.id)).map((t) => t.crm_name).filter(Boolean);
      };
      const pull = () => {
        if (live.status === "loading") return;
        live.status = "loading";
        draw();
        cc.liveCSideQa(memberCrms()).then(
          (result) => Object.assign(live, { status: "ok", result, error: null }),
          (e) => Object.assign(live, { status: "error", error: e?.message || "Couldn't read the QA sheet." })
        ).then(() => el.isConnected && draw());
      };

      const draw = () => {
        const { cohorts, trainees } = cc.data();
        const today = new Date().toISOString().slice(0, 10);
        const statusOf = (c) => (!c.training_start_date ? "unscheduled" : c.training_start_date > today ? "upcoming" : "active");
        const counts = { active: 0, upcoming: 0, unscheduled: 0 };
        cohorts.forEach((c) => counts[statusOf(c)]++);
        const rosterIds = new Set(trainees.map((t) => t.id));
        const assigned = new Set(cohorts.flatMap((c) => (c.trainee_ids || []).filter((id) => rosterIds.has(id))));
        const next = cohorts
          .filter((c) => statusOf(c) === "upcoming")
          .sort((a, b) => a.training_start_date.localeCompare(b.training_start_date))[0];
        const sorted = [...cohorts].sort((a, b) => (b.training_start_date || "").localeCompare(a.training_start_date || ""));
        const label = { active: "Active", upcoming: "Upcoming", unscheduled: "No start date" };

        // Nesting QA, speed and pass rate cover trainees assigned to a cohort.
        const members = trainees.filter((t) => assigned.has(t.id));
        const qa = cc.qaSummary(members.map((t) => t.crm_name).filter(Boolean));
        const sheets = cc.sheets();
        const pct = (n, d) => `${Math.round((n / d) * 100)}%`;
        const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
        const passedOf = (r) => `${Math.round(r.pass * 100) / 100} of ${r.total} audits passed`;
        // Saved weeks from Coaching Compass, shown until (or if) the live pull can't run.
        const saved = qa.total
          ? { value: pct(qa.pass, qa.total), hint: `${passedOf(qa)} · saved weeks only` }
          : { value: "—", hint: "No saved weeks yet" };
        let cQa;
        if (!members.length) cQa = { value: "—", hint: "Add trainees to a cohort" };
        else if (live.status === "ok") {
          const r = live.result;
          cQa = r.total
            ? { value: pct(r.pass, r.total), hint: `${passedOf(r)} · ${plural(r.weeks, "week")} · ${plural(r.trainees, "trainee")}${r.source === "partial" ? " · may be incomplete" : ""}` }
            : { value: "—", hint: "No audits in the QA sheet for this cohort's CRM names" };
        } else if (live.status === "loading") cQa = { value: saved.value === "—" ? "…" : saved.value, hint: "Pulling the latest from the QA sheet…" };
        else if (live.status === "error") cQa = { value: saved.value, hint: `${live.error} ${saved.value === "—" ? "" : "Showing saved weeks."}`.trim() };
        else if (!sheets.c_side?.url) cQa = { value: "—", hint: "Not set up · Settings → QA Sheets" };
        else cQa = saved;
        const updated =
          live.status === "ok"
            ? `Updated from the QA sheet at ${new Date(live.result.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
            : live.status === "loading"
              ? "Refreshing…"
              : live.status === "error"
                ? "Last refresh failed"
                : "";
        const cpQa = sheets.cp_side?.url
          ? { value: "—", hint: "No CP side audits pulled yet" }
          : { value: "—", hint: "Not set up · Settings → QA Sheets" };
        // Pass rate per side: a trainee's department decides the side (a department named "CP" is CP Side,
        // anything else C Side, same rule Coaching Compass uses for its knowledge base).
        const isCp = (t) => /\bcp\b/i.test(t.department || "");
        const passRateFor = (group, side) => {
          if (!members.length) return { value: "—", hint: "Add trainees to a cohort" };
          if (!group.length) return { value: "—", hint: `No ${side} trainees in a cohort` };
          const passed = group.filter((t) => t.nesting_status === "passed").length;
          return { value: pct(passed, group.length), hint: `${passed} of ${group.length} trainees passed nesting` };
        };
        const passC = passRateFor(members.filter((t) => !isCp(t)), "C Side");
        const passCp = passRateFor(members.filter(isCp), "CP Side");
        const metric = (label, m) =>
          `<div class="stat"><div class="value">${m.value}</div><div class="label">${label}</div><div class="hint">${escapeHtml(m.hint)}</div></div>`;
        // Average of C and CP Side; with only one side available it shows that side and says so.
        const average = (c, cp) => {
          const n = (m) => (/%$/.test(m.value) ? parseFloat(m.value) : null);
          const vals = [n(c), n(cp)];
          const have = vals.filter((v) => v !== null);
          const note = have.length === 2 ? "C + CP average" : vals[0] !== null ? "C Side only" : vals[1] !== null ? "CP Side only" : "No data yet";
          const value = have.length ? `${Math.round(have.reduce((a, b) => a + b, 0) / have.length)}%` : "—";
          return `<span class="group-avg" title="${note}"><b>${value}</b><small>${note}</small></span>`;
        };

        el.innerHTML = `
          <div class="app-head">
            <h3>Overview</h3>
            <button type="button" class="btn-primary" data-add-class>+ Add Class</button>
          </div>
          <div class="stats stats-4">
            <div class="stat"><div class="value">${cohorts.length}</div><div class="label">Cohorts</div></div>
            <div class="stat"><div class="value">${counts.active}</div><div class="label">Active</div></div>
            <div class="stat"><div class="value">${counts.upcoming}</div><div class="label">Upcoming${next ? ` · next ${escapeHtml(fmtDate(next.training_start_date))}` : ""}</div></div>
            <div class="stat"><div class="value">${assigned.size}<span class="of"> / ${trainees.length}</span></div><div class="label">Trainees in a cohort</div></div>
          </div>
          <div class="metric-groups">
            <section class="metric-group">
              <div class="group-head">
                <h4>Nesting QA</h4>
                ${average(cQa, cpQa)}
                <button type="button" class="btn btn-small" data-refresh-qa${live.status === "loading" ? " disabled" : ""}>${live.status === "loading" ? "Refreshing…" : "↻ Refresh"}</button>
              </div>
              <div class="metric-pair">
                ${metric("Nesting QA Score (C Side)", cQa)}
                ${metric("Nesting QA Score (CP Side)", cpQa)}
              </div>
              <p class="group-note" role="status">${escapeHtml(updated)}</p>
            </section>
            <section class="metric-group">
              <div class="group-head">
                <h4>Nesting Speed</h4>
                ${average({ value: "—" }, { value: "—" })}
              </div>
              <div class="metric-pair">
                ${metric("Nesting Speed (CP Side)", { value: "—", hint: "No data yet" })}
                ${metric("Nesting Speed (C Side)", { value: "—", hint: "No data yet" })}
              </div>
            </section>
            <section class="metric-group">
              <div class="group-head">
                <h4>Pass rate</h4>
                ${average(passC, passCp)}
              </div>
              <div class="metric-pair">
                ${metric("Pass rate (C Side)", passC)}
                ${metric("Pass rate (CP Side)", passCp)}
              </div>
            </section>
          </div>
          <h3>All cohorts</h3>
          ${
            sorted.length
              ? `<div class="cohort-grid">${sorted
                  .map(
                    (c) => `
                <article class="cohort-card">
                  <h4>${escapeHtml(c.name)}</h4>
                  <div class="meta">
                    ${escapeHtml(c.department || "No department")} · ${escapeHtml(c.team_lead ? `Led by ${c.team_lead}` : "No team lead")}<br>
                    ${c.training_start_date ? `Starts ${escapeHtml(fmtDate(c.training_start_date))}` : "Start date not set"} · ${(c.trainee_ids || []).length} trainee${(c.trainee_ids || []).length === 1 ? "" : "s"}
                  </div>
                  <span class="badge ${statusOf(c)}">${label[statusOf(c)]}</span>
                </article>`
                  )
                  .join("")}</div>`
              : `<p class="muted">No cohorts yet. Use Add Class to create your first one.</p>`
          }`;
        el.querySelector("[data-add-class]").addEventListener("click", () => openAddClass(el));
        el.querySelector("[data-refresh-qa]").addEventListener("click", pull);
      };
      draw();
      pull();
      APPS.cohorts.unsubscribe = cc.onChange(draw);
    },
    onClose() {
      APPS.cohorts.unsubscribe?.();
    },
  },
};

// ---------- Settings pages ----------
const SETTINGS_PAGES = [
  {
    id: "appearance",
    title: "Appearance",
    color: "#3b82f6",
    icon: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/>',
    render(slot) {
      slot.innerHTML = `
        <div class="settings-page app-body">
          <h3>Appearance</h3>
          <div class="form-row">
            <label for="set-theme">Themes</label>
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
              <option value="photo">My photo</option>
            </select>
          </div>
          <div class="form-row photo-row">
            <div>
              <span>Wallpaper photo</span>
              <p class="muted photo-note" id="photo-note"></p>
            </div>
            <div class="photo-controls">
              <span class="photo-thumb" id="photo-thumb" hidden></span>
              <label class="button-like">
                <input id="set-photo" type="file" accept="image/*" />
                <span id="photo-pick-label">Add photo</span>
              </label>
              <button type="button" class="button-like" id="photo-remove" hidden>Remove</button>
            </div>
          </div>
          <div class="form-row">
            <label for="set-size">Dock icon size</label>
            <input id="set-size" type="range" min="48" max="88" step="2" />
          </div>
          <div class="form-row">
            <label for="set-magnify">Dock magnification</label>
            <input id="set-magnify" type="checkbox" />
          </div>
        </div>`;
      const $ = (id) => slot.querySelector(id);
      const theme = $("#set-theme");
      const wallpaper = $("#set-wallpaper");
      const size = $("#set-size");
      const magnify = $("#set-magnify");
      const note = $("#photo-note");

      const syncPhoto = () => {
        wallpaper.querySelector('[value="photo"]').disabled = !wallpaperPhoto;
        wallpaper.value = settings.wallpaper === "photo" && !wallpaperPhoto ? "default" : settings.wallpaper;
        $("#photo-thumb").hidden = !wallpaperPhoto;
        $("#photo-thumb").style.backgroundImage = wallpaperPhoto ? `url("${wallpaperPhoto}")` : "";
        $("#photo-remove").hidden = !wallpaperPhoto;
        $("#photo-pick-label").textContent = wallpaperPhoto ? "Change photo" : "Add photo";
      };
      theme.value = settings.theme;
      size.value = settings.iconSize;
      magnify.checked = settings.magnify;
      note.textContent = "A JPG or PNG from your computer. It stays in this browser.";
      syncPhoto();

      const update = () => {
        settings.theme = theme.value;
        settings.wallpaper = wallpaper.value;
        settings.iconSize = Number(size.value);
        settings.magnify = magnify.checked;
        applySettings();
        saveSettings();
      };
      [theme, wallpaper, size, magnify].forEach((input) => input.addEventListener("input", update));

      $("#set-photo").addEventListener("change", async (e) => {
        const file = e.target.files[0];
        e.target.value = "";
        if (!file) return;
        note.textContent = "Loading photo…";
        try {
          wallpaperPhoto = await shrinkPhoto(file);
        } catch {
          note.textContent = "That file couldn't be opened as a photo. Try a JPG or PNG.";
          return;
        }
        try {
          localStorage.setItem(PHOTO_KEY, wallpaperPhoto);
          note.textContent = "Photo set as your wallpaper.";
        } catch {
          note.textContent = "Photo set, but this browser couldn't save it, so it will reset when you reload.";
        }
        settings.wallpaper = "photo";
        applySettings();
        saveSettings();
        syncPhoto();
      });
      $("#photo-remove").addEventListener("click", () => {
        wallpaperPhoto = null;
        try {
          localStorage.removeItem(PHOTO_KEY);
        } catch {}
        if (settings.wallpaper === "photo") settings.wallpaper = "default";
        note.textContent = "Photo removed.";
        applySettings();
        saveSettings();
        syncPhoto();
      });
    },
  },
  {
    id: "roster",
    title: "Roster",
    color: "#10b981",
    icon: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M21.5 20a6.5 6.5 0 0 0-4-6"/>',
    // The roster belongs to Coaching Compass's data; it renders its own page here.
    render(slot) {
      slot.innerHTML = `<div class="settings-page cc-ui"><div class="cc-ui-scroll"></div></div>`;
      const host = slot.querySelector(".cc-ui-scroll");
      if (window.CoachingCompass) window.CoachingCompass.mountRoster(host);
      else host.innerHTML = `<p class="muted">The roster isn't available right now.</p>`;
    },
  },
  {
    id: "qa-sheets",
    title: "QA Sheets",
    color: "#f59e0b",
    icon: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M9 9v12"/>',
    // Where QA audits are read from (C side and CP side); used by Coaching Compass and Cohorts.
    render(slot) {
      slot.innerHTML = `<div class="settings-page cc-ui"><div class="cc-ui-scroll"></div></div>`;
      const host = slot.querySelector(".cc-ui-scroll");
      if (window.CoachingCompass) window.CoachingCompass.mountQaSheets(host);
      else host.innerHTML = `<p class="muted">QA sheet settings aren't available right now.</p>`;
    },
  },
];

// Scale a photo down to screen size so it fits in browser storage.
async function shrinkPhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 2560 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const fmtDate = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

// "Add Class" sheet for the Cohorts app. Department and Team Lead lists come from Settings → Roster.
function openAddClass(content) {
  const win = content.closest(".window");
  if (win.querySelector(".sheet")) return;
  const { departments, teamLeads } = window.CoachingCompass.data();
  const options = (items, emptyText) =>
    items.length
      ? `<option value="">— Select —</option>` + items.map((i) => `<option value="${escapeHtml(i.name)}">${escapeHtml(i.name)}</option>`).join("")
      : `<option value="">${emptyText}</option>`;
  const sheet = document.createElement("div");
  sheet.className = "sheet";
  sheet.innerHTML = `
    <form class="sheet-card" novalidate>
      <h3>Add Class</h3>
      <label class="field"><span>Cohort name</span><input id="ac-name" type="text" placeholder="e.g. October Cohort A" required /></label>
      <label class="field"><span>Department</span><select id="ac-dept"${departments.length ? "" : " disabled"}>${options(departments, "Add a department in Settings → Roster first")}</select></label>
      <label class="field"><span>Team Lead</span><select id="ac-lead"${teamLeads.length ? "" : " disabled"}>${options(teamLeads, "Add a team lead in Settings → Roster first")}</select></label>
      <label class="field"><span>Start Date</span><input id="ac-date" type="date" /></label>
      <p class="sheet-status" id="ac-status" role="status"></p>
      <div class="sheet-actions">
        <button type="button" class="btn" data-cancel>Cancel</button>
        <button type="submit" class="btn-primary">Add Class</button>
      </div>
    </form>`;
  win.appendChild(sheet);
  const close = () => sheet.remove();
  const status = sheet.querySelector("#ac-status");
  sheet.querySelector("[data-cancel]").addEventListener("click", close);
  sheet.addEventListener("keydown", (e) => e.key === "Escape" && close());
  sheet.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = sheet.querySelector("#ac-name").value.trim();
    if (!name) {
      status.textContent = "Give the cohort a name.";
      sheet.querySelector("#ac-name").focus();
      return;
    }
    status.textContent = "Saving…";
    window.CoachingCompass.addCohort({
      name,
      department: sheet.querySelector("#ac-dept").value,
      team_lead: sheet.querySelector("#ac-lead").value,
      training_start_date: sheet.querySelector("#ac-date").value,
    })
      .then(close)
      .catch(() => (status.textContent = "Couldn't save the class. Try again."));
  });
  sheet.querySelector("#ac-name").focus();
}

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

  const content = win.querySelector(".content");
  if (!app.custom) content.classList.add("app-body");
  app.render(content);
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

let dockMagnify = { reset() {} };

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
      <span class="dock-face">
        <span class="dock-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${app.icon}</svg>
        </span>
        <span class="dock-label">${escapeHtml(app.title)}</span>
      </span>`;
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

  // macOS-style magnification: icons grow toward the cursor. Targets update on
  // mousemove; a requestAnimationFrame loop eases each icon toward its target so
  // the motion renders every frame (60fps) instead of stepping with mouse events.
  let pointerX = null;
  let frame = null;
  const current = new Map();

  const tick = () => {
    frame = null;
    let moving = false;
    dock.querySelectorAll(".dock-item").forEach((item) => {
      let target = 1;
      if (pointerX !== null && settings.magnify && !dock.classList.contains("reordering")) {
        const rect = item.getBoundingClientRect();
        const dist = Math.abs(pointerX - (rect.left + rect.width / 2));
        target = 1 + Math.max(0, 1 - dist / 140) * 0.45;
      }
      const from = current.get(item) ?? 1;
      const next = Math.abs(target - from) < 0.002 ? target : from + (target - from) * 0.3;
      if (next !== target) moving = true;
      current.set(item, next);
    });
    // Neighbours slide apart by the extra width each enlarged icon takes, like the macOS dock.
    const items = [...dock.querySelectorAll(".dock-item")];
    const extra = items.map((item) => item.offsetWidth * ((current.get(item) ?? 1) - 1));
    const total = extra.reduce((a, b) => a + b, 0);
    let before = 0;
    items.forEach((item, i) => {
      const shift = before + extra[i] / 2 - total / 2;
      before += extra[i];
      const face = item.querySelector(".dock-face");
      face.style.setProperty("--mag", (current.get(item) ?? 1).toFixed(4));
      face.style.setProperty("--shift", `${shift.toFixed(2)}px`);
    });
    if (moving) frame = requestAnimationFrame(tick);
  };
  const schedule = () => {
    if (frame === null) frame = requestAnimationFrame(tick);
  };

  dock.addEventListener("mousemove", (e) => {
    pointerX = e.clientX;
    schedule();
  });
  dock.addEventListener("mouseleave", () => {
    pointerX = null;
    schedule();
  });
  dockMagnify = { reset: () => { pointerX = null; schedule(); } };
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
        dockMagnify.reset();
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
