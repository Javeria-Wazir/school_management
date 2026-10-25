/** Only same-site relative paths are accepted as a post-login destination (prevents open redirects). */
export function safeNextPath(value: string | undefined | null, fallback = "/dashboard"): string {
  if (!value || value.length > 300) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return fallback;
  if (value === "/login" || value.startsWith("/login?")) return fallback;
  return value;
}
