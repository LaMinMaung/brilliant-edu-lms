# Brilliant Edu LMS: Deployment Guide (Phase 1)

This guide covers deploying the LMS to a production subdomain such as `lms.ourwebsite.org`.
The domain is **not hard-coded** anywhere in the application. Every deployment-specific value
is configured as described below.

---

## 1. Architecture at a glance

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19 + Vite + Tailwind CSS v4 (static build) | Talks to the backend over HTTPS using the PocketBase JS SDK |
| Backend / API | PocketBase v0.28 (single Go binary) | REST API, auth, access rules, file storage, hooks, cron |
| Database | SQLite (embedded in PocketBase, WAL mode) | Stored in `pb_data/` |
| Business logic | `pb_hooks/*.pb.js` | Progress calculation, audit logging, config & self-test endpoints |
| Schema | `pb_migrations/*.js` | Versioned, applied automatically on start / `migrate up` |
| Files | PocketBase storage (`pb_data/storage`, or S3-compatible) | Learning materials are **protected** files (token required) |

### How requests are authorised
* Every collection has server-side **API rules** (list/view/create/update/delete). The UI only hides
  things for convenience. The server re-checks every request.
* Permissions live on **roles** (`roles.permissions`) and rules check them, e.g.
  `@request.auth.role.permissions ~ '"courses.manage_all"'` (see ARCHITECTURE.md → Rule syntax notes).
* Ownership/enrollment checks prevent ID-based access (changing an ID in a URL returns 404).

---

## 2. Server requirements

**Option A: managed hosting.**
Use the provider's deployment flow for the frontend and PocketBase process, then connect a domain
and configure the application values below. Check the provider's documentation for HTTPS and email setup.

**Option B: self-managed server (VPS / cloud).**
* Linux x86-64 or arm64, 1 vCPU / 1 GB RAM minimum (2 GB+ recommended for many concurrent users)
* Persistent disk for `pb_data/` (database + uploads); size to your expected uploads
* PocketBase **v0.28.x** binary
* A reverse proxy with TLS (Nginx, Caddy or Apache), or PocketBase's built-in `--https` autocert
* A process supervisor (systemd) so PocketBase restarts on failure/reboot
* Node.js 20+ **only on the build machine** (to run `npm run build` for the frontend)

> Classic shared hosting that only runs PHP cannot run the PocketBase process. Use Option A or B.

---

## 3. Environment & configuration

### 3.1 Frontend build variable
| Variable | Purpose | Example |
|---|---|---|
| `VITE_POCKETBASE_URL` | Public base URL of the PocketBase API | `https://lms.ourwebsite.org` |

It is read at build time (`import.meta.env.VITE_POCKETBASE_URL`). Set it in the frontend build environment or in `codebase/.env.local` for local development.

### 3.2 Values configured in the running app (no code changes)
Configure these in **Admin → Settings**:

| Setting | Where | Notes |
|---|---|---|
| Application URL (production domain) | Settings → Domain & email | Used in password-reset and verification email links. Set to `https://lms.ourwebsite.org` |
| Email sender name / address | Settings → Domain & email | Must be an address your SMTP server is allowed to send from |
| LMS name, description, tagline, logo, favicon | Settings → Identity | |
| Default language, timezone | Settings → Locale | Used for date/time formatting |
| Registration on/off, email verification required | Settings → Accounts | Enforced server-side |
| Self-enrollment master switch, upload limit | Settings → Enrollment & files | Enforced server-side (hard file limit 50 MB) |

### 3.3 Secrets (never in source code)
* **SMTP host/user/password**: set in the PocketBase superuser dashboard (`https://<domain>/_/` →
  Settings → Mail settings). They are never sent to the browser; the LMS Settings page only shows
  whether SMTP is configured. Configure SMTP in the PocketBase superuser dashboard for your deployment.
* **Superuser accounts**: created in the PocketBase dashboard or with
  `./pocketbase superuser upsert you@example.com 'STRONG-PASSWORD'`.
* **S3 credentials** (optional storage/backups): PocketBase dashboard → Settings → Files storage / Backups.
* Optional: set `PB_ENCRYPTION_KEY`-style encryption for the settings table by starting PocketBase with
  `--encryptionEnv=YOUR_ENV_VAR_NAME` and a 32-character value in that env var.

---

## 4. Database setup

No manual SQL is needed.

1. Copy `pb_migrations/` and `pb_hooks/` next to the PocketBase binary.
2. Start PocketBase (`./pocketbase serve`) or run `./pocketbase migrate up`.
   Migrations create every collection, index, access rule, the three system roles
   (Super Administrator, Instructor, Student), the default category tree and the settings record.
