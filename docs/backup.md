# Backups — how to make them, check them, and restore

**For:** the owner of TAMANNA TRADERS CNF Back Office.
**Assumes:** you have never used a Linux server before.

Every command in this guide is written out in full. Copy it, paste it, press
Enter. After each one you are told **what you should see** — if you see
something else, that step did not work, and there is a fix in
[section 9](#9-when-something-goes-wrong).

---

## Read this first

Your database holds every client, every bill, every receipt and every taka
your business has recorded. A backup is a **complete copy** of it, saved
somewhere else, so that if the server dies, is hacked, or someone deletes the
wrong thing, you can get it all back.

Three rules that this whole guide exists to enforce:

> **1. A backup that lives only on the server is not a backup.**
> If the server dies, it takes the backup with it. That is why every backup is
> also copied to Google Drive.
>
> **2. A backup you have never restored is not a backup.**
> It is a guess. Until you have actually restored one and seen your data come
> back, you do not know it works. [Section 7A](#7a-practice-restore-safe-do-this-every-3-months)
> is how you find out, safely.
>
> **3. A backup nobody checks has already failed.**
> Backups fail silently — the disk fills, a password changes, and nothing tells
> you. [Section 6](#6-the-monthly-3-minute-check) is a 3-minute check. Put it in
> your phone for the 1st of every month.

### What you are setting up

```
Every night at 2:00 AM Bangladesh time, automatically:

   the whole database  ─────►  database.sql.gz
   the uploads folder  ─────►  uploads.tar.gz     one "backup set"
   a list of contents  ─────►  MANIFEST.txt
   tamper-proof sums   ─────►  SHA256SUMS

        saved on the server ──►  last 30 nights + last 12 months
        copied to Google Drive ►  the same thing, mirrored
```

Plus: **you can take a backup by hand at any time**, and you should, before
anything risky ([section 4](#4-taking-a-backup-by-hand)).

---

## Table of contents

**Set it up once**
1. [Getting to the server's command line](#1-getting-to-the-servers-command-line)
2. [One-time setup on the server](#2-one-time-setup-on-the-server)
3. [Connecting Google Drive](#3-connecting-google-drive)

**Use it**
4. [Taking a backup by hand](#4-taking-a-backup-by-hand)
5. [Turning on the automatic nightly backup](#5-turning-on-the-automatic-nightly-backup)
6. [The monthly 3-minute check](#6-the-monthly-3-minute-check)

**Get your data back**
7. [Restoring](#7-restoring) — four situations:
   - [7A. Practice restore (safe)](#7a-practice-restore-safe-do-this-every-3-months)
   - [7B. Restore the live system](#7b-restore-the-live-system-real-emergency)
   - [7C. Restore from Google Drive](#7c-restore-from-google-drive)
   - [7D. The server is gone entirely](#7d-the-server-is-gone-entirely)

**Reference**
8. [Understanding what you are looking at](#8-understanding-what-you-are-looking-at)
9. [When something goes wrong](#9-when-something-goes-wrong)
10. [Keeping the backups secure](#10-keeping-the-backups-secure)
11. [All settings explained](#11-all-settings-explained)

---

## Quick reference card

Once everything is set up, these are the only commands you actually need.
Everything else in this guide explains how to get here.

| I want to… | Command |
|---|---|
| Take a backup right now | `cd /var/www/cnf-back-office && sudo -u cnf bash scripts/backup.sh` |
| See what backups exist | `sudo -u cnf bash scripts/restore.sh --list` |
| Check last night worked | `tail -30 /var/log/cnf/backup.log` |
| Check Google Drive has it | `sudo -u cnf rclone lsd gdrive:CNF-Backups/daily \| tail -5` |
| Practice a restore (safe) | [Section 7A](#7a-practice-restore-safe-do-this-every-3-months) |
| Restore for real | [Section 7B](#7b-restore-the-live-system-real-emergency) |

---

# SET IT UP ONCE

## 1. Getting to the server's command line

Everything on the server is done by **typing commands**, not clicking. You do
this through a program called Terminal on your MacBook.

**Step 1.1 — open Terminal**

Press `Cmd + Space`, type `Terminal`, press Enter. A window opens with a text
prompt. This is your MacBook's command line.

**Step 1.2 — connect to the server**

Type this, replacing `YOUR_SERVER_IP` with your VPS address (for example
`203.0.113.45`):

```bash
ssh cnf@YOUR_SERVER_IP
```

> **Why `cnf` and not `root`?** `cnf` is the limited account the application
> runs as. The backup runs as `cnf` too, so the Google Drive password must
> belong to `cnf`. If you set things up as `root`, the nightly job will not be
> able to reach Google Drive. This trips people up constantly — always `cnf`.

**What you should see:** the prompt changes to something like
`cnf@cnf-server:~$`. You are now typing on the server, not your Mac.

**To go back to your Mac:** type `exit` and press Enter.

**Step 1.3 — three things worth knowing before you continue**

- **Pasting into Terminal:** `Cmd + V` works as normal.
- **Passwords are invisible.** When you type a password, nothing appears — no
  dots, no stars. That is normal. Type it and press Enter.
- **`sudo` means "do this as administrator."** It may ask for your password the
  first time in a session.

---

## 2. One-time setup on the server

Do this once. If someone already set the server up for you following
[`deployment.md`](./deployment.md), some of it may exist already — running the
commands again is harmless.

**Step 2.1 — create the folders backups live in**

```bash
sudo install -d -o cnf -g cnf -m 0750 /var/backups/cnf-back-office
sudo install -d -o cnf -g cnf -m 0750 /var/log/cnf
```

**What you should see:** nothing at all. On Linux, silence means success.

**Step 2.2 — create the backup settings file**

```bash
sudo -u cnf nano /var/www/cnf-back-office/.env.backup
```

`nano` is a simple text editor inside the Terminal. Paste in exactly this:

```bash
# Where backup sets are kept on the server
BACKUP_DIR=/var/backups/cnf-back-office

# The scanned vouchers / documents folder — must match the same line in .env
UPLOAD_DIR=/var/www/cnf-back-office/uploads

# How many to keep
RETAIN_DAILY=30
RETAIN_MONTHLY=12

# Off-server copy — filled in properly in section 3
OFFSITE_MODE=none
```

**To save and close nano:** press `Ctrl + O`, then Enter (saves), then
`Ctrl + X` (exits).

**Step 2.3 — lock the file down**

This file names your paths and is read automatically at 2 AM. Only `cnf`
should be able to read it:

```bash
sudo chown cnf:cnf /var/www/cnf-back-office/.env.backup
sudo chmod 600 /var/www/cnf-back-office/.env.backup
ls -l /var/www/cnf-back-office/.env.backup
```

**What you should see:**

```
-rw------- 1 cnf cnf 412 Aug 17 08:00 /var/www/cnf-back-office/.env.backup
```

The `-rw-------` part matters: only the owner can read it.

> **Where does the database password come from?** You do **not** put it in this
> file. The scripts read `DATABASE_URL` from the application's own `.env` file,
> which already has it. One password, one place.

**Step 2.4 — allow practice restores (important, and easy to miss)**

The database user `cnf_migrate` is deliberately allowed to touch **only** the
live database, `cnf_prod`. That is good security — but it means a *practice*
restore into a separate scratch database will fail with
`Access denied ... to database 'cnf_restore_check'`.

Give it permission on **one** scratch name, once:

```bash
sudo mysql -e "GRANT ALL PRIVILEGES ON cnf_restore_check.* TO 'cnf_migrate'@'127.0.0.1'; FLUSH PRIVILEGES;"
```

Confirm it took:

```bash
sudo mysql -N -B -e "SHOW GRANTS FOR 'cnf_migrate'@'127.0.0.1';"
```

**What you should see** — a line mentioning `cnf_restore_check`:

```
GRANT ALL PRIVILEGES ON `cnf_prod`.* TO `cnf_migrate`@`127.0.0.1`
GRANT ALL PRIVILEGES ON `cnf_restore_check`.* TO `cnf_migrate`@`127.0.0.1`
```

> This grants access to a **scratch** database only — never to anything real.
> It is what makes rule 2 (practise your restores) possible without risk.

---

## 3. Connecting Google Drive

This is the fiddliest part of the whole guide, because Google's sign-in needs a
**web browser** and your server does not have one. The trick: you sign in on
your **MacBook**, and paste the result into the server.

Take it slowly. You do this once.

### Step 3.1 — decide which Google account

> **Strongly recommended: create a brand-new Google account just for backups.**
>
> Whatever account you use, the server will hold a permanent key to its Drive.
> These backups contain every client's finances and every user's password.
> A separate account (say `tamanna.backups@gmail.com`) means that if the server
> is ever broken into, your personal email, photos and documents are not part
> of the loss.
>
> Turn on **2-factor authentication** on that account, and write the password
> and recovery codes down somewhere physical. If you lose that account, you lose
> the backups.

### Step 3.2 — install rclone on the server

`rclone` is the tool that talks to Google Drive. On the server:

```bash
sudo -v ; curl https://rclone.org/install.sh | sudo bash
```

Check it worked:

```bash
rclone version
```

**What you should see:** `rclone v1.6x.x` or higher on the first line.

### Step 3.3 — start the setup on the server

**Important:** run it as `cnf`, so the credential belongs to `cnf`:

```bash
sudo -u cnf rclone config
```

It asks a series of questions. Answer them exactly like this:

| It asks | You type |
|---|---|
| `n/s/q>` | `n` then Enter (means "new remote") |
| `name>` | `gdrive` then Enter |
| `Storage>` | `drive` then Enter |
| `client_id>` | just Enter (leave blank) |
| `client_secret>` | just Enter (leave blank) |
| `scope>` | `1` then Enter (full access) |
| `service_account_file>` | just Enter (leave blank) |
| `Edit advanced config?` | `n` then Enter |
| `Use web browser to automatically authenticate?` | **`n`** then Enter |

That last `n` is the one that matters. The server has no browser; answering
`y` will hang forever.

rclone now prints something like:

```
Execute the following on the machine with the web browser (same rclone version recommended):
    rclone authorize "drive" "eyJzY29wZSI6ImRyaXZlIn0"
Then paste the result.
```

**Leave this window open and waiting. Do not close it.**

### Step 3.4 — authorise on your MacBook

Open a **second, new** Terminal window on your Mac (`Cmd + N`). This one is
your Mac, not the server.

Install rclone on the Mac if you have not already:

```bash
brew install rclone
```

Now type the **exact** command the server printed — including both sets of
quotes. Select it in the server window, copy it, and paste:

```bash
rclone authorize "drive" "eyJzY29wZSI6ImRyaXZlIn0"
```

Your web browser opens. Sign in with the backup Google account from step 3.1
and click **Allow**.

Back in the Mac Terminal you will see:

```
Paste the following into your remote machine --->
{"access_token":"ya29...","token_type":"Bearer","refresh_token":"1//0g...","expiry":"..."}
<---End paste
```

### Step 3.5 — paste it back into the server

Copy the whole `{"access_token": ... }` line — one long line, both curly
braces included, nothing else. Switch to the **server** window, paste, press
Enter.

| It asks | You type |
|---|---|
| `Configure this as a Shared Drive (Team Drive)?` | `n` then Enter |
| `Keep this "gdrive" remote?` | `y` then Enter |
| `e/n/d/r/c/s/q>` | `q` then Enter (quit) |

### Step 3.6 — prove the connection works

```bash
sudo -u cnf rclone lsd gdrive:
```

**What you should see:** a list of the folders in that Google Drive. If you see
them, the server is connected to Google Drive.

**If you see an error instead**, go to [section 9](#9-when-something-goes-wrong).
Do not continue until this works.

### Step 3.7 — create the backup folder in Drive

```bash
sudo -u cnf rclone mkdir gdrive:CNF-Backups
sudo -u cnf rclone lsd gdrive:CNF-Backups
```

The second command prints nothing, because the folder is empty. That is
correct.

### Step 3.8 — tell the backup to use Google Drive

```bash
sudo -u cnf nano /var/www/cnf-back-office/.env.backup
```

Find the line `OFFSITE_MODE=none` and **change that section** to:

```bash
OFFSITE_MODE=rclone
RCLONE_REMOTE=gdrive:CNF-Backups
RCLONE_FLAGS=--transfers=4 --drive-chunk-size=64M
```

Save with `Ctrl + O`, Enter, then `Ctrl + X`.

### Step 3.9 — test the connection end to end

```bash
cd /var/www/cnf-back-office
sudo -u cnf bash scripts/offsite-sync.sh --dry-run
```

A "dry run" means: work out what *would* happen, change nothing, upload
nothing.

**What you should see:** a plan mentioning `gdrive:CNF-Backups`.

**What you must NOT see** is this:

```
WARN OFF-SERVER COPY IS NOT CONFIGURED — neither RCLONE_REMOTE nor SCP_TARGET is set
```

That means step 3.8 did not take effect. Check the file again for typos.

---

# USE IT

## 4. Taking a backup by hand

Do this **whenever you are about to do something risky**, and any time you
simply want a fresh copy:

- before installing a new version of the software,
- before a database migration (`pnpm db:deploy`),
- before bulk-editing or deleting anything,
- before you let someone new loose on the system.

### Step 4.1 — see what would happen, without doing it

Optional but reassuring the first time:

```bash
cd /var/www/cnf-back-office
sudo -u cnf bash scripts/backup.sh --dry-run
```

This writes nothing and touches no network. It prints the plan:

```
BACKUP PLAN (dry run — nothing is written, no network is touched)
-----------------------------------------------------------------
  when          2026-08-17 07:57:16 +06
  timezone      Asia/Dhaka
  set name      20260817-075716

  database      mysql://cnf_migrate@127.0.0.1:3306/cnf_prod
  ...
RETENTION
---------
  daily         keep 30 · 0 present now · 1 after this run
```

### Step 4.2 — take the backup

```bash
cd /var/www/cnf-back-office
sudo -u cnf bash scripts/backup.sh --label manual
```

`--label manual` just adds the word "manual" to the folder name so you can
recognise it later. You can use any short word — `pre-migrate`, `before-update`
— using letters, digits, dots, dashes and underscores only.

**What you should see** (this is real output from a tested run):

```
[2026-08-17 07:57:22 +06] backup starting — set 20260817-075722-manual, source mysql://cnf_migrate@127.0.0.1:3306/cnf_prod
[2026-08-17 07:57:22 +06] dumping cnf_prod …
[2026-08-17 07:57:23 +06] OK   database dumped — 42.4 KB
[2026-08-17 07:57:23 +06] archiving uploads from /var/www/cnf-back-office/uploads …
[2026-08-17 07:57:23 +06] OK   uploads archived — 1 file(s), 543 B
[2026-08-17 07:57:23 +06] OK   set published — /var/backups/cnf-back-office/daily/20260817-075722-manual
[2026-08-17 07:57:23 +06] OK   monthly set kept for 202608 — …
[2026-08-17 07:57:23 +06] retention: 1/30 daily, 1/12 monthly, 60.0 KB on disk
[2026-08-17 07:57:23 +06] OK   backup complete in 1s — /var/backups/cnf-back-office/daily/20260817-075722-manual
```

The word **`OK`** on the last line is what you are looking for.

> **If you want a purely local copy** — for example you are about to run a
> migration and do not want to wait for the upload — add `--no-offsite`:
>
> ```bash
> sudo -u cnf bash scripts/backup.sh --no-offsite --label pre-migrate
> ```
>
> It will warn you that the set exists only on this machine. That is expected
> and correct for this use.

### Step 4.3 — verify the backup is real (do this, don't skip it)

Four checks. They take a minute.

**Check 1 — the set exists and the files have sensible sizes:**

```bash
sudo -u cnf bash scripts/restore.sh --list
```

**What you should see:**

```
Backup sets in /var/backups/cnf-back-office

  daily      20260817-075722-manual            56.0 KB  db+uploads
  monthly    202608-20260817-075722-manual     56.0 KB  db+uploads
```

`db+uploads` means both the database and your documents are in there.

> **Warning sign:** if `database.sql.gz` is only a few hundred bytes, the dump
> failed — usually wrong database credentials. See
> [section 9](#9-when-something-goes-wrong).

**Check 2 — nothing is corrupted.** Every set carries a checksum file, which is
a mathematical fingerprint of each file:

```bash
cd /var/backups/cnf-back-office/daily/20260817-075722-manual
sha256sum -c SHA256SUMS
```

(Replace the folder name with your own — press Tab to auto-complete it.)

**What you should see** — every line must say `OK`:

```
database.sql.gz: OK
uploads.tar.gz: OK
MANIFEST.txt: OK
```

**Check 3 — read the receipt.** Every set includes a plain-English description
of itself:

```bash
cat /var/backups/cnf-back-office/daily/20260817-075722-manual/MANIFEST.txt
```

**What you should see:**

```
TAMANNA TRADERS CNF Back Office — backup set
set              20260817-075722-manual
created          2026-08-17 07:57:23 +06
created by       cnf@cnf-server
label            manual

source database  mysql://cnf_migrate@127.0.0.1:3306/cnf_prod
dumped with      mysqldump  Ver 8.4.11
dump bytes       43500 (42.4 KB)

uploads source   /var/www/cnf-back-office/uploads
uploads files    1
uploads bytes    543 (543 B)

restore with     bash scripts/restore.sh --from /var/backups/cnf-back-office/daily/20260817-075722-manual
```

Check the date is now and the database name is right.

**Check 4 — it reached Google Drive:**

```bash
sudo -u cnf rclone lsd gdrive:CNF-Backups/daily
```

Your new folder name should be in the list. You can also open
<https://drive.google.com> in your browser and look in **CNF-Backups → daily**.

### What the exit code means

If you ever want to check the result in one number, run `echo $?` immediately
after the backup:

| Number | Meaning | What to do |
|---|---|---|
| `0` | Everything worked. | Nothing. |
| `1` | The backup **failed**. There is no new backup. | Read the error above it, fix it, run again. |
| `3` | The backup worked, **but the Google Drive copy failed**. | **Treat this as urgent.** You have a backup only on the machine that is going to be the thing that fails. See [section 9](#9-when-something-goes-wrong). |

---

## 5. Turning on the automatic nightly backup

Manual backups protect you from planned risks. The nightly job protects you
from everything else. It runs at **2:00 AM Bangladesh time**, every night,
whether or not anyone is awake.

### Step 5.1 — install the schedule

The schedule must belong to the **`cnf` user**, because the Google Drive
credential is `cnf`'s:

```bash
sudo crontab -u cnf -e
```

If it asks which editor, choose `nano` (usually option 1).

If the file is empty, paste this in. **If it already contains a
`scripts/backup.sh` line, leave it alone — it is already installed.**

```cron
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
CRON_TZ=Asia/Dhaka
MAILTO=your-email@example.com

# 02:00 nightly — full backup (database + uploads) and the Google Drive copy.
0 2 * * *  cd /var/www/cnf-back-office && bash scripts/backup.sh >> /var/log/cnf/backup.log 2>&1
```

Change `your-email@example.com` to an address **you actually read**. If the
backup fails, that is where the complaint goes.

Save with `Ctrl + O`, Enter, then `Ctrl + X`.

**What you should see:** `crontab: installing new crontab`.

Three details that all matter, in case you edit this later:

- **`sudo crontab -u cnf -e`**, never plain `crontab -e`. A personal crontab has
  **no username column** — adding one makes the system try to run a program
  called `cnf`, and the backup silently never happens.
- **The `cd` is not optional.** The scripts read their settings from the
  application folder. Without it they cannot find the database password.
- **`0 2 * * *`** means "minute 0 of hour 2, every day". 2:00 AM.

### Step 5.2 — confirm the schedule is installed

```bash
sudo crontab -u cnf -l
```

**What you should see:** the lines you just pasted, printed back to you.

### Step 5.3 — stop the log growing forever

```bash
sudo tee /etc/logrotate.d/cnf-backup >/dev/null <<'EOF'
/var/log/cnf/backup.log {
    weekly
    rotate 12
    compress
    missingok
    notifempty
    create 0640 cnf cnf
}
EOF
```

This keeps 12 weeks of logs and compresses the old ones.

### Step 5.4 — prove the scheduled job works (do not skip this)

**Never wait until the night of a disaster to discover the schedule was
broken.** There are two levels of proof.

**Proof 1 — run the exact command cron will run, as cron will run it:**

```bash
sudo -u cnf bash -c 'cd /var/www/cnf-back-office && bash scripts/backup.sh >> /var/log/cnf/backup.log 2>&1'
echo "exit code: $?"
```

**What you should see:** `exit code: 0`.

Then read what it wrote to the log:

```bash
tail -20 /var/log/cnf/backup.log
```

You should see the same `OK   backup complete` line as in section 4.

This is a stronger test than just running the script, because it runs as the
`cnf` user with the same redirection cron uses. If it works here and not
overnight, the problem is the crontab line itself, not the backup.

**Proof 2 — check the morning after.**

The next day, run:

```bash
tail -30 /var/log/cnf/backup.log
```

**What you should see:** entries timestamped `02:00` with `OK backup complete`.

```bash
sudo -u cnf rclone lsd gdrive:CNF-Backups/daily | tail -3
```

**What you should see:** a folder named with last night's date, i.e.
`20260818-020001`.

**If nothing happened overnight** but Proof 1 worked, the crontab is wrong —
see the "works by hand, silent under cron" row in
[section 9](#9-when-something-goes-wrong).

> **Impatient?** You can make it prove itself in two minutes instead of waiting
> for 2 AM. Temporarily change the schedule line to run at the next minute — if
> it is 14:23 now, use `25 14 * * *` — wait, confirm it ran with
> `tail /var/log/cnf/backup.log`, then **change it back to `0 2 * * *`**.

---

## 6. The monthly 3-minute check

Put a recurring reminder in your phone for the **1st of every month**. Three
commands.

**1 — did last night's backup succeed?**

```bash
tail -30 /var/log/cnf/backup.log
```

Look for `OK   backup complete` with yesterday's or today's date.

**2 — is it actually in Google Drive?**

```bash
sudo -u cnf rclone lsd gdrive:CNF-Backups/daily | tail -5
```

The newest folder should be dated yesterday or today. If the newest is from
three weeks ago, the uploads have been failing for three weeks.

**3 — is the file a believable size?**

```bash
sudo -u cnf rclone ls gdrive:CNF-Backups/daily | sort -k2 | tail -5
```

`database.sql.gz` should be at least tens of kilobytes, and should **grow
slowly over the months** as you record more business. A file of a few hundred
bytes means the dump failed and you are backing up nothing.

**And once every three months:** do a practice restore, [section 7A](#7a-practice-restore-safe-do-this-every-3-months).
That is the only check that actually proves the backups work.

---

# GET YOUR DATA BACK

## 7. Restoring

Restoring means **taking a backup and putting the data back**. There are four
situations, and they are genuinely different. Find yours:

| Your situation | Go to |
|---|---|
| Nothing is wrong — I want to practise, safely | [7A](#7a-practice-restore-safe-do-this-every-3-months) |
| Something is badly wrong and I need yesterday's data back | [7B](#7b-restore-the-live-system-real-emergency) |
| The server's own backups are gone or I need an old one | [7C](#7c-restore-from-google-drive) |
| The server is destroyed | [7D](#7d-the-server-is-gone-entirely) |

### The three safety gates

Before any of that, understand why this is hard to get wrong. "Restore my
backup" and "destroy my live database" are the same command with a different
target, so the script refuses to proceed unless three separate things are true:

1. **It will not overwrite a database that has tables in it** unless you add
   `--force`.
2. **It asks you to type the database name by hand** unless you add `--yes`.
   `--force` does *not* skip this.
3. **It checks the fingerprints first.** If a backup is corrupt, it is
   discovered *before* anything is deleted.

All three are tested and confirmed working. Here is gate 1 refusing, for real:

```
[2026-08-17 07:58:25 +06] ERROR REFUSING: 'cnf_prod' on 127.0.0.1:3306 already holds 29 table(s).
[2026-08-17 07:58:25 +06] ERROR Restore into an empty schema instead, or pass --force
```

And gate 3 catching a damaged backup:

```
[2026-08-17 07:58:29 +06] ERROR CHECKSUM MISMATCH in …/20260817-999999 — this backup set is corrupt.
[2026-08-17 07:58:29 +06] ERROR Nothing has been changed. Try an older set.
```

Note **"Nothing has been changed."** The live database still had all 29 tables
afterwards. A corrupt backup cannot destroy your data.

---

### 7A. Practice restore (safe — do this every 3 months)

**This does not touch your live data.** It loads the backup into a separate
scratch database called `cnf_restore_check` and lets you confirm the data is
really in there. Nothing about the running system changes.

This is the single most valuable thing in this document. Do it.

**Step 1 — take a fresh backup to practise on**

```bash
cd /var/www/cnf-back-office
sudo -u cnf bash scripts/backup.sh --no-offsite --label drill
```

**Step 2 — see what would happen, first**

```bash
sudo -u cnf bash scripts/restore.sh --latest --target-db cnf_restore_check --skip-uploads --dry-run
```

`--skip-uploads` means "database only" — for a practice run you do not need
copies of the scanned documents.

Read the plan it prints. It should say
`target  mysql://cnf_migrate@127.0.0.1:3306/cnf_restore_check`. Confirm it does
**not** say `cnf_prod`.

**Step 3 — do the practice restore**

```bash
sudo -u cnf bash scripts/restore.sh --latest --target-db cnf_restore_check --skip-uploads --yes
```

**What you should see:**

```
[2026-08-17 07:59:11 +06] OK   checksums verified
[2026-08-17 07:59:11 +06] loading the dump into cnf_restore_check …
[2026-08-17 07:59:11 +06] OK   database restored — 29 table(s) in cnf_restore_check
[2026-08-17 07:59:11 +06] OK   restore complete in 0s

Measured restore time: 0s
```

**Write that "Measured restore time" number down.** At 3 AM on the worst day of
your business life, you will want to know whether recovery takes 30 seconds or
2 hours.

> Got `Access denied for user 'cnf_migrate'@'127.0.0.1' to database
> 'cnf_restore_check'`? You skipped [step 2.4](#2-one-time-setup-on-the-server).
> Run that one `GRANT` command and try again.

**Step 4 — prove the restored data is genuinely correct**

Counting tables is weak evidence. This is strong evidence — it re-adds up every
figure in the restored database and checks the money still balances:

```bash
cd /var/www/cnf-back-office
sudo -u cnf env DATABASE_URL="mysql://cnf_migrate:YOUR_PASSWORD@127.0.0.1:3306/cnf_restore_check" pnpm db:integrity
```

(Take `YOUR_PASSWORD` from the `DATABASE_URL` line in
`/var/www/cnf-back-office/.env`.)

**What you should see** — every line `[PASS]`, ending with:

```
[PASS] Advance invariant — per client, Σ advances.amount − Σ advance_adjustments.amount ≥ 0
[PASS] Bill totals — every bill satisfies net_payable = subtotal − deduction_total
[PASS] Receipt allocations — per receipt, Σ receipt_allocations.amount ≤ receipts.amount
[PASS] Audit log append-only — UPDATE/DELETE on audit_log are refused by the database
...
All integrity checks passed in 0.2s.
```

> **Do not be alarmed by red `prisma:error ... audit_log is append-only` lines
> in the middle of that output.** They are supposed to be there. The check
> deliberately *tries* to tamper with the audit log to confirm the database
> refuses. Those red lines are the protection working. Only the `[PASS]`/`[FAIL]`
> lines and the final summary are the verdict.

**Step 5 — a human eyeball**

```bash
sudo mysql cnf_restore_check -e "SELECT bill_no, bill_date, net_payable FROM bills ORDER BY id DESC LIMIT 5;"
```

Do those look like your five most recent bills? That is the check no script can
do for you.

**Step 6 — clean up the practice database**

```bash
sudo mysql -e "DROP DATABASE cnf_restore_check;"
```

**You are now done.** You have proved, with evidence, that your backups can be
restored. Do it again in three months.

---

### 7B. Restore the live system (real emergency)

⚠️ **This deletes everything currently in the live database and replaces it
with the backup.** Anything entered since that backup was taken is lost.

**Before you begin, be sure this is what you want.** If someone deleted one
bill, restoring a whole night's backup will also un-do every correct thing
entered since. Consider [7A](#7a-practice-restore-safe-do-this-every-3-months)
instead — restore into `cnf_restore_check`, look up the one row you need, and
copy it across by hand.

**Step 1 — back up the broken state first**

Yes, really. If the restore goes wrong, you want to be able to get back to
where you are standing right now.

```bash
cd /var/www/cnf-back-office
sudo -u cnf bash scripts/backup.sh --no-offsite --label before-restore
```

**Step 2 — stop the application**

So nobody writes data into a database that is about to be replaced:

```bash
pm2 stop cnf-back-office
```

**What you should see:** a table with `cnf-back-office` and status `stopped`.

**Step 3 — choose which backup to restore**

```bash
sudo -u cnf bash scripts/restore.sh --list
```

```
Backup sets in /var/backups/cnf-back-office

  daily      20260817-020000                    2.1 MB  db+uploads
  daily      20260816-020000                    2.1 MB  db+uploads
  monthly    202608-20260801-020000             1.9 MB  db+uploads
```

Pick the **newest set from before the problem started**.

**Step 4 — see exactly what will happen, before it happens**

```bash
sudo -u cnf bash scripts/restore.sh --from /var/backups/cnf-back-office/daily/20260817-020000 --dry-run
```

Read it. It will state, in red, how many tables it is about to destroy.

**Step 5 — do the restore**

```bash
sudo -u cnf bash scripts/restore.sh \
  --from /var/backups/cnf-back-office/daily/20260817-020000 \
  --target-db cnf_prod \
  --force
```

Note there is **no `--yes`**. That is deliberate: you *want* to be asked. The
script will stop and say:

```
To proceed, type the target database name exactly (cnf_prod), or anything else to abort.
confirm>
```

Type `cnf_prod` and press Enter. Anything else aborts and changes nothing.

**What you should see:**

```
[…] OK   checksums verified
[…] loading the dump into cnf_prod …
[…] OK   database restored — 29 table(s) in cnf_prod
[…] OK   uploads restored — 431 file(s) in /var/www/cnf-back-office/uploads
[…] OK   restore complete in 12s
```

> Your existing uploads folder is **moved aside**, not deleted — it is renamed
> to `uploads.pre-restore-<timestamp>` next to the original. If you restored the
> wrong set, your files are still there.

**Step 6 — check the data before letting anyone in**

```bash
cd /var/www/cnf-back-office
sudo -u cnf pnpm db:integrity
```

Every line must say `[PASS]` (again ignoring the red `audit_log is append-only`
lines — see 7A step 4).

**Step 7 — start the application**

```bash
pm2 start cnf-back-office
pm2 logs cnf-back-office --lines 50
```

Press `Ctrl + C` to stop watching the log.

**Step 8 — log in and look**

Open the site in your browser, sign in, and check that the most recent bill and
the most recent receipt are what you expect for the date of that backup.

---

### 7C. Restore from Google Drive

Use this when the server's own backup folder is lost, or you need an older set
that has aged out of the 30 kept locally.

**Step 1 — see what is in Drive**

```bash
sudo -u cnf rclone lsd gdrive:CNF-Backups/daily
```

```
  -1 2026-08-17 02:00:05  -1 20260817-020000
  -1 2026-08-16 02:00:04  -1 20260816-020000
```

The folder name is the last column: `20260817-020000` — that is
`YYYYMMDD-HHMMSS` in Bangladesh time.

**Step 2 — download the one you want**

```bash
sudo -u cnf mkdir -p /home/cnf/restore
sudo -u cnf rclone copy "gdrive:CNF-Backups/daily/20260817-020000" /home/cnf/restore/set -P
```

`-P` shows a live progress bar. Large backups over a slow connection take a
while.

**Step 3 — check all four files arrived**

```bash
ls -lh /home/cnf/restore/set
```

**What you should see:**

```
-rw------- 1 cnf cnf 2.1M Aug 17 08:14 database.sql.gz
-rw------- 1 cnf cnf 972  Aug 17 08:14 MANIFEST.txt
-rw------- 1 cnf cnf 242  Aug 17 08:14 SHA256SUMS
-rw------- 1 cnf cnf 431K Aug 17 08:14 uploads.tar.gz
```

**Step 4 — check nothing was damaged in transfer**

```bash
cd /home/cnf/restore/set && sha256sum -c SHA256SUMS
```

Every line must say `OK`. If any says `FAILED`, that copy is damaged — delete
it and download the night before instead.

**Step 5 — restore it**

Same as [7B](#7b-restore-the-live-system-real-emergency), pointing `--from` at
the downloaded folder:

```bash
pm2 stop cnf-back-office
cd /var/www/cnf-back-office
sudo -u cnf bash scripts/restore.sh --from /home/cnf/restore/set --target-db cnf_prod --force
# type cnf_prod when asked
sudo -u cnf pnpm db:integrity
pm2 start cnf-back-office
```

To practise this safely instead, use `--target-db cnf_restore_check --skip-uploads`.

---

### 7D. The server is gone entirely

The true disaster: the VPS is destroyed, or the hosting account is lost.

**What you need in hand — keep this somewhere that does not depend on the
server:**

- the **Google account** password *and* its second-factor device or recovery
  codes,
- your **domain** login,
- the contents of the old `.env` file, or at least the knowledge that you will
  be generating fresh database passwords and a fresh `AUTH_SECRET`.

**The order to work in:**

1. Build a new server following [`deployment.md`](./deployment.md) sections
   1–8: server, SSH, firewall, `cnf` user, Node, MySQL, `.env`.
   **Stop before deploying the application.**
2. Install rclone and reconnect Google Drive — [section 3](#3-connecting-google-drive)
   of this document.
3. Download the newest backup set — [section 7C](#7c-restore-from-google-drive),
   steps 1–4.
4. Deploy the application (`deployment.md` section 9) — but **do not run the
   seed script.** Seeding writes a fresh empty database over the top; your data
   comes from the backup instead.
5. Restore the set — [section 7C](#7c-restore-from-google-drive) step 5.
6. Start PM2 and Nginx and re-issue the TLS certificate (`deployment.md`
   sections 10–12).
7. **Set the backups up again on the new server** — sections
   [2](#2-one-time-setup-on-the-server), [3](#3-connecting-google-drive) and
   [5](#5-turning-on-the-automatic-nightly-backup). A restored server with no
   backup schedule is one failure away from the same disaster.

### If the scripts themselves are unavailable

The backup is a plain compressed SQL file. Any MySQL can load it:

```bash
gunzip -c /home/cnf/restore/set/database.sql.gz | mysql -u root -p cnf_prod
tar -xzf /home/cnf/restore/set/uploads.tar.gz -C /var/www/cnf-back-office/
```

This works because the dump deliberately contains **no** `CREATE DATABASE`
line — you name the target database yourself on the command line. That is also
what makes safe practice restores possible.

---

# REFERENCE

## 8. Understanding what you are looking at

### What one backup set contains

```
20260817-020000/
├── database.sql.gz    the entire database, compressed
├── uploads.tar.gz     scanned vouchers and documents (missing if you have none)
├── MANIFEST.txt       plain-English description of this set
└── SHA256SUMS         fingerprints, so damage is detectable
```

| File | What it is |
|---|---|
| `database.sql.gz` | Every table and every row — clients, jobs, bills, receipts, advances, loans, staff, users. Taken with `--single-transaction`, so it is a consistent snapshot and the application keeps working normally while it runs. |
| `uploads.tar.gz` | The `UPLOAD_DIR` folder — scanned vouchers, client documents, bill annexures. |
| `MANIFEST.txt` | When it was made, by whom, from which database, with which settings. |
| `SHA256SUMS` | A fingerprint of each file, checked automatically before any restore. |

### How folders are named

| Looks like | Means |
|---|---|
| `20260817-020000` | 17 August 2026 at 02:00:00, Bangladesh time |
| `20260817-075722-manual` | Same, plus the `--label manual` you typed |
| `202608-20260817-020000` | In `monthly/`: the set kept to represent August 2026 |

### How long backups are kept

| | Kept | How it works |
|---|---|---|
| **Daily** | 30 sets | The most recent 30 nights. Older ones are deleted automatically. |
| **Monthly** | 12 sets | The first successful backup of each month is kept for a year. |

So you can go back **any night for a month**, or **any month for a year**.

Monthly sets are "hard-linked", a Linux trick meaning the monthly copy costs no
extra disk space until the daily one ages out. A year of monthly backups is
close to free.

### Checking disk usage

```bash
du -sh /var/backups/cnf-back-office
ls -lh /var/backups/cnf-back-office/daily | tail -5
```

---

## 9. When something goes wrong

| What you see | What it means | What to do |
|---|---|---|
| Backup ends with **exit code 3** | The backup worked but the Google Drive copy failed. | **Urgent.** Run `sudo -u cnf bash scripts/offsite-sync.sh --dry-run` and read the error. You have a backup only on the machine that is going to fail. |
| `OFF-SERVER COPY IS NOT CONFIGURED` | `RCLONE_REMOTE` is missing from `.env.backup`, or `cnf` cannot read that file. | Redo [step 3.8](#3-connecting-google-drive), then `sudo chown cnf:cnf` and `sudo chmod 600` on the file. |
| `didn't find section in config file` | The Drive connection was made by the wrong user (usually root). | Check with `sudo -u cnf rclone listremotes` — it must print `gdrive:`. If not, redo [section 3.3](#3-connecting-google-drive) using `sudo -u cnf`. |
| `couldn't fetch token: invalid_grant` | Google revoked the authorisation — usually a password change, or 6 months of no use. | Redo [section 3](#3-connecting-google-drive). Nothing else is broken. |
| **Works by hand, but nothing happens overnight** | The crontab line is wrong. | `sudo crontab -u cnf -l`. It must have **no username column**, and must include the `cd`. Compare against [section 5.1](#5-turning-on-the-automatic-nightly-backup). Then check `tail -50 /var/log/cnf/backup.log`. |
| `database.sql.gz` is under 1 KB | The dump failed — nearly always wrong database credentials. | Run the backup by hand and read the error. Check `DATABASE_URL` in `/var/www/cnf-back-office/.env`. |
| `mysqldump not found` | MySQL client tools are missing. | `sudo apt install -y mysql-client` |
| `CHECKSUM MISMATCH` during restore | That backup set is damaged. | **Nothing was changed** — the check happens first. Use an older set. Keep the damaged one until you know why. |
| `Access denied ... to database 'cnf_restore_check'` | You skipped the practice-restore grant. | Run the `GRANT` in [step 2.4](#2-one-time-setup-on-the-server). |
| `REFUSING: 'cnf_prod' ... already holds 29 table(s)` | Safety gate 1. You are restoring over live data without saying so. | If you truly mean it, add `--force`. If you did not, you were just saved from a mistake. |
| `not a terminal and --yes was not given` | You ran a restore from a script or scheduled job. | Restores are interactive by design. Run it by hand, or add `--yes` if you are certain. |
| `quotaExceeded` / `storageQuotaExceeded` | The Google Drive is full. | Buy more storage, or lower `RETAIN_DAILY` in `.env.backup`. |
| Upload very slow | Normal on a slow link. | Ensure `RCLONE_FLAGS` includes `--drive-chunk-size=64M`. Consider running backups at a quieter hour. |
| `Stale backup lock` | A previous run crashed. | It clears itself after 6 hours. If urgent: `sudo rm -rf /var/backups/cnf-back-office/backup.lock`. |
| Monthly set not created | Normal. | Only the first successful backup of each month becomes the monthly one. |

### If you are truly stuck

Collect this and give it to whoever helps you — it is almost always enough to
diagnose the problem:

```bash
tail -50 /var/log/cnf/backup.log
sudo crontab -u cnf -l
sudo -u cnf rclone listremotes
ls -l /var/www/cnf-back-office/.env.backup
sudo -u cnf bash scripts/restore.sh --list
```

None of these print passwords.

---

## 10. Keeping the backups secure

A backup file contains **everything** — every client's finances, every bill,
and every user's password. Someone who steals a backup steals the business.
Treat the Google Drive folder exactly as carefully as the server itself.

- **Use a dedicated Google account** for backups, never your personal one.
- **Turn on 2-factor authentication** on it.
- **Never share the `CNF-Backups` folder** with anyone, and never move it into
  a shared drive.
- **Never leave a downloaded backup in your Downloads folder.** Delete it when
  you are done with it.
- **The key that opens your Drive lives on the server** at
  `/home/cnf/.config/rclone/rclone.conf`. Confirm only `cnf` can read it:

  ```bash
  sudo chmod 600 /home/cnf/.config/rclone/rclone.conf
  sudo ls -l /home/cnf/.config/rclone/rclone.conf
  ```

  **What you should see:** `-rw------- 1 cnf cnf`.

- **`.env` and `.env.backup` must never be committed to GitHub.** They are in
  `.gitignore` already — leave it that way.

### Optional: encrypt before upload

For a further layer, rclone can encrypt each file before it leaves the server,
so Google never holds readable data. Configure a `crypt` remote wrapping
`gdrive:` and point `RCLONE_REMOTE` at it.

> ⚠️ **If you do this, store the encryption password somewhere off the server —
> on paper, in a safe.** Lose it and the backups are permanently unreadable. No
> one can help you. For most small businesses a dedicated Google account with
> 2FA is the better trade.

---

## 11. All settings explained

Everything lives in `/var/www/cnf-back-office/.env.backup`. Anything you leave
out uses the default. Database details are read from the application's `.env`,
so you normally do not set them here at all.

| Setting | Default | What it does |
|---|---|---|
| `BACKUP_DIR` | `/var/backups/cnf-back-office` | Where backup sets are stored on the server. |
| `UPLOAD_DIR` | from `.env` | The documents folder to include. Must match `.env`. |
| `RETAIN_DAILY` | `30` | How many nightly sets to keep. |
| `RETAIN_MONTHLY` | `12` | How many monthly sets to keep. |
| `BACKUP_TZ` | `Asia/Dhaka` | Timezone for names and timestamps. |
| `OFFSITE_MODE` | `auto` | `rclone` (Google Drive), `scp` (another server), or `none`. |
| `RCLONE_REMOTE` | — | Where in Drive, e.g. `gdrive:CNF-Backups`. |
| `RCLONE_FLAGS` | `--transfers=4` | Extra upload options. |
| `SCP_TARGET` | — | For copying to a second server instead, e.g. `cnf@host:/srv/cnf`. |
| `SSH_KEY` | — | Key file for that second server. |
| `DATABASE_URL` | from `.env` | Database connection. Normally leave unset here. |
| `DB_HOST` | `127.0.0.1` | Only if not using `DATABASE_URL`. |
| `DB_PORT` | `3306` | Server uses 3306; the MacBook uses **3307**. |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | from `DATABASE_URL` | Only if not using `DATABASE_URL`. |
| `MYSQLDUMP` / `MYSQL_CLIENT` | auto-detected | Full paths, if not found automatically. |
| `GZIP_BIN` | `gzip` | Set to `pigz` for faster compression on a multi-core server. |

### Every option the scripts accept

**`scripts/backup.sh`**

| Option | Meaning |
|---|---|
| `--dry-run`, `-n` | Show the plan; write nothing, upload nothing. |
| `--no-offsite` | Make the local set but skip the Google Drive copy. |
| `--label WORD` | Add a word to the folder name. Letters, digits, `.`, `-`, `_`. |
| `--help`, `-h` | Show built-in help. |

**`scripts/restore.sh`**

| Option | Meaning |
|---|---|
| `--list` | Show every backup set available on this server. |
| `--latest` | Use the newest set. |
| `--from PATH` | Use a specific set folder. |
| `--target-db NAME` | Which database to restore into. Defaults to the one in `.env`. |
| `--skip-uploads` | Database only — do not restore documents. |
| `--uploads-dir PATH` | Restore documents somewhere other than `UPLOAD_DIR`. |
| `--dry-run`, `-n` | Show what would happen; change nothing. |
| `--force`, `-f` | Allow overwriting a database that already has tables. |
| `--yes`, `-y` | Skip the type-the-name confirmation. **Only in scripts.** |
| `--no-verify` | Skip the fingerprint check. **Don't.** |

**`scripts/offsite-sync.sh`**

| Option | Meaning |
|---|---|
| `--dry-run`, `-n` | Show what would be uploaded; upload nothing. |
| `--source PATH` | Sync a different folder than `BACKUP_DIR`. |

---

## What has actually been tested

Everything in this guide was run end to end against a real database before it
was written — not assumed:

- backup with database + uploads → four files produced, sizes and manifest correct
- `sha256sum -c SHA256SUMS` → all `OK`
- `restore.sh --list` → both daily and monthly sets listed
- restore into a scratch database → 29 tables, row counts identical to source
- uploads restored to a chosen folder → file present, contents intact
- `pnpm db:integrity` against the restored database → all checks `[PASS]`
- safety gate 1 (non-empty target) → refused, nothing changed
- safety gate 3 (deliberately corrupted set) → refused, all 29 tables survived
- the `GRANT` in step 2.4 → confirmed to be exactly what a practice restore needs

**Still to be done on the real server, by you:** a full drill on production-sized
data ([section 7A](#7a-practice-restore-safe-do-this-every-3-months)) and
recording the measured restore time here:

> **Measured restore time on the VPS: ______ (fill this in after your first drill)**

An untested restore time is a guess, not a plan.

---

## Related documents

- [User guide](user-guide.md) — how to use the system day to day.
- [Deployment](deployment.md) — building the server in the first place.
- [Release process](release-process.md) — shipping changes without harming production data.
- [Operations runbook](operations.md) — scheduled jobs and monthly review.
