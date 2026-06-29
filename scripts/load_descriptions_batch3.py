#!/usr/bin/env python3
"""Load batch 3 of event descriptions into the DB."""
import os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
from sqlmodel import Session, create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://clairebaxter@localhost:5432/events_ledger")
engine = create_engine(DATABASE_URL)

UPDATES = [
    # ── Ballet ─────────────────────────────────────────────────────────────────
    ("New Moves",
     "New Moves is the young choreographers' programme initiated by artistic director Ted Brandsen in 2003 that challenges the dancers of Dutch National Ballet — and frequently young makers from outside — to explore their choreographic talents. The goal is stimulating creativity and providing a platform for new voices in the dance world, inviting audiences to embark on an adventure with the dance-makers of the future.",
     "Dutch National Ballet's annual platform for emerging choreographers — dancers and young makers given the stage to develop and show new work. The programme that launched the careers of Juanjo Arqués, Ernst Meisner, and Remi Wörtmeyer.",
     "https://www.operaballet.nl/en/dutch-national-ballet/2024-2025/new-moves-2024-2025"),

    ("Legacies",
     "Cherishing our legacy and continuing to enrich it with new creations are the cornerstones of Dutch National Ballet's repertoire and of this opening programme for the 2026–2027 season. Four works: Balanchine's sparkling Symphony in C; Toer van Schayk's Requiem to Mozart's masterpiece, revived to celebrate his ninetieth birthday; Hans van Manen's Simple Things, a Dutch National Ballet premiere; and a world premiere by Kirsten Wicklund set to Willem Jeths' Monument to a Universal Marriage.",
     "Dutch National Ballet opens the 2026–27 season with a celebration of its legacy — Balanchine's Symphony in C alongside a revived Toer van Schayk Requiem (for his 90th birthday), a van Manen premiere, and a world premiere by Kirsten Wicklund.",
     "https://www.operaballet.nl/en/dutch-national-ballet/2026-2027/legacies"),

    # ── Theatre ─────────────────────────────────────────────────────────────────
    ("TERF",
     "TERF imagines Harry Potter stars Daniel Radcliffe, Emma Watson and Rupert Grint meeting J.K. Rowling over a posh dinner to stage an intervention over her anti-trans stance — 280 characters at a time. Written and directed by Joshua Kaplan, the play takes Rowling's social media rhetoric and turns it into live, provocative theatre. 'Brave, topical, provocative and important... the spirit of what Fringe plays should try to do.'",
     "Joshua Kaplan's sharp satire imagines the Harry Potter cast confronting J.K. Rowling over her anti-trans positions at a posh Edinburgh restaurant — a Fringe play that went viral before it even opened, playing to sell-out crowds and genuine protests outside.",
     "https://www.kickstarter.com/projects/terfplay/terf-play-edinburgh-fringe-2024"),

    ("HOLE!",
     "An epic love story set in the apocalyptic aftermath of The Great Sucking, when the only people left on Earth are the fanatical Nebraskans — and anyone else who happened to be doing butt stuff at the time. AMERICAN SING-SONG write and perform insane, filthy, heart-forward musicals with nothing but a piano, a foley table, and a gay little dream.",
     "American Sing-Song's sell-out Fringe sensation — a raunchy, hilarious, heart-forward musical about a conservative Christian sect in Nebraska, what God told their minister to make everyone do, and the end of the world that followed. Soho Theatre transfer confirmed.",
     "https://www.edfringe.com/tickets/whats-on/hole"),

    ("FLUSH",
     "Three bathroom stalls in a Shoreditch nightclub. One night. Stories slip between the cracks of the cubicles: teenage drama, thirty-something fatigue, love, loss, career spirals, sex, motherhood, bad dates and worse decisions. At the heart of it all is Billie, who has just experienced something she can't quite name yet — and the bathroom becomes a strange kind of shelter. Winner of a Fringe Theatre Award, Bitesize Award for Best Direction, and one of the FT's top nine shows of the Fringe.",
     "April Hope Miller's debut play — a warm, funny, and occasionally devastating ensemble piece set entirely in a nightclub bathroom — won a Fringe Theatre Award and a Bitesize Award for Best Direction. One of the most talked-about new plays of Fringe 2025.",
     "https://www.arcolatheatre.com/event/flush/"),

    ("Monstering the Rocketman",
     "When the soaraway Sun newspaper falsely accuses Elton John, 39, of bonking rent boys, the Rocketman blasts off a whopping multi-million lawsuit. But fuming editor Kelvin MacKenzie is unrepentant and launches a blistering campaign of media harassment. Where is the line between fact and fiction? Not our concern. Truth is just a commodity to be sold. A probing and provocative exploration of truth, privacy and ambition based on Britain's biggest-ever libel case. Fringe First winner 2025.",
     "Henry Naylor's one-man Fringe First winner retells Britain's biggest libel case — Elton John vs The Sun — through the eyes of a cub reporter in Kelvin MacKenzie's newsroom in the 1980s. A sharp, fast-moving examination of what happens when tabloid power and a celebrity's dignity collide.",
     "https://www.nickhernbooks.co.uk/monstering-the-rocketman"),

    ("Baby Wants Candy",
     "You shout out the title, Baby Wants Candy makes up the musical. The Emmy-nominated Chicago improv company creates a complete, fully staged musical comedy from a single audience suggestion — songs, characters, plot twists and all — with a live rock band. Every show is different. Every show sells out. After eleven consecutive sell-out Fringe runs.",
     "Baby Wants Candy are the world's premier improvised musical company — an Emmy-nominated Chicago ensemble who create a complete, fully staged musical comedy every night from a single audience-shouted title, with a live band and absolutely no safety net.",
     "https://www.babywantscandy.com/edinburgh-fringe"),

    ("Luigi the Musical",
     "Luigi Mangione, accused of killing a health insurance CEO, shares a cell with Sam Bankman-Fried and Sean 'Diddy' Combs. What starts as chaos turns into a surreal plan for freedom and unexpected fame. A dark comedic musical that uses absurdist humour and original music to explore corporate greed, public spectacle, and the creation of viral folk heroes in the internet age.",
     "A satirical viral musical — written in the wake of Luigi Mangione's arrest — imagines him sharing a cell with Sam Bankman-Fried and Diddy, the three of them plotting escape while the internet decides who deserves hero status. Dark, funny, and politically on the money.",
     "https://www.broadwayworld.com/article/LUIGI-THE-MUSICAL-to-Have-Edinburgh-Fringe-Run-20250805"),

    ("Dusk: A Bite-Size Celebration",
     "A music-packed celebration of forbidden love, unexpected drama, baseball, glitter, and teen angst. Fan-favourite moments, never-before-seen bonus material, and new songs dictated by the show's social media following — a comedy revue that rips into the Twilight saga with fangs bared and a smile on its blood-red lips. Those unfamiliar with Twilight will be amused; those who are will be obsessed.",
     "A Twilight fan-cabaret that combines pre-recorded skits with new musical numbers shaped by its social media following — a celebration of the saga by people who love it enough to make it absolutely ridiculous.",
     "https://www.planmyfringe.co.uk/shows/dusk_a_bite_size_celebration"),

    ("Sweeney Todd",
     "The demon barber of Fleet Street. Sweeney Todd, driven mad by the injustice of a false imprisonment, returns to London seeking revenge — and teams up with pie-shop owner Mrs Lovett in a Grand Guignol musical of class, vengeance, and cannibalism. Stephen Sondheim's masterwork: dark, darkly funny, and magnificent.",
     "Sondheim's operatic thriller about a barber destroyed by the class system and his vengeance on it — Mrs Lovett's pies, Fleet Street fog, and some of the greatest musical theatre writing ever composed.",
     "https://en.wikipedia.org/wiki/Sweeney_Todd:_The_Demon_Barber_of_Fleet_Street"),

    # ── Comedy ─────────────────────────────────────────────────────────────────
    ("Netflix and Kill",
     "Netflix & Kill is a monthly comedy night showcasing international stand-up comedians on the rise to the top — comedians who deserve a Netflix Special. Hosted at Huis van Iemand Anders in De Pijp, bringing together some of the funniest local and visiting comedians from Europe and the US. May get a little dirty.",
     "Amsterdam's English-language comedy night putting up-and-coming international comedians on stage in a De Pijp bar — stand-up from visiting touring comics who deserve their Netflix moment but aren't there yet.",
     "https://internationallocals.nl/events/netflix-kill/"),

    ("Alan Carr",
     "Alan Carr: Not Again Alan! — the camp, sharp-tongued comedian returns to arena tours after a period away. Known for his outrageous celebrity gossip, self-deprecating warmth, and the kind of one-liners that get stuck in your head. One of the UK's best-loved comedians, back at his brilliant best.",
     "Alan Carr's Not Again Alan! arena tour — a masterclass in camp wit, sharp observation, and celebrity storytelling from the comedian who makes it look effortless.",
     "https://alancarr.net/live/"),

    ("Jonathan Van Ness: Imaginary Living Room Olympian",
     "JVN takes their stand-up special online — a warm, funny, gymnastic hour of comedy recorded as a virtual living room event during the pandemic. Personal, queer, joyful, and absolutely unhinged in the best way.",
     "Jonathan Van Ness's online stand-up special — recorded during the pandemic as a virtual living room show — mixing gymnastics metaphors with genuinely emotional queer storytelling and their signature bubbly chaos.",
     "https://jonathanvanness.com/"),

    # ── Music ──────────────────────────────────────────────────────────────────
    ("Wet Wet Wet: 40th Anniversary Tour",
     "Wet Wet Wet perform songs from their iconic debut album Popped In Souled Out alongside a catalogue of beloved hits, including Love Is All Around, Goodnight Girl and With A Little Help From My Friends, in celebration of 40 years since their debut. The 2026 UK and European tour leg ahead of the full anniversary run in 2027.",
     "Wet Wet Wet's 40th anniversary tour — performing their 1987 debut Popped In Souled Out alongside the hits that made them one of the most beloved bands in British pop history, including the global phenomenon Love Is All Around.",
     "https://wetwetwet.co.uk/"),

    # ── Dance ──────────────────────────────────────────────────────────────────
    ("Portals",
     "Reis door de portalen van een queer fabel vol muziek, dans en het digitale zelf. RADVLAD neemt je mee door portalen naar digitale werelden vol fantasie — een reis door liefde, schuld, hartbreak, coming out, ouder worden en herboren worden. Een tv-scherm wordt een portaal naar de verschillende persona's en werelden van een verwarde Zillennial en queer Noord-Macedonische expat in het digitale tijdperk.",
     "RADVLAD's queer multimedia performance at Amsterdam Fringe Festival — a 40-minute journey through digital portals, following a Zillennial queer North Macedonian expat across versions of themselves: love, guilt, coming out, ageing, and rebirth, told through music, dance, and a stage TV screen that becomes a window to other worlds.",
     "https://amsterdamfringefestival.nl/portals-2/"),

    ("Oxygen: The Rise",
     "THE RISE is an explosive performance full of powerful standalone numbers that follow one another at breakneck speed — an ode to choreographer Jennifer Romen's impressive oeuvre: a celebration of growth, courage and undeniable artistic strength. Iconic choreographies, special collaborations and new energy come together in a show that feels like both coming home and moving forward at the same time. Blacklight, shadow play and projections make intangible illusions tangible. Not an ending, but the beginning of a new chapter.",
     "Dutch hip-hop and contemporary dance company Oxygen — winners of Dance As One and Golden Buzzer on France's Got Talent — mark a new chapter with The Rise: a high-energy retrospective of Jennifer Romen's most powerful work, built with blacklight illusions and unstoppable momentum.",
     "https://www.we-are-oxygen.com/tour"),

    # ── Classical ──────────────────────────────────────────────────────────────
    ("Het Wilde Wat — Hello Darkness",
     "Een verrassend programma onder leiding van Tristan Knelange, met muziek van Brahms, Purcell, Ola Gjeilo, Imogen Heap en Stevie Wonder. Het programma verkent de menselijke onrust, de nachtelijke strijd, de existentiële angst en het verlangen naar licht en kleur.",
     "Het Wilde Wat — a contemporary chamber ensemble directed by Tristan Knelange — explores darkness, existential restlessness, and the longing for light in a programme spanning Brahms, Purcell, Gjeilo, Imogen Heap, and Stevie Wonder.",
     "https://stadsherstel.nl/cultuuragenda/het-wilde-wat-2/"),

    ("Joshua Bell & Academy of St Martin in the Fields",
     "Joshua Bell directs the Academy of St Martin in the Fields from the violin — the ensemble he has led as Music Director since 2011 — in a programme that showcases the Academy's supreme clarity and Bell's peerless musicianship. The ASMF remains one of the world's great chamber orchestras; Bell one of the most celebrated violinists of his generation.",
     "Joshua Bell conducts and solos with the Academy of St Martin in the Fields — the world-renowned chamber orchestra he has led since 2011 — in a programme combining violin concerto and orchestral repertoire at the Concertgebouw.",
     "https://www.asmf.org/joshua-bell/"),

    ("Festival of the Spoken Nerd: Just for Graphs",
     "The science comedy phenomenon returns, and this time they're off the chart! Join stand-up mathematician Matt Parker, experiments maestro Steve Mould and geek songstress Helen Arney for graph-a-minute fun on an unprecedented linear scale. Explosive live experiments and statistically significant laughter, packed with spreadsheets, irreverent asides, science-focused songs, number squares, an anti-Mexican wave and a lot of spectacular pyrotechnics.",
     "Matt Parker, Steve Mould, and Helen Arney bring their science comedy show back to the Fringe — an hour of live experiments, maths songs, anti-Mexican waves, and fire parabolas for the graph-a-minute generation.",
     "https://festivalofthespokennerd.com/show/edinburgh-fringe/"),

    ("Getting Triggy With It: Matt Parker does the maths",
     "Matt Parker returns to the Fringe to find the comedy in complex calculations, the humour in algorithms, and the fun in functions. The live show to accompany his bestseller Love Triangle: The Life-changing Magic of Trigonometry — covering the maths of Dobble, algorithmic DJing, AI and language models, and the surprising patterns hiding in everyday life. The audience is divided into Category Zero (the maths nerds) and Category One (the plus-ones), and both halves get their moment.",
     "Stand-up mathematician Matt Parker's Fringe show built around his bestselling book on trigonometry — covering Dobble, AI, algorithmic DJing, and the comedy in the fact that triangles are secretly everywhere, for maths lovers and their reluctant plus-ones alike.",
     "https://festivalofthespokennerd.com/show/matt-parker-triggy/"),

    # ── Spoken Word ────────────────────────────────────────────────────────────
    ("Our Anxious Measurements III",
     "One last heartfelt, hilarious and fierce instalment of the Anxious Measurements trilogy. Bay Fringe Critics Choice Award winner Dean Tsang explores our many relationships with anxiety and the staggering number of ways apprehension can enter our lives — through thought-provoking, hilarious and hard-hitting rhymes. Contains distressing themes and strong language.",
     "Dean Tsang closes the Anxious Measurements trilogy at Edinburgh Fringe — a spoken word performance about anxiety in all its forms, combining humour and genuine emotional weight, from the award-winning artist known for fierce, personal rhyme.",
     "https://edinburghfestival.datathistle.com/event/2670099-our-anxious-measurements-iii/"),

    # ── Other ──────────────────────────────────────────────────────────────────
    ("Improv Spectacular: Holiday Edition",
     "Boom Chicago's top cast deliver a fast-paced night of short-form comedy games and long-form improvisation, all driven by audience suggestions. Friendly waiters keep your drinks full while the cast creates characters, scenes, and laugh-out-loud situations from nothing. The ensemble that launched the careers of Seth Meyers, Jordan Peele, and others — with the next generation on stage tonight.",
     "Boom Chicago's annual holiday special — a night of fast-paced short-form games and long-form improv in their Amsterdam theatre, with the company that gave the world Seth Meyers and Jordan Peele now bringing their seasonal best to their home stage.",
     "https://boomchicago.nl/shows/improv-spectacular/"),
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
