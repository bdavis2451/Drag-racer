# Turbo system rework (spool, sizing, setups)

Status: **shipped (Nov 12).** Next: career/rival rebalance, then the diesel rework. Started Nov 12.
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

## Calibration (Nov 12, scratchpad `turbo/dyn.js` + `cal.js`)
Physics: engine airflow -> exhaust energy -> turbine power vs compressor
power, plus the rotor's inertia (it has to be spun up), simulated as a
500 rpm/s dyno pull. One turbine constant for all turbos; turbine flow ~
wheel size squared x A/R^0.35; a V8 single loses ~30% of the exhaust energy
in its long crossover pipes (cooler, pulses smeared), twins per bank don't.

| Combo (boost) | Real full boost | Model |
|---|---|---|
| 2.0 Evo + 35R .82 (30) | 4,000-4,500 | 4,480 |
| same, .63 housing | 250-400 sooner | 275 sooner |
| 3.0 2JZ + 42R 1.01 (30) | ~4,500 | 4,270 |
| 5.3 LS + 76mm (20) | 3,800-4,200 | 3,740 |
| 6.0 LS + 88mm (25) | 4,500-5,000 | 4,680 |
| 6.7 Cummins + S480 (40) | 2,600-3,000 | 3,060 |
| 13B + GT35R (20) | 4,800-5,200 (soft) | 4,170 |

Good enough to plan on. Still to do in the build: compressor limits (choke =
the power it supports, surge on oversized compressors), the rotary's
numbers, factory turbos per engine, and a full engine x turbo spool table.

## Approved (owner, Nov 12)
- All 8 singles, all 4 twins, real factory turbos per engine (stock ETs
  kept), honest manifolds, twin-scroll manifold (after research on its
  downsides, below), wastegates = boost control only.

## Twin-scroll research (Nov 12)
- **What it does:** a divided manifold and divided turbine housing keep
  cylinders whose exhaust pulses would collide apart (1-4 / 2-3 on a
  1-3-4-2 four; 1-2-3 / 4-5-6 on an inline six), so each pulse hits the
  turbine whole: quicker spool, better response.
- **Gain:** from nothing to ~600 rpm sooner depending on the setup; the
  disputed D-Sport test and forum results cluster at a few hundred rpm.
- **Which engines:** best on 4-cylinders, good on inline sixes, poor on
  cross-plane V8s (the LS firing order doesn't pair well; uneven pulse
  spacing per bank). BMW and Subaru FA20 use it from the factory.
- **Downsides:**
  - **Needs the matching divided turbine housing**; on an open housing (or
    an undivided manifold) the benefit is gone.
  - **Top end:** at sustained high rpm the advantage narrows; several
    racers report an open housing making ~5-10% more peak power on the same
    turbo (disputed), and higher back pressure with big cams. Big-power
    drag cars mostly run open housings.
  - **Wastegating:** each scroll needs to be gated (two gates or a divided
    gate), otherwise one side over-boosts/creeps.
  - **Cost and fitment:** more expensive, harder to build, bulkier; a
    poorly divided cheap cast "twin-scroll" gives little benefit.
  - (No good source found on cracking specifically; tubular manifolds in
    general crack more than cast logs.)
- Sources: https://dsportmag.com/the-tech/twin-scroll-vs-single-scroll-turbo-test-the-great-divide/ ,
  https://store.kinugawaturbosystems.com/blogs/k-log/single-scroll-vs-twin-scroll-turbos ,
  https://ls1tech.com/forums/forced-induction/1461494-lsx-twinscroll-turbo-design-analysis.html ,
  https://saemobilus.sae.org/articles/blowdown-interference-a-v8-twin-turbocharged-engine-2011-01-0337 ,
  https://honda-tech.com/forums/drag-racing-36/1000-guys-ts-open-3302612/ ,
  https://www.miataturbo.net/diy-turbo-discussion-14/twinscroll-worth-85074/page3/ ,
  https://x-engineer.org/twin-scroll-turbo/ , https://www.autozine.org/technical_school/engine/Forced_Induction_4.html

## The plan (approved Nov 12)

**1. Spool from physics.** Each turbo has real specs (compressor and turbine
wheel sizes, housing A/R, bearing). The game works out boost vs rpm for
your engine: displacement, rev range, how well it breathes (heads, cams),
exhaust heat (gas / diesel / rotary), V8 single vs twins. Lag comes from the
rotor's weight (big wheels lag more; ball bearings recover faster after a
shift). 2-step, anti-lag, blow-off valve and boost-by-gear keep working.

**2. Turbo slot: Single and Twin sections** (Compound arrives with the
diesel rework). Only sizes that fit the engine are listed. One bearing type
per size. Price = the turbo with its basic kit (log manifold, downpipe,
internal gate, piping), as now.

Singles:
| Turbo | Size | Bearing | Supports | Price | Replaces |
|---|---|---|---|---|---|
| 5057 (T3/T4) | 50mm, budget | journal | ~400 hp | $1,200 | Budget T3/T4 |
| 4847 | 48mm | ball | ~350 hp | $2,400 | Ball-Bearing 50mm |
| 5558 | 55mm | ball | ~550 hp | $3,400 | Small 54mm |
| 6266 | 62mm | ball | ~800 hp | $4,800 | 61mm, Medium 64mm |
| 7275 | 72mm | ball | ~1,000 hp | $7,000 | 67mm |
| 7685 | 76mm | ball | ~1,250 hp | $9,500 | Large 76mm, 80mm |
| 8891 | 88mm | journal | ~1,750 hp | $16,000 | Huge 88mm |
| 9498 | 94mm | journal | ~2,200 hp | $24,000 | (new: big-tire single) |

