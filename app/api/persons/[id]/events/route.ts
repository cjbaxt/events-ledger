import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

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

  const ids = new Set<string>();
  for (const res of [comedyRes, musicRes, cabaretRes, talkRes, spokenWordRes, theatreRes, operaRes, balletRes, classicalRes, creditRes]) {
    for (const row of res.data ?? []) ids.add(row.event_id);
  }

  return NextResponse.json([...ids]);
}
