/** Teacher assignments: exactly one subject teacher per section × class subject. */
import { and, asc, eq } from "drizzle-orm";
import { assignmentSchema } from "@/lib/validation/academics";
import type { Db } from "@/server/db/client";
import { withActor } from "@/server/db/actor";
import { classes, classSubjects, sections, subjects, teacherAssignments, users } from "@/server/db/schema";
import { AppError, notFound } from "@/server/errors";
import { assertAdmin, type ServiceContext } from "./guards";
import { parseInput } from "./validate";

export interface AssignmentCell {
  sectionId: string;
  sectionName: string;
  classId: string;
  className: string;
  classSubjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string | null;
  teacherName: string | null;
  teacherActive: boolean | null;
}

/** Every active section × active class subject of the year, with its teacher (or none). */
export async function listAssignmentGrid(db: Db, academicYearId: string): Promise<AssignmentCell[]> {
  return db
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
      teacherActive: users.isActive,
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
    .where(and(eq(sections.academicYearId, academicYearId), eq(sections.isActive, true)))
    .orderBy(asc(classes.sortOrder), asc(classes.name), asc(sections.name), asc(classSubjects.sortOrder), asc(subjects.name));
}

/** Assign (or with an empty teacher, unassign) the teacher of one section's subject. */
export async function setAssignment(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const data = parseInput(assignmentSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const [pair] = await tx
      .select({ sectionId: sections.id })
      .from(sections)
      .innerJoin(classSubjects, and(eq(classSubjects.classId, sections.classId), eq(classSubjects.academicYearId, sections.academicYearId)))
      .where(and(eq(sections.id, data.sectionId), eq(classSubjects.id, data.classSubjectId)));
    if (!pair) throw new AppError("VALIDATION", "That subject is not taught in that section.");
    if (!data.teacherId) {
      await tx
        .delete(teacherAssignments)
        .where(and(eq(teacherAssignments.sectionId, data.sectionId), eq(teacherAssignments.classSubjectId, data.classSubjectId)));
      return;
    }
    const [teacher] = await tx.select({ isActive: users.isActive }).from(users).where(eq(users.id, data.teacherId));
    if (!teacher) throw notFound("Teacher");
    if (!teacher.isActive) throw new AppError("RULE", "This staff account is inactive. Activate it first.");
    await tx
      .insert(teacherAssignments)
      .values({ sectionId: data.sectionId, classSubjectId: data.classSubjectId, teacherId: data.teacherId })
      .onConflictDoUpdate({ target: [teacherAssignments.sectionId, teacherAssignments.classSubjectId], set: { teacherId: data.teacherId } });
  });
}
