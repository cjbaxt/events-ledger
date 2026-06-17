# Personal Events Ledger — Data Model

*Working document. Captured June 2026. Incomplete by design — to be revisited when building begins.*

---

## Purpose

A personal ledger of cultural events attended: gigs, theatre, ballet, opera, comedy, exhibitions, talks, circus, and more. Supports external links (reviews, tickets, artist pages) and personal notes/ratings. Substack review links are a first-class field.

---

## Open Questions (to resolve before building)

- [x] Exact tech stack → FastAPI + SQLModel + Postgres + Astro frontend

---

## Schema Stress Test — Event Types

Working through one real event per type to validate the schema. Tick off when done.

- [x] `ballet` — Masters of Movement, Dutch National Ballet, June 2026 *(mixed bill; revealed need for BalletProgrammeItem, BalletProgrammeMusic, MusicalPiece, orchestra_id)*
- [x] `comedy` — Daniel Sloss: Really…?!, Edinburgh Fringe, August 2014 *(revealed need for VenueOperator and parent_id hierarchy on Venue)*
- [x] `comedy` (2nd) — Daisy Doris May: Big Night Out, Edinburgh Fringe, August 2025 *(confirmed `character` subtype)*
- [x] `cabaret` — Dita Von Teese: Nocturnelle, Carré Amsterdam, March 2026 *(revealed need for EventCabaret as distinct type; burlesque/cabaret removed from EventTheatre)*
- [x] `cabaret` (2nd) — Werq the World, Ziggo Dome, November 2023 *(confirmed `drag` subtype; ensemble-headlined show with no single headliner)*
- [x] `music` — Chappell Roan, Edinburgh Summer Sessions, August 2025 *(revealed need for `currency` field on Event)*
- [x] `classical` — Joshua Bell & Academy of St Martin in the Fields, Concertgebouw Amsterdam, January 2019 *(revealed need for per-piece soloists on ClassicalProgrammeItem; confirmed Setlist.fm not applicable for classical)*
- [x] `classical` (2nd) — Floor Kes, Alicia De Keulenaer + Katja Naegele, Muziekgebouw lunchconcert, May 2026 *(revealed need for `arranger_id` and `original_work_id` on MusicalPiece; `data_completeness` field on Event; programme recovered from physical programme photo)*
- [x] `classical` (3rd) — CvA Harp, Muziekgebouw, May 2026 *(no new schema gaps)*
- [x] `classical` (4th) — Het Wilde Wat, JoyJoyJoy Basilika, June 2026 *(revealed need for nullable `composer_id` + `composer_text` on MusicalPiece for traditional/anonymous works; `surtitles_languages` array on EventOpera)*
- [x] `opera` — Le nozze di Figaro, Dutch National Opera, May 2026 *(revealed need for `libretto_language` and `surtitles_languages: string[]` on EventOpera)*
- [x] `opera` (2nd) — The Opera Circus, Opera2Day / Carré Amsterdam, March 2026 *(confirmed opera handles hybrid circus/opera; revival director in notes)*
- [x] `dance` — Oxygen: The Rise, DeLaMar Amsterdam, June 2026 *(revealed need for `music_notes: string` on EventDance)*
- [x] `circus` — Kurios: Cabinet of Curiosities, Cirque du Soleil, Den Haag, December 2025 *(confirmed `circus_tent` venue_type)*
- [x] `circus` (2nd) — Circa: Humans 2.0, Edinburgh Fringe, August 2024 *(confirmed Underbelly venue hierarchy)*
- [x] `theatre / play` — Monstering the Rocketman, Pleasance Dome, Edinburgh Fringe, August 2025 *(confirmed Pleasance venue hierarchy; solo playwright-performer)*
- [x] `theatre / musical` — Hadestown, Carré Amsterdam, September 2025 *(confirmed Production table; alternating cast handled via `data_completeness: partial`)*
- [x] `theatre / improv` — Boom Chicago Improv Spectacular, Amsterdam, December 2025 *(confirmed all creative fields legitimately null)*
- [x] `theatre / improv_musical` — Baby Wants Candy, Assembly George Square, Edinburgh Fringe, August 2024 *(confirmed `improv_musical` subtype; no work/playwright/cast)*
- [x] `spoken_word` — Our Anxious Measurements III, Banshee Labyrinth, Edinburgh Fringe, August 2025 *(no schema gaps; added `spoken_word` to Work.type enum)*
- [x] `talk` — Catherine Bohart: Who Runs the World?, Dynamic Earth, Edinburgh Fringe, August 2023 *(confirmed `podcast_recording` subtype; free BBC ballot tickets → price_paid: 0.00)*
- [x] `exhibition` — Tilda Swinton: Ongoing + permanent collection, Eye Filmmuseum, March 2026 *(confirmed two rows for same-day visit; Museumkaart → price_paid: 0.00 + notes; removed `permanent_collection` from subtype enum — redundant with `permanent_or_temp` field)*
- [x] `screening` — dummy entry *(revealed need for `conductor_id` on EventScreening for live score events)*
- [x] `other` — Flight (Darkfield), Pleasance Dome, Edinburgh Fringe, August 2024 *(confirmed `subtype` free-text handles immersive experiences)*

