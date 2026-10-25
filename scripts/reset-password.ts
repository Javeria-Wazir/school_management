/**
 * Emergency password reset for someone with database access (e.g. the only administrator forgot
 * their password). Everyday resets are done by an administrator in the app.
 *
 *   npm run db:reset-password -- --email principal@school.edu
 *
 * The new password is typed at a hidden prompt (or read from NEW_PASSWORD). The user is signed out
 * everywhere and the change is recorded in the audit log.
 */
import { config } from "dotenv";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { newPasswordSchema, staffEmailSchema } from "../src/lib/validation/auth";
import { hashPassword } from "../src/server/auth/password";
import { sessions, users } from "../src/server/db/schema";
import { arg, askHidden } from "./prompt";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const email = staffEmailSchema.parse(arg("email") ?? "");
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL (or DATABASE_URL_UNPOOLED) first.");

  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle({ client: pool });
  try {
    const [user] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${email}`);
    if (!user) throw new Error(`No account with the e-mail ${email}.`);
    let password = process.env.NEW_PASSWORD ?? "";
    if (!password) {
      password = await askHidden("New password (min 8 characters, letters and digits): ");
      if (password !== (await askHidden("Repeat password: "))) throw new Error("The passwords do not match.");
    }
    const checked = newPasswordSchema.safeParse(password);
    if (!checked.success) throw new Error(checked.error.issues[0]?.message ?? "Password is too weak.");
    const passwordHash = await hashPassword(password);
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.reason', 'Password reset with npm run db:reset-password', true)`);
      await tx.update(users).set({ passwordHash, isActive: true, mustChangePassword: false, passwordChangedAt: new Date() }).where(eq(users.id, user.id));
      await tx.delete(sessions).where(eq(sessions.userId, user.id));
    });
    console.log(`Password changed for ${email}. The account is active and signed out everywhere.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
