"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { IconX, IconExternalLink, IconChevronLeft, IconCheck, IconWriting, IconArticle } from "@tabler/icons-react";
import {
  fetchEvent, fetchPerson, fetchPersonEvents,
  fetchVenue, fetchVenueEvents, fetchEnsemble, fetchEnsembleEvents,
  fetchFestival, fetchFestivalEvents, fetchPaymentMethodEvents,
  fetchWork, fetchWorkEvents, updateWork,
  fetchPiece, fetchPieceEvents, updatePiece,
  patchEventRating, patchEventPrice, patchEventReview,
  updatePersonRoles, updateEnsembleRoles,
} from "@/lib/api";
import type { EventListItem, EventDetail, NamedRef } from "@/lib/types";
import EventTypeIcon from "./EventTypeIcon";
import { useGuest } from "./GuestContext";

const REVIEW_PROMPTS_ENTHUSIASM = [
  "Name one scene or image you'd describe to someone at the pub.",
  "What's the one line or moment you'll still be thinking about tomorrow?",
  "Was there a moment where the room changed?",
  "What was the most technically impressive thing — staging, voice, physicality, design?",
  "What was it actually about underneath the surface premise?",
  "Did it commit to its idea, or did it hedge?",
  "What's the weird unexplainable thing that made it work?",
  "Who was the standout, and what did they do that no one else did?",
  "What surprised you that you weren't expecting?",
  "When did you feel something shift — laugh, wince, hold your breath?",
  "How Fringe was it? Could this exist anywhere else?",
  "How did it compare to what you expected walking in?",
  "Would you see it again?",
];

const REVIEW_PROMPTS_REFLECTION = [
  "What (if anything) nearly let it down?",
  "Was there anything that felt off, underdeveloped, or unearned?",
  "Did it earn the emotion it was going for, or did it tell you how to feel?",
  "Was it trying to do too much — or not quite enough?",
  "Did the ending feel inevitable, or did it just... stop?",
  "Where did your attention drift, if anywhere?",
  "Was the concept stronger than the execution, or the other way round?",
  "Was there a moment where you became aware you were watching a performance rather than experiencing one?",
  "What's the one thing you'd cut?",
  "What would have made it even better?",
  "What's your honest case for and against recommending it?",
  "If a friend asked \"was it good?\" — what would you actually say?",
  "Who would hate this? (More useful than who'd love it.)",
];

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
            onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const v = e.clientX - rect.left < rect.width / 2 ? star - 0.5 : star; onRate(v === rating ? null : v); }}>
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

type NamedObj = { id: string; name?: string; title?: string; roles?: string[] | null };
function namedStr(obj: NamedObj) { return obj.name ?? obj.title ?? ""; }

function ClickableRef({ obj, onClick }: { obj: NamedObj; onClick?: (id: string) => void }) {
  const name = namedStr(obj);
  if (!onClick) return <span>{name}</span>;
  return <button onClick={() => onClick(obj.id)} className="hover:text-neutral-900 hover:underline underline-offset-2 transition-colors">{name}</button>;
}

type WorkObj = { id: string; title: string; creator?: string | null; creator_id?: string | null; year?: number | null; notes?: string | null };

