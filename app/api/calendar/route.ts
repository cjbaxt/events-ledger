import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Map ISO country code → IANA timezone
// CET countries all share the same DST rules so Europe/Amsterdam covers them
const COUNTRY_TZ: Record<string, string> = {
  GB: "Europe/London", IE: "Europe/London",
  NL: "Europe/Amsterdam", FR: "Europe/Paris", DE: "Europe/Berlin",
  BE: "Europe/Brussels", CZ: "Europe/Prague", AT: "Europe/Vienna",
  ES: "Europe/Madrid", IT: "Europe/Rome", PL: "Europe/Warsaw",
  US: "America/New_York", CA: "America/Toronto",
  AU: "Australia/Sydney",
};

const VTIMEZONES: Record<string, string> = {
  "Europe/London": [
    "BEGIN:VTIMEZONE", "TZID:Europe/London",
    "BEGIN:STANDARD", "TZNAME:GMT", "DTSTART:19701025T020000",
    "RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0000", "END:STANDARD",
    "BEGIN:DAYLIGHT", "TZNAME:BST", "DTSTART:19700329T010000",
    "RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3", "TZOFFSETFROM:+0000", "TZOFFSETTO:+0100", "END:DAYLIGHT",
    "END:VTIMEZONE",
  ].join("\r\n"),
  "Europe/Amsterdam": [
    "BEGIN:VTIMEZONE", "TZID:Europe/Amsterdam",
    "BEGIN:STANDARD", "TZNAME:CET", "DTSTART:19701025T030000",
    "RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "END:STANDARD",
    "BEGIN:DAYLIGHT", "TZNAME:CEST", "DTSTART:19700329T020000",
    "RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "END:DAYLIGHT",
    "END:VTIMEZONE",
  ].join("\r\n"),
};

// For CET-zone countries not listed above, alias to Europe/Amsterdam block
const TZ_ALIAS: Record<string, string> = {
  "Europe/Paris": "Europe/Amsterdam",
  "Europe/Berlin": "Europe/Amsterdam",
  "Europe/Brussels": "Europe/Amsterdam",
  "Europe/Prague": "Europe/Amsterdam",
  "Europe/Vienna": "Europe/Amsterdam",
  "Europe/Madrid": "Europe/Amsterdam",
  "Europe/Rome": "Europe/Amsterdam",
  "Europe/Warsaw": "Europe/Amsterdam",
};

function countryToTz(country: string | null): string {
  if (!country) return "Europe/London";
  return COUNTRY_TZ[country.toUpperCase()] ?? "Europe/London";
}

function vtimezoneBlock(tz: string): string {
  const canonical = TZ_ALIAS[tz] ?? tz;
  return VTIMEZONES[canonical] ?? VTIMEZONES["Europe/London"];
}

function icsDate(date: string, time: string): string {
  const [h, m] = time.split(":").map(Number);
  const [y, mo, d] = date.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(m)}00`;
}

function icsDatePlusHours(date: string, time: string, hours: number): string {
  const [h, m] = time.split(":").map(Number);
  const [y, mo, d] = date.split("-").map(Number);
  const dt = new Date(y, mo - 1, d, h + hours, m);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

const FRINGE_KEYWORDS = ["fringe", "amsterdam", "prague"];

function isFringeEvent(festivalName: string | null): boolean {
  if (!festivalName) return false;
  return FRINGE_KEYWORDS.some((k) => festivalName.toLowerCase().includes(k));
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token || token !== process.env.CALENDAR_TOKEN) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();
  const [eventsResult, venuesResult] = await Promise.all([
    supabase.rpc("get_events_list", { p_type: null, p_q: null, p_festival_id: null, p_limit: 2000, p_offset: 0 }),
    supabase.from("venue").select("id, country"),
  ]);

  if (eventsResult.error) return new NextResponse("Error fetching events", { status: 500 });

  const venueCountry = new Map<string, string | null>();
  for (const v of (venuesResult.data ?? [])) venueCountry.set(v.id, v.country);

  const events = (eventsResult.data ?? []) as Array<Record<string, unknown>>;

  // Collect which timezones we actually need
  const usedTzs = new Set<string>();
  for (const e of events) {
    const country = venueCountry.get(e.venue_id as string) ?? null;
    usedTzs.add(countryToTz(country));
  }

  const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Events Ledger//EN",
    "X-WR-CALNAME:Events Ledger",
    "X-WR-TIMEZONE:Europe/London",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  // Emit one VTIMEZONE block per canonical timezone used
  const emittedBlocks = new Set<string>();
  for (const tz of usedTzs) {
    const block = vtimezoneBlock(tz);
    if (!emittedBlocks.has(block)) { lines.push(block); emittedBlocks.add(block); }
  }

  for (const e of events) {
    const date = e.date as string;
    const time = (e.time as string | null) ?? "19:00";
    const title = `🎟️ ${e.title as string}`;
    const venue = (e.venue_name as string) ?? "";
    const duration = isFringeEvent(e.festival_name as string | null) ? 1 : 2;
    const country = venueCountry.get(e.venue_id as string) ?? null;
    const tz = countryToTz(country);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id as string}@ledger.claireheaded.com`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=${tz}:${icsDate(date, time)}`,
      `DTEND;TZID=${tz}:${icsDatePlusHours(date, time, duration)}`,
      `SUMMARY:${escapeIcs(title)}`,
      `LOCATION:${escapeIcs(venue)}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="events-ledger.ics"',
      "Cache-Control": "private, max-age=3600",
    },
  });
}
