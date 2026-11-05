import ExcelJS from "exceljs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listAuditLog } from "@/server/services/audit";
import { approveMarkSheet, getMarkSheet, openCorrectionsForSection, requestCorrection, resolveCorrection, saveMarks, submitMarkSheet } from "@/server/services/marks";
import { exportClassResult } from "@/server/services/result-export";
import { subjectStatistics } from "@/server/services/result-stats";
import { getClassResult } from "@/server/services/results";
import { addUser, createTestDb, rejectsWith, seedSchool, type TestDb } from "./helpers";

let t: TestDb;
let s: Awaited<ReturnType<typeof seedSchool>>;
let monthlyKey: { examTermId: string; sectionId: string; classSubjectId: string; stage: "monthly" };
const resultKey = () => ({ examTermId: s.term.id, sectionId: s.section.id, stage: "monthly" as const });

beforeAll(async () => {
  t = await createTestDb();
  s = await seedSchool(t.db);
  monthlyKey = { examTermId: s.term.id, sectionId: s.section.id, classSubjectId: s.classSubject.id, stage: "monthly" };
  const [one, two] = s.enrollments;
  await saveMarks(s.subjectTeacher, { ...monthlyKey, marks: [{ enrollmentId: one.id, assessmentId: s.monthly.id, value: "20" }, { enrollmentId: two.id, assessmentId: s.monthly.id, value: "5" }] });
  await submitMarkSheet(s.subjectTeacher, monthlyKey);
  await approveMarkSheet(s.classTeacher, { sheetId: s.monthlySheet.id });
});
afterAll(() => t.close());

describe("correction requests", () => {
  it("lets only the subject teacher ask for an approved sheet back, once at a time", async () => {
    const outsider = await addUser(t.db);
    await rejectsWith(requestCorrection(outsider, { sheetId: s.monthlySheet.id, reason: "Wrong mark for roll 2" }), /Only the subject teacher/);
    expect((await getMarkSheet(s.subjectTeacher, monthlyKey)).canRequestCorrection).toBe(true);
    await requestCorrection(s.subjectTeacher, { sheetId: s.monthlySheet.id, reason: "Roll 2 should have 15, not 5" });
    const view = await getMarkSheet(s.classTeacher, monthlyKey);
    expect(view.correction).toMatchObject({ reason: "Roll 2 should have 15, not 5" });
    expect(view.canRequestCorrection).toBe(false);
    await rejectsWith(requestCorrection(s.subjectTeacher, { sheetId: s.monthlySheet.id, reason: "Another request" }), /already waiting/);
    expect(await openCorrectionsForSection(t.db, s.term.id, s.section.id)).toHaveLength(1);
  });

  it("needs a reason to decline, and returns the sheet when accepted", async () => {
    const [request] = await openCorrectionsForSection(t.db, s.term.id, s.section.id);
    await rejectsWith(resolveCorrection(s.classTeacher, { requestId: request.id, accept: false }), /Please say why/);
    await rejectsWith(resolveCorrection(s.subjectTeacher, { requestId: request.id, accept: true }), /Only the class teacher/);
    expect(await resolveCorrection(s.classTeacher, { requestId: request.id, accept: true })).toEqual({ accepted: true });
    const view = await getMarkSheet(s.subjectTeacher, monthlyKey);
    expect(view).toMatchObject({ status: "returned", correction: null });
    expect(view.returnReason).toContain("Roll 2 should have 15");
    await rejectsWith(resolveCorrection(s.classTeacher, { requestId: request.id, accept: false, note: "Too late now" }), /already been answered/);
    // The teacher corrects and submits again; the class teacher approves.
    await saveMarks(s.subjectTeacher, { ...monthlyKey, marks: [{ enrollmentId: s.enrollments[1].id, assessmentId: s.monthly.id, value: "15" }] });
    await submitMarkSheet(s.subjectTeacher, monthlyKey);
    await approveMarkSheet(s.classTeacher, { sheetId: s.monthlySheet.id });
  });

  it("keeps the marks when declined", async () => {
    await requestCorrection(s.subjectTeacher, { sheetId: s.monthlySheet.id, reason: "Please check roll 1 again" });
    const [request] = await openCorrectionsForSection(t.db, s.term.id, s.section.id);
    await resolveCorrection(s.classTeacher, { requestId: request.id, accept: false, note: "Checked: 20 is right" });
    expect((await getMarkSheet(s.subjectTeacher, monthlyKey)).status).toBe("approved");
    expect(await openCorrectionsForSection(t.db, s.term.id, s.section.id)).toHaveLength(0);
  });
});

describe("Excel export", () => {
  it("writes the class result with marks, totals and positions, for the class teacher and principal only", async () => {
    const { buffer, filename } = await exportClassResult(s.classTeacher, resultKey());
    expect(filename).toBe("Class 6 A First Term Monthly result.xlsx");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.getWorksheet("Result")!;
    const header = sheet.getRow(5).values as unknown[];
    expect(header.slice(1, 6)).toEqual(["Roll", "Student ID", "Name", "English (25)", "Total"]);
    const rows = [6, 7].map((r) => (sheet.getRow(r).values as unknown[]).slice(1, 13));
    // Student One 20/25 = 80% (1st); Student Two 15/25 = 60% (2nd).
    expect(rows[0].slice(0, 10)).toEqual([1, "S-001", "Student One", 20, 20, 25, 80, "A", "Pass", 1]);
    expect(rows[1].slice(0, 10)).toEqual([2, "S-002", "Student Two", 15, 15, 25, 60, "C", "Pass", 2]);
    await rejectsWith(exportClassResult(s.subjectTeacher, resultKey()), /Only the class teacher/);
    await exportClassResult(s.admin, resultKey());
  });
});

describe("subject analysis", () => {
  it("averages each subject over the students with a result", async () => {
    const [english] = subjectStatistics(await getClassResult(s.classTeacher, resultKey()));
    expect(english).toMatchObject({ name: "English", counted: 2, passed: 2, topStudents: ["Student One"] });
    expect([english.average?.toString(), english.highest?.toString(), english.lowest?.toString(), english.passRate?.toString()]).toEqual(["70", "80", "60", "100"]);
  });
});

describe("audit log", () => {
  it("shows the principal who changed which mark, with the reason", async () => {
    await rejectsWith(listAuditLog(s.classTeacher, {}), /Only the principal/);
    const { entries } = await listAuditLog(s.admin, { area: "marks" });
    const change = entries.find((e) => e.action === "Changed" && e.changes.includes("mark: 5 → 15"));
    expect(change).toMatchObject({ area: "Marks", subject: "Student Two (Class 6) · English · Monthly Test" });
    const requests = await listAuditLog(s.admin, { area: "correction_requests" });
    expect(requests.entries.some((e) => e.reason === "Correction request declined: Checked: 20 is right")).toBe(true);
    const page2 = await listAuditLog(s.admin, { page: "2" });
    expect(page2.page).toBe(2);
  });
});
