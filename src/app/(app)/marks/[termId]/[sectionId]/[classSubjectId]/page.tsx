import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page";
import { SheetStatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth/current";
import { AppError } from "@/server/errors";
import { getMarkSheet } from "@/server/services/marks";
import { MarksGrid } from "./marks-grid";

export const metadata = { title: "Enter marks" };

const STAGE_LABEL = { monthly: "Monthly Test", term: "Term examination" } as const;

export default async function MarkSheetPage({ params, searchParams }: PageProps<"/marks/[termId]/[sectionId]/[classSubjectId]">) {
  const ctx = await requireUser();
  const { termId, sectionId, classSubjectId } = await params;
  const stage = (await searchParams).stage === "term" ? "term" : "monthly";
  let sheet;
  try {
    sheet = await getMarkSheet(ctx, { examTermId: termId, sectionId, classSubjectId, stage });
  } catch (error) {
    if (error instanceof AppError && (error.code === "NOT_FOUND" || error.code === "VALIDATION")) notFound();
    if (error instanceof AppError && error.code === "FORBIDDEN") {
      return (
        <>
          <PageHeader title="Not available" description={error.message} />
          <Button asChild variant="outline" className="w-fit">
            <Link href="/marks">Back to marks entry</Link>
          </Button>
        </>
      );
    }
    throw error;
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={`/marks?term=${termId}`}>
          <ArrowLeft aria-hidden /> All mark sheets
        </Link>
      </Button>
      <PageHeader
        title={`${sheet.subjectName} · ${sheet.className} ${sheet.sectionName} · ${STAGE_LABEL[stage]}`}
        description={
          <>
            {sheet.termName}, {sheet.yearName} · Subject teacher: {sheet.teacherName ?? "not assigned"}
            {sheet.deadline ? ` · Deadline ${new Date(`${sheet.deadline}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
          </>
        }
        actions={<SheetStatusBadge status={sheet.status} className="text-sm" />}
      />
      <nav aria-label="Marks stage" className="flex flex-wrap gap-2">
        {sheet.stages
          .filter((s) => s.components > 0)
          .map((s) => (
            <Link
              key={s.stage}
              href={`/marks/${termId}/${sectionId}/${classSubjectId}?stage=${s.stage}`}
              aria-current={s.stage === stage ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50",
                s.stage === stage && "border-primary bg-primary/5 font-medium",
              )}
            >
              {STAGE_LABEL[s.stage]} <SheetStatusBadge status={s.status} />
            </Link>
          ))}
      </nav>
      <MarksGrid key={stage} sheet={sheet} />
    </>
  );
}
