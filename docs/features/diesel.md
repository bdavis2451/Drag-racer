# Diesel truck & motor rework (research, Nov 11)

Status: **research done, talking it through. No code.** Picked up again
Nov 12, after the turbo rework shipped.

## Update after the turbo rework (Nov 12)
- Turbo spool is now physics (see `turbo-system.md`): the factory HE300VG
  variable-vane turbo comes in around 1,500-1,700 rpm like the real one, and
  big gas turbos no longer behave like gas-engine sizes on the Cummins.
- Side effect: the stock Ram runs **15.25** (was 15.75; real 15.6-16.5).
  The real truck is held back by the ECU limiting torque in the low gears
  (and fuel-limited power); that belongs in this rework.
- The turbo shop already has the **Compound** section planned for diesels
  (S366 over S480 style) and the spec sheet works for diesel turbos.
- Still true: injectors/pumps are gas parts, the tune adds almost nothing,
  torque is 619 lb-ft (real 800), converters past the redline stall the truck. Owner asked: play
with the Ram 2500 Cummins, try a high-hp build, check spool and every
upgrade, look at the injector selection, research.

## The short version
- **Stock is right; upgrades aren't.** The stock truck runs 15.75 (real
  crew cab 4x4s: 15.6-16.5). But the game builds the Cummins like a gas turbo
  engine: boost makes the power, injectors only cap it. A real diesel is the
  other way round: **fuel makes the power, boost lets it burn clean** (too
  little air = black smoke and high exhaust temps, not "lean").
- So the classic diesel upgrades do almost nothing:
  - Tune (chip/flash): **+2 to +5 hp** (real: about +100 hp, 490-520 hp
    tune-only ceiling).
  - Bigger injectors + pump: **+0 hp** (real: the main upgrade; 449 -> 601 hp
    on injectors alone in a Dark Iron Diesel test).
- **Bigger turbos make it slower.** The turbos are the gas-engine ones, sized
  for engines that rev to 7,000+. On a Cummins (3,200-3,400 rpm):
  - Large 76mm: full boost at ~5,000 rpm, **210 hp, 20.7 s**.
  - Huge 88mm: ~7,400 rpm, **163 hp, 21.0 s**.
  - It only "works" with race heads/cams and billet parts revving the
    Cummins to 4,800-5,600 rpm (653 hp, 15.5 s): not how real ones do it.
- **Most power reachable: ~650 hp**, and only that weird way. Real: 1,000 hp
  is a common street build; 1,400 hp trucks run mid-10s; the quickest Cummins
  door car ran 6.94 @ 202.
- **Injectors are gas injectors** (440cc ... 2400cc, "Twin 500 lb/hr Race")
  and the pumps are gas pumps (190 lph + rising-rate regulator, 20 GPM belt
  pump). Diesels are sized in "% over stock" with CP3 high-pressure pumps.
- **Torque is low:** 619 lb-ft. Real 2013-18 6.7 with the 68RFE: 370 hp /
  800 lb-ft (Aisin trucks 850-930; 2019+ HO 1,000 lb-ft).
- **Bug-ish:** any converter that stalls above the redline (4,400+, the Pro
  Mod ones) leaves the truck unable to move (no finish). A 3,200 stall
  already costs 3 s (18.73).

