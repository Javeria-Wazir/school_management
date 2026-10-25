/**
 * Student import from Excel (.xlsx) or CSV.
 *
 * 1. `previewStudentImport` parses and validates every row against the database and returns a report.
 *    Nothing is written.
 * 2. `importStudents` parses and validates the same file again (the browser cannot be trusted to send
 *    back a "clean" result) and, only if no row has an error, writes everything in one transaction.
 */
import ExcelJS from "exceljs";
import { eq, inArray, sql } from "drizzle-orm";
import { idSchema } from "@/lib/validation/common";
import { rollNumberSchema, studentCodeSchema } from "@/lib/validation/academics";
import { normalizePhone } from "@/lib/validation/phone";
import type { Db, Tx } from "@/server/db/client";
import { withActor } from "@/server/db/actor";
import { academicYears, classes, enrollments, sections, students } from "@/server/db/schema";
import { AppError, notFound } from "@/server/errors";
import { assertAdmin, type ServiceContext } from "./guards";
import { getCountryCode } from "./students";
import { parseInput } from "./validate";

export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 2000;

export type ImportField = "studentCode" | "fullName" | "guardianName" | "guardianPhone" | "dateOfBirth" | "className" | "sectionName" | "rollNumber";

export const IMPORT_COLUMNS: { field: ImportField; header: string; required: boolean; aliases: string[] }[] = [
  { field: "studentCode", header: "Student ID", required: true, aliases: ["studentid", "studentcode", "admissionno", "admissionnumber", "grno", "regno", "registrationno"] },
  { field: "fullName", header: "Full Name", required: true, aliases: ["fullname", "name", "studentname"] },
  { field: "className", header: "Class", required: true, aliases: ["class", "classname"] },
  { field: "sectionName", header: "Section", required: true, aliases: ["section", "sectionname"] },
  { field: "rollNumber", header: "Roll No", required: true, aliases: ["rollno", "rollnumber", "roll"] },
  { field: "guardianName", header: "Guardian Name", required: false, aliases: ["guardianname", "fathername", "parentname", "guardian"] },
  { field: "guardianPhone", header: "Guardian Phone", required: false, aliases: ["guardianphone", "phone", "mobile", "whatsapp", "phonenumber", "guardianmobile", "contact"] },
  { field: "dateOfBirth", header: "Date of Birth", required: false, aliases: ["dateofbirth", "dob", "birthdate"] },
];

export interface ParsedRow {
  /** Line number in the file (header = 1). */
  line: number;
  values: Record<ImportField, string>;
}

export type RowOutcome = "new" | "enrol" | "unchanged" | "error";

export interface ReportRow {
  line: number;
  studentCode: string;
  fullName: string;
  className: string;
  sectionName: string;
  rollNumber: string;
  outcome: RowOutcome;
  messages: string[];
}

export interface ImportReport {
  fileName: string;
  academicYearName: string;
  rows: ReportRow[];
  counts: Record<RowOutcome, number>;
  /** Problems with the file itself (missing columns, too many rows). */
  fileErrors: string[];
}

// -- parsing --------------------------------------------------------------------------------------

const normaliseHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((r) => r.text).join("").trim();
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    if ("text" in value) return String(value.text).trim();
    if ("error" in value) return "";
    return "";
  }
  return String(value).trim();
}

/**
 * Minimal RFC 4180 CSV parser (quotes, escaped quotes, CRLF, BOM). The delimiter is "," or, for
 * Excel in locales that save with semicolons, ";" — whichever the first line uses more.
 */
