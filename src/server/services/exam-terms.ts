/**
 * Exam terms, assessment types (Monthly 25, Term 75 …) and per-term maximum marks
 * (term × class subject × assessment type).
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { idSchema } from "@/lib/validation/common";
import {
  assessmentTypeSchema,
  examTermSchema,
  setMaxMarksSchema,
  updateAssessmentTypeSchema,
  updateExamTermSchema,
} from "@/lib/validation/academics";
import type { Db } from "@/server/db/client";
import { withActor } from "@/server/db/actor";
import { assessments, assessmentTypes, classes, classSubjects, examTerms, gradingScales, markSheets, schoolSettings, subjects } from "@/server/db/schema";
import { AppError, notFound } from "@/server/errors";
import { assertAdmin, type ServiceContext } from "./guards";
import { parseInput } from "./validate";

export interface ExamTermRow {
  id: string;
  academicYearId: string;
  name: string;
  sortOrder: number;
  startDate: string | null;
  endDate: string | null;
  marksDeadline: string | null;
  gradingScaleId: string | null;
  gradingScaleName: string | null;
  isActive: boolean;
  isCurrent: boolean;
  assessmentCount: number;
}

export async function listExamTerms(db: Db, academicYearId: string): Promise<ExamTermRow[]> {
  return db
    .select({
      id: examTerms.id,
      academicYearId: examTerms.academicYearId,
      name: examTerms.name,
      sortOrder: examTerms.sortOrder,
      startDate: examTerms.startDate,
      endDate: examTerms.endDate,
      marksDeadline: examTerms.marksDeadline,
      gradingScaleId: examTerms.gradingScaleId,
      gradingScaleName: gradingScales.name,
      isActive: examTerms.isActive,
      isCurrent: sql<boolean>`coalesce(${examTerms.id} = (select ${schoolSettings.currentExamTermId} from ${schoolSettings} where ${schoolSettings.id} = 1), false)`,
      assessmentCount: sql<number>`(select count(*)::int from ${assessments} where ${assessments.examTermId} = ${examTerms.id})`,
    })
    .from(examTerms)
    .leftJoin(gradingScales, eq(gradingScales.id, examTerms.gradingScaleId))
    .where(eq(examTerms.academicYearId, academicYearId))
    .orderBy(asc(examTerms.sortOrder), asc(examTerms.startDate), asc(examTerms.name));
}

export async function createExamTerm(ctx: ServiceContext, input: unknown): Promise<{ id: string }> {
  assertAdmin(ctx.user);
  const data = parseInput(examTermSchema, input);
  const [row] = await withActor(ctx.db, ctx.user.id, (tx) =>
    tx
      .insert(examTerms)
      .values({
        ...data,
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        marksDeadline: data.marksDeadline ?? null,
        gradingScaleId: data.gradingScaleId ?? null,
      })
      .returning({ id: examTerms.id }),
  );
  return row;
}

export async function updateExamTerm(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const { id, ...data } = parseInput(updateExamTermSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const updated = await tx
      .update(examTerms)
      .set({
        ...data,
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        marksDeadline: data.marksDeadline ?? null,
        gradingScaleId: data.gradingScaleId ?? null,
      })
      .where(eq(examTerms.id, id))
      .returning({ id: examTerms.id });
    if (updated.length === 0) throw notFound("Exam term");
  });
}

/** Only a term without assessments or mark sheets can be deleted. */
export async function deleteExamTerm(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const id = parseInput(idSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const [used] = await tx.select({ n: sql<number>`count(*)::int` }).from(assessments).where(eq(assessments.examTermId, id));
    if (used.n > 0) throw new AppError("RULE", "This term already has assessments, so it cannot be deleted. Make it inactive instead.");
    const deleted = await tx.delete(examTerms).where(eq(examTerms.id, id)).returning({ id: examTerms.id });
    if (deleted.length === 0) throw notFound("Exam term");
  });
}

/** The current term is the default everywhere (marks entry, reports). It must belong to the current year. */
export async function setCurrentExamTerm(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const id = parseInput(idSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const [term] = await tx.select({ isActive: examTerms.isActive, yearId: examTerms.academicYearId }).from(examTerms).where(eq(examTerms.id, id));
    if (!term) throw notFound("Exam term");
    if (!term.isActive) throw new AppError("RULE", "Activate the term before making it current.");
    // The database refuses a term from another year (trigger), with a clear message.
    await tx.update(schoolSettings).set({ currentExamTermId: id, updatedBy: ctx.user.id }).where(eq(schoolSettings.id, 1));
  });
}

// -- assessment types -----------------------------------------------------------------------------

export type AssessmentTypeRow = typeof assessmentTypes.$inferSelect;

export async function listAssessmentTypes(db: Db): Promise<AssessmentTypeRow[]> {
  return db.select().from(assessmentTypes).orderBy(asc(assessmentTypes.sortOrder), asc(assessmentTypes.name));
}

export async function createAssessmentType(ctx: ServiceContext, input: unknown): Promise<{ id: string }> {
  assertAdmin(ctx.user);
  const data = parseInput(assessmentTypeSchema, input);
  const [row] = await withActor(ctx.db, ctx.user.id, (tx) => tx.insert(assessmentTypes).values(data).returning({ id: assessmentTypes.id }));
  return row;
}

