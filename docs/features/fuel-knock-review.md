# Tuner vs knock, and boost limits on E85 / race gas / methanol

Status: **Nov 15 (night): investigated and researched. No code. Options for
the owner below.**

Owner (Nov 15, 1 AM, screenshot): "I used a pro tuner, on edge tuning: 8%
engine risk, 7% chassis risk. I don't think it saw that it was pulling
timing over 28 psi because of the fuel it was on. See what we can do. Also,
are our boost limits for methanol, E85, race fuel accurate? Deep dive like
we did on pump gas."

The tester's car: 5.7 LS1 (10.1:1), 8891 turbo, E85, 1,448 hp, Street tune
at 32.5 psi (23 psi in 1st). Tune screen: knocks past 28 psi (25.5 at peak
torque, 31 up top), power stops climbing at 36.5. Chassis risk 7% = power
107% of what the roll cage takes (a separate, correct warning: tube chassis).

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
