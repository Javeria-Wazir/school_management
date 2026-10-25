import { getCurrentUser } from "@/server/auth/current";
import { getDb } from "@/server/db/client";
import { toAppError } from "@/server/errors";
import { studentImportTemplate } from "@/server/services/student-import";

/** Excel template for the student import, listing the chosen year's classes and sections. Admin only. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const year = new URL(request.url).searchParams.get("year");
  try {
    const buffer = await studentImportTemplate({ db: getDb(), user }, year);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="student-import-template.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const appError = toAppError(error);
    if (!appError) throw error;
    return new Response(appError.message, { status: appError.code === "FORBIDDEN" ? 403 : 400 });
  }
}
