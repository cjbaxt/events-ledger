"use client";
import { useState, useEffect, useRef } from "react";
import { fetchEvents, fetchAllPersons, fetchAllEnsembles, fetchAllVenues, fetchAllFestivals } from "@/lib/api";
import type { EventListItem } from "@/lib/types";
import { useGuest } from "./GuestContext";
import EventTypeIcon from "./EventTypeIcon";

interface Person { id: string; name: string; roles?: string[] | null; }
interface Ensemble { id: string; name: string; roles?: string[] | null; }
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
  useEffect(() => { fetchEvents({ limit: 1000 }).then(setEvents).catch(() => {}).finally(() => setLoading(false)); }, []);
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
    const fetcher = endpoint === "persons" ? fetchAllPersons
      : endpoint === "ensembles" ? fetchAllEnsembles
      : endpoint === "festivals" ? fetchAllFestivals
      : () => fetch(`/api/${endpoint}?limit=2000`).then((r) => r.json());
    (fetcher() as Promise<T[]>).then(setItems).catch(() => {}).finally(() => setLoading(false));
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

function DeletableEntityTab<T extends { id: string; name: string }>({
  query, endpoint, singularLabel, pluralLabel, canDelete, renderRow,
}: {
  query: string; endpoint: string; singularLabel: string; pluralLabel: string; canDelete: boolean;
  renderRow: (item: T, onDelete: (id: string, name: string) => void) => React.ReactNode;
}) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const letterRefs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => {
    const fetcher = endpoint === "persons" ? fetchAllPersons
      : endpoint === "ensembles" ? fetchAllEnsembles
      : () => fetch(`/api/${endpoint}?limit=2000`).then((r) => r.json());
    (fetcher() as Promise<T[]>).then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, [endpoint]);

  async function handleDelete(id: string, name: string) {
    if (!canDelete) return;
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/${endpoint}/${id}`, { method: "DELETE" });
    if (!res.ok) { alert("Delete failed — may still have events attached."); return; }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

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
            <div className="divide-y divide-neutral-50">{groupItems.map((item) => renderRow(item, handleDelete))}</div>
          </section>
        ))}
        {filtered.length === 0 && <Empty />}
      </div>
    </div>
  );
}

function VenueRow({ v, allVenues, isAdmin, onVenueClick, onSaved, onDeleted }: {
  v: Venue; allVenues: Venue[]; isAdmin: boolean;
  onVenueClick: (id: string, name?: string) => void;
  onSaved: (id: string, name: string, parentId: string | null) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(v.name);
  const [parentId, setParentId] = useState<string>(v.parent_id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true); setError(null);
    const res = await fetch(`/api/venues/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), parent_id: parentId || null }),
    });
    setSaving(false);
    if (!res.ok) { setError("Save failed"); return; }
    setEditing(false);
    onSaved(v.id, name.trim(), parentId || null);
  }

  async function del() {
    if (!confirm(`Delete "${v.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/venues/${v.id}`, { method: "DELETE" });
    if (!res.ok) { alert("Delete failed — venue may still have events attached."); return; }
    onDeleted(v.id);
  }

  if (editing) {
    const parentOptions = allVenues.filter(p => p.id !== v.id);
    return (
      <div className="py-2.5 -mx-2 px-2 space-y-2">
        <input
          value={name} onChange={e => setName(e.target.value)}
          className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-400"
          placeholder="Venue name"
        />
        <select
          value={parentId} onChange={e => setParentId(e.target.value)}
          className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-sm text-neutral-700 bg-white focus:outline-none focus:border-neutral-400"
        >
          <option value="">— No parent venue —</option>
          {parentOptions.map(p => <option key={p.id} value={p.id}>{p.name}{p.city ? ` (${p.city})` : ""}</option>)}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="text-xs border border-neutral-300 rounded px-2.5 py-1 hover:bg-neutral-50 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
          <button onClick={() => { setEditing(false); setName(v.name); setParentId(v.parent_id ?? ""); }} className="text-xs text-neutral-400">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-2.5 group -mx-2 px-2 rounded-lg hover:bg-neutral-50 transition-colors">
      <button onClick={() => onVenueClick(v.id, v.name)} className="flex-1 min-w-0 text-left">
        {v.parent_name && <span className="block text-[10px] text-neutral-400 truncate">{v.parent_name}</span>}
        <span className="text-sm text-neutral-900 font-serif leading-snug group-hover:underline underline-offset-2">{v.name}</span>
      </button>
      {v.city && <span className="text-xs text-neutral-400 flex-shrink-0">{v.city}</span>}
      {isAdmin && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => setEditing(true)} className="text-[11px] text-neutral-400 hover:text-neutral-700 border border-neutral-200 rounded px-1.5 py-0.5 hover:border-neutral-400">Edit</button>
          <button onClick={del} className="text-[11px] text-neutral-300 hover:text-red-500 border border-neutral-200 rounded px-1.5 py-0.5 hover:border-red-300">Del</button>
        </div>
      )}
    </div>
  );
}

