# What every file does

Snapshot of 2026-11-04. Live app: https://school-results-iota.vercel.app

`final_result/` now holds only this app (`web/`) and `.claude/launch.json` (starts `npm run dev` on
port 3100 for the Claude preview). The old Python/Streamlit prototype was retired on 2026-11-04; its
source is kept in `Desktop\final_result_python_prototype_backup.zip`.

## Project configuration (`web/`)

| File | What it does |
|---|---|
| `package.json`, `package-lock.json` | Dependencies and the `npm run …` commands (dev, build, check, db:*). |
| `next.config.ts` | Security headers, upload size limit (3 MB), Tailwind loader. |
| `tsconfig.json` | TypeScript settings; `@/…` points at `src/`. |
| `eslint.config.mjs` | Lint rules (`npm run lint`). |
| `vitest.config.mts` | Test runner settings (`npm test`). |
| `drizzle.config.ts` | Tells `drizzle-kit` where the schema and migrations are. |
| `components.json` | shadcn/ui settings, used only when adding new UI components. |
| `vercel.json` | Vercel build: run migrations, then `next build`. |
| `.vercelignore` | Keeps secrets, local data and tests out of uploads to Vercel. |
| `.gitignore` | Keeps secrets, local data and build output out of git. |
| `.env.example` | Template for `.env.local` (database URLs, session limits). |
| `AGENTS.md` | Note for AI coding tools about this Next.js version (written by `next dev`). |
| `README.md` | Setup, deployment and module status. |
| `docs/ARCHITECTURE.md` | Design: schema, auth, workflow, deployment plan. |
| `docs/FILES.md` | This list. |

## Database (`web/drizzle/`)

| File | What it does |
|---|---|
| `0000_init.sql` | All tables, keys and constraints. |
| `0001_triggers_and_defaults.sql` | Audit triggers, workflow locks, default terms and grading scale. |
| `0002_monthly_stage.sql`, `0003_monthly_stage_rules.sql` | Monthly Test published before the term result. |
| `0004_marks_absent.sql` | "A" for absent in marks. |
| `0005_marks_new_admission.sql` | "N" for a new admission who joined after a test. |
| `meta/*.json` | Drizzle's record of the schema after each migration (needed by `db:generate`). |

## Command-line scripts (`web/scripts/`)

| File | What it does |
|---|---|
| `migrate.ts` | `npm run db:migrate`: applies new migrations (also runs on every Vercel deploy). |
| `create-admin.ts` | `npm run db:create-admin`: creates the first principal account. |
| `reset-password.ts` | `npm run db:reset-password`: emergency password reset. |
| `local-db.ts` | `npm run db:local`: offline development database (PGlite). |
| `prompt.ts` | Hidden password prompt shared by the scripts. |

## Pages and endpoints (`web/src/app/`)

Each page folder has `page.tsx` (loads data on the server), a `*-client.tsx` (the interactive form/table)
and `actions.ts` (the Server Actions the form calls; each re-checks permissions).

| Route | What it does |
|---|---|
| `/` (`page.tsx`) | Sends you to the dashboard or sign-in. |
| `/login` | Sign-in form, with rate limiting. |
| `/dashboard` | Counts and to-do lists for the signed-in role. |
| `/account/password` | Change your own password. |
| `/admin/staff` | Staff accounts, roles, temporary passwords. |
| `/admin/settings` | School name, logo, report and marks options. |
| `/admin/academic-years` | Academic years and the current year. |
| `/admin/classes` | Classes, sections, class teachers. |
| `/admin/subjects` | Subjects and which subjects each class studies. |
| `/admin/students` | Students and enrolments; `/import` uploads Excel/CSV with a validation report. |
| `/admin/assignments` | Which teacher teaches which subject in which section. |
| `/admin/exam-terms` | Terms, Monthly 25 / Term 75 components, maximum marks. |
| `/admin/grading` | Grading scales and pass marks. |
| `/marks` and `/marks/[term]/[section]/[subject]` | Marks entry grid: draft, submit, absent (A), new admission (N). |
| `/results` and `/results/[term]/[section]` | Class result: review, approve, return, remarks, reopen. |
| `/print/results/[term]/[section]` | Printable A4 result cards (`print/layout.tsx` loads the card fonts, `print.css` the page setup). |
| `/forbidden`, `not-found.tsx`, `(app)/error.tsx`, `(app)/loading.tsx` | No-access, missing-page, error and loading screens. |
| `(app)/layout.tsx` | The signed-in shell: sidebar, user menu, session check. |
| `layout.tsx`, `globals.css`, `favicon.ico` | Root HTML, theme and colours, tab icon. |
| `actions.ts` | Sign out. |
| `api/health` | `GET`: is the database reachable and migrated (used after deploys). |
| `api/school-logo` | `GET`: the school logo for signed-in staff. |
| `api/students/template` | `GET`: Excel template for the student import (admin only). |
| `src/proxy.ts` | Sends visitors without a session cookie to `/login`. |

