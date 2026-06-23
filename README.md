# Events Ledger

A personal archive of live performances.

**Live site: [cjbaxt.github.io/events-ledger](https://cjbaxt.github.io/events-ledger)**

---

## How it works

There are two parts:

- **Backend** — a FastAPI server that talks to a local Postgres database on your laptop. It only ever runs locally, never deployed anywhere. This is where all your data lives.
- **Frontend** — an Astro site. Locally it talks to the backend API. For the public site, it reads from static JSON files that were dumped from Postgres at publish time.

When you want to update the live site, you run `publish.sh` (or click the publish button in the editor UI). That script dumps your database to JSON files, commits them, and pushes to GitHub. GitHub Actions then builds and deploys the static site automatically.

Your data never leaves your laptop except as read-only JSON baked into the frontend.

---

## First-time setup

### 1. Postgres

You need a local Postgres database called `events_ledger`. If you don't have Postgres installed:

```bash
brew install postgresql@16
brew services start postgresql@16
createdb events_ledger
```

Then restore your data from the latest SQL export if you have one:

```bash
psql events_ledger < events_ledger_data.sql
```

### 2. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Frontend

```bash
cd frontend
npm install
```

---

## Running locally

You need two terminals.

**Terminal 1 — backend:**

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

This runs on `http://localhost:8000`. Leave it running.

**Terminal 2 — frontend:**

```bash
cd frontend
npm run dev
```

This runs on `http://localhost:4323` (or similar — it'll tell you in the terminal). Open that in your browser.

---

## Adding and editing events

1. Make sure both the backend and frontend are running (see above).
2. Open the app in your browser.
3. Double-tap the `e` key anywhere on the page. A passphrase prompt appears.
4. Enter the passphrase. This unlocks editor mode — you'll see "publish" and "lock" in the bottom-right corner, and an "Add event" link appears in the nav.
5. Add or edit events as normal.
6. When you're done, click **publish** in the bottom-right corner. A log panel appears and streams the progress. It dumps your database to JSON, commits, and pushes to GitHub. The live site updates within a minute or two.

If something goes wrong during publish, the log panel will show the error.

---

## Publishing manually (alternative to the button)

If the publish button isn't working, you can run the script directly:

```bash
./publish.sh
```

This does the same thing: dumps the database → commits → pushes to `dev` → pushes `dev` to `main` → GitHub Actions deploys.

---

## Backing up your data

Your data lives in the local Postgres database. To export it:

```bash
bash scripts/export_db.sh
```

This creates a `.sql` file you can use to restore later. Do this before wiping your laptop or moving to a new machine.

---

## Moving to a new machine

1. Install Postgres and create the `events_ledger` database.
2. Restore from your SQL export: `psql events_ledger < your_export.sql`
3. Clone the repo: `git clone https://github.com/cjbaxt/events-ledger.git`
4. Set up the backend venv and install requirements (see First-time setup).
5. Install frontend dependencies.
6. Run as normal.

---

## Git branches

- `dev` — where all work happens. Push here freely.
- `main` — only ever updated via `publish.sh` or the publish button. Pushing to `main` triggers GitHub Actions and deploys the live site (this costs build minutes, so don't push to `main` manually for code changes — only use it for publishing data).

---

## File structure

```
events-ledger/
├── backend/          FastAPI + SQLModel app, talks to local Postgres
│   └── app/
│       ├── api/      Route handlers (events, persons, venues, etc.)
│       ├── models/   SQLModel table definitions
│       └── main.py   App entry point
├── frontend/         Astro site
│   ├── src/
│   │   ├── components/   React components (Timeline, Nav, Stats, etc.)
│   │   ├── lib/          Helpers (api.ts, base.ts, editor.ts)
│   │   └── pages/        One .astro file per page
│   └── public/data/  Static JSON files (committed, read by the live site)
├── scripts/
│   └── dump_to_json.py   Dumps Postgres → frontend/public/data/
└── publish.sh        One-command publish: dump → commit → push → deploy
```
