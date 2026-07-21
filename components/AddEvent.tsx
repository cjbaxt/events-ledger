"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  createEvent, updateEvent, searchEntities, createEntity,
  fetchPaymentMethods, createPaymentMethod,
} from "@/lib/api";
import type { PaymentMethod } from "@/lib/api";
import type { EventDetail } from "@/lib/types";
import EventTypeIcon from "./EventTypeIcon";

type NamedRef = { id: string; name: string };
type LinkRow = { url: string; label: string; description: string };
type Step = "import" | "type" | "basic" | "details" | "take";

const EVENT_TYPES = [
  "music", "classical", "opera", "ballet", "dance",
  "circus", "theatre", "cabaret", "comedy", "spoken_word",
  "talk", "exhibition", "screening", "other",
] as const;
type EventType = typeof EVENT_TYPES[number];

const TYPE_LABELS: Record<string, string> = {
  music: "Music", classical: "Classical", opera: "Opera", ballet: "Ballet",
  dance: "Dance", circus: "Circus", theatre: "Theatre", cabaret: "Cabaret",
  comedy: "Comedy", spoken_word: "Spoken Word", talk: "Talk",
  exhibition: "Exhibition", screening: "Screening", other: "Other",
};

const SUBTYPES: Record<string, string[]> = {
  music: ["gig", "festival", "choir", "comedy_music", "community", "open_mic", "residency", "other"],
  classical: ["orchestral", "chamber", "choral", "recital", "contemporary", "comedy_classical", "other"],
  opera: ["full_length", "contemporary", "opera", "operetta", "musical_theatre", "other"],
  ballet: ["full_length", "mixed_bill", "contemporary", "other"],
  dance: ["contemporary", "flamenco", "folk", "ballroom", "other"],
  circus: ["contemporary", "big_top", "clown", "traditional", "physical_theatre", "aerial", "street", "other"],
  theatre: ["play", "musical", "improv", "improv_musical", "panto", "physical_theatre", "puppet", "other"],
  cabaret: ["burlesque", "drag", "cabaret", "variety", "other"],
  comedy: ["standup", "sketch", "double_act", "panel", "character", "musical_comedy", "comedy_magic", "variety", "other"],
  spoken_word: ["spoken_word", "reading", "slam", "storytelling", "other"],
  talk: ["lecture", "panel", "debate", "podcast_recording", "book_event", "science_comm", "science", "interview", "other"],
  exhibition: ["art", "natural_history", "science", "photography", "sculpture", "design", "historical", "other"],
  screening: ["film", "live_broadcast", "archive_screening", "live_score", "documentary", "other"],
};

const inputCls = "w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:border-neutral-400";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

const CREATE_FIELDS: Record<string, Array<{ key: string; label: string; required?: boolean; options?: string[] }>> = {
  persons: [{ key: "name", label: "Name", required: true }],
  ensembles: [{ key: "name", label: "Name", required: true }, { key: "type", label: "Type", options: ["orchestra", "chamber_ensemble", "choir", "band", "company", "collective", "other"] }],
  festivals: [{ key: "name", label: "Name (without year)", required: true }, { key: "edition", label: "Edition / year (e.g. 2026)" }],
  works: [{ key: "title", label: "Title", required: true }, { key: "type", label: "Type", required: true, options: ["opera", "ballet", "play", "film", "musical", "symphonic", "chamber", "song_cycle", "other"] }],
  productions: [{ key: "title", label: "Title", required: true }],
};

