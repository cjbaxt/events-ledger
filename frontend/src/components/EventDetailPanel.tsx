import { useState, useEffect, useCallback } from "react";
import { isEditor } from "../lib/editor";
import { IconX, IconExternalLink, IconChevronLeft, IconPencil, IconCheck, IconX as IconClose, IconWriting, IconArticle } from "@tabler/icons-react";
import {
  fetchEvent, fetchPerson, fetchPersonEvents,
  fetchVenue, fetchVenueEvents,
  fetchEnsemble, fetchEnsembleEvents,
  fetchFestival, fetchFestivalEvents,
  patchEventRating, patchEventPrice, patchEventReview,
} from "../lib/api";
import type { EventListItem, EventDetail } from "../types/events";
import EventTypeIcon from "./EventTypeIcon";

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDate(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return `${parseInt(d)} ${MONTH_NAMES[parseInt(m)]}`;
}

// SVG star with horizontal clip for half-star
function StarSvg({ fill, size = 14 }: { fill: number; size?: number }) {
  const id = `clip-panel-${Math.random().toString(36).slice(2)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <defs>
        <clipPath id={id}>
          <rect x="0" y="0" width={14 * fill} height="14" />
        </clipPath>
      </defs>
      <path
        d="M7 1l1.545 3.09L12 4.635l-2.5 2.41.59 3.41L7 8.77l-3.09 1.685.59-3.41L2 4.635l3.455-.545L7 1z"
        stroke="currentColor" strokeWidth="1" strokeLinejoin="round"
        className="text-neutral-300"
      />
      {fill > 0 && (
        <path
          d="M7 1l1.545 3.09L12 4.635l-2.5 2.41.59 3.41L7 8.77l-3.09 1.685.59-3.41L2 4.635l3.455-.545L7 1z"
          fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"
          clipPath={`url(#${id})`}
          className="text-neutral-700"
        />
      )}
    </svg>
  );
}

