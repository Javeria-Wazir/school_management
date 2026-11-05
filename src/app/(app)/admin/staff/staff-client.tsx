"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Check, Copy, KeyRound, MoreHorizontal, Pencil, Plus, School, UserCheck, UserX } from "lucide-react";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { DataTable, SortableHeader } from "@/components/app/data-table";
import { ActionForm, Field, fieldProps, FormMessage, SubmitButton, useActionFeedback } from "@/components/app/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { idleState, type ActionResult } from "@/lib/action-result";
import { ROLE_LABELS } from "@/lib/validation/staff";
import type { StaffRow } from "@/server/services/staff";
import { createStaffAction, resetStaffPasswordAction, setStaffActiveAction, setTeacherClassAction, updateStaffAction } from "./actions";

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

function RoleSelect({ defaultValue, error, disabled }: { defaultValue?: string; error?: string[]; disabled?: boolean }) {
  return (
    <Field id="role" label="Role" error={error} hint="Class teachers are chosen per section. Pick “Teacher” for them.">
      <Select name="role" defaultValue={defaultValue ?? "teacher"} disabled={disabled}>
        <SelectTrigger id="role" className="w-full" aria-invalid={error?.length ? true : undefined}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="teacher">{ROLE_LABELS.teacher}</SelectItem>
          <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
        </SelectContent>
      </Select>
      {disabled ? <input type="hidden" name="role" value={defaultValue} /> : null}
    </Field>
  );
}

