/** Classes (e.g. "Class 6") and their sections per academic year, with class teachers. Admin only for changes. */
import { asc, eq, sql } from "drizzle-orm";
import { idSchema } from "@/lib/validation/common";
import { classSchema, sectionSchema, updateClassSchema, updateSectionSchema } from "@/lib/validation/academics";
import type { Db } from "@/server/db/client";
import { withActor } from "@/server/db/actor";
import { academicYears, classes, enrollments, sections, users } from "@/server/db/schema";
import { notFound } from "@/server/errors";
import { assertAdmin, type ServiceContext } from "./guards";
import { parseInput } from "./validate";

export interface ClassRow {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  sectionCount: number;
}

export async function listClasses(db: Db, academicYearId: string | null): Promise<ClassRow[]> {
  return db
    .select({
      id: classes.id,
      name: classes.name,
      sortOrder: classes.sortOrder,
      isActive: classes.isActive,
      sectionCount: academicYearId
        ? sql<number>`(select count(*)::int from sections s where s.class_id = "classes"."id" and s.academic_year_id = ${academicYearId})`
        : sql<number>`0`,
    })
    .from(classes)
    .orderBy(asc(classes.sortOrder), asc(classes.name));
}

export async function createClass(ctx: ServiceContext, input: unknown): Promise<{ id: string }> {
  assertAdmin(ctx.user);
  const data = parseInput(classSchema, input);
  const [row] = await withActor(ctx.db, ctx.user.id, (tx) => tx.insert(classes).values(data).returning({ id: classes.id }));
  return row;
}

export async function updateClass(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const { id, ...data } = parseInput(updateClassSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const updated = await tx.update(classes).set(data).where(eq(classes.id, id)).returning({ id: classes.id });
    if (updated.length === 0) throw notFound("Class");
  });
}

/** Only a class with no sections, subjects or students can be deleted (foreign keys refuse otherwise). */
export async function deleteClass(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const id = parseInput(idSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const deleted = await tx.delete(classes).where(eq(classes.id, id)).returning({ id: classes.id });
    if (deleted.length === 0) throw notFound("Class");
  });
}

// -- sections -------------------------------------------------------------------------------------

export interface SectionRow {
  id: string;
  name: string;
  classId: string;
  className: string;
  classSortOrder: number;
  academicYearId: string;
  classTeacherId: string | null;
  classTeacherName: string | null;
  isActive: boolean;
  studentCount: number;
}

export async function listSections(db: Db, academicYearId: string): Promise<SectionRow[]> {
  return db
    .select({
      id: sections.id,
      name: sections.name,
      classId: sections.classId,
      className: classes.name,
      classSortOrder: classes.sortOrder,
      academicYearId: sections.academicYearId,
      classTeacherId: sections.classTeacherId,
      classTeacherName: users.fullName,
      isActive: sections.isActive,
      studentCount: sql<number>`(select count(*)::int from ${enrollments} where ${enrollments.sectionId} = ${sections.id} and ${enrollments.status} = 'active')`,
    })
    .from(sections)
    .innerJoin(classes, eq(classes.id, sections.classId))
    .leftJoin(users, eq(users.id, sections.classTeacherId))
    .where(eq(sections.academicYearId, academicYearId))
    .orderBy(asc(classes.sortOrder), asc(classes.name), asc(sections.name));
}

export async function createSection(ctx: ServiceContext, input: unknown): Promise<{ id: string }> {
  assertAdmin(ctx.user);
  const data = parseInput(sectionSchema, input);
  const [row] = await withActor(ctx.db, ctx.user.id, async (tx) => {
    const [year] = await tx.select({ id: academicYears.id }).from(academicYears).where(eq(academicYears.id, data.academicYearId));
    if (!year) throw notFound("Academic year");
    return tx
      .insert(sections)
      .values({ ...data, classTeacherId: data.classTeacherId ?? null })
      .returning({ id: sections.id });
  });
  return row;
}

export async function updateSection(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const { id, ...data } = parseInput(updateSectionSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const updated = await tx
      .update(sections)
      .set({ ...data, classTeacherId: data.classTeacherId ?? null })
      .where(eq(sections.id, id))
      .returning({ id: sections.id });
    if (updated.length === 0) throw notFound("Section");
  });
}

export async function deleteSection(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const id = parseInput(idSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const deleted = await tx.delete(sections).where(eq(sections.id, id)).returning({ id: sections.id });
    if (deleted.length === 0) throw notFound("Section");
  });
}

/** Active staff who can be chosen as class or subject teachers. */
export async function listActiveStaff(db: Db): Promise<{ id: string; fullName: string; email: string }[]> {
  return db
    .select({ id: users.id, fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(asc(users.fullName));
}
