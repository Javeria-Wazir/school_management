"use client";

import { AlertTriangle, CheckCircle2, Loader2, Lock, Save, Send, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dec } from "@/lib/domain/calculations";
import { MARK_PATTERN } from "@/lib/validation/results";
import { cn } from "@/lib/utils";
import type { MarkSheetView } from "@/server/services/marks";
import { approveSheetAction, returnSheetAction, saveMarksAction, submitMarksAction } from "./actions";

const key = (enrollmentId: string, assessmentId: string) => `${enrollmentId}:${assessmentId}`;

/** Same checks as the server, so mistakes show while typing. Returns an error message or null. */
function checkValue(value: string, max: string, allowDecimals: boolean, places: number): string | null {
  if (value === "") return null;
  if (!MARK_PATTERN.test(value)) return "Enter a number";
  const d = new Dec(value);
  if (d.gt(new Dec(max))) return `At most ${new Dec(max).toString()}`;
  if (!allowDecimals && !d.isInteger()) return "Whole marks only";
  if (d.decimalPlaces() > places) return `At most ${places} decimals`;
  return null;
}

export function MarksGrid({ sheet }: { sheet: MarkSheetView }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(sheet.marks);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const editable = sheet.access.canEdit;

  // A fresh server copy (after save, submit or review) becomes the new starting point.
  const [baseline, setBaseline] = useState(sheet.marks);
  if (baseline !== sheet.marks) {
    setBaseline(sheet.marks);
    setValues(sheet.marks);
  }

  const changed = useMemo(() => {
    const keys = new Set([...Object.keys(values), ...Object.keys(sheet.marks)]);
    return [...keys].filter((k) => (values[k] ?? "") !== (sheet.marks[k] ?? ""));
  }, [values, sheet.marks]);
  const dirty = changed.length > 0;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const maxById = new Map(sheet.components.map((c) => [c.assessmentId, c.maxMarks]));
  const errorFor = (k: string, assessmentId: string) =>
    checkValue(values[k] ?? "", maxById.get(assessmentId)!, sheet.allowDecimals, sheet.decimalPlaces) ?? serverErrors[k] ?? null;
  const clientErrors = sheet.students.flatMap((s) => sheet.components.map((c) => key(s.enrollmentId, c.assessmentId))).filter((k) => errorFor(k, k.split(":")[1]));
  const entered = sheet.students.reduce((n, s) => n + sheet.components.filter((c) => (values[key(s.enrollmentId, c.assessmentId)] ?? "") !== "").length, 0);
  const missing = sheet.expected - entered;
  const maxTotal = sheet.components.reduce((sum, c) => sum.plus(c.maxMarks), new Dec(0));
  // A total column only helps when the sheet has more than one component.
  const showTotal = sheet.components.length > 1;

  async function save(): Promise<boolean> {
    if (clientErrors.length) {
      toast.error(`Fix the ${clientErrors.length} highlighted mark${clientErrors.length === 1 ? "" : "s"} first.`);
      return false;
    }
    if (!dirty) return true;
    const cells = changed.map((k) => {
      const [enrollmentId, assessmentId] = k.split(":");
      return { enrollmentId, assessmentId, value: (values[k] ?? "").trim() };
    });
    const result = await saveMarksAction(sheet.key, cells);
    if (!result.ok) {
      setServerErrors(Object.fromEntries(Object.entries(result.fieldErrors ?? {}).map(([k, v]) => [k, v?.[0] ?? "Not valid"])));
      toast.error(result.message);
      return false;
    }
    setServerErrors({});
    toast.success(result.message);
    router.refresh();
    return true;
  }

  function moveFocus(event: KeyboardEvent<HTMLInputElement>, row: number, col: number) {
    const target =
      event.key === "Enter" || event.key === "ArrowDown" ? [row + 1, col] : event.key === "ArrowUp" ? [row - 1, col] : null;
    if (!target) return;
    const next = document.getElementById(`mark-${target[0]}-${target[1]}`) as HTMLInputElement | null;
    if (next) {
      event.preventDefault();
      next.focus();
      next.select();
    } else if (event.key === "Enter") event.preventDefault();
  }

  if (sheet.components.length === 0) {
    return (
      <Alert>
        <AlertTriangle aria-hidden />
        <AlertTitle>No maximum marks for this subject yet</AlertTitle>
        <AlertDescription>The principal sets them in Exam terms &amp; marks (&quot;Prepare marks&quot;). Then marks can be entered here.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {sheet.status === "returned" && sheet.returnReason ? (
        <Alert variant="destructive">
          <Undo2 aria-hidden />
          <AlertTitle>Returned for correction</AlertTitle>
          <AlertDescription>{sheet.returnReason}</AlertDescription>
        </Alert>
      ) : null}
      {sheet.resultLocked ? (
        <Alert>
          <Lock aria-hidden />
          <AlertTitle>The class result is approved</AlertTitle>
          <AlertDescription>These marks are locked. The principal must reopen the class result before anything can change.</AlertDescription>
        </Alert>
      ) : !editable && (sheet.status === "submitted" || sheet.status === "under_review" || sheet.status === "approved") ? (
        <Alert>
          <Lock aria-hidden />
          <AlertTitle>{sheet.status === "approved" ? "Approved by the class teacher" : "Submitted"}</AlertTitle>
          <AlertDescription>
            {sheet.status === "approved"
              ? "These marks are part of the class result. If something is wrong, ask the class teacher to return the sheet."
              : "The class teacher will approve these marks or return them with a reason."}
          </AlertDescription>
        </Alert>
      ) : null}

      <ReviewPanel sheet={sheet} />

      <Card>
        <CardHeader>
          <CardTitle>Marks</CardTitle>
          <CardDescription>
            {editable ? "Type a mark and press Enter to move down. Leave a box blank if the student has not taken the test yet; 0 is a real mark." : "Read only."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sheet.students.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students are enrolled in this section.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Roll</TableHead>
                    <TableHead>Student</TableHead>
                    {sheet.components.map((c) => (
                      <TableHead key={c.assessmentId} className="w-32 text-center">
                        {c.name}
                        <span className="block text-xs font-normal text-muted-foreground">out of {new Dec(c.maxMarks).toString()}</span>
                      </TableHead>
                    ))}
                    {showTotal ? (
                      <TableHead className="w-28 text-center">
                        Total
                        <span className="block text-xs font-normal text-muted-foreground">out of {maxTotal.toString()}</span>
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sheet.students.map((s, row) => {
                    const cells = sheet.components.map((c) => values[key(s.enrollmentId, c.assessmentId)] ?? "");
                    const complete = cells.every((v) => v !== "" && MARK_PATTERN.test(v));
                    const total = complete ? cells.reduce((sum, v) => sum.plus(v), new Dec(0)) : null;
                    return (
                      <TableRow key={s.enrollmentId}>
                        <TableCell className="tabular-nums">{s.rollNumber}</TableCell>
                        <TableCell>
                          <span className="font-medium">{s.fullName}</span>
                          <span className="block text-xs text-muted-foreground">{s.studentCode}</span>
                        </TableCell>
                        {sheet.components.map((c, col) => {
                          const k = key(s.enrollmentId, c.assessmentId);
                          const error = errorFor(k, c.assessmentId);
                          const value = values[k] ?? "";
                          if (!editable) {
                            return (
                              <TableCell key={k} className="text-center tabular-nums">
                                {value === "" ? <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Missing</span> : value}
                              </TableCell>
                            );
                          }
                          const id = `mark-${row}-${col}`;
                          return (
                            <TableCell key={k} className="text-center align-top">
                              <Input
                                id={id}
                                value={value}
                                inputMode="decimal"
                                autoComplete="off"
                                aria-label={`${c.name} for ${s.fullName}, out of ${new Dec(c.maxMarks).toString()}`}
                                aria-invalid={error ? true : undefined}
                                aria-describedby={error ? `${id}-error` : undefined}
                                className={cn("mx-auto h-9 w-20 text-center tabular-nums", value === "" && "border-dashed")}
                                onChange={(e) => {
                                  const next = e.target.value.replace(",", ".").trim();
                                  setValues((v) => ({ ...v, [k]: next }));
                                  if (serverErrors[k])
                                    setServerErrors((errors) => {
                                      const next = { ...errors };
                                      delete next[k];
                                      return next;
                                    });
                                }}
                                onKeyDown={(e) => moveFocus(e, row, col)}
                                onFocus={(e) => e.target.select()}
                              />
                              {error ? (
                                <p id={`${id}-error`} className="mt-1 text-xs font-medium text-destructive">
                                  {error}
                                </p>
                              ) : null}
                            </TableCell>
                          );
                        })}
                        {showTotal ? (
                          <TableCell className="text-center font-medium tabular-nums">
                            {total ? total.toString() : <span className="text-xs font-normal text-muted-foreground">—</span>}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="sticky bottom-0 -mx-1 flex flex-col gap-3 rounded-lg border bg-background/95 p-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm" aria-live="polite">
              <span className="font-medium tabular-nums">
                {entered} of {sheet.expected}
              </span>{" "}
              marks entered
              {missing > 0 ? <span className="text-amber-700 dark:text-amber-400"> · {missing} missing</span> : <span className="text-emerald-700 dark:text-emerald-400"> · complete</span>}
              {dirty ? <span className="text-muted-foreground"> · unsaved changes</span> : null}
            </p>
            {editable ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={saving || !dirty} onClick={() => startSaving(async () => void (await save()))}>
                  {saving ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
                  Save draft
                </Button>
                <Button disabled={saving} onClick={() => setConfirmSubmit(true)}>
                  <Send aria-hidden /> Submit to class teacher
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        title={missing > 0 ? "Some marks are missing" : "Submit these marks?"}
        confirmLabel={missing > 0 ? "Back to marks" : "Submit"}
        description={
          missing > 0 ? (
            <p>
              {missing} mark{missing === 1 ? " is" : "s are"} still missing. Enter every mark first — 0 is a valid mark, a blank box means not entered.
            </p>
          ) : (
            <>
              <p>
                {sheet.subjectName} marks for {sheet.className} {sheet.sectionName} go to the class teacher for approval. After submitting you cannot change them unless the class
                teacher returns the sheet.
              </p>
              {dirty ? <p>Your unsaved changes are saved first.</p> : null}
            </>
          )
        }
        onConfirm={async () => {
          if (missing > 0) return true;
          if (!(await save())) return false;
          const result = await submitMarksAction(sheet.key);
          if (!result.ok) {
            toast.error(result.message);
            return false;
          }
          toast.success(result.message);
          router.refresh();
          return true;
        }}
      />
    </div>
  );
}

function ReviewPanel({ sheet }: { sheet: MarkSheetView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [returning, setReturning] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const reviewable = sheet.access.canReview && sheet.sheetId && sheet.status !== "draft" && sheet.status !== "returned" && sheet.status !== "not_started";
  if (!reviewable) return null;
  const sheetId = sheet.sheetId!;
  const awaiting = sheet.status === "submitted" || sheet.status === "under_review";

  return (
    <Card className={cn(awaiting && "border-amber-500/50")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="size-5" aria-hidden /> {awaiting ? "Review these marks" : "Approved"}
        </CardTitle>
        <CardDescription>
          {awaiting
            ? "Check the marks below. Approve them for the class result, or return them to the subject teacher with a reason."
            : "These marks count in the class result. Return them if a correction is needed."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {awaiting && !sheet.access.canApprove ? (
          <p className="w-full text-sm text-muted-foreground">You submitted these marks, so the principal or the class teacher approves them.</p>
        ) : null}
        {awaiting && sheet.access.canApprove ? (
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await approveSheetAction(sheet.key, sheetId);
                if (result.ok) {
                  toast.success(result.message);
                  router.refresh();
                } else toast.error(result.message);
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <CheckCircle2 aria-hidden />}
            Approve marks
          </Button>
        ) : null}
        <Button variant="outline" disabled={pending} onClick={() => setReturning(true)}>
          <Undo2 aria-hidden /> Return for correction
        </Button>
      </CardContent>
      <Dialog open={returning} onOpenChange={(open) => !pending && setReturning(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return to the subject teacher</DialogTitle>
            <DialogDescription>The teacher sees your reason and can correct and resubmit the marks.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="return-reason">Reason</Label>
            <Textarea
              id="return-reason"
              value={reason}
              maxLength={500}
              aria-invalid={reasonError ? true : undefined}
              aria-describedby={reasonError ? "return-reason-error" : undefined}
              placeholder="e.g. Roll 7's term mark looks too low — please check the answer sheet."
              onChange={(e) => setReason(e.target.value)}
            />
            {reasonError ? (
              <p id="return-reason-error" className="text-xs font-medium text-destructive" role="alert">
                {reasonError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setReturning(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  if (reason.trim().length < 5) {
                    setReasonError("Please give a reason (at least 5 characters)");
                    return;
                  }
                  const result = await returnSheetAction(sheet.key, sheetId, reason);
                  if (result.ok) {
                    toast.success(result.message);
                    setReturning(false);
                    setReason("");
                    setReasonError(null);
                    router.refresh();
                  } else setReasonError(result.message);
                })
              }
            >
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Undo2 aria-hidden />}
              Return marks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
