# Playtest notes (Nov 11): options

Status: **decided Nov 11** (1C, 2 A+B+C, 3A, 4 A+B+D, 7 A+B+C; 5 and 6
parked). Built in `burnouts-10r80.md`. Owner's notes from playing the
tester's save. Each topic gives what we have now, what real racers do, then
options (my pick marked).

---

## 1. Change a setting in every tune at once (rev limiter etc.)

**Now:** Setup (Tune) has a WORKING ON picker. A change saves into one setup
("Strip tune" or "Street tune"), so a rev limiter change has to be made twice.

**Real world:** racers keep one engine calibration (rev limit, boost
ceiling, fuel, timing) and change the "track" settings (launch rpm, tire
pressure, shocks, boost by gear, traction control) for street or strip.

**Options:**
- **A. "All setups" in the WORKING ON picker.** Pick it and every change goes
  into every saved setup (only the setting you touched; the rest of each
  setup stays as it was).
- **B. Engine settings are shared, launch/chassis settings per setup.** Rev
  limiter, shift point, boost, jets, fuel live on the car; each setup keeps
  only launch rpm, tire pressure, suspension, traction control and boost
  by gear. Nothing to remember; but a street tune that wants less boost
  couldn't have it.
- **C. A small "apply to all setups" button** next to each setting.
- **My pick: A** (one control, no rule to learn). B is the most realistic
  but takes a choice away.

---

## 2. 10-speed automatic ('18-'23 Mustang GT)

**Now:** the GT comes with the 6-speed manual (MT82). The shop's automatics
top out at an 8-speed. There's no 10-speed.

**Real world:** the 10R80 was the GT's optional automatic. It ran about 0.3-0.5 s
quicker than the manual (Hot Rod and owner tests: 11.8-12.1 vs 12.3-12.6).
Ratios: 4.70, 2.99, 2.15, 1.77, 1.52, 1.28, 1.00, 0.85, 0.69, 0.64. The factory
clutches hold about 600 rwhp, and built ones (McLeod, Raybestos GPZ kits)
about 1,000-1,500 hp. Racers keep the computer (TCM) shifting it. Aftermarket
controllers can add a transbrake and staging creep. It doesn't get a manual
valve body.

**Test (our physics, ratios plugged in, stock GT):**

| Gearbox | 60 ft | ET |
|---|---|---|
| 6-speed manual, 3.73 | 1.99 | 12.54 @ 114 |
| 8-speed auto, 3.15 | 1.94 | 12.19 @ 116 |
| 10-speed auto, 3.15 | 1.93 | 12.13 @ 116 (6 gears used, 5 shifts) |
| 10-speed auto, 3.55 | 1.95 | 12.17 @ 117 (7 gears used) |

That matches the real cars closely, and the sim handles ten gears fine. Shifts
come about every second, so it's busy but not silly.

**Options:**
- **A. Add the 10R80 as a shop transmission** (around $6,500, holds about 1,000 hp
  of torque), for the rear-drive cars it fits.
- **B. Also make it the GT's factory choice:** the dealer offers the GT
  "6-speed manual" or "10-speed automatic" (like real ordering).
- **C. A "10R80 Built" upgrade** (clutch packs, about 1,500 hp).
- **How you shift it:** it shifts itself (Auto-shift), like the real one. The
  Valve Body section doesn't show for it (no manual valve body exists). A
  transbrake works with it (aftermarket controllers do this).
- **My pick: A + B**, C later if big-power Mustangs need it.

---

## 3. AWD burnouts (all four wheels spin with the car sitting still)

**Now:** an AWD car can't use the line lock (that's right: the front
wheels are driven). The game "scrubs heat on the brakes" and draws all four
wheels spinning while the car sits dead still. That's the odd look.

**Real world:** AWD drag cars mostly don't do RWD-style burnouts:
- Many **drive through the water and do a short rolling spin**, or skip the
  water and just clean the tires. Drag radials (what most AWD cars run)
  need only a light burnout anyway (M&H, Mickey Thompson guidance).
