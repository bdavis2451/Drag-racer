# Feature: burnouts, 10-speed auto, all-setups button, truck & trailer

Status: **shipped 2026-11-11** (both questions decided and built; Ram manual held back, see below).
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

## Question 1: manual cars shifting in the burnout: **decided a, shipped**
Owner picked **a**. On the gas the yellow button is SHIFT (up to the burnout
top gear, then STAGE again); off the gas it's STAGE. Applies to manuals and
a manual valve body; a coach line suggests 2nd once 1st is near the limit.
Code: race.js `update()` (`canShift` / `shiftNow`), Sim `burnShift`. Test:
scratchpad `scr/burnshift.js`. Options that were offered:
The yellow button is STAGE in the box. Options:
- **a. One button that changes with the gas:** holding GAS it reads SHIFT (tap
  = next gear); off the gas it reads STAGE. You never stage on the gas, so
  they don't clash. *(my pick)*
- **b. The game shifts it for you** (like the automatics): no input.
- **c. A small GEAR button** shows only in the burnout, above the gas pedal.
- **d. Pick the burnout gear on the Tune screen** (1st / 2nd / 3rd): no
  shifting in the box.
- **e. Swipe up on the gas pedal** to shift.

## Question 2: picking auto or manual when buying (2B): **owner picked A** (a choice in the Buy pop-up); car list and prices to confirm
**Now:** the dealer's Buy is a yes/no pop-up, so there's no choice.

**Options for the screen:**
- **A. Transmission choice in the Buy pop-up:** two radio buttons ("6-speed
  manual" / "10-speed automatic +$1,500") under the price. Quick, early-2000s
  feel (NFS Underground's buy screen was a short confirm). *(my pick)*
- **B. A "build your car" dealer page:** transmission, paint, and later the
  rear gear or trim, like a real configurator. More work, more to look at.
- **C. No choice when buying:** the other factory box shows in the
  Transmission shop as "(Factory option)" at a discount.

## Plan for 2A: auto or manual in the Buy pop-up: **owner picked all four groups, real prices; shipped**
**How it looks:** the dealer's Buy pop-up gets two buttons under the price,
e.g. **6-speed manual** / **10-speed automatic +$1,595**, with one plain line
each ("you shift" / "shifts itself, easier launches"). The factory box is
picked by default. Cars with only one real gearbox show no choice.
**Prices:** the real factory option price (the extra-cost box adds it; a
cheaper box takes it off). Checked: '18 GT 10-speed +$1,595 (Digital
Trends, cars.com); Hellcat 8-speed +$1,995 over the manual (TrueDelta).
Others from period price lists, rounded.
**Saves and rivals:** owned cars keep their gearbox; rivals don't change.
The box you didn't pick is still in the Transmission shop as now.

| Group | Car (game box now) | Other choice | Price | New gearbox needed? |
|---|---|---|---|---|
| A. Modern V8s | '18 Mustang GT (6-spd manual) | 10R80 10-speed auto | +$1,595 | no |
| | '89 Mustang GT / LX 2.3 (5-spd) | 4-speed auto (AOD) | +$600 | no (4-speed auto) |
| | '98 Camaro V6 / Z28 (5-spd / 6-spd) | 4-speed auto (4L60E) | +$750 | no |
| | Corvette C5 (6-spd) | 4-speed auto (4L60E) | +$0 (auto was standard) | no |
| | '12 Camaro SS (6-spd auto) | 6-speed manual (TR6060) | -$1,185 | no |
| | Hellcat (8-spd auto) | 6-speed manual (TR6060) | -$1,995 | no |
| | Supra Turbo (6-spd) | 4-speed auto | +$0 | no |
| B. Imports | Civic, Metro (5-spd FWD) | 4-speed auto transaxle | +$800 | no |
| | Miata, S14, RX-7 FD (5-spd) | 4-speed auto | +$900 | no |
| | Golf GTI (6-spd) | 6-speed DSG | +$1,100 | no |
| | 350Z (6-spd) | 5-speed auto | +$1,000 | yes (5-speed auto) |
| C. Muscle | Chevelle SS, 'Cuda (4-spd) | 3-speed auto (TH400 / 727) | +$250 | yes (stock 3-speed auto) |
| | Charger R/T (built TH400) | 4-speed manual | +$0 | no |
| | Nova SS (4-spd auto) | 4-speed manual | +$0 | no |
| | Bel Air (Powerglide) | 3-speed manual | -$190 | yes (3-speed manual) |
| D. Trucks | C1500 (4-spd auto) | 5-speed manual | -$900 | yes (HD 5-speed) |
| | Ram 2500 Cummins (68RFE) | 6-speed manual (G56) | -$0 | **held back**: the real manual truck was detuned to 660 lb-ft; needs a call |
Left out: the M3's SMG (an automated manual, would need its own rules), the
911's Tiptronic (slower than the PDK we use), and manual-only/auto-only cars
(Neon, Integra, Cobalt, S2000, Evo, STI, R34, Z06, Viper, Cobra, AE86,
Beetle, Willys; Monte SS, GNX, Lightning, GT-R, Aventador, race cars).

## Build notes (dealer gearbox)
- data.js `DR.TRANS_CHOICE` (car -> [[box, price difference]]); new
  dealer-only boxes a5_z, a3_th, a3_727, m3_col, m5_nv (not in the shop).
  `DR.TX_REAR` gains tx4a/txdct for conversions.
- parts.js `DR.facTrans(inst)` (inst.facTrans or the car's); stockPart and
  the "(Factory)" label use it; TX_EQUIV for the new boxes.
- game.js `G.transChoice`, `G.buyCar(carId, trId)` sets `inst.facTrans` and
  adds the price difference to `spent`.
- screens.js `buyPopup(id)` / `boxLine(t)`; style.css `.boxpick`/`.boxopt`.
- Fair passes (DR.simulate, median of 3), standard vs other box: '18 GT 12.54
  / 12.09, Hellcat 11.66 / 12.00, Chevelle 13.51 / 13.64, Bel Air 16.93 /
  16.17, Civic 16.85 / 17.64, GTI 14.56 / 14.33. Tests: scr/boxpick.js,
  boxbench.js, boxui.js; rivsnap 0 diffs.

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
