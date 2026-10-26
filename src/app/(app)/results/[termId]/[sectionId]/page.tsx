import { AlertTriangle, ArrowLeft, CheckCircle2, Printer, RotateCcw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, StatCard } from "@/components/app/page";
import { ResultStatusBadge, SheetStatusBadge } from "@/components/app/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/domain/calculations";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth/current";
import { AppError } from "@/server/errors";
import { getClassResult } from "@/server/services/results";
import { getSchoolSettings } from "@/server/services/settings";
import { RemarksButton, ResultActions } from "./result-client";

export const metadata = { title: "Class result" };

const dateTime = (d: Date) => d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function ClassResultPage({ params }: PageProps<"/results/[termId]/[sectionId]">) {
  const ctx = await requireUser();
  const { termId, sectionId } = await params;
  const resultKey = { examTermId: termId, sectionId };
  let result;
  try {
    result = await getClassResult(ctx, resultKey);
  } catch (error) {
    if (error instanceof AppError && (error.code === "NOT_FOUND" || error.code === "VALIDATION")) notFound();
    if (error instanceof AppError && error.code === "FORBIDDEN") {
      return <PageHeader title="Not available" description={error.message} />;
    }
    throw error;
  }
  const settings = await getSchoolSettings(ctx.db);
  const places = settings.decimalPlaces;
  const { approval, readiness, access } = result;
  const counts = { pass: 0, fail: 0, incomplete: 0 };
  for (const s of result.students) {
    if (s.outcome.status === "Pass") counts.pass += 1;
    else if (s.outcome.status === "Fail") counts.fail += 1;
    else counts.incomplete += 1;
  }
  const printBase = `/print/results/${termId}/${sectionId}`;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={`/results?term=${termId}`}>
          <ArrowLeft aria-hidden /> All classes
        </Link>
      </Button>
      <PageHeader
        title={`${result.section.className} ${result.section.name} · ${result.term.name}`}
        description={`${result.term.yearName} · Class teacher: ${result.section.classTeacherName ?? "not set"} · Grading: ${result.rules.name}`}
        actions={
          <Button asChild>
            <a href={printBase} target="_blank" rel="noopener">
              <Printer aria-hidden /> Print all result cards
            </a>
          </Button>
        }
      />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex flex-wrap items-center gap-2">
              Result status <ResultStatusBadge status={approval.status} />
            </CardTitle>
            <CardDescription>
              {approval.status === "final_approved" && approval.finalApprovedAt
                ? `Final approval by ${approval.finalApprovedByName ?? "—"} on ${dateTime(approval.finalApprovedAt)}. Result cards print as official.`
                : approval.status === "class_approved" && approval.classApprovedAt
                  ? `Approved by ${approval.classApprovedByName ?? "—"} on ${dateTime(approval.classApprovedAt)}. Waiting for the principal's final approval; cards print as PROVISIONAL.`
                  : "Open. Result cards print as PROVISIONAL until the result is approved."}
            </CardDescription>
          </div>
          <ResultActions
            resultKey={resultKey}
            canClassApprove={access.canClassApprove}
            canFinalApprove={access.canFinalApprove}
            canReopen={access.canReopen}
            requirePrincipalApproval={result.requirePrincipalApproval}
            isAdmin={access.isAdmin}
          />
        </CardHeader>
        <CardContent className="space-y-3">
          {approval.status === "open" && approval.reopenReason && approval.reopenedAt ? (
            <Alert>
              <RotateCcw aria-hidden />
              <AlertTitle>Reopened on {dateTime(approval.reopenedAt)}</AlertTitle>
              <AlertDescription>{approval.reopenReason}</AlertDescription>
            </Alert>
          ) : null}
          {approval.status === "open" ? (
            readiness.blockers.length ? (
              <Alert>
                <AlertTriangle aria-hidden />
                <AlertTitle>Not ready to approve</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {readiness.blockers.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <CheckCircle2 aria-hidden />
                <AlertTitle>Ready to approve</AlertTitle>
                <AlertDescription>Every subject is approved and every student has all marks.</AlertDescription>
              </Alert>
            )
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Subjects approved" value={`${readiness.sheetsApproved} / ${readiness.sheetsTotal}`} />
        <StatCard label="Students with all marks" value={`${readiness.studentsComplete} / ${readiness.studentsTotal}`} />
        <StatCard label="Passed" value={counts.pass} hint={readiness.studentsComplete ? undefined : "Shown once marks are complete"} />
        <StatCard label="Failed" value={counts.fail} hint={counts.incomplete ? `${counts.incomplete} incomplete` : undefined} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subjects</CardTitle>
          <CardDescription>Only submitted marks are compiled. Open a subject to approve it or return it to its teacher.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {result.subjects.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/marks/${termId}/${sectionId}/${s.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
                >
                  <span>
                    <span className="font-medium">{s.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {s.teacherName ?? "No teacher"} · {s.components.map((c) => formatNumber(c.max, places)).join(" + ")}
                      {s.includeInTotal ? "" : " · not in total"}
                    </span>
                  </span>
                  <SheetStatusBadge status={s.sheetStatus} />
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Result sheet</CardTitle>
          <CardDescription>
            Marks obtained per subject. &quot;—&quot; means not entered or not submitted yet; a student with any missing mark has no total, grade or position.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Roll</TableHead>
                  <TableHead>Student</TableHead>
                  {result.subjects.map((s) => (
                    <TableHead key={s.id} className="text-center" title={s.name}>
                      {s.code}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Pos.</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Print</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.students.map((st) => {
                  const o = st.outcome;
                  return (
                    <TableRow key={st.enrollmentId}>
                      <TableCell className="tabular-nums">{st.rollNumber}</TableCell>
                      <TableCell className="min-w-40">
                        <span className="font-medium">{st.fullName}</span>
                        <span className="block text-xs text-muted-foreground">{st.studentCode}</span>
                      </TableCell>
                      {o.subjects.map((so) => (
                        <TableCell key={so.subject.id} className={cn("text-center tabular-nums", so.passed === false && "font-semibold text-red-700 dark:text-red-400")}>
                          {so.total.complete ? (
                            <>
                              {formatNumber(so.total.obtained, places)}
                              {so.passed === false ? <span className="sr-only"> (failed)</span> : null}
                            </>
                          ) : (
                            <span className="text-muted-foreground" title={`${so.total.missing} mark${so.total.missing === 1 ? "" : "s"} missing`}>
                              —
                            </span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-right tabular-nums">
                        {o.grandObtained ? `${formatNumber(o.grandObtained, places)} / ${formatNumber(o.grandMaximum, places)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{o.percentage ? o.percentage.toFixed(places) : "—"}</TableCell>
                      <TableCell className="text-center font-medium">{o.grade?.grade ?? "—"}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            o.status === "Pass" && "text-emerald-700 dark:text-emerald-400",
                            o.status === "Fail" && "text-red-700 dark:text-red-400",
                            o.status === "Incomplete" && "text-amber-700 dark:text-amber-400",
                          )}
                        >
                          {o.status === "Incomplete" ? `Incomplete (${o.missing} missing)` : o.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{st.position ?? "—"}</TableCell>
                      <TableCell>
                        <RemarksButton resultKey={resultKey} enrollmentId={st.enrollmentId} studentName={st.fullName} remarks={st.remarks} editable={access.canEditRemarks} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="icon" className="size-8">
                          <a href={`${printBase}?student=${st.enrollmentId}`} target="_blank" rel="noopener" title={`Print result card for ${st.fullName}`}>
                            <Printer aria-hidden />
                            <span className="sr-only">Print result card for {st.fullName}</span>
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
