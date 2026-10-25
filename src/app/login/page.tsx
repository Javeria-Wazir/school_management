import { GraduationCap } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/current";
import { getDb } from "@/server/db/client";
import { getSchoolSettings } from "@/server/services/settings";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { next } = await searchParams;
  const settings = await getSchoolSettings(getDb());

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-6" aria-hidden />
          </div>
          <CardTitle className="text-xl">{settings.schoolName}</CardTitle>
          <CardDescription>Sign in to the result management system</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm next={typeof next === "string" ? next : undefined} />
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Accounts are created by the principal. Forgot your password? Ask the principal to reset it.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
