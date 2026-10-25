/**
 * Result arithmetic with decimal.js so that 0.1 + 0.2 style float errors never reach a report.
 *
 * Missing marks are `null` and are never treated as zero: a subject with any missing component has
 * no total or percentage until every component is entered. `0` is a real score.
 *
 * Rounding policy: values are kept exact internally. Percentages are rounded half-up
 * (66.665 -> 66.67) to the school's configured decimal places *before* grade and pass/fail
 * decisions, so a student shown as 33.00% is never failed for being 32.996%.
 */
import Decimal from "decimal.js";

/** Private Decimal constructor so the global decimal.js configuration is never relied on. */
export const Dec = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export type Dec = Decimal;

export type MarkValue = Decimal | string | number | null | undefined;

const HUNDRED = new Dec(100);
const ZERO = new Dec(0);

/** Convert a database/JSON number to Decimal. `null`, `undefined` and blank strings stay `null` (missing). */
export function toDecimal(value: MarkValue): Decimal | null {
  if (value === null || value === undefined) return null;
  if (Decimal.isDecimal(value)) return new Dec(value);
  if (typeof value === "string" && value.trim() === "") return null;
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error(`Not a number: ${value}`);
  try {
    return new Dec(typeof value === "string" ? value.trim() : value);
  } catch {
    throw new Error(`Not a number: ${String(value)}`);
  }
}

export function roundHalfUp(value: Decimal | null, places = 2): Decimal | null {
  if (value === null) return null;
  return value.toDecimalPlaces(places, Decimal.ROUND_HALF_UP);
}

/** Display a mark/total: whole numbers without decimals, others to `places` decimals. */
export function formatNumber(value: MarkValue, places = 2, missing = "—"): string {
  const d = toDecimal(value);
  if (d === null) return missing;
  const rounded = roundHalfUp(d, places)!;
  return rounded.isInteger() ? rounded.toFixed(0) : rounded.toFixed(places);
}

export function percentage(obtained: Decimal | null, maximum: Decimal | null): Decimal | null {
  if (obtained === null || maximum === null || maximum.lte(0)) return null;
  return obtained.times(HUNDRED).dividedBy(maximum);
}

// -- subject totals -------------------------------------------------------------------------------

export interface SubjectTotal {
  /** `null` while any component is missing. */
  obtained: Decimal | null;
  maximum: Decimal;
  /** Components with a mark. */
  entered: number;
  components: number;
  complete: boolean;
  missing: number;
}

/** components = one `{ obtained, max }` per assessment for one student and subject. */
export function subjectTotal(components: Iterable<{ obtained: MarkValue; max: MarkValue }>): SubjectTotal {
  let maximum = ZERO;
  let sum = ZERO;
  let entered = 0;
  let count = 0;
  for (const c of components) {
    count += 1;
    const max = toDecimal(c.max);
    if (max === null) throw new Error("Every component needs maximum marks");
    maximum = maximum.plus(max);
    const obtained = toDecimal(c.obtained);
    if (obtained !== null) {
      entered += 1;
      sum = sum.plus(obtained);
    }
  }
  const complete = count > 0 && entered === count;
  return { obtained: complete ? sum : null, maximum, entered, components: count, complete, missing: count - entered };
}

// -- grading rules --------------------------------------------------------------------------------

export interface GradeBand {
  minPercentage: Decimal;
  grade: string;
  remark: string;
}

export interface GradingRules {
  name: string;
  /** Highest band first. */
  bands: readonly GradeBand[];
  subjectPass: Decimal;
  overallPass: Decimal;
  requireAllCompulsoryPass: boolean;
  /** Decimal places for percentages (0–2). */
  places: number;
}

export interface GradingRulesInput {
  name?: string;
  bands: { grade: string; minPercentage: MarkValue; remark?: string }[];
  subjectPass: MarkValue;
  overallPass: MarkValue;
  requireAllCompulsoryPass?: boolean;
  places?: number;
}

/** Build validated rules: grades and thresholds unique, one band starting at 0% so every percentage gets a grade. */
export function makeGradingRules(input: GradingRulesInput): GradingRules {
  const places = input.places ?? 2;
  if (!Number.isInteger(places) || places < 0 || places > 2) throw new Error("Decimal places must be 0, 1 or 2");
  const pct = (v: MarkValue, what: string) => {
    const d = toDecimal(v);
    if (d === null || d.lt(0) || d.gt(100)) throw new Error(`${what} must be between 0 and 100`);
    return d;
  };
  if (input.bands.length === 0) throw new Error("Add at least one grade");
  const bands = input.bands
    .map((b) => ({ grade: b.grade.trim(), minPercentage: pct(b.minPercentage, `Minimum % for ${b.grade}`), remark: (b.remark ?? "").trim() }))
    .sort((a, b) => b.minPercentage.comparedTo(a.minPercentage));
  if (bands.some((b) => b.grade === "")) throw new Error("Every grade needs a name");
  if (new Set(bands.map((b) => b.grade.toLowerCase())).size !== bands.length) throw new Error("Grade names must be unique");
  if (new Set(bands.map((b) => b.minPercentage.toString())).size !== bands.length) throw new Error("Each grade needs a different minimum %");
  if (!bands[bands.length - 1].minPercentage.isZero()) throw new Error("One grade must start at 0% so that every percentage gets a grade");
  return {
    name: input.name ?? "",
    bands,
    subjectPass: pct(input.subjectPass, "Subject pass %"),
    overallPass: pct(input.overallPass, "Overall pass %"),
    requireAllCompulsoryPass: input.requireAllCompulsoryPass ?? true,
    places,
  };
}

