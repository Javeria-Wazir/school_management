/**
 * Errors that are safe to show to users. Anything else (SQL text, connection details, stack traces)
 * is logged on the server and replaced by a generic message.
 */
import type { FieldErrors } from "@/lib/action-result";

export type { FieldErrors };

export type AppErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "RULE";

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const forbidden = (message = "You do not have permission to do this.") => new AppError("FORBIDDEN", message);
export const notFound = (what = "Record") => new AppError("NOT_FOUND", `${what} not found.`);

/** Friendly messages for unique constraints, keyed by constraint/index name. */
const UNIQUE_MESSAGES: Record<string, string> = {
  users_email_unique: "A staff account with this e-mail already exists.",
  academic_years_name_unique: "An academic year with this name already exists.",
  classes_name_unique: "A class with this name already exists.",
  sections_class_year_name_unique: "This class already has a section with this name in this academic year.",
  subjects_name_unique: "A subject with this name already exists.",
  subjects_code_unique: "A subject with this code already exists.",
  class_subjects_unique: "This subject is already part of the class for this academic year.",
  students_code_unique: "A student with this ID already exists.",
  enrollments_roll_unique: "This roll number is already used in this class.",
  enrollments_student_year_unique: "This student is already enrolled in this academic year.",
  grading_scales_name_unique: "A grading scale with this name already exists.",
  grade_boundaries_grade_unique: "Grade names must be unique.",
  grade_boundaries_min_unique: "Each grade needs a different minimum percentage.",
  exam_terms_year_name_unique: "This academic year already has an exam term with this name.",
  assessment_types_code_unique: "An assessment type with this code already exists.",
  teacher_assignments_unique: "This subject already has a teacher in this section.",
  correction_requests_one_open: "A correction request is already open for this mark sheet.",
};

interface PgLikeError {
  code?: string;
  message?: string;
  constraint?: string;
  constraint_name?: string;
}

function findPgError(error: unknown): PgLikeError | null {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    const candidate = current as PgLikeError & { cause?: unknown };
    if (typeof candidate.code === "string" && /^[0-9A-Z]{5}$/.test(candidate.code)) return candidate;
    current = candidate.cause;
  }
  return null;
}

/** Convert any thrown value into an AppError, or `null` if it is unexpected (and must be logged). */
export function toAppError(error: unknown): AppError | null {
  if (error instanceof AppError) return error;
  const pg = findPgError(error);
  if (!pg) return null;
  const constraint = pg.constraint ?? pg.constraint_name ?? "";
  switch (pg.code) {
    case "P0001": // RAISE EXCEPTION in our triggers: the text is written for users
      return new AppError("RULE", pg.message ?? "This change is not allowed.");
    case "23505":
      return new AppError("CONFLICT", UNIQUE_MESSAGES[constraint] ?? "This record already exists.");
    case "23503":
      return new AppError("CONFLICT", "This record is still in use by other records, so it cannot be removed or changed this way.");
    case "23514":
    case "22P02":
    case "22003":
      return new AppError("VALIDATION", "One of the values is not allowed. Please check the form.");
    case "40001":
    case "40P01":
      return new AppError("CONFLICT", "Someone else changed this at the same time. Please try again.");
    default:
      return null;
  }
}
