/** Students (permanent record) and enrolments (student × academic year → class, section, roll number). */
import { and, asc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { idSchema } from "@/lib/validation/common";
import { createStudentSchema, enrollmentSchema, studentStatusSchema, updateEnrollmentSchema, updateStudentSchema } from "@/lib/validation/academics";
import { normalizePhone } from "@/lib/validation/phone";
import type { Db, Tx } from "@/server/db/client";
import { withActor } from "@/server/db/actor";
import { classes, enrollments, schoolSettings, sections, students } from "@/server/db/schema";
import { AppError, notFound } from "@/server/errors";
import { assertAdmin, type ServiceContext } from "./guards";
import { parseInput } from "./validate";

export interface EnrolledStudentRow {
  enrollmentId: string;
  studentId: string;
  studentCode: string;
  fullName: string;
  guardianName: string | null;
  guardianPhone: string | null;
  dateOfBirth: string | null;
  studentStatus: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  rollNumber: number;
  enrollmentStatus: "active" | "withdrawn";
}

export interface StudentFilters {
  classId?: string;
  sectionId?: string;
  search?: string;
  includeWithdrawn?: boolean;
}

/** Students enrolled in a year, in class → section → roll order. */
export async function listEnrolledStudents(db: Db, academicYearId: string, filters: StudentFilters = {}): Promise<EnrolledStudentRow[]> {
  const conditions: SQL[] = [eq(enrollments.academicYearId, academicYearId)];
  if (filters.classId) conditions.push(eq(enrollments.classId, filters.classId));
  if (filters.sectionId) conditions.push(eq(enrollments.sectionId, filters.sectionId));
  if (!filters.includeWithdrawn) conditions.push(eq(enrollments.status, "active"));
  const search = filters.search?.trim();
  if (search) {
    const pattern = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    conditions.push(or(ilike(students.fullName, pattern), ilike(students.studentCode, pattern), ilike(students.guardianName, pattern))!);
  }
  return db
    .select({
      enrollmentId: enrollments.id,
      studentId: students.id,
      studentCode: students.studentCode,
      fullName: students.fullName,
      guardianName: students.guardianName,
      guardianPhone: students.guardianPhone,
      dateOfBirth: students.dateOfBirth,
      studentStatus: students.status,
      classId: classes.id,
      className: classes.name,
      sectionId: sections.id,
      sectionName: sections.name,
      rollNumber: enrollments.rollNumber,
      enrollmentStatus: enrollments.status,
    })
    .from(enrollments)
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .innerJoin(sections, eq(sections.id, enrollments.sectionId))
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .where(and(...conditions))
    .orderBy(asc(classes.sortOrder), asc(classes.name), asc(sections.name), asc(enrollments.rollNumber));
}

export async function getCountryCode(db: Db | Tx): Promise<string> {
  const [row] = await db.select({ code: schoolSettings.defaultCountryCode }).from(schoolSettings).where(eq(schoolSettings.id, 1));
  return row?.code ?? "92";
}

function phoneOrError(raw: string | undefined, countryCode: string): string | null {
  try {
    return normalizePhone(raw, countryCode);
  } catch (error) {
    const message = (error as Error).message;
    throw new AppError("VALIDATION", message, { guardianPhone: [message] });
  }
}

function checkDateOfBirth(value: string | undefined): string | null {
  if (!value) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (value > today || value < "1950-01-01") {
    throw new AppError("VALIDATION", "Date of birth is not plausible", { dateOfBirth: ["Date of birth is not plausible"] });
  }
  return value;
}

/** The section must belong to the academic year; returns its class for the enrolment row. */
async function sectionInYear(tx: Tx, sectionId: string, academicYearId: string): Promise<{ classId: string }> {
  const [section] = await tx
    .select({ classId: sections.classId, isActive: sections.isActive })
    .from(sections)
    .where(and(eq(sections.id, sectionId), eq(sections.academicYearId, academicYearId)));
  if (!section) throw new AppError("VALIDATION", "Choose a section of this academic year.", { sectionId: ["Choose a section of this academic year"] });
  if (!section.isActive) throw new AppError("RULE", "This section is inactive.");
  return section;
}

/** Add a new student and enrol them in a section in one step. */
export async function createStudent(ctx: ServiceContext, input: unknown): Promise<{ studentId: string; enrollmentId: string }> {
  assertAdmin(ctx.user);
  const data = parseInput(createStudentSchema, input);
  return withActor(ctx.db, ctx.user.id, async (tx) => {
    const guardianPhone = phoneOrError(data.guardianPhone, await getCountryCode(tx));
    const dateOfBirth = checkDateOfBirth(data.dateOfBirth);
    const { classId } = await sectionInYear(tx, data.sectionId, data.academicYearId);
    const [student] = await tx
      .insert(students)
      .values({ studentCode: data.studentCode, fullName: data.fullName, guardianName: data.guardianName ?? null, guardianPhone, dateOfBirth })
      .returning({ id: students.id });
    const [enrollment] = await tx
      .insert(enrollments)
      .values({ studentId: student.id, academicYearId: data.academicYearId, classId, sectionId: data.sectionId, rollNumber: data.rollNumber })
      .returning({ id: enrollments.id });
    return { studentId: student.id, enrollmentId: enrollment.id };
  });
}

export async function updateStudent(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const { id, ...data } = parseInput(updateStudentSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const guardianPhone = phoneOrError(data.guardianPhone, await getCountryCode(tx));
    const updated = await tx
      .update(students)
      .set({ studentCode: data.studentCode, fullName: data.fullName, guardianName: data.guardianName ?? null, guardianPhone, dateOfBirth: checkDateOfBirth(data.dateOfBirth) })
      .where(eq(students.id, id))
      .returning({ id: students.id });
    if (updated.length === 0) throw notFound("Student");
  });
}

