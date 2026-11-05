import { Lock, School } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app/page";
import { UrlSelect } from "@/components/app/url-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/server/auth/current";
import { getMyClass, myClassSections } from "@/server/services/my-class";
import { StudentsTable, SubjectsTable } from "./my-class-client";

export const metadata = { title: "My class" };

export default async function MyClassPage({ searchParams }: PageProps<"/my-class">) {
  const ctx = await requireUser();
  const sectionsList = await myClassSections(ctx);
  if (sectionsList.length === 0) {
    return (
      <>
        <PageHeader title="My class" />
        <EmptyState icon={School} title="You are not a class teacher this year">
          The principal chooses class teachers in Staff accounts or Classes &amp; sections.
        </EmptyState>
      </>
    );
  }
  const requested = (await searchParams).section;
  const sectionId = sectionsList.find((s) => s.id === requested)?.id ?? sectionsList[0].id;
  const view = await getMyClass(ctx, sectionId);
  const label = `${view.section.className} ${view.section.name}`;
  const active = view.students.filter((s) => s.active).length;

  return (
    <>
      <PageHeader title={`My class · ${label}`} description={`${view.section.yearName} · ${active} student${active === 1 ? "" : "s"} on the class list`} />
      {sectionsList.length > 1 ? <UrlSelect param="section" label="Class" value={sectionId} options={sectionsList.map((s) => ({ value: s.id, label: s.label }))} className="w-56" /> : null}
      {view.locked ? (
        <Alert>
          <Lock aria-hidden />
          <AlertTitle>This class&apos;s result is approved</AlertTitle>
          <AlertDescription>Students and subjects cannot be changed until the principal reopens the result.</AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>
            <strong>Remove</strong> takes a student off the class list (e.g. they left the school); their marks and history are kept and they can be restored.{" "}
            <strong>Delete</strong> is only offered for a student added by mistake who has no marks yet. New students are added by the principal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudentsTable students={view.students} locked={view.locked} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Subjects</CardTitle>
          <CardDescription>
            Switch a subject off if your class does not study it this year, and choose whether it is compulsory and counts in the total. A new subject
            gets its Monthly Test and term papers straight away.
            {view.section.sectionCount > 1 ? ` These settings apply to every section of ${view.section.className}.` : ""} Subject teachers are assigned by the
            principal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubjectsTable sectionId={view.section.id} subjects={view.subjects} addable={view.addable} locked={view.locked} />
        </CardContent>
      </Card>
    </>
  );
}
