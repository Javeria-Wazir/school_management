"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { GraduationCap, LogOut, Plus, Undo2, UserMinus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { DataTable, SortableHeader } from "@/components/app/data-table";
import { Field, fieldProps } from "@/components/app/form";
import { FormDialog } from "@/components/app/form-dialog";
import { FormSelect } from "@/components/app/form-select";
import { RowActions } from "@/components/app/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import type { EnrolledStudentRow } from "@/server/services/students";
import { createStudentAction, setEnrollmentActiveAction, setStudentStatusAction, updateStudentAction } from "./actions";

type Option = { value: string; label: string };

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

function StudentFields({ e, row, sectionOptions }: { e?: FieldErrors; row?: EnrolledStudentRow; sectionOptions: Option[] }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="sectionId" label="Class and section" error={e?.sectionId}>
          <FormSelect id="sectionId" name="sectionId" options={sectionOptions} defaultValue={row?.sectionId} placeholder="Choose a section" invalid={Boolean(e?.sectionId)} />
        </Field>
        <Field id="rollNumber" label="Roll number" error={e?.rollNumber}>
          <Input {...fieldProps("rollNumber", e?.rollNumber)} type="number" min={1} max={99999} defaultValue={row?.rollNumber} required />
        </Field>
        <Field id="studentCode" label="Student ID / admission no." error={e?.studentCode}>
          <Input {...fieldProps("studentCode", e?.studentCode)} defaultValue={row?.studentCode} required maxLength={30} autoComplete="off" />
        </Field>
        <Field id="fullName" label="Full name" error={e?.fullName}>
          <Input {...fieldProps("fullName", e?.fullName)} defaultValue={row?.fullName} required maxLength={120} autoComplete="off" />
        </Field>
        <Field id="guardianName" label="Guardian name (optional)" error={e?.guardianName}>
          <Input {...fieldProps("guardianName", e?.guardianName)} defaultValue={row?.guardianName ?? ""} maxLength={120} autoComplete="off" />
        </Field>
        <Field id="guardianPhone" label="Guardian phone (optional)" error={e?.guardianPhone} hint="03001234567 or +923001234567">
          <Input {...fieldProps("guardianPhone", e?.guardianPhone)} defaultValue={row?.guardianPhone ?? ""} type="tel" inputMode="tel" autoComplete="off" />
        </Field>
        <Field id="dateOfBirth" label="Date of birth (optional)" error={e?.dateOfBirth}>
          <Input {...fieldProps("dateOfBirth", e?.dateOfBirth)} type="date" defaultValue={row?.dateOfBirth ?? ""} />
        </Field>
      </div>
    </>
  );
}

export function AddStudentDialog({ academicYearId, sectionOptions }: { academicYearId: string; sectionOptions: Option[] }) {
  return (
    <FormDialog
      title="Add a student"
      description="Creates the student's record and enrols them in the chosen section."
      trigger={<Button><Plus aria-hidden /> Add student</Button>}
      action={createStudentAction}
      submitLabel="Add student"
      wide
    >
      {(e) => (
        <>
          <input type="hidden" name="academicYearId" value={academicYearId} />
          <StudentFields e={e} sectionOptions={sectionOptions} />
        </>
      )}
    </FormDialog>
  );
}

type Pending = { title: string; description: ReactNode; label: string; destructive?: boolean; run: () => Promise<ActionResult> } | null;

