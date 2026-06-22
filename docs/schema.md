# Events Ledger — Database Schema

PostgreSQL · 28 tables · all primary keys are UUID

## Table of Contents
- [Design principles](#design-principles)
- [Core tables](#core-tables)
- [Entity tables](#entity-tables)
- [Event extension tables](#event-extension-tables)
- [Programme detail tables](#programme-detail-tables)

---

## Design principles

### Event type pattern
Every event has one row in `event` (shared fields) plus one row in the matching `event_*` extension table. The extension shares the same `event_id` as its PK — always a 1-to-1 join on `event_id`.

### Credits vs extension fields
`event_credit` is a free-form many-to-many: any person, any role label, always rendered as a clickable link. Extension fields (`playwright_id`, `conductor_id`, etc.) are structured and used for filtering and stats.

### Venue hierarchy
`venue.parent_id` is self-referential — child venues (e.g. Grote Zaal) point to their parent building (e.g. Nationale Opera & Ballet). Events should be linked to the child venue where possible.

### Arrays vs FK tables
Secondary people/ensembles are stored as `uuid[]` arrays (`support_acts`, `cast`, `soloists`, `additional_company_ids`) rather than junction tables. These are **not** declared FK constraints — referential integrity is enforced at the application level.

---

## Core tables

### `event`
The central table. Every event has exactly one row here.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `title` | varchar | |
| `type` | varchar | `ballet` `music` `theatre` `comedy` `opera` `classical` `dance` `circus` `cabaret` `spoken_word` `talk` `exhibition` `screening` `other` |
| `date` | date | |
| `time` | time | optional |
| `status` | varchar | `attended` (default) or `upcoming` |
| `venue_id` | uuid | → `venue` |
| `festival_id` | uuid | → `festival` · optional |
| `work_id` | uuid | → `work` · optional |
| `payment_method_id` | uuid | → `payment_method` · optional |
| `price_paid` | numeric | optional |
| `currency` | varchar | optional |
| `rating` | float | optional |
| `notes` | text | optional |
| `review` | text | optional |
| `links` | jsonb | optional — array of `{url, label}` |
| `related_event_ids` | uuid[] | optional — soft links to other events |
| `created_at` | timestamp | |

### `event_credit`
Free-form credits — any person with any role label. Rendered as clickable links in the UI.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `event_id` | uuid | → `event` |
| `person_id` | uuid | → `person` |
| `role` | varchar | free-text e.g. `Music & Lyrics`, `Script`, `Director` |
| `sort_order` | int | controls display order |

---

## Entity tables

### `person`
Any individual — performer, director, composer, playwright, etc.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `name` | varchar | |
| `roles` | varchar[] | optional |
| `website_url` | varchar | optional |
| `musicbrainz_url` | varchar | optional |
| `notes` | text | optional |

### `ensemble`
Any group — orchestra, dance company, comedy club, band, circus company, etc.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `name` | varchar | |
| `type` | varchar | optional e.g. `orchestra` `circus` |
| `website_url` | varchar | optional |
| `musicbrainz_url` | varchar | optional |
| `notes` | text | optional |

### `venue`
Supports a parent/child hierarchy (building → room).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `name` | varchar | |
| `parent_id` | uuid | → `venue` (self-referential) · optional |
| `operator_id` | uuid | → `venue_operator` · optional |
| `city` | varchar | optional |
| `country` | varchar | optional (ISO code) |
| `venue_type` | varchar | optional |
| `capacity` | int | optional |
| `website_url` | varchar | optional |
| `maps_url` | varchar | optional |

### `venue_operator`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `name` | varchar | |
| `website_url` | varchar | optional |
| `wikipedia_url` | varchar | optional |

### `festival`
A named edition of a festival. Each edition is its own row.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `name` | varchar | e.g. `Edinburgh Festival Fringe` |
| `edition` | varchar | optional e.g. `2024` |
| `start_date` | date | optional |
| `end_date` | date | optional |
| `city` | varchar | optional |
| `website_url` | varchar | optional |
| `notes` | text | optional |

### `work`
A creative work — a piece of music, a play, a ballet, a film, etc.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `title` | varchar | |
| `type` | varchar | |
| `creator_id` | uuid | → `person` · optional |
| `year` | int | optional |
| `musicbrainz_url` | varchar | optional |
| `notes` | text | optional |

### `production`
A specific staging of a work (distinct from the work itself).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `title` | varchar | |
| `work_id` | uuid | → `work` |
| `director_id` | uuid | → `person` · optional |
| `start_date` | varchar | optional |
| `end_date` | varchar | optional |
| `notes` | text | optional |

### `payment_method`
Subscription passes, gift cards, etc. — tracks the purchase that covered one or more events.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `name` | varchar | e.g. `Opera & Ballet Season 2024/25` |
| `total_cost` | numeric | |
| `currency` | varchar | default `EUR` |
| `purchase_date` | date | |
| `notes` | varchar | optional |

---

## Event extension tables

Each shares `event_id` as its PK (1-to-1 with `event`). Join on `event_id`.

### `event_ballet`

| Column | Type | Notes |
|--------|------|-------|
| `event_id` | uuid | PK → `event` |
| `company_id` | uuid | → `ensemble` · primary company |
| `additional_company_ids` | uuid[] | → `ensemble[]` · co-producers |
| `orchestra_id` | uuid | → `ensemble` |
| `conductor_id` | uuid | → `person` |
| `work_id` | uuid | → `work` |
| `production_id` | uuid | → `production` |
| `cast` | json | array of person UUIDs |
| `subtype` | varchar | optional |

### `event_classical`

| Column | Type | Notes |
|--------|------|-------|
| `event_id` | uuid | PK → `event` |
| `ensemble_id` | uuid | → `ensemble` |
| `conductor_id` | uuid | → `person` |
| `notes_on_performance` | text | optional |
| `subtype` | varchar | optional |

Programme items are in `classical_programme_item`.

### `event_opera`

| Column | Type | Notes |
|--------|------|-------|
| `event_id` | uuid | PK → `event` |
| `work_id` | uuid | → `work` |
| `production_id` | uuid | → `production` |
| `ensemble_id` | uuid | → `ensemble` |
| `conductor_id` | uuid | → `person` |
| `director_id` | uuid | → `person` |
| `cast` | json | array of person UUIDs |
| `composers` | uuid[] | → `person[]` |
| `libretto_language` | varchar | optional |
| `surtitles_languages` | varchar[] | optional |
| `operabase_url` | varchar | optional |

### `event_music`

| Column | Type | Notes |
|--------|------|-------|
| `event_id` | uuid | PK → `event` |
| `headliner_person_id` | uuid | → `person` |
| `headliner_ensemble_id` | uuid | → `ensemble` |
| `support_act_person_ids` | uuid[] | → `person[]` |
| `support_act_ensemble_ids` | uuid[] | → `ensemble[]` |
| `tour_name` | varchar | optional |
| `setlist` | json | optional |
| `setlist_fm_url` | varchar | optional |

### `event_theatre`

| Column | Type | Notes |
|--------|------|-------|
| `event_id` | uuid | PK → `event` |
| `playwright_id` | uuid | → `person` · use for the primary clickable author; prefer `event_credit` for multiple credits |
| `director_id` | uuid | → `person` |
| `company_id` | uuid | → `ensemble` |
| `work_id` | uuid | → `work` |
| `production_id` | uuid | → `production` |
| `cast` | json | array of person UUIDs |

### `event_comedy`

| Column | Type | Notes |
|--------|------|-------|
| `event_id` | uuid | PK → `event` |
| `performer_id` | uuid | → `person` · headliner |
| `support_acts` | uuid[] | → `person[]` |
| `ensemble_id` | uuid | → `ensemble` · for club nights |
| `tour_name` | varchar | optional |
| `subtype` | varchar | optional e.g. `character` |

### `event_dance`

| Column | Type | Notes |
|--------|------|-------|
| `event_id` | uuid | PK → `event` |
| `company_id` | uuid | → `ensemble` |
| `choreographer_id` | uuid | → `person` |
| `work_id` | uuid | → `work` |
| `programme` | json | optional |
| `music_notes` | varchar | optional |

### `event_circus`

| Column | Type | Notes |
|--------|------|-------|
| `event_id` | uuid | PK → `event` |
| `company_id` | uuid | → `ensemble` |
| `director_id` | uuid | → `person` |
| `work_id` | uuid | → `work` |

### `event_cabaret`

| Column | Type | Notes |
|--------|------|-------|
| `event_id` | uuid | PK → `event` |
| `headliner_id` | uuid | → `person` |
| `host_id` | uuid | → `person` |
| `ensemble_id` | uuid | → `ensemble` |
| `supporting_cast` | uuid[] | → `person[]` |
| `tour_name` | varchar | optional |
| `work_id` | uuid | → `work` · optional |

### `event_talk`

| Column | Type | Notes |
|--------|------|-------|
| `event_id` | uuid | PK → `event` |
| `speaker_ids` | uuid[] | → `person[]` |
| `host_id` | uuid | → `person` · optional |
| `topic` | varchar | optional |
| `host_organisation` | varchar | optional |
| `recording_url` | varchar | optional |

### `event_spoken_word`

| Column | Type | Notes |
|--------|------|-------|
| `event_id` | uuid | PK → `event` |
| `performers` | uuid[] | → `person[]` |
| `works_read` | uuid[] | → `work[]` |
| `host_id` | uuid | → `person` · optional |

### `event_exhibition`

| Column | Type | Notes |
|--------|------|-------|
| `event_id` | uuid | PK → `event` |
| `exhibition_title` | varchar | optional |
| `artists` | uuid[] | → `person[]` |
| `curator_id` | uuid | → `person` · optional |
| `period` | varchar | optional |
| `medium` | varchar | optional |
| `permanent_or_temp` | varchar | optional |
| `exhibition_url` | varchar | optional |

### `event_screening`

| Column | Type | Notes |
|--------|------|-------|
| `event_id` | uuid | PK → `event` |
| `work_id` | uuid | → `work` |
| `director_id` | uuid | → `person` |
| `conductor_id` | uuid | → `person` · for live score screenings |
| `ensemble_id` | uuid | → `ensemble` · for live score screenings |
| `series` | varchar | optional |

---

## Programme detail tables

Used for multi-piece concerts where you want to record the individual works performed.

### `classical_programme_item`
One row per piece in a classical concert.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `event_id` | uuid | → `event` |
| `musical_piece_id` | uuid | → `musical_piece` |
| `soloists` | uuid[] | → `person[]` · optional |
| `order` | int | position in programme · optional |
| `notes` | text | optional |

### `ballet_programme_item`
One row per work in a mixed bill ballet evening.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `event_id` | uuid | → `event` |
| `work_id` | uuid | → `work` |
| `choreographer_id` | uuid | → `person` · optional |
| `soloists` | uuid[] | → `person[]` · optional |
| `order` | int | optional |

### `ballet_programme_music`
Music pieces associated with a ballet programme item.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `programme_item_id` | uuid | → `ballet_programme_item` |
| `musical_piece_id` | uuid | → `musical_piece` |
| `order` | int | optional |

### `musical_piece`
A specific piece of music — can self-reference via `original_work_id` for arrangements.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `title` | varchar | |
| `movement` | varchar | optional |
| `composer_id` | uuid | → `person` · optional |
| `composer_text` | varchar | fallback if no person record · optional |
| `arranger_id` | uuid | → `person` · optional |
| `original_work_id` | uuid | → `musical_piece` (self) · for arrangements |
| `year` | int | optional |
| `catalogue_number` | varchar | optional e.g. `Op. 64` |
| `musicbrainz_url` | varchar | optional |
| `notes` | text | optional |
