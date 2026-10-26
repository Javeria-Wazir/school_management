"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { runAction } from "@/server/actions";
import { requireUser } from "@/server/auth/current";
import { approveMarkSheet, returnMarkSheet, saveMarks, submitMarkSheet } from "@/server/services/marks";

type SheetKey = { examTermId: string; sectionId: string; classSubjectId: string; stage: "monthly" | "term" };
type Cell = { enrollmentId: string; assessmentId: string; value: string };

function refresh(key: SheetKey) {
  revalidatePath(`/marks/${key.examTermId}/${key.sectionId}/${key.classSubjectId}`);
  revalidatePath("/marks");
  revalidatePath("/results", "layout");
}

export async function saveMarksAction(key: SheetKey, cells: Cell[]): Promise<ActionResult<{ missing: number }>> {
  const ctx = await requireUser();
  return runAction(async () => {
    const result = await saveMarks(ctx, { ...key, marks: cells });
    refresh(key);
    return { message: result.saved ? `Saved ${result.saved} mark${result.saved === 1 ? "" : "s"}.` : "Nothing changed.", data: { missing: result.missing } };
  });
}

export async function submitMarksAction(key: SheetKey): Promise<ActionResult> {
  const ctx = await requireUser();
  return runAction(async () => {
    await submitMarkSheet(ctx, key);
    refresh(key);
    return { message: "Marks submitted to the class teacher." };
  });
}

export async function approveSheetAction(key: SheetKey, sheetId: string): Promise<ActionResult> {
  const ctx = await requireUser();
  return runAction(async () => {
    await approveMarkSheet(ctx, { sheetId });
    refresh(key);
    return { message: "Marks approved." };
  });
}

export async function returnSheetAction(key: SheetKey, sheetId: string, reason: string): Promise<ActionResult> {
  const ctx = await requireUser();
  return runAction(async () => {
    await returnMarkSheet(ctx, { sheetId, reason });
    refresh(key);
    return { message: "Marks returned to the subject teacher." };
  });
}
