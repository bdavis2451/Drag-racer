# Wheels & tires rework

Status: **started Nov 14 (owner: "let's start the wheels & tires rework").
Owner answered the 8 questions; research gaps filled; written plan drafted
(below), waiting for approval. No code.** FWD traction after
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

## Plan (draft, waiting for approval)
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
| Drag (one-piece) | rear 15x8-15x12, 17x10; front 15x3.5, 17x4.5 | 14-16 lb rear, 10-15 front | $900 | light; runners and drag tires |
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
