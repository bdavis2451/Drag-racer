# Engine power ceilings (how much each engine can make)

Status: **built and shipped (Nov 13).** Owner's answers (Nov 13): match the
records; raise all three race fuels and check the 93-octane number; trim the
engines that run high; raise the Cummins now. Owner (Nov 13, earlier):
do heavy research, chase realism, expand to any engine that needs it, make it
its own section. Already ticked as wanted: race turbos to 65/70 psi,
methanol knock limit up, more revs for 4G63 / EJ / SR. Comes before the
wheels & tires rework and FWD traction.

## How the ceiling works today
On a full race build (every breathing part, billet bottom end, methanol,
the biggest fuel system, race ignition and valvetrain, max revs), an
engine's power comes from:
1. **Its NA-equivalent torque** x its race breathing gain (`bg`), peaking at
   `bp` rpm.
2. **Boost**, capped by the turbo's compressor (`maxBoost`: 8891 50 psi,
   9498 55, Pro Mod twins 60) and by the fuel's knock limit (methanol ~50-52
   psi with an ice intercooler; past it power falls off and risk climbs).
3. **Revs**: the race valvetrain and billet parts allow `red` + a little.
   4G63 / EJ / SR20 / 3S top out ~8,900; K20 / F20C ~10,500-10,900.
4. **The compressor's flow** (`flow`, the hp it feeds) and the fuel system.

## Test: every engine, full race build, best power adder (Nov 13)
(scratchpad `scr/allmax.js`; the best of every turbo / blower at 60-100% of
its max boost, max revs)

| Engine | Stock | Max now | With | Real-world top builds (crank, approx) |
|---|---|---|---|---|
| 1.0 I3 Geo | 55 | 427 | 6266 | ~400-500 (built G10 turbo) ✓ |
| 1.5 D15 | 102 | 757 | 7685 | D-series turbo ~700-900 ✓ |
| 1.6 4A-GE / Blacktop | 116 / 165 | 1,021 / 1,193 | 8891 | 4A-G turbo race ~700-900 (game a bit high) |
| 1.8 B18C | 195 | 1,364 | 9498 | B-series drag ~1,200-1,500 ✓ |
| 2.0 K20 | 220 | 1,599 | 9498 | K-series ~1,300-1,500 whp FWD, 1,800 AWD Integra (2.2-2.4L, 60-70 psi) |
| 2.0 F20C | 240 | 1,618 | 9498 | similar to K20 |
| 2.0 SR20 (generic turbo) | 220 | **971** | 9498 | **Mazworx SR20 ~2,000 hp, 6.22 @ 229** ✗ |
| 2.0 4G63 | 286 | **1,038** | 9498 | **1,500-1,600 whp at 11,000 rpm, 80-85 psi; Jett ~2,000 at 112 psi** ✗ |
| 2.0 3S-GTE | 245 | **1,003** | 9498 | 3S drag ~1,200-1,500 ✗ |
| 2.5 EJ257 | 300 | **1,173** | 9498 | EJ drag ~1,000-1,300 (no big drag record found) ~ |
| 1.3 13B | 255 | 1,584 | 9498 | 13B 1,400-1,700, 5.93 record car ✓ |
| 3.0 2JZ-GE (NA) | 220 | 1,715 | 9498 | (the NA block, turbo-converted) |
| 3.0 2JZ-GTE | 320 | **1,452** | 9498 | **2JZ: ~2,000 common in 6s cars, ~3,000 (El General Camry)** ✗ |
| 2.6 RB26 | 320 | **1,238** | 9498 | **RB26 2,140 hp at 78 psi (record); 1,794 dyno** ✗ |
| 3.2 S54 | 333 | 2,090 | 9498 | S54 turbo ~1,000-1,500 (game high) |
| 3.5 VQ35 | 287 | 2,040 | 9498 | VQ turbo ~1,000-1,400 (game high) |
| 3.8 Buick turbo / GNX | 245 / 300 | **1,056 / 1,189** | 8891 | Buick V6 drag ~1,200-1,500 ✗ |
| 3.8 3800 Series II (NA) | 200 | 1,614 | 8891 | 3800 turbo ~800-1,000 (game high) |
| 3.8 VR38 | 565 | 2,165 | 9498 | **VR38 ~3,000-3,500 crank (ETS, AMS)** ✗ (twins would be the real way) |
| 3.8 911 flat-6 | 530 | 1,996 | 9498 | 997/991 TT ~1,500-2,000 ✓ |
| 4.6 Terminator | 390 | 1,858 | 9498 | Mod motor ~2,000-2,500 ✓ |
| 5.0 302 / Coyote | 225 / 460 | 2,453 / 3,066 | twins | Coyote twin ~2,500-3,000 ✓ |
| 5.7 LS1 / 6.2 LS3 / 7.0 LS7 | | 2,777 / 3,422 / 3,708 | Pro Mod twins | LS twin-turbo ~2,500-3,500 ✓ |
| 9.4 572 / 8.6 billet Pro Mod | | 4,242 / 4,395 | Pro Mod twins | Pro Mod ~3,500-4,000+ ✓ |
| 8.4 V10 / 6.5 V12 | | 4,400 / 4,400 | Pro Mod twins (flow-capped) | twin-turbo Viper V10 ~2,000-3,000 (game high) |
| 6.7 Cummins | 370 | 1,490 | race triples | competition Cummins ~2,000-2,500+ (fuel-capped at 1,600) |

