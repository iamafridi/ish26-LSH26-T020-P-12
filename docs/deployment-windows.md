# Running the system on a Windows computer

**Who this is for:** the office manager or owner setting the system up on a
Windows 10 or Windows 11 PC, so that everyone in the office can use it from
their own computer's web browser.

You do not need to be a programmer. Every command is written out. Type it, or
copy and paste it, exactly as shown.

> **Is this a permanent choice?** No. Nothing here locks you in. When you are
> ready to move to a rented Ubuntu server on the internet, follow
> [Migrating from Windows to an Ubuntu VPS](./migrating-windows-to-ubuntu-vps.md).
> The backups this guide sets up are the exact files that migration uses, so
> doing this properly today makes that move easy later.

---

## Straight answers first

Before any of the detail, the questions that actually matter.

### Will this run on a Windows computer?

**Yes.** It runs on Windows 10 or Windows 11. Everything it needs — Node.js,
MySQL, and the rest — has a normal Windows installer. Nothing has to be
rewritten and nothing is missing.

### Can the other office computers use it?

**Yes.** One PC runs it. Everybody else opens it in Chrome or Edge, like any
website. Nothing is installed on their computers.

### Can I move it to an Ubuntu VPS later, with all the data?

**Yes — all of it.** One year, two years, ten years of bills, clients,
payments, and scanned documents. Nothing is left behind and nothing has to be
retyped.

The nightly backup this guide sets up **is** the migration file. It was built
so a Linux server can read it directly, and that was tested, not assumed. When
you are ready, follow
[Migrating from Windows to an Ubuntu VPS](./migrating-windows-to-ubuntu-vps.md).

You are not locking yourself in by starting on Windows.

### Is there a separate Windows version of the program to maintain?

