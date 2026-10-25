import { CalendarRange, FileUp } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/app/page";
import { UrlSelect } from "@/components/app/url-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/server/auth/current";
import { resolveAcademicYear } from "@/server/services/academic-years";
import { listSections } from "@/server/services/classes";
import { listEnrolledStudents } from "@/server/services/students";
import { AddStudentDialog, StudentsTable } from "./students-client";

export const metadata = { title: "Students" };

export default async function StudentsPage({ searchParams }: PageProps<"/admin/students">) {
  const ctx = await requireAdmin();
  const params = await searchParams;
  const { years, selected } = await resolveAcademicYear(ctx.db, params.year);
  if (!selected) {
    return (
      <>
        <PageHeader title="Students" />
        <EmptyState icon={CalendarRange} title="No academic year yet">
          <Link className="text-primary underline-offset-4 hover:underline" href="/admin/academic-years">
            Create an academic year
          </Link>{" "}
          and its sections before adding students.
        </EmptyState>
      </>
    );
  }
  const sectionRows = await listSections(ctx.db, selected.id);
  const classOptions = [...new Map(sectionRows.map((s) => [s.classId, { value: s.classId, label: s.className }])).values()];
  const classId = typeof params.class === "string" && classOptions.some((c) => c.value === params.class) ? params.class : undefined;
  const sectionsOfClass = sectionRows.filter((s) => !classId || s.classId === classId);
  const sectionId = typeof params.section === "string" && sectionsOfClass.some((s) => s.id === params.section) ? params.section : undefined;
  const showWithdrawn = params.withdrawn === "1";
  const rows = await listEnrolledStudents(ctx.db, selected.id, { classId, sectionId, includeWithdrawn: showWithdrawn });
  const sectionOptions = sectionRows.filter((s) => s.isActive).map((s) => ({ value: s.id, label: `${s.className} ${s.name}` }));

  return (
    <>
      <PageHeader
        title="Students"
        description={`Students enrolled in ${selected.name}. Each student keeps one permanent record; enrolments link them to a class each year.`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/admin/students/import?year=${selected.id}`}>
                <FileUp aria-hidden /> Import from Excel/CSV
              </Link>
            </Button>
            {sectionOptions.length ? <AddStudentDialog academicYearId={selected.id} sectionOptions={sectionOptions} /> : null}
          </>
        }
      />
      <div className="flex flex-wrap items-end gap-3">
        <UrlSelect param="year" label="Academic year" value={selected.id} options={years.map((y) => ({ value: y.id, label: y.isCurrent ? `${y.name} (current)` : y.name }))} resets={["class", "section"]} />
        <UrlSelect param="class" label="Class" value={classId} options={classOptions} allLabel="All classes" resets={["section"]} />
        <UrlSelect param="section" label="Section" value={sectionId} options={sectionsOfClass.map((s) => ({ value: s.id, label: `${s.className} ${s.name}` }))} allLabel="All sections" />
        <UrlSelect param="withdrawn" label="Show" value={showWithdrawn ? "1" : undefined} options={[{ value: "1", label: "Including withdrawn" }]} allLabel="Enrolled only" />
      </div>
      <Card>
        <CardContent>
          {sectionRows.length === 0 ? (
            <EmptyState icon={CalendarRange} title="No sections in this academic year">
              <Link className="text-primary underline-offset-4 hover:underline" href={`/admin/classes?year=${selected.id}`}>
                Add sections
              </Link>{" "}
              first, then add or import students.
            </EmptyState>
          ) : (
            <StudentsTable rows={rows} sectionOptions={sectionOptions} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
