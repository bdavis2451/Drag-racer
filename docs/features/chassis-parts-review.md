# Rear wheel wells for every car + flywheel / diff / rear & front suspension review

Status: **Nov 15: research done, options below, waiting on the owner. No
code.** Owner (Nov 15): "make sure I can modify rear wheel wells on fwd
cars / all cars, at least rolling fenders, keep it realistic. What do our
flywheel, differential, rear suspension and front suspension categories do,
in all regards and in FWD specifically? Should anything change?"

## Wheel wells today
- Rear: RWD/AWD cars get Rear Wheel Tubs (Mini-Tubs 16.5 in, Full Tubs any).
  FWD cars get nothing at the back (the rear wells are fixed at factory
  tire + 2 in).
- Front: FWD cars get Front Wheel Wells (Rolled & Pulled Fenders +1.2 in,
  Wide One-Piece Front End to 13 in). RWD/AWD cars get nothing up front
  (factory + 2 in): an AWD car's front axle drives, so its front tire size
  is capped (a GT-R can't run the 315 radials up front).
- Real numbers: rolling the lip alone gains about 1/8-3/8 in a side;
  pulling the fender out adds more, about 20 mm at the rear and 10-15 mm in
  front (s2ki, AutoRestorer via SlashGear, GRM). Rolled + pulled is about
  3/4-1 in of tire width. Our +1.2 in is a bit generous.

## What the four categories do today
- **Flywheel / Flexplate:** lowers the engine's rotating inertia (stock
  1.0, lightweight 0.8, aluminium 0.62). Revs faster, less stored energy
  for the launch. Same for every drive. Also on automatics (a flexplate),
  where in real life a light flexplate barely matters (the converter is the
  big mass; Dragzine/ls1tech) and heavy "high-inertia" plates are sold for
  harder launches.
