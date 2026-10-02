# Trainer Desk

A macOS-style trainer dashboard: a dock of app tiles at the bottom, and each app opens in its own draggable, resizable window.

Apps: **Settings**, **My Class**, **Courseware**, **Ops Updates**, **Cohorts** (sample data in `app.js`) and **Coaching** (`coaching-compass/`).

Open `index.html` in a browser to run it locally. Coaching needs the Claude artifact runtime to save data, analyze audits and read Google Drive; outside an artifact it runs with nothing saved.

To publish as a Claude artifact, run `python3 build.py` and publish `dist/trainer-desk.html`.

To add an app, add an entry to `APPS` in `app.js`.

Coaching (`coaching-compass/`): Team coaching and Individual coaching both start at a cohort level (cohort pills,
newest first; Team also has a week tab per saved analysis). The Calibration Log is no longer a tab in QA Data Request;
its tile stays on Coaching's Home. QA Sheets has a C side and a CP side sheet, read the same way (first tab, header row 1, columns found by name): QA Data Request pulls from the side of the cohort's or trainee's department (a department named CP is CP side), and Cohorts shows a live QA score for each side. Settings → Knowledge Base has **+ Add more** (and Remove for extra rows) per side, and each resource is marked **Saved** and **Read by Claude** (remembered in `settings/kb_reads`; older checks are matched by name).

**Speed and cohort export.** Settings → **Speed Productivity Sheet** takes the Google Sheet URL and tab name ("Daily raw data"; Drive exports only the first tab, so it must be first). Coaching's **Speed** app pulls one week at a time: type the week number and Pull. Columns are found by header, falling back to letters: CRM_NAME (A), HUBSTAFF_DATE (D), WEEK_NUM (E), TOTAL_BILLED_TICKET_HOURS (F), SPEED (K). Only trainees assigned to a cohort are kept, daily, one `speed_weeks/{week}` doc per week; the weekly figure is the average of days with a speed. Hours can be typed into any day's box when the sheet lacks them and survive re-pulls. In Cohorts and My Class, **Performance** opens as a page (breadcrumbs: Trainer Desk › app › cohort › trainee › Performance › QA | Speed) with a QA view and a Speed view. Each opened cohort has **Export to Google Sheets** with an **Include inactive trainees** checkbox: two sheets for all its trainees, Performance (QA % and Speed per week) and Notes & Feedback; re-exporting trashes the previous copies (links kept on the cohort as `export_sheets`).

