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

**Spot Check.** Metrics and Coaching has a **Spot Check** app (stored in `spot_checks/{id}`): pick a cohort to see each trainee's number of spot checks, average and latest score (open a trainee for every check), and **+ New spot check** records one ticket: trainee, ticket link, feedback on Comms, feedback on Resolution and a Score (0–100%). Saving sends the trainee a Slack DM with the details that asks for their acknowledgement and an action plan; if it can't be sent (no work email, no Slack match) the check is still saved and shows **Send again**. There is no fixed count per trainee. Each check has **Edit**; saving an edit sends nothing unless you tick *Also send the updated copy on Slack* (which clears the earlier reply). **Check replies** (or **Check reply** on one check) reads the trainee's DM and thread replies after the spot check and saves them on it (`reply`, `reply_at`). Open a trainee in By trainee for **Edit**, **Check reply** and **Analyze with Claude**, which reads all of that trainee's spot checks (and their replies) and lists repeated mistakes (in two or more checks), common themes, the trend and what to coach next; it is saved in `spot_analyses/{trainee}` and shown, read-only, in Performance → Spot Check. Spot checks sent before reply tracking use their send time to find the reply. **Entire cohort** lists every spot check of the cohort in one table, with a **Copy** button (tab-separated, including replies). Performance (under each trainee) has a **Spot Check** view with the average, the latest and every check, and Copy.

**Team Docs.** Each cohort row in Cohorts and My Class has a **Team Docs** button that opens a sub-page (`teamdocs/teamdocs.js`) with a sidebar: **Team Docs** (links for the whole cohort: title, link, note; edit and remove), **Individual Docs** (links per trainee) and **Trainee Access** (a grid of access items, Work Gmail, Slack, CRM, Google Drive and Training portal to start, that you can add to or remove, with a tick per trainee). All of it is stored on the cohort (`team_docs`, `individual_docs`, `access_items`, `access`). A trainee's name (not underlined) opens a floating window with their work Gmail, cohort, department, team lead, CRM name and Slack match from the Roster, plus fields you fill in by hand: Recent job, Current city, Hobbies and Referred by (stored on the trainee). The same name link (and window) is on each trainee in an opened cohort and in Settings → Roster.

**Attendance colors.** In the Attendance grid a day's box is white for On time, orange for any Late tier (.25 to 1.00), and red for Absent and NCNS.

