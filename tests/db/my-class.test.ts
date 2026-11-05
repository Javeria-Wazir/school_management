import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/server/db/schema";
import { approveMarkSheet, saveMarks, submitMarkSheet } from "@/server/services/marks";
import {
  addSubjectToClass,
  deleteStudentRecord,
  getMyClass,
  myClassSections,
  removeStudentFromClass,
  restoreStudentToClass,
  sectionsWithClassTeachers,
  setTeacherClass,
  updateMyClassSubject,
} from "@/server/services/my-class";
import { classApproveResult, reopenResult } from "@/server/services/results";
import { addUser, createTestDb, rejectsWith, seedSchool, type TestDb } from "./helpers";

let t: TestDb;
let s: Awaited<ReturnType<typeof seedSchool>>;
let maths: { id: string };

beforeAll(async () => {
  t = await createTestDb();
  s = await seedSchool(t.db);
  await t.db.update(schema.schoolSettings).set({ currentAcademicYearId: s.year.id });
  [maths] = await t.db.insert(schema.subjects).values({ name: "Mathematics", code: "MATHS" }).returning();
});
afterAll(() => t.close());

describe("my class (class teacher)", () => {
  it("shows only the teacher's own class, and refuses other teachers", async () => {
    expect(await myClassSections(s.classTeacher)).toEqual([{ id: s.section.id, label: "Class 6 A" }]);
    expect(await myClassSections(s.subjectTeacher)).toEqual([]);
    const view = await getMyClass(s.classTeacher, s.section.id);
    expect(view.students.map((st) => [st.fullName, st.active, st.hasRecords])).toEqual([
      ["Student One", true, false],
      ["Student Two", true, false],
    ]);
    expect(view.subjects.map((x) => x.code)).toEqual(["ENG"]);
    expect(view.addable.map((x) => x.code)).toEqual(["MATHS"]);
    await rejectsWith(getMyClass(s.subjectTeacher, s.section.id), /Only the class teacher/);
  });

  it("removes and restores a student, keeping the record", async () => {
    const [one] = s.enrollments;
    await rejectsWith(removeStudentFromClass(s.classTeacher, { enrollmentId: one.id, reason: "x" }), /at least 5/);
    await rejectsWith(removeStudentFromClass(s.subjectTeacher, { enrollmentId: one.id, reason: "Left the school" }), /Only the class teacher/);
    await removeStudentFromClass(s.classTeacher, { enrollmentId: one.id, reason: "Left the school" });
    expect((await getMyClass(s.classTeacher, s.section.id)).students[0].active).toBe(false);
    await restoreStudentToClass(s.classTeacher, one.id);
    expect((await getMyClass(s.classTeacher, s.section.id)).students[0].active).toBe(true);
  });

  it("deletes a student only when nothing depends on the record", async () => {
    const [one, two] = s.enrollments;
    const monthlyKey = { examTermId: s.term.id, sectionId: s.section.id, classSubjectId: s.classSubject.id, stage: "monthly" as const };
    await saveMarks(s.subjectTeacher, { ...monthlyKey, marks: [{ enrollmentId: one.id, assessmentId: s.monthly.id, value: "20" }] });
    expect((await getMyClass(s.classTeacher, s.section.id)).students.map((st) => st.hasRecords)).toEqual([true, false]);
    await rejectsWith(deleteStudentRecord(s.classTeacher, { enrollmentId: one.id, reason: "Added by mistake" }), /has marks or other records/);
    await deleteStudentRecord(s.classTeacher, { enrollmentId: two.id, reason: "Added by mistake" });
    expect(await t.db.select().from(schema.students).where(eq(schema.students.id, two.studentId))).toEqual([]);
    expect((await getMyClass(s.classTeacher, s.section.id)).students).toHaveLength(1);
    // The audit log keeps the deletion and its reason.
    const [log] = await t.db.select().from(schema.auditLogs).where(and(eq(schema.auditLogs.tableName, "students"), eq(schema.auditLogs.action, "DELETE")));
    expect(log.reason).toBe("Student deleted: Added by mistake");
  });

  it("adds a subject with its papers, changes its settings, and switches it off", async () => {
    await addSubjectToClass(s.classTeacher, { sectionId: s.section.id, subjectId: maths.id });
    await rejectsWith(addSubjectToClass(s.classTeacher, { sectionId: s.section.id, subjectId: maths.id }), /already in the class/);
    let view = await getMyClass(s.classTeacher, s.section.id);
    const mathsRow = view.subjects.find((x) => x.code === "MATHS")!;
    expect(mathsRow).toMatchObject({ isActive: true, isCompulsory: true, includeInTotal: true });
    const papers = await t.db.select().from(schema.assessments).where(eq(schema.assessments.classSubjectId, mathsRow.classSubjectId));
    expect(papers.map((p) => p.maxMarks).sort()).toEqual(["25.00", "75.00"]);
    await updateMyClassSubject(s.classTeacher, { sectionId: s.section.id, classSubjectId: mathsRow.classSubjectId, isCompulsory: false, includeInTotal: false, isActive: false });
    view = await getMyClass(s.classTeacher, s.section.id);
    expect(view.subjects.find((x) => x.code === "MATHS")).toMatchObject({ isActive: false, isCompulsory: false, includeInTotal: false });
    // Adding it again switches it back on.
    await addSubjectToClass(s.classTeacher, { sectionId: s.section.id, subjectId: maths.id });
    expect((await getMyClass(s.classTeacher, s.section.id)).subjects.find((x) => x.code === "MATHS")?.isActive).toBe(true);
    await updateMyClassSubject(s.classTeacher, { sectionId: s.section.id, classSubjectId: mathsRow.classSubjectId, isCompulsory: true, includeInTotal: true, isActive: false });
    await rejectsWith(updateMyClassSubject(s.subjectTeacher, { sectionId: s.section.id, classSubjectId: mathsRow.classSubjectId, isCompulsory: true, includeInTotal: true, isActive: true }), /Only the class teacher/);
  });

  it("refuses changes while the class result is approved", async () => {
    const monthlyKey = { examTermId: s.term.id, sectionId: s.section.id, classSubjectId: s.classSubject.id, stage: "monthly" as const };
    await submitMarkSheet(s.subjectTeacher, monthlyKey);
    await approveMarkSheet(s.classTeacher, { sheetId: s.monthlySheet.id });
    const result = { examTermId: s.term.id, sectionId: s.section.id, stage: "monthly" as const };
    await classApproveResult(s.classTeacher, result);
    expect((await getMyClass(s.classTeacher, s.section.id)).locked).toBe(true);
    await rejectsWith(removeStudentFromClass(s.classTeacher, { enrollmentId: s.enrollments[0].id, reason: "Left the school" }), /result is approved/);
    await rejectsWith(addSubjectToClass(s.classTeacher, { sectionId: s.section.id, subjectId: maths.id }), /result is approved/);
    await reopenResult(s.admin, { ...result, reason: "Testing the class page" });
    expect((await getMyClass(s.classTeacher, s.section.id)).locked).toBe(false);
  });
});

