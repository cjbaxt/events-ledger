# Events Ledger — New Chat Handoff
*App built and running. Ready for data import. June 2026.*

---

## What this project is

A personal web app to log every cultural event Claire attends — gigs, opera, ballet, theatre, comedy, exhibitions, talks, circus, and more — with rich metadata, personal half-star ratings, Substack review links, and a public view for upcoming events.

**Stack:** FastAPI + SQLModel + PostgreSQL + Astro v6 + React + Tailwind CSS.

**Repo:** https://github.com/cjbaxt/events-ledger (branch: `main`)

---

## Current status

**The app is built and running with 24 seed events.** All core features are working:

- Timeline view grouped by year/month, with event type filter and half-star ratings
- Event detail slide-in panel: venue hierarchy, festival, extension fields (cast, programme, composers, etc.)
- Click-through navigation: person → all their events; venue → all events there; ensemble → all their events
- "Also visited" links between related same-day events
- CRUD API for all event types and reference entities

**Next step: import real events.** The 24 seed events were stress tests. Ready to start adding the full back-catalogue.

---

## How to run

```bash
# Backend (from /backend)
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Frontend (from /frontend)
npm run dev
```

Backend runs on :8000, frontend on :4321.

---

## Where the data lives

**Database:** PostgreSQL, local (`events_ledger` database). Not on GitHub.

**Seed script (source of truth for the 24 test events):** `backend/seed/seed.py` — this IS on GitHub. It contains all reference entities (venues, persons, ensembles, works, musical pieces) and all 24 events as Python code using deterministic UUIDs.

**To reseed from scratch:**
```bash
cd backend && source .venv/bin/activate
psql -c "DROP DATABASE IF EXISTS events_ledger; CREATE DATABASE events_ledger;"
alembic upgrade head
python3 seed/seed.py
```

**For new events going forward:** Use the POST API endpoints (see below). The seed script only needs updating if you want the test events to survive a full reseed.

---

## API endpoints (all at localhost:8000)

### Events
- `GET /api/events` — list (params: `status`, `type`, `q`, `limit`, `offset`)
- `GET /api/events/{id}` — full detail with extension, venue path, related events
- `POST /api/events/{type}` — create (e.g. `/api/events/opera`, `/api/events/classical`)
- `PATCH /api/events/{id}` — update base fields (including `rating`)
- `DELETE /api/events/{id}`

### Reference entities (persons, venues, ensembles, works, musical-pieces, festivals, productions)
- `GET /api/persons`, `GET /api/persons/{id}`, `POST /api/persons`, `PATCH /api/persons/{id}`
- `GET /api/persons/{id}/events` — all events referencing this person
- `GET /api/venues/{id}/events` — all events at this venue (including child spaces)
- `GET /api/ensembles/{id}/events` — all events with this ensemble
- Same pattern for ensembles, venues, works, musical-pieces, festivals, productions

### Docs
Interactive docs at `http://localhost:8000/docs`

---

## Data model files

1. **events-ledger-schema.md** — full data model (keep this as source of truth)
2. **events-ledger-data-entries.md** — the 24 stress test events in table form

---

## Key schema decisions (do not change without flagging)

**Event types:** music · classical · opera · ballet · dance · circus · theatre · cabaret · comedy · spoken_word · talk · exhibition · screening · other

**`cabaret` is its own type** (not theatre subtype). Theatre/improv stays under `theatre`.

**`price_paid` convention:** total paid ÷ tickets, all fees included, postage excluded. Free events → `price_paid: 0.00` with reason in `notes`.

**`data_completeness`:** `complete` / `partial` / `stub`

**`status`:** `attended` / `planned` / `cancelled`

**`rating`:** float, 0.5–5.0 (half-star precision). Null = unrated.

**Venue hierarchy:** `Venue.parent_id` (self-referencing, e.g. Grote Zaal → Nationale Opera & Ballet). `Event.venue_id` always points to the most specific space. API returns `venue_path[]` as full ancestor chain.

**Person connects through extension tables only** — no `person_id` on `Event` directly.

**MusicalPiece vs Work:** `Work` = a ballet/opera/play as an artistic whole. `MusicalPiece` = a musical composition. They're separate.

**Classical programme:** soloists live on `ClassicalProgrammeItem` (per piece), not at event level.

**Ballet programme:** `BalletProgrammeItem` per piece, `BalletProgrammeMusic` links each item to MusicalPiece rows.

**Opera `composers[]`:** ARRAY of person UUIDs for pasticcios/arrangements where multiple composers contributed.

**`related_event_ids`:** ARRAY on Event for same-day visits to multiple exhibitions etc.

---

## Schema changes made during build (vs original design)

| Change | Reason |
|--------|--------|
| `Event.status` added (`attended`/`planned`/`cancelled`) | Needed for upcoming events view |
| `Event.rating` changed from INT to FLOAT | Half-star ratings |
| `Event.related_event_ids UUID[]` added | Link same-day exhibition visits |
| `EventOpera.composers UUID[]` added | Pasticcios (e.g. Opera Circus — Handel) |
| Venue API returns `venue_path[]` not single `venue_parent` | 3-level venue hierarchies (e.g. Underground → Assembly GS → George Square) |

---

## Things still to build

- [ ] Stats page (currently a placeholder)
- [ ] Upcoming events view (currently a placeholder)
- [ ] MusicBrainz API integration — auto-populate Person/Ensemble/MusicalPiece metadata
- [ ] Setlist.fm API integration — auto-fetch gig setlists
- [ ] Public/shareable view for upcoming events
- [ ] Add event UI (currently `+ Add event` button is a placeholder)
- [ ] Search across all events
- [ ] Export / backup

---

## How to add new events

**Option 1 — API (recommended for a new chat):**
1. Create any needed reference entities first (person, venue, ensemble, work, etc.) via POST
2. POST to `/api/events/{type}` with the full payload
3. See `http://localhost:8000/docs` for exact schema per type

**Option 2 — Seed script:**
Edit `backend/seed/seed.py` and reseed. Use this if rebuilding from scratch; avoid for incremental additions as it drops all data.

**UUID convention in seed:** `uuid.uuid5(NS, "slug")` where `NS = uuid.UUID("12345678-1234-5678-1234-567812345678")`. Person slugs: `per-001`, `per-002`…; venues: `venue-001`…; events: `evt-001`…

---

## Frontend components

| File | Purpose |
|------|---------|
| `frontend/src/components/Timeline.tsx` | Main timeline — year/month grouping, type filter, star rating |
| `frontend/src/components/EventDetailPanel.tsx` | Slide-in detail panel — all event info, venue path, related events, click-through nav |
| `frontend/src/components/EventTypeIcon.tsx` | Icon per event type |
| `frontend/src/components/Nav.tsx` | Top nav bar |
| `frontend/src/lib/api.ts` | All API fetch functions |
| `frontend/src/types/events.ts` | TypeScript types |
