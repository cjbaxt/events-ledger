"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { fetchEvents, fetchPaymentMethods, eventTimestamp } from "@/lib/api";
import type { PaymentMethod } from "@/lib/api";
import type { EventListItem } from "@/lib/types";
import EventTypeIcon from "./EventTypeIcon";
import { IconWriting, IconArticle } from "@tabler/icons-react";

const PAGE_SIZE = 30;
const PRE_YEAR = 2015;
const PRE_BUCKET = `pre-${PRE_YEAR}`;

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ALL_TYPES = [
  "ballet", "cabaret", "circus", "classical", "comedy", "dance",
  "exhibition", "music", "opera", "other", "screening", "spoken_word",
  "talk", "theatre",
];

const GBP_TO_EUR = 1.19;
function toEur(amount: number, currency: string) {
  return currency === "GBP" ? amount * GBP_TO_EUR : amount;
}

function groupByYearMonth(events: EventListItem[]) {
  const years: Record<string, Record<string, EventListItem[]>> = {};
  for (const e of events) {
    const [year, month] = e.date.split("-");
    const isPre = parseInt(year) < PRE_YEAR;
    const bucket = isPre ? PRE_BUCKET : year;
    const monthKey = isPre ? `${year}-${month}` : month;
    if (!years[bucket]) years[bucket] = {};
    if (!years[bucket][monthKey]) years[bucket][monthKey] = [];
    years[bucket][monthKey].push(e);
  }
  return years;
}

function topTypes(events: EventListItem[], n = 3) {
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.type] = (counts[e.type] ?? 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n);
}

function totalSpendEur(events: EventListItem[], paymentMethods: PaymentMethod[], year: string): number {
  const eventTotal = events
    .filter((e) => e.price_paid)
    .reduce((sum, e) => sum + toEur(parseFloat(e.price_paid ?? "0"), e.currency ?? "EUR"), 0);
  const pmIdsInEvents = new Set(events.map((e) => e.payment_method_id).filter(Boolean));
  const pmTotal = paymentMethods
    .filter((pm) => (year === PRE_BUCKET ? parseInt(pm.purchase_date) < PRE_YEAR : pm.purchase_date.startsWith(year)) && pmIdsInEvents.has(pm.id))
    .reduce((sum, pm) => sum + toEur(parseFloat(pm.total_cost), pm.currency), 0);
  return eventTotal + pmTotal;
}

function StarSvg({ fill, size = 14 }: { fill: number; size?: number }) {
  const id = `clip-${Math.random().toString(36).slice(2)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <defs><clipPath id={id}><rect x="0" y="0" width={14 * fill} height="14" /></clipPath></defs>
      <path d="M7 1l1.545 3.09L12 4.635l-2.5 2.41.59 3.41L7 8.77l-3.09 1.685.59-3.41L2 4.635l3.455-.545L7 1z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" className="text-neutral-300" />
      {fill > 0 && <path d="M7 1l1.545 3.09L12 4.635l-2.5 2.41.59 3.41L7 8.77l-3.09 1.685.59-3.41L2 4.635l3.455-.545L7 1z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" clipPath={`url(#${id})`} className="text-neutral-700" />}
    </svg>
  );
}

