/**
 * Grading scales: pass percentages and grade bands. A scale used by an approved result is frozen by
 * the database (reopen the result or create a new scale for future terms).
 */
import { asc, eq, sql } from "drizzle-orm";
import { makeGradingRules } from "@/lib/domain/calculations";
import { idSchema } from "@/lib/validation/common";
import { gradingScaleSchema } from "@/lib/validation/academics";
import type { Db } from "@/server/db/client";
import { withActor } from "@/server/db/actor";
import { gradeBoundaries, gradingScales } from "@/server/db/schema";
import { AppError, notFound } from "@/server/errors";
import { assertAdmin, type ServiceContext } from "./guards";
import { parseInput } from "./validate";

export interface GradingScaleView {
  id: string;
  name: string;
  subjectPassPercentage: string;
  overallPassPercentage: string;
  requireAllCompulsoryPass: boolean;
  isDefault: boolean;
  termCount: number;
  locked: boolean;
  bands: { grade: string; minPercentage: string; remark: string }[];
}

export async function listGradingScales(db: Db): Promise<GradingScaleView[]> {
  const scales = await db
    .select({
      id: gradingScales.id,
      name: gradingScales.name,
      subjectPassPercentage: gradingScales.subjectPassPercentage,
      overallPassPercentage: gradingScales.overallPassPercentage,
      requireAllCompulsoryPass: gradingScales.requireAllCompulsoryPass,
      isDefault: gradingScales.isDefault,
      termCount: sql<number>`(select count(*)::int from exam_terms t where t.grading_scale_id = "grading_scales"."id")`,
      locked: sql<boolean>`app_private.scale_locked(${gradingScales.id})`,
    })
    .from(gradingScales)
    .orderBy(sql`${gradingScales.isDefault} desc`, asc(gradingScales.name));
  const bands = await db
    .select({ scaleId: gradeBoundaries.gradingScaleId, grade: gradeBoundaries.grade, minPercentage: gradeBoundaries.minPercentage, remark: gradeBoundaries.remark })
    .from(gradeBoundaries)
    .orderBy(sql`${gradeBoundaries.minPercentage} desc`);
  return scales.map((s) => ({ ...s, bands: bands.filter((b) => b.scaleId === s.id).map((b) => ({ grade: b.grade, minPercentage: b.minPercentage, remark: b.remark })) }));
}

/** Create (no id) or replace a scale and its grade bands in one transaction. */
export async function saveGradingScale(ctx: ServiceContext, input: unknown): Promise<{ id: string }> {
  assertAdmin(ctx.user);
  const data = parseInput(gradingScaleSchema, input);
  try {
    // Same rules the result calculations use: unique grades and thresholds, one band starting at 0%.
    makeGradingRules({ bands: data.bands, subjectPass: data.subjectPassPercentage, overallPass: data.overallPassPercentage });
  } catch (error) {
    throw new AppError("VALIDATION", (error as Error).message, { bands: [(error as Error).message] });
  }
  return withActor(ctx.db, ctx.user.id, async (tx) => {
    const values = {
      name: data.name,
      subjectPassPercentage: data.subjectPassPercentage,
      overallPassPercentage: data.overallPassPercentage,
      requireAllCompulsoryPass: data.requireAllCompulsoryPass,
    };
    let id = data.id;
    if (id) {
      const updated = await tx.update(gradingScales).set(values).where(eq(gradingScales.id, id)).returning({ id: gradingScales.id });
      if (updated.length === 0) throw notFound("Grading scale");
      await tx.delete(gradeBoundaries).where(eq(gradeBoundaries.gradingScaleId, id));
    } else {
      const [{ hasDefault }] = await tx.select({ hasDefault: sql<boolean>`exists (select 1 from ${gradingScales} where ${gradingScales.isDefault})` }).from(sql`(select 1) as one`);
      const [created] = await tx
        .insert(gradingScales)
        .values({ ...values, isDefault: !hasDefault })
        .returning({ id: gradingScales.id });
      id = created.id;
    }
    await tx.insert(gradeBoundaries).values(data.bands.map((b) => ({ gradingScaleId: id!, grade: b.grade, minPercentage: b.minPercentage, remark: b.remark })));
    return { id: id! };
  });
}

/** The default scale applies to every term that does not name its own scale. */
export async function setDefaultGradingScale(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const id = parseInput(idSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const [scale] = await tx.select({ isDefault: gradingScales.isDefault }).from(gradingScales).where(eq(gradingScales.id, id));
    if (!scale) throw notFound("Grading scale");
    if (scale.isDefault) return;
    await tx.update(gradingScales).set({ isDefault: false }).where(eq(gradingScales.isDefault, true));
    await tx.update(gradingScales).set({ isDefault: true }).where(eq(gradingScales.id, id));
  });
}

export async function deleteGradingScale(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const id = parseInput(idSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const [scale] = await tx.select({ isDefault: gradingScales.isDefault }).from(gradingScales).where(eq(gradingScales.id, id));
    if (!scale) throw notFound("Grading scale");
    if (scale.isDefault) throw new AppError("RULE", "The default scale cannot be deleted. Make another scale the default first.");
    await tx.delete(gradingScales).where(eq(gradingScales.id, id));
  });
}
