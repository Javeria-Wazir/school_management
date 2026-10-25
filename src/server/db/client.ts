/**
 * PostgreSQL connection for the application (node-postgres pool → Neon's pooled endpoint).
 * One pool per server instance; on Vercel, `attachDatabasePool` lets idle clients close cleanly
 * when a function instance is suspended.
 */
import { attachDatabasePool } from "@vercel/functions";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import * as schema from "./schema";

export type Schema = typeof schema;
/** Any Drizzle PostgreSQL database with our schema (node-postgres in the app, PGlite in tests). */
export type Db = PgDatabase<PgQueryResultHKT, Schema>;
export type Tx = PgTransaction<PgQueryResultHKT, Schema, ExtractTablesWithRelations<Schema>>;

let cached: Db | undefined;

export function getDb(): Db {
  if (cached) return cached;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  }
  const max = Number(process.env.DATABASE_POOL_MAX ?? 5);
  const pool = new Pool({ connectionString, max: Number.isInteger(max) && max > 0 ? max : 5, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 });
  // An idle connection closed by the server (Neon scale-to-zero, network drop) must not crash the process;
  // the pool discards it and opens a new one for the next query.
  pool.on("error", (error) => console.error("Database pool: idle connection closed:", error.message));
  attachDatabasePool(pool);
  cached = drizzle({ client: pool, schema }) as unknown as Db;
  return cached;
}
