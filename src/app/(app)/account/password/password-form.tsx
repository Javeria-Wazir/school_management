"use client";

import { useActionState, useRef } from "react";
import { ActionForm, Field, fieldProps, FormMessage, SubmitButton, useActionFeedback } from "@/components/app/form";
import { Input } from "@/components/ui/input";
import { idleState } from "@/lib/action-result";
import { changePasswordAction } from "./actions";

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  useActionFeedback(state, () => formRef.current?.reset());
  const errors = state.ok ? undefined : state.fieldErrors;
  return (
    <ActionForm ref={formRef} action={action} className="grid max-w-md gap-4" noValidate>
      <FormMessage state={state} />
      <Field id="currentPassword" label="Current password" error={errors?.currentPassword}>
        <Input {...fieldProps("currentPassword", errors?.currentPassword)} type="password" autoComplete="current-password" required />
      </Field>
      <Field id="newPassword" label="New password" error={errors?.newPassword} hint="At least 8 characters, with a letter and a digit.">
        <Input {...fieldProps("newPassword", errors?.newPassword)} type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field id="confirmPassword" label="Repeat new password" error={errors?.confirmPassword}>
        <Input {...fieldProps("confirmPassword", errors?.confirmPassword)} type="password" autoComplete="new-password" required />
      </Field>
      <div>
        <SubmitButton>Change password</SubmitButton>
      </div>
    </ActionForm>
  );
}
