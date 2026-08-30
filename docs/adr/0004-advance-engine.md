# ADR 0004 — Advance Engine

**Status:** Accepted
**Date:** 2026-08-15
**Phase:** 3 (P3-T001)
**Owner:** Architect

## Context

TAMANNA TRADERS has lost real money because advance payments were untracked (plan.md §1).
The advance engine is the module that fixes this, so it is specified more rigorously than
anything else in the build (plan.md §8). It has exactly one job: when a bill is issued with
an `ADVANCE_ADJUSTMENT` line, take that money **out of the client's open advance balance** —
atomically, never more than exists, oldest money first — and put it back when the bill is
cancelled or amended.

Schema facts (prisma/schema.prisma, ADR 0001):

```
advances            id BigInt PK · advance_date DATE · client_id FK · amount DECIMAL(18,2)
                    · channel_id FK · reference String? · status AdvanceStatus (OPEN |
                    PARTIALLY_ADJUSTED | FULLY_ADJUSTED, default OPEN) · notes Text?
                    · @@index([client_id, status]) · @@index([advance_date])
advance_adjustments id BigInt PK · advance_id FK · bill_id FK · bill_line_id BigInt?
                    · amount DECIMAL(18,2) · adjusted_on DATETIME(3) default now()
                    · @@index([advance_id]) · @@index([bill_id])
```

The hand-written integrity migration adds `CHECK (advance_adjustments.amount > 0)` (P0-T005).
Prisma's MySQL `@@check` is unsupported, so the guard also lives in the service layer
(ADR 0001 §10). `advance_adjustments.amount > 0` is enforced **twice**: by the DB CHECK and
by the service. Both exist; neither is optional.

The **invariant** this engine exists to protect (plan.md §8.4):

```
For every client:  Σ advances.amount − Σ advance_adjustments.amount = advance_outstanding ≥ 0
```

It holds at every commit. It is asserted in the unit suite (P3-T003), the integrity job
(P3-T010) and the test gate (P3-G1). If it ever goes negative, that is a blocking defect.

## 1. Status model

`advances.status` is **derived, never client-supplied**. The service computes it from the
advance's own adjustment rows after every allocation or reversal:

| Σ adjustments on the advance | status |
|---|---|
| 0 | `OPEN` |
| > 0 and < amount | `PARTIALLY_ADJUSTED` |
| ≥ amount | `FULLY_ADJUSTED` |

Because the over-adjustment guard makes > amount impossible, `≥` and `=` are the same
thing. A client's advances carry their own statuses; `FULLY_ADJUSTED` advances are not
allocation candidates.

**FIFO candidate order** (the only order ever used): `ORDER BY advance_date ASC, id ASC`.
`id` breaks ties when two advances share a date. This is also `listOpenAdvances()`
ordering and the advance list default ordering — one order everywhere.

## 2. Service surface (`src/server/services/advance.service.ts`)

All money crosses boundaries as decimal strings; all arithmetic via
`src/lib/finance/money.ts` (`toDecimal`, `add`, `sub`, `mul`, `compare`). The module
exports exactly:

```ts
listAdvances(query: AdvanceListQuery): Promise<AdvanceListPage>
  // paged (≤200), filters: client_id, status, advance_date range, q over reference/notes
  // ordered advance_date ASC, id ASC — the FIFO order. Returns serialised rows
  // (BigInt→string, Date→YYYY-MM-DD, amount→2dp string) + adjusted_total per advance.

getAdvance(id: bigint): Promise<AdvanceDetail>
  // advance + its adjustment rows (advance_id, bill_id, bill_no via bill, amount, adjusted_on)

createAdvance(input: AdvanceCreateInput, actor: AdvanceActor): Promise<AdvanceDetail>
  // validate → status OPEN → one $transaction { tx.advance.create + writeAudit
  // "ADVANCE_CREATED" }. amount must be > 0 (plain-language error if not).

updateAdvance(id: bigint, input: AdvanceUpdateInput, actor): Promise<AdvanceDetail>
  // PATCH semantics. amount / advance_date / client_id / channel_id are accepted ONLY
  // while the advance has zero adjustment rows — otherwise refused with:
  //   "This advance has already been adjusted against bills. Only its notes and
  //   reference can be changed."
  // notes / reference are always editable. status is NEVER accepted (derived). One
  // $transaction + writeAudit "ADVANCE_UPDATED" before/after. No delete path.

getOutstandingBalance(clientId: bigint, asOf?: string /* YYYY-MM-DD */): Promise<string>
  // no asOf → current outstanding = Σ advances.amount − Σ advance_adjustments.amount
  //   for the client, aggregated in SQL ($queryRaw + Prisma.sql), NULL → "0.00"
  // asOf → advances with advance_date ≤ asOf MINUS adjustments with
  //   adjusted_on < (asOf + 1 day); same SQL aggregation.

listOpenAdvances(clientId: bigint): Promise<AdvanceRow[]>
  // where client_id AND status IN (OPEN, PARTIALLY_ADJUSTED), ORDER BY advance_date, id
```

