# ToDos — TAMANNA TRADERS CNF Back Office

Machine-driven task ledger. Generated from `plan.md` §17.
This file is the **memory of the Ralph loop** — it survives between stateless agent iterations.

---

## 0. Loop Contract — read this first, every iteration

**You are one iteration of an autonomous build loop. Do exactly ONE task, then stop.**

### Procedure

1. Read `plan.md`, this file, `PROGRESS.md`, and `agents/TEAM.md`.
2. Scan this file **top to bottom** and find the **first line matching `- [ ]`**. That is your task.
3. Check its `Deps:` — every dependency ID must already be `- [x]`. If any is not, skip to the next `- [ ]` whose deps are all satisfied. If none are eligible, write a blocker note to `PROGRESS.md`, commit, and stop.
4. If the task is marked **🧑 HUMAN**, do not attempt it. Write a `HANDOFF` entry to `PROGRESS.md` explaining exactly what the human must do, create a file named `STOP`, commit, and stop.
5. If the task is a **GATE** (`-G` in the ID), run the gate procedure in §0.4 below.
6. Otherwise execute the task per its `Do:` block, touching **only** the files in its `Files:` list.
7. Run the task's `Verify:` command. It must exit 0.
8. **On pass:** change `- [ ]` to `- [x]`, append a PROGRESS entry, `git add -A && git commit`.
9. **On fail:** fix and retry, up to **3 attempts total**. If still failing, change `- [ ]` to `- [!]`, append a PROGRESS entry with the full error, commit, and stop.
10. Stop. Do not start a second task.

### Status markers

| Marker | Meaning |
|--------|---------|
| `- [ ]` | Todo — eligible for pickup |
| `- [x]` | Done and verified |
| `- [!]` | Blocked — 3 failed attempts. Loop skips these; a human must clear them. |
| `- [~]` | In progress. If you find one of these, a previous iteration crashed — investigate, then reset it to `- [ ]` or complete it. |

### Task fields

- **Owner** — role from `agents/TEAM.md`. Dispatch to that agent, or do it yourself if you are already that tier.
- **Deps** — task IDs that must be `- [x]` first.
- **Files** — the only paths this task may create or modify. Crossing this boundary is a defect.
- **Do** — what to build.
- **Accept** — the observable condition that means it worked.
- **Verify** — the command that proves it. Must exit 0.

### 0.4 Gate procedure

A gate is not a coding task. Run it as follows:

- **Test gate (`-G1`)** — dispatch `test-engineer`. It writes/extends tests for every task in the phase, runs the full suite, and reports. Gate passes only when `pnpm test` and `pnpm test:e2e` are green.
- **Security gate (`-G2`)** — dispatch `security-reviewer` (review-only, never edits). For each Critical/High finding, create a new task `- [ ] P<N>-F<nn>` immediately below the gate line with the finding as its `Do:`, then leave the gate unchecked. The loop will pick up the fix tasks next. Gate passes only when no Critical/High finding remains open.
- **Sign-off gate (`-G3`)** — verify every task above it in the phase is `- [x]`, run `pnpm lint && pnpm test && pnpm build`, append a phase summary to `PROGRESS.md`, and `git tag phase-<N>-complete`.

### Standing rules

Every task inherits the **Standing Rules** in `agents/TEAM.md` §7 and the **Definition of Done** in `plan.md` §22. Money is never a JS `number`. No Prisma outside services. Every server action re-checks role server-side. Every financial mutation writes an audit row.

### Commit format

```
P<phase>-T<nnn>: <task title>

<one line on what changed and what was verified>
```

---

## Phase 0 — Foundation

**Goal:** a running, authenticated, empty application shell on the real stack.
**Exit:** Admin logs in and sees the dashboard shell; Operator is blocked from `/settings/users`; `pnpm test` and `pnpm build` pass.

- [x] **P0-T001** · Clean slate and scaffold
  - **Owner:** backend-engineer · **Deps:** —
  - **Files:** `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.gitignore`
  - **Do:** Delete the stale `node_modules/`. Scaffold Next.js 15 App Router + TypeScript + Tailwind v4 into the repo root (`pnpm dlx create-next-app@latest . --ts --tailwind --app --src-dir --import-alias "@/*"`). Set `"strict": true` and `"noUncheckedIndexedAccess": true` in `tsconfig.json`. Add `.gitignore` entries for `node_modules`, `.env`, `.next`, `uploads/`.
  - **Accept:** `pnpm dev` serves a page on :3000; TypeScript strict is on.
  - **Verify:** `pnpm build`

