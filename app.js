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
// It is stored at full quality in IndexedDB (no 5 MB limit); an older photo saved in localStorage is moved over.
const PHOTO_KEY = "trainer.wallpaperPhoto";
let wallpaperPhoto = null; // a URL the page can show: a blob: URL, or an old data: URL until it is moved
let wallpaperBlob = null; // the same photo as a file, for sharing it as the default
try {
  wallpaperPhoto = localStorage.getItem(PHOTO_KEY);
} catch {}
const photoDb = {
  open() {
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open("trainer-desk", 1);
        req.onupgradeneeded = () => req.result.createObjectStore("photos");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  },
  async run(mode, fn) {
    const db = await this.open();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction("photos", mode);
        const req = fn(tx.objectStore("photos"));
        tx.oncomplete = () => resolve(req && "result" in req ? req.result : true);
        tx.onerror = tx.onabort = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  },
  get: (key) => photoDb.run("readonly", (st) => st.get(key)),
  set: (key, blob) => photoDb.run("readwrite", (st) => st.put(blob, key)),
  del: (key) => photoDb.run("readwrite", (st) => st.delete(key)),
};
// On load: the stored full-quality photo replaces any old localStorage copy; an old copy is moved over.
(async function restorePersonalPhoto() {
  const stored = await photoDb.get("wallpaper");
  if (stored instanceof Blob) {
    wallpaperBlob = stored;
    wallpaperPhoto = URL.createObjectURL(stored);
    applySettings();
    defaultsHooks.sync();
  } else if (wallpaperPhoto?.startsWith("data:")) {
    try {
      const blob = await (await fetch(wallpaperPhoto)).blob();
      wallpaperBlob = blob;
      if (await photoDb.set("wallpaper", blob)) localStorage.removeItem(PHOTO_KEY);
    } catch {}
  }
})();

// The owner's dock order and wallpaper are the default everyone starts from (settings/dashboard_defaults and
// settings/dashboard_wallpaper). A viewer who reorders the dock or changes the wallpaper keeps their own choice.
const sharedDefaults = { loaded: false, dockOrder: null, wallpaper: null, photo: null, assetId: "", theme: null, raw: {} };
const themeIsCustom = () => settings.themeCustom ?? settings.theme !== "system";
// The colorway this viewer sees: their own choice, else the owner's default.
const effectiveTheme = () => (themeIsCustom() || !sharedDefaults.theme ? settings.theme : sharedDefaults.theme);
const dockIsCustom = () => settings.dockCustom ?? settings.dockOrder.length > 0;
const wallpaperIsCustom = () => settings.wallpaperCustom ?? (settings.wallpaper !== "default" || !!wallpaperPhoto);
// What this viewer sees: their own wallpaper if they chose one, else the shared default.
function effectiveWallpaper() {
  const custom = wallpaperIsCustom();
  const kind = custom || !sharedDefaults.wallpaper ? settings.wallpaper : sharedDefaults.wallpaper;
  const photo = custom ? wallpaperPhoto : sharedDefaults.photo || wallpaperPhoto;
  return { kind: kind === "photo" && !photo ? "default" : kind, photo: kind === "photo" ? photo : wallpaperPhoto };
}

function applySettings() {
  const theme = effectiveTheme();
  if (theme === "system") delete document.body.dataset.appearance;
  else document.body.dataset.appearance = theme;
  const wp = effectiveWallpaper();
  document.body.dataset.wallpaper = wp.kind;
  if (wp.photo) document.body.style.setProperty("--wallpaper-photo", `url("${wp.photo}")`);
  else document.body.style.removeProperty("--wallpaper-photo");
  document.documentElement.style.setProperty("--icon-size", `${settings.iconSize}px`);
}

const settings = loadSettings();

// The colorways offered in Settings → Appearance → Themes. Light, Dark and Playful restyle every window.
const THEME_CHOICES = [
  { id: "system", name: "Match system", note: "Light by day, dark at night", swatches: ["#f5f5f7", "#ffffff", "#007aff", "#000000", "#16181c", "#1d9bf0"] },
  { id: "light", name: "Light", note: "Clean off-white, blue active", swatches: ["#f5f5f7", "#ffffff", "#007aff", "#34c759", "#ff9500"] },
  { id: "dark", name: "Dark", note: "Pitch black, light blue accent", swatches: ["#000000", "#16181c", "#2f3336", "#e7e9ea", "#1d9bf0"] },
  { id: "playful", name: "Playful", note: "Leafy green, sunflower, violet", swatches: ["#f0f9f0", "#ffffff", "#4caf50", "#ffeb3b", "#8a2be2"] },
];

