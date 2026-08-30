# Running the app on your MacBook

Everything you need after a restart, plus how to look inside the database.

Written for the owner, not a developer. Every command is copy-paste, run in
**Terminal**, and the `$` is not part of the command.

---

## 1. After restarting the MacBook

The app needs two things running: **MySQL** (the database) and the **app
itself**. MySQL usually restarts on its own; the app never does.

### Step 1 — check MySQL is running

```bash
brew services list
```

Look for the line starting `mysql@8.4`. If it says **started**, skip to Step 2.
If it says `stopped` or `error`:

```bash
brew services start mysql@8.4
```

Wait about ten seconds, then confirm the database is answering:

```bash
mysqladmin -h 127.0.0.1 -P 3307 -u root ping
```

You want to see `mysqld is alive`.

> **Why port 3307?** There are two MySQL installations on this machine. The one
> this app uses listens on **3307**, not the usual 3306. Always pass
> `-P 3307` or you will connect to the wrong server and see an empty database.

### Step 2 — start the app

```bash
cd ~/dev/cnf-back-office
pnpm dev
```

Leave that Terminal window open — closing it stops the app. Wait for:

```
✓ Ready in ...
- Local: http://localhost:3000
```

> **Read that last line.** If it says **3001** (or any other number), a second
> copy of the app is already running and has taken 3000. Do not carry on at
> 3001 — **you will not be able to log in.** Sign-in is checked against the one
> address in `.env` (`AUTH_URL="http://localhost:3000"`), so on any other port
> the page loads but the login is rejected. Fix it before going further:
>
> ```bash
> # in this Terminal press Ctrl + C first, then:
> pkill -f "next dev"     # stop every copy
> pgrep -f "next dev"     # prints nothing when they are all stopped
> pnpm dev                # start one, on 3000
> ```

### Step 3 — open it

Go to <http://localhost:3000> and sign in as
`admin@tamannatraders.local` with your own password.

### To stop the app

Click the Terminal window and press **Ctrl + C**.

---

## 2. Two rules that will save you an hour

**Never run `pnpm build` while `pnpm dev` is running.** They both write to the
same `.next` folder and they corrupt each other. The running app then throws
500 errors on every page. If that happens:

```bash
# in the Terminal running the app, press Ctrl + C first
rm -rf ~/dev/cnf-back-office/.next
cd ~/dev/cnf-back-office && pnpm dev
```

**Never run `pnpm test` and `pnpm test:e2e` at the same time.** They share one
throwaway database and will fail each other with confusing errors.

---

## 3. Running the tests

Stop the app first for the browser tests; the others are fine alongside it.

| What | Command | Takes |
|---|---|---|
| Types are correct | `pnpm typecheck` | ~20s |
| Code style | `pnpm lint` | ~30s |
| Logic + money maths (1163 tests) | `pnpm test` | ~25s |
| Real browser, end to end | `pnpm test:e2e` | ~4 min |

`pnpm test:e2e` builds the app and drives it in a real browser against a
**separate** throwaway database (`cnf_test`). It never touches your data.

---

## 4. Looking inside the database

You are used to phpMyAdmin. Three options, easiest first. **Prisma Studio needs
no setup at all** — start there.

### Option A — Prisma Studio (works immediately, nothing to configure)

Start here. No install, no password, no port to get wrong.

```bash
cd ~/dev/cnf-back-office
pnpm db:studio
```

It opens <http://localhost:5555>: tables down the left, rows in a grid, click a
cell to edit, **Save changes** to commit. Stop it with **Ctrl + C**.

