# ADR 0003 — Bill Line Model

**Status:** Accepted
**Date:** 2026-08-15
**Phase:** 2 (P2-T001)
**Owner:** Architect

## Context

A bill is a set of lines, each derived from a **billing parameter** in the catalogue
(plan.md §M3). The business rule that protects historical records: *editing a parameter
must never alter a bill already issued* (plan.md §M3, R5, §9.3). The schema answers this
with `NOT NULL` snapshot columns on `bill_lines` — `label_snapshot`,
`value_type_snapshot`, `revenue_class_snapshot` (ADR 0001 §7). This ADR fixes how lines
are created, how each parameter value type computes its amount, how totals are derived,
and how drafts stay editable — precisely enough that a worker implements the billing
service (P2-T007) and the bill form (P2-T009) without judgement calls.

Schema facts (prisma/schema.prisma): `bill_lines` carries `parameter_id BigInt?`
(nullable reference, never a rendering dependency), `text_value String?`,
`amount Decimal(18,2)?`, `invoice_value Decimal(18,2)?`, `commission_pct Decimal(18,4)?`,
`is_deduction Boolean @default(false)`, `sort_order Int`. `bills` carries `subtotal`,
`deduction_total`, `net_payable` (all `Decimal(18,2)`, default `0`).

## Decisions

### 1. Snapshot rule — the only way a line gets its identity

When a line is **created** (from a template item, from a parameter picked in the form, or
re-created), the service copies three fields **at that moment** from the parameter:

```
label_snapshot         = parameter.label
value_type_snapshot    = parameter.value_type
revenue_class_snapshot = parameter.revenue_class
is_deduction           = parameter.is_deduction      // EXCEPT rule in §3.4
```

- After creation, **the snapshots are immutable for the life of the line** — no
  `updateLine` path ever rewrites them. Editing a draft line changes only the input
  values (`amount`, `invoice_value`, `commission_pct`, `text_value`, `sort_order`).
- Deleting, renaming, retyping or deactivating a parameter afterwards has **zero effect**
  on existing lines (the T007 Accept criterion).
- When the user picks a parameter or applies a template in the form, the form submits
  the parameter id and the service re-reads the parameter and re-snapshots (so a fresh
  choice picks up the current label). Never trust snapshot fields from the client.
- A line is fully self-sufficient: the print route and the register render purely from
  `bill_lines` + `bills`, never from `billing_parameters`.

### 2. Per-value-type line computation

`value_type_snapshot` drives the fields the line carries and how `amount` is produced.
All money values are `Decimal`/decimal-strings; **all arithmetic goes through
`src/lib/finance/money.ts`** (`toDecimal`, `add`, `sub`, `mul`, `percentOf`,
`roundMoney`) — never JS `number` arithmetic.

| snapshot `value_type` | Fields the line may carry | `amount` derivation |
|---|---|---|
| `AMOUNT` | `amount` (operator-entered) | as entered |
| `TEXT` | `text_value` only; `amount`, `invoice_value`, `commission_pct` stay NULL | `null` — a text line never contributes to totals |
| `COMMISSION` | `invoice_value` + `commission_pct` (operator-entered) | `roundMoney(percentOf(invoice_value, commission_pct))` — read-only, computed, never typed |
| `ADVANCE_ADJUSTMENT` | `amount` (operator-entered) | as entered; **forced `is_deduction = true`** (§3.4) |
| `PERCENT_OF_BASE` | — | **rejected at creation** — reserved (plan.md §M3); the service throws `BillLineValidationError` with the verbatim message in §6. The form does not offer it. |

- `roundMoney` is the single rounding rule (half-up, 2dp, money.ts). `percentOf(base,
  pct)` = `base × pct ÷ 100`, rounded once with `roundMoney` after the multiplication —
  never round the intermediate product twice.
- `invoice_value` and `commission_pct` default from the template/parameter when a
  default exists; otherwise the operator types them. A `COMMISSION` line whose
  `invoice_value` or `commission_pct` is missing/null is **invalid on issue** (§5) but
  legal in a draft.
- Non-negative amounts: `AMOUNT` and `ADVANCE_ADJUSTMENT` inputs are required to be
  `>= 0` (Zod: `z.string().refine(...)`, min inclusive 0). Negatives are rejected — the
  direction of money is `is_deduction` (§3), never the sign of the amount.

  > **Amended (UAT round 2, 2026-08-17).** This rule originally required `> 0` and
  > rejected `0`. In practice a template carries every line the trade might need
  > (landing, sorting, scale, VGM …) and on a given consignment several of them
  > genuinely cost nothing. The owner's rule is that such a line still appears on the
  > bill showing `0.00` — a zero charge is information the client is entitled to see,
  > and the alternative was blocking the issue until the operator typed `0` into every
  > one of fifteen boxes. So `0` is now a valid amount, and at issue any `AMOUNT` /
  > `ADVANCE_ADJUSTMENT` line still blank is **written as `0.00`** rather than refused
  > (§5). A zero `ADVANCE_ADJUSTMENT` allocates nothing against the advance ledger.
  > `COMMISSION` is unchanged and remains the one value the operator must supply.

### 3. Direction of money — `is_deduction`

1. `is_deduction` is a **per-line** flag snapshotted from `parameter.is_deduction` at
   creation.
2. Deductions **subtract** from the total (`net_payable = subtotal − deduction_total`,
   plan.md §9.3). Amounts are stored **positive**; direction is expressed by the flag.
   Never store a negative amount on a line.
