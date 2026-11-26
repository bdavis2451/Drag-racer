# Circuit ladder (fresh)

Status: **Nov 26: plan approved (questions answered). Built after all four
drag ladder builds (owner's order). No code yet.** Replaces the circuit
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
- nasaspeed.news: Corvette Cup announcement, Super Touring, Spec E46;
  thethirdturn / Hagerty: SCCA Corvette Challenge; racing.porsche.com and
  IMSA: Porsche Carrera Cup North America; Lamborghini / speedcafe: Super
  Trofeo.