---

- [x] What's the frontend? → Web app (Astro), mobile browser later
- [x] Will historical events be imported? → Yes, manually, to stress-test schema
- [x] Is this solo-use only? → Solo for now, plus public/shareable view for upcoming events
- [x] How deep to go on `Work` vs `Performance` distinction? → Resolved via `MusicalPiece` and `BalletProgrammeItem` join tables
- [x] `price_paid` convention → Total paid ÷ number of tickets, all fees included, postage excluded. Always actual amount paid — face value irrelevant. Stored with a `currency` ISO code field (GBP, EUR, USD etc.). Free events (BBC ballot, Museumkaart) → `price_paid: 0.00` with explanation in `notes`.
- [x] Which external databases to link to? → MusicBrainz and Setlist.fm via API; OperaBase, Google Maps, exhibition URLs, and recording URLs as plain links only

---

## Core Entities

### `Event`
The attendance record. One row per visit.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `date` | date | Date attended |
| `time` | time | Start time (optional) |
| `venue_id` | fk → Venue | Where it was held |
| `type` | enum | Primary category (see Event Types below) |
| `subtype` | string | Free-text or enum per type (see extension tables) |
| `title` | string | Name of show, exhibition, concert, etc. |
| `work_id` | fk → Work | The piece being performed (optional) |
| `price_paid` | decimal | Total amount you personally paid divided by number of tickets — includes all fees, excludes postage. Always what you actually paid, not face value (resale prices are fine). Free events → 0.00 with explanation in notes. |
| `currency` | string | ISO 4217 currency code e.g. `GBP`, `EUR`, `USD` |
| `rating` | integer | e.g. 1–5 or 1–10 |
| `notes` | text | Personal notes |
| `festival_id` | fk → Festival | Optional — if attended as part of a festival |
| `substack_url` | url | Link to your review (nullable) |
| `data_completeness` | enum | `complete` / `partial` / `stub` — `complete` means all known programme/metadata entered; `partial` means some fields missing; `stub` means date/venue/price only |
| `created_at` | timestamp | Record creation |

---

### `VenueOperator`
A Fringe promoter or venue operator — an organisation that programmes and brands a venue during a festival, distinct from the building itself. Examples: Assembly Festival, Pleasance, Underbelly, PBH Free Fringe, Gilded Balloon. Only relevant when the operator is distinct from the building; when a building programmes itself (e.g. EICC running Venue 150 directly), no operator row is needed.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | string | e.g. "Assembly Festival", "Pleasance", "PBH Free Fringe" |
| `website_url` | url | |
| `wikipedia_url` | url | |

---

