import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { extensionTable } from "@/lib/event-types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isGuestRequest, guestDenied } from "@/lib/guest";
import { requireOwner } from "@/lib/auth";
import { upsertGCalEvent, deleteGCalEvent } from "@/lib/google-calendar";

type Named = { id: string; name: string };
type Titled = { id: string; title: string };

async function lookupWorks(sb: SupabaseClient, ids: string[]): Promise<Map<string, Titled>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const { data } = await sb.from("work").select("id, title, type").in("id", unique);
  return new Map((data ?? []).map((r: Titled) => [r.id, r]));
}
async function lookupProductions(sb: SupabaseClient, ids: string[]): Promise<Map<string, Titled>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const { data } = await sb.from("production").select("id, title").in("id", unique);
  return new Map((data ?? []).map((r: Titled) => [r.id, r]));
}

function str(v: unknown): string { return typeof v === "string" ? v : ""; }

type CreditRow = { role: string; sort_order: number; note: string | null; person: Named | null; ensemble: Named | null };

async function fetchCredits(sb: SupabaseClient, eventId: string): Promise<CreditRow[]> {
  const { data } = await sb.from("event_credit")
    .select("role, sort_order, note, person:person_id(id, name), ensemble:ensemble_id(id, name)")
    .eq("event_id", eventId)
    .order("sort_order");
  return (data ?? []) as unknown as CreditRow[];
}

