"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { safeNextPath } from "@/lib/safe-redirect";
import { formFields, runAction } from "@/server/actions";
import { getRequestMeta, setSessionCookie } from "@/server/auth/current";
import { getDb } from "@/server/db/client";
import { signIn } from "@/server/services/auth";

export async function signInAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const fields = formFields(formData);
  let destination = "/dashboard";
  const result = await runAction(async () => {
    const session = await signIn(getDb(), { email: fields.email, password: fields.password }, await getRequestMeta());
    await setSessionCookie(session.token, session.expiresAt);
    destination = session.mustChangePassword ? "/account/password?required=1" : safeNextPath(fields.next);
  });
  if (!result.ok) return result;
  redirect(destination);
}