### `Venue`
Reusable across events. Supports a building→space hierarchy via `parent_id`, and an optional `operator_id` for Fringe contexts where a promoter programmes a space that isn't their own building.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | string | e.g. "Lomond Theatre", "Royal Festival Hall" |
| `parent_id` | fk → Venue | nullable — the building this space sits within (e.g. Lomond Theatre → EICC) |
| `operator_id` | fk → VenueOperator | nullable — who programmes this space; only set when operator is distinct from the building (e.g. Assembly Festival at George Square) |
| `city` | string | |
| `country` | string | |
| `venue_type` | enum | theatre / concert_hall / arena / gallery / pub / outdoor / circus_tent / other |
| `capacity` | integer | Optional |
| `website_url` | url | |
| `maps_url` | url | Google Maps URL e.g. `https://maps.google.com/?q=Amstel+3,+Amsterdam` — must be a real URL, not a postal address |

*`Event.venue_id` always points to the most specific space — the room you sat in, not the building or operator. Querying "all Assembly shows" means finding all venues where `operator_id = Assembly`, then all events at those venues. Querying "all shows at EICC" means finding EICC and all venues where `parent_id = EICC`.*

*Examples:*
- *Nationale Opera & Ballet, Grote Zaal → two rows: the building (no parent, no operator) and the Grote Zaal room (parent → building)*
- *EICC Lomond Theatre → two rows: EICC (no parent, no operator) and Lomond Theatre (parent → EICC, no operator — EICC programmes itself)*
- *Assembly George Square Studios → three rows: George Square building, Assembly George Square Studios site (parent → building, operator → Assembly Festival), and individual rooms (parent → Studios site)*
- *Pleasance Dome → three rows: Bristo Square (building), Pleasance Dome site (parent → building, operator → Pleasance), individual rooms e.g. Ace Dome (parent → Pleasance Dome)*

---

### `Person`
A unified entity for anyone who appears in event metadata: composer, conductor, playwright, director, performer, comedian, speaker, visual artist, choreographer, circus director, arranger, librettist.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | string | |
| `roles` | array / join table | composer / performer / director / conductor / choreographer / speaker / artist / arranger / librettist / etc. |
| `website_url` | url | |
| `musicbrainz_url` | url | MusicBrainz artist page — primary external identifier, used for API auto-population |
| `notes` | text | |

---

### `Ensemble`
A company, band, orchestra, or troupe — distinct from an individual Person.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | string | e.g. "Scottish Chamber Orchestra", "Biffy Clyro", "NoFit State Circus" |
| `type` | enum | orchestra / band / theatre_company / dance_company / circus_company / choir / other |
| `website_url` | url | |
| `musicbrainz_url` | url | MusicBrainz artist page — primary external identifier, used for API auto-population |
| `notes` | text | |

---

### `Festival`
A named festival or multi-event context that groups individual events together. One row per edition (e.g. Fringe 2024 and Fringe 2025 are separate rows).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | string | e.g. "Edinburgh Fringe", "Opera Forward Festival" |
| `edition` | string | e.g. "2025" — separate from year so non-annual festivals work too |
| `start_date` | date | |
| `end_date` | date | |
| `city` | string | |
| `website_url` | url | |
| `notes` | text | |

*Events link to Festival via `festival_id` on the `Event` table — nullable, so non-festival events are unaffected. Each show/performance you attended is still its own `Event` row; the festival just groups them.*

---

