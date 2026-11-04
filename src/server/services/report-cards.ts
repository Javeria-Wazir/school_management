/**
 * Report cards: turn a compiled class result into the data the themed A4 cards print.
 * Nothing is invented: missing marks print as "—", an absence as "A" (counted as 0), a student absent
 * throughout as ABSENT, a test taken before a new admission joined as "—" (left out of their totals), a
 * student who joined after every test as NEW ADMISSION, an incomplete student as INCOMPLETE, and
 * every card is marked PROVISIONAL until the result has its final approval. Signature lines are blank.
 */
import { formatNumber, type GradingRules } from "@/lib/domain/calculations";
import { lightColor, softColor, themeForClass, type ThemeMeta } from "@/components/report-card/themes";
import type { CardRow, CardView } from "@/components/report-card/types";
import { forbidden } from "@/server/errors";
import type { ServiceContext } from "./guards";
import { getClassResult, type ClassResultView, type ResultStudent } from "./results";
import { getSchoolSettings } from "./settings";

const ICONS = new Set(["ENG", "URDU", "MATHS", "SCI", "SST", "NAZRA", "ISL", "COMP", "CHEM", "BIO", "PHY"]);
const SCIENCE = new Set(["CHEM", "BIO", "PHY"]);
/** Dates on cards are shown in the school's time zone. */
const TIME_ZONE = process.env.SCHOOL_TIME_ZONE || "Asia/Karachi";

function formatCardDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: TIME_ZONE }).format(date);
}

const trim = (d: { toString(): string }) => formatNumber(d.toString(), 2);

/** 1 → "1st", 2 → "2nd", 3 → "3rd", 11 → "11th", 22 → "22nd". */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

/** "A+ 90–100 · A 80–89 · … · F below 33" from the term's grade bands. */
export function gradeLegend(rules: GradingRules): string {
  return rules.bands
    .map((band, i) => {
      const min = band.minPercentage;
      if (i === 0) return `${band.grade} ${trim(min)}–100`;
      const upper = rules.bands[i - 1].minPercentage;
      if (min.isZero()) return `${band.grade} below ${trim(upper)}`;
      return upper.isInteger() && min.isInteger() ? `${band.grade} ${trim(min)}–${trim(upper.minus(1))}` : `${band.grade} ${trim(min)}+`;
    })
    .join(" · ");
}

function passRules(rules: GradingRules): { long: string; short: string } {
  const subject = `${trim(rules.subjectPass)}%`;
  const overall = `${trim(rules.overallPass)}%`;
  if (!rules.requireAllCompulsoryPass) return { long: `Pass mark ${overall} overall.`, short: `pass mark ${overall} overall` };
  const extra = rules.overallPass.eq(rules.subjectPass) ? "" : ` and ${overall} overall`;
  return { long: `Pass mark ${subject} in every compulsory subject${extra}.`, short: `pass mark ${subject} in every compulsory subject${extra}` };
}

function buildRows(result: ClassResultView, student: ResultStudent, places: number, show: { grades: boolean; status: boolean }): CardRow[] {
  const absent = new Set(student.absent);
  // Tests held before a new admission joined: shown as "—" and left out of their totals.
  const notJoined = new Set(student.newAdmission);
  return result.subjects.map((subject, i) => {
    // No outcome when the student joined after every test of this subject.
    const o = student.outcome.subjects.find((x) => x.subject.id === subject.id);
    const monthly = subject.components.find((c) => c.code === "MONTHLY");
    const termExam = subject.components.find((c) => c.code === "TERM_EXAM");
    const sat = (c: { id: string } | undefined) => !!c && !notJoined.has(c.id);
    const mark = (id: string | undefined) => (!id || notJoined.has(id) ? "—" : absent.has(id) ? "A" : formatNumber(student.marks[id] ?? null, places));
    const satComponents = subject.components.filter(sat);
    const absentThroughout = satComponents.length > 0 && satComponents.every((c) => absent.has(c.id));
    // Absent from the whole test: no per-subject percentage or grade either, only "A".
    const pct = student.absentAll || !o ? null : o.percentage;
    const pctNumber = pct === null ? 0 : Math.min(100, Math.max(0, pct.toNumber()));
    const pass = show.status && o?.passed === true && !student.absentAll;
    const fail = show.status && o?.passed === false && !student.absentAll;
    return {
      n: i + 1,
      name: subject.name,
      code: subject.code,
      icon: ICONS.has(subject.code) ? `/report-card/subj-${subject.code.toLowerCase()}.svg` : "/report-card/subj-generic.svg",
      m: mark(monthly?.id),
      mm: sat(monthly) ? formatNumber(monthly!.max, places) : "—",
      t: mark(termExam?.id),
      tm: sat(termExam) ? formatNumber(termExam!.max, places) : "—",
      ob: !o ? "—" : absentThroughout ? "A" : formatNumber(o.total.obtained, places),
      max: o ? formatNumber(o.total.maximum, places) : "—",
      pct: pct === null ? "—" : pct.toFixed(places),
      pctShort: pct === null ? "—" : String(Math.round(pct.toNumber())),
      bar: pctNumber,
      barH: Math.round(pctNumber * 0.95),
      grade: show.grades ? (student.absentAll || !o ? "—" : (o.grade?.grade ?? "—")) : "",
      pass,
      fail,
      counts: subject.includeInTotal,
      showPass: subject.includeInTotal && pass,
      showFail: subject.includeInTotal && fail,
      optional: !subject.includeInTotal,
    };
  });
}

