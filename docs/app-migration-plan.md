# Events Ledger → Web App Migration Plan

**Status:** Planning  
**Started:** 2026-07-20  
**Goal:** Turn the local-only events ledger into a live web app accessible from any device, hosted at `ledger.claireheaded.com`, with proper authentication and a live database.

---

## What we're building

A private web app at `ledger.claireheaded.com` that:
- Works fully from a mobile browser (the primary new use case)
- Has proper persistent login — log in once, stay logged in
- Has a live database (no more local-only, no more publishing static JSON)
- Is ready for an Android app as the next step
- Supports multiple user accounts in future (just Claire for now)
- Is entirely free to run

---

## Decisions and rationale

### 1. Subdomain: `ledger.claireheaded.com`

Rather than a path (`claireheaded.com/ledger`) or a new domain, we use a subdomain on the existing domain. A subdomain is a free DNS prefix — no new domain purchase, just a CNAME record in Cloudflare pointing `ledger` at Vercel. The existing `claireheaded.com` GitHub Pages site is completely untouched. [^1]

### 2. Frontend: Next.js (replacing Astro)

The existing app is built in Astro with React components. We're moving the frontend to Next.js for two reasons:

**Auth:** The previous attempt at auth re-asked for login on every page switch. This is an Astro SSR problem — it re-checks auth server-side on each navigation. Next.js solves this with middleware: a single file that intercepts unauthenticated requests before any page renders. Once logged in, page switches are client-side and the middleware never runs again mid-session. [^2]

**Android:** Next.js on Vercel is the standard foundation for PWA (Progressive Web App — "add to home screen" on Android) and integrates cleanly with React Native/Expo if we go native later.

The existing React components (EventDetailPanel, AddEvent, Stats, etc.) port over with minimal changes since they're already React.

### 3. Backend: Next.js API routes (replacing FastAPI)

This is the most significant change. The Python FastAPI backend is being rewritten as TypeScript Next.js API routes. Reasons:

**Cold starts kill mobile UX.** The only free Python hosting that doesn't delete data is Render's free web service tier. Render free services sleep after 15 minutes of inactivity and take 30–60 seconds to wake up. On a mobile app you open occasionally throughout the day, this is genuinely bad — you'd wait a minute for the first API response every few hours. Next.js API routes on Vercel are always-on with no cold start. [^3]

**The backend isn't complex Python.** If the backend were doing ML inference, data processing pipelines, or heavy scientific computing, keeping Python would be the right call. But it's doing: standard CRUD, one web scraper, one HTML parser, and SQL joins. None of these require Python — the TypeScript equivalents are equally readable and shorter. [^4]

**Single deploy.** One `vercel deploy` covers both frontend and API. No coordinating two services, no CORS configuration between them, no separate environment variables to keep in sync.

**The publish pipeline disappears.** The current workflow (dump static JSON → commit → push → GitHub Action) exists because the app runs locally against a local database. With a live database, there's nothing to publish — data is live the moment it's saved.

### 4. Database: Supabase PostgreSQL (replacing local PostgreSQL)

Supabase provides hosted PostgreSQL with a free tier (500MB, no expiry, pauses after 1 week idle but wakes on first request). The schema migrates directly — it's standard PostgreSQL, no changes needed. [^5]

Supabase also provides Row Level Security (RLS): database-level policies that mean users can only query their own data. This is the right foundation for multi-user support — adding a second user later is just creating an account, no code changes. [^6]

### 5. Auth: Supabase Auth (replacing the passphrase/localStorage check)

Supabase Auth handles email + password login, session management, and JWT tokens. The session lives in a cookie; Next.js middleware reads it on every request. Sessions last one week and are silently refreshed. [^7]

The existing "editor mode" passphrase (`localStorage` check) is replaced entirely by proper authentication. Since the whole app is behind auth, there's no longer a read-only / edit distinction — if you're logged in, you can edit.

### 6. Multi-user readiness

All user-owned tables (events, and anything referenced only by the event owner) get a `user_id UUID` column pointing to the Supabase auth user. RLS policies enforce `WHERE user_id = auth.uid()` at the database level. Reference tables (venues, persons, ensembles, works) remain shared — they're factual, not personal. [^8]

### 7. Data migration