function VenuesTab({ query, onVenueClick }: { query: string; onVenueClick: (id: string, name?: string) => void }) {
  const isGuest = useGuest();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const letterRefs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => { (fetchAllVenues() as Promise<Venue[]>).then(setVenues).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading) return <Spinner />;

  function handleSaved(id: string, name: string, parentId: string | null) {
    setVenues(prev => prev.map(v => v.id === id ? {
      ...v, name,
      parent_id: parentId,
      parent_name: parentId ? (prev.find(p => p.id === parentId)?.name ?? v.parent_name) : null,
    } : v));
  }
  function handleDeleted(id: string) {
    setVenues(prev => prev.filter(v => v.id !== id));
  }

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
                <VenueRow key={v.id} v={v} allVenues={venues} isAdmin={!isGuest} onVenueClick={onVenueClick} onSaved={handleSaved} onDeleted={handleDeleted} />
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
  onEntityClick: (id: string, kind: "person" | "ensemble", name?: string) => void;
  onVenueClick: (id: string, name?: string) => void;
  onFestivalClick: (id: string, name?: string) => void;
}) {
  const isGuest = useGuest();
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
        <DeletableEntityTab<Person> query={query} endpoint="persons" singularLabel="person" pluralLabel="people" canDelete={!isGuest}
          renderRow={(p, onDelete) => (
            <div key={p.id} className="flex items-center gap-2 py-2.5 group -mx-2 px-2 rounded-lg hover:bg-neutral-50 transition-colors">
              <button onClick={() => onEntityClick(p.id, "person", p.name)} className="flex-1 min-w-0 text-left">
                <span className="text-sm text-neutral-900 font-serif leading-snug group-hover:underline underline-offset-2 truncate block">{p.name}</span>
              </button>
              {p.roles && p.roles.length > 0 && <span className="text-xs text-neutral-400 flex-shrink-0 truncate max-w-[40%]">{p.roles.join(" · ")}</span>}
              <button onClick={() => onDelete(p.id, p.name)} className="text-[11px] text-neutral-300 hover:text-red-500 border border-neutral-200 rounded px-1.5 py-0.5 hover:border-red-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">Del</button>
            </div>
          )}
        />
      )}
      {tab === "ensembles" && (
        <DeletableEntityTab<Ensemble> query={query} endpoint="ensembles" singularLabel="ensemble" pluralLabel="ensembles" canDelete={!isGuest}
          renderRow={(e, onDelete) => (
            <div key={e.id} className="flex items-center gap-2 py-2.5 group -mx-2 px-2 rounded-lg hover:bg-neutral-50 transition-colors">
              <button onClick={() => onEntityClick(e.id, "ensemble", e.name)} className="flex-1 min-w-0 text-left">
                <span className="text-sm text-neutral-900 font-serif leading-snug group-hover:underline underline-offset-2 truncate block">{e.name}</span>
              </button>
              {e.roles && e.roles.length > 0 && <span className="text-xs text-neutral-400 flex-shrink-0 truncate max-w-[40%]">{e.roles.join(" · ")}</span>}
              <button onClick={() => onDelete(e.id, e.name)} className="text-[11px] text-neutral-300 hover:text-red-500 border border-neutral-200 rounded px-1.5 py-0.5 hover:border-red-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">Del</button>
            </div>
          )}
        />
      )}
      {tab === "venues" && <VenuesTab query={query} onVenueClick={onVenueClick} />}
      {tab === "festivals" && (
        <EntityTab<Festival> query={query} endpoint="festivals" singularLabel="festival" pluralLabel="festivals"
          renderRow={(f) => (
            <button key={f.id} onClick={() => onFestivalClick(f.id, [f.name, f.edition].filter(Boolean).join(" "))} className="w-full flex items-center gap-3 py-2.5 text-left group hover:bg-neutral-50 -mx-2 px-2 rounded-lg transition-colors">
              <span className="flex-1 text-sm text-neutral-900 font-serif leading-snug group-hover:underline underline-offset-2 truncate">{f.name}</span>
              {f.edition && <span className="text-xs text-neutral-400 flex-shrink-0">{f.edition}</span>}
            </button>
          )}
        />
      )}
    </div>
  );
}
