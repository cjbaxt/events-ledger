import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")?.trim();
  if (!url) return NextResponse.json({ error: "url param required" }, { status: 400 });
  let parsed: URL;
  try { parsed = new URL(url); } catch { return NextResponse.json({ error: "Invalid URL" }, { status: 400 }); }
  if (parsed.hostname !== "setlist.fm" && !parsed.hostname.endsWith(".setlist.fm")) return NextResponse.json({ error: "Only setlist.fm URLs are supported" }, { status: 400 });

  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`setlist.fm returned ${res.status}`);
    html = await res.text();
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fetch failed" }, { status: 502 });
  }

  let songs = [...html.matchAll(/class="songLabel"[^>]*>([^<]+)</g)].map(m => m[1].trim());
  if (!songs.length) {
    songs = [...html.matchAll(/data-song="([^"]+)"/g)].map(m => m[1]);
  }
  if (!songs.length) {
    return NextResponse.json({ error: "Could not parse any songs — setlist.fm format may have changed" }, { status: 422 });
  }

  const decoded = songs.map(s => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
  return NextResponse.json(decoded);
}
