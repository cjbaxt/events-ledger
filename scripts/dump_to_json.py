#!/usr/bin/env python3
"""
Dump the local events_ledger Postgres DB to static JSON files.
Run this before committing to publish new data to GitHub Pages.

  python scripts/dump_to_json.py
"""

import json
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from sqlmodel import Session, create_engine, select
from app.models import Person, Venue, Ensemble, Festival
from app.api.events import list_events, get_event
from app.api.reference import (
    get_person, get_person_events,
    get_venue, get_venue_events,
    get_ensemble, get_ensemble_events,
    get_festival, get_festival_events,
)

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://clairebaxter@localhost:5432/events_ledger"
)

OUT = Path(__file__).parent.parent / "frontend" / "public" / "data"


def write(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, default=str, ensure_ascii=False, indent=None), encoding="utf-8")
    print(f"  {path.relative_to(OUT.parent.parent)}")


def dump(obj):
    return obj.model_dump(mode="json")


def main():
    engine = create_engine(DATABASE_URL)

    with Session(engine) as s:
        print("Events list…")
        events = list_events(session=s, limit=5000, offset=0)
        write(OUT / "events.json", [dump(e) for e in events])

        print("Event details…")
        for e in events:
            detail = get_event(event_id=e.id, session=s)
            write(OUT / "events" / f"{e.id}.json", dump(detail))

        print("Persons…")
        for p in session_all(s, Person):
            write(OUT / "persons" / f"{p.id}.json", dump(get_person(str(p.id), session=s)))
            write(OUT / "persons" / f"{p.id}" / "events.json", [dump(e) for e in get_person_events(str(p.id), session=s)])

        print("Venues…")
        for v in session_all(s, Venue):
            write(OUT / "venues" / f"{v.id}.json", dump(get_venue(str(v.id), session=s)))
            write(OUT / "venues" / f"{v.id}" / "events.json", [dump(e) for e in get_venue_events(str(v.id), session=s)])

        print("Ensembles…")
        for e in session_all(s, Ensemble):
            write(OUT / "ensembles" / f"{e.id}.json", dump(get_ensemble(str(e.id), session=s)))
            write(OUT / "ensembles" / f"{e.id}" / "events.json", [dump(ev) for ev in get_ensemble_events(str(e.id), session=s)])

        print("Festivals…")
        for f in session_all(s, Festival):
            write(OUT / "festivals" / f"{f.id}.json", dump(get_festival(str(f.id), session=s)))
            write(OUT / "festivals" / f"{f.id}" / "events.json", [dump(e) for e in get_festival_events(str(f.id), session=s)])

    print(f"\nDone. {len(events)} events dumped to {OUT}")


def session_all(s, model):
    return s.exec(select(model)).all()


if __name__ == "__main__":
    main()