- [x] **P0-T002** · Tooling: lint, format, test, scripts
  - **Owner:** backend-engineer · **Deps:** P0-T001
  - **Files:** `eslint.config.mjs`, `.prettierrc`, `vitest.config.ts`, `playwright.config.ts`, `package.json`, `.env.example`
  - **Do:** ESLint (next/core-web-vitals + @typescript-eslint) with a **custom rule banning `parseFloat`/`Number()` on identifiers matching `/amount|value|total|balance|price|commission/i`**. Prettier. Vitest with coverage. Playwright against a real test MySQL DB. Scripts: `dev`, `build`, `start`, `lint`, `format`, `test`, `test:e2e`, `db:migrate`, `db:seed`, `db:reset`. Write `.env.example` documenting `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `UPLOAD_DIR`, `TZ=Asia/Dhaka` — values blank.
  - **Accept:** all scripts run; the money lint rule fires on a deliberate violation.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P0-T003** · Prisma + MySQL connection
  - **Owner:** db-engineer · **Deps:** P0-T002
  - **Files:** `prisma/schema.prisma`, `src/server/db.ts`, `.env.example`
  - **Do:** Install Prisma, configure the MySQL provider. `src/server/db.ts` exports a singleton `PrismaClient` guarded against hot-reload duplication. Confirm local MySQL 8 connectivity with `utf8mb4_0900_ai_ci`.
  - **Accept:** `pnpm prisma validate` passes and the client connects.
  - **Verify:** `pnpm prisma validate && pnpm build`

- [x] **P0-T004** · Full data model ★
  - **Owner:** **architect** · **Deps:** P0-T003
  - **Files:** `prisma/schema.prisma`, `docs/adr/0001-data-model.md`
  - **Do:** Implement **every** table in `plan.md` §9.1 — identity/audit, master data, billing config, operations, money-in, money-out. Apply §9.2 indexes and §9.3 referential rules: all FKs `ON DELETE RESTRICT`; all money `Decimal @db.Decimal(18,2)`; business dates `@db.Date`; audit timestamps `@db.DateTime` UTC; `bill_lines` snapshot columns `NOT NULL`; unique constraints on `bill_no`, `(bill_year, bill_seq)`, `c_number`. Record the layering decision (`plan.md` §12.2) as ADR 0001.
  - **Accept:** schema matches §9.1 table-for-table and column-for-column; no `Float` anywhere; every enum from the plan present.
  - **Verify:** `pnpm prisma validate && grep -c "Float" prisma/schema.prisma | grep -q '^0$'`

- [x] **P0-T005** · Initial migration and seed
  - **Owner:** db-engineer · **Deps:** P0-T004
  - **Files:** `prisma/migrations/**`, `prisma/seed.ts`, `package.json`
  - **Do:** Generate the initial migration. Write `prisma/seed.ts` per `agents/db-engineer.md`: admin user (env-supplied password, `must_change_password=true`), expense categories with correct `kind`/`affects_pl`, money channels (Cash, Bank, bKash, Cheque), billing parameters covering **every** value type — including one with a **blank default** and one `TEXT` parameter — one Import and one Export template, a demo client, staff member and lender.
  - **Accept:** `pnpm db:reset && pnpm db:seed` yields a usable database from empty.
  - **Verify:** `pnpm db:reset && pnpm db:seed`

- [x] **P0-T006** · Money primitives ★
  - **Owner:** **architect** · **Deps:** P0-T004
  - **Files:** `src/lib/finance/money.ts`, `tests/unit/money.test.ts`
  - **Do:** Pure, I/O-free helpers over `Decimal`: `toDecimal`, `add`, `sub`, `mul`, `percentOf`, `roundMoney` (2dp, half-up), `formatBDT` with **Bangladeshi lakh/crore grouping** (`1234567` → `12,34,567.00`), and `amountInWords` (Taka/Poisha, lakh/crore, e.g. "Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Taka Only").
  - **Accept:** 100% unit coverage. **100 lines of ৳33.33 total exactly ৳3,333.00.** `formatBDT(0)`, negatives, and values above one crore all correct.
  - **Verify:** `pnpm test tests/unit/money.test.ts -- --coverage`

- [x] **P0-T007** · Authentication
  - **Owner:** backend-engineer · **Deps:** P0-T005
  - **Files:** `src/server/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/(auth)/login/page.tsx`, `src/lib/validation/auth.ts`
  - **Do:** Auth.js v5, Credentials provider, **argon2id** hashing, **database sessions** (so deactivating a user revokes immediately). Login form with react-hook-form + Zod. Rate limit `/login` to 5 attempts / 15 min / IP. Cookies `httpOnly` + `secure` + `sameSite=lax`. Identical error message for wrong user and wrong password (no enumeration). Enforce `must_change_password` redirect.
  - **Accept:** seeded admin logs in; a deactivated user's existing session is rejected on the next request; 6th login attempt is rate-limited.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P0-T008** · Role guards
  - **Owner:** backend-engineer · **Deps:** P0-T007
  - **Files:** `src/server/auth-guards.ts`, `middleware.ts`, `src/server/actions/_guard.ts`
  - **Do:** `requireAuth()` and `requireRole('ADMIN')` helpers usable in every server action and route handler. Middleware protecting the `(app)` route group. **Server-side enforcement is the contract** — a hidden menu item is never authorisation.
  - **Accept:** an Operator calling an Admin-only server action **directly** is rejected server-side, not just hidden in the UI.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P0-T009** · Audit log
  - **Owner:** backend-engineer · **Deps:** P0-T008
  - **Files:** `src/server/services/audit.service.ts`
  - **Do:** `writeAudit({ entity, entityId, action, before, after, userId, ip })`, callable **inside** the same `prisma.$transaction` as the mutation it records. Append-only — expose no update or delete path.
  - **Accept:** an audit row is written in the same transaction; a rolled-back mutation leaves no audit row.
  - **Verify:** `pnpm test && pnpm build`

- [x] **P0-T010** · Base UI kit
  - **Owner:** frontend-engineer · **Deps:** P0-T002
  - **Files:** `src/components/ui/**`, `components.json`, `src/app/globals.css`
  - **Do:** Init shadcn/ui. Install: button, input, label, select, textarea, checkbox, table, dialog, dropdown-menu, form, card, badge, tabs, toast/sonner, popover, calendar, separator, skeleton. Define theme tokens for light **and** dark. Build project primitives: `<MoneyInput>` (Decimal-safe, no float), `<DateField>`, `<DateRangePicker>` with 7/14/30/month/year/custom presets, `<ConfirmDialog>` with typed confirmation, `<EmptyState>`, `<PageHeader>`, `<FormField>`.
  - **Accept:** every primitive renders in light and dark at 375 px and 1440 px; touch targets ≥ 44 px.
  - **Verify:** `pnpm lint && pnpm build`

- [x] **P0-T011** · Application shell
  - **Owner:** frontend-engineer · **Deps:** P0-T010, P0-T008
  - **Files:** `src/app/(app)/layout.tsx`, `src/components/layout/**`, `src/app/(print)/layout.tsx`
  - **Do:** Authenticated shell — left sidebar with the six groups from `plan.md` §10 (Dashboard · Jobs & Billing · Money In · Money Out · Reports · Settings), header with user menu and theme toggle, breadcrumbs. Sidebar collapses to a drawer below `md`. Menu items filter by role. Separate **bare** `(print)` layout with no chrome.
  - **Accept:** navigation works at 375 px; Operator does not see Settings → Users; the print layout renders no sidebar or header.
  - **Verify:** `pnpm lint && pnpm build`

- [x] **P0-T012** · Dashboard shell
  - **Owner:** frontend-engineer · **Deps:** P0-T011
  - **Files:** `src/app/(app)/dashboard/page.tsx`, `src/components/dashboard/**`
  - **Do:** Dashboard route with the period selector wired and KPI tile placeholders laid out per `plan.md` §M11 rows 1–4. Real data lands in Phase 6.
  - **Accept:** logging in lands on `/dashboard`; the period selector changes state; layout is correct at 375 px.
  - **Verify:** `pnpm lint && pnpm build`

- [x] **P0-G1** · GATE — Test
  - **Owner:** test-engineer · **Deps:** P0-T001…P0-T012
  - **Do:** Unit tests for money primitives (100%) and auth guards. E2E: login success, login failure, rate limiting, Operator blocked from `/settings/users` **at the server action level**, deactivated-user session revocation.
  - **Verify:** `pnpm test && pnpm test:e2e`

- [x] **P0-G2** · GATE — Security
  - **Owner:** security-reviewer · **Deps:** P0-G1
  - **Do:** Review per `agents/security-reviewer.md`, focused on auth, session handling, role enforcement, secrets and headers. File each Critical/High as a new `P0-F<nn>` task below this line.
  - **Verify:** no Critical/High finding open

- [x] **P0-F01** · Fix login rate-limit bypass via X-Forwarded-For spoofing
  - **Owner:** backend-engineer · **Deps:** P0-G2 · **Severity:** High
  - **Do:** Trust XFF only when the immediate peer is the loopback proxy; otherwise fall back to the socket peer; take the rightmost untrusted hop, never element `[0]`. Add a per-email failure counter (10 / 15 min, persisted) as a second control header-spoofing cannot touch. Update the E2E test so changing XFF does not reset the bucket for the same email.
  - **Verify:** `pnpm test && pnpm test:e2e`

- [x] **P0-F02** · Add security response headers
  - **Owner:** backend-engineer · **Deps:** P0-G2 · **Severity:** High
  - **Do:** `headers()` in `next.config.ts` for `/(.*)`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a CSP starting with `frame-ancestors 'none'; object-src 'none'; base-uri 'self'`. Introduce `script-src` in report-only first (Next's inline bootstrap needs a nonce and breaks silently otherwise).
  - **Verify:** `curl -sI http://localhost:3000/dashboard` shows all four headers

- [x] **P0-F03** · Clear High advisories from `pnpm audit`
  - **Owner:** backend-engineer · **Deps:** P0-G2 · **Severity:** High
  - **Do:** Override `postcss >=8.5.23` and `sharp >=0.35.0` in `package.json`; re-run `pnpm install` and `pnpm audit`; commit the lockfile. If an override breaks the Tailwind v4 build, record an accepted exception with the reviewer's rationale instead of blocking the gate.
  - **Verify:** `pnpm audit` shows 0 High/Critical, or a written exception exists

- [x] **P0-F04** · Enforce `must_change_password` in `authorizeAction`
  - **Owner:** backend-engineer · **Deps:** P0-G2 · **Severity:** Medium
  - **Do:** Make `authorizeAction()` reject when `mustChangePassword` is true, with an explicit opt-out for the change-password action itself (e.g. `authorizeAction({ allowPasswordChangePending: true })`). Add a unit test asserting a must-change-password session is refused by a non-exempt action.
  - **Verify:** `pnpm test tests/unit/action-guard.test.ts`

- [x] **P0-F05** · Wire the DML-only application DB user; reconcile contradictory docs
  - **Owner:** db-engineer · **Deps:** P0-G2 · **Severity:** Medium
  - **Do:** `src/server/db.ts` reads `DATABASE_URL_APP` (falling back to `DATABASE_URL` in development only); `prisma.config.ts` keeps `DATABASE_URL` as the migration user; document `DATABASE_URL_APP` in `.env.example`; correct the contradictory comment at `.env.example` lines 12–17.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P0-F06** · Fix change-password cookie read + stale-JWT bounce
  - **Owner:** backend-engineer · **Deps:** P0-G2 · **Severity:** High
  - **Do:** Match the Auth.js session cookie exactly (shared SESSION_COOKIE_RE), wrap `decode()` in try/catch, handle chunked cookies, and stop middleware from bouncing on the stale `mustChangePassword` JWT claim — the layout enforces it DB-backed. Add the missing first-login E2E coverage and correct the false fixture comment.
  - **Verify:** `pnpm test && pnpm test:e2e`

- [x] **P0-G3** · GATE — Phase sign-off
  - **Owner:** coordinator · **Deps:** P0-G2
  - **Verify:** `pnpm lint && pnpm test && pnpm build && git tag phase-0-complete`

---

## Phase 1 — Master Data

**Goal:** every configurable list the business runs on.
**Exit:** Admin creates a billing parameter with a blank default and a TEXT parameter, builds an Export template; Operator can view but not edit.

- [x] **P0-F07** · Per-email lockout must not DoS the account owner
  - **Owner:** backend-engineer · **Deps:** — (carried from P0-G2; non-blocking Medium) · **Severity:** Medium
  - **Do:** Move the `isEmailLoginRateLimited` check so a full email bucket still lets a **correct** password through (and clears the bucket) while refusing wrong passwords. Keeps P0-F01's anti-spraying property without letting 10 wrong attempts from 2 IPs lock the owner out for 15 min. Add the unit regression.
  - **Verify:** `pnpm test tests/unit/auth.test.ts && pnpm test:e2e`

- [x] **P0-F08** · Enforce CSP instead of Report-Only
  - **Owner:** backend-engineer · **Deps:** — (carried from P0-G2; non-blocking Medium) · **Severity:** Medium
  - **Do:** Promote the CSP to enforced `Content-Security-Policy` minus `script-src` (locks down `form-action`/`base-uri`/`object-src`/`frame-ancestors` now); keep Report-Only only for the future `script-src`-with-nonce experiment (Phase 7).
  - **Verify:** `curl -sI http://localhost:3000/dashboard` shows an enforced CSP header

- [x] **P0-F09** · Client-IP trust: fail closed without a proxy + pin Nginx config
  - **Owner:** backend-engineer · **Deps:** — (carried from P0-G2; non-blocking Medium) · **Severity:** Medium
  - **Do:** When neither proxy header is present and `NODE_ENV === "production"`, treat it as a misconfiguration (log loudly) instead of bucketing everyone to `"unknown"`. Record the required `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` in `docs/deployment.md` (Phase 7) as a hard dependency.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P1-T001** · Master-data service pattern
  - **Owner:** backend-engineer · **Deps:** P0-G3
  - **Files:** `src/server/services/master.service.ts`, `src/lib/validation/master.ts`
  - **Do:** Generic list/create/update/deactivate pattern with pagination, search and audit writes. **Never hard-delete** anything referenced — `is_active` only. Zod schemas shared with the client.
  - **Accept:** deactivating a referenced record succeeds; deleting one is impossible by design.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P1-T002** · Clients
  - **Owner:** backend-engineer + frontend-engineer · **Deps:** P1-T001
  - **Files:** `src/server/services/client.service.ts`, `src/app/(app)/settings/clients/**`
  - **Do:** CRUD for name, code (unique), contact person, phone, email, address, BIN/VAT, opening balance, notes, active. List with search and active filter.
  - **Accept:** a client can later be used for **both** import and export jobs — trade type is never stored on the client.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P1-T003** · Staff
  - **Owner:** backend-engineer + frontend-engineer · **Deps:** P1-T001
  - **Files:** `src/server/services/staff.service.ts`, `src/app/(app)/settings/staff/**`
  - **Do:** CRUD for name, designation, phone, joining date, active. This list feeds the expense "money given to" dropdown.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P1-T004** · Money channels
  - **Owner:** backend-engineer + frontend-engineer · **Deps:** P1-T001
  - **Files:** `src/server/services/channel.service.ts`, `src/app/(app)/settings/channels/**`
  - **Do:** CRUD for name, type (`CASH`/`BANK`/`MFS`/`CHEQUE`/`OTHER`), account reference, opening balance, active. Used by receipts, advances, expenses and loans.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P1-T005** · Expense categories
  - **Owner:** backend-engineer + frontend-engineer · **Deps:** P1-T001
  - **Files:** `src/server/services/expense-category.service.ts`, `src/app/(app)/settings/expense-categories/**`
  - **Do:** CRUD for name, `kind` (`OPERATING`/`JOB_REIMBURSABLE`/`BRANCH_TRANSFER`/`LOAN_REPAYMENT`/`LOAN_COST`/`CAPITAL`), `affects_pl`, active. **`affects_pl` is derived from `kind` and read-only in the UI** — `LOAN_REPAYMENT` and `CAPITAL` are `false`, everything else `true`. Show a plain-language explainer of what each kind means.
  - **Accept:** a user cannot create a `LOAN_REPAYMENT` category that hits P&L.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P1-T006** · Lenders
  - **Owner:** backend-engineer + frontend-engineer · **Deps:** P1-T001
  - **Files:** `src/server/services/lender.service.ts`, `src/app/(app)/settings/lenders/**`
  - **Do:** CRUD for name, type (`INDIVIDUAL`/`INSTITUTION`/`FAMILY`/`OTHER`), contact, notes, active.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P1-T007** · Billing parameters — service ★
  - **Owner:** backend-engineer · **Deps:** P1-T001
  - **Files:** `src/server/services/billing-parameter.service.ts`, `src/lib/validation/billing-parameter.ts`
  - **Do:** CRUD for code, label, `value_type` (`AMOUNT`/`TEXT`/`COMMISSION`/`ADVANCE_ADJUSTMENT`/`PERCENT_OF_BASE`), `revenue_class` (`COMMISSION`/`SERVICE_CHARGE`/`REIMBURSEMENT`/`ADJUSTMENT`/`NARRATIVE`), **nullable default value**, `is_deduction`, sort order, help text, active. **A blank default is valid** and means the operator fills it in at bill time. Value types are a fixed enum — reject any attempt to make them dynamic.
  - **Accept:** a parameter saves with a null default; a `TEXT` parameter rejects a numeric default.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P1-T008** · Billing parameters — UI
  - **Owner:** frontend-engineer · **Deps:** P1-T007
  - **Files:** `src/app/(app)/settings/billing-parameters/**`
  - **Do:** List with drag-to-reorder. Create/edit form where the value-type picker changes the visible fields (`TEXT` hides the default-amount field; `COMMISSION` explains the two-input behaviour; `ADVANCE_ADJUSTMENT` warns it deducts and posts to the advance ledger). Plain-language help text per type.
  - **Accept:** a non-technical user can tell from the form alone what each type will do on a bill.
  - **Verify:** `pnpm lint && pnpm build`

- [x] **P1-T009** · Bill templates
  - **Owner:** backend-engineer + frontend-engineer · **Deps:** P1-T008
  - **Files:** `src/server/services/bill-template.service.ts`, `src/app/(app)/settings/bill-templates/**`
  - **Do:** Templates with name, trade type (`IMPORT`/`EXPORT`/`BOTH`), default flag. Items: parameter, sort order, optional default-value override, required flag. Builder UI with add/remove/reorder and a live preview of the resulting bill layout.
  - **Accept:** one template may be default per trade type; templates can include any mix of parameters.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P1-T010** · Letter templates
  - **Owner:** backend-engineer + frontend-engineer · **Deps:** P1-T001
  - **Files:** `src/server/services/letter-template.service.ts`, `src/app/(app)/settings/letter-templates/**`
  - **Do:** CRUD for name, subject, body (rich text). Document the placeholders `{{bill_no}}`, `{{bill_date}}`, `{{client_name}}`, `{{c_number}}`, `{{invoice_no}}`, `{{net_payable}}`, `{{amount_in_words}}` with an insert-placeholder toolbar.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P1-T011** · User management
  - **Owner:** backend-engineer + frontend-engineer · **Deps:** P0-G3
  - **Files:** `src/server/services/user.service.ts`, `src/app/(app)/settings/users/**`
  - **Do:** **Admin only.** Create user, set role (`ADMIN`/`OPERATOR`/`VIEWER`), activate/deactivate, reset password (forces `must_change_password`). No self-registration. **Never hard-delete a user.**
  - **Accept:** Operator receives 403 from every user-management server action, tested by direct invocation.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P1-T012** · Organisation settings
  - **Owner:** backend-engineer + frontend-engineer · **Deps:** P1-T001
  - **Files:** `src/server/services/settings.service.ts`, `src/app/(app)/settings/organisation/**`
  - **Do:** Key/value settings: organisation name and address, **letterhead top margin in mm** (default 25), advance-unadjusted alert days (default 60), session timeout hours (default 8), logo upload for the digital-letterhead print mode.
  - **Accept:** the letterhead margin is readable by the print layout in Phase 2.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P1-G1** · GATE — Test
  - **Owner:** test-engineer · **Deps:** P1-T001…P1-T012
  - **Do:** CRUD unit tests per service; RBAC tests proving Operator is blocked from parameters, templates and users **at the server action level**; E2E creating a parameter with a blank default and building an Export template.
  - **Verify:** `pnpm test && pnpm test:e2e`

- [x] **P1-G2** · GATE — Phase sign-off
  - **Owner:** coordinator · **Deps:** P1-G1
  - **Verify:** `pnpm lint && pnpm test && pnpm build && git tag phase-1-complete`

---

## Phase 2 — Jobs & Billing Core ★ largest phase

**Goal:** create a job from a C number and issue a numbered bill printed on letterhead.
**Exit:** issue `2026-01` and `2026-02`, print aligned to real letterhead, attach an annexure, override a number without collision, and find the bill by C number, invoice number and bill number.

- [x] **P2-T001** · Billing engine specification ★
  - **Owner:** **architect** · **Deps:** P1-G2
  - **Files:** `docs/adr/0002-bill-numbering.md`, `docs/adr/0003-bill-line-model.md`
  - **Do:** Write both specs precisely enough that a Flash-tier worker implements them without judgement calls. **Numbering** (`plan.md` §7): `YYYY-NN` from `bill_date`'s year, `SELECT … FOR UPDATE` on `bill_sequences`, assign-on-**issue** not on draft, Admin override that bumps `last_seq`, exact error strings. **Line model:** snapshot rules, per-value-type computation, sign handling for deductions, `net_payable = subtotal − deduction_total`.
  - **Accept:** both ADRs include pseudocode, the full edge-case list, and verbatim user-facing error messages.
  - **Verify:** `test -f docs/adr/0002-bill-numbering.md && test -f docs/adr/0003-bill-line-model.md`

- [x] **P2-T002** · Jobs service
  - **Owner:** backend-engineer · **Deps:** P2-T001
  - **Files:** `src/server/services/job.service.ts`, `src/lib/validation/job.ts`
  - **Do:** CRUD for jobs with the `job_invoices` child table (1:N). Fields per `plan.md` §M5. Maintain `primary_invoice_no` denormalised on save. Unique `c_number` with a plain-language duplicate message naming the existing job.
  - **Accept:** one C number carries several invoices; invoice value in a non-BDT currency computes `invoice_value_bdt` via `fx_rate`.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P2-T003** · Job search
  - **Owner:** backend-engineer · **Deps:** P2-T002
  - **Files:** `src/server/services/job.service.ts`, `src/server/services/search.service.ts`
  - **Do:** Search jobs by **C number**, by **any child invoice number**, by client, trade type, date range and status — singly or combined. Index-backed, aggregated in SQL, cursor-paginated.
  - **Accept:** searching an invoice number belonging to a child row returns the parent job. `EXPLAIN` shows index usage, no full scan.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P2-T004** · Jobs UI — list
  - **Owner:** frontend-engineer · **Deps:** P2-T003
  - **Files:** `src/app/(app)/jobs/page.tsx`, `src/components/tables/**`
  - **Do:** TanStack Table list with the filter bar (C number, invoice, client, trade type, date range, status), server-side pagination at 50/page. Stacked cards below `md`.
  - **Verify:** `pnpm lint && pnpm build`

- [x] **P2-T005** · Jobs UI — create, edit, detail
  - **Owner:** frontend-engineer · **Deps:** P2-T004
  - **Files:** `src/app/(app)/jobs/new/**`, `src/app/(app)/jobs/[id]/**`
  - **Do:** Create/edit form with a repeatable invoice sub-form (add/remove rows). Detail page showing job data, invoices, linked bills, and a profitability strip (spend arrives in Phase 4 — render the billed side now). C-number field autofocused.
  - **Accept:** keyboard-only entry of a job with three invoices is possible end to end.
  - **Verify:** `pnpm lint && pnpm build`

- [x] **P2-T006** · Bill numbering service ★
  - **Owner:** backend-engineer · **Deps:** P2-T001
  - **Files:** `src/server/services/bill-number.service.ts`, `tests/unit/bill-number.test.ts`
  - **Do:** Implement ADR 0002 exactly. `allocateBillNumber(billDate, tx)` inside a transaction with `SELECT last_seq … FOR UPDATE`. Format `YYYY-NN`, minimum two digits, growing naturally (`2026-100`). `peekNextBillNumber()` for the UI indicator. `overrideBillNumber()` — Admin only, pattern-validated, unique, bumps `last_seq` when higher, writes audit with reason.
  - **Accept:** two concurrent issues never collide; year rollover resets to `01`; `2026-99` → `2026-100`.
  - **Verify:** `pnpm test tests/unit/bill-number.test.ts`

- [x] **P2-T007** · Billing service — drafts and lines
  - **Owner:** backend-engineer · **Deps:** P2-T006
  - **Files:** `src/server/services/billing.service.ts`, `src/lib/validation/bill.ts`
  - **Do:** Create/update draft bills. Apply a template to pre-load lines. Add/remove/reorder lines freely — the template is a starting point, never a cage. **Snapshot `label`, `value_type` and `revenue_class` onto every line at creation.** Compute per type: `COMMISSION` = invoice_value × pct ÷ 100; `TEXT` carries no amount; `is_deduction` subtracts. Recompute `subtotal`, `deduction_total`, `net_payable` on every change using `src/lib/finance/money.ts`.
  - **Accept:** renaming or deactivating a parameter afterwards does not alter the draft's rendered lines.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P2-T008** · Billing service — issue, cancel, amend
  - **Owner:** backend-engineer · **Deps:** P2-T007
  - **Files:** `src/server/services/billing.service.ts`
  - **Do:** `issueBill()` — single transaction: validate, allocate the number, set `ISSUED` and `issued_at`, write audit. `cancelBill()` — **Admin only**, requires a reason, never deletes, sets `CANCELLED` (Phase 3 adds advance reversal here). `amendBill()` — Admin only, full before/after audit. Issued bills are otherwise immutable.
  - **Accept:** an Operator cannot cancel or amend an issued bill, verified by direct server-action invocation.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P2-T009** · Bill form UI ★
  - **Owner:** frontend-engineer · **Deps:** P2-T007
  - **Files:** `src/app/(app)/bills/new/**`, `src/components/forms/bill-form/**`
  - **Do:** The hardest screen — follow `agents/frontend-engineer.md`. C-number search auto-populates job, client and invoice numbers. Template picker pre-loads lines. Add/remove/reorder any line. `COMMISSION` renders **two inputs and a read-only live-computed amount**. `TEXT` renders a textarea with **no amount column**. **Sticky totals bar** (subtotal, deductions, net payable) always visible. **Autosave the draft.** "Attach additional letter" checkbox **default unticked**. "Next bill number" indicator visible.
  - **Accept:** works at 375 px; a half-typed bill survives a page refresh; the commission amount updates live and is not editable.
  - **Verify:** `pnpm lint && pnpm build`

- [x] **P2-T010** · Bill register and detail
  - **Owner:** frontend-engineer · **Deps:** P2-T009, P2-T008
  - **Files:** `src/app/(app)/bills/page.tsx`, `src/app/(app)/bills/[id]/**`
  - **Do:** Register with the full filter bar per `plan.md` §M6 (C number, invoice, bill no, client, trade type, date range, status, amount range) and column totals. Detail page with lines, totals, status, annexure indicator, and Print / Amend / Cancel actions gated by role.
  - **Accept:** the same bill is findable by C number, by invoice number and by bill number.
  - **Verify:** `pnpm lint && pnpm build`

- [x] **P2-T011** · Bill number override UI
  - **Owner:** frontend-engineer · **Deps:** P2-T006, P2-T010
  - **Files:** `src/app/(app)/bills/[id]/override-number/**`
  - **Do:** Admin-only dialog to edit `bill_no`. Pattern-validated, uniqueness checked live, reason required, plain-language errors. Warn clearly when the override will bump the year sequence.
  - **Accept:** an override to an existing number is rejected with a message naming the conflicting bill.
  - **Verify:** `pnpm lint && pnpm build`

- [x] **P2-T012** · Letterhead print ★
  - **Owner:** frontend-engineer · **Deps:** P2-T010, P0-T006
  - **Files:** `src/app/(print)/bills/[id]/print/**`, `src/components/print/**`, `src/app/globals.css`
  - **Do:** Bare print route. `@page { size: A4; margin: <top>mm 15mm 20mm 15mm; }` with the top margin read from organisation settings. Toggle: **"Print on pre-printed letterhead"** (default — suppress the digital header, reserve top space) vs **"Print with digital letterhead"** (render logo and address). Bill table, totals, **amount in words** via the shared helper, signature block. No colour dependency — must read correctly in mono.
  - **Accept:** print preview shows exactly one A4 page for a 10-line bill; changing the margin setting visibly moves the content.
  - **Verify:** `pnpm lint && pnpm build`

- [x] **P2-T013** · Annexure letter
  - **Owner:** backend-engineer + frontend-engineer · **Deps:** P2-T012, P1-T010
  - **Files:** `src/server/services/annexure.service.ts`, `src/app/(app)/bills/[id]/annexure/**`, `src/app/(print)/bills/[id]/annexure/print/**`
  - **Do:** One annexure per bill. Editor opens from the bill form checkbox with a letter-template picker, subject and rich-text body, and **placeholder substitution** for all tokens in P1-T010. Editable while the bill is `DRAFT`. Its own letterhead print route referencing the bill number.
  - **Accept:** selecting a template substitutes real bill values; the annexure prints on letterhead independently and alongside the bill.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P2-G1** · GATE — Test
  - **Owner:** test-engineer · **Deps:** P2-T001…P2-T013
  - **Do:** Critical tests **1, 2, 5** from `agents/test-engineer.md`: concurrent numbering with real concurrency; year rollover and `2026-99`→`2026-100`; parameter edits not rewriting issued bills. Plus E2E job→bill→issue→print→annexure, and search by all three references.
  - **Verify:** `pnpm test && pnpm test:e2e`

- [x] **P2-G2** · GATE — Security
  - **Owner:** security-reviewer · **Deps:** P2-G1
  - **Do:** Full review per `agents/security-reviewer.md`, weighted to authorisation (issue/cancel/amend/override), IDOR on bill and job IDs, and injection in the search and filter paths. File each Critical/High as `P2-F<nn>` below this line.
  - **Verify:** no Critical/High finding open

- [x] **P2-F02** · Viewer (read-only role) can write jobs, bill drafts and annexures
  - **Owner:** backend-engineer · **Deps:** P2-G2 · **Severity:** High
  - **Do:** `saveBillDraftAction`, `createJobAction`/`updateJobAction`/`updateJobStatusAction`, `saveAnnexureAction`/`deleteAnnexureAction` must be `authorizeAction("ADMIN", "OPERATOR")` — the Viewer role is read-only (plan.md §4). Update the annexure-actions Viewer test block to assert refusal and add Viewer-refusal cases for the job and draft mutations.
  - **Verify:** `pnpm test tests/unit/annexure-actions.test.ts tests/unit/bills-actions.test.ts tests/unit/jobs-actions.test.ts`

- [x] **P2-F03** · Bill detail loads the wrong job (bill id used as job id)
  - **Owner:** backend-engineer · **Deps:** P2-G2 · **Severity:** Medium
  - **Do:** `src/app/(app)/bills/[id]/page.tsx` must fetch the job with `billResult.data.job_id`, never the bill's route id — the print route already does it right.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P2-F04** · Dead auth guard on both print routes (`if (!authz)` can never fire)
  - **Owner:** backend-engineer · **Deps:** P2-G2 · **Severity:** Medium
  - **Do:** `getAuthContext()` returns an object either way — use `if (!authz.ok) redirect("/login")` in `(print)/bills/[id]/print/page.tsx` and `(print)/bills/[id]/annexure/print/page.tsx`.
  - **Verify:** `pnpm lint && pnpm build`

- [x] **P2-F05** · Malformed bill-register cursor throws an unhandled exception
  - **Owner:** backend-engineer · **Deps:** P2-G2 · **Severity:** Low
  - **Do:** Restrict `cursor` in `billSearchQuerySchema` to `^\d{4}-\d{2}-\d{2}:\d+$` and guard the `BigInt` conversion in `buildWhere` (degrade to no filter).
  - **Verify:** `pnpm test tests/unit/bill-search.service.test.ts`

- [x] **P2-F06** · Bill-register amount range compared as text
  - **Owner:** backend-engineer · **Deps:** P2-G2 · **Severity:** Low
  - **Do:** Compare `amountFrom`/`amountTo` numerically with `toDecimal(...).lte(...)` (never `Number()` — the money lint rule will flag it).
  - **Verify:** `pnpm test tests/unit/bill-search.service.test.ts`

- [x] **P2-F07** · Bill-register count/totals queries omit the JOINs → MySQL 1054 on text search
  - **Owner:** backend-engineer · **Deps:** P2-G2 · **Severity:** Medium (functional impact High — found by the G2 re-review)
  - **Do:** The COUNT/SUM queries reuse the page WHERE (which references `j.`/`cl.` aliases) without the `jobs`/`clients` JOINs. Extract a shared `SEARCH_FROM_JOINS` and use it in all three queries; add a unit regression asserting every query carries the JOINs; harden the E2E search assertions (totals strip + empty state) so a silent filter failure cannot false-pass.
  - **Verify:** `pnpm test tests/unit/bill-search.service.test.ts && pnpm test:e2e --grep "P2-G1"`

- [x] **P2-G3** · GATE — Phase sign-off
  - **Owner:** coordinator · **Deps:** P2-G2
  - **Verify:** `pnpm lint && pnpm test && pnpm build && git tag phase-2-complete`

---

## Phase 3 — Money In ★ highest financial risk

**Goal:** receipts, advances, and the advance adjustment engine that this project exists to fix.
**Exit:** ৳50,000 advance → adjust ৳20,000 and ৳15,000 → balance ৳15,000 → cancel the second bill → balance ৳35,000. A ৳40,000 adjustment is blocked. The invariant never breaks.

- [x] **P3-T001** · Advance engine specification ★
  - **Owner:** **architect** · **Deps:** P2-G3
  - **Files:** `docs/adr/0004-advance-engine.md`
  - **Do:** Specify `plan.md` §8 completely: FIFO allocation across `OPEN`/`PARTIALLY_ADJUSTED` advances oldest-first, `SELECT … FOR UPDATE` row locking, the over-adjustment guard with its **verbatim** error string, status transitions, the reversal algorithm for cancel and amend, and the §8.4 invariant. Include every edge case: exact-match adjustment, adjustment spanning three advances, concurrent adjustment of the same advance, reversal of a partially reversed bill.
  - **Accept:** an implementer needs no judgement calls; every branch has a defined outcome.
  - **Verify:** `test -f docs/adr/0004-advance-engine.md`

- [x] **P3-T002** · Advances service
  - **Owner:** backend-engineer · **Deps:** P3-T001
  - **Files:** `src/server/services/advance.service.ts`, `src/lib/validation/advance.ts`
  - **Do:** CRUD for advances: date, client, amount, channel, reference, notes, status. `getOutstandingBalance(clientId, asOf?)` and `listOpenAdvances(clientId)` ordered oldest-first.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P3-T003** · Advance allocation engine ★★
  - **Owner:** **architect** (implement the core; do not delegate) · **Deps:** P3-T002
  - **Files:** `src/server/services/advance.service.ts`, `tests/unit/advance-engine.test.ts`
  - **Do:** Implement ADR 0004. `allocateAdjustment(clientId, amount, billId, billLineId, tx)` — lock candidate advances `FOR UPDATE`, validate against the outstanding balance, **block** with the verbatim message when exceeded, allocate FIFO writing one `advance_adjustments` row per advance touched, update each advance's status. Entirely inside the caller's transaction — partial application is never acceptable.
  - **Accept:** over-adjustment is blocked; an adjustment spanning three advances writes three rows; the invariant `Σ advances − Σ adjustments ≥ 0` holds under concurrency.
  - **Verify:** `pnpm test tests/unit/advance-engine.test.ts`

- [x] **P3-T004** · Advance reversal ★
  - **Owner:** **architect** · **Deps:** P3-T003
  - **Files:** `src/server/services/advance.service.ts`, `src/server/services/billing.service.ts`
  - **Do:** `reverseAdjustmentsForBill(billId, tx)` — delete or void every `advance_adjustments` row for the bill and restore each advance's status, **in the same transaction as the cancellation or amendment**. Wire it into `cancelBill()` and `amendBill()` from P2-T008.
  - **Accept:** cancelling a bill restores the exact prior balance; amending recomputes correctly; a double cancellation is idempotent.
  - **Verify:** `pnpm test tests/unit/advance-engine.test.ts`

- [x] **P3-T005** · Advance adjustment on bills
  - **Owner:** backend-engineer · **Deps:** P3-T004
  - **Files:** `src/server/services/billing.service.ts`, `src/components/forms/bill-form/**`
  - **Do:** Wire `ADVANCE_ADJUSTMENT` lines into `issueBill()` — call `allocateAdjustment` inside the issue transaction and subtract from `net_payable`. In the bill form, show the client's **available advance balance inline** beside the line and validate against it before submit.
  - **Accept:** issuing a bill whose adjustment exceeds the balance fails atomically — no number consumed, no partial rows.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P3-T006** · Receipts service
  - **Owner:** backend-engineer · **Deps:** P3-T002
  - **Files:** `src/server/services/receipt.service.ts`, `src/lib/validation/receipt.ts`
  - **Do:** Receipts with auto receipt number, date, client, amount, channel, instrument reference, notes. **Multi-bill allocation** — one receipt across several bills, one bill from several receipts. Any unallocated remainder is parked as an advance. Update bill status to `PARTIALLY_PAID`/`PAID` from allocations. All transactional.
  - **Accept:** `Σ receipt_allocations ≤ receipt.amount` is enforced; over-allocation is rejected.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P3-T007** · Receipts and advances UI
  - **Owner:** frontend-engineer · **Deps:** P3-T006, P3-T005
  - **Files:** `src/app/(app)/receipts/**`, `src/app/(app)/advances/**`
  - **Do:** Receipts list and entry form with an allocation panel showing the client's open bills and outstanding amounts, plus a "park remainder as advance" option. Advances list and entry form. Plain-language labels: "Money received from client", "Advance taken from client".
  - **Verify:** `pnpm lint && pnpm build`

- [x] **P3-T008** · Advance ledger report ★
  - **Owner:** backend-engineer + frontend-engineer · **Deps:** P3-T004
  - **Files:** `src/server/services/report.service.ts`, `src/app/(app)/advances/ledger/**`
  - **Do:** Per client and consolidated, **as of any date**: date, reference, advance taken, adjusted, running balance, age in days, and the bills each adjustment went against. This is the report the client has been losing money without.
  - **Accept:** the as-of-date balance reconciles exactly to `Σ advances − Σ adjustments` on that date.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P3-T009** · Client statement and receivables aging
  - **Owner:** backend-engineer + frontend-engineer · **Deps:** P3-T006
  - **Files:** `src/server/services/report.service.ts`, `src/app/(app)/reports/client-statement/**`, `src/app/(app)/reports/receivables-aging/**`
  - **Do:** **Client statement** — running ledger of bills, receipts, advances and adjustments with a closing balance. **Receivables aging** — outstanding by 0–30 / 31–60 / 61–90 / 90+ days. Both aggregate in SQL.
  - **Accept:** statement closing balance = `Σ issued bills − Σ receipts − Σ adjustments` for that client.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P3-T010** · Integrity check job
  - **Owner:** db-engineer · **Deps:** P3-T004, P3-T006
  - **Files:** `scripts/integrity-check.ts`, `package.json`
  - **Do:** Assert per `agents/db-engineer.md`: the §8.4 advance invariant per client; `net_payable = subtotal − deduction_total` on every bill; `Σ receipt_allocations ≤ receipt.amount`; no `advance_adjustments` orphaned to a cancelled bill. Exit non-zero and log loudly on any breach.
  - **Accept:** deliberately corrupting a row makes the script fail with a clear message.
  - **Verify:** `pnpm tsx scripts/integrity-check.ts`

- [x] **P3-G1** · GATE — Test
  - **Owner:** test-engineer · **Deps:** P3-T001…P3-T010
  - **Do:** Critical tests **3 and 4**: over-adjustment blocked with the invariant never negative; the full ৳50,000 → ৳20,000/৳15,000 → cancel → ৳35,000 reversal scenario. Plus concurrent adjustment of one advance, three-advance spanning allocation, and E2E advance → adjust → cancel → verify ledger.
  - **Verify:** `pnpm test && pnpm test:e2e && pnpm tsx scripts/integrity-check.ts`

- [x] **P3-G2** · GATE — Security
  - **Owner:** security-reviewer · **Deps:** P3-G1
  - **Do:** Review weighted to transaction integrity, race conditions in allocation, IDOR on advance and receipt IDs, and whether an Operator can adjust an advance belonging to another client. File findings as `P3-F<nn>`.
  - **Verify:** no Critical/High finding open

- [x] **P3-F01** · Concurrent receipt allocations can over-pay a bill
  - **Owner:** backend-engineer · **Deps:** P3-G2 · **Severity:** High
  - **Do:** `createReceipt`'s remaining-balance check reads `receiptAllocation.aggregate` as a consistent read — under MySQL REPEATABLE READ two concurrent receipts for the same bill both see the full `net_payable` and together allocate more than it (proven: 170,000 allocated against a 100,000 bill). Make the per-bill read a LOCKING read: `SELECT … FROM bills WHERE id = ? FOR UPDATE` (serialises allocators on the bill row) and the allocation sum `SELECT COALESCE(SUM(amount),0) … FOR UPDATE` (current, next-key locks on the bill_id index). Keep the plain-language "More than ৳Y remains payable on bill X" error. Also add the missing integrity-job assertion: per bill, Σ receipt_allocations ≤ net_payable.
  - **Verify:** `pnpm test tests/service/receipt.service.test.ts && pnpm tsx scripts/integrity-check.ts`

- [x] **P3-F02** · Receipt-number COUNT+retry can never advance under concurrency
  - **Owner:** backend-engineer · **Deps:** P3-G2 · **Severity:** High
  - **Do:** `allocateReceiptNumber`'s `tx.receipt.count` is a consistent read — under REPEATABLE READ every retry sees the same snapshot, so 2 of 3 same-day concurrent receipts fail with "Could not allocate a receipt number" (proven). Make the count a LOCKING read (`SELECT COUNT(*) … FOR UPDATE`, which takes next-key range locks on the receipt_no unique index for the day's prefix and serialises same-day inserts). Keep the P2002 retry loop as defence.
  - **Verify:** `pnpm test tests/service/receipt.service.test.ts`

- [x] **P3-F03** · Over-adjustment guard is a snapshot read, not a locked re-read
  - **Owner:** backend-engineer · **Deps:** P3-G2 · **Severity:** High
  - **Do:** `allocateAdjustment` validates via `outstandingAggregate(tx, …)` — a consistent read that sees the transaction's first-read snapshot. Under concurrency (two issues for the same client, over-subscribed), the guard passes on stale data, the FIFO walk then cannot cover the amount, and the defensive `AdvanceEngineError` ("the advance ledger is inconsistent") fires instead of the mandated plan.md §8.1 over-adjustment message (proven). Fix: compute the available balance from the FOR UPDATE-locked candidates themselves (their Σ capacity IS the outstanding balance — a current read), and throw `AdvanceOverAdjustmentError` with the verbatim message when `requested > available`. The defensive branch then fires only on genuine corruption.
  - **Verify:** `pnpm test tests/unit/advance-engine.test.ts tests/service/advance.integration.test.ts`

- [x] **P3-F04** · Raw Prisma errors escape the receipt/advance action layers
  - **Owner:** backend-engineer · **Deps:** P3-G2 · **Severity:** Medium
  - **Do:** Non-P2002 Prisma errors (e.g. a P2003 FK race in `allocateReceiptNumber`'s rethrow, driver errors) surface raw, with source paths, from the receipts and advances actions. Map every known error class to plain language and rethrow nothing raw in the action layer (follow the `toPlainError` pattern in actions/bills.ts, extended to ReceiptError/AdvanceError and a generic Prisma guard).
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P3-F05** · Parked-remainder advance writes no audit row
  - **Owner:** backend-engineer · **Deps:** P3-G2 · **Severity:** Medium
  - **Do:** `createReceipt`'s parked-remainder `tx.advance.create` (ADR 0004 §6) writes no `audit_log` row — "every financial mutation writes an audit row" (TEAM.md §7 rule 6) is violated (proven). Write `ADVANCE_CREATED` with before null / after the created row, in the same transaction.
  - **Verify:** `pnpm test tests/service/receipt.service.test.ts`

- [x] **P3-G3** · GATE — Phase sign-off
  - **Owner:** coordinator · **Deps:** P3-G2
  - **Verify:** `pnpm lint && pnpm test && pnpm build && git tag phase-3-complete`

---

## Phase 4 — Money Out

**Goal:** every rupee leaving the business, attributable to a staff member and a job.
**Exit:** depot cash to a named staff member against a C number appears in the staff ledger and on the job's profitability strip; a DD appears in the Instrument Register.

- [x] **P4-T001** · Expense service
  - **Owner:** backend-engineer · **Deps:** P3-G3
  - **Files:** `src/server/services/expense.service.ts`, `src/lib/validation/expense.ts`
  - **Do:** CRUD per `plan.md` §M9: voucher number (auto), date, category, amount, channel, **staff** (nullable), client (nullable), **job / C number** (nullable), payment instrument (`CASH`/`CHEQUE`/`DD`/`PO`/`TRANSFER`), instrument number, bank, favouring, description, notes. Derive `is_reimbursable` and `affects_pl` **from the category kind** — never from user input.
  - **Accept:** a `LOAN_REPAYMENT` expense saves with `affects_pl = false`; a `JOB_REIMBURSABLE` expense saves with `is_reimbursable = true`.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P4-T002** · Expense UI
  - **Owner:** frontend-engineer · **Deps:** P4-T001
  - **Files:** `src/app/(app)/expenses/**`
  - **Do:** List with filters (date range, category, kind, staff, client, job, channel) and group subtotals. Entry form where selecting a category reveals only the relevant fields — instrument fields appear for `CHEQUE`/`DD`/`PO`, the job picker for reimbursable kinds. Plain-language labels: "Money given to", "What was it for".
  - **Accept:** entering daily depot cash to a staff member takes under 20 seconds on a phone.
  - **Verify:** `pnpm lint && pnpm build`

- [x] **P4-T003** · Secure file attachments
  - **Owner:** backend-engineer · **Deps:** P4-T001
  - **Files:** `src/server/services/upload.service.ts`, `src/app/api/files/[id]/route.ts`
  - **Do:** Attach a voucher scan to an expense. Extension allow-list (pdf, jpg, png), 5 MB cap, MIME sniffed not trusted, stored **outside the web root** under `UPLOAD_DIR` with a generated name — the client filename is never used as a path. Served only through an authenticated route.
  - **Accept:** path traversal is impossible; an unauthenticated request for a file is rejected.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P4-T004** · Staff disbursement report
  - **Owner:** backend-engineer + frontend-engineer · **Deps:** P4-T002
  - **Files:** `src/server/services/report.service.ts`, `src/app/(app)/expenses/staff-ledger/**`
  - **Do:** Per staff member: date, amount, purpose, linked job/C number, running total, period totals. Answers the owner's question — *how much did I give to whom, when, and for what*.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P4-T005** · Instrument register
  - **Owner:** backend-engineer + frontend-engineer · **Deps:** P4-T002
  - **Files:** `src/app/(app)/expenses/instruments/**`
  - **Do:** All `CHEQUE`/`DD`/`PO` expenses: instrument number, bank, favouring, amount, date, job, client, and recovery status (billed vs not yet billed).
  - **Accept:** an issued DD not yet billed to the client is visibly flagged.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P4-T006** · Job profitability ★
  - **Owner:** backend-engineer + frontend-engineer · **Deps:** P4-T001, P2-T008
  - **Files:** `src/server/services/report.service.ts`, `src/app/(app)/reports/job-profitability/**`, `src/app/(app)/jobs/[id]/**`
  - **Do:** Per C number: commission billed, reimbursement billed, reimbursable spent, **Recovery Surplus** (`plan.md` §6.2), and net margin. Complete the job detail profitability strip from P2-T005.
  - **Accept:** billing ৳10,000 reimbursement against ৳8,000 actual spend shows a ৳2,000 surplus.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P4-G1** · GATE — Test
  - **Owner:** test-engineer · **Deps:** P4-T001…P4-T006
  - **Do:** Critical test **8** (Recovery Surplus). Plus `affects_pl` derivation per category kind, upload path-traversal rejection, staff ledger totals, and E2E expense → staff ledger → job profitability.
  - **Verify:** `pnpm test && pnpm test:e2e`

- [x] **P4-G2** · GATE — Phase sign-off
  - **Owner:** coordinator · **Deps:** P4-G1
  - **Verify:** `pnpm lint && pnpm test && pnpm build && git tag phase-4-complete`

---

## Phase 5 — Loans

**Goal:** irregular borrowing and repayment, with principal correctly excluded from profit.
**Exit:** a ৳200,000 loan with a ৳30,000 principal return and a ৳5,000 profit share shows ৳170,000 outstanding; only the ৳5,000 reduces Net Profit; both appear in Cash Flow.

- [x] **P5-T001** · Loan service ★
  - **Owner:** backend-engineer · **Deps:** P4-G2
  - **Files:** `src/server/services/loan.service.ts`, `src/lib/validation/loan.ts`
  - **Do:** Loans: lender, date taken, principal, channel, purpose, free-text terms note (**no fixed rate — never model an interest rate**), status. Payments: date, amount, channel, notes, and `payment_type` (`PRINCIPAL_RETURN`/`COMMISSION`/`PROFIT_SHARE`/`OTHER`). Each payment **auto-posts a linked expense row** in the same transaction with `affects_pl = false` for `PRINCIPAL_RETURN` and `true` otherwise. `getOutstandingPrincipal(loanId)` subtracts only `PRINCIPAL_RETURN`.
  - **Accept:** deleting a loan payment reverses its posted expense row in the same transaction.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P5-T002** · Loans UI
  - **Owner:** frontend-engineer · **Deps:** P5-T001
  - **Files:** `src/app/(app)/loans/**`
  - **Do:** Loan list with outstanding principal. Entry form. Payment form where the four types carry **plain-language descriptions** — "Returning part of the original money", "Commission paid to the lender", "Share of profit paid to the lender". Irregular dates and amounts are the norm; impose no schedule.
  - **Accept:** recording an ad-hoc ৳3,000 profit share takes under 15 seconds.
  - **Verify:** `pnpm lint && pnpm build`

- [x] **P5-T003** · Loan ledger report
  - **Owner:** backend-engineer + frontend-engineer · **Deps:** P5-T002
  - **Files:** `src/server/services/report.service.ts`, `src/app/(app)/loans/[id]/**`, `src/app/(app)/reports/loan-ledger/**`
  - **Do:** Per lender and consolidated: principal taken, principal returned, **outstanding principal**, total commission and profit share paid, and the full payment history with a running balance.
  - **Accept:** outstanding principal never includes commission or profit-share payments.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P5-G1** · GATE — Test
  - **Owner:** test-engineer · **Deps:** P5-T001…P5-T003
  - **Do:** Critical test **6** — the ৳200,000 / ৳30,000 / ৳5,000 scenario, asserting P&L and Cash Flow treat principal differently. Plus auto-posting correctness and reversal on payment deletion.
  - **Verify:** `pnpm test && pnpm test:e2e`

- [x] **P5-G2** · GATE — Phase sign-off
  - **Owner:** coordinator · **Deps:** P5-G1
  - **Verify:** `pnpm lint && pnpm test && pnpm build && git tag phase-5-complete`

---

## Phase 6 — Dashboard & Reports

**Goal:** the answers the owner actually logs in for.
**Exit:** every report renders correct totals and exports to CSV, Excel and PDF; P&L excludes loan principal; Recovery Surplus is reported correctly.

- [x] **P6-T001** · Finance module ★★
  - **Owner:** **architect** · **Deps:** P5-G2
  - **Files:** `src/lib/finance/profit.ts`, `src/lib/finance/balances.ts`, `tests/unit/finance/**`
  - **Do:** Implement `plan.md` §6.1–§6.5 as named pure functions: `grossIncome`, `commissionIncome`, `serviceIncome`, `reimbursementBilled`, `reimbursableSpend`, `recoverySurplus`, `operatingExpense`, `financeCost`, `netProfit`, `clientReceivable`, `advanceOutstanding`, `loanPrincipalOutstanding`, `channelBalance`. **No screen or service may recompute any of these inline.**
  - **Accept:** **100% unit coverage.** `netProfit` excludes `PRINCIPAL_RETURN`. Rounding is exact across 1,000 randomised inputs.
  - **Verify:** `pnpm test tests/unit/finance -- --coverage`

- [x] **P6-T002** · Report aggregation layer
  - **Owner:** backend-engineer · **Deps:** P6-T001
  - **Files:** `src/server/services/report.service.ts`
  - **Do:** One aggregation layer serving all 13 reports. **Aggregate in SQL, never in JavaScript.** Every report accepts the universal filter set and supports three shapes — Import only, Export only, Consolidated — plus per-client and all-client grouping. Raw SQL only via `Prisma.sql`; sort and group-by columns **allow-listed**, never interpolated.
  - **Accept:** `EXPLAIN` shows index usage on every query; no full scan on `bills`, `expenses` or `jobs`.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P6-T003** · Universal filter bar
  - **Owner:** frontend-engineer · **Deps:** P6-T002
  - **Files:** `src/components/reports/filter-bar.tsx`, `src/app/(app)/reports/layout.tsx`
  - **Do:** One shared component: date range with presets, trade type, client multi-select, C number, invoice number, bill number, status, category, staff, channel. URL-synced so filters are shareable and survive refresh. Collapses to a sheet below `md`.
  - **Verify:** `pnpm lint && pnpm build`

- [x] **P6-T004** · Export — CSV and Excel
  - **Owner:** backend-engineer · **Deps:** P6-T002
  - **Files:** `src/lib/export/csv.ts`, `src/lib/export/excel.ts`, `src/app/api/export/[report]/route.ts`
  - **Do:** **CSV** — server-side streaming with a **UTF-8 BOM** so Excel opens Bengali text correctly. **Excel** — `exceljs` with styled headers, frozen header row, column widths, money number formats, and a filter/summary block at the top. Both **stream** — never build the full result set in memory.
  - **Accept:** a 10,000-row export completes without memory growth; Bengali client names survive the round trip into Excel.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P6-T005** · Export — PDF
  - **Owner:** backend-engineer · **Deps:** P6-T004
  - **Files:** `src/lib/export/pdf.ts`, `src/app/api/export/[report]/route.ts`
  - **Do:** Use **`pdfmake`** (pure JS, ~5 MB) for tabular report PDFs — per `plan.md` §12.5, do **not** bundle Puppeteer. Landscape A4 for wide reports, report title, filter summary, page numbers, column totals.
  - **Accept:** a 500-row report PDFs in under 5 s with no Chromium dependency.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P6-T006** · Dashboard — KPI tiles
  - **Owner:** backend-engineer + frontend-engineer · **Deps:** P6-T001
  - **Files:** `src/app/(app)/dashboard/**`, `src/components/dashboard/**`
  - **Do:** Row 1 — Bills Generated, Total Billed, Commission Billed, Total Expenditure, **Net Profit**. Row 2 — Outstanding Receivables, **Unadjusted Advances**, Cash Position by channel, Outstanding Loan Principal. All respect the period selector. One batched `$transaction` of aggregate queries, cached 60 s.
  - **Accept:** dashboard renders in under 1.5 s on seeded data; every tile deep-links to its filtered report.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P6-T007** · Dashboard — charts and alerts
  - **Owner:** frontend-engineer · **Deps:** P6-T006
  - **Files:** `src/components/dashboard/charts/**`
  - **Do:** Recharts: Income vs Expense trend, Import vs Export split, Top 5 clients by billed value. Action lists: recent bills, **advances unadjusted beyond the configured threshold**, unbilled jobs, overdue receivables. Four charts only — resist adding more.
  - **Accept:** charts are legible at 375 px and in dark theme.
  - **Verify:** `pnpm lint && pnpm build`

- [x] **P6-T008** · Reports R1–R4
  - **Owner:** backend-engineer + frontend-engineer · **Deps:** P6-T003, P6-T005
  - **Files:** `src/app/(app)/reports/bill-register/**`, `.../income/**`, `.../expense/**`, `.../staff-disbursement/**`
  - **Do:** Finalise **R1 Bill Register**, **R2 Income**, **R3 Expense**, **R4 Staff Disbursement** per `plan.md` §11 — all three shapes, per-client grouping, group subtotals, all three export formats.
  - **Accept:** every report's footer total equals the sum of its own rows.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P6-T009** · Reports R10–R11 ★
  - **Owner:** backend-engineer + frontend-engineer · **Deps:** P6-T008
  - **Files:** `src/app/(app)/reports/profit-loss/**`, `src/app/(app)/reports/cash-flow/**`
  - **Do:** **R10 Profit & Loss** using only `src/lib/finance/profit.ts`, with Import / Export / consolidated columns. **R11 Cash Flow** — all inflows and outflows by channel, opening → closing. Label them plainly — **"Business Expense"** on P&L versus **"Cash Out"** on Cash Flow — so a non-accountant is never confused about why they differ.
  - **Accept:** loan principal appears in Cash Flow and **not** in P&L; the two reports reconcile with a documented explanation of the difference.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P6-T010** · Reports R12–R13 and presets
  - **Owner:** backend-engineer + frontend-engineer · **Deps:** P6-T009
  - **Files:** `src/app/(app)/reports/audit-trail/**`, `src/server/services/report-preset.service.ts`
  - **Do:** **R13 Audit Trail** (Admin only) — who changed what, when, before → after, filterable by user, entity, action and date. Confirm **R12 Instrument Register** (P4-T005) meets the universal filter and export contract. Saved filter presets per user.
  - **Accept:** an Operator receives 403 from the audit-trail server action.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P6-G1** · GATE — Test
  - **Owner:** test-engineer · **Deps:** P6-T001…P6-T010
  - **Do:** Critical test **7** (decimal precision across the full bill path). Report totals reconcile to row sums on every report. All three export formats verified, including UTF-8 BOM and Bengali round-trip. E2E: filter → view → export each format.
  - **Verify:** `pnpm test && pnpm test:e2e`

- [x] **P6-G2** · GATE — Phase sign-off
  - **Owner:** coordinator · **Deps:** P6-G1
  - **Verify:** `pnpm lint && pnpm test && pnpm build && git tag phase-6-complete`

---

## Phase 7 — Hardening & Deployment Assets

**Goal:** production-ready, backed up, documented.
**Exit:** no Critical/High security finding open; restore drill scripted; deployment and user documentation complete.

- [x] **P7-T001** · Full security review
  - **Owner:** security-reviewer · **Deps:** P6-G2
  - **Files:** `docs/security-review.md`
  - **Do:** Complete review of the entire application against the full checklist in `agents/security-reviewer.md`. File each Critical/High as a new `P7-F<nn>` task immediately below this line, with a concrete exploit scenario.
  - **Verify:** `test -f docs/security-review.md`

- [x] **P7-T002** · Index and query verification
  - **Owner:** db-engineer · **Deps:** P6-G2
  - **Files:** `docs/query-plans.md`, `prisma/migrations/**`
  - **Do:** `EXPLAIN` every report query against a database seeded with ~5,000 bills and ~20,000 expenses. Add any missing index. Record the plans.
  - **Accept:** no full table scan on `bills`, `expenses`, `jobs` or `advance_adjustments`.
  - **Verify:** `pnpm tsx scripts/explain-check.ts`

- [x] **P7-T003** · Performance pass
  - **Owner:** backend-engineer · **Deps:** P7-T002
  - **Files:** various (optimisation only — no behaviour change)
  - **Do:** Meet `plan.md` §12.6 targets: dashboard < 1.5 s, report page < 2 s, bill save < 500 ms. Verify exports stream. Confirm cursor pagination everywhere.
  - **Accept:** targets met on a machine comparable to the target VPS.
  - **Verify:** `pnpm test && pnpm build`

- [x] **P7-T004** · Backup and restore scripts
  - **Owner:** db-engineer · **Deps:** P6-G2
  - **Files:** `scripts/backup.sh`, `scripts/restore.sh`, `scripts/offsite-sync.sh`
  - **Do:** Nightly gzipped `mysqldump` at 02:00 Asia/Dhaka, 30 daily + 12 monthly retention, uploads directory included, and an **off-server copy** (rclone or scp). Restore script with an explicit confirmation prompt. A backup living only on the VPS is not a backup.
  - **Accept:** backup → drop database → restore reproduces the data exactly, verified locally.
  - **Verify:** `bash scripts/backup.sh --dry-run && bash -n scripts/restore.sh`

- [x] **P7-T005** · Scheduled integrity job
  - **Owner:** db-engineer · **Deps:** P3-T010
  - **Files:** `scripts/integrity-check.ts`, `docs/operations.md`
  - **Do:** Wire the P3-T010 checks to a weekly cron, logging results and surfacing any breach on the Admin dashboard.
  - **Verify:** `pnpm tsx scripts/integrity-check.ts`

- [x] **P7-T006** · Deployment assets
  - **Owner:** backend-engineer · **Deps:** P7-T003
  - **Files:** `ecosystem.config.js`, `deploy/nginx.conf`, `deploy/README.md`
  - **Do:** PM2 ecosystem config (cluster mode, log rotation, `pm2 startup`). Nginx template: TLS, gzip/brotli, `client_max_body_size 6M`, long cache on `/_next/static`, proxy timeouts ≥ 120 s for exports, security headers from `plan.md` §14. **No Docker.**
  - **Verify:** `nginx -t -c deploy/nginx.conf || true; node -c ecosystem.config.js`

- [x] **P7-T007** · Deployment and backup documentation
  - **Owner:** doc-writer · **Deps:** P7-T006, P7-T004
  - **Files:** `docs/deployment.md`, `docs/backup.md`, `README.md`
  - **Do:** Per `agents/doc-writer.md` — full Ubuntu VPS provisioning with exact commands, two MySQL users (DML and DDL), release and rollback procedures, and the explicit rule that `mysqldump` runs before every `prisma migrate deploy`. Backup schedule, retention, off-server config, restore procedure. README with macOS local setup.
  - **Accept:** a competent operator could provision the server from `docs/deployment.md` alone.
  - **Verify:** `test -f docs/deployment.md && test -f docs/backup.md && test -f README.md`

- [x] **P7-T008** · User guide ★
  - **Owner:** doc-writer · **Deps:** P6-G2
  - **Files:** `docs/user-guide.md`
  - **Do:** Per `agents/doc-writer.md` — task-oriented, **no jargon**, numbered steps, written for the non-technical owner. Cover every topic listed in that file, plus a troubleshooting section mapping each plain-language error to what to do about it. Verify every menu item you document actually exists in the code.
  - **Accept:** followable by someone who did not build the system.
  - **Verify:** `test -f docs/user-guide.md`

- [x] **P7-F01** · Enforce `useSecureCookies` + boot-time `AUTH_URL` assertion
  - **Owner:** backend-engineer · **Deps:** P7-T001 · **Severity:** High
  - **Do:** Per `docs/security-review.md` P7-F01: set `useSecureCookies: process.env.NODE_ENV === "production"` explicitly in the NextAuth config (`src/server/auth.ts`), and add a boot-time assertion that in production `AUTH_URL` is set and starts with `https://` (throw otherwise, mirroring `src/server/db.ts`). Add a unit test asserting both. The Nginx `X-Forwarded-Proto $scheme` pin is delivered by P7-T006's deploy asset (cross-checked at integration).
  - **Verify:** `pnpm test tests/unit/auth.test.ts && pnpm lint && pnpm build`

- [x] **P7-F02** · Transport hardening must land with the deployment assets
  - **Owner:** backend-engineer · **Deps:** P7-T001 · **Severity:** High
  - **Do:** P7-T006's `deploy/nginx.conf` must contain, per `docs/security-review.md` P7-F02: `server { listen 80; return 301 https://$host$request_uri; }`; TLS block with `Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always`; `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` (NOT `$http_x_forwarded_for`), `X-Forwarded-Proto $scheme`, `X-Real-IP $remote_addr`, `Host $host`; `client_max_body_size 6M`; `proxy_read_timeout 120s`. This task is satisfied when P7-T006's nginx asset contains every one of these lines and `docs/deployment.md` (P7-T007) pins the MySQL `bind-address = 127.0.0.1` and UFW rules.
  - **Verify:** `grep -E "X-Forwarded-Proto|proxy_add_x_forwarded_for|Strict-Transport-Security|return 301 https|client_max_body_size 6M|proxy_read_timeout 120s" deploy/nginx.conf | wc -l` reports 6

- [x] **P7-F03** · CSV export formula injection
  - **Owner:** backend-engineer · **Deps:** P7-T001 · **Severity:** Medium
  - **Do:** Per `docs/security-review.md` P7-F03: neutralise leading `=`, `+`, `-`, `@`, TAB, CR in `escapeField` (`src/lib/export/csv.ts`) by prefixing an apostrophe, applied BEFORE quoting; skip neutralisation for money columns (`column.money === true`) so legitimate `-1234.00` values are untouched. Unit tests for `=`, `+`, `@`, TAB and a legitimate negative money cell.
  - **Verify:** `pnpm test tests/unit/csv-export.test.ts`

- [x] **P7-F04** · Make `audit_log` append-only at the engine level
  - **Owner:** db-engineer · **Deps:** P7-T001 · **Severity:** Medium
  - **Do:** Per `docs/security-review.md` P7-F04: hand-pinned migration adding `BEFORE UPDATE` and `BEFORE DELETE` triggers on `audit_log` that `SIGNAL SQLSTATE '45000'` ("audit_log is append-only"). Apply to `cnf_dev` and `cnf_test` via `prisma migrate deploy`. Add an integrity-check assertion: an `UPDATE audit_log SET action=action WHERE id=0` that succeeds is a finding (expect the trigger to make it fail — assert the failure is detected as PASS of the check). Record the expectation in `docs/operations.md`.
  - **Verify:** `pnpm tsx scripts/integrity-check.ts`

- [x] **P7-F05** · Enforce a working `script-src` CSP via per-request nonce
  - **Owner:** backend-engineer · **Deps:** P7-T001 · **Severity:** Medium
  - **Do:** Per `docs/security-review.md` P7-F05: generate a per-request nonce in `src/middleware.ts`, forward it on a request header, and emit the CSP from middleware: `default-src 'self'; script-src 'self' 'nonce-<n>' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'` plus the four directives already enforced (frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'). Remove the Report-Only header or keep it only for the script-src-with-nonce experiment per the reviewer's note. Wire the nonce into `next.config.ts`'s CSP (remove `script-src` from the static header). Smoke-test: app renders and works at /dashboard and /login in dev and production builds; E2E green.
  - **Verify:** `curl -sI http://localhost:3000/dashboard` shows an enforced CSP with `script-src` containing a nonce, and `pnpm test && pnpm test:e2e`

- [x] **P7-F06** · Loan-payment delete must be Admin-only
  - **Owner:** backend-engineer · **Deps:** P7-T001 · **Severity:** Medium
  - **Do:** Per `docs/security-review.md` P7-F06 (preferred option): narrow `deleteLoanPaymentAction` to `authorizeAction("ADMIN")` in `src/server/actions/loans.ts`, matching `cancelBillAction`/`amendBillAction`. Update the RBAC action test to assert an Operator is refused; add the E2E assertion in `tests/e2e/rbac.spec.ts` pinning the boundary. Update the loans UI to hide the delete affordance for non-Admins.
  - **Verify:** `pnpm test tests/unit/loan-actions.test.ts && pnpm test:e2e --grep "rbac"`

- [x] **P7-F07** · Raise the Server Action body limit above the 5 MB upload cap
  - **Owner:** backend-engineer · **Deps:** P7-T001 · **Severity:** Medium
  - **Do:** Per `docs/security-review.md` P7-F07: set `experimental.serverActions.bodySizeLimit: "6mb"` in `next.config.ts` (matches Nginx `client_max_body_size 6M`; the service's own 5 MB check then produces the plain-language rejection). Add an integration test attaching a 2 MB fixture (success) and a 6 MB fixture (plain-language 5 MB message).
  - **Verify:** `pnpm test tests/service/upload.service.test.ts && pnpm build`

- [x] **P7-F08** · Authentication event logging + `last_login_at`
  - **Owner:** backend-engineer · **Deps:** P7-T001 · **Severity:** Low
  - **Do:** Per `docs/security-review.md` P7-F08: in the `jwt` callback's `signIn` branch, update `users.last_login_at` and write a `USER_SIGNED_IN` audit row in the same transaction; write `USER_SIGNED_OUT` on signOut; `LOGIN_FAILED`/`LOGIN_LOCKED_OUT` in the `authorize` failure paths (email in `after_json`, `user_id: null`). Surface `lastLoginAt` in the Users list. Extend the audit-trail entity/action filters for the new verbs.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P7-F09** · Extend the Prisma ESLint guard to actions; move five queries to services
  - **Owner:** backend-engineer · **Deps:** P7-T001 · **Severity:** Low
  - **Do:** Per `docs/security-review.md` P7-F09: add `"src/server/actions/**/*.ts"` to the `no-restricted-imports` files glob in `eslint.config.mjs`; move the five offending queries into their services: picker lookups → `client.service.ts`/`channel.service.ts`, the `groupBy` → `receipt.service.ts`, and the attach/remove transaction → `expense.service.ts` as `attachExpenseFile`/`removeExpenseAttachment` (the action keeps guard + Zod + FormData). Update tests.
  - **Verify:** `pnpm lint && pnpm test && pnpm build`

