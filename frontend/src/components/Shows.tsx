import { useState, useEffect, useRef } from "react";
import { fetchAllEvents } from "../lib/api";
import type { EventListItem } from "../types/events";
import EventTypeIcon from "./EventTypeIcon";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

function openEvent(id: string) {
  window.dispatchEvent(new CustomEvent("open-event", { detail: id }));
}

export default function Shows() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const letterRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    fetchAllEvents()
      .then(evts => setEvents(evts))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = events.filter(e =>
    !q ||
    e.title.toLowerCase().includes(q) ||
    (e.primary_entity_name?.toLowerCase().includes(q))
  );

  // Sort alphabetically by title
  const sorted = [...filtered].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
  );

  // Group by first letter
  const groups = new Map<string, EventListItem[]>();
  for (const e of sorted) {
    const first = e.title[0]?.toUpperCase() ?? "#";
    const key = /[A-Z]/.test(first) ? first : "#";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  const presentLetters = new Set(groups.keys());

  function scrollTo(letter: string) {
    letterRefs.current[letter]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loading) {
    return <div className="flex items-center justify-center h-32 text-neutral-300 text-xs uppercase tracking-widest">Loading…</div>;
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search shows…"
          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-900 placeholder-neutral-300 focus:outline-none focus:border-neutral-400 bg-white"
        />
      </div>

      {/* A–Z nav */}
      {!q && (
        <div className="flex flex-wrap gap-x-1 gap-y-0.5 mb-6">
          {ALPHABET.map(l => (
            <button
              key={l}
              onClick={() => scrollTo(l)}
              disabled={!presentLetters.has(l)}
              className={`w-6 h-6 text-[11px] font-medium rounded transition-colors ${
                presentLetters.has(l)
                  ? "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                  : "text-neutral-200 cursor-default"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Count */}
      <p className="text-[10px] uppercase tracking-widest text-neutral-300 mb-4">
        {sorted.length} {sorted.length === 1 ? "show" : "shows"}
      </p>

      {/* List */}
      <div className="space-y-6">
        {[...groups.entries()].map(([letter, items]) => (
          <section
            key={letter}
            ref={el => { letterRefs.current[letter] = el; }}
          >
            <div className="font-serif text-2xl text-neutral-200 mb-1 select-none">{letter}</div>
            <div className="divide-y divide-neutral-50">
              {items.map(e => (
                <button
                  key={e.id}
                  onClick={() => openEvent(e.id)}
                  className="w-full flex items-center gap-3 py-2.5 text-left group hover:bg-neutral-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <EventTypeIcon type={e.type} size={13} className="flex-shrink-0 text-neutral-300" />
                  <span className="flex-1 text-sm text-neutral-900 font-serif leading-snug group-hover:underline underline-offset-2 truncate">
                    {e.title}
                  </span>
                  {e.primary_entity_name && (
                    <span className="text-xs text-neutral-400 flex-shrink-0 truncate max-w-[30%]">
                      {e.primary_entity_name}
                    </span>
                  )}
                  <span className="text-xs text-neutral-300 flex-shrink-0 w-10 text-right">
                    {e.date.slice(0, 4)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
        {sorted.length === 0 && (
          <p className="text-sm text-neutral-400">No shows match your search.</p>
        )}
      </div>
    </div>
  );
}
