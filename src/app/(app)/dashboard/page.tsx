import { BookOpen, CalendarRange, CheckCircle2, Circle, ClipboardList, School, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageHeader, StatCard } from "@/components/app/page";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/server/auth/current";
import { getCapabilities } from "@/server/services/capabilities";
import { getAdminOverview, getTeacherOverview, type AdminOverview } from "@/server/services/dashboard";
import type { ServiceContext } from "@/server/services/guards";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await requireUser();
  const caps = await getCapabilities(ctx.db, ctx.user);
  const firstName = ctx.user.fullName.split(" ")[0];
  return (
    <>
      <PageHeader title={`Welcome, ${firstName}`} description="Here is what needs your attention." />
      {caps.isAdmin ? <AdminDashboard ctx={ctx} /> : <TeacherDashboard ctx={ctx} />}
    </>
  );
}

async function AdminDashboard({ ctx }: { ctx: ServiceContext }) {
  const o = await getAdminOverview(ctx);
  const steps = setupSteps(o);
  const done = steps.filter((s) => s.done).length;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active teachers" value={o.staff.teachers} icon={Users} hint={`${o.staff.admins} administrator${o.staff.admins === 1 ? "" : "s"} · ${o.staff.inactive} inactive`} />
        <StatCard
          label="Not signed in yet"
          value={o.staff.awaitingFirstSignIn}
          icon={UserCheck}
          hint={o.staff.awaitingFirstSignIn ? "Share their temporary passwords" : "Everyone has signed in"}
        />
        <StatCard label="Current academic year" value={o.currentYear?.name ?? "Not set"} icon={CalendarRange} hint={`${o.counts.examTerms} exam term${o.counts.examTerms === 1 ? "" : "s"}`} />
        <StatCard label="Students enrolled" value={o.counts.students} icon={School} hint={o.currentYear ? `in ${o.counts.sections} section${o.counts.sections === 1 ? "" : "s"}` : "Set an academic year first"} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>School setup</CardTitle>
          <CardDescription>
            {done} of {steps.length} steps complete. Results can be entered once every step is done.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={(done / steps.length) * 100} aria-label={`Setup ${done} of ${steps.length} complete`} />
          <ul className="grid gap-2 sm:grid-cols-2">
            {steps.map((step) => (
              <li key={step.label} className="flex items-start gap-2 text-sm">
                {step.done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="Done" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label="Not done" />}
                <span>
                  {step.href && !step.done ? (
                    <Link href={step.href} className="font-medium text-primary underline-offset-4 hover:underline">
                      {step.label}
                    </Link>
                  ) : (
                    <span className={step.done ? "text-muted-foreground" : "font-medium"}>{step.label}</span>
                  )}
                  {step.detail ? <span className="block text-xs text-muted-foreground">{step.detail}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

function setupSteps(o: AdminOverview) {
  const n = o.counts;
  return [
    { label: "Enter the school's name and details", done: o.schoolNameSet, href: "/admin/settings" },
    { label: "Create the academic year and make it current", done: o.currentYear !== null, href: "/admin/academic-years" },
    { label: "Add teacher accounts", done: o.staff.teachers > 0, href: "/admin/staff", detail: `${o.staff.teachers} active` },
    { label: "Set up classes and subjects", done: n.classes > 0 && n.subjects > 0, detail: `${n.classes} classes · ${n.subjects} subjects` },
    { label: "Create sections and assign class teachers", done: n.sections > 0 && n.classTeachers === n.sections, detail: `${n.classTeachers} of ${n.sections} sections have a class teacher` },
    { label: "Enrol students", done: n.students > 0, detail: `${n.students} enrolled` },
    { label: "Assign subject teachers", done: n.assignments > 0, detail: `${n.assignments} assignments` },
    { label: "Create exam terms", done: n.examTerms > 0, detail: `${n.examTerms} terms` },
  ];
}

async function TeacherDashboard({ ctx }: { ctx: ServiceContext }) {
  const o = await getTeacherOverview(ctx);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="My subject assignments" value={o.assignments.length} icon={BookOpen} hint="In the current academic year" />
        <StatCard
          label="Class teacher of"
          value={o.classTeacherOf.length ? o.classTeacherOf.map((c) => `${c.className} ${c.sectionName}`).join(", ") : "—"}
          icon={ClipboardList}
          hint={o.classTeacherOf.length ? "You review and approve these classes' results" : "You are not a class teacher this year"}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>My subjects</CardTitle>
          <CardDescription>You can enter marks only for these class sections and subjects.</CardDescription>
        </CardHeader>
        <CardContent>
          {o.assignments.length === 0 ? (
            <EmptyState icon={BookOpen} title="No subjects assigned yet">
              The principal assigns subjects to teachers. Once you have an assignment it will appear here.
            </EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Subject</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {o.assignments.map((a) => (
                    <TableRow key={`${a.className}-${a.sectionName}-${a.subjectName}`}>
                      <TableCell>{a.className}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{a.sectionName}</Badge>
                      </TableCell>
                      <TableCell>{a.subjectName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
