# Career ladder rework (drag and circuit)

Status: **Nov 26: build 1 (the drag ladder) shipped to the tester with
the final rosters. Build 2 (race day and the pit) built on a local branch
(2a and 2b, see Build 2 notes); it ships after build 1 has been played
and the owner OKs it.**
Builds 3 (sponsors) and 4 (Bracket / No-Prep Kings) follow, then the
circuit ladder (`circuit-ladder.md`). Docs can be pushed any time. This
replaces `career-rebalance.md`
(the rival and money pass becomes part of this).

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

## Decisions (owner, Nov 24 and Nov 26)
- **Event size and win rule:** race cards of 4-7 races, 75% rounded up to
  finish (4->3, 5->4, 6->5, 7->6: always "lose at most one").
  **Elimination events must be won outright: every round** (Nov 26).
- **Section progress:** "3 of 4 events" (not points).
- **Formats:** a mix. Heads-Up, Bracket and No-Prep are true eliminations;
  Street is a race card (list night, one race per callout).
- **Distance** is a property of each event (not separate 1/4 and 1/8
  themes).
- **Sections:** one event of each theme, at most one restricted event.
- **Retries:** weekly, no buyback.
- **FWD / AWD / truck** restricted events and a full FWD class: wanted,
  parked until there are more cars.
- **Licenses stay realistic:** street events need none, so a mostly-street
  path can run unlicensed.
- **King event:** the 5 ladder rivals one at a time (a win stays won), then
  the King for their car. Rep retired.
- **Race days (hole 7):** each event has a real time slot and schedule;
  eliminations with the field set in advance, lane calls and run times
  known; clicking the race day opens your pit (on-the-fly work, upgrades,
  tuning); realistic sanctioned breakage rules; street breakage researched;
  heat soak from the real time between your runs; pit gear sold in the
  store; hired staff work on the car on race days.
  - Q1 A: Heads-Up, Bracket, No-Prep eliminations; Street race card.
  - Q2 A: real schedules (strip 8 AM-6 PM, no-prep 6 PM-1 AM, street
    10 PM-3 AM); the clock moves only when you work or wait for your call.
  - Q3 A: the real strip rules (credit or broke points, solo run for the
    opponent, alternates, oil-down penalties, miss your call and you're
    out).
  - Q4 A: street: any breakage is a loss, no fixing on the street, tow home.
  - Q5 A: a hot engine costs up to ~0.05-0.10 s, cooling wins it back.
    "Keep it realistic."
  - Q6 B: rivals don't break.
  - Q7: all pit work: tune, tire pressure and tires, gear swap, cooling,
    bottle refill, repairs with spares, installing parts you brought,
    buying from a vendor at big events.
  - Q8 pit gear: the existing electric fans and electric water pump must
    work properly (engine-off cooling); intercooler ice is automatic;
    engine chiller yes; no generator, no battery charger; tool kit levels
    yes; no "spare kits", instead **every vehicle has room for spares**
    (trucks more, truck + trailer more); spare tires on wheels and spare
    nitrous bottles fit in that room; canopy yes; **no weather station**
    ("I don't want weather to play too much of a factor... not tedious").
  - Q8 trailers: **rework entirely.** Remove the $8,500 truck & trailer;
    trailers to buy and a **trailer hitch option for every vehicle that can
    take one**; only trucks tow car trailers; race cars can pull small
    Drag Week style trailers.
  - Q9 B: a hired mechanic role besides the staff tuner.
  - Q10 A: no-prep shows win or lose only, no times (No Prep Kings rules).
- **Sponsors (Q11 A):** keep them gating the King and expand: primary,
  associates, product sponsors and contingency payouts. **No deadlines.**
- **Bracket and No-Prep Kings (Q12 A):** opened by completing events of
  their theme, each with its own ladder first: Bracket via standings and a
  King of the Track shootout, No-Prep via a top-10 list with callouts.
- **Standings points (Q13 A):** IRP style, 20 for racing, +10 per round
  won, +1 for the event win; class standings.
- **Overlaps (Q14):** "Let's go ahead and do the work now to put these in.
  Do what we can for now, we can change it later."
- **Old saves:** finished classes count as done, old race days won count
  as events; a reset is acceptable. Don't push until the tester is warned.

