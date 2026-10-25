import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEV_AUTO_LOGIN_SESSION_ID, devAutoLoginEmail, loadDevAutoLoginUser } from "@/server/auth/dev-auto-login";
import { verifyPassword } from "@/server/auth/password";
import { createSession, validateSessionToken } from "@/server/auth/session";
import * as schema from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { changeOwnPassword, SIGN_IN_BLOCKED, SIGN_IN_FAILED, signIn } from "@/server/services/auth";
import { addUser, createTestDb, rejectsWith, TEST_PASSWORD, type TestDb } from "./helpers";

let t: TestDb;
const meta = { ipAddress: "203.0.113.10", userAgent: "vitest" };

beforeAll(async () => {
  t = await createTestDb();
});
afterAll(() => t.close());

describe("sign in", () => {
  it("signs in with the right password (e-mail is case-insensitive) and creates a session", async () => {
    const teacher = await addUser(t.db, { email: "teacher.one@school.test" });
    const result = await signIn(t.db, { email: "  Teacher.One@School.TEST ", password: TEST_PASSWORD }, meta);
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const user = await validateSessionToken(t.db, result.token);
    expect(user?.id).toBe(teacher.user.id);
    const [row] = await t.db.select().from(schema.users).where(eq(schema.users.id, teacher.user.id));
    expect(row.lastLoginAt).not.toBeNull();
  });

  it("stores only a hash of the session token", async () => {
    await addUser(t.db, { email: "hash.check@school.test" });
    const { token } = await signIn(t.db, { email: "hash.check@school.test", password: TEST_PASSWORD }, meta);
    const rows = await t.db.select({ id: schema.sessions.id }).from(schema.sessions);
    expect(rows.some((r) => r.id === token)).toBe(false);
    expect(rows.every((r) => /^[0-9a-f]{64}$/.test(r.id))).toBe(true);
  });

  it("gives the same message for a wrong password and an unknown e-mail", async () => {
    await addUser(t.db, { email: "known@school.test" });
    await rejectsWith(signIn(t.db, { email: "known@school.test", password: "wrong-password1" }, meta), new RegExp(SIGN_IN_FAILED));
    await rejectsWith(signIn(t.db, { email: "nobody@school.test", password: "wrong-password1" }, meta), new RegExp(SIGN_IN_FAILED));
  });

  it("refuses deactivated accounts", async () => {
    await addUser(t.db, { email: "gone@school.test", isActive: false });
    await rejectsWith(signIn(t.db, { email: "gone@school.test", password: TEST_PASSWORD }, meta), /deactivated/);
  });

  it("blocks an e-mail after 5 failures, even with the right password", async () => {
    await addUser(t.db, { email: "target@school.test" });
    const ip = { ...meta, ipAddress: "198.51.100.7" };
    for (let i = 0; i < 5; i += 1) {
      await rejectsWith(signIn(t.db, { email: "target@school.test", password: `guess-${i}x1` }, ip), new RegExp(SIGN_IN_FAILED));
    }
    await rejectsWith(signIn(t.db, { email: "target@school.test", password: TEST_PASSWORD }, ip), new RegExp(SIGN_IN_BLOCKED));
    // After the window has passed it works again.
    const later = new Date(Date.now() + 16 * 60_000);
    await expect(signIn(t.db, { email: "target@school.test", password: TEST_PASSWORD }, ip, later)).resolves.toHaveProperty("token");
  });

  it("validates input before touching the database", async () => {
    await expect(signIn(t.db, { email: "", password: "" }, meta)).rejects.toBeInstanceOf(AppError);
    await expect(signIn(t.db, { email: "a@b.c", password: "x".repeat(500) }, meta)).rejects.toBeInstanceOf(AppError);
  });
});

