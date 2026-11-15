# Career ladder rework (drag first, circuit later)

Status: **Nov 15: owner's draft received; audit and research done; thoughts
and questions sent to the owner. No code.** This replaces
`career-rebalance.md` (the rival and money pass becomes part of this).

## The owner's draft (Nov 15, drawing)
- A horizontal spine per class: **5 sections, then the King race event**.
- **4 events per section** (2 branches above the spine, 2 below).
- **Events are worth 5 points; a section needs 15 (3 of its 4 events)** to
  open the next.
- An event is like a race day: **3-5 races; 75% of them, rounded up, must be
  completed**.
- **King race event:** the King ladder rivals, each beaten before the King.
- **Themes:** bracket, street no-prep, strip no-prep, 1/4 mile, 1/8 mile
  (owner unsure about splitting 1/4 and 1/8).
- **Restricted events** in some classes: FWD (a class or events), AWD,
  others like Street Outlaws.
- Drag only; the circuit gets the same idea later, called Circuit
  (endurance, low power, Miata only...).
- Calendar: "not sure how to work it in, but sure there's a good way".

## What the game has today (audit, Nov 15)
- **6 drag classes** (Backroad Beaters, Rookie Nights, Bracket Bandits,
  Street Outlaws, Radial Wars, Pro Mod Legends). Each has:
  - 10 main race days, opened in "weeks" by wins (`needWins` 0-5): 1/4,
    1/8, street, sponsor, knockout (3 rivals), night invitational (no-prep);
  - side races: 2 class races (Four-Banger, Stock Motor, All Motor, Street
    Tire, 275 Radial, Heavyweight, Import, Small Block, X275, Lightweight,
    Factory Hot Rod), 2 bracket races (3 rounds), 1 car show goal;
  - a 5-rival ladder (callouts, opened by class rep);
  - the King: needs the sponsor contract done and ladder #1 beaten; races
    for their car.
  - Code: `career.js` (stages, sponsors, unlocks), `season.js` (rep,
    brackets, ladder, Kings, pink slips), `schedule.js` (slots, calendar,
    race-day scoring, which is built but off), `screens.js` (the road view).
- **Size:** 90 races in the main + class events, about 156 races to finish
  everything (brackets and callouts included), about 100 on the shortest
  path. Purses: $8.4k (class 1) to $590k (class 6), $993k in all.
- **Rival times:** class 1 from 20.2 s to 14.0 s (King); 2: 13.6-12.6;
  3: 12.2-10.2; 4: 10.0-8.9; 5: 8.8-7.2; 6: 7.1-6.7 (1/4 mile).
- **Discipline Kings:** Heads-Up (= class 6 King), Bracket King and
  No-Prep King (open with 60 discipline rep), Circuit King.
- **Calendar slots:** Fri night street and no-prep, Sat strip (day and
  night), Sun brackets and class races, King on the 2nd and 4th Saturday
  night, Bracket King last Sunday, No-Prep King last Friday, Wed Grudge
  Night, street spots Mon/Tue/Thu/Fri nights. Race days come back every
  week until won; inside a window you can rematch at once.
- **Around it:** sponsors (contract gates the King, free car), unlocks per
  race (part levels per shop group, body kit tiers, cars), licenses
  (9.99 / 7.49) and tech (bar, cage, chute) at the strip only, hired
  drivers can race days (not Kings or pink slips), heat soak and nitrous
  bottle pressure carry between rounds of a multi-round event only, the
  circuit career has its own classes (`ccareer.js`).
- **Cars per drivetrain:** FWD: Metro, Civic, Neon, Golf GTI, Cobalt SS
  (class 1), Integra (class 2). AWD: STI, Evo (class 2), R34, Ram diesel
  (class 3), GT-R, 911 (circuit), Aventador (class 5). Trucks: C1500,
  Lightning, Ram.

## Research
### Real race days
- **Bracket race day** (IRP E.T. Bracket Series rulebook, 2024): gates 8
  AM, 1-2 time trials from 10 AM, eliminations straight after, done by 6-7
  PM. Single elimination; the bye goes to the best reaction time; one bye
  each; first-round losers can **buy back** in (half the entry). Points:
  **20 for making the first round, +10 per round won, +1 for the class win**
  (a 6-round race: 20 / 30 / ... / runner-up 70 / winner 81). Classes by
  ET range and distance: Super Pro 4.30-7.75 (1/8), Pro 5.40-8.99 (1/8),
  Sportsman 11.60-19.99 (1/4). Payout by round reached (Super Pro:
  winner $800-2,500 by car count, runner-up, semi, quarter...).
- **National events:** 16-car fields set by qualifying (usually 4
  sessions), then 4 elimination rounds. "Chicago style" (3 runs): one
  qualifying pass, one elimination round, the two quickest winners race
  the final (Wikipedia, Drag racing).
