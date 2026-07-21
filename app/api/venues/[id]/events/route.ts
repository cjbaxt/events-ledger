import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  // Include child venues (e.g. stages within a venue)
  const childRes = await supabase.from("venue").select("id").eq("parent_id", id);
  const venueIds = [id, ...(childRes.data ?? []).map((v: { id: string }) => v.id)];

  const { data, error } = await supabase.from("event").select("id").in("venue_id", venueIds);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json((data ?? []).map((r) => r.id));
}
