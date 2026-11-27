# Circuit ladder (fresh)

Status: **Nov 27: plan approved (Nov 26); the detailed design approved
item by item (all A, Nov 27). Building C1 now (branch `circuit-c1`); C2
and C3 after C1 has been played.** Replaces the circuit
career (`ccareer.js`, the Night Series and the Circuit King as they are
now).

## Decisions (owner, Nov 26)
- **Themes:** Sprint, Spec, Endurance, Night street circuits.
- **Spec cars:** both: rent one (arrive-and-drive) or bring your own built
  to the spec.
- **Endurance:** shortened to about 3x a sprint, with pit stops and a
  driver swap.
- **License:** like SCCA's (school, novice permit, full license after 3
  race weekends), gating later events.
- **Start fresh:** don't keep the current 6 circuit classes, the Night
  Series or the Circuit King as they are.
- Earlier (Nov 15): "same thing [as the drag ladder] but called circuit:
  different classes, endurance themed, low power, Miata only".

## What the game has now (audit)
- `ccareer.js`: 6 circuit classes (Track Day Novice ... Unlimited GP), each
  4 race days and a Cup, opened by Cups; early days ask a podium, later a
  win; road-course cars (M3, S2000, RX-7, Z06, GT-R, 911) open here.
- `team.js`: your hired drivers race (braking, cornering, consistency);
  every lap of every car worked out at entry, played at 4x; AI fields by
  pace; tire wear and warm-up, heat; team races (two of your cars); class
  floors by ideal lap; the Night Series (4 rounds, points).

## Research (Nov 26)
- **SCCA path** (scca.com "I want to road race"; FastLane Racing School):
  drivers' school and a Novice Permit, then race on it (3 regional race
  weekends) for the Full Competition License; Regionals -> U.S. Majors /
  Hoosier Super Tour -> the Runoffs (national champions, since 1966:
  Wikipedia). A club weekend: e.g. 2 practices, qualifying, 3 x 20-min
  races (SCCA Race Experience). Enduros allow driver changes "so friends
  can share driving duties, workload, and expenses". Novice Permit fee
  $150 on a current SCCA form ($135 in 2020); private 2-day novice school
  from $4,995 (FastLane), club schools far less.
- **Spec Miata** (Wikipedia): low-cost spec class, strict rules, regional
  1999, national 2006, cars $6k-65k; spec Bilstein/Eibach suspension,
  15x7 wheels, Hoosier SM7.5 (SCCA) or Toyo (NASA), minimum weights by
  year (e.g. 2,400 lb NB1). One of the biggest classes (fields of 30-50,
  forum). MX-5 Cup is the pro version (IMSA; 2016 champion a $200,000
  scholarship).
- **Rentals:** arrive-and-drive is common: VRS rentals include transport,
  support and the test day for a full weekend; consumables and a share of
  tires extra; enduro hours at half the daily rate an hour; damage is the
  renter's. A Spec Miata Majors weekend package about $3,400 (Mazda Racers
  article, via search: its site has an expired certificate, not opened).
- **One-make series for the game's cars:** Spec Miata (Miata), NASA Spec
  E46 (M3 E46), NASA Corvette Cup (C5/C6, from 2025), the SCCA Corvette
  Challenge (C4, 1988-89), Porsche Carrera Cup North America (911 GT3 Cup,
  IMSA, from 2021, 34 cars at its debut), Lamborghini Super Trofeo
  (Huracán, three continental series and a World Final).
- **Endurance:** ChampCar (6-38 h, cheap cars under a 500-point value cap,
  teams): a fuel stop is at least 5 minutes on pit lane; a driver change
  without fuel has no minimum; 2 hours max per driver, 1 hour between
  stints (supplemental rules, via search; the rulebook PDF didn't
  download). 24 Hours of Lemons: $500 cars, teams of 2+, usually 12-16 h
  over a weekend (Wikipedia).
