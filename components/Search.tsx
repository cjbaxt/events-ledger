"use client";
import { useState, useEffect, useRef } from "react";
import { fetchEvents, fetchAllPersons, fetchAllEnsembles, fetchAllVenues, fetchAllFestivals, invalidateNameCache } from "@/lib/api";
import type { EventListItem } from "@/lib/types";
import { useGuest } from "./GuestContext";
import EventTypeIcon from "./EventTypeIcon";
import { PERSON_ROLE_VOCAB, ENSEMBLE_ROLE_VOCAB } from "@/lib/roles";

interface Person { id: string; name: string; roles?: string[] | null; }
interface Ensemble { id: string; name: string; roles?: string[] | null; }
interface Venue { id: string; name: string; city?: string | null; parent_id?: string | null; parent_name?: string | null; }
interface Festival { id: string; name: string; edition?: string | null; }
interface MusicalPiece {
  id: string; title: string; movement: string | null; catalogue_number: string | null;
  composer_text: string | null; work_type: string | null; composer: { id: string; name: string } | null;
  events: { id: string; title: string; date: string; type: string }[];
}
interface WorkItem {
  id: string; title: string; type: string | null; creator: { id: string; name: string } | null;
  events: { id: string; title: string; date: string; type: string }[];
}
// Unified row for the Works tab
interface WorkRow {
  id: string; title: string; workType: string | null; creatorName: string | null;
  movement: string | null;
  events: { id: string; title: string; date: string; type: string }[];
  source: "work" | "piece";
}

type ActiveTab = "events" | "people" | "ensembles" | "venues" | "festivals" | "works";

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
  renderRow: (item: T, onDelete: (id: string, name: string) => void, onUpdate: (id: string, updates: Partial<T>) => void) => React.ReactNode;
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

  function handleUpdate(id: string, updates: Partial<T>) {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, ...updates } : item));
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
            <div className="divide-y divide-neutral-50">{groupItems.map((item) => renderRow(item, handleDelete, handleUpdate))}</div>
          </section>
        ))}
        {filtered.length === 0 && <Empty />}
      </div>
    </div>
  );
}

const VENUE_TYPES = ["theatre", "concert_hall", "museum", "arena", "outdoor", "circus_tent", "church", "other"];

function EditPanel({ onCancel, onDelete, deleteName, children }: {
  onCancel: () => void;
  onDelete?: () => void;
  deleteName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3 px-3 -mx-2 mb-1 bg-neutral-50 rounded-xl border border-neutral-100 space-y-2.5">
      {children}
      <div className="flex items-center justify-between pt-1">
        <button onClick={onCancel} className="text-xs text-neutral-400 hover:text-neutral-600">Cancel</button>
        {onDelete && (
          <button onClick={onDelete}
            className="text-[11px] text-neutral-300 hover:text-red-500 border border-neutral-200 hover:border-red-300 rounded px-2 py-0.5 transition-colors">
            Delete {deleteName}
          </button>
        )}
      </div>
    </div>
  );
}

