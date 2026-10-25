"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Copy, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { DataTable, SortableHeader } from "@/components/app/data-table";
import { Field, fieldProps } from "@/components/app/form";
import { FormDialog } from "@/components/app/form-dialog";
import { ActiveText, RowActions, SwitchField } from "@/components/app/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AcademicYearRow } from "@/server/services/academic-years";
import type { ClassSubjectRow, SubjectRow } from "@/server/services/subjects";
import {
  addClassSubjectsAction,
  copyClassSubjectsAction,
  deleteSubjectAction,
  removeClassSubjectAction,
  saveSubjectAction,
  updateClassSubjectAction,
} from "./actions";

export function SubjectDialog({ row, open, onOpenChange }: { row?: SubjectRow; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  return (
    <FormDialog
      title={row ? `Edit ${row.name}` : "Add a subject"}
      trigger={row ? undefined : <Button><Plus aria-hidden /> Add subject</Button>}
      open={open}
      onOpenChange={onOpenChange}
      action={saveSubjectAction}
      submitLabel={row ? "Save changes" : "Add subject"}
    >
      {(e) => (
        <>
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          <Field id="name" label="Name" error={e?.name}>
            <Input {...fieldProps("name", e?.name)} defaultValue={row?.name} required maxLength={60} autoComplete="off" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="code" label="Code" error={e?.code} hint="e.g. ENG, MATH">
              <Input {...fieldProps("code", e?.code)} defaultValue={row?.code} required maxLength={12} className="uppercase" autoComplete="off" />
            </Field>
            <Field id="sortOrder" label="Sort order" error={e?.sortOrder}>
              <Input {...fieldProps("sortOrder", e?.sortOrder)} type="number" min={0} max={9999} defaultValue={row?.sortOrder ?? 0} />
            </Field>
          </div>
          {row ? <SwitchField id="isActive" label="Active" description="Inactive subjects cannot be added to classes." defaultChecked={row.isActive} /> : null}
        </>
      )}
    </FormDialog>
  );
}

export function SubjectsTable({ subjects }: { subjects: SubjectRow[] }) {
  const [editing, setEditing] = useState<SubjectRow | null>(null);
  const columns: ColumnDef<SubjectRow, unknown>[] = [
    { accessorKey: "name", header: ({ column }) => <SortableHeader column={column} title="Subject" />, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "code", header: ({ column }) => <SortableHeader column={column} title="Code" />, cell: ({ row }) => <code className="text-sm">{row.original.code}</code> },
    { accessorKey: "sortOrder", header: ({ column }) => <SortableHeader column={column} title="Order" />, enableGlobalFilter: false },
    { accessorKey: "classCount", header: "Classes (this year)", enableGlobalFilter: false },
    { accessorKey: "isActive", header: "Status", enableGlobalFilter: false, cell: ({ row }) => <ActiveText active={row.original.isActive} /> },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => <RowActions label={row.original.name} onEdit={() => setEditing(row.original)} onDelete={() => deleteSubjectAction(row.original.id)} />,
    },
  ];
  return (
    <>
      <DataTable columns={columns} data={subjects} searchPlaceholder="Search subjects" emptyMessage="No subjects yet. Add the subjects your school teaches." />
      <SubjectDialog key={editing?.id ?? "none"} row={editing ?? undefined} open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} />
    </>
  );
}

export function AddClassSubjectsDialog({ academicYearId, classId, options }: { academicYearId: string; classId: string; options: { value: string; label: string }[] }) {
  return (
    <FormDialog
      title="Add subjects to this class"
      description="Tick the subjects this class studies in the selected academic year."
      trigger={
        <Button disabled={options.length === 0} title={options.length === 0 ? "All active subjects are already added" : undefined}>
          <Plus aria-hidden /> Add subjects
        </Button>
      }
      action={addClassSubjectsAction}
      submitLabel="Add selected"
    >
      {(e) => (
        <>
          <input type="hidden" name="academicYearId" value={academicYearId} />
          <input type="hidden" name="classId" value={classId} />
          <fieldset className="grid max-h-72 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
            <legend className="sr-only">Subjects</legend>
            {options.map((o) => (
              <div key={o.value} className="flex items-center gap-2">
                <Checkbox id={`subject-${o.value}`} name="subjectIds" value={o.value} />
                <Label htmlFor={`subject-${o.value}`} className="font-normal">
                  {o.label}
                </Label>
              </div>
            ))}
          </fieldset>
          {e?.subjectIds ? (
            <p role="alert" className="text-xs font-medium text-destructive">
              {e.subjectIds[0]}
            </p>
          ) : null}
        </>
      )}
    </FormDialog>
  );
}

