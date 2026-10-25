import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/server/db/schema";
import { createAcademicYear, listAcademicYears } from "@/server/services/academic-years";
import { listAssignmentGrid, setAssignment } from "@/server/services/assignments";
import { createClass, createSection, deleteClass, deleteSection, listClasses, listSections, updateSection } from "@/server/services/classes";
import {
  createExamTerm,
  deleteExamTerm,
  listTermAssessments,
  prepareTermAssessments,
  setCurrentExamTerm,
  setMaxMarks,
  updateAssessmentType,
} from "@/server/services/exam-terms";
import { deleteGradingScale, listGradingScales, saveGradingScale, setDefaultGradingScale } from "@/server/services/grading";
import { getSchoolSettings } from "@/server/services/settings";
import {
  createStudent,
  listEnrolledStudents,
  nextRollNumber,
  setStudentStatus,
  updateEnrollment,
  updateStudent,
  updateStudentWithEnrollment,
} from "@/server/services/students";
import { listStaff } from "@/server/services/staff";
import { addClassSubjects, copyClassSubjects, createSubject, listClassSubjects, listSubjects, removeClassSubject, updateClassSubject } from "@/server/services/subjects";
import { addUser, createTestDb, rejectsWith, type TestDb } from "./helpers";

let t: TestDb;
let admin: Awaited<ReturnType<typeof addUser>>;
let teacher: Awaited<ReturnType<typeof addUser>>;
let yearId: string;
let class6: string;
let sectionA: string;
let sectionB: string;
let english: string;
let maths: string;

beforeAll(async () => {
  t = await createTestDb();
  admin = await addUser(t.db, { role: "admin" });
  teacher = await addUser(t.db, { fullName: "Sana Teacher" });
  yearId = (await createAcademicYear(admin, { name: "2026-2027", startDate: "2026-04-01", endDate: "2027-03-31" })).id;
  class6 = (await createClass(admin, { name: "Class 6", sortOrder: "6" })).id;
  sectionA = (await createSection(admin, { classId: class6, academicYearId: yearId, name: "A", classTeacherId: teacher.user.id })).id;
  sectionB = (await createSection(admin, { classId: class6, academicYearId: yearId, name: "B" })).id;
  english = (await createSubject(admin, { name: "English", code: "eng", sortOrder: "1" })).id;
  maths = (await createSubject(admin, { name: "Mathematics", code: "MATH", sortOrder: "2" })).id;
});
afterAll(() => t.close());

describe("permissions", () => {
  it("refuses every structure change for teachers", async () => {
    const forbidden = /Only the principal or an administrator/;
    await rejectsWith(createClass(teacher, { name: "X" }), forbidden);
    await rejectsWith(createSection(teacher, { classId: class6, academicYearId: yearId, name: "Z" }), forbidden);
    await rejectsWith(createSubject(teacher, { name: "Art", code: "ART" }), forbidden);
    await rejectsWith(addClassSubjects(teacher, { classId: class6, academicYearId: yearId, subjectIds: [english] }), forbidden);
    await rejectsWith(
      createStudent(teacher, { studentCode: "T1", fullName: "X", academicYearId: yearId, sectionId: sectionA, rollNumber: "99" }),
      forbidden,
    );
    await rejectsWith(setAssignment(teacher, { sectionId: sectionA, classSubjectId: english, teacherId: teacher.user.id }), forbidden);
    await rejectsWith(createExamTerm(teacher, { academicYearId: yearId, name: "T" }), forbidden);
    await rejectsWith(saveGradingScale(teacher, { name: "S", subjectPassPercentage: "33", overallPassPercentage: "33", bands: "[]" }), forbidden);
  });
});

