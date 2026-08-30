# ADR 0001 — Money representation and rounding

**Status:** Accepted · **Date:** 2026-08-30 · **Owner:** Architect

## Context

`data-p12-public.json` carries every amount as a fixed-2dp decimal string (`"2475.00"`,
`"50000.00"`). The DPS rule mandates interest "rounded half up to the paisa" each month,
with the rounded figure compounding into later months. Public cases run 41–61 expenses
over two months, and pocket schedules run 9–17 months.

## Decision

1. **No money value is ever a JS `number`.** `Decimal` (decimal.js) inside the engine,
   canonical 2dp strings at every boundary — API, database, JSON, props.
2. **One rounding function:** `toPaisa()` in `src/core/money.ts`, configured
   `ROUND_HALF_UP` at 40 significant digits.
3. **One formatter:** `fmt()`. Nothing calls `.toFixed()` on a money value directly.
4. **Round once, at the end.** Intermediates (`daily_burn`, the monthly DPS rate) stay
   exact; only the emitted figure is rounded.
5. **Persistence stores strings**, not floats and not integer paisa.

## Why not the alternatives

**`number` + `toFixed(2)`** — `0.1 + 0.2 = 0.30000000000000004`; `(1.005).toFixed(2)` is
`"1.00"` because 1.005 is really 1.00499…. Both wrong for a paisa-graded problem.

**Integer paisa (`bigint`)** — exact and fast, and a legitimate choice. Rejected because
the DPS rule divides by 12 and by 100, producing a genuine fraction that must be carried
exactly *before* rounding. Doing that in integers means implementing rational arithmetic
by hand, which is more code and more risk than a decimal library. Also every value would
need converting at both edges, and each conversion is a place to introduce a bug.

**Closed-form annuity formula for DPS** — mathematically elegant, wrong here. Per-month
half-up rounding that compounds is not expressible in closed form; the deposit-then-interest
ordering shifts the result by another month's interest.

## Consequences

- Slightly more verbose arithmetic (`a.plus(b)` rather than `a + b`). Accepted.
- decimal.js is a hard dependency of `src/core/`. It is the only one.
- Any reviewer finding `+`, `-`, `*` or `/` applied to a money value, a `parseFloat` on an
  amount, or a `.toFixed()` outside `money.ts`, should treat it as a defect without needing
  to prove a wrong output — the class of bug is the finding.
