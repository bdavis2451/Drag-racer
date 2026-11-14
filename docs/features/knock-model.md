# Knock model (how much boost an engine takes on a given fuel)

Status: **built and shipped (Nov 14).** All items approved (1-9, compression
on the spec; rivals move, rebalance later).
Decided (Nov 14): option **B** (engine-aware knock point + timing pulled
past it). BeamNG detail skipped (owner). Owner (Nov 14): triple-check the
17 psi pump-gas figure; doesn't it depend on the engine? Not keen on hard
cut-off numbers ("my old Jetta 1.8T pushed 22 psi on a K03 on 93").
Research real tuning and how BeamNG, Automation etc. model it.

## How the game does it today
- Each fuel has one number (`knock`): pump 17, E85 40, race gas 40,
  methanol 80 psi, for a 50 C charge.
- Adjusted by: pistons (low comp +3 psi, high comp -3), water-meth (+2/+3),
  charge temperature (-0.12 psi per C over 50), and factory-boosted engines
  get enough extra to run factory boost + 2 psi.
- Past the limit: each extra psi adds only 35% of its power, and engine
  risk climbs with the overshoot.
- **Result on 93 (scr/knock93.js):** nearly every factory turbo/blown car
  knocks at 16-17.5 psi (Evo 21), whatever its compression. A bolt-on turbo
  on a 10.5:1 NA engine also gets ~17.

| Car | Engine | Factory | Game knock limit on 93 | Real on 93 (tuned) |
|---|---|---|---|---|
| Supra | 2JZ-GTE 8.5:1 | 12 | 16.5 | 18-24 (HPA: start 15-16 at 9:1, climb) |
| Evo | 4G63 / 4B11 | 19 | 21 | 22-28 peak tapering to ~20 |
| R34 | RB26 8.5:1 | 12 | 16.5 | ~18-22 |
| GT-R | VR38 9.0:1 | 14 | 16 | ~20-22 |
| STI | EJ257 8.2:1 | 15 | 17 | ~18-20 |
| (bolt-on) | LS 10.5:1 | - | ~17 | 8-10 (kits), more with meth |

## Real world (sources below)
1. **There is no single number.** The safe boost depends on compression
   ratio, charge temperature, ignition timing, chamber/cam design, direct
   injection, mixture, rpm. "There is no definite number... engine design
   makes a massive difference" (HPA, Chris Wall).