### `MusicalPiece`
A specific musical composition or movement — distinct from a `Work` (which is a ballet, opera, or other performed piece). Lets you track "every event where I heard Mahler's Symphony No. 5, Adagietto" across all event types.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `title` | string | e.g. "Symphony No. 5 in C-sharp minor" |
| `movement` | string | e.g. "IV. Adagietto" — nullable for whole works |
| `composer_id` | fk → Person | **Nullable** — null when composer is traditional or anonymous |
| `composer_text` | string | **Nullable** — free-text attribution when no Person row exists, e.g. "trad. Gregorian", "trad. American", "Alt-J (arr. Davin Curtis)". Exactly one of `composer_id` or `composer_text` should be set; both null only when genuinely unknown. |
| `arranger_id` | fk → Person | Nullable — only set when this is an arrangement (e.g. Heifetz arr. of Gershwin) |
| `original_work_id` | fk → MusicalPiece | Nullable — points to the source piece when this is an arrangement |
| `year` | integer | Year of composition or arrangement (optional) |
| `catalogue_number` | string | e.g. "Op. 47", "BWV 565" (optional) |
| `musicbrainz_url` | url | |
| `notes` | text | |

*A single `MusicalPiece` row represents the composition itself, not any particular performance of it. Multiple `BalletProgrammeItem` or `ClassicalProgrammeItem` rows can reference the same piece, enabling queries like "all events where I heard this piece". For arrangements, `original_work_id` links back to the source — so "Bess, you is my woman now (arr. Heifetz)" points to the original Gershwin, letting you query either the arrangement or the original across all events.*

*Convention for `movement`: one row per movement when the programme specifies movements (e.g. Mahler Symphony No. 1, III. Funeral March gets its own row). When no movement is specified — either because the whole work was performed, or because movement-level detail is unknown — use a single row with `movement = null`. These two cases are not distinguished in the schema; use `notes` if the distinction matters.*

*Convention for `composer_id` vs `composer_text`: use `composer_id` when the composer is a known person with (or who could have) a Person row. Use `composer_text` for traditional/folk/anonymous works, or when the "composer" is a band or ensemble that doesn't fit in the Person table (e.g. Alt-J). Never set both.*

---

### `Work`
The piece being performed or exhibited — separate from any individual performance of it. Lets you track "every time I've seen Hamlet" or "every time I've heard Symphony No. 5".

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `title` | string | e.g. "Hamlet", "Symphony No. 5", "OK Computer" |
| `type` | enum | play / opera / symphony / ballet / album / poem / film / circus_show / dance_show / spoken_word / musical / other |
| `creator_id` | fk → Person | Primary creator (playwright, composer, etc.) |
| `year` | integer | Year of composition / publication |
| `musicbrainz_url` | url | For musical works |
| `notes` | text | |

---

### `Production` / `Run` *(optional — add later)*
Links multiple performances of the same show in the same run (e.g. a West End production of a musical). Sits between `Work` and `Event`.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `work_id` | fk → Work | |
| `title` | string | Production name / year, e.g. "NT Hamlet 2024" |
| `director_id` | fk → Person | |
| `start_date` | date | |
| `end_date` | date | |
| `notes` | text | |

---

## Event Types

Top-level enum — one per event:

| Type | Examples |
|---|---|
| `music` | Gigs, bands, artists, open mic |
| `classical` | Orchestra, chamber music, string groups, lunch concerts, choral |
| `opera` | Opera (standalone due to distinct metadata) |
| `ballet` | Ballet (standalone due to distinct metadata) |
| `dance` | Contemporary, flamenco, folk dance, other non-ballet |
| `circus` | Circus acts, Fringe circus, large-scale productions |
| `theatre` | Plays, musicals, improv, panto, physical theatre, puppet |
| `cabaret` | Burlesque, drag shows, cabaret nights, variety evenings |
| `comedy` | Standup, sketch, panel, character comedy |
| `spoken_word` | Poetry, slam, storytelling, spoken word |
| `talk` | Lectures, debates, panels, science comm, podcast recordings, book events |
| `exhibition` | Museums, galleries, permanent and temporary |
| `screening` | Film, NT Live, Bolshoi broadcasts, live score events |
| `other` | Anything that doesn't fit — requires `subtype` free-text |

*`other` must always have a `subtype` value — no empty catch-all records.*

---

## Type-Specific Extension Tables

Base `Event` links to one extension table depending on `type`. All have `event_id` as primary key / foreign key.

---

