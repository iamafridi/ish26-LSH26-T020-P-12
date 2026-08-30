# Making a change and releasing it safely

How to fix a bug or add a feature on your MacBook, prove it works, ship it to
the server, and undo it if it goes wrong — without ever putting the real
business data at risk.

Read [§1](#1-the-three-places-your-code-lives) and [§2](#2-five-rules-that-keep-you-safe)
once. After that, [§12](#12-the-one-page-summary) is the page to keep open.

---

## Contents

1. [The three places your code lives](#1-the-three-places-your-code-lives)
2. [Five rules that keep you safe](#2-five-rules-that-keep-you-safe)
3. [Making the change on your Mac](#3-making-the-change-on-your-mac)
4. [Testing it properly](#4-testing-it-properly)
5. [Testing against a copy of the REAL data](#5-testing-against-a-copy-of-the-real-data)
6. [Version numbers](#6-version-numbers)
7. [Cutting a release](#7-cutting-a-release)
8. [Releasing to the server](#8-releasing-to-the-server)
9. [Checking the release worked](#9-checking-the-release-worked)
10. [Rolling back](#10-rolling-back)
11. [Database changes — the dangerous part](#11-database-changes--the-dangerous-part)
12. [The one-page summary](#12-the-one-page-summary)

---

## 1. The three places your code lives

```
   YOUR MACBOOK                GITHUB                    THE VPS
   ~/dev/cnf-back-office  →   the safe copy      →   /var/www/cnf-back-office
   where you change and       and the history          where the business
   test things                                          actually runs

   database: cnf_dev          (no database)            database: cnf_prod
   FAKE data you can          ─────────────            REAL money records
   break freely                                        NEVER experiment here
```

Work always flows **left to right**. You never edit files on the VPS, and you
never test against the real database.

---

## 2. Five rules that keep you safe

**1. Never edit files directly on the server.** The next release overwrites
them and you lose the change with no record of it.

**2. Never test against the production database.** Test on your Mac. If you
need realistic data, take a *copy* — [§5](#5-testing-against-a-copy-of-the-real-data).

**3. Always back up before releasing.** Especially before a database change.
The release steps include it; do not skip it because you are in a hurry.

**4. One change at a time.** If you release a bug fix and a new feature
together and something breaks, you do not know which one did it.

**5. Release when you can watch it.** Not at 6pm on Thursday, not before a
holiday. If it goes wrong you want to be at your desk.

---

## 3. Making the change on your Mac

### Step 1 — start from the latest code

```bash
cd ~/dev/cnf-back-office
git checkout main
git pull
pnpm install
```

### Step 2 — make a branch

A branch is a private workspace. `main` stays working while you experiment.

```bash
git checkout -b fix/bill-print-margin
```

Name it after what it does:

| Kind of work | Name it |
|---|---|
| Fixing something broken | `fix/short-description` |
| Adding something new | `feature/short-description` |
| Wording, docs, tidying | `chore/short-description` |

### Step 3 — start the app and make the change

```bash
pnpm dev
```

Open <http://localhost:3000>, make the change, and watch it in the browser. The
page reloads as you save files.

### Step 4 — save your work

```bash
git add -A
git status              # read this — is everything listed meant to be there?
git commit -m "Fix the top margin when printing on letterhead"
```

Write the message so **you in six months** understand it. "Fixed bug" is
useless; "Fix the top margin when printing on letterhead" is not.

Commit often. Small commits are easy to undo.

---

## 4. Testing it properly

**Nothing ships until all four of these pass.** Run them in this order — each is
slower than the last, so you fail fast.

```bash
cd ~/dev/cnf-back-office

pnpm typecheck     # ~20s  — nothing refers to something that does not exist
pnpm lint          # ~30s  — code style
pnpm test          # ~25s  — 1163 logic and money tests
```

Then stop the app (**Ctrl + C**) and run the browser tests:

```bash
pnpm test:e2e      # ~4 min — drives a real browser through real workflows
```

> **Do not run `pnpm test` and `pnpm test:e2e` at the same time.** They share
> one throwaway database and will fail each other for reasons that make no
> sense.

### Then test it by hand

Automated tests do not know what you meant. Open the app and:

- do the thing you changed, and confirm it does what you wanted;
- do the thing **next to** it, and confirm you did not break that;
- if it involves money, check a report that includes it and see the number move
  the way you expect.

### If a test fails

Read the message — they are written to be read. If it names a file and a line,
open it. If you cannot see why, **do not ship it**. A failing test is the system
telling you something you do not yet know.

---

## 5. Testing against a copy of the REAL data

Some bugs only appear with real data. Take a copy — never connect to the real
database.

### Step 1 — get a backup

From Google Drive (see [backup.md §7C](./backup.md#7c-restore-from-google-drive)),
easiest from the VPS:

```bash
rclone lsd gdrive:CNF-Backups/daily          # pick a date
rclone copy "gdrive:CNF-Backups/daily/20260817-020000" ~/restore/set -P
```

Then copy it to your Mac:

```bash
# on your Mac
scp cnf@YOUR_SERVER_IP:~/restore/set/database.sql.gz ~/Downloads/
```

### Step 2 — load it into a SCRATCH database

Never into `cnf_dev` — a separate one, so you can throw it away:

```bash
cd ~/dev/cnf-back-office && source .env
mysql -h 127.0.0.1 -P 3307 -u cnf_migrate -p \
  -e "DROP DATABASE IF EXISTS cnf_realcopy; CREATE DATABASE cnf_realcopy CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
gunzip -c ~/Downloads/database.sql.gz | mysql -h 127.0.0.1 -P 3307 -u cnf_migrate -p cnf_realcopy
```

### Step 3 — point the app at the copy, just for this session

```bash
DATABASE_URL="mysql://cnf_migrate:PASSWORD@127.0.0.1:3307/cnf_realcopy" \
DATABASE_URL_APP="mysql://cnf_migrate:PASSWORD@127.0.0.1:3307/cnf_realcopy" \
pnpm dev
```

Because the variables are given on the command line, they last only for that
run. Close it and you are back on `cnf_dev`.

### Step 4 — throw the copy away

```bash
mysql -h 127.0.0.1 -P 3307 -u cnf_migrate -p -e "DROP DATABASE cnf_realcopy;"
rm ~/Downloads/database.sql.gz
```

> That file contains every client's finances and every password hash. Do not
> leave it in Downloads.

---

## 6. Version numbers

A version number is a label you can point at: *"the server is running 1.4.0"*.
It lives in `package.json`.

The three numbers are `MAJOR.MINOR.PATCH` — for example `1.4.2`:

| Part | Bump it when | Example |
|---|---|---|
| **PATCH** (`1.4.2` → `1.4.3`) | You fixed something, nothing new | Print margin fix |
| **MINOR** (`1.4.3` → `1.5.0`) | You added something, old things still work | New report |
| **MAJOR** (`1.5.0` → `2.0.0`) | Something works differently and needs re-learning | Rebuilt billing screen |

Rules of thumb:

- Every release gets a new number. Never release the same number twice.
- Numbers only go up.
- Doubting between PATCH and MINOR? If the owner would notice something new,
  it is MINOR.

### Bumping it

```bash
# pick ONE
pnpm version patch --no-git-tag-version    # 1.4.2 → 1.4.3
pnpm version minor --no-git-tag-version    # 1.4.3 → 1.5.0
pnpm version major --no-git-tag-version    # 1.5.0 → 2.0.0
```

That edits `package.json` only. You commit and tag it yourself in the next
section, so nothing happens by surprise.

---

## 7. Cutting a release

Once your branch is finished and all four test commands pass.

### Step 1 — merge into `main`

```bash
git checkout main
git pull
git merge fix/bill-print-margin
```

If git reports a **conflict**, it is telling you two changes touched the same
line and it will not guess. Open the file, keep the right version, then:

```bash
git add -A
git commit
```

### Step 2 — run the tests again, on `main`

Merging can combine two individually-fine changes into a broken one.

```bash
pnpm typecheck && pnpm lint && pnpm test
```

### Step 3 — bump the version and write down what changed

```bash
pnpm version patch --no-git-tag-version
```

Add an entry at the top of `CHANGELOG.md` (create it if missing):

```markdown
## 1.4.3 — 2026-08-20

### Fixed
- Bills printed on letterhead started too high on the page.
```

Then:

```bash
git add -A
git commit -m "Release 1.4.3"
```

### Step 4 — tag it

A tag is a permanent bookmark. **This is what makes rollback easy** — without
tags you are hunting through commit hashes at the worst possible moment.

```bash
git tag -a v1.4.3 -m "Release 1.4.3 — letterhead print margin fix"
git push origin main
git push origin v1.4.3
```

Check your tags any time with `git tag -l`.

---

## 8. Releasing to the server

Log in as the application user:

```bash
ssh cnf@YOUR_SERVER_IP
cd /var/www/cnf-back-office
```

### Step 1 — write down what is running now

**Do this first.** It is what you roll back to.

```bash
git describe --tags        # e.g. v1.4.2
node -p "require('./package.json').version"
```

Write it on paper. Really.

### Step 2 — back up

**Never skip this.**

```bash
bash scripts/backup.sh --no-offsite --label pre-release
```

Confirm it finished with `result OK`.

### Step 3 — get the new code

```bash
git fetch --all --tags
git checkout v1.4.3
```

Checking out the **tag**, not `main`, means you deploy exactly what you tested —
not whatever landed on `main` in the meantime.

### Step 4 — install dependencies

```bash
pnpm install --frozen-lockfile
```

`--frozen-lockfile` installs the exact versions you tested with. If it errors,
`pnpm-lock.yaml` was not committed — go back and commit it.

### Step 5 — apply database changes

```bash
pnpm prisma migrate deploy
```

Safe to run when there is nothing to do — it says so. If it errors, **stop** and
go to [§11](#11-database-changes--the-dangerous-part).

### Step 6 — build

```bash
pnpm build
```

This takes a minute or two. The old version is still serving throughout.

### Step 7 — switch over

```bash
pm2 reload cnf-back-office
```

`reload` starts the new version before stopping the old, so nobody sees an
error page.

### Step 8 — watch it start

```bash
pm2 logs cnf-back-office --lines 50
```

Leave this running for a minute. You want quiet. `Ctrl + C` to stop watching
(that does not stop the app).

---

## 9. Checking the release worked

Do all five, in the browser, on the real site:

1. **Sign in.** If login is broken, nothing else matters.
2. **Open the dashboard.** Do the numbers look like yesterday's?
3. **Open a recent bill.** Does it show its lines and totals?
4. **Do the thing you changed.** Does it do what you intended?
5. **Print one bill.** Printing breaks in ways nothing else catches.

Then confirm the version:

```bash
node -p "require('./package.json').version"
```

If all five are fine, you are done. Tell whoever uses the system what changed.

**If any of them are wrong → [roll back now](#10-rolling-back).** Do not debug on
a live system with the owner waiting. Roll back first, investigate afterwards.

---

## 10. Rolling back

Two situations. Check which you are in **first**:

```bash
cd /var/www/cnf-back-office
git log --oneline -1                       # what is deployed
ls prisma/migrations | tail -3             # newest migrations
```

Ask: **did this release include a database change?** If `pnpm prisma migrate
deploy` in Step 5 said "No pending migrations", the answer is no.

### Case A — no database change (the common case)

Go back to the previous tag:

```bash
cd /var/www/cnf-back-office

git fetch --all --tags
git checkout v1.4.2          # the version you wrote down in Step 1

pnpm install --frozen-lockfile
pnpm build
pm2 reload cnf-back-office

pm2 logs cnf-back-office --lines 30
```

Takes about three minutes. Nothing is lost — no data was touched.

### Case B — the release changed the database

Harder, because the old code may not understand the new database shape.

**Try this first — leave the database alone:**

Most migrations *add* things (a new table, a new column). Old code usually
ignores those happily. So do Case A and test. If the app works, stop here: you
have rolled back the code and the extra column is harmless.

**Only if that fails, restore the database:**

```bash
# 1. Stop the app so nothing writes while you work
pm2 stop cnf-back-office

# 2. Restore the backup you took in Step 2
cd /var/www/cnf-back-office
bash scripts/restore.sh --list                    # find the pre-release set
bash scripts/restore.sh --from /var/backups/cnf-back-office/daily/THE_SET

# 3. Put the old code back
git checkout v1.4.2
pnpm install --frozen-lockfile
pnpm build

# 4. Start again
pm2 start cnf-back-office
pm2 logs cnf-back-office --lines 30
```

> ⚠️ **Restoring the database loses everything entered since that backup.** If
> the release has been live for hours, that could be a day's work. This is why
> Case A is always tried first, and why database changes deserve extra care.

### Rehearse it once

Do a rollback deliberately, on a quiet afternoon, when nothing is wrong. Ten
minutes now saves you panicking later. Release a trivial change, then roll it
back and confirm the site still works.

---

## 11. Database changes — the dangerous part

Code can always be swapped back. Data cannot. Treat these differently.

### Making one

Never edit tables by hand. Always:

```bash
# 1. edit prisma/schema.prisma on your Mac
# 2. create the migration
pnpm db:migrate
#    it asks for a name — say what it does, e.g. "add_expense_job_split"
# 3. check the SQL it wrote
cat prisma/migrations/*_add_expense_job_split/migration.sql
# 4. commit the whole folder
git add prisma/
git commit -m "Add the expense job split table"
```

The `prisma/migrations/` folder is the record of every change ever made. It is
how your Mac and the server stay in step. **Never edit or delete a migration
that has already been released.**

### Safe vs risky changes

| Change | Risk | Why |
|---|---|---|
| Add a new table | **Safe** | Nothing referenced it before |
| Add a nullable column | **Safe** | Old rows get NULL, old code ignores it |
| Add an index | **Safe** | Only affects speed |
| Add a NOT NULL column with a default | **Careful** | Fine, but must have a default |
| Rename a column | **Risky** | Old code looks for the old name — breaks instantly |
| Delete a column | **Dangerous** | The data is gone. Backup is the only way back. |
| Change a column's type | **Dangerous** | Can silently truncate values |

For anything past "Careful": test it against a copy of real data first
([§5](#5-testing-against-a-copy-of-the-real-data)), and take the backup
seriously.

### Rehearse a risky migration

```bash
# on your Mac, against a copy of production
mysql -h 127.0.0.1 -P 3307 -u cnf_migrate -p \
  -e "DROP DATABASE IF EXISTS cnf_migtest; CREATE DATABASE cnf_migtest CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
gunzip -c ~/Downloads/database.sql.gz | mysql -h 127.0.0.1 -P 3307 -u cnf_migrate -p cnf_migtest

DATABASE_URL="mysql://cnf_migrate:PASSWORD@127.0.0.1:3307/cnf_migtest" pnpm prisma migrate deploy
```

If it works on a copy of the real data, it will work on the real thing.

---

## 12. The one-page summary

### Fixing a bug, start to finish

```bash
# ---------- ON YOUR MAC ----------
cd ~/dev/cnf-back-office
git checkout main && git pull
git checkout -b fix/what-it-is

pnpm dev                                    # make the change, watch it work
git add -A && git commit -m "Say what you fixed"

pnpm typecheck && pnpm lint && pnpm test    # then Ctrl+C the app:
pnpm test:e2e

git checkout main && git merge fix/what-it-is
pnpm typecheck && pnpm lint && pnpm test    # again, on main
pnpm version patch --no-git-tag-version     # 1.4.2 → 1.4.3
# add an entry to CHANGELOG.md
git add -A && git commit -m "Release 1.4.3"
git tag -a v1.4.3 -m "Release 1.4.3 — what it fixes"
git push origin main && git push origin v1.4.3

# ---------- ON THE SERVER ----------
ssh cnf@YOUR_SERVER_IP && cd /var/www/cnf-back-office
git describe --tags                         # WRITE THIS DOWN
bash scripts/backup.sh --no-offsite --label pre-release
git fetch --all --tags && git checkout v1.4.3
pnpm install --frozen-lockfile
pnpm prisma migrate deploy
pnpm build
pm2 reload cnf-back-office
pm2 logs cnf-back-office --lines 50
```

Then check the [five things](#9-checking-the-release-worked) in the browser.

### Something is wrong — roll back

```bash
ssh cnf@YOUR_SERVER_IP && cd /var/www/cnf-back-office
git fetch --all --tags
git checkout v1.4.2                         # the number you wrote down
pnpm install --frozen-lockfile
pnpm build
pm2 reload cnf-back-office
```

If the release changed the database and that is not enough, see
[Case B](#case-b--the-release-changed-the-database).

### Commands you will use constantly

| Want to | Command |
|---|---|
| See what version is running | `node -p "require('./package.json').version"` |
| See which release is deployed | `git describe --tags` |
| List all releases | `git tag -l` |
| See what changed between releases | `git log --oneline v1.4.2..v1.4.3` |
| Is the app running? | `pm2 status` |
| Why did it stop? | `pm2 logs cnf-back-office --lines 100` |
| Restart it | `pm2 reload cnf-back-office` |

### Never do these

- ❌ Edit files on the server
- ❌ Point your development app at the production database
- ❌ Release without running the tests
- ❌ Release a database change without a fresh backup
- ❌ Delete or edit a migration that has already been released
- ❌ Release on a Thursday evening
