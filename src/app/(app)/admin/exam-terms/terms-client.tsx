"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CalendarCheck, Lock, Plus, Wand2 } from "lucide-react";
import { Fragment, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { DataTable, SortableHeader } from "@/components/app/data-table";
import { Field, fieldProps } from "@/components/app/form";
import { FormDialog } from "@/components/app/form-dialog";
import { FormSelect } from "@/components/app/form-select";
import { ActiveText, RowActions, SwitchField } from "@/components/app/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber, toDecimal, Dec } from "@/lib/domain/calculations";
import type { AssessmentTypeRow, ExamTermRow, TermAssessmentRow } from "@/server/services/exam-terms";
import {
  deleteExamTermAction,
  prepareAssessmentsAction,
  saveAssessmentTypeAction,
  saveExamTermAction,
  setCurrentExamTermAction,
  setMaxMarksAction,
} from "./actions";

type Option = { value: string; label: string };
const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });
const fmt = (iso: string | null) => (iso ? dateFormat.format(new Date(`${iso}T00:00:00Z`)) : "—");

export function ExamTermDialog({
  academicYearId,
  scaleOptions,
  row,
  open,
  onOpenChange,
}: {
  academicYearId?: string;
  scaleOptions: Option[];
  row?: ExamTermRow;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <FormDialog
      title={row ? `Edit ${row.name}` : "Add an exam term"}
      trigger={row ? undefined : <Button><Plus aria-hidden /> Add term</Button>}
      open={open}
      onOpenChange={onOpenChange}
      action={saveExamTermAction}
      submitLabel={row ? "Save changes" : "Add term"}
      wide
    >
      {(e) => (
        <>
          {row ? <input type="hidden" name="id" value={row.id} /> : <input type="hidden" name="academicYearId" value={academicYearId} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Name" error={e?.name} hint="e.g. First Term, Mid-Term, Final">
              <Input {...fieldProps("name", e?.name)} defaultValue={row?.name} required maxLength={60} autoComplete="off" />
            </Field>
            <Field id="sortOrder" label="Order" error={e?.sortOrder}>
              <Input {...fieldProps("sortOrder", e?.sortOrder)} type="number" min={0} max={9999} defaultValue={row?.sortOrder ?? 0} />
            </Field>
            <Field id="startDate" label="Starts (optional)" error={e?.startDate}>
              <Input {...fieldProps("startDate", e?.startDate)} type="date" defaultValue={row?.startDate ?? ""} />
            </Field>
            <Field id="endDate" label="Ends (optional)" error={e?.endDate}>
              <Input {...fieldProps("endDate", e?.endDate)} type="date" defaultValue={row?.endDate ?? ""} />
            </Field>
            <Field id="marksDeadline" label="Marks deadline (optional)" error={e?.marksDeadline} hint="Teachers see this date on their mark sheets.">
              <Input {...fieldProps("marksDeadline", e?.marksDeadline)} type="date" defaultValue={row?.marksDeadline ?? ""} />
            </Field>
            <Field id="gradingScaleId" label="Grading scale" error={e?.gradingScaleId} hint="Leave as default unless this term uses different grades.">
              <FormSelect id="gradingScaleId" name="gradingScaleId" options={scaleOptions} defaultValue={row?.gradingScaleId} noneLabel="Default scale" />
            </Field>
          </div>
          {row ? <SwitchField id="isActive" label="Active" description="Inactive terms are hidden from marks entry." defaultChecked={row.isActive} /> : null}
        </>
      )}
    </FormDialog>
  );
}

export function ExamTermsTable({ terms, scaleOptions }: { terms: ExamTermRow[]; scaleOptions: Option[] }) {
  const [editing, setEditing] = useState<ExamTermRow | null>(null);
  const [makingCurrent, setMakingCurrent] = useState<ExamTermRow | null>(null);
  const columns: ColumnDef<ExamTermRow, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} title="Term" />,
      cell: ({ row }) => (
        <span className="flex items-center gap-2 font-medium">
          {row.original.name} {row.original.isCurrent ? <Badge>Current</Badge> : null}
        </span>
      ),
    },
    { id: "dates", header: "Dates", cell: ({ row }) => <span className="text-sm whitespace-nowrap">{row.original.startDate || row.original.endDate ? `${fmt(row.original.startDate)} – ${fmt(row.original.endDate)}` : "—"}</span> },
    { accessorKey: "marksDeadline", header: "Marks deadline", cell: ({ row }) => <span className="text-sm whitespace-nowrap">{fmt(row.original.marksDeadline)}</span> },
    { id: "scale", accessorFn: (r) => r.gradingScaleName ?? "", header: "Grading scale", cell: ({ row }) => row.original.gradingScaleName ?? <span className="text-muted-foreground">Default</span> },
    { accessorKey: "isActive", header: "Status", enableGlobalFilter: false, cell: ({ row }) => <ActiveText active={row.original.isActive} /> },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <RowActions
          label={row.original.name}
          onEdit={() => setEditing(row.original)}
          onDelete={() => deleteExamTermAction(row.original.id)}
          deleteDescription={<p>Only a term without maximum marks set up can be deleted. Otherwise make it inactive.</p>}
          extra={
            row.original.isCurrent ? null : (
              <DropdownMenuItem onSelect={() => setMakingCurrent(row.original)}>
                <CalendarCheck aria-hidden /> Make current
              </DropdownMenuItem>
            )
          }
        />
      ),
    },
  ];
  return (
    <>
      <DataTable columns={columns} data={terms} searchPlaceholder="Search terms" emptyMessage="No exam terms in this academic year yet." />
      <ExamTermDialog key={editing?.id ?? "none"} row={editing ?? undefined} scaleOptions={scaleOptions} open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} />
      <ConfirmDialog
        open={makingCurrent !== null}
        onOpenChange={(o) => !o && setMakingCurrent(null)}
        title={`Make ${makingCurrent?.name} the current term?`}
        description={<p>Teachers will see this term first when entering marks.</p>}
        confirmLabel="Make current"
        onConfirm={async () => {
          if (!makingCurrent) return true;
          const result = await setCurrentExamTermAction(makingCurrent.id);
          if (result.ok) toast.success(result.message);
          else toast.error(result.message);
          return result.ok;
        }}
      />
    </>
  );
}

