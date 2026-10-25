"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ActionResult } from "@/lib/action-result";
import { ConfirmDialog } from "./confirm-dialog";

/** "…" menu with Edit and a confirmed Delete. The server decides whether deleting is allowed. */
export function RowActions({
  label,
  onEdit,
  onDelete,
  deleteTitle,
  deleteDescription,
  extra,
}: {
  label: string;
  onEdit?: () => void;
  onDelete?: () => Promise<ActionResult>;
  deleteTitle?: string;
  deleteDescription?: ReactNode;
  extra?: ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${label}`}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onEdit ? (
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil aria-hidden /> Edit
            </DropdownMenuItem>
          ) : null}
          {extra}
          {onDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirming(true)}>
                <Trash2 aria-hidden /> Delete
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {onDelete ? (
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={deleteTitle ?? `Delete ${label}?`}
          description={deleteDescription ?? <p>This cannot be undone. Records that are still in use cannot be deleted; make them inactive instead.</p>}
          confirmLabel="Delete"
          destructive
          onConfirm={async () => {
            const result = await onDelete();
            if (result.ok) toast.success(result.message ?? "Deleted.");
            else toast.error(result.message);
            return result.ok;
          }}
        />
      ) : null}
    </>
  );
}

/** A labelled on/off switch that submits "on" with its form. */
export function SwitchField({ id, label, description, defaultChecked }: { id: string; label: string; description?: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        {description ? (
          <p id={`${id}-description`} className="text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <Switch id={id} name={id} defaultChecked={defaultChecked} aria-describedby={description ? `${id}-description` : undefined} />
    </div>
  );
}

/** Small status badge text helper. */
export function ActiveText({ active }: { active: boolean }) {
  return active ? <span className="text-sm text-emerald-700 dark:text-emerald-400">Active</span> : <span className="text-sm text-muted-foreground">Inactive</span>;
}
