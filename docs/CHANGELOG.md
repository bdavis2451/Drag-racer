# What changed

Short notes for testing, newest first.

## Turbo rework: real spool, new turbo lineup, spec sheets

- **Turbos now come on boost the way real ones do.** The game works out
  spool from your engine and the turbo together: displacement, how high it
  revs, how well it breathes (heads and cams count), exhaust heat, and the
  turbo's own wheels and housing. A big turbo on a small engine is lazy, the
  same turbo on a big V8 lights early; a single turbo on a V8 (long crossover
  pipes) spools later than twins. Boost also has to spin the turbo up, so
  big wheels lag more and ball bearings recover faster after a shift.
- **New lineup, named like the real ones** (compressor/turbine wheel sizes):
  singles 5057, 4847, 5558, 6266, 7275, 7685, 8891, 9498; twins 4847, 6266,
  7685 and the 9498 Pro Mod pair. **Single** and **Twin** sections in the
  shop, and only the sizes that suit your engine show up. Twins need 6+
  cylinders. Your old turbo becomes the nearest new one (61mm -> 6266, 80mm
  -> 7685, the others keep their slot).
- **Spec sheet:** tap a turbo in the shop (or **Turbo specs** on the dyno):
  wheel sizes, housing, bearing, max boost, the power it supports, and on
  your engine where boost starts and where it's full, with a boost chart and
  warnings (too big / runs out of air).
- **Factory turbos are the real ones** (TD05 twin-scroll on the Evo, VF48
  on the STI, CT20B sequential twins on the Supra, HT-12 sequentials on the
  RX-7, VTG on the 911, HE300VG on the Ram...). Most stock cars now run
  closer to their real timeslips.
- **Manifolds tell the truth:** the cast log answers quickest; tubular and
  equal-length make more top end but spool a touch later. **New: Twin-Scroll
  Divided Manifold** ($2,600, fours and inline sixes): a few hundred rpm
  sooner, chokes a little sooner at big power. Wastegates are boost control
  only now (no "spools sooner").
- **Rivals changed too:** about half the turbo rivals' times moved (most by
  a few hundredths; some bosses are up to ~0.4 s quicker). A career balance
  pass comes next.

**Try:** Upgrade > Turbo / Supercharger: open a few turbos and read the spec
sheet on your car; fit one and do a dyno pull. **Look out for:** a turbo
that should suit your engine but doesn't show up, spool numbers that feel
off for a combo you know, or a rival that's suddenly out of reach.

## Manual burnout shifting, pick your gearbox at the dealer

- **Manual cars shift in the burnout.** While you hold GAS in the box, the
  yellow button reads **SHIFT**: tap it for 2nd, then 3rd. Let off the gas
  and it's **STAGE** again. Cars with a manual valve body (ratchet shifter)
  shift the same way; regular automatics still shift themselves.
- When the revs are up in 1st, the coach line says "Tap SHIFT for 2nd".

- **Dealer: pick the gearbox.** About 20 cars that came from the factory
  with a manual or an automatic now ask which one when you tap Buy, with the
  real option price (e.g. '18 Mustang GT 10-speed auto +$1,595, Hellcat
  6-speed manual -$1,995, Chevelle Turbo 400 auto +$250). The one you pick is
  the car's factory gearbox. Cars you already own don't change.
- **Free sponsor car:** the same gearbox choice, and your sponsor pays for
  either one.

**Try:** a manual car on slicks: hold GAS, tap SHIFT once or twice, let off,
tap STAGE. **Look out for:** a STAGE tap that shifts instead (it only shifts
while your finger is on the gas), or the button label not switching back. Buy a car with the other gearbox
and check Upgrade > Transmission says it's the factory one.

## Burnouts, 10-speed, setups, truck & trailer
- Tune: a "⇉ all" button next to each setting puts it into every saved
  setup (rev limiter once, not twice). Gear ratios and boost by gear now save
  into the setup you're working on too.
- New: 10R80 10-speed automatic ($6,500) and a Built one ($9,500, big power)
  in the Transmission shop. It shifts itself (no manual valve body for it).
- AWD burnouts: no more sitting still with four wheels spinning; the car
  rolls slowly through the water spinning all four.
- Automatics (and hired drivers and rivals) shift up in the burnout instead
  of bouncing off the limiter in 1st; a weak car kicks back down.
- Burnout Rev Limit (Tune > Engine, standalone ECU): holds a steady rpm in
  the box. Drag radials heat quicker (short burnout), slicks want a long one.
- Truck & trailer: buy it right on the race-day "Getting there" line; Ray
  texts about it after your first tow or ticket; tickets mention it.
- Try: the Mustang with the 10-speed; a burnout in an automatic, an AWD car,
  and with the burnout limit set; a race day with no truck.

## Contracts, valve body, sound
- Timeslip: after a career win, a line says whether it counted for your
  sponsor ("Counted for Junkyard Joe's: street races 1/2") or why not
  (already counted, the street races are done, another class's race, only
  sponsor and street races count, or they want their product on the car).
- This Week keeps a race you already won when a win there would still count
  for your contract, so a contract can always be finished.
- The race shifter and the manual valve body are two parts now. Manuals:
  Shifter section (Short-Throw $300, Race Lockout $1,000). Automatics: a new
  Valve Body section in Drivetrain (Shift Kit $300, still shifts itself;
  Manual Valve Body + Ratchet Shifter $1,000, you shift it). Automatics that
  had the old part get the matching valve body.
- Engine sound now starts on Full on iPhones too (a phone that already
  picked Simple in Settings keeps it).
- Try: win a street race with a sponsor signed; open Drivetrain on an
  automatic car and on a manual one.

## Tuner rework
- The tuner searches each setting's whole range (2-step, gear, shift point,
  rev limiter), works the launch as a package (2-step, tire pressure, gear,
  boost in 1st, shift point, suspension) in one pass, and goes round a second
  time if anything changed.
- Real passes count for more; a change that ran slower on the slip is undone.
- Never slower: it ends with a confirm pass. If the car isn't quicker than it
  came in, the old tune goes back on and the session is refunded (tuner,
  dyno, track, fuel, driver).
- Every tuner works every setting; skill is how close they get. The Team
  screen says what each skill number means.
- Boost: "went lean" is now "the injectors/pump are maxed out" (with what
  they feed on your fuel). How hard you tell them to push now sets how close
  they run to the fuel system's limit; they never leave it lean with the
  nitrous on.
- Tires first: with drive tires past 25% worn the tuner asks for fresh ones
  before tuning. With a tuner on the team, the garage and the timeslip say
  what worn tires cost ("Aiko: these tires cost about 0.15 s a pass").
- Tested on the tester's Monte Carlo from its 8.25 tune: "On the edge" gets
  it to 8.12 (staff or pro tuner); "Balanced" ~8.18-8.20 (keeps more margin,
  29 psi).
- Try: book the tuner on the Monte Carlo, On the edge, fresh tires; then
  Balanced. Look at the Team screen tuner card.

## Drag tires last longer
- Drag slicks, radials and street tires wear 1.75x slower (research: real
  drag slicks stay useful for ~50 passes). Grip loss when worn is unchanged.
  Circuit tires unchanged.
- Try: watch the drive-tire wear % over a race day; tell me if it feels right.

## Tuner's notes show every check
- The tuner only makes a test pass when a setting looks worth changing;
  the ones it checked and left now show on the notes as CHECK lines ("Launch
  Throttle 100%: already right for this car"), so a short session isn't a
  mystery.

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
