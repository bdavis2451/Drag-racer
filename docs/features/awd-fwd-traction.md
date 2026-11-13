# AWD & FWD traction (to revisit)

Status: **parked: test results only, no changes yet.** Owner (Nov 11): make
this its own update, run 1,500 / 2,000 hp AWD and FWD and a 3,000 hp AWD
truck, and keep the results here.

## Update (Nov 12)
- **AWD burnouts shipped** (not traction): AWD cars now do one quick hit
  in the water box (rev on the 2-step, launch with all four spinning for
  about a second, brake, pull up or back up to the line). Code: race.js
  `awdHit` / `endHit`.
- **The turbo rework changed the 4-cylinder numbers below:** spool comes from
  physics now and the lineup is new (6266 ... 9498). The FWD/AWD tests need a
  re-run before this update starts; the "4-cylinders top out" finding may
  have moved.
- FWD traction itself is still untouched (the main open problem here).

## The short version
- **AWD is close to real at every power level**, up to 2,000 hp. The 3,000 hp
  AWD truck is believable too.
- **FWD is the problem.** Past about 450 hp, more power doesn't make it quicker.
  At 1,430 hp a FWD Civic runs **9.8**; the real FWD record (about 1,850 hp) is
  about **7.6 @ 200**. Launches (60 ft) are 1.85-2.1 when they should be about 1.3-1.5,
  with the tires spinning for about a second. Traction control and a lower launch rpm
  make it worse, and boost by gear did nothing in the test.
- **4-cylinders top out around 800-1,400 hp.** The Evo's 4G63 maxed at 788 hp
  (the Huge 88mm turbo caps at 50 psi; the Pro Mod turbos spool past where a
  4-cylinder revs). A K20 at 9,500 rpm reached 1,430. Real 4-cylinders make
  1,500-2,000 hp at 10,000+ rpm on 60-70 psi. A big turbo that suits small,
  high-revving engines may be missing.
- **Front runners on AWD/FWD** (see `playtest-nov.md` 5): skinny runners give
  AWD cars about 0.05 s for free, and on FWD the weight comes off the wrong end.
  Parked with the wheels and tires rework (`wheels-tires.md`).

## Re-run after the turbo rework (Nov 12)
Same method (good driver, prepped strip, median of 5, launch rpm swept, race
parts, methanol, sequential box, 36x17 slicks). With the new turbos.

| Build | Power | Weight | 60 ft | 1/8 | ET | Nov 11 | Real-world check |
|---|---|---|---|---|---|---|---|
| GT-R AWD, 8891 single* | 993 | 3,582 | 1.62 | 6.08 | 9.23 @ 158 | | 1,000 hp GT-R ~8.6-9.0 (a bit slow) |
| GT-R AWD, 8891 single* | 1,497 | 3,582 | 1.36 | 5.18 | 7.91 @ 181 | 7.91 | 7.4-7.8 ✓ (a touch slow) |
| GT-R AWD, 8891 single* | 1,748 (its max) | 3,582 | 1.28 | 4.92 | 7.53 @ 191 | | ~1,750 hp: 7.2-7.4 (~0.2 slow) |
| GT-R AWD, twin 7685 | 1,480 | 3,683 | 1.45 | 5.44 | 8.28 @ 175 | | slower than the single: laggy at this power |
| Evo AWD (4G63), 8891 | 935 | 3,094 | 1.41 | 5.61 | 8.68 @ 161 | 10.56 (788 hp) | much better; capped below 1,000 by revs |
| Civic AWD conv (K20), 8891 | 1,004 | 2,316 | 1.35 | 5.18 | 7.95 @ 179 | | |
| Civic AWD conv (K20), 8891 | 1,446 | 2,316 | 1.15 | 4.51 | 6.97 @ 202 | 7.56 | real 1,500 hp AWD Civic 7.45; the power-to-weight math says ~6.9 |
| Civic FWD (K20), 8891 | 1,004 | 2,150 | 1.59 | 5.93 | 8.70 @ 181 | | |
| Civic FWD (K20), 9498 | 1,491 | 2,175 | **1.73** | 6.13 | **8.82 @ 192** | 9.78 | FWD record ~7.6 @ 200, 60 ft ~1.3-1.5 ✗ |
| Integra FWD (K20), 9498 | 1,491 | 2,560 | **1.70** | 6.05 | **8.76 @ 188** | 10.06 | ✗ |
| Lightning AWD swap (3,051 hp) | 3,051 | 4,640 | 1.03 | 4.44 | 6.93 @ 199 | 6.92 | unchanged ✓ |
| Lightning RWD (same) | 3,051 | 4,441 | 1.04 | 4.38 | 6.81 @ 204 | 6.82 | unchanged ✓ |

*With a fix found in this re-run (shipped Nov 13):
the turbo rework charges a single turbo on a V engine ~34% of its exhaust
energy for the long crossover pipes at all flows, so a big single on a V6/V8
couldn't hold boost up top (GT-R + 8891 held 30-35 psi at 8,000 rpm, 1,340
hp; before the rework 1,966). The fix keeps the loss at low flow (spool) and
recovers most of it flat out: the GT-R single holds 50 psi from ~6,000 and
makes its turbo's 1,750 hp; V8 spool moves only 100-200 rpm earlier (still
inside the real ranges).

**Findings**
- **FWD is still the problem**, better than Nov 11 (8.8 vs 9.8 at ~1,450-1,500
  hp) but 60 ft 1.70-1.73 with the tires spinning about a second. Real: 1.3-1.5.
