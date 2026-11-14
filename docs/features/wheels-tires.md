# Wheels & tires rework

Status: **started Nov 14 (owner: "let's start the wheels & tires rework").
Plan approved Nov 14 (below). Per-car research done; building.** FWD traction after
this.

## Owner's notes
- Nov 11: may be a bigger project; expand wheels and tires quite a bit.
- Nov 12: screenshot of Drag Racing: Streets' wheel screen (the car in the
  middle, each axle's parts beside it: wheel with its size shown (R14), tire,
  spring, shock, brake disc, pads; a centre tile for the differential).
- **Nov 14:** wheel sizing (**width and diameter**), a **good wheel
  selection**, **tire selection**, chosen **independently for each axle**.
  The front is labelled **Front**; which axle is driven is known to the game
  (and the player) in the background and **not labelled** on the wheel/tire
  screens. It will take **new wheel and tire assets**, and it should **pave
  the way for adding more** of them later.

## How the game does it now (code)
- **Drive tires** (`rtires`, data.js `DR.TIRES`, 14 in the shop): Economy
  195/60R15 to Pro Slick 36x17. Each has grip on a prepped strip (mu), the
  slip it peaks at and how it falls off, ideal pressure, ideal temperature,
  rolling radius (r) and rotating mass. Kinds: Street, Track, Race Slick,
  Drag Radial, Slick. They go on the **driven** axle (AWD: both).
- **Wheels** (`wheels`): Stock, Lightweight (-8 kg), Forged (-14 kg),
  Beadlock Drag (-16 kg, lets very low pressure work). No size.
- **Front tires** (`ftires`): Stock, Skinny Front Runners (-14 kg, less
  rolling drag, almost no cornering grip), Matching (road tires all round).
  Applied to whatever axle isn't driven; on FWD the "front runners" go on
  the rear, on AWD they still apply (a known bug: free ET).
- **Nothing limits fitment:** any car can run a 36x17 Pro slick under a
  stock body; no tubs, no brake clearance.
- **Art:** each car has a hand-drawn sprite sheet with its own wheels per
  build stage (`sheet:car:N`), plus 7 procedural rim styles (five, mesh,
  turbine, pony, split, deep, drag) used for other cars and contexts. The
  drive tire's radius sets how big the rear wheel is drawn; slick / radial
  flags make the rim smaller (taller sidewall); front runners draw a smaller
  front. Rim colour and style are in Style (rims). Wheel *width* is never
  drawn (side view).

## Real world (sources below)
**Diameter and sidewall**
- Drag cars favour **15-inch wheels**: more sidewall to wrinkle and absorb
  the hit on the line, and the biggest choice of drag radials and slicks;
  on a 17 the rim takes up the diameter and leaves less sidewall (Drag Zine,
  "What To Look For", "Tips For Selecting"; LS1Tech 15 vs 17 DRs).
- **Brakes set the smallest wheel**: big factory brakes need 17-18 inch
  wheels; going to 15s needs a drag brake conversion (RC Components, Drag
  Zine "Tips"). Late-model muscle cars often do a 15-inch brake + wheel
  conversion for more tire choices and a better ride.
