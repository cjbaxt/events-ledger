import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isGuestRequest, guestDenied } from "@/lib/guest";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_method")
    .select("id, name, total_cost, currency, purchase_date, notes")
    .order("purchase_date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (isGuestRequest(req)) return guestDenied();
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("payment_method").insert({
    id: randomUUID(),
    name: body.name.trim(),
    total_cost: body.total_cost ?? 0,
    currency: body.currency ?? "EUR",
    purchase_date: body.purchase_date,
    notes: body.notes ?? null,
  }).select("id, name, total_cost, currency, purchase_date, notes").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
