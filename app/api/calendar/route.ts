import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

function icsDate(date: string, time: string): string {
  // Returns floating local time in ICS format: YYYYMMDDTHHMMSS
  const [h, m] = time.split(":").map(Number);
  const [y, mo, d] = date.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(m)}00`;
}

const FRINGE_KEYWORDS = ["fringe", "amsterdam", "prague"];

function isFringeEvent(festivalName: string | null): boolean {
  if (!festivalName) return false;
  const lower = festivalName.toLowerCase();
  return FRINGE_KEYWORDS.some((k) => lower.includes(k));
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

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token || token !== process.env.CALENDAR_TOKEN) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("get_events_list", {
    p_type: null, p_q: null, p_festival_id: null, p_limit: 2000, p_offset: 0,
  });
  if (error) return new NextResponse("Error fetching events", { status: 500 });

  const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Events Ledger//EN",
    "X-WR-CALNAME:Events Ledger",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const e of (data ?? []) as Array<Record<string, unknown>>) {
    const date = e.date as string;
    const time = (e.time as string | null) ?? "19:00";
    const title = `🎟️ ${e.title as string}`;
    const venue = (e.venue_name as string) ?? "";
    const duration = isFringeEvent(e.festival_name as string | null) ? 1 : 2;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id as string}@ledger.claireheaded.com`,
      `DTSTAMP:${now}`,
      `DTSTART:${icsDate(date, time)}`,
      `DTEND:${icsDatePlusHours(date, time, duration)}`,
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
