import { useState, useEffect, useRef, useCallback } from "react";
import { createEvent, searchEntities } from "../lib/api";
import { url } from "../lib/base";
import EventTypeIcon from "./EventTypeIcon";

// ── Types ────────────────────────────────────────────────────────────────────

type NamedRef = { id: string; name: string };
type Step = "type" | "basic" | "details" | "take";

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

// Subtypes per event type
const SUBTYPES: Record<string, string[]> = {
  music: ["gig", "open_mic", "residency", "other"],
  classical: ["orchestral", "chamber", "choral", "recital", "contemporary", "other"],
  opera: ["opera", "operetta", "musical_theatre", "other"],
  ballet: ["full_length", "mixed_bill", "contemporary", "other"],
  dance: ["contemporary", "flamenco", "folk", "ballroom", "other"],
  circus: ["contemporary_circus", "traditional", "physical_theatre", "aerial", "street", "other"],
  theatre: ["play", "musical", "improv", "improv_musical", "panto", "physical_theatre", "puppet", "other"],
  cabaret: ["burlesque", "drag", "cabaret", "variety", "other"],
  comedy: ["standup", "sketch", "double_act", "panel", "character", "musical_comedy", "other"],
  spoken_word: ["reading", "slam", "spoken_word", "storytelling", "other"],
  talk: ["lecture", "panel", "debate", "podcast_recording", "book_event", "science_comm", "interview", "other"],
  exhibition: ["art", "natural_history", "science", "photography", "sculpture", "design", "historical", "other"],
  screening: ["film", "live_broadcast", "archive_screening", "live_score", "documentary", "other"],
};

// ── Searchable combobox ───────────────────────────────────────────────────────

