# Trainer Desk

A macOS-style trainer dashboard: a dock of app tiles at the bottom, and each app opens in its own draggable, resizable window.

Apps: **Settings**, **My Class**, **Cohorts** (sample data in `app.js`) and **Coaching Compass** (`coaching-compass/`).

Open `index.html` in a browser to run it locally. Coaching Compass needs the Claude artifact runtime to save data, analyze audits and read Google Drive; outside an artifact it runs with nothing saved.

To publish as a Claude artifact, run `python3 build.py` and publish `dist/trainer-desk.html`.

To add an app, add an entry to `APPS` in `app.js`.

## Attendance

`attendance/attendance.js`, ported from the Trainer Dashboard (Alpha) Attendance tab. It uses the cohorts and
trainees from Settings → Roster. For each cohort: save its Slack channel ID, send a check-in (editable; an edited
message becomes that cohort's default), then Check Replies to grade who replied and when (Present within 5 min,
Late within 15). Grades land in the 20-day points grid on the check-in's training day, and the grid can also be
set by hand and exported to a Google Sheet. It grades itself 10 minutes after a send while the page stays open.

Needs the Slack connector (`slack_send_message`, `slack_read_channel`, `slack_read_thread`, `slack_search_users`).
Trainees are matched to Slack by their work email.
