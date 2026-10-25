"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { formFields, runAction } from "@/server/actions";
import { requireAdmin } from "@/server/auth/current";
import { createAcademicYear, deleteAcademicYear, setCurrentAcademicYear, updateAcademicYear } from "@/server/services/academic-years";

export async function saveAcademicYearAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const fields = formFields(formData);
  return runAction(async () => {
    if (fields.id) await updateAcademicYear(ctx, fields);
    else await createAcademicYear(ctx, fields);
    revalidatePath("/", "layout");
    return { message: fields.id ? "Academic year updated." : "Academic year created." };
  });
}

export async function setCurrentAcademicYearAction(id: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    await setCurrentAcademicYear(ctx, id);
    revalidatePath("/", "layout");
    return { message: "Current academic year changed." };
  });
}

export async function deleteAcademicYearAction(id: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    await deleteAcademicYear(ctx, id);
    revalidatePath("/", "layout");
    return { message: "Academic year deleted." };
  });
}
