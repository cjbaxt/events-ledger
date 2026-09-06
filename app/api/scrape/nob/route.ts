import { NextRequest, NextResponse } from "next/server";
import { parse } from "node-html-parser";
import { createServiceClient } from "@/lib/supabase/service";
import { requireOwner } from "@/lib/auth";

// Map NOB role strings → our person vocab roles
const VOCAB_MAP: Record<string, string> = {
  "musical direction": "Conductor",
  "conductor": "Conductor",
  "stage direction": "Director",
  "director": "Director",
  "choreography": "Choreographer",
  "choreographer": "Choreographer",
  "music": "Composer",          // ballet programme music credit
  "composer": "Composer",
};

// Section headings that contain performers (character-name roles)
const PERFORMER_SECTION = /^(singers|performers|cast)/i;
// Roles that should be included in credits by default
const INCLUDE_BY_DEFAULT = new Set([
  "conductor", "musical direction", "stage direction", "director",
  "choreography", "music",
]);
// Roles that are purely technical/design — excluded by default
const SKIP_BY_DEFAULT = new Set([
  "set design", "costume design", "lighting design", "dramaturgy",
  "revival director", "chorus master", "movement coach", "ballet master",
  "staging", "costume and set design", "lighting and set design",
]);

function normalizeRole(r: string) { return r.toLowerCase().replace(/\(.*\)/, "").trim(); }

export interface ScrapeCard {
  name: string;
  nobRole: string;           // raw text from site
  creditRole: string;        // role to store in event_credit.role
  personVocabRole: string | null; // role to ensure on person.roles
  note: string | null;        // e.g. character name for singers
  section: string;            // section heading
  existingPersonId: string | null;
  existingPersonRoles: string[];
  includeByDefault: boolean;
}

export interface ScrapeResult {
  pageTitle: string;
  cards: ScrapeCard[];
}

async function fetchAndParse(url: string): Promise<ScrapeResult> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const html = await res.text();
  const root = parse(html);

  const pageTitle = root.querySelector("h1")?.innerText?.trim() ?? "";

  // Use paragraph--type--carrousel_people to get deduplicated sections
  const sectionEls = root.querySelectorAll(".paragraph--type--carrousel_people");

  const rawCards: { name: string; nobRole: string; section: string }[] = [];
  const seen = new Set<string>(); // deduplicate name+section combos

  for (const sec of sectionEls) {
    const heading = sec.querySelector(".carrousel__heading")?.innerText?.trim() ?? "Biographies";
    const cards = sec.querySelectorAll(".card-small__content");
    for (const card of cards) {
      const name = card.querySelector(".card-small__title")?.innerText?.trim();
      const nobRole = card.querySelector(".card-small__text")?.innerText?.trim();
      if (!name || !nobRole) continue;
      const key = `${heading}||${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rawCards.push({ name, nobRole, section: heading });
    }
  }

  // Look up existing persons by name
  if (!rawCards.length) return { pageTitle, cards: [] };

  const db = createServiceClient();
  const names = [...new Set(rawCards.map((c) => c.name))];
  const { data: persons } = await db
    .from("person")
    .select("id, name, roles")
    .in("name", names);

  const personMap = new Map(
    (persons ?? []).map((p: { id: string; name: string; roles: string[] | null }) => [p.name, p])
  );

  const cards: ScrapeCard[] = rawCards.map(({ name, nobRole, section }) => {
    const normRole = normalizeRole(nobRole);
    const isPerformerSection = PERFORMER_SECTION.test(section.replace(/^biograph(y|ies)\s*/i, ""));

    // Is the role a known/mapped role, or is it a character name?
    const mappedVocab = VOCAB_MAP[normRole] ?? null;
    const isCharacterName = !mappedVocab && !SKIP_BY_DEFAULT.has(normRole);

    let creditRole: string;
    let note: string | null = null;
    let personVocabRole: string | null = null;

    if (isPerformerSection || isCharacterName) {
      // The nobRole is likely the character name; infer performer type from section
      const secLower = section.toLowerCase();
      if (secLower.includes("singer") || secLower.includes("performer") || secLower.includes("cast") || isPerformerSection) {
        creditRole = "Opera Singer";
        personVocabRole = "Opera Singer";
      } else {
        creditRole = "Performer";
        personVocabRole = null;
      }
      note = nobRole; // character name stored as note
    } else {
      creditRole = mappedVocab ?? nobRole;
      personVocabRole = mappedVocab;
      note = null;
    }

    const existing = personMap.get(name) as { id: string; name: string; roles: string[] | null } | undefined;
    const skipDefault = SKIP_BY_DEFAULT.has(normRole);
    const includeByDefault = !skipDefault && (isPerformerSection || isCharacterName || INCLUDE_BY_DEFAULT.has(normRole));

    return {
      name,
      nobRole,
      creditRole,
      personVocabRole,
      note,
      section,
      existingPersonId: existing?.id ?? null,
      existingPersonRoles: existing?.roles ?? [],
      includeByDefault,
    };
  });

  return { pageTitle, cards };
}

export async function POST(req: NextRequest) {
  const deny = await requireOwner(); if (deny) return deny;
  const { url } = await req.json();
  if (!url || !url.includes("operaballet.nl")) {
    return NextResponse.json({ error: "Must be an operaballet.nl URL" }, { status: 400 });
  }
  try {
    const result = await fetchAndParse(url);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