describe("classes and sections", () => {
  it("lists sections with class teacher and keeps names unique per class and year", async () => {
    const rows = await listSections(t.db, yearId);
    expect(rows.map((r) => [r.className, r.name, r.classTeacherName])).toEqual([
      ["Class 6", "A", "Sana Teacher"],
      ["Class 6", "B", null],
    ]);
    await rejectsWith(createSection(admin, { classId: class6, academicYearId: yearId, name: "A" }), /already has a section with this name/);
    await rejectsWith(createClass(admin, { name: "class 6" }), /class with this name already exists/);
  });

  it("requires an active class teacher", async () => {
    const gone = await addUser(t.db, { isActive: false });
    await rejectsWith(updateSection(admin, { id: sectionB, name: "B", classTeacherId: gone.user.id, isActive: "on" }), /must be an active staff account/);
  });

  it("refuses to delete a class that has sections, but deletes an empty section", async () => {
    await rejectsWith(deleteClass(admin, class6), /has sections/);
    const temp = (await createSection(admin, { classId: class6, academicYearId: yearId, name: "TEMP" })).id;
    await deleteSection(admin, temp);
  });
});

describe("subjects and class subjects", () => {
  it("normalises codes, rejects duplicates and adds subjects to a class once", async () => {
    const subjectRows = await t.db.select().from(schema.subjects).where(eq(schema.subjects.id, english));
    expect(subjectRows[0].code).toBe("ENG");
    await rejectsWith(createSubject(admin, { name: "English Language", code: "ENG" }), /code already exists/);
    expect(await addClassSubjects(admin, { classId: class6, academicYearId: yearId, subjectIds: [english, maths] })).toEqual({ added: 2 });
    expect(await addClassSubjects(admin, { classId: class6, academicYearId: yearId, subjectIds: [english] })).toEqual({ added: 0 });
    const rows = await listClassSubjects(t.db, yearId, class6);
    expect(rows.map((r) => r.subjectName)).toEqual(["English", "Mathematics"]);
  });

  it("updates compulsory / counts-in-total flags and copies subjects to a new year", async () => {
    const [eng] = await listClassSubjects(t.db, yearId, class6);
    await updateClassSubject(admin, { id: eng.id, includeInTotal: "on", sortOrder: "1", isActive: "on" });
    expect((await listClassSubjects(t.db, yearId, class6))[0]).toMatchObject({ isCompulsory: false, includeInTotal: true });
    await updateClassSubject(admin, { id: eng.id, isCompulsory: "on", includeInTotal: "on", sortOrder: "1", isActive: "on" });

    const nextYear = (await createAcademicYear(admin, { name: "2027-2028", startDate: "2027-04-01", endDate: "2028-03-31" })).id;
    expect(await copyClassSubjects(admin, { fromYearId: yearId, toYearId: nextYear })).toEqual({ added: 2 });
    expect(await copyClassSubjects(admin, { fromYearId: yearId, toYearId: nextYear })).toEqual({ added: 0 });
  });
});

