# Wheels & tires rework (to revisit)

Status: **parked, gathering ideas.** Owner (Nov 11): this may be a bigger
project; they'll send screenshots of other games' wheel/tire screens for
ideas. Wants the wheels and tires area expanded quite a bit.

## The idea so far
Split Wheels & Tires into **front** and **rear**, each knowing the car's
drive layout:
- the driven axle gets the drag tires and drag wheels (beadlocks);
- the undriven axle gets Stock / Skinny runners (a wheel-and-tire kit) / Matching;
- RWD: front = runners, rear = drive. FWD: front = drive, rear = runners.
  AWD: drive tires on both axles (the front the same or a size narrower to fit
  the fenders), no runners.

## Problems it would fix (found Nov 11)
- "Front Tires" really means "the undriven wheels". On FWD those are the
  rear, but the shop calls them front runners and takes the weight off the
  front (the drive wheels).
- On AWD, skinny runners still apply: 14 kg lighter and less rolling drag, with no
  grip lost (about 0.05 s for free). The race tire package fits them to AWD cars too.
- Code: `parts.js C.ftires` (no drive check), `physics.js` extraFront
  uses `ftires.fm` for every layout; the tier 3 `tires` package adds `ft1`.

## Real-world notes
- Front runners are bought as a kit (skinny wheel + tire). The rear gets wide
  drag wheels, often beadlocks.
- AWD drag cars run drive tires all round, often a narrower drag radial up front.
- FWD drag cars run drag tires on the front and skinny rear runners.

## Open questions (waiting on the owner's screenshots)
- How much to expand: wheel brands/styles, sizes, widths, offsets, tire
  compounds, sidewall heights, staggered setups, wheel weight?
- Looks vs performance: should wheel style stay in Style (looks), with
  size/weight in Upgrade?
- Saves: what an existing car's tires and wheels become.

## Ideas list (add as they come)
- Owner's screenshot (Nov 12), Drag Racing: Streets wheels screen: the car
  in the middle, each axle's parts beside it: wheel (size shown, R14), tire,
  spring, shock, brake disc, brake pads; a center tile for the differential.
  Front parts on one side, rear on the other: the front/rear split above.
  Their turbo screen is in `turbo-system.md`.