function VenueCreateForm({ initialName, onCreated, onCancel }: { initialName: string; onCreated: (v: NamedRef) => void; onCancel: () => void }) {
  const [name, setName] = useState(initialName);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [parentQuery, setParentQuery] = useState("");
  const [parentResults, setParentResults] = useState<NamedRef[]>([]);
  const [parent, setParent] = useState<NamedRef | null>(null);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (parentQuery.length < 2) { setParentResults([]); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => { const items = await searchEntities("venues", parentQuery); setParentResults(items.map((i) => ({ id: i.id, name: i.name ?? "" }))); }, 280);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [parentQuery]);
  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try { const res = await createEntity("venues", { name: name.trim(), city: city.trim() || null, country: country.trim() || null, parent_id: parent?.id ?? null }); onCreated({ id: res.id, name: res.name ?? name.trim() }); }
    catch (e) { alert(String(e)); }
    setSaving(false);
  }
  const iCls = "w-full border border-neutral-200 rounded px-2 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-neutral-400";
  return (
    <div className="border border-neutral-200 rounded-lg p-3 space-y-2 bg-neutral-50 mt-1" onMouseDown={(e) => e.stopPropagation()}>
      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">New venue</div>
      <input autoFocus className={iCls} placeholder="Name *" value={name} onChange={(e) => setName(e.target.value)} />
      <input className={iCls} placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
      <input className={iCls} placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
      <div className="relative">
        {parent ? (
          <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded px-2 py-1.5"><span className="text-xs text-neutral-700 flex-1">↳ {parent.name}</span><button type="button" onClick={() => setParent(null)} className="text-neutral-300 hover:text-neutral-500 text-xs">✕</button></div>
        ) : (
          <>
            <input className={iCls} placeholder="Parent venue (optional)" value={parentQuery} onChange={(e) => setParentQuery(e.target.value)} />
            {parentResults.length > 0 && <div className="absolute z-30 top-full mt-0.5 w-full bg-white border border-neutral-200 rounded shadow-sm overflow-hidden">{parentResults.map((r) => <button key={r.id} type="button" onMouseDown={() => { setParent(r); setParentQuery(""); setParentResults([]); }} className="w-full text-left px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50">{r.name}</button>)}</div>}
          </>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={save} disabled={saving || !name.trim()} className="px-3 py-1 text-xs bg-neutral-900 text-white rounded hover:bg-neutral-700 disabled:opacity-40">{saving ? "Saving…" : "Create"}</button>
        <button type="button" onClick={onCancel} className="px-3 py-1 text-xs text-neutral-400 hover:text-neutral-600">Cancel</button>
      </div>
    </div>
  );
}

function SimpleCreateForm({ endpoint, initialName, fields, onCreated, onCancel }: {
  endpoint: string; initialName: string; fields: Array<{ key: string; label: string; required?: boolean; options?: string[] }>;
  onCreated: (v: NamedRef) => void; onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => { const init: Record<string, string> = {}; fields.forEach((f) => { init[f.key] = f.key === fields[0].key ? initialName : ""; }); return init; });
  const [saving, setSaving] = useState(false);
  const nameKey = fields[0].key;
  const iCls = "w-full border border-neutral-200 rounded px-2 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-neutral-400";
  async function save() {
    if (!values[nameKey]?.trim()) return;
    setSaving(true);
    try { const payload: Record<string, unknown> = {}; fields.forEach((f) => { if (values[f.key]?.trim()) payload[f.key] = values[f.key].trim(); }); const res = await createEntity(endpoint, payload); onCreated({ id: res.id, name: res.name ?? res.title ?? values[nameKey] }); }
    catch (e) { alert(String(e)); }
    setSaving(false);
  }
  return (
    <div className="border border-neutral-200 rounded-lg p-3 space-y-2 bg-neutral-50 mt-1" onMouseDown={(e) => e.stopPropagation()}>
      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">New {endpoint.replace(/_/g, " ").replace(/s$/, "")}</div>
      {fields.map((f, i) => f.options ? (
        <select key={f.key} className={iCls} value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}><option value="">{f.label}{f.required ? " *" : " (optional)"}</option>{f.options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
      ) : (
        <input key={f.key} autoFocus={i === 0} className={iCls} placeholder={`${f.label}${f.required ? " *" : ""}`} value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
      ))}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={save} disabled={saving || !values[nameKey]?.trim()} className="px-3 py-1 text-xs bg-neutral-900 text-white rounded hover:bg-neutral-700 disabled:opacity-40">{saving ? "Saving…" : "Create"}</button>
        <button type="button" onClick={onCancel} className="px-3 py-1 text-xs text-neutral-400 hover:text-neutral-600">Cancel</button>
      </div>
    </div>
  );
}

function SearchCombo({ label, endpoint, value, onChange, optional = true, displayFn, allowCreate = true, initialQuery = "" }: {
  label: string; endpoint: string; value: NamedRef | null; onChange: (v: NamedRef | null) => void;
  optional?: boolean; displayFn?: (item: Record<string, unknown>) => string; allowCreate?: boolean; initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<NamedRef[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onClickOutside(e: MouseEvent) { if (ref.current && e.composedPath().includes(ref.current)) return; setOpen(false); setCreating(false); }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);
  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const items = await searchEntities(endpoint, query);
      setResults(items.map((i) => ({ id: i.id, name: displayFn ? displayFn(i as Record<string, unknown>) : (i.name ?? i.title ?? String(i.id)) })));
      setOpen(true);
    }, 280);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, endpoint, displayFn]);
  const canCreate = allowCreate && (endpoint in CREATE_FIELDS || endpoint === "venues");
  function handleCreated(v: NamedRef) { onChange(v); setQuery(""); setOpen(false); setCreating(false); }
  if (value) {
    return (
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5">{label}{!optional && <span className="text-red-400 ml-0.5">*</span>}</label>
        <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2"><span className="text-sm text-neutral-800 flex-1">{value.name}</span><button onClick={() => onChange(null)} className="text-neutral-300 hover:text-neutral-600 text-xs">✕</button></div>
      </div>
    );
  }
  return (
    <div ref={ref}>
      <label className="block text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5">{label}{!optional && <span className="text-red-400 ml-0.5">*</span>}</label>
      <div className="relative">
        <input type="text" value={query} onChange={(e) => { setQuery(e.target.value); setCreating(false); }} placeholder={`Search ${label.toLowerCase()}…`} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:border-neutral-400" />
        {open && (results.length > 0 || canCreate) && !creating && (
          <div className="absolute z-20 top-full mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
            {results.map((r) => <button key={r.id} type="button" onMouseDown={() => { onChange(r); setQuery(""); setOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 border-b border-neutral-100 last:border-0">{r.name}</button>)}
            {canCreate && <button type="button" onMouseDown={() => { setCreating(true); setOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-neutral-400 hover:bg-neutral-50 border-t border-neutral-100">+ Create "{query}"</button>}
          </div>
        )}
      </div>
      {creating && (endpoint === "venues" ? <VenueCreateForm initialName={query} onCreated={handleCreated} onCancel={() => setCreating(false)} /> : <SimpleCreateForm endpoint={endpoint} initialName={query} fields={CREATE_FIELDS[endpoint] ?? [{ key: "name", label: "Name", required: true }]} onCreated={handleCreated} onCancel={() => setCreating(false)} />)}
    </div>
  );
}

function MultiSearchCombo({ label, endpoint, values, onChange, displayFn }: { label: string; endpoint: string; values: NamedRef[]; onChange: (v: NamedRef[]) => void; displayFn?: (item: Record<string, unknown>) => string }) {
  const add = useCallback((v: NamedRef) => { if (!values.find((x) => x.id === v.id)) onChange([...values, v]); }, [values, onChange]);
  const remove = useCallback((id: string) => { onChange(values.filter((v) => v.id !== id)); }, [values, onChange]);
  return (
    <div>
      {values.length > 0 && <div className="flex flex-wrap gap-1.5 mb-2">{values.map((v) => <span key={v.id} className="flex items-center gap-1 bg-neutral-100 text-neutral-700 text-xs rounded-full px-2.5 py-1">{v.name}<button type="button" onClick={() => remove(v.id)} className="text-neutral-400 hover:text-neutral-700">✕</button></span>)}</div>}
      <SearchCombo label={label} endpoint={endpoint} value={null} onChange={(v) => v && add(v)} displayFn={displayFn} />
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const displayed = hover ?? value ?? 0;
  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button" onMouseMove={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setHover(e.clientX - rect.left < rect.width / 2 ? s - 0.5 : s); }} onClick={() => { const next = hover ?? null; onChange(next === value ? null : next); }} className="text-xl leading-none">
          <span className={displayed >= s ? "text-neutral-800" : displayed >= s - 0.5 ? "text-neutral-400" : "text-neutral-200"}>★</span>
        </button>
      ))}
      {value && <span className="text-xs text-neutral-400 ml-1 self-center">{value}</span>}
    </div>
  );
}

type CreditRow = { role: string; person: NamedRef | null };
type Ext = Record<string, unknown>;

function CreditsEditor({ credits, set }: { credits: CreditRow[]; set: (v: CreditRow[]) => void }) {
  return (
    <div className="space-y-2">
      {credits.map((c, i) => (
        <div key={i} className="flex items-center gap-2">
          <input className="border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:border-neutral-400 w-40 flex-shrink-0" placeholder="Role" value={c.role} onChange={(e) => { const next = [...credits]; next[i] = { ...c, role: e.target.value }; set(next); }} />
          <div className="flex-1"><SearchCombo label="" endpoint="persons" value={c.person} onChange={(v) => { const next = [...credits]; next[i] = { ...c, person: v }; set(next); }} /></div>
          <button type="button" onClick={() => set(credits.filter((_, j) => j !== i))} className="text-neutral-300 hover:text-red-400 text-xs flex-shrink-0">✕</button>
        </div>
      ))}
      <button type="button" className="text-xs text-neutral-400 hover:text-neutral-700 border border-dashed border-neutral-200 rounded-lg px-3 py-2 w-full" onClick={() => set([...credits, { role: "", person: null }])}>+ Add credit</button>
    </div>
  );
}

function MusicFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return <div className="space-y-4">
    <SearchCombo label="Headliner (person)" endpoint="persons" value={ext.headliner_person as NamedRef | null} onChange={(v) => set("headliner_person", v)} />
    <SearchCombo label="Headliner (ensemble)" endpoint="ensembles" value={ext.headliner_ensemble as NamedRef | null} onChange={(v) => set("headliner_ensemble", v)} />
    <MultiSearchCombo label="Support acts (persons)" endpoint="persons" values={(ext.support_persons as NamedRef[]) ?? []} onChange={(v) => set("support_persons", v)} />
    <MultiSearchCombo label="Support acts (ensembles)" endpoint="ensembles" values={(ext.support_ensembles as NamedRef[]) ?? []} onChange={(v) => set("support_ensembles", v)} />
    <Field label="Tour name"><input className={inputCls} value={(ext.tour_name as string) ?? ""} onChange={(e) => set("tour_name", e.target.value)} /></Field>
  </div>;
}
function ClassicalFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return <div className="space-y-4">
    <SearchCombo label="Ensemble" endpoint="ensembles" value={ext.ensemble as NamedRef | null} onChange={(v) => set("ensemble", v)} />
    <SearchCombo label="Conductor" endpoint="persons" value={ext.conductor as NamedRef | null} onChange={(v) => set("conductor", v)} />
    <Field label="Credits"><CreditsEditor credits={(ext.credits as CreditRow[]) ?? []} set={(v) => set("credits", v)} /></Field>
  </div>;
}
function OperaFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return <div className="space-y-4">
    <SearchCombo label="Work" endpoint="works" value={ext.work as NamedRef | null} onChange={(v) => set("work", v)} displayFn={(i) => (i.title as string) ?? ""} />
    <SearchCombo label="Ensemble" endpoint="ensembles" value={ext.ensemble as NamedRef | null} onChange={(v) => set("ensemble", v)} />
    <SearchCombo label="Conductor" endpoint="persons" value={ext.conductor as NamedRef | null} onChange={(v) => set("conductor", v)} />
    <SearchCombo label="Stage director" endpoint="persons" value={ext.director as NamedRef | null} onChange={(v) => set("director", v)} />
    <SearchCombo label="Production" endpoint="productions" value={ext.production as NamedRef | null} onChange={(v) => set("production", v)} displayFn={(i) => (i.title as string) ?? ""} />
    <Field label="Libretto language"><input className={inputCls} placeholder="e.g. Italian" value={(ext.libretto_language as string) ?? ""} onChange={(e) => set("libretto_language", e.target.value)} /></Field>
    <Field label="Surtitle languages"><input className={inputCls} placeholder="e.g. English, Dutch" value={(ext.surtitles_languages as string) ?? ""} onChange={(e) => set("surtitles_languages", e.target.value)} /></Field>
    <Field label="Credits"><CreditsEditor credits={(ext.credits as CreditRow[]) ?? []} set={(v) => set("credits", v)} /></Field>
  </div>;
}
function BalletFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return <div className="space-y-4">
    <SearchCombo label="Company" endpoint="ensembles" value={ext.company as NamedRef | null} onChange={(v) => set("company", v)} />
    <SearchCombo label="Orchestra" endpoint="ensembles" value={ext.orchestra as NamedRef | null} onChange={(v) => set("orchestra", v)} />
    <SearchCombo label="Conductor" endpoint="persons" value={ext.conductor as NamedRef | null} onChange={(v) => set("conductor", v)} />
    <SearchCombo label="Work (if single)" endpoint="works" value={ext.work as NamedRef | null} onChange={(v) => set("work", v)} displayFn={(i) => (i.title as string) ?? ""} />
    <Field label="Credits"><CreditsEditor credits={(ext.credits as CreditRow[]) ?? []} set={(v) => set("credits", v)} /></Field>
  </div>;
}
function DanceFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return <div className="space-y-4">
    <SearchCombo label="Company" endpoint="ensembles" value={ext.company as NamedRef | null} onChange={(v) => set("company", v)} />
    <SearchCombo label="Choreographer" endpoint="persons" value={ext.choreographer as NamedRef | null} onChange={(v) => set("choreographer", v)} />
    <SearchCombo label="Work" endpoint="works" value={ext.work as NamedRef | null} onChange={(v) => set("work", v)} displayFn={(i) => (i.title as string) ?? ""} />
  </div>;
}
function CircusFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return <div className="space-y-4">
    <SearchCombo label="Company" endpoint="ensembles" value={ext.company as NamedRef | null} onChange={(v) => set("company", v)} />
    <SearchCombo label="Director" endpoint="persons" value={ext.director as NamedRef | null} onChange={(v) => set("director", v)} />
    <SearchCombo label="Work" endpoint="works" value={ext.work as NamedRef | null} onChange={(v) => set("work", v)} displayFn={(i) => (i.title as string) ?? ""} />
  </div>;
}
function TheatreFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return <div className="space-y-4">
    <SearchCombo label="Company" endpoint="ensembles" value={ext.company as NamedRef | null} onChange={(v) => set("company", v)} />
    <SearchCombo label="Director" endpoint="persons" value={ext.director as NamedRef | null} onChange={(v) => set("director", v)} />
    <SearchCombo label="Playwright" endpoint="persons" value={ext.playwright as NamedRef | null} onChange={(v) => set("playwright", v)} />
    <SearchCombo label="Work" endpoint="works" value={ext.work as NamedRef | null} onChange={(v) => set("work", v)} displayFn={(i) => (i.title as string) ?? ""} />
    <SearchCombo label="Production" endpoint="productions" value={ext.production as NamedRef | null} onChange={(v) => set("production", v)} displayFn={(i) => (i.title as string) ?? ""} />
    <Field label="Credits"><CreditsEditor credits={(ext.credits as CreditRow[]) ?? []} set={(v) => set("credits", v)} /></Field>
  </div>;
}
function CabaretFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return <div className="space-y-4">
    <SearchCombo label="Headliner" endpoint="persons" value={ext.headliner as NamedRef | null} onChange={(v) => set("headliner", v)} />
    <SearchCombo label="Host" endpoint="persons" value={ext.host as NamedRef | null} onChange={(v) => set("host", v)} />
    <SearchCombo label="Ensemble" endpoint="ensembles" value={ext.ensemble as NamedRef | null} onChange={(v) => set("ensemble", v)} />
    <MultiSearchCombo label="Supporting cast" endpoint="persons" values={(ext.supporting_cast as NamedRef[]) ?? []} onChange={(v) => set("supporting_cast", v)} />
    <Field label="Tour name"><input className={inputCls} value={(ext.tour_name as string) ?? ""} onChange={(e) => set("tour_name", e.target.value)} /></Field>
  </div>;
}
function ComedyFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return <div className="space-y-4">
    <SearchCombo label="Performer" endpoint="persons" value={ext.performer as NamedRef | null} onChange={(v) => set("performer", v)} />
    <MultiSearchCombo label="Support acts" endpoint="persons" values={(ext.support_acts as NamedRef[]) ?? []} onChange={(v) => set("support_acts", v)} />
    <SearchCombo label="Ensemble" endpoint="ensembles" value={ext.ensemble as NamedRef | null} onChange={(v) => set("ensemble", v)} />
    <Field label="Tour name"><input className={inputCls} value={(ext.tour_name as string) ?? ""} onChange={(e) => set("tour_name", e.target.value)} /></Field>
  </div>;
}
function SpokenWordFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return <div className="space-y-4">
    <MultiSearchCombo label="Performers" endpoint="persons" values={(ext.performers as NamedRef[]) ?? []} onChange={(v) => set("performers", v)} />
    <SearchCombo label="Host" endpoint="persons" value={ext.host as NamedRef | null} onChange={(v) => set("host", v)} />
  </div>;
}
function TalkFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return <div className="space-y-4">
    <MultiSearchCombo label="Speakers" endpoint="persons" values={(ext.speakers as NamedRef[]) ?? []} onChange={(v) => set("speakers", v)} />
    <SearchCombo label="Host" endpoint="persons" value={ext.host as NamedRef | null} onChange={(v) => set("host", v)} />
    <Field label="Topic"><input className={inputCls} value={(ext.topic as string) ?? ""} onChange={(e) => set("topic", e.target.value)} /></Field>
    <Field label="Host organisation"><input className={inputCls} value={(ext.host_organisation as string) ?? ""} onChange={(e) => set("host_organisation", e.target.value)} /></Field>
  </div>;
}
function ExhibitionFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return <div className="space-y-4">
    <Field label="Exhibition title"><input className={inputCls} value={(ext.exhibition_title as string) ?? ""} onChange={(e) => set("exhibition_title", e.target.value)} /></Field>
    <MultiSearchCombo label="Artists" endpoint="persons" values={(ext.artists as NamedRef[]) ?? []} onChange={(v) => set("artists", v)} />
    <Field label="Period"><input className={inputCls} placeholder="e.g. 1880–1920" value={(ext.period as string) ?? ""} onChange={(e) => set("period", e.target.value)} /></Field>
    <Field label="Medium"><input className={inputCls} placeholder="e.g. oil on canvas" value={(ext.medium as string) ?? ""} onChange={(e) => set("medium", e.target.value)} /></Field>
  </div>;
}
function ScreeningFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return <div className="space-y-4">
    <SearchCombo label="Work / Film" endpoint="works" value={ext.work as NamedRef | null} onChange={(v) => set("work", v)} displayFn={(i) => (i.title as string) ?? ""} />
    <SearchCombo label="Director" endpoint="persons" value={ext.director as NamedRef | null} onChange={(v) => set("director", v)} />
    <SearchCombo label="Ensemble" endpoint="ensembles" value={ext.ensemble as NamedRef | null} onChange={(v) => set("ensemble", v)} />
  </div>;
}

