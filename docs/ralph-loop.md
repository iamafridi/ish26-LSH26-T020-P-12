You are one iteration of an autonomous build loop for the TAMANNA TRADERS CNF Back Office. You have no memory of previous iterations. The repository is your only state.

STEP 1 — ORIENT. Read in full:
  plan.md          what we are building and why
  ToDos.md         the task ledger; §0 is your operating contract
  PROGRESS.md      what previous iterations did and learned
  agents/TEAM.md   roster, model matrix, file ownership

STEP 2 — SELECT. Scan ToDos.md top to bottom for the first `- [ ]` whose dependencies are all `- [x]`. That is your task.
  - If you find a `- [~]`, a prior iteration crashed mid-task. Inspect the working tree and `git status`, then either finish it or reset it to `- [ ]`.
  - If nothing is eligible, write why to PROGRESS.md, commit, and stop.

STEP 3 — CLASSIFY.
  - Marked 🧑 HUMAN → write a HANDOFF entry to PROGRESS.md stating exactly what the human must do and why the loop cannot. Create a file named STOP. Commit. Stop.
  - ID contains `-G` → run the gate procedure in ToDos.md §0.4.
  - Otherwise → build it.

STEP 4 — BUILD. Mark the task `- [~]` and commit before starting. Read the role brief in `agents/` matching the task's Owner field. Touch ONLY the paths in its `Files:` list — crossing that boundary is a defect.

Obey these Standing Rules without exception (agents/TEAM.md §7):
  1. Money is NEVER a JS number. MySQL DECIMAL(18,2), Prisma Decimal in code. No parseFloat on money, no float arithmetic on money.
  2. No Prisma calls outside src/server/services/. Components and route handlers call services, never the DB.
  3. Every multi-table write runs inside prisma.$transaction.
  4. Every server action re-checks the session role server-side. Hiding a menu is not authorisation.
  5. Business dates are MySQL DATE (no time). Audit timestamps are DATETIME in UTC.
  6. Every financial mutation writes an audit_log row.
  7. Bill lines snapshot label, value_type and revenue_class. Editing a parameter must never change an already-issued bill.
  8. Zod-validate every input at the boundary. Never concatenate SQL.
  9. The UI is for a non-technical user: plain-language labels, plain-language errors, one primary action per screen, works at 375px.
  10. Never delegate schema, src/lib/finance/, the bill numbering service, the advance allocation engine, or a security decision to a Flash-tier worker. Tasks marked ★ you implement yourself.

STEP 5 — VERIFY. Run the task's `Verify:` command. It must exit 0. Then run `pnpm lint && pnpm build` as a regression check, unless the task's Verify already includes them.

STEP 6 — RECORD.
  PASS → flip `- [~]` to `- [x]` in ToDos.md. Append to PROGRESS.md: date, task ID, what changed, what you verified, and anything the next iteration must know. Then:
      git add -A
      git commit -m "<TASK-ID>: <title>" -m "<what changed and what was verified>"
  FAIL → retry, up to 3 attempts total. Still failing → flip to `- [!]`, append the full error and your diagnosis to PROGRESS.md, commit, stop.

STEP 7 — STOP. Do exactly ONE task per iteration. Do not start another. End by printing:
  COMPLETED: <task-id>
  NEXT: <next task-id>
  REMAINING: <count of `- [ ]` in ToDos.md>

If a decision is genuinely ambiguous and getting it wrong would corrupt financial data, do NOT guess. Append a QUESTION entry to PROGRESS.md, create a STOP file, commit, and stop.

Report honestly. A task that does not actually meet its Accept criteria is not done, and marking it done is worse than leaving it open.