function ClassSubjectDialog({ row, onClose }: { row: ClassSubjectRow | null; onClose: () => void }) {
  return (
    <FormDialog
      title={row ? `${row.subjectName} in ${row.className}` : ""}
      open={row !== null}
      onOpenChange={(o) => !o && onClose()}
      action={updateClassSubjectAction}
      submitLabel="Save"
    >
      {(e) =>
        row ? (
          <>
            <input type="hidden" name="id" value={row.id} />
            <SwitchField id="isCompulsory" label="Compulsory" description="Failing it means failing overall (if the grading scale requires it)." defaultChecked={row.isCompulsory} />
            <SwitchField id="includeInTotal" label="Counts in total" description="Its marks are part of the grand total and overall percentage." defaultChecked={row.includeInTotal} />
            <SwitchField id="isActive" label="Active" description="Inactive subjects get no mark sheets." defaultChecked={row.isActive} />
            <Field id="sortOrder" label="Order on the result sheet" error={e?.sortOrder}>
              <Input {...fieldProps("sortOrder", e?.sortOrder)} type="number" min={0} max={9999} defaultValue={row.sortOrder} />
            </Field>
          </>
        ) : null
      }
    </FormDialog>
  );
}

export function ClassSubjectsTable({ rows }: { rows: ClassSubjectRow[] }) {
  const [editing, setEditing] = useState<ClassSubjectRow | null>(null);
  const columns: ColumnDef<ClassSubjectRow, unknown>[] = [
    { accessorKey: "sortOrder", header: ({ column }) => <SortableHeader column={column} title="#" />, enableGlobalFilter: false },
    {
      accessorKey: "subjectName",
      header: ({ column }) => <SortableHeader column={column} title="Subject" />,
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.subjectName} <code className="ml-1 text-xs text-muted-foreground">{row.original.subjectCode}</code>
        </span>
      ),
    },
    {
      id: "flags",
      header: "Rules",
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant={row.original.isCompulsory ? "default" : "outline"}>{row.original.isCompulsory ? "Compulsory" : "Optional"}</Badge>
          <Badge variant="outline">{row.original.includeInTotal ? "Counts in total" : "Not in total"}</Badge>
        </div>
      ),
    },
    { accessorKey: "assignmentCount", header: "Teachers assigned", enableGlobalFilter: false },
    { accessorKey: "isActive", header: "Status", enableGlobalFilter: false, cell: ({ row }) => <ActiveText active={row.original.isActive} /> },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <RowActions
          label={row.original.subjectName}
          onEdit={() => setEditing(row.original)}
          onDelete={() => removeClassSubjectAction(row.original.id)}
          deleteTitle={`Remove ${row.original.subjectName} from ${row.original.className}?`}
          deleteDescription={<p>Its teacher assignments are removed too. Once marks or assessments exist this is refused; make it inactive instead.</p>}
        />
      ),
    },
  ];
  return (
    <>
      <DataTable columns={columns} data={rows} searchPlaceholder="Search subjects" emptyMessage="This class has no subjects for this year yet. Use “Add subjects”." />
      <ClassSubjectDialog key={editing?.id ?? "none"} row={editing} onClose={() => setEditing(null)} />
    </>
  );
}

export function CopyFromYearButton({ fromYear, toYearId, toYearName }: { fromYear: AcademicYearRow; toYearId: string; toYearName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed p-3 text-sm">
      <span>No class has subjects in {toYearName} yet. Start from last year&apos;s set-up?</span>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Copy aria-hidden /> Copy from {fromYear.name}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Copy subjects from ${fromYear.name}?`}
        description={<p>Every class gets the same subjects and rules it had in {fromYear.name}. Teacher assignments are not copied.</p>}
        confirmLabel="Copy subjects"
        onConfirm={async () => {
          const result = await copyClassSubjectsAction(fromYear.id, toYearId);
          if (result.ok) toast.success(result.message);
          else toast.error(result.message);
          return result.ok;
        }}
      />
    </div>
  );
}