`AdvanceActor` = the guarded action's `{ userId, ip }` (same shape as `MasterActor`).
Serialisation follows the master pattern (`masterRowSnapshot`, BigInt→string,
Decimal→string, Date→YYYY-MM-DD). No Prisma leaks out of this module.

## 3. `allocateAdjustment` — the allocation core (P3-T003)

```ts
allocateAdjustment(clientId, amount, billId, billLineId, tx: Prisma.TransactionClient)
```

Called **inside the caller's transaction** (issueBill, and amendBill's re-allocation).
It never opens its own `$transaction`. Every write goes through `tx`, so a later failure
in the caller rolls the allocation back with everything else — partial application is
structurally impossible.

### 3.1 Locking contract (deadlock-avoidance — do not reorder)

1. **Lock the candidate advances first, and before any other lock in the caller's
   transaction.** `SELECT id, advance_date, amount, status FROM advances WHERE client_id
   = ? AND status IN ('OPEN','PARTIALLY_ADJUSTED') ORDER BY advance_date ASC, id ASC FOR
   UPDATE` — always through `$queryRaw` with `Prisma.sql` binds.
2. **Re-read, never trust the pre-lock read.** After the lock returns, the transaction
   has a consistent view of the client's candidates; recompute the outstanding balance
   from the locked rows + the client's other (FULLY_ADJUSTED) advances.
3. **`bill_sequences` is locked only AFTER advance rows** (issueBill calls
   `allocateAdjustment` before `allocateBillNumber`). Two concurrent issues for the same
   client serialise on the advance lock; different clients never hold locks in
   conflicting order. Never reorder these without re-deriving the deadlock analysis.

### 3.2 Algorithm

```
allocateAdjustment(clientId, amount, billId, billLineId, tx):
  if amount ≤ 0 → AdvanceValidationError("Adjustment amounts must be more than 0.")
  # candidates locked FOR UPDATE, FIFO order (§3.1)
  candidates = tx.$queryRaw(lockQuery, clientId)          # OPEN + PARTIALLY_ADJUSTED
  # outstanding over the client's WHOLE advance ledger (candidates + fully adjusted):
  #   Σ advances.amount − Σ advance_adjustments.amount for the client
  # (see §2 getOutstandingBalance SQL shape; run against tx)
  outstanding = aggregate(tx, clientId)
  if compare(amount, outstanding) > 0 → AdvanceOverAdjustmentError(amount, outstanding)

  remaining = amount
  rows: AdvanceAdjustment[] = []
  for advance in candidates:                             # FIFO order guaranteed by lock
    if remaining ≤ 0: break
    avail = advance.amount − adjustments_already_on(advance)   # from the locked snapshot
    if avail ≤ 0: continue
    take = min(avail, remaining)
    rows.append({ advance_id: advance.id, bill_id: billId,
                  bill_line_id: billLineId, amount: take })
    remaining = remaining − take
  # `remaining > 0` cannot happen: candidates' total capacity == outstanding ≥ amount.
  # Defensive: if it does (data corruption), throw AdvanceEngineError("Advance ledger
  # inconsistent — contact the administrator.") — roll back, do not write partial rows.

  for row in rows:
    tx.advanceAdjustment.create({ data: row })
  for advance in candidates:                             # status recompute (§1)
    newStatus = deriveStatus(advance, rows)
    if newStatus ≠ advance.status:
      tx.advance.update({ where: { id: advance.id }, data: { status: newStatus,
                          updated_by: callerActorId } })
  tx.auditLog.create({ entity: "advance_adjustment", entity_id: billId.toString(),
    action: "ADVANCE_ALLOCATED", before: null,
    after: { bill_id, bill_line_id, rows: rows.map(r => ({ advance_id, amount })) },
    user_id: callerActorId, ip: callerIp })
  return rows
```

- `deriveStatus(advance, newRows)` = recompute Σ adjustments for the advance from the
  locked snapshot **plus** the rows just written for it, then §1.
