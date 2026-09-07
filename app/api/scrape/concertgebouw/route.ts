import { NextRequest, NextResponse } from "next/server";
import { parse } from "node-html-parser";
import { createServiceClient } from "@/lib/supabase/service";
import { requireOwner } from "@/lib/auth";

const ROLE_MAP: Record<string, string> = {
  dirigent: "Conductor",
  viool: "Violin",
  violist: "Violin",
  cello: "Cello",
  cellist: "Cello",
  piano: "Piano",
  pianist: "Piano",
  sopraan: "Soprano",
  mezzosopraan: "Mezzo-soprano",
  alt: "Alto",
  altist: "Alto",
  tenor: "Tenor",
  bariton: "Baritone",
  bas: "Bass",
  baszanger: "Bass",
  baszangeres: "Bass",
  fluit: "Flute",
  hobo: "Oboe",
  klarinet: "Clarinet",
  fagot: "Bassoon",
  trompet: "Trumpet",
  hoorn: "Horn",
  orgel: "Organ",
  harp: "Harp",
  gitaar: "Guitar",
  luit: "Lute",
  countertenor: "Countertenor",
  "counter-tenor": "Countertenor",
  zanger: "Singer",
  zangeres: "Singer",
};

const ENSEMBLE_KEYWORDS = [
  "orkest", "orchestra", "ensemble", "koor", "choir",
  "quartet", "quintet", "trio", "duo", "band",
  "philharmoni", "symphoni", "kamerkoor", "collegium",
];

export interface CgWork {
  composerSurname: string;
  title: string;
  existingPieceId: string | null;
  existingComposerId: string | null;
  composerFullName: string | null;
}

export interface CgMusician {
  name: string;
  dutchRole: string;
  creditRole: string;
  isEnsemble: boolean;
  existingPersonId: string | null;
  existingEnsembleId: string | null;
  includeByDefault: boolean;
}

export interface CgResult {
  pageTitle: string;
  works: CgWork[];
  musicians: CgMusician[];
}

function stripText(s: string) {
  return s.replace(/ /g, " ").replace(/\s+/g, " ").trim();
}

function isEnsembleName(name: string): boolean {
  const lower = name.toLowerCase();
  return ENSEMBLE_KEYWORDS.some((k) => lower.includes(k));
}

function mapRole(dutch: string): string {
  const norm = dutch.toLowerCase().trim();
  return ROLE_MAP[norm] ?? dutch;
}

async function parsePage(html: string): Promise<CgResult> {
  const root = parse(html);
  const pageTitle = stripText(root.querySelector("h1")?.innerText ?? "");
  const db = createServiceClient();

  // ── Musici (performers) ────────────────────────────────────────────────────
  const musiciH3 = root.querySelectorAll("h3").find(
    (h) => h.innerText.trim() === "Musici"
  );
  const rawMusicians: { name: string; role: string }[] = [];
  if (musiciH3) {
    const container = musiciH3.parentNode;
    const ul = container?.querySelector("ul");
    for (const li of ul?.querySelectorAll("li") ?? []) {
      const strong = li.querySelector("strong");
      if (!strong) continue;
      const name = stripText(strong.innerText);
      if (!name) continue;
      const liText = stripText(li.innerText);
      const role = liText.startsWith(name) ? liText.slice(name.length).trim() : "";
      rawMusicians.push({ name, role });
    }
  }

  // ── Werken (works) ─────────────────────────────────────────────────────────
  const werkenH3 = root.querySelectorAll("h3").find(
    (h) => h.innerText.trim() === "Werken"
  );
  const rawWorks: { surname: string; title: string }[] = [];
  if (werkenH3) {
    const container = werkenH3.parentNode;
    for (const li of container?.querySelectorAll("li") ?? []) {
      const h4 = li.querySelector("h4");
      const p = li.querySelector("p");
      if (!h4 || !p) continue;
      const surname = stripText(h4.innerText);
      const title = stripText(p.innerText);
      if (surname && title) rawWorks.push({ surname, title });
    }
  }

  // ── DB lookups ─────────────────────────────────────────────────────────────
  const personNames = rawMusicians.filter((m) => !isEnsembleName(m.name)).map((m) => m.name);
  const ensembleNames = rawMusicians.filter((m) => isEnsembleName(m.name)).map((m) => m.name);
  const pieceTitles = rawWorks.map((w) => w.title);
  const surnames = [...new Set(rawWorks.map((w) => w.surname))];

  const [{ data: persons }, { data: ensembles }, { data: pieces }] = await Promise.all([
    personNames.length > 0
      ? db.from("person").select("id, name").in("name", personNames)
      : Promise.resolve({ data: [] }),
    ensembleNames.length > 0
      ? db.from("ensemble").select("id, name").in("name", ensembleNames)
      : Promise.resolve({ data: [] }),
    pieceTitles.length > 0
      ? db.from("musical_piece").select("id, title").in("title", pieceTitles)
      : Promise.resolve({ data: [] }),
  ]);

  // Composer lookup by surname (partial match)
  const composerMap = new Map<string, { id: string; name: string }>();
  if (surnames.length > 0) {
    const filter = surnames.map((s) => `name.ilike.%${s}%`).join(",");
    const { data: composers } = await db.from("person").select("id, name").or(filter);
    for (const c of composers ?? []) {
      const matched = surnames.find((s) =>
        (c as { name: string }).name.toLowerCase().includes(s.toLowerCase())
      );
      if (matched && !composerMap.has(matched)) {
        composerMap.set(matched, c as { id: string; name: string });
      }
    }
  }

  const personMap = new Map(
    (persons ?? []).map((p: { id: string; name: string }) => [p.name, p])
  );
  const ensembleMap = new Map(
    (ensembles ?? []).map((e: { id: string; name: string }) => [e.name, e])
  );
  const pieceMap = new Map(
    (pieces ?? []).map((p: { id: string; title: string }) => [p.title, p])
  );

  // ── Build result ───────────────────────────────────────────────────────────
  const works: CgWork[] = rawWorks.map(({ surname, title }) => {
    const composer = composerMap.get(surname);
    const piece = pieceMap.get(title) as { id: string } | undefined;
    return {
      composerSurname: surname,
      title,
      existingPieceId: piece?.id ?? null,
      existingComposerId: composer?.id ?? null,
      composerFullName: composer?.name ?? null,
    };
  });

  const musicians: CgMusician[] = rawMusicians.map(({ name, role }) => {
    const ensemble = isEnsembleName(name);
    const creditRole = role ? mapRole(role) : (ensemble ? "Ensemble" : "Performer");
    const dutchRole = role || (ensemble ? "ensemble" : "");
    const existing = ensemble
      ? (ensembleMap.get(name) as { id: string } | undefined)
      : (personMap.get(name) as { id: string } | undefined);
    return {
      name,
      dutchRole,
      creditRole,
      isEnsemble: ensemble,
      existingPersonId: ensemble ? null : (existing?.id ?? null),
      existingEnsembleId: ensemble ? (existing?.id ?? null) : null,
      includeByDefault: true,
    };
  });

  return { pageTitle, works, musicians };
}

export async function POST(req: NextRequest) {
  const deny = await requireOwner();
  if (deny) return deny;
  const { url } = await req.json();
  if (!url || !url.includes("concertgebouw.nl")) {
    return NextResponse.json({ error: "Must be a concertgebouw.nl URL" }, { status: 400 });
  }
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "nl" },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const html = await res.text();
    const result = await parsePage(html);
    if (!result.works.length && !result.musicians.length) {
      return NextResponse.json({ error: "No programme data found on this page." }, { status: 422 });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
