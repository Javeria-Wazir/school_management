"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { runAction } from "@/server/actions";
import { requireUser } from "@/server/auth/current";
import { addSubjectToClass, deleteStudentRecord, removeStudentFromClass, restoreStudentToClass, updateMyClassSubject } from "@/server/services/my-class";

function refresh() {
  revalidatePath("/my-class");
  revalidatePath("/marks", "layout");
  revalidatePath("/results", "layout");
}

export async function removeStudentAction(enrollmentId: string, reason: string): Promise<ActionResult> {
  const ctx = await requireUser();
  return runAction(async () => {
    await removeStudentFromClass(ctx, { enrollmentId, reason });
    refresh();
    return { message: "Student removed from the class list. Their marks and history are kept." };
  });
}

export async function restoreStudentAction(enrollmentId: string): Promise<ActionResult> {
  const ctx = await requireUser();
  return runAction(async () => {
    await restoreStudentToClass(ctx, enrollmentId);
    refresh();
    return { message: "Student is back on the class list." };
  });
}

export async function deleteStudentAction(enrollmentId: string, reason: string): Promise<ActionResult> {
  const ctx = await requireUser();
  return runAction(async () => {
    await deleteStudentRecord(ctx, { enrollmentId, reason });
    refresh();
    return { message: "Student deleted." };
  });
}

export async function addSubjectAction(sectionId: string, subjectId: string): Promise<ActionResult> {
  const ctx = await requireUser();
  return runAction(async () => {
    await addSubjectToClass(ctx, { sectionId, subjectId });
    refresh();
    return { message: "Subject added. Its mark sheets are ready." };
  });
}

export async function updateSubjectAction(
  sectionId: string,
  classSubjectId: string,
  settings: { isCompulsory: boolean; includeInTotal: boolean; isActive: boolean },
): Promise<ActionResult> {
  const ctx = await requireUser();
  return runAction(async () => {
    await updateMyClassSubject(ctx, { sectionId, classSubjectId, ...settings });
    refresh();
    return { message: "Subject updated." };
  });
}
