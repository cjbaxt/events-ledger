import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_events_list", {
    p_type: null, p_q: null, p_festival_id: id, p_limit: 500, p_offset: 0,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id, date: r.date, time: r.time, type: r.type, subtype: r.subtype, title: r.title,
    venue_id: r.venue_id, venue_name: r.venue_name, festival_id: r.festival_id, festival_name: r.festival_name,
    price_paid: r.price_paid != null ? String(r.price_paid) : null, currency: r.currency,
    payment_method_id: r.payment_method_id, rating: r.rating, rating_context: r.rating_context,
    data_completeness: r.data_completeness, primary_entity_name: r.primary_entity_name,
    primary_entity_id: r.primary_entity_id, primary_entity_kind: r.primary_entity_kind,
    has_review: r.has_review, has_essay: r.has_essay,
  })));
}