- One audit row per bill allocation batch (entity `advance_adjustment`, action
  `ADVANCE_ALLOCATED`) — the individual advance status flips ride on the same bill's
  issue audit; do not write one audit row per micro-write.
- A second `allocateAdjustment` call inside the same transaction (a bill with two
  ADVANCE_ADJUSTMENT lines) re-executes the whole algorithm; the FOR UPDATE lock is
  already held, the re-read sees the first call's writes, and FIFO continues correctly.

### 3.3 Verbatim error strings

```
AdvanceOverAdjustmentError → "Adjustment of ৳X exceeds TAMANNA's unadjusted advance for
this client (৳Y). Reduce the adjustment or record a new advance first."
```
X and Y are `formatBDT()`-formatted amounts, `৳` prefix included (money.ts). This exact
message is asserted by the unit suite. Do not "improve" it.

### 3.4 Edge cases — every branch has a defined outcome

| # | Case | Outcome |
|---|------|---------|
| E1 | Exact match: advance ৳50,000, adjust ৳50,000 | One row, advance → `FULLY_ADJUSTED`. |
| E2 | Adjustment spans three advances (e.g. 10k+20k+5k from 8k+25k+12k) | Three rows, one per advance; each status updated; total = requested amount. |
| E3 | Two concurrent issues adjusting the SAME advance | Second blocks on FOR UPDATE; runs after first commits; sees the new outstanding; over-adjustment refused if insufficient. Never a negative balance. |
| E4 | Client has no advances / all fully adjusted | outstanding = 0 → over-adjustment error with ৳0.00. |
| E5 | amount = 0 or negative | Refused at the top of the algorithm; DB CHECK is the backstop. |
| E6 | Multiple ADVANCE_ADJUSTMENT lines on one bill | Each line allocates in sort_order; the second line's guard sees the first line's consumption (E3 semantics within the tx). Any line failing → whole issue rolls back. |
| E7 | Zero-capacity advance (already fully adjusted but still listed OPEN due to corruption) | `avail ≤ 0` → skipped; if total capacity still covers the amount the allocation proceeds over the healthy advances. |
| E8 | Two advances, same advance_date | `id ASC` breaks the tie — deterministic FIFO. |
| E9 | Allocate, then the caller fails (e.g. numbering collision) | Whole transaction rolls back; no rows, no status changes, no audit. |

## 4. Reversal — `reverseAdjustmentsForBill(billId, tx)` (P3-T004)

```ts
reverseAdjustmentsForBill(billId: bigint, tx: Prisma.TransactionClient): Promise<void>
```

Called inside the caller's transaction, never standalone. Deletes every
`advance_adjustments` row for the bill and restores each affected advance's status from
its **remaining** rows (adjustments from OTHER bills stay). An audit row is written:

```
entity "advance_adjustment", entity_id billId, action "ADVANCE_REVERSED",
before: { rows: [{advance_id, amount}] }, after: null
```

**Idempotency:** a bill with zero adjustment rows reverses to a no-op (zero deletes,
zero status changes, zero audit rows). A double cancellation is impossible (cancelBill
refuses CANCELLED bills), but amend flows that trigger reversal twice across transactions
are safe by construction.

Algorithm:

```
rows = tx.advanceAdjustment.findMany({ where: { bill_id: billId } })
if rows.length == 0: return
affected = distinct advance_ids from rows, locked FOR UPDATE (same ordering rule §3.1)
tx.advanceAdjustment.deleteMany({ where: { bill_id: billId } })
for advanceId in affected:
  remaining = tx.advanceAdjustment.aggregate({ _sum: { amount } where advance_id })
  newStatus = derive from remaining (0 → OPEN, else <amount → PARTIALLY_ADJUSTED, ≥amount → FULLY_ADJUSTED)
  if changed: tx.advance.update(status + updated_by)
tx.auditLog.create(ADVANCE_REVERSED row as above)
```

**Why hard-delete the adjustment rows:** an `advance_adjustments` row is an allocation
record, not a financial document — the bill it belonged to is now cancelled, and keeping
dead rows would corrupt `Σ adjustments` (the invariant) and every report. The audit row
preserves history. This is the one deliberate delete in the engine and it is
transaction-scoped with the cancel.

### 4.1 Wiring into `billing.service.ts`

- **`cancelBill`** (P2-T008 slot, line ~503): the current block
  ("This bill has money already settled or adjusted against it…") is REPLACED by
  `reverseAdjustmentsForBill(bill.id, tx)` — called after the status flip (or before it;
  both are inside the same transaction, so ordering does not change the outcome — prefer
  immediately after the flip, before the audit write). The block for
  `receipt_allocations > 0` STAYS (receipt reversal is a separate future concern —
  P3-T006 spec: receipts may not be allocated to a bill that is being cancelled, and the
  service refuses allocating to CANCELLED bills).
