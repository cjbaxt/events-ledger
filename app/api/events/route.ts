import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EventListItem } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type") || null;
  const q = searchParams.get("q") || null;
  const festival_id = searchParams.get("festival_id") || null;
  const limit = parseInt(searchParams.get("limit") ?? "500");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_events_list", {
    p_type: type,
    p_q: q,
    p_festival_id: festival_id,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error("get_events_list error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items: EventListItem[] = (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    date: r.date as string,
    time: r.time as string | null,
    type: r.type as string,
    subtype: r.subtype as string | null,
    title: r.title as string,
    venue_id: r.venue_id as string,
    venue_name: r.venue_name as string,
    festival_id: r.festival_id as string | null,
    festival_name: r.festival_name as string | null,
    price_paid: r.price_paid != null ? String(r.price_paid) : null,
    currency: r.currency as string | null,
    payment_method_id: r.payment_method_id as string | null,
    rating: r.rating as number | null,
    rating_context: r.rating_context as string | null,
    data_completeness: r.data_completeness as string | null,
    primary_entity_name: r.primary_entity_name as string | null,
    primary_entity_id: r.primary_entity_id as string | null,
    primary_entity_kind: r.primary_entity_kind as "person" | "ensemble" | null,
    has_review: r.has_review as boolean,
    has_essay: r.has_essay as boolean,
  }));

  return NextResponse.json(items);
}