export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");
  for (let i = 0; i < input.length; i += 1) {
    const c = input[i];
    if (quoted) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && input[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.map((r) => r.map((f) => f.trim()));
}

async function readTable(bytes: Uint8Array, fileName: string): Promise<string[][]> {
  const lower = fileName.toLowerCase();
  const isZip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  if (lower.endsWith(".xlsx")) {
    if (!isZip) throw new AppError("VALIDATION", "This does not look like a real .xlsx file. Save it again from Excel as “Excel Workbook (.xlsx)”.");
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(Buffer.from(bytes) as unknown as ArrayBuffer);
    } catch {
      throw new AppError("VALIDATION", "The Excel file could not be read. Save it again as .xlsx and retry.");
    }
    const sheet = workbook.worksheets.find((ws) => ws.actualRowCount > 0);
    if (!sheet) return [];
    const table: string[][] = [];
    sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const values: string[] = [];
      for (let col = 1; col <= sheet.actualColumnCount; col += 1) values.push(cellText(row.getCell(col).value));
      table[rowNumber - 1] = values;
    });
    return Array.from(table, (r) => r ?? []);
  }
  if (lower.endsWith(".csv")) {
    if (isZip) throw new AppError("VALIDATION", "This file is an Excel workbook named .csv. Rename it to .xlsx or save it as CSV.");
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new AppError("VALIDATION", "The CSV file is not UTF-8. In Excel use “Save as → CSV UTF-8”.");
    }
    return parseCsv(text);
  }
  throw new AppError("VALIDATION", "Upload an Excel workbook (.xlsx) or a CSV file (.csv). Older .xls and macro files (.xlsm) are not accepted.");
}

/** Turn a file into rows keyed by field. Throws for unusable files; missing columns are reported. */
export async function parseStudentFile(bytes: Uint8Array, fileName: string): Promise<{ rows: ParsedRow[]; fileErrors: string[] }> {
  if (bytes.length === 0) throw new AppError("VALIDATION", "The file is empty.");
  if (bytes.length > IMPORT_MAX_BYTES) throw new AppError("VALIDATION", "The file is larger than 2 MB. Split it into smaller files.");
  const table = await readTable(bytes, fileName);
  const headerIndex = table.findIndex((r) => r.some((c) => c !== ""));
  if (headerIndex < 0) return { rows: [], fileErrors: ["The file has no rows."] };

  const header = table[headerIndex].map(normaliseHeader);
  const columnOf = new Map<ImportField, number>();
  for (const column of IMPORT_COLUMNS) {
    const index = header.findIndex((h) => h === normaliseHeader(column.header) || column.aliases.includes(h));
    if (index >= 0) columnOf.set(column.field, index);
  }
  const missing = IMPORT_COLUMNS.filter((c) => c.required && !columnOf.has(c.field)).map((c) => c.header);
  if (missing.length) return { rows: [], fileErrors: [`Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Download the template to see the expected columns.`] };

  const rows: ParsedRow[] = [];
  for (let i = headerIndex + 1; i < table.length; i += 1) {
    const raw = table[i] ?? [];
    if (raw.every((c) => c === "")) continue;
    const values = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c.field, columnOf.has(c.field) ? (raw[columnOf.get(c.field)!] ?? "") : ""])) as Record<ImportField, string>;
    rows.push({ line: i + 1, values });
  }
  const fileErrors = rows.length > IMPORT_MAX_ROWS ? [`The file has ${rows.length} students; import at most ${IMPORT_MAX_ROWS} at a time.`] : [];
  if (rows.length === 0) fileErrors.push("The file has a header row but no students.");
  return { rows, fileErrors };
}

/** Accepts 2014-05-31, 31/05/2014 and 31-05-2014. Returns ISO date or throws a message. */
export function parseImportDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else if ((match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(value))) [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else throw new Error("Date of birth must look like 2014-05-31 or 31/05/2014");
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) throw new Error(`Date of birth ${value} is not a real date`);
  const iso = date.toISOString().slice(0, 10);
  if (iso < "1950-01-01" || iso > new Date().toISOString().slice(0, 10)) throw new Error(`Date of birth ${value} is not plausible`);
  return iso;
}

// -- validation -----------------------------------------------------------------------------------

