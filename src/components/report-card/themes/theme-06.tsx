/* eslint-disable @next/next/no-img-element -- static print layout; next/image adds nothing for local SVGs on paper */
// Generated from the approved design "Class 6 result card — Navigators", then edited by hand. Keep the markup in step with the design.
import { Fragment } from "react";
import type { CardView } from "../types";

const CSS =
  ".rc-theme-06 .row{display:grid;grid-template-columns:36px minmax(0,2.3fr) repeat(4,minmax(0,1fr)) minmax(0,.95fr) minmax(0,.7fr) minmax(0,.95fr);align-items:stretch}\n.rc-theme-06 .row>div{text-align:center;padding:7px 4px;border-right:1px solid #97A4B3;display:flex;align-items:center;justify-content:center}\n.rc-theme-06 .row>div:last-child{border-right:0}\n.rc-theme-06 .row>div.left{justify-content:flex-start;text-align:left;padding-left:10px}\n.rc-theme-06 .body-row{border-top:1px solid #97A4B3}\n.rc-theme-06 .mx{color:#4F5D6D;font-size:11px;font-weight:500;margin-left:1px}\n.rc-theme-06.rc-monthly .row{grid-template-columns:36px minmax(0,2.3fr) repeat(2,minmax(0,1fr)) minmax(0,.95fr) minmax(0,.7fr) minmax(0,.95fr)}\n.rc-theme-06.rc-monthly [data-col=component]{display:none}";

