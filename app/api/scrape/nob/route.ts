import { NextRequest, NextResponse } from "next/server";
import { parse } from "node-html-parser";
import { createServiceClient } from "@/lib/supabase/service";
import { requireOwner } from "@/lib/auth";

const VOCAB_MAP: Record<string, string> = {
  "musical direction": "Conductor",
  "conductor": "Conductor",
  "stage direction": "Director",
  "director": "Director",
  "choreography": "Choreographer",
  "choreographer": "Choreographer",
};

const INCLUDE_BY_DEFAULT = new Set([
  "conductor", "musical direction", "stage direction", "director",
  "choreography",
]);

const SKIP_BY_DEFAULT = new Set([
  "set design", "costume design", "lighting design", "dramaturgy",
  "revival director", "chorus master", "movement coach", "ballet master",
  "staging", "costume and set design", "lighting and set design",
  "music", "music and libretto", "libretto",
]);

function normalizeRole(r: string) {
  return r.toLowerCase().replace(/\(.*\)/, "").trim();
}

export interface ScrapeCard {
  name: string;
  nobRole: string;
  creditRole: string;
  personVocabRole: string | null;
  note: string | null;
  section: string;
  existingPersonId: string | null;
  existingPersonRoles: string[];
  existingEnsembleId: string | null;
  isEnsemble: boolean;
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

  // Find "Performance information" h2
  const allH2 = root.querySelectorAll("h2");
  const perfH2 = allH2.find((h) => h.innerText.trim().toLowerCase() === "performance information");
  if (!perfH2) return { pageTitle, cards: [] };

  // Collect siblings until next h2
  const sectionEls: Array<{ tag: string; el: ReturnType<typeof root.querySelector> }> = [];
  let next = perfH2.nextElementSibling;
  while (next && next.tagName !== "H2") {
    sectionEls.push({ tag: next.tagName, el: next });
    next = next.nextElementSibling;
  }

  // Parse entries
  const rawEntries: {
    role: string; name: string; section: string; isEnsemble: boolean; linkHref: string;
  }[] = [];
  let currentSection = "Production";

  for (const { tag, el } of sectionEls) {
    if (!el) continue;
    if (tag === "H3") {
      currentSection = el.innerText.trim();
      continue;
    }
    if (tag !== "P") continue;

    const lines = el.innerHTML.split(/<br\s*\/?>/i);

    for (const line of lines) {
      const lineRoot = parse(`<span>${line}</span>`).querySelector("span");
      if (!lineRoot) continue;
      const boldEls = lineRoot.querySelectorAll("b");
      if (boldEls.length === 0) continue;
      // Skip lines with multiple people (e.g., joint libretto credits)
      if (boldEls.length > 1) continue;

      const name = boldEls[0].innerText.trim();
      if (!name || name.startsWith("*")) continue;

      const linkEl = lineRoot.querySelector("a");
      const linkHref = linkEl?.getAttribute("href") ?? "";

      // Role = everything before the name in the line text
      const lineText = lineRoot.innerText;
      const nameIdx = lineText.indexOf(name);
      const roleRaw = nameIdx > 0 ? lineText.slice(0, nameIdx) : "";
      const role = roleRaw.replace(/ /g, " ").replace(/\s+/g, " ").trim();

      if (role.startsWith("*")) continue;

      // Ensemble: no role text and not linked to a /singers/ page
      const isEnsemble = !role && !linkHref.includes("/en/singers/");

      rawEntries.push({ role, name, section: currentSection, isEnsemble, linkHref });
    }
  }

  if (!rawEntries.length) return { pageTitle, cards: [] };

  const personNames = [...new Set(rawEntries.filter((e) => !e.isEnsemble).map((e) => e.name))];
  const ensembleNames = [...new Set(rawEntries.filter((e) => e.isEnsemble).map((e) => e.name))];

  const db = createServiceClient();
  const [{ data: persons }, { data: ensembles }] = await Promise.all([
    personNames.length > 0
      ? db.from("person").select("id, name, roles").in("name", personNames)
      : Promise.resolve({ data: [] }),
    ensembleNames.length > 0
      ? db.from("ensemble").select("id, name, roles").in("name", ensembleNames)
      : Promise.resolve({ data: [] }),
  ]);

  const personMap = new Map(
    (persons ?? []).map((p: { id: string; name: string; roles: string[] | null }) => [p.name, p])
  );
  const ensembleMap = new Map(
    (ensembles ?? []).map((e: { id: string; name: string; roles: string[] | null }) => [e.name, e])
  );

  const cards: ScrapeCard[] = [];

  for (const entry of rawEntries) {
    const { role, name, section, isEnsemble } = entry;
    const normRole = normalizeRole(role);

    if (SKIP_BY_DEFAULT.has(normRole)) continue;

    const isSubSection = section !== "Production";
    // In a sub-section, unknown roles are character names (cast)
    const isCharacterRole = isSubSection && !!role && !VOCAB_MAP[normRole] && !SKIP_BY_DEFAULT.has(normRole);

    let creditRole: string;
    let note: string | null = null;
    let personVocabRole: string | null = null;
    let existingPersonId: string | null = null;
    let existingPersonRoles: string[] = [];
    let existingEnsembleId: string | null = null;

    if (isEnsemble) {
      const existing = ensembleMap.get(name) as { id: string; roles: string[] | null } | undefined;
      existingEnsembleId = existing?.id ?? null;
      creditRole = existing?.roles?.[0] ?? "Ensemble";
    } else if (isCharacterRole) {
      creditRole = "Opera Singer";
      personVocabRole = "Opera Singer";
      note = role;
    } else if (!role) {
      // Person with no role — skip
      continue;
    } else {
      creditRole = VOCAB_MAP[normRole] ?? role;
      personVocabRole = VOCAB_MAP[normRole] ?? null;
    }

    if (!isEnsemble) {
      const existing = personMap.get(name) as { id: string; roles: string[] | null } | undefined;
      existingPersonId = existing?.id ?? null;
      existingPersonRoles = existing?.roles ?? [];
    }

    const includeByDefault = isCharacterRole || INCLUDE_BY_DEFAULT.has(normRole) ||
      (isEnsemble && !!existingEnsembleId);

    cards.push({
      name,
      nobRole: role || name,
      creditRole,
      personVocabRole,
      note,
      section,
      existingPersonId,
      existingPersonRoles,
      existingEnsembleId,
      isEnsemble,
      includeByDefault,
    });
  }

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
