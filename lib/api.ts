import type { EventListItem, EventDetail } from "./types";

export type { EventListItem, EventDetail };

export interface PaymentMethod {
  id: string;
  name: string;
  total_cost: string;
  currency: string;
  purchase_date: string;
  notes?: string | null;
}

export function eventTimestamp(e: { date: string; time?: string | null }): number {
  const timeStr = e.time ? e.time.slice(0, 5) : "12:00";
  return new Date(`${e.date}T${timeStr}:00`).getTime();
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(path, init);
  return res;
}

// Module-level cache: one shared promise for the full events list, TTL 5 min
let eventsCache: Promise<EventListItem[]> | null = null;
let eventsCacheAt = 0;
const EVENTS_CACHE_TTL = 5 * 60 * 1000;

function getEventsCache(): Promise<EventListItem[]> {
  if (!eventsCache || Date.now() - eventsCacheAt > EVENTS_CACHE_TTL) {
    eventsCacheAt = Date.now();
    eventsCache = apiFetch("/api/events?limit=1000")
      .then((r) => r.json())
      .catch((e) => { eventsCache = null; throw e; });
  }
  return eventsCache;
}

export function invalidateEventsCache() {
  eventsCache = null;
}

// Module-level cache for entity lists (persons, ensembles, venues, festivals)
type EntityCache<T> = { promise: Promise<T[]>; at: number } | null;
const ENTITY_CACHE_TTL = 5 * 60 * 1000;

let personsCache: EntityCache<{ id: string; name: string }> = null;
let ensemblesCache: EntityCache<{ id: string; name: string; type?: string | null }> = null;
let venuesCache: EntityCache<{ id: string; name: string; city?: string | null; parent_id?: string | null; parent_name?: string | null }> = null;
let festivalsCache: EntityCache<{ id: string; name: string; edition?: string | null }> = null;

function makeEntityFetcher<T>(getCache: () => EntityCache<T>, setCache: (c: EntityCache<T>) => void, url: string): () => Promise<T[]> {
  return () => {
    const cache = getCache();
    if (cache && Date.now() - cache.at <= ENTITY_CACHE_TTL) return cache.promise;
    const p: Promise<T[]> = apiFetch(url).then((r) => r.json()).catch((e) => { setCache(null); throw e; });
    setCache({ promise: p, at: Date.now() });
    return p;
  };
}

export const fetchAllPersons = makeEntityFetcher<{ id: string; name: string }>(
  () => personsCache, (c) => { personsCache = c; }, "/api/persons?limit=2000"
);
export const fetchAllEnsembles = makeEntityFetcher<{ id: string; name: string; type?: string | null }>(
  () => ensemblesCache, (c) => { ensemblesCache = c; }, "/api/ensembles?limit=2000"
);
export const fetchAllVenues = makeEntityFetcher<{ id: string; name: string; city?: string | null; parent_id?: string | null; parent_name?: string | null }>(
  () => venuesCache, (c) => { venuesCache = c; }, "/api/venues?limit=2000"
);
export const fetchAllFestivals = makeEntityFetcher<{ id: string; name: string; edition?: string | null }>(
  () => festivalsCache, (c) => { festivalsCache = c; }, "/api/festivals?limit=2000"
);

export async function fetchEvents(params: { type?: string; q?: string; limit?: number; offset?: number } = {}): Promise<EventListItem[]> {
  // If no filters, prime/use the cache
  if (!params.type && !params.q && !params.offset) {
    const all = await getEventsCache();
    if (params.limit) return all.slice(0, params.limit);
    return all;
  }
  const qs = new URLSearchParams();
  if (params.type) qs.set("type", params.type);
  if (params.q) qs.set("q", params.q);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  const res = await apiFetch(`/api/events?${qs}`);
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
  return res.json();
}

export async function fetchEvent(id: string): Promise<EventDetail> {
  const res = await apiFetch(`/api/events/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch event: ${res.status}`);
  return res.json();
}

export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const res = await apiFetch("/api/payment-methods");
  if (!res.ok) throw new Error(`Failed to fetch payment methods: ${res.status}`);
  return res.json();
}

// Entity events: API returns event_ids only; we filter from the cached list
async function fetchEntityEventIds(url: string): Promise<string[]> {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`Failed to fetch event ids: ${res.status}`);
  return res.json();
}

