import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/server/db/schema";
import { approveMarkSheet, cellKey, getMarkSheet, listMarkSheets, returnMarkSheet, saveMarks, submitMarkSheet } from "@/server/services/marks";
import { buildReportCards, gradeLegend, ordinal } from "@/server/services/report-cards";
import { classApproveResult, finalApproveResult, getClassResult, listClassResults, reopenResult, saveRemarks } from "@/server/services/results";
import { addUser, createTestDb, rejectsWith, seedSchool, type TestDb } from "./helpers";

let t: TestDb;
let s: Awaited<ReturnType<typeof seedSchool>>;
let outsider: Awaited<ReturnType<typeof addUser>>;
let monthlyKey: { examTermId: string; sectionId: string; classSubjectId: string; stage: "monthly" };
let termKey: { examTermId: string; sectionId: string; classSubjectId: string; stage: "term" };
let monthlyResult: { examTermId: string; sectionId: string; stage: "monthly" };
let termResult: { examTermId: string; sectionId: string; stage: "term" };

const cell = (enrollmentId: string, assessmentId: string, value: string) => ({ enrollmentId, assessmentId, value });

beforeAll(async () => {
  t = await createTestDb();
  s = await seedSchool(t.db);
  outsider = await addUser(t.db);
  const base = { examTermId: s.term.id, sectionId: s.section.id };
  monthlyKey = { ...base, classSubjectId: s.classSubject.id, stage: "monthly" };
  termKey = { ...base, classSubjectId: s.classSubject.id, stage: "term" };
  monthlyResult = { ...base, stage: "monthly" };
  termResult = { ...base, stage: "term" };
});
afterAll(() => t.close());

describe("marks entry", () => {
  it("splits a subject into a Monthly Test sheet and a term sheet", async () => {
    const monthly = await getMarkSheet(s.subjectTeacher, monthlyKey);
    expect(monthly.students).toHaveLength(2);
    expect(monthly.components.map((c) => [c.code, c.maxMarks])).toEqual([["MONTHLY", "25.00"]]);
    expect(monthly.stages).toEqual([
      { stage: "monthly", components: 1, status: "draft" },
      { stage: "term", components: 1, status: "draft" },
    ]);
    expect((await getMarkSheet(s.subjectTeacher, termKey)).components.map((c) => c.code)).toEqual(["TERM_EXAM"]);
  });

  it("shows the sheets only to the subject teacher, the class teacher and the principal", async () => {
    expect((await getMarkSheet(s.subjectTeacher, monthlyKey)).access).toEqual({ canEdit: true, canReview: false, canApprove: false });
    expect((await getMarkSheet(s.classTeacher, monthlyKey)).access.canEdit).toBe(false);
    await rejectsWith(getMarkSheet(outsider, monthlyKey), /Only the subject teacher/);
  });

  it("lists both stages per subject and scope", async () => {
    const [row] = await listMarkSheets(s.subjectTeacher, { examTermId: s.term.id, scope: "mine" });
    expect(row.monthly).toMatchObject({ components: 1, status: "draft", entered: 0 });
    expect(row.term).toMatchObject({ components: 1, status: "draft", entered: 0 });
    expect(await listMarkSheets(s.classTeacher, { examTermId: s.term.id, scope: "mine" })).toHaveLength(0);
    expect(await listMarkSheets(s.classTeacher, { examTermId: s.term.id, scope: "class" })).toHaveLength(1);
    await rejectsWith(listMarkSheets(s.subjectTeacher, { examTermId: s.term.id, scope: "all" }), /Only the principal/);
  });

  it("refuses invalid marks cell by cell and saves nothing", async () => {
    const [one, two] = s.enrollments;
    try {
      await saveMarks(s.subjectTeacher, { ...monthlyKey, marks: [cell(one.id, s.monthly.id, "26"), cell(two.id, s.monthly.id, "abc")] });
      throw new Error("should have failed");
    } catch (error) {
      const fieldErrors = (error as { fieldErrors?: Record<string, string[]> }).fieldErrors ?? {};
      expect(Object.keys(fieldErrors).sort()).toEqual([cellKey(one.id, s.monthly.id), cellKey(two.id, s.monthly.id)].sort());
      expect(fieldErrors[cellKey(one.id, s.monthly.id)]).toEqual(["At most 25"]);
    }
    expect(Object.keys((await getMarkSheet(s.subjectTeacher, monthlyKey)).marks)).toHaveLength(0);
  });

  it("refuses a term mark on the monthly sheet", async () => {
    await rejectsWith(saveMarks(s.subjectTeacher, { ...monthlyKey, marks: [cell(s.enrollments[0].id, s.termExam.id, "50")] }), /has changed/);
  });

  it("keeps blank as missing and 0 as a real score", async () => {
    const [one, two] = s.enrollments;
    expect(await saveMarks(s.subjectTeacher, { ...monthlyKey, marks: [cell(one.id, s.monthly.id, "0"), cell(two.id, s.monthly.id, "")] })).toEqual({ saved: 1, missing: 1 });
    expect((await getMarkSheet(s.subjectTeacher, monthlyKey)).marks[cellKey(one.id, s.monthly.id)]).toBe("0");
  });

  it("only lets the assigned teacher (or the principal) enter marks", async () => {
    await rejectsWith(saveMarks(s.classTeacher, { ...monthlyKey, marks: [cell(s.enrollments[0].id, s.monthly.id, "10")] }), /only enter marks for the subjects assigned to you/);
    await rejectsWith(saveMarks(outsider, { ...monthlyKey, marks: [cell(s.enrollments[0].id, s.monthly.id, "10")] }), /only enter marks/);
  });

  it("refuses to submit while marks are missing", async () => {
    await rejectsWith(submitMarkSheet(s.subjectTeacher, monthlyKey), /1 mark is still missing/);
  });

  it("submits the Monthly Test on its own; the term sheet stays open", async () => {
    await saveMarks(s.subjectTeacher, { ...monthlyKey, marks: [cell(s.enrollments[1].id, s.monthly.id, "5")] });
    await submitMarkSheet(s.subjectTeacher, monthlyKey);
    expect((await getMarkSheet(s.subjectTeacher, monthlyKey)).status).toBe("submitted");
    await rejectsWith(saveMarks(s.subjectTeacher, { ...monthlyKey, marks: [cell(s.enrollments[0].id, s.monthly.id, "1")] }), /have been submitted/);
    expect((await getMarkSheet(s.subjectTeacher, termKey)).access.canEdit).toBe(true);
  });
});

