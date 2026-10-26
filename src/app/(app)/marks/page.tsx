import { BookOpen, CalendarRange, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageHeader, StatCard } from "@/components/app/page";
import { SheetStatusBadge } from "@/components/app/status-badge";
import { UrlSelect } from "@/components/app/url-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/server/auth/current";
import { getCapabilities } from "@/server/services/capabilities";
import { resolveExamTerm } from "@/server/services/exam-terms";
import { listMarkSheets, type MarkSheetRow, type SheetStatus, type StageCell } from "@/server/services/marks";

export const metadata = { title: "Marks entry" };

export default async function MarksPage({ searchParams }: PageProps<"/marks">) {
  const ctx = await requireUser();
  const params = await searchParams;
  const [caps, { terms, selected, yearName }] = await Promise.all([getCapabilities(ctx.db, ctx.user), resolveExamTerm(ctx.db, params.term)]);
  if (!selected) {
    return (
      <>
        <PageHeader title="Marks entry" />
        <EmptyState icon={CalendarRange} title="No exam term yet">
          {caps.isAdmin ? (
            <>
              Create an exam term for {yearName ?? "the current academic year"} in{" "}
              <Link className="text-primary underline-offset-4 hover:underline" href="/admin/exam-terms">
                Exam terms &amp; marks
              </Link>
              .
            </>
          ) : (
            "The principal has not opened an exam term for the current academic year yet."
          )}
        </EmptyState>
      </>
    );
  }

  const termSelect = (
    <UrlSelect param="term" label="Exam term" value={selected.id} options={terms.map((t) => ({ value: t.id, label: t.isCurrent ? `${t.name} (current)` : t.name }))} resets={["class"]} />
  );

  if (caps.isAdmin) {
    const all = await listMarkSheets(ctx, { examTermId: selected.id, scope: "all" });
    const classOptions = [...new Map(all.map((r) => [r.classId, { value: r.classId, label: r.className }])).values()];
    const classId = typeof params.class === "string" && classOptions.some((c) => c.value === params.class) ? params.class : undefined;
    const shown = all.filter((r) => !classId || r.classId === classId);
    // Every applicable sheet: each subject has a Monthly Test sheet and a term sheet.
    const cells = all.flatMap((r) => [r.monthly, r.term]).filter((c) => c.components > 0);
    const count = (status: SheetStatus[]) => cells.filter((c) => status.includes(c.status)).length;
    return (
      <>
        <PageHeader title="Marks entry" description="Every subject of every class for this term. Teachers enter their own marks; you can open any sheet and enter marks on a teacher's behalf." />
        <div className="flex flex-wrap items-end gap-3">
          {termSelect}
          {classOptions.length ? <UrlSelect param="class" label="Class" value={classId} options={classOptions} allLabel="All classes" /> : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="Mark sheets" value={cells.length} hint={`Monthly Test and term, ${selected.name}`} />
          <StatCard label="Not started or draft" value={count(["not_started", "draft"])} />
          <StatCard label="Waiting for review" value={count(["submitted", "under_review"])} hint="Class teachers approve these" />
          <StatCard label="Approved" value={count(["approved"])} hint={count(["returned"]) ? `${count(["returned"])} returned for correction` : undefined} />
        </div>
        <SheetTable rows={shown} showTeacher actionLabel="Open" />
      </>
    );
  }

  const [mine, review] = await Promise.all([
    listMarkSheets(ctx, { examTermId: selected.id, scope: "mine" }),
    caps.classTeacherSectionIds.length ? listMarkSheets(ctx, { examTermId: selected.id, scope: "class" }) : Promise.resolve([]),
  ]);
  const waiting = review.flatMap((r) => [r.monthly, r.term]).filter((c) => c.status === "submitted" || c.status === "under_review").length;
  return (
    <>
      <PageHeader
        title="Marks entry"
        description="Enter the Monthly Test first and submit it — the monthly result can be published straight away. Enter the term examination when it is held; the term result then combines both."
      />
      <div className="flex flex-wrap items-end gap-3">{termSelect}</div>
      <Card>
        <CardHeader>
          <CardTitle>My subjects</CardTitle>
          <CardDescription>Leave a box blank if the student has not taken the test yet — blank is &quot;missing&quot;, 0 is a real mark.</CardDescription>
        </CardHeader>
        <CardContent>
          {mine.length === 0 ? (
            <EmptyState icon={BookOpen} title="No subjects assigned to you">
              The principal assigns subjects to teachers. Once you have one it appears here.
            </EmptyState>
          ) : (
            <SheetTable rows={mine} actionLabel="Enter marks" />
          )}
        </CardContent>
      </Card>
      {review.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-5" aria-hidden /> My class&apos;s subjects
              {waiting ? <Badge>{waiting} to review</Badge> : null}
            </CardTitle>
            <CardDescription>As class teacher you approve each subject&apos;s marks, or return them to the teacher with a reason.</CardDescription>
          </CardHeader>
          <CardContent>
            <SheetTable rows={review} showTeacher actionLabel="Review" />
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

function SheetTable({ rows, showTeacher, actionLabel }: { rows: MarkSheetRow[]; showTeacher?: boolean; actionLabel: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Class</TableHead>
            <TableHead>Subject</TableHead>
            {showTeacher ? <TableHead>Subject teacher</TableHead> : null}
            <TableHead className="min-w-52">Monthly Test</TableHead>
            <TableHead className="min-w-52">Term examination</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={`${r.sectionId}-${r.classSubjectId}`}>
              <TableCell className="whitespace-nowrap">
                {r.className} <Badge variant="secondary">{r.sectionName}</Badge>
              </TableCell>
              <TableCell>
                {r.subjectName} <span className="text-xs text-muted-foreground">{r.subjectCode}</span>
              </TableCell>
              {showTeacher ? <TableCell>{r.teacherName ?? <span className="text-muted-foreground">Not assigned</span>}</TableCell> : null}
              <TableCell>
                <StageCellView row={r} stage="monthly" cell={r.monthly} actionLabel={actionLabel} />
              </TableCell>
              <TableCell>
                <StageCellView row={r} stage="term" cell={r.term} actionLabel={actionLabel} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StageCellView({ row, stage, cell, actionLabel }: { row: MarkSheetRow; stage: "monthly" | "term"; cell: StageCell; actionLabel: string }) {
  if (cell.components === 0) return <span className="text-xs text-muted-foreground">No maximum marks set</span>;
  const expected = row.students * cell.components;
  const label = stage === "monthly" ? "Monthly Test" : "term examination";
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-24 flex-1 space-y-1">
        <SheetStatusBadge status={cell.status} />
        <Progress value={expected ? (cell.entered / expected) * 100 : 0} aria-label={`${label}: ${cell.entered} of ${expected} marks entered`} />
        <p className="text-xs tabular-nums text-muted-foreground">
          {cell.entered} of {expected}
        </p>
      </div>
      <Button asChild size="sm" variant={cell.status === "submitted" && actionLabel === "Review" ? "default" : "outline"}>
        <Link href={`/marks/${row.examTermId}/${row.sectionId}/${row.classSubjectId}?stage=${stage}`}>
          {actionLabel}
          <span className="sr-only">
            {" "}
            {row.subjectName} {label}
          </span>
        </Link>
      </Button>
    </div>
  );
}
