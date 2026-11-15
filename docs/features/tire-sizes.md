# More tire sizes + tires by wheel diameter

Status: **Nov 15: shipped (everything approved: all 9 tires, the list,
the 26x10 correction).**
Owner's picks (Nov 15): the Tires slot shows tires for the fitted wheel's
diameter first and folds the rest under "Other sizes (new wheels needed)"
(buying one still brings a matching wheel); research all four groups:
big-brake drag radials (17/18/20 in), more 15 in drag radials (255/60,
295/65), small-tire slicks (26x8.5, 28x9, 29.5x10.5), and a 32x14 slick. Owner: "add more tire size selections and also hide
tires that don't have the same diameter as the wheel".

## Today (by wheel diameter)
- 13-14 in: none (factory only: Civic 14, Metro 13)
- 15 in: street 195, drag radials 225/275/315, radial slicks 28x10.5 /
  31x13.5, slicks 24.5x8 / 26x10 / ET 28x10.5 / 31x13 / 33x16.5, runners
- 16 in: drag radial 245, Pro slick 36x17
- 17 in: street 225, track 255, drag radial 275/40, runner
- 18 in: street 255, track 315, road-race slick, drag radial 305/45, runner
- 20 in: street 305
The Tires slot lists every tire; a tire that needs a different wheel is
offered with a matching wheel (bought and fitted together).

## Real sizes worth adding (Mickey Thompson catalog, Nov 15)
- Drag radials: 315/35R17 (26x12.5R17), 305/35R20 (29x12.5R20), 295/65R15,
  255/60R15 (ET Street R lists). 18 in sizes: not found yet (MT's page
  lists none; other makers to check).
- Slicks: 26x8.5-15, 28x9-15, 29.5x10.5-15, 32x14-15 (ET Drag lists).
- Fills real gaps: big-brake cars on 17/18/20 in (Evo, STI, GT-R, 911,
  Lamborghini, Hellcat) have one drag radial each or none; the small-tire
  15 in slicks (28x9, 29.5x10.5) are the classic "small tire" class sizes.

## Plan (approved Nov 15, all items)
Real specs from Mickey Thompson's ET Street R / ET Street S/S / ET Drag
pages (section width, approved rims, outside diameter, weight). Game
prices on the game's scale (between the tires around them); grip on the
game's scale by type and size.

