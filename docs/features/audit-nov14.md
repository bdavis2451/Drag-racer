# Audit of the big updates (Nov 14)

Owner (Nov 14): apply the new quality rule (fully integrated, rechecked in
detail) to the three latest big updates: the **turbo rework**, the **diesel
rework** and the **engine power ceilings + knock model**. Fix bugs; anything
that changes design goes to the owner as a question.

## 1. Turbo rework (c5f8b2b, 027ba94)

Checked: the diff line by line; every turbo id referenced (rivals, packages,
engines, game.js rival pools); save migration (old 61/80 mm turbos);
boost clamp on load; a sweep of every car's own engine x every power adder
(695 builds) and of 3 bodies (RWD/FWD/AWD) x every engine x every power
adder at default and max boost (4,212 builds): build, dyno, quarter mile,
NaN/negative/absurd checks; spec sheet screens (single, twin, diesel
compound, 4-cyl); circuit sim, converter warning, launch defaults, tuner.

Found and fixed:
- **Save data loss on load (older bug, made worse by the turbo and diesel
  reworks):** the load clean-up checked every spare part on the shelf
  against the car that happened to be active, so valid parts were deleted:
  front-drive transaxles with a RWD car active, layout conversions for
  other cars, diesel lift pumps / CP3s / diesel clutches and converters
  with a gas car active, carb fuel pumps with an EFI car, and turbos the
  shop no longer lists for their engine. A test shelf of every part in the
  game lost 49; now 0. Spare parts are kept if the game has them at all; a
  fitted part a car can't take any more goes to the shelf instead of being
  deleted. (game.js `inCatalog`, `sanitize`; ~67 ms once per load on
  desktop.)
- **Superchargers far past their knock point** (found by the sweep): with a
  hot un-intercooled charge the knock point went negative and power fell
  to near zero, the dyno even showing negative power. The knock point
  can't go below 0, the boost the engine uses can't go below none, and
  torque can't go below zero (an overdriven blower never pushes the engine
  backwards). Still detonating with a 70% failure risk, as it should.
  No rival or stock car moved.

Clean: all turbo ids valid; migration maps 61 mm -> 6266, 80 mm -> 7685 and
caps boost; every turbo build at default and max boost sane; spec sheets
correct; circuit sim uses the new spool's lag (a simplified lap model,
fed by the new physics).

**Questions for the owner:**
1. **Big turbos aren't sold for the engines that need them.** The shop
   lists a turbo only if a *stock* engine reaches 15 psi before its stock
   redline. So a 4G63 can buy at most the 7275 (~1,000 hp), an SR20 the
   7275, a 2JZ-GTE twin 6266s, an LS1 twin 7685s: the record builds from
   the engine-ceilings update use 9498s, twin 7685s and Pro Mod twins the
   player can't buy (40 of 44 engines). Judged on the engine as it can be
   built (race revs and breathing), every one of those turbos spools in
   time. Options: (A) list what the engine can use when built, with the
   spec sheet warning "too big for your engine as it is" (recommended);
   (B) list what fits the engine as it's built right now (the list grows
   as you add revs and parts); (C) keep it, lower the ceilings to what can
   be bought.
2. **Superchargers are listed for every engine** (a 14-71 Pro Mod blower
   for a 1.0 L 3-cylinder). Turbos are filtered to what suits the engine;
   filter the blowers the same way?
3. Nitrous on a turbo engine doesn't help it spool in the game (in real
   life it lights the turbo, HP Academy). Add it?

## 2. Diesel rework (f6cf893)

Checked: every plan item against the code (power from fuel, stock 370/800,
G56 dealer calibration 350/660, low-gear limit, smoke limiter by tune, parts
shown only on diesels and gas parts hidden, EGT, swaps and swap kit, save
mapping, converters); every diesel part list on the truck and on a
Cummins-swapped Fox; diesel ids leaking to gas cars (none); packages on the
truck and the swap (no gas parts); the tuner on a built truck; dyno, logger
and tuner sheets; a diesel race start.

