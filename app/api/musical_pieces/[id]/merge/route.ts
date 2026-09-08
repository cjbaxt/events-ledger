import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireOwner } from "@/lib/auth";

// POST /api/musical_pieces/[id]/merge
// Body: { absorb_ids: string[] }
// Re-points all classical_programme_item rows from absorb_ids to [id], then deletes the absorbed pieces.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireOwner(); if (deny) return deny;
  const { id } = await params;
  const { absorb_ids } = await req.json() as { absorb_ids: string[] };
  if (!absorb_ids?.length) return NextResponse.json({ error: "absorb_ids required" }, { status: 400 });
  if (absorb_ids.includes(id)) return NextResponse.json({ error: "Cannot absorb self" }, { status: 400 });

  const supabase = createServiceClient();

  // Re-point programme items
  const { error: updateErr } = await supabase
    .from("classical_programme_item")
    .update({ musical_piece_id: id })
    .in("musical_piece_id", absorb_ids);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Delete the now-orphaned duplicate pieces
  const { error: deleteErr } = await supabase
    .from("musical_piece")
    .delete()
    .in("id", absorb_ids);
  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, merged: absorb_ids.length });
}
