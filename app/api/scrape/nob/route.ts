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
  "music": "Composer",
  "music and libretto": "Composer",
};

// All functional/technical roles — keep their role name even inside H3 sub-sections.
// Anything NOT in this set (and NOT in VOCAB_MAP) inside a sub-section is treated as
// a character name and classified as Opera Singer with the character as note.
const FUNCTIONAL_ROLES = new Set([
  "conductor", "musical direction", "stage direction", "director",
  "choreography", "choreographer",
  "music", "music and libretto", "libretto",
  "set design", "costume design", "lighting design", "dramaturgy",
  "revival director", "chorus master", "movement coach", "ballet master",
  "staging", "costume and set design", "set and costume design",
  "lighting and set design", "stage and costume design", "set design and costumes",
  "movement direction", "lighting and video design",
  "violin solo", "soloists",
]);

const INCLUDE_BY_DEFAULT = new Set([
  "conductor", "musical direction", "stage direction", "director", "choreography",
]);

function stripNbsp(s: string) {
  return s.replace(/&nbsp;/g, " ").replace(/ /g, " ").replace(/\s+/g, " ").trim();
}

function normalizeRole(r: string) {
  return stripNbsp(r).toLowerCase().replace(/\(.*\)/, "").trim();
}

export interface ScrapeWork {
  title: string;
  composerName: string | null;
  existingPieceId: string | null;
  existingComposerId: string | null;
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
  works: ScrapeWork[];
}

// ── Parser for summary pages (/en/dutch-national-opera/YYYY/slug) ─────────────

async function parseSummaryPage(
  root: ReturnType<typeof parse>,
  db: ReturnType<typeof createServiceClient>,
  pageTitle: string
): Promise<Omit<ScrapeResult, "pageTitle">> {
  const perfH2 = root.querySelectorAll("h2").find(
    (h) => h.innerText.trim().toLowerCase() === "performance information"
  );
  if (!perfH2) return { cards: [], works: [] };

  // On NOB pages the H2 is in a wrapper div; its sibling div holds the P/H3 content.
  // Structure: sectionContainer > [wrapperDiv(H2), contentDiv(P + H3 elements)]
  const h2Wrapper = perfH2.parentNode;
  const sectionContainer = h2Wrapper?.parentNode;
  const containerChildren = (sectionContainer?.childNodes ?? []).filter(
    (n) => (n as { nodeType?: number }).nodeType === 1
  ) as ReturnType<typeof root.querySelector>[];
  const h2WrapperIdx = containerChildren.indexOf(h2Wrapper as ReturnType<typeof root.querySelector>);
  const contentDiv = containerChildren[h2WrapperIdx + 1];
  if (!contentDiv) return { cards: [], works: [] };

  const allEls = (contentDiv.querySelectorAll("p, h3") as ReturnType<typeof root.querySelectorAll>).map(
    (el) => ({ tag: el.tagName, el: el as ReturnType<typeof root.querySelector> })
  );

  type RawEntry = { role: string; name: string; section: string; isEnsemble: boolean };
  type PendingWork = { title: string; composerName: string | null };

  const rawEntries: RawEntry[] = [];
  const pendingWorks: PendingWork[] = [];
  let currentSection = "Production";
  let currentWork: PendingWork | null = null;
  let topLevelComposer: string | null = null;

  for (const { tag, el } of allEls) {
    if (!el) continue;
    if (tag === "H3") {
      if (currentWork) pendingWorks.push(currentWork);
      currentWork = { title: stripNbsp(el.innerText.trim()), composerName: null };
      currentSection = stripNbsp(el.innerText.trim());
      continue;
    }
    if (tag !== "P") continue;

    const lines = el.innerHTML.split(/<br\s*\/?>/i);
    for (const line of lines) {
      const lineRoot = parse(`<span>${line}</span>`).querySelector("span");
      if (!lineRoot) continue;
      const boldEls = lineRoot.querySelectorAll("b");
      if (boldEls.length === 0) continue;
      if (boldEls.length > 1) continue; // multiple people (e.g. joint librettists)

      const name = stripNbsp(boldEls[0].innerText.trim()).replace(/ /g, "").trim();
      if (!name || name.startsWith("*")) continue;

      const lineText = stripNbsp(lineRoot.innerText);
      const nameIdx = lineText.indexOf(name);
      const role = nameIdx > 0 ? lineText.slice(0, nameIdx).trim() : "";
      const normRole = normalizeRole(role);

      if (role.startsWith("*")) continue;

      // For "Music"/"Music and libretto" lines: save composer for current or top-level work
      if (normRole === "music" || normRole === "music and libretto") {
        if (currentWork) {
          currentWork.composerName = name;
        } else {
          // Single-work page — we'll create the work after parsing using pageTitle
          topLevelComposer = name;
        }
        // Still fall through to add as Composer credit below
      }

      const isEnsemble = !role && !line.includes("/en/singers/");
      rawEntries.push({ role: role || "", name, section: currentSection, isEnsemble });
    }
  }
  if (currentWork) pendingWorks.push(currentWork);

  // If no H3 sub-sections found, treat the whole page as a single work
  if (pendingWorks.length === 0 && pageTitle) {
    pendingWorks.push({ title: pageTitle, composerName: topLevelComposer });
  }

  return buildResult(rawEntries, pendingWorks, db);
}

// ── Parser for online-programme pages (/en/online-programme/slug) ─────────────

