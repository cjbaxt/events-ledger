import { useState, useEffect } from "react";
import { url } from "../lib/base";
import { fetchEvents } from "../lib/api";
import type { EventListItem } from "../types/events";
import EventTypeIcon from "./EventTypeIcon";

const TYPE_LABELS: Record<string, string> = {
  comedy: "Comedy", theatre: "Theatre", exhibition: "Exhibition",
  music: "Music", circus: "Circus", cabaret: "Cabaret",
  ballet: "Ballet", classical: "Classical", opera: "Opera",
  talk: "Talk", dance: "Dance", other: "Other",
  spoken_word: "Spoken Word", screening: "Screening",
};

function StarSvg({ fill, size = 12 }: { fill: number; size?: number }) {
  const id = `clip-stats-${Math.random().toString(36).slice(2)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
      <defs><clipPath id={id}><rect x="0" y="0" width={14 * fill} height="14" /></clipPath></defs>
      <path d="M7 1l1.545 3.09L12 4.635l-2.5 2.41.59 3.41L7 8.77l-3.09 1.685.59-3.41L2 4.635l3.455-.545L7 1z"
        stroke="currentColor" strokeWidth="1" strokeLinejoin="round" className="text-neutral-200" />
      {fill > 0 && (
        <path d="M7 1l1.545 3.09L12 4.635l-2.5 2.41.59 3.41L7 8.77l-3.09 1.685.59-3.41L2 4.635l3.455-.545L7 1z"
          fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"
          clipPath={`url(#${id})`} className="text-neutral-600" />
      )}
    </svg>
  );
}

function MiniStars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5 items-center">
      {[1,2,3,4,5].map((s) => (
        <StarSvg key={s} fill={Math.min(1, Math.max(0, rating - (s - 1)))} size={11} />
      ))}
    </span>
  );
}

function openEvent(id: string) {
  window.dispatchEvent(new CustomEvent("open-event", { detail: id }));
}
function openEntity(id: string, kind: "person" | "ensemble" | null) {
  const name = kind === "ensemble" ? "open-ensemble" : "open-person";
  window.dispatchEvent(new CustomEvent(name, { detail: id }));
}
function openVenue(id: string) {
  window.dispatchEvent(new CustomEvent("open-venue", { detail: id }));
}

// ── Tab: By Type ─────────────────────────────────────────────────────────────

const PASTEL_COLORS = [
  "#e8d5d5", "#d5e0e8", "#d5e8d8", "#e8e0d5", "#ddd5e8",
  "#d5e8e4", "#e8ddd5", "#d5d8e8", "#e8d5e2", "#dce8d5",
  "#e8e8d5", "#d5e8e8", "#e2d5e8", "#d5e4e8", "#e8d8d5",
];

function strHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const SUBTYPE_LABEL = (s: string) => s.replace(/_/g, " ");