function WorkField({ work, onPersonClick, onWorkClick }: { work: WorkObj; onPersonClick?: (id: string) => void; onWorkClick?: (id: string) => void }) {
  return (
    <div>
      <Field label="Work">
        {onWorkClick
          ? <button onClick={() => onWorkClick(work.id)} className="text-neutral-800 font-medium hover:underline underline-offset-2 hover:text-neutral-900">{work.title}</button>
          : <span className="text-neutral-800 font-medium">{work.title}</span>}
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


function ExtensionFields({ extension, type, onPersonClick, onEnsembleClick, onWorkClick, onPieceClick }: {
  extension: Record<string, unknown>; type: string;
  onPersonClick: (id: string) => void; onEnsembleClick: (id: string) => void; onWorkClick: (id: string) => void; onPieceClick: (id: string) => void;
}) {
  const skip = new Set(["id", "event_id", "subtype", "setlist", "setlist_fm_url", "credits",
    ...((new Set(["opera", "circus"])).has(type) ? ["notes", "notes_on_performance"] : [])]);
  const programme = extension.programme as Record<string, unknown>[] | null;
  const work = extension.work as WorkObj | null;
  const credits = extension.credits as Array<{ role: string; note?: string | null; person: NamedObj | null; ensemble: NamedObj | null }> | null;
  const setlist = extension.setlist as string[] | null;
  const setlistFmUrl = extension.setlist_fm_url as string | null;
  const personFields = new Set(["conductor", "director", "choreographer", "headliner", "host", "performer", "playwright"]);
  const personListFields = new Set(["composers", "soloists", "speakers", "performers", "support_acts", "supporting_cast", "artists"]);
  const ensembleFields = new Set(["ensemble", "company", "orchestra", "headliner_ensemble"]);
  const ensembleListFields = new Set(["additional_companies"]);
  const scalarEntries = Object.entries(extension).filter(([k, v]) => !skip.has(k) && k !== "programme" && k !== "work" && v !== null);
  const actorCredits = credits?.filter((c) => c.role === "Actor") ?? [];
  const otherCredits = credits?.filter((c) => c.role !== "Actor") ?? [];
  const creditsByRole: Map<string, { entity: NamedObj; isEnsemble: boolean; note?: string | null }[]> = new Map();
  for (const c of otherCredits) { const entity = c.person ?? c.ensemble; if (!entity) continue; if (!creditsByRole.has(c.role)) creditsByRole.set(c.role, []); creditsByRole.get(c.role)!.push({ entity, isEnsemble: !!c.ensemble, note: c.note }); }

  return (
    <div className="space-y-4 pt-4 border-t border-neutral-100">
      {work && <WorkField work={work} onPersonClick={onPersonClick} onWorkClick={onWorkClick} />}
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
              const music = item.music as Array<{ id: string; name: string; composer: NamedObj | null }> | null;
              const notes = item.notes as string | null;
              return (
                <li key={i} className="text-sm">
                  <span className="text-neutral-400 mr-2">{item.order as number}.</span>
                  {piece
                    ? <button onClick={() => onPieceClick(piece.id)} className="text-neutral-800 hover:underline underline-offset-2 hover:text-neutral-900 text-left">{namedStr(piece)}</button>
                    : <span className="text-neutral-800">—</span>}
                  {(composer || choreographer) && <span className="text-neutral-500"> — <ClickableRef obj={(composer ?? choreographer)!} onClick={onPersonClick} /></span>}
                  {notes && <div className="text-xs text-neutral-400 mt-0.5 ml-4">{notes}</div>}
                  {soloists && soloists.length > 0 && <div className="text-xs text-neutral-400 mt-0.5 ml-4">Soloists: {soloists.map((s, j) => <span key={s.id}>{j > 0 && ", "}<ClickableRef obj={s} onClick={onPersonClick} /></span>)}</div>}
                  {music && music.length > 0 && <div className="text-xs text-neutral-400 mt-0.5 ml-4">Music: {music.map((m, j) => <span key={m.id ?? j}>{j > 0 && "; "}<span className="text-neutral-600">{m.name}</span>{m.composer && <span> — <ClickableRef obj={m.composer} onClick={onPersonClick} /></span>}</span>)}</div>}
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
          {[...creditsByRole.entries()].map(([role, entries]) => (
            <Field key={role} label={role}>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {entries.map(({ entity, isEnsemble, note }) => (
                  <div key={entity.id + (note ?? "")}>
                    <span className="text-neutral-600"><ClickableRef obj={entity} onClick={isEnsemble ? onEnsembleClick : onPersonClick} /></span>
                    {note && <span className="text-neutral-400 text-xs ml-1">({note})</span>}
                    {entity.roles && entity.roles.length > 0 && <div className="text-[10px] text-neutral-400 mt-0.5">{entity.roles.join(" · ")}</div>}
                  </div>
                ))}
              </div>
            </Field>
          ))}
        </div>
      )}
      {actorCredits.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Cast</div>
          <dl className="space-y-1">
            {actorCredits.map((c) => {
              const entity = c.person ?? c.ensemble;
              if (!entity) return null;
              const isEnsemble = !!c.ensemble;
              return (
                <div key={entity.id + (c.note ?? "")} className="flex gap-2 text-sm">
                  <dt className="text-neutral-400 min-w-0 shrink-0 w-40 truncate">{c.note ?? ""}</dt>
                  <dd className="text-neutral-700">
                    <ClickableRef obj={entity} onClick={isEnsemble ? onEnsembleClick : onPersonClick} />
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}
    </div>
  );
}

type NavKind = "person" | "venue" | "ensemble" | "festival" | "payment_method" | "work" | "piece";
interface NavTarget { kind: NavKind; id: string; hint?: string; }
const NAV_LABELS: Record<NavKind, string> = { person: "Person", venue: "Venue", ensemble: "Ensemble", festival: "Festival", payment_method: "Payment method", work: "Work", piece: "Classical piece" };

const PERSON_ROLE_VOCAB = ["Comedian", "Actor", "Singer", "Opera Singer", "Dancer", "Choreographer", "Musician", "Conductor", "Composer", "Circus Performer", "Drag Performer", "Cabaret Performer", "Burlesque Performer", "Host", "Writer", "Playwright", "Director", "Producer", "Visual Artist", "Curator"];
const ENSEMBLE_ROLE_VOCAB = ["Theatre Company", "Dance Company", "Circus Company", "Opera Company", "Ballet Company", "Orchestra", "Band", "Production Company", "Comedy Group", "Cabaret Company", "Duo"];

async function fetchNavName(kind: NavKind, id: string, hint?: string): Promise<string> {
  if (hint) return hint;
  if (kind === "person") return (await fetchPerson(id)).name;
  if (kind === "venue") { const v = await fetchVenue(id); return [v.name, v.city].filter(Boolean).join(", "); }
  if (kind === "festival") { const f = await fetchFestival(id); return [f.name, f.edition].filter(Boolean).join(" "); }
  if (kind === "payment_method") return id;
  if (kind === "work") return (await fetchWork(id)).title;
  if (kind === "piece") { const p = await fetchPiece(id); return [p.title, p.movement].filter(Boolean).join(" — "); }
  return (await fetchEnsemble(id)).name;
}
async function fetchNavEvents(kind: NavKind, id: string): Promise<EventListItem[]> {
  if (kind === "person") return fetchPersonEvents(id);
  if (kind === "venue") return fetchVenueEvents(id);
  if (kind === "festival") return fetchFestivalEvents(id);
  if (kind === "payment_method") return fetchPaymentMethodEvents(id);
  if (kind === "work") return fetchWorkEvents(id);
  if (kind === "piece") return fetchPieceEvents(id);
  return fetchEnsembleEvents(id);
}

type WorkMetaState = {
  creator?: string | null; year?: number | null;
  movement?: string | null; catalogue_number?: string | null; composer_text?: string | null;
  source: "work" | "piece";
};

function NavEventsView({ target, onBack, onEventClick }: { target: NavTarget; onBack: () => void; onEventClick: (id: string) => void }) {
  const [name, setName] = useState("");
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [editingRoles, setEditingRoles] = useState(false);
  const [draftRoles, setDraftRoles] = useState<string[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const [workMeta, setWorkMeta] = useState<WorkMetaState | null>(null);
  const [editingWork, setEditingWork] = useState(false);
  const [workDraft, setWorkDraft] = useState<{ title: string; year: string; movement: string; catalogue_number: string; composer_text: string }>({ title: "", year: "", movement: "", catalogue_number: "", composer_text: "" });
  const [savingWork, setSavingWork] = useState(false);
  const [workSaveError, setWorkSaveError] = useState<string | null>(null);
  const isGuest = useGuest();

  const [customInput, setCustomInput] = useState("");
  const hasRoles = target.kind === "person" || target.kind === "ensemble";
  const hasWorkMeta = target.kind === "work" || target.kind === "piece";
  const vocab = target.kind === "person" ? PERSON_ROLE_VOCAB : ENSEMBLE_ROLE_VOCAB;

  useEffect(() => {
    setLoading(true);
    setRoles([]);
    setEditingRoles(false);
    setWorkMeta(null);
    setEditingWork(false);
    const rolesPromise: Promise<string[]> = target.kind === "person"
      ? fetchPerson(target.id).then(p => p.roles ?? [])
      : target.kind === "ensemble"
      ? fetchEnsemble(target.id).then(e => e.roles ?? [])
      : Promise.resolve([]);
    const workMetaPromise: Promise<WorkMetaState | null> = target.kind === "work"
      ? fetchWork(target.id).then(w => ({ creator: (w.creator as { name?: string } | null)?.name ?? null, year: w.year ?? null, source: "work" as const }))
      : target.kind === "piece"
      ? fetchPiece(target.id).then(p => ({ creator: p.composer?.name ?? p.composer_text ?? null, year: null, movement: p.movement ?? null, catalogue_number: p.catalogue_number ?? null, composer_text: p.composer_text ?? null, source: "piece" as const }))
      : Promise.resolve(null);
    Promise.all([fetchNavName(target.kind, target.id, target.hint), fetchNavEvents(target.kind, target.id), rolesPromise, workMetaPromise])
      .then(([n, evts, r, wm]) => { setName(n); setEvents(evts); setRoles(r); setWorkMeta(wm); })
      .finally(() => setLoading(false));
  }, [target.kind, target.id, target.hint]);

  async function saveRoles() {
    setSavingRoles(true);
    try {
      if (target.kind === "person") await updatePersonRoles(target.id, draftRoles);
      else if (target.kind === "ensemble") await updateEnsembleRoles(target.id, draftRoles);
      setRoles(draftRoles);
      setEditingRoles(false);
    } finally {
      setSavingRoles(false);
    }
  }

  function startEditWork() {
    if (!workMeta) return;
    setWorkDraft({
      title: name.split(" — ")[0] ?? "",
      year: workMeta.year ? String(workMeta.year) : "",
      movement: workMeta.movement ?? "",
      catalogue_number: workMeta.catalogue_number ?? "",
      composer_text: workMeta.composer_text ?? workMeta.creator ?? "",
    });
    setWorkSaveError(null);
    setEditingWork(true);
  }

  async function saveWork() {
    setSavingWork(true); setWorkSaveError(null);
    try {
      if (workMeta?.source === "work") {
        await updateWork(target.id, { title: workDraft.title || undefined, year: workDraft.year ? parseInt(workDraft.year) : null });
        setWorkMeta(wm => wm ? { ...wm, year: workDraft.year ? parseInt(workDraft.year) : null } : wm);
      } else {
        await updatePiece(target.id, {
          title: workDraft.title || undefined,
          catalogue_number: workDraft.catalogue_number || null,
          composer_text: workDraft.composer_text || null,
        });
        setWorkMeta(wm => wm ? { ...wm, catalogue_number: workDraft.catalogue_number || null, composer_text: workDraft.composer_text || null, creator: workDraft.composer_text || wm.creator } : wm);
      }
      if (workDraft.title) setName(workDraft.title);
      setEditingWork(false);
    } catch (e) {
      setWorkSaveError((e as Error).message ?? "Save failed");
    } finally {
      setSavingWork(false);
    }
  }

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
            {workMeta && !editingWork && (workMeta.creator || workMeta.year) && (
              <p className="text-sm text-neutral-500 mb-1">
                {workMeta.creator}{workMeta.creator && workMeta.year ? " · " : ""}{workMeta.year}
              </p>
            )}
            {workMeta && !editingWork && (workMeta.catalogue_number) && (
              <p className="text-xs text-neutral-400 mb-1">{workMeta.catalogue_number}</p>
            )}
            {hasWorkMeta && !isGuest && !editingWork && (
              <button onClick={startEditWork} className="text-[11px] text-neutral-400 hover:text-neutral-700 border border-neutral-200 hover:border-neutral-400 rounded px-2 py-0.5 transition-colors mb-3">Edit details</button>
            )}
            {hasWorkMeta && editingWork && (
              <div className="mb-3 space-y-2">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-0.5">Title</label>
                  <input value={workDraft.title} onChange={e => setWorkDraft(d => ({ ...d, title: e.target.value }))}
                    className="w-full text-sm px-2.5 py-1.5 border border-neutral-200 rounded-lg outline-none focus:border-neutral-400" />
                </div>
                {workMeta?.source === "piece" && (
                  <>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-0.5">Catalogue number</label>
                      <input value={workDraft.catalogue_number} onChange={e => setWorkDraft(d => ({ ...d, catalogue_number: e.target.value }))}
                        placeholder="e.g. Op. 74" className="w-full text-sm px-2.5 py-1.5 border border-neutral-200 rounded-lg outline-none focus:border-neutral-400" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-0.5">Composer</label>
                      <input value={workDraft.composer_text} onChange={e => setWorkDraft(d => ({ ...d, composer_text: e.target.value }))}
                        placeholder="Composer name" className="w-full text-sm px-2.5 py-1.5 border border-neutral-200 rounded-lg outline-none focus:border-neutral-400" />
                    </div>
                  </>
                )}
                {workMeta?.source === "work" && (
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-neutral-400 block mb-0.5">Year</label>
                    <input type="number" value={workDraft.year} onChange={e => setWorkDraft(d => ({ ...d, year: e.target.value }))}
                      placeholder="e.g. 2019" className="w-full text-sm px-2.5 py-1.5 border border-neutral-200 rounded-lg outline-none focus:border-neutral-400" />
                  </div>
                )}
                {workSaveError && <p className="text-xs text-red-500">{workSaveError}</p>}
                <div className="flex gap-2">
                  <button onClick={saveWork} disabled={savingWork} className="text-xs px-3 py-1 bg-neutral-900 text-white rounded-full disabled:opacity-50">Save</button>
                  <button onClick={() => { setEditingWork(false); setWorkSaveError(null); }} className="text-xs px-3 py-1 text-neutral-500 hover:text-neutral-700">Cancel</button>
                </div>
              </div>
            )}
            {hasRoles && !editingRoles && (
              <p
                className={`text-sm mb-2 ${roles.length ? "text-neutral-500" : "text-neutral-300 italic"} ${!isGuest ? "cursor-pointer hover:text-neutral-700" : ""}`}
                onClick={() => { if (!isGuest) { setDraftRoles([...roles]); setEditingRoles(true); } }}
              >
                {roles.length ? roles.join(" · ") : "Add roles…"}
              </p>
            )}
            {hasRoles && editingRoles && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[...vocab, ...draftRoles.filter(r => !vocab.includes(r))].map(r => (
                    <button key={r} onClick={() => setDraftRoles(d => d.includes(r) ? d.filter(x => x !== r) : [...d, r])}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${draftRoles.includes(r) ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400"}`}>
                      {r}
                    </button>
                  ))}
                </div>
                <form className="flex gap-1.5 mb-2" onSubmit={e => {
                  e.preventDefault();
                  const v = customInput.trim();
                  if (v && !draftRoles.includes(v)) setDraftRoles(d => [...d, v]);
                  setCustomInput("");
                }}>
                  <input value={customInput} onChange={e => setCustomInput(e.target.value)} placeholder="Add custom role…"
                    className="text-xs px-2.5 py-1 border border-neutral-200 rounded-full flex-1 min-w-0 outline-none focus:border-neutral-400" />
                  <button type="submit" className="text-xs px-2.5 py-1 border border-neutral-200 rounded-full text-neutral-500 hover:border-neutral-400">+</button>
                </form>
                <div className="flex gap-2">
                  <button onClick={saveRoles} disabled={savingRoles} className="text-xs px-3 py-1 bg-neutral-900 text-white rounded-full disabled:opacity-50">Save</button>
                  <button onClick={() => { setEditingRoles(false); setCustomInput(""); }} className="text-xs px-3 py-1 text-neutral-500 hover:text-neutral-700">Cancel</button>
                </div>
              </div>
            )}
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

function ReviewSection({ eventId, review, links, rating, ratingContext, onSaveReview, onRate }: {
  eventId: string; review: string | null; links: Array<{ url: string; label?: string; description?: string }> | null;
  rating: number | null; ratingContext: string | null;
  onSaveReview: (text: string | null) => void; onRate: (r: number | null) => void;
}) {
  const storageKey = `review_draft_${eventId}`;
  const [draft, setDraft] = useState(() => { try { return localStorage.getItem(storageKey) ?? review ?? ""; } catch { return review ?? ""; } });
  const [editing, setEditing] = useState(() => { try { return !!localStorage.getItem(storageKey); } catch { return false; } });
  const enthusiasmPrompt = useMemo(() => REVIEW_PROMPTS_ENTHUSIASM[Math.floor(Math.random() * REVIEW_PROMPTS_ENTHUSIASM.length)], []);
  const reflectionPrompt = useMemo(() => REVIEW_PROMPTS_REFLECTION[Math.floor(Math.random() * REVIEW_PROMPTS_REFLECTION.length)], []);
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
        <div className="flex items-center gap-2"><EditableRating rating={rating} onRate={onRate} />{ratingContext && <RatingContextBadge context={ratingContext} />}</div>
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea value={draft} onChange={(e) => { setDraft(e.target.value); try { localStorage.setItem(storageKey, e.target.value); } catch {} }} placeholder="Write something…" autoFocus rows={4} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-700 resize-y focus:outline-none focus:border-neutral-400 font-serif leading-relaxed min-h-[6rem]" />
          <div className="space-y-1 pb-1">
            <p className="text-xs text-neutral-300 italic">{enthusiasmPrompt}</p>
            <p className="text-xs text-neutral-300 italic">{reflectionPrompt}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { onSaveReview(draft.trim() || null); try { localStorage.removeItem(storageKey); } catch {} setEditing(false); }} className="flex items-center gap-1 text-xs text-neutral-700 border border-neutral-300 rounded px-2.5 py-1 hover:bg-neutral-50"><IconCheck size={12} /> Save</button>
            <button onClick={() => { setDraft(review ?? ""); try { localStorage.removeItem(storageKey); } catch {} setEditing(false); }} className="text-xs text-neutral-400">Cancel</button>
            {review && <button onClick={() => { setDraft(""); onSaveReview(null); try { localStorage.removeItem(storageKey); } catch {} setEditing(false); }} className="text-xs text-neutral-300 hover:text-red-400 ml-auto">Remove</button>}
          </div>
        </div>
      ) : (
        <>
          {links && links.map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 border border-neutral-100 rounded-lg px-3 py-2.5 mb-2 hover:border-neutral-300 transition-colors group text-left no-underline">
              <IconExternalLink size={14} className="text-neutral-300 group-hover:text-neutral-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-neutral-700 truncate">{link.label ?? link.url}</div>
                <div className="text-xs text-neutral-400 truncate">{link.description ?? (() => { try { return new URL(link.url).hostname; } catch { return link.url; } })()}</div>
              </div>
            </a>
          ))}
          {review && <button onClick={() => { setDraft(review); setEditing(true); }} className="w-full text-left group mb-3"><p className="text-sm font-serif text-neutral-900 leading-relaxed border-l-2 border-neutral-400 pl-3 whitespace-pre-wrap group-hover:border-neutral-700 transition-colors">{review}</p></button>}
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
  const [detailError, setDetailError] = useState<string | null>(null);
  const [navTarget, setNavTarget] = useState<NavTarget | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = useCallback((kind: NavKind, id: string, hint?: string) => setNavTarget({ kind, id, hint }), []);

  useEffect(() => {
    if (!eventId) return;
    setDetailLoading(true);
    setEvent(null);
    setDetailError(null);
    fetchEvent(eventId)
      .then(setEvent)
      .catch((err) => setDetailError(err?.message ?? "Failed to load event"))
      .finally(() => setDetailLoading(false));
  }, [eventId, refreshKey]);

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
                    <div className="flex items-start gap-2 mb-1">
                      {(() => { const fn = (("festival_name" in e ? e.festival_name : (e as EventDetail).festival?.name) ?? "").toLowerCase(); return fn.includes("edinburgh") && fn.includes("fringe"); })() && (() => {
                        const year = e.date.slice(0, 4);
                        const img = <img src="/logo-ed-fringe-roundel.svg" width="20" height="20" alt="Edinburgh Fringe" className="flex-shrink-0 mt-1" />;
                        if (year === "2026") return <a href="/fringe/2026" title="Edinburgh Fringe 2026 — your year in review" className="hover:opacity-70 transition-opacity flex-shrink-0">{img}</a>;
                        const festivalId = event?.festival?.id ?? ("festival_id" in e ? e.festival_id : null);
                        if (festivalId) return <button onClick={() => navigate("festival", festivalId)} title="Edinburgh Fringe — all events" className="hover:opacity-70 transition-opacity flex-shrink-0 active:opacity-50">{img}</button>;
                        return img;
                      })()}
                      <h2 className="font-serif text-2xl text-neutral-900 leading-snug">{e.title}</h2>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-neutral-400">
                      <span>{formatDate(e.date)}{e.date.slice(0, 4) !== new Date().getFullYear().toString() && `, ${e.date.slice(0, 4)}`}</span>
                      {e.time && <span>{e.time.slice(0, 5)}</span>}
                    </div>
                    {parseInt(e.date.slice(0, 4)) < 2025 && <div className="mt-1.5 text-[10px] uppercase tracking-widest text-amber-500">Data may be incomplete for pre-2025 events</div>}
                  </div>
                );
              })()}

              {detailError && !event && (
                <div className="text-sm text-red-400 border border-red-100 rounded-lg px-4 py-3">{detailError}</div>
              )}

              {/* Details that require the full event fetch */}
              {event ? (
                <>
                  {isGuest ? (
                    (event.review || event.rating || (event.links && event.links.length > 0)) ? (
                      <div className="border-t border-b border-neutral-100 pt-4 pb-4 space-y-3">
                        <div className="text-[10px] uppercase tracking-widest text-neutral-400">My take</div>
                        {event.rating !== null && <div className="text-sm text-neutral-500">{event.rating}★{event.rating_context && <span className="text-neutral-300 ml-2 text-xs">{event.rating_context}</span>}</div>}
                        {event.links?.map((link, i) => (
                          <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 border border-neutral-100 rounded-lg px-3 py-2.5 mb-2 hover:border-neutral-300 transition-colors group text-left no-underline">
                            <IconExternalLink size={14} className="text-neutral-300 group-hover:text-neutral-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-neutral-700 truncate">{link.label ?? link.url}</div>
                              <div className="text-xs text-neutral-400 truncate">{(() => { try { return new URL(link.url).hostname; } catch { return link.url; } })()}</div>
                            </div>
                          </a>
                        ))}
                        {event.review && <p className="text-sm font-serif text-neutral-900 leading-relaxed border-l-2 border-neutral-300 pl-3 whitespace-pre-wrap">{event.review}</p>}
                      </div>
                    ) : null
                  ) : (
                    <ReviewSection
                      eventId={event.id} review={event.review} links={event.links} rating={event.rating} ratingContext={event.rating_context}
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

                  {event.extension && <ExtensionFields extension={event.extension} type={event.type} onPersonClick={(id) => navigate("person", id)} onEnsembleClick={(id) => navigate("ensemble", id)} onWorkClick={(id) => navigate("work", id)} onPieceClick={(id) => navigate("piece", id)} />}

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