// ---------- Apps ----------
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const APPS = {
  settings: {
    title: "Settings",
    icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    color: "#64748b",
    custom: true,
    render(el) {
      el.classList.add("flush");
      el.innerHTML = `
        <div class="settings-layout">
          <nav class="settings-nav" aria-label="Settings pages">
            ${settingsPages().map(
              (p) => `<button type="button" data-page="${p.id}">
                <span class="nav-icon" style="background:${p.color}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p.icon}</svg></span>
                ${p.title}</button>`
            ).join("")}
          </nav>
          <div class="settings-page-slot"></div>
        </div>`;
      const slot = el.querySelector(".settings-page-slot");
      const show = (id) => {
        const page = settingsPages().find((p) => p.id === id) || settingsPages()[0];
        settings.settingsPage = page.id;
        saveSettings();
        el.querySelectorAll(".settings-nav button").forEach((b) => {
          if (b.dataset.page === page.id) b.setAttribute("aria-current", "page");
          else b.removeAttribute("aria-current");
        });
        slot.replaceChildren();
        page.render(slot);
        setCrumbs("settings", [{ label: page.title }], () => show(settingsPages()[0].id));
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
    // Shows the cohorts in training today, as their Cohorts rows opened to the roster.
    render(el) {
      const cc = window.CoachingCompass;
      if (!cc) {
        el.innerHTML = `<p class="muted">My Class isn't available right now.</p>`;
        return;
      }
      const collapsed = new Set(); // active cohorts are open unless collapsed here
      const draw = () => {
        const { cohorts, trainees } = cc.data();
        const today = localToday();
        const active = cohorts
          .filter((c) => cohortStatus(c, today) === "active")
          .sort((a, b) => a.training_start_date.localeCompare(b.training_start_date));
        if (!active.length) {
          const next = cohorts
            .filter((c) => cohortStatus(c, today) === "upcoming")
            .sort((a, b) => a.training_start_date.localeCompare(b.training_start_date))[0];
          el.innerHTML = `
            <h3>No active class</h3>
            <p class="muted">A cohort shows here while it's in training, from its start date through its 20th training day.</p>
            ${next ? `<p>Next up: <b>${escapeHtml(next.name)}</b>, starting ${escapeHtml(fmtDate(next.training_start_date))}.</p>` : `<p class="muted">Add a class with a start date in Cohorts.</p>`}`;
          return;
        }
        // The same row as in Cohorts, opened so the schedule and roster show straight away.
        const byId = new Map(trainees.map((t) => [t.id, t]));
        el.innerHTML = active
          .map((c) => {
            const p = scheduleProgress(cohortSchedule(c.training_start_date), today);
            return `
              <section class="my-class">
                <div class="progress-block">
                  <div class="progress-line"><b>${escapeHtml(p.label)}</b><span class="muted">Day ${p.day} of ${TRAINING_DAYS}</span></div>
                  <div class="progress"><span style="width:${Math.round((p.day / TRAINING_DAYS) * 100)}%"></span></div>
                </div>
                <ul class="cohort-list">${cohortRowHtml(c, byId, today, !collapsed.has(c.id))}</ul>
              </section>`;
          })
          .join("");
        wireCohortRows(el, (id) => {
          if (collapsed.has(id)) collapsed.delete(id);
          else collapsed.add(id);
          draw();
        });
      };
      draw();
      APPS.myClass.unsubscribe = cc.onChange(draw);
    },
    onClose() {
      APPS.myClass.unsubscribe?.();
    },
  },

  coaching: {
    title: "Metrics and Coaching",
    dockLabel: "Metrics & Coaching",
    icon: '<path d="M3 20h18"/><rect x="5" y="12" width="3.5" height="8" rx="0.8"/><rect x="10.25" y="7" width="3.5" height="13" rx="0.8"/><rect x="15.5" y="3" width="3.5" height="17" rx="0.8"/>',
    color: "#10b981",
    custom: true,
    // Coaching boots once with the page (coaching-compass/), so its state
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
    // Cohorts, departments and team leads come from the shared roster (Settings → Roster),
    // the same records Coaching uses.
    render(el) {
      const cc = window.CoachingCompass;
      if (!cc) {
        el.innerHTML = `<p class="muted">Cohorts aren't available right now.</p>`;
        return;
      }
      const openRows = new Set(); // cohorts expanded to show their schedule and trainees
      // Live QA, one pull per side: C Side from the C side sheet, CP Side from the CP side sheet.
      // Pulled from the QA sheets when the window opens and on Refresh. A trainee's department decides the side
      // (a department named "CP" is CP Side, anything else C Side).
      const live = { c_side: { status: "idle", result: null, error: null }, cp_side: { status: "idle", result: null, error: null } };
      const isCpTrainee = (t) => /\bcp\b/i.test(t.department || "");
      const memberCrms = (side) => {
        const { cohorts, trainees } = cc.data();
        const ids = new Set(cohorts.flatMap((c) => c.trainee_ids || []));
        return trainees.filter((t) => ids.has(t.id) && isCpTrainee(t) === (side === "cp_side")).map((t) => t.crm_name).filter(Boolean);
      };
      const anyLoading = () => live.c_side.status === "loading" || live.cp_side.status === "loading";
      const pull = () => {
        if (anyLoading()) return;
        const jobs = ["c_side", "cp_side"].map((side) => {
          const crms = memberCrms(side);
          const state = live[side];
          if (!crms.length) return Object.assign(state, { status: "idle", result: null, error: null }) && null;
          state.status = "loading";
          return cc.liveSideQa(crms, side).then(
            (result) => Object.assign(state, { status: "ok", result, error: null }),
            (e) => Object.assign(state, { status: "error", error: e?.message || "Couldn't read the QA sheet." })
          );
        });
        draw();
        Promise.all(jobs).then(() => el.isConnected && draw());
      };

      const draw = () => {
        const { cohorts, trainees } = cc.data();
        const today = localToday();
        const statusOf = (c) => cohortStatus(c, today);
        const counts = { active: 0, upcoming: 0, completed: 0, unscheduled: 0 };
        cohorts.forEach((c) => counts[statusOf(c)]++);
        const rosterIds = new Set(trainees.map((t) => t.id));
        const assigned = new Set(cohorts.flatMap((c) => (c.trainee_ids || []).filter((id) => rosterIds.has(id))));
        const next = cohorts
          .filter((c) => statusOf(c) === "upcoming")
          .sort((a, b) => a.training_start_date.localeCompare(b.training_start_date))[0];

        // Nesting QA, speed and pass rate cover trainees assigned to a cohort.
        const members = trainees.filter((t) => assigned.has(t.id));
        const qa = cc.qaSummary(members.map((t) => t.crm_name).filter(Boolean));
        const sheets = cc.sheets();
        const pct = (n, d) => `${Math.round((n / d) * 100)}%`;
        const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
        const passedOf = (r) => `${Math.round(r.pass * 100) / 100} of ${r.total} audits passed`;
        // Saved weeks from Coaching, shown until (or if) the live pull can't run.
        const sideTile = (side, label, group) => {
          const st = live[side];
          const q = cc.qaSummary(group.map((t) => t.crm_name).filter(Boolean));
          const saved = q.total
            ? { value: pct(q.pass, q.total), hint: `${passedOf(q)} · saved weeks only` }
            : { value: "—", hint: "No saved weeks yet" };
          if (!group.length) return { value: "—", hint: members.length ? `No ${label} trainees in a cohort` : "Add trainees to a cohort" };
          if (st.status === "ok") {
            const r = st.result;
            return r.total
              ? { value: pct(r.pass, r.total), hint: `${passedOf(r)} · ${plural(r.weeks, "week")} · ${plural(r.trainees, "trainee")}${r.source === "partial" ? " · may be incomplete" : ""}` }
              : { value: "—", hint: `No audits in the ${label} QA sheet for these CRM names` };
          }
          if (st.status === "loading") return { value: saved.value === "—" ? "…" : saved.value, hint: "Pulling the latest from the QA sheet…" };
          if (st.status === "error") return { value: saved.value, hint: `${st.error} ${saved.value === "—" ? "" : "Showing saved weeks."}`.trim() };
          if (!sheets[side]?.url) return { value: "—", hint: "Not set up · Settings → QA Sheets" };
          return saved;
        };
        const cQa = sideTile("c_side", "C Side", members.filter((t) => !isCpTrainee(t)));
        const cpQa = sideTile("cp_side", "CP Side", members.filter(isCpTrainee));
        const stamps = ["c_side", "cp_side"].map((k) => live[k]).filter((x) => x.status === "ok").map((x) => x.result.fetchedAt).sort();
        const updated = anyLoading()
          ? "Refreshing…"
          : stamps.length
            ? `Updated from the QA sheets at ${new Date(stamps[stamps.length - 1]).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
            : live.c_side.status === "error" || live.cp_side.status === "error"
              ? "Last refresh failed"
              : "";
        // Pass rate per side: a trainee's department decides the side (a department named "CP" is CP Side,
        // anything else C Side, same rule Coaching uses for its knowledge base).
        const isCp = isCpTrainee;
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
          <div class="overview-freeze">
          <div class="app-head">
            <h3>Overview</h3>
            <button type="button" class="btn-primary" data-add-class>+ Add Class</button>
          </div>
          <div class="stats stats-5">
            <div class="stat"><div class="value">${cohorts.length}</div><div class="label">Cohorts</div></div>
            <div class="stat"><div class="value">${counts.active}</div><div class="label">Active</div></div>
            <div class="stat"><div class="value">${counts.upcoming}</div><div class="label">Upcoming${next ? ` · next ${escapeHtml(fmtDate(next.training_start_date))}` : ""}</div></div>
            <div class="stat"><div class="value">${counts.completed}</div><div class="label">Completed</div></div>
            <div class="stat"><div class="value">${assigned.size}<span class="of"> / ${trainees.length}</span></div><div class="label">Trainees in a cohort</div></div>
          </div>
          <div class="metric-groups">
            <section class="metric-group">
              <div class="group-head">
                <h4>Nesting QA</h4>
                ${average(cQa, cpQa)}
                <button type="button" class="btn btn-small" data-refresh-qa${anyLoading() ? " disabled" : ""}>${anyLoading() ? "Refreshing…" : "↻ Refresh"}</button>
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
          </div>
          ${cohortSectionsHtml(cohorts, trainees, today, openRows)}`;
        el.querySelector("[data-add-class]").addEventListener("click", () => openAddClass(el));
        el.querySelector("[data-refresh-qa]").addEventListener("click", pull);
        wireCohortRows(el, (id) => {
          if (openRows.has(id)) openRows.delete(id);
          else openRows.add(id);
          draw();
        });
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

// Attendance lives in attendance/attendance.js (loaded after Coaching).
APPS.attendance = {
  title: "Attendance",
  icon: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="m9 15 2 2 4-4"/>',
  color: "#8b5cf6",
  render(el) {
    if (window.TrainerAttendance) window.TrainerAttendance.render(el);
    else el.innerHTML = `<p class="muted">Attendance isn't available right now.</p>`;
  },
  onClose() {
    window.TrainerAttendance?.onClose();
  },
};

// Quiz lives in quiz/quiz.js: write quizzes, send them over Slack, check and score the replies.
APPS.quiz = {
  title: "Quiz",
  icon: '<rect x="5" y="3.5" width="14" height="17.5" rx="2"/><path d="M9 3.5V2.5h6v1M9 3.5v1.5h6V3.5"/><path d="m8.5 11 1.6 1.6 3.2-3.2M8.5 16.5h7"/>',
  color: "#ec4899",
  custom: true,
  render(el) {
    if (window.TrainerQuiz) window.TrainerQuiz.render(el);
    else el.innerHTML = `<p class="muted">Quiz isn't available right now.</p>`;
  },
  onClose() {
    window.TrainerQuiz?.onClose();
  },
};

// Courseware lives in courseware/courseware.js: a lobby of training material links, as tiles with previews.
APPS.courseware = {
  title: "Courseware",
  icon: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M8 13h8M8 16h5"/>',
  color: "#0ea5e9",
  custom: true,
  render(el) {
    if (window.TrainerCourseware) window.TrainerCourseware.render(el);
    else el.innerHTML = `<p class="muted">Courseware isn't available right now.</p>`;
  },
  onClose() {
    window.TrainerCourseware?.onClose();
  },
};

// Ops Updates (formerly Notion) lives in notify/notify.js: updates from Slack channels the owner names, checked every 30 minutes.
APPS.notion = {
  title: "Ops Updates",
  icon: '<path d="M3 11v2a1 1 0 0 0 1 1h2.5l5.5 4V6L6.5 10H4a1 1 0 0 0-1 1z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5"/><path d="M18 7a7 7 0 0 1 0 10"/>',
  color: "#3f3f46",
  custom: true,
  render(el) {
    if (window.TrainerNotion) window.TrainerNotion.render(el);
    else el.innerHTML = `<p class="muted">Ops Updates isn't available right now.</p>`;
  },
  onClose() {
    window.TrainerNotion?.onClose();
  },
};

// ---------- Training Manager apps (a different dock for managers) ----------
const mgApp = (kind, title, icon, color) => ({
  title,
  icon,
  color,
  custom: true,
  render(el) {
    if (window.TrainerManager) window.TrainerManager.render(el, kind);
    else el.innerHTML = `<p class="muted">${title} isn't available right now.</p>`;
  },
  onClose() {
    window.TrainerManager?.onClose(kind);
  },
});
APPS.mgOverview = mgApp("overview", "Overview", '<rect x="3" y="3" width="7.5" height="9" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="5.5" rx="1.5"/><rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.5"/><rect x="3" y="15" width="7.5" height="6" rx="1.5"/>', "#3b82f6");
APPS.mgTrainers = mgApp("trainers", "Trainers", '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M21.5 20a6.5 6.5 0 0 0-4-6"/>', "#10b981");
APPS.mgCohorts = mgApp("cohorts", "Cohorts", '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12.5V17c3.3 2.3 8.7 2.3 12 0v-4.5"/>', "#f59e0b");
APPS.mgPerformance = mgApp("performance", "Performance", '<path d="M3 20h18"/><rect x="5" y="12" width="3.5" height="8" rx="0.8"/><rect x="10.25" y="7" width="3.5" height="13" rx="0.8"/><rect x="15.5" y="3" width="3.5" height="17" rx="0.8"/>', "#8b5cf6");
APPS.mgReports = mgApp("reports", "Reports", '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>', "#ef4444");
const MANAGER_ORDER = ["mgOverview", "mgTrainers", "mgCohorts", "mgPerformance", "mgReports", "notion", "courseware", "settings"];
const appRole = () => window.TrainerWS?.role || "trainer";
const visibleAppIds = () => (appRole() === "manager" ? MANAGER_ORDER.filter((id) => APPS[id]) : Object.keys(APPS).filter((id) => !id.startsWith("mg")));

// Your avatar, your role, and a way to look at another Trainer's dashboard (read-only).
function drawProfile(card) {
  const WS = window.TrainerWS;
  const TM = window.TrainerManager;
  if (!card || !WS) return;
  TM?.start();
  const draw = () => {
    if (!card.isConnected) return;
    const me = WS.ws;
    const others = (TM?.trainers() || []).filter((t) => !t.uid || t.uid !== me.id);
    const role = WS.role === "manager" ? "Training Manager" : "Trainer";
    const picker = others.length
      ? `<div class="profile-view"><label for="view-as">View another Trainer <small class="muted">(read-only window)</small></label>
          <span><select id="view-as">${others.map((t) => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name || "Trainer")}</option>`).join("")}</select>
          <button type="button" class="btn" id="view-open">Open</button></span></div>`
      : `<p class="muted profile-note">Other Trainers will be listed here once they have opened the dashboard.</p>`;
    const picks = WS.animals.map((a) => `<button type="button" class="animal${WS.animal === a.key ? " is-on" : ""}" data-animal="${a.key}" style="background:${a.bg}" title="${escapeHtml(a.label)}" aria-label="${escapeHtml(a.label)}" aria-pressed="${WS.animal === a.key}">${a.emoji}</button>`).join("");
    card.innerHTML = `<div class="profile-head">
        ${WS.avatarHtml({ animal: WS.animal, photo: me.avatar, color: me.color, name: me.name }, "profile-av")}
        <div><b class="profile-name"></b><small class="muted">${escapeHtml(role)}</small></div></div>
      <div class="profile-pick"><span>Avatar</span><div class="animal-grid" role="group" aria-label="Choose an animal avatar">${picks}<button type="button" class="animal-none${WS.animal ? "" : " is-on"}" data-animal="" aria-pressed="${!WS.animal}" title="Use my profile photo">Photo</button></div></div>
      ${picker}`;
    card.querySelector(".profile-name").textContent = me.name || "You";
  };
  draw();
  card.addEventListener("click", (e) => {
    const an = e.target.closest("[data-animal]");
    if (an) return void WS.setAnimal(an.dataset.animal);
    if (e.target.closest("#view-open")) {
      const opt = card.querySelector("#view-as")?.selectedOptions?.[0];
      if (opt) TM?.openTrainerWindow(opt.value);
    }
  });
  const offWs = WS.onChange(() => (card.isConnected ? draw() : offWs()));
  const off = TM?.onChange(() => {
    if (!card.isConnected) return off?.();
    if (card.contains(document.activeElement) && document.activeElement.tagName === "SELECT") return;
    draw();
  });
}

// The avatar at the far right of the menu bar: who you are, switching dashboards (owner), and other Trainers to look at.
function buildAvatarMenu() {
  const WS = window.TrainerWS;
  const TM = window.TrainerManager;
  const right = document.querySelector(".menubar-right");
  if (!WS || !right || document.getElementById("avatar-btn")) return;
  TM?.start();
  const me = WS.ws;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "avatar-btn";
  btn.setAttribute("aria-haspopup", "true");
  btn.setAttribute("aria-label", "Your profile and Trainers");
  const mine = () => ({ animal: WS.animal, photo: me.avatar, color: me.color || "#7aa2ff", name: me.name || "You" });
  const paintBtn = () => (btn.innerHTML = WS.avatarHtml(mine(), "av-dot"));
  paintBtn();
  document.getElementById("clock")?.after(btn);
  let pop = null;
  const close = () => {
    pop?.remove();
    pop = null;
    btn.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", outside, true);
    document.removeEventListener("keydown", onKey, true);
  };
  const outside = (e) => pop && !pop.contains(e.target) && !btn.contains(e.target) && close();
  const onKey = (e) => e.key === "Escape" && close();
  const draw = () => {
    if (!pop) return;
    const trainers = (TM?.trainers() || []).filter((t) => !t.uid || t.uid !== me.id);
    const role = WS.role === "manager" ? "Training Manager" : "Trainer";
    const av = (t) => WS.avatarHtml({ animal: t.animal, photo: t.avatar, color: t.color, name: t.name }, "ap-av");
    const toggle = WS.isOwner
      ? `<h6>Dashboard</h6>
         <button type="button" class="ap-item${WS.role === "manager" ? "" : " is-on"}" data-ap-mode="trainer"><span class="ap-ic">🧑‍🏫</span>My Trainer dashboard${WS.role === "manager" ? "" : "<small>current</small>"}</button>
         <button type="button" class="ap-item${WS.role === "manager" ? " is-on" : ""}" data-ap-mode="manager"><span class="ap-ic">📊</span>Training Manager${WS.role === "manager" ? "<small>current</small>" : ""}</button>`
      : "";
    pop.innerHTML = `
      <div class="ap-me">${WS.avatarHtml(mine(), "ap-av")}
        <div><b class="ap-name"></b><small>${escapeHtml(role)}</small></div></div>
      ${toggle}
      <h6>View another Trainer <small>read-only</small></h6>
      ${
        trainers.length
          ? `<ul class="ap-list">${trainers.map((t) => `<li><button type="button" class="ap-item" data-ap-view="${escapeHtml(t.id)}">${av(t)}<span class="ap-tn"></span></button></li>`).join("")}</ul>`
          : `<p class="ap-empty">Other Trainers appear here once they've opened the dashboard.</p>`
      }
      <button type="button" class="ap-item ap-settings" data-ap-settings>Profile &amp; appearance settings…</button>`;
    pop.querySelector(".ap-name").textContent = me.name || "You";
    pop.querySelectorAll(".ap-tn").forEach((el, i) => (el.textContent = trainers[i].name || "Trainer"));
  };
  btn.addEventListener("click", () => {
    if (pop) return close();
    pop = document.createElement("div");
    pop.className = "avatar-pop";
    pop.setAttribute("role", "menu");
    document.body.appendChild(pop);
    btn.setAttribute("aria-expanded", "true");
    draw();
    pop.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.apMode) {
        close();
        return WS.setPreview(b.dataset.apMode === "manager");
      }
      if (b.dataset.apView) {
        close();
        return window.TrainerManager?.openTrainerWindow(b.dataset.apView);
      }
      if ("apSettings" in b.dataset) {
        close();
        settings.settingsPage = "appearance";
        saveSettings();
        openApp("settings");
        openWindows.get("settings")?.querySelector('[data-page="appearance"]')?.click();
      }
    });
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", onKey, true);
  });
  TM?.onChange(draw);
  WS.onChange(() => (paintBtn(), draw()));
}

// ---------- Settings pages ----------
const settingsPages = () => SETTINGS_PAGES.filter((p) => (!p.roles || p.roles.includes(appRole())) && (!p.ownerOnly || window.TrainerWS?.isOwner));
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
          <section class="profile-card" id="profile-card" aria-label="Your profile"></section>
          <div class="form-row">
            <label for="set-theme">Themes</label>
            <select id="set-theme">
              <option value="system">Match system</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="playful">Playful</option>
            </select>
          </div>
          <div class="theme-grid" id="theme-grid" role="group" aria-label="Colorways">${THEME_CHOICES.map(
            (t) => `<button type="button" class="theme-card" data-theme-choice="${t.id}" aria-pressed="false">
              <span class="theme-preview" aria-hidden="true">${t.swatches.map((c) => `<span style="background:${c}"></span>`).join("")}</span>
              ${t.name}<small>${t.note}</small></button>`
          ).join("")}</div>
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
          <div class="form-row photo-row" id="defaults-row" hidden>
            <div>
              <span>Default layout</span>
              <p class="muted photo-note" id="defaults-note"></p>
            </div>
            <div class="photo-controls">
              <button type="button" class="button-like" id="defaults-reset" hidden>Use the default</button>
              <button type="button" class="button-like" id="defaults-publish" hidden>Make mine the default for everyone</button>
            </div>
          </div>
        </div>`;
      const $ = (id) => slot.querySelector(id);
      drawProfile(slot.querySelector("#profile-card"));
      const theme = $("#set-theme");
      const wallpaper = $("#set-wallpaper");
      const size = $("#set-size");
      const magnify = $("#set-magnify");
      const note = $("#photo-note");

      const syncTheme = () => {
        theme.value = effectiveTheme();
        slot.querySelectorAll("[data-theme-choice]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeChoice === effectiveTheme())));
      };
      slot.querySelector("#theme-grid").addEventListener("click", (e) => {
        const b = e.target.closest("[data-theme-choice]");
        if (!b) return;
        theme.value = b.dataset.themeChoice;
        update();
        syncTheme();
      });
      const syncPhoto = () => {
        const wp = effectiveWallpaper();
        const own = wallpaperIsCustom() && !!wallpaperPhoto;
        wallpaper.querySelector('[value="photo"]').disabled = !wp.photo;
        wallpaper.value = wp.kind;
        $("#photo-thumb").hidden = !wp.photo;
        $("#photo-thumb").style.backgroundImage = wp.photo ? `url("${wp.photo}")` : "";
        $("#photo-remove").hidden = !own;
        $("#photo-pick-label").textContent = own ? "Change photo" : wp.photo ? "Use my own photo" : "Add photo";
      };
      // The default layout row: anyone can go back to it; the owner can publish theirs.
      const syncDefaults = () => {
        const row = $("#defaults-row");
        const custom = dockIsCustom() || wallpaperIsCustom() || (themeIsCustom() && !!sharedDefaults.theme && settings.theme !== sharedDefaults.theme);
        const canReset = sharedDefaults.loaded && (sharedDefaults.dockOrder || sharedDefaults.wallpaper || sharedDefaults.theme) && custom;
        row.hidden = !(canReset || defaultsOwner);
        $("#defaults-reset").hidden = !canReset;
        $("#defaults-publish").hidden = !defaultsOwner;
        $("#defaults-note").textContent = defaultsOwner
          ? "The colorway, dock order and wallpaper others see until they change them. Set them up the way you like, then publish."
          : "You're using your own colorway, dock order or wallpaper. The default is the one the owner set.";
      };
      syncTheme();
      size.value = settings.iconSize;
      magnify.checked = settings.magnify;
      note.textContent = "A JPG or PNG from your computer, kept at full quality (up to 4K). It stays in this browser.";
      syncPhoto();
      syncDefaults();
      defaultsHooks.sync = () => slot.isConnected && (syncPhoto(), syncDefaults());

      const update = () => {
        if (theme.value !== effectiveTheme()) settings.themeCustom = true;
        settings.theme = theme.value;
        syncTheme();
        syncDefaults();
        settings.wallpaper = wallpaper.value;
        settings.iconSize = Number(size.value);
        settings.magnify = magnify.checked;
        applySettings();
        saveSettings();
      };
      [theme, wallpaper, size, magnify].forEach((input) => input.addEventListener("input", update));
      // Choosing a wallpaper makes it yours; the default stays for everyone else.
      wallpaper.addEventListener("input", () => {
        settings.wallpaperCustom = true;
        saveSettings();
        syncPhoto();
        syncDefaults();
      });
      $("#defaults-reset").addEventListener("click", () => {
        settings.dockCustom = false;
        settings.wallpaperCustom = false;
        settings.themeCustom = false;
        settings.dockOrder = [];
        saveSettings();
        reorderDock();
        applySettings();
        syncPhoto();
        syncDefaults();
        note.textContent = "Back to the default dock order and wallpaper.";
      });
      $("#defaults-publish").addEventListener("click", async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        note.textContent = "Saving the default…";
        note.textContent = (await publishDefaults()) || "Your dock order and wallpaper are now the default for everyone who hasn't changed theirs.";
        btn.disabled = false;
        syncDefaults();
      });

      $("#set-photo").addEventListener("change", async (e) => {
        const file = e.target.files[0];
        e.target.value = "";
        if (!file) return;
        note.textContent = "Loading photo…";
        let blob;
        try {
          blob = await preparePhoto(file);
        } catch {
          note.textContent = "That file couldn't be opened as a photo. Try a JPG or PNG.";
          return;
        }
        if (wallpaperPhoto?.startsWith("blob:")) URL.revokeObjectURL(wallpaperPhoto);
        wallpaperBlob = blob;
        wallpaperPhoto = URL.createObjectURL(blob);
        if (await photoDb.set("wallpaper", blob)) {
          try {
            localStorage.removeItem(PHOTO_KEY);
          } catch {}
          note.textContent = "Photo set as your wallpaper, in full quality.";
        } else note.textContent = "Photo set, but this browser couldn't save it, so it will reset when you reload.";
        settings.wallpaper = "photo";
        settings.wallpaperCustom = true;
        applySettings();
        saveSettings();
        syncPhoto();
        syncDefaults();
      });
      $("#photo-remove").addEventListener("click", () => {
        if (wallpaperPhoto?.startsWith("blob:")) URL.revokeObjectURL(wallpaperPhoto);
        wallpaperPhoto = null;
        wallpaperBlob = null;
        photoDb.del("wallpaper");
        try {
          localStorage.removeItem(PHOTO_KEY);
        } catch {}
        if (settings.wallpaper === "photo") settings.wallpaper = "default";
        settings.wallpaperCustom = true;
        note.textContent = "Photo removed.";
        applySettings();
        saveSettings();
        syncPhoto();
        syncDefaults();
      });
    },
  },
  {
    id: "roster",
    roles: ["trainer", "manager"],
    title: "Roster",
    color: "#10b981",
    icon: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M21.5 20a6.5 6.5 0 0 0-4-6"/>',
    // The roster belongs to Coaching's data; it renders its own page here.
    render(slot) {
      slot.innerHTML = `<div class="settings-page cc-ui"><div class="cc-ui-scroll"></div></div>`;
      const host = slot.querySelector(".cc-ui-scroll");
      if (window.CoachingCompass) window.CoachingCompass.mountRoster(host);
      else host.innerHTML = `<p class="muted">The roster isn't available right now.</p>`;
    },
  },
  {
    id: "speed-sheet",
    roles: ["trainer"],
    title: "Speed Productivity Sheet",
    color: "#ef4444",
    icon: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 18 4-6"/>',
    // Where each trainee's weekly Speed number is read from; used by Coaching's Speed app and Performance.
    render(slot) {
      slot.innerHTML = `<div class="settings-page cc-ui"><div class="cc-ui-scroll"></div></div>`;
      const host = slot.querySelector(".cc-ui-scroll");
      if (window.CoachingCompass) window.CoachingCompass.mountSpeedSettings(host);
      else host.innerHTML = `<p class="muted">Speed settings aren't available right now.</p>`;
    },
  },
  {
    id: "qa-sheets",
    roles: ["trainer"],
    title: "QA Sheets",
    color: "#f59e0b",
    icon: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M9 9v12"/>',
    // Where QA audits are read from (C side and CP side); used by Coaching and Cohorts.
    render(slot) {
      slot.innerHTML = `<div class="settings-page cc-ui"><div class="cc-ui-scroll"></div></div>`;
      const host = slot.querySelector(".cc-ui-scroll");
      if (window.CoachingCompass) window.CoachingCompass.mountQaSheets(host);
      else host.innerHTML = `<p class="muted">QA sheet settings aren't available right now.</p>`;
    },
  },
  {
    id: "managers",
    ownerOnly: true,
    title: "Training Managers",
    color: "#ef4444",
    icon: '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    // Who gets the Training Manager instead of the Trainer dashboard. Only the artifact owner changes this.
    render(slot) {
      slot.innerHTML = `<div class="settings-page app-body"><h3>Training Managers</h3>
        <p class="muted">Managers see the Training Manager (every Trainer's numbers, read-only) instead of the Trainer dashboard. Only you can change this list.</p>
        <div id="mgr-list"></div>
        <div class="form-row"><label for="mgr-q">Add a manager</label><input id="mgr-q" type="search" placeholder="Search by name" autocomplete="off" /></div>
        <div id="mgr-hits"></div>
        <p class="sheet-status" id="mgr-status" role="status"></p>
        <div class="form-row"><label>Preview</label><span><button type="button" class="btn" id="mgr-preview">${window.TrainerWS?.ws?.previewing ? "Exit preview" : "Preview the Training Manager"}</button> <small class="muted">See what a manager sees. You come back to your own dashboard from the bar at the top.</small></span></div></div>`;
      const WS = window.TrainerWS;
      const list = slot.querySelector("#mgr-list");
      const hits = slot.querySelector("#mgr-hits");
      const status = slot.querySelector("#mgr-status");
      let ids = WS?.managerIds || [];
      const save = async (next) => {
        status.textContent = "Saving…";
        try {
          const db = await window.TrainerUse("db");
          await db.doc("config/managers").set({ ids: next, updated_at: new Date().toISOString() });
          ids = next;
          status.textContent = "Saved. Managers see the Training Manager the next time they open the dashboard.";
          drawList();
        } catch {
          status.textContent = "Couldn't save the list. Try again.";
        }
      };
      const drawList = async () => {
        const user = await window.TrainerUse("user");
        const ps = ids.length && user?.profiles ? await user.profiles(ids) : {};
        list.innerHTML = ids.length
          ? `<ul class="mgr-people">${ids.map((id) => `<li><span class="mgr-name"></span><button type="button" class="btn btn-small" data-mgr-remove="${escapeHtml(id)}">Remove</button></li>`).join("")}</ul>`
          : `<p class="muted">No managers yet.</p>`;
        list.querySelectorAll(".mgr-name").forEach((el, i) => (el.textContent = ps[ids[i]]?.name || "Someone"));
      };
      list.addEventListener("click", (e) => {
        const b = e.target.closest("[data-mgr-remove]");
        if (b) save(ids.filter((x) => x !== b.dataset.mgrRemove));
      });
      let timer = null;
      slot.querySelector("#mgr-q").addEventListener("input", (e) => {
        clearTimeout(timer);
        const q = e.target.value.trim();
        timer = setTimeout(async () => {
          if (!q) return void (hits.innerHTML = "");
          const user = await window.TrainerUse("user");
          const found = user?.search ? await user.search(q) : [];
          hits.innerHTML = found.length
            ? `<ul class="mgr-people">${found.map((h) => `<li><span class="mgr-hit"></span><button type="button" class="btn btn-small" data-mgr-add="${escapeHtml(h.id)}"${ids.includes(h.id) ? " disabled" : ""}>${ids.includes(h.id) ? "Added" : "Add as manager"}</button></li>`).join("")}</ul>`
            : `<p class="muted">Nobody found. Names only search people who have opened this dashboard or are in your organization.</p>`;
          hits.querySelectorAll(".mgr-hit").forEach((el, i) => (el.textContent = found[i].name || "Someone"));
        }, 250);
      });
      hits.addEventListener("click", (e) => {
        const b = e.target.closest("[data-mgr-add]");
        if (b && !ids.includes(b.dataset.mgrAdd)) save([...ids, b.dataset.mgrAdd]).then(() => (slot.querySelector("#mgr-q").value = "", (hits.innerHTML = "")));
      });
      slot.querySelector("#mgr-preview").addEventListener("click", () => WS?.setPreview(!WS.ws.previewing));
      drawList();
    },
  },
];

// Scale a photo down to screen size so it fits in browser storage.
// A wallpaper at full quality: the file as it is when it's an ordinary web image up to 4K (no recompression), else
// scaled down to 3840 px on its long side and saved as a high-quality JPEG.
async function preparePhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    if (longest <= 3840 && /^image\/(jpeg|png|webp)$/.test(file.type) && file.size <= 18 * 1024 * 1024) return file;
    const scale = Math.min(1, 3840 / longest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.92));
  } finally {
    URL.revokeObjectURL(url);
  }
}

