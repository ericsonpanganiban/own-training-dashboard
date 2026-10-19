// ---------- About: a plain-language explanation of what Trainer Desk is, opened from the menu bar ----------
(function () {
  const bar = document.querySelector(".menubar-left");
  if (!bar) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "menu-link";
  btn.id = "aboutBtn";
  btn.textContent = "About";
  btn.setAttribute("aria-haspopup", "dialog");
  bar.appendChild(btn);

  const app = (name, text) => `<div class="ab-app"><b>${name}</b><p>${text}</p></div>`;
  const BODY = `
    <p class="ab-lead">Trainer Desk is one workspace where a trainer of new-hire support agents plans a class, tracks every trainee, measures how they are doing and coaches them, without juggling spreadsheets, Slack threads and documents. It looks like a desktop: apps sit in the dock at the bottom and open in their own windows.</p>

    <h3>Who it is for</h3>
    <ul>
      <li><b>Trainer</b>: runs one or more classes (cohorts). Everything below is the Trainer's own dashboard.</li>
      <li><b>Training Manager</b>: sees every Trainer's numbers side by side (QA, Speed, Quiz, Pass rate, goals) and can create classes and assign them to Trainers.</li>
      <li><b>Viewer</b>: a guest, such as a team lead, who can look at a Trainer's classes and progress but cannot change anything.</li>
    </ul>

    <h3>The big idea</h3>
    <p>Everything hangs off a <b>cohort</b> (a class, for example "NH 10/5/2026") and its <b>trainees</b>. Each app adds one kind of information about them: attendance, quiz results, QA scores, speed, spot checks, notes. Open a trainee's <b>Performance</b> and you see all of it in one place. A trainee is <b>Active</b> or <b>Inactive</b> (resigned or terminated), and Pass rate is Active ÷ (Active + Inactive).</p>

    <h3>The apps</h3>
    <div class="ab-grid">
      ${app("My Class", "Your cohorts that are in training today, opened to the roster. Click a trainee's name for their details, or open <b>Performance</b> for their QA, Speed, Quiz and Spot Check results.")}
      ${app("Cohorts", "All your classes grouped as Active, Upcoming and Completed: dates, department, team lead, trainees, Active / Inactive status and pass rate. Each class has a <b>Team Docs</b> sub-page: team docs, individual docs and trainee access.")}
      ${app("Metrics and Coaching", "QA Data Request and QA Data (audits read from your QA sheets, with analysis), Speed (minutes per ticket from the Speed sheet), Spot Check (record a ticket review with comms and resolution feedback and a score), plus Team and Individual coaching briefs written with Claude.")}
      ${app("Attendance", "Send a daily check-in to the cohort's Slack channel, read who replied and when, and grade each day On time, Late (in tiers), Absent or NCNS. Totals points per trainee, pings non-repliers, keeps dated attendance notes, tracks break and lunch (30 and 60 minutes a day, in parts) and flags anyone over, and exports to a Google Sheet.")}
      ${app("Quiz", "Build quizzes by hand or have Claude draft questions from your Google Docs. Send them to a cohort on Slack, read the replies and grade them, then send each trainee their results. Short and Weekly quizzes carry weights for a weighted average. From a trainee's Performance → Quiz, Claude can analyze their results and write a coaching opportunity report with your expectations to send them.")}
      ${app("Courseware", "A lobby of training material links (docs, sheets, slides, videos) shown as tiles with previews.")}
      ${app("Ops Updates", "Updates from the Slack channels you choose, checked every 30 minutes, with Read entire message, Forward to a cohort, and Personal Reminders that notify you when they are due.")}
      ${app("Settings", "Appearance, the Roster (the one list of trainees, cohorts, departments and team leads), the Speed and QA sheet links, Training Managers and Viewers.")}
    </div>

    <h3>How scores come together</h3>
    <ul>
      <li><b>QA</b>: pass rate of audited tickets, by week, from your QA sheets.</li>
      <li><b>Speed</b>: minutes per ticket (lower is faster) against the team goal.</li>
      <li><b>Quiz</b>: Short and Weekly quizzes. Weekly quiz parts are grouped by the training week they fall in (Week 1 starts on the cohort's start date). You can enter a score by hand with a note for a quiz taken outside Claude, and a Quiz-category spot check counts as a weekly quiz part. If a trainee never answers, <b>Close check</b> scores them 0.</li>
      <li><b>Spot Check</b>: Nesting or Quiz category. Each one is sent to the trainee on Slack asking for an acknowledgement and an action plan; their reply is saved on it, and Claude can summarise repeated mistakes and common themes.</li>
    </ul>

    <h3>Where Claude and your other tools fit</h3>
    <ul>
      <li><b>Claude</b> drafts quiz questions, grades free-text answers, and analyses QA audits and spot checks. It only uses what is saved here or in the material you point it to.</li>
      <li><b>Slack</b> is used for check-ins, quizzes, results and spot checks. Messages go out from your own account, and only when you press the button.</li>
      <li><b>Google Drive</b> is read for QA and Speed sheets and quiz source documents, and written to when you export to a Google Sheet.</li>
    </ul>

    <h3>Your data and who can see it</h3>
    <ul>
      <li>Data is saved in this artifact's own database. Each Trainer has a separate workspace, so Trainers do not see each other's classes unless they open another Trainer's view, which is read-only.</li>
      <li>The Training Manager reads only a small summary each Trainer publishes (cohort counts and scores), not private notes.</li>
      <li>Viewers must first be given access to the artifact, then added in Settings → Viewers. Everything they see is read-only.</li>
    </ul>

    <h3>Good to know</h3>
    <ul>
      <li>Names that look like links open a floating window with details. Menus with ⋮ hold edit and delete options.</li>
      <li>Most lists have a <b>Copy</b> button that copies rows ready to paste into a sheet.</li>
      <li>Nothing is sent to Slack, deleted or shared unless you press the matching button.</li>
    </ul>`;

  let box = null;
  function close() {
    if (!box) return;
    box.remove();
    box = null;
    btn.setAttribute("aria-expanded", "false");
    btn.focus();
  }
  function open() {
    if (box) return close();
    box = document.createElement("div");
    box.className = "about-overlay";
    box.innerHTML = `<div class="about-card" role="dialog" aria-modal="true" aria-labelledby="aboutTitle">
      <div class="about-head"><div><h2 id="aboutTitle">About Trainer Desk</h2><small>Metrics and coaching for new-hire training</small></div>
      <button type="button" class="btn" data-about-close>Close</button></div>
      <div class="about-body">${BODY}</div></div>`;
    document.body.appendChild(box);
    btn.setAttribute("aria-expanded", "true");
    box.addEventListener("click", (e) => (e.target === box || e.target.closest("[data-about-close]")) && close());
    box.addEventListener("keydown", (e) => e.key === "Escape" && close());
    box.querySelector("[data-about-close]").focus();
  }
  btn.addEventListener("click", open);
})();
