/* eslint-disable @next/next/no-img-element -- static print layout; next/image adds nothing for local SVGs on paper */
// Generated from the approved design "Class 10 result card — Achievers", then edited by hand. Keep the markup in step with the design.
import { Fragment } from "react";
import type { CardView } from "../types";

const CSS =
  ".rc-theme-10 .row{display:grid;grid-template-columns:30px minmax(0,2.3fr) repeat(4,minmax(0,1fr)) minmax(0,.95fr) minmax(0,.7fr) minmax(0,1fr);align-items:center;column-gap:6px}\n.rc-theme-10 .row>div{text-align:center}\n.rc-theme-10 .row>div.left{text-align:left}\n.rc-theme-10 .body-row{border-bottom:1px solid #BFB28A;min-height:31px}\n.rc-theme-10 .mx{color:#4F5D6D;font-size:10.5px;font-weight:500}\n.rc-theme-10.rc-monthly .row{grid-template-columns:30px minmax(0,2.3fr) repeat(2,minmax(0,1fr)) minmax(0,.95fr) minmax(0,.7fr) minmax(0,1fr)}\n.rc-theme-10.rc-monthly [data-col=component]{display:none}";

export function Theme10({ v }: { v: CardView }) {
  return (
    <div className={v.monthlyOnly ? "rc-theme-10 rc-monthly" : "rc-theme-10"}>
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
          padding: "22px",
        }}
      >
        <div
          style={{
            height: "100%",
            boxSizing: "border-box",
            border: `3px solid ${v.accent}`,
            padding: "5px",
          }}
        >
          <div
            style={{
              height: "100%",
              boxSizing: "border-box",
              border: "1px solid #2C4560",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                background:
                  "linear-gradient(135deg, #2C4560 0%, #4A6580 55%, #5E7489 100%)",
                color: "#FFFFFF",
                padding: "18px 26px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <img
                src={v.logoSrc}
                alt="School crest"
                style={{ width: "56px", height: "63px" }}
              />
              <div style={{ flexGrow: "1", textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: "var(--rc-font-playfair), serif",
                    fontSize: "29px",
                    fontWeight: "800",
                    letterSpacing: "0.5px",
                  }}
                >
                  {v.schoolName}
                </div>
                <div
                  style={{
                    marginTop: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    fontSize: "12.5px",
                    fontWeight: "600",
                    letterSpacing: "3px",
                    textTransform: "uppercase",
                  }}
                >
                  <span
                    style={{
                      width: "36px",
                      height: "1px",
                      background: v.accent,
                    }}
                  ></span>
                  Statement of Marks
                  <span
                    style={{
                      width: "36px",
                      height: "1px",
                      background: v.accent,
                    }}
                  ></span>
                </div>
                <div
                  style={{
                    marginTop: "3px",
                    fontSize: "13px",
                    fontWeight: "500",
                  }}
                >
                  {v.termName} · Session {v.yearName}
                </div>
              </div>
              <img
                src="/report-card/m10-cap.svg"
                alt="Achievers mascot"
                style={{ width: "70px", height: "70px" }}
              />
            </div>

            <div
              style={{
                padding: "14px 22px 0",
                display: "flex",
                gap: "16px",
                alignItems: "center",
              }}
            >
              <img
                src="/report-card/avatar.svg"
                alt="Student photo placeholder"
                style={{
                  width: "74px",
                  height: "74px",
                  borderRadius: "999px",
                  border: `3px solid ${v.accent}`,
                }}
              />
              <div style={{ flexGrow: "1" }}>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#6B5210",
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                  }}
                >
                  This is to certify the marks of
                </div>
                <div
                  style={{
                    fontFamily: "var(--rc-font-playfair), serif",
                    fontSize: "27px",
                    fontWeight: "700",
                    color: "#2C4560",
                  }}
                >
                  {v.student.name}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#3B4A5C",
                    fontWeight: "500",
                  }}
                >
                  {v.className} – {v.sectionName} · Achievers · Roll No.{" "}
                  {v.student.roll} · ID {v.student.id} · Guardian:{" "}
                  {v.student.guardian}
                </div>
              </div>
            </div>

            <div
              style={{
                margin: "12px 22px 0",
                borderTop: "2px solid #2C4560",
                borderBottom: "2px solid #2C4560",
              }}
            >
              <div
                className="row"
                style={{
                  fontSize: "11.5px",
                  fontWeight: "700",
                  color: "#2C4560",
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                  padding: "8px 4px",
                  background: v.accentSoft,
                }}
              >
                <div>#</div>
                <div className="left">Subject</div>
                <div data-col="component">Monthly</div>
                <div data-col="component">Term</div>
                <div>Obtained</div>
                <div>Out of</div>
                <div>%</div>
                <div>Grade</div>
                <div>Result</div>
              </div>
              {v.rows.map((r) => (
                <Fragment key={r.n}>
                  <div
                    className="row body-row"
                    style={{
                      fontSize: "13px",
                      fontWeight: "500",
                      padding: "1px 4px",
                    }}
                  >
                    <div style={{ color: "#5D6B7B" }}>{r.n}</div>
                    <div
                      className="left"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
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
                      {r.showPass ? (
                        <>
                          <span
                            style={{
                            whiteSpace: "nowrap",
                              fontSize: "11.5px",
                              fontWeight: "700",
                              color: "#2C4560",
                            }}
                          >
                            ✓ Pass
                          </span>
                        </>
                      ) : null}
                      {r.showFail ? (
                        <>
                          <span
                            style={{
                            whiteSpace: "nowrap",
                              fontSize: "11.5px",
                              fontWeight: "700",
                              color: "#8A3B0E",
                            }}
                          >
                            ✗ Fail
                          </span>
                        </>
                      ) : null}
                      {r.optional ? (
                        <>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "600",
                              color: "#5D6B7B",
                            }}
                          >
                            Not in total
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
                margin: "14px 22px 0",
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                textAlign: "center",
                border: "1px solid #B3A275",
              }}
            >
              <div
                style={{ padding: "10px", borderRight: "1px solid #B3A275" }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#6B5210",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  Grand total
                </div>
                <div
                  style={{
                    fontFamily: "var(--rc-font-playfair), serif",
                    fontSize: "22px",
                    fontWeight: "700",
                  }}
                >
                  {v.total} / {v.maxTotal}
                </div>
              </div>
              <div
                style={{ padding: "10px", borderRight: "1px solid #B3A275" }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#6B5210",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  Percentage
                </div>
                <div
                  style={{
                    fontFamily: "var(--rc-font-playfair), serif",
                    fontSize: "22px",
                    fontWeight: "700",
                  }}
                >
                  {v.pct}%
                </div>
              </div>
              <div
                style={{ padding: "10px", borderRight: "1px solid #B3A275" }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#6B5210",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  Grade
                </div>
                <div
                  style={{
                    fontFamily: "var(--rc-font-playfair), serif",
                    fontSize: "22px",
                    fontWeight: "700",
                  }}
                >
                  {v.grade}{" "}
                  <span
                    style={{
                      fontSize: "13px",
                      fontFamily: "var(--rc-font-inter), sans-serif",
                      color: "#3B4A5C",
                    }}
                  >
                    {v.gradeRemark}
                  </span>
                </div>
              </div>
              <div
                style={{
                  padding: "10px",
                  background: "#2C4560",
                  color: "#FFFFFF",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  Result
                </div>
                <div
                  style={{
                    fontFamily: "var(--rc-font-playfair), serif",
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
                margin: "12px 22px 0",
                display: "flex",
                flexDirection: "column",
                gap: "3px",
              }}
            >
              <div
                style={{
                  fontSize: "11.5px",
                  fontWeight: "700",
                  color: "#6B5210",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                }}
              >
                Class teacher’s remarks
              </div>
              <div
                style={{
                  fontSize: "13.5px",
                  lineHeight: "1.5",
                  fontStyle: "italic",
                }}
              >
                {v.remarks}
              </div>
            </div>
            <div
              style={{
                margin: "6px 22px 0",
                fontSize: "11px",
                color: "#5D6B7B",
              }}
            >
              Grades: {v.legend}. Subjects marked “Not in total” are optional
              and do not affect the result.
            </div>

            <div
              style={{
                margin: "auto 22px 0",
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "26px",
                paddingBottom: "12px",
                alignItems: "end",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{ height: "40px", borderBottom: "1px solid #1B2633" }}
                ></div>
                <div style={{ fontSize: "12px", fontWeight: "600" }}>
                  Class Teacher
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
                <div
                  style={{
                    width: "70px",
                    height: "70px",
                    borderRadius: "999px",
                    border: `2px dashed ${v.accent}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: "700",
                    color: "#6B5210",
                    letterSpacing: "0.5px",
                  }}
                >
                  SCHOOL
                  <br />
                  SEAL
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{ height: "40px", borderBottom: "1px solid #1B2633" }}
                ></div>
                <div style={{ fontSize: "12px", fontWeight: "600" }}>
                  Principal
                </div>
              </div>
            </div>
            <div
              style={{
                borderTop: "1px solid #B3A275",
                padding: "7px 22px",
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
                    PROVISIONAL · Awaiting final approval — not an official
                    result
                  </span>
                </>
              ) : null}
              <span>Printed {v.printedOn}</span>
            </div>
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
                  fontFamily: "var(--rc-font-playfair), serif",
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
