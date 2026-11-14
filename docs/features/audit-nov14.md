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
(in progress)
