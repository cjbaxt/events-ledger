export type EventStatus = "attended" | "cancelled";

export interface PaymentMethodRef {
  id: string;
  name: string;
  total_cost: string;
  currency: string;
  purchase_date: string;
}

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
  payment_method_id: string | null;
  rating: number | null;
  data_completeness: string | null;
  substack_url: string | null;
  status: EventStatus;
  primary_entity_name: string | null;
  primary_entity_id: string | null;
  primary_entity_kind: "person" | "ensemble" | null;
  has_review: boolean;
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
  venue_path: NamedRef[];
  work_id: string | null;
  festival: NamedRef | null;
  price_paid: string | null;
  currency: string | null;
  payment_method: PaymentMethodRef | null;
  rating: number | null;
  notes: string | null;
  review: string | null;
  links: Array<{ url: string; label?: string }> | null;
  data_completeness: string | null;
  status: EventStatus;
  related_events: Array<{ id: string; title: string; date: string; type: string }>;
  extension: Record<string, unknown> | null;
}