**Tires slot:** "Fits your wheels (15 in)" first; "Other sizes (new wheels
needed)" folded underneath, by diameter; buying one still brings a
matching wheel. On wheels nothing in the shop fits (a Civic's 14s), the top
section says so.

**New drag radials**
| Tire | Fits | Section | Tall | Grip | Price | For |
|---|---|---|---|---|---|---|
| 255/60R15 | 15x7-9 | 10.3 in | 27.5 | 1.75 | $750 | between the 225 and 275; compacts |
| 295/65R15 | 15x8-10.5 | 12.1 | 30.2 | 2.00 | $1,100 | tall 15 in, between 275 and 315 |
| 315/35R17 | 17x10.5-12.5 | 12.4 | 25.9 | 2.00 | $1,250 | 17 in brake cars (Evo, STI, R34, Z) |
| 315/40R18 | 18x10.5-12.5 | 12.6 | 28.3 | 2.05 | $1,400 | 18 in brake cars (GT-R, 911, Camaro SS) |
| 305/35R20 | 20x10-12 | 11.8 | 28.9 | 1.95 | $1,600 | 20 in brake cars (Lambo, Hellcat): today none |

**New slicks (all 15 in)**
| Tire | Fits | Section | Tall | Grip | Price | For |
|---|---|---|---|---|---|---|
| 26x8.5 | 15x7-9 | 9.9 | 25.9 | 2.10 | $1,450 | FWD with rolled fenders; small cars |
| 28x9 | 15x7.5-9.5 | 10.8 | 27.3 | 2.30 | $1,500 | classic small-tire class slick |
| 29.5x10.5 | 15x9-12 | 13.1 | 29.9 | 2.55 | $1,900 | between the 28x10.5 and the 31x13 |
| 32x14 | 15x13-15 | 17.2 | 31.8 | 3.00 | $3,200 | between the 31x13 and the 33x16.5 |

**Fix (my error, Nov 14):** the 26x10 slick is really 11.6 in wide (I used
10.6): it needs the wide front end on a compact, not rolled fenders. The
26x8.5 becomes the rolled-fender tire; FWD Race tire package: fenders +
26x8.5 (Extreme unchanged: front end + 28x10.5).

**Wheels:** nothing new needed (every size above has a wheel in the shop:
the 315/35R17 needs the 17x11 beadlock; 32x14 the 15x14 beadlock).

**Packages:** tire packages pick from the bigger list (each tier's
candidate list gets the new sizes in grip order), so big-brake cars get a
real drag radial at Street/Sport.

**Left out:** 13/14 in drag tires (a 24.5x9-13 slick exists; small cars
move to 15s in real life), 19 in drag radials, more street/track sizes.

**Saves and rivals:** nothing changes on load; rivals unchanged (legacy
wheels and tires).

## Build notes (Nov 15)
- data.js: dr_255, dr_295, dr_315b (315/35R17), dr_315c (315/40R18),
  dr_305t (305/35R20), sl_265, sl_28, sl_295, sl_32; sl_26 corrected to
  11.6 in (rims 8.5-10). TIRE_SHOP order by kind and size. parts.js
  PART_DISC: the new ones open with drag wins (like their neighbours).
- Packages: candidate lists per tier get the new sizes (big-brake radials
  last); the wheel finder falls back to forged wheels for sizes the drag
  wheels don't come in (20x10-11, 18x11). Package snapshot: FWD Race tires
  now fenders + 26x8.5 on 15x8; Lamborghini and Viper get the 305/35R20
  (they had nothing). Everything else unchanged.
- garage.js catalogGrid: tires on a car with wheel data: "Fits your N in
  wheels" section, then a folded "Other sizes (new wheels needed)" by
  diameter (open by itself when nothing fits, e.g. a Civic's 14s).
- Also fixed: a factory tire's text now gives its real size (wheel
  diameter, widths, height from the size: a Civic's 185/60R14 said "fits a
  15 in wheel").
- Bench (694 hp Fox, launch tuned): 255 11.14, 275s 10.85, 295 10.73, 315
  10.58; slicks 24.5 10.97, 26x8.5 10.60, 26x10 10.31, 28x9 10.33, ET 28
  10.02, 29.5 10.06, 31 10.12, 32 10.15, 33 10.19 (the tallest are slower
  at this power). AWD big-brake cars can't take the 315 radials on the
  front (front wells = factory + 2 in): they stay on 275/305.
- Tests: 1,860 builds clean (aud1), rivals 0 diffs, qolsmoke, pkgsmoke, c2
  clean, screenshots scr/tireui.js.

## Sources
- mickeythompsontires.com: ET Street R, ET Street S/S, ET Street Radial Pro,
  ET Drag pages (embedded size data: section width, outside diameter,
  approved rim widths, weight, price), downloaded Nov 15; tiresize.com ET
  Street R 315/55R17; Jegs 28x9 and 32x14 listings; Dragzine on new big
  ET Drag sizes.

## Follow-up (Nov 15): brakes blocking a wheel size
Owner: no 17 in front wheels on the '18 Mustang GT though a 17 in tire was
on the front. Working as researched (S550 GT front needs 18 in over the
factory brakes; drag brakes clear 15 in), but the shop never said why.
Text only: `DR.brakeBlock` / `DR.brakeText` (parts.js) add the reason to
the "tires don't fit" warning and the tire window; the wheel list header
names the drag-brake size; folded tire sizes your brakes block are labelled
"needs drag brakes" (or "too small for your brakes"). Rivals 0 diffs,
packages 0 diffs, qolsmoke clean.
