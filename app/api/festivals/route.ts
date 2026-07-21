import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isGuestRequest, guestDenied } from "@/lib/guest";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") ?? "10");
  const supabase = createServiceClient();
  let query = supabase.from("festival").select("id, name, edition").order("name").limit(limit);
  if (q) query = query.or(`name.ilike.%${q}%,edition.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const res = NextResponse.json(data ?? []);
  res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=300");
  return res;
}

export async function POST(req: NextRequest) {
  if (isGuestRequest(req)) return guestDenied();
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const supabase = createServiceClient();
  const insert: Record<string, unknown> = { id: randomUUID(), name: body.name.trim() };
  if (body.edition) insert.edition = body.edition.trim();
  const { data, error } = await supabase.from("festival").insert(insert).select("id, name, edition").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