function SpendStat({ spend }: { spend: number }) {
  const [revealed, setRevealed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (spend <= 0) return null;
  function handleClick() {
    setRevealed(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setRevealed(false), 1000);
  }
  return (
    <button onClick={handleClick} className="text-right cursor-pointer">
      <div className={`font-serif text-xl text-neutral-900 transition-all duration-300 ${revealed ? "blur-none" : "blur-sm"}`}>€{Math.round(spend)}</div>
      <div className="text-[10px] uppercase tracking-widest text-neutral-400 mt-0.5">Spent</div>
    </button>
  );
}

function YearSummary({ events, year, paymentMethods, hiddenTypes, onFilter }: {
  events: EventListItem[]; year: string; paymentMethods: PaymentMethod[];
  hiddenTypes: Set<string>; onFilter: () => void;
}) {
  const types = topTypes(events);
  const rated = events.filter((e) => e.rating);
  const avgRating = rated.length ? rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length : null;
  const spend = totalSpendEur(events, paymentMethods, year);
  return (
    <div className="sticky top-0 md:top-14 z-10 bg-white border-b border-neutral-100 mb-6 pb-4 pt-4">
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-serif text-3xl text-neutral-900">{year === PRE_BUCKET ? `Before ${PRE_YEAR}` : year}</h2>
          {(year === PRE_BUCKET || parseInt(year) < 2025) && (
            <span className="text-[10px] uppercase tracking-widest text-orange-300">memory gaps</span>
          )}
        </div>
        <div className="flex gap-6">
          <div className="text-right">
            <div className="font-serif text-xl text-neutral-900">{events.length}</div>
            <div className="text-[10px] uppercase tracking-widest text-neutral-400 mt-0.5">Events</div>
          </div>
          <div className="text-right">
            <div className="font-serif text-xl text-neutral-900">{new Set(events.map((e) => e.type)).size}</div>
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-widest text-neutral-400">Top attended</span>
          {types.map(([type, count]) => (
            <div key={type} className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-100 rounded-full px-2.5 py-1">
              <div className="w-4 h-4 border border-neutral-200 rounded-full flex items-center justify-center text-neutral-500"><EventTypeIcon type={type} size={10} /></div>
              <span className="hidden sm:inline text-xs text-neutral-500 capitalize">{type.replace("_", " ")}</span>
              <span className="text-xs text-neutral-300">· {count}</span>
            </div>
          ))}
        </div>
        <button
          onClick={onFilter}
          className={`flex-shrink-0 flex items-center gap-1.5 border rounded-md px-2.5 py-1 text-xs transition-colors ${hiddenTypes.size > 0 ? "border-neutral-900 text-neutral-900 bg-neutral-50" : "border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-700"}`}
        >
          Filter
          {hiddenTypes.size > 0 && <span className="text-[10px] bg-neutral-900 text-white rounded-full w-4 h-4 flex items-center justify-center">{hiddenTypes.size}</span>}
        </button>
      </div>
    </div>
  );
}

function EventCard({ event, onClick }: { event: EventListItem; onClick: () => void }) {
  const dateObj = new Date(event.date + "T00:00:00");
  const day = dateObj.getDate();
  const monthShort = dateObj.toLocaleString("en-GB", { month: "short" });
  return (
    <button onClick={onClick} className="w-full text-left bg-white border border-neutral-100 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-neutral-300 active:bg-neutral-50 transition-colors group">
      <div className="w-8 h-8 border border-neutral-200 rounded-full flex items-center justify-center flex-shrink-0 text-neutral-400 group-hover:text-neutral-600 transition-colors">
        <EventTypeIcon type={event.type} size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-serif text-sm font-medium text-neutral-900 truncate">{event.title}</div>
        <div className="text-xs text-neutral-400 mt-0.5 truncate">{event.venue_name}</div>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <div className="text-xs text-neutral-400">{day} {monthShort}</div>
        <div className="flex items-center gap-1.5">
          {event.rating != null && <span className="text-[11px] text-neutral-400">{event.rating}★</span>}
          {(event.has_review || event.has_essay) && (
            <div className="flex gap-1">
              {event.has_review && <IconWriting size={13} className="text-neutral-500" />}
              {event.has_essay && <IconArticle size={13} className="text-neutral-500" />}
            </div>
          )}
        </div>
      </div>
      <svg className="w-3 h-3 text-neutral-300 flex-shrink-0 -mr-1" viewBox="0 0 6 10" fill="none"><path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

function MonthGroup({ month, events, onEventClick, showYear }: {
  month: string; events: EventListItem[]; onEventClick: (id: string, preview: EventListItem) => void; showYear?: boolean;
}) {
  const monthNum = month.includes("-") ? parseInt(month.split("-")[1]) : parseInt(month);
  const yearFromKey = month.includes("-") ? month.split("-")[0] : events[0]?.date.slice(0, 4);
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-[11px] font-medium uppercase tracking-widest text-neutral-400">
          {MONTH_NAMES[monthNum]}{showYear && yearFromKey ? ` ${yearFromKey}` : ""}
        </span>
        <span className="text-[10px] text-neutral-300">{events.length}</span>
        <div className="flex-1 h-px bg-neutral-100" />
      </div>
      <div className="flex flex-col gap-2">
        {events.map((e) => <EventCard key={e.id} event={e} onClick={() => onEventClick(e.id, e)} />)}
      </div>
    </div>
  );
}

export default function Timeline({ onEventClick }: { onEventClick: (id: string, preview: EventListItem) => void }) {
  const [allEvents, setAllEvents] = useState<EventListItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set(["exhibition", "talk"]));
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingHidden, setPendingHidden] = useState<Set<string>>(new Set(["exhibition", "talk"]));

  useEffect(() => {
    Promise.all([fetchEvents({ limit: 500 }), fetchPaymentMethods()])
      .then(([all, pms]) => {
        const now = Date.now();
        const events = all.filter((e) => eventTimestamp(e) <= now).sort((a, b) => b.date.localeCompare(a.date));
        setAllEvents(events);
        setPaymentMethods(pms);
        const years = [...new Set(events.map(e => e.date.slice(0, 4)))];
        const initial = years[0] ?? null;
        if (initial) setSelectedYear(initial);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const presentTypes = useMemo(() => new Set(allEvents.map((e) => e.type)), [allEvents]);
  const grouped = useMemo(() => groupByYearMonth(allEvents), [allEvents]);
  const years = useMemo(() => Object.keys(grouped).sort((a, b) => {
    if (a === PRE_BUCKET) return 1;
    if (b === PRE_BUCKET) return -1;
    return +b - +a;
  }), [grouped]);

  const yearEvents = useMemo(() => selectedYear ? allEvents.filter((e) => {
    const matches = selectedYear === PRE_BUCKET ? parseInt(e.date.slice(0, 4)) < PRE_YEAR : e.date.startsWith(selectedYear);
    return matches && !hiddenTypes.has(e.type);
  }) : [], [allEvents, selectedYear, hiddenTypes]);

  const pagedMonthGrouped = useMemo(() => {
    const paged = yearEvents.slice(0, pageSize);
    const byYearMonth = groupByYearMonth(paged);
    return byYearMonth[selectedYear ?? ""] ?? {};
  }, [yearEvents, pageSize, selectedYear]);

  if (loading) return <div className="flex items-center justify-center h-64 text-neutral-300 text-sm tracking-widest uppercase">Loading…</div>;
  if (allEvents.length === 0) return <div className="flex items-center justify-center h-64 text-neutral-400 text-sm">No events yet.</div>;

  return (
    <>
      <div>
        {selectedYear && (
          <YearSummary year={selectedYear} events={yearEvents} paymentMethods={paymentMethods} hiddenTypes={hiddenTypes} onFilter={() => { setPendingHidden(new Set(hiddenTypes)); setFilterOpen(true); }} />
        )}
        {selectedYear && Object.keys(pagedMonthGrouped).sort((a, b) => b.localeCompare(a)).map((month) => (
          <MonthGroup key={month} month={month} events={pagedMonthGrouped[month]} onEventClick={onEventClick} showYear={selectedYear === PRE_BUCKET} />
        ))}
        <div className="sticky bottom-16 md:bottom-0 z-10 mt-2 border-t border-neutral-100 bg-white">
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-3 md:hidden">
            {years.map((y) => (
              <button key={y} onClick={() => { setSelectedYear(y); setPageSize(PAGE_SIZE); }} className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${y === selectedYear ? "border-neutral-900 text-neutral-900 bg-neutral-50" : "border-neutral-200 text-neutral-400"}`}>
                {y === PRE_BUCKET ? `< ${PRE_YEAR}` : y}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between px-4 pb-3 md:py-3">
            <div className="hidden md:flex gap-2 overflow-x-auto no-scrollbar">
              {years.map((y) => (
                <button key={y} onClick={() => { setSelectedYear(y); setPageSize(PAGE_SIZE); }} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${y === selectedYear ? "border-neutral-900 text-neutral-900 bg-neutral-50" : "border-neutral-200 text-neutral-400"}`}>
                  {y === PRE_BUCKET ? `< ${PRE_YEAR}` : y}
                </button>
              ))}
            </div>
            {yearEvents.length > pageSize && (
              <button onClick={() => setPageSize((n) => n + PAGE_SIZE)} className="text-xs text-neutral-400 hover:text-neutral-700 border border-neutral-200 rounded-md px-3 py-1.5 transition-colors ml-auto">
                Load more
              </button>
            )}
          </div>
        </div>
      </div>

      {filterOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setFilterOpen(false)}>
          <div className="bg-white rounded-t-2xl border-t border-neutral-200 px-5 pt-5 pb-8 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif text-lg text-neutral-900">Filter by type</h3>
              <button onClick={() => setFilterOpen(false)} className="text-neutral-400 text-sm">✕</button>
            </div>
            <div className="space-y-1 mb-6">
              {ALL_TYPES.filter((t) => presentTypes.has(t)).map((type) => {
                const hidden = pendingHidden.has(type);
                return (
                  <button key={type} onClick={() => setPendingHidden((prev) => { const next = new Set(prev); next.has(type) ? next.delete(type) : next.add(type); return next; })} className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-neutral-50 transition-colors">
                    <div className={`w-4 h-4 rounded border flex-shrink-0 transition-colors ${hidden ? "border-neutral-200 bg-white" : "border-neutral-900 bg-neutral-900"}`}>
                      {!hidden && <svg viewBox="0 0 12 12" className="w-full h-full text-white" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                    <div className="w-6 h-6 border border-neutral-200 rounded-full flex items-center justify-center text-neutral-400 flex-shrink-0"><EventTypeIcon type={type} size={12} /></div>
                    <span className={`text-sm capitalize flex-1 text-left transition-colors ${hidden ? "text-neutral-300" : "text-neutral-700"}`}>{type.replace(/_/g, " ")}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPendingHidden(new Set())} className="flex-1 border border-neutral-200 text-neutral-600 text-sm rounded-xl py-3">Show all</button>
              <button onClick={() => { setHiddenTypes(new Set(pendingHidden)); setFilterOpen(false); }} className="flex-1 bg-neutral-900 text-white text-sm rounded-xl py-3">Apply</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
