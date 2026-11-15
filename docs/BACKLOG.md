# Backlog

What's parked, what's waiting on a decision, and what was decided. Newest at
the top of each section.

## Next up

- **Career / rival rebalance** (`docs/features/career-rebalance.md`).
  Rivals have drifted since the last balance pass: the turbo rework moved 70
  of 126 rival times (stage 3 boss ~0.45 s quicker), the engine ceilings
  19 (3.2 I6 rivals up to 0.32 s slower, 2JZ-GTE ~0.1 s quicker), the knock
  model and clutch fix 11 more, while the player side kept improving
  (wheels & tires, FWD, weight reduction, tuner v2). Agreed Nov 12; order
  (Nov 15): tester playtest + Claude measurement run (no changes) first,
  then a plan with questions for the owner.

## In progress

- **Wheel & tire sets for street / strip / circuit**
  (`docs/features/wheel-sets.md`): research done Nov 15, options with the
  owner. No code.

- **FWD/AWD traction** (`docs/features/awd-fwd-traction.md`): AWD tire
  packages and the FWD update shipped (1,500 hp FWD Civic 10.3 -> 8.8; real
  7.8, 60 ft 1.35 vs our 1.70). Remaining gap is front grip (~1.25 g max).
  **Owner is researching the front slick sizes 7-second FWD cars run**,
  then picks: let the wide front end take a 31x13 slick, a FWD slick
  compound, or leave it. Follow-up: the tuner doesn't search the slider
  clutch low enough (tuner work).

## Waiting on a yes or no

Owner's note (Nov 15): playing and sending bugs; open questions go here
to answer later.

- **FWD drag shocks:** Adjustable Drag Shocks adjust front rebound and rear
  bump, which do almost nothing on a FWD car (rear rebound and spring rates
  matter there). Make them adjust rear rebound on FWD cars instead?
- **Front traction bar and K-member share the Front Suspension slot**, so a
  FWD car can't have both. Split them (traction bar under Engine & Trans
  Mounts, or a combined option)?
- **Claude-app preview:** keep republishing it on every push (done since
  Nov 15), or play only the Pages link?
- **AWD tire wear:** only the drive tires wear and get charged for fresh
  tires; an AWD car's front tires never wear. Add front wear and charge both
  axles?
- **Shelf tires are per axle:** a tire bought for the front sits on the
  shelf as a front tire (can't go on another car's rear). Make shelf wheels
  and tires fit either axle?
- **Old FWD saves on a 275 drag radial** are flagged "can't race" until the
  fenders are done, and the front end unlocks at Pro. Give those saves a
  fitting tire swap instead?
- **Tuner and the slider clutch:** the tuner doesn't try base pressure low
  enough (15-20% is quicker on big turbo cars). Widen its search (tuner
  work)?
- **A bigger turbo for 3.0-3.8 L record builds.** 2JZ-GTE and VR38 stop at
  ~2,350 / ~2,450 hp (twin 7685s run out of flow; Pro Mod twins too big to
  spool). Records are ~3,000 / ~3,500. Option: a ~100 mm single or twin
  8891s. Asked Nov 13. Best decided before the rebalance (it changes the
  top of stages 5-6).

## Parked ideas

- **In-app browser tip.** A one-time note to open the game in Chrome/Safari
  when it's running inside Facebook's browser (no sound there). Owner said
  not now (2026-11-10).

- **Wheels & tires later:** rollout / reaction time from the front tire's
  height, wheel offset and spacers, tire compounds, a 16 in drag wheel for
  more big-slick choices, wheel finishes (polished, chrome) in Style.

- **Diesel fuel by rpm** (a boost-referenced fuel limit on the race tune):
  a big compound setup's hottest exhaust is at 1,500 rpm, before the big
  turbo lights, so the single Fuel setting has to come down for the whole
  pass (compounds + 200% injectors: 60%). Real race calibrations limit fuel
  by boost down low. Idea only (Nov 14).

- **Boost by rpm** (a taper setting): the knock model makes the midrange
  give up a little at high boost; real tunes taper boost from the midrange.
  Only boost by gear exists. Pinned for later (owner, Nov 14).
