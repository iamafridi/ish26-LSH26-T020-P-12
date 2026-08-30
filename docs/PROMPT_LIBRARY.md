# Prompt Library — CNF Back Office

Every prompt needed to drive the autonomous build. Copy them verbatim.

**Files referenced:** `plan.md` (what to build) · `ToDos.md` (task ledger + loop contract) · `PROGRESS.md` (journal across iterations) · `agents/` (role briefs).

---

## ⚡ START HERE — The First Prompt

### Where

Open an **Orca terminal** in `/Users/mehedi/dev/cnf-back-office` and start Claude Code:

```bash
cd /Users/mehedi/dev/cnf-back-office
claude --model opus
```

Then press `/model` and confirm **Opus 5, xhigh effort** (or launch with `claude --model claude-opus-5`).

**Harness:** Claude Code (interactive, inside an Orca terminal so it can dispatch Orca workers).
**Model:** `claude-opus-5`, effort `xhigh`.

**Why Claude Code interactive and not headless for the very first run:** Phase 0 creates the scaffold, the schema and the auth layer. You want to watch the first two or three tasks land before handing over to the unattended loop. Once `P0-T003` is checked, switch to §2 and let it run.

### The prompt

```
You are the coordinator for the TAMANNA TRADERS CNF Back Office build.

Read these four files in full before doing anything:
  plan.md          — what we are building and why
  ToDos.md         — the task ledger; §0 is your operating contract
  agents/TEAM.md   — the agent roster, model matrix and file ownership rules
  PROGRESS.md      — what previous iterations did

Then follow the Loop Contract in ToDos.md §0 exactly:

1. Find the FIRST unchecked `- [ ]` task whose dependencies are all `- [x]`.
2. If it is marked 🧑 HUMAN, write a HANDOFF entry to PROGRESS.md, create a file
   named STOP, commit, and stop.
3. If its ID contains `-G`, run the gate procedure in ToDos.md §0.4.
4. Otherwise execute it: touch ONLY the files in its `Files:` list, satisfy its
   `Accept:` criteria, and run its `Verify:` command.
5. On pass: flip `- [ ]` to `- [x]`, append a PROGRESS.md entry, and git commit
   using the format in ToDos.md §0.
6. On fail: retry up to 3 attempts total. If still failing, flip to `- [!]`,
   record the full error in PROGRESS.md, commit, and stop.

Do EXACTLY ONE task, then stop and report which task you completed and what the
next one will be.

Dispatch rules: for tasks owned by backend-engineer, frontend-engineer,
test-engineer or doc-writer, you may either implement directly or dispatch an
Orca worker per agents/TEAM.md §3. Tasks owned by **architect** (marked ★) you
implement yourself at this model tier — never delegate the schema or the money
math to a Flash-tier worker.

Standing rules that override any task text: agents/TEAM.md §7.
```

### After it finishes

It will report the completed task and the next one. Run it again (same prompt) for the next task, or switch to the unattended loop below.

---

## ⚡ PHASE RUNNER — one prompt, one whole phase, multiple agents

**Use this when you want to say "finish Phase N" once and walk away.** It is the multi-agent
counterpart to the single-task loop: the coordinator works out which tasks can run at the same
time, starts an Orca worker for each, supervises them, integrates the results, runs the three
gates, and tags the phase.

### Where

Same place as above — an **Orca terminal** in the repo, Claude Code on `claude-opus-5`, xhigh.
It must be an Orca terminal or worker dispatch will not be available.

```bash
cd /Users/mehedi/dev/cnf-back-office
orca status --json | head -20     # runtime must say "ready"
claude --model claude-opus-5
```

### The prompt

Change **one number** on the first line each time. That is the only edit between phases.