2. **Rough sizes of each effect** (SAE 960497, Russ, octane requirement):
   ~1 octane number per degree of spark advance, ~1 per 7 C of intake air,
   ~3-4 per 10 kPa of boost (≈2.3 per psi; forum rule "2.33 octane per
   psi" agrees). So 1 psi ≈ 2.3 degrees of timing ≈ 16 C of charge.
3. **Effective compression** ≈ static CR x (boost ratio)^~0.5-0.7 (L&N and
   forum calculators); pump 93 tops out ~12-13:1 effective. Gives 8.5:1 ->
   ~18-22 psi, 9:1 -> ~15-18, 10.5:1 -> ~8-10. Matches reports.
4. **It's a soft limit.** Tuners raise boost and pull ~2 degrees per
   20 kPa (3 psi). Then the engine gets knock prone, timing has to fall off
   a cliff, and power **plateaus**: "going round in circles adding boost,
   retarding timing, making the same power with more heat and stress"
   (HPA, Andre Simon). 20 psi @ 7 deg = 300 kW; 22 psi @ 3 deg = still
   ~300 kW, more EGT, hotter water (HPA, Chris Wall). 25 vs 27 psi at max
   safe timing: identical power (HPA). On 98 RON the plateau is often
   ~22 psi; a 4G63 ~22, a 4B11 ~25, an 8.3:1 stroker 4G63 29 psi.
5. **Retarded timing = heat.** Very late timing raises exhaust temperature
   (burnt valves/turbine on long pulls), and the hotter exhaust spools the
   turbo harder (boost creeps up). Tuners stop around 2-4 deg BTDC on boost.
6. **Knock is worst at peak torque** (low rpm, high load: more time for the
   end gas to ignite); tuners bring timing back in as rpm rises. Real tunes
   spike boost in the midrange and taper (Evo X on 93: 28 psi at 3,500,
   19-20 at redline, 7 deg rising to 15; on E85 its best timing was 10-25,
   so on 93 it ran ~10 degrees short of best). K03 1.8T: ~22 psi peak,
   12-15 by redline (the small turbo running out too).
7. **Charge temperature** correction: ~0.25 deg per C over 40 C (HPA).
8. **Pump-gas power ceilings** come from fuel, not hardware: a 2JZ at 10:1
   is "an E85 or race gas engine"; 8.5-9:1 for big pump-gas power (HPA).

## Other games
- **Automation:** every engine gets an **octane requirement** (RON),
  computed from compression (biggest effect), mixture, timing, boost, bore,
  cam profile, exhaust restriction; forged pistons -1 RON. If it's above
  the fuel's rating, the engine knocks: lower power, worse economy,
  reliability (MTBF) falls, at worst it fails. Fixes: less compression,
  less timing, richer, more cam, less boost, better fuel system (official
  Engine Design Guide; community guide). Players find its octane vs
  compression too strict for older engines (forum).
- **BeamNG:** no octane or knock. Torque comes from the engine's curve times
  boost (turbo pressure by rpm, wastegate); damage comes from limits:
  over-torque rating, over-rev, and (with thermals on) head gasket,
  piston rings, rod bearings and cylinder wall temperature (wiki
  snippets via search). **Official docs not read yet: see question.**
- **Assetto Corsa:** a boost threshold per car plus a damage rate past it
  (`TURBO_BOOST_THRESHOLD`, `TURBO_DAMAGE_K`): a hard line with wear.
- **Car Mechanic Simulator:** ECU stages, no knock model.
- So: Automation models the cause (an octane requirement); BeamNG and AC
  model the consequence (damage past limits). None model the real
  "timing pulled, power plateaus, heat rises" curve.

## Options (draft, for the owner)
- **A. Engine-aware limit.** Each engine gets its real compression ratio
  (and direct injection where it has it). The pump-gas limit comes from
  compression, fuel, charge temperature and pistons, so a 2JZ-GTE lands
  ~20-22 psi, a 10.5:1 LS ~9, a Coyote ~10, a 4B11 ~25. Same soft knee.
- **B. A + a timing model (recommended).** Past the knock point the tune
  pulls timing instead of a fixed 35%: each extra psi adds less and less
  until power plateaus (about where real tuners stop), the exhaust gets
  hotter (turbo and valve wear, a little boost creep), and knock damage
  only comes with a hotter charge than the tune expected (a hot day, heat
  soak, back-to-back runs). Knock margin is smallest at peak torque and
  grows with rpm, so a midrange spike tapering up top is the fast tune,
  like real tunes. The tuner and dyno sheet show "timing pulled" and the
  plateau, so the player sees where the fuel runs out.
- **C. Full Automation-style:** an ignition timing table and octane number
  in the tune screen. Most realistic, most to learn; probably too much for
  a drag game on a phone.

Open: race fuels and methanol keep their own limits but through the same
model (their octane / cooling instead of fixed psi).

## Plan (option B, draft)
**1. Compression ratio per engine** (real factory numbers), shown on the
engine's spec. Examples: 2JZ-GTE 8.5, RB26 8.5, EJ257 8.2, 4G63 8.8,
Buick turbo 8.0, VR38 9.0, 2JZ-GE 10.0, LS1 10.1, LS3 10.7, Coyote 11.0,
S54 11.5, K20 11.0, small-block 350 ~9.0.

**2. Combustion design per engine** (a small bonus or penalty): modern
4-valve heads, small bores and direct injection tolerate more boost; old
2-valve big-bore open-chamber heads less. About -4 to +2 psi on 93.

**3. Knock point from all of it**, replacing the fixed number per fuel:
compression (about 3 psi per point on 93), design, fuel, charge
temperature (as now), pistons, water-meth (as now). Fuels get a rating
instead of a psi number. Rough 93-octane results with an intercooler:

| Engine | Comp | Today | New knock point |
|---|---|---|---|
| 2JZ-GTE / RB26 | 8.5 | 16.5 | ~20 |
| EJ257 | 8.2 | 17 | ~20 |
| 4G63 (Evo) | 8.8 | 21 | ~21 |
| VR38 | 9.0 | 16 | ~19 |
| 1.8T-style 9.5:1 4-valve | 9.5 | ~17 | ~17 (a 22 psi spike sits in the "timing pulled" zone) |
| 2JZ-GE turbo | 10.0 | ~17 | ~15 |
| LS1 / LS3 bolt-on | 10.1-10.7 | ~17 | ~12-13 |
| Coyote | 11.0 | ~17 | ~12 |
| Small-block 350 (old heads) | 9.0 | ~17 | ~13 |

E85 / race gas / methanol keep their agreed limits for a typical built
8.5:1 engine (~40 / 40 / 80 psi) and scale the same way with compression.

**4. Pistons set a real compression:** low-comp forged about -1.5 points
(about +4-5 psi on 93), high-comp +1 point (about -3 psi, +4% power).

**5. Past the knock point the tune pulls timing:** each extra psi adds less
power, fading to nothing about 6 psi past it (the plateau), and the
exhaust gets hotter (a little boost creep, more turbo wear). No sudden
cut-off. A hot day, heat soak or back-to-back runs lower the knock point,
so the same boost pulls more timing: slower, but safe.

**6. Past the plateau there's no timing left: real detonation.** Engine
damage risk climbs with how far past it you are (like today's risk past
the knock limit).

**7. Rpm:** the knock point is a little lower at peak torque and a little
higher up top (about ±2 psi), so a tune that tapers from the midrange is
quickest, like real tunes.

**8. Screens:** the Tune screen shows the knock point and where power
stops ("knocks past 20 psi, timing pulled to ~26, no more power past
that"); the dyno sheet marks where timing was pulled; fuel, piston and
help texts updated; the tuner stops at the plateau like a real tuner.

**9. Re-fit the race ceilings** (`bk`) so full record builds still land on
their targets under the new model.

**Left out:** ignition timing tables, octane boosters and fuel blends, a
knock-sensor part, a separate knock gauge.

**What it changes**
- Players: builds past their engine's new knock point change power (low
  compression engines gain room, high-compression ones lose some). Nobody's
  boost changes on its own.
- Rivals: the same, so some rival times move: folded into the career
  rebalance (already planned).
- Packages: their boost settings re-fit to the new knock points.
- Prices: unchanged.

## Build (Nov 14)
- **data.js:** every engine has `cr` (factory compression), `kd` (design,
  psi on pump gas: old 2-valve big-bore heads -3 to -5, LS -2, 997 TT DI +2)
  and `di`. Re-fit `bk` for the high-compression engines (K20 1.0, B18C
  1.03, F20C 1.23, S54 0.39, VQ35 0.34, LS7 1.08, 454 1.26, V12 0.33,
  4A-GE 20V 0.55, 2JZ-GE 0.79, 13B 0.75, Lima 0.73).
- **physics.js:** `engKnock(e, ref, crD)` = fuel rating (for 8.5:1) x
  (1 - 0.15 per point over 8.5) + design; `knockAt(S, iat, rpm)` adds the rpm
  effect (-10% at peak torque, +10% at redline); `boostUsed()` replaces the
  fixed 35%: past the knock point gain fades (x - x^2/2P, P = 30% of the
  knock point, min 4 psi), past the plateau it loses 0.3 psi of effect per
  psi. `S.knock` (mid-range), `S.knockLo/Hi`, `S.knockSpan`, `S.knockTop`,
  `S.cr`, `S.creepEgt` (up to +1 psi creep on a turbo in the pulled zone).
  Factory engines keep factory boost + 2 psi at peak torque (stock cars
  unchanged). Risk: tiny in the pulled zone, 0.08 per psi past the plateau.
  Dyno points carry `pull`. Also rounded the valvetrain / bottom-end rpm
  limits (the engine-ceilings change showed 7888.888 rpm).
- **parts.js:** pump gas rating 20 (for 8.5:1), E85 / race 40, methanol 80;
  pistons: low comp -1.5 points, high comp +1; texts.
- **screens.js / ui.js:** tune-screen boost help (compression, knock point,
  at peak torque / up top, where power stops), dyno: orange boost dots and
  KNK where timing is pulled + "TIMING PULLED" rpm range; engine row shows
  compression (and direct injection); help text.
- **tuner.js:** stops at knock point + 60% of the pulled zone - its margin
  (Supra 20-21.5 psi on 93, LS1 13.5-14.5, Coyote 12.5-14).
- **Not done as planned:** "more turbo wear": the game has no turbo wear
  part; the hot exhaust shows as boost creep plus a small engine risk.
  Boost by rpm isn't a setting (only by gear), so the rpm effect shows as a
  little midrange torque given up at high boost.

### Tests (Nov 14)
- 93-octane knock points (scr/knock93b.js): Supra 19.5, Evo 22.5 (20 at
  peak torque, 25 up top), STI 18.5, GT-R 17.5, Hellcat 15.
- Sweeps (scr/knsweep.js, 7685 + intercooler, 93): 2JZ-GTE peaks ~24 psi
  (516 hp); LS1 ~16 (684); Coyote ~16 (879); F20C ~14 (425).
- Stock benchmark vs last commit: identical (Evo 0.01).
- Race ceilings (calibk check): all 44 within 3% of target.
- Rivals vs engine-ceilings: 6 of 126 moved, all quicker, 0.01-0.07 s.
- Tuner (scr/kntuner.js), qolsmoke, pkgsmoke, burnui, tubest: clean;
  tune/dyno screens checked (scr/knui.js, kn_dyno.png).

## Sources
- HP Academy forum: "knock limited engine high boost low timing or vice
  versa" (Andre Simon, H24); "timing retard to combat knock" (Chris Wall,
  Andre Simon, kickerzx); "2jzgte 9.0:1 safe boost pump gas"; "3.0L 2JZ
  892 whp on 93" (Andre Simon, KGPerformance); "boost in mid range on pump
  gas" (Evo X 93 log). Downloaded Nov 14 (scratchpad web/p1-p4, p12).
- SAE 960497 (Russ), a review of engine operating conditions on knock
  (via search abstract).
- Automation Engine Design Guide (Steam manual PDF, sec. 2.8.3, 3.2.1);
  Automation forum: engine design guide, compression vs octane, compression
  and timing study (scratchpad web/p5-p7, p11).
- L&N Engineering, effective compression ratio (search summary; site
  blocks automated readers).
- BeamNG wiki (search snippets), Assetto Corsa engine.ini (GTPlanet forum),
  Car Mechanic Simulator guide.
- Forums on 1.8T K03 (Audizine/AudiWorld), Evo (DSMtuners), LS (LS1Tech),
  2JZ (ClubLexus): via search summaries.
