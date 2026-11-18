import { AlertTriangle, ArrowLeft, CheckCircle2, FileSpreadsheet, LifeBuoy, MessageCircle, Printer, RotateCcw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, StatCard } from "@/components/app/page";
import { ResultStatusBadge, SheetStatusBadge } from "@/components/app/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/domain/calculations";
import { monthlyNumber, parseStage, resultLabel, stageLabel, type ResultStage } from "@/lib/domain/stages";
import { cn } from "@/lib/utils";
import { resultMessage, whatsappLink } from "@/lib/whatsapp";
import { requireUser } from "@/server/auth/current";
import { AppError } from "@/server/errors";
import { openCorrectionsForSection } from "@/server/services/marks";
import { subjectStatistics } from "@/server/services/result-stats";
import { getClassResult, subjectCell, type ResultStudent } from "@/server/services/results";
import { getSchoolSettings } from "@/server/services/settings";
import { RemarksButton, ResultActions } from "./result-client";

export const metadata = { title: "Class result" };

const dateTime = (d: Date) => d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Title, short sheet name and hint of each result of a term with `n` monthly tests. */
function stageText(stage: ResultStage, n: number) {
  if (stage === "term") return { title: "Term result", short: "Term exam", hint: n > 1 ? "Monthly Tests + term examination" : "Monthly Test + term examination" };
  return { title: resultLabel(stage, n), short: n > 1 ? `Monthly ${monthlyNumber(stage)}` : "Monthly", hint: `${stageLabel(stage, n)} only` };
}

