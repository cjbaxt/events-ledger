"""
Seed script — imports all 24 stress-test events from events-ledger-data-entries.md.
Run from backend/ directory: python -m seed.seed
Requires DATABASE_URL in .env or environment.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from datetime import date, time as time_type
from decimal import Decimal
import uuid

from sqlmodel import Session
from app.db import engine
from app.models import (
    VenueOperator, Venue, Festival, Person, Ensemble,
    Work, MusicalPiece, Production, Event,
    EventMusic, EventClassical, ClassicalProgrammeItem,
    EventOpera, EventBallet, BalletProgrammeItem, BalletProgrammeMusic,
    EventDance, EventCircus, EventTheatre, EventCabaret,
    EventComedy, EventSpokenWord, EventTalk, EventExhibition,
)


# ---------------------------------------------------------------------------
# Stable UUIDs derived from the slug IDs in the data doc.
# Using uuid5 with a fixed namespace so they're deterministic and meaningful.
# ---------------------------------------------------------------------------
NS = uuid.UUID("12345678-1234-5678-1234-567812345678")


def uid(slug: str) -> uuid.UUID:
    return uuid.uuid5(NS, slug)


def seed():
    with Session(engine) as s:

        # ---------------------------------------------------------------
        # VenueOperators
        # ---------------------------------------------------------------
        vops = [
            VenueOperator(id=uid("vop-001"), name="Pleasance", website_url="https://pleasance.co.uk"),
            VenueOperator(id=uid("vop-002"), name="Assembly Festival", website_url="https://assemblyfestival.com"),
            VenueOperator(id=uid("vop-003"), name="Underbelly", website_url="https://underbelly.co.uk"),
            VenueOperator(id=uid("vop-004"), name="PBH Free Fringe", website_url="https://freefringe.org.uk"),
        ]
        s.add_all(vops)
        s.flush()

        # ---------------------------------------------------------------
        # Venues  (parents first, then children)
        # ---------------------------------------------------------------
        venues = [
            # Amsterdam
            Venue(id=uid("venue-001"), name="Nationale Opera & Ballet", city="Amsterdam", country="Netherlands", venue_type="theatre", maps_url="https://maps.google.com/?q=Amstel+3,+1011+PN+Amsterdam"),
            Venue(id=uid("venue-001b"), name="Grote Zaal (NOB)", parent_id=uid("venue-001"), city="Amsterdam", country="Netherlands", venue_type="theatre"),
            Venue(id=uid("venue-003"), name="Koninklijk Theater Carré", city="Amsterdam", country="Netherlands", venue_type="theatre", maps_url="https://maps.google.com/?q=Amstel+115,+1018+EM+Amsterdam"),
            Venue(id=uid("venue-005"), name="Royal Concertgebouw", city="Amsterdam", country="Netherlands", venue_type="concert_hall", maps_url="https://maps.google.com/?q=Concertgebouwplein+2,+1071+LR+Amsterdam"),
            Venue(id=uid("venue-005b"), name="Grote Zaal (Concertgebouw)", parent_id=uid("venue-005"), city="Amsterdam", country="Netherlands", venue_type="concert_hall"),
            Venue(id=uid("venue-006"), name="Muziekgebouw aan 't IJ", city="Amsterdam", country="Netherlands", venue_type="concert_hall", maps_url="https://maps.google.com/?q=Piet+Heinkade+1,+1019+BR+Amsterdam"),
            Venue(id=uid("venue-006b"), name="Grote Zaal (Muziekgebouw)", parent_id=uid("venue-006"), city="Amsterdam", country="Netherlands", venue_type="concert_hall"),
            Venue(id=uid("venue-007"), name="JoyJoyJoy Basilika", city="Amsterdam", country="Netherlands", venue_type="other", maps_url="https://maps.google.com/?q=Kometensingel+152,+1033+BZ+Amsterdam"),
            Venue(id=uid("venue-008"), name="DeLaMar", city="Amsterdam", country="Netherlands", venue_type="theatre", maps_url="https://maps.google.com/?q=Marnixstraat+402,+1017+PL+Amsterdam"),
            Venue(id=uid("venue-008b"), name="Wim Sonneveld zaal", parent_id=uid("venue-008"), city="Amsterdam", country="Netherlands", venue_type="theatre"),
            Venue(id=uid("venue-010"), name="Boom Chicago", city="Amsterdam", country="Netherlands", venue_type="theatre", maps_url="https://maps.google.com/?q=Rozengracht+117,+1016+LV+Amsterdam"),
            Venue(id=uid("venue-010b"), name="Main Theatre (Boom Chicago)", parent_id=uid("venue-010"), city="Amsterdam", country="Netherlands", venue_type="theatre"),
            Venue(id=uid("venue-014"), name="Ziggo Dome", city="Amsterdam", country="Netherlands", venue_type="arena", maps_url="https://maps.google.com/?q=De+Passage+100,+1101+AX+Amsterdam"),
            Venue(id=uid("venue-015"), name="Eye Filmmuseum", city="Amsterdam", country="Netherlands", venue_type="other", maps_url="https://maps.google.com/?q=IJpromenade+1,+1031+KK+Amsterdam"),
            # Edinburgh
            Venue(id=uid("venue-002"), name="EICC", city="Edinburgh", country="United Kingdom", venue_type="theatre", maps_url="https://maps.google.com/?q=EICC+Edinburgh+EH3+8EE"),
            Venue(id=uid("venue-002b"), name="Lomond Theatre", parent_id=uid("venue-002"), city="Edinburgh", country="United Kingdom", venue_type="theatre"),
            Venue(id=uid("venue-004"), name="Royal Highland Centre", city="Edinburgh (Ingliston)", country="United Kingdom", venue_type="outdoor", maps_url="https://maps.google.com/?q=Royal+Highland+Centre,+Ingliston,+Edinburgh"),
            Venue(id=uid("venue-009"), name="Bristo Square", city="Edinburgh", country="United Kingdom", venue_type="other", maps_url="https://maps.google.com/?q=Bristo+Square,+Edinburgh+EH8+9AL"),
            Venue(id=uid("venue-009b"), name="Pleasance Dome", parent_id=uid("venue-009"), operator_id=uid("vop-001"), city="Edinburgh", country="United Kingdom", venue_type="theatre"),
            Venue(id=uid("venue-009c"), name="Ace Dome", parent_id=uid("venue-009b"), city="Edinburgh", country="United Kingdom", venue_type="theatre"),
            Venue(id=uid("venue-009d"), name="Container 1 (Potterrow Plaza)", parent_id=uid("venue-009b"), city="Edinburgh", country="United Kingdom", venue_type="other"),
            Venue(id=uid("venue-011"), name="George Square", city="Edinburgh", country="United Kingdom", venue_type="other", maps_url="https://maps.google.com/?q=George+Square,+Edinburgh+EH8+9LH"),
            Venue(id=uid("venue-011b"), name="Assembly George Square Studios", parent_id=uid("venue-011"), operator_id=uid("vop-002"), city="Edinburgh", country="United Kingdom", venue_type="theatre"),
            Venue(id=uid("venue-011c"), name="Studio One", parent_id=uid("venue-011b"), city="Edinburgh", country="United Kingdom", venue_type="theatre"),
            Venue(id=uid("venue-011d"), name="Underground", parent_id=uid("venue-011b"), city="Edinburgh", country="United Kingdom", venue_type="theatre"),
            Venue(id=uid("venue-013"), name="The Meadows", city="Edinburgh", country="United Kingdom", venue_type="other", maps_url="https://maps.google.com/?q=Middle+Meadow+Walk,+Edinburgh+EH9+1AT"),
            Venue(id=uid("venue-013b"), name="Underbelly's Circus Hub", parent_id=uid("venue-013"), operator_id=uid("vop-003"), city="Edinburgh", country="United Kingdom", venue_type="circus_tent"),
            Venue(id=uid("venue-013c"), name="The Lafayette", parent_id=uid("venue-013b"), city="Edinburgh", country="United Kingdom", venue_type="circus_tent"),
            Venue(id=uid("venue-016"), name="Banshee Labyrinth", city="Edinburgh", country="United Kingdom", venue_type="other", maps_url="https://maps.google.com/?q=29-35+Niddry+Street,+Edinburgh+EH1+1LG"),
            Venue(id=uid("venue-016b"), name="Banqueting Hall", parent_id=uid("venue-016"), operator_id=uid("vop-004"), city="Edinburgh", country="United Kingdom", venue_type="other"),
            Venue(id=uid("venue-017"), name="Monkey Barrel Comedy", city="Edinburgh", country="United Kingdom", venue_type="other", maps_url="https://maps.google.com/?q=9-12+Blair+Street,+Edinburgh+EH1+1QR"),
            Venue(id=uid("venue-017b"), name="MB3", parent_id=uid("venue-017"), city="Edinburgh", country="United Kingdom", venue_type="other"),
            Venue(id=uid("venue-018"), name="Dynamic Earth", city="Edinburgh", country="United Kingdom", venue_type="other", maps_url="https://maps.google.com/?q=Holyrood+Road,+Edinburgh+EH8+8AS"),
            # Den Haag
            Venue(id=uid("venue-012"), name="Big Top — Malieveld Den Haag", city="The Hague", country="Netherlands", venue_type="circus_tent", maps_url="https://maps.google.com/?q=Malieveld,+Boorlaan+1,+2585+Den+Haag"),
        ]
        s.add_all(venues)
        s.flush()

        # ---------------------------------------------------------------
        # Festivals
        # ---------------------------------------------------------------
        festivals = [
            Festival(id=uid("fest-001"), name="Holland Festival", edition="2026", city="Amsterdam", website_url="https://hollandfestival.nl"),
            Festival(id=uid("fest-002"), name="Edinburgh Festival Fringe", edition="2014", city="Edinburgh", website_url="https://edfringe.com"),
            Festival(id=uid("fest-003"), name="Edinburgh Summer Sessions", edition="2025", city="Edinburgh", website_url="https://summersessions.com"),
            Festival(id=uid("fest-004"), name="Edinburgh Festival Fringe", edition="2025", city="Edinburgh", website_url="https://edfringe.com"),
            Festival(id=uid("fest-005"), name="Edinburgh Festival Fringe", edition="2024", city="Edinburgh", website_url="https://edfringe.com"),
            Festival(id=uid("fest-006"), name="Edinburgh Festival Fringe", edition="2023", city="Edinburgh", website_url="https://edfringe.com"),
        ]
        s.add_all(festivals)
        s.flush()

        # ---------------------------------------------------------------
        # Ensembles
        # ---------------------------------------------------------------
        ensembles = [
            Ensemble(id=uid("ens-001"), name="Dutch National Ballet", type="dance_company"),
            Ensemble(id=uid("ens-002"), name="Dutch National Ballet Orchestra", type="orchestra"),
            Ensemble(id=uid("ens-003"), name="Academy of St Martin in the Fields", type="orchestra"),
            Ensemble(id=uid("ens-004"), name="Het Wilde Wat", type="choir", notes="Amsterdam choir, conducted by Koen Leenaers"),
            Ensemble(id=uid("ens-005"), name="Netherlands Chamber Orchestra", type="orchestra"),
            Ensemble(id=uid("ens-006"), name="Oxygen", type="dance_company", notes="Contemporary dance company"),
            Ensemble(id=uid("ens-007"), name="Boom Chicago", type="theatre_company", notes="Amsterdam improv comedy company; founded 1993"),
            Ensemble(id=uid("ens-008"), name="Baby Wants Candy", type="theatre_company", notes="Chicago-originated improv musical ensemble"),
            Ensemble(id=uid("ens-009"), name="Cirque du Soleil", type="circus_company", notes="Montreal-based"),
            Ensemble(id=uid("ens-010"), name="Circa", type="circus_company", notes="Australian contemporary circus company"),
            Ensemble(id=uid("ens-011"), name="Opera2Day", type="other", notes="Dutch opera company"),
            Ensemble(id=uid("ens-012"), name="Netherlands Bach Society", type="orchestra", notes="Historically informed ensemble"),
            Ensemble(id=uid("ens-013"), name="Werq the World", type="other", notes="Touring drag variety show; produced by Voss Events / World of Wonder"),
            Ensemble(id=uid("ens-014"), name="Darkfield", type="theatre_company", notes="Immersive experience company; shipping container shows"),
        ]
        s.add_all(ensembles)
        s.flush()

        # ---------------------------------------------------------------
        # Persons (130 entries — abbreviated for clarity, all included)
        # ---------------------------------------------------------------
        persons = [
            Person(id=uid("per-001"), name="Nathan Brock", roles=["conductor"]),
            Person(id=uid("per-002"), name="David Dawson", roles=["choreographer"]),
            Person(id=uid("per-003"), name="Krzysztof Pastor", roles=["choreographer"]),
            Person(id=uid("per-004"), name="Alexei Ratmansky", roles=["choreographer"]),
            Person(id=uid("per-005"), name="Greg Haines", roles=["composer"]),
            Person(id=uid("per-006"), name="Philip Glass", roles=["composer"]),
            Person(id=uid("per-007"), name="Gustav Mahler", roles=["composer"]),
            Person(id=uid("per-008"), name="Daniel Sloss", roles=["performer"], notes="comedian"),
            Person(id=uid("per-009"), name="Dita Von Teese", roles=["performer", "choreographer"], notes="creative director"),
            Person(id=uid("per-010"), name="BenDeLaCreme", roles=["performer", "host"], notes="drag icon"),
            Person(id=uid("per-011"), name="Chappell Roan", roles=["performer"]),
            Person(id=uid("per-012"), name="JADE", roles=["performer"], notes="support act"),
            Person(id=uid("per-013"), name="Joshua Bell", roles=["performer", "conductor"], notes="violin; directs from violin"),
            Person(id=uid("per-014"), name="Floor Kes", roles=["performer"], notes="violin"),
            Person(id=uid("per-015"), name="Alicia De Keulenaer", roles=["performer"], notes="violin"),
            Person(id=uid("per-016"), name="Katja Naegele", roles=["performer"], notes="violin"),
            Person(id=uid("per-017"), name="Natasja Douma", roles=["performer"], notes="piano"),
            Person(id=uid("per-018"), name="Jorian van Nee", roles=["performer"], notes="piano"),
            Person(id=uid("per-019"), name="Alfred Schnittke", roles=["composer"]),
            Person(id=uid("per-020"), name="George Gershwin", roles=["composer"]),
            Person(id=uid("per-021"), name="Jascha Heifetz", roles=["arranger", "performer"]),
            Person(id=uid("per-022"), name="Ernő Dohnányi", roles=["composer"]),
            Person(id=uid("per-023"), name="Pyotr Ilyich Tchaikovsky", roles=["composer"]),
            Person(id=uid("per-024"), name="Johannes Brahms", roles=["composer"]),
            Person(id=uid("per-025"), name="Ernest Bloch", roles=["composer"]),
            Person(id=uid("per-026"), name="Sarah Oates", roles=["performer"], notes="violin soloist (Dutch National Ballet Orchestra)"),
            Person(id=uid("per-027"), name="Bernard Andrès", roles=["composer"]),
            Person(id=uid("per-028"), name="Maurice Ravel", roles=["composer"]),
            Person(id=uid("per-029"), name="Luigi Rossi", roles=["composer"]),
            Person(id=uid("per-030"), name="Frédéric Chopin", roles=["composer"]),
            Person(id=uid("per-031"), name="Franz Liszt", roles=["composer"]),
            Person(id=uid("per-032"), name="Ludwig Spohr", roles=["composer"]),
            Person(id=uid("per-033"), name="Claude Debussy", roles=["composer"]),
            Person(id=uid("per-034"), name="Astor Piazzolla", roles=["composer"]),
            Person(id=uid("per-035"), name="Ana Teresa Pereira", roles=["composer"], notes="born 2003"),
            Person(id=uid("per-036"), name="Enrique Granados", roles=["composer"]),
            Person(id=uid("per-037"), name="Monika Stadler", roles=["composer"]),
            Person(id=uid("per-038"), name="Chick Corea", roles=["composer"]),
            Person(id=uid("per-039"), name="Beatriz Sequeira Nunes Carolino", roles=["performer"], notes="harp"),
            Person(id=uid("per-040"), name="Catarina Martins de Araujo", roles=["performer"], notes="harp"),
            Person(id=uid("per-041"), name="Bradley Swinnen", roles=["performer"], notes="harp"),
            Person(id=uid("per-042"), name="Sissi Deng", roles=["performer"], notes="harp"),
            Person(id=uid("per-043"), name="Laura de Moura Durao", roles=["performer"], notes="harp"),
            Person(id=uid("per-044"), name="Zeynep Göktürk", roles=["performer"], notes="harp"),
            Person(id=uid("per-045"), name="Camila Nogueira Fernandes", roles=["performer"], notes="harp"),
            Person(id=uid("per-046"), name="Maria Miguel Mota", roles=["performer"], notes="harp"),
            Person(id=uid("per-047"), name="Saya Toyama", roles=["performer"], notes="harp"),
            Person(id=uid("per-048"), name="Elizabeth Cerra Conroy", roles=["performer"], notes="harp"),
            Person(id=uid("per-049"), name="Kiki Jin", roles=["performer"], notes="harp"),
            Person(id=uid("per-050"), name="Sergei Prokofiev", roles=["composer"]),
            Person(id=uid("per-051"), name="Samuel Barber", roles=["composer"]),
            Person(id=uid("per-052"), name="Camille Saint-Saëns", roles=["composer"]),
            Person(id=uid("per-053"), name="Georges Bizet", roles=["composer"]),
            Person(id=uid("per-054"), name="Koen Leenaers", roles=["conductor"]),
            Person(id=uid("per-055"), name="Ola Gjeilo", roles=["composer"]),
            Person(id=uid("per-056"), name="Pärt Uusberg", roles=["composer"]),
            Person(id=uid("per-057"), name="Philip Lawson", roles=["arranger"]),
            Person(id=uid("per-058"), name="James MacMillan", roles=["composer"]),
            Person(id=uid("per-059"), name="John Tavener", roles=["composer"]),
            Person(id=uid("per-060"), name="Davin Curtis", roles=["arranger"]),
            Person(id=uid("per-061"), name="Raymond Lévesque", roles=["composer"], notes="Québécois singer-songwriter; wrote original Quand les hommes vivront d'amour (1956). Glass's 1986 choral setting is a distinct work."),
            Person(id=uid("per-062"), name="Wolfgang Amadeus Mozart", roles=["composer"]),
            Person(id=uid("per-063"), name="Lorenzo Da Ponte", roles=["librettist"]),
            Person(id=uid("per-064"), name="Francesco Corti", roles=["conductor"]),
            Person(id=uid("per-065"), name="Kirill Serebrennikov", roles=["director"], notes="Also set and costume design for this production"),
            Person(id=uid("per-066"), name="Evgeny Kulagin", roles=["director"], notes="Revival director"),
            Person(id=uid("per-067"), name="Björn Bürger", roles=["performer"], notes="baritone"),
            Person(id=uid("per-068"), name="Olga Kulchynska", roles=["performer"], notes="soprano"),
            Person(id=uid("per-069"), name="Emily Pogorelc", roles=["performer"], notes="soprano"),
            Person(id=uid("per-070"), name="Michael Nagl", roles=["performer"], notes="bass-baritone"),
            Person(id=uid("per-071"), name="Cecilia Molinari", roles=["performer"], notes="mezzo-soprano"),
            Person(id=uid("per-072"), name="Véronique Gens", roles=["performer"], notes="soprano"),
            Person(id=uid("per-073"), name="Anthony Robin Schneider", roles=["performer"], notes="bass"),
            Person(id=uid("per-074"), name="Steven van der Linden", roles=["performer"], notes="tenor; Dutch National Opera Studio"),
            Person(id=uid("per-075"), name="Frederik Bergman", roles=["performer"], notes="baritone"),
            Person(id=uid("per-076"), name="Georgy Kudrenko", roles=["performer"], notes="actor (silent role — Cherubino)"),
            Person(id=uid("per-077"), name="Marieke Reuten", roles=["performer"], notes="actress (The Old Woman)"),
            Person(id=uid("per-078"), name="Nikita Elenev", roles=["performer"], notes="actor"),
            Person(id=uid("per-079"), name="Rowan Kievits", roles=["performer"], notes="actor"),
            Person(id=uid("per-080"), name="Jennifer Romen", roles=["choreographer"], notes="Artistic director of Oxygen"),
            Person(id=uid("per-081"), name="Subp Yao", roles=["composer"], notes="Music curator/director for Oxygen"),
            Person(id=uid("per-082"), name="Henry Naylor", roles=["playwright", "performer"], notes="Solo playwright-performer; former Spitting Image writer"),
            Person(id=uid("per-083"), name="Anaïs Mitchell", roles=["composer", "playwright"], notes="Creator of Hadestown"),
            Person(id=uid("per-084"), name="Rachel Chavkin", roles=["director"]),
            Person(id=uid("per-085"), name="Jeangu Macrooy", roles=["performer"], notes="tenor; Orpheus"),
            Person(id=uid("per-086"), name="Sara Afiba", roles=["performer"], notes="soprano; Eurydice"),
            Person(id=uid("per-087"), name="Edwin Jonker", roles=["performer"], notes="bass-baritone; Hades"),
            Person(id=uid("per-088"), name="Joy Wielkens", roles=["performer"], notes="Persephone"),
            Person(id=uid("per-089"), name="Claudia de Breij", roles=["performer"], notes="Hermes (alternating)"),
            Person(id=uid("per-090"), name="Maarten Heijmans", roles=["performer"], notes="Hermes (alternating)"),
            Person(id=uid("per-091"), name="Aïcha Gill", roles=["performer"], notes="Fate"),
            Person(id=uid("per-092"), name="April Darby", roles=["performer"], notes="Fate"),
            Person(id=uid("per-093"), name="Joni Ayton-Kent", roles=["performer"], notes="Fate"),
            Person(id=uid("per-094"), name="Michel Laprise", roles=["director"], notes="Created and directed Kurios"),
            Person(id=uid("per-095"), name="Raphaël Beau", roles=["composer"], notes="Kurios score"),
            Person(id=uid("per-096"), name="Yaron Lifschitz", roles=["director", "choreographer"], notes="Artistic director of Circa"),
            Person(id=uid("per-097"), name="Ori Lichtik", roles=["composer"], notes="Original music for Humans 2.0"),
            Person(id=uid("per-098"), name="Georg Friedrich Handel", roles=["composer"]),
            Person(id=uid("per-099"), name="Serge van Veggel", roles=["director"], notes="Artistic director of Opera2Day; concept and scenario"),
            Person(id=uid("per-100"), name="Aedín Walsh", roles=["director"], notes="Circus director; co-director of The Opera Circus"),
            Person(id=uid("per-101"), name="Hernán Schvartzman", roles=["conductor"], notes="Musical director of Opera2Day"),
            Person(id=uid("per-102"), name="Stefano Simone Pintor", roles=["librettist"], notes="Co-wrote libretto with Van Veggel"),
            Person(id=uid("per-103"), name="Maria Schellenberg", roles=["performer"], notes="Mezzo-soprano; Armata"),
            Person(id=uid("per-104"), name="James Hall", roles=["performer"], notes="Countertenor; Armato"),
            Person(id=uid("per-105"), name="Maud Bessard-Morandas", roles=["performer"], notes="Soprano; The Sun / circus troupe"),
            Person(id=uid("per-106"), name="Joe Baker", roles=["performer"], notes="Circus artist"),
            Person(id=uid("per-107"), name="Jean-Charles Gaume", roles=["performer"], notes="Circus artist"),
            Person(id=uid("per-108"), name="Arend de Jonge", roles=["performer"], notes="Circus artist"),
            Person(id=uid("per-109"), name="Luise Hoffmann", roles=["performer"], notes="Circus artist"),
            Person(id=uid("per-110"), name="Mira Leonard", roles=["performer"], notes="Circus artist"),
            Person(id=uid("per-111"), name="Angeria Paris VanMichaels", roles=["performer"], notes="drag queen"),
            Person(id=uid("per-112"), name="Aquaria", roles=["performer"], notes="drag queen"),
            Person(id=uid("per-113"), name="Bosco", roles=["performer"], notes="drag queen"),
            Person(id=uid("per-114"), name="Daya Betty", roles=["performer"], notes="drag queen"),
            Person(id=uid("per-115"), name="Ginger Minj", roles=["performer"], notes="drag queen"),
            Person(id=uid("per-116"), name="Jaida Essence Hall", roles=["performer"], notes="drag queen"),
            Person(id=uid("per-117"), name="Kandy Muse", roles=["performer"], notes="drag queen"),
            Person(id=uid("per-118"), name="Laganja Estranja", roles=["performer"], notes="drag queen"),
            Person(id=uid("per-119"), name="Tilda Swinton", roles=["performer", "artist"], notes="Subject and co-creator of the Eye exhibition"),
            Person(id=uid("per-120"), name="Pedro Almodóvar", roles=["director", "artist"]),
            Person(id=uid("per-121"), name="Luca Guadagnino", roles=["director", "artist"]),
            Person(id=uid("per-122"), name="Joanna Hogg", roles=["director", "artist"]),
            Person(id=uid("per-123"), name="Derek Jarman", roles=["director", "artist"], notes="1942–1994"),
            Person(id=uid("per-124"), name="Jim Jarmusch", roles=["director", "artist"]),
            Person(id=uid("per-125"), name="Olivier Saillard", roles=["artist"], notes="Fashion historian and performance artist"),
            Person(id=uid("per-126"), name="Tim Walker", roles=["artist"], notes="Photographer"),
            Person(id=uid("per-127"), name="Apichatpong Weerasethakul", roles=["director", "artist"]),
            Person(id=uid("per-128"), name="Dean Tsang", roles=["performer"], notes="Spoken word artist; Bay Fringe Critics Choice Award winner"),
            Person(id=uid("per-129"), name="Catherine Bohart", roles=["performer", "host"], notes="Irish comedian; host of Who Runs the World? on BBC Radio 4"),
            Person(id=uid("per-130"), name="Daisy Doris May", roles=["performer"], notes="Character comedian and drag king; characters: Steve Porters, The Divine Karen Moonstone, Häns Off"),
        ]
        s.add_all(persons)
        s.flush()

        # ---------------------------------------------------------------
        # Works
        # ---------------------------------------------------------------
        works = [
            Work(id=uid("work-001"), title="Empire Noir", type="ballet", creator_id=uid("per-002"), year=2015),
            Work(id=uid("work-002"), title="Refraction", type="ballet", creator_id=uid("per-003"), year=2026),
            Work(id=uid("work-003"), title="Solitude", type="ballet", creator_id=uid("per-004"), year=2024),
            Work(id=uid("work-004"), title="Le nozze di Figaro", type="opera", creator_id=uid("per-062"), year=1786, notes="Libretto by Lorenzo Da Ponte"),
            Work(id=uid("work-005"), title="The Rise", type="dance_show", creator_id=uid("per-080"), year=2026, notes="Produced by Senf Theaterproducties"),
            Work(id=uid("work-006"), title="Monstering the Rocketman", type="play", creator_id=uid("per-082"), year=2025, notes="Solo show"),
            Work(id=uid("work-007"), title="Hadestown", type="musical", creator_id=uid("per-083"), year=2019),
            Work(id=uid("work-008"), title="Kurios: Cabinet of Curiosities", type="circus_show", creator_id=uid("per-094"), year=2014, notes="Touring Cirque du Soleil production"),
            Work(id=uid("work-009"), title="Humans 2.0", type="circus_show", creator_id=uid("per-096"), year=2021, notes="World premiere Sydney 2021"),
            Work(id=uid("work-010"), title="The Opera Circus", type="opera", creator_id=uid("per-099"), year=2026, notes="Pasticcio of Handel works; libretto by Pintor and Van Veggel"),
            Work(id=uid("work-011"), title="Big Night Out", type="other", creator_id=uid("per-130"), year=2025, notes="Character comedy; three characters by one performer"),
            Work(id=uid("work-012"), title="Our Anxious Measurements III", type="spoken_word", creator_id=uid("per-128"), year=2025, notes="Third and final instalment of the Anxious Measurements trilogy"),
            Work(id=uid("work-013"), title="Flight", type="other", year=2018, notes="Darkfield immersive; shipping container, binaural audio, complete darkness"),
        ]
        s.add_all(works)
        s.flush()

        # ---------------------------------------------------------------
        # MusicalPieces
        # Note: mp-010-orig must be inserted before mp-010 (self-ref FK)
        # ---------------------------------------------------------------
        pieces = [
            MusicalPiece(id=uid("mp-001"), title="Empire Noir (original score)", composer_id=uid("per-005"), year=2015),
            MusicalPiece(id=uid("mp-002"), title="Violin Concerto No. 1", composer_id=uid("per-006"), year=1987),
            MusicalPiece(id=uid("mp-003"), title="Symphony No. 1 in D major", movement="III. Funeral March", composer_id=uid("per-007"), year=1888),
            MusicalPiece(id=uid("mp-004"), title="Symphony No. 5 in C-sharp minor", movement="IV. Adagietto", composer_id=uid("per-007"), year=1902),
            MusicalPiece(id=uid("mp-005"), title="Classical Symphony", composer_id=uid("per-050"), year=1917, catalogue_number="Op. 25"),
            MusicalPiece(id=uid("mp-006"), title="Adagio for Strings", composer_id=uid("per-051"), year=1936, catalogue_number="Op. 11"),
            MusicalPiece(id=uid("mp-007"), title="Violin Concerto No. 3 in B minor", composer_id=uid("per-052"), year=1880, catalogue_number="Op. 61"),
            MusicalPiece(id=uid("mp-008"), title="Symphony No. 1 in C major", composer_id=uid("per-053"), year=1855),
            MusicalPiece(id=uid("mp-009"), title="Violin Sonata No. 1", movement="IV. Allegretto scherzando", composer_id=uid("per-019"), year=1963),
            # Original Gershwin must come before the Heifetz arrangement
            MusicalPiece(id=uid("mp-010-orig"), title="Porgy and Bess — Bess, you is my woman now", composer_id=uid("per-020"), year=1935, notes="Original"),
            MusicalPiece(id=uid("mp-010"), title="Porgy and Bess — Bess, you is my woman now", composer_id=uid("per-020"), arranger_id=uid("per-021"), original_work_id=uid("mp-010-orig"), year=1947, notes="Heifetz arrangement"),
            MusicalPiece(id=uid("mp-011"), title="Violin Sonata in C-sharp minor", movement="I. Allegro appasionato", composer_id=uid("per-022"), year=1911, catalogue_number="Op. 21"),
            MusicalPiece(id=uid("mp-012"), title="Valse Scherzo in C", composer_id=uid("per-023"), year=1877, catalogue_number="Op. 34"),
            MusicalPiece(id=uid("mp-013"), title="Violin Sonata No. 3 in D minor", movement="I. Allegro", composer_id=uid("per-024"), year=1886, catalogue_number="Op. 108"),
            MusicalPiece(id=uid("mp-014"), title="Baal Shem", movement="II. Nigun", composer_id=uid("per-025"), year=1923, catalogue_number="B. 47"),
            MusicalPiece(id=uid("mp-015"), title="A Fresca", composer_id=uid("per-027"), year=1988),
            MusicalPiece(id=uid("mp-016"), title="Ma mère l'oye", movement="Le petit poucet", composer_id=uid("per-028"), year=1908),
            MusicalPiece(id=uid("mp-017"), title="Ma mère l'oye", movement="Laideronette", composer_id=uid("per-028"), year=1908),
            MusicalPiece(id=uid("mp-018"), title="Ma mère l'oye", movement="Impératrice des pagodes", composer_id=uid("per-028"), year=1908),
            MusicalPiece(id=uid("mp-019"), title="Passaglia in a", composer_id=uid("per-029"), notes="ca.1660"),
            MusicalPiece(id=uid("mp-020"), title="Waltz No. 6 in D-flat major", composer_id=uid("per-030"), year=1846, catalogue_number="Op. 64 No. 1"),
            MusicalPiece(id=uid("mp-021"), title="Au bord d'une source", composer_id=uid("per-031"), year=1848, catalogue_number="S.160/4"),
            MusicalPiece(id=uid("mp-022"), title="Fantaisie in C minor", composer_id=uid("per-032"), year=1807, catalogue_number="Op. 35"),
            MusicalPiece(id=uid("mp-023"), title="Petite suite", movement="Menuet", composer_id=uid("per-033"), year=1886, catalogue_number="L. 65"),
            MusicalPiece(id=uid("mp-024"), title="Parvis", composer_id=uid("per-027"), year=1974),
            MusicalPiece(id=uid("mp-025"), title="Oblivion", composer_id=uid("per-034"), year=1982),
            MusicalPiece(id=uid("mp-026"), title="Quando eu era pequeninо", composer_id=uid("per-035")),
            MusicalPiece(id=uid("mp-027"), title="Danza española No. 5", composer_id=uid("per-036"), year=1890),
            MusicalPiece(id=uid("mp-028"), title="African Reflections", composer_id=uid("per-037"), year=2010),
            MusicalPiece(id=uid("mp-029"), title="Spain", composer_id=uid("per-038"), year=1971),
            MusicalPiece(id=uid("mp-030"), title="Ubi Caritas", composer_text="trad. Gregorian", arranger_id=uid("per-055"), notes="Gjeilo arrangement of Gregorian chant"),
            MusicalPiece(id=uid("mp-031"), title="Three Songs: There Are Some Men", composer_id=uid("per-006"), year=1986, notes="text: Leonard Cohen"),
            MusicalPiece(id=uid("mp-032"), title="Ave Verum", composer_id=uid("per-052"), notes="Programme also lists 'trad. gregoriaans' — possibly referencing the plainchant source"),
            MusicalPiece(id=uid("mp-033"), title="Muusika", composer_id=uid("per-056"), notes="text: Juhan Liv"),
            MusicalPiece(id=uid("mp-034"), title="Three Songs: Quand les hommes vivront d'amour", composer_id=uid("per-006"), year=1986, notes="text: Raymond Lévesque; orig. song by Lévesque 1956"),
            MusicalPiece(id=uid("mp-035"), title="Down to the River to Pray", composer_text="trad. American", arranger_id=uid("per-057")),
            MusicalPiece(id=uid("mp-036"), title="O Radiant Dawn", composer_id=uid("per-058"), notes="text: O Oriens"),
            MusicalPiece(id=uid("mp-037"), title="Kaval Sviri", composer_text="trad. Bulgarian, arr. Le Mystère des Voix Bulgares"),
            MusicalPiece(id=uid("mp-038"), title="Three Songs: Pierre de Soleil", composer_id=uid("per-006"), year=1986, notes="text: Octavio Paz"),
            MusicalPiece(id=uid("mp-039"), title="The Lamb", composer_id=uid("per-059"), notes="text: William Blake"),
            MusicalPiece(id=uid("mp-040"), title="Ripe and Ruin", composer_text="Alt-J (arr. Davin Curtis)", arranger_id=uid("per-060"), year=2012),
        ]
        s.add_all(pieces)
        s.flush()

        # ---------------------------------------------------------------
        # Productions
        # ---------------------------------------------------------------
        productions = [
            Production(id=uid("prod-001"), work_id=uid("work-004"), title="Le nozze di Figaro — DNO 2026", director_id=uid("per-065"), notes="Revival director: Evgeny Kulagin. Co-production with Komische Oper Berlin."),
            Production(id=uid("prod-002"), work_id=uid("work-007"), title="Hadestown — Carré 2025", director_id=uid("per-084"), notes="Dutch-British cast. Extended to 6 Sept 2025."),
            Production(id=uid("prod-003"), work_id=uid("work-010"), title="The Opera Circus — Opera2Day 2026", director_id=uid("per-099"), notes="Co-directed by Aedín Walsh (circus). Co-produced with Netherlands Bach Society."),
        ]
        s.add_all(productions)

        s.flush()  # ensure all FKs are resolvable before events

        # ---------------------------------------------------------------
        # Events + extension tables
        # ---------------------------------------------------------------

        # evt-001 — Masters of Movement (ballet)
        e1 = Event(id=uid("evt-001"), date=date(2026, 6, 11), time=time_type(20, 15), venue_id=uid("venue-001b"), festival_id=uid("fest-001"), type="ballet", title="Masters of Movement", price_paid=Decimal("30.00"), currency="EUR", data_completeness="partial", notes="Cast not fully documented by role.")
        s.add(e1)
        s.add(EventBallet(event_id=uid("evt-001"), subtype="mixed_bill", company_id=uid("ens-001"), orchestra_id=uid("ens-002"), conductor_id=uid("per-001")))
        s.flush()
        bpi1 = BalletProgrammeItem(id=uid("bpi-001-1"), event_id=uid("evt-001"), work_id=uid("work-001"), choreographer_id=uid("per-002"), order=1)
        bpi2 = BalletProgrammeItem(id=uid("bpi-001-2"), event_id=uid("evt-001"), work_id=uid("work-002"), choreographer_id=uid("per-003"), soloists=[uid("per-026")], order=2)
        bpi3 = BalletProgrammeItem(id=uid("bpi-001-3"), event_id=uid("evt-001"), work_id=uid("work-003"), choreographer_id=uid("per-004"), order=3)
        s.add_all([bpi1, bpi2, bpi3])
        s.flush()
        s.add_all([
            BalletProgrammeMusic(id=uid("bpm-001-1"), programme_item_id=uid("bpi-001-1"), musical_piece_id=uid("mp-001"), order=1),
            BalletProgrammeMusic(id=uid("bpm-001-2"), programme_item_id=uid("bpi-001-2"), musical_piece_id=uid("mp-002"), order=1),
            BalletProgrammeMusic(id=uid("bpm-001-3"), programme_item_id=uid("bpi-001-3"), musical_piece_id=uid("mp-003"), order=1),
            BalletProgrammeMusic(id=uid("bpm-001-4"), programme_item_id=uid("bpi-001-3"), musical_piece_id=uid("mp-004"), order=2),
        ])

        # evt-002 — Daniel Sloss: Really…?! (comedy)
        s.add(Event(id=uid("evt-002"), date=date(2014, 8, 5), time=time_type(20, 30), venue_id=uid("venue-002b"), festival_id=uid("fest-002"), type="comedy", title="Daniel Sloss: Really…?!", price_paid=Decimal("9.65"), currency="GBP", data_completeness="complete", notes="£19.30 ÷ 2 tickets incl. £1.80 handling fee."))
        s.add(EventComedy(event_id=uid("evt-002"), subtype="standup", performer_id=uid("per-008"), tour_name="Really…?!"))

        # evt-003 — Dita Von Teese: Nocturnelle (cabaret)
        s.add(Event(id=uid("evt-003"), date=date(2026, 3, 28), venue_id=uid("venue-003"), type="cabaret", title="Dita Von Teese: Nocturnelle", price_paid=Decimal("60.62"), currency="EUR", data_completeness="partial", notes="Resale via TicketSwap. Supporting cast not individually named."))
        s.add(EventCabaret(event_id=uid("evt-003"), subtype="burlesque", headliner_id=uid("per-009"), host_id=uid("per-010"), tour_name="Nocturnelle"))

        # evt-004 — Chappell Roan (music)
        s.add(Event(id=uid("evt-004"), date=date(2025, 8, 27), time=time_type(20, 45), venue_id=uid("venue-004"), festival_id=uid("fest-003"), type="music", title="Chappell Roan — Summer Sessions Edinburgh", price_paid=Decimal("75.00"), currency="GBP", data_completeness="complete"))
        s.add(EventMusic(
            event_id=uid("evt-004"),
            subtype="gig",
            headliner_person_id=uid("per-011"),
            support_act_person_ids=[uid("per-012")],
            tour_name="Visions of Damsels & Other Dangerous Things",
            setlist=["Super Graphic Ultra Modern Girl", "Femininomenon", "After Midnight", "Naked in Manhattan", "Guilty Pleasure", "Casual", "The Subway", "HOT TO GO!", "Barracuda (Heart cover)", "Picture You", "Love Me Anyway", "The Giver", "Red Wine Supernova", "Coffee", "Good Luck, Babe!", "My Kink Is Karma", "California", "Pink Pony Club"],
            setlist_fm_url="https://www.setlist.fm/setlist/chappell-roan/2025/royal-highland-centre-showground-ingliston-scotland-53597729.html",
        ))

        # evt-005 — Joshua Bell & ASMF (classical)
        s.add(Event(id=uid("evt-005"), date=date(2019, 1, 8), time=time_type(20, 15), venue_id=uid("venue-005b"), type="classical", title="Joshua Bell & Academy of St Martin in the Fields", price_paid=Decimal("18.73"), currency="EUR", data_completeness="complete", notes="€37.46 ÷ 2 tickets incl. €2.50 transaction fee. Seat: Hoekbalkon Noord rij 5 stoel 41/42. Joshua Bell directing from the violin."))
        s.add(EventClassical(event_id=uid("evt-005"), subtype="orchestral", ensemble_id=uid("ens-003"), conductor_id=uid("per-013")))
        s.flush()
        s.add_all([
            ClassicalProgrammeItem(id=uid("cpi-005-1"), event_id=uid("evt-005"), musical_piece_id=uid("mp-005"), order=1),
            ClassicalProgrammeItem(id=uid("cpi-005-2"), event_id=uid("evt-005"), musical_piece_id=uid("mp-007"), soloists=[uid("per-013")], order=2),
            ClassicalProgrammeItem(id=uid("cpi-005-3"), event_id=uid("evt-005"), musical_piece_id=uid("mp-006"), order=3),
            ClassicalProgrammeItem(id=uid("cpi-005-4"), event_id=uid("evt-005"), musical_piece_id=uid("mp-008"), order=4),
        ])

        # evt-006 — Floor Kes, Alicia De Keulenaer + Katja Naegele (classical)
        s.add(Event(id=uid("evt-006"), date=date(2026, 5, 8), time=time_type(12, 30), venue_id=uid("venue-006b"), type="classical", title="Floor Kes, Alicia De Keulenaer + Katja Naegele", price_paid=Decimal("6.50"), currency="EUR", data_completeness="complete", notes="Drie winnaars Coosje Wijzenbeek Prijs. Lunchconcert i.s.m. Het Muziekinstrumentenfonds. Programme recovered from physical programme photo."))
        s.add(EventClassical(event_id=uid("evt-006"), subtype="recital"))
        s.flush()
        s.add_all([
            ClassicalProgrammeItem(id=uid("cpi-006-1"), event_id=uid("evt-006"), musical_piece_id=uid("mp-009"), soloists=[uid("per-014"), uid("per-017")], order=1),
            ClassicalProgrammeItem(id=uid("cpi-006-2"), event_id=uid("evt-006"), musical_piece_id=uid("mp-010"), soloists=[uid("per-014"), uid("per-017")], order=2),
            ClassicalProgrammeItem(id=uid("cpi-006-3"), event_id=uid("evt-006"), musical_piece_id=uid("mp-011"), soloists=[uid("per-015"), uid("per-017")], order=3),
            ClassicalProgrammeItem(id=uid("cpi-006-4"), event_id=uid("evt-006"), musical_piece_id=uid("mp-012"), soloists=[uid("per-015"), uid("per-017")], order=4),
            ClassicalProgrammeItem(id=uid("cpi-006-5"), event_id=uid("evt-006"), musical_piece_id=uid("mp-013"), soloists=[uid("per-016"), uid("per-018")], order=5),
            ClassicalProgrammeItem(id=uid("cpi-006-6"), event_id=uid("evt-006"), musical_piece_id=uid("mp-014"), soloists=[uid("per-016"), uid("per-018")], order=6),
        ])

        # evt-007 — CvA Harp (classical)
        s.add(Event(id=uid("evt-007"), date=date(2026, 5, 14), time=time_type(12, 30), venue_id=uid("venue-006b"), type="classical", title="CvA Harp", price_paid=Decimal("6.50"), currency="EUR", data_completeness="complete", notes="Lunchconcert i.s.m. Conservatorium van Amsterdam. All harp. Harpklas onder leiding van Sandrine Chatron."))
        s.add(EventClassical(event_id=uid("evt-007"), subtype="recital"))
        s.flush()
        harp_performers = {
            "mp-015": [uid("per-042"), uid("per-044"), uid("per-041"), uid("per-039")],
            "mp-016": [uid("per-047"), uid("per-044"), uid("per-045")],
            "mp-017": [uid("per-047"), uid("per-044"), uid("per-045")],
            "mp-018": [uid("per-047"), uid("per-044"), uid("per-045")],
            "mp-019": [uid("per-043")],
            "mp-020": [uid("per-047"), uid("per-042"), uid("per-044"), uid("per-040"), uid("per-039")],
            "mp-021": [uid("per-046"), uid("per-040"), uid("per-049"), uid("per-041")],
            "mp-022": [uid("per-048")],
            "mp-023": [uid("per-043"), uid("per-041"), uid("per-039"), uid("per-042")],
            "mp-024": [uid("per-040"), uid("per-039")],
            "mp-025": [uid("per-043"), uid("per-046"), uid("per-048")],
            "mp-026": [uid("per-046"), uid("per-043"), uid("per-045")],
            "mp-027": [uid("per-046"), uid("per-039"), uid("per-048"), uid("per-047")],
            "mp-028": [uid("per-044"), uid("per-040"), uid("per-049"), uid("per-047")],
            "mp-029": [uid("per-048"), uid("per-047"), uid("per-043"), uid("per-046"), uid("per-044"), uid("per-039")],
        }
        for i, (mp_slug, soloists) in enumerate(harp_performers.items(), 1):
            s.add(ClassicalProgrammeItem(id=uid(f"cpi-007-{i}"), event_id=uid("evt-007"), musical_piece_id=uid(mp_slug), soloists=soloists, order=i))

        # evt-008 — Het Wilde Wat (classical/choral)
        s.add(Event(id=uid("evt-008"), date=date(2026, 6, 6), time=time_type(17, 0), venue_id=uid("venue-007"), type="classical", title="Het Wilde Wat — Iets nieuws onder de zon", price_paid=Decimal("10.00"), currency="EUR", data_completeness="complete", notes="Inloop 16:30. Former church venue."))
        s.add(EventClassical(event_id=uid("evt-008"), subtype="choral", ensemble_id=uid("ens-004"), conductor_id=uid("per-054")))
        s.flush()
        wilde_wat_programme = [
            ("mp-030", "trad. Gregorian"),
            ("mp-031", "text: Leonard Cohen"),
            ("mp-032", None),
            ("mp-033", "text: Juhan Liv"),
            ("mp-034", "text: Raymond Lévesque"),
            ("mp-035", "trad. American"),
            ("mp-036", "text: O Oriens"),
            ("mp-037", "trad. Bulgarian"),
            ("mp-038", "text: Octavio Paz"),
            ("mp-039", "text: William Blake"),
            ("mp-040", "Alt-J"),
        ]
        for i, (mp_slug, notes) in enumerate(wilde_wat_programme, 1):
            s.add(ClassicalProgrammeItem(id=uid(f"cpi-008-{i}"), event_id=uid("evt-008"), musical_piece_id=uid(mp_slug), order=i, notes=notes))

        # evt-009 — Le nozze di Figaro (opera)
        s.add(Event(id=uid("evt-009"), date=date(2026, 5, 20), venue_id=uid("venue-001b"), type="opera", title="Le nozze di Figaro", work_id=uid("work-004"), price_paid=Decimal("46.29"), currency="EUR", data_completeness="complete", notes="Resale via TicketSwap. Running time 3:30 incl. 1 interval. Revival director Evgeny Kulagin noted in prod-001."))
        s.add(EventOpera(
            event_id=uid("evt-009"),
            subtype="opera",
            work_id=uid("work-004"),
            production_id=uid("prod-001"),
            conductor_id=uid("per-064"),
            director_id=uid("per-065"),
            ensemble_id=uid("ens-005"),
            libretto_language="Italian",
            surtitles_languages=["Dutch", "English"],
            operabase_url="https://www.operabase.com/productions/le-nozze-di-figaro-476319/10-may-2026/en",
            cast={
                "Il Conte Almaviva": str(uid("per-067")),
                "La Contessa Almaviva": str(uid("per-068")),
                "Susanna": str(uid("per-069")),
                "Figaro": str(uid("per-070")),
                "Cherubina (singing)": str(uid("per-071")),
                "Marcellina": str(uid("per-072")),
                "Bartolo": str(uid("per-073")),
                "Basilio": str(uid("per-074")),
                "Antonio": str(uid("per-075")),
                "Cherubino (silent actor)": str(uid("per-076")),
                "The Old Woman": str(uid("per-077")),
                "The Count's Henchman": str(uid("per-078")),
                "The Young Man": str(uid("per-079")),
            },
        ))

        # evt-010 — Oxygen: The Rise (dance)
        s.add(Event(id=uid("evt-010"), date=date(2026, 6, 14), time=time_type(16, 0), venue_id=uid("venue-008b"), type="dance", title="Oxygen: The Rise", work_id=uid("work-005"), price_paid=Decimal("31.00"), currency="EUR", data_completeness="complete"))
        s.add(EventDance(event_id=uid("evt-010"), subtype="contemporary", company_id=uid("ens-006"), choreographer_id=uid("per-080"), work_id=uid("work-005"), music_notes="Music by Subp Yao; includes works by Ludovico Einaudi"))

        # evt-011 — Monstering the Rocketman (theatre/play)
        s.add(Event(id=uid("evt-011"), date=date(2025, 8, 11), time=time_type(16, 10), venue_id=uid("venue-009c"), festival_id=uid("fest-004"), type="theatre", title="Monstering the Rocketman", work_id=uid("work-006"), price_paid=Decimal("14.50"), currency="GBP", data_completeness="complete", notes="£29.00 ÷ 2 tickets incl. £2.00 handling fee."))
        s.add(EventTheatre(event_id=uid("evt-011"), subtype="play", work_id=uid("work-006"), playwright_id=uid("per-082"), cast={"performer": str(uid("per-082"))}))

        # evt-012 — Improv Spectacular (theatre/improv)
        s.add(Event(id=uid("evt-012"), date=date(2025, 12, 15), time=time_type(20, 0), venue_id=uid("venue-010b"), type="theatre", title="Improv Spectacular: Holiday Edition", price_paid=Decimal("31.60"), currency="EUR", data_completeness="complete", notes="€63.20 ÷ 2 tickets incl. VAT and fees. Balcony seating. Cava included in ticket price."))
        s.add(EventTheatre(event_id=uid("evt-012"), subtype="improv", company_id=uid("ens-007")))

        # evt-013 — Baby Wants Candy (theatre/improv_musical)
        s.add(Event(id=uid("evt-013"), date=date(2024, 8, 18), time=time_type(20, 0), venue_id=uid("venue-011c"), festival_id=uid("fest-005"), type="theatre", title="Baby Wants Candy", price_paid=Decimal("16.50"), currency="GBP", data_completeness="partial", notes="£33.00 ÷ 2 concession tickets. Audience-voted musical title unknown; possibly Grindr-related per Claire's memory."))
        s.add(EventTheatre(event_id=uid("evt-013"), subtype="improv_musical", company_id=uid("ens-008")))

        # evt-014 — Hadestown (theatre/musical)
        s.add(Event(id=uid("evt-014"), date=date(2025, 9, 3), time=time_type(15, 0), venue_id=uid("venue-003"), type="theatre", title="Hadestown", work_id=uid("work-007"), price_paid=Decimal("37.01"), currency="EUR", data_completeness="partial", notes="€35.00 + €2.01 booking fee. Hermes unknown — alternated between De Breij and Heijmans."))
        s.add(EventTheatre(
            event_id=uid("evt-014"),
            subtype="musical",
            work_id=uid("work-007"),
            production_id=uid("prod-002"),
            director_id=uid("per-084"),
            playwright_id=uid("per-083"),
            cast={
                "Orpheus": str(uid("per-085")),
                "Eurydice": str(uid("per-086")),
                "Hades": str(uid("per-087")),
                "Persephone": str(uid("per-088")),
                "Hermes": "unknown",
                "Fate": [str(uid("per-091")), str(uid("per-092")), str(uid("per-093"))],
            },
        ))

        # evt-015 — Kurios (circus)
        s.add(Event(id=uid("evt-015"), date=date(2025, 12, 7), time=time_type(16, 0), venue_id=uid("venue-012"), type="circus", title="Kurios: Cabinet of Curiosities", work_id=uid("work-008"), price_paid=Decimal("106.75"), currency="EUR", data_completeness="complete"))
        s.add(EventCircus(event_id=uid("evt-015"), subtype="contemporary_circus", company_id=uid("ens-009"), director_id=uid("per-094"), work_id=uid("work-008")))

        # evt-016 — Circa: Humans 2.0 (circus)
        s.add(Event(id=uid("evt-016"), date=date(2024, 8, 13), time=time_type(18, 20), venue_id=uid("venue-013c"), festival_id=uid("fest-005"), type="circus", title="Circa: Humans 2.0", work_id=uid("work-009"), price_paid=Decimal("18.75"), currency="GBP", data_completeness="complete", notes="£37.50 ÷ 2 tickets incl. £2.50 booking fee."))
        s.add(EventCircus(event_id=uid("evt-016"), subtype="contemporary_circus", company_id=uid("ens-010"), director_id=uid("per-096"), work_id=uid("work-009")))

        # evt-017 — The Opera Circus (opera)
        s.add(Event(id=uid("evt-017"), date=date(2026, 3, 13), time=time_type(20, 0), venue_id=uid("venue-003"), type="opera", title="The Opera Circus", work_id=uid("work-010"), price_paid=Decimal("30.65"), currency="EUR", data_completeness="complete", notes="€91.95 ÷ 3 tickets incl. €4.95 booking fee. Contemporary circus integrated throughout. Co-direction: Serge van Veggel (staging) and Aedín Walsh (circus)."))
        s.add(EventOpera(
            event_id=uid("evt-017"),
            subtype="opera",
            work_id=uid("work-010"),
            production_id=uid("prod-003"),
            conductor_id=uid("per-101"),
            director_id=uid("per-099"),
            ensemble_id=uid("ens-012"),
            composers=[uid("per-098")],  # Georg Friedrich Handel
            libretto_language="Italian",
            surtitles_languages=["Dutch", "English"],
            cast={
                "Armata, goddess of war": str(uid("per-103")),
                "Armato, god of war": str(uid("per-104")),
                "The Sun / circus troupe": str(uid("per-105")),
                "Circus troupe": [str(uid("per-106")), str(uid("per-107")), str(uid("per-108")), str(uid("per-109")), str(uid("per-110"))],
            },
        ))

        # evt-018 — Daisy Doris May: Big Night Out (comedy)
        s.add(Event(id=uid("evt-018"), date=date(2025, 8, 8), time=time_type(21, 50), venue_id=uid("venue-011d"), festival_id=uid("fest-004"), type="comedy", title="Daisy Doris May: Big Night Out", work_id=uid("work-011"), price_paid=Decimal("15.85"), currency="GBP", data_completeness="complete", notes="£79.25 ÷ 5 tickets incl. £6.25 booking fee. Drag king character comedy."))
        s.add(EventComedy(event_id=uid("evt-018"), subtype="character", performer_id=uid("per-130"), tour_name="Big Night Out"))

        # evt-019 — Werq the World (cabaret/drag)
        s.add(Event(id=uid("evt-019"), date=date(2023, 11, 2), time=time_type(20, 0), venue_id=uid("venue-014"), type="cabaret", title="RuPaul's Drag Race: Werq the World", price_paid=Decimal("47.59"), currency="EUR", data_completeness="complete", notes="€95.18 ÷ 2 tickets incl. €7.18 fees. Resale via TicketSwap."))
        s.add(EventCabaret(
            event_id=uid("evt-019"),
            subtype="drag",
            supporting_cast=[uid("per-111"), uid("per-112"), uid("per-113"), uid("per-114"), uid("per-115"), uid("per-116"), uid("per-117"), uid("per-118")],
            ensemble_id=uid("ens-013"),
            tour_name="Werq the World 2023",
        ))

        # evt-020 — Tilda Swinton: Ongoing (exhibition)
        s.add(Event(id=uid("evt-020"), date=date(2026, 3, 11), venue_id=uid("venue-015"), type="exhibition", title="Tilda Swinton: Ongoing", price_paid=Decimal("0.00"), currency="EUR", data_completeness="complete", notes="Museumkaart."))
        s.add(EventExhibition(
            event_id=uid("evt-020"),
            subtype="art",
            exhibition_title="Tilda Swinton – Ongoing",
            artists=[uid("per-119"), uid("per-120"), uid("per-121"), uid("per-122"), uid("per-123"), uid("per-124"), uid("per-125"), uid("per-126"), uid("per-127")],
            medium="mixed media — film installations, photography, performance, objects",
            permanent_or_temp="temporary",
            exhibition_url="https://www.eyefilm.nl/en/programme/tilda-swinton/1473850",
        ))

        # evt-021 — Eye Filmmuseum Permanent Collection (exhibition)
        s.add(Event(id=uid("evt-021"), date=date(2026, 3, 11), venue_id=uid("venue-015"), type="exhibition", title="Eye Filmmuseum Permanent Collection", price_paid=Decimal("0.00"), currency="EUR", data_completeness="stub", notes="Museumkaart. Same-day visit as evt-020."))
        s.add(EventExhibition(event_id=uid("evt-021"), subtype="other", permanent_or_temp="permanent"))

        # evt-022 — Our Anxious Measurements III (spoken word)
        s.add(Event(id=uid("evt-022"), date=date(2025, 8, 23), time=time_type(16, 30), venue_id=uid("venue-016b"), festival_id=uid("fest-004"), type="spoken_word", title="Our Anxious Measurements III", work_id=uid("work-012"), price_paid=Decimal("0.00"), currency="GBP", data_completeness="complete", notes="PBH Free Fringe."))
        s.add(EventSpokenWord(event_id=uid("evt-022"), subtype="spoken_word", performers=[uid("per-128")], works_read=[uid("work-012")]))

        # evt-023 — Catherine Bohart: Who Runs the World? (talk)
        s.add(Event(id=uid("evt-023"), date=date(2023, 8, 9), time=time_type(18, 30), venue_id=uid("venue-018"), festival_id=uid("fest-006"), type="talk", title="Catherine Bohart: Who Runs the World?", price_paid=Decimal("0.00"), currency="GBP", data_completeness="complete", notes="BBC Radio 4 live recording. Free ballot tickets."))
        s.add(EventTalk(event_id=uid("evt-023"), subtype="podcast_recording", speaker_ids=[uid("per-129")], host_id=uid("per-129"), topic="Women and power", host_organisation="BBC Radio 4"))

        # evt-024 — Flight (other)
        s.add(Event(id=uid("evt-024"), date=date(2024, 8, 23), time=time_type(19, 0), venue_id=uid("venue-009d"), festival_id=uid("fest-005"), type="other", subtype="immersive_experience", title="Flight", work_id=uid("work-013"), price_paid=Decimal("10.00"), currency="GBP", data_completeness="complete", notes="£20.00 ÷ 2 concession tickets. Darkfield. 30 mins, complete darkness, binaural audio."))

        s.commit()
        print(f"Seed complete — {24} events inserted.")


if __name__ == "__main__":
    seed()