/** Archive/transfer/graduate a student. Their active enrolments are withdrawn at the same time. */
export async function setStudentStatus(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const { id, status } = parseInput(studentStatusSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const updated = await tx.update(students).set({ status }).where(eq(students.id, id)).returning({ id: students.id });
    if (updated.length === 0) throw notFound("Student");
    if (status !== "active") {
      await tx.update(enrollments).set({ status: "withdrawn" }).where(and(eq(enrollments.studentId, id), eq(enrollments.status, "active")));
    }
  });
}

/** Enrol an existing (active) student in a year. */
export async function enrollStudent(ctx: ServiceContext, input: unknown): Promise<{ id: string }> {
  assertAdmin(ctx.user);
  const data = parseInput(enrollmentSchema, input);
  return withActor(ctx.db, ctx.user.id, async (tx) => {
    const [student] = await tx.select({ status: students.status }).from(students).where(eq(students.id, data.studentId));
    if (!student) throw notFound("Student");
    if (student.status !== "active") throw new AppError("RULE", `This student is ${student.status}. Make them active before enrolling.`);
    const { classId } = await sectionInYear(tx, data.sectionId, data.academicYearId);
    const [row] = await tx.insert(enrollments).values({ ...data, classId }).returning({ id: enrollments.id });
    return row;
  });
}

/** Move to another section of the same year and/or change the roll number (refused once marks exist). */
export async function updateEnrollment(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const data = parseInput(updateEnrollmentSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const [current] = await tx.select({ academicYearId: enrollments.academicYearId }).from(enrollments).where(eq(enrollments.id, data.id));
    if (!current) throw notFound("Enrolment");
    const { classId } = await sectionInYear(tx, data.sectionId, current.academicYearId);
    await tx.update(enrollments).set({ sectionId: data.sectionId, classId, rollNumber: data.rollNumber }).where(eq(enrollments.id, data.id));
  });
}

export async function setEnrollmentActive(ctx: ServiceContext, input: { id: unknown; active: boolean }): Promise<void> {
  assertAdmin(ctx.user);
  const id = parseInput(idSchema, input.id);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const updated = await tx
      .update(enrollments)
      .set({ status: input.active ? "active" : "withdrawn" })
      .where(eq(enrollments.id, id))
      .returning({ id: enrollments.id });
    if (updated.length === 0) throw notFound("Enrolment");
  });
}

/** Next free roll number in a class for a year (a suggestion for the "Add student" form). */
export async function nextRollNumber(db: Db, academicYearId: string, classId: string): Promise<number> {
  const [row] = await db
    .select({ max: sql<number | null>`max(${enrollments.rollNumber})` })
    .from(enrollments)
    .where(and(eq(enrollments.academicYearId, academicYearId), eq(enrollments.classId, classId)));
  return (row?.max ?? 0) + 1;
}

/** Edit a student's details and their enrolment (section, roll number) together, all or nothing. */
export async function updateStudentWithEnrollment(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const fields = (input ?? {}) as Record<string, unknown>;
  const student = parseInput(updateStudentSchema, { ...fields, id: fields.studentId });
  const enrollment = parseInput(updateEnrollmentSchema, { id: fields.enrollmentId, sectionId: fields.sectionId, rollNumber: fields.rollNumber });
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const guardianPhone = phoneOrError(student.guardianPhone, await getCountryCode(tx));
    const updated = await tx
      .update(students)
      .set({
        studentCode: student.studentCode,
        fullName: student.fullName,
        guardianName: student.guardianName ?? null,
        guardianPhone,
        dateOfBirth: checkDateOfBirth(student.dateOfBirth),
      })
      .where(eq(students.id, student.id))
      .returning({ id: students.id });
    if (updated.length === 0) throw notFound("Student");
    const [current] = await tx
      .select({ academicYearId: enrollments.academicYearId, studentId: enrollments.studentId })
      .from(enrollments)
      .where(eq(enrollments.id, enrollment.id));
    if (!current || current.studentId !== student.id) throw notFound("Enrolment");
    const { classId } = await sectionInYear(tx, enrollment.sectionId, current.academicYearId);
    await tx.update(enrollments).set({ sectionId: enrollment.sectionId, classId, rollNumber: enrollment.rollNumber }).where(eq(enrollments.id, enrollment.id));
  });
}
