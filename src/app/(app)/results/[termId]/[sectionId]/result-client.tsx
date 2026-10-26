"use client";

import { CheckCircle2, Loader2, MessageSquareText, RotateCcw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { classApproveAction, finalApproveAction, reopenAction, saveRemarksAction } from "./actions";

type ResultKey = { examTermId: string; sectionId: string };

/** A reason/remarks dialog: a textarea, its error, and a save button that keeps the dialog open on failure. */
function TextDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  initial,
  placeholder,
  minLength,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  label: string;
  initial: string;
  placeholder?: string;
  minLength?: number;
  submitLabel: string;
  onSubmit: (text: string) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (next) {
          setText(initial);
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="dialog-text">{label}</Label>
          <Textarea
            id="dialog-text"
            value={text}
            maxLength={500}
            rows={4}
            placeholder={placeholder}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "dialog-text-error" : "dialog-text-count"}
            onChange={(e) => setText(e.target.value)}
          />
          {error ? (
            <p id="dialog-text-error" className="text-xs font-medium text-destructive" role="alert">
              {error}
            </p>
          ) : (
            <p id="dialog-text-count" className="text-xs text-muted-foreground">
              {text.length} / 500
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (minLength && text.trim().length < minLength) {
                  setError(`Please give a reason (at least ${minLength} characters)`);
                  return;
                }
                const result = await onSubmit(text);
                if (!result.ok) {
                  setError(result.message);
                  return;
                }
                toast.success(result.message);
                onOpenChange(false);
                router.refresh();
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RemarksButton({ resultKey, enrollmentId, studentName, remarks, editable }: { resultKey: ResultKey; enrollmentId: string; studentName: string; remarks: string; editable: boolean }) {
  const [open, setOpen] = useState(false);
  if (!editable) {
    return remarks ? <span className="line-clamp-2 text-xs text-muted-foreground">{remarks}</span> : <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <>
      <Button variant="ghost" size="sm" className="h-auto max-w-56 justify-start px-2 py-1 text-left whitespace-normal" onClick={() => setOpen(true)}>
        <MessageSquareText className="shrink-0" aria-hidden />
        {remarks ? <span className="line-clamp-2 text-xs">{remarks}</span> : <span className="text-xs text-muted-foreground">Add remarks</span>}
        <span className="sr-only"> for {studentName}</span>
      </Button>
      <TextDialog
        open={open}
        onOpenChange={setOpen}
        title={`Remarks for ${studentName}`}
        description="Printed on the result card as the class teacher's remarks. Leave empty to print none."
        label="Remarks"
        initial={remarks}
        placeholder="e.g. A hardworking student who participates well in class."
        submitLabel="Save remarks"
        onSubmit={(text) => saveRemarksAction(resultKey, enrollmentId, text)}
      />
    </>
  );
}

export function ResultActions({
  resultKey,
  canClassApprove,
  canFinalApprove,
  canReopen,
  requirePrincipalApproval,
  isAdmin,
}: {
  resultKey: ResultKey;
  canClassApprove: boolean;
  canFinalApprove: boolean;
  canReopen: boolean;
  requirePrincipalApproval: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<"class" | "final" | null>(null);
  const [reopening, setReopening] = useState(false);
  const run = async (action: () => Promise<ActionResult>) => {
    const result = await action();
    if (!result.ok) {
      toast.error(result.message);
      return false;
    }
    toast.success(result.message);
    router.refresh();
    return true;
  };
  return (
    <div className="flex flex-wrap gap-2">
      {canClassApprove ? (
        <Button onClick={() => setConfirm("class")}>
          <CheckCircle2 aria-hidden /> {isAdmin ? "Approve class result" : "Approve my class result"}
        </Button>
      ) : null}
      {canFinalApprove ? (
        <Button onClick={() => setConfirm("final")}>
          <ShieldCheck aria-hidden /> Give final approval
        </Button>
      ) : null}
      {canReopen ? (
        <Button variant="outline" onClick={() => setReopening(true)}>
          <RotateCcw aria-hidden /> Reopen
        </Button>
      ) : null}
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm === "final" ? "Give final approval?" : "Approve the class result?"}
        confirmLabel={confirm === "final" ? "Give final approval" : "Approve"}
        description={
          confirm === "final" ? (
            <p>Result cards will print as official, without the PROVISIONAL mark. Marks and remarks stay locked until you reopen the result.</p>
          ) : (
            <p>
              Marks and remarks are locked after approval.{" "}
              {requirePrincipalApproval ? "The principal then gives the final approval." : "Your school does not need the principal's approval, so this makes the result final."}
            </p>
          )
        }
        onConfirm={() => run(() => (confirm === "final" ? finalApproveAction(resultKey) : classApproveAction(resultKey)))}
      />
      <TextDialog
        open={reopening}
        onOpenChange={setReopening}
        title="Reopen this result?"
        description="Marks can then be returned and corrected, and the result must be approved again. The reason is kept in the audit log."
        label="Reason"
        initial=""
        placeholder="e.g. Science marks of roll 12 need correction."
        minLength={5}
        submitLabel="Reopen result"
        onSubmit={(reason) => reopenAction(resultKey, reason)}
      />
    </div>
  );
}
