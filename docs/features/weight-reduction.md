# Weight reduction audit

Status: **Nov 15: shipped (all four items approved: rescale, cages, Pro Mod
& dragster, A/C double count).** Owner (Nov 15): "is our weight savings from our weight
reduction parts accurate? Give that a thorough check."

## How the game does it now
- One slot, the stages replace each other (so each stage is the total):
  w0 Spare, Jack & A/C Delete -2%, w1 Interior Strip -5%, w2 Lightweight
  Panels -10%, w3 Carbon Body & Lexan -16%; Tube Chassis (Chassis slot)
  -24% and replaces the stages.
- "Chassis weight" = curb weight minus the engine. Curb weights include the
  driver (~80 kg), so the percentage also "strips" part of the driver.
- Other weight parts: race seat sf1 -9 kg (sf2 -1 with chute, sf3 +4),
  cages cg1 +7, cg2 8-point roll bar +18, cg3 25.3 chromoly cage +26 (tube
  chassis includes +26), battery bt1 +3 / bt2 -12 / bt3 -12, accessory
  delete pu3 -14 kg ("A/C, power steering, alternator").

What that comes to (lb, cumulative):
| Car | w0 | w1 | w2 | w3 | tube |
|---|---|---|---|---|---|
| Fox Mustang (3,045 lb curb) | 55 | 139 | 276 | 441 | 661 |
| Civic EG (2,100-2,300) | 42 | 104 | 207 | 331 | 497 |
| Supra / Evo / R34 class | 62 | 154 | 306 | 489 | 734 |
| Ram 2500 | 123 | 306 | 613 | 979 | 1,469 |

## Real numbers (Nov 15 research, cumulative, Fox / Civic)
- **Spare, jack & A/C:** spare + jack 30-50 lb (compact ~30, truck ~60);
  A/C system 30-60 lb (Behr system weighed 61; Mustang 59; Porsche 49;
  Civic ~32). Fox ~95, Civic ~65. **Game: 55 / 42 (about half).**
- **+ interior strip:** rear seat ~20-40, passenger seat ~40, carpet ~13-20,
  headliner ~7, sound deadener 20-55, trim ~15-20. Civic strip reported
  125-150 lb. Fox ~225-275 total, Civic ~190-220. **Game: 139 / 104
  (about 55%).**
- **+ lightweight panels:** fiberglass hood ~25 saved, hatch ~19, fenders
  ~4-8, bumpers up to ~80 (Malibu pair), doors with Lexan door glass
  100-120 for the pair (Dragzine BlownZ: 72 lb factory door vs 14 lb
  shell). Fox ~415-525, Civic ~280-345. **Game: 276 / 207 (about 60%).**
- **+ carbon & Lexan:** Lexan saves ~50% per window (door pair 28 -> 12
  lb; whole car 20-100+ lb); carbon doors ~30 lb each over steel, carbon
  hood 20-40. Grassroots: a Fox needs 400-500 lb out (all panels glass, no
  windows or interior, Lexan windshield) to reach 2,400 lb. Fox ~450-550,
  Civic ~330-420. **Game: 441 / 331 (close).**
- **Cages:** full chromoly cage 90-95 lb (mild steel 130-135, Wolfe);
  8-point mild steel bar ~80 lb, chromoly ~20 lb lighter (Spohn). **Game:
  roll bar 40 lb, 25.3 cage 57 lb (about 60% of real).**
- **Race seat:** 10-20 lb saved per seat (factory 30-45 lb vs 11-20 lb
  aluminium/carbon). **Game -9 kg (20 lb): fine.**
- **Race battery:** factory ~40 lb, small race battery ~15 lb. **Game -12
  kg: fine.**

## Problems found
1. **Stages 0-2 take off about half to 60% of what the real work saves**;
   stage 3 is about right. So the cheap stages are worth too little and
   the jump to stage 3 is too big.
2. **The percentage includes the driver** (~80 kg), so it strips 2-13 kg of
   "driver" (small).
3. **Cages weigh about 60% of real** (roll bar 18 kg vs ~30-36; chromoly
   cage 26 kg vs ~42).
4. **Pro Mod and dragster can buy weight reduction, cages, a tube chassis,
   a trunk battery:** they are already tube-chassis race cars; Stage 3
   takes a Pro Mod from 1,180 to 1,033 kg (real Pro Mods run at a ~2,650 lb
   minimum with driver, which is the 1,180 we have). Rival Pro Mods are
   built with a tube chassis listed (`w4` -> ct), so rivals must keep theirs.
