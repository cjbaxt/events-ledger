# Events Ledger — Technical Review

A personal live-performance archive. 178+ events spanning contemporary circus, ballet, opera, comedy, music, theatre, cabaret, exhibitions, talks, and more. This document is written for a machine learning engineer reviewing the system architecture, deployment model, and engineering decisions — with an honest look at what is impressive, what has gaps, what would need to change to survive production, and where it could go next.

---

## What Was Actually Built

This is not a simple CRUD app. It is a **dual-mode application** — the same frontend codebase runs as a live API-connected editing environment (localhost) and as a completely static pre-rendered site (GitHub Pages), with the mode controlled at build time via a single environment variable (`PUBLIC_STATIC_DATA=true`). That architectural decision alone is non-trivial.

### Stack

| Layer | Technology | Notes |
|---|---|---|
| Database | PostgreSQL 16 (local only) | JSONB, UUID primary keys, `ARRAY(UUID)`, `ARRAY(String)`, `Time` column |
| ORM | SQLModel + SQLAlchemy | SQLModel wraps SQLAlchemy 2.x with Pydantic v2 integration |
| API | FastAPI 0.11x | Async-capable, OpenAPI docs auto-generated |
| Migrations | Alembic | 14 migrations from schema inception to present |
| Serialisation | Pydantic v2 | `model_dump(exclude_unset=True)` for partial updates |
| Frontend | Astro v6 + React 19 | Islands architecture — React components only where interactivity needed |
| Styling | Tailwind CSS v4 (Vite plugin) | No config file — CSS-first config |
| Deployment | GitHub Pages via GitHub Actions | Static site, no server, no cost |
| CI/CD | `.github/workflows/deploy.yml` | Triggered on push to `main`; builds with `PUBLIC_STATIC_DATA=true` |
| Publish pipeline | `publish.sh` + `/api/publish` | Shell script; streamed to browser via `StreamingResponse` |
| Custom domain | Cloudflare DNS → GitHub Pages | 4 A records + CNAME; HTTPS enforced by GitHub Pages |

---

## Schema Design — What Is Genuinely Impressive

The data model solves a hard problem: **a single event entity that needs to carry radically different metadata depending on its type** (a music gig and a ballet are both "events" but share almost no fields beyond date, venue, and title).

The solution used is **typed extension tables** — a 1:1 relationship from `event` to a type-specific table, where `event_id` is both the primary key and the foreign key:

```sql
-- Event base
event (id, date, time, venue_id, type, title, rating, ...)

-- Extension — only one exists per event, keyed to same id
event_music    (event_id PK FK → event, headliner_person_id, support_act_person_ids UUID[], ...)
event_ballet   (event_id PK FK → event, company_id, work_id, cast JSONB, ...)
event_comedy   (event_id PK FK → event, performer_id, support_acts UUID[], ...)
-- ... 13 more extension tables
```

This is a textbook **table-per-type inheritance pattern**, implemented cleanly without a discriminator column hack. SQLModel/SQLAlchemy doesn't enforce this pattern — it was designed manually and is structurally sound.

Array columns (`ARRAY(UUID)`) are used for multi-valued relationships (support acts, soloists, composers) rather than join tables, which is a deliberate PostgreSQL-specific optimisation that trades normalisation for query simplicity. It's defensible for a personal archive where cardinality is predictable and referential integrity on the array elements is not critical.

The `EventListItem` (lightweight, for timeline/search) vs `EventDetail` (full, with resolved extension) split is correct and important for performance — the list view never fetches extension data.

### The `_build_extension` function is genuinely complex

The `get_event` handler in `events.py` resolves all 13 extension types, crosses-joins back to `Person` and `Ensemble` tables to resolve UUIDs to names, handles arrays of UUIDs by doing in-Python lookups, and assembles a nested `extension: dict` on the response. It also builds `venue_path` (hierarchical venue ancestry) by recursively walking `venue.parent_id`. None of this is boilerplate — it's hand-authored relational resolution.

### Person lookups across 13 extension tables

`get_person_events` in `reference.py` finds all events referencing a given person by scanning every extension table that might hold a person UUID, using raw `text()` SQL with `ANY(array_column)` syntax:

```python
def by_array(table: str, column: str) -> None:
    rows = session.execute(
        text(f"SELECT event_id FROM {table} WHERE cast(:pid AS uuid) = ANY({column})"),
        {"pid": pid_str},
    ).all()
```

This covers FKs, ARRAY columns, JSONB cast fields, and work creator relationships. It is thorough and correct, and also fragile if a new extension table is added without updating the function — a known limitation.

---

## The Dual-Mode Architecture

This is the most architecturally interesting decision in the project.

### How it works

`api.ts` checks `STATIC` (a build-time constant):

```typescript
export const STATIC = import.meta.env.PUBLIC_STATIC_DATA === "true";

export async function fetchEvent(id: string): Promise<EventDetail> {
  if (STATIC) return staticFetch<EventDetail>(`/data/events/${id}.json`);
  const res = await authFetch(`${BASE}/api/events/${id}`);
  ...
}
```

In static mode, every API call hits a pre-rendered JSON file in `frontend/public/data/`. In live mode, it proxies to `http://localhost:8010`.

The `dump_to_json.py` script is the bridge. It directly calls the same FastAPI route handler functions (not the HTTP endpoints) by importing them and passing a live SQLAlchemy session. This means:

- The same serialisation logic is used in both modes
- No HTTP round-trips during the dump
- The static JSON faithfully mirrors what the live API would return

This is smart. Most projects dump raw SQL query results to JSON and manually format them, then end up with drift between the API response shape and the static shape. Here they are provably identical.

### Astro Islands architecture

The Astro framework renders HTML at build time; React components only hydrate where `client:load` or `client:visible` directives are used. The event timeline, search, stats, and detail panel are all React components that run client-side. The page shell (nav, layout) is static HTML. This gives very fast initial page loads on the static site.

---

## The Streaming Publish Pipeline — Technical Detail

When the user clicks "Publish" in the browser, this is what happens:

1. **Browser → FastAPI**: `POST /api/publish` (HTTP, same machine)
2. **FastAPI**: `StreamingResponse` wraps a generator that calls `subprocess.Popen(["bash", "publish.sh"], stdout=subprocess.PIPE)`
3. **`publish.sh`**: Activates the Python venv, runs `dump_to_json.py`, stages `frontend/public/data/`, commits, and pushes to `origin main`
4. **`publish.sh` (continued)**: Uses the `gh` CLI to poll the GitHub Actions run status every 10 seconds, writing progress to stdout
5. **FastAPI generator**: Yields each line from `proc.stdout` as it arrives — this is **line-buffered streaming over HTTP/1.1**
6. **Browser**: Reads the response body incrementally using the Streams API (`response.body.getReader()`) and appends each decoded chunk to the log panel

The streaming mechanism is **HTTP chunked transfer encoding** (HTTP/1.1) or **Server-Sent Events** (SSE) without the formal SSE framing — it's `text/plain` with incremental flush. The browser reads via `ReadableStream.getReader()`, which is the same API used for SSE and LLM token streaming. It is not WebSockets; it is a long-lived HTTP response where the server holds the connection open and flushes line by line.

**What makes this non-trivial:** The `subprocess.Popen` call runs a shell script that itself runs `git push` and polls a remote CI API. The FastAPI generator is a Python generator function — `yield` suspends execution between lines. Because FastAPI runs on Uvicorn (ASGI), this works without blocking the event loop *only because* `StreamingResponse` runs the generator in a threadpool by default when the generator is synchronous. If this were an `async def` generator it would block unless the subprocess was managed with `asyncio.create_subprocess_exec`.

---

## The Editor Auth Model

A passphrase is hardcoded in `editor.ts` and stored in `localStorage`. This is **intentional security by obscurity** for a personal tool — there is no server-side auth, the passphrase is in the client bundle, and `localStorage` is readable by any JS on the page. The API itself has no auth middleware; any HTTP client can POST to `http://localhost:8010/api/events`. 

This is acceptable because:
- The API only runs on localhost, never exposed to the internet
- The static public site has no write capability (`STATIC` mode returns early on all mutations)
- The passphrase gates the editor UI, not the data

