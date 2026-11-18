"use client";

import { CheckCircle2, MessageSquareText, RotateCcw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { TextDialog } from "@/components/app/text-dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { classApproveAction, finalApproveAction, reopenAction, saveRemarksAction } from "./actions";
import type { ResultStage } from "@/lib/domain/stages";

type ResultKey = { examTermId: string; sectionId: string; stage: ResultStage };

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
