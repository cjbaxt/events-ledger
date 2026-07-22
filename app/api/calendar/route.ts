import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// All European countries switch DST on the same schedule (last Sun March/October)
// UK: GMT (UTC+0) → BST (UTC+1); EU: CET (UTC+1) → CEST (UTC+2)
function lastSundayOf(year: number, month: number): number {
  // month: 0-indexed. Returns UTC timestamp at 01:00 UTC that day.
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  lastDay.setUTCDate(lastDay.getUTCDate() - lastDay.getUTCDay());
  lastDay.setUTCHours(1, 0, 0, 0);
  return lastDay.getTime();
}

function isEuropeanSummerTime(ts: number): boolean {
  const year = new Date(ts).getUTCFullYear();
  return ts >= lastSundayOf(year, 2) && ts < lastSundayOf(year, 9);
}

// Returns UTC offset in minutes for a country on a given UTC timestamp
function utcOffsetMinutes(country: string | null, ts: number): number {
  const c = (country ?? "GB").toUpperCase();
  const summer = isEuropeanSummerTime(ts);
  if (c === "GB" || c === "IE") return summer ? 60 : 0;
  // CET zone: NL, FR, DE, BE, CZ, AT, ES, IT, PL, and default for unknown EU
  return summer ? 120 : 60;
}

function localToUtcZ(dateStr: string, timeStr: string, country: string | null): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, m] = timeStr.split(":").map(Number);
  // Approximate: use noon UTC on that day to determine summer/winter
  const approx = Date.UTC(y, mo - 1, d, 12, 0, 0);
  const offsetMin = utcOffsetMinutes(country, approx);
  const utcMs = Date.UTC(y, mo - 1, d, h, m, 0) - offsetMin * 60_000;
  const utc = new Date(utcMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${utc.getUTCFullYear()}${pad(utc.getUTCMonth() + 1)}${pad(utc.getUTCDate())}T${pad(utc.getUTCHours())}${pad(utc.getUTCMinutes())}00Z`;
}

function localPlusHoursUtcZ(dateStr: string, timeStr: string, country: string | null, hours: number): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, m] = timeStr.split(":").map(Number);
  const approx = Date.UTC(y, mo - 1, d, 12, 0, 0);
  const offsetMin = utcOffsetMinutes(country, approx);
  const utcMs = Date.UTC(y, mo - 1, d, h, m, 0) - offsetMin * 60_000 + hours * 3_600_000;
  const utc = new Date(utcMs);
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
    const duration = isFringeEvent(e.festival_name as string | null) ? 1 : 2;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id as string}@ledger.claireheaded.com`,
      `DTSTAMP:${now}`,
      `DTSTART:${localToUtcZ(date, time, country)}`,
      `DTEND:${localPlusHoursUtcZ(date, time, country, duration)}`,
      `SUMMARY:${escapeIcs(`🎟️ ${e.title as string}`)}`,
      `LOCATION:${escapeIcs((e.venue_name as string) ?? "")}`,
      ...(debug ? [`X-DEBUG:country=${country ?? "null"} venue_id=${e.venue_id as string}`] : []),
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
