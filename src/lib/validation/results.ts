/** Validation for marks entry, review and class results (Modules 3–4). */
import { z } from "zod";
import { idSchema } from "./common";

/** `monthly` = the Monthly Test; `term` = the term components (sheets) or the full term result (results). */
const stageSchema = z.enum(["monthly", "term"], { message: "Unknown result stage" });

export const sheetKeySchema = z.object({ examTermId: idSchema, sectionId: idSchema, classSubjectId: idSchema, stage: stageSchema });

/**
 * One cell of the marks grid. Blank = not entered (missing); "A" = absent (counts as 0); "N" = new
 * admission (joined after this test: left out of the student's result); "X" = does not take this subject
 * (left out of the student's result and card); "0" is a real score.
 */
const markCellSchema = z.object({
  enrollmentId: idSchema,
  assessmentId: idSchema,
  value: z.string().trim().max(12, "Too long"),
});

export const saveMarksSchema = sheetKeySchema.extend({
  marks: z.array(markCellSchema).max(5000, "Too many marks in one save"),
});

const reasonSchema = z
  .string()
  .trim()
  .min(5, "Please give a reason (at least 5 characters)")
  .max(500, "Use at most 500 characters");

export const returnSheetSchema = z.object({ sheetId: idSchema, reason: reasonSchema });

/** A subject teacher asks for a submitted/approved sheet back. */
export const correctionRequestSchema = z.object({ sheetId: idSchema, reason: reasonSchema });

/** The class teacher or principal accepts (sheet returned) or declines (with a note) a correction request. */
export const resolveCorrectionSchema = z
  .object({ requestId: idSchema, accept: z.boolean(), note: z.string().trim().max(500, "Use at most 500 characters").optional() })
  .refine((v) => v.accept || (v.note?.length ?? 0) >= 5, { message: "Please say why (at least 5 characters)", path: ["note"] });

export const resultKeySchema = z.object({ examTermId: idSchema, sectionId: idSchema, stage: stageSchema });
export const reopenResultSchema = resultKeySchema.extend({ reason: reasonSchema });

export const remarksSchema = z.object({
  examTermId: idSchema,
  stage: stageSchema,
  enrollmentId: idSchema,
  remarks: z.string().trim().max(500, "Use at most 500 characters"),
});

/** Plain decimal with up to 2 places, e.g. "0", "18", "22.5". */
export const MARK_PATTERN = /^\d{1,4}(\.\d{1,2})?$/;

/** What a teacher types for a student who was absent (either case). */
export const ABSENT = "A";
export const isAbsentInput = (value: string) => value.trim().toUpperCase() === ABSENT;

/** What a teacher types for a student who joined the class after this test (either case). */
export const NEW_ADMISSION = "N";
export const isNewAdmissionInput = (value: string) => value.trim().toUpperCase() === NEW_ADMISSION;

/** What a teacher types for a student who does not study this subject, e.g. Computer in the science group (either case). */
export const NOT_TAKEN = "X";
export const isNotTakenInput = (value: string) => value.trim().toUpperCase() === NOT_TAKEN;