- **No Prep Kings:** points per event; an Invitational and the Great 8
  (top 8 qualifiers race a bracket); finale races worth 1.5x-2x points.
  No-prep classes: small tire (28x10.5 limit, no wheelie bars) and big
  tire (anything) (Racepages coverage).
- **Street Outlaws:** the List: racers call out the spot above; win and
  take it (our ladder already works like this).
- **Distances:** 1/4 is the classic; NHRA Top Fuel runs 1,000 ft; PDRA
  and outlaw radial / no-prep racing run 1/8: cheaper on parts, safer,
  short tracks, and "everything must be perfect" in 660 ft (SEMA,
  Performance Racing Industry, Dragzine on NMRA Street Outlaw moving to
  1/8). Sportsman brackets run either.
- **FWD and AWD classes:** NHRA Sport FWD (SFWD: original chassis, 25 x
  9.5 tire max, 2,200 lb minimum, turbo or nitrous); Santa Pod's FWD Drag
  Series (4 rounds a season, heads-up FWD class); NOPI's X-classes (XFWD,
  XAWD vs XRWD; tire limits FWD 25 x 9.5, AWD 28 x 11.5).
- **Index classes:** a fixed number, breakout rule (Super Street 10.90,
  Super Gas 9.90, Super Comp 8.90).
- **X275:** heads-up, 275 radial (or 28 x 10.5), one power adder, weight
  by combination; grew from small-block nitrous shootouts.
- **Drag & Drive (Hot Rod Drag Week):** 5 days, 4-5 tracks, driven
  between them, classes won on average ET.

### Other games
- **CSR2:** 5 tiers; each tier's crew: beat 4 members, then the leader
  (our King ladder); regulation races in Rookie / Amateur / Pro difficulty.
- **NFS ProStreet:** race days of up to 8 races, win or dominate a day
  (points); showdowns open with "dominate 2, win 5 race days"; discipline
  Kings (Drag, Drift, Grip, Speed).
- **NFS Underground 2:** stages; a stage needs a number of events done;
  one sponsor per stage, so some sponsor races are never run.
- **Forza Motorsport (2023) Builders Cup:** tours of series, each series
  4-6 races with a car restriction (era, class, type), a trophy for the
  placing.
- **Gran Turismo 4:** beginner series include the FF, FR, 4WD and MR
  Challenges (one drivetrain each), plus licenses gating harder events.
- **Super Mario 64 (gating design):** doors open by star count, not by
  which stars: "you can reach 30 stars without touching a hard course".
  The owner's "3 of 4" is the same idea: progress without your worst
  event.
- **Session length:** mobile game median session about 4.5 min (GameAnalytics
  2024), top games 8-9 min. An event of 3-5 races (about a minute each)
  is one session.

## Thoughts (Claude, Nov 15)
### What works
- **3 of 4 is the best part.** Like Mario's stars it lets a player skip
  the one event they can't do (a bracket hater, a car that can't hook on
  no-prep, the FWD-only event) without a wall.
- **Events of 3-5 races** fit a phone session (4-6 min) and match real
  race days (eliminations of 3-5 rounds).
- **King ladder inside the King event** is CSR2's crew battle and the
  Street Outlaws list: familiar and real.
- **It fixes current flaws:** single-race events that you rematch until
  you win, rep as a hidden gate, race days that only differ by name.

### Holes and flaws found
1. **The 75% rule on 3 races is 100%:** ceil(0.75 x 3) = 3, so a 3-race
   event allows no loss, a 4-race one allows 1, a 5-race one 1. Fix:
   "lose at most one" (2 of 3, 3 of 4, 4 of 5), or make every event 4.
2. **Points add nothing yet:** 5 per event and 15 per section is the same
   as "3 of 4". Either show it as 3/4, or let points mean something
   (perfect event = 5, completed = 3?).
3. **Eliminations don't fit "75% of races":** at a real strip race a loss
   puts you out. Either events are race cards (several opponents, one
   race each) or eliminations where "complete" = reach the final.
4. **Retries:** today you can rematch at once in the window. With 3-5
   races, an immediate retry makes the threshold meaningless; a weekly
   retry costs a week of bills. Real middle: one buyback a day.
5. **Restricted events can wall a player:** a section with two restricted
   events (FWD + AWD) needs two special cars, and garage bays are limited.
   Rule: at most one restricted event per section. A whole FWD class would
   force every player into a FWD car (6 FWD cars exist, all cheap
   starters): better as an optional series.
6. **License gap:** strip events need the license past 9.99 / 7.49;
   street and no-prep don't. With 3 of 4, a player could skip the license
   entirely by doing street and no-prep (realistic for outlaws, but
   decide).
