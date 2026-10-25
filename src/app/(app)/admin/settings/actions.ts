"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { formFields, runAction } from "@/server/actions";
import { requireAdmin } from "@/server/auth/current";
import { updateSchoolLogo, updateSchoolSettings } from "@/server/services/settings";
import { AppError } from "@/server/errors";

export async function saveSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    await updateSchoolSettings(ctx, formFields(formData));
    revalidatePath("/", "layout");
    return { message: "Settings saved." };
  });
}

export async function uploadLogoAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    const file = formData.get("logo");
    if (!(file instanceof File) || file.size === 0) throw new AppError("VALIDATION", "Choose a PNG or JPEG image.");
    await updateSchoolLogo(ctx, { bytes: new Uint8Array(await file.arrayBuffer()) });
    revalidatePath("/admin/settings");
    return { message: "Logo updated." };
  });
}

export async function removeLogoAction(): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    await updateSchoolLogo(ctx, null);
    revalidatePath("/admin/settings");
    return { message: "Logo removed." };
  });
}
