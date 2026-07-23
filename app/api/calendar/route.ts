import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { countryToTz } from "@/lib/timezone";

// Convert local date+time to a UTC ICS stamp using Intl for correct DST handling.
function localToUtcZ(dateStr: string, timeStr: string, tz: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, m] = timeStr.split(":").map(Number);
  // Start by treating the local time as if it were UTC
  const assumed = new Date(Date.UTC(y, mo - 1, d, h, m, 0));
  // Ask Intl what the target timezone shows for that UTC moment
  // 'sv' locale gives "YYYY-MM-DD HH:MM:SS" — unambiguous to parse
  const localStr = assumed.toLocaleString("sv", { timeZone: tz });
  const localDate = new Date(localStr.replace(" ", "T") + "Z");
  // offsetMs = how far ahead of UTC the timezone is at that moment
  const offsetMs = localDate.getTime() - assumed.getTime();
  // True UTC = local time − offset
  const utc = new Date(assumed.getTime() - offsetMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${utc.getUTCFullYear()}${pad(utc.getUTCMonth() + 1)}${pad(utc.getUTCDate())}T${pad(utc.getUTCHours())}${pad(utc.getUTCMinutes())}00Z`;
}

function localPlusHoursUtcZ(dateStr: string, timeStr: string, tz: string, hours: number): string {
  const startZ = localToUtcZ(dateStr, timeStr, tz);
  const startMs = new Date(
    startZ.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3T$4:$5:$6Z")
  ).getTime();
  const utc = new Date(startMs + hours * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${utc.getUTCFullYear()}${pad(utc.getUTCMonth() + 1)}${pad(utc.getUTCDate())}T${pad(utc.getUTCHours())}${pad(utc.getUTCMinutes())}00Z`;
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

  const debug = req.nextUrl.searchParams.has("debug");
  const venueCountry = new Map<string, string | null>();
  for (const v of (venuesResult.data ?? [])) venueCountry.set(v.id, v.country);

  const now = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Events Ledger//EN",
    "X-WR-CALNAME:Events Ledger",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const e of (eventsResult.data ?? []) as Array<Record<string, unknown>>) {
    const date = e.date as string;
    const time = (e.time as string | null) ?? "19:00";
    const country = venueCountry.get(e.venue_id as string) ?? null;
    const tz = countryToTz(country);
    const duration = isFringeEvent(e.festival_name as string | null) ? 1 : 2;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id as string}@ledger.claireheaded.com`,
      `DTSTAMP:${now}`,
      `DTSTART:${localToUtcZ(date, time, tz)}`,
      `DTEND:${localPlusHoursUtcZ(date, time, tz, duration)}`,
      `SUMMARY:${escapeIcs(`🎟️ ${e.title as string}`)}`,
      `LOCATION:${escapeIcs((e.venue_name as string) ?? "")}`,
      ...(debug ? [`X-DEBUG:country=${country ?? "null"} tz=${tz} venue_id=${e.venue_id as string}`] : []),
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  const body = lines.join("\r\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": debug ? "text/plain; charset=utf-8" : "text/calendar; charset=utf-8",
      ...(!debug && { "Content-Disposition": 'attachment; filename="events-ledger.ics"' }),
      "Cache-Control": "private, no-store",
    },
  });
}
