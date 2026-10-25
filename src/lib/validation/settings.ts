import { z } from "zod";
import { optionalPhoneSchema } from "./auth";
import { checkboxSchema, idSchema, isoDateSchema, optionalEmailSchema } from "./common";

export const schoolSettingsSchema = z.object({
  schoolName: z.string().trim().min(2, "Enter the school name").max(150, "Use at most 150 characters"),
  address: z.string().trim().max(300, "Use at most 300 characters").default(""),
  phone: optionalPhoneSchema,
  email: optionalEmailSchema,
  reportCardTitle: z.string().trim().min(1, "Enter a title").max(80, "Use at most 80 characters"),
  reportCardFooter: z.string().trim().max(300, "Use at most 300 characters").default(""),
  showSubjectGrades: checkboxSchema,
  showSubjectStatus: checkboxSchema,
  showClassPosition: checkboxSchema,
  allowDecimalMarks: checkboxSchema,
  decimalPlaces: z.coerce.number().int().min(0, "Choose 0, 1 or 2").max(2, "Choose 0, 1 or 2"),
  requirePrincipalApproval: checkboxSchema,
  defaultCountryCode: z
    .string()
    .trim()
    .transform((v) => v.replace(/^\+/, ""))
    .pipe(z.string().regex(/^[1-9][0-9]{0,3}$/, "Enter a country calling code, e.g. 92")),
});

export const LOGO_MAX_BYTES = 500 * 1024;
export const LOGO_TYPES = ["image/png", "image/jpeg"] as const;

/** e.g. "2026-2027": consecutive years. */
export const academicYearNameSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{4}-[0-9]{4}$/, "Use the format 2026-2027")
  .refine((v) => Number(v.slice(5)) === Number(v.slice(0, 4)) + 1, "The second year must follow the first, e.g. 2026-2027");

export const academicYearSchema = z
  .object({
    name: academicYearNameSchema,
    startDate: isoDateSchema,
    endDate: isoDateSchema,
  })
  .refine((v) => v.endDate > v.startDate, { path: ["endDate"], message: "The end date must be after the start date" });

export const updateAcademicYearSchema = academicYearSchema.and(z.object({ id: idSchema }));
