import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireOwner } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("ensemble").select("id, name, roles").eq("id", id).single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireOwner(); if (deny) return deny;
  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase.from("ensemble").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireOwner(); if (deny) return deny;
  const { id } = await params;
  const body = await req.json();
  const supabase = createServiceClient();
  const update: Record<string, unknown> = {};
  if ("roles" in body) update.roles = body.roles;
  if ("name" in body && typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if (!Object.keys(update).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  const { error } = await supabase.from("ensemble").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
