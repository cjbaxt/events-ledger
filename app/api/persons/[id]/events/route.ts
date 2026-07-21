import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EventListItem } from "@/lib/types";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Find all event_ids where this person appears in any extension table
  const [comedyRes, musicRes, cabaretRes, talkRes, spokenWordRes, theatreRes, operaRes, balletRes, classicalRes, creditRes] = await Promise.all([
    supabase.from("event_comedy").select("event_id").eq("performer_id", id),
    supabase.from("event_music").select("event_id").eq("headliner_person_id", id),
    supabase.from("event_cabaret").select("event_id").eq("headliner_id", id),
    supabase.from("event_talk").select("event_id").contains("speaker_ids", [id]),
    supabase.from("event_spoken_word").select("event_id").contains("performers", [id]),
    supabase.from("event_theatre").select("event_id").eq("director_id", id),
    supabase.from("event_opera").select("event_id").eq("conductor_id", id),
    supabase.from("event_ballet").select("event_id").eq("choreographer_id", id),
    supabase.from("event_classical").select("event_id").eq("conductor_id", id),
    supabase.from("event_credit").select("event_id").eq("person_id", id),
  ]);

  const eventIdSet = new Set<string>();
  for (const res of [comedyRes, musicRes, cabaretRes, talkRes, spokenWordRes, theatreRes, operaRes, balletRes, classicalRes, creditRes]) {
    for (const row of res.data ?? []) eventIdSet.add(row.event_id);
  }

  if (!eventIdSet.size) return NextResponse.json([]);

  const { data, error } = await supabase.rpc("get_events_list", {
    p_type: null, p_q: null, p_festival_id: null, p_limit: 500, p_offset: 0,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = ((data ?? []) as Record<string, unknown>[])
    .filter((e) => eventIdSet.has(e.id as string))
    .map((r) => ({
      id: r.id, date: r.date, time: r.time, type: r.type, subtype: r.subtype, title: r.title,
      venue_id: r.venue_id, venue_name: r.venue_name, festival_id: r.festival_id, festival_name: r.festival_name,
      price_paid: r.price_paid != null ? String(r.price_paid) : null, currency: r.currency,
      payment_method_id: r.payment_method_id, rating: r.rating, rating_context: r.rating_context,
      data_completeness: r.data_completeness, primary_entity_name: r.primary_entity_name,
      primary_entity_id: r.primary_entity_id, primary_entity_kind: r.primary_entity_kind,
      has_review: r.has_review, has_essay: r.has_essay,
    } as EventListItem));

  return NextResponse.json(items);
}
