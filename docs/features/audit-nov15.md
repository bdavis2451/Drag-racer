# Audit (Nov 15): everything shipped since the Nov 14 audit

Scope: 8f265cc (audit follow-ups: big turbos, blowers by engine, nitrous
spool, diesel packages), f57e8a9 (diesel fuel setting), e2634bd (dyno
always paid, diesel head studs), 467ce3f (wheels & tires rework), 80a8224
(AWD tire packages), 9d8f855 (FWD update), 3293f06 (weight reduction).
Owner's trigger: a screenshot showing the old "Drive Tires / Wheels / Front
Tires" slots.

## Found
1. **The Claude-app preview of the game was 10 days stale** (last updated
   Nov 5): the owner was playing the pre-wheels-&-tires build. Pages had
   the current build. Republished the preview with today's build.
2. **Old saves, "Matching Tires All Round" (ft2):** the conversion copied
   the drive tire and wheel onto the other axle even where they don't fit
   (a 315 track tire on a Fox's front: too wide; a 17 in wheel over a
   GT-R's 18 in brakes), so a car that raced before couldn't. Fixed: the
   copy only goes on if it fits; saves already converted get a repair pass
   (`wheelsV2`) that takes a non-fitting copy off to the shelf.
3. **Old saves, front runners on a dragster:** the old runners became a
   26x4 runner, wider than a dragster's front wells (6.0 in): the rail
   couldn't race. Same fix (it keeps its factory 22x2.5 runners; the
   runners go to the shelf at full value).
4. **Pro Mod / dragster still offered Rear Wheel Tubs** (they are tubbed
   tube-chassis cars). Hidden with the other body parts.

## Checked and fine
- 1,455 builds: every car x every drivetrain layout x every tire package
  tier, and every tire on every car: no crashes, no NaN, no fit problems
  from packages (scr/aud1.js).
- Old-save matrix, 10 cars x 8 old wheel/tire combos: loads clean; the
  only "can't race" cars are drive tires that are too big for the wells or
  wheels too small for the brakes (the owner's "keep, flagged" rule)
  (scr/aud2.js, aud2b.js for the repair pass).
- Handling (circuit) numbers with fender work, ballast, AWD conversion,
  Pro Mod, rail: all finite and sensible (scr/aud3.js).
- Shop click-through on FWD, FWD->AWD, Evo, Fox, rail, Pro Mod, diesel:
  every suspension / wheels & tires / weight slot and its first card: no
  broken text, no errors (scr/aud4.js).
- Diesel fuel setting and head studs: every reader of `dslFuel`, `dpsi`,
  `headKit`, `dynoLabor` in place.
- Rivals: snapshot 0 diffs; package snapshot 0 diffs; qolsmoke, pkgsmoke,
  Pro Mod save cleanup clean.

## Noted, not changed (for later)
- Tire wear and the Fresh Tires service cover the drive tires only; an AWD
  car's front tires never wear or get charged.
- A tire bought for one axle sits on the shelf as that axle's part (a
  front set can't go on the rear of another car).
- An old FWD save on a 275 drag radial is "can't race" until the fenders
  are done, and the fenders unlock at the Pro level.