describe("students and enrolments", () => {
  it("adds and enrols a student, normalising a local phone number", async () => {
    await createStudent(admin, {
      studentCode: "S-001",
      fullName: "Ali Raza",
      guardianName: "Raza Khan",
      guardianPhone: "0300 1234567",
      dateOfBirth: "2014-05-31",
      academicYearId: yearId,
      sectionId: sectionA,
      rollNumber: "1",
    });
    const [row] = await listEnrolledStudents(t.db, yearId, { search: "ali" });
    expect(row).toMatchObject({ studentCode: "S-001", guardianPhone: "+923001234567", className: "Class 6", sectionName: "A", rollNumber: 1 });
    expect(await nextRollNumber(t.db, yearId, class6)).toBe(2);
  });

  it("validates codes, phones, dates, roll numbers and the section's year", async () => {
    const base = { fullName: "Test", academicYearId: yearId, sectionId: sectionA };
    await rejectsWith(createStudent(admin, { ...base, studentCode: "S 002", rollNumber: "2" }), /no spaces/);
    await rejectsWith(createStudent(admin, { ...base, studentCode: "S-002", rollNumber: "1" }), /roll number is already used/);
    await rejectsWith(createStudent(admin, { ...base, studentCode: "s-001", rollNumber: "5" }), /student with this ID already exists/);
    await rejectsWith(createStudent(admin, { ...base, studentCode: "S-003", rollNumber: "3", guardianPhone: "12345" }), /start with \+/);
    await rejectsWith(createStudent(admin, { ...base, studentCode: "S-004", rollNumber: "4", dateOfBirth: "2099-01-01" }), /not plausible/);
    const otherYear = (await createAcademicYear(admin, { name: "2030-2031", startDate: "2030-04-01", endDate: "2031-03-31" })).id;
    await rejectsWith(createStudent(admin, { ...base, academicYearId: otherYear, studentCode: "S-005", rollNumber: "5" }), /section of this academic year/);
  });

  it("moves a student between sections and withdraws them when archived", async () => {
    const created = await createStudent(admin, { studentCode: "S-010", fullName: "Hina Ali", academicYearId: yearId, sectionId: sectionA, rollNumber: "10" });
    await updateEnrollment(admin, { id: created.enrollmentId, sectionId: sectionB, rollNumber: "11" });
    expect((await listEnrolledStudents(t.db, yearId, { sectionId: sectionB }))[0]).toMatchObject({ fullName: "Hina Ali", rollNumber: 11 });
    await updateStudent(admin, { id: created.studentId, studentCode: "S-010", fullName: "Hina Ali Khan", guardianPhone: "+92 321 7654321" });
    await setStudentStatus(admin, { id: created.studentId, status: "transferred" });
    expect(await listEnrolledStudents(t.db, yearId, { sectionId: sectionB })).toHaveLength(0);
    expect((await listEnrolledStudents(t.db, yearId, { sectionId: sectionB, includeWithdrawn: true }))[0].enrollmentStatus).toBe("withdrawn");
  });
});

describe("editing a student with their enrolment", () => {
  it("saves both together, or neither when the roll number is taken", async () => {
    const one = await createStudent(admin, { studentCode: "S-020", fullName: "Edit Me", academicYearId: yearId, sectionId: sectionA, rollNumber: "20" });
    await createStudent(admin, { studentCode: "S-021", fullName: "Roll Owner", academicYearId: yearId, sectionId: sectionA, rollNumber: "21" });
    const base = { studentId: one.studentId, enrollmentId: one.enrollmentId, studentCode: "S-020", sectionId: sectionB };
    await rejectsWith(updateStudentWithEnrollment(admin, { ...base, fullName: "Renamed", rollNumber: "21" }), /roll number is already used/);
    let row = (await listEnrolledStudents(t.db, yearId, { search: "S-020" }))[0];
    expect(row).toMatchObject({ fullName: "Edit Me", sectionName: "A", rollNumber: 20 });
    await updateStudentWithEnrollment(admin, { ...base, fullName: "Renamed", rollNumber: "22" });
    row = (await listEnrolledStudents(t.db, yearId, { search: "S-020" }))[0];
    expect(row).toMatchObject({ fullName: "Renamed", sectionName: "B", rollNumber: 22 });
  });
});

