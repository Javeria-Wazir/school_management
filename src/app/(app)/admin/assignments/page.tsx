import { CalendarRange, Users } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageHeader, StatCard } from "@/components/app/page";
import { UrlSelect } from "@/components/app/url-select";
import { requireAdmin } from "@/server/auth/current";
import { resolveAcademicYear } from "@/server/services/academic-years";
import { listAssignmentGrid } from "@/server/services/assignments";
import { listActiveStaff } from "@/server/services/classes";
import { SectionAssignments } from "./assignments-client";

export const metadata = { title: "Teacher assignments" };

export default async function AssignmentsPage({ searchParams }: PageProps<"/admin/assignments">) {
  const ctx = await requireAdmin();
  const params = await searchParams;
  const { years, selected } = await resolveAcademicYear(ctx.db, params.year);
  if (!selected) {
    return (
      <>
        <PageHeader title="Teacher assignments" />
        <EmptyState icon={CalendarRange} title="No academic year yet">
          <Link className="text-primary underline-offset-4 hover:underline" href="/admin/academic-years">
            Create an academic year
          </Link>{" "}
          first.
        </EmptyState>
      </>
    );
  }
  const [grid, staff] = await Promise.all([listAssignmentGrid(ctx.db, selected.id), listActiveStaff(ctx.db)]);
  const classOptions = [...new Map(grid.map((c) => [c.classId, { value: c.classId, label: c.className }])).values()];
  const classId = typeof params.class === "string" && classOptions.some((c) => c.value === params.class) ? params.class : undefined;
  const shown = grid.filter((c) => !classId || c.classId === classId);
  const bySection = new Map<string, typeof shown>();
  for (const cell of shown) bySection.set(cell.sectionId, [...(bySection.get(cell.sectionId) ?? []), cell]);
  const unassigned = grid.filter((c) => !c.teacherId).length;

  return (
    <>
      <PageHeader
        title="Teacher assignments"
        description="Choose the subject teacher for every subject of every section. Only that teacher can enter and submit its marks."
      />
      <div className="flex flex-wrap items-end gap-3">
        <UrlSelect param="year" label="Academic year" value={selected.id} options={years.map((y) => ({ value: y.id, label: y.isCurrent ? `${y.name} (current)` : y.name }))} resets={["class"]} />
        {classOptions.length ? <UrlSelect param="class" label="Class" value={classId} options={classOptions} allLabel="All classes" /> : null}
      </div>
      {grid.length === 0 ? (
        <EmptyState icon={Users} title="Nothing to assign yet">
          Add{" "}
          <Link className="text-primary underline-offset-4 hover:underline" href={`/admin/classes?year=${selected.id}`}>
            sections
          </Link>{" "}
          and{" "}
          <Link className="text-primary underline-offset-4 hover:underline" href={`/admin/subjects?year=${selected.id}`}>
            class subjects
          </Link>{" "}
          for {selected.name} first.
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Subject places" value={grid.length} hint="Section × subject, this year" />
            <StatCard label="Assigned" value={grid.length - unassigned} />
            <StatCard label="Still unassigned" value={unassigned} hint={unassigned ? "Marks cannot be entered for these" : "Every subject has a teacher"} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {[...bySection.values()].map((cells) => (
              <SectionAssignments key={cells[0].sectionId} cells={cells} staff={staff.map((s) => ({ value: s.id, label: s.fullName }))} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
