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
  { text: "The creepiest bit was the woman whispering right in your ear 'what about this one?'", source: "COMA" },
  { text: "Seriously fringe. Seriously insane. Seriously loved it.", source: "Jill's Tupperware Party" },
  { text: "One of the best parts was looking across at the blank stares of the two Gen Z-ers in the front row who were missing half of the references.", source: "YUCK Circus: Naughties" },
];
// ──────────────────────────────────────────────────────────────────────────

const N = { navy: "#002B49", darkNavy: "#00243D", blue: "#E3ECF3", salmon: "#E85462", yellow: "#FFCE00", muted: "#6B8FA8", border: "#1A4462" };

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
  const fiveStars = events.filter(e => e.rating === 5);
  const generated = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const sans: React.CSSProperties = { fontFamily: "var(--font-sans), system-ui, sans-serif" };
  const serif: React.CSSProperties = { fontFamily: "var(--font-serif), Georgia, serif" };

  return (
    <>
      <Nav />
      <main style={{ ...sans, minHeight: "100vh" }}>
        <style>{`
          .f-hero-inner   { display: flex; align-items: flex-start; gap: 2rem; margin-bottom: 2rem; }
          .f-stats        { display: flex; flex-wrap: wrap; gap: 0; border-top: 1px solid ${N.border}; }
          .f-stat         { padding-right: 2.5rem; margin-right: 2.5rem; border-right: 1px solid ${N.border}; padding-top: 1.5rem; }
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
            .f-stats { gap: 0; }
            .f-stat { padding-right: 1.25rem; margin-right: 1.25rem; }
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
              A retrospective of {events.length} shows across {days.length} days, 8–17 August 2026.
            </p>
            <div className="f-stats">
              {[
                { val: String(events.length), label: "Shows seen" },
                { val: `£${gbp.toFixed(0)}${eur > 0 ? ` + €${eur.toFixed(0)}` : ""}`, label: "Spent" },
                { val: overallAvg ? String(overallAvg) : "—", label: "Avg rating", star: !!overallAvg },
                { val: String(fiveStars.length), label: "Five-star nights" },
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

        {/* ── WHAT YOU SAW — white ─────────────────────────── */}
        <section style={{ background: "#FAFAF8", padding: "5rem 0" }}>
          <div style={{ maxWidth: "52rem", margin: "0 auto", padding: "0 1.5rem" }}>
            <p className="f-section-label" style={{ color: N.salmon, marginBottom: "0.4rem" }}>What you saw</p>
            <h2 style={{ ...serif, color: N.navy, fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 700, lineHeight: 1.15, marginBottom: "3rem" }}>
              {events.length} shows.<br />{byType.length} genres.<br />Zero regrets.
            </h2>
            {byType.map(({ type, events: te }) => {
              const typeAvg = avg(te);
              const analysis = GENRE_ANALYSIS[type];
              return (
                <div key={type} style={{ borderTop: "1px solid #E0E8EF", paddingTop: "2rem", paddingBottom: "2rem" }}>
                  <div className="f-genre-row">
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.6rem" }}>
                        <span style={{ color: N.navy, fontSize: "1.4rem", fontWeight: 800, textTransform: "capitalize", letterSpacing: "-0.02em" }}>{type}</span>
                        <span style={{ color: "#9AADBC", fontSize: "0.6rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em" }}>{te.length} show{te.length !== 1 ? "s" : ""}</span>
                      </div>
                      {analysis && <p style={{ color: "#6B7D8C", fontSize: "0.875rem", lineHeight: 1.65, margin: "0 0 0.75rem", maxWidth: "none" }} dangerouslySetInnerHTML={{ __html: analysis.body }} />}
                      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                        {[...te].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).map(e => (
                          <span key={e.id} style={{
                            fontSize: "0.7rem", padding: "0.2rem 0.55rem", borderRadius: "2px",
                            border: `1px solid ${e.rating && e.rating >= 4.5 ? N.navy : "#D4DDE6"}`,
                            color: e.rating && e.rating >= 4.5 ? N.navy : e.rating && e.rating <= 2.5 ? "#B0BEC8" : "#4A5C6A",
                            fontWeight: e.rating && e.rating >= 4.5 ? 600 : 400,
                          }}>
                            {e.title}{e.rating !== null
                              ? <span style={{ color: "#9AADBC" }}> {e.rating}<span style={{ color: N.yellow }}>★</span></span>
                              : <span style={{ color: "#B0BEC8", fontStyle: "italic" }}> WIP</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                    {typeAvg && (
                      <div className="f-genre-avg">
                        <div style={{ color: N.navy, fontSize: "2.25rem", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>{typeAvg}<span style={{ color: N.yellow }}>★</span></div>
                        <div style={{ color: "#9AADBC", fontSize: "0.55rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em" }}>avg</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
                  {e.review && <p style={{ color: "#8BAABF", fontSize: "0.825rem", lineHeight: 1.65, borderLeft: `2px solid ${N.salmon}`, paddingLeft: "0.75rem", margin: 0 }}>{e.review.slice(0, 200)}{e.review.length > 200 ? "…" : ""}</p>}
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
