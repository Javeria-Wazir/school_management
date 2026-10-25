"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useState } from "react";
import { DataTable, SortableHeader } from "@/components/app/data-table";
import { Field, fieldProps } from "@/components/app/form";
import { FormDialog } from "@/components/app/form-dialog";
import { FormSelect } from "@/components/app/form-select";
import { ActiveText, RowActions, SwitchField } from "@/components/app/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ClassRow, SectionRow } from "@/server/services/classes";
import { deleteClassAction, deleteSectionAction, saveClassAction, saveSectionAction } from "./actions";

type Option = { value: string; label: string };

export function ClassDialog({ row, open, onOpenChange }: { row?: ClassRow; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  return (
    <FormDialog
      title={row ? `Edit ${row.name}` : "Add a class"}
      description="For example “Class 6” or “Grade 9”."
      trigger={row ? undefined : <Button><Plus aria-hidden /> Add class</Button>}
      open={open}
      onOpenChange={onOpenChange}
      action={saveClassAction}
      submitLabel={row ? "Save changes" : "Add class"}
    >
      {(e) => (
        <>
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          <Field id="name" label="Name" error={e?.name}>
            <Input {...fieldProps("name", e?.name)} defaultValue={row?.name} required maxLength={50} autoComplete="off" />
          </Field>
          <Field id="sortOrder" label="Sort order" error={e?.sortOrder} hint="Smaller numbers come first.">
            <Input {...fieldProps("sortOrder", e?.sortOrder)} type="number" min={0} max={9999} defaultValue={row?.sortOrder ?? 0} />
          </Field>
          {row ? <SwitchField id="isActive" label="Active" description="Inactive classes are hidden when adding sections." defaultChecked={row.isActive} /> : null}
        </>
      )}
    </FormDialog>
  );
}

export function ClassesTable({ classes }: { classes: ClassRow[] }) {
  const [editing, setEditing] = useState<ClassRow | null>(null);
  const columns: ColumnDef<ClassRow, unknown>[] = [
    { accessorKey: "name", header: ({ column }) => <SortableHeader column={column} title="Class" />, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "sortOrder", header: ({ column }) => <SortableHeader column={column} title="Order" />, enableGlobalFilter: false },
    { accessorKey: "sectionCount", header: "Sections (this year)", enableGlobalFilter: false },
    { accessorKey: "isActive", header: "Status", enableGlobalFilter: false, cell: ({ row }) => <ActiveText active={row.original.isActive} /> },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => <RowActions label={row.original.name} onEdit={() => setEditing(row.original)} onDelete={() => deleteClassAction(row.original.id)} />,
    },
  ];
  return (
    <>
      <DataTable columns={columns} data={classes} searchPlaceholder="Search classes" emptyMessage="No classes yet. Add your first class." />
      <ClassDialog key={editing?.id ?? "none"} row={editing ?? undefined} open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} />
    </>
  );
}

export function SectionDialog({
  academicYearId,
  classOptions,
  staffOptions,
  row,
  open,
  onOpenChange,
}: {
  academicYearId?: string;
  classOptions?: Option[];
  staffOptions: Option[];
  row?: SectionRow;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <FormDialog
      title={row ? `Edit ${row.className} ${row.name}` : "Add a section"}
      description={row ? undefined : "Sections belong to the selected academic year."}
      trigger={row ? undefined : <Button><Plus aria-hidden /> Add section</Button>}
      open={open}
      onOpenChange={onOpenChange}
      action={saveSectionAction}
      submitLabel={row ? "Save changes" : "Add section"}
    >
      {(e) => (
        <>
          {row ? (
            <input type="hidden" name="id" value={row.id} />
          ) : (
            <>
              <input type="hidden" name="academicYearId" value={academicYearId} />
              <Field id="classId" label="Class" error={e?.classId}>
                <FormSelect id="classId" name="classId" options={classOptions ?? []} placeholder="Choose a class" invalid={Boolean(e?.classId)} />
              </Field>
            </>
          )}
          <Field id="name" label="Section name" error={e?.name} hint="For example A, B or Blue.">
            <Input {...fieldProps("name", e?.name)} defaultValue={row?.name} required maxLength={20} autoComplete="off" />
          </Field>
          <Field id="classTeacherId" label="Class teacher" error={e?.classTeacherId} hint="Reviews and approves this section's results.">
            <FormSelect id="classTeacherId" name="classTeacherId" options={staffOptions} defaultValue={row?.classTeacherId} noneLabel="— Not assigned —" />
          </Field>
          {row ? <SwitchField id="isActive" label="Active" description="Inactive sections are hidden from marks entry." defaultChecked={row.isActive} /> : null}
        </>
      )}
    </FormDialog>
  );
}

export function SectionsTable({ sections, staffOptions }: { sections: SectionRow[]; staffOptions: Option[] }) {
  const [editing, setEditing] = useState<SectionRow | null>(null);
  const columns: ColumnDef<SectionRow, unknown>[] = [
    {
      id: "section",
      accessorFn: (r) => `${r.className} ${r.name}`,
      header: ({ column }) => <SortableHeader column={column} title="Section" />,
      sortingFn: (a, b) => a.original.classSortOrder - b.original.classSortOrder || a.original.className.localeCompare(b.original.className) || a.original.name.localeCompare(b.original.name),
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.className} <Badge variant="secondary">{row.original.name}</Badge>
        </span>
      ),
    },
    {
      id: "classTeacher",
      accessorFn: (r) => r.classTeacherName ?? "",
      header: ({ column }) => <SortableHeader column={column} title="Class teacher" />,
      cell: ({ row }) => row.original.classTeacherName ?? <span className="text-sm text-amber-700 dark:text-amber-400">Not assigned</span>,
    },
    { accessorKey: "studentCount", header: ({ column }) => <SortableHeader column={column} title="Students" />, enableGlobalFilter: false },
    { accessorKey: "isActive", header: "Status", enableGlobalFilter: false, cell: ({ row }) => <ActiveText active={row.original.isActive} /> },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <RowActions
          label={`${row.original.className} ${row.original.name}`}
          onEdit={() => setEditing(row.original)}
          onDelete={() => deleteSectionAction(row.original.id)}
        />
      ),
    },
  ];
  return (
    <>
      <DataTable columns={columns} data={sections} searchPlaceholder="Search sections or teachers" emptyMessage="No sections in this academic year yet." />
      <SectionDialog key={editing?.id ?? "none"} row={editing ?? undefined} staffOptions={staffOptions} open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} />
    </>
  );
}