function SearchCombo({
  label, endpoint, value, onChange, optional = true, displayFn,
}: {
  label: string;
  endpoint: string;
  value: NamedRef | null;
  onChange: (v: NamedRef | null) => void;
  optional?: boolean;
  displayFn?: (item: Record<string, unknown>) => string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NamedRef[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const items = await searchEntities(endpoint, query);
      setResults(items.map((i) => ({
        id: i.id,
        name: displayFn ? displayFn(i as Record<string, unknown>) : (i.name ?? i.title ?? String(i.id)),
      })));
      setOpen(true);
    }, 280);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, endpoint]);

  if (value) {
    return (
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5">{label}{!optional && <span className="text-red-400 ml-0.5">*</span>}</label>
        <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
          <span className="text-sm text-neutral-800 flex-1">{value.name}</span>
          <button onClick={() => onChange(null)} className="text-neutral-300 hover:text-neutral-600 text-xs">✕</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref}>
      <label className="block text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5">{label}{!optional && <span className="text-red-400 ml-0.5">*</span>}</label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${label.toLowerCase()}…`}
          className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:border-neutral-400"
        />
        {open && results.length > 0 && (
          <div className="absolute z-20 top-full mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onMouseDown={() => { onChange(r); setQuery(""); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 border-b border-neutral-50 last:border-0"
              >
                {r.name}
              </button>
            ))}
          </div>
        )}
        {open && query.length >= 2 && results.length === 0 && (
          <div className="absolute z-20 top-full mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-sm px-3 py-2 text-xs text-neutral-400">
            No results
          </div>
        )}
      </div>
    </div>
  );
}

function MultiSearchCombo({
  label, endpoint, values, onChange, displayFn,
}: {
  label: string;
  endpoint: string;
  values: NamedRef[];
  onChange: (v: NamedRef[]) => void;
  displayFn?: (item: Record<string, unknown>) => string;
}) {
  const add = useCallback((v: NamedRef) => {
    if (!values.find((x) => x.id === v.id)) onChange([...values, v]);
  }, [values, onChange]);

  const remove = useCallback((id: string) => {
    onChange(values.filter((v) => v.id !== id));
  }, [values, onChange]);

  return (
    <div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {values.map((v) => (
            <span key={v.id} className="flex items-center gap-1 bg-neutral-100 text-neutral-700 text-xs rounded-full px-2.5 py-1">
              {v.name}
              <button type="button" onClick={() => remove(v.id)} className="text-neutral-400 hover:text-neutral-700">✕</button>
            </span>
          ))}
        </div>
      )}
      <SearchCombo label={label} endpoint={endpoint} value={null} onChange={(v) => v && add(v)} displayFn={displayFn} />
    </div>
  );
}

// ── Star rating ───────────────────────────────────────────────────────────────

function StarPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const displayed = hover ?? value ?? 0;
  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setHover(e.clientX - rect.left < rect.width / 2 ? s - 0.5 : s);
          }}
          onClick={() => {
            const next = hover ?? null;
            onChange(next === value ? null : next);
          }}
          className="text-xl leading-none"
        >
          <span className={displayed >= s ? "text-neutral-800" : displayed >= s - 0.5 ? "text-neutral-400" : "text-neutral-200"}>★</span>
        </button>
      ))}
      {value && <span className="text-xs text-neutral-400 ml-1 self-center">{value}</span>}
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:border-neutral-400";

// ── Extension fields per type ─────────────────────────────────────────────────

type Ext = Record<string, unknown>;

function MusicFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SearchCombo label="Headliner (person)" endpoint="persons" value={ext.headliner_person as NamedRef | null} onChange={(v) => set("headliner_person", v)} />
      <SearchCombo label="Headliner (ensemble)" endpoint="ensembles" value={ext.headliner_ensemble as NamedRef | null} onChange={(v) => set("headliner_ensemble", v)} />
      <MultiSearchCombo label="Support acts (persons)" endpoint="persons" values={(ext.support_persons as NamedRef[]) ?? []} onChange={(v) => set("support_persons", v)} />
      <MultiSearchCombo label="Support acts (ensembles)" endpoint="ensembles" values={(ext.support_ensembles as NamedRef[]) ?? []} onChange={(v) => set("support_ensembles", v)} />
      <Field label="Tour name"><input className={inputCls} value={(ext.tour_name as string) ?? ""} onChange={(e) => set("tour_name", e.target.value)} /></Field>
    </div>
  );
}

function ClassicalFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SearchCombo label="Ensemble" endpoint="ensembles" value={ext.ensemble as NamedRef | null} onChange={(v) => set("ensemble", v)} />
      <SearchCombo label="Conductor" endpoint="persons" value={ext.conductor as NamedRef | null} onChange={(v) => set("conductor", v)} />
    </div>
  );
}

function OperaFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SearchCombo label="Work" endpoint="works" value={ext.work as NamedRef | null} onChange={(v) => set("work", v)} displayFn={(i) => (i.title as string) ?? ""} />
      <SearchCombo label="Ensemble" endpoint="ensembles" value={ext.ensemble as NamedRef | null} onChange={(v) => set("ensemble", v)} />
      <SearchCombo label="Conductor" endpoint="persons" value={ext.conductor as NamedRef | null} onChange={(v) => set("conductor", v)} />
      <SearchCombo label="Stage director" endpoint="persons" value={ext.director as NamedRef | null} onChange={(v) => set("director", v)} />
      <SearchCombo label="Production" endpoint="productions" value={ext.production as NamedRef | null} onChange={(v) => set("production", v)} displayFn={(i) => (i.title as string) ?? ""} />
      <MultiSearchCombo label="Composers" endpoint="persons" values={(ext.composers as NamedRef[]) ?? []} onChange={(v) => set("composers", v)} />
    </div>
  );
}

function BalletFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SearchCombo label="Company" endpoint="ensembles" value={ext.company as NamedRef | null} onChange={(v) => set("company", v)} />
      <SearchCombo label="Orchestra" endpoint="ensembles" value={ext.orchestra as NamedRef | null} onChange={(v) => set("orchestra", v)} />
      <SearchCombo label="Conductor" endpoint="persons" value={ext.conductor as NamedRef | null} onChange={(v) => set("conductor", v)} />
      <SearchCombo label="Work (if single)" endpoint="works" value={ext.work as NamedRef | null} onChange={(v) => set("work", v)} displayFn={(i) => (i.title as string) ?? ""} />
    </div>
  );
}

function DanceFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SearchCombo label="Company" endpoint="ensembles" value={ext.company as NamedRef | null} onChange={(v) => set("company", v)} />
      <SearchCombo label="Choreographer" endpoint="persons" value={ext.choreographer as NamedRef | null} onChange={(v) => set("choreographer", v)} />
      <SearchCombo label="Work" endpoint="works" value={ext.work as NamedRef | null} onChange={(v) => set("work", v)} displayFn={(i) => (i.title as string) ?? ""} />
    </div>
  );
}

function CircusFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SearchCombo label="Company" endpoint="ensembles" value={ext.company as NamedRef | null} onChange={(v) => set("company", v)} />
      <SearchCombo label="Director" endpoint="persons" value={ext.director as NamedRef | null} onChange={(v) => set("director", v)} />
      <SearchCombo label="Work" endpoint="works" value={ext.work as NamedRef | null} onChange={(v) => set("work", v)} displayFn={(i) => (i.title as string) ?? ""} />
    </div>
  );
}

function TheatreFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SearchCombo label="Company" endpoint="ensembles" value={ext.company as NamedRef | null} onChange={(v) => set("company", v)} />
      <SearchCombo label="Director" endpoint="persons" value={ext.director as NamedRef | null} onChange={(v) => set("director", v)} />
      <SearchCombo label="Playwright" endpoint="persons" value={ext.playwright as NamedRef | null} onChange={(v) => set("playwright", v)} />
      <SearchCombo label="Work" endpoint="works" value={ext.work as NamedRef | null} onChange={(v) => set("work", v)} displayFn={(i) => (i.title as string) ?? ""} />
      <SearchCombo label="Production" endpoint="productions" value={ext.production as NamedRef | null} onChange={(v) => set("production", v)} displayFn={(i) => (i.title as string) ?? ""} />
    </div>
  );
}

function CabaretFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SearchCombo label="Headliner" endpoint="persons" value={ext.headliner as NamedRef | null} onChange={(v) => set("headliner", v)} />
      <SearchCombo label="Host" endpoint="persons" value={ext.host as NamedRef | null} onChange={(v) => set("host", v)} />
      <SearchCombo label="Ensemble" endpoint="ensembles" value={ext.ensemble as NamedRef | null} onChange={(v) => set("ensemble", v)} />
      <MultiSearchCombo label="Supporting cast" endpoint="persons" values={(ext.supporting_cast as NamedRef[]) ?? []} onChange={(v) => set("supporting_cast", v)} />
      <Field label="Tour name"><input className={inputCls} value={(ext.tour_name as string) ?? ""} onChange={(e) => set("tour_name", e.target.value)} /></Field>
    </div>
  );
}

function ComedyFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SearchCombo label="Performer" endpoint="persons" value={ext.performer as NamedRef | null} onChange={(v) => set("performer", v)} />
      <MultiSearchCombo label="Support acts" endpoint="persons" values={(ext.support_acts as NamedRef[]) ?? []} onChange={(v) => set("support_acts", v)} />
      <SearchCombo label="Ensemble" endpoint="ensembles" value={ext.ensemble as NamedRef | null} onChange={(v) => set("ensemble", v)} />
      <Field label="Tour name"><input className={inputCls} value={(ext.tour_name as string) ?? ""} onChange={(e) => set("tour_name", e.target.value)} /></Field>
    </div>
  );
}

function SpokenWordFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <MultiSearchCombo label="Performers" endpoint="persons" values={(ext.performers as NamedRef[]) ?? []} onChange={(v) => set("performers", v)} />
      <SearchCombo label="Host" endpoint="persons" value={ext.host as NamedRef | null} onChange={(v) => set("host", v)} />
    </div>
  );
}

function TalkFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <MultiSearchCombo label="Speakers" endpoint="persons" values={(ext.speakers as NamedRef[]) ?? []} onChange={(v) => set("speakers", v)} />
      <SearchCombo label="Host" endpoint="persons" value={ext.host as NamedRef | null} onChange={(v) => set("host", v)} />
      <Field label="Topic"><input className={inputCls} value={(ext.topic as string) ?? ""} onChange={(e) => set("topic", e.target.value)} /></Field>
      <Field label="Host organisation"><input className={inputCls} value={(ext.host_organisation as string) ?? ""} onChange={(e) => set("host_organisation", e.target.value)} /></Field>
    </div>
  );
}

function ExhibitionFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Exhibition title"><input className={inputCls} value={(ext.exhibition_title as string) ?? ""} onChange={(e) => set("exhibition_title", e.target.value)} /></Field>
      <MultiSearchCombo label="Artists" endpoint="persons" values={(ext.artists as NamedRef[]) ?? []} onChange={(v) => set("artists", v)} />
      <Field label="Period"><input className={inputCls} placeholder="e.g. 1880–1920" value={(ext.period as string) ?? ""} onChange={(e) => set("period", e.target.value)} /></Field>
      <Field label="Medium"><input className={inputCls} placeholder="e.g. oil on canvas" value={(ext.medium as string) ?? ""} onChange={(e) => set("medium", e.target.value)} /></Field>
    </div>
  );
}

function ScreeningFields({ ext, set }: { ext: Ext; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SearchCombo label="Work / Film" endpoint="works" value={ext.work as NamedRef | null} onChange={(v) => set("work", v)} displayFn={(i) => (i.title as string) ?? ""} />
      <SearchCombo label="Director" endpoint="persons" value={ext.director as NamedRef | null} onChange={(v) => set("director", v)} />
      <SearchCombo label="Ensemble" endpoint="ensembles" value={ext.ensemble as NamedRef | null} onChange={(v) => set("ensemble", v)} />
    </div>
  );
}

const EXTENSION_FIELDS: Record<string, React.ComponentType<{ ext: Ext; set: (k: string, v: unknown) => void }>> = {
  music: MusicFields, classical: ClassicalFields, opera: OperaFields,
  ballet: BalletFields, dance: DanceFields, circus: CircusFields,
  theatre: TheatreFields, cabaret: CabaretFields, comedy: ComedyFields,
  spoken_word: SpokenWordFields, talk: TalkFields, exhibition: ExhibitionFields,
  screening: ScreeningFields,
};

// ── Build API payload from form state ────────────────────────────────────────

function buildPayload(type: string, base: Record<string, unknown>, ext: Ext): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    venue_id: (base.venue as NamedRef | null)?.id,
    title: base.title,
    date: base.date,
    time: base.time || null,
    price_paid: base.price_paid || null,
    currency: base.currency || "EUR",
    festival_id: (base.festival as NamedRef | null)?.id ?? null,
    status: base.status ?? "attended",
    notes: base.notes || null,
    rating: base.rating ?? null,
    review: base.review || null,
    data_completeness: base.data_completeness || null,
    subtype: base.subtype || null,
  };

  const id = (v: NamedRef | null | undefined) => v?.id ?? null;
  const ids = (arr: NamedRef[] | undefined) => arr?.map((v) => v.id) ?? [];

  if (type === "music") {
    Object.assign(payload, {
      headliner_person_id: id(ext.headliner_person as NamedRef),
      headliner_ensemble_id: id(ext.headliner_ensemble as NamedRef),
      support_act_person_ids: ids(ext.support_persons as NamedRef[]),
      support_act_ensemble_ids: ids(ext.support_ensembles as NamedRef[]),
      tour_name: ext.tour_name || null,
    });
  } else if (type === "classical") {
    Object.assign(payload, {
      ensemble_id: id(ext.ensemble as NamedRef),
      conductor_id: id(ext.conductor as NamedRef),
    });
  } else if (type === "opera") {
    Object.assign(payload, {
      work_id: id(ext.work as NamedRef),
      ensemble_id: id(ext.ensemble as NamedRef),
      conductor_id: id(ext.conductor as NamedRef),
      director_id: id(ext.director as NamedRef),
      production_id: id(ext.production as NamedRef),
      composers: ids(ext.composers as NamedRef[]),
    });
  } else if (type === "ballet") {
    Object.assign(payload, {
      company_id: id(ext.company as NamedRef),
      orchestra_id: id(ext.orchestra as NamedRef),
      conductor_id: id(ext.conductor as NamedRef),
      work_id: id(ext.work as NamedRef),
    });
  } else if (type === "dance") {
    Object.assign(payload, {
      company_id: id(ext.company as NamedRef),
      choreographer_id: id(ext.choreographer as NamedRef),
      work_id: id(ext.work as NamedRef),
    });
  } else if (type === "circus") {
    Object.assign(payload, {
      company_id: id(ext.company as NamedRef),
      director_id: id(ext.director as NamedRef),
      work_id: id(ext.work as NamedRef),
    });
  } else if (type === "theatre") {
    Object.assign(payload, {
      company_id: id(ext.company as NamedRef),
      director_id: id(ext.director as NamedRef),
      playwright_id: id(ext.playwright as NamedRef),
      work_id: id(ext.work as NamedRef),
      production_id: id(ext.production as NamedRef),
    });
  } else if (type === "cabaret") {
    Object.assign(payload, {
      headliner_id: id(ext.headliner as NamedRef),
      host_id: id(ext.host as NamedRef),
      ensemble_id: id(ext.ensemble as NamedRef),
      supporting_cast: ids(ext.supporting_cast as NamedRef[]),
      tour_name: ext.tour_name || null,
    });
  } else if (type === "comedy") {
    Object.assign(payload, {
      performer_id: id(ext.performer as NamedRef),
      support_acts: ids(ext.support_acts as NamedRef[]),
      ensemble_id: id(ext.ensemble as NamedRef),
      tour_name: ext.tour_name || null,
    });
  } else if (type === "spoken_word") {
    Object.assign(payload, {
      performers: ids(ext.performers as NamedRef[]),
      host_id: id(ext.host as NamedRef),
    });
  } else if (type === "talk") {
    Object.assign(payload, {
      speaker_ids: ids(ext.speakers as NamedRef[]),
      host_id: id(ext.host as NamedRef),
      topic: ext.topic || null,
      host_organisation: ext.host_organisation || null,
    });
  } else if (type === "exhibition") {
    Object.assign(payload, {
      exhibition_title: ext.exhibition_title || null,
      artists: ids(ext.artists as NamedRef[]),
      period: ext.period || null,
      medium: ext.medium || null,
    });
  } else if (type === "screening") {
    Object.assign(payload, {
      work_id: id(ext.work as NamedRef),
      director_id: id(ext.director as NamedRef),
      ensemble_id: id(ext.ensemble as NamedRef),
    });
  } else if (type === "other") {
    // subtype required for other, already in payload
  }

  return payload;
}

// ── Main form ────────────────────────────────────────────────────────────────

export default function AddEvent() {
  const [step, setStep] = useState<Step>("type");
  const [type, setType] = useState<EventType | null>(null);
  const [base, setBase] = useState<Record<string, unknown>>({
    date: new Date().toISOString().slice(0, 10),
    status: "attended",
    currency: "EUR",
  });
  const [ext, setExt] = useState<Ext>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function setBaseField(k: string, v: unknown) { setBase((b) => ({ ...b, [k]: v })); }
  function setExtField(k: string, v: unknown) { setExt((e) => ({ ...e, [k]: v })); }

  function canProceedBasic() {
    return base.title && base.date && base.venue;
  }

  async function handleSubmit() {
    if (!type) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = buildPayload(type, base, ext);
      const event = await createEvent(type, payload);
      window.location.href = url("/");
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("open-event", { detail: event.id }));
      }, 400);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  const ExtFields = type ? EXTENSION_FIELDS[type] : null;

  return (
    <div className="max-w-lg mx-auto">

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(["type", "basic", "details", "take"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="w-6 h-px bg-neutral-200" />}
            <button
              type="button"
              onClick={() => {
                if (s === "type" || (s === "basic" && type) || (s === "details" && type && canProceedBasic()) || (s === "take" && type && canProceedBasic()))
                  setStep(s);
              }}
              className={`text-[10px] uppercase tracking-widest ${step === s ? "text-neutral-900" : "text-neutral-300"}`}
            >
              {s === "type" ? "Type" : s === "basic" ? "Info" : s === "details" ? "Details" : "Your take"}
            </button>
          </div>
        ))}
      </div>

      {/* Step 1: Type */}
      {step === "type" && (
        <div>
          <h2 className="font-serif text-xl text-neutral-900 mb-6">What kind of event?</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {EVENT_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setStep("basic"); }}
                className={`flex flex-col items-center gap-2 border rounded-xl py-4 px-2 transition-colors hover:border-neutral-400
                  ${type === t ? "border-neutral-800 bg-neutral-50" : "border-neutral-100"}`}
              >
                <span className="text-neutral-500"><EventTypeIcon type={t} size={20} /></span>
                <span className="text-[11px] text-neutral-600 text-center leading-tight">{TYPE_LABELS[t]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Basic info */}
      {step === "basic" && (
        <div>
          <h2 className="font-serif text-xl text-neutral-900 mb-6">
            <button type="button" onClick={() => setStep("type")} className="text-neutral-300 mr-2 hover:text-neutral-600">←</button>
            Basic info
          </h2>
          <div className="space-y-5">
            <Field label="Title" required>
              <input className={inputCls} value={(base.title as string) ?? ""} onChange={(e) => setBaseField("title", e.target.value)} autoFocus />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Date" required>
                <input type="date" className={inputCls} value={(base.date as string) ?? ""} onChange={(e) => setBaseField("date", e.target.value)} />
              </Field>
              <Field label="Time">
                <input type="time" className={inputCls} value={(base.time as string) ?? ""} onChange={(e) => setBaseField("time", e.target.value)} />
              </Field>
            </div>

            <SearchCombo label="Venue" endpoint="venues" value={base.venue as NamedRef | null} onChange={(v) => setBaseField("venue", v)} optional={false} />

            <Field label="Status">
              <div className="flex gap-2">
                {["attended", "cancelled"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setBaseField("status", s)}
                    className={`flex-1 text-xs py-2 rounded-lg border transition-colors capitalize
                      ${base.status === s ? "border-neutral-800 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:border-neutral-400"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label="Price paid">
                  <input type="number" step="0.01" className={inputCls} value={(base.price_paid as string) ?? ""} onChange={(e) => setBaseField("price_paid", e.target.value)} placeholder="0.00" />
                </Field>
              </div>
              <Field label="Currency">
                <select className={inputCls} value={(base.currency as string) ?? "EUR"} onChange={(e) => setBaseField("currency", e.target.value)}>
                  {["EUR", "GBP", "USD"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            <SearchCombo
              label="Festival (optional)"
              endpoint="festivals"
              value={base.festival as NamedRef | null}
              onChange={(v) => setBaseField("festival", v)}
              displayFn={(i) => [i.name, i.edition].filter(Boolean).join(" ")}
            />

            {SUBTYPES[type!] && (
              <Field label="Subtype">
                <select className={inputCls} value={(base.subtype as string) ?? ""} onChange={(e) => setBaseField("subtype", e.target.value)}>
                  <option value="">— select —</option>
                  {SUBTYPES[type!].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
              </Field>
            )}

            {type === "other" && (
              <Field label="Subtype" required>
                <input className={inputCls} value={(base.subtype as string) ?? ""} onChange={(e) => setBaseField("subtype", e.target.value)} placeholder="describe the event type" />
              </Field>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={!canProceedBasic()}
                onClick={() => setStep(ExtFields ? "details" : "take")}
                className="bg-neutral-900 text-white text-sm rounded-lg px-6 py-2.5 hover:bg-neutral-700 transition-colors disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Type-specific details */}
      {step === "details" && ExtFields && (
        <div>
          <h2 className="font-serif text-xl text-neutral-900 mb-6">
            <button type="button" onClick={() => setStep("basic")} className="text-neutral-300 mr-2 hover:text-neutral-600">←</button>
            {TYPE_LABELS[type!]} details
          </h2>
          <ExtFields ext={ext} set={setExtField} />
          <div className="flex justify-end pt-6">
            <button
              type="button"
              onClick={() => setStep("take")}
              className="bg-neutral-900 text-white text-sm rounded-lg px-6 py-2.5 hover:bg-neutral-700 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Your take */}
      {step === "take" && (
        <div>
          <h2 className="font-serif text-xl text-neutral-900 mb-6">
            <button type="button" onClick={() => setStep(ExtFields ? "details" : "basic")} className="text-neutral-300 mr-2 hover:text-neutral-600">←</button>
            Your take <span className="text-neutral-300 font-sans text-sm">(optional)</span>
          </h2>
          <div className="space-y-5">
            <Field label="Rating">
              <StarPicker value={base.rating as number | null} onChange={(v) => setBaseField("rating", v)} />
            </Field>

            <Field label="Review">
              <textarea
                rows={4}
                className={`${inputCls} resize-none font-serif leading-relaxed`}
                value={(base.review as string) ?? ""}
                onChange={(e) => setBaseField("review", e.target.value)}
                placeholder="Your thoughts…"
              />
            </Field>

            <Field label="Admin notes">
              <textarea
                rows={2}
                className={`${inputCls} resize-none`}
                value={(base.notes as string) ?? ""}
                onChange={(e) => setBaseField("notes", e.target.value)}
                placeholder="Ticket info, booking notes, etc."
              />
            </Field>

            <Field label="Data completeness">
              <div className="flex gap-2">
                {["complete", "partial", "stub"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setBaseField("data_completeness", s)}
                    className={`flex-1 text-xs py-2 rounded-lg border transition-colors capitalize
                      ${base.data_completeness === s ? "border-neutral-800 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:border-neutral-400"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="bg-neutral-900 text-white text-sm rounded-lg px-8 py-2.5 hover:bg-neutral-700 transition-colors disabled:opacity-40"
              >
                {submitting ? "Saving…" : "Save event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