- **Power-to-weight classes:** NASA Super Touring ST1-ST6 by lb/hp
  (2019: ST1 >= 6.0 ... ST6 18:1).
- **Games:** Gran Turismo's licenses gate events; Forza's Builders Cup
  runs series with car restrictions.

## Plan (proposed Nov 26, waiting on the owner)
1. **Six circuit classes**, club to pro, each with a spec series:
   Club (Spec Miata), Touring (Spec E46), Sport (Corvette Cup, C5),
   GT (Porsche Carrera Cup), GT Pro (Lamborghini Super Trofeo),
   Unlimited (question). Each class has a pace floor for Sprint,
   Endurance and Night events (power-to-weight, like NASA ST).
2. **Each class: 5 sections of 4 events** (Sprint, Spec, Endurance, Night
   street), then the **Championship weekend** (the class's best, a
   Runoffs-style final: qualifying and a feature race). 3 of 4 opens the
   next section, like the drag ladder.
3. **Formats:**
   - Sprint: qualifying sets the grid, then the race.
   - Spec: everyone in the series car, the field the series' regulars.
   - Endurance: about 3x a sprint, two of your drivers sharing the car,
     at least one pit stop (a fuel stop takes its time; a driver change
     on it), tire wear and fuel matter.
   - Night street: the airfield, Route 99, canyon and downtown circuits.
4. **Spec cars:** rent (arrive-and-drive: a fee per event that includes
   the car's prep; damage charged) or your own car built to the spec (the
   model, the spec suspension, wheels and tires, cage, stock engine,
   minimum weight).
5. **Licenses, per driver:** a drivers' school (fee and a day) gives a
   novice permit (class 1); three race weekends on it, the full license
   (class 2 up).
6. **Rivals:** named regulars and teams per class, pace stepping up by
   section (as the drag rosters).
7. **Money and unlocks:** purses by finishing position; road-course cars
   and circuit parts open by first wins (as the drag ladder).
8. **Saves:** the circuit career starts over at class 1 (cars, parts,
   drivers and money kept).

## Questions sent with the plan (Nov 26)
1. Class 6 spec series.
2. What finishing an event needs (win, podium, top 5 early).
3. Endurance: two of your drivers, or one may drive it all.
4. Rental price level.
5. License gating (class 1 novice, class 2+ full; or by section).
6. Old saves (start over at class 1; or map).
7. Build order (before or after drag builds 2-4).

