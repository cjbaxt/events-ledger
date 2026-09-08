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

async function findOrCreatePiece(supabase: ReturnType<typeof createServiceClient>, opts: {
  title: string; composerId?: string | null; composerText?: string | null;
  catalogueNumber?: string | null;
}): Promise<string | null> {
  const title = opts.title.trim();
  // Look for an exact title match (case-insensitive) with the same composer
  let query = supabase.from("musical_piece").select("id").ilike("title", title);
  if (opts.composerId) query = query.eq("composer_id", opts.composerId);
  else if (opts.composerText?.trim()) query = query.ilike("composer_text", opts.composerText.trim());
  const { data: existing } = await query.limit(1).maybeSingle();
  if (existing) return existing.id;
  // Not found — create it
  const { data } = await supabase
    .from("musical_piece")
    .insert({
      id: randomUUID(),
      title,
      catalogue_number: opts.catalogueNumber?.trim() || null,
      composer_id: opts.composerId || null,
      // Only store composer_text when there's no linked composer_id
      composer_text: opts.composerId ? null : (opts.composerText?.trim() || null),
    })
    .select("id")
    .single();
  return data?.id ?? null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireOwner(); if (deny) return deny;
  const { id } = await params;
  const body = await req.json() as ItemInput[] | { items: ItemInput[]; clear: boolean };
  const items: ItemInput[] = Array.isArray(body) ? body : (body.items ?? []);
  const clear: boolean = !Array.isArray(body) && !!body.clear;
  const supabase = createServiceClient();

  // Only wipe existing items if there are replacements to put in their place,
  // or if the caller explicitly passes clear:true (intentional programme reset).
  if (items.length === 0 && !clear) return NextResponse.json({ ok: true });

  await supabase.from("classical_programme_item").delete().eq("event_id", id);

  if (!items.length) return NextResponse.json({ ok: true });

  const resolved: Array<{ id: string; event_id: string; musical_piece_id: string; soloists: string[]; order: number; notes: string | null }> = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let pieceId = item.musical_piece_id;
    if (!pieceId && item.piece_title?.trim()) {
      pieceId = await findOrCreatePiece(supabase, {
        title: item.piece_title,
        composerId: item.composer_id || null,
        composerText: item.composer_text || null,
        catalogueNumber: item.catalogue_number || null,
      });
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
    pieceId = await findOrCreatePiece(supabase, {
      title: body.piece_title,
      composerId: body.composer_id || null,
      composerText: body.composer_text || null,
      catalogueNumber: body.catalogue_number || null,
    });
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