export function StudentsTable({ rows, sectionOptions }: { rows: EnrolledStudentRow[]; sectionOptions: Option[] }) {
  const [editing, setEditing] = useState<EnrolledStudentRow | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  const columns: ColumnDef<EnrolledStudentRow, unknown>[] = [
    {
      id: "class",
      accessorFn: (r) => `${r.className} ${r.sectionName}`,
      header: ({ column }) => <SortableHeader column={column} title="Class" />,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {row.original.className} <Badge variant="secondary">{row.original.sectionName}</Badge>
        </span>
      ),
    },
    { accessorKey: "rollNumber", header: ({ column }) => <SortableHeader column={column} title="Roll" />, cell: ({ row }) => <span className="tabular-nums">{row.original.rollNumber}</span> },
    {
      accessorKey: "fullName",
      header: ({ column }) => <SortableHeader column={column} title="Student" />,
      cell: ({ row }) => (
        <div className="min-w-40">
          <div className="font-medium">{row.original.fullName}</div>
          <div className="text-xs text-muted-foreground">{row.original.studentCode}</div>
        </div>
      ),
    },
    {
      id: "guardian",
      accessorFn: (r) => r.guardianName ?? "",
      header: "Guardian",
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.original.guardianName ?? "—"}</div>
          {row.original.guardianPhone ? <div className="text-xs text-muted-foreground">{row.original.guardianPhone}</div> : null}
        </div>
      ),
    },
    {
      accessorKey: "dateOfBirth",
      header: "Date of birth",
      enableGlobalFilter: false,
      cell: ({ row }) => (row.original.dateOfBirth ? <span className="text-sm whitespace-nowrap">{dateFormat.format(new Date(`${row.original.dateOfBirth}T00:00:00Z`))}</span> : "—"),
    },
    {
      id: "status",
      header: "Status",
      enableGlobalFilter: false,
      cell: ({ row }) =>
        row.original.enrollmentStatus === "withdrawn" ? (
          <Badge variant="outline">{row.original.studentStatus === "active" ? "Withdrawn" : row.original.studentStatus}</Badge>
        ) : (
          <span className="text-sm text-emerald-700 dark:text-emerald-400">Enrolled</span>
        ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const r = row.original;
        const enrolled = r.enrollmentStatus === "active";
        return (
          <RowActions
            label={r.fullName}
            onEdit={() => setEditing(r)}
            extra={
              enrolled ? (
                <>
                  <DropdownMenuItem
                    onSelect={() =>
                      setPending({
                        title: `Withdraw ${r.fullName}?`,
                        description: <p>They leave {r.className} {r.sectionName} for this year but stay an active student. Their marks are kept.</p>,
                        label: "Withdraw",
                        destructive: true,
                        run: () => setEnrollmentActiveAction(r.enrollmentId, false),
                      })
                    }
                  >
                    <UserMinus aria-hidden /> Withdraw from class
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() =>
                      setPending({
                        title: `Mark ${r.fullName} as transferred?`,
                        description: <p>They left the school. They are withdrawn from their class; records and marks are kept.</p>,
                        label: "Mark transferred",
                        destructive: true,
                        run: () => setStudentStatusAction(r.studentId, "transferred"),
                      })
                    }
                  >
                    <LogOut aria-hidden /> Transferred out
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() =>
                      setPending({
                        title: `Mark ${r.fullName} as graduated?`,
                        description: <p>They finished school. They are withdrawn from their class; records and marks are kept.</p>,
                        label: "Mark graduated",
                        run: () => setStudentStatusAction(r.studentId, "graduated"),
                      })
                    }
                  >
                    <GraduationCap aria-hidden /> Graduated
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  onSelect={() =>
                    setPending({
                      title: `Re-enrol ${r.fullName}?`,
                      description: <p>They return to {r.className} {r.sectionName}, roll {r.rollNumber}.</p>,
                      label: "Re-enrol",
                      run: async () => {
                        if (r.studentStatus !== "active") {
                          const reactivated = await setStudentStatusAction(r.studentId, "active");
                          if (!reactivated.ok) return reactivated;
                        }
                        return setEnrollmentActiveAction(r.enrollmentId, true);
                      },
                    })
                  }
                >
                  <Undo2 aria-hidden /> Re-enrol
                </DropdownMenuItem>
              )
            }
          />
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        pageSize={50}
        searchText={(r) => `${r.fullName} ${r.studentCode} ${r.guardianName ?? ""} ${r.guardianPhone ?? ""} ${r.className} ${r.sectionName}`}
        searchPlaceholder="Search name, ID or guardian"
        emptyMessage="No students match these filters. Add students one by one or import them from Excel."
      />
      <FormDialog
        key={editing?.enrollmentId ?? "none"}
        title={editing ? `Edit ${editing.fullName}` : ""}
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        action={updateStudentAction}
        submitLabel="Save changes"
        wide
      >
        {(e) =>
          editing ? (
            <>
              <input type="hidden" name="studentId" value={editing.studentId} />
              <input type="hidden" name="enrollmentId" value={editing.enrollmentId} />
              <StudentFields e={e} row={editing} sectionOptions={sectionOptions} />
              <p className="text-xs text-muted-foreground">Moving to another section or changing the roll number is refused once marks have been entered.</p>
            </>
          ) : null
        }
      </FormDialog>
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending?.title ?? ""}
        description={pending?.description}
        confirmLabel={pending?.label ?? "Confirm"}
        destructive={pending?.destructive}
        onConfirm={async () => {
          if (!pending) return true;
          const result = await pending.run();
          if (result.ok) toast.success(result.message ?? "Done.");
          else toast.error(result.message);
          return result.ok;
        }}
      />
    </>
  );
}
