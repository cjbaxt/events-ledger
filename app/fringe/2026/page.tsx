import { createServiceClient } from "@/lib/supabase/service";
import { isGuestServer } from "@/lib/guest";
import Nav from "@/components/Nav";
import Link from "next/link";
import VenueDonut, { type VenueGroupData } from "./VenueDonut";
import GenreDotStrip, { type DotStripGroup } from "./GenreDotStrip";

const FESTIVAL_ID = "f406761a-a55a-456b-b887-f8ee76fae039";

type FringeEvent = {
  id: string;
  title: string;
  type: string;
  date: string;
  time: string | null;
  rating: number | null;
  review: string | null;
  full_description: string | null;
  price_paid: number | null;
  currency: string | null;
  notes: string | null;
  venue: { name: string } | null;
};

const BRAND_META: { name: string; color: string; labelColor?: string; stroke: string | null }[] = [
  { name: "Assembly",       color: "#DB0216",              stroke: null      },
  { name: "Pleasance",      color: "#FBE200", labelColor: "#9A8800", stroke: "#6B8FA8" },
  { name: "Monkey Barrel",  color: "#181818",              stroke: null      },
  { name: "Underbelly",     color: "#622B85",              stroke: null      },
  { name: "Summerhall",     color: "#F0F0F0", labelColor: "#002B49", stroke: "#6B8FA8" },
  { name: "Gilded Balloon", color: "#FF0081",              stroke: null      },
  { name: "Greenside",      color: "#6BC821", labelColor: "#2A6800", stroke: null      },
  { name: "Laughing Horse", color: "#3D88C8",              stroke: null      },
];

function brandOf(parentName: string): string {
  if (parentName.startsWith("Assembly")) return "Assembly";
  if (parentName.startsWith("Pleasance")) return "Pleasance";
  if (parentName.startsWith("Monkey Barrel")) return "Monkey Barrel";
  if (parentName.startsWith("Underbelly")) return "Underbelly";
  if (parentName.startsWith("Summerhall")) return "Summerhall";
  if (parentName.startsWith("Gilded Balloon")) return "Gilded Balloon";
  if (parentName.startsWith("Greenside")) return "Greenside";
  if (parentName.startsWith("Laughing Horse")) return "Laughing Horse";
  return "Other";
}

type VenueRow = {
  rating: number | null;
  venue: { name: string; parent: { name: string } | { name: string }[] | null } | null;
};

async function getVenueGroups(): Promise<VenueGroupData[]> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("event")
    .select("rating, venue:venue_id(name, parent:parent_id(name))")
    .eq("festival_id", FESTIVAL_ID);

  const rows = (data ?? []) as unknown as VenueRow[];
  const acc = new Map<string, { shows: number; rooms: Set<string>; ratings: number[] }>();

  for (const row of rows) {
    const parentRaw = row.venue?.parent ?? null;
    const parentName = Array.isArray(parentRaw) ? (parentRaw[0]?.name ?? "") : (parentRaw?.name ?? "");
    const brand = brandOf(parentName);
    if (!acc.has(brand)) acc.set(brand, { shows: 0, rooms: new Set(), ratings: [] });
    const g = acc.get(brand)!;
    g.shows++;
    if (row.venue?.name) g.rooms.add(row.venue.name);
    if (row.rating != null) g.ratings.push(row.rating);
  }

  return BRAND_META
    .map(meta => {
      const g = acc.get(meta.name) ?? { shows: 0, rooms: new Set<string>(), ratings: [] };
      const avgRating = g.ratings.length
        ? Math.round(g.ratings.reduce((s, r) => s + r, 0) / g.ratings.length * 100) / 100
        : 0;
      return { ...meta, shows: g.shows, rooms: g.rooms.size, avgRating };
    })
    .filter(g => g.shows > 0);
}

async function getFringeEvents(): Promise<FringeEvent[]> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("event")
    .select("id, title, type, date, time, rating, review, full_description, price_paid, currency, notes, venue:venue_id(name)")
    .eq("festival_id", FESTIVAL_ID)
    .order("date", { ascending: true });
  const raw = (data ?? []) as unknown as FringeEvent[];
  return raw.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });
}

