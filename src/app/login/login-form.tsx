"use client";

import { useActionState } from "react";
import { ActionForm, Field, fieldProps, FormMessage, SubmitButton } from "@/components/app/form";
import { Input } from "@/components/ui/input";
import { idleState } from "@/lib/action-result";
import { signInAction } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInAction, idleState);
  const errors = state.ok ? undefined : state.fieldErrors;
  return (
    <ActionForm action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field id="email" label="E-mail" error={errors?.email}>
        <Input {...fieldProps("email", errors?.email)} type="email" autoComplete="username" required autoFocus />
      </Field>
      <Field id="password" label="Password" error={errors?.password}>
        <Input {...fieldProps("password", errors?.password)} type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton className="w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </ActionForm>
  );
}
