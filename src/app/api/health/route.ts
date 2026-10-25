import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";

/**
 * Deployment check: is the database reachable and migrated? Reveals no data or configuration.
 * Use it after each deploy: GET /api/health → {"status":"ok","database":"ok"}.
 */
export async function GET() {
  try {
    await getDb().execute(sql`select 1 from school_settings where id = 1`);
    return Response.json({ status: "ok", database: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Health check failed:", error instanceof Error ? error.message.split("\nparams:")[0] : error);
    return Response.json({ status: "error", database: "unreachable or not migrated" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
