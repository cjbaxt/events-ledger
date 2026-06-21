import { useState, useEffect } from "react";
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

function ByTypeTab({ events }: { events: EventListItem[] }) {
  const byType = new Map<string, EventListItem[]>();
  for (const e of events) {
    if (!byType.has(e.type)) byType.set(e.type, []);
    byType.get(e.type)!.push(e);
  }
  const types = [...byType.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {types.map(([type, evts]) => {
        const counts = new Map<string, { name: string; id: string; kind: "person" | "ensemble" | null; n: number }>();
        for (const e of evts) {
          if (e.primary_entity_name && e.primary_entity_id) {
            const prev = counts.get(e.primary_entity_id);
            counts.set(e.primary_entity_id, { name: e.primary_entity_name, id: e.primary_entity_id, kind: e.primary_entity_kind, n: (prev?.n ?? 0) + 1 });
          }
        }
        const top = [...counts.values()].sort((a, b) => b.n - a.n)[0];
        const favourite = [...evts].filter(e => e.rating !== null).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0] ?? null;

        return (
          <div key={type} className="border border-neutral-100 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <EventTypeIcon type={type} size={13} />
              <span className="text-[10px] uppercase tracking-widest">{TYPE_LABELS[type] ?? type}</span>
            </div>
            <div className="font-serif text-4xl text-neutral-900 leading-none">{evts.length}</div>

            {top && (
              <div className="min-h-[2rem]">
                <div className="text-[9px] uppercase tracking-widest text-neutral-300 mb-1">Most seen</div>
                <button
                  onClick={() => openEntity(top.id, top.kind)}
                  className="text-xs text-neutral-600 font-serif leading-snug text-left hover:text-neutral-900 hover:underline underline-offset-2 transition-colors active:opacity-60"
                >
                  {top.name}
                  {top.n > 1 && <span className="font-sans text-neutral-300 ml-1">×{top.n}</span>}
                </button>
              </div>
            )}

            <div className="min-h-[2.5rem]">
              {favourite ? (
                <button onClick={() => openEvent(favourite.id)} className="text-left w-full group">
                  <div className="text-[9px] uppercase tracking-widest text-neutral-300 mb-1">Top rated</div>
                  <MiniStars rating={favourite.rating!} />
                  <div className="text-xs text-neutral-500 font-serif mt-1 leading-snug group-hover:text-neutral-900 group-hover:underline underline-offset-2 transition-colors line-clamp-2">
                    {favourite.title}
                  </div>
                </button>
              ) : (
                <div className="text-[9px] uppercase tracking-widest text-neutral-200">No rating yet</div>
              )}
            </div>
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
  const years = [...byYear.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const maxCount = Math.max(...years.map(([, v]) => v.count));

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-4">Events per year</div>
        <div className="space-y-2">
          {years.map(([year, { count, spend }]) => (
            <div key={year} className="flex items-center gap-3">
              <span className="text-xs text-neutral-400 w-10 flex-shrink-0">{year}</span>
              <div className="flex-1 h-6 bg-neutral-50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-neutral-200 rounded-full transition-all"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-xs text-neutral-500 w-6 text-right flex-shrink-0">{count}</span>
              {spend > 0 && (
                <span className="text-xs text-neutral-300 w-14 text-right flex-shrink-0">€{Math.round(spend)}</span>
              )}
            </div>
          ))}
        </div>
      </div>
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
