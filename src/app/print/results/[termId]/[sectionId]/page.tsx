import Link from "next/link";
import { notFound } from "next/navigation";
import { CompactCard } from "@/components/report-card/compact-card";
import { THEME_COMPONENTS } from "@/components/report-card/themes/components";
import { parseStage } from "@/lib/domain/stages";
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
  // Two compact A5 cards side by side on a landscape A4 sheet, unless the full A4 design is asked for.
  const twoUp = query.size !== "a4";
  const stage = parseStage(query.stage);
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
  const sheets = twoUp ? pairs(set.cards) : set.cards.map((card) => [card]);

  return (
    <>
      <PrintToolbar
        title={`${set.classLabel} · ${set.termName}`}
        subtitle={`${set.cards.length === 1 ? set.cards[0].studentName : `${set.cards.length} result cards`} · Theme: ${set.theme.name}`}
        official={set.official}
        blackAndWhite={blackAndWhite}
        twoUp={twoUp}
        backHref={`/results/${termId}/${sectionId}?stage=${stage}`}
        empty={set.cards.length === 0}
      />
      {twoUp ? <style>{"@page { size: A4 landscape; margin: 0; }"}</style> : null}
      <main className="rc-pages">
        {sheets.map((cards) =>
          twoUp ? (
            <div key={cards[0].enrollmentId} className="rc-sheet-2up">
              {cards.map((card) => (
                <section key={card.enrollmentId} className="rc-slot" aria-label={`Result card for ${card.studentName}`}>
                  <CompactCard v={card.view} />
                </section>
              ))}
            </div>
          ) : (
            <section key={cards[0].enrollmentId} className="rc-page" aria-label={`Result card for ${cards[0].studentName}`}>
              <Theme v={cards[0].view} />
            </section>
          ),
        )}
      </main>
    </>
  );
}

/** Cards two at a time, for two per sheet. */
function pairs<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += 2) out.push(items.slice(i, i + 2));
  return out;
}
