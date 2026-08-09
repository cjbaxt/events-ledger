import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

// Per-type config: which column signals "missing primary entity"
const TYPE_MISSING: Record<string, { table: string; nullCheck: string[]; field: string; endpoint: string; fieldLabel: string; multi?: boolean }> = {
  music:      { table: "event_music",      nullCheck: ["headliner_person_id", "headliner_ensemble_id"], field: "headliner_person_id", endpoint: "persons",   fieldLabel: "Headliner" },
  comedy:     { table: "event_comedy",     nullCheck: ["performer_id", "ensemble_id"],                  field: "performer_id",        endpoint: "persons",   fieldLabel: "Performer" },
  cabaret:    { table: "event_cabaret",    nullCheck: ["headliner_id"],                                 field: "headliner_id",        endpoint: "persons",   fieldLabel: "Headliner" },
  theatre:    { table: "event_theatre",    nullCheck: ["company_id"],                                   field: "company_id",          endpoint: "ensembles", fieldLabel: "Company" },
  circus:     { table: "event_circus",     nullCheck: ["company_id"],                                   field: "company_id",          endpoint: "ensembles", fieldLabel: "Company" },
  dance:      { table: "event_dance",      nullCheck: ["company_id"],                                   field: "company_id",          endpoint: "ensembles", fieldLabel: "Company" },
  ballet:     { table: "event_ballet",     nullCheck: ["company_id"],                                   field: "company_id",          endpoint: "ensembles", fieldLabel: "Company" },
  opera:      { table: "event_opera",      nullCheck: ["ensemble_id"],                                  field: "ensemble_id",         endpoint: "ensembles", fieldLabel: "Ensemble" },
  classical:  { table: "event_classical",  nullCheck: ["ensemble_id"],                                  field: "ensemble_id",         endpoint: "ensembles", fieldLabel: "Ensemble" },
  screening:  { table: "event_screening",  nullCheck: ["director_id"],                                  field: "director_id",         endpoint: "persons",   fieldLabel: "Director" },
  talk:       { table: "event_talk",       nullCheck: ["speaker_ids"],                                  field: "speaker_ids",         endpoint: "persons",   fieldLabel: "Speaker", multi: true },
  spoken_word:{ table: "event_spoken_word",nullCheck: ["performers"],                                   field: "performers",          endpoint: "persons",   fieldLabel: "Performer", multi: true },
  exhibition: { table: "event_exhibition", nullCheck: ["artists"],                                      field: "artists",             endpoint: "persons",   fieldLabel: "Artist", multi: true },
};

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type");
  if (!type || !TYPE_MISSING[type]) {
    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  }

  const { table, nullCheck, field, endpoint, fieldLabel, multi } = TYPE_MISSING[type];
  const db = createServiceClient();

  // Find events of this type where the key field is null/empty
  let query = db.from(table).select("event_id");
  for (const col of nullCheck) {
    query = query.is(col, null);
  }

  const { data: extRows } = await query;
  if (!extRows || extRows.length === 0) {
    return NextResponse.json({ events: [], field, endpoint, fieldLabel, multi: !!multi });
  }

  const ids = extRows.map((r) => r.event_id);
  const { data: events } = await db
    .from("event")
    .select("id, title, date, type")
    .in("id", ids)
    .order("date", { ascending: false });

  return NextResponse.json({ events: events ?? [], field, endpoint, fieldLabel, multi: !!multi });
}
