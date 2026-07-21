"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchEvents, patchEventRating } from "@/lib/api";
import type { EventListItem } from "@/lib/types";
import EventTypeIcon from "./EventTypeIcon";

const TYPE_LABELS: Record<string, string> = {
  comedy: "Comedy", theatre: "Theatre", exhibition: "Exhibition",
  music: "Music", circus: "Circus", cabaret: "Cabaret",
  ballet: "Ballet", classical: "Classical", opera: "Opera",
  talk: "Talk", dance: "Dance", other: "Other",
  spoken_word: "Spoken Word", screening: "Screening",
};

const PASTEL_COLORS = [
  "#e8d5d5", "#d5e0e8", "#d5e8d8", "#e8e0d5", "#ddd5e8",
  "#d5e8e4", "#e8ddd5", "#d5d8e8", "#e8d5e2", "#dce8d5",
  "#e8e8d5", "#d5e8e8", "#e2d5e8", "#d5e4e8", "#e8d8d5",
];

const SUBTYPE_COLORS: string[] = [
  "#a3a3a3", "#d4b896", "#9db8b8", "#b8a9c9", "#b8c9a9",
  "#c9b8a9", "#a9b8c9", "#c9a9b8", "#b8b8a3", "#a9c9c9",
  "#c9c9a9", "#b8a3a3", "#a3b8a9",
];

function strHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const CONTEXT_ORDER = ["arena", "theatre", "studio", "intimate", "outdoor", "gallery"];
const CONTEXT_LABELS: Record<string, string> = {
  arena: "Arena (10,000+)", theatre: "Theatre (400–10,000)",
  studio: "Studio (100–400)", intimate: "Intimate (<100)",
  outdoor: "Outdoor", gallery: "Gallery / Exhibition",
};
const CONTEXT_DESCRIPTIONS: Record<string, string> = {
  arena: "10,000+ capacity — a 5★ here means it cut through the vastness.",
  theatre: "400–10,000 seats — a proper main stage. The benchmark for most live performances.",
  studio: "100–400 capacity — a studio or small hall. Rating reflects craft at close range.",
  intimate: "Under 100 people — a tiny room where everything lands directly.",
  outdoor: "Open air — weather, space, and crowd energy all factor in.",
  gallery: "Museum or exhibition — a different kind of encounter, not a live performance.",
};

const ALL_OVER_TIME_TYPES = [
  "ballet", "cabaret", "circus", "classical", "comedy", "dance",
  "exhibition", "music", "opera", "other", "screening", "spoken_word",
  "talk", "theatre",
];

function HalfStarPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value ?? 0;
  return (
    <div className="flex items-center" onMouseLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const full = display >= star;
        const half = display >= star - 0.5 && display < star;
        return (
          <div key={star} className="relative select-none" style={{ width: "1.1em", height: "1.1em", fontSize: "16px" }}>
            <span className="absolute inset-0 pointer-events-none" style={{ color: "#d1d5db" }}>★</span>
            {(half || full) && <span className="absolute inset-0 overflow-hidden pointer-events-none" style={{ color: "#d97706", width: full ? "100%" : "50%" }}>★</span>}
            <span className="absolute inset-y-0 left-0 cursor-pointer" style={{ width: "50%" }} onMouseEnter={() => setHovered(star - 0.5)} onClick={() => onChange(value === star - 0.5 ? null : star - 0.5)} />
            <span className="absolute inset-y-0 right-0 cursor-pointer" style={{ width: "50%" }} onMouseEnter={() => setHovered(star)} onClick={() => onChange(value === star ? null : star)} />
          </div>
        );
      })}
    </div>
  );
}

function ContextHeading({ label, description }: { label: string; description?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex items-center gap-1">
      <span className="text-[9px] uppercase tracking-widest text-neutral-400">{label}</span>
      {description && <button className="text-neutral-300 hover:text-neutral-500 transition-colors leading-none" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onClick={() => setOpen((v) => !v)} style={{ fontSize: 10 }}>?</button>}
      {open && description && <div className="absolute bottom-full left-0 mb-1.5 w-52 bg-neutral-900 text-white text-[11px] leading-relaxed rounded px-2.5 py-2 z-50 pointer-events-none">{description}</div>}
    </div>
  );
}

