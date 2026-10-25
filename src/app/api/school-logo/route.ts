import { getCurrentUser } from "@/server/auth/current";
import { getDb } from "@/server/db/client";
import { getSchoolLogo } from "@/server/services/settings";

/** The school logo for signed-in staff (used on settings and report previews). */
export async function GET() {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });
  const logo = await getSchoolLogo(getDb());
  if (!logo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(logo.data), {
    headers: {
      "Content-Type": logo.mime,
      "Cache-Control": "private, no-cache",
      "Content-Security-Policy": "default-src 'none'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
