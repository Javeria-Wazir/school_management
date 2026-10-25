# Architecture — School Result Management System (web)

Next.js (App Router, TypeScript) · Tailwind CSS + shadcn/ui · Drizzle ORM · Neon PostgreSQL · Vercel

This is a new application. It reuses the **domain rules** of the earlier Python/Streamlit
prototype in the parent folder (workflow states, grading maths, locks, audit design), not its code.

## 1. Overview

```
 Browser (staff)                       Vercel (Node.js runtime)                              Neon
 ───────────────          ─────────────────────────────────────────────────────           ──────────────────
  React Server            proxy.ts  — optimistic redirect when no session cookie
  Components  ◄──HTML──►  app/(app)/*      pages: read via services, render
  + small client          Server Actions   mutations: parse → authorise → transaction
  islands (forms,         app/api/*        file downloads (PDF / Excel / CSV)
  tables, charts)               │
                                ▼
                          src/server/services/*   ← every rule lives here (server-only)
                          src/server/auth/*        sessions, passwords, RBAC guards
                          src/lib/domain/*         pure maths (Decimal), shared with tests
                                │  pg Pool (TLS), pooled connection string
                                ▼
                          PostgreSQL ── constraints, FKs, unique indexes
                                    ── triggers: mark validation/locks, last-admin guard,
                                       updated_at, append-only audit log
```

* **The browser never talks to the database.** All reads happen in React Server Components and
  all writes in Server Actions / route handlers. Database credentials exist only in server
  environment variables.
* **Every protected operation is authorised on the server, in the service layer** — not in the
  page, not in the proxy. Hiding a button is only a convenience.
* **The database is the last line of defence.** Triggers refuse invalid or locked marks and
  audit every change even if a future code path forgets a check.

## 2. Layers and folders

```
web/
├─ drizzle/                         SQL migrations (generated + hand-written triggers), committed
├─ scripts/                         migrate.ts, create-admin.ts, reset-password.ts, local-db.ts (dev only)
├─ src/
│  ├─ proxy.ts                      cookie-presence redirect only (no authorisation decisions)
│  ├─ app/
│  │  ├─ login/                     sign-in page + action
│  │  ├─ (app)/                     authenticated shell: sidebar, top bar
│  │  │  ├─ dashboard/              role dashboard
│  │  │  ├─ account/                change own password
│  │  │  └─ admin/                  principal-only pages (users, settings, academic years, …)
│  │  └─ api/                       downloads (later modules)
│  ├─ components/ui/                shadcn/ui primitives
│  ├─ components/app/               shell, stat cards, data table, page header, empty states
│  ├─ lib/
│  │  ├─ domain/                    calculations.ts (Decimal), workflow transition tables
│  │  ├─ validation/                zod schemas shared by forms and services
│  │  └─ utils.ts
│  └─ server/                       `import "server-only"` everywhere below
│     ├─ db/                        schema.ts, client.ts, actor.ts (transaction + audit actor)
│     ├─ auth/                      password.ts, session.ts, guards.ts, rate-limit.ts
│     ├─ services/                  users, settings, academic years, … (one file per module)
│     └─ errors.ts                  AppError → user-safe messages
└─ tests/
   ├─ unit/                         pure logic (calculations, validation, password hashing)
   └─ db/                           real PostgreSQL via PGlite: migrations, triggers, permissions
```

**Service contract.** Every service function has the shape
`fn(ctx: { db, user }, input: unknown)`. It (1) validates `input` with zod, (2) checks the
caller's permission against the database, (3) runs the change in one transaction that also sets
`app.actor_id` so audit triggers record who did it, and (4) throws `AppError` with a message
written for the user. Server Actions are thin wrappers: get the session, call the service,
return `{ ok, message, fieldErrors }` for the toast/form.

Because `ctx.db` is injected, the same services run in tests against an in-process PostgreSQL
(PGlite) with the real migrations applied — permissions and workflow rules are tested for real,
without Neon credentials.

## 3. Roles and permissions

| Role in UI | How it is stored | Can do |
|---|---|---|
| **Principal / Administrator** | `users.role = 'admin'` | Users, assignments, academic structure, grading, school info, final approval, reopen with reason, audit log |
| **Subject Teacher** | `users.role = 'teacher'` + rows in `teacher_assignments` | Enter, save draft and submit marks **only** for assigned section × subject; request corrections |
| **Class Teacher** | `users.role = 'teacher'` + `sections.class_teacher_id` | Review/approve/return subject sheets of **own** section, consolidate, class-approve complete results, report cards |

