import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const [classicalRes, operaRes, balletRes, danceRes, circusRes, cabaretRes, comedyRes, musicRes, musicSupportRes, theatreRes, otherRes, screeningRes, creditRes] = await Promise.all([
    supabase.from("event_classical").select("event_id").eq("ensemble_id", id),
    supabase.from("event_opera").select("event_id").eq("ensemble_id", id),
    supabase.from("event_ballet").select("event_id").eq("company_id", id),
    supabase.from("event_dance").select("event_id").eq("company_id", id),
    supabase.from("event_circus").select("event_id").eq("company_id", id),
    supabase.from("event_cabaret").select("event_id").eq("ensemble_id", id),
    supabase.from("event_comedy").select("event_id").eq("ensemble_id", id),
    supabase.from("event_music").select("event_id").eq("headliner_ensemble_id", id),
    supabase.from("event_music").select("event_id").contains("support_act_ensemble_ids", [id]),
    supabase.from("event_theatre").select("event_id").eq("company_id", id),
    supabase.from("event_other").select("event_id").eq("company_id", id),
    supabase.from("event_screening").select("event_id").eq("ensemble_id", id),
    supabase.from("event_credit").select("event_id").eq("ensemble_id", id),
  ]);

  const ids = new Set<string>();
  for (const res of [classicalRes, operaRes, balletRes, danceRes, circusRes, cabaretRes, comedyRes, musicRes, musicSupportRes, theatreRes, otherRes, screeningRes, creditRes]) {
    for (const row of res.data ?? []) ids.add(row.event_id);
  }

  return NextResponse.json([...ids]);
}
