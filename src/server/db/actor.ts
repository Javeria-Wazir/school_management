import { sql } from "drizzle-orm";
import type { Db, Tx } from "./client";

/**
 * Run `fn` in one transaction that tells the audit triggers who is acting (and, optionally, why).
 * Every write made by a service goes through here, so the audit log is complete by construction.
 */
export async function withActor<T>(db: Db, actorId: string | null, fn: (tx: Tx) => Promise<T>, reason?: string): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.actor_id', ${actorId ?? ""}, true), set_config('app.reason', ${reason ?? ""}, true)`,
    );
    return fn(tx as Tx);
  });
}
