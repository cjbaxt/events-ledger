import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

type CreateOption = { endpoint: string; label: string; field: string };
type TypeConfig = { table: string; nullCheck: string[]; field: string; endpoint: string; fieldLabel: string; multi?: boolean; createOptions?: CreateOption[] };

// Per-type config: which column signals "missing primary entity"
const TYPE_MISSING: Record<string, TypeConfig> = {
  music:      { table: "event_music",      nullCheck: ["headliner_person_id", "headliner_ensemble_id"], field: "headliner_person_id", endpoint: "persons",   fieldLabel: "Headliner",
                createOptions: [{ endpoint: "persons", label: "person", field: "headliner_person_id" }, { endpoint: "ensembles", label: "ensemble", field: "headliner_ensemble_id" }] },
  comedy:     { table: "event_comedy",     nullCheck: ["performer_id", "ensemble_id"],                  field: "performer_id",        endpoint: "persons",   fieldLabel: "Performer",
                createOptions: [{ endpoint: "persons", label: "person", field: "performer_id" }, { endpoint: "ensembles", label: "ensemble", field: "ensemble_id" }] },
  cabaret:    { table: "event_cabaret",    nullCheck: ["headliner_id"],                                 field: "headliner_id",        endpoint: "persons",   fieldLabel: "Headliner",
                createOptions: [{ endpoint: "persons", label: "person", field: "headliner_id" }] },
  theatre:    { table: "event_theatre",    nullCheck: ["company_id"],                                   field: "company_id",          endpoint: "ensembles", fieldLabel: "Company",
                createOptions: [{ endpoint: "ensembles", label: "ensemble", field: "company_id" }] },
  circus:     { table: "event_circus",     nullCheck: ["company_id"],                                   field: "company_id",          endpoint: "ensembles", fieldLabel: "Company",
                createOptions: [{ endpoint: "ensembles", label: "ensemble", field: "company_id" }] },
  dance:      { table: "event_dance",      nullCheck: ["company_id"],                                   field: "company_id",          endpoint: "ensembles", fieldLabel: "Company",
                createOptions: [{ endpoint: "ensembles", label: "ensemble", field: "company_id" }] },
  ballet:     { table: "event_ballet",     nullCheck: ["company_id"],                                   field: "company_id",          endpoint: "ensembles", fieldLabel: "Company",
                createOptions: [{ endpoint: "ensembles", label: "ensemble", field: "company_id" }] },
  opera:      { table: "event_opera",      nullCheck: ["ensemble_id"],                                  field: "ensemble_id",         endpoint: "ensembles", fieldLabel: "Ensemble",
                createOptions: [{ endpoint: "ensembles", label: "ensemble", field: "ensemble_id" }] },
  classical:  { table: "event_classical",  nullCheck: ["ensemble_id"],                                  field: "ensemble_id",         endpoint: "ensembles", fieldLabel: "Ensemble",
                createOptions: [{ endpoint: "ensembles", label: "ensemble", field: "ensemble_id" }] },
  screening:  { table: "event_screening",  nullCheck: ["director_id"],                                  field: "director_id",         endpoint: "persons",   fieldLabel: "Director",
                createOptions: [{ endpoint: "persons", label: "person", field: "director_id" }] },
  talk:       { table: "event_talk",       nullCheck: ["speaker_ids"],                                  field: "speaker_ids",         endpoint: "persons",   fieldLabel: "Speaker",   multi: true,
                createOptions: [{ endpoint: "persons", label: "person", field: "speaker_ids" }] },
  spoken_word:{ table: "event_spoken_word",nullCheck: ["performers"],                                   field: "performers",          endpoint: "persons",   fieldLabel: "Performer", multi: true,
                createOptions: [{ endpoint: "persons", label: "person", field: "performers" }] },
  exhibition: { table: "event_exhibition", nullCheck: ["artists"],                                      field: "artists",             endpoint: "persons",   fieldLabel: "Artist",    multi: true,
                createOptions: [{ endpoint: "persons", label: "person", field: "artists" }] },
};

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type");
  if (!type || !TYPE_MISSING[type]) {
    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  }

  const { table, nullCheck, field, endpoint, fieldLabel, multi, createOptions } = TYPE_MISSING[type];
  const db = createServiceClient();

  // Find events of this type where the key field is null/empty
  let query = db.from(table).select("event_id");
  for (const col of nullCheck) {
    query = query.is(col, null);
  }

  const { data: extRows } = await query;
  if (!extRows || extRows.length === 0) {
    return NextResponse.json({ events: [], field, endpoint, fieldLabel, multi: !!multi, createOptions });
  }

  const ids = extRows.map((r) => r.event_id);
  const { data: events } = await db
    .from("event")
    .select("id, title, date, type")
    .in("id", ids)
    .order("date", { ascending: false });

  return NextResponse.json({ events: events ?? [], field, endpoint, fieldLabel, multi: !!multi, createOptions });
}