describe("review by the class teacher", () => {
  it("lets only the class teacher or the principal review, and returning needs a reason", async () => {
    const sheetId = (await getMarkSheet(s.classTeacher, monthlyKey)).sheetId!;
    await rejectsWith(returnMarkSheet(s.classTeacher, { sheetId, reason: "no" }), /at least 5 characters/);
    await rejectsWith(returnMarkSheet(s.subjectTeacher, { sheetId, reason: "Please check roll 2" }), /Only the class teacher of this class or the principal/);
    await rejectsWith(approveMarkSheet(s.subjectTeacher, { sheetId }), /Only the class teacher of this class or the principal/);
  });
});

describe("monthly result", () => {
  it("compiles only the Monthly Test from submitted sheets", async () => {
    const view = await getClassResult(s.classTeacher, monthlyResult);
    expect(view.subjects.map((x) => x.components.map((c) => c.code))).toEqual([["MONTHLY"]]);
    // Student One: 0/25 = 0%; Student Two: 5/25 = 20% — both below the 33% pass mark.
    expect(view.students.map((st) => [st.outcome.status, st.outcome.percentage?.toString()])).toEqual([
      ["Fail", "0"],
      ["Fail", "20"],
    ]);
    expect(view.readiness.blockers.join(" ")).toMatch(/Marks not approved yet: English\./);
    await rejectsWith(classApproveResult(s.classTeacher, monthlyResult), /cannot be approved yet/);
    await rejectsWith(getClassResult(s.subjectTeacher, monthlyResult), /Only the class teacher/);
  });

  it("returns, corrects, resubmits and approves the monthly sheet", async () => {
    const sheetId = (await getMarkSheet(s.classTeacher, monthlyKey)).sheetId!;
    await returnMarkSheet(s.classTeacher, { sheetId, reason: "Roll 2 monthly test looks wrong" });
    expect((await getMarkSheet(s.subjectTeacher, monthlyKey)).returnReason).toBe("Roll 2 monthly test looks wrong");
    // A returned sheet no longer counts in the result.
    expect((await getClassResult(s.classTeacher, monthlyResult)).students[0].outcome.status).toBe("Incomplete");
    await saveMarks(s.subjectTeacher, { ...monthlyKey, marks: [cell(s.enrollments[1].id, s.monthly.id, "10")] });
    await submitMarkSheet(s.subjectTeacher, monthlyKey);
    await rejectsWith(approveMarkSheet(outsider, { sheetId }), /Only the class teacher of this class or the principal/);
    await approveMarkSheet(s.classTeacher, { sheetId });
    expect((await getMarkSheet(s.classTeacher, monthlyKey)).status).toBe("approved");
  });

  it("never lets someone approve marks they submitted themselves", async () => {
    const sheetId = (await getMarkSheet(s.classTeacher, monthlyKey)).sheetId!;
    await returnMarkSheet(s.classTeacher, { sheetId, reason: "Recheck roll 1, please" });
    await submitMarkSheet(s.admin, monthlyKey);
    expect((await getMarkSheet(s.admin, monthlyKey)).access.canApprove).toBe(false);
    await rejectsWith(approveMarkSheet(s.admin, { sheetId }), /someone else must approve/);
    await approveMarkSheet(s.classTeacher, { sheetId });
  });

  it("is approved before the term examination, locking only the monthly marks", async () => {
    await saveRemarks(s.classTeacher, { examTermId: s.term.id, stage: "monthly", enrollmentId: s.enrollments[0].id, remarks: "Revise for the next test." });
    await rejectsWith(saveRemarks(outsider, { examTermId: s.term.id, stage: "monthly", enrollmentId: s.enrollments[0].id, remarks: "x" }), /Only the class teacher/);
    expect(await classApproveResult(s.classTeacher, monthlyResult)).toEqual({ final: false });
    const view = await getClassResult(s.classTeacher, monthlyResult);
    expect(view.approval.status).toBe("class_approved");
    expect(view.students.map((st) => st.position)).toEqual([2, 1]);
    await rejectsWith(
      saveRemarks(s.classTeacher, { examTermId: s.term.id, stage: "monthly", enrollmentId: s.enrollments[0].id, remarks: "Changed" }),
      /remarks are locked/,
    );
    const sheetId = (await getMarkSheet(s.classTeacher, monthlyKey)).sheetId!;
    await rejectsWith(returnMarkSheet(s.classTeacher, { sheetId, reason: "Another change" }), /class result is approved/);
    // The term examination can still be entered.
    expect((await getMarkSheet(s.subjectTeacher, termKey)).access.canEdit).toBe(true);
    const [row] = await listClassResults(s.classTeacher, s.term.id);
    expect(row).toMatchObject({
      students: 2,
      monthly: { status: "class_approved", sheetsApproved: 1, sheetsTotal: 1 },
      term: { status: "open", sheetsApproved: 1, sheetsTotal: 2 },
    });
  });

  it("prints monthly cards with only the Monthly Test, provisional until final approval", async () => {
    const cards = await buildReportCards(s.classTeacher, monthlyResult);
    expect(cards.official).toBe(false);
    expect(cards.cards[0].view).toMatchObject({
      monthlyOnly: true,
      termName: "First Term · Monthly Test",
      total: "0",
      maxTotal: "25",
      result: "FAIL",
      remarks: "Revise for the next test.",
    });
    expect(cards.cards[1].view).toMatchObject({ total: "10", pct: "40.00", grade: "E", result: "PASS" });
    expect(cards.cards[1].view.rows[0]).toMatchObject({ m: "10", mm: "25", t: "—", tm: "—" });
    await finalApproveResult(s.admin, monthlyResult);
    expect((await buildReportCards(s.classTeacher, monthlyResult)).official).toBe(true);
  });
});

