import { ArrowLeft, CalendarRange } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/app/page";
import { UrlSelect } from "@/components/app/url-select";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/server/auth/current";
import { resolveAcademicYear } from "@/server/services/academic-years";
import { ImportWizard } from "./import-client";

export const metadata = { title: "Import students" };

export default async function ImportStudentsPage({ searchParams }: PageProps<"/admin/students/import">) {
  const ctx = await requireAdmin();
  const { year } = await searchParams;
  const { years, selected } = await resolveAcademicYear(ctx.db, year);
  return (
    <>
      <PageHeader
        title="Import students"
        description="Add many students at once from Excel or CSV. You see a validation report first; nothing is saved until you confirm."
        actions={
          <Button variant="outline" asChild>
            <Link href={`/admin/students${selected ? `?year=${selected.id}` : ""}`}>
              <ArrowLeft aria-hidden /> Back to students
            </Link>
          </Button>
        }
      />
      {!selected ? (
        <EmptyState icon={CalendarRange} title="No academic year yet">
          Create an academic year and its sections first.
        </EmptyState>
      ) : (
        <>
          <UrlSelect param="year" label="Import into academic year" value={selected.id} options={years.map((y) => ({ value: y.id, label: y.isCurrent ? `${y.name} (current)` : y.name }))} className="max-w-xs" />
          <ImportWizard key={selected.id} academicYearId={selected.id} academicYearName={selected.name} />
        </>
      )}
    </>
  );
}
