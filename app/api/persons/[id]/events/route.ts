import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const [
    creditRes,
    classicalComposerRes,
    classicalSoloistsRes,
    balletChoreographerRes,
    balletSoloistsRes,
    balletMusicComposerRes,
  ] = await Promise.all([
    // Direct credits (performer, conductor, director, etc.)
    supabase.from("event_credit").select("event_id").eq("person_id", id),
    // Classical programme: person composed a piece performed at event
    supabase.from("classical_programme_item")
      .select("event_id, musical_piece!inner(composer_id)")
      .eq("musical_piece.composer_id", id),
    // Classical programme: person is a soloist
    supabase.from("classical_programme_item")
      .select("event_id")
      .contains("soloists", [id]),
    // Ballet programme: person is the choreographer of a programme item
    supabase.from("ballet_programme_item")
      .select("event_id")
      .eq("choreographer_id", id),
    // Ballet programme: person is a soloist
    supabase.from("ballet_programme_item")
      .select("event_id")
      .contains("soloists", [id]),
    // Ballet programme music: person composed music used in a ballet programme item
    supabase.from("ballet_programme_music")
      .select("ballet_programme_item!inner(event_id), musical_piece!inner(composer_id)")
      .eq("musical_piece.composer_id", id),
  ]);

  const ids = new Set<string>();
  for (const r of creditRes.data ?? []) ids.add(r.event_id);
  for (const r of classicalComposerRes.data ?? []) ids.add((r as unknown as { event_id: string }).event_id);
  for (const r of classicalSoloistsRes.data ?? []) ids.add(r.event_id);
  for (const r of balletChoreographerRes.data ?? []) ids.add(r.event_id);
  for (const r of balletSoloistsRes.data ?? []) ids.add(r.event_id);
  for (const r of balletMusicComposerRes.data ?? []) {
    const item = (r as unknown as { ballet_programme_item: { event_id: string } }).ballet_programme_item;
    if (item?.event_id) ids.add(item.event_id);
  }

  return NextResponse.json([...ids]);
}
