# AWD & FWD traction (to revisit)

Status: **parked: test results only, no changes yet.** Owner (Nov 11): make
this its own update, run 1,500 / 2,000 hp AWD and FWD and a 3,000 hp AWD
truck, and keep the results here.

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
