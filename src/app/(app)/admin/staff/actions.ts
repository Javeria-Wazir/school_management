"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { formFields, runAction } from "@/server/actions";
import { requireAdmin } from "@/server/auth/current";
import { setTeacherClass } from "@/server/services/my-class";
import { createStaff, resetStaffPassword, setStaffActive, updateStaff } from "@/server/services/staff";

export async function createStaffAction(_prev: ActionResult<{ temporaryPassword: string; email: string }>, formData: FormData) {
  const ctx = await requireAdmin();
  const fields = formFields(formData);
  return runAction(async () => {
    const { id, temporaryPassword } = await createStaff(ctx, fields);
    // Optional: make the new teacher class teacher of a section straight away.
    if (fields.sectionId && fields.sectionId !== "none") await setTeacherClass(ctx, { teacherId: id, sectionId: fields.sectionId });
    revalidatePath("/admin/staff");
    revalidatePath("/admin/classes");
    return { message: "Account created.", data: { temporaryPassword, email: fields.email.trim().toLowerCase() } };
  });
}

export async function setTeacherClassAction(teacherId: string, sectionId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    const { replaced } = await setTeacherClass(ctx, { teacherId, sectionId });
    revalidatePath("/admin/staff");
    revalidatePath("/admin/classes");
    revalidatePath("/my-class");
    return { message: sectionId === "none" ? "No longer a class teacher." : replaced ? `Class changed. ${replaced} is no longer this class's teacher.` : "Class changed." };
  });
}

export async function updateStaffAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    await updateStaff(ctx, formFields(formData));
    revalidatePath("/admin/staff");
    return { message: "Changes saved." };
  });
}

export async function setStaffActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    await setStaffActive(ctx, { id, active });
    revalidatePath("/admin/staff");
    return { message: active ? "Account activated." : "Account deactivated and signed out." };
  });
}

export async function resetStaffPasswordAction(id: string): Promise<ActionResult<{ temporaryPassword: string }>> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    const data = await resetStaffPassword(ctx, { id });
    revalidatePath("/admin/staff");
    return { message: "Temporary password issued.", data };
  });
}
