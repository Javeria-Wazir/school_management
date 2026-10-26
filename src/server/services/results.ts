/**
 * Class results: the class teacher compiles every subject of a section for a term, writes remarks
 * and approves the result; the principal gives final approval or reopens it with a reason.
 *
 * A term has two results. The **monthly** result uses only the Monthly Test, so it can be published
 * as soon as monthly marks are approved. The **term** result combines the Monthly Test with the term
 * components once both sheets of every subject are approved. Each has its own approval and remarks.
 *
 * Only marks from submitted/approved sheets are counted — a draft is still the subject teacher's
 * working copy. A student with any missing mark is *Incomplete*: no total, percentage, grade or
 * position, and the class result cannot be approved until every student is complete.
 */
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { evaluateStudent, competitionRanks, makeGradingRules, type GradingRules, type StudentOutcome, type SubjectSpec } from "@/lib/domain/calculations";
import { idSchema } from "@/lib/validation/common";
import { remarksSchema, reopenResultSchema, resultKeySchema } from "@/lib/validation/results";
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
  gradeBoundaries,
  gradingScales,
  markSheets,
  resultApprovals,
  schoolSettings,
  sections,
  studentRemarks,
  students,
  subjects,
  teacherAssignments,
  users,
  type MarkSheetStatus,
  type ResultApprovalStatus,
  type ResultStage,
} from "@/server/db/schema";
import { AppError, forbidden, notFound } from "@/server/errors";
import { assertAdmin, type ServiceContext } from "./guards";
import { sheetStatusesForSection, stageOfCode, submittedMarksForSection } from "./marks";
import { parseInput } from "./validate";

/** Mark sheet stages a result is built from. */
const sheetStagesFor = (stage: ResultStage): ResultStage[] => (stage === "monthly" ? ["monthly"] : ["monthly", "term"]);

export interface ResultSubjectSheet {
  stage: ResultStage;
  sheetId: string | null;
  status: MarkSheetStatus | "not_started";
  returnReason: string | null;
}

export interface ResultSubject extends SubjectSpec {
  code: string;
  teacherName: string | null;
  /** The subject's sheets this result needs (one per stage that has components). */
  sheets: ResultSubjectSheet[];
  /** Every needed sheet is approved. */
  approved: boolean;
  components: { id: string; code: string; name: string; max: string }[];
}

export interface ResultStudent {
  enrollmentId: string;
  rollNumber: number;
  studentCode: string;
  fullName: string;
  guardianName: string | null;
  outcome: StudentOutcome;
  /** Competition rank by percentage among complete students; `null` while incomplete. */
  position: number | null;
  remarks: string;
  /** Component marks (assessment id → mark) from submitted sheets. */
  marks: Record<string, string>;
}

export interface ResultApprovalView {
  status: ResultApprovalStatus;
  classApprovedAt: Date | null;
  classApprovedByName: string | null;
  finalApprovedAt: Date | null;
  finalApprovedByName: string | null;
  reopenReason: string | null;
  reopenedAt: Date | null;
}

export interface ClassResultView {
  stage: ResultStage;
  term: { id: string; name: string; yearName: string };
  section: { id: string; name: string; classId: string; className: string; classSortOrder: number; classTeacherId: string | null; classTeacherName: string | null };
  subjects: ResultSubject[];
  students: ResultStudent[];
  rules: GradingRules;
  approval: ResultApprovalView;
  /** Status of the other stage's result, for the page's switch. */
  otherStageStatus: ResultApprovalStatus;
  requirePrincipalApproval: boolean;
  readiness: { sheetsApproved: number; sheetsTotal: number; studentsComplete: number; studentsTotal: number; blockers: string[] };
  access: { isAdmin: boolean; isClassTeacher: boolean; canClassApprove: boolean; canFinalApprove: boolean; canReopen: boolean; canEditRemarks: boolean };
}

type ResultKey = { examTermId: string; sectionId: string; stage: ResultStage };

const STAGE_LABEL: Record<ResultStage, string> = { monthly: "Monthly Test", term: "Term" };

