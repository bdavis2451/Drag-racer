# Feature: Carburetors (redo)

Status: **planning — talking it through, no code yet.**
Shipped v1 on 2026-11-05 (commit 70a8c4a): ~20 carb-section options. Owner
found it bloated and wants multiport EFI in the Intake Manifold section.

## Decisions so far

- Keep jetting on the Tune screen and the tuner setting jets.
- Keep carb launch feel (a softer hit; a much-too-big carb bogs).
- Drop weather effects on carbs for now (jets only change with mods).
- Multiport EFI = an intake manifold in the **Intake Manifold** section.
  On its own the car won't run: the shop says it needs **injectors, a
  throttle body and an ECU**. Fitted, those sections open where they are.
- Owner likes the options themselves; the problem is how many show at once.
  Direction: **show options only where they fit the engine and its mods**
  (like turbo manifolds/downpipes only with a turbo), rather than cutting.

## Open questions (for the owner)

1. Which options to keep now that parts only show when they fit? (The first
   cut list below may be too harsh.)
2. Add a 1050 race carb (Dominator-style) above the 850?
3. Split boost carbs: blow-through (turbo/centrifugal) vs draw-through
   (carbs on top of a Roots blower)?
4. Tuner/player air-fuel reading: tailpipe sniffer, wideband in the header,
   or plug reading as now?
5. Fuel pumps on carb cars: mechanical stock pump, carb-pressure electric
   pump, belt-driven for alcohol (see research).

## Plan as it stands (not approved)

Carb section (carb engines only; factory carb always stays):

| Part | Price | Shows when |
|---|---|---|
| Factory carb | — | always (removed → inventory, collector value) |
| 750 street carb | $520 | always |
| 850 race carb | $760 | always |
| 1050 race carb? | ~$1,300 | big engines? (open question 2) |
| Boost carb (blow-through) | $1,600 | turbo or centrifugal fitted |
| Blower carbs (draw-through, on a Roots)? | $2,400 | Roots/screw fitted (question 3) |
| Alcohol carb | $1,800 | alcohol fuel selected? |
| Throttle-body EFI | $1,800 | always |
| Two 4-barrels | $1,800 | 283 only |
| 1957 Ramjet | $4,000 | 283 only |
| Hilborn injection | $4,500 | alcohol fuel? |
| Small-engine dual-carb kit | $650 | small engines only |

Intake Manifold section: Multiport EFI manifold, ~$2,000, carb engines only.
Needs injectors + throttle body + ECU.

Saves: removed carbs map to the nearest kept one (600/650/750 → 750 street;
850/1050/old race → 850; two TBI sizes → one; old multiport conversion → new
manifold + the ECU it came with). Rivals: unchanged (carbs never apply to
rivals; rival snapshot must stay identical).

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
