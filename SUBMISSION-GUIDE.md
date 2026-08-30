# LofiStack Hackathon 2026 - Participant Submission Guide

Event: Sunday, 30 August 2026, 6:00 PM to 10:00 PM (Asia/Dhaka)

This guide controls repository creation and final submission. If another document says something different about submission, this guide controls and the organizers will publish a numbered correction.

## Before the event

1. The registered team leader submits the GitHub Information Form by 10:00 AM on 30 August.
2. Every registered member must use the GitHub username declared in that Form.
3. A team may create two private repositories before 6:00 PM. Temporary names such as `lsh26-t001-slot-a` and `lsh26-t001-slot-b` are allowed before problem selection.
4. A pre-created repository may contain only declared generic scaffolding, such as a framework starter, deployment configuration, a UI kit or an empty project structure. It must not contain a solution to a selected problem.

## At 6:00 PM

The organizers will publish the problem pack, Final Submission Form link and an event start code in the announcement channel.

Your team chooses two different problems and uses exactly one repository for each problem. Before submission, rename each repository using this lowercase pattern:

`lsh26-t###-p##`

Example: Team `LSH26-T001` solving `P04` uses `lsh26-t001-p04`.

The first event-work commit in each repository must add an `EVENT.md` file containing the team ID, selected problem ID, event start code and any material already present before 6:00 PM. Do not squash, delete or rewrite Git history after 6:00 PM until results are announced.

## What each repository must contain

- Complete source code for one selected problem.
- `README.md` with the team ID, problem ID, live URL, setup/run steps, requirement proof, major decisions and known limitations.
- `evaluation-manifest.json`, completed from the supplied template.
- `EVENT.md` with the event start code and pre-event-material declaration.
- `LICENSES.md` listing material frameworks, libraries, starters, templates, UI kits, fonts, icons and assets.
- A short problem-solving-method statement and each registered member's major contribution, recorded in the README and manifest.
- No password, API key, access token, private key or participant personal data.

Generic frameworks, libraries and public boilerplates are allowed when declared. A pre-existing application or codebase that substantially implements the selected problem's domain rules, calculations, data model, workflow or required behaviour is prohibited. Generic scaffolding receives no marks by itself.

AI coding assistants are allowed when disclosed in `evaluation-manifest.json`. The team remains responsible for understanding, testing and defending everything submitted.

## Before submitting

1. Make both repositories public.
2. Rename them to the final `lsh26-t###-p##` names.
3. Confirm that the two problem IDs are different.
4. Open each repository and live URL in a signed-out or private browser window.
5. Confirm that a new visitor can run the project using the README without a private key or paid account.
6. Copy the exact 40-character commit SHA that must be judged. Do not use a branch name or the word `latest`.
7. Confirm that the deployed application represents that submitted SHA.

An optional demo video may be supplied. It must be no longer than three minutes and briefly cover the team's problem-solving method and every member's major contribution. It supplements the submitted repositories; it does not replace a working application, README or source code.

Keep both repositories public and both live applications available until results are announced.

## The official submission

Only the registered team leader sends the Final Submission Form. One Form response covers both repositories.

The Google Form server receipt time is the only official submission time. Git commit times, Discord messages and screenshots of a local clock are not submission proof.

Teams may send a corrected Form response before the deadline. The latest response received before 10:00 PM that passes every validation check controls. A later invalid response does not erase an earlier valid response.

Only receipts before 10:00:00 PM are on time. A response received at or after 10:00 PM is late and is not judged, except through the published outage procedure.

The exact submitted commit SHAs are judged. Later commits do not change the judged versions.

## Early-submission marks

The early bonus is one score per team, not one score per repository. It uses the server receipt time of the controlling valid Form response.

The score is 1.25 marks for each complete 30-minute block remaining before 10:00 PM, capped at 10, after the universal 20-minute prayer allowance. It unlocks only when at least three of the four required items fully pass on both problems.

## If the Form is unavailable

Before 10:00 PM, the team leader must post `FORM OUTAGE - <TEAM ID>` in the announced submission-support channel. Do not use a direct message.

An admin will reply with the controlled fallback. The fallback must contain every normal Form field and will use the platform's server timestamp. A deployment failure, forgotten public setting, incorrect SHA or slow personal internet connection is not automatically a Form outage.

## Contribution information

There is no separate individual Form. The leader's Final Submission Form briefly lists the solving method and every registered member's major contribution. The same information must appear in the repositories' README/manifest. Internship candidates may later be invited to a short interview or code walkthrough; team score or commit count alone does not decide internship selection.

## Integrity review

Automated or AI checks may flag missing declarations, suspicious similarity or history problems. No team is disqualified automatically. Two human judges review the evidence, and the team is given an opportunity to explain before a serious integrity decision.
