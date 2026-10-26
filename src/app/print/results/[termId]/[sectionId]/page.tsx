import Link from "next/link";
import { notFound } from "next/navigation";
import { THEME_COMPONENTS } from "@/components/report-card/themes/components";
import { requireUser } from "@/server/auth/current";
import { AppError } from "@/server/errors";
import { buildReportCards } from "@/server/services/report-cards";
import { PrintToolbar } from "./print-toolbar";

export const metadata = { title: "Result cards" };

export default async function PrintResultsPage({ params, searchParams }: PageProps<"/print/results/[termId]/[sectionId]">) {
  const ctx = await requireUser();
  const { termId, sectionId } = await params;
  const query = await searchParams;
  const student = typeof query.student === "string" ? query.student : undefined;
  const blackAndWhite = query.bw === "1";
  const stage = query.stage === "term" ? "term" : "monthly";
  let set;
  try {
    set = await buildReportCards(ctx, { examTermId: termId, sectionId, stage, enrollmentId: student, blackAndWhite });
  } catch (error) {
    if (error instanceof AppError && (error.code === "NOT_FOUND" || error.code === "VALIDATION")) notFound();
    if (error instanceof AppError && error.code === "FORBIDDEN") {
      return (
        <main className="mx-auto max-w-lg space-y-3 p-8 text-sm">
          <h1 className="text-lg font-semibold">Not available</h1>
          <p>{error.message}</p>
          <Link className="text-primary underline-offset-4 hover:underline" href="/results">
            Back to class results
          </Link>
        </main>
      );
    }
    throw error;
  }
  const Theme = THEME_COMPONENTS[set.theme.number - 1];

  return (
    <>
      <PrintToolbar
        title={`${set.classLabel} · ${set.termName}`}
        subtitle={`${set.cards.length === 1 ? set.cards[0].studentName : `${set.cards.length} result cards`} · Theme: ${set.theme.name}`}
        official={set.official}
        blackAndWhite={blackAndWhite}
        backHref={`/results/${termId}/${sectionId}?stage=${stage}`}
        empty={set.cards.length === 0}
      />
      <main className="rc-pages">
        {set.cards.map((card) => (
          <section key={card.enrollmentId} className="rc-page" aria-label={`Result card for ${card.studentName}`}>
            <Theme v={card.view} />
          </section>
        ))}
      </main>
    </>
  );
}