export function gradeFor(rules: GradingRules, pct: Decimal | null): GradeBand | null {
  const value = roundHalfUp(pct, rules.places);
  if (value === null) return null;
  return rules.bands.find((b) => value.gte(b.minPercentage)) ?? null;
}

function meets(threshold: Decimal, pct: Decimal | null, places: number): boolean | null {
  const value = roundHalfUp(pct, places);
  return value === null ? null : value.gte(threshold);
}

// -- student results ------------------------------------------------------------------------------

export interface SubjectSpec {
  id: string;
  name: string;
  /** One entry per component (e.g. Monthly 25, Term 75). `id` is the assessment id. */
  components: readonly { id: string; max: MarkValue }[];
  isCompulsory: boolean;
  includeInTotal: boolean;
}

export interface SubjectOutcome {
  subject: SubjectSpec;
  total: SubjectTotal;
  /** Rounded for display; `null` while incomplete. */
  percentage: Decimal | null;
  grade: GradeBand | null;
  /** `null` while incomplete. */
  passed: boolean | null;
}

export type ResultStatus = "Pass" | "Fail" | "Incomplete" | "No result";

export interface StudentOutcome {
  subjects: SubjectOutcome[];
  grandObtained: Decimal | null;
  grandMaximum: Decimal;
  percentage: Decimal | null;
  grade: GradeBand | null;
  passed: boolean | null;
  /** Number of missing component marks across all subjects. */
  missing: number;
  complete: boolean;
  status: ResultStatus;
  failedSubjects: string[];
}

/**
 * Apply the school's rules to one student's marks (`{ component id: mark or null }`).
 *
 * * Subject result: total of its components; percentage, grade and pass/fail only when complete.
 * * Overall: only when every subject is complete. Grand total/percentage use subjects that count in
 *   the total. Pass requires the overall pass % and, if the scale says so, a pass in every compulsory subject.
 */
export function evaluateStudent(
  subjects: readonly SubjectSpec[],
  marks: Readonly<Record<string, MarkValue>> | ReadonlyMap<string, MarkValue>,
  rules: GradingRules,
): StudentOutcome {
  const lookup = (id: string): MarkValue => (marks instanceof Map ? marks.get(id) : (marks as Record<string, MarkValue>)[id]);
  const outcomes: SubjectOutcome[] = subjects.map((subject) => {
    const total = subjectTotal(subject.components.map((c) => ({ obtained: lookup(c.id), max: c.max })));
    const pct = total.complete ? roundHalfUp(percentage(total.obtained, total.maximum), rules.places) : null;
    return { subject, total, percentage: pct, grade: gradeFor(rules, pct), passed: meets(rules.subjectPass, pct, rules.places) };
  });

  const missing = outcomes.reduce((n, o) => n + o.total.missing, 0);
  const counted = outcomes.filter((o) => o.subject.includeInTotal);
  const grandMaximum = counted.reduce((sum, o) => sum.plus(o.total.maximum), ZERO);
  const failedSubjects = outcomes.filter((o) => o.passed === false).map((o) => o.subject.name);

  if (missing > 0) {
    return { subjects: outcomes, grandObtained: null, grandMaximum, percentage: null, grade: null, passed: null, missing, complete: false, status: "Incomplete", failedSubjects };
  }
  if (outcomes.length === 0 || counted.length === 0) {
    return { subjects: outcomes, grandObtained: null, grandMaximum, percentage: null, grade: null, passed: null, missing: 0, complete: true, status: "No result", failedSubjects };
  }

  const grandObtained = counted.reduce((sum, o) => sum.plus(o.total.obtained!), ZERO);
  const pct = roundHalfUp(percentage(grandObtained, grandMaximum), rules.places);
  let passed = meets(rules.overallPass, pct, rules.places);
  if (passed !== null && rules.requireAllCompulsoryPass) {
    passed = passed && outcomes.filter((o) => o.subject.isCompulsory).every((o) => o.passed === true);
  }
  const status: ResultStatus = passed === null ? "No result" : passed ? "Pass" : "Fail";
  return { subjects: outcomes, grandObtained, grandMaximum, percentage: pct, grade: gradeFor(rules, pct), passed, missing: 0, complete: true, status, failedSubjects };
}

// -- ranking and statistics -----------------------------------------------------------------------

/** Standard competition ranking (1, 2, 2, 4) of the non-missing values, highest first. Missing values get no rank. */
export function competitionRanks(values: Readonly<Record<string, Decimal | null>>): Record<string, number> {
  const present = Object.values(values).filter((v): v is Decimal => v !== null);
  const ranks: Record<string, number> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === null) continue;
    ranks[key] = 1 + present.filter((other) => other.gt(value)).length;
  }
  return ranks;
}

export function mean(values: readonly Decimal[]): Decimal | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s.plus(v), ZERO).dividedBy(values.length);
}

export function median(values: readonly Decimal[]): Decimal | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((a, b) => a.comparedTo(b));
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : ordered[middle - 1].plus(ordered[middle]).dividedBy(2);
}