async function loadResultHeader(db: Db | Tx, key: { examTermId: string; sectionId: string }) {
  const [row] = await db
    .select({
      term: { id: examTerms.id, name: examTerms.name, yearName: academicYears.name, gradingScaleId: examTerms.gradingScaleId },
      section: {
        id: sections.id,
        name: sections.name,
        classId: sections.classId,
        className: classes.name,
        classSortOrder: classes.sortOrder,
        academicYearId: sections.academicYearId,
        classTeacherId: sections.classTeacherId,
        classTeacherName: users.fullName,
      },
    })
    .from(sections)
    .innerJoin(classes, eq(classes.id, sections.classId))
    .innerJoin(examTerms, and(eq(examTerms.id, key.examTermId), eq(examTerms.academicYearId, sections.academicYearId)))
    .innerJoin(academicYears, eq(academicYears.id, examTerms.academicYearId))
    .leftJoin(users, eq(users.id, sections.classTeacherId))
    .where(eq(sections.id, key.sectionId));
  if (!row) throw notFound("Class result");
  return row;
}

function canSee(user: SessionUser, classTeacherId: string | null) {
  return user.role === "admin" || classTeacherId === user.id;
}

/** The term's grading scale (or the default one), with the school's decimal places for percentages. */
async function loadRules(db: Db | Tx, gradingScaleId: string | null, places: number): Promise<GradingRules> {
  const [scale] = await db
    .select()
    .from(gradingScales)
    .where(gradingScaleId ? eq(gradingScales.id, gradingScaleId) : eq(gradingScales.isDefault, true));
  if (!scale) throw new AppError("RULE", "No grading scale is set. The principal must create a default grading scale first.");
  const bands = await db.select().from(gradeBoundaries).where(eq(gradeBoundaries.gradingScaleId, scale.id));
  return makeGradingRules({
    name: scale.name,
    bands: bands.map((b) => ({ grade: b.grade, minPercentage: b.minPercentage, remark: b.remark })),
    subjectPass: scale.subjectPassPercentage,
    overallPass: scale.overallPassPercentage,
    requireAllCompulsoryPass: scale.requireAllCompulsoryPass,
    places,
  });
}

const OPEN_APPROVAL: ResultApprovalView = {
  status: "open",
  classApprovedAt: null,
  classApprovedByName: null,
  finalApprovedAt: null,
  finalApprovedByName: null,
  reopenReason: null,
  reopenedAt: null,
};

