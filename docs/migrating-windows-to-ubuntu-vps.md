# Migrating from the office Windows PC to an Ubuntu VPS

**Who this is for:** whoever moves the system off the office PC and onto a
rented Ubuntu server on the internet, months or years after the Windows setup
in [Running the system on a Windows computer](./deployment-windows.md).

This is written to be read **twice**: once well in advance, to plan and budget,
and once on the day, as a checklist.

> **The short version.** The database dump the Windows backup already makes is
> the migration file. It is deliberately written so it can be loaded into a
> Linux MySQL without editing. If your Windows backups have been running and
> you have tested a restore, this move is mostly copying one file and waiting.

> **There is no code conversion to do.** Windows and Ubuntu run the *same*
> repository and the same branch —
> `https://github.com/abh-mehedi/cnf-back-office.git`. The program contains
> nothing that is specific to either system. On the server you install that
> same code and move the data across; you never rebuild, port, or convert
> anything. The only difference is which helper scripts you use for backups —
> `.ps1` on Windows, `.sh` on Ubuntu — and both ship in that one repository.
> See [One codebase, both systems](./deployment-windows.md#one-codebase-both-systems).

---

## Part 1 — Deciding to move

### Signs it is time

| Sign | Why a VPS fixes it |
|---|---|
| Someone needs it from home, or while travelling | A VPS is reachable from anywhere |
| The office PC has crashed, or you fear it will | A VPS has redundant disks and is someone else's job to keep alive |
| You now have more than a handful of users | A small VPS handles far more than one office PC juggling other work |
| You want backups off-site without thinking | Off-site becomes the normal case, not something you remember to do |
| A power cut took the office offline | A data centre has generators |

### What it costs

A VPS suitable for this — 2 CPU, 4 GB memory, 80 GB disk — is roughly **US$12–24
a month**. Add a domain name at about **US$10–15 a year**. HTTPS certificates
are free.

### What you gain and lose

| | Windows PC | Ubuntu VPS |
|---|---|---|
| Reachable from | The office only | Anywhere |
| Monthly cost | Nothing extra | ~US$15 |
| If the hardware dies | Your problem, office offline | Provider's problem, usually minutes |
| Backups off-site | Only if you arranged it | Straightforward |
| Someone must understand Linux | No | **Yes** — the honest cost |
| Reachable by strangers | No | **Yes** — so it must be kept patched |

That last pair is the real trade. On the office network, a mistake is contained.
On the internet, it is not. Do not make this move without someone who can keep
an Ubuntu server updated — or a small support arrangement with someone who can.

---

## Part 2 — Before the day

Work through this in the days before. None of it touches the live system.

### 2.1 Prove your backups actually restore

If you have never done the restore drill in
[deployment-windows.md Part 12.6](./deployment-windows.md#126-prove-a-backup-can-actually-be-restored),
**do it now**. The whole migration rests on that file being good. Discovering
it is not, on migration day, with the office waiting, is the worst possible
time.

### 2.2 Write down your versions

On the Windows PC:

```
node --version
mysql --version
```

The Ubuntu server must get **the same major versions** — Node 22 and MySQL 8.4.
A dump from MySQL 8.4 will not reliably load into an older MySQL.

### 2.3 Rent the server and point a name at it

1. Choose a provider (DigitalOcean, Hetzner, Vultr, Linode are all fine) and
   create an **Ubuntu 24.04 LTS** server. Pick the region closest to Dhaka —
   Singapore is usually the best available.
2. Buy a domain, e.g. `tamannatraders.com`.
3. Add a DNS **A record** pointing `office.tamannatraders.com` at the server's
   IP address.

Do this a few days ahead. DNS changes can take hours to spread.

### 2.4 Build the server, without touching the old one

Follow [deployment.md](./deployment.md) — the existing Ubuntu guide — right up
to but **not including** seeding the database. You want a server that is fully
built and waiting, with no data in it.

At the end you should have Node, MySQL, the code, Nginx and a TLS certificate
in place, and `pnpm db:deploy` run so the empty tables exist.

### 2.5 Rehearse the whole thing

Take a backup from Windows today, carry it over, restore it, and open the app on
the VPS. It is the same steps as Part 3 below. Nothing is switched over — the
office keeps using Windows throughout.

You will find whatever is going to go wrong, on a day when it does not matter.
Then throw that rehearsal away:

```bash
sudo mysql -e "DROP DATABASE cnf_prod; CREATE DATABASE cnf_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
```

---

## Part 3 — Migration day

Pick a time when nobody is entering data — a Friday evening or a holiday. Allow
**two to three hours**, most of it waiting and checking.

### 3.1 Tell people, and stop the app

Nobody may enter anything from here until you say so, or that work will be lost:
it will be in the Windows database, and you are about to copy the Windows
database as it stands right now.

On the Windows PC, as Administrator:

```
nssm stop CNFBackOffice
```

The app is now down. The database is still running, which is what you want.

### 3.2 Take the final backup

```
cd C:\CNF\app
powershell -ExecutionPolicy Bypass -File scripts\windows\backup.ps1 -Label final-migration -NoOffsite
```

Note the folder name it prints, e.g. `20270115-193000-final-migration`.

This is **the** copy of your business. Treat it accordingly.

### 3.3 Copy it to the server

From the Windows PC (Windows 10 and 11 include `scp`):

```
scp -r "C:\CNF-Backups\daily\20270115-193000-final-migration" cnf@office.tamannatraders.com:/home/cnf/migration/
```

Use your actual folder name and server address. If `scp` is unavailable, use
WinSCP (<https://winscp.net>) and drag the folder across.

### 3.4 Check nothing was damaged in transit

On the **Ubuntu server**:

```bash
cd /home/cnf/migration/20270115-193000-final-migration
sha256sum -c SHA256SUMS
```

Every line must say `OK`:

```
database.sql.gz: OK
MANIFEST.txt: OK
uploads.zip: OK
```

> This works because the Windows backup writes its fingerprints in exactly the
> format the standard Linux tool expects. It was checked deliberately, so that
> this moment would be simple.

**If any line says FAILED, stop.** Copy the folder again. Never load a backup
that failed this check.

### 3.5 Load the database

```bash
cd /home/cnf/migration/20270115-193000-final-migration
gunzip -c database.sql.gz | mysql -u cnf_migrate -p cnf_prod
```

It asks for the `cnf_migrate` password (from the server's `.env`) and then goes
quiet for anything from seconds to several minutes. Silence is success — MySQL
only speaks up when something is wrong.

> **Why this just works.** The dump contains no `CREATE DATABASE` and no `USE`
> line, so it loads into whatever database you point it at. That is the same
> property that lets you rehearse a restore into a scratch database, and it is
> why moving between Windows and Linux needs no editing of the file.

Check it arrived:

```bash
mysql -u cnf_migrate -p cnf_prod -e "
  SELECT
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='cnf_prod') AS tables,
    (SELECT COUNT(*) FROM clients) AS clients,
    (SELECT COUNT(*) FROM bills)   AS bills,
    (SELECT COUNT(*) FROM users)   AS users;"
```

**Compare those four numbers with the same query on Windows** before you go
further:

```
mysql -u cnf_migrate -p cnf_prod -e "SELECT (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='cnf_prod') AS tables, (SELECT COUNT(*) FROM clients) AS clients, (SELECT COUNT(*) FROM bills) AS bills, (SELECT COUNT(*) FROM users) AS users;"
```

They must match exactly. If they do not, stop and find out why.

### 3.6 Restore the scanned documents

The Windows backup stores these as a `.zip` (Windows has no `tar` by default;
Linux reads `.zip` perfectly well):

```bash
sudo apt install -y unzip
unzip uploads.zip -d /var/lib/cnf/uploads
sudo chown -R cnf:cnf /var/lib/cnf/uploads
find /var/lib/cnf/uploads -type f | wc -l
```

That last count should match what the Windows PC had:

```
dir /s /b C:\CNF\uploads | find /c /v ""
```

> Note for later: backups taken **on Ubuntu** produce `uploads.tar.gz` instead,
> and `scripts/restore.sh` expects that name. This one time, because the set
> came from Windows, you unpack the uploads by hand as above. Everything after
> today follows the Linux guide.

### 3.7 Apply any updates the schema needs

If the server is running a newer version of the app than Windows was:

```bash
cd /home/cnf/app
pnpm db:deploy
```

Safe to run either way — it does nothing if there is nothing to apply.

### 3.8 Check the money

```bash
cd /home/cnf/app
pnpm db:check
pnpm db:integrity
```

`db:check` must end with *the database is reachable*. `db:integrity` re-derives
every total from the underlying records and must report `[PASS]` throughout.

> Red lines saying **`audit_log is append-only`** are **expected and correct**.
> The check deliberately tries to tamper with the audit trail to prove the
> database refuses it. Their absence would be the problem.

### 3.9 Start it and look at it yourself

```bash
sudo systemctl start cnf-app
sudo systemctl status cnf-app
```

Open `https://office.tamannatraders.com` and **check with your own eyes**:

- [ ] Sign in works
- [ ] The client list is complete and correct
- [ ] Open a recent bill — the lines, amounts and total are right
- [ ] The bill's PDF opens and looks correct
- [ ] Open a bill with an attached document — it downloads and opens
- [ ] The dashboard figures match what Windows showed
- [ ] Create a test client, then deactivate it — writing works

Do not skip this because the numbers matched. Numbers matching means the rows
arrived; this checks the system actually *works*.

### 3.10 Change everyone's address

Tell everyone the new address. Update the browser shortcuts on each PC.

**Keep the Windows PC's app service stopped.** Two copies accepting bills means
two sets of books, and they will diverge within a day.

### 3.11 Set up backups on the server

The VPS has its own backup arrangement — the shell scripts, not the PowerShell
ones. Follow [backup.md](./backup.md) from the beginning: `.env.backup`, the
Google Drive connection, and the nightly schedule.

**Take one by hand and confirm it works before you finish for the day.**

---

## Part 4 — If it goes wrong

You still have everything. The Windows PC is untouched: its database, its
uploads, its app — all exactly as they were when you stopped the service.

To go back:

```
nssm start CNFBackOffice
```

Tell everyone the old address again. You have lost nothing but an evening.

**This is why the Windows PC stays intact.** Do not wipe it, repurpose it, or
"tidy it up" on migration day.

### How long to keep the old PC

| When | What to do |
|---|---|
| First week | Leave it exactly as it is, app stopped. This is your fallback. |
| After two weeks of the VPS working | Take one last backup, copy it somewhere safe, keep the PC as-is |
| After one month | Safe to repurpose the PC. **Keep that final backup** — it is your record of the changeover |

Never delete the final Windows backup. If a question about an old bill ever
comes up, it is the only proof of what the books looked like on the day.

---

## Part 5 — What changes for you afterwards

### Commands

| What | Windows (before) | Ubuntu (after) |
|---|---|---|
| Stop the app | `nssm stop CNFBackOffice` | `sudo systemctl stop cnf-app` |
| Start the app | `nssm start CNFBackOffice` | `sudo systemctl start cnf-app` |
| Is it running? | `sc query CNFBackOffice` | `sudo systemctl status cnf-app` |
| Read the logs | `C:\CNF\logs\app-error.log` | `sudo journalctl -u cnf-app -n 100` |
| Back up now | `backup.ps1` | `bash scripts/backup.sh` |
| Restore | `restore.ps1` | `bash scripts/restore.sh` |
| Check the database | `pnpm db:check` | `pnpm db:check` (unchanged) |
| Reset the admin password | `pnpm admin:reset-password` | `pnpm admin:reset-password` (unchanged) |

### New responsibilities

The server is now on the public internet. Somebody must:

- **Apply security updates**, monthly at least:
  `sudo apt update && sudo apt upgrade`
- **Watch that the certificate renews.** It is automatic, but check the site
  does not warn, especially around the 90-day mark
- **Confirm the nightly backup ran** — a glance at the folder, weekly
- **Pay the bill.** An unpaid VPS is deleted, usually with little warning

None of these are hard. All of them are somebody's job now, and if that job
belongs to nobody it will not get done.

### What does not change

The app itself is identical — same screens, same reports, same PDFs, same
rules. Nobody in the office needs retraining. Only the address changes.

---

## Quick checklist for the day

Print this.

```
BEFORE
  [ ] Restore drill done and passed
  [ ] Ubuntu server built, empty, waiting
  [ ] Domain name pointing at it, HTTPS working
  [ ] Full rehearsal done and thrown away
  [ ] Everyone told: no data entry after <time>

ON THE DAY
  [ ] Windows app service stopped
  [ ] Final backup taken, labelled final-migration
  [ ] Copied to the server
  [ ] sha256sum -c SHA256SUMS -> every line OK
  [ ] Database loaded
  [ ] Four counts match Windows exactly
  [ ] Uploads unzipped, file count matches
  [ ] pnpm db:deploy
  [ ] pnpm db:check passes
  [ ] pnpm db:integrity all PASS
  [ ] App started
  [ ] Checked by eye: login, clients, a bill, its PDF, an attachment, dashboard
  [ ] Everyone given the new address
  [ ] Backups running on the server, one taken by hand

AFTER
  [ ] Windows PC left alone, app service stopped, for at least two weeks
  [ ] Final Windows backup stored somewhere permanent
```

---

## What has been tested, and what has not

**Verified while writing this:**

- The Windows backup's `SHA256SUMS` verifies with the standard Linux
  `sha256sum -c`. This is what makes step 3.4 work, and it was confirmed by
  running the Linux tool against a file the Windows script produced.
- The database dump carries no `CREATE DATABASE` or `USE` line, so it loads
  into any database name. Confirmed by restoring one into a differently-named
  scratch database and getting an exact copy back — 29 tables, identical row
  counts.
- The uploads archive written on Windows is a standard `.zip` that Linux
  `unzip` reads, and the `.sql.gz` is standard gzip that `gunzip` reads. Both
  checked with the Linux tools.

**Not tested:** the migration has not been performed end to end on a real VPS,
because there is no server to perform it on yet. The individual steps are drawn
from the existing, tested [deployment.md](./deployment.md) and from the backup
format verified above — but **do the rehearsal in 2.5**. That is what turns
this document from a plan into a procedure you have actually done.