3. Never edit a migration that has already been applied. Schema changes are always new migration files.

### Initial administrator
The migrations do not create an LMS administrator account. Create a PocketBase superuser (see 3.3), sign in to `/_/`, then add a record in the `users` collection with role **Super Administrator**, status **active**, and verified **on**. Set a unique password and require a password change if you provision the account with a temporary password.

---

## 5. Domain / subdomain and SSL

1. **DNS**: point `lms.ourwebsite.org` at the hosting:
   * Managed hosting: add the custom domain in the provider dashboard and create the DNS record it specifies.
   * Self-managed: an `A`/`AAAA` record to your server IP.
2. **SSL**:
   * Managed hosting: use the provider's SSL setup and enable HTTPS enforcement if available.
   * Self-managed: Caddy/Certbot, or `./pocketbase serve --https=lms.ourwebsite.org`.
3. **Update the Application URL**: Admin → Settings → Domain & email → `https://lms.ourwebsite.org`,
   then use **Send me a test email** and request a password reset to verify links point to the new domain.
4. Rebuild the frontend with `VITE_POCKETBASE_URL=https://lms.ourwebsite.org` if you self-host.

### Example Nginx reverse proxy (self-managed)
```nginx
server {
  server_name lms.ourwebsite.org;
  client_max_body_size 55M;            # slightly above the 50 MB upload limit
  root /var/www/lms/dist;              # frontend build output
  location /api/ { proxy_pass http://127.0.0.1:8090; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
  location /_/   { proxy_pass http://127.0.0.1:8090; proxy_set_header Host $host; }
  location /     { try_files $uri /index.html; }   # SPA fallback for client-side routes
  listen 443 ssl; # managed by certbot
}
```
If you run behind a proxy, set PocketBase dashboard → Settings → Application → *User IP proxy headers*
to `X-Forwarded-For` so rate limits and logs see real client IPs.

---

## 6. File / storage configuration

* Learning materials (`materials.file`) are **protected**: they can only be downloaded with a
  short-lived file token, and only by users who pass the material's view rule (course staff or
  actively-enrolled learners of a published lesson in a non-draft course).
* Allowed types (checked by content sniffing on the server): PDF, Word, PowerPoint, Excel,
  OpenDocument, RTF, TXT, CSV, PNG, JPEG, GIF, WEBP, ZIP. HTML, scripts and executables are rejected.
  Max 50 MB per file.
* Server-recorded metadata per file: original name, MIME type, size, uploader, course, lesson, created time.
* Course thumbnails, the logo and the favicon are public images (5 MB / 2 MB / 512 KB limits).
* For larger deployments switch to S3-compatible storage in the PocketBase dashboard → Settings → Files storage.

---

## 7. Production configuration checklist

- [ ] HTTPS active and enforced
- [ ] Application URL set to the production domain
- [ ] SMTP configured; test email received
- [ ] First LMS administrator created with a unique password
- [ ] Superuser account created with a strong, unique password; superuser MFA enabled
- [ ] PocketBase dashboard → Settings → Rate limits **enabled** (protects login/reset endpoints)
- [ ] Registration / email-verification / self-enrollment switches set as intended
- [ ] Backups scheduled (section 8)
- [ ] **Admin → Settings → Acceptance self-test** run and passing

---

## 8. Backups

* PocketBase dashboard → **Settings → Backups**: create on-demand backups or schedule them
  (cron expression, e.g. `0 3 * * *` daily at 03:00) and set how many to keep. Backups include the
  SQLite database and local file storage. Optionally store them in S3-compatible storage.
* Self-managed alternative: stop writes (or use the built-in backup) and archive the whole `pb_data/` directory.
* **Test restores** periodically on a staging copy.

---

## 9. Application updates

1. Take a backup.
2. Deploy new code: frontend build + new files in `pb_hooks/` and `pb_migrations/`.
3. Restart PocketBase; pending migrations apply automatically (or run `./pocketbase migrate up` first).
4. Run **Admin → Settings → Acceptance self-test**.
5. Upgrading PocketBase itself: read its changelog for breaking changes, test on staging, then replace the binary.

---

## 10. Development vs production differences

| Concern | Development / preview | Production |
|---|---|---|
| Domain | Platform preview domain | Your subdomain (configurable, section 5) |
| Application URL | Preview URL | Must be updated in Settings |
| SMTP | Platform relay | Platform relay or your own SMTP (set in dashboard) |
| Data | Preview database | Separate database; do not copy test accounts |
| Rate limits | May be off | Turn on |
