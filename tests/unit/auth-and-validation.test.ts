import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/safe-redirect";
import { changePasswordSchema, newPasswordSchema, optionalPhoneSchema, staffEmailSchema } from "@/lib/validation/auth";
import { academicYearSchema, schoolSettingsSchema } from "@/lib/validation/settings";
import { generateTemporaryPassword, hashPassword, verifyPassword } from "@/server/auth/password";
import { hashToken } from "@/server/auth/session";
import { AppError, toAppError } from "@/server/errors";

describe("password hashing", () => {
  it("verifies the right password and rejects others", async () => {
    const hash = await hashPassword("Correct horse 9");
    expect(hash).toMatch(/^scrypt\$32768\$8\$3\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    expect(await verifyPassword("Correct horse 9", hash)).toBe(true);
    expect(await verifyPassword("correct horse 9", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("uses a fresh salt every time", async () => {
    expect(await hashPassword("same-Passw0rd")).not.toBe(await hashPassword("same-Passw0rd"));
  });

  it("rejects malformed or weakened stored hashes instead of throwing", async () => {
    expect(await verifyPassword("x", "plain-text")).toBe(false);
    expect(await verifyPassword("x", "scrypt$1024$8$1$AAAA$AAAA")).toBe(false); // N too small
    expect(await verifyPassword("x", "bcrypt$a$b$c$d$e")).toBe(false);
  });

  it("generates strong temporary passwords", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const p = generateTemporaryPassword();
      expect(p).toMatch(/^[A-HJ-NP-Za-km-z2-9]{12}$/); // no 0/O/1/l/I look-alikes
      expect(newPasswordSchema.safeParse(p).success).toBe(true);
      seen.add(p);
    }
    expect(seen.size).toBe(200);
  });

  it("hashes session tokens with SHA-256", () => {
    expect(hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("validation", () => {
  it("normalises e-mails and phone numbers", () => {
    expect(staffEmailSchema.parse("  Teacher@School.EDU ")).toBe("teacher@school.edu");
    expect(optionalPhoneSchema.parse("+92 (300) 123-4567")).toBe("+923001234567");
    expect(optionalPhoneSchema.parse("")).toBeUndefined();
    expect(optionalPhoneSchema.safeParse("03001234567").success).toBe(false);
  });

  it("enforces the password policy", () => {
    expect(newPasswordSchema.safeParse("short1").success).toBe(false);
    expect(newPasswordSchema.safeParse("lettersonly").success).toBe(false);
    expect(newPasswordSchema.safeParse("12345678").success).toBe(false);
    expect(newPasswordSchema.safeParse("letters123").success).toBe(true);
    const same = changePasswordSchema.safeParse({ currentPassword: "abc12345", newPassword: "abc12345", confirmPassword: "abc12345" });
    expect(same.success).toBe(false);
  });

  it("validates academic years", () => {
    expect(academicYearSchema.safeParse({ name: "2026-2027", startDate: "2026-04-01", endDate: "2027-03-31" }).success).toBe(true);
    expect(academicYearSchema.safeParse({ name: "2026-2028", startDate: "2026-04-01", endDate: "2027-03-31" }).success).toBe(false);
    expect(academicYearSchema.safeParse({ name: "2026-2027", startDate: "2026-04-01", endDate: "2026-04-01" }).success).toBe(false);
    expect(academicYearSchema.safeParse({ name: "2026-2027", startDate: "2026-02-30", endDate: "2027-03-31" }).success).toBe(false);
  });

  it("reads switches as booleans and decimal places as numbers", () => {
    const parsed = schoolSettingsSchema.parse({
      schoolName: "ABC School",
      reportCardTitle: "Result Card",
      decimalPlaces: "1",
      defaultCountryCode: "+92",
      showSubjectGrades: "on",
    });
    expect(parsed).toMatchObject({ showSubjectGrades: true, showSubjectStatus: false, decimalPlaces: 1, defaultCountryCode: "92", address: "" });
  });
});

describe("post-login redirect", () => {
  it("allows only same-site paths", () => {
    expect(safeNextPath("/admin/staff")).toBe("/admin/staff");
    expect(safeNextPath("/dashboard?x=1")).toBe("/dashboard?x=1");
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "/login", "", undefined, "/a\nb"]) {
      expect(safeNextPath(bad)).toBe("/dashboard");
    }
  });
});

describe("error mapping", () => {
  it("shows rule violations from triggers and hides everything else", () => {
    expect(toAppError(Object.assign(new Error("wrapped"), { cause: { code: "P0001", message: "At least one active administrator is required" } }))?.message).toBe(
      "At least one active administrator is required",
    );
    expect(toAppError({ code: "23505", constraint: "users_email_unique", message: "duplicate key ... (email)=(x)" })?.message).toBe(
      "A staff account with this e-mail already exists.",
    );
    expect(toAppError({ code: "23503", message: "fk" })?.code).toBe("CONFLICT");
    expect(toAppError(new Error("connect ECONNREFUSED 10.0.0.1:5432"))).toBeNull();
    const app = new AppError("FORBIDDEN", "No");
    expect(toAppError(app)).toBe(app);
  });
});
