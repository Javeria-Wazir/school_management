/**
 * "My class": what a class teacher manages for their own section(s) in the current academic year —
 * removing (or, when nothing depends on them, deleting) students, and the class's subjects. The principal
 * can do the same for any section. Nothing here works while the class result is approved: the principal
 * must reopen it first, so an approved result never changes underneath its cards.
 */
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { idSchema } from "@/lib/validation/common";
import type { Db, Tx } from "@/server/db/client";
import { withActor } from "@/server/db/actor";
import {
  academicYears,
  assessments,
  assessmentTypes,
  classes,
  classSubjects,
  enrollments,
  examTerms,
  marks,
  resultApprovals,
  schoolSettings,
  sections,
  studentRemarks,
  students,
  subjects,
  users,
} from "@/server/db/schema";
import { AppError, forbidden, notFound } from "@/server/errors";
import type { ServiceContext } from "./guards";
import { parseInput } from "./validate";
import { MONTHLY_CODES } from "@/lib/domain/stages";

const reasonSchema = z.string().trim().min(5, "Please give a reason (at least 5 characters)").max(300, "Use at most 300 characters");
const removeSchema = z.object({ enrollmentId: idSchema, reason: reasonSchema });
const addSubjectSchema = z.object({ sectionId: idSchema, subjectId: idSchema });
const subjectSettingsSchema = z.object({
  sectionId: idSchema,
  classSubjectId: idSchema,
  isCompulsory: z.boolean(),
  includeInTotal: z.boolean(),
  isActive: z.boolean(),
});

export interface MyClassSection {
  id: string;
  label: string;
}

export interface MyClassStudent {
  enrollmentId: string;
  rollNumber: number;
  studentCode: string;
  fullName: string;
  guardianName: string | null;
  active: boolean;
  /** Marks or remarks exist, or the student has another enrolment: the record can only be removed, not deleted. */
  hasRecords: boolean;
}

export interface MyClassSubject {
  classSubjectId: string;
  name: string;
  code: string;
  isCompulsory: boolean;
  includeInTotal: boolean;
  isActive: boolean;
  teacherName: string | null;
}

export interface MyClassView {
  section: { id: string; name: string; className: string; classId: string; yearName: string; sectionCount: number };
  students: MyClassStudent[];
  subjects: MyClassSubject[];
  /** School subjects not yet in this class. */
  addable: { id: string; name: string; code: string }[];
  /** An approved result of this section: changes are refused until the principal reopens it. */
  locked: boolean;
}

/** Sections the user may manage: their own as class teacher (current year), or every section for the principal. */
export async function myClassSections(ctx: ServiceContext): Promise<MyClassSection[]> {
  const currentYear = sql`(select ${schoolSettings.currentAcademicYearId} from ${schoolSettings} where ${schoolSettings.id} = 1)`;
  const rows = await ctx.db
    .select({ id: sections.id, name: sections.name, className: classes.name })
    .from(sections)
    .innerJoin(classes, eq(classes.id, sections.classId))
    .where(and(eq(sections.isActive, true), sql`${sections.academicYearId} = ${currentYear}`, ctx.user.role === "admin" ? undefined : eq(sections.classTeacherId, ctx.user.id)))
    .orderBy(asc(classes.sortOrder), asc(classes.name), asc(sections.name));
  return rows.map((r) => ({ id: r.id, label: `${r.className} ${r.name}` }));
}

async function loadSection(db: Db | Tx, sectionId: string) {
  const [section] = await db
    .select({
      id: sections.id,
      name: sections.name,
      classId: sections.classId,
      className: classes.name,
      academicYearId: sections.academicYearId,
      yearName: academicYears.name,
      classTeacherId: sections.classTeacherId,
    })
    .from(sections)
    .innerJoin(classes, eq(classes.id, sections.classId))
    .innerJoin(academicYears, eq(academicYears.id, sections.academicYearId))
    .where(eq(sections.id, sectionId));
  if (!section) throw notFound("Class");
  return section;
}

/** The principal, or the class teacher of this section. */
async function manageable(ctx: ServiceContext, db: Db | Tx, sectionId: string) {
  const section = await loadSection(db, sectionId);
  if (ctx.user.role !== "admin" && section.classTeacherId !== ctx.user.id) throw forbidden("Only the class teacher of this class or the principal can change it.");
  return section;
}