```
Complete ALL remaining tasks in PHASE 0 of the TAMANNA TRADERS CNF Back Office,
using the agent team, and stop when the phase is signed off.

═══ STEP 1 — ORIENT ═══
Read in full, in this order:
  PROGRESS.md      most recent entries FIRST — they record what the environment
                   actually is, which is not always what ToDos.md assumes
  ToDos.md         §0 is your operating contract; then the phase section
  plan.md          the specification the tasks are derived from
  agents/TEAM.md   roster, model matrix, and §4 file ownership

RULE — REALITY BEATS THE LEDGER. ToDos.md was written before the stack was
installed. Where a task's text contradicts what PROGRESS.md records about the
installed versions, follow PROGRESS.md, do the task's INTENT, and write the
correction into PROGRESS.md so later tasks inherit it. Do not "fix" the code to
match stale task text.

═══ STEP 2 — PLAN THE WAVES ═══
List every unchecked task in this phase. For each, note Owner, Deps and Files.
Group them into WAVES:
  - a task may enter a wave only if every Dep is already `- [x]`
  - two tasks may share a wave ONLY if their Files lists do not overlap at all
    (agents/TEAM.md §4). Overlapping files in one wave is the top failure mode
    of this build — when in doubt, put them in different waves.
Print the wave plan before doing anything, so it is on the record.

═══ STEP 3 — RUN EACH WAVE ═══
For every task in the wave, decide who does it:

  - Task marked ★ or Owner = architect  → YOU implement it yourself, now, at this
    model tier. NEVER dispatch schema, src/lib/finance/, bill numbering, the
    advance engine, or a security decision to a Flash-tier worker.
  - Everything else → dispatch an Orca worker per agents/TEAM.md §3, using the
    model for that role in the §2 matrix.

Build each worker's spec as: the full contents of its agents/<role>.md, then the
verbatim task block from ToDos.md, then the Standing Rules from agents/TEAM.md §7,
then this line:
  "Do not edit ToDos.md, PROGRESS.md, plan.md or agents/. Do not git commit.
   Report what you changed and what you verified."

START EVERY WORKER IN THE WAVE BEFORE WAITING ON ANY OF THEM. That is the whole
point — do not start one, wait, then start the next.

Then supervise:
  orca orchestration check --wait --types worker_done,escalation,question \
    --timeout-ms 900000 --json
A timeout or {count:0} is a checkpoint, NOT a failure — coding tasks routinely
take 15-60 minutes. Answer `question` messages with `orca orchestration reply`.
Release each settled worker with `orca orchestration worker-release`.

If Orca dispatch is unavailable or a worker fails twice, implement that task
yourself rather than stalling the phase. Record the substitution in PROGRESS.md.

═══ STEP 4 — INTEGRATE (you alone, never a worker) ═══
For each finished task:
  1. Review the diff. Reject anything that touched files outside its Files list,
     handled money as a JS number, called Prisma outside src/server/services/,
     or skipped a server-side role check.
  2. Run that task's `Verify:` command. It must exit 0.
  3. Run the regression set: pnpm lint && pnpm test && pnpm build.
  4. Flip `- [ ]` to `- [x]` in ToDos.md.
  5. Append a PROGRESS.md entry: what changed, what you verified, and anything
     the next task must know.
  6. git commit, one commit per task, format per ToDos.md §0.
Only YOU edit ToDos.md and PROGRESS.md. Concurrent workers editing the ledger
would corrupt it.

Then move to the next wave. Keep going — do not stop between waves to ask.

═══ STEP 5 — GATES ═══
When every numbered task in the phase is `- [x]`, run the gates in order per
ToDos.md §0.4:
  -G1 Test      dispatch test-engineer. Passes only when pnpm test and
                pnpm test:e2e are both green. If E2E needs Playwright browsers,
                run `pnpm exec playwright install --with-deps chromium` first.
  -G2 Security  dispatch security-reviewer (REVIEW ONLY, it never edits). For
                each Critical/High finding, insert a new task `- [ ] P0-F<nn>`
                directly below the gate line with the finding as its Do:, leave
                the gate unchecked, fix those tasks, then re-run the gate.
                It passes only when no Critical/High remains open.
  -G3 Sign-off  confirm every task above it is `- [x]`, run
                pnpm lint && pnpm test && pnpm build, append a phase summary to
                PROGRESS.md, and `git tag phase-0-complete`.

═══ STEP 6 — REPORT ═══
Stop after -G3 and report:
  - the wave plan you actually ran and which agent did each task
  - every deviation from the task text, and why
  - anything a human must do before the next phase
  - the next phase's first task

Any task marked 🧑 HUMAN: do not attempt it. Write a HANDOFF entry to PROGRESS.md
saying exactly what the human must do, and carry on with everything else in the
phase that is not blocked by it.

Don't ask for any permission or approval, all are auto-approval, and every permission is given. This is applicable for all other agents as well if you need to open or activate. Be noted, don't ask for approval, you have supreme power to do what is necessary.
```