- **Tire diameter is gearing**: a taller tire lowers the effective ratio
  (more speed per rpm, less leverage); bias slicks **grow** 1-1.5 in at 150
  mph (M/T's Jason Moulton), radials barely grow (more consistent). A
  spooled car's two rear tires must match within 1/2 inch.
- Taller **front runners** give more rollout (quicker reaction, fewer red
  lights): about 28 in vs a 25-26 in stock front.

**Width**
- Tread grows with wheel width: ~1/4 in of tread per inch of wheel past the
  recommended width (M/T's Tom Kundrik). M/T's official stance: wheel within
  1 in of tread width; racers stretch further on beadlocks (275/60R15 on
  15x13-15x15).
- **Wider wheels cut tire shake**: stretching the sidewall makes the tire
  more stable; a 275 radial tops out around a 13-inch-wide wheel (some go
  15), big Pro Mod slicks on 18-inch-wide wheels; on radials a wider wheel
  lets them run more pressure (~20 psi) and hook better (RC Components'
  Shawn Riggsbee, Drag Zine "Going Wide"). Bracket cars under ~800 hp gain
  little and don't need beadlocks.
- Going wide without a beadlock can pull the tire off at speed; never rim
  screws on a radial.

**Construction (tire type)**
- **Bias-ply slick**: wrinkles and absorbs energy; needs controlled slip;
  wider tuning window, forgiving on poor tracks, more squat on launch;
  grows downtrack.
- **Drag radial**: needs to dead-hook, very pressure-sensitive, wants a
  prepped track and suspension set up for separation; more efficient: 0.05-
  0.10 s quicker in the 1/8 on a good track; no growth, more consistent.
- **Radial slick** (Pro Bracket Radial, "Bubba"): radial carcass with a
  slick tread, the newest type.
- Heavy (3,000+ lb) cars with 800+ hp want firmer compounds and stiffer
  sidewalls; slicks need "toughness" so they don't tear when they spin.
- Real weights: a 275/60R15 drag radial ~30-32 lb (M/T ET Street R / S/S /
  Radial Pro); a 15x10 drag wheel 16-21 lb (Weld); a stock front wheel and
  255 tire ~46 lb; race-only (SFI) wheels ~10% lighter than street (DOT)
  ones.

**Fitment**
- About **275 is the most a classic muscle car takes without tubs**; 295 is
  borderline (backspacing, ride height); **315 / 28x10.5 and up need mini-
  tubs**; big slicks need **full tubs** (a custom back half). Leave 3/4-1
  in of side clearance for slick growth.

**Classes** use tire size: small tire / X275 (275 radial), 28x10.5 slicks,
Radial vs The World (315), Pro Mod (34.5-36 in slicks). The game's class
races already include "275 radials".

## Other games
- **Forza Horizon 6:** tire width per axle; wider = more grip, more weight,
  a little drag; rim size changes weight and sidewall. Drag-style RWD builds
  run a wider rear (e.g. 285 front / 325 rear).
- **CarX Drift Racing 2:** width per axle (balance by widening rear or
  narrowing front).
- **Gran Turismo:** rim size is cosmetic.
- **Automation:** tire width, profile, rim size and compound per axle;
  width and compound do most of the work.
- **Drag Racing: Streets** (owner's screenshot): wheel size per axle shown
  on the wheel tile, tire, brakes and suspension per axle around the car.
- (No Limit Drag Racing 2 and Pixel Car Racer: no reliable source found on
  how their wheel sizes work.)

## Options for the owner (draft)
**1. Screens.** The Wheels & Tires section splits into **Front** and
**Rear**. Each axle has: **Wheel** (style, then diameter and width from the
sizes that style comes in) and **Tire** (type and size, listed only in sizes
that fit that wheel). The driven axle isn't labelled; the game knows it (a
drag radial on an undriven axle is allowed, it just doesn't help).
**2. What the sizes do (physics):**
- Wheel diameter -> how much sidewall the tire has (taller sidewall: more
  launch give, less shake on drag tires; shorter: steadier on a circuit) and
  wheel weight; sets which tires fit; brakes set the smallest diameter.
- Wheel width -> how much the tire is stretched: more tread on the ground,
  less shake, more pressure possible on radials; too wide without a
  beadlock risks the tire coming off.
- Tire size -> grip (width), effective gearing and rollout (diameter),
  weight, rolling resistance; bias slicks grow downtrack.
- Tire type -> as now (street, track, drag radial, radial slick (new?),
  bias slick, front runner).
**3. Fitment:** wide rear tires need tubs (mini-tubs for 315 / 28x10.5,
full tubs for big slicks) and big brakes need bigger wheels: new parts in
Chassis / Brakes, or simply warnings?
**4. Catalog size:** about 8-10 wheel styles (factory, street 5-spoke,
mesh, lightweight forged, drag star, beadlock drag, double-beadlock Pro,
skinny front runner), each in its real sizes; tires by type in their real
sizes (front runners 26x4.5 / 28x4.5; drag radials 275/60R15, 275/40R17,
315/60R15...; slicks 28x10.5 to 36x17).
**5. Assets and the path for more:** wheels become data (style, kind, sizes,
weight per size, price, art key) so a new wheel is one entry plus its art;
art: a small sprite set per style at a few diameters, the procedural rims
as the fallback; the car sheets keep their hand-drawn wheels until a player
changes them. Tire sidewall and diameter drawn from the tire's real size.
**6. Saves and rivals:** today's tire + wheel + front tire map to the nearest
new front/rear combo; rivals keep their times unless we rebalance
(career rebalance is already planned).

## Owner's decisions (Nov 14)
1. **4 slots:** Front Wheel, Front Tire, Rear Wheel, Rear Tire (wheel:
   style, diameter, width; tire: from the sizes that fit that wheel).
2. **One wheel choice:** each wheel is a real model with its own look,
   weight and sizes; what you buy is what you see. Colour/finish in Style.
3. **Fitment: tubs + brake rule.** Wide rear tires need tubs (new Chassis
   parts: mini-tubs for 315 / 28x10.5, full tubs for big slicks); big
   brakes set the smallest wheel (drag brakes allow 15s).
4. **Research: dig further** (forum and retailer pages in full by plain
   curl; anything blocked listed for the owner).
5. **Tire types:** Street, Track, Road race slick, Drag radial, Bias slick,
   and **new: Radial slick**.
6. **Catalog: lean** (about 5 wheel styles, about 20 tires).
7. **Art: every wheel style drawn up front** (no procedural stand-ins).
8. **Everything at once** in one update: slots, sizes, physics, fitment,
   art, saves.
Next: fill the research gaps, then the one-page plan with every item and
price for item-by-item approval.

## Research gaps filled (Nov 14, second pass)
Read in full (plain curl): Mickey Thompson's official product pages (sizes,
diameters, approved wheel widths, weights, prices for ET Drag slicks, ET
Street R radials, Pro Bracket Radial slicks, ET Front runners), Drag Zine's
bias-ply vs radial slick track test, Three Piece's S550 fitment guide,
Beefcake Racing's S197/S550 drag-pack fitment, a Hoosier Pro Mod slick
listing. Tables saved in scratchpad web/wt2 (mt_specs.txt).
- **Real tire data (M/T, per tire):** 28x10.5-15 slick 28.1 in, 12.5 in
  wide, 9-11 in wheel, 23-24 lb; 31x13-15 31.0 in, 12-14 in wheel, 32 lb;
  33x16.5-15 33.5 in, 15-17 in wheel, 37 lb; 35x15-16 40.6 lb. Hoosier Pro
  Mod 33.5x17-16: 33.6 in, 17 in tread, 15-16 in wheel, 41.1 lb. Drag
  radials: 275/60R15 28.2 in, 7.5-9.5 in wheel, 30 lb; 275/40R17 26.1 in,
  27 lb; 315/60R15 30.1 in, 8.5-11 in wheel, 37 lb; 305/45R17 28.1 in, 33
  lb. Radial slicks: 28x10.5R15 28.0 in, 10-12 in wheel, 28.7 lb;
  31x13.5R15 31.9 in, 12-14 in wheel, 40.7 lb. Front runners: 26x4-15 26.1
  in, 12 lb; 28x4.5-15 28.0 in, 13 lb; 26x4-17 11 lb.
- **Radial slick** (Drag Zine test, M/T's Jason Moulton): radial carcass,
  slick tread; run 15-17.5 psi (vs 7-12 for a bias slick), adjusted in half
  psi; no sidewall wrinkle, less rolling resistance, more repeatable, longer
  life; M/T recommends them for automatics. Test car: 6.33 -> 6.21 in the
  1/8 (some weight also came out), "stability at the top end".
- **S550 Mustang (modern muscle):** brakes are the limit for small wheels:
  17 in is the smallest rear with factory brakes, a 15 in rear needs a drag
  brake kit; an 18x5 front runner clears the GT's Brembos; a GT350 needs 19
  in. A 305/45R17 drag radial fits the stock body and doesn't rub.
- **Fox Mustang (classic muscle-era body):** 275/60R15 or 28x10.5 on a 10 in
  wheel with ~6.5 in backspacing is the usual most without tubs (sometimes
  rolled fender lips) (search summaries of Stangnet threads).
- **Wheel weights (one wheel):** one-piece 15x10 drag wheel 14-17 lb (Weld
  Draglite ~14, Centerline 14.5, Race Star Drag Star 17 per JEGS / 22 per
  another seller); 17x4.5 front runner ~15-16 lb (Weld AlumaStar), 15x3.5
  ~10 lb; factory 18x8 alloy ~24-32 lb (forum figures). Beadlock adds a
  ring: ~4-6 lb more than the same wheel without.
- **Still blocked** (they block automated readers; per our rule left
  blocked): Stangnet, LS1Tech, JEGS tech articles, Summit, Weld's own site.
  The owner can paste anything from them that matters.

## Plan approval (owner, Nov 14)
- **Catalog approved as listed** (5 wheel styles, 20 tires, prices per pair).
- **Art: Claude draws it** (pixel sprites in code, matched to the car
  sheets; screenshots to the owner before it ships).
- **Old saves with a tire that now needs tubs: keep it, flagged:** the car
  can't race until tubs are fitted (the shop/garage says why and what fixes
  it).
- **Per-car limits researched car by car** (factory wheel and tire, widest
  rear tire without tubs, smallest wheel over the factory brakes), listed
  here with sources.

## Build decisions (owner, Nov 14, during the build)
- **Packages (Wheels & Tires):** each tier picks the biggest tire of its type
  that fits the car's wells and brakes. Street: drag radial on drag wheels.
  Sport: + drag brakes and a bigger radial or a 28x10.5 radial slick. Race:
  28x10.5 slick or radial slick on beadlocks + front runners (+ mini-tubs if
  needed). Extreme: 31x13 slick on beadlocks + mini-tubs + drag brakes +
  front runners. Prices follow the parts.
- **Style rims:** the wheels get a car-show star rating, stay in Upgrade >
  Wheels & Tires, and Style's Rims spot becomes a link to them.
- **Old saves with wheels inside the brakes** (the old Extreme tires
  package: carbon brakes + 15 in beadlocks): kept, flagged, can't race until
  changed (as the tubs rule).
- (Found in the build) the drag wheel gets an **18x5** runner and a
  **26x6.0R18** runner tire for Brembo cars; the 17 in runner is a 17x4
  with a 26x4.0-17 tire (M/T's approved width).

## Plan (approved Nov 14)
**Where:** Upgrade > Wheels & Tires (replaces the Wheels, Drive Tires and
Front Tires slots) with 4 slots: **Front Wheel, Front Tire, Rear Wheel, Rear
Tire**. The driven axle isn't labelled. Tubs in Upgrade > Chassis. Wheel
colour/finish in Style (the wheel style itself is the part).

**Wheels (5 styles, priced per pair; size picked when you buy):**
| Style | Sizes | Weight (each) | Price/pair | Does |
|---|---|---|---|---|
| Factory | the car's own | car's own | (fitted) | as now |
| Street 5-spoke (cast) | 15-20 in, 7-10 in wide | ~22 lb | $600 | looks, fits street/track tires |
| Forged lightweight | 17-20 in, 8-11 in wide | ~18 lb | $1,800 | -4 lb a corner, circuit |
| Drag (one-piece) | rear 15x8-15x12, 17x10; front 15x3.5, 17x4.5, 18x5 | 14-16 lb rear, 10-15 front | $900 | light; runners and drag tires |
| Beadlock drag | 15x10-15x16, 17x10, 16x16 | 19-26 lb | $2,200 | low tire pressure without the tire spinning on the rim; wide sizes for big slicks |

**Tires (20, priced per pair; listed only in sizes that fit the wheel):**
| Type | Sizes | Price/pair |
|---|---|---|
| Street | 195/60R15, 225/45R17, 255/40R18, 305/30R20 | $300 / 500 / 800 / 1,100 |
| Track (R-compound) | 255/40R17, 315/30R18 | $1,200 / 1,800 |
| Road race slick | 300/680R18 | $3,200 |
| Drag radial | 245/50R16, 275/60R15 (new), 275/40R17, 315/60R15 | $650 / 850 / 900 / 1,300 |
| Radial slick (new) | 28x10.5R15, 31x13.5R15 | $1,900 / 2,800 |
| Bias slick | 28x10.5-15, 31x13-15, 33x16.5-15, 36x17-16 Pro | $1,600 / 2,600 / 4,200 / 7,500 |
| Front runner | 26x4-15 or 17, 28x4.5-15 | $500 / 600 |

**What the sizes do (physics):**
- Tire diameter (real OD) = gearing and rolling radius, as now; weight
  from the real tire + wheel (rotating mass).
- Tread width + type = grip (as now: the existing tire grip values stay for
  their sizes; new sizes slot between).
- **Wheel diameter -> sidewall:** the same tire type on a 15 has more
  sidewall than on a 17: more give on the hit (a softer launch), a little
  more prone to shake on radials; a 17 is steadier.
- **Wheel width within the tire's approved range:** narrow end = the tire
  rolls more (more shake), wide end = stretched and stable (less shake,
  radials take more pressure).
- **Bias slicks grow** with speed (to about +1 in at 150 mph: a taller
  gear down track); radials and radial slicks don't.
- **Radial slick:** grip between a big radial and a bias slick of its size,
  wants 15-17.5 psi, no wrinkle, less rolling drag, more repeatable passes.
- **The undriven axle:** front runners save weight and rolling drag (as
  now). On AWD both axles are driven: runners are allowed but they are drive
  tires there (no free ET).

**Fitment:**
- **Tubs (new, Upgrade > Chassis):** Stock wheel wells (each car's widest
  rear tire: e.g. a Fox ~275 / 28x10.5, an S550 ~315, a compact ~225-245);
  **Mini-tubs $2,500** (to ~315 / 31x13); **Full tubs $6,000** (any slick).
  Tube chassis, Pro Mod and dragster already have full tubs.
- **Brakes set the smallest wheel:** each car's factory brakes (e.g. S550
  GT 17 in rear, GT350/Hellcat 19-20); Drag brakes allow 15 in; Big brake
  kit 18 in; Carbon 19 in. The shop lists only the wheels that clear.
- Front/rear: a slot only lists what fits that axle.

**Per car:** every car gets its factory wheel and tire size, widest rear
tire without tubs and smallest wheel over its brakes (researched car by car
during the build from factory specs; listed in this file).

**Saves:** today's drive tire, wheels and front tires map to the nearest
new combination (beadlocks stay beadlocks, front runners stay runners); a
car already running a tire that now needs tubs gets them (see question);
nothing on the shelf is lost. **Stock cars and rivals:** factory tires keep
today's physics (stock ETs unchanged); rivals keep their times (snapshot
identical).

**Art:** all 5 styles drawn as sprites at each diameter, in the game's pixel
style, side view (a side view can't show width; the shop and spec sheet
give it); the tire's sidewall drawn from its real size (slicks: tall
sidewall, no tread; radials: a lettering band). The car
sheets keep their hand-drawn wheels until you change the wheels.