/** Compile the monthly or term result of one section. Class teacher of that section or principal. */
export async function getClassResult(ctx: ServiceContext, input: unknown): Promise<ClassResultView> {
  const key = parseInput(resultKeySchema, input);
  const header = await loadResultHeader(ctx.db, key);
  if (!canSee(ctx.user, header.section.classTeacherId)) throw forbidden("Only the class teacher of this class or the principal can see its result.");
  const [settings] = await ctx.db.select().from(schoolSettings).where(eq(schoolSettings.id, 1));
  const rules = await loadRules(ctx.db, header.term.gradingScaleId, settings.decimalPlaces);
  const stages = sheetStagesFor(key.stage);

  const subjectRows = await ctx.db
    .select({
      classSubjectId: classSubjects.id,
      name: subjects.name,
      code: subjects.code,
      isCompulsory: classSubjects.isCompulsory,
      includeInTotal: classSubjects.includeInTotal,
      teacherName: users.fullName,
    })
    .from(classSubjects)
    .innerJoin(subjects, eq(subjects.id, classSubjects.subjectId))
    .leftJoin(teacherAssignments, and(eq(teacherAssignments.sectionId, key.sectionId), eq(teacherAssignments.classSubjectId, classSubjects.id)))
    .leftJoin(users, eq(users.id, teacherAssignments.teacherId))
    .where(and(eq(classSubjects.classId, header.section.classId), eq(classSubjects.academicYearId, header.section.academicYearId), eq(classSubjects.isActive, true)))
    .orderBy(asc(classSubjects.sortOrder), asc(subjects.name));
  const componentRows = await ctx.db
    .select({ classSubjectId: assessments.classSubjectId, id: assessments.id, code: assessmentTypes.code, name: assessmentTypes.name, max: assessments.maxMarks })
    .from(assessments)
    .innerJoin(assessmentTypes, eq(assessmentTypes.id, assessments.assessmentTypeId))
    .where(eq(assessments.examTermId, key.examTermId))
    .orderBy(asc(assessmentTypes.sortOrder));
  const sheets = await sheetStatusesForSection(ctx.db, key.examTermId, key.sectionId);

  const unconfiguredSubjects: string[] = [];
  const resultSubjects: ResultSubject[] = [];
  for (const s of subjectRows) {
    const components = componentRows
      .filter((c) => c.classSubjectId === s.classSubjectId && stages.includes(stageOfCode(c.code)))
      .map(({ id, code, name, max }) => ({ id, code, name, max }));
    if (components.length === 0) {
      unconfiguredSubjects.push(s.name);
      continue;
    }
    const neededStages = stages.filter((stage) => components.some((c) => stageOfCode(c.code) === stage));
    const subjectSheets = neededStages.map((stage): ResultSubjectSheet => {
      const sheet = sheets.find((x) => x.classSubjectId === s.classSubjectId && x.stage === stage);
      return { stage, sheetId: sheet?.id ?? null, status: sheet?.status ?? "not_started", returnReason: sheet?.status === "returned" ? sheet.returnReason : null };
    });
    resultSubjects.push({
      id: s.classSubjectId,
      name: s.name,
      code: s.code,
      isCompulsory: s.isCompulsory,
      includeInTotal: s.includeInTotal,
      teacherName: s.teacherName,
      components,
      sheets: subjectSheets,
      approved: subjectSheets.every((x) => x.status === "approved"),
    });
  }

  const studentRows = await ctx.db
    .select({
      enrollmentId: enrollments.id,
      rollNumber: enrollments.rollNumber,
      studentCode: students.studentCode,
      fullName: students.fullName,
      guardianName: students.guardianName,
      remarks: studentRemarks.remarks,
    })
    .from(enrollments)
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .leftJoin(
      studentRemarks,
      and(eq(studentRemarks.enrollmentId, enrollments.id), eq(studentRemarks.examTermId, key.examTermId), eq(studentRemarks.stage, key.stage)),
    )
    .where(and(eq(enrollments.sectionId, key.sectionId), eq(enrollments.status, "active")))
    .orderBy(asc(enrollments.rollNumber));
  const markRows = await submittedMarksForSection(
    ctx.db,
    key.examTermId,
    key.sectionId,
    studentRows.map((s) => s.enrollmentId),
    stages,
  );
  const marksByStudent = new Map<string, Record<string, string>>();
  for (const m of markRows) {
    if (m.value === null) continue;
    const record = marksByStudent.get(m.enrollmentId) ?? {};
    record[m.assessmentId] = m.value;
    marksByStudent.set(m.enrollmentId, record);
  }

  const evaluated = studentRows.map((s) => {
    const studentMarks = marksByStudent.get(s.enrollmentId) ?? {};
    return { ...s, marks: studentMarks, outcome: evaluateStudent(resultSubjects, studentMarks, rules) };
  });
  const ranks = competitionRanks(Object.fromEntries(evaluated.map((s) => [s.enrollmentId, s.outcome.complete ? s.outcome.percentage : null])));
  const resultStudents: ResultStudent[] = evaluated.map((s) => ({ ...s, remarks: s.remarks ?? "", position: ranks[s.enrollmentId] ?? null }));

  const approvalRows = await ctx.db
    .select({
      stage: resultApprovals.stage,
      status: resultApprovals.status,
      classApprovedAt: resultApprovals.classApprovedAt,
      classApprovedByName: sql<string | null>`(select u.full_name from users u where u.id = ${resultApprovals.classApprovedBy})`,
      finalApprovedAt: resultApprovals.finalApprovedAt,
      finalApprovedByName: sql<string | null>`(select u.full_name from users u where u.id = ${resultApprovals.finalApprovedBy})`,
      reopenReason: resultApprovals.reopenReason,
      reopenedAt: resultApprovals.reopenedAt,
    })
    .from(resultApprovals)
    .where(and(eq(resultApprovals.examTermId, key.examTermId), eq(resultApprovals.sectionId, key.sectionId)));
  const approvalRow = approvalRows.find((a) => a.stage === key.stage);
  const approval: ResultApprovalView = approvalRow ? { ...approvalRow } : OPEN_APPROVAL;
  const otherStageStatus = approvalRows.find((a) => a.stage !== key.stage)?.status ?? "open";

  const neededSheets = resultSubjects.flatMap((s) => s.sheets);
  const sheetsApproved = neededSheets.filter((s) => s.status === "approved").length;
  const studentsComplete = resultStudents.filter((s) => s.outcome.complete).length;
  const blockers: string[] = [];
  if (resultSubjects.length === 0) {
    blockers.push(key.stage === "monthly" ? "No subject has Monthly Test maximum marks for this term." : "No subject has maximum marks for this term yet.");
  }
  if (key.stage === "term" && unconfiguredSubjects.length) blockers.push(`No maximum marks for this term: ${unconfiguredSubjects.join(", ")}.`);
  const notApproved = resultSubjects.flatMap((s) => s.sheets.filter((x) => x.status !== "approved").map((x) => (stages.length > 1 ? `${s.name} (${STAGE_LABEL[x.stage]})` : s.name)));
  if (notApproved.length) blockers.push(`Marks not approved yet: ${notApproved.join(", ")}.`);
  if (resultStudents.length === 0) blockers.push("No students are enrolled in this section.");
  const incomplete = resultStudents.length - studentsComplete;
  if (incomplete > 0) blockers.push(`${incomplete} student${incomplete === 1 ? " has" : "s have"} missing marks.`);

  const isAdmin = ctx.user.role === "admin";
  const isClassTeacher = header.section.classTeacherId === ctx.user.id;
  return {
    stage: key.stage,
    term: { id: header.term.id, name: header.term.name, yearName: header.term.yearName },
    section: { ...header.section },
    subjects: resultSubjects,
    students: resultStudents,
    rules,
    approval,
    otherStageStatus,
    requirePrincipalApproval: settings.requirePrincipalApproval,
    readiness: { sheetsApproved, sheetsTotal: neededSheets.length, studentsComplete, studentsTotal: resultStudents.length, blockers },
    access: {
      isAdmin,
      isClassTeacher,
      canClassApprove: approval.status === "open" && blockers.length === 0,
      canFinalApprove: isAdmin && approval.status === "class_approved",
      canReopen: approval.status === "final_approved" ? isAdmin : approval.status === "class_approved",
      canEditRemarks: approval.status === "open",
    },
  };
}