interface PlannedRow {
  report: ReportRow;
  studentId: string | null;
  sectionId: string | null;
  classId: string | null;
  data: { studentCode: string; fullName: string; guardianName: string | null; guardianPhone: string | null; dateOfBirth: string | null; rollNumber: number };
}

async function planImport(db: Db | Tx, academicYearId: string, rows: ParsedRow[]): Promise<PlannedRow[]> {
  const countryCode = await getCountryCode(db);
  const sectionRows = await db
    .select({ id: sections.id, name: sections.name, classId: sections.classId, className: classes.name, isActive: sections.isActive })
    .from(sections)
    .innerJoin(classes, eq(classes.id, sections.classId))
    .where(eq(sections.academicYearId, academicYearId));
  const sectionByKey = new Map(sectionRows.map((s) => [`${s.className.trim().toLowerCase()}|${s.name.trim().toLowerCase()}`, s]));

  const codes = [...new Set(rows.map((r) => r.values.studentCode.trim().toLowerCase()).filter(Boolean))];
  const existing = codes.length
    ? await db
        .select({ id: students.id, code: students.studentCode, fullName: students.fullName, status: students.status })
        .from(students)
        .where(inArray(sql`lower(${students.studentCode})`, codes))
    : [];
  const studentByCode = new Map(existing.map((s) => [s.code.toLowerCase(), s]));

  const yearEnrollments = await db
    .select({ studentId: enrollments.studentId, classId: enrollments.classId, sectionId: enrollments.sectionId, roll: enrollments.rollNumber })
    .from(enrollments)
    .where(eq(enrollments.academicYearId, academicYearId));
  const enrollmentByStudent = new Map(yearEnrollments.map((e) => [e.studentId, e]));
  const studentByClassRoll = new Map(yearEnrollments.map((e) => [`${e.classId}|${e.roll}`, e.studentId]));
  const sectionLabel = new Map(sectionRows.map((s) => [s.id, `${s.className} ${s.name}`]));

  const seenCodes = new Map<string, number>();
  const seenRolls = new Map<string, number>();

  return rows.map(({ line, values }) => {
    const messages: string[] = [];
    const report: ReportRow = {
      line,
      studentCode: values.studentCode,
      fullName: values.fullName,
      className: values.className,
      sectionName: values.sectionName,
      rollNumber: values.rollNumber,
      outcome: "error",
      messages,
    };
    const planned: PlannedRow = { report, studentId: null, sectionId: null, classId: null, data: { studentCode: "", fullName: "", guardianName: null, guardianPhone: null, dateOfBirth: null, rollNumber: 0 } };

    const code = studentCodeSchema.safeParse(values.studentCode);
    if (!code.success) messages.push(values.studentCode ? `Student ID: ${code.error.issues[0].message}` : "Student ID is missing");
    const fullName = values.fullName.trim();
    if (!fullName) messages.push("Full name is missing");
    else if (fullName.length > 120) messages.push("Full name is longer than 120 characters");
    const roll = rollNumberSchema.safeParse(values.rollNumber);
    if (!roll.success) messages.push(values.rollNumber ? `Roll No: ${roll.error.issues[0].message}` : "Roll No is missing");
    const guardianName = values.guardianName.trim() || null;
    if (guardianName && guardianName.length > 120) messages.push("Guardian name is longer than 120 characters");
    let guardianPhone: string | null = null;
    try {
      guardianPhone = normalizePhone(values.guardianPhone, countryCode);
    } catch (error) {
      const digitsOnly = /^\d{9,11}$/.test(values.guardianPhone.trim());
      messages.push((error as Error).message + (digitsOnly ? " — the leading 0 may have been removed by Excel; format the column as Text" : ""));
    }
    let dateOfBirth: string | null = null;
    try {
      dateOfBirth = parseImportDate(values.dateOfBirth);
    } catch (error) {
      messages.push((error as Error).message);
    }

    const section = sectionByKey.get(`${values.className.trim().toLowerCase()}|${values.sectionName.trim().toLowerCase()}`);
    if (!values.className.trim() || !values.sectionName.trim()) messages.push("Class and Section are required");
    else if (!section) messages.push(`There is no section “${values.className} ${values.sectionName}” in this academic year`);
    else if (!section.isActive) messages.push(`Section ${values.className} ${values.sectionName} is inactive`);

    if (code.success) {
      const key = code.data.toLowerCase();
      if (seenCodes.has(key)) messages.push(`Student ID ${code.data} also appears on line ${seenCodes.get(key)}`);
      else seenCodes.set(key, line);
    }
    if (section && roll.success) {
      const key = `${section.classId}|${roll.data}`;
      if (seenRolls.has(key)) messages.push(`Roll No ${roll.data} in ${section.className} also appears on line ${seenRolls.get(key)}`);
      else seenRolls.set(key, line);
    }

    if (messages.length === 0 && code.success && roll.success && section) {
      planned.sectionId = section.id;
      planned.classId = section.classId;
      planned.data = { studentCode: code.data, fullName, guardianName, guardianPhone, dateOfBirth, rollNumber: roll.data };
      const existingStudent = studentByCode.get(code.data.toLowerCase());
      const rollOwner = studentByClassRoll.get(`${section.classId}|${roll.data}`);
      if (existingStudent) {
        planned.studentId = existingStudent.id;
        const enrolment = enrollmentByStudent.get(existingStudent.id);
        if (existingStudent.fullName.trim().toLowerCase() !== fullName.toLowerCase()) {
          messages.push(`Student ID ${code.data} already belongs to “${existingStudent.fullName}”`);
        } else if (existingStudent.status !== "active") {
          messages.push(`This student is ${existingStudent.status}; make them active before enrolling`);
        } else if (enrolment) {
          if (enrolment.sectionId === section.id && enrolment.roll === roll.data) {
            report.outcome = "unchanged";
            messages.push("Already enrolled here — nothing to do");
          } else {
            messages.push(`Already enrolled this year in ${sectionLabel.get(enrolment.sectionId)}, roll ${enrolment.roll}`);
          }
        } else if (rollOwner) {
          messages.push(`Roll No ${roll.data} is already used in ${section.className}`);
        } else {
          report.outcome = "enrol";
          messages.push("Existing student — will be enrolled; their details are not changed");
        }
      } else if (rollOwner) {
        messages.push(`Roll No ${roll.data} is already used in ${section.className}`);
      } else {
        report.outcome = "new";
      }
    }
    return planned;
  });
}