export default async function ClassResultPage({ params, searchParams }: PageProps<"/results/[termId]/[sectionId]">) {
  const ctx = await requireUser();
  const { termId, sectionId } = await params;
  const stage = parseStage((await searchParams).stage);
  const resultKey = { examTermId: termId, sectionId, stage } as const;
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
  const n = result.term.monthlyTests;
  const STAGE = (s: ResultStage) => stageText(s, n);
  const settings = await getSchoolSettings(ctx.db);
  const places = settings.decimalPlaces;
  const stats = subjectStatistics(result);
  // Open correction requests on this class's sheets, with the subject and test they belong to.
  const corrections = (await openCorrectionsForSection(ctx.db, termId, sectionId)).flatMap((c) => {
    const subject = result.subjects.find((s) => s.sheets.some((sh) => sh.sheetId === c.sheetId));
    const sheet = subject?.sheets.find((sh) => sh.sheetId === c.sheetId);
    return subject && sheet ? [{ ...c, subject, stage: sheet.stage }] : [];
  });
  const { approval, readiness, access } = result;
  const counts = { pass: 0, fail: 0, incomplete: 0, absent: 0, newAdmission: 0 };
  for (const s of result.students) {
    if (s.newAdmissionAll) counts.newAdmission += 1;
    else if (s.absentAll) counts.absent += 1;
    else if (s.outcome.status === "Pass") counts.pass += 1;
    else if (s.outcome.status === "Fail") counts.fail += 1;
    else counts.incomplete += 1;
  }
  const printBase = `/print/results/${termId}/${sectionId}?stage=${stage}`;
  /** WhatsApp link with the student's result for their guardian; only for an official (final-approved) result. */
  const whatsappFor = (st: ResultStudent): string | null => {
    if (approval.status !== "final_approved") return null;
    const o = st.outcome;
    const noResult = st.newAdmissionAll || st.absentAll;
    return whatsappLink(
      st.guardianPhone,
      resultMessage({
        schoolName: settings.schoolName,
        className: `${result.section.className} ${result.section.name}`,
        termName: result.term.name,
        stageLabel: STAGE(stage).title,
        studentName: st.fullName,
        rollNumber: st.rollNumber,
        total: noResult || !o.grandObtained ? null : `${formatNumber(o.grandObtained, places)} / ${formatNumber(o.grandMaximum, places)}`,
        percentage: noResult || !o.percentage ? null : o.percentage.toFixed(places),
        grade: noResult ? null : (o.grade?.grade ?? null),
        status: st.newAdmissionAll ? "New admission" : st.absentAll ? "Absent" : o.status,
        position: settings.showClassPosition && st.position ? `${st.position} of ${result.students.length}` : null,
      }),
    );
  };

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={`/results?term=${termId}`}>
          <ArrowLeft aria-hidden /> All classes
        </Link>
      </Button>
      <PageHeader
        title={`${result.section.className} ${result.section.name} · ${result.term.name} · ${STAGE(stage).title}`}
        description={`${result.term.yearName} · Class teacher: ${result.section.classTeacherName ?? "not set"} · Grading: ${result.rules.name}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href={`/api/results/export?term=${termId}&section=${sectionId}&stage=${stage}`} download>
                <FileSpreadsheet aria-hidden /> Download Excel
              </a>
            </Button>
            <Button asChild>
              <a href={printBase} target="_blank" rel="noopener">
                <Printer aria-hidden /> Print all {stage === "term" ? "term" : STAGE(stage).short.toLowerCase()} result cards
              </a>
            </Button>
          </div>
        }
      />
      <nav aria-label="Result" className="flex flex-wrap gap-2">
        {result.stageStatuses.map(({ stage: s, status }) => (
          <Link
            key={s}
            href={`/results/${termId}/${sectionId}?stage=${s}`}
            aria-current={s === stage ? "page" : undefined}
            className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50", s === stage && "border-primary bg-primary/5 font-medium")}
          >
            <span>
              {STAGE(s).title}
              <span className="block text-xs font-normal text-muted-foreground">{STAGE(s).hint}</span>
            </span>
            <ResultStatusBadge status={s === stage ? approval.status : status} />
          </Link>
        ))}
      </nav>

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
          {corrections.length ? (
            <Alert>
              <LifeBuoy aria-hidden />
              <AlertTitle>
                {corrections.length} correction request{corrections.length === 1 ? "" : "s"} waiting
              </AlertTitle>
              <AlertDescription>
                <ul className="space-y-1">
                  {corrections.map((c) => (
                    <li key={c.id}>
                      <Link className="font-medium underline underline-offset-2" href={`/marks/${termId}/${sectionId}/${c.subject.id}?stage=${c.stage}`}>
                        {c.subject.name} · {STAGE(c.stage).short}
                      </Link>{" "}
                      — {c.requestedByName}: {c.reason}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}
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
        <StatCard label="Mark sheets approved" value={`${readiness.sheetsApproved} / ${readiness.sheetsTotal}`} />
        <StatCard label="Students with all marks" value={`${readiness.studentsComplete} / ${readiness.studentsTotal}`} />
        <StatCard label="Passed" value={counts.pass} hint={readiness.studentsComplete ? undefined : "Shown once marks are complete"} />
        <StatCard
          label="Failed"
          value={counts.fail}
          hint={
            [
              counts.incomplete ? `${counts.incomplete} incomplete` : "",
              counts.absent ? `${counts.absent} absent` : "",
              counts.newAdmission ? `${counts.newAdmission} new admission${counts.newAdmission === 1 ? "" : "s"}` : "",
            ]
              .filter(Boolean)
              .join(" · ") || undefined
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subjects</CardTitle>
          <CardDescription>
            {stage !== "term"
              ? `Only the ${stageLabel(stage, n)} is compiled, from submitted sheets.`
              : `The Monthly ${n > 1 ? "Tests" : "Test"} and the term examination are compiled together, from submitted sheets.`}{" "}
            Open a sheet to approve it or return it to its teacher.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {result.subjects.map((s) => (
              <li key={s.id} className="space-y-2 rounded-lg border p-3 text-sm">
                <p>
                  <span className="font-medium">{s.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {s.teacherName ?? "No teacher"} · {s.components.map((c) => formatNumber(c.max, places)).join(" + ")}
                    {s.includeInTotal ? "" : " · not in total"}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {s.sheets.map((sheet) => (
                    <Link
                      key={sheet.stage}
                      href={`/marks/${termId}/${sectionId}/${s.id}?stage=${sheet.stage}`}
                      className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors hover:bg-muted/50"
                    >
                      {STAGE(sheet.stage).short} <SheetStatusBadge status={sheet.status} />
                    </Link>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Result sheet</CardTitle>
          <CardDescription>
            Marks obtained per subject. &quot;—&quot; means not entered or not submitted yet; a student with any missing mark has no total, grade or position. &quot;A&quot; means absent and counts as 0. &quot;N&quot; means a new admission who joined after that test; it is left out of their total. &quot;X&quot; means the student does not take that subject; it is left out of their total and card.
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
                      {result.subjects.map((subject) => {
                        const cell = subjectCell(result, st, subject.id);
                        const so = cell.kind === "absent" || cell.kind === "marks" ? cell.outcome : null;
                        return (
                          <TableCell key={subject.id} className={cn("text-center tabular-nums", so?.passed === false && "font-semibold text-red-700 dark:text-red-400")}>
                            {cell.kind === "notTaken" ? (
                              <span className="text-muted-foreground" title="Does not take this subject">
                                X
                              </span>
                            ) : cell.kind === "newAdmission" ? (
                              <span className="text-muted-foreground" title="New admission (joined after this test)">
                                N
                              </span>
                            ) : cell.kind === "absent" ? (
                              <span title="Absent (counts as 0)">A</span>
                            ) : cell.outcome.total.complete ? (
                              <>
                                {formatNumber(cell.outcome.total.obtained, places)}
                                {cell.outcome.passed === false ? <span className="sr-only"> (failed)</span> : null}
                              </>
                            ) : (
                              <span className="text-muted-foreground" title={`${cell.outcome.total.missing} mark${cell.outcome.total.missing === 1 ? "" : "s"} missing`}>
                                —
                              </span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right tabular-nums">
                        {o.grandObtained && !st.absentAll ? `${formatNumber(o.grandObtained, places)} / ${formatNumber(o.grandMaximum, places)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{o.percentage && !st.absentAll ? o.percentage.toFixed(places) : "—"}</TableCell>
                      <TableCell className="text-center font-medium">{st.absentAll ? "—" : (o.grade?.grade ?? "—")}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            !st.absentAll && o.status === "Pass" && "text-emerald-700 dark:text-emerald-400",
                            !st.absentAll && o.status === "Fail" && "text-red-700 dark:text-red-400",
                            o.status === "Incomplete" && "text-amber-700 dark:text-amber-400",
                          )}
                        >
                          {st.newAdmissionAll ? "New admission" : st.absentAll ? "Absent" : o.status === "Incomplete" ? `Incomplete (${o.missing} missing)` : o.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{st.position ?? "—"}</TableCell>
                      <TableCell>
                        <RemarksButton resultKey={resultKey} enrollmentId={st.enrollmentId} studentName={st.fullName} remarks={st.remarks} editable={access.canEditRemarks} />
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {whatsappFor(st) ? (
                          <Button asChild variant="ghost" size="icon" className="size-8">
                            <a href={whatsappFor(st)!} target="_blank" rel="noopener noreferrer" title={`Send the result to ${st.fullName}'s guardian on WhatsApp`}>
                              <MessageCircle aria-hidden />
                              <span className="sr-only">Send the result to {st.fullName}&apos;s guardian on WhatsApp</span>
                            </a>
                          </Button>
                        ) : null}
                        <Button asChild variant="ghost" size="icon" className="size-8">
                          <a href={`${printBase}&student=${st.enrollmentId}`} target="_blank" rel="noopener" title={`Print result card for ${st.fullName}`}>
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

      {stats.some((s) => s.counted > 0) ? (
        <Card>
          <CardHeader>
            <CardTitle>Subject analysis</CardTitle>
            <CardDescription>
              How the class did in each subject, from the marks above. Students absent for the whole result, new admissions and subjects a student does not take are left out.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-right">Students</TableHead>
                    <TableHead className="min-w-48">Average %</TableHead>
                    <TableHead className="text-right">Highest %</TableHead>
                    <TableHead className="text-right">Lowest %</TableHead>
                    <TableHead className="min-w-48">Passed</TableHead>
                    <TableHead>Top scorer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((s) => (
                    <TableRow key={s.subjectId}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.counted || "—"}</TableCell>
                      <TableCell>
                        {s.average ? (
                          <div className="flex items-center gap-2">
                            <span className="w-14 text-right tabular-nums">{s.average.toFixed(places)}</span>
                            <span className="h-2 flex-1 rounded-full bg-muted" aria-hidden>
                              <span className="block h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, s.average.toNumber())}%` }} />
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{s.highest ? s.highest.toFixed(places) : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.lowest ? s.lowest.toFixed(places) : "—"}</TableCell>
                      <TableCell>
                        {s.passRate ? (
                          <div className="flex items-center gap-2">
                            <span className="w-20 text-right text-xs tabular-nums">
                              {s.passed} / {s.counted}
                            </span>
                            <span className="h-2 flex-1 rounded-full bg-muted" aria-hidden>
                              <span className={cn("block h-2 rounded-full", s.passRate.lt(50) ? "bg-red-600" : "bg-emerald-600")} style={{ width: `${s.passRate.toNumber()}%` }} />
                            </span>
                            <span className="w-14 text-right text-xs tabular-nums">{s.passRate.toFixed(0)}%</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{s.topStudents.join(", ") || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
