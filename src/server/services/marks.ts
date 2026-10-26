/**
 * Marks entry (subject teachers) and mark sheet review (class teachers).
 *
 * A mark sheet is one exam term × section × class subject. Marks are stored per student × component
 * (Monthly, Term …). A component without a mark is *missing*, never zero; "0" is a real score.
 * Workflow: draft → submitted → approved, or returned (with a reason) back to the teacher.
 * Each subject has two sheets per term: the Monthly Test (`monthly`) and the other components (`term`),
 * so monthly results can be published before the term examination.
 * The database triggers re-check ranges, decimals, locks and status transitions for every caller.
 */
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { Dec } from "@/lib/domain/calculations";
import { idSchema } from "@/lib/validation/common";
import { MARK_PATTERN, returnSheetSchema, saveMarksSchema, sheetKeySchema } from "@/lib/validation/results";
import type { SessionUser } from "@/server/auth/session";
import type { Db, Tx } from "@/server/db/client";
import { withActor } from "@/server/db/actor";
import {
  academicYears,
  assessments,
  assessmentTypes,
  classes,
  classSubjects,
  enrollments,
  examTerms,
  markSheets,
  marks,
  resultApprovals,
  schoolSettings,
  sections,
  students,
  subjects,
  teacherAssignments,
  users,
  type MarkSheetStatus,
  type ResultStage,
} from "@/server/db/schema";
import { AppError, forbidden, notFound, type FieldErrors } from "@/server/errors";
import { assertAdmin, type ServiceContext } from "./guards";
import { parseInput } from "./validate";

export type SheetStatus = MarkSheetStatus | "not_started";
type SheetKey = z.output<typeof sheetKeySchema>;

/** Key of one grid cell in `marks` and in field errors. */
export const cellKey = (enrollmentId: string, assessmentId: string) => `${enrollmentId}:${assessmentId}`;

// -- loading and access ---------------------------------------------------------------------------

interface SheetContext {
  term: { id: string; name: string; academicYearId: string; yearName: string; marksDeadline: string | null };
  section: { id: string; name: string; classId: string; className: string; classTeacherId: string | null };
  classSubject: { id: string; subjectName: string; subjectCode: string };
  teacher: { id: string; fullName: string } | null;
  sheet: typeof markSheets.$inferSelect | null;
  /** An approved result covers this stage (monthly sheets: monthly or term result; term sheets: term result). */
  resultLocked: boolean;
}

async function loadSheetContext(db: Db | Tx, key: SheetKey): Promise<SheetContext> {
  const [row] = await db
    .select({
      term: { id: examTerms.id, name: examTerms.name, academicYearId: examTerms.academicYearId, yearName: academicYears.name, marksDeadline: examTerms.marksDeadline },
      section: { id: sections.id, name: sections.name, classId: sections.classId, className: classes.name, classTeacherId: sections.classTeacherId },
      classSubject: { id: classSubjects.id, subjectName: subjects.name, subjectCode: subjects.code },
    })
    .from(sections)
    .innerJoin(classes, eq(classes.id, sections.classId))
    .innerJoin(examTerms, and(eq(examTerms.id, key.examTermId), eq(examTerms.academicYearId, sections.academicYearId)))
    .innerJoin(academicYears, eq(academicYears.id, examTerms.academicYearId))
    .innerJoin(
      classSubjects,
      and(eq(classSubjects.id, key.classSubjectId), eq(classSubjects.classId, sections.classId), eq(classSubjects.academicYearId, sections.academicYearId)),
    )
    .innerJoin(subjects, eq(subjects.id, classSubjects.subjectId))
    .where(eq(sections.id, key.sectionId));
  if (!row) throw notFound("Mark sheet");
  const [teacher] = await db
    .select({ id: users.id, fullName: users.fullName })
    .from(teacherAssignments)
    .innerJoin(users, eq(users.id, teacherAssignments.teacherId))
    .where(and(eq(teacherAssignments.sectionId, key.sectionId), eq(teacherAssignments.classSubjectId, key.classSubjectId)));
  const [sheet] = await db
    .select()
    .from(markSheets)
    .where(
      and(
        eq(markSheets.examTermId, key.examTermId),
        eq(markSheets.sectionId, key.sectionId),
        eq(markSheets.classSubjectId, key.classSubjectId),
        eq(markSheets.stage, key.stage),
      ),
    );
  const approvals = await db
    .select({ stage: resultApprovals.stage, status: resultApprovals.status })
    .from(resultApprovals)
    .where(and(eq(resultApprovals.examTermId, key.examTermId), eq(resultApprovals.sectionId, key.sectionId)));
  const resultLocked = approvals.some((a) => a.status !== "open" && (a.stage === "term" || a.stage === key.stage));
  return { ...row, teacher: teacher ?? null, sheet: sheet ?? null, resultLocked };
}