const fmtDate = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

// ---------- Cohort schedule ----------
// 20 training days: 5 days on, 2 days off, counted from the start date.
// Weeks 1–2 are classroom training, weeks 3–4 are nesting. Production endorsement is the next
// training day after nesting, once the 2 days off have passed (Fri Oct 16 → Mon Oct 19).
const TRAINING_DAYS = 20;
const NESTING_LABELS = { "": "In nesting", passed: "Passed nesting", not_passed: "Did not pass" };

const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const localToday = () => isoDate(new Date());

function cohortSchedule(start) {
  if (!start) return null;
  const day0 = new Date(`${start}T00:00:00`);
  if (isNaN(day0)) return null;
  const plus = (n) => {
    const d = new Date(day0);
    d.setDate(d.getDate() + n);
    return isoDate(d);
  };
  const weeks = [0, 1, 2, 3].map((i) => ({
    phase: i < 2 ? "Classroom" : "Nesting",
    label: i < 2 ? `Classroom week ${i + 1}` : `Nesting week ${i - 1}`,
    start: plus(i * 7),
    end: plus(i * 7 + 4),
  }));
  return {
    start,
    end: weeks[3].end,
    weeks,
    classroom: { start: weeks[0].start, end: weeks[1].end },
    nesting: { start: weeks[2].start, end: weeks[3].end },
    endorsement: plus(3 * 7 + 4 + 3),
  };
}

// A cohort's status: the schedule decides, unless the Trainer marked it completed (or reopened it).
function cohortStatus(c, today) {
  return c.completed ? "completed" : scheduleStatus(cohortSchedule(c.training_start_date), today);
}

function scheduleStatus(s, today) {
  if (!s) return "unscheduled";
  if (today < s.start) return "upcoming";
  if (today > s.end) return "completed";
  return "active";
}

// Where an active cohort is today: its week, and how many training days have happened.
function scheduleProgress(s, today) {
  let day = 0;
  let current = null;
  s.weeks.forEach((w) => {
    for (let d = new Date(`${w.start}T00:00:00`); isoDate(d) <= w.end; d.setDate(d.getDate() + 1)) if (isoDate(d) <= today) day++;
    if (today >= w.start && today <= w.end) current = w;
  });
  if (current) return { day, label: current.label };
  const next = s.weeks.find((w) => w.start > today);
  return { day, label: next ? `Day off · ${next.label} starts ${fmtShort(next.start)}` : "Training complete" };
}

const fmtShort = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtRange = (a, b) => `${fmtShort(a)} – ${fmtShort(b)}, ${new Date(`${b}T00:00:00`).getFullYear()}`;

function timelineHtml(s, today) {
  const phase = (label, range) => {
    const state = today > range.end ? "done" : today >= range.start ? "now" : "later";
    return `<li class="sch-${state}"><span class="sch-label">${label}:</span> ${fmtShort(range.start)} – ${fmtShort(range.end)}</li>`;
  };
  return `<ul class="schedule">
    ${phase("Classroom Training", s.classroom)}
    ${phase("Nesting", s.nesting)}
    <li class="sch-endorse"><b>Production Endorsement Date: ${fmtShort(s.endorsement)}</b></li>
  </ul>`;
}

// Cohort details: the schedule, the endorsement date in bold, and the trainee count.
// Name, department and team lead are already in the row above it.
function cohortDetailHtml(c, s, members) {
  const inactive = members.filter(isInactive).length;
  return `
    <div class="cohort-detail">
      ${
        s
          ? `<p class="cd-lines">Classroom Training: ${fmtShort(s.classroom.start)} – ${fmtShort(s.classroom.end)}<br>Nesting: ${fmtShort(s.nesting.start)} – ${fmtShort(s.nesting.end)}</p>
             <p class="cd-endorse">Production Endorsement Date: ${fmtShort(s.endorsement)}</p>`
          : `<p class="cd-lines muted">No start date yet, so there's no schedule.</p>`
      }
      <p class="cd-lines">Current number of trainees: ${members.length - inactive} active${members.length ? ` (${Math.round(((members.length - inactive) / members.length) * 100)}%)` : ""}${inactive ? ` · ${inactive} inactive` : ""}</p>
    </div>`;
}

// A trainee's Active / Inactive status in their cohort (stored on the trainee; a trainee
// belongs to one cohort). Active is the default.
const isInactive = (t) => t.cohort_status === "inactive";

// ---- Trainee status: set by hand, or projected automatically from the cohort's team goals ----
const TRAINEE_STATUSES = [
  { key: "pass", label: "Projected to pass" },
  { key: "fail", label: "Projected to fail" },
  { key: "resigned", label: "Resigned" },
  { key: "terminated", label: "Terminated" },
];
const statusLabel = (k) => TRAINEE_STATUSES.find((x) => x.key === k)?.label || "";
const GOAL_DEFS = [
  { key: "quiz", label: "Quiz average", unit: "%", hint: "Weighted quiz average, at or above", dir: "min" },
  { key: "qa", label: "QA", unit: "%", hint: "Overall QA score, at or above", dir: "min" },
  { key: "speed", label: "Speed", unit: "min/ticket", hint: "Average minutes per ticket, at or below (lower is faster)", dir: "max" },
  { key: "attendance", label: "Attendance", unit: "points", hint: "Total attendance points, at or below (lower is better)", dir: "max" },
];
const hasGoals = (c) => GOAL_DEFS.some((g) => Number(c?.team_goals?.[g.key]) > 0 || c?.team_goals?.[g.key] === 0);
const autoCache = {}; // traineeId -> { status: "pass"|"fail"|null, checks: [...] }
let autoRunning = false;
let autoAgain = false;
let autoSig = "";
let autoLast = 0;
const fmtNum = (v) => String(Math.round(v * 100) / 100);

// What a trainee shows beside their name: their manual status, else the automatic projection.
function traineeStatusOf(t) {
  const m = t.trainee_status;
  if (m?.mode === "manual" && m.value) return { key: m.value, auto: false };
  const a = autoCache[t.id];
  return a?.status ? { key: a.status, auto: true, checks: a.checks } : null;
}
function statusBadgeHtml(t) {
  const st = traineeStatusOf(t);
  if (!st) return "";
  const tip = st.auto ? `Automatic, from the team goals: ${st.checks.map((c) => `${c.label} ${fmtNum(c.value)}${c.unit === "%" ? "%" : ""} vs goal ${c.dir === "min" ? "≥" : "≤"} ${fmtNum(c.goal)} ${c.met ? "✓" : "✗"}`).join(" · ")}` : "Set by hand";
  return `<span class="tstatus ts-${st.key}" title="${escapeHtml(tip)}">${escapeHtml(statusLabel(st.key))}${st.auto ? ` <small>auto</small>` : ""}</span>`;
}
// Checks one trainee against the cohort's goals. A goal counts only when there's data for it.
function evaluateTrainee(cohort, t, quiz) {
  const cc = window.CoachingCompass;
  const goals = cohort.team_goals || {};
  const checks = [];
  const add = (def, value) => {
    const goal = Number(goals[def.key]);
    if (!(goals[def.key] !== "" && goals[def.key] != null) || isNaN(goal) || value == null || isNaN(value)) return;
    checks.push({ key: def.key, label: def.label, unit: def.unit, dir: def.dir, goal, value, met: def.dir === "min" ? value >= goal : value <= goal });
  };
  const q = quiz?.[t.id];
  add(GOAL_DEFS[0], q && q.taken ? (q.weighted ?? q.avg) : null);
  const qa = t.crm_name ? cc.qaSummary([t.crm_name]) : null;
  add(GOAL_DEFS[1], qa && qa.total ? (qa.pass / qa.total) * 100 : null);
  const vals = cc.traineeSpeed(t.id).weeks.map((w) => w.value).filter((v) => v != null);
  add(GOAL_DEFS[2], vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null);
  add(GOAL_DEFS[3], window.TrainerAttendance?.points ? window.TrainerAttendance.points(cohort.id, t.id) : null);
  return { status: checks.length ? (checks.every((c) => c.met) ? "pass" : "fail") : null, checks };
}
// Recomputes every automatic projection (at most every 15 s unless forced) and asks the apps to redraw when something changed.
async function refreshAutoStatuses(force) {
  const cc = window.CoachingCompass;
  if (!cc) return;
  if (autoRunning) {
    if (force) autoAgain = true; // a save landed mid-run: go again when this one ends
    return;
  }
  const { cohorts: cs, trainees: ts } = cc.data();
  // Goals, manual statuses and attendance changing re-run it at once; other data is picked up within 15 s.
  const sig = JSON.stringify([cs.map((c) => [c.id, c.team_goals, c.trainee_ids, c.attendance_days]), ts.map((t) => [t.id, t.trainee_status, t.cohort_status, t.crm_name])]);
  if (!force && sig === autoSig && Date.now() - autoLast < 15000) return;
  autoSig = sig;
  autoRunning = true;
  autoLast = Date.now();
  try {
    const { cohorts, trainees } = cc.data();
    const byId = new Map(trainees.map((t) => [t.id, t]));
    const next = {};
    for (const c of cohorts) {
      if (!hasGoals(c)) continue;
      const members = (c.trainee_ids || []).map((id) => byId.get(id)).filter((t) => t && t.trainee_status?.mode !== "manual");
      if (!members.length) continue;
      let quiz = null;
      if (c.team_goals?.quiz !== "" && c.team_goals?.quiz != null && window.TrainerQuiz?.cohortScores) quiz = await window.TrainerQuiz.cohortScores(members.map((t) => t.id)).catch(() => null);
      members.forEach((t) => (next[t.id] = evaluateTrainee(c, t, quiz)));
    }
    const before = JSON.stringify(autoCache);
    Object.keys(autoCache).forEach((k) => delete autoCache[k]);
    Object.assign(autoCache, next);
    if (JSON.stringify(autoCache) !== before) cc.notify();
  } finally {
    autoRunning = false;
    if (autoAgain) {
      autoAgain = false;
      refreshAutoStatuses(true);
    }
  }
}

// ---- The summary the Training Manager reads (trainers/<id>.summary), refreshed while this dashboard is open ----
let summaryLast = "";
let summaryTimer = null;
let summaryRunning = false;
async function buildSummary() {
  const cc = window.CoachingCompass;
  await refreshAutoStatuses();
  const { cohorts, trainees } = cc.data();
  const byId = new Map(trainees.map((t) => [t.id, t]));
  const ids = [...new Set(cohorts.flatMap((c) => c.trainee_ids || []))];
  const quiz = ids.length && window.TrainerQuiz?.cohortScores ? await window.TrainerQuiz.cohortScores(ids).catch(() => null) : null;
  const today = localToday();
  const goal = (v) => (Number(v) > 0 ? Number(v) : null);
  const rows = cohorts.map((c) => {
    const members = (c.trainee_ids || []).map((id) => byId.get(id)).filter(Boolean);
    const tally = { pass: 0, fail: 0, none: 0, resigned: 0, terminated: 0 };
    let speed = { sum: 0, n: 0 };
    let qz = { sum: 0, n: 0 };
    const people = members.map((t) => {
      const st = traineeStatusOf(t);
      const k = st?.key;
      tally[k === "pass" || k === "fail" || k === "resigned" || k === "terminated" ? k : "none"]++;
      const vals = cc.traineeSpeed(t.id).weeks.map((w) => w.value).filter((v) => v != null);
      const spd = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      if (spd != null) speed = { sum: speed.sum + spd, n: speed.n + 1 };
      const q = quiz?.[t.id];
      const qv = q?.taken ? q.weighted ?? q.avg : null;
      if (qv != null) qz = { sum: qz.sum + qv, n: qz.n + 1 };
      const qa = t.crm_name ? cc.qaSummary([t.crm_name]) : null;
      return {
        name: t.name || "",
        active: !isInactive(t),
        ts: k || "",
        auto: !!st?.auto,
        qa: qa?.total ? Math.round((qa.pass / qa.total) * 100) : null,
        speed: spd == null ? null : Math.round(spd * 10) / 10,
        quiz: qv == null ? null : Math.round(qv),
        att: window.TrainerAttendance?.points ? window.TrainerAttendance.points(c.id, t.id) : null,
        nest: t.nesting_status === "passed",
      };
    });
    const crms = members.map((t) => t.crm_name).filter(Boolean);
    const qa = crms.length ? cc.qaSummary(crms) : null;
    const g = c.team_goals || {};
    return {
      id: c.id,
      name: c.name || "",
      department: c.department || "",
      start: c.training_start_date || "",
      status: cohortStatus(c, today),
      aid: c.assignment_id || "",
      team_lead: c.team_lead || "",
      trainees: members.length,
      passed: members.filter((t) => t.nesting_status === "passed").length,
      cpTrainees: members.filter((t) => /\bcp\b/i.test(t.department || "")).length,
      cpPassed: members.filter((t) => /\bcp\b/i.test(t.department || "") && t.nesting_status === "passed").length,
      cpActive: members.filter((t) => /\bcp\b/i.test(t.department || "") && !isInactive(t)).length,
      active: members.filter((t) => !isInactive(t)).length,
      inactive: members.filter(isInactive).length,
      ...tally,
      qa: { pass: Math.round((qa?.pass || 0) * 100) / 100, total: qa?.total || 0 },
      speed: { sum: Math.round(speed.sum * 100) / 100, n: speed.n },
      quiz: { sum: Math.round(qz.sum * 100) / 100, n: qz.n },
      goals: { qa: goal(g.qa), quiz: goal(g.quiz), speed: goal(g.speed), attendance: g.attendance === "" || g.attendance == null ? null : Number(g.attendance) },
      people,
    };
  });
  return { cohorts: rows, overdue: window.TrainerNotion?.overdueCount?.() || 0 };
}
async function publishSummary() {
  const WS = window.TrainerWS;
  const cc = window.CoachingCompass;
  if (!WS?.id || WS.readOnly || !cc || summaryRunning) return;
  summaryRunning = true;
  try {
    const summary = await buildSummary();
    const json = JSON.stringify(summary);
    if (json === summaryLast) return;
    const db = await window.TrainerUse("db");
    if (!db) return;
    const fields = { id: WS.id, base: WS.isOwner ? "root" : "own", summary, summary_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    await db.doc(`trainers/${WS.id}`).update(fields).catch(() => db.doc(`trainers/${WS.id}`).set(fields));
    summaryLast = json;
  } catch {
  } finally {
    summaryRunning = false;
  }
}
function scheduleSummary(ms = 15000) {
  clearTimeout(summaryTimer);
  summaryTimer = setTimeout(publishSummary, ms);
}
(function startSummary() {
  const t = setInterval(() => {
    if (!window.CoachingCompass || !window.TrainerWS) return;
    clearInterval(t);
    window.CoachingCompass.onChange(() => scheduleSummary());
    window.TrainerWS.ready.then(() => scheduleSummary(20000));
    setInterval(publishSummary, 5 * 60 * 1000);
  }, 500);
})();

// ---- Classes the Training Manager created for this Trainer land in their Cohorts (once each) ----
let importRunning = false;
async function importAssignments() {
  const WS = window.TrainerWS;
  const cc = window.CoachingCompass;
  const TM = window.TrainerManager;
  if (!WS?.id || WS.readOnly || !cc || !TM || importRunning || WS.role === "manager") return;
  const list = TM.assignmentsFor(WS.id);
  if (!list.length) return;
  importRunning = true;
  try {
    const db = await window.TrainerUse("db");
    const ref = db.doc("settings/imported_assignments");
    const snap = await ref.get();
    const done = new Set((snap.exists && snap.data()?.ids) || []);
    const mine = cc.data().cohorts;
    let changed = false;
    for (const a of list) {
      const local = mine.find((c) => c.assignment_id === a.id);
      const fields = { name: a.name || "", department: a.department || "", team_lead: a.team_lead || "", training_start_date: a.training_start_date || "" };
      if (local) {
        if (Object.keys(fields).some((k) => (local[k] || "") !== fields[k])) await cc.updateCohort(local.id, fields).catch(() => {});
        await syncAssignedTrainees(a, local);
      } else if (!done.has(a.id)) {
        const ref = await cc.addCohort({ ...fields, assignment_id: a.id });
        done.add(a.id);
        changed = true;
        if (ref?.id) await syncAssignedTrainees(a, { id: ref.id, trainee_ids: [] });
      }
    }
    if (changed) {
      await ref.set({ ids: [...done], updated_at: new Date().toISOString() });
      setTimeout(importAssignments, 3500); // once the new cohort has loaded, bring its trainees in
    }
  } catch {
  } finally {
    importRunning = false;
  }
}
// The trainees the manager put in a class become roster trainees in this Trainer's cohort (created once, matched by roster_ref).
const createdTrainees = {}; // roster id -> local trainee id, for this visit
async function syncAssignedTrainees(a, cohort) {
  const cc = window.CoachingCompass;
  const want = a.trainees || [];
  const locals = cc.data().trainees;
  const ids = [];
  for (const w of want) {
    const found = locals.find((x) => x.roster_ref === w.rid);
    if (found) ids.push(found.id);
    else if (createdTrainees[w.rid]) ids.push(createdTrainees[w.rid]);
    else {
      const id = await cc.addTrainee({ name: w.name || "", email: w.email || "", crm_name: w.crm_name || "", department: w.department || "", team_lead: w.team_lead || "", roster_ref: w.rid, assignment_id: a.id }).catch(() => null);
      if (id) {
        createdTrainees[w.rid] = id;
        ids.push(id);
      }
    }
  }
  const cur = cohort.trainee_ids || [];
  const fromThisClass = new Set(locals.filter((x) => x.assignment_id === a.id).map((x) => x.id));
  // Trainees the Trainer added themselves stay; ones that came with this class follow the manager's list.
  const next = [...new Set([...cur.filter((id) => !fromThisClass.has(id)), ...ids])];
  if (next.length !== cur.length || next.some((id) => !cur.includes(id))) await cc.setCohortTrainees(cohort.id, next).catch(() => {});
}
(function startImport() {
  const t = setInterval(() => {
    if (!window.CoachingCompass || !window.TrainerManager || !window.TrainerWS) return;
    clearInterval(t);
    window.TrainerWS.ready.then(() => {
      window.TrainerManager.start();
      // Give the cohort list a moment to load first, so a class isn't imported twice.
      let timer = setTimeout(importAssignments, 4000);
      window.TrainerManager.onChange(() => {
        clearTimeout(timer);
        timer = setTimeout(importAssignments, 4000);
      });
    });
  }, 500);
})();

// "Set Trainee Status" (trainee ⋮ menu): choose Auto, or set the status by hand.
function openTraineeStatus(content, traineeId) {
  const win = content.closest(".window");
  if (win.querySelector(".sheet")) return;
  const cc = window.CoachingCompass;
  const { trainees, cohorts } = cc.data();
  const t = trainees.find((x) => x.id === traineeId);
  if (!t) return;
  const cohort = cohorts.find((c) => (c.trainee_ids || []).includes(traineeId));
  const cur = t.trainee_status?.mode === "manual" && t.trainee_status.value ? t.trainee_status.value : "auto";
  const a = autoCache[t.id];
  const autoNote = !cohort || !hasGoals(cohort)
    ? "Set Team Goals on the cohort (its ⋮ menu) to turn this on."
    : a?.status
      ? `Right now: <b>${escapeHtml(statusLabel(a.status))}</b>. ${a.checks.map((c) => `${escapeHtml(c.label)} ${fmtNum(c.value)}${c.unit === "%" ? "%" : ""} (goal ${c.dir === "min" ? "at least" : "at most"} ${fmtNum(c.goal)}) ${c.met ? "✓" : "✗"}`).join(" · ")}`
      : "Not enough data yet for any of the goals that are set.";
  const sheet = document.createElement("div");
  sheet.className = "sheet";
  sheet.innerHTML = `
    <form class="sheet-card" novalidate>
      <h3>Set Trainee Status · ${escapeHtml(t.name)}</h3>
      <div class="pick-list">
        <label class="pick"><input type="radio" name="ts" value="auto"${cur === "auto" ? " checked" : ""} /><span>Auto<small>${autoNote}</small></span></label>
        ${TRAINEE_STATUSES.map((o) => `<label class="pick"><input type="radio" name="ts" value="${o.key}"${cur === o.key ? " checked" : ""} /><span>${escapeHtml(o.label)}<small>Set by hand</small></span></label>`).join("")}
      </div>
      <p class="sheet-status" role="status"></p>
      <div class="sheet-actions"><button type="button" class="btn" data-cancel>Cancel</button><button type="submit" class="btn-primary">Save</button></div>
    </form>`;
  win.appendChild(sheet);
  const close = () => sheet.remove();
  sheet.querySelector("[data-cancel]").addEventListener("click", close);
  sheet.addEventListener("keydown", (e) => e.key === "Escape" && close());
  sheet.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = sheet.querySelector("input[name=ts]:checked")?.value || "auto";
    const status = sheet.querySelector(".sheet-status");
    status.textContent = "Saving…";
    cc.updateTrainee(t.id, { trainee_status: v === "auto" ? { mode: "auto", value: "" } : { mode: "manual", value: v } })
      .then(() => {
        close();
        refreshAutoStatuses(true);
      })
      .catch(() => (status.textContent = "Couldn't save. Try again."));
  });
  sheet.querySelector("input:checked")?.focus();
}

// "Set Team Goals" (cohort ⋮ menu): the goals the automatic status measures trainees against. Blank means not used.
function openTeamGoals(content, cohortId) {
  const win = content.closest(".window");
  if (win.querySelector(".sheet")) return;
  const cc = window.CoachingCompass;
  const c = cc.data().cohorts.find((x) => x.id === cohortId);
  if (!c) return;
  const g = c.team_goals || {};
  const sheet = document.createElement("div");
  sheet.className = "sheet";
  sheet.innerHTML = `
    <form class="sheet-card" novalidate>
      <h3>Set Team Goals · ${escapeHtml(c.name)}</h3>
      <p class="muted goals-help">Trainees are projected to pass when they meet every goal below that has data; one miss projects a fail. Leave a goal blank to skip it.</p>
      ${GOAL_DEFS.map((d) => `<label class="field"><span>${escapeHtml(d.label)} <small class="muted">${escapeHtml(d.unit)}</small></span><input type="number" step="any" min="0" name="${d.key}" value="${g[d.key] === "" || g[d.key] == null ? "" : escapeHtml(g[d.key])}" placeholder="${escapeHtml(d.hint)}" /></label>`).join("")}
      <p class="sheet-status" role="status"></p>
      <div class="sheet-actions"><button type="button" class="btn" data-cancel>Cancel</button><button type="submit" class="btn-primary">Save goals</button></div>
    </form>`;
  win.appendChild(sheet);
  const close = () => sheet.remove();
  sheet.querySelector("[data-cancel]").addEventListener("click", close);
  sheet.addEventListener("keydown", (e) => e.key === "Escape" && close());
  sheet.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const goals = {};
    GOAL_DEFS.forEach((d) => {
      const raw = sheet.querySelector(`[name=${d.key}]`).value.trim();
      goals[d.key] = raw === "" || isNaN(Number(raw)) ? "" : Number(raw);
    });
    const status = sheet.querySelector(".sheet-status");
    status.textContent = "Saving…";
    cc.updateCohort(c.id, { team_goals: goals })
      .then(() => {
        close();
        refreshAutoStatuses(true);
      })
      .catch(() => (status.textContent = "Couldn't save. Try again."));
  });
  sheet.querySelector("input")?.focus();
}

function traineeGroupsHtml(c, members) {
  const item = (t) => {
    const active = !isInactive(t);
    return `<li class="${active ? "" : "is-inactive"}">
      <span>${escapeHtml(t.name)} ${statusBadgeHtml(t)}<small>${escapeHtml(t.crm_name || "No CRM name")}</small></span>
      <span class="member-actions">
        <button type="button" class="status-pill${active ? " on" : ""}" data-toggle-active="${escapeHtml(t.id)}" aria-pressed="${active}" title="${active ? "Click to set Inactive" : "Click to set Active"}">${active ? "Active" : "Inactive"}</button>
        <button type="button" class="outline-btn" data-performance="${escapeHtml(t.id)}">Performance</button>
        <button type="button" class="outline-btn" data-notes="${escapeHtml(t.id)}">Notes &amp; Feedback</button>
        <button type="button" class="square-btn kebab" title="More options" aria-label="Options for ${escapeHtml(t.name)}" data-trainee-menu="${escapeHtml(c.id)}|${escapeHtml(t.id)}">⋮</button>
      </span>
    </li>`;
  };
  const group = (title, list, empty) => `
    <h5>${title} <span class="muted">${list.length}</span></h5>
    ${list.length ? `<ul class="member-list">${list.map(item).join("")}</ul>` : `<p class="muted empty-group">${empty}</p>`}`;
  return (
    group("Active", members.filter((t) => !isInactive(t)), "No active trainees.") +
    group("Inactive", members.filter(isInactive), "No inactive trainees.")
  );
}

// ---- Cohort export: Performance and Notes & Feedback as two Google Sheets, all trainees ----
const cohortExport = {}; // cohortId -> { include, busy, msg } (kept across redraws)
function exportLinksHtml(c) {
  const x = c.export_sheets;
  if (!x?.performance?.url && !x?.notes?.url) return "";
  const link = (o, label) => (o?.url ? `<a href="${escapeHtml(o.url)}" target="_blank" rel="noopener noreferrer">${label}</a>` : "");
  return `${[link(x.performance, "Performance sheet"), link(x.notes, "Notes &amp; Feedback sheet")].filter(Boolean).join(" · ")} · exported ${escapeHtml(fmtStamp(x.performance?.exported_at || x.notes?.exported_at))}`;
}
function exportBarHtml(c) {
  const id = escapeHtml(c.id);
  const ex = cohortExport[c.id] || {};
  return `<div class="export-bar">
    <button type="button" class="btn btn-small" data-export-cohort="${id}"${ex.busy ? " disabled" : ""}>${ex.busy ? "Exporting…" : c.export_sheets ? "Update Google Sheets" : "Export to Google Sheets"}</button>
    <label class="check"><input type="checkbox" data-export-inactive="${id}"${ex.include ? " checked" : ""} /> Include inactive trainees</label>
    <span class="sheet-status" data-export-status="${id}" role="status">${ex.msg || exportLinksHtml(c)}</span>
  </div>`;
}
// Text a spreadsheet would read as a formula gets a leading apostrophe.
const csvCell = (v) => {
  let t = v == null ? "" : String(v);
  if (typeof v === "string" && /^[=+@]|^-(?!\d)/.test(t)) t = `'${t}`;
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
const toCsv = (rows) => rows.map((r) => r.map(csvCell).join(",")).join("\n");
const weekSort = (a, b) => {
  const x = parseFloat(a), y = parseFloat(b);
  return !isNaN(x) && !isNaN(y) ? x - y : String(a).localeCompare(String(b), undefined, { numeric: true });
};
// One trainee's saved notes, once (null when they can't be read).
const loadNotesOnce = (cc, traineeId) =>
  new Promise((resolve) => {
    let off = () => {};
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      Promise.resolve().then(() => off());
      resolve(v);
    };
    const timer = setTimeout(() => finish(null), 10000);
    off = cc.notes.subscribe(traineeId, (list) => finish(list)) || off;
  });

