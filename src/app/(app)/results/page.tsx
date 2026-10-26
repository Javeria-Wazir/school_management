import { CalendarRange, ClipboardList } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState, PageHeader } from "@/components/app/page";
import { ResultStatusBadge } from "@/components/app/status-badge";
import { UrlSelect } from "@/components/app/url-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
        description={caps.isAdmin ? "Every class for this term: the monthly result (Monthly Test only) and the term result (Monthly Test + term examination). Class teachers approve their class; you give the final approval." : "Publish the monthly result as soon as the Monthly Test marks are approved, and the term result once the term examination is approved too."}
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
                <TableHead className="min-w-52">Monthly result</TableHead>
                <TableHead className="min-w-52">Term result</TableHead>
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
                  {(["monthly", "term"] as const).map((stage) => {
                    const summary = r[stage];
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
                              Open<span className="sr-only"> {stage === "monthly" ? "monthly" : "term"} result</span>
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
