/** Validation for marks entry, review and class results (Modules 3–4). */
import { z } from "zod";
import { idSchema } from "./common";

export const sheetKeySchema = z.object({ examTermId: idSchema, sectionId: idSchema, classSubjectId: idSchema });

/** One cell of the marks grid. A blank value means "not entered" (missing); "0" is a real score. */
export const markCellSchema = z.object({
  enrollmentId: idSchema,
  assessmentId: idSchema,
  value: z.string().trim().max(12, "Too long"),
});

export const saveMarksSchema = sheetKeySchema.extend({
  marks: z.array(markCellSchema).max(5000, "Too many marks in one save"),
});

export const reasonSchema = z
  .string()
  .trim()
  .min(5, "Please give a reason (at least 5 characters)")
  .max(500, "Use at most 500 characters");

export const returnSheetSchema = z.object({ sheetId: idSchema, reason: reasonSchema });

export const resultKeySchema = z.object({ examTermId: idSchema, sectionId: idSchema });
export const reopenResultSchema = resultKeySchema.extend({ reason: reasonSchema });

export const remarksSchema = z.object({
  examTermId: idSchema,
  enrollmentId: idSchema,
  remarks: z.string().trim().max(500, "Use at most 500 characters"),
});

/** Plain decimal with up to 2 places, e.g. "0", "18", "22.5". */
export const MARK_PATTERN = /^\d{1,4}(\.\d{1,2})?$/;
