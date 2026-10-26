/* eslint-disable @next/next/no-img-element -- static print layout; next/image adds nothing for local SVGs on paper */
// Generated from the approved design "Class 3 result card — Ocean Explorers", then edited by hand. Keep the markup in step with the design.
import { Fragment } from "react";
import type { CardView } from "../types";

const CSS =
  ".rc-theme-03 .row{display:grid;grid-template-columns:34px minmax(0,2.3fr) repeat(4,minmax(0,1fr)) minmax(0,.95fr) minmax(0,.7fr) minmax(0,.95fr);align-items:center;column-gap:6px}\n.rc-theme-03 .row>div{text-align:center}\n.rc-theme-03 .row>div.left{text-align:left}\n.rc-theme-03 .mx{color:#4F5D6D;font-size:11px;font-weight:600}";

export function Theme03({ v }: { v: CardView }) {
  return (
    <div className="rc-theme-03">
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
        <div
          style={{
            position: "relative",
            height: "200px",
            background:
              "linear-gradient(180deg, #2C4560 0%, #4A6580 60%, #5E7489 100%)",
            color: "#FFFFFF",
            padding: "28px 44px 0",
            boxSizing: "border-box",
            display: "flex",
            gap: "20px",
            alignItems: "flex-start",
          }}
        >
          <img
            src="/report-card/m3-fish.svg"
            alt="Ocean Explorers mascot"
            style={{ width: "96px", height: "96px" }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              flexGrow: "1",
            }}
          >
            <div
              style={{ fontSize: "29px", fontWeight: "900", lineHeight: "1.1" }}
            >
              {v.schoolName}
            </div>
            <div style={{ fontSize: "15px", fontWeight: "700" }}>
              {v.termName} Result Sheet · Session {v.yearName}
            </div>
            <div
              style={{ fontSize: "18px", fontWeight: "900", marginTop: "6px" }}
            >
              {v.className} ·{" "}
              <span style={{ color: v.accentLight }}>Ocean Explorers</span>
            </div>
          </div>
          <img
            src={v.logoSrc}
            alt="School crest"
            style={{ width: "56px", height: "63px" }}
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 794 70"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              left: "0",
              bottom: "-1px",
              width: "794px",
              height: "70px",
            }}
          >
            <path
              d="M0 30 C 100 60, 200 0, 300 26 S 500 60, 600 24 S 740 10, 794 30 L 794 70 L 0 70 Z"
              fill={v.accentSoft}
            />
            <path
              d="M0 44 C 120 70, 240 20, 380 44 S 640 70, 794 40 L 794 70 L 0 70 Z"
              fill="#FFFFFF"
            />
          </svg>
        </div>

        <div
          style={{
            margin: "0 44px",
            display: "flex",
            gap: "16px",
            alignItems: "center",
            padding: "6px 0 4px",
          }}
        >
          <img
            src="/report-card/avatar.svg"
            alt="Student photo placeholder"
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "22px",
              border: `3px solid ${v.accent}`,
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              flexGrow: "1",
            }}
          >
            <div style={{ fontSize: "24px", fontWeight: "900" }}>
              {v.student.name}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: "10px",
                fontSize: "13px",
              }}
            >
              <div>
                <span style={{ color: "#5D6B7B", fontWeight: "700" }}>
                  Class{" "}
                </span>
                <b>
                  {v.classNo} – {v.sectionName}
                </b>
              </div>
              <div>
                <span style={{ color: "#5D6B7B", fontWeight: "700" }}>
                  Roll No.{" "}
                </span>
                <b>{v.student.roll}</b>
              </div>
              <div>
                <span style={{ color: "#5D6B7B", fontWeight: "700" }}>ID </span>
                <b>{v.student.id}</b>
              </div>
              <div>
                <span style={{ color: "#5D6B7B", fontWeight: "700" }}>
                  Guardian{" "}
                </span>
                <b>{v.student.guardian}</b>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            margin: "16px 44px 0",
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          <div
            className="row"
            style={{
              color: "#2C4560",
              fontSize: "12.5px",
              fontWeight: "900",
              padding: "4px 12px",
            }}
          >
            <div>#</div>
            <div className="left">Subject</div>
            <div>Monthly</div>
            <div>Term</div>
            <div>Obtained</div>
            <div>Out of</div>
            <div>%</div>
            <div>Grade</div>
            <div>Result</div>
          </div>
          {v.rows.map((r) => (
            <Fragment key={r.n}>
              <div
                className="row"
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  padding: "6px 12px",
                  minHeight: "30px",
                  borderRadius: "14px",
                  background: "#F1F5F9",
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "999px",
                    background: v.accent,
                    color: "#072B2E",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "900",
                  }}
                >
                  {r.n}
                </div>
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
                <div>
                  {r.m}
                  <span className="mx">/{r.mm}</span>
                </div>
                <div>
                  {r.t}
                  <span className="mx">/{r.tm}</span>
                </div>
                <div style={{ fontWeight: "900" }}>{r.ob}</div>
                <div style={{ color: "#5D6B7B" }}>{r.max}</div>
                <div>{r.pct}</div>
                <div style={{ fontWeight: "900" }}>{r.grade}</div>
                <div>
                  {r.pass ? (
                    <>
                      <span
                        style={{
                            whiteSpace: "nowrap",
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: "8px",
                          background: "#FFFFFF",
                          color: "#2C4560",
                          fontSize: "12px",
                          fontWeight: "900",
                          border: "1px solid #4A6580",
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
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: "8px",
                          background: "#FCE3D3",
                          color: "#8A3B0E",
                          border: "1.5px solid #8A3B0E",
                          fontSize: "12px",
                          fontWeight: "900",
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
            display: "flex",
            gap: "16px",
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              width: "150px",
              flexShrink: "0",
              borderRadius: "22px",
              background: "#F1F5F9",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "12px 0",
            }}
          >
            <div
              style={{
                width: "96px",
                height: "96px",
                borderRadius: "999px",
                background: `conic-gradient(#2C4560 0deg ${v.pctDeg}deg, #E2E8EF ${v.pctDeg}deg 360deg)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "74px",
                  height: "74px",
                  borderRadius: "999px",
                  background: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "17px",
                  fontWeight: "900",
                }}
              >
                {v.pct}%
              </div>
            </div>
            <div
              style={{
                fontSize: "12.5px",
                fontWeight: "800",
                color: "#5D6B7B",
              }}
            >
              Percentage
            </div>
          </div>
          <div
            style={{
              flexGrow: "1",
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "12px",
            }}
          >
            <div
              style={{
                borderRadius: "20px",
                border: "2px solid #A2AEBC",
                padding: "14px",
              }}
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
              <div style={{ fontSize: "26px", fontWeight: "900" }}>
                {v.total}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#5D6B7B",
                  fontWeight: "700",
                }}
              >
                out of {v.maxTotal}
              </div>
            </div>
            <div
              style={{
                borderRadius: "20px",
                border: "2px solid #A2AEBC",
                padding: "14px",
              }}
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
              <div style={{ fontSize: "26px", fontWeight: "900" }}>
                {v.grade}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#3B4A5C",
                  fontWeight: "800",
                }}
              >
                {v.gradeRemark}
              </div>
            </div>
            <div
              style={{
                borderRadius: "20px",
                background: "linear-gradient(135deg, #2C4560, #4A6580)",
                color: "#FFFFFF",
                padding: "14px",
              }}
            >
              <div style={{ fontSize: "12.5px", fontWeight: "800" }}>
                Result
              </div>
              <div style={{ fontSize: "26px", fontWeight: "900" }}>
                {v.result}
              </div>
              <div style={{ fontSize: "13px", fontWeight: "700" }}>
                {v.resultNote}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            margin: "16px 44px 0",
            borderLeft: "0",
            borderRadius: "18px",
            background: v.accentSoft,
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <div
            style={{ fontSize: "13px", fontWeight: "900", color: "#2C4560" }}
          >
            Class teacher’s remarks
          </div>
          <div style={{ fontSize: "14px", lineHeight: "1.5" }}>{v.remarks}</div>
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
              style={{ height: "46px", borderBottom: "1.5px solid #4F5D6D" }}
            ></div>
            <div
              style={{ fontSize: "13px", fontWeight: "800", color: "#3B4A5C" }}
            >
              Class Teacher
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div
              style={{ height: "46px", borderBottom: "1.5px solid #4F5D6D" }}
            ></div>
            <div
              style={{ fontSize: "13px", fontWeight: "800", color: "#3B4A5C" }}
            >
              Principal
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div
              style={{ height: "46px", borderBottom: "1.5px solid #4F5D6D" }}
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
            position: "relative",
            height: "48px",
            background: "linear-gradient(0deg, #2C4560, #4A6580)",
            color: "#FFFFFF",
            padding: "0 44px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12.5px",
            fontWeight: "700",
          }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 794 18"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              left: "0",
              top: "-1px",
              width: "794px",
              height: "18px",
            }}
          >
            <path
              d="M0 0 L 794 0 L 794 6 C 660 18, 520 0, 397 8 S 120 18, 0 6 Z"
              fill="#FFFFFF"
            />
          </svg>
          {v.official ? (
            <>
              <span style={{ position: "relative" }}>
                Official result · {v.approvalText}
              </span>
            </>
          ) : null}
          {v.provisional ? (
            <>
              <span style={{ position: "relative" }}>
                PROVISIONAL · Awaiting final approval — not an official result
              </span>
            </>
          ) : null}
          <span style={{ position: "relative" }}>Printed {v.printedOn}</span>
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
