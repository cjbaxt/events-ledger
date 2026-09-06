import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireOwner } from "@/lib/auth";

type ItemInput = {
  musical_piece_id: string | null;
  piece_title?: string;
  movement?: string | null;
  catalogue_number?: string | null;
  composer_id?: string | null;
  composer_text?: string | null;
  soloists?: string[];
  notes?: string | null;
};

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireOwner(); if (deny) return deny;
  const { id } = await params;
  const items = (await req.json()) as ItemInput[];
  const supabase = createServiceClient();

  await supabase.from("classical_programme_item").delete().eq("event_id", id);

  if (!items.length) return NextResponse.json({ ok: true });

  const resolved: Array<{ id: string; event_id: string; musical_piece_id: string; soloists: string[]; order: number; notes: string | null }> = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let pieceId = item.musical_piece_id;
    if (!pieceId && item.piece_title?.trim()) {
      const { data } = await supabase
        .from("musical_piece")
        .insert({
          id: randomUUID(),
          title: item.piece_title.trim(),
          movement: item.movement?.trim() || null,
          catalogue_number: item.catalogue_number?.trim() || null,
          composer_id: item.composer_id || null,
          composer_text: item.composer_text?.trim() || null,
        })
        .select("id")
        .single();
      pieceId = data?.id ?? null;
    }
    if (!pieceId) continue;
    resolved.push({
      id: randomUUID(),
      event_id: id,
      musical_piece_id: pieceId,
      soloists: item.soloists ?? [],
      order: i + 1,
      notes: item.notes?.trim() || null,
    });
  }

  if (resolved.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("classical_programme_item").insert(resolved as any);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// POST: append a single programme item without wiping existing ones
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireOwner(); if (deny) return deny;
  const { id } = await params;
  const body = await req.json() as {
    musical_piece_id?: string | null;
    piece_title?: string;
    movement?: string | null;
    catalogue_number?: string | null;
    composer_id?: string | null;
    composer_text?: string | null;
    notes?: string | null;
    order?: number;
  };
  const supabase = createServiceClient();

  let pieceId = body.musical_piece_id ?? null;
  if (!pieceId && body.piece_title?.trim()) {
    const { data } = await supabase
      .from("musical_piece")
      .insert({
        id: randomUUID(),
        title: body.piece_title.trim(),
        movement: body.movement?.trim() || null,
        catalogue_number: body.catalogue_number?.trim() || null,
        composer_id: body.composer_id || null,
        composer_text: body.composer_text?.trim() || null,
      })
      .select("id")
      .single();
    pieceId = data?.id ?? null;
  }
  if (!pieceId) return NextResponse.json({ error: "musical_piece_id or piece_title required" }, { status: 400 });

  const { data: existing } = await supabase
    .from("classical_programme_item")
    .select("order")
    .eq("event_id", id)
    .order("order", { ascending: false })
    .limit(1);
  const nextOrder = (body.order ?? ((existing?.[0] as { order: number | null } | undefined)?.order ?? 0) + 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.from("classical_programme_item").insert({
    id: randomUUID(),
    event_id: id,
    musical_piece_id: pieceId,
    soloists: [],
    order: nextOrder,
    notes: body.notes?.trim() || null,
  } as any).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
