"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";

/** A reason/remarks dialog: a textarea, its error, and a save button that keeps the dialog open on failure. */
export function TextDialog({
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
