/** Validation for Module 2: academic structure, students, terms, assessments and grading. */
import { z } from "zod";
import { checkboxSchema, emptyToUndefined, idSchema, isoDateSchema } from "./common";

const sortOrderSchema = z.coerce.number({ message: "Enter a whole number" }).int("Enter a whole number").min(0, "Use 0 or more").max(9999, "Use at most 9999").default(0);
const optionalIdSchema = z.preprocess(emptyToUndefined, idSchema.optional());
const optionalDateSchema = z.preprocess(emptyToUndefined, isoDateSchema.optional());

// -- classes, sections, subjects ------------------------------------------------------------------

export const classSchema = z.object({
  name: z.string().trim().min(1, "Enter the class name").max(50, "Use at most 50 characters"),
  sortOrder: sortOrderSchema,
});
export const updateClassSchema = classSchema.extend({ id: idSchema, isActive: checkboxSchema });

export const sectionSchema = z.object({
  classId: idSchema,
  academicYearId: idSchema,
  name: z.string().trim().min(1, "Enter the section name").max(20, "Use at most 20 characters"),
  classTeacherId: optionalIdSchema,
});
export const updateSectionSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1, "Enter the section name").max(20, "Use at most 20 characters"),
  classTeacherId: optionalIdSchema,
  isActive: checkboxSchema,
});

const subjectCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{1,12}$/, "Use 1–12 capital letters, digits, - or _ (e.g. ENG, MATH)");

export const subjectSchema = z.object({
  name: z.string().trim().min(1, "Enter the subject name").max(60, "Use at most 60 characters"),
  code: subjectCodeSchema,
  sortOrder: sortOrderSchema,
});
export const updateSubjectSchema = subjectSchema.extend({ id: idSchema, isActive: checkboxSchema });

export const addClassSubjectsSchema = z.object({
  classId: idSchema,
  academicYearId: idSchema,
  subjectIds: z.array(idSchema).min(1, "Choose at least one subject").max(50),
});
export const updateClassSubjectSchema = z.object({
  id: idSchema,
  isCompulsory: checkboxSchema,
  includeInTotal: checkboxSchema,
  sortOrder: sortOrderSchema,
  isActive: checkboxSchema,
});

// -- students and enrolments ----------------------------------------------------------------------

export const studentCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9/_-]{1,30}$/, "Use 1–30 letters, digits, /, - or _ (no spaces)");

export const rollNumberSchema = z.coerce
  .number({ message: "Enter a roll number" })
  .int("Roll number must be a whole number")
  .min(1, "Roll number must be 1 or more")
  .max(99999, "Roll number is too large");

/** Phone numbers are normalised by the service (local 03xx… numbers get the school's country code). */
const studentSchema = z.object({
  studentCode: studentCodeSchema,
  fullName: z.string().trim().min(1, "Enter the student's name").max(120, "Use at most 120 characters"),
  guardianName: z.preprocess(emptyToUndefined, z.string().trim().max(120, "Use at most 120 characters").optional()),
  guardianPhone: z.preprocess(emptyToUndefined, z.string().trim().max(30).optional()),
  dateOfBirth: optionalDateSchema,
});

export const createStudentSchema = studentSchema.extend({
  academicYearId: idSchema,
  sectionId: idSchema,
  rollNumber: rollNumberSchema,
});

export const updateStudentSchema = studentSchema.extend({ id: idSchema });

export const updateEnrollmentSchema = z.object({
  id: idSchema,
  sectionId: idSchema,
  rollNumber: rollNumberSchema,
});

export const studentStatusSchema = z.object({
  id: idSchema,
  status: z.enum(["active", "archived", "transferred", "graduated"], { message: "Choose a status" }),
});

// -- assignments ----------------------------------------------------------------------------------

export const assignmentSchema = z.object({
  sectionId: idSchema,
  classSubjectId: idSchema,
  /** Empty = remove the assignment. */
  teacherId: optionalIdSchema,
});

// -- exam terms and assessments -------------------------------------------------------------------

export const examTermSchema = z
  .object({
    academicYearId: idSchema,
    name: z.string().trim().min(1, "Enter the term name").max(60, "Use at most 60 characters"),
    sortOrder: sortOrderSchema,
    startDate: optionalDateSchema,
    endDate: optionalDateSchema,
    marksDeadline: optionalDateSchema,
    gradingScaleId: optionalIdSchema,
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, { path: ["endDate"], message: "The end date must be on or after the start date" });

export const updateExamTermSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1, "Enter the term name").max(60, "Use at most 60 characters"),
    sortOrder: sortOrderSchema,
    startDate: optionalDateSchema,
    endDate: optionalDateSchema,
    marksDeadline: optionalDateSchema,
    gradingScaleId: optionalIdSchema,
    isActive: checkboxSchema,
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, { path: ["endDate"], message: "The end date must be on or after the start date" });

/** Up to 1000, at most 2 decimal places, as a string for numeric columns. */
const maxMarksSchema = z
  .string()
  .trim()
  .regex(/^\d{1,4}(\.\d{1,2})?$/, "Enter a number such as 25 or 12.5")
  .refine((v) => Number(v) > 0 && Number(v) <= 1000, "Maximum marks must be more than 0 and at most 1000");

export const assessmentTypeSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_]{1,20}$/, "Use 1–20 capital letters, digits or _ (e.g. MONTHLY)"),
  name: z.string().trim().min(1, "Enter the name").max(60, "Use at most 60 characters"),
  defaultMaxMarks: maxMarksSchema,
  sortOrder: sortOrderSchema,
});
export const updateAssessmentTypeSchema = assessmentTypeSchema.omit({ code: true }).extend({ id: idSchema, isActive: checkboxSchema });

export const setMaxMarksSchema = z.object({ assessmentId: idSchema, maxMarks: maxMarksSchema });

// -- grading scales -------------------------------------------------------------------------------

const percentSchema = z
  .string()
  .trim()
  .regex(/^\d{1,3}(\.\d{1,2})?$/, "Enter a percentage such as 33 or 32.5")
  .refine((v) => Number(v) >= 0 && Number(v) <= 100, "Use 0 to 100");

const gradeBandSchema = z.object({
  grade: z.string().trim().min(1, "Enter the grade").max(5, "Use at most 5 characters"),
  minPercentage: z.coerce.string().pipe(percentSchema),
  remark: z.string().trim().max(60, "Use at most 60 characters").default(""),
});

export const gradingScaleSchema = z.object({
  id: optionalIdSchema,
  name: z.string().trim().min(1, "Enter the scale name").max(60, "Use at most 60 characters"),
  subjectPassPercentage: percentSchema,
  overallPassPercentage: percentSchema,
  requireAllCompulsoryPass: checkboxSchema,
  /** Sent from the form as JSON. */
  bands: z.preprocess((v) => {
    if (typeof v !== "string") return v;
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }, z.array(gradeBandSchema, { message: "Add the grades" }).min(1, "Add at least one grade").max(20, "Use at most 20 grades")),
});
