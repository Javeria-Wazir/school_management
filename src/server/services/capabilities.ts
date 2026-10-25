import { and, eq, sql } from "drizzle-orm";
import type { SessionUser } from "@/server/auth/session";
import type { Db } from "@/server/db/client";
import { schoolSettings, sections, teacherAssignments } from "@/server/db/schema";

export interface Capabilities {
  isAdmin: boolean;
  /** Active sections of the current academic year where this user is the class teacher. */
  classTeacherSectionIds: string[];
  /** Subject assignments in the current academic year. */
  subjectAssignmentCount: number;
}

/** What the signed-in user can do, derived from the database (role + assignments in the current year). */
export async function getCapabilities(db: Db, user: SessionUser): Promise<Capabilities> {
  const currentYear = sql`(select ${schoolSettings.currentAcademicYearId} from ${schoolSettings} where ${schoolSettings.id} = 1)`;
  const classSections = await db
    .select({ id: sections.id })
    .from(sections)
    .where(and(eq(sections.classTeacherId, user.id), eq(sections.isActive, true), sql`${sections.academicYearId} = ${currentYear}`));
  const [assignments] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(teacherAssignments)
    .innerJoin(sections, eq(sections.id, teacherAssignments.sectionId))
    .where(and(eq(teacherAssignments.teacherId, user.id), sql`${sections.academicYearId} = ${currentYear}`));
  return { isAdmin: user.role === "admin", classTeacherSectionIds: classSections.map((s) => s.id), subjectAssignmentCount: assignments?.n ?? 0 };
}

export function roleLabel(caps: Capabilities): string {
  if (caps.isAdmin) return "Principal / Administrator";
  if (caps.classTeacherSectionIds.length > 0) return caps.subjectAssignmentCount > 0 ? "Class & Subject Teacher" : "Class Teacher";
  return "Subject Teacher";
}
