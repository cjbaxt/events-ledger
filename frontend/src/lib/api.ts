import type { EventListItem, EventDetail } from "../types/events";
export type { EventDetail } from "../types/events";

export const BASE = import.meta.env.PUBLIC_API_URL ?? "";
export const STATIC = import.meta.env.PUBLIC_STATIC_DATA === "true";
export const DATA = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, init);
}

async function staticFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${DATA}${path}`);
  if (!res.ok) throw new Error(`Static fetch failed: ${path}`);
  return res.json();
}

let _eventsCache: EventListItem[] | null = null;

/** Returns a timestamp for an event, defaulting to midday if no time is set. */
export function eventTimestamp(e: { date: string; time?: string | null }): number {
  const timeStr = e.time ? e.time.slice(0, 5) : "12:00";
  return new Date(`${e.date}T${timeStr}:00`).getTime();
}

export async function fetchEvents(params: {
  type?: string;
  q?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<EventListItem[]> {
  if (STATIC) {
    if (!_eventsCache) _eventsCache = await staticFetch<EventListItem[]>("/data/events.json");
    let results = _eventsCache;
    if (params.type) results = results.filter(e => e.type === params.type);
    if (params.q) {
      const q = params.q.toLowerCase();
      results = results.filter(e => e.title.toLowerCase().includes(q));
    }
    if (params.offset) results = results.slice(params.offset);
    if (params.limit) results = results.slice(0, params.limit);
    return results;
  }
  const qs = new URLSearchParams();
  if (params.type) qs.set("type", params.type);
  if (params.q) qs.set("q", params.q);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  const res = await authFetch(`${BASE}/api/events?${qs}`);
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
  return res.json();
}

const PAGE_SIZE = 500;

export async function fetchAllEvents(params: Omit<Parameters<typeof fetchEvents>[0], "limit" | "offset"> = {}): Promise<EventListItem[]> {
  const all: EventListItem[] = [];
  let offset = 0;
  while (true) {
    const page = await fetchEvents({ ...params, limit: PAGE_SIZE, offset });
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

export async function fetchEvent(id: string): Promise<EventDetail> {
  if (STATIC) return staticFetch<EventDetail>(`/data/events/${id}.json`);
  const res = await authFetch(`${BASE}/api/events/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch event: ${res.status}`);
  return res.json();
}

export async function patchEventRating(id: string, rating: number | null): Promise<void> {
  if (STATIC) return;
  const res = await authFetch(`${BASE}/api/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating }),
  });
  if (!res.ok) throw new Error(`Failed to patch rating: ${res.status}`);
}

export async function patchEventReview(id: string, review: string | null): Promise<void> {
  if (STATIC) return;
  const res = await authFetch(`${BASE}/api/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ review }),
  });
  if (!res.ok) throw new Error(`Failed to patch review: ${res.status}`);
}

export async function patchEventLinks(id: string, links: Array<{ url: string; label?: string }>): Promise<void> {
  if (STATIC) return;
  const res = await authFetch(`${BASE}/api/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ links }),
  });
  if (!res.ok) throw new Error(`Failed to patch links: ${res.status}`);
}

export async function patchEventPrice(id: string, price: string, currency: string): Promise<void> {
  if (STATIC) return;
  const res = await authFetch(`${BASE}/api/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ price_paid: price, currency }),
  });
  if (!res.ok) throw new Error(`Failed to patch price: ${res.status}`);
}

export async function updateEvent(id: string, payload: Record<string, unknown>): Promise<EventDetail> {
  const res = await authFetch(`${BASE}/api/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = Array.isArray(err.detail)
      ? err.detail.map((e: { msg?: string; loc?: unknown[] }) => `${e.loc?.join(".")}: ${e.msg}`).join("; ")
      : (err.detail ?? `Failed to update event: ${res.status}`);
    throw new Error(detail);
  }
  return res.json();
}

export async function createEvent(type: string, payload: Record<string, unknown>): Promise<EventDetail> {
  const res = await authFetch(`${BASE}/api/events/${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Failed to create event: ${res.status}`);
  }
  return res.json();
}

export async function searchEntities(endpoint: string, q: string): Promise<Array<{ id: string; name?: string; title?: string; edition?: string }>> {
  const res = await authFetch(`${BASE}/api/${endpoint}?q=${encodeURIComponent(q)}&limit=10`);
  if (!res.ok) return [];
  return res.json();
}

export async function createEntity(endpoint: string, data: Record<string, unknown>): Promise<{ id: string; name?: string; title?: string }> {
  const res = await authFetch(`${BASE}/api/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Failed to create: ${res.status}`);
  }
  return res.json();
}

export interface PersonRef {
  id: string;
  name: string;
}