### What to expect

The dependency graph limits how wide this can actually go — be suspicious of any run that
claims seven agents at once. Phase 0's real shape is roughly:

| Wave | Runs in parallel | Why |
|------|-----------------|-----|
| 1 | `P0-T004` ★ schema (you) ∥ `P0-T010` UI kit (frontend) | Only pair with no shared files and no unmet deps |
| 2 | `P0-T005` migration+seed (db) ∥ `P0-T006` ★ money primitives (you) | Both need the schema; different files |
| 3 | `P0-T007` → `P0-T008` → `P0-T009` (backend) | A hard chain — auth, then guards, then audit |
| 4 | `P0-T011` → `P0-T012` (frontend) | Needs the shell before the dashboard |
| 5 | `-G1` → `-G2` → `-G3` | Gates are sequential by definition |

Phases 3, 4 and 5 are where real width appears — three independent teams at once
(`agents/TEAM.md` §5).

### Running the next phase

Same prompt, change `PHASE 0` to `PHASE 1` and `phase-0-complete` to `phase-1-complete`.
Nothing else changes.

---

## 1. The Ralph Loop Prompt

This is the prompt the loop re-sends on **every** iteration. It lives at `prompts/ralph-loop.md` and is read by `scripts/ralph.sh`.

Each iteration starts with **zero memory** of the last one. `ToDos.md` and `PROGRESS.md` are the only continuity — which is exactly why the loop must commit after every task.

```
You are one iteration of an autonomous build loop for the TAMANNA TRADERS CNF
Back Office. You have no memory of previous iterations. The repository is your
only state.

STEP 1 — Orient. Read in full:
  plan.md, ToDos.md, PROGRESS.md, agents/TEAM.md

STEP 2 — Select. Scan ToDos.md top to bottom for the first `- [ ]` whose
dependencies are all `- [x]`. That is your task. If you find a `- [~]`, a prior
iteration crashed mid-task — investigate the working tree, then either finish it
or reset it to `- [ ]`. If nothing is eligible, write why to PROGRESS.md, commit,
and stop.

STEP 3 — Classify.
  - Marked 🧑 HUMAN  → write a HANDOFF entry to PROGRESS.md stating exactly what
                        the human must do, create a file named STOP, commit, stop.
  - ID contains -G   → run the gate procedure in ToDos.md §0.4.
  - Otherwise        → build it.

STEP 4 — Build. Mark the task `- [~]` and commit before starting. Read the role
brief in agents/ for the task's Owner. Touch ONLY the paths in its `Files:` list —
crossing that boundary is a defect. Obey the Standing Rules in agents/TEAM.md §7,
without exception:
  money is never a JS number · no Prisma outside src/server/services/ ·
  every multi-table write in prisma.$transaction · every server action re-checks
  role server-side · every financial mutation writes an audit row ·
  bill lines snapshot label/value_type/revenue_class ·
  business dates are DATE, audit timestamps are DATETIME UTC ·
  the UI is for a non-technical user and must work at 375px

STEP 5 — Verify. Run the task's `Verify:` command. It must exit 0. Then run
`pnpm lint && pnpm build` as a regression check unless the task's Verify already
includes them.

STEP 6 — Record.
  PASS → flip `- [~]` to `- [x]` in ToDos.md. Append to PROGRESS.md:
         date, task ID, what changed, what you verified, anything the next
         iteration must know. Then:
           git add -A
           git commit -m "<TASK-ID>: <title>" -m "<what changed and what was verified>"
  FAIL → retry, up to 3 attempts total. Still failing → flip to `- [!]`, append
         the full error and your diagnosis to PROGRESS.md, commit, stop.

STEP 7 — Stop. Do exactly ONE task per iteration. Do not start another. End by
printing:
  COMPLETED: <task-id>
  NEXT: <next task-id>
  REMAINING: <count of `- [ ]` in ToDos.md>

If a decision is genuinely ambiguous and getting it wrong would corrupt financial
data, do NOT guess: append a QUESTION entry to PROGRESS.md, create a STOP file,
commit, and stop.
```

