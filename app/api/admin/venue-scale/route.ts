import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

const SCALE_OPTIONS = ["studio", "intimate", "small", "medium", "large", "arena"];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();
  // Venues that appear in at least one event and have no scale set
  const { data } = await db
    .from("venue")
    .select("id, name, city, country, scale")
    .is("scale", null)
    .order("name");

  // Filter to only venues that have been used in events
  const venueIds = (data ?? []).map((v) => v.id);
  if (venueIds.length === 0) return NextResponse.json({ venues: [], scaleOptions: SCALE_OPTIONS });

  const { data: usedIds } = await db
    .from("event")
    .select("venue_id")
    .in("venue_id", venueIds);

  const used = new Set((usedIds ?? []).map((r) => r.venue_id));
  const venues = (data ?? []).filter((v) => used.has(v.id));

  return NextResponse.json({ venues, scaleOptions: SCALE_OPTIONS });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, scale } = await req.json();
  const db = createServiceClient();
  const { error } = await db.from("venue").update({ scale }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