- **Engine part wear** (turbo, internals): wanted (owner, Nov 15): "Aluminum
  rods stretch irl, things wear. I'd like to implement that, but well and
  not in an annoying manner." Big-power engines get freshened on a schedule
  (Pro Mod ~20 runs; aluminum rods ~8-10 runs in nitro, ~20 blown alcohol,
  100+ in a mild bracket engine; GRP says they grow hot and don't really
  stretch, fatigue is the limit). Real: wear by part, faster with power,
  rpm and pulled timing; a freshen-up resets it. Needs the general wear
  rework first (owner, Nov 14). Until then hot exhaust from pulled timing
  stays a per-pass engine risk.
- **Turbo diagram view** (Drag Racing: Streets style: the turbo system laid
  out as a flow diagram). Later (owner, Nov 12).
- **More diesels** (Duramax, Power Stroke) with the next batch of cars
  (owner, Nov 12). Propane and water-meth injection: later. Rework the diesel motors and
  their upgrade paths. Research and test results done (Nov 11), options
  waiting on the owner: `docs/features/diesel.md`.

- **Ghost duels (online step 1).** Race a friend's recorded run from a
  share link. Plan and 4 open questions in `docs/features/ghost-duels.md`.

- **Engine sound by parts on recorded engines.** Recordings change with the
  exhaust (tone, level, limiter, pops) but not headers or cams. Ideas: a
  bigger exhaust spread with a pipe drone, cam lope at idle, header bark.

- **Time-specific tunes for brackets.** The tuner tunes to a target ET
  ("8.50 prepped", "9.10 street"), saved as setups. Expensive. See
  `docs/features/street-tune.md`.