async function exportCohort(el, cohortId) {
  const cc = window.CoachingCompass;
  const st = (cohortExport[cohortId] = cohortExport[cohortId] || {});
  if (st.busy) return;
  const { cohorts, trainees } = cc.data();
  const c = cohorts.find((x) => x.id === cohortId);
  if (!c) return;
  const say = (msg, busy) => {
    st.msg = msg;
    st.busy = !!busy;
    el.querySelectorAll(`[data-export-status="${CSS.escape(cohortId)}"]`).forEach((n) => (n.innerHTML = msg));
    el.querySelectorAll(`[data-export-cohort="${CSS.escape(cohortId)}"]`).forEach((b) => {
      b.disabled = !!busy;
      if (busy) b.textContent = "Exporting…";
    });
  };
  const byId = new Map(trainees.map((t) => [t.id, t]));
  const members = (c.trainee_ids || []).map((id) => byId.get(id)).filter(Boolean).filter((t) => st.include || !isInactive(t));
  if (!members.length) return say("No trainees to export. Tick “Include inactive trainees” if they're all inactive.");
  say("Collecting trainee data…", true);
  try {
    const status = (t) => (isInactive(t) ? "Inactive" : "Active");
    const perf = members.map((t) => cc.traineePerformance(t.id));
    const spd = members.map((t) => cc.traineeSpeed(t.id));
    const weekSet = new Set();
    perf.forEach((p) => p.weeks.forEach((w) => weekSet.add(String(w.week))));
    spd.forEach((p) => p.weeks.forEach((w) => weekSet.add(String(w.week))));
    const weeks = [...weekSet].sort(weekSort);
    const speedLabel = "Speed";
    const pctOf = (w) => (w.total ? `${Math.round((w.pass / w.total) * 100)}%` : "");
    const head = ["Trainee", "CRM name", "Status", "Department", "Team lead", "Overall QA %", "QA audits", ...weeks.flatMap((w) => [`Week ${w} QA %`, `Week ${w} ${speedLabel} (min/ticket)`, `Week ${w} Hours`, `Week ${w} Cleared`]), `Average ${speedLabel}`];
    const perfRows = [head];
    members.forEach((t, i) => {
      const qaBy = new Map(perf[i].weeks.map((w) => [String(w.week), w]));
      const spBy = new Map(spd[i].weeks.map((w) => [String(w.week), w]));
      const all = perf[i].weeks.reduce((a, w) => ({ pass: a.pass + w.pass, total: a.total + w.total }), { pass: 0, total: 0 });
      const spVals = spd[i].weeks.map((w) => w.value).filter((v) => v != null);
      perfRows.push([
        t.name, t.crm_name || "", status(t), t.department || "", t.team_lead || "",
        pctOf(all), perf[i].weeks.reduce((n, w) => n + w.audits, 0),
        ...weeks.flatMap((w) => [qaBy.has(w) ? pctOf(qaBy.get(w)) : "", spBy.get(w)?.value != null ? Math.round(spBy.get(w).value * 100) / 100 : "", spBy.has(w) ? Math.round(spBy.get(w).hours * 100) / 100 : "", spBy.has(w) ? spBy.get(w).tickets : ""]),
        spVals.length ? Math.round((spVals.reduce((a, b) => a + b, 0) / spVals.length) * 100) / 100 : "",
      ]);
    });
    say("Collecting notes…", true);
    const noteLists = await Promise.all(members.map((t) => loadNotesOnce(cc, t.id)));
    const noteRows = [["Trainee", "CRM name", "Status", "Type", "Date", "Edited", "Note"]];
    let unreadable = 0;
    members.forEach((t, i) => {
      const list = noteLists[i];
      if (!list) return void unreadable++;
      NOTE_SPACES.forEach((sp) =>
        list.filter((n) => n.category === sp.key).forEach((n) =>
          noteRows.push([t.name, t.crm_name || "", status(t), sp.title.replace(" Notes", ""), fmtStamp(n.created_at), n.updated_at ? fmtStamp(n.updated_at) : "", n.text])
        )
      );
    });
    const stamp = new Date().toISOString();
    say("Creating the Performance sheet…", true);
    const perfDoc = await cc.exportGoogleSheet(`${c.name} — Performance`, toCsv(perfRows));
    say("Creating the Notes & Feedback sheet…", true);
    const notesDoc = await cc.exportGoogleSheet(`${c.name} — Notes & Feedback`, toCsv(noteRows));
    const prev = c.export_sheets;
    await cc
      .updateCohort(c.id, {
        export_sheets: {
          performance: { id: perfDoc.id, url: perfDoc.link, exported_at: stamp },
          notes: { id: notesDoc.id, url: notesDoc.link, exported_at: stamp },
          include_inactive: !!st.include,
        },
      })
      .catch(() => {});
    let trashNote = "";
    const old = [prev?.performance?.id, prev?.notes?.id].filter(Boolean);
    if (old.length) {
      const ok = await Promise.all(old.map((id) => cc.trashDriveFile(id).then(() => true, () => false)));
      trashNote = ok.every(Boolean) ? " Previous copies are in Drive's Trash." : " Some previous copies couldn't be moved to the trash.";
    }
    const lk = (d, label) => (d.link ? `<a href="${escapeHtml(d.link)}" target="_blank" rel="noopener noreferrer">${label}</a>` : label);
    say(`Exported ${members.length} trainee${members.length === 1 ? "" : "s"} · ${lk(perfDoc, "Performance sheet")} · ${lk(notesDoc, "Notes &amp; Feedback sheet")}${unreadable ? ` · ${unreadable} trainee${unreadable === 1 ? "'s" : "s'"} notes couldn't be read` : ""}${escapeHtml(trashNote)}`);
  } catch (e) {
    say(e?.cancelled ? "" : escapeHtml(e?.message || "Couldn't export. Try again."));
  }
}

// One cohort as a list row; open shows its schedule and roster. Cohorts and My Class both use it.
function cohortRowHtml(c, byId, today, open) {
    const s = cohortSchedule(c.training_start_date);
    const status = cohortStatus(c, today);
    const members = (c.trainee_ids || []).map((id) => byId.get(id)).filter(Boolean);
    const where =
      c.completed ? `Marked completed${c.completed_at ? ` ${fmtDate(c.completed_at.slice(0, 10))}` : ""}`
      : status === "active" ? (() => { const p = scheduleProgress(s, today); return `${p.label} · Day ${p.day} of ${TRAINING_DAYS}`; })()
      : status === "upcoming" ? `Starts ${fmtDate(s.start)}`
      : status === "completed" ? `Finished ${fmtDate(s.end)}`
      : "Set a start date to schedule it";
    return `
      <li class="cohort-row${open ? " open" : ""}">
        <div class="row-main">
          <button type="button" class="row-toggle" data-toggle-row="${escapeHtml(c.id)}" aria-expanded="${open}">
            <span class="chev" aria-hidden="true">›</span>
            <span><b>${escapeHtml(c.name)}</b><small>${escapeHtml(c.department || "No department")} · ${escapeHtml(c.team_lead || "No team lead")}</small></span>
          </button>
          <span class="row-cell">${s ? escapeHtml(fmtRange(s.start, s.end)) : "—"}</span>
          <span class="row-cell muted">${escapeHtml(where)}</span>
          <span class="row-cell">${members.length} trainee${members.length === 1 ? "" : "s"}</span>
          <span class="row-actions">
            <button type="button" class="btn btn-small" data-add-trainee="${escapeHtml(c.id)}">+ Add Trainee</button>
            <button type="button" class="btn btn-small${c.completed ? " is-done" : ""}" data-complete-cohort="${escapeHtml(c.id)}" aria-pressed="${!!c.completed}" title="${c.completed ? "Put this class back among the current ones" : "Move this class to Completed"}">${c.completed ? "Reopen" : "Mark completed"}</button>
            <button type="button" class="square-btn kebab" title="Cohort options" aria-label="Options for ${escapeHtml(c.name)}" data-cohort-menu="${escapeHtml(c.id)}">⋮</button>
          </span>
        </div>
        ${
          open
            ? `<div class="row-detail">
                ${cohortDetailHtml(c, s, members)}
                ${members.length ? exportBarHtml(c) : ""}
                ${members.length ? traineeGroupsHtml(c, members) : ""}
              </div>`
            : ""
        }
      </li>`;
}

// Buttons inside cohort rows: expand/collapse, + Add Trainee, the cohort ⋮ menu, and each
// trainee's Active, Performance, Notes & Feedback and ⋮ menu.
function wireCohortRows(el, onToggle) {
  const cc = window.CoachingCompass;
  refreshAutoStatuses();
  el.querySelectorAll("[data-toggle-row]").forEach((b) => b.addEventListener("click", () => onToggle(b.dataset.toggleRow)));
  el.querySelectorAll("[data-complete-cohort]").forEach((b) =>
    b.addEventListener("click", () => {
      const c = cc.data().cohorts.find((x) => x.id === b.dataset.completeCohort);
      if (!c) return;
      b.disabled = true;
      cc.updateCohort(c.id, c.completed ? { completed: false, completed_at: "" } : { completed: true, completed_at: new Date().toISOString() }).catch(() => (b.disabled = false));
    })
  );
  el.querySelectorAll("[data-add-trainee]").forEach((b) => b.addEventListener("click", () => openAddTrainee(el, b.dataset.addTrainee)));
  el.querySelectorAll("[data-toggle-active]").forEach((btn) =>
    btn.addEventListener("click", () => {
      btn.disabled = true;
      const makeActive = btn.getAttribute("aria-pressed") !== "true";
      cc.updateTrainee(btn.dataset.toggleActive, { cohort_status: makeActive ? "active" : "inactive" }).catch(() => (btn.disabled = false));
    })
  );
  el.querySelectorAll("[data-export-cohort]").forEach((b) => b.addEventListener("click", () => exportCohort(el, b.dataset.exportCohort)));
  el.querySelectorAll("[data-export-inactive]").forEach((b) =>
    b.addEventListener("change", () => {
      const st = (cohortExport[b.dataset.exportInactive] = cohortExport[b.dataset.exportInactive] || {});
      st.include = b.checked;
    })
  );
  el.querySelectorAll("[data-performance]").forEach((b) => b.addEventListener("click", () => openPerformance(el, b.dataset.performance)));
  el.querySelectorAll("[data-notes]").forEach((b) => b.addEventListener("click", () => openNotes(el, b.dataset.notes)));
  el.querySelectorAll("[data-trainee-menu]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const [cohortId, traineeId] = b.dataset.traineeMenu.split("|");
      openMenu(b, [
        { label: "Edit", run: () => openEditTrainee(el, traineeId) },
        { label: "Set Trainee Status", run: () => openTraineeStatus(el, traineeId) },
        {
          label: "Remove from cohort",
          danger: true,
          run: () => {
            const c = cc.data().cohorts.find((x) => x.id === cohortId);
            if (c) cc.setCohortTrainees(cohortId, (c.trainee_ids || []).filter((id) => id !== traineeId)).catch(() => {});
          },
        },
      ]);
    })
  );
  el.querySelectorAll("[data-cohort-menu]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = b.dataset.cohortMenu;
      openMenu(b, [
        { label: "Edit", run: () => openEditCohort(el, id) },
        { label: "Set Team Goals", run: () => openTeamGoals(el, id) },
        { label: "Delete", danger: true, run: () => openDeleteCohort(el, id) },
      ]);
    })
  );
}