describe("a teacher's class (principal)", () => {
  it("moves a teacher to another class and replaces that class's teacher", async () => {
    const [sectionB] = await t.db.insert(schema.sections).values({ classId: s.klass.id, academicYearId: s.year.id, name: "B" }).returning();
    const newcomer = await addUser(t.db, { fullName: "New Teacher" });
    await rejectsWith(setTeacherClass(s.classTeacher, { teacherId: newcomer.user.id, sectionId: sectionB.id }), /Only the principal/);
    expect(await setTeacherClass(s.admin, { teacherId: newcomer.user.id, sectionId: sectionB.id })).toEqual({ replaced: null });
    // Moving the old class teacher of A to B: B's teacher is replaced and A is left without one.
    expect(await setTeacherClass(s.admin, { teacherId: s.classTeacher.user.id, sectionId: sectionB.id })).toEqual({ replaced: "New Teacher" });
    const rows = await sectionsWithClassTeachers(t.db);
    expect(rows.map((r) => [r.label, r.classTeacherId])).toEqual([
      ["Class 6 A", null],
      ["Class 6 B", s.classTeacher.user.id],
    ]);
    await setTeacherClass(s.admin, { teacherId: s.classTeacher.user.id, sectionId: "none" });
    expect((await sectionsWithClassTeachers(t.db)).every((r) => r.classTeacherId === null)).toBe(true);
    const inactive = await addUser(t.db, { isActive: false });
    await rejectsWith(setTeacherClass(s.admin, { teacherId: inactive.user.id, sectionId: sectionB.id }), /inactive/);
  });
});
