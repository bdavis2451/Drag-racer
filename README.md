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
- **Deep, menu-based upgrades** across 49 categories in nine shop groups:
  - **Bolt-ons:** air filter, intake manifold, throttle body, headers and exhaust.
  - **Top end:** cylinder heads, cams and the valvetrain. Bigger cams float stock
    valve springs sooner, so they need springs to match.
  - **Bottom end:** pistons, connecting rods, crankshaft, block and oiling. The weakest
    part sets the safe power and the oiling and rotating parts set the safe rpm. Boost
    pistons (low compression) and NA pistons (high compression) trade power for knock
    margin.
  - **Fuel & spark:** injectors and fuel pump (the smaller one sets the power the fuel
    system feeds), fuel type (pump/E85/race gas/methanol), ignition (stock coils misfire
    at high boost or a big nitrous shot) and the ECU. Stock keeps the factory limiter, a
    flash tune raises it to a safe level, a standalone makes it fully adjustable.
  - **Power adders:** turbos from 54 mm to twin 98 mm, roots, twin-screw and centrifugal
    superchargers, intercoolers, wastegates and boost control (a bolt-on turbo's internal
    gate only holds 70% of its boost), blow-off valves (hold boost through a shift),
    2-step and anti-lag, and nitrous up to a 650 shot with a progressive controller and a
    bottle heater.
  - **Drivetrain:** transmissions (manual, automatic, Powerglide, DCT, sequential, Lenco),
    clutches, low/medium/high stall torque converters, transbrakes, flywheels, driveshafts,
    diffs, rear ends and axles (factory axles snap under big launch torque), and RWD/AWD
    conversions.
  - **Suspension:** springs, coilovers, adjustable shocks, traction bars, ladder bars,
    4-links, tubular front ends, chassis stiffening up to a roll cage (a flexy unibody
    wastes anti-squat), wheelie bars and wings.
  - **Wheels & tires:** street tires, drag radials, slicks, beadlocks, front runners and
    lightweight brakes.
  - **Weight:** weight reduction up to a tube chassis, and battery relocation.
  - The shop and install bay flag the parts holding a build back with a red "!".
  - **Quick upgrade packages** (like Need for Speed: Underground 2): Street, Pro and Extreme
    kits for each shop group or the whole car, 10% off. The turbo, fuel system, gearbox,
    clutch and axles are sized to the car's power, boost is set to suit, and parts you
    already have that are as good or better are skipped.
- **Tuning:** boost, launch RPM, launch throttle, throttle ramp, traction control,
  shift point, final drive, individual gear ratios, tire pressure, spring rates,
  shock rebound and compression, anti-squat, wheelie-bar height, and nitrous delay and ramp.
- **Realistic physics:**
  - **Engine:** torque curves, turbo spool and lag, supercharger drive losses, knock
    limits and fuel-flow limits. Turbo spool follows exhaust flow: bigger engines (and
    rotaries, which flow like a piston engine twice their size) spool a turbo sooner,
    more boost takes more revs, and a turbo far too big for the engine may never reach
    its boost before the limiter. Engine weights are real dressed weights.
  - **Rotaries** have their own parts (porting, rotors and apex seals, eccentric shaft,
    housings) and no rods, cams or valves; diesels have no ignition or throttle body.
  - **Drivetrain:** a clutch you can slip or dump, a torque converter with stall speed,
    shift times, and engine/transmission inertia.
  - **Tires:** slip-based grip that peaks and then falls off when you spin, plus tire
    pressure and temperature effects (burnouts heat the tires).
  - **Chassis:** weight transfer through the suspension, real wheelie physics (too much
    and you flip), and wheelie bars that unload the tires when they hit.
- **Parts can break:** too much power for the bottom end, boost past the fuel's knock limit,
  or more torque than the gearbox or axles can hold can blow up the engine, break the
  gearbox or snap an axle mid-race.
  Repairs cost money.
