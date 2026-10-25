"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { formFields, runAction } from "@/server/actions";
import { requireAdmin } from "@/server/auth/current";
import { createClass, createSection, deleteClass, deleteSection, updateClass, updateSection } from "@/server/services/classes";

const PATH = "/admin/classes";

export async function saveClassAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const fields = formFields(formData);
  return runAction(async () => {
    if (fields.id) await updateClass(ctx, fields);
    else await createClass(ctx, fields);
    revalidatePath(PATH);
    return { message: fields.id ? "Class updated." : "Class added." };
  });
}

export async function deleteClassAction(id: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    await deleteClass(ctx, id);
    revalidatePath(PATH);
    return { message: "Class deleted." };
  });
}

export async function saveSectionAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const fields = formFields(formData);
  return runAction(async () => {
    if (fields.id) await updateSection(ctx, fields);
    else await createSection(ctx, fields);
    revalidatePath(PATH);
    return { message: fields.id ? "Section updated." : "Section added." };
  });
}

export async function deleteSectionAction(id: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    await deleteSection(ctx, id);
    revalidatePath(PATH);
    return { message: "Section deleted." };
  });
}
