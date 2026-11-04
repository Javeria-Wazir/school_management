import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/server/db/schema";
import { listTermAssessments, prepareTermAssessments } from "@/server/services/exam-terms";
import { approveMarkSheet, cellKey, getMarkSheet, saveMarks, submitMarkSheet } from "@/server/services/marks";
import { buildReportCards, groupLabel } from "@/server/services/report-cards";
import { getClassResult } from "@/server/services/results";
import { addClassSubjects, createSubject } from "@/server/services/subjects";
import { createTestDb, rejectsWith, seedSchool, type TestDb } from "./helpers";

let t: TestDb;
let s: Awaited<ReturnType<typeof seedSchool>>;
let computer: { classSubjectId: string; monthlyId: string };

beforeAll(async () => {
  t = await createTestDb();
  s = await seedSchool(t.db);
  // A second subject, Computer, that only some students take.
  const subjectId = (await createSubject(s.admin, { name: "Computer", code: "COMP" })).id;
  await addClassSubjects(s.admin, { classId: s.klass.id, academicYearId: s.year.id, subjectIds: [subjectId] });
  await prepareTermAssessments(s.admin, s.term.id);
  const monthly = (await listTermAssessments(t.db, s.term.id)).find((a) => a.subjectName === "Computer" && a.assessmentTypeName === "Monthly Test")!;
  const [cs] = await t.db.select().from(schema.classSubjects).where(eq(schema.classSubjects.subjectId, subjectId));
  computer = { classSubjectId: cs.id, monthlyId: monthly.assessmentId };
});
afterAll(() => t.close());

describe("subjects a student does not take", () => {
  it("accepts X (either case), which is not missing, and judges the student only on the subjects they take", async () => {
    const [one, two] = s.enrollments;
    const english = { examTermId: s.term.id, sectionId: s.section.id, classSubjectId: s.classSubject.id, stage: "monthly" as const };
    const comp = { examTermId: s.term.id, sectionId: s.section.id, classSubjectId: computer.classSubjectId, stage: "monthly" as const };
    await saveMarks(s.subjectTeacher, { ...english, marks: [{ enrollmentId: one.id, assessmentId: s.monthly.id, value: "20" }, { enrollmentId: two.id, assessmentId: s.monthly.id, value: "15" }] });
    expect(
      await saveMarks(s.admin, { ...comp, marks: [{ enrollmentId: one.id, assessmentId: computer.monthlyId, value: "x" }, { enrollmentId: two.id, assessmentId: computer.monthlyId, value: "10" }] }),
    ).toEqual({ saved: 2, missing: 0 });
    const view = await getMarkSheet(s.admin, comp);
    expect(view.marks[cellKey(one.id, computer.monthlyId)]).toBe("X");
    // The database never stores "not taken" together with a mark, an absence or a new admission.
    await rejectsWith(
      t.db.update(schema.marks).set({ isNotTaken: true }).where(eq(schema.marks.enrollmentId, two.id)),
      /marks_not_taken_has_no_mark|check constraint|One of the values is not allowed/,
    );
    for (const [ctx, key] of [[s.subjectTeacher, english], [s.admin, comp]] as const) {
      await submitMarkSheet(ctx, key);
      await approveMarkSheet(s.classTeacher, { sheetId: (await getMarkSheet(s.classTeacher, key)).sheetId! });
    }

    const result = { examTermId: s.term.id, sectionId: s.section.id, stage: "monthly" as const };
    const res = await getClassResult(s.classTeacher, result);
    // Student One: English only, 20/25 = 80%; Student Two: 15 + 10 = 25/50 = 50%.
    expect(res.students.map((st) => [st.notTaken.length, st.outcome.subjects.length, st.outcome.grandObtained?.toString(), st.outcome.grandMaximum.toString(), st.outcome.percentage?.toString(), st.position])).toEqual([
      [1, 1, "20", "25", "80", 1],
      [0, 2, "25", "50", "50", 2],
    ]);
    expect(res.readiness.blockers).toEqual([]);

    const cards = await buildReportCards(s.classTeacher, result);
    expect(cards.cards[0].view.rows.map((r) => r.name)).toEqual(["English"]);
    expect(cards.cards[0].view).toMatchObject({ total: "20", maxTotal: "25", pct: "80.00", result: "PASS", newAdmission: false, absent: false });
    expect(cards.cards[1].view.rows.map((r) => r.name).sort()).toEqual(["Computer", "English"]);
  });

  it("names each student's own group from the subjects they take", () => {
    const subjects = (...codes: string[]) => codes.map((code) => ({ code, includeInTotal: true }));
    expect(groupLabel(subjects("ENG", "PHY", "CHEM", "BIO"))).toBe("Science group");
    expect(groupLabel(subjects("ENG", "PHY", "CHEM", "COMP"))).toBe("Computer group");
    expect(groupLabel(subjects("ENG", "PHY", "CHEM", "BIO", "COMP"))).toBe("Science group");
    expect(groupLabel(subjects("ENG", "URDU", "COMP"))).toBe("General group");
    expect(groupLabel([{ code: "PHY", includeInTotal: false }, { code: "ENG", includeInTotal: true }])).toBe("General group");
  });
});
