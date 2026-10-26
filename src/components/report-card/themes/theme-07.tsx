/* eslint-disable @next/next/no-img-element -- static print layout; next/image adds nothing for local SVGs on paper */
// Generated from the approved design "Class 7 result card — Explorers", then edited by hand. Keep the markup in step with the design.
import { Fragment } from "react";
import type { CardView } from "../types";

const CSS =
  ".rc-theme-07 .row{display:grid;grid-template-columns:24px minmax(0,2fr) repeat(4,minmax(0,.9fr)) minmax(0,.95fr) minmax(0,.6fr) minmax(0,.85fr);align-items:center;column-gap:4px}\n.rc-theme-07 .row>div{text-align:center}\n.rc-theme-07 .row>div.left{text-align:left}\n.rc-theme-07 .body-row{border-bottom:1px solid #A9B5C2;min-height:38px}\n.rc-theme-07 .mx{color:#4F5D6D;font-size:10.5px;font-weight:500}\n.rc-theme-07.rc-monthly .row{grid-template-columns:24px minmax(0,2fr) repeat(2,minmax(0,.9fr)) minmax(0,.95fr) minmax(0,.6fr) minmax(0,.85fr)}\n.rc-theme-07.rc-monthly [data-col=component]{display:none}";

export function Theme07({ v }: { v: CardView }) {
  return (
    <div className={v.monthlyOnly ? "rc-theme-07 rc-monthly" : "rc-theme-07"}>
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
          fontFamily: "var(--rc-font-inter), sans-serif",
          color: "#1B2633",
          display: "flex",
        }}
      >
        <div
          style={{
            width: "196px",
            flexShrink: "0",
            background:
              "linear-gradient(180deg, #2C4560 0%, #4A6580 55%, #5E7489 100%)",
            color: "#FFFFFF",
            padding: "30px 18px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "14px",
            textAlign: "center",
          }}
        >
          <img
            src={v.logoSrc}
            alt="School crest"
            style={{ width: "56px", height: "63px" }}
          />
          <div
            style={{
              fontFamily: "var(--rc-font-poppins), sans-serif",
              fontSize: "17px",
              fontWeight: "700",
              lineHeight: "1.25",
            }}
          >
            {v.schoolName}
          </div>
          <div
            style={{
              width: "100%",
              height: "1px",
              background: "rgba(255, 255, 255, 0.35)",
            }}
          ></div>
          <img
            src="/report-card/avatar.svg"
            alt="Student photo placeholder"
            style={{
              width: "104px",
              height: "104px",
              borderRadius: "999px",
              border: "4px solid #FFFFFF",
            }}
          />
          <div
            style={{
              fontFamily: "var(--rc-font-poppins), sans-serif",
              fontSize: "19px",
              fontWeight: "700",
            }}
          >
            {v.student.name}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              width: "100%",
              textAlign: "left",
              fontSize: "12.5px",
            }}
          >
            <div>
              <div style={{ opacity: "0.85" }}>Class</div>
              <div style={{ fontWeight: "700", fontSize: "14px" }}>
                {v.classNo} – {v.sectionName}
              </div>
            </div>
            <div>
              <div style={{ opacity: "0.85" }}>Roll No.</div>
              <div style={{ fontWeight: "700", fontSize: "14px" }}>
                {v.student.roll}
              </div>
            </div>
            <div>
              <div style={{ opacity: "0.85" }}>Student ID</div>
              <div style={{ fontWeight: "700", fontSize: "14px" }}>
                {v.student.id}
              </div>
            </div>
            <div>
              <div style={{ opacity: "0.85" }}>Guardian</div>
              <div style={{ fontWeight: "700", fontSize: "14px" }}>
                {v.student.guardian}
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <img
              src="/report-card/m7-globe.svg"
              alt="Explorers mascot"
              style={{ width: "84px", height: "84px" }}
            />
            <div
              style={{
                background: "#FFFFFF",
                color: "#1A4D43",
                borderRadius: "999px",
                padding: "4px 12px",
                fontSize: "12.5px",
                fontWeight: "700",
              }}
            >
              Explorers
            </div>
          </div>
        </div>

        <div
          style={{
            flexGrow: "1",
            minWidth: "0",
            padding: "30px 28px 22px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              borderBottom: `3px solid ${v.accent}`,
              paddingBottom: "12px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#5D6B7B",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                }}
              >
                Session {v.yearName}
              </div>
              <div
                style={{
                  fontFamily: "var(--rc-font-poppins), sans-serif",
                  fontSize: "28px",
                  fontWeight: "800",
                  color: "#2C4560",
                }}
              >
                {v.termName} Result
              </div>
            </div>
            <div
              style={{
                fontFamily: "var(--rc-font-poppins), sans-serif",
                fontSize: "40px",
                fontWeight: "800",
                color: v.accent,
                lineHeight: "1",
              }}
            >
              {v.classNoPadded}
            </div>
          </div>

          <div style={{ marginTop: "14px" }}>
            <div
              className="row"
              style={{
                fontSize: "11.5px",
                fontWeight: "700",
                color: "#5D6B7B",
                textTransform: "uppercase",
                letterSpacing: "0.3px",
                padding: "6px 4px",
                borderBottom: "2px solid #2C4560",
              }}
            >
              <div>#</div>
              <div className="left">Subject</div>
              <div data-col="component">Mon.</div>
              <div data-col="component">Term</div>
              <div>Obt.</div>
              <div>Total</div>
              <div>%</div>
              <div>Gr.</div>
              <div>Result</div>
            </div>
            {v.rows.map((r) => (
              <Fragment key={r.n}>
                <div
                  className="row body-row"
                  style={{
                    fontSize: "13px",
                    fontWeight: "500",
                    padding: "3px 4px",
                  }}
                >
                  <div style={{ color: "#5D6B7B" }}>{r.n}</div>
                  <div
                    className="left"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                      fontWeight: "600",
                    }}
                  >
                    <img
                      src={r.icon}
                      alt=""
                      style={{ width: "17px", height: "17px" }}
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
                  <div style={{ fontWeight: "700" }}>{r.ob}</div>
                  <div style={{ color: "#5D6B7B" }}>{r.max}</div>
                  <div>{r.pct}</div>
                  <div style={{ fontWeight: "700" }}>{r.grade}</div>
                  <div>
                    {r.pass ? (
                      <>
                        <span
                          style={{
                            whiteSpace: "nowrap",
                            display: "inline-block",
                            padding: "1px 5px",
                            borderRadius: "6px",
                            background: "#E3F1EE",
                            color: "#1A4D43",
                            border: "1px solid #1A4D43",
                            fontSize: "11.5px",
                            fontWeight: "700",
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
                            padding: "1px 5px",
                            borderRadius: "6px",
                            background: "#FCE3D3",
                            color: "#8A3B0E",
                            border: "1.5px solid #8A3B0E",
                            fontSize: "11.5px",
                            fontWeight: "700",
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
              marginTop: "16px",
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "10px",
            }}
          >
            <div
              style={{
                borderRadius: "12px",
                background: "#EEF2F7",
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <span
                style={{
                  fontSize: "12.5px",
                  fontWeight: "600",
                  color: "#5D6B7B",
                }}
              >
                Grand total
              </span>
              <span
                style={{
                  fontFamily: "var(--rc-font-poppins), sans-serif",
                  fontSize: "22px",
                  fontWeight: "700",
                }}
              >
                {v.total}{" "}
                <span style={{ fontSize: "13px", color: "#5D6B7B" }}>
                  / {v.maxTotal}
                </span>
              </span>
            </div>
            <div
              style={{
                borderRadius: "12px",
                background: "#EEF2F7",
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <span
                style={{
                  fontSize: "12.5px",
                  fontWeight: "600",
                  color: "#5D6B7B",
                }}
              >
                Percentage
              </span>
              <span
                style={{
                  fontFamily: "var(--rc-font-poppins), sans-serif",
                  fontSize: "22px",
                  fontWeight: "700",
                }}
              >
                {v.pct}%
              </span>
            </div>
            <div
              style={{
                borderRadius: "12px",
                background: v.accentSoft,
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <span
                style={{
                  fontSize: "12.5px",
                  fontWeight: "600",
                  color: "#1A4D43",
                }}
              >
                Grade
              </span>
              <span
                style={{
                  fontFamily: "var(--rc-font-poppins), sans-serif",
                  fontSize: "22px",
                  fontWeight: "700",
                  color: "#123A32",
                }}
              >
                {v.grade}
              </span>
            </div>
            {v.passed ? (
              <>
                <div
                  style={{
                    borderRadius: "12px",
                    background: "#2C4560",
                    color: "#FFFFFF",
                    padding: "12px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span style={{ fontSize: "12.5px", fontWeight: "600" }}>
                    Result
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--rc-font-poppins), sans-serif",
                      fontSize: "22px",
                      fontWeight: "700",
                    }}
                  >
                    PASS
                  </span>
                </div>
              </>
            ) : null}
            {v.failed ? (
              <>
                <div
                  style={{
                    borderRadius: "12px",
                    background: "#FCE3D3",
                    color: "#8A3B0E",
                    border: "2px solid #8A3B0E",
                    padding: "12px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span style={{ fontSize: "12.5px", fontWeight: "700" }}>
                    Result
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--rc-font-poppins), sans-serif",
                      fontSize: "22px",
                      fontWeight: "700",
                    }}
                  >
                    FAIL
                  </span>
                </div>
              </>
            ) : null}
            {v.incomplete ? (
              <div
                style={{
                  borderRadius: "12px",
                  background: "#FFFFFF",
                  color: "#1B2633",
                  border: "2px dashed #4F5D6D",
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontSize: "12.5px", fontWeight: "700" }}>Result</span>
                <span style={{ fontFamily: "var(--rc-font-poppins), sans-serif", fontSize: "20px", fontWeight: "700" }}>INCOMPLETE</span>
              </div>
            ) : null}
          </div>
          {v.failed && v.failedList ? (
            <>
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "12.5px",
                  color: "#8A3B0E",
                  fontWeight: "600",
                }}
              >
                Not passed in: {v.failedList} ({v.passRuleShort}).
              </div>
            </>
          ) : null}

          <div
            style={{
              marginTop: "14px",
              borderRadius: "12px",
              border: "1px solid #97A4B3",
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: "700",
                color: "#5D6B7B",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Class teacher’s remarks
            </div>
            <div style={{ fontSize: "13.5px", lineHeight: "1.55" }}>
              {v.remarks}
            </div>
          </div>
          <div style={{ marginTop: "8px", fontSize: "11px", color: "#5D6B7B" }}>
            Grades: {v.legend}.
          </div>

          <div
            style={{
              marginTop: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "20px",
              paddingBottom: "12px",
            }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <div
                style={{ height: "42px", borderBottom: "1px solid #1B2633" }}
              ></div>
              <div style={{ fontSize: "12px", fontWeight: "600" }}>
                Class Teacher
              </div>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <div
                style={{ height: "42px", borderBottom: "1px solid #1B2633" }}
              ></div>
              <div style={{ fontSize: "12px", fontWeight: "600" }}>
                Principal
              </div>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <div
                style={{ height: "42px", borderBottom: "1px solid #1B2633" }}
              ></div>
              <div style={{ fontSize: "12px", fontWeight: "600" }}>
                Parent / Guardian
              </div>
            </div>
          </div>
          <div
            style={{
              borderTop: "1px solid #97A4B3",
              paddingTop: "8px",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "11.5px",
              fontWeight: "600",
              color: "#3B4A5C",
            }}
          >
            {v.official ? (
              <>
                <span>Official result · Approved {v.approvedOn}</span>
              </>
            ) : null}
            {v.provisional ? (
              <>
                <span style={{ color: "#8A3B0E" }}>
                  PROVISIONAL · not an official result
                </span>
              </>
            ) : null}
            <span>Printed {v.printedOn}</span>
          </div>
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
                  fontFamily: "var(--rc-font-poppins), sans-serif",
                  fontSize: "110px",
                  fontWeight: "800",
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
