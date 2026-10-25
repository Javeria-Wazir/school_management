"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie, getSessionToken } from "@/server/auth/current";
import { deleteSessionByToken } from "@/server/auth/session";
import { getDb } from "@/server/db/client";

/** Sign out: delete the session in the database (so the token is useless) and clear the cookie. */
export async function signOutAction() {
  const token = await getSessionToken();
  if (token) await deleteSessionByToken(getDb(), token);
  await clearSessionCookie();
  redirect("/login");
}
