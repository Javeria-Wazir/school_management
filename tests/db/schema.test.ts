/**
 * The database's own safety net: constraints and triggers from the migrations, exercised directly
 * (bypassing the services) to prove that no code path can break these rules.
 */
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withActor } from "@/server/db/actor";
import * as schema from "@/server/db/schema";
import { addUser, createTestDb, rejectsWith, seedSchool, type TestDb } from "./helpers";

let t: TestDb;
let s: Awaited<ReturnType<typeof seedSchool>>;

beforeAll(async () => {
  t = await createTestDb();
  s = await seedSchool(t.db);
});
afterAll(() => t.close());

const setMark = (enrollmentIndex: number, assessmentId: string, value: string | null) =>
  t.db
    .insert(schema.marks)
    .values({ markSheetId: s.sheet.id, assessmentId, enrollmentId: s.enrollments[enrollmentIndex].id, marksObtained: value })
    .onConflictDoUpdate({ target: [schema.marks.assessmentId, schema.marks.enrollmentId], set: { marksObtained: value } });

describe("migrations and defaults", () => {
  it("creates the default configuration", async () => {
    const [settings] = await t.db.select().from(schema.schoolSettings);
    expect(settings.id).toBe(1);
    expect(settings.decimalPlaces).toBe(2);
    expect(settings.requirePrincipalApproval).toBe(true);

    const types = await t.db.select().from(schema.assessmentTypes).orderBy(schema.assessmentTypes.sortOrder);
    expect(types.map((x) => [x.code, x.defaultMaxMarks])).toEqual([
      ["MONTHLY", "25.00"],
      ["TERM_EXAM", "75.00"],
    ]);

    const [scale] = await t.db.select().from(schema.gradingScales).where(eq(schema.gradingScales.isDefault, true));
    expect(scale.name).toBe("Standard Scale");
    const bands = await t.db.select().from(schema.gradeBoundaries).where(eq(schema.gradeBoundaries.gradingScaleId, scale.id));
    expect(bands).toHaveLength(7);
    expect(bands.some((b) => b.minPercentage === "0.00")).toBe(true);
  });

  it("allows only one settings row", async () => {
    await rejectsWith(t.db.insert(schema.schoolSettings).values({ id: 2 }), /school_settings_singleton|check constraint/);
  });
});

describe("constraints", () => {
  it("rejects duplicate e-mails regardless of case", async () => {
    await addUser(t.db, { email: "dup@school.test" });
    await rejectsWith(addUser(t.db, { email: "DUP@School.test" }), /users_email_unique|duplicate key/);
  });

  it("rejects malformed phone numbers and student codes", async () => {
    await rejectsWith(t.db.update(schema.users).set({ phone: "0300-1234567" }).where(eq(schema.users.id, s.admin.user.id)), /users_phone_format|check constraint/);
    await rejectsWith(t.db.insert(schema.students).values({ studentCode: "bad code!", fullName: "X" }), /students_code_format|check constraint/);
  });

  it("keeps roll numbers unique within a class and year", async () => {
    const [student] = await t.db.insert(schema.students).values({ studentCode: "S-099", fullName: "Late Joiner" }).returning();
    await rejectsWith(
      t.db.insert(schema.enrollments).values({ studentId: student.id, academicYearId: s.year.id, classId: s.klass.id, sectionId: s.section.id, rollNumber: 1 }),
      /enrollments_roll_unique|duplicate key/,
    );
  });

  it("refuses an enrolment whose section belongs to another class", async () => {
    const [other] = await t.db.insert(schema.classes).values({ name: "Class 7" }).returning();
    const [student] = await t.db.insert(schema.students).values({ studentCode: "S-100", fullName: "Wrong Class" }).returning();
    await rejectsWith(
      t.db.insert(schema.enrollments).values({ studentId: student.id, academicYearId: s.year.id, classId: other.id, sectionId: s.section.id, rollNumber: 50 }),
      /section does not belong/,
    );
  });

  it("refuses a teacher assignment for a subject the class does not study", async () => {
    const [math] = await t.db.insert(schema.subjects).values({ name: "Mathematics", code: "MATH" }).returning();
    const [other] = await t.db.insert(schema.classes).values({ name: "Class 8" }).returning();
    const [cs] = await t.db.insert(schema.classSubjects).values({ classId: other.id, academicYearId: s.year.id, subjectId: math.id }).returning();
    await rejectsWith(
      t.db.insert(schema.teacherAssignments).values({ teacherId: s.subjectTeacher.user.id, sectionId: s.section.id, classSubjectId: cs.id }),
      /not configured for this section/,
    );
  });
});

