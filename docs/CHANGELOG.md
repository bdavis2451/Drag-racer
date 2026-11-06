# What changed

Short notes for testing, newest first.

## Setup screen: which tune you're working on
- Setup (Tune) has a WORKING ON picker once a car has saved setups. Pick
  "Street tune" (say) and it loads; every change you make saves into it.
  "Unsaved tune" edits the car without touching any setup.

## Promoter: entry fee vs purse
- Fixed: a huge entry fee for a small purse still drew a full field and a
  big projected profit. Racers now weigh the entry against the purse:
  nobody enters when the fee is half the purse or more (booking is blocked
  and says why), and fields only fill when the purse is about 8x the entry.
- Try: plan an event with a high fee and watch the projection.

## Bracket dial-in box
- Fixed: with a hired driver picked, the dial-in box was squashed to a
  sliver by the note next to it. It's full width now, the note underneath.

## Gears and traction control
- The gear shop marks the set that runs your car's quickest quarter right
  now ("BEST FOR YOUR CAR"), or says the factory gears already are.
- Two taller gear sets for big-power cars: Tall Drag (-20%) and Big-Power
  (-28%), unlocking later.
- The Race ECU + Traction Mgmt now comes with traction control on (12%);
  cars that had it switched off get it turned on once.
- Try: open the gear shop on a stock car and on a big-power car.

## Undo last race (tester tool)
- Settings > Undo last race puts everything back as it was just before the
  last race (money, cars, pink slips, damage). One level, once.
- It only covers races from this update on: a car lost before it can't be
  brought back this way.

## Data logger
- With a data logger, every timeslip has a "Data:" line with the one thing
  to fix (rev limiter, bog, early shift; Race logger: wheelspin, boost;
  Pro: lean, traction control).
- The tuner reads your passes from the logger (a better tune in fewer
  passes); with a Race logger they rerun a pass the tires spun on.
- Shop descriptions, the Logbook and Help explain what each logger does.
- Try: fit a Race logger on the high-power car, race on the street, read the
  Data line; book a street tune and compare.

## Traction control hint
- Lose a race to heavy wheelspin and the timeslip points to the Race ECU +
  Traction Mgmt (or says the traction control is switched off in Tune).

## Street tunes, setup pick, tube chassis
- The tuner can tune on the Street, the Strip, or Both (1.7x). Each tune is
  saved as a setup ("Strip tune", "Street tune").
- After "To the lanes", a pop-up asks which setup to run (free to switch).
- Street nights warn when the car runs its strip tune or slicks.
- Lose a street race to wheelspin and the tuner texts with advice (once).
- The tube chassis moved to Chassis / Roll Cage. With it on, the weight
  reduction stages gray out. Past the roll cage, the chassis warning points
  to it, with a button.
- Try: book the tuner for Both, then race a street race with the Street tune.

## Repair banner
- Fixed: the damage banner (Repair / Bill) could sit under the class box and
  the stats panel on a phone. It now sits on top.
- Try: break the car, then tap Repair in the garage.

## Carb rework
- Carb parts only show where they fit: the blow-through carb with a turbo or
  centrifugal, blower carbs with a Roots blower, small-engine carbs on small
  engines.
- Multiport fuel injection is now an Intake Manifold. It needs injectors, a
  throttle body, a standalone ECU and an EFI fuel pump before the car runs.
- Carb cars run a mechanical pump from the factory, with carb pump upgrades.
- Any data logger shows the exact air/fuel on the Tune screen's jets.
- Try: convert a carb car to multiport; check the shop says what's missing.

## Bracket racing drivers
- Hired drivers now drive the finish line in brackets: ahead, they ease off
  to win close without breaking out. Picking a driver fills in their dial-in
  (you can change it).
- Class 3+ bracket rivals dial honestly and drive the stripe too: brackets
  there are real races now.
- Fixed: in a bracket where the rival had the quicker dial, they sometimes
  never left the line.
- Try: a bracket with a hired driver; check the dial they pick and the margin.

## Manual valve body
- With the Race Shifter / Manual Valve Body on an automatic, you tap SHIFT
  for every gear (Auto-shift in Settings still does it for you).
- Try: an automatic car with it fitted; miss a shift and it sits on the
  limiter.

## Lock tags
- When a rival ends two races in a class, the lock tag names the race:
  "Beat Dusty (Knockout)".

## Carburetors
- Older engines run factory carbs; carb upgrades, jetting (Tune screen and
  the tuner), and fuel-injection conversions. Being reworked (see backlog).