**Attendance replies.** Check Replies reads the check-in's thread. A trainee Slack search couldn't match is matched from the thread itself (the reply's work email, the same name before the @ when Slack uses another domain such as homeaglowcare.com, or a name that matches ignoring a middle initial) and saved, and Ping No-Replies does the same, then the grid day for the day the check-in was sent is graded. The status line says how many replies were found, how many trainees matched, which day was updated and who has no Slack match.

**Viewers.** Settings → **Viewers** (owner only, stored in `config/viewers`) lists people who can look at the owner's dashboard without changing anything: they must first be given access to the artifact from its Share menu (at least a level that can use it, since the database is read at that level), then added here. A Viewer opens straight into the owner's data (the database root) with a banner saying it's view-only and a dock of My Class, Cohorts, Attendance, Metrics and Coaching and Courseware. Changes are refused twice: the scoped database (`workspace/workspace.js`) rejects every write and the Slack/Drive tools that send or change things, and buttons that would change something (Add, Edit, Save, Send, Mark, ⋮ menus and so on) show a "View only" notice instead of opening. Opening rows, Performance, Notes, Team Docs, tabs and Copy still work. Settings → Viewers also lists **Opened the dashboard**: everyone with an entry in the Trainers directory (made when they first open it), named or not, each with **Add as viewer**, for people the name search doesn't offer. Managers and the owner are never treated as Viewers.

**Start new (Resources).** Once the request box has anything in it or questions have been suggested, a **Start new** button next to Suggest clears the whole Ask Claude form (request, count, types, ticked resources, pasted material and every suggestion) and puts the cursor back in the request box.

**Quiz questions from resources.** Ask Claude for quiz questions reads each ticked Google Doc in full. When the material is longer than one request can hold (about 40,000 characters), it no longer keeps the top of the document: it splits the text into sections, scores each by how often the request's words appear (a matching heading counts triple) and sends the best-matching sections, in document order, with their headings. A request can ask for up to 30 questions; if Claude writes fewer than asked (or one is dropped as malformed), the app asks again for just the gap, up to two more times, telling Claude which questions already exist, and drops repeats; the status line says so if it still falls short. The prompt also tells Claude to stay on the requested topic and write fewer questions rather than go off-topic, and the status line says how many sections were used.

**Quiz Buckets sorting.** Each quiz has a **Track** (CP Gen or C Side, stored as `track`) next to its Quiz type. The Buckets list has a **Sort** box: *By track and type* (default) groups quizzes under CP Gen, then C Side, then "No track yet" for quizzes without one, and inside each track under Weekly quiz, then Short quiz (other types after, then "No type"), each group sorted by title with numbers in order; *Recently edited* is the flat list. Changing a quiz's track or type regroups it immediately. Existing quizzes start with no track, so set one on each.

**Close check.** In Quiz → Check Quiz → a cohort, **Close check** ends the check for that send of the quiz: it reads the replies one last time (and stops if it can't, so nobody who replied is zeroed), then scores every trainee with no submission 0% (`source: "closed"` on their response, `closed_at` on the run), with a checkbox for trainees the quiz couldn't be sent to. Those zeros count in the average, Passed, the weighted average and the trainee's Performance → Quiz (shown as "No submission (0)"), but not in Replied, By question or the answer analysis. **Check replies** is off while closed; **Reopen check** removes the zeros. A zero can still be replaced with answers typed in by hand. A result sent to a zero-scored trainee says no answers were submitted and it was scored 0%.

**Bulk results.** In Quiz → Check Quiz → a cohort, **Send results to all** DMs every trainee their result (the same message as Send result to trainee), after a confirmation that shows how many will get it. Trainees whose answers still need review, and trainees who already received theirs, are skipped unless you tick them. Each send is stamped `feedback_sent_at` on the response, and anyone who can't be reached is named in the summary.

**Trainee status and team goals.** The Coaching app is now **Metrics and Coaching**. In Cohorts and My Class, a cohort's ⋮ menu has **Set Team Goals** (Quiz average %, QA %, Speed min/ticket, Attendance points; stored on the cohort as `team_goals`, blank means unused) and a trainee's ⋮ menu has **Set Trainee Status**: Auto, or by hand Projected to pass / Projected to fail / Resigned / Terminated (stored on the trainee as `trainee_status`). Auto compares each trainee with the goals that have data (quiz weighted average, overall QA, average weekly speed, attendance points): all met projects a pass, any miss a fail, no data shows nothing. The cohort details also show the active percentage.

**Workspaces and the Training Manager.** `workspace/workspace.js` loads first and gives every app its database through `TrainerUse("db")`. Everything a Trainer saves goes into their own workspace: the artifact owner's is the database root (where all the original data already lives) and everyone else's is `workspaces/<their id>/…`. Shared for everyone: `courseware`, `config/managers`, `trainers/<id>` (a Trainer's directory entry plus the `summary` the Manager reads), the owner's default look, and `data/users/` (private). A Trainer can look at another Trainer (a read-only window with their cohorts and trainees, no page switch) from the avatar menu at the far right of the menu bar (or Settings → Appearance), where each person can also pick one of ten animal avatars (stored on `trainers/<id>.animal`); the owner can switch between their Trainer dashboard and the Training Manager from the same menu (the dock and menu-bar label swap, no page reload, so nothing has to be reloaded); it is read-only (writes and Slack sends are refused, and the database rules refuse the writes too). Managers (picked by the owner in Settings → Training Managers, stored in `config/managers`) get the Training Manager instead of the Trainer dashboard: its own dock (Overview, Trainers, Cohorts, Performance, Reports, Courseware, Settings), reading each Trainer's published summary (`manager/manager.js`; each Trainer's dashboard refreshes its summary while open, `publishSummary` in `app.js`). The owner can preview it from the same settings page. In the Manager, **Open** on a Trainer opens a window on the manager's desktop (their cohorts, trainees, projections and goal checks, from the summary: no switching away), and **+ Add Trainer** names someone (stored in `added/<id>`, open to Contributors) so they're listed before they've opened the dashboard. **Training Manager apps.** Trainers: **+ Add Trainer** makes a profile (name, optional link to a person's account, one of the ten animal avatars) in `added/<id>`; each Trainer has a ⋮ menu with Edit and Delete (Delete hides someone who has their own dashboard, so they don't come back). Cohorts: **+ Add Class** is the Trainer dashboard's Add Class form plus a Trainer dropdown; the class is stored in `assignments/<id>` and that Trainer's dashboard copies it into their own Cohorts once (it keeps name, department, team lead and start date in step with later edits). The manager's departments and team leads come from Settings → Roster, the same page the Trainer has. Pass rate (active trainees ÷ active + inactive) shows on Overview, Trainers, Cohorts, Performance and each Trainer's window. Ops Updates is on the manager's dock too, with an extra **Training Team** Slack tab. **Completed classes, Training Team.** Each cohort row has a **Mark completed / Reopen** button (stored as `completed` on the cohort); completed classes move to the Completed section and leave My Class, Attendance's current list and the Manager's Current class. Ops Updates has a **Training Team** Slack tab for everyone; the Training Manager also gets a box there to send a message to that channel. The Manager's Trainers table has a **Current class** column. **Trainees in a class.** On a class you created, ⋮ → **Add trainees** picks from the manager's Roster (Settings → Roster) and stores a snapshot on the class (`assignments/<id>.trainees`); the Trainer's dashboard creates them as roster trainees (`roster_ref`) and puts them in the copied cohort, and keeps that list in step. A trainee can be in one cohort only: adding someone already in another class (or in a cohort a Trainer made, matched by name) needs an override where the manager types the trainee's last name; confirming moves them out of the old class. In the Manager's Cohorts, each row shows, in small type under its name, the same details the Trainer's Cohorts shows: name, department and team lead, Classroom Training and Nesting dates, the bold Production Endorsement Date, and the trainee count; the same block heads each cohort in a Trainer's window. The Manager's Cohorts are split into **Active**, **Upcoming** and **Completed** sections (by the schedule's dates, or the Trainer's Mark completed), with a **No start date** section only when a class has none; empty sections say so. Database rules declared at publish: root and `config` and `workspaces` and `trainers` read by Contributors and up, written by Editors and up; each person writes `workspaces/{self}` and `trainers/{self}`; `courseware`, `added` and `assignments` are open to Contributors.

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

**Entered quiz scores.** Performance → Quiz has **+ Add score** for a quiz taken outside the Claude-made ones: pick Short or Weekly, type the score (`85`, `85%` or `8/10`), a date and a **Note** (what the score was for). Entries are saved on the trainee (`manual_quiz_scores`), show an "Entered by hand" tag with the note and **Edit / Remove**, appear in the Short / Weekly summary tables, and count in the averages and weighted average everywhere. Copy includes a Note column.

**Score for unanswered quizzes.** In Performance → Quiz, a quiz marked *No reply yet* has **Enter score** (score + note). It is saved on that quiz run's response (`source: "score"`), counts in averages and the weighted average, shows "Entered by hand" with the note, and has Edit / Remove (Remove returns it to *No reply yet*). Check replies and Close check leave it alone.

**Attendance notes.** In Attendance, each trainee's Total Points is a link that opens **Attendance notes** (a list of dated entries saved on the cohort as `attendance_notes[traineeId]`; each save adds a new entry, with Remove per entry; an older single note shows as one entry). A ● after the points means a note exists (hover to preview). The Google Sheet export adds an *Attendance Note* column to the per-trainee analysis.

**Read entire message.** Each Ops Updates card has **Read entire message**, which opens the full text (links and bold kept) in a floating window with Open in Slack, and marks it read. Messages are now kept up to 12,000 characters (before: 3,500); updates already stored keep what was saved.

**Weekly quiz by training week.** In Performance → Quiz, the Weekly table groups quiz parts by the training week they fall in (Week 1 starts on the cohort's training start date, 7 days each). A week's cell is the average of its parts, with the part count. The **Week N** name is a link that opens the list of that week's parts (title, date, score, note). Without a cohort start date it falls back to one slot per quiz.

**Spot check category.** A spot check has a **Category**: Nesting (default; older checks count as Nesting) or Quiz. It shows in the By-trainee list, the Entire-cohort table and Copy, and Performance → Spot Check. Quiz spot checks also appear in Performance → Quiz as a *Quiz spot checks* table (with their average); they are shown beside the quizzes and do not change the quiz averages or weighted average.

**Spot Check list by category.** The Spot Check page has a **Category** filter that defaults to Nesting, so Quiz spot checks don't appear in the list, counts or averages there. Choose Quiz or All to see or edit them. They always show in Performance → Quiz.

**Quiz spot checks count as weekly quiz scores.** A spot check with the Quiz category is counted as a Weekly quiz part in Performance → Quiz (and in the quiz averages, weighted average and Roster): it lands in the training week of its date, shows in that week's list of parts and as a *From Spot Check* card with the ticket link and feedback. It replaces the separate *Quiz spot checks* table. Edit it in Spot Check (Category → Quiz); changing the score or category updates the quiz view.

**Edit a quiz spot check from Performance → Quiz.** Spot checks tagged Quiz show an **Edit** link on their card (ticket link, comms feedback, resolution feedback, score). Saving updates the spot check and the quiz scores; it sends nothing on Slack.

**About.** The menu bar has an **About** link (`about/about.js`) that opens a window explaining what Trainer Desk is: who it is for (Trainer, Training Manager, Viewer), the cohort/trainee model, each app, how scores come together, where Claude, Slack and Google Drive are used, and who can see the data. Update that text when features change.

**Break & lunch monitoring.** In Attendance, **Send Break & Lunch…** (next to the check-in buttons) posts one message a day to the cohort channel asking trainees to reply in its thread with `break out` / `break back` / `lunch out` / `lunch back` (a plain "back" closes whichever was opened last). **Check Break Replies** reads the thread and saves each trainee's out/back events on `cohorts/{id}/breaks/{id}`. A **Break / Lunch** column between the name and Total Points shows each trainee's state: grey *No reply*, amber *On break*, orange *On lunch*, green *Back · break/lunch minutes used*, and red with ⚠ when they pass the daily allowance: 30 minutes of break and 60 minutes of lunch in total, in any number of parts (live while still out). Hover a chip for the times; the 🍽 button lists today's log. It re-reads today's thread by itself every 5 minutes while the Attendance window is open (and the tab is visible), or when you press Check Break Replies; it can't run while the dashboard is closed.

**Why a projection.** Hover (or keyboard-focus) the *Projected to pass/fail · auto* badge beside a trainee to see the reason: each goal with data (Quiz average, QA, Speed, Attendance) with the trainee's value, whether it meets or misses the goal and by what rule, plus any goal skipped because there's no data yet. The pop-up is placed on screen so lists and window edges don't clip it. A badge set by hand shows "Set by hand".

**Spot check categories by week.** The Category list is now *Nesting Week 1*, *Nesting Week 2*, *Quiz Week 1*, *Quiz Week 2* (stored as `category` nesting/quiz plus `week` 1/2). A Quiz Week 1 or 2 spot check counts as a Weekly quiz part in that training week, whenever it is actually checked, so a late check doesn't fall into Week 3. Older spot checks keep their category with no week (Quiz ones still land by their date); edit one to give it a week. The Spot Check list filter is still Nesting / Quiz / All.

**Change a spot check's category when editing it.** The Edit form on a quiz spot check (Performance → Quiz) has an *Applies to* list (Nesting Week 1/2, Quiz Week 1/2). Moving it to a Quiz week puts it in that Weekly quiz week; moving it to Nesting takes it out of the Quiz tab (it then shows under Nesting in Spot Check).

**Break & lunch auto-read.** The thread is read as soon as the Attendance window shows today's message, again every 5 minutes while the tab is visible, and whenever you come back to the tab. It can't read while the dashboard is closed, so replies sent meanwhile appear the next time it opens.

**Check Break Replies is always available.** It reads the newest Break & Lunch message (any age) whenever you press it, and says so if none has been sent. The message in play is the newest one sent in the last 20 hours, not one tied to the calendar date, so a shift that runs past midnight keeps updating; an older message still shows its last read.

**Break & lunch: how a flag is decided.** Red ⚠ names the limit that was passed (for example *Break 31/30 ⚠*), counted in whole minutes across all of a trainee's parts. If someone goes out for lunch without a "break back" (or the reverse), the unfinished part is not counted and the chip gets a **?** with the explanation on hover, so a missing reply no longer looks like an overrun.

**Break & lunch chip wording.** The chip says only what matters: *Break*, *Lunch*, *Online* (back from either), *Overbreak* / *Overlunch* (past the daily allowance), or *No reply*. Hover for the details: how many minutes the current break or lunch has been running and since when, how many minutes over, minutes used and left for each, and every part with its times. A part with no "back" reply isn't counted and is noted there.

**Analyze performance and coaching report.** Performance → Quiz has **✨ Analyze performance**: Claude reads the trainee's quiz scores by quiz and training week, the questions they missed and their Quiz spot-check feedback, and writes a read (status On track / Keep an eye / At risk, trend, what's going well, opportunities, focus next), saved on the trainee (`quiz_analysis`). **Create coaching report** then opens expectation settings (target score, meet-by date, check-in date, tone, focus areas, expectation checkboxes and anything else) and Claude writes a message to the trainee. You can edit it, **Copy** it, or **Send to the trainee on Slack** (a DM, only when you press the button); the latest report is saved on the trainee (`quiz_report`) with whether it was sent.

**Report options.** In the report settings, untick **More quizzes are coming** when no quizzes are left: the quiz target, meet-by date and retake expectation are dropped and the message focuses on applying the learning. The **Report type** list (or the **Next step report** button, which needs no analysis) switches to a *Next step* report: the nesting targets the trainee must reach to continue. Targets start from the cohort's team goals (Quiz average, QA, Speed, Attendance); tick which to include and change a number for this report only. The table shows where the trainee stands now on each (or *no data yet*), you set an achieve-by date and a check-in date, and Claude writes the message from those facts only. Copy or Send on Slack work as before; the latest report is saved with its `kind` (coaching or nextstep).

**Speed table layout.** The Speed table now flows with the page (no scroll box of its own; only sideways scrolling remains when the days are wider than the window, with Trainee / Avg speed / Hours kept in view). Trainees who are inactive, resigned or terminated are listed at the bottom, dimmed, in their original order.

**Speed: frozen header.** The Speed page's description line is removed. The title bar, the controls (cohort, saved week, goal, pull) and the table's column headings now stay frozen at the top while the trainee rows scroll underneath; any sideways scroll belongs to the page, not to a box inside it.

**Speed follows the cohort.** The Speed page opens on the cohort that is in training today (pick *All cohort trainees* to see everything). With a cohort chosen, Saved week lists only the pulled weeks that fall in that cohort's four training weeks (labelled with their dates), and a note says how many other pulled weeks are hidden. If none is pulled yet it says so and suggests the week to pull: Pull week is pre-filled with the cohort's current week number, and its dropdown suggests each of the cohort's weeks so far. Week numbers are worked out from the calendar using any week already pulled.

**Last activity on each trainee.** In the trainee list (Cohorts and My Class), each trainee has a *Last: …* line, to the left of the Active/Inactive toggle, with what you did most recently and when (for example *Recorded a spot check (Quiz Week 1, 80%) · 2d ago*); hover it for the last 8 things. It reads timestamps that already exist (spot checks and their edits and replies, attendance notes, quiz analysis, coaching/next-step reports and when they were sent, notes export) plus a short log kept on the trainee (`activity`, newest first, 20 kept) for things that had no timestamp: notes added, edited or deleted, Active/Inactive, status changes, profile and personal-detail edits, entered quiz scores. Older actions that were never timestamped can't be recovered, so those trainees may show *No activity yet* until you next act on them.

**Message Overbreaks.** In Attendance, **Message Overbreaks…** (next to Check Break Replies) reads the thread again, lists trainees more than 2 minutes over their 30 min break or 60 min lunch, and sends each a direct Slack message only after you press Send. You can untick people. Anyone already messaged for the same break or lunch is unticked, so nobody gets the same reminder twice.

**Attendance reminder in Next step reports.** Attendance points run in reverse (0 is best). When a trainee has 0.5 points or more (near 1) or more than 1, the Next step report adds an *Attendance and reliability* section that reminds them to be reliable, whichever targets are ticked, and the form says so before you generate.

**Nesting-only Spot Check tab.** A trainee's Performance → Spot Check lists nesting spot checks only (average, latest score, table, export and Claude's read). Weekly-quiz spot checks show under Performance → Quiz.

**Spot Check tab actions.** In a trainee's Performance → Spot Check: **Analyze performance** (Claude reads the nesting spot checks and names themes, repeated mistakes and a coaching focus); per row **Check reply** (reads the Slack DM), **Mark acknowledged** (by hand, with Undo) and **Ping** (Slack reminder to reply, counted and dated); **Check all replies** and **Ping N waiting** for every check still unanswered; and **Edit** on every row.

**Spot check goal in the projection.** Set Team Goals has a fifth goal, **Spot check** (average nesting spot check score, at or above). Once a cohort has it set, the pass/fail projection counts each trainee's nesting spot check average like the other goals (skipped while they have no spot checks). Weekly-quiz spot checks are not included.

**New spot check button in the header.** In Metrics and Coaching → Spot Check, **New spot check** now sits right beside the *Spot Check* title (it turns into Cancel while the form is open). Copy and Check replies stay in the row below.

**Spot check message.** The Slack message sent to the trainee now says they can spend 10 minutes of non-ticket time to review the ticket and send their feedback, before asking for their acknowledgement and action plan.

**Overbreak notes log themselves.** Whenever Break & Lunch replies are read (automatic or Check Break Replies), a trainee more than 2 minutes over their break or lunch gets a dated entry in their attendance notes (the Total Points note), for example *Overbreak (2026-10-21): 45 of 30 min allowed, 15 min over.* There is one entry per trainee, break/lunch and message; a later read only updates its minutes (a trainee still out grows until they reply "back"). A note you delete is not added back.

**Inactive trainees last in Spot Check.** The Spot Check lists (By trainee, Entire cohort, and the New spot check trainee picker) put inactive, resigned and terminated trainees at the bottom.

**Inactive flag in Spot Check.** Inactive, resigned and terminated trainees show in a lighter text colour with an *(Inactive)* flag in the By-trainee list, the Entire-cohort table and the New spot check picker.

**Overbreak message tone.** The Message Overbreaks DM is now direct and firm: it states the minutes over and the daily allowance, says going over is not acceptable, and asks the trainee to reply with an explanation of what happened that same day.

**Send analysis as coaching.** In a trainee's Performance → QA, Speed and Spot Check, **Send as coaching…** has Claude turn the analysis on screen (the selected QA week's talking points, the selected Speed week against the goal, or the nesting spot checks and their analysis) into a Slack message. You edit it and press Send; it goes by direct message and always ends with "You have 15 minutes to review this and reply with your acknowledgement and action plan". Each send is kept under *Coaching sent to …* in that tab, where you can **Check reply**, **Mark acknowledged** (with Undo) and **Ping** if there is no reply. QA needs the week to be analyzed first.