function EditableRating({
  rating,
  onRate,
}: {
  rating: number | null;
  onRate: (r: number | null) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const displayed = hover ?? rating ?? 0;
  return (
    <div className="flex gap-0.5" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.min(1, Math.max(0, displayed - (star - 1)));
        return (
          <div
            key={star}
            className="cursor-pointer"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHover(e.clientX - rect.left < rect.width / 2 ? star - 0.5 : star);
            }}
            onClick={() => {
              const next = hover ?? null;
              onRate(next === rating ? null : next);
            }}
          >
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

function namedStr(obj: NamedObj) {
  return obj.name ?? obj.title ?? "";
}

function ClickableRef({
  obj,
  onClick,
}: {
  obj: NamedObj;
  onClick?: (id: string) => void;
}) {
  const name = namedStr(obj);
  if (!onClick) return <span>{name}</span>;
  return (
    <button
      onClick={() => onClick(obj.id)}
      className="hover:text-neutral-900 hover:underline underline-offset-2 transition-colors"
    >
      {name}
    </button>
  );
}

type MusicItem = { id: string; title: string | null; composer?: NamedObj | null; composer_text?: string | null };

function BalletProgrammeItem({
  item,
  onPersonClick,
}: {
  item: Record<string, unknown>;
  onPersonClick: (id: string) => void;
}) {
  const work = item.work as NamedObj | null;
  const choreographer = item.choreographer as NamedObj | null;
  const music = item.music as MusicItem[] | null;
  const soloists = item.soloists as NamedObj[] | null;
  const order = item.order as number;

  return (
    <li className="text-sm">
      <span className="text-neutral-400 mr-2">{order}.</span>
      <span className="text-neutral-800 font-medium">{work ? namedStr(work) : "—"}</span>
      {choreographer && (
        <span className="text-neutral-500"> — <ClickableRef obj={choreographer} onClick={onPersonClick} /></span>
      )}
      {music && music.length > 0 && (
        <div className="text-xs text-neutral-400 mt-0.5 ml-4 space-y-0.5">
          {music.map((m) => (
            <div key={m.id}>
              <span>{m.title ?? "—"}</span>
              {m.composer ? (
                <span> — <ClickableRef obj={m.composer} onClick={onPersonClick} /></span>
              ) : m.composer_text ? (
                <span> — {m.composer_text}</span>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {soloists && soloists.length > 0 && (
        <div className="text-xs text-neutral-400 mt-0.5 ml-4">
          Soloists: {soloists.map((s, i) => (
            <span key={s.id}>{i > 0 && ", "}<ClickableRef obj={s} onClick={onPersonClick} /></span>
          ))}
        </div>
      )}
    </li>
  );
}

function ClassicalProgrammeItem({
  item,
  onPersonClick,
}: {
  item: Record<string, unknown>;
  onPersonClick: (id: string) => void;
}) {
  const piece = item.piece as NamedObj | null;
  const notes = item.notes as string | null;
  const order = item.order as number;
  const soloists = item.soloists as NamedObj[] | null;
  const work = item.work as NamedObj | null;
  const composer = item.composer as NamedObj | null;

  const title = piece ? namedStr(piece) : work ? namedStr(work) : null;

  return (
    <li className="text-sm">
      <span className="text-neutral-400 mr-2">{order}.</span>
      <span className="text-neutral-800">{title ?? "—"}</span>
      {composer && <span className="text-neutral-500"> — <ClickableRef obj={composer} onClick={onPersonClick} /></span>}
      {notes && <span className="text-neutral-400 text-xs ml-2">({notes})</span>}
      {soloists && soloists.length > 0 && (
        <div className="text-xs text-neutral-400 mt-0.5 ml-4">
          Soloists: {soloists.map((s, i) => (
            <span key={s.id}>{i > 0 && ", "}<ClickableRef obj={s} onClick={onPersonClick} /></span>
          ))}
        </div>
      )}
    </li>
  );
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
            ? <button onClick={() => onPersonClick(work.creator_id!)} className="hover:text-neutral-900 hover:underline underline-offset-2 transition-colors">{work.creator}</button>
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
    if (typeof entry === "object" && onPersonClick) {
      return (
        <button
          onClick={() => onPersonClick(entry.id)}
          className="hover:text-neutral-900 hover:underline underline-offset-2 transition-colors"
        >
          {entry.name}
        </button>
      );
    }
    return <span>{typeof entry === "object" ? entry.name : entry}</span>;
  }

  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Cast</div>
      <dl className="space-y-1">
        {entries.map(([role, val]) => (
          <div key={role} className="flex gap-2 text-sm">
            <dt className="text-neutral-400 min-w-0 shrink-0 w-40 truncate">{role}</dt>
            <dd className="text-neutral-700">
              {Array.isArray(val)
                ? val.map((entry, i) => <span key={i}>{i > 0 && ", "}{renderEntry(entry)}</span>)
                : renderEntry(val)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ExtensionFields({
  extension,
  type,
  onPersonClick,
  onEnsembleClick,
}: {
  extension: Record<string, unknown>;
  type: string;
  onPersonClick: (id: string) => void;
  onEnsembleClick: (id: string) => void;
}) {
  const typesThatHideNotes = new Set(["opera", "circus"]);
  const skip = new Set(["id", "event_id", "subtype", "setlist", "setlist_fm_url", "credits",
    ...(typesThatHideNotes.has(type) ? ["notes", "notes_on_performance"] : []),
  ]);

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

  const scalarEntries = Object.entries(extension).filter(
    ([k, v]) => !skip.has(k) && k !== "programme" && k !== "work" && k !== "cast" && v !== null
  );

  // Group credits by role, preserving order of first appearance
  const creditsByRole: Map<string, NamedObj[]> = new Map();
  if (credits) {
    for (const c of credits) {
      if (!creditsByRole.has(c.role)) creditsByRole.set(c.role, []);
      creditsByRole.get(c.role)!.push(c.person);
    }
  }

  return (
    <div className="space-y-4 pt-4 border-t border-neutral-100">
      {work && <WorkField work={work} onPersonClick={onPersonClick} />}

      {scalarEntries.map(([key, val]) => {
        if (val === null || val === undefined) return null;

        // Clickable person (single)
        if (personFields.has(key) && typeof val === "object" && !Array.isArray(val) && "id" in (val as object)) {
          return (
            <Field key={key} label={key.replace(/_/g, " ")}>
              <ClickableRef obj={val as NamedObj} onClick={onPersonClick} />
            </Field>
          );
        }

        // Clickable ensemble (single)
        if (ensembleFields.has(key) && typeof val === "object" && !Array.isArray(val) && "id" in (val as object)) {
          return (
            <Field key={key} label={key.replace(/_/g, " ")}>
              <ClickableRef obj={val as NamedObj} onClick={onEnsembleClick} />
            </Field>
          );
        }

        // Clickable ensembles (list)
        if (ensembleListFields.has(key) && Array.isArray(val)) {
          const items = val as NamedObj[];
          if (!items.length) return null;
          return (
            <Field key={key} label={key.replace(/_/g, " ")}>
              <span className="text-neutral-600">
                {items.map((e, i) => (
                  <span key={e.id}>{i > 0 && ", "}<ClickableRef obj={e} onClick={onEnsembleClick} /></span>
                ))}
              </span>
            </Field>
          );
        }

        // Clickable persons (list)
        if (personListFields.has(key) && Array.isArray(val)) {
          const items = val as NamedObj[];
          if (!items.length) return null;
          return (
            <Field key={key} label={key.replace(/_/g, " ")}>
              <span className="text-neutral-600">
                {items.map((p, i) => (
                  <span key={p.id}>{i > 0 && ", "}<ClickableRef obj={p} onClick={onPersonClick} /></span>
                ))}
              </span>
            </Field>
          );
        }

        // Generic display
        let display: string | null = null;
        if (typeof val === "string") display = val;
        else if (typeof val === "number") display = String(val);
        else if (typeof val === "object" && !Array.isArray(val)) {
          const obj = val as Record<string, unknown>;
          if ("name" in obj || "title" in obj) display = namedStr(obj as NamedObj);
        } else if (Array.isArray(val)) {
          const names = (val as unknown[]).map((item) => {
            if (typeof item === "object" && item !== null) {
              const obj = item as Record<string, unknown>;
              if ("name" in obj || "title" in obj) return namedStr(obj as NamedObj);
            }
            return String(item);
          }).filter(Boolean);
          display = names.join(", ") || null;
        }

        if (!display) return null;
        return (
          <Field key={key} label={key.replace(/_/g, " ")}>
            <span className="text-neutral-600">{display}</span>
          </Field>
        );
      })}

      {programme && programme.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Programme</div>
          <ol className="space-y-2">
            {programme.map((item, i) =>
              type === "ballet" ? (
                <BalletProgrammeItem key={i} item={item} onPersonClick={onPersonClick} />
              ) : (
                <ClassicalProgrammeItem key={i} item={item} onPersonClick={onPersonClick} />
              )
            )}
          </ol>
        </div>
      )}

      {setlist && setlist.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[10px] uppercase tracking-widest text-neutral-400">Setlist</div>
            {setlistFmUrl && (
              <a
                href={setlistFmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-neutral-400 hover:text-neutral-700 flex items-center gap-1"
              >
                <IconExternalLink size={10} />
                setlist.fm
              </a>
            )}
          </div>
          <ol className="space-y-0.5">
            {setlist.map((song, i) => (
              <li key={i} className="flex items-baseline gap-2 text-sm">
                <span className="text-neutral-300 text-xs w-5 text-right flex-shrink-0">{i + 1}</span>
                <span className="text-neutral-700">{song}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {creditsByRole.size > 0 && (
        <div className="space-y-3">
          {[...creditsByRole.entries()].map(([role, persons]) => (
            <Field key={role} label={role}>
              <span className="text-neutral-600">
                {persons.map((p, i) => (
                  <span key={p.id}>{i > 0 && ", "}<ClickableRef obj={p} onClick={onPersonClick} /></span>
                ))}
              </span>
            </Field>
          ))}
        </div>
      )}

      {cast && <CastField cast={cast} onPersonClick={onPersonClick} />}
    </div>
  );
}

// ── Generic sub-panel for person/venue/ensemble event lists ────────────────

type NavKind = "person" | "venue" | "ensemble" | "festival";

interface NavTarget {
  kind: NavKind;
  id: string;
}

const NAV_LABELS: Record<NavKind, string> = {
  person: "Person",
  venue: "Venue",
  ensemble: "Ensemble",
  festival: "Festival",
};

async function fetchNavName(kind: NavKind, id: string): Promise<string> {
  if (kind === "person") return (await fetchPerson(id)).name;
  if (kind === "venue") return (await fetchVenue(id)).name;
  if (kind === "festival") {
    const f = await fetchFestival(id);
    return [f.name, f.edition].filter(Boolean).join(" ");
  }
  return (await fetchEnsemble(id)).name;
}

async function fetchNavEvents(kind: NavKind, id: string): Promise<EventListItem[]> {
  if (kind === "person") return fetchPersonEvents(id);
  if (kind === "venue") return fetchVenueEvents(id);
  if (kind === "festival") return fetchFestivalEvents(id);
  return fetchEnsembleEvents(id);
}

function NavEventsView({
  target,
  onBack,
  onEventClick,
}: {
  target: NavTarget;
  onBack: () => void;
  onEventClick: (id: string) => void;
}) {
  const [name, setName] = useState<string>("");
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchNavName(target.kind, target.id), fetchNavEvents(target.kind, target.id)])
      .then(([n, evts]) => { setName(n); setEvents(evts); })
      .finally(() => setLoading(false));
  }, [target.kind, target.id]);

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
        >
          <IconChevronLeft size={14} />
          Back
        </button>
        <div className="text-xs uppercase tracking-widest text-neutral-400">{NAV_LABELS[target.kind]}</div>
        <div className="w-14" />
      </div>

      <div className="overflow-y-auto h-[calc(100%-57px)] px-6 py-5">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-neutral-300 text-xs uppercase tracking-widest">Loading…</div>
        ) : (
          <>
            <h2 className="font-serif text-2xl text-neutral-900 mb-1">{name}</h2>
            <p className="text-xs text-neutral-400 mb-5 uppercase tracking-widest">{events.length} event{events.length !== 1 ? "s" : ""}</p>
            <div className="space-y-2">
              {events.length === 0 && <p className="text-sm text-neutral-400">No events found.</p>}
              {events.map((e) => {
                const [yr, m, d] = e.date.split("-");
                return (
                  <button
                    key={e.id}
                    onClick={() => onEventClick(e.id)}
                    className="w-full text-left bg-white border border-neutral-100 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-neutral-300 transition-colors group"
                  >
                    <div className="w-8 h-8 border border-neutral-200 rounded-full flex items-center justify-center flex-shrink-0 text-neutral-400 group-hover:text-neutral-600 transition-colors">
                      <EventTypeIcon type={e.type} size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-serif text-sm font-medium text-neutral-900 truncate">{e.title}</div>
                      <div className="text-xs text-neutral-400 mt-0.5">{e.venue_name}</div>
                    </div>
                    <div className="text-xs text-neutral-400 flex-shrink-0">{parseInt(d)} {MONTH_NAMES[parseInt(m)]} {yr}</div>
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

function PriceEditor({
  price,
  currency,
  onSave,
}: {
  price: string | null;
  currency: string | null;
  onSave: (price: string, currency: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(price ?? "");
  const [cur, setCur] = useState(currency ?? "EUR");

  if (!editing) {
    return (
      <Field label="Price paid">
        <button
          onClick={() => setEditing(true)}
          className="hover:underline underline-offset-2 text-neutral-600"
        >
          {price ? `${cur} ${price}` : <span className="text-neutral-300 italic">Add price…</span>}
        </button>
      </Field>
    );
  }
  return (
    <Field label="Price paid">
      <div className="flex items-center gap-2">
        <select
          value={cur}
          onChange={(e) => setCur(e.target.value)}
          className="border border-neutral-200 rounded px-1.5 py-1 text-xs text-neutral-700 bg-white"
        >
          {["EUR", "GBP", "USD"].map((c) => <option key={c}>{c}</option>)}
        </select>
        <input
          type="number"
          step="0.01"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="border border-neutral-200 rounded px-2 py-1 text-xs w-24 text-neutral-700"
          autoFocus
        />
        <button
          onClick={() => { onSave(val, cur); setEditing(false); }}
          className="text-xs text-neutral-700 border border-neutral-300 rounded px-2 py-1 hover:bg-neutral-50"
        >
          Save
        </button>
        <button onClick={() => setEditing(false)} className="text-xs text-neutral-400">Cancel</button>
      </div>
    </Field>
  );
}

function ReviewSection({
  review,
  links,
  rating,
  onSaveReview,
  onRate,
  editable = true,
}: {
  review: string | null;
  links: Array<{ url: string; label?: string }> | null;
  rating: number | null;
  onSaveReview: (text: string | null) => void;
  onRate: (r: number | null) => void;
  editable?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(review ?? "");

  function save() {
    const trimmed = draft.trim() || null;
    onSaveReview(trimmed);
    setEditing(false);
  }

  function cancel() {
    setDraft(review ?? "");
    setEditing(false);
  }

  const hasContent = review || (links && links.length > 0);
  const hasEssay = !!(links && links.some(l => l.url?.includes("substack")));

  return (
    <div className="border-t border-b border-neutral-100 pt-4 pb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-neutral-400">
          {review && <IconWriting size={12} className="text-neutral-400" />}
          {hasEssay && <IconArticle size={12} className="text-neutral-400" />}
          My take
        </div>
        {!editing && editable && (
          <EditableRating rating={rating} onRate={onRate} />
        )}
        {!editing && !editable && rating && (
          <div className="text-xs text-neutral-400">{rating} ★</div>
        )}
      </div>

      {editing && editable ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write something…"
            autoFocus
            rows={4}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-700 resize-none focus:outline-none focus:border-neutral-400 font-serif leading-relaxed"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              className="flex items-center gap-1 text-xs text-neutral-700 border border-neutral-300 rounded px-2.5 py-1 hover:bg-neutral-50"
            >
              <IconCheck size={12} /> Save
            </button>
            <button onClick={cancel} className="text-xs text-neutral-400 hover:text-neutral-600">
              Cancel
            </button>
            {review && (
              <button
                onClick={() => { setDraft(""); onSaveReview(null); setEditing(false); }}
                className="text-xs text-neutral-300 hover:text-red-400 ml-auto"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {review && (
            editable ? (
              <button
                onClick={() => { setDraft(review); setEditing(true); }}
                className="w-full text-left group mb-3"
              >
                <p className="text-sm font-serif text-neutral-700 leading-relaxed border-l-2 border-neutral-200 pl-3 whitespace-pre-wrap group-hover:border-neutral-400 transition-colors">
                  {review}
                </p>
              </button>
            ) : (
              <p className="text-sm font-serif text-neutral-700 leading-relaxed border-l-2 border-neutral-200 pl-3 whitespace-pre-wrap mb-3">
                {review}
              </p>
            )
          )}
          {links && links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 border border-neutral-100 rounded-lg px-3 py-2.5 mb-2 hover:border-neutral-300 transition-colors group text-left no-underline"
            >
              <IconExternalLink size={14} className="text-neutral-300 group-hover:text-neutral-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-neutral-700 truncate">{link.label ?? link.url}</div>
                <div className="text-xs text-neutral-400 truncate">{new URL(link.url).hostname}</div>
              </div>
            </a>
          ))}
          {!hasContent && editable && (
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-neutral-300 italic hover:text-neutral-500 transition-colors"
            >
              Add a review…
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function EventDetailPanel() {
  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [navTarget, setNavTarget] = useState<NavTarget | null>(null);
  const [editor, setEditor] = useState(() => isEditor());
  useEffect(() => {
    function sync() { setEditor(isEditor()); }
    window.addEventListener("editor-change", sync);
    return () => window.removeEventListener("editor-change", sync);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setNavTarget(null);
    if (window.location.pathname.startsWith("/events/")) {
      window.history.back();
    }
  }, []);

  const navigate = useCallback((kind: NavKind, id: string) => setNavTarget({ kind, id }), []);
  const backToEvent = useCallback(() => setNavTarget(null), []);


  // Open event from direct URL on initial load (e.g. linked from cultural dispatch)
  useEffect(() => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");

    // Direct path: /events-ledger/events/<id>
    const pathMatch = window.location.pathname.match(/\/events\/([a-f0-9-]{36})/);
    if (pathMatch) {
      setEventId(pathMatch[1]);
      setOpen(true);
      return;
    }

    // Redirected via 404.html: ?redirect=/events/<id>
    const redirectParam = new URLSearchParams(window.location.search).get("redirect");
    if (redirectParam) {
      const redirectMatch = redirectParam.match(/\/events\/([a-f0-9-]{36})/);
      if (redirectMatch) {
        setEventId(redirectMatch[1]);
        setOpen(true);
        window.history.replaceState({}, "", `${base}/events/${redirectMatch[1]}`);
      }
    }
  }, []);

  useEffect(() => {
    function onOpenEvent(e: Event) {
      const id = (e as CustomEvent<string>).detail;
      setEventId(id);
      setNavTarget(null);
      setOpen(true);
    }
    function onPopState() {
      if (!window.location.pathname.startsWith("/events/")) {
        setOpen(false);
      }
    }
    function makeNavOpener(kind: NavKind) {
      return (e: Event) => {
        const id = (e as CustomEvent<string>).detail;
        setEventId(null);
        setNavTarget({ kind, id });
        setOpen(true);
      };
    }
    const onOpenPerson = makeNavOpener("person");
    const onOpenEnsemble = makeNavOpener("ensemble");
    const onOpenVenue = makeNavOpener("venue");
    const onOpenFestival = makeNavOpener("festival");
    window.addEventListener("open-event", onOpenEvent);
    window.addEventListener("open-person", onOpenPerson);
    window.addEventListener("open-ensemble", onOpenEnsemble);
    window.addEventListener("open-venue", onOpenVenue);
    window.addEventListener("open-festival", onOpenFestival);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("open-event", onOpenEvent);
      window.removeEventListener("open-person", onOpenPerson);
      window.removeEventListener("open-ensemble", onOpenEnsemble);
      window.removeEventListener("open-venue", onOpenVenue);
      window.removeEventListener("open-festival", onOpenFestival);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    setEvent(null);
    fetchEvent(eventId)
      .then(setEvent)
      .finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        className={`fixed inset-0 bg-black/10 z-40 transition-opacity duration-200 hidden md:block ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Panel */}
      <div
        className={`fixed z-50 bg-white shadow-xl transition-transform duration-300 ease-in-out
          inset-0 md:inset-auto md:top-0 md:right-0 md:bottom-0 md:w-[480px]
          ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <button
          onClick={close}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-700"
        >
          <IconX size={16} />
        </button>

        {navTarget ? (
          <NavEventsView
            target={navTarget}
            onBack={backToEvent}
            onEventClick={(id) => { setEventId(id); setEvent(null); setNavTarget(null); }}
          />
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 pr-14">
              <div className="flex items-center gap-2 text-neutral-400">
                {event && (
                  <>
                    <EventTypeIcon type={event.type} size={16} />
                    <span className="text-xs uppercase tracking-widest capitalize">
                      {event.subtype?.replace(/_/g, " ") ?? event.type.replace(/_/g, " ")}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="overflow-y-auto h-[calc(100%-57px)] px-6 py-5 space-y-5">
              {loading && (
                <div className="flex items-center justify-center h-32 text-neutral-300 text-xs uppercase tracking-widest">
                  Loading…
                </div>
              )}

              {!loading && event && (
                <>
                  <div>
                    <h2 className="font-serif text-2xl text-neutral-900 leading-snug mb-1">
                      {event.title}
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-neutral-400">
                      <span>{formatDate(event.date)}{event.date.slice(0, 4) !== new Date().getFullYear().toString() && `, ${event.date.slice(0, 4)}`}</span>
                      {event.time && <span>{event.time.slice(0, 5)}</span>}
                    </div>
                    {parseInt(event.date.slice(0, 4)) < 2025 && (
                      <div className="mt-1.5 text-[10px] uppercase tracking-widest text-amber-500">
                        Data may be incomplete for pre-2025 events
                      </div>
                    )}
                  </div>

                  <ReviewSection
                    review={event.review}
                    links={event.links}
                    rating={event.rating}
                    editable={editor}
                    onSaveReview={(text) => {
                      setEvent((prev) => prev ? { ...prev, review: text } : prev);
                      patchEventReview(event.id, text).catch(() =>
                        fetchEvent(event.id).then(setEvent)
                      );
                    }}
                    onRate={(r) => {
                      setEvent((prev) => prev ? { ...prev, rating: r } : prev);
                      patchEventRating(event.id, r).catch(() =>
                        fetchEvent(event.id).then(setEvent)
                      );
                    }}
                  />

                  <div className="space-y-0.5">
                    <Field label="Venue">
                      <button
                        onClick={() => navigate("venue", event.venue.id)}
                        className="hover:text-neutral-900 hover:underline underline-offset-2 transition-colors"
                      >
                        {event.venue.name}
                      </button>
                    </Field>
                    {event.venue_path.map((v) => (
                      <div key={v.id} className="text-xs text-neutral-400">
                        <button
                          onClick={() => navigate("venue", v.id)}
                          className="hover:text-neutral-700 hover:underline underline-offset-2 transition-colors"
                        >
                          {v.name}
                        </button>
                      </div>
                    ))}
                  </div>

                  {event.festival && (
                    <Field label="Festival">
                      <button
                        onClick={() => navigate("festival", event.festival!.id)}
                        className="hover:text-neutral-900 hover:underline underline-offset-2 transition-colors"
                      >
                        {event.festival.name}
                      </button>
                    </Field>
                  )}

                  {event.payment_method ? (
                    <Field label="Payment method">
                      <span className="text-neutral-700">{event.payment_method.name}</span>
                      {event.price_paid && (
                        <span className="text-neutral-400 text-xs ml-2">
                          + {event.currency ?? "EUR"} {event.price_paid} surcharge
                        </span>
                      )}
                    </Field>
                  ) : editor ? (
                    <PriceEditor
                      price={event.price_paid}
                      currency={event.currency}
                      onSave={(price, currency) => {
                        setEvent((prev) => prev ? { ...prev, price_paid: price, currency } : prev);
                        patchEventPrice(event.id, price, currency).catch(() =>
                          fetchEvent(event.id).then(setEvent)
                        );
                      }}
                    />
                  ) : event.price_paid ? (
                    <Field label="Price paid">
                      <span className="text-neutral-700">{event.currency ?? "EUR"} {event.price_paid}</span>
                    </Field>
                  ) : null}

                  {event.notes && (
                    <Field label="Notes">
                      <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap">{event.notes}</p>
                    </Field>
                  )}

                  {event.related_events && event.related_events.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Also visited</div>
                      <div className="space-y-1.5">
                        {event.related_events.map((rel) => {
                          const [yr, m, d] = rel.date.split("-");
                          return (
                            <button
                              key={rel.id}
                              onClick={() => { setEventId(rel.id); setEvent(null); setNavTarget(null); }}
                              className="w-full text-left flex items-center gap-3 bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2 hover:border-neutral-300 transition-colors group"
                            >
                              <div className="w-6 h-6 border border-neutral-200 rounded-full flex items-center justify-center flex-shrink-0 text-neutral-400 group-hover:text-neutral-600 transition-colors">
                                <EventTypeIcon type={rel.type} size={12} />
                              </div>
                              <span className="font-serif text-sm text-neutral-800 flex-1 truncate">{rel.title}</span>
                              <span className="text-xs text-neutral-400 flex-shrink-0">{parseInt(d)} {MONTH_NAMES[parseInt(m)]} {yr}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {event.extension && (
                    <ExtensionFields
                      extension={event.extension}
                      type={event.type}
                      onPersonClick={(id) => navigate("person", id)}
                      onEnsembleClick={(id) => navigate("ensemble", id)}
                    />
                  )}


                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
