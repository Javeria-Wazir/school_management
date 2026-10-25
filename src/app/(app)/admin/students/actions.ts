"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { formFields, runAction } from "@/server/actions";
import { requireAdmin } from "@/server/auth/current";
import { AppError } from "@/server/errors";
import { importStudents, previewStudentImport, type ImportReport } from "@/server/services/student-import";
import { createStudent, setEnrollmentActive, setStudentStatus, updateStudentWithEnrollment } from "@/server/services/students";

const PATH = "/admin/students";

export async function createStudentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    await createStudent(ctx, formFields(formData));
    revalidatePath(PATH);
    return { message: "Student added." };
  });
}

/** Saves the student's details and their enrolment (section / roll number) together. */
export async function updateStudentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    await updateStudentWithEnrollment(ctx, formFields(formData));
    revalidatePath(PATH);
    return { message: "Student updated." };
  });
}

export async function setStudentStatusAction(id: string, status: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    await setStudentStatus(ctx, { id, status });
    revalidatePath(PATH);
    return { message: status === "active" ? "Student is active again." : `Student marked as ${status} and withdrawn from their class.` };
  });
}

export async function setEnrollmentActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    await setEnrollmentActive(ctx, { id, active });
    revalidatePath(PATH);
    return { message: active ? "Student re-enrolled." : "Student withdrawn from this class." };
  });
}

function readUpload(formData: FormData): { academicYearId: unknown; file: File } {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new AppError("VALIDATION", "Choose an Excel (.xlsx) or CSV file.");
  return { academicYearId: formData.get("academicYearId"), file };
}

export async function previewImportAction(formData: FormData): Promise<ActionResult<ImportReport>> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    const { academicYearId, file } = readUpload(formData);
    const report = await previewStudentImport(ctx, { academicYearId, fileName: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
    return { data: report };
  });
}

export async function importAction(formData: FormData): Promise<ActionResult<ImportReport>> {
  const ctx = await requireAdmin();
  return runAction(async () => {
    const { academicYearId, file } = readUpload(formData);
    const report = await importStudents(ctx, { academicYearId, fileName: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
    revalidatePath(PATH);
    const { new: created, enrol } = report.counts;
    return { message: `Imported: ${created} new student${created === 1 ? "" : "s"}, ${enrol} existing enrolled.`, data: report };
  });
}
