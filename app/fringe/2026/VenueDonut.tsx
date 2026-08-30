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
const CX = 300, CY = 220, R = 118, ri = 68;
const LABEL_R = 175;                         // label anchor radius from center
const TIP_R   = R + 8;                       // leader line start radius
const MIN_ANG  = (30 * Math.PI) / 180;       // 30° min angular gap between labels

const font = "var(--font-sans), system-ui, sans-serif";
const muted = "#6B8FA8";
const borderCol = "#C2D5E3";

function arcPath(a0: number, a1: number) {
  const x1 = CX + R  * Math.cos(a0), y1 = CY + R  * Math.sin(a0);
  const x2 = CX + R  * Math.cos(a1), y2 = CY + R  * Math.sin(a1);
  const x3 = CX + ri * Math.cos(a1), y3 = CY + ri * Math.sin(a1);
  const x4 = CX + ri * Math.cos(a0), y4 = CY + ri * Math.sin(a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${x3},${y3} A${ri},${ri} 0 ${large},0 ${x4},${y4} Z`;
}

// Push label angles apart (minimum angular gap), then center on the original centroid
function resolveAngularCollisions(anglesIn: number[]): number[] {
  const n = anglesIn.length;
  if (n <= 1) return [...anglesIn];

  // Sort indices by angle, push forward only
  const idxs = [...Array(n).keys()].sort((a, b) => anglesIn[a] - anglesIn[b]);
  const result = [...anglesIn];

  for (let pass = 0; pass < 20; pass++) {
    let changed = false;
    for (let j = 1; j < n; j++) {
      const pi = idxs[j - 1], ci = idxs[j];
      if (result[ci] - result[pi] < MIN_ANG) {
        result[ci] = result[pi] + MIN_ANG;
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Re-center so we don't drift away from the original centroid
  const origMean = anglesIn.reduce((s, a) => s + a, 0) / n;
  const newMean  = result.reduce((s, a) => s + a, 0) / n;
  const shift = origMean - newMean;
  return result.map(a => a + shift);
}

export default function VenueDonut({ groups }: { groups: VenueGroupData[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const orderedGroups = [...groups].sort((a, b) => b.shows - a.shows);
  const total = orderedGroups.reduce((s, g) => s + g.shows, 0);

  // Build arc geometry + natural label angle per segment
  let startAngle = -Math.PI / 2;
  const raw = orderedGroups.map(g => {
    const sweep = (g.shows / total) * TAU - GAP;
    const a0 = startAngle + GAP / 2;
    const a1 = a0 + sweep;
    const midA = (a0 + a1) / 2;
    const pct = Math.round((g.shows / total) * 100);
    const path = arcPath(a0, a1);
    startAngle += sweep + GAP;
    const tipX = CX + TIP_R * Math.cos(midA);
    const tipY = CY + TIP_R * Math.sin(midA);
    return { g, pct, path, midA, tipX, tipY };
  });

  // Angular collision avoidance on all segments together
  const adjAngles = resolveAngularCollisions(raw.map(s => s.midA));

  const segments = raw.map((s, i) => {
    const adj = adjAngles[i];
    const lcos = Math.cos(adj), lsin = Math.sin(adj);
    const lx = CX + LABEL_R * lcos;
    const ly = CY + LABEL_R * lsin;
    const anchor: "start" | "end" | "middle" =
      Math.abs(lcos) < 0.15 ? "middle" : lcos > 0 ? "start" : "end";
    const lc = s.g.labelColor ?? s.g.color;
    return { ...s, lx, ly, anchor, lc };
  });

  const h = hovered !== null ? segments[hovered] : null;
  const mainText  = h ? h.g.name    : String(total);
  const subText   = h ? `${h.pct}%` : "SHOWS";
  const mainColor = h ? (h.g.labelColor ?? h.g.color) : "#002B49";
  const subColor  = h ? (h.g.labelColor ?? h.g.color) : muted;
  const mainY     = h ? CY + 2      : CY + 12;
  const mainSize  = h ? "22"        : "42";
  const subY      = h ? CY + 22     : CY + 30;
  const subSize   = h ? "18"        : "11";

  const tableRows = [...groups].sort((a, b) => b.avgRating - a.avgRating);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg viewBox="0 0 580 450" style={{ width: "100%", maxWidth: 580, overflow: "visible", display: "block" }}>
          {/* Arc segments */}
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

          {/* Leader lines + labels */}
          {segments.map(s => (
            <g key={s.g.name + "-lbl"} style={{ pointerEvents: "none" }}>
              <circle cx={s.tipX.toFixed(1)} cy={s.tipY.toFixed(1)} r="2" fill={s.lc} opacity="0.5" />
              <line
                x1={s.tipX.toFixed(1)} y1={s.tipY.toFixed(1)}
                x2={s.lx.toFixed(1)}  y2={s.ly.toFixed(1)}
                stroke={s.lc} strokeWidth="1" opacity="0.5"
              />
              <text x={s.lx.toFixed(1)} y={(s.ly - 3).toFixed(1)} textAnchor={s.anchor}
                style={{ fontFamily: font, fontSize: 11, fontWeight: 600, fill: s.lc, opacity: 0.9 }}>
                {s.g.name}
              </text>
              <text x={s.lx.toFixed(1)} y={(s.ly + 11).toFixed(1)} textAnchor={s.anchor}
                style={{ fontFamily: font, fontSize: 10, fill: muted }}>
                {s.pct}% · {s.g.shows} show{s.g.shows !== 1 ? "s" : ""}
              </text>
            </g>
          ))}

          {/* Hover centre text */}
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
