# Pixel Drag

A single-player, side-scrolling **pixel-art drag racing game for Android**. It's inspired by
Drag Racer V3, Pixel Car Racer and No Limit Drag Racing: build, tune and race your way up
from a 110 hp hatchback to a 3000 hp Pro Mod.

## Features

- **43 cars** in seven dealer categories (Compact, JDM, Euro, Muscle, Classic, Truck, Pro),
  from a Geo Metro to a Top Dragster. Names are the real models for now (to be de-branded
  later). Four have sprites traced from reference shots; the rest use a generic body profile
  until they get one. See [docs/CAR_ART.md](docs/CAR_ART.md) for which real model each
  sprite should be drawn from. Every car has its own weight, weight distribution, wheelbase, center-of-gravity height,
  aerodynamics, drivetrain (RWD/FWD/AWD) and engine location (front/mid/rear).
- **38 swappable engines** with their real stock ratings, from a 1.0L three-cylinder up to an 8.6L billet Pro Mod V8.
  Head, cam, intake, header, exhaust and ECU upgrades unlock each engine's own headroom: power and
  the rpm of peak power climb together (a Fox 5.0 on stock E7 heads has far more to gain than an LS3).
  They include rotaries, a diesel, V10s and V12s.
- **Deep, menu-based upgrades** across 31 categories:
  - **Engine:** intake, exhaust, headers, cams, heads, internals, fuel system, fuel type
    (pump/E85/race gas/methanol) and ECU.
  - **Rev limits:** cams/springs and internals set how high the engine can safely spin.
    The ECU sets the limiter: stock keeps the factory limit, a flash tune raises it to a
    safe level, and a standalone makes it fully adjustable (over-revving floats the
    valves and risks the engine).
  - **Power adders:** turbos from 54 mm to twin 98 mm, roots, twin-screw and centrifugal
    superchargers, intercoolers, 2-step and anti-lag, and nitrous up to a 650 shot with a
    progressive controller.
  - **Drivetrain:** transmissions (manual, automatic, Powerglide, DCT, sequential, Lenco),
    clutches, low/medium/high stall torque converters, transbrakes, flywheels, driveshafts, diffs, and RWD/AWD conversions.
  - **Suspension:** springs, coilovers, adjustable shocks, traction bars, ladder bars,
    4-links, wheelie bars and wings.
  - **Tires & wheels:** street tires, drag radials, slicks, beadlocks and front runners.
  - **Weight reduction:** up to a tube chassis.
- **Tuning:** boost, launch RPM, launch throttle, throttle ramp, traction control,
  shift point, final drive, individual gear ratios, tire pressure, spring rates,
  shock rebound and compression, anti-squat, wheelie-bar height, and nitrous delay and ramp.
- **Realistic physics:**
  - **Engine:** torque curves, turbo spool and lag, supercharger drive losses, knock
    limits and fuel-flow limits.
  - **Drivetrain:** a clutch you can slip or dump, a torque converter with stall speed,
    shift times, and engine/transmission inertia.
  - **Tires:** slip-based grip that peaks and then falls off when you spin, plus tire
    pressure and temperature effects (burnouts heat the tires).
  - **Chassis:** weight transfer through the suspension, real wheelie physics (too much
    and you flip), and wheelie bars that unload the tires when they hit.
- **Parts can break:** too much power for the internals, boost past the fuel's knock limit,
  or more torque than the gearbox can hold can blow up the engine or gearbox mid-race.
  Repairs cost money.
- **Game modes:**
  - **Career (Underground 2 style):** 5 stages of 1/4 mile, 1/8 mile, night street,
    knockout, sponsor and night invitational races, each ending in a boss. Wins reveal more races
    and unlock performance-part levels, body-kit tiers and new cars: each stage boss opens
    the next price tier at the dealer (up to $9k at the start, then $24k, $48k, $110k and
    everything). Rivals drive cars from across the roster.
  - **Sponsors:** pick one per stage for a signing bonus, per-win bonuses and a contract
    that must be fulfilled before the boss will race you.
  - **Visual rating:** 0-10 stars from the Body Shop (bumpers, skirts, spoilers, hoods,
    roof scoops, rims, tint, neon underglow, paint finishes and vinyls). It never blocks
    career races; only the looks-focused sponsor asks for a rating.
  - **Car shows:** park your build at a booth next to other custom rides. Rating, rarity,
    power, blowers and neon decide how many people stop by; you earn a little per visitor
    and the top three take the podium and prize money. Four shows from a free parking-lot
    meet to the Pixel Nationals; entry fees and a crowd that tires of the same build keep
    it a side hustle.
  - **Magazine covers:** each new star level puts your car on the cover of Pixel Tuner
    for a small bonus; collect all ten.
  - **Street races:** bet your money, 1/8 mile at night with less grip.
  - **Test & Tune:** free practice runs.
