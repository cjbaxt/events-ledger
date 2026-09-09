"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { fetchEvents, updateEvent, patchEventRating, searchEntities, createEntity, updatePersonRoles, updateEnsembleRoles } from "@/lib/api";
import type { EventListItem } from "@/lib/types";
import EventTypeIcon from "./EventTypeIcon";
import { PERSON_ROLE_VOCAB, ENSEMBLE_ROLE_VOCAB } from "@/lib/roles";

// ── Tiny inline components ────────────────────────────────────────────────────

function StarRating({ rating, onRate }: { rating: number | null; onRate: (r: number | null) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const displayed = hover ?? rating ?? 0;
  return (
    <div className="flex gap-0.5" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.min(1, Math.max(0, displayed - (star - 1)));
        const half = fill === 0.5;
        const full = fill === 1;
        return (
          <div key={star} className="cursor-pointer w-5 h-5 flex items-center justify-center"
            onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(e.clientX - r.left < r.width / 2 ? star - 0.5 : star); }}
            onClick={() => { const next = hover ?? null; onRate(next === rating ? null : next); }}>
            <svg width="16" height="16" viewBox="0 0 16 16">
              <defs><clipPath id={`h${star}`}><rect x="0" y="0" width="8" height="16" /></clipPath></defs>
              <path d="M8 1l1.8 3.6 4 .6-2.9 2.8.7 4L8 10l-3.6 1.9.7-4L2.2 5.2l4-.6z" fill={full ? "#a3a3a3" : "none"} stroke="#d4d4d4" strokeWidth="1" />
              {half && <path d="M8 1l1.8 3.6 4 .6-2.9 2.8.7 4L8 10l-3.6 1.9.7-4L2.2 5.2l4-.6z" fill="#a3a3a3" clipPath={`url(#h${star})`} />}
            </svg>
          </div>
        );
      })}
    </div>
  );
}

type CreateOption = { endpoint: string; label: string; field: string };

