import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: e, error } = await supabase
    .from("event")
    .select(`
      id, date, time, type, subtype, title,
      venue_id, work_id, festival_id,
      price_paid, currency, payment_method_id,
      rating, rating_context, notes, review, links,
      data_completeness, full_description, ai_summary, description_source_url
    `)
    .eq("id", id)
    .single();

  if (error || !e) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [venueRes, festivalRes, pmRes, relatedRes] = await Promise.all([
    supabase.from("venue").select("id, name, parent_id").eq("id", e.venue_id).single(),
    e.festival_id ? supabase.from("festival").select("id, name, edition").eq("id", e.festival_id).single() : Promise.resolve({ data: null }),
    e.payment_method_id ? supabase.from("payment_method").select("id, name, total_cost, currency, purchase_date").eq("id", e.payment_method_id).single() : Promise.resolve({ data: null }),
    supabase.from("event").select("id, title, date, type").eq("venue_id", e.venue_id).eq("date", e.date).neq("id", id),
  ]);

  const venue = venueRes.data ?? { id: e.venue_id, name: "Unknown" };
  const venuePath: { id: string; name: string }[] = [];
  if (venueRes.data?.parent_id) {
    const parentRes = await supabase.from("venue").select("id, name, parent_id").eq("id", venueRes.data.parent_id).single();
    if (parentRes.data) {
      venuePath.push({ id: parentRes.data.id, name: parentRes.data.name });
      if (parentRes.data.parent_id) {
        const gpRes = await supabase.from("venue").select("id, name").eq("id", parentRes.data.parent_id).single();
        if (gpRes.data) venuePath.push({ id: gpRes.data.id, name: gpRes.data.name });
      }
    }
  }

  const festival = festivalRes.data ? { id: festivalRes.data.id, name: [festivalRes.data.name, (festivalRes.data as Record<string, string>).edition].filter(Boolean).join(" ") } : null;
  const pm = pmRes.data as { id: string; name: string; total_cost: string; currency: string; purchase_date: string } | null;

  let extension: Record<string, unknown> | null = null;
  const extTable = extensionTable(e.type);
  if (extTable) {
    const extRes = await supabase.from(extTable).select("*").eq("event_id", id).maybeSingle();
    if (extRes.data) extension = extRes.data;
  }

  return NextResponse.json({
    id: e.id, date: e.date, time: e.time, type: e.type, subtype: e.subtype, title: e.title,
    venue: { id: venue.id, name: venue.name },
    venue_path: venuePath,
    work_id: e.work_id,
    festival,
    price_paid: e.price_paid != null ? String(e.price_paid) : null,
    currency: e.currency,
    payment_method: pm,
    rating: e.rating,
    rating_context: e.rating_context,
    notes: e.notes,
    review: e.review,
    links: e.links,
    data_completeness: e.data_completeness,
    full_description: e.full_description,
    ai_summary: e.ai_summary,
    description_source_url: e.description_source_url,
    related_events: (relatedRes.data ?? []) as Array<{ id: string; title: string; date: string; type: string }>,
    extension,
  });
}

function extensionTable(type: string): string | null {
  const map: Record<string, string> = {
    music: "event_music", classical: "event_classical", opera: "event_opera",
    ballet: "event_ballet", dance: "event_dance", circus: "event_circus",
    theatre: "event_theatre", cabaret: "event_cabaret", comedy: "event_comedy",
    spoken_word: "event_spoken_word", talk: "event_talk",
    exhibition: "event_exhibition", screening: "event_screening",
  };
  return map[type] ?? null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const supabase = await createClient();

  const baseAllowed = ["rating", "review", "price_paid", "currency", "notes", "rating_context",
    "title", "date", "time", "venue_id", "festival_id", "payment_method_id", "subtype",
    "data_completeness", "full_description", "ai_summary", "description_source_url", "links"];
  const baseUpdate: Record<string, unknown> = {};
  for (const key of baseAllowed) { if (key in body) baseUpdate[key] = body[key]; }

  if (Object.keys(baseUpdate).length) {
    const { error } = await supabase.from("event").update(baseUpdate).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Handle extension data if present
  if (body.extension && typeof body.extension === "object") {
    const { data: ev } = await supabase.from("event").select("type").eq("id", id).single();
    if (ev) {
      const extTable = extensionTable(ev.type);
      if (extTable) {
        const ext = body.extension as Record<string, unknown>;
        const { error: extErr } = await supabase.from(extTable).upsert({ event_id: id, ...ext });
        if (extErr) console.error("Extension update error:", extErr);
      }
      // Handle credits separately
      if (Array.isArray(body.extension.credits)) {
        await supabase.from("event_credit").delete().eq("event_id", id);
        const credits = body.extension.credits as Array<{ role: string; person_id: string; sort_order: number }>;
        if (credits.length) {
          await supabase.from("event_credit").insert(credits.map((c) => ({ event_id: id, ...c })));
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