7. **Breakage mid-event:** a car that breaks in race 2 of 4: is the day
   over (realistic), or can you swap cars?
8. **Heat soak and the nitrous bottle** only carry between rounds of a
   knockout today; events of 3-5 races make them matter on every event
   (the heat-soak audit in the backlog becomes part of this).
9. **Scale:** 6 x 20 events x 4 races = ~480 race slots, against 126
   rival times today. Needs a roster per class (16-20 named regulars
   whose builds step up section by section, plus FWD/AWD/truck regulars
   for restricted events), generated with the existing rival builder.
   The rival snapshot changes completely (planned).
10. **Length and money:** the shortest path goes from ~100 races to
    ~300-450 (15 events x 3-4 wins + the King ladder, per class), 3-4x
    longer. Purses have to be re-spread (today a race day pays what an
    event would) and bills run monthly, so the game-time length matters
    too. Needs the measurement run first.
11. **Calendar:** 4 themes, 4 weekly slots: about a section a week at
    best, 5-8 weeks a class, 8-12 game months for the career (bills!).
12. **Old saves:** events don't map 1:1. Needs a rule (finished classes
    count as done; the current class restarts or gets credit).
13. **Things that overlap:** class side races (become restricted
    events), bracket side races and race-day scoring (folded in), rep and
    callouts (replaced by sections and the King event), the Bracket and
    No-Prep Kings (keep as theme Kings?), sponsors (contract gates the
    King today), short series and car clubs (keep or fold).
14. **Circuit later:** circuit races are run by your team's drivers at
    4x time; 3-5 race events there take long. One-make events (Miata
    only) need that car per driver.

### Suggestions
- **Themes = format + surface:** Heads-Up (prepped strip), Bracket
  (dial-in), No-Prep (strip, unprepped) and Street (night, street
  surface). **Distance is a property of each event, not a theme:**
  street and no-prep mostly 1/8 (like real), heads-up and brackets
  1/4 early and more 1/8 in the top classes (like PDRA / outlaw radial).
- **Each section has one event of each theme**, so "3 of 4" means "skip
  your weakest". Restricted events replace one theme's event in some
  sections (max one per section): FWD Heads-Up, AWD No-Prep, All Motor
  Bracket, Small Tire No-Prep, Stock Motor, Truck, Stick Shift, Import
  vs Domestic, an index race (10.90).
- **Event format:** race cards (3-5 rivals, one race each, lose at most
  one) for v1; eliminations formats later.
- **King event:** the 5 ladder rivals in order, each beaten stays beaten,
  then the King for their car. Rep retired.
- **Calendar:** each theme keeps its weekly slot; an event is entered
  once per slot visit; fail = next week, with one buyback a day.
- **Smallest version first:** v1 = the spine, sections, 4 themes, race
  cards, King event, calendar, money and rivals, old saves. v2 =
  restricted events and sponsors reworked. v3 = eliminations formats,
  points standings, buybacks. v4 = the circuit ladder.

## Open questions (sent Nov 15)
See the chat. Nothing decided.

## Sources
- IRP Brown's Oil E.T. Bracket Series rulebook 2024 (raceirp.com,
  downloaded with curl): schedule, buybacks, byes, points, payouts.
- Wikipedia "Bracket racing", "Drag racing" (classes: SFWD, Super classes,
  Chicago style, distances, PDRA 1/8), "Pro FWD" (curl; the fetch tool
  can't reach wikipedia.org).
- Competition Plus / Drag Illustrated / Draglist: NHRA qualifying (4
  sessions, 16-car fields).
- Dragzine / Racepages: No Prep Kings (Great 8, points multipliers),
  small tire / big tire; Dragzine "X275 five years later", Mission Raceway
  2026 X275 rules; NMRA Street Outlaw to 1/8.
- SEMA "Does 1/8-mile racing hold the secret...", Performance Racing
  Industry "Quarter-mile vs eighth-mile", "660 revival".
- Santa Pod FWD Drag Series pages; NOPI Drag Race Association X-classes
  (search summary; nopi.com page returned 404 to curl).
- BangShift / The Shop Mag: Hot Rod Drag Week rules and format.
- NHRA, Wikipedia via search: index classes (Super Street 10.90, Super Gas
  9.90, Super Comp 8.90).
- 148apps / iMore / CSR fandom: CSR2 tiers and crew battles.
- NFS wiki, TrueAchievements: ProStreet race days, showdowns, Kings;
  Wikipedia: Underground 2 stages and sponsors.
- Pure Xbox, Charlie Intel, racinggames.gg: Forza Motorsport Builders Cup.
- GameSpot / GTPlanet: GT4 beginner series (FF/FR/4WD/MR Challenges).
- Super Mario Wiki, TV Tropes, gamertagmythras: star doors.
- GameAnalytics 2024/2025 benchmarks (session length).