async function isLocked(db: Db | Tx, sectionId: string): Promise<boolean> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(resultApprovals).where(and(eq(resultApprovals.sectionId, sectionId), ne(resultApprovals.status, "open")));
  return (row?.n ?? 0) > 0;
}

async function assertUnlocked(db: Db | Tx, sectionId: string) {
  if (await isLocked(db, sectionId)) throw new AppError("RULE", "This class's result is approved, so the class cannot be changed. Ask the principal to reopen the result first.");
}

export async function getMyClass(ctx: ServiceContext, input: unknown): Promise<MyClassView> {
  const sectionId = parseInput(idSchema, input);
  const section = await manageable(ctx, ctx.db, sectionId);
  const [studentRows, subjectRows, allSubjects, [sectionCount], locked] = await Promise.all([
    ctx.db
      .select({
        enrollmentId: enrollments.id,
        rollNumber: enrollments.rollNumber,
        studentCode: students.studentCode,
        fullName: students.fullName,
        guardianName: students.guardianName,
        status: enrollments.status,
        hasRecords: sql<boolean>`(
          exists (select 1 from ${marks} m where m.enrollment_id = ${enrollments.id})
          or exists (select 1 from ${studentRemarks} r where r.enrollment_id = ${enrollments.id})
          or exists (select 1 from ${enrollments} e2 where e2.student_id = ${enrollments.studentId} and e2.id <> ${enrollments.id}))`,
      })
      .from(enrollments)
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .where(eq(enrollments.sectionId, sectionId))
      .orderBy(asc(enrollments.rollNumber)),
    ctx.db
      .select({
        classSubjectId: classSubjects.id,
        subjectId: subjects.id,
        name: subjects.name,
        code: subjects.code,
        isCompulsory: classSubjects.isCompulsory,
        includeInTotal: classSubjects.includeInTotal,
        isActive: classSubjects.isActive,
        teacherName: sql<string | null>`(select u.full_name from teacher_assignments ta join ${users} u on u.id = ta.teacher_id where ta.section_id = ${sectionId} and ta.class_subject_id = ${classSubjects.id})`,
      })
      .from(classSubjects)
      .innerJoin(subjects, eq(subjects.id, classSubjects.subjectId))
      .where(and(eq(classSubjects.classId, section.classId), eq(classSubjects.academicYearId, section.academicYearId)))
      .orderBy(asc(classSubjects.sortOrder), asc(subjects.name)),
    ctx.db.select({ id: subjects.id, name: subjects.name, code: subjects.code }).from(subjects).where(eq(subjects.isActive, true)).orderBy(asc(subjects.sortOrder), asc(subjects.name)),
    ctx.db
      .select({ n: sql<number>`count(*)::int` })
      .from(sections)
      .where(and(eq(sections.classId, section.classId), eq(sections.academicYearId, section.academicYearId), eq(sections.isActive, true))),
    isLocked(ctx.db, sectionId),
  ]);
  const inClass = new Set(subjectRows.map((s) => s.subjectId));
  return {
    section: { id: section.id, name: section.name, className: section.className, classId: section.classId, yearName: section.yearName, sectionCount: sectionCount?.n ?? 1 },
    students: studentRows.map((s) => ({ ...s, active: s.status === "active", hasRecords: Boolean(s.hasRecords) })),
    subjects: subjectRows.map((s) => ({
      classSubjectId: s.classSubjectId,
      name: s.name,
      code: s.code,
      isCompulsory: s.isCompulsory,
      includeInTotal: s.includeInTotal,
      isActive: s.isActive,
      teacherName: s.teacherName,
    })),
    addable: allSubjects.filter((s) => !inClass.has(s.id)),
    locked,
  };
}

// -- students -------------------------------------------------------------------------------------

async function enrollmentInManagedSection(ctx: ServiceContext, tx: Tx, enrollmentId: string) {
  const [enrollment] = await tx.select().from(enrollments).where(eq(enrollments.id, enrollmentId));
  if (!enrollment) throw notFound("Student");
  await manageable(ctx, tx, enrollment.sectionId);
  await assertUnlocked(tx, enrollment.sectionId);
  return enrollment;
}

/** Take a student off the class list (e.g. left the school). Marks and history are kept; it can be undone. */
export async function removeStudentFromClass(ctx: ServiceContext, input: unknown): Promise<void> {
  const data = parseInput(removeSchema, input);
  await withActor(
    ctx.db,
    ctx.user.id,
    async (tx) => {
      const enrollment = await enrollmentInManagedSection(ctx, tx, data.enrollmentId);
      if (enrollment.status !== "active") throw new AppError("RULE", "This student is already off the class list.");
      await tx.update(enrollments).set({ status: "withdrawn" }).where(eq(enrollments.id, enrollment.id));
    },
    `Removed from class: ${data.reason}`,
  );
}