function PersonRow({ p, isAdmin, onEntityClick, onDelete, onUpdate }: {
  p: Person; isAdmin: boolean;
  onEntityClick: (id: string, kind: "person" | "ensemble", name?: string) => void;
  onDelete: (id: string, name: string) => void;
  onUpdate: (id: string, updates: Partial<Person>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(p.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true); setError(null);
    const res = await fetch(`/api/persons/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setSaving(false);
    if (!res.ok) { setError("Save failed"); return; }
    invalidateNameCache(`person:${p.id}`);
    setEditing(false);
    onUpdate(p.id, { name: name.trim() });
  }

  return (
    <div className="py-2.5 border-b border-neutral-50 last:border-0">
      <div className="flex items-center gap-2 -mx-2 px-2">
        <button onClick={() => onEntityClick(p.id, "person", p.name)} className="flex-1 min-w-0 text-left">
          <span className="text-sm text-neutral-900 font-serif leading-snug hover:underline underline-offset-2 truncate block">{p.name}</span>
        </button>
        {p.roles && p.roles.length > 0 && <span className="text-xs text-neutral-400 flex-shrink-0 truncate max-w-[35%]">{p.roles.join(" · ")}</span>}
        {isAdmin && (
          <button onClick={() => setEditing((v) => !v)}
            className={`text-[11px] border rounded px-2 py-0.5 flex-shrink-0 transition-colors ${editing ? "border-neutral-400 text-neutral-700 bg-neutral-100" : "border-neutral-200 text-neutral-400 hover:text-neutral-700 hover:border-neutral-400"}`}>
            {editing ? "Close" : "Edit"}
          </button>
        )}
      </div>
      {editing && (
        <EditPanel onCancel={() => { setEditing(false); setName(p.name); }}
          onDelete={() => onDelete(p.id, p.name)} deleteName={p.name}>
          <input value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setName(p.name); } }}
            className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-400 bg-white"
            placeholder="Person name" autoFocus />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button onClick={save} disabled={saving}
            className="text-xs bg-neutral-900 text-white rounded-lg px-3 py-1.5 disabled:opacity-50 w-full">
            {saving ? "Saving…" : "Save name"}
          </button>
        </EditPanel>
      )}
    </div>
  );
}

function EnsembleRow({ e, isAdmin, onEntityClick, onDelete, onUpdate }: {
  e: Ensemble; isAdmin: boolean;
  onEntityClick: (id: string, kind: "person" | "ensemble", name?: string) => void;
  onDelete: (id: string, name: string) => void;
  onUpdate: (id: string, updates: Partial<Ensemble>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(e.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true); setError(null);
    const res = await fetch(`/api/ensembles/${e.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setSaving(false);
    if (!res.ok) { setError("Save failed"); return; }
    invalidateNameCache(`ensemble:${e.id}`);
    setEditing(false);
    onUpdate(e.id, { name: name.trim() });
  }

  return (
    <div className="py-2.5 border-b border-neutral-50 last:border-0">
      <div className="flex items-center gap-2 -mx-2 px-2">
        <button onClick={() => onEntityClick(e.id, "ensemble", e.name)} className="flex-1 min-w-0 text-left">
          <span className="text-sm text-neutral-900 font-serif leading-snug hover:underline underline-offset-2 truncate block">{e.name}</span>
        </button>
        {e.roles && e.roles.length > 0 && <span className="text-xs text-neutral-400 flex-shrink-0 truncate max-w-[35%]">{e.roles.join(" · ")}</span>}
        {isAdmin && (
          <button onClick={() => setEditing((v) => !v)}
            className={`text-[11px] border rounded px-2 py-0.5 flex-shrink-0 transition-colors ${editing ? "border-neutral-400 text-neutral-700 bg-neutral-100" : "border-neutral-200 text-neutral-400 hover:text-neutral-700 hover:border-neutral-400"}`}>
            {editing ? "Close" : "Edit"}
          </button>
        )}
      </div>
      {editing && (
        <EditPanel onCancel={() => { setEditing(false); setName(e.name); }}
          onDelete={() => onDelete(e.id, e.name)} deleteName={e.name}>
          <input value={name} onChange={(ev) => setName(ev.target.value)}
            onKeyDown={(ev) => { if (ev.key === "Enter") save(); if (ev.key === "Escape") { setEditing(false); setName(e.name); } }}
            className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-400 bg-white"
            placeholder="Ensemble name" autoFocus />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button onClick={save} disabled={saving}
            className="text-xs bg-neutral-900 text-white rounded-lg px-3 py-1.5 disabled:opacity-50 w-full">
            {saving ? "Saving…" : "Save name"}
          </button>
        </EditPanel>
      )}
    </div>
  );
}

function RoleFilterRow({ roles, active, onToggle }: { roles: readonly string[]; active: string | null; onToggle: (r: string) => void }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4" style={{ scrollbarWidth: "none" }}>
      {[...roles].map((r) => (
        <button key={r} onClick={() => onToggle(r)}
          className={`text-[11px] px-3 py-1 rounded-full border whitespace-nowrap flex-shrink-0 transition-colors ${active === r ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-500"}`}>
          {r}
        </button>
      ))}
    </div>
  );
}

function PeopleTab({ query, onEntityClick }: { query: string; onEntityClick: (id: string, kind: "person" | "ensemble", name?: string) => void }) {
  const isGuest = useGuest();
  const [items, setItems] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const letterRefs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => { fetchAllPersons().then(setItems as (v: unknown) => void).catch(() => {}).finally(() => setLoading(false)); }, []);
  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    fetch(`/api/persons/${id}`, { method: "DELETE" }).then((r) => {
      if (!r.ok) { alert("Delete failed — may still have events attached."); return; }
      setItems((prev) => prev.filter((p) => p.id !== id));
    });
  }
  function handleUpdate(id: string, updates: Partial<Person>) { setItems((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } : p)); }
  if (loading) return <Spinner />;
  const q = query.trim().toLowerCase();
  const filtered = items
    .filter((p) => !q || p.name.toLowerCase().includes(q))
    .filter((p) => !roleFilter || (p.roles ?? []).includes(roleFilter))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const groups = groupAlpha(filtered, (p) => p.name);
  const presentLetters = new Set(groups.keys());
  return (
    <div>
      <RoleFilterRow roles={PERSON_ROLE_VOCAB} active={roleFilter} onToggle={(r) => setRoleFilter((prev) => prev === r ? null : r)} />
      {!q && !roleFilter && <AlphaNav presentLetters={presentLetters} onScroll={(l) => letterRefs.current[l]?.scrollIntoView({ behavior: "smooth", block: "start" })} />}
      <p className="text-[10px] uppercase tracking-widest text-neutral-300 mb-4">{filtered.length} {filtered.length === 1 ? "person" : "people"}{roleFilter ? ` · ${roleFilter}` : ""}</p>
      <div className="space-y-6">
        {[...groups.entries()].map(([letter, groupItems]) => (
          <section key={letter} ref={(el) => { letterRefs.current[letter] = el; }}>
            {!roleFilter && <div className="font-serif text-2xl text-neutral-200 mb-1 select-none">{letter}</div>}
            <div>{groupItems.map((p) => <PersonRow key={p.id} p={p} isAdmin={!isGuest} onEntityClick={onEntityClick} onDelete={handleDelete} onUpdate={handleUpdate} />)}</div>
          </section>
        ))}
        {filtered.length === 0 && <Empty />}
      </div>
    </div>
  );
}

