"use client";

import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { StatCard } from "@/components/app/page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ImportReport, ReportRow, RowOutcome } from "@/server/services/student-import";
import { importAction, previewImportAction } from "../actions";

const OUTCOME: Record<RowOutcome, { label: string; className: string }> = {
  new: { label: "New student", className: "border-emerald-500/50 text-emerald-700 dark:text-emerald-400" },
  enrol: { label: "Enrol existing", className: "border-sky-500/50 text-sky-700 dark:text-sky-400" },
  unchanged: { label: "No change", className: "text-muted-foreground" },
  error: { label: "Error", className: "border-destructive/50 text-destructive" },
};

/** Spreadsheet apps run cells starting with = + - @ as formulas; prefix them so the report is inert. */
function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadReport(report: ImportReport) {
  const lines = [["Line", "Student ID", "Full Name", "Class", "Section", "Roll No", "Result", "Details"].join(",")];
  for (const r of report.rows) {
    lines.push([r.line, r.studentCode, r.fullName, r.className, r.sectionName, r.rollNumber, OUTCOME[r.outcome].label, r.messages.join("; ")].map(csvCell).join(","));
  }
  const blob = new Blob([`﻿${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: `import-report-${report.fileName.replace(/\.[^.]+$/, "")}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportWizard({ academicYearId, academicYearName }: { academicYearId: string; academicYearName: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [imported, setImported] = useState<ImportReport | null>(null);
  const [problemsOnly, setProblemsOnly] = useState(false);
  // The count is fixed when the dialog opens, so its title does not change while it closes.
  const [confirmCount, setConfirmCount] = useState<number | null>(null);
  const [checking, startChecking] = useTransition();

  const formData = (f: File) => {
    const fd = new FormData();
    fd.set("academicYearId", academicYearId);
    fd.set("file", f);
    return fd;
  };

  const check = () => {
    if (!file) return toast.error("Choose a file first.");
    setImported(null);
    startChecking(async () => {
      const result = await previewImportAction(formData(file));
      if (!result.ok) {
        setReport(null);
        toast.error(result.message);
        return;
      }
      setReport(result.data ?? null);
      setProblemsOnly(Boolean(result.data && result.data.counts.error > 0));
    });
  };

  const visible = useMemo<ReportRow[]>(() => (report ? (problemsOnly ? report.rows.filter((r) => r.outcome === "error") : report.rows) : []), [report, problemsOnly]);
  const toWrite = report ? report.counts.new + report.counts.enrol : 0;
  const canImport = report !== null && report.fileErrors.length === 0 && report.counts.error === 0 && toWrite > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Prepare the file</CardTitle>
          <CardDescription>
            Use the template: it lists the exact class and section names for {academicYearName}. Required columns: Student ID, Full Name, Class, Section, Roll No.
            Optional: Guardian Name, Guardian Phone, Date of Birth.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <a href={`/api/students/template?year=${academicYearId}`} download>
              <FileSpreadsheet aria-hidden /> Download Excel template
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Check the file</CardTitle>
          <CardDescription>Excel (.xlsx) or CSV, up to 2 MB and 2,000 students. Checking saves nothing.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="import-file">File</Label>
            <Input
              id="import-file"
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setReport(null);
                setImported(null);
              }}
            />
          </div>
          <Button onClick={check} disabled={!file || checking}>
            {checking ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
            {checking ? "Checking…" : "Check file"}
          </Button>
        </CardContent>
      </Card>

      {imported ? (
        <Alert>
          <CheckCircle2 aria-hidden />
          <AlertTitle>Import complete</AlertTitle>
          <AlertDescription>
            <p>
              {imported.counts.new} new student{imported.counts.new === 1 ? "" : "s"} added and {imported.counts.enrol} existing student
              {imported.counts.enrol === 1 ? "" : "s"} enrolled in {academicYearName}. {imported.counts.unchanged} row{imported.counts.unchanged === 1 ? " was" : "s were"} already up to date.
            </p>
            <Link className="font-medium text-primary underline-offset-4 hover:underline" href={`/admin/students?year=${academicYearId}`}>
              View students
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      {report && !imported ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>3. Validation report — {report.fileName}</CardTitle>
              <CardDescription>
                {report.counts.error > 0
                  ? "Fix the rows marked Error in your file, save it and check it again. Nothing is imported while any row has an error."
                  : "Everything is valid. Review the rows, then import."}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {report.rows.length ? (
                <Button variant="outline" onClick={() => downloadReport(report)}>
                  <Download aria-hidden /> Download report (CSV)
                </Button>
              ) : null}
              <Button onClick={() => setConfirmCount(toWrite)} disabled={!canImport}>
                Import {toWrite} student{toWrite === 1 ? "" : "s"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.fileErrors.length ? (
              <Alert variant="destructive">
                <AlertTriangle aria-hidden />
                <AlertTitle>The file cannot be imported</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {report.fileErrors.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard label="New students" value={report.counts.new} />
                  <StatCard label="Existing, to enrol" value={report.counts.enrol} />
                  <StatCard label="Already up to date" value={report.counts.unchanged} />
                  <StatCard label="Rows with errors" value={report.counts.error} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="problems-only" checked={problemsOnly} onCheckedChange={setProblemsOnly} />
                  <Label htmlFor="problems-only">Show only rows with errors</Label>
                </div>
                <div className="max-h-[32rem] overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Line</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Roll</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                            No rows to show.
                          </TableCell>
                        </TableRow>
                      ) : (
                        visible.map((r) => (
                          <TableRow key={r.line}>
                            <TableCell className="tabular-nums">{r.line}</TableCell>
                            <TableCell>
                              <div className="font-medium">{r.fullName || "—"}</div>
                              <div className="text-xs text-muted-foreground">{r.studentCode || "—"}</div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {r.className} {r.sectionName}
                            </TableCell>
                            <TableCell className="tabular-nums">{r.rollNumber}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={OUTCOME[r.outcome].className}>
                                {OUTCOME[r.outcome].label}
                              </Badge>
                            </TableCell>
                            <TableCell className="min-w-64 text-sm whitespace-normal">
                              {r.messages.length ? (
                                <ul className={r.outcome === "error" ? "list-disc pl-4 text-destructive" : "text-muted-foreground"}>
                                  {r.messages.map((m) => (
                                    <li key={m}>{m}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={confirmCount !== null}
        onOpenChange={(open) => !open && setConfirmCount(null)}
        title={`Import ${confirmCount ?? 0} student${confirmCount === 1 ? "" : "s"} into ${academicYearName}?`}
        description={
          <p>
            The file is checked again before saving. If anything changed since the check (for example a roll number was taken), nothing is imported and you
            see why.
          </p>
        }
        confirmLabel="Import"
        onConfirm={async () => {
          if (!file) return true;
          const result = await importAction(formData(file));
          if (!result.ok) {
            toast.error(result.message);
            return true;
          }
          toast.success(result.message);
          setImported(result.data ?? null);
          setReport(null);
          return true;
        }}
      />
    </div>
  );
}
