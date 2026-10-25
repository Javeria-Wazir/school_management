/** Session lifetime settings from the environment, with safe bounds. */
function intFromEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  const value = raw === undefined || raw.trim() === "" ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be a whole number between ${min} and ${max}`);
  }
  return value;
}

export function getAuthConfig() {
  return {
    /** Signed out after this many minutes without activity. */
    idleMinutes: intFromEnv("SESSION_IDLE_MINUTES", 60, 5, 24 * 60),
    /** Signed out this many hours after signing in, whatever the activity. */
    maxHours: intFromEnv("SESSION_MAX_HOURS", 12, 1, 24 * 7),
  };
}

/** `__Host-` cookies must be Secure, Path=/ and have no Domain, so they cannot be set by a sub-domain. */
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-srms_session" : "srms_session";

export const LOGIN_LIMITS = {
  windowMinutes: 15,
  maxFailuresPerEmail: 5,
  maxFailuresPerIp: 30,
} as const;

/**
 * DEVELOPMENT ONLY: `DEV_AUTO_LOGIN=<staff e-mail>` skips the sign-in page (see dev-auto-login.ts).
 * No imports here, so the proxy can use it cheaply.
 */
export const DEV_AUTO_LOGIN_SESSION_ID = "dev-auto-login";

/** The configured e-mail, or `null` when the feature is off. Throws if it is set in production. */
export function devAutoLoginEmail(env: Record<string, string | undefined> = process.env): string | null {
  const email = env.DEV_AUTO_LOGIN?.trim().toLowerCase();
  if (!email) return null;
  if (env.NODE_ENV === "production") {
    throw new Error("DEV_AUTO_LOGIN must not be set in production. Remove it from the environment variables.");
  }
  return email;
}
