import { CalendarRange, ClipboardList } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState, PageHeader } from "@/components/app/page";
import { ResultStatusBadge } from "@/components/app/status-badge";
import { UrlSelect } from "@/components/app/url-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { resultLabel, stagesForTerm } from "@/lib/domain/stages";
import { requireUser } from "@/server/auth/current";
import { getCapabilities } from "@/server/services/capabilities";
import { resolveExamTerm } from "@/server/services/exam-terms";
import { listClassResults } from "@/server/services/results";

export const metadata = { title: "Class results" };

export default async function ResultsPage({ searchParams }: PageProps<"/results">) {
  const ctx = await requireUser();
  const params = await searchParams;
  const [caps, { terms, selected, yearName }] = await Promise.all([getCapabilities(ctx.db, ctx.user), resolveExamTerm(ctx.db, params.term)]);
  if (!caps.isAdmin && caps.classTeacherSectionIds.length === 0) redirect("/forbidden");
  if (!selected) {
    return (
      <>
        <PageHeader title="Class results" />
        <EmptyState icon={CalendarRange} title="No exam term yet">
          There is no active exam term in {yearName ?? "the current academic year"}.
        </EmptyState>
      </>
    );
  }
  const rows = await listClassResults(ctx, selected.id);
  return (
    <>
      <PageHeader
        title="Class results"
        description={
          caps.isAdmin
            ? `Every class for this term: ${selected.monthlyTests > 1 ? `a result for each of the ${selected.monthlyTests} Monthly Tests` : "the monthly result (Monthly Test only)"} and the term result (Monthly ${selected.monthlyTests > 1 ? "Tests" : "Test"} + term examination). Class teachers approve their class; you give the final approval.`
            : "Publish each monthly result as soon as its Monthly Test marks are approved, and the term result once the term examination is approved too."
        }
      />
      <div className="flex flex-wrap items-end gap-3">
        <UrlSelect param="term" label="Exam term" value={selected.id} options={terms.map((t) => ({ value: t.id, label: t.isCurrent ? `${t.name} (current)` : t.name }))} />
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No classes">
          No active sections in {yearName}.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Class teacher</TableHead>
                <TableHead className="text-right">Students</TableHead>
                {stagesForTerm(selected.monthlyTests).map((stage) => (
                  <TableHead key={stage} className="min-w-52">
                    {resultLabel(stage, selected.monthlyTests)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.sectionId}>
                  <TableCell className="whitespace-nowrap">
                    {r.className} <Badge variant="secondary">{r.sectionName}</Badge>
                  </TableCell>
                  <TableCell>{r.classTeacherName ?? <span className="text-muted-foreground">Not set</span>}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.students}</TableCell>
                  {r.stages.map((summary) => {
                    const stage = summary.stage;
                    return (
                      <TableCell key={stage}>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 space-y-1">
                            <ResultStatusBadge status={summary.status} />
                            <p className="text-xs tabular-nums text-muted-foreground">
                              {summary.sheetsTotal === 0 ? (
                                "No maximum marks set"
                              ) : (
                                <span className={summary.sheetsApproved === summary.sheetsTotal ? "text-emerald-700 dark:text-emerald-400" : undefined}>
                                  {summary.sheetsApproved} of {summary.sheetsTotal} mark sheets approved
                                </span>
                              )}
                            </p>
                          </div>
                          <Button asChild size="sm" variant={caps.isAdmin && summary.status === "class_approved" ? "default" : "outline"}>
                            <Link href={`/results/${selected.id}/${r.sectionId}?stage=${stage}`}>
                              Open<span className="sr-only"> {summary.label.toLowerCase()}</span>
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
