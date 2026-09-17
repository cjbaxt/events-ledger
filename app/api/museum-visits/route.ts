import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const { data, error } = await supabase
    .from("museum_visit")
    .select("id, date, payment_method_id, venue:venue_id(id, name), payment_method:payment_method_id(id, name)")
    .order("date", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json([], { status: 200 });
  type VisitRow = { id: string; date: string; payment_method_id: string | null; venue: { id: string; name: string } | { id: string; name: string }[] | null; payment_method: { id: string; name: string } | { id: string; name: string }[] | null };
  const rows = (data ?? []) as VisitRow[];
  const norm = <T>(v: T | T[] | null): T | null => Array.isArray(v) ? (v[0] ?? null) : v;
  const results = rows.filter((v) => {
    if (!q) return true;
    const search = q.toLowerCase();
    return (norm(v.venue)?.name ?? "").toLowerCase().includes(search) || v.date.includes(search);
  });
  return NextResponse.json(results.map((v) => {
    const venue = norm(v.venue);
    const pm = norm(v.payment_method);
    return {
      id: v.id,
      name: `${venue?.name ?? "Unknown"} — ${v.date}${pm ? ` · ${pm.name}` : ""}`,
      date: v.date,
      venue,
      payment_method: pm,
      payment_method_id: v.payment_method_id,
    };
  }));
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const db = createServiceClient();
  const { data, error } = await db
    .from("museum_visit")
    .insert({ date: body.date, venue_id: body.venue_id, payment_method_id: body.payment_method_id ?? null })
    .select("id, date, payment_method_id, venue:venue_id(id, name), payment_method:payment_method_id(id, name)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  type InsRow = { id: string; date: string; payment_method_id: string | null; venue: { id: string; name: string } | { id: string; name: string }[] | null; payment_method: { id: string; name: string } | { id: string; name: string }[] | null };
  const row = data as unknown as InsRow;
  return NextResponse.json({ id: row.id, date: row.date, payment_method_id: row.payment_method_id, venue: Array.isArray(row.venue) ? (row.venue[0] ?? null) : row.venue, payment_method: Array.isArray(row.payment_method) ? (row.payment_method[0] ?? null) : row.payment_method });
}
