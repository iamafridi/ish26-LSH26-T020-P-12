# EVENT.md

> **ACTION REQUIRED BEFORE SUBMISSION**
> One value below is a placeholder. Search this file for `FILL:` — the
> submission is not valid while any remain.

| Field | Value |
|---|---|
| Team ID | **LSH26-T020** |
| Team name | El Drago |
| Problem ID | **P12 — Personal Ledger Manager** |
| Event start code | `FILL: event start code from the arena` |
| Repository | **`lsh26-t020-p12`** |

## Repository name

The rules require each repository to be named `lsh26-t###-p##`, lowercase, team
number then problem number. This repository is `lsh26-t020-p12` — note **p12**,
the problem ID. "Problem Set 1" in earlier working repositories referred to this
being the team's first of two problems, not to the problem's number.

If this code is merged into a repository still carrying an older name, rename it
on GitHub before submitting. Renaming preserves history and redirects the old
URL, so it is safe at any point, but the submitted URL must be the new one.

## Pre-event material declaration

Everything present before 06:00 pm, declared as required.

| Item | When | What it is |
|---|---|---|
| `create-next-app` scaffold | 2026-08-30, before 06:00 pm | Unmodified output of `npx create-next-app@latest --typescript --app --src-dir`. Default layout, page, config files. Generic scaffolding only. |
| Express service skeleton | 2026-08-30, before 06:00 pm | An empty Express + TypeScript project layout — `app.ts`, `server.ts`, a health route, and tsconfig/eslint config. Generic scaffolding only, no domain logic. |
| `README.md` | 2026-08-30 | A single heading line. Replaced by event work. |

**No solution to P12, or to any other problem, existed before 06:00 pm.** No
domain logic, no calculation engine, no persistence layer, and no UI beyond the
scaffolds' placeholder pages. Git history is intact and unsquashed.

## Third-party material

Every framework, library, font and asset is listed in [LICENSES.md](LICENSES.md).

## AI assistant use

Declared as required by the rules, which permit AI assistance when it is
disclosed. An AI coding assistant was used as a pair-programming tool across
architecture, the calculation engine, the interface, tests and documentation.
Problem interpretation, technical decisions, review and acceptance were the
team's. The full statement is in [LICENSES.md](LICENSES.md).

The application also *calls* a vision model at runtime to read receipt
photographs — that is a product feature, described in the README, and separate
from the assistance declaration above.

## Secrets

No password, API key, access token, private key or personal data is committed.

- `.env` and `.env.*` are git-ignored; `.env.example` documents every variable
  with empty values.
- The API holds **no Firebase service-account private key at all.** ID tokens are
  verified against Google's published public certificates, so the deployment does
  not need the secret and cannot leak it. See
  `backend/src/shared/auth/verify-token.ts`.
- The Firebase *web* config values are public project identifiers by design —
  they ship in any client bundle and grant nothing on their own. Firebase
  security rules and server-side token verification are what protect the data.
