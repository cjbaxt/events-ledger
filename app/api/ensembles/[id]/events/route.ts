import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [classicalRes, operaRes, balletRes, danceRes, circusRes, cabaretRes, comedyRes, musicRes, theatreRes] = await Promise.all([
    supabase.from("event_classical").select("event_id").eq("ensemble_id", id),
    supabase.from("event_opera").select("event_id").eq("ensemble_id", id),
    supabase.from("event_ballet").select("event_id").eq("company_id", id),
    supabase.from("event_dance").select("event_id").eq("company_id", id),
    supabase.from("event_circus").select("event_id").eq("company_id", id),
    supabase.from("event_cabaret").select("event_id").eq("ensemble_id", id),
    supabase.from("event_comedy").select("event_id").eq("ensemble_id", id),
    supabase.from("event_music").select("event_id").eq("headliner_ensemble_id", id),
    supabase.from("event_theatre").select("event_id").eq("company_id", id),
  ]);

  const ids = new Set<string>();
  for (const res of [classicalRes, operaRes, balletRes, danceRes, circusRes, cabaretRes, comedyRes, musicRes, theatreRes]) {
    for (const row of res.data ?? []) ids.add(row.event_id);
  }

  return NextResponse.json([...ids]);
}
