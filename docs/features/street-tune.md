# Feature: Street tunes and switching tunes

Status: **decided; plan below, waiting on a go.**

## Problem
The tester must win a street race to unlock parts and can't hook. The hired
tuner only ever tunes on a prepped strip (tuner.js: `DR.conditions('prep')`
for sims and passes), so a tuned car has strip settings (tire pressure,
launch rpm, boost, converter, traction) on the street's lower grip. The
tester doesn't use the Tune screen.

## What exists
- Setup sheets (Tune screen > Setups): save/load up to 10 named copies of
  the whole tune per car, free and instant. Hidden in the Tune screen.
- Race-day screen shows the surface (prepped / no-prep / street).

## Research (thin; mostly practice knowledge)
- Real street/no-prep setups differ: lower launch rpm, less boost early
  (boost by gear / timer), softer hit, tire pressure, traction control,
  suspension separation. Settings from the street are "pretty far off" on a
  prepped track and the other way round.
- Switching: modern ECUs hold several maps switched by a button or laptop:
  free once made. Making each map is tuner time (a second map is usually
  cheaper than the first; pricing not found in sources).
- Mechanical changes (tire pressure, shocks) are free but take minutes; a
  rear-gear swap is real work (quick-change: ~30 min).
- Sources: fordfe.com (prep vs non-prep), stangnet.com (track vs street),
  theengineblock.com (no-prep), streetmusclemag.com, hpacademy.com (road
  tuning), ls1tech.com (unprepped tracks).

## Options sent
1. Tuner session picks the surface: Strip, Street, or both (second one
   cheaper).
2. The tuner's result is saved as a named setup ("Strip tune", "Street
   tune").
3. Switching: race-day screen gets a Setup pick; auto-picks the setup that
   matches the surface; free and instant (map switch), or a small fee/time.

## Decided
- Booking the tuner: pick Strip, Street, or Both. Both costs 1.7x one
  session. The tuner tunes on that surface; each result is saved as a
  setup sheet ("Strip tune", "Street tune"), replacing the old one of that
  name.
- Switching: manual. Right after you accept a race (after "To the lanes"),
  a pop-up asks which setup to run (your current one, or a saved setup);
  free and instant.
- Race-day traction hint: on a street race day, when the car runs a strip
  tune or slicks, a line says why it may not hook and what to do.
- Tuner tip by phone: the first time a street race is lost to wheelspin,
  the tuner texts offering a street tune.

## Future (owner's idea, not now)
- Time-specific tunes for bracket racing: the tuner tunes to a target ET
  (e.g. "8.50 prepped", "9.10 street") and they're saved as setups.
  Expensive, to keep it balanced.
