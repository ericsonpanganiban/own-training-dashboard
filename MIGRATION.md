# Moving Trainer Desk to another Claude organization

The code (this repo, branch `claude/upbeat-goodall-y6f0it`) moves with GitHub. The saved data does **not**: it lives in the
published artifact's own database. Nothing in this repo contains trainee data.

## 1. Export the data (old org)
Open the live artifact → menu bar **Data** → **Export all data**. It saves `trainer-desk-export-YYYY-MM-DD.json`.
Keep that file private: it holds trainee details, notes, attendance and quiz results.

## 2. Publish the app in the new org
Build with `python3 build.py` (writes `dist/trainer-desk.html`) and publish that file as a new artifact. The first publish
must declare the same capabilities the current artifact has (an update keeps them, a new artifact does not):

- **mcp**: Google Drive (`create_file`, `download_file_content`, `read_file_content`, `trash_file`) and Slack
  (`slack_read_channel`, `slack_read_thread`, `slack_search_users`, `slack_send_message`)
- **sample** (Claude), **assets**, **downloads**, **user**
- **db** with the access rules the old artifact reports: `(root)` read view / write admin; `courseware`, `added`,
  `assignments` read interact / write interact; `config` read view / write admin; `workspaces` read interact / write admin;
  `workspaces/{self}` write interact; `trainers` read interact / write admin; `courseware` and `added` as above.

Then share it with the same people (Share menu).

## 3. Import the data (new org)
Open the new artifact as its owner → **Data** → choose the export file → **Import them now**. Reload afterwards.
Documents with the same name are replaced; nothing is deleted.

## Not carried over
- **Training Managers and Viewers** (Settings): they point at accounts of the old organization. Add them again.
- **Other Trainers' workspaces** and each Trainer's published summary: each Trainer imports their own export.
- **Connector permissions**: Google Drive and Slack must be allowed again for the new artifact (a prompt appears on first use).
- **Slack and Drive content itself** (threads, QA and Speed sheets, Google Docs created by exports) stays where it is.
- **Scheduled tasks and Claude chats** of the old organization.

## What the export holds
Cohorts (with attendance and break/lunch logs), trainees (with notes, coaching sent, spot-check data), quizzes and their runs,
spot checks and analyses, QA and Speed weeks, HR Docs, reminders, Ops Updates history, Courseware tiles and settings.
