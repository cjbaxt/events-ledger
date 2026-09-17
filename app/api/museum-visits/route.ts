import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const { data, error } = await supabase
    .from("museum_visit")
    .select("id, date, used_museumkaart, venue:venue_id(id, name)")
    .order("date", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json([], { status: 200 });
  const results = (data ?? []).filter((v: { venue: { name: string } | null; date: string }) => {
    if (!q) return true;
    const search = q.toLowerCase();
    return (v.venue?.name ?? "").toLowerCase().includes(search) || v.date.includes(search);
  });
  return NextResponse.json(results.map((v: { id: string; date: string; used_museumkaart: boolean; venue: { id: string; name: string } | null }) => ({
    id: v.id,
    name: `${v.venue?.name ?? "Unknown"} — ${v.date}${v.used_museumkaart ? " · Museumkaart" : ""}`,
    date: v.date,
    venue: v.venue,
    used_museumkaart: v.used_museumkaart,
  })));
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const db = createServiceClient();
  const { data, error } = await db
    .from("museum_visit")
    .insert({ date: body.date, venue_id: body.venue_id, used_museumkaart: body.used_museumkaart ?? false })
    .select("id, date, used_museumkaart, venue:venue_id(id, name)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