**What it shows**
1. **Factory-turbo engines are capped low**, often below their own NA
   siblings: 2JZ-GTE 1,452 vs 2JZ-GE 1,715; Buick turbo 1,056 vs 3800 NA
   1,614; RB26 1,238; SR20 971; 4G63 1,038; 3S 1,003. Cause: their
   NA-equivalent torque is worked out from factory boost (low compression),
   and their race breathing gain (`bg`) and race power peak (`bp`) are low.
   These are exactly the engines famous for big power.
2. **Boost is capped at 50-55 psi** (compressors and methanol's knock limit).
   The record 4-cylinders and RB26s run 70-112 psi on methanol.
3. **Revs**: 4G63 / EJ / SR / 3S stop ~8,900; real race ones rev 10,000-11,500.
4. **A few engines are high** for what's real: 4A-G, S54, VQ35, 3800 NA,
   V10 / V12 (flow-capped at 4,400). Usually a high `bg` on a cheap NA engine.

## Real-world references (sources)
- SR20: Mazworx ~2,000 hp, 6.22 @ 229 (enginelabs.com/?p=298624,
  enginelabs.com/news/mazworx-2000-horspewer-billet-sr20-secures-the-4-cylinder-record).
- 4G63: 1,600 whp, 11,500 rpm, 80-85 psi on methanol (dsportmag 1600-whp
  Eagle Talon); 1,500 whp @ 11,000, 85 psi (Brad Gary Talon); 1,200 whp to
  the tires near 11,000 at 80 psi (Aaron Gregory, dragzine); Jett Racing
  ~2,000 hp, 112 psi, 6.23 (thedrive.com 25244).
- RB26: 2,140 hp at 78 psi (HP Academy, TRP record); 1,794 hp dyno (enginelabs);
  1,200 hp at 35 psi and 10,000 rpm (PMC, HP Academy).
- 2JZ: ~3,000 hp Camry (dragzine 2033352); 2,000 hp Supras in the 6s;
  1,300 hp at 9,000 rpm (enginelabs).
- VR38: ~3,000 whp / ~3,500 crank (ETS); 2,842 awhp dyno (AMS).
- 13B: 1,400 hp 7.72 IRS record car; 5.93 record (dragzine, thedrive).
- K-series: 1,300 whp FWD Civic record; 1,800 hp AWD Integra; K24 2.2
  60-70 psi 7.96 @ 198 (Garrett press release).
- Fuels: pump gas 12-15 psi typical; E85 lets you creep higher; methanol is
  the high-boost fuel (charge cooling), limited by charge temperature and
  compression (Holley, EngineLabs, HP Academy forums). The records above
  run 70-112 psi on methanol.

## Plan (draft, for the owner)
**1. Fuels' knock limits** (all engines): methanol 50 -> **80 psi** (with a
cool charge; the records run 80-112), E85 30 -> **40**, race gas 34 -> **40**.
Pump gas stays 17. (A hot charge still lowers them, as now.)

**2. Race compressors** (`maxBoost`): 8891 50 -> **70**, 9498 55 -> **80**,
twin 7685 45 -> **60**, twin 9498 Pro Mod 60 -> **80**. Real billet race
wheels reach pressure ratios of 6+; past ~75% of the limit they get less
efficient and heat the charge (already modelled), so the last psi cost more.