function TypeDrillDown({ type, evts, subtype, onBack, onEventClick, onEntityClick, editorMode, onRatingChange }: {
  type: string; evts: EventListItem[]; subtype?: string; onBack: () => void;
  onEventClick: (id: string) => void; onEntityClick: (id: string, kind: "person" | "ensemble" | null, name?: string) => void;
  editorMode: boolean; onRatingChange: (id: string, rating: number | null) => void;
}) {
  const [groupByContext, setGroupByContext] = useState(false);
  const [groupBySubtype, setGroupBySubtype] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const filtered = subtype ? evts.filter((e) => e.subtype === subtype) : evts;
  const label = subtype ? `${TYPE_LABELS[type] ?? type} — ${subtype.replace(/_/g, " ")}` : TYPE_LABELS[type] ?? type;
  const handleRate = useCallback(async (id: string, v: number | null) => {
    setSaving(id);
    try { await patchEventRating(id, v); onRatingChange(id, v); } finally { setSaving(null); }
  }, [onRatingChange]);

  function renderRow(e: EventListItem) {
    return (
      <div key={e.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-50 transition-colors group">
        <span className="text-[10px] text-neutral-300 w-10 flex-shrink-0">{e.date.slice(0, 4)}</span>
        <button onClick={() => onEventClick(e.id)} className="flex-1 font-serif text-sm text-neutral-900 truncate text-left group-hover:underline underline-offset-2">{e.title}</button>
        {editorMode ? (
          <div className={saving === e.id ? "opacity-40" : ""}><HalfStarPicker value={e.rating} onChange={(v) => handleRate(e.id, v)} /></div>
        ) : (
          e.rating ? <span className="text-[10px] text-neutral-400 flex-shrink-0">{e.rating}★</span> : <span className="text-[10px] text-neutral-200 flex-shrink-0 truncate max-w-[30%]">{e.venue_name}</span>
        )}
      </div>
    );
  }

  function renderGroup(groupEvts: EventListItem[], heading: string, description?: string) {
    const sorted = [...groupEvts].sort((a, b) => b.date.localeCompare(a.date));
    const rated = sorted.filter((e) => e.rating !== null).length;
    return (
      <div key={heading} className="mb-5">
        <div className="px-3 mb-1 flex items-center justify-between">
          <ContextHeading label={heading} description={description} />
          {editorMode && <span className="text-[9px] text-neutral-300">{rated}/{sorted.length}</span>}
        </div>
        {sorted.map(renderRow)}
      </div>
    );
  }

  let sections: Array<{ heading: string; evts: EventListItem[]; description?: string }> = [];
  if (groupByContext && groupBySubtype) {
    const map = new Map<string, EventListItem[]>();
    for (const e of filtered) { const k = `${e.subtype ?? "—"} · ${e.rating_context ?? "no context"}`; if (!map.has(k)) map.set(k, []); map.get(k)!.push(e); }
    sections = [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ heading: k, evts: v }));
  } else if (groupByContext) {
    const map = new Map<string, EventListItem[]>();
    for (const e of filtered) { const ctx = e.rating_context ?? "no context"; if (!map.has(ctx)) map.set(ctx, []); map.get(ctx)!.push(e); }
    sections = [...map.entries()].sort(([a], [b]) => (CONTEXT_ORDER.indexOf(a) === -1 ? 99 : CONTEXT_ORDER.indexOf(a)) - (CONTEXT_ORDER.indexOf(b) === -1 ? 99 : CONTEXT_ORDER.indexOf(b))).map(([k, v]) => ({ heading: CONTEXT_LABELS[k] ?? k, evts: v, description: CONTEXT_DESCRIPTIONS[k] }));
  } else if (groupBySubtype) {
    const map = new Map<string, EventListItem[]>();
    for (const e of filtered) { const sub = e.subtype ?? "—"; if (!map.has(sub)) map.set(sub, []); map.get(sub)!.push(e); }
    sections = [...map.entries()].sort(([a], [b]) => map.get(b)!.length - map.get(a)!.length).map(([k, v]) => ({ heading: k.replace(/_/g, " "), evts: v }));
  }

  const unGrouped = !groupByContext && !groupBySubtype;
  const ratedTotal = filtered.filter((e) => e.rating !== null).length;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 transition-colors mb-5">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Back
      </button>
      <div className="flex items-center gap-2 mb-4"><EventTypeIcon type={type} size={14} /><span className="font-serif text-xl text-neutral-900 capitalize">{label}</span><span className="text-sm text-neutral-300">{filtered.length}</span>{editorMode && <span className="text-xs text-neutral-300 ml-1">{ratedTotal} rated</span>}</div>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[9px] uppercase tracking-widest text-neutral-300">Group by</span>
        <label className="flex items-center gap-1 text-xs text-neutral-500 cursor-pointer"><input type="checkbox" className="rounded border-neutral-200" checked={groupByContext} onChange={(e) => setGroupByContext(e.target.checked)} />Context</label>
        {!subtype && <label className="flex items-center gap-1 text-xs text-neutral-500 cursor-pointer"><input type="checkbox" className="rounded border-neutral-200" checked={groupBySubtype} onChange={(e) => setGroupBySubtype(e.target.checked)} />Subtype</label>}
      </div>
      {unGrouped ? <div>{[...filtered].sort((a, b) => b.date.localeCompare(a.date)).map(renderRow)}</div> : sections.map((s) => renderGroup(s.evts, s.heading, s.description))}
    </div>
  );
}

