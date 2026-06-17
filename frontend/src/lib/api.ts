import type { EventListItem, EventDetail } from "../types/events";

const BASE = import.meta.env.PUBLIC_API_URL ?? "";

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
  const res = await fetch(`${BASE}/api/events?${qs}`);
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
  return res.json();
}

export async function fetchEvent(id: string): Promise<EventDetail> {
  const res = await fetch(`${BASE}/api/events/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch event: ${res.status}`);
  return res.json();
}