- **Game modes:**
  - **Career (Underground 2 style):** 5 stages of 1/4 mile, 1/8 mile, night street,
    knockout, sponsor and night invitational races, each ending in a boss. Wins reveal more races
    and unlock performance-part levels, body-kit tiers and new cars: each stage boss opens
    the next price tier at the dealer (up to $9k at the start, then $24k, $48k, $110k and
    everything). Rivals drive cars from across the roster.
  - **City map:** the race menu opens on a pixel-art map of the city in the Underground 2 style (pan and pinch-zoom). Markers show where
    this stage's races are (the dragway, the airfield runway, downtown, the harbor docks), the
    Route 99 street-race meet, and the dealer, parts store, car shows and your garage.
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
  (60 ft, 330 ft, 1/8, 1000 ft, 1/4, trap speeds), engine sounds from real recordings of the cars, played as rpm-laddered loops (NFSU2 style), tire smoke,
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
| `www/js/engsamples.js` | Plays the real-engine recording loops, crossfaded by rpm and throttle (in an AudioWorklet). |
| `www/js/engbanks.js` | The recorded engine loops (generated by `tools/engine_samples/`). |
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

## Sound credits

Engine recordings from Wikimedia Commons, used under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), and the Internet Archive, used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). They were cut into seamless constant-rpm loops, and real exhaust pops (see `tools/engine_samples/`):