## Plan (proposed Nov 26, waiting on the owner)
Five builds, each played before the next. Builds 1-2 change saves.

### Build 1: the ladder
1. **Per class: 5 sections x 4 events** (Heads-Up, Bracket, No-Prep,
   Street), then the King event. 3 of 4 opens the next section.
2. **Formats** (all fields set in advance, names and cars shown):
   - Heads-Up (prepped strip): 2 qualifying passes seed a 16-car ladder
     (quickest vs slowest), 4 rounds. Win them all.
   - Bracket: 2 time trials, you set your dial-in, 16-car eliminations with
     dial-ins and the breakout rule, 4 rounds. Win them all.
   - No-Prep: 1/8 heads-up from a dig on an unprepped strip, chip-draw
     pairings every round, 16 cars, 4 rounds, no times shown. Win them all.
   - Street: a list night of 4-7 callouts, one race each, lose at most one.
3. **Distance per event:** street and no-prep 1/8; heads-up and bracket
   1/4 in classes 1-3, more 1/8 from class 4.
4. **Restricted events:** the class race rules (Four-Banger, Stock Motor,
   All Motor, Street Tire, 275 Radial, Heavyweight, Import, Small Block,
   X275, Lightweight, Factory Hot Rod) become restricted versions of a
   theme event, at most one per section.
5. **King event:** 5 ladder rivals one at a time, then the King for their
   car; needs the sponsor contract done (as today); 2nd and 4th Saturday
   nights.
6. **Calendar:** Street Friday 10 PM-3 AM, Heads-Up Saturday 8 AM-6 PM,
   No-Prep Saturday 6 PM-1 AM, Bracket Sunday 8 AM-6 PM. One try per event
   per week.
7. **Standings:** 20 for racing, +10 per round or race won, +1 for the
   event win, against the class's regulars (their results come from the
   same fields).
8. **Rosters and money:** about 20 named regulars per class, builds
   stepping up by section, from the existing rival builder (all career
   rival times change: planned). Unlocks spread over the sections. Purses
   and entry fees set after a measurement run.
9. **Old saves:** finished classes done; in the current class each old race
   day won counts as one event done; rep and callout progress retired.
10. **Folded in (hole 11):** class races become the restricted events;
    bracket side races become Bracket events; rep, callouts and the class
    ladder become the King event; race-day scoring (off) is removed;
    sponsor races become contract goals on ladder events. Car clubs,
    wanderers, street spots, Grudge Night, car shows, the promoter, pink
    slips and the short series stay as side content.
11. Licenses at the strip as today; street events need none. Rivals don't
    break.

### Build 2: race day and the pit
1. **Timed race day:**
   - Heads-Up: gates 8, qualifying 10:00 and 12:30, round 1 at 3 PM, then
     about every 45 min (final ~5:15).
   - Bracket: gates 8, time trials from 10, round 1 at 12:30; back to the
     pits after rounds 1-2; then round robin (in the lanes within 15 min).
   - No-Prep: gates 5 PM; drivers' meeting and chip draw before each
     round; one 10-minute call; round 1 at 7 PM, about every 40 min.
   - Street: 10 PM-3 AM, a callout every 20-30 min.
2. **The pit:** countdown to your next call; engine temperature,
   intercooler, bottle pressure, tires, damage; jobs that cost minutes;
   "wait for the call". The clock only moves when you act.
3. **Pit work (all):** tune, tire pressure, swap to spare tires, gear swap
   (quick-change), cooling, swap to a spare bottle (refills at big
   events), repairs with spares and tools, fitting parts you brought, a
   vendor row at big events (shop prices). Job times from the garage hours
   we already use (`calendar.js` HOURS), shortened by crew and tools. No
   source gives at-track repair times, so the garage hours are the base.
4. **Breakage:**
   - Strip (Heads-Up, Bracket): broke before your first pass, entry
     credit; broke before round 1, 50% credit or 20 broke points (your
     pick), and an alternate takes your spot; paired and can't run, the
     opponent gets a solo run; won't fire in 30 s or stage in 20 s, same;
     miss your call, you're out; oil-down (an engine failure that dumps
     oil): a cleanup fine and standings points, a second in one event and
     you're sent home.
   - No-Prep: as the strip, plus one 10-minute call (miss it,
     disqualified) and a part landing in the other lane ahead of your
     opponent is a loss.
   - Street: any breakage is a loss and the bet; no repairs; tow home.
