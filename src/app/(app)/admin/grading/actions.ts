"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { formFields, runAction } from "@/server/actions";
import { requireAdmin } from "@/server/auth/current";
import { deleteGradingScale, saveGradingScale, setDefaultGradingScale } from "@/server/services/grading";

const PATH = "/admin/grading";

export async function saveGradingScaleAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const fields = formFields(formData);
  return runAction(async () => {
    await saveGradingScale(ctx, fields);
    revalidatePath(PATH);
    return { message: fields.id ? "Grading scale saved." : "Grading scale created." };
  });
}

export async function setDefaultGradingScaleAction(id: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    await setDefaultGradingScale(ctx, id);
    revalidatePath(PATH);
    return { message: "Default grading scale changed." };
  });
}

export async function deleteGradingScaleAction(id: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    await deleteGradingScale(ctx, id);
    revalidatePath(PATH);
    return { message: "Grading scale deleted." };
  });
}