function cohortSectionsHtml(cohorts, trainees, today, openRows) {
  if (!cohorts.length) return `<p class="muted">No cohorts yet. Use Add Class to create your first one.</p>`;
  const byId = new Map(trainees.map((t) => [t.id, t]));
  const groups = [
    { key: "active", title: "Active", sort: (a, b) => a.training_start_date.localeCompare(b.training_start_date) },
    { key: "upcoming", title: "Upcoming", sort: (a, b) => a.training_start_date.localeCompare(b.training_start_date) },
    { key: "completed", title: "Completed", sort: (a, b) => b.training_start_date.localeCompare(a.training_start_date) },
    { key: "unscheduled", title: "No start date", sort: (a, b) => a.name.localeCompare(b.name) },
  ];
  const row = (c) => cohortRowHtml(c, byId, today, openRows.has(c.id));
  return groups
    .map((g) => {
      const list = cohorts.filter((c) => cohortStatus(c, today) === g.key).sort(g.sort);
      if (!list.length && g.key === "unscheduled") return "";
      return `<section class="cohort-section">
        <h4>${g.title} <span class="muted">${list.length}</span></h4>
        ${list.length ? `<ul class="cohort-list">${list.map(row).join("")}</ul>` : `<p class="muted empty">No ${g.title.toLowerCase()} cohorts.</p>`}
      </section>`;
    })
    .join("");
}

// "+ Add Trainee" sheet: pick trainees from Settings → Roster. A trainee can be in only one cohort,
// so anyone already in a cohort is shown but can't be picked.
function openAddTrainee(content, cohortId) {
  const win = content.closest(".window");
  if (win.querySelector(".sheet")) return;
  const cc = window.CoachingCompass;
  const { cohorts, trainees } = cc.data();
  const cohort = cohorts.find((c) => c.id === cohortId);
  if (!cohort) return;
  const owner = new Map();
  cohorts.forEach((c) => (c.trainee_ids || []).forEach((id) => owner.set(id, c)));
  const candidates = trainees.filter((t) => owner.get(t.id)?.id !== cohort.id);
  const sheet = document.createElement("div");
  sheet.className = "sheet";
  sheet.innerHTML = `
    <form class="sheet-card" novalidate>
      <h3>Add trainees to ${escapeHtml(cohort.name)}</h3>
      ${
        candidates.length
          ? `<div class="pick-list">${candidates
              .map((t) => {
                const taken = owner.get(t.id);
                return `<label class="pick${taken ? " taken" : ""}"><input type="checkbox" value="${escapeHtml(t.id)}"${taken ? " disabled" : ""} />
                  <span>${escapeHtml(t.name)}<small>${taken ? `Already in ${escapeHtml(taken.name)}` : escapeHtml(t.department || "No department")}</small></span></label>`;
              })
              .join("")}</div>`
          : `<p class="muted">${trainees.length ? "Everyone on the roster is already in this cohort." : "Add trainees in Settings → Roster first."}</p>`
      }
      <p class="sheet-status" id="at-status" role="status"></p>
      <div class="sheet-actions">
        <button type="button" class="btn" data-cancel>Cancel</button>
        <button type="submit" class="btn-primary">Add</button>
      </div>
    </form>`;
  win.appendChild(sheet);
  const close = () => sheet.remove();
  const status = sheet.querySelector("#at-status");
  sheet.querySelector("[data-cancel]").addEventListener("click", close);
  sheet.addEventListener("keydown", (e) => e.key === "Escape" && close());
  sheet.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const picked = [...sheet.querySelectorAll("input:checked")].map((i) => i.value);
    if (!picked.length) {
      status.textContent = "Pick at least one trainee.";
      return;
    }
    status.textContent = "Saving…";
    cc.setCohortTrainees(cohort.id, [...(cohort.trainee_ids || []), ...picked])
      .then(close)
      .catch((err) => (status.textContent = err?.message || "Couldn't add those trainees. Try again."));
  });
  sheet.querySelector("input:not([disabled]), button")?.focus();
}

// Copy rows to the clipboard as tab-separated text, ready to paste into Google Sheets or Excel.
const tsvCell = (v) => {
  const t = v == null ? "" : String(v);
  return /[\t\n\r"]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
const toTsv = (rows) => rows.map((r) => r.map(tsvCell).join("\t")).join("\n");
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {}
    ta.remove();
    return ok;
  }
}

// Performance: a full page in the window (not a floating dialog), with the trainee's two views:
// QA (saved QA weeks from Coaching: overall score, a score per week, coaching talking points and
// markdowns) and Speed (the weekly Speed number from Settings → Speed Productivity Sheet).
// Breadcrumbs: Trainer Desk › Cohorts › cohort › trainee › Performance › QA | Speed.
function openPerformance(content, traineeId) {
  const win = content.closest(".window");
  if (win.querySelector(".sheet")) return;
  const cc = window.CoachingCompass;
  const appId = win.dataset.app;
  const view = { week: null, tab: "talking", mode: "qa", quiz: null, copyMsg: "" };
  const sheet = document.createElement("div");
  sheet.className = "sheet page";
  sheet.innerHTML = `<div class="sheet-card perf-card" role="region" aria-label="Performance"></div>`;
  win.appendChild(sheet);
  const card = sheet.querySelector(".sheet-card");
  const pct = (w) => (w.total ? `${Math.round((w.pass / w.total) * 100)}%` : "—");
  const num = (v) => String(Math.round(v * 100) / 100);
  const cohortOf = () => cc.data().cohorts.find((c) => (c.trainee_ids || []).includes(traineeId));
  const savedCrumbs = crumbState[appId]?.items || [];
  const modeLabel = () => (view.mode === "speed" ? "Speed" : view.mode === "quiz" ? "Quiz" : view.mode === "spot" ? "Spot Check" : "QA");

  const qaBody = (p) => {
    const weeks = p.weeks;
    if (!weeks.some((w) => w.week === view.week)) view.week = weeks[0]?.week ?? null;
    const w = weeks.find((x) => x.week === view.week);
    const all = weeks.reduce((a, x) => ({ pass: a.pass + x.pass, total: a.total + x.total }), { pass: 0, total: 0 });
    if (!weeks.length && !p.loaded) return `<p class="muted">Loading saved QA weeks…</p>`;
    if (!weeks.length)
      return `<p class="muted">No saved QA weeks for ${escapeHtml(p.name)} yet${p.crm ? ` (CRM name “${escapeHtml(p.crm)}”)` : ""}. In Metrics and Coaching, request this trainee's cohort in QA Data Request and save the week.${p.crm ? "" : " Add their CRM name in Settings → Roster so their audits can be matched."}</p>`;
    return `
      <div class="perf-head">
        <div class="perf-summary">
          <div class="stat"><div class="value">${pct(all)}</div><div class="label">Overall QA score</div><div class="hint">${all.total ? `${Math.round(all.pass * 100) / 100} of ${all.total} audits passed` : "No Pass/Fail scores"}</div></div>
          <div class="stat"><div class="value">${weeks.length}</div><div class="label">Week${weeks.length === 1 ? "" : "s"} saved</div><div class="hint">Latest: Week ${escapeHtml(weeks[0].week)}</div></div>
          <div class="stat"><div class="value">${weeks.reduce((n, x) => n + x.audits, 0)}</div><div class="label">Audits</div></div>
        </div>
        <div class="perf-weeks" role="tablist" aria-label="Weeks">${weeks
          .map((x) => `<button type="button" role="tab" class="pill${x.week === view.week ? " on" : ""}" aria-selected="${x.week === view.week}" data-week="${escapeHtml(x.week)}">Week ${escapeHtml(x.week)} <b>${pct(x)}</b></button>`)
          .join("")}</div>
        <p class="muted perf-meta">Week ${escapeHtml(w.week)} · ${escapeHtml(w.source)} · ${w.audits} audit${w.audits === 1 ? "" : "s"}${w.analyzed ? "" : " · not analyzed yet"}</p>
        <div class="perf-tabs">
          <button type="button" class="pill${view.tab === "talking" ? " on" : ""}" data-tab="talking">Coaching talking points</button>
          <button type="button" class="pill${view.tab === "markdowns" ? " on" : ""}" data-tab="markdowns">Markdowns</button>
        </div>
      </div>
      <div class="cc-ui perf-detail">${view.tab === "talking" ? w.talkingHtml : w.markdownsHtml}</div>`;
  };

  const speedBody = (sp) => {
    if (!sp.configured)
      return `<p class="muted">No Speed sheet is set up yet. Add its Google Sheet link in Settings → Speed Productivity Sheet.</p>`;
    if (!sp.weeks.length)
      return `<p class="muted">${sp.pulled ? `No Speed days for ${escapeHtml(sp.name)} in the weeks pulled so far${sp.crm ? ` (CRM name “${escapeHtml(sp.crm)}”)` : ""}.${sp.crm ? "" : " Add their CRM name in Settings → Roster so their rows can be matched."}` : "No Speed weeks pulled yet. Pull a week in Metrics and Coaching → Speed."}</p>`;
    if (!sp.weeks.some((x) => x.week === view.sweek)) view.sweek = sp.weeks[0].week;
    const w = sp.weeks.find((x) => x.week === view.sweek);
    const vals = sp.weeks.map((x) => x.value).filter((v) => v != null);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        const day = (d) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || "");
      return m ? new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : d || "—";
    };
    const max = Math.max(...w.days.map((x) => x.speed || 0), 0) || 1;
    return `
      <div class="perf-head">
        <div class="perf-summary">
          <div class="stat"><div class="value">${w.value == null ? "—" : num(w.value)}</div><div class="label">Week ${escapeHtml(w.week)} speed</div><div class="hint">${num(w.hours)} hrs · ${num(w.tickets)} cleared${w.left != null ? (w.left === 0 ? " · goal met" : ` · need ${w.left} more`) : ""}</div></div>
          <div class="stat"><div class="value">${avg == null ? "—" : num(avg)}</div><div class="label">Average across weeks</div><div class="hint">${sp.weeks.length} week${sp.weeks.length === 1 ? "" : "s"} pulled</div></div>
          <div class="stat"><div class="value">${sp.goal ? num(sp.goal) : "—"}</div><div class="label">Team goal (min/ticket)</div><div class="hint">${sp.goal ? "Lower is faster" : "Set it in Metrics and Coaching → Speed"}</div></div>
        </div>
        <div class="perf-weeks" role="tablist" aria-label="Weeks">${sp.weeks
          .map((x) => `<button type="button" role="tab" class="pill${x.week === view.sweek ? " on" : ""}" aria-selected="${x.week === view.sweek}" data-sweek="${escapeHtml(x.week)}">Week ${escapeHtml(x.week)} <b>${x.value == null ? "—" : num(x.value)}</b></button>`)
          .join("")}</div>
      </div>
      <div class="perf-detail"><table class="speed-weeks"><thead><tr><th>Day</th><th>Speed</th><th>Hours</th><th>Cleared</th>${sp.goal ? "<th>Still needed</th>" : ""}<th aria-hidden="true"></th></tr></thead><tbody>${w.days
        .map((x) => `<tr><td>${escapeHtml(day(x.date))}</td><td><b>${x.speed == null ? "—" : num(x.speed)}</b></td><td>${x.hours == null ? "—" : num(x.hours)}${x.manual ? " <small class=\"muted\">edited</small>" : ""}</td><td>${x.tickets == null ? "—" : num(x.tickets)}</td>${sp.goal ? `<td class="${x.left > 0 ? "need-short" : ""}">${x.left == null ? "—" : x.left === 0 ? "Met" : x.left}</td>` : ""}<td><span class="speed-bar-fill" style="width:${Math.max(2, Math.round(((x.speed || 0) / max) * 100))}%"></span></td></tr>`)
        .join("")}</tbody></table></div>`;
  };

  const spotBody = () => {
    const sc = cc.traineeSpot(traineeId);
    if (!sc.count) return `<p class="muted">No spot checks recorded for ${escapeHtml(sc.name)} yet. Record one in Metrics and Coaching → Spot Check.</p>`;
    const d = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "");
    const link = (u) => (/^https?:\/\//i.test(u) ? `<a href="${escapeHtml(u)}" target="_blank" rel="noopener">Open ticket</a>` : escapeHtml(u));
    return `
      <div class="perf-head"><div class="perf-summary">
        <div class="stat"><div class="value">${sc.avg == null ? "—" : `${num(sc.avg)}%`}</div><div class="label">Average score</div><div class="hint">${sc.count} spot check${sc.count === 1 ? "" : "s"}</div></div>
        <div class="stat"><div class="value">${num(Number(sc.checks[0].score))}%</div><div class="label">Latest score</div><div class="hint">${escapeHtml(d(sc.checks[0].created_at))}</div></div>
      </div></div>
      <div class="perf-detail"><table class="speed-weeks"><thead><tr><th>Date</th><th>Score</th><th>Ticket</th><th>Comms</th><th>Resolution</th></tr></thead><tbody>${sc.checks
        .map((x) => `<tr><td>${escapeHtml(d(x.created_at))}</td><td><b>${num(Number(x.score))}%</b></td><td>${link(x.ticket)}</td><td>${escapeHtml(x.comms)}</td><td>${escapeHtml(x.resolution)}</td></tr>`)
        .join("")}</tbody></table></div>`;
  };

  const quizBody = () => {
    const q = view.quiz;
    if (!window.TrainerQuiz) return `<p class="muted">Quiz isn't available right now.</p>`;
    if (!q || q.loading) return `<p class="muted">Loading quiz scores…</p>`;
    if (q.error) return `<p class="muted">Couldn't load quiz scores. Try Refresh.</p>`;
    const d = q.data;
    if (!d.items.length) return `<p class="muted">No quizzes sent to this trainee yet. Send one from the Quiz app.</p>`;
    const missed = d.items.reduce((n, x) => n + x.missed.length, 0);
    const card = (x) => `
      <section class="quiz-perf">
        <div class="quiz-perf-head"><b>${escapeHtml(x.title)}</b>${x.type ? ` <span class="chip">${escapeHtml(x.type)}</span>` : ""}
          <span class="muted">${escapeHtml(fmtStamp(x.sent_at))}</span>
          <span class="quiz-perf-score">${x.pct == null ? `<span class="muted">${escapeHtml(x.status)}</span>` : `<b>${x.pct}%</b> <small class="muted">${x.earned}/${x.total} pts</small> ${x.pending ? `<span class="chip warn">${x.pending} to review</span>` : x.pct >= x.passing ? `<span class="chip ok">Passed</span>` : `<span class="chip bad">Below ${x.passing}%</span>`}`}</span></div>
        ${
          x.pct == null
            ? ""
            : x.missed.length
              ? `<ul class="quiz-opps">${x.missed
                  .map((m) => `<li><b>${escapeHtml(m.question)}</b><br><span class="muted">Answered:</span> ${escapeHtml(m.answer || "—")} <span class="muted">· Correct:</span> ${escapeHtml(m.correct)}</li>`)
                  .join("")}</ul>`
              : `<p class="muted">No missed questions.</p>`
        }
      </section>`;
    return `
      <div class="perf-head">
        <div class="perf-summary">
          <div class="stat"><div class="value">${d.avg == null ? "—" : `${d.avg}%`}</div><div class="label">Average quiz score</div><div class="hint">${d.taken} of ${d.sent} taken</div></div>
          <div class="stat"><div class="value">${d.weighted == null ? "—" : `${d.weighted}%`}</div><div class="label">Weighted average</div><div class="hint">by quiz type</div></div>
          <div class="stat"><div class="value">${missed}</div><div class="label">Opportunities</div><div class="hint">questions missed</div></div>
        </div>
        <div class="perf-tabs"><button type="button" class="btn btn-small" data-quiz-refresh>↻ Refresh</button></div>
      </div>
      <div class="perf-detail">${summaryHtml(d)}${d.items.map(card).join("")}</div>`;
  };
  // Scores by quiz type, in the order taken. A weekly quiz always has two slots; short quizzes have no fixed count.
  const summaryHtml = (d) => {
    const cellFor = (x) => (x ? `<td class="${x.pct >= x.passing ? "q-ok" : "q-bad"}" title="${escapeHtml(x.title)} · ${escapeHtml(fmtStamp(x.sent_at))}"><b>${x.pct}%</b></td>` : `<td class="muted">—</td>`);
    const groups = [...(d.types || []), { id: "", name: "No type", weight: null }];
    // One table per type so the weekly quiz keeps its two slots while short quizzes grow.
    const per = groups
      .map((t) => {
        const scores = d.items.filter((x) => x.pct != null && (x.typeId || "") === t.id).sort((a, b) => (a.sent_at || "").localeCompare(b.sent_at || ""));
        if (!t.id && !scores.length) return "";
        const weekly = /weekly/i.test(`${t.id} ${t.name}`);
        const slots = weekly ? Math.max(2, scores.length) : Math.max(1, scores.length);
        const avg = scores.length ? Math.round(scores.reduce((a, x) => a + x.pct, 0) / scores.length) : null;
        const heads = Array.from({ length: slots }, (_, i) => `<th>${weekly ? `Week ${i + 1}` : `Quiz ${i + 1}`}</th>`).join("");
        const cells = Array.from({ length: slots }, (_, i) => cellFor(scores[i])).join("");
        return `<table class="quiz-summary"><thead><tr><th>${escapeHtml(t.name)}${t.weight ? ` <small class="muted">${t.weight}% of weighted</small>` : ""}</th>${heads}<th>Average</th></tr></thead><tbody><tr><th scope="row">Score</th>${cells}<td class="q-avg">${avg == null ? "—" : `<b>${avg}%</b>`}</td></tr></tbody></table>`;
      })
      .join("");
    return `<section class="quiz-summary-wrap"><h4>Score summary</h4>${per}<p class="muted quiz-summary-foot">Weighted average: <b>${d.weighted == null ? "—" : `${d.weighted}%`}</b>. Green is at or above the quiz's passing score. Hover a score for the quiz name and date.</p></section>`;
  };
  const loadQuiz = () => {
    if (!window.TrainerQuiz || view.quiz?.loading) return;
    view.quiz = { loading: true };
    window.TrainerQuiz.traineeResults(traineeId).then(
      (data) => (view.quiz = { data }),
      () => (view.quiz = { error: true })
    ).finally(() => sheet.isConnected && draw());
  };
  // The current view as rows for pasting into a sheet.
  const copyRows = () => {
    const p = cc.traineePerformance(traineeId);
    const name = p.name;
    if (view.mode === "speed") {
      const sp = cc.traineeSpeed(traineeId);
      const rows = [["Trainee", "Week", "Day", "Speed (min/ticket)", "Hours", "Cleared tickets", "Tickets needed for goal", "Still needed"]];
      sp.weeks.slice().reverse().forEach((w) => w.days.forEach((x) => rows.push([name, w.week, x.date, x.speed == null ? "" : num(x.speed), x.hours ?? "", x.tickets ?? "", x.need ?? "", x.left ?? ""])));
      return rows;
    }
    if (view.mode === "spot") {
      const rows = [["Trainee", "Date", "Ticket", "Feedback on Comms", "Feedback on Resolution", "Score %"]];
      cc.traineeSpot(traineeId).checks.slice().reverse().forEach((x) => rows.push([name, (x.created_at || "").slice(0, 10), x.ticket, x.comms, x.resolution, x.score]));
      return rows;
    }
    if (view.mode === "quiz") {
      const d = view.quiz?.data;
      const rows = [["Trainee", "Quiz", "Type", "Sent", "Status", "Score %", "Points", "Opportunities (missed questions)"]];
      (d?.items || []).forEach((x) => rows.push([name, x.title, x.type, fmtStamp(x.sent_at), x.status, x.pct ?? "", x.pct == null ? "" : `${x.earned}/${x.total}`, x.missed.map((m) => m.question).join(" | ")]));
      return rows;
    }
    const rows = [["Trainee", "Week", "Source", "Audits", "Passed", "Scored", "QA %"]];
    p.weeks.slice().reverse().forEach((w) => rows.push([name, w.week, w.source, w.audits, Math.round(w.pass * 100) / 100, w.total, w.total ? Math.round((w.pass / w.total) * 100) : ""]));
    return rows;
  };
  const copyView = async () => {
    const rows = copyRows();
    if (rows.length < 2) view.copyMsg = "Nothing to copy yet.";
    else view.copyMsg = (await copyText(toTsv(rows))) ? `Copied ${rows.length - 1} row${rows.length === 2 ? "" : "s"}. Paste into a sheet.` : "Couldn't copy. Your browser blocked the clipboard.";
    const out = card.querySelector("[data-copy-msg]");
    if (out) out.textContent = view.copyMsg;
    setTimeout(() => {
      view.copyMsg = "";
      const o = card.querySelector("[data-copy-msg]");
      if (o) o.textContent = "";
    }, 5000);
  };

  const draw = () => {
    const p = cc.traineePerformance(traineeId);
    const body = !p.name
      ? `<p class="muted">This trainee is no longer on the roster.</p>`
      : view.mode === "speed" ? speedBody(cc.traineeSpeed(traineeId)) : view.mode === "quiz" ? quizBody() : view.mode === "spot" ? spotBody() : qaBody(p);
    card.innerHTML = `
      <div class="perf-title"><h3 data-crumb="${modeLabel()}">Performance${p.name ? ` · ${escapeHtml(p.name)}` : ""}</h3>
        <span class="sheet-status" data-copy-msg role="status">${escapeHtml(view.copyMsg)}</span>
        <button type="button" class="btn" data-copy-view title="Copy this view as rows to paste into a sheet">Copy</button>
        <button type="button" class="btn" data-cancel>← Back</button></div>
      <div class="perf-modes" role="tablist" aria-label="Performance view">
        <button type="button" role="tab" class="pill${view.mode === "qa" ? " on" : ""}" aria-selected="${view.mode === "qa"}" data-mode="qa">QA</button>
        <button type="button" role="tab" class="pill${view.mode === "speed" ? " on" : ""}" aria-selected="${view.mode === "speed"}" data-mode="speed">Speed</button>
        <button type="button" role="tab" class="pill${view.mode === "quiz" ? " on" : ""}" aria-selected="${view.mode === "quiz"}" data-mode="quiz">Quiz</button>
        <button type="button" role="tab" class="pill${view.mode === "spot" ? " on" : ""}" aria-selected="${view.mode === "spot"}" data-mode="spot">Spot Check</button>
      </div>
      ${body}`;
    // The cohort, the trainee and the page are crumbs ahead of the QA / Speed view.
    const cohort = cohortOf();
    setCrumbs(appId, [...(cohort ? [{ label: cohort.name }] : []), { label: p.name || "Trainee" }, { label: "Performance" }]);
  };

  const unsubscribe = cc.onChange(() => sheet.isConnected && draw());
  const close = () => {
    unsubscribe();
    sheet.remove();
    setCrumbs(appId, savedCrumbs);
  };
  card.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.week) view.week = b.dataset.week;
    else if (b.dataset.tab) view.tab = b.dataset.tab;
    else if (b.dataset.mode) {
      view.mode = b.dataset.mode;
      if (view.mode === "quiz" && !view.quiz) loadQuiz();
    } else if ("copyView" in b.dataset) return void copyView();
    else if ("quizRefresh" in b.dataset) {
      view.quiz = null;
      loadQuiz();
    }
    else if (b.dataset.sweek) view.sweek = b.dataset.sweek;
    else if ("cancel" in b.dataset) return close();
    else return;
    draw();
    const key = b.dataset.week ? "week" : b.dataset.tab ? "tab" : b.dataset.sweek ? "sweek" : "mode";
    card.querySelector(`[data-${key}="${CSS.escape(b.dataset[key])}"]`)?.focus();
  });
  sheet.addEventListener("keydown", (e) => e.key === "Escape" && close());
  draw();
  card.querySelector("[data-cancel]").focus();
}