### `EventMusic` *(gigs, bands, open mic)*
| Field | Notes |
|---|---|
| `subtype` | enum: `gig` / `open_mic` / `residency` / `other` |
| `headliner_id` | fk → Ensemble or Person |
| `support_acts` | array of Ensemble / Person ids |
| `tour_name` | string |
| `setlist` | JSON array of song titles |
| `setlist_fm_url` | url |

---

### `EventClassical` *(orchestra, chamber, lunch concerts, choral)*
| Field | Notes |
|---|---|
| `subtype` | enum: `orchestral` / `chamber` / `choral` / `recital` / `contemporary` / `other` |
| `ensemble_id` | fk → Ensemble |
| `conductor_id` | fk → Person |
| `notes_on_performance` | text |

*`soloists` removed from event level — soloists belong on `ClassicalProgrammeItem` since different pieces have different soloists. `programme[]` is replaced by the `ClassicalProgrammeItem` join table below.*

---

### `ClassicalProgrammeItem`
One row per piece in an `EventClassical` programme.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `event_id` | fk → Event | |
| `musical_piece_id` | fk → MusicalPiece | |
| `soloists` | array of Person ids | Soloists for this specific piece — nullable |
| `order` | integer | Running order on the night |
| `notes` | text | e.g. "world premiere", "directing from the violin" |

---

### `EventOpera`
| Field | Notes |
|---|---|
| `subtype` | enum: `opera` / `operetta` / `musical_theatre` / `other` |
| `work_id` | fk → Work |
| `production_id` | fk → Production |
| `conductor_id` | fk → Person |
| `director_id` | fk → Person |
| `cast` | JSON: role → Person id |
| `ensemble_id` | fk → Ensemble (the opera company or orchestra) |
| `libretto_language` | string | Language the opera is sung in, e.g. "Italian", "German", "French" |
| `surtitles_languages` | string[] | Languages shown as surtitles, e.g. ["Dutch", "English"] — array since dual surtitles are common |
| `operabase_url` | url |

---

### `EventBallet`
| Field | Notes |
|---|---|
| `subtype` | enum: `full_length` / `mixed_bill` / `contemporary` / `other` |
| `work_id` | fk → Work (nullable for mixed bills — use `BalletProgrammeItem` instead) |
| `production_id` | fk → Production |
| `company_id` | fk → Ensemble (the ballet company) |
| `orchestra_id` | fk → Ensemble (the performing orchestra — distinct from the company) |
| `conductor_id` | fk → Person |
| `cast` | JSON: role → Person id |

*`choreographer_id` is intentionally absent — choreographer lives on `BalletProgrammeItem`, since mixed bills have one choreographer per piece. For single-work events, there will be one programme item.*

*`programme[]` is replaced by the `BalletProgrammeItem` join table below.*

---

### `BalletProgrammeItem`
One row per piece in an `EventBallet` programme. Replaces the old `programme[]` JSON array and resolves the multiple-choreographers-per-event problem.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `event_id` | fk → Event | |
| `work_id` | fk → Work | The ballet being performed |
| `choreographer_id` | fk → Person | Choreographer of this specific piece |
| `soloists` | array of Person ids | Musical soloists for this specific piece (e.g. violin soloist in Refraction) — nullable |
| `order` | integer | Running order on the night |

---

### `BalletProgrammeMusic`
Links each `BalletProgrammeItem` to the musical pieces used for it. One row per piece of music per programme item — supports multiple movements or works per ballet.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `programme_item_id` | fk → BalletProgrammeItem | |
| `musical_piece_id` | fk → MusicalPiece | |
| `order` | integer | Order within this programme item (if multiple pieces) |

---

### `EventDance` *(contemporary, flamenco, folk, other non-ballet)*
| Field | Notes |
|---|---|
| `subtype` | enum: `contemporary` / `flamenco` / `folk` / `ballroom` / `other` |
| `company_id` | fk → Ensemble |
| `choreographer_id` | fk → Person |
| `work_id` | fk → Work (optional) |
| `programme` | JSON array of Work ids (for mixed bills) |
| `music_notes` | string — nullable; free-text music credits when no structured programme exists, e.g. "Music by Subp Yao; includes works by Ludovico Einaudi" |