/** Put a removed student back on the class list. */
export async function restoreStudentToClass(ctx: ServiceContext, input: unknown): Promise<void> {
  const enrollmentId = parseInput(idSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const enrollment = await enrollmentInManagedSection(ctx, tx, enrollmentId);
    if (enrollment.status === "active") throw new AppError("RULE", "This student is already on the class list.");
    await tx.update(enrollments).set({ status: "active" }).where(eq(enrollments.id, enrollment.id));
  });
}

/**
 * Delete a student added by mistake. Only when nothing depends on the record: no marks, no remarks and no
 * other enrolment — otherwise the student can only be removed from the class.
 */
export async function deleteStudentRecord(ctx: ServiceContext, input: unknown): Promise<void> {
  const data = parseInput(removeSchema, input);
  await withActor(
    ctx.db,
    ctx.user.id,
    async (tx) => {
      const enrollment = await enrollmentInManagedSection(ctx, tx, data.enrollmentId);
      const count = sql<number>`count(*)::int`;
      const [[markCount], [remarkCount], [otherCount]] = await Promise.all([
        tx.select({ n: count }).from(marks).where(eq(marks.enrollmentId, enrollment.id)),
        tx.select({ n: count }).from(studentRemarks).where(eq(studentRemarks.enrollmentId, enrollment.id)),
        tx.select({ n: count }).from(enrollments).where(and(eq(enrollments.studentId, enrollment.studentId), ne(enrollments.id, enrollment.id))),
      ]);
      if (markCount.n || remarkCount.n || otherCount.n) {
        throw new AppError("RULE", "This student has marks or other records, so they cannot be deleted. Use “Remove from class” instead; their history is kept.");
      }
      await tx.delete(enrollments).where(eq(enrollments.id, enrollment.id));
      await tx.delete(students).where(eq(students.id, enrollment.studentId));
    },
    `Student deleted: ${data.reason}`,
  );
}

// -- subjects -------------------------------------------------------------------------------------

/** Add a school subject to the class (all its sections) and prepare its papers (Monthly, Term …) for every term of the year. */
export async function addSubjectToClass(ctx: ServiceContext, input: unknown): Promise<void> {
  const data = parseInput(addSubjectSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const section = await manageable(ctx, tx, data.sectionId);
    await assertUnlocked(tx, section.id);
    const [subject] = await tx.select({ id: subjects.id, sortOrder: subjects.sortOrder, isActive: subjects.isActive }).from(subjects).where(eq(subjects.id, data.subjectId));
    if (!subject || !subject.isActive) throw notFound("Subject");
    const [existing] = await tx
      .select({ id: classSubjects.id, isActive: classSubjects.isActive })
      .from(classSubjects)
      .where(and(eq(classSubjects.classId, section.classId), eq(classSubjects.academicYearId, section.academicYearId), eq(classSubjects.subjectId, subject.id)));
    let classSubjectId = existing?.id;
    if (existing) {
      if (existing.isActive) throw new AppError("CONFLICT", "This subject is already in the class.");
      await tx.update(classSubjects).set({ isActive: true }).where(eq(classSubjects.id, existing.id));
    } else {
      const [row] = await tx
        .insert(classSubjects)
        .values({ classId: section.classId, academicYearId: section.academicYearId, subjectId: subject.id, sortOrder: subject.sortOrder })
        .returning({ id: classSubjects.id });
      classSubjectId = row.id;
    }
    const terms = await tx.select({ id: examTerms.id, monthlyTests: examTerms.monthlyTests }).from(examTerms).where(eq(examTerms.academicYearId, section.academicYearId));
    const types = await tx.select({ id: assessmentTypes.id, code: assessmentTypes.code, max: assessmentTypes.defaultMaxMarks }).from(assessmentTypes).where(eq(assessmentTypes.isActive, true));
    // Each term gets only the monthly tests it has (Monthly Test 2 only in a term with two or more).
    const papers = terms.flatMap((t) =>
      types
        .filter((ty) => !MONTHLY_CODES.slice(t.monthlyTests).includes(ty.code as (typeof MONTHLY_CODES)[number]))
        .map((ty) => ({ examTermId: t.id, classSubjectId: classSubjectId!, assessmentTypeId: ty.id, maxMarks: ty.max })),
    );
    if (papers.length) {
      await tx.insert(assessments).values(papers).onConflictDoNothing({ target: [assessments.examTermId, assessments.classSubjectId, assessments.assessmentTypeId] });
    }
  });
}

