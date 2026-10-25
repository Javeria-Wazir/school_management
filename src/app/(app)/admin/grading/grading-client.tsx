"use client";

import { Lock, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Field, fieldProps } from "@/components/app/form";
import { FormDialog } from "@/components/app/form-dialog";
import { RowActions, SwitchField } from "@/components/app/row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/domain/calculations";
import type { GradingScaleView } from "@/server/services/grading";
import { deleteGradingScaleAction, saveGradingScaleAction, setDefaultGradingScaleAction } from "./actions";

type Band = { key: number; grade: string; minPercentage: string; remark: string };

const STARTER: Omit<Band, "key">[] = [
  { grade: "A+", minPercentage: "90", remark: "Outstanding" },
  { grade: "A", minPercentage: "80", remark: "Excellent" },
  { grade: "B", minPercentage: "70", remark: "Very Good" },
  { grade: "C", minPercentage: "60", remark: "Good" },
  { grade: "D", minPercentage: "50", remark: "Satisfactory" },
  { grade: "E", minPercentage: "33", remark: "Pass" },
  { grade: "F", minPercentage: "0", remark: "Fail" },
];

/** Grade bands editor; the rows are sent to the server as JSON in a hidden field. */
function BandsEditor({ initial, error }: { initial: Omit<Band, "key">[]; error?: string[] }) {
  const [bands, setBands] = useState<Band[]>(() => initial.map((b, i) => ({ ...b, key: i })));
  const update = (key: number, patch: Partial<Band>) => setBands((all) => all.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">Grades (highest first)</legend>
      <input type="hidden" name="bands" value={JSON.stringify(bands.map((b) => ({ grade: b.grade, minPercentage: b.minPercentage, remark: b.remark })))} />
      <div className="grid grid-cols-[4rem_6rem_1fr_2rem] gap-2 text-xs text-muted-foreground">
        <span>Grade</span>
        <span>From %</span>
        <span>Remark</span>
        <span />
      </div>
      {bands.map((b, index) => (
        <div key={b.key} className="grid grid-cols-[4rem_6rem_1fr_2rem] gap-2">
          <Input aria-label={`Grade ${index + 1}`} value={b.grade} maxLength={5} onChange={(e) => update(b.key, { grade: e.target.value })} />
          <Input aria-label={`Minimum percentage for grade ${index + 1}`} inputMode="decimal" value={b.minPercentage} onChange={(e) => update(b.key, { minPercentage: e.target.value })} />
          <Input aria-label={`Remark for grade ${index + 1}`} value={b.remark} maxLength={60} onChange={(e) => update(b.key, { remark: e.target.value })} />
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove grade ${index + 1}`} disabled={bands.length === 1} onClick={() => setBands((all) => all.filter((x) => x.key !== b.key))}>
            <Trash2 aria-hidden />
          </Button>
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="sm" disabled={bands.length >= 20} onClick={() => setBands((all) => [...all, { key: Math.max(-1, ...all.map((x) => x.key)) + 1, grade: "", minPercentage: "", remark: "" }])}>
          <Plus aria-hidden /> Add grade
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">One grade must start at 0% so every percentage gets a grade. Grades and starting percentages must be unique.</p>
      {error?.length ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error[0]}
        </p>
      ) : null}
    </fieldset>
  );
}

export function GradingScaleDialog({ scale, open, onOpenChange }: { scale?: GradingScaleView; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  return (
    <FormDialog
      title={scale ? `Edit ${scale.name}` : "New grading scale"}
      description={scale ? "Changes apply to every term that uses this scale and is not yet approved." : "Starts from the standard bands; adjust as needed."}
      trigger={scale ? undefined : <Button><Plus aria-hidden /> New scale</Button>}
      open={open}
      onOpenChange={onOpenChange}
      action={saveGradingScaleAction}
      submitLabel={scale ? "Save scale" : "Create scale"}
      wide
    >
      {(e) => (
        <>
          {scale ? <input type="hidden" name="id" value={scale.id} /> : null}
          <Field id="name" label="Name" error={e?.name}>
            <Input {...fieldProps("name", e?.name)} defaultValue={scale?.name} required maxLength={60} autoComplete="off" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="subjectPassPercentage" label="Subject pass mark (%)" error={e?.subjectPassPercentage}>
              <Input {...fieldProps("subjectPassPercentage", e?.subjectPassPercentage)} inputMode="decimal" defaultValue={scale ? formatNumber(scale.subjectPassPercentage) : "33"} required />
            </Field>
            <Field id="overallPassPercentage" label="Overall pass mark (%)" error={e?.overallPassPercentage}>
              <Input {...fieldProps("overallPassPercentage", e?.overallPassPercentage)} inputMode="decimal" defaultValue={scale ? formatNumber(scale.overallPassPercentage) : "33"} required />
            </Field>
          </div>
          <SwitchField
            id="requireAllCompulsoryPass"
            label="Must pass every compulsory subject"
            description="When on, failing any compulsory subject means failing overall, whatever the total."
            defaultChecked={scale?.requireAllCompulsoryPass ?? true}
          />
          <BandsEditor initial={scale ? scale.bands.map((b) => ({ ...b, minPercentage: formatNumber(b.minPercentage) })) : STARTER} error={e?.bands} />
        </>
      )}
    </FormDialog>
  );
}

export function ScaleCard({ scale }: { scale: GradingScaleView }) {
  const [editing, setEditing] = useState(false);
  const [makingDefault, setMakingDefault] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {scale.name}
          {scale.isDefault ? <Badge>Default</Badge> : null}
          {scale.locked ? (
            <Badge variant="outline" title="Used by an approved result">
              <Lock aria-hidden /> Locked
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription>
          Pass: {formatNumber(scale.subjectPassPercentage)}% per subject, {formatNumber(scale.overallPassPercentage)}% overall
          {scale.requireAllCompulsoryPass ? ", every compulsory subject must be passed" : ""}. Named by {scale.termCount} term{scale.termCount === 1 ? "" : "s"}.
        </CardDescription>
        <CardAction>
          <RowActions
            label={scale.name}
            onEdit={scale.locked ? undefined : () => setEditing(true)}
            onDelete={scale.isDefault ? undefined : () => deleteGradingScaleAction(scale.id)}
            deleteDescription={<p>Scales used by exam terms cannot be deleted. Choose another scale for those terms first.</p>}
            extra={
              scale.isDefault ? null : (
                <DropdownMenuItem onSelect={() => setMakingDefault(true)}>
                  <Star aria-hidden /> Make default
                </DropdownMenuItem>
              )
            }
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grade</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Remark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scale.bands.map((b, i) => (
                <TableRow key={b.grade}>
                  <TableCell className="font-semibold">{b.grade}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatNumber(b.minPercentage)}%{i === 0 ? " and above" : ` – below ${formatNumber(scale.bands[i - 1].minPercentage)}%`}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{b.remark || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <GradingScaleDialog scale={scale} open={editing} onOpenChange={setEditing} />
      <ConfirmDialog
        open={makingDefault}
        onOpenChange={setMakingDefault}
        title={`Make ${scale.name} the default?`}
        description={<p>Every term without its own scale will use it. Refused while the current default is used by approved results.</p>}
        confirmLabel="Make default"
        onConfirm={async () => {
          const result = await setDefaultGradingScaleAction(scale.id);
          if (result.ok) toast.success(result.message);
          else toast.error(result.message);
          return result.ok;
        }}
      />
    </Card>
  );
}
