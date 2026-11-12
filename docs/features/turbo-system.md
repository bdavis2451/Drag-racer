# Turbo system rework (spool, sizing, setups)

Status: **research, talking it through. No code.** Started Nov 12.
Order agreed in principle: turbo system first, then the diesel rework
(`diesel.md`) on top of it, then career/rival balance.

## What the owner wants (Nov 12)
- Max realism and playability. Reworking career balance afterwards is fine.
- **No adjustable A/R** or other knobs that overwhelm the player: this isn't
  an engine-builder sim. But keep the real information available.
- Idea: calculate everything under the hood, show a **turbo spec sheet**,
  and list a curated set of turbos the player would actually want.
- Idea: sections for **compound** etc.
- Screenshots from Drag Racing: Streets (turbo and wheels screens), see below.
- "Do hefty research, don't take my word as law."

## How spool works today (Nov 12, physics.js 136-178, parts.js 16-31)
- Each turbo has a fixed `spool` rpm (full boost at 15 psi on a 3.0 L),
  scaled only by displacement (sqrt(3.0 / L), 0.55-1.6x), +14% per 10 psi
  over 15, then pushed later (up to 1.6x) if the turbo is far too big for
  the engine's power. Boost starts at 55% of full-boost rpm, straight line.
- Manifold / downpipe / heat wrap / wastegate shave lag and spool a few %.
- Rev range, exhaust heat, cams/heads (except via the "too big" check) and
  the engine type don't count. That's why every bought turbo is too lazy on
  the Cummins (Large 76mm full boost ~5,000 rpm on a 3,400 rpm engine).

