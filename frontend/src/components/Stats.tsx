import { useState, useEffect } from "react";
import { fetchEvents } from "../lib/api";
import type { EventListItem } from "../types/events";
import EventTypeIcon from "./EventTypeIcon";

const TYPE_LABELS: Record<string, string> = {
  comedy: "Comedy",
  theatre: "Theatre",
  exhibition: "Exhibition",
  music: "Music",
  circus: "Circus",
  cabaret: "Cabaret",
  ballet: "Ballet",
  classical: "Classical",
  opera: "Opera",
  talk: "Talk",
  dance: "Dance",
  other: "Other",
  spoken_word: "Spoken Word",
  screening: "Screening",
};

function StarSvg({ fill, size = 12 }: { fill: number; size?: number }) {
  const id = `clip-stats-${Math.random().toString(36).slice(2)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
      <defs>
        <clipPath id={id}>
          <rect x="0" y="0" width={14 * fill} height="14" />
        </clipPath>
      </defs>
      <path
        d="M7 1l1.545 3.09L12 4.635l-2.5 2.41.59 3.41L7 8.77l-3.09 1.685.59-3.41L2 4.635l3.455-.545L7 1z"
        stroke="currentColor" strokeWidth="1" strokeLinejoin="round"
        className="text-neutral-200"
      />
      {fill > 0 && (
        <path
          d="M7 1l1.545 3.09L12 4.635l-2.5 2.41.59 3.41L7 8.77l-3.09 1.685.59-3.41L2 4.635l3.455-.545L7 1z"
          fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"
          clipPath={`url(#${id})`}
          className="text-neutral-600"
        />
      )}
    </svg>
  );
}

function MiniStars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map((s) => (
        <StarSvg key={s} fill={Math.min(1, Math.max(0, rating - (s - 1)))} size={11} />
      ))}
    </span>
  );
}

function openEvent(id: string) {
  window.dispatchEvent(new CustomEvent("open-event", { detail: id }));
}

export default function Stats() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents({ limit: 500, status: "attended" })
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-neutral-300 text-xs uppercase tracking-widest">
        Loading…
      </div>
    );
  }

  // Group by type, sort by count desc
  const byType = new Map<string, EventListItem[]>();
  for (const e of events) {
    if (!byType.has(e.type)) byType.set(e.type, []);
    byType.get(e.type)!.push(e);
  }
  const types = [...byType.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="space-y-10">
      {/* Type breakdown */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-4">
          By type — all time
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {types.map(([type, evts]) => {
            const favourite = [...evts]
              .filter((e) => e.rating !== null)
              .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0] ?? null;

            return (
              <div
                key={type}
                className="border border-neutral-100 rounded-xl p-4 flex flex-col gap-3"
              >
                {/* Header */}
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <EventTypeIcon type={type} size={13} />
                  <span className="text-[10px] uppercase tracking-widest">
                    {TYPE_LABELS[type] ?? type}
                  </span>
                </div>

                {/* Count */}
                <div className="font-serif text-4xl text-neutral-900 leading-none">
                  {evts.length}
                </div>

                {/* Most visited person/ensemble */}
                {(() => {
                  const counts = new Map<string, { name: string; id: string; n: number }>();
                  for (const e of evts) {
                    if (e.primary_entity_name && e.primary_entity_id) {
                      const prev = counts.get(e.primary_entity_id);
                      counts.set(e.primary_entity_id, { name: e.primary_entity_name, id: e.primary_entity_id, n: (prev?.n ?? 0) + 1 });
                    }
                  }
                  const top = [...counts.values()].sort((a, b) => b.n - a.n)[0];
                  if (!top) return null;
                  return (
                    <div className="min-h-[2rem]">
                      <div className="text-[9px] uppercase tracking-widest text-neutral-300 mb-1">Most seen</div>
                      <div className="text-xs text-neutral-600 font-serif leading-snug">
                        {top.name}
                        {top.n > 1 && <span className="font-sans text-neutral-300 ml-1">×{top.n}</span>}
                      </div>
                    </div>
                  );
                })()}

                {/* Top rated */}
                <div className="min-h-[2.5rem]">
                  {(() => {
                    const favourite = [...evts]
                      .filter((e) => e.rating !== null)
                      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0] ?? null;
                    return favourite ? (
                      <button onClick={() => openEvent(favourite.id)} className="text-left w-full group">
                        <div className="text-[9px] uppercase tracking-widest text-neutral-300 mb-1">
                          Top rated
                        </div>
                        <div className="flex items-start gap-1.5">
                          <MiniStars rating={favourite.rating!} />
                        </div>
                        <div className="text-xs text-neutral-500 font-serif mt-1 leading-snug group-hover:text-neutral-900 group-hover:underline underline-offset-2 transition-colors line-clamp-2">
                          {favourite.title}
                        </div>
                      </button>
                    ) : (
                      <div className="text-[9px] uppercase tracking-widest text-neutral-200">
                        No rating yet
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