It is not acceptable if the API were ever deployed publicly.

---

## What Would Need to Change for a Proper Deployment

### Authentication and Authorisation
- Replace the localStorage passphrase with a proper session-based auth mechanism. Minimum viable: HTTP Basic Auth on the FastAPI app with a real secret managed via environment variable; better: OAuth2 with PKCE (Authlib library), or a short-lived JWT issued at login.
- Add auth middleware to FastAPI so every write endpoint (POST/PATCH/DELETE) requires a valid session. FastAPI's `Depends()` system makes this straightforward.
- Never ship a hardcoded passphrase in a deployed codebase.

### Secrets Management
- `.env` files are gitignored but `.env.secrets` is in the repo root (also gitignored, but the naming suggests ad-hoc management). Proper deployments should use environment variables injected at runtime — AWS Secrets Manager, GCP Secret Manager, Doppler, or at minimum Render/Railway environment variable panels.
- The `gh` CLI token used in `publish.sh` depends on the developer's local `gh auth login` state. A CI/CD version would need a `GH_TOKEN` secret injected as an environment variable.

### Database
- The database is local PostgreSQL, never deployed. For a production deployment you would need a managed Postgres (Render Postgres, Supabase, Neon, Railway, etc.) with connection pooling (PgBouncer or Supabase's built-in) and automatic backups.
- The current backup story is `bash scripts/export_db.sh` which runs `pg_dump` — fine for a personal archive, not for production.
- The SQLModel/SQLAlchemy engine is created with `echo=False` and no pool configuration. For production you'd set `pool_size`, `max_overflow`, and `pool_pre_ping=True`.

### API Hardening
- CORS is set from an environment variable (`CORS_ORIGINS`), which is correct. In production you would also want:
  - Rate limiting (e.g. `slowapi`)
  - Request size limits
  - Input validation beyond Pydantic (e.g. sanitise free-text fields against stored XSS)
  - HTTPS enforced (Uvicorn behind an Nginx or Caddy reverse proxy with TLS termination)
- The `/api/publish` endpoint runs an **arbitrary shell script as the process user**. This is a remote code execution risk if the API were ever publicly accessible. It must be auth-gated.
- The setlist scraper (`setlist.py`) makes outbound HTTP requests with `urllib` and no timeout configuration beyond a hardcoded 10s. In production: use `httpx` with full timeout config, respect `robots.txt`, and consider rate limiting outbound requests.

### The `publish.sh` subprocess problem
The `subprocess.Popen` call in `publish.py` runs `bash publish.sh` from the repo root. This assumes the FastAPI process is running inside the repo directory, the venv is at `backend/.venv`, `git` is on the PATH, and `gh` CLI is authenticated. None of these are guaranteed in a container deployment. A production version would decompose publish into discrete API steps: dump to object storage, trigger a GitHub workflow dispatch API call, and poll the run status via the GitHub API — not by running a shell script.

---

## What Would Need to Change to Pass a Penetration Test

### High priority
- **Unauthenticated write API**: Every create/update/delete endpoint is accessible to any HTTP client that can reach port 8010. In a deployment where the API is not localhost-only, this is a critical finding.
- **Hardcoded passphrase in client bundle**: `"tinfoil"` is compiled into the JavaScript bundle and will appear in source maps. Auditors will flag this immediately.
- **No CSRF protection**: The FastAPI API has no CSRF token validation. In a browser context with cookies, this would be exploitable. Currently not an issue because there are no cookies and the API is localhost-only.
- **Subprocess execution via API endpoint**: `POST /api/publish` runs `bash publish.sh`. If auth were added but poorly implemented, this is a path to command injection.

### Medium priority
- **No input length limits**: Free-text fields (notes, review, title) have no max length validation in Pydantic schemas. Pydantic's `max_length` validator should be applied.
- **SQL injection via `text()` calls**: The raw `text()` SQL in `reference.py` uses parameterised queries (`:pid` syntax) correctly — this is not vulnerable. But it should be audited carefully; any future `text()` call that interpolates a string directly would be vulnerable.
- **Dependency scanning**: No `pip-audit` or `npm audit` in CI. In a pentest, outdated dependencies with known CVEs are a finding.
- **HTTPS everywhere**: The static site uses HTTPS (GitHub Pages + Cloudflare). The local API is HTTP. This is fine for localhost but must change for any public deployment.
- **Missing security headers**: No `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, or `Referrer-Policy` headers on the FastAPI responses. These are standard findings in web application pentests.

### Lower priority
- **No audit log**: No record of who changed what when. For a personal tool this is fine; for a multi-user deployment it's a gap.
- **localStorage auth state**: The editor unlock state is stored in `localStorage`. Any XSS vulnerability on the page would allow an attacker to set `el_editor = "true"` — but since the API itself has no auth, this is a secondary concern.

---

## Known Technical Debt and Things That Could Be Done Better

### The `buildUpdatePayload` / `buildPayload` duplication
`AddEvent.tsx` has two separate functions for building API payloads — one for create (POST) and one for update (PATCH). They share logic but are maintained separately, which led to the bug fixed in this repo (support ensemble IDs missing from the update path). A better design would be a single payload builder with a `mode: "create" | "update"` flag, or a shared base object that both extend.

### SQLAlchemy mutable column tracking
`ARRAY` columns in SQLAlchemy are mutable by default but SQLAlchemy's change-tracking may not detect in-place mutations (e.g. `list.append()`). The codebase avoids this by reassigning the column value entirely, which is correct but not explicit. Adding `MutableList.as_mutable(ARRAY(...))` would make the intent clear and prevent future bugs.

### The person events lookup is O(n tables)
`get_person_events` executes a separate SQL query per extension table (13 tables × up to 4 query patterns each = up to ~50 queries). For a personal archive with <200 events this is invisible, but it scales poorly. A proper solution would be a materialised view or a denormalised `event_person` join table updated by triggers.

### No database indexes on foreign keys in extension tables
Extension tables have `event_id` as PK (indexed), but array columns like `support_act_person_ids` have no GIN index. `ANY(array_column)` scans without a GIN index are sequential. On 178 events this is fine; on 100,000 events it becomes a problem.

```sql
-- What should exist:
CREATE INDEX idx_event_music_support_gin ON event_music USING gin(support_act_person_ids);
```

### The dump script calls handler functions directly
`dump_to_json.py` imports and calls FastAPI route handlers (`get_event`, `get_person_events`, etc.) directly by passing a Session. This is clever — same logic, no HTTP overhead — but it creates a tight coupling between the dump script and the handler function signatures. If a handler gains a new required parameter (e.g. auth context), the dump script breaks silently.

### `substack_url` field in EventListItem type definition
The TypeScript type has `substack_url: string | null` but this field does not appear to be populated in the backend schemas or the dump. It appears to be a vestige.

### Passphrase in source
The passphrase is in `editor.ts` and therefore in the git history. If this codebase were made public it should be rotated and stored as a build-time env variable (`import.meta.env.PUBLIC_EDITOR_PASS`) — though anyone who reads the compiled JS bundle can still find it, which is why the API must be localhost-only.

---

## What Is Genuinely Impressive

**The dual-mode architecture is the standout.** The same React codebase runs against a live FastAPI backend (localhost) and against pre-baked JSON files (GitHub Pages) with a single env flag switch. The JSON files are generated by directly calling the backend handler functions — meaning the serialisation path is identical and drift is structurally impossible. This is not how most projects solve "I want a static site with the same data as my dev app."

**The schema depth is unusual for a personal project.** 14 Alembic migrations, 18 SQLModel table classes, 13 event extension types, proper `ARRAY(UUID)` columns for polymorphic multi-valued relationships, JSONB for unstructured cast data, a `MusicalPiece` table with a separate `ClassicalProgrammeItem` join to support ordered setlists with soloists. Most personal tracking apps are a flat spreadsheet. This is a relational database with real integrity.

**The streaming publish UX** — clicking a button and watching the git commit, push, and CI deployment log stream into the browser in real time — is a polished piece of engineering. It uses `ReadableStream.getReader()` on the browser side, HTTP chunked transfer via FastAPI `StreamingResponse` on the server side, and a shell script that tails GitHub Actions via the `gh` CLI. Three different systems composed into a coherent UX.

**The person-across-all-tables search** is genuinely thorough. Finding every event that references a person — including as a work's creator, a cast member in JSONB, a soloist in a ARRAY column in a sub-programme table — requires explicit knowledge of every extension table and every relationship type. It does this correctly.

**The Astro islands architecture** is the right choice. The public static site has near-zero JavaScript until React islands hydrate on demand, which gives excellent Lighthouse scores and fast initial paint without sacrificing interactivity.

**AI summary integration.** Each event has `full_description` (verbatim from the source), `ai_summary` (generated), and `description_source_url`. The UI has a tabbed toggle between them. The descriptions were generated in batch using Claude, stored in the database, and committed as part of the static JSON. This is a clean separation: AI-generated content is a first-class column, not a UI hack.

---

## What Was Hard

- **The dual-mode API abstraction** required carefully auditing every data access to ensure it had a static-mode fallback. The `STATIC` flag check appears in 20+ places in `api.ts`.
- **Extension table mutations** had a recurring pattern of update payloads missing fields that the create payloads had. The `support_act_ensemble_ids` bug was the most recent instance — it was in the create path but not the update path, and only surfaced when editing an event with ensemble support acts.
- **Venue hierarchy** (venues with `parent_id` forming a tree) complicated the display logic — "Stalls, Royal Opera House, London" needs to be resolved to a breadcrumb, not just a flat venue name.
- **Person lookup across 13 tables with multiple relationship patterns** (FK, ARRAY, JSONB, indirect via work creator) needed each pattern explicitly implemented and each extension table explicitly listed.
- **Same-day event ordering** defaulted to arbitrary PostgreSQL heap order until a `time DESC` secondary sort was added.
- **Source URL integrity** — 178 events accumulated over years had source URLs pointing to wrong venues (Boom Chicago show linked to Edinburgh Fringe), stale Edinburgh Fringe slugs showing 2026 content for 2025 shows, and venue website mismatches. Auditing 178 URLs required cross-referencing venue names against domain names for every event.

---

## What Ideas Could Take This Further

### As a personal product
- **Export to PDF / print-friendly view** — a "year in review" PDF of all events with ratings and notes
- **Recommendation engine** — based on the ratings corpus, suggest upcoming events in the user's city
- **iCal integration** — upcoming events exported as `.ics` for calendar subscription
- **Mobile app** — a lightweight React Native or PWA wrapper with offline-first SQLite that syncs to the backend on WiFi
- **Collaborative mode** — multiple users, each with their own event diary, with optional "shared" events (saw this together)

### As a platform
- **Multi-tenant SaaS** — "your cultural diary" product. Each user gets their own schema namespace or database. The schema is already sophisticated enough to be the data layer for a proper product.
- **Venue/artist pages** — public pages for venues and artists, aggregating reviews and ratings from all users who have seen them
- **Discovery API** — an API that other apps can query: "what do people who rate circus 5★ also give high ratings to?"
- **Setlist integration** — the setlist.fm scraper exists; extend it to auto-import setlists when a music event is added

---

## What a Telecoms Company Could Do With This Architecture

This section maps the specific technical patterns in this codebase to problems a telecommunications company actually faces.

### 1. Network Event Archive / Incident Ledger

The core problem this app solves — "I have events of many different types, each with different metadata, I want to log them, annotate them, rate them, search them, and browse them by entity" — maps directly to a **network operations incident ledger**.

Replace:
- `event` → network incident / planned maintenance window
- `type` (music/comedy/ballet) → incident category (outage/degradation/planned/security/configuration)
- extension tables → per-category metadata (an outage has `affected_circuits UUID[]`, a security event has `CVE_ids`, a maintenance has `change_request_id`)
- `venue` → network node / PoP / data centre
- `person` → engineer / team / customer
- `rating` → severity / customer impact score
- `festival` → major event affecting network (a sports final, a festival, a national emergency)
- `review` → post-incident report (PIR)

The dual-mode architecture maps to: **real-time incident view** (API mode, live data) vs **monthly/quarterly reporting** (static mode, point-in-time JSON snapshots committed to a git repo for audit trail).

The streaming publish pipeline maps to: **automated report generation** — a button that dumps the current DB state to a static report, commits it to a compliance repository, and streams the progress to the NOC operator's screen.

### 2. The Schema Pattern for Telecoms

The **typed extension table pattern** solves exactly the problem telecoms companies struggle with in their OSS/BSS systems: a "service" or "event" entity that means completely different things depending on whether it's a mobile call, a fibre circuit, an MPLS path, or an IP transit session. Telecoms vendors typically handle this with a single wide table with hundreds of nullable columns, or with a generic EAV (Entity-Attribute-Value) schema that makes querying painful. The extension table approach is better: full SQL typing, proper joins, no nullable column explosion.

### 3. AI Summary Layer

The `ai_summary` + `full_description` + `description_source_url` pattern maps directly to:

- `full_description` → raw alarm log / SNMP trap text / log stream excerpt
- `ai_summary` → LLM-generated plain-English summary of what happened ("BGP session on PE-AMS-03 dropped at 14:32 due to hold-timer expiry, affecting 47 enterprise customers in Amsterdam")
- `description_source_url` → link to the NMS/EMS event detail page

The batch description generation done on this archive (178 events processed in Python scripts using the Claude API) is a direct analogue of a **daily alarm summarisation job** — run overnight, populate the `ai_summary` column for every new event, commit to the incident ledger.

### 4. The Static/Live Split for Compliance

Telecoms companies have strict regulatory requirements to retain records of incidents, planned outages, and service levels (Ofcom in the UK, BEREC in the EU, FCC in the US). The publish pipeline — "dump the current state of the database to versioned JSON files, commit to git with a timestamp, push to an immutable repository" — is a simple, auditable approach to **point-in-time record retention**. The git history is the audit trail.

### 5. What Would Need to Change for Telco Scale

- Replace PostgreSQL with a timeseries-capable backend (TimescaleDB, ClickHouse, or Apache Iceberg on S3) for the alarm/event ingestion layer — tens of millions of events per day, not 178 per year
- Add proper RBAC (role-based access control) — NOC engineers can view and annotate, incident managers can close incidents, compliance officers get read-only access to the historical archive
- Add an ingestion API (separate from the read API) that accepts events from NMS/EMS systems via webhook or Kafka consumer
- The extension table pattern should be retained but the sync logic that currently runs in a Python dump script should run as a streaming ETL (Apache Flink or Kafka Streams) to keep the "ledger" view always current
- The streaming publish UI pattern should become a **live dashboard** — not a one-shot publish, but a continuously updating stream of incoming events (Server-Sent Events or WebSockets, same browser API, same Uvicorn backend)

---

## Summary for an ML Engineer

The most ML-relevant patterns here:

1. **Data labelling substrate** — 178 events with structured metadata (type, subtype, venue, performers, rating, rating_context) and text (notes, review, ai_summary) is a clean, hand-curated dataset. The schema is rich enough to train a classifier ("given title + venue + performers, predict event type") or a recommendation model.

2. **LLM-augmented data entry** — `ai_summary` is generated by an LLM, stored as a first-class DB column, and served alongside the source text with a UI toggle. This is the correct pattern for LLM-augmented data: the model output is a column, not a runtime call. Regeneration is explicit, not automatic.

3. **The dump-to-JSON pattern scales to ML pipelines** — `dump_to_json.py` is a batch ETL script that calls the same serialisation functions as the API. With minor modification it could dump to Parquet for training data, or to a vector database (Qdrant, Weaviate) for semantic search. The hard part — clean data with rich relational structure — is already done.

4. **The setlist scraper** (`setlist.py`) is a simple HTML scraper for setlist.fm. It uses regex over raw HTML. A production version would use the official setlist.fm API, but the pattern is correct: fetch external data, parse it, store it as a structured array column in the DB, serve it as part of the event detail response.

5. **Taste profile derivation** — a memory document in this project (`user_taste_profile.md`) was derived by analysing the ratings corpus across 178 events. This is a manual version of what a collaborative filtering model would do automatically. The structured schema (type, subtype, venue, performers, rating) is exactly the input features a matrix factorisation or neural collaborative filtering model would need.
