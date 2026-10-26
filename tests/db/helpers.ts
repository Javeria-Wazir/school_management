/**
 * Real PostgreSQL for tests: PGlite (Postgres compiled to WebAssembly) with the project's migrations
 * applied, so constraints, triggers and services are exercised exactly as in production.
 */
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { hashPassword } from "@/server/auth/password";
import { createSession, hashToken, type SessionUser } from "@/server/auth/session";
import type { Db } from "@/server/db/client";
import * as schema from "@/server/db/schema";
import { toAppError } from "@/server/errors";
import type { ServiceContext } from "@/server/services/guards";

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

export interface TestDb {
  db: Db;
  client: PGlite;
  close: () => Promise<void>;
}

export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder });
  return { db: db as unknown as Db, client, close: () => client.close() };
}

let counter = 0;
let cachedHash: Promise<string> | undefined;
export const TEST_PASSWORD = "Passw0rd-for-tests";

/** Insert a staff account (all share TEST_PASSWORD, hashed once for speed) and return a signed-in context. */
export async function addUser(
  db: Db,
  options: { role?: "admin" | "teacher"; email?: string; fullName?: string; isActive?: boolean; mustChangePassword?: boolean } = {},
): Promise<ServiceContext & { token: string }> {
  counter += 1;
  cachedHash ??= hashPassword(TEST_PASSWORD);
  const [row] = await db
    .insert(schema.users)
    .values({
      email: options.email ?? `user${counter}@school.test`,
      fullName: options.fullName ?? `Test User ${counter}`,
      role: options.role ?? "teacher",
      isActive: options.isActive ?? true,
      mustChangePassword: options.mustChangePassword ?? false,
      passwordHash: await cachedHash,
    })
    .returning();
  const { token } = await createSession(db, row.id);
  const user: SessionUser = {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    role: row.role,
    mustChangePassword: row.mustChangePassword,
    sessionId: hashToken(token),
  };
  return { db, user, token };
}

/**
 * Expect a promise to reject with an error whose message matches — either the raw error chain or the
 * user-facing message produced by `toAppError` (what the Server Actions show).
 */
export async function rejectsWith(promise: Promise<unknown>, pattern: RegExp): Promise<void> {
  try {
    await promise;
  } catch (error) {
    const messages: string[] = [];
    const friendly = toAppError(error);
    if (friendly) messages.push(friendly.message);
    let current: unknown = error;
    while (current instanceof Error) {
      messages.push(current.message);
      current = (current as Error & { cause?: unknown }).cause;
    }
    if (messages.some((m) => pattern.test(m))) return;
    throw new Error(`Expected an error matching ${pattern}, got: ${messages.join(" | ")}`);
  }
  throw new Error(`Expected an error matching ${pattern}, but it succeeded`);
}

/**
 * A minimal school: one year, Class 6 section A with a class teacher, English with a subject teacher,
 * one term with Monthly (25) + Term (75) assessments, two enrolled students and open draft mark sheets
 * for both stages (`monthlySheet` holds the Monthly Test, `sheet` the Term Examination).
 */
export async function seedSchool(db: Db) {
  const admin = await addUser(db, { role: "admin" });
  const classTeacher = await addUser(db);
  const subjectTeacher = await addUser(db);
  const [year] = await db.insert(schema.academicYears).values({ name: "2026-2027", startDate: "2026-04-01", endDate: "2027-03-31" }).returning();
  const [klass] = await db.insert(schema.classes).values({ name: "Class 6", sortOrder: 6 }).returning();
  const [section] = await db
    .insert(schema.sections)
    .values({ classId: klass.id, academicYearId: year.id, name: "A", classTeacherId: classTeacher.user.id })
    .returning();
  const [english] = await db.insert(schema.subjects).values({ name: "English", code: "ENG" }).returning();
  const [classSubject] = await db
    .insert(schema.classSubjects)
    .values({ classId: klass.id, academicYearId: year.id, subjectId: english.id })
    .returning();
  await db.insert(schema.teacherAssignments).values({ teacherId: subjectTeacher.user.id, sectionId: section.id, classSubjectId: classSubject.id });
  const [term] = await db.insert(schema.examTerms).values({ academicYearId: year.id, name: "First Term" }).returning();
  const types = await db.select().from(schema.assessmentTypes);
  const assessments = await db
    .insert(schema.assessments)
    .values(types.map((t) => ({ examTermId: term.id, classSubjectId: classSubject.id, assessmentTypeId: t.id, maxMarks: t.defaultMaxMarks })))
    .returning();
  const students = await db
    .insert(schema.students)
    .values([
      { studentCode: "S-001", fullName: "Student One" },
      { studentCode: "S-002", fullName: "Student Two" },
    ])
    .returning();
  const enrollments = await db
    .insert(schema.enrollments)
    .values(students.map((s, i) => ({ studentId: s.id, academicYearId: year.id, classId: klass.id, sectionId: section.id, rollNumber: i + 1 })))
    .returning();
  const key = { examTermId: term.id, sectionId: section.id, classSubjectId: classSubject.id };
  const [sheet] = await db.insert(schema.markSheets).values({ ...key, stage: "term" }).returning();
  const [monthlySheet] = await db.insert(schema.markSheets).values({ ...key, stage: "monthly" }).returning();
  const monthly = assessments.find((a) => a.maxMarks === "25.00")!;
  const termExam = assessments.find((a) => a.maxMarks === "75.00")!;
  return { admin, classTeacher, subjectTeacher, year, klass, section, english, classSubject, term, monthly, termExam, students, enrollments, sheet, monthlySheet };
}
