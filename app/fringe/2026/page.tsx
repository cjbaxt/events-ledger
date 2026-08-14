import { createServiceClient } from "@/lib/supabase/service";
import Nav from "@/components/Nav";
import Link from "next/link";

const FESTIVAL_ID = "f406761a-a55a-456b-b887-f8ee76fae039";

type FringeEvent = {
  id: string;
  title: string;
  type: string;
  date: string;
  rating: number | null;
  review: string | null;
  price_paid: number | null;
  currency: string | null;
  notes: string | null;
  venue: { name: string } | null;
};

async function getFringeEvents(): Promise<FringeEvent[]> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("event")
    .select("id, title, type, date, rating, review, price_paid, currency, notes, venue:venue_id(name)")
    .eq("festival_id", FESTIVAL_ID)
    .order("date", { ascending: true });
  return (data ?? []) as unknown as FringeEvent[];
}

function stars(r: number) {
  const full = Math.floor(r);
  const half = r % 1 >= 0.5;
  return "★".repeat(full) + (half ? "½" : "");
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

const TYPE_ORDER = ["theatre", "comedy", "circus", "cabaret", "other"];

// ── Hardcoded editorial content (updated in conversation) ──────────────────
const GENRE_ANALYSIS: Record<string, { subtitle: string; body: string }> = {
  theatre: {
    subtitle: "Your biggest category and your most complicated relationship.",
    body: "You saw musicals, a puppet show, a spoken-word political piece, a snail-based gender meditation, and a flat-earth conspiracy comedy. The range is notable. The free parody was the best of the lot — <em>Broadway-level singing, you said</em> — while your most expensive theatre ticket got 2.5 stars. You're hard to please here, and rightly so.",
  },
  comedy: {
    subtitle: "Character and concept over straight standup.",
    body: "The pattern is clear: Jill's Tupperware Party and BIRDS both got 4.5 — one is a fake MLM cult, one is two women on sun loungers at the end of the world. The straight standup entries landed lower. You want a point of view, not a set.",
  },
  circus: {
    subtitle: "Your most reliable genre.",
    body: "You have never given circus below 4 stars. Physicality and concept, not just spectacle — the circus shows that earn your attention always have both.",
  },
  cabaret: {
    subtitle: "A tale of two shows.",
    body: "Reuben Kaye is 5 stars again — <em>he touched your face again</em>, this is now a recurring event — and the Adults Only Magic Show got 2.5. The gap says something about what cabaret can be at its best versus at its most perfunctory.",
  },
  other: {
    subtitle: "One show. Lying down. Whispering.",
    body: "COMA by Darkfield. You lay down for the whole thing while smells, fans, vibrations, and a woman whispering in your ear made it the creepiest thing on your list. 4 stars. Of course.",
  },
};

const SENTIMENT = {
  bar: { enthusiastic: 72, mixed: 18, meh: 10 },
  up: {
    title: "Surprise, craft, and physical presence",
    body: "Your most charged reviews share a pattern: something happened that you didn't predict. Matt got on stage. Reuben caressed your face. The Gen Z kids in the front row had no idea what they were watching. The disco hula hoops. The woman whispering directly in your ear. When a show broke through the fourth wall — in either direction — your writing lit up.",
  },
  down: {
    title: "Story weakness and room mismatch",
    body: "Three shows got 3 stars or below, and in each case the notes tell the same story: the room was wrong, the story was thin, or the point of view was unclear. \"Too much for the room.\" \"The story was seriously lacking.\" \"Came across as an opinion piece.\" You tolerate technical limitations and enjoy lo-fi; what you don't forgive is vagueness.",
  },
  themes: [
    { label: "Queerness", desc: "Ran through at least 5 shows. You didn't seek it out consciously; it just keeps showing up because you keep choosing the shows where it is. You gave the snail's gender identity journey 4.5 stars." },
    { label: "Physicality", desc: "Your highest-rated shows almost all had bodies doing something extraordinary — acrobatics, hula hoops, sun lounger decomposition, lying completely still in the dark. You respond to what the body can do in ways that straight standup or lecture-format shows can't match." },
    { label: "Craft admiration", desc: "Specific technical praise appears in 8 reviews: \"Broadway level singing\", \"amazing ensemble acrobatics\", \"mesmerizingly funny\". You notice when people are good at the thing they're doing, and you say so." },
    { label: "Audience participation", desc: "You noted it — positively or neutrally — in 4 shows. You don't hate being implicated. What you do hate is participation that feels mandatory rather than discovered." },
    { label: "The Fringe itself", desc: "You used the word \"fringe\" as a compliment three times. \"Pure fringe — weird and wonderful.\" You came for the things that can only exist here, and you found them." },
  ],
};

const PULLQUOTES: Array<{ text: string; source: string }> = [
  { text: "Did I join a cult? I think I did. OH JILL!", source: "Jill's Tupperware Party" },
  { text: "Pure fringe — weird and wonderful, queer art.", source: "Bi-Curious George" },
  { text: "Broadway level singing, they had some Pipes.", source: "Heated Rivalry" },
  { text: "The creepiest bit was the woman whispering right in your ear ‘what about this one?’", source: "COMA" },
  { text: "Seriously fringe. Seriously insane. Seriously loved it.", source: "Jill's Tupperware Party" },
  { text: "One of the best parts was looking across at the blank stares of the two Gen Z-ers in the front row who were missing half of the references.", source: "YUCK Circus: Naughties" },
];
// ──────────────────────────────────────────────────────────────────────────

export default async function Fringe2026Page() {
  const events = await getFringeEvents();
  const rated = events.filter(e => e.rating !== null);
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
  const byType = TYPE_ORDER.map(t => ({ type: t, events: events.filter(e => e.type === t) })).filter(g => g.events.length);
  const generated = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-[#FAFAF8]">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');
          .fringe-display { font-family: 'DM Serif Display', var(--font-serif), Georgia, serif; }
          .fringe-serif   { font-family: var(--font-serif), Georgia, serif; }
          .fringe-sans    { font-family: var(--font-sans), system-ui, sans-serif; }
          .fringe-navy    { color: #002B49; }
          .fringe-salmon  { color: #E85462; }
          .fringe-yellow  { color: #FFCE00; }
        `}</style>

        {/* Masthead */}
        <div className="border-b-2 border-[#002B49] pb-8 pt-10">
          <div className="max-w-3xl mx-auto px-6">
            <div className="flex items-start gap-6 sm:gap-8 mb-5">
              <img src="/logo-ed-fringe-roundel.svg" width="96" height="96" alt="Edinburgh Festival Fringe" className="shrink-0 mt-1" />
              <div>
                <div className="fringe-sans text-[0.6rem] font-bold tracking-[0.22em] uppercase text-[#002B49] mb-4">Edinburgh Festival Fringe · August 2026</div>
                <h1 className="fringe-serif text-5xl sm:text-7xl font-bold italic leading-none tracking-tight mb-4 text-neutral-900">
                  Edinburgh<br /><span className="text-[#002B49]">Fringe 2026.</span>
                </h1>
                <p className="fringe-sans text-sm text-[#8A8078] max-w-md leading-relaxed">
                  {events.length} shows across {days.length} days, 8–17 August 2026.
                </p>
              </div>
            </div>
            <div className="flex gap-0 mt-7 pt-6 border-t border-[#D4DDE6] flex-wrap">
              {[
                { val: events.length.toString(), label: "Shows" },
                { val: `£${gbp.toFixed(0)}${eur > 0 ? ` + €${eur.toFixed(0)}` : ""}`, label: "Spent" },
                { val: overallAvg ? overallAvg : "—", label: "Avg rating", star: !!overallAvg },
                { val: rated.length.toString(), label: "Reviews written" },
              ].map((s, i, arr) => (
                <div key={s.label} className={`pr-8 mr-8 ${i < arr.length - 1 ? "border-r border-[#D4DDE6]" : ""} mb-4`}>
                  <div className="fringe-serif text-3xl font-bold text-[#002B49] tabular-nums leading-none">{s.val}{"star" in s && s.star && <span className="text-[#FFCE00]">★</span>}</div>
                  <div className="fringe-sans text-[0.6rem] tracking-[0.12em] uppercase text-[#8A8078] mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Genre breakdown */}
        <section className="border-t border-[#D4DDE6] py-14">
          <div className="max-w-3xl mx-auto px-6">
            <div className="fringe-sans text-[0.6rem] font-bold tracking-[0.2em] uppercase text-[#8A8078] mb-8">What you saw</div>
            {byType.map(({ type, events: te }) => {
              const typeAvg = avg(te);
              const analysis = GENRE_ANALYSIS[type];
              return (
                <div key={type} className="mb-10 last:mb-0">
                  <div className="flex items-baseline gap-4 pb-3 border-b border-[#D4DDE6] mb-3">
                    <div className="fringe-serif text-xl font-bold italic capitalize text-[#E85462]">{type}</div>
                    <div className="fringe-sans text-[0.65rem] tracking-widest uppercase text-[#8A8078]">{te.length} show{te.length > 1 ? "s" : ""}</div>
                    {typeAvg && <div className="fringe-sans text-[0.7rem] text-[#8A8078] ml-auto tabular-nums">avg <strong className="text-neutral-900">{typeAvg}<span className="text-[#FFCE00]">★</span></strong></div>}
                  </div>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {[...te].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).map(e => (
                      <div key={e.id} className={`fringe-sans text-[0.65rem] px-2 py-1 border rounded-sm flex items-center gap-1.5 ${e.rating && e.rating >= 4.5 ? "border-[#002B49] text-[#002B49]" : e.rating && e.rating <= 2.5 ? "border-[#D4DDE6] opacity-50" : "border-[#D4DDE6] text-neutral-700"}`}>
                        <span className="truncate max-w-[200px]">{e.title}</span>
                        {e.rating !== null && <span className="text-[#8A8078] tabular-nums">{e.rating}<span className="text-[#FFCE00]">★</span></span>}
                        {e.rating === null && <span className="italic text-[#8A8078]">WIP</span>}
                      </div>
                    ))}
                  </div>
                  {analysis && (
                    <p className="fringe-serif text-[0.875rem] text-[#8A8078] leading-relaxed max-w-xl" dangerouslySetInnerHTML={{ __html: analysis.body }} />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Sentiment */}
        <section className="border-t border-[#D4DDE6] py-14">
          <div className="max-w-3xl mx-auto px-6">
            <div className="fringe-sans text-[0.6rem] font-bold tracking-[0.2em] uppercase text-[#8A8078] mb-6">How you felt</div>
            <div className="flex h-1 max-w-lg mb-1 overflow-hidden rounded-full">
              <div style={{ width: `${SENTIMENT.bar.enthusiastic}%` }} className="bg-[#002B49]" />
              <div style={{ width: `${SENTIMENT.bar.mixed}%` }} className="bg-[#E85462]" />
              <div style={{ width: `${SENTIMENT.bar.meh}%` }} className="bg-[#D4DDE6]" />
            </div>
            <div className="flex fringe-sans text-[0.6rem] tracking-widest uppercase max-w-lg mb-10">
              <span className="flex-1 text-[#002B49]">Enthusiastic {SENTIMENT.bar.enthusiastic}%</span>
              <span className="flex-1 text-[#E85462]">Mixed {SENTIMENT.bar.mixed}%</span>
              <span className="flex-1 text-[#8A8078]">Meh {SENTIMENT.bar.meh}%</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-px bg-[#D4DDE6] mb-10">
              {[SENTIMENT.up, SENTIMENT.down].map((card, i) => (
                <div key={i} className="bg-[#E3ECF3] p-6">
                  <div className="fringe-sans text-[0.6rem] font-bold tracking-[0.18em] uppercase text-[#8A8078] mb-2">{i === 0 ? "What lit you up" : "What made you mark down"}</div>
                  <div className="fringe-serif text-base font-bold italic mb-2 text-neutral-900">{card.title}</div>
                  <p className="fringe-sans text-[0.82rem] text-[#8A8078] leading-relaxed">{card.body}</p>
                </div>
              ))}
            </div>

            <div className="divide-y divide-[#D4DDE6]">
              {SENTIMENT.themes.map(theme => (
                <div key={theme.label} className="grid sm:grid-cols-[160px_1fr] gap-4 py-4">
                  <div className="fringe-sans text-[0.65rem] font-bold tracking-[0.12em] uppercase text-[#002B49] pt-0.5">{theme.label}</div>
                  <p className="fringe-sans text-[0.875rem] text-[#8A8078] leading-relaxed">{theme.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Five star club */}
        <section className="border-t border-[#D4DDE6] py-14">
          <div className="max-w-3xl mx-auto px-6">
            <div className="fringe-sans text-[0.6rem] font-bold tracking-[0.2em] uppercase text-[#8A8078] mb-6">Five-star club</div>
            <div className="grid sm:grid-cols-2 gap-px bg-[#D4DDE6]">
              {events.filter(e => e.rating === 5).map(e => (
                <div key={e.id} className="bg-[#FAFAF8] p-6">
                  <div className="fringe-sans text-[0.55rem] font-bold tracking-[0.18em] uppercase text-[#002B49] mb-2">{e.type}</div>
                  <div className="fringe-serif text-lg font-bold italic leading-snug mb-1 text-neutral-900">{e.title}</div>
                  <div className="fringe-sans text-[0.7rem] text-[#8A8078] mb-4">{e.venue?.name}{e.price_paid !== null && ` · ${e.notes?.toLowerCase().includes("gift") || e.notes?.toLowerCase().includes("gifted") || e.price_paid === 0 ? "gifted ticket" : formatMoney(e.price_paid, e.currency ?? "GBP")}`}</div>
                  {e.review && <div className="fringe-serif text-[0.875rem] italic leading-relaxed border-l-2 border-[#E85462] pl-4 text-neutral-800">{e.review.slice(0, 200)}{e.review.length > 200 ? "…" : ""}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pullquotes */}
        <section className="border-t border-[#D4DDE6] py-14 bg-[#E3ECF3]">
          <div className="max-w-3xl mx-auto px-6">
            <div className="fringe-sans text-[0.6rem] font-bold tracking-[0.2em] uppercase text-[#8A8078] mb-4">In your words</div>
            <div className="divide-y divide-[#D4DDE6]">
              {PULLQUOTES.map((q, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] gap-6 py-5 items-baseline">
                  <div className="fringe-serif italic text-base sm:text-lg leading-snug text-neutral-900">
                    <span className="text-[#E85462] mr-0.5 not-italic text-xl leading-none align-[-0.1em]">"</span>{q.text}
                  </div>
                  <div className="fringe-sans text-[0.6rem] tracking-widest uppercase text-[#8A8078] whitespace-nowrap text-right">{q.source}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Day by day */}
        <section className="border-t border-[#D4DDE6] py-14">
          <div className="max-w-3xl mx-auto px-6">
            <div className="fringe-sans text-[0.6rem] font-bold tracking-[0.2em] uppercase text-[#8A8078] mb-6">Day by day</div>
            <div className="divide-y divide-[#D4DDE6]">
              {days.map(date => {
                const dayEvents = events.filter(e => e.date === date);
                const dayRated = dayEvents.filter(e => e.rating !== null);
                const dayAvg = dayRated.length ? Math.round(dayRated.reduce((s, e) => s + e.rating!, 0) / dayRated.length * 100) / 100 : null;
                const dateObj = new Date(date + "T00:00:00");
                const label = dateObj.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
                return (
                  <div key={date} className="grid grid-cols-[100px_1fr_auto] gap-4 py-4 items-start">
                    <div className="fringe-sans text-[0.65rem] font-bold tracking-widest uppercase text-neutral-900 pt-0.5">{label}</div>
                    <div className="flex flex-col gap-1">
                      {dayEvents.map(e => (
                        <div key={e.id} className="flex items-baseline gap-2">
                          <span className="fringe-serif italic text-[0.875rem] text-neutral-900">{e.title}</span>
                          {e.rating !== null ? <span className="fringe-sans text-[0.7rem] text-neutral-700 tabular-nums">{e.rating}<span className="text-[#FFCE00]">★</span></span> : <span className="fringe-sans text-[0.65rem] italic text-[#8A8078]">WIP</span>}
                        </div>
                      ))}
                    </div>
                    <div className="text-right fringe-sans">
                      {dayAvg !== null ? (
                        <>
                          <div className="fringe-serif italic text-lg text-neutral-900 tabular-nums">{dayAvg}<span className="text-[#FFCE00]">★</span></div>
                          <div className="text-[0.55rem] tracking-widest uppercase text-[#8A8078]">avg</div>
                        </>
                      ) : (
                        <div className="text-[0.65rem] italic text-[#8A8078]">Pending</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Ranked list */}
        <section className="border-t border-[#D4DDE6] py-14 bg-[#E3ECF3]">
          <div className="max-w-3xl mx-auto px-6">
            <div className="fringe-sans text-[0.6rem] font-bold tracking-[0.2em] uppercase text-[#8A8078] mb-4">All {events.length} shows, ranked</div>
            <div className="divide-y divide-[#D4DDE6]">
              {ranked.map((e, i) => (
                <div key={e.id} className="grid grid-cols-[1.5rem_1fr_auto_auto] gap-x-4 items-baseline py-2.5">
                  <div className="fringe-sans text-[0.65rem] text-[#8A8078] text-right tabular-nums">{e.rating !== null ? i + 1 : "—"}</div>
                  <div className="fringe-serif italic text-[0.9rem] text-neutral-900 truncate">{e.title}</div>
                  <div className="fringe-sans text-[0.6rem] tracking-widest uppercase text-[#8A8078] hidden sm:block">{e.type}</div>
                  {e.rating !== null
                    ? <div className={`fringe-sans text-[0.75rem] tabular-nums whitespace-nowrap ${e.rating >= 4.5 ? "text-neutral-900 font-semibold" : e.rating <= 2.5 ? "text-[#D4DDE6]" : "text-[#8A8078]"}`}>{e.rating}<span className="text-[#FFCE00]">★</span></div>
                    : <div className="fringe-sans text-[0.65rem] italic text-[#8A8078]">WIP</div>
                  }
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-[#D4DDE6] py-10">
          <div className="max-w-3xl mx-auto px-6 flex justify-between items-end flex-wrap gap-4">
            <div className="fringe-serif italic text-lg text-[#8A8078]">Edinburgh Festival Fringe 2026</div>
            <div className="fringe-sans text-[0.65rem] text-[#8A8078] text-right leading-relaxed">
              Generated {generated}<br />
              {events.filter(e => e.rating === null).length > 0 && `${events.filter(e => e.rating === null).length} show${events.filter(e => e.rating === null).length > 1 ? "s" : ""} pending verdict`}<br />
              <Link href="/" className="hover:text-neutral-700 transition-colors">← Back to ledger</Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