---

### `EventCircus`
| Field | Notes |
|---|---|
| `subtype` | enum: `contemporary_circus` / `traditional` / `physical_theatre` / `aerial` / `street` / `other` |
| `company_id` | fk → Ensemble |
| `director_id` | fk → Person |
| `work_id` | fk → Work (optional — some shows have a named piece) |

*`fringe_venue` removed — the building→space→operator hierarchy on `Venue` handles this for all event types. Point `Event.venue_id` at the specific room.*

---

### `EventTheatre` *(play, musical, improv, panto, puppet)*
| Field | Notes |
|---|---|
| `subtype` | enum: `play` / `musical` / `improv` / `improv_musical` / `panto` / `physical_theatre` / `puppet` / `other` |
| `work_id` | fk → Work (nullable for improv) |
| `production_id` | fk → Production |
| `company_id` | fk → Ensemble |
| `director_id` | fk → Person |
| `cast` | JSON: role → Person id (nullable for improv) |
| `playwright_id` | fk → Person (nullable for improv) |

---

### `EventCabaret` *(burlesque, drag shows, cabaret nights, variety)*
| Field | Notes |
|---|---|
| `subtype` | enum: `burlesque` / `drag` / `cabaret` / `variety` / `other` |
| `headliner_id` | fk → Person (the named star — nullable for ensemble-led shows) |
| `host_id` | fk → Person (compère / host) |
| `supporting_cast` | array of Person ids (other performers on the bill) |
| `ensemble_id` | fk → Ensemble (if a company or touring production rather than individual headliner) |
| `tour_name` | string |
| `work_id` | fk → Work (nullable — only if the show has a distinct named work) |

---

### `EventComedy`
| Field | Notes |
|---|---|
| `subtype` | enum: `standup` / `sketch` / `double_act` / `panel` / `character` / `musical_comedy` / `other` |
| `performer_id` | fk → Person (headliner) |
| `support_acts` | array of Person ids |
| `ensemble_id` | fk → Ensemble (for sketch groups) |
| `tour_name` | string |

---

### `EventSpokenWord` *(poetry, slam, storytelling)*
| Field | Notes |
|---|---|
| `subtype` | enum: `reading` / `slam` / `spoken_word` / `storytelling` / `other` |
| `performers` | array of Person ids |
| `works_read` | array of Work ids (optional) |
| `host_id` | fk → Person (MC / host) |

---

### `EventTalk` *(lectures, panels, debates, podcast recordings, book events)*
| Field | Notes |
|---|---|
| `subtype` | enum: `lecture` / `panel` / `debate` / `podcast_recording` / `book_event` / `science_comm` / `interview` / `other` |
| `speaker_ids` | array of Person ids |
| `host_id` | fk → Person (chair / interviewer) |
| `topic` | string |
| `host_organisation` | string |
| `recording_url` | url (if published afterwards) |

---

### `EventExhibition` *(museums, galleries)*
| Field | Notes |
|---|---|
| `subtype` | enum: `art` / `natural_history` / `science` / `photography` / `sculpture` / `design` / `historical` / `other` |
| `exhibition_title` | string (if temporary — may differ from Event title) |
| `artists` | array of Person ids |
| `period` | string e.g. "Impressionism", "1920s–1940s" |
| `medium` | string e.g. "oil on canvas", "mixed media" |
| `curator_id` | fk → Person |
| `permanent_or_temp` | enum: `permanent` / `temporary` / `touring` |
| `exhibition_url` | url |

*`permanent_collection` removed from subtype enum — redundant with `permanent_or_temp: permanent`. Use the appropriate medium/content subtype (e.g. `art`, `science`) combined with `permanent_or_temp: permanent` instead.*

---

