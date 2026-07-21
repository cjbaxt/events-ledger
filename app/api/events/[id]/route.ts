import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extensionTable } from "@/lib/event-types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Named = { id: string; name: string };
type Titled = { id: string; title: string };

async function lookupPersons(sb: SupabaseClient, ids: string[]): Promise<Map<string, Named>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const { data } = await sb.from("person").select("id, name").in("id", unique);
  return new Map((data ?? []).map((r: Named) => [r.id, r]));
}
async function lookupEnsembles(sb: SupabaseClient, ids: string[]): Promise<Map<string, Named>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const { data } = await sb.from("ensemble").select("id, name").in("id", unique);
  return new Map((data ?? []).map((r: Named) => [r.id, r]));
}
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
function strArr(v: unknown): string[] { return Array.isArray(v) ? (v as unknown[]).map(String) : []; }
function resolveCast(cast: unknown, persons: Map<string, Named>): Record<string, Named | null> | null {
  if (!cast || typeof cast !== "object" || Array.isArray(cast)) return null;
  const out: Record<string, Named | null> = {};
  for (const [role, pid] of Object.entries(cast as Record<string, unknown>)) {
    out[role] = persons.get(String(pid)) ?? null;
  }
  return out;
}

async function resolveExtension(
  sb: SupabaseClient,
  type: string,
  raw: Record<string, unknown>,
  eventId: string,
): Promise<Record<string, unknown>> {
  if (type === "music") {
    const castIds = [...strArr(raw.support_act_person_ids), str(raw.headliner_person_id)];
    const ensIds = [...strArr(raw.support_act_ensemble_ids), str(raw.headliner_ensemble_id)];
    const [persons, ensembles] = await Promise.all([lookupPersons(sb, castIds), lookupEnsembles(sb, ensIds)]);
    return {
      headliner: persons.get(str(raw.headliner_person_id)) ?? null,
      headliner_ensemble: ensembles.get(str(raw.headliner_ensemble_id)) ?? null,
      support_acts: strArr(raw.support_act_person_ids).map(id => persons.get(id)).filter(Boolean),
      support_ensembles: strArr(raw.support_act_ensemble_ids).map(id => ensembles.get(id)).filter(Boolean),
      tour_name: raw.tour_name ?? null,
      setlist: raw.setlist ?? null,
      setlist_fm_url: raw.setlist_fm_url ?? null,
    };
  }

  if (type === "classical") {
    const [persons, ensembles, creditsRes] = await Promise.all([
      lookupPersons(sb, [str(raw.conductor_id)]),
      lookupEnsembles(sb, [str(raw.ensemble_id)]),
      sb.from("event_credit").select("role, sort_order, person:person_id(id, name)").eq("event_id", eventId).order("sort_order"),
    ]);
    const credits = (creditsRes.data ?? []) as unknown as Array<{ role: string; sort_order: number; person: Named }>;
    return {
      ensemble: ensembles.get(str(raw.ensemble_id)) ?? null,
      conductor: persons.get(str(raw.conductor_id)) ?? null,
      notes_on_performance: raw.notes_on_performance ?? null,
      setlist: raw.setlist ?? null,
      setlist_fm_url: raw.setlist_fm_url ?? null,
      credits: credits.length ? credits : null,
    };
  }

  if (type === "opera") {
    const castMap = raw.cast as Record<string, string> | null;
    const castPersonIds = castMap ? Object.values(castMap) : [];
    const [persons, ensembles, works, productions, creditsRes] = await Promise.all([
      lookupPersons(sb, [str(raw.conductor_id), str(raw.director_id), ...strArr(raw.composers), ...castPersonIds]),
      lookupEnsembles(sb, [str(raw.ensemble_id)]),
      lookupWorks(sb, [str(raw.work_id)]),
      lookupProductions(sb, [str(raw.production_id)]),
      sb.from("event_credit").select("role, sort_order, person:person_id(id, name)").eq("event_id", eventId).order("sort_order"),
    ]);
    const credits = (creditsRes.data ?? []) as unknown as Array<{ role: string; sort_order: number; person: Named }>;
    return {
      work: works.get(str(raw.work_id)) ?? null,
      production: productions.get(str(raw.production_id)) ?? null,
      ensemble: ensembles.get(str(raw.ensemble_id)) ?? null,
      conductor: persons.get(str(raw.conductor_id)) ?? null,
      director: persons.get(str(raw.director_id)) ?? null,
      composers: strArr(raw.composers).map(id => persons.get(id)).filter(Boolean),
      cast: castMap ? resolveCast(castMap, persons) : null,
      libretto_language: raw.libretto_language ?? null,
      surtitles_languages: raw.surtitles_languages ?? null,
      credits: credits.length ? credits : null,
    };
  }

  if (type === "ballet") {
    const castMap = raw.cast as Record<string, string> | null;
    const castPersonIds = castMap ? Object.values(castMap) : [];
    const [persons, ensembles, works, productions, creditsRes] = await Promise.all([
      lookupPersons(sb, [str(raw.conductor_id), ...castPersonIds]),
      lookupEnsembles(sb, [str(raw.company_id), str(raw.orchestra_id), ...strArr(raw.additional_company_ids)]),
      lookupWorks(sb, [str(raw.work_id)]),
      lookupProductions(sb, [str(raw.production_id)]),
      sb.from("event_credit").select("role, sort_order, person:person_id(id, name)").eq("event_id", eventId).order("sort_order"),
    ]);
    const credits = (creditsRes.data ?? []) as unknown as Array<{ role: string; sort_order: number; person: Named }>;
    return {
      work: works.get(str(raw.work_id)) ?? null,
      production: productions.get(str(raw.production_id)) ?? null,
      company: ensembles.get(str(raw.company_id)) ?? null,
      additional_companies: strArr(raw.additional_company_ids).map(id => ensembles.get(id)).filter(Boolean),
      orchestra: ensembles.get(str(raw.orchestra_id)) ?? null,
      conductor: persons.get(str(raw.conductor_id)) ?? null,
      cast: castMap ? resolveCast(castMap, persons) : null,
      credits: credits.length ? credits : null,
    };
  }

  if (type === "dance") {
    const [persons, ensembles, works] = await Promise.all([
      lookupPersons(sb, [str(raw.choreographer_id)]),
      lookupEnsembles(sb, [str(raw.company_id)]),
      lookupWorks(sb, [str(raw.work_id)]),
    ]);
    return {
      company: ensembles.get(str(raw.company_id)) ?? null,
      choreographer: persons.get(str(raw.choreographer_id)) ?? null,
      work: works.get(str(raw.work_id)) ?? null,
      music_notes: raw.music_notes ?? null,
    };
  }

  if (type === "circus") {
    const [persons, ensembles, works] = await Promise.all([
      lookupPersons(sb, [str(raw.director_id)]),
      lookupEnsembles(sb, [str(raw.company_id)]),
      lookupWorks(sb, [str(raw.work_id)]),
    ]);
    return {
      company: ensembles.get(str(raw.company_id)) ?? null,
      director: persons.get(str(raw.director_id)) ?? null,
      work: works.get(str(raw.work_id)) ?? null,
    };
  }

  if (type === "theatre") {
    const castMap = raw.cast as Record<string, string> | null;
    const castPersonIds = castMap ? Object.values(castMap) : [];
    const [persons, ensembles, works, productions, creditsRes] = await Promise.all([
      lookupPersons(sb, [str(raw.director_id), str(raw.playwright_id), ...castPersonIds]),
      lookupEnsembles(sb, [str(raw.company_id)]),
      lookupWorks(sb, [str(raw.work_id)]),
      lookupProductions(sb, [str(raw.production_id)]),
      sb.from("event_credit").select("role, sort_order, person:person_id(id, name)").eq("event_id", eventId).order("sort_order"),
    ]);
    const credits = (creditsRes.data ?? []) as unknown as Array<{ role: string; sort_order: number; person: Named }>;
    return {
      work: works.get(str(raw.work_id)) ?? null,
      production: productions.get(str(raw.production_id)) ?? null,
      company: ensembles.get(str(raw.company_id)) ?? null,
      director: persons.get(str(raw.director_id)) ?? null,
      playwright: persons.get(str(raw.playwright_id)) ?? null,
      cast: castMap ? resolveCast(castMap, persons) : null,
      credits: credits.length ? credits : null,
    };
  }

  if (type === "cabaret") {
    const [persons, ensembles] = await Promise.all([
      lookupPersons(sb, [str(raw.headliner_id), str(raw.host_id), ...strArr(raw.supporting_cast)]),
      lookupEnsembles(sb, [str(raw.ensemble_id)]),
    ]);
    return {
      headliner: persons.get(str(raw.headliner_id)) ?? null,
      host: persons.get(str(raw.host_id)) ?? null,
      supporting_cast: strArr(raw.supporting_cast).map(id => persons.get(id)).filter(Boolean),
      ensemble: ensembles.get(str(raw.ensemble_id)) ?? null,
      tour_name: raw.tour_name ?? null,
    };
  }

  if (type === "comedy") {
    const [persons, ensembles] = await Promise.all([
      lookupPersons(sb, [str(raw.performer_id), ...strArr(raw.support_acts)]),
      lookupEnsembles(sb, [str(raw.ensemble_id)]),
    ]);
    return {
      performer: persons.get(str(raw.performer_id)) ?? null,
      support_acts: strArr(raw.support_acts).map(id => persons.get(id)).filter(Boolean),
      ensemble: ensembles.get(str(raw.ensemble_id)) ?? null,
      tour_name: raw.tour_name ?? null,
    };
  }

  if (type === "spoken_word") {
    const persons = await lookupPersons(sb, [str(raw.host_id), ...strArr(raw.performers)]);
    return {
      performers: strArr(raw.performers).map(id => persons.get(id)).filter(Boolean),
      host: persons.get(str(raw.host_id)) ?? null,
    };
  }

  if (type === "talk") {
    const persons = await lookupPersons(sb, [str(raw.host_id), ...strArr(raw.speaker_ids)]);
    return {
      speakers: strArr(raw.speaker_ids).map(id => persons.get(id)).filter(Boolean),
      host: persons.get(str(raw.host_id)) ?? null,
      topic: raw.topic ?? null,
      host_organisation: raw.host_organisation ?? null,
    };
  }

  if (type === "exhibition") {
    const persons = await lookupPersons(sb, [str(raw.curator_id), ...strArr(raw.artists)]);
    return {
      exhibition_title: raw.exhibition_title ?? null,
      artists: strArr(raw.artists).map(id => persons.get(id)).filter(Boolean),
      curator: persons.get(str(raw.curator_id)) ?? null,
      period: raw.period ?? null,
      medium: raw.medium ?? null,
    };
  }

  if (type === "screening") {
    const [persons, ensembles, works] = await Promise.all([
      lookupPersons(sb, [str(raw.director_id), str(raw.conductor_id)]),
      lookupEnsembles(sb, [str(raw.ensemble_id)]),
      lookupWorks(sb, [str(raw.work_id)]),
    ]);
    return {
      work: works.get(str(raw.work_id)) ?? null,
      director: persons.get(str(raw.director_id)) ?? null,
      conductor: persons.get(str(raw.conductor_id)) ?? null,
      ensemble: ensembles.get(str(raw.ensemble_id)) ?? null,
      series: raw.series ?? null,
    };
  }

  return raw;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch base event with nested venue chain in one query
  const { data: e, error } = await supabase
    .from("event")
    .select(`
      id, date, time, type, subtype, title,
      venue_id, festival_id, payment_method_id,
      price_paid, currency,
      rating, rating_context, notes, review, links,
      data_completeness, full_description, ai_summary, description_source_url,
      venue:venue_id(id, name, parent_id, parent:parent_id(id, name, parent_id, grandparent:parent_id(id, name)))
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
  type VenueRow = { id: string; name: string; parent_id?: string | null; parent?: VenueRow | null; grandparent?: VenueRow | null };
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
    extension = await resolveExtension(supabase, e.type, extRes.data as Record<string, unknown>, id);
  }

  const response = NextResponse.json({
    id: e.id, date: e.date, time: e.time, type: e.type, subtype: e.subtype, title: e.title,
    venue: { id: venue.id, name: venue.name },
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

  if (body.extension && typeof body.extension === "object") {
    const { data: ev } = await supabase.from("event").select("type").eq("id", id).single();
    if (ev) {
      const extTable = extensionTable(ev.type);
      if (extTable) {
        const ext = body.extension as Record<string, unknown>;
        const { error: extErr } = await supabase.from(extTable).upsert({ event_id: id, ...ext });
        if (extErr) console.error("Extension update error:", extErr);
      }
      if (Array.isArray(body.extension.credits)) {
        await supabase.from("event_credit").delete().eq("event_id", id);
        const credits = body.extension.credits as Array<{ role: string; person_id: string; sort_order: number }>;
        if (credits.length) await supabase.from("event_credit").insert(credits.map((c) => ({ event_id: id, ...c })));
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Delete extension rows first (FK constraints), then the base event
  const { data: ev } = await supabase.from("event").select("type").eq("id", id).single();
  if (ev) {
    const extTable = extensionTable(ev.type);
    if (extTable) await supabase.from(extTable).delete().eq("event_id", id);
    await supabase.from("event_credit").delete().eq("event_id", id);
  }

  const { error } = await supabase.from("event").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
