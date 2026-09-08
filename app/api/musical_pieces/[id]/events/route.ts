import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = createServiceClient();
  const { data } = await sb
    .from("classical_programme_item")
    .select("event_id")
    .eq("musical_piece_id", id);
  const ids = [...new Set((data ?? []).map((r: { event_id: string }) => r.event_id))];
  return NextResponse.json(ids);
}
