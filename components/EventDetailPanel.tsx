"use client";
import React, { useState, useEffect, useCallback } from "react";
import { IconX, IconExternalLink, IconChevronLeft, IconCheck, IconWriting, IconArticle } from "@tabler/icons-react";
import {
  fetchEvent, fetchPerson, fetchPersonEvents,
  fetchVenue, fetchVenueEvents, fetchEnsemble, fetchEnsembleEvents,
  fetchFestival, fetchFestivalEvents, fetchPaymentMethodEvents,
  patchEventRating, patchEventPrice, patchEventReview,
} from "@/lib/api";
import type { EventListItem, EventDetail, NamedRef } from "@/lib/types";
import EventTypeIcon from "./EventTypeIcon";
import { useGuest } from "./GuestContext";

const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return `${parseInt(d)} ${MONTH_NAMES[parseInt(m)]}`;
}

function StarSvg({ fill, size = 14 }: { fill: number; size?: number }) {
  const id = `clip-panel-${Math.random().toString(36).slice(2)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <defs><clipPath id={id}><rect x="0" y="0" width={14 * fill} height="14" /></clipPath></defs>
      <path d="M7 1l1.545 3.09L12 4.635l-2.5 2.41.59 3.41L7 8.77l-3.09 1.685.59-3.41L2 4.635l3.455-.545L7 1z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" className="text-neutral-300" />
      {fill > 0 && <path d="M7 1l1.545 3.09L12 4.635l-2.5 2.41.59 3.41L7 8.77l-3.09 1.685.59-3.41L2 4.635l3.455-.545L7 1z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" clipPath={`url(#${id})`} className="text-neutral-700" />}
    </svg>
  );
}

