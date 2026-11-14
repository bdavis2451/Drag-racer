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
(in progress)

## 3. Engine ceilings + knock (d261384, c0452d1, 7d6b4a6)
(in progress)
