"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { formFields, runAction } from "@/server/actions";
import { requireUser } from "@/server/auth/current";
import { changeOwnPassword } from "@/server/services/auth";

export async function changePasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireUser({ allowPasswordChangePending: true });
  const wasRequired = ctx.user.mustChangePassword;
  const result = await runAction(async () => {
    await changeOwnPassword(ctx, formFields(formData));
    return { message: "Password changed. Other devices have been signed out." };
  });
  if (result.ok && wasRequired) redirect("/dashboard");
  return result;
}