export interface SheetAccess {
  /** Enter, save and submit marks (the subject teacher, or the principal on their behalf). */
  canEdit: boolean;
  /** Approve or return a submitted sheet (the class teacher or the principal). */
  canReview: boolean;
  /** Approve: reviewers other than the person who submitted the sheet. */
  canApprove: boolean;
}

function sheetAccess(user: SessionUser, c: SheetContext): SheetAccess & { canView: boolean } {
  const isAdmin = user.role === "admin";
  const isSubjectTeacher = c.teacher?.id === user.id;
  const isClassTeacher = c.section.classTeacherId === user.id;
  const status = c.sheet?.status ?? "draft";
  const locked = c.resultLocked;
  return {
    canView: isAdmin || isSubjectTeacher || isClassTeacher,
    canEdit: (isAdmin || isSubjectTeacher) && (status === "draft" || status === "returned") && !locked,
    canReview: (isAdmin || isClassTeacher) && !locked,
    // Nobody approves their own submission (e.g. a class teacher who also teaches the subject).
    canApprove: (isAdmin || isClassTeacher) && !locked && c.sheet?.submittedBy !== user.id,
  };
}

/** The Monthly Test component is the "monthly" stage; every other component belongs to "term". */
export const stageOfCode = (code: string): ResultStage => (code === "MONTHLY" ? "monthly" : "term");

/** The components of one stage: the Monthly Test alone, or every other component. */
export const stageFilter = (stage: ResultStage) => (stage === "monthly" ? eq(assessmentTypes.code, "MONTHLY") : ne(assessmentTypes.code, "MONTHLY"));

async function loadComponents(db: Db | Tx, examTermId: string, classSubjectId: string, stage: ResultStage) {
  return db
    .select({ assessmentId: assessments.id, code: assessmentTypes.code, name: assessmentTypes.name, maxMarks: assessments.maxMarks })
    .from(assessments)
    .innerJoin(assessmentTypes, eq(assessmentTypes.id, assessments.assessmentTypeId))
    .where(and(eq(assessments.examTermId, examTermId), eq(assessments.classSubjectId, classSubjectId), stageFilter(stage)))
    .orderBy(asc(assessmentTypes.sortOrder), asc(assessmentTypes.name));
}

async function loadStudents(db: Db | Tx, sectionId: string) {
  return db
    .select({ enrollmentId: enrollments.id, rollNumber: enrollments.rollNumber, studentCode: students.studentCode, fullName: students.fullName })
    .from(enrollments)
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .where(and(eq(enrollments.sectionId, sectionId), eq(enrollments.status, "active")))
    .orderBy(asc(enrollments.rollNumber));
}

/** Missing marks of active students (a student × component without a mark). */
async function countMissing(db: Db | Tx, sheetId: string | null, key: SheetKey) {
  const { sectionId, examTermId, classSubjectId, stage } = key;
  // Sequential: inside a transaction every query shares one connection.
  const studentRows = await loadStudents(db, sectionId);
  const componentRows = await loadComponents(db, examTermId, classSubjectId, stage);
  let entered = 0;
  if (sheetId && studentRows.length && componentRows.length) {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(marks)
      .innerJoin(enrollments, eq(enrollments.id, marks.enrollmentId))
      .where(and(eq(marks.markSheetId, sheetId), eq(enrollments.status, "active"), sql`${marks.marksObtained} is not null`));
    entered = row.n;
  }
  const expected = studentRows.length * componentRows.length;
  return { students: studentRows.length, components: componentRows.length, expected, missing: expected - entered };
}