// Notes & Feedback: three spaces (Coaching, Behavioral, Performance) where notes are typed in
// by hand. Each post is saved with the time it was added, newest first.
const NOTE_SPACES = [
  { key: "coaching", title: "Coaching Notes", placeholder: "What you coached, agreed next steps…" },
  { key: "behavioral", title: "Behavioral Notes", placeholder: "Attendance, attitude, conduct…" },
  { key: "performance", title: "Performance Notes", placeholder: "QA, speed, targets, progress…" },
];
const fmtStamp = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

function openNotes(content, traineeId) {
  const win = content.closest(".window");
  if (win.querySelector(".sheet")) return;
  const cc = window.CoachingCompass;
  const t = cc.data().trainees.find((x) => x.id === traineeId);
  if (!t) return;
  let notes = undefined; // undefined: loading, null: couldn't load
  const sheet = document.createElement("div");
  sheet.className = "sheet";
  sheet.innerHTML = `
    <div class="sheet-card notes-card" role="dialog" aria-label="Notes and feedback for ${escapeHtml(t.name)}">
      <h3>Notes &amp; Feedback · ${escapeHtml(t.name)}</h3>
      <div class="notes-tabs" role="tablist" aria-label="Note type">${NOTE_SPACES.map(
        (sp, i) => `<button type="button" role="tab" id="nt-${sp.key}" aria-controls="np-${sp.key}" data-tab="${sp.key}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${sp.title} <span class="tab-count" data-tab-count="${sp.key}"></span></button>`
      ).join("")}</div>
      <div class="notes-spaces">${NOTE_SPACES.map(
        (sp, i) => `
        <section class="note-space" data-space="${sp.key}" role="tabpanel" id="np-${sp.key}" aria-labelledby="nt-${sp.key}"${i === 0 ? "" : " hidden"}>
          <textarea rows="3" placeholder="${escapeHtml(sp.placeholder)}" aria-label="New ${escapeHtml(sp.title.toLowerCase())}"></textarea>
          <div class="note-add"><span class="sheet-status" role="status"></span><button type="button" class="btn-primary btn-small" data-add>Add note</button></div>
          <ul class="note-list" aria-label="${escapeHtml(sp.title)}"></ul>
        </section>`
      ).join("")}</div>
      <div class="sheet-actions notes-actions">
        <button type="button" class="btn" data-export-doc>Export to Google Docs</button>
        <button type="button" class="btn" data-copy-notes title="Copy all notes as rows to paste into a sheet">Copy</button>
        <span class="sheet-status" data-export-status role="status"></span>
        <button type="button" class="btn" data-cancel>Close</button>
      </div>
    </div>`;
  win.appendChild(sheet);

  // Auto-save: whatever is typed in a box (and a note being edited) is kept as a draft in this
  // browser and put back the next time this trainee's notes are opened. A draft only becomes a
  // note on Add note / Save.
  const DRAFT_KEY = `trainer.noteDrafts.${traineeId}`;
  const drafts = (() => {
    try {
      return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") || {};
    } catch {
      return {};
    }
  })();
  let draftTimer = null;
  const writeDrafts = () => {
    clearTimeout(draftTimer);
    draftTimer = null;
    try {
      const keep = Object.fromEntries(Object.entries(drafts).filter(([, v]) => (typeof v === "string" ? v.trim() : v?.text?.trim())));
      if (Object.keys(keep).length) localStorage.setItem(DRAFT_KEY, JSON.stringify(keep));
      else localStorage.removeItem(DRAFT_KEY);
      return true;
    } catch {
      return false;
    }
  };
  const draftNote = (box, text) => {
    const out = box?.querySelector(".note-add .sheet-status");
    if (out) out.textContent = text;
  };
  // Saves shortly after typing pauses, and right away when the panel closes.
  const queueDraft = (box) => {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      const ok = writeDrafts();
      if (box) draftNote(box, ok ? `Draft saved · ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Couldn't save a draft in this browser.");
    }, 600);
  };
  NOTE_SPACES.forEach((sp) => {
    const box = sheet.querySelector(`[data-space="${sp.key}"]`);
    if (typeof drafts[sp.key] === "string" && drafts[sp.key]) {
      box.querySelector("textarea").value = drafts[sp.key];
      draftNote(box, "Draft restored");
    }
  });
  let editRestored = false; // an unsaved edit is reopened once, when the notes first load

  // A note's ⋮ menu offers Edit (in place), Send to trainee on Slack (coaching notes; previewed
  // first) and Delete (asks first, in place).
  let editing = null; // { id, draft } while a note is being edited
  let confirming = null; // id of the note asking "Delete this note?"
  let sharing = null; // { id, draft, status } while a coaching note's Slack message is being previewed
  let hadEditFocus = false;
  // The Slack DM a coaching note becomes; shown for editing before anything is sent.
  const slackDraft = (n) => `**Coaching note — ${fmtStamp(n.created_at)}**\n\n${n.text}`;
  const noteHtml = (n) => {
    const id = escapeHtml(n.id);
    const stamp = `<time datetime="${escapeHtml(n.created_at || "")}">${escapeHtml(fmtStamp(n.created_at))}</time>${
      n.updated_at ? ` <span class="note-edited" title="Edited ${escapeHtml(fmtStamp(n.updated_at))}">· edited ${escapeHtml(fmtStamp(n.updated_at))}</span>` : ""
    }${n.slack_sent_at ? ` <span class="note-sent" title="Sent to ${escapeHtml(t.name)} on Slack">· sent on Slack ${escapeHtml(fmtStamp(n.slack_sent_at))}</span>` : ""}`;
    if (editing?.id === n.id)
      return `<li class="note editing" data-note="${id}">
        <div class="note-head"><span>${stamp}</span></div>
        <textarea class="note-edit" rows="3" aria-label="Edit note">${escapeHtml(editing.draft)}</textarea>
        <div class="note-bar"><span class="sheet-status" role="status"></span><button type="button" class="btn btn-small" data-edit-cancel>Cancel</button><button type="button" class="btn-primary btn-small" data-edit-save="${id}">Save</button></div>
      </li>`;
    return `<li class="note" data-note="${id}">
      <div class="note-head"><span>${stamp}</span>
        <button type="button" class="square-btn kebab note-menu" data-note-menu="${id}" title="Note options" aria-label="Options for this note">⋮</button></div>
      <p>${escapeHtml(n.text)}</p>
      ${
        confirming === n.id
          ? `<div class="note-bar confirm"><span>Delete this note?</span><button type="button" class="btn btn-small" data-del-cancel>Cancel</button><button type="button" class="btn-danger btn-small" data-del="${id}">Delete</button></div>`
          : ""
      }
      ${
        sharing?.id === n.id
          ? `<div class="note-share">
              <label>Direct message to ${escapeHtml(t.name)} on Slack${n.slack_sent_at ? " (already sent once; this sends it again)" : ""}
                <textarea class="note-share-text" rows="6">${escapeHtml(sharing.draft)}</textarea></label>
              <div class="note-bar"><span class="sheet-status" role="status">${escapeHtml(sharing.status || "")}</span>
                <button type="button" class="btn btn-small" data-share-cancel${sharing.busy ? " disabled" : ""}>Cancel</button>
                <button type="button" class="btn-primary btn-small" data-share-send="${id}"${sharing.busy ? " disabled" : ""}>${sharing.busy ? "Sending…" : "Send"}</button></div>
            </div>`
          : ""
      }
    </li>`;
  };

  // Only the post lists redraw, so text being typed in a box is never disturbed.
  const drawLists = () => {
    hadEditFocus = document.activeElement?.classList?.contains("note-edit") || false;
    NOTE_SPACES.forEach((sp) => {
      const box = sheet.querySelector(`[data-space="${sp.key}"]`);
      const list = box.querySelector(".note-list");
      const mine = (notes || []).filter((n) => n.category === sp.key);
      sheet.querySelector(`[data-tab-count="${sp.key}"]`).textContent = notes ? String(mine.length) : "";
      list.innerHTML =
        notes === undefined ? `<li class="muted note-empty">Loading…</li>`
        : notes === null ? `<li class="muted note-empty">Couldn't load notes. Close and open again.</li>`
        : !mine.length ? `<li class="muted note-empty">No notes yet.</li>`
        : mine.map(noteHtml).join("");
    });
    if (editing) {
      const area = sheet.querySelector(".note-edit");
      if (area && hadEditFocus) {
        area.focus();
        area.setSelectionRange(area.value.length, area.value.length);
      }
    }
  };
  let refreshExport = () => {}; // set once the export controls below are ready
  const unsubscribe = cc.notes.subscribe(traineeId, (list) => {
    notes = list;
    if (!editRestored && Array.isArray(list)) {
      editRestored = true;
      const d = drafts.edit;
      if (d?.id && list.some((n) => n.id === d.id)) editing = { id: d.id, draft: d.text };
      else delete drafts.edit;
    }
    if (sheet.isConnected) {
      drawLists();
      refreshExport();
    }
  });
  drawLists();

  const close = () => {
    if (draftTimer) writeDrafts();
    unsubscribe?.();
    offChange();
    sheet.remove();
  };
  const add = (box) => {
    const key = box.dataset.space;
    const area = box.querySelector("textarea");
    const note = box.querySelector(".sheet-status");
    const btn = box.querySelector("[data-add]");
    const text = area.value.trim();
    if (!text) {
      note.textContent = "Type a note first.";
      area.focus();
      return;
    }
    btn.disabled = true;
    note.textContent = "Saving…";
    cc.notes
      .add(traineeId, key, text)
      .then(() => {
        area.value = "";
        delete drafts[key];
        writeDrafts();
        note.textContent = "Saved ✓";
        setTimeout(() => note.textContent === "Saved ✓" && (note.textContent = ""), 2000);
      })
      .catch(() => (note.textContent = "Couldn't save. Try again."))
      .finally(() => (btn.disabled = false));
  };
  sheet.addEventListener("click", (e) => {
    if (e.target === sheet) return close();
    const b = e.target.closest("button");
    if (!b) return;
    if ("cancel" in b.dataset) return close();
    if ("add" in b.dataset) return add(b.closest(".note-space"));
    if (b.dataset.tab) return showTab(b.dataset.tab);
    if ("exportDoc" in b.dataset) return exportDoc();
    if (b.dataset.noteMenu) {
      e.stopPropagation();
      const id = b.dataset.noteMenu;
      const n = (notes || []).find((x) => x.id === id);
      if (!n) return;
      openMenu(b, [
        { label: "Edit", run: () => startEdit(n) },
        ...(n.category === "coaching" ? [{ label: "Send to trainee on Slack", run: () => startShare(n) }] : []),
        { label: "Delete", danger: true, run: () => ((confirming = id), (editing = null), (sharing = null), drawLists(), sheet.querySelector(`[data-del="${CSS.escape(id)}"]`)?.focus()) },
      ]);
      return;
    }
    if ("shareCancel" in b.dataset) {
      const id = sharing?.id;
      sharing = null;
      drawLists();
      if (id) sheet.querySelector(`[data-note-menu="${CSS.escape(id)}"]`)?.focus();
      return;
    }
    if (b.dataset.shareSend) return sendShare();
    if ("editCancel" in b.dataset) return cancelEdit();
    if (b.dataset.editSave) return saveEdit();
    if ("delCancel" in b.dataset) {
      const id = confirming;
      confirming = null;
      drawLists();
      sheet.querySelector(`[data-note-menu="${CSS.escape(id)}"]`)?.focus();
      return;
    }
    if (b.dataset.del) {
      b.disabled = true;
      cc.notes
        .remove(traineeId, b.dataset.del)
        .then(() => (confirming = null))
        .catch(() => {
          b.disabled = false;
          b.closest(".note-bar").querySelector("span").textContent = "Couldn't delete. Try again?";
        });
    }
  });
  // All three note types in one Google Doc: a heading per type, each note with its timestamp.
  // The trainee keeps a pointer to the current doc (notes_doc). Drive can't rewrite a doc's
  // contents, so Update makes a fresh doc with the latest notes and moves the old one to the trash.
  const docInfo = () => cc.data().trainees.find((x) => x.id === traineeId)?.notes_doc || null;
  let exportMsg = ""; // HTML shown after an export, until the next one
  let exporting = false;
  const changesSinceExport = () => {
    const d = docInfo();
    if (!d || !notes) return 0;
    return notes.filter((n) => (n.updated_at || n.created_at || "") > d.exported_at).length;
  };
  const drawExport = () => {
    const btn = sheet.querySelector("[data-export-doc]");
    const out = sheet.querySelector("[data-export-status]");
    const d = docInfo();
    const changes = changesSinceExport();
    btn.textContent = exporting ? (d ? "Updating…" : "Exporting…") : d ? "Update Google Doc" : "Export to Google Docs";
    btn.disabled = exporting;
    // Highlighted when there are notes the doc doesn't have yet.
    btn.className = d && changes ? "btn-primary" : "btn";
    if (exportMsg) out.innerHTML = exportMsg;
    else if (d)
      out.innerHTML = `<a href="${escapeHtml(d.url)}" target="_blank" rel="noopener noreferrer">Open doc</a> · updated ${escapeHtml(fmtStamp(d.exported_at))}${
        changes ? ` · <b class="doc-stale">${changes} new or edited note${changes === 1 ? "" : "s"} not in the doc</b>` : " · up to date"
      }`;
    else out.textContent = "";
  };
  const exportDoc = () => {
    if (!notes) {
      exportMsg = escapeHtml(notes === null ? "Notes didn't load, so there's nothing to export." : "Still loading notes…");
      return drawExport();
    }
    const cohort = cc.data().cohorts.find((c) => (c.trainee_ids || []).includes(traineeId));
    const now = new Date();
    const who = [cohort?.name, t.department, t.team_lead ? `Team lead: ${t.team_lead}` : ""].filter(Boolean).join(" · ");
    const blocks = [
      { type: "h1", text: `Notes & Feedback — ${t.name}` },
      { type: "note", text: `${who ? `${who} · ` : ""}Updated ${fmtStamp(now.toISOString())}` },
    ];
    NOTE_SPACES.forEach((sp) => {
      const mine = notes.filter((n) => n.category === sp.key);
      blocks.push({ type: "h2", text: `${sp.title} (${mine.length})` });
      if (!mine.length) blocks.push({ type: "note", text: "No notes." });
      mine.forEach((n) =>
        blocks.push({ type: "p", label: fmtStamp(n.created_at) + (n.updated_at ? ` (edited ${fmtStamp(n.updated_at)})` : ""), text: n.text })
      );
    });
    const previous = docInfo();
    exporting = true;
    exportMsg = escapeHtml(previous ? "Updating the Google Doc…" : "Creating the Google Doc…");
    drawExport();
    cc.exportGoogleDoc(`Notes & Feedback — ${t.name}`, blocks)
      .then(async (doc) => {
        if (!doc.link) {
          exportMsg = "Saved to Google Docs, but Drive didn't return a link. Look for it in Drive.";
          return;
        }
        await cc.updateTrainee(traineeId, { notes_doc: { id: doc.id, url: doc.link, exported_at: now.toISOString() } }).catch(() => {});
        let trashNote = "";
        if (previous?.id && previous.id !== doc.id)
          trashNote = await cc.trashDriveFile(previous.id).then(
            () => " The previous copy is in Drive's Trash.",
            () => " The previous copy couldn't be moved to the trash, so it's still in Drive."
          );
        exportMsg = `${previous ? "Google Doc updated" : "Saved to Google Docs"} · <a href="${escapeHtml(doc.link)}" target="_blank" rel="noopener noreferrer">Open doc</a>${escapeHtml(trashNote)}`;
        setTimeout(() => {
          exportMsg = "";
          if (sheet.isConnected) drawExport();
        }, 8000);
      })
      .catch((e) => (exportMsg = e?.cancelled ? "" : escapeHtml(e?.message || "Couldn't export. Try again.")))
      .finally(() => {
        exporting = false;
        if (sheet.isConnected) drawExport();
      });
  };
  // Copy: every note as a row (Type, Date, Edited, Note) for pasting into a sheet.
  sheet.querySelector("[data-copy-notes]").addEventListener("click", async () => {
    if (!notes) {
      exportMsg = escapeHtml(notes === null ? "Notes didn't load, so there's nothing to copy." : "Still loading notes…");
      return drawExport();
    }
    const rows = [["Trainee", "Type", "Date", "Edited", "Note"]];
    NOTE_SPACES.forEach((sp) =>
      notes.filter((n) => n.category === sp.key).forEach((n) => rows.push([t.name, sp.title.replace(" Notes", ""), fmtStamp(n.created_at), n.updated_at ? fmtStamp(n.updated_at) : "", n.text]))
    );
    exportMsg = escapeHtml(rows.length < 2 ? "No notes to copy yet." : (await copyText(toTsv(rows))) ? `Copied ${rows.length - 1} note${rows.length === 2 ? "" : "s"}. Paste into a sheet.` : "Couldn't copy. Your browser blocked the clipboard.");
    drawExport();
    setTimeout(() => {
      exportMsg = "";
      if (sheet.isConnected) drawExport();
    }, 5000);
  });
  // Keep the button and "not in the doc" count current as notes and the trainee record change.
  const offChange = cc.onChange(() => sheet.isConnected && drawExport());
  refreshExport = drawExport;
  drawExport();

  // One space at a time; a typed-but-unsaved note stays in its box when switching tabs.
  const showTab = (key, focusTab) => {
    sheet.querySelectorAll("[data-tab]").forEach((tb) => {
      const on = tb.dataset.tab === key;
      tb.setAttribute("aria-selected", String(on));
      tb.tabIndex = on ? 0 : -1;
      if (on && focusTab) tb.focus();
    });
    sheet.querySelectorAll(".note-space").forEach((sp) => (sp.hidden = sp.dataset.space !== key));
    if (!focusTab) sheet.querySelector(`[data-space="${key}"] > textarea`)?.focus();
  };
  sheet.querySelector(".notes-tabs").addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const keys = NOTE_SPACES.map((sp) => sp.key);
    const cur = keys.indexOf(sheet.querySelector('[data-tab][aria-selected="true"]').dataset.tab);
    const next = e.key === "Home" ? 0 : e.key === "End" ? keys.length - 1 : (cur + (e.key === "ArrowRight" ? 1 : -1) + keys.length) % keys.length;
    showTab(keys[next], true);
  });
  // Coaching note → the trainee's Slack DMs. Their Slack account is found from their work email.
  const startShare = (n) => {
    sharing = { id: n.id, draft: slackDraft(n), status: "", busy: false };
    editing = null;
    confirming = null;
    drawLists();
    sheet.querySelector(".note-share-text")?.focus();
  };
  const sendShare = async () => {
    const slack = window.TrainerSlack;
    if (!sharing || sharing.busy) return;
    const message = (sheet.querySelector(".note-share-text")?.value ?? sharing.draft).trim();
    const set = (status, busy = false) => {
      if (!sharing) return;
      Object.assign(sharing, { status, busy });
      drawLists();
    };
    if (!message) return set("The message can't be empty.");
    if (!slack) return set("Slack isn't available right now.");
    sharing.draft = message;
    const trainee = cc.data().trainees.find((x) => x.id === traineeId) || t;
    if (!trainee.slack_user_id && !trainee.email) return set(`Add ${trainee.name}'s work email in Settings → Roster first, so they can be found on Slack.`);
    set(trainee.slack_user_id ? "Sending…" : "Finding them on Slack…", true);
    const noteId = sharing.id;
    try {
      const userId = await slack.userIdFor(trainee);
      if (!userId) return set(`Couldn't find a Slack account for ${trainee.email}. Check the work email in Settings → Roster.`);
      set("Sending…", true);
      await slack.sendDirect(userId, message);
      await cc.notes.mark(traineeId, noteId, { slack_sent_at: new Date().toISOString() }).catch(() => {});
      sharing = null;
      drawLists();
      exportMsg = escapeHtml(`Sent to ${trainee.name} on Slack ✓`);
      refreshExport();
      setTimeout(() => {
        if (exportMsg === escapeHtml(`Sent to ${trainee.name} on Slack ✓`)) {
          exportMsg = "";
          if (sheet.isConnected) refreshExport();
        }
      }, 5000);
    } catch (err) {
      set(slack.errorText(err));
    }
  };
  const startEdit = (n) => {
    editing = { id: n.id, draft: drafts.edit?.id === n.id ? drafts.edit.text : n.text };
    confirming = null;
    sharing = null;
    drawLists();
    const area = sheet.querySelector(".note-edit");
    area?.focus();
    area?.setSelectionRange(area.value.length, area.value.length);
  };
  const cancelEdit = () => {
    const id = editing?.id;
    editing = null;
    if (drafts.edit) {
      delete drafts.edit;
      writeDrafts();
    }
    drawLists();
    if (id) sheet.querySelector(`[data-note-menu="${CSS.escape(id)}"]`)?.focus();
  };
  const saveEdit = () => {
    const li = sheet.querySelector(".note.editing");
    if (!editing || !li) return;
    const text = li.querySelector(".note-edit").value.trim();
    const status = li.querySelector(".sheet-status");
    const n = (notes || []).find((x) => x.id === editing.id);
    if (!text) {
      status.textContent = "A note can't be empty. Use Delete to remove it.";
      return;
    }
    if (n && text === n.text) return cancelEdit();
    li.querySelectorAll("button").forEach((x) => (x.disabled = true));
    status.textContent = "Saving…";
    const id = editing.id;
    cc.notes
      .update(traineeId, id, text)
      .then(() => {
        if (editing?.id === id) cancelEdit();
      })
      .catch(() => {
        li.querySelectorAll("button").forEach((x) => (x.disabled = false));
        status.textContent = "Couldn't save. Try again.";
      });
  };
  sheet.addEventListener("input", (e) => {
    if (e.target.classList.contains("note-share-text") && sharing) sharing.draft = e.target.value;
    if (e.target.classList.contains("note-edit") && editing) {
      editing.draft = e.target.value;
      drafts.edit = { id: editing.id, text: e.target.value };
      queueDraft(null);
      const out = e.target.closest(".note")?.querySelector(".sheet-status");
      clearTimeout(e.target._draftMsg);
      e.target._draftMsg = setTimeout(() => out && (out.textContent = "Draft saved"), 650);
    }
    if (e.target.matches(".note-space > textarea")) {
      const box = e.target.closest(".note-space");
      drafts[box.dataset.space] = e.target.value;
      queueDraft(box);
    }
  });
  // Ctrl/⌘ + Enter adds a note (or saves an edit); Escape leaves an edit, then closes.
  sheet.addEventListener("keydown", (e) => {
    const inEdit = e.target.classList?.contains("note-edit");
    if (e.key === "Escape" && e.target.classList?.contains("note-share-text")) {
      e.preventDefault();
      sharing = null;
      return drawLists();
    }
    if (e.key === "Escape") return inEdit ? (e.preventDefault(), cancelEdit()) : close();
    if (inEdit && e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      return saveEdit();
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && e.target.matches(".note-space > textarea")) {
      e.preventDefault();
      add(e.target.closest(".note-space"));
    }
  });
  sheet.querySelector("textarea").focus();
}

