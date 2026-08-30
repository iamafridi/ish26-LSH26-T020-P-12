# P12 — Personal Ledger Manager

**Team El Drago · ISH26 · Problem Set 1**

A personal expense ledger that reads your receipts, tells you where the month is heading,
and shows what your savings goals would earn in a DPS.

```bash
npm install
cp .env.example .env.local        # add ANTHROPIC_API_KEY for receipt scanning
npm run dev                       # http://localhost:3000
npm run verify                    # run the engine over all 25 official cases
```

## The four required items

| # | Requirement | Where it lives |
|---|---|---|
| 1 | Salary + expenses, **receipt photo → amount / date / shop, shown for review and correction before saving** | `src/lib/ocr/`, `src/components/receipt-capture.tsx` |
| 2 | Total vs salary, category breakdown, largest expenses, change vs last month | `src/core/ledger.ts` |
| 3 | Forecast + ≥3 insights naming specific categories and amounts | `src/core/forecast.ts`, `src/core/insights.ts` |
| 4 | Savings pockets with completion date and DPS return at a stated rate | `src/core/pockets.ts`, `src/core/dps.ts` |

## The thing worth knowing

The dataset expresses every amount as a fixed-2dp decimal **string** (`"50000.00"`), and the
DPS rule specifies interest *"rounded half up to the paisa"* compounding monthly. This is an
exactly-gradeable problem. JavaScript's `number` cannot represent `0.01`, so a 17-month DPS
schedule computed in floats drifts by paisa — and paisa are what is being checked.

**So no money value is ever a `number` anywhere in this app.** Amounts are `Decimal` inside
the engine and canonical 2dp strings at every boundary, with exactly one rounding function
and exactly one formatter. Full reasoning in [docs/adr/0001-money-and-rounding.md](docs/adr/0001-money-and-rounding.md).

`src/core/` is pure — no IO, no framework, no clock, no randomness. That is what lets the
same functions run in the browser, in a test, and in the verification harness.

## Where the model is used, and where it isn't

Claude reads receipt photographs. Claude does **not** do arithmetic.

Every number on the dashboard and every sentence in the insights list is computed in
TypeScript from the ledger, and each insight carries an `evidence` object holding the exact
figures it quotes. A model asked to comment on a table will occasionally round, drop a
digit, or invent a category — and you cannot debug that under a deadline. Reasoning in
[docs/ARCHITECTURE.md §3](docs/ARCHITECTURE.md).

Receipt scanning degrades honestly: with no API key set, the app tells you so and manual
entry still works.

## Verification

`npm run verify` runs `buildReport()` over all 25 official public cases and asserts no case
throws, no `NaN`/`Infinity` anywhere in the output, every `*_bdt` field matches
`/^-?\d+\.\d{2}$/`, and every case yields ≥3 insights. **25/25 pass.**

That is a smoke gate, not a proof. Correctness evidence comes from an independent reference
implementation written from the spec text without reading `src/core/`, cross-checked case
for case — see [CONTRACT.md](CONTRACT.md).

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — layering, the forecast method stated so a judge can reproduce it by hand, requirement→code map
- [docs/adr/0001-money-and-rounding.md](docs/adr/0001-money-and-rounding.md) — why not float, why not integer paisa, why not a closed-form annuity
- [CONTRACT.md](CONTRACT.md) — file ownership and the reviewer's brief