**No — one repository, one branch, for both systems.** The same code runs on
Windows now and Ubuntu later. See
[One codebase, both systems](#one-codebase-both-systems).

### Can I look inside the database, like phpMyAdmin?

**Yes.** Two free ways, both in [Part 13](#part-13--looking-inside-the-database):
one that needs no installation at all, and **HeidiSQL**, which is a
phpMyAdmin-style window with a table tree and a query box.

### Can I back up to Google Drive?

**Yes.** Automatically, every night, on top of a copy kept on the office PC
itself. Step by step in [Part 12](#part-12--backups).

---

## One codebase, both systems

A fair question: *if it runs on Windows now and Ubuntu later, are there two
versions of the program to keep track of?*

**No. There is one repository, one branch, one set of code:**

> https://github.com/abh-mehedi/cnf-back-office.git

The same `main` branch runs on Windows today and on Ubuntu whenever you move.
Nothing is forked, nothing is copied, and there is no "Windows edition" to keep
in step with a "Linux edition". That was a deliberate design choice, because
two versions would drift apart and a fix made on one would quietly be missing
from the other.

**How that works:** the program itself contains no instructions that mention
Windows or Linux at all. It asks the operating system to handle file locations,
so a setting of `C:\CNF\uploads` and a setting of `/var/lib/cnf/uploads` are
both simply "wherever you said".

The only things that differ are a handful of **helper files for routine jobs**,
and both sets ship together in the same repository:

| Job | On Windows you run | On Ubuntu you run |
|---|---|---|
| Back up | `scripts\windows\backup.ps1` | `scripts/backup.sh` |
| Restore | `scripts\windows\restore.ps1` | `scripts/restore.sh` |
| Check the database | `pnpm db:check` | `pnpm db:check` — same |
| Reset the admin password | `pnpm admin:reset-password` | `pnpm admin:reset-password` — same |
| Install an update | `pnpm build` etc. | `pnpm build` etc. — same |

Only the first two rows differ, for the reason explained in
[".sh scripts" and ".ps1 scripts"](#sh-scripts-and-ps1-scripts) below. Windows
ignores the `.sh` files; Ubuntu ignores the `.ps1` files. Neither gets in the
other's way.

**What this means for you day to day:**

- Updates come from `git pull`, exactly the same command on either system.
- A fix made today is already in the version you migrate to Ubuntu later.
- When you migrate, you do **not** rebuild or convert anything. You install the
  same code on the server and move the data across.

---

## Two words used in this guide

You will meet these below. They are simpler than they sound.

### "Reverse proxy" (the Caddy step)

Think of it as **a receptionist for the office PC**.

Without it, the other computers would walk straight into the app. With it, they
speak to the receptionist, who passes the message on and — crucially — writes
down *which desk each request came from*.

Why that matters here: for security, the system **refuses to sign anyone in
unless it knows which computer is asking**. That is a deliberate protection
against password-guessing attacks. Without the receptionist that information
never arrives, and the result is that **nobody can log in at all** — everyone
sees *"Login is temporarily unavailable"*, forever, no matter how correct their
password is.

The receptionist is a single small program called **Caddy**. You set it up once
in [Part 8](#part-8--caddy-so-other-pcs-can-connect) and never touch it again.
It also gives you the padlock in the browser, so passwords are not readable by
anyone else on the office network.

**It is not optional.** Skip it and the system will not let anyone in.

### ".sh scripts" and ".ps1 scripts"

These are just **lists of commands saved in a file**, so you can run a long job
by typing one line instead of twenty.

| | Runs on | Used for |
|---|---|---|
| `.sh` (shell script) | Linux and Mac | The Ubuntu VPS, and the developer's Mac |
| `.ps1` (PowerShell script) | **Windows** | **Your office PC** |

They are two versions of the same job. Windows cannot run the `.sh` ones, so
this project has `.ps1` versions of the backup and restore jobs, in
`scripts\windows\`. **On Windows you only ever use the `.ps1` ones.** Ignore
every `.sh` file you see — those are for the VPS later.

PowerShell is already part of Windows. There is nothing to install.

---

## What you are building

One PC in the office — call it **the server PC** — runs the system. Everybody
else opens it in Chrome or Edge, like any website. There is nothing to install
on the other computers.

```
   Office network (your router/switch)
   │
   ├── SERVER PC  (Windows 10/11, always on)
   │     ├── MySQL ................ holds all the data
   │     ├── The app ............... runs quietly in the background
   │     └── Caddy ................. answers the other PCs
   │
   ├── Accounts PC   ─┐
   ├── Manager's PC  ─┼── just a web browser, nothing installed
   └── Front desk PC ─┘
```

**Rules for the server PC:**

| | |
|---|---|
| Must be **on** whenever anyone needs the system | If it sleeps, everyone is locked out |
| Must have a **fixed address** on the network | Otherwise the address changes and the links stop working |
| Should not be someone's personal machine | A person shutting down at 5pm takes the whole office offline |
| Any modern PC will do | 8 GB memory, 100 GB free disk is plenty for years of bills |

**Set it to never sleep** before you start: **Settings → System → Power &
battery → Screen and sleep** → set **When plugged in, put my device to sleep
after** to **Never**. The screen may switch off; the PC must not sleep.

---

## Part 1 — Install the five pieces

Do all of this **on the server PC**, signed in as an administrator.

### 1.1 Node.js (runs the application)

Download the **LTS** installer from <https://nodejs.org>. Choose the Windows
Installer (`.msi`), 64-bit. Accept every default.

Then open **Command Prompt** (press Start, type `cmd`, press Enter) and check:

```
node --version
```

You want a line beginning with `v22.` (or a higher even number). If Command
Prompt says `'node' is not recognized`, close it, open a new one, and try
again — a new install is not visible to windows that were already open.

### 1.2 pnpm (installs the application's parts)

```
corepack enable
corepack prepare pnpm@11.21.0 --activate
pnpm --version
```

You want `11.21.0`.

### 1.3 MySQL 8.4 (stores the data)

Download **MySQL Installer for Windows** from
<https://dev.mysql.com/downloads/installer/>.

Run it and choose:

| Prompt | Choose |
|---|---|
| Setup type | **Custom** |
| Products | **MySQL Server 8.4** and **MySQL Workbench** (Workbench is optional but handy) |
| Type and Networking | **Server Computer**, port **3306**, leave TCP/IP ticked |
| Authentication | **Use Strong Password Encryption** (the recommended one) |
| Root password | Choose a long one and **write it down somewhere safe** |
| Windows Service | **Tick "Start the MySQL Server at System Startup"** ← important |

That last tick is what makes the database come back on its own after a power
cut. Do not skip it.

Check it worked:

```
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql" -u root -p -e "SELECT VERSION();"
```

It asks for the root password, then prints a version starting `8.4`.

**Make the MySQL tools easy to reach.** Add MySQL to your PATH so you can type
`mysql` instead of the full path:

1. Press Start, type `environment`, open **Edit the system environment variables**
2. **Environment Variables…** → under **System variables** select **Path** → **Edit**
3. **New**, paste: `C:\Program Files\MySQL\MySQL Server 8.4\bin`
4. **OK** on all three windows, then **open a new Command Prompt**

Check:

```
mysql --version
mysqldump --version
```

Both must answer. `mysqldump` is what makes your backups — if it is missing,
backups will fail silently later.

### 1.4 Git (fetches the application and its updates)

Download from <https://git-scm.com/download/win> and accept the defaults.

```
git --version
```

### 1.5 Caddy (lets the other PCs connect, safely)

Download the Windows build from <https://caddyserver.com/download> — choose
**windows / amd64**, then **Download**. You get a single file,
`caddy_windows_amd64.exe`.

1. Make a folder `C:\Caddy`
2. Put the file in it and **rename it to `caddy.exe`**

```
C:\Caddy\caddy.exe version
```

> **Why is this needed?** Two reasons, both real:
>
> 1. **The sign-in will not work without it.** For safety, the system refuses
>    to log anyone in unless it can tell which computer each request came
>    from. That information reaches it only through a piece like Caddy. Without
>    it, every login fails with *"Login is temporarily unavailable."*
> 2. **It gives you HTTPS**, so passwords are not readable by anyone else on
>    the office network.

---

## Part 2 — Get the application

### 2.1 Choose a folder

```
mkdir C:\CNF
cd C:\CNF
```

### 2.2 Download the code

```
git clone https://github.com/abh-mehedi/cnf-back-office.git app
cd C:\CNF\app
```

That is the same repository the developer works in, and the same one an Ubuntu
server would use. There is no separate Windows version to find — see
[One codebase, both systems](#one-codebase-both-systems) below.

If the repository is private, Git will ask for your GitHub username and a
**personal access token** (GitHub no longer accepts your account password
here). Create one at **GitHub → Settings → Developer settings → Personal access
tokens → Tokens (classic) → Generate new token**, tick **repo**, and paste the
token when Git asks for the password.

### 2.3 Install its parts

```
pnpm install
```

This takes a few minutes and prints a lot. It is finished when you get the
`C:\CNF\app>` prompt back.

---

## Part 3 — Create the database

The system uses **two** database logins on purpose:

- `cnf_app` — what the running app uses. It can read and change data, but it
  **cannot** delete tables or change the structure.
- `cnf_migrate` — used only when you install updates.

If the app is ever attacked, the attacker gets the weaker login. This is worth
the extra two minutes.

### 3.1 Invent two passwords

Make two long passwords now and write them down. **Use only letters and
numbers** — punctuation has to be escaped in the settings file and is a common
cause of "it will not connect".

### 3.2 Create everything

```
mysql -u root -p
```

Enter the root password. You get a `mysql>` prompt. Paste the block below,
**replacing `APPPASS` and `MIGRATEPASS`** with the two passwords you just made:

```sql
CREATE DATABASE cnf_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE USER 'cnf_app'@'127.0.0.1' IDENTIFIED BY 'APPPASS';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON cnf_prod.* TO 'cnf_app'@'127.0.0.1';

CREATE USER 'cnf_migrate'@'127.0.0.1' IDENTIFIED BY 'MIGRATEPASS';
GRANT ALL PRIVILEGES ON cnf_prod.* TO 'cnf_migrate'@'127.0.0.1';

FLUSH PRIVILEGES;
exit
```

> **`127.0.0.1`, not `localhost`.** MySQL treats those as two different
> accounts. Using the wrong one gives "Access denied" later, and the message
> does not explain why.

---

## Part 4 — Find the server PC's address

Other computers reach the server PC by its address on the office network.

```
ipconfig
```

Look for **IPv4 Address** under your active adapter — something like
`192.168.1.50`. Write it down.

### Make that address permanent

By default your router hands out addresses that can change, and when this one
changes everybody's link breaks. Fix it one of two ways:

- **Best:** in your router's admin page, find **DHCP Reservation** (sometimes
  "Static Lease" or "Address Reservation") and tie this address to the server
  PC. Ask whoever manages your internet connection if you are unsure.
- **Or:** set it on the PC — **Settings → Network & internet → Ethernet → IP
  assignment → Edit → Manual**, turn on IPv4, and enter the address, subnet
  mask (usually `255.255.255.0`), and your router's address as the gateway.

The rest of this guide writes **`192.168.1.50`**. Replace it with your own
address everywhere.

---

## Part 5 — The settings file

### 5.1 Create it

```
cd C:\CNF\app
copy .env.example .env
notepad .env
```

### 5.2 Fill it in

Replace the contents with the block below. Change `APPPASS`, `MIGRATEPASS`,
the address, and the secret.

```
DATABASE_URL="mysql://cnf_migrate:MIGRATEPASS@127.0.0.1:3306/cnf_prod"
DATABASE_URL_APP="mysql://cnf_app:APPPASS@127.0.0.1:3306/cnf_prod"

AUTH_SECRET="PASTE_THE_GENERATED_SECRET_HERE"
AUTH_URL="https://192.168.1.50"

UPLOAD_DIR="C:\CNF\uploads"
TZ="Asia/Dhaka"

SEED_ADMIN_EMAIL="admin@tamannatraders.local"
SEED_ADMIN_PASSWORD="a-long-one-time-password"
```

**To generate the secret**, run this in Command Prompt and paste the output:

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Save and close Notepad.

> **Note the port is `3306`** here, not the 3307 used on the developer's Mac.
> A standard Windows MySQL install uses 3306.

> ⚠️ **Never send `.env` to anyone, and never put it in Git.** It contains the
> keys to every client's financial records. It is already excluded from Git —
> keep it that way.

### 5.3 Make the uploads folder

```
mkdir C:\CNF\uploads
```

---

## Part 6 — Build and set up the data

```
cd C:\CNF\app
pnpm build
pnpm db:deploy
pnpm db:seed
```

- `pnpm build` prepares the app to run. Takes a few minutes.
- `pnpm db:deploy` creates the tables.
- `pnpm db:seed` creates your admin login and the starting reference data.

Now confirm the database is reachable:

```
pnpm db:check
```

You want it to end with:

```
RESULT: the database is reachable and has accounts that can sign in.
```

If it does not, **stop here and fix it** — the message tells you what is wrong
and what to run. Nothing later will work until this passes.

---

## Part 7 — Start the app

### 7.1 Try it by hand first

```
cd C:\CNF\app
pnpm start
```

Wait for `Ready`. Leave this window open, open a browser **on the server PC**
and go to <http://localhost:3000>.

You should see the sign-in page. **Do not sign in yet** — logging in needs
Caddy, which is next. Press **Ctrl + C** in the Command Prompt to stop it.

If the page did not appear, nothing further will work; solve it before moving on.

### 7.2 Bind it to the PC only

From now on the app should listen only to the PC itself, so that everything
from outside has to come through Caddy. Later steps use this command instead of
plain `pnpm start`:

```
pnpm exec next start -H 127.0.0.1 -p 3000
```

---

## Part 8 — Caddy, so other PCs can connect

### 8.1 Choose HTTPS or plain HTTP

|  | **Option A — HTTPS** (recommended) | **Option B — plain HTTP** |
|---|---|---|
| Passwords on the office network | Encrypted | **Readable** by anyone who can watch the network |
| Setup | One extra step on each PC | Nothing extra |
| Browser warning | None, once that step is done | None |
| Use when | Always, if you can | Small, trusted office, and you accept the risk |

Financial records and password hashes are involved. **Choose A unless
something prevents it.**

### 8.2 Option A — HTTPS

Create `C:\Caddy\Caddyfile` (Notepad; save as **All Files** so it is not named
`Caddyfile.txt`):

```
{
	auto_https disable_redirects
}

192.168.1.50 {
	tls internal
	reverse_proxy 127.0.0.1:3000
}
```

Then, in a Command Prompt **run as Administrator**:

```
cd C:\Caddy
caddy trust
caddy run
```

`caddy trust` teaches the **server PC** to trust Caddy's own certificate.

**On each of the other office PCs**, once:

1. On the server PC, open
   `C:\Users\<you>\AppData\Roaming\Caddy\pki\authorities\local\root.crt`
2. Copy that file to the other PC (USB stick or a shared folder)
3. On that PC, double-click it → **Install Certificate** → **Local Machine** →
   **Place all certificates in the following store** → **Browse** → **Trusted
   Root Certification Authorities** → **OK** → **Next** → **Finish**

Skip that and the browser shows a red warning every time. The system still
works if someone clicks through, but people learn to ignore warnings, which is
its own problem.

Your address is **`https://192.168.1.50`**.

### 8.3 Option B — plain HTTP

`C:\Caddy\Caddyfile`:

```
http://192.168.1.50 {
	reverse_proxy 127.0.0.1:3000
}
```

You must also tell the app that the connection is not encrypted, or it refuses
to start. In `.env` change the address line and add one more:

```
AUTH_URL="http://192.168.1.50"
USE_SECURE_COOKIES="false"
```

Your address is **`http://192.168.1.50`**.

> That extra line is a deliberate, written-by-hand admission that passwords
> travel unencrypted. Never use Option B on a network you do not control, and
> never once the system is reachable from the internet.

---

## Part 9 — Let the other PCs through the firewall

Windows blocks incoming connections by default. In a Command Prompt **run as
Administrator**:

```
netsh advfirewall firewall add rule name="CNF Back Office HTTPS" dir=in action=allow protocol=TCP localport=443
netsh advfirewall firewall add rule name="CNF Back Office HTTP" dir=in action=allow protocol=TCP localport=80
```

Add only the one you use, though having both is harmless.

**Do not** open port 3000 or 3306. Port 3000 would let people bypass Caddy;
3306 would expose the database itself to the network.

---

## Part 10 — Make it start on its own

So far everything stops when you close the Command Prompt or restart the PC.
Two background services fix that.

### 10.1 Install NSSM

Download from <https://nssm.cc/download>, take the **latest release** zip,
open `win64\nssm.exe` and copy it to `C:\Caddy\nssm.exe`.

### 10.2 The application service

In a Command Prompt **run as Administrator**:

```
cd C:\Caddy
nssm install CNFBackOffice
```

A window opens. Fill in the **Application** tab:

| Field | Value |
|---|---|
| Path | `C:\Program Files\nodejs\node.exe` |
| Startup directory | `C:\CNF\app` |
| Arguments | `node_modules\next\dist\bin\next start -H 127.0.0.1 -p 3000` |

Then the **Details** tab:

| Field | Value |
|---|---|
| Display name | `CNF Back Office` |
| Description | `TAMANNA TRADERS back office application` |

And the **I/O** tab, so you have logs when something goes wrong:

| Field | Value |
|---|---|
| Output (stdout) | `C:\CNF\logs\app.log` |
| Error (stderr) | `C:\CNF\logs\app-error.log` |

Make that folder first: `mkdir C:\CNF\logs`

Click **Install service**, then:

```
nssm set CNFBackOffice AppEnvironmentExtra NODE_ENV=production
nssm start CNFBackOffice
```

### 10.3 The Caddy service

```
nssm install CNFCaddy
```

| Field | Value |
|---|---|
| Path | `C:\Caddy\caddy.exe` |
| Startup directory | `C:\Caddy` |
| Arguments | `run --config C:\Caddy\Caddyfile` |

Install, then:

```
nssm start CNFCaddy
```

### 10.4 Check both

```
sc query CNFBackOffice
sc query CNFCaddy
```

Both should say `STATE : 4 RUNNING`.

**Now restart the whole PC** and check they come back on their own. Do this
now, while you are paying attention — not on a Monday morning when the office
is waiting.

---

## Part 11 — Open it from another computer

On any office PC, go to `https://192.168.1.50` (or `http://…` for Option B).

Sign in with the email and one-time password from your `.env`. The system asks
you to choose your own password immediately.

**If everyone should have a shortcut:** in Chrome or Edge, open the address,
then **⋮ → Cast, save and share → Create shortcut…** (Edge: **⋯ → Apps →
Install this site as an app**). It then behaves like a normal program.

---

## Part 12 — Backups

**Do this before anyone enters real data.** A system without a tested backup is
a system waiting to lose everything.

### 12.1 The three places a backup should live

A backup is only as good as the number of *separate* places it exists.

| Copy | Where | Protects you from |
|---|---|---|
| 1 | On the office PC (`C:\CNF-Backups`) | A mistake — a deleted client, a wrong bill |
| 2 | A USB or second disk on the PC | The main disk dying |
| 3 | **Google Drive** | Fire, flood, theft, the whole PC being stolen |

Copy 1 is automatic. Copies 2 and 3 are what this section sets up. **Copy 3 is
the one that matters most** — copies 1 and 2 are both in the same room.

### 12.2 Settings file

Create `C:\CNF\app\.env.backup` in Notepad (save as **All Files**, so it is
not named `.env.backup.txt`):

```
BACKUP_DIR=C:\CNF-Backups
KEEP_DAILY=30
KEEP_MONTHLY=12
```

That gives you every night for the last 30 days, plus one set per month for the
last year, all on the office PC. Now add a second copy — pick one.

**If you have a USB stick or second disk permanently plugged in**, add:

```
OFFSITE_DIR=D:\CNF-Backups-Copy
```

Use whatever drive letter it actually has.

**If you want Google Drive** (recommended), leave `OFFSITE_DIR` out and do
[12.3](#123-backing-up-to-google-drive) instead.

You can have both. If both are set, Google Drive is used.

### 12.3 Backing up to Google Drive

This copies every night's backup to Google Drive automatically. Set it up once.

> ⚠️ **Use a dedicated Google account with two-factor authentication turned
> on.** These files contain every client's finances and everyone's password.
> Do not use a personal account, and **never share that Drive folder** with
> anyone.

**Step 1 — get the connector**

Go to <https://rclone.org/downloads/> and download **Windows / Intel 64 bit**.
You get a zip file.

1. Open the zip and find `rclone.exe` inside
2. Make a folder `C:\Rclone`
3. Copy `rclone.exe` into it

Check it works — open Command Prompt:

```
C:\Rclone\rclone.exe version
```

You should see a version number.

**Step 2 — connect it to your Google Drive**

```
C:\Rclone\rclone.exe config
```

It asks a series of questions. Answer them exactly like this:

| It asks | You type | Then press |
|---|---|---|
| `e/n/d/r/c/s/q>` | `n` | Enter (means "new") |
| `name>` | `gdrive` | Enter |
| `Storage>` | `drive` | Enter |
| `client_id>` | *(nothing)* | Enter |
| `client_secret>` | *(nothing)* | Enter |
| `scope>` | `1` | Enter |
| `service_account_file>` | *(nothing)* | Enter |
| `Edit advanced config?` | `n` | Enter |
| `Use web browser to automatically authenticate?` | `y` | Enter |

Your browser opens. **Sign in with the dedicated Google account** and click
**Allow**. The browser says success; go back to Command Prompt.

| It asks | You type | Then press |
|---|---|---|
| `Configure this as a Shared Drive?` | `n` | Enter |
| `y/e/d>` | `y` | Enter (means "yes, this is correct") |
| `e/n/d/r/c/s/q>` | `q` | Enter (quit) |

**Step 3 — prove it works**

```
C:\Rclone\rclone.exe mkdir gdrive:CNF-Backups
C:\Rclone\rclone.exe lsd gdrive:
```

You should see `CNF-Backups` listed. Open Google Drive in your browser and you
will see the folder there too.

**Step 4 — tell the backup to use it**

Add these two lines to `C:\CNF\app\.env.backup`:

```
RCLONE_REMOTE=gdrive:CNF-Backups
RCLONE_BIN=C:\Rclone\rclone.exe
```

**Step 5 — protect the connection file**

`rclone config` saved a file that can reach your Drive. Keep it private:

```
icacls "%USERPROFILE%\AppData\Roaming\rclone\rclone.conf" /inheritance:r /grant:r "%USERNAME%:F"
```

That removes everyone's access except yours.

### 12.4 Take one by hand

```
cd C:\CNF\app
powershell -ExecutionPolicy Bypass -File scripts\windows\backup.ps1
```

It should end with `Backup finished successfully.` Look in `C:\CNF-Backups\daily\`
and you will find a folder named for the date and time, containing:

| File | What it is |
|---|---|
| `database.sql.gz` | Every bill, client, payment — the whole database |
| `uploads.zip` | The scanned documents |
| `MANIFEST.txt` | What this backup is, in plain words |
| `SHA256SUMS` | Fingerprints, used to prove it is undamaged |

### 12.5 Make it happen every night

Open **Task Scheduler** (Start → type `task scheduler`).

1. **Create Task…** (not "Create Basic Task")
2. **General** tab: Name `CNF Nightly Backup`. Select **Run whether user is
   logged on or not**. Tick **Run with highest privileges**.
3. **Triggers** tab → **New…** → Daily at **2:00:00 AM** → OK
4. **Actions** tab → **New…**:
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File C:\CNF\app\scripts\windows\backup.ps1`
   - Start in: `C:\CNF\app`
5. **Settings** tab: tick **Run task as soon as possible after a scheduled
   start is missed** — so a backup still happens if the PC was off at 2am.
6. **OK**, and enter the Windows password when asked.

**Test it now.** Right-click the task → **Run**. Wait a minute, then check that
a new folder appeared in `C:\CNF-Backups\daily\`. A scheduled task you have
never seen succeed is not a backup.

### 12.6 Prove a backup can actually be restored

**A backup you have never restored is not a backup.** Do this once now, and
again every few months. It is completely safe: it restores into a spare
database, never over your real one.

First, give the migration login access to that spare name — once only:

```
mysql -u root -p -e "GRANT ALL PRIVILEGES ON cnf_restore_check.* TO 'cnf_migrate'@'127.0.0.1'; FLUSH PRIVILEGES;"
```

Then:

```
cd C:\CNF\app
powershell -ExecutionPolicy Bypass -File scripts\windows\restore.ps1 -List
powershell -ExecutionPolicy Bypass -File scripts\windows\restore.ps1 -Set <the-name-it-listed> -Into cnf_restore_check
```

It checks the fingerprints, asks you to type `cnf_restore_check` to confirm,
then loads it and reports how many tables came back. **29 tables** is right.

Clean up:

```
mysql -u root -p -e "DROP DATABASE cnf_restore_check;"
```

**Write down how long it took.** On the day you actually need this, the first
question will be "how long until we are working again?"

Time it took: ________ minutes.

### 12.7 If the worst happens

The real thing, on the real database:

```
cd C:\CNF\app
nssm stop CNFBackOffice
powershell -ExecutionPolicy Bypass -File scripts\windows\restore.ps1 -Set <name> -Force
pnpm db:deploy
pnpm db:integrity
nssm start CNFBackOffice
```

`-Force` is required because you are deliberately replacing live data. You will
still be asked to type the database name.

---

## Part 13 — Looking inside the database

You are used to **phpMyAdmin**. There are two free ways to get the same thing on
Windows. Start with the first — it needs no installation at all.

> **Do all of this on the server PC**, the one holding the database. It is not
> reachable from the other computers, and that is deliberate.

### 13.1 The easy way — Prisma Studio (nothing to install)

```
cd C:\CNF\app
pnpm db:studio
```

Your browser opens at `http://localhost:5555`. Tables down the left, rows in a
grid. Click a cell to change it, then **Save changes**.

Close it with **Ctrl + C** in the Command Prompt when you are done. It is only
running while that window is open.

It cannot run SQL queries. For that, use the next one.

### 13.2 The phpMyAdmin-style way — HeidiSQL

**HeidiSQL** is free, small, Windows-only, and the closest thing to
phpMyAdmin: a tree of tables on the left, data in a grid, and a query tab.

Download from <https://www.heidisql.com/download.php> — take the **Installer**.
Install with the defaults.

Open it and click **New**, then fill in:

| Field | Value |
|---|---|
| Network type | `MariaDB or MySQL (TCP/IP)` |
| Hostname / IP | `127.0.0.1` |
| User | `cnf_migrate` |
| Password | *the `MIGRATEPASS` you chose in [Part 3](#part-3--create-the-database)* |
| Port | `3306` |
| Databases | `cnf_prod` |

Click **Save**, then **Open**.

You now have the familiar view: click `cnf_prod` on the left, then a table such
as `clients`, then the **Data** tab. The **Query** tab runs SQL:

```sql
SELECT bill_no, bill_date, net_payable, status
FROM bills ORDER BY id DESC LIMIT 20;
```

**If it will not connect**, it is almost always one of these:

1. **Hostname must be `127.0.0.1`, not `localhost`.** MySQL treats those as two
   different accounts, and this login exists only for `127.0.0.1`.
2. **Port `3306`** — the number from your MySQL install.
3. **Password typed exactly** as in `.env`, with no spaces before or after.

> ⚠️ **Never create an extra database login "just for the GUI".** A convenience
> account with an easy password is exactly what an attacker looks for, and it
> is easy to forget and leave behind. Use `cnf_migrate`, which already exists.

### 13.3 Please read this before you change anything

Looking is always safe. Changing is not.

| | |
|---|---|
| **Do it in the app whenever you can** | The app records who changed what, and keeps totals correct. A direct database edit does neither. |
| **Never add or remove columns by hand** | The app keeps its own record of the structure. A hand-made change is not in it, so the next update will break. |
| **Never edit these three tables**: `audit_log`, `bill_sequences`, `_prisma_migrations` | `audit_log` is your evidence trail and the database itself will refuse. `bill_sequences` controls bill numbering — editing it can produce two bills with the same number. `_prisma_migrations` is how updates know what has been applied. |
| **Take a backup first** | `powershell -ExecutionPolicy Bypass -File scripts\windows\backup.ps1 -Label before-edit -NoOffsite` |

---

## Part 14 — Day to day

| Task | What to do |
|---|---|
| Nothing loads for anyone | On the server PC: `sc query CNFBackOffice` and `sc query CNFCaddy`. Restart with `nssm restart CNFBackOffice`. |
| "Cannot sign in: could not reach its database" | The database service stopped. Start → **Services** → **MySQL84** → **Start**. Then `pnpm db:check`. |
| "Incorrect email or password" | Run `pnpm db:check` first. If it passes, the password really is wrong. |
| Nobody knows the admin password | `cd C:\CNF\app` then `pnpm admin:reset-password` |
| Install an update | See below |
| Check the money adds up | `pnpm db:integrity` (monthly) |
| Read the logs | `C:\CNF\logs\app-error.log` |

### Installing an update

```
cd C:\CNF\app
powershell -ExecutionPolicy Bypass -File scripts\windows\backup.ps1 -Label pre-update -NoOffsite
nssm stop CNFBackOffice
git pull
pnpm install
pnpm build
pnpm db:deploy
nssm start CNFBackOffice
pnpm db:check
```

The backup comes first, always. If an update goes wrong, that file is the way
back.

---

## Part 15 — Keeping it safe

| Rule | Why |
|---|---|
| The server PC needs a **Windows password**, and locks when idle | Anyone who sits at it can read every client's finances |
| Do **not** open ports 3000 or 3306 to the network | One bypasses the safety layer, the other exposes the database directly |
| Do **not** forward any port on your router to this PC | That publishes it to the whole internet. If you need remote access, move to a VPS — see the migration guide |
| Keep `.env` and `.env.backup` off email and off shared folders | They are the keys to everything |
| Give each person their **own** login | Shared logins destroy the audit trail — you lose the ability to know who did what |
| Deactivate people who leave; never delete them | Their history stays intact and correct |
| Antivirus: exclude `C:\CNF\app\.next` and the MySQL data folder | Live scanning of these causes strange, hard-to-diagnose failures |

---

## Part 16 — What this setup cannot do

Honest limitations, so nothing is a surprise later:

- **Office only.** It works on your network. Nobody can use it from home or
  while travelling. That is the main reason to move to a VPS.
- **One PC is a single point of failure.** If it dies, the office is offline
  until it is fixed or replaced. Your backups are what make that recoverable —
  which is why Part 12 is not optional.
- **No automatic off-site copy unless you set one up.** A fire or a theft takes
  the PC and the backup drive sitting next to it.
- **Power cuts.** MySQL is good at surviving them, but a UPS on the server PC
  is cheap insurance for a machine holding your books.
- **Certificate warnings on new PCs.** Each new computer needs the one-time
  step in 8.2.

When these start to bite, that is the signal to move:
[Migrating from Windows to an Ubuntu VPS](./migrating-windows-to-ubuntu-vps.md).

---

## What has been tested, and what has not

Being straight with you about which parts of this guide are proven:

**Verified against the real code:**

- One codebase really is enough: there is no `process.platform`, `win32` or
  any other operating-system check anywhere in the application code, and file
  locations go through Node's platform-aware path functions, so a Windows
  `C:\...` setting and a Linux `/var/...` setting are handled identically. No
  `package.json` script depends on a Unix shell command either. Checked by
  searching the whole codebase, not assumed.

- The sign-in genuinely fails without Caddy in front — the app refuses to log
  anyone in when it cannot identify where a request came from. Part 8 is a
  requirement, not a suggestion.
- `AUTH_URL` must start with `https://` in production, or the app refuses to
  start. Option B's `USE_SECURE_COOKIES="false"` is the only supported way
  around it.
- The password-hashing component ships ready-built for 64-bit Windows, so no
  compiler or build tools are needed.
- `backup.ps1` and `restore.ps1` were run for real against a live database:
  the backup was taken, the fingerprints verified, and the restore reproduced
  the source exactly — 29 tables, identical row counts, uploads intact. All
  three refusals were provoked deliberately and all three held: a damaged
  backup was rejected with the target left untouched, an unattended restore was
  refused, and an accidental overwrite of a populated database was blocked.
- The `SHA256SUMS` file the Windows backup writes verifies correctly with the
  standard Linux `sha256sum -c`, which is what makes the migration path work.
- The second-copy step (`OFFSITE_DIR`) was run for real: the copy landed and
  its fingerprints still verified, so the spare copy is a true copy.

**Not tested:** the Windows installation steps themselves — Node, MySQL, Caddy,
NSSM, HeidiSQL and rclone — were not performed on a Windows machine while
writing this, because there is no Windows machine here. They are each vendor's
standard procedure. The rclone questions in 12.3 are listed in the order that
version asks them; if a screen does not match what is written here, trust the
screen and tell whoever maintains this document.

The Google Drive copy specifically could not be tested end to end (it needs a
real Google account). The **second-copy machinery it uses was** tested via
`OFFSITE_DIR`, so what is unproven is the rclone connection itself, not the
backup. That is why 12.3 Step 3 makes you prove the connection before relying
on it.
