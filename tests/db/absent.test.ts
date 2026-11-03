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

describe("absent students", () => {
  it("accepts A (either case) as an absence, which is not missing", async () => {
    const [one, two] = s.enrollments;
    expect(
      await saveMarks(s.subjectTeacher, { ...monthlyKey, marks: [{ enrollmentId: one.id, assessmentId: s.monthly.id, value: "a" }, { enrollmentId: two.id, assessmentId: s.monthly.id, value: "20" }] }),
    ).toEqual({ saved: 2, missing: 0 });
    const view = await getMarkSheet(s.subjectTeacher, monthlyKey);
    expect(view.marks[cellKey(one.id, s.monthly.id)]).toBe("A");
    expect(view.missing).toBe(0);
    const [row] = await listMarkSheets(s.subjectTeacher, { examTermId: s.term.id, scope: "mine" });
    expect(row.monthly.entered).toBe(2);
    // The database never stores a mark and an absence together (checked while the sheet is still a draft).
    await rejectsWith(
      t.db.update(schema.marks).set({ isAbsent: true, marksObtained: "5" }).where(eq(schema.marks.enrollmentId, two.id)),
      /marks_absent_has_no_mark|check constraint|One of the values is not allowed/,
    );
    await submitMarkSheet(s.subjectTeacher, monthlyKey);
    await approveMarkSheet(s.classTeacher, { sheetId: view.sheetId! });
  });

  it("gives a student absent throughout no position and an ABSENT card, and still lets the result be approved", async () => {
    const result = { examTermId: s.term.id, sectionId: s.section.id, stage: "monthly" as const };
    const view = await getClassResult(s.classTeacher, result);
    const [one, two] = view.students;
    expect(one).toMatchObject({ absentAll: true, position: null, absent: [s.monthly.id] });
    expect(two).toMatchObject({ absentAll: false, position: 1 });
    expect(view.readiness.blockers).toEqual([]);
    const cards = await buildReportCards(s.classTeacher, result);
    expect(cards.cards[0].view).toMatchObject({ result: "ABSENT", absent: true, total: "—", pct: "—", grade: "—", passed: false, failed: false, incomplete: false });
    expect(cards.cards[0].view.rows[0]).toMatchObject({ m: "A", ob: "A", pct: "—", grade: "—", pass: false, fail: false });
    expect(cards.cards[1].view).toMatchObject({ result: "PASS", total: "20", pct: "80.00" });
    await classApproveResult(s.classTeacher, result);
  });

  it("counts an absence as 0 when the student sat the other component", async () => {
    const [one, two] = s.enrollments;
    await saveMarks(s.subjectTeacher, { ...termKey, marks: [{ enrollmentId: one.id, assessmentId: s.termExam.id, value: "60" }, { enrollmentId: two.id, assessmentId: s.termExam.id, value: "A" }] });
    await submitMarkSheet(s.subjectTeacher, termKey);
    await approveMarkSheet(s.classTeacher, { sheetId: (await getMarkSheet(s.classTeacher, termKey)).sheetId! });
    const result = { examTermId: s.term.id, sectionId: s.section.id, stage: "term" as const };
    const view = await getClassResult(s.classTeacher, result);
    // Student One: A + 60 = 60/100 (pass); Student Two: 20 + A = 20/100 (fail).
    expect(view.students.map((st) => [st.absentAll, st.outcome.status, st.outcome.percentage?.toString(), st.position])).toEqual([
      [false, "Pass", "60", 1],
      [false, "Fail", "20", 2],
    ]);
    const cards = await buildReportCards(s.classTeacher, result);
    expect(cards.cards[0].view.rows[0]).toMatchObject({ m: "A", t: "60", ob: "60" });
    expect(cards.cards[1].view.rows[0]).toMatchObject({ m: "20", t: "A", ob: "20", fail: true });
  });
});
