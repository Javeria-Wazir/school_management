import { describe, expect, it } from "vitest";
import {
  competitionRanks,
  Dec,
  evaluateStudent,
  formatNumber,
  gradeFor,
  makeGradingRules,
  mean,
  median,
  percentage,
  roundHalfUp,
  subjectTotal,
  toDecimal,
  type SubjectSpec,
} from "@/lib/domain/calculations";

const STANDARD_BANDS = [
  { grade: "A+", minPercentage: 90, remark: "Outstanding" },
  { grade: "A", minPercentage: 80 },
  { grade: "B", minPercentage: 70 },
  { grade: "C", minPercentage: 60 },
  { grade: "D", minPercentage: 50 },
  { grade: "E", minPercentage: 33 },
  { grade: "F", minPercentage: 0, remark: "Fail" },
];

const rules = (overrides: Partial<Parameters<typeof makeGradingRules>[0]> = {}) =>
  makeGradingRules({ bands: STANDARD_BANDS, subjectPass: 33, overallPass: 33, ...overrides });

/** Monthly 25 + Term 75 for each subject. */
function subject(id: string, options: Partial<SubjectSpec> = {}): SubjectSpec {
  return {
    id,
    name: id,
    components: [
      { id: `${id}-m`, max: 25 },
      { id: `${id}-t`, max: 75 },
    ],
    isCompulsory: true,
    includeInTotal: true,
    ...options,
  };
}

describe("decimal helpers", () => {
  it("keeps missing values missing and never turns them into zero", () => {
    expect(toDecimal(null)).toBeNull();
    expect(toDecimal(undefined)).toBeNull();
    expect(toDecimal("")).toBeNull();
    expect(toDecimal("  ")).toBeNull();
    expect(toDecimal("0")!.isZero()).toBe(true);
    expect(toDecimal(0)!.isZero()).toBe(true);
  });

  it("rejects values that are not numbers", () => {
    expect(() => toDecimal("abc")).toThrow(/Not a number/);
    expect(() => toDecimal(Number.NaN)).toThrow(/Not a number/);
  });

  it("does exact decimal arithmetic", () => {
    expect(toDecimal("0.1")!.plus(toDecimal("0.2")!).toString()).toBe("0.3");
  });

  it("rounds half up, not half to even", () => {
    expect(roundHalfUp(new Dec("66.665"), 2)!.toString()).toBe("66.67");
    expect(roundHalfUp(new Dec("2.5"), 0)!.toString()).toBe("3");
    expect(roundHalfUp(new Dec("3.5"), 0)!.toString()).toBe("4");
    expect(roundHalfUp(null, 2)).toBeNull();
  });

  it("formats whole numbers without decimals and shows a dash for missing", () => {
    expect(formatNumber("80.00")).toBe("80");
    expect(formatNumber("66.666", 2)).toBe("66.67");
    expect(formatNumber("12.5", 1)).toBe("12.5");
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(0)).toBe("0");
  });

  it("has no percentage without a positive maximum", () => {
    expect(percentage(new Dec(10), new Dec(0))).toBeNull();
    expect(percentage(null, new Dec(100))).toBeNull();
    expect(percentage(new Dec(1), new Dec(3))!.toDecimalPlaces(4).toString()).toBe("33.3333");
  });
});

describe("subject totals", () => {
  it("adds monthly (25) and term (75) marks out of 100", () => {
    const total = subjectTotal([
      { obtained: "20", max: "25" },
      { obtained: "60", max: "75" },
    ]);
    expect(total.complete).toBe(true);
    expect(total.obtained!.toString()).toBe("80");
    expect(total.maximum.toString()).toBe("100");
  });

  it("treats a blank as missing and 0 as a real score", () => {
    const withBlank = subjectTotal([
      { obtained: null, max: 25 },
      { obtained: 60, max: 75 },
    ]);
    expect(withBlank.complete).toBe(false);
    expect(withBlank.obtained).toBeNull();
    expect(withBlank.missing).toBe(1);

    const withZero = subjectTotal([
      { obtained: 0, max: 25 },
      { obtained: 0, max: 75 },
    ]);
    expect(withZero.complete).toBe(true);
    expect(withZero.obtained!.toString()).toBe("0");
  });

  it("supports configurable maximum marks", () => {
    const total = subjectTotal([
      { obtained: "10", max: "20" },
      { obtained: "15.5", max: "30" },
    ]);
    expect(total.maximum.toString()).toBe("50");
    expect(total.obtained!.toString()).toBe("25.5");
  });

  it("is incomplete when a subject has no components", () => {
    expect(subjectTotal([]).complete).toBe(false);
  });
});

