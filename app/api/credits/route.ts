import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireOwner } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const deny = await requireOwner(); if (deny) return deny;
  const body = await req.json();
  const { event_id, person_id, ensemble_id, role, note, is_main, sort_order } = body;
  if (!event_id || !role || (!person_id && !ensemble_id)) {
    return NextResponse.json({ error: "event_id, role and person_id or ensemble_id required" }, { status: 400 });
  }
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("event_credit").insert({
    event_id, role,
    person_id: person_id ?? null,
    ensemble_id: ensemble_id ?? null,
    note: note ?? null,
    is_main: is_main ?? false,
    sort_order: sort_order ?? 0,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

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
