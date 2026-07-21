import { NextRequest, NextResponse } from "next/server";

const FRINGE_GENRE_MAP: Record<string, string> = {
  COMEDY: "comedy", CABARET: "cabaret", CIRCUS: "circus", THEATRE: "theatre",
  DANCE: "dance", MUSIC: "music", "CLASSICAL MUSIC": "classical", OPERA: "opera",
  BALLET: "ballet", "SPOKEN WORD": "spoken_word", EXHIBITIONS: "exhibition",
  FILM: "screening", "CHILDREN'S SHOWS": "theatre", EVENTS: "talk",
};

const FRINGE_SUBTYPE_MAP: Array<[string, string, string]> = [
  ["comedy", "standup", "standup"], ["comedy", "stand-up", "standup"],
  ["comedy", "sketch", "sketch"], ["comedy", "musical", "musical_comedy"],
  ["comedy", "character", "character"], ["comedy", "double act", "double_act"],
  ["comedy", "magic", "comedy_magic"],
  ["cabaret", "cabaret", "cabaret"], ["cabaret", "burlesque", "burlesque"],
  ["cabaret", "drag", "drag"], ["cabaret", "variety", "variety"],
  ["circus", "physical", "physical_theatre"], ["circus", "aerial", "aerial"],
  ["circus", "contemporary", "contemporary"],
  ["theatre", "musical", "musical"], ["theatre", "physical", "physical_theatre"],
  ["theatre", "puppet", "puppet"], ["theatre", "improv", "improv"],
  ["dance", "contemporary", "contemporary"], ["dance", "flamenco", "flamenco"],
  ["music", "festival", "festival"], ["music", "choir", "choir"],
];

function detectSubtype(eventType: string, subGenreRaw: string): string {
  const sg = subGenreRaw.toLowerCase();
  for (const [t, keyword, subtype] of FRINGE_SUBTYPE_MAP) {
    if (t === eventType && sg.includes(keyword)) return subtype;
  }
  return "other";
}

async function parseEdfringe(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`edfringe.com returned ${res.status}`);
  const html = await res.text();

  const m = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("Could not find page data — edfringe.com may have changed its format");

  let event: Record<string, unknown>;
  try {
    const pageData = JSON.parse(m[1]) as Record<string, Record<string, Record<string, Record<string, unknown>>>>;
    event = pageData.props?.pageProps?.data?.event as Record<string, unknown>;
  } catch {
    throw new Error("Failed to parse page data");
  }
  if (!event) throw new Error("Event data not found on page");

  const title = (event.title as string) ?? "";
  let description = (event.description as string) ?? "";
  description = description.replace(/\*+\s*\([^)]+\)/g, "").trim();

  const genreRaw = ((event.genre as string) ?? "").toUpperCase();
  const subGenreRaw = (event.subGenre as string) ?? "";
  let eventType = FRINGE_GENRE_MAP[genreRaw] ?? "other";
  if (eventType === "comedy" && subGenreRaw.toLowerCase().includes("cabaret")) eventType = "cabaret";
  const subtype = detectSubtype(eventType, subGenreRaw);

  const spaces = (event.spaces as Array<Record<string, string>>) ?? [];
  const venues = (event.venues as Array<Record<string, string>>) ?? [];
  let venueName = "";
  if (spaces.length) venueName = spaces[0].venueName ?? spaces[0].title ?? "";
  if (!venueName && venues.length) venueName = venues[0].title ?? "";

  const BST_OFFSET = 60; // minutes
  const performances: Array<{ date: string; time: string; label: string }> = [];
  for (const perf of (event.performances as Array<Record<string, unknown>>) ?? []) {
    if (perf.cancelled) continue;
    const dtStr = (perf.dateTime as string) ?? "";
    if (!dtStr) continue;
    try {
      const dtUtc = new Date(dtStr);
      const dtBst = new Date(dtUtc.getTime() + BST_OFFSET * 60 * 1000);
      const date = dtBst.toISOString().slice(0, 10);
      const time = dtBst.toISOString().slice(11, 16);
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const label = `${days[dtBst.getUTCDay()]} ${dtBst.getUTCDate()} ${months[dtBst.getUTCMonth()]} ${time}`;
      const note = (perf.title as string) ?? "";
      performances.push({ date, time, label: note ? `${label} (${note})` : label });
    } catch { continue; }
  }

  return {
    source: "edfringe",
    title,
    type_suggestion: eventType,
    subtype_suggestion: subtype,
    venue_name: venueName,
    performances,
    description,
    description_source_url: url,
    festival_hint: "Edinburgh Festival Fringe",
  };
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")?.trim();
  if (!url) return NextResponse.json({ error: "url param required" }, { status: 400 });
  try {
    if (url.includes("edfringe.com")) return NextResponse.json(await parseEdfringe(url));
    return NextResponse.json({ error: "Unsupported source. Supported: edfringe.com" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Scrape failed" }, { status: 502 });
  }
}
