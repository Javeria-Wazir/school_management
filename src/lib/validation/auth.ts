import { z } from "zod";

export const staffEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "E-mail is too long")
  .pipe(z.email("Enter a valid e-mail address"));

export const staffNameSchema = z.string().trim().min(1, "Enter the full name").max(120, "Name is too long (max 120 characters)");

/** International format, e.g. +923001234567 — needed for WhatsApp links. */
const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .pipe(z.string().regex(/^\+[1-9][0-9]{7,14}$/, "Use international format, e.g. +923001234567"));

export const optionalPhoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(phoneSchema.optional());

export const newPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Use at most 128 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one digit");

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Enter your e-mail").max(254),
  password: z.string().min(1, "Enter your password").max(128),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(128),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ["confirmPassword"], message: "The passwords do not match" })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ["newPassword"], message: "Choose a password you have not used just now" });