## Research: how a real turbo comes on boost
- **The turbo is a balance:** the turbine takes energy from the exhaust
  (flow x heat x how hard it's squeezed through the housing); the compressor
  spends it making boost. Boost arrives at the rpm where the exhaust can pay
  for the boost asked for. More boost costs more energy, so it comes later.
- **Engine air flow** = displacement x rpm/2 x volumetric efficiency x
  intake density (Garrett Turbo Tech 103; EngineLabs). Rule of thumb: ~10 hp
  per lb/min of air on gasoline.
- **Hot exhaust spools sooner.** Gasoline turbine inlet ~1,500-1,750 F at
  full load, diesels cooler (~1,100-1,400 F; ~1,250 F is the damage line),
  rotaries hottest (no exhaust stroke; ports and manifolds run very hot).
- **Turbine size and housing (A/R) set where it spools;** compressor size
  sets how much air (power) it can make and the most boost it can hold.
  - A/R: .63 vs .82 on the same turbo: about 250-400 rpm of spool, the bigger
    one holds power up top (GT3076R/GT35 owners; Hybridz: .63 -> .82 cost
    ~400 rpm on a 2.0 Evo). 1.06 is a race housing.
- **Bearings:** ball-bearing vs journal of the same size: Garrett claims ~15%
  quicker; real tests 100-500 rpm, mostly in **transient response** (boost
  back after a shift / off-throttle), less in the steady threshold.
- **Twins vs single (same power):** not the free win the myth says. Garrett's
  LS test (5.3, 800 hp tune): single GTX4202R reached it **~300 rpm sooner**
  than twin GTX3582R Gen II. A Holdener test: single 7875 at least 500 rpm
  more responsive than twin 3582s, same power. Twins win when each is
  small for the job (one per bank, short pipes; factory twins).
- **Sequential twins** (2JZ, FD RX-7): small turbo first, second comes in
  ~3,500-5,500 rpm with a dip at the handover; owners usually convert to a
  single. Keep as factory-only.
- **Compounds** (small high-pressure turbo fed by a big low-pressure one):
  the diesel way (S366 over S480 ~1,000 hp; 60+ psi), rare on gas (Pro
  Mod / Top Dragster experiments; racers moved to a big single + nitrous).
- **Twin-scroll** (divided manifold + housing): spool gains from nothing to
  ~600 rpm, needs the matching divided manifold.
- **Manifolds:** a Holdener LS test found a cast log manifold built boost
  quicker (11 psi vs 6.7 psi on the same turbo) than a long tube header; the
  header's job is top-end flow. **Our tubular manifold currently says it
  spools sooner: the real trade is the other way** (log/short = response,
  equal-length tubular = top end; twin-scroll divided = both, for money).
- **Big turbo on a small engine:** besides lag, a big compressor can surge
  (stall) at low flow and high boost, so it can't hold boost low down.
- **Factory examples:** VGT diesels (vanes closed = tiny turbo at low rpm,
  open = big one), sequential 2JZ/13B-REW, modern small twins (EcoBoost).

Real reference sizes (approx crank hp per turbo, from vendor ratings):
50mm ~400 | 54-58mm ~500-600 | 62mm (6266) ~800 | 64-67mm ~850-900 |
72-76mm ~1,000-1,100 | 80mm ~1,250 | 85-88mm ~1,400-1,600 | 94-98mm Pro Mod
~1,800-2,200 each. Diesel: factory VGT ~500, drop-in VGT ~600-650, S366
~650, S475-S480 ~750-900, S366 over S480 compound ~1,000-1,200.

## Prototype check (scratchpad `turbo/model.js`, not game code)
A quasi-steady match (engine airflow -> exhaust energy -> turbine power vs
compressor power) with one global turbine constant and turbine capacity
from wheel size x A/R:

| Combo (target) | Real full boost (approx) | Model |
|---|---|---|
| 2.0 Evo + 35R .82 (30 psi) | 4,000-4,500 | 4,400 |
| 3.0 2JZ + 42R 1.01 (30) | ~4,500 | 4,750 |
| 13B + GT35R 1.06 (20) | 4,800-5,200 | 3,900 |
| 5.3 LS + 76mm .96 (20) | 3,800-4,200 | 2,600 |
| 6.0 LS + 88mm 1.15 (25) | 4,500-5,000 | 3,550 |
| 6.7 Cummins + S480 (40) | 2,600-3,000 | >3,400 |
| 2.0 Evo .63 vs .82 | 250-400 sooner | ~1,000 sooner (too much) |

Takeaways: the physics gets the order and the 4/6-cylinder numbers right
first try; V8s spool too early in steady state (the real numbers are dyno
sweeps, which include the rotor's inertia lag, the second half of the
model), diesel too late (diesel exhaust temps/fuel need work), and A/R
should count less than linearly. The "real" column is soft (forum and
vendor data), so calibration should aim for ranges. Feasible; a
calibration pass is the main work.

## Screenshots: Drag Racing: Streets (owner, Nov 12)
- **Turbo screen** is a flow diagram of the real system: air filter ->
  (blow-off/charge part) -> turbo(s) (two in parallel shown) -> charge pipe
  -> intercooler -> intake manifold; a greyed lower branch for superchargers;
  nitrous on its own tile. A **"Full set: -100 rpm turbo start"** bonus for
  matching parts, and a **Boost adjustment** button. Power shown as hp/ton.
- **Wheels screen:** the car in the middle, each axle's parts on its side:
  wheel (with size, R14), tire, spring, shock, brake disc, brake pads; a
  center tile (differential). Same front/rear split we parked in
  `wheels-tires.md` (notes copied there).
- What I'd take: the **diagram layout** (parts placed where they are on the
  car, "parts live where they live" made visible) and a clear "turbo start"
  number. What I'd leave: set bonuses (gamey: a real matched system gains
  from the physics, not a bonus).

## My recommendation (for discussion)
1. **Physics under the hood, a curated shop on top.** Every turbo is a real
   spec (compressor size, turbine size, housing A/R fixed by us, bearing,
   max boost, power it supports). The game works out spool for *your*
   engine; the player never sets A/R.
