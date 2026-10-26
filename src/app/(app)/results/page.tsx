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
        description={caps.isAdmin ? "Every class for this term. Class teachers approve their class; you give the final approval." : "Compile your class's result from the approved subject marks, add remarks, approve and print result cards."}
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
                <TableHead>Subjects approved</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Action</span>
                </TableHead>
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
                  <TableCell className="tabular-nums">
                    {r.sheetsTotal === 0 ? (
                      <span className="text-xs text-muted-foreground">No maximum marks set</span>
                    ) : (
                      <span className={r.sheetsApproved === r.sheetsTotal ? "text-emerald-700 dark:text-emerald-400" : undefined}>
                        {r.sheetsApproved} of {r.sheetsTotal}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ResultStatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant={caps.isAdmin && r.status === "class_approved" ? "default" : "outline"}>
                      <Link href={`/results/${selected.id}/${r.sectionId}`}>Open result</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