export function AssessmentTypeDialog({ row, open, onOpenChange }: { row?: AssessmentTypeRow; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  return (
    <FormDialog
      title={row ? `Edit ${row.name}` : "Add a mark component"}
      description="Default maximum marks are used when a term's maximums are set up. Terms already set up are not changed."
      trigger={row ? undefined : <Button variant="outline"><Plus aria-hidden /> Add component</Button>}
      open={open}
      onOpenChange={onOpenChange}
      action={saveAssessmentTypeAction}
      submitLabel={row ? "Save changes" : "Add component"}
    >
      {(e) => (
        <>
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          {row ? null : (
            <Field id="code" label="Code" error={e?.code} hint="Capital letters, e.g. PRACTICAL">
              <Input {...fieldProps("code", e?.code)} required maxLength={20} className="uppercase" autoComplete="off" />
            </Field>
          )}
          <Field id="name" label="Name" error={e?.name}>
            <Input {...fieldProps("name", e?.name)} defaultValue={row?.name} required maxLength={60} autoComplete="off" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="defaultMaxMarks" label="Default maximum marks" error={e?.defaultMaxMarks}>
              <Input {...fieldProps("defaultMaxMarks", e?.defaultMaxMarks)} inputMode="decimal" defaultValue={row ? formatNumber(row.defaultMaxMarks) : ""} required />
            </Field>
            <Field id="sortOrder" label="Order" error={e?.sortOrder}>
              <Input {...fieldProps("sortOrder", e?.sortOrder)} type="number" min={0} max={9999} defaultValue={row?.sortOrder ?? 0} />
            </Field>
          </div>
          {row ? <SwitchField id="isActive" label="Active" description="Inactive components are not added to new terms." defaultChecked={row.isActive} /> : null}
        </>
      )}
    </FormDialog>
  );
}

export function AssessmentTypesTable({ types }: { types: AssessmentTypeRow[] }) {
  const [editing, setEditing] = useState<AssessmentTypeRow | null>(null);
  const activeTotal = types.filter((t) => t.isActive).reduce((sum, t) => sum.plus(toDecimal(t.defaultMaxMarks)!), new Dec(0));
  const columns: ColumnDef<AssessmentTypeRow, unknown>[] = [
    { accessorKey: "name", header: "Component", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "code", header: "Code", cell: ({ row }) => <code className="text-sm">{row.original.code}</code> },
    { accessorKey: "defaultMaxMarks", header: "Default maximum", enableGlobalFilter: false, cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.defaultMaxMarks)}</span> },
    { accessorKey: "isActive", header: "Status", enableGlobalFilter: false, cell: ({ row }) => <ActiveText active={row.original.isActive} /> },
    { id: "actions", header: () => <span className="sr-only">Actions</span>, cell: ({ row }) => <RowActions label={row.original.name} onEdit={() => setEditing(row.original)} /> },
  ];
  return (
    <div className="space-y-2">
      <DataTable columns={columns} data={types} searchPlaceholder="Search components" emptyMessage="No components." />
      <p className="text-sm text-muted-foreground">
        Default total per subject: <strong className="tabular-nums text-foreground">{formatNumber(activeTotal)}</strong> marks.
      </p>
      <AssessmentTypeDialog key={editing?.id ?? "none"} row={editing ?? undefined} open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} />
    </div>
  );
}

