"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { runAction } from "@/server/actions";
import { requireUser } from "@/server/auth/current";
import { classApproveResult, finalApproveResult, reopenResult, saveRemarks } from "@/server/services/results";

type ResultKey = { examTermId: string; sectionId: string };

function refresh(key: ResultKey) {
  revalidatePath(`/results/${key.examTermId}/${key.sectionId}`);
  revalidatePath("/results");
  revalidatePath("/marks", "layout");
}

export async function classApproveAction(key: ResultKey): Promise<ActionResult> {
  const ctx = await requireUser();
  return runAction(async () => {
    const { final } = await classApproveResult(ctx, key);
    refresh(key);
    return { message: final ? "Result approved. It is now final." : "Result approved and sent to the principal for final approval." };
  });
}

export async function finalApproveAction(key: ResultKey): Promise<ActionResult> {
  const ctx = await requireUser();
  return runAction(async () => {
    await finalApproveResult(ctx, key);
    refresh(key);
    return { message: "Final approval given. Result cards now print as official." };
  });
}

export async function reopenAction(key: ResultKey, reason: string): Promise<ActionResult> {
  const ctx = await requireUser();
  return runAction(async () => {
    await reopenResult(ctx, { ...key, reason });
    refresh(key);
    return { message: "Result reopened. Marks can be corrected again." };
  });
}

export async function saveRemarksAction(key: ResultKey, enrollmentId: string, remarks: string): Promise<ActionResult> {
  const ctx = await requireUser();
  return runAction(async () => {
    await saveRemarks(ctx, { examTermId: key.examTermId, enrollmentId, remarks });
    refresh(key);
    return { message: remarks.trim() ? "Remarks saved." : "Remarks removed." };
  });
}