## Real-world notes (with sources)
- **Injectors:** sized in % over stock nozzle flow (S&S: SO/HO, 50, 100, 150,
  200%). Dynomite: 25% over ~625 rwhp on a stock CP3; 90% ~725 rwhp with a
  modded or dual CP3. 45-60% over + an S366-size turbo + a stroker CP3 is
  the 600-650 hp recipe. 200%+ needs a modded or dual CP3. Race: Industrial
  Injection Race 2-5 with Dragon Fire / dual CP3.
  [dieselpowerproducts sizing guide](https://dieselpowerproducts.com/blogs/blogs/fuel-injectors-sizing-guide-how-to-choose-the-right-injectors-for-your-truck),
  [BD](https://us.bddiesel.com/blogs/r-d-blog/6-7l-cummins-injectors-bd-60-120-180-hp-2007-5-2018),
  [Dynomite 150hp](https://puredieselpower.com/dodge-products/4th-gen-13-16-6.7l/injectors-and-fuel-system-6/2013-2018-Ram-6.7L-Cummins-Fuel-Injectors-Nozzles/150hp-injectors-67l-cummins-dynomite-diesel),
  [Full Send 600-1200 hp guide](https://fullsenddiesel.com/blogs/news/2019-2024-6-7l-cummins-fuel-turbo-guide-proven-setups-for-600-1200hp-common-rail)
- **Fuel pumps:** stock CP3 -> stroker CP3 -> dual CP3 (1,000-1,200 hp) ->
  triple. A lift pump (FASS/AirDog) feeds them.
  [Industrial dual CP3](https://dieselpowerproducts.com/products/industrial-dual-cp3-kit-075-12-cummins),
  [BD Venom dual CP3](https://cppdiesel.com/bd-diesel-1050486-venom-dual-cp3-install-kit-c-w-controller-w-o-pump-dodge-2005-2009-cummins-5-9l-6-7l)
- **Tune:** about +100 hp alone; tuned-only ceiling 490-520 hp.
  [Diesel World: tune only](https://www.dieselworldmag.com/uncategorized/tune-only/),
  [Dark Iron injector test](https://www.dieselarmy.com/?p=14879)
- **Turbos:** factory VGT (HE351VE / HE300VG). Singles: S366/S369 (600-650
  hp), S400 family (S475-S483, 700-1,000 hp; spools fine on 6.7 L with a
  tune). Compounds S300-over-S400 (400-1,200+ hp) or S400-over-S400
  (700-900). Triples for competition.
  [DPS compound guide](https://www.dieselpowersource.com/blog/compound-turbos-cummins-complete-guide/),
  [Driving Line: S400 on a 6.7](https://www.drivingline.com/articles/11-reasons-why-your-67l-cummins-needs-an-s400/)
- **Engine limits:** stock (fracture-split) rods 650-900 hp; head studs past
  ~45 psi (the game already uses 45 psi: good); stock 80 lb valve springs
  float with more rpm (95-103 lb springs).
  [Diesel World: breaking point](https://www.dieselworldmag.com/diesel-technology/breaking-point),
  [Full Send / DPP 300hp guide](https://www.dieselpowerproducts.com/blog/how-to-add-300hp-to-a-common-rail-cummins/)
- **Exhaust temp (EGT):** what kills a diesel. Too much fuel for the air
  -> smoke and EGT. ~1,200 F is the accepted sustained limit; 1,250+
  damages turbos and pistons.
  [Diesel Army: why EGTs matter](https://www.dieselarmy.com/tech-stories/why-egts-matter-and-what-ignoring-them-can-do-to-your-diesel/),
  [Banks](https://official.bankspower.com/?p=1831)
- **Power adders:** diesel nitrous 35-200 hp kits (NOS, FAST, ZEX "spool"
  kits; also cools EGT); water-meth lowers EGT 100-300 F; propane.
  [Diesel World: nitrous](https://www.dieselworldmag.com/diesel-technology/big-power-with-nitrous-300-500hp-at-the-touch-of-a-button/),
  [Holley NOS diesel](https://www.holley.com/blog/post/nos_diesel_nitrous_system_p_n_02519nos/)
- **Transmissions:** stock 68RFE ~600 hp reliably; built ~900 hp. Big power
  goes to a built 48RE (4-speed, 1,000-1,400+ hp). Manual: G56 (the real
  manual truck was detuned to 660 lb-ft).
  [FASS: 68RFE vs Aisin vs G56 vs 48](https://fassmotorsports.com/blogs/news/4th-gen-cummins-transmissions-68rfe-vs-aisin-vs-g56-vs-48-swap),
  [Randy's Stage 3 68RFE](https://randys-transmissions.com/dodge-ram/10-12-6-7l-cummins/68rfe-transmission-stage-3)
- **Real ETs:** stock 15.6-16.5
  ([zeroto60times](https://www.zeroto60times.com/vehicle-make/ram-0-60-mph-times/slow-fast-quarter-mile/?));
  ext cab 10.30 @ 130; 1,400 hp Ram 2500 mid-10s
  ([Driving Line](https://www.drivingline.com/articles/custom-2014-ram-2500-truck-1-400hp-track-terror/));
  Firepunk Cummins Pro Street 6.94 @ 202; Scheid Cummins dragster 6.31 @ 226,
  2,500 hp
  ([Diesel World](https://dieselworldmag.com/features/worlds-quickest-diesel)).

## What we tested (game, Nov 11, median of 3 AI passes, prepped strip)
| Build | hp | lb-ft | Full boost | ET |
|---|---|---|---|---|
| Stock | 400 | 619 | 2,350 rpm | 15.75 @ 86 |
| Chip / Flash | 402 / 405 | 622 / 624 | 2,350 | 15.72 / 15.63 |
| Flash + big injectors + pump | 405 | 624 | 2,350 | 15.63 |
| Flash, factory turbo at 40 psi | 460 (fuel-capped) | 685 | 2,620 | 15.31 @ 91 |
| Standalone, race injectors, pump, studs, intercooler, exhaust | 449 | 678 | 2,230 | 15.12 @ 90 |
| + Turbo 67mm | 454 | 522 | 3,500 | 16.35 |
| + Large 76mm (no heads/cams) | 210 | 262 | 5,050 | 20.68 |
| + Huge 88mm (no heads/cams) | 163 | 266 | 7,400 | 21.05 |
| Huge 88mm + race heads, cams, billet, 4,800 rpm | 653 | 577 | 4,890 | 15.52 @ 97 |
| Twin 98mm Pro Mod (same) | 221 | 271 | 8,860 | 19.25 |
| Stock + 150 shot | 400 (+shot) | | | 14.67 @ 94 |
| Flash + 250 shot | | | | 14.01 @ 99 |
| Twin-screw 4.5L blower | 193 | 327 | | 19.74 |
| Stock + 5,000 stall converter | | | | doesn't finish |

## Re-run after the turbo rework (Nov 12, same method: median of 3 AI passes, prepped strip)
| Build | hp | lb-ft | Full boost (pull) | ET |
|---|---|---|---|---|
| Stock | 400 | 672 | 1,700 | 15.25 @ 87 (was 15.75) |
| Chip / Flash | 402 / 405 | 672 | 1,700 | 15.23 / 15.13 |
| Flash + big injectors + pump | 405 | 672 | 1,700 | 15.13 (still +0 hp) |
| Flash, factory turbo at 40 psi | 460 (fuel-capped) | 793 | 1,730 | 14.43 (was 15.31) |
| Standalone, race injectors, pump, studs, intercooler, exhaust | 449 | 695 | 1,690 | 14.64 |
| + 6266 at 35 psi | 488 | 755 | 1,920 | 14.45 |
| + 7275 at 40 psi | 531 | 821 | 2,340 | 14.74 |
| + 7685 at 45 psi | 573 | 881 | 3,130 | 15.19 |
| + 8891 at 50 psi | 612 | 786 | never | 15.91 |
| Built (race heads/cams/billet, 4,800 rpm) + 7685 | 784 | 960 | 2,650 | 14.44 @ 109 |
| Built + 8891 | 843 | 1,031 | 3,070 | 14.63 @ 112 |
| Built + Twin 9498 | 274 | 309 | never | 18.60 |
| Stock + 150 shot | | | | 14.21 |
| Flash + 250 shot | | | | 13.60 |
| Twin-screw 4.5L | 193 | 327 | | 19.74 |

What changed: the turbo side is mostly fixed: bolt-on turbos now spool on
the Cummins (a 7685, S480-size, is full at ~3,100, real S480 ~2,600-3,000)
instead of making 160-210 hp; bigger turbos no longer make it slower until
they're truly too big (8891 on a stock-rpm Cummins, Pro Mod twins). Most
power reachable ~840 hp (was ~650; real: 1,000 hp street builds common).
What didn't: the fuel side (tune +2-5 hp, injectors +0), power still made
by boost not fuel, gas parts on a diesel, low stock torque (672 vs 800),
and the stock truck is now too quick (15.25 vs real 15.6-16.5).
Test script: scratchpad `scr/dsl3.js`.

## Options (for the owner to pick from)

**1. How diesel power works**
- **A. Fuel makes the power** *(my pick)*: the injectors, pump and tune set
  how much fuel goes in (= power); the turbo's air sets how much of it burns
  clean. Short of air: smoke, a hot EGT gauge and a little less power, and
  past the limit the pistons/turbo take damage. Big turbos then do what they
  really do: more air up top, a bit more lag.
- **B. Keep the gas model, patch it:** the tune and injectors raise power;
  diesel-sized spool for the turbos. Less work, less real, no smoke/EGT.

**2. Diesel parts (shown only on a diesel; parts live where they live)**
- Injectors (Injectors section): Stock, 25%, 50%, 100%, 200%, 300%, Race
  (400%+).
- Fuel (Fuel Pump section): lift pump, stroker CP3, dual CP3, triple CP3.
- Tune (ECU section): a diesel tune (+fuel, more boost) and a race tune.
- Turbo (Turbo section): factory VGT, drop-in VGT upgrade, S366 single,
  S400 single (S475/S480), compounds (S366 over S480), race triples. Spool
  sized for a diesel.
- Bottom end / valvetrain: the existing parts, with diesel limits (stock rods
  ~800 hp, valve springs for rpm, studs for boost).
- Hidden on a diesel: blow-off valve, wastegate springs on the VGT, 2-step
  anti-lag, gas fuel pumps and cc injectors.
- Transmission: Built 68RFE, built 48RE (4-speed, big power).

**3. Smoke and EGT (the fun part, early-2000s feel)**
- An EGT gauge on the dash for diesels, black smoke on launch and when it's
  short of air (more smoke = more fuel than air). Optional: a "rolling coal"
  smoke cloud you can see in the other lane.

**4. Stock numbers:** torque 619 -> ~800 lb-ft (2013-18 68RFE truck).

**5. Converters:** don't offer converters that stall above the redline (or
warn), for every car. Small fix; could go in now.

**6. Later / separate:** the Ram manual (G56, detuned engine), other diesel
engines (Duramax, Power Stroke), Cummins swaps into other cars, propane.

## What it changes
- **Rivals:** Diesel Dan (docks, Mondays) and the stage 2 boss drive this
  truck. Any change to the engine changes them unless we keep their old
  numbers on purpose. Question for the owner.
- **Saves:** an owned diesel's gas injectors / pumps / turbo would need to
  map to the new diesel parts (e.g. any injector -> the nearest % size).

## Test notes (for Claude)
Scratchpad `scr/dslparts.js` (every part on the truck), `scr/dslbuild.js`
and `scr/dsl2.js` (builds, hp, spool, ETs). Diesel code: data.js `d_67`
(`diesel: true`, bg 1.4, bp 3600, safe 1200), physics.js (`e.diesel`:
no knock, no spark limit, headPsi 45, fuelW ignores fuel type), parts.js
`NOT_FOR.diesel` (ignition, throttle, fuel type), `fi_oem_vgt` (maxBoost
40, spool 2,900 scaled by displacement). Turbo spool uses the gas-engine
`spool` rpm scaled by displacement (physics.js ~137).