async function resolveExtension(
  sb: SupabaseClient,
  type: string,
  raw: Record<string, unknown>,
  eventId: string,
): Promise<Record<string, unknown>> {
  // All person/ensemble data is now in event_credit — fetch once for all types
  const credits = await fetchCredits(sb, eventId);
  const c = credits.length ? credits : null;

  if (type === "music") {
    return { tour_name: raw.tour_name ?? null, setlist: raw.setlist ?? null, setlist_fm_url: raw.setlist_fm_url ?? null, credits: c };
  }

  if (type === "classical") {
    return { notes_on_performance: raw.notes_on_performance ?? null, setlist: raw.setlist ?? null, setlist_fm_url: raw.setlist_fm_url ?? null, credits: c };
  }

  if (type === "opera") {
    const [works, productions] = await Promise.all([lookupWorks(sb, [str(raw.work_id)]), lookupProductions(sb, [str(raw.production_id)])]);
    return { work: works.get(str(raw.work_id)) ?? null, production: productions.get(str(raw.production_id)) ?? null, libretto_language: raw.libretto_language ?? null, surtitles_languages: raw.surtitles_languages ?? null, credits: c };
  }

  if (type === "ballet") {
    const [works, productions] = await Promise.all([lookupWorks(sb, [str(raw.work_id)]), lookupProductions(sb, [str(raw.production_id)])]);
    return { work: works.get(str(raw.work_id)) ?? null, production: productions.get(str(raw.production_id)) ?? null, credits: c };
  }

  if (type === "dance") {
    const works = await lookupWorks(sb, [str(raw.work_id)]);
    return { work: works.get(str(raw.work_id)) ?? null, music_notes: raw.music_notes ?? null, credits: c };
  }

  if (type === "circus") {
    const works = await lookupWorks(sb, [str(raw.work_id)]);
    return { work: works.get(str(raw.work_id)) ?? null, credits: c };
  }

  if (type === "theatre") {
    const [works, productions] = await Promise.all([lookupWorks(sb, [str(raw.work_id)]), lookupProductions(sb, [str(raw.production_id)])]);
    return { work: works.get(str(raw.work_id)) ?? null, production: productions.get(str(raw.production_id)) ?? null, credits: c };
  }

  if (type === "cabaret") {
    return { tour_name: raw.tour_name ?? null, credits: c };
  }

  if (type === "comedy") {
    return { tour_name: raw.tour_name ?? null, credits: c };
  }

  if (type === "spoken_word") {
    return { credits: c };
  }

  if (type === "talk") {
    return { topic: raw.topic ?? null, host_organisation: raw.host_organisation ?? null, credits: c };
  }

  if (type === "exhibition") {
    return { exhibition_title: raw.exhibition_title ?? null, period: raw.period ?? null, medium: raw.medium ?? null, permanent_or_temp: raw.permanent_or_temp ?? null, exhibition_url: raw.exhibition_url ?? null, credits: c };
  }

  if (type === "screening") {
    const works = await lookupWorks(sb, [str(raw.work_id)]);
    return { work: works.get(str(raw.work_id)) ?? null, series: raw.series ?? null, credits: c };
  }

  if (type === "other") {
    return { credits: c };
  }

  return raw;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  // Fetch base event with nested venue chain in one query
  const { data: e, error } = await supabase
    .from("event")
    .select(`
      id, date, time, type, subtype, title,
      venue_id, festival_id, payment_method_id,
      price_paid, currency,
      rating, rating_context, notes, review, links,
      data_completeness, full_description, ai_summary, description_source_url,
      venue:venue_id(id, name, city, parent_id, parent:parent_id(id, name, parent_id, grandparent:parent_id(id, name)))
    `)
    .eq("id", id)
    .single();

  if (error || !e) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const extTable = extensionTable(e.type);

  // Fire all independent queries in parallel, including the extension table
  const [festivalRes, pmRes, relatedRes, extRes] = await Promise.all([
    e.festival_id ? supabase.from("festival").select("id, name, edition").eq("id", e.festival_id).single() : Promise.resolve({ data: null }),
    e.payment_method_id ? supabase.from("payment_method").select("id, name, total_cost, currency, purchase_date").eq("id", e.payment_method_id).single() : Promise.resolve({ data: null }),
    supabase.from("event").select("id, title, date, type").eq("venue_id", e.venue_id).eq("date", e.date).neq("id", id),
    extTable ? supabase.from(extTable).select("*").eq("event_id", id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  // Build venue path from nested join result (no extra round trips)
  type VenueRow = { id: string; name: string; city?: string | null; parent_id?: string | null; parent?: VenueRow | null; grandparent?: VenueRow | null };
  const venueData = e.venue as unknown as VenueRow | null;
  const venue = venueData ?? { id: e.venue_id, name: "Unknown" };
  const venuePath: Named[] = [];
  if (venueData?.parent) {
    venuePath.push({ id: venueData.parent.id, name: venueData.parent.name });
    const gp = venueData.parent as unknown as { grandparent?: VenueRow | null };
    if (gp.grandparent) venuePath.push({ id: gp.grandparent.id, name: gp.grandparent.name });
  }

  const festivalData = festivalRes.data as { id: string; name: string; edition?: string | null } | null;
  const festival = festivalData ? { id: festivalData.id, name: [festivalData.name, festivalData.edition].filter(Boolean).join(" ") } : null;
  const pm = pmRes.data as { id: string; name: string; total_cost: string; currency: string; purchase_date: string } | null;

  let extension: Record<string, unknown> | null = null;
  if (extRes.data) {
    try {
      extension = await resolveExtension(supabase, e.type, extRes.data as Record<string, unknown>, id);
    } catch (err) {
      console.error("resolveExtension error:", err);
    }
  }

  const response = NextResponse.json({
    id: e.id, date: e.date, time: e.time, type: e.type, subtype: e.subtype, title: e.title,
    venue: { id: venue.id, name: venue.name, city: (venue as VenueRow).city ?? null },
    venue_path: venuePath,
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
  response.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=300");
  return response;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireOwner(); if (deny) return deny;
  const { id } = await params;
  const body = await req.json();
  const supabase = createServiceClient();

  const baseAllowed = ["rating", "review", "price_paid", "currency", "notes", "rating_context",
    "title", "date", "time", "venue_id", "festival_id", "payment_method_id", "subtype", "type",
    "data_completeness", "full_description", "ai_summary", "description_source_url", "links"];
  const baseUpdate: Record<string, unknown> = {};
  for (const key of baseAllowed) { if (key in body) baseUpdate[key] = body[key]; }

  // Read current type before updating so we can handle extension table transitions
  const { data: evBefore } = await supabase.from("event").select("type").eq("id", id).single();
  const oldType = evBefore?.type as string | undefined;
  const newType = (body.type as string | undefined) ?? oldType;
  const typeChanged = !!body.type && body.type !== oldType;

  if (Object.keys(baseUpdate).length) {
    const { error } = await supabase.from("event").update(baseUpdate).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If type changed, delete old extension row and credits
  if (typeChanged && oldType) {
    const oldExtTable = extensionTable(oldType);
    if (oldExtTable) await supabase.from(oldExtTable).delete().eq("event_id", id);
    await supabase.from("event_credit").delete().eq("event_id", id);
  }

  // Extension fields: accept either body.extension (explicit) or top-level non-base fields (legacy form format)
  const baseAllowedSet = new Set([...baseAllowed, "credits"]);
  const rawExt = body.extension && typeof body.extension === "object"
    ? body.extension as Record<string, unknown>
    : Object.fromEntries(Object.entries(body).filter(([k]) => !baseAllowedSet.has(k)));
  const creditsArr = Array.isArray(body.extension?.credits) ? body.extension.credits
    : Array.isArray(body.credits) ? body.credits : null;

  const hasExt = Object.keys(rawExt).length > 0;
  if (hasExt || creditsArr) {
    if (newType) {
      const extTable = extensionTable(newType);
      if (extTable && hasExt) {
        const { error: extErr } = await supabase.from(extTable).upsert({ event_id: id, ...rawExt });
        if (extErr) return NextResponse.json({ error: extErr.message }, { status: 500 });
      }
      if (creditsArr && !typeChanged) {
        await supabase.from("event_credit").delete().eq("event_id", id);
        const credits = (creditsArr as Array<{ role: string; person_id: string | null; ensemble_id: string | null; sort_order: number }>)
          .filter((c) => c.role && (c.person_id || c.ensemble_id));
        if (credits.length) {
          const { error: credErr } = await supabase.from("event_credit").insert(
            credits.map((c) => ({ event_id: id, role: c.role, person_id: c.person_id ?? null, ensemble_id: c.ensemble_id ?? null, sort_order: c.sort_order ?? 0 }))
          );
          if (credErr) return NextResponse.json({ error: credErr.message }, { status: 500 });
        }
      }
    }
  }

  // Re-sync GCal with updated event data (non-blocking)
  Promise.resolve().then(async () => {
    try {
      const { data: ev } = await supabase
        .from("event")
        .select("id, title, date, time, venue_id, festival_id, notes")
        .eq("id", id)
        .single();
      if (!ev) return;
      let venueCountry: string | null = null;
      let venueCity: string | null = null;
      let festivalName: string | null = null;
      if (ev.venue_id) {
        const { data: v } = await supabase.from("venue").select("country, city").eq("id", ev.venue_id).single();
        venueCountry = v?.country ?? null;
        venueCity = v?.city ?? null;
      }
      if (ev.festival_id) {
        const { data: f } = await supabase.from("festival").select("name, edition").eq("id", ev.festival_id).single();
        if (f) festivalName = [f.name, f.edition].filter(Boolean).join(" ");
      }
      await upsertGCalEvent({
        id: ev.id, title: ev.title, date: ev.date, time: ev.time,
        venue_city: venueCity, venue_country: venueCountry,
        festival_name: festivalName, notes: ev.notes,
      });
    } catch (e) {
      console.error("GCal sync error (update):", e);
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireOwner(); if (deny) return deny;
  const { id } = await params;
  const supabase = createServiceClient();

  // Delete extension rows first (FK constraints), then the base event
  const { data: ev } = await supabase.from("event").select("type").eq("id", id).single();
  if (ev) {
    const extTable = extensionTable(ev.type);
    if (extTable) await supabase.from(extTable).delete().eq("event_id", id);
    await supabase.from("event_credit").delete().eq("event_id", id);
  }

  const { error } = await supabase.from("event").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Remove from GCal (non-blocking)
  deleteGCalEvent(id).catch((e) => console.error("GCal sync error (delete):", e));

  return NextResponse.json({ ok: true });
}
