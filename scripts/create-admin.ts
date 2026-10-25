/**
 * Create the first Principal / Administrator account. There is no public sign-up, so this is the
 * only way in on a fresh database. It refuses to run once an active administrator exists
 * (after that, administrators are managed in the app).
 *
 *   npm run db:create-admin -- --email principal@school.edu --name "Principal Name"
 *
 * The password is typed at a hidden prompt (or read from ADMIN_PASSWORD for automated setups).
 *
 *   npm run db:create-admin -- --email ... --name "..." --temporary .admin-temporary-password.txt
 *
 * `--temporary <file>` instead generates a one-time password, writes it only to that (git-ignored) file,
 * and forces a password change at first sign-in. Delete the file once the password has been changed.
 */
import { existsSync, writeFileSync } from "node:fs";
import { config } from "dotenv";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { generateTemporaryPassword, hashPassword } from "../src/server/auth/password";
import { users } from "../src/server/db/schema";
import { newPasswordSchema, staffEmailSchema, staffNameSchema } from "../src/lib/validation/auth";
import { arg, askHidden } from "./prompt";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const email = staffEmailSchema.parse(arg("email") ?? "");
  const fullName = staffNameSchema.parse(arg("name") ?? "");
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL (or DATABASE_URL_UNPOOLED) first.");

  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle({ client: pool });
  try {
    const existing = await db.select({ id: users.id }).from(users).where(and(eq(users.role, "admin"), eq(users.isActive, true))).limit(1);
    if (existing.length > 0) {
      throw new Error("An active administrator already exists. Sign in and manage staff accounts in the app.");
    }
    const temporaryFile = arg("temporary");
    if (temporaryFile && existsSync(temporaryFile)) throw new Error(`${temporaryFile} already exists; choose another file name.`);
    let password = temporaryFile ? generateTemporaryPassword() : (process.env.ADMIN_PASSWORD ?? "");
    if (!password) {
      password = await askHidden("Password (min 8 characters, letters and digits): ");
      const again = await askHidden("Repeat password: ");
      if (password !== again) throw new Error("The passwords do not match.");
    }
    const checked = newPasswordSchema.safeParse(password);
    if (!checked.success) throw new Error(checked.error.issues[0]?.message ?? "Password is too weak.");

    const passwordHash = await hashPassword(password);
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.reason', 'First administrator created with npm run db:create-admin', true)`);
      await tx.insert(users).values({
        email,
        fullName,
        role: "admin",
        isActive: true,
        mustChangePassword: Boolean(temporaryFile),
        passwordHash,
        passwordChangedAt: new Date(),
      });
    });
    if (temporaryFile) {
      writeFileSync(temporaryFile, `Sign-in e-mail: ${email}
Temporary password: ${password}
You must choose a new password at first sign-in. Delete this file afterwards.
`, { flag: "wx" });
      console.log(`Administrator account created for ${email}. The temporary password is in ${temporaryFile}.`);
    } else {
      console.log(`Administrator account created for ${email}. You can now sign in.`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
