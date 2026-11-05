/**
 * The audit log, readable by the principal: who changed what, when, and why. The database writes it
 * (triggers on every sensitive table, append-only); this only reads and explains it. Password hashes and
 * the logo are never copied into the log.
 */
import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { assessments, assessmentTypes, auditLogs, classes, classSubjects, enrollments, students, subjects, users } from "@/server/db/schema";
import { assertAdmin, type ServiceContext } from "./guards";
import { parseInput } from "./validate";

const AUDIT_PAGE_SIZE = 50;

/** Areas the principal can filter by, in plain words (table name → label). */
export const AUDIT_AREAS: Record<string, string> = {
  marks: "Marks",
  mark_sheets: "Mark sheets",
  correction_requests: "Correction requests",
  result_approvals: "Result approvals",
  student_remarks: "Remarks",
  students: "Students",
  enrollments: "Enrolments",
  users: "Staff accounts",
  teacher_assignments: "Teacher assignments",
  classes: "Classes",
  sections: "Sections",
  subjects: "Subjects",
  class_subjects: "Class subjects",
  exam_terms: "Exam terms",
  assessments: "Maximum marks",
  assessment_types: "Assessment types",
  grading_scales: "Grading scales",
  grade_boundaries: "Grade bands",
  academic_years: "Academic years",
  school_settings: "School settings",
};

const ACTION_LABEL: Record<string, string> = { INSERT: "Added", UPDATE: "Changed", DELETE: "Deleted" };
/** Bookkeeping fields that say nothing to a reader. */
const HIDDEN = new Set(["id", "created_at", "updated_at", "last_login_at", "password_changed_at"]);

const filterSchema = z.object({
  area: z.enum(Object.keys(AUDIT_AREAS) as [string, ...string[]]).optional().catch(undefined),
  actor: z.string().uuid().optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(100000).catch(1),
});

export interface AuditEntry {
  id: number;
  occurredAt: Date;
  actorName: string;
  action: string;
  area: string;
  /** What the row is about, e.g. "Ali Raza · Mathematics · Monthly Test" for a mark. */
  subject: string | null;
  /** Changed fields as "label: before → after" (or the main fields of an added/deleted row). */
  changes: string[];
  reason: string | null;
}

type Json = Record<string, unknown> | null;

const label = (key: string) => key.replace(/_id$/, "").replace(/^is_/, "").replace(/_/g, " ");

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (/^\d+\.\d+$/.test(value)) return String(Number(value));
    if (/^[0-9a-f-]{36}$/i.test(value)) return "(linked record)";
    return value.length > 80 ? `${value.slice(0, 77)}…` : value;
  }
  return JSON.stringify(value).slice(0, 80);
}

/** A mark row in words: "18", "absent", "new admission", "not taken" or "not entered". */
function markValue(row: Json): string {
  if (!row) return "—";
  if (row.is_absent) return "absent";
  if (row.is_new_admission) return "new admission";
  if (row.is_not_taken) return "not taken";
  return row.marks_obtained === null || row.marks_obtained === undefined ? "not entered" : show(row.marks_obtained);
}

function describeChanges(table: string, action: string, oldData: Json, newData: Json): string[] {
  if (table === "marks") {
    if (action === "UPDATE") return [`mark: ${markValue(oldData)} → ${markValue(newData)}`];
    return [`mark: ${markValue(newData ?? oldData)}`];
  }
  if (action === "UPDATE" && oldData && newData) {
    return Object.keys(newData)
      .filter((k) => !HIDDEN.has(k) && JSON.stringify(oldData[k]) !== JSON.stringify(newData[k]))
      .slice(0, 8)
      .map((k) => `${label(k)}: ${show(oldData[k])} → ${show(newData[k])}`);
  }
  const row = newData ?? oldData ?? {};
  return ["full_name", "name", "student_code", "code", "email", "role", "status", "grade", "max_marks", "roll_number", "reason", "remarks"]
    .filter((k) => k in row && row[k] !== null && row[k] !== "")
    .slice(0, 4)
    .map((k) => `${label(k)}: ${show(row[k])}`);
}