function summarise(fileName: string, academicYearName: string, planned: PlannedRow[], fileErrors: string[]): ImportReport {
  const counts: Record<RowOutcome, number> = { new: 0, enrol: 0, unchanged: 0, error: 0 };
  for (const p of planned) counts[p.report.outcome] += 1;
  return { fileName, academicYearName, rows: planned.map((p) => p.report), counts, fileErrors };
}

async function yearName(db: Db | Tx, academicYearId: string): Promise<string> {
  const [year] = await db.select({ name: academicYears.name }).from(academicYears).where(eq(academicYears.id, academicYearId));
  if (!year) throw notFound("Academic year");
  return year.name;
}

export interface ImportFile {
  academicYearId: unknown;
  fileName: string;
  bytes: Uint8Array;
}

/** Validate a file and report what would happen. Writes nothing. */
export async function previewStudentImport(ctx: ServiceContext, file: ImportFile): Promise<ImportReport> {
  assertAdmin(ctx.user);
  const academicYearId = parseInput(idSchema, file.academicYearId);
  const name = await yearName(ctx.db, academicYearId);
  const { rows, fileErrors } = await parseStudentFile(file.bytes, file.fileName);
  const planned = fileErrors.length ? [] : await planImport(ctx.db, academicYearId, rows);
  return summarise(file.fileName, name, planned, fileErrors);
}

