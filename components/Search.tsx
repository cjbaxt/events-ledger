"use client";
import { useState, useEffect, useRef } from "react";
import { fetchEvents } from "@/lib/api";
import type { EventListItem } from "@/lib/types";
import EventTypeIcon from "./EventTypeIcon";

interface Person { id: string; name: string; }
interface Ensemble { id: string; name: string; type?: string | null; }
interface Venue { id: string; name: string; city?: string | null; parent_id?: string | null; parent_name?: string | null; }
interface Festival { id: string; name: string; edition?: string | null; }

type ActiveTab = "events" | "people" | "ensembles" | "venues" | "festivals";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

function alphaKey(s: string) { const first = s[0]?.toUpperCase() ?? "#"; return /[A-Z]/.test(first) ? first : "#"; }

function groupAlpha<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) { const k = alphaKey(key(item)); if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(item); }
  return groups;
}

function AlphaNav({ presentLetters, onScroll }: { presentLetters: Set<string>; onScroll: (l: string) => void }) {
  return (
    <div className="flex flex-wrap gap-x-1 gap-y-0.5 mb-5">
      {ALPHABET.map((l) => (
        <button key={l} onClick={() => onScroll(l)} disabled={!presentLetters.has(l)} className={`w-6 h-6 text-[11px] font-medium rounded transition-colors ${presentLetters.has(l) ? "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900" : "text-neutral-200 cursor-default"}`}>{l}</button>
      ))}
    </div>
  );
}

function Spinner() { return <div className="flex items-center justify-center h-32 text-neutral-300 text-xs uppercase tracking-widest">Loading…</div>; }
function Empty() { return <p className="text-sm text-neutral-400">Nothing matches your search.</p>; }

