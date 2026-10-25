/**
 * Sign-in and own-password changes. Framework-free (no cookies here) so it can be tested directly;
 * the Server Actions in app/login and app/(app)/account set and clear the cookie.
 */
import { eq, sql } from "drizzle-orm";
import { changePasswordSchema, signInSchema } from "@/lib/validation/auth";
import { getDummyHash, hashPassword, verifyPassword } from "@/server/auth/password";
import { isSignInBlocked, pruneSignInAttempts, recordSignInAttempt } from "@/server/auth/rate-limit";
import { createSession, deleteExpiredSessions, deleteUserSessions, type SessionUser } from "@/server/auth/session";
import type { Db } from "@/server/db/client";
import { withActor } from "@/server/db/actor";
import { users } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { parseInput } from "./validate";

export const SIGN_IN_FAILED = "Incorrect e-mail or password.";
export const SIGN_IN_BLOCKED = "Too many failed sign-in attempts. Please wait 15 minutes and try again.";

export interface SignInResult {
  token: string;
  expiresAt: Date;
  mustChangePassword: boolean;
}

export async function signIn(
  db: Db,
  input: unknown,
  meta: { ipAddress: string | null; userAgent: string | null },
  now = new Date(),
): Promise<SignInResult> {
  const { email, password } = parseInput(signInSchema, input);
  if (await isSignInBlocked(db, email, meta.ipAddress, now)) {
    throw new AppError("FORBIDDEN", SIGN_IN_BLOCKED);
  }

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash, isActive: users.isActive, mustChangePassword: users.mustChangePassword })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  // Unknown e-mails still spend the time of a real hash check, so timing does not reveal accounts.
  const valid = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) {
    await recordSignInAttempt(db, email, meta.ipAddress, false, now);
    throw new AppError("UNAUTHENTICATED", SIGN_IN_FAILED);
  }
  if (!user.isActive) {
    await recordSignInAttempt(db, email, meta.ipAddress, false, now);
    throw new AppError("FORBIDDEN", "This account has been deactivated. Please contact the principal.");
  }

  await recordSignInAttempt(db, email, meta.ipAddress, true, now);
  await db.update(users).set({ lastLoginAt: now }).where(eq(users.id, user.id));
  const session = await createSession(db, user.id, meta, now);
  if (Math.random() < 0.05) {
    await deleteExpiredSessions(db, now);
    await pruneSignInAttempts(db, now);
  }
  return { ...session, mustChangePassword: user.mustChangePassword };
}

/** Change your own password. Signs out every other session of this user. */
export async function changeOwnPassword(ctx: { db: Db; user: SessionUser }, input: unknown): Promise<void> {
  const data = parseInput(changePasswordSchema, input);
  const [row] = await ctx.db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
  if (!row || !(await verifyPassword(data.currentPassword, row.passwordHash))) {
    throw new AppError("VALIDATION", "Your current password is not correct.", { currentPassword: ["Your current password is not correct."] });
  }
  const passwordHash = await hashPassword(data.newPassword);
  await withActor(
    ctx.db,
    ctx.user.id,
    async (tx) => {
      await tx.update(users).set({ passwordHash, mustChangePassword: false, passwordChangedAt: new Date() }).where(eq(users.id, ctx.user.id));
      await deleteUserSessions(tx, ctx.user.id, ctx.user.sessionId);
    },
    "Changed own password",
  );
}
