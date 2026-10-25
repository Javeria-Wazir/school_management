import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verifyPassword } from "@/server/auth/password";
import { validateSessionToken } from "@/server/auth/session";
import * as schema from "@/server/db/schema";
import {
  createAcademicYear,
  deleteAcademicYear,
  listAcademicYears,
  setCurrentAcademicYear,
  updateAcademicYear,
} from "@/server/services/academic-years";
import { getSchoolSettings, sniffImageType, updateSchoolLogo, updateSchoolSettings } from "@/server/services/settings";
import { createStaff, listStaff, resetStaffPassword, setStaffActive, updateStaff } from "@/server/services/staff";
import { addUser, createTestDb, rejectsWith, type TestDb } from "./helpers";

let t: TestDb;
let admin: Awaited<ReturnType<typeof addUser>>;
let teacher: Awaited<ReturnType<typeof addUser>>;

beforeAll(async () => {
  t = await createTestDb();
  admin = await addUser(t.db, { role: "admin", email: "principal@school.test" });
  teacher = await addUser(t.db, { role: "teacher", email: "teacher@school.test" });
});
afterAll(() => t.close());

const validSettings = {
  schoolName: "Govt. Model High School",
  address: "Main Road",
  phone: "+92 300 1234567",
  email: "office@school.test",
  reportCardTitle: "Result Card",
  reportCardFooter: "",
  showSubjectGrades: "on",
  showSubjectStatus: "on",
  decimalPlaces: "2",
  requirePrincipalApproval: "on",
  defaultCountryCode: "+92",
};

describe("only the principal/administrator manages school-wide data", () => {
  it("refuses every admin operation for a teacher", async () => {
    const forbidden = /Only the principal or an administrator/;
    await rejectsWith(listStaff(teacher), forbidden);
    await rejectsWith(createStaff(teacher, { email: "x@school.test", fullName: "X", role: "admin" }), forbidden);
    await rejectsWith(updateStaff(teacher, { id: teacher.user.id, fullName: "Me", role: "admin" }), forbidden);
    await rejectsWith(setStaffActive(teacher, { id: admin.user.id, active: false }), forbidden);
    await rejectsWith(resetStaffPassword(teacher, { id: admin.user.id }), forbidden);
    await rejectsWith(updateSchoolSettings(teacher, validSettings), forbidden);
    await rejectsWith(updateSchoolLogo(teacher, null), forbidden);
    await rejectsWith(createAcademicYear(teacher, { name: "2030-2031", startDate: "2030-04-01", endDate: "2031-03-31" }), forbidden);
    await rejectsWith(setCurrentAcademicYear(teacher, admin.user.id), forbidden);
  });
});

describe("staff accounts", () => {
  it("creates an account with a one-time temporary password that must be changed", async () => {
    const { id, temporaryPassword } = await createStaff(admin, {
      email: " New.Teacher@School.test ",
      fullName: "New Teacher",
      phone: "+92 (300) 765-4321",
      role: "teacher",
    });
    expect(temporaryPassword).toMatch(/^[A-Za-z0-9]{12}$/);
    const [row] = await t.db.select().from(schema.users).where(eq(schema.users.id, id));
    expect(row.email).toBe("new.teacher@school.test");
    expect(row.phone).toBe("+923007654321");
    expect(row.mustChangePassword).toBe(true);
    expect(await verifyPassword(temporaryPassword, row.passwordHash)).toBe(true);

    const [audit] = await t.db
      .select()
      .from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.tableName, "users"), eq(schema.auditLogs.recordId, id), eq(schema.auditLogs.action, "INSERT")));
    expect(audit.actorId).toBe(admin.user.id);
  });

  it("shows field messages for invalid input and a friendly message for duplicates", async () => {
    await rejectsWith(createStaff(admin, { email: "not-an-email", fullName: "", role: "boss" }), /correct the highlighted fields/);
    await rejectsWith(createStaff(admin, { email: "TEACHER@school.test", fullName: "Copy", role: "teacher" }), /already exists/);
    await rejectsWith(createStaff(admin, { email: "p@school.test", fullName: "P", phone: "03001234567", role: "teacher" }), /international format/);
  });

  it("lists staff with their assignment counts", async () => {
    const rows = await listStaff(admin);
    expect(rows.find((r) => r.id === teacher.user.id)).toMatchObject({ classTeacherOf: 0, subjectAssignments: 0, role: "teacher" });
  });

  it("signs a user out when their role changes or they are deactivated", async () => {
    const u = await addUser(t.db);
    await updateStaff(admin, { id: u.user.id, fullName: "Promoted", role: "admin" });
    expect(await validateSessionToken(t.db, u.token)).toBeNull();

    const v = await addUser(t.db);
    await setStaffActive(admin, { id: v.user.id, active: false });
    expect(await validateSessionToken(t.db, v.token)).toBeNull();
    await setStaffActive(admin, { id: v.user.id, active: true });
  });

  it("does not let administrators demote or deactivate themselves", async () => {
    await rejectsWith(updateStaff(admin, { id: admin.user.id, fullName: "Principal", role: "teacher" }), /cannot change your own role/);
    await rejectsWith(setStaffActive(admin, { id: admin.user.id, active: false }), /cannot deactivate your own account/);
    await rejectsWith(resetStaffPassword(admin, { id: admin.user.id }), /Change password/);
  });

  it("resets a password, forcing a change and signing the user out", async () => {
    const u = await addUser(t.db);
    const { temporaryPassword } = await resetStaffPassword(admin, { id: u.user.id });
    const [row] = await t.db.select().from(schema.users).where(eq(schema.users.id, u.user.id));
    expect(row.mustChangePassword).toBe(true);
    expect(await verifyPassword(temporaryPassword, row.passwordHash)).toBe(true);
    expect(await validateSessionToken(t.db, u.token)).toBeNull();
  });

  it("reports unknown ids as not found", async () => {
    await rejectsWith(setStaffActive(admin, { id: "00000000-0000-4000-8000-000000000000", active: false }), /not found/);
  });
});

