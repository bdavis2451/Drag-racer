# AWD & FWD traction (to revisit)

Status: **Nov 14: AWD tire package fix shipped (80a8224). FWD build shipped
(items 1-7 + front ballast). Open: the remaining ~1 s gap to real 7-second
FWD cars (grip ceiling), question to the owner.** Owner (Nov 11):
make this its own update, run 1,500 / 2,000 hp AWD and FWD and a 3,000 hp AWD
truck, and keep the results here. Owner (Nov 14): start the FWD research,
recheck AWD (FWD/AWD only, not the whole W&T work), keep weight in mind and
audit the weight system.

## Nov 14 recheck (after wheels & tires)

### Bench (good driver, prepped, median of 5, launch rpm swept, race parts,
methanol, sequential, 2-step + anti-lag, real fitment per car)
| Build | 60 ft | ET | Before W&T (Nov 12) |
|---|---|---|---|
| FWD Civic K20 1,000 hp (24.5x8 slick, the biggest the wells take) | 2.10 | 11.16 @ 142 | 8.70 (36x17 slick) |
| FWD Civic K20 1,500 hp, same | 2.02 | 10.93 @ 143 | 8.82 |
| same, tune optimised (launch, boost by gear, TC, clutch) | 1.99 | 10.26 @ 163 | |
| AWD Civic 1,500 hp (31x13 rear, 24.5x8 front) | 1.20 | 7.22 @ 201 | 6.97 |
| Evo 1,500 hp | 1.26 | 7.69 @ 186 | |
| GT-R 1,500 hp | 1.31 | 7.86 @ 181 | 7.91 |
Real: FWD 1,500 hp Civic 7.80 @ 188 (Aleman, SFWD); AWD 1,500 hp Civic
7.45 @ 186 (P-Racing) (Autopian, f41). AWD stays close; FWD fell ~1.5 s
because the W&T rework made the front wells the limit (right for stock
fenders, but there is no way to fit a bigger front tire).

### Why FWD is slow (traces, scr/fa3-fa6.js)
1. **Grip ceiling.** Accel sits at mu x front load: 2.0 x ~0.44 = ~0.85 g the
   whole of 1st. The 24.5x8 slick is the biggest that fits; real 7-second FWD
   cars run widened one-piece front ends and bigger slicks (DSport f40:
   "widened one-piece front ends on most front-wheel-drive drag cars";
   Honda-Tech/DSMTuners: 24.5 to ~400-500 whp, 26 in past ~600 whp with
   fender work).
2. **Front weight goes the wrong way.** Every drag package moves the battery
   to the trunk (also on FWD): -1.2 to -2.1 points front. Race-built FWD cars
   end at f 0.60 (stock 0.62). Real FWD racers do the opposite: weight
   forward, "light as possible behind the drive wheels" (DSport f40; se-r.net
   f31).
