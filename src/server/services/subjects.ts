/** Subjects (school-wide list) and class subjects (which subjects a class studies in a year). */
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { idSchema } from "@/lib/validation/common";
import { addClassSubjectsSchema, subjectSchema, updateClassSubjectSchema, updateSubjectSchema } from "@/lib/validation/academics";
import type { Db } from "@/server/db/client";
import { withActor } from "@/server/db/actor";
import { classes, classSubjects, subjects, teacherAssignments } from "@/server/db/schema";
import { notFound } from "@/server/errors";
import { assertAdmin, type ServiceContext } from "./guards";
import { parseInput } from "./validate";

export interface SubjectRow {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
  isActive: boolean;
  classCount: number;
}

export async function listSubjects(db: Db, academicYearId: string | null): Promise<SubjectRow[]> {
  return db
    .select({
      id: subjects.id,
      name: subjects.name,
      code: subjects.code,
      sortOrder: subjects.sortOrder,
      isActive: subjects.isActive,
      classCount: academicYearId
        ? sql<number>`(select count(*)::int from class_subjects cs where cs.subject_id = "subjects"."id" and cs.academic_year_id = ${academicYearId})`
        : sql<number>`0`,
    })
    .from(subjects)
    .orderBy(asc(subjects.sortOrder), asc(subjects.name));
}

export async function createSubject(ctx: ServiceContext, input: unknown): Promise<{ id: string }> {
  assertAdmin(ctx.user);
  const data = parseInput(subjectSchema, input);
  const [row] = await withActor(ctx.db, ctx.user.id, (tx) => tx.insert(subjects).values(data).returning({ id: subjects.id }));
  return row;
}

export async function updateSubject(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const { id, ...data } = parseInput(updateSubjectSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const updated = await tx.update(subjects).set(data).where(eq(subjects.id, id)).returning({ id: subjects.id });
    if (updated.length === 0) throw notFound("Subject");
  });
}

export async function deleteSubject(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const id = parseInput(idSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const deleted = await tx.delete(subjects).where(eq(subjects.id, id)).returning({ id: subjects.id });
    if (deleted.length === 0) throw notFound("Subject");
  });
}

// -- class subjects -------------------------------------------------------------------------------

export interface ClassSubjectRow {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  isCompulsory: boolean;
  includeInTotal: boolean;
  sortOrder: number;
  isActive: boolean;
  assignmentCount: number;
}

/** All class subjects of an academic year (optionally one class), in report order. */
export async function listClassSubjects(db: Db, academicYearId: string, classId?: string): Promise<ClassSubjectRow[]> {
  return db
    .select({
      id: classSubjects.id,
      classId: classSubjects.classId,
      className: classes.name,
      subjectId: classSubjects.subjectId,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      isCompulsory: classSubjects.isCompulsory,
      includeInTotal: classSubjects.includeInTotal,
      sortOrder: classSubjects.sortOrder,
      isActive: classSubjects.isActive,
      assignmentCount: sql<number>`(select count(*)::int from ${teacherAssignments} where ${teacherAssignments.classSubjectId} = ${classSubjects.id})`,
    })
    .from(classSubjects)
    .innerJoin(classes, eq(classes.id, classSubjects.classId))
    .innerJoin(subjects, eq(subjects.id, classSubjects.subjectId))
    .where(classId ? and(eq(classSubjects.academicYearId, academicYearId), eq(classSubjects.classId, classId)) : eq(classSubjects.academicYearId, academicYearId))
    .orderBy(asc(classes.sortOrder), asc(classes.name), asc(classSubjects.sortOrder), asc(subjects.sortOrder), asc(subjects.name));
}

/** Add subjects to a class for a year. Subjects already added are skipped. Returns how many were added. */
export async function addClassSubjects(ctx: ServiceContext, input: unknown): Promise<{ added: number }> {
  assertAdmin(ctx.user);
  const data = parseInput(addClassSubjectsSchema, input);
  return withActor(ctx.db, ctx.user.id, async (tx) => {
    const chosen = await tx.select({ id: subjects.id, sortOrder: subjects.sortOrder }).from(subjects).where(inArray(subjects.id, data.subjectIds));
    if (chosen.length !== new Set(data.subjectIds).size) throw notFound("Subject");
    const inserted = await tx
      .insert(classSubjects)
      .values(chosen.map((s) => ({ classId: data.classId, academicYearId: data.academicYearId, subjectId: s.id, sortOrder: s.sortOrder })))
      .onConflictDoNothing({ target: [classSubjects.classId, classSubjects.academicYearId, classSubjects.subjectId] })
      .returning({ id: classSubjects.id });
    return { added: inserted.length };
  });
}

export async function updateClassSubject(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const { id, ...data } = parseInput(updateClassSubjectSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const updated = await tx.update(classSubjects).set(data).where(eq(classSubjects.id, id)).returning({ id: classSubjects.id });
    if (updated.length === 0) throw notFound("Class subject");
  });
}

/**
 * Remove a subject from a class. Refused (foreign keys) once marks exist; teacher assignments for it
 * are removed with it.
 */
export async function removeClassSubject(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const id = parseInput(idSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const deleted = await tx.delete(classSubjects).where(eq(classSubjects.id, id)).returning({ id: classSubjects.id });
    if (deleted.length === 0) throw notFound("Class subject");
  });
}

/**
 * Copy a class's subjects (with their settings) from one academic year to another, e.g. when a new
 * year starts. Existing ones are kept.
 */
export async function copyClassSubjects(ctx: ServiceContext, input: { fromYearId: unknown; toYearId: unknown }): Promise<{ added: number }> {
  assertAdmin(ctx.user);
  const fromYearId = parseInput(idSchema, input.fromYearId);
  const toYearId = parseInput(idSchema, input.toYearId);
  return withActor(ctx.db, ctx.user.id, async (tx) => {
    const source = await tx.select().from(classSubjects).where(eq(classSubjects.academicYearId, fromYearId));
    if (source.length === 0) return { added: 0 };
    const inserted = await tx
      .insert(classSubjects)
      .values(
        source.map((s) => ({
          classId: s.classId,
          academicYearId: toYearId,
          subjectId: s.subjectId,
          isCompulsory: s.isCompulsory,
          includeInTotal: s.includeInTotal,
          sortOrder: s.sortOrder,
          isActive: s.isActive,
        })),
      )
      .onConflictDoNothing({ target: [classSubjects.classId, classSubjects.academicYearId, classSubjects.subjectId] })
      .returning({ id: classSubjects.id });
    return { added: inserted.length };
  });
}
