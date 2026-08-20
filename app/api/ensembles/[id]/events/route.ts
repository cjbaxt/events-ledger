import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("event_credit")
    .select("event_id")
    .eq("ensemble_id", id);

  const ids = [...new Set((data ?? []).map((r) => r.event_id))];
  return NextResponse.json(ids);
}