- GT-R and Evo racers often fit a **2WD switch / AWD controller** (Syvecs, ETS,
  ATTESA "2WD mode") to do a rear-only burnout on the line lock, then
  launch in AWD. Builders warn it's hard on the transfer case clutches if
  overdone.
- Line locks on AWD cars are a bad idea (they fight the driven front axle).

**Options:**
- **A. Rolling burnout:** the AWD car creeps forward through the box with
  the wheels spinning a little faster than it's moving (smoke from all
  four, short). Less heat than a RWD burnout.
- **B. A "2WD burnout switch" part** for AWD cars (Drivetrain, around $1,500).
  With it you get the normal line-lock burnout on the rear tires, and the
  fronts stay cool. Overdoing it wears the transfer case.
- **C. No burnout for AWD:** roll around the water, short dry clean. AWD
  cars just get less heat.
- **My pick: A as the default, B as an optional part.**

---

## 4. Burnouts sit on the limiter in 1st

**Now:** the burnout is always in 1st gear, and the engine sits on the rev
limiter. Test: full gas from cold, slicks take about 2.8 s to come into the
window and drag radials about 3 s, with about 80% of that on the limiter (wheel
speed about 40-50 mph). A long burnout means a long stretch of limiter bounce.

**Real world:**
- **Automatics:** start in 1st or 2nd and let it shift up. Most of a
  slick burnout happens in 2nd or 3rd (TorqueFlite/TH400 advice). A Powerglide
  goes into high.
- **Manuals:** 2nd gear is common (wheel speed without the clutch hammering).
- **Driver control:** they modulate the throttle to hold revs, or use the
  ECU's **burnout rev limiter** (Hondata, Haltech "3-step": burnout limit,
  launch limit, main limit). It holds a steady rpm with no bouncing.
- **Length:** drag radials get a short, light one (heat them gently). Slicks get a
  few seconds of smoke, longer on big tires.

**Options:**
- **A. Shift up in the burnout:** automatics shift themselves as the wheels
  speed up (1st, 2nd, 3rd), and on manuals the burnout is done in 2nd (or you
  tap SHIFT). Hired drivers and rivals do it too. You'd hear the revs climb
  through the gears instead of bouncing.
- **B. Burnout rev limiter:** part of the standalone ECU / 2-step. It holds a
  set rpm (Tune screen setting), steady drone, no bounce.
- **C. Feathered by default:** the game holds the revs just under the limiter
  unless you're in sim mode (you feather it yourself).
- **D. Burnout length by tire:** radials heat quicker (short burnout),
  slicks need more. The coach line says so.
- **My pick: A + B** (A is the realistic look and sound, B is the
  racing-electronics touch). D is a small extra.

---

## 5. AWD and FWD realism tests

Good driver, prepped strip, median of 5. "Tier" = the shop packages
(1 = street, 3 = race), "BIG" = tier 3 plus a large turbo on E85.

**AWD: realistic.**

