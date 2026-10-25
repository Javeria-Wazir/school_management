import { desc, eq, sql } from "drizzle-orm";
import { idSchema } from "@/lib/validation/common";
import { academicYearSchema, updateAcademicYearSchema } from "@/lib/validation/settings";
import type { Db } from "@/server/db/client";
import { withActor } from "@/server/db/actor";
import { academicYears, enrollments, examTerms, schoolSettings, sections } from "@/server/db/schema";
import { AppError, notFound } from "@/server/errors";
import { assertAdmin, type ServiceContext } from "./guards";
import { parseInput } from "./validate";

export interface AcademicYearRow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  sectionCount: number;
  termCount: number;
  studentCount: number;
}

/** Readable by every signed-in user (needed for year filters). */
export async function listAcademicYears(db: Db): Promise<AcademicYearRow[]> {
  return db
    .select({
      id: academicYears.id,
      name: academicYears.name,
      startDate: academicYears.startDate,
      endDate: academicYears.endDate,
      isCurrent: sql<boolean>`coalesce(${academicYears.id} = (select ${schoolSettings.currentAcademicYearId} from ${schoolSettings} where ${schoolSettings.id} = 1), false)`,
      sectionCount: sql<number>`(select count(*)::int from ${sections} where ${sections.academicYearId} = ${academicYears.id})`,
      termCount: sql<number>`(select count(*)::int from ${examTerms} where ${examTerms.academicYearId} = ${academicYears.id})`,
      studentCount: sql<number>`(select count(*)::int from ${enrollments} where ${enrollments.academicYearId} = ${academicYears.id} and ${enrollments.status} = 'active')`,
    })
    .from(academicYears)
    .orderBy(desc(academicYears.startDate));
}

export async function createAcademicYear(ctx: ServiceContext, input: unknown): Promise<{ id: string }> {
  assertAdmin(ctx.user);
  const data = parseInput(academicYearSchema, input);
  return withActor(ctx.db, ctx.user.id, async (tx) => {
    const [row] = await tx.insert(academicYears).values(data).returning({ id: academicYears.id });
    // The very first year becomes the current one automatically.
    await tx
      .update(schoolSettings)
      .set({ currentAcademicYearId: row.id, updatedBy: ctx.user.id })
      .where(sql`${schoolSettings.id} = 1 and ${schoolSettings.currentAcademicYearId} is null`);
    return row;
  });
}

export async function updateAcademicYear(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const { id, ...data } = parseInput(updateAcademicYearSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const updated = await tx.update(academicYears).set(data).where(eq(academicYears.id, id)).returning({ id: academicYears.id });
    if (updated.length === 0) throw notFound("Academic year");
  });
}

/** Only an unused year can be deleted (no sections, terms or enrolments — enforced by foreign keys too). */
export async function deleteAcademicYear(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const id = parseInput(idSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const [usage] = await tx
      .select({
        sections: sql<number>`(select count(*)::int from ${sections} where ${sections.academicYearId} = ${id})`,
        terms: sql<number>`(select count(*)::int from ${examTerms} where ${examTerms.academicYearId} = ${id})`,
      })
      .from(sql`(select 1) as one`);
    if (usage.sections > 0 || usage.terms > 0) {
      throw new AppError("RULE", "This academic year already has sections or exam terms, so it cannot be deleted.");
    }
    const deleted = await tx.delete(academicYears).where(eq(academicYears.id, id)).returning({ id: academicYears.id });
    if (deleted.length === 0) throw notFound("Academic year");
  });
}

/** Switching the current year clears the current exam term, which belongs to the old year. */
export async function setCurrentAcademicYear(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const id = parseInput(idSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const [year] = await tx.select({ id: academicYears.id }).from(academicYears).where(eq(academicYears.id, id));
    if (!year) throw notFound("Academic year");
    await tx
      .update(schoolSettings)
      .set({
        currentAcademicYearId: id,
        currentExamTermId: sql`case when ${schoolSettings.currentAcademicYearId} = ${id} then ${schoolSettings.currentExamTermId} end`,
        updatedBy: ctx.user.id,
      })
      .where(eq(schoolSettings.id, 1));
  });
}
