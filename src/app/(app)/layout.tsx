import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app/app-sidebar";
import { navigationFor } from "@/components/app/nav";
import { UserMenu } from "@/components/app/user-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DEV_AUTO_LOGIN_SESSION_ID } from "@/server/auth/config";
import { requireUser } from "@/server/auth/current";
import { getCapabilities, roleLabel } from "@/server/services/capabilities";
import { getSchoolSettings } from "@/server/services/settings";

/**
 * Authenticated shell. The layout only loads what the shell displays; every page still checks access
 * itself (layouts do not re-run on client navigation).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { db, user } = await requireUser({ allowPasswordChangePending: true });
  const [settings, caps, cookieStore] = await Promise.all([getSchoolSettings(db), getCapabilities(db, user), cookies()]);
  const label = roleLabel(caps);
  const devAutoLogin = user.sessionId === DEV_AUTO_LOGIN_SESSION_ID;

  return (
    <SidebarProvider defaultOpen={cookieStore.get("sidebar_state")?.value !== "false"}>
      <AppSidebar groups={navigationFor({ isAdmin: caps.isAdmin, isClassTeacher: caps.classTeacherSectionIds.length > 0 })} schoolName={settings.schoolName} roleLabel={label} />
      <SidebarInset className="min-w-0">
        <header className="no-print sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-4">
          <SidebarTrigger aria-label="Toggle navigation" />
          <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5" />
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground sm:inline">Academic year</span>
            <Badge variant={settings.currentAcademicYearName ? "secondary" : "outline"}>{settings.currentAcademicYearName ?? "Not set"}</Badge>
            {settings.currentExamTermName ? (
              <Badge variant="outline" className="hidden sm:inline-flex">
                {settings.currentExamTermName}
              </Badge>
            ) : null}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {devAutoLogin ? (
              <Badge variant="outline" className="border-amber-500/60 text-amber-700 dark:text-amber-400" title="DEV_AUTO_LOGIN is set in .env.local">
                Dev mode · automatic sign-in
              </Badge>
            ) : null}
            <UserMenu fullName={user.fullName} email={user.email} roleLabel={label} canSignOut={!devAutoLogin} />
          </div>
        </header>
        <div className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