Twins (6 cylinders and up):
| Turbo | Supports (pair) | Price | Replaces |
|---|---|---|---|
| Twin 4847 | ~700 hp | $5,200 | Twin 50mm |
| Twin 6266 | ~1,600 hp | $10,500 | Twin 67mm |
| Twin 7685 | ~2,500 hp | $19,000 | (new) |
| Twin 9498 Pro Mod | ~4,400 hp | $45,000 | Twin 98mm Pro Mod |

**3. Factory turbos get their real specs per engine** (CT26 on the 3S-GTE,
TD05 on the 4G63, VF on the EJ257, T3 on the Buick/GNX and SVO, sequential
twins on the 2JZ and 13B, twin T25-class on the RB26, IHI twins on the VR38,
etc.), calibrated so **stock cars keep their current stock ETs** (they're
matched to real timeslips).

**4. Spec sheet** (tap any turbo in the shop, also from the dyno): model,
type, compressor inducer/exducer, turbine wheel, housing A/R, bearing, max
boost, supports ~hp; "on your engine": boost starts, full boost at your
boost setting, a boost-vs-rpm chart, and warnings (won't reach full boost
before redline / runs out of air above X rpm / too small for your power).

**5. Turbo parts that tell the truth:**
- Manifold: Kit Cast Log (quickest response) -> Tubular (more top end, a
  touch slower) -> Equal-Length Race (most top end) ; new **Twin-Scroll
  Divided** manifold for 4- and 6-cylinders (quicker spool, keeps top end).
- Downpipe and heat wrap: small real gains (less back pressure / hotter
  turbine), as now.
- Wastegate parts: boost control and creep only (no "spools sooner").

**Left out:** adjustable A/R, bearing choice, compounds and diesel turbos
(the diesel rework), the diagram view (later), sequential conversions.

**Saves:** old turbos become the one in the "Replaces" column, same boost
setting (capped to the new max). Manifold/downpipe/heat/gate parts keep
their ids.

**Rivals and career:** every turbo rival changes; the career/rival balance
pass comes after (agreed).

## My recommendation (for discussion, Nov 12)
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

## Decisions (owner, Nov 12)
- **Spool from physics** (engine airflow, exhaust heat, turbo size), not
  fixed per-turbo numbers. Calibrate to real ranges.
- **Sections: Single, Twin, Compound (diesel only).** Sequential and VGT stay
  factory parts.
- **Naming: real-style model numbers** (e.g. 6266, 7675, 8885, S366, S480),
  with the size/type in the description.
- **Spec sheet shows everything:** on-your-engine numbers, the boost curve,
  and compressor/turbine details (wheel sizes, trims, A/R, bearing). A/R
  is information only, never adjustable.
- **One bearing type per turbo size** (we pick it).
- **Diagram view (DRS style): later** (backlog).
- **Rivals change** with the new spool; rebalance the career after.

## Open questions for the owner
- (all answered, see Decisions)

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

## Build notes (for Claude), Nov 12
- physics.js "turbo" section: `tbSetup` (inertia ~ wheel^5, turbine flow
  ~ turb^2 x A/R^0.35, V single pulse 0.66, twin-scroll 1.1, manifold man,
  heat, downpipe c4 back pressure, etaT by turbine size, surge line
  PR <= 1 + 8 m/m_choke), `tbFlow` (closed-form turbine expansion ratio),
  `tbHold` -> `S.tbHoldT` (most boost held per 100 rpm), `spoolAt`,
  `tbStep` (rotor energy; BOV via S.bovT on closed throttle; gate at
  target), `DR.turboPull` (500 rpm/s pull: start/full/curve),
  `DR.turboFits` (15 psi full before max(red, bp) - 300, flow >= 1.15 x
  stock hp; twins need 6+ cyl). Sim boost: pre-launch keeps the old
  first-order 2-step build, then the rotor model.
- parts.js: new FI hardware fields, `DR.turboSpec` (factory = engine
  fi.tb), `DR.twinScrollFits`, aliases t_61 -> t_med, t_80 -> t_large
  (game.js `turboV2` migrates saves). Shop groups via option `group`
  (garage.js catalogGrid). Spec sheet: ui.js `UI.turboSheet`; dyno button
  in screens.js.
- data.js: factory `fi.tb` per turbo engine.
- Tests (scratchpad scr/): tspool.js, ttable.js (engine x turbo spool
  table), turboui.js / turboui2.js / dynosheet.js (screens), bench.js
  (stock vs real: supra 13.71->13.31, evo 13.90->13.78, sti 13.53->13.39,
  r34 13.38->13.30, gnx 13.89->13.83, silvia 14.66->14.19, rx7 13.43->13.37,
  diesel 15.75->15.25), rivsnap2.js (70 of 126 rival times moved, mean
  -0.04 s, +0.23 to -0.46). Regressions clean: qolsmoke, pkgsmoke, mvb2,
  c2, burnui, boxui, nov11ui. buildSpec 0.8 -> 1.7 ms.

## Build notes from research (for Claude)
- Prototype: scratchpad `turbo/model.js` + `run2.js` (quasi-steady match).
  Next: add rotor inertia (transient), turbine capacity ~ A/R^0.5, diesel
  exhaust temp by fuel, calibrate to ranges; then a "spool table" for every
  engine x turbo in the shop to check nothing is silly.