export function PrepareButton({ termId, hasRows }: { termId: string; hasRows: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant={hasRows ? "outline" : "default"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await prepareAssessmentsAction(termId);
          if (result.ok) toast.success(result.message);
          else toast.error(result.message);
        })
      }
    >
      <Wand2 aria-hidden /> {hasRows ? "Add missing subjects" : "Set up maximum marks"}
    </Button>
  );
}

function MaxCell({ row }: { row: TermAssessmentRow }) {
  const initial = formatNumber(row.maxMarks);
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();
  if (row.locked) {
    return (
      <span className="inline-flex items-center gap-1 tabular-nums" title="Marks have been submitted; the maximum is locked.">
        {initial} <Lock className="size-3 text-muted-foreground" aria-label="Locked" />
      </span>
    );
  }
  const save = () => {
    const next = value.trim();
    if (next === saved) return;
    startTransition(async () => {
      const result = await setMaxMarksAction(row.assessmentId, next);
      if (result.ok) {
        setSaved(next);
        toast.success(`${row.className} · ${row.subjectName} · ${row.assessmentTypeName}: maximum ${next}`);
      } else {
        setValue(saved);
        toast.error(result.message);
      }
    });
  };
  return (
    <Input
      aria-label={`${row.className} ${row.subjectName} ${row.assessmentTypeName} maximum marks`}
      className="h-8 w-20 tabular-nums"
      inputMode="decimal"
      value={value}
      disabled={pending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setValue(saved);
      }}
    />
  );
}

export function MaxMarksGrid({ rows }: { rows: TermAssessmentRow[] }) {
  const { components, subjects } = useMemo(() => {
    const componentNames = [...new Map(rows.map((r) => [r.assessmentTypeName, r.assessmentTypeSortOrder])).entries()].sort((a, b) => a[1] - b[1]).map(([n]) => n);
    const bySubject = new Map<string, { className: string; subjectName: string; cells: Map<string, TermAssessmentRow> }>();
    for (const r of rows) {
      const entry = bySubject.get(r.classSubjectId) ?? { className: r.className, subjectName: r.subjectName, cells: new Map() };
      entry.cells.set(r.assessmentTypeName, r);
      bySubject.set(r.classSubjectId, entry);
    }
    const list = [...bySubject.entries()].map(([id, entry], i, all) => ({ id, ...entry, firstOfClass: i === 0 || all[i - 1][1].className !== entry.className }));
    return { components: componentNames, subjects: list };
  }, [rows]);
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead>
            {components.map((c) => (
              <TableHead key={c}>{c}</TableHead>
            ))}
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.map((s) => {
            const total = [...s.cells.values()].reduce((sum, c) => sum.plus(toDecimal(c.maxMarks)!), new Dec(0));
            return (
              <Fragment key={s.id}>
                {s.firstOfClass ? (
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell colSpan={components.length + 2} className="font-semibold">
                      {s.className}
                    </TableCell>
                  </TableRow>
                ) : null}
                <TableRow>
                  <TableCell className="pl-6">{s.subjectName}</TableCell>
                  {components.map((c) => (
                    <TableCell key={c}>{s.cells.get(c) ? <MaxCell row={s.cells.get(c)!} /> : <span className="text-muted-foreground">—</span>}</TableCell>
                  ))}
                  <TableCell className="font-medium tabular-nums">{formatNumber(total)}</TableCell>
                </TableRow>
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
