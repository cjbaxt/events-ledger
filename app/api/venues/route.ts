import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isGuestRequest, guestDenied } from "@/lib/guest";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") ?? "10");
  const supabase = createServiceClient();
  let query = supabase.from("venue").select("id, name, city, country, parent_id, parent:parent_id(id, name)").order("name").limit(limit);
  if (q) query = query.ilike("name", `%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const res = NextResponse.json((data ?? []).map((v) => {
    const parent = v.parent as { id: string; name: string } | { id: string; name: string }[] | null;
    const parentName = Array.isArray(parent) ? (parent[0]?.name ?? null) : (parent?.name ?? null);
    return { id: v.id, name: v.name, city: v.city, country: v.country, parent_id: v.parent_id, parent_name: parentName };
  }));
  res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=300");
  return res;
}

export async function POST(req: NextRequest) {
  if (isGuestRequest(req)) return guestDenied();
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const supabase = createServiceClient();
  const insert: Record<string, unknown> = { id: randomUUID(), name: body.name.trim() };
  if (body.city) insert.city = body.city.trim();
  if (body.country) insert.country = body.country.trim();
  if (body.parent_id) insert.parent_id = body.parent_id;
  const { data, error } = await supabase.from("venue").insert(insert).select("id, name").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
