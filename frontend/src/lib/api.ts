import type { EventListItem, EventDetail } from "../types/events";

const BASE = import.meta.env.PUBLIC_API_URL ?? "";

async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, init);
}

export async function fetchEvents(params: {
  status?: string;
  type?: string;
  q?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<EventListItem[]> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
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
  const res = await authFetch(`${BASE}/api/events/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch event: ${res.status}`);
  return res.json();
}

export async function patchEventRating(id: string, rating: number | null): Promise<void> {
  const res = await authFetch(`${BASE}/api/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating }),
  });
  if (!res.ok) throw new Error(`Failed to patch rating: ${res.status}`);
}

export async function patchEventReview(id: string, review: string | null): Promise<void> {
  const res = await authFetch(`${BASE}/api/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ review }),
  });
  if (!res.ok) throw new Error(`Failed to patch review: ${res.status}`);
}

export async function patchEventLinks(id: string, links: Array<{ url: string; label?: string }>): Promise<void> {
  const res = await authFetch(`${BASE}/api/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ links }),
  });
  if (!res.ok) throw new Error(`Failed to patch links: ${res.status}`);
}

export async function patchEventPrice(id: string, price: string, currency: string): Promise<void> {
  const res = await authFetch(`${BASE}/api/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ price_paid: price, currency }),
  });
  if (!res.ok) throw new Error(`Failed to patch price: ${res.status}`);
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

export interface PersonRef {
  id: string;
  name: string;
}

export async function fetchPerson(id: string): Promise<PersonRef> {
  const res = await authFetch(`${BASE}/api/persons/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch person: ${res.status}`);
  return res.json();
}

export async function fetchPersonEvents(id: string): Promise<EventListItem[]> {
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
  const res = await authFetch(`${BASE}/api/venues/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch venue: ${res.status}`);
  return res.json();
}

export async function fetchVenueEvents(id: string): Promise<EventListItem[]> {
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
  const res = await authFetch(`${BASE}/api/ensembles/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch ensemble: ${res.status}`);
  return res.json();
}

export async function fetchEnsembleEvents(id: string): Promise<EventListItem[]> {
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
  const res = await authFetch(`${BASE}/api/festivals/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch festival: ${res.status}`);
  return res.json();
}

export async function fetchFestivalEvents(id: string): Promise<EventListItem[]> {
  const res = await authFetch(`${BASE}/api/festivals/${id}/events`);
  if (!res.ok) throw new Error(`Failed to fetch festival events: ${res.status}`);
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
  const res = await authFetch(`${BASE}/api/payment-methods`);
  if (!res.ok) throw new Error(`Failed to fetch payment methods: ${res.status}`);
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
