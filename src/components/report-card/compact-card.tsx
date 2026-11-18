/* eslint-disable @next/next/no-img-element -- static print layout; next/image adds nothing for local SVGs on paper */
/**
 * Compact result card for printing two per A4 page: laid out at true A5 size (148.5 × 210 mm) in mm and pt,
 * so nothing is scaled down. One layout for every class, in the class theme's accent colour; the full A4
 * designs (themes/theme-01 … 10) are used when printing one card per page.
 * Black-and-white safe: all text is dark, colour only marks bars and tints, and pass/fail carry ✓/✗ and words.
 */
import type { CardView } from "./types";

const CSS = `
.rc-slot .rc-compact, .rc-slot .rc-compact * { box-sizing: border-box; }
.rc-compact { position: relative; width: 148.5mm; height: 210mm; padding: 7mm 7mm 5mm; display: flex; flex-direction: column;
  font-family: var(--rc-font-inter), system-ui, sans-serif; color: #17202b; background: #fff; overflow: hidden; }
.rc-compact .hd { display: flex; align-items: center; gap: 3mm; padding-bottom: 2.5mm; border-bottom: 1.2mm solid var(--acc); }
.rc-compact .hd img { width: 12mm; height: 12mm; object-fit: contain; flex: none; }
.rc-compact .school { font-family: var(--rc-font-poppins), sans-serif; font-size: 14pt; font-weight: 700; line-height: 1.15; }
.rc-compact .sub { font-size: 8.5pt; font-weight: 600; color: #3a4757; margin-top: 0.6mm; }
.rc-compact .who { display: flex; justify-content: space-between; align-items: flex-end; gap: 3mm; margin-top: 3.5mm; }
.rc-compact .name { font-size: 13.5pt; font-weight: 800; line-height: 1.2; }
.rc-compact .meta { font-size: 8.5pt; color: #3a4757; margin-top: 0.8mm; line-height: 1.45; }
.rc-compact .meta b { color: #17202b; font-weight: 700; }
.rc-compact table { width: 100%; border-collapse: collapse; margin-top: 3.5mm; font-variant-numeric: tabular-nums; }
.rc-compact th { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2pt; text-align: center;
  background: var(--soft); padding: 1.6mm 1mm; border-bottom: 0.3mm solid #8d98a5; }
.rc-compact td { font-size: 10pt; text-align: center; padding: 1.25mm 1mm; border-bottom: 0.2mm solid #c9d0d8; }
.rc-compact th.l, .rc-compact td.l { text-align: left; }
.rc-compact td.subj { font-weight: 600; }
.rc-compact td.ob { font-weight: 700; }
.rc-compact .mx { font-size: 7.5pt; color: #4d5a69; }
.rc-compact .res { font-size: 8.5pt; font-weight: 700; white-space: nowrap; }
.rc-compact .opt { font-size: 7.5pt; color: #4d5a69; white-space: nowrap; }
.rc-compact .sum { display: grid; grid-template-columns: 1.25fr 1fr 0.8fr 1.25fr; margin-top: 3.5mm; border: 0.3mm solid #8d98a5; }
.rc-compact .sum > div { padding: 1.8mm 1.5mm; text-align: center; border-right: 0.3mm solid #8d98a5; }
.rc-compact .sum > div:last-child { border-right: none; background: var(--soft); }
.rc-compact .k { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3pt; color: #3a4757; }
.rc-compact .v { font-size: 13pt; font-weight: 800; margin-top: 0.5mm; white-space: nowrap; }
.rc-compact .v small { font-size: 8.5pt; font-weight: 600; color: #3a4757; }
.rc-compact .note { font-size: 8pt; color: #3a4757; margin-top: 0.4mm; }
/* Up to 8 subjects: the space is there, so rows and text are larger. */
.rc-compact.roomy .name { font-size: 15pt; }
.rc-compact.roomy .meta { font-size: 9pt; }
.rc-compact.roomy table { margin-top: 4.5mm; }
.rc-compact.roomy th { font-size: 8pt; padding: 2mm 1mm; }
.rc-compact.roomy td { font-size: 11pt; padding: 2.1mm 1mm; }
.rc-compact.roomy .mx { font-size: 8pt; }
.rc-compact.roomy .res { font-size: 9pt; }
.rc-compact.roomy .sum { margin-top: 4.5mm; }
.rc-compact.roomy .sum > div { padding: 2.4mm 1.5mm; }
.rc-compact.roomy .v { font-size: 15pt; }
.rc-compact .remarks { margin-top: 3mm; font-size: 9pt; line-height: 1.4; border-left: 1mm solid var(--acc); padding: 1.2mm 2.5mm; background: #f6f7f9; }
.rc-compact .remarks .k { display: block; margin-bottom: 0.4mm; }
/* No typed remarks: ruled lines to write on by hand. */
.rc-compact .remarks .line { height: 6.5mm; border-bottom: 0.2mm solid #b7c0ca; }
.rc-compact .rules { margin-top: 2.5mm; font-size: 7pt; line-height: 1.4; color: #3a4757; }
.rc-compact .sign { margin-top: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 14mm; padding-top: 4mm; }
.rc-compact .sign div { border-top: 0.3mm solid #17202b; padding-top: 1mm; text-align: center; font-size: 8pt; font-weight: 600; }
.rc-compact .ft { display: flex; justify-content: space-between; gap: 3mm; margin-top: 2.5mm; padding-top: 1.5mm; border-top: 0.2mm solid #c9d0d8;
  font-size: 7pt; font-weight: 600; color: #3a4757; }
.rc-compact .wm { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
.rc-compact .wm span { transform: rotate(-32deg); font-family: var(--rc-font-playfair), serif; font-size: 44pt; font-weight: 800;
  letter-spacing: 4pt; color: rgba(40, 52, 66, 0.12); }
`;

