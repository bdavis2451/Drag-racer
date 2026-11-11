# Feature: burnouts, 10-speed auto, all-setups button, truck & trailer

Status: **first part shipped 2026-11-11**; two open questions (below).
From the Nov 11 playtest notes (`playtest-nov.md`). Owner picks: 1C, 2 A+B+C,
3A, 4 A+B+D, 7 A+B+C; 5 and 6 parked (`awd-fwd-traction.md`, `wheels-tires.md`).

## Shipped
- **⇉ all** next to every Tune setting (when the car has saved setups): puts
  that setting into every saved setup. (Also fixed: gear ratios and boost by
  gear now save into the setup you're working on.)
- **10R80 10-speed automatic** ($6,500, holds 900 Nm) and **10R80 Built**
  ($9,500, 1,800 Nm), in the Transmission shop for the rear-drive cars it
  fits. Computer-shifted: no Valve Body section with it (no manual valve body
  exists). Test: stock '18 GT 12.13 vs 12.54 with the manual.
- **AWD burnout:** no line lock, so the car rolls slowly through the water
  (up to ~7 m) with all four spinning a little faster than it moves, and gets
  less heat. Rivals' AWD cars do the same.
- **Burnouts shift up:** an automatic (no manual valve body), any hired driver
  and every rival go up a gear as the wheels speed up (to 3rd; 2nd on a
  3-speed, high on a Powerglide). If the engine can't spin them in the higher
  gear it kicks back down and stays.
- **Burnout Rev Limit** (Tune > Engine, needs a standalone ECU): holds the revs
  with the throttle, steady, no limiter bounce. Default Off.
- **Burnout length by tire:** drag radials heat 1.6x quicker (a short light
  burnout), slicks 1x (a long one), others 1.25x. The coach line says so.
- **Truck & trailer:** a "Buy truck & trailer $8,500" button on the race-day
  Getting there line (it hitches up straight away); a one-time Ray text the
  first time you pay a flatbed or get a ticket; the ticket line on the slip
  says a truck & trailer avoids it.

## Open question 1: manual cars shifting in the burnout (owner asked for options)
The yellow button is STAGE in the box. Options:
- **a. One button that changes with the gas:** holding GAS it reads SHIFT (tap
  = next gear); off the gas it reads STAGE. You never stage on the gas, so
  they don't clash. *(my pick)*
- **b. The game shifts it for you** (like the automatics): no input.
- **c. A small GEAR button** shows only in the burnout, above the gas pedal.
- **d. Pick the burnout gear on the Tune screen** (1st / 2nd / 3rd): no
  shifting in the box.
- **e. Swipe up on the gas pedal** to shift.
Until decided: a player-driven manual stays in 1st (the burnout limiter
already stops the bouncing).

## Open question 2: picking auto or manual when buying (2B)
**Now:** the dealer's Buy is a yes/no pop-up, so there's no choice.

**Options for the screen:**
- **A. Transmission choice in the Buy pop-up:** two radio buttons ("6-speed
  manual" / "10-speed automatic +$1,500") under the price. Quick, early-2000s
  feel (NFS Underground's buy screen was a short confirm). *(my pick)*
- **B. A "build your car" dealer page:** transmission, paint, and later the
  rear gear or trim, like a real configurator. More work, more to look at.
- **C. No choice when buying:** the other factory box shows in the
  Transmission shop as "(Factory option)" at a discount.

**Cars that came with both (research, from memory: verify before building):**
| Car | Manual (game) | Optional automatic |
|---|---|---|
| '18 Mustang GT | MT82 6-speed | 10R80 10-speed |
| '89 Mustang GT / LX 2.3 | T5 5-speed | AOD / A4LD 4-speed |
| '98 Camaro V6 / Z28 | T5 / T56 | 4L60E 4-speed |
| '12 Camaro SS (game: auto) | TR6060 6-speed | 6L80 (factory now) |
| Supra Mk4 Turbo | V160 6-speed | A340 4-speed |
| Civic hatch, Metro, Miata, S14, RX-7 FD | 5-speed | 3- or 4-speed auto |
| 350Z | 6-speed | 5-speed auto |
| Golf GTI Mk5 | 6-speed | 6-speed DSG |
| BMW M3 E46 | 6-speed | SMG (sequential) |
| 911 Turbo 997 (game: DCT) | 6-speed manual | (Tiptronic/PDK) |
| Corvette C5 | T56 6-speed | 4L60E |
| Hellcat (game: auto) | TR6060 6-speed | 8-speed (factory now) |
| Nova SS '68 (game: auto) | Muncie 4-speed | TH400 / Powerglide |
| Chevelle SS '70, 'Cuda '70 (game: 4-speed) | 4-speed | TH400 / 727 |
| Charger R/T '69 (game: auto) | 4-speed | 727 TorqueFlite |
| Bel Air '57 (game: Powerglide) | 3-speed | Powerglide |
| C1500 '88-98 (game: auto) | 5-speed | 4L60E |
| Ram 2500 Cummins (game: auto) | G56 6-speed | 68RFE |
Manual-only in real life: Neon R/T, Integra Type R, Cobalt SS, S2000, Evo IX,
STI, R34, Z06, Viper, Cobra '03. Automatic-only: Monte SS, GNX, Lightning,
GT-R (DCT), Aventador.
Some need a new factory box in the game: a stock 3-speed TH400 / 727, a 5-speed
auto (350Z), the A340 / AOD (can use the 4-speed auto).

## Build notes
- screens.js `allSetupsBtn(inst, key, label)`; slider passes `S` to `def.fmt`.
- data.js `a10`, `a10_b` (`tcm: true`), in `TRANS_SHOP`; parts.js `partApplies`
  hides valvebody for `tcm`, `DR.shiftOpt` ignores a valve body with it,
  transDesc says it's computer-shifted.
- physics.js `burnRpm` (TUNE_DEFS, default S.red = Off) governs throttle in
  burnMode (`drvThr` keeps the driver's own throttle for the clutch logic);
  `Sim.burnHeat(tire)`; `Sim.prototype.burnShift`, `Sim.burnTop(S)`.
- race.js `burnShift(r, dt)` (upshift on output speed or the limiter,
  kickdown + no re-upshift), `awdCreep`, AWD spin visual `r.spinVis`,
  `stepRoll` rolls from where the car is (`r.from`), coach lines.
- legal.js buy button in `haulPicker`, ticket line, `DR.Phone.send('ray','rig')`;
  phone.js `rig` text (once).
- Tests: nov11ui.js (all-setups, 10R80 shop/valvebody, rig buy, ticket +
  texts), burn2.js / burnui.js (burnout timing, gears, AWD creep), rivsnap 0
  diffs, qolsmoke, c2, drv, tubest, mvb2, pkgsmoke, crawl mid (Settings 1, as
  before), tunev2 edge 8.125.
