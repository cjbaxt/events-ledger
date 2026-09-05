import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireOwner } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") ?? "10");
  const supabase = createServiceClient();
  let query = supabase
    .from("musical_piece")
    .select("id, title, movement, catalogue_number, composer_text, composer:composer_id(id, name)")
    .order("title")
    .limit(limit);
  if (q) query = query.ilike("title", `%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const res = NextResponse.json(data ?? []);
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
