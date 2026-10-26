/* eslint-disable @next/next/no-img-element -- static print layout; next/image adds nothing for local SVGs on paper */
// Generated from the approved design "Class 1 result card — Little Stars", then edited by hand. Keep the markup in step with the design.
import { Fragment } from "react";
import type { CardView } from "../types";

const CSS =
  ".rc-theme-01 .row{display:grid;grid-template-columns:34px minmax(0,2.3fr) repeat(4,minmax(0,1fr)) minmax(0,.95fr) minmax(0,.7fr) minmax(0,.95fr);align-items:center;column-gap:6px}\n.rc-theme-01 .row>div{text-align:center}\n.rc-theme-01 .row>div.left{text-align:left}\n.rc-theme-01 .body-row{border-bottom:1px solid #A9B5C2;min-height:38px}\n.rc-theme-01 .body-row:nth-child(even){background:#F6F8FB}\n.rc-theme-01 .mx{color:#4F5D6D;font-size:11px;font-weight:600}";

export function Theme01({ v }: { v: CardView }) {
  return (
    <div className="rc-theme-01">
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
            height: "212px",
            background:
              "linear-gradient(135deg, #2C4560 0%, #4A6580 55%, #5E7489 100%)",
            color: "#FFFFFF",
            padding: "30px 44px 0",
            boxSizing: "border-box",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <img
              src={v.logoSrc}
              alt="School crest"
              style={{ width: "60px", height: "68px" }}
            />
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <div
                style={{
                  fontSize: "30px",
                  fontWeight: "900",
                  letterSpacing: "0.3px",
                  lineHeight: "1.1",
                }}
              >
                {v.schoolName}
              </div>
              <div
                style={{ fontSize: "15px", fontWeight: "700", opacity: "0.95" }}
              >
                {v.termName} Result Sheet · Session {v.yearName}
              </div>
              <div
                style={{
                  marginTop: "6px",
                  display: "inline-flex",
                  alignSelf: "flex-start",
                  alignItems: "center",
                  gap: "8px",
                  background: v.accent,
                  color: "#2B1E05",
                  borderRadius: "999px",
                  padding: "5px 14px",
                  fontSize: "14px",
                  fontWeight: "900",
                }}
              >
                {v.className} · Little Stars
              </div>
            </div>
          </div>
          <img
            src="/report-card/m1-star.svg"
            alt="Little Stars mascot"
            style={{ width: "104px", height: "104px" }}
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 794 60"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              left: "0",
              bottom: "-1px",
              width: "794px",
              height: "60px",
            }}
          >
            <path
              d="M0 34 C 120 6, 260 6, 397 30 S 680 58, 794 24 L 794 60 L 0 60 Z"
              fill="#FFFFFF"
            />
          </svg>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            style={{
              position: "absolute",
              left: "540px",
              top: "26px",
              width: "16px",
              height: "16px",
            }}
          >
            <path
              d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z"
              fill={v.accent}
            />
          </svg>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            style={{
              position: "absolute",
              left: "600px",
              top: "120px",
              width: "12px",
              height: "12px",
            }}
          >
            <path
              d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z"
              fill="#FFFFFF"
            />
          </svg>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            style={{
              position: "absolute",
              left: "470px",
              top: "140px",
              width: "10px",
              height: "10px",
            }}
          >
            <path
              d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z"
              fill={v.accent}
            />
          </svg>
        </div>

        <div
          style={{
            margin: "-18px 44px 0",
            position: "relative",
            background: "#FFFFFF",
            border: `2px solid ${v.accentSoft}`,
            borderRadius: "22px",
            padding: "16px 20px",
            display: "flex",
            gap: "18px",
            alignItems: "center",
            boxShadow: "0 6px 18px rgba(44, 69, 96, 0.10)",
          }}
        >
          <img
            src="/report-card/avatar.svg"
            alt="Student photo placeholder"
            style={{
              width: "78px",
              height: "78px",
              borderRadius: "999px",
              border: `4px solid ${v.accent}`,
            }}
          />
          <div
            style={{
              flexGrow: "1",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{ fontSize: "24px", fontWeight: "900", color: "#1E2A38" }}
            >
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
                <div style={{ color: "#5D6B7B", fontWeight: "700" }}>Class</div>
                <div style={{ fontWeight: "800" }}>
                  {v.className} – {v.sectionName}
                </div>
              </div>
              <div>
                <div style={{ color: "#5D6B7B", fontWeight: "700" }}>
                  Roll No.
                </div>
                <div style={{ fontWeight: "800" }}>{v.student.roll}</div>
              </div>
              <div>
                <div style={{ color: "#5D6B7B", fontWeight: "700" }}>
                  Student ID
                </div>
                <div style={{ fontWeight: "800" }}>{v.student.id}</div>
              </div>
              <div>
                <div style={{ color: "#5D6B7B", fontWeight: "700" }}>
                  Guardian
                </div>
                <div style={{ fontWeight: "800" }}>{v.student.guardian}</div>
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
              background: "#2C4560",
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
                    padding: "4px 10px",
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
                    <span
                      style={{
                        display: "inline-flex",
                        width: "28px",
                        height: "28px",
                        borderRadius: "9px",
                        background: v.accentSoft,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src={r.icon}
                        alt=""
                        style={{ width: "18px", height: "18px" }}
                      />
                    </span>
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
            margin: "18px 44px 0",
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "12px",
          }}
        >
          <div
            style={{
              borderRadius: "18px",
              background: "#EEF2F7",
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
              borderRadius: "18px",
              background: "#EEF2F7",
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
              borderRadius: "18px",
              background: v.accentSoft,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "999px",
                background: v.accent,
                color: "#2B1E05",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                fontWeight: "900",
              }}
            >
              {v.grade}
            </div>
            <div>
              <div
                style={{
                  fontSize: "12.5px",
                  fontWeight: "800",
                  color: "#5D6B7B",
                }}
              >
                Grade
              </div>
              <div style={{ fontSize: "15px", fontWeight: "900" }}>
                {v.gradeRemark}
              </div>
            </div>
          </div>
          <div
            style={{
              borderRadius: "18px",
              background: "#2C4560",
              color: "#FFFFFF",
              padding: "12px 14px",
            }}
          >
            <div
              style={{ fontSize: "12.5px", fontWeight: "800", opacity: "0.9" }}
            >
              Result
            </div>
            <div style={{ fontSize: "24px", fontWeight: "900" }}>
              {v.result}
            </div>
          </div>
        </div>

        <div
          style={{
            margin: "16px 44px 0",
            border: "2px dashed #97A4B3",
            borderRadius: "18px",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
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
            background: "linear-gradient(90deg, #2C4560, #5E7489)",
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
