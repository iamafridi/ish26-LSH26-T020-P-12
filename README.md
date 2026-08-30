# Personal Ledger Manager

**Team LSH26-T020 (El Drago) · Problem P12**

Record a monthly salary and what you spend against it. Photograph a receipt and
check every field before it is saved. See where the month is heading while there
is still time to change it. Plan savings pockets and price them against a stated
DPS return.

| | |
|---|---|
| Live application | `FILL: Vercel URL` |
| API | `FILL: Render URL` |
| Repository | `lsh26-t020-p12` |

---

## Running it locally

Requires Node 20+ and a MongoDB connection string.

```bash
npm install                      # installs both workspaces

cp backend/.env.example backend/.env          # fill MONGODB_URI, FIREBASE_PROJECT_ID
cp frontend/.env.example frontend/.env.local  # fill the Firebase web config

npm run dev                      # API on :4000, web on :3000
```

Verification of the calculation engine, which needs no configuration at all:

```bash
npm run verify --workspace backend        # engine over all 25 public cases
npm run verify:diff --workspace backend   # differential test vs the Python reference
```

## How the four required items are met

### 1. Salary, expenses, and receipts read from a photo

Salary is set per month at **Settings** — per month, not per profile, so a raise
in June does not silently restate April's dashboard. A month you have not set
inherits the most recent earlier one.

Expenses are added by hand at **Expenses**, or from a photograph at
**Receipts**. The photo path is three visible steps — choose, review, save:

- `POST /api/v1/receipts/scan` reads the image and returns the amount, date, shop
  and a suggested category. **It cannot write.** That endpoint has no access to
  the expense collection.
- Each field arrives with a confidence mark and the literal characters that were
  read, shown under the input so you can check the reading against the photo
  without zooming in.
- A field that could not be made out arrives **empty**, never guessed. A blank
  you fill in costs a moment; a confident wrong amount waved through is a
  corrupted ledger.
- Every field stays editable. The expense is written only by a separate
  `POST /api/v1/expenses` carrying what you confirmed.

The review-before-save gate the brief requires is therefore enforced by the shape
of the API, not by the client, so no change to the frontend can bypass it.

*Code:* `backend/src/modules/receipts/`, `backend/src/shared/ocr/`,
`frontend/src/app/(app)/receipts/page.tsx`

### 2. The monthly dashboard

Total spent against salary, the breakdown by category with each category's
share, the five largest single expenses, and every category's movement against
last month — including categories that appeared this month and categories that
vanished, which a naive join drops.

*Code:* `backend/src/core/ledger.ts`, `frontend/src/app/(app)/dashboard/page.tsx`

### 3. Forecast and written insights

Spending to date is divided by days elapsed to give a daily pace, and that pace
is applied to the days remaining. The division is kept exact and rounded once, at
the end, so the projection does not drift. The result is stated as money left or
money short at month end, and again after funding every pocket contribution.

Straight-line pace is the honest method here. The ledger carries no recurrence
flags, so a "detect the rent and exclude it" heuristic would be guessing at
structure the data does not assert, and a judge could not reproduce the result by
hand. The working is shown on the Insights page.

**Insights are generated from the computed figures, not written by a language
model.** Six generators each name a specific category and a specific amount, and
each carries an `evidence` object holding the exact values its sentence quotes,
so the figures shown beneath a sentence are the same data the sentence was built
from. A generator with nothing concrete to say returns nothing rather than
padding. Every one of the 25 public cases produces at least three.

*Code:* `backend/src/core/forecast.ts`, `backend/src/core/insights.ts`

### 4. Savings pockets and the DPS comparison

Each pocket has a name, the specific item, a target and a monthly contribution,
and shows **two completion dates**:

- the date the stated contribution implies, and
- the date the **forecast** can actually fund.

The brief asks for a completion date "based on the forecast". Target ÷
contribution ignores whether the money is there, so a pocket whose contribution
exceeds the projected surplus would otherwise show a confident date the ledger
cannot support. Where the surplus cannot cover every pocket it is shared in
proportion to what each asked for, rather than funding the first in the list and
starving the rest.