- **Garage (Pixel Car Racer style):** your car in a lit garage bay with the menu down the
  side and arrows to switch cars. The **Parts Shop** sells colour-coded part cards into
  your inventory; **Install Parts** fits them, puts removed parts back on the shelf and
  sells spares. Body Shop cards preview a part before you buy it, and bought kit stays
  free to refit. Every menu uses the same side-rail and card layout: race events as cards with the
  rival's car, a dealership showroom with a turntable, a dyno cell where the car spins
  the rollers while the curve draws, and a paint shop that repaints the car in the bay.
- **On the strip:** a Christmas tree (sportsman or pro), reaction times, a full timeslip
  (60 ft, 330 ft, 1/8, 1000 ft, 1/4, trap speeds), a synthesized engine sound, tire smoke,
  flames, and nitrous purge.

## How to get it on your Android phone

Every time code is pushed to GitHub, a robot (GitHub Actions) builds the Android app for you.

1. On GitHub, open this repository and click **Releases**, on the right side of the page.
2. Open the newest **Pixel Drag APK** release and tap **PixelDrag.apk** to download it on your phone.
3. Open the downloaded file. Android will ask you to allow installing apps from your
   browser ("unknown sources"). Allow it and tap **Install**.

If there's no release yet, open the **Actions** tab to check that the "Build Android APK" job
finished. A green check means it worked.

## Play it in a web browser (for quick testing)

The whole game is plain HTML and JavaScript in the `www/` folder. To run it on a computer:

```
npm run serve
```

Then open http://localhost:8080. It works on a phone browser too; turn the phone sideways.

## Project layout

| Path | What it is |
|---|---|
| `www/js/data.js` | **Cars, engines, transmissions, tires.** Add a car or an engine here. |
| `www/js/parts.js` | **Every upgrade part** and what it does. |
| `www/js/physics.js` | The physics engine: tires, engine, clutch, converter, weight transfer, wheelies. |
| `www/js/game.js` | Money, saving, buying and selling, and the **rival pool**. |
| `www/js/career.js` | **Career stages, events, sponsors, unlocks, cosmetic parts and the star rating.** |
| `www/js/garage.js` | **Garage bay, Parts Shop, Install Parts, Body Shop and the part icons.** |
| `www/js/rooms.js` | **Pixel scenes behind the menus: garage bay, dealership showroom, dyno cell.** |
| `www/js/screens.js` | **Title, starter pick, race menu, tuning, dyno, dealership, my cars and paint screens.** |
| `www/js/carshow.js` | **Car shows (booths, crowd, podium) and magazine covers.** |
| `www/js/render.js` | The scene: sky, track, grandstands, the tree, tire smoke, flames and the day/night lighting pass. |
| `www/js/cars.js` | **Car sprites**, built from swappable parts (see below), plus wheels, brakes and tires. |
| `www/js/ui.js` | All menu screens (garage, shop, tuning, dyno, dealer, paint, and so on). |
| `www/js/race.js` | The race itself: burnout, staging, launch, HUD and timeslip. |
| `www/js/audio.js` | Engine sound synthesizer. |
| `android/` | The Android app wrapper ([Capacitor](https://capacitorjs.com)). |
| `tools/simtest.js` | Prints a simulated 1/4-mile run for every stock car (a physics check). |
| `tools/career.js` | Prints every career event's opponents and ETs, to keep each stage in order. |

### Car art and body kits

Each hand-drawn car in `www/js/cars.js` has a `shell` plus a `kit` of slots
(`fbumper`, `rbumper`, `skirt`, `hood`, `spoiler`, `mirror`). Each slot lists
variants by name, `stock` being the factory part. A variant is a polygon (in
units: 0 = rear bumper, 100 = front bumper, same scale for height) with a
material (`paint`, `trim`, `bumper`, `chrome`) and optional `details` / `lamps`.
To add a body kit part, add a variant (for example `kit.fbumper.street`), then
set `inst.kit = { fbumper: 'street' }` on a car. The sprite picks it up, shades
it and draws panel gaps around it automatically.

## Building the APK yourself (optional)

You need Node.js 22+, Java 21 and the Android SDK (Android Studio installs it):

```
npm install
npm run apk
```

The APK appears at `android/app/build/outputs/apk/debug/app-debug.apk`.
