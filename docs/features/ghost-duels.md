# Ghost duels by share code (online multiplayer, step 1)

Status: **on the back burner (owner, 2026-11-06). No code.**

## Context
The owner and the tester want to race each other. Drag racing needs no live
connection: a run can be recorded and raced later as a ghost. This first
step works on GitHub Pages as it is: no server, no accounts, no cost.
Later steps (an online ghost board, cloud saves, live races) can reuse the
same run format.

## How it plays
1. After any pass (test & tune, a race, a street race), the timeslip has a
   **Challenge a friend** button. It makes a link (and a short code) and
   opens the phone's share sheet (text it, Messenger, copy).
2. The friend taps the link: the game opens with "Ben challenges you: 8.15
   @ 164 in a Mustang, 1/4 mile, prepped strip, day. Race it?" (and it's
   also kept under Race > Practice > **Ghost duels**).
3. They pick one of their cars and race it. The ghost runs in the other
   lane exactly as recorded: its reaction time, its launch, every shift.
   Same distance, surface and weather as the original (locked, so it's
   fair).
4. The result slip says who won and by how much, with a **Send it back**
   button: their run goes back as a counter-challenge.

## What a challenge holds (packed into the link)
- Who: player name, the car's look (model, paint, body kit, wheels: what the
  garage art needs), car name, power.
- The run: reaction time and the car's position every 0.05 s from the green
  to the stripe (about 200 numbers for a quarter mile), the timeslip
  splits, the dial-in if it was a bracket run.
- The conditions: distance, surface, day/night, air and track temperature.
- A version number, so old links keep working.
- Size: about 1-2 KB, compressed into the link after a # (never sent to a
  server, works offline once the game has loaded).

## Rules (proposed)
- Heads-up by default (first to the stripe); bracket if the run had a
  dial-in (handicap start, breakouts).
- Friendly: no money or parts change hands, nothing goes on the career.
  (Optional, see question 2.)
- Honor system: a link could in theory be faked. Fine between friends; the
  online board (step 2) is where checks would go.

## Where things live
- Recording: race.js records your car's position every 0.05 s on every
  pass (no data logger needed; separate from the logbook traces).
- Ghost: a lane that plays the recorded positions instead of a simulated
  car (new, small: race.js makeRacer gets a "replay" mode; the dash,
  sounds and tree treat it like an opponent).
- Packing: new js/ghost.js (encode/decode, the share sheet, the inbox).
- Receiving: on load, a #ghost= link opens the challenge; saved to a
  Ghost duels list (last 20) under Race > Practice.
- Car art: DR.carLook data from the link (works for any car in the game).

## Not in step 1
Online storage, leaderboards, accounts, live head-to-head, cloud saves.

## Questions for the owner
1. Heads-up only, or bracket too (dial-in handicap)?
2. Stakes: none, or an honor-system cash bet each player settles in their
   own save?
3. Can you challenge with a hired driver's run, or only your own driving?
4. Should a challenge expire (e.g. 7 days), or live forever?

## Verification
- Record a run headless, encode, decode, replay: the ghost's slip matches
  the original to 0.001 s.
- Two browser profiles: send a link from one, race it in the other.
- Phone check: share sheet on iPhone Safari/Chrome; link opens the game.
- Regressions: rival snapshot, smoke tests, click-through.
