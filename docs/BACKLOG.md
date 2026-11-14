# Backlog

What's parked, what's waiting on a decision, and what was decided. Newest at
the top of each section.

## In progress

- **Audit of the turbo, diesel and engine power/knock updates** under the
  new quality rule (owner, Nov 14), with the nitrous-on-boost knock follow-up.
- **Wheels & tires rework** (next after the audit), then **FWD traction**.
  Owner notes Nov 14: wheel width and diameter, a good wheel selection, tire
  selection, chosen separately per axle (front labelled Front; the drive
  axle isn't labelled, the game knows it), new wheel/tire assets and a path
  for adding more. `docs/features/wheels-tires.md`,
  `docs/features/awd-fwd-traction.md`.
- **Career/rival balance after the engine ceilings too:** 19 rivals moved
  (3.2 I6 rivals at 20 psi up to 0.32 s slower, 2JZ-GTE rivals ~0.1 s
  quicker). Folded into the same rebalance.
- **Career/rival balance after the turbo rework.** About half the turbo
  rivals moved (stage 3 boss ~0.45 s quicker, a few others 0.3-0.4 s).
  Agreed: rebalance after the turbo rework (owner, Nov 12).

## Waiting on a yes or no

- **Audit questions (Nov 14), `docs/features/audit-nov14.md`:** big turbos
  aren't sold for the engines whose record builds need them (A list what
  the built engine can use, B what it can use as built now, C keep and lower
  the ceilings); filter superchargers by engine like turbos; nitrous helps
  a turbo spool; diesel Pro/Extreme power packages run 31% risk; a fuel
  setting (or advice) for the tuner on diesels.

- **A bigger turbo for 3.0-3.8 L record builds.** 2JZ-GTE and VR38 stop at
  ~2,350 / ~2,450 hp (twin 7685s run out of flow; Pro Mod twins too big to
  spool). Records are ~3,000 / ~3,500. Option: a ~100 mm single or twin
  8891s. Asked Nov 13.

- **In-app browser tip.** A one-time note to open the game in Chrome/Safari
  when it's running inside Facebook's browser (no sound there). Owner said
  not now (2026-11-10).

## Parked ideas

- **Boost by rpm** (a taper setting): the knock model makes the midrange
  give up a little at high boost; real tunes taper boost from the midrange.
  Only boost by gear exists. Pinned for later (owner, Nov 14).
- **Engine part wear** (turbo, internals): later, after a general rework of
  how wear works in the game (owner, Nov 14). Until then hot exhaust from
  pulled timing stays an engine risk.
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
  you can cover it. Maybe: Ray takes a cut of race winnings once the tab gets
  big, or a gentle nudge text at some amount.

## Loose ends

- **Sound check line in Settings** (from the audio fix) shows "undefined"
  without an audio device. Check what the tester's phone shows, then remove
  it once sound is settled.
- **Hilborn on methanol** runs lean with the stock fuel pump: realistic, but
  may surprise players. Revisit with the carb redo.

## Decided

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
