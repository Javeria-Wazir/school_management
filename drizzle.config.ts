import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Same precedence as Next.js: .env.local wins over .env. Real environment variables win over both.
config({ path: [".env.local", ".env"], quiet: true });

// Migrations need a direct (unpooled) connection; fall back to DATABASE_URL for local Postgres.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