- [x] **P7-F10** · One shared client-IP helper; remove the 18 private copies
  - **Owner:** backend-engineer · **Deps:** P7-T001 · **Severity:** Low
  - **Do:** Per `docs/security-review.md` P7-F10: extract one exported helper (e.g. `src/server/request-ip.ts`) implementing the trusted rightmost-hop rule with the rationale in one doc comment; have all 18 action files plus `auth.ts` call it; `auth.ts` keeps its production fail-closed wrapper for the login path. Extend `tests/unit/client-ip.test.ts` for a multi-hop header.
  - **Verify:** `pnpm test tests/unit/client-ip.test.ts && pnpm lint && pnpm build`

- [x] **P7-F11** · Sandbox the file-serving route's CSP
  - **Owner:** backend-engineer · **Deps:** P7-T001 · **Severity:** Low
  - **Do:** Per `docs/security-review.md` P7-F11: add `Content-Security-Policy: sandbox; default-src 'none'` (plus `X-Content-Type-Options: nosniff`) to the `src/app/api/files/[id]/route.ts` response headers. Keep `inline` disposition.
  - **Verify:** `pnpm test tests/unit/files-route.test.ts`

- [x] **P7-F12** · Pin `uuid` to silence the one moderate advisory
  - **Owner:** backend-engineer · **Deps:** P7-T001 · **Severity:** Low
  - **Do:** Per `docs/security-review.md` P7-F12: add a `pnpm.overrides` entry (`uuid@<11.1.1` → `>=11.1.1`) in `package.json`, reinstall, confirm `pnpm audit` shows zero vulnerabilities and the Excel export suite still passes. Commit the lockfile.
  - **Verify:** `pnpm audit && pnpm test tests/unit/excel-export.test.ts`

