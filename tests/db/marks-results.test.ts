import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/server/db/schema";
import { approveMarkSheet, cellKey, getMarkSheet, listMarkSheets, returnMarkSheet, saveMarks, submitMarkSheet } from "@/server/services/marks";
import { buildReportCards, gradeLegend } from "@/server/services/report-cards";
import { classApproveResult, finalApproveResult, getClassResult, listClassResults, reopenResult, saveRemarks } from "@/server/services/results";
import { addUser, createTestDb, rejectsWith, seedSchool, type TestDb } from "./helpers";

let t: TestDb;
let s: Awaited<ReturnType<typeof seedSchool>>;
let outsider: Awaited<ReturnType<typeof addUser>>;
let key: { examTermId: string; sectionId: string; classSubjectId: string };
let resultKey: { examTermId: string; sectionId: string };

const cell = (enrollmentId: string, assessmentId: string, value: string) => ({ enrollmentId, assessmentId, value });

beforeAll(async () => {
  t = await createTestDb();
  s = await seedSchool(t.db);
  outsider = await addUser(t.db);
  key = { examTermId: s.term.id, sectionId: s.section.id, classSubjectId: s.classSubject.id };
  resultKey = { examTermId: s.term.id, sectionId: s.section.id };
});
afterAll(() => t.close());

describe("marks entry", () => {
  it("shows the sheet only to the subject teacher, the class teacher and the principal", async () => {
    const view = await getMarkSheet(s.subjectTeacher, key);
    expect(view.students).toHaveLength(2);
    expect(view.components.map((c) => c.maxMarks)).toEqual(["25.00", "75.00"]);
    expect(view.access).toEqual({ canEdit: true, canReview: false, canApprove: false });
    expect((await getMarkSheet(s.classTeacher, key)).access.canEdit).toBe(false);
    await rejectsWith(getMarkSheet(outsider, key), /Only the subject teacher/);
  });

  it("lists sheets per scope", async () => {
    expect(await listMarkSheets(s.subjectTeacher, { examTermId: s.term.id, scope: "mine" })).toHaveLength(1);
    expect(await listMarkSheets(s.classTeacher, { examTermId: s.term.id, scope: "mine" })).toHaveLength(0);
    expect(await listMarkSheets(s.classTeacher, { examTermId: s.term.id, scope: "class" })).toHaveLength(1);
    await rejectsWith(listMarkSheets(s.subjectTeacher, { examTermId: s.term.id, scope: "all" }), /Only the principal/);
  });

  it("refuses invalid marks cell by cell and saves nothing", async () => {
    const [one, two] = s.enrollments;
    try {
      await saveMarks(s.subjectTeacher, { ...key, marks: [cell(one.id, s.monthly.id, "26"), cell(two.id, s.monthly.id, "abc"), cell(one.id, s.termExam.id, "40.5"), cell(two.id, s.termExam.id, "50")] });
      throw new Error("should have failed");
    } catch (error) {
      const fieldErrors = (error as { fieldErrors?: Record<string, string[]> }).fieldErrors ?? {};
      expect(Object.keys(fieldErrors).sort()).toEqual([cellKey(one.id, s.monthly.id), cellKey(one.id, s.termExam.id), cellKey(two.id, s.monthly.id)].sort());
      expect(fieldErrors[cellKey(one.id, s.monthly.id)]).toEqual(["At most 25"]);
    }
    expect(Object.keys((await getMarkSheet(s.subjectTeacher, key)).marks)).toHaveLength(0);
  });

  it("keeps blank as missing and 0 as a real score", async () => {
    const [one, two] = s.enrollments;
    const saved = await saveMarks(s.subjectTeacher, { ...key, marks: [cell(one.id, s.monthly.id, "0"), cell(one.id, s.termExam.id, "60"), cell(two.id, s.monthly.id, "")] });
    expect(saved).toEqual({ saved: 2, missing: 2 });
    const view = await getMarkSheet(s.subjectTeacher, key);
    expect(view.marks[cellKey(one.id, s.monthly.id)]).toBe("0");
    expect(view.missing).toBe(2);
    // Clearing a saved mark makes it missing again; unchanged cells are not rewritten.
    expect(await saveMarks(s.subjectTeacher, { ...key, marks: [cell(one.id, s.termExam.id, ""), cell(one.id, s.monthly.id, "0")] })).toEqual({ saved: 1, missing: 3 });
  });

  it("only lets the assigned teacher (or the principal) enter marks", async () => {
    await rejectsWith(saveMarks(s.classTeacher, { ...key, marks: [cell(s.enrollments[0].id, s.monthly.id, "10")] }), /only enter marks for the subjects assigned to you/);
    await rejectsWith(saveMarks(outsider, { ...key, marks: [cell(s.enrollments[0].id, s.monthly.id, "10")] }), /only enter marks/);
  });

  it("refuses to submit while marks are missing", async () => {
    await rejectsWith(submitMarkSheet(s.subjectTeacher, key), /3 marks are still missing/);
  });

  it("submits a complete sheet and then locks it", async () => {
    const [one, two] = s.enrollments;
    await saveMarks(s.subjectTeacher, { ...key, marks: [cell(one.id, s.termExam.id, "60"), cell(two.id, s.monthly.id, "5"), cell(two.id, s.termExam.id, "15")] });
    await submitMarkSheet(s.subjectTeacher, key);
    const view = await getMarkSheet(s.subjectTeacher, key);
    expect(view.status).toBe("submitted");
    expect(view.access.canEdit).toBe(false);
    await rejectsWith(saveMarks(s.subjectTeacher, { ...key, marks: [cell(one.id, s.monthly.id, "1")] }), /have been submitted/);
  });
});

