import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("museum_visit")
    .select("id, date, payment_method_id, venue:venue_id(id, name), payment_method:payment_method_id(id, name)")
    .eq("id", id)
    .single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  type Row = { id: string; date: string; payment_method_id: string | null; venue: { id: string; name: string } | { id: string; name: string }[] | null; payment_method: { id: string; name: string } | { id: string; name: string }[] | null };
  const row = data as unknown as Row;
  const venue = Array.isArray(row.venue) ? (row.venue[0] ?? null) : row.venue;
  const pm = Array.isArray(row.payment_method) ? (row.payment_method[0] ?? null) : row.payment_method;
  return NextResponse.json({ id: row.id, date: row.date, payment_method_id: row.payment_method_id, venue, payment_method: pm });
}
