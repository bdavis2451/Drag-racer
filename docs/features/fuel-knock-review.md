# Tuner vs knock, and boost limits on E85 / race gas / methanol

Status: **Nov 15: owner picked C (if B's risk is realistic) and G, and asked
to take air temperature out of engine performance. Plan approved with both
questions answered. Built and shipped Nov 15.**

Owner (Nov 15, 1 AM, screenshot): "I used a pro tuner, on edge tuning: 8%
engine risk, 7% chassis risk. I don't think it saw that it was pulling
timing over 28 psi because of the fuel it was on. See what we can do. Also,
are our boost limits for methanol, E85, race fuel accurate? Deep dive like
we did on pump gas."

The tester's car: 5.7 LS1 (10.1:1), 8891 turbo, E85, 1,448 hp, Street tune
at 32.5 psi (23 psi in 1st). Tune screen: knocks past 28 psi (25.5 at peak
torque, 31 up top), power stops climbing at 36.5. Chassis risk 7% = power
107% of what the roll cage takes (a separate, correct warning: tube chassis).

## Decisions (owner, Nov 15 morning)
- **Air temperature stops touching the engine.** "Having my engine risk
  increase because it's night over day is a little too much." Air
  temperature keeps changing track grip (track temperature), but no longer
  power, the knock point or engine risk.
- **Part 1: option C**, "as long as the B part is realistic. I want to keep
  our risks real if people want to push peak power. There is a reason big
  power cars are rebuilt so often."
- **Part 2: option G** (E + F).
- **Engine part wear** goes on the backlog (rods stretch, things wear), to
  be done well and not annoyingly.

## Plan (approved Nov 15)

### 1. Air temperature out of engine performance
- `physics.js`: `DR.airPower` gone (night no longer adds power, day no
  longer takes it); `DR.knockDT` drops the air part, so the knock point and
  where power stops are the same day or night. Track temperature (grip,
  tire heat) unchanged.
- `race.js rollFailure`: no hot-day knock risk. Race intro: no "hot charge
  / cool air: knocks past ~X psi today" note (the nitrous note stays).
- Texts: help (Conditions: "Night air is cooler and denser" goes), the
  night test-and-tune line ("cooler air, a colder track" -> "a colder
  track"), code comments.
- Heat soak between rounds (the engine's own heat, not the weather): see
  question 2.
- Rivals: in a race their car no longer gains a little at night / loses a
  little by day. Their listed times (no conditions) don't change: the rival
  snapshot stays identical.

### 2. Knock zone risk (the realistic B)
Research (below): at the knock point, a knock-controlled tune is safe; the
cost of pulling timing is heat, and it climbs fast as the timing gets very
retarded (HPA: exhaust valves melt when timing falls toward single digits
on boost; "the knock feedback doesn't have much ability to help" when the
timing is already soft). So the risk is near zero just past the knock point
and steep near where power stops. Proposed curve, by how far into the zone
(z = 0 at the knock point, 1 where power stops): **3% x z^2** per pass.
| Into the zone | Risk now | Proposed |
|---|---|---|
| 0 (knock point) | 0 | 0 |
| 1/3 | 4% (here) | 0.3% |
| 60% (tuner's edge) | 7.5% | 1.1% |
| 100% (peak power) | 10% | 3% |
| past it (detonating) | +8% per psi | unchanged |
Sitting at peak power: about 1 pass in 33 breaks it. Pro Mod engines are
freshened about every 20 runs to keep that from happening (forum reports;
Cleetus: rods every ~20 runs on his Hemi), which is what engine wear will
model later.

### 3. Tuner by aggression (C)
- `tuner.js limits()`: boost stops at knock point + f x zone - green-tuner
  margin ((1 - skill) x 1.5): Safe f = 0, Balanced f = 1/3, On the edge f =
  0.6. The fixed aggression psi margin no longer applies to knock (it still
  does to the diesel head gasket).
- Its note: "stopped at 28 psi: past it the tune pulls timing" (Safe), or
  "ran 2 psi past the knock point (28 psi): timing pulled, about 1% engine
  risk per pass" (Balanced / Edge). The wrong "wasn't buying power any
  more" goes.
- Packages unchanged (still knock - 1).

### 4. Fuels (G)
- `engKnock`: the head design penalty `kd` stays in pump-gas psi (not
  multiplied by the fuel); compression uses the more generous of the
  current straight line and effective compression (CR x boost
  ratio^0.7 against the fuel's limit at 8.5:1). Pump gas and E85 at normal
  compression stay where they are; methanol and E85 at 12:1+ get more room.
- Re-check against the real numbers in the table above.
- Rivals on alcohol and race gas with high compression or old heads gain
  boost room (their times move: noted for the career rebalance). Packages
  re-fit (they stop at knock - 1).

### Saves
Nothing stored changes. A saved tune keeps its boost; its risk shows the new
numbers.

### Questions answered (owner, Nov 15)
1. Zone risk curve: **3% at peak power, rising with the square.**
2. Heat soak between rounds: **keep it** (only the outside air leaves
   engine performance; the race intro calls it "heat-soaked").

### Added while building (owner OK'd, Nov 15)
- **No gain, no boost past the knock point.** Testing showed a turbo out of
  breath (LS1 package turbo from ~26 psi) still got pushed into the zone on
  Balanced / On the edge: risk for no power. Asked; owner: yes. Past the
  knock point a boost step has to add ~0.4% power per psi or the tuner
  goes back ("No gain past the knock point: the turbo is out of breath,
  more boost only adds heat").

## Build notes (Nov 15)
- `physics.js`: `DR.airPower` removed (Sim `airK` = 1, heat soak still
  scales it); `DR.knockDT` heat soak only; `engKnock` (G: max of the
  straight line and effective compression above 8.5:1, kd in psi on any
  fuel); `riskOf` zone 3% x z^2 (z = (boost up top - knock) / (power stops -
  knock)). Comments on night and carb jetting updated.
- `race.js`: hot-day knock gone from `rollFailure` (heat soak stays); intro
  note "heat-soaked: knocks past ~X psi this round" / nitrous note.
- `tuner.js`: `TU.AGG[].kz` (0, 1/3, 0.6); `limits().knock` on boost up top
  with the green-tuner margin only; the no-gain rule in the boost search;
  `why()` names the aggression; `riskLine()` in the notes.
- Texts: help Conditions (night), knock help (risk, tuner aggression),
  carb help (no weather drift), factory carb desc, Tune screen boost help,
  night test-and-tune line.
- Tested:
  - Rival snapshot: 126 times, 0 diffs (listed rival times use no
    conditions; in a race their car loses the day/night power change too).
  - Packages: 1,440, 0 diffs.
  - Knock table, every engine x fuel x pistons: 263 of 552 changed, pump
    gas none. E85 / race gas: +1 to +4 psi on old heads, -2 on the one
    kd +2 engine (f6_38tt). Methanol up to +13.5 (454).
  - Real-world table re-run (above, now): 454 11.25 meth 46.5 (real
    50-60), 12.25 meth 39 (Bothwell 38), Hemi 11.25 meth 48.5 (Oksas 46),
    2JZ E85 unchanged, LS1 E85 30.
  - Tuner bench (`scr/kt1.js`), local and pro: pump LS1 Safe 14.5 /
    Balanced 16 / Edge 16.5 (knock 15; 0 / 0.1 / 0.6%); 2JZ E85 41.5 / 45 /
    48.5 (knock 42; 0 / 0.2 / 0.9%); LS1 E85 on the package turbo stops at
    30 (no gain past it).
  - Day vs night, NA Fox: 14.475 day, 14.512 night (cold track only).
  - qolsmoke, c2, drv, tubest, pkgsmoke: no errors. Crawl mid: 0 problems
    except the known Settings sound check line.

## Part 1: why the tuner left 32.5 psi

**It did see the knock point; it goes into the pulled zone on purpose.**
`tuner.js limits()`: a tuner stops at knock point + 60% of the pulled zone
minus its margin (Safe 2 psi, Balanced 1, On the edge 0.3, + up to 1.5 for
a green tuner). Here: 28 + 0.6 x 8.5 - 0.45 = 32.65 -> 32.5 psi.

**And the pulled zone carries engine risk:** `physics.js riskOf`: 1.5% per
psi past the knock point (max 10%), counted on the boost it really sees up
top (32.5 + 0.5 creep = 33 -> 7.5%). So the "8%" is almost all the zone.

**What it bought** (bench, same engine and fuel, bigger turbo so knock is
the only limit, `scr/kb4.js`):

| Boost | Peak hp | Engine risk / run |
|---|---|---|
| 28 (knock point) | 1,850 | 0 |
| 30 | 1,939 | 3.0% |
| 31 | 1,997 | 5.3% |
| 32.5 (tuner, edge) | ~2,055 | 7.5% |
| 34 | 2,100 | 9.8% |
| 36.5 (power stops) | 2,100 | 10% + detonation |

About +11% power for 7.5% risk of breaking the engine on every pass (a race
day of 4-5 rounds: ~30% chance it breaks). On a hot day the race adds more
on top (`race.js rollFailure` moves the knock point with the weather).

**Every aggression goes in:** Safe stops ~3 psi into the zone (~4.5% risk
here, ~3% on a Supra on 93), Balanced ~4 psi (~6%), On the edge ~4.5 psi
(7.5%). Power packages stop at knock point - 1 psi (no risk), so a package
is safer than a "Safe" tuner. The tuner's note also says "the extra boost
wasn't buying power any more", which isn't true at 60% of the zone (each psi
still adds ~40%).

**Real world:** running knock-limited timing (the knock point here) is
normal and safe on a good tune: the ECU retards timing, the cost is heat
(EGT), and power plateaus (HPA, knock-model.md). The danger is a knock
event at very high specific output: "you don't get to live through a knock
event at very high specific power levels... being conservative, creeping up
on the tune and generally, unless you're fighting for world records,
leaving a little power on the table to keep the engine alive" (HPA
methanol webinar). So: a careful tuner stops near the knock point; only a
record attempt leans past it.

### Options (Part 1)
- **A. Tuner stops by aggression** (risk formula unchanged): Safe 1 psi
  under the knock point (0 risk), Balanced at the knock point (0), On the
  edge ~25% into the zone (~2 psi, ~3%). The note says what timing was
  pulled and what it bought.
- **B. Smaller zone risk** (tuner unchanged): knock control makes the zone
  safe on the day it was tuned; risk comes from heat (already modelled on
  hot days). Zone risk max ~2-3% at the plateau instead of 10%: On the edge
  ~1.5%.
- **C. Both (recommended):** Safe at the knock point (0%), Balanced ~1/3
  into the zone (~1%), On the edge ~60% (as now, ~2%); the zone risk shrinks
  as in B, the hot-day risk stays; the tuner's last note states the engine
  risk it leaves ("leaves it at 2% per run: timing pulled past 28 psi").
- **D. Leave it**, but fix the note's wording and show the risk in the
  tuner's summary.
- Rivals unchanged either way (they don't roll failures; their boost
  doesn't change). Packages unchanged.

## Part 2: are the fuel boost limits right?

### How the game does it
Fuel rating (psi on an 8.5:1 engine, cool charge): pump 20, E85 40, race
gas 116 40, methanol 80. Minus 15% of the rating per point of compression
over 8.5; plus the head design `kd` (psi on pump gas, scaled by the fuel:
x2 on E85, x4 on methanol); cool charge up to +2 psi; -10% at peak torque,
+10% at redline. E85 cools the charge 15 C, methanol 35 C.

### Real world vs the game (`scr/kf1.js`, 8891 turbo + big intercooler)
| Engine, fuel | Game knock / power stops | Real |
|---|---|---|
| 2JZ-GTE 8.5:1, E85 | 42 / 54.5 | 33 psi on a stock motor (766 whp); built E85 2JZs run 40-45 |
| 9.0:1 (VR38), E85 | 39 / 50.5 | "38 psi on a 9:1 motor without detonation on E85"; "low 20s on 93, 40 on E85" at 9:1 |
| LS1 10.1:1, E85 | 28 / 36.5 | "10:1 with 20 psi on E85, no issue"; twin-turbo 6.0 LS drag map 24 psi, "pure E85 more than enough" (HPA) |
| LS1 10.1:1, race gas | 28 / 36.5 | E85 "performs as well as race fuels with MON 116+" (HPA); C16 is MON 116 for boosted engines |
| K20 / Coyote 11:1, E85 | 27 / 35 | K24 11:1: ~15-20 psi with stock fuel (fuel-limited, not knock) |
| 2JZ-GTE + high-comp pistons (9.5:1), methanol | 70 / 91 | Grannas Supra: 2JZ, 10:1, methanol, **70 psi, 2,100 whp** (record H-pattern car) |
| Hemi 10.25:1 / 11.25:1, methanol | 53 / 41 | Oksas Pro Mod Hemi 11:1, methanol, **46 psi** |
| 454 big block 11.25:1, methanol | **33** / 43 | blown alcohol drag engines 10-12:1 run **50-60 psi** (Drag News) |
| 454 + high-comp (12.25:1), methanol | **21** / 27.5 | Bothwell Pro Mod 12.5:1, methanol twin turbo, **38 psi** so far |
| Billet Pro Mod 9:1, methanol | 76 / 99 | (turbos run out first) |

### Verdict
- **E85: about right.** 9:1 at 39 matches real reports almost exactly; 2JZ
  and LS land where real tunes run, with the knock point a little above
  what careful tuners use.
- **Race gas 116: about right.** Same rating as E85 without the cooling,
  which matches HPA (E85 ~ 116 MON race fuel) and VP (C16 = MON 116, made for
  boost, compression up to 17:1). One nuance not modelled: C16 shrugs off a
  hot, non-intercooled charge (low vapor pressure; VP).
- **Methanol: right on low/medium compression (8.5-11:1), too strict on
  high compression and older heads.** Two causes:
  1. The head design penalty is multiplied by the fuel (x4 on methanol): a
     454's -4 psi on pump gas becomes -16 psi on methanol.
  2. The compression penalty is a straight line (15% of the rating per
     point). Effective-compression math (CR x boost ratio^0.7, the way the
     pump-gas research worked) gives the same numbers up to ~11:1, but more
     at 12-12.5:1: about 40 psi on methanol where the game says 32 (before
     the head penalty). Matches Bothwell's 38.
- Pump 93 was settled in the Nov 14 deep dive (unchanged).

### Options (Part 2)
- **E. Head penalty stays in pump-gas psi** (not multiplied by the fuel):
  454 on methanol 33 -> ~45 psi, 12.25:1 -> ~33. Small change for E85
  (LS1 28 -> ~30).
- **F. Compression by effective compression** (boost ratio^0.7) instead of
  the straight line: same as now up to ~11:1, more room at 12:1+ on
  alcohol (12.5:1 methanol ~40).
- **G. Both E + F** (recommended if we touch it): methanol big blocks land
  in the real 40-55 psi range, E85 and pump gas barely move.
- **H. Leave the fuels** (they're right where most builds live).
- Effect: rivals on methanol with high-compression or old-head engines
  would gain knock room (their times move: into the career rebalance);
  packages re-fit (they stop at knock - 1).

## Sources
- Zone risk (Nov 15 morning): HPA forum "timing retard to combat knock"
  (retarded timing = high EGT, melting exhaust valves near single-digit
  timing), "knock limited engine: high boost low timing or vice versa"
  (2-3 degrees back from the knock threshold; knock feedback can't help
  much when timing is already soft); "083 understanding knock". Rebuild
  intervals: SlashGear on Proline Hemis (Cleetus: rods every ~20 runs),
  offshoreonly "racing engines: what breaks most often" (Pro Mod ~20 runs).
  No published per-run failure rate found.
- HPA "How much more power can you make on E85?" (Andre Simon): E85 ~105
  octane, "performs as well as specifically blended race fuels with motor
  octane ratings of 116+", 35-40% more fuel, latent heat, FA20 12.5:1 test.
- HPA webinar 240 "Methanol tuning considerations": methanol ~107-108
  octane, latent heat ~1,100 vs 300 kJ/kg, "100 plus psi easily run on
  methanol", 4G63 methanol drag engine (47 psi early), twin-turbo 6.0 LS
  on E85 24 psi drag map; conservative tuning at high specific output.
- Drag News "Masters of methanol": blown alcohol 10-12:1, 50-60 psi, PSI
  C-rotor 60+.
- DSport "Grannas Racing's 2,100 whp Toyota Supra" spec sheet: 2JZ, 10:1,
  M1 methanol, 70 psi.
- EngineLabs "Inside Scott Oksas' twin-turbo Pro Mod engine": BAE Hemi
  11:1, methanol, 46 psi. EngineLabs "Pro Mod engine: from screw blower to
  twin turbos": 12.5:1, methanol, 38 psi so far.
- RaceCar Book "Turbocharged methanol info": Larson 620 ci, 40 psi, 3,000+
  hp on methanol.
- VP Racing C16 product page: MON 116, RON >120, for turbo/supercharged/
  nitrous, compression up to 17:1. Dragzine "How to pick the right racing
  fuel" (VP: Q16 MON 116 oxygenated, MS109 up to 25 psi boost) and "The
  story of 16" (C16 for non-intercooled boost).
- Forums (anecdotal): eng-tips E85 compression rule of thumb; ls1tech
  "compression ratio, boost and E85" (10:1, 20 psi E85); miataturbo
  (9:1: low 20s on 93, 40 on E85; 38 psi on 9:1); clublexus 2JZ (33 psi
  E85, 766 whp); speed-talk methanol/compression threads; yellowbullet
  (methanol 10.5-10.7:1); rennlist / threepiece K24.
- Downloaded with plain curl (the fetch tool can't reach hpacademy.com,
  dragzine.com); text saved in the session scratchpad `dl/`.
