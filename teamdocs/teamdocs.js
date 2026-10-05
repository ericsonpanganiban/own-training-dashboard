// Team Docs: a sub-page of a cohort (Cohorts → Team Docs) with a sidebar of Team Docs, Individual Docs and
// Trainee Access. Everything is kept on the cohort record (team_docs, individual_docs, access_items, access);
// each trainee's name opens a floating window with their details, including a few manual fields kept on the trainee
// (recent_job, current_city, hobbies, referred_by). Loaded after app.js and coaching-compass.
(function () {
  "use strict";
  const DEFAULT_ACCESS = ["Work Gmail", "Slack", "CRM", "Google Drive", "Training portal"];
  const TABS = [
    { id: "team", label: "Team Docs" },
    { id: "individual", label: "Individual Docs" },
    { id: "access", label: "Trainee Access" },
  ];
  const cc = () => window.CoachingCompass;
  const esc = (s) => escapeHtml(String(s == null ? "" : s));
  const uid = () => `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const safeUrl = (u) => (/^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(String(u || "").trim()) ? `https://${String(u).trim()}` : "");
  const linkTo = (u, text) => (safeUrl(u) ? `<a class="td-link" href="${esc(safeUrl(u))}" target="_blank" rel="noopener">${esc(text || u)}</a>` : esc(text || u));

  const cohortNow = (id) => cc().data().cohorts.find((c) => c.id === id);
  const membersOf = (c) => (c?.trainee_ids || []).map((id) => cc().data().trainees.find((t) => t.id === id)).filter(Boolean);

  // ---- The floating window with one trainee's details ----
  function openTrainee(traineeId) {
    const key = `td_${traineeId}`;
    const t0 = cc().data().trainees.find((x) => x.id === traineeId);
    if (!t0 || typeof APPS === "undefined") return;
    let off = null;
    if (!APPS[key]) {
      APPS[key] = {
        title: `${t0.name || "Trainee"} · Details`,
        icon: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
        color: "#3b82f6",
        custom: true,
        render(el) {
          el.classList.add("flush");
          const paint = (force) => {
            if (!force && el.contains(document.activeElement) && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
            el.innerHTML = traineeHtml(traineeId);
          };
          paint(true);
          el.addEventListener("click", (e) => {
            const b = e.target.closest("[data-td-save]");
            if (!b) return;
            const val = (n) => (el.querySelector(`[name="${n}"]`)?.value || "").trim();
            const status = el.querySelector("[data-td-status]");
            b.disabled = true;
            status.textContent = "Saving…";
            cc()
              .updateTrainee(traineeId, { recent_job: val("recent_job"), current_city: val("current_city"), hobbies: val("hobbies"), referred_by: val("referred_by") })
              .then(() => ((status.textContent = "Saved ✓"), (b.disabled = false)))
              .catch(() => ((status.textContent = "Couldn't save. Try again."), (b.disabled = false)));
          });
          off?.();
          off = cc().onChange(() => paint(false));
        },
        onClose() {
          off?.();
          off = null;
        },
      };
    }
    APPS[key].title = `${t0.name || "Trainee"} · Details`;
    openApp(key);
    // A small floating window rather than a full-size one.
    const win = openWindows.get(key);
    if (win && !win.dataset.tdSized) {
      win.dataset.tdSized = "1";
      const desk = win.parentElement.getBoundingClientRect();
      const w = Math.min(460, desk.width - 16);
      win.style.width = `${w}px`;
      win.style.height = `${Math.min(600, desk.height - 120)}px`;
      win.style.left = `${Math.max(8, (desk.width - w) / 2 + 60)}px`;
    }
  }

  function traineeHtml(traineeId) {
    const t = cc().data().trainees.find((x) => x.id === traineeId);
    if (!t) return `<div class="td-person"><p class="muted">This trainee is no longer on the roster.</p></div>`;
    const cohort = cc().data().cohorts.find((c) => (c.trainee_ids || []).includes(t.id));
    const row = (k, v) => `<div class="td-kv"><span>${k}</span><b>${v || '<span class="muted">—</span>'}</b></div>`;
    const field = (name, label, ph) => `<label class="td-field"><span>${label}</span><input type="text" name="${name}" value="${esc(t[name] || "")}" placeholder="${ph}" autocomplete="off" /></label>`;
    return `<div class="td-person">
      <h3>${esc(t.name || "Trainee")}</h3>
      <div class="td-kvs">
        ${row("Work Gmail", t.email ? `<a class="td-link" href="mailto:${esc(t.email)}">${esc(t.email)}</a>` : "")}
        ${row("Cohort", esc(cohort?.name || ""))}
        ${row("Department", esc(t.department || ""))}
        ${row("Team lead", esc(t.team_lead || ""))}
        ${row("CRM name", esc(t.crm_name || ""))}
        ${row("Slack", t.slack_user_id ? "Matched" : t.email ? "Matched on first send" : "No work email")}
      </div>
      <p class="td-note">The work Gmail, department and team lead come from Settings → Roster.</p>
      <h4>About ${esc((t.name || "").split(/\s+/)[0] || "them")}</h4>
      ${field("recent_job", "Recent job", "Where they worked last")}
      ${field("current_city", "Current city", "e.g. Cebu City")}
      ${field("hobbies", "Hobbies", "e.g. Hiking, baking")}
      ${field("referred_by", "Referred by", "Name of the referrer, if any")}
      <div class="td-actions"><button type="button" class="btn-primary" data-td-save>Save details</button><span class="sheet-status" data-td-status role="status"></span></div>
    </div>`;
  }

  // ---- The Team Docs sub-page ----
  function open(content, cohortId) {
    const win = content.closest(".window");
    if (!win || win.querySelector(".sheet")) return;
    if (!cohortNow(cohortId)) return;
    const appId = win.dataset.app;
    const savedCrumbs = crumbState[appId]?.items || [];
    const st = { tab: "team", editDoc: null, msg: "" };
    const sheet = document.createElement("div");
    sheet.className = "sheet page";
    sheet.innerHTML = `<div class="sheet-card td-card" role="region" aria-label="Team Docs"></div>`;
    win.appendChild(sheet);
    const card = sheet.querySelector(".sheet-card");

    const save = (fields) => cc().updateCohort(cohortId, fields).catch(() => ((st.msg = "Couldn't save. Try again."), draw()));
    const accessItems = (c) => (Array.isArray(c.access_items) && c.access_items.length ? c.access_items : DEFAULT_ACCESS);
    const nameLink = (t) => `<button type="button" class="td-name" data-trainee="${esc(t.id)}" title="Open ${esc(t.name)}'s details">${esc(t.name)}</button>`;

    const teamBody = (c) => {
      const docs = c.team_docs || [];
      const e = st.editDoc ? docs.find((d) => d.id === st.editDoc) : null;
      return `<h2>Team Docs</h2>
        <p class="muted">Documents the whole cohort uses: add a link for each.</p>
        <form class="td-form" data-team-form novalidate>
          <input type="text" name="title" placeholder="Title" value="${esc(e?.title || "")}" />
          <input type="text" name="url" placeholder="Link (https://…)" value="${esc(e?.url || "")}" />
          <input type="text" name="note" placeholder="Note (optional)" value="${esc(e?.note || "")}" />
          <button type="submit" class="btn-primary">${e ? "Save" : "Add doc"}</button>${e ? `<button type="button" class="btn" data-team-cancel>Cancel</button>` : ""}
        </form>
        ${
          docs.length
            ? `<ul class="td-list">${docs
                .map(
                  (d) => `<li><div><b>${linkTo(d.url, d.title || d.url)}</b>${d.note ? `<small>${esc(d.note)}</small>` : ""}</div>
                    <span><button type="button" class="btn btn-small" data-team-edit="${esc(d.id)}">Edit</button> <button type="button" class="btn btn-small" data-team-del="${esc(d.id)}">Remove</button></span></li>`
                )
                .join("")}</ul>`
            : `<p class="muted">No team docs yet.</p>`
        }`;
    };

    const individualBody = (c) => {
      const ms = membersOf(c);
      if (!ms.length) return `<h2>Individual Docs</h2><p class="muted">No trainees in this cohort yet.</p>`;
      const all = c.individual_docs || {};
      return `<h2>Individual Docs</h2>
        <p class="muted">Documents for one trainee. Click a name to see their details.</p>
        ${ms
          .map((t) => {
            const docs = all[t.id] || [];
            return `<section class="td-person-docs">
              <div class="td-person-head">${nameLink(t)}<small class="muted">${docs.length} doc${docs.length === 1 ? "" : "s"}</small></div>
              ${docs.length ? `<ul class="td-list">${docs.map((d) => `<li><div><b>${linkTo(d.url, d.title || d.url)}</b></div><button type="button" class="btn btn-small" data-ind-del="${esc(t.id)}|${esc(d.id)}">Remove</button></li>`).join("")}</ul>` : ""}
              <form class="td-form" data-ind-form="${esc(t.id)}" novalidate>
                <input type="text" name="title" placeholder="Title" />
                <input type="text" name="url" placeholder="Link (https://…)" />
                <button type="submit" class="btn btn-small">Add doc</button>
              </form>
            </section>`;
          })
          .join("")}`;
    };

    const accessBody = (c) => {
      const ms = membersOf(c);
      const items = accessItems(c);
      const acc = c.access || {};
      return `<h2>Trainee Access</h2>
        <p class="muted">Tick what each trainee has been given access to. Click a name to see their details.</p>
        <form class="td-form" data-item-form novalidate>
          <input type="text" name="item" placeholder="Add an access item, e.g. QA sheet" />
          <button type="submit" class="btn btn-small">Add item</button>
        </form>
        ${
          ms.length
            ? `<div class="td-table-wrap"><table class="td-table"><thead><tr><th>Trainee</th><th>Work Gmail</th>${items
                .map((i) => `<th>${esc(i)} <button type="button" class="td-x" data-item-del="${esc(i)}" title="Remove ${esc(i)}" aria-label="Remove ${esc(i)}">×</button></th>`)
                .join("")}<th>Granted</th></tr></thead><tbody>${ms
                .map((t) => {
                  const mine = acc[t.id] || {};
                  const n = items.filter((i) => mine[i]).length;
                  return `<tr><td>${nameLink(t)}</td><td>${esc(t.email || "—")}</td>${items
                    .map((i) => `<td class="td-c"><input type="checkbox" data-access="${esc(t.id)}|${esc(i)}"${mine[i] ? " checked" : ""} aria-label="${esc(i)} for ${esc(t.name)}" /></td>`)
                    .join("")}<td>${n} of ${items.length}</td></tr>`;
                })
                .join("")}</tbody></table></div>`
            : `<p class="muted">No trainees in this cohort yet.</p>`
        }`;
    };

    const draw = () => {
      const c = cohortNow(cohortId);
      if (!c) return close();
      const body = st.tab === "individual" ? individualBody(c) : st.tab === "access" ? accessBody(c) : teamBody(c);
      card.innerHTML = `<nav class="td-side" aria-label="Team Docs pages">
          <button type="button" class="td-back" data-back>← Back</button>
          <div class="td-cohort">${esc(c.name)}</div>
          ${TABS.map((t) => `<button type="button" class="td-tab${st.tab === t.id ? " on" : ""}" data-tab="${t.id}" aria-current="${st.tab === t.id}">${t.label}</button>`).join("")}
        </nav>
        <div class="td-main">${body}<p class="sheet-status" role="status">${esc(st.msg)}</p></div>`;
      const tab = TABS.find((t) => t.id === st.tab);
      // The page's own label is the last crumb: Cohorts › cohort › Team Docs › Individual Docs.
      sheet.querySelector(".sheet-card").setAttribute("aria-label", tab.label);
      setCrumbs(appId, st.tab === "team" ? [{ label: c.name }] : [{ label: c.name }, { label: "Team Docs", go: () => ((st.tab = "team"), draw()) }]);
    };

    const unsubscribe = cc().onChange(() => {
      if (!sheet.isConnected) return;
      if (card.contains(document.activeElement) && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      draw();
    });
    function close() {
      unsubscribe();
      sheet.remove();
      setCrumbs(appId, savedCrumbs);
    }
    // closeSheet() (the breadcrumbs) clicks [data-cancel]
    const cancelProxy = document.createElement("button");
    cancelProxy.hidden = true;
    cancelProxy.setAttribute("data-cancel", "");
    cancelProxy.addEventListener("click", close);
    sheet.appendChild(cancelProxy);

    card.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const c = cohortNow(cohortId);
      if (b.dataset.back !== undefined) return close();
      if (b.dataset.tab) {
        st.tab = b.dataset.tab;
        st.msg = "";
        st.editDoc = null;
        return draw();
      }
      if (b.dataset.trainee) return openTrainee(b.dataset.trainee);
      if (b.dataset.teamEdit) {
        st.editDoc = b.dataset.teamEdit;
        return draw();
      }
      if (b.dataset.teamCancel !== undefined) {
        st.editDoc = null;
        return draw();
      }
      if (b.dataset.teamDel) return save({ team_docs: (c.team_docs || []).filter((d) => d.id !== b.dataset.teamDel) });
      if (b.dataset.indDel) {
        const [tid, did] = b.dataset.indDel.split("|");
        const all = { ...(c.individual_docs || {}) };
        all[tid] = (all[tid] || []).filter((d) => d.id !== did);
        return save({ individual_docs: all });
      }
      if (b.dataset.itemDel) return save({ access_items: accessItems(c).filter((i) => i !== b.dataset.itemDel) });
    });
    card.addEventListener("change", (e) => {
      const box = e.target.closest("[data-access]");
      if (!box) return;
      const c = cohortNow(cohortId);
      const [tid, item] = box.dataset.access.split("|");
      const acc = { ...(c.access || {}) };
      acc[tid] = { ...(acc[tid] || {}), [item]: box.checked };
      save({ access: acc, access_items: accessItems(c) });
    });
    card.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target;
      const c = cohortNow(cohortId);
      const v = (n) => (f.elements[n]?.value || "").trim();
      if (f.matches("[data-team-form]")) {
        if (!v("title") && !v("url")) return void ((st.msg = "Add a title or a link."), draw());
        if (v("url") && !safeUrl(v("url"))) return void ((st.msg = "That link doesn't look right. Start it with https://"), draw());
        const doc = { id: st.editDoc || uid(), title: v("title"), url: safeUrl(v("url")), note: v("note") };
        const list = c.team_docs || [];
        st.editDoc = null;
        st.msg = "";
        return save({ team_docs: list.some((d) => d.id === doc.id) ? list.map((d) => (d.id === doc.id ? doc : d)) : [...list, doc] });
      }
      if (f.matches("[data-ind-form]")) {
        if (!v("title") && !v("url")) return;
        if (v("url") && !safeUrl(v("url"))) return void ((st.msg = "That link doesn't look right. Start it with https://"), draw());
        const tid = f.dataset.indForm;
        const all = { ...(c.individual_docs || {}) };
        all[tid] = [...(all[tid] || []), { id: uid(), title: v("title"), url: safeUrl(v("url")) }];
        st.msg = "";
        return save({ individual_docs: all });
      }
      if (f.matches("[data-item-form]")) {
        const item = v("item");
        if (!item) return;
        const items = accessItems(c);
        if (items.some((i) => i.toLowerCase() === item.toLowerCase())) return void ((st.msg = "That item is already there."), draw());
        st.msg = "";
        save({ access_items: [...items, item] });
      }
    });
    sheet.addEventListener("keydown", (e) => e.key === "Escape" && !e.target.closest("input, textarea") && close());
    draw();
    card.querySelector(".td-tab.on")?.focus();
  }

  // Any trainee name marked data-td-trainee (the cohort's trainee list, Settings → Roster) opens the same window.
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-td-trainee]");
    if (b) openTrainee(b.dataset.tdTrainee);
  });

  window.TeamDocs = { open, openTrainee };
})();