- [x] **P7-F13** · `UPLOAD_DIR` must fail closed in production
  - **Owner:** backend-engineer · **Deps:** P7-T001 · **Severity:** Low
  - **Do:** Per `docs/security-review.md` P7-F13: `uploadRoot()` in `src/server/services/upload.service.ts` throws in production when `UPLOAD_DIR` is unset/blank (mirroring `src/server/db.ts`); dev keeps the `uploads/` fallback. Set `UPLOAD_DIR=/var/lib/cnf-back-office/uploads` in the P7-T006 deployment assets and name that path in P7-T004's backup script (cross-checked at integration).
  - **Verify:** `pnpm test tests/service/upload.service.test.ts && pnpm build`

- [x] **P7-G1** · GATE — Final security
  - **Owner:** security-reviewer · **Deps:** P7-T001…P7-T008, P7-F01…P7-F13
  - **Do:** Re-review after all `P7-F<nn>` fixes. Confirm `npm audit` is clean of High/Critical.
  - **Verify:** `pnpm audit --audit-level=high`

- [x] **P7-F14** · Throttle login-failure audit writes (G1 M1)
  - **Owner:** backend-engineer · **Deps:** P7-G1 · **Severity:** Medium
  - **Do:** LOGIN_LOCKED_OUT at most once per IP per window; malformed credentials write no row. Proven: 30 POSTs → 6 rows. Done in commit 3c3bed3.
  - **Verify:** `pnpm test tests/unit/auth.test.ts`