export async function fetchPerson(id: string): Promise<PersonRef> {
  if (STATIC) return staticFetch<PersonRef>(`/data/persons/${id}.json`);
  const res = await authFetch(`${BASE}/api/persons/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch person: ${res.status}`);
  return res.json();
}

export async function fetchPersonEvents(id: string): Promise<EventListItem[]> {
  if (STATIC) return staticFetch<EventListItem[]>(`/data/persons/${id}/events.json`);
  const res = await authFetch(`${BASE}/api/persons/${id}/events`);
  if (!res.ok) throw new Error(`Failed to fetch person events: ${res.status}`);
  return res.json();
}

export interface VenueRef {
  id: string;
  name: string;
  city?: string;
  country?: string;
  parent_id?: string | null;
}

export async function fetchVenue(id: string): Promise<VenueRef> {
  if (STATIC) return staticFetch<VenueRef>(`/data/venues/${id}.json`);
  const res = await authFetch(`${BASE}/api/venues/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch venue: ${res.status}`);
  return res.json();
}

export async function fetchVenueEvents(id: string): Promise<EventListItem[]> {
  if (STATIC) return staticFetch<EventListItem[]>(`/data/venues/${id}/events.json`);
  const res = await authFetch(`${BASE}/api/venues/${id}/events`);
  if (!res.ok) throw new Error(`Failed to fetch venue events: ${res.status}`);
  return res.json();
}

export interface EnsembleRef {
  id: string;
  name: string;
  type?: string;
}

export async function fetchEnsemble(id: string): Promise<EnsembleRef> {
  if (STATIC) return staticFetch<EnsembleRef>(`/data/ensembles/${id}.json`);
  const res = await authFetch(`${BASE}/api/ensembles/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch ensemble: ${res.status}`);
  return res.json();
}

export async function fetchEnsembleEvents(id: string): Promise<EventListItem[]> {
  if (STATIC) return staticFetch<EventListItem[]>(`/data/ensembles/${id}/events.json`);
  const res = await authFetch(`${BASE}/api/ensembles/${id}/events`);
  if (!res.ok) throw new Error(`Failed to fetch ensemble events: ${res.status}`);
  return res.json();
}

export interface FestivalRef {
  id: string;
  name: string;
  edition?: string | null;
}

export async function fetchFestival(id: string): Promise<FestivalRef> {
  if (STATIC) return staticFetch<FestivalRef>(`/data/festivals/${id}.json`);
  const res = await authFetch(`${BASE}/api/festivals/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch festival: ${res.status}`);
  return res.json();
}

export async function fetchFestivalEvents(id: string): Promise<EventListItem[]> {
  if (STATIC) return staticFetch<EventListItem[]>(`/data/festivals/${id}/events.json`);
  const res = await authFetch(`${BASE}/api/festivals/${id}/events`);
  if (!res.ok) throw new Error(`Failed to fetch festival events: ${res.status}`);
  return res.json();
}

export async function fetchPaymentMethodEvents(id: string): Promise<EventListItem[]> {
  if (STATIC) return staticFetch<EventListItem[]>(`/data/payment-methods/${id}/events.json`);
  const res = await authFetch(`${BASE}/api/payment-methods/${id}/events`);
  if (!res.ok) throw new Error(`Failed to fetch payment method events: ${res.status}`);
  return res.json();
}

export async function deleteEvent(id: string): Promise<void> {
  const res = await authFetch(`${BASE}/api/events/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete event: ${res.status}`);
}

export interface PaymentMethod {
  id: string;
  name: string;
  total_cost: string;
  currency: string;
  purchase_date: string;
  notes?: string | null;
}

export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  if (STATIC) return [];
  const res = await authFetch(`${BASE}/api/payment-methods`);
  if (!res.ok) throw new Error(`Failed to fetch payment methods: ${res.status}`);
  return res.json();
}

export async function createPaymentMethod(data: {
  name: string; total_cost: number; currency: string; purchase_date: string; notes?: string;
}): Promise<PaymentMethod> {
  const res = await authFetch(`${BASE}/api/payment-methods`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create payment method: ${res.status}`);
  return res.json();
}

export async function patchEventPaymentMethod(id: string, payment_method_id: string | null): Promise<void> {
  const res = await authFetch(`${BASE}/api/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payment_method_id }),
  });
  if (!res.ok) throw new Error(`Failed to patch payment method: ${res.status}`);
}

export interface ScrapePerformance {
  date: string;
  time: string;
  label: string;
}

export interface ScrapeResult {
  source: string;
  title: string;
  type_suggestion: string;
  subtype_suggestion: string;
  venue_name: string;
  performances: ScrapePerformance[];
  description: string;
  description_source_url: string;
  festival_hint: string;
}

export async function scrapeEvent(url: string): Promise<ScrapeResult> {
  const res = await authFetch(`${BASE}/api/scrape/event?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Scrape failed: ${res.status}`);
  }
  return res.json();
}
