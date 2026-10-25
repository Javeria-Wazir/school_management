import type { SessionUser } from "@/server/auth/session";
import type { Db } from "@/server/db/client";
import { forbidden } from "@/server/errors";

/** What every service receives: the database and the signed-in user (validated for this request). */
export interface ServiceContext {
  db: Db;
  user: SessionUser;
}

export function assertAdmin(user: SessionUser): void {
  if (user.role !== "admin") throw forbidden("Only the principal or an administrator can do this.");
}