- [x] **P7-F15** · Pin PM2 to a single instance (G1 M2)
  - **Owner:** backend-engineer · **Deps:** P7-G1 · **Severity:** Medium
  - **Do:** `instances: 1` in ecosystem.config.js — the in-memory login limiter's contract is single-process; cluster x2 doubled the per-IP budget (reviewer-proven). Done in commit 3c3bed3.
  - **Verify:** `node -c ecosystem.config.js`

- [x] **P7-F16** · ESLint guard bans the Prisma client from app/actions (G1 Low)
  - **Owner:** backend-engineer · **Deps:** P7-G1 · **Severity:** Low
  - **Do:** `no-restricted-imports` now covers `@/generated/prisma/client` `default`+`PrismaClient`; type-only imports and the `Prisma` namespace stay permitted. Done in commit 3c3bed3.
  - **Verify:** `pnpm lint`

- [x] **P7-F17** · Fail a misconfigured production boot at startup (G1 Low)
  - **Owner:** backend-engineer · **Deps:** P7-G1 · **Severity:** Low
  - **Do:** AUTH_URL assertion moved to `src/instrumentation.ts` register() via dependency-free `src/server/session-config.ts` — a bad AUTH_URL now exits the process at boot (PM2 sees the non-zero exit) instead of 500ing every route. Proven live.
  - **Verify:** `pnpm build`

