# Feature: Carburetors (redo)

Status: **plan settled 2026-11-06; waiting on a go to build.**
Shipped v1 on 2026-11-05 (commit 70a8c4a): ~20 carb-section options. Owner
found it bloated and wants multiport EFI in the Intake Manifold section.

## Decisions so far

- Keep jetting on the Tune screen and the tuner setting jets.
- Keep carb launch feel (a softer hit; a much-too-big carb bogs).
- Drop weather effects on carbs for now (jets only change with mods).
- **Keep all v1 options, filtered** so only fitting ones show. Bad choices
  are allowed (an 850 on a mild engine, a 1050 on a small block); absurd
  ones are not (a Beetle carb on a 283). Filter by engine type, not size.
- 1050 Dominator stays (already in v1).
- Boost carbs appear like downpipes do: blow-through carb only with a turbo
  or centrifugal; blower carbs only with a Roots/screw blower.
- Alcohol carb and Hilborn always show on fitting V8s; the shop warns
  they're built for alcohol.
- Multiport EFI = an intake manifold in the **Intake Manifold** section
  (V8 and air-cooled versions, replacing `mpfi`/`mpfis`). On its own the car
  won't run: the shop says it needs **injectors, a throttle body and an
  ECU**. Fitted, those sections open; their "Stock" choice is gone, the
  cheapest is the base (440cc injectors; a new basic throttle body ~$300;
  a standalone ECU).
- **Reading the mixture:** the wideband is folded into the data logger: any
  data logger (Basic and up) means you and the tuner read an exact air/fuel.
  Without one: you read plugs; the tuner reads plugs and uses a tailpipe
  sniffer (WOT only, reads a little lean).
- **Fuel pumps on carb cars:** stock = mechanical; High-Volume Mechanical
  (~$150, ~450 hp); Carb Electric Pump + Regulator (~$300, ~750 hp); Billet
  Carb Electric (~$700, ~1,200 hp); belt-driven pumps as now. EFI pumps show
  only with injection (throttle-body EFI needs one, like a real Sniper).
  Saves: EFI pumps on carb cars become the nearest carb pump.

## Plan (approved items; build next)

Carb section (carb engines only; factory carb always stays):

| Part | Price | Shows on |
|---|---|---|
| Holley 600 VS / 750 VS / 750 DP / 850 DP | 450 / 520 / 650 / 760 | V8 carb engines |
| 1050 Dominator | 1,300 | V8 carb engines |
| Alcohol Dominator 1250 | 1,800 | V8 (warns: alcohol) |
| Dual 750s / Dual 1050s on a tunnel ram | 3,400 / 5,800 | V8 |
| Blow-through 950 | 1,600 | turbo or centrifugal fitted |
| Dual 750 blower carbs | 2,400 | Roots/screw fitted |
| Dual Carter 4-barrels; Ramjet | 1,800; 4,000 | 283 only |
| Hilborn 8-stack | 4,500 | V8 (warns: alcohol, needs a big pump) |
| Throttle-body EFI (Sniper 2 / Super Sniper) | 1,800 / 3,200 | V8 |
| Weber 34 / Dual Kadron / Dual IDF 44 | 180 / 650 / 1,400 | small engines |

Intake Manifold: Multiport EFI manifold (V8 ~$2,000; air-cooled ~$1,400),
carb engines only. Injectors / Throttle Body / ECU then required.
Data logger: Basic and up = wideband readings.
Fuel pumps: as in decisions.
Rivals: unchanged (rival snapshot identical).

## Research notes

**Carb sizes.** The 850 double pumper (4150 flange) is Holley's top
"competition" double pumper, but in practice a street/strip carb for
lighter cars. True race carbs are Dominators (4500 flange): 950–1475 cfm,
1050 and 1150 the common drag sizes. Rated cfm doesn't translate directly
between flanges.

**Blow-through vs draw-through.**
- Draw-through: the carb sits before the compressor, which pulls the mix
  through. Simpler, works with a stock-style carb, but needs a bigger carb
  and turbo seals; fuel in the turbo shortens its life. Factory examples
  (from memory, verify): '62 Olds Jetfire, Corvair Spyder, '78–'83 Buick
  turbo V6. Classic Roots blowers with carbs on top are draw-through too.
- Blow-through: the turbo pushes into the carb. A carb doesn't sense boost,
  so it must be sealed and its fuel enriched under boost (boost-referenced
  regulator, modified carb). Usually a purpose-modified carb.

**Fuel pumps.** Factory carb cars ran camshaft-driven mechanical pumps at
~4–7 psi. An electric pump on a carb must be low-pressure with a
regulator (an EFI pump floods it). Racing: electric pumps at modest power
(entry units ~750 hp); belt-driven mechanical pumps at the top, the norm
for alcohol and mechanical injection (Hilborn).
Game today: carb cars get a generic "Stock Fuel Pump"; every upgrade is an
EFI-style pump (in-tank, rising-rate regulator). Needs carb-specific
options.

**Reading the mixture.** Dyno/strip tuning uses a wideband O2: a bung in
the header (preferred) or a tailpipe sniffer clamp (quick checks, wide
open throttle only, reads a little lean, slow to settle). Plug reading is
still used by carb racers to confirm, but sources were thin on how common.

Sources: holley.com Pro/Dominator listings; enginelabs.com (Gen 3
Dominator; mechanical vs electric pumps); haynes.com and fordsix.com
(blow-through); jalopnik.com, go-parts.com (pump pressures); rennlist.com,
stangnet.com, thetuningschool.com (sniffer vs bung).

## Build notes (fill in when building)

- v1 code: parts.js `C.carb`, physics.js buildSpec carb block +
  `DR.carbJetErr/carbMix/carbRead`, tuner.js 'jets', screens.js plug box.
