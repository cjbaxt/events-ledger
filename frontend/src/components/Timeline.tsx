import { useState, useEffect, useMemo, useRef } from "react";
import { fetchEvents, patchEventRating, fetchPaymentMethods } from "../lib/api";
import type { PaymentMethod } from "../lib/api";
import type { EventListItem } from "../types/events";
import EventTypeIcon from "./EventTypeIcon";

const PAGE_SIZES = [25, 50, 100];

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

function topTypes(events: EventListItem[], n = 3) {
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.type] = (counts[e.type] ?? 0) + 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// SVG star with a horizontal clip for partial fill
function StarSvg({ fill, size = 14 }: { fill: number; size?: number }) {
  const id = `clip-${Math.random().toString(36).slice(2)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <defs>
        <clipPath id={id}>
          <rect x="0" y="0" width={14 * fill} height="14" />
        </clipPath>
      </defs>
      {/* outline */}
      <path
        d="M7 1l1.545 3.09L12 4.635l-2.5 2.41.59 3.41L7 8.77l-3.09 1.685.59-3.41L2 4.635l3.455-.545L7 1z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        className="text-neutral-300"
      />
      {/* filled portion */}
      {fill > 0 && (
        <path
          d="M7 1l1.545 3.09L12 4.635l-2.5 2.41.59 3.41L7 8.77l-3.09 1.685.59-3.41L2 4.635l3.455-.545L7 1z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
          clipPath={`url(#${id})`}
          className="text-neutral-700"
        />
      )}
    </svg>
  );
}

