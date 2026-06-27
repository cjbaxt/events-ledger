import { useState, useEffect, useRef } from "react";
import { fetchAllEvents, DATA, STATIC } from "../lib/api";
import type { EventListItem } from "../types/events";
import EventTypeIcon from "./EventTypeIcon";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Person { id: string; name: string; }
interface Ensemble { id: string; name: string; type?: string | null; }
interface Venue { id: string; name: string; city?: string | null; country?: string | null; parent_id?: string | null; }
interface Festival { id: string; name: string; edition?: string | null; }

type ActiveTab = "events" | "people" | "ensembles" | "venues" | "festivals";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

function alphaKey(s: string) {
  const first = s[0]?.toUpperCase() ?? "#";
  return /[A-Z]/.test(first) ? first : "#";
}

function groupAlpha<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = alphaKey(key(item));
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(item);
  }
  return groups;
}

// ── Sub-tabs ──────────────────────────────────────────────────────────────────

function AlphaNav({ presentLetters, onScroll }: { presentLetters: Set<string>; onScroll: (l: string) => void }) {
  return (
    <div className="flex flex-wrap gap-x-1 gap-y-0.5 mb-5">
      {ALPHABET.map(l => (
        <button
          key={l}
          onClick={() => onScroll(l)}
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
  );
}

function EventsTab({ query }: { query: string }) {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const letterRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    fetchAllEvents()
      .then(evts => setEvents(evts))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const q = query.trim().toLowerCase();
  const filtered = events
    .filter(e => !q || e.title.toLowerCase().includes(q) || e.primary_entity_name?.toLowerCase().includes(q))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));

  const groups = groupAlpha(filtered, e => e.title);
  const presentLetters = new Set(groups.keys());

  return (
    <div>
      {!q && (
        <AlphaNav
          presentLetters={presentLetters}
          onScroll={l => letterRefs.current[l]?.scrollIntoView({ behavior: "smooth", block: "start" })}
        />
      )}
      <p className="text-[10px] uppercase tracking-widest text-neutral-300 mb-4">
        {filtered.length} {filtered.length === 1 ? "show" : "shows"}
      </p>
      <div className="space-y-6">
        {[...groups.entries()].map(([letter, items]) => (
          <section key={letter} ref={el => { letterRefs.current[letter] = el; }}>
            <div className="font-serif text-2xl text-neutral-200 mb-1 select-none">{letter}</div>
            <div className="divide-y divide-neutral-50">
              {items.map(e => (
                <button
                  key={e.id}
                  onClick={() => window.dispatchEvent(new CustomEvent("open-event", { detail: e.id }))}
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
        {filtered.length === 0 && <Empty />}
      </div>
    </div>
  );
}

function PeopleTab({ query }: { query: string }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const letterRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    fetch(STATIC ? `${DATA}/data/persons.json` : "/api/persons?limit=2000")
      .then(r => r.json()).then(setPeople).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const q = query.trim().toLowerCase();
  const filtered = people
    .filter(p => !q || p.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  const groups = groupAlpha(filtered, p => p.name);
  const presentLetters = new Set(groups.keys());

  return (
    <div>
      {!q && (
        <AlphaNav
          presentLetters={presentLetters}
          onScroll={l => letterRefs.current[l]?.scrollIntoView({ behavior: "smooth", block: "start" })}
        />
      )}
      <p className="text-[10px] uppercase tracking-widest text-neutral-300 mb-4">
        {filtered.length} {filtered.length === 1 ? "person" : "people"}
      </p>
      <div className="space-y-6">
        {[...groups.entries()].map(([letter, items]) => (
          <section key={letter} ref={el => { letterRefs.current[letter] = el; }}>
            <div className="font-serif text-2xl text-neutral-200 mb-1 select-none">{letter}</div>
            <div className="divide-y divide-neutral-50">
              {items.map(p => (
                <button
                  key={p.id}
                  onClick={() => window.dispatchEvent(new CustomEvent("open-person", { detail: p.id }))}
                  className="w-full flex items-center gap-3 py-2.5 text-left group hover:bg-neutral-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <span className="flex-1 text-sm text-neutral-900 font-serif leading-snug group-hover:underline underline-offset-2 truncate">
                    {p.name}
                  </span>
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

function EnsemblesTab({ query }: { query: string }) {
  const [ensembles, setEnsembles] = useState<Ensemble[]>([]);
  const [loading, setLoading] = useState(true);
  const letterRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    fetch(STATIC ? `${DATA}/data/ensembles.json` : "/api/ensembles?limit=2000")
      .then(r => r.json()).then(setEnsembles).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const q = query.trim().toLowerCase();
  const filtered = ensembles
    .filter(e => !q || e.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  const groups = groupAlpha(filtered, e => e.name);
  const presentLetters = new Set(groups.keys());

  return (
    <div>
      {!q && (
        <AlphaNav
          presentLetters={presentLetters}
          onScroll={l => letterRefs.current[l]?.scrollIntoView({ behavior: "smooth", block: "start" })}
        />
      )}
      <p className="text-[10px] uppercase tracking-widest text-neutral-300 mb-4">
        {filtered.length} {filtered.length === 1 ? "ensemble" : "ensembles"}
      </p>
      <div className="space-y-6">
        {[...groups.entries()].map(([letter, items]) => (
          <section key={letter} ref={el => { letterRefs.current[letter] = el; }}>
            <div className="font-serif text-2xl text-neutral-200 mb-1 select-none">{letter}</div>
            <div className="divide-y divide-neutral-50">
              {items.map(e => (
                <button
                  key={e.id}
                  onClick={() => window.dispatchEvent(new CustomEvent("open-ensemble", { detail: e.id }))}
                  className="w-full flex items-center gap-3 py-2.5 text-left group hover:bg-neutral-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <span className="flex-1 text-sm text-neutral-900 font-serif leading-snug group-hover:underline underline-offset-2 truncate">
                    {e.name}
                  </span>
                  {e.type && (
                    <span className="text-xs text-neutral-400 flex-shrink-0">{e.type}</span>
                  )}
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

function VenuesTab({ query }: { query: string }) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const letterRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    fetch(STATIC ? `${DATA}/data/venues.json` : "/api/venues?limit=2000")
      .then(r => r.json()).then(setVenues).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const venueById = Object.fromEntries(venues.map(v => [v.id, v]));

  function venuePath(v: Venue): string[] {
    const parts: string[] = [];
    let cur: Venue | undefined = v;
    while (cur?.parent_id) {
      const p = venueById[cur.parent_id];
      if (!p) break;
      parts.unshift(p.name);
      cur = p;
    }
    return parts;
  }

  const q = query.trim().toLowerCase();
  const filtered = venues
    .filter(v => !q || v.name.toLowerCase().includes(q) || v.city?.toLowerCase().includes(q) || venuePath(v).some(p => p.toLowerCase().includes(q)))
    .sort((a, b) => {
      const aRoot = venuePath(a)[0] ?? a.name;
      const bRoot = venuePath(b)[0] ?? b.name;
      const rootCmp = aRoot.localeCompare(bRoot, undefined, { sensitivity: "base" });
      if (rootCmp !== 0) return rootCmp;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });

  const groups = groupAlpha(filtered, v => (venuePath(v)[0] ?? v.name));
  const presentLetters = new Set(groups.keys());

  return (
    <div>
      {!q && (
        <AlphaNav
          presentLetters={presentLetters}
          onScroll={l => letterRefs.current[l]?.scrollIntoView({ behavior: "smooth", block: "start" })}
        />
      )}
      <p className="text-[10px] uppercase tracking-widest text-neutral-300 mb-4">
        {filtered.length} {filtered.length === 1 ? "venue" : "venues"}
      </p>
      <div className="space-y-6">
        {[...groups.entries()].map(([letter, items]) => (
          <section key={letter} ref={el => { letterRefs.current[letter] = el; }}>
            <div className="font-serif text-2xl text-neutral-200 mb-1 select-none">{letter}</div>
            <div className="divide-y divide-neutral-50">
              {items.map(v => {
                const parents = venuePath(v);
                return (
                  <button
                    key={v.id}
                    onClick={() => window.dispatchEvent(new CustomEvent("open-venue", { detail: v.id }))}
                    className="w-full flex items-center gap-3 py-2.5 text-left group hover:bg-neutral-50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <span className="flex-1 min-w-0">
                      {parents.length > 0 && (
                        <span className="block text-[10px] text-neutral-400 truncate">
                          {parents.join(" › ")}
                        </span>
                      )}
                      <span className="text-sm text-neutral-900 font-serif leading-snug group-hover:underline underline-offset-2">
                        {v.name}
                      </span>
                    </span>
                    {v.city && (
                      <span className="text-xs text-neutral-400 flex-shrink-0">{v.city}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        {filtered.length === 0 && <Empty />}
      </div>
    </div>
  );
}

function FestivalsTab({ query }: { query: string }) {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const letterRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    fetch(STATIC ? `${DATA}/data/festivals.json` : "/api/festivals?limit=2000")
      .then(r => r.json()).then(setFestivals).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const q = query.trim().toLowerCase();
  const filtered = festivals
    .filter(f => !q || f.name.toLowerCase().includes(q) || f.edition?.toLowerCase().includes(q))
    .sort((a, b) => {
      const nc = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      if (nc !== 0) return nc;
      return (a.edition ?? "").localeCompare(b.edition ?? "");
    });

  const groups = groupAlpha(filtered, f => f.name);
  const presentLetters = new Set(groups.keys());

  return (
    <div>
      {!q && (
        <AlphaNav
          presentLetters={presentLetters}
          onScroll={l => letterRefs.current[l]?.scrollIntoView({ behavior: "smooth", block: "start" })}
        />
      )}
      <p className="text-[10px] uppercase tracking-widest text-neutral-300 mb-4">
        {filtered.length} {filtered.length === 1 ? "festival" : "festivals"}
      </p>
      <div className="space-y-6">
        {[...groups.entries()].map(([letter, items]) => (
          <section key={letter} ref={el => { letterRefs.current[letter] = el; }}>
            <div className="font-serif text-2xl text-neutral-200 mb-1 select-none">{letter}</div>
            <div className="divide-y divide-neutral-50">
              {items.map(f => (
                <button
                  key={f.id}
                  onClick={() => window.dispatchEvent(new CustomEvent("open-festival", { detail: f.id }))}
                  className="w-full flex items-center gap-3 py-2.5 text-left group hover:bg-neutral-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <span className="flex-1 text-sm text-neutral-900 font-serif leading-snug group-hover:underline underline-offset-2 truncate">
                    {f.name}
                  </span>
                  {f.edition && (
                    <span className="text-xs text-neutral-400 flex-shrink-0">{f.edition}</span>
                  )}
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

// ── Shared micro-components ───────────────────────────────────────────────────

function Spinner() {
  return <div className="flex items-center justify-center h-32 text-neutral-300 text-xs uppercase tracking-widest">Loading…</div>;
}

function Empty() {
  return <p className="text-sm text-neutral-400">Nothing matches your search.</p>;
}

// ── Root ──────────────────────────────────────────────────────────────────────

const TABS: { id: ActiveTab; label: string }[] = [
  { id: "events", label: "Events" },
  { id: "people", label: "People" },
  { id: "ensembles", label: "Ensembles" },
  { id: "venues", label: "Venues" },
  { id: "festivals", label: "Festivals" },
];

export default function Search() {
  const [tab, setTab] = useState<ActiveTab>("events");
  const [query, setQuery] = useState("");

  return (
    <div>
      {/* Search input */}
      <div className="mb-4">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`Search ${tab}…`}
          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-900 placeholder-neutral-300 focus:outline-none focus:border-neutral-400 bg-white"
        />
      </div>

      {/* Entity-type tabs */}
      <div className="flex gap-1 border-b border-neutral-100 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setQuery(""); }}
            className={`px-3 py-2 text-xs uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 -mb-px flex-shrink-0 ${
              tab === t.id
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-400 hover:text-neutral-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "events" && <EventsTab query={query} />}
      {tab === "people" && <PeopleTab query={query} />}
      {tab === "ensembles" && <EnsemblesTab query={query} />}
      {tab === "venues" && <VenuesTab query={query} />}
      {tab === "festivals" && <FestivalsTab query={query} />}
    </div>
  );
}