**Left out (later if wanted):** rollout and reaction time from front tire
diameter (the game has no rollout), wheel offset/backspacing (implied by
the size choice), tire growth on radials, different compounds per tire,
wheel spacers.

## Per-car limits (researched Nov 14)
**Rules used** (sources below the table):
- **Smallest wheel over the brakes** follows the front/rear rotor size:
  ~11 in rotors clear 15 in drag wheels; 12-12.5 in need 16-17; 13 in
  (most 13 in big brake kits) need 17+; 14 in need 18+; 15-15.7 in
  (Hellcat, R35, Aventador carbon) need 18-20 (Maximum Motorsports "Big
  Brake Caliper and Wheel Clearance"; Wilwood Evo kits "17 in minimum").
  Drag-specific wheels (thin spokes, more barrel room) clear more than
  street wheels: the number is for the drag wheel. Drag brakes allow 15
  in on every car except where noted.
- **Widest rear tire without tubs** = the tire's section width (M/T's
  measured width, inches) the stock wheel well takes, on the right
  backspacing, rolled fender lips allowed. Mini-tubs to ~16.5 in (31x13,
  31x13.5R); full tubs: anything.

| Car | Factory wheel / tire (F; R if different) | Widest without tubs | Smallest wheel F / R (drag brakes) | Confidence |
|---|---|---|---|---|
| Fox Mustang GT '89 | 15x7, 225/60R15 | 12.5 in (28x10.5 or 275/60R15 on 15x10) | 15 / 15 | sourced (factory: Goodyear, forum; fit: Stangnet summaries) |
| Fox LX 2.3 | 14x5.5, 195/75R14 | 12.5 in (same body) | 14 / 14 | factory from spec memory; body as GT |
| Camaro V6 '98 (4th gen) | 16x7.5, 215/60R16 | 12.5 in (275/60R15; 28 in slick max) | 15 / 15 (rear: light caliper grinding) | sourced (CamaroZ28 / LS1Tech summaries) |
| Camaro Z28 '98 | 16x8, 245/50R16 | 12.5 in | 15 / 15 | as V6 |
| Camaro SS '12 (5th gen) | 20x8 245/45R20; 20x9 275/40R20 | 12.0 in (305/45R17; 315 rubs) | 18 / 17 | factory sourced (tiresize.com); wheels: Camaro5 summaries |
| AE86 Trueno | 14x5.5, 185/60R14 | 9.0 in (~225) | 13 / 13 | spec memory; to verify |
| Supra Turbo Mk4 | 17x8 235/45R17; 17x9.5 255/40R17 | 12.5 in (315/35R17, rolled fenders) | 17 / 17 (15 rear needs non-turbo or drag brakes) | sourced (Real Street, MKIVSupra summaries) |
| Civic hatch (EG) | 14x5.5, 185/60R14 | front (driven) 9.0 in (~225) | 13 / 13 | spec memory |
| Neon R/T | 16x6, 205/55R16 | front 9.0 in | 15 / 15 | spec memory; to verify |
| Geo Metro | 13x4.5, 155/80R13 | front 8.0 in | 12 / 12 | spec memory |
| Integra Type R | 15x6, 195/55R15 | front 9.0 in | 15 / 15 | spec memory |
| Golf GTI Mk5 | 17x7, 225/45R17 | front 9.6 in (245) | 16 / 15 | spec memory (312 mm front rotors) |
| Cobalt SS | 18x7.5, 225/40R18 | front 9.6 in | 17 / 15 (Brembo front) | spec memory |
| VW Beetle | 15x4.5, 165R15 | 8.2 in (~205) | 15 / 15 | spec memory |
| MX-5 Miata NA | 14x5.5, 185/60R14 | 9.0 in | 13 / 13 | spec memory |
| Silvia S14 | 16x6.5, 205/55R16 | 10.2 in (255) | 15 / 15 | spec memory |
| S2000 AP1 | 16x6.5 205/55R16; 16x7.5 225/50R16 | 10.2 in | 16 / 16 | spec memory |
| RX-7 FD | 16x8, 225/50R16 | 10.2 in | 16 / 16 | spec memory |
| Evo IX | 17x8, 235/45R17 | 10.9 in (275/40R17 on 17x9) | 17 / 17 | sourced (DSMtuners, dragracingwheels guide, Wilwood) |
| WRX STI (GD) | 17x7.5, 225/45R17 | 10.2 in | 17 / 17 (Brembo) | spec memory; as Evo |
| Skyline GT-R R34 | 18x9, 245/40R18 | 10.9 in | 17 / 17 | spec memory |
| 350Z | 17x7.5 225/50R17; 17x8 235/45R17 | 10.9 in | 17 / 17 | spec memory (my350z: some 17s don't clear Brembos) |
| GT-R R35 | 20x9.5 255/40R20; 20x10.5 285/35R20 | 12.4 in | 18 / 18 (drag brake kits: 17 F, 15 R) | sourced (T1 Race Development, Vivid Racing, AMS) |
| M3 E46 | 18x8 225/45R18; 18x9 255/40R18 | 10.9 in | 17 / 17 | spec memory |
| 911 Turbo (997) | 19x8.5 235/35R19; 19x11 305/30R19 | 12.4 in | 18 / 18 (drag 17 / 15) | spec memory (350 mm rotors) |
| Aventador SVJ | 20x9 255/30R20; 21x13 355/25R21 | 14.0 in | 20 / 20 (drag 19 / 19) | spec memory |
| Nova SS '68 | 14x7, F70-14 | 11.5 in (275) | 14 / 14 | classic-muscle rule (Drag Zine/forums) |
| Chevelle SS '70 | 14x7, F70-14 | 12.0 in | 15 / 14 | classic-muscle rule |
| Charger R/T '69 | 14x5.5, F70-14 | 12.0 in | 15 / 14 | classic-muscle rule |
| Hemi 'Cuda '70 | 15x7, F60-15 | 11.5 in | 15 / 14 | classic-muscle rule |
| Bel Air '57 | 14x5, 7.50-14 | 11.5 in | 14 / 14 | classic-muscle rule |
| Willys gasser '41 | as the game's car | 16.5 in (radiused wells: counts as mini-tubs) | 15 / 15 | gasser build |
| Monte Carlo SS '87 (G-body) | 15x7, 215/65R15 | 12.5 in (28x10.5) | 15 / 15 | G-body as Fox (TurboBuick summaries) |
| Buick GNX | 16x8, 245/50R16 | 12.5 in | 15 / 15 | as Monte Carlo |
| Mustang Cobra '03 (SN95) | 17x9, 275/40R17 | 11.5 in (275/295) | 17 / 16 (13 in Brembo front) | spec memory + MM rule |
| Mustang GT '18 (S550) | 18x8, 235/50R18 | 12.6 in (305/45R17 doesn't rub; 315) | 18 / 17 (18x5 runner clears Brembo; 15 rear needs drag brakes) | sourced (Three Piece, Beefcake Racing) |
| Corvette C5 | 17x8.5 245/45R17; 18x9.5 275/40R18 | 12.6 in (315/35R17) | 17 / 16 | sourced (CorvetteForum summaries) |
| Corvette Z06 (C6) | 18x9.5 275/35R18; 19x12 325/30R19 | 13.1 in | 18 / 18 | spec memory (14 in rotors) |
| Challenger Hellcat | 20x9.5, 275/40R20 | 11.8 in (305/45R17 easy; 315/50R17 needs trimming) | 18 / 17 (18x5 drag runner; 17x10-17x11 beadlock rears) | sourced (dragracingwheels.com, Hellcat forum summaries) |
| Viper ACR | 18x11 295/25R18; 19x13 355/30R19 | 14.0 in | 18 / 19 | spec memory |
| C1500 | 15x7, 235/75R15 | 13.0 in | 15 / 15 | spec memory; to verify |
| F-150 Lightning | 18x9.5, 295/45R18 | 13.0 in | 17 / 17 | spec memory (13.1 in rotors) |
| Ram 2500 Cummins | 17x8, 265/70R17 | 13.0 in | 17 / 17 | spec memory |
| Pro Mod Camaro | 15 in drag wheels, slicks | full tubs | 15 / 15 | race car |
| Top Dragster | 17x2.5 front, 16x16 rear | full | 15 / 15 | race car |