describe("teacher assignments", () => {
  it("shows every section × subject and assigns, replaces and removes teachers", async () => {
    const grid = await listAssignmentGrid(t.db, yearId);
    expect(grid).toHaveLength(4); // 2 sections × 2 subjects
    const engA = grid.find((c) => c.sectionName === "A" && c.subjectName === "English")!;
    const other = await addUser(t.db, { fullName: "Bilal Teacher" });
    await setAssignment(admin, { sectionId: engA.sectionId, classSubjectId: engA.classSubjectId, teacherId: teacher.user.id });
    await setAssignment(admin, { sectionId: engA.sectionId, classSubjectId: engA.classSubjectId, teacherId: other.user.id });
    let cell = (await listAssignmentGrid(t.db, yearId)).find((c) => c.sectionId === engA.sectionId && c.classSubjectId === engA.classSubjectId)!;
    expect(cell.teacherName).toBe("Bilal Teacher");
    await setAssignment(admin, { sectionId: engA.sectionId, classSubjectId: engA.classSubjectId, teacherId: "" });
    cell = (await listAssignmentGrid(t.db, yearId)).find((c) => c.sectionId === engA.sectionId && c.classSubjectId === engA.classSubjectId)!;
    expect(cell.teacherId).toBeNull();
  });

  it("refuses inactive teachers and subjects the section does not study", async () => {
    const [cell] = await listAssignmentGrid(t.db, yearId);
    const gone = await addUser(t.db, { isActive: false });
    await rejectsWith(setAssignment(admin, { sectionId: cell.sectionId, classSubjectId: cell.classSubjectId, teacherId: gone.user.id }), /inactive/);
    const [otherYearCs] = await t.db.select().from(schema.classSubjects).where(and(eq(schema.classSubjects.classId, class6)));
    const foreign = (await t.db.select().from(schema.classSubjects)).find((cs) => cs.academicYearId !== yearId) ?? otherYearCs;
    await rejectsWith(setAssignment(admin, { sectionId: cell.sectionId, classSubjectId: foreign.id, teacherId: teacher.user.id }), /not taught in that section/);
  });
});

describe("exam terms and maximum marks", () => {
  it("creates a term, prepares Monthly 25 + Term 75 for each subject and allows overrides", async () => {
    const termId = (await createExamTerm(admin, { academicYearId: yearId, name: "First Term", startDate: "2026-09-01", endDate: "2026-09-20" })).id;
    expect(await prepareTermAssessments(admin, termId)).toEqual({ created: 4 }); // 2 subjects × 2 components
    expect(await prepareTermAssessments(admin, termId)).toEqual({ created: 0 });
    const rows = await listTermAssessments(t.db, termId);
    expect(rows.map((r) => `${r.subjectName}:${r.assessmentTypeName}:${r.maxMarks}`)).toEqual([
      "English:Monthly Test:25.00",
      "English:Term Examination:75.00",
      "Mathematics:Monthly Test:25.00",
      "Mathematics:Term Examination:75.00",
    ]);
    await setMaxMarks(admin, { assessmentId: rows[0].assessmentId, maxMarks: "20" });
    await rejectsWith(setMaxMarks(admin, { assessmentId: rows[0].assessmentId, maxMarks: "0" }), /more than 0/);
    // Changing the type's default does not touch prepared assessments.
    const [monthly] = await t.db.select().from(schema.assessmentTypes).where(eq(schema.assessmentTypes.code, "MONTHLY"));
    await updateAssessmentType(admin, { id: monthly.id, name: "Monthly Test", defaultMaxMarks: "30", sortOrder: "1", isActive: "on" });
    expect((await listTermAssessments(t.db, termId))[0].maxMarks).toBe("20.00");

    await rejectsWith(deleteExamTerm(admin, termId), /already has assessments/);
    await rejectsWith(createExamTerm(admin, { academicYearId: yearId, name: "Bad", startDate: "2026-09-20", endDate: "2026-09-01" }), /on or after/);
  });

  it("makes a term current only if it is active and in the current year", async () => {
    const [term] = await t.db.select().from(schema.examTerms).where(eq(schema.examTerms.academicYearId, yearId));
    await setCurrentExamTerm(admin, term.id);
    expect((await getSchoolSettings(t.db)).currentExamTermName).toBe("First Term");
    const later = (await t.db.select().from(schema.academicYears)).find((y) => y.name === "2027-2028")!;
    const otherTerm = (await createExamTerm(admin, { academicYearId: later.id, name: "First Term" })).id;
    await rejectsWith(setCurrentExamTerm(admin, otherTerm), /must belong to the current academic year/);
  });
});