// -- approvals ------------------------------------------------------------------------------------

const approvalWhere = (key: ResultKey) =>
  and(eq(resultApprovals.examTermId, key.examTermId), eq(resultApprovals.sectionId, key.sectionId), eq(resultApprovals.stage, key.stage));

/**
 * Class teacher approves a complete result. When the school does not require the principal's
 * approval, this is also the final approval.
 */
export async function classApproveResult(ctx: ServiceContext, input: unknown): Promise<{ final: boolean }> {
  const key = parseInput(resultKeySchema, input);
  const view = await getClassResult(ctx, key);
  if (view.approval.status !== "open") throw new AppError("RULE", "This result is already approved.");
  if (view.readiness.blockers.length) throw new AppError("RULE", `The result cannot be approved yet. ${view.readiness.blockers.join(" ")}`);
  const final = !view.requirePrincipalApproval;
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const now = new Date();
    const values = {
      status: final ? ("final_approved" as const) : ("class_approved" as const),
      classApprovedBy: ctx.user.id,
      classApprovedAt: now,
      finalApprovedBy: final ? ctx.user.id : null,
      finalApprovedAt: final ? now : null,
      publishedOn: final ? now.toISOString().slice(0, 10) : null,
    };
    // A concurrent approval or a sheet returned in the meantime is caught by the status guard and the
    // mark sheet triggers; the update below only touches an open result.
    const updated = await tx
      .update(resultApprovals)
      .set(values)
      .where(and(approvalWhere(key), eq(resultApprovals.status, "open")))
      .returning({ id: resultApprovals.id });
    if (updated.length === 0) {
      const inserted = await tx
        .insert(resultApprovals)
        .values({ examTermId: key.examTermId, sectionId: key.sectionId, stage: key.stage, ...values })
        .onConflictDoNothing({ target: [resultApprovals.examTermId, resultApprovals.sectionId, resultApprovals.stage] })
        .returning({ id: resultApprovals.id });
      if (inserted.length === 0) throw new AppError("CONFLICT", "Someone else approved this result at the same time. Reload the page.");
    }
    // Re-check inside the transaction: every needed sheet (subject × stage with components) must still be approved.
    const needed = await tx
      .selectDistinct({ classSubjectId: assessments.classSubjectId, code: assessmentTypes.code })
      .from(assessments)
      .innerJoin(assessmentTypes, eq(assessmentTypes.id, assessments.assessmentTypeId))
      .innerJoin(classSubjects, and(eq(classSubjects.id, assessments.classSubjectId), eq(classSubjects.isActive, true)))
      .innerJoin(sections, and(eq(sections.id, key.sectionId), eq(sections.classId, classSubjects.classId), eq(sections.academicYearId, classSubjects.academicYearId)))
      .where(eq(assessments.examTermId, key.examTermId));
    const approvedSheets = await tx
      .select({ classSubjectId: markSheets.classSubjectId, stage: markSheets.stage })
      .from(markSheets)
      .where(and(eq(markSheets.examTermId, key.examTermId), eq(markSheets.sectionId, key.sectionId), eq(markSheets.status, "approved")));
    const stages = sheetStagesFor(key.stage);
    const missing = needed.some(
      (n) => stages.includes(stageOfCode(n.code)) && !approvedSheets.some((a) => a.classSubjectId === n.classSubjectId && a.stage === stageOfCode(n.code)),
    );
    if (missing) throw new AppError("CONFLICT", "A subject's marks changed while you were approving. Reload the page and check again.");
  });
  return { final };
}