// Small ⋮ menu anchored to a button, inside the button's window.
function openMenu(anchor, items) {
  document.querySelector(".menu-pop")?.remove();
  const win = anchor.closest(".window");
  const menu = document.createElement("div");
  menu.className = "menu-pop";
  menu.setAttribute("role", "menu");
  menu.innerHTML = items.map((it, i) => `<button type="button" role="menuitem" data-i="${i}"${it.danger ? ' class="danger"' : ""}>${escapeHtml(it.label)}</button>`).join("");
  win.appendChild(menu);
  const a = anchor.getBoundingClientRect();
  const w = win.getBoundingClientRect();
  menu.style.top = `${a.bottom - w.top + 4}px`;
  menu.style.right = `${w.right - a.right}px`;
  const close = () => {
    menu.remove();
    document.removeEventListener("pointerdown", outside, true);
    document.removeEventListener("keydown", esc, true);
  };
  const outside = (e) => !menu.contains(e.target) && close();
  const esc = (e) => e.key === "Escape" && close();
  document.addEventListener("pointerdown", outside, true);
  document.addEventListener("keydown", esc, true);
  menu.addEventListener("click", (e) => {
    const b = e.target.closest("[data-i]");
    if (!b) return;
    close();
    items[Number(b.dataset.i)].run();
  });
  menu.querySelector("button")?.focus();
}

// Edit a trainee's roster record (the same record as Settings → Roster).
function openEditTrainee(content, traineeId) {
  const win = content.closest(".window");
  if (win.querySelector(".sheet")) return;
  const cc = window.CoachingCompass;
  const { trainees, departments, teamLeads } = cc.data();
  const t = trainees.find((x) => x.id === traineeId);
  if (!t) return;
  const select = (id, items, current, empty) =>
    `<select id="${id}">${[`<option value="">${empty}</option>`, ...items.map((i) => `<option value="${escapeHtml(i.name)}"${i.name === current ? " selected" : ""}>${escapeHtml(i.name)}</option>`)].join("")}</select>`;
  const sheet = document.createElement("div");
  sheet.className = "sheet";
  sheet.innerHTML = `
    <form class="sheet-card" novalidate>
      <h3>Edit trainee</h3>
      <label class="field"><span>Name</span><input id="et-name" type="text" value="${escapeHtml(t.name || "")}" /></label>
      <label class="field"><span>Work email</span><input id="et-email" type="email" value="${escapeHtml(t.email || "")}" placeholder="jordan.diaz@company.com" /></label>
      <label class="field"><span>CRM name</span><input id="et-crm" type="text" value="${escapeHtml(t.crm_name || "")}" placeholder="As it appears in the QA sheet" /></label>
      <label class="field"><span>Department</span>${select("et-dept", departments, t.department, "— None —")}</label>
      <label class="field"><span>Team Lead</span>${select("et-lead", teamLeads, t.team_lead, "— None —")}</label>
      <label class="field"><span>Nesting status</span><select id="et-nesting">${Object.entries(NESTING_LABELS)
        .map(([k, v]) => `<option value="${k}"${k === (t.nesting_status || "") ? " selected" : ""}>${v}</option>`)
        .join("")}</select></label>
      <p class="sheet-status" id="et-status" role="status"></p>
      <div class="sheet-actions">
        <button type="button" class="btn" data-cancel>Cancel</button>
        <button type="submit" class="btn-primary">Save changes</button>
      </div>
    </form>`;
  win.appendChild(sheet);
  const close = () => sheet.remove();
  const $ = (id) => sheet.querySelector(id);
  $("[data-cancel]").addEventListener("click", close);
  sheet.addEventListener("keydown", (e) => e.key === "Escape" && close());
  sheet.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#et-name").value.trim();
    if (!name) {
      $("#et-status").textContent = "Name is required.";
      return;
    }
    $("#et-status").textContent = "Saving…";
    cc.updateTrainee(traineeId, {
      name,
      email: $("#et-email").value.trim(),
      crm_name: $("#et-crm").value.trim() || ($("#et-email").value.includes("@") ? $("#et-email").value.trim().split("@")[0] : ""),
      department: $("#et-dept").value,
      team_lead: $("#et-lead").value,
      nesting_status: $("#et-nesting").value,
    })
      .then(close)
      .catch(() => ($("#et-status").textContent = "Couldn't save. Try again."));
  });
  $("#et-name").focus();
}

