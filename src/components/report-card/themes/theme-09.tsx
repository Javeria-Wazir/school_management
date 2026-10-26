/* eslint-disable @next/next/no-img-element -- static print layout; next/image adds nothing for local SVGs on paper */
// Generated from the approved design "Class 9 result card — Scholars", then edited by hand. Keep the markup in step with the design.
import { Fragment } from "react";
import type { CardView } from "../types";

const CSS =
  ".rc-theme-09 .row{display:grid;grid-template-columns:28px minmax(0,2.2fr) repeat(4,minmax(0,1fr)) minmax(0,.95fr) minmax(0,.8fr) minmax(0,.9fr);align-items:center;column-gap:6px}\n.rc-theme-09 .row>div{text-align:center}\n.rc-theme-09 .row>div.left{text-align:left}\n.rc-theme-09 .body-row{border-bottom:1px solid #A9B5C2;min-height:34px}\n.rc-theme-09 .mx{color:#4F5D6D;font-size:11px;font-weight:500}";

export function Theme09({ v }: { v: CardView }) {
  return (
    <div className="rc-theme-09">
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
        <div
          aria-hidden="true"
          style={{
            height: "12px",
            background: `linear-gradient(90deg, #2C4560 0%, #4A6580 45%, #5E7489 80%, ${v.accent} 100%)`,
          }}
        ></div>
        <div
          style={{
            padding: "26px 44px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <img
                src={v.logoSrc}
                alt="School crest"
                style={{ width: "34px", height: "38px" }}
              />
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "#2C4560",
                  letterSpacing: "0.5px",
                }}
              >
                {v.schoolName}
              </div>
            </div>
            <div
              style={{
                fontFamily: "var(--rc-font-poppins), sans-serif",
                fontSize: "44px",
                fontWeight: "800",
                lineHeight: "1.05",
                color: "#2C4560",
                marginTop: "8px",
              }}
            >
              Result Sheet
            </div>
            <div
              style={{ fontSize: "14px", color: "#5D6B7B", fontWeight: "600" }}
            >
              {v.termName} · Session {v.yearName} · {v.className} –{" "}
              {v.sectionName} · {v.streamLabel}
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
              src="/report-card/m9-atom.svg"
              alt="Scholars mascot"
              style={{ width: "92px", height: "92px" }}
            />
            <div
              style={{
                fontSize: "12.5px",
                fontWeight: "700",
                color: "#0B4A60",
                background: v.accentSoft,
                borderRadius: "999px",
                padding: "3px 12px",
              }}
            >
              Scholars
            </div>
          </div>
        </div>

        <div
          style={{
            margin: "18px 44px 0",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            padding: "14px 0",
            borderTop: "1px solid #A2AEBC",
            borderBottom: "1px solid #A2AEBC",
          }}
        >
          <img
            src="/report-card/avatar.svg"
            alt="Student photo placeholder"
            style={{ width: "60px", height: "60px", borderRadius: "999px" }}
          />
          <div
            style={{
              fontFamily: "var(--rc-font-poppins), sans-serif",
              fontSize: "22px",
              fontWeight: "700",
              flexGrow: "1",
            }}
          >
            {v.student.name}
          </div>
          <div style={{ display: "flex", gap: "22px", fontSize: "13px" }}>
            <div>
              <div style={{ color: "#5D6B7B", fontWeight: "600" }}>
                Roll No.
              </div>
              <div style={{ fontWeight: "700" }}>{v.student.roll}</div>
            </div>
            <div>
              <div style={{ color: "#5D6B7B", fontWeight: "600" }}>
                Student ID
              </div>
              <div style={{ fontWeight: "700" }}>{v.student.id}</div>
            </div>
            <div>
              <div style={{ color: "#5D6B7B", fontWeight: "600" }}>
                Guardian
              </div>
              <div style={{ fontWeight: "700" }}>{v.student.guardian}</div>
            </div>
          </div>
        </div>

        <div style={{ margin: "14px 44px 0" }}>
          <div
            className="row"
            style={{
              fontSize: "11.5px",
              fontWeight: "700",
              color: "#5D6B7B",
              textTransform: "uppercase",
              letterSpacing: "0.4px",
              padding: "6px 4px",
              borderBottom: "2px solid #1B2633",
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
                  fontSize: "13.5px",
                  fontWeight: "500",
                  padding: "2px 4px",
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
                    style={{ width: "18px", height: "18px" }}
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
                <div style={{ fontWeight: "700" }}>{r.ob}</div>
                <div style={{ color: "#5D6B7B" }}>{r.max}</div>
                <div>{r.pct}</div>
                <div>
                  <span
                    style={{
                      display: "inline-flex",
                      width: "30px",
                      height: "24px",
                      borderRadius: "6px",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#EEF2F7",
                      fontWeight: "700",
                    }}
                  >
                    {r.grade}
                  </span>
                </div>
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

        <div style={{ margin: "18px 44px 0", display: "flex", gap: "16px" }}>
          <div
            style={{
              flexGrow: "1",
              border: "1px solid #A2AEBC",
              borderRadius: "12px",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: "700",
                color: "#5D6B7B",
                textTransform: "uppercase",
                letterSpacing: "0.4px",
              }}
            >
              Performance by subject (%)
            </div>
            <div
              style={{
                height: "118px",
                display: "flex",
                alignItems: "flex-end",
                gap: "10px",
                borderBottom: "1px solid #9AA9B8",
                padding: "0 4px",
              }}
            >
              {v.rows.map((r) => (
                <Fragment key={r.n}>
                  <div
                    style={{
                      flexGrow: "1",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: "3px",
                      height: "118px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10.5px",
                        fontWeight: "700",
                        color: "#3B4A5C",
                      }}
                    >
                      {r.pctShort}
                    </div>
                    <div
                      style={{
                        width: "100%",
                        maxWidth: "26px",
                        height: `${r.barH}px`,
                        borderRadius: "4px 4px 0 0",
                        background: `linear-gradient(180deg, ${v.accent}, #4A6580)`,
                      }}
                    ></div>
                  </div>
                </Fragment>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px", padding: "0 4px" }}>
              {v.rows.map((r) => (
                <Fragment key={r.n}>
                  <div
                    style={{
                      flexGrow: "1",
                      textAlign: "center",
                      fontSize: "10.5px",
                      fontWeight: "700",
                      color: "#5D6B7B",
                    }}
                  >
                    {r.code}
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
          <div
            style={{
              width: "220px",
              flexShrink: "0",
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "10px",
            }}
          >
            <div
              style={{
                borderRadius: "12px",
                background: "#EEF2F7",
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  fontSize: "11.5px",
                  fontWeight: "600",
                  color: "#5D6B7B",
                }}
              >
                Total
              </div>
              <div
                style={{
                  fontFamily: "var(--rc-font-poppins), sans-serif",
                  fontSize: "18px",
                  fontWeight: "700",
                }}
              >
                {v.total}
              </div>
              <div style={{ fontSize: "11.5px", color: "#5D6B7B" }}>
                of {v.maxTotal}
              </div>
            </div>
            <div
              style={{
                borderRadius: "12px",
                background: "#EEF2F7",
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  fontSize: "11.5px",
                  fontWeight: "600",
                  color: "#5D6B7B",
                }}
              >
                Percent
              </div>
              <div
                style={{
                  fontFamily: "var(--rc-font-poppins), sans-serif",
                  fontSize: "18px",
                  fontWeight: "700",
                }}
              >
                {v.pct}%
              </div>
            </div>
            <div
              style={{
                borderRadius: "12px",
                background: v.accentSoft,
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  fontSize: "11.5px",
                  fontWeight: "600",
                  color: "#0B4A60",
                }}
              >
                Grade
              </div>
              <div
                style={{
                  fontFamily: "var(--rc-font-poppins), sans-serif",
                  fontSize: "22px",
                  fontWeight: "800",
                  color: "#073446",
                }}
              >
                {v.grade}
              </div>
            </div>
            <div
              style={{
                borderRadius: "12px",
                background: "#2C4560",
                color: "#FFFFFF",
                padding: "10px 12px",
              }}
            >
              <div style={{ fontSize: "11.5px", fontWeight: "600" }}>
                Result
              </div>
              <div
                style={{
                  fontFamily: "var(--rc-font-poppins), sans-serif",
                  fontSize: "18px",
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
              letterSpacing: "0.4px",
            }}
          >
            Class teacher’s remarks
          </div>
          <div
            style={{
              fontSize: "13.5px",
              lineHeight: "1.55",
              borderLeft: `3px solid ${v.accent}`,
              paddingLeft: "12px",
            }}
          >
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
            margin: "0 44px 20px",
            borderTop: "1px solid #A2AEBC",
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
        <div
          aria-hidden="true"
          style={{
            height: "8px",
            background: `linear-gradient(90deg, ${v.accent} 0%, #5E7489 20%, #4A6580 55%, #2C4560 100%)`,
          }}
        ></div>

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