**HR Docs app.** A new dock app for formal documents: **Notice to Explain**, **Notice of Decision**, **Deliberation Document** and a blank document. Pick a name from the roster, fill in the fields, and the document is written for you; edit it directly (editing by hand stops the fields from rewriting it, **Rebuild from fields** starts over). **Polish wording with Claude** rewrites a narrative box formally without adding facts. Save drafts, **Mark as issued**, **Start Notice of Decision / Deliberation from this** to carry a case forward, **Copy**, or **Export to Google Docs** (creates a Google Doc in your Drive and links to it). Documents are saved in the Trainer's own workspace (`hr_docs`), not shown to Viewers or the Training Manager. The templates are general drafts: have HR or legal review them. Source: `hrdocs/`.

**Root cause and record in HR Docs.** Notices to Explain, Notices of Decision and Deliberation Documents have a **Root cause** list (attendance, break and lunch overage, QA, Speed, Quiz, spot checks, conduct, other) and a **Record and standing** box. **Gather from dashboard data** pulls that name's record from across the dashboard: standing against the class goals, attendance points, days not on time and attendance notes, break and lunch overage notes, QA by week, Speed by week, quiz scores, nesting spot checks (with whether they were acknowledged), notes and coaching sent. Claude writes a short factual summary from it, starting with the ticked causes and saying "no record on file" where there is none; the raw data it used sits under *Data it was written from* so you can check the numbers. The summary goes into the document as *Your record on file…* and an *Area of concern* line, carries over when you start the next document, and stays editable.

**Notice of Decision paths.** The Notice of Decision now has two paths in **Decision**: *Final warning with goals* (a list of specific goals, a deadline, a progress review date, optional support, and a line that missing them may lead to removal; **Fill from class goals and standing** starts the list from the class QA, Speed, Attendance and Spot check goals with where the person stands now) and *Removal from training* (effective date and optional next steps). The form shows only the fields for the chosen path. A Deliberation Document recommending termination starts a Notice of Decision on the removal path.
