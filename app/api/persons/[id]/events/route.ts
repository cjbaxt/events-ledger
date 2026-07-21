import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_events_list", {
    p_type: null, p_q: null, p_festival_id: null, p_limit: 500, p_offset: 0,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter to events featuring this person in any role across extension tables
  const allEvents = (data ?? []) as Record<string, unknown>[];

  // Get event IDs where this person appears in any extension table
  const [
    musicRes, classicalRes, operaRes, balletRes, danceRes, circusRes,
    theatreRes, cabaretRes, comedyRes, spokenWordRes, talkRes,
  ] = await Promise.all([
    supabase.from("music_event").select("event_id").or(`performer->id.eq.${id}`),
    supabase.from("classical_event").select("event_id").or(`conductor->id.eq.${id},soloists.cs.[{"id":"${id}"}]`),
    supabase.from("opera_event").select("event_id").or(`conductor->id.eq.${id}`),
    supabase.from("ballet_event").select("event_id").or(`choreographer->id.eq.${id}`),
    supabase.from("dance_event").select("event_id").or(`choreographer->id.eq.${id}`),
    supabase.from("circus_event").select("event_id").or(`performer->id.eq.${id}`),
    supabase.from("theatre_event").select("event_id").or(`director->id.eq.${id},playwright->id.eq.${id}`),
    supabase.from("cabaret_event").select("event_id").or(`headliner->id.eq.${id}`),
    supabase.from("comedy_event").select("event_id").or(`headliner->id.eq.${id},support_acts.cs.[{"id":"${id}"}]`),
    supabase.from("spoken_word_event").select("event_id").or(`speakers.cs.[{"id":"${id}"}]`),
    supabase.from("talk_event").select("event_id").or(`speakers.cs.[{"id":"${id}"}]`),
  ]);

  const eventIdSet = new Set<string>();
  for (const res of [musicRes, classicalRes, operaRes, balletRes, danceRes, circusRes, theatreRes, cabaretRes, comedyRes, spokenWordRes, talkRes]) {
    for (const row of res.data ?? []) eventIdSet.add((row as { event_id: string }).event_id);
  }

  const filtered = allEvents.filter((e) => eventIdSet.has(e.id as string));
  return NextResponse.json(filtered.map(toListItem));
}

function toListItem(r: Record<string, unknown>) {
  return {
    id: r.id, date: r.date, time: r.time, type: r.type, subtype: r.subtype, title: r.title,
    venue_id: r.venue_id, venue_name: r.venue_name, festival_id: r.festival_id, festival_name: r.festival_name,
    price_paid: r.price_paid != null ? String(r.price_paid) : null, currency: r.currency,
    payment_method_id: r.payment_method_id, rating: r.rating, rating_context: r.rating_context,
    data_completeness: r.data_completeness, primary_entity_name: r.primary_entity_name,
    primary_entity_id: r.primary_entity_id, primary_entity_kind: r.primary_entity_kind,
    has_review: r.has_review, has_essay: r.has_essay,
  };
}