describe("grading rules", () => {
  it("validates bands", () => {
    expect(() => makeGradingRules({ bands: [], subjectPass: 33, overallPass: 33 })).toThrow(/at least one grade/);
    expect(() => makeGradingRules({ bands: [{ grade: "A", minPercentage: 50 }], subjectPass: 33, overallPass: 33 })).toThrow(/start at 0%/);
    expect(() =>
      makeGradingRules({ bands: [{ grade: "A", minPercentage: 50 }, { grade: "a", minPercentage: 0 }], subjectPass: 33, overallPass: 33 }),
    ).toThrow(/unique/);
    expect(() =>
      makeGradingRules({ bands: [{ grade: "A", minPercentage: 0 }, { grade: "B", minPercentage: 0 }], subjectPass: 33, overallPass: 33 }),
    ).toThrow(/different minimum/);
    expect(() => makeGradingRules({ bands: [{ grade: "A", minPercentage: 101 }], subjectPass: 33, overallPass: 33 })).toThrow(/between 0 and 100/);
    expect(() => rules({ places: 3 })).toThrow(/Decimal places/);
  });

  it("assigns grades at exact boundaries", () => {
    const r = rules();
    expect(gradeFor(r, new Dec(90))!.grade).toBe("A+");
    expect(gradeFor(r, new Dec("89.99"))!.grade).toBe("A");
    expect(gradeFor(r, new Dec(33))!.grade).toBe("E");
    expect(gradeFor(r, new Dec("32.99"))!.grade).toBe("F");
    expect(gradeFor(r, new Dec(0))!.grade).toBe("F");
    expect(gradeFor(r, null)).toBeNull();
  });

  it("rounds the percentage before grading, so what is shown is what is graded", () => {
    // 32.996% is shown as 33.00% and must pass and get grade E.
    expect(gradeFor(rules({ places: 2 }), new Dec("32.996"))!.grade).toBe("E");
    // With 0 decimal places 89.5% is shown as 90% → A+.
    expect(gradeFor(rules({ places: 0 }), new Dec("89.5"))!.grade).toBe("A+");
    // With 2 places 89.994% stays 89.99% → A.
    expect(gradeFor(rules({ places: 2 }), new Dec("89.994"))!.grade).toBe("A");
  });
});

