# CONTRACT — who owns what, and how Codex reviews it

**Team El Drago · ISH26 · P12 Personal Ledger Manager**

Two agents work this repo. Claude builds; **Codex reviews and independently verifies.**
This file is the single source of truth for both. If something you need is not defined
here, stop and ask — do not invent it.

---

## 1. File ownership

| Path | Owner | Codex may |
|---|---|---|
| `src/core/**` | Claude (Architect) | **Review + write tests.** Do not edit the implementation — report findings instead. |
| `src/lib/ocr/**` | Claude | Review + test |
| `src/server/**`, `src/app/**`, `src/components/**` | Claude | Review + test |
| `docs/**`, `CONTRACT.md`, `data-p12-public.json` | Claude | Read only |
| `tests/**` | **Codex** | Own it outright |
| `scripts/reference/**` | **Codex** | Own it outright — the independent implementation |

Codex never edits `src/`. A defect found in `src/` is reported, not patched — that keeps
the reviewer independent of the thing being reviewed.

## 2. The contract both sides code to

`src/core/types.ts` defines `LedgerCase` (input) and `LedgerReport` (output).
`buildReport(case) → LedgerReport` in `src/core/report.ts` is the only entry point.
Money crosses every boundary as a canonical 2dp string matching `/^-?\d+\.\d{2}$/`.

## 3. Codex's primary job: an independent reference implementation

The highest-value thing Codex can produce is **a second implementation of the spec that
never looks at `src/core/`.** Written from the rule text in this file and the dataset's own
`dps_rule` / `format_note`, in Python with `decimal.Decimal`, living in
`scripts/reference/`. It emits the same figures per case; a differential test compares them.

Two independent implementations agreeing across 25 cases is real evidence of correctness.
One implementation agreeing with itself is not — which is all `npm run verify` proves today.

**The spec, restated so the reference can be written without reading our code:**

**DPS** — annual rate as stated. Starting balance 0. For each of N months:
`balance += deposit`, then `interest = round_half_up(balance × rate / 12 / 100, 2)`, then
`balance += interest`. Interest compounds. Deposit lands *before* interest.

**Forecast** — `days_elapsed` = day-of-month of `today` (today counts as elapsed);
`days_in_month` = calendar length of `months.this`; `daily_burn = spent_to_date / days_elapsed`
kept exact; `projected_remaining = round_half_up(daily_burn × days_remaining, 2)`;
`projected_total = spent_to_date + projected_remaining`;
`end_position = salary − projected_total`. `spent_to_date` counts only expenses dated
within `months.this`.

**Pockets** — `months_to_target = ceil(target / monthly_contribution)` in exact decimal;
completion month = `months.this` plus `(months_to_target − 1)`; completion date = last
calendar day of that month; the DPS comparison runs the same contribution for the same
number of months.

**Category breakdown** — group by `category`, sort by total descending, ties alphabetical.
`share_percent` = `total / month_total × 100` to 1dp.

## 4. Rules of engagement

1. Branch `codex/<topic>`. Never commit to `main` or to `feat/*`.
2. `git fetch origin && git rebase origin/main` before starting.
3. Never `git push --force`, never amend shared history, never `git reset --hard` or
   `git clean` on files you do not own.
4. No new runtime dependency without flagging it explicitly.
5. Match existing conventions — naming, formatting, error handling, comment density.

## 5. What a finding looks like

Report as: **file:line · what is wrong · a concrete input that produces a wrong output.**
A finding without a failing input is a suggestion, not a defect — label it as such.

Highest-value classes to hunt, in order:

1. **Money handled as a float.** Any `+ - * /` on an amount, any `parseFloat`/`Number()` on
   an amount, any `.toFixed()` outside `src/core/money.ts`. This class is a defect on sight —
   you do not need to prove a wrong output.
2. **Double rounding.** An intermediate rounded before a later multiply.
3. **Rounding mode.** Anything that is not half-up on a money value.
4. **Off-by-one in months or days.** `months_to_target` on exact multiples;
   `days_elapsed` when `today` is the 1st or the last day of the month; year rollover in
   `addMonths`; February in a leap year.
5. **Timezone leakage.** Any `new Date(...)` applied to a business date.
6. **Requirement gaps** — the four required items in `docs/ARCHITECTURE.md` §4, especially
   Req 1's "let them correct any field before saving", which must be a hard gate.