- **Career ladder and the calendar.** How the ladder and the week's race
  days fit together (e.g. ladder races marked on calendar days, This Week
  flagging a ladder race you'd miss). Back burner (owner, 2026-11-10).
- **Engine Simulator audio.** Real or simulated engine recordings, for when
  the game is sold. Open question: how to give access to the tools.
- **Free-to-use engine recordings.** Researched, nothing integrated.
- **Race-day scoring.** Win/dominate targets and reward picks are built but
  switched off (`DR.RD_SCORING = false`).
- **Ray's tab.** When you can't pay Ray on the 1st, his share goes on a tab
  that grows with no limit and no consequence; it's paid in full on any 1st
  you can cover it, or any time with the Pay button (Nov 15). Maybe: Ray takes a cut of race winnings once the tab gets
  big, or a gentle nudge text at some amount.

## Loose ends

- **Sound check line in Settings** (from the audio fix) shows "undefined"
  without an audio device. Check what the tester's phone shows, then remove
  it once sound is settled.
- **Hilborn on methanol** runs lean with the stock fuel pump: realistic, but
  may surprise players. Revisit with the carb redo.

## Decided

- **Tuner, knock risk, fuels, weather** (Nov 15,
  `docs/features/fuel-knock-review.md`): air temperature no longer changes
  the engine (grip only; heat soak between rounds stays); timing-pulled
  zone risk 3% x depth^2; tuners Safe at the knock point / Balanced 1/3 /
  On the edge 60%, no boost past the knock point that buys no power, notes
  state the risk; methanol and old-head limits by option G. Shipped.

- **Chassis parts review** (Nov 15, `docs/features/chassis-parts-review.md`):
  fenders front and rear on every car, FWD rear suspension (stiff rear,
  lockout), FWD front traction bar, FWD halfshafts (no driveshaft),
  flexplates on automatics, diff matters on the circuit. Shipped.

- **More tire sizes** (Nov 15, `docs/features/tire-sizes.md`): 9 real MT
  sizes, tires listed by the fitted wheel's diameter with the rest folded,
  26x10 corrected to its real width. Shipped.
- **Audit Nov 15** (`docs/features/audit-nov15.md`): stale app preview
  republished; old-save matching tires and dragster runners fixed. Noted for
  later: AWD front tires never wear; shelf tires are per axle.

- **Weight reduction audit** (Nov 15, `docs/features/weight-reduction.md`):
  stages rescaled to real weigh-ins (Fox 90 / 219 / 387 / 490 lb), real
  cage weights, Pro Mod / dragster can't take weight stages, cages or
  battery moves, A/C no longer counted twice. Shipped.
- **FWD update** (Nov 14): front wheel wells (rolled fenders, wide
  one-piece front end), 26x10 slick, front race battery, front ballast,
  weight reduction strips the back half on FWD, FWD wheelie bars, slider
  clutch ranges, Extreme drive package keeps FWD cars FWD. Shipped.
- **AWD tire packages** fit the same tire on both axles (Nov 14). Shipped.
- **Wheels & tires rework** (plan approved Nov 14, `docs/features/wheels-tires.md`):
  4 slots, 5 wheel styles, 20 tires incl. radial slicks, tubs + brake rule,
  Claude-drawn wheels, per-car limits, old saves keep over-size tires
  flagged until tubbed. Shipped Nov 15.

- **Dyno work is always paid** (owner, Nov 14): "no gain, no pay" covers the
  track work only; a dyno-only booking costs what its quote says (no track
  day fee for its check pass). Shipped.
- **Diesel head studs** (owner, Nov 14): diesel numbers, studs ~65 psi,
  O-ringed block ~100 psi (factory head ~45). Gas engines unchanged; no
  package used studs on a diesel, so packages unchanged. Shipped.

- **Diesel fuel setting** (owner, Nov 14): shipped. Setup > Engine > Fuel
  (60-100%) on a tuned diesel; the tuner sets boost to the head gasket, then
  turns the fuel down for the exhaust and internals. Also fixed: the tuner's
  "never slower" check now compares with the dyno tune, not the tune from
  before the dyno (it could undo the dyno's safety work).

- **Audit answers (Nov 14):** shop lists turbos the built engine can use (A);
  blowers filtered by engine; nitrous spools turbos; diesel power packages
  made safe; diesel tuner advises on EGT. Shipped. Wheels & tires questions
  held for the rework.

- **Nitrous on boost lowers the knock point** (Nov 14): shipped.

- **Turbo wear: no** (owner, Nov 14). Hot exhaust stays an engine risk.

- **Knock model (Nov 14):** engine-aware knock point (compression, design,
  fuel, charge temperature, rpm), timing pulled past it to a plateau, then
  detonation. Shipped. `docs/features/knock-model.md`.

- Tuner session clipboard (live log, ET chart, summary sheet; one pass at a
  time) when a driver runs the session (owner, Nov 12): shipped.
- Diesel rework (Nov 12): fuel makes the power, real 370 / 800 stock, diesel
  parts list, smoke + EGT, converters capped at 3,000 for diesels, G56 with
  the factory manual calibration, Cummins $12,500 + swap kit, Diesel Dan in a
  real truck: shipped.
- Turbo rework (Nov 12): spool from physics, 8 singles + 4 twins with real-style
  model numbers, Single/Twin sections (Compound with the diesel), spec sheet
  with everything (A/R info only), one bearing per size, real factory
  turbos, honest manifolds + twin-scroll (full trade, gates built in),
  wastegates control only, rivals change and get rebalanced: shipped.
- Nov 11 playtest: all-setups button, 10R80 (+built), AWD rolling burnout,
  burnout upshift / rev limit / tire length, truck & trailer prompts: shipped.
- Manual burnout shifting (SHIFT on the gas, STAGE off it) and the dealer
  gearbox choice (Buy pop-up, real option prices): shipped. The free sponsor
  car gets the same choice, free either way (owner, Nov 11): shipped.

- Contract line on the timeslip, This Week keeps contract races, shifter /
  valve body split, iPhone sound default Full: shipped 2026-11-10.

- Tuner v2 (combination search, whole-range search, second sweep, real
  passes trusted more, never slower + refund, skill = accuracy, tires
  first, fuel limit by aggression): shipped.

- Street tunes (Strip/Street/Both 1.7x, saved setups, pick pop-up, hint,
  tuner text) and the tube chassis move: shipped.

- Bracket racing: hired drivers drive the stripe (lift/brake to win close
  without breaking out), pick their own dial (editable); rivals do it from
  class 3, dialing honest.
- Manual valve body on an automatic: you shift it (Auto-shift still works).
- Lock tags name the race when a rival ends more than one in a class.
- Art changes go to the preview first, live only after approval.
