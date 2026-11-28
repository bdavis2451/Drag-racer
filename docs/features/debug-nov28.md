# Debug run, drag side (Nov 28)

Status: **owner's yes (Nov 28): "Fix all found issues, including the hired
driver lift issue ... fix it the absolute best we can."** All five fixed on
branch `drag-debug`; regression running, then ship. Next: the same pass for
the circuit side (`debug-circuit.md`).

The owner asked for "a full debug run of the last few builds focusing on
the drag side": the drag ladder (build 1), race day and the pit (build 2),
the drag tuner at the pit, sponsors (build 3), the Bracket and No-Prep King
ladders (build 4), and what the circuit builds C1-C3 touched on the drag
side (the physics power cap, the new track tires in the tire shop and
packages, the mechanic at endurance stops, the schedule, the couch rent).

## What was run (scratchpad `scrm/`, against the live build)
- **Every existing drag test:** `ltest` (headless ladder: all ok),
  `money`, `web1`-`web14`, `web3` x3 (Heads-Up, Bracket, No-Prep, Street
  through the real race screen). All clean, no page errors.
- **Career soak, calendar off** (`soak1.js`, 4 seeds): whole drag careers
  through the real engine (`DR.Ladder.enter/after`, King nights, the King of
  the Track, the no-prep list and both Kings), random wins, red lights,
  breakage, blown engines; invariants after every step (money, points,
  bracket points, the no-prep list, unlocks never taken away, runs, every
  view function); save/load round trips; every career screen rendered.
  Three full careers (2,678 / 2,949 / 2,963 races, all six classes, both
  Kings won) with no failures; seed 1 stopped in class 3 on a product
  contract (BoostHouse wants a turbo; the soak's car had none: correct).
- **Career soak, calendar on** (`soak2.js`): eight weeks of real race
  weekends by the clock (each slot's window, each call, missed calls now
  and then, the once-a-week lock, King nights, no-prep callouts): 32 race
  days, 85 races, no failures. Missed calls behave (a missed qualifying
  session is no time, a missed round a solo run for the other car, a missed
  callout a loss). The late-entry lock checked on its own for all four
  event types.
- **Screen sweep** (`ui1.js`, phone): a mid-career save (class 3, sponsor,
  associates, bracket points, the no-prep list, a run with the pit):
  Strip, King, Standings, Sponsors, Kings, This Week, the garage, Team,
  Pit & Trailer, the load-up, the pit. No errors.
- **Real-race sweep** (`race2.js`): edge cars (diesel, rotary, carbureted)
  in all four event types through the real race screen, the drag tuner's
  setup job and pass read, a hired driver.
- **Rival snapshot:** identical.

## Findings
1. **Bug (money): a King night counted as several race days.** Each
   callout up the King ladder (and the King) was its own race day in
   `race.js`: the trip (and a chance of a ticket) charged again, your
   driver's wage again, the sponsor's stipend and the associates' day money
   paid again. Ladder events only count the first race of the day.
   **Fix (prepared):** a King night is one race day: the first race that
   night marks it (`c.kingDay`, the King-night window); later callouts
   that night get `cfg.sameDay` and skip the trip, wage, stipend and day
   money (`gear.js`, `race.js`, `legal.js`).
2. **Bug (money): the style bonus on ladder events used every positive
   line of the slip**, sponsor money included (the per-win bonus, a
   contract's bonus, contingency, associates' bonuses, the track awards),
   where the code means "style pays on the purse"; on a street list night
   it used only the last callout's stake (plus those lines). With 3% a
   star, finishing a $7,200 contract with a 3-star car added ~$650.
   **Fix (prepared):** `DR.Ladder.after` gives the run's purse (the round
   money, or the night's stakes) and the style bonus uses it.
3. **Display:** the Kings tab said "No-Prep events finished: 12 / 3" (the
   count past what's needed). **Fixed:** the count stops at what's needed,
   with a tick ("✔ No-Prep events finished: 3 / 3").
4. **Advice: the tuner kept saying "Set it up for this track" after doing
   it.** On a manual car on street tires (the RX-7, the Fox) every pass
   read "It spun off the line" and "Set it up for this track in the pit
   would help", even right after the setup job. The setup does what it can
   (tire pressure 32 → 30), but a hired drag driver still spins about 0.75 s
   at the hit (0.73 after the setup). On drag radials (275/40R17) neither car
   spins at all, and the hired driver matches a perfect launch (RX-7 13.23,
   Fox 14.22). **Fix (prepared, `gear.js` `P.readPass`):** the tuner
   suggests the setup only until it's been done at this event; after that,
   on street or road tires: "It's set up as far as it goes on these tires:
   drag radials would hook it."; on drag tires: "...it needs more tire, or
   less at the hit."; shaking: "...it still shakes, so it needs less at the
   hit."
5. **Bug (driving): a hired drag driver held through every spin for 0.35 s**
   (`physics.js` `AIDriver.fromDrag`, `spinHold`; written "with a car tuned
   to hook, the tire bites": give the tire a chance). Measured over 40 cars
   (stock, drag tires, power package on stock tires, half and fully built),
   prepped / no-prep / street, 1/4 and 1/8, drivers 50 / 70 / 85 / 100 and
   random driver errors (1,188 runs per set, scratchpad `scrc/hold/`):
   - The hold cost **0.26 s a pass on average** against plain pedalling, up
     to **2.7-3.1 s** (a Mustang with the power package on its stock tires).
   - Why: held through a big spin, the engine revs up on the spinning tires,
     the driver shifts at the usual rpm and the car drops into 2nd at
     walking pace and bogs (a stock 370Z shifted at 0.93 s instead of 2.8 s:
     14.55 vs 13.71). Also: lifting to 45% isn't enough for a car with far
     more power than grip (a 2,141 hp Lamborghini, a built Z06 on no-prep),
     where the old hold won by accident (early shifts calmed the tire); and
     lifting costs a turbo its boost (it hooks at low rpm with no boost and
     bogs harder).
   - It also put the bracket dial off: the dial for a hired driver with no
     pass in the car came from a plain practice pass, not their own driving
     (a stock 370Z: dial 13.72, the held pass ~14.5).
   **Fix (owner's yes): the driver reads the spin** (`AIDriver.prototype.input`,
   only when `this.reads`, set by `fromDrag`; rivals and every estimate use
   the plain driver, unchanged):
   - wheelspin: they pedal straight away, as rivals do (a "moment to feel
     it" of 0.014-0.035 s, the last of the old hold, came out after a second
     check: with the tuner's setup done and random driver errors, 1,200
     averaged runs, it was quicker in 26 and slower in 82, and it cost the
     RX-7 and the Fox after the setup 0.14-0.16 s; the physics sits on a
     knife edge at the hit, so it was judged on averages, not single runs);
   - a spin that won't come back (at its rate, more than 0.42 s) for more
     than 0.214 s: lift further, to 27% (not on a turbo);
   - in a spin, the next gear at the car's real speed: if it still makes more
     push than the tire holds (x1.15, or x1.0 once the spin is stuck), take
     it now (a taller gear calms it); if it makes 0.8x or less, wait (it
     would hook and bog);
   - the dial-in practice pass (`DR.Race.trial`, `driverDial`) is driven by
     the hired driver's own model;
   - help text (Settings > Help, the tuner paragraph) says what they do now.
   The RX-7 after the setup (30 psi): an 85 driver now runs 13.37, the same as
   a perfect launch (13.51 before). Second check (1,200 runs, stock / stock +
   setup / power package / power + setup / half built, prepped and no-prep,
   drivers 70 / 85 / 100, three seeds of random errors each): the final
   driver is the quickest of everything tried, 0.045 s a pass quicker than
   plain pedalling on average.
   First check (all 1,188 runs, launch 85, with the moment): **0.30 s a pass
   quicker than before on average**; slower than before by more than 0.05 s in 17 runs (worst
   0.175 s: a built Camaro SS on the street, where flooring it blind happens
   to work); against the better of "old hold" and "no hold" in each run,
   0.04 s quicker on average. Same at launch 50 / 100 and with random
   errors. No crashes, no runs without a time. The game's code matches the
   tested model to the thousandth (36 of 36). Searched: 9 settings, ~300
   random sets, then each piece kept only if it made a difference (a
   trend-based hold and a road-rpm gate changed nothing and came out).
- (Test note: an earlier probe read `DR.simulate(...).wspin`, which isn't
  there; the spin is on `.sim.wspin`. Fixed in `q_rx7b.js`.)
- (Test note: `race2.js` crashed in `DR.Ladder.cfg` (`myPair`, no pairs)
  when the Fox broke in qualifying past what the pit can fix: the test asked
  for the next race of a run in phase `broke`. The game never does: the
  slip offers only the credit or the points, the event card and the pit
  show the same choice, and "Repair at the shop" goes to the garage. The
  test now takes the credit, as a player would.)
- Checked and fine: contracts with a product (only count with it on the
  car), the tow trip and the mechanic's wage paid once at entry, the trip
  shown on the first slip only, the pit jobs (axle, transmission swap with
  the rebuild bill, tire sets, the bottle, the clutch, fitting parts), the
  King of the Track's draw (fixed for the day, redrawn after a lost day),
  the no-prep list (one callout a night, shifts on a win), the late-entry
  lock, the cargo room (a Mustang's trunk takes the tools and an axle, not
  the chiller), old saves from every build.
