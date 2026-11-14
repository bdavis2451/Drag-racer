# Wheels & tires rework

Status: **research done (Nov 14), options drafted for the owner. No code.**
Comes after the audit; FWD traction after this.

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

## Questions to settle first
1. Front/Rear each with Wheel + Tire (4 slots), or one combined "Front
   wheels & tires" and "Rear wheels & tires" slot each?
2. Fitment: real limits (tubs, brake clearance) as parts, as warnings only,
   or not at all?
3. Wheel style: performance (weight, beadlock) in Upgrade and looks in
   Style as now, or one wheel choice that's both?
4. New tire types: add radial slicks? Track and road tires stay?
5. How many wheel styles to draw for the first version?

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