// -- lists ----------------------------------------------------------------------------------------

/** One stage (Monthly Test or term components) of one subject's marks in a section. */
export interface StageCell {
  sheetId: string | null;
  status: SheetStatus;
  /** Components of this stage with maximum marks this term (0 = the stage does not apply). */
  components: number;
  entered: number;
  returnReason: string | null;
}

export interface MarkSheetRow {
  examTermId: string;
  sectionId: string;
  sectionName: string;
  classId: string;
  className: string;
  classSubjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string | null;
  teacherName: string | null;
  classTeacherId: string | null;
  students: number;
  monthly: StageCell;
  term: StageCell;
}

/**
 * Subjects of a term with both stages' sheets: `mine` = the signed-in teacher's subjects, `class` =
 * subjects of the sections they are class teacher of, `all` = every subject (principal only).
 */
export async function listMarkSheets(ctx: ServiceContext, input: { examTermId: unknown; scope: "mine" | "class" | "all" }): Promise<MarkSheetRow[]> {
  const examTermId = parseInput(idSchema, input.examTermId);
  if (input.scope === "all") assertAdmin(ctx.user);
  const [term] = await ctx.db.select({ yearId: examTerms.academicYearId }).from(examTerms).where(eq(examTerms.id, examTermId));
  if (!term) throw notFound("Exam term");
  const scopeFilter =
    input.scope === "mine" ? eq(teacherAssignments.teacherId, ctx.user.id) : input.scope === "class" ? eq(sections.classTeacherId, ctx.user.id) : undefined;
  const rows = await ctx.db
    .select({
      sectionId: sections.id,
      sectionName: sections.name,
      classId: classes.id,
      className: classes.name,
      classSubjectId: classSubjects.id,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      teacherId: teacherAssignments.teacherId,
      teacherName: users.fullName,
      classTeacherId: sections.classTeacherId,
      students: sql<number>`(select count(*)::int from enrollments e where e.section_id = ${sections.id} and e.status = 'active')`,
    })
    .from(sections)
    .innerJoin(classes, eq(classes.id, sections.classId))
    .innerJoin(
      classSubjects,
      and(eq(classSubjects.classId, sections.classId), eq(classSubjects.academicYearId, sections.academicYearId), eq(classSubjects.isActive, true)),
    )
    .innerJoin(subjects, eq(subjects.id, classSubjects.subjectId))
    .leftJoin(teacherAssignments, and(eq(teacherAssignments.sectionId, sections.id), eq(teacherAssignments.classSubjectId, classSubjects.id)))
    .leftJoin(users, eq(users.id, teacherAssignments.teacherId))
    .where(and(eq(sections.academicYearId, term.yearId), eq(sections.isActive, true), scopeFilter))
    .orderBy(asc(classes.sortOrder), asc(classes.name), asc(sections.name), asc(classSubjects.sortOrder), asc(subjects.name));
  if (rows.length === 0) return [];

  const componentRows = await ctx.db
    .select({ classSubjectId: assessments.classSubjectId, code: assessmentTypes.code })
    .from(assessments)
    .innerJoin(assessmentTypes, eq(assessmentTypes.id, assessments.assessmentTypeId))
    .where(eq(assessments.examTermId, examTermId));
  const sheetRows = await ctx.db
    .select({
      id: markSheets.id,
      sectionId: markSheets.sectionId,
      classSubjectId: markSheets.classSubjectId,
      stage: markSheets.stage,
      status: markSheets.status,
      returnReason: markSheets.returnReason,
      // Qualified by hand: Drizzle leaves columns unqualified in a single-table select.
      entered: sql<number>`(select count(*)::int from marks m join enrollments e on e.id = m.enrollment_id
        where m.mark_sheet_id = "mark_sheets"."id" and e.status = 'active' and m.marks_obtained is not null)`,
    })
    .from(markSheets)
    .where(and(eq(markSheets.examTermId, examTermId), inArray(markSheets.sectionId, [...new Set(rows.map((r) => r.sectionId))])));
  const components = new Map<string, number>();
  for (const c of componentRows) {
    const k = `${c.classSubjectId}:${stageOfCode(c.code)}`;
    components.set(k, (components.get(k) ?? 0) + 1);
  }
  const sheets = new Map(sheetRows.map((s) => [`${s.sectionId}:${s.classSubjectId}:${s.stage}`, s]));
  const cell = (sectionId: string, classSubjectId: string, stage: ResultStage): StageCell => {
    const sheet = sheets.get(`${sectionId}:${classSubjectId}:${stage}`);
    return {
      sheetId: sheet?.id ?? null,
      status: sheet?.status ?? "not_started",
      components: components.get(`${classSubjectId}:${stage}`) ?? 0,
      entered: sheet?.entered ?? 0,
      returnReason: sheet?.status === "returned" ? sheet.returnReason : null,
    };
  };
  return rows.map((r) => ({ ...r, examTermId, monthly: cell(r.sectionId, r.classSubjectId, "monthly"), term: cell(r.sectionId, r.classSubjectId, "term") }));
}

