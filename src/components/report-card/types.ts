/**
 * Everything a printed result card shows, already formatted. Built on the server from the class
 * result (src/server/services/report-cards.ts); the theme components only lay it out.
 * Missing marks are shown as "—" and never counted as zero.
 */
export interface CardRow {
  n: number;
  name: string;
  code: string;
  icon: string;
  /** Monthly / term marks and their maximums ("—" when not entered or not part of the subject). */
  m: string;
  mm: string;
  t: string;
  tm: string;
  ob: string;
  max: string;
  pct: string;
  pctShort: string;
  /** Bar width in % (0 while incomplete). */
  bar: number;
  /** Bar height in px for the chart theme (0 while incomplete). */
  barH: number;
  grade: string;
  pass: boolean;
  fail: boolean;
  /** Counts in the grand total. */
  counts: boolean;
  showPass: boolean;
  showFail: boolean;
  optional: boolean;
}

export interface CardView {
  schoolName: string;
  logoSrc: string;
  accent: string;
  accentSoft: string;
  accentLight: string;
  /** CSS filter for the black-and-white preview ("none" or "grayscale(1)"). */
  bw: string;
  termName: string;
  yearName: string;
  className: string;
  /** Class name without a leading "Class " (e.g. "6"). */
  classNo: string;
  classNoPadded: string;
  sectionName: string;
  streamLabel: string;
  student: { name: string; roll: string; id: string; guardian: string };
  rows: CardRow[];
  total: string;
  maxTotal: string;
  pct: string;
  pctBar: number;
  pctDeg: number;
  grade: string;
  gradeRemark: string;
  /** "PASS", "FAIL" or "INCOMPLETE". */
  result: string;
  resultNote: string;
  passed: boolean;
  failed: boolean;
  incomplete: boolean;
  failedList: string;
  remarks: string;
  legend: string;
  passRule: string;
  passRuleShort: string;
  official: boolean;
  provisional: boolean;
  approvalText: string;
  approvedOn: string;
  printedOn: string;
}
