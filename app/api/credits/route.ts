import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = createServiceClient();

  const [
    { data: credits, error },
    { data: classicalItems },
    { data: balletMusic },
  ] = await Promise.all([
    supabase.from("event_credit").select("event_id, person_id, ensemble_id"),
    supabase.from("classical_programme_item").select("event_id, musical_piece:musical_piece_id(composer_id)"),
    supabase.from("ballet_programme_music").select("programme_item:programme_item_id(event_id), musical_piece:musical_piece_id(composer_id)"),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows: Array<{ event_id: string; person_id: string | null; ensemble_id: string | null }> = [...(credits ?? [])];

  for (const item of classicalItems ?? []) {
    const piece = (item.musical_piece as unknown as { composer_id: string | null } | null);
    if (item.event_id && piece?.composer_id) rows.push({ event_id: item.event_id, person_id: piece.composer_id, ensemble_id: null });
  }

  for (const bm of balletMusic ?? []) {
    const progItem = (bm.programme_item as unknown as { event_id: string } | null);
    const piece = (bm.musical_piece as unknown as { composer_id: string | null } | null);
    if (progItem?.event_id && piece?.composer_id) rows.push({ event_id: progItem.event_id, person_id: piece.composer_id, ensemble_id: null });
  }

  const res = NextResponse.json(rows);
  res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=300");
  return res;
}
