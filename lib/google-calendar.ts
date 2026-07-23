import { countryToTz } from "./timezone";

const FRINGE_KEYWORDS = ["fringe", "amsterdam", "prague"];

function gcalId(eventId: string): string {
  // GCal IDs must be [a-v0-9]{5,1024} — UUID hex without hyphens fits perfectly
  return eventId.replace(/-/g, "").toLowerCase();
}

function isFringe(festivalName: string | null | undefined): boolean {
  if (!festivalName) return false;
  return FRINGE_KEYWORDS.some((k) => festivalName.toLowerCase().includes(k));
}

async function getAccessToken(): Promise<string> {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error("Google Calendar env vars not configured");
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

function calendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID ?? "primary";
}

export interface GCalEventData {
  id: string;
  title: string;
  date: string;
  time: string | null;
  venue_name?: string | null;
  venue_city?: string | null;
  venue_country?: string | null;
  festival_name?: string | null;
  notes?: string | null;
}

function buildGCalEvent(e: GCalEventData) {
  const tz = countryToTz(e.venue_country);
  const time = e.time ?? "19:00";
  const durationHrs = isFringe(e.festival_name) ? 1 : 2;

  const [h, m] = time.split(":").map(Number);
  const endH = h + durationHrs;
  const endTime = `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
  const startTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;

  const location = [e.venue_name, e.venue_city].filter(Boolean).join(", ");

  return {
    summary: `🎟️ ${e.title}`,
    location: location || undefined,
    description: e.notes ?? undefined,
    start: { dateTime: `${e.date}T${startTime}`, timeZone: tz },
    end:   { dateTime: `${e.date}T${endTime}`,   timeZone: tz },
  };
}

export async function upsertGCalEvent(e: GCalEventData): Promise<void> {
  const token = await getAccessToken();
  const gid = gcalId(e.id);
  const cal = calendarId();
  const body = JSON.stringify(buildGCalEvent(e));

  // Try PATCH first (update existing); fall back to POST insert if 404
  const patchRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal)}/events/${gid}`,
    { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body }
  );

  if (patchRes.status === 404) {
    // Event doesn't exist yet — insert with explicit ID
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal)}/events`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: gid, ...buildGCalEvent(e) }),
      }
    );
  }
}

export async function deleteGCalEvent(eventId: string): Promise<void> {
  const token = await getAccessToken();
  const gid = gcalId(eventId);
  const cal = calendarId();
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal)}/events/${gid}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );
  // 404 is fine — event may not exist in GCal
}
