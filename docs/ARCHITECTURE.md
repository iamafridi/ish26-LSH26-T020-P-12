# P12 — Personal Ledger Manager · Architecture

**Team El Drago · ISH26 · Problem Set 1**

---

## 1. The decision that drives everything else

The dataset (`data-p12-public.json`, 25 public cases) expresses **every** amount as a
fixed-2dp decimal *string* — `"50000.00"`, not `50000`. And the DPS rule is specified
to the paisa:

> Each month: balance = balance + deposit, then interest = balance × rate / 12 / 100
> **rounded half up to the paisa** and added to the balance (interest joins the
> balance, so later months earn on it).

So this is a **deterministic, exactly-gradeable** problem, not a vibes problem. IEEE-754
doubles cannot represent `0.01`; a 17-month DPS schedule computed in `number` drifts by
paisa, and paisa are what is being checked.

**Therefore: no money value is ever a JavaScript `number`, anywhere.** Amounts are
`Decimal` (decimal.js) inside the engine and canonical 2dp strings at every boundary.
There is exactly one rounding function — `toPaisa()` in `src/core/money.ts` — and exactly
one place that formats — `fmt()`. See [ADR 0001](adr/0001-money-and-rounding.md).

## 2. Layering

Dependencies point inward only. `src/core/` imports nothing from Next.js, React, Prisma,
or `node:*` — which is what lets the same functions run in the browser, in a test, and in
the verification harness.

```
src/
  core/           PURE DOMAIN — no IO, no framework, no clock, no randomness
    money.ts        Decimal wrapper, toPaisa(), fmt(). The only rounding in the app.
    calendar.ts     Timezone-free date maths on "YYYY-MM-DD" strings.
    types.ts        Zod schemas + the report contract. THE interface both sides code to.
    ledger.ts       Req 2 — monthly totals, category breakdown, largest, month-over-month.
    forecast.ts     Req 3 — burn rate, projected total, projected end position.
    insights.ts     Req 3 — rule-based insights, each carrying machine-readable evidence.
    dps.ts          Req 4 — the DPS rule implemented literally, month by month.
    pockets.ts      Req 4 — completion date + like-for-like DPS comparison.
    report.ts       buildReport(case) -> LedgerReport. The single entry point.

  lib/
    ocr/            Req 1 — receipt reading. The ONLY place an LLM is called.
    validation/     Zod schemas for user input at the edges.

  server/
    services/       Orchestration: repositories in, core functions out.
    repositories/   Persistence. Money stored as canonical strings.

  app/              Next.js App Router — routes and server actions.
  components/       Presentation only. Never does arithmetic on money.

scripts/verify.ts   Runs the engine over all 25 official cases. The push gate.
```

**The rule that keeps this honest:** a component that needs a computed figure calls a core
function. It never adds two amounts itself. If you find arithmetic in `components/`, that
is a bug regardless of whether the number looks right.

## 3. Where the LLM is used — and where it is banned

| Task | Implementation | Why |
|---|---|---|
| Reading a receipt photo (Req 1) | Claude `claude-opus-5` vision, structured output | Genuinely hard perception; no deterministic alternative |
| Every number on the dashboard | Pure TypeScript in `src/core/` | Must be reproducible and gradeable |
| The written insights (Req 3) | Rule-based generators in `insights.ts` | A model asked to comment on a table will occasionally round, drop a digit, or invent a category. Every sentence we emit is built from computed figures and carries an `evidence` object holding the exact values it quotes. |

The brief asks for insights "from the actual numbers". Generating prose from the numbers is
correct; asking a model to *do* the numbers is how you lose points you cannot debug.

## 4. Requirement → code map

| # | Requirement | Where |
|---|---|---|
| 1 | Salary + expenses, receipt photo upload, OCR of amount/date/shop, **review-and-correct before saving** | `lib/ocr/`, `app/(dashboard)/expenses/`, `components/receipt-review/` |
| 2 | Total vs salary, category breakdown, largest expenses, change vs last month | `core/ledger.ts` → `compareMonths()` |
| 3 | Forecast + ≥3 specific insights | `core/forecast.ts`, `core/insights.ts` |
| 4 | Pockets with completion date + DPS return at a stated rate | `core/pockets.ts`, `core/dps.ts` |

Requirement 1's "show what was read so the user can check it, and let them correct any
field before saving" is a **hard gate**: the OCR result is never written straight to the
ledger. It lands in a review form, per-field, with the source image beside it and a
confidence signal per field.

## 5. Forecast method (stated, so a judge can reproduce it by hand)

```
days_elapsed        = day-of-month of `today`        (today counts as elapsed)
daily_burn          = spent_to_date / days_elapsed   (kept EXACT — never rounded here)
projected_remaining = round_half_up(daily_burn × days_remaining)
projected_total     = spent_to_date + projected_remaining
end_position        = salary − projected_total       (negative ⇒ shortfall)
```

Straight-line burn is a deliberate choice. The dataset gives two months and no recurrence
flags, so any "detect the rent and exclude it" heuristic would be inventing structure the
data does not assert, and would move the answer in ways a grader cannot reproduce. We
project what actually happened and show the working. `daily_burn` is rounded for *display*
only — the exact value drives the projection, so we round once, at the end, not twice.

## 6. DPS

Implemented as a literal month-by-month loop, not a closed-form annuity formula, because
three details in the stated rule break the textbook version:

1. The deposit lands **before** interest is computed, so month 1 already earns.
2. Interest is rounded to the paisa **every month**, and the rounded figure compounds.
3. Rounding is **half-up**, not banker's rounding.

The full schedule is retained and shown in the UI. The brief says "a DPS at a rate you
state" — we state the rate *and* show the ledger that produces the number.

## 7. Verification

`npm run verify` runs `buildReport()` over all 25 public cases and asserts:

- no case throws
- no `NaN` or `Infinity` anywhere in the output tree
- every `*_bdt` field matches `/^-?\d+\.\d{2}$/`
- every case yields ≥ 3 insights

Current status: **25/25 pass.**

This is a smoke gate, not a correctness proof. Correctness comes from the independent
reference implementation described in [CONTRACT.md](../CONTRACT.md) — a second
implementation of the same spec, written from the rule text rather than from this code,
whose numbers must match ours case-for-case. Two independent implementations agreeing on
25 cases is real evidence; one implementation agreeing with itself is not.
