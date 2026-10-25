import { and, count, eq, gt, lt, sql } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { loginAttempts } from "@/server/db/schema";
import { LOGIN_LIMITS } from "./config";

/**
 * Failed sign-ins are counted per e-mail (since its last successful sign-in) and per IP address,
 * within a sliding window. Both limits apply whether or not the account exists.
 */
export async function isSignInBlocked(db: Db, emailKey: string, ipAddress: string | null, now = new Date()): Promise<boolean> {
  const since = new Date(now.getTime() - LOGIN_LIMITS.windowMinutes * 60_000);
  const lastSuccess = sql`coalesce((select max(attempted_at) from login_attempts where email_key = ${emailKey} and success), '-infinity'::timestamptz)`;
  const [byEmail] = await db
    .select({ n: count() })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.emailKey, emailKey), eq(loginAttempts.success, false), gt(loginAttempts.attemptedAt, since), sql`${loginAttempts.attemptedAt} > ${lastSuccess}`));
  if (byEmail.n >= LOGIN_LIMITS.maxFailuresPerEmail) return true;
  if (!ipAddress) return false;
  const [byIp] = await db
    .select({ n: count() })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.ipAddress, ipAddress), eq(loginAttempts.success, false), gt(loginAttempts.attemptedAt, since)));
  return byIp.n >= LOGIN_LIMITS.maxFailuresPerIp;
}

export async function recordSignInAttempt(db: Db, emailKey: string, ipAddress: string | null, success: boolean, now = new Date()) {
  await db.insert(loginAttempts).values({ emailKey: emailKey.slice(0, 254), ipAddress: ipAddress?.slice(0, 64) ?? null, success, attemptedAt: now });
}

/** Keep the table small; old attempts have no further use. */
export async function pruneSignInAttempts(db: Db, now = new Date()) {
  await db.delete(loginAttempts).where(lt(loginAttempts.attemptedAt, new Date(now.getTime() - 30 * 24 * 3600_000)));
}
