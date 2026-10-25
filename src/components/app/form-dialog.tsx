"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { idleState, type ActionResult, type FieldErrors } from "@/lib/action-result";
import { ActionForm, FormMessage, SubmitButton, useActionFeedback } from "./form";

type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/**
 * A dialog with a server-validated form. The form lives inside the dialog content, so its state
 * (errors, typed values) starts fresh each time the dialog opens. Closes itself on success.
 */
export function FormDialog({
  title,
  description,
  trigger,
  open: controlledOpen,
  onOpenChange,
  action,
  submitLabel,
  children,
  wide,
}: {
  title: string;
  description?: ReactNode;
  /** Button that opens the dialog (uncontrolled use). */
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  action: FormAction;
  submitLabel: string;
  children: (errors: FieldErrors | undefined) => ReactNode;
  wide?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* A controlled dialog (edit) is opened by its parent; only the uncontrolled one shows its button. */}
      {trigger && controlledOpen === undefined ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className={wide ? "sm:max-w-2xl" : undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {open ? (
          <DialogForm action={action} submitLabel={submitLabel} onDone={() => setOpen(false)}>
            {children}
          </DialogForm>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DialogForm({
  action,
  submitLabel,
  onDone,
  children,
}: {
  action: FormAction;
  submitLabel: string;
  onDone: () => void;
  children: (errors: FieldErrors | undefined) => ReactNode;
}) {
  const [state, dispatch] = useActionState(action, idleState);
  useActionFeedback(state, onDone);
  return (
    <ActionForm action={dispatch} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      {children(state.ok ? undefined : state.fieldErrors)}
      <DialogFooter>
        <SubmitButton>{submitLabel}</SubmitButton>
      </DialogFooter>
    </ActionForm>
  );
}
