#!/usr/bin/env python3
"""Load batch 4 of event descriptions — exhibitions and remaining events."""
import os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
from sqlmodel import Session, create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://clairebaxter@localhost:5432/events_ledger")
engine = create_engine(DATABASE_URL)

UPDATES = [
    # ── Exhibitions ────────────────────────────────────────────────────────────
    ("Straat Museum",
     "STRAAT is the museum for street art and graffiti. Located in a former 8,000m² ship shed at the NDSM shipyard in Amsterdam Noord, the museum features more than 160 gigantic murals created on-site by international artists from 32 nationalities. The collection is constantly growing — on weekends visitors may catch artists painting live. Upstairs, a gallery sells smaller works from the same artists. Reached via the free F4 ferry from Amsterdam Centraal.",
     "Amsterdam's dedicated street art museum — a vast former shipyard warehouse in Amsterdam Noord housing 160+ monumental murals by artists from 32 countries, all painted directly on the walls. One of the most impressive art spaces in Europe.",
     "https://www.straatmuseum.com/en"),

    ("Van Gogh Museum Permanent Collection",
     "The Van Gogh Museum houses the world's largest collection of Vincent van Gogh's work: more than 200 paintings, 500 drawings, and 750 letters. The collection spans his life chronologically across five periods — the Netherlands, Paris, Arles, Saint-Rémy, and Auvers-sur-Oise — and includes Sunflowers, The Potato Eaters, Almond Blossom, and Wheatfield with Crows. Works by contemporaries and those Van Gogh influenced are displayed alongside his own, giving context to his revolutionary place in art history.",
     "The world's largest collection of Van Gogh — 200+ paintings tracing his entire career from dark Dutch studies to the blazing colour of Arles, displayed in the Rietveld building on Museumplein alongside his letters, drawings, and the artists who shaped and were shaped by him.",
     "https://www.vangoghmuseum.nl/en"),

    ("Vive l'impressionnisme!",
     "Marking the 150th anniversary of Impressionism, this large-scale exhibition at the Van Gogh Museum brings together masterpieces by Monet, Degas, Pissarro, Morisot, Sisley, and Cézanne drawn from ten Dutch museums and seven private collections. Many of these works have rarely, if ever, been shown together. The exhibition tells the story of how a handful of enlightened Dutch collectors championed the Impressionists at a time when the movement was dismissed — and in doing so, built one of the world's richest concentrations of Impressionist painting outside France.",
     "A once-in-a-generation gathering of Impressionist masterpieces from across Dutch public and private collections — assembled at the Van Gogh Museum to mark 150 years of the movement, bringing together works by Monet, Degas, Cézanne, and Morisot that have never been shown together before.",
     "https://www.vangoghmuseum.nl/en/visit/whats-on/exhibitions/overview-past-exhibitions/vive-limpressionnisme"),

    ("Eye Filmmuseum Permanent Collection",
     "Eye Filmmuseum, housed in an iconic 2012 building on Amsterdam's IJ waterfront, is a film archive, museum, and cinema preserving some 37,000 Dutch and international films. Permanent exhibitions include an interactive basement with immersive film clip installations from the silent era to the present, a collection of 1,500 historical cinematic apparatuses, and four cinemas screening archival and contemporary film. The building's café-restaurant has spectacular harbour views.",
     "Amsterdam's film museum on the IJ waterfront — four cinemas, an immersive archive basement spanning a century of Dutch and international cinema, and 1,500 historical projectors and cameras in a striking angular building designed by Delugan Meissl.",
     "https://www.eyefilm.nl/en"),

    ("Tilda Swinton: Ongoing",
     "An exhibition curated by Tilda Swinton herself in collaboration with Eye Filmmuseum, presenting eight works — six of them new — created in collaboration with Luca Guadagnino, Joanna Hogg, Jim Jarmusch, Olivier Saillard, Tim Walker, and Apichatpong Weerasethakul, alongside work with Pedro Almodóvar and previously unseen pieces by the late Derek Jarman. The exhibition explores recurring themes in Swinton's oeuvre: nature, memory, ancestors and spirits, and fellowships across artistic disciplines.",
     "Tilda Swinton's first major museum retrospective — eight works, six newly commissioned with Guadagnino, Jarmusch, Joanna Hogg, and others, plus unseen Derek Jarman pieces — curated by Swinton herself and installed at Eye Filmmuseum on the IJ waterfront.",
     "https://www.eyefilm.nl/en/programme/tilda-swinton/1473850"),

    ("MOCO Museum",
     "MOCO Museum is located in a sprawling mansion on Museumplein, bringing together 20th-century masters — Dalí, Warhol, Keith Haring, Yayoi Kusama — alongside contemporary icons Banksy, Jean-Michel Basquiat, and KAWS. The permanent Banksy exhibition includes original works verified by Pest Control: Girl with Balloon, Laugh Now, Flower Thrower, Smiling Copper, and the Crude Oil series, many from private collections never previously shown publicly.",
     "Museumplein's eclectic art mansion — Banksy originals (verified by Pest Control) next to Dalí, Warhol, Haring, Kusama, and Basquiat, in a beautifully converted canal-side villa that makes modern and street art feel both transgressive and completely at home.",
     "https://www.mocomuseum.com/amsterdam/"),

    ("Sonnenborgh Observatory",
     "Sonnenborgh Observatory is housed in one of four stone bastions built by Charles V as fortifications for Utrecht, and has been an astronomical observatory since its foundation by C.H.D. Buys Ballot in 1853. The museum holds historical instruments including an 1826 Fraunhofer telescope and a meridian circle, alongside interactive exhibitions explaining how lenses work, why stars shine, and how scientists study distant planets. On clear evenings, visitors can observe the Moon, planets, and the Sun through the observatory's modern and historical telescopes.",
     "Utrecht's astronomical observatory and museum built inside a 16th-century bastion — interactive exhibits on how telescopes and stars work, a remarkable collection of 19th-century instruments, and actual stargazing through historical and modern refractors on clear nights.",
     "https://www.sonnenborgh.nl/en"),

    ("Grachtenmuseum",
     "Located in a 17th-century canal house on the Herengracht (commissioned 1663, designed by Philips Vingboons), the Grachtenmuseum tells the story of how Amsterdam's UNESCO-listed canal ring was planned and built through a dazzling audiovisual exhibition. Period rooms include original wall paintings by Jurriaan Andriessen from 1776. The building's owners across four centuries included merchants, mayors, and bankers — among them Jan Willink, co-financier of the American War of Independence.",
     "A canal house that became a museum about the canal houses — 400 years of Amsterdam history explored through a multimedia show and beautifully preserved period rooms in one of the finest surviving Vingboons buildings on the Herengracht.",
     "https://grachten.museum/en/"),

    ("David Levinthal",
     "American artist David Levinthal (b.1949) uses toys — cowboys, Vietnam soldiers, Barbie dolls, baseball players — to reconstruct and reimagine key moments in United States history, exposing the myths of power, heroism, and identity embedded in American popular culture. This exhibition at H'ART Museum, in partnership with the Smithsonian American Art Museum, brings together six bodies of work created between 1984 and 2018: Modern Romance, American Beauties, Wild West, Barbie, Baseball, and History. The first major presentation of his work in the Netherlands.",
     "David Levinthal photographs carefully lit toy scenes — Wild West standoffs, Vietnam firefights, Barbies — to expose the myths embedded in American consumer culture. This H'ART Museum show is the first major European collaboration with the Smithsonian American Art Museum, showing six bodies of work across four decades.",
     "https://www.hartmuseum.nl/en/exhibitions/american-identities/"),

    ("Chicano Prints",
     "Radical Histories: Chicano Prints from the Smithsonian American Art Museum presents 60 works by more than 40 Chicano artists and collectives. Since the 1960s, Chicano artists have used printmaking as a vehicle for political advocacy, cross-cultural solidarity, and counter-history — resurrecting and memorialising underrepresented figures and events, and deploying text, poetry, graffiti, and historical quotation alongside image. Shown at H'ART Museum as part of American Identities, alongside the David Levinthal exhibition.",
     "Sixty printworks by Chicano artists from the Smithsonian American Art Museum's collection — political, bold, and historically rich, tracing five decades of graphic counter-history-making from the Chicano civil rights movement to the present day, shown at H'ART Museum.",
     "https://www.hartmuseum.nl/en/exhibitions/american-identities/"),

    ("Stedelijk Museum",
     "The Stedelijk Museum is the Netherlands' largest museum of modern and contemporary art and design, with a collection of 100,000 objects from 1870 to the present. Major holdings represent Bauhaus, De Stijl, CoBrA, neo-impressionism, abstract expressionism, pop art, minimalism, and conceptual art, with works by van Gogh, Kandinsky, Matisse, Pollock, Appel, Warhol, De Kooning, Marlene Dumas, and many others. The 19th-century Weissman building connects to a 21st-century wing ('the Bathtub') designed by Benthem Crouwel Architects.",
     "Amsterdam's great modern art museum on Museumplein — CoBrA, De Stijl, Bauhaus, and Mondrian alongside Pollock, Warhol, and Marlene Dumas, in a 19th-century building that opens into a gleaming contemporary wing spanning over a century of twentieth- and twenty-first-century art.",
     "https://www.stedelijk.nl/en"),

    ("Eye(s) Open – New Perspectives on Colonial Film Heritage",
     "Eleven artists respond to Eye Filmmuseum's collection of approximately 2,000 colonial-era films from formerly occupied Indonesia and Suriname. Working across photography, video, installation, and performance, participating artists — including Timoteus Anggawan Kusno, Miranda Pennell, Afrian Purnama, and Riar Rizaldi — expose colonial structures and the role of the camera in perpetuating power, while creating new works that open dialogue between the archive and the present. Eye manages its colonial film collection as a Living Archive, open to reuse and new interpretation.",
     "Eleven artists make new work in response to Eye Filmmuseum's archive of 2,000 colonial-era films from Indonesia and Suriname — a reckoning with what those films recorded, what they suppressed, and what it means to hold and show them now.",
     "https://www.eyefilm.nl/en/programme/eyes-open/1583300"),

    ("Scheepvaartmuseum Permanent Collection",
     "Het Scheepvaartmuseum — the Dutch National Maritime Museum — is housed in the Arsenal, a former Admiralty storehouse built in 1656 and converted to a museum in 1973. The collection of roughly 400,000 objects spans five centuries of maritime history: paintings, scale models, weapons, world maps, and navigational instruments. Highlights include the full-scale replica of the VOC ship Amsterdam, the gilded Royal Barge built for King Willem I in 1818, and a spectacular glass roof inspired by nautical chart compass lines, installed during the 2007–2011 renovation.",
     "Five centuries of Dutch maritime history in a 1656 Admiralty arsenal — the golden Royal Barge, a full-scale VOC ship replica, 400,000 objects, and a stunning glass courtyard roof. One of Amsterdam's great museums, and a reminder of how completely the sea shaped the country.",
     "https://www.hetscheepvaartmuseum.com/"),

    ("Shadows on the Atlantic",
     "Through this permanent exhibition at Het Scheepvaartmuseum, the museum confronts its collection's entanglement with the Dutch slave trade and colonial violence in the Atlantic world. 17th and 18th-century paintings and a two-meter ship model (the D'Keulse Galy, which transported enslaved people from West Africa to the Americas) are presented alongside new works commissioned from artists Atong Atem, Manuwi C Tokai, Robin Hoed, and Wouter Pocornie, whose pieces show how that history still resonates today.",
     "Het Scheepvaartmuseum confronts its own collection — 17th-century paintings and a scale model of a slave ship — in a permanent exhibition about the Dutch role in the Atlantic slave trade, anchored by new commissions from contemporary artists asking what that history means now.",
     "https://www.hetscheepvaartmuseum.com/whats-on/exhibitions/shadows-on-the-atlantic"),

    ("Ekō: Japan in Two Visual Narratives",
     "Curated as a conversation across time, Ekō juxtaposes early photographs of Japan from Het Scheepvaartmuseum's own collection — including works by Felice Beato (1832–1909), the most influential foreign photographer in 19th-century Japan — with new work by contemporary Dutch photographer and visual artist Anaïs López. The museum's photographs were assembled by Dutch consul Dirk de Graeff van Polsbroek (1833–1916), and include the oldest album Beato produced in Japan (1863). López responds using photography combined with gyotaku (fish-rubbing) and photopolymer etching, creating multimedia narratives at the intersection of fiction and documentary.",
     "A two-part exhibition at Het Scheepvaartmuseum placing Felice Beato's extraordinary 1860s photographs of Japan — assembled by Dutch consul Polsbroek — in dialogue with new multimedia work by Anaïs López, who uses etching and gyotaku to respond to what those images show and conceal.",
     "https://www.hetscheepvaartmuseum.com/whats-on/exhibitions/eko-japan-in-two-visual-narratives"),

    ("Martin Parr",
     "Foam pays tribute to Martin Parr's legacy with Very Modern and Rather Ugly, spanning more than five decades of his work. Central to the exhibition is Common Sense (1999) — an installation of 270 colour-saturated close-up photographs zooming in on global consumer culture: fast food, tourist sites, personal decoration, social stereotypes. The Last Resort (1983–85), Parr's decisive shift to colour, captures the British seaside in all its chaotic charm. Autoportrait brings together three decades of portraits of Parr taken by street photographers and photo booths worldwide. Also on show: The Non-Conformists, his breakthrough early documentary work.",
     "Martin Parr's definitive retrospective at Foam — five decades of his unmistakably colour-saturated, affectionately skewering photography of consumer culture, from The Last Resort's chaotic British beaches to the 270-photo Common Sense installation and his worldwide Autoportrait project.",
     "https://www.foam.org/events/martin-parr"),

    ("World Press Photo 2026",
     "The 2026 World Press Photo Exhibition presents the award-winning photojournalism and documentary photography selected from 61,000+ entries by 3,851 photographers from 130 countries. This year's awarded projects show the reality of global conflicts and the vulnerability of human life in intimate and poignant ways — from the United States and Ukraine to Nepal, Pakistan, and Palestine — alongside stories of illness, isolation, grief, resilience, and wildlife. Shown as a world premiere at De Nieuwe Kerk Amsterdam before travelling to 60+ locations worldwide. An audio tour with photographers' personal stories is included.",
     "The world's most important annual photojournalism exhibition — this year's award-winning images from 130 countries, on show in their world-premiere installation at De Nieuwe Kerk Amsterdam before the touring exhibition reaches 60+ cities worldwide.",
     "https://www.worldpressphoto.org/calendar/2026/amsterdam-the-netherlands"),
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
            ), {"fd": full_desc, "ai": ai_sum, "src": source, "t": f"%{title}%"}).all()
            if result:
                for row in result:
                    print(f"  ✓ {row[1]}")
                updated += len(result)
            else:
                print(f"  ✗ NOT FOUND: {title}")
                skipped += 1

        s.commit()
        print(f"\nDone. {updated} events updated, {skipped} not found.")


if __name__ == "__main__":
    run()
