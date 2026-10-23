# Brilliant Edu LMS

A learning management system with a React and TypeScript frontend and a PocketBase backend. The app supports administrator, instructor, and student workflows, with server-side role permissions, course materials, enrollment, progress tracking, and audit logging.

## Project layout

- `codebase/` — React frontend, pages, reusable components, API services, and frontend documentation.
- `pb_hooks/` — PocketBase API hooks and server-side workflows.
- `pb_migrations/` — PocketBase collection schema, access rules, and indexes.

PocketBase data and uploaded files belong in a local `pb_data/` directory at runtime. That directory is intentionally excluded from Git because it contains database records and private uploads.

## Frontend setup

Requirements: Node.js 20 or newer and a running PocketBase server.

```sh
cd codebase
npm install
cp .env.example .env.local
# Edit .env.local and set VITE_POCKETBASE_URL to your PocketBase URL.
npm run dev
```

For a production frontend build, set `VITE_POCKETBASE_URL` to the public PocketBase API URL and run `npm run build` from `codebase/`.

## Backend setup

Use a PocketBase v0.28.x binary. Place `pb_hooks/` and `pb_migrations/` beside the binary, then start PocketBase or apply migrations with `./pocketbase migrate up`. Migrations create the collections and access rules; create the first LMS administrator through the PocketBase superuser dashboard. Set a unique password and assign the Super Administrator role. No default LMS administrator password is included.

Configure SMTP, the application URL, file storage, backups, and rate limits in PocketBase's superuser dashboard. See [`codebase/docs/DEPLOYMENT.md`](codebase/docs/DEPLOYMENT.md) for deployment guidance and [`codebase/docs/ARCHITECTURE.md`](codebase/docs/ARCHITECTURE.md) for design details.

## Security notes

- Never commit `pb_data/`, `.env` files, private keys, database backups, or real user uploads.
- `VITE_POCKETBASE_URL` is a public endpoint, not a secret. Keep backend credentials and SMTP settings in the PocketBase server configuration.
- Configure the superuser account and the first LMS administrator with unique credentials before production use.
