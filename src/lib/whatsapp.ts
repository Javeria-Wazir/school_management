/**
 * WhatsApp click-to-chat links for sending a student's result to their guardian. Nothing is sent by the app:
 * the link opens WhatsApp with the message typed in, and the teacher presses send.
 */

export interface ResultMessageInput {
  schoolName: string;
  className: string;
  termName: string;
  stageLabel: string;
  studentName: string;
  rollNumber: number;
  /** Already formatted: "523.5 / 710", "74.15", "B", "Pass" …, or null when there is no result. */
  total: string | null;
  percentage: string | null;
  grade: string | null;
  status: string;
  position: string | null;
}

export function resultMessage(r: ResultMessageInput): string {
  const lines = [`Assalam-o-Alaikum. ${r.schoolName}`, `${r.stageLabel}, ${r.termName} · ${r.className}`, `${r.studentName} (Roll ${r.rollNumber})`];
  if (r.total && r.percentage) {
    lines.push(`Total: ${r.total} (${r.percentage}%)`);
    if (r.grade) lines.push(`Grade: ${r.grade}`);
  }
  lines.push(`Result: ${r.status}`);
  if (r.position) lines.push(`Class position: ${r.position}`);
  return lines.join("\n");
}

/** `https://wa.me/<digits>?text=…` for an international number such as +923001234567; null without a usable number. */
export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
