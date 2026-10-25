import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb, type Db } from "@/server/db/client";
import { SESSION_COOKIE } from "./config";
import { devAutoLoginEmail, loadDevAutoLoginUser } from "./dev-auto-login";
import { validateSessionToken, type SessionUser } from "./session";

/** The signed-in user for this request (validated against the database once per request). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = token ? await validateSessionToken(getDb(), token) : null;
  if (user) return user;
  // Development only (refused in production): act as the configured staff member without signing in.
  const devEmail = devAutoLoginEmail();
  return devEmail ? loadDevAutoLoginUser(getDb(), devEmail) : null;
});

export interface RequestContext {
  db: Db;
  user: SessionUser;
}

/**
 * Use at the top of every protected page and Server Action. Redirects to sign-in when there is no
 * valid session, and to the password page while a temporary password must still be changed.
 */
export async function requireUser(options: { allowPasswordChangePending?: boolean } = {}): Promise<RequestContext> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword && !options.allowPasswordChangePending) redirect("/account/password?required=1");
  return { db: getDb(), user };
}

/** Principal / Administrator only. Other users see the not-authorised page. */
export async function requireAdmin(): Promise<RequestContext> {
  const ctx = await requireUser();
  if (ctx.user.role !== "admin") redirect("/forbidden");
  return ctx;
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/" });
}

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Client metadata for the session record and rate limiting. Vercel sets x-forwarded-for. */
export async function getRequestMeta(): Promise<{ ipAddress: string | null; userAgent: string | null }> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return { ipAddress: forwarded || h.get("x-real-ip") || null, userAgent: h.get("user-agent") };
}