const EXTENSION_FIELDS: Record<string, React.ComponentType<{ ext: Ext; set: (k: string, v: unknown) => void }>> = {
  music: MusicFields, classical: ClassicalFields, opera: OperaFields, ballet: BalletFields,
  dance: DanceFields, circus: CircusFields, theatre: TheatreFields, cabaret: CabaretFields,
  comedy: ComedyFields, spoken_word: SpokenWordFields, talk: TalkFields,
  exhibition: ExhibitionFields, screening: ScreeningFields,
};

function buildPayload(type: string, base: Record<string, unknown>, ext: Ext): Record<string, unknown> {
  const id = (v: NamedRef | null | undefined) => v?.id ?? null;
  const ids = (arr: NamedRef[] | undefined) => arr?.map((v) => v.id) ?? [];
  const payload: Record<string, unknown> = {
    venue_id: (base.venue as NamedRef | null)?.id, title: base.title, date: base.date, time: base.time || null,
    price_paid: base.price_paid || null, currency: base.currency || "EUR",
    festival_id: (base.festival as NamedRef | null)?.id ?? null,
    payment_method_id: (base.payment_method as PaymentMethod | null)?.id ?? null,
    notes: base.notes || null, rating: base.rating ?? null, rating_context: base.rating_context || null,
    review: base.review || null, data_completeness: base.data_completeness || null,
    full_description: base.full_description || null, ai_summary: base.ai_summary || null,
    description_source_url: base.description_source_url || null, subtype: base.subtype || null,
    links: (base.links as LinkRow[] | undefined)?.filter((l) => l.url).map((l) => ({ url: l.url, ...(l.label ? { label: l.label } : {}), ...(l.description ? { description: l.description } : {}) })) ?? null,
  };
  const creditsPayload = (ext.credits as CreditRow[] | undefined)?.filter((c) => c.role && c.person).map((c, i) => ({ role: c.role, person_id: c.person!.id, sort_order: i })) ?? null;
  if (type === "music") Object.assign(payload, { headliner_person_id: id(ext.headliner_person as NamedRef), headliner_ensemble_id: id(ext.headliner_ensemble as NamedRef), support_act_person_ids: ids(ext.support_persons as NamedRef[]), support_act_ensemble_ids: ids(ext.support_ensembles as NamedRef[]), tour_name: ext.tour_name || null });
  else if (type === "classical") Object.assign(payload, { ensemble_id: id(ext.ensemble as NamedRef), conductor_id: id(ext.conductor as NamedRef), credits: creditsPayload });
  else if (type === "opera") { const surtitles = (ext.surtitles_languages as string) ? (ext.surtitles_languages as string).split(",").map((s) => s.trim()).filter(Boolean) : null; Object.assign(payload, { work_id: id(ext.work as NamedRef), ensemble_id: id(ext.ensemble as NamedRef), conductor_id: id(ext.conductor as NamedRef), director_id: id(ext.director as NamedRef), production_id: id(ext.production as NamedRef), libretto_language: ext.libretto_language || null, surtitles_languages: surtitles, credits: creditsPayload }); }
  else if (type === "ballet") Object.assign(payload, { company_id: id(ext.company as NamedRef), orchestra_id: id(ext.orchestra as NamedRef), conductor_id: id(ext.conductor as NamedRef), work_id: id(ext.work as NamedRef), credits: creditsPayload });
  else if (type === "dance") Object.assign(payload, { company_id: id(ext.company as NamedRef), choreographer_id: id(ext.choreographer as NamedRef), work_id: id(ext.work as NamedRef) });
  else if (type === "circus") Object.assign(payload, { company_id: id(ext.company as NamedRef), director_id: id(ext.director as NamedRef), work_id: id(ext.work as NamedRef) });
  else if (type === "theatre") Object.assign(payload, { company_id: id(ext.company as NamedRef), director_id: id(ext.director as NamedRef), playwright_id: id(ext.playwright as NamedRef), work_id: id(ext.work as NamedRef), production_id: id(ext.production as NamedRef), credits: creditsPayload });
  else if (type === "cabaret") Object.assign(payload, { headliner_id: id(ext.headliner as NamedRef), host_id: id(ext.host as NamedRef), ensemble_id: id(ext.ensemble as NamedRef), supporting_cast: ids(ext.supporting_cast as NamedRef[]), tour_name: ext.tour_name || null });
  else if (type === "comedy") Object.assign(payload, { performer_id: id(ext.performer as NamedRef), support_acts: ids(ext.support_acts as NamedRef[]), ensemble_id: id(ext.ensemble as NamedRef), tour_name: ext.tour_name || null });
  else if (type === "spoken_word") Object.assign(payload, { performers: ids(ext.performers as NamedRef[]), host_id: id(ext.host as NamedRef) });
  else if (type === "talk") Object.assign(payload, { speaker_ids: ids(ext.speakers as NamedRef[]), host_id: id(ext.host as NamedRef), topic: ext.topic || null, host_organisation: ext.host_organisation || null });
  else if (type === "exhibition") Object.assign(payload, { exhibition_title: ext.exhibition_title || null, artists: ids(ext.artists as NamedRef[]), period: ext.period || null, medium: ext.medium || null });
  else if (type === "screening") Object.assign(payload, { work_id: id(ext.work as NamedRef), director_id: id(ext.director as NamedRef), ensemble_id: id(ext.ensemble as NamedRef) });
  return payload;
}