- **AWD:** close to real up to ~1,500 hp. The light AWD Civic is now on the
  power-to-weight line (6.97); real ones are ~0.4-0.5 slower (traction, aero).
  The GT-R is a touch slow at 1,750.
- **Big twins on the VR38** (twin 7685) are slower than the big single at
  the same power: lag at 45 psi.

## 4-cylinder power ceiling (Nov 12)
Full race build (all race breathing parts, billet bottom end, methanol,
the biggest fuel system, race ignition, race valvetrain, twin-scroll or
equal-length manifold, max revs), every turbo at its max boost:

| Engine | Best | Turbo / boost | Peak rpm | What stops it |
|---|---|---|---|---|
| F20C (2.0 high-rev) | **1,618 hp** | 9498 @ 55 psi | 9,400 | turbo limit (55 psi) and methanol's knock limit (~52 psi) |
| K20 (2.0) | **1,599 hp** | 9498 @ 55 psi | 9,100 | same |
| 13B rotary | **1,584 hp** | 9498 @ 55 psi | 9,200 | same |
| B18C (1.8) | **1,364 hp** | 9498 @ 55 psi | 9,400 | same |
| EJ257 (2.5 boxer) | **1,173 hp** | 9498 @ 55 psi | 7,500 | revs (~8,900) and its breathing |
| 4G63 (2.0) | **1,038 hp** | 9498 @ 55 psi | 8,800 | revs (~8,900) and its breathing |
| SR20-class (2.0) | **971 hp** | 9498 @ 55 psi | 8,700 | revs and breathing |

Experiment: raising the 8891 / 9498 to 65 / 70 psi (real billet race
compressors do 60-70) adds ~100 hp: K20 1,694, F20C 1,714, 13B 1,679, EJ
1,242, 4G63 1,131. Past that methanol's knock limit (~52 psi) and the
engines' breathing are the walls. Real: the best 2.0-2.4 4-cylinder drag
engines make ~1,500-2,000 hp at 10,000+ rpm on 60-70 psi of methanol.
Test scripts: scratchpad scr/fourmax.js, fourmax2.js, bighp3.js, gtrhold.js.

## Results (Nov 11)
Good driver, prepped strip, median of 5, launch rpm swept for each build's
best. Builds: race parts all round, methanol, the biggest injectors and pump,
billet bottom end, sequential gearbox (FWD/AWD) or a Pro Mod TH400 with a
lockup converter and transbrake (the truck), and 36x17 Pro slicks.

| Build | Power | Weight | 60 ft | 1/8 | ET | Real-world check |
|---|---|---|---|---|---|---|
| GT-R AWD (VR38) | 1,497 | 3,582 | 1.36 | 5.18 | 7.91 @ 181 | 1,500 hp GT-Rs: 7.4-7.8 @ 180-190 ✓ (a touch slow) |
| GT-R AWD (VR38) | 1,966 | 3,582 | 1.24 | 4.85 | 7.39 @ 196 | ~2,000 hp GT-Rs: 6.9-7.1 @ 195-200 (~0.3 slow) |
| Civic AWD conversion (K20) | 1,430 | 2,316 | 1.25 | 4.93 | 7.56 @ 189 | AWD Civic 1,500 hp: 7.45 ✓ |
| Evo AWD (4G63) | 788 (its max) | 3,094 | 1.72 | 6.91 | 10.56 @ 137 | couldn't reach 1,500 (see above) |
| Civic FWD (K20) | 1,430 | 2,150 | **1.86** | 6.98 | **9.78 @ 184** | FWD record: ~7.6 @ 200, 60 ft ~1.3-1.5 ✗ |
| Integra FWD (K20) | 1,430 | 2,535 | **1.93** | 7.21 | **10.06 @ 181** | ✗ same |
| Lightning, AWD swap (8.6 billet V8, Pro Mod turbos) | 3,051 | 4,552 | 1.03 | 4.43 | 6.92 @ 200 | believable: power-to-weight math says ~6.7 @ 205 |
| Lightning, RWD (same build) | 3,051 | 4,353 | 1.05 | 4.40 | 6.82 @ 205 | the AWD swap adds 200 lb and some driveline loss |

2,000 hp FWD and AWD 4-cylinders couldn't be built (the power ceiling above).

Earlier runs (lower power, Nov 11): `playtest-nov.md` section 5.

## What to look at when we pick this up
1. **FWD launch:** why the front tires spin for about a second at high power,
   and why traction control and boost by gear don't help. Check weight transfer
   off the front, the drive load used for FWD grip, and how traction control acts on a FWD car.
2. **The 4-cylinder ceiling:** a turbo for small high-revving engines
   (around a 76-80 mm compressor good for 70 psi), or higher rpm limits with the
   billet parts.
3. **AWD at 2,000 hp is about 0.3 s slow;** check the AWD driveline loss and the
   shift times at that power.
4. **The Evo** (stock about 0.4 s slow; its 60 ft gets worse on drag radials).

## Test notes (for Claude)
`scr/bighp.js` (1,500/2,000 hp builds with a launch rpm sweep; `big(car,
layout, hp, turbo, trans, engine)` finds the boost for the target power),
`scr/bighp_l.js` (the 3,000 hp Lightning with a race converter and
transbrake), `scr/awdfwd.js`, `scr/fwdtc.js`. Note: the tier 3 drive
package converts FWD cars to RWD (layout rwd), so the FWD tests skip it.
"Spin to 60ft" = time with the slip past 2x the tire's peak slip.
