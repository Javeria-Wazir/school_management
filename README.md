# School Result Management System (web)

A web application for managing school examination results: staff accounts with three roles, academic
structure, marks entry with draft → submit → review → approve workflow, consolidated class results,
A4 report cards, Excel/CSV import/export and an audit trail.

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 + shadcn/ui · Drizzle ORM + SQL
migrations · Neon serverless PostgreSQL · Vercel.

> The Python/Streamlit project in the parent folder is an earlier prototype of the same requirements. This
> application reuses its domain rules, not its code, and does not depend on it.

- Architecture, schema, auth and deployment plan: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Build status by module: [§ 8](#8-modules-and-status)

---

## 1. Requirements

- Node.js 22.12 or newer (developed on Node 24) and npm
- A PostgreSQL database. **Neon** in production; for development either a Neon *branch* (recommended)
  or the bundled local database (`npm run db:local`, see § 2.3)
- Git, and a GitHub account for deployment

## 2. Local setup

### 2.1 Install

```bash
cd web
npm ci
```

### 2.2 Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Used for | Value |
|---|---|---|
| `DATABASE_URL` | the running app | Neon **pooled** connection string (host contains `-pooler`) |
| `DATABASE_URL_UNPOOLED` | migrations, `db:create-admin` | Neon **direct** connection string |
| `SESSION_IDLE_MINUTES` | optional | sign out after this many idle minutes (default 60) |
| `SESSION_MAX_HOURS` | optional | sign out this many hours after sign-in (default 12) |
| `DEV_AUTO_LOGIN` | development only | skip the sign-in page and act as this staff e-mail (§ 2.6); refused in production |

`.env.local` is git-ignored. Never put real connection strings in any committed file.

**Use a separate Neon branch for development** (Neon console → *Branches* → *Create branch* from
`main`, then copy that branch's connection strings). Development then never touches school data.

### 2.3 Optional: offline development database

If you have no Neon account yet, `npm run db:local` starts a PostgreSQL-compatible server on
`localhost:5432` (PGlite, stored in `.local-db/`, git-ignored). It is for development only. With it
running, use in `.env.local`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable"
DATABASE_URL_UNPOOLED="postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable"
```

### 2.4 Create the tables

```bash
npm run db:migrate
```

This applies every file in `drizzle/` that has not been applied yet (safe to run any number of times).
It also creates the default settings: Monthly Test (25) + Term Examination (75), and a
"Standard Scale" (A+ 90, A 80, B 70, C 60, D 50, E 33, F 0; pass mark 33 %). The principal can change all
of these in the app.

### 2.5 Create the first principal account

There is no public sign-up. Create the first administrator from the command line; the password is typed
at a hidden prompt:

```bash
npm run db:create-admin -- --email principal@yourschool.edu --name "Principal Name"
```

The script refuses to run once an active administrator exists. After that, staff accounts are managed
in the app (*Administration → Staff accounts*).

### 2.6 Run

```bash
npm run dev
```

Open http://localhost:3000 and sign in.

**Reviewing features without signing in (development only).** Add
`DEV_AUTO_LOGIN="principal@yourschool.edu"` to `.env.local` and restart `npm run dev`. The app then opens
straight to the dashboard as that staff member, with a "Dev mode · automatic sign-in" badge in the top
bar. Permission checks still apply with that person's real role, so use a teacher's e-mail to see the
teacher view. The setting is refused in production: never set it on Vercel. Remove the line to use the
normal sign-in again.

### 2.7 Checks

```bash
npm run check      # type-check + lint + all tests
npm test           # tests only
npm run build      # production build
```

The tests need no database credentials: database tests run the real migrations on an in-process
PostgreSQL (PGlite), so constraints, triggers, permissions and workflow rules are tested for real.

## 3. Deploying to Vercel with Neon

**Current deployment (Module 1, 25 Oct 2026):** https://school-results-iota.vercel.app — Vercel project
`school-results` (account `javeria-wazir`), Neon database `neondb` (AWS us-east-2), code on
https://github.com/Javeria-Wazir/school_management. Verified: `/api/health` reports the database OK, sign-in
page served, protected pages redirect to sign-in.

The steps below are how it was set up, and how to set it up again elsewhere; each step says how to
check it worked.

### 3.1 Create the Neon database

1. Sign in at https://console.neon.tech → **New project**.
   - Name: `school-results`; PostgreSQL 17; region closest to the school (e.g. AWS Singapore or Frankfurt).
   - Database name: `school_results`.
2. Open **Connection details**. Copy two strings:
   - **Pooled** (toggle *Connection pooling* on; host contains `-pooler`) → `DATABASE_URL`
   - **Direct** (pooling off) → `DATABASE_URL_UNPOOLED`
3. (Recommended) Create a `development` branch for local work (§ 2.2).

### 3.2 Put the code on GitHub

```bash
cd web
git add -A
git commit -m "School result management system"
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/school-results.git
git push -u origin main
```

(`web/` is its own Git repository, so it becomes the repository root. If you push the whole
`final_result` folder instead, set Vercel's *Root Directory* to `web`.)

### 3.3 Create the Vercel project

1. https://vercel.com/new → **Import** the GitHub repository. Framework preset: **Next.js**.
2. **Environment variables** — either:
   - **Neon integration (recommended):** Project → *Storage* → *Connect Database* → Neon → choose the
     project. Vercel then sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for you, and can create a
     separate Neon branch for every Preview deployment, so previews never touch production data.
   - **By hand:** Project → *Settings* → *Environment Variables*. Add `DATABASE_URL` and
     `DATABASE_URL_UNPOOLED` for **Production** with the `main` branch strings, and for
     **Preview** and **Development** with a Neon development branch's strings.
3. Deploy. The build command in `vercel.json` is `npm run db:migrate && npm run build`: migrations run
   first, and if one fails the build stops and the previous deployment stays live.

### 3.4 Create the principal account in production

From your computer, put the **production** strings into a temporary `.env.local` (or export them in the
shell), then:

```bash
npm run db:create-admin -- --email principal@yourschool.edu --name "Principal Name"
```

Delete the production strings from `.env.local` afterwards.

### 3.5 Verify the deployment

1. `https://YOUR-APP.vercel.app/api/health` returns `{"status":"ok","database":"ok"}`.
2. The sign-in page shows the school name from the database.
3. Sign in as the principal, open *School settings*, change the school name and save; reload — it stays.
4. Trigger a redeploy in Vercel (*Deployments* → *Redeploy*); sign in again — the data is still there.

### 3.6 Data safety

- All records live in Neon. Vercel deployments hold no data, so redeploying never loses anything.
- Migrations only add or change schema in recorded, ordered SQL files; `db:migrate` never drops data.
- Neon keeps a restore window (point-in-time restore; length depends on the plan). For an extra copy,
  run a periodic `pg_dump "$DATABASE_URL_UNPOOLED" > backup.sql` and keep it encrypted off-site.

### 3.7 Changing the schema later

1. Edit `src/server/db/schema.ts`.
2. `npm run db:generate -- --name short_description` → review the new SQL in `drizzle/`.
3. For triggers or data changes: `npx drizzle-kit generate --custom --name short_description` and write
   the SQL yourself (separate statements with `--> statement-breakpoint`).
4. `npm test`, commit, push. Vercel applies the migration on the next deploy.

## 4. Roles

| Role | How | Can |
|---|---|---|
| Principal / Administrator | account role *Principal / Administrator* | everything school-wide: staff, structure, grading, settings, final approval, reopening, audit log |
| Class Teacher | a *Teacher* account chosen as class teacher of a section | review, approve and return that section's subject sheets; consolidate; class-approve complete results; report cards |
| Subject Teacher | a *Teacher* account assigned to section × subject | enter, save and submit marks for those assignments only; request corrections |

One person can be both class teacher and subject teacher. Every permission is checked on the server for
each request; hiding a button is only a convenience.

## 5. Security summary

- Passwords: scrypt (Node built-in), minimum 8 characters with a letter and a digit. Temporary passwords
  issued by the principal must be changed at first sign-in.
- Sessions: random 256-bit token in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie (`__Host-` prefixed in
  production); only its SHA-256 hash is stored. Idle and absolute expiry; deactivation, role change and
  password reset sign the user out everywhere.
- Sign-in throttling: 5 failures per e-mail or 30 per IP address in 15 minutes.
- All input is validated on the server with zod; the database repeats key rules as constraints and
  triggers. Errors shown to users never contain SQL or connection details.
- Audit log: every change to official records stores who, when, old and new values and the reason;
  the table rejects updates, deletes and truncation.
- Security headers (HSTS, `X-Frame-Options: DENY`, `nosniff`, referrer policy) on every response.
- Secrets exist only in environment variables; `.env*` files are git-ignored (except `.env.example`).

## 6. Project layout

```
drizzle/                 SQL migrations (generated + hand-written triggers)
scripts/                 migrate.ts, create-admin.ts, reset-password.ts, local-db.ts (dev only)
src/app/                 pages, layouts, Server Actions, API routes
src/components/          shadcn/ui primitives (ui/) and app components (app/)
src/lib/domain/          pure result maths (decimal.js)
src/lib/validation/      zod schemas shared by forms and services
src/server/              server-only: db, auth, services, errors
tests/unit, tests/db     Vitest; db tests run on PGlite with the real migrations
```

## 7. Troubleshooting

| Problem | Fix |
|---|---|
| `DATABASE_URL is not set` | Create `.env.local` (§ 2.2) or set the variable in Vercel. |
| `/api/health` returns 503 | Check the connection strings; run `npm run db:migrate`. |
| Build fails at `db:migrate` on Vercel | `DATABASE_URL_UNPOOLED` missing or wrong for that environment. |
| "Too many failed sign-in attempts" | Wait 15 minutes, or the principal resets the password. |
| The only administrator forgot their password | Another administrator can reset it in *Staff accounts*. If there is none, someone with the database connection string runs `npm run db:reset-password -- --email principal@school.edu` (hidden prompt; audited; signs the user out everywhere). Keeping two administrator accounts avoids this. |

## 8. Modules and status

| # | Module | Status |
|---|---|---|
| 1 | Project setup, schema and migrations, authentication and sessions, server-side RBAC, app shell, staff accounts, school settings and logo, academic years, grading maths library | **Done** (tested) |
| 2 | Classes, sections and class teachers, subjects and class subjects, students and enrolments with Excel/CSV import and validation report, teacher assignments, exam terms, assessment maximums, grading scales | Next |
| 3 | Subject teacher dashboard, marks entry grid, drafts, submission, missing-mark detection | Planned |
| 4 | Class teacher review, return/approve, correction requests, consolidation of all subjects, incomplete results | Planned |
| 5 | Class result sheet, class and principal approval, reopen with reason, subject analytics and charts | Planned |
| 6 | A4 PDF report cards, Excel/CSV export, WhatsApp click-to-chat reminders | Planned |
| 7 | Audit log viewer, final security review, deployment hardening | Planned |