// -- one sheet ------------------------------------------------------------------------------------

export interface MarkSheetView {
  key: SheetKey;
  sheetId: string | null;
  termName: string;
  yearName: string;
  className: string;
  sectionName: string;
  subjectName: string;
  subjectCode: string;
  teacherName: string | null;
  deadline: string | null;
  status: SheetStatus;
  returnReason: string | null;
  submittedAt: Date | null;
  approvedAt: Date | null;
  resultLocked: boolean;
  allowDecimals: boolean;
  decimalPlaces: number;
  components: { assessmentId: string; code: string; name: string; maxMarks: string }[];
  students: { enrollmentId: string; rollNumber: number; studentCode: string; fullName: string }[];
  /** `cellKey` → mark as text; absent = not entered. */
  marks: Record<string, string>;
  expected: number;
  missing: number;
  access: SheetAccess;
  /** Both stages of this subject, for switching between the Monthly Test and the term sheet. */
  stages: { stage: ResultStage; components: number; status: SheetStatus }[];
}

export async function getMarkSheet(ctx: ServiceContext, input: unknown): Promise<MarkSheetView> {
  const key = parseInput(sheetKeySchema, input);
  const c = await loadSheetContext(ctx.db, key);
  const access = sheetAccess(ctx.user, c);
  if (!access.canView) throw forbidden("Only the subject teacher, the class teacher or the principal can open this mark sheet.");
  const [allComponents, studentRows, [settings], stageSheets] = await Promise.all([
    ctx.db
      .select({ assessmentId: assessments.id, code: assessmentTypes.code, name: assessmentTypes.name, maxMarks: assessments.maxMarks })
      .from(assessments)
      .innerJoin(assessmentTypes, eq(assessmentTypes.id, assessments.assessmentTypeId))
      .where(and(eq(assessments.examTermId, key.examTermId), eq(assessments.classSubjectId, key.classSubjectId)))
      .orderBy(asc(assessmentTypes.sortOrder), asc(assessmentTypes.name)),
    loadStudents(ctx.db, key.sectionId),
    ctx.db.select({ allowDecimals: schoolSettings.allowDecimalMarks, places: schoolSettings.decimalPlaces }).from(schoolSettings).where(eq(schoolSettings.id, 1)),
    ctx.db
      .select({ stage: markSheets.stage, status: markSheets.status })
      .from(markSheets)
      .where(and(eq(markSheets.examTermId, key.examTermId), eq(markSheets.sectionId, key.sectionId), eq(markSheets.classSubjectId, key.classSubjectId))),
  ]);
  const components = allComponents.filter((a) => stageOfCode(a.code) === key.stage);
  const markRows = c.sheet
    ? await ctx.db.select({ enrollmentId: marks.enrollmentId, assessmentId: marks.assessmentId, value: marks.marksObtained }).from(marks).where(eq(marks.markSheetId, c.sheet.id))
    : [];
  const active = new Set(studentRows.map((s) => s.enrollmentId));
  const values: Record<string, string> = {};
  for (const m of markRows) {
    if (m.value !== null && active.has(m.enrollmentId)) values[cellKey(m.enrollmentId, m.assessmentId)] = new Dec(m.value).toString();
  }
  const expected = studentRows.length * components.length;
  return {
    key,
    sheetId: c.sheet?.id ?? null,
    termName: c.term.name,
    yearName: c.term.yearName,
    className: c.section.className,
    sectionName: c.section.name,
    subjectName: c.classSubject.subjectName,
    subjectCode: c.classSubject.subjectCode,
    teacherName: c.teacher?.fullName ?? null,
    deadline: c.sheet?.deadline ?? c.term.marksDeadline,
    status: c.sheet?.status ?? "not_started",
    returnReason: c.sheet?.status === "returned" ? c.sheet.returnReason : null,
    submittedAt: c.sheet?.submittedAt ?? null,
    approvedAt: c.sheet?.approvedAt ?? null,
    resultLocked: c.resultLocked,
    allowDecimals: settings.allowDecimals,
    decimalPlaces: settings.places,
    components,
    students: studentRows,
    marks: values,
    expected,
    missing: expected - Object.keys(values).length,
    access: { canEdit: access.canEdit && components.length > 0, canReview: access.canReview, canApprove: access.canApprove },
    stages: (["monthly", "term"] as const).map((stage) => ({
      stage,
      components: allComponents.filter((a) => stageOfCode(a.code) === stage).length,
      status: stageSheets.find((s) => s.stage === stage)?.status ?? "not_started",
    })),
  };
}