## Server logic (`web/src/server/`)

| File | What it does |
|---|---|
| `db/client.ts` | Connection pool to Neon. |
| `db/schema.ts` | Table definitions used by all queries. |
| `db/actor.ts` | Runs a change in one transaction and tells the audit log who did it. |
| `auth/session.ts` | Database sessions and the HttpOnly cookie. |
| `auth/current.ts` | The signed-in user for this request. |
| `auth/password.ts` | Password hashing (scrypt). |
| `auth/rate-limit.ts` | Blocks repeated failed sign-ins. |
| `auth/config.ts` | Idle and maximum session times. |
| `auth/dev-auto-login.ts` | Development-only auto sign-in; refused in production. |
| `errors.ts` | Error messages that are safe to show users. |
| `actions.ts` | Shared error handling and logging for Server Actions. |
| `services/guards.ts`, `services/validate.ts`, `services/capabilities.ts` | Who may do what; input checking. |
| `services/auth.ts` | Sign-in and password change. |
| `services/staff.ts`, `settings.ts`, `academic-years.ts`, `classes.ts`, `subjects.ts`, `students.ts`, `student-import.ts`, `assignments.ts`, `exam-terms.ts`, `grading.ts` | The admin features listed above, one file each. |
| `services/marks.ts` | Marks entry and mark-sheet review. |
| `services/results.ts` | Compiling, approving and reopening class results. |
| `services/report-cards.ts` | Turns an approved result into result-card data. |
| `services/dashboard.ts` | Dashboard numbers. |

## Shared code (`web/src/lib/`, `web/src/hooks/`)

| File | What it does |
|---|---|
| `lib/domain/calculations.ts` | Totals, percentages, grades, pass/fail, positions (exact decimals). |
| `lib/validation/*.ts` | Form rules for each area (staff, academics, results, settings, auth, phone numbers). |
| `lib/action-result.ts` | The shape every form action returns. |
| `lib/safe-redirect.ts` | Only same-site redirects after sign-in. |
| `lib/utils.ts` | `cn()` class-name helper. |
| `hooks/use-mobile.ts` | Detects phone-width screens for the sidebar. |

## Components (`web/src/components/`)

| Folder | What it does |
|---|---|
| `app/` | App building blocks: sidebar and navigation (`app-sidebar`, `nav`, `user-menu`), forms and dialogs (`form`, `form-dialog`, `form-select`, `confirm-dialog`), tables and filters (`data-table`, `url-select`, `row-actions`), `status-badge`, page headers and stat cards (`page`). |
| `ui/` | shadcn/ui base controls: button, input, select, dialog, sheet, sidebar, table, etc. Unused parts were removed on 2026-11-04. |
| `report-card/types.ts` | Data a printed card shows. |
| `report-card/themes/theme-01 … theme-10.tsx` | The ten A4 card designs, Class 1 → theme 1 … Class 10 → theme 10. |
| `report-card/themes/index.ts`, `components.ts` | The list of themes and which layout belongs to which. |

## Images (`web/public/report-card/`)

`crest.svg`, `avatar.svg`, `m1-star … m10-cap.svg` (one badge per class theme) and `subj-*.svg` (subject
icons, chosen by subject code; `subj-generic.svg` for any other subject).

## Tests (`web/tests/`)

| File | What it covers |
|---|---|
| `unit/calculations.test.ts` | Result arithmetic and grading. |
| `unit/auth-and-validation.test.ts` | Passwords, sessions, form validation. |
| `db/*.test.ts` | Features run against a real PostgreSQL (PGlite) with the real migrations: schema rules, auth, staff and settings, academics, student import, marks and results, absent marks, new admissions. |
| `db/helpers.ts` | Creates the test database and test users. |
| `stubs/server-only.ts` | Lets server code load inside tests. |

## Local-only files (not in git, not uploaded)

| Path | What it is |
|---|---|
| `.env.local` | Neon connection strings. Required to run locally; keep private. |
| `.vercel/` | Links this folder to the Vercel project; needed to deploy from here. |
| `node_modules/`, `.next/`, `tsconfig.tsbuildinfo`, `next-env.d.ts` | Installed packages and build caches; regenerated automatically. |
| `.local-db/` | The offline development database from `npm run db:local`. |
| `.admin-temporary-password.txt`, `.live-teacher-accounts.txt` | One-time passwords written when accounts were created. Not needed by the app; delete them once everyone has signed in and changed their password. |