function EnsemblesTab({ query, onEntityClick }: { query: string; onEntityClick: (id: string, kind: "person" | "ensemble", name?: string) => void }) {
  const isGuest = useGuest();
  const [items, setItems] = useState<Ensemble[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const letterRefs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => { fetchAllEnsembles().then(setItems as (v: unknown) => void).catch(() => {}).finally(() => setLoading(false)); }, []);
  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    fetch(`/api/ensembles/${id}`, { method: "DELETE" }).then((r) => {
      if (!r.ok) { alert("Delete failed — may still have events attached."); return; }
      setItems((prev) => prev.filter((e) => e.id !== id));
    });
  }
  function handleUpdate(id: string, updates: Partial<Ensemble>) { setItems((prev) => prev.map((e) => e.id === id ? { ...e, ...updates } : e)); }
  if (loading) return <Spinner />;
  const q = query.trim().toLowerCase();
  const filtered = items
    .filter((e) => !q || e.name.toLowerCase().includes(q))
    .filter((e) => !roleFilter || (e.roles ?? []).includes(roleFilter))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const groups = groupAlpha(filtered, (e) => e.name);
  const presentLetters = new Set(groups.keys());
  return (
    <div>
      <RoleFilterRow roles={ENSEMBLE_ROLE_VOCAB} active={roleFilter} onToggle={(r) => setRoleFilter((prev) => prev === r ? null : r)} />
      {!q && !roleFilter && <AlphaNav presentLetters={presentLetters} onScroll={(l) => letterRefs.current[l]?.scrollIntoView({ behavior: "smooth", block: "start" })} />}
      <p className="text-[10px] uppercase tracking-widest text-neutral-300 mb-4">{filtered.length} {filtered.length === 1 ? "ensemble" : "ensembles"}{roleFilter ? ` · ${roleFilter}` : ""}</p>
      <div className="space-y-6">
        {[...groups.entries()].map(([letter, groupItems]) => (
          <section key={letter} ref={(el) => { letterRefs.current[letter] = el; }}>
            {!roleFilter && <div className="font-serif text-2xl text-neutral-200 mb-1 select-none">{letter}</div>}
            <div>{groupItems.map((e) => <EnsembleRow key={e.id} e={e} isAdmin={!isGuest} onEntityClick={onEntityClick} onDelete={handleDelete} onUpdate={handleUpdate} />)}</div>
          </section>
        ))}
        {filtered.length === 0 && <Empty />}
      </div>
    </div>
  );
}