describe("term result", () => {
  it("waits for the term sheet as well", async () => {
    const view = await getClassResult(s.classTeacher, termResult);
    expect(view.subjects[0].components.map((c) => c.code)).toEqual(["MONTHLY", "TERM_EXAM"]);
    expect(view.readiness.blockers.join(" ")).toMatch(/Marks not approved yet: English \(Term\)\./);
    expect(view.students.every((st) => st.outcome.status === "Incomplete")).toBe(true);
    // Separate remarks from the monthly card.
    expect(view.students[0].remarks).toBe("");
  });

  it("combines the approved Monthly Test with the term examination", async () => {
    const [one, two] = s.enrollments;
    await saveMarks(s.subjectTeacher, { ...termKey, marks: [cell(one.id, s.termExam.id, "60"), cell(two.id, s.termExam.id, "15")] });
    await submitMarkSheet(s.subjectTeacher, termKey);
    await approveMarkSheet(s.classTeacher, { sheetId: (await getMarkSheet(s.classTeacher, termKey)).sheetId! });
    const view = await getClassResult(s.classTeacher, termResult);
    // Student One: 0 + 60 = 60/100; Student Two: 10 + 15 = 25/100.
    expect(view.students.map((st) => [st.outcome.status, st.outcome.percentage?.toString(), st.position])).toEqual([
      ["Pass", "60", 1],
      ["Fail", "25", 2],
    ]);
    await saveRemarks(s.classTeacher, { examTermId: s.term.id, stage: "term", enrollmentId: one.id, remarks: "Works hard." });
    expect(await classApproveResult(s.classTeacher, termResult)).toEqual({ final: false });
  });

  it("prints term cards with both components", async () => {
    const before = await buildReportCards(s.classTeacher, termResult);
    expect(before.cards[0].view).toMatchObject({ monthlyOnly: false, termName: "First Term", provisional: true, total: "60", maxTotal: "100", grade: "C", remarks: "Works hard." });
    expect(before.cards[1].view).toMatchObject({ result: "FAIL", failedList: "English" });
    expect(before.cards[1].view.rows[0]).toMatchObject({ m: "10", mm: "25", t: "15", tm: "75", fail: true });
    await rejectsWith(finalApproveResult(s.classTeacher, termResult), /Only the principal/);
    await finalApproveResult(s.admin, termResult);
    const after = await buildReportCards(s.classTeacher, { ...termResult, enrollmentId: s.enrollments[0].id });
    expect(after.cards).toHaveLength(1);
    expect(after.cards[0].view.approvalText).toMatch(/^Approved by the Principal on \d{1,2} [A-Z][a-z]{2} \d{4}$/);
  });

  it("reopens only with a reason, and only the principal after final approval", async () => {
    await rejectsWith(reopenResult(s.classTeacher, { ...termResult, reason: "Correction needed" }), /Only the principal can reopen/);
    await rejectsWith(reopenResult(s.admin, { ...termResult, reason: "no" }), /at least 5 characters/);
    await reopenResult(s.admin, { ...termResult, reason: "Correction needed in English" });
    expect((await getClassResult(s.admin, termResult)).approval).toMatchObject({ status: "open", reopenReason: "Correction needed in English", finalApprovedAt: null });
    // The monthly result stays approved, so the monthly marks stay locked.
    expect((await getClassResult(s.admin, monthlyResult)).approval.status).toBe("final_approved");
    const [audit] = await t.db.select().from(schema.auditLogs).where(eq(schema.auditLogs.reason, "Correction needed in English"));
    expect(audit.tableName).toBe("result_approvals");
  });

  it("never prints made-up numbers for an incomplete student", async () => {
    const [student] = await t.db.insert(schema.students).values({ studentCode: "S-003", fullName: "Late Joiner" }).returning();
    await t.db.insert(schema.enrollments).values({ studentId: student.id, academicYearId: s.year.id, classId: s.klass.id, sectionId: s.section.id, rollNumber: 3 });
    const cards = await buildReportCards(s.admin, termResult);
    const late = cards.cards.find((c) => c.studentName === "Late Joiner")!.view;
    expect(late).toMatchObject({ result: "INCOMPLETE", total: "—", pct: "—", grade: "—", incomplete: true, provisional: true });
    expect(late.rows[0]).toMatchObject({ m: "—", t: "—", pass: false, fail: false });
    const view = await getClassResult(s.admin, termResult);
    expect(view.students.find((st) => st.fullName === "Late Joiner")!.position).toBeNull();
    expect(view.access.canClassApprove).toBe(false);
  });

  it("prints class position only when the school asks for it, and never for an incomplete student", async () => {
    const hidden = await buildReportCards(s.admin, termResult);
    expect(hidden.cards.every((c) => !c.view.showPosition)).toBe(true);
    await t.db.update(schema.schoolSettings).set({ showClassPosition: true });
    const shown = await buildReportCards(s.admin, termResult);
    expect(shown.cards.map((c) => [c.studentName, c.view.showPosition, c.view.position])).toEqual([
      ["Student One", true, "1st of 3"],
      ["Student Two", true, "2nd of 3"],
      ["Late Joiner", false, ""],
    ]);
    await t.db.update(schema.schoolSettings).set({ showClassPosition: false });
  });

  it("writes positions as ordinals", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "101st", "111th"]);
  });

  it("describes the grade bands", async () => {
    const view = await getClassResult(s.admin, termResult);
    expect(gradeLegend(view.rules)).toBe("A+ 90–100 · A 80–89 · B 70–79 · C 60–69 · D 50–59 · E 33–49 · F below 33");
  });
});
