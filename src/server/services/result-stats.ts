/**
 * Subject analysis of a compiled class result: per subject, how the class did (average, highest and lowest
 * percentage, pass rate, top scorer). Counted like positions: only students with a complete result for the
 * subject; students absent for the whole result, new admissions and subjects not taken are left out.
 */
import { Dec, roundHalfUp } from "@/lib/domain/calculations";
import type { ClassResultView } from "./results";

export interface SubjectStats {
  subjectId: string;
  name: string;
  counted: number;
  average: Dec | null;
  highest: Dec | null;
  lowest: Dec | null;
  passed: number;
  passRate: Dec | null;
  topStudents: string[];
}

export function subjectStatistics(result: ClassResultView): SubjectStats[] {
  const places = result.rules.places;
  return result.subjects.map((subject) => {
    const scored = result.students.flatMap((student) => {
      if (student.absentAll || student.newAdmissionAll) return [];
      const outcome = student.outcome.subjects.find((o) => o.subject.id === subject.id);
      return outcome?.percentage ? [{ name: student.fullName, pct: outcome.percentage, passed: outcome.passed === true }] : [];
    });
    if (scored.length === 0) {
      return { subjectId: subject.id, name: subject.name, counted: 0, average: null, highest: null, lowest: null, passed: 0, passRate: null, topStudents: [] };
    }
    const highest = Dec.max(...scored.map((s) => s.pct));
    const passed = scored.filter((s) => s.passed).length;
    return {
      subjectId: subject.id,
      name: subject.name,
      counted: scored.length,
      average: roundHalfUp(scored.reduce((sum, s) => sum.plus(s.pct), new Dec(0)).dividedBy(scored.length), places),
      highest,
      lowest: Dec.min(...scored.map((s) => s.pct)),
      passed,
      passRate: roundHalfUp(new Dec(passed).times(100).dividedBy(scored.length), places),
      topStudents: scored.filter((s) => s.pct.eq(highest)).map((s) => s.name),
    };
  });
}