function lockedMessage(c: SheetContext): string {
  if (c.resultLocked) return "The class result is approved, so these marks are locked. The principal must reopen it first.";
  if (c.sheet && c.sheet.status !== "draft" && c.sheet.status !== "returned") return "These marks have been submitted. Ask the class teacher to return the sheet if something needs correcting.";
  return "You can only enter marks for the subjects assigned to you.";
}

function reviewForbidden(c: SheetContext) {
  if (c.resultLocked) return forbidden("The class result is approved, so these marks are locked. The principal must reopen it first.");
  return forbidden("Only the class teacher of this class or the principal can review these marks.");
}

/** Create the sheet row on first save (always as a draft). */
async function ensureSheet(tx: Tx, key: SheetKey): Promise<typeof markSheets.$inferSelect> {
  await tx
    .insert(markSheets)
    .values(key)
    .onConflictDoNothing({ target: [markSheets.examTermId, markSheets.sectionId, markSheets.classSubjectId, markSheets.stage] });
  const [sheet] = await tx
    .select()
    .from(markSheets)
    .where(
      and(
        eq(markSheets.examTermId, key.examTermId),
        eq(markSheets.sectionId, key.sectionId),
        eq(markSheets.classSubjectId, key.classSubjectId),
        eq(markSheets.stage, key.stage),
      ),
    );
  return sheet;
}

/**
 * Save the changed cells of a draft/returned sheet. Blank = not entered. Every value is checked
 * against its component's maximum and the school's decimal setting; all errors come back per cell.
 */
