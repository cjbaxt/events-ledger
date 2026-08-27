"use client";
import { useState } from "react";

export type VenueGroupData = {
  name: string;
  color: string;
  labelColor?: string;
  stroke: string | null;
  shows: number;
  rooms: number;
  avgRating: number;
};

const TAU = 2 * Math.PI;
const GAP = 0.022;
const CX = 250, CY = 210, R = 118, ri = 68;
const font = "var(--font-sans), system-ui, sans-serif";
const muted = "#6B8FA8";
const borderCol = "#C2D5E3";

function arcPath(a0: number, a1: number) {
  const x1 = CX + R * Math.cos(a0),  y1 = CY + R * Math.sin(a0);
  const x2 = CX + R * Math.cos(a1),  y2 = CY + R * Math.sin(a1);
  const x3 = CX + ri * Math.cos(a1), y3 = CY + ri * Math.sin(a1);
  const x4 = CX + ri * Math.cos(a0), y4 = CY + ri * Math.sin(a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${x3},${y3} A${ri},${ri} 0 ${large},0 ${x4},${y4} Z`;
}

export default function VenueDonut({ groups }: { groups: VenueGroupData[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const total = groups.reduce((s, g) => s + g.shows, 0);

  let startAngle = -Math.PI / 2;
  const segments = groups.map(g => {
    const sweep = (g.shows / total) * TAU - GAP;
    const a0 = startAngle + GAP / 2;
    const a1 = a0 + sweep;
    const midA = (a0 + a1) / 2;
    const pct = Math.round((g.shows / total) * 100);
    const path = arcPath(a0, a1);
    startAngle += sweep + GAP;

    const cos = Math.cos(midA), sin = Math.sin(midA);
    const isRight = cos >= 0;
    const ax = CX + (R + 4) * cos,   ay = CY + (R + 4) * sin;
    const bx = CX + (R + 20) * cos,  by = CY + (R + 20) * sin;
    const tickLen = g.name.length > 10 ? 12 : 10;
    const ex = bx + (isRight ? tickLen : -tickLen);
    const ey = by;
    const tx = ex + (isRight ? 4 : -4);
    const anchor = (isRight ? "start" : "end") as "start" | "end";

    return { g, pct, path, ax, ay, bx, by, ex, ey, tx, anchor };
  });

  const h = hovered !== null ? segments[hovered] : null;
  const mainText  = h ? h.g.name      : String(total);
  const subText   = h ? `${h.pct}%`   : "SHOWS";
  const mainColor = h ? (h.g.labelColor ?? h.g.color) : "#002B49";
  const subColor  = h ? (h.g.labelColor ?? h.g.color) : muted;
  const mainY     = h ? CY + 2        : CY + 12;
  const mainSize  = h ? "22"          : "42";
  const subY      = h ? CY + 22       : CY + 30;
  const subSize   = h ? "18"          : "11";

  const sorted = [...groups].sort((a, b) => b.avgRating - a.avgRating);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg viewBox="0 0 500 440" style={{ width: "100%", maxWidth: 500, overflow: "visible", display: "block" }}>
          {segments.map((s, i) => (
            <path
              key={s.g.name}
              d={s.path}
              fill={s.g.color}
              opacity={hovered === i ? 1 : 0.95}
              stroke={s.g.stroke ?? undefined}
              strokeWidth={s.g.stroke ? 1.5 : undefined}
              style={{ cursor: "pointer", transition: "opacity 0.15s" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}

          {segments.map(s => {
            const lc = s.g.labelColor ?? s.g.color;
            return (
              <g key={s.g.name + "-lbl"} style={{ pointerEvents: "none" }}>
                <polyline
                  points={`${s.ax},${s.ay} ${s.bx},${s.by} ${s.ex},${s.ey}`}
                  fill="none" stroke={lc} strokeWidth="1" opacity="0.6"
                />
                <text x={s.tx} y={s.ey - 3} textAnchor={s.anchor}
                  style={{ fontFamily: font, fontSize: 11, fontWeight: 600, fill: lc, opacity: 0.9 }}>
                  {s.g.name}
                </text>
                <text x={s.tx} y={s.ey + 11} textAnchor={s.anchor}
                  style={{ fontFamily: font, fontSize: 10, fill: muted }}>
                  {s.pct}% · {s.g.shows} shows
                </text>
              </g>
            );
          })}

          <text x={CX} y={mainY} textAnchor="middle"
            style={{ fontFamily: font, fontSize: mainSize, fontWeight: 700, fill: mainColor, transition: "all 0.15s" }}>
            {mainText}
          </text>
          <text x={CX} y={subY} textAnchor="middle"
            style={{ fontFamily: font, fontSize: subSize, fontWeight: h ? 600 : 400, letterSpacing: h ? 0 : "0.13em", fill: subColor, transition: "all 0.15s" }}>
            {subText}
          </text>
        </svg>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font }}>
        <thead>
          <tr>
            {(["Venue group", "Shows", "Rooms", "Avg rating"] as const).map((label, i) => (
              <th key={label} style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: muted, padding: "0 0 8px", fontWeight: 500, textAlign: i === 0 ? "left" : "right", borderBottom: `1px solid ${borderCol}` }}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(g => (
            <tr key={g.name} style={{ borderBottom: "1px solid #D4E3EE" }}>
              <td style={{ padding: "10px 0", fontSize: 14, color: "#4A6880" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: g.color, border: g.stroke ? `1px solid ${g.stroke}` : undefined }} />
                  <span style={{ color: "#002B49", fontWeight: 600 }}>{g.name}</span>
                </div>
              </td>
              <td style={{ padding: "10px 0", fontSize: 14, color: "#4A6880", textAlign: "right" }}>{g.shows}</td>
              <td style={{ padding: "10px 0", fontSize: 14, color: "#4A6880", textAlign: "right" }}>{g.rooms}</td>
              <td style={{ padding: "10px 0", fontSize: 13, color: "#4A6880", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{g.avgRating.toFixed(2)}★</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ background: "#D4E3EE", borderLeft: "3px solid #002B49", borderRadius: "0 3px 3px 0", padding: "12px 16px", marginTop: "1.5rem", fontFamily: font, fontSize: 14, color: "#4A6880", lineHeight: 1.55 }}>
        <strong style={{ color: "#002B49", fontWeight: 600 }}>Summerhall and Underbelly were your highest-rated stops</strong> — 2 and 5 rooms respectively, both outperforming Assembly&rsquo;s sprawling 14. Pleasance is a rooms-per-show marvel: 7 shows, 7 different rooms. Assembly filled 42% of your schedule across 7 venues and still only hit mid-table on ratings.
      </div>
    </div>
  );
}
