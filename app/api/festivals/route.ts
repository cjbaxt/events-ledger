import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isGuestRequest, guestDenied } from "@/lib/guest";
import { requireOwner } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? "";
  const limit = parseInt(searchParams.get("limit") ?? "10");
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("get_festivals_recent", { search_q: q }).limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const res = NextResponse.json(data ?? []);
  res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=300");
  return res;
}

export async function POST(req: NextRequest) {
  const deny = await requireOwner(); if (deny) return deny;
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const supabase = createServiceClient();
  const insert: Record<string, unknown> = { id: randomUUID(), name: body.name.trim() };
  if (body.edition) insert.edition = body.edition.trim();
  const { data, error } = await supabase.from("festival").insert(insert).select("id, name, edition").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
