# Agent Team — CNF Back Office

Persistent multi-agent team definition for building the TAMANNA TRADERS CNF Back Office.
Read alongside **`plan.md`** (the build plan) and **`ToDos.md`** (task breakdown).

**Verified environment (2026-08-14):**
- Orca runtime `1.4.180`, ready, capability `orchestration.worker-launch-preferences.v1` present
- Agent CLIs installed: `claude`, `codex`, `opencode`
- Subscriptions: Claude Pro → `claude` · ChatGPT Plus → `codex` · OpenCode Go → `opencode`

---

## 1. Roster

| Role | File | Owns | Phases |
|------|------|------|--------|
| **Architect** | `architect.md` | `prisma/schema.prisma`, `src/lib/finance/`, ADRs, interface contracts | 0, 2, 6 (+ review gate on all) |
| **DB Engineer** | `db-engineer.md` | Migrations, indexes, seed, integrity jobs, query tuning | 0, 1, 7 |
| **Backend Engineer** | `backend-engineer.md` | `src/server/services/`, `src/server/actions/`, exports, auth | 0–6 |
| **Frontend Engineer** | `frontend-engineer.md` | `src/app/`, `src/components/`, print layouts, responsive | 0–6 |
| **Test Engineer** | `test-engineer.md` | `tests/unit/`, `tests/e2e/`, fixtures | 2–7 |
| **Security Reviewer** | `security-reviewer.md` | Authz, injection, secrets, headers, deps — **review only** | Gate on 2, 3, 7 |
| **Doc Writer** | `doc-writer.md` | `docs/`, README, user guide | 7, 8 |

---

## 2. Model Matrix

| Role | Agent | Model | Effort | Fallback |
|------|-------|-------|--------|----------|
| Architect | `claude` | `claude-opus-5` | `xhigh` | `codex` / `gpt-5.6-sol` → `opencode-go/deepseek-v4-pro` |
| DB Engineer | `claude` | `claude-opus-5` | `high` | `codex` / `gpt-5.6-sol` → `opencode-go/deepseek-v4-pro` |
| Backend Engineer | `opencode` | `opencode-go/deepseek-v4-flash` | — | escalate → `opencode-go/deepseek-v4-pro` |
| Frontend Engineer | `opencode` | `opencode-go/deepseek-v4-flash` | — | escalate → `opencode-go/deepseek-v4-pro` |
| Test Engineer | `opencode` | `opencode-go/deepseek-v4-flash` | — | escalate → `opencode-go/deepseek-v4-pro` |
| Security Reviewer | `claude` | `claude-opus-5` | `xhigh` | `codex` / `gpt-5.6-sol` → `opencode-go/deepseek-v4-pro` |
| Doc Writer | `opencode` | `opencode-go/mimo-v2.5` | — | `opencode-go/mimo-v2.5-pro` |

> **Confirm before first run.** The brief was ambiguous on whether Flash covers all three of
> frontend / backend / test, or only test. Configured above as **all three on Flash**.
> To move frontend and backend to the Pro tier, change one word in their rows:
> `opencode-go/deepseek-v4-flash` → `opencode-go/deepseek-v4-pro`. Nothing else changes.

**Escalation rule.** A Flash-tier worker that hits any of the following must stop and
escalate to the coordinator rather than guess:
transaction/locking design · money rounding · schema change · anything under
`src/lib/finance/` · a security-relevant decision. The coordinator re-dispatches that task
to the Pro tier.

**Rotation.** All three fallback options for the Pro tier are interchangeable — pick whichever
is available and not rate-limited at the moment of dispatch. Record the actual model used in
the task result so the run is reproducible.

---

## 3. Launch Commands

`ORCA` = `orca` on this MacBook. Confirm the runtime first:

```bash
orca status --json
```

### 3.1 Create the Run (once per phase)

```bash
orca orchestration run-create --objective "CNF Back Office — Phase <N>: <phase name>" --json
```

### 3.2 Create tasks (all independent tasks first, before starting any worker)