/** Import a file whose preview had no errors. All rows are written in one transaction, or none. */
export async function importStudents(ctx: ServiceContext, file: ImportFile): Promise<ImportReport> {
  assertAdmin(ctx.user);
  const academicYearId = parseInput(idSchema, file.academicYearId);
  const { rows, fileErrors } = await parseStudentFile(file.bytes, file.fileName);
  if (fileErrors.length) throw new AppError("VALIDATION", fileErrors[0]);
  return withActor(
    ctx.db,
    ctx.user.id,
    async (tx) => {
      // Serialise imports so two uploads cannot claim the same roll numbers between check and insert.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('student-import'))`);
      const name = await yearName(tx, academicYearId);
      const planned = await planImport(tx, academicYearId, rows);
      const report = summarise(file.fileName, name, planned, []);
      if (report.counts.error > 0) {
        throw new AppError("RULE", `${report.counts.error} row(s) have errors. Nothing was imported — fix them and upload the file again.`);
      }
      for (const p of planned) {
        if (p.report.outcome === "unchanged") continue;
        let studentId = p.studentId;
        if (p.report.outcome === "new") {
          const { studentCode, fullName, guardianName, guardianPhone, dateOfBirth } = p.data;
          const [created] = await tx.insert(students).values({ studentCode, fullName, guardianName, guardianPhone, dateOfBirth }).returning({ id: students.id });
          studentId = created.id;
        }
        await tx.insert(enrollments).values({ studentId: studentId!, academicYearId, classId: p.classId!, sectionId: p.sectionId!, rollNumber: p.data.rollNumber });
      }
      return report;
    },
    `Student import: ${file.fileName.slice(0, 100)}`,
  );
}

/** An .xlsx template with the expected columns and, on a second sheet, this year's classes and sections. */
export async function studentImportTemplate(ctx: ServiceContext, academicYearIdInput: unknown): Promise<Buffer> {
  assertAdmin(ctx.user);
  const academicYearId = parseInput(idSchema, academicYearIdInput);
  const name = await yearName(ctx.db, academicYearId);
  const sectionRows = await ctx.db
    .select({ className: classes.name, sectionName: sections.name })
    .from(sections)
    .innerJoin(classes, eq(classes.id, sections.classId))
    .where(eq(sections.academicYearId, academicYearId))
    .orderBy(classes.sortOrder, classes.name, sections.name);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "School Results";
  const sheet = workbook.addWorksheet("Students");
  sheet.columns = IMPORT_COLUMNS.map((c) => ({ header: c.header, key: c.field, width: c.field === "fullName" || c.field === "guardianName" ? 28 : 16 }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  // Text format keeps leading zeros in IDs and phone numbers.
  for (const field of ["studentCode", "guardianPhone", "dateOfBirth"] as const) sheet.getColumn(field).numFmt = "@";

  const help = workbook.addWorksheet("Classes and sections");
  help.columns = [
    { header: "Class", key: "className", width: 20 },
    { header: "Section", key: "sectionName", width: 12 },
  ];
  help.getRow(1).font = { bold: true };
  help.addRows(sectionRows);
  const notes = workbook.addWorksheet("Instructions");
  notes.getColumn(1).width = 110;
  [
    `Student import for academic year ${name}.`,
    "Fill one student per row on the “Students” sheet. Required: Student ID, Full Name, Class, Section, Roll No.",
    "Class and Section must match the “Classes and sections” sheet exactly (capital letters do not matter).",
    "Guardian Phone: +923001234567 or 03001234567. Date of Birth: 2014-05-31 or 31/05/2014.",
    "A Student ID that already exists (same name) is enrolled for this year; their details are not changed.",
    "Upload the file to see a validation report first. Nothing is saved until you confirm, and nothing is saved if any row has an error.",
  ].forEach((line) => notes.addRow([line]));

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