describe("marks trigger", () => {
  it("accepts 0 as a real score and NULL as missing", async () => {
    await setMark(0, s.monthly.id, "0");
    await setMark(0, s.termExam.id, null);
    const rows = await t.db.select().from(schema.marks).where(eq(schema.marks.enrollmentId, s.enrollments[0].id));
    expect(rows.map((r) => r.marksObtained).sort()).toEqual(["0.00", null].sort());
  });

  it("rejects marks above the maximum or below zero", async () => {
    await rejectsWith(setMark(0, s.monthly.id, "26"), /between 0 and 25/);
    await rejectsWith(setMark(0, s.termExam.id, "-1"), /marks_non_negative|check constraint|between 0 and 75/);
  });

  it("rejects decimal marks unless the school allows them", async () => {
    await rejectsWith(setMark(1, s.monthly.id, "12.5"), /Decimal marks are not allowed/);
    await t.db.update(schema.schoolSettings).set({ allowDecimalMarks: true, decimalPlaces: 1 });
    await setMark(1, s.monthly.id, "12.5");
    await rejectsWith(setMark(1, s.monthly.id, "12.25"), /at most 1 decimal places/);
    await t.db.update(schema.schoolSettings).set({ allowDecimalMarks: false, decimalPlaces: 2 });
  });

  it("records who entered a mark", async () => {
    await withActor(t.db, s.subjectTeacher.user.id, (tx) =>
      tx.insert(schema.marks).values({ markSheetId: s.sheet.id, assessmentId: s.termExam.id, enrollmentId: s.enrollments[1].id, marksObtained: "70" }),
    );
    const [row] = await t.db
      .select()
      .from(schema.marks)
      .where(and(eq(schema.marks.assessmentId, s.termExam.id), eq(schema.marks.enrollmentId, s.enrollments[1].id)));
    expect(row.enteredBy).toBe(s.subjectTeacher.user.id);
  });

  it("locks marks once the sheet is submitted", async () => {
    await setMark(0, s.termExam.id, "50");
    await setMark(1, s.monthly.id, "20");
    await t.db.update(schema.markSheets).set({ status: "submitted" }).where(eq(schema.markSheets.id, s.sheet.id));
    await rejectsWith(setMark(0, s.termExam.id, "51"), /locked/);
    await rejectsWith(t.db.delete(schema.marks).where(eq(schema.marks.markSheetId, s.sheet.id)), /locked/);
  });
});

describe("workflow guards", () => {
  it("allows only documented mark sheet transitions", async () => {
    // Sheet is "submitted" from the previous block.
    await rejectsWith(t.db.update(schema.markSheets).set({ status: "draft" }).where(eq(schema.markSheets.id, s.sheet.id)), /cannot move from submitted to draft/);
    await rejectsWith(
      t.db.update(schema.markSheets).set({ status: "returned", returnReason: "no" }).where(eq(schema.markSheets.id, s.sheet.id)),
      /reason/,
    );
    await t.db.update(schema.markSheets).set({ status: "approved" }).where(eq(schema.markSheets.id, s.sheet.id));
  });

  it("requires a new sheet to start as a draft", async () => {
    const [math] = await t.db.insert(schema.subjects).values({ name: "Science", code: "SCI" }).returning();
    const [cs] = await t.db.insert(schema.classSubjects).values({ classId: s.klass.id, academicYearId: s.year.id, subjectId: math.id }).returning();
    await rejectsWith(
      t.db.insert(schema.markSheets).values({ examTermId: s.term.id, sectionId: s.section.id, classSubjectId: cs.id, status: "approved" }),
      /must start as a draft/,
    );
  });

  it("needs class approval before final approval, and a reason to reopen", async () => {
    await rejectsWith(
      t.db.insert(schema.resultApprovals).values({ examTermId: s.term.id, sectionId: s.section.id, status: "final_approved" }),
      /class teacher first/,
    );
    await t.db
      .insert(schema.resultApprovals)
      .values({ examTermId: s.term.id, sectionId: s.section.id, status: "class_approved", classApprovedAt: new Date() });
    await rejectsWith(
      t.db.update(schema.resultApprovals).set({ status: "open" }).where(eq(schema.resultApprovals.sectionId, s.section.id)),
      /needs a reason/,
    );
  });

  it("freezes everything an approved result depends on", async () => {
    // The class result is class_approved now.
    await rejectsWith(
      t.db.update(schema.markSheets).set({ status: "returned", returnReason: "Wrong marks entered" }).where(eq(schema.markSheets.id, s.sheet.id)),
      /Reopen it/,
    );
    await rejectsWith(t.db.update(schema.gradingScales).set({ overallPassPercentage: "40" }).where(eq(schema.gradingScales.isDefault, true)), /used by approved results/);
    await rejectsWith(
      t.db.update(schema.classSubjects).set({ includeInTotal: false }).where(eq(schema.classSubjects.id, s.classSubject.id)),
      /Reopen the result first/,
    );

    await t.db
      .update(schema.resultApprovals)
      .set({ status: "open", reopenReason: "Correction to English marks", reopenedAt: new Date() })
      .where(eq(schema.resultApprovals.sectionId, s.section.id));
    await t.db.update(schema.markSheets).set({ status: "returned", returnReason: "Wrong marks entered" }).where(eq(schema.markSheets.id, s.sheet.id));
    await setMark(0, s.termExam.id, "55");
  });

  it("does not allow maximum marks to change below an entered mark", async () => {
    await rejectsWith(t.db.update(schema.assessments).set({ maxMarks: "50" }).where(eq(schema.assessments.id, s.termExam.id)), /above the new maximum/);
  });
});