async function parseCarrouselPage(
  root: ReturnType<typeof parse>,
  db: ReturnType<typeof createServiceClient>
): Promise<Omit<ScrapeResult, "pageTitle">> {
  const sectionEls = root.querySelectorAll(".paragraph--type--carrousel_people");
  type RawEntry = { role: string; name: string; section: string; isEnsemble: boolean };
  const rawEntries: RawEntry[] = [];
  const seen = new Set<string>();

  for (const sec of sectionEls) {
    const section = sec.querySelector(".carrousel__heading")?.innerText?.trim() ?? "Biographies";
    for (const card of sec.querySelectorAll(".card-small__content")) {
      const name = card.querySelector(".card-small__title")?.innerText?.trim();
      const role = stripNbsp(card.querySelector(".card-small__text")?.innerText?.trim() ?? "");
      if (!name) continue;
      const key = `${section}||${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rawEntries.push({ role, name, section, isEnsemble: false });
    }
  }

  return buildResult(rawEntries, [], db);
}

// ── Shared post-processing ────────────────────────────────────────────────────

async function buildResult(
  rawEntries: { role: string; name: string; section: string; isEnsemble: boolean }[],
  pendingWorks: { title: string; composerName: string | null }[],
  db: ReturnType<typeof createServiceClient>
): Promise<Omit<ScrapeResult, "pageTitle">> {
  const personNames = [...new Set(rawEntries.filter((e) => !e.isEnsemble).map((e) => e.name))];
  const ensembleNames = [...new Set(rawEntries.filter((e) => e.isEnsemble).map((e) => e.name))];
  const pieceNames = [...new Set(pendingWorks.map((w) => w.title))];
  const composerNames = [...new Set(pendingWorks.filter((w) => w.composerName).map((w) => w.composerName!))];

  const [{ data: persons }, { data: ensembles }, { data: pieces }, { data: composers }] = await Promise.all([
    personNames.length > 0 ? db.from("person").select("id, name, roles").in("name", personNames) : Promise.resolve({ data: [] }),
    ensembleNames.length > 0 ? db.from("ensemble").select("id, name, roles").in("name", ensembleNames) : Promise.resolve({ data: [] }),
    pieceNames.length > 0 ? db.from("musical_piece").select("id, title").in("title", pieceNames) : Promise.resolve({ data: [] }),
    composerNames.length > 0 ? db.from("person").select("id, name").in("name", composerNames) : Promise.resolve({ data: [] }),
  ]);

  const personMap = new Map((persons ?? []).map((p: { id: string; name: string; roles: string[] | null }) => [p.name, p]));
  const ensembleMap = new Map((ensembles ?? []).map((e: { id: string; name: string; roles: string[] | null }) => [e.name, e]));
  const pieceMap = new Map((pieces ?? []).map((p: { id: string; title: string }) => [p.title, p]));
  const composerMap = new Map((composers ?? []).map((p: { id: string; name: string }) => [p.name, p]));

  const works: ScrapeWork[] = pendingWorks.map((w) => ({
    title: w.title,
    composerName: w.composerName,
    existingPieceId: (pieceMap.get(w.title) as { id: string } | undefined)?.id ?? null,
    existingComposerId: w.composerName
      ? (composerMap.get(w.composerName) as { id: string } | undefined)?.id ?? null
      : null,
  }));

  const cards: ScrapeCard[] = [];

  for (const entry of rawEntries) {
    const { role, name, section, isEnsemble } = entry;
    const normRole = normalizeRole(role);
    const isSubSection = section !== "Production" && section !== "Biographies";

    // Character roles: in any section, role is NOT a known functional/vocab role
    const isCharacterRole = !!role && !VOCAB_MAP[normRole] && !FUNCTIONAL_ROLES.has(normRole);

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
      creditRole = isSubSection ? "Opera Singer" : role;
      personVocabRole = isSubSection ? "Opera Singer" : null;
      note = isSubSection ? role : null; // in Production section, character name IS the creditRole
    } else if (!role) {
      continue; // nameless standalone entry, skip
    } else {
      creditRole = VOCAB_MAP[normRole] ?? role;
      personVocabRole = VOCAB_MAP[normRole] ?? null;
    }

    if (!isEnsemble) {
      const existing = personMap.get(name) as { id: string; roles: string[] | null } | undefined;
      existingPersonId = existing?.id ?? null;
      existingPersonRoles = existing?.roles ?? [];
    }

    const includeByDefault =
      isCharacterRole ||
      INCLUDE_BY_DEFAULT.has(normRole) ||
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

  return { cards, works };
}

// ── Main fetch + route ────────────────────────────────────────────────────────

async function parseHtml(html: string, pageTitle?: string): Promise<ScrapeResult> {
  const root = parse(html);
  const title = pageTitle ?? root.querySelector("h1")?.innerText?.trim() ?? "";
  const db = createServiceClient();
  const result = await parseSummaryPage(root, db, title);
  if (result.cards.length === 0 && result.works.length === 0) {
    const fallback = await parseCarrouselPage(root, db);
    return { pageTitle: title, ...fallback };
  }
  return { pageTitle: title, ...result };
}

export async function POST(req: NextRequest) {
  const deny = await requireOwner(); if (deny) return deny;
  const body = await req.json() as { url?: string; html?: string; pageTitle?: string };

  if (body.html) {
    try {
      const result = await parseHtml(body.html, body.pageTitle);
      return NextResponse.json(result);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
  }

  const { url } = body;
  if (!url || !url.includes("operaballet.nl")) {
    return NextResponse.json({ error: "Must be an operaballet.nl URL" }, { status: 400 });
  }
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const html = await res.text();
    // Detect Cloudflare challenge page
    if (html.includes("Just a moment") || html.includes("cf_chl_opt")) {
      return NextResponse.json({ error: "cloudflare" }, { status: 403 });
    }
    const result = await parseHtml(html);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
