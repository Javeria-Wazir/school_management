"use client";

import { Loader2 } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useTransition, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

/** Label + control + help text + server validation message, wired up for screen readers. */
export function Field({
  id,
  label,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  error?: string[];
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error?.length ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error?.length ? (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive" role="alert">
          {error[0]}
        </p>
      ) : null}
    </div>
  );
}

/** Props for an input inside <Field>: marks it invalid and links the message. */
export function fieldProps(id: string, error?: string[]) {
  return {
    id,
    name: id,
    "aria-invalid": error?.length ? true : undefined,
    "aria-describedby": error?.length ? `${id}-error` : `${id}-hint`,
  } as const;
}

const PendingContext = createContext(false);

/**
 * A form that submits to a `useActionState` action without React's automatic reset, so a rejected
 * submission keeps everything the user typed. Reset it yourself on success when needed.
 */
export function ActionForm({
  action,
  children,
  ...props
}: { action: (formData: FormData) => void } & Omit<ComponentProps<"form">, "action" | "onSubmit">) {
  const [pending, startTransition] = useTransition();
  return (
    <PendingContext.Provider value={pending}>
      <form
        {...props}
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(() => action(formData));
        }}
      >
        {children}
      </form>
    </PendingContext.Provider>
  );
}

export function SubmitButton({ children, pendingText, ...props }: ComponentProps<typeof Button> & { pendingText?: string }) {
  const contextPending = useContext(PendingContext);
  const { pending: formPending } = useFormStatus();
  const pending = contextPending || formPending;
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {pending ? (pendingText ?? "Saving…") : children}
    </Button>
  );
}

/**
 * React once per action result: success toast + `onSuccess`. Errors are toasted only when the form has
 * no inline <FormMessage> (pass `toastErrors: true`).
 */
export function useActionFeedback<T>(
  state: ActionResult<T>,
  onSuccess?: (state: ActionResult<T> & { ok: true }) => void,
  { toastErrors = false }: { toastErrors?: boolean } = {},
) {
  const last = useRef(state);
  const callback = useRef(onSuccess);
  useEffect(() => {
    callback.current = onSuccess;
  });
  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    if (state.ok) {
      if (state.message) toast.success(state.message);
      callback.current?.(state);
    } else if (toastErrors) {
      toast.error(state.message);
    }
  }, [state, toastErrors]);
}

export function FormMessage({ state }: { state: ActionResult<unknown> }) {
  if (state.ok || !state.message) return null;
  return (
    <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {state.message}
    </p>
  );
}