- **Differential:** a launch grip factor only: open 0.88, limited-slip
  0.96, spool 1.0, for every drive. Not used in circuit races (a spool
  doesn't hurt cornering in the game; in real life it pushes in corners).
  On FWD real cars run helical LSDs (Quaife, Wavetrac) or a welded/spool
  diff for drag (DSMTuners, GRM threads): the options fit.
- **Rear Suspension:** anti-squat only (stock 0.35 -> 4-link 0.85,
  adjustable on ladder bars / 4-link): part of the drive force pushes the
  rear tires down. It only acts on a driven rear axle, so **on FWD it does
  nothing**, yet it's offered and the FWD Race/Extreme suspension packages
  fit traction bars, ladder bars or a 4-link (money for nothing).
- **Front Suspension:** weight only: tubular K-member -12 kg, + arms and
  drag struts -22 kg, off the nose. Good for RWD (lighter nose, the
  car's weight goes where it's useful). **On FWD it takes weight off the
  drive tires** (the wrong way), and FWD suspension packages fit it.

## Real FWD practice (research, mostly forum-level)
- Stiffer rear springs and rear compression damping so the rear doesn't
  squat (weight stays forward); some lock the rear out with solid links in
  place of the shocks (ls1tech FWD thread, DSMTuners).
- A front traction bar / engine torque damper on FWD to stop wheel hop
  (DSMTuners "traction bar" on FWD; Honda builds use them).
- Keep weight on the nose (already done: battery, ballast, weight cut).

## Options (for the owner)
A. **Rear wheel wells for every car:** the rear slot shows on every car:
   1. Rolled & Pulled Rear Fenders (new, ~$400, +1 in), every car incl. FWD;
   2. Mini-Tubs and Full Tubs stay for a driven rear (RWD/AWD).
   And/or front Rolled & Pulled Fenders for RWD/AWD cars too (lets an AWD
   car fit a size bigger up front). Tone the fender gain to a realistic
   +1 in front and rear (the 26x8.5 still fits a FWD compact; the 28x9
   would need the front end).
B. **Rear Suspension on FWD:** hide it (and packages skip it); or replace
   it on FWD with what FWD racers fit at the back: Stiff Rear Springs &
   Shocks / Rear Lockout (less squat, weight stays on the nose, a small
   launch gain).
C. **Front Suspension on FWD:** packages stop fitting the K-member on FWD
   (it lightens the drive end); optionally a FWD option: Front Traction
   Bar (stops wheel hop: less tire shake on FWD launches).
D. **Flexplate on automatics:** a lighter flexplate does much less than a
   lighter flywheel (or hide the light ones and offer a heavy "high
   inertia" flexplate for launches).
E. **Spool in circuit races:** a spool costs cornering grip on the circuit
   (and an LSD helps over open), so the diff is a real choice there too.
F. Leave any of these as they are.
Rivals unchanged in every option (rival builds keep their numbers).

## Bench (built 1,000 / 1,500 hp FWD Civic, existing body model)
| Idea | 1,000 hp | 1,500 hp |
|---|---|---|
| Stiff rear springs & shocks | -0.05 s | -0.06 s |
| Rear lockout (solid links) | -0.20 s | -0.27 s |
| Front traction bar (less wheel hop) | -0.08 s | -0.09 s |
| Front limit straps (nose can't rise) | 0 | +0.03 (worse): dropped |

## Also found (FWD, drivetrain group)
- "Rear End & Axles" on FWD sells a built 9-inch and a fabricated pro rear
  end: rear-drive parts. FWD cars break front halfshafts. Real FWD axle
  upgrades (Driveshaft Shop): Level 2.9 ~475 hp, 3.9 ~600 hp, 5.9 ~850 hp,
  Pro-Level 1,000+ whp.
- "Driveshaft" is sold to FWD cars (a transverse FWD car has none).

## Plan (approved Nov 15)
1. **Rear Wheel Wells** (renamed from Rear Wheel Tubs), every car: Factory;
   Rolled & Pulled Rear Fenders $400, +1.2 in (same gain as the front);
   Mini-Tubs and Full Tubs stay, driven rear only (RWD/AWD).
2. **Front Wheel Wells**, every car: Factory; Rolled & Pulled Fenders $600,
   +1.2 in; Wide One-Piece Front End stays for FWD-built cars.
3. **FWD rear suspension** (replaces traction bars / ladder bars / 4-link on
   FWD): Stiff Rear Springs & Shocks $600 (about -0.05 s on a built car);
   Rear Lockout (solid links instead of rear shocks) $350 (about -0.2 s,
   drag only: costs rear grip on the circuit). Packages: Sport stiff rear,
   Race/Extreme lockout.
4. **FWD front suspension:** Front Traction Bar $350 (stops wheel hop: less
   tire shake, about -0.08 s on a big FWD car). FWD packages fit it instead
   of the tubular K-member.
5. **FWD axles:** on FWD the slot is "Axles (Halfshafts)": Factory; Level 2.9
   $900 (about 1,100 Nm, ~475 hp); Level 5.9 $1,600 (2,000 Nm, ~850 hp);
   Pro-Level $3,500 (9,000 Nm, 1,000+ whp), weight up front. The driveshaft
   slot hides on FWD (back on an AWD/RWD conversion).
6. **Flexplate on automatics:** a lighter flexplate does 30% of what a lighter
   flywheel does on a manual; named Lightweight / Billet Flexplate on autos.
7. **Diff on the circuit:** corner exit traction open 0.92, limited-slip
   1.0, spool 0.97, and a spool's drive axle corners at 0.94 (pushes).
Saves: FWD cars with rear-drive rear suspension or a driveshaft get them
moved to the shelf; FWD axles map to the same strength (chromoly -> Level
2.9, 9-inch -> 5.9, pro -> Pro-Level). Rivals unchanged.

## Build notes (Nov 15)
- parts.js: C.tubs renamed Rear Wheel Wells, on every car: rw1 Rolled &
  Pulled Rear Fenders $400 (wellR 1.2); tub1/tub2 onFwd:false. C.fwells on
  every car (not Pro Mod / rail): fw1 for all, fw2 `fwdCar` (option filter).
  wellLimit adds fenders front (non-FWD: factory + 2 + 1.2) and rear.
  rearsusp: rs0-rs3 onFwd:false, rf1 Stiff Rear Springs & Shocks $600
  (krK 2.5, cbRK 2), rf2 Rear Lockout $350 (krK 20, cbRK 6, crRK 3, latR
  0.92). frontsusp: ff1 Front Traction Bar $350 (tbar, +3 kg), fs1/fs2 stay.
  rearend: ra1-ra3 onFwd:false, fa1 Level 2.9 $900 (1100 Nm), fa2 Level 5.9
  $1,600 (2000 Nm), fa3 Pro-Level $3,500 (9000 Nm); slot named Axles
  (Halfshafts) on FWD. driveshaft notFwd (rivals exempt). Flywheel options
  renamed Flexplate on automatics. Option filter skips rival builds.
  Packages: FWD susp Sport rf1, Race/Extreme rf2 + ff1; axleFor works on
  the car's own option list.
- physics.js (players): flexplate effect x0.3 on automatics; FWD rear
  spring/damping multipliers; traction bar: tire shake x0.6 on FWD; FWD
  axle weight goes on the front.
- circuit.js (players): corner exit open 0.92 / LSD 1 / spool 0.97; a
  spool's drive axle corners x0.94; FWD lockout rear grip x0.92.
- game.js fwdPartsV1: FWD saves: rear-drive rear suspension and driveshaft
  to the shelf, ra1/ra2/ra3 -> fa1/fa2/fa3.
- ui.js help: wheel wells wording, FWD paragraph (rear, traction bar,
  halfshafts).
- Results: 1,500 hp FWD Civic bare 8.83 -> stiff rear 8.78, lockout 8.60,
  traction bar 8.74, lockout + bar 8.52 (1,000 hp: 9.02 -> 8.73). Circuit
  (pixel raceway): LSD best; open +0.1-0.3 s; spool +1.4-2.3 s; FWD lockout
  +2.9 s. Flexplate on an automatic (Camaro SS): ~no change; flywheel on a
  manual unchanged. GT-R fits 315/40R18 all round with front + rear fenders.
- Tests: rivals 0 diffs; package snapshot: only FWD drive/susp packages
  (halfshafts, no driveshaft, rf/ff parts) and the Camaro SS drive package
  (gear pick moves with the flexplate); 1,860 builds clean; qolsmoke,
  pkgsmoke, c2, drv, tubest clean; slots per drivetrain and old-save
  migration checked (scr/cpui.js, circdiff.js, fsusp2.js).

## Follow-up (Nov 15): drag springs & shocks on FWD
Owner: "do drag shocks & drag springs work correctly for fwd? the
description is a little off". They work (the body model is the same for
every drive; the tuner searches by result, so it finds the FWD direction).
The texts were rear-drive only. Measured on a 1,000 hp FWD Civic (sp3 +
sh3): stiff rear springs -0.04 s, firm rear rebound -0.05, soft front
springs -0.08, front rebound / rear bump / front limiter ~0. Fixed: FWD
descriptions for Drag Coilovers and Adjustable Drag Shocks (`descFwd`), and
FWD help lines on the tuning screen (`helpFwd`: front/rear springs, front
rebound, rear bump, rear rebound, front limiter). Text only.

## Sources
- Fender rolling/pulling: s2ki "how much clearance from fender rolling",
  SlashGear (AutoRestorer: ~3/8 in), GRM rolling vs pulling (paywalled
  numbers not read), apexwheels.
- Diffs: DSMTuners Quaife vs Wavetrac, LSD in a FWD; Ford Muscle / Moser
  (spool); GRM welded diff for drags; Speedway Motors welded diff.
- Flexplates: ls1tech lightweight flexplate threads, Dragzine flexplate
  articles (high-inertia plates), EngineLabs bracket flexplate.
- Axles: Driveshaft Shop listings (realstreetperformance, vividracing,
  weaponxmotorsports, hybrid-racing): Level 2.9 475 hp, 3.9 600 hp, 5.9
  850 hp, Pro-Level 1,000+ whp.
- FWD suspension: ls1tech FWD suspension discussion, DSMTuners FWD
  suspension / drag setup threads, Dragzine/QA1 front shock tuning (RWD).
