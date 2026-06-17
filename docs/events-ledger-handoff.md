# Events Ledger — New Chat Handoff
*Schema stress testing complete. Ready to build. June 2026.*

---

## What this project is

A personal web app to log every cultural event Claire attends — gigs, opera, ballet, theatre, comedy, exhibitions, talks, circus, and more — with rich metadata, personal ratings, Substack review links, and eventually a public view for sharing upcoming events with friends.

**Stack:** FastAPI + SQLModel + Postgres + Astro frontend.

---

## Files in this project

1. **events-ledger-schema.md** — the full data model (source of truth)
2. **events-ledger-data-entries.md** — all stress test event data entered so far

---

## Current status

**Schema stress testing is complete.** All 14 event types have been tested against real (or dummy) events. No further schema changes expected before building begins.

**Next step: start building.**

Note: the schema is stable but not frozen. Real data entry during building will likely surface edge cases that stress testing missed. When a gap appears, flag it and propose a schema change rather than forcing data into the existing model. Update events-ledger-schema.md as the source of truth whenever changes are agreed.

Suggested build order:
1. Database setup — Postgres + SQLModel models from the schema
2. FastAPI backend — CRUD endpoints for core entities (Event, Venue, Person, Ensemble, Work, Festival)
3. Extension table endpoints — one per event type
4. Data import — migrate the 24 stress test events from the data entries doc into the database
5. Astro frontend — basic event list and detail views
6. MusicBrainz API integration — auto-populate Person, Ensemble, MusicalPiece metadata
7. Setlist.fm API integration — auto-fetch gig setlists
8. Public/shareable view for upcoming events (future)

---

## Stress tests completed (all types done)

- ✅ `ballet` — Masters of Movement, Dutch National Ballet, June 2026
- ✅ `comedy` — Daniel Sloss: Really…?!, Edinburgh Fringe 2014; Daisy Doris May: Big Night Out, Edinburgh Fringe 2025
- ✅ `cabaret` — Dita Von Teese: Nocturnelle, Carré Amsterdam, March 2026; Werq the World, Ziggo Dome, November 2023
- ✅ `music` — Chappell Roan, Edinburgh Summer Sessions, August 2025
- ✅ `classical` — Joshua Bell/ASMF, Concertgebouw, Jan 2019; Floor Kes trio, Muziekgebouw, May 2026; CvA Harp, Muziekgebouw, May 2026; Het Wilde Wat, JoyJoyJoy Basilika, June 2026
- ✅ `opera` — Le nozze di Figaro, Dutch National Opera, May 2026; The Opera Circus, Opera2Day, March 2026
- ✅ `dance` — Oxygen: The Rise, DeLaMar Amsterdam, June 2026
- ✅ `circus` — Kurios, Cirque du Soleil, Den Haag, December 2025; Circa: Humans 2.0, Edinburgh Fringe 2024
- ✅ `theatre / play` — Monstering the Rocketman, Pleasance Dome, Edinburgh Fringe 2025
- ✅ `theatre / musical` — Hadestown, Carré Amsterdam, September 2025
- ✅ `theatre / improv` — Boom Chicago Improv Spectacular, Amsterdam, December 2025
- ✅ `theatre / improv_musical` — Baby Wants Candy, Assembly George Square, Edinburgh Fringe 2024
- ✅ `spoken_word` — Our Anxious Measurements III, Banshee Labyrinth, Edinburgh Fringe 2025
- ✅ `talk` — Catherine Bohart: Who Runs the World?, Dynamic Earth, Edinburgh Fringe 2023
- ✅ `exhibition` — Tilda Swinton: Ongoing + permanent collection, Eye Filmmuseum, March 2026
- ✅ `screening` — dummy entry (live score event)
- ✅ `other` — Flight (Darkfield), Pleasance Dome, Edinburgh Fringe 2024

---

## Key schema decisions

**Event types enum:** music · classical · opera · ballet · dance · circus · theatre · cabaret · comedy · spoken_word · talk · exhibition · screening · other

**`cabaret` is its own type** (not a subtype of theatre) with its own `EventCabaret` extension table.

**`theatre / improv`** sits under `theatre`, not `comedy`. Boom Chicago = theatre. Daniel Sloss = comedy. The distinction is performance format, not funniness.

**`price_paid` convention:** total paid ÷ number of tickets, all fees included, postage excluded. Always actual amount paid. Free events (BBC ballot, Museumkaart, PBH Free Fringe) → `price_paid: 0.00` with reason in `notes`.

**`data_completeness` on Event:** `complete` / `partial` / `stub`.

**Venue hierarchy:** `Venue` has `parent_id` (self-referencing FK for building→room) and `operator_id` (FK → `VenueOperator` for Fringe promoters). `Event.venue_id` always points to the most specific space.

**MusicBrainz** is the primary external identifier for Person, Ensemble, Work, MusicalPiece (API integration planned). **Setlist.fm** for gig setlists. Everything else is plain URL links.

**Classical programme structure:**
- `EventClassical` has no `soloists[]` at event level — soloists live on `ClassicalProgrammeItem` (per piece)
- `ClassicalProgrammeItem`: event_id, musical_piece_id, soloists[], order, notes

**MusicalPiece:**
- `composer_id` is nullable — null for traditional/anonymous works
- `composer_text` for free-text attribution (e.g. "trad. Gregorian", "Alt-J (arr. Davin Curtis)")
- `arranger_id` and `original_work_id` for arrangements

**Ballet programme structure:**
- `EventBallet` has `company_id` and `orchestra_id` — separate ensembles
- `BalletProgrammeItem`: choreographer per piece
- `BalletProgrammeMusic`: links each programme item to MusicalPiece rows

**Opera:**
- `libretto_language` — language sung
- `surtitles_languages: string[]` — array, dual surtitles common (e.g. ["Dutch", "English"])

**Dance:**
- `music_notes: string` on `EventDance` — free-text music credits when no structured programme

**Screening:**
- `conductor_id` on `EventScreening` — for live score events

**Exhibition:**
- `permanent_collection` removed from subtype enum — use `permanent_or_temp: permanent` instead

**Work.type enum:** play / opera / symphony / ballet / album / poem / film / circus_show / dance_show / spoken_word / musical / other

---

## Things NOT to change without flagging

- The extension table pattern (one per event type) — deliberate
- The `MusicalPiece` / `Work` split — `Work` is a ballet/opera/play; `MusicalPiece` is a composition
- `person_id` not being on `Event` directly — Person connects through extension tables
- The venue hierarchy model — carefully designed around Fringe complexity
- `cabaret` as its own type, not a subtype of theatre
