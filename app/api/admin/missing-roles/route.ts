import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

type EventSummary = { id: string; title: string; date: string; type: string };

async function recentEvents(
  db: ReturnType<typeof createServiceClient>,
  field: "person_id" | "ensemble_id",
  ids: string[],
): Promise<Map<string, EventSummary[]>> {
  if (!ids.length) return new Map();
  const { data } = await db
    .from("event_credit")
    .select(`${field}, event:event_id(id, title, date, type)`)
    .in(field, ids);
  const map = new Map<string, EventSummary[]>();
  for (const row of data ?? []) {
    const fk = (row as Record<string, unknown>)[field] as string;
    const ev = (row as Record<string, unknown>).event as EventSummary | null;
    if (!ev) continue;
    if (!map.has(fk)) map.set(fk, []);
    map.get(fk)!.push(ev);
  }
  for (const [k, evs] of map) {
    map.set(k, evs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5));
  }
  return map;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();

  const [personsRes, ensemblesRes] = await Promise.all([
    db.from("person").select("id, name, roles").order("name"),
    db.from("ensemble").select("id, name, roles").order("name"),
  ]);

  const persons = (personsRes.data ?? []).filter(
    (p: { roles: string[] | null }) => !p.roles || p.roles.length === 0
  );
  const ensembles = (ensemblesRes.data ?? []).filter(
    (e: { roles: string[] | null }) => !e.roles || e.roles.length === 0
  );

  const [personEventsMap, ensembleEventsMap] = await Promise.all([
    recentEvents(db, "person_id", persons.map((p: { id: string }) => p.id)),
    recentEvents(db, "ensemble_id", ensembles.map((e: { id: string }) => e.id)),
  ]);

  return NextResponse.json({
    persons: persons.map((p: { id: string; name: string; roles: string[] | null }) => ({
      ...p, recentEvents: personEventsMap.get(p.id) ?? [],
    })),
    ensembles: ensembles.map((e: { id: string; name: string; roles: string[] | null }) => ({
      ...e, recentEvents: ensembleEventsMap.get(e.id) ?? [],
    })),
  });
}