describe("staff account guard", () => {
  it("never removes the last active administrator", async () => {
    const fresh = await createTestDb();
    try {
      const only = await addUser(fresh.db, { role: "admin" });
      await rejectsWith(fresh.db.update(schema.users).set({ role: "teacher" }).where(eq(schema.users.id, only.user.id)), /At least one active administrator/);
      await rejectsWith(fresh.db.update(schema.users).set({ isActive: false }).where(eq(schema.users.id, only.user.id)), /At least one active administrator/);
      await rejectsWith(fresh.db.delete(schema.users).where(eq(schema.users.id, only.user.id)), /At least one active administrator/);
    } finally {
      await fresh.close();
    }
  });

  it("stops an administrator from removing their own access", async () => {
    const second = await addUser(t.db, { role: "admin" });
    await rejectsWith(
      withActor(t.db, second.user.id, (tx) => tx.update(schema.users).set({ isActive: false }).where(eq(schema.users.id, second.user.id))),
      /cannot remove your own administrator access/,
    );
    await withActor(t.db, s.admin.user.id, (tx) => tx.update(schema.users).set({ role: "teacher" }).where(eq(schema.users.id, second.user.id)));
  });
});

describe("audit log", () => {
  it("records actor, old and new values and reason, without password hashes", async () => {
    await withActor(
      t.db,
      s.admin.user.id,
      (tx) => tx.update(schema.users).set({ fullName: "Renamed Teacher" }).where(eq(schema.users.id, s.classTeacher.user.id)),
      "Name corrected",
    );
    const [entry] = await t.db
      .select()
      .from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.tableName, "users"), eq(schema.auditLogs.recordId, s.classTeacher.user.id), eq(schema.auditLogs.action, "UPDATE")))
      .orderBy(sql`${schema.auditLogs.id} desc`)
      .limit(1);
    expect(entry.actorId).toBe(s.admin.user.id);
    expect(entry.reason).toBe("Name corrected");
    expect((entry.oldData as Record<string, unknown>).full_name).not.toBe("Renamed Teacher");
    expect((entry.newData as Record<string, unknown>).full_name).toBe("Renamed Teacher");
    expect(JSON.stringify(entry)).not.toContain("password_hash");
    expect(JSON.stringify(entry)).not.toContain("scrypt$");
  });

  it("records mark changes with the previous value", async () => {
    const entries = await t.db.select().from(schema.auditLogs).where(eq(schema.auditLogs.tableName, "marks"));
    expect(entries.some((e) => e.action === "UPDATE" && (e.oldData as { marks_obtained: number }).marks_obtained === 50)).toBe(true);
  });

  it("cannot be edited, deleted or truncated", async () => {
    await rejectsWith(t.db.update(schema.auditLogs).set({ reason: "tampered" }), /cannot be changed or deleted/);
    await rejectsWith(t.db.delete(schema.auditLogs), /cannot be changed or deleted/);
    await rejectsWith(t.db.execute(sql`truncate audit_logs`), /cannot be changed or deleted/);
  });
});