---

## 2. Running the Loop Unattended

```bash
cd /Users/mehedi/dev/cnf-back-office
git switch -c build/autonomous          # never loop on main

bash scripts/ralph.sh 100               # supervised: auto-accepts edits, prompts on commands
bash scripts/ralph.sh 100 --unattended  # fully hands-off: bypasses all permission checks
```

Use the plain form while you are watching. **`--unattended` is what makes it truly autonomous** — without it, Claude Code will pause for permission on shell commands, and in headless mode there is nobody to answer.

The script stops when any of these is true:

| Condition | Meaning |
|-----------|---------|
| No `- [ ]` left in `ToDos.md` | Build complete |
| A `STOP` file appears | Human input needed — read `PROGRESS.md` |
| Iteration cap reached | Safety limit; inspect and re-run |
| Three consecutive iterations complete no task | Loop is stuck; inspect |

To resume after clearing a `STOP`: `rm STOP && bash scripts/ralph.sh 100`.

**Watch it live:** `tail -f .ralph/iteration-*.log` or `git log --oneline`.

> **Read this before launching with `--unattended`.** That flag runs Claude Code with `--permission-mode bypassPermissions`: the agent can run any command without asking. It is what makes the loop genuinely hands-off, and it is a real risk to hand that to a financial application unsupervised. The mitigations are built in — a git commit after every task (so any single iteration reverts with `git reset --hard HEAD~1`), phase tags, an iteration cap, stuck detection, the `STOP` file, and mandatory security gates at Phases 0, 2, 3 and 7. Run it on a branch, never on `main`, and skim `git log` between phases. Phase 8 needs you regardless: physical letterhead alignment, VPS credentials and owner training cannot be automated, and the loop is written to stop and say so rather than fake its way through them.

---

## 3. Worker Dispatch Template

Use when the coordinator delegates a task to an Orca worker. Substitute `<ROLE>` and `<TASK-ID>`.

### 3.1 Build the task spec

```bash
TASK_ID="P2-T009"
ROLE="frontend-engineer"

SPEC="$(cat agents/$ROLE.md)

=== STANDING RULES ===
$(sed -n '/^## 7\. Standing Rules/,/^---/p' agents/TEAM.md)

=== YOUR TASK: $TASK_ID ===
$(grep -A6 "\*\*$TASK_ID\*\*" ToDos.md)

=== CONTEXT ===
Read plan.md before starting. Touch ONLY the files listed above.
Run the Verify command and make it pass.
Report with worker_done including outcome and files-modified."
```

### 3.2 Dispatch

```bash
orca orchestration run-create --objective "CNF Back Office — $TASK_ID" --json
orca orchestration task-create --spec "$SPEC" --json
```

**Claude / Codex roles** (architect, db-engineer, security-reviewer):

```bash
orca orchestration worker-start --task <task_id> --worktree current \
  --agent claude --model claude-opus-5 --effort xhigh --json
```

**OpenCode roles** (backend, frontend, test, docs) — Orca's `--model` covers Claude, Codex and Cursor only, so pin the model in the launch command:

```bash
orca terminal create --worktree current --title "$ROLE" \
  --command "opencode --model opencode-go/deepseek-v4-flash" --json
# take result.handle from the JSON, then:
orca orchestration worker-start --task <task_id> --terminal <handle> --json
```

Doc writer swaps the model to `opencode-go/mimo-v2.5`.

### 3.3 Wait and settle

```bash
orca orchestration check --wait --types worker_done,escalation,question \
  --timeout-ms 900000 --json
```

Process every message. Answer questions with `orca orchestration reply --id <msg_id> --body "<answer>" --json`. Release each settled worker with `orca orchestration worker-release --dispatch <dispatch_id> --json`. Only then acknowledge with `check --ack <delivery_id>`.

A timeout is a checkpoint, not a failure — coding tasks routinely run 15–60 minutes.

---

## 4. Gate Prompts

### 4.1 Test gate (`-G1`)

```
You are the test-engineer for the TAMANNA TRADERS CNF Back Office.
Read agents/test-engineer.md and plan.md §18.

Phase <N> is code-complete. Write and run the tests that prove it.

1. List every completed task in Phase <N> from ToDos.md.
2. For each, write unit tests for its business logic and E2E tests for its user flow.
3. Implement the critical tests named in this phase's gate `Do:` block. These are
   where this business loses money — write them first and make each one FAIL
   before it passes.
4. Tests must be deterministic: fixed dates, fixed IDs, seeded RNG. No `new Date()`
   in an assertion. Each test creates and tears down its own data and passes in
   any order.
5. Playwright runs against a real MySQL test database, not mocks. The advance
   engine cannot be meaningfully tested with a mocked ORM.
6. Run `pnpm test && pnpm test:e2e`.

You write tests. You do NOT fix production code. Report any defect you find with a
reproduction and leave it for the owning engineer.

Gate passes only when both suites are green. Then check off the gate in ToDos.md,
append to PROGRESS.md, and commit.
```

### 4.2 Security gate (`-G2`)

```
You are the security-reviewer for the TAMANNA TRADERS CNF Back Office.
Read agents/security-reviewer.md and plan.md §14.

Review all code added in Phase <N> against the full checklist in your role brief.
Weight your attention toward this phase's risk: <phase-specific risk>.

You are REVIEW-ONLY. You do not edit production code.

For every finding:
  SEVERITY: Critical | High | Medium | Low
  FILE: path:line
  ISSUE: what is wrong
  EXPLOIT: concrete inputs and state that produce the bad outcome
  FIX: specific remediation

Rank most severe first. Report only what you can substantiate with a concrete
failure scenario — speculative findings dilute the ones that matter. If the phase
is clean, say so plainly rather than manufacturing findings.

Then, for EACH Critical and High finding, insert a new task into ToDos.md
immediately below this gate line, formatted exactly like the other tasks:

  - [ ] **P<N>-F<nn>** · <short title>
    - **Owner:** <owning engineer> · **Deps:** —
    - **Files:** <paths>
    - **Do:** <the fix>
    - **Accept:** <the exploit no longer works>
    - **Verify:** `pnpm lint && pnpm test && pnpm build`

Leave the gate UNCHECKED so the loop picks up the fixes next. Write your full
report to docs/security-review-phase<N>.md, append to PROGRESS.md, and commit.

Check the gate off only when no Critical or High finding remains open.
```

### 4.3 Phase sign-off (`-G3`)

```
Phase <N> sign-off for the TAMANNA TRADERS CNF Back Office.

1. Confirm every task in Phase <N> of ToDos.md is `- [x]`. If any is `- [!]`,
   stop and report it — a blocked task is not a completed phase.
2. Run: pnpm lint && pnpm test && pnpm test:e2e && pnpm build
3. Re-read the phase's **Exit:** line at the top of the phase and confirm each
   condition is genuinely met. Demonstrate it, do not assume it.
4. Append a phase summary to PROGRESS.md: what was built, what was verified,
   known gaps, and anything Phase <N+1> must know.
5. git tag phase-<N>-complete
6. Check off the gate and commit.

Report honestly. If something in the Exit criteria is not actually met, say so
and leave the gate unchecked rather than passing a phase that is not done.
```

