"use client";

import { Check, LifeBuoy, X } from "lucide-react";
import { useState } from "react";
import { TextDialog } from "@/components/app/text-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { MarkSheetView } from "@/server/services/marks";
import { requestCorrectionAction, resolveCorrectionAction } from "./actions";

const when = (d: Date) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Correction requests on a submitted/approved sheet: the subject teacher asks for it back with a reason;
 * the class teacher or principal accepts (the sheet is returned for editing) or declines with a note.
 */
export function CorrectionPanel({ sheet }: { sheet: MarkSheetView }) {
  const [dialog, setDialog] = useState<"request" | "accept" | "decline" | null>(null);
  const { correction } = sheet;
  if (!correction && !sheet.canRequestCorrection) return null;
  const close = (open: boolean) => !open && setDialog(null);
  return (
    <>
      {correction ? (
        <Alert>
          <LifeBuoy aria-hidden />
          <AlertTitle>
            Correction requested by {correction.requestedByName} on {when(correction.requestedAt)}
          </AlertTitle>
          <AlertDescription>
            <p>{correction.reason}</p>
            {sheet.access.canReview ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setDialog("accept")}>
                  <Check aria-hidden /> Accept and return the marks
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDialog("decline")}>
                  <X aria-hidden /> Decline
                </Button>
              </div>
            ) : (
              <p className="mt-1 text-xs">Waiting for the class teacher.</p>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <div>
          <Button variant="outline" size="sm" onClick={() => setDialog("request")}>
            <LifeBuoy aria-hidden /> Request a correction
          </Button>
        </div>
      )}
      <TextDialog
        open={dialog === "request"}
        onOpenChange={close}
        title="Ask for these marks back?"
        description="The class teacher sees your request and can return the sheet to you for correction. The reason is kept in the audit log."
        label="What needs correcting"
        initial=""
        placeholder="e.g. Roll 12's mark should be 18, not 13."
        minLength={5}
        submitLabel="Send request"
        onSubmit={(reason) => requestCorrectionAction(sheet.key, sheet.sheetId!, reason)}
      />
      <TextDialog
        open={dialog === "accept"}
        onOpenChange={close}
        title="Return the marks for correction?"
        description="The sheet goes back to the subject teacher, who corrects and submits it again. It must then be approved again."
        label="Note (optional)"
        initial=""
        submitLabel="Accept and return"
        onSubmit={(note) => resolveCorrectionAction(sheet.key, correction!.id, true, note)}
      />
      <TextDialog
        open={dialog === "decline"}
        onOpenChange={close}
        title="Decline this request?"
        description="The marks stay as they are. The subject teacher sees your note."
        label="Why"
        initial=""
        placeholder="e.g. The mark matches the answer sheet."
        minLength={5}
        submitLabel="Decline request"
        onSubmit={(note) => resolveCorrectionAction(sheet.key, correction!.id, false, note)}
      />
    </>
  );
}
