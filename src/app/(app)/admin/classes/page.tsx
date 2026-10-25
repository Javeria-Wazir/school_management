import { CalendarRange } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/app/page";
import { UrlSelect } from "@/components/app/url-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/server/auth/current";
import { resolveAcademicYear } from "@/server/services/academic-years";
import { listActiveStaff, listClasses, listSections } from "@/server/services/classes";
import { ClassDialog, ClassesTable, SectionDialog, SectionsTable } from "./classes-client";

export const metadata = { title: "Classes & sections" };

export default async function ClassesPage({ searchParams }: PageProps<"/admin/classes">) {
  const ctx = await requireAdmin();
  const { year } = await searchParams;
  const { years, selected } = await resolveAcademicYear(ctx.db, year);
  const [classRows, sectionRows, staff] = await Promise.all([
    listClasses(ctx.db, selected?.id ?? null),
    selected ? listSections(ctx.db, selected.id) : Promise.resolve([]),
    listActiveStaff(ctx.db),
  ]);
  const classOptions = classRows.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }));
  const staffOptions = staff.map((s) => ({ value: s.id, label: s.fullName }));

  return (
    <>
      <PageHeader
        title="Classes & sections"
        description="Classes stay the same every year. Sections (A, B…) and their class teachers are set per academic year."
      />
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Classes</CardTitle>
            <CardDescription>Sort order decides the order on result sheets (e.g. 6 for Class 6).</CardDescription>
          </div>
          <ClassDialog />
        </CardHeader>
        <CardContent>
          <ClassesTable classes={classRows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Sections</CardTitle>
            <CardDescription>The class teacher reviews and approves the section&apos;s results.</CardDescription>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {years.length > 0 ? (
              <UrlSelect param="year" label="Academic year" value={selected?.id} options={years.map((y) => ({ value: y.id, label: y.isCurrent ? `${y.name} (current)` : y.name }))} />
            ) : null}
            {selected ? <SectionDialog academicYearId={selected.id} classOptions={classOptions} staffOptions={staffOptions} /> : null}
          </div>
        </CardHeader>
        <CardContent>
          {!selected ? (
            <EmptyState icon={CalendarRange} title="No academic year yet">
              <Link className="text-primary underline-offset-4 hover:underline" href="/admin/academic-years">
                Create an academic year
              </Link>{" "}
              before adding sections.
            </EmptyState>
          ) : (
            <SectionsTable sections={sectionRows} staffOptions={staffOptions} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
