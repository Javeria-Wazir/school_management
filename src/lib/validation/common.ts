import { z } from "zod";

/** HTML checkboxes/switches send "on" when checked and nothing when not. */
export const checkboxSchema = z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean());

/** Empty form fields become `undefined` so optional schemas treat them as "not given". */
export const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const isoDateSchema = z.iso.date({ message: "Enter a valid date" });

export const optionalEmailSchema = z.preprocess(
  emptyToUndefined,
  z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid e-mail address")).optional(),
);

export const idSchema = z.uuid("Unknown record");
