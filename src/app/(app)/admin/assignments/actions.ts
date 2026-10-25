"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { runAction } from "@/server/actions";
import { requireAdmin } from "@/server/auth/current";
import { setAssignment } from "@/server/services/assignments";

export async function setAssignmentAction(sectionId: string, classSubjectId: string, teacherId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    await setAssignment(ctx, { sectionId, classSubjectId, teacherId });
    revalidatePath("/admin/assignments");
    return { message: teacherId ? "Teacher assigned." : "Assignment removed." };
  });
}
