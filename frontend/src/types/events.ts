export type EventStatus = "attended" | "planned" | "cancelled";

export interface EventListItem {
  id: string;
  date: string;
  time: string | null;
  type: string;
  subtype: string | null;
  title: string;
  venue_id: string;
  venue_name: string;
  festival_id: string | null;
  festival_name: string | null;
  price_paid: string | null;
  currency: string | null;
  rating: number | null;
  data_completeness: string | null;
  substack_url: string | null;
  status: EventStatus;
}

export interface NamedRef {
  id: string;
  name: string;
}

export interface EventDetail {
  id: string;
  date: string;
  time: string | null;
  type: string;
  subtype: string | null;
  title: string;
  venue: NamedRef;
  venue_parent: NamedRef | null;
  work_id: string | null;
  festival: NamedRef | null;
  price_paid: string | null;
  currency: string | null;
  rating: number | null;
  notes: string | null;
  substack_url: string | null;
  data_completeness: string | null;
  status: EventStatus;
  extension: Record<string, unknown> | null;
}
