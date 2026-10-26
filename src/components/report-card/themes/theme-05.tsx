/* eslint-disable @next/next/no-img-element -- static print layout; next/image adds nothing for local SVGs on paper */
// Generated from the approved design "Class 5 result card — Rainbow Bridge", then edited by hand. Keep the markup in step with the design.
import { Fragment } from "react";
import type { CardView } from "../types";

const CSS =
  ".rc-theme-05 .row{display:grid;grid-template-columns:34px minmax(0,2.3fr) repeat(4,minmax(0,1fr)) minmax(0,.95fr) minmax(0,.7fr) minmax(0,.95fr);align-items:center;column-gap:6px}\n.rc-theme-05 .row>div{text-align:center}\n.rc-theme-05 .row>div.left{text-align:left}\n.rc-theme-05 .body-row{border-bottom:1px solid #A9B5C2;min-height:36px}\n.rc-theme-05 .body-row:nth-child(odd){background:#F7F5FC}\n.rc-theme-05 .mx{color:#4F5D6D;font-size:11px;font-weight:600}";

export function Theme05({ v }: { v: CardView }) {
  return (
    <div className="rc-theme-05">
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
            height: "150px",
            background:
              "linear-gradient(135deg, #2C4560 0%, #4A6580 55%, #5E7489 100%)",
            color: "#FFFFFF",
            padding: "26px 44px 0",
            boxSizing: "border-box",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            <img
              src={v.logoSrc}
              alt="School crest"
              style={{ width: "54px", height: "61px" }}
            />
            <div
              style={{ display: "flex", flexDirection: "column", gap: "3px" }}
            >
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "900",
                  lineHeight: "1.1",
                }}
              >
                {v.schoolName}
              </div>
              <div style={{ fontSize: "15px", fontWeight: "700" }}>
                {v.termName} Result Sheet · Session {v.yearName}
              </div>
            </div>
          </div>
          <img
            src="/report-card/m5-rainbow.svg"
            alt="Rainbow Bridge mascot"
            style={{ width: "96px", height: "96px" }}
          />
        </div>
        <div aria-hidden="true" style={{ display: "flex", height: "10px" }}>
          <div style={{ flexGrow: "1", background: v.accent }}></div>
          <div style={{ flexGrow: "1", background: "#3E86C6" }}></div>
          <div style={{ flexGrow: "1", background: "#2EA59B" }}></div>
          <div style={{ flexGrow: "1", background: "#F2B33D" }}></div>
          <div style={{ flexGrow: "1", background: "#E86F51" }}></div>
        </div>

        <div style={{ margin: "20px 44px 0", display: "flex", gap: "16px" }}>
          <div
            style={{
              width: "260px",
              flexShrink: "0",
              borderRadius: "22px",
              border: `2px solid ${v.accentSoft}`,
              background: "#FFFFFF",
              padding: "16px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              textAlign: "center",
            }}
          >
            <img
              src="/report-card/avatar.svg"
              alt="Student photo placeholder"
              style={{
                width: "84px",
                height: "84px",
                borderRadius: "999px",
                border: `4px solid ${v.accent}`,
              }}
            />
            <div style={{ fontSize: "21px", fontWeight: "900" }}>
              {v.student.name}
            </div>
            <div
              style={{
                background: v.accentSoft,
                borderRadius: "999px",
                padding: "4px 12px",
                fontSize: "13px",
                fontWeight: "900",
                color: "#2A1A4F",
              }}
            >
              {v.className} – {v.sectionName} · Rainbow Bridge
            </div>
            <div
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "6px",
                fontSize: "12.5px",
                textAlign: "left",
                marginTop: "4px",
              }}
            >
              <div>
                <div style={{ color: "#5D6B7B", fontWeight: "700" }}>
                  Roll No.
                </div>
                <div style={{ fontWeight: "900" }}>{v.student.roll}</div>
              </div>
              <div>
                <div style={{ color: "#5D6B7B", fontWeight: "700" }}>
                  Student ID
                </div>
                <div style={{ fontWeight: "900" }}>{v.student.id}</div>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <div style={{ color: "#5D6B7B", fontWeight: "700" }}>
                  Guardian
                </div>
                <div style={{ fontWeight: "900" }}>{v.student.guardian}</div>
              </div>
            </div>
          </div>
          <div
            style={{
              flexGrow: "1",
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "12px",
            }}
          >
            <div
              style={{
                borderRadius: "20px",
                background: "#F1F4F8",
                padding: "14px 16px",
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
              <div style={{ fontSize: "30px", fontWeight: "900" }}>
                {v.total}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#5D6B7B",
                }}
              >
                out of {v.maxTotal}
              </div>
            </div>
            <div
              style={{
                borderRadius: "20px",
                background: "#F1F4F8",
                padding: "14px 16px",
              }}
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
              <div style={{ fontSize: "30px", fontWeight: "900" }}>
                {v.pct}%
              </div>
              <div
                style={{
                  marginTop: "6px",
                  height: "8px",
                  borderRadius: "999px",
                  background: "#A2AEBC",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${v.pctBar}%`,
                    height: "8px",
                    background: "linear-gradient(90deg, #2C4560, #4A6580)",
                  }}
                ></div>
              </div>
            </div>
            <div
              style={{
                borderRadius: "20px",
                background: v.accentSoft,
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  fontSize: "12.5px",
                  fontWeight: "800",
                  color: "#3B2E5C",
                }}
              >
                Grade
              </div>
              <div
                style={{
                  fontSize: "30px",
                  fontWeight: "900",
                  color: "#2A1A4F",
                }}
              >
                {v.grade}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "800",
                  color: "#2A1A4F",
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
                padding: "14px 16px",
              }}
            >
              <div style={{ fontSize: "12.5px", fontWeight: "800" }}>
                Result
              </div>
              <div style={{ fontSize: "30px", fontWeight: "900" }}>
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
            margin: "18px 44px 0",
            borderRadius: "18px",
            overflow: "hidden",
            border: "1px solid #A2AEBC",
          }}
        >
          <div
            className="row"
            style={{
              background: "linear-gradient(90deg, #2C4560, #4A6580)",
              color: "#FFFFFF",
              fontSize: "12.5px",
              fontWeight: "800",
              padding: "10px 10px",
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
          <div>
            {v.rows.map((r) => (
              <Fragment key={r.n}>
                <div
                  className="row body-row"
                  style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    padding: "3px 10px",
                  }}
                >
                  <div style={{ color: "#5D6B7B" }}>{r.n}</div>
                  <div
                    className="left"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "9px",
                    }}
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
                  <div style={{ fontWeight: "900", color: "#2A1A4F" }}>
                    {r.grade}
                  </div>
                  <div>
                    {r.pass ? (
                      <>
                        <span
                          style={{
                            whiteSpace: "nowrap",
                            display: "inline-block",
                            padding: "2px 10px",
                            borderRadius: "999px",
                            background: "#E6EEF6",
                            color: "#2C4560",
                            border: "1px solid #4A6580",
                            fontSize: "12px",
                            fontWeight: "800",
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
                            borderRadius: "999px",
                            background: "#FCE3D3",
                            color: "#8A3B0E",
                            border: "1.5px solid #8A3B0E",
                            fontSize: "12px",
                            fontWeight: "800",
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
        </div>

        <div
          style={{
            margin: "16px 44px 0",
            borderRadius: "18px",
            background: "#F7F5FC",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <div
            style={{ fontSize: "13px", fontWeight: "900", color: "#2A1A4F" }}
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

        <div aria-hidden="true" style={{ display: "flex", height: "6px" }}>
          <div style={{ flexGrow: "1", background: v.accent }}></div>
          <div style={{ flexGrow: "1", background: "#3E86C6" }}></div>
          <div style={{ flexGrow: "1", background: "#2EA59B" }}></div>
          <div style={{ flexGrow: "1", background: "#F2B33D" }}></div>
          <div style={{ flexGrow: "1", background: "#E86F51" }}></div>
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
