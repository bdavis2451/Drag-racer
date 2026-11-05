# Feature: Tube chassis / cracked-chassis guidance

Status: **decided; plan below, waiting on a go.**

## Problem
Past what the body takes, the car can crack its chassis on launch. The risk
note says "fit subframe connectors, a roll bar or a cage", even when the cage
is already on. The real answer then is the tube chassis, which lives in
Weight Reduction (Stage 4, $35,000, `w4`) and makes the shell unbreakable.
The player isn't shown or pointed to it.

## How it works now (code)
- physics.js ~551: `S.shell = tube ? Infinity : car.shell * chassis.shellK`
  (tube = weight 'w4' or a car built on tubes). Cage cg3 = 3x the shell.
- physics.js ~878: risk `chassis` when power > shell; note text points to
  connectors / roll bar / cage only.

## Options sent
A. Smarter note + jump: past the cage, the note says a tube chassis is next
   and a button opens it in the shop.
B. Move the tube chassis to the Chassis / Roll Cage section (it's a chassis,
   not a weight kit), keeping its weight saving. Saves move w4 across.
C. Both A and B.
D. Help text only.

## Decided
- Move the tube chassis to Chassis / Roll Cage (as the top option, same
  $35,000, same weight saving and lower CG; takes any power). Saves with
  weight 'w4' move to it, and their weight slot goes back to what it was
  before: stock (the tube chassis carried the weight
  saving itself).
- Risk note: below the cage, as now; with the cage on and still too much
  power, "past even a roll cage: a tube chassis (Chassis / Roll Cage) takes
  any power", with a button that opens that section of the shop.
