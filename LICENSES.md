# LICENSES.md

Every framework, library, font, icon and asset used, as required by the
submission rules. Updated whenever a production dependency is introduced.

## Runtime dependencies — backend

| Package | Licence | Why it is here |
|---|---|---|
| express | MIT | HTTP server |
| mongoose | MIT | MongoDB ODM and schema validation |
| zod | MIT | Request and dataset schema parsing |
| decimal.js | MIT | Exact decimal arithmetic — the money engine |
| jose | MIT | RS256 verification of Firebase ID tokens against Google's public keys |
| helmet | MIT | Security response headers |
| cors | MIT | Cross-origin allowlist |
| express-rate-limit | MIT | Request throttling, and a tighter cap on receipt scans |
| multer | MIT | Multipart parsing for the receipt image upload |
| dotenv | BSD-2-Clause | Local environment loading |
| @anthropic-ai/sdk | MIT | Client for the vision model that reads receipt photographs |

## Runtime dependencies — frontend

| Package | Licence | Why it is here |
|---|---|---|
| next | MIT | React framework and router |
| react, react-dom | MIT | UI runtime |
| firebase | Apache-2.0 | Client-side authentication only |

## Development dependencies

| Package | Licence |
|---|---|
| typescript | Apache-2.0 |
| tsx | MIT |
| vitest | MIT |
| eslint, typescript-eslint | MIT |
| supertest | MIT |
| concurrently | MIT |

## Fonts

| Font | Licence | Source |
|---|---|---|
| Instrument Serif | SIL Open Font License 1.1 | Google Fonts |
| Instrument Sans | SIL Open Font License 1.1 | Google Fonts |
| JetBrains Mono | SIL Open Font License 1.1 | Google Fonts |

All three are served through `next/font`, self-hosted at build time. No font
files are committed to this repository.

## Icons and imagery

No icon library is used. The few glyphs in the interface are inline SVG paths
authored for this project. There is no stock photography, no illustration pack,
and no UI kit or template.

## External services at runtime

| Service | Used for | Data sent |
|---|---|---|
| Firebase Authentication (Google) | Email/password sign-in | Email address, password (handled entirely by Firebase; the password never reaches our API) |
| MongoDB Atlas | Ledger storage | The signed-in user's salary, expenses and savings pockets |
| Anthropic API (Claude vision) | Reading an uploaded receipt photograph | The image the user chose to upload, for the duration of one request. The image is held in memory and is never written to disk or to the database. |

## Datasets

`backend/src/data/p12-public.json` is the P12 public case dataset supplied in the
event participant pack. It is used for automated verification of the calculation
engine and is redistributed here only inside this submission.

## AI assistant declaration

The submission rules permit AI assistants when their use is disclosed, and
require that disclosure. Disclosed here in full:

An AI coding assistant was used as a pair-programming tool throughout this
project — for architecture discussion, implementing the calculation engine and
the interface, writing tests and documentation, and review. Every design
decision, every interpretation of the problem brief, and final acceptance of the
code was the team's. The work and its defects are ours.

Separately, and as a **product feature**, the running application calls a vision
model to read an uploaded receipt photograph. That model never performs
arithmetic: it returns candidate text fields which the user must review and
correct before anything is saved, and every figure in the application is computed
by `backend/src/core/`. This is described in the README and in
`backend/src/shared/ocr/`.

## Pre-existing scaffolding

Declared in [EVENT.md](EVENT.md).