function EditableRating({ rating, onRate }: { rating: number | null; onRate: (r: number | null) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const displayed = hover ?? rating ?? 0;
  return (
    <div className="flex gap-0.5" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.min(1, Math.max(0, displayed - (star - 1)));
        return (
          <div key={star} className="cursor-pointer"
            onMouseMove={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setHover(e.clientX - rect.left < rect.width / 2 ? star - 0.5 : star); }}
            onClick={() => { const next = hover ?? null; onRate(next === rating ? null : next); }}>
            <StarSvg fill={fill} />
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">{label}</div>
      <div className="text-sm text-neutral-700">{children}</div>
    </div>
  );
}

type NamedObj = { id: string; name?: string; title?: string };
function namedStr(obj: NamedObj) { return obj.name ?? obj.title ?? ""; }

function ClickableRef({ obj, onClick }: { obj: NamedObj; onClick?: (id: string) => void }) {
  const name = namedStr(obj);
  if (!onClick) return <span>{name}</span>;
  return <button onClick={() => onClick(obj.id)} className="hover:text-neutral-900 hover:underline underline-offset-2 transition-colors">{name}</button>;
}

type WorkObj = { id: string; title: string; creator?: string | null; creator_id?: string | null; year?: number | null; notes?: string | null };
type CastEntry = { id: string; name: string } | string;
type CastObj = Record<string, CastEntry | CastEntry[]>;

function WorkField({ work, onPersonClick }: { work: WorkObj; onPersonClick?: (id: string) => void }) {
  return (
    <div>
      <Field label="Work">
        <span className="text-neutral-800 font-medium">{work.title}</span>
        {work.creator && (
          <span className="text-neutral-500"> — {work.creator_id && onPersonClick
            ? <button onClick={() => onPersonClick(work.creator_id!)} className="hover:text-neutral-900 hover:underline underline-offset-2">{work.creator}</button>
            : work.creator}
          </span>
        )}
        {work.year && <span className="text-neutral-400 text-xs ml-2">({work.year})</span>}
      </Field>
      {work.notes && <p className="text-xs text-neutral-400 mt-1">{work.notes}</p>}
    </div>
  );
}

function CastField({ cast, onPersonClick }: { cast: CastObj; onPersonClick?: (id: string) => void }) {
  const entries = Object.entries(cast);
  if (!entries.length) return null;
  function renderEntry(entry: CastEntry) {
    if (typeof entry === "object" && onPersonClick) return <button onClick={() => onPersonClick(entry.id)} className="hover:text-neutral-900 hover:underline underline-offset-2">{entry.name}</button>;
    return <span>{typeof entry === "object" ? entry.name : entry}</span>;
  }
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Cast</div>
      <dl className="space-y-1">
        {entries.map(([role, val]) => (
          <div key={role} className="flex gap-2 text-sm">
            <dt className="text-neutral-400 min-w-0 shrink-0 w-40 truncate">{role}</dt>
            <dd className="text-neutral-700">{Array.isArray(val) ? val.map((entry, i) => <span key={i}>{i > 0 && ", "}{renderEntry(entry)}</span>) : renderEntry(val)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ExtensionFields({ extension, type, onPersonClick, onEnsembleClick }: {
  extension: Record<string, unknown>; type: string;
  onPersonClick: (id: string) => void; onEnsembleClick: (id: string) => void;
}) {
  const skip = new Set(["id", "event_id", "subtype", "setlist", "setlist_fm_url", "credits",
    ...((new Set(["opera", "circus"])).has(type) ? ["notes", "notes_on_performance"] : [])]);
  const programme = extension.programme as Record<string, unknown>[] | null;
  const work = extension.work as WorkObj | null;
  const cast = extension.cast as CastObj | null;
  const credits = extension.credits as Array<{ role: string; person: NamedObj }> | null;
  const setlist = extension.setlist as string[] | null;
  const setlistFmUrl = extension.setlist_fm_url as string | null;
  const personFields = new Set(["conductor", "director", "choreographer", "headliner", "host", "performer", "playwright"]);
  const personListFields = new Set(["composers", "soloists", "speakers", "performers", "support_acts", "supporting_cast", "artists"]);
  const ensembleFields = new Set(["ensemble", "company", "orchestra", "headliner_ensemble"]);
  const ensembleListFields = new Set(["additional_companies"]);
  const scalarEntries = Object.entries(extension).filter(([k, v]) => !skip.has(k) && k !== "programme" && k !== "work" && k !== "cast" && v !== null);
  const creditsByRole: Map<string, NamedObj[]> = new Map();
  if (credits) for (const c of credits) { if (!creditsByRole.has(c.role)) creditsByRole.set(c.role, []); creditsByRole.get(c.role)!.push(c.person); }

  return (
    <div className="space-y-4 pt-4 border-t border-neutral-100">
      {work && <WorkField work={work} onPersonClick={onPersonClick} />}
      {scalarEntries.map(([key, val]) => {
        if (val === null || val === undefined) return null;
        if (personFields.has(key) && typeof val === "object" && !Array.isArray(val) && "id" in (val as object))
          return <Field key={key} label={key.replace(/_/g, " ")}><ClickableRef obj={val as NamedObj} onClick={onPersonClick} /></Field>;
        if (ensembleFields.has(key) && typeof val === "object" && !Array.isArray(val) && "id" in (val as object))
          return <Field key={key} label={key.replace(/_/g, " ")}><ClickableRef obj={val as NamedObj} onClick={onEnsembleClick} /></Field>;
        if (ensembleListFields.has(key) && Array.isArray(val)) {
          const items = val as NamedObj[];
          if (!items.length) return null;
          return <Field key={key} label={key.replace(/_/g, " ")}><span className="text-neutral-600">{items.map((e, i) => <span key={e.id}>{i > 0 && ", "}<ClickableRef obj={e} onClick={onEnsembleClick} /></span>)}</span></Field>;
        }
        if (personListFields.has(key) && Array.isArray(val)) {
          const items = val as NamedObj[];
          if (!items.length) return null;
          return <Field key={key} label={key.replace(/_/g, " ")}><span className="text-neutral-600">{items.map((p, i) => <span key={p.id}>{i > 0 && ", "}<ClickableRef obj={p} onClick={onPersonClick} /></span>)}</span></Field>;
        }
        let display: string | null = null;
        if (typeof val === "string") display = val;
        else if (typeof val === "number") display = String(val);
        else if (typeof val === "object" && !Array.isArray(val)) { const obj = val as Record<string, unknown>; if ("name" in obj || "title" in obj) display = namedStr(obj as NamedObj); }
        else if (Array.isArray(val)) { display = (val as unknown[]).map((item) => { if (typeof item === "object" && item !== null) { const obj = item as Record<string, unknown>; if ("name" in obj || "title" in obj) return namedStr(obj as NamedObj); } return String(item); }).filter(Boolean).join(", ") || null; }
        if (!display) return null;
        return <Field key={key} label={key.replace(/_/g, " ")}><span className="text-neutral-600">{display}</span></Field>;
      })}
      {programme && programme.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Programme</div>
          <ol className="space-y-2">
            {programme.map((item, i) => {
              const piece = (item.piece ?? item.work) as NamedObj | null;
              const composer = item.composer as NamedObj | null;
              const choreographer = item.choreographer as NamedObj | null;
              const soloists = item.soloists as NamedObj[] | null;
              return (
                <li key={i} className="text-sm">
                  <span className="text-neutral-400 mr-2">{item.order as number}.</span>
                  <span className="text-neutral-800">{piece ? namedStr(piece) : "—"}</span>
                  {(composer || choreographer) && <span className="text-neutral-500"> — <ClickableRef obj={(composer ?? choreographer)!} onClick={onPersonClick} /></span>}
                  {soloists && soloists.length > 0 && <div className="text-xs text-neutral-400 mt-0.5 ml-4">Soloists: {soloists.map((s, j) => <span key={s.id}>{j > 0 && ", "}<ClickableRef obj={s} onClick={onPersonClick} /></span>)}</div>}
                </li>
              );
            })}
          </ol>
        </div>
      )}
      {setlist && setlist.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[10px] uppercase tracking-widest text-neutral-400">Setlist</div>
            {setlistFmUrl && <a href={setlistFmUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-neutral-400 hover:text-neutral-700 flex items-center gap-1"><IconExternalLink size={10} />setlist.fm</a>}
          </div>
          <ol className="space-y-0.5">{setlist.map((song, i) => <li key={i} className="flex items-baseline gap-2 text-sm"><span className="text-neutral-300 text-xs w-5 text-right flex-shrink-0">{i + 1}</span><span className="text-neutral-700">{song}</span></li>)}</ol>
        </div>
      )}
      {creditsByRole.size > 0 && (
        <div className="space-y-3">
          {[...creditsByRole.entries()].map(([role, persons]) => (
            <Field key={role} label={role}><span className="text-neutral-600">{persons.map((p, i) => <span key={p.id}>{i > 0 && ", "}<ClickableRef obj={p} onClick={onPersonClick} /></span>)}</span></Field>
          ))}
        </div>
      )}
      {cast && <CastField cast={cast} onPersonClick={onPersonClick} />}
    </div>
  );
}

type NavKind = "person" | "venue" | "ensemble" | "festival" | "payment_method";
interface NavTarget { kind: NavKind; id: string; hint?: string; }
const NAV_LABELS: Record<NavKind, string> = { person: "Person", venue: "Venue", ensemble: "Ensemble", festival: "Festival", payment_method: "Payment method" };

async function fetchNavName(kind: NavKind, id: string, hint?: string): Promise<string> {
  if (hint) return hint;
  if (kind === "person") return (await fetchPerson(id)).name;
  if (kind === "venue") { const v = await fetchVenue(id); return [v.name, v.city].filter(Boolean).join(", "); }
  if (kind === "festival") { const f = await fetchFestival(id); return [f.name, f.edition].filter(Boolean).join(" "); }
  if (kind === "payment_method") return id;
  return (await fetchEnsemble(id)).name;
}
async function fetchNavEvents(kind: NavKind, id: string): Promise<EventListItem[]> {
  if (kind === "person") return fetchPersonEvents(id);
  if (kind === "venue") return fetchVenueEvents(id);
  if (kind === "festival") return fetchFestivalEvents(id);
  if (kind === "payment_method") return fetchPaymentMethodEvents(id);
  return fetchEnsembleEvents(id);
}

function NavEventsView({ target, onBack, onEventClick }: { target: NavTarget; onBack: () => void; onEventClick: (id: string) => void }) {
  const [name, setName] = useState("");
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchNavName(target.kind, target.id, target.hint), fetchNavEvents(target.kind, target.id)])
      .then(([n, evts]) => { setName(n); setEvents(evts); })
      .finally(() => setLoading(false));
  }, [target.kind, target.id, target.hint]);
  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700"><IconChevronLeft size={14} />Back</button>
        <div className="text-xs uppercase tracking-widest text-neutral-400">{NAV_LABELS[target.kind]}</div>
        <div className="w-14" />
      </div>
      <div className="overflow-y-auto h-[calc(100%-57px)] px-6 py-5">
        {loading ? <div className="flex items-center justify-center h-32 text-neutral-300 text-xs uppercase tracking-widest">Loading…</div> : (
          <>
            <h2 className="font-serif text-2xl text-neutral-900 mb-1">{name}</h2>
            <p className="text-xs text-neutral-400 mb-5 uppercase tracking-widest">{events.length} event{events.length !== 1 ? "s" : ""}</p>
            <div className="space-y-2">
              {events.length === 0 && <p className="text-sm text-neutral-400">No events found.</p>}
              {events.map((e) => {
                const [yr, m, d] = e.date.split("-");
                return (
                  <button key={e.id} onClick={() => onEventClick(e.id)} className="w-full text-left bg-white border border-neutral-100 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-neutral-300 transition-colors group">
                    <div className="w-8 h-8 border border-neutral-200 rounded-full flex items-center justify-center flex-shrink-0 text-neutral-400 group-hover:text-neutral-600"><EventTypeIcon type={e.type} size={16} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-serif text-sm font-medium text-neutral-900 truncate">{e.title}</div>
                      <div className="text-xs text-neutral-400 mt-0.5">{e.venue_name}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <div className="text-xs text-neutral-400">{parseInt(d)} {MONTH_NAMES[parseInt(m)]} {yr}</div>
                      {e.rating != null && <span className="text-[11px] text-neutral-400">{e.rating}★</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function PriceEditor({ price, currency, onSave }: { price: string | null; currency: string | null; onSave: (price: string, currency: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(price ?? "");
  const [cur, setCur] = useState(currency ?? "EUR");
  if (!editing) return (
    <Field label="Price paid">
      <button onClick={() => setEditing(true)} className="hover:underline underline-offset-2 text-neutral-600">
        {price ? `${cur} ${price}` : <span className="text-neutral-300 italic">Add price…</span>}
      </button>
    </Field>
  );
  return (
    <Field label="Price paid">
      <div className="flex items-center gap-2">
        <select value={cur} onChange={(e) => setCur(e.target.value)} className="border border-neutral-200 rounded px-1.5 py-1 text-xs text-neutral-700 bg-white">
          {["EUR", "GBP", "USD"].map((c) => <option key={c}>{c}</option>)}
        </select>
        <input type="number" step="0.01" value={val} onChange={(e) => setVal(e.target.value)} className="border border-neutral-200 rounded px-2 py-1 text-xs w-24 text-neutral-700" autoFocus />
        <button onClick={() => { onSave(val, cur); setEditing(false); }} className="text-xs text-neutral-700 border border-neutral-300 rounded px-2 py-1 hover:bg-neutral-50">Save</button>
        <button onClick={() => setEditing(false)} className="text-xs text-neutral-400">Cancel</button>
      </div>
    </Field>
  );
}

const RATING_CONTEXT_DESCRIPTIONS: Record<string, string> = {
  arena: "Rating context: 10,000+ capacity", theatre: "Rating context: 400–10,000 seats",
  studio: "Rating context: 100–400 capacity", intimate: "Rating context: under 100 people",
  outdoor: "Rating context: open air", gallery: "Rating context: museum or exhibition",
};

function RatingContextBadge({ context }: { context: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex">
      <button onClick={() => setOpen((v) => !v)} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} className="text-[10px] uppercase tracking-widest text-neutral-400 border border-neutral-200 rounded px-1.5 py-0.5 hover:border-neutral-400 transition-colors">{context}</button>
      {open && RATING_CONTEXT_DESCRIPTIONS[context] && <div className="absolute bottom-full right-0 mb-1.5 w-52 bg-neutral-900 text-white text-[11px] leading-relaxed rounded px-2.5 py-2 z-50 pointer-events-none">{RATING_CONTEXT_DESCRIPTIONS[context]}</div>}
    </div>
  );
}

function DescriptionBlock({ aiSummary, fullDescription, sourceUrl }: { aiSummary: string | null; fullDescription: string | null; sourceUrl: string | null }) {
  const [showFull, setShowFull] = React.useState(false);
  const hasBoth = !!(aiSummary && fullDescription);
  const activeIsVerbatim = hasBoth ? showFull : !!fullDescription;
  return (
    <div className="border border-neutral-100 rounded-xl px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-widest text-neutral-400">Description</div>
        {hasBoth ? (
          <div className="flex gap-1">
            <button onClick={() => setShowFull(false)} className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${!showFull ? "bg-neutral-900 text-white" : "text-neutral-400"}`}>AI summary</button>
            <button onClick={() => setShowFull(true)} className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${showFull ? "bg-neutral-900 text-white" : "text-neutral-400"}`}>Verbatim</button>
          </div>
        ) : <span className="text-[11px] text-neutral-400">{aiSummary ? "AI summary" : "Verbatim"}</span>}
      </div>
      {(!hasBoth || !showFull) && aiSummary && <p className="text-xs text-neutral-500 leading-relaxed">{aiSummary}</p>}
      {(!hasBoth || showFull) && fullDescription && <p className="text-xs text-neutral-500 leading-relaxed whitespace-pre-wrap">{fullDescription}</p>}
      {activeIsVerbatim && sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-neutral-400 hover:text-neutral-600 mt-2.5 block break-all">{sourceUrl} ↗</a>}
    </div>
  );
}

function ReviewSection({ review, links, rating, ratingContext, onSaveReview, onRate }: {
  review: string | null; links: Array<{ url: string; label?: string; description?: string }> | null;
  rating: number | null; ratingContext: string | null;
  onSaveReview: (text: string | null) => void; onRate: (r: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(review ?? "");
  const hasContent = review || (links && links.length > 0);
  const hasEssay = !!(links && links.some(l => l.url?.includes("cultural-dispatch")));
  return (
    <div className="border-t border-b border-neutral-100 pt-4 pb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-neutral-700 font-medium">
          {review && <IconWriting size={12} />}
          {hasEssay && <IconArticle size={12} />}
          My take
        </div>
        {!editing && !review && <div className="flex items-center gap-2"><EditableRating rating={rating} onRate={onRate} />{ratingContext && <RatingContextBadge context={ratingContext} />}</div>}
        {!editing && review && rating !== null && <div className="flex items-center gap-2"><span className="text-xs text-neutral-400">{rating}★</span>{ratingContext && <RatingContextBadge context={ratingContext} />}</div>}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write something…" autoFocus rows={4} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-700 resize-none focus:outline-none focus:border-neutral-400 font-serif leading-relaxed" />
          <div className="flex items-center gap-2">
            <button onClick={() => { onSaveReview(draft.trim() || null); setEditing(false); }} className="flex items-center gap-1 text-xs text-neutral-700 border border-neutral-300 rounded px-2.5 py-1 hover:bg-neutral-50"><IconCheck size={12} /> Save</button>
            <button onClick={() => { setDraft(review ?? ""); setEditing(false); }} className="text-xs text-neutral-400">Cancel</button>
            {review && <button onClick={() => { setDraft(""); onSaveReview(null); setEditing(false); }} className="text-xs text-neutral-300 hover:text-red-400 ml-auto">Remove</button>}
          </div>
        </div>
      ) : (
        <>
          {review && <button onClick={() => { setDraft(review); setEditing(true); }} className="w-full text-left group mb-3"><p className="text-sm font-serif text-neutral-900 leading-relaxed border-l-2 border-neutral-400 pl-3 whitespace-pre-wrap group-hover:border-neutral-700 transition-colors">{review}</p></button>}
          {links && links.map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 border border-neutral-100 rounded-lg px-3 py-2.5 mb-2 hover:border-neutral-300 transition-colors group text-left no-underline">
              <IconExternalLink size={14} className="text-neutral-300 group-hover:text-neutral-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-neutral-700 truncate">{link.label ?? link.url}</div>
                <div className="text-xs text-neutral-400 truncate">{link.description ?? (() => { try { return new URL(link.url).hostname; } catch { return link.url; } })()}</div>
              </div>
            </a>
          ))}
          {!hasContent && <button onClick={() => setEditing(true)} className="text-sm text-neutral-300 italic hover:text-neutral-500">Add a review…</button>}
        </>
      )}
    </div>
  );
}

export default function EventDetailPanel({ open, eventId, preview, onClose, onNavigate, directTarget, getAdjacentId }: {
  open: boolean; eventId: string | null; preview?: EventListItem | null; onClose: () => void; onNavigate: (id: string) => void;
  directTarget?: { kind: NavKind; id: string; hint?: string } | null;
  getAdjacentId?: (id: string, dir: 1 | -1) => string | null;
}) {
  const isGuest = useGuest();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [navTarget, setNavTarget] = useState<NavTarget | null>(null);

  const navigate = useCallback((kind: NavKind, id: string, hint?: string) => setNavTarget({ kind, id, hint }), []);

  useEffect(() => {
    if (!eventId) return;
    setDetailLoading(true);
    setEvent(null);
    fetchEvent(eventId).then(setEvent).finally(() => setDetailLoading(false));
  }, [eventId]);

  useEffect(() => {
    if (directTarget) setNavTarget(directTarget);
  }, [directTarget]);

  useEffect(() => {
    if (!open) setNavTarget(null);
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (!eventId || !getAdjacentId || navTarget) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "j" || e.key === "ArrowDown") { const id = getAdjacentId(eventId, 1); if (id) { e.preventDefault(); onNavigate(id); } }
      if (e.key === "k" || e.key === "ArrowUp") { const id = getAdjacentId(eventId, -1); if (id) { e.preventDefault(); onNavigate(id); } }
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, eventId, getAdjacentId, navTarget, onNavigate]);

  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 bg-black/10 z-40 transition-opacity duration-200 hidden md:block ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} />
      <div className={`fixed z-50 bg-white shadow-xl transition-transform duration-300 ease-in-out inset-0 md:inset-auto md:top-0 md:right-0 md:bottom-0 md:w-[480px] ${open ? "translate-x-0" : "translate-x-full"}`}>
        <button onClick={onClose} className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"><IconX size={16} /></button>

        {navTarget ? (
          <NavEventsView target={navTarget} onBack={() => setNavTarget(null)} onEventClick={(id) => { setNavTarget(null); onNavigate(id); }} />
        ) : (
          <>
            {/* Header: show from preview immediately, upgrade when full event loads */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 pr-14">
              <div className="flex items-center gap-2 text-neutral-400">
                {(event ?? preview) && (() => { const e = event ?? preview!; return <><EventTypeIcon type={e.type} size={16} /><span className="text-xs uppercase tracking-widest">{e.type.replace(/_/g, " ")}{event?.subtype ? ` — ${event.subtype.replace(/_/g, " ")}` : ""}</span></>; })()}
              </div>
              {event && !isGuest && (
                <div className="flex items-center gap-2">
                  <a href={`/edit?id=${event.id}`} className="text-[11px] text-neutral-400 hover:text-neutral-700 border border-neutral-200 rounded-md px-2.5 py-1 hover:border-neutral-400 transition-colors">Edit</a>
                  <button onClick={async () => { if (!confirm("Delete this event?")) return; await fetch(`/api/events/${event.id}`, { method: "DELETE" }); onClose(); }} className="text-[11px] text-neutral-300 hover:text-red-500 border border-neutral-200 rounded-md px-2.5 py-1 hover:border-red-300 transition-colors">Delete</button>
                </div>
              )}
            </div>

            <div className="overflow-y-auto h-[calc(100%-57px)] px-6 py-5 space-y-5">
              {/* Title/date: show from preview immediately */}
              {(event ?? preview) && (() => {
                const e = event ?? preview!;
                return (
                  <div>
                    <h2 className="font-serif text-2xl text-neutral-900 leading-snug mb-1">{e.title}</h2>
                    <div className="flex items-center gap-3 text-sm text-neutral-400">
                      <span>{formatDate(e.date)}{e.date.slice(0, 4) !== new Date().getFullYear().toString() && `, ${e.date.slice(0, 4)}`}</span>
                      {e.time && <span>{e.time.slice(0, 5)}</span>}
                    </div>
                    {parseInt(e.date.slice(0, 4)) < 2025 && <div className="mt-1.5 text-[10px] uppercase tracking-widest text-amber-500">Data may be incomplete for pre-2025 events</div>}
                  </div>
                );
              })()}

              {/* Details that require the full event fetch */}
              {event ? (
                <>
                  {isGuest ? (
                    (event.review || event.rating || (event.links && event.links.length > 0)) ? (
                      <div className="border-t border-b border-neutral-100 pt-4 pb-4 space-y-3">
                        <div className="text-[10px] uppercase tracking-widest text-neutral-400">My take</div>
                        {event.rating !== null && <div className="text-sm text-neutral-500">{event.rating}★{event.rating_context && <span className="text-neutral-300 ml-2 text-xs">{event.rating_context}</span>}</div>}
                        {event.review && <p className="text-sm font-serif text-neutral-900 leading-relaxed border-l-2 border-neutral-300 pl-3 whitespace-pre-wrap">{event.review}</p>}
                        {event.links?.map((link, i) => (
                          <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700">
                            <IconExternalLink size={13} />{link.label ?? link.url}
                          </a>
                        ))}
                      </div>
                    ) : null
                  ) : (
                    <ReviewSection
                      review={event.review} links={event.links} rating={event.rating} ratingContext={event.rating_context}
                      onSaveReview={(text) => { setEvent((prev) => prev ? { ...prev, review: text } : prev); patchEventReview(event.id, text).catch(() => fetchEvent(event.id).then(setEvent)); }}
                      onRate={(r) => { setEvent((prev) => prev ? { ...prev, rating: r } : prev); patchEventRating(event.id, r).catch(() => fetchEvent(event.id).then(setEvent)); }}
                    />
                  )}

                  {(event.ai_summary || event.full_description) && <DescriptionBlock aiSummary={event.ai_summary} fullDescription={event.full_description} sourceUrl={event.description_source_url} />}

                  <div className="space-y-0.5">
                    <Field label="Venue"><button onClick={() => navigate("venue", event.venue.id)} className="hover:text-neutral-900 hover:underline underline-offset-2">{event.venue.name}</button></Field>
                    {event.venue_path.map((v: NamedRef) => <div key={v.id} className="text-xs text-neutral-400"><button onClick={() => navigate("venue", v.id)} className="hover:text-neutral-700 hover:underline underline-offset-2">{v.name}</button></div>)}
                  </div>

                  {event.festival && <Field label="Festival"><button onClick={() => navigate("festival", event.festival!.id)} className="hover:text-neutral-900 hover:underline underline-offset-2">{event.festival.name}</button></Field>}

                  {event.payment_method ? (
                    <Field label="Payment method">
                      <button type="button" onClick={() => navigate("payment_method", String(event.payment_method!.id), event.payment_method!.name)} className="text-neutral-700 hover:text-neutral-900 hover:underline text-left">{event.payment_method.name}</button>
                      {event.price_paid && <span className="text-neutral-400 text-xs ml-2">+ {event.currency ?? "EUR"} {event.price_paid} surcharge</span>}
                    </Field>
                  ) : isGuest ? (
                    event.price_paid ? <Field label="Price paid"><span className="text-neutral-600">{event.currency} {event.price_paid}</span></Field> : null
                  ) : (
                    <PriceEditor price={event.price_paid} currency={event.currency}
                      onSave={(price, currency) => { setEvent((prev) => prev ? { ...prev, price_paid: price, currency } : prev); patchEventPrice(event.id, price, currency).catch(() => fetchEvent(event.id).then(setEvent)); }}
                    />
                  )}

                  {event.notes && <Field label="Notes"><p className="text-neutral-600 leading-relaxed whitespace-pre-wrap">{event.notes}</p></Field>}

                  {event.related_events && event.related_events.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Also visited</div>
                      <div className="space-y-1.5">
                        {event.related_events.map((rel) => {
                          const [yr, m, d] = rel.date.split("-");
                          return (
                            <button key={rel.id} onClick={() => onNavigate(rel.id)} className="w-full text-left flex items-center gap-3 bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2 hover:border-neutral-300 transition-colors group">
                              <div className="w-6 h-6 border border-neutral-200 rounded-full flex items-center justify-center flex-shrink-0 text-neutral-400 group-hover:text-neutral-600"><EventTypeIcon type={rel.type} size={12} /></div>
                              <span className="font-serif text-sm text-neutral-800 flex-1 truncate">{rel.title}</span>
                              <span className="text-xs text-neutral-400 flex-shrink-0">{parseInt(d)} {MONTH_NAMES[parseInt(m)]} {yr}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {event.extension && <ExtensionFields extension={event.extension} type={event.type} onPersonClick={(id) => navigate("person", id)} onEnsembleClick={(id) => navigate("ensemble", id)} />}
                </>
              ) : detailLoading && !preview && (
                <div className="flex items-center justify-center h-32 text-neutral-300 text-xs uppercase tracking-widest">Loading…</div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