3. `revenue_class_snapshot` is **orthogonal** to `is_deduction`: an
   `ADJUSTMENT`-class line that is not a deduction is still possible (e.g. a discount
   recorded as a plain deduction), and a `COMMISSION`-class deduction is possible. The
   totals care only about `is_deduction`; the finance module (Phase 6) cares only about
   `revenue_class_snapshot`.
4. **Exception — `ADVANCE_ADJUSTMENT` forces `is_deduction = true`** regardless of the
   parameter's flag. A parameter with `value_type = ADVANCE_ADJUSTMENT` and
   `is_deduction = false` in the catalogue produces a deduction line anyway. The
   parameter's flag is ignored for this type; record the forced value at creation.

### 4. Totals — recomputed on every change, never stored stale

`bills.subtotal`, `bills.deduction_total`, `bills.net_payable` are **derived columns**
maintained by the service on every draft mutation (create/update lines, reorder, apply
template):

```
subtotal         = Σ amount  of lines where is_deduction = false   (amount IS NOT NULL)
deduction_total  = Σ amount  of lines where is_deduction = true    (amount IS NOT NULL)
net_payable      = sub(subtotal, deduction_total)
```

- Each sum is `roundMoney`-ed once after summing (sum of 2dp values, then round — never
  round per line, never per addend).
- `TEXT` lines (amount NULL) never appear in either sum.
- The service recomputes and writes all three columns **in the same transaction** as the
  line change; a draft's stored totals are always current. The bill form also renders a
  live totals bar from the same formula (client-side mirror of this section, using the
  shared money helpers).
- A draft with zero lines: `subtotal = 0.00`, `deduction_total = 0.00`,
  `net_payable = 0.00`.

### 5. Draft vs issue validation

- **Drafts may be incomplete** (missing amounts, missing text, zero lines, no template).
  Drafts are a working state; nothing is validated except structural integrity (lines
  belong to the bill).
- **Issue validates** (P2-T008, inside the issue transaction):
  0. **Zero-fill first**: every `AMOUNT` / `ADVANCE_ADJUSTMENT` line still holding a
     NULL amount is written as `0.00` (`zeroFillBlankAmounts`, in the issue
     transaction, before validation) so validation, totals, the advance allocation and
     the printed bill all agree. `TEXT` and `COMMISSION` are untouched.
  1. Every line must be well-formed per §2: `TEXT` lines need `text_value` non-blank;
     `AMOUNT` / `ADVANCE_ADJUSTMENT` need `amount` set — step 0 guarantees this, so the
     check is defence in depth; `COMMISSION` needs both `invoice_value` and
     `commission_pct` set, and is the only value the operator MUST supply (there is no
     safe default for a commission rate — a silent 0% is a quiet revenue loss).
     Violations fail with
     `"Line \"<label_snapshot>\" is missing its value. Fill it in before issuing."`
  2. At least one line must contribute to `subtotal` or `deduction_total` (a bill with
     only text lines cannot be issued): `"A bill needs at least one line with an amount
     before it can be issued."`
- **Snapshot immutability check at issue**: the service never re-derives from
  parameters at issue; the snapshot columns are the truth. Issuing freezes the line set
  (Phase 2: no line edits after issue; P2-T008 defines cancel/amend around this).

### 6. Ordering and replacement

- `sort_order` is a dense `0..n-1` sequence over the bill's lines, rewritten on every
  save (add/remove/reorder) in the same transaction.
- **Apply template** replaces **nothing** by default: it *appends* the template's lines
  (snapshotted, with defaults applied where present — parameter `default_value` /
  `default_text_value`, then the template item's override, then blank). The operator can
  then add/remove/reorder freely — *the template is a starting point, never a cage*
  (plan.md §M4). A UI "apply template" over an already-populated bill first asks
  (confirmation dialog) whether to append or replace; the service exposes
  `applyTemplate(billId, templateId, { replace: boolean })`.
- `TEXT` default comes from `default_text_value` (parameter) →
  `default_text_value_override` (template item). Numeric types come from `default_value`
  → `default_value_override` (P1-T009 already stores overrides in the type-correct
  column). Missing defaults → blank line the operator fills in.

### 7. Verbatim user-facing error messages

| Condition | Message |
|---|---|
| `PERCENT_OF_BASE` line | `"Bills cannot use this parameter type yet."` |
| missing line value at issue | `"Line \"<label>\" is missing its value. Fill it in before issuing."` |
| no amount-bearing line at issue | `"A bill needs at least one line with an amount before it can be issued."` |
| negative amount | `"Amount must be an amount of 0 or more with up to 2 decimal places."` |
| unknown parameter (line creation) | `"This billing parameter is no longer available."` |

Errors are typed (`BillLineValidationError`, `BillIssueValidationError`) so the action
layer maps them to `{ ok: false, error }` without string matching.

## Consequences

- P2-T007 (billing service: drafts and lines) implements §1, §2, §4, §6; P2-T009 (bill
  form) mirrors §2 and §4 in the client with the shared money helpers; P2-T008
  (issue/cancel/amend) implements §5.
- Phase 6 finance module sums `bill_lines.amount` by `revenue_class_snapshot` —
  safe only because snapshots are immutable and every line carries a snapshot.
- Phase 3 wires `ADVANCE_ADJUSTMENT` lines into the advance ledger at issue; the line
  model here is unchanged by that work.