Class teacher is a per-section assignment rather than a third account type because in practice a
class teacher also teaches subjects. One login therefore gets both capabilities, and the
dashboard shows both. The principal can still be given class-teacher duties.

Guards (in `src/server/auth/guards.ts`) re-read the user from the database on every request, so
deactivating a user or changing a role takes effect immediately:

* `requireUser()` — valid, unexpired session of an active user.
* `requireAdmin()` — role `admin`.
* `assertTeaches(sectionId, classSubjectId)` / `assertClassTeacher(sectionId)` — row checks.

## 4. Authentication

Self-hosted, database-backed sessions (no third-party identity provider, no JWT in the browser):

* **Passwords**: Node's built-in `scrypt` (N=2^15, r=8, p=3, 16-byte salt, 64-byte key —
  an OWASP-recommended parameter set), constant-time comparison. Minimum 8 characters with a
  letter and a digit. No external native modules, so it runs unchanged on Vercel.
* **Sessions**: 32 random bytes → base64url token in an `HttpOnly`, `Secure` (in production),
  `SameSite=Lax`, `Path=/` cookie. Only the SHA-256 hash of the token is stored
  (`sessions.id`), so a database leak does not leak live sessions. Absolute lifetime 12 h, idle
  timeout 60 min (both configurable). Sign-out, password change, deactivation and role change
  delete the user's sessions.
* **Brute force**: failed sign-ins are recorded in `login_attempts`; more than 5 failures for one
  e-mail or 30 from one IP address within 15 minutes are refused with the same generic message.
  Unknown e-mails still run a hash so timing does not reveal which accounts exist.
* **CSRF**: Server Actions only accept POSTs whose `Origin` matches the host (built into Next.js);
  the cookie is `SameSite=Lax`.
* **No public sign-up.** The first principal account is created from the command line
  (`npm run db:create-admin`); after that the principal creates staff accounts with a temporary
  password that must be changed at first sign-in.

## 5. Database schema

All official records live in Neon. Money-like numbers (marks, max marks, percentages) are
`numeric`, read as strings and computed with `decimal.js` — never JavaScript floats.

```
academic_years ─┬─< exam_terms ─────────────< assessments >──── assessment_types (Monthly 25, Term 75)
                │        │      └─ grading_scale ──< grade_boundaries
classes ──< sections ─┬──┼── mark_sheets ──< marks >── enrollments >── students
   │    (class_teacher)│   (status workflow)   (NULL = missing, 0 = real zero)
   └──< class_subjects >┘        └──< correction_requests
          │    └── subjects
          └──< teacher_assignments (teacher × section × class_subject — exactly one owner)

result_approvals (term × section)   student_remarks (term × enrollment)
users ──< sessions    login_attempts    school_settings (single row)    audit_logs (append-only)
```

Key constraints (all enforced in PostgreSQL):

| Rule | Mechanism |
|---|---|
| One mark per student × subject × term × component | `unique (assessment_id, enrollment_id)` |
| One sheet per term × section × subject; one owner per section × subject | unique constraints |
| Roll number unique per class and year; one enrolment per student per year | unique constraints |
| E-mail, subject name/code, class name, student ID unique (case-insensitive) | unique indexes on `lower(...)` |
| Only one default grading scale; at most one open correction request per sheet | partial unique indexes |
| Marks between 0 and the assessment maximum; decimals only if allowed; student in the sheet's section | trigger `marks_validate` |
| Marks read-only once a sheet is submitted/approved or the class result is approved | trigger `marks_validate` |
| A section's subjects / enrolments belong to the same class and year | triggers |
| The last active administrator cannot be demoted or deactivated | trigger `users_guard` |
| Every change: who, when, old and new values, reason | trigger `audit_row_change` (+ explicit workflow events) |
| Audit log cannot be edited or deleted | trigger `audit_logs_immutable` |

Totals, percentages, grades and positions are **computed, not stored**, so they can never drift
from the source marks.

## 6. Results workflow

```
 mark_sheets:  draft ──submit──► submitted ──start review──► under_review
                 ▲                    │                           │
                 │                    └──────── approve ──────────┤
              returned ◄───── return (reason) ───────────────── approved
                 (teacher edits)        ▲ correction request (reason) by subject teacher;
                                          class teacher returns or rejects it

 result_approvals (per term × section):
     open ──class approve──► class_approved ──principal final approve──► final_approved (published)
       ▲   (all subjects approved, 0 missing marks)                                  │
       └──────────────────────────── reopen (recorded reason) ◄──────────────────────┘
```