**Speed details.** Speed is minutes per ticket (billed ticket hours × 60 ÷ cleared tickets, the sheet's SPEED); lower is faster. Each day shows tickets (TOTAL_TICKETS) and hours, both editable; the daily and weekly speed recalculate on edit and edits survive re-pulls. The team goal (min/ticket, saved in `settings/speed_sheet`) shows the tickets each trainee needs for their hours. Trainee, Avg speed and Hours stay frozen while scrolling sideways. **Performance** has QA, Speed and Quiz views (Quiz: a score summary per quiz type, short quizzes unlimited and weekly quizzes in two fixed slots, then each quiz with the questions missed, from `TrainerQuiz.traineeResults`), and Performance and Notes & Feedback each have a **Copy** button (tab-separated rows for pasting into a sheet). In Coaching the sub-apps run QA Data Request, QA Data (was Cohorts; cohorts are added in the Cohorts app), Speed, Team coaching, Individual coaching, Calibration Log, Settings.

**Personal Reminders.** A fourth tab in Ops Updates: add a reminder with a title, date, time and details. Reminders are stored in `reminders/{id}` with the viewer's id as `owner`, so each viewer only sees their own. When one comes due (checked every 30 seconds while the dashboard is open) it pops up as a toast with a short chime (the chime needs one click on the page first, a browser rule), lands once in the bell and badges Ops Updates on the dock; until it is marked done it stays flagged OVERDUE (a red hazard icon beside the bell plus a banner and flag on the tab). Each reminder has a ⋮ menu to edit, mark done or delete.

**Trainee status and team goals.** The Coaching app is now **Metrics and Coaching**. In Cohorts and My Class, a cohort's ⋮ menu has **Set Team Goals** (Quiz average %, QA %, Speed min/ticket, Attendance points; stored on the cohort as `team_goals`, blank means unused) and a trainee's ⋮ menu has **Set Trainee Status**: Auto, or by hand Projected to pass / Projected to fail / Resigned / Terminated (stored on the trainee as `trainee_status`). Auto compares each trainee with the goals that have data (quiz weighted average, overall QA, average weekly speed, attendance points): all met projects a pass, any miss a fail, no data shows nothing. The cohort details also show the active percentage.

**Workspaces and the Training Manager.** `workspace/workspace.js` loads first and gives every app its database through `TrainerUse("db")`. Everything a Trainer saves goes into their own workspace: the artifact owner's is the database root (where all the original data already lives) and everyone else's is `workspaces/<their id>/…`. Shared for everyone: `courseware`, `config/managers`, `trainers/<id>` (a Trainer's directory entry plus the `summary` the Manager reads), the owner's default look, and `data/users/` (private). A Trainer can open another Trainer's dashboard from the avatar menu at the far right of the menu bar (or Settings → Appearance), where each person can also pick one of ten animal avatars (stored on `trainers/<id>.animal`); the owner can switch between their Trainer dashboard and the Training Manager from the same menu; it is read-only (writes and Slack sends are refused, and the database rules refuse the writes too). Managers (picked by the owner in Settings → Training Managers, stored in `config/managers`) get the Training Manager instead of the Trainer dashboard: its own dock (Overview, Trainers, Cohorts, Performance, Reports, Courseware, Settings), reading each Trainer's published summary (`manager/manager.js`; each Trainer's dashboard refreshes its summary while open, `publishSummary` in `app.js`). The owner can preview it from the same settings page. In the Manager, **Open** on a Trainer opens a window on the manager's desktop (their cohorts, trainees, projections and goal checks, from the summary: no switching away), and **+ Add Trainer** names someone (stored in `added/<id>`, open to Contributors) so they're listed before they've opened the dashboard. **Training Manager apps.** Trainers: **+ Add Trainer** makes a profile (name, optional link to a person's account, one of the ten animal avatars) in `added/<id>`; each Trainer has a ⋮ menu with Edit and Delete (Delete hides someone who has their own dashboard, so they don't come back). Cohorts: **+ Add Class** is the Trainer dashboard's Add Class form plus a Trainer dropdown; the class is stored in `assignments/<id>` and that Trainer's dashboard copies it into their own Cohorts once (it keeps name, department, team lead and start date in step with later edits). The manager's departments and team leads come from Settings → Roster, the same page the Trainer has. Pass rate (trainees who passed nesting, of everyone in the cohort) shows on Overview, Trainers, Cohorts, Performance and each Trainer's window. Ops Updates is on the manager's dock too, with an extra **Training Team** Slack tab. **Completed classes, Training Team.** Each cohort row has a **Mark completed / Reopen** button (stored as `completed` on the cohort); completed classes move to the Completed section and leave My Class, Attendance's current list and the Manager's Current class. Ops Updates has a **Training Team** Slack tab for everyone; the Training Manager also gets a box there to send a message to that channel. The Manager's Trainers table has a **Current class** column. Database rules declared at publish: root and `config` and `workspaces` and `trainers` read by Contributors and up, written by Editors and up; each person writes `workspaces/{self}` and `trainers/{self}`; `courseware`, `added` and `assignments` are open to Contributors.

Every window has a breadcrumb bar under its title (Trainer Desk › App › …). An app reports its deeper levels with
`TrainerDesk.setCrumbs(appId, [{ label, go }], home)`; an open dialog adds its title as the last step, and clicking
an earlier step closes the dialog first. "Trainer Desk" shows the desktop.

## Dock

A floating, rounded glass dock tinted by the active colorway (rim, fill and glow use the accent). Icons can be dragged
to reorder. A thin divider separates the trainer apps from the tools (Ops Updates, Settings), a small accent-colored
dot marks open apps and pops in as the icon hops when an app opens, and apps with unread notifications (Quiz replies,
Ops Updates) show a count badge on the icon.

## Colorways

Settings → Appearance → Themes: **Match system**, **Light** (clean off-white `#F5F5F7` with white cards, blue `#007AFF`
active, green `#34C759` success, orange `#FF9500` warning), **Dark** (X-style: black, `#16181C` cards, `#2F3336`
borders, `#1D9BF0` accent) and **Playful** (Plants vs. Zombies 3: pale green, white rounded cards with soft shadows,
leafy green, sunflower yellow and violet, Baloo 2 headings). The colors are tokens on `body` in `styles.css`
(`--window-bg`, `--card`, `--accent`, `--success`, …); Coaching maps its own tokens to the same colorway in
`coaching-compass/cc.css`.

## Notifications and Ops Updates

`notify/notify.js`. A bell in the menu bar collects notifications from every app (`notifications/{id}`). Apps add a
source with `TrainerNotify.register({ id, label, app, poll, every, cfg })`; each source is checked when it comes due
(on open, then every 5-minute look for anything due, when a sleeping tab wakes) and on **Check now**.

**Ops Updates** (the former Notion app) has three pages: **CP Gen**, **Care** and **Notion Update Requests**. The owner
pastes a Slack channel (its ID or a link) for each page; new messages there are listed and counted on the bell, checked
every 30 minutes while the dashboard is open. Channels are stored in `notification_settings/{ops_cp_gen|ops_care|notion}`
(the Requests page keeps the original `notion` document, so earlier updates carry over), never in the code.
**Forward to a cohort…** sends a message to the Slack channel of any cohort you tick. That channel is the one saved on the
cohort in Attendance (`attendance_channel_id`), so it is only set once; the message is editable first and nothing is sent
until you confirm. Forwards are noted on the message. Quiz adds a read-only hourly source that notices replies to recent
quizzes (it doesn't grade; Check Quiz does). Checks run only while the dashboard is open in a browser.

Default look: the owner's colorway, dock order and wallpaper are the default for everyone (`settings/dashboard_defaults`,
`settings/dashboard_wallpaper`); the first time the owner opens it, their current ones are saved (a default saved before colorways existed gets the owner's colorway added), and Settings →
Appearance has **Make mine the default for everyone**. A wallpaper photo is kept at full quality (the file itself when it's an ordinary web image up to 4K, else scaled to 3840 px) in the browser's IndexedDB, and "Make mine the default" uploads it as a file with the Assets capability, so everyone sees it in full resolution (`settings/dashboard_wallpaper` holds the file's id and URL). Anyone who reorders the dock or picks a wallpaper keeps their own
until they choose **Use the default**.

## Courseware

`courseware/courseware.js`: a lobby for training material links, as tiles with a preview (`courseware/{id}`: title,
url, category, note, preview). Add a link with an optional name, category and note; filter by category chip or search.
A tile's preview is the file's thumbnail when the browser can fetch one (YouTube, Drive), else the first lines of a
Google Doc (read once with Google Drive and saved; "Refresh preview" in the tile's menu), else a cover colored for its
type (Doc, Sheet, Slides, Form, Drive folder/file, PDF, video, Notion, link). With no name typed, a Google Doc's first
line becomes the name.

## Attendance

`attendance/attendance.js`, ported from the Trainer Dashboard (Alpha) Attendance tab. It uses the cohorts and
trainees from Settings → Roster. For each cohort: save its Slack channel ID, send a check-in (editable; an edited
message becomes that cohort's default), then Check Replies to grade who replied and when (Present within 5 min,
Late within 15). Grades land in the 20-day points grid on the check-in's training day, and the grid can also be
set by hand and exported to a Google Sheet. It grades itself 10 minutes after a send while the page stays open.

Needs the Slack connector (`slack_send_message`, `slack_read_channel`, `slack_read_thread`, `slack_search_users`).
Trainees are matched to Slack by their work email.

## Quiz

Side panel: **Roster** (each cohort's trainees from Cohorts, who Slack can reach, and quiz scores), **Send Quiz** (pick the cohort, then tick who gets it: active trainees by default, inactive ones optional), **Check Quiz**, **Quiz Buckets** (the quizzes and question editor),
**Quiz Links** and **Resources** (saved links: `quiz_links`, `quiz_resources`).
Each quiz has a type (default Short quiz 30%, Weekly quiz 70%; edit in `quiz_settings/weights`). The Roster shows each
trainee's average per type and the weighted average; types with no scores yet are left out and the rest scaled to 100%.
Click a trainee's name for their page: every quiz sent to them (newest first) with its type, whether they answered,
score, pass/below, and View answers.
Check Quiz starts at the cohort level: a card per cohort (current batch first; average, answered, last sent) and a
trainee finder across cohorts. A cohort shows its quizzes and sends, with a trainee finder on the results.
**View all answers** shows every trainee's answer per question (with an "only wrong" filter). **✨ Analyze** runs
separately at three levels for the selected quiz: the entire pool (every cohort; says where a mistake is concentrated),
the cohort, or one trainee. Each is saved in `quiz_analyses/{quizId}__{level}__{key}` and flagged when answers change;
trainees are numbered, not named, in the request. In a trainee's answers, **Send result to trainee** writes an
editable Slack DM (by default a reply in the quiz thread): score, then every question with their answer, the result
(correct / wrong / being reviewed), the right answer when wrong, and Claude's feedback on short answers. Saved as
`feedback_sent_at`.

**Trash** (`quiz_trash/{id}`): deleted quizzes, questions (ones with anything written), quiz links and resources wait
30 days, with Restore and Delete for good. A trashed quiz's sends and results stay in place, so a restore brings them
back; deleting it for good also removes its sends and analyses. A restored question goes back into its quiz at its old
position (the quiz has to be restored first). Items past 30 days are deleted the next time the Quiz app loads.

`quiz/quiz.js`. Write a quiz by hand (multiple choice, true/false, short answer; points per question, a passing
score), send it to a cohort's active trainees as Slack DMs, then **Check replies**. Trainees answer by replying to the
DM, one answer per line ("1. B", "2. True", …), in the thread or the DM itself. Multiple choice and true/false are
checked automatically; short answers are checked by Claude against the answer key. Any answer can be marked correct or
wrong by hand, and answers can be typed in for someone who replied another way. Results show replies, average score,
how many passed, a by-question correct rate, and each trainee's score. Stored in `quizzes/{id}` and
`quizzes/{id}/runs/{runId}` (each send keeps the quiz as sent, so later edits don't change old scores).
