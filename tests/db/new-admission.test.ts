import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/server/db/schema";
import { approveMarkSheet, cellKey, getMarkSheet, listMarkSheets, saveMarks, submitMarkSheet } from "@/server/services/marks";
import { buildReportCards } from "@/server/services/report-cards";
import { classApproveResult, getClassResult } from "@/server/services/results";
import { createTestDb, rejectsWith, seedSchool, type TestDb } from "./helpers";

let t: TestDb;
let s: Awaited<ReturnType<typeof seedSchool>>;
let monthlyKey: { examTermId: string; sectionId: string; classSubjectId: string; stage: "monthly" };
let termKey: { examTermId: string; sectionId: string; classSubjectId: string; stage: "term" };

beforeAll(async () => {
  t = await createTestDb();
  s = await seedSchool(t.db);
  const base = { examTermId: s.term.id, sectionId: s.section.id, classSubjectId: s.classSubject.id };
  monthlyKey = { ...base, stage: "monthly" };
  termKey = { ...base, stage: "term" };
});
afterAll(() => t.close());

describe("new admissions", () => {
  it("accepts N (either case) for a student who joined after the test, which is not missing", async () => {
    const [one, two] = s.enrollments;
    expect(
      await saveMarks(s.subjectTeacher, { ...monthlyKey, marks: [{ enrollmentId: one.id, assessmentId: s.monthly.id, value: "n" }, { enrollmentId: two.id, assessmentId: s.monthly.id, value: "20" }] }),
    ).toEqual({ saved: 2, missing: 0 });
    const view = await getMarkSheet(s.subjectTeacher, monthlyKey);
    expect(view.marks[cellKey(one.id, s.monthly.id)]).toBe("N");
    expect(view.missing).toBe(0);
    const [row] = await listMarkSheets(s.subjectTeacher, { examTermId: s.term.id, scope: "mine" });
    expect(row.stages[0].entered).toBe(2);
    // The database never stores a new admission together with a mark or an absence.
    await rejectsWith(
      t.db.update(schema.marks).set({ isNewAdmission: true, marksObtained: "5" }).where(eq(schema.marks.enrollmentId, two.id)),
      /marks_new_admission_has_no_mark|check constraint|One of the values is not allowed/,
    );
    await rejectsWith(
      t.db.update(schema.marks).set({ isAbsent: true }).where(eq(schema.marks.enrollmentId, one.id)),
      /marks_new_admission_has_no_mark|check constraint|One of the values is not allowed/,
    );
    await submitMarkSheet(s.subjectTeacher, monthlyKey);
    await approveMarkSheet(s.classTeacher, { sheetId: view.sheetId! });
  });

  it("gives a student who joined after every test no result or position and a NEW ADMISSION card, and still lets the result be approved", async () => {
    const result = { examTermId: s.term.id, sectionId: s.section.id, stage: "monthly" as const };
    const view = await getClassResult(s.classTeacher, result);
    const [one, two] = view.students;
    expect(one).toMatchObject({ newAdmissionAll: true, absentAll: false, position: null, newAdmission: [s.monthly.id] });
    expect(one.outcome).toMatchObject({ grandObtained: null, percentage: null, complete: true });
    expect(two).toMatchObject({ newAdmissionAll: false, position: 1 });
    expect(view.readiness.blockers).toEqual([]);
    const cards = await buildReportCards(s.classTeacher, result);
    expect(cards.cards[0].view).toMatchObject({
      result: "NEW ADMISSION",
      newAdmission: true,
      absent: false,
      incomplete: false,
      total: "—",
      maxTotal: "—",
      pct: "—",
      grade: "—",
      passed: false,
      failed: false,
      position: "",
    });
    expect(cards.cards[0].view.rows).toHaveLength(1);
    expect(cards.cards[0].view.rows[0]).toMatchObject({ name: "English", m: "—", mm: "—", ob: "—", max: "—", pct: "—", pass: false, fail: false });
    expect(cards.cards[1].view).toMatchObject({ result: "PASS", total: "20", maxTotal: "25", pct: "80.00", newAdmission: false });
    await classApproveResult(s.classTeacher, result);
  });

  it("judges a student who joined between the tests only on the test they sat", async () => {
    const [one, two] = s.enrollments;
    await saveMarks(s.subjectTeacher, { ...termKey, marks: [{ enrollmentId: one.id, assessmentId: s.termExam.id, value: "60" }, { enrollmentId: two.id, assessmentId: s.termExam.id, value: "50" }] });
    await submitMarkSheet(s.subjectTeacher, termKey);
    await approveMarkSheet(s.classTeacher, { sheetId: (await getMarkSheet(s.classTeacher, termKey)).sheetId! });
    const result = { examTermId: s.term.id, sectionId: s.section.id, stage: "term" as const };
    const view = await getClassResult(s.classTeacher, result);
    // Student One: monthly N, term 60/75 = 80% on the 75 marks sat; Student Two: 20 + 50 = 70/100 = 70%.
    expect(
      view.students.map((st) => [st.newAdmissionAll, st.outcome.status, st.outcome.grandObtained?.toString(), st.outcome.grandMaximum.toString(), st.outcome.percentage?.toString(), st.position]),
    ).toEqual([
      [false, "Pass", "60", "75", "80", 1],
      [false, "Pass", "70", "100", "70", 2],
    ]);
    const cards = await buildReportCards(s.classTeacher, result);
    expect(cards.cards[0].view.rows[0]).toMatchObject({ m: "—", mm: "—", t: "60", tm: "75", ob: "60", max: "75", pct: "80.00" });
    expect(cards.cards[0].view).toMatchObject({ result: "PASS", total: "60", maxTotal: "75", newAdmission: false });
    expect(cards.cards[1].view.rows[0]).toMatchObject({ m: "20", mm: "25", t: "50", tm: "75", ob: "70", max: "100" });
  });
});
