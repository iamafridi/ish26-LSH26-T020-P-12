# ADR 0002 — Bill Numbering

**Status:** Accepted
**Date:** 2026-08-15
**Phase:** 2 (P2-T001)
**Owner:** Architect

## Context

TAMANNA TRADERS numbers every bill `YYYY-NN`, restarting at `01` on each 1 January. A
collision or a reused number is a legal and audit exposure (plan.md §7, R4), and the
business runs 2–5 simultaneous users, so numbering must be race-safe even though the
numbers are allocated rarely. This ADR fixes the algorithm, the error strings, and the
Admin override — precisely enough that a worker implements it without judgement calls.

Schema facts (ADR 0001 §9, prisma/schema.prisma): `bills.bill_no` is `UNIQUE`,
`@@unique([bill_year, bill_seq])`; `bill_sequences` has `year Int @unique` and
`last_seq Int @default(0)`. Drafts have NULL `bill_no` / `bill_year` / `bill_seq`.

## Decisions

### 1. Format and year source

- The number is `YYYY-NN` — the year, a hyphen, then the sequence zero-padded to a
  **minimum of two digits**, growing naturally beyond two digits (`2026-100` is valid).
- The **year comes from `bill_date`**, never from the server clock at insert time
  (plan.md §7.1). `bill_date` is a MySQL `DATE`; take the year as
  `billDate.toISOString().slice(0, 4)` — the DATE is stored as `YYYY-MM-DD` with no time
  component, so the year is unambiguous regardless of process timezone. **Do not use
  `getFullYear()`** — its result depends on the runtime timezone.
- Numbers are assigned **at Issue, never at Draft** (plan.md §7.2, A4). A draft has
  `bill_no = null`, `bill_year = null`, `bill_seq = null`, and renders as
  "Draft — unnumbered".

### 2. Allocation algorithm — `ensureBillSequenceRow(billDate)` + `allocateBillNumber(billDate, tx)`

The allocation has TWO steps, both documented here because the naive single-step
approach fails on real MySQL under concurrency (P2-G1 proved it):

**Step 0 — `ensureBillSequenceRow(billDate)`, BEFORE the caller's transaction opens.**
The year's row is materialised with `INSERT IGNORE INTO bill_sequences (year,
last_seq) VALUES (?, 0)` on the **global client in autocommit**:

```ts
const year = Number(billDate.toISOString().slice(0, 4));
await prisma.$queryRaw(
  Prisma.sql`INSERT IGNORE INTO bill_sequences (year, last_seq) VALUES (${year}, 0)`,
);
```

Why autocommit-before-transaction and not an in-transaction insert?
1. **Gap locks are mutually compatible.** A bare `SELECT ... FOR UPDATE` on a
   missing row takes a gap lock, but two such transactions BOTH proceed to
   `INSERT` — and one deadlocks (error 1213 / Prisma P2034). `INSERT IGNORE`
   serialises first-inserts on the unique key instead: one inserts, the losers'
   inserts are suppressed.
2. **An in-transaction `INSERT IGNORE` duplicate check takes a shared lock that
   persists to commit.** Two transactions both holding that S lock, each then
   upgrading to X on `SELECT ... FOR UPDATE`, deadlock pairwise (1213) — this is
   the exact failure P2-G1 reproduced.
3. **Consistent-read snapshots.** If the row were created *after* the caller's
   transaction had already taken its snapshot (its first consistent read),
   Prisma's model `update` would fail with P2025 ("record not found") — the
   locking read sees the row, the model's internal plain read does not.

Autocommit has none of these problems: the duplicate-check S lock is released at
statement end, and the row is committed before the caller's transaction opens.
A leftover `last_seq = 0` row from a rolled-back caller is benign — the MAX
fallback in step 1 never allocates below it.

**Step 1 — `allocateBillNumber(billDate, tx)`, inside the caller's transaction.**

```ts
// 1. Lock the year's row (exists after step 0).
const rows = await tx.$queryRaw<{ last_seq: number }[]>(
  Prisma.sql`SELECT last_seq FROM bill_sequences WHERE year = ${year} FOR UPDATE`,
);
// 2. Imported data fallback: never allocate below MAX(bill_seq) of every
//    existing bill for the year (all statuses — numbers are never reused).
const maxRow = await tx.$queryRaw<{ m: bigint | number | string | null }[]>(
  Prisma.sql`SELECT MAX(bill_seq) AS m FROM bills WHERE bill_year = ${year}`,
);
const nextSeq = Math.max(Number(rows[0]!.last_seq), Number(maxRow[0]?.m ?? 0)) + 1;
await tx.billSequence.update({ where: { year }, data: { last_seq: nextSeq } });
return { billYear: year, billSeq: nextSeq, billNo: `${year}-${String(nextSeq).padStart(2, "0")}` };
```

Rules that follow from the algorithm:

- Two concurrent issues for the same year serialise on the row lock; the second reads
  the first's committed `last_seq` and takes `+1`. Under a **fresh year**, both perform
  the locking read, the first inserts the row, the second's gap-locked insert waits and
  then sees the row. Either way the numbers never collide, and the database's
  `UNIQUE (bill_year, bill_seq)` and `UNIQUE (bill_no)` remain the final arbiter
  (plan.md §7.4) — if the application locking is wrong, the DB rejects, it never
  duplicates.
- **Never read-then-write `bill_sequences` outside a `FOR UPDATE`** — a plain `findMany`
  peek is for the UI indicator only (see §3) and is never used to allocate.
- The sequence is **monotonic within a year**. Cancelled bills keep their numbers; the
  sequence does not go backwards (gaps are accepted — assign-on-issue prevents draft
  gaps, cancellation gaps are inherent and fine).
- `last_seq` is never capped or wrapped; `2026-99` → `2026-100` (`padStart(2, "0")`
  leaves three-digit sequences unaltered).

### 3. `peekNextBillNumber(billDate)` — the UI indicator

Non-locking read used by the bill form's "Next bill number" indicator. May be slightly
stale under concurrency — it is a hint, never an allocation.

```
year = billDate year (same derivation as §1)
lastSeq = SELECT last_seq FROM bill_sequences WHERE year = ?        // no FOR UPDATE
if lastSeq is null:
    lastSeq = SELECT MAX(bill_seq) FROM bills WHERE bill_year = ?   // any status