function initFromEvent(event: EventDetail): { base: Record<string, unknown>; ext: Ext } {
  const e = event.extension ?? {};
  const ref = (v: unknown): NamedRef | null => { if (!v || typeof v !== "object") return null; const r = v as Record<string, unknown>; const name = r.name ?? r.title; return r.id && name ? { id: String(r.id), name: String(name) } : null; };
  const refs = (arr: unknown): NamedRef[] => { if (!Array.isArray(arr)) return []; return arr.map(ref).filter(Boolean) as NamedRef[]; };
  const base: Record<string, unknown> = {
    title: event.title, date: String(event.date), time: event.time ? String(event.time).slice(0, 5) : "",
    venue: event.venue, subtype: event.subtype ?? "", price_paid: event.price_paid ? String(event.price_paid) : "",
    currency: event.currency ?? "EUR", festival: event.festival ?? null, payment_method: event.payment_method ?? null,
    rating: event.rating ?? null, rating_context: event.rating_context ?? "", review: event.review ?? "",
    notes: event.notes ?? "", data_completeness: event.data_completeness ?? "",
    full_description: event.full_description ?? "", ai_summary: event.ai_summary ?? "",
    description_source_url: event.description_source_url ?? "",
    links: (event.links ?? []).map((l: Record<string, string>) => ({ url: l.url ?? "", label: l.label ?? "", description: l.description ?? "" })),
  };
  const ext: Ext = {
    headliner_person: ref(e.headliner), headliner_ensemble: ref(e.headliner_ensemble),
    support_persons: refs(e.support_acts), tour_name: e.tour_name ?? "",
    ensemble: ref(e.ensemble), conductor: ref(e.conductor), work: ref(e.work),
    director: ref(e.director), production: ref(e.production), composers: refs(e.composers),
    libretto_language: e.libretto_language ?? "", surtitles_languages: Array.isArray(e.surtitles_languages) ? (e.surtitles_languages as string[]).join(", ") : "",
    cast: e.cast ?? {}, setlist_fm_url: e.setlist_fm_url ?? "", setlist: Array.isArray(e.setlist) ? e.setlist : [],
    credits: Array.isArray(e.credits) ? (e.credits as Array<{ role: string; person: { id: string; name: string } }>).map((c) => ({ role: c.role, person: c.person ?? null })) : [],
    company: ref(e.company), orchestra: ref(e.orchestra), choreographer: ref(e.choreographer),
    headliner: ref(e.headliner), host: ref(e.host), supporting_cast: refs(e.supporting_cast),
    performer: ref(e.performer), support_acts: refs(e.support_acts), performers: refs(e.performers),
    playwright: ref(e.playwright), speakers: refs(e.speakers), topic: e.topic ?? "", host_organisation: e.host_organisation ?? "",
    exhibition_title: e.exhibition_title ?? "", artists: refs(e.artists), period: e.period ?? "", medium: e.medium ?? "",
  };
  return { base, ext };
}

