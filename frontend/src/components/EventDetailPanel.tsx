import { useState, useEffect, useCallback } from "react";
import { IconX, IconExternalLink, IconStar, IconStarFilled } from "@tabler/icons-react";
import { fetchEvent } from "../lib/api";
import type { EventDetail } from "../types/events";
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

function namedList(arr: NamedObj[]) {
  return arr.map(namedStr).filter(Boolean).join(", ");
}

// Render a ballet programme item:
// "1. Empire Noir — David Dawson (Empire Noir (original score))"
function BalletProgrammeItem({ item }: { item: Record<string, unknown> }) {
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
        <span className="text-neutral-500"> — {namedStr(choreographer)}</span>
      )}
      {music && music.length > 0 && (
        <div className="text-xs text-neutral-400 mt-0.5 ml-4">
          {music.map((m) => namedStr(m)).join(", ")}
        </div>
      )}
      {soloists && soloists.length > 0 && (
        <div className="text-xs text-neutral-400 mt-0.5 ml-4">
          Soloists: {namedList(soloists)}
        </div>
      )}
    </li>
  );
}

// Render a classical/choral programme item:
// "1. Ubi Caritas  trad. Gregorian"
function ClassicalProgrammeItem({ item }: { item: Record<string, unknown> }) {
  const piece = item.piece as NamedObj | null;
  const notes = item.notes as string | null;
  const order = item.order as number;
  const soloists = item.soloists as NamedObj[] | null;
  // Some classical events use work/composer instead of piece
  const work = item.work as NamedObj | null;
  const composer = item.composer as NamedObj | null;

  const title = piece ? namedStr(piece) : work ? namedStr(work) : null;

  return (
    <li className="text-sm">
      <span className="text-neutral-400 mr-2">{order}.</span>
      <span className="text-neutral-800">{title ?? "—"}</span>
      {composer && <span className="text-neutral-500"> — {namedStr(composer)}</span>}
      {notes && <span className="text-neutral-400 text-xs ml-2">({notes})</span>}
      {soloists && soloists.length > 0 && (
        <div className="text-xs text-neutral-400 mt-0.5 ml-4">
          Soloists: {namedList(soloists)}
        </div>
      )}
    </li>
  );
}

function ExtensionFields({ extension, type }: { extension: Record<string, unknown>; type: string }) {
  const skip = new Set(["id", "event_id", "subtype"]);
  const programme = extension.programme as Record<string, unknown>[] | null;
  const scalarEntries = Object.entries(extension).filter(([k, v]) => !skip.has(k) && k !== "programme" && v !== null);

  return (
    <div className="space-y-4 pt-4 border-t border-neutral-100">
      {scalarEntries.map(([key, val]) => {
        if (val === null || val === undefined) return null;
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
                <BalletProgrammeItem key={i} item={item} />
              ) : (
                <ClassicalProgrammeItem key={i} item={item} />
              )
            )}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function EventDetailPanel() {
  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    if (window.location.pathname.startsWith("/events/")) {
      window.history.back();
    }
  }, []);

  useEffect(() => {
    function onOpenEvent(e: Event) {
      const id = (e as CustomEvent<string>).detail;
      setEventId(id);
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
      {/* Backdrop — desktop only */}
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
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
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-700"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto h-[calc(100%-57px)] px-6 py-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center h-32 text-neutral-300 text-xs uppercase tracking-widest">
              Loading…
            </div>
          )}

          {!loading && event && (
            <>
              {/* Title + date */}
              <div>
                <h2 className="font-serif text-2xl text-neutral-900 leading-snug mb-1">
                  {event.title}
                </h2>
                <div className="flex items-center gap-3 text-sm text-neutral-400">
                  <span>{formatDate(event.date)}{event.date.slice(0, 4) !== new Date().getFullYear().toString() && `, ${event.date.slice(0, 4)}`}</span>
                  {event.time && <span>{event.time.slice(0, 5)}</span>}
                </div>
              </div>

              {/* Venue + rating row */}
              <div className="flex items-start justify-between gap-4">
                <Field label="Venue">{event.venue.name}</Field>
                {event.rating && (
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-[10px] uppercase tracking-widest text-neutral-400">Rating</div>
                    <RatingStars rating={event.rating} />
                  </div>
                )}
              </div>

              {/* Festival */}
              {event.festival && (
                <Field label="Festival">{event.festival.name}</Field>
              )}

              {/* Price */}
              {event.price_paid && (
                <Field label="Price paid">
                  {event.currency ? `${event.currency} ${event.price_paid}` : event.price_paid}
                </Field>
              )}

              {/* Notes */}
              {event.notes && (
                <Field label="Notes">
                  <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap">{event.notes}</p>
                </Field>
              )}

              {/* Substack link */}
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

              {/* Type-specific extension fields */}
              {event.extension && (
                <ExtensionFields extension={event.extension} type={event.type} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
