import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")?.trim();
  if (!url) return NextResponse.json({ error: "url param required" }, { status: 400 });

  let parsed: URL;
  try { parsed = new URL(url); } catch { return NextResponse.json({ error: "Invalid URL" }, { status: 400 }); }
  if (parsed.hostname !== "www.themoviedb.org" && parsed.hostname !== "themoviedb.org") {
    return NextResponse.json({ error: "Only themoviedb.org URLs are supported" }, { status: 400 });
  }

  const match = parsed.pathname.match(/\/movie\/(\d+)/);
  if (!match) return NextResponse.json({ error: "Could not find movie ID in URL" }, { status: 400 });
  const movieId = match[1];

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "TMDB_API_KEY not configured" }, { status: 500 });

  let movie: Record<string, unknown>;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&append_to_response=credits`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) throw new Error(`TMDb returned ${res.status}`);
    movie = await res.json() as Record<string, unknown>;
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fetch failed" }, { status: 502 });
  }

  const credits = movie.credits as { crew?: Array<{ job: string; name: string }>; cast?: Array<{ name: string; order: number }> } | undefined;
  const director = credits?.crew?.find((c) => c.job === "Director")?.name ?? null;
  const year = (movie.release_date as string)?.slice(0, 4) ?? null;

  return NextResponse.json({
    title: movie.title as string ?? "",
    year,
    overview: movie.overview as string ?? "",
    director_name: director,
    tmdb_url: url,
  });
}