function EntitySearch({ endpoint, placeholder, onSelect, createOptions }: {
  endpoint: string;
  placeholder: string;
  onSelect: (id: string, name: string, field?: string) => void;
  createOptions?: CreateOption[];
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; name?: string; title?: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const items = await searchEntities(endpoint, q);
      setResults(items);
      setOpen(true);
    }, 200);
  }, [q, endpoint]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleCreate(opt: CreateOption) {
    if (!q.trim() || creating) return;
    setCreating(true);
    try {
      const res = await createEntity(opt.endpoint, { name: q.trim() });
      onSelect(res.id, res.name ?? q.trim(), opt.field);
      setQ("");
      setOpen(false);
    } finally {
      setCreating(false);
    }
  }

  const showCreate = createOptions && q.trim().length > 0;

  return (
    <div ref={ref} className="relative w-48">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder}
        className="w-full border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-700 focus:outline-none focus:border-neutral-400" />
      {open && (results.length > 0 || showCreate) && (
        <div className="absolute z-20 top-full mt-1 left-0 w-60 bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden">
          {results.map((r) => (
            <button key={r.id} className="w-full text-left px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50"
              onClick={() => { onSelect(r.id, r.name ?? r.title ?? q); setQ(""); setOpen(false); }}>
              {r.name ?? r.title}
            </button>
          ))}
          {showCreate && (
            <div className={results.length > 0 ? "border-t border-neutral-100" : ""}>
              {createOptions.map((opt) => (
                <button key={opt.endpoint} disabled={creating}
                  className="w-full text-left px-3 py-2 text-xs text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700 disabled:opacity-50"
                  onClick={() => handleCreate(opt)}>
                  + Add &ldquo;{q.trim()}&rdquo; as {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Row components ────────────────────────────────────────────────────────────

function EventMeta({ event }: { event: EventListItem }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-neutral-400">
        <EventTypeIcon type={event.type} size={14} />
      </span>
      <span className="text-[10px] text-neutral-400 flex-shrink-0 w-20">{event.date}</span>
      <span className="text-sm text-neutral-800 truncate">{event.title}</span>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const CURRENCIES = ["GBP", "EUR", "USD", "CHF", "SEK", "DKK", "NOK"];

const ALL_TYPES = [
  "ballet", "cabaret", "circus", "classical", "comedy", "dance",
  "exhibition", "music", "opera", "screening", "spoken_word", "theatre",
];


function RatingTab({ events }: { events: EventListItem[] }) {
  const today = new Date().toLocaleDateString("sv");
  const missing = events.filter((e) => e.rating === null && e.date <= today).sort((a, b) => b.date.localeCompare(a.date));
  const [saved, setSaved] = useState<Set<string>>(new Set());

  async function handleRate(id: string, r: number | null) {
    await patchEventRating(id, r);
    if (r !== null) setSaved((s) => new Set([...s, id]));
  }

  const visible = missing.filter((e) => !saved.has(e.id));
  if (visible.length === 0) return <Empty label="All events have a rating" />;

  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-3">{visible.length} events without a rating</div>
      {visible.map((e) => (
        <div key={e.id} className="flex items-center justify-between gap-4 py-2 border-b border-neutral-50">
          <EventMeta event={e} />
          <StarRating rating={null} onRate={(r) => handleRate(e.id, r)} />
        </div>
      ))}
    </div>
  );
}

function VenueTab({ events }: { events: EventListItem[] }) {
  const missing = events.filter((e) => !e.venue_id).sort((a, b) => b.date.localeCompare(a.date));
  const [saved, setSaved] = useState<Set<string>>(new Set());

  async function handleSelect(eventId: string, venueId: string, _field?: string) {
    await updateEvent(eventId, { venue_id: venueId });
    setSaved((s) => new Set([...s, eventId]));
  }

  const visible = missing.filter((e) => !saved.has(e.id));
  if (visible.length === 0) return <Empty label="All events have a venue" />;

  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-3">{visible.length} events without a venue</div>
      {visible.map((e) => (
        <div key={e.id} className="flex items-center justify-between gap-4 py-2 border-b border-neutral-50">
          <EventMeta event={e} />
          <EntitySearch endpoint="venues" placeholder="Find venue…" onSelect={(id) => handleSelect(e.id, id)}
            createOptions={[{ endpoint: "venues", label: "venue", field: "venue_id" }]} />
        </div>
      ))}
    </div>
  );
}

function PriceRow({ event, onSaved }: { event: EventListItem; onSaved: () => void }) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!amount.trim()) return;
    setSaving(true);
    await updateEvent(event.id, { price_paid: amount.trim(), currency });
    onSaved();
  }

  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-neutral-50">
      <EventMeta event={event} />
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}
          className="border border-neutral-200 rounded-lg px-2 py-1.5 text-xs text-neutral-700 focus:outline-none focus:border-neutral-400">
          {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="w-20 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-700 focus:outline-none focus:border-neutral-400" />
        <button onClick={save} disabled={saving || !amount.trim()}
          className="px-2.5 py-1.5 text-xs bg-neutral-900 text-white rounded-lg disabled:opacity-30 hover:bg-neutral-700 transition-colors">
          Save
        </button>
      </div>
    </div>
  );
}

function PriceTab({ events }: { events: EventListItem[] }) {
  const missing = events.filter((e) => e.price_paid === null && !(e.type === "exhibition" && e.payment_method_id)).sort((a, b) => b.date.localeCompare(a.date));
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const visible = missing.filter((e) => !saved.has(e.id));
  if (visible.length === 0) return <Empty label="All events have a price" />;
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-3">{visible.length} events without a price</div>
      {visible.map((e) => (
        <PriceRow key={e.id} event={e} onSaved={() => setSaved((s) => new Set([...s, e.id]))} />
      ))}
    </div>
  );
}

function CreditsTab({ events }: { events: EventListItem[] }) {
  const [type, setType] = useState<string>("");
  const [missing, setMissing] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (t: string) => {
    setLoading(true);
    const url = t ? `/api/admin/missing?type=${t}` : `/api/admin/missing`;
    const res = await fetch(url);
    const data = await res.json();
    const byId = new Map(events.map((e) => [e.id, e]));
    setMissing((data.events ?? []).map((r: { id: string }) => byId.get(r.id) ?? r).filter(Boolean) as EventListItem[]);
    setLoading(false);
  }, [events]);

  useEffect(() => { load(type); }, [type, load]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <select value={type} onChange={(e) => setType(e.target.value)}
          className="border border-neutral-200 rounded-lg px-3 py-1.5 text-sm text-neutral-700 focus:outline-none focus:border-neutral-400">
          <option value="">All types</option>
          {ALL_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
        </select>
        {!loading && <span className="text-[10px] uppercase tracking-widest text-neutral-400">{missing.length} without credits</span>}
      </div>
      {loading && <div className="text-sm text-neutral-400">Loading…</div>}
      {!loading && missing.length === 0 && <Empty label={type ? `All ${type} events have credits` : "All events have credits"} />}
      {!loading && missing.length > 0 && (
        <div className="space-y-1">
          {missing.map((e: EventListItem) => (
            <div key={e.id} className="py-2 border-b border-neutral-50">
              <EventMeta event={e} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VenueScaleTab() {
  const [venues, setVenues] = useState<{ id: string; name: string; city: string | null; country: string | null }[]>([]);
  const [scaleOptions, setScaleOptions] = useState<string[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/venue-scale").then((r) => r.json()).then((d) => {
      setVenues(d.venues ?? []);
      setScaleOptions(d.scaleOptions ?? []);
    }).finally(() => setLoading(false));
  }, []);

  async function handleScale(id: string, scale: string) {
    await fetch("/api/admin/venue-scale", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, scale }) });
    setSaved((s) => new Set([...s, id]));
  }

  if (loading) return <div className="text-sm text-neutral-400">Loading…</div>;
  const visible = venues.filter((v) => !saved.has(v.id));
  if (visible.length === 0) return <Empty label="All venues have a scale" />;

  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-3">{visible.length} venues without a scale</div>
      {visible.map((v) => (
        <div key={v.id} className="flex items-center justify-between gap-4 py-2 border-b border-neutral-50">
          <div className="min-w-0">
            <div className="text-sm text-neutral-800 truncate">{v.name}</div>
            {(v.city || v.country) && <div className="text-xs text-neutral-400">{[v.city, v.country].filter(Boolean).join(", ")}</div>}
          </div>
          <select defaultValue="" onChange={(e) => { if (e.target.value) handleScale(v.id, e.target.value); }}
            className="flex-shrink-0 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-700 focus:outline-none focus:border-neutral-400">
            <option value="" disabled>Pick scale…</option>
            {scaleOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="py-12 text-center text-sm text-neutral-300">{label}</div>;
}


type EventSummary = { id: string; title: string; date: string; type: string };
type RoleEntity = { id: string; name: string; roles: string[] | null; kind: "person" | "ensemble"; recentEvents: EventSummary[] };

function InlineRolePicker({ entity, onSave, onDelete }: { entity: RoleEntity; onSave: () => void; onDelete: () => void }) {
  const vocab: readonly string[] = entity.kind === "person" ? PERSON_ROLE_VOCAB : ENSEMBLE_ROLE_VOCAB;
  const [draft, setDraft] = useState<string[]>(entity.roles ?? []);
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function save() {
    setSaving(true);
    try {
      if (entity.kind === "person") await updatePersonRoles(entity.id, draft);
      else await updateEnsembleRoles(entity.id, draft);
      onSave();
    } finally { setSaving(false); }
  }

  async function del() {
    if (!confirm(`Delete "${entity.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    const endpoint = entity.kind === "person" ? "persons" : "ensembles";
    const res = await fetch(`/api/${endpoint}/${entity.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) { alert("Delete failed — may still have events attached."); return; }
    onDelete();
  }

  return (
    <div className="py-3 border-b border-neutral-100">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-medium text-neutral-800">{entity.name}</span>
          <span className="ml-2 text-[10px] uppercase tracking-widest text-neutral-400">{entity.kind}</span>
        </div>
        <button onClick={del} disabled={deleting}
          className="text-[11px] text-neutral-300 hover:text-red-500 border border-neutral-200 hover:border-red-300 rounded px-1.5 py-0.5 transition-colors disabled:opacity-40 flex-shrink-0">
          {deleting ? "…" : "Delete"}
        </button>
      </div>
      {entity.recentEvents.length > 0 && (
        <div className="mb-3 space-y-0.5">
          {entity.recentEvents.map((ev) => (
            <div key={ev.id} className="flex items-baseline gap-2">
              <span className="text-[11px] text-neutral-400 w-[3.5rem] flex-shrink-0 tabular-nums">{ev.date.slice(0, 4)}</span>
              <span className="text-[11px] text-neutral-500 truncate">{ev.title}</span>
              <span className="text-[10px] text-neutral-300 flex-shrink-0">{ev.type}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {[...vocab, ...draft.filter((r) => !vocab.includes(r))].map((r) => (
          <button key={r} onClick={() => setDraft((d) => d.includes(r) ? d.filter((x) => x !== r) : [...d, r])}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${draft.includes(r) ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400"}`}>
            {r}
          </button>
        ))}
      </div>
      <form className="flex gap-1.5 mb-2" onSubmit={(e) => { e.preventDefault(); const v = custom.trim(); if (v && !draft.includes(v)) setDraft((d) => [...d, v]); setCustom(""); }}>
        <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Add custom role…"
          className="text-xs px-2.5 py-1 border border-neutral-200 rounded-full flex-1 min-w-0 outline-none focus:border-neutral-400" />
        <button type="submit" className="text-xs px-2.5 py-1 border border-neutral-200 rounded-full text-neutral-500 hover:border-neutral-400">+</button>
      </form>
      <button onClick={save} disabled={saving || draft.length === 0}
        className="text-xs px-3 py-1 bg-neutral-900 text-white rounded-full disabled:opacity-40">
        Save
      </button>
    </div>
  );
}

function RolesTab() {
  const [items, setItems] = useState<RoleEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/admin/missing-roles")
      .then((r) => r.json())
      .then((d) => {
        const persons = (d.persons ?? []).map((p: { id: string; name: string; roles: string[] | null; recentEvents: EventSummary[] }) => ({ ...p, kind: "person" as const }));
        const ensembles = (d.ensembles ?? []).map((e: { id: string; name: string; roles: string[] | null; recentEvents: EventSummary[] }) => ({ ...e, kind: "ensemble" as const }));
        setItems([...persons, ...ensembles].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-neutral-400">Loading…</div>;
  const visible = items.filter((i) => !saved.has(i.id));
  if (visible.length === 0) return <Empty label="All persons and ensembles have roles" />;

  return (
    <div>
      <span className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-4">{visible.length} without roles</span>
      <div className="space-y-0">
        {visible.map((entity) => (
          <InlineRolePicker key={entity.id} entity={entity}
            onSave={() => setSaved((s) => new Set([...s, entity.id]))}
            onDelete={() => setItems((prev) => prev.filter((i) => i.id !== entity.id))} />
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const TABS = ["Rating", "Venue", "Price", "Credits", "Venue scale", "Roles"] as const;
type Tab = typeof TABS[number];

export default function AdminView() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("Rating");

  useEffect(() => {
    fetchEvents({ limit: 500 }).then(setEvents).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-20 text-center text-sm text-neutral-300 tracking-widest uppercase">Loading…</div>;

  return (
    <div>
      <div className="flex gap-1 mb-8 border-b border-neutral-100">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${tab === t ? "border-neutral-900 text-neutral-900 font-medium" : "border-transparent text-neutral-400 hover:text-neutral-700"}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Rating"      && <RatingTab events={events} />}
      {tab === "Venue"       && <VenueTab events={events} />}
      {tab === "Price"       && <PriceTab events={events} />}
      {tab === "Credits"     && <CreditsTab events={events} />}
      {tab === "Venue scale" && <VenueScaleTab />}
      {tab === "Roles"       && <RolesTab />}
    </div>
  );
}