describe("evaluateStudent", () => {
  const subjects = [subject("eng"), subject("math"), subject("sci")];

  it("computes totals, percentage, grade and pass for a complete result", () => {
    const outcome = evaluateStudent(
      subjects,
      { "eng-m": 20, "eng-t": 60, "math-m": 25, "math-t": 75, "sci-m": 10, "sci-t": 30 },
      rules(),
    );
    expect(outcome.complete).toBe(true);
    expect(outcome.grandObtained!.toString()).toBe("220");
    expect(outcome.grandMaximum.toString()).toBe("300");
    expect(outcome.percentage!.toString()).toBe("73.33");
    expect(outcome.grade!.grade).toBe("B");
    expect(outcome.status).toBe("Pass");
    expect(outcome.subjects.map((s) => s.grade?.grade)).toEqual(["A", "A+", "E"]);
  });

  it("is Incomplete — never Pass or Fail — while any mark is missing", () => {
    const outcome = evaluateStudent(subjects, { "eng-m": 20, "eng-t": 60, "math-m": 25, "math-t": 75, "sci-m": 10 }, rules());
    expect(outcome.status).toBe("Incomplete");
    expect(outcome.complete).toBe(false);
    expect(outcome.missing).toBe(1);
    expect(outcome.passed).toBeNull();
    expect(outcome.percentage).toBeNull();
    expect(outcome.grade).toBeNull();
    expect(outcome.grandObtained).toBeNull();
    // Complete subjects still show their own results.
    expect(outcome.subjects[0].percentage!.toString()).toBe("80");
    expect(outcome.subjects[2].passed).toBeNull();
  });

  it("counts a zero as a real score (a student who scored 0 everywhere fails, not incomplete)", () => {
    const marks = Object.fromEntries(subjects.flatMap((s) => s.components.map((c) => [c.id, 0])));
    const outcome = evaluateStudent(subjects, marks, rules());
    expect(outcome.status).toBe("Fail");
    expect(outcome.percentage!.toString()).toBe("0");
  });

  it("fails a student who passes overall but fails a compulsory subject", () => {
    const outcome = evaluateStudent(
      subjects,
      { "eng-m": 25, "eng-t": 75, "math-m": 25, "math-t": 75, "sci-m": 5, "sci-t": 20 },
      rules(),
    );
    expect(outcome.percentage!.toString()).toBe("75");
    expect(outcome.status).toBe("Fail");
    expect(outcome.failedSubjects).toEqual(["sci"]);
  });

  it("passes in that case when the scale does not require every compulsory subject", () => {
    const outcome = evaluateStudent(
      subjects,
      { "eng-m": 25, "eng-t": 75, "math-m": 25, "math-t": 75, "sci-m": 5, "sci-t": 20 },
      rules({ requireAllCompulsoryPass: false }),
    );
    expect(outcome.status).toBe("Pass");
  });

  it("ignores failures in optional (non-compulsory) subjects", () => {
    const withOptional = [subject("eng"), subject("art", { isCompulsory: false })];
    const outcome = evaluateStudent(withOptional, { "eng-m": 20, "eng-t": 60, "art-m": 0, "art-t": 10 }, rules());
    expect(outcome.subjects[1].passed).toBe(false);
    expect(outcome.status).toBe("Pass");
  });

  it("leaves subjects that do not count in the total out of the grand total", () => {
    const withExtra = [subject("eng"), subject("quran", { includeInTotal: false })];
    const outcome = evaluateStudent(withExtra, { "eng-m": 20, "eng-t": 60, "quran-m": 25, "quran-t": 75 }, rules());
    expect(outcome.grandMaximum.toString()).toBe("100");
    expect(outcome.grandObtained!.toString()).toBe("80");
    // …but a missing mark in it still makes the result incomplete.
    const missing = evaluateStudent(withExtra, { "eng-m": 20, "eng-t": 60, "quran-m": 25 }, rules());
    expect(missing.status).toBe("Incomplete");
  });

  it("applies the overall pass percentage after rounding", () => {
    // 99/300 = 33.0% exactly → pass. 98/300 = 32.67% → fail.
    const one = [subject("a"), subject("b"), subject("c")];
    const pass = evaluateStudent(one, { "a-m": 11, "a-t": 22, "b-m": 11, "b-t": 22, "c-m": 11, "c-t": 22 }, rules());
    expect(pass.percentage!.toString()).toBe("33");
    expect(pass.status).toBe("Pass");
    const fail = evaluateStudent(one, { "a-m": 11, "a-t": 22, "b-m": 11, "b-t": 22, "c-m": 11, "c-t": 21 }, rules());
    expect(fail.status).toBe("Fail");
  });

  it("accepts a Map of marks and decimal strings from the database", () => {
    const marks = new Map<string, string | null>([
      ["eng-m", "12.50"],
      ["eng-t", "50.25"],
    ]);
    const outcome = evaluateStudent([subject("eng")], marks, rules());
    expect(outcome.grandObtained!.toString()).toBe("62.75");
    expect(outcome.percentage!.toString()).toBe("62.75");
  });

  it("has no result when no subject counts in the total", () => {
    const outcome = evaluateStudent([subject("x", { includeInTotal: false })], { "x-m": 1, "x-t": 1 }, rules());
    expect(outcome.status).toBe("No result");
    expect(evaluateStudent([], {}, rules()).status).toBe("No result");
  });
});

describe("ranking and statistics", () => {
  it("uses standard competition ranking and skips missing values", () => {
    const ranks = competitionRanks({ a: new Dec(90), b: new Dec(85), c: new Dec(85), d: new Dec(70), e: null });
    expect(ranks).toEqual({ a: 1, b: 2, c: 2, d: 4 });
  });

  it("computes mean and median", () => {
    const values = [new Dec(10), new Dec(20), new Dec(40)];
    expect(mean(values)!.toDecimalPlaces(4).toString()).toBe("23.3333");
    expect(median(values)!.toString()).toBe("20");
    expect(median([new Dec(10), new Dec(20)])!.toString()).toBe("15");
    expect(mean([])).toBeNull();
    expect(median([])).toBeNull();
  });
});