2. **Turbo spec sheet** (tap a turbo): its specs, and "on your engine":
   boost starts ~X rpm, full boost ~Y rpm at your boost, supports ~N hp, a
   small boost-vs-rpm curve, and warnings ("won't reach full boost before
   your redline", "runs out of air above X rpm"). The dyno shows the same
   curve.
3. **Setup sections** in the Turbo slot: **Single**, **Twin** (one per bank
   / parallel), **Compound** (diesels; maybe race gas later). Sequential and
   VGT stay factory parts. Each section only lists sizes that fit the engine
   (no 98mm on a Civic, no 50mm on a Cummins).
4. **A lean list per section** (about 8 singles, 4 twins, 3 compounds), named
   by size like now ("Turbo 67mm, ball bearing"), each with one clear job.
5. **Boost comes from the physics:** a threshold and a curve per combo,
   lag from rotor inertia (bearing type, wheel size), surge on oversized
   compressors, the existing 2-step / anti-lag / blow-off / boost-by-gear.
6. **Fix the parts that lie:** tubular manifold = top end not spool; add a
   twin-scroll (divided) manifold option for 4/6-cyl; wastegate parts keep
   their real job (boost control), not "spool sooner".
7. **Later, optional:** a DRS-style diagram view of the turbo system.

## Open questions for the owner
1. Physics model + curated list + spec sheet (recommended), or keep fixed
   per-turbo spool numbers and just recalibrate them?
2. Setup sections: Single / Twin / Compound? (Compound diesel-only at first?)
3. Turbo naming: by size ("Turbo 67mm") as now, or size + style ("67mm
   ball-bearing, street housing"), or real-style model numbers (6766, S480)?
4. Bearing: one per turbo (we pick), or offer the journal/ball pair on the
   popular sizes as a price/response choice?
5. Spec sheet detail: just "boost starts / full boost / supports hp", or
   also the boost curve and wheel sizes?
6. The diagram view (DRS style) now, later, or no?
7. Rivals: let them change and rebalance after (my pick), or freeze?

## What it changes
- **Every turbo car**, player and rival, gets new spool. Career/rival
  balance pass afterwards (agreed in principle).
- **Saves:** each old turbo maps to the nearest new one (same size class);
  manifold/downpipe/heat parts keep their ids.
- Tuner, dyno, 2-step advice, converter "too tight for the turbo" warning
  all read the new spool numbers.

## Sources
- Garrett Turbo Tech 103 (airflow, pressure ratio, matching):
  https://www.garrettmotion.com/wp-content/uploads/2018/06/Turbo-Tech-103.pdf
- EngineLabs, compressor maps / turbo sizing:
  https://www.enginelabs.com/?p=7701 , https://www.enginelabs.com/?p=238925
- A/R comparisons: https://rennlist.com/forums/944-turbo-and-turbo-s-forum/649017-gt3076r-63-vs-82-turbine-a-r.html ,
  https://forums.hybridz.org/topic/129180-turbine-size-matters/?page=2
- Ball vs journal: https://clublexus.com/forums/florida-lexus-club/630344-bw-8374-efr-vs-precision-6266-cea-jourbal-and-dbb-dyno-results.html ,
  https://motoiq.com/turbo-tech-turbo-bearings/3
- Single vs twin LS (Garrett): https://www.garrettmotion.com/news/newsroom/article/single-vs-twin-turbo-ls-test-jonathan-hurst-gtx4202r-vs-gtx3582r-gen-ii/ ;
  Holdener single 7875 vs twin 3582: https://www.gtrusablog.com/2021/01/single-turbo-vs-twin-turbo-plus-remote.html
- Sequential 2JZ: https://en.wikipedia.org/wiki/Twin-turbo ,
  https://forums.linkecu.com/blogs/entry/1-how-to-get-factory-turbos-working-sequentially-with-link-ecus/
- Compounds: https://www.dieselarmy.com/news/power-curve-how-compound-turbos-work-and-why-you-need-them/ ,
  https://www.enginelabs.com/?p=295403 , https://www.dieselpowersource.com/blog/67-cummins-turbo-upgrade-guide/
- Twin-scroll: https://dsportmag.com/the-tech/twin-scroll-vs-single-scroll-turbo-test-the-great-divide/
- Log vs tube manifold (Holdener): https://www.onallcylinders.com/2025/10/16/tube-header-vs-log-manifold-a-turbo-ls-response-rate-test/
- Turbo sizes/ratings: https://www.full-race.com/precision-turbo-62mm-gen-2-pte-6266-cea-turbo ,
  https://www.lsxmag.com/news/big-bang-theory-maximum-boost-on-a-gen-iii-ls-engine/
- Evo GT35 spool: https://www.dsmtuners.com/threads/fp-green-xl-76hta-spool-time.534850/
- Automation's model (simplified, for comparison): https://discourse.automationgame.com/t/turbos-and-torque-curves/5538
- (garrettmotion.com and onallcylinders.com pages can't be fetched from the
  session; read through search summaries.)

## Build notes (for Claude)
- Prototype: scratchpad `turbo/model.js` + `run2.js` (quasi-steady match).
  Next: add rotor inertia (transient), turbine capacity ~ A/R^0.5, diesel
  exhaust temp by fuel, calibrate to ranges; then a "spool table" for every
  engine x turbo in the shop to check nothing is silly.
