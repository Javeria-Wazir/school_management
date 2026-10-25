import { BookOpen, CalendarRange } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/app/page";
import { UrlSelect } from "@/components/app/url-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/server/auth/current";
import { resolveAcademicYear } from "@/server/services/academic-years";
import { listClasses } from "@/server/services/classes";
import { listClassSubjects, listSubjects } from "@/server/services/subjects";
import { AddClassSubjectsDialog, ClassSubjectsTable, CopyFromYearButton, SubjectDialog, SubjectsTable } from "./subjects-client";

export const metadata = { title: "Subjects" };

export default async function SubjectsPage({ searchParams }: PageProps<"/admin/subjects">) {
  const ctx = await requireAdmin();
  const params = await searchParams;
  const { years, selected } = await resolveAcademicYear(ctx.db, params.year);
  const [subjectRows, classRows, yearClassSubjects] = await Promise.all([
    listSubjects(ctx.db, selected?.id ?? null),
    listClasses(ctx.db, selected?.id ?? null),
    selected ? listClassSubjects(ctx.db, selected.id) : Promise.resolve([]),
  ]);
  const activeClasses = classRows.filter((c) => c.isActive);
  const classId = typeof params.class === "string" && activeClasses.some((c) => c.id === params.class) ? params.class : activeClasses[0]?.id;
  const classSubjectRows = yearClassSubjects.filter((cs) => cs.classId === classId);
  const added = new Set(classSubjectRows.map((cs) => cs.subjectId));
  const available = subjectRows.filter((s) => s.isActive && !added.has(s.id)).map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }));
  const previousYear = selected ? years.find((y) => y.startDate < selected.startDate) : undefined;

  return (
    <>
      <PageHeader title="Subjects" description="The school's subjects, and which of them each class studies in an academic year." />
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>All subjects</CardTitle>
            <CardDescription>The code appears on result sheets and in Excel files.</CardDescription>
          </div>
          <SubjectDialog />
        </CardHeader>
        <CardContent>
          <SubjectsTable subjects={subjectRows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Subjects by class</CardTitle>
            <CardDescription>Compulsory subjects must be passed for an overall pass. Only subjects that count in the total make up the percentage.</CardDescription>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {years.length ? (
              <UrlSelect param="year" label="Academic year" value={selected?.id} options={years.map((y) => ({ value: y.id, label: y.isCurrent ? `${y.name} (current)` : y.name }))} />
            ) : null}
            {activeClasses.length ? <UrlSelect param="class" label="Class" value={classId} options={activeClasses.map((c) => ({ value: c.id, label: c.name }))} /> : null}
            {selected && classId ? <AddClassSubjectsDialog academicYearId={selected.id} classId={classId} options={available} /> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!selected ? (
            <EmptyState icon={CalendarRange} title="No academic year yet">
              <Link className="text-primary underline-offset-4 hover:underline" href="/admin/academic-years">
                Create an academic year
              </Link>{" "}
              first.
            </EmptyState>
          ) : !classId ? (
            <EmptyState icon={BookOpen} title="No classes yet">
              <Link className="text-primary underline-offset-4 hover:underline" href="/admin/classes">
                Add classes
              </Link>{" "}
              first.
            </EmptyState>
          ) : (
            <>
              {yearClassSubjects.length === 0 && previousYear ? <CopyFromYearButton fromYear={previousYear} toYearId={selected.id} toYearName={selected.name} /> : null}
              <ClassSubjectsTable rows={classSubjectRows} />
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
