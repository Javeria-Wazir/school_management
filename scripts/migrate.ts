/**
 * Apply pending SQL migrations from ./drizzle. Safe to run on every deploy: Drizzle records applied
 * migrations in drizzle.__drizzle_migrations and only runs new files, inside a transaction.
 *
 *   npm run db:migrate
 */
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) {
    console.error("Set DATABASE_URL_UNPOOLED (or DATABASE_URL) before running migrations.");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 15_000 });
  try {
    const host = new URL(url).hostname;
    console.log(`Applying migrations to ${host} ...`);
    await migrate(drizzle({ client: pool }), { migrationsFolder: "drizzle" });
    console.log("Migrations are up to date.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