### `EventScreening` *(film, NT Live, Bolshoi broadcast, live score)*
| Field | Notes |
|---|---|
| `subtype` | enum: `film` / `live_broadcast` / `archive_screening` / `live_score` / `documentary` / `other` |
| `work_id` | fk → Work (the film or production) |
| `director_id` | fk → Person |
| `conductor_id` | fk → Person (nullable — for live score events where an orchestra performs the soundtrack) |
| `ensemble_id` | fk → Ensemble (for live score events — the performing orchestra) |
| `series` | string e.g. "NT Live", "Bolshoi at the Cinema" |

---

## External Links

Two services are integrated via API. Everything else is a URL stored as a plain link field — no API integration needed.

| Service | Integration | Use case | Where it lives |
|---|---|---|---|
| **MusicBrainz** | ✅ API | Auto-populate `Person`, `Ensemble`, `Work`, `MusicalPiece` metadata | `musicbrainz_url` on Person, Ensemble, Work, MusicalPiece |
| **Setlist.fm** | ✅ API | Auto-fetch gig setlists | `setlist_fm_url` on EventMusic |
| Substack | link only | Your own reviews — highest priority field | `substack_url` on Event |
| Google Maps | link only | Venue location | `maps_url` on Venue |
| OperaBase | link only | Opera production reference | `operabase_url` on EventOpera |
| exhibition sites | link only | Exhibition reference pages | `exhibition_url` on EventExhibition |
| recording urls | link only | Published recordings of talks | `recording_url` on EventTalk |

---

## Notes on Design Decisions

**Why extension tables rather than one big table?**
Each event type has genuinely different metadata. A setlist field on a ballet event is meaningless. Extension tables keep data clean and make it obvious what's recorded for each type.

**Why no `person_id` on the `Event` table directly?**
Because the relationship is too varied by type. A gig has a headliner and support acts. A ballet has choreographer, conductor, and a named cast. An opera has director, conductor, and ten singers in specific roles. A single `person_id` field couldn't capture any of that. Instead, Person connects to Event *through* the type-specific extension table — `EventBallet.choreographer_id`, `EventOpera.cast{}`, etc. The tradeoff is that querying "everything involving person X" requires searching across extension tables, but this is manageable.

**Why a unified `Person` entity?**
A composer, a conductor, a comedian, and a playwright are all people. Unifying them lets you ask "everything I've seen involving X" across all event types.

**Why a separate `Ensemble` entity?**
Bands, orchestras, theatre companies, and circus troupes are not people. They have their own identity, lifespan, and links. Conflating them with Person creates confusion.

**Why `MusicalPiece` is separate from `Work`?**
A `Work` is a ballet, opera, or theatrical piece — the thing being *performed*. A `MusicalPiece` is a musical composition — the thing being *played*. They're different entities that happen to appear together. *Solitude* (a ballet) uses Mahler's Symphony No. 1, III. Funeral March and Symphony No. 5, IV. Adagietto. Both the ballet and the Mahler movements are worth tracking independently: you want to know every time you've seen *Solitude*, and separately, every time you've heard the Adagietto. Conflating them into one table would make both queries awkward.

**Why separate `Work` from `Event`?**
A `Work` is *Hamlet*. An `Event` is *seeing Hamlet on 14 March 2024 at the Donmar*. Separating them lets you track repeat encounters with the same piece over time.

**Why `BalletProgrammeItem` and `BalletProgrammeMusic` instead of JSON arrays?**
The old `programme[]` JSON array and single `choreographer_id` field couldn't handle mixed bills where each piece has its own choreographer and its own music. A join table lets you query "all events featuring choreography by Ratmansky" or "all events where I heard Philip Glass's Violin Concerto No. 1" trivially. JSON arrays can't be queried this way without application-level logic across every row.