return `${year}-${String((lastSeq ?? 0) + 1).padStart(2, "0")}`
```

### 4. `overrideBillNumber(billId, newBillNo, reason, actor)` — Admin only

Preconditions enforced by the caller's guard (`authorizeAction("ADMIN")`): only Admin.
Also enforced here, defensively, because the service is the authority:

1. **Pattern** — `newBillNo` must match `^\d{4}-\d{2,}$`. On failure throw
   `BillNumberValidationError` with the verbatim message below.
2. **Parse** — `year = Number(newBillNo.slice(0, 4))`, `seq = Number(newBillNo.slice(5))`.
3. **Uniqueness** — before writing, `SELECT * FROM bills WHERE bill_no = ?` for a
   **different** bill. If found, throw `BillNumberConflictError` naming the conflicting
   bill (see verbatim messages). The `UNIQUE (bill_no)` constraint remains the final
   arbiter; a P2002 in the transaction re-raises the same error.
4. **Not-lower-than rule** — compute the current top sequence for the target year:
   `max(last_seq from bill_sequences WHERE year = target)`, falling back to
   `MAX(bill_seq) FROM bills WHERE bill_year = target` when no sequence row exists. If
   `seq <= top` **and** `confirmLower !== true`, throw `BillNumberLowerError`. When
   `confirmLower` is true the override proceeds. (The Admin confirming a lower number is
   the plan.md §7.5 "Admin confirms" path.)
5. **Write** — inside one `prisma.$transaction`:
   - `tx.bill.update({ where: { id }, data: { bill_no, bill_year: year, bill_seq: seq } })`
     (keeps `@@unique([bill_year, bill_seq])` consistent with the new number).
   - **Bump rule** — if `seq > last_seq` of the target year's sequence row, set
     `last_seq = seq` (`upsert` on `bill_sequences` — also creates the row when the
     target year has none), so the next auto-allocation never collides with the
     override. If `seq <= last_seq` the row is left untouched.
   - `writeAudit(tx, { entity: "bill", entityId: billId.toString(), action:
     "BILL_NUMBER_OVERRIDDEN", before: { bill_no: <old>, bill_year, bill_seq },
     after: { bill_no, bill_year, bill_seq }, userId, ip })` — `reason` is carried in
     the audit JSON's `after.reason`.
   - Catch P2002 and translate to `BillNumberConflictError`.

A bill in **any** status can have its number overridden (including DRAFT — an Admin may
number a draft early; nothing else about the bill changes, status remains DRAFT).

### 5. Verbatim user-facing error messages

These strings are what the user reads; every call site must surface them unchanged
(plain language, never a stack trace):

| Condition | Message |
|---|---|
| pattern mismatch | `"Bill numbers look like 2026-01. Check the year and sequence."` |
| already in use (override) | `"Bill number 2026-07 is already used by another bill."` |
| lower without confirmation | `"This number is lower than bills already issued for 2026. Confirm the override to proceed."` |
| missing reason | `"A reason is required to change a bill number."` |

Errors are typed (`BillNumberError` base with the subclasses above) so the action layer
can map them to `{ ok: false, error }` without string matching.

### 6. Testing contract (P2-T006 unit tests)

Mock-level unit tests must cover: first allocation creates the row with `01`; rollover
year → `01`; `2026-99` → `2026-100`; sequence monotonicity across calls; fresh-year gap
lock + `MAX(bill_seq)` fallback path; override pattern/conflict/lower/bump/audit;
`peekNextBillNumber` fallback. **Real concurrency (two parallel issues, one number each)
is a P2-G1 test-engineer deliverable** against the real MySQL test database — do not
attempt to prove concurrency with mocks here.

## Consequences

- `billing.service.ts` (P2-T007/T008) calls `allocateBillNumber(billDate, tx)` inside
  its issue transaction before creating the bill row, and `overrideBillNumber` is
  exposed for the override UI (P2-T011).
- The `bill_sequences` row and the `bills` table can never disagree on the next number:
  every allocation path is serialised on the same row.
- Numbers never repeat within a year; across years the year prefix makes them globally
  unique.
