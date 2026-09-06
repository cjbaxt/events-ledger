import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isGuestRequest, guestDenied } from "@/lib/guest";
import { requireOwner } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") ?? "10");
  const withEvents = searchParams.get("withEvents") === "true";
  const supabase = createServiceClient();
  let query = supabase
    .from("work")
    .select("id, title, type, creator:creator_id(id, name)")
    .order("title")
    .limit(limit);
  if (q) query = query.ilike("title", `%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let rows = (data ?? []) as Record<string, unknown>[];

  if (withEvents && rows.length > 0) {
    const ids = rows.map((r) => r.id as string);
    const eventsByWork = new Map<string, string[]>();

    // Works link to events through multiple sub-tables
    const subTables = [
      "ballet_programme_item",
      "event_ballet", "event_theatre", "event_circus", "event_opera",
      "event_dance", "event_other", "event_cabaret", "event_screening",
    ];
    await Promise.all(
      subTables.map(async (tbl) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rows2 } = await (supabase.from(tbl as any) as any)
          .select("work_id, event_id")
          .in("work_id", ids);
        for (const row of (rows2 ?? []) as { work_id: string | null; event_id: string }[]) {
          if (!row.work_id) continue;
          if (!eventsByWork.has(row.work_id)) eventsByWork.set(row.work_id, []);
          eventsByWork.get(row.work_id)!.push(row.event_id);
        }
      })
    );

    const allEventIds = [...new Set([...eventsByWork.values()].flat())];
    const eventDetails = new Map<string, { id: string; title: string; date: string; type: string }>();
    if (allEventIds.length > 0) {
      const { data: evs } = await supabase
        .from("event")
        .select("id, title, date, type")
        .in("id", allEventIds);
      for (const ev of evs ?? []) eventDetails.set(ev.id, ev as { id: string; title: string; date: string; type: string });
    }

    rows = rows.map((r) => ({
      ...r,
      events: [...new Set(eventsByWork.get(r.id as string) ?? [])]
        .map((eid) => eventDetails.get(eid))
        .filter(Boolean)
        .sort((a, b) => (b!.date ?? "").localeCompare(a!.date ?? "")),
    }));
  }

  const res = NextResponse.json(rows);
  res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=300");
  return res;
}

export async function POST(req: NextRequest) {
  const deny = await requireOwner(); if (deny) return deny;
  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("work").insert({ id: randomUUID(), title: body.title.trim(), type: body.type ?? null }).select("id, title").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