function avg(events: FringeEvent[]) {
  const rated = events.filter(e => e.rating !== null);
  if (!rated.length) return null;
  return Math.round((rated.reduce((s, e) => s + e.rating!, 0) / rated.length) * 100) / 100;
}

function gbpTotal(events: FringeEvent[]) {
  return events.filter(e => e.currency === "GBP" && e.price_paid != null).reduce((s, e) => s + e.price_paid!, 0);
}
function eurTotal(events: FringeEvent[]) {
  return events.filter(e => e.currency === "EUR" && e.price_paid != null).reduce((s, e) => s + e.price_paid!, 0);
}

function formatMoney(n: number, currency: string) {
  return currency === "GBP" ? `£${n.toFixed(0)}` : `€${n.toFixed(0)}`;
}

const TYPE_ORDER = ["theatre", "comedy", "circus", "cabaret", "dance", "classical", "magic", "other"];

// ── Editorial content generated from real reviews ──────────────────────────
const GENRE_ANALYSIS: Record<string, { subtitle: string; body: string }> = {
  theatre: {
    subtitle: "Your biggest category. Nineteen shows, five 5-stars, and one 2-star you read up on afterwards.",
    body: "Your theatre ranged from a free parody with Broadway-level pipes to a puppet Home Alone in a miniature house you couldn't quite see across the room. The pattern: simple staging, maximum ambition. Police Cops delivered a plot-heavy bromance-action-adventure with just three men and a lot of props — full five. The Distance wrung real tears out of a one-man show about a rural working-class athlete; <em>you nearly cried at the injury scenes</em>. Belly had you dreaming about BMI statistics the following night. The musicals split: Heated Rivalry soared, Grimm AF delivered mid, Chestnuts was two stars with what sounded like a comped house. Baby Wants Candy improvised a full coherent Midsummer Night's Cream in real time and you loved every moment of it.",
  },
  comedy: {
    subtitle: "Character comedy vs. standup comedy. The verdict is in.",
    body: "Tom Cashman got five stars and you put him up there with Sloss. Olga Koch got 4.5 for an hour about male loneliness that only revealed itself at the end. Jill's Tupperware Party and BIRDS both got 4.5 — one is a pyramid-scheme cult induction, the other is two women melting on sun loungers while the world ends around them. The WIP circuit (Bohart, Bauer, Gavin) did what WIPs do: honest, funny, unfinished. ALOK <em>came across as an opinion piece and a little preachy</em> — your words. You have a type: comedian with a point of view, material with a through-line.",
  },
  circus: {
    subtitle: "Your most reliable genre. Floor: 3.5 stars. No exceptions.",
    body: "Six shows. Lowest rating 3.5, and that was the Palestinian Circus — which you were also moved by for reasons beyond the acrobatics. Tell Me got five stars: three acrobats, two red cubes, an AIDS diagnosis told without words in Summerhall's old dissection theatre. <em>You cried.</em> YUCK, By a Thread, and Afrique En Cirque all got 4.5. Afrique had a live kora, singing, and got the audience chanting in African languages. By a Thread had rope geometries you'd genuinely never seen before. YUCK had disco hula hoops — and the Gen Z kids in the front row had absolutely no idea what any of it meant.",
  },
  cabaret: {
    subtitle: "Three fives and two 2.5s. The spread tells the whole story.",
    body: "Reuben Kaye has been five stars every Fringe. Hard to Swallow was the third: glitter suit, glitter penis, hairpiece on the microphone, and he caressed your face twice. The Kaye Hole delivered the night you'd been building towards for three years — there was a nude clown with a popcorn machine on her head doing a hula hoop act while butter was involved, and a salt shaker was retrieved from inside her body to season the result. Bernie Dieter's had your mum saying the F word for the first time you can remember. On the other end: Stamptown felt randomly assembled; Margaret Thatcher's make-up kept catching your attention and the improv felt over-rehearsed. <em>The difference isn't talent — it's whether the show has an arc.</em>",
  },
  dance: {
    subtitle: "Concept over choreography. Mental health as subject matter.",
    body: "Two contemporary dance pieces, both in Greenside venues, both about mental health. The Yellow Wallpaper adapted Gilman's short story through three dancers and spoken word monologues — the moment where they pushed faces and hands through stretchy fabric to escape the wall was properly unsettling, 4 stars. Anatomy of Survival explored an over-reactive nervous system with a single dancer and one drummer; the concept landed, <em>the dancing could have been more polished</em>, 3.5.",
  },
  classical: {
    subtitle: "Spectacular when it knows what it is.",
    body: "Tale of the Firebird combined violin, fire, and acrobatic circus in a single piece. The main woman — playing violin while doing stunts — was mesmerising, and the harpist playing upside down from the ceiling was jaw-dropping. But the supporting cast who'd picked up the other discipline showed their seams. The composition was beautiful. <em>The show might work better if it tried to do slightly less.</em>",
  },
  magic: {
    subtitle: "One show. The nudity didn't save it.",
    body: "The Adults Only Magic Show landed 2.5 stars. Technically competent, the magic was real, the nudity was present. But something felt off — you couldn't put words to it at the time. You've spotted the pattern before: craft without a point of view doesn't hold your attention for long.",
  },
  other: {
    subtitle: "One show. Lying down. Whispering.",
    body: "COMA by Darkfield. You lay down for the whole thing while smells, fans, 3D sound, vibrations, and a woman whispering directly in your ear made it the creepiest thing on your list. You didn't take the pill. 4 stars. Of course.",
  },
};

