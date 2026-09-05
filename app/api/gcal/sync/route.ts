import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireOwner } from "@/lib/auth";
import { upsertGCalEvent } from "@/lib/google-calendar";

export async function POST(req: NextRequest) {
  const deny = await requireOwner(); if (deny) return deny;

  const supabase = createServiceClient();

  // Fetch all events with venue country for timezone calculation
  const [{ data: events, error }, endTimesRes] = await Promise.all([
    supabase.rpc("get_events_list", { p_type: null, p_q: null, p_festival_id: null, p_limit: 2000, p_offset: 0 }),
    supabase.from("event").select("id, end_time"),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const endTimeMap = new Map<string, string | null>(
    (endTimesRes.data ?? []).map((r: { id: string; end_time: string | null }) => [r.id, r.end_time])
  );

  const venueIds = [...new Set((events ?? []).map((e: Record<string, unknown>) => e.venue_id as string).filter(Boolean))];
  const { data: venues } = await supabase.from("venue").select("id, country, city").in("id", venueIds);
  const venueMap = new Map((venues ?? []).map((v) => [v.id, v]));

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const e of (events ?? []) as Array<Record<string, unknown>>) {
    const venue = venueMap.get(e.venue_id as string);
    try {
      await upsertGCalEvent({
        id: e.id as string,
        title: e.title as string,
        date: e.date as string,
        time: e.time as string | null,
        end_time: endTimeMap.get(e.id as string) ?? null,
        venue_name: e.venue_name as string | null,
        venue_city: venue?.city ?? null,
        venue_country: venue?.country ?? null,
        festival_name: e.festival_name as string | null,
      });
      synced++;
    } catch (err) {
      failed++;
      errors.push(`${e.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ synced, failed, errors: errors.slice(0, 10) });
}
