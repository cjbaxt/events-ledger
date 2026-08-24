import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = createServiceClient();

  const tables = [
    "event_opera", "event_ballet", "event_cabaret", "event_circus",
    "event_dance", "event_screening", "event_theatre",
  ] as const;

  const [directRes, programmeRes, ...extResults] = await Promise.all([
    sb.from("event").select("id").eq("work_id", id),
    sb.from("ballet_programme_item").select("event_id").eq("work_id", id),
    ...tables.map((t) => sb.from(t).select("event_id").eq("work_id", id)),
  ]);

  const ids = new Set<string>();
  for (const row of directRes.data ?? []) ids.add(row.id);
  for (const row of programmeRes.data ?? []) ids.add(row.event_id);
  for (const res of extResults) for (const row of res.data ?? []) ids.add(row.event_id);

  return NextResponse.json([...ids]);
}