const SENTIMENT = {
  bar: { enthusiastic: 60, mixed: 30, meh: 10 },
  up: {
    title: "A story that revealed itself",
    body: "Your most charged reviews share a pattern: the show built somewhere rather than just being good at the thing. An ending that recontextualised everything before it — Olga Koch, 44 Minutes, COMA. A physical moment that stopped the room — By a Thread's rope geometries, Tell Me's AIDS story without words, The Distance's injury scenes. An audience implosion that couldn't be scripted — Reuben caressing your face, Matt getting on stage with a pitch-perfect Canadian accent, the Gen Z kids in the YUCK front row with blank stares. When a show arrived at something, your writing lit up.",
  },
  down: {
    title: "Thin premise and no point of view",
    body: "Five shows at 2.5 stars or below, and the pattern holds: the concept didn't justify the runtime, or the persona wasn't convincing enough to carry the room. \"The story was seriously lacking.\" \"The jokes were alright but none of them really surprised me.\" \"I really don't get the hype.\" It's not about production budget — Police Cops pulled off a plot-heavy action-adventure-bromance with three men and some props. It's about whether the show knows what it is.",
  },
  themes: [
    { label: "Queerness", desc: "Ran through at least seven shows — the snail's gender identity journey, an AIDS story told without a single word, Bernie Dieter's \"my body my choice\" dress with the Roe v Wade news clip playing, Reuben Kaye doing Reuben Kaye. You didn't seek it out consciously; it appeared because you kept choosing the shows where it lives." },
    { label: "Physicality", desc: "Your highest-rated shows almost all had bodies doing something extraordinary. The circus floor-plan is obvious, but it extends to The Distance (swinging literally and figuratively), 44 Minutes (Ryan writhing in the prison cell), and the ex-Cirque du Soleil shaving performance at Kaye Hole. What the body can do holds your attention in ways a talking head rarely matches." },
    { label: "A point of view", desc: "Tom Cashman over ALOK. BIRDS over average standup. Tell Me over any circus that's just tricks. You notice when a show has somewhere to go alongside the skill, and you reward it. The reviews where you wrote most are the ones where the show had something to say." },
    { label: "Audience implication", desc: "Jill inducted you into a cult. Mark Vigeant built a whole world from your imagination. Police Cops got Matt on stage. Reuben got your face twice. BIRDS soaked you with water guns. The Kaye Hole had you throwing hoops at a target. You don't hate participation — what you hate is when it feels mandatory rather than discovered." },
    { label: "The Fringe itself", desc: "You used \"pure fringe\" as a compliment at least twice. \"Weird and wonderful.\" \"Seriously fringe.\" \"You'd struggle to find it somewhere else.\" You came for the things that can only exist here — the snail puppetry, the miniature house no one could quite see, the shipping container with a woman who forgets the same thing over and over — and you found them." },
  ],
};