- [x] **P7-F18** · Integrity append-only probe: skip cleanly on an empty audit_log (G1 Low)
  - **Owner:** db-engineer · **Deps:** P7-G1 · **Severity:** Low
  - **Do:** No row → no probe (a BEFORE trigger only fires per matched row); PASS with a note. Done in commit 3c3bed3.
  - **Verify:** `pnpm tsx scripts/integrity-check.ts`

- [x] **P7-F19** · Document offsite-backup encryption status (G1 Low)
  - **Owner:** db-engineer · **Deps:** P7-G1 · **Severity:** Low
  - **Do:** offsite-sync.sh header warns the copy is unencrypted at rest and the remote must be trusted or wrapped (age/gpg/rclone crypt). Done in commit 3c3bed3.
  - **Verify:** `bash -n scripts/offsite-sync.sh`

- [x] **P7-F20** · Deployment docs must pin ONE PM2 worker (G1 M3)
  - **Owner:** backend-engineer · **Deps:** P7-G1 · **Severity:** Medium
  - **Do:** docs/deployment.md (diagram, §10, go-live checklist) and deploy/README.md still mandated two workers, silently restoring the doubled login budget. All now pin one worker with the rationale. Done in commit 5a33484.
  - **Verify:** `grep -c "2 workers" docs/deployment.md deploy/README.md` reports 0

