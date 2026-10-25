/**
 * DEVELOPMENT ONLY: skip the sign-in page while features are being reviewed.
 *
 * With `DEV_AUTO_LOGIN=<staff e-mail>` in .env.local, a request without a valid session is treated as
 * that (active) staff member. Every server-side permission check still runs, with that user's real role.
 * It is refused in production builds, so it can never open a deployed site.
 */
import { sql } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import type { SessionUser } from "./session";

import { DEV_AUTO_LOGIN_SESSION_ID } from "./config";

export { DEV_AUTO_LOGIN_SESSION_ID, devAutoLoginEmail } from "./config";

export async function loadDevAutoLoginUser(db: Db, email: string): Promise<SessionUser | null> {
  const [row] = await db
    .select({ id: users.id, email: users.email, fullName: users.fullName, role: users.role, isActive: users.isActive, mustChangePassword: users.mustChangePassword })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  if (!row || !row.isActive) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    role: row.role,
    mustChangePassword: row.mustChangePassword,
    sessionId: DEV_AUTO_LOGIN_SESSION_ID,
  };
}