describe("school settings", () => {
  it("saves normalised values", async () => {
    await updateSchoolSettings(admin, validSettings);
    const settings = await getSchoolSettings(t.db);
    expect(settings).toMatchObject({
      schoolName: "Govt. Model High School",
      phone: "+923001234567",
      showSubjectGrades: true,
      showClassPosition: false,
      allowDecimalMarks: false,
      decimalPlaces: 2,
      defaultCountryCode: "92",
    });
  });

  it("validates ranges", async () => {
    await rejectsWith(updateSchoolSettings(admin, { ...validSettings, decimalPlaces: "3" }), /0, 1 or 2/);
    await rejectsWith(updateSchoolSettings(admin, { ...validSettings, schoolName: "" }), /school name/);
  });

  it("accepts only real PNG/JPEG logos up to 500 KB", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(sniffImageType(png)).toBe("image/png");
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();

    await updateSchoolLogo(admin, { bytes: png });
    expect((await getSchoolSettings(t.db)).hasLogo).toBe(true);
    await rejectsWith(updateSchoolLogo(admin, { bytes: new TextEncoder().encode("<svg/>") }), /PNG or JPEG/);
    await rejectsWith(updateSchoolLogo(admin, { bytes: new Uint8Array(600 * 1024).fill(0xff) }), /500 KB/);
    await updateSchoolLogo(admin, null);
    expect((await getSchoolSettings(t.db)).hasLogo).toBe(false);
  });
});

describe("academic years", () => {
  it("creates years, makes the first one current and validates names and dates", async () => {
    const first = await createAcademicYear(admin, { name: "2026-2027", startDate: "2026-04-01", endDate: "2027-03-31" });
    const second = await createAcademicYear(admin, { name: "2027-2028", startDate: "2027-04-01", endDate: "2028-03-31" });
    let years = await listAcademicYears(t.db);
    expect(years.find((y) => y.id === first.id)?.isCurrent).toBe(true);
    expect(years.find((y) => y.id === second.id)?.isCurrent).toBe(false);

    await setCurrentAcademicYear(admin, second.id);
    years = await listAcademicYears(t.db);
    expect(years.filter((y) => y.isCurrent).map((y) => y.id)).toEqual([second.id]);
    expect((await getSchoolSettings(t.db)).currentAcademicYearName).toBe("2027-2028");

    await rejectsWith(createAcademicYear(admin, { name: "2026-2027", startDate: "2026-04-01", endDate: "2027-03-31" }), /already exists/);
    await rejectsWith(createAcademicYear(admin, { name: "2026-2028", startDate: "2026-04-01", endDate: "2027-03-31" }), /second year must follow/);
    await rejectsWith(createAcademicYear(admin, { name: "2029-2030", startDate: "2030-04-01", endDate: "2029-03-31" }), /after the start date/);
    await updateAcademicYear(admin, { id: first.id, name: "2026-2027", startDate: "2026-03-01", endDate: "2027-02-28" });
  });

  it("deletes only unused years", async () => {
    const unused = await createAcademicYear(admin, { name: "2035-2036", startDate: "2035-04-01", endDate: "2036-03-31" });
    await deleteAcademicYear(admin, unused.id);

    const used = await createAcademicYear(admin, { name: "2036-2037", startDate: "2036-04-01", endDate: "2037-03-31" });
    await t.db.insert(schema.examTerms).values({ academicYearId: used.id, name: "First Term" });
    await rejectsWith(deleteAcademicYear(admin, used.id), /cannot be deleted/);
  });
});
