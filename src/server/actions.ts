import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { toAppError } from "@/server/errors";

/** Server-side log line for an unexpected error, without query parameters (they may hold personal data). */
function describeForLog(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current instanceof Error; depth += 1) {
    const code = (current as Error & { code?: string }).code;
    const message = current.message.split("\nparams:")[0];
    parts.push(`${current.name}${code ? ` [${code}]` : ""}: ${message}`);
    current = (current as Error & { cause?: unknown }).cause;
  }
  return parts.join(" <- ") || String(error);
}

/**
 * Run a Server Action body and turn errors into a result the form can show. Redirects and other
 * Next.js control-flow errors pass through. Unexpected errors are logged and replaced by a generic message.
 */
export async function runAction<T = undefined>(fn: () => Promise<{ message?: string; data?: T } | void>): Promise<ActionResult<T>> {
  try {
    const result = await fn();
    return { ok: true, ...(result ?? {}) };
  } catch (error) {
    unstable_rethrow(error);
    const appError = toAppError(error);
    if (appError) return { ok: false, message: appError.message, fieldErrors: appError.fieldErrors };
    console.error("Unexpected server error:", describeForLog(error));
    return { ok: false, message: "Something went wrong. Please try again, or contact the administrator if it keeps happening." };
  }
}

/** FormData → plain object of its text fields (files are read separately). */
export function formFields(formData: FormData): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) fields[key] = value;
  }
  return fields;
}