export async function saveMarks(ctx: ServiceContext, input: unknown): Promise<{ saved: number; missing: number }> {
  const data = parseInput(saveMarksSchema, input);
  const key = { examTermId: data.examTermId, sectionId: data.sectionId, classSubjectId: data.classSubjectId, stage: data.stage };
  return withActor(ctx.db, ctx.user.id, async (tx) => {
    const c = await loadSheetContext(tx, key);
    if (!sheetAccess(ctx.user, c).canEdit) throw forbidden(lockedMessage(c));
    const components = await loadComponents(tx, key.examTermId, key.classSubjectId, key.stage);
    const studentRows = await loadStudents(tx, key.sectionId);
    const [settings] = await tx
      .select({ allowDecimals: schoolSettings.allowDecimalMarks, places: schoolSettings.decimalPlaces })
      .from(schoolSettings)
      .where(eq(schoolSettings.id, 1));
    const maxById = new Map(components.map((a) => [a.assessmentId, new Dec(a.maxMarks)]));
    const active = new Set(studentRows.map((s) => s.enrollmentId));

    const errors: FieldErrors = {};
    const parsed = new Map<string, { enrollmentId: string; assessmentId: string; value: string | null }>();
    for (const cell of data.marks) {
      const k = cellKey(cell.enrollmentId, cell.assessmentId);
      const max = maxById.get(cell.assessmentId);
      if (!max || !active.has(cell.enrollmentId)) throw new AppError("VALIDATION", "The marks sheet has changed (a student or component was removed). Reload the page and try again.");
      if (cell.value === "") {
        parsed.set(k, { ...cell, value: null });
        continue;
      }
      if (!MARK_PATTERN.test(cell.value)) {
        errors[k] = ["Enter a number such as 18 or 0 (leave blank if not taken yet)"];
        continue;
      }
      const value = new Dec(cell.value);
      if (value.gt(max)) errors[k] = [`At most ${max.toString()}`];
      else if (!settings.allowDecimals && !value.isInteger()) errors[k] = ["Whole marks only (decimal marks are switched off)"];
      else if (value.decimalPlaces() > settings.places) errors[k] = [`At most ${settings.places} decimal place${settings.places === 1 ? "" : "s"}`];
      else parsed.set(k, { ...cell, value: value.toString() });
    }
    const errorCount = Object.keys(errors).length;
    if (errorCount) throw new AppError("VALIDATION", `${errorCount} mark${errorCount === 1 ? " is" : "s are"} not valid. Fix the highlighted cells; nothing was saved.`, errors);

    const sheet = await ensureSheet(tx, key);
    const existing = await tx
      .select({ enrollmentId: marks.enrollmentId, assessmentId: marks.assessmentId, value: marks.marksObtained })
      .from(marks)
      .where(eq(marks.markSheetId, sheet.id));
    const current = new Map(existing.map((m) => [cellKey(m.enrollmentId, m.assessmentId), m.value === null ? null : new Dec(m.value).toString()]));
    const changes = [...parsed.entries()]
      .filter(([k, cell]) => (current.has(k) ? current.get(k) !== cell.value : cell.value !== null))
      .map(([, cell]) => ({ markSheetId: sheet.id, enrollmentId: cell.enrollmentId, assessmentId: cell.assessmentId, marksObtained: cell.value }));
    if (changes.length) {
      await tx
        .insert(marks)
        .values(changes)
        .onConflictDoUpdate({ target: [marks.assessmentId, marks.enrollmentId], set: { marksObtained: sql`excluded.marks_obtained` } });
    }
    const { missing } = await countMissing(tx, sheet.id, key);
    return { saved: changes.length, missing };
  });
}

/** Submit a complete sheet to the class teacher. Refused while any mark is missing. */
export async function submitMarkSheet(ctx: ServiceContext, input: unknown): Promise<void> {
  const key = parseInput(sheetKeySchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const c = await loadSheetContext(tx, key);
    if (!sheetAccess(ctx.user, c).canEdit) throw forbidden(lockedMessage(c));
    const sheet = await ensureSheet(tx, key);
    const count = await countMissing(tx, sheet.id, key);
    if (count.components === 0) throw new AppError("RULE", "The principal has not set the maximum marks for this subject in this term yet.");
    if (count.students === 0) throw new AppError("RULE", "No students are enrolled in this section.");
    if (count.missing > 0) {
      throw new AppError(
        "RULE",
        `${count.missing} mark${count.missing === 1 ? " is" : "s are"} still missing. Enter every mark before submitting (0 is a valid mark; a blank box means not entered).`,
      );
    }
    await tx
      .update(markSheets)
      .set({ status: "submitted", submittedBy: ctx.user.id, submittedAt: new Date(), returnReason: null })
      .where(eq(markSheets.id, sheet.id));
  });
}