describe("sessions", () => {
  it("expires after the idle timeout and after the absolute lifetime", async () => {
    const u = await addUser(t.db);
    const start = new Date();
    const idle = await createSession(t.db, u.user.id, {}, start);
    expect(await validateSessionToken(t.db, idle.token, new Date(start.getTime() + 30 * 60_000))).not.toBeNull();
    // 30 minutes later the session was touched; 61 minutes after that touch it has expired.
    expect(await validateSessionToken(t.db, idle.token, new Date(start.getTime() + 92 * 60_000))).toBeNull();
    // And it was deleted, so it cannot come back.
    expect(await validateSessionToken(t.db, idle.token, new Date(start.getTime() + 31 * 60_000))).toBeNull();

    const absolute = await createSession(t.db, u.user.id, {}, start);
    let now = start.getTime();
    for (let i = 0; i < 25; i += 1) {
      now += 30 * 60_000; // active every 30 minutes
      const result = await validateSessionToken(t.db, absolute.token, new Date(now));
      if (now - start.getTime() >= 12 * 3600_000) expect(result).toBeNull();
      else expect(result).not.toBeNull();
    }
  });

  it("ends immediately when the account is deactivated", async () => {
    const u = await addUser(t.db);
    expect(await validateSessionToken(t.db, u.token)).not.toBeNull();
    await t.db.update(schema.users).set({ isActive: false }).where(eq(schema.users.id, u.user.id));
    expect(await validateSessionToken(t.db, u.token)).toBeNull();
  });

  it("rejects unknown and oversized tokens", async () => {
    expect(await validateSessionToken(t.db, "not-a-token")).toBeNull();
    expect(await validateSessionToken(t.db, "x".repeat(1000))).toBeNull();
    expect(await validateSessionToken(t.db, "")).toBeNull();
  });
});

describe("change own password", () => {
  it("requires the current password and signs out other sessions", async () => {
    const u = await addUser(t.db, { mustChangePassword: true });
    const other = await createSession(t.db, u.user.id);

    await rejectsWith(
      changeOwnPassword(u, { currentPassword: "wrong", newPassword: "NewPassw0rd", confirmPassword: "NewPassw0rd" }),
      /current password is not correct/,
    );
    await rejectsWith(changeOwnPassword(u, { currentPassword: TEST_PASSWORD, newPassword: "short1", confirmPassword: "short1" }), /at least 8/);
    await rejectsWith(
      changeOwnPassword(u, { currentPassword: TEST_PASSWORD, newPassword: "NewPassw0rd", confirmPassword: "Different1" }),
      /do not match/,
    );

    await changeOwnPassword(u, { currentPassword: TEST_PASSWORD, newPassword: "NewPassw0rd", confirmPassword: "NewPassw0rd" });
    const [row] = await t.db.select().from(schema.users).where(eq(schema.users.id, u.user.id));
    expect(row.mustChangePassword).toBe(false);
    expect(await verifyPassword("NewPassw0rd", row.passwordHash)).toBe(true);
    expect(await validateSessionToken(t.db, u.token)).not.toBeNull(); // this session stays
    expect(await validateSessionToken(t.db, other.token)).toBeNull(); // others are signed out
  });
});

describe("development auto sign-in", () => {
  it("is off unless configured, and refuses to run in production", () => {
    expect(devAutoLoginEmail({ NODE_ENV: "development" })).toBeNull();
    expect(devAutoLoginEmail({ NODE_ENV: "development", DEV_AUTO_LOGIN: " Principal@Dev.Local " })).toBe("principal@dev.local");
    expect(() => devAutoLoginEmail({ NODE_ENV: "production", DEV_AUTO_LOGIN: "principal@dev.local" })).toThrow(/must not be set in production/);
  });

  it("acts as the configured active user with their real role, and never as an inactive one", async () => {
    const teacher = await addUser(t.db, { email: "auto.teacher@school.test" });
    const user = await loadDevAutoLoginUser(t.db, "auto.teacher@school.test");
    expect(user).toMatchObject({ id: teacher.user.id, role: "teacher", sessionId: DEV_AUTO_LOGIN_SESSION_ID });
    await t.db.update(schema.users).set({ isActive: false }).where(eq(schema.users.id, teacher.user.id));
    expect(await loadDevAutoLoginUser(t.db, "auto.teacher@school.test")).toBeNull();
    expect(await loadDevAutoLoginUser(t.db, "nobody@school.test")).toBeNull();
  });
});