/** Shows a temporary password exactly once, with a copy button. */
function TemporaryPasswordDialog({ value, onClose }: { value: { email: string; password: string } | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Dialog open={value !== null} onOpenChange={(open) => !open && (onClose(), setCopied(false))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Temporary password</DialogTitle>
          <DialogDescription>
            Give this password to the staff member in person or by private message. It is shown only once; they must choose their own
            password when they first sign in.
          </DialogDescription>
        </DialogHeader>
        {value ? (
          <div className="grid gap-2 rounded-lg border bg-muted/40 p-4">
            <div className="text-sm text-muted-foreground">Sign-in e-mail</div>
            <div className="font-medium break-all">{value.email}</div>
            <div className="mt-2 text-sm text-muted-foreground">Temporary password</div>
            <div className="flex items-center gap-2">
              <code className="rounded bg-background px-2 py-1 font-mono text-lg tracking-wider">{value.password}</code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(value.password);
                    setCopied(true);
                  } catch {
                    toast.error("Copy failed. Select the password and copy it manually.");
                  }
                }}
              >
                {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type SectionOption = { id: string; label: string; classTeacherId: string | null; classTeacherName: string | null };

const NO_CLASS = "none";

/** "Class 7 A — Ansa" so the principal sees whose class they are giving away. */
function sectionLabel(s: SectionOption, teacherId?: string) {
  if (!s.classTeacherName || s.classTeacherId === teacherId) return s.label;
  return `${s.label} — now ${s.classTeacherName}`;
}

function ClassSelect({ sections, value, onChange, teacherId }: { sections: SectionOption[]; value: string; onChange: (v: string) => void; teacherId?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id="sectionId" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_CLASS}>No class (subject teacher only)</SelectItem>
        {sections.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {sectionLabel(s, teacherId)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ChangeClassDialog({ row, sections, onClose }: { row: StaffRow | null; sections: SectionOption[]; onClose: () => void }) {
  const current = row ? (sections.find((s) => s.classTeacherId === row.id)?.id ?? NO_CLASS) : NO_CLASS;
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);
  const chosen = sections.find((s) => s.id === value);
  const replacing = chosen && chosen.classTeacherId && chosen.classTeacherId !== row?.id ? chosen.classTeacherName : null;
  return (
    <Dialog open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change class · {row?.fullName}</DialogTitle>
          <DialogDescription>The class this teacher is class teacher of this year. Subjects they teach are set in Teacher assignments.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="sectionId">Class teacher of</Label>
          <ClassSelect sections={sections} value={value} onChange={setValue} teacherId={row?.id} />
          {replacing ? <p className="text-xs text-amber-700 dark:text-amber-400">{replacing} will no longer be this class&apos;s teacher.</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            disabled={saving || value === current}
            onClick={async () => {
              if (!row) return;
              setSaving(true);
              const result = await setTeacherClassAction(row.id, value);
              setSaving(false);
              if (!result.ok) return void toast.error(result.message);
              toast.success(result.message);
              onClose();
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CreateStaffDialog({ sections }: { sections: SectionOption[] }) {
  const [sectionId, setSectionId] = useState(NO_CLASS);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<{ email: string; password: string } | null>(null);
  const [state, action] = useActionState(createStaffAction, idleState as ActionResult<{ temporaryPassword: string; email: string }>);
  useActionFeedback(state, (s) => {
    setOpen(false);
    if (s.data) setShown({ email: s.data.email, password: s.data.temporaryPassword });
  });
  const errors = state.ok ? undefined : state.fieldErrors;
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus aria-hidden /> Add staff
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a staff account</DialogTitle>
            <DialogDescription>A temporary password is generated for you to pass on.</DialogDescription>
          </DialogHeader>
          <ActionForm action={action} className="grid gap-4" noValidate>
            <FormMessage state={state} />
            <Field id="fullName" label="Full name" error={errors?.fullName}>
              <Input {...fieldProps("fullName", errors?.fullName)} required maxLength={120} autoComplete="off" />
            </Field>
            <Field id="email" label="E-mail (used to sign in)" error={errors?.email}>
              <Input {...fieldProps("email", errors?.email)} type="email" required autoComplete="off" />
            </Field>
            <Field id="phone" label="WhatsApp number (optional)" error={errors?.phone} hint="International format, e.g. +923001234567">
              <Input {...fieldProps("phone", errors?.phone)} type="tel" inputMode="tel" autoComplete="off" />
            </Field>
            <RoleSelect error={errors?.role} />
            <Field id="sectionId" label="Class teacher of (optional)" hint="You can change this later with “Change class”.">
              <ClassSelect sections={sections} value={sectionId} onChange={setSectionId} />
              <input type="hidden" name="sectionId" value={sectionId} />
            </Field>
            <DialogFooter>
              <SubmitButton pendingText="Creating…">Create account</SubmitButton>
            </DialogFooter>
          </ActionForm>
        </DialogContent>
      </Dialog>
      <TemporaryPasswordDialog value={shown} onClose={() => setShown(null)} />
    </>
  );
}

function EditStaffDialog({ row, isSelf, onClose }: { row: StaffRow | null; isSelf: boolean; onClose: () => void }) {
  const [state, action] = useActionState(updateStaffAction, idleState);
  useActionFeedback(state, onClose);
  const errors = state.ok ? undefined : state.fieldErrors;
  return (
    <Dialog open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit staff account</DialogTitle>
          <DialogDescription>{row?.email}</DialogDescription>
        </DialogHeader>
        {row ? (
          <ActionForm action={action} className="grid gap-4" noValidate key={row.id}>
            <FormMessage state={state} />
            <input type="hidden" name="id" value={row.id} />
            <Field id="fullName" label="Full name" error={errors?.fullName}>
              <Input {...fieldProps("fullName", errors?.fullName)} defaultValue={row.fullName} required maxLength={120} />
            </Field>
            <Field id="phone" label="WhatsApp number (optional)" error={errors?.phone} hint="International format, e.g. +923001234567">
              <Input {...fieldProps("phone", errors?.phone)} defaultValue={row.phone ?? ""} type="tel" inputMode="tel" />
            </Field>
            <RoleSelect defaultValue={row.role} error={errors?.role} disabled={isSelf} />
            <DialogFooter>
              <SubmitButton>Save changes</SubmitButton>
            </DialogFooter>
          </ActionForm>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type Pending = { kind: "activate" | "deactivate" | "reset"; row: StaffRow } | null;

export function StaffTable({ staff, sections, currentUserId }: { staff: StaffRow[]; sections: SectionOption[]; currentUserId: string }) {
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [changingClass, setChangingClass] = useState<StaffRow | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [shown, setShown] = useState<{ email: string; password: string } | null>(null);

  const columns: ColumnDef<StaffRow, unknown>[] = [
    {
      accessorKey: "fullName",
      header: ({ column }) => <SortableHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <div className="min-w-40">
          <div className="font-medium">
            {row.original.fullName}
            {row.original.id === currentUserId ? <span className="ml-1 text-xs text-muted-foreground">(you)</span> : null}
          </div>
          <div className="text-xs text-muted-foreground">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: ({ column }) => <SortableHeader column={column} title="Role" />,
      cell: ({ row }) => <Badge variant={row.original.role === "admin" ? "default" : "secondary"}>{ROLE_LABELS[row.original.role]}</Badge>,
    },
    {
      id: "duties",
      header: "Duties",
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.classNames ? `Class teacher of ${row.original.classNames} · ` : row.original.classTeacherOf ? `Class teacher (${row.original.classTeacherOf}) · ` : ""}
          {row.original.subjectAssignments} subject{row.original.subjectAssignments === 1 ? "" : "s"}
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      enableGlobalFilter: false,
      cell: ({ row }) =>
        !row.original.isActive ? (
          <Badge variant="outline">Inactive</Badge>
        ) : row.original.mustChangePassword ? (
          <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">
            Temporary password
          </Badge>
        ) : (
          <Badge variant="outline" className="border-emerald-500/50 text-emerald-700 dark:text-emerald-400">
            Active
          </Badge>
        ),
    },
    {
      accessorKey: "lastLoginAt",
      header: ({ column }) => <SortableHeader column={column} title="Last sign-in" />,
      enableGlobalFilter: false,
      sortingFn: "datetime",
      cell: ({ row }) => <span className="text-sm whitespace-nowrap">{row.original.lastLoginAt ? dateFormat.format(row.original.lastLoginAt) : "Never"}</span>,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const r = row.original;
        const isSelf = r.id === currentUserId;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${r.fullName}`}>
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditing(r)}>
                <Pencil aria-hidden /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setChangingClass(r)} disabled={!r.isActive}>
                <School aria-hidden /> Change class
              </DropdownMenuItem>
              {!isSelf ? (
                <>
                  <DropdownMenuItem onSelect={() => setPending({ kind: "reset", row: r })} disabled={!r.isActive}>
                    <KeyRound aria-hidden /> Reset password
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {r.isActive ? (
                    <DropdownMenuItem variant="destructive" onSelect={() => setPending({ kind: "deactivate", row: r })}>
                      <UserX aria-hidden /> Deactivate
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onSelect={() => setPending({ kind: "activate", row: r })}>
                      <UserCheck aria-hidden /> Activate
                    </DropdownMenuItem>
                  )}
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  async function confirm(): Promise<boolean> {
    if (!pending) return true;
    const { kind, row } = pending;
    if (kind === "reset") {
      const result = await resetStaffPasswordAction(row.id);
      if (!result.ok) return toast.error(result.message), false;
      setShown({ email: row.email, password: result.data!.temporaryPassword });
      return true;
    }
    const result = await setStaffActiveAction(row.id, kind === "activate");
    if (!result.ok) return toast.error(result.message), false;
    toast.success(result.message);
    return true;
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={staff}
        searchText={(r) => `${r.fullName} ${r.email} ${r.phone ?? ""} ${ROLE_LABELS[r.role]}`}
        searchPlaceholder="Search by name or e-mail" emptyMessage="No staff accounts yet. Use “Add staff” to create one." />
      <EditStaffDialog row={editing} isSelf={editing?.id === currentUserId} onClose={() => setEditing(null)} />
      <ChangeClassDialog key={changingClass?.id ?? "none"} row={changingClass} sections={sections} onClose={() => setChangingClass(null)} />
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={
          pending?.kind === "reset" ? "Reset password?" : pending?.kind === "deactivate" ? "Deactivate account?" : "Activate account?"
        }
        description={
          pending?.kind === "reset" ? (
            <p>{pending.row.fullName} will be signed out everywhere and must sign in with a new temporary password.</p>
          ) : pending?.kind === "deactivate" ? (
            <p>
              {pending.row.fullName} will be signed out and can no longer sign in. Their marks and history are kept. You can activate the
              account again later.
            </p>
          ) : (
            <p>{pending?.row.fullName} will be able to sign in again.</p>
          )
        }
        confirmLabel={pending?.kind === "reset" ? "Reset password" : pending?.kind === "deactivate" ? "Deactivate" : "Activate"}
        destructive={pending?.kind !== "activate"}
        onConfirm={confirm}
      />
      <TemporaryPasswordDialog value={shown} onClose={() => setShown(null)} />
    </>
  );
}
