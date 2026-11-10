# Feature: contract slip line, This Week reruns, valve body, iPhone sound

Status: **shipped 2026-11-10** (owner OK'd four backlog items; the in-app
browser tip was left out).

## Decisions
- Contract line on the timeslip after a career win: counted (with the
  tally) or why not: already counted, that kind of race already done,
  another class's race, only sponsor/street races count, product missing.
- This Week keeps a won race that would still count for the contract.
- Shifter (manuals only): Short-Throw $300 (15%), Race Lockout $1,000 (28%).
  Valve Body (automatics, Drivetrain): Shift Kit $300 (15%, still shifts
  itself), Manual Valve Body + Ratchet Shifter $1,000 (28%, you shift).
  Same prices and shift speeds as before. Install time 5 h.
- Engine sound default Full on every device; a saved choice is kept.

## Build notes
- career.js `contractLine(ev, sp, out, prodOk)` -> `out.contractLine` from
  `G.winEvent`; race.js shows it in the slip notes (unless the contract was
  just fulfilled, which has its own banner).
- schedule.js: This Week counts `!G.eventWon(ev) || G.countsForContract(ev)`
  (was git stash "this-week contract reruns").
- parts.js `C.valvebody` (needsConverter), `C.shifter` needsShifter =
  manual only; `DR.shiftOpt(inst)` (manual: shifter; auto: valvebody, or an
  old shifter ss1/ss2 mapped by `DR.VB_OF`, which keeps rivals identical);
  packages carry both. physics.js shiftTime / mvb use `DR.shiftOpt`.
- game.js `vbV2` save migration: player automatics' shifter ss1/ss2 ->
  valvebody vb1/vb2. Inventory shifter items are left as they are.
- garage.js valve body icon; calendar.js install hours.
- enginesim.js `A.quality` default 'full'; Settings help text updated.
- Tests: batch1.js (migration, applies, contract lines), rivsnap 0 diffs,
  qolsmoke, pkgsmoke, mvb2, c2, drv, crawl mid (same as before).
