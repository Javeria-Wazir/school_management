/* eslint-disable @next/next/no-img-element -- static print layout; next/image adds nothing for local SVGs on paper */
// Generated from the approved design "Class 8 result card — Innovators", then edited by hand. Keep the markup in step with the design.
import { Fragment } from "react";
import type { CardView } from "../types";

const CSS =
  ".rc-theme-08 .row{display:grid;grid-template-columns:34px minmax(0,2.3fr) repeat(4,minmax(0,1fr)) minmax(0,.95fr) minmax(0,.7fr) minmax(0,.95fr);align-items:center;column-gap:6px}\n.rc-theme-08 .row>div{text-align:center}\n.rc-theme-08 .row>div.left{text-align:left}\n.rc-theme-08 .body-row{border-bottom:1px solid #A9B5C2;min-height:36px}\n.rc-theme-08 .mx{color:#4F5D6D;font-size:11px;font-weight:500}\n.rc-theme-08.rc-monthly .row{grid-template-columns:34px minmax(0,2.3fr) repeat(2,minmax(0,1fr)) minmax(0,.95fr) minmax(0,.7fr) minmax(0,.95fr)}\n.rc-theme-08.rc-monthly [data-col=component]{display:none}";

export function Theme08({ v }: { v: CardView }) {
  return (
    <div className={v.monthlyOnly ? "rc-theme-08 rc-monthly" : "rc-theme-08"}>
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
        }}
      >
        <div style={{ position: "relative", height: "236px" }}>
          <div
            style={{
              position: "absolute",
              inset: "0",
              background:
                "linear-gradient(110deg, #2C4560 0%, #4A6580 55%, #5E7489 100%)",
              clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 78%)",
            }}
          ></div>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "0",
              bottom: "0",
              width: "794px",
              height: "52px",
              background: v.accent,
              clipPath: "polygon(0 0, 100% 100%, 0 100%)",
              opacity: "0.9",
            }}
          ></div>
          <div
            style={{
              position: "relative",
              padding: "28px 44px 0",
              color: "#FFFFFF",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <div
                style={{ display: "flex", gap: "12px", alignItems: "center" }}
              >
                <img
                  src={v.logoSrc}
                  alt="School crest"
                  style={{ width: "46px", height: "52px" }}
                />
                <div
                  style={{
                    fontFamily: "var(--rc-font-poppins), sans-serif",
                    fontSize: "25px",
                    fontWeight: "800",
                  }}
                >
                  {v.schoolName}
                </div>
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                }}
              >
                {v.termName} Result · Session {v.yearName}
              </div>
              <div
                style={{
                  marginTop: "8px",
                  fontFamily: "var(--rc-font-poppins), sans-serif",
                  fontSize: "34px",
                  fontWeight: "800",
                  lineHeight: "1",
                }}
              >
                {v.className}{" "}
                <span style={{ fontWeight: "600", opacity: "0.9" }}>
                  Innovators
                </span>
              </div>
              <div
                style={{ fontSize: "13px", fontWeight: "600", opacity: "0.95" }}
              >
                {v.streamLabel}
              </div>
            </div>
            <img
              src="/report-card/m8-bulb.svg"
              alt="Innovators mascot"
              style={{ width: "110px", height: "110px" }}
            />
          </div>
        </div>

        <div
          style={{
            margin: "16px 44px 0",
            display: "flex",
            gap: "16px",
            alignItems: "center",
            border: "1px solid #A2AEBC",
            borderRadius: "14px",
            padding: "12px 16px",
          }}
        >
          <img
            src="/report-card/avatar.svg"
            alt="Student photo placeholder"
            style={{ width: "68px", height: "68px", borderRadius: "14px" }}
          />
          <div
            style={{
              flexGrow: "1",
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.6fr) repeat(3, minmax(0, 1fr))",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#5D6B7B",
                  fontWeight: "600",
                }}
              >
                Student
              </div>
              <div
                style={{
                  fontFamily: "var(--rc-font-poppins), sans-serif",
                  fontSize: "20px",
                  fontWeight: "700",
                }}
              >
                {v.student.name}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#5D6B7B",
                  fontWeight: "600",
                }}
              >
                Roll No. / Section
              </div>
              <div style={{ fontWeight: "700" }}>
                {v.student.roll} · {v.classNo} – {v.sectionName}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#5D6B7B",
                  fontWeight: "600",
                }}
              >
                Student ID
              </div>
              <div style={{ fontWeight: "700" }}>{v.student.id}</div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#5D6B7B",
                  fontWeight: "600",
                }}
              >
                Guardian
              </div>
              <div style={{ fontWeight: "700" }}>{v.student.guardian}</div>
            </div>
          </div>
        </div>

        <div
          style={{
            margin: "16px 44px 0",
            borderRadius: "14px",
            overflow: "hidden",
            border: "1px solid #A2AEBC",
          }}
        >
          <div
            className="row"
            style={{
              background: v.accentSoft,
              color: "#4A2406",
              fontSize: "12px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.3px",
              padding: "10px 10px",
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
                  fontSize: "13.5px",
                  fontWeight: "500",
                  padding: "3px 10px",
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
                    style={{ width: "19px", height: "19px" }}
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
                          fontSize: "12px",
                          fontWeight: "700",
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
                          fontWeight: "700",
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
            margin: "16px 44px 0",
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "12px",
          }}
        >
          <div
            style={{
              borderRadius: "14px",
              border: "1px solid #A2AEBC",
              padding: "12px",
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              style={{ width: "30px", height: "30px", flexShrink: "0" }}
              fill="none"
              stroke="#4A6580"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
            </svg>
            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#5D6B7B",
                  fontWeight: "600",
                }}
              >
                Grand total
              </div>
              <div
                style={{
                  fontFamily: "var(--rc-font-poppins), sans-serif",
                  fontSize: "19px",
                  fontWeight: "700",
                }}
              >
                {v.total} / {v.maxTotal}
              </div>
            </div>
          </div>
          <div
            style={{
              borderRadius: "14px",
              border: "1px solid #A2AEBC",
              padding: "12px",
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              style={{ width: "30px", height: "30px", flexShrink: "0" }}
              fill="none"
              stroke="#4A6580"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 5L5 19" />
              <circle cx="6.5" cy="6.5" r="2.5" />
              <circle cx="17.5" cy="17.5" r="2.5" />
            </svg>
            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#5D6B7B",
                  fontWeight: "600",
                }}
              >
                Percentage
              </div>
              <div
                style={{
                  fontFamily: "var(--rc-font-poppins), sans-serif",
                  fontSize: "19px",
                  fontWeight: "700",
                }}
              >
                {v.pct}%
              </div>
            </div>
          </div>
          <div
            style={{
              borderRadius: "14px",
              background: v.accentSoft,
              padding: "12px",
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              style={{ width: "30px", height: "30px", flexShrink: "0" }}
              fill="none"
              stroke="#7A3D0C"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="9" r="6" />
              <path d="M8.5 14L7 22l5-3 5 3-1.5-8" />
            </svg>
            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#6B3608",
                  fontWeight: "600",
                }}
              >
                Grade
              </div>
              <div
                style={{
                  fontFamily: "var(--rc-font-poppins), sans-serif",
                  fontSize: "19px",
                  fontWeight: "700",
                  color: "#4A2406",
                }}
              >
                {v.grade} · {v.gradeRemark}
              </div>
            </div>
          </div>
          <div
            style={{
              borderRadius: "14px",
              background: "#2C4560",
              color: "#FFFFFF",
              padding: "12px",
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              style={{ width: "30px", height: "30px", flexShrink: "0" }}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9.5" />
              <path d="M7.5 12.5l3 3 6-6.5" />
            </svg>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "600" }}>Result</div>
              <div
                style={{
                  fontFamily: "var(--rc-font-poppins), sans-serif",
                  fontSize: "19px",
                  fontWeight: "700",
                }}
              >
                {v.result}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            margin: "14px 44px 0",
            borderRadius: "14px",
            background: "#F4F6F9",
            padding: "10px 16px",
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
        <div
          style={{ margin: "8px 44px 0", fontSize: "11.5px", color: "#5D6B7B" }}
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
              style={{ height: "44px", borderBottom: "1px solid #1B2633" }}
            ></div>
            <div style={{ fontSize: "12.5px", fontWeight: "600" }}>
              Class Teacher
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div
              style={{ height: "44px", borderBottom: "1px solid #1B2633" }}
            ></div>
            <div style={{ fontSize: "12.5px", fontWeight: "600" }}>
              Principal
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div
              style={{ height: "44px", borderBottom: "1px solid #1B2633" }}
            ></div>
            <div style={{ fontSize: "12.5px", fontWeight: "600" }}>
              Parent / Guardian
            </div>
          </div>
        </div>
        <div
          style={{
            background: "linear-gradient(90deg, #2C4560, #5E7489)",
            color: "#FFFFFF",
            padding: "10px 44px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            fontWeight: "600",
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
