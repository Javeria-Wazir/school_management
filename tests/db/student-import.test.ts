import ExcelJS from "exceljs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAcademicYear } from "@/server/services/academic-years";
import { createClass, createSection } from "@/server/services/classes";
import { importStudents, parseCsv, parseImportDate, previewStudentImport, studentImportTemplate } from "@/server/services/student-import";
import { createStudent, listEnrolledStudents } from "@/server/services/students";
import { addUser, createTestDb, rejectsWith, type TestDb } from "./helpers";

let t: TestDb;
let admin: Awaited<ReturnType<typeof addUser>>;
let yearId: string;

const csv = (text: string) => ({ academicYearId: yearId, fileName: "students.csv", bytes: new TextEncoder().encode(text) });

beforeAll(async () => {
  t = await createTestDb();
  admin = await addUser(t.db, { role: "admin" });
  yearId = (await createAcademicYear(admin, { name: "2026-2027", startDate: "2026-04-01", endDate: "2027-03-31" })).id;
  const c6 = (await createClass(admin, { name: "Class 6" })).id;
  const c7 = (await createClass(admin, { name: "Class 7" })).id;
  const a = (await createSection(admin, { classId: c6, academicYearId: yearId, name: "A" })).id;
  await createSection(admin, { classId: c7, academicYearId: yearId, name: "A" });
  // An existing student who is already enrolled, and one who is not enrolled this year.
  await createStudent(admin, { studentCode: "OLD-1", fullName: "Existing Pupil", academicYearId: yearId, sectionId: a, rollNumber: "1" });
});
afterAll(() => t.close());

describe("parsing", () => {
  it("parses quoted CSV with commas, escaped quotes, CRLF and a BOM, and semicolon CSV", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
    ]);
    expect(parseCsv("a;b\n1,5;2\n")).toEqual([
      ["a", "b"],
      ["1,5", "2"],
    ]);
  });

  it("accepts ISO and day-first dates and rejects impossible ones", () => {
    expect(parseImportDate("2014-05-31")).toBe("2014-05-31");
    expect(parseImportDate("31/05/2014")).toBe("2014-05-31");
    expect(parseImportDate("")).toBeNull();
    expect(() => parseImportDate("31/02/2014")).toThrow(/not a real date/);
    expect(() => parseImportDate("May 2014")).toThrow(/look like/);
  });
});

describe("validation report", () => {
  it("reports every row's outcome without writing anything", async () => {
    const report = await previewStudentImport(
      admin,
      csv(
        [
          "Student ID,Full Name,Class,Section,Roll No,Guardian Name,Guardian Phone,Date of Birth",
          "S-101,Amna Shah,Class 6,a,2,Shah Sb,0300 1112223,2014-01-15", // new (section name case-insensitive)
          "OLD-1,Existing Pupil,Class 6,A,1,,,", // already enrolled here
          "S-102,Bad Section,Class 9,A,3,,,", // unknown section
          "S-101,Duplicate,Class 6,A,4,,,", // duplicate ID in file
          "S-103,Roll Taken,Class 6,A,1,,,", // roll 1 used by OLD-1
          "S-104,Bad Phone,Class 7,A,1,,3001112223,", // leading zero lost
          "S-105,Bad Date,Class 7,A,2,,,30/02/2014",
          ",No Code,Class 7,A,3,,,",
          "S-106,Duplicate Roll,Class 6,A,2,,,", // roll 2 already used on line 2
          "",
        ].join("\n"),
      ),
    );
    expect(report.fileErrors).toEqual([]);
    const byLine = Object.fromEntries(report.rows.map((r) => [r.line, r]));
    expect(byLine[2].outcome).toBe("new");
    expect(byLine[3].outcome).toBe("unchanged");
    expect(byLine[4].messages.join()).toMatch(/no section “Class 9 A”/);
    expect(byLine[5].messages.join()).toMatch(/also appears on line 2/);
    expect(byLine[6].messages.join()).toMatch(/Roll No 1 in Class 6 also appears on line 3/);
    expect(byLine[7].messages.join()).toMatch(/leading 0 may have been removed by Excel/);
    expect(byLine[8].messages.join()).toMatch(/not a real date/);
    expect(byLine[9].messages.join()).toMatch(/Student ID is missing/);
    expect(byLine[10].messages.join()).toMatch(/Roll No 2 in Class 6 also appears on line 2/);
    expect(report.counts).toEqual({ new: 1, enrol: 0, unchanged: 1, error: 7 });
    expect(await listEnrolledStudents(t.db, yearId)).toHaveLength(1); // nothing written
  });

  it("explains missing columns and unsupported files", async () => {
    const report = await previewStudentImport(admin, csv("Name,Class\nA,Class 6\n"));
    expect(report.fileErrors[0]).toMatch(/Missing columns: Student ID, Section, Roll No/);
    await rejectsWith(previewStudentImport(admin, { academicYearId: yearId, fileName: "old.xls", bytes: new Uint8Array([1, 2, 3]) }), /\.xlsx\) or a CSV/);
    await rejectsWith(previewStudentImport(admin, { academicYearId: yearId, fileName: "fake.xlsx", bytes: new TextEncoder().encode("a,b") }), /real \.xlsx/);
    await rejectsWith(previewStudentImport(admin, { academicYearId: yearId, fileName: "big.csv", bytes: new Uint8Array(3 * 1024 * 1024) }), /larger than 2 MB/);
  });

  it("is for administrators only", async () => {
    const teacher = await addUser(t.db);
    await rejectsWith(previewStudentImport(teacher, csv("x")), /Only the principal/);
    await rejectsWith(importStudents(teacher, csv("x")), /Only the principal/);
  });
});