const PULLQUOTES: Array<{ text: string; source: string }> = [
  { text: "Did I join a cult? I think I did. OH JILL!", source: "Jill's Tupperware Party" },
  { text: "He swung (quite literally) from physically impressive to emotionally captivating to endearingly humorous. Never a dull moment.", source: "The Distance" },
  { text: "I cried. Just a fantastic piece of work.", source: "Tell Me" },
  { text: "Will I go back? Yes. Will I take my mum? Probably not.", source: "The Kaye Hole" },
  { text: "Broadway-level singing; they had some Pipes! As soon as the narrator came on stage, I knew it was going to be good.", source: "Heated Rivalry: The Unauthorized Musical Parody" },
  { text: "The creepiest bit was the woman whispering right in your ear 'what about this one?'", source: "COMA" },
  { text: "Our bodies are not our fault, but they are our responsibility.", source: "Belly" },
  { text: "Pure fringe — weird and wonderful, queer art.", source: "Bi-Curious George: Snail Trail" },
];
// ──────────────────────────────────────────────────────────────────────────

const FIVE_STAR_EXCERPTS: Record<string, string> = {
  "Reuben Kaye: Hard to Swallow": "Perfectly executed cabaret, fabulousness, bums, glitter suit with glitter penis, and incredibly topical takes on current events. This time he caressed my face twice 😌",
  "Heated Rivalry: The Unauthorized Musical Parody": "Broadway-level singing; they had some Pipes! Matt got up on stage to play Scott Hunter, putting on an incredible Canadian accent and making the cast laugh in shock at how good he was. A must-see if you're a fan of the show.",
  "Police Cops: The Original": "Just 3 guys + a lot of props playing a multitude of different characters. Simple, silly premise but perfect execution. Incredible how they can make something so plot heavy with so many characters with just the three of them.",
  "Bernie Dieter's Club Kabarett": "First time I've ever heard my mum use the F word 🤣 All the acts were so good all the way through — the tap dancer, the acrobat on the trapeze and pole in heels, the contortionist, and the drag queen. Just such an amazing show that hit all the entertainment angles.",
  "Tom Cashman: NPC (Nearly Proficient Comedian)": "Tom has excellent comedic timing, great callbacks, squeezed in a full story without it feeling like a monologue, and made very clever jokes throughout. He's up there with Sloss for me.",
  "The Distance": "He swung (quite literally) from physically impressive to emotionally captivating to endearingly humorous. I nearly cried at the injury and coming-to-terms scenes — they were designed to tug at my heartstrings, and boy, they did indeed.",
  "Tell Me": "Without words or obvious miming actions, you still feel everything the characters are feeling. I cried. Just a fantastic piece of work. And the support that Sadiq offers to the audience at the end was very touching too.",
  "The Kaye Hole Hosted by Reuben Kaye": "Bring back the naked clown, with a popcorn machine strapped to her head, doing a hula hoop performance while the popcorn spouts out on stage. Then she brings out the butter. To top things off, she released a salt shaker from inside her body to sprinkle over the buttery popcorn. Absolutely mindbogglingly absurd.",
  "Belly": "So moving it almost had me sobbing — just when I thought my nervous system would get a bit of respite she'd switch characters and trigger a new wave of emotion. Dreamt about this last night; clearly it really resonated deep inside me.",
};

const N = { navy: "#002B49", darkNavy: "#00243D", blue: "#E3ECF3", salmon: "#E85462", yellow: "#FFCE00", muted: "#6B8FA8", border: "#1A4462" };