/** Changing a default affects only assessments prepared afterwards; existing maximums are kept. */
export async function updateAssessmentType(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const { id, ...data } = parseInput(updateAssessmentTypeSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const updated = await tx.update(assessmentTypes).set(data).where(eq(assessmentTypes.id, id)).returning({ id: assessmentTypes.id });
    if (updated.length === 0) throw notFound("Assessment type");
  });
}

// -- per-term maximum marks -----------------------------------------------------------------------

/**
 * Create the missing assessments of a term (every active class subject × every active assessment
 * type) with the default maximums. Existing ones, including changed maximums, are left alone.
 */
export async function prepareTermAssessments(ctx: ServiceContext, input: unknown): Promise<{ created: number }> {
  assertAdmin(ctx.user);
  const termId = parseInput(idSchema, input);
  return withActor(ctx.db, ctx.user.id, async (tx) => {
    const [term] = await tx.select({ yearId: examTerms.academicYearId }).from(examTerms).where(eq(examTerms.id, termId));
    if (!term) throw notFound("Exam term");
    const pairs = await tx
      .select({ classSubjectId: classSubjects.id, assessmentTypeId: assessmentTypes.id, maxMarks: assessmentTypes.defaultMaxMarks })
      .from(classSubjects)
      .innerJoin(assessmentTypes, eq(assessmentTypes.isActive, true))
      .where(and(eq(classSubjects.academicYearId, term.yearId), eq(classSubjects.isActive, true)));
    if (pairs.length === 0) return { created: 0 };
    const inserted = await tx
      .insert(assessments)
      .values(pairs.map((p) => ({ examTermId: termId, ...p })))
      .onConflictDoNothing({ target: [assessments.examTermId, assessments.classSubjectId, assessments.assessmentTypeId] })
      .returning({ id: assessments.id });
    return { created: inserted.length };
  });
}

export interface TermAssessmentRow {
  assessmentId: string;
  classId: string;
  className: string;
  classSubjectId: string;
  subjectName: string;
  assessmentTypeName: string;
  assessmentTypeSortOrder: number;
  maxMarks: string;
  /** Some sheet for this subject has been submitted, so the maximum can no longer change. */
  locked: boolean;
}

export async function listTermAssessments(db: Db, termId: string): Promise<TermAssessmentRow[]> {
  return db
    .select({
      assessmentId: assessments.id,
      classId: classes.id,
      className: classes.name,
      classSubjectId: classSubjects.id,
      subjectName: subjects.name,
      assessmentTypeName: assessmentTypes.name,
      assessmentTypeSortOrder: assessmentTypes.sortOrder,
      maxMarks: assessments.maxMarks,
      locked: sql<boolean>`exists (select 1 from ${markSheets} ms where ms.exam_term_id = ${assessments.examTermId} and ms.class_subject_id = ${assessments.classSubjectId} and ms.status not in ('draft', 'returned'))`,
    })
    .from(assessments)
    .innerJoin(classSubjects, eq(classSubjects.id, assessments.classSubjectId))
    .innerJoin(classes, eq(classes.id, classSubjects.classId))
    .innerJoin(subjects, eq(subjects.id, classSubjects.subjectId))
    .innerJoin(assessmentTypes, eq(assessmentTypes.id, assessments.assessmentTypeId))
    .where(and(eq(assessments.examTermId, termId), eq(classSubjects.isActive, true)))
    .orderBy(asc(classes.sortOrder), asc(classes.name), asc(classSubjects.sortOrder), asc(subjects.name), asc(assessmentTypes.sortOrder));
}

/** Change one maximum (e.g. a 50-mark practical). Refused after submission or below an entered mark. */
export async function setMaxMarks(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const data = parseInput(setMaxMarksSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const updated = await tx.update(assessments).set({ maxMarks: data.maxMarks }).where(eq(assessments.id, data.assessmentId)).returning({ id: assessments.id });
    if (updated.length === 0) throw notFound("Assessment");
  });
}

/**
 * Terms of the current academic year for marks and results pages, and the selected one: the
 * requested term if valid, otherwise the school's current term, otherwise the first active term.
 */
export async function resolveExamTerm(db: Db, requested?: string | string[]): Promise<{ terms: ExamTermRow[]; selected: ExamTermRow | null; yearName: string | null }> {
  const [settings] = await db
    .select({ yearId: schoolSettings.currentAcademicYearId, yearName: sql<string | null>`(select y.name from academic_years y where y.id = ${schoolSettings.currentAcademicYearId})` })
    .from(schoolSettings)
    .where(eq(schoolSettings.id, 1));
  if (!settings?.yearId) return { terms: [], selected: null, yearName: null };
  const terms = (await listExamTerms(db, settings.yearId)).filter((t) => t.isActive);
  const wanted = typeof requested === "string" ? terms.find((t) => t.id === requested) : undefined;
  return { terms, selected: wanted ?? terms.find((t) => t.isCurrent) ?? terms[0] ?? null, yearName: settings.yearName };
}
