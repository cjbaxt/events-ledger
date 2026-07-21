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

export async function fetchEvents(params: { type?: string; q?: string; limit?: number; offset?: number } = {}): Promise<EventListItem[]> {
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

export async function fetchPersonEvents(id: string): Promise<EventListItem[]> {
  const res = await apiFetch(`/api/persons/${id}/events`);
  if (!res.ok) throw new Error(`Failed to fetch person events: ${res.status}`);
  return res.json();
}

export async function fetchVenueEvents(id: string): Promise<EventListItem[]> {
  const res = await apiFetch(`/api/venues/${id}/events`);
  if (!res.ok) throw new Error(`Failed to fetch venue events: ${res.status}`);
  return res.json();
}

export async function fetchEnsembleEvents(id: string): Promise<EventListItem[]> {
  const res = await apiFetch(`/api/ensembles/${id}/events`);
  if (!res.ok) throw new Error(`Failed to fetch ensemble events: ${res.status}`);
  return res.json();
}

export async function fetchFestivalEvents(id: string): Promise<EventListItem[]> {
  const res = await apiFetch(`/api/festivals/${id}/events`);
  if (!res.ok) throw new Error(`Failed to fetch festival events: ${res.status}`);
  return res.json();
}

export async function fetchPaymentMethodEvents(id: string): Promise<EventListItem[]> {
  const res = await apiFetch(`/api/payment-methods/${id}/events`);
  if (!res.ok) throw new Error(`Failed to fetch payment method events: ${res.status}`);
  return res.json();
}

export async function fetchPerson(id: string): Promise<{ id: string; name: string }> {
  const res = await apiFetch(`/api/persons/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch person: ${res.status}`);
  return res.json();
}

export async function fetchVenue(id: string): Promise<{ id: string; name: string }> {
  const res = await apiFetch(`/api/venues/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch venue: ${res.status}`);
  return res.json();
}

export async function fetchEnsemble(id: string): Promise<{ id: string; name: string }> {
  const res = await apiFetch(`/api/ensembles/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch ensemble: ${res.status}`);
  return res.json();
}

export async function fetchFestival(id: string): Promise<{ id: string; name: string; edition?: string | null }> {
  const res = await apiFetch(`/api/festivals/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch festival: ${res.status}`);
  return res.json();
}

export async function searchEntities(endpoint: string, q: string): Promise<Array<{ id: string; name?: string; title?: string; edition?: string; parent_name?: string }>> {
  const res = await apiFetch(`/api/${endpoint}?q=${encodeURIComponent(q)}&limit=10`);
  if (!res.ok) return [];
  return res.json();
}

export async function createEntity(endpoint: string, data: Record<string, unknown>): Promise<{ id: string; name?: string; title?: string }> {
  const res = await apiFetch(`/api/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error ?? `Failed to create`); }
  return res.json();
}

export async function createEvent(type: string, payload: Record<string, unknown>): Promise<{ id: string }> {
  const res = await apiFetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, ...payload }),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error ?? `Failed to create event`); }
  return res.json();
}

export async function updateEvent(id: string, payload: Record<string, unknown>): Promise<{ id: string }> {
  const res = await apiFetch(`/api/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error ?? `Failed to update event`); }
  return { id };
}

export async function createPaymentMethod(data: { name: string; total_cost: number; currency: string; purchase_date: string; notes?: string }): Promise<PaymentMethod> {
  const res = await apiFetch("/api/payment-methods", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error ?? `Failed to create payment method`); }
  return res.json();
}

export async function patchEventRating(id: string, rating: number | null): Promise<void> {
  await apiFetch(`/api/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating }),
  });
}

export async function patchEventReview(id: string, review: string | null): Promise<void> {
  await apiFetch(`/api/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ review }),
  });
}

export async function patchEventPrice(id: string, price: string, currency: string): Promise<void> {
  await apiFetch(`/api/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ price_paid: price, currency }),
  });
}