export function Theme06({ v }: { v: CardView }) {
  return (
    <div className={v.monthlyOnly ? "rc-theme-06 rc-monthly" : "rc-theme-06"}>
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
          flexDirection: "column",
          padding: "28px 36px 24px",
        }}
      >
        <div
          style={{
            border: "2px solid #2C4560",
            height: "100%",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(135deg, #2C4560 0%, #4A6580 60%, #5E7489 100%)",
              color: "#FFFFFF",
              padding: "20px 24px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              borderBottom: `4px solid ${v.accent}`,
            }}
          >
            <img
              src={v.logoSrc}
              alt="School crest"
              style={{ width: "58px", height: "65px" }}
            />
            <div
              style={{
                flexGrow: "1",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--rc-font-poppins), sans-serif",
                  fontSize: "27px",
                  fontWeight: "800",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                }}
              >
                {v.schoolName}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  letterSpacing: "3px",
                  textTransform: "uppercase",
                }}
              >
                {v.termName} Result Sheet · {v.yearName}
              </div>
            </div>
            <img
              src="/report-card/m6-compass.svg"
              alt="Navigators mascot"
              style={{ width: "70px", height: "70px" }}
            />
          </div>

          <div
            style={{
              padding: "16px 20px 0",
              display: "flex",
              gap: "16px",
              alignItems: "stretch",
            }}
          >
            <img
              src="/report-card/avatar.svg"
              alt="Student photo placeholder"
              style={{
                width: "86px",
                height: "86px",
                border: "2px solid #2C4560",
              }}
            />
            <div
              style={{
                flexGrow: "1",
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                border: "1px solid #97A4B3",
                fontSize: "13px",
              }}
            >
              <div
                style={{
                  gridColumn: "span 2",
                  padding: "8px 12px",
                  borderRight: "1px solid #97A4B3",
                  borderBottom: "1px solid #97A4B3",
                }}
              >
                <span style={{ color: "#5D6B7B", fontWeight: "600" }}>
                  Student’s name{" "}
                </span>
                <span
                  style={{
                    fontFamily: "var(--rc-font-poppins), sans-serif",
                    fontSize: "17px",
                    fontWeight: "700",
                  }}
                >
                  {v.student.name}
                </span>
              </div>
              <div
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid #97A4B3",
                  background: v.accentSoft,
                }}
              >
                <span style={{ color: "#4A3510", fontWeight: "600" }}>
                  Class{" "}
                </span>
                <b style={{ color: "#2B1E05" }}>
                  {v.classNo} – {v.sectionName} · Navigators
                </b>
              </div>
              <div
                style={{
                  padding: "8px 12px",
                  borderRight: "1px solid #97A4B3",
                }}
              >
                <span style={{ color: "#5D6B7B", fontWeight: "600" }}>
                  Roll No.{" "}
                </span>
                <b>{v.student.roll}</b>
              </div>
              <div
                style={{
                  padding: "8px 12px",
                  borderRight: "1px solid #97A4B3",
                }}
              >
                <span style={{ color: "#5D6B7B", fontWeight: "600" }}>
                  Student ID{" "}
                </span>
                <b>{v.student.id}</b>
              </div>
              <div style={{ padding: "8px 12px" }}>
                <span style={{ color: "#5D6B7B", fontWeight: "600" }}>
                  Guardian{" "}
                </span>
                <b>{v.student.guardian}</b>
              </div>
            </div>
          </div>

          <div style={{ margin: "16px 20px 0", border: "1px solid #2C4560" }}>
            <div
              className="row"
              style={{
                background: "#2C4560",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.4px",
              }}
            >
              <div>No.</div>
              <div className="left">Subject</div>
              <div data-col="component">Monthly</div>
              <div data-col="component">Term</div>
              <div>Obtained</div>
              <div>Total</div>
              <div>%</div>
              <div>Grade</div>
              <div>Result</div>
            </div>
            {v.rows.map((r) => (
              <Fragment key={r.n}>
                <div
                  className="row body-row"
                  style={{ fontSize: "13.5px", fontWeight: "500" }}
                >
                  <div style={{ color: "#5D6B7B" }}>{r.n}</div>
                  <div
                    className="left"
                    style={{ gap: "8px", fontWeight: "600" }}
                  >
                    <img
                      src={r.icon}
                      alt=""
                      style={{ width: "18px", height: "18px" }}
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
                  <div>{r.max}</div>
                  <div>{r.pct}</div>
                  <div style={{ fontWeight: "700" }}>{r.grade}</div>
                  <div>
                    {r.pass ? (
                      <>
                        <span
                          style={{
                            whiteSpace: "nowrap",
                            fontSize: "12px",
                            fontWeight: "700",
                            color: "#2C4560",
                          }}
                        >
                          ✓ PASS
                        </span>
                      </>
                    ) : null}
                    {r.fail ? (
                      <>
                        <span
                          style={{
                            whiteSpace: "nowrap",
                            fontSize: "12px",
                            fontWeight: "700",
                            color: "#8A3B0E",
                          }}
                        >
                          ✗ FAIL
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </Fragment>
            ))}
            <div
              className="row body-row"
              style={{
                fontSize: "13.5px",
                fontWeight: "700",
                background: "#EEF2F7",
                borderTop: "2px solid #2C4560",
              }}
            >
              <div></div>
              <div className="left">Grand Total</div>
              <div data-col="component"></div>
              <div data-col="component"></div>
              <div>{v.total}</div>
              <div>{v.maxTotal}</div>
              <div>{v.pct}</div>
              <div>{v.grade}</div>
              <div>{v.result}</div>
            </div>
          </div>

          <div
            style={{
              margin: "16px 20px 0",
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "10px",
            }}
          >
            <div style={{ border: "1px solid #97A4B3", padding: "10px 12px" }}>
              <div
                style={{
                  fontSize: "11.5px",
                  fontWeight: "700",
                  color: "#5D6B7B",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Marks
              </div>
              <div
                style={{
                  fontFamily: "var(--rc-font-poppins), sans-serif",
                  fontSize: "22px",
                  fontWeight: "700",
                }}
              >
                {v.total} / {v.maxTotal}
              </div>
            </div>
            <div style={{ border: "1px solid #97A4B3", padding: "10px 12px" }}>
              <div
                style={{
                  fontSize: "11.5px",
                  fontWeight: "700",
                  color: "#5D6B7B",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Percentage
              </div>
              <div
                style={{
                  fontFamily: "var(--rc-font-poppins), sans-serif",
                  fontSize: "22px",
                  fontWeight: "700",
                }}
              >
                {v.pct}%
              </div>
            </div>
            <div
              style={{
                border: "1px solid #97A4B3",
                padding: "10px 12px",
                background: v.accentSoft,
              }}
            >
              <div
                style={{
                  fontSize: "11.5px",
                  fontWeight: "700",
                  color: "#4A3510",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Grade
              </div>
              <div
                style={{
                  fontFamily: "var(--rc-font-poppins), sans-serif",
                  fontSize: "22px",
                  fontWeight: "700",
                  color: "#2B1E05",
                }}
              >
                {v.grade} · {v.gradeRemark}
              </div>
            </div>
            <div
              style={{
                border: "1px solid #2C4560",
                padding: "10px 12px",
                background: "#2C4560",
                color: "#FFFFFF",
              }}
            >
              <div
                style={{
                  fontSize: "11.5px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Result
              </div>
              <div
                style={{
                  fontFamily: "var(--rc-font-poppins), sans-serif",
                  fontSize: "22px",
                  fontWeight: "700",
                }}
              >
                {v.result}
              </div>
              {v.showPosition ? <div style={{ fontSize: "12.5px", fontWeight: "800", marginTop: "2px" }}>Position {v.position}</div> : null}
            </div>
          </div>

          <div
            style={{
              margin: "14px 20px 0",
              border: "1px solid #97A4B3",
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div
              style={{
                fontSize: "11.5px",
                fontWeight: "700",
                color: "#5D6B7B",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Remarks
            </div>
            <div style={{ fontSize: "13.5px", lineHeight: "1.55" }}>
              {v.remarks}
            </div>
          </div>
          <div
            style={{
              margin: "8px 20px 0",
              fontSize: "11.5px",
              color: "#5D6B7B",
            }}
          >
            Grades: {v.legend}. {v.passRule}
          </div>

          <div
            style={{
              margin: "auto 20px 0",
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "28px",
              paddingBottom: "14px",
            }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <div
                style={{ height: "44px", borderBottom: "1px solid #1B2633" }}
              ></div>
              <div style={{ fontSize: "12.5px", fontWeight: "600" }}>
                Class Teacher’s Signature
              </div>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <div
                style={{ height: "44px", borderBottom: "1px solid #1B2633" }}
              ></div>
              <div style={{ fontSize: "12.5px", fontWeight: "600" }}>
                Principal’s Signature
              </div>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <div
                style={{ height: "44px", borderBottom: "1px solid #1B2633" }}
              ></div>
              <div style={{ fontSize: "12.5px", fontWeight: "600" }}>
                Parent’s Signature
              </div>
            </div>
          </div>
          <div
            style={{
              borderTop: "1px solid #97A4B3",
              padding: "8px 20px",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "11.5px",
              fontWeight: "600",
              color: "#3B4A5C",
            }}
          >
            {v.official ? (
              <>
                <span>Official result · {v.approvalText}</span>
              </>
            ) : null}
            {v.provisional ? (
              <>
                <span style={{ color: "#8A3B0E" }}>
                  PROVISIONAL · Awaiting final approval — not an official result
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
