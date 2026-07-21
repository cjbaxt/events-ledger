import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") ?? "10");
  const supabase = await createClient();
  let query = supabase.from("person").select("id, name").order("name").limit(limit);
  if (q) query = query.ilike("name", `%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("person").insert({ name: body.name.trim() }).select("id, name").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