describe("review by the class teacher", () => {
  it("lets only the class teacher or the principal review, and returning needs a reason", async () => {
    await rejectsWith(returnMarkSheet(s.classTeacher, { sheetId: s.sheet.id, reason: "no" }), /at least 5 characters/);
    await rejectsWith(returnMarkSheet(s.subjectTeacher, { sheetId: s.sheet.id, reason: "Please check roll 2" }), /Only the class teacher of this class or the principal/);
    await rejectsWith(approveMarkSheet(s.subjectTeacher, { sheetId: s.sheet.id }), /Only the class teacher of this class or the principal/);
  });
});

describe("class result workflow", () => {
  it("compiles only submitted marks and blocks approval until every sheet is approved", async () => {
    const view = await getClassResult(s.classTeacher, resultKey);
    expect(view.students.map((st) => st.outcome.status)).toEqual(["Pass", "Fail"]);
    // Student One: 0 + 60 = 60/100; Student Two: 5 + 15 = 20/100 (below the 33% pass mark).
    expect(view.students[0].outcome.percentage?.toString()).toBe("60");
    expect(view.students.map((st) => st.position)).toEqual([1, 2]);
    expect(view.access.canClassApprove).toBe(false);
    expect(view.readiness.blockers.join(" ")).toMatch(/Marks not approved yet: English/);
    await rejectsWith(classApproveResult(s.classTeacher, resultKey), /cannot be approved yet/);
    await rejectsWith(getClassResult(s.subjectTeacher, resultKey), /Only the class teacher/);
  });

  it("returns, corrects, resubmits and approves the sheet", async () => {
    await returnMarkSheet(s.classTeacher, { sheetId: s.sheet.id, reason: "Roll 2 monthly test looks wrong" });
    expect((await getMarkSheet(s.subjectTeacher, key)).returnReason).toBe("Roll 2 monthly test looks wrong");
    // A returned sheet no longer counts in the class result.
    expect((await getClassResult(s.classTeacher, resultKey)).students[0].outcome.status).toBe("Incomplete");
    await saveMarks(s.subjectTeacher, { ...key, marks: [cell(s.enrollments[1].id, s.monthly.id, "10")] });
    await submitMarkSheet(s.subjectTeacher, key);
    await rejectsWith(approveMarkSheet(outsider, { sheetId: s.sheet.id }), /Only the class teacher of this class or the principal/);
    await approveMarkSheet(s.classTeacher, { sheetId: s.sheet.id });
    expect((await getMarkSheet(s.classTeacher, key)).status).toBe("approved");
  });

  it("never lets someone approve marks they submitted themselves", async () => {
    // The principal enters and submits on a teacher's behalf: the class teacher must approve.
    await returnMarkSheet(s.classTeacher, { sheetId: s.sheet.id, reason: "Recheck roll 1, please" });
    await submitMarkSheet(s.admin, key);
    expect((await getMarkSheet(s.admin, key)).access.canApprove).toBe(false);
    await rejectsWith(approveMarkSheet(s.admin, { sheetId: s.sheet.id }), /someone else must approve/);
    await approveMarkSheet(s.classTeacher, { sheetId: s.sheet.id });
  });

  it("writes remarks and approves the class result, which locks marks and remarks", async () => {
    await saveRemarks(s.classTeacher, { examTermId: s.term.id, enrollmentId: s.enrollments[0].id, remarks: "Works hard." });
    await rejectsWith(saveRemarks(outsider, { examTermId: s.term.id, enrollmentId: s.enrollments[0].id, remarks: "x" }), /Only the class teacher/);
    expect(await classApproveResult(s.classTeacher, resultKey)).toEqual({ final: false });
    const view = await getClassResult(s.classTeacher, resultKey);
    expect(view.approval.status).toBe("class_approved");
    expect(view.students[0].remarks).toBe("Works hard.");
    await rejectsWith(saveRemarks(s.classTeacher, { examTermId: s.term.id, enrollmentId: s.enrollments[0].id, remarks: "Changed" }), /remarks are locked/);
    await rejectsWith(returnMarkSheet(s.classTeacher, { sheetId: s.sheet.id, reason: "Another change" }), /class result is approved/);
    expect((await listClassResults(s.classTeacher, s.term.id))[0]).toMatchObject({ status: "class_approved", sheetsApproved: 1, sheetsTotal: 1, students: 2 });
  });

  it("prints provisional cards until the principal's final approval", async () => {
    const before = await buildReportCards(s.classTeacher, resultKey);
    expect(before.official).toBe(false);
    expect(before.cards[0].view).toMatchObject({ provisional: true, result: "PASS", total: "60", maxTotal: "100", pct: "60.00", grade: "C", remarks: "Works hard." });
    expect(before.cards[1].view).toMatchObject({ result: "FAIL", failedList: "English" });
    expect(before.cards[1].view.rows[0]).toMatchObject({ m: "10", mm: "25", t: "15", tm: "75", fail: true });

    await rejectsWith(finalApproveResult(s.classTeacher, resultKey), /Only the principal/);
    await finalApproveResult(s.admin, resultKey);
    const after = await buildReportCards(s.classTeacher, { ...resultKey, enrollmentId: s.enrollments[0].id });
    expect(after.cards).toHaveLength(1);
    expect(after.cards[0].view.official).toBe(true);
    expect(after.cards[0].view.approvalText).toMatch(/^Approved by the Principal on \d{1,2} [A-Z][a-z]{2} \d{4}$/);
  });

  it("reopens only with a reason, and only the principal after final approval", async () => {
    await rejectsWith(reopenResult(s.classTeacher, { ...resultKey, reason: "Correction needed" }), /Only the principal can reopen/);
    await rejectsWith(reopenResult(s.admin, { ...resultKey, reason: "no" }), /at least 5 characters/);
    await reopenResult(s.admin, { ...resultKey, reason: "Correction needed in English" });
    const view = await getClassResult(s.admin, resultKey);
    expect(view.approval).toMatchObject({ status: "open", reopenReason: "Correction needed in English", finalApprovedAt: null });
    const [audit] = await t.db.select().from(schema.auditLogs).where(eq(schema.auditLogs.reason, "Correction needed in English"));
    expect(audit.tableName).toBe("result_approvals");
  });

  it("never prints made-up numbers for an incomplete student", async () => {
    const [student] = await t.db.insert(schema.students).values({ studentCode: "S-003", fullName: "Late Joiner" }).returning();
    await t.db.insert(schema.enrollments).values({ studentId: student.id, academicYearId: s.year.id, classId: s.klass.id, sectionId: s.section.id, rollNumber: 3 });
    const cards = await buildReportCards(s.admin, resultKey);
    const late = cards.cards.find((c) => c.studentName === "Late Joiner")!.view;
    expect(late).toMatchObject({ result: "INCOMPLETE", total: "—", pct: "—", grade: "—", incomplete: true, provisional: true });
    expect(late.rows[0]).toMatchObject({ m: "—", t: "—", pass: false, fail: false });
    const view = await getClassResult(s.admin, resultKey);
    expect(view.students.find((st) => st.fullName === "Late Joiner")!.position).toBeNull();
    expect(view.access.canClassApprove).toBe(false);
  });
});

describe("report card text", () => {
  it("describes the grade bands", async () => {
    const view = await getClassResult(s.admin, resultKey);
    expect(gradeLegend(view.rules)).toBe("A+ 90–100 · A 80–89 · B 70–79 · C 60–69 · D 50–59 · E 33–49 · F below 33");
  });
});