export interface ReportCardSet {
  theme: ThemeMeta;
  classLabel: string;
  termName: string;
  official: boolean;
  cards: { enrollmentId: string; studentName: string; view: CardView }[];
}

/**
 * Cards for a section (or one student of it). Who may print: the class teacher of the section and
 * the principal — the same people who can see the compiled result.
 */
export async function buildReportCards(
  ctx: ServiceContext,
  input: { examTermId: unknown; sectionId: unknown; stage: unknown; enrollmentId?: string; blackAndWhite?: boolean },
): Promise<ReportCardSet> {
  const result = await getClassResult(ctx, { examTermId: input.examTermId, sectionId: input.sectionId, stage: input.stage });
  const monthlyOnly = result.stage === "monthly";
  // A monthly card shows only the Monthly Test, under a title that says so.
  const termName = monthlyOnly ? `${result.term.name} · Monthly Test` : result.term.name;
  const settings = await getSchoolSettings(ctx.db);
  const places = settings.decimalPlaces;
  const theme = themeForClass(result.section.className, result.section.classSortOrder);
  const students = input.enrollmentId ? result.students.filter((s) => s.enrollmentId === input.enrollmentId) : result.students;
  if (input.enrollmentId && students.length === 0) throw forbidden("This student is not in this class.");

  const official = result.approval.status === "final_approved";
  const approvedAt = result.approval.finalApprovedAt;
  const approvedOn = official && approvedAt ? formatCardDate(approvedAt) : "";
  const rules = passRules(result.rules);
  const classNo = result.section.className.replace(/^class\s+/i, "");
  const science = result.subjects.some((s) => SCIENCE.has(s.code) && s.includeInTotal);

  const cards = students.map((student) => {
    const o = student.outcome;
    // Absent for everything: no total, grade, pass/fail or position, just ABSENT. Joined after every
    // test: the same, as NEW ADMISSION.
    const newAdmission = student.newAdmissionAll;
    const absent = student.absentAll && !newAdmission;
    const noResult = absent || newAdmission;
    const incomplete = !noResult && (o.status === "Incomplete" || o.status === "No result");
    const pct = o.percentage;
    const pctNumber = pct === null ? 0 : Math.min(100, Math.max(0, pct.toNumber()));
    const compulsoryFailed = o.subjects.filter((s) => s.subject.isCompulsory && s.passed === false).map((s) => s.subject.name);
    const view: CardView = {
      schoolName: settings.schoolName,
      logoSrc: settings.hasLogo ? "/api/school-logo" : "/report-card/crest.svg",
      accent: theme.accent,
      accentSoft: softColor(theme.accent, theme.softAlpha),
      accentLight: lightColor(theme.accent, 0.55),
      bw: input.blackAndWhite ? "grayscale(1)" : "none",
      termName,
      monthlyOnly,
      yearName: result.term.yearName.replace("-", "–"),
      className: result.section.className,
      classNo,
      classNoPadded: /^\d$/.test(classNo) ? `0${classNo}` : classNo,
      sectionName: result.section.name,
      streamLabel: science ? "Science group" : "General group",
      student: { name: student.fullName, roll: String(student.rollNumber), id: student.studentCode, guardian: student.guardianName || "—" },
      rows: buildRows(result, student, places, { grades: settings.showSubjectGrades, status: settings.showSubjectStatus }),
      total: noResult ? "—" : formatNumber(o.grandObtained, places),
      maxTotal: newAdmission ? "—" : formatNumber(o.grandMaximum, places),
      pct: pct === null || noResult ? "—" : pct.toFixed(places),
      pctBar: noResult ? 0 : pctNumber,
      pctDeg: noResult ? 0 : Math.round(pctNumber * 3.6),
      grade: noResult ? "—" : (o.grade?.grade ?? "—"),
      gradeRemark: newAdmission ? "New admission" : absent ? "Absent" : (o.grade?.remark ?? (incomplete ? "Result incomplete" : "")),
      result: newAdmission ? "NEW ADMISSION" : absent ? "ABSENT" : o.status === "Pass" ? "PASS" : o.status === "Fail" ? "FAIL" : "INCOMPLETE",
      // Ranked against the whole class (ties share a place: 1st, 2nd, 2nd, 4th); none while incomplete.
      position: student.position === null ? "" : `${ordinal(student.position)} of ${result.students.length}`,
      showPosition: settings.showClassPosition && student.position !== null,
      resultNote: newAdmission
        ? "Joined after this test"
        : absent
          ? "Absent from this test"
          : o.status === "Pass"
            ? "Well done!"
            : o.status === "Fail"
              ? "Needs improvement"
              : "Some marks are missing",
      passed: !noResult && o.status === "Pass",
      failed: !noResult && o.status === "Fail",
      incomplete,
      absent,
      newAdmission,
      failedList: noResult ? "" : compulsoryFailed.join(", "),
      remarks: student.remarks,
      legend: gradeLegend(result.rules),
      passRule: rules.long,
      passRuleShort: rules.short,
      official,
      provisional: !official,
      approvalText: official ? (result.requirePrincipalApproval ? `Approved by the Principal on ${approvedOn}` : `Approved on ${approvedOn}`) : "",
      approvedOn,
      printedOn: formatCardDate(new Date()),
    };
    return { enrollmentId: student.enrollmentId, studentName: student.fullName, view };
  });

  return { theme, classLabel: `${result.section.className} – ${result.section.name}`, termName, official, cards };
}