---

## 5. Recovery Prompts

### 5.1 A task is blocked (`- [!]`)

```
ToDos.md contains a blocked task marked `- [!]`. Read PROGRESS.md for the recorded
error and diagnosis.

Diagnose the root cause — do not retry blindly, three attempts already failed.
Consider: is the task under-specified? Too large? Does it depend on something not
yet built? Is the Verify command itself wrong?

Then choose one:
  a) Fix the underlying problem and reset the task to `- [ ]`.
  b) Split it into two smaller tasks and replace it in ToDos.md.
  c) Correct the task's Files/Accept/Verify fields if they were wrong, reset to `- [ ]`.
  d) If it is genuinely blocked on a human decision, mark it 🧑 HUMAN and say why.

Record your reasoning in PROGRESS.md and commit.
```

### 5.2 The loop is stuck (no task completed for 3 iterations)

```
The build loop has completed no task for three consecutive iterations. Diagnose it.

Check, in order:
  1. Does ToDos.md still contain `- [ ]` entries?
  2. Are they all blocked by unmet dependencies? Is there a dependency cycle?
  3. Is there an orphaned `- [~]` from a crashed iteration?
  4. Is `pnpm build` broken repo-wide, failing every task's Verify?
  5. Is a STOP file present that the script did not honour?

Fix the root cause, record it in PROGRESS.md, commit, and report what you changed.
```

### 5.3 Reverting a bad iteration

```bash
git log --oneline -10
git reset --hard <commit-before-the-bad-task>
# then reset that task's checkbox in ToDos.md to `- [ ]` and re-run the loop
```

---

## 6. Ad-Hoc Prompts

### 6.1 Status

```
Report build status: tasks complete vs remaining per phase, current phase, next
task, any `- [!]` blocked tasks, and the last 5 PROGRESS.md entries. Do not change
anything.
```

### 6.2 Re-plan a phase

```
Phase <N> of ToDos.md has proven wrong in practice: <what went wrong>.

Re-plan only Phase <N>, keeping the exact task format, the ID scheme and the gate
structure. Preserve completed `- [x]` tasks. Explain what changed and why in
PROGRESS.md. Do not touch other phases.
```

### 6.3 Cross-cutting change

```
The client has changed a requirement: <requirement>.

1. Update plan.md — the relevant section, plus §21 if an assumption changed.
2. Identify every affected ToDos.md task. For completed ones, add a new
   `- [ ] P<N>-C<nn>` change task. For pending ones, edit in place.
3. Do NOT silently widen the scope of an unrelated task.
4. Summarise the impact in PROGRESS.md and commit.
```

---

## 7. Model Selection Quick Reference

| Work | Harness | Model | Effort |
|------|---------|-------|--------|
| **Coordinator / Ralph loop** | Claude Code | `claude-opus-5` | `xhigh` |
| Architect ★ (schema, finance, engine specs) | Claude Code | `claude-opus-5` | `xhigh` |
| DB engineer | Claude Code | `claude-opus-5` | `high` |
| Security reviewer | Claude Code | `claude-opus-5` | `xhigh` |
| Backend engineer | OpenCode | `opencode-go/deepseek-v4-flash` | — |
| Frontend engineer | OpenCode | `opencode-go/deepseek-v4-flash` | — |
| Test engineer | OpenCode | `opencode-go/deepseek-v4-flash` | — |
| Doc writer | OpenCode | `opencode-go/mimo-v2.5` | — |
| Any Pro-tier fallback | Codex | `gpt-5.6-sol` | `xhigh` |

**Never delegate to a Flash tier:** `prisma/schema.prisma`, `src/lib/finance/**`, the bill numbering service, the advance allocation engine, or any security decision. These are the ★ tasks in `ToDos.md`.
