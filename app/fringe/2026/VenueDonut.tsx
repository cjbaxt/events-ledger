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
const CX = 300, CY = 215, R = 118, ri = 68;
// Fixed elbow columns — all leader lines converge here before turning horizontal
const ELBOW_LEFT  = CX - R - 20;   // 162
const ELBOW_RIGHT = CX + R + 20;   // 438
// Fixed label anchor columns
const LABEL_LEFT  = ELBOW_LEFT  - 38;  // 124  anchor="end"
const LABEL_RIGHT = ELBOW_RIGHT + 38;  // 476  anchor="start"
const MIN_GAP = 32; // min px between label baselines

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

// Push labels apart (downward pass), min gap between baselines
function resolveCollisions(eys: number[]): number[] {
  if (eys.length === 0) return [];
  const result = [...eys];
  const order = [...result.map((_, i) => i)].sort((a, b) => result[a] - result[b]);
  for (let pass = 0; pass < 20; pass++) {
    let changed = false;
    for (let j = 1; j < order.length; j++) {
      const pi = order[j - 1], ci = order[j];
      if (result[ci] - result[pi] < MIN_GAP) {
        result[ci] = result[pi] + MIN_GAP;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return result;
}

export default function VenueDonut({ groups }: { groups: VenueGroupData[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const orderedGroups = [...groups].sort((a, b) => b.shows - a.shows);
  const total = orderedGroups.reduce((s, g) => s + g.shows, 0);

  // Build segment geometry
  let startAngle = -Math.PI / 2;
  const raw = orderedGroups.map(g => {
    const sweep = (g.shows / total) * TAU - GAP;
    const a0 = startAngle + GAP / 2;
    const a1 = a0 + sweep;
    const midA = (a0 + a1) / 2;
    const pct = Math.round((g.shows / total) * 100);
    const path = arcPath(a0, a1);
    startAngle += sweep + GAP;

    const cos = Math.cos(midA), sin = Math.sin(midA);
    const isRight = cos >= 0;
    const ax = CX + (R + 5) * cos;
    const ay = CY + (R + 5) * sin;
    // Natural label y: where the segment midpoint sits vertically
    const naturalEy = CY + (R + 32) * sin;

    return { g, pct, path, ax, ay, naturalEy, isRight };
  });

  // Resolve collisions per side independently
  const leftIdxs  = raw.map((_, i) => i).filter(i => !raw[i].isRight).sort((a, b) => raw[a].naturalEy - raw[b].naturalEy);
  const rightIdxs = raw.map((_, i) => i).filter(i =>  raw[i].isRight).sort((a, b) => raw[a].naturalEy - raw[b].naturalEy);

  const adjustedEy = raw.map(s => s.naturalEy);
  const leftAdj  = resolveCollisions(leftIdxs.map(i  => raw[i].naturalEy));
  const rightAdj = resolveCollisions(rightIdxs.map(i => raw[i].naturalEy));
  leftIdxs.forEach((idx, j)  => { adjustedEy[idx] = leftAdj[j]; });
  rightIdxs.forEach((idx, j) => { adjustedEy[idx] = rightAdj[j]; });

  const segments = raw.map((s, i) => ({
    ...s,
    ey:     adjustedEy[i],
    elbowX: s.isRight ? ELBOW_RIGHT : ELBOW_LEFT,
    labelX: s.isRight ? LABEL_RIGHT : LABEL_LEFT,
    anchor: (s.isRight ? "start" : "end") as "start" | "end",
  }));

  const h = hovered !== null ? segments[hovered] : null;
  const mainText  = h ? h.g.name      : String(total);
  const subText   = h ? `${h.pct}%`   : "SHOWS";
  const mainColor = h ? (h.g.labelColor ?? h.g.color) : "#002B49";
  const subColor  = h ? (h.g.labelColor ?? h.g.color) : muted;
  const mainY     = h ? CY + 2        : CY + 12;
  const mainSize  = h ? "22"          : "42";
  const subY      = h ? CY + 22       : CY + 30;
  const subSize   = h ? "18"          : "11";

  const tableRows = [...groups].sort((a, b) => b.avgRating - a.avgRating);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg viewBox="0 0 600 445" style={{ width: "100%", maxWidth: 600, overflow: "visible", display: "block" }}>
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
            // 3-point leader: arc surface → fixed elbow at (elbowX, ey) → label
            return (
              <g key={s.g.name + "-lbl"} style={{ pointerEvents: "none" }}>
                <polyline
                  points={`${s.ax.toFixed(1)},${s.ay.toFixed(1)} ${s.elbowX},${s.ey.toFixed(1)} ${s.labelX},${s.ey.toFixed(1)}`}
                  fill="none" stroke={lc} strokeWidth="1" opacity="0.55"
                />
                <text x={s.labelX} y={s.ey - 3} textAnchor={s.anchor}
                  style={{ fontFamily: font, fontSize: 11, fontWeight: 600, fill: lc, opacity: 0.9 }}>
                  {s.g.name}
                </text>
                <text x={s.labelX} y={s.ey + 11} textAnchor={s.anchor}
                  style={{ fontFamily: font, fontSize: 10, fill: muted }}>
                  {s.pct}% · {s.g.shows} show{s.g.shows !== 1 ? "s" : ""}
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
          {tableRows.map(g => (
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
        <strong style={{ color: "#002B49", fontWeight: 600 }}>Summerhall and Underbelly were your highest-rated stops.</strong> Pleasance is a rooms-per-show marvel: 8 shows across 7 different rooms. Assembly filled over 40% of your schedule across 7 different venues and still only hit mid-table on ratings.
      </div>
    </div>
  );
}
