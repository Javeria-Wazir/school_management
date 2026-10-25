"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { formFields, runAction } from "@/server/actions";
import { requireAdmin } from "@/server/auth/current";
import {
  createAssessmentType,
  createExamTerm,
  deleteExamTerm,
  prepareTermAssessments,
  setCurrentExamTerm,
  setMaxMarks,
  updateAssessmentType,
  updateExamTerm,
} from "@/server/services/exam-terms";

const PATH = "/admin/exam-terms";

export async function saveExamTermAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const fields = formFields(formData);
  return runAction(async () => {
    if (fields.id) await updateExamTerm(ctx, fields);
    else await createExamTerm(ctx, fields);
    revalidatePath("/", "layout");
    return { message: fields.id ? "Exam term updated." : "Exam term added." };
  });
}

export async function deleteExamTermAction(id: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    await deleteExamTerm(ctx, id);
    revalidatePath(PATH);
    return { message: "Exam term deleted." };
  });
}

export async function setCurrentExamTermAction(id: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    await setCurrentExamTerm(ctx, id);
    revalidatePath("/", "layout");
    return { message: "Current exam term changed." };
  });
}

export async function saveAssessmentTypeAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const fields = formFields(formData);
  return runAction(async () => {
    if (fields.id) await updateAssessmentType(ctx, fields);
    else await createAssessmentType(ctx, fields);
    revalidatePath(PATH);
    return { message: fields.id ? "Component updated. Terms prepared earlier keep their maximums." : "Component added." };
  });
}

export async function prepareAssessmentsAction(termId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    const { created } = await prepareTermAssessments(ctx, termId);
    revalidatePath(PATH);
    return { message: created ? `${created} maximum${created === 1 ? "" : "s"} set up with the default marks.` : "Everything was already set up." };
  });
}

export async function setMaxMarksAction(assessmentId: string, maxMarks: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    await setMaxMarks(ctx, { assessmentId, maxMarks });
    revalidatePath(PATH);
    return { message: "Maximum saved." };
  });
}
