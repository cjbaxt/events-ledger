import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireOwner } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const withEvents = searchParams.get("withEvents") === "true";
  const supabase = createServiceClient();
  let query = supabase
    .from("musical_piece")
    .select("id, title, movement, catalogue_number, composer_text, composer:composer_id(id, name)")
    .order("title")
    .limit(limit);
  if (q) query = query.ilike("title", `%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let rows = (data ?? []) as Record<string, unknown>[];

  if (withEvents && rows.length > 0) {
    const ids = rows.map((r) => r.id as string);
    const { data: items } = await supabase
      .from("classical_programme_item")
      .select("musical_piece_id, event:event_id(id, title, date, type)")
      .in("musical_piece_id", ids);

    const eventsByPiece = new Map<string, { id: string; title: string; date: string; type: string }[]>();
    for (const item of items ?? []) {
      const evRaw = item.event as unknown;
      const ev = (Array.isArray(evRaw) ? evRaw[0] : evRaw) as { id: string; title: string; date: string; type: string } | null;
      if (!ev) continue;
      const pieceId = item.musical_piece_id as string;
      if (!eventsByPiece.has(pieceId)) eventsByPiece.set(pieceId, []);
      eventsByPiece.get(pieceId)!.push(ev);
    }
    rows = rows.map((r) => ({
      ...r,
      events: (eventsByPiece.get(r.id as string) ?? []).sort((a, b) => b.date.localeCompare(a.date)),
    }));
  }

  const res = NextResponse.json(rows);
  res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=300");
  return res;
}

export async function POST(req: NextRequest) {
  const deny = await requireOwner(); if (deny) return deny;
  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("musical_piece")
    .insert({
      id: randomUUID(),
      title: body.title.trim(),
      movement: body.movement?.trim() || null,
      catalogue_number: body.catalogue_number?.trim() || null,
      composer_id: body.composer_id || null,
      composer_text: body.composer_text?.trim() || null,
    })
    .select("id, title, movement, catalogue_number, composer_text, composer:composer_id(id, name)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
