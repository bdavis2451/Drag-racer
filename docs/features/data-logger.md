# Feature: Data logger that matters

Status: **shipped 2026-11-06.**

## Today
- dl1 Basic ($500): rpm, speed, gear traces in the Logbook; wideband for carb
  jets. dl2 Race ($1,500): + driveshaft speed (wheelspin vs car speed), boost,
  throttle. dl3 Pro ($4,000): + air/fuel, timing pulled, g, shock travel.
- The tuner ignores it (only carb jets read the wideband). Not explained.

## Decided (owner)
1. The tuner reads the logs.
2. "The data says" line on the timeslip.
3. Explain it (shop text, Logbook, Help).

## Plan
1. Tuner: how much one pass tells the tuner (`TU.record` weight `w`, now from
   the tuner's data skill and the driver's consistency) rises with the car's
   logger: Basic +0.1, Race +0.2, Pro +0.3 (capped). With a Race logger or
   better, a pass the tires spun on is recognised and rerun (like tire shake
   today) instead of misleading the tune. Fewer wasted passes; street tunes
   benefit most (more spin there).
2. Timeslip line (one, the most useful), only with a logger:
   - Basic: "Hit the rev limiter in 2nd" / "Shifted early in 3rd" / "Bogged
     off the line (rpm fell to 2,400)".
   - Race adds: "Spun the tires from 0.4 to 1.1 s (1st)" / "Boost came in at
     1.6 s".
   - Pro adds: "Lean at the top of 3rd (13.4:1)" / "Traction control pulled
     timing 0.3-0.9 s".
3. Wording: shop descriptions say what each logger does for you; the Logbook
   says what the graphs show; a Help paragraph.
- Rivals unchanged. No save changes.

## Build notes
- logbook.js `L.analyzer(inst, S)`: sample(sim) each step; line(sim) picks
  spin > bog > limiter > lean > early shift > TC > boost > clean; spun().
- race.js: `dsA` sampled next to the recorder; slip note "Data: ..."; a
  tuner pass reports 'the tires spun' from it.
- tuner.js: record weight +0.1 per logger level (cap 0.95); a spun pass is
  rerun by any tuner with a Race logger; simPass flags spin (wspin > 0.3).
- Wording: parts.js dl1-3, Logbook header, Help (Data paragraph).
- Tests: dlog.js; rival snapshot 0 diffs; regressions + mid click-through.