- [x] **P7-F21** · M1 throttle needs a unit regression (G1 Low)
  - **Owner:** backend-engineer · **Deps:** P7-G1 · **Severity:** Low
  - **Do:** export `mayWriteLockedOutAudit` + 4 tests (first write allowed, window throttle, window re-open, per-IP independence). Done in commit 5a33484.
  - **Verify:** `pnpm test tests/unit/auth.test.ts`

- [x] **P7-F22** · Integrity probe must verify triggers on an empty audit_log (G1 Low)
  - **Owner:** db-engineer · **Deps:** P7-G1 · **Severity:** Low
  - **Do:** empty-audit_log branch now checks information_schema for both triggers (a restore drill cannot false-certify). Proven live. Done in commit 5a33484.
  - **Verify:** `pnpm tsx scripts/integrity-check.ts`
prisma:error 
Invalid `prisma.$executeRaw()` invocation:


Raw query failed. Code: `1644`. Message: `audit_log is append-only`
[PASS] Advance invariant — per client, Σ advances.amount − Σ advance_adjustments.amount ≥ 0 (plan.md §8.4)
[PASS] Bill totals — every bill satisfies net_payable = subtotal − deduction_total
[PASS] Adjustment rows — every issued ADVANCE_ADJUSTMENT bill line has at least one advance_adjustments row
[PASS] Totals vs lines — stored subtotal/deduction_total equal the sums of the bill's own lines
[PASS] Receipt allocations — per receipt, Σ receipt_allocations.amount ≤ receipts.amount
[PASS] Bill allocations — per bill, Σ receipt_allocations ≤ net_payable (plan.md §6.5)
[PASS] Orphaned adjustments — no advance_adjustments row survives on a CANCELLED bill (ADR 0004 §4)
[PASS] Audit log append-only — UPDATE/DELETE on audit_log are refused by the database (P7-F04 triggers)
[PASS] Adjustment amounts — advance_adjustments.amount > 0 (CHECK constraint backstop)
[WARN] Bill amounts — bill subtotal / deduction_total / net_payable are not negative
       58 offending row(s):
         • bill 51 (2026-17): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 52 (2026-18): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 53 (2026-19): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 54 (2026-20): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 55 (2026-21): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 56 (2026-22): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 57 (2026-23): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 58 (2026-24): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 59 (2026-25): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 60 (2026-26): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 61 (2026-27): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 62 (2026-28): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 63 (2026-29): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 64 (2026-30): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 65 (2026-31): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 66 (2026-32): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 71 (2026-37): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 72 (draft, no number): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 73 (2026-38): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 74 (2026-39): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 75 (2026-40): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 76 (2026-41): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 77 (2026-42): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 78 (2026-43): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 79 (2026-44): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 80 (2026-45): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 81 (2026-46): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 82 (2026-47): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 83 (2026-48): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 84 (2026-49): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 85 (2026-50): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 86 (2026-51): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 87 (2026-52): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 88 (2026-53): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 89 (2026-54): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 90 (2026-55): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 91 (draft, no number): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 92 (2026-56): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 93 (draft, no number): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 94 (2026-57): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 95 (2026-58): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 96 (2026-59): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 97 (2026-60): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 98 (2026-61): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 99 (2026-62): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 100 (2026-63): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 101 (2026-64): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 102 (2026-65): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 103 (2026-66): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 104 (2026-67): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 105 (2026-68): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 106 (2026-69): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 107 (2026-70): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 108 (2026-71): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 109 (2026-72): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 110 (2026-73): subtotal 0.00, deductions 10,000.00, net payable -10,000.00
         • bill 111 (2026-74): subtotal 0.00, deductions 5,000.00, net payable -5,000.00
         • bill 112 (draft, no number): subtotal 0.00, deductions 10,000.00, net payable -10,000.00