**3. Race revs per engine** (`raceRed`: what a full race valvetrain and
bottom end let it rev to, and `bp` moves up with it):
4G63 10,500 · SR20 10,000 · 3S-GTE 9,500 · EJ257 9,000 · 2JZ-GTE / GE 9,500 ·
RB26 10,000 · Buick 3.8 7,500 · VR38 8,500 (others as now).

**4. Factory-turbo engines get their real race headroom** (`bg` / NA
equivalent): 2JZ-GTE, RB26, 4G63, SR20 (the generic 2.0 turbo), 3S-GTE,
EJ257, Buick turbo / GNX, VR38, 13B get race breathing in line with their
NA siblings and the records, so a full build lands near the targets below.

**5. Trim the ones that are high** (4A-G, S54, VQ35, 3800 NA, V10 / V12):
lower `bg` so they land in their real ranges.

**6. Targets** (full race build, best turbo, methanol, ~70-80 psi where the
engine can use it): about 80-90% of the record builds (the records are
one-off 100+ psi engines):

| Engine | Now | Target |
|---|---|---|
| SR20 | 971 | ~1,700 |
| 4G63 | 1,038 | ~1,700 |
| 3S-GTE | 1,003 | ~1,400 |
| EJ257 | 1,173 | ~1,300 |
| K20 / F20C | ~1,600 | ~1,700 |
| B18C | 1,364 | ~1,400 |
| 13B | 1,584 | ~1,600 |
| 2JZ-GTE | 1,452 | ~2,500 |
| RB26 | 1,238 | ~2,000 |
| Buick / GNX | ~1,100 | ~1,500 |
| VR38 | 2,165 | ~3,000 |
| 4A-G | ~1,000-1,200 | ~900 |
| S54 / VQ35 | ~2,050 | ~1,500 |
| 3800 NA | 1,614 | ~1,000 |
| V10 / V12 | 4,400 | ~3,000 |
| Cummins | 1,490 | (later: race injectors / fuel to ~2,000) |

**What it changes**
- **Rivals:** their builds don't change, but the same parts can make more
  (factory-turbo engines) or less (the trimmed ones) power: their times move.
  Folded into the career rebalance (already planned).
- **Players:** existing builds on the affected engines change power;
  nobody's boost changes on its own (the higher limits only let you turn it
  up).
- **Prices / unlocks:** unchanged.

## Decisions (owner, Nov 13)
1. **Match the records** (not 80-90%): targets below are the record builds.
2. **Fuels:** methanol 80 psi, E85 40, race gas 40. **Pump gas stays 17**:
   research says 93 octane with a good intercooler is safe around 15-18 psi
   on typical 9-10:1 engines (more with low compression and a cold charge,
   less without an intercooler), so 17 is right.
3. **Trim the high ones** (4A-G, S54-style 3.2, VQ35, 3800, V10 / V12).
4. **Cummins raised now** (race injectors / triple CP3 to ~2,600 hp of fuel,
   race triples to 100 psi and ~3,300 hp of flow).

## Build (Nov 13)
- **Fuels** (parts.js): knock limits above.
- **Race compressors** (parts.js `maxBoost`): twin 7685 60, 8891 70, 9498 80,
  Pro Mod twins 80.
- **Revs** (data.js `rx`, physics.js): a race valvetrain (by how much it
  adds) and billet bottom end let an engine rev `rx` higher than before;
  race power peaks (`bp`) moved up for 4G63 9,800, SR20 9,200, 3S 8,800,
  EJ 8,200, 2JZ-GTE/GE 8,800/8,500, RB26 9,200, VR38 8,000, Cummins 4,400.
- **Boost effect past 15 psi** (data.js `bk`, physics.js `boostedTorque`):
  each engine has a factor for how well it turns boost past 15 psi into
  power (head, block, how the factory sized it). Up to 15 psi nothing
  changes, so stock cars and mild builds are as before. Fitted per engine
  (scratchpad `scr/calibk.js`) so a full race build lands on its target.
  Range 0.21 (3800 NA) to 1.96 (RB26). The 8.6 billet Pro Mod stays 1.
- **Compound surge** (physics.js): the triples' small stage now has its
  own surge line (`mcS`), so the race triples can make full boost.

