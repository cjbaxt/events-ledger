import { useState, useEffect, useMemo, useRef } from "react";
import { fetchEvents } from "../lib/api";
import type { EventListItem } from "../types/events";
import EventTypeIcon from "./EventTypeIcon";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const GBP_TO_EUR = 1.19;
function toEur(amount: number, currency: string) {
  return currency === "GBP" ? amount * GBP_TO_EUR : amount;
}

function SpendStat({ events }: { events: EventListItem[] }) {
  const [revealed, setRevealed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = events
    .filter((e) => e.price_paid)
    .reduce((sum, e) => sum + toEur(parseFloat(e.price_paid ?? "0"), e.currency ?? "EUR"), 0);
  if (total <= 0) return null;

  function handleClick() {
    setRevealed(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setRevealed(false), 3000);
  }

  return (
    <button onClick={handleClick} className="text-right cursor-pointer">
      <div className={`font-serif text-xl text-neutral-900 transition-all duration-300 ${revealed ? "blur-none" : "blur-sm"}`}>
        €{Math.round(total)}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mt-0.5">Committed</div>
    </button>
  );
}

function groupByYearMonth(events: EventListItem[]) {
  const years: Record<string, Record<string, EventListItem[]>> = {};
  for (const e of events) {
    const [year, month] = e.date.split("-");
    if (!years[year]) years[year] = {};
    if (!years[year][month]) years[year][month] = [];
    years[year][month].push(e);
  }
  return years;
}

function UpcomingEventCard({
  event,
  onClick,
}: {
  event: EventListItem;
  onClick: () => void;
}) {
  const dateObj = new Date(event.date + "T00:00:00");
  const day = dateObj.getDate();
  const dayName = DAY_NAMES[dateObj.getDay()];

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-neutral-100 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-neutral-300 transition-colors group"
    >
      {/* Date badge — large on desktop, compact on mobile */}
      <div className="flex-shrink-0 text-center hidden sm:block w-10">
        <div className="font-serif text-2xl leading-none text-neutral-900">{day}</div>
        <div className="text-[9px] uppercase tracking-widest text-neutral-400 mt-0.5">{dayName}</div>
      </div>
      <div className="flex-shrink-0 text-center sm:hidden">
        <div className="text-[10px] uppercase tracking-widest text-neutral-400">{dayName}</div>
        <div className="font-serif text-lg leading-tight text-neutral-900">{day}</div>
      </div>

      <div className="w-px bg-neutral-100 self-stretch flex-shrink-0" />

      <div className="w-6 h-6 sm:w-7 sm:h-7 border border-neutral-200 rounded-full flex items-center justify-center flex-shrink-0 text-neutral-400 group-hover:text-neutral-600 transition-colors">
        <EventTypeIcon type={event.type} size={13} />
      </div>

      <div className="flex-1 min-w-0">
        {event.subtype && (
          <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-0.5">
            {event.subtype.replace(/_/g, " ")}
          </div>
        )}
        <div className="font-serif text-sm font-medium text-neutral-900 truncate">
          {event.title}
        </div>
        <div className="text-xs text-neutral-400 mt-0.5 truncate">{event.venue_name}</div>
      </div>
    </button>
  );
}

function MonthGroup({
  year,
  month,
  events,
  onEventClick,
}: {
  year: string;
  month: string;
  events: EventListItem[];
  onEventClick: (id: string) => void;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-[11px] font-medium uppercase tracking-widest text-neutral-400">
          {MONTH_NAMES[parseInt(month)]} {year}
        </span>
        <div className="flex-1 h-px bg-neutral-100" />
      </div>
      <div className="flex flex-col gap-2">
        {events.map((e) => (
          <UpcomingEventCard key={e.id} event={e} onClick={() => onEventClick(e.id)} />
        ))}
      </div>
    </div>
  );
}

export default function Upcoming() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    fetchEvents({ status: "upcoming", limit: 500 })
      .then((evts) =>
        setEvents(
          [...evts]
            .filter((e) => e.date >= today)
            .sort((a, b) => a.date.localeCompare(b.date))
        )
      )
      .finally(() => setLoading(false));
  }, []);

  function handleEventClick(id: string) {
    window.history.pushState({ eventId: id }, "", `/events/${id}`);
    window.dispatchEvent(new CustomEvent("open-event", { detail: id }));
  }

  const grouped = useMemo(() => groupByYearMonth(events), [events]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-300 text-sm tracking-widest uppercase">
        Loading…
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-400 text-sm">
        Nothing upcoming.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="text-right">
          <div className="font-serif text-xl text-neutral-900">{events.length}</div>
          <div className="text-[10px] uppercase tracking-widest text-neutral-400 mt-0.5">Events</div>
        </div>
        <SpendStat events={events} />
      </div>
      {Object.keys(grouped)
        .sort()
        .map((year) =>
          Object.keys(grouped[year])
            .sort()
            .map((month) => (
              <MonthGroup
                key={`${year}-${month}`}
                year={year}
                month={month}
                events={grouped[year][month]}
                onEventClick={handleEventClick}
              />
            ))
        )}
    </div>
  );
}
