/**
 * Staff accounts (Principal / Administrator only). Accounts are never hard-deleted — they are
 * deactivated, so marks and audit entries keep pointing at a real person.
 */
import { asc, eq, sql } from "drizzle-orm";
import { createStaffSchema, setStaffActiveSchema, staffIdSchema, updateStaffSchema } from "@/lib/validation/staff";
import { generateTemporaryPassword, hashPassword } from "@/server/auth/password";
import { deleteUserSessions } from "@/server/auth/session";
import { withActor } from "@/server/db/actor";
import { users, type UserRole } from "@/server/db/schema";
import { AppError, notFound } from "@/server/errors";
import { assertAdmin, type ServiceContext } from "./guards";
import { parseInput } from "./validate";

export interface StaffRow {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  classTeacherOf: number;
  subjectAssignments: number;
}

export async function listStaff(ctx: ServiceContext): Promise<StaffRow[]> {
  assertAdmin(ctx.user);
  return ctx.db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
      mustChangePassword: users.mustChangePassword,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      classTeacherOf: sql<number>`(select count(*)::int from sections s where s.class_teacher_id = "users"."id" and s.is_active)`,
      subjectAssignments: sql<number>`(select count(*)::int from teacher_assignments ta where ta.teacher_id = "users"."id")`,
    })
    .from(users)
    .orderBy(asc(users.fullName));
}

/** Creates the account with a one-time temporary password, which the caller shows to the principal once. */
export async function createStaff(ctx: ServiceContext, input: unknown): Promise<{ id: string; temporaryPassword: string }> {
  assertAdmin(ctx.user);
  const data = parseInput(createStaffSchema, input);
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const [row] = await withActor(ctx.db, ctx.user.id, (tx) =>
    tx
      .insert(users)
      .values({ email: data.email, fullName: data.fullName, phone: data.phone ?? null, role: data.role, isActive: true, mustChangePassword: true, passwordHash })
      .returning({ id: users.id }),
  );
  return { id: row.id, temporaryPassword };
}

export async function updateStaff(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const data = parseInput(updateStaffSchema, input);
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const [existing] = await tx.select({ role: users.role, email: users.email }).from(users).where(eq(users.id, data.id)).for("update");
    if (!existing) throw notFound("Staff member");
    if (data.id === ctx.user.id && data.role !== existing.role) {
      throw new AppError("RULE", "You cannot change your own role. Ask another administrator.");
    }
    const email = data.email ?? existing.email;
    await tx.update(users).set({ email, fullName: data.fullName, phone: data.phone ?? null, role: data.role }).where(eq(users.id, data.id));
    // A new role or sign-in e-mail takes effect immediately: the user must sign in again.
    if (data.role !== existing.role || (email !== existing.email && data.id !== ctx.user.id)) await deleteUserSessions(tx, data.id);
  });
}

export async function setStaffActive(ctx: ServiceContext, input: unknown): Promise<void> {
  assertAdmin(ctx.user);
  const data = parseInput(setStaffActiveSchema, input);
  if (data.id === ctx.user.id && !data.active) {
    throw new AppError("RULE", "You cannot deactivate your own account. Ask another administrator.");
  }
  await withActor(ctx.db, ctx.user.id, async (tx) => {
    const updated = await tx.update(users).set({ isActive: data.active }).where(eq(users.id, data.id)).returning({ id: users.id });
    if (updated.length === 0) throw notFound("Staff member");
    if (!data.active) await deleteUserSessions(tx, data.id);
  });
}

/** Issue a new temporary password; the user is signed out everywhere and must change it at next sign-in. */
export async function resetStaffPassword(ctx: ServiceContext, input: unknown): Promise<{ temporaryPassword: string }> {
  assertAdmin(ctx.user);
  const { id } = parseInput(staffIdSchema, input);
  if (id === ctx.user.id) {
    throw new AppError("RULE", "Use “Change password” in your account menu to change your own password.");
  }
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  await withActor(
    ctx.db,
    ctx.user.id,
    async (tx) => {
      const updated = await tx
        .update(users)
        .set({ passwordHash, mustChangePassword: true, passwordChangedAt: new Date() })
        .where(eq(users.id, id))
        .returning({ id: users.id });
      if (updated.length === 0) throw notFound("Staff member");
      await deleteUserSessions(tx, id);
    },
    "Password reset by administrator",
  );
  return { temporaryPassword };
}
