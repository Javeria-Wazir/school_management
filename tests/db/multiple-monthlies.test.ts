import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/server/db/schema";
import { updateExamTerm } from "@/server/services/exam-terms";
import { approveMarkSheet, getMarkSheet, listMarkSheets, saveMarks, submitMarkSheet } from "@/server/services/marks";
import { buildReportCards } from "@/server/services/report-cards";
import { classApproveResult, getClassResult, listClassResults } from "@/server/services/results";
import { createTestDb, rejectsWith, seedSchool, type TestDb } from "./helpers";

// A term with two monthly tests: each has its own sheets and result; the term result includes both.
let t: TestDb;
let s: Awaited<ReturnType<typeof seedSchool>>;
let monthly2: typeof schema.assessments.$inferSelect;
const cell = (enrollmentId: string, assessmentId: string, value: string) => ({ enrollmentId, assessmentId, value });
const key = (stage: schema.ResultStage) => ({ examTermId: s.term.id, sectionId: s.section.id, classSubjectId: s.classSubject.id, stage });
const resultKey = (stage: schema.ResultStage) => ({ examTermId: s.term.id, sectionId: s.section.id, stage });

async function enterAndApprove(stage: schema.ResultStage, assessmentId: string, values: [string, string]) {
  const [one, two] = s.enrollments;
  await saveMarks(s.subjectTeacher, { ...key(stage), marks: [cell(one.id, assessmentId, values[0]), cell(two.id, assessmentId, values[1])] });
  await submitMarkSheet(s.subjectTeacher, key(stage));
  await approveMarkSheet(s.classTeacher, { sheetId: (await getMarkSheet(s.classTeacher, key(stage))).sheetId! });
}

beforeAll(async () => {
  t = await createTestDb();
  s = await seedSchool(t.db);
  await updateExamTerm(s.admin, { id: s.term.id, name: s.term.name, monthlyTests: "2", isActive: "on" });
  const [type] = await t.db.select().from(schema.assessmentTypes).where(eq(schema.assessmentTypes.code, "MONTHLY_2"));
  [monthly2] = await t.db.select().from(schema.assessments).where(eq(schema.assessments.assessmentTypeId, type.id));
});
afterAll(() => t.close());

describe("a term with two monthly tests", () => {
  it("adds Monthly Test 2 to the prepared term and gives it its own sheet", async () => {
    expect(monthly2.maxMarks).toBe("25.00");
    const sheet = await getMarkSheet(s.subjectTeacher, key("monthly_2"));
    expect(sheet.components.map((c) => c.code)).toEqual(["MONTHLY_2"]);
    expect(sheet.stages.map((x) => [x.stage, x.components])).toEqual([
      ["monthly", 1],
      ["monthly_2", 1],
      ["term", 1],
    ]);
    const [row] = await listMarkSheets(s.subjectTeacher, { examTermId: s.term.id, scope: "mine" });
    expect(row.stages.map((x) => x.stage)).toEqual(["monthly", "monthly_2", "term"]);
    // A monthly test the term does not have.
    await rejectsWith(getMarkSheet(s.subjectTeacher, key("monthly_3")), /not found/i);
    await rejectsWith(getClassResult(s.classTeacher, resultKey("monthly_3")), /not found/i);
  });

  it("keeps each Monthly Test's marks on its own sheet", async () => {
    await rejectsWith(saveMarks(s.subjectTeacher, { ...key("monthly_2"), marks: [cell(s.enrollments[0].id, s.monthly.id, "5")] }), /has changed/);
    // The database refuses it too, whoever writes.
    const sheet = await t.db
      .insert(schema.markSheets)
      .values({ ...key("monthly_2") })
      .onConflictDoNothing()
      .returning();
    const sheetId = sheet[0]?.id ?? (await getMarkSheet(s.subjectTeacher, key("monthly_2"))).sheetId!;
    await rejectsWith(
      t.db.insert(schema.marks).values({ markSheetId: sheetId, assessmentId: s.monthly.id, enrollmentId: s.enrollments[0].id, marksObtained: "5" }),
      /belong on the monthly mark sheet/,
    );
  });

  it("publishes Monthly Test 2 on its own, without locking Monthly Test 1", async () => {
    await enterAndApprove("monthly_2", monthly2.id, ["20", "A"]);
    const view = await getClassResult(s.classTeacher, resultKey("monthly_2"));
    expect(view.subjects.map((x) => x.components.map((c) => c.code))).toEqual([["MONTHLY_2"]]);
    expect(view.students.map((st) => [st.outcome.status, st.absentAll])).toEqual([
      ["Pass", false],
      ["Fail", true],
    ]);
    expect(view.stageStatuses.map((x) => x.stage)).toEqual(["monthly", "monthly_2", "term"]);
    await classApproveResult(s.classTeacher, resultKey("monthly_2"));
    expect((await getClassResult(s.classTeacher, resultKey("monthly_2"))).approval.status).toBe("class_approved");
    // Monthly Test 1 can still be entered.
    expect((await getMarkSheet(s.subjectTeacher, key("monthly"))).access.canEdit).toBe(true);
    const [row] = await listClassResults(s.admin, s.term.id);
    expect(row.stages.map((x) => [x.label, x.status, x.sheetsApproved, x.sheetsTotal])).toEqual([
      ["Monthly 1 result", "open", 0, 1],
      ["Monthly 2 result", "class_approved", 1, 1],
      ["Term result", "open", 1, 3],
    ]);
  });

  it("names the card after its Monthly Test", async () => {
    const set = await buildReportCards(s.classTeacher, { ...resultKey("monthly_2") });
    expect(set.termName).toBe(`${s.term.name} · Monthly Test 2`);
    expect(set.cards[0].view.monthlyOnly).toBe(true);
    expect(set.cards[0].view.rows[0]).toMatchObject({ m: "20", mm: "25" });
  });

  it("builds the term result from both Monthly Tests and the term examination", async () => {
    await enterAndApprove("monthly", s.monthly.id, ["10", "15"]);
    await enterAndApprove("term", s.termExam.id, ["60", "30"]);
    const view = await getClassResult(s.classTeacher, resultKey("term"));
    expect(view.subjects[0].components.map((c) => c.code)).toEqual(["MONTHLY", "MONTHLY_2", "TERM_EXAM"]);
    // Student One: 10 + 20 + 60 = 90 / 125; Student Two: 15 + A + 30 = 45 / 125.
    expect(view.students.map((st) => [st.outcome.grandObtained?.toString(), st.outcome.grandMaximum.toString()])).toEqual([
      ["90", "125"],
      ["45", "125"],
    ]);
    const set = await buildReportCards(s.classTeacher, { ...resultKey("term") });
    // The card's Monthly column adds the two Monthly Tests.
    expect(set.cards[0].view.rows[0]).toMatchObject({ m: "30", mm: "50", t: "60", tm: "75" });
    expect(set.cards[1].view.rows[0]).toMatchObject({ m: "15", mm: "50" });
  });

  it("will not drop a monthly test that already has marks", async () => {
    await rejectsWith(updateExamTerm(s.admin, { id: s.term.id, name: s.term.name, monthlyTests: "1", isActive: "on" }), /cannot go down/);
  });
});