```bash
orca orchestration task-create --spec "$(cat agents/architect.md) --- TASK: <task text from ToDos.md>" --json
orca orchestration task-create --spec "..." --deps '["<task_id>"]' --json
```

### 3.3 Start workers

**Claude / Codex roles** — model and effort pass straight through:

```bash
# Architect
orca orchestration worker-start --task <task_id> --worktree current \
  --agent claude --model claude-opus-5 --effort xhigh --json

# Pro-tier fallback on Codex
orca orchestration worker-start --task <task_id> --worktree current \
  --agent codex --model gpt-5.6-sol --effort xhigh --json
```

**OpenCode roles** — Orca's `--model` covers Claude, Codex and Cursor only, so pin the
OpenCode model in the command and attach the worker to that terminal:

```bash
orca terminal create --worktree current --title "backend-engineer" \
  --command "opencode --model opencode-go/deepseek-v4-flash" --json
# take result.handle, then:
orca orchestration worker-start --task <task_id> --terminal <handle> --json
```

> `--model` / `--effort` cannot be combined with `--terminal`. That is fine — the OpenCode
> model is already baked into the launch command.

**Isolated worktree** (use when two agents would otherwise edit the same files):

```bash
orca orchestration worker-start --task <task_id> --worktree new-child \
  --name phase3-advances --agent claude --model claude-opus-5 --effort xhigh \
  --setup run --json
```

### 3.4 Supervise

Start **every** independent worker before waiting on any of them:

```bash
orca orchestration check --wait --types worker_done,escalation,question --timeout-ms 900000 --json
```

Process every message in the Delivery, answer `question` messages with
`orca orchestration reply --id <msg_id> --body "<answer>" --json`, release each settled
worker with `orca orchestration worker-release --dispatch <dispatch_id> --json`, and only
then acknowledge:

```bash
orca orchestration check --ack <delivery_id> --wait \
  --types worker_done,escalation,question --timeout-ms 900000 --json
```

A timeout or `{count:0}` is a checkpoint, **not** a failure — coding tasks routinely run
15–60 minutes. Never stop a worker just because it has not reported yet.

### 3.5 Worker completion contract

Every worker ends with exactly one:

```bash
orca orchestration send --type worker_done --subject "<short status>" \
  --body "<what changed, what was verified, what remains>" \
  --task-id <task_id> --dispatch-id <dispatch_id> \
  --outcome succeeded --files-modified "path/a,path/b" --json
```

Use `--outcome failed` on failure. Never encode failure only in prose.

---

## 4. File Ownership

The single most common multi-agent failure on this project is two agents editing the same
file. Ownership is exclusive:

| Path | Owner | Others may |
|------|-------|-----------|
| `prisma/schema.prisma` | **Architect** | read only — request changes via escalation |
| `prisma/migrations/` | DB Engineer | read only |
| `src/lib/finance/` | **Architect** | read only — this is the money math |
| `src/lib/validation/` | Backend | read; propose additions via escalation |
| `src/server/services/` | Backend | read only |
| `src/server/actions/` | Backend | read only |
| `src/app/**` (non-print) | Frontend | read only |
| `src/app/(print)/**` | Frontend | read only |
| `src/components/**` | Frontend | read only |
| `tests/**` | Test Engineer | read only |
| `docs/**` | Doc Writer | read only |
| `agents/**`, `plan.md`, `ToDos.md` | **Coordinator (human + Claude Code)** | read only |

If a task genuinely needs two owners' files, split it into two tasks with a dependency edge
instead of letting one agent cross the boundary.

---

## 5. Phase → Role Dispatch Map

