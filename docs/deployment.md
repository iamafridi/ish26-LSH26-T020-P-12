# Deployment — TAMANNA TRADERS CNF Back Office

Step-by-step provisioning of the Ubuntu VPS that runs the application. Every command
is real and copy-pasteable. Nothing is invented.

**Target server:** Ubuntu 22.04 or 24.04 LTS, minimum 2 vCPU / 4 GB RAM / 40 GB SSD.

**Architecture:**

```
Internet → Nginx (443, TLS) → PM2 (1 worker, mandatory) → Next.js (127.0.0.1:3000) → MySQL 8 (localhost)
```

**Audience:** whoever has root or sudo on the VPS. You do not need to be a developer, but
you do need to follow every step in order and not skip anything.

---

## Table of contents

1. [Create the server](#1-create-the-server)
2. [SSH hardening](#2-ssh-hardening)
3. [Firewall (UFW)](#3-firewall-ufw)
4. [fail2ban](#4-fail2ban)
5. [System user and directory](#5-system-user-and-directory)
6. [Node 22 LTS](#6-node-22-lts)
7. [MySQL 8](#7-mysql-8)
8. [Environment file](#8-environment-file)
9. [Deploy the application](#9-deploy-the-application)
10. [PM2 process manager](#10-pm2-process-manager)
11. [Nginx reverse proxy](#11-nginx-reverse-proxy)
12. [TLS certificate (Certbot)](#12-tls-certificate-certbot)
13. [Log rotation](#13-log-rotation)
14. [Pre-go-live checklist](#14-pre-go-live-checklist)
15. [Release procedure](#15-release-procedure)
16. [Rollback procedure](#16-rollback-procedure)
17. [Environment variables reference](#17-environment-variables-reference)

---

## 1. Create the server

1. Create an Ubuntu 22.04 or 24.04 LTS VPS (2 vCPU, 4 GB RAM, 40 GB SSD minimum).
2. Note the server's public IP address.
3. You will log in as `root` for the first steps only.

---

## 2. SSH hardening

Do this **before** anything else. Password login is disabled for all accounts.

```bash
# As root — create the application user
adduser cnf
usermod -aG sudo cnf

# Set up SSH key for the cnf user
mkdir -p /home/cnf/.ssh
cp /root/.ssh/authorized_keys /home/cnf/.ssh/
chown -R cnf:cnf /home/cnf/.ssh
chmod 700 /home/cnf/.ssh
chmod 600 /home/cnf/.ssh/authorized_keys

# Harden SSH — disable password login and root SSH
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd
```

Verify you can still log in as `cnf` with your SSH key before closing the root session.

---

## 3. Firewall (UFW)

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

MySQL port 3306 stays closed to the world. The application connects to MySQL on
localhost only — see section 7.

---

## 4. fail2ban

```bash
sudo apt update && sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

fail2ban ships with default jail configs for SSH. Nginx HTTP auth and rate-limiting
jails activate automatically if you add them later.

---

## 5. System user and directory

```bash
# The cnf user already exists from section 2.

# Application directory
sudo mkdir -p /var/www/cnf-back-office
sudo chown cnf:cnf /var/www/cnf-back-office

# Uploads directory — outside the deploy dir (P7-F13)
sudo mkdir -p /var/lib/cnf-back-office/uploads
sudo chown cnf:cnf /var/lib/cnf-back-office/uploads

# Log directory
sudo mkdir -p /var/log/cnf
sudo chown cnf:cnf /var/log/cnf
chmod 750 /var/log/cnf

# Runtime state directory (integrity check status)
sudo -u cnf mkdir -p /var/www/cnf-back-office/.data

# Backup directory
sudo mkdir -p /var/backups/cnf-back-office
sudo chown cnf:cnf /var/backups/cnf-back-office
```

---

## 6. Node 22 LTS

```bash
# As the cnf user
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
corepack enable
corepack prepare pnpm@11.21.0 --activate

# Verify
node -v    # should show v22.x.x
pnpm -v    # should show 11.x.x
```

---

## 7. MySQL 8

### 7.1 Install and secure

```bash
sudo apt install -y mysql-server

# Secure the installation — sets a root password, removes test databases,
# removes anonymous users, disallows remote root login.
sudo mysql_secure_installation
```

### 7.2 Bind to localhost

Edit `/etc/mysql/mysql.conf.d/mysqld.cnf` (Ubuntu) or `/etc/my.cnf` (CentOS):

```ini
[mysqld]
bind-address = 127.0.0.1
```

Restart MySQL:

```bash
sudo systemctl restart mysql
```

### 7.3 Create the database

```sql
CREATE DATABASE cnf_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

### 7.4 Create two users (hard requirement)

The application **must** use two separate MySQL accounts. This is not optional — it
prevents a compromised application process from altering its own schema.

**`cnf_migrate`** — DDL user (for Prisma migrations and seed):

```sql
CREATE USER 'cnf_migrate'@'127.0.0.1' IDENTIFIED BY '<strong-password>';
GRANT ALL PRIVILEGES ON cnf_prod.* TO 'cnf_migrate'@'127.0.0.1';
FLUSH PRIVILEGES;
```

**`cnf_app`** — DML-only application user (SELECT, INSERT, UPDATE, DELETE — no DROP,
no ALTER, no GRANT):

```sql
CREATE USER 'cnf_app'@'127.0.0.1' IDENTIFIED BY '<strong-password>';
GRANT SELECT, INSERT, UPDATE, DELETE ON cnf_prod.* TO 'cnf_app'@'127.0.0.1';
FLUSH PRIVILEGES;
```

**Verify the grants:**

```sql
SHOW GRANTS FOR 'cnf_app'@'127.0.0.1';
-- Should show: SELECT, INSERT, UPDATE, DELETE on cnf_prod.* — nothing else.
-- NO DROP, NO ALTER, NO GRANT, NO global privileges.

SHOW GRANTS FOR 'cnf_migrate'@'127.0.0.1';
-- Should show: ALL PRIVILEGES on cnf_prod.*
```

### 7.5 Tune InnoDB

In `/etc/mysql/mysql.conf.d/mysqld.cnf`, set:

```ini
[mysqld]
innodb_buffer_pool_size = 2G
```

That is 50% of the 4 GB RAM target. Restart MySQL after changing.

### 7.6 Verify MySQL binds to localhost only

```bash
mysql -u root -p -e "SHOW VARIABLES LIKE 'bind_address';"
-- Should show: 127.0.0.1
```

---

## 8. Environment file

The application loads `/var/www/cnf-back-office/.env` at boot. This file contains
secrets and must be mode 600, owned by `cnf`.

```bash
sudo -u cnf tee /var/www/cnf-back-office/.env > /dev/null << 'EOF'
# ---- database ----
# cnf_migrate user (DDL) — used by Prisma migrations and seed.
DATABASE_URL=mysql://cnf_migrate:<password>@127.0.0.1:3306/cnf_prod

# cnf_app user (DML) — used by the running application.
DATABASE_URL_APP=mysql://cnf_app:<password>@127.0.0.1:3306/cnf_prod

# Prisma shadow database for migration diffing.
SHADOW_DATABASE_URL=mysql://cnf_migrate:<password>@127.0.0.1:3306/cnf_shadow

# ---- auth ----
# Generate with: openssl rand -base64 32
AUTH_SECRET=<generated-secret>

# Public origin — MUST be https:// in production.
# The app refuses to start without this (P7-F01).
AUTH_URL=https://your-domain.example

# ---- uploads ----
# Outside the deploy directory. The directory must exist (section 5).
UPLOAD_DIR=/var/lib/cnf-back-office/uploads

# ---- runtime ----
TZ=Asia/Dhaka
EOF

sudo chmod 600 /var/www/cnf-back-office/.env
sudo chown cnf:cnf /var/www/cnf-back-office/.env
```

**Critical rules:**

- `AUTH_URL` **must** start with `https://` in production. The app will not start
  without it (P7-F01). The session cookie's `Secure` flag depends on this.
- `USE_SECURE_COOKIES` is never set on the VPS. It defaults to `true` when
  `AUTH_URL` is `https://`.
- `DATABASE_URL` (migration user) and `DATABASE_URL_APP` (application user) are
  different accounts. The app reads `DATABASE_URL_APP` first; Prisma migrations
  read `DATABASE_URL`.
- Create the shadow database:

```bash
mysql -u cnf_migrate -p -e "CREATE DATABASE cnf_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
```

---

## 9. Deploy the application

```bash
# As the cnf user
cd /var/www/cnf-back-office

# Clone the repository
git clone <repository-url> .

# Install dependencies
pnpm install --frozen-lockfile

# Generate the Prisma client
pnpm prisma generate

# Run migrations against the migration user (DATABASE_URL)
pnpm prisma migrate deploy

# Seed the database (admin user, categories, channels)
pnpm db:seed

# Build the production bundle
pnpm build
```

---

## 10. PM2 process manager

The ecosystem file pins a **single worker** (`instances: 1`). This is a security
requirement, not a tuning choice: the login rate limiter lives in process memory
(P0-F09), so a second worker would give every attacker IP a fresh 5-attempt budget —
10 attempts / 15 min against plan.md §14's required 5 (P7-G1-M2). plan.md §13 puts
concurrency at 2–5 users; one Next.js process handles that comfortably, and
`pm2 reload` is still zero-downtime.

```bash
# As the cnf user, from the app directory
pm2 start ecosystem.config.js

# Boot persistence — run ONCE
sudo pm2 startup systemd -u cnf --hp /home/cnf
pm2 save
```

**Log rotation (pm2-logrotate):**

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
```

**Useful commands:**

```bash
pm2 status                  # see running processes
pm2 logs cnf-back-office    # tail the logs
pm2 reload cnf-back-office  # zero-downtime reload (after a release)
pm2 restart cnf-back-office # full restart (if reload is not enough)
```

---

## 11. Nginx reverse proxy

### 11.1 Install Nginx

```bash
sudo apt install -y nginx
```

### 11.2 Copy the site config

The repository includes `deploy/nginx.conf`. Copy it to Nginx's sites directory:

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/cnf-back-office
```

### 11.3 Edit the placeholders

Open `/etc/nginx/sites-available/cnf-back-office` and replace every occurrence of
`YOUR-DOMAIN` with your real domain (for example `tamanna.example.com`):

```bash
sudo sed -i 's/YOUR-DOMAIN/tamanna.example.com/g' /etc/nginx/sites-available/cnf-back-office
```

### 11.3 Enable the site

```bash
sudo ln -s /etc/nginx/sites-available/cnf-back-office /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 11.4 Verify the proxy headers

The Nginx config includes the four proxy headers the application depends on
(P7-F02). **Do not change these:**

```nginx
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;   # NOT $http_x_forwarded_for
proxy_set_header X-Forwarded-Proto $scheme;
```

The `X-Forwarded-For` line is the login rate limiter's entire trust model.
Using `$http_x_forwarded_for` instead lets attackers bypass the 5-per-15-minute
limit entirely. The line as written appends the immediate peer's IP to any header
the client sent, so the rightmost hop is trustworthy.

### 11.5 What the config does

- **HTTP → HTTPS redirect:** port 80 returns 301 to HTTPS.
- **HSTS:** `max-age=63072000` (2 years), includes subdomains, preload.
- **TLS:** TLSv1.2 and TLSv1.3 only, strong cipher suite.
- **client_max_body_size 6M:** matches the upload limit.
- **Gzip compression:** text, JSON, JS, CSS, CSV, Excel, SVG.
- **Static asset caching:** `/_next/static/` cached for 1 year (immutable).
- **Export timeout:** `/api/export/` gets 180s read/send timeout, buffering off.
- **Server tokens off:** Nginx version is hidden from error pages.

---

## 12. TLS certificate (Certbot)

```bash
sudo apt install -y certbot python3-certbot-nginx

# Obtain the certificate (replace with your domain and email)
sudo certbot --nginx -d tamanna.example.com --email admin@example.com --agree-tos --non-interactive

# Verify auto-renewal is set up
sudo systemctl status certbot.timer
```

Certbot's renewal timer runs twice daily and reloads Nginx when a certificate
is renewed. The Nginx config references the default cert paths:

```
/etc/letsencrypt/live/YOUR-DOMAIN/fullchain.pem
/etc/letsencrypt/live/YOUR-DOMAIN/privkey.pem
```

---

## 13. Log rotation

Create `/etc/logrotate.d/cnf`:

```bash
sudo tee /etc/logrotate.d/cnf > /dev/null << 'EOF'
/var/log/cnf/*.log {
    monthly
    rotate 24
    size 10M
    compress
    delaycompress
    missingok
    notifempty
    create 0640 cnf cnf
    su cnf cnf
}
EOF
```

PM2 log rotation is handled separately by `pm2-logrotate` (section 10).

---

## 14. Pre-go-live checklist

Run through every item before the first real user signs in:

- [ ] SSH: password login disabled, root login disabled.
- [ ] UFW: only 22, 80, 443 open.
- [ ] MySQL: `bind-address = 127.0.0.1`, not publicly reachable.
- [ ] MySQL: `cnf_app` has SELECT/INSERT/UPDATE/DELETE only — no DROP, no ALTER.
- [ ] MySQL: `cnf_migrate` has ALL PRIVILEGES on `cnf_prod.*`.
- [ ] `.env`: `AUTH_URL` starts with `https://`.
- [ ] `.env`: `DATABASE_URL` and `DATABASE_URL_APP` point to different MySQL users.
- [ ] `.env`: `UPLOAD_DIR` is set and the directory exists.
- [ ] `.env`: mode 600, owned by `cnf`.
- [ ] PM2: `pm2 status` shows exactly **1** worker running, `NODE_ENV=production`.
      Do NOT scale to 2 — the login rate limiter is in-memory per process, and a
      second worker doubles the per-IP login budget to 10/15 min against the
      required 5 (P7-G1-M2). `ecosystem.config.js` pins `instances: 1`.
- [ ] PM2: `pm2 startup` and `pm2 save` done — survives reboots.
- [ ] Nginx: `sudo nginx -t` passes.
- [ ] Nginx: `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for` (not `$http_x_forwarded_for`).
- [ ] Nginx: HSTS header present on the 443 block.
- [ ] Certbot: certificate obtained and auto-renewal timer active.
- [ ] Backup: `bash scripts/backup.sh --dry-run` shows a valid plan.
- [ ] Backup: off-server copy configured (rclone or scp) — a backup only on the VPS is not a backup.
- [ ] Restore drill: documented in `docs/backup.md` with measured time.
- [ ] Cron: backup at 02:00 and integrity check at 02:30 Monday — both installed.
- [ ] App: sign in at `https://your-domain` and create a test bill.
- [ ] Print: test bill prints aligned on real letterhead.

---

## 15. Release procedure

Every release follows this exact sequence. **Do not skip the mysqldump.**

```bash
# As the cnf user
cd /var/www/cnf-back-office

# 1. Pull the latest code
git pull

# 2. Install dependencies (locked)
pnpm install --frozen-lockfile

# 3. BACKUP — before touching the schema (mandatory, no exceptions)
bash scripts/backup.sh --no-offsite --label pre-migrate

# 4. Run database migrations (reads DATABASE_URL — the migration user)
pnpm prisma migrate deploy

# 5. Build the production bundle
pnpm build

# 6. Reload PM2 (zero-downtime — new workers start, old workers finish)
pm2 reload cnf-back-office
```

**Why the mysqldump first:** `prisma migrate deploy` can alter tables, add columns,
change indexes. If a migration breaks something, the backup from step 3 is how you
recover. A backup taken after the migration is too late.

---

## 16. Rollback procedure

If a release goes wrong and the application is broken:

### Option A: Roll back the code (no schema change)

If you only deployed code changes (no migration), roll back the git commit:

```bash
cd /var/www/cnf-back-office

# Find the last good commit
git log --oneline -5

# Roll back to it
git checkout <good-commit-hash>

# Reinstall, rebuild, reload
pnpm install --frozen-lockfile
pnpm build
pm2 reload cnf-back-office
```

### Option B: Roll back a migration (schema changed)

If a migration was deployed and broke things:

```bash
cd /var/www/cnf-back-office

# 1. Stop the app so it does not write to the broken schema
pm2 stop cnf-back-office

# 2. Restore the database from the pre-migration backup
bash scripts/restore.sh --latest --target-db cnf_prod --force --yes

# 3. Check the code out to the last good commit
git checkout <good-commit-hash>
pnpm install --frozen-lockfile
pnpm build

# 4. Start the app
pm2 start cnf-back-office
```

**Important:** restoring over the live schema is destructive. Only do this when the
schema is broken — not for code-only issues.

### Option C: Restore into a scratch schema to check first

```bash
# One-time: cnf_migrate is scoped to cnf_prod only, so grant it the scratch name
# or this fails with "Access denied ... to database 'cnf_restore_check'".
sudo mysql -e "GRANT ALL PRIVILEGES ON cnf_restore_check.* TO 'cnf_migrate'@'127.0.0.1'; FLUSH PRIVILEGES;"

# Restore into a throwaway name
bash scripts/restore.sh --latest --target-db cnf_restore_check --skip-uploads

# Inspect it
mysql -u cnf_migrate -p cnf_restore_check -e "SHOW TABLES;"

# If it looks good, restore for real (stop the app first)
pm2 stop cnf-back-office
bash scripts/restore.sh --latest --target-db cnf_prod --force --yes
pm2 start cnf-back-office
```

---

## 17. Environment variables reference

Every key the deployment needs. All of these live in `/var/www/cnf-back-office/.env`.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | MySQL URL for the **migration user** (`cnf_migrate`). Used by Prisma migrations and seed. Never reached by the running app. |
| `DATABASE_URL_APP` | Yes | MySQL URL for the **application user** (`cnf_app`). DML only. Read by `src/server/db.ts`. |
| `SHADOW_DATABASE_URL` | Yes | MySQL URL for Prisma's shadow database. The migration user must have CREATE/DROP on it. |
| `AUTH_SECRET` | Yes | Session signing secret. Generate with `openssl rand -base64 32`. Rotating this invalidates all sessions. |
| `AUTH_URL` | Yes | Public origin, no trailing slash. **Must be `https://` in production.** The app refuses to start without it (P7-F01). |
| `UPLOAD_DIR` | Yes (prod) | Absolute path to the uploads directory, outside the deploy dir. Must exist and be owned by `cnf`. The app throws in production without it (P7-F13). |
| `TZ` | Yes | Business timezone. Set to `Asia/Dhaka`. |
| `USE_SECURE_COOKIES` | No | Never set on the VPS. Defaults to `true` when `AUTH_URL` is `https://`. Only set to `"false"` for local E2E testing over plain HTTP. |

**Do not set:**

- `DATABASE_URL_TEST` — only for the E2E test harness, never on the VPS.
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — only for first-time seeding, removed after.

---

## Further reading

- [Backup and restore](backup.md) — backup schedule, retention, off-server copy, restore procedure.
- [Operations runbook](operations.md) — scheduled cron jobs, integrity check, monthly review.
- [Security review](security-review.md) — the full security review including deployment requirements.
- [User guide](user-guide.md) — written for the owner, no jargon.