export default async function Fringe2026Page() {
  if (await isGuestServer()) {
    return (
      <>
        <Nav />
        <main style={{ background: "#002B49", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans), system-ui, sans-serif", padding: "2rem" }}>
          <div style={{ textAlign: "center", maxWidth: "28rem" }}>
            <img src="/logo-ed-fringe-roundel.svg" width="64" height="64" alt="" style={{ marginBottom: "2rem", opacity: 0.8 }} />
            <h1 style={{ color: "#fff", fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: "1rem", lineHeight: 1.1 }}>
              Edinburgh<br /><span style={{ color: "#FFCE00" }}>Fringe</span> 2026.
            </h1>
            <p style={{ color: "#6B8FA8", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "2rem" }}>
              The retrospective is still being written.<br />Check back soon.
            </p>
            <Link href="/" style={{ color: "#E85462", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", textDecoration: "none" }}>← Back to ledger</Link>
          </div>
        </main>
      </>
    );
  }

  const [events, venueGroups] = await Promise.all([getFringeEvents(), getVenueGroups()]);
  const overallAvg = avg(events);
  const gbp = gbpTotal(events);
  const eur = eurTotal(events);
  const days = [...new Set(events.map(e => e.date))].sort();
  const ranked = [...events].sort((a, b) => {
    if (a.rating === null && b.rating === null) return 0;
    if (a.rating === null) return 1;
    if (b.rating === null) return -1;
    return b.rating - a.rating;
  });
  const dotGroups: DotStripGroup[] = TYPE_ORDER
    .map(t => ({
      type: t,
      shows: events
        .filter(e => e.type === t && e.rating !== null)
        .map(e => ({
          id: e.id,
          title: e.title,
          rating: e.rating!,
          venueName: e.venue?.name ?? null,
          reviewSnippet: e.review ? e.review.slice(0, 110) + (e.review.length > 110 ? "…" : "") : null,
        })),
    }))
    .filter(g => g.shows.length > 0);
  const fiveStars = events.filter(e => e.rating === 5);
  const firstDay = days[0] ? new Date(days[0] + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : null;
  const lastDay = days[days.length - 1] ? new Date(days[days.length - 1] + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : null;
  const dateRange = firstDay && lastDay ? (firstDay === lastDay ? firstDay : `${firstDay}–${lastDay}`) : null;
  const generated = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const sans: React.CSSProperties = { fontFamily: "var(--font-sans), system-ui, sans-serif" };
  const serif: React.CSSProperties = { fontFamily: "var(--font-serif), Georgia, serif" };

  return (
    <>
      <Nav />
      <main style={{ ...sans, minHeight: "100vh" }}>
        <style>{`
          .f-hero-inner   { display: flex; align-items: flex-start; gap: 2rem; margin-bottom: 2rem; }
          .f-stats        { display: flex; flex-wrap: nowrap; gap: 0; border-top: 1px solid ${N.border}; }
          .f-stat         { padding-right: 2.5rem; margin-right: 2.5rem; border-right: 1px solid ${N.border}; padding-top: 1.5rem; flex-shrink: 0; }
          .f-stat:last-child { padding-right: 0; margin-right: 0; border-right: none; }
          .f-genre-row    { display: grid; grid-template-columns: 1fr auto; gap: 1.5rem; align-items: start; margin-bottom: 1rem; }
          .f-genre-avg    { text-align: right; flex-shrink: 0; }
          .f-theme-row    { display: grid; grid-template-columns: 90px 1fr; gap: 1rem; border-top: 1px solid rgba(255,255,255,0.15); padding: 0.9rem 0; }
          .f-last         { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: start; }
          .f-section-label { font-size: 1.05rem; font-weight: 800; letter-spacing: -0.01em; margin-bottom: 1.5rem; }
          .f-pq-row       { display: grid; grid-template-columns: 1fr auto; gap: 2rem; border-top: 1px solid #C4D6E0; padding: 1.75rem 0; align-items: baseline; }
          @media (max-width: 640px) {
            .f-hero-inner { flex-direction: row; align-items: center; gap: 1rem; }
            .f-hero-inner img { width: 48px !important; height: 48px !important; flex-shrink: 0; }
            .f-stats { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid ${N.border}; }
            .f-stat { padding-right: 0; margin-right: 0; border-right: none; border-bottom: 1px solid ${N.border}; padding-bottom: 1.25rem; }
            .f-stat:nth-child(odd) { padding-right: 1rem; }
            .f-stat:nth-child(3), .f-stat:nth-child(4) { border-bottom: none; }
            .f-genre-avg { text-align: right; }
            .f-theme-row { grid-template-columns: 90px 1fr; }
            .f-last { grid-template-columns: 1fr; gap: 2.5rem; }
            .f-pq-row { grid-template-columns: 1fr; gap: 0.3rem; }
            .f-pq-source { text-align: left !important; }
          }
        `}</style>

        {/* ── HERO — full navy ─────────────────────────────── */}
        <section style={{ background: N.navy, paddingTop: "calc(3.5rem + 56px)", paddingBottom: "4rem" }}>
          <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "0 1.5rem" }}>
            <div className="f-hero-inner">
              <img src="/logo-ed-fringe-roundel.svg" width="72" height="72" alt="Edinburgh Festival Fringe" style={{ flexShrink: 0, marginTop: "0.25rem" }} />
              <div>
                <p style={{ color: N.muted, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                  Edinburgh Festival Fringe · August 2026
                </p>
                <h1 style={{ color: "#fff", fontSize: "clamp(2.75rem, 8vw, 5.5rem)", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.03em", margin: 0 }}>
                  Edinburgh<br /><span style={{ color: N.yellow }}>Fringe</span> 2026.
                </h1>
              </div>
            </div>
            <p style={{ color: N.muted, fontSize: "0.875rem", marginBottom: "3rem" }}>
              A personal retrospective. {dateRange ?? "8–17 August"}. Zero regrets.
            </p>
            <div className="f-stats">
              {[
                { val: String(events.length), label: "Shows seen" },
                { val: `£${gbp.toFixed(0)}${eur > 0 ? ` + €${eur.toFixed(0)}` : ""}`, label: "Spent" },
                { val: overallAvg ? String(overallAvg) : "—", label: "Avg rating", star: !!overallAvg },
                { val: String(days.length), label: "Days at the Fringe" },
              ].map((s) => (
                <div key={s.label} className="f-stat">
                  <div style={{ color: "#fff", fontSize: "clamp(1.75rem, 5vw, 2.75rem)", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>
                    {s.val}{"star" in s && s.star && <span style={{ color: N.yellow }}>★</span>}
                  </div>
                  <div style={{ color: N.muted, fontSize: "0.6rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", marginTop: "0.3rem" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHERE YOU WERE — light blue ─────────────────── */}
        <section style={{ background: N.blue, padding: "5rem 0" }}>
          <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "0 1.5rem" }}>
            <p className="f-section-label" style={{ color: N.salmon, marginBottom: "2rem" }}>Where you were</p>
            <VenueDonut groups={venueGroups} />
          </div>
        </section>

        {/* ── WHAT YOU SAW — white ─────────────────────────── */}
        <section style={{ background: "#FAFAF8", padding: "5rem 0" }}>
          <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "0 1.5rem" }}>
            <p className="f-section-label" style={{ color: N.salmon, marginBottom: "2rem" }}>What you saw</p>
            <GenreDotStrip groups={dotGroups} />
          </div>
        </section>

        {/* ── SENTIMENT — salmon full-bleed ────────────────── */}
        <section style={{ background: N.salmon, padding: "5rem 0" }}>
          <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "0 1.5rem" }}>
            <p className="f-section-label" style={{ color: "rgba(255,255,255,0.7)", marginBottom: "1rem" }}>How you felt</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span style={{ ...serif, color: "#fff", fontSize: "clamp(4.5rem, 16vw, 9rem)", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.04em" }}>{SENTIMENT.bar.enthusiastic}%</span>
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "1.1rem", fontWeight: 600 }}>enthusiastic</span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem", lineHeight: 1.65, maxWidth: "36rem", marginBottom: "2.5rem" }}>
              {SENTIMENT.up.body}
            </p>
            {/* bar */}
            <div style={{ display: "flex", height: "5px", borderRadius: "3px", overflow: "hidden", maxWidth: "36rem", marginBottom: "0.4rem", background: "rgba(255,255,255,0.15)" }}>
              <div style={{ width: `${SENTIMENT.bar.enthusiastic}%`, background: "#fff" }} />
              <div style={{ width: `${SENTIMENT.bar.mixed}%`, background: "rgba(255,255,255,0.4)" }} />
              <div style={{ width: `${SENTIMENT.bar.meh}%` }} />
            </div>
            <div style={{ display: "flex", maxWidth: "36rem", fontSize: "0.58rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "2.5rem" }}>
              <span style={{ width: `${SENTIMENT.bar.enthusiastic}%`, color: "#fff" }}>Enthusiastic</span>
              <span style={{ width: `${SENTIMENT.bar.mixed}%`, color: "rgba(255,255,255,0.55)" }}>Mixed</span>
              <span style={{ width: `${SENTIMENT.bar.meh}%`, color: "rgba(255,255,255,0.35)" }}>Meh</span>
            </div>

            <div style={{ background: "rgba(0,0,0,0.12)", borderRadius: "4px", padding: "1.5rem", maxWidth: "36rem", marginBottom: "2.5rem" }}>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "0.4rem" }}>What made you mark down</p>
              <p style={{ color: "#fff", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.4rem" }}>{SENTIMENT.down.title}</p>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.875rem", lineHeight: 1.65, margin: 0 }}>{SENTIMENT.down.body}</p>
            </div>

            <div style={{ maxWidth: "36rem" }}>
              {SENTIMENT.themes.map(theme => (
                <div key={theme.label} className="f-theme-row">
                  <span style={{ color: "#fff", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", paddingTop: "0.1rem" }}>{theme.label}</span>
                  <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.875rem", lineHeight: 1.6, margin: 0 }}>{theme.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── IN YOUR WORDS — light blue ───────────────────── */}
        <section style={{ background: N.blue, padding: "5rem 0" }}>
          <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "0 1.5rem" }}>
            <p className="f-section-label" style={{ color: N.salmon, marginBottom: "2rem" }}>In your words</p>
            {PULLQUOTES.map((q, i) => (
              <div key={i} className="f-pq-row">
                <p style={{ ...serif, color: N.navy, fontSize: "clamp(0.95rem, 2vw, 1.15rem)", lineHeight: 1.5, margin: 0, fontWeight: 400 }}>
                  <span style={{ color: N.salmon, fontSize: "1.5em", lineHeight: 0, verticalAlign: "-0.12em", marginRight: "0.1em" }}>"</span>{q.text}
                </p>
                <p className="f-pq-source" style={{ color: "#7A9BB0", fontSize: "0.6rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", margin: 0, textAlign: "right", whiteSpace: "nowrap", flexShrink: 0 }}>{q.source}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FIVE STAR CLUB — navy ────────────────────────── */}
        <section style={{ background: N.navy, padding: "5rem 0" }}>
          <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "0 1.5rem" }}>
            <p className="f-section-label" style={{ color: N.yellow, marginBottom: "0.5rem" }}>Five-star club</p>
            <h2 style={{ ...serif, color: "#fff", fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 700, lineHeight: 1.2, marginBottom: "2.5rem" }}>
              {fiveStars.length} show{fiveStars.length !== 1 ? "s" : ""} that earned the full five.
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(18rem, 1fr))", gap: "1px", background: N.border }}>
              {fiveStars.map(e => (
                <div key={e.id} style={{ background: N.darkNavy, padding: "1.5rem" }}>
                  <p style={{ color: N.yellow, fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "0.4rem" }}>{e.type} · ★★★★★</p>
                  <p style={{ color: "#fff", fontSize: "1rem", fontWeight: 700, lineHeight: 1.3, marginBottom: "0.3rem" }}>{e.title}</p>
                  <p style={{ color: N.muted, fontSize: "0.7rem", marginBottom: e.review ? "1rem" : 0 }}>
                    {e.venue?.name}{e.price_paid !== null && ` · ${e.notes?.toLowerCase().includes("gift") || e.notes?.toLowerCase().includes("gifted") || e.price_paid === 0 ? "gifted ticket" : formatMoney(e.price_paid, e.currency ?? "GBP")}`}
                  </p>
                  {(FIVE_STAR_EXCERPTS[e.title] ?? e.review) && (
                    <p style={{ color: "#8BAABF", fontSize: "0.825rem", lineHeight: 1.65, borderLeft: `2px solid ${N.salmon}`, paddingLeft: "0.75rem", margin: 0 }}>
                      {FIVE_STAR_EXCERPTS[e.title] ?? `${e.review!.slice(0, 200)}${e.review!.length > 200 ? "…" : ""}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── DAY BY DAY + RANKED — white ──────────────────── */}
        <section style={{ background: "#FAFAF8", padding: "5rem 0" }}>
          <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "0 1.5rem" }}>
            <div className="f-last">

              <div>
                <p className="f-section-label" style={{ color: N.salmon, marginBottom: "1.25rem" }}>Day by day</p>
                {days.map(date => {
                  const dayEvents = events.filter(e => e.date === date);
                  const dayRated = dayEvents.filter(e => e.rating !== null);
                  const dayAvg = dayRated.length ? Math.round(dayRated.reduce((s, e) => s + e.rating!, 0) / dayRated.length * 100) / 100 : null;
                  const label = new Date(date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
                  return (
                    <div key={date} style={{ borderTop: "1px solid #E0E8EF", padding: "0.75rem 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.2rem" }}>
                        <span style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: N.navy }}>{label}</span>
                        {dayAvg !== null && <span style={{ fontSize: "0.75rem", fontWeight: 700, color: N.navy, fontVariantNumeric: "tabular-nums" }}>{dayAvg}<span style={{ color: N.yellow }}>★</span></span>}
                      </div>
                      {dayEvents.map(e => (
                        <div key={e.id} style={{ fontSize: "0.775rem", color: "#6B7D8C", lineHeight: 1.7 }}>
                          {e.title}
                          {e.rating !== null && <span style={{ color: N.yellow, marginLeft: "0.2rem" }}>{"★".repeat(Math.floor(e.rating))}{e.rating % 1 >= 0.5 ? "½" : ""}</span>}
                          {e.rating === null && <span style={{ color: "#B0BEC8", fontStyle: "italic" }}> WIP</span>}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              <div>
                <p className="f-section-label" style={{ color: N.salmon, marginBottom: "1.25rem" }}>All {events.length}, ranked</p>
                {ranked.map((e, i) => (
                  <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1.25rem 1fr auto", gap: "0.5rem", borderTop: "1px solid #E0E8EF", padding: "0.45rem 0", alignItems: "baseline" }}>
                    <span style={{ fontSize: "0.58rem", color: "#B0BEC8", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{e.rating !== null ? i + 1 : "—"}</span>
                    <span style={{ fontSize: "0.8rem", color: "#1A2E3D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</span>
                    {e.rating !== null
                      ? <span style={{ fontSize: "0.7rem", fontVariantNumeric: "tabular-nums", color: e.rating >= 4.5 ? N.navy : e.rating <= 2.5 ? "#C8D8E4" : "#7A9BB0", fontWeight: e.rating >= 4.5 ? 700 : 400 }}>{e.rating}<span style={{ color: N.yellow }}>★</span></span>
                      : <span style={{ fontSize: "0.65rem", color: "#B0BEC8", fontStyle: "italic" }}>WIP</span>
                    }
                  </div>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────── */}
        <div style={{ background: N.navy, padding: "2rem 0" }}>
          <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "0 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <img src="/logo-ed-fringe-roundel.svg" width="22" height="22" alt="" style={{ opacity: 0.5 }} />
              <span style={{ color: N.muted, fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Edinburgh Festival Fringe 2026</span>
            </div>
            <div style={{ color: "#4A7A9B", fontSize: "0.65rem", textAlign: "right", lineHeight: 1.8 }}>
              Generated {generated}
              {events.filter(e => e.rating === null).length > 0 && <> · {events.filter(e => e.rating === null).length} pending verdict</>}
              {" · "}<Link href="/" style={{ color: N.muted, textDecoration: "none" }}>← Back to ledger</Link>
            </div>
          </div>
        </div>

      </main>
    </>
  );
}