| Phase | Parallel workers | Sequencing |
|-------|-----------------|-----------|
| **0 Foundation** | Architect (schema + finance skeleton) → then DB + Backend + Frontend in parallel | Schema must land first |
| **1 Master Data** | Backend ∥ Frontend ∥ DB (seed) | Independent after Phase 0 |
| **2 Billing** ★ | Architect (numbering + line model spec) → Backend ∥ Frontend → Test → **Security gate** | Largest phase; keep Architect engaged |
| **3 Money In** | Architect (advance engine spec) → Backend → Test → **Security gate** | Engine spec before code. Do not parallelise the engine. |
| **4 Money Out** | Backend ∥ Frontend ∥ Test | Independent of Phase 3 — run concurrently |
| **5 Loans** | Backend ∥ Frontend | Independent of Phases 3–4 — run concurrently |
| **6 Reports** | Architect (finance module) → Backend ∥ Frontend ∥ Test | Finance module first |
| **7 Hardening** | Security Reviewer ∥ DB (indexes) ∥ Doc Writer | Security findings feed back to Backend |
| **8 UAT** | Doc Writer + coordinator | Human-led |

Phases 3, 4 and 5 are the main parallelisation opportunity — three teams at once once
Phase 2 has landed.

---

## 6. Coordination Protocol

1. **Every task spec must embed the role file.** A worker starts cold with no memory of this
   project. Prefix the spec with the contents of its `agents/<role>.md`.
2. **Every task spec must state**: the goal, the exact files it may touch, its acceptance
   criteria, and the commands that prove it (`pnpm lint`, `pnpm test`, `pnpm build`).
3. **No worker merges its own work.** The coordinator reviews and integrates.
4. **Escalate, do not guess.** Any ambiguity about money, schema or security is an
   `orca orchestration ask`, not an assumption.
5. **Security Reviewer is review-only.** Its `worker_done` reports findings; it never edits.
   Fixes are re-dispatched to the owning engineer.
6. **Definition of Done** is `plan.md` §22 — a worker that has not run lint, test and build
   is not done.

---

## 7. Standing Rules for Every Worker

Include these verbatim in every task spec:

```
PROJECT: TAMANNA TRADERS CNF Back Office. Read plan.md before starting.

STACK: Next.js 15 App Router, TypeScript strict, Tailwind v4, shadcn/ui, MySQL 8, Prisma,
Zod, react-hook-form, TanStack Table, Auth.js v5, Vitest, Playwright. No Docker.

HARD RULES:
1. Money is NEVER a JS number. MySQL DECIMAL(18,2), Prisma Decimal in code. No parseFloat
   on money, no float arithmetic on money.
2. No Prisma calls outside src/server/services/. Components and route handlers call
   services, never the DB.
3. Every multi-table write runs inside prisma.$transaction.
4. Every server action re-checks the session role server-side. Hiding a menu is not authz.
5. Business dates are MySQL DATE (no time). Audit timestamps are DATETIME in UTC.
6. Every financial mutation writes an audit_log row.
7. Bill lines snapshot label, value_type and revenue_class. Editing a parameter must never
   change an already-issued bill.
8. Zod-validate every input at the boundary. Never concatenate SQL.
9. UI is for a non-technical user: plain-language labels, plain-language errors,
   one primary action per screen, works at 375px.
10. Stay inside your assigned files (TEAM.md §4). Escalate if you need to cross the line.

BEFORE REPORTING DONE: run `pnpm lint`, `pnpm test`, `pnpm build`. All three must pass.
Report what you changed, what you verified, and what remains.
```

---

## 8. Recovery

| Situation | Action |
|-----------|--------|
| Worker `ready` but silent | Keep waiting, or `orca orchestration worker-read --dispatch <id> --limit 50 --json` |
| Worker proved `failed`/`stopped` | `worker-start --task <id> --retry-of <dispatch_id>` + explicit `--worktree` and `--agent`/`--terminal` (retry does not inherit placement) |
| `outcome_unknown` | `worker-stop --dispatch <id>` then inspect, or `worker-abandon --dispatch <id>` accepting live residuals |
| 3 consecutive failures on one task | Dispatch circuit-breaks and the task is marked failed. Re-scope the task — it is too big or under-specified. |
| Model rate-limited | Rotate to the fallback in §2; record the substitution in the task result |