**Why separate `VenueOperator` from `Venue`?**
At the Edinburgh Fringe, the organisation that programmes a space (Assembly Festival, Pleasance, Underbelly) is often distinct from the building they occupy. Assembly doesn't own George Square — they lease it and brand it each August. Tracking this separately lets you query "all Assembly shows" independently of "all shows at George Square". When a building programmes itself (EICC running its own Fringe venue), `operator_id` is simply null. The `parent_id` self-reference on `Venue` handles the building→room hierarchy, while `operator_id` handles the branding/programming layer on top.

**Why does `Event.venue_id` point to the most specific space?**
You want to know which room you were in, not just which building. Querying at higher levels (all shows at EICC, all Assembly shows) is possible by walking the `parent_id` chain or filtering on `operator_id`. Going specific-to-general is easy; going general-to-specific from a coarse venue field is not.

**Why `arranger_id` and `original_work_id` on `MusicalPiece`?**
Arrangements are common in classical and chamber music — Heifetz arranging Gershwin, Mahler orchestrating Schubert, etc. The arrangement and the original are distinct things: you might want to query "all times I heard the Heifetz arrangement" separately from "all times I heard any version of Bess, you is my woman now". `original_work_id` is a self-referencing FK on `MusicalPiece` that lets you walk from arrangement to source. Both are nullable — most pieces are not arrangements.

**Why nullable `composer_id` and a `composer_text` field on `MusicalPiece`?**
Traditional and folk music has no named composer — Gregorian plainchant, American spirituals, Bulgarian folk songs. Rather than a dummy "Anonymous" Person row or forcing a FK that doesn't exist, `composer_id` is nullable and `composer_text` holds free-text attribution (e.g. "trad. Gregorian", "trad. Bulgarian arr. Le Mystère des Voix Bulgares"). Also handles cases where the "composer" is a band or ensemble that doesn't fit in the Person table (e.g. "Alt-J (arr. Davin Curtis)"). Convention: exactly one of `composer_id` or `composer_text` should be set.

**Why `data_completeness` on `Event`?**
Historical events often can't be fully documented after the fact — websites archive poorly, programmes get lost. Rather than leaving gaps silently, `data_completeness` makes incompleteness explicit and queryable. `stub` = date/venue/price only; `partial` = some metadata missing; `complete` = everything known is entered. This lets you filter for records to improve later without polluting complete records with uncertainty signals.

**Why `libretto_language` and `surtitles_languages` as separate fields on `EventOpera`?**
The language sung and the language displayed are independent: an Italian opera may show Dutch and English surtitles. `surtitles_languages` is an array because dual surtitles are standard at Dutch National Opera and similar venues.

**Why `music_notes` on `EventDance` instead of a join table?**
Dance music credits are often a single composer or curator rather than a tracklist. A free-text field captures "Music by Subp Yao; includes works by Ludovico Einaudi" without requiring a full `DanceProgrammeMusic` join table. If dance events with detailed programme music become common, a join table can be added later.

**Why `conductor_id` on `EventScreening`?**
Live score events (film screened with a live orchestra) have a conductor. Without this field, there's nowhere to record who conducted the performance. Nullable — not relevant for standard film screenings.

**Why `permanent_collection` removed from `EventExhibition.subtype`?**
Redundant with the `permanent_or_temp` field, which already distinguishes permanent from temporary exhibitions. Use the appropriate content subtype (e.g. `art`, `science`) combined with `permanent_or_temp: permanent`.

**Why is `other` required to have a subtype?**
To prevent a growing pile of uncategorised records. If something doesn't fit, you should at least name what it is in free text.

**Why does `price_paid` use 0.00 for free events rather than null?**
Null is ambiguous — it could mean free, unknown, or not yet entered. 0.00 is unambiguous: you paid nothing. The reason (free ballot, Museumkaart, PBH Free Fringe bucket) goes in `notes`.

**Why is `circus` its own event type rather than a subtype of `other`?**
Circus has distinct metadata (company, director, aerial/physical style) and is attended frequently enough (especially at the Fringe) to warrant its own slot rather than being buried under `other`.
