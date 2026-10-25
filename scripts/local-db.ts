/**
 * DEVELOPMENT ONLY: a PostgreSQL-compatible server on localhost backed by PGlite, for working without a
 * Neon account. Data is kept in ./.local-db (git-ignored). Never use this for real school records —
 * production data belongs in Neon.
 *
 *   npm run db:local            (port 5433)
 *
 * Then in .env.local:
 *   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/postgres?sslmode=disable"
 *   DATABASE_URL_UNPOOLED="postgresql://postgres:postgres@localhost:5433/postgres?sslmode=disable"
 *   DATABASE_POOL_MAX=1
 */
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

async function main() {
  const port = Number(process.env.LOCAL_DB_PORT ?? 5433);
  const db = await PGlite.create("./.local-db");
  const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 20 });
  await server.start();
  console.log(`Local development database listening on 127.0.0.1:${port} (data in ./.local-db). Press Ctrl+C to stop.`);
  const stop = async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