function EventsTab({ query, onEventClick }: { query: string; onEventClick: (id: string) => void }) {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const letterRefs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => { fetchEvents({ limit: 2000 }).then(setEvents).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading) return <Spinner />;
  const q = query.trim().toLowerCase();
  const filtered = events.filter((e) => !q || e.title.toLowerCase().includes(q) || e.primary_entity_name?.toLowerCase().includes(q)).sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  const groups = groupAlpha(filtered, (e) => e.title);
  const presentLetters = new Set(groups.keys());
  return (
    <div>
      {!q && <AlphaNav presentLetters={presentLetters} onScroll={(l) => letterRefs.current[l]?.scrollIntoView({ behavior: "smooth", block: "start" })} />}
      <p className="text-[10px] uppercase tracking-widest text-neutral-300 mb-4">{filtered.length} {filtered.length === 1 ? "show" : "shows"}</p>
      <div className="space-y-6">
        {[...groups.entries()].map(([letter, items]) => (
          <section key={letter} ref={(el) => { letterRefs.current[letter] = el; }}>
            <div className="font-serif text-2xl text-neutral-200 mb-1 select-none">{letter}</div>
            <div className="divide-y divide-neutral-50">
              {items.map((e) => (
                <button key={e.id} onClick={() => onEventClick(e.id)} className="w-full flex items-center gap-3 py-2.5 text-left group hover:bg-neutral-50 -mx-2 px-2 rounded-lg transition-colors">
                  <span className="flex-shrink-0 text-neutral-300"><EventTypeIcon type={e.type} size={13} /></span>
                  <span className="flex-1 text-sm text-neutral-900 font-serif leading-snug group-hover:underline underline-offset-2 truncate">{e.title}</span>
                  {e.primary_entity_name && <span className="text-xs text-neutral-400 flex-shrink-0 truncate max-w-[30%]">{e.primary_entity_name}</span>}
                  <span className="text-xs text-neutral-300 flex-shrink-0 w-10 text-right">{e.date.slice(0, 4)}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
        {filtered.length === 0 && <Empty />}
      </div>
    </div>
  );
}

function EntityTab<T extends { id: string; name: string }>({
  query, endpoint, singularLabel, pluralLabel, renderRow,
}: {
  query: string; endpoint: string; singularLabel: string; pluralLabel: string;
  renderRow: (item: T, onClick: (id: string) => void) => React.ReactNode;
}) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const letterRefs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => {
    fetch(`/api/${endpoint}?limit=2000`).then((r) => r.json()).then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, [endpoint]);
  if (loading) return <Spinner />;
  const q = query.trim().toLowerCase();
  const filtered = items.filter((p) => !q || p.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const groups = groupAlpha(filtered, (p) => p.name);
  const presentLetters = new Set(groups.keys());
  return (
    <div>
      {!q && <AlphaNav presentLetters={presentLetters} onScroll={(l) => letterRefs.current[l]?.scrollIntoView({ behavior: "smooth", block: "start" })} />}
      <p className="text-[10px] uppercase tracking-widest text-neutral-300 mb-4">{filtered.length} {filtered.length === 1 ? singularLabel : pluralLabel}</p>
      <div className="space-y-6">
        {[...groups.entries()].map(([letter, groupItems]) => (
          <section key={letter} ref={(el) => { letterRefs.current[letter] = el; }}>
            <div className="font-serif text-2xl text-neutral-200 mb-1 select-none">{letter}</div>
            <div className="divide-y divide-neutral-50">{groupItems.map((item) => renderRow(item, () => {}))}</div>
          </section>
        ))}
        {filtered.length === 0 && <Empty />}
      </div>
    </div>
  );
}

function VenuesTab({ query, onVenueClick }: { query: string; onVenueClick: (id: string) => void }) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const letterRefs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => { fetch("/api/venues?limit=2000").then((r) => r.json()).then(setVenues).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading) return <Spinner />;
  const q = query.trim().toLowerCase();
  const filtered = venues.filter((v) => !q || v.name.toLowerCase().includes(q) || v.city?.toLowerCase().includes(q) || v.parent_name?.toLowerCase().includes(q)).sort((a, b) => {
    const aRoot = a.parent_name ?? a.name;
    const bRoot = b.parent_name ?? b.name;
    const rootCmp = aRoot.localeCompare(bRoot, undefined, { sensitivity: "base" });
    return rootCmp !== 0 ? rootCmp : a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
  const groups = groupAlpha(filtered, (v) => v.parent_name ?? v.name);
  const presentLetters = new Set(groups.keys());
  return (
    <div>
      {!q && <AlphaNav presentLetters={presentLetters} onScroll={(l) => letterRefs.current[l]?.scrollIntoView({ behavior: "smooth", block: "start" })} />}
      <p className="text-[10px] uppercase tracking-widest text-neutral-300 mb-4">{filtered.length} {filtered.length === 1 ? "venue" : "venues"}</p>
      <div className="space-y-6">
        {[...groups.entries()].map(([letter, items]) => (
          <section key={letter} ref={(el) => { letterRefs.current[letter] = el; }}>
            <div className="font-serif text-2xl text-neutral-200 mb-1 select-none">{letter}</div>
            <div className="divide-y divide-neutral-50">
              {items.map((v) => (
                <button key={v.id} onClick={() => onVenueClick(v.id)} className="w-full flex items-center gap-3 py-2.5 text-left group hover:bg-neutral-50 -mx-2 px-2 rounded-lg transition-colors">
                  <span className="flex-1 min-w-0">
                    {v.parent_name && <span className="block text-[10px] text-neutral-400 truncate">{v.parent_name}</span>}
                    <span className="text-sm text-neutral-900 font-serif leading-snug group-hover:underline underline-offset-2">{v.name}</span>
                  </span>
                  {v.city && <span className="text-xs text-neutral-400 flex-shrink-0">{v.city}</span>}
                </button>
              ))}
            </div>
          </section>
        ))}
        {filtered.length === 0 && <Empty />}
      </div>
    </div>
  );
}

const TABS: { id: ActiveTab; label: string }[] = [
  { id: "events", label: "Events" },
  { id: "people", label: "People" },
  { id: "ensembles", label: "Ensembles" },
  { id: "venues", label: "Venues" },
  { id: "festivals", label: "Festivals" },
];

export default function Search({ onEventClick, onEntityClick, onVenueClick, onFestivalClick }: {
  onEventClick: (id: string) => void;
  onEntityClick: (id: string, kind: "person" | "ensemble") => void;
  onVenueClick: (id: string) => void;
  onFestivalClick: (id: string) => void;
}) {
  const [tab, setTab] = useState<ActiveTab>("events");
  const [query, setQuery] = useState("");

  return (
    <div>
      <div className="mb-4">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${tab}…`} className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-900 placeholder-neutral-300 focus:outline-none focus:border-neutral-400 bg-white" />
      </div>
      <div className="flex gap-1 border-b border-neutral-100 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setQuery(""); }} className={`px-3 py-2 text-xs uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 -mb-px flex-shrink-0 ${tab === t.id ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-400 hover:text-neutral-600"}`}>{t.label}</button>
        ))}
      </div>
      {tab === "events" && <EventsTab query={query} onEventClick={onEventClick} />}
      {tab === "people" && (
        <EntityTab<Person> query={query} endpoint="persons" singularLabel="person" pluralLabel="people"
          renderRow={(p) => (
            <button key={p.id} onClick={() => onEntityClick(p.id, "person")} className="w-full flex items-center gap-3 py-2.5 text-left group hover:bg-neutral-50 -mx-2 px-2 rounded-lg transition-colors">
              <span className="flex-1 text-sm text-neutral-900 font-serif leading-snug group-hover:underline underline-offset-2 truncate">{p.name}</span>
            </button>
          )}
        />
      )}
      {tab === "ensembles" && (
        <EntityTab<Ensemble> query={query} endpoint="ensembles" singularLabel="ensemble" pluralLabel="ensembles"
          renderRow={(e) => (
            <button key={e.id} onClick={() => onEntityClick(e.id, "ensemble")} className="w-full flex items-center gap-3 py-2.5 text-left group hover:bg-neutral-50 -mx-2 px-2 rounded-lg transition-colors">
              <span className="flex-1 text-sm text-neutral-900 font-serif leading-snug group-hover:underline underline-offset-2 truncate">{e.name}</span>
              {e.type && <span className="text-xs text-neutral-400 flex-shrink-0">{e.type}</span>}
            </button>
          )}
        />
      )}
      {tab === "venues" && <VenuesTab query={query} onVenueClick={onVenueClick} />}
      {tab === "festivals" && (
        <EntityTab<Festival> query={query} endpoint="festivals" singularLabel="festival" pluralLabel="festivals"
          renderRow={(f) => (
            <button key={f.id} onClick={() => onFestivalClick(f.id)} className="w-full flex items-center gap-3 py-2.5 text-left group hover:bg-neutral-50 -mx-2 px-2 rounded-lg transition-colors">
              <span className="flex-1 text-sm text-neutral-900 font-serif leading-snug group-hover:underline underline-offset-2 truncate">{f.name}</span>
              {f.edition && <span className="text-xs text-neutral-400 flex-shrink-0">{f.edition}</span>}
            </button>
          )}
        />
      )}
    </div>
  );
}
