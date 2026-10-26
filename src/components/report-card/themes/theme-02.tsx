/* eslint-disable @next/next/no-img-element -- static print layout; next/image adds nothing for local SVGs on paper */
// Generated from the approved design "Class 2 result card — Bright Sprouts", then edited by hand. Keep the markup in step with the design.
import { Fragment } from "react";
import type { CardView } from "../types";

const CSS =
  ".rc-theme-02 .row{display:grid;grid-template-columns:34px minmax(0,2.3fr) repeat(4,minmax(0,1fr)) minmax(0,.95fr) minmax(0,.7fr) minmax(0,.95fr);align-items:center;column-gap:6px}\n.rc-theme-02 .row>div{text-align:center}\n.rc-theme-02 .row>div.left{text-align:left}\n.rc-theme-02 .body-row{border-bottom:1px dotted #97A4B3;min-height:38px}\n.rc-theme-02 .mx{color:#4F5D6D;font-size:11px;font-weight:600}";

export function Theme02({ v }: { v: CardView }) {
  return (
    <div className="rc-theme-02">
      <style>{CSS}</style>
      <div
        style={{
          width: "794px",
          height: "1123px",
          boxSizing: "border-box",
          position: "relative",
          overflow: "hidden",
          filter: v.bw,
          background: "#FBFCFD",
          fontFamily: "var(--rc-font-nunito), sans-serif",
          color: "#1E2A38",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ position: "relative", height: "230px" }}>
          <div
            style={{
              position: "absolute",
              left: "0",
              top: "0",
              width: "640px",
              height: "220px",
              background:
                "linear-gradient(160deg, #2C4560 0%, #4A6580 60%, #5E7489 100%)",
              borderBottomRightRadius: "180px",
              padding: "34px 44px",
              boxSizing: "border-box",
              color: "#FFFFFF",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
              <img
                src={v.logoSrc}
                alt="School crest"
                style={{ width: "52px", height: "59px" }}
              />
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "900",
                  lineHeight: "1.1",
                }}
              >
                {v.schoolName}
              </div>
            </div>
            <div style={{ fontSize: "15px", fontWeight: "700" }}>
              {v.termName} Result Sheet · Session {v.yearName}
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
              <span
                style={{
                  background: "#FFFFFF",
                  color: "#2C4560",
                  borderRadius: "999px",
                  padding: "5px 14px",
                  fontSize: "14px",
                  fontWeight: "900",
                }}
              >
                {v.className}
              </span>
              <span
                style={{
                  background: v.accent,
                  color: "#0B2E1A",
                  borderRadius: "999px",
                  padding: "5px 14px",
                  fontSize: "14px",
                  fontWeight: "900",
                }}
              >
                Bright Sprouts
              </span>
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              right: "44px",
              top: "44px",
              width: "132px",
              height: "132px",
              borderRadius: "999px",
              background: "#FFFFFF",
              boxShadow: "0 8px 22px rgba(44, 69, 96, 0.16)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src="/report-card/m2-sprout.svg"
              alt="Bright Sprouts mascot"
              style={{ width: "108px", height: "108px" }}
            />
          </div>
        </div>

        <div
          style={{
            margin: "6px 44px 0",
            display: "flex",
            gap: "18px",
            alignItems: "center",
          }}
        >
          <div
            style={{
              padding: "4px",
              borderRadius: "999px",
              background: `linear-gradient(135deg, ${v.accent}, #5E7489)`,
            }}
          >
            <img
              src="/report-card/avatar.svg"
              alt="Student photo placeholder"
              style={{
                width: "76px",
                height: "76px",
                borderRadius: "999px",
                display: "block",
                border: "3px solid #FFFFFF",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              flexGrow: "1",
            }}
          >
            <div style={{ fontSize: "25px", fontWeight: "900" }}>
              {v.student.name}
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                fontSize: "13px",
                fontWeight: "800",
              }}
            >
              <span
                style={{
                  background: v.accentSoft,
                  borderRadius: "10px",
                  padding: "5px 10px",
                }}
              >
                {v.className} – {v.sectionName}
              </span>
              <span
                style={{
                  background: v.accentSoft,
                  borderRadius: "10px",
                  padding: "5px 10px",
                }}
              >
                Roll No. {v.student.roll}
              </span>
              <span
                style={{
                  background: v.accentSoft,
                  borderRadius: "10px",
                  padding: "5px 10px",
                }}
              >
                ID {v.student.id}
              </span>
              <span
                style={{
                  background: v.accentSoft,
                  borderRadius: "10px",
                  padding: "5px 10px",
                }}
              >
                Guardian: {v.student.guardian}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            margin: "20px 44px 0",
            background: "#FFFFFF",
            borderRadius: "20px",
            border: `2px solid ${v.accentSoft}`,
            padding: "6px 8px 10px",
          }}
        >
          <div
            className="row"
            style={{
              color: "#2C4560",
              fontSize: "12.5px",
              fontWeight: "900",
              padding: "10px 10px",
              borderBottom: `3px solid ${v.accent}`,
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
                className="row body-row"
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  padding: "4px 10px",
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
                    style={{ width: "22px", height: "22px" }}
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
                <div style={{ fontWeight: "900", color: "#2C4560" }}>
                  {r.grade}
                </div>
                <div>
                  {r.pass ? (
                    <>
                      <span
                        style={{
                            whiteSpace: "nowrap",
                          fontSize: "12px",
                          fontWeight: "900",
                          color: "#1F6B43",
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
            gap: "12px",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "16px",
              borderTop: "6px solid #4A6580",
              boxShadow: "0 2px 10px rgba(44, 69, 96, 0.14)",
              padding: "12px 14px",
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
            <div style={{ fontSize: "24px", fontWeight: "900" }}>
              {v.total}
              <span style={{ fontSize: "14px", color: "#5D6B7B" }}>
                {" "}
                / {v.maxTotal}
              </span>
            </div>
          </div>
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "16px",
              borderTop: "6px solid #4A6580",
              boxShadow: "0 2px 10px rgba(44, 69, 96, 0.14)",
              padding: "12px 14px",
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
            <div style={{ fontSize: "24px", fontWeight: "900" }}>{v.pct}%</div>
          </div>
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "16px",
              borderTop: `6px solid ${v.accent}`,
              boxShadow: "0 2px 10px rgba(44, 69, 96, 0.14)",
              padding: "12px 14px",
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
            <div style={{ fontSize: "24px", fontWeight: "900" }}>
              {v.grade}{" "}
              <span style={{ fontSize: "14px", color: "#3B4A5C" }}>
                {v.gradeRemark}
              </span>
            </div>
          </div>
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "16px",
              borderTop: `6px solid ${v.accent}`,
              boxShadow: "0 2px 10px rgba(44, 69, 96, 0.14)",
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontSize: "12.5px",
                fontWeight: "800",
                color: "#5D6B7B",
              }}
            >
              Result
            </div>
            <div
              style={{ fontSize: "24px", fontWeight: "900", color: "#1F6B43" }}
            >
              {v.result}
            </div>
          </div>
        </div>

        <div
          style={{
            margin: "16px 44px 0",
            background: v.accentSoft,
            borderRadius: "18px",
            padding: "12px 16px",
            display: "flex",
            gap: "12px",
            alignItems: "flex-start",
          }}
        >
          <img
            src="/report-card/m2-sprout.svg"
            alt=""
            style={{ width: "34px", height: "34px" }}
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
            paddingBottom: "16px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div
              style={{ height: "46px", borderBottom: "1.5px dashed #4F5D6D" }}
            ></div>
            <div
              style={{ fontSize: "13px", fontWeight: "800", color: "#3B4A5C" }}
            >
              Class Teacher
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div
              style={{ height: "46px", borderBottom: "1.5px dashed #4F5D6D" }}
            ></div>
            <div
              style={{ fontSize: "13px", fontWeight: "800", color: "#3B4A5C" }}
            >
              Principal
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div
              style={{ height: "46px", borderBottom: "1.5px dashed #4F5D6D" }}
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
            margin: "0 44px 22px",
            borderTop: "2px solid #A2AEBC",
            paddingTop: "10px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12.5px",
            fontWeight: "800",
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
