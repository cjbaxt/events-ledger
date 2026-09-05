import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireOwner } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("venue")
    .select("id, name, city, country, scale, venue_type, capacity, website_url, maps_url, parent_id, parent:parent_id(id, name)")
    .eq("id", id)
    .single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parent = data.parent as { id: string; name: string } | { id: string; name: string }[] | null;
  const parent_name = Array.isArray(parent) ? (parent[0]?.name ?? null) : (parent?.name ?? null);
  return NextResponse.json({ ...data, parent: undefined, parent_name });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireOwner(); if (deny) return deny;
  const { id } = await params;
  const body = await req.json();
  const supabase = createServiceClient();
  const allowed = ["name", "parent_id", "city", "country", "venue_type", "capacity", "website_url", "maps_url"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) { if (key in body) update[key] = body[key] ?? null; }
  if (!Object.keys(update).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  const { error } = await supabase.from("venue").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireOwner(); if (deny) return deny;
  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase.from("venue").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