### Final full-build numbers (best adder, methanol, max revs)
| Engine | Target | Game | With |
|---|---|---|---|
| 1.0 I3 | 450 | 451 | 6266 |
| 1.6 4A-G / Blacktop | 900 / 1,000 | 900 / 1,005 | 8891 70 psi |
| 1.5 D15 | 800 | 799 | 7685 |
| 1.8 B18C | 1,500 | 1,502 | 8891 70 psi |
| 2.0 K20 / F20C | 1,800 | 1,796 / 1,796 | 9498 80 psi |
| 2.0 SR20 | 2,000 | 1,997 | 9498 80 psi, 10,000 |
| 2.0 4G63 | 2,000 | 2,049 | 9498 80 psi, 10,500 |
| 2.0 3S-GTE | 1,500 | 1,496 | 9498 80 psi |
| 2.5 EJ257 | 1,300 | 1,297 | 9498 80 psi |
| 1.3 13B | 1,700 | 1,696 | 9498 80 psi |
| 3.0 2JZ-GE / 2JZ-GTE | 1,800 / 2,350 | 1,804 / 2,345 | 9498 / twin 7685 60 psi |
| 2.6 RB26 | 2,140 | 2,138 | twin 7685 60 psi |
| 3.2 I6 (S54) | 1,500 | 1,500 | 9498 |
| 3.5 VQ35 | 1,400 | 1,389 | 8891 |
| 3.8 3800 NA / SC | 1,000 / 1,000 | 1,005 / 1,000 | 8891 |
| 3.8 Buick turbo / GNX | 1,500 | 1,500 / 1,501 | 8891 70 psi |
| 3.8 VR38 | 2,450 | 2,459 | twin 7685 60 psi |
| 3.8 911 | 2,000 | 1,988 | 9498 |
| 4.6 Terminator | 2,200 | 2,205 | twin 7685 |
| 5.0 305 / 302 HO / Coyote | 1,800 / 2,500 / 3,000 | 1,805 / 2,502 / 3,008 | 9498 / Pro Mod |
| 283 / 350 / 5.7 TBI / LS1 | 1,800 / 2,800 / 2,400 / 3,000 | 1,801 / 2,806 / 2,398 / 2,993 | 9498 / Pro Mod / twin 7685 |
| LS3 / LS7 / LSA | 3,500 / 3,800 / 3,500 | on target | Pro Mod |
| Hemi / 454 / 572 | 3,500 / 3,500 / 4,300 | on target | Pro Mod |
| V10 / V12 | 3,000 | 2,989 / 3,017 | Pro Mod |
| 6.7 Cummins | ~2,000+ | ~2,317 | race triples, race injectors |

**Short of the record:** 2JZ-GTE (record ~3,000) and VR38 (~3,500 crank)
stop at ~2,350 / ~2,450: the twin 7685s run out of flow (2,500 hp) and the
Pro Mod twins are too big to spool on 3.0-3.8 L. Getting there needs a
bigger turbo option (a ~100 mm single or a twin 8891 set): question for the
owner.

### Tests (Nov 13)
- `scr/calibk.js targets check`: all 44 engines on target, no errors.
- Stock benchmark (`scr/bench.js`) vs the last commit: identical (Evo
  13.78 -> 13.79).
- Rival snapshot (`scr/rivsnap2.js ceil vfix`): 19 of 126 moved. Biggest:
  the 3.2 I6 "Godzilla" rivals at 20 psi +0.32 / +0.21 s (that engine was
  over-rated past 15 psi); 2JZ-GTE rivals 0.10-0.14 s quicker; K20 rival
  +0.07. Accepted, goes into the career rebalance.
- qolsmoke, pkgsmoke, burnui: clean.

## Open questions (answered Nov 13, see Decisions)
1. Targets at ~80-90% of the records (recommended), or right at the records?
2. Fuel knock limits: methanol 80 / E85 40 / race gas 40 as above?
3. Trim the high engines (4A-G, S54, VQ35, 3800, V10 / V12) too, or only
   raise the low ones?
4. Cummins: raise its fuel ceiling now (race injectors / triple CP3 to
   ~2,000+ hp) or leave it for later?

## Test notes (for Claude)
Scripts (scratchpad scr/): `allmax.js` (every engine, best adder),
`fourmax.js` / `fourmax2.js` (4-cylinders, X env to override limits),
`bighp3.js` (ET builds), `gtrhold.js` (boost hold by rpm).