"Spec memory" = factory specs I know well but didn't find a page for this
pass; the stock car keeps today's physics either way (factory tires keep
their current values), so these only set what the shop lists. Any the
owner or tester knows better, we change.

**Catalog addition from this research:** the drag wheel gets an **18x5
front runner** size: modern Brembo cars (S550 GT, Camaro SS, Hellcat, GT-R)
can't run a 15 or 17 in front over factory brakes.

## Known issues this rework fixes on the way
- AWD cars get the skinny front-runner benefit (less weight and rolling
  drag) on a driven axle: free ET.
- On a FWD car "front runners" go on the rear (the part is really "tires on
  the axle that isn't driven").
- Any tire fits any car (a 36x17 Pro slick under a stock body).

## Proposals (unless the owner says otherwise)
- Rivals keep their times (their wheels/tires map to the nearest new combo);
  the career rebalance already planned picks up any change.
- Old saves: today's drive tire + wheel + front tire map to the nearest
  front/rear wheel and tire; nothing lost from the shelf.

## Questions for the owner (sent Nov 14)
Batch 1:
1. Slots: Front and Rear each with Wheel + Tire (4 slots), or one combined
   "Front wheels & tires" / "Rear wheels & tires" slot each?
2. Wheels: one choice that is both the part and the look (colour in Style),
   or keep performance in Upgrade and looks in Style?
3. Fitment: tubs as Chassis parts + brakes set the smallest wheel, warnings
   only, or no limits?
4. Research gaps: dig further (forum and retailer pages read only as search
   summaries; JEGS blocks readers), good enough, or the owner pastes?
Batch 2:
5. Tire types: which stay, which are new (radial slick)?
6. Catalog size: lean, medium, big?
7. Art for the first version: how many drawn wheel styles?
8. Smallest version first: what goes in v1, what waits for v2?

## Sources
- Drag Zine: "Going Wide: How Wide Wheels Improve Performance At The Drag
  Strip" (RC Components, Feb 2026); "The Thick Of It: Why Drag Racers Are
  Stretching Their Drive Tires" (Mickey Thompson, Tom Kundrik); "Drag Racing
  Slicks vs. Radials" (M/T, Jason Moulton, Jul 2026); "Tips For Selecting
  Wheels And Tires For Drag And Drive Racing Events"; "What To Look For In
  Wheels And Tires For Street/Strip Action" (Race Star). Downloaded to
  scratchpad web/wt.
- Performance Racing Industry: "Ask the Experts: Choosing Tires for
  Small-Tire Drag Racing" (Coker, Hoosier, M/T).
- SlashGear: why drag cars have skinny front tires.
- Forza Horizon 6 tires & rims guide (forzafire.com).
- Search summaries (not read in full): LS1Tech / Stangnet / CamaroZ28 forums
  on 15 vs 17 drag radials, skinnies, tub fitment; tiresize.com and Summit
  weights for M/T 275/60R15s; Weld wheel weights (JEGS, Summit listings);
  Automation and Gran Turismo forum threads on tire sizing. JEGS'
  "Beginner's guide to drag tires" blocks automated readers (403).
