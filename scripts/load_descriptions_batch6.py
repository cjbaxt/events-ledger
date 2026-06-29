#!/usr/bin/env python3
"""Load batch 6 — classical, music, and remaining events."""
import os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
from sqlmodel import Session, create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://clairebaxter@localhost:5432/events_ledger")
engine = create_engine(DATABASE_URL)

UPDATES = [
    # ── Classical ──────────────────────────────────────────────────────────────
    ("Nationale Opera & Ballet Lunchconcert",
     "A free weekly lunchtime concert at the Nationale Opera & Ballet building — part of the ongoing series that opens the building and its resident orchestral musicians to the public during the working day. The NOB lunchconcerts present chamber music, vocal recitals, and ensemble pieces by musicians from the opera and ballet companies, in an informal concert setting at 12:30.",
     "A free midday concert at the Nationale Opera & Ballet in Amsterdam — an informal chamber performance by musicians from the resident companies, open to all at lunchtime.",
     "https://www.operaballet.nl/en/national-opera-ballet/lunchconcerts"),

    ("Lunchconcert: Floor Kes, Alicia De Keulenaer + Katja Naegele",
     "Free weekly lunchtime concert at the Royal Concertgebouw Amsterdam. Every Wednesday at 12:30 in the Kleine Zaal, emerging conservatory talent and chamber ensembles perform 30-minute programmes that range from Baroque to contemporary repertoire. This programme features soprano Floor Kes, violinist/violist Alicia De Keulenaer, and pianist Katja Naegele.",
     "A free 30-minute lunchtime chamber concert at the Concertgebouw — soprano Floor Kes, Alicia De Keulenaer, and Katja Naegele in the Kleine Zaal at 12:30.",
     "https://www.concertgebouw.nl/en/lunchtime-concerts"),

    ("Lunchconcert: CvA Harp",
     "Free weekly lunchtime concert at the Royal Concertgebouw Amsterdam. This programme features harp students and ensembles from the Conservatorium van Amsterdam, performing in the Kleine Zaal at 12:30 — 30 minutes of solo and chamber harp repertoire.",
     "A free 30-minute Conservatorium van Amsterdam harp showcase in the Kleine Zaal of the Concertgebouw — students performing solo and chamber harp repertoire at lunchtime.",
     "https://www.concertgebouw.nl/en/lunchtime-concerts"),

    ("Münchner Philharmoniker",
     "The Munich Philharmonic — one of Europe's great orchestras, founded in 1893 and home to conductors including Hans Pfitzner, Bruno Walter, Rudolf Kempe, Sergiu Celibidache, James Levine, Christian Thielemann, and Lorin Maazel — visits Amsterdam for a concert at the Concertgebouw. Under chief conductor Valery Gergiev (who served 2015–2022), the orchestra performs at its customary level of power and precision.",
     "The Munich Philharmonic at the Concertgebouw — one of the great German orchestras, here under chief conductor Valery Gergiev, in a touring programme at one of the world's best concert halls.",
     "https://en.wikipedia.org/wiki/Munich_Philharmonic"),

    ("Rotterdams Philharmonisch Orkest",
     "The Rotterdam Philharmonic Orchestra, one of the Netherlands' great orchestras and a regular Concertgebouw presence, performs at the Grote Zaal. Founded in 1918 and based at De Doelen concert hall, the RPO has been led by conductors including Eduard Flipse, Jean Fournet, Edo de Waart, James Conlon, Valery Gergiev, Yannick Nézet-Séguin, and Lahav Shani.",
     "The Rotterdam Philharmonic Orchestra at the Concertgebouw — one of the Netherlands' great orchestras in a home-country concert at the world's most celebrated hall.",
     "https://www.rpho.nl/en"),

    ("Concertgebouworkest Essentials: Händel & Haydn",
     "A Royal Concertgebouw Orchestra concert in the Essentials series — curated programmes designed to introduce audiences to core repertoire in the world's finest concert hall. This concert pairs music by Handel and Haydn: two titans of the Baroque and Classical eras whose overlapping careers shaped Western music. The Essentials series sits alongside the RCO's main subscription programme and is intended for new and returning concertgoers alike.",
     "The Royal Concertgebouw Orchestra in their Essentials series — a programme of Handel and Haydn in the Grote Zaal, curated as an accessible introduction to the core of Western concert repertoire.",
     "https://www.concertgebouw.nl/en"),

    ("Concertgebouworkest Essentials: Symphonie Fantastique",
     "A Royal Concertgebouw Orchestra concert in the Essentials series centred on Berlioz's Symphonie Fantastique (1830) — one of the most vivid and programmatic orchestral works ever written, depicting the drug-induced hallucinations of a lovesick young artist through five extraordinary movements, culminating in a witches' sabbath. The Concertgebouw's naturally warm acoustic makes it one of the world's ideal venues for Berlioz's expanded orchestration.",
     "The Royal Concertgebouw Orchestra performs Berlioz's Symphonie Fantastique — the most hallucinatory, cinematic piece in the standard repertoire — in the Essentials series at the Grote Zaal.",
     "https://www.concertgebouw.nl/en"),

    ("Nederlands Kamerorkest",
     "The Netherlands Chamber Orchestra, founded in 1934, is one of the country's premier chamber ensembles — celebrated for its warm, flexible sound and its traversal of repertoire from the Baroque to contemporary premieres. The ensemble performs in and around the Concertgebouw and tours internationally, working with conductors and soloists of the highest calibre.",
     "The Netherlands Chamber Orchestra — intimate, flexible, and capable of everything from Baroque concerti to twentieth-century chamber music — in concert at the Concertgebouw.",
     "https://www.nederlandskamerorkest.nl/en"),

    ("Nederlands Philharmonisch Orkest — Liefde",
     "The Netherlands Philharmonic Orchestra, resident at the Nationale Opera & Ballet, in a programme themed around Love (Liefde) — a common curatorial thread in the NedPhO's audience-facing programming, pairing operatic, orchestral, and vocal works united by the theme of love in its many forms.",
     "The Netherlands Philharmonic Orchestra in a programme themed around love — operatic and orchestral repertoire united by the most persistent subject in all of Western music.",
     "https://www.operaballet.nl/en/netherlands-philharmonic-orchestra"),

    ("Scottish Fiddle Orchestra: Hogmanay Celebration",
     "The Scottish Fiddle Orchestra — over 100 fiddlers, plus accordion, harp, and drums — performs their annual Hogmanay concert at Edinburgh's Usher Hall, ringing in the New Year Scottish style. The programme features an irresistible mix of slow airs, marches, strathspeys, jigs, and reels alongside well-known songs, building to a ceilidh-style finale guaranteed to get the whole hall dancing. One of Edinburgh's most beloved festive traditions.",
     "The Scottish Fiddle Orchestra's Hogmanay concert at Usher Hall — over a hundred fiddlers, a programme of airs, reels, and marches, and a ceilidh finale. Edinburgh's annual way to fiddle in the New Year.",
     "https://www.sfo.org.uk/"),

    ("J. Pzn. Sweelinck Orchestra & NAKK",
     "The J. Pzn. Sweelinck Orchestra — the student orchestra of the Conservatorium van Amsterdam — performs alongside NAKK (the New Amsterdam Chamber Choir or another associated ensemble) in a joint concert at one of Amsterdam's classical venues. The Sweelinck Orchestra is named after the great Dutch composer Jan Pieterszoon Sweelinck (1562–1621), organist of Amsterdam's Oude Kerk for over forty years and one of the most influential musicians of his age.",
     "The Conservatorium van Amsterdam's student orchestra and a choral ensemble in a joint concert, named in honour of Amsterdam's own Renaissance master Jan Pieterszoon Sweelinck.",
     "https://www.conservatoriumvanamsterdam.nl"),

    ("Het Wilde Wat — Iets nieuws onder de zon",
     "A concert by Het Wilde Wat under the direction of Tristan Knelange. The title Iets nieuws onder de zon ('Something New Under the Sun') suggests a programme exploring novelty, creativity, and what it means to make or encounter something truly original — a continuation of the ensemble's signature approach: mixing classical choral and instrumental repertoire with contemporary and popular music.",
     "Het Wilde Wat — Tristan Knelange's contemporary chamber ensemble — in a programme called Something New Under the Sun, mixing classical and contemporary voices in their characteristic genre-spanning style.",
     "https://stadsherstel.nl/cultuuragenda/het-wilde-wat-2/"),

    # ── Music ──────────────────────────────────────────────────────────────────
    ("Jon Cozart: Laughter Ever After",
     "Jon Cozart — YouTube sensation behind the 46-million-viewed After Ever After Disney parody and Harry Potter in 99 Seconds — brings his one-man show to Edinburgh Fringe. Performed at Underbelly Med Quad, the show blends technology, music, and comedy: behind him, four screens show his classic YouTube videos and provide harmonies with pre-recorded versions of himself, while live he sings his musical parodies and tells the story of how an internet kid becomes a live performer. 'A voice to die for... a natural storyteller' (The Wee Review).",
     "Jon Cozart's Edinburgh Fringe debut — the YouTube creator behind the 46-million-view After Ever After brings his musical comedy show to a stage, singing a cappella parodies with himself on four screens behind him and telling the story of how a YouTube channel becomes a real career.",
     "https://www.comedy.co.uk/fringe/2015/jon_cozart"),

    ("Chris Thile",
     "Chris Thile — MacArthur Fellow, Grammy Award winner, and the genre-defying mandolinist behind Nickel Creek and Punch Brothers — performs a solo concert. In his solo shows, Thile integrates original songs, traditional folk tunes, Bach sonatas and partitas, and a range of contemporary music, delivered with staggering technical mastery and warm, sweet high-tenor vocals. The Guardian calls him 'that rare being: an all-round musician who can settle into any style, from bluegrass to classical.'",
     "Chris Thile — MacArthur Fellow and the closest thing to a universal musician alive — performs solo: Bach partitas to bluegrass standards to original songs, all bound together by his incomparable mandolin and sweet high-tenor voice.",
     "https://en.wikipedia.org/wiki/Chris_Thile"),

    ("Rita Wilson",
     "Rita Wilson — actress, producer, and singer-songwriter — performs on her Sound of a Woman tour at Zonnehuis in Amsterdam Noord. The album marks a shift into her own artistic voice after years covering folk and country classics from the 1960s and 70s with artists including Willie Nelson, Elvis Costello, and Jimmy Webb. Personal, narrative songs about love, resilience, and self-development, with warm melodies rooted in classic country and coloured by modern pop.",
     "Rita Wilson's Sound of a Woman tour at Amsterdam's Zonnehuis — personal, narrative songs about love and resilience from the actress-turned-songwriter, performing her newest album in an intimate venue in Amsterdam Noord.",
     "https://www.paradiso.nl/en/program/rita-wilson-sound-of-a-woman-uk-europe-tour/2877728"),

    ("Kerst op het Zonneplein!",
     "Een feestelijke kerstviering op het Zonneplein in Amsterdam Noord, georganiseerd vanuit 't Zonnehuis. Een kleine marktje van lokale ondernemers van 11:00 tot 16:00 uur, gevolgd door live muziek door het Kometenkoor — zang, meezingmomenten en een kerstverhaal. Aansluitend worden kerstwensen uitgedeeld en de lichtjes ontstoken. Een gezellig, kleinschalig buurtfeest met het gevoel van een nieuwe traditie.",
     "A small neighbourhood Christmas festival at Zonneplein in Amsterdam Noord — a local market, live music from the Kometenkoor choir, and a communal lighting of the square as darkness falls. Low-key, local, and genuinely festive.",
     "https://zonnehuis.amsterdam/voorstelling/kerst-op-het-zonneplein/150138/"),
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
