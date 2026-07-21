import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isGuestRequest, guestDenied } from "@/lib/guest";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") ?? "10");
  const supabase = createServiceClient();
  let query = supabase.from("production").select("id, title").order("title").limit(limit);
  if (q) query = query.ilike("title", `%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (isGuestRequest(req)) return guestDenied();
  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("production").insert({ id: randomUUID(), title: body.title.trim() }).select("id, title").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