/** Principal's final approval: the result becomes official (no watermark on report cards). */
export async function finalApproveResult(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const key = parseInput(resultKeySchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const now = new Date();
    const updated = await tx
      .update(resultApprovals)
      .set({ status: "final_approved", finalApprovedBy: ctx.user.id, finalApprovedAt: now, publishedOn: now.toISOString().slice(0, 10) })
      .where(and(approvalWhere(key), eq(resultApprovals.status, "class_approved")))
      .returning({ id: resultApprovals.id });
    if (updated.length === 0) throw new AppError("RULE", "Only a result approved by the class teacher can be given final approval.");
  });
}

/**
 * Reopen an approved result so marks can be corrected. The principal can reopen any approved
 * result; a class teacher only one they approved that is still waiting for the principal.
 */
export async function reopenResult(ctx: ServiceContext, input: unknown): Promise<void> {
  const data = parseInput(reopenResultSchema, input);
  await withActor(
    ctx.db,
    ctx.user.id,
    async (tx) => {
      const header = await loadResultHeader(tx, data);
      const [row] = await tx.select({ id: resultApprovals.id, status: resultApprovals.status }).from(resultApprovals).where(approvalWhere(data));
      if (!row || row.status === "open") throw new AppError("RULE", "This result is not approved, so there is nothing to reopen.");
      const isAdmin = ctx.user.role === "admin";
      if (!isAdmin && !(row.status === "class_approved" && header.section.classTeacherId === ctx.user.id)) {
        throw forbidden(row.status === "final_approved" ? "Only the principal can reopen a result after final approval." : "Only the class teacher or the principal can reopen this result.");
      }
      await tx
        .update(resultApprovals)
        .set({
          status: "open",
          reopenedBy: ctx.user.id,
          reopenedAt: new Date(),
          reopenReason: data.reason,
          classApprovedBy: null,
          classApprovedAt: null,
          finalApprovedBy: null,
          finalApprovedAt: null,
          publishedOn: null,
        })
        .where(eq(resultApprovals.id, row.id));
    },
    data.reason,
  );
}

/** Class teacher's remarks for one student and result (blank removes them). Frozen while that result is approved. */
export async function saveRemarks(ctx: ServiceContext, input: unknown): Promise<void> {
  const data = parseInput(remarksSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const [enrollment] = await tx.select({ sectionId: enrollments.sectionId }).from(enrollments).where(eq(enrollments.id, data.enrollmentId));
    if (!enrollment) throw notFound("Student");
    const header = await loadResultHeader(tx, { examTermId: data.examTermId, sectionId: enrollment.sectionId });
    if (!canSee(ctx.user, header.section.classTeacherId)) throw forbidden("Only the class teacher or the principal can write remarks.");
    const [approval] = await tx
      .select({ status: resultApprovals.status })
      .from(resultApprovals)
      .where(approvalWhere({ examTermId: data.examTermId, sectionId: enrollment.sectionId, stage: data.stage }));
    if (approval && approval.status !== "open") throw new AppError("RULE", "The result is approved, so remarks are locked. Reopen it to change them.");
    const where = and(eq(studentRemarks.examTermId, data.examTermId), eq(studentRemarks.enrollmentId, data.enrollmentId), eq(studentRemarks.stage, data.stage));
    if (data.remarks === "") {
      await tx.delete(studentRemarks).where(where);
      return;
    }
    await tx
      .insert(studentRemarks)
      .values({ examTermId: data.examTermId, enrollmentId: data.enrollmentId, stage: data.stage, remarks: data.remarks, writtenBy: ctx.user.id })
      .onConflictDoUpdate({
        target: [studentRemarks.examTermId, studentRemarks.enrollmentId, studentRemarks.stage],
        set: { remarks: data.remarks, writtenBy: ctx.user.id },
      });
  });
}