- Subaru WRX STI: "Subaru WRX STI - engine and exhaust sound (YouTube--bynUdphkbc)" by Hungarian Supercar Spotters, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Subaru_WRX_STI_-_engine_and_exhaust_sound_(YouTube--bynUdphkbc).opus)
- Volkswagen Passat B5 1.9 TDI: "Volkswagen Passat B5 1.9 TDI (remapped, 185 hp) - engine and exhaust sound (YouTube 12P7SQ 48k4)" by tomeko0o3769, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Volkswagen_Passat_B5_1.9_TDI_(remapped,_185_hp)_-_engine_and_exhaust_sound_(YouTube_12P7SQ_48k4).opus)
- Hyundai Santa Fe: "Hyundai Santa Fe - engine and exhaust sound (YouTube rrzahPn Wlw)" by CARSCRAZYS, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Hyundai_Santa_Fe_-_engine_and_exhaust_sound_(YouTube_rrzahPn_Wlw).opus)
- Porsche 996: "Porsche 996 - engine and exhaust sound (YouTube axY2PGvMPdk)" by Robin, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Porsche_996_-_engine_and_exhaust_sound_(YouTube_axY2PGvMPdk).opus)
- Porsche 911 GT2: "Porsche 911 GT2 - engine and exhaust sound (YouTube JyuTsneBJy8)" by timur_kiev_carspotter, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Porsche_911_GT2_-_engine_and_exhaust_sound_(YouTube_JyuTsneBJy8).opus)
- Volkswagen up! GTI: "Volkswagen up! GTI - engine and exhaust sound (YouTube X5nj5rDeoJI)" by Supercars67, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Volkswagen_up!_GTI_-_engine_and_exhaust_sound_(YouTube_X5nj5rDeoJI).opus)
- BMW i8: "BMW i8 - engine and exhaust sound (YouTube IzZtX5KCbvs)" by Erwin Lindsen, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:BMW_i8_-_engine_and_exhaust_sound_(YouTube_IzZtX5KCbvs).opus)
- Honda Civic Type R: "Honda Civic Type R - engine and exhaust sound (YouTube qxhgUfPQ4Cc)" by Vigor, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Honda_Civic_Type_R_-_engine_and_exhaust_sound_(YouTube_qxhgUfPQ4Cc).opus)
- Mitsubishi Lancer Evolution VI: "Mitsubishi Lancer Evolution VI - engine and exhaust sound (YouTube p2UANOqploM)" by prone, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Mitsubishi_Lancer_Evolution_VI_-_engine_and_exhaust_sound_(YouTube_p2UANOqploM).opus)
- Mazda MX-5 Miata: "Mazda MX-5 Miata - engine and exhaust sound (YouTube wKeTXxwpkS0)" by Ride in Japan, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Mazda_MX-5_Miata_-_engine_and_exhaust_sound_(YouTube_wKeTXxwpkS0).opus)
- Honda S2000: "Honda S2000 - engine and exhaust sound (YouTube aTd8viYxxnU)" by Y Racing, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Honda_S2000_-_engine_and_exhaust_sound_(YouTube_aTd8viYxxnU).opus)
- Nissan Skyline R34: "Nissan Skyline R34 - engine and exhaust sound (YouTube 2L4tuUZNQ Q)" by ApelSINKA, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Nissan_Skyline_R34_-_engine_and_exhaust_sound_(YouTube_2L4tuUZNQ_Q).opus)
- Toyota Supra (A80): "Toyota Supra (A80) - engine and exhaust sound (YouTube YlRjnMnHRO4)" by Fabio Rojas Pichardo, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Toyota_Supra_(A80)_-_engine_and_exhaust_sound_(YouTube_YlRjnMnHRO4).opus)
- BMW E46: "BMW E46 - engine and exhaust sound (YouTube lIaGAT4slbs)" by BMW 324TD, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:BMW_E46_-_engine_and_exhaust_sound_(YouTube_lIaGAT4slbs).opus)
- Mazda RX-7: "Mazda RX-7 - engine and exhaust sound (YouTube 4z0y1H2REvE)" by Taz Ringer, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Mazda_RX-7_-_engine_and_exhaust_sound_(YouTube_4z0y1H2REvE).opus)
- Honda NSX (2016): "Honda NSX (2016) - engine and exhaust sound (YouTube- xqpIXpkUGk)" by Motor1, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Honda_NSX_(2016)_-_engine_and_exhaust_sound_(YouTube-_xqpIXpkUGk).opus)
- Opel Omega B 3.0 V6: "Opel Omega B 3.0 V6 - engine and exhaust sound (YouTube pK-1MhnSEuk)" by SzPHamer, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Opel_Omega_B_3.0_V6_-_engine_and_exhaust_sound_(YouTube_pK-1MhnSEuk).opus)
- Renault Laguna II V6: "Renault Laguna II V6 - engine and exhaust sound (YouTube F9eJ7lo4Zno)" by Abakab, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Renault_Laguna_II_V6_-_engine_and_exhaust_sound_(YouTube_F9eJ7lo4Zno).opus)
- Pontiac Trans Am: "Pontiac Trans Am - engine and exhaust sound (YouTube 2tXFxsuuEW4)" by Clifton Slay, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Pontiac_Trans_Am_-_engine_and_exhaust_sound_(YouTube_2tXFxsuuEW4).opus)
- Chevrolet Bel Air: "Chevrolet Bel Air - engine and exhaust sound (YouTube h2EslS4y9Ds)" by DREAMGOATINC, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Chevrolet_Bel_Air_-_engine_and_exhaust_sound_(YouTube_h2EslS4y9Ds).opus)
- Chevrolet Nova: "Chevrolet Nova - engine and exhaust sound (YouTube rWx6H2hl0mI)" by Luciano's Classics, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Chevrolet_Nova_-_engine_and_exhaust_sound_(YouTube_rWx6H2hl0mI).opus)
- Oldsmobile 442: "Oldsmobile 442 - engine and exhaust sound (YouTube xqK8IFpMdE4)" by Luciano's Classics, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Oldsmobile_442_-_engine_and_exhaust_sound_(YouTube_xqK8IFpMdE4).opus)
- Dodge Super Bee: "Dodge Super Bee - engine and exhaust sound (YouTube a-ZakNJM4SQ)" by DREAMGOATINC, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Dodge_Super_Bee_-_engine_and_exhaust_sound_(YouTube_a-ZakNJM4SQ).opus)
- Ford Bronco (1979): "Ford Bronco (1979) - engine and exhaust sound (YouTube h49p3ivoHYI)" by LUNI Classic Cars, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Ford_Bronco_(1979)_-_engine_and_exhaust_sound_(YouTube_h49p3ivoHYI).opus)
- Ford Thunderbird (1955): "Ford Thunderbird (1955) - engine and exhaust sound (YouTube KRMCr2o90FY)" by LUNI Classic Cars, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Ford_Thunderbird_(1955)_-_engine_and_exhaust_sound_(YouTube_KRMCr2o90FY).opus)
- Shelby Cobra: "Shelby Cobra - engine and exhaust sound (YouTube 7StXF8s ElU)" by SKPOWERTV, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Shelby_Cobra_-_engine_and_exhaust_sound_(YouTube_7StXF8s_ElU).opus)
- Cadillac DeVille: "Cadillac DeVille - engine and exhaust sound (YouTube 3F5ktbb-zhs)" by Zachary Petty, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Cadillac_DeVille_-_engine_and_exhaust_sound_(YouTube_3F5ktbb-zhs).opus)
- Chevrolet Monte Carlo: "Chevrolet Monte Carlo - engine and exhaust sound (YouTube fc2HYy5fQQ4)" by AfricaAuddyTech, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Chevrolet_Monte_Carlo_-_engine_and_exhaust_sound_(YouTube_fc2HYy5fQQ4).opus)
- Plymouth Fury: "Plymouth Fury - engine and exhaust sound (YouTube- lfnlRrI8T4)" by Luciano's Classics, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Plymouth_Fury_-_engine_and_exhaust_sound_(YouTube-_lfnlRrI8T4).opus)
- Chevrolet Corvette Z06: "Chevrolet Corvette Z06 - engine and exhaust sound (YouTube 8kg9FOz-zR8)" by Odonnell Chevy Buick, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Chevrolet_Corvette_Z06_-_engine_and_exhaust_sound_(YouTube_8kg9FOz-zR8).opus)
- BMW M3 E92: "2008 BMW M3 E92 s65 V8 Exhaust Sound Recordings (Raw WAV Files)" by Nate Lee, CC BY 4.0, via Internet Archive (https://archive.org/details/2008-bmw-m3-e92-s65-exhaust-sound-recordings)
- Chevrolet Corvette Stingray: "Chevrolet Corvette Stingray - engine and exhaust sound (YouTube TiObDdbrbOs)" by Gripforce Clutches, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Chevrolet_Corvette_Stingray_-_engine_and_exhaust_sound_(YouTube_TiObDdbrbOs).opus)
- Cadillac CTS-V: "Cadillac CTS-V - engine and exhaust sound (YouTube Hy 3QD QdCg)" by Whiep, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Cadillac_CTS-V_-_engine_and_exhaust_sound_(YouTube_Hy_3QD_QdCg).opus)
- Ford Mustang GT (S550): "Ford Mustang GT (S550) - engine and exhaust sound (YouTube 2ceiDjGgpI8)" by Cestni dirkač, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Ford_Mustang_GT_(S550)_-_engine_and_exhaust_sound_(YouTube_2ceiDjGgpI8).opus)
- Ford Mustang Mach 1 (2021): "Ford Mustang Mach 1 (2021) - engine and exhaust sound (YouTube HydyGJGAOrw)" by LSX632 Performance, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Ford_Mustang_Mach_1_(2021)_-_engine_and_exhaust_sound_(YouTube_HydyGJGAOrw).opus)
- Shelby GT500 (2012): "Shelby GT500 (2012) - engine and exhaust sound (YouTube Zc3gxBIXnXU)" by LUNI Classic Cars, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Shelby_GT500_(2012)_-_engine_and_exhaust_sound_(YouTube_Zc3gxBIXnXU).opus)
- BMW E46 (exhaust pops): "BMW E46 - engine and exhaust sound (YouTube lIaGAT4slbs)" by BMW 324TD, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:BMW_E46_-_engine_and_exhaust_sound_(YouTube_lIaGAT4slbs).opus)
- Chevrolet Nova (exhaust pops): "Chevrolet Nova - engine and exhaust sound (YouTube rWx6H2hl0mI)" by Luciano's Classics, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Chevrolet_Nova_-_engine_and_exhaust_sound_(YouTube_rWx6H2hl0mI).opus)
- Dodge Coronet (exhaust pops): "Dodge Coronet - engine and exhaust sound (YouTube etYSBsOh3VE)" by chickinsaw, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Dodge_Coronet_-_engine_and_exhaust_sound_(YouTube_etYSBsOh3VE).opus)
- Mitsubishi Lancer Evolution VI (exhaust pops): "Mitsubishi Lancer Evolution VI - engine and exhaust sound (YouTube p2UANOqploM)" by prone, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Mitsubishi_Lancer_Evolution_VI_-_engine_and_exhaust_sound_(YouTube_p2UANOqploM).opus)
- Pontiac Firebird (exhaust pops): "Pontiac Firebird - engine and exhaust sound (YouTube nj7bWj-io88)" by Luciano's Classics, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Pontiac_Firebird_-_engine_and_exhaust_sound_(YouTube_nj7bWj-io88).opus)
- Pontiac GTO (exhaust pops): "Pontiac GTO - engine and exhaust sound (YouTube Ub3c7nxJC5w)" by Luciano's Classics, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Pontiac_GTO_-_engine_and_exhaust_sound_(YouTube_Ub3c7nxJC5w).opus)
- Toyota Supra (A80) (exhaust pops): "Toyota Supra (A80) - engine and exhaust sound (YouTube YlRjnMnHRO4)" by Fabio Rojas Pichardo, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Toyota_Supra_(A80)_-_engine_and_exhaust_sound_(YouTube_YlRjnMnHRO4).opus)