3. **Weight transfer.** FWD cars use the wheelie bar to limit transfer off the
   front (DSport f40: "perfecting the wheelie bar to limit weight
   transfer"). In the game the bar only acts in a wheelie, so it does nothing
   on FWD (and packages skip it there).
4. **The hit.** At the launch the fronts flash-spin (slip 4-9x), traction
   control pulls them back, the clutch locks at road speed and the engine
   drops to ~1,500-2,500 rpm: off boost for ~0.5 s. Real FWD cars slip a
   slider clutch through this and stay on boost.
5. Boost by gear works (an earlier test passed a bad value); it helps little
   while 1-4 dominate.

Lever sizes (1,500 hp FWD Civic, tune optimised each time):
| Change | 60 ft | ET |
|---|---|---|
| now | 1.99 | 10.26 @ 163 |
| front slick grip 2.4 (26x10-class) | 1.91 | 9.73 @ 171 |
| + front weight +6 pts | 1.82 | 9.35 @ 177 |
| grip 2.6 + front weight +8 pts | 1.77 | 9.04 @ 185 |
| + bar limiting transfer (x0.6) | 1.67 | 8.61 @ 191 |
| grip 2.8 + weight + bar | 1.62 | 8.41 @ 195 |
The rest of the gap to ~7.8 is the hit (4).

### AWD
- **Bug (from W&T):** the tire packages fit only the rear axle; on AWD the
  factory fronts lower the grip, so Sport/Race/Extreme tires make AWD cars
  slower than stock: Evo 13.81 -> 13.92, STI 13.41 -> 13.46, R34 13.32 ->
  13.48, GT-R 10.94 -> 10.96, 911 10.67 -> 10.69, Ram 16.04 -> 16.10.
- The 3,000 hp Lightning reading (8.18) was my bench missing the converter
  and transbrake; with them it is unchanged (6.9).
- AWD grip uses the whole car's weight, so weight transfer doesn't matter;
  real centre diffs can spin the fronts first. Results are close to real, so
  left alone.

### Weight audit
- Curb weights (they include ~80 kg driver) match the real cars within ~3%:
  EG Civic, Neon R/T, Integra R, GTI, Cobalt SS, Evo IX, STI, R34, R35,
  997 Turbo, SVJ, Ram 2500 all checked.
- Weight reduction takes the same share off the front and the rear chassis,
  so the balance barely moves (+0.2 to +1.0 pt front). Real FWD builds strip
  the back half.
- Trunk battery: -1.2 to -2.1 pts front on FWD; its text says "over the drive
  wheels" (wrong on FWD). Packages fit it on every car.
- Mass enters launch grip only through the load (mu x N), so lighter = same g
  at the hit and quicker everywhere else; no other weight bugs found.

### Plan (approved Nov 14)
Owner's picks: all four FWD items; battery: hide the trunk options on FWD
and **also add a Front Ballast part**; AWD fix ships now on its own; the
Race drive package keeps FWD cars FWD (RWD conversion stays a separate
shop choice).

FWD (players only; rivals keep their snapshot):
1. **Front wheel wells for FWD**, in the slot where the rear tubs are
   (Suspension), shown as "Front Wheel Wells" on FWD cars (rear tubs hidden
   there, they do nothing for a FWD car):
   - Rolled & Pulled Fenders, $600: about 1 in more room (a 26x8.5-class slick).
   - Wide One-Piece Front End, $6,000, -8 kg (fibreglass): the wells
     rebuilt, room for a 26x10 or 28x10.5 slick.
2. **New tire: Drag Slick 26x10.0-15** (~$1,500, grip ~2.35), the classic
   FWD slick; the 28x10.5 slicks fit too with the wide front end. Packages:
   Race fits the fenders + 26x10 on FWD, Extreme the front end + 28x10.5.
3. **Keep the weight on the front:** packages stop moving the battery to the
   trunk on FWD; the trunk battery says what it does on FWD (weight off the
   drive wheels) or is hidden there.
4. **Weight reduction on FWD comes off the back half more** (rear seats,
   glass, hatch), as real FWD builds do: about +2-3 pts front at Stage 3.
5. **Wheelie bar on FWD limits weight transfer:** set low, the bar picks up
   the rear as the car squats and keeps load on the front tires (bar height
   in Tuning, as now). Packages fit it on FWD from Race.
6. **The hit:** look at why the fronts flash-spin and the clutch then locks
   low (off boost ~0.5 s); likely the slider clutch base range (allow
   lower) and the lock rule. Check RWD manual cars for the same.
7. Tuner and help texts: the tuner knows the FWD bar and the new parts;
   help/spec text on FWD launches.
Target: a 1,500 hp FWD Civic in the high 7s / low 8s, 60 ft ~1.4-1.5.

AWD:
8. **Fix the tire package bug:** on AWD both axles get the package's tires
   (the best that fit the front wells and brakes).

Left out: a centre-diff torque split for AWD (results already close to
real), front ballast (adds weight; asked as an option), aero changes.

Saves: nothing changes on load (new parts are optional); FWD cars with a
bar or Stage weight reduction get quicker. Rivals: unchanged (bar physics and
the weight split for players only; snapshot checked).

### Build notes
- **AWD fix (shipped Nov 14):** parts.js `tiresPkg`: on AWD a candidate must
  also fit the other axle (wells, brakes; drag brakes added if the front
  needs them) and the same tire + a matching wheel go on both axles
  (`plan.owheel`); the front-axle fit runs even when the rear needs no
  change; tier 3 list gets dr_275 as a fallback. Bench (stock power, none ->
  t0/t1/t2/t3): evo 13.81 -> 13.82/13.82/13.83/13.83; sti 13.41 ->
  13.41/13.39/13.41/13.27; r34 13.32 -> 13.28/13.28/13.31/13.31; gtr 10.94
  -> 10.92/10.81/10.83/10.94; 911 10.67 -> 10.67/10.54/10.56/10.67; diesel
  16.04 -> 15.98/15.98/16.00/16.09 (taller 305s, equal with power). Rivals 0
  diffs; package snapshot: only the 23 AWD tire packages changed; pkgsmoke,
  c2, drv, qolsmoke clean. Scripts scr/awdpkg.js, awdpkg2.js, awdui.js.

- **FWD build (Nov 14):**
  - data.js: `sl_26` Drag Slick 26x10.0-15 (mu 2.25, sec 10.6, rim 15 8-10,
    $1,500, Pro), in TIRE_SHOP after sl_24.
  - parts.js: `C.fwells` Front Wheel Wells (fwdCar: base car FWD and not
    converted to RWD): fw1 Rolled & Pulled Fenders $600 (+1.2 in), fw2 Wide
    One-Piece Front End $6,000 -8 kg (room 13 in). `C.tubs` notFwd. Battery
    bt1/bt2 `onFwd: false`, new bt3 Lightweight Race Battery (Front) $500
    (`nose: 12`), `onFwd: true` (generic onFwd filter in `DR.partOptions`;
    the fitted option always stays listed). `C.ballast` Front Ballast (fwdOnly):
    bl1 25 kg $150, bl2 50 kg $250. `DR.wellLimit` front on FWD adds the
    fender work; fit issues point to Front Wheel Wells. Packages: tires on
    FWD fit fw1 + sl_26 at Race, fw2 + 28x10.5 at Extreme (AWD-converted
    FWD cars too); body: bt3 on FWD from Race (none below); susp Extreme
    fits wheelie bars on FWD too; drive Extreme no longer converts FWD to
    RWD. Groups: fwells in Suspension, ballast in Weight & Safety; fwells is
    CAR_BOUND. Wheelie bar text mentions FWD.
  - physics.js (players only, `!ai`): weight reduction on FWD takes 40% of
    what comes out from the front (Stage 3 about +3.7 pts front, tube chassis
    +5.5); bt3 takes 12 kg off the nose; ballast 1.3x on the front, -0.3x
    rear; tubs/fwells kg now counted (tub2 -10 kg was never applied before).
    FWD wheelie bar (`S.barFwd`): a stiff contact (400 kN/m, 22 kN s/m) at
    the bar wheels (CG to rear axle + 1.6 m) once the nose-up pitch passes
    the bar height; it adds to the heave/pitch equations (rear tire load
    Nr excludes it). `sim.barF` = bar force. barDeg default 0.5 on FWD, min
    0 (0.5 elsewhere); help text updated. Slider clutch ranges: base
    pressure min 30 -> 10%, lockup max 3 -> 4 s.
  - garage.js: icons for fwells and ballast; build sheet lines (Front wells,
    Ballast; tubs only where they apply). ui.js help: fender work, a FWD
    paragraph (weight forward, slicks, bars low).
  - Tests: rivals 0 diffs (126); package snapshot: only FWD drive|3 and
    FWD tires|2/3 changed (plus the earlier AWD ones); pkgsmoke, c2, drv,
    qolsmoke, tubest clean; crawl mid clean (Settings audio debug text is
    old); screenshots scr/fwd1-6.png. Tuner session on a 1,500 hp FWD build
    runs clean (it calls the slider clutch and bar "already right": the
    known search-window weakness, see the tuner v2 plan).
  - Bench (1,500 hp FWD Civic K20, tune optimised): 24.5x8 10.09 -> fenders
    + 26x10 9.66 -> front end + 28x10.5 9.48 -> + 50 kg ballast 9.29 -> +
    bars 9.16 -> + ballast + bars 8.99 -> + clutch 15%/4 s and bars at 0:
    **8.79 @ 192, 60 ft 1.70** (was 10.26 / 1.99). Real: 7.80 @ 188, 60 ft
    1.347 (Aleman; honda-tech via search summary, the site blocks downloads).
  - FWD career packages (default tune, all groups; before -> after):
    Civic t2 12.24 -> 11.99, Integra t2 12.03 -> 11.89, Metro t2 13.96 ->
    13.50, GTI 12.43 -> 12.35, Cobalt 12.42 -> 12.25; Neon t2 12.36 -> 12.52
    on the default launch rpm, but 11.84 -> 11.64 with the launch rpm set
    (the bigger slick wants a different launch). Extreme stays FWD now:
    Civic 10.53 (RWD) -> 10.81, Integra 9.53 -> 10.22, GTI 11.81 -> 11.14,
    Cobalt 11.18 -> 11.27.
  - **Remaining gap (open):** the launch now hooks (no flash spin with the
    clutch set low) but the front grip tops out near 1.25 g (mu 2.4 x 0.52
    of the weight on the fronts). A 1.35 60 ft needs ~1.8 g. Faster TC adds
    only ~0.03 s; bar preload ~0.07 s. Real XFWD cars run "massive front
    tires" on widened front ends (size not found: honda-tech blocked, no
    other source). Options for the owner: let the wide front end take a
    31x13 slick; a FWD slick compound; leave it.

### Sources (Nov 14)
- f40 DSport, Papadakis, "AEM Drag Civic: the 7s" (page 1; pages 2-3 behind
  a bot check, not read): dsportmag.com/?p=4852
- f41 The Autopian, AWD CR-V parts in Civics (7.80 FWD vs 7.45 AWD)
- f31 se-r.net FWD launch tips; f3 Dragzine scaling (RWD 50-55% rear)
- Honda-Tech, "Hellish 1500-HP Honda Civic El Violento" (60 ft 1.347, 7.803
  @ 187.86): read via search summary only; the site returns error 1005 to
  downloads.
- Forum threads (anecdotal): honda-tech drag slick fitment / recommended
  size; dsmtuners "FWD racers what size slicks"

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
