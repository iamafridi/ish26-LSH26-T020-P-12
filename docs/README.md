# TAMANNA TRADERS — CNF Back Office

Clearing and Forwarding agent back office system. Next.js 15, TypeScript strict,
Tailwind v4, shadcn/ui, MySQL 8, Prisma, Auth.js v5.

---

## Local development (macOS)

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 22 LTS | `brew install node@22` |
| pnpm | 11.x | `corepack enable && corepack prepare pnpm@11.21.0 --activate` |
| MySQL | 8.4 | `brew install mysql@8.4` |
| Git | any | Xcode Command Line Tools |

### 1. Start MySQL

Homebrew's keg-only MySQL is not on PATH by default:

```bash
brew services start mysql@8.4

# Verify it is running on port 3307 (Homebrew default)
mysql -u root -P 3307 -e "SELECT VERSION();"
```

If port 3307 is already taken, edit `$(brew --prefix mysql@8.4)/my.cnf` and set
`port = 3308`, then restart.

### 2. Create the database

```bash
mysql -u root -P 3307 -e "CREATE DATABASE cnf_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
mysql -u root -P 3307 -e "CREATE DATABASE cnf_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
```

### 3. Clone and install

```bash
git clone <repository-url> cnf-back-office
cd cnf-back-office
pnpm install
```

### 4. Create your .env

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```bash
# Both can use the same user in development
DATABASE_URL=mysql://root:@127.0.0.1:3307/cnf_dev
DATABASE_URL_APP=mysql://root:@127.0.0.1:3307/cnf_dev
SHADOW_DATABASE_URL=mysql://root:@127.0.0.1:3307/cnf_shadow

# Generate a secret: openssl rand -base64 32
AUTH_SECRET=<your-generated-secret>

# Local development
AUTH_URL=http://localhost:3000

# Uploads (optional in dev)
UPLOAD_DIR=./uploads

TZ=Asia/Dhaka
```

### 5. Reset the database and seed

```bash
pnpm db:reset && pnpm db:seed
```

This drops all tables, recreates them from the schema, and seeds the admin user
and reference data.

### 6. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with the seeded
admin credentials (check `prisma/seed.ts` for the default email and password).

---

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start the Next.js development server (hot reload). |
| `pnpm build` | Generate Prisma client and build the production bundle. |
| `pnpm start` | Start the production server (requires `pnpm build` first). |
| `pnpm lint` | Run ESLint. |
| `pnpm lint:fix` | Run ESLint with auto-fix. |
| `pnpm format` | Format code with Prettier. |
| `pnpm format:check` | Check formatting without writing. |
| `pnpm typecheck` | TypeScript type check (`tsc --noEmit`). |
| `pnpm test` | Run unit tests with Vitest. |
| `pnpm test:watch` | Run tests in watch mode. |
| `pnpm test:coverage` | Run tests with coverage report. |
| `pnpm test:e2e` | Run Playwright end-to-end tests. |
| `pnpm db:migrate` | Create a new Prisma migration (development). |
| `pnpm db:deploy` | Apply pending migrations (production). |
| `pnpm db:seed` | Seed the database with initial data. |
| `pnpm db:reset` | Drop all tables, recreate, and re-seed. |
| `pnpm db:studio` | Open Prisma Studio (visual database browser). |
| `pnpm db:check` | Check the database is reachable. Run this first whenever a login fails. |
| `pnpm admin:reset-password` | Set a new password for the administrator, on the machine holding the database. |
| `pnpm db:integrity` | Run the weekly integrity check (needs a real database). |

---

## Project structure

```
cnf-back-office/
├── prisma/              # Schema, migrations, seed
├── src/
│   ├── app/             # Next.js 15 App Router pages and API routes
│   ├── components/      # React components (shadcn/ui)
│   ├── lib/             # Shared utilities (validation, export, money)
│   ├── server/          # Server-side code
│   │   ├── services/    # Business logic (the only place Prisma is called)
│   │   ├── auth.ts      # Auth.js configuration
│   │   └── db.ts        # Prisma client
│   └── middleware.ts    # Route protection
├── scripts/             # Backup, restore, integrity check
├── deploy/              # Nginx config, PM2 ecosystem
├── docs/                # Documentation
└── tests/               # Unit and E2E tests
```

---

## Documentation

| Document | What it covers |
|---|---|
| [User manual](docs/user-guide.md) | The complete manual — how to use the system, step by step, written for someone who knows the business but not computers. |
| [Local development](docs/local-development.md) | Restarting after a reboot, running the tests, and inspecting the database (Prisma Studio, or a free GUI). |
| [Release process](docs/release-process.md) | Fixing a bug or adding a feature: branch, test, version, tag, release, and roll back. |
| [Deployment](docs/deployment.md) | Ubuntu VPS provisioning, MySQL users, PM2, Nginx, TLS, release and rollback. |
| [Deployment on Windows](docs/deployment-windows.md) | Running the system on an office Windows 10/11 PC so the whole network can use it, written for a non-technical reader. |
| [Windows → Ubuntu VPS](docs/migrating-windows-to-ubuntu-vps.md) | Moving from the office PC to a rented Ubuntu server later, with a rollback plan. |
| [Backups and restore](docs/backup.md) | The complete backup guide, written for a non-technical reader: manual and nightly backups, the Google Drive copy, how to verify each, and four restore procedures. |
| [Operations runbook](docs/operations.md) | Scheduled cron jobs, integrity check, monthly review. |
| [Security review](docs/security-review.md) | Full application security review. |
| [Query plans](docs/query-plans.md) | Database query performance analysis. |
| [ADR 0001](docs/adr/0001-data-model.md) | Data model decisions. |
| [ADR 0002](docs/adr/0002-bill-numbering.md) | Bill numbering strategy. |
| [ADR 0003](docs/adr/0003-bill-line-model.md) | Bill line model decisions. |
| [ADR 0004](docs/adr/0004-advance-engine.md) | Advance adjustment engine decisions. |

---

## Hard rules

1. Money is never a JavaScript number. MySQL `DECIMAL(18,2)`, Prisma `Decimal`.
2. No Prisma calls outside `src/server/services/`.
3. Every multi-table write runs inside `prisma.$transaction`.
4. Every server action re-checks the session role server-side.
5. Business dates are MySQL `DATE` (no time). Audit timestamps are `DATETIME` in UTC.
6. Every financial mutation writes an `audit_log` row.
7. Bill lines snapshot label, value_type, and revenue_class.
8. Zod-validate every input at the boundary. Never concatenate SQL.
