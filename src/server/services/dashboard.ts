/** Dashboard figures. Every number here is counted from the database at request time. */
import { and, asc, eq, sql, type SQL } from "drizzle-orm";
import { academicYears, classes, classSubjects, schoolSettings, sections, subjects, teacherAssignments, users } from "@/server/db/schema";
import { assertAdmin, type ServiceContext } from "./guards";

export interface AdminOverview {
  staff: { admins: number; teachers: number; inactive: number; awaitingFirstSignIn: number };
  currentYear: { id: string; name: string } | null;
  schoolNameSet: boolean;
  counts: { classes: number; subjects: number; sections: number; students: number; examTerms: number; assignments: number; classTeachers: number };
}

export async function getAdminOverview(ctx: ServiceContext): Promise<AdminOverview> {
  assertAdmin(ctx.user);
  const [staff] = await ctx.db
    .select({
      admins: sql<number>`count(*) filter (where ${users.role} = 'admin' and ${users.isActive})::int`,
      teachers: sql<number>`count(*) filter (where ${users.role} = 'teacher' and ${users.isActive})::int`,
      inactive: sql<number>`count(*) filter (where not ${users.isActive})::int`,
      awaitingFirstSignIn: sql<number>`count(*) filter (where ${users.isActive} and ${users.lastLoginAt} is null)::int`,
    })
    .from(users);

  const yearId = academicYears.id;
  const count = (query: SQL) => sql<number>`(${query})`.mapWith(Number);
  const [row] = await ctx.db
    .select({
      yearId,
      yearName: academicYears.name,
      schoolName: schoolSettings.schoolName,
      classes: count(sql`select count(*) from classes where is_active`),
      subjects: count(sql`select count(*) from subjects where is_active`),
      sections: count(sql`select count(*) from sections where academic_year_id = ${yearId} and is_active`),
      students: count(sql`select count(*) from enrollments where academic_year_id = ${yearId} and status = 'active'`),
      examTerms: count(sql`select count(*) from exam_terms where academic_year_id = ${yearId}`),
      assignments: count(
        sql`select count(*) from teacher_assignments ta join sections se on se.id = ta.section_id where se.academic_year_id = ${yearId}`,
      ),
      classTeachers: count(sql`select count(*) from sections where academic_year_id = ${yearId} and is_active and class_teacher_id is not null`),
    })
    .from(schoolSettings)
    .leftJoin(academicYears, eq(academicYears.id, schoolSettings.currentAcademicYearId))
    .where(eq(schoolSettings.id, 1));

  return {
    staff,
    currentYear: row.yearId && row.yearName ? { id: row.yearId, name: row.yearName } : null,
    schoolNameSet: row.schoolName !== "School Name",
    counts: {
      classes: row.classes,
      subjects: row.subjects,
      sections: row.sections,
      students: row.students,
      examTerms: row.examTerms,
      assignments: row.assignments,
      classTeachers: row.classTeachers,
    },
  };
}

export interface TeacherAssignmentRow {
  className: string;
  sectionName: string;
  subjectName: string;
}

export interface TeacherOverview {
  assignments: TeacherAssignmentRow[];
  classTeacherOf: { className: string; sectionName: string }[];
}

/** The signed-in teacher's own assignments in the current academic year. */
export async function getTeacherOverview(ctx: ServiceContext): Promise<TeacherOverview> {
  const currentYear = sql`(select ${schoolSettings.currentAcademicYearId} from ${schoolSettings} where ${schoolSettings.id} = 1)`;
  const assignments = await ctx.db
    .select({ className: classes.name, sectionName: sections.name, subjectName: subjects.name })
    .from(teacherAssignments)
    .innerJoin(sections, eq(sections.id, teacherAssignments.sectionId))
    .innerJoin(classes, eq(classes.id, sections.classId))
    .innerJoin(classSubjects, eq(classSubjects.id, teacherAssignments.classSubjectId))
    .innerJoin(subjects, eq(subjects.id, classSubjects.subjectId))
    .where(and(eq(teacherAssignments.teacherId, ctx.user.id), sql`${sections.academicYearId} = ${currentYear}`))
    .orderBy(asc(classes.sortOrder), asc(sections.name), asc(classSubjects.sortOrder));
  const classTeacherOf = await ctx.db
    .select({ className: classes.name, sectionName: sections.name })
    .from(sections)
    .innerJoin(classes, eq(classes.id, sections.classId))
    .where(and(eq(sections.classTeacherId, ctx.user.id), eq(sections.isActive, true), sql`${sections.academicYearId} = ${currentYear}`))
    .orderBy(asc(classes.sortOrder), asc(sections.name));
  return { assignments, classTeacherOf };
}
