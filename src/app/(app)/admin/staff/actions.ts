"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { formFields, runAction } from "@/server/actions";
import { requireAdmin } from "@/server/auth/current";
import { createStaff, resetStaffPassword, setStaffActive, updateStaff } from "@/server/services/staff";

export async function createStaffAction(_prev: ActionResult<{ temporaryPassword: string; email: string }>, formData: FormData) {
  const ctx = await requireAdmin();
  const fields = formFields(formData);
  return runAction(async () => {
    const { temporaryPassword } = await createStaff(ctx, fields);
    revalidatePath("/admin/staff");
    return { message: "Account created.", data: { temporaryPassword, email: fields.email.trim().toLowerCase() } };
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
