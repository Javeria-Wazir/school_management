/* eslint-disable @next/next/no-img-element -- static print layout; next/image adds nothing for local SVGs on paper */
// Generated from the approved design "Class 4 result card — Sky Rockets", then edited by hand. Keep the markup in step with the design.
import { Fragment } from "react";
import type { CardView } from "../types";

const CSS =
  ".rc-theme-04 .row{display:grid;grid-template-columns:34px minmax(0,2.2fr) repeat(4,minmax(0,.9fr)) minmax(0,1.5fr) minmax(0,.6fr) minmax(0,.9fr);align-items:center;column-gap:6px}\n.rc-theme-04 .row>div{text-align:center}\n.rc-theme-04 .row>div.left{text-align:left}\n.rc-theme-04 .body-row{border-bottom:1px solid #A9B5C2;min-height:38px}\n.rc-theme-04 .mx{color:#4F5D6D;font-size:11px;font-weight:600}\n.rc-theme-04.rc-monthly .row{grid-template-columns:34px minmax(0,2.2fr) repeat(2,minmax(0,.9fr)) minmax(0,1.5fr) minmax(0,.6fr) minmax(0,.9fr)}\n.rc-theme-04.rc-monthly [data-col=component]{display:none}";

export function Theme04({ v }: { v: CardView }) {
  return (
    <div className={v.monthlyOnly ? "rc-theme-04 rc-monthly" : "rc-theme-04"}>
      <style>{CSS}</style>
      <div
        style={{
          width: "794px",
          height: "1123px",
          boxSizing: "border-box",
          position: "relative",
          overflow: "hidden",
          filter: v.bw,
          background: "#FFFFFF",
          fontFamily: "var(--rc-font-nunito), sans-serif",
          color: "#1E2A38",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ position: "relative", height: "300px" }}>
          <div
            style={{
              position: "absolute",
              inset: "0",
              background:
                "linear-gradient(120deg, #2C4560 0%, #4A6580 50%, #5E7489 100%)",
              clipPath: "polygon(0 0, 100% 0, 100% 72%, 0 100%)",
            }}
          ></div>
          <div
            style={{
              position: "absolute",
              right: "-40px",
              top: "-40px",
              width: "220px",
              height: "220px",
              borderRadius: "999px",
              background: v.accentSoft,
            }}
          ></div>
          <div
            style={{
              position: "relative",
              padding: "30px 44px 0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              color: "#FFFFFF",
            }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <div
                style={{ display: "flex", gap: "12px", alignItems: "center" }}
              >
                <img
                  src={v.logoSrc}
                  alt="School crest"
                  style={{ width: "44px", height: "50px" }}
                />
                <div style={{ fontSize: "27px", fontWeight: "900" }}>
                  {v.schoolName}
                </div>
              </div>
              <div style={{ fontSize: "15px", fontWeight: "700" }}>
                {v.termName} Result Sheet · Session {v.yearName}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <img
                src="/report-card/m4-rocket.svg"
                alt="Sky Rockets mascot"
                style={{ width: "92px", height: "92px" }}
              />
              <div
                style={{
                  background: v.accent,
                  color: "#3A1206",
                  borderRadius: "999px",
                  padding: "4px 12px",
                  fontSize: "13px",
                  fontWeight: "900",
                }}
              >
                {v.className} · Sky Rockets
              </div>
            </div>
          </div>
          <div
            style={{
              position: "relative",
              margin: "6px 44px 0",
              display: "flex",
              gap: "16px",
              alignItems: "center",
              color: "#FFFFFF",
            }}
          >
            <img
              src="/report-card/avatar.svg"
              alt="Student photo placeholder"
              style={{
                width: "70px",
                height: "70px",
                borderRadius: "999px",
                border: "3px solid #FFFFFF",
              }}
            />
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <div style={{ fontSize: "24px", fontWeight: "900" }}>
                {v.student.name}
              </div>
              <div style={{ fontSize: "13.5px", fontWeight: "700" }}>
                {v.className} – {v.sectionName} · Roll No. {v.student.roll} · ID{" "}
                {v.student.id} · Guardian: {v.student.guardian}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            margin: "-18px 44px 0",
            position: "relative",
            background: "#FFFFFF",
            borderRadius: "16px",
            boxShadow: "0 6px 20px rgba(44, 69, 96, 0.12)",
            padding: "4px 6px 8px",
          }}
        >
          <div
            className="row"
            style={{
              fontSize: "12.5px",
              fontWeight: "900",
              color: "#2C4560",
              padding: "10px 8px",
              borderBottom: "2px solid #2C4560",
            }}
          >
            <div>#</div>
            <div className="left">Subject</div>
            <div data-col="component">Monthly</div>
            <div data-col="component">Term</div>
            <div>Obtained</div>
            <div>Out of</div>
            <div className="left">Percentage</div>
            <div>Grade</div>
            <div>Result</div>
          </div>
          {v.rows.map((r) => (
            <Fragment key={r.n}>
              <div
                className="row body-row"
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  padding: "4px 8px",
                }}
              >
                <div style={{ color: "#5D6B7B" }}>{r.n}</div>
                <div
                  className="left"
                  style={{ display: "flex", alignItems: "center", gap: "9px" }}
                >
                  <img
                    src={r.icon}
                    alt=""
                    style={{ width: "20px", height: "20px" }}
                  />
                  {r.name}
                </div>
                <div data-col="component">
                  {r.m}
                  <span className="mx">/{r.mm}</span>
                </div>
                <div data-col="component">
                  {r.t}
                  <span className="mx">/{r.tm}</span>
                </div>
                <div style={{ fontWeight: "900" }}>{r.ob}</div>
                <div style={{ color: "#5D6B7B" }}>{r.max}</div>
                <div
                  className="left"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <div
                    style={{
                      flexGrow: "1",
                      height: "8px",
                      borderRadius: "999px",
                      background: "#A9B5C2",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${r.bar}%`,
                        height: "8px",
                        background: "linear-gradient(90deg, #2C4560, #4A6580)",
                      }}
                    ></div>
                  </div>
                  <span
                    style={{
                      fontSize: "12.5px",
                      width: "44px",
                      textAlign: "right",
                    }}
                  >
                    {r.pct}
                  </span>
                </div>
                <div style={{ fontWeight: "900" }}>{r.grade}</div>
                <div>
                  {r.pass ? (
                    <>
                      <span
                        style={{
                            whiteSpace: "nowrap",
                          fontSize: "12px",
                          fontWeight: "900",
                          color: "#2C4560",
                        }}
                      >
                        ✓ Pass
                      </span>
                    </>
                  ) : null}
                  {r.fail ? (
                    <>
                      <span
                        style={{
                            whiteSpace: "nowrap",
                          fontSize: "12px",
                          fontWeight: "900",
                          color: "#8A3B0E",
                        }}
                      >
                        ✗ Fail
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </Fragment>
          ))}
        </div>

        <div
          style={{
            margin: "18px 44px 0",
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            borderRadius: "16px",
            overflow: "hidden",
            border: "1px solid #A2AEBC",
          }}
        >
          <div
            style={{ padding: "12px 14px", borderRight: "1px solid #A2AEBC" }}
          >
            <div
              style={{
                fontSize: "12.5px",
                fontWeight: "800",
                color: "#5D6B7B",
              }}
            >
              Grand total
            </div>
            <div style={{ fontSize: "23px", fontWeight: "900" }}>
              {v.total}{" "}
              <span style={{ fontSize: "14px", color: "#5D6B7B" }}>
                / {v.maxTotal}
              </span>
            </div>
          </div>
          <div
            style={{ padding: "12px 14px", borderRight: "1px solid #A2AEBC" }}
          >
            <div
              style={{
                fontSize: "12.5px",
                fontWeight: "800",
                color: "#5D6B7B",
              }}
            >
              Percentage
            </div>
            <div style={{ fontSize: "23px", fontWeight: "900" }}>{v.pct}%</div>
          </div>
          <div
            style={{ padding: "12px 14px", borderRight: "1px solid #A2AEBC" }}
          >
            <div
              style={{
                fontSize: "12.5px",
                fontWeight: "800",
                color: "#5D6B7B",
              }}
            >
              Grade
            </div>
            <div style={{ fontSize: "23px", fontWeight: "900" }}>
              {v.grade}{" "}
              <span style={{ fontSize: "13px", color: "#3B4A5C" }}>
                {v.gradeRemark}
              </span>
            </div>
          </div>
          <div
            style={{
              padding: "12px 14px",
              background: v.accent,
              color: "#3A1206",
            }}
          >
            <div style={{ fontSize: "12.5px", fontWeight: "800" }}>Result</div>
            <div style={{ fontSize: "23px", fontWeight: "900" }}>
              {v.result}
            </div>
            {v.showPosition ? <div style={{ fontSize: "12.5px", fontWeight: "800", marginTop: "2px" }}>Position {v.position}</div> : null}
          </div>
        </div>

        <div
          style={{
            margin: "16px 44px 0",
            display: "flex",
            gap: "14px",
            alignItems: "flex-start",
            border: "2px solid #A9B5C2",
            borderRadius: "16px",
            padding: "12px 16px",
          }}
        >
          <img
            src="/report-card/m4-rocket.svg"
            alt=""
            style={{ width: "32px", height: "32px" }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div
              style={{ fontSize: "13px", fontWeight: "900", color: "#2C4560" }}
            >
              Class teacher’s remarks
            </div>
            <div style={{ fontSize: "14px", lineHeight: "1.5" }}>
              {v.remarks}
            </div>
          </div>
        </div>

        <div
          style={{
            margin: "10px 44px 0",
            fontSize: "11.5px",
            color: "#5D6B7B",
            fontWeight: "700",
          }}
        >
          Grades: {v.legend}. {v.passRule}
        </div>

        <div
          style={{
            margin: "auto 44px 0",
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "28px",
            paddingBottom: "14px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div
              style={{ height: "44px", borderBottom: "1.5px solid #4F5D6D" }}
            ></div>
            <div
              style={{ fontSize: "13px", fontWeight: "800", color: "#3B4A5C" }}
            >
              Class Teacher
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div
              style={{ height: "44px", borderBottom: "1.5px solid #4F5D6D" }}
            ></div>
            <div
              style={{ fontSize: "13px", fontWeight: "800", color: "#3B4A5C" }}
            >
              Principal
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div
              style={{ height: "44px", borderBottom: "1.5px solid #4F5D6D" }}
            ></div>
            <div
              style={{ fontSize: "13px", fontWeight: "800", color: "#3B4A5C" }}
            >
              Parent / Guardian
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#2C4560",
            color: "#FFFFFF",
            padding: "10px 44px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12.5px",
            fontWeight: "700",
            borderTop: `5px solid ${v.accent}`,
          }}
        >
          {v.official ? (
            <>
              <span>Official result · {v.approvalText}</span>
            </>
          ) : null}
          {v.provisional ? (
            <>
              <span>
                PROVISIONAL · Awaiting final approval — not an official result
              </span>
            </>
          ) : null}
          <span>Printed {v.printedOn}</span>
        </div>

        {v.provisional ? (
          <>
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "0",
                top: "0",
                width: "794px",
                height: "1123px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  transform: "rotate(-30deg)",
                  fontSize: "120px",
                  fontWeight: "900",
                  letterSpacing: "8px",
                  color: "rgba(44, 69, 96, 0.14)",
                }}
              >
                PROVISIONAL
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