function ByTypeTab({ events, onEventClick, onEntityClick, editorMode, onRatingChange }: {
  events: EventListItem[]; onEventClick: (id: string) => void;
  onEntityClick: (id: string, kind: "person" | "ensemble" | null) => void;
  editorMode: boolean; onRatingChange: (id: string, rating: number | null) => void;
}) {
  const [drill, setDrill] = useState<{ type: string; subtype?: string } | null>(null);
  const [hovered, setHovered] = useState<{ type: string; subtype: string; count: number } | null>(null);
  const byType = new Map<string, EventListItem[]>();
  for (const e of events) { if (!byType.has(e.type)) byType.set(e.type, []); byType.get(e.type)!.push(e); }
  const SECONDARY = new Set(["exhibition", "talk"]);
  const primaryTypes = [...byType.entries()].filter(([t]) => !SECONDARY.has(t)).sort((a, b) => b[1].length - a[1].length);
  const secondaryTypes = [...byType.entries()].filter(([t]) => SECONDARY.has(t)).sort((a, b) => b[1].length - a[1].length);
  if (drill) {
    return <TypeDrillDown type={drill.type} evts={byType.get(drill.type) ?? []} subtype={drill.subtype} onBack={() => setDrill(null)} onEventClick={onEventClick} onEntityClick={onEntityClick} editorMode={editorMode} onRatingChange={onRatingChange} />;
  }
  function renderCard([type, evts]: [string, EventListItem[]]) {
    const entityCounts = new Map<string, { name: string; id: string; kind: "person" | "ensemble" | null; n: number }>();
    for (const e of evts) { if (e.primary_entity_name && e.primary_entity_id) { const prev = entityCounts.get(e.primary_entity_id); entityCounts.set(e.primary_entity_id, { name: e.primary_entity_name, id: e.primary_entity_id, kind: e.primary_entity_kind, n: (prev?.n ?? 0) + 1 }); } }
    const top = [...entityCounts.values()].sort((a, b) => b.n - a.n).find((e) => e.n > 1) ?? null;
    const subtypeCounts = new Map<string, number>();
    for (const e of evts) { const s = e.subtype ?? "other"; subtypeCounts.set(s, (subtypeCounts.get(s) ?? 0) + 1); }
    const subtypes = [...subtypeCounts.entries()].sort((a, b) => b[1] - a[1]);
    const rated = evts.filter((e) => e.rating !== null);
    const avgRating = rated.length > 0 ? rated.reduce((s, e) => s + e.rating!, 0) / rated.length : null;
    const lastSeenEvt = evts.reduce((best, e) => e.date > best.date ? e : best, evts[0]);
    const lastSeenEntity = lastSeenEvt?.primary_entity_name ?? null;
    const lastSeenEntityId = lastSeenEvt?.primary_entity_id ?? null;
    const lastSeenEntityKind = lastSeenEvt?.primary_entity_kind ?? null;
    return (
      <div key={type} onClick={() => setDrill({ type })} className="border border-neutral-100 rounded-xl p-3 flex flex-col gap-2 cursor-pointer hover:border-neutral-300 hover:shadow-sm transition-all">
        <div className="flex items-center gap-1.5 text-neutral-400"><EventTypeIcon type={type} size={12} /><span className="hidden sm:inline text-[10px] uppercase tracking-widest">{TYPE_LABELS[type] ?? type}</span></div>
        <div className="flex items-end gap-2"><span className="font-serif text-3xl text-neutral-900 leading-none">{evts.length}</span>{avgRating !== null && <span className="text-[10px] text-neutral-400 mb-0.5">{avgRating.toFixed(1)}★</span>}</div>
        {subtypes.length > 0 && (
          <div className="relative">
            <div className="flex h-3 rounded-full overflow-hidden gap-px">
              {subtypes.map(([sub, count], i) => (
                <button key={sub} style={{ width: `${(count / evts.length) * 100}%`, background: PASTEL_COLORS[(strHash(type) + i) % PASTEL_COLORS.length], filter: hovered?.type === type && hovered?.subtype === sub ? "brightness(0.9)" : "none" }} className="h-full focus:outline-none transition-all"
                  onMouseEnter={(e) => { e.stopPropagation(); setHovered({ type, subtype: sub, count }); }}
                  onMouseLeave={() => setHovered(null)}
                  onClick={(e) => { e.stopPropagation(); setDrill({ type, subtype: sub }); }} />
              ))}
            </div>
            {hovered?.type === type && <div className="absolute top-full mt-1.5 right-0 bg-neutral-900 text-white text-[10px] rounded-md px-2 py-1 whitespace-nowrap pointer-events-none z-10 capitalize">{hovered.subtype.replace(/_/g, " ")} · {hovered.count}</div>}
          </div>
        )}
        <div className="flex gap-3 mt-auto">
          {top && (
            <div className="flex-1 min-w-0">
              <div className="text-[9px] uppercase tracking-widest text-neutral-300 mb-1">Most seen</div>
              <button onClick={(e) => { e.stopPropagation(); onEntityClick(top.id, top.kind); }} className="text-xs text-neutral-600 font-serif leading-snug text-left hover:text-neutral-900 hover:underline underline-offset-2 transition-colors active:opacity-60 truncate block w-full">{top.name}{top.n > 1 && <span className="font-sans text-neutral-300 ml-1">×{top.n}</span>}</button>
            </div>
          )}
          {lastSeenEntity && (
            <div className={top ? "text-right flex-shrink-0 max-w-[45%]" : ""}>
              <div className="text-[9px] uppercase tracking-widest text-neutral-300 mb-1">Last seen</div>
              <button onClick={(e) => { e.stopPropagation(); if (lastSeenEntityId) onEntityClick(lastSeenEntityId, lastSeenEntityKind); }} className="text-xs text-neutral-600 font-serif leading-snug text-right hover:text-neutral-900 hover:underline underline-offset-2 transition-colors active:opacity-60 truncate block w-full">{lastSeenEntity}</button>
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{primaryTypes.map(renderCard)}</div>
      {secondaryTypes.length > 0 && <><hr className="border-neutral-100" /><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{secondaryTypes.map(renderCard)}</div></>}
    </div>
  );
}

function ArtistsTab({ events, onEntityClick }: { events: EventListItem[]; onEntityClick: (id: string, kind: "person" | "ensemble" | null, name?: string) => void }) {
  const counts = new Map<string, { name: string; id: string; kind: "person" | "ensemble" | null; n: number; types: Set<string> }>();
  for (const e of events) {
    if (e.primary_entity_name && e.primary_entity_id) {
      const prev = counts.get(e.primary_entity_id);
      if (prev) { prev.n++; prev.types.add(e.type); }
      else counts.set(e.primary_entity_id, { name: e.primary_entity_name, id: e.primary_entity_id, kind: e.primary_entity_kind, n: 1, types: new Set([e.type]) });
    }
  }
  const ranked = [...counts.values()].filter((a) => a.n > 1).sort((a, b) => b.n - a.n);
  if (!ranked.length) return <p className="text-sm text-neutral-400">No repeat artists yet.</p>;
  return (
    <div className="space-y-1">
      {ranked.map((a, i) => (
        <button key={a.id} onClick={() => onEntityClick(a.id, a.kind, a.name)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left group">
          <span className="text-[10px] text-neutral-300 w-5 text-right flex-shrink-0">{i + 1}</span>
          <span className="flex-1 font-serif text-sm text-neutral-900 truncate group-hover:underline underline-offset-2">{a.name}</span>
          <span className="flex gap-1 flex-shrink-0">{[...a.types].map((t) => <EventTypeIcon key={t} type={t} size={12} />)}</span>
          <span className="text-xs text-neutral-400 flex-shrink-0 w-6 text-right">×{a.n}</span>
        </button>
      ))}
    </div>
  );
}

function VenuesTab({ events, onVenueClick }: { events: EventListItem[]; onVenueClick: (id: string, name?: string) => void }) {
  const counts = new Map<string, { name: string; id: string; n: number }>();
  for (const e of events) {
    if (e.venue_name && e.venue_id) {
      const prev = counts.get(e.venue_id);
      if (prev) { prev.n++; }
      else counts.set(e.venue_id, { name: e.venue_name, id: e.venue_id, n: 1 });
    }
  }
  const ranked = [...counts.values()].filter((v) => v.n > 1).sort((a, b) => b.n - a.n);
  if (!ranked.length) return <p className="text-sm text-neutral-400">No repeat venues yet.</p>;
  return (
    <div className="space-y-1">
      {ranked.map((v, i) => (
        <button key={v.id} onClick={() => onVenueClick(v.id, v.name)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left group">
          <span className="text-[10px] text-neutral-300 w-5 text-right flex-shrink-0">{i + 1}</span>
          <span className="flex-1 text-sm text-neutral-900 truncate group-hover:underline underline-offset-2">{v.name}</span>
          <span className="text-xs text-neutral-400 flex-shrink-0">×{v.n}</span>
        </button>
      ))}
    </div>
  );
}

function OverTimeTab({ events, onEventClick }: { events: EventListItem[]; onEventClick: (id: string) => void }) {
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set(["exhibition", "talk"]));
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingHidden, setPendingHidden] = useState<Set<string>>(new Set(["exhibition", "talk"]));
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const presentTypes = new Set(events.map((e) => e.type));
  const filtered = events.filter((e) => !hiddenTypes.has(e.type));
  const byYear = new Map<string, { count: number; spend: number }>();
  for (const e of filtered) {
    const y = e.date.slice(0, 4);
    const prev = byYear.get(y) ?? { count: 0, spend: 0 };
    const price = e.price_paid ? parseFloat(e.price_paid) * (e.currency === "GBP" ? 1.19 : 1) : 0;
    byYear.set(y, { count: prev.count + 1, spend: prev.spend + price });
  }
  const years = [...byYear.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const maxCount = Math.max(...years.map(([, v]) => v.count));
  function openFilter() { setPendingHidden(new Set(hiddenTypes)); setFilterOpen(true); }
  function applyFilter() { setHiddenTypes(new Set(pendingHidden)); setFilterOpen(false); }
  function togglePending(type: string) { setPendingHidden((prev) => { const next = new Set(prev); next.has(type) ? next.delete(type) : next.add(type); return next; }); }
  const hiddenCount = hiddenTypes.size;
  const yearEvents = selectedYear ? [...filtered].filter((e) => e.date.startsWith(selectedYear)).sort((a, b) => b.date.localeCompare(a.date)) : [];

  return (
    <>
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] uppercase tracking-widest text-neutral-400">Events per year</div>
            <button onClick={openFilter} className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest transition-colors ${hiddenCount > 0 ? "text-neutral-400" : "text-neutral-300"}`}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 3h10M3 6h6M5 9h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
              {hiddenCount > 0 ? `${ALL_OVER_TIME_TYPES.filter((t) => presentTypes.has(t)).length - hiddenCount} types` : "All types"}
            </button>
          </div>
          <div className="space-y-2">
            {years.map(([year, { count, spend }], i) => (
              <div key={year}>
                {i > 0 && years[i - 1][0] === "2025" && parseInt(year) < 2025 && (
                  <div className="flex items-center gap-3 py-1"><span className="text-[10px] uppercase tracking-widest text-orange-300 w-full">memory gaps below</span></div>
                )}
                <button className={`flex items-center gap-3 w-full rounded-lg px-1 py-0.5 transition-colors ${selectedYear === year ? "bg-neutral-50" : "hover:bg-neutral-50"}`}
                  onClick={() => setSelectedYear(selectedYear === year ? null : year)}>
                  <span className={`text-xs w-10 flex-shrink-0 text-left ${selectedYear === year ? "text-neutral-700 font-medium" : parseInt(year) < 2025 ? "text-neutral-300" : "text-neutral-400"}`}>{year}</span>
                  <div className="flex-1 h-6 bg-neutral-50 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${selectedYear === year ? "bg-neutral-400" : parseInt(year) < 2025 ? "bg-neutral-100" : "bg-neutral-200"}`} style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                  <span className={`text-xs w-6 text-right flex-shrink-0 ${selectedYear === year ? "text-neutral-700 font-medium" : parseInt(year) < 2025 ? "text-neutral-300" : "text-neutral-500"}`}>{count}</span>
                  <span className="text-xs text-neutral-300 w-14 text-right flex-shrink-0">{spend > 0 ? `€${Math.round(spend)}` : ""}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
        {selectedYear && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-3">{selectedYear}</div>
            <div className="space-y-0.5">
              {yearEvents.map((e) => (
                <button key={e.id} onClick={() => onEventClick(e.id)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-50 transition-colors text-left group">
                  <span className="text-[10px] text-neutral-300 w-10 flex-shrink-0">{e.date.slice(5, 7)}/{e.date.slice(8, 10)}</span>
                  <EventTypeIcon type={e.type} size={11} />
                  <span className="flex-1 font-serif text-sm text-neutral-900 truncate group-hover:underline underline-offset-2">{e.title}</span>
                  {e.rating && <span className="text-[10px] text-neutral-300 flex-shrink-0">{e.rating}★</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {filterOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setFilterOpen(false)}>
          <div className="bg-white rounded-t-2xl border-t border-neutral-200 px-5 pt-5 pb-8 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h3 className="font-serif text-lg text-neutral-900">Filter by type</h3><button onClick={() => setFilterOpen(false)} className="text-neutral-400 hover:text-neutral-700 text-sm">✕</button></div>
            <div className="space-y-1 mb-6">
              {ALL_OVER_TIME_TYPES.filter((t) => presentTypes.has(t)).map((type) => {
                const hidden = pendingHidden.has(type);
                return (
                  <button key={type} onClick={() => togglePending(type)} className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-neutral-50 transition-colors">
                    <div className={`w-4 h-4 rounded border flex-shrink-0 transition-colors ${hidden ? "border-neutral-200 bg-white" : "border-neutral-900 bg-neutral-900"}`}>{!hidden && <svg viewBox="0 0 12 12" className="w-full h-full text-white" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}</div>
                    <div className="w-6 h-6 border border-neutral-200 rounded-full flex items-center justify-center text-neutral-400 flex-shrink-0"><EventTypeIcon type={type} size={12} /></div>
                    <span className={`text-sm capitalize flex-1 text-left transition-colors ${hidden ? "text-neutral-300" : "text-neutral-700"}`}>{type.replace(/_/g, " ")}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPendingHidden(new Set())} className="flex-1 border border-neutral-200 text-neutral-600 text-sm rounded-xl py-3 hover:border-neutral-400 transition-colors">Show all</button>
              <button onClick={applyFilter} className="flex-1 bg-neutral-900 text-white text-sm rounded-xl py-3 hover:bg-neutral-700 transition-colors">Apply</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


const TABS = ["By type", "Artists", "Venues", "Over time"] as const;
type Tab = typeof TABS[number];

export default function Stats({ onEventClick, onEntityClick, onVenueClick }: {
  onEventClick: (id: string) => void;
  onEntityClick: (id: string, kind: "person" | "ensemble" | null, name?: string) => void;
  onVenueClick: (id: string, name?: string) => void;
}) {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("By type");
  const today = new Date().toISOString().slice(0, 10);
  useEffect(() => {
    fetchEvents({ limit: 500 }).then((evts) => setEvents(evts.filter((e) => e.date <= today))).catch(() => {}).finally(() => setLoading(false));
  }, []);
  const handleRatingChange = useCallback((id: string, rating: number | null) => { setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, rating } : e))); }, []);
  if (loading) return <div className="flex items-center justify-center h-32 text-neutral-300 text-xs uppercase tracking-widest">Loading…</div>;
  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-neutral-100">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px ${tab === t ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-400 hover:text-neutral-600"}`}>{t}</button>)}
      </div>
      {tab === "By type" && <ByTypeTab events={events} onEventClick={onEventClick} onEntityClick={onEntityClick} editorMode={true} onRatingChange={handleRatingChange} />}
      {tab === "Artists" && <ArtistsTab events={events} onEntityClick={onEntityClick} />}
      {tab === "Venues" && <VenuesTab events={events} onVenueClick={onVenueClick} />}
      {tab === "Over time" && <OverTimeTab events={events} onEventClick={onEventClick} />}
    </div>
  );
}
