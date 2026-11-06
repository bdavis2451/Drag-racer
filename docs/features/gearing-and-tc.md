# Feature: Rear gear unlocks; traction control left off

Status: **decided; plan below, waiting on a go.**

## Gearing problem
Ring & pinion sets unlock by level like everything else, so they read as
"better" as you advance: Highway (taller, Street), Performance +12%
(Street), Drag +25% (Sport, lvl 2), Steep Drag +38% (Pro, lvl 3), then the
Quick-Change (Race, lvl 4). But a high-power quarter-mile car wants
*taller* gears; the steep sets only help low-power cars. The tags push
players the wrong way. Packages already pick the quickest set by sim
(parts.js `gearsFor`).

## Traction control problem
The Race ECU + Traction Mgmt ships with traction control OFF (tune tcSlip
default 0, physics.js ~601). The tester fitted it and never knew to turn it
on. The tuner does set tcSlip (launch job), but only if the ECU was on the
car when tuned, and on a prepped strip off can score best.

## Options sent
Gearing: (A) all fixed gear sets unlock together at Street, no tiers;
(B) a "best for your car" tag from the sim; (C) neutral names (+12%,
+25%, -12%) with what they suit; (D) taller sets for big power at higher
levels.
TC: (1) default on at a safe slip when the ECU is fitted; (2) a note when
it's fitted saying it's off; (3) the street tune always sets it.

## Decided
- Gears: a "best for your car" tag (sim: quickest quarter now), and taller
  sets for big power, unlocking later. Tiers otherwise as they are.
- TC: on by default (~12% slip) when the Race ECU + Traction Mgmt is fitted.
- C1500: no fix; he re-buys it.

## Plan
- Gear sets: add "Tall Drag Gear Set (-20%)" (lvl 3, $750) and "Big-Power
  Gear Set (-28%)" (lvl 4, $800), described as for high-power quarter-mile
  cars that run out of gear. Rivals don't use them (unchanged).
- Shop: a "BEST FOR YOUR CAR" tag on the gear set (or factory gears) the sim
  says runs this car's quickest quarter right now (packages' gearsFor).
- TC: fitting the ECU sets Traction Control to 12% if it was off/unset;
  cars that already have the ECU and TC off get it turned on once (save fix).
