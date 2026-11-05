"use client";

import { Loader2, Plus, RotateCcw, Trash2, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { TextDialog } from "@/components/app/text-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ActionResult } from "@/lib/action-result";
import type { MyClassStudent, MyClassSubject } from "@/server/services/my-class";
import { addSubjectAction, deleteStudentAction, removeStudentAction, restoreStudentAction, updateSubjectAction } from "./actions";

/** Run a server action, show its message and refresh the page. */
function useRun() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  return { pending, run };
}

export function StudentsTable({ students, locked }: { students: MyClassStudent[]; locked: boolean }) {
  const { pending, run } = useRun();
  const [dialog, setDialog] = useState<{ kind: "remove" | "delete"; student: MyClassStudent } | null>(null);
  if (students.length === 0) return <p className="text-sm text-muted-foreground">No students are enrolled in this class.</p>;
  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Roll</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Guardian</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => (
              <TableRow key={s.enrollmentId} className={s.active ? undefined : "text-muted-foreground"}>
                <TableCell className="tabular-nums">{s.rollNumber}</TableCell>
                <TableCell>
                  <span className="font-medium">{s.fullName}</span>
                  <span className="block text-xs text-muted-foreground">{s.studentCode}</span>
                </TableCell>
                <TableCell className="text-sm">{s.guardianName ?? "—"}</TableCell>
                <TableCell>{s.active ? <Badge variant="secondary">On class list</Badge> : <Badge variant="outline">Removed</Badge>}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {locked ? null : s.active ? (
                    <>
                      <Button variant="ghost" size="sm" disabled={pending} onClick={() => setDialog({ kind: "remove", student: s })}>
                        <UserMinus aria-hidden /> Remove<span className="sr-only"> {s.fullName}</span>
                      </Button>
                      {!s.hasRecords ? (
                        <Button variant="ghost" size="sm" className="text-destructive" disabled={pending} onClick={() => setDialog({ kind: "delete", student: s })}>
                          <Trash2 aria-hidden /> Delete<span className="sr-only"> {s.fullName}</span>
                        </Button>
                      ) : null}
                    </>
                  ) : (
                    <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => restoreStudentAction(s.enrollmentId))}>
                      <RotateCcw aria-hidden /> Restore<span className="sr-only"> {s.fullName}</span>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <TextDialog
        open={dialog?.kind === "remove"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={`Remove ${dialog?.student.fullName ?? ""} from the class?`}
        description="They leave the class list, mark sheets and results. Their marks and history are kept, and you can restore them later."
        label="Reason"
        initial=""
        placeholder="e.g. Left the school in October."
        minLength={5}
        submitLabel="Remove from class"
        onSubmit={(reason) => removeStudentAction(dialog!.student.enrollmentId, reason)}
      />
      <TextDialog
        open={dialog?.kind === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={`Delete ${dialog?.student.fullName ?? ""}?`}
        description="Only for a student added by mistake: the record is deleted for good. The reason is kept in the audit log."
        label="Reason"
        initial=""
        placeholder="e.g. Added twice by mistake."
        minLength={5}
        submitLabel="Delete student"
        onSubmit={(reason) => deleteStudentAction(dialog!.student.enrollmentId, reason)}
      />
    </>
  );
}

function SubjectSwitch({ id, label, checked, disabled, onChange }: { id: string; label: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-center">
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

export function SubjectsTable({
  sectionId,
  subjects,
  addable,
  locked,
}: {
  sectionId: string;
  subjects: MyClassSubject[];
  addable: { id: string; name: string; code: string }[];
  locked: boolean;
}) {
  const { pending, run } = useRun();
  const [choice, setChoice] = useState<string>("");
  const change = (s: MyClassSubject, patch: Partial<Pick<MyClassSubject, "isCompulsory" | "includeInTotal" | "isActive">>) =>
    run(() => updateSubjectAction(sectionId, s.classSubjectId, { isCompulsory: s.isCompulsory, includeInTotal: s.includeInTotal, isActive: s.isActive, ...patch }));
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead className="text-center">Taught</TableHead>
              <TableHead className="text-center">Compulsory</TableHead>
              <TableHead className="text-center">Counts in total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((s) => (
              <TableRow key={s.classSubjectId} className={s.isActive ? undefined : "text-muted-foreground"}>
                <TableCell>
                  <span className="font-medium">{s.name}</span>
                  <span className="block text-xs text-muted-foreground">{s.code}</span>
                </TableCell>
                <TableCell className="text-sm">{s.teacherName ?? "Not assigned"}</TableCell>
                <TableCell>
                  <SubjectSwitch id={`on-${s.classSubjectId}`} label={`${s.name} is taught in this class`} checked={s.isActive} disabled={locked || pending} onChange={(v) => change(s, { isActive: v })} />
                </TableCell>
                <TableCell>
                  <SubjectSwitch id={`comp-${s.classSubjectId}`} label={`${s.name} is compulsory`} checked={s.isCompulsory} disabled={locked || pending || !s.isActive} onChange={(v) => change(s, { isCompulsory: v })} />
                </TableCell>
                <TableCell>
                  <SubjectSwitch id={`total-${s.classSubjectId}`} label={`${s.name} counts in the total`} checked={s.includeInTotal} disabled={locked || pending || !s.isActive} onChange={(v) => change(s, { includeInTotal: v })} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!locked && addable.length ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="add-subject" className="text-xs text-muted-foreground">
              Add a subject
            </Label>
            <Select value={choice} onValueChange={setChoice}>
              <SelectTrigger id="add-subject" className="w-60">
                <SelectValue placeholder="Choose a subject" />
              </SelectTrigger>
              <SelectContent>
                {addable.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={!choice || pending}
            onClick={() => {
              const id = choice;
              setChoice("");
              run(() => addSubjectAction(sectionId, id));
            }}
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />} Add subject
          </Button>
        </div>
      ) : null}
    </div>
  );
}
