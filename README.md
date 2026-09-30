# Trainer Desk

A macOS-style trainer dashboard: a dock of app tiles at the bottom, and each app opens in its own draggable, resizable window.

Apps: **Settings**, **My Class**, **Cohorts** (sample data in `app.js`) and **Coaching Compass** (`coaching-compass/`).

Open `index.html` in a browser to run it locally. Coaching Compass needs the Claude artifact runtime to save data, analyze audits and read Google Drive; outside an artifact it runs with nothing saved.

To publish as a Claude artifact, run `python3 build.py` and publish `dist/trainer-desk.html`.

To add an app, add an entry to `APPS` in `app.js`.

Every window has a breadcrumb bar under its title (Trainer Desk › App › …). An app reports its deeper levels with
`TrainerDesk.setCrumbs(appId, [{ label, go }], home)`; an open dialog adds its title as the last step, and clicking
an earlier step closes the dialog first. "Trainer Desk" shows the desktop.

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

`quiz/quiz.js`. Write a quiz by hand (multiple choice, true/false, short answer; points per question, a passing
score), send it to a cohort's active trainees as Slack DMs, then **Check replies**. Trainees answer by replying to the
DM, one answer per line ("1. B", "2. True", …), in the thread or the DM itself. Multiple choice and true/false are
checked automatically; short answers are checked by Claude against the answer key. Any answer can be marked correct or
wrong by hand, and answers can be typed in for someone who replied another way. Results show replies, average score,
how many passed, a by-question correct rate, and each trainee's score. Stored in `quizzes/{id}` and
`quizzes/{id}/runs/{runId}` (each send keeps the quiz as sent, so later edits don't change old scores).