export default function AddEvent({ initialEvent }: { initialEvent?: EventDetail }) {
  const router = useRouter();
  const editMode = !!initialEvent;
  const init = initialEvent ? initFromEvent(initialEvent) : null;
  const [step, setStep] = useState<Step>(editMode ? "basic" : "import");
  const [type, setType] = useState<EventType | null>(editMode ? initialEvent!.type as EventType : null);
  const [base, setBase] = useState<Record<string, unknown>>(init?.base ?? { date: new Date().toISOString().slice(0, 10), currency: "EUR" });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showNewPM, setShowNewPM] = useState(false);
  const [newPM, setNewPM] = useState({ name: "", total_cost: "", currency: "EUR", purchase_date: new Date().toISOString().slice(0, 10), notes: "" });
  const [ext, setExt] = useState<Ext>(init?.ext ?? {});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchPaymentMethods().then(setPaymentMethods).catch(() => {}); }, []);

  function setBaseField(k: string, v: unknown) { setBase((b) => ({ ...b, [k]: v })); }
  function setExtField(k: string, v: unknown) { setExt((e) => ({ ...e, [k]: v })); }
  function canProceedBasic() { return base.title && base.date && base.venue; }

  async function handleSubmit() {
    if (!type) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = buildPayload(type, base, ext);
      let eventId: string;
      if (editMode && initialEvent) {
        await updateEvent(initialEvent.id as unknown as string, payload);
        eventId = initialEvent.id as unknown as string;
      } else {
        const result = await createEvent(type, payload);
        eventId = result.id;
      }
      router.push(`/?event=${eventId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  const ExtFields = type ? EXTENSION_FIELDS[type] : null;
  const steps = editMode ? (["basic", "details", "take"] as Step[]).filter((s) => s !== "details" || !!ExtFields) : (["type", "basic", "details", "take"] as Step[]);

  return (
    <div className="max-w-lg mx-auto">
      {editMode && <div className="mb-6"><a href="/" className="text-xs text-neutral-400 hover:text-neutral-700">← Back</a><h1 className="font-serif text-2xl text-neutral-900 mt-2">Edit event</h1><p className="text-sm text-neutral-400 mt-1">{TYPE_LABELS[type!]} · {String(base.date)}</p></div>}

      {step !== "import" && (
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="w-6 h-px bg-neutral-200" />}
              <button type="button" onClick={() => { if (s === "type" || (s === "basic" && type) || (s === "details" && type && canProceedBasic()) || (s === "take" && type && canProceedBasic())) setStep(s); }} className={`text-[10px] uppercase tracking-widest ${step === s ? "text-neutral-900" : "text-neutral-300"}`}>
                {s === "type" ? "Type" : s === "basic" ? "Info" : s === "details" ? "Details" : "Your take"}
              </button>
            </div>
          ))}
        </div>
      )}

      {step === "import" && !editMode && (
        <div>
          <h2 className="font-serif text-xl text-neutral-900 mb-1">Add an event</h2>
          <p className="text-sm text-neutral-400 mb-6">Enter manually, or import from a URL (coming soon).</p>
          <button type="button" onClick={() => setStep("type")} className="w-full py-3 text-sm bg-neutral-900 text-white rounded-xl hover:bg-neutral-700 transition-colors">Enter manually</button>
        </div>
      )}

      {step === "type" && !editMode && (
        <div>
          <h2 className="font-serif text-xl text-neutral-900 mb-6">What kind of event?</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {EVENT_TYPES.map((t) => (
              <button key={t} type="button" onClick={() => { setType(t); setStep("basic"); }} className={`flex flex-col items-center gap-2 border rounded-xl py-4 px-2 transition-colors hover:border-neutral-400 ${type === t ? "border-neutral-800 bg-neutral-50" : "border-neutral-100"}`}>
                <span className="text-neutral-500"><EventTypeIcon type={t} size={20} /></span>
                <span className="text-[11px] text-neutral-600 text-center leading-tight">{TYPE_LABELS[t]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "basic" && (
        <div>
          <h2 className="font-serif text-xl text-neutral-900 mb-6">{!editMode && <button type="button" onClick={() => setStep("type")} className="text-neutral-300 mr-2 hover:text-neutral-600">←</button>}Basic info</h2>
          <div className="space-y-5">
            <Field label="Title" required><input className={inputCls} value={(base.title as string) ?? ""} onChange={(e) => setBaseField("title", e.target.value)} autoFocus autoCapitalize="none" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date" required><input type="date" className={inputCls} value={(base.date as string) ?? ""} onChange={(e) => setBaseField("date", e.target.value)} /></Field>
              <Field label="Time"><input type="time" className={inputCls} value={(base.time as string) ?? ""} onChange={(e) => setBaseField("time", e.target.value)} /></Field>
            </div>
            <SearchCombo label="Venue" endpoint="venues" value={base.venue as NamedRef | null} onChange={(v) => setBaseField("venue", v)} optional={false} displayFn={(i) => i.parent_name ? `${String(i.name)} — ${String(i.parent_name)}` : String(i.name)} />
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><Field label="Price paid"><input type="number" step="0.01" className={inputCls} value={(base.price_paid as string) ?? ""} onChange={(e) => setBaseField("price_paid", e.target.value)} placeholder="0.00" /></Field></div>
              <Field label="Currency"><select className={inputCls} value={(base.currency as string) ?? "EUR"} onChange={(e) => setBaseField("currency", e.target.value)}>{["EUR", "GBP", "USD"].map((c) => <option key={c}>{c}</option>)}</select></Field>
            </div>
            <SearchCombo label="Festival (optional)" endpoint="festivals" value={base.festival as NamedRef | null} onChange={(v) => setBaseField("festival", v)} displayFn={(i) => [i.name, i.edition].filter(Boolean).join(" ")} />
            {SUBTYPES[type!] && (
              <Field label="Subtype">
                <input className={inputCls} list={`subtypes-${type}`} value={(base.subtype as string) ?? ""} onChange={(e) => setBaseField("subtype", e.target.value)} placeholder="select or type a subtype" />
                <datalist id={`subtypes-${type}`}>{SUBTYPES[type!].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</datalist>
              </Field>
            )}
            {type === "other" && <Field label="Subtype" required><input className={inputCls} value={(base.subtype as string) ?? ""} onChange={(e) => setBaseField("subtype", e.target.value)} placeholder="describe the event type" /></Field>}
            <div className="flex justify-end pt-2">
              <button type="button" disabled={!canProceedBasic()} onClick={() => setStep(ExtFields ? "details" : "take")} className="bg-neutral-900 text-white text-sm rounded-lg px-6 py-2.5 hover:bg-neutral-700 transition-colors disabled:opacity-40">Next →</button>
            </div>
          </div>
        </div>
      )}

      {step === "details" && ExtFields && (
        <div>
          <h2 className="font-serif text-xl text-neutral-900 mb-6"><button type="button" onClick={() => setStep("basic")} className="text-neutral-300 mr-2 hover:text-neutral-600">←</button>{TYPE_LABELS[type!]} details</h2>
          <ExtFields ext={ext} set={setExtField} />
          <div className="flex justify-end pt-6"><button type="button" onClick={() => setStep("take")} className="bg-neutral-900 text-white text-sm rounded-lg px-6 py-2.5 hover:bg-neutral-700 transition-colors">Next →</button></div>
        </div>
      )}

      {step === "take" && (
        <div>
          <h2 className="font-serif text-xl text-neutral-900 mb-6"><button type="button" onClick={() => setStep(ExtFields ? "details" : "basic")} className="text-neutral-300 mr-2 hover:text-neutral-600">←</button>Your take <span className="text-neutral-300 font-sans text-sm">(optional)</span></h2>
          <div className="space-y-5">
            <Field label="Rating"><StarPicker value={base.rating as number | null} onChange={(v) => setBaseField("rating", v)} /></Field>
            <Field label="Rating context">
              <select className={inputCls} value={(base.rating_context as string) ?? ""} onChange={(e) => setBaseField("rating_context", e.target.value || null)}>
                <option value="">— select —</option>
                {[["arena", "Arena (10,000+)"], ["theatre", "Theatre (400–10,000)"], ["studio", "Studio (100–400)"], ["intimate", "Intimate (under 100)"], ["outdoor", "Outdoor"], ["gallery", "Gallery / Exhibition"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Payment method">
              <select className={inputCls} value={(base.payment_method as PaymentMethod | null)?.id ?? ""} onChange={(e) => { const pm = paymentMethods.find((p) => p.id === e.target.value) ?? null; setBaseField("payment_method", pm); setShowNewPM(false); }}>
                <option value="">— none —</option>
                {paymentMethods.map((pm) => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
              </select>
              <button type="button" className="text-xs text-neutral-400 hover:text-neutral-700 mt-1.5" onClick={() => setShowNewPM((v) => !v)}>{showNewPM ? "Cancel" : "+ New payment method"}</button>
              {showNewPM && (
                <div className="mt-2 p-3 border border-neutral-100 rounded-lg space-y-2">
                  <input className={inputCls} placeholder="Name (e.g. Museumkaart 2026)" value={newPM.name} onChange={(e) => setNewPM((v) => ({ ...v, name: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputCls} type="number" step="0.01" placeholder="Total cost" value={newPM.total_cost} onChange={(e) => setNewPM((v) => ({ ...v, total_cost: e.target.value }))} />
                    <select className={inputCls} value={newPM.currency} onChange={(e) => setNewPM((v) => ({ ...v, currency: e.target.value }))}>{["EUR", "GBP", "USD"].map((c) => <option key={c}>{c}</option>)}</select>
                  </div>
                  <input className={inputCls} type="date" value={newPM.purchase_date} onChange={(e) => setNewPM((v) => ({ ...v, purchase_date: e.target.value }))} />
                  <input className={inputCls} placeholder="Notes (optional)" value={newPM.notes} onChange={(e) => setNewPM((v) => ({ ...v, notes: e.target.value }))} />
                  <button type="button" className="w-full text-xs bg-neutral-900 text-white rounded-lg py-2 hover:bg-neutral-700 transition-colors" onClick={async () => { try { const pm = await createPaymentMethod({ ...newPM, total_cost: parseFloat(newPM.total_cost) || 0, notes: newPM.notes || undefined }); setPaymentMethods((prev) => [pm, ...prev]); setBaseField("payment_method", pm); setShowNewPM(false); setNewPM({ name: "", total_cost: "", currency: "EUR", purchase_date: new Date().toISOString().slice(0, 10), notes: "" }); } catch { setError("Failed to create payment method"); } }}>Save payment method</button>
                </div>
              )}
            </Field>
            <Field label="Review"><textarea rows={4} className={`${inputCls} resize-none font-serif leading-relaxed`} value={(base.review as string) ?? ""} onChange={(e) => setBaseField("review", e.target.value)} placeholder="Your thoughts…" /></Field>
            <Field label="Description source URL"><input className={inputCls} type="url" value={(base.description_source_url as string) ?? ""} onChange={(e) => setBaseField("description_source_url", e.target.value)} placeholder="https://venue.com/show-page" /></Field>
            <Field label="Description (verbatim from source)">
              <textarea rows={5} className={`${inputCls} resize-none leading-relaxed`} value={(base.full_description as string) ?? ""} onChange={(e) => setBaseField("full_description", e.target.value)} placeholder="Paste the description from the venue website…" />
              {(base.full_description as string) && <button type="button" className="mt-1.5 text-[10px] text-neutral-400 hover:text-neutral-700 border border-dashed border-neutral-200 rounded px-2 py-1" onClick={() => { const prompt = `Summarise this arts event description in 2–3 sentences for a personal cultural diary. Focus on what makes it distinctive — the artistic form, the creative concept, key performers or companies, and anything unusual or worth knowing. Write in plain prose. Don't start with "This". Don't repeat the title.\n\n${base.full_description as string}`; navigator.clipboard.writeText(prompt); }}>Copy summarise prompt →</button>}
            </Field>
            <Field label="AI summary"><textarea rows={3} className={`${inputCls} resize-none leading-relaxed`} value={(base.ai_summary as string) ?? ""} onChange={(e) => setBaseField("ai_summary", e.target.value)} placeholder="Paste the generated summary here…" /></Field>
            <Field label="Links">
              {((base.links as LinkRow[]) ?? []).map((link, i) => (
                <div key={i} className="space-y-1.5 mb-3 p-3 border border-neutral-100 rounded-lg">
                  <input className={inputCls} placeholder="URL" value={link.url} onChange={(e) => { const links = [...((base.links as LinkRow[]) ?? [])]; links[i] = { ...links[i], url: e.target.value }; setBaseField("links", links); }} />
                  <input className={inputCls} placeholder="Label" value={link.label} onChange={(e) => { const links = [...((base.links as LinkRow[]) ?? [])]; links[i] = { ...links[i], label: e.target.value }; setBaseField("links", links); }} />
                  <button type="button" onClick={() => setBaseField("links", ((base.links as LinkRow[]) ?? []).filter((_, j) => j !== i))} className="text-[11px] text-neutral-400 hover:text-red-400">Remove</button>
                </div>
              ))}
              <button type="button" onClick={() => setBaseField("links", [...((base.links as LinkRow[]) ?? []), { url: "", label: "", description: "" }])} className="text-xs text-neutral-400 hover:text-neutral-700 border border-dashed border-neutral-200 rounded-lg px-3 py-2 w-full">+ Add link</button>
            </Field>
            <Field label="Admin notes"><textarea rows={2} className={`${inputCls} resize-none`} value={(base.notes as string) ?? ""} onChange={(e) => setBaseField("notes", e.target.value)} placeholder="Ticket info, booking notes, etc." /></Field>
            <Field label="Data completeness">
              <div className="flex gap-2">{["complete", "partial", "stub"].map((s) => <button key={s} type="button" onClick={() => setBaseField("data_completeness", s)} className={`flex-1 text-xs py-2 rounded-lg border transition-colors capitalize ${base.data_completeness === s ? "border-neutral-800 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:border-neutral-400"}`}>{s}</button>)}</div>
            </Field>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex justify-end pt-2">
              <button type="button" disabled={submitting} onClick={handleSubmit} className="bg-neutral-900 text-white text-sm rounded-lg px-8 py-2.5 hover:bg-neutral-700 transition-colors disabled:opacity-40">{submitting ? "Saving…" : editMode ? "Save changes" : "Save event"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
