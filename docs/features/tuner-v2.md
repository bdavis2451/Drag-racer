# Tuner rework: combinations, second sweep, real passes count, never slower, no-gain-no-pay

**STATUS: experiments done with the tester's exact car (2026-11-06). No
code changed. Revised plan below; talking it through.**

## What the experiments found (tester's Monte Carlo, Leila driving, Aiko tuning)
Bench = 8 simulated passes, median, same day/prepped conditions.
- **Tires are most of the half second.** Same car, 8.15 setup: 13% worn
  8.12, 34% 8.20, 50% 8.25, 68% 8.50. His 8.15 passes were on 12-14% worn
  slicks; the 8.5-8.86 passes on 34-72% worn. Nothing tells the player that
  worn slicks are slow, and the tuner happily tunes on them.
- **Tune loss is ~0.13 s:** 8.15 setup 8.12 vs current Strip tune 8.25 on
  fresh tires (current has a 5,000 rpm 2-step and 3.04 gear).
- **The current tuner can't get it back:** 5 sessions from the current tune
  on fresh tires: 8.26 -> 8.23 (best), never near 8.12. Its misses:
  1. 2-step: tries 3,800-4,400 near where it is; 2,500 is quicker.
  2. Final drive: "already right" at 3.04; 3.28 is ~0.03 quicker.
  3. Shift / rev limiter: lowers them to 6,400 / 6,500 from the dyno curve;
     the quicker ET is at 6,600 / 6,700.
  4. Boost: stays 29 (it backed off from 30 for a lean pull).
  5. Suspension untouched (Aiko's chassis skill 53 < 58), but the 8.15 setup
     didn't need it.
- (Test-bench note: a driver record missing its `pot` stat breaks passes;
  real saves always have it. Not a game bug.)

## Revised plan (pending owner)
1. **Tires first.** Before tuning, the tuner insists on fresh drive tires
   if they're past ~25% worn (offers the swap, or warns the result won't
   hold). And the garage / timeslip says when worn slicks are costing time
   ("Drive tires 68% worn: about 0.35 s slower").
2. **Search the whole range, not near the current value**, for launch rpm
   and the gear (coarse sweep over the full range, then fine around the
   best), and tune shift point / rev limit by ET, not only the dyno curve.
3. **Combination search** for the launch package (2-step, tire pressure,
   gear, boost in 1st; front shocks/anti-squat when the tuner knows them).
4. **Real passes trusted more; never leave it slower; no gain, no pay.**
5. **Order:** tires -> chassis -> launch rpm -> gear -> boost by gear/TC.
- **Success test:** from his current tune on fresh tires, the new tuner
  reaches 8.13 or better (median of 5 sessions), and never ends slower.

## Goal (owner)
A car known to run 8.15, sitting at ~8.6 after the tuner: our own tuner must
get it back to 8.15 or better. Test with the exact car (the tester's save:
Settings > Back up save text), starting from its 8.6 tune.

## Step 0: experiments before any code change
- Load the tester's exact car (from his save) into the headless harness.
- Run the current tuner on it many times (local / pro / his staff tuner,
  strip), log every decision: order, what it moved, model prediction vs the
  real slip, final ET. Confirm or refute the findings below.
- Try by hand what a good tuner would: chassis first (tire pressure, front
  rebound/limiter for weight transfer, anti-squat), then launch rpm, then
  boost in 1st/2nd and TC last; see what the car can really run.

## Findings from reading the code (to confirm in step 0)
1. Skill scope decides suspension: a tuner under 58 chassis skill only
   knows tire pressure, 2-step, TC, converter, gear, boost in 1st, launch
   throttle; front shocks/limiter/bump need 75+. So most tuners fix
   wheelspin with TC and boost-by-gear, never the chassis (matches what the
   owner saw).
2. Order inside the launch job: boost in 1st/2nd first, then launch rpm,
   TC... (KEYS.launch). Real practice is the other way: chassis and tire
   pressure first, launch rpm, and power management (boost by gear, TC)
   last to trim what's left.
3. The model can overrule the slip: weight up to 0.95 with a good tuner and
   logger. The tester's notes show exactly this ("the slip says no, but the
   60-foot and the logger say it helps... Keeping 3.04").
4. The model driver/conditions may not match the hired driver's real pass
   (burnout tire temp, reaction, pedalling), so model gains don't show up
   for real.

