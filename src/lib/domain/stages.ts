/**
 * Result stages of a term. A term has 1–3 monthly tests and a term examination. Each monthly test is
 * its own stage (own mark sheets, result, remarks and cards): `monthly` (Monthly Test 1, also the only
 * monthly of a one-monthly term), `monthly_2`, `monthly_3`. `term` is, for mark sheets, the remaining
 * components (Term Examination …) and, for results and remarks, the full term result built from every stage.
 *
 * Each monthly stage has its own assessment type: MONTHLY, MONTHLY_2, MONTHLY_3.
 */
export const RESULT_STAGES = ["monthly", "monthly_2", "monthly_3", "term"] as const;
export type ResultStage = (typeof RESULT_STAGES)[number];

export const MONTHLY_STAGES = ["monthly", "monthly_2", "monthly_3"] as const satisfies readonly ResultStage[];
export type MonthlyStage = (typeof MONTHLY_STAGES)[number];
export const MAX_MONTHLY_TESTS = MONTHLY_STAGES.length;

/** Assessment type code of each monthly stage, in order. */
export const MONTHLY_CODES = ["MONTHLY", "MONTHLY_2", "MONTHLY_3"] as const;

export const isMonthlyStage = (stage: ResultStage): stage is MonthlyStage => stage !== "term";
export const isMonthlyCode = (code: string) => (MONTHLY_CODES as readonly string[]).includes(code);

/** The stage a component belongs to: a monthly code → its monthly stage; anything else → `term`. */
export function stageOfCode(code: string): ResultStage {
  const i = (MONTHLY_CODES as readonly string[]).indexOf(code);
  return i < 0 ? "term" : MONTHLY_STAGES[i];
}

/** 1-based number of a monthly stage. */
export const monthlyNumber = (stage: MonthlyStage) => MONTHLY_STAGES.indexOf(stage) + 1;

/** Stages of a term with `monthlyTests` monthly tests, in order: the monthlies, then the term. */
export function stagesForTerm(monthlyTests: number): ResultStage[] {
  const n = Math.min(Math.max(Math.trunc(monthlyTests) || 1, 1), MAX_MONTHLY_TESTS);
  return [...MONTHLY_STAGES.slice(0, n), "term"];
}

/** Read a stage from a URL parameter; unknown or missing → the first monthly. */
export function parseStage(value: unknown): ResultStage {
  return typeof value === "string" && (RESULT_STAGES as readonly string[]).includes(value) ? (value as ResultStage) : "monthly";
}

/**
 * Name of a monthly test: "Monthly Test" when the term has one, "Monthly Test 2" etc. when it has several.
 * `term` → "Term examination" (mark sheets) — results use `resultLabel`.
 */
export function stageLabel(stage: ResultStage, monthlyTests: number): string {
  if (stage === "term") return "Term examination";
  return monthlyTests > 1 ? `Monthly Test ${monthlyNumber(stage)}` : "Monthly Test";
}

/** "Monthly result", "Monthly 2 result", "Term result". */
export function resultLabel(stage: ResultStage, monthlyTests: number): string {
  if (stage === "term") return "Term result";
  return monthlyTests > 1 ? `Monthly ${monthlyNumber(stage)} result` : "Monthly result";
}
