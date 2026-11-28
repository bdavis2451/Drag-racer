# Debug run, circuit side (Nov 28)

Status: **started** (after the drag debug run ships). The owner asked for
"the same bug fix pass but for the circuit side". As on the drag side:
small bugs get fixed; anything that changes money, balance or a rule goes to
the owner first as a question.

## What it covers
The circuit ladder's three builds and what they touched:
- **C1:** classes and their limits, five sections x (Sprint, Spec,
  Endurance, Night), the Championship, the twelve regulars a class, purses,
  unlocks by first section win, `c.cl` state, the tire-wear rating fix
  (`T.freshCar`), couch rent by `G.cbest`, the schedule slots (`cnight`).
- **C2:** spec events (rent at 1.5x the win, or own built to the spec),
  `CL.specCheck`, the M3's 265 hp cap (`inst.tune.capHp`), rental damage,
  licenses (school $495, novice permit, full license), 2 of 3, the new
  track tires (`tr_205`, `tr_305`).
- **C3:** endurance (3x laps, 1.5x purse, two drivers, one stop by fuel,
  the mechanic's save), 3 of 4, the Circuit King (`CK`, the 911 GT racer,
  $120,000, `G.awardCar`).
- Around them: open races, team races and invitations, the Night Series,
  the Circuit King title, the circuit career's unlocks for the drag side.

## Plan
1. Every existing circuit test on the current tree (`c1a`, `c1ui`, `c1old`,
   `c2a`, `c2ui`, `c2old`, `c3a`, `c3ui`, `c3old`), plus the drag regression
   (circuit code touches team.js, schedule.js, screens.js).
2. A circuit career soak, calendar off: whole careers through the real
   engine (enter, race, finish), class 1 to 6 and the Circuit King, random
   results, rentals and own cars, licenses, endurance with stops;
   invariants after every race (money, sections, unlocks never taken away,
   licenses, driver availability, the field) and save / load round trips.
3. Calendar on: race weekends by the clock (Sprint, Spec, Endurance, Night,
   the school), conflicts (a driver at the school, two endurance drivers, a
   car at the track, drag and circuit on the same day).
4. Screens (phone and wide) at a mid-career save: the road, entry cards,
   the spec rules, endurance entry, watching, results, Team, This Week.
5. Edge cases: no money, a rental bent, the M3 cap in and out of a Spec
   race, a car too quick for a class, old saves from each build, rivals
   (the snapshot).
6. The physics the circuit uses (lap times, wear, fuel) for odd cars:
   diesel, rotary, carbs, nitrous, AWD, FWD.

## Findings
(none yet)