## Answers to the plan questions (owner, Nov 26)
1 A: class 6's spec event is the Super Trofeo World Final, the Lamborghini
for now ("we can change it later. I plan to add at least 15 more cars,
probably 30"). 2 **B: finishing an event takes a win**, like the drag
eliminations. 3 A: two of your drivers must share an endurance car. 4 A:
rental prices about real, scaled per class (~$3,400 a weekend in class 1).
5 A: a novice permit races class 1, the full license from class 2. 6 A:
the circuit career starts over at class 1 (cars, parts, drivers, money
kept). 7 **B: all the drag builds (1-4) first**, then the circuit.

## Answers to the detailed design (owner, Nov 27: "A for all 6")
1 A: three builds, C1 (classes, sections, sprint and night street events,
rivals, purses, unlocks), C2 (spec cars and licenses), C3 (endurance with
pit stops and driver swaps). 2 A: purses to the top 5 (100 / 60 / 40 / 25
/ 15%); finishing an event still needs the win. 3 A: spec car rental about
$3,400 a weekend in class 1, scaled per class (prep, tires, fuel in;
damage charged). 4 A: drivers' school $495 for a weekend. 5 A: endurance
stop about 60 s with the driver change, +30 s for new tires. 6 A: the
Night Series and the Circuit King stay until C3, then fold in.

## C1 questions that came up while designing (owner, Nov 27)
The build turned up four things the approved design didn't settle; asked
before building, all answered with the recommended option:
1. **Section rule in C1:** Spec and Endurance can't run until C2/C3, so in
   C1 a section opens when its Sprint **and** its Night street event are
   won. Once C2/C3 add the others it becomes 3 of 4; a section already
   open stays open.
2. **Field: 10 cars** (you and 9 of the class's 12 regulars).
3. **Purses, the middle level:** the win pays the class base x 1.0 / 1.2 /
   1.4 / 1.6 / 1.8 by section (class 1: $300-540, class 6: $30,000-54,000),
   the Championship x 5 (class 1: $1,500); P2-P5 60 / 40 / 25 / 15% of it;
   the entry 10% of the win, plus the driver's wage.
4. **Schedule:** Sprint on Sunday race days (10 AM-6 PM), Night street on
   Saturday nights (8 PM-midnight), the Championship on a Sunday once the
   five sections are done; each event once a week (like the drag ladder).

## C1 build design (as built)
- **Where:** `ccareer.js` rewritten (the old race days replaced);
  `team.js` (career classes, the floor, the regulars' field, event names);
  `circuitui.js` (the road view and the entry card); `screens.js`
  (Career > Circuit: class chips, status line); `schedule.js` (the Night
  street slot, the agenda, the slot per event); `garage.js`, `phone.js`,
  `home.js`, `ui.js` help.
- **Classes** (`T.CCLASSES`): Club (Spec Miata), Touring (Spec E46), Sport
  (Corvette Cup), GT (Porsche Carrera Cup), GT Pro (Super Trofeo),
  Unlimited (World Final). Floors, an ideal lap at Pixel Raceway, this or
  slower: 1:44, 1:38, 1:34, 1:29, 1:25, none (today's open classes: 1:45,
  1:37, 1:31, 1:25, none). Laps 5 / 6 / 6 / 8 / 10 / 12 at Pixel Raceway,
  scaled per track; the Championship +2.
- **Events:** per class, 5 sections of Sprint (Pixel Raceway), Spec
  (coming, C2), Endurance (coming, C3), Night street (Bayview Airfield,
  Route 99, Canyon Run, Downtown, the Airfield again), then the
  Championship (Pixel Raceway). Ids `C<class>.<section><S|P|E|N>`,
  `C<class>.CH`; state in `c.cl` {cls, best, won, open, packs, entered}.
- **Regulars:** 12 a class, the same every game (seeded): a name, team,
  colour, their own car (a pool per class, the spec car most common),
  skills from the class's band, a pace offset. Their pace: the floor plus
  a gap by section (5, 3.75, 2.5, 1.5, 0.75 s; Championship 0.3) plus
  their offset; skill steps up by section. Each class's top regular is
  the old named rival (Maddie "Apex" Cole ... Erik "The Professor" Lund).
  A race picks 9 of them (seeded per event); the Championship takes the
  9 quickest, the named rival leading.
- **Unlocks (as now, spread over the sections):** the old race day i of
  stage si -> class si's section i (first win in the section), the old Cup
  -> the Championship; cars as before (M3 Touring S2, S2000 Touring
  Championship, RX-7 Sport S2, Z06 GT S1, GT-R GT Championship, 911 GT Pro
  S3).
- **Old saves:** the circuit career starts at class 1; everything the old
  race days opened stays open (their unlocks are given again on load,
  never taken away); couch rent goes by the furthest circuit class ever
  reached (old or new), so nothing changes there; an old race day still
  running when the update lands finishes as an open race.
- **Kept until C3:** open races, team races and invitations, the Night
  Series and the Circuit King (T.CLASSES D/C/B/A/O).
- **Tire-wear fix (owner's yes, Nov 27):** found while balancing: a car's
  rating (`T.idealLap`, cached per build) and the field's pace
  (`sensitivity`) used the car's tires as they were when first worked
  out, so worn tires made the whole field slower, or let a car under a
  class limit only while worn. Both now use the car on fresh tires
  (`T.freshCar`); the race itself still runs on the real tires. Affects
  open races, team races and the Night Series too.

## C1 build notes (Nov 27)
- **Code:** `ccareer.js` (DR.CL: classes, themes, regulars, events,
  locks, purses, unlocks, saves; wraps `T.enter` for ladder events: the
  lock, the field, the week); `team.js` (`T.freshCar`, the floor for
  ladder events, the event name in the away text); `circuitui.js`
  (`careerCard` is the road; `cEventCard`, `cRegulars`; the entry modal,
  watch view, live cards and recent results name the event); `screens.js`
  (class chips "C1 Club"..., the status line); `schedule.js` (slot
  `cnight`, Saturday 8 PM-midnight; the slot per event; the agenda per
  slot with a class-limit check); `garage.js` (circuit section),
  `home.js` (couch rent by `G.cbest`), `phone.js`, `ui.js`,
  `tutorial.js` texts; CSS for the road's circuit nodes.
- **Tested** (scratchpad `scrc/`): `c1a.js` (data: 21 events a class, ids,
  tracks, money, 12 unique regulars, every regular's pace over the floor;
  locks; entering: 10 cars, entry + wage; the purse by position; win ->
  section; won again; the Championship -> next class and its unlocks; a
  GT-R too quick for Club, fine in Unlimited; once a week; an old save
  (old Cup wins -> their unlocks back, class 1, couch rent kept); an old
  race day still running finishes as an open race). `c1ui.js` (phone and
  wide: the road, a night stop, a "coming" stop, the Championship, the
  entry modal, watching, the result, This Week, the garage). Rival
  snapshot identical; the drag regression (ltest, web2-12) clean.
- **Balance** (`c1bal.js`, 20 races each, fresh tires; win % / mean
  finish): Club Sprint section 1: stock Miata with a rookie (30) 50% /
  P1.5, with a 50 driver 95%; stock AE86 0% / P5 (needs parts); Miata with
  suspension, brakes and track tires (1:46.5) 100%. Section 3: the modded
  Miata 5% (rookie) / 45% (50 driver). Section 5 and the Championship need
  a car near the limit and a good driver: a stock S2000 (1:44.97) wins
  section 5 15% / 70% / 100% with a 50 / 65 / 80 driver, the Championship
  0% / 10% / 95%. Night tracks favour different cars (the S2000 wins the
  Route 99 race with a rookie, the Miata doesn't).
- **Follow-ups (planned):** C2 makes Spec live (the series car, rent or
  own) and the rule 3 of 4; licenses gate classes. C3: Endurance, then the
  Night Series and the Circuit King fold in (class 5's Championship as the
  way to the Circuit King); open races / team races then revisited.

## C2 research and draft plan (Nov 27: research done, 4 of 5 questions answered, no code)
**Research (2026 rules):**
- **Licenses** (SCCA 2026 GCR, Appendix C 2.7-2.8, downloaded from
  scca.com): a Novice Permit needs one drivers' school (at least 3 hours
  in-car, a satisfactory rating, signed off as ready to race); then 3
  Regional race weekends within the permit's 2 years give the Full
  Competition License (one track day or time trial may count as one).
  Licensing chairs may waive the school or the weekends for drivers with
  prior racing experience; NASA, IMSA, FIA and other licenses count as
  equivalent. A drivers' school weekend: $495 (2025, Roebling Road).
- **Spec Miata** (SCCA 2026 GCR 9.1.7, Nov 2026 edition): only the listed
  changes; the MAZDASPEED spec suspension kit (Bilstein/Penske shocks,
  springs, Eibach anti-roll bars); stock engine (air filter element free,
  cone filter on 1.6s, exhaust past the front downpipe free); brake pads
  and fluid free; wheels 15 in, min 13 lb, one-piece; the official Hoosier
  tire; body stock (chin spoiler allowed); weight with driver by year:
  2,275 lb (1990-93), 2,400 (1994-97, 1999-2000), 2,450 (2001-05) (SVRA
  sheet citing the GCR); a cage per GCR 9.4.
- **Spec E46** (NASA 2026 rules v1.1, Nov 17 2025): the **330i/330Ci**, not
  the M3; output max 225 whp (Epic spec ECU tune); MCS 1-way shocks,
  Hyperco springs, anti-roll bars free; BimmerWorld spec exhaust; 17x9
  wheels min 16.2 lb; Hoosier RCES 245/40-17; min 2,850 lb with driver;
  6-point cage.
- **Corvette Cup** (NASA; the rules PDF is members-only, 403): C5
  (1997-2004) and C6, near-stock power, Penske shocks, no aero, no Bosch
  motorsport ABS, Continental ExtremeContact Force 315/30-18 square at
  $370 each; a car built for $40,000 or less (nasaspeed.news, Dec 2024 and
  Dec 2025).
- **Porsche Carrera Cup / Super Trofeo:** factory-built race cars (911 Cup;
  Huracan Super Trofeo EVO2 $333,000 in 2025, 51gt3.com). A Cup weekend
  costs a team about $28,000-36,000, up to $45,000-50,000 for a
  competitive one (Rennlist, an older team thread); arrive-and-drive from a
  few thousand for an entry-level weekend to over $100,000 for a GT3
  season (ACI Motorsports).

**Draft plan:**
1. Spec events go live (the Spec stop of each section): everyone in the
   class's series car. The field: the class's regulars in the same car.
2. Rent (a fee per event: the car, prep, tires, fuel; damage charged) or
   your own car built to the series spec: the model, a stock engine (the
   series' free bits allowed), the series suspension, wheels and tire, a
   cage, not under the series weight. The shop and entry card show a
   "spec legal" check and what's missing.
3. Licenses per circuit driver: the drivers' school ($495, a weekend away)
   gives a novice permit (class 1); 3 race weekends on it, the full license
   (class 2 up).
4. The section rule with Spec live (3 events running).
**Owner's answers (Nov 27):** 1 rental scaled to the event (about 1.5x
the Spec event's win: class 1 ~$450-800, class 6 ~$45,000-80,000); 2
damage: about 1 in 5 of your driver's mistakes bends a rented car, 25% of
the rental each; 3 Touring uses the M3 E46 power-capped to Spec E46-like
rules **and a note to add a 330i later** (BACKLOG); 4 Danny starts with a
novice permit, hires averaging 50+ skill come licensed, rookies need the
$495 school, old saves' drivers with 3+ circuit races get the full
license. Still to ask: the section rule with three events running.
**Questions sent:** the rental price against the C1 purses (as
approved: $3,400 in class 1 vs a $300 win, ~$340,000 in class 6 if scaled
like the purses); damage on a rental (the race has no contact); the
Touring car (the real Spec E46 is the 330i); who already has a license
(Danny, experienced hires, old saves); the section rule with three events.

## Detailed design (approved Nov 27)
The plan above is approved (answers 1-7). This is the item-by-item
version to approve before building, split into three builds, smallest
first.
- **Build C1: the ladder and sprints.**
  1. Six classes: Club (Spec Miata), Touring (Spec E46), Sport (Corvette
     Cup C5), GT (Porsche Carrera Cup, the 911), GT Pro (Lamborghini Super
     Trofeo), Unlimited (Super Trofeo World Final). Pace floor per class
     (an ideal lap, as today's circuit classes).
  2. Each class: 5 sections x 4 events (Sprint, Spec, Endurance, Night
     street), 3 of 4 to open the next section, then the Championship
     weekend (qualifying and a feature race). Finishing an event takes a
     win (answer 2).
  3. In C1: Sprint (qualifying lap sets the grid, then the race: today's
     race model) and Night street (the airfield, Route 99, canyon,
     downtown). Spec and Endurance events show as "coming" until C2/C3.
  4. Rivals: ~12 named regulars per class with their own cars, pace
     stepping up by section (like the drag rosters); they're the fields.
  5. Money: purses by finishing position (the top 5 paid: 100 / 60 / 40 /
     25 / 15%); the first win of each event opens road-course cars and
     circuit parts (as now, spread over the sections).
  6. Saves: the circuit career starts over at class 1 (answer 6); cars,
     parts, drivers, money kept. The Night Series and Circuit King stay
     until C3, then fold in (the Championship weekend of class 5 becomes
     the Circuit King's path).
- **Build C2: spec cars and licenses.**
  7. Spec events: everyone in the series car. **Rent** (arrive-and-drive:
     ~$3,400 a weekend in class 1, scaled per class like the purses; the
     car's prep, tires and fuel in it; damage charged) or **your own**
     built to the spec (the model, the spec suspension, wheels and tires,
     a cage, the stock engine, the series' minimum weight).
  8. Licenses per driver: a drivers' school ($495, a weekend: SCCA
     regional school price, 2025) gives the novice permit (class 1); three
     race weekends on it give the full license (class 2 up) (answer 5).
- **Build C3: endurance.**
  9. About 3x a sprint's laps, two of your drivers sharing the car
     (answer 3), at least one pit stop: fuel (a stop of about 60 s at this
     length; ChampCar's real minimum is 5 min for a 6+ hour race), a
     driver change on it, new tires optional (+30 s). Each driver's stint
     drives at their own skill; tire wear and fuel matter.
- **Left out:** weather; safety cars; contact damage between cars; tire
  compounds beyond what's on the car; a real 6-24 hour race.
- **Questions for the owner:** the build split (C1 / C2 / C3); purses
  (top 5 paid, or winner only); the rental price level; the school price;
  the endurance stop length; what happens to the Night Series and the
  Circuit King.

## Sources
- scca.com: "I want to road race" (steps), Race Experience article,
  structure of road racing; raceschool.com blog (Novice Permit vs Full
  License, June 2026); motorsportreg SCCA form (Novice Permit $150).
- Wikipedia: Spec Miata, Mazda MX-5 Cup, SCCA National Championship
  Runoffs, Sports Car Club of America, ChampCar Endurance Series, 24 Hours
  of Lemons, Gran Turismo 7.
- automotiverestorations.com VRS rentals; Mazda Racers "Exploring the
  rental market" (search summary only: expired certificate).
- champcar.org supplemental rules (via search; 2026 BCCR PDF not opened).
- SCCA drivers' school price: motorsportreg.com, 2025 Hyler Craft Memorial
  Driver School, Roebling Road (SCCA Buccaneer Region): $495; SCCA no
  longer requires a novice permit to attend a school (scca.com). Porsche
  Carrera Cup / Super Trofeo / Spec E46 rental prices: not published
  (Porsche says contact them); the class 1 price scaled per class, as the
  owner chose (answer 4).
- nasaspeed.news: Corvette Cup announcement, Super Touring, Spec E46;
  thethirdturn / Hagerty: SCCA Corvette Challenge; racing.porsche.com and
  IMSA: Porsche Carrera Cup North America; Lamborghini / speedcafe: Super
  Trofeo.
- C2 (Nov 27): SCCA 2026 GCR, Nov 2026 edition (scca.com
  /wp-content/uploads/2026/11/NOV-26.pdf): Appendix C 2.7-2.8 licensing,
  9.1.7 Spec Miata; SVRA Spec Miata sheet (2025, weights); Harris Hill
  H2R Challenge Miata rules (a club's OEM-based Miata class, for
  comparison); NASA 2026 Spec E46 rules v1.1 (nasa-assets); nasaspeed.news
  Corvette Cup articles (Dec 2024, Dec 2025; the rules PDF is
  members-only); 51gt3.com 2025 Super Trofeo NA overview; Rennlist "IMSA
  GT3 Cup vs GT4" thread; ACI Motorsports arrive-and-drive costs; IMSA
  2025 Carrera Cup NA entry fee schedule.
