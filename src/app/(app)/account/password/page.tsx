import { KeyRound } from "lucide-react";
import { PageHeader } from "@/components/app/page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/server/auth/current";
import { PasswordForm } from "./password-form";

export const metadata = { title: "Change password" };

export default async function ChangePasswordPage() {
  const { user } = await requireUser({ allowPasswordChangePending: true });
  return (
    <>
      <PageHeader title="Change password" description="Choose a password only you know. Other devices will be signed out." />
      {user.mustChangePassword ? (
        <Alert>
          <KeyRound aria-hidden />
          <AlertTitle>Please set your own password</AlertTitle>
          <AlertDescription>You signed in with a temporary password. Choose a new one to continue.</AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </>
  );
}
