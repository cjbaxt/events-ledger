import { useState, useEffect, useCallback } from "react";
import { IconX, IconExternalLink, IconStar, IconStarFilled, IconChevronLeft } from "@tabler/icons-react";
import {
  fetchEvent, fetchPerson, fetchPersonEvents,
  fetchVenue, fetchVenueEvents,
  fetchEnsemble, fetchEnsembleEvents,
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

function RatingStars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) =>
        n <= rating ? (
          <IconStarFilled key={n} size={14} className="text-neutral-700" />
        ) : (
          <IconStar key={n} size={14} className="text-neutral-300" />
        )
      )}
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

function BalletProgrammeItem({
  item,
  onPersonClick,
}: {
  item: Record<string, unknown>;
  onPersonClick: (id: string) => void;
}) {
  const work = item.work as NamedObj | null;
  const choreographer = item.choreographer as NamedObj | null;
  const music = item.music as NamedObj[] | null;
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
        <div className="text-xs text-neutral-400 mt-0.5 ml-4">
          {music.map((m) => namedStr(m)).join(", ")}
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

type WorkObj = { id: string; title: string; creator?: string | null; year?: number | null; notes?: string | null };
type CastObj = Record<string, string | string[]>;

function WorkField({ work }: { work: WorkObj }) {
  return (
    <div>
      <Field label="Work">
        <span className="text-neutral-800 font-medium">{work.title}</span>
        {work.creator && <span className="text-neutral-500"> — {work.creator}</span>}
        {work.year && <span className="text-neutral-400 text-xs ml-2">({work.year})</span>}
      </Field>
      {work.notes && <p className="text-xs text-neutral-400 mt-1">{work.notes}</p>}
    </div>
  );
}

function CastField({ cast }: { cast: CastObj }) {
  const entries = Object.entries(cast);
  if (!entries.length) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Cast</div>
      <dl className="space-y-1">
        {entries.map(([role, name]) => (
          <div key={role} className="flex gap-2 text-sm">
            <dt className="text-neutral-400 min-w-0 shrink-0 w-40 truncate">{role}</dt>
            <dd className="text-neutral-700">{Array.isArray(name) ? name.join(", ") : name}</dd>
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
  const skip = new Set(["id", "event_id", "subtype"]);
  const programme = extension.programme as Record<string, unknown>[] | null;
  const work = extension.work as WorkObj | null;
  const cast = extension.cast as CastObj | null;

  const personFields = new Set(["conductor", "director", "choreographer", "headliner", "host", "performer", "playwright"]);
  const personListFields = new Set(["composers", "soloists", "speakers", "performers", "support_acts", "supporting_cast", "artists"]);
  const ensembleFields = new Set(["ensemble", "company", "orchestra"]);

  const scalarEntries = Object.entries(extension).filter(
    ([k, v]) => !skip.has(k) && k !== "programme" && k !== "work" && k !== "cast" && v !== null
  );

  return (
    <div className="space-y-4 pt-4 border-t border-neutral-100">
      {work && <WorkField work={work} />}

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

      {cast && <CastField cast={cast} />}
    </div>
  );
}

// ── Generic sub-panel for person/venue/ensemble event lists ────────────────

type NavKind = "person" | "venue" | "ensemble";

interface NavTarget {
  kind: NavKind;
  id: string;
}

const NAV_LABELS: Record<NavKind, string> = {
  person: "Person",
  venue: "Venue",
  ensemble: "Ensemble",
};

async function fetchNavName(kind: NavKind, id: string): Promise<string> {
  if (kind === "person") return (await fetchPerson(id)).name;
  if (kind === "venue") return (await fetchVenue(id)).name;
  return (await fetchEnsemble(id)).name;
}

async function fetchNavEvents(kind: NavKind, id: string): Promise<EventListItem[]> {
  if (kind === "person") return fetchPersonEvents(id);
  if (kind === "venue") return fetchVenueEvents(id);
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

export default function EventDetailPanel() {
  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [navTarget, setNavTarget] = useState<NavTarget | null>(null);

  const navigate = useCallback((kind: NavKind, id: string) => setNavTarget({ kind, id }), []);
  const backToEvent = useCallback(() => setNavTarget(null), []);

  const close = useCallback(() => {
    setOpen(false);
    setNavTarget(null);
    if (window.location.pathname.startsWith("/events/")) {
      window.history.back();
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
    window.addEventListener("open-event", onOpenEvent);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("open-event", onOpenEvent);
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
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <Field label="Venue">
                        <button
                          onClick={() => navigate("venue", event.venue.id)}
                          className="hover:text-neutral-900 hover:underline underline-offset-2 transition-colors"
                        >
                          {event.venue.name}
                        </button>
                      </Field>
                      {event.venue_parent && (
                        <div className="text-xs text-neutral-400">
                          <button
                            onClick={() => navigate("venue", event.venue_parent!.id)}
                            className="hover:text-neutral-700 hover:underline underline-offset-2 transition-colors"
                          >
                            {event.venue_parent.name}
                          </button>
                        </div>
                      )}
                    </div>
                    {event.rating && (
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-[10px] uppercase tracking-widest text-neutral-400">Rating</div>
                        <RatingStars rating={event.rating} />
                      </div>
                    )}
                  </div>

                  {event.festival && (
                    <Field label="Festival">{event.festival.name}</Field>
                  )}

                  {event.price_paid && (
                    <Field label="Price paid">
                      {event.currency ? `${event.currency} ${event.price_paid}` : event.price_paid}
                    </Field>
                  )}

                  {event.notes && (
                    <Field label="Notes">
                      <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap">{event.notes}</p>
                    </Field>
                  )}

                  {event.substack_url && (
                    <a
                      href={event.substack_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 border border-neutral-200 hover:border-neutral-400 rounded-full px-3 py-1.5 transition-colors"
                    >
                      <IconExternalLink size={12} />
                      Read on Substack
                    </a>
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
