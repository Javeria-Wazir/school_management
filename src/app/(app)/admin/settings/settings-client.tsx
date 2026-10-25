"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { ActionForm, Field, fieldProps, FormMessage, SubmitButton, useActionFeedback } from "@/components/app/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { idleState } from "@/lib/action-result";
import type { SchoolSettings } from "@/server/services/settings";
import { removeLogoAction, saveSettingsAction, uploadLogoAction } from "./actions";

function Toggle({ id, label, description, defaultChecked }: { id: string; label: string; description: string; defaultChecked: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p id={`${id}-description`} className="text-xs text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch id={id} name={id} defaultChecked={defaultChecked} aria-describedby={`${id}-description`} />
    </div>
  );
}

export function SettingsForm({ settings }: { settings: SchoolSettings }) {
  const [state, action] = useActionState(saveSettingsAction, idleState);
  useActionFeedback(state);
  const e = state.ok ? undefined : state.fieldErrors;
  return (
    <ActionForm action={action} className="space-y-6" noValidate>
      <FormMessage state={state} />
      <Card>
        <CardHeader>
          <CardTitle>School information</CardTitle>
          <CardDescription>Printed on report cards and result sheets.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field id="schoolName" label="School name" error={e?.schoolName} className="md:col-span-2">
            <Input {...fieldProps("schoolName", e?.schoolName)} defaultValue={settings.schoolName} required maxLength={150} />
          </Field>
          <Field id="address" label="Address" error={e?.address} className="md:col-span-2">
            <Textarea {...fieldProps("address", e?.address)} defaultValue={settings.address} maxLength={300} rows={2} />
          </Field>
          <Field id="phone" label="Phone" error={e?.phone} hint="International format, e.g. +924211234567">
            <Input {...fieldProps("phone", e?.phone)} defaultValue={settings.phone ?? ""} type="tel" />
          </Field>
          <Field id="email" label="E-mail" error={e?.email}>
            <Input {...fieldProps("email", e?.email)} defaultValue={settings.email ?? ""} type="email" />
          </Field>
          <Field id="defaultCountryCode" label="Country calling code" error={e?.defaultCountryCode} hint="Used for WhatsApp links, e.g. 92 for Pakistan">
            <Input {...fieldProps("defaultCountryCode", e?.defaultCountryCode)} defaultValue={settings.defaultCountryCode} inputMode="numeric" maxLength={5} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report cards</CardTitle>
          <CardDescription>What appears on each student&apos;s printed result card.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field id="reportCardTitle" label="Report card title" error={e?.reportCardTitle}>
            <Input {...fieldProps("reportCardTitle", e?.reportCardTitle)} defaultValue={settings.reportCardTitle} maxLength={80} />
          </Field>
          <Field id="reportCardFooter" label="Footer note (optional)" error={e?.reportCardFooter}>
            <Input {...fieldProps("reportCardFooter", e?.reportCardFooter)} defaultValue={settings.reportCardFooter} maxLength={300} />
          </Field>
          <Toggle id="showSubjectGrades" label="Show subject grades" description="A grade next to each subject's marks." defaultChecked={settings.showSubjectGrades} />
          <Toggle id="showSubjectStatus" label="Show subject pass/fail" description="Pass or Fail next to each subject." defaultChecked={settings.showSubjectStatus} />
          <Toggle id="showClassPosition" label="Show class position" description="Rank in the section (complete results only)." defaultChecked={settings.showClassPosition} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marks and approval</CardTitle>
          <CardDescription>Applies to all classes.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Toggle id="allowDecimalMarks" label="Allow decimal marks" description="For example 12.5. When off, only whole marks are accepted." defaultChecked={settings.allowDecimalMarks} />
          <Field id="decimalPlaces" label="Decimal places in percentages" error={e?.decimalPlaces} hint="Percentages are rounded half-up to this many places before grading.">
            <Select name="decimalPlaces" defaultValue={String(settings.decimalPlaces)}>
              <SelectTrigger id="decimalPlaces" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0 (e.g. 67%)</SelectItem>
                <SelectItem value="1">1 (e.g. 66.7%)</SelectItem>
                <SelectItem value="2">2 (e.g. 66.67%)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Toggle
            id="requirePrincipalApproval"
            label="Principal approves results"
            description="When on, results are published only after the principal's final approval. When off, the class teacher's approval publishes them."
            defaultChecked={settings.requirePrincipalApproval}
          />
        </CardContent>
        <CardFooter className="justify-end">
          <SubmitButton>Save settings</SubmitButton>
        </CardFooter>
      </Card>
    </ActionForm>
  );
}

export function LogoForm({ hasLogo }: { hasLogo: boolean }) {
  const [state, action] = useActionState(uploadLogoAction, idleState);
  const [confirming, setConfirming] = useState(false);
  // Changes after each upload so the preview reloads.
  const [version, setVersion] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  useActionFeedback(
    state,
    () => {
      setVersion((v) => v + 1);
      formRef.current?.reset();
    },
    { toastErrors: true },
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>School logo</CardTitle>
        <CardDescription>PNG or JPEG, up to 500 KB. Shown at the top of report cards.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element -- private, session-protected image
            <img src={`/api/school-logo?v=${version}`} alt="Current school logo" className="max-h-full max-w-full object-contain" />
          ) : (
            <ImageUp className="size-8 text-muted-foreground" aria-label="No logo" />
          )}
        </div>
        <ActionForm ref={formRef} action={action} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="logo">Choose image</Label>
            <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg" required />
          </div>
          <SubmitButton variant="outline" pendingText="Uploading…">
            Upload
          </SubmitButton>
          {hasLogo ? (
            <Button type="button" variant="ghost" onClick={() => setConfirming(true)}>
              <Trash2 aria-hidden /> Remove
            </Button>
          ) : null}
        </ActionForm>
      </CardContent>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Remove the logo?"
        description={<p>Report cards will be printed without a logo until you upload a new one.</p>}
        confirmLabel="Remove logo"
        destructive
        onConfirm={async () => {
          const result = await removeLogoAction();
          if (result.ok) toast.success(result.message);
          else toast.error(result.message);
          return result.ok;
        }}
      />
    </Card>
  );
}