All existing data from local PostgreSQL migrates to Supabase via `pg_dump` / `psql`. The schema is standard PostgreSQL so this is a direct import. All existing events are assigned to Claire's user account during migration. The static JSON exports on GitHub Pages remain as a read-only archive.

---

## Target architecture

```
User (browser / Android app)
        │
        ▼
ledger.claireheaded.com  (Vercel)
        │
        ├── Next.js App Router (frontend)
        │     middleware.ts → auth gate on all /ledger/* routes
        │
        └── Next.js API routes (/api/*)
              │
              ▼
         Supabase
          ├── PostgreSQL (events, venues, persons, ...)
          └── Auth (sessions, users)
```

**DNS:** Cloudflare CNAME `ledger` → `cname.vercel-dns.com`

---

## Implementation sequence

1. **Branch** — create `app` branch from `main`
2. **Supabase** — create project, migrate schema, import data, add `user_id` column, configure RLS
3. **Next.js scaffold** — new Next.js app, Supabase Auth, middleware, login page
4. **Port components** — copy existing React components into Next.js, adapt imports
5. **API routes** — rewrite FastAPI endpoints as Next.js API routes (TypeScript + Supabase client)
6. **Scraper + setlist** — rewrite in TypeScript (trivial — HTTP fetch + regex)
7. **PWA config** — add manifest + service worker so it's installable on Android
8. **DNS** — Cloudflare CNAME → Vercel, configure custom domain
9. **Test on mobile** — real device testing before any announcement
10. **Learnings doc** — extract from this plan + what actually changed during implementation

---

## What stays the same

- The existing `claireheaded.com` GitHub Pages static site — untouched
- The existing `events-ledger` GitHub Pages static JSON export — stays as archive
- The `main` branch — untouched until the app branch is proven
- All event data — migrated, nothing lost

---

## Footnotes

[^1]: Subdomains are free prefixes on a domain you already own. A CNAME record in Cloudflare (where claireheaded.com DNS lives) tells browsers that `ledger.claireheaded.com` should resolve to Vercel's servers. Vercel then serves the Next.js app when that domain is requested. Two minutes to configure.

[^2]: Astro's architecture re-runs server-side code (including auth checks) on every page navigation when using SSR mode. With client-side navigation disabled or misconfigured, every route change becomes a full server round-trip including re-validating the session. Next.js middleware runs at the edge before the page, and client-side navigation via `next/link` bypasses the middleware entirely after the initial load — the session is already established client-side.

[^3]: Render's free web service tier introduced "spin-down after 15 minutes of inactivity" as of late 2023. The first request after spin-down incurs a cold start of typically 30–60 seconds while the container restarts. For a browser app this is tolerable (users see a loading state); for a mobile app it reads as broken. Vercel's serverless functions have cold starts too (~100–300ms) but these are imperceptible vs. Render's container-level restart.

[^4]: A useful heuristic: keep Python when you need Python's ecosystem (NumPy, pandas, scikit-learn, PyTorch, etc.) or when existing Python code is genuinely complex and battle-tested. For HTTP handlers that do `SELECT * FROM events` and return JSON, the language is irrelevant and TypeScript removes a service boundary.

[^5]: Supabase free tier pauses databases after 1 week of complete inactivity (no queries at all). The pause is lifted automatically on the next request — typically within 1–2 seconds. This is different from Render's cold start: the database wakes fast, it's only the initial TCP connection that has a brief delay. For a personal app used regularly, the database rarely if ever pauses.

[^6]: Row Level Security is a PostgreSQL feature (not Supabase-specific) that lets you attach policies to tables. Example: `CREATE POLICY "users see own events" ON event USING (user_id = auth.uid())`. Once RLS is enabled on a table, queries automatically filter by the current authenticated user — even if the application code forgets to add a WHERE clause. It's security at the database layer, not the application layer.

[^7]: Supabase Auth issues two tokens: a short-lived JWT (1 hour) and a refresh token (1 week). The Next.js Supabase client (`@supabase/ssr`) stores these in cookies and automatically uses the refresh token to issue a new JWT before it expires. From the user's perspective: log in once, stay logged in until you explicitly sign out.

[^8]: Venues, persons, ensembles, and works are factual reference data (The Barbican is The Barbican regardless of who logged the event). These stay unowned and shared. Events, ratings, reviews, notes, and payment methods are personal — they get `user_id`. Festival associations are a judgment call: festivals are factual but editions might diverge between users. For now, festivals are shared reference data.