Alongside it, what a DPS at the stated rate returns over the same number of
months, with the full month-by-month schedule on the page behind "show the
working" — because a figure a judge cannot check is a figure a judge has to take
on trust. The rate is editable at Settings; required item 4 asks for a return "at
a rate you state", and a rate the user cannot see or change is not a stated rate.

*Code:* `backend/src/core/dps.ts`, `backend/src/core/pockets.ts`

## The decisions that mattered

**Money is never a floating-point number.** IEEE-754 cannot represent 0.01, and
the DPS rule compounds a freshly rounded interest figure every month — round once
at the end instead and the answer is different. Every amount is a `decimal.js`
Decimal inside the engine and a canonical two-place string at every boundary,
including in MongoDB, where a BSON double would corrupt the value in storage and
no care downstream could recover it. The client does no money arithmetic at all;
it renders strings the engine computed.

**One engine, verified twice.** `buildReport(case)` is the only place money is
computed. The live dashboard assembles your records into the same `LedgerCase`
shape the published dataset uses and runs that same function, so the figures on
screen come from code checked against the official cases rather than from a
second implementation in the API layer. It is verified two ways:

- `npm run verify` — parses all 25 public cases, asserts no NaN or Infinity, that
  every money field is canonical 2dp, and that each case yields ≥3 insights.
- `npm run verify:diff` — a differential test against an independent Python
  implementation written from the specification text alone, without reading the
  TypeScript. **All 25 cases agree on every independently specified field.**

Two implementations agreeing is evidence. One implementation agreeing with itself
is not.

**No Firebase service-account private key exists in this system.** Firebase ID
tokens are RS256 JWTs signed by Google against published certificates, so the API
verifies them with `jose` and holds no secret. Both issuer and audience are
checked — skipping the audience check would accept a valid Google-signed token
minted for a different Firebase project, and anyone can create one. This removes
the largest secret from the deployment entirely.

**Dates never touch `new Date`.** `new Date("2026-04-17")` parses as UTC midnight
but reads back in the viewer's timezone, so a user in another zone sees the 16th.
Every calendar date is parsed arithmetically. "Today" is resolved explicitly in
Asia/Dhaka, so an 11pm receipt is not filed under yesterday — or, once a month,
under the wrong month.

## Architecture

```
frontend/   Next.js 15, deployed to Vercel. Firebase Auth, and rendering.
backend/    Express 5, deployed to Render. The engine, MongoDB, receipt OCR.
  src/core/       the exact-decimal engine — the only place money is computed
  src/modules/    one folder per domain: auth, dashboard, expenses, salary,
                  pockets, receipts, settings, health
  src/shared/     auth, errors, middleware, validation, OCR port
  scripts/        the verification harness and the Python reference
```

The interface is documented in [DESIGN.md](DESIGN.md).

## API

All routes are under `/api/v1`. Everything except `/health` requires a Firebase
ID token as `Authorization: Bearer <token>`; the user id is always taken from the
verified token and never from the request, so no route can be pointed at another
user's data.

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Service, database and OCR status |
| GET | `/auth/me` | The identity derived from the token |
| GET | `/dashboard?month=YYYY-MM` | The full report — items 2, 3 and 4 |
| GET POST PATCH DELETE | `/expenses` | The ledger |
| GET PUT | `/salaries` | Salary per month |
| GET POST PATCH DELETE | `/savings-pockets` | Pockets |
| POST | `/receipts/scan` | Reads an image, returns a draft, writes nothing |
| GET PUT | `/settings` | The stated DPS rate |

## Known limitations

- **Receipt reading needs `ANTHROPIC_API_KEY`.** Without it the scan endpoint
  reports itself unavailable and the app falls back to manual entry — a reduced
  feature, not a broken page, and required item 1 is still met by hand.
- The forecast is straight-line, by choice. It does not model a known rent
  payment that has not happened yet. The reasoning is under required item 3.
- Editing an existing expense is delete-and-re-add in the interface; the
  `PATCH /expenses/:id` route exists and is tested but is not surfaced.
- Pocket progress (`saved_bdt`) is stored but not yet editable in the interface.
- Last-write-wins across devices. There is no conflict resolution.

## Team

See [EVENT.md](EVENT.md) for the team and problem declaration and the pre-event
material statement, and [LICENSES.md](LICENSES.md) for every third-party
dependency, font and service, including the AI-assistance disclosure the rules
require.
