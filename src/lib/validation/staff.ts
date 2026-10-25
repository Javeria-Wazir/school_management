import { z } from "zod";
import { optionalPhoneSchema, staffEmailSchema, staffNameSchema } from "./auth";

export const roleSchema = z.enum(["admin", "teacher"], { message: "Choose a role" });

export const ROLE_LABELS = {
  admin: "Principal / Administrator",
  teacher: "Teacher",
} as const;

export const createStaffSchema = z.object({
  email: staffEmailSchema,
  fullName: staffNameSchema,
  phone: optionalPhoneSchema,
  role: roleSchema,
});

export const updateStaffSchema = z.object({
  id: z.uuid("Unknown staff member"),
  /** Optional: when given, the sign-in e-mail changes too. */
  email: staffEmailSchema.optional(),
  fullName: staffNameSchema,
  phone: optionalPhoneSchema,
  role: roleSchema,
});

export const staffIdSchema = z.object({ id: z.uuid("Unknown staff member") });

export const setStaffActiveSchema = z.object({
  id: z.uuid("Unknown staff member"),
  active: z.boolean(),
});