export function CompactCard({ v }: { v: CardView }) {
  const showComponents = !v.monthlyOnly;
  const anyGrade = v.rows.some((r) => r.grade);
  const anyStatus = v.rows.some((r) => r.showPass || r.showFail || r.optional);
  // Science / Computer group only; "General group" says nothing on a primary-class card.
  const group = v.streamLabel && v.streamLabel !== "General group" ? v.streamLabel : "";
  // Up to 8 subjects fit with taller rows and larger text; 9–11 use the tighter spacing.
  const roomy = v.rows.length <= 8;
  return (
    <div className={roomy ? "rc-compact roomy" : "rc-compact"} style={{ filter: v.bw, ["--acc" as string]: v.accent, ["--soft" as string]: v.accentSoft }}>
      <style>{CSS}</style>
      <div className="hd">
        <img src={v.logoSrc} alt="" />
        <div>
          <div className="school">{v.schoolName}</div>
          <div className="sub">
            {v.termName} · Session {v.yearName}
          </div>
        </div>
      </div>

      <div className="who">
        <div>
          <div className="name">{v.student.name}</div>
          <div className="meta">
            <b>
              {v.className} – {v.sectionName}
            </b>
            {group ? ` · ${group}` : ""} · Roll No. <b>{v.student.roll}</b> · ID {v.student.id}
            {v.student.guardian && v.student.guardian !== "—" ? (
              <>
                <br />
                Guardian: {v.student.guardian}
              </>
            ) : null}
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th className="l">Subject</th>
            {showComponents ? (
              <>
                <th>Monthly</th>
                <th>Term</th>
              </>
            ) : null}
            <th>Marks</th>
            <th>%</th>
            {anyGrade ? <th>Grade</th> : null}
            {anyStatus ? <th>Result</th> : null}
          </tr>
        </thead>
        <tbody>
          {v.rows.map((r) => (
            <tr key={r.n}>
              <td className="l subj">{r.name}</td>
              {showComponents ? (
                <>
                  <td>
                    {r.m}
                    <span className="mx">/{r.mm}</span>
                  </td>
                  <td>
                    {r.t}
                    <span className="mx">/{r.tm}</span>
                  </td>
                </>
              ) : null}
              <td className="ob">
                {r.ob}
                <span className="mx">/{r.max}</span>
              </td>
              <td>{r.pct}</td>
              {anyGrade ? <td style={{ fontWeight: 700 }}>{r.grade}</td> : null}
              {anyStatus ? (
                <td>
                  {r.showPass ? <span className="res">✓ Pass</span> : null}
                  {r.showFail ? <span className="res">✗ Fail</span> : null}
                  {r.optional ? <span className="opt">Not in total</span> : null}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="sum">
        <div>
          <div className="k">Total</div>
          <div className="v">
            {v.total} <small>/ {v.maxTotal}</small>
          </div>
        </div>
        <div>
          <div className="k">Percentage</div>
          <div className="v">{v.pct === "—" ? "—" : `${v.pct}%`}</div>
        </div>
        <div>
          <div className="k">Grade</div>
          <div className="v">{v.grade}</div>
          {v.gradeRemark ? <div className="note">{v.gradeRemark}</div> : null}
        </div>
        <div>
          <div className="k">Result</div>
          <div className="v">
            {v.passed ? "✓ " : v.failed ? "✗ " : ""}
            {v.result}
          </div>
          <div className="note">{v.showPosition ? `Position ${v.position}` : v.resultNote}</div>
        </div>
      </div>

      <div className="remarks">
        <span className="k">Class teacher&apos;s remarks</span>
        {v.remarks ? (
          v.remarks
        ) : (
          <>
            <div className="line" />
            {roomy ? <div className="line" /> : null}
          </>
        )}
      </div>

      <div className="rules">
        {v.failed && v.failedList ? (
          <>
            <b>Not passed in:</b> {v.failedList}.{" "}
          </>
        ) : null}
        {sentence(v.passRuleShort)}. Grades: {v.legend}.
      </div>

      <div className="sign">
        <div>Class Teacher</div>
        <div>Principal</div>
      </div>
      <div className="ft">
        <span>{v.official ? `Official result · ${v.approvalText}` : "PROVISIONAL · awaiting final approval"}</span>
        <span>Printed {v.printedOn}</span>
      </div>

      {v.provisional ? (
        <div className="wm" aria-hidden="true">
          <span>PROVISIONAL</span>
        </div>
      ) : null}
    </div>
  );
}

/** "pass mark 33% …" → "Pass mark 33% …" (it starts a sentence here). */
function sentence(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}