async function loadSheetById(tx: Tx, sheetId: string) {
  const [sheet] = await tx
    .select({ examTermId: markSheets.examTermId, sectionId: markSheets.sectionId, classSubjectId: markSheets.classSubjectId, stage: markSheets.stage })
    .from(markSheets)
    .where(eq(markSheets.id, sheetId));
  if (!sheet) throw notFound("Mark sheet");
  return loadSheetContext(tx, sheet);
}

/** Class teacher (or principal) accepts a submitted sheet. A sheet that became incomplete must be returned instead. */
export async function approveMarkSheet(ctx: ServiceContext, input: unknown): Promise<void> {
  const { sheetId } = parseInput(z.object({ sheetId: idSchema }), input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const c = await loadSheetById(tx, sheetId);
    const access = sheetAccess(ctx.user, c);
    if (!access.canReview) throw reviewForbidden(c);
    if (!access.canApprove) throw forbidden("You submitted these marks, so someone else must approve them: the class teacher or the principal.");
    if (c.sheet!.status !== "submitted" && c.sheet!.status !== "under_review") throw new AppError("RULE", "Only submitted marks can be approved.");
    const count = await countMissing(tx, sheetId, { examTermId: c.term.id, sectionId: c.section.id, classSubjectId: c.classSubject.id, stage: c.sheet!.stage });
    if (count.missing > 0) {
      throw new AppError("RULE", `${count.missing} mark${count.missing === 1 ? " is" : "s are"} missing (for example a student enrolled after submission). Return the sheet to the teacher.`);
    }
    const now = new Date();
    await tx.update(markSheets).set({ status: "approved", reviewedBy: ctx.user.id, reviewedAt: now, approvedBy: ctx.user.id, approvedAt: now }).where(eq(markSheets.id, sheetId));
  });
}

/** Send a submitted or approved sheet back to the subject teacher for correction, with a reason. */
export async function returnMarkSheet(ctx: ServiceContext, input: unknown): Promise<void> {
  const data = parseInput(returnSheetSchema, input);
  await withActor(
    ctx.db,
    ctx.user.id,
    async (tx) => {
      const c = await loadSheetById(tx, data.sheetId);
      if (!sheetAccess(ctx.user, c).canReview) throw reviewForbidden(c);
      if (c.sheet!.status === "draft" || c.sheet!.status === "returned") throw new AppError("RULE", "This sheet is already with the subject teacher.");
      await tx
        .update(markSheets)
        .set({ status: "returned", returnReason: data.reason, reviewedBy: ctx.user.id, reviewedAt: new Date(), approvedBy: null, approvedAt: null })
        .where(eq(markSheets.id, data.sheetId));
    },
    data.reason,
  );
}

/** Sheets of one section and term, keyed by class subject (for the class result page). */
export async function sheetStatusesForSection(db: Db, examTermId: string, sectionId: string) {
  return db
    .select({ id: markSheets.id, classSubjectId: markSheets.classSubjectId, stage: markSheets.stage, status: markSheets.status, returnReason: markSheets.returnReason })
    .from(markSheets)
    .where(and(eq(markSheets.examTermId, examTermId), eq(markSheets.sectionId, sectionId)));
}

/** Marks counted in a class result: only from submitted sheets of the given stages. */
export async function submittedMarksForSection(db: Db, examTermId: string, sectionId: string, enrollmentIds: string[], stages: ResultStage[]) {
  if (enrollmentIds.length === 0) return [];
  return db
    .select({ enrollmentId: marks.enrollmentId, assessmentId: marks.assessmentId, value: marks.marksObtained })
    .from(marks)
    .innerJoin(markSheets, eq(markSheets.id, marks.markSheetId))
    .where(
      and(
        eq(markSheets.examTermId, examTermId),
        eq(markSheets.sectionId, sectionId),
        inArray(markSheets.stage, stages),
        inArray(markSheets.status, ["submitted", "under_review", "approved"]),
        inArray(marks.enrollmentId, enrollmentIds),
      ),
    );
}