- **`amendBill`** (P2-T008 slot, line ~503): before the line save, compare the bill's
  current ADVANCE_ADJUSTMENT lines against the incoming line set (by `id` → `amount`,
  ignoring order). If the set of adjustment amounts changed, or an adjustment line was
  added or removed:
  1. `reverseAdjustmentsForBill(bill.id, tx)`
  2. save lines (`syncLines`) as today
  3. for each saved ADVANCE_ADJUSTMENT line (sort_order), `allocateAdjustment(clientId,
     line.amount, bill.id, line.id, tx)`
  4. compute totals — the new deductions are already in the lines; `net_payable` falls
     out of `computeTotals` unchanged.
  If the adjustment lines are unchanged, leave the rows alone — no reversal, no
  re-allocation.
- **`issueBill`** (P3-T005): after `validateForIssue` and `computeTotals`, before
  `allocateBillNumber` (lock order §3.1): for each ADVANCE_ADJUSTMENT line in sort_order,
  `allocateAdjustment(bill.client_id, line.amount, bill.id, line.id, tx)`. The lines'
  amounts are already deducted from `net_payable` by the existing `is_deduction` rule —
  the engine adds no totals math.

## 5. The as-of ledger (P3-T008 contract)

The Advance Ledger report (`/advances/ledger`) reconciles to the invariant:

```
as_of_balance(client) = Σ advances.amount WHERE advance_date ≤ asOf
                      − Σ advance_adjustments.amount WHERE adjusted_on < asOf + 1 day
```

- Advance rows and adjustment rows (joined to `bills` for `bill_no`) are fetched in SQL
  and merged in application order: advances are positive entries dated `advance_date`,
  adjustments are negative entries dated by `adjusted_on` (date part). Running balance is
  cumulative in that merged order.
- "Age in days" = `asOf − advance_date` for advances with a positive running balance.
- Per-client and consolidated views use the same rows, grouped in SQL.
- The report's closing balance per client MUST equal `getOutstandingBalance(clientId,
  asOf)` — asserted in tests.

## 6. Receipt remainder parking (P3-T006 interface, engine-relevant)

A receipt with unallocated remainder and "park as advance" checked creates ONE `advances`
row (status OPEN, amount = remainder, channel = the receipt's channel, reference
"Receipt {receipt_no} remainder", notes from the receipt) in the **same transaction** as
the receipt and its allocations. This is the only other creation path for advances; it
must satisfy the same invariants (amount > 0; the remainder is positive by construction
— Σ allocations ≤ receipt amount is enforced before parking).

## 7. Acceptance contract

- P3-T003: `pnpm test tests/unit/advance-engine.test.ts` — unit suite over
  `allocateAdjustment` with a mocked/real tx; E1, E2, E3 (serialised concurrency on one
  advance), E4, E5, E7, E9.
- P3-T004: cancel restores the exact prior balance; amend recomputes correctly; double
  reversal is a no-op. `pnpm test tests/unit/advance-engine.test.ts`.
- P3-T010: the integrity job asserts §8.4, `net_payable = subtotal − deduction_total`,
  `Σ receipt_allocations ≤ receipt.amount`, and no adjustment rows pointing at a
  CANCELLED bill (reversal must have removed them).
- P3-G1 critical test 4: ৳50,000 advance → adjust ৳20,000 + ৳15,000 → balance ৳15,000 →
  cancel the second bill → balance ৳35,000 → a ৳40,000 adjustment is blocked with the
  verbatim message. Invariant never negative.

## 8. As-of semantics — known edge case (P3-T002 escalation, 2026-08-15)

`getOutstandingBalance(clientId, asOf)` and the P3-T008 ledger share ONE formula:
advances restricted by `advance_date <= asOf`, adjustments restricted ONLY by
`adjusted_on < asOf + 1 day` (no join-back onto advance date). Consequence: if an
operator post-dates an advance (`advance_date` after an adjustment against it already
exists — possible because `advance_date` is free-form data entry), the as-of snapshot in
the gap shows a negative balance. That is the honest chronological presentation and is
NOT an invariant breach: the §8.4 invariant is a full-range statement (Σ over all time
≥ 0 per client) and self-corrects once asOf passes the advance date. Tests must not
assert as-of non-negativity; the integrity job (P3-T010) asserts the full-range
invariant only.
