import { describe, expect, it } from "vitest";
import { resultMessage, whatsappLink } from "@/lib/whatsapp";

const base = { schoolName: "Cambridge Education System", className: "Class 7 A", termName: "1st Term", stageLabel: "Term result", studentName: "Hijab", rollNumber: 11 };

describe("WhatsApp result message", () => {
  it("summarises a result in a few lines", () => {
    expect(resultMessage({ ...base, total: "644.5 / 760", percentage: "84.80", grade: "A", status: "Pass", position: "2 of 23" })).toBe(
      "Assalam-o-Alaikum. Cambridge Education System\nTerm result, 1st Term · Class 7 A\nHijab (Roll 11)\nTotal: 644.5 / 760 (84.80%)\nGrade: A\nResult: Pass\nClass position: 2 of 23",
    );
  });

  it("leaves out totals when there is no result", () => {
    expect(resultMessage({ ...base, total: null, percentage: null, grade: null, status: "Absent", position: null })).toBe(
      "Assalam-o-Alaikum. Cambridge Education System\nTerm result, 1st Term · Class 7 A\nHijab (Roll 11)\nResult: Absent",
    );
  });

  it("builds a wa.me link from an international number, or none without one", () => {
    expect(whatsappLink("+923001234567", "Hi there")).toBe("https://wa.me/923001234567?text=Hi%20there");
    expect(whatsappLink(null, "Hi")).toBeNull();
    expect(whatsappLink("123", "Hi")).toBeNull();
  });
});
