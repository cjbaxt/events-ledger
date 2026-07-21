import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") ?? "10");
  const supabase = await createClient();
  let query = supabase.from("venue").select("id, name, city, country, parent_id").order("name").limit(limit);
  if (q) query = query.ilike("name", `%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with parent name for display in comboboxes
  const parentIds = [...new Set((data ?? []).filter((v) => v.parent_id).map((v) => v.parent_id as string))];
  let parentMap: Record<string, string> = {};
  if (parentIds.length) {
    const { data: parents } = await supabase.from("venue").select("id, name").in("id", parentIds);
    parentMap = Object.fromEntries((parents ?? []).map((p) => [p.id, p.name]));
  }
  return NextResponse.json((data ?? []).map((v) => ({ ...v, parent_name: v.parent_id ? parentMap[v.parent_id] ?? null : null })));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const supabase = await createClient();
  const insert: Record<string, unknown> = { name: body.name.trim() };
  if (body.city) insert.city = body.city.trim();
  if (body.country) insert.country = body.country.trim();
  if (body.parent_id) insert.parent_id = body.parent_id;
  const { data, error } = await supabase.from("venue").insert(insert).select("id, name").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