type FullVenue = {
  id: string; name: string; city: string | null; country: string | null;
  venue_type: string | null; capacity: number | null; website_url: string | null;
  maps_url: string | null; parent_id: string | null; parent_name: string | null;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] uppercase tracking-widest text-neutral-400 mb-1">{children}</label>;
}

function VenueRow({ v, allVenues, isAdmin, onVenueClick, onSaved, onDeleted }: {
  v: Venue; allVenues: Venue[]; isAdmin: boolean;
  onVenueClick: (id: string, name?: string) => void;
  onSaved: (id: string, updates: Partial<FullVenue>) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [full, setFull] = useState<FullVenue | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state — initialised when full venue loads
  const [name, setName] = useState(v.name);
  const [parentId, setParentId] = useState(v.parent_id ?? "");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [venueType, setVenueType] = useState("");
  const [capacity, setCapacity] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");

  async function startEdit() {
    setEditing(true);
    if (full) return;
    setLoading(true);
    const res = await fetch(`/api/venues/${v.id}`);
    const data: FullVenue = await res.json();
    setFull(data);
    setName(data.name);
    setParentId(data.parent_id ?? "");
    setCity(data.city ?? "");
    setCountry(data.country ?? "");
    setVenueType(data.venue_type ?? "");
    setCapacity(data.capacity != null ? String(data.capacity) : "");
    setWebsiteUrl(data.website_url ?? "");
    setMapsUrl(data.maps_url ?? "");
    setLoading(false);
  }

  function cancel() {
    setEditing(false);
    if (full) {
      setName(full.name); setParentId(full.parent_id ?? ""); setCity(full.city ?? "");
      setCountry(full.country ?? ""); setVenueType(full.venue_type ?? "");
      setCapacity(full.capacity != null ? String(full.capacity) : "");
      setWebsiteUrl(full.website_url ?? ""); setMapsUrl(full.maps_url ?? "");
    }
  }

  async function save() {
    setSaving(true); setError(null);
    const body: Record<string, unknown> = {
      name: name.trim(), parent_id: parentId || null,
      city: city.trim() || null, country: country.trim() || null,
      venue_type: venueType || null, capacity: capacity ? parseInt(capacity) : null,
      website_url: websiteUrl.trim() || null, maps_url: mapsUrl.trim() || null,
    };
    const res = await fetch(`/api/venues/${v.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) { setError("Save failed"); return; }
    const parentEntry = allVenues.find((p) => p.id === (parentId || null));
    setFull((f) => f ? { ...f, ...body, parent_name: parentEntry?.name ?? null } as FullVenue : null);
    setEditing(false);
    onSaved(v.id, { ...body, parent_name: parentEntry?.name ?? null } as Partial<FullVenue>);
  }

  async function del() {
    if (!confirm(`Delete "${v.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/venues/${v.id}`, { method: "DELETE" });
    if (!res.ok) { alert("Delete failed — venue may still have events attached."); return; }
    onDeleted(v.id);
  }

  const parentOptions = allVenues.filter((p) => p.id !== v.id);

  return (
    <div className="py-2.5 border-b border-neutral-50 last:border-0">
      <div className="flex items-center gap-2 -mx-2 px-2">
        <button onClick={() => onVenueClick(v.id, v.name)} className="flex-1 min-w-0 text-left">
          {v.parent_name && <span className="block text-[10px] text-neutral-400 truncate">{v.parent_name}</span>}
          <span className="text-sm text-neutral-900 font-serif leading-snug hover:underline underline-offset-2 block truncate">{v.name}</span>
        </button>
        {v.city && <span className="text-xs text-neutral-400 flex-shrink-0">{v.city}</span>}
        {isAdmin && (
          <button onClick={() => editing ? cancel() : startEdit()}
            className={`text-[11px] border rounded px-2 py-0.5 flex-shrink-0 transition-colors ${editing ? "border-neutral-400 text-neutral-700 bg-neutral-100" : "border-neutral-200 text-neutral-400 hover:text-neutral-700 hover:border-neutral-400"}`}>
            {editing ? "Close" : "Edit"}
          </button>
        )}
      </div>
      {editing && (
        <EditPanel onCancel={cancel} onDelete={del} deleteName={v.name}>
          {loading ? (
            <p className="text-xs text-neutral-400">Loading…</p>
          ) : (
            <div className="space-y-3">
              <div>
                <FieldLabel>Name</FieldLabel>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-400 bg-white"
                  placeholder="Venue name" autoFocus />
              </div>
              <div>
                <FieldLabel>Parent venue</FieldLabel>
                <select value={parentId} onChange={(e) => setParentId(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-sm text-neutral-700 bg-white focus:outline-none focus:border-neutral-400">
                  <option value="">— None —</option>
                  {parentOptions.map((p) => <option key={p.id} value={p.id}>{p.name}{p.city ? ` (${p.city})` : ""}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel>City</FieldLabel>
                  <input value={city} onChange={(e) => setCity(e.target.value)}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-400 bg-white"
                    placeholder="Amsterdam" />
                </div>
                <div>
                  <FieldLabel>Country</FieldLabel>
                  <input value={country} onChange={(e) => setCountry(e.target.value)}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-400 bg-white"
                    placeholder="Netherlands" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel>Type</FieldLabel>
                  <select value={venueType} onChange={(e) => setVenueType(e.target.value)}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-sm text-neutral-700 bg-white focus:outline-none focus:border-neutral-400">
                    <option value="">— None —</option>
                    {VENUE_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Capacity</FieldLabel>
                  <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-400 bg-white"
                    placeholder="1200" min={0} />
                </div>
              </div>
              <div>
                <FieldLabel>Website</FieldLabel>
                <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-400 bg-white"
                  placeholder="https://…" type="url" />
              </div>
              <div>
                <FieldLabel>Google Maps URL</FieldLabel>
                <input value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-400 bg-white"
                  placeholder="https://maps.google.com/…" type="url" />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button onClick={save} disabled={saving}
                className="w-full text-xs bg-neutral-900 text-white rounded-lg px-3 py-1.5 disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </EditPanel>
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

  function handleSaved(id: string, updates: Partial<FullVenue>) {
    setVenues(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
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

interface WorkGroup {
  key: string;        // normalised title for dedup
  title: string;      // display title (from first form)
  forms: WorkRow[];   // 1 = simple, 2+ = tiered
  totalEvents: number;
}

function buildGroups(rows: WorkRow[]): WorkGroup[] {
  const map = new Map<string, WorkGroup>();
  for (const row of rows) {
    const key = row.title.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, { key, title: row.title, forms: [], totalEvents: 0 });
    }
    const g = map.get(key)!;
    g.forms.push(row);
    g.totalEvents += row.events.length;
  }
  return [...map.values()].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
}

function TypeChip({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0 rounded text-[9px] font-medium uppercase tracking-wider bg-neutral-100 text-neutral-400 border border-neutral-200 flex-shrink-0">
      {type.replace(/_/g, " ")}
    </span>
  );
}

function WorksTab({ query, onEventClick }: { query: string; onEventClick: (id: string) => void }) {
  const [rows, setRows] = useState<WorkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const letterRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/works?withEvents=true&limit=1000").then((r) => r.json() as Promise<WorkItem[]>),
      fetch("/api/musical_pieces?withEvents=true&limit=2000").then((r) => r.json() as Promise<MusicalPiece[]>),
    ]).then(([works, pieces]) => {
      const workRows: WorkRow[] = works.map((w) => ({
        id: `w:${w.id}`, title: w.title, workType: w.type ?? null,
        creatorName: w.creator?.name ?? null, movement: null, events: w.events ?? [], source: "work",
      }));
      const pieceRows: WorkRow[] = pieces
        .filter((p) => p.events.length > 0 && p.work_type === "music")
        .map((p) => ({
          id: `p:${p.id}`, title: p.title, workType: "music",
          creatorName: p.composer?.name ?? p.composer_text ?? null,
          movement: p.movement ?? null, events: p.events, source: "piece",
        }));
      setRows([...workRows, ...pieceRows]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const q = query.trim().toLowerCase();
  const allGroups = buildGroups(
    rows.filter((r) => r.events.length > 0 && (!q || r.title.toLowerCase().includes(q) || r.creatorName?.toLowerCase().includes(q)))
  );

  const alphaGroups = groupAlpha(allGroups, (g) => g.title);
  const presentLetters = new Set(alphaGroups.keys());

  function toggle(key: string) {
    setExpanded((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  return (
    <div>
      <div className="mb-4 text-[10px] uppercase tracking-widest text-amber-500">Works tracking is in early access — data may be incomplete.</div>
      {!q && <AlphaNav presentLetters={presentLetters} onScroll={(l) => letterRefs.current[l]?.scrollIntoView({ behavior: "smooth", block: "start" })} />}
      <p className="text-[10px] uppercase tracking-widest text-neutral-300 mb-4">{allGroups.length} {allGroups.length === 1 ? "work" : "works"}</p>
      <div className="space-y-6">
        {[...alphaGroups.entries()].map(([letter, letterGroups]) => (
          <section key={letter} ref={(el) => { letterRefs.current[letter] = el; }}>
            <div className="font-serif text-2xl text-neutral-200 mb-1 select-none">{letter}</div>
            <div className="divide-y divide-neutral-50">
              {letterGroups.map((group) => {
                const isExpanded = expanded.has(group.key);
                const isMulti = group.forms.length > 1;
                return (
                  <div key={group.key}>
                    <button onClick={() => toggle(group.key)} className="w-full flex items-center gap-3 py-2.5 text-left group hover:bg-neutral-50 -mx-2 px-2 rounded-lg transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm text-neutral-900 font-serif leading-snug group-hover:underline underline-offset-2">{group.title}</span>
                          {group.forms.map((f) => f.workType && <TypeChip key={f.id} type={f.workType} />)}
                        </div>
                        {!isMulti && group.forms[0].creatorName && (
                          <span className="text-xs text-neutral-400">{group.forms[0].creatorName}</span>
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-400 flex-shrink-0">seen {group.totalEvents}×</span>
                    </button>

                    {isExpanded && (
                      <div className="ml-2 mb-2">
                        {isMulti ? (
                          // Tiered: each form gets its own section
                          <div className="space-y-2">
                            {group.forms.map((form) => (
                              <div key={form.id}>
                                <div className="flex items-center gap-1.5 py-1">
                                  {form.workType && <TypeChip type={form.workType} />}
                                  {form.movement && <span className="text-[10px] text-neutral-400">{form.movement}</span>}
                                  {form.creatorName && <span className="text-xs text-neutral-400">{form.creatorName}</span>}
                                </div>
                                <div className="ml-2 space-y-0.5">
                                  {form.events.map((ev) => (
                                    <button key={ev.id} onClick={() => onEventClick(ev.id)} className="w-full flex items-center gap-2 py-1 text-left text-xs text-neutral-500 hover:text-neutral-900 hover:underline underline-offset-2">
                                      <span className="text-neutral-300 tabular-nums flex-shrink-0">{ev.date}</span>
                                      <span className="truncate">{ev.title}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          // Simple: flat event list
                          <div className="space-y-0.5">
                            {group.forms[0].events.map((ev) => (
                              <button key={ev.id} onClick={() => onEventClick(ev.id)} className="w-full flex items-center gap-2 py-1 text-left text-xs text-neutral-500 hover:text-neutral-900 hover:underline underline-offset-2">
                                <span className="text-neutral-300 tabular-nums flex-shrink-0">{ev.date}</span>
                                <span className="truncate">{ev.title}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
        {allGroups.length === 0 && <Empty />}
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
  { id: "works", label: "Works" },
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
      {tab === "people" && <PeopleTab query={query} onEntityClick={onEntityClick} />}
      {tab === "ensembles" && <EnsemblesTab query={query} onEntityClick={onEntityClick} />}
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
      {tab === "works" && <WorksTab query={query} onEventClick={onEventClick} />}
    </div>
  );
}
