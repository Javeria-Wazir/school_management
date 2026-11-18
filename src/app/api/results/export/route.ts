import { parseStage } from "@/lib/domain/stages";
import { getCurrentUser } from "@/server/auth/current";
import { getDb } from "@/server/db/client";
import { toAppError } from "@/server/errors";
import { exportClassResult } from "@/server/services/result-export";

/** Excel download of a class result (?term=…&section=…&stage=monthly|monthly_2|monthly_3|term). Class teacher of the section or principal. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const params = new URL(request.url).searchParams;
  try {
    const { buffer, filename } = await exportClassResult(
      { db: getDb(), user },
      { examTermId: params.get("term"), sectionId: params.get("section"), stage: parseStage(params.get("stage")) },
    );
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const appError = toAppError(error);
    if (!appError) throw error;
    return new Response(appError.message, { status: appError.code === "FORBIDDEN" ? 403 : appError.code === "NOT_FOUND" ? 404 : 400 });
  }
}
