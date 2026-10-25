import { CalendarRange, ClipboardList } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/app/page";
import { UrlSelect } from "@/components/app/url-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/server/auth/current";
import { resolveAcademicYear } from "@/server/services/academic-years";
import { listAssessmentTypes, listExamTerms, listTermAssessments } from "@/server/services/exam-terms";
import { listGradingScales } from "@/server/services/grading";
import { AssessmentTypeDialog, AssessmentTypesTable, ExamTermDialog, ExamTermsTable, MaxMarksGrid, PrepareButton } from "./terms-client";

export const metadata = { title: "Exam terms & marks" };

export default async function ExamTermsPage({ searchParams }: PageProps<"/admin/exam-terms">) {
  const ctx = await requireAdmin();
  const params = await searchParams;
  const { years, selected } = await resolveAcademicYear(ctx.db, params.year);
  const [terms, types, scales] = await Promise.all([
    selected ? listExamTerms(ctx.db, selected.id) : Promise.resolve([]),
    listAssessmentTypes(ctx.db),
    listGradingScales(ctx.db),
  ]);
  const termId = typeof params.term === "string" && terms.some((t) => t.id === params.term) ? params.term : (terms.find((t) => t.isCurrent) ?? terms[0])?.id;
  const term = terms.find((t) => t.id === termId);
  const maxRows = termId ? await listTermAssessments(ctx.db, termId) : [];
  const scaleOptions = scales.map((s) => ({ value: s.id, label: s.isDefault ? `${s.name} (default)` : s.name }));

  return (
    <>
      <PageHeader title="Exam terms & marks" description="Terms of each academic year, the components that make up a subject's marks, and their maximum marks." />
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Exam terms</CardTitle>
            <CardDescription>The current term is the one teachers enter marks for by default.</CardDescription>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {years.length ? (
              <UrlSelect param="year" label="Academic year" value={selected?.id} options={years.map((y) => ({ value: y.id, label: y.isCurrent ? `${y.name} (current)` : y.name }))} resets={["term"]} />
            ) : null}
            {selected ? <ExamTermDialog academicYearId={selected.id} scaleOptions={scaleOptions} /> : null}
          </div>
        </CardHeader>
        <CardContent>
          {!selected ? (
            <EmptyState icon={CalendarRange} title="No academic year yet">
              <Link className="text-primary underline-offset-4 hover:underline" href="/admin/academic-years">
                Create an academic year
              </Link>{" "}
              first.
            </EmptyState>
          ) : (
            <ExamTermsTable terms={terms} scaleOptions={scaleOptions} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Mark components</CardTitle>
            <CardDescription>Each subject&apos;s marks are the sum of these, e.g. Monthly Test 25 + Term Examination 75 = 100.</CardDescription>
          </div>
          <AssessmentTypeDialog />
        </CardHeader>
        <CardContent>
          <AssessmentTypesTable types={types} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Maximum marks{term ? ` — ${term.name}` : ""}</CardTitle>
            <CardDescription>Set up from the component defaults; change any subject that differs. Locked once marks are submitted.</CardDescription>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {terms.length ? <UrlSelect param="term" label="Exam term" value={termId} options={terms.map((t) => ({ value: t.id, label: t.name }))} /> : null}
            {termId ? <PrepareButton termId={termId} hasRows={maxRows.length > 0} /> : null}
          </div>
        </CardHeader>
        <CardContent>
          {!termId ? (
            <EmptyState icon={ClipboardList} title="No exam terms yet">
              Add an exam term above.
            </EmptyState>
          ) : maxRows.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Maximum marks are not set up for this term">
              Use “Set up maximum marks” to create them for every class subject from the component defaults.
            </EmptyState>
          ) : (
            <MaxMarksGrid rows={maxRows} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
