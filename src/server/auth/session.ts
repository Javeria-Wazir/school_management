/**
 * Database-backed sessions. The browser holds a random 256-bit token in an HttpOnly cookie; the
 * database stores only its SHA-256 hash, so a leaked database cannot be used to sign in.
 *
 * This file has no Next.js imports so it can be tested against a real database.
 */
import { createHash, randomBytes } from "node:crypto";
import { and, eq, lt, ne } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { sessions, users, type UserRole } from "@/server/db/schema";
import { getAuthConfig } from "@/server/auth/config";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  mustChangePassword: boolean;
  sessionId: string;
}

/** Only write `last_seen_at` when it is older than this, to avoid a write on every request. */
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  db: Db,
  userId: string,
  meta: { ipAddress?: string | null; userAgent?: string | null } = {},
  now = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const { maxHours } = getAuthConfig();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + maxHours * 3600_000);
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    createdAt: now,
    lastSeenAt: now,
    expiresAt,
    ipAddress: meta.ipAddress?.slice(0, 64) ?? null,
    userAgent: meta.userAgent?.slice(0, 300) ?? null,
  });
  return { token, expiresAt };
}

/**
 * Returns the signed-in user, or `null` when the token is unknown, expired, idle for too long, or the
 * account is inactive. The user row is read on every call, so deactivation and role changes apply at once.
 */
export async function validateSessionToken(db: Db, token: string, now = new Date()): Promise<SessionUser | null> {
  if (!token || token.length > 100) return null;
  const id = hashToken(token);
  const rows = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      lastSeenAt: sessions.lastSeenAt,
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      isActive: users.isActive,
      mustChangePassword: users.mustChangePassword,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const { idleMinutes } = getAuthConfig();
  const idleExpired = now.getTime() - row.lastSeenAt.getTime() > idleMinutes * 60_000;
  if (!row.isActive || row.expiresAt <= now || idleExpired) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  if (now.getTime() - row.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, id));
  }
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    role: row.role,
    mustChangePassword: row.mustChangePassword,
    sessionId: row.sessionId,
  };
}

export async function deleteSessionByToken(db: Db, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

/** Sign a user out everywhere (optionally keeping the current session). */
export async function deleteUserSessions(db: Db, userId: string, exceptSessionId?: string): Promise<void> {
  await db
    .delete(sessions)
    .where(exceptSessionId ? and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId)) : eq(sessions.userId, userId));
}

export async function deleteExpiredSessions(db: Db, now = new Date()): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}