/** Switch a class subject on/off, or change whether it is compulsory and counts in the total. */
export async function updateMyClassSubject(ctx: ServiceContext, input: unknown): Promise<void> {
  const data = parseInput(subjectSettingsSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const section = await manageable(ctx, tx, data.sectionId);
    await assertUnlocked(tx, section.id);
    const updated = await tx
      .update(classSubjects)
      .set({ isCompulsory: data.isCompulsory, includeInTotal: data.includeInTotal, isActive: data.isActive })
      .where(and(eq(classSubjects.id, data.classSubjectId), eq(classSubjects.classId, section.classId), eq(classSubjects.academicYearId, section.academicYearId)))
      .returning({ id: classSubjects.id });
    if (updated.length === 0) throw notFound("Class subject");
  });
}

// -- principal: a teacher's class -----------------------------------------------------------------

const teacherClassSchema = z.object({ teacherId: idSchema, sectionId: z.preprocess((v) => (v === "" || v === "none" ? undefined : v), idSchema.optional()) });

/**
 * Make a teacher the class teacher of one section of the current year (or of none). They stop being class
 * teacher of any other current-year section; the section's previous class teacher is replaced.
 */
export async function setTeacherClass(ctx: ServiceContext, input: unknown): Promise<{ replaced: string | null }> {
  if (ctx.user.role !== "admin") throw forbidden("Only the principal or an administrator can do this.");
  const data = parseInput(teacherClassSchema, input);
  return withActor(ctx.db, ctx.user.id, async (tx) => {
    const [teacher] = await tx.select({ id: users.id, isActive: users.isActive }).from(users).where(eq(users.id, data.teacherId));
    if (!teacher) throw notFound("Staff member");
    if (data.sectionId && !teacher.isActive) throw new AppError("RULE", "This account is inactive. Activate it before giving it a class.");
    const [settings] = await tx.select({ yearId: schoolSettings.currentAcademicYearId }).from(schoolSettings).where(eq(schoolSettings.id, 1));
    let yearId = settings?.yearId ?? null;
    let replaced: string | null = null;
    if (data.sectionId) {
      const section = await loadSection(tx, data.sectionId);
      yearId = section.academicYearId;
      if (section.classTeacherId && section.classTeacherId !== teacher.id) {
        const [previous] = await tx.select({ name: users.fullName }).from(users).where(eq(users.id, section.classTeacherId));
        replaced = previous?.name ?? null;
      }
    }
    if (yearId) {
      const others = await tx
        .select({ id: sections.id })
        .from(sections)
        .where(and(eq(sections.classTeacherId, teacher.id), eq(sections.academicYearId, yearId)));
      const ids = others.map((o) => o.id).filter((id) => id !== data.sectionId);
      if (ids.length) await tx.update(sections).set({ classTeacherId: null }).where(inArray(sections.id, ids));
    }
    if (data.sectionId) await tx.update(sections).set({ classTeacherId: teacher.id }).where(eq(sections.id, data.sectionId));
    return { replaced };
  });
}

/** Current-year sections with their class teacher, for the principal's "change class" choice. */
export async function sectionsWithClassTeachers(db: Db): Promise<{ id: string; label: string; classTeacherId: string | null; classTeacherName: string | null }[]> {
  const currentYear = sql`(select ${schoolSettings.currentAcademicYearId} from ${schoolSettings} where ${schoolSettings.id} = 1)`;
  const rows = await db
    .select({ id: sections.id, name: sections.name, className: classes.name, classTeacherId: sections.classTeacherId, classTeacherName: users.fullName })
    .from(sections)
    .innerJoin(classes, eq(classes.id, sections.classId))
    .leftJoin(users, eq(users.id, sections.classTeacherId))
    .where(and(eq(sections.isActive, true), sql`${sections.academicYearId} = ${currentYear}`))
    .orderBy(asc(classes.sortOrder), asc(classes.name), asc(sections.name));
  return rows.map((r) => ({ id: r.id, label: `${r.className} ${r.name}`, classTeacherId: r.classTeacherId, classTeacherName: r.classTeacherName }));
}