async function filterFromCache(ids: string[]): Promise<EventListItem[]> {
  const all = await getEventsCache();
  const set = new Set(ids);
  return all.filter((e) => set.has(e.id));
}

export async function fetchPersonEvents(id: string): Promise<EventListItem[]> {
  const ids = await fetchEntityEventIds(`/api/persons/${id}/events`);
  return filterFromCache(ids);
}

export async function fetchVenueEvents(id: string): Promise<EventListItem[]> {
  const ids = await fetchEntityEventIds(`/api/venues/${id}/events`);
  return filterFromCache(ids);
}

export async function fetchEnsembleEvents(id: string): Promise<EventListItem[]> {
  const ids = await fetchEntityEventIds(`/api/ensembles/${id}/events`);
  return filterFromCache(ids);
}

export async function fetchFestivalEvents(id: string): Promise<EventListItem[]> {
  const ids = await fetchEntityEventIds(`/api/festivals/${id}/events`);
  return filterFromCache(ids);
}

export async function fetchPaymentMethodEvents(id: string): Promise<EventListItem[]> {
  const ids = await fetchEntityEventIds(`/api/payment-methods/${id}/events`);
  return filterFromCache(ids);
}

// Name cache to avoid redundant lookups
const nameCache = new Map<string, Promise<{ id: string; name: string; edition?: string | null }>>();

function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (!nameCache.has(key)) nameCache.set(key, fetcher() as Promise<{ id: string; name: string }>);
  return nameCache.get(key) as Promise<T>;
}

export async function fetchPerson(id: string): Promise<{ id: string; name: string }> {
  return cachedFetch(`person:${id}`, async () => {
    const res = await apiFetch(`/api/persons/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch person: ${res.status}`);
    return res.json();
  });
}

export async function fetchVenue(id: string): Promise<{ id: string; name: string }> {
  return cachedFetch(`venue:${id}`, async () => {
    const res = await apiFetch(`/api/venues/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch venue: ${res.status}`);
    return res.json();
  });
}

export async function fetchEnsemble(id: string): Promise<{ id: string; name: string }> {
  return cachedFetch(`ensemble:${id}`, async () => {
    const res = await apiFetch(`/api/ensembles/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch ensemble: ${res.status}`);
    return res.json();
  });
}

export async function fetchFestival(id: string): Promise<{ id: string; name: string; edition?: string | null }> {
  return cachedFetch(`festival:${id}`, async () => {
    const res = await apiFetch(`/api/festivals/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch festival: ${res.status}`);
    return res.json();
  });
}

export async function searchEntities(endpoint: string, q: string, limit?: number): Promise<{ id: string; name?: string; title?: string; type?: string; edition?: string | null; city?: string | null }[]> {
  limit = limit ?? 10;
  const res = await apiFetch(`/api/${endpoint}?q=${encodeURIComponent(q)}&limit=${limit}`);
  if (!res.ok) return [];
  return res.json();
}

export async function createEntity(kind: string, data: Record<string, unknown>): Promise<{ id: string; name?: string; title?: string }> {
  const res = await apiFetch(`/api/${kind}s`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error(`Failed to create ${kind}`);
  return res.json();
}

export async function createEvent(typeOrData: string | Record<string, unknown>, payload?: Record<string, unknown>): Promise<{ id: string }> {
  const data = typeof typeOrData === "string" ? { type: typeOrData, ...payload } : typeOrData;
  const res = await apiFetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as { error?: string }).error ?? "Failed to create event"); }
  invalidateEventsCache();
  return res.json();
}

export async function updateEvent(id: string, data: Record<string, unknown>): Promise<void> {
  const res = await apiFetch(`/api/events/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed to update event");
  invalidateEventsCache();
}

export async function createPaymentMethod(data: Record<string, unknown>): Promise<PaymentMethod> {
  const res = await apiFetch("/api/payment-methods", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed to create payment method");
  return res.json();
}

export async function patchEventReview(id: string, review: string | null): Promise<void> {
  await apiFetch(`/api/events/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ review }) });
  invalidateEventsCache();
}

export async function patchEventRating(id: string, rating: number | null): Promise<void> {
  await apiFetch(`/api/events/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating }) });
  invalidateEventsCache();
}

export async function patchEventPrice(id: string, price_paid: string, currency: string): Promise<void> {
  await apiFetch(`/api/events/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ price_paid, currency }) });
  invalidateEventsCache();
}
