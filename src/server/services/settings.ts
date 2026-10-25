/** School information and report/marks options (single row). Reading is open to every signed-in user. */
import { eq } from "drizzle-orm";
import { LOGO_MAX_BYTES, schoolSettingsSchema } from "@/lib/validation/settings";
import type { Db } from "@/server/db/client";
import { withActor } from "@/server/db/actor";
import { academicYears, examTerms, schoolSettings } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { assertAdmin, type ServiceContext } from "./guards";
import { parseInput } from "./validate";

export type SchoolSettings = Omit<typeof schoolSettings.$inferSelect, "logoBase64" | "logoMime" | "id"> & {
  hasLogo: boolean;
  currentAcademicYearName: string | null;
  currentExamTermName: string | null;
};

export async function getSchoolSettings(db: Db): Promise<SchoolSettings> {
  const [row] = await db
    .select({ settings: schoolSettings, yearName: academicYears.name, termName: examTerms.name })
    .from(schoolSettings)
    .leftJoin(academicYears, eq(academicYears.id, schoolSettings.currentAcademicYearId))
    .leftJoin(examTerms, eq(examTerms.id, schoolSettings.currentExamTermId))
    .where(eq(schoolSettings.id, 1))
    .limit(1);
  if (!row) throw new Error("school_settings row is missing — run the database migrations.");
  const rest: Partial<typeof row.settings> = { ...row.settings };
  delete rest.logoBase64;
  delete rest.logoMime;
  delete rest.id;
  return {
    ...(rest as Omit<typeof row.settings, "logoBase64" | "logoMime" | "id">),
    hasLogo: row.settings.logoBase64 !== null,
    currentAcademicYearName: row.yearName,
    currentExamTermName: row.termName,
  };
}

export async function getSchoolLogo(db: Db): Promise<{ data: Buffer; mime: string } | null> {
  const [row] = await db
    .select({ logoBase64: schoolSettings.logoBase64, logoMime: schoolSettings.logoMime })
    .from(schoolSettings)
    .where(eq(schoolSettings.id, 1));
  if (!row?.logoBase64 || !row.logoMime) return null;
  return { data: Buffer.from(row.logoBase64, "base64"), mime: row.logoMime };
}

export async function updateSchoolSettings(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const data = parseInput(schoolSettingsSchema, input);
  await withActor(ctx.db, ctx.user.id, (tx) =>
    tx
      .update(schoolSettings)
      .set({ ...data, phone: data.phone ?? null, email: data.email ?? null, updatedBy: ctx.user.id })
      .where(eq(schoolSettings.id, 1)),
  );
}

/** Detect the real file type from its first bytes; the browser-supplied type is not trusted. */
export function sniffImageType(bytes: Uint8Array): "image/png" | "image/jpeg" | null {
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}

export async function updateSchoolLogo(ctx: ServiceContext, file: { bytes: Uint8Array } | null): Promise<void> {
  assertAdmin(ctx.user);
  let logoBase64: string | null = null;
  let logoMime: string | null = null;
  if (file) {
    if (file.bytes.length === 0) throw new AppError("VALIDATION", "Choose a PNG or JPEG image.");
    if (file.bytes.length > LOGO_MAX_BYTES) throw new AppError("VALIDATION", "The logo must be 500 KB or smaller.");
    logoMime = sniffImageType(file.bytes);
    if (!logoMime) throw new AppError("VALIDATION", "The logo must be a PNG or JPEG image.");
    logoBase64 = Buffer.from(file.bytes).toString("base64");
  }
  await withActor(
    ctx.db,
    ctx.user.id,
    (tx) => tx.update(schoolSettings).set({ logoBase64, logoMime, updatedBy: ctx.user.id }).where(eq(schoolSettings.id, 1)),
    file ? "Logo uploaded" : "Logo removed",
  );
}
