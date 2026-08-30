"use client";
import { useRef, useState } from "react";

export type DotStripShow = {
  id: string;
  title: string;
  rating: number;
  venueName: string | null;
  reviewSnippet: string | null;
};

export type DotStripGroup = {
  type: string;
  shows: DotStripShow[];
};

const R = 6;
const STEP = R * 2 + 5;
const font = "var(--font-sans), system-ui, sans-serif";
const navy = "#002B49";
const muted = "#6B8FA8";
const yellow = "#FFCE00";
const borderCol = "#E0E8EF";

function dotFill(r: number) {
  if (r >= 5)   return "#002B49";
  if (r >= 4.5) return "#1A4A7A";
  if (r >= 4)   return "#2E6494";
  if (r >= 3.5) return "#5B8FB0";
  if (r >= 3)   return "#8AADC4";
  return "#B0C8D8";
}

function starStr(r: number) {
  return "★".repeat(Math.floor(r)) + (r % 1 >= 0.5 ? "½" : "");
}

export default function GenreDotStrip({ groups }: { groups: DotStripGroup[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ show: DotStripShow; x: number; y: number } | null>(null);

  return (
    <div ref={wrapRef} style={{ fontFamily: font, position: "relative" }}>
      {/* axis label row */}
      <div style={{ display: "flex", borderBottom: `1px solid ${borderCol}`, paddingBottom: "0.5rem" }}>
        <div style={{ width: 144, flexShrink: 0 }} />
        <div style={{ flex: 1, position: "relative", height: 16 }}>
          {[1, 2, 3, 4, 5].map(v => (
            <span key={v} style={{
              position: "absolute",
              left: `${(v - 1) / 4 * 100}%`,
              transform: "translateX(-50%)",
              fontSize: 9,
              fontWeight: 600,
              color: muted,
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
            }}>{v}★</span>
          ))}
        </div>
      </div>

      {groups.map(({ type, shows }) => {
        const avg = shows.length
          ? Math.round(shows.reduce((s, e) => s + e.rating, 0) / shows.length * 100) / 100
          : null;

        const byRating = new Map<number, DotStripShow[]>();
        for (const s of shows) {
          if (!byRating.has(s.rating)) byRating.set(s.rating, []);
          byRating.get(s.rating)!.push(s);
        }
        const maxStack = Math.max(1, ...Array.from(byRating.values()).map(a => a.length));
        const svgH = maxStack * STEP + 12;
        const cy0 = svgH / 2;

        return (
          <div key={type} style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${borderCol}` }}>
            <div style={{ width: 144, flexShrink: 0, padding: "10px 16px 10px 0" }}>
              <div style={{ color: navy, fontSize: "0.9rem", fontWeight: 800, textTransform: "capitalize", letterSpacing: "-0.02em" }}>{type}</div>
              <div style={{ color: muted, fontSize: "0.58rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 3 }}>
                {shows.length} show{shows.length !== 1 ? "s" : ""}
                {avg !== null && <> · <span style={{ color: navy }}>{avg}</span><span style={{ color: yellow }}>★</span></>}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <svg width="100%" height={svgH} style={{ overflow: "visible", display: "block" }}>
                <line x1="0%" y1={cy0} x2="100%" y2={cy0} stroke={borderCol} strokeWidth="1" />
                {Array.from(byRating.entries()).flatMap(([rating, arr]) => {
                  const xp = (rating - 1) / 4 * 100;
                  return arr.map((s, i) => {
                    const yOff = (i - (arr.length - 1) / 2) * STEP;
                    return (
                      <circle
                        key={s.id}
                        cx={`${xp}%`}
                        cy={cy0 + yOff}
                        r={R}
                        fill={dotFill(rating)}
                        opacity={tip && tip.show.id !== s.id ? 0.4 : 0.88}
                        style={{ cursor: "pointer", transition: "opacity 0.12s" }}
                        onMouseEnter={ev => {
                          const cr = (ev.currentTarget as SVGCircleElement).getBoundingClientRect();
                          const wr = wrapRef.current!.getBoundingClientRect();
                          setTip({ show: s, x: cr.left - wr.left + cr.width / 2, y: cr.top - wr.top });
                        }}
                        onMouseLeave={() => setTip(null)}
                      />
                    );
                  });
                })}
              </svg>
            </div>
          </div>
        );
      })}

      {tip && (
        <div style={{
          position: "absolute",
          left: tip.x,
          top: tip.y,
          transform: "translate(-50%, calc(-100% - 10px))",
          background: navy,
          borderRadius: 4,
          padding: "8px 12px",
          maxWidth: 240,
          pointerEvents: "none",
          zIndex: 20,
          boxShadow: "0 4px 20px rgba(0,0,0,0.28)",
        }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, lineHeight: 1.35 }}>{tip.show.title}</div>
          {tip.show.venueName && (
            <div style={{ color: "#5A8AB0", fontSize: 11, marginTop: 2 }}>{tip.show.venueName}</div>
          )}
          <div style={{ color: yellow, fontSize: 11, fontWeight: 600, marginTop: 4 }}>{starStr(tip.show.rating)}</div>
          {tip.show.reviewSnippet && (
            <div style={{ color: "#7AACC4", fontSize: 11, lineHeight: 1.5, marginTop: 4 }}>{tip.show.reviewSnippet}</div>
          )}
          <div style={{
            position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
            borderTop: `5px solid ${navy}`,
          }} />
        </div>
      )}
    </div>
  );
}