// "Add Class" sheet for the Cohorts app, also used to edit a cohort (pass its id).
// Department and Team Lead lists come from Settings → Roster.
function openAddClass(content, editId, opts = {}) {
  const win = content.closest(".window");
  if (win.querySelector(".sheet")) return;
  const { departments, teamLeads, cohorts } = window.CoachingCompass.data();
  // As the Training Manager, a class is created for one of the Trainers (it appears in that Trainer's Cohorts).
  const assign = !!opts.assign;
  const trainerOpts = assign ? window.TrainerManager?.trainerOptions() || [] : [];
  const editing = assign ? opts.assignment || null : editId ? cohorts.find((c) => c.id === editId) : null;
  if (!assign && editId && !editing) return;
  const cur = editing || {};
  // Keep a saved value listed even if it has since been removed from the roster lists.
  const options = (items, current, emptyText) => {
    const names = items.map((i) => i.name);
    if (current && !names.includes(current)) names.push(current);
    return names.length
      ? `<option value="">— Select —</option>` + names.map((n) => `<option value="${escapeHtml(n)}"${n === current ? " selected" : ""}>${escapeHtml(n)}</option>`).join("")
      : `<option value="">${emptyText}</option>`;
  };
  const sheet = document.createElement("div");
  sheet.className = "sheet";
  sheet.innerHTML = `
    <form class="sheet-card" novalidate>
      <h3>${editing ? "Edit cohort" : "Add Class"}</h3>
      <label class="field"><span>Cohort name</span><input id="ac-name" type="text" placeholder="e.g. October Cohort A" value="${escapeHtml(cur.name || "")}" required /></label>
      <label class="field"><span>Department</span><select id="ac-dept"${departments.length || cur.department ? "" : " disabled"}>${options(departments, cur.department, "Add a department in Settings → Roster first")}</select></label>
      <label class="field"><span>Team Lead</span><select id="ac-lead"${teamLeads.length || cur.team_lead ? "" : " disabled"}>${options(teamLeads, cur.team_lead, "Add a team lead in Settings → Roster first")}</select></label>
      <label class="field"><span>Start Date</span><input id="ac-date" type="date" value="${escapeHtml(cur.training_start_date || "")}" /></label>
      ${
        assign
          ? `<label class="field"><span>Trainer</span><select id="ac-trainer"${trainerOpts.length ? "" : " disabled"}>${
              trainerOpts.length
                ? `<option value="">— Select —</option>` + trainerOpts.map((o) => `<option value="${escapeHtml(o.ref)}"${o.ref === cur.trainer_ref ? " selected" : ""}>${escapeHtml(o.name)}</option>`).join("")
                : `<option value="">Add a Trainer first</option>`
            }</select></label>`
          : ""
      }
      <p class="sheet-status" id="ac-status" role="status"></p>
      <div class="sheet-actions">
        <button type="button" class="btn" data-cancel>Cancel</button>
        <button type="submit" class="btn-primary">${editing ? "Save changes" : "Add Class"}</button>
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
    const fields = {
      name,
      department: sheet.querySelector("#ac-dept").value,
      team_lead: sheet.querySelector("#ac-lead").value,
      training_start_date: sheet.querySelector("#ac-date").value,
    };
    if (assign) {
      fields.trainer_ref = sheet.querySelector("#ac-trainer").value;
      if (!fields.trainer_ref) {
        status.textContent = "Pick the Trainer this class is for.";
        return;
      }
      window.TrainerManager.saveAssignment(fields, editing?.id)
        .then(close)
        .catch(() => (status.textContent = "Couldn't save the class. Try again."));
      return;
    }
    (editing ? window.CoachingCompass.updateCohort(editing.id, fields) : window.CoachingCompass.addCohort(fields))
      .then(close)
      .catch(() => (status.textContent = "Couldn't save the class. Try again."));
  });
  sheet.querySelector("#ac-name").focus();
}

const openEditCohort = (content, id) => openAddClass(content, id);

// Delete a cohort after confirming. Its trainees stay on the roster.
function openDeleteCohort(content, id) {
  const win = content.closest(".window");
  if (win.querySelector(".sheet")) return;
  const cc = window.CoachingCompass;
  const cohort = cc.data().cohorts.find((c) => c.id === id);
  if (!cohort) return;
  const n = (cohort.trainee_ids || []).length;
  const sheet = document.createElement("div");
  sheet.className = "sheet";
  sheet.innerHTML = `
    <div class="sheet-card" role="alertdialog" aria-label="Delete cohort">
      <h3>Delete ${escapeHtml(cohort.name)}?</h3>
      <p class="muted">This removes the cohort, its schedule and its attendance. ${n ? `Its ${n} trainee${n === 1 ? "" : "s"} stay${n === 1 ? "s" : ""} in Settings → Roster and can be added to another cohort.` : ""} This can't be undone.</p>
      <p class="sheet-status" role="status"></p>
      <div class="sheet-actions">
        <button type="button" class="btn" data-cancel>Cancel</button>
        <button type="button" class="btn-danger" data-delete>Delete cohort</button>
      </div>
    </div>`;
  win.appendChild(sheet);
  const close = () => sheet.remove();
  sheet.querySelector("[data-cancel]").addEventListener("click", close);
  sheet.addEventListener("keydown", (e) => e.key === "Escape" && close());
  const del = sheet.querySelector("[data-delete]");
  del.addEventListener("click", () => {
    del.disabled = true;
    sheet.querySelector(".sheet-status").textContent = "Deleting…";
    cc.deleteCohort(id)
      .then(close)
      .catch(() => {
        del.disabled = false;
        sheet.querySelector(".sheet-status").textContent = "Couldn't delete. Try again.";
      });
  });
  sheet.querySelector("[data-cancel]").focus();
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
  // Windows open at 90% of the free desktop (the area above the dock), centred.
  const dockTop = dock.getBoundingClientRect().top - bounds.top;
  const w = Math.max(320, Math.round(bounds.width * 0.9));
  const h = Math.max(220, Math.round(dockTop * 0.9));
  const offset = (cascade++ % 4) * 24;
  win.style.width = `${Math.min(w, bounds.width - 16)}px`;
  win.style.height = `${Math.min(h, dockTop - 16)}px`;
  win.style.left = `${Math.max(8, (bounds.width - w) / 2 + offset)}px`;
  win.style.top = `${Math.max(8, (dockTop - h) / 2 + offset)}px`;

  const content = win.querySelector(".content");
  if (!app.custom) content.classList.add("app-body");
  app.render(content);
  wireWindow(win, appId);
  desktop.appendChild(win);
  openWindows.set(appId, win);
  watchCrumbs(win, appId);
  focusWindow(win);
  setRunning(appId, true);
}

// ---------- Breadcrumbs ----------
// Every window has a crumb bar under its title: Trainer Desk › App › … Apps report their deeper
// levels with TrainerDesk.setCrumbs(appId, [{ label, go }], home), and an open dialog adds its
// title as the last step. Any earlier step is a link; the last one is where you are.
const crumbState = {}; // appId -> { items, home }
function setCrumbs(appId, items, home) {
  crumbState[appId] = { items: items || [], home: home || crumbState[appId]?.home };
  drawCrumbs(appId);
}
function showDesktop() {
  openWindows.forEach((w) => w.classList.add("minimized"));
  refreshActiveLabel();
}
function closeSheet(sheet) {
  const cancel = sheet.querySelector("[data-cancel]");
  if (cancel) cancel.click();
  if (sheet.isConnected) sheet.remove();
}
function drawCrumbs(appId) {
  const win = openWindows.get(appId);
  const bar = win?.querySelector(".crumbs");
  if (!bar) return;
  const st = crumbState[appId] || { items: [] };
  const sheet = [...win.children].find((c) => c.classList.contains("sheet"));
  const list = [
    { label: "Trainer Desk", go: showDesktop, title: "Show the desktop" },
    { label: APPS[appId].title, go: st.home },
    ...st.items,
  ];
  if (sheet) {
    // Steps behind a dialog close it first.
    list.forEach((c) => {
      const go = c.go;
      if (c !== list[0]) c.go = () => (closeSheet(sheet), go?.());
    });
    const h = sheet.querySelector(".sheet-card h3");
    list.push({ label: (h?.dataset.crumb || h?.textContent || sheet.querySelector(".sheet-card")?.getAttribute("aria-label") || "Details").trim() });
  }
  const last = list.length - 1;
  bar.innerHTML = list
    .map((c, i) => {
      const sep = i ? `<span class="crumb-sep" aria-hidden="true">›</span>` : "";
      if (i === last) return `${sep}<span class="crumb crumb-current" aria-current="page">${escapeHtml(c.label)}</span>`;
      if (!c.go) return `${sep}<span class="crumb">${escapeHtml(c.label)}</span>`;
      return `${sep}<button type="button" class="crumb" data-crumb="${i}"${c.title ? ` title="${escapeHtml(c.title)}"` : ""}>${escapeHtml(c.label)}</button>`;
    })
    .join("");
  bar._crumbs = list;
}
function watchCrumbs(win, appId) {
  const bar = win.querySelector(".crumbs");
  bar.addEventListener("click", (e) => {
    const b = e.target.closest("[data-crumb]");
    const c = b && bar._crumbs?.[Number(b.dataset.crumb)];
    if (!c) return;
    c.go();
    drawCrumbs(appId);
  });
  // Dialogs opening, closing or changing title redraw the crumbs.
  let queued = false;
  new MutationObserver((muts) => {
    if (queued || muts.every((m) => bar.contains(m.target))) return;
    queued = true;
    requestAnimationFrame(() => ((queued = false), win.isConnected && drawCrumbs(appId)));
  }).observe(win, { childList: true, subtree: true });
  drawCrumbs(appId);
}
window.TrainerDesk = { setCrumbs };

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

// ---------- Shared defaults: dock order and wallpaper ----------
let defaultsOwner = false;
const defaultsHooks = { sync() {} };
let defaultsDb = null;

// A photo shared with everyone is shrunk harder than a personal one, to fit in a stored document.
async function shrinkDataUrl(dataUrl, maxPx, quality) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

// Saves the owner's current dock order and wallpaper as the default. Resolves with an error message, or "" when saved.
// A photo is uploaded as a file at full quality (the Assets capability) and everyone loads it from there.
async function publishDefaults() {
  if (!defaultsDb) return "Saved storage isn't available here, so the default can't be shared.";
  const wp = effectiveWallpaper();
  const record = { dockOrder: dockOrder(), wallpaper: wp.kind, theme: effectiveTheme(), updated_at: new Date().toISOString() };
  try {
    if (wp.kind === "photo" && wp.photo) {
      const personal = wallpaperIsCustom() && wallpaperPhoto && wp.photo === wallpaperPhoto;
      if (personal) {
        let blob = wallpaperBlob;
        if (!blob) blob = await (await fetch(wallpaperPhoto)).blob();
        const assets = await window.claude?.use("assets");
        if (assets) {
          const up = await assets.upload(blob);
          await defaultsDb.doc("settings/dashboard_wallpaper").set({ asset_id: up.id, url: up.url, bytes: up.sizeBytes, updated_at: record.updated_at });
          sharedDefaults.photo = up.url;
          sharedDefaults.assetId = up.id;
        } else {
          // Without file storage the photo has to fit in a stored document, so it is shrunk.
          const dataUrl = await new Promise((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.readAsDataURL(blob);
          });
          let data = dataUrl;
          for (const [px, q] of [[2560, 0.85], [1920, 0.8], [1600, 0.7], [1280, 0.65]]) {
            data = await shrinkDataUrl(dataUrl, px, q);
            if (data.length < 700000) break;
          }
          await defaultsDb.doc("settings/dashboard_wallpaper").set({ data, updated_at: record.updated_at });
          sharedDefaults.photo = data;
        }
      }
      // Otherwise the photo already shared stays as it is.
    } else {
      sharedDefaults.photo = null;
      await defaultsDb.doc("settings/dashboard_wallpaper").set({ data: "", updated_at: record.updated_at });
    }
    await defaultsDb.doc("settings/dashboard_defaults").set(record);
  } catch {
    return "Couldn't save the default. Try again.";
  }
  sharedDefaults.dockOrder = record.dockOrder;
  sharedDefaults.wallpaper = record.wallpaper;
  sharedDefaults.theme = record.theme;
  return "";
}

(function loadDefaults() {
  const use = (name) => (window.TrainerUse ? window.TrainerUse(name) : Promise.resolve(null));
  Promise.all([use("db"), use("user")]).then(async ([db, user]) => {
    defaultsDb = db;
    if (!db) return;
    try {
      defaultsOwner = !!(await user?.isOwner());
    } catch {}
    let seeded = false;
    const apply = () => {
      applySettings();
      reorderDock();
      defaultsHooks.sync();
    };
    db.doc("settings/dashboard_wallpaper").onSnapshot(
      (snap) => {
        const d = (snap.exists && snap.data()) || {};
        sharedDefaults.photo = d.url || (d.asset_id ? `/_blob/${d.asset_id}` : "") || d.data || null;
        sharedDefaults.assetId = d.asset_id || "";
        apply();
      },
      () => {}
    );
    db.doc("settings/dashboard_defaults").onSnapshot(
      (snap) => {
        sharedDefaults.loaded = true;
        if (snap.exists) {
          const d = snap.data() || {};
          sharedDefaults.dockOrder = Array.isArray(d.dockOrder) ? d.dockOrder : null;
          sharedDefaults.wallpaper = d.wallpaper || null;
          sharedDefaults.theme = d.theme || null;
          sharedDefaults.raw = d;
          apply();
          // A default saved before colorways existed gets the owner's colorway added the first time they open this.
          if (defaultsOwner && !d.theme && !seeded) {
            seeded = true;
            db.doc("settings/dashboard_defaults").set({ ...d, theme: effectiveTheme(), updated_at: new Date().toISOString() }).catch(() => {});
          }
        } else if (defaultsOwner && !seeded) {
          // The first time the owner opens this, their own dock order and wallpaper become the default.
          seeded = true;
          publishDefaults().then(apply);
        } else defaultsHooks.sync();
      },
      () => {}
    );
  });
})();

// ---------- Dock ----------
function setRunning(appId, running) {
  const item = dock.querySelector(`[data-app="${appId}"]`);
  if (!item) return;
  // An app opening (from the dock, a notification or anywhere else) makes its icon hop once.
  if (running && !item.classList.contains("running")) {
    item.classList.remove("bounce");
    void item.offsetWidth;
    item.classList.add("bounce");
  }
  item.classList.toggle("running", running);
}

// A thin divider separates the trainer apps from the tools (Ops Updates, Settings), wherever the icons are moved.
const DOCK_TOOLS = new Set(["notion", "settings"]);
const MANAGER_TOOLS = new Set(["notion", "courseware", "settings"]);
function markDockGroups() {
  let prev = null;
  dock.querySelectorAll(".dock-item").forEach((item) => {
    const tool = (appRole() === "manager" ? MANAGER_TOOLS : DOCK_TOOLS).has(item.dataset.app);
    item.classList.toggle("group-start", prev !== null && tool !== prev);
    prev = tool;
  });
}

// Unread counts on dock icons: notifications that belong to an app (Quiz replies, Ops Updates).
function updateDockBadges(counts) {
  dock.querySelectorAll(".dock-item").forEach((item) => {
    const n = counts?.[item.dataset.app] || 0;
    const badge = item.querySelector(".dock-badge");
    if (!badge) return;
    badge.hidden = !n;
    badge.textContent = n > 99 ? "99+" : String(n);
    item.setAttribute("aria-label", n ? `${APPS[item.dataset.app].title}, ${n} unread` : APPS[item.dataset.app].title);
  });
}

let dockMagnify = { reset() {} };

function dockOrder() {
  const ids = visibleAppIds();
  if (appRole() === "manager") return ids;
  const base = !dockIsCustom() && sharedDefaults.dockOrder ? sharedDefaults.dockOrder : settings.dockOrder;
  const saved = base.filter((id) => ids.includes(id));
  return [...saved, ...ids.filter((id) => !saved.includes(id))];
}
// Put the dock icons in the current order (the default arriving after the page loaded, or a reset).
function reorderDock() {
  if (dock.classList.contains("reordering")) return;
  dockOrder().forEach((id) => {
    const item = dock.querySelector(`[data-app="${id}"]`);
    if (item) dock.appendChild(item);
  });
  markDockGroups();
}

function populateDock() {
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
          <span class="dock-badge" hidden></span>
        </span>
        <span class="dock-label${(app.dockLabel || app.title).length > 14 ? " long" : ""}">${escapeHtml(app.dockLabel || app.title)}</span>
      </span>`;
    btn.addEventListener("click", () => openApp(id));
    enableDockDrag(btn);
    dock.appendChild(btn);
  });

  markDockGroups();
}
// The same dock with a different set of apps (the owner switching between Trainer and Training Manager).
function rebuildDock() {
  dock.replaceChildren();
  populateDock();
}
function buildDock() {
  populateDock();

  // macOS-style magnification: icons grow toward the cursor. Targets update on
  // mousemove; a requestAnimationFrame loop eases each icon toward its target, so the
  // motion renders on every frame the display shows (60, 90, 120fps…) instead of
  // stepping with mouse events. The easing is time-based, so it feels the same at any
  // refresh rate: 45% of the remaining distance per 1/60 s (settles in about a quarter second).
  let pointerX = null;
  let frame = null;
  let lastTime = null;
  const current = new Map();

  const tick = (now) => {
    frame = null;
    const dt = lastTime === null ? 1000 / 60 : Math.min(100, now - lastTime);
    lastTime = now;
    const ease = 1 - Math.pow(1 - 0.45, dt / (1000 / 60));
    let moving = false;
    dock.querySelectorAll(".dock-item").forEach((item) => {
      let target = 1;
      if (pointerX !== null && settings.magnify && !dock.classList.contains("reordering")) {
        const rect = item.getBoundingClientRect();
        const dist = Math.abs(pointerX - (rect.left + rect.width / 2));
        target = 1 + Math.max(0, 1 - dist / 140) * 0.45;
      }
      const from = current.get(item) ?? 1;
      const next = Math.abs(target - from) < 0.002 ? target : from + (target - from) * ease;
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
    else lastTime = null;
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
      settings.dockCustom = true;
      markDockGroups();
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
// Switching between Trainer and Training Manager (the owner can) swaps the dock and closes open windows, with no page reload.
let shownRole = null;
function applyRole() {
  const role = appRole();
  if (shownRole === null || role === shownRole) return;
  shownRole = role;
  [...openWindows.keys()].forEach((id) => closeApp(id));
  const brand = document.querySelector(".brand");
  if (brand) brand.textContent = role === "manager" ? "Training Manager" : "Trainer";
  rebuildDock();
  window.TrainerNotify?.refresh?.();
}
// The dock depends on who is signed in (Trainer or Training Manager), so it waits for that to be known.
{
  const start = () => {
    const brand = document.querySelector(".brand");
    if (brand && appRole() === "manager") brand.textContent = "Training Manager";
    shownRole = appRole();
    window.TrainerWS?.onChange(applyRole);
    buildDock();
    // The Manager's script loads after this one, so wait for the whole page.
    if (document.readyState === "complete") buildAvatarMenu();
    else window.addEventListener("load", buildAvatarMenu, { once: true });
  };
  (window.TrainerWS ? window.TrainerWS.ready : Promise.resolve()).then(start, start);
}
tick();
setInterval(tick, 15000);
