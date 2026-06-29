#!/usr/bin/env python3
"""Load batch 5 — comedy, music, theatre, screening, talk events."""
import os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
from sqlmodel import Session, create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://clairebaxter@localhost:5432/events_ledger")
engine = create_engine(DATABASE_URL)

UPDATES = [
    # ── Comedy ─────────────────────────────────────────────────────────────────
    ("Miranda Sings with Special Guest Colleen Ballinger",
     "Miranda Sings — Colleen Ballinger's narcissistic, talentless, internet-famous alter ego — makes her Edinburgh Festival debut over five nights. Ballinger opened as herself, delivering a song and a powerhouse 'Defying Gravity', before transforming into Miranda: ill-fitting men's shirt, red sweatpants ('Haters Back Off' across the rear), bad dancing, audacious singing, and a section devoted to reading hateful YouTube comments. Miranda declares herself a '5 threat': singer, actress, dancer, model, and magician. The show that turned a YouTube character into a global phenomenon.",
     "Colleen Ballinger brings her viral YouTube character to Edinburgh — the delusional, dreadfully untalented, utterly self-confident Miranda Sings, live on stage for the first time in Scotland, reading hate comments and performing 'Defying Gravity' with complete conviction.",
     "https://www.comedy.co.uk/fringe/2014/colleen_ballinger/"),

    ("Jody Kamali - Spectacular!",
     "Jody Kamali brings his signature character comedy and physical performance to Edinburgh, in an hour of theatrical circus-inflected nonsense and crowd work. An exuberant, high-energy show from a comedian who has described the experience of being in the 'worst Edinburgh show' as something he has learned from and evolved beyond.",
     "Jody Kamali's Edinburgh Fringe character comedy and physical theatre hour — high energy, theatrical, and completely spectacular in its ambition.",
     "https://www.chortle.co.uk/shows/edinburgh_fringe_2015/j/24171/jody_kamali_%E2%80%93_spectacular%21"),

    ("Griffin and Jones: Slapdash Magic",
     "Griffin and Jones — the Pioneers of Slapdash Magic — combine sleight of hand, cons, crazy inventions, and stunts in a fast-paced, hilarious show. Whether playfully coercing you into one of their ridiculous games, demonstrating a harebrained invention, or trying to flog you their miracle snake-oil, the energy remains high, the laughs come thick and fast, and the magic is genuinely jaw-dropping. Grand finale: a straitjacket escape turned into a wrestling match. Once described as 'a punk rock Morecambe and Wise'.",
     "Griffin and Jones are the Pioneers of Slapdash Magic — pure comedic energy, bonkers inventions, and audience participation that ends in genuine jaw-dropping tricks, finishing with a straitjacket escape staged as a wrestling bout.",
     "https://broadwaybaby.com/shows/griffin-and-jones-slapdash-magic/718904"),

    ("John Hastings: Do You Have Any Ointment My John Hastings",
     "John Hastings has had a lot to deal with since 2019. A divorce during Covid. His best friend getting a terminal diagnosis. Bedbugs. Almost losing an arm to an infection. A very public trouser incident. This is a show about truly awful things that keep happening to one person, told with the kind of specificity and dark humour that makes horror funny. Performed at Monkey Barrel Comedy during the 2022 Edinburgh Fringe.",
     "John Hastings recounts a catastrophic run of bad luck — divorce, death, bedbugs, near-amputation, and a massive public accident — with such precision and warmth that the awfulness becomes hilarious.",
     "https://www.chortle.co.uk/shows/edinburgh_fringe_2022/j/32477/john_hastings:_do_you_have_any_ointment_my_john_hastings"),

    ("How to Flirt: The TED XXX Talk",
     "Drag king Steve Porters — winner of Man Up 2022 — wants to teach you how to be the ultimate ladies man, practice going to the next base, and spoon. Lessons, demonstrations, audience participation, and the kind of toxic masculinity critique that works best when delivered by a drag king in a polo shirt. Created and performed by writer, actor and award-winning drag king Daisy Doris May.",
     "Drag king Steve Porters delivers an expert TED-style guide to flirting — taught by Daisy Doris May, winner of Man Up 2022, in a show that celebrates awkwardness, queerness, and the absolute comedy of taking masculine confidence completely literally.",
     "https://www.comedy.co.uk/fringe/2023/daisy-doris-may/"),

    ("How to Mate: The TED XXX Talk",
     "Steve Porters is back. After last year's lesson in flirting, he now teaches you the science of mating — lessons from the peacock (finding a mate), the penguin (falling in love), and the pigeon (sealing the deal). Costume changes, musical numbers, a PowerPoint presentation, and audience members put through all the stages of the mating process. A show that celebrates friendship, awkwardness, and being okay with not being okay. From drag king and Edinburgh Fringe favourite Daisy Doris May.",
     "Daisy Doris May's drag king alter ego Steve Porters returns with a TED talk about animal mating strategies — peacock display, penguin love, pigeon commitment — delivered with absolute sincerity, full PowerPoint, and audience participation throughout.",
     "https://www.comedy.co.uk/fringe/2024/steve-porters/"),

    ("Daisy Doris May: Big Night Out",
     "Three alter egos. One night. Zero chill. Daisy brings together her iconic characters for one Big Night Out: Häns Off (Berghain-born VIP KlubKid, desperate to get past the bouncer), Karen Moonstone (self-appointed spiritual guru, trying to shut it all down), and Steve Porters (Guildford's finest iPod DJ and self-tight feminist, taking you under his wing to join the stag do). A sketch show meets cabaret meets one wild party. Expect a FASHUN show, a complaining ceremony, flashmobs, and DMCs in the little boys' room. Five-star sell-out.",
     "Daisy Doris May brings all three of her alter egos together for one chaotic night out — Berghain kid, spiritual guru, and iPod DJ — in a sketch-cabaret hybrid that was one of the five-star sensations of Fringe 2025.",
     "https://www.bingefringe.com/2025/08/13/review-daisy-doris-may-big-night-out-mick-perrin-worldwide-edfringe-2025-%E2%98%85%E2%98%85%E2%98%85%E2%98%85%E2%98%85/"),

    ("Sam Lake: You're Joking!? Not Another One!",
     "On its surface, another coming out story. But at its core, a masterful critique of masculinity and preconceived notions about identity. Sam Lake reflects on family life growing up and the fact that, although he never came out to his mum before she died, he later found out she knew all along. From 'a rare gem of a comic' (Rolling Stone) — a new stand-up hour about the highs and lows of pursuing your lifelong passion and just loving a laugh.",
     "Sam Lake's new hour — on the surface another coming out story, actually a forensic examination of what 'coming out' even means, built around the revelation that his mum always knew. Rolling Stone calls him 'a rare gem of a comic.'",
     "https://www.comedy.co.uk/fringe/2025/sam-lake/"),

    ("Comedy Queers",
     "Expect chaos, drag, stand-up, glitter, queer joy and a rotating line-up of LGBTQIA+ acts. Comedy Queers is a big queer party — a space for LGBTQIA+ folk and allies to enjoy live comedy without their identity being the punchline. For those who've seen enough cis, straight dudes with the same haircut, t-shirt, jokes, and toxicity. Come and party with the kings, queens, and royal-thems of comedy. A sell-out Fringe phenomenon since 2018.",
     "Edinburgh Fringe's long-running queer comedy night — a party and a platform, with drag, stand-up, and glitter, giving LGBTQIA+ acts and audiences a room where queerness is the joy, not the punchline.",
     "https://www.edfringe.com/tickets/whats-on/comedy-queers"),

    ("The Big Show",
     "Scotland's Best Comedy Venue (Chortle Awards 2023, 2024 and 2025) presents The Big Show — a rotating all-stars lineup featuring the very best acts from the Monkey Barrel Comedy roster and the wider Fringe. A new lineup every night, curated by the venue that turned Edinburgh's comedy scene upside down.",
     "Monkey Barrel's flagship showcase — Scotland's best comedy venue assembles a different all-star lineup every night from the finest Fringe acts on their books.",
     "https://www.edfringe.com/tickets/whats-on/the-big-show"),

    ("Austentatious: An Improvised Jane Austen Novel",
     "An entirely improvised comedy play, performed in full Regency costume with live musical accompaniment. Six of the country's sharpest comic actors conjure a 'lost' Jane Austen novel from a single title suggested by the audience — witty heroines, dashing gents, preposterous plots, and not one word rehearsed. Running at the Edinburgh Fringe since 2012 to consistently sold-out houses and four-star reviews.",
     "Six comic actors in full Regency dress improvise a complete Jane Austen novel from an audience-suggested title — plot, characters, romantic subplots, and a morally satisfying ending, with live piano accompaniment and absolutely nothing planned in advance.",
     "https://underbelly.co.uk/show/austentatious/"),

    ("Michelle Brasier: It's a Shame We Won't Be Friends Next Year",
     "Michelle Brasier's most personal show blends music, comedy, and nostalgia in a brutally funny and emotionally resonant hour. The title comes from a nine-word comment by a boy in Year 6, whose throwaway line stayed with her for decades — igniting a lifelong reflection on class, shame, worthiness, and how a few careless words can shape our sense of self. A love letter to the theatre kids, the freaks, the queers, and anyone who didn't quite fit in at school. Featuring original songs performed with musician Tim Lancaster.",
     "Michelle Brasier's Fringe 2025 show about how a nine-word comment from a Year 6 classmate shaped decades of her self-worth — funny, musical, and devastating about class, shame, and what we carry from childhood.",
     "https://www.comedy.co.uk/fringe/2025/michelle-brasier/"),

    # ── Music ──────────────────────────────────────────────────────────────────
    ("Girls Aloud",
     "Girls Aloud's Out of Control Tour was the five-piece pop group's fifth concert tour, supporting their fifth studio album Out of Control (2008). The show opened with 'The Promise', as the group burst up from the floor in long spangly dresses that were whipped off to reveal mini skirts. The tour featured pole dancing, hydraulic podiums, kimono-inspired playsuits, and five distinct theatrical sections with full costume changes. The setlist spanned their career, from Sound of the Underground to Love Machine.",
     "Girls Aloud's theatrical Out of Control Tour — five sections, full costume changes, hydraulic podiums, and a setlist spanning their decade of pop hits from Sound of the Underground to the Brit Award-winning The Promise.",
     "https://en.wikipedia.org/wiki/Out_of_Control_Tour"),

    ("Kate Nash",
     "Kate Nash tours in support of her second album My Best Friend Is You — an album that announced a harder, louder, more guitar-driven direction than the piano-pop of Foundations. In a live setting the transformation is complete: she thrashes around the stage, belting out 'Mouthwash' in an exuberant punk scream before eventually landing the rapturous full version of 'Foundations' as the crowd goes wild.",
     "Kate Nash on her second album tour — her live show announcing the arrival of a proper punk within the pop songwriter, with a set that ends on a cathartic full 'Foundations' having spent an hour building toward it.",
     "https://en.wikipedia.org/wiki/My_Best_Friend_Is_You"),

    ("Leon Jackson",
     "Leon Jackson, the Scottish singer who won The X Factor in 2007 with Don't Call This Love, performs in his home country in a small-venue show showcasing new material ahead of his second album. Jackson previewed several new songs including 'Never Left The Ground', 'Ode to Isabel', and 'Wounded by Love' at summer shows in 2011, alongside his breakout X Factor singles.",
     "X Factor 2007 winner Leon Jackson plays Scotland in 2011, showcasing new material in the run-up to his second album — a step change from his debut into something more personal and indie-influenced.",
     "https://en.wikipedia.org/wiki/Leon_Jackson"),

    # ── Theatre ────────────────────────────────────────────────────────────────
    ("The Lion King",
     "The Lion King — adapted by Julie Taymor from the 1994 Disney animated film, with music by Elton John and lyrics by Tim Rice — transformed an animated classic into a landmark theatrical experience. The staging uses elaborate puppetry, masks, and costumes to bring the Pride Lands to life: Simba's journey from lion cub to king, Mufasa's death, and the redemptive return home. One of the longest-running and most commercially successful stage musicals in history.",
     "Julie Taymor's theatrical masterpiece — The Lion King brought to the stage with breathtaking masks, puppetry, and Garth Fagan choreography, with Elton John's songs transformed into a ceremony of light, movement, and colour.",
     "https://en.wikipedia.org/wiki/The_Lion_King_(musical)"),

    ("Matilda the Musical",
     "Roald Dahl's Matilda, adapted by Dennis Kelly with music and lyrics by Tim Minchin, tells the story of a precociously gifted little girl who, armed with a vivid imagination and iron will, dares to take a stand and change her own destiny. The Royal Shakespeare Company production won seven Olivier Awards including Best Musical, and transferred to West End and Broadway. 'A joyous, explosive, richly imagined piece of theatre.' (The Guardian)",
     "Tim Minchin and Dennis Kelly's RSC adaptation of Roald Dahl — seven Olivier Awards, a perfect marriage of dark wit and musical invention, with Matilda herself as one of the great anti-heroes of musical theatre.",
     "https://en.wikipedia.org/wiki/Matilda_the_Musical"),

    ("Mamma Mia!",
     "Mamma Mia! weaves the songs of ABBA into an original story of Sophie, who is about to get married and wants her father at her wedding — but first has to work out which of three men her mother is actually referring to in her diary. Set on a Greek island, it's bright, warm, and effortlessly joyful — a show that exists purely to make people happy, and succeeds completely.",
     "The ABBA jukebox musical — set on a sun-drenched Greek island, centred on a mystery about paternity, and designed from first to last to send the audience home singing. One of the most purely enjoyable shows in musical theatre.",
     "https://en.wikipedia.org/wiki/Mamma_Mia!_(musical)"),

    ("The Fit Prince (who gets switched on the square in the frosty castle the night before (insert public holiday here))",
     "A riotous parody of every saccharine Hallmark romcom, lovingly skewered with queer joy and theatrical absurdity. In the fictional kingdom of Swedonia, a newly crowned prince must marry or risk losing the throne — while struggling New York baker Aaron Butcher is unexpectedly commissioned to create the royal wedding cake. Bursting with fabulous puppets, filmed celebrity cameos (including Tove Lo as the Prime Minister of Swedonia), and a formidable amount of perilous audience participation. Written and performed by real-life couple Linus Karp and Joseph Martin, playing romantic leads opposite each other for the first time.",
     "Linus Karp and Joseph Martin's gloriously unhinged queer Hallmark parody — real-life couple playing the romantic leads opposite each other for the first time, in a show featuring Tove Lo as a fictional prime minister, elaborate puppets, and audience participation that gets genuinely dangerous.",
     "https://www.broadwayworld.com/uk-regional/article/THE-FIT-PRINCE-Comes-to-Edinburgh-Fringe-With-Music-From-Leland-20250327"),

    # ── Screening ──────────────────────────────────────────────────────────────
    ("Planetarium Lates: Pink Floyd's Dark Side of the Moon",
     "A mesmeric, immersive 45-minute experience at Dynamic Earth's purpose-built 360-degree 6K planetarium dome: Pink Floyd's Dark Side of the Moon (1973) played in full, uninterrupted, in spectacular surround sound, while soaring custom visuals of planets, satellites, and deep space fill the dome overhead. Over 50 years after its original release — which was itself conceived for a planetarium — the album gets the celestial staging it always deserved. Adults only, ages 18+.",
     "Pink Floyd's Dark Side of the Moon played front to back, in full surround sound, under a 6K dome of planets and deep space at Dynamic Earth's planetarium — an immersive experience 50 years in the making.",
     "https://dynamicearth.org.uk/event/pink-floyds-dark-side-of-the-moon/"),

    # ── Talk ───────────────────────────────────────────────────────────────────
    ("Catherine Bohart: Who Runs the World?",
     "Catherine Bohart's first BBC Radio 4 stand-up special, recorded live at the Edinburgh Fringe. An exploration of the uneasy relationship between women and power — who holds it, who doesn't, how they perform it, and what it costs. Bohart brings her sharp, warm, and politically astute comedy to the question of whether and how the world is actually run by women yet.",
     "Catherine Bohart records her first Radio 4 stand-up special at the Edinburgh Fringe — an hour exploring women and power, told with the kind of warm precision that makes hard political questions feel like a conversation between friends.",
     "https://www.bbc.co.uk/programmes/m001nw4k"),

    ("Ewine van Dishoeck: Astrochemistry",
     "Professor Ewine van Dishoeck, 2018 Kavli Prize Laureate in Astrophysics, gives a public lecture on astrochemistry — the study of how complex molecules form on tiny specks of dust in interstellar space, and what this tells us about the origins of stars, planets, and ultimately life. Van Dishoeck's research combines astronomical observation, theoretical chemistry, and laboratory experiments to trace the molecular building blocks of the universe from interstellar clouds to protoplanetary discs.",
     "Ewine van Dishoeck — 2018 Kavli Prize winner and one of the world's leading astrochemists — gives a public lecture on how complex molecules form in interstellar space and what they tell us about the chemical origins of planets and life.",
     "https://www.kavliprize.org/PhysicsWorld-Podcast-Ewine-van-Dishoeck"),
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
            ), {"fd": full_desc, "ai": ai_sum, "src": source, "t": f"%{title[:40]}%"}).all()
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
