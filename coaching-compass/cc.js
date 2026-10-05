// Coaching, running inside its Trainer Desk window.
(function(){
  "use strict";

  var ICONS = {
    grid: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"></rect><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"></rect><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"></rect><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"></rect></svg>',
    table: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line><line x1="9" y1="10" x2="9" y2="19.5"></line></svg>',
    users: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"></circle><path d="M3 20c0-3.4 2.7-6 6-6s6 2.6 6 6"></path><path d="M15.5 8.2c1.4.3 2.5 1.5 2.5 3"></path><path d="M15 14.2c2.3.4 4 2.3 4 5"></path></svg>',
    user: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"></path></svg>',
    trend: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 16 9 10 13 14 21 5"></polyline><polyline points="15 5 21 5 21 11"></polyline></svg>',
    clock: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3.2 2"></path></svg>',
    book: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 4.8A2 2 0 0 1 6.3 4H19v14.5H6.3a1.8 1.8 0 0 0-1.8 1.8V4.8Z"></path><line x1="4.5" y1="17.2" x2="19" y2="17.2"></line></svg>',
    gear: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
    sheet: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"></rect><line x1="4" y1="9" x2="20" y2="9"></line><line x1="9" y1="9" x2="9" y2="21"></line></svg>',
    arrowLeft: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>',
    roster: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="9" cy="10.5" r="2"></circle><path d="M6 15c.5-1.6 1.8-2.5 3-2.5s2.5.9 3 2.5"></path><line x1="14.5" y1="9" x2="18" y2="9"></line><line x1="14.5" y1="12" x2="18" y2="12"></line></svg>',
    empty: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M9 10.5c.5-1.2 1.6-2 3-2s2.5.8 3 2"></path><line x1="9" y1="15" x2="15" y2="15"></line></svg>',
    check: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"></path><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"></path></svg>',
    palette: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3C7 3 3 7 3 12c0 4 2.5 6 5 6 1 0 1-1 .6-1.8-.4-.8.1-1.7 1-1.7H11c3.9 0 7-2.6 7-6.5C18 5.3 15.3 3 12 3Z"></path><circle cx="7.5" cy="10.5" r="1.1" fill="currentColor" stroke="none"></circle><circle cx="11" cy="7.3" r="1.1" fill="currentColor" stroke="none"></circle><circle cx="15" cy="8.3" r="1.1" fill="currentColor" stroke="none"></circle><circle cx="15.8" cy="12.3" r="1.1" fill="currentColor" stroke="none"></circle></svg>'
  };

  var SECTIONS = [
    { key: "data", label: "QA Data Request", icon: "table", countKey: "rows" },
    { key: "cohorts", label: "QA Data", icon: "roster", countKey: "cohorts" },
    { key: "speed", label: "Speed", icon: "trend" },
    { key: "spot", label: "Spot Check", icon: "check" },
    { key: "team", label: "Team coaching", icon: "users", countKey: "themes" },
    { key: "individual", label: "Individual coaching", icon: "user" }
  ];
  var SOON = [
    { label: "Trends over time", icon: "trend" },
    { label: "Audit history", icon: "clock" },
    { label: "Rubric library", icon: "book" }
  ];
  var CONFIG = [
    { key: "settings", label: "Settings", icon: "gear" }
  ];
  var SECTION_META = {
    home: { eyebrow: "Home", title: "Home", sub: "" },
    ask: { eyebrow: "Ask AI", title: "Ask AI", sub: "Ask about your saved weeks, trainees, scores and knowledge gap reports. Answers come only from what's saved here." },
    data: { eyebrow: "QA Data Request", title: "QA Data Request", sub: "Request a week's QA audits. Every request is analyzed automatically, and nothing is kept unless you save it." },
    team: { eyebrow: "Team coaching", title: "Team coaching", sub: "Recurring themes across every trainee, ranked by impact." },
    individual: { eyebrow: "Individual coaching", title: "Individual coaching", sub: "A coaching brief for each trainee, ready for your next 1:1." },
    cohorts: { eyebrow: "QA Data", title: "QA Data", sub: "Each cohort's saved QA weeks and coaching data. Cohorts themselves are managed in the Cohorts app." },
    spot: { eyebrow: "Spot Check", title: "Spot Check", sub: "Record spot checks of a trainee's tickets: comms, resolution and a score. Each one is sent to the trainee on Slack." },
    speed: { eyebrow: "Speed", title: "Speed", sub: "Daily Speed and hours per trainee, summarised per week, read from the Speed Productivity Sheet." },
    settings: { eyebrow: "Settings", title: "Settings", sub: "Configure where Coaching reads its QA audits from." }
  };
  var RESOURCE_TABS = [
    { key: "knowledge_base", label: "Knowledge Base" },
    { key: "appearance", label: "Appearance" }
  ];
  var THEMES = [
    { key: "default", label: "Default", desc: "Coaching's original palette.", swatches: ["#3c6e57", "#f4f1e8", "#ffffff", "#1c211d"] },
    { key: "playful", label: "Playful", desc: "Inspired by Plants vs. Zombies 3 — leafy greens, sunflower yellow, and a bold comic-book feel.", swatches: ["#4CAF50", "#F0F9F0", "#FFEB3B", "#8A2BE2"] }
  ];
  var LEARNINGS_FED_TO_ANALYSIS = 20;
  var KB_LINK_COUNT = 3;
  var ROSTER_TABS = [
    { key: "trainee", label: "Trainee" },
    { key: "team_lead", label: "Team Lead" },
    { key: "department", label: "Department" }
  ];
  var SIMPLE_LISTS = [
    { key: "team_lead", label: "Team Lead", collection: "team_leads", stateKey: "teamLeads", icon: "user", hint: "Team leads you can assign to a trainee.", placeholder: "e.g. K. Alvarez" },
    { key: "department", label: "Department", collection: "departments", stateKey: "departments", icon: "grid", hint: "Departments you can assign to a trainee.", placeholder: "e.g. Customer Support" }
  ];
  var COLUMN_MAP = [
    { col: "B", field: "Week number", desc: "Which audit week the row belongs to" },
    { col: "C", field: "Trainee (CRM name)", desc: "Identifies which trainee the row is for" },
    { col: "G", field: "Rating", desc: "Pass / Pass with coaching opportunity / Fail — shown for context only" },
    { col: "K", field: "Resolution markdown", desc: "Whether the trainee was marked down on ticket resolution" },
    { col: "L", field: "Communication markdown", desc: "Whether the trainee was marked down on ticket communication" },
    { col: "R", field: "Score", desc: "The exact score: 100% = Pass, 0% = Fail. A trainee's score is passes ÷ audited tickets" }
  ];
  var SHEET_SIDES = [
    { key: "c_side", label: "C side", hint: "Customer-facing QA audits", columns: COLUMN_MAP },
    { key: "cp_side", label: "CP side", hint: "Cleaner Partner QA audits", columns: COLUMN_MAP }
  ];


  var MAX_ROWS = 400;

  var state = {
    section: "home",
    resourceTab: "knowledge_base",
    dataTab: "pull",
    learnings: null,
    learningsError: false,
    repoSearch: "",
    repoCohort: "",
    repoTheme: "",
    themeKey: "default",
    headers: [],
    rows: [],
    analyzing: false,
    analysis: null,
    selectedTrainee: null,
    kbSaved: { c_side: [], cp_side: [] },
    kbReads: {},
    teamCohort: null,
    teamWeek: null,
    indCohort: "",
    settings: {
      c_side: { url: "", tab_name: "Nesting audits - Feedback" },
      cp_side: { url: "", tab_name: "" }
    },
    kbLinks: {
      c_side: [{ label: "", url: "" }, { label: "", url: "" }, { label: "", url: "" }],
      cp_side: [{ label: "", url: "" }, { label: "", url: "" }, { label: "", url: "" }]
    },
    settingsStatus: "idle",
    trainees: [],
    rosterTab: "trainee",
    teamLeads: [],
    departments: [],
    cohorts: [],
    pullContext: null,
    reqDraft: { trainee: { week: "", target: "" }, cohort: { week: "", target: "" } },
    request: null,
    allAnalyses: null,
    askHistory: [],
    selectedWeek: null,
    selectedCohortId: null,
    cohortAnalyses: null,
    cohortDetailWeekId: null,
    cohortDetailView: null,
    pendingFeedback: null,
    kbGapFocusTheme: null,
    cohortDetailTraineeId: null,
    kbGapDocId: null,
    kbGapStatus: null,
    kbGapRecord: null,
    kbGapComment: "",
    kbGapError: null,
    kbGapLoggedComments: {},
    kbGapSaveNote: null
  };

  var sampleFn = null;
  var downloadsFn = null;
  var dbFn = null;
  var mcpFn = null;
  var userFn = null;
  var abortCtl = null;
  var isArtifactOwner = false;
  var viewerId = null;

  // The app lives in a dashboard window: .cc-root replaces <html>, .cc-scroll replaces the page scroll.
  var ccRoot = document.getElementById("ccRoot");
  var ccScroll = document.getElementById("ccScroll");

  var el = {};
  [
    "homeBody","homeTop","pageHead","homeHeader","homeApps","topbar","breadcrumb","sectionEyebrow","sectionTitle","sectionSub","reportActions","reportCopyBtn","reportDocBtn","reportLabel","reportNote",
    "statRow",
    "overviewBody",
    "teamPanel","teamCohortPicker","teamWeekTabs","indCohortPicker","traineePicker","traineeWeekTabs","traineeCard",
    "resourceTabs","settingsBody",
    "modalRoot","modalBackdrop","modalCard","kebabMenu",
    "requestForms","requestResult",
    "askFab","askPop","askPopClose","askAnotherBtn","askInput","askSubmitBtn","askChips","askScope","askAnswers",
    "cohortsBody",
    "dataTabs","repositoryBody","dataPullView"
  ].forEach(function(id){ el[id] = document.getElementById(id); });

  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];
    });
  }

  function formatDate(iso){
    if (!iso) return "";
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  // ---- Overlays ----
  // Modals and menus open over the surface the coach is using: the Coaching
  // window, or the Roster page in Trainer Desk's Settings (any .cc-ui element).
  var overlayHost = ccRoot;
  function trackOverlayHost(e){
    var host = e.target && e.target.closest ? e.target.closest(".cc-ui, .cc-root") : null;
    if (!host || host === overlayHost || el.modalRoot.contains(e.target) || el.kebabMenu.contains(e.target)) return;
    if (!el.modalRoot.hidden || !el.kebabMenu.hidden) return;
    overlayHost = host;
    host.appendChild(el.modalRoot);
    host.appendChild(el.kebabMenu);
  }
  document.addEventListener("pointerdown", trackOverlayHost, true);
  document.addEventListener("focusin", trackOverlayHost, true);

  // ---- Modal ----
  function openModal(bodyHtml){
    el.modalCard.innerHTML = bodyHtml;
    el.modalRoot.hidden = false;
  }
  function closeModal(){
    el.modalRoot.hidden = true;
    el.modalCard.innerHTML = "";
  }
  el.modalBackdrop.addEventListener("click", closeModal);
  document.addEventListener("keydown", function(e){
    if (e.key !== "Escape") return;
    if (!el.modalRoot.hidden) closeModal();
    if (!el.kebabMenu.hidden) closeKebab();
    if (!el.askPop.hidden){ closeAskPop(); el.askFab.focus(); }
  });

  // ---- CSV parsing ----
  function parseCSV(text){
    var firstLine = text.split("\n")[0] || "";
    var delim = (firstLine.split("\t").length > firstLine.split(",").length) ? "\t" : ",";
    var rows = [], row = [], field = "", inQuotes = false;
    for (var i = 0; i < text.length; i++){
      var c = text[i];
      if (inQuotes){
        if (c === '"'){
          if (text[i+1] === '"'){ field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === delim){ row.push(field); field = ""; }
        else if (c === "\n" || c === "\r"){
          if (c === "\r" && text[i+1] === "\n") i++;
          row.push(field); field = "";
          if (!(row.length === 1 && row[0] === "")) rows.push(row);
          row = [];
        } else field += c;
      }
    }
    if (field.length || row.length){ row.push(field); if (!(row.length === 1 && row[0] === "")) rows.push(row); }
    return rows;
  }

  function toCSV(headers, rows){
    function e(v){
      v = String(v == null ? "" : v);
      if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
      return v;
    }
    var lines = [headers.map(e).join(",")];
    for (var i = 0; i < rows.length; i++) lines.push(rows[i].map(e).join(","));
    return lines.join("\n");
  }

  // ---- Home screen (app tiles) ----
  function homeApps(){
    var apps = SECTIONS.map(function(s){ return { key: s.key, label: s.label, icon: s.icon }; });
    if (isArtifactOwner) apps.push({ key: "repository", label: "Calibration Log", icon: "book" });
    CONFIG.forEach(function(s){ apps.push({ key: s.key, label: s.label, icon: s.icon }); });
    return apps;
  }

  function homeBadgeCount(key){
    if (key === "data") return state.rows.length;
    if (key === "team") return state.analysis ? state.analysis.team_themes.length : 0;
    if (key === "cohorts") return state.cohorts.length;
    if (key === "repository") return state.learnings ? state.learnings.length : 0;
    return 0;
  }

  function homeGreeting(){
    var h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }

  function renderHome(){
    var today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    var ctx = state.pullContext;
    var subLine = esc(today) + (ctx ? " &middot; Last saved: Week " + esc(ctx.week) + (ctx.targetLabel ? ", " + esc(ctx.targetLabel) : "") : "");

    var tiles = homeApps().map(function(a){
      var count = homeBadgeCount(a.key);
      var badge = count ? "<span class=\"app-badge\">" + (count > 99 ? "99+" : count) + "</span>" : "";
      return "<button class=\"app-tile\" data-open-app=\"" + a.key + "\" type=\"button\">" +
        "<span class=\"app-icon\" style=\"--tile-bg:var(--tile-" + a.key + ");\">" + ICONS[a.icon] + badge + "</span>" +
        "<span class=\"app-label\">" + esc(a.label) + "</span>" +
      "</button>";
    }).join("");

    var soonTiles = SOON.map(function(s){
      return "<button class=\"app-tile soon\" type=\"button\" disabled title=\"Coming soon\">" +
        "<span class=\"app-icon\">" + ICONS[s.icon] + "</span>" +
        "<span class=\"app-label\">" + esc(s.label) + "</span>" +
      "</button>";
    }).join("");

    el.homeHeader.innerHTML =
      "<div class=\"brand\">" +
        "<span class=\"mark\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"></circle><polygon points=\"14.5 9.5 12 12 9.5 14.5 12 12 14.5 9.5\"></polygon></svg></span>" +
        "<span class=\"word\">Metrics and Coaching</span>" +
      "</div>" +
      "<div class=\"home-greeting\"><h1>" + homeGreeting() + "</h1><p>" + subLine + "</p></div>";

    el.homeApps.innerHTML =
      "<div class=\"app-grid dock\">" + tiles + "</div>" +
      "<p class=\"home-section-label\">Coming soon</p>" +
      "<div class=\"app-grid\">" + soonTiles + "</div>" +
      "<p class=\"home-foot\">Analysis runs through your own Claude account, directly in the browser.</p>";
  }

  function openApp(key){
    if (key === "repository"){ openRepository(); return; }
    if (key === "data"){ state.dataTab = "pull"; renderDataPanel(); }
    setSection(key);
  }

  function goHome(){ setSection("home"); }

  function setSection(key){
    state.section = key;
    document.querySelectorAll(".panel").forEach(function(p){ p.classList.toggle("visible", p.getAttribute("data-panel") === key); });
    var meta = SECTION_META[key];
    el.sectionEyebrow.textContent = meta.eyebrow;
    el.sectionTitle.textContent = meta.title;
    el.sectionSub.textContent = meta.sub;
    renderHome();
    renderStats();
    renderBreadcrumb();
    el.askFab.classList.toggle("active", key === "ask");
    updateReportActions();
    ccScroll.scrollTop = 0;
  }

  // ---- Navigation history (universal back button) ----
  // Tracks a snapshot of every state field that affects where you are in the app —
  // not just the current tab's own drill-down — so Back can return to whatever
  // page you were on before, even if it was a different tab entirely.
  var navHistory = [];
  var lastNavSnapshotJSON = null;
  var navRestoring = false;

  function navSnapshot(){
    return {
      section: state.section,
      selectedTrainee: state.selectedTrainee,
      selectedWeek: state.selectedWeek,
      selectedCohortId: state.selectedCohortId,
      cohortDetailWeekId: state.cohortDetailWeekId,
      cohortDetailView: state.cohortDetailView,
      cohortDetailTraineeId: state.cohortDetailTraineeId,
      resourceTab: state.resourceTab,
      rosterTab: state.rosterTab,
      dataTab: state.dataTab
    };
  }

  // A multi-step jump (Calibration Log → a finding) records only where it started,
  // so Back returns there in one step instead of walking the in-between pages.
  var navJumpFrom = null, navJumpTimer = null;
  function startNavJump(){
    finishNavJump();
    navJumpFrom = lastNavSnapshotJSON || JSON.stringify(navSnapshot());
    navJumpTimer = setTimeout(finishNavJump, 8000); // never leave history switched off
  }
  function finishNavJump(){
    if (navJumpTimer){ clearTimeout(navJumpTimer); navJumpTimer = null; }
    if (!navJumpFrom) return;
    var from = navJumpFrom;
    navJumpFrom = null;
    if (from !== lastNavSnapshotJSON){
      navHistory.push(JSON.parse(from));
      if (navHistory.length > 50) navHistory.shift();
    }
    renderBreadcrumb();
  }

  function trackNavHistory(){
    var json = JSON.stringify(navSnapshot());
    if (lastNavSnapshotJSON === null){ lastNavSnapshotJSON = json; return; }
    if (json === lastNavSnapshotJSON) return;
    if (navJumpFrom){ lastNavSnapshotJSON = json; return; }
    if (!navRestoring){
      navHistory.push(JSON.parse(lastNavSnapshotJSON));
      if (navHistory.length > 50) navHistory.shift();
    }
    lastNavSnapshotJSON = json;
  }

  function applyNavSnapshot(snap){
    var needsCohortSub = snap.section === "cohorts" && !!snap.selectedCohortId;
    if (needsCohortSub){
      if (state.selectedCohortId !== snap.selectedCohortId || !cohortAnalysesUnsub) openCohortDetail(snap.selectedCohortId);
      state.cohortDetailWeekId = snap.cohortDetailWeekId || null;
      state.cohortDetailView = snap.cohortDetailView || null;
      state.cohortDetailTraineeId = snap.cohortDetailTraineeId || null;
    } else {
      if (cohortAnalysesUnsub){ cohortAnalysesUnsub(); cohortAnalysesUnsub = null; }
      state.selectedCohortId = null;
      state.cohortAnalyses = null;
      state.cohortDetailWeekId = null;
      state.cohortDetailView = null;
    }
    state.section = snap.section;
    state.selectedTrainee = snap.selectedTrainee || null;
    state.selectedWeek = snap.selectedWeek || null;
    state.resourceTab = snap.resourceTab || "knowledge_base";
    state.rosterTab = snap.rosterTab || "trainee";
    state.dataTab = snap.dataTab || "pull";

    document.querySelectorAll(".panel").forEach(function(p){ p.classList.toggle("visible", p.getAttribute("data-panel") === state.section); });
    var meta = SECTION_META[state.section];
    el.sectionEyebrow.textContent = meta.eyebrow;
    el.sectionTitle.textContent = meta.title;
    el.sectionSub.textContent = meta.sub;
    renderAll();
  }

  function navigateBack(){
    if (!navHistory.length) return;
    var prev = navHistory.pop();
    navRestoring = true;
    applyNavSnapshot(prev);
    navRestoring = false;
  }

  // ---- Breadcrumb ----
  function renderBreadcrumb(){
    trackNavHistory();
    var rootMeta = (SECTIONS.concat(CONFIG)).filter(function(s){ return s.key === state.section; })[0];
    var rootLabel = rootMeta ? rootMeta.label : (SECTION_META[state.section] ? SECTION_META[state.section].title : state.section);
    var crumbs = [];

    if (state.section === "individual" && state.selectedTrainee){
      crumbs.push({ label: rootLabel, action: function(){ state.selectedTrainee = null; state.selectedWeek = null; renderIndividual(); renderBreadcrumb(); } });
      crumbs.push({ label: selectedTraineeName() });
    } else if (state.section === "cohorts" && state.selectedCohortId){
      var cohort = state.cohorts.filter(function(c){ return c.id === state.selectedCohortId; })[0];
      crumbs.push({ label: rootLabel, action: closeCohortDetail });
      if (cohort){
        var hasWeek = !!state.cohortDetailWeekId;
        crumbs.push({ label: cohort.name, action: hasWeek ? function(){ state.cohortDetailWeekId = null; state.cohortDetailView = null; renderCohortsPanel(); renderBreadcrumb(); } : null });
        if (hasWeek){
          var pick = (state.cohortAnalyses || []).filter(function(a){ return a.id === state.cohortDetailWeekId; })[0];
          var hasSubView = !!state.cohortDetailView;
          crumbs.push({ label: "Week " + (pick ? pick.week : "…"), action: hasSubView ? function(){ state.cohortDetailView = null; renderCohortsPanel(); renderBreadcrumb(); } : null });
          if (hasSubView){
            crumbs.push({ label: cohortSubViewLabel() });
          }
        }
      }
    } else if (state.section === "data" && state.dataTab === "repository"){
      crumbs.push({ label: rootLabel, action: function(){ setDataTab("pull"); } });
      crumbs.push({ label: "Calibration Log" });
    } else if (state.section === "settings"){
      var onRoot = state.resourceTab === "knowledge_base";
      crumbs.push({ label: rootLabel, action: onRoot ? null : function(){ state.resourceTab = "knowledge_base"; renderSettings(); renderBreadcrumb(); } });
      var rt = RESOURCE_TABS.filter(function(t){ return t.key === state.resourceTab; })[0];
      if (rt && state.resourceTab !== "knowledge_base"){
        var onRosterRoot = state.resourceTab === "roster" && state.rosterTab === "trainee";
        var isRoster = state.resourceTab === "roster";
        crumbs.push({ label: rt.label, action: (isRoster && !onRosterRoot) ? function(){ state.rosterTab = "trainee"; renderRosterPanel(); renderBreadcrumb(); } : null });
        if (isRoster && !onRosterRoot){
          var rtab = ROSTER_TABS.filter(function(t){ return t.key === state.rosterTab; })[0];
          if (rtab) crumbs.push({ label: rtab.label });
        }
      }
    } else {
      crumbs.push({ label: rootLabel });
    }

    var onHome = state.section === "home";
    el.breadcrumb.hidden = onHome;
    el.topbar.hidden = onHome;
    el.pageHead.hidden = onHome;
    el.sectionSub.hidden = onHome;
    ccRoot.classList.toggle("on-home", onHome);
    // Trainer Desk shows these in the window's crumb bar: Trainer Desk › Coaching › …
    if (window.TrainerDesk) window.TrainerDesk.setCrumbs("coaching", onHome ? [] : crumbs.map(function(c){ return { label: c.label, go: c.action || null }; }), goHome);
    if (onHome){ el.breadcrumb.innerHTML = ""; return; }
    crumbs.unshift({ label: "Home", action: goHome });

    var backHtml = "<button class=\"crumb-back\" id=\"crumbBackBtn\" type=\"button\" title=\"Back\"" + (navHistory.length ? "" : " disabled") + ">" + ICONS.arrowLeft + "</button>";

    el.breadcrumb.innerHTML = backHtml + crumbs.map(function(c, i){
      var isLast = i === crumbs.length - 1;
      var sep = i > 0 ? "<span class=\"crumb-sep\">&rsaquo;</span>" : "";
      if (isLast || !c.action) return sep + "<span class=\"" + (isLast ? "crumb-current" : "") + "\">" + esc(c.label) + "</span>";
      return sep + "<button type=\"button\" data-crumb-idx=\"" + i + "\">" + esc(c.label) + "</button>";
    }).join("");

    if (navHistory.length) document.getElementById("crumbBackBtn").addEventListener("click", navigateBack);
    el.breadcrumb.querySelectorAll("[data-crumb-idx]").forEach(function(btn){
      btn.addEventListener("click", crumbs[Number(btn.getAttribute("data-crumb-idx"))].action);
    });
  }

  // ---- Stats ----
  function findScoreIndex(headers){
    var patterns = [/^\s*score\s*$/i, /score/i, /rating|points|grade/i];
    for (var p = 0; p < patterns.length; p++){
      for (var i = 0; i < headers.length; i++) if (patterns[p].test(headers[i])) return i;
    }
    return -1;
  }
  function findNameIndex(headers){
    for (var i = 0; i < headers.length; i++) if (/trainee|agent|rep|employee|name|cleaner|specialist/i.test(headers[i])) return i;
    return -1;
  }
  function guessTraineeCount(){
    var idx = findNameIndex(state.headers);
    if (idx === -1) return null;
    var set = {};
    state.rows.forEach(function(r){ if (r[idx]) set[r[idx].trim()] = true; });
    var n = Object.keys(set).length;
    return n || null;
  }
  // Scoring rule: Pass = 100%, Fail = 0%. A score is passes ÷ audited tickets.
  // Column R of the QA sheet holds it as 1/0 (shown as 100%/0%). Older saved pulls hold the
  // Rating label instead, where "Pass with coaching opportunity" is still a pass (R = 1).
  // Rows with a blank or unrecognized score aren't counted as audited.
  function passFailValue(v){
    var s = String(v == null ? "" : v).trim().toLowerCase();
    if (!s) return null;
    if (/^pass/.test(s)) return 1;
    if (/^fail/.test(s)) return 0;
    var m = s.match(/^(\d+(?:\.\d+)?)\s*(%?)$/);
    if (!m) return null;
    var n = parseFloat(m[1]);
    if (m[2] === "%") n = n / 100;
    return n >= 0 && n <= 1 ? n : null;
  }

  function tallyPassRate(headers, rows){
    var idx = findScoreIndex(headers || []);
    var out = { pass: 0, total: 0 };
    if (idx === -1) return out;
    (rows || []).forEach(function(r){
      var v = passFailValue(r[idx]);
      if (v === null) return;
      out.total++;
      out.pass += v;
    });
    return out;
  }

  function tallyByTrainee(headers, rows){
    var nameIdx = findNameIndex(headers || []);
    var byName = {};
    if (nameIdx === -1) return byName;
    var displayName = {};
    (rows || []).forEach(function(r){
      var name = String(r[nameIdx] || "").trim();
      var key = name.toLowerCase();
      if (!key) return;
      if (!displayName[key]) displayName[key] = name;
      (byName[key] = byName[key] || []).push(r);
    });
    Object.keys(byName).forEach(function(k){ byName[k] = Object.assign(tallyPassRate(headers, byName[k]), { name: displayName[k] }); });
    return byName;
  }

  function pctText(t){ return t && t.total ? Math.round(t.pass / t.total * 100) + "%" : null; }
  function passDetail(t){ return t && t.total ? Math.round(t.pass * 100) / 100 + " of " + t.total + " passed" : null; }

  function scoreChipHtml(t){
    var pct = pctText(t);
    if (!pct) return "";
    return "<span class=\"badge\" title=\"" + esc(passDetail(t)) + "\">Score " + pct + "</span>";
  }

  function traineeTally(name, headers, rows){
    return tallyByTrainee(headers, rows)[String(name || "").trim().toLowerCase()] || null;
  }
  function statTile(label, value, hint){
    return "<div class=\"stat-tile\"><div class=\"s-label\">" + esc(label) + "</div><div class=\"s-value\">" + esc(value) + "</div>" + (hint ? "<div class=\"s-hint\">" + esc(hint) + "</div>" : "") + "</div>";
  }
  function renderStats(){
    var traineeCount = (state.analysis && state.analysis.trainees.length) || guessTraineeCount();
    var tally = tallyPassRate(state.headers, state.rows);
    var themeCount = state.analysis ? state.analysis.team_themes.length : null;
    el.statRow.innerHTML =
      statTile("Audits logged", state.rows.length || "—") +
      statTile("Trainees", traineeCount || "—") +
      statTile("Pass rate", pctText(tally) || "—", tally.total ? passDetail(tally) : (state.rows.length ? "no Pass/Fail scores found" : "save a request to score")) +
      statTile("Themes found", themeCount != null ? themeCount : "—", themeCount != null ? "from latest analysis" : "save a request");
  }

  // ---- Pull request ----
  function selectFieldById(id, label, options, emptyHint){
    var opts = options.length
      ? "<option value=\"\">— Select —</option>" + options.map(function(o){ return "<option value=\"" + esc(o.id) + "\">" + esc(o.name) + "</option>"; }).join("")
      : "<option value=\"\" selected>" + esc(emptyHint) + "</option>";
    return "<div class=\"field\"><label for=\"" + id + "\">" + esc(label) + "</label><select id=\"" + id + "\"" + (options.length ? "" : " disabled") + ">" + opts + "</select></div>";
  }

  function extractDriveFileId(url){
    if (!url) return null;
    var m = /\/d\/([a-zA-Z0-9_-]+)/.exec(url);
    return m ? m[1] : null;
  }

  function unescapeFetchedText(s){
    if (typeof s !== "string") return "";
    return s
      .replace(/\\r\\n|\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, "\"")
      .replace(/\\\[/g, "[").replace(/\\\]/g, "]")
      .replace(/\\\|/g, "|")
      .replace(/\\\\/g, "\\");
  }

  function extractTextFromToolResult(result){
    if (!result) return "";
    var raw = null;
    if (typeof result.payload === "string") raw = result.payload;
    else if (result.payload && typeof result.payload === "object"){
      raw = result.payload.fileContent || result.payload.content || result.payload.text || JSON.stringify(result.payload);
    }
    if (raw == null && Array.isArray(result.content)){
      raw = result.content.filter(function(b){ return b && b.type === "text" && typeof b.text === "string"; }).map(function(b){ return b.text; }).join("\n");
    }
    if (typeof raw !== "string") return "";
    var trimmed = raw.trim();
    if (trimmed.charAt(0) === "{" || trimmed.charAt(0) === "["){
      try {
        var parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object") raw = parsed.fileContent || parsed.content || parsed.text || raw;
      } catch (e){ /* not JSON, keep raw text as-is */ }
    }
    return unescapeFetchedText(raw);
  }

  function splitPipeRow(line){
    var cells = line.split("|").map(function(c){ return c.trim(); });
    if (cells.length && cells[0] === "") cells.shift();
    if (cells.length && cells[cells.length - 1] === "") cells.pop();
    return cells;
  }

  function isSeparatorRow(cells){
    return cells.every(function(c){ return /^:?-{2,}:?$/.test(c) || c === ""; });
  }

  function parseMarkdownTable(text){
    var lines = text.split("\n").map(function(l){ return l.trim(); }).filter(function(l){ return l.indexOf("|") !== -1; });
    if (!lines.length) return null;
    var rows = lines.map(splitPipeRow).filter(function(cells){ return cells.length > 0; });
    rows = rows.filter(function(r){ return !isSeparatorRow(r); });
    return rows.length > 1 ? rows : null;
  }

  var EXTRACT_COLUMNS = ["Week", "Trainee (CRM name)", "Rating", "Resolution markdown", "Communication markdown", "Score"];

  // The Drive connector can't scope a fetch to one tab or column range — it hands back a
  // natural-language dump of the whole workbook. Since tab names never survive that export,
  // matching sections are found by their column headers instead (Week Number + CRM Name),
  // then filtered down to the requested week and trainee(s). This never sends the raw dump
  // to Claude, so it can't silently fail on a huge sheet and fall back to unfiltered data.
  // A header row names Week Number and CRM Name. It is an audit tab only when it also has
  // "Score" (column R); "Reviewed Tickets" has no Score and lists every audit a second time.
  function auditHeader(cells){
    var lower = cells.map(function(c){ return String(c == null ? "" : c).trim().toLowerCase(); });
    var weekIdx = lower.indexOf("week number") !== -1 ? lower.indexOf("week number") : lower.indexOf("week");
    var crmIdx = lower.findIndex(function(c){ return c.indexOf("crm name") !== -1; });
    if (weekIdx === -1 || crmIdx === -1) return null;
    var scoreIdx = lower.lastIndexOf("score");
    if (scoreIdx === -1) return { notAudit: true };
    return {
      weekIdx: weekIdx,
      crmIdx: crmIdx,
      ticketIdx: lower.findIndex(function(c){ return c.indexOf("ticket link") !== -1; }),
      ratingIdx: lower.indexOf("rating"),
      resolutionIdx: lower.findIndex(function(c){ return c.indexOf("comments on resolution") !== -1; }),
      commsIdx: lower.findIndex(function(c){ return c.indexOf("comments on comm") !== -1; }),
      scoreIdx: scoreIdx,
      rows: []
    };
  }

  function auditTablesFromRows(rowsOfCells){
    var tables = [], current = null;
    rowsOfCells.forEach(function(cells){
      if (!cells.length) return;
      var h = auditHeader(cells);
      if (h){ current = h.notAudit ? null : h; if (current) tables.push(current); return; }
      if (current && cells.length > current.weekIdx && cells.length > current.crmIdx) current.rows.push(cells);
    });
    return tables;
  }

  function findAuditTables(text){
    return auditTablesFromRows(text.split("\n")
      .filter(function(line){ return line.indexOf("|") !== -1; })
      .map(splitPipeRow)
      .filter(function(cells){ return cells.length && !isSeparatorRow(cells); }));
  }

  // Filter tabs ("Feedback Filter") repeat audit rows, so the same ticket can appear twice.
  function extractRowsClientSide(tables, ctx){
    var wantWeek = String(ctx.week).trim();
    var wantCrm = (ctx.mode === "trainee" ? [ctx.targetCrm] : (ctx.memberCrmNames || []))
      .map(function(s){ return (s || "").trim().toLowerCase(); }).filter(Boolean);
    var out = [], seen = {};
    tables.forEach(function(t){
      t.rows.forEach(function(r){
        var cell = function(i){ return i !== -1 ? String(r[i] == null ? "" : r[i]).trim() : ""; };
        var week = cell(t.weekIdx), crm = cell(t.crmIdx);
        if (week !== wantWeek || !crm) return;
        if (wantCrm.length && wantCrm.indexOf(crm.toLowerCase()) === -1) return;
        var ticket = cell(t.ticketIdx);
        if (ticket){
          var key = week + "|" + crm.toLowerCase() + "|" + ticket;
          if (seen[key]) return;
          seen[key] = true;
        }
        out.push({
          week: week,
          trainee: crm,
          rating: cell(t.ratingIdx),
          resolution_markdown: cell(t.resolutionIdx),
          communication_markdown: cell(t.commsIdx),
          score: cell(t.scoreIdx)
        });
      });
    });
    return out;
  }

  function base64ToUtf8(b64){
    var bin = atob(String(b64).replace(/\s+/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }

  function downloadedText(result){
    var p = result && result.payload;
    if (typeof p === "string"){ try { p = JSON.parse(p); } catch (e){ p = null; } }
    if ((!p || !p.content) && result && Array.isArray(result.content)){
      var t = result.content.filter(function(b){ return b && b.type === "text"; }).map(function(b){ return b.text; }).join("");
      try { p = JSON.parse(t); } catch (e){ p = null; }
    }
    return p && typeof p.content === "string" ? base64ToUtf8(p.content) : null;
  }

  // Complete source: Drive's CSV export is the first tab only, in full, with real column
  // positions. It counts only when that tab starts with the audit header (row 1), which is
  // what the "Nesting audits - Feedback" tab looks like; filter tabs start with instructions.
  function readFirstTabAudits(fileId){
    return mcpFn.callTool("Google Drive", "download_file_content", { fileId: fileId, exportMimeType: "text/csv" })
      .then(function(result){
        var text = downloadedText(result);
        if (!text) return null;
        var rows = parseCSV(text.replace(/^\uFEFF/, ""));
        var h = rows.length ? auditHeader(rows[0]) : null;
        if (!h || h.notAudit) return null;
        h.rows = rows.slice(1);
        return [h];
      })
      .catch(function(){ return null; });
  }

  function renderFetchPreviewModal(rows, rawText){
    var bodyHtml, title, hint;

    if (rows){
      title = "Filtered audit rows";
      hint = rows.length
        ? "Matched by the sheet's own “Week Number” and “CRM Name” columns and filtered to this request's week and trainee(s) &mdash; everything else in the workbook was skipped."
        : "No matching rows were found. Double-check the week number and that the CRM name(s) on the roster match the sheet exactly.";
      if (rows.length){
        bodyHtml = "<div style=\"overflow:auto;max-height:360px;border:1px solid var(--line);border-radius:10px;\"><table class=\"preview\"><thead><tr>" +
          EXTRACT_COLUMNS.map(function(c){ return "<th>" + esc(c) + "</th>"; }).join("") +
          "</tr></thead><tbody>" +
          rows.map(function(r){
            return "<tr><td>" + esc(r.week) + "</td><td>" + esc(r.trainee) + "</td><td>" + esc(r.rating) + "</td><td>" + esc(r.resolution_markdown) + "</td><td>" + esc(r.communication_markdown) + "</td><td>" + esc(r.score) + "</td></tr>";
          }).join("") +
          "</tbody></table></div>";
      } else {
        bodyHtml = "";
      }
    } else {
      title = "Fetched from the QA sheet";
      hint = "This is the raw export of the whole workbook, for troubleshooting &mdash; it can include other tabs, merged filter cells, or instructions that don't belong in the audit data.";
      var mdRows = parseMarkdownTable(rawText);
      if (mdRows){
        bodyHtml = "<div style=\"overflow:auto;max-height:360px;border:1px solid var(--line);border-radius:10px;\"><table class=\"preview\"><thead><tr>" +
          mdRows[0].map(function(c){ return "<th>" + esc(c) + "</th>"; }).join("") +
          "</tr></thead><tbody>" +
          mdRows.slice(1).map(function(r){ return "<tr>" + r.map(function(c){ return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") +
          "</tbody></table></div>";
      } else {
        bodyHtml = "<pre style=\"white-space:pre-wrap;word-break:break-word;max-height:360px;overflow:auto;background:var(--surface-2);border-radius:10px;padding:12px;font-size:12.5px;margin:0;\">" + esc(rawText) + "</pre>";
      }
    }

    openModal(
      "<h3 class=\"modal-title\">" + title + "</h3>" +
      "<p class=\"hint\" style=\"margin:-8px 0 14px;\">" + hint + "</p>" +
      bodyHtml +
      "<div class=\"modal-actions\">" +
        (rows ? "<button class=\"ghost small\" id=\"viewRawFetchBtn\" type=\"button\" style=\"margin-right:auto;\">View raw sheet export</button>" : "") +
        "<button class=\"" + (rows ? "primary" : "ghost") + " small\" id=\"dismissFetchPreviewBtn\" type=\"button\">Close</button>" +
      "</div>"
    );
    document.getElementById("dismissFetchPreviewBtn").addEventListener("click", closeModal);
    var viewRawBtn = document.getElementById("viewRawFetchBtn");
    if (viewRawBtn) viewRawBtn.addEventListener("click", function(){ renderFetchPreviewModal(null, rawText); });
  }

  function pullFetchErrorCopy(code){
    switch (code){
      case "needs_reauth": return "Google Drive needs to be reconnected";
      case "server_not_connected": return "Google Drive isn't connected";
      case "consent_required": return "Drive access wasn't allowed";
      case "not_in_manifest": case "blocked_by_policy": return "not allowed for this account";
      case "cancelled": return "cancelled";
      default: return "connector error";
    }
  }

  // ---- Analysis ----
  function buildPrompt(csvText, truncatedFrom, c, headers, rows){
    var truncNote = truncatedFrom ? ("\n\nNote: this is the first " + MAX_ROWS + " of " + truncatedFrom + " total rows; analyze what is given.") : "";
    var contextNote = "";
    if (c){
      contextNote = c.mode === "trainee"
        ? "\n\nThis batch was pulled for Week " + c.week + ", trainee " + c.targetLabel + " only. Frame team_themes as patterns across THIS trainee's own audits over time (not the whole team), and make sure the \"trainees\" array contains exactly this one trainee."
        : "\n\nThis batch was pulled for Week " + c.week + ", the \"" + c.targetLabel + "\" cohort" + (c.memberNames && c.memberNames.length ? " (members: " + c.memberNames.join(", ") + ")" : "") + ". Cover every member who appears in the data.";
    }
    var columnNote = "\n\nThe sheet these rows come from typically uses this layout: a week number, the trainee's CRM name, a resolution markdown flag (whether the trainee was marked down on how they resolved the ticket), a communication markdown flag (whether they were marked down on how they communicated), and a score that today is only Pass or Fail. Weigh both markdown flags explicitly when you assess a trainee — call out in recurring_issues whenever a resolution or communication markdown shows up more than once for someone.";
    var byTrainee = tallyByTrainee(headers, rows);
    var scoreLines = Object.keys(byTrainee).filter(function(k){ return byTrainee[k].total; }).map(function(k){
      var t = byTrainee[k];
      return "- " + k + ": " + pctText(t) + " (" + passDetail(t) + ")";
    });
    var scoreNote = scoreLines.length
      ? "\n\nScoring rule: the Score column (column R of the QA sheet) is the exact score — 100% (1) = Pass, 0% (0) = Fail; \"Pass with coaching opportunity\" in the Rating column still counts as a pass. A trainee's score is passes divided by audited tickets. These scores are already computed from the data — use them as-is and do not recompute or estimate your own:\n" + scoreLines.join("\n")
      : "";
    return "You are an experienced QA coach for a customer-facing support team. Below is a CSV export of QA audit records for trainees. Column names vary by team, but typically include a trainee name, a date or session identifier, an auditor, a category or criteria being scored, a numeric or pass/fail score, and free-text notes describing what happened." + columnNote + contextNote + scoreNote + "\n\n" +
      "Read every row carefully, including the free-text notes, and do the following:\n\n" +
      "1. Identify the most common THEMES across mistakes or issues in the notes, ranked by how often they appear or how much they affect quality. For each theme, give: a short frequency indicator (e.g. \"5 of 12 audits\" or \"3 of 4 trainees\"), a rough frequency_pct estimate (0-100, the share of audits or trainees it affects), a one-sentence description of the pattern, a concrete coaching recommendation a team lead could act on this week, and 2-3 ready-to-use team talking points.\n" +
      "2. For EACH distinct trainee named in the data, write a short coaching brief: what they consistently do well (strengths), their recurring issues, and 2-4 specific, supportive, non-accusatory talking points a coach could actually say out loud in a 1:1 (phrase them as things to say, not just topics to cover).\n" +
      "3. Write a 2-3 sentence overview summary for the QA lead reading this.\n\n" +
      "If a column's meaning is ambiguous, use your best judgement from its header name and values. If scores are present, weigh them alongside the notes.\n\n" +
      "Audit data (CSV):\n\"\"\"\n" + csvText + "\n\"\"\"" + truncNote + "\n\n" +
      "Reply with ONLY a single JSON object, no other text and no markdown code fences, matching exactly this shape:\n" +
      "{\n" +
      '  "summary": "string",\n' +
      '  "team_themes": [\n' +
      "    {\n" +
      '      "theme": "string",\n' +
      '      "frequency": "string",\n' +
      '      "frequency_pct": 0,\n' +
      '      "description": "string",\n' +
      '      "coaching_recommendation": "string",\n' +
      '      "talking_points": ["string"]\n' +
      "    }\n" +
      "  ],\n" +
      '  "trainees": [\n' +
      "    {\n" +
      '      "name": "string, exactly as it appears in the data",\n' +
      '      "audit_count": 0,\n' +
      '      "strengths": ["string"],\n' +
      '      "recurring_issues": ["string"],\n' +
      '      "talking_points": ["string"],\n' +
      '      "suggested_focus": "string"\n' +
      "    }\n" +
      "  ]\n" +
      "}";
  }

  function errorCopy(code){
    switch (code){
      case "not_granted": return "Claude access isn't allowed for this page in your account. Ask whoever manages Claude access to enable it.";
      case "sampling_disabled": return "Claude isn't available for this account right now.";
      case "capability_disabled": case "capability_removed": case "not_declared": return "Analysis isn't available in this view of the page.";
      case "rate_limited": return "Too many requests right now &mdash; wait a moment and try again.";
      case "prompt_too_large": return "That's a lot of audit data. Try analyzing a smaller batch (one team, week, or month at a time).";
      case "refused": return "Claude declined to analyze this data. Double-check it doesn't contain anything unexpected, then try again.";
      case "invalid_json": return "Got an answer back but couldn't read it as structured data. Try again.";
      case "cancelled": return null;
      case "empty_completion": return "Claude didn't return anything usable. Try again with fewer rows.";
      default: return "Something went wrong reaching Claude. Try again in a moment.";
    }
  }

  function normalizeAnalysis(data){
    data = data && typeof data === "object" ? data : {};
    var themes = Array.isArray(data.team_themes) ? data.team_themes : [];
    var trainees = Array.isArray(data.trainees) ? data.trainees : [];
    return {
      summary: typeof data.summary === "string" ? data.summary : "",
      team_themes: themes.map(function(t){
        t = t || {};
        var pct = Number(t.frequency_pct);
        return {
          theme: t.theme || "Untitled theme",
          frequency: t.frequency || "",
          frequency_pct: isFinite(pct) ? Math.max(0, Math.min(100, pct)) : null,
          description: t.description || "",
          coaching_recommendation: t.coaching_recommendation || "",
          talking_points: Array.isArray(t.talking_points) ? t.talking_points : []
        };
      }),
      trainees: trainees.map(function(t){
        t = t || {};
        return {
          name: t.name || "Unnamed",
          audit_count: t.audit_count || null,
          strengths: Array.isArray(t.strengths) ? t.strengths : [],
          recurring_issues: Array.isArray(t.recurring_issues) ? t.recurring_issues : [],
          talking_points: Array.isArray(t.talking_points) ? t.talking_points : [],
          suggested_focus: t.suggested_focus || ""
        };
      })
    };
  }

  // One doc per (target, week) — a fresh pull for the same week fully replaces
  // the last one, and running Analyze afterward layers the coaching write onto it.
  function pullDocId(ctx){
    return ctx.targetId + "_w" + String(ctx.week).trim();
  }

  // The live analysis only exists in memory, so a reload (or a new version of the page)
  // used to leave Home, Team coaching and Individual coaching empty. Reopen the most
  // recently analyzed pull instead — unless this session already has data loaded.
  function loadLatestSavedAnalysis(){
    if (!dbFn || state.analysis || state.rows.length) return;
    dbFn.collection("analyses").orderBy("analyzed_at", "desc").limit(1).get().then(function(snap){
      var doc = snap.docs[0];
      if (!doc || state.analysis || state.rows.length) return;
      var data = thawed(doc.data());
      if (!data.analyzed_at || !Array.isArray(data.team_themes)) return;
      applySavedPull(data);
      renderAll();
    }).catch(function(){ /* leave the empty state; requesting a week still works */ });
  }

  // Home, Team coaching and Individual coaching show the latest SAVED pull.
  function applySavedPull(data){
    state.analysis = normalizeAnalysis(data);
    state.headers = data.headers || [];
    state.rows = data.rows || [];
    state.pullContext = { mode: data.mode === "cohort" ? "cohort" : "trainee", week: data.week, targetId: data.target_id, targetLabel: data.target_label || "", memberNames: data.member_names || null };
    state.selectedTrainee = state.analysis.trainees.length ? state.analysis.trainees[0].name : null;
  }

  // ---- QA Data Request: request → fetch → analyze → Save or Discard ----
  // The page holds no view of past pulls. A result lives only in memory until the coach
  // saves it; a new request, Discard, or a reload drops it.
  var REQUEST_KINDS = [
    { mode: "trainee", title: "Individual trainee", hint: "One trainee's audits for a week.", label: "Trainee", icon: "user" },
    { mode: "cohort", title: "Entire team", hint: "Every trainee in a cohort for a week.", label: "Cohort", icon: "users" }
  ];

  function requestBusy(){
    var r = state.request;
    return !!r && (r.status === "fetching" || r.status === "analyzing" || r.status === "saving");
  }

  function renderRequestForms(){
    var busy = requestBusy();
    // Roster snapshots re-render the page; don't wipe a field the coach is typing in.
    if (el.requestForms.children.length && el.requestForms.contains(document.activeElement)){
      el.requestForms.querySelectorAll("[data-req-submit]").forEach(function(b){ b.disabled = busy; });
      return;
    }
    el.requestForms.innerHTML = REQUEST_KINDS.map(function(k){
      var draft = state.reqDraft[k.mode];
      var list = k.mode === "trainee" ? state.trainees : state.cohorts;
      var emptyHint = k.mode === "trainee" ? "Add a trainee under Settings → Roster first" : "Add a cohort under Cohorts first";
      var opts = list.length
        ? "<option value=\"\">— Select —</option>" + list.map(function(o){ return "<option value=\"" + esc(o.id) + "\"" + (o.id === draft.target ? " selected" : "") + ">" + esc(o.name) + "</option>"; }).join("")
        : "<option value=\"\">" + esc(emptyHint) + "</option>";
      return "<div class=\"card request-card\">" +
        "<div class=\"resource-head\"><span class=\"r-icon\">" + ICONS[k.icon] + "</span><h2>" + k.title + "</h2></div>" +
        "<p class=\"hint\">" + k.hint + "</p>" +
        "<div class=\"field\"><label for=\"reqWeek-" + k.mode + "\">Week number</label><input type=\"text\" inputmode=\"numeric\" id=\"reqWeek-" + k.mode + "\" data-req-week=\"" + k.mode + "\" placeholder=\"e.g. 558\" value=\"" + esc(draft.week) + "\"></div>" +
        "<div class=\"field\"><label for=\"reqTarget-" + k.mode + "\">" + k.label + "</label><select id=\"reqTarget-" + k.mode + "\" data-req-target=\"" + k.mode + "\"" + (list.length ? "" : " disabled") + ">" + opts + "</select></div>" +
        "<div class=\"settings-foot\"><button class=\"primary small\" data-req-submit=\"" + k.mode + "\" type=\"button\"" + (busy ? " disabled" : "") + ">Pull &amp; analyze</button><span class=\"save-status\" id=\"reqStatus-" + k.mode + "\"></span></div>" +
      "</div>";
    }).join("");
  }

  function submitRequest(mode){
    if (requestBusy()) return;
    var draft = state.reqDraft[mode];
    var statusEl = document.getElementById("reqStatus-" + mode);
    function fail(msg){ if (statusEl){ statusEl.textContent = msg; statusEl.className = "save-status err"; } }
    var week = String(draft.week || "").trim();
    if (!week) return fail("Week number is required.");
    if (!draft.target) return fail(mode === "trainee" ? "Choose a trainee." : "Choose a cohort.");

    var ctx;
    if (mode === "trainee"){
      var t = state.trainees.filter(function(x){ return x.id === draft.target; })[0];
      if (!t) return fail("That trainee is no longer on the roster.");
      if (!(t.crm_name || "").trim()) return fail("Add this trainee's CRM name under Settings → Roster first.");
      ctx = { mode: "trainee", week: week, side: sideForDepartment(t.department), targetId: t.id, targetLabel: t.name, targetCrm: t.crm_name, memberNames: null, memberCrmNames: null };
    } else {
      var c = state.cohorts.filter(function(x){ return x.id === draft.target; })[0];
      if (!c) return fail("That cohort no longer exists.");
      var members = (c.trainee_ids || []).map(function(id){ return state.trainees.filter(function(x){ return x.id === id; })[0] || null; }).filter(Boolean);
      var crmNames = members.map(function(m){ return (m.crm_name || "").trim(); }).filter(Boolean);
      if (!crmNames.length) return fail("None of this cohort's trainees has a CRM name yet.");
      ctx = { mode: "cohort", week: week, side: sideForDepartment(c.department), targetId: c.id, targetLabel: c.name, targetCrm: "", memberNames: members.map(function(m){ return m.name; }).filter(Boolean), memberCrmNames: crmNames };
    }
    if (statusEl){ statusEl.textContent = ""; statusEl.className = "save-status"; }
    var req = { ctx: ctx, status: "fetching", headers: EXTRACT_COLUMNS, rows: [], analysis: null, error: null, fetchedText: null, extracted: null };
    state.request = req;
    renderDataRequest();
    fetchForRequest(req);
  }

  function fetchForRequest(req){
    var sideKey = req.ctx.side === "cp_side" ? "cp_side" : "c_side";
    var sideName = sideKey === "cp_side" ? "CP side" : "C side";
    var fileId = extractDriveFileId((state.settings[sideKey] || {}).url);
    function failed(msg){ req.status = "fetch_failed"; req.error = msg; renderDataRequest(); }
    if (!fileId) return failed("No " + sideName + " QA sheet is set up yet (Trainer Desk → Settings → QA Sheets).");
    if (!mcpFn) return failed("Google Drive isn't available in this view.");

    function useTables(tables){
      var found = extractRowsClientSide(tables, req.ctx);
      req.extracted = found;
      if (!found.length){ req.status = "no_rows"; req.error = null; renderDataRequest(); return; }
      req.rows = found.map(function(r){ return [r.week, r.trainee, r.rating, r.resolution_markdown, r.communication_markdown, r.score]; });
      analyzeRequest(req);
    }

    readFirstTabAudits(fileId).then(function(tables){
      if (state.request !== req) return;
      if (tables){ req.source = "full"; useTables(tables); return; }
      // Fallback: the connector's readable text of the whole workbook. For a workbook this
      // large it holds only the top rows of each tab, and the newest week sits at the top,
      // so older weeks come back short or empty.
      req.source = "partial";
      mcpFn.callTool("Google Drive", "read_file_content", { fileId: fileId })
        .then(function(result){
          if (state.request !== req) return;
          var text = extractTextFromToolResult(result);
          if (!text) return failed("The QA sheet came back empty.");
          req.fetchedText = text;
          var t = findAuditTables(text);
          if (!t.length){ req.status = "no_rows"; req.error = "no_tables"; renderDataRequest(); return; }
          useTables(t);
        })
        .catch(function(e){
          if (state.request !== req) return;
          failed("Auto-fetch from the QA sheet didn't work (" + pullFetchErrorCopy(e && e.code) + ").");
        });
    });
  }

  function analyzeRequest(req){
    if (!sampleFn){ req.status = "analysis_failed"; req.error = "Analysis isn't available in this view."; renderDataRequest(); return; }
    var truncated = req.rows.length > MAX_ROWS;
    var useRows = truncated ? req.rows.slice(0, MAX_ROWS) : req.rows;
    var prompt = buildPrompt(toCSV(req.headers, useRows), truncated ? req.rows.length : null, req.ctx, req.headers, req.rows);
    req.status = "analyzing";
    req.error = null;
    abortCtl = new AbortController();
    renderDataRequest();
    sampleFn.json(prompt, {
      modelTier: "complex",
      signal: abortCtl.signal,
      cache: false,
      onText: function(u){
        var n = state.request === req && document.getElementById("reqProgress");
        if (n) n.textContent = "Drafting coaching notes… (" + u.text.length + " characters so far)";
      }
    }).then(function(data){
      if (state.request !== req) return;
      req.analysis = normalizeAnalysis(data);
      req.status = "ready";
      renderDataRequest();
    }).catch(function(e){
      if (state.request !== req) return;
      req.status = "analysis_failed";
      req.error = (e && e.code === "cancelled") ? "Analysis stopped." : (errorCopy(e && e.code) || "Something went wrong reaching Claude.");
      renderDataRequest();
    });
  }

  function analyzePastedRows(){
    var req = state.request;
    var box = document.getElementById("reqPaste");
    if (!req || !box) return;
    var parsed = parseCSV(box.value.trim());
    if (parsed.length < 2){
      var note = document.getElementById("reqPasteNote");
      if (note){ note.textContent = "Paste a header row plus at least one audit row."; note.className = "save-status err"; }
      return;
    }
    req.headers = parsed[0];
    req.rows = parsed.slice(1);
    req.extracted = null;
    analyzeRequest(req);
  }

  function saveRequest(){
    var req = state.request;
    if (!req || (req.status !== "ready" && req.status !== "save_failed")) return;
    if (!dbFn){ req.status = "save_failed"; req.error = "Saving isn't available in this view."; renderDataRequest(); return; }
    var c = req.ctx, now = new Date().toISOString();
    var doc = {
      mode: c.mode, target_id: c.targetId, target_label: c.targetLabel, week: c.week, member_names: c.memberNames || null,
      headers: req.headers, rows: req.rows, pulled_at: now,
      summary: req.analysis.summary, team_themes: req.analysis.team_themes, trainees: req.analysis.trainees, analyzed_at: now
    };
    req.status = "saving";
    renderDataRequest();
    dbFn.doc("analyses/" + pullDocId(c)).set(doc).then(function(){
      if (state.request !== req) return;
      applySavedPull(doc);
      state.request = { status: "saved", ctx: c };
      renderAll();
    }).catch(function(e){
      if (state.request !== req) return;
      req.status = "save_failed";
      req.error = (e && e.code === "invalid_argument") ? "You don't have permission to save here." : "Couldn't save — try again.";
      renderDataRequest();
    });
  }

  function discardRequest(){
    if (abortCtl && state.request && state.request.status === "analyzing") abortCtl.abort();
    state.request = null;
    renderDataRequest();
  }

  function openSavedTarget(ctx){
    if (ctx.mode === "cohort"){
      openCohortDetail(ctx.targetId);
      state.cohortDetailWeekId = pullDocId(ctx);
      setSection("cohorts");
      renderCohortsPanel();
    } else {
      state.selectedTrainee = ctx.targetLabel;
      state.selectedWeek = String(ctx.week);
      setSection("individual");
      renderIndividual();
    }
  }

  function requestRowsPreview(req){
    openModal(
      "<h3 class=\"modal-title\">Pulled rows — Week " + esc(req.ctx.week) + ", " + esc(req.ctx.targetLabel) + "</h3>" +
      "<p class=\"hint\" style=\"margin:-8px 0 14px;\">" + req.rows.length + " audit" + (req.rows.length === 1 ? "" : "s") + ". Nothing is saved until you click Save.</p>" +
      (req.source === "partial" ? partialSourceNote() : "") +
      "<div style=\"overflow:auto;max-height:420px;border:1px solid var(--line);border-radius:10px;\"><table class=\"preview full-text\"><thead><tr>" +
        req.headers.map(function(h){ return "<th>" + esc(h) + "</th>"; }).join("") +
      "</tr></thead><tbody>" +
        req.rows.map(function(r){
          return "<tr>" + r.map(function(v, i){
            var isComment = /markdown|comment|note|feedback/i.test(req.headers[i] || "");
            return isComment ? "<td class=\"comment-col\">" + esc(readableComment(v)) + "</td>" : "<td>" + esc(v) + "</td>";
          }).join("") + "</tr>";
        }).join("") +
      "</tbody></table></div>" +
      "<div class=\"modal-actions\"><button class=\"primary small\" id=\"closeReqPreviewBtn\" type=\"button\">Close</button></div>"
    );
    document.getElementById("closeReqPreviewBtn").addEventListener("click", closeModal);
  }

  function partialSourceNote(){
    return "<div class=\"req-warn\" style=\"margin:0 0 14px;\"><b>This pull may be incomplete.</b> The audits tab isn't the QA sheet's first tab, so Google Drive only hands back the top rows of each tab &mdash; recent weeks come through, older ones get cut off. " +
      "Fix it once: move <b>Nesting audits - Feedback</b> to be the first tab of the sheet, or point Settings → QA Sheets at a sheet whose first tab is the audits.</div>";
  }

  function renderRequestResult(){
    var r = state.request;
    if (!r){ el.requestResult.innerHTML = ""; return; }
    var c = r.ctx;
    var who = c.mode === "trainee" ? esc(c.targetLabel) : esc(c.targetLabel) + " <span class=\"hint\" style=\"margin:0;\">(entire team)</span>";
    var spinner = "<span class=\"spinner\" style=\"display:inline-block;vertical-align:middle;margin-right:8px;\"></span>";
    var body = "", actions = "";

    if (r.status === "saved"){
      el.requestResult.innerHTML =
        "<div class=\"card request-result saved\">" +
          "<p style=\"margin:0;\"><b>Saved.</b> Week " + esc(c.week) + " for " + esc(c.targetLabel) + " is now on " +
            (c.mode === "cohort" ? "the cohort's page" : "Individual coaching") + " and on Home.</p>" +
          "<div class=\"row\" style=\"gap:10px;margin-top:12px;\">" +
            "<button class=\"primary small\" id=\"reqOpenSavedBtn\" type=\"button\">" + (c.mode === "cohort" ? "Open Week " + esc(c.week) + " →" : "Open Individual coaching →") + "</button>" +
            "<button class=\"ghost small\" id=\"reqDismissBtn\" type=\"button\">Dismiss</button>" +
          "</div>" +
        "</div>";
      document.getElementById("reqOpenSavedBtn").addEventListener("click", function(){ var ctx = c; state.request = null; renderDataRequest(); openSavedTarget(ctx); });
      document.getElementById("reqDismissBtn").addEventListener("click", discardRequest);
      return;
    }

    if (r.status === "fetching"){
      body = "<p class=\"hint\" style=\"margin:0;\">" + spinner + "Fetching Week " + esc(c.week) + " from the QA sheet and filtering to " + esc(c.targetLabel) + "…</p>";
    } else if (r.status === "analyzing"){
      body = "<p class=\"hint\" style=\"margin:0;\">" + spinner + "<span id=\"reqProgress\">Analyzing " + r.rows.length + " audit" + (r.rows.length === 1 ? "" : "s") + "…</span></p>";
      actions = "<button class=\"ghost small\" id=\"reqStopBtn\" type=\"button\">Stop</button>";
    } else if (r.status === "fetch_failed"){
      body =
        "<p style=\"margin:0 0 10px;color:var(--danger);\">" + r.error + "</p>" +
        "<p class=\"hint\">Paste the Week " + esc(c.week) + " rows for " + esc(c.targetLabel) + " instead — copy them straight from the QA sheet, header row included.</p>" +
        "<textarea id=\"reqPaste\" spellcheck=\"false\" placeholder=\"Week Number&#9;CRM Name&#9;…&#9;Score\"></textarea>" +
        "<span class=\"save-status\" id=\"reqPasteNote\"></span>";
      actions = "<button class=\"primary small\" id=\"reqAnalyzePasteBtn\" type=\"button\">Analyze pasted rows</button>";
    } else if (r.status === "no_rows"){
      body = r.error === "no_tables"
        ? "<p style=\"margin:0 0 6px;\">Couldn't find the Week Number / CRM Name / Score columns in the QA sheet.</p><p class=\"hint\" style=\"margin:0;\">Check the sheet link under Settings → QA Sheets.</p>"
        : "<p style=\"margin:0 0 6px;\">No audits found for Week " + esc(c.week) + " / " + esc(c.targetLabel) + ".</p><p class=\"hint\" style=\"margin:0;\">Double-check the week number, and that the CRM name" + (c.mode === "cohort" ? "s" : "") + " on the roster match the sheet exactly.</p>";
      if (r.source === "partial") body = partialSourceNote() + body;
      if (r.fetchedText) actions = "<button class=\"link-btn\" id=\"reqRawBtn\" type=\"button\">View raw sheet export</button>";
    } else if (r.status === "analysis_failed"){
      body = "<p style=\"margin:0;color:var(--danger);\">" + r.error + "</p><p class=\"hint\" style=\"margin:6px 0 0;\">" + r.rows.length + " audit" + (r.rows.length === 1 ? "" : "s") + " were pulled.</p>";
      actions = "<button class=\"primary small\" id=\"reqRetryBtn\" type=\"button\">Try analysis again</button>";
    } else {
      var a = r.analysis;
      var tally = tallyPassRate(r.headers, r.rows);
      var byT = tallyByTrainee(r.headers, r.rows);
      var names = Object.keys(byT);
      var stats = [r.rows.length + " audit" + (r.rows.length === 1 ? "" : "s"), names.length + " trainee" + (names.length === 1 ? "" : "s")];
      if (tally.total) stats.push("Pass rate " + pctText(tally) + " (" + passDetail(tally) + ")");
      var chips = names.filter(function(k){ return byT[k].total; }).map(function(k){
        return "<span class=\"req-chip\">" + esc(byT[k].name || k) + " <b>" + pctText(byT[k]) + "</b></span>";
      }).join("");
      var themes = (a.team_themes || []).slice(0, 3).map(function(t){
        return "<li><b>" + esc(t.theme) + "</b>" + (t.frequency ? " <span class=\"hint\" style=\"margin:0;\">— " + esc(t.frequency) + "</span>" : "") + "</li>";
      }).join("");
      body =
        (r.source === "partial" ? partialSourceNote() : "") +
        "<p class=\"hint\" style=\"margin:0 0 10px;\">" + stats.map(esc).join(" &middot; ") + (r.source === "partial" ? " <b style=\"color:var(--warn);\">(may be incomplete)</b>" : "") + "</p>" +
        (a.summary ? "<p style=\"margin:0 0 12px;\">" + esc(a.summary) + "</p>" : "") +
        (themes ? "<p class=\"req-label\">Top themes</p><ul class=\"req-themes\">" + themes + "</ul>" : "") +
        (chips ? "<p class=\"req-label\">Scores</p><div class=\"req-chips\">" + chips + "</div>" : "") +
        "<p class=\"hint\" style=\"margin:14px 0 0;\">" + (r.status === "save_failed" ? "<span style=\"color:var(--danger);\">" + r.error + "</span> " : "") +
          "Not saved yet. Saving adds Week " + esc(c.week) + " to " + (c.mode === "cohort" ? "this cohort's page" : "Individual coaching") + " and Home, replacing anything already saved for that week.</p>";
      actions =
        "<button class=\"primary\" id=\"reqSaveBtn\" type=\"button\"" + (r.status === "saving" ? " disabled" : "") + ">" + (r.status === "saving" ? "Saving…" : "Save") + "</button>" +
        "<button class=\"link-btn\" id=\"reqPreviewBtn\" type=\"button\">Preview pulled rows</button>";
    }

    var closable = r.status !== "saving";
    el.requestResult.innerHTML =
      "<div class=\"card request-result\">" +
        "<div class=\"resource-head\"><h2>Week " + esc(c.week) + " — " + who + "</h2>" +
          (closable ? "<button class=\"ghost small\" id=\"reqDiscardBtn\" style=\"margin-left:auto;\" type=\"button\">" + (r.status === "ready" || r.status === "save_failed" ? "Discard" : (r.status === "fetching" || r.status === "analyzing") ? "Cancel" : "Close") + "</button>" : "") +
        "</div>" +
        body +
        (actions ? "<div class=\"row\" style=\"gap:14px;margin-top:16px;align-items:center;\">" + actions + "</div>" : "") +
      "</div>";

    function on(id, fn){ var b = document.getElementById(id); if (b) b.addEventListener("click", fn); }
    on("reqDiscardBtn", discardRequest);
    on("reqStopBtn", function(){ if (abortCtl) abortCtl.abort(); });
    on("reqAnalyzePasteBtn", analyzePastedRows);
    on("reqRawBtn", function(){ renderFetchPreviewModal(null, r.fetchedText); });
    on("reqRetryBtn", function(){ analyzeRequest(r); });
    on("reqSaveBtn", saveRequest);
    on("reqPreviewBtn", function(){ requestRowsPreview(r); });
  }

  function renderDataRequest(){
    renderRequestForms();
    renderRequestResult();
  }

  // ---- Overview panel ----
  function renderOverview(){
    var a = state.analysis;
    if (!a){
      el.overviewBody.innerHTML =
        "<div class=\"card empty-state\">" + ICONS.empty +
        "<h2>No analysis yet</h2>" +
        "<p>Request a week in QA Data Request and save it to see team themes and coaching talking points here.</p>" +
        "<button class=\"primary small\" data-goto=\"data\" type=\"button\">Go to QA Data Request</button>" +
        "</div>";
      return;
    }
    var topTheme = a.team_themes[0];
    var attention = a.trainees.slice().sort(function(x,y){ return y.recurring_issues.length - x.recurring_issues.length; })[0];
    var html = "<div class=\"summary-callout\"><p class=\"eyebrow\">Latest analysis</p>" + esc(a.summary || "Analysis complete.") + "</div>";
    html += "<div class=\"two-col\">";
    html += "<div class=\"card highlight-card\"><h4>Top team theme</h4>" +
      (topTheme ? "<p class=\"h-title\">" + esc(topTheme.theme) + "</p><p>" + esc(topTheme.description) + "</p><button class=\"ghost small\" data-goto=\"team\" type=\"button\">View team coaching →</button>" : "<p>No themes identified.</p>") +
      "</div>";
    html += "<div class=\"card highlight-card\"><h4>Worth a check-in</h4>" +
      (attention ? "<p class=\"h-title\">" + esc(attention.name) + "</p><p>" + (attention.recurring_issues[0] ? esc(attention.recurring_issues[0]) : "See coaching brief for details.") + "</p><button class=\"ghost small\" data-goto=\"individual\" data-trainee=\"" + esc(attention.name) + "\" type=\"button\">View coaching brief →</button>" : "<p>No individual data identified.</p>") +
      "</div>";
    html += "</div>";
    el.overviewBody.innerHTML = html;
  }

  // ---- Reusable coaching-content renderers ----
  function themesHtml(themes){
    return themes.map(function(t, i){
      var meterHtml = t.frequency_pct != null ? "<div class=\"meter" + (i === 0 ? " top" : "") + "\"><i style=\"width:" + t.frequency_pct + "%\"></i></div>" : "";
      return "<div class=\"theme-card\">" +
        "<div class=\"theme-rank\">" + String(i + 1).padStart(2, "0") + "</div>" +
        "<div class=\"theme-body\">" +
          "<h3>" + esc(t.theme) + "</h3> " + (t.frequency ? "<span class=\"badge\">" + esc(t.frequency) + "</span>" : "") +
          meterHtml +
          (t.description ? "<p class=\"theme-desc\">" + esc(t.description) + "</p>" : "") +
          (t.coaching_recommendation ? "<div class=\"coach-move\"><b>Coaching move &mdash; </b>" + esc(t.coaching_recommendation) + "</div>" : "") +
          (t.talking_points.length ? "<ul class=\"talk\">" + t.talking_points.map(function(p){ return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" : "") +
        "</div>" +
      "</div>";
    }).join("");
  }

  function traineeBriefHtml(t, headers, rows, title, metaLine){
    var tally = traineeTally(t.name, headers, rows);
    return "<h3>" + esc(title || t.name) + "</h3>" +
      "<div class=\"trainee-meta\">" + (metaLine ? metaLine + " &middot; " : "") + (t.audit_count ? t.audit_count + " audit" + (t.audit_count === 1 ? "" : "s") + " reviewed" : "Coaching brief") +
        (tally && tally.total ? " &middot; <b>Score " + pctText(tally) + "</b> (" + esc(passDetail(tally)) + ")" : "") +
      "</div>" +
      "<div class=\"two-col\" style=\"margin-bottom:16px;\">" +
        "<div class=\"mini-card good\"><h4>Doing well</h4>" + (t.strengths.length ? "<ul>" + t.strengths.map(function(s){ return "<li>" + esc(s) + "</li>"; }).join("") + "</ul>" : "<p class=\"hint\" style=\"margin:0;\">Nothing specific surfaced.</p>") + "</div>" +
        "<div class=\"mini-card watch\"><h4>Recurring issues</h4>" + (t.recurring_issues.length ? "<ul>" + t.recurring_issues.map(function(s){ return "<li>" + esc(s) + "</li>"; }).join("") + "</ul>" : "<p class=\"hint\" style=\"margin:0;\">No recurring issues found.</p>") + "</div>" +
      "</div>" +
      (t.talking_points.length ? "<ul class=\"talk\">" + t.talking_points.map(function(p){ return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" : "") +
      (t.suggested_focus ? "<div class=\"focus-line\"><b>Suggested focus &mdash; </b>" + esc(t.suggested_focus) + "</div>" : "");
  }

  // ---- Team panel ----
  // Saved cohort analyses grouped by cohort: { cohortId: { id, name, docs: [newest first] } }.
  // An analysis that hasn't been saved yet shows under its cohort too, until it is saved.
  function teamSources(){
    var byCohort = {};
    var docs = (Array.isArray(state.allAnalyses) ? state.allAnalyses : []).filter(function(d){ return d && d.mode === "cohort" && d.target_id; });
    var c = state.pullContext;
    if (state.analysis && c && c.mode === "cohort" && c.targetId && !docs.some(function(d){ return d.target_id === c.targetId && String(d.week) === String(c.week); })){
      docs = [Object.assign({ id: "current", unsaved: true, week: c.week, mode: "cohort", target_id: c.targetId, target_label: c.targetLabel }, state.analysis)].concat(docs);
    }
    docs.forEach(function(d){
      var g = byCohort[d.target_id] || (byCohort[d.target_id] = { id: d.target_id, name: d.target_label || "Cohort", docs: [] });
      if (normalizeAnalysis(d).team_themes.length) g.docs.push(d);
    });
    Object.keys(byCohort).forEach(function(k){
      byCohort[k].docs.sort(function(a, b){
        var na = Number(a.week), nb = Number(b.week);
        return (isFinite(na) && isFinite(nb)) ? nb - na : (String(b.week) > String(a.week) ? 1 : -1);
      });
    });
    return byCohort;
  }

  // Cohorts newest first (by start date), so the batch being coached sits first as more are added.
  function cohortsNewestFirst(){
    return state.cohorts.slice().sort(function(a, b){
      return String(b.training_start_date || "").localeCompare(String(a.training_start_date || "")) || String(a.name || "").localeCompare(String(b.name || ""));
    });
  }

  function renderTeamPanel(){
    var cohorts = cohortsNewestFirst();
    var src = teamSources();
    if (!cohorts.length){
      el.teamCohortPicker.innerHTML = "";
      el.teamWeekTabs.hidden = true;
      el.teamPanel.innerHTML = "<h2>Team coaching</h2><p class=\"hint\">Add a cohort in Cohorts, then request its audits in QA Data Request to see its recurring themes here.</p>";
      return;
    }
    // Default: the cohort just analyzed, else the first cohort with a saved analysis, else the newest cohort.
    var ids = cohorts.map(function(c){ return c.id; });
    if (!state.teamCohort || ids.indexOf(state.teamCohort) === -1){
      var cur = state.pullContext && state.pullContext.mode === "cohort" ? state.pullContext.targetId : null;
      var withDocs = cohorts.filter(function(c){ return src[c.id] && src[c.id].docs.length; })[0];
      state.teamCohort = (cur && ids.indexOf(cur) !== -1) ? cur : (withDocs || cohorts[0]).id;
    }
    var cohort = cohorts.filter(function(c){ return c.id === state.teamCohort; })[0];
    el.teamCohortPicker.innerHTML = "<span class=\"picker-label\">Cohort</span>" + cohorts.map(function(c){
      var n = src[c.id] ? src[c.id].docs.length : 0;
      return "<button class=\"pill" + (c.id === state.teamCohort ? " active" : "") + "\" data-team-cohort=\"" + esc(c.id) + "\" type=\"button\">" + esc(c.name) +
        (n ? " <span class=\"week-score\">" + n + " wk" + (n === 1 ? "" : "s") + "</span>" : "") + "</button>";
    }).join("");
    var g = src[cohort.id];
    var docs = g ? g.docs : [];
    if (!docs.length){
      el.teamWeekTabs.hidden = true;
      el.teamPanel.innerHTML = "<h2>" + esc(cohort.name) + "</h2><p class=\"hint\">No saved team analysis for this cohort yet. In QA Data Request, pull a week for " + esc(cohort.name) + " and save it to see its recurring themes here.</p>";
      return;
    }
    var pick = docs.filter(function(d){ return String(d.week) === String(state.teamWeek); })[0] || docs[0];
    state.teamWeek = String(pick.week);
    el.teamWeekTabs.hidden = false;
    el.teamWeekTabs.innerHTML = docs.map(function(d){
      return "<button class=\"subtab" + (d === pick ? " active" : "") + "\" data-team-week=\"" + esc(String(d.week)) + "\" type=\"button\">Week " + esc(String(d.week)) + (d.unsaved ? " <span class=\"week-score\">unsaved</span>" : "") + "</button>";
    }).join("");
    var a = normalizeAnalysis(pick);
    el.teamPanel.innerHTML = "<p class=\"trainee-meta\" style=\"margin-bottom:14px;\">" + esc(cohort.name) + " &middot; Week " + esc(String(pick.week)) + "</p>" +
      (a.summary ? "<div class=\"summary-callout\" style=\"margin-bottom:16px;\">" + esc(a.summary) + "</div>" : "") + themesHtml(a.team_themes);
  }

  // ---- Individual panel: one tab per saved week, per trainee ----
  function savedPullSources(){
    if (Array.isArray(state.allAnalyses)) return state.allAnalyses;
    if (!state.analysis) return [];
    var c = state.pullContext || {};
    return [Object.assign({ id: "current", week: c.week, mode: c.mode, target_label: c.targetLabel, headers: state.headers, rows: state.rows }, state.analysis)];
  }

  // key = CRM name (lowercased), the one name the sheet, the rows and the briefs share.
  // Pulls arrive newest first, so when two pulls cover the same week the newer one wins.
  function traineeWeekIndex(){
    var rosterByCrm = {};
    state.trainees.forEach(function(t){ var k = (t.crm_name || "").trim().toLowerCase(); if (k) rosterByCrm[k] = t; });
    var index = {};
    savedPullSources().forEach(function(doc){
      if (!doc || doc.week == null || String(doc.week).trim() === "") return;
      var week = String(doc.week).trim();
      var headers = doc.headers || [], rows = doc.rows || [];
      var nameIdx = findNameIndex(headers);
      var rowsByKey = {};
      rows.forEach(function(r){
        var k = nameIdx === -1 ? "" : String(r[nameIdx] || "").trim().toLowerCase();
        if (k) (rowsByKey[k] = rowsByKey[k] || []).push(r);
      });
      var briefs = normalizeAnalysis({ trainees: doc.trainees }).trainees;
      briefs.forEach(function(t){ var k = t.name.trim().toLowerCase(); if (k && !rowsByKey[k]) rowsByKey[k] = []; });
      Object.keys(rowsByKey).forEach(function(k){
        var entry = index[k] || (index[k] = { key: k, name: rosterByCrm[k] ? rosterByCrm[k].name : "", weeks: {} });
        if (entry.weeks[week]) return;
        var brief = briefs.filter(function(t){ return t.name.trim().toLowerCase() === k; })[0] || null;
        entry.weeks[week] = { week: week, doc: doc, brief: brief, headers: headers, rows: rowsByKey[k] };
        if (!entry.name) entry.name = brief ? brief.name : (rowsByKey[k][0] ? String(rowsByKey[k][0][nameIdx]).trim() : k);
      });
    });
    return index;
  }

  function sortedWeeks(entry){
    return Object.keys(entry.weeks).sort(function(a, b){
      var na = Number(a), nb = Number(b);
      return (isFinite(na) && isFinite(nb)) ? nb - na : (b > a ? 1 : -1);
    });
  }

  function resolveTraineeKey(index, name){
    if (!name) return null;
    var n = String(name).trim().toLowerCase();
    if (index[n]) return n;
    var byName = Object.keys(index).filter(function(k){ return (index[k].name || "").trim().toLowerCase() === n; })[0];
    if (byName) return byName;
    var roster = state.trainees.filter(function(t){ return (t.name || "").trim().toLowerCase() === n; })[0];
    var crm = roster ? (roster.crm_name || "").trim().toLowerCase() : "";
    return crm && index[crm] ? crm : null;
  }

  function selectedTraineeName(){
    var index = traineeWeekIndex();
    var k = resolveTraineeKey(index, state.selectedTrainee);
    return k ? index[k].name : state.selectedTrainee;
  }

  function renderIndividual(){
    var index = traineeWeekIndex();
    var allKeys = Object.keys(index).sort(function(a, b){ return index[a].name.localeCompare(index[b].name); });
    // Cohort level: which saved trainees belong to which cohort (by roster CRM name).
    var cohorts = cohortsNewestFirst();
    var crmByTrainee = {};
    state.trainees.forEach(function(t){ crmByTrainee[t.id] = (t.crm_name || "").trim().toLowerCase(); });
    function keysOf(c){
      var set = {};
      (c.trainee_ids || []).forEach(function(id){ if (crmByTrainee[id]) set[crmByTrainee[id]] = true; });
      return allKeys.filter(function(k){ return set[k]; });
    }
    // A trainee opened from elsewhere (Home, a cohort, Ask) switches to their cohort's list.
    var want = resolveTraineeKey(index, state.selectedTrainee);
    if (state.indCohort){
      var cur = cohorts.filter(function(c){ return c.id === state.indCohort; })[0];
      if (!cur) state.indCohort = "";
      else if (want && keysOf(cur).indexOf(want) === -1){
        var home = cohorts.filter(function(c){ return keysOf(c).indexOf(want) !== -1; })[0];
        state.indCohort = home ? home.id : "";
      }
    }
    var activeCohort = cohorts.filter(function(c){ return c.id === state.indCohort; })[0] || null;
    var keys = activeCohort ? keysOf(activeCohort) : allKeys;
    el.indCohortPicker.innerHTML = cohorts.length
      ? "<span class=\"picker-label\">Cohort</span><button class=\"pill" + (activeCohort ? "" : " active") + "\" data-ind-cohort=\"\" type=\"button\">All cohorts</button>" + cohorts.map(function(c){
          var n = keysOf(c).length;
          return "<button class=\"pill" + (activeCohort && c.id === activeCohort.id ? " active" : "") + "\" data-ind-cohort=\"" + esc(c.id) + "\" type=\"button\">" + esc(c.name) + (n ? " <span class=\"week-score\">" + n + "</span>" : "") + "</button>";
        }).join("")
      : "";
    if (activeCohort && !keys.length){
      el.traineePicker.innerHTML = "";
      el.traineeWeekTabs.hidden = true;
      el.traineeCard.innerHTML = "<h2>" + esc(activeCohort.name) + "</h2><p class=\"hint\">None of this cohort's trainees have a saved week yet. Pull a week for " + esc(activeCohort.name) + " in QA Data Request and save it.</p>";
      renderBreadcrumb();
      return;
    }
    if (!keys.length){
      el.traineePicker.innerHTML = "";
      el.traineeWeekTabs.hidden = true;
      el.traineeCard.innerHTML = (dbFn && state.allAnalyses === null)
        ? "<p class=\"hint\" style=\"margin:0;\">Loading saved weeks…</p>"
        : "<h2>Individual coaching</h2><p class=\"hint\">No saved weeks yet. Request a week in QA Data Request and save it to see each trainee's coaching brief here.</p>";
      renderBreadcrumb();
      return;
    }
    var sel = (want && keys.indexOf(want) !== -1) ? want : keys[0];
    var entry = index[sel];
    var weeks = sortedWeeks(entry);
    var wk = (state.selectedWeek && entry.weeks[state.selectedWeek]) ? state.selectedWeek : weeks[0];

    el.traineePicker.innerHTML = keys.map(function(k){
      return "<button class=\"pill" + (k === sel ? " active" : "") + "\" data-trainee=\"" + esc(k) + "\" type=\"button\">" + esc(index[k].name) + "</button>";
    }).join("");

    el.traineeWeekTabs.hidden = false;
    el.traineeWeekTabs.innerHTML = weeks.map(function(w){
      var t = traineeTally(sel, entry.weeks[w].headers, entry.weeks[w].rows);
      return "<button class=\"subtab" + (w === wk ? " active" : "") + "\" data-week=\"" + esc(w) + "\" type=\"button\">Week " + esc(w) +
        (t && t.total ? " <span class=\"week-score\">" + pctText(t) + "</span>" : "") + "</button>";
    }).join("");

    var w = entry.weeks[wk];
    var d = w.doc;
    var meta = "Week " + esc(wk) + (d.mode === "cohort" && d.target_label ? " &middot; " + esc(d.target_label) : d.mode === "trainee" ? " &middot; individual pull" : "");
    if (w.brief){
      el.traineeCard.innerHTML = traineeBriefHtml(w.brief, w.headers, w.rows, entry.name, meta);
    } else {
      var tally = traineeTally(sel, w.headers, w.rows);
      el.traineeCard.innerHTML = "<h3>" + esc(entry.name) + "</h3>" +
        "<div class=\"trainee-meta\">" + meta + (tally && tally.total ? " &middot; <b>Score " + pctText(tally) + "</b> (" + esc(passDetail(tally)) + ")" : "") + "</div>" +
        "<p class=\"hint\" style=\"margin:0;\">This week was saved without a coaching brief for " + esc(entry.name) + ". Request it again in QA Data Request and save it to generate one.</p>";
    }
    renderBreadcrumb();
  }

  // ---- Ask AI ----
  // One Claude call per question. Claude only sees what goes into the prompt, and a call
  // takes at most 64 KiB, so the prompt carries an index of every saved week plus full
  // detail for the weeks, trainees and cohorts the question points at.
  var ASK_BYTE_BUDGET = 58000;
  var askSeq = 0;

  function byteLen(str){ return new TextEncoder().encode(str).length; }

  function clip(str, n){ str = String(str == null ? "" : str).replace(/\s+/g, " ").trim(); return str.length > n ? str.slice(0, n - 1) + "…" : str; }

  function rosterNameFor(crmOrName){
    var k = String(crmOrName || "").trim().toLowerCase();
    var t = state.trainees.filter(function(x){ return (x.crm_name || "").trim().toLowerCase() === k || (x.name || "").trim().toLowerCase() === k; })[0];
    return t ? t.name : crmOrName;
  }

  function docLabel(d){
    return "Week " + d.week + " — " + (d.target_label || "?") + (d.mode === "cohort" ? " (cohort pull)" : d.mode === "trainee" ? " (individual pull)" : "");
  }

  function fetchKbReports(){
    if (!isArtifactOwner || !dbFn || !viewerId) return Promise.resolve({});
    return dbFn.doc("data/users/" + viewerId + "/kb_gap").collection("weeks").get()
      .then(function(snap){ var out = {}; snap.docs.forEach(function(d){ out[d.id] = thawed(d.data()); }); return out; })
      .catch(function(){ return {}; });
  }

  function askRankDocs(q, docs){
    var ql = q.toLowerCase();
    var weekHits = {};
    (q.match(/\b\d{2,4}\b/g) || []).forEach(function(w){ weekHits[w] = true; });
    var traineeKeys = {};
    state.trainees.forEach(function(t){
      var crm = (t.crm_name || "").trim().toLowerCase();
      var first = (t.name || "").trim().split(/\s+/)[0] || "";
      [t.name, t.crm_name, first.length > 3 ? first : ""].forEach(function(n){
        if (n && ql.indexOf(String(n).toLowerCase()) !== -1 && crm) traineeKeys[crm] = true;
      });
    });
    var cohortIds = {};
    state.cohorts.forEach(function(c){ if (c.name && ql.indexOf(c.name.toLowerCase()) !== -1) cohortIds[c.id] = true; });
    var anyHint = Object.keys(weekHits).length || Object.keys(traineeKeys).length || Object.keys(cohortIds).length;

    return docs.map(function(d, i){
      var score = 0;
      if (weekHits[String(d.week).trim()]) score += 10;
      if (cohortIds[d.target_id]) score += 5;
      var nameIdx = findNameIndex(d.headers || []);
      var names = {};
      (d.rows || []).forEach(function(r){ if (nameIdx !== -1) names[String(r[nameIdx] || "").trim().toLowerCase()] = true; });
      (d.trainees || []).forEach(function(t){ names[String(t && t.name || "").trim().toLowerCase()] = true; });
      Object.keys(traineeKeys).forEach(function(k){ if (names[k]) score += 5; });
      if (!anyHint && i < 2) score += 3;
      return { doc: d, score: score, recency: i };
    }).filter(function(x){ return x.score > 0; })
      .sort(function(a, b){ return (b.score - a.score) || (a.recency - b.recency); })
      .map(function(x){ return x.doc; });
  }

  function docDetailText(d){
    var byT = tallyByTrainee(d.headers || [], d.rows || []);
    var total = tallyPassRate(d.headers || [], d.rows || []);
    var a = normalizeAnalysis(d);
    var lines = ["### " + docLabel(d) + " — " + (d.rows || []).length + " audits" + (total.total ? ", pass rate " + pctText(total) + " (" + passDetail(total) + ")" : "") + (d.analyzed_at ? ", analyzed " + String(d.analyzed_at).slice(0, 10) : "")];
    if (d.member_names && d.member_names.length) lines.push("Members: " + d.member_names.join(", "));
    if (a.summary) lines.push("Summary: " + clip(a.summary, 900));
    if (a.team_themes.length){
      lines.push("Common themes of mistakes:");
      a.team_themes.forEach(function(t, i){
        lines.push((i + 1) + ". " + t.theme + (t.frequency ? " (" + t.frequency + ")" : "") + ": " + clip(t.description, 300) + (t.coaching_recommendation ? " Coaching move: " + clip(t.coaching_recommendation, 250) : ""));
      });
    }
    var briefs = {};
    a.trainees.forEach(function(t){ briefs[t.name.trim().toLowerCase()] = t; });
    var keys = Object.keys(byT).concat(Object.keys(briefs).filter(function(k){ return !byT[k]; }));
    if (keys.length) lines.push("Trainees:");
    keys.forEach(function(k){
      var t = briefs[k], sc = byT[k];
      var parts = [rosterNameFor(k) + " [CRM " + k + "]"];
      if (sc && sc.total) parts.push("score " + pctText(sc) + " (" + passDetail(sc) + ")");
      if (t){
        if (t.strengths.length) parts.push("strengths: " + t.strengths.map(function(x){ return clip(x, 160); }).join("; "));
        if (t.recurring_issues.length) parts.push("recurring issues: " + t.recurring_issues.map(function(x){ return clip(x, 200); }).join("; "));
        if (t.talking_points.length) parts.push("talking points: " + t.talking_points.map(function(x){ return clip(x, 200); }).join("; "));
        if (t.suggested_focus) parts.push("suggested focus: " + clip(t.suggested_focus, 200));
      } else parts.push("no coaching brief saved");
      lines.push("- " + parts.join(" | "));
    });
    return lines.join("\n");
  }

  function docCommentsText(d){
    var h = d.headers || [];
    var nameIdx = findNameIndex(h), scoreIdx = findScoreIndex(h);
    var ratingIdx = h.findIndex(function(x){ return /^rating$/i.test(String(x).trim()); });
    var cIdx = h.map(function(x, i){ return /markdown|comment/i.test(x) ? i : -1; }).filter(function(i){ return i !== -1; });
    if (!cIdx.length) return "";
    var lines = (d.rows || []).map(function(r){
      var comments = cIdx.map(function(i){ return r[i] ? h[i] + ": " + clip(readableComment(r[i]), 320) : ""; }).filter(Boolean);
      if (!comments.length) return "";
      return "- " + rosterNameFor(nameIdx !== -1 ? r[nameIdx] : "?") + " | " + (ratingIdx !== -1 && r[ratingIdx] ? r[ratingIdx] : (scoreIdx !== -1 ? r[scoreIdx] : "")) + " | " + comments.join(" | ");
    }).filter(Boolean);
    return lines.length ? "Audit comments, " + docLabel(d) + ":\n" + lines.join("\n") : "";
  }

  function kbReportText(d, rep){
    var lines = ["Knowledge gap analysis, " + docLabel(d) + (rep.generated_at ? " (generated " + String(rep.generated_at).slice(0, 10) + ")" : "") + ":"];
    if (rep.overall_note) lines.push("Overall: " + clip(rep.overall_note, 500));
    (rep.assessments || []).forEach(function(x){
      lines.push("- " + x.theme + ": " + (x.has_gap ? "OPPORTUNITY" : "stated clearly") + ". " + clip(x.verdict, 450) +
        (x.cited_resource ? " Resource: " + clip(x.cited_resource, 150) + "." : "") +
        (x.suggested_addition ? " Suggested addition: " + clip(x.suggested_addition, 350) + "." : "") +
        (x.comment ? " Coach's comment: " + clip(x.comment, 300) : ""));
    });
    if (rep.comment) lines.push("Coach's overall comment: " + clip(rep.comment, 300));
    return lines.join("\n");
  }

  function buildAskPrompt(q, kbReports){
    var docs = (Array.isArray(state.allAnalyses) ? state.allAnalyses : savedPullSources()).filter(function(d){ return d && d.week != null; });
    var today = new Date().toISOString().slice(0, 10);
    var sources = [];
    var head =
      "You are the assistant inside Coaching, a QA coaching tool a Homeaglow Care QA coach uses to coach trainees from their weekly QA audits.\n" +
      "Answer the coach's request using ONLY the data below. Rules:\n" +
      "- If what's needed isn't in the data, say exactly what's missing and how to get it (a week that isn't saved: \"request it in QA Data Request and save it\"; a knowledge gap analysis that doesn't exist: \"open QA Data › <cohort> › Week <n> › Knowledge gap analysis and click Generate\"). Never invent numbers, names, or findings.\n" +
      "- Scores are already computed (Pass = 100%, Fail = 0%; passes ÷ audited tickets). Use them exactly as given; never recompute or estimate.\n" +
      "- Call trainees by their roster name.\n" +
      "- Some weeks appear only in the index, not in full detail. If the answer needs one of those, say so and suggest asking about that week by number.\n" +
      "- Be concise and practical: short headings (#) and bullets, no preamble, no closing offers.\n" +
      "Today is " + today + ".\n\n";

    var roster = "## Roster\n" +
      state.cohorts.map(function(c){
        var members = (c.trainee_ids || []).map(function(id){ var t = state.trainees.filter(function(x){ return x.id === id; })[0]; return t ? t.name + " (CRM " + (t.crm_name || "?") + ")" : null; }).filter(Boolean);
        return "- Cohort " + c.name + (c.department ? " · " + c.department : "") + (c.team_lead ? " · lead " + c.team_lead : "") + ": " + (members.join(", ") || "no trainees");
      }).join("\n") + "\n\n";

    var index = "## Every saved week\n" + (docs.length ? docs.map(function(d){
      var total = tallyPassRate(d.headers || [], d.rows || []);
      return "- " + docLabel(d) + ": " + (d.rows || []).length + " audits" + (total.total ? ", pass rate " + pctText(total) : "") +
        (d.analyzed_at ? "" : ", not analyzed") + (isArtifactOwner ? (kbReports[d.id] ? ", knowledge gap report: yes" : ", knowledge gap report: none") : "");
    }).join("\n") : "- (none saved yet)") + "\n\n";

    var tail = "\n\n## The coach's request\n" + q;
    var out = head + roster + index;
    var budget = ASK_BYTE_BUDGET - byteLen(tail);
    function tryAdd(block, label){
      if (!block) return false;
      var piece = block + "\n\n";
      if (byteLen(out) + byteLen(piece) > budget) return false;
      out += piece;
      if (label) sources.push(label);
      return true;
    }

    var ranked = askRankDocs(q, docs);
    var detailed = [];
    ranked.forEach(function(d){
      if (tryAdd((detailed.length ? "" : "## Weeks in full detail\n") + docDetailText(d), docLabel(d))) detailed.push(d);
    });
    if (isArtifactOwner){
      detailed.forEach(function(d){ if (kbReports[d.id]) tryAdd(kbReportText(d, kbReports[d.id]), "Knowledge gap analysis, Week " + d.week); });
      var logs = (state.learnings || []).slice(0, 20);
      if (logs.length) tryAdd("## Coach's calibration log (corrections to past analyses, newest first)\n" + logs.map(function(l){
        return "- " + (l.cohort_name || "") + (l.week ? " Week " + l.week : "") + (l.theme ? " · " + l.theme : " · overall") + ": " + clip(l.comment, 300);
      }).join("\n"), "Calibration Log");
    }
    detailed.forEach(function(d){ tryAdd(docCommentsText(d), null); });
    return { prompt: out + tail, sources: sources };
  }

  function renderMarkdownLite(md){
    function inline(t){
      return esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>");
    }
    var html = [], list = null;
    function closeList(){ if (list){ html.push("</" + list + ">"); list = null; } }
    String(md || "").split("\n").forEach(function(line){
      var m;
      if ((m = line.match(/^\s*#{1,6}\s+(.*)$/))){ closeList(); html.push("<h4>" + inline(m[1]) + "</h4>"); }
      else if ((m = line.match(/^\s*[-*•]\s+(.*)$/))){ if (list !== "ul"){ closeList(); html.push("<ul>"); list = "ul"; } html.push("<li>" + inline(m[1]) + "</li>"); }
      else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))){ if (list !== "ol"){ closeList(); html.push("<ol>"); list = "ol"; } html.push("<li>" + inline(m[1]) + "</li>"); }
      else if (!line.trim()){ closeList(); }
      else { closeList(); html.push("<p>" + inline(line) + "</p>"); }
    });
    closeList();
    return html.join("");
  }

  function askSuggestions(){
    var docs = Array.isArray(state.allAnalyses) ? state.allAnalyses : [];
    var weeks = docs.map(function(d){ return String(d.week); }).filter(function(w, i, arr){ return w && arr.indexOf(w) === i; })
      .sort(function(a, b){ return Number(b) - Number(a); });
    var w = weeks[0], prev = weeks[1];
    var out = [];
    if (w && isArtifactOwner) out.push("Summarize the knowledge gap analysis for week " + w);
    if (w) out.push("Who needs a check-in based on week " + w + "?");
    if (w && prev) out.push("What changed between week " + prev + " and week " + w + "?");
    if (weeks.length) out.push("What are the most common mistakes across all saved weeks?");
    return out;
  }

  function renderAskPage(){
    el.askChips.innerHTML = askSuggestions().map(function(t){ return "<button class=\"ask-chip\" data-ask-chip=\"" + esc(t) + "\" type=\"button\">" + esc(t) + "</button>"; }).join("");
    var n = Array.isArray(state.allAnalyses) ? state.allAnalyses.length : 0;
    el.askScope.textContent = !sampleFn ? "AI answers aren't available in this view."
      : "Answers use your " + n + " saved week" + (n === 1 ? "" : "s") + ", trainee briefs and scores" +
        (isArtifactOwner ? ", plus your knowledge gap reports and Calibration Log (only you can see those)" : "") +
        ". Ask AI only reads — it can't change or save anything.";
    renderAskAnswers();
  }

  function renderAskAnswers(){
    if (!state.askHistory.length){ el.askAnswers.innerHTML = ""; return; }
    el.askAnswers.innerHTML = state.askHistory.map(function(it){
      var body;
      if (it.status === "thinking") body = "<p class=\"hint\" style=\"margin:0;\"><span class=\"spinner\" style=\"display:inline-block;vertical-align:middle;margin-right:8px;\"></span>Thinking…</p>";
      else body = "<div class=\"ask-body\" id=\"askText-" + it.id + "\">" + renderMarkdownLite(it.text) + "</div>";
      var err = it.error ? "<p style=\"color:var(--danger);margin:10px 0 0;\">" + esc(it.error) + "</p>" : "";
      var busy = it.status === "thinking" || it.status === "streaming";
      var actions = busy
        ? "<button class=\"ghost small\" data-ask-stop=\"" + it.id + "\" type=\"button\">Stop</button>"
        : (it.text ? "<button class=\"ghost small\" data-ask-copy=\"" + it.id + "\" type=\"button\">Copy</button>" +
            (downloadsFn ? "<button class=\"ghost small\" data-ask-download=\"" + it.id + "\" type=\"button\">Download</button>" : "") : "") +
          "<button class=\"link-btn\" data-ask-again=\"" + it.id + "\" type=\"button\">Ask again</button>" +
          "<span class=\"save-status\" id=\"askNote-" + it.id + "\"></span>";
      return "<div class=\"card ask-answer\">" +
        "<p class=\"ask-q\">" + esc(it.q) + "</p>" +
        "<p class=\"ask-meta\">" + (it.sources && it.sources.length ? "Based on: " + it.sources.map(esc).join(" · ") : "Based on: your saved-weeks index") + "</p>" +
        body + err +
        "<div class=\"ask-actions\">" + actions + "</div>" +
      "</div>";
    }).join("");
  }

  function askQuestion(q){
    q = String(q || "").trim();
    if (!q) return;
    var it = { id: ++askSeq, q: q, status: "thinking", text: "", error: null, sources: [], ctl: null };
    state.askHistory.unshift(it);
    renderAskAnswers();
    if (!sampleFn){ it.status = "error"; it.error = "AI answers aren't available in this view."; renderAskAnswers(); return; }
    fetchKbReports().then(function(kb){
      var built = buildAskPrompt(q, kb);
      it.sources = built.sources;
      it.ctl = new AbortController();
      renderAskAnswers();
      return sampleFn(built.prompt, {
        cache: false,
        signal: it.ctl.signal,
        onText: function(u){
          it.text = u.text;
          if (it.status !== "streaming"){ it.status = "streaming"; renderAskAnswers(); return; }
          var box = document.getElementById("askText-" + it.id);
          if (box) box.innerHTML = renderMarkdownLite(it.text);
        }
      });
    }).then(function(res){
      it.text = (res && res.text) || it.text;
      it.status = "done";
      if (res && res.truncated) it.error = "The answer was cut short — try asking for less at once.";
      renderAskAnswers();
    }).catch(function(e){
      it.text = (e && e.text) || it.text;
      it.status = "done";
      it.error = (e && e.code === "cancelled") ? "Stopped." : (errorCopy(e && e.code) || "Something went wrong reaching Claude.").replace(/&mdash;/g, "—");
      renderAskAnswers();
    });
  }

  function copyText(text, noteEl){
    function done(ok){ if (noteEl){ noteEl.textContent = ok ? "Copied." : "Couldn't copy — select the text instead."; noteEl.className = "save-status" + (ok ? " ok" : " err"); } }
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){ done(true); }, function(){ done(fallbackCopy(text)); });
    } else done(fallbackCopy(text));
  }
  function fallbackCopy(text){
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e){ ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function openAskPop(prefill){
    renderAskPage();
    el.askPop.hidden = false;
    el.askFab.setAttribute("aria-expanded", "true");
    if (prefill) el.askInput.value = prefill;
    el.askInput.focus();
  }
  function closeAskPop(){
    if (el.askPop.hidden) return;
    el.askPop.hidden = true;
    el.askFab.setAttribute("aria-expanded", "false");
  }
  // The page only opens once a question is actually sent.
  function submitAsk(q){
    q = String(q || "").trim();
    if (!q){ el.askInput.focus(); return; }
    el.askInput.value = "";
    closeAskPop();
    if (state.section !== "ask") setSection("ask");
    askQuestion(q);
  }

  // ---- Settings ----
  function renderResourceTabs(){
    el.resourceTabs.innerHTML = RESOURCE_TABS.map(function(t){
      var active = t.key === state.resourceTab ? " active" : "";
      return "<button class=\"subtab" + active + "\" data-resource-tab=\"" + t.key + "\" type=\"button\">" + esc(t.label) + "</button>";
    }).join("");
  }

  function renderSettings(){
    renderResourceTabs();
    if (state.resourceTab === "appearance") renderAppearancePanel();
    else renderKnowledgeBasePanel();
    renderBreadcrumb();
  }

  // ---- QA sheet sources (shown in Trainer Desk → Settings → QA Sheets) ----
  var qaSheetHost = null;
  function renderQaSheetPanel(){
    if (!qaSheetHost || !qaSheetHost.isConnected) return;
    if (qaSheetHost.contains(document.activeElement)) return; // don't wipe a field mid-edit
    var s = state.settings;
    var sidesHtml = SHEET_SIDES.map(function(side){
      var v = s[side.key] || { url: "", tab_name: "" };
      var mapHtml = side.columns ? (
        "<div class=\"col-map\">" +
          "<h4>Column reference</h4>" +
          "<p class=\"r-hint\">Inside that tab, Coaching reads only these columns — everything else in the sheet is ignored. It finds them by the header names in row 1 (Week Number, CRM Name, Rating, Comments on Resolution, Comments on Communication, Score), so the order can differ:</p>" +
          side.columns.map(function(m){
            return "<div class=\"col-map-row\"><span class=\"row-top\"><span class=\"col-letter\">" + esc(m.col) + "</span><span class=\"col-field\">" + esc(m.field) + "</span></span><span class=\"col-desc\">" + esc(m.desc) + "</span></div>";
          }).join("") +
        "</div>"
      ) : (
        "<div class=\"col-map\"><h4>Column reference</h4><p class=\"r-hint\">Not set yet — add this once the " + esc(side.label) + " sheet's layout is finalized.</p></div>"
      );
      var tabFieldHtml = side.columns
        ? "<div class=\"field\"><label for=\"tab-" + side.key + "\">Sheet tab name</label><input type=\"text\" id=\"tab-" + side.key + "\" placeholder=\"e.g. Nesting audits - Feedback\" value=\"" + esc(v.tab_name || "") + "\"></div><p class=\"r-hint\" style=\"margin-top:-10px;\">Keep this tab first in the sheet: Google Drive can only export a sheet's first tab in full, so any other position means older weeks get cut off. Rows are matched on the Week Number / CRM Name columns, and scores come from column R.</p>"
        : "";
      return "<div class=\"side-card\">" +
        "<h4>" + esc(side.label) + (side.wip ? " <span class=\"badge warn\">In progress</span>" : "") + "</h4><p class=\"r-hint\">" + esc(side.hint) + "</p>" +
        "<div class=\"field\"><label for=\"url-" + side.key + "\">Google Sheet URL</label><input type=\"url\" id=\"url-" + side.key + "\" placeholder=\"https://docs.google.com/spreadsheets/d/...\" value=\"" + esc(v.url) + "\"></div>" +
        (v.url ? "<a class=\"open-link\" href=\"" + esc(v.url) + "\" target=\"_blank\" rel=\"noopener\">Open sheet →</a>" : "") +
        tabFieldHtml +
        mapHtml +
      "</div>";
    }).join("");

    qaSheetHost.innerHTML =
      "<div class=\"card\">" +
        "<div class=\"resource-head\"><span class=\"r-icon\">" + ICONS.sheet + "</span><h2>QA Sheet</h2></div>" +
        "<p class=\"hint\">Point Coaching at the Google Sheets your QA audits live in, one per side. Coaching reads the <b>first tab</b> of each sheet, with the header in row 1. A cohort or trainee in a department named CP is pulled from the CP side sheet, everyone else from the C side sheet.</p>" +
        "<div class=\"side-grid\">" + sidesHtml + "</div>" +
        "<div class=\"settings-foot\">" +
          "<button class=\"primary small\" id=\"saveSettingsBtn\" type=\"button\">Save sources</button>" +
          "<span class=\"save-status\" id=\"saveStatus\"></span>" +
        "</div>" +
      "</div>";

    document.getElementById("saveSettingsBtn").addEventListener("click", saveSettings);
  }

  function collectSettingsFromForm(){
    var out = {};
    SHEET_SIDES.forEach(function(side){
      var urlEl = document.getElementById("url-" + side.key);
      var tabEl = document.getElementById("tab-" + side.key);
      out[side.key] = { url: urlEl ? urlEl.value.trim() : "", tab_name: tabEl ? tabEl.value.trim() : "" };
    });
    return out;
  }

  function saveSettings(){
    var payload = collectSettingsFromForm();
    var statusEl = document.getElementById("saveStatus");
    if (!dbFn){
      state.settings = payload;
      if (statusEl){ statusEl.textContent = "Saved to this browser tab only — settings storage isn't available in this view."; statusEl.className = "save-status err"; }
      return;
    }
    if (statusEl){ statusEl.textContent = "Saving…"; statusEl.className = "save-status"; }
    dbFn.doc("settings/qa_sheet").set({ c_side: payload.c_side, cp_side: payload.cp_side, updated_at: new Date().toISOString() })
      .then(function(){
        if (statusEl){ statusEl.textContent = "Saved."; statusEl.className = "save-status ok"; }
      })
      .catch(function(e){
        var msg = "Couldn't save — try again.";
        if (e && e.code === "invalid_argument") msg = "You don't have permission to change these settings.";
        if (statusEl){ statusEl.textContent = msg; statusEl.className = "save-status err"; }
      });
  }

  // ---- Knowledge base ----
  function normalizeKbLinks(arr){
    var links = Array.isArray(arr) ? arr.slice() : [];
    while (links.length < KB_LINK_COUNT) links.push({ label: "", url: "" });
    return links.map(function(l){ return { label: (l && l.label) || "", url: (l && l.url) || "" }; });
  }

  function renderKnowledgeBasePanel(){
    var sidesHtml = SHEET_SIDES.map(function(side){
      var links = state.kbLinks[side.key] || [];
      var rowsHtml = links.map(function(link, i){
        var idx = side.key + "-" + i;
        return "<div class=\"kb-row\">" +
          "<div class=\"kb-num\">" + (i + 1) + "</div>" +
          "<div class=\"kb-fields\">" +
            "<div class=\"field\"><label for=\"kb-label-" + idx + "\">Name (optional)</label><input type=\"text\" id=\"kb-label-" + idx + "\" placeholder=\"e.g. Resolution playbook\" value=\"" + esc(link.label) + "\"></div>" +
            "<div class=\"field\"><label for=\"kb-url-" + idx + "\">Link</label><input type=\"url\" id=\"kb-url-" + idx + "\" placeholder=\"https://…\" value=\"" + esc(link.url) + "\"></div>" +
            "<div class=\"kb-marks\" id=\"kb-marks-" + idx + "\" aria-live=\"polite\"></div>" +
          "</div>" +
          (i >= KB_LINK_COUNT ? "<button class=\"ghost small kb-remove\" type=\"button\" data-kb-remove=\"" + side.key + "|" + i + "\" title=\"Remove this link\" aria-label=\"Remove link " + (i + 1) + "\">Remove</button>" : "") +
        "</div>";
      }).join("");
      return "<div class=\"side-card\">" +
        "<h4>" + esc(side.label) + (side.wip ? " <span class=\"badge warn\">In progress</span>" : "") + "</h4><p class=\"r-hint\">" + esc(side.hint) + "</p>" +
        "<div class=\"kb-list\">" + rowsHtml + "</div>" +
        "<button class=\"ghost small kb-add\" type=\"button\" data-kb-add=\"" + side.key + "\">+ Add more</button>" +
      "</div>";
    }).join("");

    el.settingsBody.innerHTML =
      "<div class=\"card\">" +
        "<div class=\"resource-head\"><span class=\"r-icon\">" + ICONS.book + "</span><h2>Knowledge base</h2></div>" +
        "<p class=\"hint\">Paste links to the docs, SOPs, or help center articles Coaching should check against — so it can call out when a trainee's mistake is (or isn't) already covered in the knowledge base for that side.</p>" +
        "<div class=\"side-grid\">" + sidesHtml + "</div>" +
        "<div class=\"settings-foot\">" +
          "<button class=\"primary small\" id=\"saveKbBtn\" type=\"button\">Save links</button>" +
          "<span class=\"save-status\" id=\"kbSaveStatus\"></span>" +
        "</div>" +
      "</div>";

    document.getElementById("saveKbBtn").addEventListener("click", saveKnowledgeBase);
    updateKbMarks();
    el.settingsBody.querySelectorAll(".kb-row input").forEach(function(inp){ inp.addEventListener("input", updateKbMarks); });
    backfillKbReads();
    // Add more / Remove keep what's typed so far, then redraw. Nothing is saved until Save links.
    el.settingsBody.querySelectorAll("[data-kb-add]").forEach(function(btn){
      btn.addEventListener("click", function(){
        var key = btn.getAttribute("data-kb-add");
        state.kbLinks = collectKbFromForm();
        state.kbLinks[key].push({ label: "", url: "" });
        renderKnowledgeBasePanel();
        var inputs = document.querySelectorAll("[id^=\"kb-label-" + key + "-\"]");
        if (inputs.length) inputs[inputs.length - 1].focus();
      });
    });
    el.settingsBody.querySelectorAll("[data-kb-remove]").forEach(function(btn){
      btn.addEventListener("click", function(){
        var parts = btn.getAttribute("data-kb-remove").split("|");
        state.kbLinks = collectKbFromForm();
        state.kbLinks[parts[0]].splice(Number(parts[1]), 1);
        renderKnowledgeBasePanel();
      });
    });
  }

  // Markers on each saved resource: Saved (matches what's stored, not just typed) and Read by Claude
  // (an analysis fetched its content). A read is remembered in settings/kb_reads.
  function kbKey(url){ return String(url || "").trim().replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase(); }
  function kbDay(iso){ var d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString([], { month: "short", day: "numeric" }); }
  function updateKbMarks(){
    SHEET_SIDES.forEach(function(side){
      (state.kbLinks[side.key] || []).forEach(function(_, i){
        var idx = side.key + "-" + i;
        var box = document.getElementById("kb-marks-" + idx);
        var urlEl = document.getElementById("kb-url-" + idx);
        if (!box || !urlEl) return;
        var url = urlEl.value.trim();
        if (!url){ box.innerHTML = ""; return; }
        var saved = (state.kbSaved[side.key] || []).some(function(u){ return kbKey(u) === kbKey(url); });
        var read = state.kbReads[kbKey(url)];
        var html = saved
          ? "<span class=\"kb-mark ok\">&#10003; Saved</span>"
          : "<span class=\"kb-mark warn\">Not saved yet</span>";
        if (saved && read){
          html += read.fetched
            ? "<span class=\"kb-mark ok\" title=\"Claude read this document in a knowledge base check" + (read.truncated ? " (a long one, so only the first part)" : "") + "\">&#10003; Read by Claude" + (read.at ? " &middot; " + esc(kbDay(read.at)) : "") + (read.truncated ? " &middot; first part" : "") + "</span>"
            : "<span class=\"kb-mark\" title=\"Only Google Docs/Drive links can be read in full; for this one Claude used the name only\">Name only &middot; not read</span>";
        }
        box.innerHTML = html;
      });
    });
  }
  function recordKbReads(results){
    var changed = false;
    results.forEach(function(r){
      if (!r || !r.url) return;
      var k = kbKey(r.url), cur = state.kbReads[k];
      var next = { fetched: !!r.fetched, truncated: !!r.truncated, at: new Date().toISOString() };
      // A failed attempt never hides an earlier successful read.
      if (cur && cur.fetched && !next.fetched) return;
      state.kbReads[k] = next;
      changed = true;
    });
    if (!changed) return;
    updateKbMarks();
    if (dbFn && isArtifactOwner){
      var items = Object.keys(state.kbReads).map(function(k){ return Object.assign({ url: k }, state.kbReads[k]); });
      dbFn.doc("settings/kb_reads").set({ items: items, updated_at: new Date().toISOString() }).catch(function(){ /* the marker still shows this session */ });
    }
  }
  // Checks saved before reads were remembered: match their resources_checked by name.
  var kbBackfilled = false;
  function backfillKbReads(){
    if (kbBackfilled || !isArtifactOwner || !dbFn || !viewerId) return;
    kbBackfilled = true;
    fetchKbReports().then(function(reports){
      var byLabel = {};
      Object.keys(reports || {}).forEach(function(id){
        var rec = reports[id] || {};
        (rec.resources_checked || []).forEach(function(r){
          if (!r || !r.fetched || !r.label) return;
          var cur = byLabel[r.label];
          if (!cur || String(rec.generated_at || "") > String(cur.at || "")) byLabel[r.label] = { fetched: true, truncated: !!r.truncated, at: rec.generated_at || "" };
        });
      });
      var any = false;
      SHEET_SIDES.forEach(function(side){
        (state.kbSaved[side.key] || []).forEach(function(u, i){
          var link = (state.kbLinks[side.key] || [])[i];
          var hit = byLabel[(link && link.label) || u] || byLabel[u];
          if (hit && !state.kbReads[kbKey(u)]){ state.kbReads[kbKey(u)] = hit; any = true; }
        });
      });
      if (any) updateKbMarks();
    }).catch(function(){});
  }

  function collectKbFromForm(){
    var out = {};
    SHEET_SIDES.forEach(function(side){
      out[side.key] = (state.kbLinks[side.key] || []).map(function(_, i){
        var idx = side.key + "-" + i;
        var labelEl = document.getElementById("kb-label-" + idx);
        var urlEl = document.getElementById("kb-url-" + idx);
        return { label: labelEl ? labelEl.value.trim() : "", url: urlEl ? urlEl.value.trim() : "" };
      });
    });
    return out;
  }

  function saveKnowledgeBase(){
    var payload = collectKbFromForm();
    var statusEl = document.getElementById("kbSaveStatus");
    if (!dbFn){
      state.kbLinks = payload;
      if (statusEl){ statusEl.textContent = "Saved to this browser tab only — settings storage isn't available in this view."; statusEl.className = "save-status err"; }
      return;
    }
    if (statusEl){ statusEl.textContent = "Saving…"; statusEl.className = "save-status"; }
    var body = { updated_at: new Date().toISOString() };
    SHEET_SIDES.forEach(function(side){ body[side.key] = payload[side.key].filter(function(l){ return l.url || l.label; }); });
    dbFn.doc("settings/knowledge_base").set(body)
      .then(function(){
        SHEET_SIDES.forEach(function(side){ state.kbSaved[side.key] = body[side.key].map(function(l){ return l.url; }).filter(Boolean); });
        updateKbMarks();
        if (statusEl){ statusEl.textContent = "Saved."; statusEl.className = "save-status ok"; }
      })
      .catch(function(e){
        var msg = "Couldn't save — try again.";
        if (e && e.code === "invalid_argument") msg = "You don't have permission to change these settings.";
        if (statusEl){ statusEl.textContent = msg; statusEl.className = "save-status err"; }
      });
  }

  // ---- Appearance ----
  function applyTheme(themeKey){
    var key = themeKey || "default";
    document.querySelectorAll(".cc-root, .cc-ui").forEach(function(node){
      if (key === "default") node.removeAttribute("data-cc-theme");
      else node.setAttribute("data-cc-theme", key);
    });
    state.themeKey = key;
  }

  function renderAppearancePanel(){
    var current = state.themeKey || "default";
    var cardsHtml = THEMES.map(function(t){
      var active = t.key === current;
      var swatchesHtml = t.swatches.map(function(c){ return "<span class=\"swatch-dot\" style=\"background:" + c + ";\"></span>"; }).join("");
      return "<div class=\"theme-option" + (active ? " active" : "") + "\">" +
        "<div class=\"theme-option-head\"><h4>" + esc(t.label) + "</h4>" + (active ? "<span class=\"badge\">In use</span>" : "") + "</div>" +
        "<p class=\"r-hint\">" + esc(t.desc) + "</p>" +
        "<div class=\"swatch-row\">" + swatchesHtml + "</div>" +
        (active ? "" : "<button class=\"primary small\" data-use-theme=\"" + t.key + "\" type=\"button\">Use this theme</button>") +
      "</div>";
    }).join("");

    el.settingsBody.innerHTML =
      "<div class=\"card\">" +
        "<div class=\"resource-head\"><span class=\"r-icon\">" + ICONS.palette + "</span><h2>Appearance</h2></div>" +
        "<p class=\"hint\">Pick a colorway for Coaching — it applies for everyone who opens this tool, no code changes needed.</p>" +
        "<div class=\"theme-grid\">" + cardsHtml + "</div>" +
        "<span class=\"save-status\" id=\"appearanceStatus\"></span>" +
      "</div>";

    el.settingsBody.querySelectorAll("[data-use-theme]").forEach(function(btn){
      btn.addEventListener("click", function(){ saveTheme(btn.getAttribute("data-use-theme")); });
    });
  }

  function saveTheme(themeKey){
    applyTheme(themeKey);
    renderAppearancePanel();
    var statusEl = document.getElementById("appearanceStatus");
    if (!dbFn){
      if (statusEl){ statusEl.textContent = "Applied to this browser tab only — settings storage isn't available in this view."; statusEl.className = "save-status err"; }
      return;
    }
    if (statusEl){ statusEl.textContent = "Saving…"; statusEl.className = "save-status"; }
    dbFn.doc("settings/appearance").set({ theme: themeKey, updated_at: new Date().toISOString() })
      .then(function(){
        var s = document.getElementById("appearanceStatus");
        if (s){ s.textContent = "Saved."; s.className = "save-status ok"; }
      })
      .catch(function(e){
        var msg = "Couldn't save — try again.";
        if (e && e.code === "invalid_argument") msg = "You don't have permission to change this setting.";
        var s = document.getElementById("appearanceStatus");
        if (s){ s.textContent = msg; s.className = "save-status err"; }
      });
  }

  // ---- Roster (shown in Trainer Desk → Settings → Roster) ----
  var rosterHost = null;
  function renderRosterPanel(){
    if (!rosterHost || !rosterHost.isConnected) return;
    var tabsHtml = ROSTER_TABS.map(function(t){
      var active = t.key === state.rosterTab ? " active" : "";
      return "<button class=\"subtab" + active + "\" data-roster-tab=\"" + t.key + "\" type=\"button\">" + esc(t.label) + "</button>";
    }).join("");

    var cardHtml = state.rosterTab === "trainee" ? traineeCardHtml() : simpleListCardHtml(simpleListConfig(state.rosterTab));

    rosterHost.innerHTML = "<div class=\"subtabs roster-subtabs\">" + tabsHtml + "</div>" + cardHtml;

    rosterHost.querySelectorAll("[data-roster-tab]").forEach(function(btn){
      btn.addEventListener("click", function(){
        state.rosterTab = btn.getAttribute("data-roster-tab");
        renderRosterPanel();
      });
    });

    if (state.rosterTab === "trainee") wireTraineeCard();
    else wireSimpleListCard(simpleListConfig(state.rosterTab));
  }

  function simpleListConfig(key){
    return SIMPLE_LISTS.filter(function(c){ return c.key === key; })[0];
  }

  function selectField(id, label, options, emptyHint, currentValue){
    var opts = options.length
      ? "<option value=\"\">— Select —</option>" + options.map(function(o){
          var sel = currentValue && o.name === currentValue ? " selected" : "";
          return "<option value=\"" + esc(o.name) + "\"" + sel + ">" + esc(o.name) + "</option>";
        }).join("")
      : "<option value=\"\" selected>" + esc(emptyHint) + "</option>";
    return "<div class=\"field\"><label for=\"" + id + "\">" + esc(label) + "</label><select id=\"" + id + "\"" + (options.length ? "" : " disabled") + ">" + opts + "</select></div>";
  }

  // ---- Kebab menu (shared) ----
  function openKebab(btn, id, items){
    if (el.kebabMenu.dataset.forId === id && !el.kebabMenu.hidden){ closeKebab(); return; }
    var rect = btn.getBoundingClientRect();
    var box = overlayHost.getBoundingClientRect();
    el.kebabMenu.innerHTML = items.map(function(it, i){
      return "<button type=\"button\" data-kebab-idx=\"" + i + "\"" + (it.danger ? " class=\"danger\"" : "") + ">" + esc(it.label) + "</button>";
    }).join("");
    el.kebabMenu.style.top = (rect.bottom - box.top + 6) + "px";
    el.kebabMenu.style.left = "auto";
    el.kebabMenu.style.right = (box.right - rect.right) + "px";
    el.kebabMenu.dataset.forId = id;
    el.kebabMenu.hidden = false;
    el.kebabMenu.querySelectorAll("[data-kebab-idx]").forEach(function(mb){
      mb.addEventListener("click", function(){
        var it = items[Number(mb.getAttribute("data-kebab-idx"))];
        closeKebab();
        if (it) it.onClick();
      });
    });
  }
  function closeKebab(){ el.kebabMenu.hidden = true; el.kebabMenu.innerHTML = ""; el.kebabMenu.dataset.forId = ""; }
  document.addEventListener("click", function(e){
    if (el.kebabMenu.hidden) return;
    if (e.target.closest(".kebab-menu") || e.target.closest(".kebab-btn")) return;
    closeKebab();
  });

  // ---- Trainee ----
  function traineeCardHtml(){
    var rosterHtml;
    if (!state.trainees.length){
      rosterHtml = "<p class=\"hint\">No trainees added yet.</p>";
    } else {
      rosterHtml =
        "<div class=\"roster-table-wrap\"><table class=\"preview\"><thead><tr><th>Name</th><th>Work email</th><th>CRM name</th><th>Team lead</th><th>Department</th><th></th></tr></thead><tbody>" +
          state.trainees.map(function(t){
            return "<tr><td><button type=\"button\" class=\"td-name\" data-td-trainee=\"" + esc(t.id) + "\" title=\"Open " + esc(t.name) + "'s details\">" + esc(t.name) + "</button></td><td>" + esc(t.email || "") + "</td><td>" + esc(t.crm_name) + "</td><td>" + esc(t.team_lead) + "</td><td>" + esc(t.department) + "</td>" +
              "<td class=\"kebab-cell\"><button class=\"kebab-btn\" data-kebab-trainee=\"" + esc(t.id) + "\" title=\"More options\" type=\"button\">⋮</button></td></tr>";
          }).join("") +
        "</tbody></table></div>";
    }

    return "<div class=\"card\">" +
        "<div class=\"resource-head\"><span class=\"r-icon\">" + ICONS.roster + "</span><h2>Trainee</h2>" +
          "<button class=\"ghost small\" id=\"bulkTraineeBtn\" style=\"margin-left:auto;\" type=\"button\">Bulk add</button>" +
          "<button class=\"primary small\" id=\"addTraineeBtn\" style=\"margin-left:8px;\" type=\"button\">+ Add trainee</button>" +
        "</div>" +
        "<p class=\"hint\">One record per trainee, so Coaching can match the CRM name on a QA audit back to a real person, their team lead and department. Team lead and department are picked from the lists on their own tabs.</p>" +
        rosterHtml +
      "</div>";
  }

  function wireTraineeCard(){
    document.getElementById("addTraineeBtn").addEventListener("click", openAddTraineeModal);
    document.getElementById("bulkTraineeBtn").addEventListener("click", openBulkTraineeModal);
    rosterHost.querySelectorAll("[data-kebab-trainee]").forEach(function(btn){
      var id = btn.getAttribute("data-kebab-trainee");
      btn.addEventListener("click", function(e){
        e.stopPropagation();
        openKebab(btn, id, [
          { label: "Edit", onClick: function(){ openEditTraineeModal(id); } },
          { label: "Delete", danger: true, onClick: function(){ deleteTrainee(id); } }
        ]);
      });
    });
  }

  var NESTING_STATUSES = [
    { key: "", label: "In nesting" },
    { key: "passed", label: "Passed nesting" },
    { key: "not_passed", label: "Did not pass" }
  ];

  // Nesting status is set later (Edit), not when a trainee is first added.
  function traineeModalFields(t){
    var editing = !!t;
    t = t || { name: "", email: "", crm_name: "", team_lead: "", department: "", nesting_status: "" };
    return "<div class=\"field\"><label for=\"nt-name\">Name</label><input type=\"text\" id=\"nt-name\" placeholder=\"Jordan Diaz\" value=\"" + esc(t.name) + "\"></div>" +
      "<div class=\"field\"><label for=\"nt-email\">Work email</label><input type=\"email\" id=\"nt-email\" placeholder=\"jordan.diaz@company.com\" value=\"" + esc(t.email || "") + "\"></div>" +
      "<div class=\"field\"><label for=\"nt-crm\">CRM name</label><input type=\"text\" id=\"nt-crm\" placeholder=\"As it appears in the QA sheet\" value=\"" + esc(t.crm_name) + "\"></div>" +
      selectField("nt-lead", "Team lead", state.teamLeads, "Add a Team Lead first", t.team_lead) +
      selectField("nt-dept", "Department", state.departments, "Add a Department first", t.department) +
      (editing
        ? "<div class=\"field\"><label for=\"nt-nesting\">Nesting status</label><select id=\"nt-nesting\">" +
            NESTING_STATUSES.map(function(s){ return "<option value=\"" + s.key + "\"" + (s.key === (t.nesting_status || "") ? " selected" : "") + ">" + esc(s.label) + "</option>"; }).join("") +
          "</select></div>"
        : "");
  }

  // ---- Work email → CRM name: the CRM name is the email without its @domain.
  function isEmail(s){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
  function crmFromEmail(email){ return String(email).trim().split("@")[0]; }
  // In the Add / Edit trainee form, keep CRM name following the email until it's typed by hand.
  function wireEmailToCrm(){
    var emailEl = document.getElementById("nt-email"), crmEl = document.getElementById("nt-crm");
    if (!emailEl || !crmEl) return;
    var auto = !crmEl.value || crmEl.value === crmFromEmail(emailEl.value);
    crmEl.addEventListener("input", function(){ auto = !crmEl.value; });
    emailEl.addEventListener("input", function(){ if (auto) crmEl.value = emailEl.value.indexOf("@") !== -1 ? crmFromEmail(emailEl.value) : emailEl.value.trim(); });
  }

  // ---- Bulk add: pick one Team Lead and one Department for the batch, then list
  // one trainee per line as "Name, work email". CRM name comes from the email.
  function parseBulkTrainees(text){
    var existing = {};
    state.trainees.forEach(function(t){
      existing["n:" + String(t.name || "").trim().toLowerCase()] = true;
      if ((t.email || "").trim()) existing["e:" + t.email.trim().toLowerCase()] = true;
      if ((t.crm_name || "").trim()) existing["c:" + t.crm_name.trim().toLowerCase()] = true;
    });
    var out = { rows: [], duplicates: [], invalid: [] };
    text.split(/\r?\n/).forEach(function(line){
      if (!line.trim()) return;
      var cells = line.split(/\t|,/).map(function(c){ return c.trim(); }).filter(Boolean);
      var email = cells.filter(function(c){ return c.indexOf("@") !== -1; })[0] || "";
      var name = cells.filter(function(c){ return c !== email; }).join(" ").trim();
      if (!email && /^name\b/i.test(name)) return; // a header row
      if (!name || !isEmail(email)){ out.invalid.push(line.trim()); return; }
      var crm = crmFromEmail(email);
      var keys = ["n:" + name.toLowerCase(), "e:" + email.toLowerCase(), "c:" + crm.toLowerCase()];
      if (keys.some(function(k){ return existing[k]; })){ out.duplicates.push(name); return; }
      keys.forEach(function(k){ existing[k] = true; });
      out.rows.push({ name: name, email: email, crm_name: crm });
    });
    return out;
  }

  function openBulkTraineeModal(){
    openModal(
      "<h3 class=\"modal-title\">Bulk add trainees</h3>" +
      selectField("bulk-lead", "Team lead", state.teamLeads, "Add a Team Lead first", "") +
      selectField("bulk-dept", "Department", state.departments, "Add a Department first", "") +
      "<div class=\"field\"><label for=\"bulk-text\">Trainees</label><textarea id=\"bulk-text\" rows=\"8\" spellcheck=\"false\" placeholder=\"Jordan Diaz, jordan.diaz@company.com&#10;Sam Lee, sam.lee@company.com\"></textarea></div>" +
      "<p class=\"hint\" style=\"margin:6px 0 0;\">One trainee per line: <b>Name, work email</b>. You can paste two columns straight from a sheet. CRM name is filled in from the email, without the @domain.</p>" +
      "<p class=\"hint\" id=\"bulkPreview\" style=\"margin:8px 0 0;\"></p>" +
      "<div class=\"modal-actions\">" +
        "<button class=\"ghost small\" id=\"cancelBulkBtn\" type=\"button\">Cancel</button>" +
        "<button class=\"primary small\" id=\"saveBulkBtn\" type=\"button\" disabled>Add trainees</button>" +
      "</div>" +
      "<span class=\"save-status\" id=\"bulkStatus\"></span>"
    );
    var box = document.getElementById("bulk-text"), preview = document.getElementById("bulkPreview"), saveBtn = document.getElementById("saveBulkBtn");
    var parsed = { rows: [], duplicates: [], invalid: [] };
    function update(){
      parsed = parseBulkTrainees(box.value);
      var bits = [];
      if (parsed.rows.length) bits.push(parsed.rows.length + " ready to add (" + parsed.rows.map(function(r){ return r.name + " → " + r.crm_name; }).join(", ") + ")");
      if (parsed.duplicates.length) bits.push("already on the roster, skipped: " + parsed.duplicates.join(", "));
      if (parsed.invalid.length) bits.push("needs a name and a valid email: " + parsed.invalid.join(" | "));
      preview.textContent = bits.join(" · ");
      saveBtn.disabled = !parsed.rows.length;
      saveBtn.textContent = parsed.rows.length ? "Add " + parsed.rows.length + " trainee" + (parsed.rows.length === 1 ? "" : "s") : "Add trainees";
    }
    box.addEventListener("input", update);
    document.getElementById("cancelBulkBtn").addEventListener("click", closeModal);
    saveBtn.addEventListener("click", function(){
      var lead = (document.getElementById("bulk-lead") || {}).value || "";
      var dept = (document.getElementById("bulk-dept") || {}).value || "";
      var rows = parsed.rows.map(function(r){ return Object.assign({}, r, { team_lead: lead, department: dept, nesting_status: "" }); });
      var statusEl = document.getElementById("bulkStatus");
      if (!rows.length) return;
      saveBtn.disabled = true;
      if (!dbFn){
        state.trainees = state.trainees.concat(rows.map(function(r, i){ return Object.assign({ id: "local-" + Date.now() + "-" + i }, r); }));
        closeModal();
        renderAll();
        return;
      }
      statusEl.textContent = "Adding " + rows.length + "…"; statusEl.className = "save-status";
      var now = new Date().toISOString(), failed = 0;
      rows.reduce(function(p, r){
        return p.then(function(){ return dbFn.collection("trainees").add(Object.assign({ created_at: now }, r)).catch(function(){ failed++; }); });
      }, Promise.resolve()).then(function(){
        if (!failed){ closeModal(); return; }
        statusEl.textContent = (rows.length - failed) + " added, " + failed + " couldn't be saved. Try those again."; statusEl.className = "save-status err";
        saveBtn.disabled = false;
      });
    });
    box.focus();
  }

  function openAddTraineeModal(){
    openModal(
      "<h3 class=\"modal-title\">Add trainee</h3>" +
      traineeModalFields(null) +
      "<div class=\"modal-actions\">" +
        "<button class=\"ghost small\" id=\"cancelTraineeBtn\" type=\"button\">Cancel</button>" +
        "<button class=\"primary small\" id=\"saveTraineeBtn\" type=\"button\">Save trainee</button>" +
      "</div>" +
      "<span class=\"save-status\" id=\"traineeSaveStatus\"></span>"
    );
    document.getElementById("saveTraineeBtn").addEventListener("click", function(){ saveTrainee(); });
    document.getElementById("cancelTraineeBtn").addEventListener("click", closeModal);
    wireEmailToCrm();
    document.getElementById("nt-name").focus();
  }

  function openEditTraineeModal(id){
    var t = state.trainees.filter(function(x){ return x.id === id; })[0];
    if (!t) return;
    openModal(
      "<h3 class=\"modal-title\">Edit trainee</h3>" +
      traineeModalFields(t) +
      "<div class=\"modal-actions\">" +
        "<button class=\"ghost small\" id=\"cancelTraineeBtn\" type=\"button\">Cancel</button>" +
        "<button class=\"primary small\" id=\"saveTraineeBtn\" type=\"button\">Save changes</button>" +
      "</div>" +
      "<span class=\"save-status\" id=\"traineeSaveStatus\"></span>"
    );
    document.getElementById("saveTraineeBtn").addEventListener("click", function(){ saveTrainee(id); });
    document.getElementById("cancelTraineeBtn").addEventListener("click", closeModal);
    wireEmailToCrm();
    document.getElementById("nt-name").focus();
  }

  function saveTrainee(editId){
    var name = ((document.getElementById("nt-name") || {}).value || "").trim();
    var crm = ((document.getElementById("nt-crm") || {}).value || "").trim();
    var email = ((document.getElementById("nt-email") || {}).value || "").trim();
    if (email && !isEmail(email)){
      var st = document.getElementById("traineeSaveStatus");
      if (st){ st.textContent = "Check the work email address."; st.className = "save-status err"; }
      return;
    }
    if (!crm && email) crm = crmFromEmail(email);
    var lead = ((document.getElementById("nt-lead") || {}).value || "").trim();
    var dept = ((document.getElementById("nt-dept") || {}).value || "").trim();
    var statusEl = document.getElementById("traineeSaveStatus");
    if (!name){
      if (statusEl){ statusEl.textContent = "Name is required."; statusEl.className = "save-status err"; }
      return;
    }
    var nestingEl = document.getElementById("nt-nesting");
    var record = { name: name, email: email, crm_name: crm, team_lead: lead, department: dept };
    if (nestingEl) record.nesting_status = nestingEl.value;
    else if (!editId) record.nesting_status = "";

    if (!dbFn || (editId && String(editId).indexOf("local-") === 0)){
      if (editId){
        state.trainees = state.trainees.map(function(t){ return t.id === editId ? Object.assign({}, t, record) : t; });
      } else {
        state.trainees = state.trainees.concat([Object.assign({ id: "local-" + Date.now() }, record)]);
      }
      closeModal();
      renderRosterPanel();
      return;
    }

    if (statusEl){ statusEl.textContent = "Saving…"; statusEl.className = "save-status"; }
    if (editId){
      dbFn.doc("trainees/" + editId).update(record)
        .then(function(){ closeModal(); })
        .catch(function(e){
          var msg = "Couldn't save — try again.";
          if (e && e.code === "invalid_argument") msg = "You don't have permission to edit trainees.";
          if (statusEl){ statusEl.textContent = msg; statusEl.className = "save-status err"; }
        });
    } else {
      record.created_at = new Date().toISOString();
      dbFn.collection("trainees").add(record)
        .then(function(){ closeModal(); })
        .catch(function(e){
          var msg = "Couldn't save — try again.";
          if (e && e.code === "invalid_argument") msg = "You don't have permission to add trainees.";
          if (statusEl){ statusEl.textContent = msg; statusEl.className = "save-status err"; }
        });
    }
  }

  function deleteTrainee(id){
    if (!dbFn || String(id).indexOf("local-") === 0){
      state.trainees = state.trainees.filter(function(t){ return t.id !== id; });
      renderRosterPanel();
      return;
    }
    dbFn.doc("trainees/" + id).delete().catch(function(){ /* leave it listed; the viewer can retry */ });
  }

  // ---- Team lead / Department (shared) ----
  function simpleListCardHtml(cfg){
    var items = state[cfg.stateKey];
    var listHtml;
    if (!items.length){
      listHtml = "<p class=\"hint\">No " + esc(cfg.label.toLowerCase()) + "s added yet.</p>";
    } else {
      listHtml =
        "<div class=\"roster-table-wrap\"><table class=\"preview\"><thead><tr><th>Name</th><th></th></tr></thead><tbody>" +
          items.map(function(it){
            return "<tr><td>" + esc(it.name) + "</td><td class=\"kebab-cell\"><button class=\"kebab-btn\" data-kebab-simple=\"" + esc(it.id) + "\" title=\"More options\" type=\"button\">⋮</button></td></tr>";
          }).join("") +
        "</tbody></table></div>";
    }

    return "<div class=\"card\">" +
        "<div class=\"resource-head\"><span class=\"r-icon\">" + ICONS[cfg.icon] + "</span><h2>" + esc(cfg.label) + "</h2>" +
          "<button class=\"primary small\" id=\"addSimpleBtn\" style=\"margin-left:auto;\" type=\"button\">+ Add " + esc(cfg.label.toLowerCase()) + "</button>" +
        "</div>" +
        "<p class=\"hint\">" + esc(cfg.hint) + " These are the only options offered under Team lead / Department on the Trainee tab.</p>" +
        listHtml +
      "</div>";
  }

  function wireSimpleListCard(cfg){
    document.getElementById("addSimpleBtn").addEventListener("click", function(){ openAddSimpleModal(cfg); });
    rosterHost.querySelectorAll("[data-kebab-simple]").forEach(function(btn){
      var id = btn.getAttribute("data-kebab-simple");
      btn.addEventListener("click", function(e){
        e.stopPropagation();
        openKebab(btn, id, [
          { label: "Edit", onClick: function(){ openAddSimpleModal(cfg, id); } },
          { label: "Delete", danger: true, onClick: function(){ deleteSimpleEntry(cfg, id); } }
        ]);
      });
    });
  }

  function openAddSimpleModal(cfg, editId){
    var item = editId ? state[cfg.stateKey].filter(function(it){ return it.id === editId; })[0] : null;
    if (editId && !item) return;
    var noun = cfg.label.toLowerCase();
    openModal(
      "<h3 class=\"modal-title\">" + (item ? "Edit " : "Add ") + esc(noun) + "</h3>" +
      "<div class=\"field\"><label for=\"ns-name\">Name</label><input type=\"text\" id=\"ns-name\" placeholder=\"" + esc(cfg.placeholder) + "\" value=\"" + esc(item ? item.name : "") + "\"></div>" +
      "<div class=\"modal-actions\">" +
        "<button class=\"ghost small\" id=\"cancelSimpleBtn\" type=\"button\">Cancel</button>" +
        "<button class=\"primary small\" id=\"saveSimpleBtn\" type=\"button\">" + (item ? "Save changes" : "Save " + esc(noun)) + "</button>" +
      "</div>" +
      "<span class=\"save-status\" id=\"simpleSaveStatus\"></span>"
    );
    document.getElementById("saveSimpleBtn").addEventListener("click", function(){ saveSimpleEntry(cfg, item); });
    document.getElementById("cancelSimpleBtn").addEventListener("click", closeModal);
    document.getElementById("ns-name").focus();
  }

  // Trainees and cohorts store a team lead / department by name, so a rename carries over to them.
  function renameReferences(cfg, oldName, newName){
    var field = cfg.key;
    var writes = [];
    [["trainees", state.trainees], ["cohorts", state.cohorts]].forEach(function(pair){
      pair[1].forEach(function(rec){
        if (rec[field] !== oldName) return;
        var patch = {}; patch[field] = newName;
        if (!dbFn || String(rec.id).indexOf("local-") === 0) rec[field] = newName;
        else writes.push(dbFn.doc(pair[0] + "/" + rec.id).update(patch));
      });
    });
    return Promise.all(writes);
  }

  function saveSimpleEntry(cfg, item){
    var name = ((document.getElementById("ns-name") || {}).value || "").trim();
    var statusEl = document.getElementById("simpleSaveStatus");
    if (!name){
      if (statusEl){ statusEl.textContent = "Name is required."; statusEl.className = "save-status err"; }
      return;
    }
    if (item){
      if (name === item.name){ closeModal(); return; }
      var failEdit = function(e){
        var msg = "Couldn't save — try again.";
        if (e && e.code === "invalid_argument") msg = "You don't have permission to edit entries.";
        if (statusEl){ statusEl.textContent = msg; statusEl.className = "save-status err"; }
      };
      if (!dbFn || String(item.id).indexOf("local-") === 0){
        state[cfg.stateKey] = state[cfg.stateKey].map(function(it){ return it.id === item.id ? Object.assign({}, it, { name: name }) : it; });
        renameReferences(cfg, item.name, name);
        closeModal();
        renderAll();
        return;
      }
      if (statusEl){ statusEl.textContent = "Saving…"; statusEl.className = "save-status"; }
      dbFn.doc(cfg.collection + "/" + item.id).update({ name: name })
        .then(function(){ return renameReferences(cfg, item.name, name); })
        .then(function(){ closeModal(); })
        .catch(failEdit);
      return;
    }
    if (!dbFn){
      state[cfg.stateKey] = state[cfg.stateKey].concat([{ id: "local-" + Date.now(), name: name }]);
      closeModal();
      renderRosterPanel();
      return;
    }
    if (statusEl){ statusEl.textContent = "Saving…"; statusEl.className = "save-status"; }
    dbFn.collection(cfg.collection).add({ name: name, created_at: new Date().toISOString() })
      .then(function(){ closeModal(); })
      .catch(function(e){
        var msg = "Couldn't save — try again.";
        if (e && e.code === "invalid_argument") msg = "You don't have permission to add entries.";
        if (statusEl){ statusEl.textContent = msg; statusEl.className = "save-status err"; }
      });
  }

  function deleteSimpleEntry(cfg, id){
    if (!dbFn || String(id).indexOf("local-") === 0){
      state[cfg.stateKey] = state[cfg.stateKey].filter(function(it){ return it.id !== id; });
      renderRosterPanel();
      return;
    }
    dbFn.doc(cfg.collection + "/" + id).delete().catch(function(){ /* leave it listed; the viewer can retry */ });
  }

  // ---- Cohorts (top-level tab) ----
  function renderCohortsPanel(){
    var selected = state.selectedCohortId ? state.cohorts.filter(function(c){ return c.id === state.selectedCohortId; })[0] : null;
    cohortPageReport = null;
    if (selected) renderCohortDetail(selected);
    else renderCohortsList();
    renderBreadcrumb();
    updateReportActions();
  }

  function renderCohortsList(){
    var listHtml;
    if (!state.cohorts.length){
      listHtml = "<p class=\"hint\">No cohorts created yet.</p>";
    } else {
      listHtml =
        "<div class=\"roster-table-wrap\"><table class=\"preview\"><thead><tr><th>Name</th><th>Department</th><th>Team lead</th><th>Start date</th><th>Members</th><th></th></tr></thead><tbody>" +
          state.cohorts.map(function(c){
            var names = (c.trainee_ids || []).map(function(id){
              var t = state.trainees.filter(function(x){ return x.id === id; })[0];
              return t ? t.name : null;
            }).filter(Boolean);
            var memberHtml = names.length
              ? "<div class=\"member-tags\">" + names.map(function(n){ return "<span class=\"member-tag\">" + esc(n) + "</span>"; }).join("") + "</div>"
              : "<span class=\"hint\" style=\"margin:0;\">No trainees assigned</span>";
            return "<tr><td><a href=\"#\" class=\"cohort-link\" data-open-cohort=\"" + esc(c.id) + "\">" + esc(c.name) + "</a></td><td>" + esc(c.department) + "</td><td>" + esc(c.team_lead) + "</td><td>" + esc(formatDate(c.training_start_date)) + "</td><td>" + memberHtml + "</td>" +
              "<td class=\"del\"><button class=\"del-btn\" data-del-cohort=\"" + esc(c.id) + "\" title=\"Remove\">&times;</button></td></tr>";
          }).join("") +
        "</tbody></table></div>";
    }

    el.cohortsBody.innerHTML =
      "<div class=\"card\">" +
        "<div class=\"resource-head\"><span class=\"r-icon\">" + ICONS.roster + "</span><h2>QA Data</h2>" +
        "</div>" +
        "<p class=\"hint\">Group trainees added under Settings → Roster → Trainee into a cohort, so you can pull and analyze a whole team/batch's audits at once from QA Data Request. Click a cohort's name to see its coaching data. Add or edit cohorts in the Cohorts app.</p>" +
        listHtml +
      "</div>";

    el.cohortsBody.querySelectorAll("[data-del-cohort]").forEach(function(btn){
      btn.addEventListener("click", function(){ deleteCohort(btn.getAttribute("data-del-cohort")); });
    });
    el.cohortsBody.querySelectorAll("[data-open-cohort]").forEach(function(a){
      a.addEventListener("click", function(e){ e.preventDefault(); openCohortDetail(a.getAttribute("data-open-cohort")); });
    });
  }

  var cohortAnalysesUnsub = null;

  // The live store can re-deliver a snapshot whose data hasn't changed (e.g. its periodic
  // refresh). Re-rendering on those rebuilds the page under the coach's cursor — dropping
  // clicks and focus — so only pass a snapshot on when its content actually differs.
  // The live store hands back frozen (read-only) objects. The page edits what it loads —
  // comments typed into a saved report, for one — so work on a plain, writable copy.
  function thawed(v){ return v == null ? v : JSON.parse(JSON.stringify(v)); }

  function onChangedSnapshot(fn){
    var last;
    return function(snap){
      var sig;
      try {
        sig = JSON.stringify(snap && snap.docs
          ? snap.docs.map(function(d){ return [d.id, d.data()]; })
          : [!!(snap && snap.exists), snap && snap.exists ? snap.data() : null]);
      } catch (e){ sig = undefined; }
      if (sig !== undefined && sig === last) return;
      last = sig;
      fn(snap);
    };
  }

  function openCohortDetail(id){
    if (cohortAnalysesUnsub){ cohortAnalysesUnsub(); cohortAnalysesUnsub = null; }
    state.selectedCohortId = id;
    state.cohortAnalyses = null;
    state.cohortDetailWeekId = null;
    state.cohortDetailView = null;
    renderCohortsPanel();
    if (!dbFn){ state.cohortAnalyses = []; renderCohortsPanel(); return; }
    // Live subscription — a pull saved while this page is open (here or in another tab)
    // shows up immediately, instead of requiring the viewer to navigate away and back.
    cohortAnalysesUnsub = dbFn.collection("analyses").where("target_id", "==", id).orderBy("pulled_at", "desc").limit(10)
      .onSnapshot(onChangedSnapshot(function(snap){
        state.cohortAnalyses = snap.docs.map(function(d){ return Object.assign({ id: d.id }, thawed(d.data())); });
        renderCohortsPanel();
        resolvePendingFeedback();
      }), function(){ state.cohortAnalyses = []; renderCohortsPanel(); });
  }

  function closeCohortDetail(){
    if (cohortAnalysesUnsub){ cohortAnalysesUnsub(); cohortAnalysesUnsub = null; }
    state.selectedCohortId = null;
    state.cohortAnalyses = null;
    state.cohortDetailWeekId = null;
    state.cohortDetailView = null;
    renderCohortsPanel();
  }

  // Merges the raw pulled rows (always present once a pull is saved) with the
  // qualitative per-trainee analysis (present only after Analyze has run), keyed
  // by trainee name so the week page works before and after analysis.
  function weekTraineeList(pick){
    var headers = pick.headers || [];
    var idx = headers.findIndex(function(h){ return /trainee|crm/i.test(h); });
    if (idx === -1) idx = 1;
    var byKey = {}, order = [];
    (pick.rows || []).forEach(function(r){
      var name = (r[idx] || "").trim();
      if (!name) return;
      var key = name.toLowerCase();
      if (!byKey[key]){ byKey[key] = { name: name, rawRows: [], analysis: null }; order.push(key); }
      byKey[key].rawRows.push(r);
    });
    (pick.trainees || []).forEach(function(t){
      var key = (t.name || "").trim().toLowerCase();
      if (!byKey[key]){ byKey[key] = { name: t.name, rawRows: [], analysis: null }; order.push(key); }
      byKey[key].analysis = t;
    });
    return order.map(function(k){ return byKey[k]; });
  }

  function talkingPointsModalHtml(entry){
    var t = entry.analysis;
    if (!t) return "<p class=\"hint\" style=\"margin:0;\">This trainee hasn't been analyzed yet. Request this week again in QA Data Request and save it to generate talking points.</p>";
    return "<div class=\"trainee-meta\">" + (t.audit_count ? t.audit_count + " audit" + (t.audit_count === 1 ? "" : "s") + " reviewed" : "Coaching brief") + "</div>" +
      (t.strengths.length ? "<div class=\"mini-card good\" style=\"margin:12px 0;\"><h4>Doing well</h4><ul>" + t.strengths.map(function(s){ return "<li>" + esc(s) + "</li>"; }).join("") + "</ul></div>" : "") +
      (t.talking_points.length ? "<ul class=\"talk\">" + t.talking_points.map(function(p){ return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" : "<p class=\"hint\">No talking points generated.</p>") +
      (t.suggested_focus ? "<div class=\"focus-line\"><b>Suggested focus &mdash; </b>" + esc(t.suggested_focus) + "</div>" : "");
  }

  // The Drive export escapes markdown punctuation ("1\." for "1.") and flattens a cell's
  // line breaks, so a numbered or bulleted QA comment arrives as one run-on line.
  function readableComment(text){
    var s = String(text == null ? "" : text).replace(/\\([\\`*_{}\[\]()#+\-.!|>~])/g, "$1").trim();
    if (/^1\.\s/.test(s)) s = s.replace(/\s+(?=\d{1,2}\.\s)/g, "\n");
    else if (/^[-•]\s/.test(s)) s = s.replace(/\s+(?=[-•]\s)/g, "\n");
    return s;
  }

  function markdownsModalHtml(entry, pick, fullPage){
    var t = entry.analysis;
    var tally = tallyPassRate(pick.headers, entry.rawRows);
    var scoreHtml = tally.total
      ? "<p style=\"margin:0 0 14px;\"><b>Score " + pctText(tally) + "</b> <span class=\"hint\" style=\"margin:0;\">&mdash; " + esc(passDetail(tally)) + " (Pass = 100%, Fail = 0%)</span></p>"
      : "";
    var issuesHtml = t && t.recurring_issues && t.recurring_issues.length
      ? "<div class=\"mini-card watch\" style=\"margin-bottom:14px;\"><h4>Recurring issues</h4><ul>" + t.recurring_issues.map(function(s){ return "<li>" + esc(s) + "</li>"; }).join("") + "</ul></div>"
      : "<p class=\"hint\" style=\"margin:0 0 14px;\">" + (t ? "No recurring issues found." : "Request this week again in QA Data Request and save it to see this trainee's recurring-issue summary.") + "</p>";
    var headers = pick.headers || [];
    var commentCols = headers.map(function(h){ return /markdown|comment|note|feedback/i.test(h); });
    var rowsHtml = entry.rawRows.length
      ? "<div style=\"overflow:auto;" + (fullPage ? "" : "max-height:340px;") + "border:1px solid var(--line);border-radius:10px;\"><table class=\"preview" + (fullPage ? " full-text" : "") + "\"><thead><tr>" +
          headers.map(function(h){ return "<th>" + esc(h) + "</th>"; }).join("") +
        "</tr></thead><tbody>" +
          entry.rawRows.map(function(r){
            return "<tr>" + r.map(function(c, i){
              return commentCols[i]
                ? "<td class=\"comment-col\">" + esc(readableComment(c)) + "</td>"
                : "<td>" + esc(c) + "</td>";
            }).join("") + "</tr>";
          }).join("") +
        "</tbody></table></div>"
      : "<p class=\"hint\">No raw audit rows saved for this trainee.</p>";
    return scoreHtml + issuesHtml + rowsHtml;
  }

  // ---- Knowledge gap analysis (owner-only, private to the viewer) ----
  function sideForDepartment(department){
    return /\bcp\b/i.test(department || "") ? "cp_side" : "c_side";
  }

  function kbGapDocRef(pullDocIdValue){
    if (!dbFn || !viewerId) return null;
    return dbFn.doc("data/users/" + viewerId + "/kb_gap").collection("weeks").doc(pullDocIdValue);
  }

  // A private, append-only log of every correction/calibration comment the coach adds —
  // separate from any one week's saved report, so future analyses (any week, any cohort)
  // can be told what was already corrected before, not just re-taught inside one doc.
  function learningsCollectionRef(){
    if (!dbFn || !viewerId) return null;
    return dbFn.doc("data/users/" + viewerId + "/learnings").collection("entries");
  }

  function logLearning(entry){
    var ref = learningsCollectionRef();
    if (!ref) return Promise.reject({ code: "no_private_storage" });
    return ref.add(Object.assign({ created_at: new Date().toISOString() }, entry));
  }

  function fetchRecentLearnings(limitCount){
    var ref = learningsCollectionRef();
    if (!ref) return Promise.resolve([]);
    return ref.orderBy("created_at", "desc").limit(limitCount || 20).get()
      .then(function(snap){ return snap.docs.map(function(d){ return thawed(d.data()); }); })
      .catch(function(){ return []; });
  }

  // ---- QA Data Request → Calibration Log (the coach's private history of comments on analyses) ----
  var learningsUnsub = null;

  function ensureLearningsSub(){
    if (learningsUnsub || !dbFn || !viewerId || !isArtifactOwner) return;
    var ref = learningsCollectionRef();
    if (!ref) return;
    learningsUnsub = ref.orderBy("created_at", "desc").limit(500).onSnapshot(function(snap){
      state.learnings = snap.docs.map(function(d){ return Object.assign({ id: d.id }, thawed(d.data())); });
      state.learningsError = false;
      if (state.section === "data" && state.dataTab === "repository") renderRepositoryPanel();
      if (state.section === "home") renderHome();
    }, function(){
      state.learningsError = true;
      if (state.section === "data" && state.dataTab === "repository") renderRepositoryPanel();
    });
  }

  function setDataTab(key){
    state.dataTab = key;
    renderDataPanel();
    renderBreadcrumb();
  }

  function openRepository(){
    state.dataTab = "repository";
    setSection("data");
    renderDataPanel();
  }

  function renderDataPanel(){
    // The Calibration Log is no longer a tab here; the owner opens it from its tile on Home.
    if (!isArtifactOwner) state.dataTab = "pull";
    el.dataTabs.hidden = true;
    var onRepo = state.dataTab === "repository";
    el.dataPullView.hidden = onRepo;
    el.repositoryBody.hidden = !onRepo;
    if (onRepo) renderRepositoryPanel();
  }

  function learningMatchesFilters(e){
    if (state.repoCohort && (e.cohort_name || "") !== state.repoCohort) return false;
    if (state.repoTheme === "overall" && e.theme) return false;
    if (state.repoTheme === "theme" && !e.theme) return false;
    var q = state.repoSearch.trim().toLowerCase();
    if (q){
      var hay = [e.comment, e.theme, e.cohort_name, e.week ? "week " + e.week : ""].join(" ").toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function repoTimeLabel(iso){
    var d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  // ---- Calibration Log → the finding a comment was made on ----
  function feedbackSourceCohort(e){
    if (!e || e.context !== "kb_gap" || !e.cohort_id || !e.week) return null;
    return state.cohorts.filter(function(c){ return c.id === e.cohort_id; })[0] || null;
  }
  function openFeedbackSource(entryId){
    var e = (state.learnings || []).filter(function(x){ return x.id === entryId; })[0];
    var cohort = feedbackSourceCohort(e);
    if (!cohort) return;
    state.pendingFeedback = { cohortId: cohort.id, week: String(e.week), theme: e.theme || null };
    startNavJump();
    setSection("cohorts");
    openCohortDetail(cohort.id);
    resolvePendingFeedback();
  }
  // Runs once the cohort's weeks have loaded: open that week's knowledge gap page.
  function resolvePendingFeedback(){
    var pf = state.pendingFeedback;
    if (!pf || state.selectedCohortId !== pf.cohortId || !state.cohortAnalyses) return;
    state.pendingFeedback = null;
    var cohort = state.cohorts.filter(function(c){ return c.id === pf.cohortId; })[0];
    var weekPick = state.cohortAnalyses.filter(function(a){ return String(a.week) === pf.week; })[0];
    if (cohort && weekPick){
      state.cohortDetailWeekId = weekPick.id;
      state.kbGapFocusTheme = pf.theme || "__overall__";
      openKbGapPage(cohort, weekPick);
    } // else the week is no longer saved — stay on the cohort page
    finishNavJump();
  }
  // After the knowledge gap page renders with its report, scroll to and flash the finding.
  function focusKbGapTarget(){
    var theme = state.kbGapFocusTheme;
    if (!theme || state.cohortDetailView !== "kb_gap") return;
    if (state.kbGapStatus === "loading") return; // try again once the report arrives
    state.kbGapFocusTheme = null;
    var r = state.kbGapRecord;
    if (!r) return;
    var target = null;
    if (theme === "__overall__") target = document.getElementById("kbGapComment");
    else {
      var idx = (r.assessments || []).map(function(a){ return a.theme; }).indexOf(theme);
      var box = idx !== -1 ? document.getElementById("kbAssessComment-" + idx) : null;
      target = box ? box.closest(".card") : null;
    }
    if (!target) return;
    if (target.id === "kbGapComment") target = target.closest(".field") || target;
    setTimeout(function(){
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.remove("flash-target");
      void target.offsetWidth;
      target.classList.add("flash-target");
    }, 0);
  }

  function renderRepositoryList(){
    var listEl = document.getElementById("repoList");
    var countEl = document.getElementById("repoCount");
    if (!listEl) return;
    var all = state.learnings || [];
    var inUseIds = {};
    all.slice(0, LEARNINGS_FED_TO_ANALYSIS).forEach(function(e){ inUseIds[e.id] = true; });
    var shown = all.filter(learningMatchesFilters);

    if (countEl) countEl.textContent = shown.length === all.length
      ? all.length + " entr" + (all.length === 1 ? "y" : "ies")
      : shown.length + " of " + all.length + " entries";

    if (!shown.length){
      listEl.innerHTML = "<p class=\"hint\">No entries match these filters.</p>";
      return;
    }

    var html = "", lastDay = null;
    shown.forEach(function(e){
      var day = e.created_at ? e.created_at.slice(0, 10) : "";
      if (day !== lastDay){
        html += "<div class=\"repo-day\">" + esc(day ? formatDate(day) : "Undated") + "</div>";
        lastDay = day;
      }
      var meta = [];
      if (e.cohort_name) meta.push("<b>" + esc(e.cohort_name) + "</b>");
      if (e.week) meta.push("Week " + esc(e.week));
      var chipClass = e.theme ? "badge" : "badge warn";
      var chipText = e.theme || "Overall";
      meta.push(feedbackSourceCohort(e)
        ? "<button class=\"" + chipClass + " badge-link\" data-open-feedback=\"" + esc(e.id) + "\" type=\"button\" title=\"Open this in the Knowledge gap analysis for Week " + esc(e.week) + "\">" + esc(chipText) + "</button>"
        : "<span class=\"" + chipClass + "\">" + esc(chipText) + "</span>");
      if (e.created_at) meta.push(esc(repoTimeLabel(e.created_at)));
      if (inUseIds[e.id]) meta.push("<span class=\"hint\" style=\"margin:0;\" title=\"Included as a calibration note in new analyses\">&#9679; In use</span>");
      html += "<div class=\"repo-entry\">" +
        "<div class=\"repo-entry-meta\">" + meta.join("<span aria-hidden=\"true\">&middot;</span>") +
          "<button class=\"del-btn\" data-del-learning=\"" + esc(e.id) + "\" title=\"Delete entry\" type=\"button\">&times;</button>" +
        "</div>" +
        "<p>" + esc(e.comment) + "</p>" +
      "</div>";
    });
    listEl.innerHTML = html;
    listEl.querySelectorAll("[data-del-learning]").forEach(function(btn){
      btn.addEventListener("click", function(){ confirmDeleteLearning(btn.getAttribute("data-del-learning")); });
    });
    listEl.querySelectorAll("[data-open-feedback]").forEach(function(btn){
      btn.addEventListener("click", function(){ openFeedbackSource(btn.getAttribute("data-open-feedback")); });
    });
  }

  function renderRepositoryPanel(){
    var active = document.activeElement;
    var searchFocused = active && active.id === "repoSearch";
    var caret = searchFocused ? active.selectionStart : null;

    var intro =
      "<div class=\"resource-head\"><span class=\"r-icon\">" + ICONS.book + "</span><h2>Calibration Log</h2>" +
        (downloadsFn && state.learnings && state.learnings.length ? "<button class=\"ghost small\" id=\"repoDownloadBtn\" style=\"margin-left:auto;\" type=\"button\">Download CSV</button>" : "") +
      "</div>" +
      "<p class=\"hint\">Every comment and correction you give on an analysis is saved here automatically, newest first. The " + LEARNINGS_FED_TO_ANALYSIS + " most recent are handed to each new Knowledge Gap Analysis as calibration notes. Only you can see this.</p>";

    var body;
    if (state.learningsError){
      body = "<p class=\"hint\" style=\"color:var(--danger);\">Couldn't load the Calibration Log — try reloading the page.</p>";
    } else if (!dbFn || !viewerId){
      body = "<p class=\"hint\">The Calibration Log needs saved storage, which isn't available in this view.</p>";
    } else if (state.learnings === null){
      body = "<p class=\"hint\">Loading…</p>";
    } else if (!state.learnings.length){
      body = "<p class=\"hint\">Nothing saved yet. Open a week under QA Data → Knowledge gap analysis and add a comment on any finding — it lands here as soon as you click away from the box.</p>";
    } else {
      var cohorts = [];
      state.learnings.forEach(function(e){ if (e.cohort_name && cohorts.indexOf(e.cohort_name) === -1) cohorts.push(e.cohort_name); });
      cohorts.sort();
      if (state.repoCohort && cohorts.indexOf(state.repoCohort) === -1) state.repoCohort = "";
      body =
        "<div class=\"repo-filters\">" +
          "<div class=\"field\"><label for=\"repoSearch\">Search</label><input type=\"search\" id=\"repoSearch\" placeholder=\"Search comments, themes, weeks…\" value=\"" + esc(state.repoSearch) + "\"></div>" +
          "<div class=\"field\"><label for=\"repoCohort\">Cohort</label><select id=\"repoCohort\"><option value=\"\">All cohorts</option>" +
            cohorts.map(function(c){ return "<option value=\"" + esc(c) + "\"" + (c === state.repoCohort ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") +
          "</select></div>" +
          "<div class=\"field\"><label for=\"repoTheme\">Type</label><select id=\"repoTheme\">" +
            [["", "All comments"], ["theme", "On a specific theme"], ["overall", "Overall comments"]].map(function(o){
              return "<option value=\"" + o[0] + "\"" + (o[0] === state.repoTheme ? " selected" : "") + ">" + o[1] + "</option>";
            }).join("") +
          "</select></div>" +
        "</div>" +
        "<p class=\"repo-count\" id=\"repoCount\"></p>" +
        "<div id=\"repoList\"></div>";
    }

    el.repositoryBody.innerHTML = "<div class=\"card\">" + intro + body + "</div>";

    var searchEl = document.getElementById("repoSearch");
    if (searchEl){
      searchEl.addEventListener("input", function(){ state.repoSearch = searchEl.value; renderRepositoryList(); });
      if (searchFocused){ searchEl.focus(); if (caret != null) searchEl.setSelectionRange(caret, caret); }
    }
    var cohortEl = document.getElementById("repoCohort");
    if (cohortEl) cohortEl.addEventListener("change", function(){ state.repoCohort = cohortEl.value; renderRepositoryList(); });
    var themeEl = document.getElementById("repoTheme");
    if (themeEl) themeEl.addEventListener("change", function(){ state.repoTheme = themeEl.value; renderRepositoryList(); });
    var dlBtn = document.getElementById("repoDownloadBtn");
    if (dlBtn) dlBtn.addEventListener("click", downloadRepositoryCSV);
    renderRepositoryList();
  }

  function confirmDeleteLearning(id){
    openModal(
      "<h3 class=\"modal-title\">Delete this entry?</h3>" +
      "<p class=\"hint\" style=\"margin:-8px 0 14px;\">It will no longer be used as a calibration note in new analyses. This can't be undone.</p>" +
      "<div class=\"modal-actions\">" +
        "<button class=\"ghost small\" id=\"cancelDelLearningBtn\" type=\"button\">Cancel</button>" +
        "<button class=\"primary small\" id=\"confirmDelLearningBtn\" type=\"button\">Delete</button>" +
      "</div>"
    );
    document.getElementById("cancelDelLearningBtn").addEventListener("click", closeModal);
    document.getElementById("confirmDelLearningBtn").addEventListener("click", function(){
      var ref = learningsCollectionRef();
      closeModal();
      if (ref) ref.doc(id).delete().catch(function(){ /* stays listed; the viewer can retry */ });
    });
  }

  function downloadRepositoryCSV(){
    if (!downloadsFn || !state.learnings) return;
    var lines = [csvRow(["Date", "Cohort", "Week", "Theme", "Comment"])];
    state.learnings.forEach(function(e){
      lines.push(csvRow([e.created_at || "", e.cohort_name || "", e.week || "", e.theme || "Overall", e.comment || ""]));
    });
    downloadsFn.save({ filename: "coaching-compass-calibration-log-" + new Date().toISOString().slice(0, 10) + ".csv", data: lines.join("\n") }).catch(function(){});
  }

  var KB_RESOURCE_CHAR_CAP = 50000;

  // Long Drive docs (a knowledge library, not a single short article) open with a huge
  // table of contents made of repeated "(about:blank)" placeholder links and "#bookmark="
  // anchors. Truncating from character 0 on a doc like that captures nothing but the ToC —
  // find the last such marker within a leading window and start the real excerpt after it.
  function stripLeadingTocNoise(text){
    var scanLimit = Math.min(text.length, 60000);
    var lastTocEnd = 0;
    var re = /\(about:blank\)|#bookmark=/g;
    var m;
    while ((m = re.exec(text)) && m.index < scanLimit){
      lastTocEnd = m.index + m[0].length;
    }
    return lastTocEnd > 0 ? text.slice(lastTocEnd) : text;
  }

  function fetchKbResourceContent(link){
    return fetchKbResourceContentRaw(link).then(function(r){ recordKbReads([r]); return r; });
  }
  function fetchKbResourceContentRaw(link){
    var label = link.label || link.url;
    var fileId = extractDriveFileId(link.url);
    if (!mcpFn || !fileId) return Promise.resolve({ label: label, url: link.url, content: null, fetched: false, truncated: false });
    return mcpFn.callTool("Google Drive", "read_file_content", { fileId: fileId })
      .then(function(result){
        var text = extractTextFromToolResult(result);
        if (!text) return { label: label, url: link.url, content: null, fetched: false, truncated: false };
        var body = stripLeadingTocNoise(text);
        var truncated = body.length > KB_RESOURCE_CHAR_CAP;
        return { label: label, url: link.url, content: body.slice(0, KB_RESOURCE_CHAR_CAP), fetched: true, truncated: truncated };
      })
      .catch(function(){ return { label: label, url: link.url, content: null, fetched: false, truncated: false }; });
  }

  function buildKbGapPrompt(themes, sideLabel, resources, comment, priorAssessments, recentLearnings){
    var resourcesText = resources.length
      ? resources.map(function(r, i){
          return (i + 1) + ". \"" + r.label + "\" (" + r.url + ")\n" +
            (r.fetched
              ? "Content" + (r.truncated ? " (long document — this is an excerpt after skipping its table of contents; later sections were not included, so treat gaps found here as provisional)" : "") + ":\n\"\"\"\n" + r.content + "\n\"\"\""
              : "Content could not be retrieved automatically — evaluate this resource by its title/label only, and say so explicitly wherever you rely on it.");
        }).join("\n\n")
      : "No knowledge base resources are set up for this side yet (Settings → Knowledge Base).";

    var priorByTheme = {};
    (priorAssessments || []).forEach(function(a){ if (a && a.theme) priorByTheme[a.theme] = a; });

    var themesText = themes.map(function(t, i){
      var line = (i + 1) + ". " + t.theme + " (" + (t.frequency || "frequency not given") + ") — " + t.description;
      var prior = priorByTheme[t.theme];
      if (prior && prior.comment && prior.comment.trim()){
        line += "\n   Your previous verdict on this theme: \"" + (prior.verdict || "") + "\" (" + (prior.has_gap ? "flagged as an opportunity" : "flagged as already stated clearly") + ").\n" +
          "   The coach responded to that verdict: \"" + prior.comment.trim() + "\" — address this directly and adjust your verdict if it's warranted.";
      }
      return line;
    }).join("\n\n");

    var commentBlock = comment && comment.trim()
      ? "\n\nThe coach added this overall context — weigh it when you assess coverage:\n\"" + comment.trim() + "\""
      : "";

    var learningsBlock = (recentLearnings && recentLearnings.length)
      ? "\n\nCalibration notes from the coach's past corrections on other weeks/cohorts — apply these where relevant, ignore where they don't fit this data:\n" +
        recentLearnings.map(function(l){
          var tag = (l.cohort_name || "a cohort") + (l.week ? ", Week " + l.week : "") + (l.theme ? ", theme \"" + l.theme + "\"" : ", overall");
          return "- (" + tag + "): " + l.comment;
        }).join("\n")
      : "";

    return "You are helping a QA coach find the gap between recurring trainee mistakes and the team's knowledge-base resources, so they can improve their training materials.\n\n" +
      "Common mistake THEMES from this week's audits (" + sideLabel + " team):\n" + themesText + "\n\n" +
      "Knowledge base resources currently available for this side:\n" + resourcesText +
      commentBlock + learningsBlock + "\n\n" +
      "For EACH theme above, decide: does an existing resource clearly and specifically address this exact mistake? " +
      "If yes, name which resource and describe what in it covers this, then state plainly there is no gap (it's already stated clearly). " +
      "If a resource only partially covers it, is hard to find, or nothing covers it at all, describe the SPECIFIC opportunity: what should be added, clarified, or reorganized to close that gap. " +
      "Never invent resource content you were not given — for a resource evaluated by title only, say so and treat your verdict on it as tentative.\n\n" +
      "Reply with ONLY a single JSON object, no other text and no markdown fences:\n" +
      "{\n" +
      '  "assessments": [\n' +
      "    { \"theme\": \"string, matching a theme above\", \"has_gap\": true or false, \"verdict\": \"string, 2-4 sentences\", \"cited_resource\": \"string or null\", \"suggested_addition\": \"string or null, only when has_gap is true\" }\n" +
      "  ],\n" +
      '  "overall_note": "string, 1-2 sentences summarizing the overall picture"\n' +
      "}";
  }

  // ---- Knowledge Gap Analysis (full page, not a modal — state lives on `state.kbGap*`
  // so it survives the re-renders a live cohort-analysis snapshot can trigger while open) ----

  function kbGapSnapshotComments(record){
    var map = { overall: (record && record.comment) || "" };
    (record && record.assessments || []).forEach(function(a){ if (a && a.theme) map[a.theme] = a.comment || ""; });
    return map;
  }

  var kbGapPendingLogs = [];
  function kbGapLogNewComments(cohort, weekPick){
    var current = kbGapSnapshotComments(state.kbGapRecord);
    var logged = 0;
    Object.keys(current).forEach(function(key){
      var text = (current[key] || "").trim();
      if (!text || text === (state.kbGapLoggedComments[key] || "").trim()) return;
      logged++;
      kbGapPendingLogs.push(logLearning({
        context: "kb_gap",
        cohort_id: cohort.id,
        cohort_name: cohort.name,
        week: weekPick.week,
        theme: key === "overall" ? null : key,
        comment: text
      }).then(function(){ return null; }, function(e){ return { code: (e && e.code) || "unknown", key: key }; }));
    });
    state.kbGapLoggedComments = current;
    return logged;
  }

  function openKbGapPage(cohort, weekPick){
    state.cohortDetailView = "kb_gap";
    var docId = weekPick.id;
    if (state.kbGapDocId === docId){ renderCohortsPanel(); return; }
    state.kbGapDocId = docId;
    state.kbGapStatus = "loading";
    state.kbGapRecord = null;
    state.kbGapComment = "";
    state.kbGapError = null;
    state.kbGapLoggedComments = {};
    state.kbGapSaveNote = null;
    renderCohortsPanel();
    var docRef = kbGapDocRef(docId);
    if (!docRef){ state.kbGapStatus = "idle"; renderCohortsPanel(); return; }
    docRef.get().then(function(snap){
      if (state.kbGapDocId !== docId) return; // navigated elsewhere while this was loading
      if (snap.exists){
        var data = thawed(snap.data());
        state.kbGapRecord = data;
        state.kbGapComment = data.comment || "";
        state.kbGapLoggedComments = kbGapSnapshotComments(state.kbGapRecord);
      }
      state.kbGapStatus = state.kbGapRecord ? "ready" : "idle";
      renderCohortsPanel();
    }).catch(function(){
      if (state.kbGapDocId !== docId) return;
      state.kbGapStatus = "idle";
      renderCohortsPanel();
    });
  }

  // Per-box Save buttons: a box is "dirty" when its text differs from what was last saved.
  function kbBoxKey(idx){
    if (idx === "overall") return "overall";
    var a = state.kbGapRecord && state.kbGapRecord.assessments && state.kbGapRecord.assessments[Number(idx)];
    return a && a.theme ? a.theme : null;
  }
  // What's on screen is the source of truth: the browser can refill a box (e.g. restoring
  // form text on reload) without firing an input event, so read the boxes before using state.
  function syncKbBoxesFromDom(){
    var r = state.kbGapRecord;
    el.cohortsBody.querySelectorAll("[data-assess-idx]").forEach(function(ta){
      var a = r && r.assessments && r.assessments[Number(ta.getAttribute("data-assess-idx"))];
      if (a) a.comment = ta.value;
    });
    var overall = document.getElementById("kbGapComment");
    if (overall) state.kbGapComment = overall.value;
  }
  function kbBoxText(idx){
    syncKbBoxesFromDom();
    if (idx === "overall") return state.kbGapComment || "";
    var a = state.kbGapRecord && state.kbGapRecord.assessments && state.kbGapRecord.assessments[Number(idx)];
    return (a && a.comment) || "";
  }
  function kbBoxDirty(idx){
    var key = kbBoxKey(idx);
    return !!key && kbBoxText(idx).trim() !== (state.kbGapLoggedComments[key] || "").trim();
  }
  var kbBoxSavedAt = {};
  function kbSaveNoteEl(idx){ return el.cohortsBody.querySelector("[data-kb-save-note=\"" + idx + "\"]"); }
  // The button always stays clickable; the note beside it says whether the box is saved.
  function refreshKbSaveButton(idx){
    var note = kbSaveNoteEl(idx);
    if (!note) return;
    if (kbBoxDirty(idx)){ note.textContent = "Not saved yet"; note.className = "save-status"; }
    else if (kbBoxText(idx).trim()){ note.textContent = "Saved ✓"; note.className = "save-status ok"; }
    else { note.textContent = ""; note.className = "save-status"; }
  }

  // Runs on Save comment, and when a comment box loses focus. Writes the status lines in
  // place instead of re-rendering the page, so the box the coach just clicked into keeps focus.
  function autoSaveKbGapComments(cohort, weekPick){
    if (!state.kbGapRecord || state.kbGapStatus === "generating") return;
    syncKbBoxesFromDom();
    state.kbGapRecord.comment = state.kbGapComment;
    var boxIds = ["overall"].concat((state.kbGapRecord.assessments || []).map(function(_, i){ return String(i); }));
    var dirtyBoxes = boxIds.filter(kbBoxDirty);
    function setBoxNotes(text, ok){
      dirtyBoxes.forEach(function(idx){
        kbBoxSavedAt[idx] = Date.now();
        var n = kbSaveNoteEl(idx);
        if (n){ n.textContent = text; n.className = "save-status" + (ok === true ? " ok" : ok === false ? " err" : ""); }
      });
    }
    kbGapPendingLogs = [];
    var logged = kbGapLogNewComments(cohort, weekPick);
    var logWrites = kbGapPendingLogs; // each resolves null, or {code} if that Calibration Log write failed
    var docId = weekPick.id;
    function setNote(text){
      state.kbGapSaveNote = text;
      var n = document.getElementById("kbGapAutoSaveNote");
      if (n) n.textContent = text;
    }
    var savedText = logged ? "Saved · added to Calibration Log" : "Saved";
    var docRef = kbGapDocRef(docId);
    var failedKeys = dirtyBoxes.map(kbBoxKey);
    function fail(code){
      if (state.kbGapDocId !== docId) return;
      // Mark those boxes unsaved again so Save comment can retry them.
      failedKeys.forEach(function(k){ if (k) delete state.kbGapLoggedComments[k]; });
      var why = code ? " (" + code + ")" : "";
      setNote("Couldn't save" + why + " — click Save comment to retry.");
      setBoxNotes("Couldn't save" + why + " — try again.", false);
    }
    if (!docRef){ fail("no_private_storage"); return; }
    setNote("Saving…");
    setBoxNotes("Saving…");
    var slow = setTimeout(function(){ if (state.kbGapDocId === docId) setBoxNotes("Still saving…"); }, 10000);
    Promise.all([docRef.set(state.kbGapRecord)].concat(logWrites))
      .then(function(results){
        clearTimeout(slow);
        if (state.kbGapDocId !== docId) return;
        var logFail = results.slice(1).filter(Boolean)[0];
        if (logFail){
          setNote("Saved to the report, but the Calibration Log didn't take it (" + logFail.code + ").");
          setBoxNotes("Saved ✓ · Calibration Log failed (" + logFail.code + ")", false);
          return;
        }
        setNote(savedText);
        setBoxNotes(logged ? "Saved ✓ · added to Calibration Log" : "Saved ✓", true);
      })
      .catch(function(e){ clearTimeout(slow); fail(e && e.code); });
  }

  function generateKbGap(cohort, weekPick){
    var themes = weekPick.team_themes || [];
    if (!themes.length){ state.kbGapStatus = "empty_themes"; renderCohortsPanel(); return; }
    if (!sampleFn){ state.kbGapStatus = "error"; state.kbGapError = "Analysis isn't available in this view."; renderCohortsPanel(); return; }
    var sideKey = sideForDepartment(cohort.department);
    var sideLabel = sideKey === "cp_side" ? "CP side" : "C side";
    var priorAssessments = state.kbGapRecord ? state.kbGapRecord.assessments : null;
    if (state.kbGapRecord){ state.kbGapRecord.comment = state.kbGapComment; kbGapLogNewComments(cohort, weekPick); }
    state.kbGapStatus = "generating";
    state.kbGapSaveNote = null;
    var docId = weekPick.id;
    renderCohortsPanel();

    var links = (state.kbLinks[sideKey] || []).filter(function(l){ return l && l.url; });
    Promise.all([Promise.all(links.map(fetchKbResourceContent)), fetchRecentLearnings(20)]).then(function(results){
      if (state.kbGapDocId !== docId) return null;
      var fetchedResources = results[0];
      var recentLearnings = results[1];
      var prompt = buildKbGapPrompt(themes, sideLabel, fetchedResources, state.kbGapComment, priorAssessments, recentLearnings);
      return sampleFn.json(prompt, { modelTier: "complex", cache: false }).then(function(data){
        if (state.kbGapDocId !== docId) return;
        var priorByTheme = {};
        (priorAssessments || []).forEach(function(a){ if (a && a.theme) priorByTheme[a.theme] = a; });
        var assessments = (Array.isArray(data && data.assessments) ? data.assessments : []).map(function(a){
          var prior = priorByTheme[a.theme];
          return Object.assign({}, a, { comment: prior ? (prior.comment || "") : "" });
        });
        var record = {
          side: sideKey,
          comment: state.kbGapComment,
          assessments: assessments,
          overall_note: (data && data.overall_note) || "",
          resources_checked: fetchedResources.map(function(r){ return { label: r.label, fetched: r.fetched, truncated: !!r.truncated }; }),
          generated_at: new Date().toISOString()
        };
        state.kbGapRecord = record;
        state.kbGapStatus = "ready";
        kbGapLogNewComments(cohort, weekPick);
        renderCohortsPanel();
        var docRef = kbGapDocRef(docId);
        if (docRef) docRef.set(record).catch(function(){ /* the result still shows in-app even if the private save fails */ });
      });
    }).catch(function(e){
      if (state.kbGapDocId !== docId) return;
      state.kbGapStatus = "error";
      state.kbGapError = errorCopy(e && e.code) || "Something went wrong generating this analysis.";
      renderCohortsPanel();
    });
  }

  function kbGapPageHtml(cohort, weekPick){
    var sideKey = sideForDepartment(cohort.department);
    var sideLabel = sideKey === "cp_side" ? "CP side" : "C side";
    var themes = weekPick.team_themes || [];

    var titleHtml = "<h2 style=\"margin:0 0 4px;\">Knowledge gap analysis — Week " + esc(weekPick.week) + "</h2>" +
      "<p class=\"hint\" style=\"margin:0 0 8px;\">Compares this week's mistake themes against the " + esc(sideLabel) + " Knowledge Base (Settings → Knowledge Base). Only you can see this.</p>" +
      "<button class=\"link-btn\" id=\"viewLearningsBtn\" type=\"button\" style=\"margin-bottom:14px;\">Open Calibration Log (comment history) →</button>";

    var bodyHtml;
    if (state.kbGapStatus === "loading"){
      bodyHtml = "<p class=\"hint\">Loading…</p>";
    } else if (state.kbGapStatus === "generating"){
      bodyHtml = "<p class=\"hint\"><span class=\"spinner\" style=\"display:inline-block;vertical-align:middle;margin-right:6px;\"></span>Comparing themes against the knowledge base…</p>";
    } else if (state.kbGapStatus === "error"){
      bodyHtml = "<p class=\"hint\" style=\"color:var(--danger);\">" + esc(state.kbGapError || "Something went wrong.") + "</p>";
    } else if (state.kbGapStatus === "empty_themes"){
      bodyHtml = "<p class=\"hint\">Run an analysis on this week first — there are no mistake themes yet to compare.</p>";
    } else if (state.kbGapRecord){
      var r = state.kbGapRecord;
      bodyHtml =
        (r.overall_note ? "<p style=\"margin:0 0 14px;\">" + esc(r.overall_note) + "</p>" : "") +
        (r.assessments || []).map(function(a, i){
          var badge = a.has_gap ? "<span class=\"badge warn\">Opportunity</span>" : "<span class=\"badge\">Stated clearly</span>";
          return "<div class=\"card\" style=\"margin-bottom:10px;padding:14px;\">" +
            "<div class=\"row\" style=\"justify-content:space-between;margin-bottom:6px;\"><b>" + esc(a.theme) + "</b>" + badge + "</div>" +
            "<p style=\"margin:0 0 6px;\">" + esc(a.verdict) + "</p>" +
            (a.cited_resource ? "<p class=\"hint\" style=\"margin:0 0 6px;\">Resource: " + esc(a.cited_resource) + "</p>" : "") +
            (a.has_gap && a.suggested_addition ? "<div class=\"coach-move\"><b>Suggested addition &mdash; </b>" + esc(a.suggested_addition) + "</div>" : "") +
            "<div class=\"field\" style=\"margin:10px 0 0;\">" +
              "<label for=\"kbAssessComment-" + i + "\">Your comment / clarification (optional)</label>" +
              "<textarea id=\"kbAssessComment-" + i + "\" rows=\"2\" autocomplete=\"off\" data-assess-idx=\"" + i + "\" placeholder=\"Respond to this specific finding — e.g. it's actually covered in a different doc.\">" + esc(a.comment || "") + "</textarea>" +
              "<div class=\"kb-save-row\"><button class=\"ghost small\" data-kb-save=\"" + i + "\" type=\"button\">Save comment</button><span class=\"save-status\" data-kb-save-note=\"" + i + "\"></span></div>" +
            "</div>" +
          "</div>";
        }).join("") +
        (r.resources_checked && r.resources_checked.length
          ? "<p class=\"hint\" style=\"margin-top:10px;\">Resources checked: " + r.resources_checked.map(function(rc){
              return esc(rc.label) + (rc.truncated ? " (long — excerpt only)" : rc.fetched ? "" : " (title only)");
            }).join(", ") + "</p>"
          : "") +
        (r.generated_at ? "<p class=\"hint\" style=\"margin-top:4px;\">Generated " + esc(formatDate(r.generated_at.slice(0, 10))) + "</p>" : "");
    } else {
      bodyHtml = "<p class=\"hint\">No analysis yet. Click Generate to compare this week's themes against the " + esc(sideLabel) + " knowledge base.</p>";
    }

    var commentHtml =
      "<div class=\"field\" style=\"margin-top:16px;\">" +
        "<label for=\"kbGapComment\">Overall comment / clarification (optional)</label>" +
        "<textarea id=\"kbGapComment\" rows=\"2\" autocomplete=\"off\" placeholder=\"General context for the whole report — e.g. focus on C side only this week.\">" + esc(state.kbGapComment) + "</textarea>" +
        (state.kbGapRecord ? "<div class=\"kb-save-row\"><button class=\"ghost small\" data-kb-save=\"" + "overall" + "\" type=\"button\">Save comment</button><span class=\"save-status\" data-kb-save-note=\"" + "overall" + "\"></span></div>" : "") +
      "</div>";

    var canGenerate = state.kbGapStatus !== "loading" && state.kbGapStatus !== "generating" && themes.length > 0 && !!sampleFn;
    var generateLabel = state.kbGapRecord ? "Regenerate" : "Generate";
    var autoSaveHint = state.kbGapRecord ? "Comments are saved to the Calibration Log when you click Save comment (or click away from a box)." : "";

    return "<div class=\"card\">" +
      titleHtml + bodyHtml + commentHtml +
      "<div class=\"row\" style=\"margin-top:16px;justify-content:flex-end;gap:10px;\">" +
        "<span class=\"save-status\" id=\"kbGapAutoSaveNote\" style=\"margin-right:auto;\">" + esc(state.kbGapSaveNote || autoSaveHint) + "</span>" +
        "<button class=\"primary small\" id=\"generateKbGapBtn\" type=\"button\"" + (canGenerate ? "" : " disabled") + ">" + generateLabel + "</button>" +
      "</div>" +
    "</div>";
  }

  function wireKbGapPage(cohort, weekPick){
    var viewLearningsBtn = document.getElementById("viewLearningsBtn");
    if (viewLearningsBtn) viewLearningsBtn.addEventListener("click", openRepository);
    var commentEl = document.getElementById("kbGapComment");
    if (commentEl){
      commentEl.addEventListener("input", function(){ state.kbGapComment = commentEl.value; refreshKbSaveButton("overall"); });
      commentEl.addEventListener("change", function(){ autoSaveKbGapComments(cohort, weekPick); });
    }
    el.cohortsBody.querySelectorAll("[data-assess-idx]").forEach(function(ta){
      ta.addEventListener("input", function(){
        var idx = Number(ta.getAttribute("data-assess-idx"));
        if (state.kbGapRecord && state.kbGapRecord.assessments && state.kbGapRecord.assessments[idx]) state.kbGapRecord.assessments[idx].comment = ta.value;
        refreshKbSaveButton(String(idx));
      });
      ta.addEventListener("change", function(){ autoSaveKbGapComments(cohort, weekPick); });
    });
    el.cohortsBody.querySelectorAll("[data-kb-save]").forEach(function(btn){
      var idx = btn.getAttribute("data-kb-save");
      // Clicking Save blurs the box first, which may already have saved it — only save if still unsaved.
      btn.addEventListener("click", function(){
        try {
          if (kbBoxDirty(idx)){ autoSaveKbGapComments(cohort, weekPick); return; }
        } catch (e){
          var errNote = kbSaveNoteEl(idx);
          if (errNote){ errNote.textContent = "Couldn't save (" + ((e && (e.code || e.message)) || "error") + ") — try again."; errNote.className = "save-status err"; }
          return;
        }
        var note = kbSaveNoteEl(idx);
        // Clicking Save blurs the box, which saves it a moment earlier — keep that save's message.
        if (Date.now() - (kbBoxSavedAt[idx] || 0) < 2000) return;
        if (note){
          note.textContent = kbBoxText(idx).trim() ? "Saved ✓ — nothing new to save" : "Type a comment first";
          note.className = "save-status" + (kbBoxText(idx).trim() ? " ok" : "");
        }
      });
      refreshKbSaveButton(idx);
    });
    var genBtn = document.getElementById("generateKbGapBtn");
    if (genBtn) genBtn.addEventListener("click", function(){ generateKbGap(cohort, weekPick); });
  }

  function themesPageHtml(weekPick){
    var rowCount = Array.isArray(weekPick.rows) ? weekPick.rows.length : 0;
    return "<div class=\"card\">" +
      "<h2 style=\"margin:0 0 4px;\">Common themes of mistakes — Week " + esc(weekPick.week) + "</h2>" +
      "<p class=\"hint\" style=\"margin:0 0 16px;\">" + rowCount + " audit" + (rowCount === 1 ? "" : "s") + " reviewed.</p>" +
      themesHtml(weekPick.team_themes || []) +
    "</div>";
  }

  function renderCohortDetail(cohort){
    var onWeekDetailPage = !!state.cohortDetailWeekId;
    var weekPick = null, weekEntries = null;
    if (state.cohortAnalyses && onWeekDetailPage){
      weekPick = state.cohortAnalyses.filter(function(a){ return a.id === state.cohortDetailWeekId; })[0] || null;
    } else if (state.cohortAnalyses && state.cohortAnalyses.length){
      // No specific week open — default the Trainees card's quick-access buttons to the most recent week.
      weekPick = state.cohortAnalyses[0];
    }
    if (weekPick) weekEntries = weekTraineeList(weekPick);

    function findWeekEntryForTrainee(t){
      if (!weekEntries) return null;
      var crm = (t.crm_name || "").trim().toLowerCase();
      var name = (t.name || "").trim().toLowerCase();
      return weekEntries.filter(function(e){
        var en = (e.name || "").trim().toLowerCase();
        return (crm && en === crm) || en === name;
      })[0] || null;
    }

    var entryByTraineeId = {};
    var membersHtml = (cohort.trainee_ids || []).map(function(id){
      var t = state.trainees.filter(function(x){ return x.id === id; })[0];
      if (!t) return null;
      if (weekPick){
        var entry = findWeekEntryForTrainee(t);
        entryByTraineeId[t.id] = entry;
        var disabledAttr = entry ? "" : " disabled title=\"No data for this trainee yet\"";
        var chip = entry ? scoreChipHtml(tallyPassRate(weekPick.headers, entry.rawRows)) : "";
        return "<div class=\"cohort-trainee-row\">" +
          "<span class=\"row\" style=\"gap:8px;\"><button class=\"trainee-name-link\" data-goto=\"individual\" data-trainee=\"" + esc(t.name) + "\" data-week=\"" + esc(weekPick.week) + "\" type=\"button\">" + esc(t.name) + "</button>" + chip + "</span>" +
          "<div class=\"row\" style=\"gap:8px;\">" +
            "<button class=\"ghost small\" data-open-talking=\"" + esc(t.id) + "\" type=\"button\"" + disabledAttr + ">Coaching talking points</button>" +
            "<button class=\"ghost small\" data-open-markdowns=\"" + esc(t.id) + "\" type=\"button\"" + disabledAttr + ">Markdowns</button>" +
            (onWeekDetailPage ? "" : "<button class=\"del-btn\" data-remove-cohort-trainee=\"" + esc(t.id) + "\" title=\"Remove from cohort\" type=\"button\">&times;</button>") +
          "</div>" +
        "</div>";
      }
      return "<div class=\"cohort-trainee-row\">" +
        "<button class=\"trainee-name-link\" data-goto=\"individual\" data-trainee=\"" + esc(t.name) + "\" type=\"button\">" + esc(t.name) + "</button>" +
        "<button class=\"del-btn\" data-remove-cohort-trainee=\"" + esc(t.id) + "\" title=\"Remove from cohort\" type=\"button\">&times;</button>" +
      "</div>";
    }).filter(Boolean).join("");

    var metaBits = [];
    if (cohort.department) metaBits.push(esc(cohort.department));
    if (cohort.team_lead) metaBits.push("Led by " + esc(cohort.team_lead));
    if (cohort.training_start_date) metaBits.push("Started " + esc(formatDate(cohort.training_start_date)));

    var header =
      "<div class=\"row\" style=\"justify-content:space-between;align-items:flex-start;gap:16px;\">" +
        "<h1 style=\"margin:0 0 4px;\">" + esc(cohort.name) + "</h1>" +
        "<button class=\"ghost small\" id=\"editCohortBtn\" style=\"flex:none;\" type=\"button\">Edit cohort</button>" +
      "</div>" +
      (metaBits.length ? "<p class=\"sub\" style=\"margin-bottom:20px;\">" + metaBits.join(" &middot; ") + "</p>" : "<div style=\"margin-bottom:20px;\"></div>");

    var onSubPage = onWeekDetailPage && !!weekPick && !!state.cohortDetailView;

    var traineesCard = onSubPage ? "" :
      "<div class=\"card\">" +
        "<div class=\"resource-head\"><h2>Trainees</h2>" + (onWeekDetailPage ? "" : "<button class=\"primary small\" id=\"addCohortTraineeBtn\" style=\"margin-left:auto;\" type=\"button\">+ Add trainee</button>") + "</div>" +
        (membersHtml ? "<div class=\"cohort-trainee-list\">" + membersHtml + "</div>" : "<p class=\"hint\">No trainees assigned to this cohort yet.</p>") +
      "</div>";

    var coachingHtml;
    if (state.cohortAnalyses === null){
      coachingHtml = "<div class=\"card\"><p class=\"hint\">Loading coaching data…</p></div>";
    } else if (!state.cohortAnalyses.length){
      coachingHtml =
        "<div class=\"card empty-state\">" + ICONS.empty +
        "<h2>No analysis yet</h2>" +
        "<p>Request this cohort's audits in QA Data Request and save them to see coaching data here.</p>" +
        "<button class=\"primary small\" data-goto=\"data\" type=\"button\">Go to QA Data Request</button>" +
        "</div>";
    } else if (!state.cohortDetailWeekId){
      coachingHtml =
        "<div class=\"card\"><h2>Weeks</h2>" +
          "<p class=\"hint\">Saving a week from QA Data Request adds it here.</p>" +
          "<div class=\"cohort-trainee-list\">" +
            state.cohortAnalyses.map(function(a){
              var rowCount = Array.isArray(a.rows) ? a.rows.length : 0;
              var statusBadge = a.summary ? "<span class=\"badge\">Analyzed</span>" : "<span class=\"badge warn\">Not analyzed</span>";
              return "<div class=\"cohort-trainee-row\">" +
                "<button class=\"trainee-name-link\" data-open-week=\"" + esc(a.id) + "\" type=\"button\">Week " + esc(a.week) + "</button>" +
                "<div class=\"row\" style=\"gap:10px;\">" +
                  "<span class=\"hint\" style=\"margin:0;\">" + rowCount + " audit" + (rowCount === 1 ? "" : "s") + "</span>" +
                  statusBadge +
                "</div>" +
              "</div>";
            }).join("") +
          "</div>" +
        "</div>";
    } else if (!weekPick){
      coachingHtml = "<div class=\"card\"><p class=\"hint\">This week's data is no longer available.</p><button class=\"ghost small\" id=\"backToWeeksBtn\" type=\"button\">← Back to weeks</button></div>";
    } else if (state.cohortDetailView === "themes"){
      coachingHtml = themesPageHtml(weekPick);
      if (weekPick.team_themes && weekPick.team_themes.length) cohortPageReport = themesReport(cohort, weekPick);
    } else if (state.cohortDetailView === "kb_gap"){
      coachingHtml = kbGapPageHtml(cohort, weekPick);
      if (state.kbGapRecord) cohortPageReport = kbGapReport(cohort, weekPick);
    } else if (state.cohortDetailView === "talking" || state.cohortDetailView === "markdowns"){
      var subTrainee = state.trainees.filter(function(x){ return x.id === state.cohortDetailTraineeId; })[0];
      var subEntry = subTrainee ? findWeekEntryForTrainee(subTrainee) : null;
      var subName = subTrainee ? subTrainee.name : "This trainee";
      var isTalking = state.cohortDetailView === "talking";
      coachingHtml =
        "<div class=\"card\">" +
          "<h2 style=\"margin:0 0 4px;\">" + (isTalking ? "Coaching talking points" : "Markdowns") + " — " + esc(subName) + "</h2>" +
          "<p class=\"hint\" style=\"margin:0 0 16px;\">Week " + esc(weekPick.week) + "</p>" +
          (!subEntry
            ? "<p class=\"hint\" style=\"margin:0;\">No data for " + esc(subName) + " in this week.</p>"
            : isTalking ? talkingPointsModalHtml(subEntry) : markdownsModalHtml(subEntry, weekPick, true)) +
        "</div>";
      if (subEntry && (isTalking ? subEntry.analysis : (subEntry.analysis || subEntry.rawRows.length))){
        cohortPageReport = isTalking ? talkingReport(cohort, weekPick, subName, subEntry) : markdownsReport(cohort, weekPick, subName, subEntry);
      }
    } else {
      var rowCount2 = Array.isArray(weekPick.rows) ? weekPick.rows.length : 0;
      var pulledLine = weekPick.pulled_at ? "Pulled " + esc(formatDate(weekPick.pulled_at.slice(0, 10))) + " &middot; " : "";
      coachingHtml =
        "<div class=\"card\">" +
          "<button class=\"ghost small\" id=\"backToWeeksBtn\" type=\"button\">← Back to weeks</button>" +
          "<h2 style=\"margin:14px 0 4px;\">Week " + esc(weekPick.week) + "</h2>" +
          "<p class=\"hint\">" + pulledLine + rowCount2 + " audit" + (rowCount2 === 1 ? "" : "s") + "</p>" +
          (weekPick.summary ? "<p style=\"margin:0 0 14px;\">" + esc(weekPick.summary) + "</p>" : "<p class=\"hint\">This week was saved before analysis was automatic. Request it again in QA Data Request and save it to generate themes and talking points.</p>") +
          "<div class=\"row\">" +
            "<button class=\"primary small\" id=\"openThemesBtn\" type=\"button\"" + (weekPick.team_themes && weekPick.team_themes.length ? "" : " disabled") + ">Common themes of mistakes</button>" +
            (isArtifactOwner ? "<button class=\"ghost small\" id=\"openKbGapBtn\" type=\"button\"" + (weekPick.team_themes && weekPick.team_themes.length ? "" : " disabled") + " title=\"Only visible to you\">Knowledge gap analysis</button>" : "") +
          "</div>" +
        "</div>";
    }

    var active = document.activeElement;
    var keepFocus = active && active.id && el.cohortsBody.contains(active)
      ? { id: active.id, start: active.selectionStart, end: active.selectionEnd } : null;
    el.cohortsBody.innerHTML = header + traineesCard + coachingHtml;
    if (keepFocus){
      var again = document.getElementById(keepFocus.id);
      if (again){
        again.focus();
        try { if (keepFocus.start != null) again.setSelectionRange(keepFocus.start, keepFocus.end); } catch (e){ /* not a text field */ }
      }
    }

    document.getElementById("editCohortBtn").addEventListener("click", function(){ openEditCohortModal(cohort); });
    var addCohortTraineeBtn = document.getElementById("addCohortTraineeBtn");
    if (addCohortTraineeBtn) addCohortTraineeBtn.addEventListener("click", function(){ openAddTraineeToCohortModal(cohort); });
    el.cohortsBody.querySelectorAll("[data-remove-cohort-trainee]").forEach(function(btn){
      btn.addEventListener("click", function(){ removeTraineeFromCohort(cohort, btn.getAttribute("data-remove-cohort-trainee")); });
    });
    el.cohortsBody.querySelectorAll("[data-open-week]").forEach(function(btn){
      btn.addEventListener("click", function(){
        state.cohortDetailWeekId = btn.getAttribute("data-open-week");
        state.cohortDetailView = null;
        renderCohortsPanel();
      });
    });
    var backToWeeksBtn = document.getElementById("backToWeeksBtn");
    if (backToWeeksBtn) backToWeeksBtn.addEventListener("click", function(){
      state.cohortDetailWeekId = null;
      state.cohortDetailView = null;
      renderCohortsPanel();
    });
    var openThemesBtn = document.getElementById("openThemesBtn");
    if (openThemesBtn) openThemesBtn.addEventListener("click", function(){
      state.cohortDetailView = "themes";
      renderCohortsPanel();
    });
    var openKbGapBtn = document.getElementById("openKbGapBtn");
    if (openKbGapBtn) openKbGapBtn.addEventListener("click", function(){ openKbGapPage(cohort, weekPick); });
    if (state.cohortDetailView === "kb_gap" && weekPick){ wireKbGapPage(cohort, weekPick); focusKbGapTarget(); }
    // From the cohort's main page these open inside the most recent week, so the page
    // (and its breadcrumb) always names the week the talking points come from.
    function openTraineeSubPage(view, traineeId){
      if (!weekPick || !entryByTraineeId[traineeId]) return;
      state.cohortDetailWeekId = weekPick.id;
      state.cohortDetailView = view;
      state.cohortDetailTraineeId = traineeId;
      renderCohortsPanel();
    }
    el.cohortsBody.querySelectorAll("[data-open-talking]").forEach(function(btn){
      btn.addEventListener("click", function(){ openTraineeSubPage("talking", btn.getAttribute("data-open-talking")); });
    });
    el.cohortsBody.querySelectorAll("[data-open-markdowns]").forEach(function(btn){
      btn.addEventListener("click", function(){ openTraineeSubPage("markdowns", btn.getAttribute("data-open-markdowns")); });
    });
  }

  // ---- Cohort sub-page reports (Copy / Export to Google Doc) ----
  function subPageReport(key, page, who, cohort, weekPick, build){
    var where = "Week " + weekPick.week + " — " + cohort.name;
    return {
      key: key + ":" + weekPick.id + (who ? ":" + who : ""),
      label: page + (who ? " · " + who : "") + " · " + where,
      title: page + (who ? " — " + who : "") + " — " + where,
      blocks: build
    };
  }

  function themesReport(cohort, weekPick){
    return subPageReport("themes", "Common themes of mistakes", null, cohort, weekPick, function(){
      var n = Array.isArray(weekPick.rows) ? weekPick.rows.length : 0;
      return [
        { type: "h1", text: "Common themes of mistakes — Week " + weekPick.week },
        { type: "note", text: cohort.name + " · " + n + " audit" + (n === 1 ? "" : "s") + " reviewed · " + generatedToday() }
      ].concat(themeBlocks(weekPick.team_themes));
    });
  }

  function kbGapReport(cohort, weekPick){
    return subPageReport("kb_gap", "Knowledge gap analysis", null, cohort, weekPick, function(){
      var r = state.kbGapRecord || {};
      var side = sideForDepartment(cohort.department) === "cp_side" ? "CP side" : "C side";
      var out = [
        { type: "h1", text: "Knowledge gap analysis — Week " + weekPick.week },
        { type: "note", text: cohort.name + " · compared against the " + side + " Knowledge Base" + (r.generated_at ? " · Generated " + formatDate(r.generated_at.slice(0, 10)) : "") }
      ];
      if (r.overall_note) out.push({ type: "p", text: r.overall_note });
      (r.assessments || []).forEach(function(a){
        out.push({ type: "h3", text: a.theme + " — " + (a.has_gap ? "Opportunity" : "Stated clearly") });
        if (a.verdict) out.push({ type: "p", text: a.verdict });
        if (a.cited_resource) out.push({ type: "p", label: "Resource", text: a.cited_resource });
        if (a.has_gap && a.suggested_addition) out.push({ type: "p", label: "Suggested addition", text: a.suggested_addition });
        if (a.comment && a.comment.trim()) out.push({ type: "p", label: "Coach comment", text: a.comment.trim() });
      });
      if (state.kbGapComment && state.kbGapComment.trim()) out.push({ type: "h2", text: "Overall comment" }, { type: "p", text: state.kbGapComment.trim() });
      if (r.resources_checked && r.resources_checked.length) out.push({ type: "note", text: "Resources checked: " + r.resources_checked.map(function(rc){ return rc.label; }).join(", ") });
      return out;
    });
  }

  function talkingReport(cohort, weekPick, name, entry){
    return subPageReport("talking", "Coaching talking points", name, cohort, weekPick, function(){
      var t = entry.analysis;
      var out = [
        { type: "h1", text: "Coaching talking points — " + name },
        { type: "note", text: "Week " + weekPick.week + " · " + cohort.name + (t.audit_count ? " · " + t.audit_count + " audit" + (t.audit_count === 1 ? "" : "s") + " reviewed" : "") }
      ];
      listBlocks(out, "Doing well", t.strengths);
      listBlocks(out, "Talking points", t.talking_points);
      if (t.suggested_focus) out.push({ type: "p", label: "Suggested focus", text: t.suggested_focus });
      return out;
    });
  }

  function markdownsReport(cohort, weekPick, name, entry){
    return subPageReport("markdowns", "Markdowns", name, cohort, weekPick, function(){
      var t = entry.analysis;
      var headers = weekPick.headers || [];
      var tally = tallyPassRate(headers, entry.rawRows);
      var out = [
        { type: "h1", text: "Markdowns — " + name },
        { type: "note", text: "Week " + weekPick.week + " · " + cohort.name }
      ];
      if (tally.total) out.push({ type: "p", label: "Score", text: pctText(tally) + " — " + passDetail(tally) + " (Pass = 100%, Fail = 0%)" });
      if (t) listBlocks(out, "Recurring issues", t.recurring_issues);
      if (entry.rawRows.length) out.push({ type: "h2", text: "Audits" });
      entry.rawRows.forEach(function(r, i){
        out.push({ type: "h3", text: "Audit " + (i + 1) });
        headers.forEach(function(h, j){
          if (/^\s*(week|trainee|crm)/i.test(h)) return; // already in the title
          var comment = /markdown|comment|note|feedback/i.test(h);
          var v = comment ? readableComment(r[j]) : String(r[j] == null ? "" : r[j]).trim();
          if (v) out.push({ type: "p", label: h, text: v });
        });
      });
      return out;
    });
  }

  function cohortSubViewLabel(){
    var v = state.cohortDetailView;
    if (v === "kb_gap") return "Knowledge gap analysis";
    if (v === "themes") return "Common themes of mistakes";
    var t = state.trainees.filter(function(x){ return x.id === state.cohortDetailTraineeId; })[0];
    var who = t ? t.name + " — " : "";
    return who + (v === "talking" ? "Coaching talking points" : "Markdowns");
  }

  function removeTraineeFromCohort(cohort, traineeId){
    var newIds = (cohort.trainee_ids || []).filter(function(id){ return id !== traineeId; });
    if (!dbFn){
      state.cohorts = state.cohorts.map(function(c){ return c.id === cohort.id ? Object.assign({}, c, { trainee_ids: newIds }) : c; });
      renderCohortsPanel();
      return;
    }
    dbFn.doc("cohorts/" + cohort.id).update({ trainee_ids: newIds }).catch(function(){ /* leave it listed; the viewer can retry */ });
  }

  // A trainee belongs to at most one cohort. Returns traineeId -> cohort for every other cohort.
  function cohortOwners(exceptCohortId){
    var owners = {};
    state.cohorts.forEach(function(c){
      if (c.id === exceptCohortId) return;
      (c.trainee_ids || []).forEach(function(id){ owners[id] = c; });
    });
    return owners;
  }
  function conflictMessage(ids, exceptCohortId){
    var owners = cohortOwners(exceptCohortId);
    var clash = ids.filter(function(id){ return owners[id]; });
    if (!clash.length) return null;
    return clash.map(function(id){
      var t = state.trainees.filter(function(x){ return x.id === id; })[0];
      return (t ? t.name : "A trainee") + " is already in " + owners[id].name;
    }).join("; ") + ". A trainee can only be in one cohort.";
  }

  function openAddTraineeToCohortModal(cohort){
    var owners = cohortOwners(null);
    var available = state.trainees.filter(function(t){ return !owners[t.id]; });

    openModal(
      "<h3 class=\"modal-title\">Add trainee to " + esc(cohort.name) + "</h3>" +
      selectFieldById("act-trainee", "Trainee", available, state.trainees.length ? "Every trainee in the Roster is already in a cohort" : "Add a trainee under Settings → Roster → Trainee first") +
      "<div class=\"modal-actions\">" +
        "<button class=\"ghost small\" id=\"cancelAddCohortTraineeBtn\" type=\"button\">Cancel</button>" +
        "<button class=\"primary small\" id=\"saveAddCohortTraineeBtn\" type=\"button\">Add</button>" +
      "</div>" +
      "<span class=\"save-status\" id=\"addCohortTraineeStatus\"></span>"
    );
    document.getElementById("saveAddCohortTraineeBtn").addEventListener("click", function(){ saveTraineeToCohort(cohort); });
    document.getElementById("cancelAddCohortTraineeBtn").addEventListener("click", closeModal);
  }

  function saveTraineeToCohort(cohort){
    var traineeId = (document.getElementById("act-trainee") || {}).value || "";
    var statusEl = document.getElementById("addCohortTraineeStatus");
    if (!traineeId){
      if (statusEl){ statusEl.textContent = "Choose a trainee."; statusEl.className = "save-status err"; }
      return;
    }
    var clash = conflictMessage([traineeId], cohort.id);
    if (clash){
      if (statusEl){ statusEl.textContent = clash; statusEl.className = "save-status err"; }
      return;
    }
    var newIds = (cohort.trainee_ids || []).filter(function(id){ return id !== traineeId; }).concat([traineeId]);
    if (!dbFn){
      state.cohorts = state.cohorts.map(function(c){ return c.id === cohort.id ? Object.assign({}, c, { trainee_ids: newIds }) : c; });
      closeModal();
      renderCohortsPanel();
      return;
    }
    if (statusEl){ statusEl.textContent = "Saving…"; statusEl.className = "save-status"; }
    dbFn.doc("cohorts/" + cohort.id).update({ trainee_ids: newIds })
      .then(function(){ closeModal(); })
      .catch(function(e){
        var msg = "Couldn't save — try again.";
        if (e && e.code === "invalid_argument") msg = "You don't have permission to change this cohort.";
        if (statusEl){ statusEl.textContent = msg; statusEl.className = "save-status err"; }
      });
  }

  function cohortModalFields(cohort){
    cohort = cohort || { name: "", department: "", team_lead: "", training_start_date: "", trainee_ids: [] };
    var selectedIds = cohort.trainee_ids || [];
    var owners = cohortOwners(cohort.id);
    var membersHtml = state.trainees.length
      ? "<div class=\"cohort-members\">" + state.trainees.map(function(t){
          var checked = selectedIds.indexOf(t.id) !== -1 ? " checked" : "";
          var taken = owners[t.id];
          return "<label class=\"cohort-member-row\"" + (taken ? " style=\"opacity:.55;\"" : "") + "><input type=\"checkbox\" value=\"" + esc(t.id) + "\" class=\"cohort-member-check\"" + checked + (taken ? " disabled" : "") + "> " + esc(t.name) + (taken ? " <span class=\"hint\" style=\"margin:0;\">— in " + esc(taken.name) + "</span>" : "") + "</label>";
        }).join("") + "</div>"
      : "<p class=\"hint\">No trainees added yet — add trainees under Settings → Roster → Trainee first, or create the cohort now and assign members later.</p>";

    return "<div class=\"field\"><label for=\"nc-name\">Name of cohort</label><input type=\"text\" id=\"nc-name\" placeholder=\"e.g. August Cohort A\" value=\"" + esc(cohort.name) + "\"></div>" +
      selectField("nc-dept", "Department", state.departments, "Add a Department under Settings → Roster first", cohort.department) +
      selectField("nc-lead", "Team lead", state.teamLeads, "Add a Team Lead under Settings → Roster first", cohort.team_lead) +
      "<div class=\"field\"><label for=\"nc-start-date\">Training start date</label><input type=\"date\" id=\"nc-start-date\" value=\"" + esc(cohort.training_start_date) + "\"></div>" +
      "<div class=\"field\"><label>Trainees</label>" + membersHtml + "</div>";
  }

  function openAddCohortModal(){
    openModal(
      "<h3 class=\"modal-title\">Add cohort</h3>" +
      cohortModalFields(null) +
      "<div class=\"modal-actions\">" +
        "<button class=\"ghost small\" id=\"cancelCohortBtn\" type=\"button\">Cancel</button>" +
        "<button class=\"primary small\" id=\"saveCohortBtn\" type=\"button\">Save cohort</button>" +
      "</div>" +
      "<span class=\"save-status\" id=\"cohortSaveStatus\"></span>"
    );
    document.getElementById("saveCohortBtn").addEventListener("click", function(){ saveCohort(); });
    document.getElementById("cancelCohortBtn").addEventListener("click", closeModal);
    document.getElementById("nc-name").focus();
  }

  function openEditCohortModal(cohort){
    openModal(
      "<h3 class=\"modal-title\">Edit cohort</h3>" +
      cohortModalFields(cohort) +
      "<div class=\"modal-actions\">" +
        "<button class=\"ghost small\" id=\"cancelCohortBtn\" type=\"button\">Cancel</button>" +
        "<button class=\"primary small\" id=\"saveCohortBtn\" type=\"button\">Save changes</button>" +
      "</div>" +
      "<span class=\"save-status\" id=\"cohortSaveStatus\"></span>"
    );
    document.getElementById("saveCohortBtn").addEventListener("click", function(){ saveCohort(cohort.id); });
    document.getElementById("cancelCohortBtn").addEventListener("click", closeModal);
    document.getElementById("nc-name").focus();
  }

  function saveCohort(editId){
    var name = ((document.getElementById("nc-name") || {}).value || "").trim();
    var department = ((document.getElementById("nc-dept") || {}).value || "").trim();
    var teamLead = ((document.getElementById("nc-lead") || {}).value || "").trim();
    var startDate = ((document.getElementById("nc-start-date") || {}).value || "").trim();
    var checks = el.modalCard.querySelectorAll(".cohort-member-check:checked");
    var traineeIds = Array.prototype.map.call(checks, function(c){ return c.value; });
    var statusEl = document.getElementById("cohortSaveStatus");
    if (!name){
      if (statusEl){ statusEl.textContent = "Name is required."; statusEl.className = "save-status err"; }
      return;
    }
    var clash = conflictMessage(traineeIds, editId || null);
    if (clash){
      if (statusEl){ statusEl.textContent = clash; statusEl.className = "save-status err"; }
      return;
    }
    var record = { name: name, department: department, team_lead: teamLead, training_start_date: startDate, trainee_ids: traineeIds };

    if (!dbFn || (editId && String(editId).indexOf("local-") === 0)){
      if (editId){
        state.cohorts = state.cohorts.map(function(c){ return c.id === editId ? Object.assign({}, c, record) : c; });
      } else {
        state.cohorts = state.cohorts.concat([Object.assign({ id: "local-" + Date.now() }, record)]);
      }
      closeModal();
      renderCohortsPanel();
      return;
    }

    if (statusEl){ statusEl.textContent = "Saving…"; statusEl.className = "save-status"; }
    if (editId){
      dbFn.doc("cohorts/" + editId).update(record)
        .then(function(){ closeModal(); })
        .catch(function(e){
          var msg = "Couldn't save — try again.";
          if (e && e.code === "invalid_argument") msg = "You don't have permission to edit cohorts.";
          if (statusEl){ statusEl.textContent = msg; statusEl.className = "save-status err"; }
        });
    } else {
      record.created_at = new Date().toISOString();
      dbFn.collection("cohorts").add(record)
        .then(function(){ closeModal(); })
        .catch(function(e){
          var msg = "Couldn't save — try again.";
          if (e && e.code === "invalid_argument") msg = "You don't have permission to add cohorts.";
          if (statusEl){ statusEl.textContent = msg; statusEl.className = "save-status err"; }
        });
    }
  }

  function deleteCohort(id){
    if (!dbFn || String(id).indexOf("local-") === 0){
      state.cohorts = state.cohorts.filter(function(c){ return c.id !== id; });
      renderCohortsPanel();
      return;
    }
    dbFn.doc("cohorts/" + id).delete().catch(function(){ /* leave it listed; the viewer can retry */ });
  }

  // ---- Export ----
  // A report is a list of blocks, rendered as Markdown for Copy and as HTML for the Google Doc.
  // Blocks: {type:"h1"|"h2"|"h3"|"note", text}, {type:"p", text, label?}, {type:"ul", items}.
  function listBlocks(out, label, items){
    if (items && items.length) out.push({ type: "p", label: label, text: "" }, { type: "ul", items: items });
  }
  function themeBlocks(themes){
    var out = [];
    (themes || []).forEach(function(t, i){
      out.push({ type: "h3", text: (i + 1) + ". " + t.theme + (t.frequency ? " (" + t.frequency + ")" : "") });
      if (t.description) out.push({ type: "p", text: t.description });
      if (t.coaching_recommendation) out.push({ type: "p", label: "Coaching move", text: t.coaching_recommendation });
      listBlocks(out, "Talking points", t.talking_points);
    });
    return out;
  }
  function generatedToday(){
    return "Generated " + new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  function analysisReportBlocks(){
    var a = state.analysis;
    if (!a) return [];
    var c = state.pullContext;
    var out = [
      { type: "h1", text: "Coaching — QA Audit Analysis" },
      { type: "note", text: (c && c.week ? "Week " + c.week + (c.targetLabel ? " — " + c.targetLabel : "") + " · " : "") + generatedToday() }
    ];
    if (a.summary) out.push({ type: "h2", text: "Summary" }, { type: "p", text: a.summary });
    out.push({ type: "h2", text: "Team coaching themes" });
    out = out.concat(themeBlocks(a.team_themes));
    out.push({ type: "h2", text: "Individual coaching" });
    a.trainees.forEach(function(t){
      var tally = traineeTally(t.name, state.headers, state.rows);
      out.push({ type: "h3", text: t.name + (t.audit_count ? " — " + t.audit_count + " audits" : "") });
      if (tally && tally.total) out.push({ type: "p", label: "Score", text: pctText(tally) + " (" + passDetail(tally) + ")" });
      listBlocks(out, "Doing well", t.strengths);
      listBlocks(out, "Recurring issues", t.recurring_issues);
      listBlocks(out, "Talking points", t.talking_points);
      if (t.suggested_focus) out.push({ type: "p", label: "Suggested focus", text: t.suggested_focus });
    });
    return out;
  }

  function blocksToMarkdown(blocks){
    var out = [];
    blocks.forEach(function(k){
      var text = String(k.text == null ? "" : k.text);
      if (k.type === "h1") out.push("# " + text, "");
      else if (k.type === "h2") out.push("## " + text, "");
      else if (k.type === "h3") out.push("### " + text, "");
      else if (k.type === "note") out.push("_" + text + "_", "");
      else if (k.type === "ul"){ k.items.forEach(function(x){ out.push("- " + x); }); out.push(""); }
      else if (k.type === "p") out.push((k.label ? "**" + k.label + ":**" + (text ? (text.indexOf("\n") !== -1 ? "\n" : " ") : "") : "") + text, "");
    });
    return out.join("\n").trim() + "\n";
  }

  function blocksToHtml(blocks){
    var lines = function(t){ return esc(t).replace(/\n/g, "<br>"); };
    var body = blocks.map(function(k){
      var text = String(k.text == null ? "" : k.text);
      switch (k.type){
        case "h1": case "h2": case "h3": return "<" + k.type + ">" + esc(text) + "</" + k.type + ">";
        case "note": return "<p><i>" + esc(text) + "</i></p>";
        case "ul": return "<ul>" + k.items.map(function(x){ return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
        case "p": return "<p>" + (k.label ? "<b>" + esc(k.label) + ":</b>" + (text ? (text.indexOf("\n") !== -1 ? "<br>" : " ") : "") : "") + lines(text) + "</p>";
      }
      return "";
    }).join("\n");
    return "<!DOCTYPE html><html><head><meta charset=\"utf-8\"></head><body>" + body + "</body></html>";
  }

  // Set by renderCohortDetail on the four cohort sub-pages; null everywhere else in Cohorts.
  var cohortPageReport = null;
  var lastReportKey = null;
  function currentReport(){
    if ((state.section === "team" || state.section === "individual") && state.analysis){
      var c = state.pullContext;
      var weekText = c && c.week ? "Week " + c.week + (c.targetLabel ? " — " + c.targetLabel : "") : "";
      return {
        key: "analysis",
        label: "Coaching report" + (weekText ? " · " + weekText : ""),
        title: weekText || new Date().toISOString().slice(0, 10),
        blocks: analysisReportBlocks
      };
    }
    if (state.section === "cohorts") return cohortPageReport;
    return null;
  }
  // Copy / Export sit at the bottom of the pages that show a report.
  function updateReportActions(){
    var r = currentReport();
    el.reportActions.hidden = !r;
    var key = r ? r.key : null;
    if (key !== lastReportKey){ lastReportKey = key; el.reportNote.textContent = ""; }
    if (!r) return;
    el.reportDocBtn.hidden = !mcpFn;
    el.reportLabel.textContent = r.label;
  }
  function reportNote(text, ok, linkUrl){
    el.reportNote.textContent = text;
    el.reportNote.className = "save-status" + (ok === true ? " ok" : ok === false ? " err" : "");
    if (linkUrl){
      var a = document.createElement("a");
      a.href = linkUrl; a.target = "_blank"; a.rel = "noopener";
      a.textContent = "Open it →";
      el.reportNote.appendChild(document.createTextNode(" "));
      el.reportNote.appendChild(a);
    }
  }

  function docErrorCopy(code){
    switch (code){
      case "needs_reauth": return "Your Google Drive connection needs to be reconnected in claude.ai Settings → Connectors.";
      case "server_not_connected": return "Connect Google Drive in claude.ai Settings → Connectors to export here.";
      case "selection_required": return "You have more than one Google Drive connected — choose one in claude.ai, then try again.";
      case "consent_required": return "Allow Google Drive for this page, then try again.";
      case "not_in_manifest": case "blocked_by_policy": return "This page isn't allowed to use Google Drive for your account.";
      case "approval_required": return "Your organization requires approval for this action.";
      case "cancelled": return null;
      case "tool_error": return "Google Drive couldn't create the doc. Try again.";
      case "not_granted": case "capability_disabled": case "capability_removed": return "Google Doc export isn't available in this view.";
      default: return "Something went wrong saving to Google Drive. Try again in a moment.";
    }
  }

  var docExporting = false;
  function exportToGoogleDoc(){
    var r = currentReport();
    if (!mcpFn || !r || docExporting) return;
    var title = "Coaching — " + r.title;
    docExporting = true;
    el.reportDocBtn.disabled = true;
    reportNote("Creating the Google Doc…");
    // text/html is converted to a Google Doc by Drive, keeping the formatting.
    mcpFn.callTool("Google Drive", "create_file", { title: title, textContent: blocksToHtml(r.blocks()), contentMimeType: "text/html" })
      .then(function(result){
        var payload = (result && result.payload) || {};
        var link = payload.webViewLink || payload.alternateLink;
        if (!link && payload.id) link = "https://docs.google.com/document/d/" + encodeURIComponent(payload.id) + "/edit";
        reportNote(link ? "Saved to Google Docs." : "Saved to Google Docs as “" + title + "”.", true, link);
      })
      .catch(function(e){
        var msg = docErrorCopy(e && e.code);
        if (msg) reportNote(msg, false); else reportNote("");
      })
      .then(function(){ docExporting = false; el.reportDocBtn.disabled = false; });
  }

  function csvRow(arr){
    return arr.map(function(v){
      v = String(v == null ? "" : v);
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    }).join(",");
  }

  // ---- Master render ----
  function renderAll(){
    renderHome();
    renderBreadcrumb();
    renderStats();
    renderDataRequest();
    renderDataPanel();
    renderOverview();
    renderTeamPanel();
    renderIndividual();
    renderAskPage();
    renderCohortsPanel();
    renderSettings();
    renderRosterPanel();
    renderQaSheetPanel();
    renderSpeedPanel();
    renderSpeedSettings();
    renderSpotPanel();
    updateReportActions();
    changeListeners.forEach(function(fn){ try { fn(); } catch (e){ /* one app's error shouldn't stop the rest */ } });
  }

  // ---- Wiring ----
  el.homeBody.addEventListener("click", function(e){
    var btn = e.target.closest("[data-open-app]");
    if (btn && !btn.disabled) openApp(btn.getAttribute("data-open-app"));
  });
  document.addEventListener("click", function(e){
    var btn = e.target.closest("[data-goto]");
    if (!btn) return;
    if (btn.hasAttribute("data-trainee")){
      state.selectedTrainee = btn.getAttribute("data-trainee");
      state.selectedWeek = btn.getAttribute("data-week") || null;
    }
    setSection(btn.getAttribute("data-goto"));
    renderIndividual();
  });

  // Frozen headers get a soft fade once content scrolls beneath them. Their height never
  // changes, so toggling this can't shift the page.
  function updateStuckHeaders(){
    var stuck = ccScroll.scrollTop > 2;
    el.pageHead.classList.toggle("stuck", stuck);
    el.homeTop.classList.toggle("stuck", stuck);
    el.homeHeader.classList.toggle("stuck", stuck);
  }
  ccScroll.addEventListener("scroll", updateStuckHeaders, { passive: true });

  el.askFab.setAttribute("aria-expanded", "false");
  el.askFab.setAttribute("aria-controls", "askPop");
  el.askFab.addEventListener("click", function(){ if (el.askPop.hidden) openAskPop(); else closeAskPop(); });
  el.askPopClose.addEventListener("click", closeAskPop);
  el.askAnotherBtn.addEventListener("click", function(){ openAskPop(); });
  document.addEventListener("mousedown", function(e){
    if (el.askPop.hidden) return;
    if (el.askPop.contains(e.target) || el.askFab.contains(e.target) || el.askAnotherBtn.contains(e.target)) return;
    closeAskPop();
  });
  el.askSubmitBtn.addEventListener("click", function(){ submitAsk(el.askInput.value); });
  el.askInput.addEventListener("keydown", function(e){
    if (e.key === "Enter" && !e.shiftKey){ e.preventDefault(); submitAsk(el.askInput.value); }
  });
  el.askChips.addEventListener("click", function(e){
    var b = e.target.closest("[data-ask-chip]");
    if (b) submitAsk(b.getAttribute("data-ask-chip"));
  });
  el.askAnswers.addEventListener("click", function(e){
    var b = e.target.closest("button");
    if (!b) return;
    var find = function(attr){ var id = Number(b.getAttribute(attr)); return state.askHistory.filter(function(x){ return x.id === id; })[0]; };
    var it;
    if ((it = find("data-ask-stop")) && it.ctl) it.ctl.abort();
    else if ((it = find("data-ask-copy"))) copyText(it.text, document.getElementById("askNote-" + it.id));
    else if ((it = find("data-ask-download")) && downloadsFn){
      downloadsFn.save({ filename: "coaching-compass-answer-" + new Date().toISOString().slice(0, 10) + ".md", data: "# " + it.q + "\n\n" + it.text }).catch(function(){});
    }
    else if ((it = find("data-ask-again"))) askQuestion(it.q);
  });

  el.dataTabs.addEventListener("click", function(e){
    var btn = e.target.closest("[data-data-tab]");
    if (btn) setDataTab(btn.getAttribute("data-data-tab"));
  });
  el.requestForms.addEventListener("input", function(e){
    var mode = e.target.getAttribute("data-req-week");
    if (mode) state.reqDraft[mode].week = e.target.value;
  });
  el.requestForms.addEventListener("change", function(e){
    var mode = e.target.getAttribute("data-req-target");
    if (mode) state.reqDraft[mode].target = e.target.value;
  });
  el.requestForms.addEventListener("click", function(e){
    var btn = e.target.closest("[data-req-submit]");
    if (btn && !btn.disabled) submitRequest(btn.getAttribute("data-req-submit"));
  });

  el.teamCohortPicker.addEventListener("click", function(e){
    var btn = e.target.closest("[data-team-cohort]");
    if (!btn) return;
    state.teamCohort = btn.getAttribute("data-team-cohort");
    state.teamWeek = null;
    renderTeamPanel();
    renderBreadcrumb();
  });
  el.teamWeekTabs.addEventListener("click", function(e){
    var btn = e.target.closest("[data-team-week]");
    if (!btn) return;
    state.teamWeek = btn.getAttribute("data-team-week");
    renderTeamPanel();
  });
  el.indCohortPicker.addEventListener("click", function(e){
    var btn = e.target.closest("[data-ind-cohort]");
    if (!btn) return;
    state.indCohort = btn.getAttribute("data-ind-cohort") || "";
    state.selectedWeek = null;
    renderIndividual();
  });
  el.traineePicker.addEventListener("click", function(e){
    var btn = e.target.closest("[data-trainee]");
    if (!btn) return;
    state.selectedTrainee = btn.getAttribute("data-trainee");
    state.selectedWeek = null;
    renderIndividual();
  });
  el.traineeWeekTabs.addEventListener("click", function(e){
    var btn = e.target.closest("[data-week]");
    if (!btn) return;
    state.selectedWeek = btn.getAttribute("data-week");
    renderIndividual();
  });

  el.reportDocBtn.addEventListener("click", exportToGoogleDoc);
  el.reportCopyBtn.addEventListener("click", function(){
    var r = currentReport();
    if (r) copyText(blocksToMarkdown(r.blocks()), el.reportNote);
  });

  el.resourceTabs.addEventListener("click", function(e){
    var btn = e.target.closest("[data-resource-tab]");
    if (!btn) return;
    state.resourceTab = btn.getAttribute("data-resource-tab");
    renderSettings();
  });

  // ---- Boot ----
  function start(){
    var hot = window.claude && window.claude.hot;
    var restored = hot && hot.data && hot.data.rows && hot.data.rows.length ? hot.data : null;
    if (restored){
      state.headers = restored.headers || [];
      state.rows = restored.rows || [];
      state.analysis = restored.analysis || null;
      state.selectedTrainee = restored.selectedTrainee || null;
      state.pullContext = restored.pullContext || null;
      renderAll();
      setSection(restored.section && SECTION_META[restored.section] ? restored.section : "home");
    } else {
      renderAll();
      setSection("home");
    }
    if (hot && hot.snapshot){
      hot.snapshot(function(){
        return { headers: state.headers, rows: state.rows, analysis: state.analysis, selectedTrainee: state.selectedTrainee, section: state.section, pullContext: state.pullContext };
      });
    }

    Promise.resolve().then(function(){ return window.claude ? window.claude.use("sample") : null; })
      .catch(function(){ return null; })
      .then(function(s){ sampleFn = s; renderAskPage(); });

    Promise.resolve().then(function(){ return window.claude ? window.claude.use("downloads") : null; })
      .catch(function(){ return null; })
      .then(function(d){ downloadsFn = d; updateReportActions(); });

    Promise.resolve().then(function(){ return window.TrainerUse ? window.TrainerUse("mcp") : (window.claude ? window.claude.use("mcp") : null); })
      .catch(function(){ return null; })
      .then(function(m){ mcpFn = m; updateReportActions(); markReady("mcp"); });

    Promise.resolve().then(function(){ return window.claude ? window.claude.use("user") : null; })
      .catch(function(){ return null; })
      .then(function(u){
        userFn = u;
        if (!u){ renderCohortsPanel(); return; }
        Promise.all([u.isOwner(), u.id()]).then(function(r){
          isArtifactOwner = !!r[0];
          viewerId = r[1];
          renderCohortsPanel();
          renderDataPanel();
          renderHome();
          renderAskPage();
          ensureLearningsSub();
        });
      });

    Promise.resolve().then(function(){ return window.TrainerUse ? window.TrainerUse("db") : (window.claude ? window.claude.use("db") : null); })
      .catch(function(){ return null; })
      .then(function(d){
        dbFn = d;
        if (!dbFn){ markReady("settings"); return; }
        ensureLearningsSub();
        loadLatestSavedAnalysis();
        dbFn.collection("analyses").orderBy("pulled_at", "desc").limit(300).onSnapshot(onChangedSnapshot(function(snap){
          state.allAnalyses = snap.docs.map(function(d){ return Object.assign({ id: d.id }, thawed(d.data())); });
          renderTeamPanel();
          renderIndividual();
          renderAskPage();
        }), function(){ state.allAnalyses = state.allAnalyses || []; renderIndividual(); });
        dbFn.doc("settings/qa_sheet").onSnapshot(onChangedSnapshot(function(snap){
          if (snap.exists){
            var data = thawed(snap.data()) || {};
            state.settings = {
              c_side: Object.assign({ url: "", tab_name: "Nesting audits - Feedback" }, data.c_side || {}),
              cp_side: Object.assign({ url: "", tab_name: "" }, data.cp_side || {})
            };
          }
          markReady("settings");
          renderAll();
        }), function(){ markReady("settings"); /* leave the last-known form values in place */ });

        dbFn.doc("settings/knowledge_base").onSnapshot(onChangedSnapshot(function(snap){
          if (snap.exists){
            var data = thawed(snap.data()) || {};
            var next = {};
            SHEET_SIDES.forEach(function(side){ next[side.key] = normalizeKbLinks(data[side.key]); state.kbSaved[side.key] = (Array.isArray(data[side.key]) ? data[side.key] : []).map(function(l){ return l && l.url; }).filter(Boolean); });
            state.kbLinks = next;
          }
          renderAll();
        }), function(){ /* leave the last-known form values in place */ });

        dbFn.doc("settings/kb_reads").onSnapshot(onChangedSnapshot(function(snap){
          if (!snap.exists) return;
          var data = thawed(snap.data()) || {};
          (Array.isArray(data.items) ? data.items : []).forEach(function(it){
            if (it && it.url) state.kbReads[kbKey(it.url)] = { fetched: !!it.fetched, truncated: !!it.truncated, at: it.at || "" };
          });
          updateKbMarks();
        }), function(){ /* markers just stay empty */ });

        dbFn.doc("settings/appearance").onSnapshot(onChangedSnapshot(function(snap){
          var data = snap.exists ? (thawed(snap.data()) || {}) : {};
          applyTheme(data.theme);
          renderAll();
        }), function(){ /* leave the last-known theme applied */ });

        dbFn.collection("trainees").orderBy("name", "asc").onSnapshot(onChangedSnapshot(function(snap){
          state.trainees = snap.docs.map(function(d){ return Object.assign({ id: d.id }, thawed(d.data())); });
          renderAll();
        }), function(){ /* leave the last-known roster in place */ });

        dbFn.collection("cohorts").orderBy("name", "asc").onSnapshot(onChangedSnapshot(function(snap){
          state.cohorts = snap.docs.map(function(d){ return Object.assign({ id: d.id }, thawed(d.data())); });
          renderAll();
        }), function(){ /* leave the last-known list in place */ });

        startSpeedDb();
        startSpotDb();

        SIMPLE_LISTS.forEach(function(cfg){
          dbFn.collection(cfg.collection).orderBy("name", "asc").onSnapshot(onChangedSnapshot(function(snap){
            state[cfg.stateKey] = snap.docs.map(function(d){ return Object.assign({ id: d.id }, thawed(d.data())); });
            renderAll();
          }), function(){ /* leave the last-known list in place */ });
        });
      });
  }

  // ---- Readiness: Google Drive access and the saved QA sheet link load after the page ----
  var readyParts = {};
  var readyWaiters = [];
  function markReady(part){
    readyParts[part] = true;
    readyWaiters = readyWaiters.filter(function(w){ if (w.parts.every(function(p){ return readyParts[p]; })){ w.resolve(); return false; } return true; });
  }
  function whenReady(parts, ms){
    if (parts.every(function(p){ return readyParts[p]; })) return Promise.resolve();
    return new Promise(function(resolve){
      readyWaiters.push({ parts: parts, resolve: resolve });
      setTimeout(resolve, ms); // give up waiting; callers report what's missing
    });
  }

  // ---- Live C side QA: read the whole audits tab from the QA sheet, all weeks ----
  function liveSideQa(crmNames, sideKey){
    sideKey = sideKey === "cp_side" ? "cp_side" : "c_side";
    var sideName = sideKey === "cp_side" ? "CP Side" : "C Side";
    return whenReady(["mcp", "settings"], 8000).then(function(){
      var fileId = extractDriveFileId((state.settings[sideKey] || {}).url);
      if (!fileId) return Promise.reject({ code: "no_sheet", message: "No " + sideName + " sheet is set up (Settings → QA Sheets)." });
      if (!mcpFn) return Promise.reject({ code: "no_drive", message: "Google Drive isn't available in this view." });
      return readFirstTabAudits(fileId).then(function(tables){
        if (tables) return { tables: tables, source: "full" };
        // Same fallback as QA Data Request: the readable text of the whole workbook (top rows of each tab).
        return mcpFn.callTool("Google Drive", "read_file_content", { fileId: fileId }).then(function(result){
          return { tables: findAuditTables(extractTextFromToolResult(result)), source: "partial" };
        });
      });
    }).then(function(got){
      if (!got.tables.length) return Promise.reject({ code: "no_tables", message: "Couldn't find the Week Number / CRM Name / Score columns in the QA sheet." });
      var want = {};
      (crmNames || []).forEach(function(n){ want[String(n).trim().toLowerCase()] = true; });
      var out = { pass: 0, total: 0, weeks: 0, trainees: 0, source: got.source, fetchedAt: new Date().toISOString() };
      var seen = {}, weeks = {}, people = {};
      got.tables.forEach(function(t){
        t.rows.forEach(function(r){
          var cell = function(i){ return i !== -1 ? String(r[i] == null ? "" : r[i]).trim() : ""; };
          var crm = cell(t.crmIdx).toLowerCase(), week = cell(t.weekIdx);
          if (!crm || !week || !want[crm]) return;
          var ticket = cell(t.ticketIdx);
          if (ticket){ var key = week + "|" + crm + "|" + ticket; if (seen[key]) return; seen[key] = true; }
          var v = passFailValue(cell(t.scoreIdx));
          if (v === null) return;
          out.total++; out.pass += v; weeks[week] = true; people[crm] = true;
        });
      });
      out.weeks = Object.keys(weeks).length;
      out.trainees = Object.keys(people).length;
      return out;
    }, function(e){
      return Promise.reject(e && e.message ? e : { code: (e && e.code) || "unknown", message: "Couldn't read the QA sheet (" + pullFetchErrorCopy(e && e.code) + ")." });
    });
  }


  // ---- Speed: daily productivity, summarised per week ----
  // Source: the first tab of the sheet in Settings → Speed Productivity Sheet ("Daily raw data"), one row per
  // trainee per day. Columns are found by header (CRM_NAME, WEEK_NUM, HUBSTAFF_DATE, TOTAL_BILLED_TICKET_HOURS, SPEED),
  // with columns A, E, D, F, K as the fallback. You type the week to pull; only roster trainees are kept, one
  // document per week in speed_weeks/{week}: rows { d: date, c: CRM name, h: hours, v: speed, m: 1 when hours were typed in }.
  var speedHost = null, speedSettingsHost = null;
  var speed = { url: "", tab_name: "", goal: null, weeks: {}, label: "Speed", busy: false, msg: "", err: false, cohort: "", week: "", pullWeek: "" };

  function speedNorm(c){ return String(c == null ? "" : c).trim().toLowerCase().replace(/[_\s]+/g, " "); }
  function speedHeader(cells){
    var n = cells.map(speedNorm);
    var find = function(fn){ return n.findIndex(fn); };
    var h = {
      crm: find(function(c){ return c === "crm name"; }),
      week: find(function(c){ return c === "week num" || c === "week number" || c === "week"; }),
      date: find(function(c){ return c === "hubstaff date" || c === "date"; }),
      hours: find(function(c){ return c === "total billed ticket hours"; }),
      tickets: find(function(c){ return c === "total tickets"; }),
      speed: find(function(c){ return c === "speed"; })
    };
    var hasNames = h.crm !== -1 && h.week !== -1 && h.speed !== -1;
    if (!hasNames){
      if (cells.length >= 11 && /crm/i.test(String(cells[0]))) h = { crm: 0, date: 3, week: 4, hours: 5, tickets: 9, speed: 10 };
      else return null;
    }
    return h;
  }
  var weekKey = function(w){ var d = String(w == null ? "" : w).replace(/\D/g, ""); return d || String(w == null ? "" : w).trim().toLowerCase(); };
  var speedNum = function(x){ var t = String(x == null ? "" : x).replace(/[,%\s]/g, ""); var v = t === "" ? NaN : parseFloat(t); return isNaN(v) ? null : v; };

  // Rows of the wanted week for roster CRM names only (an object of lowercase names).
  function speedRowsFromCells(table, wantWeek, wantCrms){
    for (var i = 0; i < Math.min(table.length, 12); i++){
      var h = speedHeader(table[i]);
      if (!h) continue;
      var want = weekKey(wantWeek), seen = {}, rows = [];
      for (var j = i + 1; j < table.length; j++){
        var r = table[j];
        if (weekKey(r[h.week]) !== want) continue;
        var crm = String(r[h.crm] == null ? "" : r[h.crm]).trim();
        if (!crm || !wantCrms[crm.toLowerCase()]) continue;
        var d = h.date !== -1 ? String(r[h.date] == null ? "" : r[h.date]).trim() : "";
        var k = d + "|" + crm.toLowerCase();
        var row = { d: d, c: crm, h: h.hours !== -1 ? speedNum(r[h.hours]) : null, t: h.tickets !== -1 ? speedNum(r[h.tickets]) : null, v: speedNum(r[h.speed]) };
        if (k in seen) rows[seen[k]] = row; else { seen[k] = rows.length; rows.push(row); }
      }
      return { rows: rows };
    }
    return null;
  }

  function speedWeekSort(a, b){
    var x = parseFloat(a), y = parseFloat(b);
    return !isNaN(x) && !isNaN(y) ? x - y : String(a).localeCompare(String(b), undefined, { numeric: true });
  }
  function speedFmt(v){ return v == null ? "—" : String(Math.round(v * 100) / 100); }
  function speedWeekList(){ return Object.keys(speed.weeks).sort(speedWeekSort); }
  function speedDocId(week){ return "w" + String(week).replace(/[^A-Za-z0-9]+/g, "_"); }
  // The sheet's SPEED is minutes per ticket: billed ticket hours × 60 ÷ tickets. It's recomputed here whenever hours or
  // tickets are edited; the sheet's own value is the fallback when one of them is missing. Lower is faster.
  function dayV(r){ return r.h > 0 && r.t > 0 ? r.h * 60 / r.t : (r.v != null ? r.v : null); }
  // Tickets needed to hit the goal in these hours.
  function needFor(hours){ return speed.goal > 0 && hours > 0 ? Math.ceil(hours * 60 / speed.goal) : null; }
  // Tickets still short of the goal (0 once the goal is met).
  function leftFor(need, tickets){ return need == null ? null : Math.max(0, need - (tickets || 0)); }
  // A week's numbers for a set of daily rows: speed = hours × 60 ÷ tickets over the days that have both.
  function speedTotals(rows){
    var both = rows.filter(function(r){ return r.h > 0 && r.t > 0; });
    var bh = both.reduce(function(a, r){ return a + r.h; }, 0), bt = both.reduce(function(a, r){ return a + r.t; }, 0);
    var hours = rows.reduce(function(a, r){ return a + (r.h || 0); }, 0), tickets = rows.reduce(function(a, r){ return a + (r.t || 0); }, 0);
    var value = bt > 0 ? bh * 60 / bt : (function(){ var vs = rows.map(dayV).filter(function(v){ return v != null && v > 0; }); return vs.length ? vs.reduce(function(a, b){ return a + b; }, 0) / vs.length : null; })();
    return { value: value, hours: hours, tickets: tickets, need: needFor(hours), left: leftFor(needFor(hours), tickets) };
  }

  // One trainee's Speed weeks, newest first: { week, value, hours, tickets, need, days:[{date, speed, hours, tickets, need, manual}] }.
  function traineeSpeed(traineeId){
    var t = state.trainees.filter(function(x){ return x.id === traineeId; })[0];
    var out = { name: t ? t.name : "", crm: t ? (t.crm_name || "") : "", label: "Speed", goal: speed.goal, weeks: [], configured: !!speed.url, pulled: speedWeekList().length > 0 };
    if (!t) return out;
    var keys = [(t.crm_name || "").trim().toLowerCase(), (t.name || "").trim().toLowerCase()].filter(Boolean);
    speedWeekList().forEach(function(w){
      var mine = (speed.weeks[w].rows || []).filter(function(r){ return keys.indexOf(String(r.c).toLowerCase()) !== -1; });
      if (!mine.length) return;
      mine.sort(function(a, b){ return String(a.d).localeCompare(String(b.d)); });
      var tot = speedTotals(mine);
      out.weeks.push({ week: w, value: tot.value, hours: tot.hours, tickets: tot.tickets, need: tot.need, left: tot.left,
        days: mine.map(function(r){ var nd = needFor(r.h); return { date: r.d, speed: dayV(r), hours: r.h, tickets: r.t, need: nd, left: leftFor(nd, r.t), manual: !!(r.mh || r.mt) }; }) });
    });
    out.weeks.sort(function(a, b){ return speedWeekSort(b.week, a.week); });
    return out;
  }

  function saveSpeedWeek(week){
    var doc = speed.weeks[week];
    if (!doc || !dbFn) return Promise.resolve();
    return dbFn.doc("speed_weeks/" + speedDocId(week)).set({ week: week, rows: doc.rows, pulled_at: doc.pulled_at || "", updated_at: new Date().toISOString() });
  }

  // Pull one week from the sheet. Hours and tickets typed in by hand are kept.
  function pullSpeed(week){
    week = String(week == null ? "" : week).trim();
    if (!week) return Promise.reject({ message: "Type the week number to pull." });
    var fileId = extractDriveFileId(speed.url);
    if (!fileId) return Promise.reject({ message: "Add the Google Sheet link in Settings → Speed Productivity Sheet first." });
    if (!mcpFn) return Promise.reject({ message: "Google Drive isn't available in this view." });
    var crms = {}, inCohort = {};
    state.cohorts.forEach(function(c){ (c.trainee_ids || []).forEach(function(id){ inCohort[id] = true; }); });
    state.trainees.filter(function(t){ return inCohort[t.id]; }).forEach(function(t){ [t.crm_name, t.name].forEach(function(n){ if (n && String(n).trim()) crms[String(n).trim().toLowerCase()] = true; }); });
    return mcpFn.callTool("Google Drive", "download_file_content", { fileId: fileId, exportMimeType: "text/csv" })
      .then(function(result){
        var text = downloadedText(result);
        return text ? speedRowsFromCells(parseCSV(text.replace(/^﻿/, "")), week, crms) : null;
      }, function(e){ return Promise.reject({ message: "Google Drive couldn't open that sheet (" + ((e && e.code) || "error") + ")." }); })
      .then(function(got){
        if (!got) return Promise.reject({ message: "Couldn't find the CRM_NAME, WEEK_NUM and SPEED columns in the first tab of that sheet." });
        if (!got.rows.length) return Promise.reject({ message: "No rows for week " + week + " matched a trainee in one of your cohorts." });
        var old = speed.weeks[week] ? speed.weeks[week].rows : [];
        old.filter(function(r){ return r.mh || r.mt; }).forEach(function(m){
          var hit = got.rows.filter(function(r){ return r.d === m.d && r.c.toLowerCase() === String(m.c).toLowerCase(); })[0];
          if (hit){ if (m.mh){ hit.h = m.h; hit.mh = 1; } if (m.mt){ hit.t = m.t; hit.mt = 1; } } else got.rows.push(m);
        });
        speed.weeks[week] = { week: week, rows: got.rows, pulled_at: new Date().toISOString() };
        speed.week = week;
        return saveSpeedWeek(week).catch(function(){}).then(function(){ renderAll(); return got; });
      });
  }

  // Type the hours or cleared tickets for a trainee's day; Speed recalculates.
  function setSpeedField(week, crm, date, field, text){
    var doc = speed.weeks[week];
    if (!doc) return;
    var val = speedNum(text);
    var row = doc.rows.filter(function(r){ return r.d === date && String(r.c).toLowerCase() === crm.toLowerCase(); })[0];
    if (!row){
      if (val == null) return;
      row = { d: date, c: crm, h: null, t: null, v: null };
      doc.rows.push(row);
    }
    if (row[field] === val) return;
    row[field] = val; row[field === "h" ? "mh" : "mt"] = 1;
    saveSpeedWeek(week).catch(function(){ speed.msg = "Couldn't save that change. Try again."; speed.err = true; }).then(function(){ renderAll(); });
  }

  function saveSpeedConfig(extra){
    var doc = { url: speed.url, tab_name: speed.tab_name, goal: speed.goal == null ? null : speed.goal, updated_at: new Date().toISOString() };
    return dbFn ? dbFn.doc("settings/speed_sheet").set(doc) : Promise.resolve();
  }
  function setSpeedGoal(text){
    var g = speedNum(text);
    speed.goal = g != null && g > 0 ? g : null;
    saveSpeedConfig().catch(function(){ speed.msg = "Couldn't save the goal. Try again."; speed.err = true; }).then(function(){ renderAll(); });
  }

  function runSpeedPull(){
    if (speed.busy) return;
    var week = (speed.pullWeek || "").trim();
    speed.busy = true; speed.msg = "Pulling week " + week + "… (the sheet is large, this can take a moment)"; speed.err = false;
    renderSpeedPanel(true);
    pullSpeed(week).then(function(got){
      speed.msg = "Pulled week " + week + ": " + got.rows.length + " daily row" + (got.rows.length === 1 ? "" : "s") + " for your roster.";
    }, function(e){
      speed.msg = e.message || "Couldn't pull.";
      speed.err = true;
    }).then(function(){
      speed.busy = false;
      renderSpeedPanel(true);
    });
  }

  function startSpeedDb(){
    dbFn.doc("settings/speed_sheet").onSnapshot(onChangedSnapshot(function(snap){
      var d = snap.exists ? (thawed(snap.data()) || {}) : {};
      speed.url = d.url || ""; speed.tab_name = d.tab_name || ""; speed.goal = d.goal > 0 ? d.goal : null;
      renderAll();
    }), function(){});
    dbFn.collection("speed_weeks").onSnapshot(onChangedSnapshot(function(snap){
      var next = {};
      snap.docs.forEach(function(d){
        var v = thawed(d.data()) || {};
        if (v.week != null) next[String(v.week)] = { week: String(v.week), rows: Array.isArray(v.rows) ? v.rows : [], pulled_at: v.pulled_at || "" };
      });
      speed.weeks = next;
      renderAll();
    }), function(){});
  }

  function speedStatusLine(){
    return speed.msg ? "<span class=\"save-status " + (speed.err ? "err" : "ok") + "\">" + esc(speed.msg) + "</span>" : "";
  }
  function speedDayLabel(d){
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
    if (!m) return d || "—";
    return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }

  function renderSpeedPanel(force){
    var host = document.getElementById("speedBody");
    if (!host) return;
    if (!force && host.contains(document.activeElement) && /INPUT|SELECT/.test(document.activeElement.tagName)) return;
    var saved = speedWeekList().reverse();
    if (!speed.week || !speed.weeks[speed.week]) speed.week = saved[0] || "";
    var cohortOpts = "<option value=\"\">All cohort trainees</option>" + state.cohorts.map(function(c){ return "<option value=\"" + esc(c.id) + "\"" + (c.id === speed.cohort ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join("");
    var weekOpts = saved.map(function(w){ return "<option value=\"" + esc(w) + "\"" + (w === speed.week ? " selected" : "") + ">Week " + esc(w) + "</option>"; }).join("");
    var head = "<div class=\"speed-bar\">" +
      "<div class=\"field\"><label for=\"speedCohort\">Cohort</label><select id=\"speedCohort\">" + cohortOpts + "</select></div>" +
      (saved.length ? "<div class=\"field\"><label for=\"speedWeekSel\">Saved week</label><select id=\"speedWeekSel\">" + weekOpts + "</select></div>" : "") +
      "<div class=\"field\"><label for=\"speedGoal\" title=\"Minutes per ticket the team should reach. Lower is faster.\">Team speed goal (min/ticket)</label><input id=\"speedGoal\" type=\"text\" inputmode=\"decimal\" placeholder=\"e.g. 12\" value=\"" + (speed.goal == null ? "" : esc(speedFmt(speed.goal))) + "\" style=\"width:90px\" /></div>" +
      "<div class=\"field\"><label for=\"speedWeekIn\">Pull week</label><input id=\"speedWeekIn\" type=\"text\" inputmode=\"numeric\" placeholder=\"e.g. 561\" value=\"" + esc(speed.pullWeek) + "\" style=\"width:100px\" /></div>" +
      "<button class=\"primary small\" id=\"speedPullBtn\" type=\"button\"" + (speed.busy || !speed.url ? " disabled" : "") + ">" + (speed.busy ? "Pulling…" : "Pull") + "</button>" + speedStatusLine() + "</div>";
    var body;
    var doc = speed.weeks[speed.week];
    var cohort = state.cohorts.filter(function(c){ return c.id === speed.cohort; })[0];
    var inAny = {};
    state.cohorts.forEach(function(c){ (c.trainee_ids || []).forEach(function(id){ inAny[id] = true; }); });
    var list = cohort ? (cohort.trainee_ids || []).map(function(id){ return state.trainees.filter(function(t){ return t.id === id; })[0]; }).filter(Boolean) : state.trainees.filter(function(t){ return inAny[t.id]; });
    if (!speed.url) body = "<p class=\"hint\">No Speed sheet yet. Add its Google Sheet link in Settings → Speed Productivity Sheet.</p>";
    else if (!doc) body = "<p class=\"hint\">Nothing pulled yet. Type a week number and press Pull; it reads the sheet's first tab (“" + esc(speed.tab_name || "Daily raw data") + "”) for the trainees in your cohorts.</p>";
    else if (!list.length) body = "<p class=\"hint\">No cohort trainees here yet.</p>";
    else {
      var dates = {};
      doc.rows.forEach(function(r){ dates[r.d] = true; });
      var days = Object.keys(dates).sort();
      var stale = doc.rows.some(function(r){ return r.t === undefined; });
      var cell = function(r, d, crm, name){
        var sp = r ? dayV(r) : null, need = r ? needFor(r.h) : null;
        var left = leftFor(need, r ? r.t : null);
        var inp = function(field, label, val, manual){
          return "<input class=\"sp-in" + (manual ? " manual" : "") + "\" type=\"text\" inputmode=\"decimal\" aria-label=\"" + label + " on " + esc(speedDayLabel(d)) + " for " + esc(name) + "\" placeholder=\"" + (field === "h" ? "hrs" : "tkts") + "\" value=\"" + (val != null ? esc(speedFmt(val)) : "") + "\" data-sp-week=\"" + esc(speed.week) + "\" data-sp-crm=\"" + esc(crm) + "\" data-sp-date=\"" + esc(d) + "\" data-sp-field=\"" + field + "\" />";
        };
        return "<td><span class=\"sp-v\">" + speedFmt(sp) + "</span>" + inp("t", "Cleared tickets", r ? r.t : null, r && r.mt) + inp("h", "Hours", r ? r.h : null, r && r.mh) +
          (need != null ? "<span class=\"sp-need " + (left === 0 ? "ok" : "short") + "\" title=\"" + need + " tickets in these hours hit the goal\">" + (left === 0 ? "goal met" : "need " + left + " more") + "</span>" : "") + "</td>";
      };
      body = (stale ? "<p class=\"save-status err\">This week was pulled before cleared tickets were added, so its ticket counts are empty. Type " + esc(speed.week) + " in Pull week and press Pull to load them from column J (your typed hours are kept).</p>" : "") + "<div class=\"speed-wrap\"><table class=\"preview speed-table\"><thead><tr><th class=\"sk sk1\">Trainee</th><th class=\"sk sk2\">Avg speed</th><th class=\"sk sk3\">Hours</th><th>Cleared</th>" + (speed.goal ? "<th title=\"Tickets still short of the goal for the week\">Needed</th>" : "") + days.map(function(d){ return "<th>" + esc(speedDayLabel(d)) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        list.map(function(t){
          var keys = [(t.crm_name || "").trim().toLowerCase(), (t.name || "").trim().toLowerCase()].filter(Boolean);
          var mine = doc.rows.filter(function(r){ return keys.indexOf(String(r.c).toLowerCase()) !== -1; });
          var crm = mine[0] ? mine[0].c : (t.crm_name || t.name || "");
          var tot = speedTotals(mine);
          var short = tot.left > 0;
          return "<tr" + (t.cohort_status === "inactive" ? " class=\"is-inactive\"" : "") + "><td class=\"sk sk1\">" + esc(t.name) + "</td><td class=\"sk sk2\"><b>" + speedFmt(tot.value) + "</b></td><td class=\"sk sk3\">" + (mine.length ? speedFmt(tot.hours) : "—") + "</td><td>" + (mine.length ? speedFmt(tot.tickets) : "—") + "</td>" +
            (speed.goal ? "<td" + (short ? " class=\"sp-short\"" : "") + ">" + (tot.left != null ? tot.left : "—") + "</td>" : "") +
            days.map(function(d){ return cell(mine.filter(function(x){ return x.d === d; })[0], d, crm, t.name); }).join("") + "</tr>";
        }).join("") + "</tbody></table></div><p class=\"hint\">Speed is minutes per ticket (hours × 60 ÷ cleared tickets), so lower is faster; it recalculates when you change hours or tickets. " + (speed.goal ? "“need N more” is how many more tickets the trainee needed in those hours to hit the " + esc(speedFmt(speed.goal)) + " min goal (0 once met). " : "Set a team speed goal to see the tickets each trainee needs. ") + "Edited boxes are outlined and kept when you pull again.</p>";
    }
    host.innerHTML = head + body;
  }

  function renderSpeedSettings(force){
    var host = speedSettingsHost;
    if (!host || !host.isConnected) return;
    if (!force && host.contains(document.activeElement) && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    host.innerHTML =
      "<div class=\"card\"><h3 class=\"card-title\">Speed Productivity Sheet</h3>" +
      "<p class=\"hint\">Where daily Speed is read from (the “Daily raw data” tab). It reads these columns by header name, falling back to the column letter: <b>CRM_NAME</b> (A) to match the trainee, <b>HUBSTAFF_DATE</b> (D) for the day, <b>WEEK_NUM</b> (E) for the week you type in Coaching → Speed, <b>TOTAL_BILLED_TICKET_HOURS</b> (F) for hours handled, and <b>SPEED</b> (K) for the speed.</p>" +
      "<div class=\"field\"><label for=\"speedUrl\">Google Sheet URL</label><input id=\"speedUrl\" type=\"url\" placeholder=\"https://docs.google.com/spreadsheets/d/…\" value=\"" + esc(speed.url) + "\" /></div>" +
      "<div class=\"field\"><label for=\"speedTab\">Sheet tab name</label><input id=\"speedTab\" type=\"text\" placeholder=\"Daily raw data\" value=\"" + esc(speed.tab_name) + "\" /></div>" +
      "<p class=\"hint\">Google Drive can only export the sheet's first tab, so the data must be on the first tab. The tab name is saved as a label.</p>" +
      "<div class=\"card-actions\"><button class=\"primary small\" id=\"speedSaveBtn\" type=\"button\">Save</button> " + speedStatusLine() + "</div></div>";
  }

  function saveSpeedSettings(){
    var url = (document.getElementById("speedUrl").value || "").trim();
    var tab = (document.getElementById("speedTab").value || "").trim();
    speed.url = url; speed.tab_name = tab;
    speed.msg = "Saving…"; speed.err = false;
    var done = function(msg, err){ speed.msg = msg; speed.err = !!err; renderSpeedSettings(true); renderSpeedPanel(true); };
    if (!dbFn){ done("Saved to this browser tab only — settings storage isn't available in this view.", true); return; }
    dbFn.doc("settings/speed_sheet").set({ url: url, tab_name: tab, goal: speed.goal == null ? null : speed.goal, updated_at: new Date().toISOString() })
      .then(function(){ done("Saved."); }, function(e){ done(e && e.code === "invalid_argument" ? "You don't have permission to change these settings." : "Couldn't save — try again.", true); });
  }

  document.addEventListener("click", function(e){
    var t = e.target.closest && e.target.closest("#speedPullBtn, #speedSaveBtn");
    if (!t) return;
    if (t.id === "speedSaveBtn") saveSpeedSettings(); else runSpeedPull();
  });
  document.addEventListener("keydown", function(e){
    if (e.key === "Enter" && e.target && e.target.id === "speedWeekIn") runSpeedPull();
    else if (e.key === "Enter" && e.target && e.target.classList && (e.target.classList.contains("sp-in") || e.target.id === "speedGoal")) e.target.blur();
  });
  document.addEventListener("input", function(e){
    if (e.target && e.target.id === "speedWeekIn") speed.pullWeek = e.target.value;
  });
  document.addEventListener("change", function(e){
    var t = e.target;
    if (!t) return;
    if (t.id === "speedCohort"){ speed.cohort = t.value; renderSpeedPanel(true); }
    else if (t.id === "speedWeekSel"){ speed.week = t.value; renderSpeedPanel(true); }
    else if (t.id === "speedGoal") setSpeedGoal(t.value);
    else if (t.classList && t.classList.contains("sp-in")) setSpeedField(t.getAttribute("data-sp-week"), t.getAttribute("data-sp-crm"), t.getAttribute("data-sp-date"), t.getAttribute("data-sp-field"), t.value);
  });

  // ---- Spot Check: a spot check of one ticket per record (link, comms feedback, resolution feedback, score) ----
  // Stored in spot_checks/{id}; the trainee is sent a copy on Slack asking for an acknowledgement and an action plan,
  // and their reply is read back from the DM (reply, reply_at). Editing a check can optionally send an updated copy.
  var BLANK_SPOT = { ticket: "", comms: "", resolution: "", score: "" };
  var spot = { open: {}, analyses: {}, analyzing: {}, checks: [], cohort: "", view: "trainee", form: false, editId: "", resend: false, trainee: "", busy: false, msg: "", err: false, draft: Object.assign({}, BLANK_SPOT) };
  function spotScore(v){
    var n = parseFloat(String(v == null ? "" : v).replace("%", "").trim());
    return isNaN(n) ? null : n;
  }
  function spotAvg(list){
    var v = list.map(function(c){ return spotScore(c.score); }).filter(function(x){ return x != null; });
    return v.length ? v.reduce(function(a, b){ return a + b; }, 0) / v.length : null;
  }
  function spotFor(traineeId){
    return spot.checks.filter(function(c){ return c.trainee_id === traineeId; }).sort(function(a, b){ return String(b.created_at).localeCompare(String(a.created_at)); });
  }
  function traineeSpot(traineeId){
    var t = state.trainees.filter(function(x){ return x.id === traineeId; })[0];
    var checks = spotFor(traineeId);
    return { name: t ? t.name : "", checks: checks, count: checks.length, avg: spotAvg(checks), analysis: spot.analyses[traineeId] || null };
  }
  function startSpotDb(){
    dbFn.collection("spot_checks").onSnapshot(onChangedSnapshot(function(snap){
      spot.checks = snap.docs.map(function(d){ return Object.assign({ id: d.id }, thawed(d.data())); });
      renderAll();
    }), function(){});
    dbFn.collection("spot_analyses").onSnapshot(onChangedSnapshot(function(snap){
      var next = {};
      snap.docs.forEach(function(d){ next[d.id] = thawed(d.data()); });
      spot.analyses = next;
      renderAll();
    }), function(){});
  }
  // Claude reads one trainee's spot checks and names the common themes and repeated mistakes; saved in spot_analyses/{trainee}.
  function analyzeSpot(traineeId){
    var t = state.trainees.filter(function(x){ return x.id === traineeId; })[0];
    var checks = spotFor(traineeId).slice().reverse();
    if (!t || !checks.length) return;
    if (!sampleFn) return setSpotMsg("Analysis isn't available in this view.", true);
    var blocks = checks.map(function(c, i){
      return "Spot check " + (i + 1) + " (" + (c.created_at || "").slice(0, 10) + ", score " + spotFmt(spotScore(c.score)) + "%)\nTicket: " + c.ticket + "\nComms feedback: " + c.comms + "\nResolution feedback: " + c.resolution + (c.reply ? "\nTrainee's reply: " + c.reply : "");
    }).join("\n\n");
    var prompt = "You are helping a trainer coach a new-hire support trainee named " + t.name + ". Below are the spot checks of their tickets (oldest first), each with the trainer's feedback on communication and resolution, a score out of 100, and sometimes the trainee's own reply.\n\n" + blocks +
      "\n\nIdentify what keeps showing up. Only use what the feedback says; never invent mistakes, and say \"once\" when something happened only once. Return JSON only: {\"summary\": \"2-3 sentences\", \"themes\": [{\"title\": \"short\", \"area\": \"Comms|Resolution|Both\", \"detail\": \"what the pattern is\", \"spot_checks\": [spot check numbers it appears in]}], \"repeated_mistakes\": [{\"mistake\": \"specific, one sentence\", \"times\": number, \"spot_checks\": [numbers]}], \"trend\": \"is the score improving, flat or slipping, and why\", \"coaching_focus\": [\"up to 3 concrete things to work on next\"]}. Mistakes must appear in at least two spot checks; put one-off issues in themes instead. Use empty arrays when there is nothing.";
    spot.analyzing[traineeId] = true; spot.msg = ""; renderSpotPanel(true);
    sampleFn.json(prompt, { modelTier: "complex", cache: false }).then(function(data){
      var arr = function(v){ return Array.isArray(v) ? v : []; };
      var doc = { count: checks.length, at: new Date().toISOString(), summary: String((data && data.summary) || ""), trend: String((data && data.trend) || ""),
        themes: arr(data && data.themes).map(function(x){ return { title: String(x.title || ""), area: String(x.area || ""), detail: String(x.detail || ""), spot_checks: arr(x.spot_checks) }; }),
        repeated_mistakes: arr(data && data.repeated_mistakes).map(function(x){ return { mistake: String(x.mistake || ""), times: +x.times || arr(x.spot_checks).length, spot_checks: arr(x.spot_checks) }; }),
        coaching_focus: arr(data && data.coaching_focus).map(String) };
      spot.analyses[traineeId] = doc;
      return dbFn.doc("spot_analyses/" + traineeId).set(doc).catch(function(){});
    }).then(function(){ delete spot.analyzing[traineeId]; renderSpotPanel(true); }, function(e){
      delete spot.analyzing[traineeId];
      setSpotMsg((e && e.code === "cancelled") ? "Analysis stopped." : (errorCopy(e && e.code) || "Something went wrong reaching Claude."), true);
    });
  }
  function spotAnalysisHtml(traineeId, n){
    var a = spot.analyses[traineeId], busy = spot.analyzing[traineeId];
    var btn = "<button class=\"primary small\" type=\"button\" data-spot-analyze=\"" + esc(traineeId) + "\"" + (busy || !sampleFn ? " disabled" : "") + ">" + (busy ? "Analyzing…" : a ? "Analyze again" : "Analyze with Claude") + "</button>";
    if (!a) return "<div class=\"spot-analysis\">" + btn + " <span class=\"hint\" style=\"margin:0;\">Finds the common themes and repeated mistakes across " + n + " spot check" + (n === 1 ? "" : "s") + ".</span></div>";
    var spots = function(x){ return x && x.length ? " <small class=\"muted\">(spot check" + (x.length === 1 ? " " : "s ") + x.join(", ") + ")</small>" : ""; };
    return "<div class=\"spot-analysis\"><div>" + btn + " <small class=\"muted\">Analyzed " + esc(spotDate(a.at)) + " from " + a.count + " spot check" + (a.count === 1 ? "" : "s") + (a.count !== n ? " · " + n + " now, analyze again to update" : "") + "</small></div>" +
      (a.summary ? "<p>" + esc(a.summary) + "</p>" : "") +
      "<h4>Repeated mistakes</h4>" + (a.repeated_mistakes.length ? "<ul>" + a.repeated_mistakes.map(function(m){ return "<li><b>" + esc(m.mistake) + "</b> · " + m.times + "×" + spots(m.spot_checks) + "</li>"; }).join("") + "</ul>" : "<p class=\"hint\" style=\"margin:4px 0;\">None repeated across spot checks.</p>") +
      "<h4>Common themes</h4>" + (a.themes.length ? "<ul>" + a.themes.map(function(m){ return "<li><b>" + esc(m.title) + "</b>" + (m.area ? " <small class=\"muted\">" + esc(m.area) + "</small>" : "") + ": " + esc(m.detail) + spots(m.spot_checks) + "</li>"; }).join("") + "</ul>" : "<p class=\"hint\" style=\"margin:4px 0;\">No themes yet.</p>") +
      (a.trend ? "<h4>Trend</h4><p>" + esc(a.trend) + "</p>" : "") +
      (a.coaching_focus.length ? "<h4>Coaching focus</h4><ul>" + a.coaching_focus.map(function(m){ return "<li>" + esc(m) + "</li>"; }).join("") + "</ul>" : "") + "</div>";
  }
  function spotFmt(v){ return v == null ? "—" : String(Math.round(v * 10) / 10); }
  function spotMessage(t, c, cohortName, updated){
    var first = String(t.name || "").split(/\s+/)[0] || "there";
    return "Hi " + first + ", " + (updated ? "I updated my spot check on one of your tickets" : "I did a spot check on one of your tickets") + (cohortName ? " (" + cohortName + ")" : "") + ".\n\n" +
      "*Ticket:* " + c.ticket + "\n" +
      "*Feedback on Comms:* " + c.comms + "\n" +
      "*Feedback on Resolution:* " + c.resolution + "\n" +
      "*Score:* " + spotFmt(spotScore(c.score)) + "%\n\n" +
      "Please reply to this message with:\n1. Your *acknowledgement* of this feedback\n2. Your *action plan*: what you'll do differently from now on\n\nThank you!";
  }
  function cohortOfTrainee(id){
    return state.cohorts.filter(function(c){ return (c.trainee_ids || []).indexOf(id) !== -1; })[0] || null;
  }
  // The Slack tools return one formatted text block: channel history has "=== Message from Name (U123) at … ===" and
  // "Message TS: …"; threads have "--- Reply 1 of 3 ---", "From: Name (U123)" and "Message TS: …".
  function slackBody(block){
    var lines = block.split("\n");
    var i = lines.findIndex(function(l){ return /^Message TS:/.test(l); });
    return lines.slice(i + 1).filter(function(l){ return !/^(Reactions|Thread|Files?|Attachments?|Forwarded message from)\b/.test(l.trim()); }).join("\n").trim();
  }
  function parseSlackChannel(raw){
    var text = String(raw || "");
    var m = text.match(/^Channel:.*\(([A-Z0-9]+)\)\s*$/m);
    return { channel: m ? m[1] : null, messages: text.split(/(?=^=== Message from )/m).filter(function(b){ return b.indexOf("=== Message from ") === 0; }).map(function(b){
      var u = b.match(/^=== Message from .*?\(([A-Z0-9]+)\)\s+at /m), ts = b.match(/^Message TS:\s*(\S+)/m);
      return { userId: u ? u[1] : "", ts: ts ? ts[1] : "", text: slackBody(b) };
    }).filter(function(x){ return x.ts; }) };
  }
  function parseSlackThread(raw){
    return String(raw || "").split(/(?=^--- Reply \d+ of \d+ ---)/m).filter(function(b){ return /^--- Reply \d+ of \d+ ---/.test(b); }).map(function(b){
      var u = b.match(/^From:.*\(([A-Z0-9]+)\)\s*$/m), ts = b.match(/^Message TS:\s*(\S+)/m);
      return { userId: u ? u[1] : "", ts: ts ? ts[1] : "", text: slackBody(b) };
    }).filter(function(x){ return x.ts; });
  }
  // Send the saved check to the trainee. Records slack_sent_at (and where the DM is, to find the reply) or why it failed;
  // the check itself is already saved. Resolves to "" or the reason.
  function sendSpot(check, updated){
    var t = state.trainees.filter(function(x){ return x.id === check.trainee_id; })[0];
    var slack = window.TrainerSlack;
    var mark = function(fields){ return dbFn.doc("spot_checks/" + check.id).update(fields).catch(function(){}); };
    var fail = function(m){ return mark({ slack_error: m }).then(function(){ return m; }); };
    if (!t) return Promise.resolve("The trainee is no longer on the roster.");
    if (!slack) return fail("Slack isn't available right now.");
    if (!t.slack_user_id && !t.email) return fail("Add " + t.name + "'s work email in Settings → Roster so they can be found on Slack.");
    var co = cohortOfTrainee(t.id), uid = null;
    return slack.userIdFor(t).then(function(id){
      uid = id;
      if (!uid) throw { plain: "Couldn't find a Slack account for " + (t.email || t.name) + ". Check the work email in Settings → Roster." };
      return slack.sendDirect(uid, spotMessage(t, check, co ? co.name : "", updated));
    }).then(function(){
      var sentAt = new Date().toISOString();
      var fields = { slack_sent_at: sentAt, slack_error: "", slack_user_id: uid, slack_channel: "", slack_ts: String(Date.parse(sentAt) / 1000), reply: "", reply_at: "" };
      // The newest message in the DM right after sending is the spot check; its ts anchors the reply.
      return slack.call("slack_read_channel", { channel_id: uid, limit: 3, response_format: "detailed" }, { cache: false }).then(function(r){
        var parsed = parseSlackChannel(r && r.payload && r.payload.messages);
        var mine = parsed.messages.filter(function(m){ return m.userId !== uid; }).sort(function(a, b){ return parseFloat(b.ts) - parseFloat(a.ts); })[0];
        fields.slack_channel = parsed.channel || "";
        if (mine) fields.slack_ts = mine.ts;
      }).catch(function(){}).then(function(){ return mark(fields); }).then(function(){ return ""; });
    }, function(err){
      return fail(err && err.plain ? err.plain : slack.errorText(err));
    });
  }
  // Everything the trainee wrote after the spot check: thread replies and plain DM messages, joined in order.
  function readSpotReply(c){
    var slack = window.TrainerSlack;
    if (!slack || !c.slack_sent_at) return Promise.reject({ plain: "This spot check hasn't been sent on Slack yet." });
    // Spot checks sent before replies were tracked have no saved DM location: look the trainee up and use the send time.
    var t = state.trainees.filter(function(x){ return x.id === c.trainee_id; })[0];
    var ready = c.slack_user_id ? Promise.resolve(c) : (t ? slack.userIdFor(t) : Promise.resolve(null)).then(function(uid){
      if (!uid) throw { plain: "Couldn't find them on Slack." };
      return Object.assign({}, c, { slack_user_id: uid });
    });
    return ready.then(function(cc2){ return readSpotReplyFrom(slack, Object.assign({}, cc2, { slack_ts: cc2.slack_ts || String(Date.parse(cc2.slack_sent_at) / 1000) })); });
  }
  function readSpotReplyFrom(slack, c){
    var found = {}, errors = [];
    var keep = function(m){ if (m.userId === c.slack_user_id && parseFloat(m.ts) > parseFloat(c.slack_ts) && m.text) found[m.ts] = m; };
    return slack.call("slack_read_thread", { channel_id: c.slack_channel || c.slack_user_id, message_ts: c.slack_ts, response_format: "detailed" }, { cache: false })
      .then(function(r){ parseSlackThread(r && r.payload && r.payload.messages).forEach(keep); }, function(e){ errors.push(e); })
      .then(function(){ return slack.call("slack_read_channel", { channel_id: c.slack_user_id, oldest: c.slack_ts, limit: 50, response_format: "detailed" }, { cache: false }); })
      .then(function(r){ parseSlackChannel(r && r.payload && r.payload.messages).messages.forEach(keep); }, function(e){ errors.push(e); })
      .then(function(){
        if (errors.length === 2) throw errors[0];
        var msgs = Object.keys(found).map(function(k){ return found[k]; }).sort(function(a, b){ return parseFloat(a.ts) - parseFloat(b.ts); });
        return { text: msgs.map(function(m){ return m.text; }).join("\n"), at: msgs.length ? new Date(parseFloat(msgs[msgs.length - 1].ts) * 1000).toISOString() : "" };
      });
  }
  function checkSpotReplies(ids){
    var list = spot.checks.filter(function(c){ return ids.indexOf(c.id) !== -1 && c.slack_sent_at; });
    if (!list.length) return setSpotMsg("Nothing sent on Slack to check yet.", true);
    setSpotMsg("Reading replies on Slack…", false);
    var got = 0, failed = 0;
    list.reduce(function(chain, c){
      return chain.then(function(){
        return readSpotReply(c).then(function(r){
          if (r.text && r.text !== c.reply){ got++; return dbFn.doc("spot_checks/" + c.id).update({ reply: r.text, reply_at: r.at, reply_checked_at: new Date().toISOString() }).then(function(){ c.reply = r.text; c.reply_at = r.at; }); }
        }, function(){ failed++; });
      });
    }, Promise.resolve()).then(function(){
      setSpotMsg((got ? "Saved " + got + " new repl" + (got === 1 ? "y" : "ies") + " ✓" : "No new replies yet.") + (failed ? " Couldn't read " + failed + " DM" + (failed === 1 ? "" : "s") + "; try again." : ""), !got && !!failed);
    });
  }
  function saveSpot(){
    var d = spot.draft, t = spot.trainee, editing = spot.editId ? spot.checks.filter(function(c){ return c.id === spot.editId; })[0] : null;
    var sc = spotScore(d.score);
    if (!t) return setSpotMsg("Pick the trainee.", true);
    if (!d.ticket.trim()) return setSpotMsg("Add the ticket link.", true);
    if (!d.comms.trim()) return setSpotMsg("Add your feedback on comms.", true);
    if (!d.resolution.trim()) return setSpotMsg("Add your feedback on resolution.", true);
    if (sc == null || sc < 0 || sc > 100) return setSpotMsg("The score is a percentage from 0 to 100.", true);
    if (!dbFn) return setSpotMsg("Saving isn't available in this view.", true);
    var fields = { ticket: d.ticket.trim(), comms: d.comms.trim(), resolution: d.resolution.trim(), score: sc };
    var send = !editing || spot.resend, check, write;
    if (editing){
      fields.edited_at = new Date().toISOString();
      check = Object.assign({}, editing, fields);
      write = dbFn.doc("spot_checks/" + editing.id).update(fields);
    } else {
      var co = cohortOfTrainee(t);
      var id = "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      check = Object.assign({ id: id, trainee_id: t, cohort_id: co ? co.id : "", created_at: new Date().toISOString(), slack_sent_at: "", slack_error: "" }, fields);
      write = dbFn.doc("spot_checks/" + id).set(check);
    }
    spot.busy = true; setSpotMsg("Saving…", false);
    write.then(function(){
      var i = spot.checks.map(function(c){ return c.id; }).indexOf(check.id);
      if (i === -1) spot.checks = spot.checks.concat([check]); else spot.checks[i] = check;
      spot.draft = Object.assign({}, BLANK_SPOT); spot.form = false; spot.editId = ""; spot.resend = false;
      if (!send){ spot.busy = false; setSpotMsg("Changes saved. Nothing was sent on Slack.", false); return; }
      setSpotMsg("Saved. Sending to the trainee on Slack…", false);
      return sendSpot(check, !!editing).then(function(err){
        spot.busy = false;
        var tn = (state.trainees.filter(function(x){ return x.id === t; })[0] || {}).name || "the trainee";
        setSpotMsg(err ? "Saved, but it wasn't sent: " + err : "Saved and sent to " + tn + " on Slack ✓", !!err);
      });
    }, function(){ spot.busy = false; setSpotMsg("Couldn't save. Try again.", true); });
  }
  function setSpotMsg(m, err){ spot.msg = m; spot.err = !!err; renderSpotPanel(true); }
  function resendSpot(id){
    var c = spot.checks.filter(function(x){ return x.id === id; })[0];
    if (!c) return;
    setSpotMsg("Sending…", false);
    sendSpot(c, !!c.edited_at).then(function(err){ setSpotMsg(err ? "Not sent: " + err : "Sent on Slack ✓", !!err); });
  }
  function editSpot(id){
    var c = spot.checks.filter(function(x){ return x.id === id; })[0];
    if (!c) return;
    spot.form = true; spot.editId = id; spot.resend = false; spot.trainee = c.trainee_id; spot.msg = "";
    spot.draft = { ticket: c.ticket || "", comms: c.comms || "", resolution: c.resolution || "", score: c.score == null ? "" : String(c.score) };
    renderSpotPanel(true);
    var f = document.getElementById("spotBody"); if (f && f.scrollIntoView) f.scrollIntoView({ block: "start" });
  }
  function spotDate(iso){ return iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : ""; }
  function spotLink(u){
    return /^https?:\/\//i.test(u) ? "<a href=\"" + esc(u) + "\" target=\"_blank\" rel=\"noopener\">" + esc(u) + "</a>" : esc(u);
  }
  function spotReplyHtml(c){
    if (c.reply) return "<p><b>Trainee reply" + (c.reply_at ? " (" + esc(spotDate(c.reply_at)) + ")" : "") + ":</b> " + esc(c.reply).replace(/\n/g, "<br>") + "</p>";
    return c.slack_sent_at ? "<p class=\"hint\" style=\"margin:4px 0;\">No reply from the trainee yet.</p>" : "";
  }
  function spotCheckHtml(c){
    var status = c.slack_sent_at ? "<span class=\"hint\" style=\"margin:0;\">Sent on Slack " + esc(spotDate(c.slack_sent_at)) + "</span>" : "<span class=\"save-status err\">Not sent" + (c.slack_error ? ": " + esc(c.slack_error) : "") + "</span>";
    var acts = "<div class=\"spot-acts\"><button class=\"ghost small\" type=\"button\" data-spot-edit=\"" + esc(c.id) + "\">Edit</button>" +
      (c.slack_sent_at ? "<button class=\"ghost small\" type=\"button\" data-spot-replies=\"" + esc(c.id) + "\">Check reply</button>" : "<button class=\"ghost small\" type=\"button\" data-spot-resend=\"" + esc(c.id) + "\">Send on Slack</button>") + " " + status + "</div>";
    return "<div class=\"spot-item\"><div><b>" + spotFmt(spotScore(c.score)) + "%</b> · " + esc(spotDate(c.created_at)) + (c.edited_at ? " <small class=\"muted\">edited</small>" : "") + " · " + spotLink(c.ticket) + "</div>" +
      "<p><b>Comms:</b> " + esc(c.comms) + "</p><p><b>Resolution:</b> " + esc(c.resolution) + "</p>" + spotReplyHtml(c) + acts + "</div>";
  }
  // The trainees in view (the picked cohort, or everyone who is in one).
  function spotList(){
    var inAny = {};
    state.cohorts.forEach(function(c){ (c.trainee_ids || []).forEach(function(id){ inAny[id] = true; }); });
    var cohort = state.cohorts.filter(function(c){ return c.id === spot.cohort; })[0];
    var byId = function(id){ return state.trainees.filter(function(t){ return t.id === id; })[0]; };
    return cohort ? (cohort.trainee_ids || []).map(byId).filter(Boolean) : state.trainees.filter(function(t){ return inAny[t.id]; });
  }
  // Every spot check of the trainees in view, by trainee then oldest first.
  function spotCohortRows(list){
    var rows = [];
    list.forEach(function(t){ spotFor(t.id).slice().reverse().forEach(function(c){ rows.push({ t: t, c: c }); }); });
    return rows;
  }
  function copySpotCohort(){
    var rows = spotCohortRows(spotList());
    if (!rows.length) return setSpotMsg("Nothing to copy yet.", true);
    var cell = function(v){ return String(v == null ? "" : v).replace(/[\t\r\n]+/g, " ").trim(); };
    var lines = [["Trainee", "Date", "Ticket", "Feedback on Comms", "Feedback on Resolution", "Score %", "Trainee reply", "Reply date"]].concat(rows.map(function(r){
      return [r.t.name, (r.c.created_at || "").slice(0, 10), r.c.ticket, r.c.comms, r.c.resolution, r.c.score, r.c.reply || "", (r.c.reply_at || "").slice(0, 10)];
    })).map(function(r){ return r.map(cell).join("\t"); });
    var done = function(ok){ setSpotMsg(ok ? "Copied " + rows.length + " spot check" + (rows.length === 1 ? "" : "s") + ". Paste into a sheet." : "Couldn't copy. Your browser blocked the clipboard.", !ok); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(lines.join("\n")).then(function(){ done(true); }, function(){ done(fallbackCopy(lines.join("\n"))); });
    else done(fallbackCopy(lines.join("\n")));
  }
  function renderSpotPanel(force){
    var host = document.getElementById("spotBody");
    if (!host) return;
    if (!force && host.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    var cohort = state.cohorts.filter(function(c){ return c.id === spot.cohort; })[0];
    var list = spotList();
    var cohortOpts = "<option value=\"\">All cohort trainees</option>" + state.cohorts.map(function(c){ return "<option value=\"" + esc(c.id) + "\"" + (c.id === spot.cohort ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join("");
    var viewBtn = function(k, label){ return "<button class=\"ghost small" + (spot.view === k ? " on" : "") + "\" type=\"button\" data-spot-view=\"" + k + "\" aria-pressed=\"" + (spot.view === k) + "\">" + label + "</button>"; };
    var head = "<div class=\"speed-bar\"><div class=\"field\"><label for=\"spotCohort\">Cohort</label><select id=\"spotCohort\">" + cohortOpts + "</select></div>" +
      "<div class=\"spot-views\">" + viewBtn("trainee", "By trainee") + viewBtn("cohort", "Entire cohort") + "</div>" +
      "<button class=\"primary small\" id=\"spotNewBtn\" type=\"button\">" + (spot.form ? "Cancel" : "+ New spot check") + "</button>" +
      (spot.view === "cohort" ? "<button class=\"ghost small\" id=\"spotCopyBtn\" type=\"button\" title=\"Copy every spot check in view as rows to paste into a sheet\">Copy</button>" : "") +
      "<button class=\"ghost small\" id=\"spotRepliesBtn\" type=\"button\" title=\"Read the trainees' replies from Slack and save them here\">Check replies</button>" +
      (spot.msg ? "<span class=\"save-status " + (spot.err ? "err" : "ok") + "\">" + esc(spot.msg) + "</span>" : "") + "</div>";
    var form = "";
    if (spot.form){
      var editing = !!spot.editId;
      var traineeOpts = "<option value=\"\">Pick a trainee…</option>" + list.concat(editing ? state.trainees.filter(function(t){ return t.id === spot.trainee && list.indexOf(t) === -1; }) : []).map(function(t){ return "<option value=\"" + esc(t.id) + "\"" + (t.id === spot.trainee ? " selected" : "") + ">" + esc(t.name) + "</option>"; }).join("");
      var d = spot.draft;
      form = "<div class=\"card spot-form\"><h3 class=\"card-title\">" + (editing ? "Edit spot check" : "New spot check") + "</h3>" +
        "<div class=\"field\"><label for=\"spotTrainee\">Trainee</label><select id=\"spotTrainee\"" + (editing ? " disabled" : "") + ">" + traineeOpts + "</select></div>" +
        "<div class=\"field\"><label for=\"spotTicket\">Ticket link</label><input id=\"spotTicket\" type=\"url\" placeholder=\"https://…\" value=\"" + esc(d.ticket) + "\" /></div>" +
        "<div class=\"field\"><label for=\"spotComms\">Feedback on Comms</label><textarea id=\"spotComms\" rows=\"3\">" + esc(d.comms) + "</textarea></div>" +
        "<div class=\"field\"><label for=\"spotRes\">Feedback on Resolution</label><textarea id=\"spotRes\" rows=\"3\">" + esc(d.resolution) + "</textarea></div>" +
        "<div class=\"field\"><label for=\"spotScore\">Score (%)</label><input id=\"spotScore\" type=\"text\" inputmode=\"decimal\" placeholder=\"0–100\" value=\"" + esc(d.score) + "\" style=\"width:100px\" /></div>" +
        (editing ? "<label class=\"spot-opt\"><input type=\"checkbox\" id=\"spotResend\"" + (spot.resend ? " checked" : "") + " /> Also send the updated copy to the trainee on Slack (their earlier reply is cleared)</label>"
                 : "<p class=\"hint\">Saving sends a copy to the trainee on Slack and asks for their acknowledgement and action plan.</p>") +
        "<div class=\"card-actions\"><button class=\"primary small\" id=\"spotSaveBtn\" type=\"button\"" + (spot.busy ? " disabled" : "") + ">" + (editing ? (spot.resend ? "Save and send" : "Save changes") : "Save and send") + "</button></div></div>";
    }
    var body;
    if (!list.length) body = "<p class=\"hint\">No cohort trainees here yet.</p>";
    else if (spot.view === "cohort"){
      var rows = spotCohortRows(list);
      var avg = spotAvg(rows.map(function(r){ return r.c; }));
      body = "<h3 class=\"card-title\">" + esc(cohort ? cohort.name : "All cohort trainees") + " <small class=\"muted\">" + rows.length + " spot check" + (rows.length === 1 ? "" : "s") + (avg != null ? " · average " + spotFmt(avg) + "%" : "") + "</small></h3>" +
        (rows.length ? "<div class=\"speed-wrap\"><table class=\"preview full-text spot-table\"><thead><tr><th>Trainee</th><th>Date</th><th>Score</th><th>Ticket</th><th>Comms</th><th>Resolution</th><th>Trainee reply</th><th></th></tr></thead><tbody>" +
          rows.map(function(r){
            var c = r.c;
            return "<tr><td>" + esc(r.t.name) + "</td><td>" + esc(spotDate(c.created_at)) + (c.edited_at ? " <small class=\"muted\">edited</small>" : "") + "</td><td><b>" + spotFmt(spotScore(c.score)) + "%</b></td><td>" + spotLink(c.ticket) + "</td><td>" + esc(c.comms) + "</td><td>" + esc(c.resolution) + "</td><td>" + (c.reply ? esc(c.reply).replace(/\n/g, "<br>") : "<span class=\"muted\">" + (c.slack_sent_at ? "No reply yet" : "Not sent") + "</span>") + "</td><td><button class=\"link-btn\" type=\"button\" data-spot-edit=\"" + esc(c.id) + "\">Edit</button></td></tr>";
          }).join("") + "</tbody></table></div>" : "<p class=\"hint\">No spot checks recorded for this cohort yet.</p>");
    }
    else body = "<div class=\"speed-wrap\"><table class=\"preview full-text spot-table spot-by\"><thead><tr><th>Trainee</th><th>Spot checks</th><th>Average score</th><th>Latest</th></tr></thead><tbody>" +
      list.map(function(t){
        var cs = spotFor(t.id);
        return "<tr" + (t.cohort_status === "inactive" ? " class=\"is-inactive\"" : "") + "><td>" + (cs.length ? "<details data-spot-open=\"" + esc(t.id) + "\"" + (spot.open[t.id] ? " open" : "") + "><summary><b>" + esc(t.name) + "</b></summary>" + spotAnalysisHtml(t.id, cs.length) + cs.map(spotCheckHtml).join("") + "</details>" : esc(t.name)) + "</td><td>" + cs.length + "</td><td><b>" + (cs.length ? spotFmt(spotAvg(cs)) + "%" : "—") + "</b></td><td>" + (cs[0] ? spotFmt(spotScore(cs[0].score)) + "% · " + esc(spotDate(cs[0].created_at)) : "—") + "</td></tr>";
      }).join("") + "</tbody></table></div><p class=\"hint\">Open a trainee to see each spot check, edit it, and read their reply. There's no fixed number of spot checks per trainee.</p>";
    host.innerHTML = head + form + body;
  }
  document.addEventListener("click", function(e){
    var t = e.target.closest && e.target.closest("#spotNewBtn, #spotSaveBtn, #spotCopyBtn, #spotRepliesBtn, [data-spot-analyze], [data-spot-resend], [data-spot-edit], [data-spot-replies], [data-spot-view]");
    if (!t) return;
    if (t.id === "spotNewBtn"){
      spot.form = !spot.form; spot.editId = ""; spot.resend = false; spot.msg = ""; spot.trainee = ""; spot.draft = Object.assign({}, BLANK_SPOT);
      renderSpotPanel(true);
    }
    else if (t.id === "spotSaveBtn") saveSpot();
    else if (t.id === "spotCopyBtn") copySpotCohort();
    else if (t.id === "spotRepliesBtn") checkSpotReplies(spotList().reduce(function(a, tr){ return a.concat(spotFor(tr.id).map(function(c){ return c.id; })); }, []));
    else if (t.hasAttribute("data-spot-analyze")) analyzeSpot(t.getAttribute("data-spot-analyze"));
    else if (t.hasAttribute("data-spot-edit")) editSpot(t.getAttribute("data-spot-edit"));
    else if (t.hasAttribute("data-spot-replies")) checkSpotReplies([t.getAttribute("data-spot-replies")]);
    else if (t.hasAttribute("data-spot-view")){ spot.view = t.getAttribute("data-spot-view"); renderSpotPanel(true); }
    else resendSpot(t.getAttribute("data-spot-resend"));
  });
  document.addEventListener("toggle", function(e){
    var d = e.target;
    if (d && d.getAttribute && d.hasAttribute("data-spot-open")) spot.open[d.getAttribute("data-spot-open")] = d.open;
  }, true);
  document.addEventListener("input", function(e){
    var id = e.target && e.target.id;
    if (id === "spotTicket") spot.draft.ticket = e.target.value;
    else if (id === "spotComms") spot.draft.comms = e.target.value;
    else if (id === "spotRes") spot.draft.resolution = e.target.value;
    else if (id === "spotScore") spot.draft.score = e.target.value;
  });
  document.addEventListener("change", function(e){
    var id = e.target && e.target.id;
    if (id === "spotCohort"){ spot.cohort = e.target.value; spot.trainee = ""; renderSpotPanel(true); }
    else if (id === "spotTrainee") spot.trainee = e.target.value;
    else if (id === "spotResend"){ spot.resend = e.target.checked; renderSpotPanel(true); }
  });

  // ---- Shared data for other Trainer Desk apps (Settings → Roster is the one list) ----
  var changeListeners = [];
  var localNotes = {}, localNoteListeners = {}; // notes kept in memory when there is no db
  function copy(list){ return list.map(function(x){ return Object.assign({}, x); }); }

  window.CoachingCompass = {
    // Ask every subscriber (Cohorts, My Class, …) to redraw.
    notify: function(){ changeListeners.forEach(function(fn){ try { fn(); } catch (e){ /* one app's error shouldn't stop the rest */ } }); },
    data: function(){
      return { trainees: copy(state.trainees), cohorts: copy(state.cohorts), teamLeads: copy(state.teamLeads), departments: copy(state.departments) };
    },
    onChange: function(fn){
      changeListeners.push(fn);
      return function(){ changeListeners = changeListeners.filter(function(f){ return f !== fn; }); };
    },
    sheets: function(){ return JSON.parse(JSON.stringify(state.settings)); },
    liveCSideQa: function(crmNames){ return liveSideQa(crmNames, "c_side"); },
    liveSideQa: liveSideQa,
    // C side QA across saved weeks (newest pull per trainee and week), limited to the given CRM names.
    qaSummary: function(crmNames){
      var want = null;
      if (crmNames && crmNames.length){ want = {}; crmNames.forEach(function(n){ want[String(n).trim().toLowerCase()] = true; }); }
      var index = traineeWeekIndex();
      var out = { pass: 0, total: 0, weeks: {}, loaded: Array.isArray(state.allAnalyses) || !dbFn };
      Object.keys(index).forEach(function(k){
        if (want && !want[k]) return;
        Object.keys(index[k].weeks).forEach(function(w){
          var wk = index[k].weeks[w];
          var t = tallyPassRate(wk.headers, wk.rows);
          out.pass += t.pass; out.total += t.total;
          if (t.total) out.weeks[w] = true;
        });
      });
      out.weeks = Object.keys(out.weeks).length;
      return out;
    },
    // One trainee's saved QA weeks (newest first), matched by CRM name the same way
    // Coaching's Cohorts and Individual pages do. HTML parts use Coaching styles,
    // so show them inside a .cc-ui element.
    traineePerformance: function(traineeId){
      var t = state.trainees.filter(function(x){ return x.id === traineeId; })[0];
      var out = { loaded: Array.isArray(state.allAnalyses) || !dbFn, name: t ? t.name : "", crm: t ? (t.crm_name || "") : "", weeks: [] };
      if (!t) return out;
      var index = traineeWeekIndex();
      var key = (t.crm_name || "").trim().toLowerCase();
      if (!index[key]) key = resolveTraineeKey(index, t.name);
      var entry = key ? index[key] : null;
      if (!entry) return out;
      out.weeks = sortedWeeks(entry).map(function(w){
        var wk = entry.weeks[w];
        var d = wk.doc || {};
        var tally = tallyPassRate(wk.headers, wk.rows);
        var item = { analysis: wk.brief, rawRows: wk.rows || [] };
        return {
          week: w,
          source: d.mode === "cohort" ? (d.target_label || "Cohort pull") : d.mode === "trainee" ? "Individual pull" : (d.target_label || "Saved pull"),
          audits: (wk.rows || []).length,
          pass: tally.pass,
          total: tally.total,
          analyzed: !!wk.brief,
          talkingHtml: talkingPointsModalHtml(item),
          markdownsHtml: markdownsModalHtml(item, { headers: wk.headers }, true)
        };
      });
      return out;
    },
    // Speed: weekly numbers pulled from the Speed Productivity Sheet.
    traineeSpeed: traineeSpeed,
    traineeSpot: traineeSpot,
    mountSpeedSettings: function(host){
      speedSettingsHost = host;
      if (state.themeKey && state.themeKey !== "default") host.parentElement.setAttribute("data-cc-theme", state.themeKey);
      renderSpeedSettings(true);
    },
    mountQaSheets: function(host){
      qaSheetHost = host;
      if (state.themeKey && state.themeKey !== "default") host.parentElement.setAttribute("data-cc-theme", state.themeKey);
      renderQaSheetPanel();
    },
    addCohort: function(fields){
      var record = { name: fields.name, department: fields.department || "", team_lead: fields.team_lead || "", training_start_date: fields.training_start_date || "", trainee_ids: [], created_at: new Date().toISOString() };
      if (fields.assignment_id) record.assignment_id = fields.assignment_id;
      if (!dbFn){
        var localId = "local-" + Date.now();
        state.cohorts = state.cohorts.concat([Object.assign({ id: localId }, record)]);
        renderAll();
        return Promise.resolve({ id: localId });
      }
      return dbFn.collection("cohorts").add(record);
    },
    // Add a trainee to the roster (Settings → Roster). Resolves with the new trainee's id.
    addTrainee: function(fields){
      var record = Object.assign({ name: "", email: "", crm_name: "", team_lead: "", department: "", nesting_status: "", created_at: new Date().toISOString() }, fields);
      if (!dbFn){
        var id = "local-t" + Date.now() + Math.random().toString(36).slice(2, 5);
        state.trainees = state.trainees.concat([Object.assign({ id: id }, record)]);
        renderAll();
        return Promise.resolve(id);
      }
      return dbFn.collection("trainees").add(record).then(function(ref){ return ref.id; });
    },
    updateTrainee: function(id, fields){
      if (!dbFn || String(id).indexOf("local-") === 0){
        state.trainees = state.trainees.map(function(t){ return t.id === id ? Object.assign({}, t, fields) : t; });
        renderAll();
        return Promise.resolve();
      }
      return dbFn.doc("trainees/" + id).update(fields);
    },
    // Merge fields into a cohort record (Attendance keeps its channel, message and day grid here).
    updateCohort: function(id, fields){
      if (!dbFn || String(id).indexOf("local-") === 0){
        state.cohorts = state.cohorts.map(function(c){ return c.id === id ? Object.assign({}, c, fields) : c; });
        renderAll();
        return Promise.resolve();
      }
      return dbFn.doc("cohorts/" + id).update(fields);
    },
    // A trainee's notes (Notes & Feedback): trainees/{id}/notes, one record per post with
    // category ("coaching" | "behavioral" | "performance"), text and created_at (ISO time).
    notes: {
      subscribe: function(traineeId, fn){
        if (!dbFn || String(traineeId).indexOf("local-") === 0){
          var tick = function(){ fn((localNotes[traineeId] || []).slice()); };
          (localNoteListeners[traineeId] = localNoteListeners[traineeId] || []).push(tick);
          tick();
          return function(){ localNoteListeners[traineeId] = (localNoteListeners[traineeId] || []).filter(function(f){ return f !== tick; }); };
        }
        return dbFn.doc("trainees/" + traineeId).collection("notes").orderBy("created_at", "desc").onSnapshot(
          function(snap){ fn(snap.docs.map(function(d){ return Object.assign({ id: d.id }, thawed(d.data())); })); },
          function(){ fn(null); }
        );
      },
      add: function(traineeId, category, text){
        var record = { category: category, text: text, created_at: new Date().toISOString() };
        if (!dbFn || String(traineeId).indexOf("local-") === 0){
          (localNotes[traineeId] = localNotes[traineeId] || []).unshift(Object.assign({ id: "local-" + Date.now() }, record));
          (localNoteListeners[traineeId] || []).forEach(function(f){ f(); });
          return Promise.resolve();
        }
        return dbFn.doc("trainees/" + traineeId).collection("notes").add(record);
      },
      // Change a note's text. The original created_at stays; updated_at records the edit.
      update: function(traineeId, noteId, text){
        var patch = { text: text, updated_at: new Date().toISOString() };
        if (!dbFn || String(traineeId).indexOf("local-") === 0){
          localNotes[traineeId] = (localNotes[traineeId] || []).map(function(n){ return n.id === noteId ? Object.assign({}, n, patch) : n; });
          (localNoteListeners[traineeId] || []).forEach(function(f){ f(); });
          return Promise.resolve();
        }
        return dbFn.doc("trainees/" + traineeId).collection("notes").doc(noteId).update(patch);
      },
      // Merge bookkeeping fields into a note (e.g. slack_sent_at) without marking it edited.
      mark: function(traineeId, noteId, fields){
        if (!dbFn || String(traineeId).indexOf("local-") === 0){
          localNotes[traineeId] = (localNotes[traineeId] || []).map(function(n){ return n.id === noteId ? Object.assign({}, n, fields) : n; });
          (localNoteListeners[traineeId] || []).forEach(function(f){ f(); });
          return Promise.resolve();
        }
        return dbFn.doc("trainees/" + traineeId).collection("notes").doc(noteId).update(fields);
      },
      remove: function(traineeId, noteId){
        if (!dbFn || String(traineeId).indexOf("local-") === 0){
          localNotes[traineeId] = (localNotes[traineeId] || []).filter(function(n){ return n.id !== noteId; });
          (localNoteListeners[traineeId] || []).forEach(function(f){ f(); });
          return Promise.resolve();
        }
        return dbFn.doc("trainees/" + traineeId).collection("notes").doc(noteId).delete();
      }
    },
    // Create a Google Doc from report blocks ({type:"h1"|"h2"|"h3"|"note"|"p"|"ul", ...}), the same
    // way Coaching's own "Export to Google Doc" does. Resolves with { id, link } (either may
    // be null); rejects with { message } when there's something to tell the viewer.
    exportGoogleDoc: function(title, blocks){
      if (!mcpFn) return Promise.reject({ message: "Google Doc export isn't available in this view." });
      return mcpFn.callTool("Google Drive", "create_file", { title: title, textContent: blocksToHtml(blocks), contentMimeType: "text/html" })
        .then(function(result){
          var payload = (result && result.payload) || {};
          var link = payload.webViewLink || payload.alternateLink;
          if (!link && payload.id) link = "https://docs.google.com/document/d/" + encodeURIComponent(payload.id) + "/edit";
          return { id: payload.id || null, link: link || null };
        }, function(e){
          var msg = docErrorCopy(e && e.code);
          return Promise.reject({ message: msg || "", cancelled: msg === null });
        });
    },
    // Create a Google Sheet from CSV text (Drive converts it). Resolves with { id, link }.
    exportGoogleSheet: function(title, csv){
      if (!mcpFn) return Promise.reject({ message: "Google Sheets export isn't available in this view." });
      return mcpFn.callTool("Google Drive", "create_file", { title: title, textContent: csv, contentMimeType: "text/csv" })
        .then(function(result){
          var payload = (result && result.payload) || {};
          var link = payload.webViewLink || payload.alternateLink;
          if (!link && payload.id) link = "https://docs.google.com/spreadsheets/d/" + encodeURIComponent(payload.id) + "/edit";
          return { id: payload.id || null, link: link || null };
        }, function(e){
          var msg = docErrorCopy(e && e.code);
          return Promise.reject({ message: msg || "", cancelled: msg === null });
        });
    },
    pullSpeed: pullSpeed,
    // The text of a Google Doc / Sheet / Drive file, from its link. Rejects with { message } when the
    // link isn't a Drive file or Drive can't read it.
    readDriveText: function(url){
      var m = String(url || "").match(/\/d\/([a-zA-Z0-9_-]{20,})/) || String(url || "").match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
      if (!m) return Promise.reject({ message: "Not a Google Drive link." });
      if (!mcpFn) return Promise.reject({ message: "Google Drive isn't available in this view." });
      return mcpFn.callTool("Google Drive", "read_file_content", { fileId: m[1] }).then(function(result){
        var text = extractTextFromToolResult(result);
        if (!text || !text.trim()) return Promise.reject({ message: "That file looks empty." });
        return text;
      }, function(e){
        return Promise.reject({ message: docErrorCopy(e && e.code) || "Google Drive couldn't open that file." });
      });
    },
    // Move a Drive file to the trash (recoverable from Drive's Trash for 30 days).
    trashDriveFile: function(fileId){
      if (!mcpFn) return Promise.reject({ message: "Google Drive isn't available in this view." });
      return mcpFn.callTool("Google Drive", "trash_file", { fileId: fileId }).then(function(){}, function(e){
        return Promise.reject({ message: docErrorCopy(e && e.code) || "" });
      });
    },
    // Delete a cohort. Its trainees stay on the roster, free to join another cohort.
    deleteCohort: function(id){
      if (!dbFn || String(id).indexOf("local-") === 0){
        state.cohorts = state.cohorts.filter(function(c){ return c.id !== id; });
        renderAll();
        return Promise.resolve();
      }
      return dbFn.doc("cohorts/" + id).delete();
    },
    // Replace a cohort's trainees. Rejects when any trainee already belongs to another cohort.
    setCohortTrainees: function(cohortId, ids){
      var cohort = state.cohorts.filter(function(c){ return c.id === cohortId; })[0];
      if (!cohort) return Promise.reject({ message: "That cohort no longer exists." });
      var unique = ids.filter(function(id, i){ return ids.indexOf(id) === i; });
      var clash = conflictMessage(unique, cohortId);
      if (clash) return Promise.reject({ message: clash });
      if (!dbFn || String(cohortId).indexOf("local-") === 0){
        state.cohorts = state.cohorts.map(function(c){ return c.id === cohortId ? Object.assign({}, c, { trainee_ids: unique }) : c; });
        renderAll();
        return Promise.resolve();
      }
      return dbFn.doc("cohorts/" + cohortId).update({ trainee_ids: unique });
    },
    mountRoster: function(host){
      rosterHost = host;
      if (state.themeKey && state.themeKey !== "default") host.parentElement.setAttribute("data-cc-theme", state.themeKey);
      renderRosterPanel();
    }
  };

  if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(function(){ start(); });
  else start();
})();