function TypeDrillDown({ type, evts, subtype, onBack }: { type: string; evts: EventListItem[]; subtype?: string; onBack: () => void }) {
  const filtered = subtype ? evts.filter(e => (e as any).subtype === subtype) : evts;
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  const label = subtype
    ? `${TYPE_LABELS[type] ?? type} — ${SUBTYPE_LABEL(subtype)}`
    : (TYPE_LABELS[type] ?? type);
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 transition-colors mb-5">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back
      </button>
      <div className="flex items-center gap-2 mb-5">
        <EventTypeIcon type={type} size={14} />
        <span className="font-serif text-xl text-neutral-900 capitalize">{label}</span>
        <span className="text-sm text-neutral-300">{filtered.length}</span>
      </div>
      <div className="space-y-0.5">
        {sorted.map(e => (
          <button
            key={e.id}
            onClick={() => openEvent(e.id)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left group"
          >
            <span className="text-[10px] text-neutral-300 w-10 flex-shrink-0">{e.date.slice(0, 4)}</span>
            <span className="flex-1 font-serif text-sm text-neutral-900 truncate group-hover:underline underline-offset-2">{e.title}</span>
            <span className="text-[10px] text-neutral-300 flex-shrink-0 truncate max-w-[30%]">{e.venue_name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ByTypeTab({ events }: { events: EventListItem[] }) {
  const [drill, setDrill] = useState<{ type: string; subtype?: string } | null>(null);
  const [hovered, setHovered] = useState<{ type: string; subtype: string; count: number } | null>(null);

  const byType = new Map<string, EventListItem[]>();
  for (const e of events) {
    if (!byType.has(e.type)) byType.set(e.type, []);
    byType.get(e.type)!.push(e);
  }
  const types = [...byType.entries()].sort((a, b) => b[1].length - a[1].length);


  if (drill) {
    return <TypeDrillDown type={drill.type} evts={byType.get(drill.type) ?? []} subtype={drill.subtype} onBack={() => setDrill(null)} />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {types.map(([type, evts]) => {
        const entityCounts = new Map<string, { name: string; id: string; kind: "person" | "ensemble" | null; n: number }>();
        for (const e of evts) {
          if (e.primary_entity_name && e.primary_entity_id) {
            const prev = entityCounts.get(e.primary_entity_id);
            entityCounts.set(e.primary_entity_id, { name: e.primary_entity_name, id: e.primary_entity_id, kind: e.primary_entity_kind, n: (prev?.n ?? 0) + 1 });
          }
        }
        const top = [...entityCounts.values()].sort((a, b) => b.n - a.n).find(e => e.n > 1) ?? null;

        const subtypeCounts = new Map<string, number>();
        for (const e of evts) {
          const s = (e as any).subtype ?? "other";
          subtypeCounts.set(s, (subtypeCounts.get(s) ?? 0) + 1);
        }
        const subtypes = [...subtypeCounts.entries()].sort((a, b) => b[1] - a[1]);

        return (
          <div
            key={type}
            onClick={() => setDrill({ type })}
            className="border border-neutral-100 rounded-xl p-3 flex flex-col gap-2 cursor-pointer hover:border-neutral-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-1.5 text-neutral-400">
              <EventTypeIcon type={type} size={12} />
              <span className="text-[10px] uppercase tracking-widest">{TYPE_LABELS[type] ?? type}</span>
            </div>
            <div className="font-serif text-3xl text-neutral-900 leading-none">{evts.length}</div>

            {subtypes.length > 0 && (
              <div className="relative">
                <div className="flex h-3 rounded-full overflow-hidden gap-px">
                  {subtypes.map(([sub, count], i) => (
                    <button
                      key={sub}
                      style={{ width: `${(count / evts.length) * 100}%`, background: PASTEL_COLORS[(strHash(type) + i) % PASTEL_COLORS.length], filter: hovered?.type === type && hovered?.subtype === sub ? "brightness(0.9)" : "none" }}
                      className="h-full focus:outline-none transition-all"
                      onMouseEnter={e => { e.stopPropagation(); setHovered({ type, subtype: sub, count }); }}
                      onMouseLeave={() => setHovered(null)}
                      onClick={e => { e.stopPropagation(); setDrill({ type, subtype: sub }); }}
                    />
                  ))}
                </div>
                {hovered?.type === type && (
                  <div className="absolute top-full mt-1.5 right-0 bg-neutral-900 text-white text-[10px] rounded-md px-2 py-1 whitespace-nowrap pointer-events-none z-10 capitalize">
                    {SUBTYPE_LABEL(hovered.subtype)} · {hovered.count}
                  </div>
                )}
              </div>
            )}

            {top && (
              <div>
                <div className="text-[9px] uppercase tracking-widest text-neutral-300 mb-1">Most seen</div>
                <button
                  onClick={(e) => { e.stopPropagation(); openEntity(top.id, top.kind); }}
                  className="text-xs text-neutral-600 font-serif leading-snug text-left hover:text-neutral-900 hover:underline underline-offset-2 transition-colors active:opacity-60"
                >
                  {top.name}
                  {top.n > 1 && <span className="font-sans text-neutral-300 ml-1">×{top.n}</span>}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Artists ──────────────────────────────────────────────────────────────

function ArtistsTab({ events }: { events: EventListItem[] }) {
  const counts = new Map<string, { name: string; id: string; kind: "person" | "ensemble" | null; n: number; types: Set<string> }>();
  for (const e of events) {
    if (e.primary_entity_name && e.primary_entity_id) {
      const prev = counts.get(e.primary_entity_id);
      if (prev) { prev.n++; prev.types.add(e.type); }
      else counts.set(e.primary_entity_id, { name: e.primary_entity_name, id: e.primary_entity_id, kind: e.primary_entity_kind, n: 1, types: new Set([e.type]) });
    }
  }
  const ranked = [...counts.values()].filter(a => a.n > 1).sort((a, b) => b.n - a.n);
  if (!ranked.length) return <p className="text-sm text-neutral-400">No repeat artists yet.</p>;

  return (
    <div className="space-y-1">
      {ranked.map((a, i) => (
        <button
          key={a.id}
          onClick={() => openEntity(a.id, a.kind)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left group"
        >
          <span className="text-[10px] text-neutral-300 w-5 text-right flex-shrink-0">{i + 1}</span>
          <span className="flex-1 font-serif text-sm text-neutral-900 truncate group-hover:underline underline-offset-2">{a.name}</span>
          <span className="flex gap-1 flex-shrink-0">
            {[...a.types].map(t => <EventTypeIcon key={t} type={t} size={12} />)}
          </span>
          <span className="text-xs text-neutral-400 flex-shrink-0 w-6 text-right">×{a.n}</span>
        </button>
      ))}
    </div>
  );
}

// ── Tab: Venues ───────────────────────────────────────────────────────────────

function VenuesTab({ events }: { events: EventListItem[] }) {
  const counts = new Map<string, { name: string; id: string; n: number }>();
  for (const e of events) {
    if (e.venue_name && e.venue_id) {
      const prev = counts.get(e.venue_id);
      if (prev) prev.n++;
      else counts.set(e.venue_id, { name: e.venue_name, id: e.venue_id, n: 1 });
    }
  }
  const ranked = [...counts.values()].filter(v => v.n > 1).sort((a, b) => b.n - a.n);
  if (!ranked.length) return <p className="text-sm text-neutral-400">No repeat venues yet.</p>;

  return (
    <div className="space-y-1">
      {ranked.map((v, i) => (
        <button
          key={v.id}
          onClick={() => openVenue(v.id)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left group"
        >
          <span className="text-[10px] text-neutral-300 w-5 text-right flex-shrink-0">{i + 1}</span>
          <span className="flex-1 text-sm text-neutral-900 truncate group-hover:underline underline-offset-2">{v.name}</span>
          <span className="text-xs text-neutral-400 flex-shrink-0">×{v.n}</span>
        </button>
      ))}
    </div>
  );
}

// ── Tab: Over Time ────────────────────────────────────────────────────────────

function OverTimeTab({ events }: { events: EventListItem[] }) {
  const byYear = new Map<string, { count: number; spend: number }>();
  for (const e of events) {
    const y = e.date.slice(0, 4);
    const prev = byYear.get(y) ?? { count: 0, spend: 0 };
    const price = e.price_paid ? parseFloat(e.price_paid) * (e.currency === "GBP" ? 1.19 : 1) : 0;
    byYear.set(y, { count: prev.count + 1, spend: prev.spend + price });
  }
  const years = [...byYear.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const maxCount = Math.max(...years.map(([, v]) => v.count));

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-4">Events per year</div>
        <div className="space-y-2">
          {years.map(([year, { count, spend }], i) => (
            <>
              {i > 0 && years[i - 1][0] === "2025" && parseInt(year) < 2025 && (
                <div key="gap-divider" className="flex items-center gap-3 py-1">
                  <span className="text-[10px] uppercase tracking-widest text-orange-300 w-full">memory gaps below</span>
                </div>
              )}
              <button
                key={year}
                className="flex items-center gap-3 w-full text-left hover:opacity-70 transition-opacity"
                onClick={() => window.location.href = url(`/?year=${year}`)}
              >
                <span className={`text-xs w-10 flex-shrink-0 ${parseInt(year) < 2025 ? "text-neutral-300" : "text-neutral-400"}`}>{year}</span>
                <div className="flex-1 h-6 bg-neutral-50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${parseInt(year) < 2025 ? "bg-neutral-100" : "bg-neutral-200"}`}
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className={`text-xs w-6 text-right flex-shrink-0 ${parseInt(year) < 2025 ? "text-neutral-300" : "text-neutral-500"}`}>{count}</span>
                <span className="text-xs text-neutral-300 w-14 text-right flex-shrink-0">
                  {spend > 0 ? `€${Math.round(spend)}` : ""}
                </span>
              </button>
            </>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Breakdown ────────────────────────────────────────────────────────────

const SUBTYPE_COLORS: string[] = [
  "#a3a3a3", "#d4b896", "#9db8b8", "#b8a9c9", "#b8c9a9",
  "#c9b8a9", "#a9b8c9", "#c9a9b8", "#b8b8a3", "#a9c9c9",
  "#c9c9a9", "#b8a3a3", "#a3b8a9",
];

function BreakdownTab({ events }: { events: EventListItem[] }) {
  const [hovered, setHovered] = useState<{ type: string; subtype: string } | null>(null);
  const [drill, setDrill] = useState<{ type: string; subtype: string | null } | null>(null);

  const byType = new Map<string, Map<string, EventListItem[]>>();
  for (const e of events) {
    if (!byType.has(e.type)) byType.set(e.type, new Map());
    const sub = (e as any).subtype ?? "unknown";
    const subtypeMap = byType.get(e.type)!;
    if (!subtypeMap.has(sub)) subtypeMap.set(sub, []);
    subtypeMap.get(sub)!.push(e);
  }

  const allSubtypes = new Set<string>();
  byType.forEach(sm => sm.forEach((_, s) => allSubtypes.add(s)));
  const subtypeList = [...allSubtypes];
  const colorMap = new Map(subtypeList.map((s, i) => [s, SUBTYPE_COLORS[i % SUBTYPE_COLORS.length]]));

  const types = [...byType.entries()].sort((a, b) => {
    const ta = [...a[1].values()].reduce((n, arr) => n + arr.length, 0);
    const tb = [...b[1].values()].reduce((n, arr) => n + arr.length, 0);
    return tb - ta;
  });
  const maxCount = Math.max(...types.map(([, sm]) => [...sm.values()].reduce((n, arr) => n + arr.length, 0)));

  if (drill) {
    const subtypeMap = byType.get(drill.type)!;
    const evts = drill.subtype
      ? (subtypeMap.get(drill.subtype) ?? [])
      : [...subtypeMap.values()].flat();
    const sorted = [...evts].sort((a, b) => b.date.localeCompare(a.date));
    const label = drill.subtype
      ? `${TYPE_LABELS[drill.type] ?? drill.type} — ${drill.subtype.replace(/_/g, " ")}`
      : (TYPE_LABELS[drill.type] ?? drill.type);
    return (
      <div>
        <button onClick={() => setDrill(null)} className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 transition-colors mb-5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back
        </button>
        <div className="flex items-center gap-2 mb-5">
          <EventTypeIcon type={drill.type} size={14} />
          <span className="font-serif text-xl text-neutral-900 capitalize">{label}</span>
          <span className="text-sm text-neutral-300">{evts.length}</span>
        </div>
        <div className="space-y-0.5">
          {sorted.map(e => (
            <button key={e.id} onClick={() => openEvent(e.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left group">
              <span className="text-[10px] text-neutral-300 w-10 flex-shrink-0">{e.date.slice(0, 4)}</span>
              <span className="flex-1 font-serif text-sm text-neutral-900 truncate group-hover:underline underline-offset-2">{e.title}</span>
              <span className="text-[10px] text-neutral-300 flex-shrink-0 truncate max-w-[30%]">{e.venue_name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {types.map(([type, subtypeMap]) => {
        const total = [...subtypeMap.values()].reduce((n, arr) => n + arr.length, 0);
        const subtypes = [...subtypeMap.entries()].sort((a, b) => b[1].length - a[1].length);
        const barWidth = (total / maxCount) * 100;
        return (
          <div key={type} className="flex items-center gap-3 group">
            <button
              onClick={() => setDrill({ type, subtype: null })}
              className="flex items-center gap-1.5 w-24 flex-shrink-0 hover:opacity-70 transition-opacity"
            >
              <EventTypeIcon type={type} size={12} />
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 truncate">{TYPE_LABELS[type] ?? type}</span>
            </button>
            <div className="flex-1 flex items-center gap-1.5">
              <div className="flex h-6 rounded-full overflow-hidden" style={{ width: `${barWidth}%`, minWidth: "2rem" }}>
                {subtypes.map(([sub, evts]) => {
                  const pct = (evts.length / total) * 100;
                  const isHovered = hovered?.type === type && hovered?.subtype === sub;
                  return (
                    <button
                      key={sub}
                      title={`${sub.replace(/_/g, " ")} (${evts.length})`}
                      style={{ width: `${pct}%`, background: colorMap.get(sub), opacity: isHovered ? 1 : 0.65, transition: "opacity 0.15s" }}
                      className="h-full focus:outline-none"
                      onMouseEnter={() => setHovered({ type, subtype: sub })}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => setDrill({ type, subtype: sub })}
                    />
                  );
                })}
              </div>
              <span className="text-xs text-neutral-300 flex-shrink-0">{total}</span>
            </div>
          </div>
        );
      })}

      {hovered && (
        <div className="mt-4 text-xs text-neutral-500 flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: colorMap.get(hovered.subtype) }}
          />
          <span className="capitalize">{hovered.subtype.replace(/_/g, " ")}</span>
          <span className="text-neutral-300">·</span>
          <span>{TYPE_LABELS[hovered.type] ?? hovered.type}</span>
          <span className="text-neutral-300">·</span>
          <span>{byType.get(hovered.type)?.get(hovered.subtype)?.length} events</span>
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

const TABS = ["By type", "Artists", "Venues", "Over time"] as const;
type Tab = typeof TABS[number];

export default function Stats() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("By type");

  useEffect(() => {
    fetchEvents({ limit: 500 })
      .then(evts => setEvents(evts.filter(e => e.date <= new Date().toISOString().slice(0, 10))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-32 text-neutral-300 text-xs uppercase tracking-widest">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-100">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-400 hover:text-neutral-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "By type" && <ByTypeTab events={events} />}
      {tab === "Artists" && <ArtistsTab events={events} />}
      {tab === "Venues" && <VenuesTab events={events} />}
      {tab === "Over time" && <OverTimeTab events={events} />}
    </div>
  );
}