| Car | Power | 60 ft | ET | Real-world |
|---|---|---|---|---|
| STI stock | 300 | 1.85 | 13.54 @ 100 | 13.4-13.6 @ ~101 ✓ |
| Evo IX stock | 286 | 1.97 | 13.91 @ 100 | 13.3-13.5 @ ~103 (we're ~0.4 slow) |
| GT-R stock | 565 | 1.53 | 10.95 @ 125 | 10.9-11.3 ✓ |
| GT-R tier 3 | 619 | 1.39 | 9.89 @ 137 | plausible |
| GT-R BIG | 1,149 | 1.34 | 8.41 @ 167 | 1,100-1,200 hp GT-Rs: 8.3-8.6 @ 165-170 ✓ |
| STI BIG | 660 | 1.66 | 10.41 @ 139 | plausible |

AWD cars barely spin (that's right). Two oddities:
- The Evo's 60 ft gets *worse* on drag radials (2.12) than on its street
  tire (1.97). Needs a look.
- The stock Evo runs a bit slow.

**FWD: falls apart at high power.**

| Car | Power | 60 ft | ET |
|---|---|---|---|
| Civic stock | 102 | 2.44 | 16.89 @ 82 ✓ |
| Civic tier 3 | 415 | 1.64 | 10.60 @ 134 (real: ~10.5-11 ✓) |
| Civic BIG | 485 | 1.75 | **11.33** (slower than 415 hp) |
| Cobalt SS tier 3 / BIG | 380 / 570 | 2.01 / 2.11 | 11.74 / 11.33 |
| Integra tier 3 / BIG | 668 / 777 | 2.06 / 2.01 | 10.39 / 10.25 |

- More power makes FWD cars slower or no quicker, and the 60 fts are 2.0+
  (real well-sorted 600-800 hp FWD cars: 60 ft ~1.5-1.8, ETs in the 9s;
  FWD records are around 7.5 @ 200 mph).
- **Traction control and a lower launch make it worse**, and boost by gear did
  nothing in my test. The tools that real FWD racers rely on aren't working
  for FWD here. This is the biggest finding: worth its own fix.
- FWD tire spin in the first 1.5 s is huge (slip ratios of 3-7).

**Front tire choice ("skinny front runners" vs matching):**
- The "Front Tires" part is really "the wheels that aren't driven". On a
  **FWD** car that's the *rear*, but the shop still calls them front
  runners, and the weight comes off the front (the drive wheels).
- On an **AWD** car there is no undriven axle, but skinny runners still
  apply: 14 kg lighter and less rolling drag, with no grip lost. They're worth
  about 0.04-0.06 s for free, and the race package fits them. That's an
  exploit; real AWD drag cars run drive tires on all four corners.
- "Matching" vs stock makes no difference on drag tires (as designed).

---

## 6. Split tires and wheels into front and rear?

**Now:** one Wheels & Tires section: "Drive Tires" (whichever axle is driven),
"Wheels" (one set), and "Front Tires" (meaning the undriven axle).

**Real world:** racers buy front runners as a kit (skinny wheel and tire).
The rear gets wide drag wheels (beadlocks) and the drive tire. AWD cars run
drive tires all round, often a narrower drag radial up front to fit the
fenders. FWD drag cars run their drag tires on the front and skinny "rear
runners" on the back.

**Options:**
- **A. Front and Rear sections that know the drive layout** (my pick).
  - **The driven axle** gets the drag tires and the drag wheels.
  - **The undriven axle** gets Stock / Skinny runners / Matching.
  - RWD: front = runners, rear = drive. FWD: front = drive, rear = runners.
  - AWD: both axles show drive tires. The front can be the same as the rear
    or a size narrower, and runners don't show.
  - It fixes the FWD naming and the AWD exploit, and it follows "parts live
    where they live".
- **B. Same as A, but the wheels stay as one set.** Fewer parts, but no
  lightweight runner wheels.
- **C. Keep one section and just fix the labels and rules.** On FWD, call
  them "Rear Runners" with the weight off the rear. On AWD, hide runners.
  Smallest change.
- **Saves:** cars keep what they have. An AWD car with runners gets its
  money back for them (or stock fronts).

---

## 7. Making the truck and trailer easier to find

**Now:** the only place to buy it is the Home pop-up (bed, bills, bank). The
race-day "Getting there" line only lists it once you own one.

**Options (several can go together):**
- **A. On the race-day "Getting there" line:** "Truck & trailer: buy
  $8,500", with a button. That's where the choice is made.
- **B. A phone text** the first time you pay for a flatbed or get a
  ticket: Ray says "Get yourself a truck and trailer. Cheaper than a tow
  every week. Home > Truck & trailer."
- **C. The ticket line on the slip** says "A truck & trailer ($8,500)
  avoids this."
- **D. At the Dealer:** a "Tow rig" listing next to the cars.
- **E. You can see it once owned:** the rig parked in the garage scene or on
  the race-day screen.
- **My pick: A + B + C.** That's the early-2000s approach: tell the player in
  the moment (a text from a character, NFS Underground style), and put the
  buy button where the choice is.

---

## Sources
- Burnouts: [Holley: how to do a burnout](https://www.holley.com/blog/post/let_the_gearheads_at_holley_show_you_how_to_do_a_burnout_/),
  [TorqueFlite burnouts](https://forabodiesonly.com/mopar/threads/torqueflite-burnouts.380220/),
  [Powerglide and burnouts](https://www.corvetteforum.com/forums/c1-and-c2-corvettes/3903632-powerglide-and-burn-outs.html),
  [Drag radial burnout (M&H)](https://www.racingjunk.com/news/rotate-the-earth-revisiting-drag-radial-tires-part-2/),
  [Hondata rev limits / burnout limiter](https://hondata.mobi/help/smanager/revlimits.htm),
  [Haltech launch control (3-step)](https://support.haltech.com/portal/en/kb/articles/how-launch-control-works).
- AWD: [GT-R 2WD module](https://www.gtrlife.com/threads/syvecs-2wd-module.98877/),
  [GT-R 4-wheel burnout](https://www.gtrlife.com/threads/possible-to-do-4-wheel-burnout.22132/),
  [Line lock on an Evo](https://www.evolutionm.net/forums/evo-engine-turbo-drivetrain/330486-line-lock-evo.html),
  [AWD GT-R burnout](https://autoevolution.com/news/arizona-girl-does-awd-burnout-in-her-800-hp-nissan-gt-r-clutches-overheat-118517.html).
- 10R80: [Hot Rod/Yahoo: 10-speed GT](https://autos.yahoo.com/2018-ford-mustang-apos-10-192700725.html),
  [Stock '18 GT 11.83](https://themustangsource.com/?p=24090),
  [Raybestos 10R80 clutches](https://performanceracing.com/magazine/sponsored-content/11-15-2023/drop-solution-increase-10r80-clutch-performance),
  [McLeod 1,500 hp kit](https://mgmt-www.americanmuscle.com/mcleod-mustang-10r80-automatic-transmission-friction-steels-kit-1500-hp-capacity-99099.html),
  [10R80 swaps](https://monstertransmission.com/blogs/news/10r80-swap-guide-constance-nunes-sema-mustang-monster-transmission-s-complete-conversion-kit),
  [Suncoast 10R80 build](https://www.fordmuscle.com/tech-stories/drivetrain/suncoast-10r80-rebuilds-s550-transmission).
- FWD/AWD: [Grassroots Motorsports: FWD weight transfer](https://grassrootsmotorsports.com/articles/race-craft-autocrossing-front-wheel-drive-cars),
  [FWD drag tire setup](https://grassrootsmotorsports.com/forum/grm/drag-tire-wheel-setup-fwd-edition/134892/page1),
  [FWD launch tips](https://se-r.net/car_info/fwd_launch_tips.html),
  [1,850 hp FWD Civic record](https://www.motor1.com/news/129113/honda-civic-fwd-quarter-mile-record/),
  [AWD Talon 6-second](https://thedrive.com/news/1800-hp-eagle-talon-is-worlds-first-6-second-awd-four-banger-drag-racer).

## Test notes (for Claude)
Scratchpad: `scr/awdfwd.js` (AWD/FWD tiers + front tire), `scr/fwdtc.js`
(FWD TC / launch / boost by gear), `scr/t10.js` (10R80 runtime-injected,
burnout heat timing). Front tires: `parts.js C.ftires` (no drive check),
`physics.js` extraFront uses `ftires.fm` for every layout. AWD burnout:
`physics.js Sim.burnout` returns false for AWD; `race.js` draws spin 60 on
all wheels (`spin = r.burn && !sim.burnMode ? 60`).