describe("grading scales", () => {
  const bands = JSON.stringify([
    { grade: "A", minPercentage: "80", remark: "Excellent" },
    { grade: "B", minPercentage: "60" },
    { grade: "C", minPercentage: "40" },
    { grade: "F", minPercentage: "0", remark: "Fail" },
  ]);

  it("creates a scale, validates bands and switches the default", async () => {
    const { id } = await saveGradingScale(admin, { name: "Senior Scale", subjectPassPercentage: "40", overallPassPercentage: "40", requireAllCompulsoryPass: "on", bands });
    let scales = await listGradingScales(t.db);
    const senior = scales.find((s) => s.id === id)!;
    expect(senior).toMatchObject({ isDefault: false, locked: false });
    expect(senior.bands.map((b) => b.grade)).toEqual(["A", "B", "C", "F"]);

    await rejectsWith(
      saveGradingScale(admin, { name: "Bad", subjectPassPercentage: "40", overallPassPercentage: "40", bands: JSON.stringify([{ grade: "A", minPercentage: "50" }]) }),
      /start at 0%/,
    );
    await rejectsWith(saveGradingScale(admin, { name: "Bad", subjectPassPercentage: "140", overallPassPercentage: "40", bands }), /0 to 100/);

    await setDefaultGradingScale(admin, id);
    scales = await listGradingScales(t.db);
    expect(scales.filter((s) => s.isDefault).map((s) => s.name)).toEqual(["Senior Scale"]);
    await rejectsWith(deleteGradingScale(admin, id), /default scale cannot be deleted/);
    const standard = scales.find((s) => s.name === "Standard Scale")!;
    await deleteGradingScale(admin, standard.id);
  });

  it("freezes a scale used by an approved result", async () => {
    const [scale] = await listGradingScales(t.db);
    const [term] = await t.db.select().from(schema.examTerms).where(eq(schema.examTerms.academicYearId, yearId));
    await t.db.insert(schema.resultApprovals).values({ examTermId: term.id, sectionId: sectionA, status: "class_approved", classApprovedAt: new Date() });
    expect((await listGradingScales(t.db)).find((s) => s.id === scale.id)?.locked).toBe(true);
    await rejectsWith(
      saveGradingScale(admin, { id: scale.id, name: scale.name, subjectPassPercentage: "50", overallPassPercentage: "50", bands }),
      /used by approved results/,
    );
    await rejectsWith(removeClassSubject(admin, (await listClassSubjects(t.db, yearId, class6))[0].id), /already have assessments for this subject/);
  });
});

describe("list counts (regression: correlated subqueries must reference the outer row)", () => {
  it("counts sections per class, classes per subject, and a year's sections, terms and students", async () => {
    const classesRows = await listClasses(t.db, yearId);
    expect(classesRows.find((c) => c.id === class6)?.sectionCount).toBe(2);
    const subjectRows = await listSubjects(t.db, yearId);
    expect(subjectRows.find((s) => s.id === english)?.classCount).toBe(1);
    const year = (await listAcademicYears(t.db)).find((y) => y.id === yearId)!;
    expect(year).toMatchObject({ sectionCount: 2, termCount: 1, studentCount: 3 });
  });

  it("counts a teacher's class-teacher sections and subject assignments, and a scale's terms", async () => {
    const [cell] = await listAssignmentGrid(t.db, yearId);
    await setAssignment(admin, { sectionId: cell.sectionId, classSubjectId: cell.classSubjectId, teacherId: teacher.user.id });
    const row = (await listStaff(admin)).find((s) => s.id === teacher.user.id)!;
    expect(row).toMatchObject({ classTeacherOf: 1, subjectAssignments: 1 });
    const [scale] = await listGradingScales(t.db);
    await createExamTerm(admin, { academicYearId: yearId, name: "Special Term", gradingScaleId: scale.id });
    expect((await listGradingScales(t.db)).find((s) => s.id === scale.id)?.termCount).toBe(1);
  });
});
