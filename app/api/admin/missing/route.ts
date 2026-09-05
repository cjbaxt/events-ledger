import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type");
  const today = new Date().toISOString().slice(0, 10);
  const db = createServiceClient();

  let query = db.from("event").select("id, title, date, type").lte("date", today).order("date", { ascending: false });
  if (type) query = query.eq("type", type);

  const { data: events, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!events?.length) return NextResponse.json({ events: [] });

  const allIds = events.map((e) => e.id);
  const { data: credited } = await db.from("event_credit").select("event_id").in("event_id", allIds);
  const creditedSet = new Set((credited ?? []).map((r) => r.event_id));

  return NextResponse.json({ events: events.filter((e) => !creditedSet.has(e.id)) });
}