describe("import", () => {
  it("imports nothing while any row has an error", async () => {
    await rejectsWith(
      importStudents(admin, csv("Student ID,Full Name,Class,Section,Roll No\nS-201,Good Row,Class 7,A,10\nS-202,Bad Row,Class 9,A,11\n")),
      /1 row\(s\) have errors\. Nothing was imported/,
    );
    expect((await listEnrolledStudents(t.db, yearId)).map((s) => s.studentCode)).toEqual(["OLD-1"]);
  });

  it("imports new students, enrols an existing one and skips unchanged rows, from .xlsx", async () => {
    // A student from an earlier year who is not enrolled this year.
    const previous = (await createAcademicYear(admin, { name: "2025-2026", startDate: "2025-04-01", endDate: "2026-03-31" })).id;
    const c6 = (await t.db.query.classes.findFirst())!.id;
    const prevSection = (await createSection(admin, { classId: c6, academicYearId: previous, name: "A" })).id;
    await createStudent(admin, { studentCode: "PREV-1", fullName: "Returning Pupil", academicYearId: previous, sectionId: prevSection, rollNumber: "1" });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Students");
    sheet.addRow(["Admission No", "Student Name", "Class", "Section", "Roll Number", "Father Name", "WhatsApp", "DOB"]);
    sheet.addRow(["S-301", "Zara Ahmed", "Class 7", "A", 1, "Ahmed Sb", "+92 333 4445556", new Date(Date.UTC(2013, 6, 4))]);
    sheet.addRow([302, "Usman Tariq", "Class 7", "A", 2, null, null, null]); // numeric ID cell
    sheet.addRow(["PREV-1", "Returning Pupil", "Class 6", "A", 5, null, null, null]);
    sheet.addRow(["OLD-1", "Existing Pupil", "Class 6", "A", 1, null, null, null]);
    const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());
    const file = { academicYearId: yearId, fileName: "students.xlsx", bytes };

    const preview = await previewStudentImport(admin, file);
    expect(preview.counts).toEqual({ new: 2, enrol: 1, unchanged: 1, error: 0 });
    const result = await importStudents(admin, file);
    expect(result.counts).toEqual(preview.counts);

    const rows = await listEnrolledStudents(t.db, yearId);
    expect(rows.map((r) => `${r.className}-${r.sectionName}-${r.rollNumber}:${r.studentCode}`)).toEqual([
      "Class 6-A-1:OLD-1",
      "Class 6-A-5:PREV-1",
      "Class 7-A-1:S-301",
      "Class 7-A-2:302",
    ]);
    expect(rows.find((r) => r.studentCode === "S-301")).toMatchObject({ guardianPhone: "+923334445556", dateOfBirth: "2013-07-04", guardianName: "Ahmed Sb" });

    // Importing the same file again changes nothing.
    expect((await previewStudentImport(admin, file)).counts).toEqual({ new: 0, enrol: 0, unchanged: 4, error: 0 });
  });

  it("produces a template listing the year's classes and sections", async () => {
    const buffer = await studentImportTemplate(admin, yearId);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    expect(workbook.getWorksheet("Students")!.getRow(1).values).toEqual([undefined, "Student ID", "Full Name", "Class", "Section", "Roll No", "Guardian Name", "Guardian Phone", "Date of Birth"]);
    const sections = workbook.getWorksheet("Classes and sections")!;
    expect(sections.getRow(2).values).toEqual([undefined, "Class 6", "A"]);
    expect(sections.getRow(3).values).toEqual([undefined, "Class 7", "A"]);
  });
});