5. **A/C counted twice:** the stage 0 delete removes the A/C, and the Race
   Accessory Delete (pulleys) says it removes the A/C too (its -14 kg).

## Proposal (for the owner)
- Stages as % of the chassis **without the driver**: w0 3.5%, w1 8.5%,
  w2 15%, w3 19%; tube chassis stays 24%. Fox: 90 / 219 / 387 / 490 lb;
  Civic: 66 / 161 / 284 / 360 lb (inside the real ranges above).
- Cages: roll bar 30 kg, chromoly cage 42 kg (tube chassis cage the same).
- Pro Mod & dragster: no weight stages, cages, tube chassis or trunk
  battery for players (already race cars).
- Accessory delete: drop the A/C from its text, -8 kg (power steering,
  alternator, belt).
- Rivals keep their numbers (snapshot identical).
- Effect: player cars get ~40-110 lb lighter at stages 0-2 (about
  0.03-0.08 s), about the same at stage 3 with a cage. Career balance check
  needed (rivals unchanged).

## Build notes (Nov 15)
- parts.js: w0-w3 `wr` 0.035 / 0.085 / 0.15 / 0.19 with `aiWr` (old
  values, rivals); new descriptions say what comes out. cg2 kg 30 (aiKg 18),
  cg3 42 (aiKg 26), ct 42 (aiKg 26). pu3 kg -8 (aiKg -14), text no longer
  claims the A/C or the battery. `DR.RACE_CAR_NO` = weight, chassis,
  battery: not for players' cars with `shell === Infinity` (Pro Mod, rail).
- physics.js: players' cut = (curb - engine - 80 kg driver) x wr, taken
  from the front in the body's own split (FWD: 40%); rivals keep the old
  formula (`aiWr`, driver counted in, `aiKg`).
- game.js `raceCarV1`: a Pro Mod / rail with weight stages, a cage or tube
  chassis, or a battery move gets them put on the shelf (tested).
- Result (lb off): Fox 90 / 219 / 387 / 490 (tube chassis net -526); Civic
  66 / 161 / 284 / 360; Supra 101 / 245 / 433 / 549; Ram 208 / 506 / 892 /
  1,130. Cages +66 / +93 lb. Rivals 0 diffs; package snapshot 0 diffs;
  smoke tests clean.
- Career packages (all groups, default tune, before -> after), most tiers
  0-2 0.03-0.13 s quicker (Fox t1 12.28 -> 12.18, Camaro V6 t1 13.05 ->
  12.92, Evo t1 13.42 -> 13.30, Ram t1 13.72 -> 13.60); tier 3 about the
  same (Fox 8.86 -> 8.85). A few traction-limited builds are slower:
  Camaro SS t3 7.93 -> 8.04, Civic t2 11.99 -> 12.03, Supra t2 10.96 ->
  11.00, AE86 t2 11.02 -> 11.05: stripping the body leaves the engine's
  weight up front, so the drive tires of a rear-drive car carry a smaller
  share, and the heavier (real) cage. Scripts: scr/wr*.js, wrcareer.js.

## Sources
- A/C: bmw2002faq Behr system weighed; rennlist 993 A/C removal (49 lb);
  stangnet A/C weight (59 lb); civicwagon (15.5 lb partial).
- Spare/jack: modernspare knowledge base; ecomodder; quadratec.
- Interior: honda-tech weight reducing parts list / EG rear parts; GRM 2002
  Civic Si "On the Scales" (carpet 13, headliner 6.5); americanmuscle rear
  seat delete (20 lb); LMR Fox weight reduction guide.
- Sound deadener: nasaspeed.news "weight loss through fire and ice" (20-50
  lb); dsmtuners; maxima.org.
- Panels: dragzine BlownZ fiberglass doors (72 vs 14 lb); dragzine Glasstek
  Malibu bumpers; stangnet fiberglass hood 20 lb / hatch -18.6 lb; Hub
  Magazine Anderson carbon doors (30 lb per door); clublexus Seibon
  weights.
- Lexan: dieselarmy Optic Armor; streetmusclemag; GRM Lexan thread.
- Whole car: GRM "is Mustang Man full of crap" (400-500 lb to 2,400 lb);
  stangnet "who here has weighed their fox".
- Cages: Spohn (8-pt chromoly ~20 lb lighter); forabodiesonly (Wolfe mild
  130-135 vs moly 90-95; 8-pt steel ~80 lb); performanceracing.
- Seats: classracer; Jegs aluminium seat; dragzine Racetech 8119 (11 lb).
