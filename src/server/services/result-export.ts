/**
 * Excel export of a compiled class result (monthly or term): one row per student with each subject's
 * marks, the total, percentage, grade, result and position — the same numbers the result page shows.
 * Who may download: the class teacher of the section and the principal (as for the result itself).
 */
import ExcelJS from "exceljs";
import type { ServiceContext } from "./guards";
import { getClassResult, subjectCell, type ClassResultView, type ResultStudent } from "./results";
import { getSchoolSettings } from "./settings";

const STAGE_TITLE = { monthly: "Monthly result", term: "Term result" } as const;

/** What a subject cell shows: the mark, or why there is none. Numbers stay numbers so Excel can sum them. */
function cellValue(result: ClassResultView, student: ResultStudent, subjectId: string): number | string {
  const cell = subjectCell(result, student, subjectId);
  if (cell.kind === "notTaken") return "X";
  if (cell.kind === "newAdmission") return "N";
  if (cell.kind === "absent") return "A";
  return cell.outcome.total.complete ? cell.outcome.total.obtained!.toNumber() : "";
}

function statusOf(student: ResultStudent): string {
  if (student.newAdmissionAll) return "New admission";
  if (student.absentAll) return "Absent";
  return student.outcome.status;
}

export async function exportClassResult(ctx: ServiceContext, input: unknown): Promise<{ buffer: Buffer; filename: string }> {
  const result = await getClassResult(ctx, input);
  const settings = await getSchoolSettings(ctx.db);
  const label = `${result.section.className} ${result.section.name}`;
  const title = `${label} · ${result.term.name} · ${STAGE_TITLE[result.stage]}`;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = settings.schoolName;
  const sheet = workbook.addWorksheet("Result");
  const subjectHeaders = result.subjects.map((s) => {
    const max = s.components.reduce((sum, c) => sum + Number(c.max), 0);
    return `${s.name} (${max})${s.includeInTotal ? "" : " *"}`;
  });
  const headers = ["Roll", "Student ID", "Name", ...subjectHeaders, "Total", "Out of", "%", "Grade", "Result", "Position", "Remarks"];

  sheet.addRow([settings.schoolName]).font = { bold: true, size: 14 };
  sheet.addRow([`${title} · ${result.term.yearName}`]).font = { bold: true };
  sheet.addRow([
    result.approval.status === "final_approved" ? "Final approval given." : result.approval.status === "class_approved" ? "Approved by the class teacher; waiting for final approval." : "Not approved yet (provisional).",
  ]);
  sheet.addRow([]);
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.alignment = { wrapText: true, vertical: "middle" };

  for (const student of result.students) {
    const o = student.outcome;
    const noResult = student.newAdmissionAll || student.absentAll;
    sheet.addRow([
      student.rollNumber,
      student.studentCode,
      student.fullName,
      ...result.subjects.map((s) => cellValue(result, student, s.id)),
      noResult || !o.grandObtained ? "" : o.grandObtained.toNumber(),
      student.newAdmissionAll ? "" : o.grandMaximum.toNumber(),
      noResult || !o.percentage ? "" : o.percentage.toNumber(),
      noResult ? "" : (o.grade?.grade ?? ""),
      statusOf(student),
      student.position ?? "",
      student.remarks,
    ]);
  }

  sheet.addRow([]);
  sheet.addRow(["A = absent (counts as 0) · N = new admission (joined after the test) · X = does not take the subject · empty = not entered"]);
  if (result.subjects.some((s) => !s.includeInTotal)) sheet.addRow(["* not counted in the total"]);

  sheet.columns.forEach((column, i) => {
    column.width = i === 2 ? 28 : i === headers.length - 1 ? 40 : i < 2 ? 14 : 12;
  });
  sheet.views = [{ state: "frozen", xSplit: 3, ySplit: 5 }];

  const filename = `${label} ${result.term.name} ${STAGE_TITLE[result.stage]}.xlsx`.replace(/[^\w .-]+/g, "").replace(/\s+/g, " ");
  return { buffer: Buffer.from(await workbook.xlsx.writeBuffer()), filename };
}