Found and fixed:
- **"Misfiring" on a diesel:** diesels had a 99 psi "spark" limit; since the
  engine-ceilings update (race triples to 100 psi) a race diesel reported
  misfiring, an ignition risk note, and the shop suggested an ignition part
  (a diesel has none). No spark limit on a diesel now; the part-compare row
  for spark is hidden when a diesel is involved (it would have read "+9983
  psi spark" on a Cummins swap).
- **The part-status function added EGT risk to the car on every call**
  (a copy of the risk code): uncapped, duplicate notes, growing each time the
  shop drew the status for the same build, and feeding the race's failure
  roll. Now counted once, in the risk function.
- **Water-meth on a diesel did nothing** (same power and EGT, more weight
  and cost); the plan left it for later. Hidden on diesels.
- **Air-fuel ratio:** the dyno, the tuner's sheets and the data logger
  showed a gasoline ratio (~11.5:1) on a diesel. Now the diesel's own
  (e.g. 16:1 on a rich race build), on a 14-30:1 scale on the dyno chart.
- **Converters added after the rework** (lockup, bolt-together) now map to
  the race billet diesel converter on old saves.
- **A dyno crash with no sound** (older, found here): with sound off or not
  started, the dyno's pull waited on the engine recordings forever and
  crashed ("Maximum call stack"); the circuit screen had the same pattern.
  No sound now means nothing to wait for.

Clean: stock 16.02 (real 15.6-16.5, as documented at the rework), dealer G56
350/660 16.97, G56 + tune slips until a dual disc (16.13 -> 15.02); no gas
parts on diesels or diesel parts on gas cars; saves map gas parts to diesel
ones; the Cummins swap prices ($3,500 kit) and gearbox warning; a diesel
race starts with the AWD hit.

**Questions for the owner:**
4. **Diesel Pro / Extreme power packages run 31% engine risk** (1,820 F
   exhaust): they pair the race tune (no smoke limiter) with injectors that
   outrun the turbo's air. Options: use the street diesel tune in those
   packages, or a turbo / injector mix that stays under ~1,450 F. (They
   shipped like this; unchanged.)
5. **The tuner on a diesel** turns boost down for the internals but leaves
   the exhaust at 1,820 F and says nothing about it; real diesel tuners
   turn the fuel down. Add a fuel setting for diesels (or have the tuner
   recommend smaller injectors / a bigger turbo)?


## 3. Engine ceilings + knock (d261384, c0452d1, 7d6b4a6)

Checked: the diffs; every rival against its knock point (2 of 126 slightly
into the timing-pulled zone, none detonating); the shop's turbo lists
against the ceiling builds; part descriptions that quote rpm or psi; the
knock integration pass from Nov 14 (weather, logger, failure roll, race
intro, tuner, packages, nitrous); stock benchmark and rival snapshot after
every fix (stock unchanged; rivals unchanged by the audit fixes).

Found and fixed:
- **Valvetrain and oiling descriptions** quoted the plain gain ("valves
  float 2300 rpm later") on engines the ceilings update lets rev further
  (a 4G63's Pro Mod valvetrain really gives 3,900). They now give each
  engine's real number.
- (Turbo audit) knock point floor at 0 psi, boost used and torque never
  below zero.
- (Diesel audit) the race triples at 100 psi read "misfiring".

Found, waiting on the owner: **question 1** (the shop doesn't sell the
turbos the record builds need). The changelog note for the tester says so.


## Owner's answers (Nov 14) and what was built
1. **A: the shop lists turbos the engine can use once built** (race heads,
   cams, intake, valvetrain and bottom end, race fuel and tune), with the
   spec sheet saying "too big for this engine as it is ... it comes alive on
   this engine built". Packages keep the stock-engine rule. Now every engine
   can buy the turbo its record build uses (the air-cooled VW tops out at
   the 7275). physics.js `DR.turboFitsBuilt`; parts.js turbo list; ui.js sheet.
2. **Superchargers filtered by engine:** a blower is listed if it feeds more
   than the engine makes stock and its flow is no more than 1.5x what the
   built engine makes at the blower's most boost (`DR.blowerFits`). The 14-71
   shows only on big-inch engines; the Geo, air-cooled VW and D15 get none;
   the M90 drops off the big V8s. A blower already on a car always shows.
3. **Nitrous lights a turbo:** while it sprays, the shot's exhaust drives
   the turbine on top of the engine's own (`tbStep` exK, up to 2.5x; most
   where the engine makes little yet). Supra + 8891: full boost 4.33 s dry,
   2.64 s with a 75 shot, 1.75 s with a 150; S13 + 7275: 2.72 -> 0.79 s;
   an LS1 + 7685 (already quick) barely changes. One rival 0.007 s quicker.
4. **Diesel power packages made safe:** diesel packages run the turbo up to
   what the head gasket holds (44 psi) instead of leaving it at 30, Pro uses
   50% injectors with the S366, Extreme the S366/S480 compounds with 100%
   injectors, and if a build is still risky the package steps the injectors
   down a size (only while that lowers the engine, gearbox and axle risk).
   Truck: Pro power 600 hp / 1,370 F, Extreme power 600 hp / 1,518 F, full
   Pro 692 hp, full Extreme 851 hp / 1,351 F; no engine risk on any. Gas
   packages: all 1,432 identical to before (only the 8 truck diesel ones
   changed).
5. **The tuner on a diesel** says when the exhaust is hot and what fixes it
   (a bigger turbo, smaller injectors or the street tune; not less boost).
   **Then (owner: build it): a Fuel setting** on tuned diesels, used by the
   tuner (see `diesel.md`, "Fuel setting").
6. Wheels & tires questions: held for the rework (owner).

Tested: shop lists per engine (turbos and blowers), spec sheets (Evo 9498,
S13 8891), nitrous spool runs, diesel package grid and snapshot of every
package (1,440), diesel tuner, stock benchmark (unchanged), rivals (1 of 126,
-0.007 s), qolsmoke, pkgsmoke, burnui, tubest, tuner, shelf-loss test,
edge cases, every car x power adder sweep (663 builds, clean).
