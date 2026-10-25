import type { z } from "zod";
import { AppError, type FieldErrors } from "@/server/errors";

/** Parse untrusted input or throw an AppError carrying per-field messages for the form. */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fieldErrors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  const first = result.error.issues[0]?.message ?? "Please check the form.";
  throw new AppError("VALIDATION", result.error.issues.length > 1 ? "Please correct the highlighted fields." : first, fieldErrors);
}