All integrity checks passed in 0.1s. · Document offsite-backup encryption status (G1 Low)
  - **Owner:** db-engineer · **Deps:** P7-G1 · **Severity:** Low
  - **Do:** offsite-sync.sh header warns the copy is unencrypted at rest and the remote must be trusted or wrapped (age/gpg/rclone crypt). Done in commit 3c3bed3.
  - **Verify:** `bash -n scripts/offsite-sync.sh`

- [x] **P7-G2** · GATE — Phase sign-off
  - **Owner:** coordinator · **Deps:** P7-G1
  - **Verify:** `pnpm lint && pnpm test && pnpm test:e2e && pnpm build && git tag phase-7-complete`

---

## Phase 8 — UAT & Go-Live 🧑

**Every task in this phase requires the human.** The loop stops here and writes a handoff.

- [ ] **P8-T001** · 🧑 HUMAN — Letterhead print alignment
  - **Do:** Print a real bill on actual TAMANNA TRADERS letterhead paper. Measure the required top margin in mm and set it in Settings → Organisation. Reprint and confirm alignment.
  - **Why the loop cannot do this:** it requires physical paper and a printer.

- [ ] **P8-T002** · 🧑 HUMAN — Answer the open questions
  - **Do:** Resolve `plan.md` §21 Q1–Q6 with the client: P&L visibility for Operators, VAT/AIT on bills, letterhead margin, printable money receipts, advance alert threshold, and how many historical years to load. File any resulting change as a new task.

- [ ] **P8-T003** · 🧑 HUMAN — VPS provisioning
  - **Do:** Provision the Ubuntu VPS following `docs/deployment.md`. Requires server credentials, a domain and DNS — none of which the loop has or should have.

- [ ] **P8-T004** · 🧑 HUMAN — Restore drill
  - **Do:** Run a real backup → restore cycle on the VPS. Record the measured restore time in `docs/backup.md`. **Do not go live before this passes.**

- [ ] **P8-T005** · 🧑 HUMAN — Historical data load
  - **Do:** Load the current year's bills, all open advances, and all outstanding loans. Reconcile the advance ledger against the owner's own records — this is the moment the system proves its value.

- [ ] **P8-T006** · 🧑 HUMAN — Owner training and go-live
  - **Do:** Walk the owner through `docs/user-guide.md`. **Acceptance:** he independently creates a bill, records an expense and reads the advance ledger with no assistance. Then go live, with a parallel-run period against the old method.

---

## Appendix — Task Index

| Phase | Tasks | Gates | Focus |
|-------|-------|-------|-------|
| 0 Foundation | 12 | 3 | Stack, schema, auth, shell |
| 1 Master Data | 12 | 2 | Every configurable list |
| 2 Billing ★ | 13 | 3 | C number → numbered bill → letterhead |
| 3 Money In ★ | 10 | 3 | Advance engine — highest risk |
| 4 Money Out | 6 | 2 | Expenses, staff, instruments |
| 5 Loans | 3 | 2 | Irregular repayment, principal ≠ expense |
| 6 Reports | 10 | 2 | Finance module, dashboard, 13 reports, exports |
| 7 Hardening | 8 | 2 | Security, performance, backup, docs |
| 8 Go-Live 🧑 | 6 | — | Human only |
| **Total** | **80** | **19** | |
