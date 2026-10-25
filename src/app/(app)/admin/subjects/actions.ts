"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { formFields, runAction } from "@/server/actions";
import { requireAdmin } from "@/server/auth/current";
import { addClassSubjects, copyClassSubjects, createSubject, deleteSubject, removeClassSubject, updateClassSubject, updateSubject } from "@/server/services/subjects";

const PATH = "/admin/subjects";

export async function saveSubjectAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const fields = formFields(formData);
  return runAction(async () => {
    if (fields.id) await updateSubject(ctx, fields);
    else await createSubject(ctx, fields);
    revalidatePath(PATH);
    return { message: fields.id ? "Subject updated." : "Subject added." };
  });
}

export async function deleteSubjectAction(id: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    await deleteSubject(ctx, id);
    revalidatePath(PATH);
    return { message: "Subject deleted." };
  });
}

export async function addClassSubjectsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    const { added } = await addClassSubjects(ctx, {
      classId: formData.get("classId"),
      academicYearId: formData.get("academicYearId"),
      subjectIds: formData.getAll("subjectIds"),
    });
    revalidatePath(PATH);
    return { message: added ? `${added} subject${added === 1 ? "" : "s"} added.` : "Those subjects were already part of the class." };
  });
}

export async function updateClassSubjectAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    await updateClassSubject(ctx, formFields(formData));
    revalidatePath(PATH);
    return { message: "Saved." };
  });
}

export async function removeClassSubjectAction(id: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    await removeClassSubject(ctx, id);
    revalidatePath(PATH);
    return { message: "Subject removed from the class." };
  });
}

export async function copyClassSubjectsAction(fromYearId: string, toYearId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    const { added } = await copyClassSubjects(ctx, { fromYearId, toYearId });
    revalidatePath(PATH);
    return { message: `${added} class subject${added === 1 ? "" : "s"} copied.` };
  });
}