It cannot run raw SQL — for that use [Option C](#option-c--the-command-line).

### Option B — a free GUI, if you want a phpMyAdmin-style window

Prisma Studio covers day-to-day looking and editing. If you specifically want a
desktop window with a table tree and a SQL editor, these are **free**:

| Tool | Install | Notes |
|---|---|---|
| **Sequel Ace** | `brew install --cask sequel-ace` | macOS only, open source. The closest feel to phpMyAdmin. |
| **DBeaver Community** | `brew install --cask dbeaver-community` | Free and open source, works everywhere, heavier. |
| **MySQL Workbench** | `brew install --cask mysqlworkbench` | Oracle's own, free. |

> **TablePlus is not free** beyond a trial, which is why it is not recommended
> here. It was tried on this machine and removed.

Whichever you pick, use these settings — and read the warnings below them:

| Field | Value |
|---|---|
| Host | `127.0.0.1` |
| Port | **`3307`** ← not the default 3306 |
| User | `cnf_migrate` |
| Password | *(the `DATABASE_URL` password from `.env` — see below)* |
| Database | `cnf_dev` |
| SSL | Off / Disabled |

**Two things cause almost every failed connection here:**

1. **The port.** There is a *second, unrelated* MySQL on this Mac listening on
   **3306** with none of your data in it. A tool left on its default port
   connects to that one and shows an empty or unfamiliar database.
2. **The host must be `127.0.0.1`, not `localhost`.** MySQL treats them as two
   different accounts, and the project's user exists only for `127.0.0.1`. Some
   tools silently rewrite `localhost` to a socket connection, which fails with
   "Access denied for user 'cnf_migrate'@'localhost'". If your tool insists on
   `localhost`, look for a "connect over TCP/IP" option.

**To find the password:** open `~/dev/cnf-back-office/.env`. The line reads
`DATABASE_URL="mysql://cnf_migrate:THEPASSWORD@127.0.0.1:3307/cnf_dev"` — the
password is everything between the `:` and the `@`, and nothing else.

**Prove it works before blaming the tool.** If this prints a table list, the
database and the login are both fine and the problem is in the connection form:

```bash
cd ~/dev/cnf-back-office && source .env
mysql -h 127.0.0.1 -P 3307 -u cnf_migrate -p cnf_dev -e "SHOW TABLES;"
```

> ⚠️ Never create an extra database login "just for the GUI". A convenience
> account with a simple password is exactly the thing an attacker looks for,
> and it is easy to forget and leave behind. Use the project's own user.

### Option C — the command line

Quick look, no install:

```bash
cd ~/dev/cnf-back-office
source .env
mysql -h 127.0.0.1 -P 3307 -u cnf_migrate -p cnf_dev
```

It asks for the password, then you get a `mysql>` prompt:

```sql
SHOW TABLES;
SELECT * FROM clients;
SELECT id, bill_no, bill_date, net_payable, status FROM bills ORDER BY id DESC LIMIT 10;
exit
```

---

## 5. Making changes to the database safely

### ⚠️ Always back up first

```bash
mkdir -p ~/cnf-backups
cd ~/dev/cnf-back-office && source .env
mysqldump -h 127.0.0.1 -P 3307 -u cnf_migrate -p \
  --routines --triggers --single-transaction cnf_dev \
  > ~/cnf-backups/cnf_dev_$(date +%Y%m%d_%H%M%S).sql
```

To put a backup back:

```bash
mysql -h 127.0.0.1 -P 3307 -u cnf_migrate -p cnf_dev < ~/cnf-backups/THE_FILE.sql
```

### Editing DATA (a client's name, a wrong amount)

Fine to do in Prisma Studio. Prefer doing it **in the app** where you can, because
the app writes an audit record and keeps totals consistent; a direct database
edit does neither.

### Changing the STRUCTURE (a new column, a new table)

**Do not** add columns by hand in a database tool. The app keeps a record of every
structural change in `prisma/migrations/`, and a hand-made change will not be
there — so it will be missing on the server and the app will break.

Structural changes must go through the project:

```bash
# 1. edit prisma/schema.prisma
# 2. create the migration
pnpm db:migrate
# 3. commit the new folder under prisma/migrations/
```

### Three things never to edit by hand

| Table | Why |
|---|---|
| `audit_log` | Deliberately append-only — the database itself blocks changes. It is your record of who did what. |
| `bill_sequences` | Controls bill numbering. Editing it causes duplicate or skipped bill numbers. |
| `_prisma_migrations` | The list of applied structural changes. Breaking it breaks every future update. |

---

## 6. Getting the newest code

```bash
cd ~/dev/cnf-back-office
git pull
pnpm install       # only if package.json changed
pnpm db:deploy     # only if prisma/migrations/ gained a folder
pnpm dev
```

`pnpm db:deploy` applies any new structural change. It is safe to run when
there is nothing to do — it just says so.

---

## 7. When something is wrong

| Symptom | Fix |
|---|---|
| Every page shows a 500 error | `Ctrl + C`, `rm -rf .next`, `pnpm dev` |
| "Can't reach database server" | `brew services start mysql@8.4`, wait 10s |
| "Port 3000 is in use" | Another copy is running: `pkill -f "next dev"` then `pnpm dev` |
| The app opened on **3001** and login fails | Same cause — a second copy took 3000. Login only works on 3000 (`AUTH_URL` in `.env`). `pkill -f "next dev"`, then `pnpm dev` |
| A screen errors after `git pull` | You missed a migration: `pnpm db:deploy` |
| **"Incorrect email or password" after restarting the Mac** | Almost certainly NOT your password. Run `pnpm db:check` — see below. |
| Login rejected (on 3000) | Check `users.is_active = 1` for your account (Prisma Studio → `users`) |
| You forgot the admin password | `pnpm admin:reset-password` — see below |
| You deactivated something by mistake | Nothing is ever deleted. On that Settings screen set the status filter to **Deactivated**, open the row's **⋯** menu and choose **Activate** |

### "Incorrect email or password" — when it is not the password

**Check this before you touch your password.** Run:

```bash
cd ~/dev/cnf-back-office
pnpm db:check
```

It answers in plain words. If it ends with:

```
RESULT: the database is reachable and has accounts that can sign in.
```

then the database is fine and the email or password really is wrong.

If it ends with `RESULT: the database could NOT be reached properly.`, the app
never got as far as checking your password. **No password would have worked.**
The check prints the cause and the command that fixes it.

**Why this used to be so confusing.** MySQL remembers which accounts have
signed in since it last started. That memory is wiped every time MySQL
restarts — which is every time you restart the Mac. On the first login after a
restart the app could not complete its own database handshake, the sign-in
never ran, and the screen said *"Incorrect email or password"* — so it looked
like a forgotten password when the database was simply unreachable.

Two things now prevent it: the app completes that handshake on its own, and if
the database really is unreachable the login screen says so instead of blaming
your password.

### Resetting the admin password

There is only one administrator, and only an administrator can create another.
If you cannot sign in, use this — **on the computer that holds the database**,
which is the whole security control:

```bash
cd ~/dev/cnf-back-office
pnpm admin:reset-password
```

It asks for the new password twice. **Nothing appears as you type** — that is
deliberate, keep typing. Then sign in with it; the app asks you to choose your
own password straight away, so the one you just typed is only a key to get in.

The password is never written to the log. The *fact* of the reset is recorded
in the audit trail, like every other change.

If it says the database cannot be reached, run `pnpm db:check` first.

### A database GUI will not connect

The server side is not usually the problem. Work down this list.

**1. Port `3307`, not `3306`.** The most common cause by far — see the warning
above about the second MySQL on this machine.

**2. Host `127.0.0.1`, not `localhost`.** They are different accounts to MySQL.

**3. SSL off.** MySQL 8.4 authenticates with `caching_sha2_password`. A tool set
to require SSL can fail with no useful message.

**4. Database field filled in** (`cnf_dev`). The login can only see the
project's databases, so a blank field can show an empty sidebar.

**5. Password copied exactly** from `.env` — no surrounding quotes, no trailing
space.

**6. Read the tool's real error.** Most GUIs hide it behind a generic banner;
look for a logs or console window. That message is the answer.

**Check the server is up at all:**

```bash
lsof -nP -iTCP:3307 -sTCP:LISTEN     # should print a mysqld line
brew services start mysql@8.4        # if it prints nothing
```

**If a GUI still refuses, use
[Prisma Studio](#option-a--prisma-studio-works-immediately-nothing-to-configure)
or [the command line](#option-c--the-command-line).** Both talk to the same
database and neither needs configuring.

To read the app's own error messages, look at the Terminal window running
`pnpm dev` — the real reason is always printed there.