* Submission is refused while any mark is missing. A blank is missing; `0` is a real score.
* Nobody approves their own submission.
* A class result with any missing mark or unapproved subject can never be approved; an incomplete
  student is shown as **Incomplete**, never Pass/Fail.
* Report cards are **official** only after final approval; anything earlier prints a
  *PROVISIONAL* watermark. Signature areas are always blank lines — no images.

## 7. Grading maths (`src/lib/domain/calculations.ts`)

* Subject total = sum of its components; **only when every component is entered**.
* Percentages are rounded **half-up** to the school's decimal places (0–2) **before** grade and
  pass/fail decisions, so a student shown as 33.00 % is never failed for 32.996 %.
* Overall result only when every subject is complete. Grand total uses subjects marked
  *counts in total*. Pass = overall % ≥ overall pass mark and (if the scale requires it) a pass in
  every compulsory subject.
* Positions use standard competition ranking (1, 2, 2, 4) and only for complete results.

## 8. Deployment plan (Vercel + Neon)

1. **Neon**: create a project (region close to the school), database `school_results`. Neon gives
   a *pooled* connection string (host contains `-pooler`) and a *direct* one.
2. **GitHub**: push the `web/` folder (repository root can be `web/` or set Vercel's
   *Root Directory* to `web`).
3. **Vercel**: import the repository; add the Neon integration (Storage → Neon), or set the
   variables by hand:
   * `DATABASE_URL` — pooled string (runtime)
   * `DATABASE_URL_UNPOOLED` — direct string (migrations)
   * `SESSION_IDLE_MINUTES`, `SESSION_MAX_HOURS` (optional)
   Set them for **Production** and **Preview/Development** separately; with the Neon integration
   each preview deployment gets its own database branch, so previews never touch production data.
4. **Build**: `vercel.json` runs `npm run db:migrate && npm run build`. Drizzle records applied
   migrations in `drizzle.__drizzle_migrations`, so re-deploys only apply new files and data is
   never reset. A failing migration fails the build and the old deployment stays live.
5. **First administrator**: from a trusted machine, with the production variables in `.env.local`:
   `npm run db:create-admin -- --email principal@school.edu --name "Principal Name"`
   (the password is typed at the prompt, never stored in a file).
6. **Backups**: Neon point-in-time restore (plan dependent) plus a periodic `pg_dump` kept
   off-site.

Nothing is deployed until real Neon and Vercel accounts are connected; the README lists the exact
steps and how to verify each one.

## 9. Module plan

| # | Module | Status |
|---|---|---|
| 1 | Scaffold, schema + migrations + triggers, auth/sessions/RBAC, app shell, staff management, school settings, academic years, grading maths library | done (81 tests) |
| 2 | Classes, sections, subjects, class subjects, students (+ Excel/CSV import with validation report), teacher assignments, exam terms, assessment configuration, grading scales | done (107 tests) |
| 3 | Subject teacher dashboard, marks entry grid, drafts, submission | next |
| 4 | Class teacher review, corrections, return/approve, consolidation, incomplete detection | |
| 5 | Class result sheet, class/principal approval, reopen, analytics and charts. Snapshot the percentage decimal places with each approval so a later settings change cannot alter an approved result | |
| 6 | A4 PDF report cards, Excel/CSV export, WhatsApp reminders | |
| 7 | Audit log viewer, security review, deployment hardening | |

## 10. Development and test databases

* **Tests** run every migration on PGlite (PostgreSQL compiled to WebAssembly) in-process, one fresh
  database per test file. No credentials are needed and the real triggers are exercised.
* **Local development** should use a Neon development branch. Without a Neon account,
  `npm run db:local` serves a PGlite database on `localhost:5433` (data in `.local-db/`, git-ignored;
  set `DATABASE_POOL_MAX=1`). It is for development only — official records live in Neon.

## 11. Student import design

* Two steps, both on the server: **preview** parses and validates every row against the database and returns a
  report; **import** parses and validates the same file again inside one transaction (with an advisory lock so two
  imports cannot claim the same roll numbers) and writes only if no row has an error. The browser's copy of the
  report is never trusted.
* Accepted: .xlsx (checked to really be a zip workbook) and UTF-8 CSV (comma or semicolon), ≤ 2 MB, ≤ 2,000 rows.
  .xls/.xlsm are refused. Header names are matched flexibly (e.g. "Admission No", "Father Name", "DOB").
* Outcomes per row: *new* (student created and enrolled), *enrol* (existing student ID with the same name, not yet
  enrolled this year — details are not overwritten), *unchanged* (already enrolled identically), *error*.
* The downloadable report escapes cells that spreadsheets would run as formulas (=, +, -, @).