export async function listAuditLog(ctx: ServiceContext, input: unknown): Promise<{ entries: AuditEntry[]; page: number; hasMore: boolean; actors: { id: string; name: string }[] }> {
  assertAdmin(ctx.user);
  const { area, actor, page } = parseInput(filterSchema, input ?? {});
  const where: SQL[] = [];
  if (area) where.push(eq(auditLogs.tableName, area));
  if (actor) where.push(eq(auditLogs.actorId, actor));
  const rows = await ctx.db
    .select({
      id: auditLogs.id,
      occurredAt: auditLogs.occurredAt,
      actorName: users.fullName,
      action: auditLogs.action,
      tableName: auditLogs.tableName,
      oldData: auditLogs.oldData,
      newData: auditLogs.newData,
      reason: auditLogs.reason,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(auditLogs.occurredAt), desc(auditLogs.id))
    .limit(AUDIT_PAGE_SIZE + 1)
    .offset((page - 1) * AUDIT_PAGE_SIZE);
  const hasMore = rows.length > AUDIT_PAGE_SIZE;
  const shown = rows.slice(0, AUDIT_PAGE_SIZE);

  // Marks are only ids in the log; name the student, subject and test so the principal can read them.
  const markRows = shown.filter((r) => r.tableName === "marks").map((r) => (r.newData ?? r.oldData) as Json);
  const enrollmentIds = [...new Set(markRows.map((r) => r?.enrollment_id).filter((v): v is string => typeof v === "string"))];
  const assessmentIds = [...new Set(markRows.map((r) => r?.assessment_id).filter((v): v is string => typeof v === "string"))];
  const studentNames = new Map<string, string>();
  const testNames = new Map<string, string>();
  if (enrollmentIds.length) {
    const found = await ctx.db
      .select({ id: enrollments.id, name: students.fullName, className: classes.name })
      .from(enrollments)
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .innerJoin(classes, eq(classes.id, enrollments.classId))
      .where(inArray(enrollments.id, enrollmentIds));
    for (const f of found) studentNames.set(f.id, `${f.name} (${f.className})`);
  }
  if (assessmentIds.length) {
    const found = await ctx.db
      .select({ id: assessments.id, subject: subjects.name, test: assessmentTypes.name })
      .from(assessments)
      .innerJoin(assessmentTypes, eq(assessmentTypes.id, assessments.assessmentTypeId))
      .innerJoin(classSubjects, eq(classSubjects.id, assessments.classSubjectId))
      .innerJoin(subjects, eq(subjects.id, classSubjects.subjectId))
      .where(inArray(assessments.id, assessmentIds));
    for (const f of found) testNames.set(f.id, `${f.subject} · ${f.test}`);
  }

  const entries = shown.map((r): AuditEntry => {
    const oldData = r.oldData as Json;
    const newData = r.newData as Json;
    const row = newData ?? oldData;
    let subject: string | null = null;
    if (r.tableName === "marks" && row) {
      subject = [studentNames.get(String(row.enrollment_id)) ?? "a student", testNames.get(String(row.assessment_id))].filter(Boolean).join(" · ");
    } else if (row) {
      const name = row.full_name ?? row.name ?? row.student_code ?? row.code;
      subject = typeof name === "string" ? name : null;
    }
    return {
      id: r.id,
      occurredAt: r.occurredAt,
      actorName: r.actorName ?? (r.action === "MIGRATION" ? "System" : "System / setup"),
      action: ACTION_LABEL[r.action] ?? r.action,
      area: AUDIT_AREAS[r.tableName] ?? r.tableName,
      subject,
      changes: describeChanges(r.tableName, r.action, oldData, newData),
      reason: r.reason,
    };
  });

  const actors = await ctx.db
    .select({ id: users.id, name: users.fullName })
    .from(users)
    .where(sql`exists (select 1 from ${auditLogs} where ${auditLogs.actorId} = ${users.id})`)
    .orderBy(users.fullName);
  return { entries, page, hasMore, actors };
}
