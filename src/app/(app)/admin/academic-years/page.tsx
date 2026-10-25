import { PageHeader } from "@/components/app/page";
import { requireAdmin } from "@/server/auth/current";
import { listAcademicYears } from "@/server/services/academic-years";
import { AcademicYearDialog, AcademicYearsTable } from "./years-client";

export const metadata = { title: "Academic years" };

export default async function AcademicYearsPage() {
  const ctx = await requireAdmin();
  const years = await listAcademicYears(ctx.db);
  return (
    <>
      <PageHeader
        title="Academic years"
        description="The current year decides which classes, students and terms everyone works with."
        actions={<AcademicYearDialog />}
      />
      <AcademicYearsTable years={years} />
    </>
  );
}
