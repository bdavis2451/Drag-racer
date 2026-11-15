# Career / rival rebalance

Status: **next up (Nov 15). Nothing measured or changed yet.** Step 1 is a
playtest by the tester plus a measurement run by Claude (no changes), then a
written plan for the owner.

## What the owner has said so far
- Nov 12 (turbo rework): "Max realism and playability. Reworking career
  balance afterwards is fine." Rebalance after the turbo rework: agreed.
- Nov 12 (diesel): Diesel Dan and the stage 2 boss change with the diesel
  rework and get rebalanced.
- Nov 13 (engine ceilings) and Nov 14 (knock model, wheels & tires): rival
  changes "go into the career rebalance".
- Earlier (balance passes): no rubber-banding: rivals are fixed builds, the
  player has to out-build them.
- Not much said yet about what the career should feel like: questions below.

## Why it's needed
Rivals are fixed builds whose times only move when the physics they share
moves; the player's side has changed a lot since the last balance pass.
- **Rivals that moved:**
  - turbo rework (Nov 12): 70 of 126 rival times, mean -0.04 s, from +0.23 to
    -0.46 s (the stage 3 boss ~0.45 s quicker, a few others 0.3-0.4 s);
  - engine ceilings (Nov 13): 19 of 126 (3.2 I6 "Godzilla" rivals at 20 psi
    +0.32 / +0.21 s slower, 2JZ-GTE rivals 0.10-0.14 s quicker, K20 +0.07);
  - knock model (Nov 14): 6 quicker by 0.01-0.07 s; stock-clutch fix: 5
    quicker by up to 0.05 s;
  - diesel rework: Diesel Dan now drives a real Ram (612 hp, 13.46 street).
- **Player side (rivals frozen on purpose):** wheels & tires rework, FWD
  parts and weight, AWD tire packages, weight reduction rescale (Nov 15:
  tiers 0-2 about 0.03-0.13 s quicker), knock model, diesel fuel setting,
  tuner v2.
- So the gap between "what a sensible player can build by stage N" and
  "the rivals at stage N" has drifted, in both directions, and nobody has
  measured it since.

## The career today
Six drag stages (Backroad Beaters, Rookie Nights, Bracket Bandits, Street
Outlaws, Radial Wars, Pro Mod Legends), about 74 events, 126 rival times,
plus the circuit ladder, street spots, class races, wanderers and car clubs
on the calendar. Rival builds live in `www/js/career.js` / `rivals.js`
(`DR.RIVAL_SET`), the special rivals in `game.js` / `extras.js`.
Race-day scoring (win/dominate targets, reward picks) is built but off
(`DR.RD_SCORING = false`).

## Plan (proposed)
1. **Playtest** (tester): a checklist covering the recent updates plus the
   general career feel (where it's too easy, where it walls).
2. **Measure** (Claude, no changes): the existing career playthrough scripts
   (an optimizer that buys parts sensibly with the money it has, and the
   calendar life sim through the real race screen) on several starters.
   Report per stage: the player's achievable ET vs each rival, money in
   hand, races won/lost, where the curve is flat or walls.
3. **Plan for the owner:** which rivals move (and how: their build, tune or
   driver skill), whether prices/payouts change, what stays. Questions as
   multiple choice.
4. Build, re-run the measurement, ship, tester plays again.

## Open questions for the owner (to talk through)
1. **How hard should it feel?** e.g. the player wins most races with a
   sensible build and loses the boss fights until they push; or every stage
   is a real grind.
2. **Which starters must be viable** all the way (all of them, or some are
   "hard mode": Metro, 2.3 Fox, diesel)?
3. **Rivals:** move rival builds to match (realism), or tune driver skill /
   their setup (keeps their cars as written)?
4. **Money:** is the economy part of this pass (payouts, prices, running
   costs), or rivals only?
5. **Race-day scoring** (built, switched off): part of this, or later?
6. **The bigger turbo for 3.0-3.8 L record builds** (waiting since Nov 13):
   decide before, since it changes the top end of stages 5-6.

## Related parked items
- Career ladder and the calendar (ladder races marked on calendar days).
- Ray's tab (no consequence for an unpaid tab).
- Time-specific bracket tunes.
