import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const COUNTRY_TZ: Record<string, string> = {
  GB: "Europe/London", IE: "Europe/London",
  NL: "Europe/Amsterdam", FR: "Europe/Paris", DE: "Europe/Berlin",
  BE: "Europe/Brussels", CZ: "Europe/Prague", AT: "Europe/Vienna",
  ES: "Europe/Madrid", IT: "Europe/Rome", PL: "Europe/Warsaw",
  US: "America/New_York", CA: "America/Toronto", AU: "Australia/Sydney",
};

function countryToTz(country: string | null): string {
  if (!country) return "Europe/London";
  return COUNTRY_TZ[country.toUpperCase()] ?? "Europe/London";
}

function localToUtcZ(dateStr: string, timeStr: string, tz: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, m] = timeStr.split(":").map(Number);
  // Use a reference UTC date and find how the target timezone interprets it,
  // then adjust so the timezone shows the desired local time.
  const ref = new Date(Date.UTC(y, mo - 1, d, h, m, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(ref);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? "0");
  const tzH = get("hour") % 24;
  const tzM = get("minute");
  const offsetMin = (h - tzH) * 60 + (m - tzM);
  const utc = new Date(ref.getTime() + offsetMin * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${utc.getUTCFullYear()}${pad(utc.getUTCMonth() + 1)}${pad(utc.getUTCDate())}T${pad(utc.getUTCHours())}${pad(utc.getUTCMinutes())}00Z`;
}

function localPlusHoursUtcZ(dateStr: string, timeStr: string, tz: string, hours: number): string {
  const start = new Date(localToUtcZ(dateStr, timeStr, tz).replace(
    /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/,
    "$1-$2-$3T$4:$5:$6Z"
  ));
  const end = new Date(start.getTime() + hours * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${end.getUTCFullYear()}${pad(end.getUTCMonth() + 1)}${pad(end.getUTCDate())}T${pad(end.getUTCHours())}${pad(end.getUTCMinutes())}00Z`;
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