function StarRating({
  rating,
  onRate,
}: {
  rating: number | null;
  onRate: (r: number | null) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const displayed = hover ?? rating ?? 0;

  return (
    <div
      className="flex gap-0.5 items-center"
      onMouseLeave={() => setHover(null)}
      onClick={(e) => e.stopPropagation()}
    >
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
              // clicking same rating clears it
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

const GBP_TO_EUR = 1.19;

function toEur(amount: number, currency: string) {
  return currency === "GBP" ? amount * GBP_TO_EUR : amount;
}

function totalSpendEur(events: EventListItem[], paymentMethods: PaymentMethod[], year: string): number {
  // Individual surcharges / standalone prices
  const eventTotal = events
    .filter((e) => e.price_paid)
    .reduce((sum, e) => sum + toEur(parseFloat(e.price_paid ?? "0"), e.currency ?? "EUR"), 0);

  // Payment methods whose purchase_date falls in this year (counted once each, regardless of filter)
  const pmIdsInEvents = new Set(events.map((e) => e.payment_method_id).filter(Boolean));
  const pmTotal = paymentMethods
    .filter((pm) => pm.purchase_date.startsWith(year) && pmIdsInEvents.has(pm.id))
    .reduce((sum, pm) => sum + toEur(parseFloat(pm.total_cost), pm.currency), 0);

  return eventTotal + pmTotal;
}

function SpendStat({ spend }: { spend: number }) {
  const [revealed, setRevealed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (spend <= 0) return null;

  function handleClick() {
    setRevealed(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setRevealed(false), 3000);
  }

  return (
    <button onClick={handleClick} className="text-right">
      <div className={`font-serif text-xl text-neutral-900 transition-all duration-300 ${revealed ? "blur-none" : "blur-sm"}`}>
        €{Math.round(spend)}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mt-0.5">Spent</div>
    </button>
  );
}

function YearSummary({ events, year, paymentMethods }: { events: EventListItem[]; year: string; paymentMethods: PaymentMethod[] }) {
  const types = topTypes(events);
  const rated = events.filter((e) => e.rating);
  const avgRating = rated.length
    ? rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length
    : null;
  const spend = totalSpendEur(events, paymentMethods, year);

  return (
    <div className="sticky top-0 md:top-14 z-10 bg-white border-b border-neutral-100 mb-6 pb-4 pt-4 -mt-4">
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-serif text-3xl text-neutral-900">{year}</h2>
          {year !== new Date().getFullYear().toString() && (
            <span className="text-[10px] uppercase tracking-widest text-orange-300">memory gaps</span>
          )}
        </div>
        <div className="flex gap-6">
          <div className="text-right">
            <div className="font-serif text-xl text-neutral-900">{events.length}</div>
            <div className="text-[10px] uppercase tracking-widest text-neutral-400 mt-0.5">Events</div>
          </div>
          <div className="text-right">
            <div className="font-serif text-xl text-neutral-900">
              {new Set(events.map((e) => e.type)).size}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-neutral-400 mt-0.5">Types</div>
          </div>
          {avgRating !== null && (
            <div className="text-right">
              <div className="font-serif text-xl text-neutral-900">{avgRating.toFixed(1)}</div>
              <div className="text-[10px] uppercase tracking-widest text-neutral-400 mt-0.5">Avg rating</div>
            </div>
          )}
          <SpendStat spend={spend} />
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-widest text-neutral-400">Top attended</span>
        {types.map(([type, count]) => (
          <div
            key={type}
            className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-100 rounded-full px-2.5 py-1"
          >
            <div className="w-4 h-4 border border-neutral-200 rounded-full flex items-center justify-center text-neutral-500">
              <EventTypeIcon type={type} size={10} />
            </div>
            <span className="text-xs text-neutral-500 capitalize">{type.replace("_", " ")}</span>
            <span className="text-xs text-neutral-300">· {count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventCard({
  event,
  onClick,
  onRate,
}: {
  event: EventListItem;
  onClick: () => void;
  onRate: (r: number | null) => void;
}) {
  const dateObj = new Date(event.date + "T00:00:00");
  const day = dateObj.getDate();
  const monthShort = dateObj.toLocaleString("en-GB", { month: "short" });

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-neutral-100 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-neutral-300 transition-colors group"
    >
      <div className="w-8 h-8 border border-neutral-200 rounded-full flex items-center justify-center flex-shrink-0 text-neutral-400 group-hover:text-neutral-600 transition-colors">
        <EventTypeIcon type={event.type} size={16} />
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
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <div className="text-xs text-neutral-400">{day} {monthShort}</div>
        <StarRating rating={event.rating} onRate={onRate} />
      </div>
    </button>
  );
}

function MonthGroup({
  month,
  events,
  onEventClick,
  onRate,
}: {
  month: string;
  events: EventListItem[];
  onEventClick: (id: string) => void;
  onRate: (id: string, r: number | null) => void;
}) {
  return (
    <div className="flex gap-0 mb-1">
      <div className="w-24 flex-shrink-0 pt-3.5">
        <div className="text-[11px] font-medium uppercase tracking-widest text-neutral-400">
          {MONTH_NAMES[parseInt(month)]}
        </div>
        <div className="text-[10px] text-neutral-300 mt-0.5">{events.length}</div>
      </div>
      <div className="w-px bg-neutral-100 flex-shrink-0 mt-3 mr-4 self-stretch" />
      <div className="flex-1 min-w-0 flex flex-col gap-2 pb-5">
        {events.map((e) => (
          <EventCard key={e.id} event={e} onClick={() => onEventClick(e.id)} onRate={(r) => onRate(e.id, r)} />
        ))}
      </div>
    </div>
  );
}

const ALL_TYPES = [
  "ballet", "cabaret", "circus", "classical", "comedy", "dance",
  "exhibition", "music", "opera", "other", "screening", "spoken_word",
  "talk", "theatre",
];

export default function Timeline() {
  const [allEvents, setAllEvents] = useState<EventListItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(50);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set(["exhibition", "talk"]));
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const typeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetchEvents({ status: "attended", limit: 500 }),
      fetchPaymentMethods(),
    ]).then(([events, pms]) => {
      setAllEvents(events);
      setPaymentMethods(pms);
      if (events.length > 0) setSelectedYear(events[0].date.slice(0, 4));
    }).finally(() => setLoading(false));
  }, []);


  const presentTypes = useMemo(
    () => new Set(allEvents.map((e) => e.type)),
    [allEvents]
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target as Node)) {
        setTypeMenuOpen(false);
      }
    }
    if (typeMenuOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [typeMenuOpen]);

  function toggleType(type: string) {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  }

  const grouped = useMemo(() => groupByYearMonth(allEvents), [allEvents]);
  const years = useMemo(() => Object.keys(grouped).sort((a, b) => +b - +a), [grouped]);

  const yearEvents = useMemo(
    () => (selectedYear ? allEvents.filter((e) => e.date.startsWith(selectedYear) && !hiddenTypes.has(e.type)) : []),
    [allEvents, selectedYear, hiddenTypes]
  );

  const pagedEvents = useMemo(
    () => yearEvents.slice(0, pageSize),
    [yearEvents, pageSize]
  );

  const pagedMonthGrouped = useMemo(() => {
    const byYearMonth = groupByYearMonth(pagedEvents);
    return byYearMonth[selectedYear ?? ""] ?? {};
  }, [pagedEvents, selectedYear]);

  function handleEventClick(id: string) {
    window.history.pushState({ eventId: id }, "", `/events/${id}`);
    window.dispatchEvent(new CustomEvent("open-event", { detail: id }));
  }

  function handleRate(id: string, rating: number | null) {
    // Optimistic update
    setAllEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, rating } : e))
    );
    patchEventRating(id, rating).catch(() => {
      // revert on failure — refetch
      fetchEvents({ status: "attended", limit: 500 }).then(setAllEvents);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-300 text-sm tracking-widest uppercase">
        Loading…
      </div>
    );
  }

  if (allEvents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-400 text-sm">
        No events yet.
      </div>
    );
  }

  return (
    <div>
      {selectedYear && (
        <YearSummary
          year={selectedYear}
          events={yearEvents}
          paymentMethods={paymentMethods}
        />
      )}

      {selectedYear &&
        Object.keys(pagedMonthGrouped)
          .sort((a, b) => b.localeCompare(a))
          .map((month) => (
            <MonthGroup
              key={month}
              month={month}
              events={pagedMonthGrouped[month]}
              onEventClick={handleEventClick}
              onRate={handleRate}
            />
          ))}

      {/* Pagination bar */}
      <div className="sticky bottom-16 md:bottom-0 z-10 mt-2 border-t border-neutral-100 bg-white">
        {/* Year pills — scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-3 md:hidden">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                y === selectedYear
                  ? "border-neutral-900 text-neutral-900 bg-neutral-50"
                  : "border-neutral-200 text-neutral-400 hover:text-neutral-700 hover:border-neutral-400"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between px-4 pb-3 md:py-3">
          {/* Year pills — inline on desktop */}
          <div className="hidden md:flex gap-2 flex-wrap">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  y === selectedYear
                    ? "border-neutral-900 text-neutral-900 bg-neutral-50"
                    : "border-neutral-200 text-neutral-400 hover:text-neutral-700 hover:border-neutral-400"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-400">
          {/* Type filter */}
          <div className="relative" ref={typeMenuRef}>
            <button
              onClick={() => setTypeMenuOpen((o) => !o)}
              className={`flex items-center gap-1.5 border rounded-md px-2.5 py-1 text-xs transition-colors ${
                hiddenTypes.size > 0
                  ? "border-neutral-900 text-neutral-900 bg-neutral-50"
                  : "border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-700"
              }`}
            >
              Types
              {hiddenTypes.size > 0 && (
                <span className="text-[10px] bg-neutral-900 text-white rounded-full w-4 h-4 flex items-center justify-center">
                  {hiddenTypes.size}
                </span>
              )}
            </button>
            {typeMenuOpen && (
              <div className="absolute bottom-full right-0 mb-1 bg-white border border-neutral-200 rounded-xl shadow-lg py-1.5 w-48 z-20">
                {ALL_TYPES.filter((t) => presentTypes.has(t)).map((type) => {
                  const hidden = hiddenTypes.has(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-neutral-50 transition-colors"
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 transition-colors ${
                        hidden ? "border-neutral-200 bg-white" : "border-neutral-900 bg-neutral-900"
                      }`}>
                        {!hidden && (
                          <svg viewBox="0 0 12 12" className="w-full h-full text-white" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <div className="w-4 h-4 border border-neutral-200 rounded-full flex items-center justify-center text-neutral-400">
                        <EventTypeIcon type={type} size={10} />
                      </div>
                      <span className={`capitalize transition-colors ${hidden ? "text-neutral-300" : "text-neutral-700"}`}>
                        {type.replace(/_/g, " ")}
                      </span>
                    </button>
                  );
                })}
                {hiddenTypes.size > 0 && (
                  <div className="border-t border-neutral-100 mt-1 pt-1">
                    <button
                      onClick={() => setHiddenTypes(new Set())}
                      className="w-full text-left px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
                    >
                      Show all
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <span>Per page</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border border-neutral-200 rounded-md px-2 py-1 text-xs text-neutral-600 bg-white"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        </div>
      </div>
    </div>
  );
}
