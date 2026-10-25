"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CalendarCheck, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { DataTable, SortableHeader } from "@/components/app/data-table";
import { ActionForm, Field, fieldProps, FormMessage, SubmitButton, useActionFeedback } from "@/components/app/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { idleState } from "@/lib/action-result";
import type { AcademicYearRow } from "@/server/services/academic-years";
import { deleteAcademicYearAction, saveAcademicYearAction, setCurrentAcademicYearAction } from "./actions";

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });
const formatDate = (iso: string) => dateFormat.format(new Date(`${iso}T00:00:00Z`));

function suggestion() {
  const now = new Date();
  const start = now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1;
  return { name: `${start}-${start + 1}`, startDate: `${start}-04-01`, endDate: `${start + 1}-03-31` };
}

/** Create (no `year`) or edit (with `year`). */
export function AcademicYearDialog({ year, open: controlledOpen, onOpenChange }: { year?: AcademicYearRow; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [state, action] = useActionState(saveAcademicYearAction, idleState);
  useActionFeedback(state, () => setOpen(false));
  const e = state.ok ? undefined : state.fieldErrors;
  const defaults = year ?? suggestion();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen !== undefined ? null : (
        <DialogTrigger asChild>
          <Button>
            <Plus aria-hidden /> New academic year
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{year ? `Edit ${year.name}` : "New academic year"}</DialogTitle>
          <DialogDescription>Name it after the two calendar years it spans, e.g. 2026-2027.</DialogDescription>
        </DialogHeader>
        <ActionForm action={action} className="grid gap-4" noValidate key={year?.id ?? "new"}>
          <FormMessage state={state} />
          {year ? <input type="hidden" name="id" value={year.id} /> : null}
          <Field id="name" label="Name" error={e?.name}>
            <Input {...fieldProps("name", e?.name)} defaultValue={defaults.name} placeholder="2026-2027" required pattern="[0-9]{4}-[0-9]{4}" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="startDate" label="Starts" error={e?.startDate}>
              <Input {...fieldProps("startDate", e?.startDate)} type="date" defaultValue={defaults.startDate} required />
            </Field>
            <Field id="endDate" label="Ends" error={e?.endDate}>
              <Input {...fieldProps("endDate", e?.endDate)} type="date" defaultValue={defaults.endDate} required />
            </Field>
          </div>
          <DialogFooter>
            <SubmitButton>{year ? "Save changes" : "Create year"}</SubmitButton>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

type Pending = { kind: "current" | "delete"; year: AcademicYearRow } | null;

export function AcademicYearsTable({ years }: { years: AcademicYearRow[] }) {
  const [editing, setEditing] = useState<AcademicYearRow | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  const columns: ColumnDef<AcademicYearRow, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} title="Year" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-medium">
          {row.original.name}
          {row.original.isCurrent ? <Badge>Current</Badge> : null}
        </div>
      ),
    },
    {
      accessorKey: "startDate",
      header: ({ column }) => <SortableHeader column={column} title="Dates" />,
      cell: ({ row }) => (
        <span className="text-sm whitespace-nowrap">
          {formatDate(row.original.startDate)} – {formatDate(row.original.endDate)}
        </span>
      ),
    },
    { accessorKey: "sectionCount", header: "Sections", enableGlobalFilter: false },
    { accessorKey: "studentCount", header: "Students", enableGlobalFilter: false },
    { accessorKey: "termCount", header: "Exam terms", enableGlobalFilter: false },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const y = row.original;
        const unused = y.sectionCount === 0 && y.termCount === 0 && y.studentCount === 0;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${y.name}`}>
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditing(y)}>
                <Pencil aria-hidden /> Edit
              </DropdownMenuItem>
              {!y.isCurrent ? (
                <DropdownMenuItem onSelect={() => setPending({ kind: "current", year: y })}>
                  <CalendarCheck aria-hidden /> Make current
                </DropdownMenuItem>
              ) : null}
              {unused && !y.isCurrent ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setPending({ kind: "delete", year: y })}>
                    <Trash2 aria-hidden /> Delete
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      <DataTable columns={columns} data={years} searchPlaceholder="Search years" emptyMessage="No academic years yet. Create the first one to get started." />
      <AcademicYearDialog year={editing ?? undefined} open={editing !== null} onOpenChange={(open) => !open && setEditing(null)} />
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending?.kind === "delete" ? `Delete ${pending.year.name}?` : `Make ${pending?.year.name} the current year?`}
        description={
          pending?.kind === "delete" ? (
            <p>This year has no sections, terms or students. It will be removed permanently.</p>
          ) : (
            <p>Everyone will work with this year&apos;s classes, students and terms. The current exam term is cleared until you pick one for this year.</p>
          )
        }
        confirmLabel={pending?.kind === "delete" ? "Delete" : "Make current"}
        destructive={pending?.kind === "delete"}
        onConfirm={async () => {
          if (!pending) return true;
          const result = pending.kind === "delete" ? await deleteAcademicYearAction(pending.year.id) : await setCurrentAcademicYearAction(pending.year.id);
          if (result.ok) toast.success(result.message);
          else toast.error(result.message);
          return result.ok;
        }}
      />
    </>
  );
}