5. **Heat by the minute** (replaces the fixed 25 min):
   - engine coolant in degrees F: a pass adds about 40 F;
   - cooling between rounds: hood up only (slow), the electric fans and
     electric water pump (about 10-15 min back down on a hot day), the
     engine chiller (about 55 F in under 10 min, ice automatic);
   - best near 120 F at the start; hot costs up to about 0.05-0.10 s and
     knocks sooner (today's model can cost up to 6% power: recalibrated);
   - the ice tank intercooler is re-iced automatically; air-to-air
     intercoolers heat soak on back-to-back rounds; bottle pressure as
     today.
6. **Crew:** your staff drag tuner works the pit (engine skill: repairs;
   chassis: setup; data: reads the slip). A new hired **mechanic** on the
   hiring board (wrenching skill: speed and which jobs), paid per race day
   (about $150-300 by skill; real pit crew about $17/h, ~$200 a day).
7. **Pit gear** (new shop section, Pit & Trailer):
   - Tool kits: Basic hand tools, floor jack and stands $350 (tune, tires,
     small bolt-ons); Pro tools (impact gun, torque wrenches, aluminum
     jack, tool cart) $1,800 (axle, clutch, converter and gear swaps,
     faster); Roll cab and air tools $5,000 (needs a trailer's room:
     transmission swaps, fastest).
   - Engine chiller (12-volt, ice automatic) $1,500.
   - Canopy 10x20 $650: shade in day events (a small effect; no source
     measures it).
   - Spare tires on wheels (the tire and wheel prices) and a spare 10 lb
     nitrous bottle $350 (+$50 fill).
   - The existing electric fans (Radiator & Oil Cooler) and electric water
     pump (Pulleys & Accessories) get their real job: engine-off cooling.
8. **Room for spares:** each vehicle has room in cubic feet from its real
   trunk or bed (looked up per car in the build; Pro race cars almost
   none); trailers add theirs. Items take their real room (a tire on a
   wheel ~4-8 cu ft, a 10 lb bottle ~0.5, tool cart ~10, roll cab ~30,
   chiller ~8, canopy ~3, axle ~1, clutch ~1.5, converter ~2,
   transmission ~6). You choose what goes on the race-day screen.
9. **Trailers and hitches** (replace the $8,500 truck & trailer):
   - **Hitch** (Upgrade > Body, where it bolts on): Class I-II receiver for
     cars $250 (small trailers only, not on tube-chassis race cars);
     Class III-IV for trucks $400 (car trailers, up to the truck's rating).
   - **Trailers:** 4x8 open utility $1,200 (~400 lb, ~60 cu ft); 4x8
     enclosed cargo $3,500 (850 lb, 142 cu ft: the Drag Week limit); 18 ft
     open car trailer $4,500 (~1,900 lb, trucks only); 24 ft enclosed car
     trailer, steel $16,000 (~4,200 lb) or aluminum $25,000 (~2,800 lb),
     ~150 cu ft of cabinets plus the car, trucks only, shade to work in.
   - **Towing:** your own truck in a bay, its hitch and tow rating
     covering trailer + car + spares: C1500 about 7,000 lb, Lightning
     5,000 lb, Ram 2500 Cummins about 16,000-17,500 lb. So the steel
     enclosed trailer with a car needs the Ram; aluminum fits the C1500.
     Gas per trip and no cop stops (as today); flatbed tows stay.

### Build 3: sponsors
- **Primary** per class (gates the King): signing, stipend, per-win,
  goals on ladder events ("complete 2 Heads-Up events", "win a bracket
  race", "run our product", "show the car"), free car when done.
- **Associates:** 2 decal slots, pay per event plus contingency on a win
  or runner-up with their product on the car; strong results bring a
  primary offer next class.
- **Product sponsors:** discounts on their part group in 3 tiers by
  results.
- **Contingency board:** per brand, win / runner-up money scaled to the
  class (NHRA: $300 / $100 national, $100 / $50 divisional), plus quickest
  60 ft of the day and a hard-luck award for a first-round loser.
- No deadlines.

### Build 4: Bracket and No-Prep Kings
- **Bracket King:** bracket points from every class; the top 8 are invited
  to the King of the Track shootout (last Sunday): eliminations with
  dial-ins, win every round, then the Bracket King.
- **No-Prep King:** after 3 no-prep events you can race #10 of a top-10
  no-prep list; call out up to 2 spots above, one race each, on no-prep
  nights; beat #1, then the No-Prep King (last Friday). List cars range
  from mid-class (#10) to top-class (#1) builds.

### Build 5: the circuit ladder
The same shape for the circuit, done now rather than after the drag ladder
is played (owner, Nov 26). Needs its own research and plan (classes,
endurance, low power, one-make like Miata only: the owner's Nov 15 ideas;
team drivers race at 4x).

### Left out
FWD / AWD / truck events and the FWD class (parked), buybacks, weather
station, generator, battery charger, transmission temperature (heat is the
engine, intercooler and bottle), rivals breaking.

### Answers to the plan questions (owner, Nov 26)
1 A ladder first, then the pit. 2 A 16-car fields everywhere. 3 A
standings shown per class, bracket points feed the Bracket King, a bonus
for the top 3 when you finish the class. 4 **B keep short series** as side
content (not retired). 5 A refund the $8,500 truck & trailer. 6 A oil-down:
a cleanup fine and 10 standings points, a second one in an event sends you
home. 7 **B the circuit ladder now.** 8 **B straight to the tester** (no
preview page), once he's warned. "Feel free to update docs whenever, just
nothing to the game was what I had meant."

### Build 1 rules settled while building (owner, Nov 26)
- Eliminations **pay by round reached** (winner most, runner-up, semis,
  quarters); finishing still needs the win.
- A finished event **runs again every week** at its slot for its money and
  standings points.
- Heads-Up qualifying: **paired** (a field racer in the other lane, only
  your time counts).
- Unlocks: **the first win of each event** (spread over the 20 events and
  the King event).

### Build 1 design (Claude, Nov 26)
- **Ids:** ladder events `si.E<sec><T>` (T = H heads-up, B bracket, N
  no-prep, S street), e.g. `0.E1H`; the King event keeps `si.boss` (old
  saves' class wins and `CAR_SCHEDULE['si.boss']` keep working).
- **Event types:** new `headsup` and `noprep` (strip theme, prepped /
  no-prep surface); `bracket` and `street` reused. Old types (`quarter`,
  `knockout`...) stay for the side content that builds its own events
  (car clubs, promoter, wanderers, short series).
- **Rosters** (`www/js/roster.js`, generated by `tools/roster.js` with the
  package planner): ~20 regulars a class, each with a build per section
  (their own car, stepping up), plus the 5 King-ladder rivals and the King.
- **Elimination engine** (`www/js/ladder.js`): entry fee; the field (you +
  15 regulars); Heads-Up 2 paired qualifying passes seed a fixed ladder
  (1 v 16, 8 v 9...); Bracket 2 time trials then random pairs; No-Prep a
  chip draw each round; the other pairs are simulated (estimated ET with
  noise, skill for the light and the dial); your opponent each round is the
  simulated winner; a loss ends the day; standings points and the payout
  by round. One entry per event per weekly window.
- **Race cards** (Street): 4-7 callouts against street regulars, lose at
  most one; the night ends at the second loss.
- **Standings:** per class, all four themes, you and the regulars (their
  points from the simulated fields).
- **Old saves:** class wins kept (`si.boss`); current class: one ladder
  event marked done per old race day won, in section order.

### Build 1 notes (Claude, Nov 26; shipped Nov 26)
- **Files:** `www/js/ladder.js` (new: the structure, the run engine,
  standings, unlock packets, old-save mapping), `www/js/roster.js`
  (generated by `tools/roster.js`), `career.js` (contract kinds),
  `season.js` (rep, side brackets and the old callout ladder removed;
  discipline Kings open on 6 events of their kind), `schedule.js` (new slot
  times, the agenda, race-day scoring removed), `race.js` (the run's races,
  slips, buttons), `screens.js` (career road, King tab, Standings tab, the
  event card), `game.js` (street opponents from the roster), `extras.js`
  (short series take the class rules), help/tutorial/phone text, CSS.
- **Rosters:** 20 regulars a class, each from a hand-tuned rival build (or
  a shop package) used as a parts list and built up from the stock car
  section by section (engine swap as a step, part sizes one at a time,
  boost a psi at a time, never slower than the section before). Old names
  kept, spread by pace on the same car where possible; short duplicates
  ('Lisa' vs 'Lisa Lightning') dropped. Targets per class in
  `tools/roster.js` TARGETS (top of field per section, the King-ladder
  rungs, the field's spread).
- **Restricted events:** the class's regulars set their car up to the rule
  (no nitrous/turbo, 275 radial, street tire, no wheelie bar); rules about
  the car itself take legal cars from any class.
- **Money (measured):** per class, the first pass (15 events, the King
  night, the #1 standings bonus) now pays about the old career's total
  (new ~$1.36M for all six vs ~$993k before for everything); weekly re-runs
  and runner-up money on top, but more weeks of bills. Purses: base x
  [0.7..1.1] by section x theme (No-Prep 1.1, Bracket 0.9); entry 8%.
- **Tested:** headless engine tests (structure, fields of 15, cards, all
  four formats, payouts by round, points, packets, section opening, King
  locks, old saves); browser runs of a whole Heads-Up, Bracket, No-Prep and
  Street event through the real race screen with a hired driver (no
  errors); old-save mapping (class done, 7 old race days -> 3+3+1 events,
  King climb kept); the week agenda, calendar, King nights.
- **Final rosters (Nov 26, generated with per-regular checkpoints,
  `ROSTER_CACHE`):** every class's builds land on their targets on average
  (mean off by -0.07 to +0.04 s per class), no regular ever slower than the
  section before. Outliers kept as they are (they read as real racers):
  two class-1 Fox 2.3s that stay stock all five sections (16.45: quicker
  than their 17.6 target in section 1, 0.5-0.7 s slow by section 5; a stock
  car can't go slower), class 2's Pip stuck at 14.84 (its upgrades run
  out), and a few builds 0.3-0.9 s off in a late section
  (class 4 Supra, Mustang, Camaro; class 5 Lightnings). Re-tested with them:
  headless engine tests all ok, the browser runs of all four formats (no
  errors), old-save mapping and King nights, money unchanged (~$1.36M for
  all six classes' first pass).
- **Ship:** merged into the Pages branch Nov 26.

### Build 2 notes (Claude, Nov 26; local branch `ladder-build2`, not pushed)
Ships after build 1 has been played and the owner OKs it.
- **2a (race day by the clock, `ladder.js` + `pit.js`):** `DR.DAYPLAN`
  schedules (gates, qualifying / time trials, rounds, call windows);
  `nextCall` / `checkCall` / `lateLock`; heat by the minute (`coolTau`,
  `heatNow`, `heatAfter`; physics heat-soak coefficient 0.00125, at most
  ~2.5%); oil-down fine and 10 points; broke-before-round-1 credit or
  points and an alternate; street breakage ends the night; the pit screen
  (schedule, next call, engine temperature, bottle, wear, damage).
- **2b (gear, `gear.js` new):**
  - Upgrade > **Pit & Trailer** tab (last tab): tools in three levels
    (Basic $350, Pro $1,800, Roll Cab & Air Tools $5,000), engine chiller
    $1,500, canopy $650, spare drive tires on their own wheels (the tire +
    wheel prices, for the car you're on; any set that fits can go on),
    axle shafts (the repair bill's shaft price: 25% of the rear end or
    $250), 10 lb nitrous bottles $350 + $50 fill, trailers (4x8 open
    $1,200, 4x8 enclosed $3,500, 18 ft open $4,500, 24 ft enclosed steel
    $16,000 / aluminum $25,000). Sell back: half (trailers 60%).
  - **Room:** the car's trunk or bed (`DR.CARGO`, cu ft), a tow truck's
    bed, the trailer's room. Items by real size (a tire on a wheel by its
    diameter and width; tools 4 / 10 / 30; chiller 8; canopy 3; bottle 0.5;
    axle 1; clutch 1.5; transmission 6...).
  - **Load-up at entry** (replaces the entry confirm): the way there
    (drive; drive pulling a small trailer if the car has a hitch; flatbed;
    a truck of yours with a Class IV hitch and a car trailer, if trailer +
    car + load is within its tow rating: `DR.TOW` C1500 7,000, Lightning
    5,000, Ram 16,000) and the load (auto-packed: tools, chiller, a tire
    set, spares, canopy; editable). The trip (flatbed, gas, a ticket) and
    the mechanic's day are paid at entry; the first slip shows them.
  - **Pit work** (`DR.Pit.jobs`): tire-set swap, bottle swap, axle shaft
    (pro tools, crew 30+), clutch from a spare on the shelf (pro tools,
    45+), transmission from a spare (roll cab, 60+; the broken box goes to
    the shop for its rebuild bill), fitting parts you brought (by their
    garage hours: up to 2 h basic tools, 7 h pro + crew 40, 10 h roll cab
    + crew 60; engine internals, chassis, rear end, turbo kits not at the
    track). Time = garage hours x tools (0.6 / 0.45 / 0.35) x crew (1.5 -
    best wrench / 100, x0.85 with three pairs of hands). Crew: you (25),
    the drag tuner (engine x 0.8), the mechanic (wrenching).
  - **Mechanic** (Team > Mechanics board, one seat): wrenching skill,
    grows with jobs; paid by the race day ($150 + 1.5 x skill: $190-280);
    optional per event (a checkbox at the load-up).
  - **A breakage in qualifying** that the load can fix stays in the day:
    fix it before round 1 and race on; still broken when round 1 closes,
    the broke rules. A breakage while still in the eliminations (won the
    round): fix it before the next call. Auto-repair (Settings) waits
    until the day is over.
  - **Big events** (the last section's Heads-Up and No-Prep): a vendor row
    in the pit (parts you can fit at the track, shop prices; nitrous
    refills). Used bottles are otherwise refilled before your next event.
  - **The old $8,500 truck & trailer** is refunded to old saves (a text
    from Ray); `legal.js`'s rig code removed, the haul lives in `gear.js`.
  - Help text: race days by the clock, the pit, what you bring.
- **Tested (browser):** load-up and entry, room and ways (car, small
  trailer, flatbed, Lightning over its rating, Ram fine), pit axle job
  (1.35 h with pro tools and a 75 mechanic), a transmission broken in
  qualifying fixed in the pit (phase stays qualifying, rebuild charged),
  tire-set swap (wear moves with the set), bottle swap and refill at the
  next entry, the vendor row, the shop tab, the team screen, rig refund;
  the build 1 / 2a tests (ltest, web2-5) still pass. iPhone-size
  screenshots checked (the load-up's buttons stay in view).
- **Follow-ups (not wired yet):** the drag tuner's chassis skill (setup at
  the pit) and data skill (reading the slip) do nothing at the pit yet;
  the gear swap is the Tune screen as before.
- **Choices made in the build, to confirm with the owner:** which events
  are "big" (vendor row); the mechanic's signing fee (40% of a driver's);
  bottles never run dry (as today: a spare restores full pressure); cargo
  estimates where no figure was found (Charger, Nova, Bel Air, Willys;
  beds from their dimensions; the open car trailer's deck room 30 cu ft).

### Questions sent with the plan (Nov 26)
1. Build order: ladder first, then the pit (rec.), or the pit first.
2. Fields: 16 cars (4 rounds) everywhere (rec.), or 32 (5 rounds) in
   section 5.
3. What standings pay: shown per class, bracket points feed the Bracket
   King, a points-fund bonus for the top 3 when you finish the class (rec.);
   or shown only.
4. Short series: retire them (class standings replace them) (rec.), or
   keep them as side content.
5. Old saves with the $8,500 truck & trailer: refund it (rec.), or an open
   car trailer plus the rest back.
6. Oil-down: a cleanup fine and 10 standings points, a second one sends
   you home (rec.); or a fine only.
7. Circuit ladder: after the drag ladder has been played (rec.), or now.
8. Builds 1-2 to the preview page first (huge rework), then the tester
   once warned (rec.); or straight to the tester.

## Research (Nov 24-26)
### Race-day rules
- **IRP 2024 bracket rules:** gates 8, time runs 10 (two on Saturday, one
  on Sunday), eliminations straight after, track secure 6-7 PM. Broke
  before round 1: track credit (only if broke before the water box on the
  first time trial) or 20 "broke points", not both. A competition bye
  (single) only once paired; 20-second clock if a car can't stage, then
  the bye. "No class will wait for driver change or extra cool down."
  After rounds 1-2 back to the pits; later, cool down in the lanes; miss
  your round, eliminated. Staging accepts the conditions (overheating,
  cold tires).
- **WWT Raceway 2026:** buybacks race before the round 1 winners and get
  points only for rounds won; 30 s to fire or a competition single; round
  robin: in the lanes within 15 min of your class's last pair, "or we will
  assume you are broke"; no reruns for missed calls; oil leaks needing
  equipment or over 5 min of cleanup may get you sent home; diapers
  required (NHRA 2025).
- **National Trail 2025:** broke before a time run, entry credit; before
  round 1, 50% credit (or points); you may switch cars after a breakage in
  eliminations if the other car isn't racing; cool-down may be capped at
  20 min per class; 11.50 and quicker: no antifreeze.
- **NHRA 2025 rulebook:** an alternate replaces a qualifier who can't make
  round 1 (Lucas Oil / Pro Mod: the first alternate races the slower
  opponent); the qualifier keeps round-1 points and money; no alternates
  in pro classes (the opponent gets a bye). The local "break rule" (an
  eliminated car replaces a winner who can't continue) isn't used at
  national events. Oildowns: penalized only when machines clean up (hand
  cleanup, fuel and extinguisher fluid don't count); Top Fuel / Funny Car
  lose 5, 10, then 15 points; Pro Stock $500 / $1,000 in eliminations plus
  points. Pro turnarounds: 75 min was the norm, NHRA has run 50-55
  (Competition Plus).
- **No Prep Kings rules (4/9/2019 copy on Tumblr; the official sites are
  bot-blocked or unreachable):** 1/8 heads-up from a dig; no times shown,
  no slips; racemaster has the final say and preps the track; a drivers'
  meeting and chip-draw pairings before every round; one drawn bye each
  (competition byes don't count); red light loses; a part landing in the
  other lane ahead of your opponent loses; **one 10-minute call to the
  lanes**, miss it and you can be disqualified; diapers mandatory; Small
  Tire (28x10.5, no bars), Street Car 7.0; the top 16 who race at least 7
  events go to the finale.
- **Street (no written rules exist):** Pinks: breaking down and not
  finishing loses, leaking fluid at the line forfeits; after a
  catastrophic breakage the winner often declined the car and raced a
  rematch; glycol coolant spills cost two 90-min delays. Street Outlaws:
  the top-10 List, callouts, race nights, round robins for #10, Cash Days
  (32 cars, 2 days, $50k winner-take-all), cops on test hits (Wikipedia
  episode list). Fan list rules: a week to get ready when called out.
### Heat
- Reher-Morrison Tech Talk #25: heat is the enemy; about 120 F coolant at
  the start is ideal for sportsman engines; Pro Stock runs stone cold with
  ~90 min between runs; keep the pump and fan running.
- Dragzine 2017 (temperatures): a hot engine or transmission "can very
  easily lose five hundredths to a full tenth"; trans about 150 F at the
  water box; temps checked every 10 min.
- Dragzine 2014 (Concato engine chiller): ice-water chiller, down to
  40-55 F in under 10 min, a 20 lb bag of ice a session; an engine gains
  about 40 F per pass; heat builds round on round.
- Forum (forabodiesonly): a pump and fan take 10-15 min on a hot day.
### Sponsors
- NHRA contingency (since 1966): $300 win / $100 runner-up at national
  events, $100 / $50 divisional; product installed, decals on both sides,
  checked at tech, the maker pays.
- Performance Racing 2023: certificates or cash; awards beyond winners
  (quickest 60 ft, a hard-luck award to a first-round loser).
- Speedmaster's sponsorship program: tiered discounts by exposure (entry:
  decals and a mention), not cash, revocable.
- Performance Racing 2023 on sponsor relationships: Antron Brown's Matco
  Tools deal grew from associate to primary; sponsors want reach and
  appearances. A team agreement (search summary): decals on both sides,
  discounted products, attend the listed races.
- Games: Underground 2 (one sponsor a stage, a set number of sponsor
  races); Motorsport Manager (contract length, signing bonus, per-race pay,
  placing bonuses).
### Discipline Kings
- NHRA Summit Racing Series: weekly bracket points at each track; each
  track sends a team of its top points finishers to division E.T. Finals,
  then the world final in Las Vegas (64 racers from 2026). Summit King of
  the Track: a one-time event where winners race head to head with
  dial-ins for the title.
- No Prep Kings: the top 16 (7+ events) to the finale. Street Outlaws: the
  top-10 List with callouts. NFS Most Wanted (2005): 15 Blacklist rivals,
  each needing wins, milestones and a bounty first. ProStreet: a King per
  discipline.
### Trailers, hitches, tools, gear (prices)
- Open car hauler 18 ft, 7,000 lb GVWR: $4,299-4,699 new, 1,750-2,119 lb
  empty (Carry-On, Big Tex listings).
- Enclosed 8.5x24 car trailer: $15,000-17,000 steel (Pace, Car Mate,
  American Hauler; 4,100-4,350 lb empty), $25,000 aluminum (Nitro, Legend;
  ~2,800 lb).
- U-Haul 4x8 cargo trailer: 850 lb empty, 1,650 lb max load, 142 cu ft.
  New 4x8 utility trailers ~$650-2,400; small enclosed $3,300-4,700.
- Hot Rod Drag Week: race cars driven between tracks; spares and tools in
  the car or a trailer it pulls (2015-17 rules: cargo up to a U-Haul 4x8).
- Hitch classes (U-Haul): I 2,000 / 200 lb; II 3,500 / 350; III 7,500 /
  750; IV 10,000 / 1,000; V 20,000 / 2,700. Installed $180-550 (U-Haul),
  parts $150-400 plus $75-150 labor (This Old House).
- Tow ratings: 1999-04 Lightning 5,000 lb; 2010-18 Ram 2500 Cummins crew
  cab ~16,000-17,500 lb (Ram tow charts); 1988-98 C1500 5.7: no factory
  figure found, third-party ranges vary (KBB lists 7,500-10,000 for 1995
  1500s; forums call a 3.42 axle marginal at 5,000): ~7,000 used.
- Tools: 408-piece starter set ~$200; Milwaukee / Snap-on tool-cart sets
  ~$1,800-1,900; Icon 73" roll cab ~$3,000.
- Engine chillers: 12 V ice units ~$400; "pro 110 V chillers upwards of 2
  grand" (forum); Concato price not published.
- Canopies: 10x20 commercial $170-680; E-Z UP 10x10 commercial $200.
- 10 lb nitrous bottle: $250 (FAST), $305 (NX), $588 (NOS); refills about
  $4-5/lb (old forum figures).
- Pit crew pay: ~$17/h average (ZipRecruiter 2026); ~$200 a day crewing
  (forum anecdote).
- Not found: at-track repair times, a measured effect of shade on engine
  temperature.

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
- Nov 24-26 (race days, heat, sponsors, Kings, trailers):
  - Rulebooks (curl): IRP 2024 bracket series; WWT Raceway 2026; National
    Trail Raceway 2025 general regulations; NHRA 2025 rulebook (Mission
    Raceway mirror; the nhraracer.com 2026 link was a 404). IHRA rulebook
    and nhrda were not needed / IHRA is bot-blocked.
  - No Prep Kings rules 4/9/2019 (tumblr.com/noprepracing copy);
    noprep.com and streetoutlawsnoprep.com not reachable.
  - Wikipedia: Pinks (TV series), Street Outlaws, Need for Speed:
    Underground 2.
  - Reher-Morrison Tech Talk #25; Dragzine "Hot Topic" (2017) and Concato
    chiller (2014) via the fetch tool (Dragzine blocks curl); Competition
    Plus on 50-75 min turnarounds (search).
  - NHRA: contingency "How it works" (2022), Summit Racing Series about
    page, Summit King of the Track; Performance Racing Industry on
    contingency (2023) and sponsor relationships (2023); Speedmaster
    sponsorship program page.
  - Trailers / hitches / gear: dealer listings (Carry-On, Big Tex, Pace,
    Car Mate, American Hauler, Nitro, Legend), U-Haul 4x8 cargo trailer
    and hitch guide, This Old House hitch cost, Ford-Trucks / f150hub
    (Lightning 5,000 lb), Ram tow charts, KBB (C1500), tool and canopy
    retailer listings, Summit / JEGS / American Muscle nitrous bottles,
    ZipRecruiter pit crew pay.
  - Games: TrueAchievements (NFS Most Wanted Blacklist, ProStreet Kings),
    Motorsport Manager guides (Pocket Gamer, steamah).
