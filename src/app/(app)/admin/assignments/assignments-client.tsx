"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AssignmentCell } from "@/server/services/assignments";
import { setAssignmentAction } from "./actions";

const NONE = "__none__";

function TeacherPicker({ cell, staff }: { cell: AssignmentCell; staff: { value: string; label: string }[] }) {
  const [value, setValue] = useState(cell.teacherId ?? NONE);
  const [pending, startTransition] = useTransition();
  const id = `teacher-${cell.sectionId}-${cell.classSubjectId}`;
  // An inactive teacher still assigned must stay visible so the principal can replace them.
  const options = cell.teacherId && !staff.some((s) => s.value === cell.teacherId) ? [...staff, { value: cell.teacherId, label: `${cell.teacherName} (inactive)` }] : staff;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-3 py-2">
      <label htmlFor={id} className="text-sm font-medium">
        {cell.subjectName} <span className="text-xs text-muted-foreground">{cell.subjectCode}</span>
      </label>
      <div className="flex items-center gap-2">
        <Select
          value={value}
          disabled={pending}
          onValueChange={(next) => {
            const previous = value;
            setValue(next);
            startTransition(async () => {
              const result = await setAssignmentAction(cell.sectionId, cell.classSubjectId, next === NONE ? "" : next);
              if (result.ok) toast.success(`${cell.className} ${cell.sectionName} · ${cell.subjectName}: ${result.message}`);
              else {
                setValue(previous);
                toast.error(result.message);
              }
            });
          }}
        >
          <SelectTrigger id={id} className="w-full" aria-busy={pending}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— Not assigned —</SelectItem>
            {options.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Saving" /> : null}
      </div>
    </div>
  );
}

export function SectionAssignments({ cells, staff }: { cells: AssignmentCell[]; staff: { value: string; label: string }[] }) {
  const missing = cells.filter((c) => !c.teacherId).length;
  return (
    <Card className="gap-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          {cells[0].className} <Badge variant="secondary">{cells[0].sectionName}</Badge>
        </CardTitle>
        {missing ? (
          <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">
            {missing} unassigned
          </Badge>
        ) : (
          <Badge variant="outline" className="border-emerald-500/50 text-emerald-700 dark:text-emerald-400">
            Complete
          </Badge>
        )}
      </CardHeader>
      <CardContent className="divide-y">
        {cells.map((cell) => (
          <TeacherPicker key={cell.classSubjectId} cell={cell} staff={staff} />
        ))}
      </CardContent>
    </Card>
  );
}