## Context
The tester's car ran 8.15 before a tuner session and ~8.64 after. The tuner
(www/js/tuner.js) tunes one setting at a time (coordinate descent over
`ss.track`), skips a setting when its model predicts < 0.006 s gain, trusts
its model (`score()`: 3 sims with `modelDriver`) heavily over the real slip
(`TU.record` weight `w` up to 0.95), and never checks that the final tune
beats what the car came in with. With a Quick-Change rear end it had more to
work with (the gear) and still made the car slower (picked a taller 2.84 that
slowed the turbo's spool: 60 ft 1.136 → 1.283). The owner wants: the tuner's
flaws never cost the player; combination search; a second sweep; real passes
trusted more; never leave the car slower.

## Changes (all in www/js/tuner.js unless noted; adjusted by step 0)

0. **Order like a real tuner**: chassis/tire pressure → launch rpm →
   boost by gear → TC last; and let every tuner work the basic chassis
   (rear/front rebound, anti-squat) at least coarsely, the skill deciding
   how close they get rather than whether they try.

1. **Real passes count more** (`TU.record`)
   - Lower the model weight cap (0.95 → 0.6; logger bonus still adds but
     within the cap) so a real slip can overrule the model.
   - Keep a change only if the judged gain is real AND the slip (or the
     60 ft for launch settings) isn't worse than the reference by more than
     the noise band (~0.02 s ET / 0.015 s 60 ft). Otherwise revert it.
   - Log a "kept from the slip" / "the slip says no" note as now.

2. **Combination search for the launch** (new `comboCall(ss)`, used in
   `TU.session` / `TU.nextPass`)
   - When the launch or chassis job is booked, the tuner first works the
     launch as a package in its model: launch rpm (2-step or stall-side),
     drive tire pressure, front shock rebound / limiter, anti-squat, boost
     in 1st (gb1) and final drive (QC cars). Model-side coordinate descent
     over these keys, repeated until no key gains (max 4 rounds), plus a
     small joint grid on launch rpm × tire pressure (and × gb1 on boosted
     cars). Only settings the tuner knows (`TU.knows`) are moved.
   - The combo goes on as ONE real pass ("Launch package: 3,200 rpm, 9 psi,
     front loose, 1st 18 psi"); kept or reverted as a whole by rule 1.
   - Then the existing one-at-a-time items run for anything left.

3. **Second sweep** (`TU.nextPass`)
   - After the last item, if anything was kept this sweep, go round the
     track items once more (`ss.sweep = 2`), stopping when nothing changes.
     Max 2 sweeps. Log "Second sweep" in the notes.

4. **Never leave it slower** (`notes()` / `TU.finish`)
   - Before finishing, make a confirm pass on the final tune (or reuse the
     last pass if nothing changed since). Compare it with the session's
     baseline pass (the tune the car came in with, `ss.t0`, baseline ET
     `ss.baseEt`), using the real slips plus the model, conditions equal.
   - If the final isn't quicker: put `ss.t0` back on the car (and in the
     saved setup), and the notes say "Couldn't beat what you came in with:
     your old tune is back on."

5. **No gain, no pay** (`notes()`)
   - If the session ends with the car not quicker (rule 4 reverted it, or
     nothing was found), refund the tuner's fee and the dyno time (labor +
     dyno) and the test-and-tune tickets and fuel. Car wear stays (the car
     really ran). Notes show "No gain: the tuner's fee is refunded ($X)".
   - A freelancer's fee and a staff tuner's dyno time are both covered.

6. **Strip + Street ("Both")**: rules 4–5 apply to each half separately (the
   street half compares with the tune the car had before the street half).

## Not changing
Rivals (no tuner), the dyno pulls (engine items), prices, the booking UI.

## Files
- www/js/tuner.js: `score()` reuse for combos, `call()`, `TU.session`,
  `TU.nextPass`, `TU.record`, `TU.finish`, `notes()`, new `comboCall()`.
- docs/features/tuner-v2.md (feature file), docs/CHANGELOG.md.

## Verification
- Headless harness (scratchpad tunelog.js pattern): a turbo QC car like the
  tester's (boost 30, 2-step 2500, race converter 5500, TC 18, psi 8.5,
  fd ~3.0, 8.15 baseline). Run a full session via `TU.upcoming` /
  `TU.simPass` / `TU.record` / notes logic: the result must be ≤ baseline
  (never slower), and over ~10 seeds the median should improve.
- Force a bad model (e.g. a tune the model likes but runs slower) and check
  the revert + refund path.
- Regressions: rival snapshot 0 diffs, qolsmoke, c2, drv, tubest (tuner
  Both flow), crawl mid. Then ship and note in the changelog.