// -- lists ----------------------------------------------------------------------------------------

export interface StageSummary {
  sheetsTotal: number;
  sheetsApproved: number;
  status: ResultApprovalStatus;
}

export interface ClassResultRow {
  sectionId: string;
  sectionName: string;
  className: string;
  classTeacherName: string | null;
  students: number;
  monthly: StageSummary;
  term: StageSummary;
}

/** Sections of a term's year whose results the user can see (principal: all; class teacher: their own). */
export async function listClassResults(ctx: ServiceContext, input: unknown): Promise<ClassResultRow[]> {
  const examTermId = parseInput(idSchema, input);
  const [term] = await ctx.db.select({ yearId: examTerms.academicYearId }).from(examTerms).where(eq(examTerms.id, examTermId));
  if (!term) throw notFound("Exam term");
  const rows = await ctx.db
    .select({
      sectionId: sections.id,
      sectionName: sections.name,
      classId: sections.classId,
      className: classes.name,
      classTeacherName: users.fullName,
      students: sql<number>`(select count(*)::int from enrollments e where e.section_id = ${sections.id} and e.status = 'active')`,
    })
    .from(sections)
    .innerJoin(classes, eq(classes.id, sections.classId))
    .leftJoin(users, eq(users.id, sections.classTeacherId))
    .where(and(eq(sections.academicYearId, term.yearId), eq(sections.isActive, true), ctx.user.role === "admin" ? undefined : eq(sections.classTeacherId, ctx.user.id)))
    .orderBy(asc(classes.sortOrder), asc(classes.name), asc(sections.name));
  if (rows.length === 0) return [];
  const sectionIds = rows.map((r) => r.sectionId);

  const needed = await ctx.db
    .selectDistinct({ classId: classSubjects.classId, classSubjectId: classSubjects.id, code: assessmentTypes.code })
    .from(assessments)
    .innerJoin(assessmentTypes, eq(assessmentTypes.id, assessments.assessmentTypeId))
    .innerJoin(classSubjects, and(eq(classSubjects.id, assessments.classSubjectId), eq(classSubjects.isActive, true)))
    .where(eq(assessments.examTermId, examTermId));
  const approvedSheets = await ctx.db
    .select({ sectionId: markSheets.sectionId, classSubjectId: markSheets.classSubjectId, stage: markSheets.stage })
    .from(markSheets)
    .where(and(eq(markSheets.examTermId, examTermId), inArray(markSheets.sectionId, sectionIds), eq(markSheets.status, "approved")));
  const approvals = await ctx.db
    .select({ sectionId: resultApprovals.sectionId, stage: resultApprovals.stage, status: resultApprovals.status })
    .from(resultApprovals)
    .where(and(eq(resultApprovals.examTermId, examTermId), inArray(resultApprovals.sectionId, sectionIds)));

  const summary = (sectionId: string, classId: string, stage: ResultStage): StageSummary => {
    const stages = sheetStagesFor(stage);
    const sheets = needed.filter((n) => n.classId === classId && stages.includes(stageOfCode(n.code)));
    // One sheet per subject × stage, however many components the stage has.
    const keys = [...new Set(sheets.map((n) => `${n.classSubjectId}:${stageOfCode(n.code)}`))];
    const approved = keys.filter((k) => approvedSheets.some((a) => a.sectionId === sectionId && `${a.classSubjectId}:${a.stage}` === k)).length;
    return {
      sheetsTotal: keys.length,
      sheetsApproved: approved,
      status: approvals.find((a) => a.sectionId === sectionId && a.stage === stage)?.status ?? "open",
    };
  };
  return rows.map(({ classId, ...r }) => ({ ...r, monthly: summary(r.sectionId, classId, "monthly"), term: summary(r.sectionId, classId, "term") }));
}
