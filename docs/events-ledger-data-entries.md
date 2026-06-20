# Events Ledger — Stress Test Data Entries
*Updated June 2026. All 24 events are live in the database and in `backend/seed/seed.py` on GitHub.*

> **Source of truth:** `backend/seed/seed.py` — the Python seed script is authoritative for these events and all reference entities. This document is a human-readable reference. If there are discrepancies, the seed script wins.
>
> **Adding new events:** Use the POST API (`http://localhost:8000/docs`) — do not add to the seed script for incremental imports.

---

## Music Events — Setlist Lookup

For every **music** event (gig, concert, festival set), always look up the setlist on [setlist.fm](https://www.setlist.fm) and populate:
- `setlist[]` — ordered list of song titles as performed (include encore songs, note covers in parentheses)
- `setlist_fm_url` — direct link to the setlist page

Search setlist.fm for: `{Artist} {venue} {date}`. If no exact setlist exists, leave both fields null rather than guessing.

---

## Credits System (Opera, Ballet, Classical — any event)

Production credits (conductor, director, designers, choreographer, cembalo continuo, etc.) are stored in the `event_credit` table as `(event_id, role, person_id, sort_order)` rows. Role names are free-text strings — use whatever the venue programme uses.

**Preferred sort order convention:**
1. Conductor
2. Stage Director / Director
3. Musical Director / Repetiteur / Cembalo continuo
4. Choreographer
5. Set Design
6. Costume Design
7. Lighting Design
8. Video Design / Projection Design
9. Dramaturgy
10. Other creative roles

**Adding credits via API:**
```
POST /api/events/{event_id}/credits
{ "role": "Set Design", "person_id": "<uuid>", "sort_order": 5 }
```

**Cast** (singers/actors with character roles) is stored separately as a JSON dict on the extension table:
- `role → person_id` (UUID string)
- Enter roles exactly as listed in the programme (e.g. "Il Conte Almaviva", not "Count Almaviva")

**Note:** The old `conductor_id` and `director_id` FK fields on EventOpera/EventBallet still exist in the DB and are migrated automatically into `event_credit` on entry. When entering new events, populate credits via the `/credits` endpoint instead — these FK fields are no longer shown in the UI.

---

## Festivals

| id | name | edition | city | website_url |
|---|---|---|---|---|
| fest-001 | Holland Festival | 2026 | Amsterdam | hollandfestival.nl |
| fest-002 | Edinburgh Festival Fringe | 2014 | Edinburgh | edfringe.com |
| fest-003 | Edinburgh Summer Sessions | 2025 | Edinburgh | summersessions.com |
| fest-004 | Edinburgh Festival Fringe | 2025 | Edinburgh | edfringe.com |
| fest-005 | Edinburgh Festival Fringe | 2024 | Edinburgh | edfringe.com |
| fest-006 | Edinburgh Festival Fringe | 2023 | Edinburgh | edfringe.com |

---

## VenueOperators

| id | name | website_url |
|---|---|---|
| vop-001 | Pleasance | pleasance.co.uk |
| vop-002 | Assembly Festival | assemblyfestival.com |
| vop-003 | Underbelly | underbelly.co.uk |
| vop-004 | PBH Free Fringe | freefringe.org.uk |

---

## Venues

| id | name | parent_id | operator_id | city | country | venue_type | maps_url |
|---|---|---|---|---|---|---|---|
| venue-001 | Nationale Opera & Ballet | — | — | Amsterdam | Netherlands | theatre | https://maps.google.com/?q=Amstel+3,+1011+PN+Amsterdam |
| venue-001b | Grote Zaal (NOB) | venue-001 | — | Amsterdam | Netherlands | theatre | — |
| venue-002 | EICC | — | — | Edinburgh | United Kingdom | theatre | https://maps.google.com/?q=EICC+Edinburgh+EH3+8EE |
| venue-002b | Lomond Theatre | venue-002 | — | Edinburgh | United Kingdom | theatre | — |
| venue-003 | Koninklijk Theater Carré | — | — | Amsterdam | Netherlands | theatre | https://maps.google.com/?q=Amstel+115,+1018+EM+Amsterdam |
| venue-004 | Royal Highland Centre | — | — | Edinburgh (Ingliston) | United Kingdom | outdoor | https://maps.google.com/?q=Royal+Highland+Centre,+Ingliston,+Edinburgh |
| venue-005 | Royal Concertgebouw | — | — | Amsterdam | Netherlands | concert_hall | https://maps.google.com/?q=Concertgebouwplein+2,+1071+LR+Amsterdam |
| venue-005b | Grote Zaal (Concertgebouw) | venue-005 | — | Amsterdam | Netherlands | concert_hall | — |
| venue-006 | Muziekgebouw aan 't IJ | — | — | Amsterdam | Netherlands | concert_hall | https://maps.google.com/?q=Piet+Heinkade+1,+1019+BR+Amsterdam |
| venue-006b | Grote Zaal (Muziekgebouw) | venue-006 | — | Amsterdam | Netherlands | concert_hall | — |
| venue-007 | JoyJoyJoy Basilika | — | — | Amsterdam | Netherlands | other | https://maps.google.com/?q=Kometensingel+152,+1033+BZ+Amsterdam |
| venue-008 | DeLaMar | — | — | Amsterdam | Netherlands | theatre | https://maps.google.com/?q=Marnixstraat+402,+1017+PL+Amsterdam |
| venue-008b | Wim Sonneveld zaal | venue-008 | — | Amsterdam | Netherlands | theatre | — |
| venue-009 | Bristo Square | — | — | Edinburgh | United Kingdom | other | https://maps.google.com/?q=Bristo+Square,+Edinburgh+EH8+9AL |
| venue-009b | Pleasance Dome | venue-009 | vop-001 | Edinburgh | United Kingdom | theatre | — |
| venue-009c | Ace Dome | venue-009b | — | Edinburgh | United Kingdom | theatre | — |
| venue-009d | Container 1 (Potterrow Plaza) | venue-009b | — | Edinburgh | United Kingdom | other | — |
| venue-010 | Boom Chicago | — | — | Amsterdam | Netherlands | theatre | https://maps.google.com/?q=Rozengracht+117,+1016+LV+Amsterdam |
| venue-010b | Main Theatre (Boom Chicago) | venue-010 | — | Amsterdam | Netherlands | theatre | — |
| venue-011 | George Square | — | — | Edinburgh | United Kingdom | other | https://maps.google.com/?q=George+Square,+Edinburgh+EH8+9LH |
| venue-011b | Assembly George Square Studios | venue-011 | vop-002 | Edinburgh | United Kingdom | theatre | — |
| venue-011c | Studio One | venue-011b | — | Edinburgh | United Kingdom | theatre | — |
| venue-011d | Underground | venue-011b | — | Edinburgh | United Kingdom | theatre | — |
| venue-012 | Big Top — Malieveld Den Haag | — | — | The Hague | Netherlands | circus_tent | https://maps.google.com/?q=Malieveld,+Boorlaan+1,+2585+Den+Haag |
| venue-013 | The Meadows | — | — | Edinburgh | United Kingdom | other | https://maps.google.com/?q=Middle+Meadow+Walk,+Edinburgh+EH9+1AT |
| venue-013b | Underbelly's Circus Hub | venue-013 | vop-003 | Edinburgh | United Kingdom | circus_tent | — |
| venue-013c | The Lafayette | venue-013b | — | Edinburgh | United Kingdom | circus_tent | — |
| venue-014 | Ziggo Dome | — | — | Amsterdam | Netherlands | arena | https://maps.google.com/?q=De+Passage+100,+1101+AX+Amsterdam |
| venue-015 | Eye Filmmuseum | — | — | Amsterdam | Netherlands | other | https://maps.google.com/?q=IJpromenade+1,+1031+KK+Amsterdam |
| venue-016 | Banshee Labyrinth | — | — | Edinburgh | United Kingdom | other | https://maps.google.com/?q=29-35+Niddry+Street,+Edinburgh+EH1+1LG |
| venue-016b | Banqueting Hall | venue-016 | vop-004 | Edinburgh | United Kingdom | other | — |
| venue-017 | Monkey Barrel Comedy | — | — | Edinburgh | United Kingdom | other | https://maps.google.com/?q=9-12+Blair+Street,+Edinburgh+EH1+1QR |
| venue-017b | MB3 | venue-017 | — | Edinburgh | United Kingdom | other | — |
| venue-018 | Dynamic Earth | — | — | Edinburgh | United Kingdom | other | https://maps.google.com/?q=Holyrood+Road,+Edinburgh+EH8+8AS |

---

## Ensembles

| id | name | type | notes |
|---|---|---|---|
| ens-001 | Dutch National Ballet | dance_company | |
| ens-002 | Dutch National Ballet Orchestra | orchestra | |
| ens-003 | Academy of St Martin in the Fields | orchestra | |
| ens-004 | Het Wilde Wat | choir | Amsterdam choir, conducted by Koen Leenaers |
| ens-005 | Netherlands Chamber Orchestra | orchestra | |
| ens-006 | Oxygen | dance_company | Contemporary dance company |
| ens-007 | Boom Chicago | theatre_company | Amsterdam improv comedy company; founded 1993 |
| ens-008 | Baby Wants Candy | theatre_company | Chicago-originated improv musical ensemble |
| ens-009 | Cirque du Soleil | circus_company | Montreal-based |
| ens-010 | Circa | circus_company | Australian contemporary circus company |
| ens-011 | Opera2Day | other | Dutch opera company |
| ens-012 | Netherlands Bach Society | orchestra | Historically informed ensemble |
| ens-013 | Werq the World | other | Touring drag variety show; produced by Voss Events / World of Wonder |
| ens-014 | Darkfield | theatre_company | Immersive experience company; shipping container shows |

---

## Persons

| id | name | roles | notes |
|---|---|---|---|
| per-001 | Nathan Brock | conductor | |
| per-002 | David Dawson | choreographer | |
| per-003 | Krzysztof Pastor | choreographer | |
| per-004 | Alexei Ratmansky | choreographer | |
| per-005 | Greg Haines | composer | |
| per-006 | Philip Glass | composer | |
| per-007 | Gustav Mahler | composer | |
| per-008 | Daniel Sloss | performer | comedian |
| per-009 | Dita Von Teese | performer, choreographer | creative director |
| per-010 | BenDeLaCreme | performer, host | drag icon |
| per-011 | Chappell Roan | performer | |
| per-012 | JADE | performer | support act |
| per-013 | Joshua Bell | performer, conductor | violin; directs from violin |
| per-014 | Floor Kes | performer | violin |
| per-015 | Alicia De Keulenaer | performer | violin |
| per-016 | Katja Naegele | performer | violin |
| per-017 | Natasja Douma | performer | piano |
| per-018 | Jorian van Nee | performer | piano |
| per-019 | Alfred Schnittke | composer | |
| per-020 | George Gershwin | composer | |
| per-021 | Jascha Heifetz | arranger, performer | |
| per-022 | Ernő Dohnányi | composer | |
| per-023 | Pyotr Ilyich Tchaikovsky | composer | |
| per-024 | Johannes Brahms | composer | |
| per-025 | Ernest Bloch | composer | |
| per-026 | Sarah Oates | performer | violin soloist (Dutch National Ballet Orchestra) |
| per-027 | Bernard Andrès | composer | |
| per-028 | Maurice Ravel | composer | |
| per-029 | Luigi Rossi | composer | |
| per-030 | Frédéric Chopin | composer | |
| per-031 | Franz Liszt | composer | |
| per-032 | Ludwig Spohr | composer | |
| per-033 | Claude Debussy | composer | |
| per-034 | Astor Piazzolla | composer | |
| per-035 | Ana Teresa Pereira | composer | born 2003 |
| per-036 | Enrique Granados | composer | |
| per-037 | Monika Stadler | composer | |
| per-038 | Chick Corea | composer | |
| per-039 | Beatriz Sequeira Nunes Carolino | performer | harp |
| per-040 | Catarina Martins de Araujo | performer | harp |
| per-041 | Bradley Swinnen | performer | harp |
| per-042 | Sissi Deng | performer | harp |
| per-043 | Laura de Moura Durao | performer | harp |
| per-044 | Zeynep Göktürk | performer | harp |
| per-045 | Camila Nogueira Fernandes | performer | harp |
| per-046 | Maria Miguel Mota | performer | harp |
| per-047 | Saya Toyama | performer | harp |
| per-048 | Elizabeth Cerra Conroy | performer | harp |
| per-049 | Kiki Jin | performer | harp |
| per-050 | Sergei Prokofiev | composer | |
| per-051 | Samuel Barber | composer | |
| per-052 | Camille Saint-Saëns | composer | |
| per-053 | Georges Bizet | composer | |
| per-054 | Koen Leenaers | conductor | |
| per-055 | Ola Gjeilo | composer | |
| per-056 | Pärt Uusberg | composer | |
| per-057 | Philip Lawson | arranger | |
| per-058 | James MacMillan | composer | |
| per-059 | John Tavener | composer | |
| per-060 | Davin Curtis | arranger | |
| per-061 | Raymond Lévesque | composer | Québécois singer-songwriter; wrote original Quand les hommes vivront d'amour (1956). Glass's 1986 choral setting is a distinct work. |
| per-062 | Wolfgang Amadeus Mozart | composer | |
| per-063 | Lorenzo Da Ponte | librettist | |
| per-064 | Francesco Corti | conductor | |
| per-065 | Kirill Serebrennikov | director | Also set and costume design for this production |
| per-066 | Evgeny Kulagin | director | Revival director |
| per-067 | Björn Bürger | performer | baritone |
| per-068 | Olga Kulchynska | performer | soprano |
| per-069 | Emily Pogorelc | performer | soprano |
| per-070 | Michael Nagl | performer | bass-baritone |
| per-071 | Cecilia Molinari | performer | mezzo-soprano |
| per-072 | Véronique Gens | performer | soprano |
| per-073 | Anthony Robin Schneider | performer | bass |
| per-074 | Steven van der Linden | performer | tenor; Dutch National Opera Studio |
| per-075 | Frederik Bergman | performer | baritone |
| per-076 | Georgy Kudrenko | performer | actor (silent role — Cherubino) |
| per-077 | Marieke Reuten | performer | actress (The Old Woman) |
| per-078 | Nikita Elenev | performer | actor |
| per-079 | Rowan Kievits | performer | actor |
| per-080 | Jennifer Romen | choreographer | Artistic director of Oxygen |
| per-081 | Subp Yao | composer | Music curator/director for Oxygen |
| per-082 | Henry Naylor | playwright, performer | Solo playwright-performer; former Spitting Image writer |
| per-083 | Anaïs Mitchell | composer, playwright | Creator of Hadestown |
| per-084 | Rachel Chavkin | director | |
| per-085 | Jeangu Macrooy | performer | tenor; Orpheus |
| per-086 | Sara Afiba | performer | soprano; Eurydice |
| per-087 | Edwin Jonker | performer | bass-baritone; Hades |
| per-088 | Joy Wielkens | performer | Persephone |
| per-089 | Claudia de Breij | performer | Hermes (alternating) |
| per-090 | Maarten Heijmans | performer | Hermes (alternating) |
| per-091 | Aïcha Gill | performer | Fate |
| per-092 | April Darby | performer | Fate |
| per-093 | Joni Ayton-Kent | performer | Fate |
| per-094 | Michel Laprise | director | Created and directed Kurios |
| per-095 | Raphaël Beau | composer | Kurios score |
| per-096 | Yaron Lifschitz | director, choreographer | Artistic director of Circa |
| per-097 | Ori Lichtik | composer | Original music for Humans 2.0 |
| per-098 | Georg Friedrich Handel | composer | |
| per-099 | Serge van Veggel | director | Artistic director of Opera2Day; concept and scenario |
| per-100 | Aedín Walsh | director | Circus director; co-director of The Opera Circus |
| per-101 | Hernán Schvartzman | conductor | Musical director of Opera2Day |
| per-102 | Stefano Simone Pintor | librettist | Co-wrote libretto with Van Veggel |
| per-103 | Maria Schellenberg | performer | Mezzo-soprano; Armata |
| per-104 | James Hall | performer | Countertenor; Armato |
| per-105 | Maud Bessard-Morandas | performer | Soprano; The Sun / circus troupe |
| per-106 | Joe Baker | performer | Circus artist |
| per-107 | Jean-Charles Gaume | performer | Circus artist |
| per-108 | Arend de Jonge | performer | Circus artist |
| per-109 | Luise Hoffmann | performer | Circus artist |
| per-110 | Mira Leonard | performer | Circus artist |
| per-111 | Angeria Paris VanMichaels | performer | drag queen |
| per-112 | Aquaria | performer | drag queen |
| per-113 | Bosco | performer | drag queen |
| per-114 | Daya Betty | performer | drag queen |
| per-115 | Ginger Minj | performer | drag queen |
| per-116 | Jaida Essence Hall | performer | drag queen |
| per-117 | Kandy Muse | performer | drag queen |
| per-118 | Laganja Estranja | performer | drag queen |
| per-119 | Tilda Swinton | performer, artist | Subject and co-creator of the Eye exhibition |
| per-120 | Pedro Almodóvar | director, artist | |
| per-121 | Luca Guadagnino | director, artist | |
| per-122 | Joanna Hogg | director, artist | |
| per-123 | Derek Jarman | director, artist | 1942–1994 |
| per-124 | Jim Jarmusch | director, artist | |
| per-125 | Olivier Saillard | artist | Fashion historian and performance artist |
| per-126 | Tim Walker | artist | Photographer |
| per-127 | Apichatpong Weerasethakul | director, artist | |
| per-128 | Dean Tsang | performer | Spoken word artist; Bay Fringe Critics Choice Award winner |
| per-129 | Catherine Bohart | performer, host | Irish comedian; host of Who Runs the World? on BBC Radio 4 |
| per-130 | Daisy Doris May | performer | Character comedian and drag king; characters: Steve Porters, The Divine Karen Moonstone, Häns Off |

---

## Works

| id | title | type | creator_id | year | notes |
|---|---|---|---|---|---|
| work-001 | Empire Noir | ballet | per-002 (David Dawson) | 2015 | |
| work-002 | Refraction | ballet | per-003 (Krzysztof Pastor) | 2026 | |
| work-003 | Solitude | ballet | per-004 (Alexei Ratmansky) | 2024 | |
| work-004 | Le nozze di Figaro | opera | per-062 (Mozart) | 1786 | Libretto by Lorenzo Da Ponte |
| work-005 | The Rise | dance_show | per-080 (Jennifer Romen) | 2026 | Produced by Senf Theaterproducties |
| work-006 | Monstering the Rocketman | play | per-082 (Henry Naylor) | 2025 | Solo show |
| work-007 | Hadestown | musical | per-083 (Anaïs Mitchell) | 2019 | |
| work-008 | Kurios: Cabinet of Curiosities | circus_show | per-094 (Michel Laprise) | 2014 | Touring Cirque du Soleil production |
| work-009 | Humans 2.0 | circus_show | per-096 (Yaron Lifschitz) | 2021 | World premiere Sydney 2021 |
| work-010 | The Opera Circus | opera | per-099 (Serge van Veggel) | 2026 | Pasticcio of Handel works; libretto by Pintor and Van Veggel |
| work-011 | Big Night Out | other | per-130 (Daisy Doris May) | 2025 | Character comedy; three characters by one performer |
| work-012 | Our Anxious Measurements III | spoken_word | per-128 (Dean Tsang) | 2025 | Third and final instalment of the Anxious Measurements trilogy |
| work-013 | Flight | other | null | 2018 | Darkfield immersive; shipping container, binaural audio, complete darkness |

---

## Productions

| id | work_id | title | director_id | notes |
|---|---|---|---|---|
| prod-001 | work-004 | Le nozze di Figaro — DNO 2026 | per-065 (Serebrennikov) | Revival director: per-066 (Kulagin). Co-production with Komische Oper Berlin. |
| prod-002 | work-007 | Hadestown — Carré 2025 | per-084 (Rachel Chavkin) | Dutch-British cast. Extended to 6 Sept 2025. |
| prod-003 | work-010 | The Opera Circus — Opera2Day 2026 | per-099 (Van Veggel) | Co-directed by Aedín Walsh (circus). Co-produced with Netherlands Bach Society. |

---

## MusicalPieces

| id | title | movement | composer_id | composer_text | arranger_id | original_work_id | year | catalogue_number | notes |
|---|---|---|---|---|---|---|---|---|---|
| mp-001 | Empire Noir (original score) | — | per-005 (Haines) | — | — | — | 2015 | — | |
| mp-002 | Violin Concerto No. 1 | — | per-006 (Philip Glass) | — | — | — | 1987 | — | |
| mp-003 | Symphony No. 1 in D major | III. Funeral March | per-007 (Mahler) | — | — | — | 1888 | — | |
| mp-004 | Symphony No. 5 in C-sharp minor | IV. Adagietto | per-007 (Mahler) | — | — | — | 1902 | — | |
| mp-005 | Classical Symphony | — | per-050 (Prokofiev) | — | — | — | 1917 | Op. 25 | |
| mp-006 | Adagio for Strings | — | per-051 (Barber) | — | — | — | 1936 | Op. 11 | |
| mp-007 | Violin Concerto No. 3 in B minor | — | per-052 (Saint-Saëns) | — | — | — | 1880 | Op. 61 | |
| mp-008 | Symphony No. 1 in C major | — | per-053 (Bizet) | — | — | — | 1855 | — | |
| mp-009 | Violin Sonata No. 1 | IV. Allegretto scherzando | per-019 (Schnittke) | — | — | — | 1963 | — | |
| mp-010 | Porgy and Bess — Bess, you is my woman now | — | per-020 (Gershwin) | — | per-021 (Heifetz) | mp-010-orig | 1947 | — | Heifetz arrangement |
| mp-010-orig | Porgy and Bess — Bess, you is my woman now | — | per-020 (Gershwin) | — | — | — | 1935 | — | Original |
| mp-011 | Violin Sonata in C-sharp minor | I. Allegro appasionato | per-022 (Dohnányi) | — | — | — | 1911 | Op. 21 | |
| mp-012 | Valse Scherzo in C | — | per-023 (Tchaikovsky) | — | — | — | 1877 | Op. 34 | |
| mp-013 | Violin Sonata No. 3 in D minor | I. Allegro | per-024 (Brahms) | — | — | — | 1886 | Op. 108 | |
| mp-014 | Baal Shem | II. Nigun | per-025 (Bloch) | — | — | — | 1923 | B. 47 | |
| mp-015 | A Fresca | — | per-027 (Andrès) | — | — | — | 1988 | — | |
| mp-016 | Ma mère l'oye | Le petit poucet | per-028 (Ravel) | — | — | — | 1908 | — | |
| mp-017 | Ma mère l'oye | Laideronette | per-028 (Ravel) | — | — | — | 1908 | — | |
| mp-018 | Ma mère l'oye | Impératrice des pagodes | per-028 (Ravel) | — | — | — | 1908 | — | |
| mp-019 | Passaglia in a | — | per-029 (Luigi Rossi) | — | — | — | ca.1660 | — | |
| mp-020 | Waltz No. 6 in D-flat major | — | per-030 (Chopin) | — | — | — | 1846 | Op. 64 No. 1 | |
| mp-021 | Au bord d'une source | — | per-031 (Liszt) | — | — | — | 1848 | S.160/4 | |
| mp-022 | Fantaisie in C minor | — | per-032 (Spohr) | — | — | — | 1807 | Op. 35 | |
| mp-023 | Petite suite | Menuet | per-033 (Debussy) | — | — | — | 1886 | L. 65 | |
| mp-024 | Parvis | — | per-027 (Andrès) | — | — | — | 1974 | — | |
| mp-025 | Oblivion | — | per-034 (Piazzolla) | — | — | — | 1982 | — | |
| mp-026 | Quando eu era pequeninо | — | per-035 (Ana Teresa Pereira) | — | — | — | unknown | — | |
| mp-027 | Danza española No. 5 | — | per-036 (Granados) | — | — | — | 1890 | — | |
| mp-028 | African Reflections | — | per-037 (Monika Stadler) | — | — | — | 2010 | — | |
| mp-029 | Spain | — | per-038 (Chick Corea) | — | — | — | 1971 | — | |
| mp-030 | Ubi Caritas | — | null | trad. Gregorian | per-055 (Gjeilo) | — | — | — | Gjeilo arrangement of Gregorian chant |
| mp-031 | Three Songs: There Are Some Men | — | per-006 (Philip Glass) | — | — | — | 1986 | — | text: Leonard Cohen |
| mp-032 | Ave Verum | — | per-052 (Saint-Saëns) | — | — | — | — | — | Programme also lists "trad. gregoriaans" — possibly referencing the plainchant source |
| mp-033 | Muusika | — | per-056 (Uusberg) | — | — | — | — | — | text: Juhan Liv |
| mp-034 | Three Songs: Quand les hommes vivront d'amour | — | per-006 (Philip Glass) | — | — | — | 1986 | — | text: Raymond Lévesque; orig. song by Lévesque 1956 |
| mp-035 | Down to the River to Pray | — | null | trad. American | per-057 (Lawson) | — | — | — | |
| mp-036 | O Radiant Dawn | — | per-058 (MacMillan) | — | — | — | — | — | text: O Oriens |
| mp-037 | Kaval Sviri | — | null | trad. Bulgarian, arr. Le Mystère des Voix Bulgares | — | — | — | — | |
| mp-038 | Three Songs: Pierre de Soleil | — | per-006 (Philip Glass) | — | — | — | 1986 | — | text: Octavio Paz |
| mp-039 | The Lamb | — | per-059 (Tavener) | — | — | — | — | — | text: William Blake |
| mp-040 | Ripe and Ruin | — | null | Alt-J (arr. Davin Curtis) | per-060 (Curtis) | — | 2012 | — | |

---

## Events

### Event 1 — Masters of Movement (ballet)
| field | value |
|---|---|
| id | evt-001 |
| date | 2026-06-11 |
| time | 20:15 |
| venue_id | venue-001b (Grote Zaal, NOB) |
| festival_id | fest-001 (Holland Festival 2026) |
| type | ballet |
| title | Masters of Movement |
| price_paid | 30.00 |
| currency | EUR |
| data_completeness | partial |
| notes | Cast not fully documented by role. |

**EventBallet**
- subtype: mixed_bill
- company_id: ens-001 (Dutch National Ballet)
- orchestra_id: ens-002 (Dutch National Ballet Orchestra)
- conductor_id: per-001 (Nathan Brock)
- cast: Giorgi Potskhishvili, Jessica Xuan, Salome Leverashvili, Conor Walmsley, Young Gyu Choi, Jan Spunda, Hà Nhi Trân, Robin Park (not assigned to specific pieces)

**BalletProgrammeItems**
| order | work_id | choreographer_id | soloists[] |
|---|---|---|---|
| 1 | work-001 (Empire Noir) | per-002 (Dawson) | — |
| 2 | work-002 (Refraction) | per-003 (Pastor) | per-026 (Sarah Oates, violin) |
| 3 | work-003 (Solitude) | per-004 (Ratmansky) | — |

**BalletProgrammeMusic**
| programme_item | musical_piece_id | order |
|---|---|---|
| Empire Noir | mp-001 (Greg Haines score) | 1 |
| Refraction | mp-002 (Glass Violin Concerto No. 1) | 1 |
| Solitude | mp-003 (Mahler Sym 1, III. Funeral March) | 1 |
| Solitude | mp-004 (Mahler Sym 5, IV. Adagietto) | 2 |

---

### Event 2 — Daniel Sloss: Really…?! (comedy)
| field | value |
|---|---|
| id | evt-002 |
| date | 2014-08-05 |
| time | 20:30 |
| venue_id | venue-002b (Lomond Theatre, EICC) |
| festival_id | fest-002 (Edinburgh Fringe 2014) |
| type | comedy |
| title | Daniel Sloss: Really…?! |
| price_paid | 9.65 |
| currency | GBP |
| data_completeness | complete |
| notes | £19.30 ÷ 2 tickets incl. £1.80 handling fee. |

**EventComedy**
- subtype: standup
- performer_id: per-008 (Daniel Sloss)
- tour_name: Really…?!

---

### Event 3 — Dita Von Teese: Nocturnelle (cabaret)
| field | value |
|---|---|
| id | evt-003 |
| date | 2026-03-28 |
| time | null |
| venue_id | venue-003 (Koninklijk Theater Carré) |
| festival_id | null |
| type | cabaret |
| title | Dita Von Teese: Nocturnelle |
| price_paid | 60.62 |
| currency | EUR |
| data_completeness | partial |
| notes | Resale via TicketSwap. Supporting cast not individually named. |

**EventCabaret**
- subtype: burlesque
- headliner_id: per-009 (Dita Von Teese)
- host_id: per-010 (BenDeLaCreme)
- supporting_cast[]: unnamed neo-burlesque artists
- tour_name: Nocturnelle

---

### Event 4 — Chappell Roan, Edinburgh Summer Sessions (music)
| field | value |
|---|---|
| id | evt-004 |
| date | 2025-08-27 |
| time | 20:45 |
| venue_id | venue-004 (Royal Highland Centre) |
| festival_id | fest-003 (Edinburgh Summer Sessions 2025) |
| type | music |
| title | Chappell Roan — Summer Sessions Edinburgh |
| price_paid | 75.00 |
| currency | GBP |
| data_completeness | complete |

**EventMusic**
- subtype: gig
- headliner_id: per-011 (Chappell Roan)
- support_acts[]: per-012 (JADE)
- tour_name: Visions of Damsels & Other Dangerous Things
- setlist[]: Super Graphic Ultra Modern Girl · Femininomenon · After Midnight · Naked in Manhattan · Guilty Pleasure · Casual · The Subway · HOT TO GO! · Barracuda (Heart cover) · Picture You · Love Me Anyway · The Giver · Red Wine Supernova · Coffee · Good Luck, Babe! · My Kink Is Karma · California · Pink Pony Club
- setlist_fm_url: https://www.setlist.fm/setlist/chappell-roan/2025/royal-highland-centre-showground-ingliston-scotland-53597729.html

---

### Event 5 — Joshua Bell & ASMF, Concertgebouw (classical)
| field | value |
|---|---|
| id | evt-005 |
| date | 2019-01-08 |
| time | 20:15 |
| venue_id | venue-005b (Grote Zaal, Concertgebouw) |
| festival_id | null |
| type | classical |
| title | Joshua Bell & Academy of St Martin in the Fields |
| price_paid | 18.73 |
| currency | EUR |
| data_completeness | complete |
| notes | €37.46 ÷ 2 tickets incl. €2.50 transaction fee. Seat: Hoekbalkon Noord rij 5 stoel 41/42. Joshua Bell directing from the violin. |

**EventClassical**
- subtype: orchestral
- ensemble_id: ens-003 (Academy of St Martin in the Fields)
- conductor_id: per-013 (Joshua Bell)

**ClassicalProgrammeItems**
| order | musical_piece_id | soloists[] | notes |
|---|---|---|---|
| 1 | mp-005 (Prokofiev Classical Symphony) | — | — |
| 2 | mp-007 (Saint-Saëns Violin Concerto No. 3) | per-013 (Joshua Bell) | — |
| 3 | mp-006 (Barber Adagio for Strings) | — | — |
| 4 | mp-008 (Bizet Symphony No. 1) | — | — |

---

### Event 6 — Floor Kes, Alicia De Keulenaer + Katja Naegele, Muziekgebouw (classical)
| field | value |
|---|---|
| id | evt-006 |
| date | 2026-05-08 |
| time | 12:30 |
| venue_id | venue-006b (Grote Zaal, Muziekgebouw) |
| festival_id | null |
| type | classical |
| title | Floor Kes, Alicia De Keulenaer + Katja Naegele |
| price_paid | 6.50 |
| currency | EUR |
| data_completeness | complete |
| notes | Drie winnaars Coosje Wijzenbeek Prijs. Lunchconcert i.s.m. Het Muziekinstrumentenfonds. Programme recovered from physical programme photo. |

**EventClassical**
- subtype: recital
- ensemble_id: null
- conductor_id: null

**ClassicalProgrammeItems**
| order | musical_piece_id | soloists[] |
|---|---|---|
| 1 | mp-009 (Schnittke Violin Sonata No. 1, IV) | per-014 (Floor Kes), per-017 (Natasja Douma) |
| 2 | mp-010 (Gershwin/Heifetz — Bess, you is my woman now) | per-014 (Floor Kes), per-017 (Natasja Douma) |
| 3 | mp-011 (Dohnányi Violin Sonata, I) | per-015 (Alicia De Keulenaer), per-017 (Natasja Douma) |
| 4 | mp-012 (Tchaikovsky Valse Scherzo) | per-015 (Alicia De Keulenaer), per-017 (Natasja Douma) |
| 5 | mp-013 (Brahms Violin Sonata No. 3, I) | per-016 (Katja Naegele), per-018 (Jorian van Nee) |
| 6 | mp-014 (Bloch Baal Shem, II. Nigun) | per-016 (Katja Naegele), per-018 (Jorian van Nee) |

---

### Event 7 — CvA Harp, Muziekgebouw (classical)
| field | value |
|---|---|
| id | evt-007 |
| date | 2026-05-14 |
| time | 12:30 |
| venue_id | venue-006b (Grote Zaal, Muziekgebouw) |
| festival_id | null |
| type | classical |
| title | CvA Harp |
| price_paid | 6.50 |
| currency | EUR |
| data_completeness | complete |
| notes | Lunchconcert i.s.m. Conservatorium van Amsterdam. All harp. Harpklas onder leiding van Sandrine Chatron. Programme recovered from physical programme photo. |

**EventClassical**
- subtype: recital
- ensemble_id: null
- conductor_id: null

**ClassicalProgrammeItems**
| order | musical_piece_id | soloists[] |
|---|---|---|
| 1 | mp-015 (Andrès — A Fresca) | per-042 (Sissi Deng), per-044 (Zeynep Göktürk), per-041 (Bradley Swinnen), per-039 (Beatriz Sequeira Nunes Carolino) |
| 2 | mp-016 (Ravel — Ma mère l'oye, Le petit poucet) | per-047 (Saya Toyama), per-044 (Zeynep Göktürk), per-045 (Camila Nogueira Fernandes) |
| 3 | mp-017 (Ravel — Ma mère l'oye, Laideronette) | per-047 (Saya Toyama), per-044 (Zeynep Göktürk), per-045 (Camila Nogueira Fernandes) |
| 4 | mp-018 (Ravel — Ma mère l'oye, Impératrice des pagodes) | per-047 (Saya Toyama), per-044 (Zeynep Göktürk), per-045 (Camila Nogueira Fernandes) |
| 5 | mp-019 (Luigi Rossi — Passaglia in a) | per-043 (Laura de Moura Durao) |
| 6 | mp-020 (Chopin — Waltz No. 6) | per-047 (Saya Toyama), per-042 (Sissi Deng), per-044 (Zeynep Göktürk), per-040 (Catarina Martins de Araujo), per-039 (Beatriz Sequeira Nunes Carolino) |
| 7 | mp-021 (Liszt — Au bord d'une source) | per-046 (Maria Miguel Mota), per-040 (Catarina Martins de Araujo), per-049 (Kiki Jin), per-041 (Bradley Swinnen) |
| 8 | mp-022 (Spohr — Fantaisie in C minor) | per-048 (Elizabeth Cerra Conroy) |
| 9 | mp-023 (Debussy — Petite suite, Menuet) | per-043 (Laura de Moura Durao), per-041 (Bradley Swinnen), per-039 (Beatriz Sequeira Nunes Carolino), per-042 (Sissi Deng) |
| 10 | mp-024 (Andrès — Parvis) | per-040 (Catarina Martins de Araujo), per-039 (Beatriz Sequeira Nunes Carolino) |
| 11 | mp-025 (Piazzolla — Oblivion) | per-043 (Laura de Moura Durao), per-046 (Maria Miguel Mota), per-048 (Elizabeth Cerra Conroy) |
| 12 | mp-026 (Ana Teresa Pereira — Quando eu era pequeninо) | per-046 (Maria Miguel Mota), per-043 (Laura de Moura Durao), per-045 (Camila Nogueira Fernandes) |
| 13 | mp-027 (Granados — Danza española No. 5) | per-046 (Maria Miguel Mota), per-039 (Beatriz Sequeira Nunes Carolino), per-048 (Elizabeth Cerra Conroy), per-047 (Saya Toyama) |
| 14 | mp-028 (Monika Stadler — African Reflections) | per-044 (Zeynep Göktürk), per-040 (Catarina Martins de Araujo), per-049 (Kiki Jin), per-047 (Saya Toyama) |
| 15 | mp-029 (Chick Corea — Spain) | per-048 (Elizabeth Cerra Conroy), per-047 (Saya Toyama), per-043 (Laura de Moura Durao), per-046 (Maria Miguel Mota), per-044 (Zeynep Göktürk), per-039 (Beatriz Sequeira Nunes Carolino) |

---

### Event 8 — Het Wilde Wat — Iets nieuws onder de zon (classical)
| field | value |
|---|---|
| id | evt-008 |
| date | 2026-06-06 |
| time | 17:00 |
| venue_id | venue-007 (JoyJoyJoy Basilika) |
| festival_id | null |
| type | classical |
| title | Het Wilde Wat — Iets nieuws onder de zon |
| price_paid | 10.00 |
| currency | EUR |
| data_completeness | complete |
| notes | Inloop 16:30. Former church venue. |

**EventClassical**
- subtype: choral
- ensemble_id: ens-004 (Het Wilde Wat)
- conductor_id: per-054 (Koen Leenaers)

**ClassicalProgrammeItems**
| order | musical_piece_id | soloists[] | notes |
|---|---|---|---|
| 1 | mp-030 (Ubi Caritas, Gjeilo arr.) | — | trad. Gregorian |
| 2 | mp-031 (Three Songs: There Are Some Men — Glass) | — | text: Leonard Cohen |
| 3 | mp-032 (Ave Verum — Saint-Saëns) | — | |
| 4 | mp-033 (Muusika — Uusberg) | — | text: Juhan Liv |
| 5 | mp-034 (Three Songs: Quand les hommes vivront d'amour — Glass) | — | text: Raymond Lévesque |
| 6 | mp-035 (Down to the River to Pray, Lawson arr.) | — | trad. American |
| 7 | mp-036 (O Radiant Dawn — MacMillan) | — | text: O Oriens |
| 8 | mp-037 (Kaval Sviri, LMVB arr.) | — | trad. Bulgarian |
| 9 | mp-038 (Three Songs: Pierre de Soleil — Glass) | — | text: Octavio Paz |
| 10 | mp-039 (The Lamb — Tavener) | — | text: William Blake |
| 11 | mp-040 (Ripe and Ruin, Curtis arr.) | — | Alt-J |

---

### Event 9 — Le nozze di Figaro (opera)
| field | value |
|---|---|
| id | evt-009 |
| date | 2026-05-20 |
| time | null |
| venue_id | venue-001b (Grote Zaal, NOB) |
| festival_id | null |
| type | opera |
| title | Le nozze di Figaro |
| work_id | work-004 |
| price_paid | 46.29 |
| currency | EUR |
| data_completeness | complete |
| notes | Resale via TicketSwap. Running time 3:30 incl. 1 interval. Revival director Evgeny Kulagin noted in prod-001. |

**EventOpera**
- subtype: opera
- work_id: work-004
- production_id: prod-001
- ensemble_id: ens-005 (Netherlands Philharmonic Orchestra)
- libretto_language: Italian
- surtitles_languages: ["Dutch", "English"]
- operabase_url: https://www.operabase.com/productions/le-nozze-di-figaro-476319/10-may-2026/en

**Credits (event_credit rows, 20 May)**
| sort_order | role | person |
|---|---|---|
| 0 | Conductor | Francesco Corti |
| 1 | Stage Director | Kirill Serebrennikov |
| 1 | Stage Director | Evgeny Kulagin |
| 2 | Cembalo continuo | Pedro Beriso |
| 3 | Costume Design | Kirill Serebrennikov |
| 3 | Costume Design | Tatiana Dolmatovskaya |
| 4 | Set Design | Olga Pavlyuk |
| 4 | Set Design | Kirill Serebrennikov |
| 5 | Lighting Design | Sergey Kucher |
| 6 | Video Design | Ilya Shagalov |
| 7 | Dramaturgy | Daniil Orlov |
| 8 | Choreographer | Evgeny Kulagin |

**Cast (20 May)**
| role | person |
|---|---|
| Count Almaviva | Björn Bürger |
| Countess Almaviva | Olga Kulchynska |
| Susanna | Emily Pogorelc |
| Figaro | Michael Nagl |
| Marcellina | Véronique Gens |
| Cherubina | Cecilia Molinari |
| Bartolo | Anthony Robin Schneider |
| Basilio | Steven van der Linden |
| Antonio | Frederik Bergman |
| Cherubino | Georgy Kudrenko |
| The Count's Henchman | Nikita Kukushkin |
| The Young Man (1) | Nikita Elenev |
| The Young Man (2) | Rowan Kievits |
| The Old Woman | Marieke Reuten |

---

### Event 10 — Oxygen: The Rise (dance)
| field | value |
|---|---|
| id | evt-010 |
| date | 2026-06-14 |
| time | 16:00 |
| venue_id | venue-008b (Wim Sonneveld zaal, DeLaMar) |
| festival_id | null |
| type | dance |
| title | Oxygen: The Rise |
| work_id | work-005 |
| price_paid | 31.00 |
| currency | EUR |
| data_completeness | complete |

**EventDance**
- subtype: contemporary
- company_id: ens-006 (Oxygen)
- choreographer_id: per-080 (Jennifer Romen)
- work_id: work-005 (The Rise)
- music_notes: Music by Subp Yao; includes works by Ludovico Einaudi

---

### Event 11 — Monstering the Rocketman (theatre / play)
| field | value |
|---|---|
| id | evt-011 |
| date | 2025-08-11 |
| time | 16:10 |
| venue_id | venue-009c (Ace Dome, Pleasance Dome) |
| festival_id | fest-004 (Edinburgh Fringe 2025) |
| type | theatre |
| title | Monstering the Rocketman |
| work_id | work-006 |
| price_paid | 14.50 |
| currency | GBP |
| data_completeness | complete |
| notes | £29.00 ÷ 2 tickets incl. £2.00 handling fee. |

**EventTheatre**
- subtype: play
- work_id: work-006
- production_id: null
- company_id: null
- director_id: null
- playwright_id: per-082 (Henry Naylor)
- cast: { "performer": per-082 (Henry Naylor) }

---

### Event 12 — Improv Spectacular: Holiday Edition (theatre / improv)
| field | value |
|---|---|
| id | evt-012 |
| date | 2025-12-15 |
| time | 20:00 |
| venue_id | venue-010b (Main Theatre, Boom Chicago) |
| festival_id | null |
| type | theatre |
| title | Improv Spectacular: Holiday Edition |
| work_id | null |
| price_paid | 31.60 |
| currency | EUR |
| data_completeness | complete |
| notes | €63.20 ÷ 2 tickets incl. VAT and fees. Balcony seating. Cava included in ticket price. |

**EventTheatre**
- subtype: improv
- work_id: null
- production_id: null
- company_id: ens-007 (Boom Chicago)
- director_id: null
- playwright_id: null
- cast: null

---

### Event 13 — Baby Wants Candy (theatre / improv_musical)
| field | value |
|---|---|
| id | evt-013 |
| date | 2024-08-18 |
| time | 20:00 |
| venue_id | venue-011c (Studio One, Assembly George Square Studios) |
| festival_id | fest-005 (Edinburgh Fringe 2024) |
| type | theatre |
| title | Baby Wants Candy |
| work_id | null |
| price_paid | 16.50 |
| currency | GBP |
| data_completeness | partial |
| notes | £33.00 ÷ 2 concession tickets. Audience-voted musical title unknown; possibly Grindr-related per Claire's memory. |

**EventTheatre**
- subtype: improv_musical
- work_id: null
- production_id: null
- company_id: ens-008 (Baby Wants Candy)
- director_id: null
- playwright_id: null
- cast: null

---

### Event 14 — Hadestown (theatre / musical)
| field | value |
|---|---|
| id | evt-014 |
| date | 2025-09-03 |
| time | 15:00 |
| venue_id | venue-003 (Koninklijk Theater Carré) |
| festival_id | null |
| type | theatre |
| title | Hadestown |
| work_id | work-007 |
| price_paid | 37.01 |
| currency | EUR |
| data_completeness | partial |
| notes | €35.00 + €2.01 booking fee. Hermes unknown — alternated between De Breij and Heijmans. |

**EventTheatre**
- subtype: musical
- work_id: work-007
- production_id: prod-002
- company_id: null
- director_id: per-084 (Rachel Chavkin)
- playwright_id: per-083 (Anaïs Mitchell)
- cast: { "Orpheus": per-085, "Eurydice": per-086, "Hades": per-087, "Persephone": per-088, "Hermes": unknown, "Fate": [per-091, per-092, per-093] }

---

### Event 15 — Kurios: Cabinet of Curiosities (circus)
| field | value |
|---|---|
| id | evt-015 |
| date | 2025-12-07 |
| time | 16:00 |
| venue_id | venue-012 (Big Top, Malieveld Den Haag) |
| festival_id | null |
| type | circus |
| title | Kurios: Cabinet of Curiosities |
| work_id | work-008 |
| price_paid | 106.75 |
| currency | EUR |
| data_completeness | complete |

**EventCircus**
- subtype: contemporary_circus
- company_id: ens-009 (Cirque du Soleil)
- director_id: per-094 (Michel Laprise)
- work_id: work-008

---

### Event 16 — Circa: Humans 2.0 (circus)
| field | value |
|---|---|
| id | evt-016 |
| date | 2024-08-13 |
| time | 18:20 |
| venue_id | venue-013c (The Lafayette, Underbelly's Circus Hub) |
| festival_id | fest-005 (Edinburgh Fringe 2024) |
| type | circus |
| title | Circa: Humans 2.0 |
| work_id | work-009 |
| price_paid | 18.75 |
| currency | GBP |
| data_completeness | complete |
| notes | £37.50 ÷ 2 tickets incl. £2.50 booking fee. |

**EventCircus**
- subtype: contemporary_circus
- company_id: ens-010 (Circa)
- director_id: per-096 (Yaron Lifschitz)
- work_id: work-009

---

### Event 17 — The Opera Circus (opera)
| field | value |
|---|---|
| id | evt-017 |
| date | 2026-03-13 |
| time | 20:00 |
| venue_id | venue-003 (Koninklijk Theater Carré) |
| festival_id | null |
| type | opera |
| title | The Opera Circus |
| work_id | work-010 |
| price_paid | 30.65 |
| currency | EUR |
| data_completeness | complete |
| notes | €91.95 ÷ 3 tickets incl. €4.95 booking fee. Contemporary circus integrated throughout. Co-direction: Serge van Veggel (staging) and Aedín Walsh (circus). |

**EventOpera**
- subtype: opera
- work_id: work-010
- production_id: prod-003
- conductor_id: per-101 (Hernán Schvartzman)
- director_id: per-099 (Serge van Veggel)
- ensemble_id: ens-012 (Netherlands Bach Society)
- libretto_language: Italian
- surtitles_languages: ["Dutch", "English"]
- operabase_url: null

**Cast**
| role | person_id |
|---|---|
| Armata, goddess of war | per-103 (Maria Schellenberg) |
| Armato, god of war | per-104 (James Hall) |
| The Sun / circus troupe | per-105 (Maud Bessard-Morandas) |
| Circus troupe | per-106 (Joe Baker) |
| Circus troupe | per-107 (Jean-Charles Gaume) |
| Circus troupe | per-108 (Arend de Jonge) |
| Circus troupe | per-109 (Luise Hoffmann) |
| Circus troupe | per-110 (Mira Leonard) |

---

### Event 18 — Daisy Doris May: Big Night Out (comedy)
| field | value |
|---|---|
| id | evt-018 |
| date | 2025-08-08 |
| time | 21:50 |
| venue_id | venue-011d (Underground, Assembly George Square Studios) |
| festival_id | fest-004 (Edinburgh Fringe 2025) |
| type | comedy |
| title | Daisy Doris May: Big Night Out |
| work_id | work-011 |
| price_paid | 15.85 |
| currency | GBP |
| data_completeness | complete |
| notes | £79.25 ÷ 5 tickets incl. £6.25 booking fee. Drag king character comedy. |

**EventComedy**
- subtype: character
- performer_id: per-130 (Daisy Doris May)
- support_acts: null
- ensemble_id: null
- tour_name: Big Night Out

---

### Event 19 — RuPaul's Drag Race: Werq the World (cabaret)
| field | value |
|---|---|
| id | evt-019 |
| date | 2023-11-02 |
| time | 20:00 |
| venue_id | venue-014 (Ziggo Dome) |
| festival_id | null |
| type | cabaret |
| title | RuPaul's Drag Race: Werq the World |
| price_paid | 47.59 |
| currency | EUR |
| data_completeness | complete |
| notes | €95.18 ÷ 2 tickets incl. €7.18 fees. Resale via TicketSwap. |

**EventCabaret**
- subtype: drag
- headliner_id: null
- host_id: null
- supporting_cast: [per-111 (Angeria), per-112 (Aquaria), per-113 (Bosco), per-114 (Daya Betty), per-115 (Ginger Minj), per-116 (Jaida Essence Hall), per-117 (Kandy Muse), per-118 (Laganja Estranja)]
- ensemble_id: ens-013 (Werq the World)
- tour_name: Werq the World 2023

---

### Event 20 — Tilda Swinton: Ongoing (exhibition)
| field | value |
|---|---|
| id | evt-020 |
| date | 2026-03-11 |
| time | null |
| venue_id | venue-015 (Eye Filmmuseum) |
| festival_id | null |
| type | exhibition |
| title | Tilda Swinton: Ongoing |
| price_paid | 0.00 |
| currency | EUR |
| data_completeness | complete |
| notes | Museumkaart. |

**EventExhibition**
- subtype: art
- exhibition_title: Tilda Swinton – Ongoing
- artists: [per-119 (Tilda Swinton), per-120 (Pedro Almodóvar), per-121 (Luca Guadagnino), per-122 (Joanna Hogg), per-123 (Derek Jarman), per-124 (Jim Jarmusch), per-125 (Olivier Saillard), per-126 (Tim Walker), per-127 (Apichatpong Weerasethakul)]
- medium: mixed media — film installations, photography, performance, objects
- permanent_or_temp: temporary
- exhibition_url: https://www.eyefilm.nl/en/programme/tilda-swinton/1473850

---

### Event 21 — Eye Filmmuseum Permanent Collection (exhibition)
| field | value |
|---|---|
| id | evt-021 |
| date | 2026-03-11 |
| time | null |
| venue_id | venue-015 (Eye Filmmuseum) |
| festival_id | null |
| type | exhibition |
| title | Eye Filmmuseum Permanent Collection |
| price_paid | 0.00 |
| currency | EUR |
| data_completeness | stub |
| notes | Museumkaart. Same-day visit as evt-020. |

**EventExhibition**
- subtype: other
- permanent_or_temp: permanent

---

### Event 22 — Our Anxious Measurements III (spoken_word)
| field | value |
|---|---|
| id | evt-022 |
| date | 2025-08-23 |
| time | 16:30 |
| venue_id | venue-016b (Banqueting Hall, Banshee Labyrinth) |
| festival_id | fest-004 (Edinburgh Fringe 2025) |
| type | spoken_word |
| title | Our Anxious Measurements III |
| work_id | work-012 |
| price_paid | 0.00 |
| currency | GBP |
| data_completeness | complete |
| notes | PBH Free Fringe. |

**EventSpokenWord**
- subtype: spoken_word
- performers: [per-128 (Dean Tsang)]
- works_read: [work-012]
- host_id: null

---

### Event 23 — Catherine Bohart: Who Runs the World? (talk)
| field | value |
|---|---|
| id | evt-023 |
| date | 2023-08-09 |
| time | 18:30 |
| venue_id | venue-018 (Dynamic Earth) |
| festival_id | fest-006 (Edinburgh Fringe 2023) |
| type | talk |
| title | Catherine Bohart: Who Runs the World? |
| price_paid | 0.00 |
| currency | GBP |
| data_completeness | complete |
| notes | BBC Radio 4 live recording. Free ballot tickets. |

**EventTalk**
- subtype: podcast_recording
- speaker_ids: [per-129 (Catherine Bohart)]
- host_id: per-129 (Catherine Bohart)
- topic: Women and power
- host_organisation: BBC Radio 4

---

### Event 25 — Mumford & Sons (music)
| field | value |
|---|---|
| date | 2025-11-17 |
| venue_id | venue-014 (Ziggo Dome) |
| type | music |
| title | Mumford & Sons |
| price_paid | 77.15 |
| currency | EUR |
| data_completeness | complete |

**EventMusic**
- setlist[]: Run Together · Babel · Rushmere · Little Lion Man · Hopeless Wanderer · Lover of the Light · Believe · Truth · Here · Ghosts That We Knew · Guiding Light · Caroline · White Blank Page · Ditmas · The Cave · Roll Away Your Stone · Delta · The Wolf · Timshel · Rubber Band Man · Awake My Soul · I Will Wait · Conversation With My Son (Gangsters & Angels)
- setlist_fm_url: https://www.setlist.fm/setlist/mumford-and-sons/2025/ziggo-dome-amsterdam-netherlands-2b58949a.html

---

### Event 24 — Flight (other)
| field | value |
|---|---|
| id | evt-024 |
| date | 2024-08-23 |
| time | 19:00 |
| venue_id | venue-009d (Container 1, Potterrow Plaza) |
| festival_id | fest-005 (Edinburgh Fringe 2024) |
| type | other |
| subtype | immersive_experience |
| title | Flight |
| work_id | work-013 |
| price_paid | 10.00 |
| currency | GBP |
| data_completeness | complete |
| notes | £20.00 ÷ 2 concession tickets. Darkfield. 30 mins, complete darkness, binaural audio. |
