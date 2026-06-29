#!/usr/bin/env python3
"""Load batch 7 — final remaining events with findable descriptions."""
import os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
from sqlmodel import Session, create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://clairebaxter@localhost:5432/events_ledger")
engine = create_engine(DATABASE_URL)

UPDATES = [
    ("The Christmas Carol Concert",
     "An annual Christmas carol concert bringing together choral and orchestral performance in a programme of traditional carols and seasonal music — Silent Night, O Come All Ye Faithful, Hark! The Herald Angels Sing, The Twelve Days of Christmas — alongside choral settings and instrumental Christmas repertoire. A communal celebration of the festive season through music.",
     "A traditional Christmas carol concert — soloists, choir, and orchestra in a programme of beloved carols and seasonal music for the festive season.",
     "https://en.wikipedia.org/wiki/Christmas_carol"),

    ("Metamorphosis (Kafka)",
     "A stage adaptation of Franz Kafka's The Metamorphosis (Die Verwandlung, 1915) — the story of Gregor Samsa, a travelling salesman who wakes one morning to find himself transformed into a monstrous insect, and the slow disintegration of his family as they struggle to cope with what he has become. One of the most performed adaptations of one of the foundational texts of 20th-century literature.",
     "A theatrical staging of Kafka's novella — Gregor Samsa wakes as a monstrous insect, and the world that surrounded him begins its slow, inexorable collapse. One of the most adapted texts in modern theatre.",
     "https://en.wikipedia.org/wiki/The_Metamorphosis"),
]


def run():
    with Session(engine) as s:
        conn = s.connection()
        updated = 0
        skipped = 0

        for title, full_desc, ai_sum, source in UPDATES:
            result = conn.execute(text(
                "UPDATE event SET full_description=:fd, ai_summary=:ai, description_source_url=:src "
                "WHERE title ILIKE :t RETURNING id, title"
            ), {"fd": full_desc, "ai": ai_sum, "src": source, "t": f"%{title[:50]}%"}).all()
            if result:
                for row in result:
                    print(f"  ✓ {row[1]}")
                updated += len(result)
            else:
                print(f"  ✗ NOT FOUND: {title[:60]}")
                skipped += 1

        s.commit()
        print(f"\nDone. {updated} events updated, {skipped} not found.")


if __name__ == "__main__":
    run()
