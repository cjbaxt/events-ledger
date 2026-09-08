import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireOwner } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("musical_piece")
    .select("id, title, movement, catalogue_number, composer_text, work_type, composer:composer_id(id, name)")
    .eq("id", id)
    .single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireOwner(); if (deny) return deny;
  const { id } = await params;
  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if ("title" in body && body.title?.trim()) updates.title = body.title.trim();
  if ("movement" in body) updates.movement = body.movement?.trim() || null;
  if ("catalogue_number" in body) updates.catalogue_number = body.catalogue_number?.trim() || null;
  if ("composer_text" in body) updates.composer_text = body.composer_text?.trim() || null;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("musical_piece")
    .update(updates)
    .eq("id", id)
    .select("id, title, movement, catalogue_number, composer_text, work_type, composer:composer_id(id, name)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
