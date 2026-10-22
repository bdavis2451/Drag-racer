# Car art status

Which real model each car sprite should be drawn from. Names in the game are the real models for now and will be de-branded later (the old made-up name is kept in `alias` in `www/js/data.js`).

Cars marked **traced** have art in `DR.CAR_ART` (`www/js/cars.js`), traced from a side-view reference screenshot. Every other car is drawn with the generic profile for its body type until it gets one; a clean side-view screenshot of the real model is the reference to trace from.

| Unlocks | Category | Id | In-game name | Real model to reference | Art |
|---|---|---|---|---|---|
| Stage 1 | Compact | `pip` | Geo Metro | 1989-94 Geo Metro 3-door hatch (1.0 3-cyl) | placeholder (hatch) |
| Stage 1 | Classic | `beetle` | Volkswagen Beetle | 1967-77 Volkswagen Beetle (Type 1) | placeholder (beetle) |
| Stage 1 | Compact | `ronin` | Honda Civic Hatch | 1992-95 Honda Civic hatchback (EG) | placeholder (hatch) |
| Stage 1 | Compact | `bolt` | Dodge Neon R/T | 2001-02 Dodge Neon R/T sedan (2nd gen) | placeholder (sedan) |
| Stage 1 | JDM | `hachi` | Toyota AE86 Trueno | 1983-87 Toyota Sprinter Trueno GT-Apex hatch (AE86) | **traced** |
| Stage 1 | Muscle | `fox` | Ford Mustang GT '89 | 1987-93 Ford Mustang GT hatchback (Fox body) | **traced** |
| Stage 1 | JDM | `mira` | Mazda MX-5 Miata | 1989-97 Mazda MX-5 Miata (NA) | placeholder (roadster) |
| Stage 1 | Classic | `monte` | Chevrolet Monte Carlo SS '87 | 1983-88 Chevrolet Monte Carlo SS | placeholder (sedan) |
| Stage 1 | Compact | `volta` | Volkswagen Golf GTI | 2006-09 Volkswagen Golf GTI 3-door (Mk5) | placeholder (hatch) |
| Stage 1 | Truck | `hauler` | Chevrolet C1500 | 1988-98 Chevrolet C1500 regular cab (GMT400) | placeholder (truck) |
| Stage 2 | Compact | `cobaltss` | Chevrolet Cobalt SS | 2008-10 Chevrolet Cobalt SS Turbocharged coupe | placeholder (coupe) |
| Stage 2 | Compact | `kaze` | Acura Integra Type R | 1997-01 Acura Integra Type R liftback (DC2) | placeholder (hatch) |
| Stage 2 | JDM | `silvia` | Nissan Silvia S14 | 1995-98 Nissan Silvia / 240SX coupe (S14) | placeholder (coupe) |
| Stage 2 | Muscle | `camaro` | Chevrolet Camaro Z28 '98 | 1998-02 Chevrolet Camaro Z28 (4th gen) | placeholder (sports) |
| Stage 2 | JDM | `z35` | Nissan 350Z | 2003-08 Nissan 350Z coupe (Z33) | placeholder (sports) |
| Stage 2 | Classic | `nova` | Chevrolet Nova SS '68 | 1968-72 Chevrolet Nova SS coupe | placeholder (muscle) |
| Stage 2 | Euro | `m3` | BMW M3 E46 | 2001-06 BMW M3 coupe (E46) | placeholder (coupe) |
| Stage 2 | JDM | `s2k` | Honda S2000 | 1999-03 Honda S2000 (AP1) | placeholder (roadster) |
| Stage 2 | Classic | `belair` | Chevrolet Bel Air '57 | 1957 Chevrolet Bel Air 2-door hardtop | placeholder (classic) |
| Stage 2 | Muscle | `vette5` | Chevrolet Corvette C5 | 1997-04 Chevrolet Corvette coupe (C5) | placeholder (sports) |
| Stage 2 | JDM | `sti` | Subaru WRX STI | 2004-07 Subaru Impreza WRX STI sedan (GD) | placeholder (sedan) |
| Stage 2 | Muscle | `cobra03` | Ford Mustang SVT Cobra '03 | 2003-04 Ford Mustang SVT Cobra 'Terminator' (SN95) | placeholder (coupe) |
| Stage 2 | JDM | `evo` | Mitsubishi Lancer Evo IX | 2005-07 Mitsubishi Lancer Evolution IX sedan | placeholder (sedan) |
| Stage 2 | Muscle | `camss` | Chevrolet Camaro SS '12 | 2010-15 Chevrolet Camaro SS coupe (5th gen) | **traced** |
| Stage 3 | Truck | `lightning` | Ford F-150 Lightning | 1999-04 Ford F-150 SVT Lightning | placeholder (truck) |
| Stage 3 | Classic | `willys` | Willys Gasser '41 | 1941 Willys coupe, gasser build (nose-up straight axle) | placeholder (gasser) |
| Stage 3 | JDM | `rx7` | Mazda RX-7 FD | 1992-02 Mazda RX-7 (FD3S) | placeholder (sports) |
| Stage 3 | Classic | `gnx` | Buick GNX '87 | 1987 Buick GNX (Grand National) | placeholder (sedan) |
| Stage 3 | Muscle | `stang15` | Ford Mustang GT '18 | 2018-23 Ford Mustang GT fastback (S550) | placeholder (modern) |
| Stage 3 | Classic | `chevelle` | Chevrolet Chevelle SS '70 | 1970 Chevrolet Chevelle SS 454 coupe | placeholder (muscle) |
| Stage 3 | JDM | `supra` | Toyota Supra Turbo | 1993-98 Toyota Supra Turbo (A80 / Mk4) | **traced** |
| Stage 3 | Truck | `diesel` | Ram 2500 Cummins | 2010-18 Ram 2500 Cummins 6.7 crew cab | placeholder (truck) |
| Stage 4 | JDM | `r34` | Nissan Skyline GT-R R34 | 1999-02 Nissan Skyline GT-R coupe (BNR34) | placeholder (coupe) |
| Stage 4 | Classic | `charger` | Dodge Charger R/T '69 | 1969 Dodge Charger R/T | placeholder (muscle) |
| Stage 4 | Muscle | `z06` | Chevrolet Corvette Z06 | 2006-13 Chevrolet Corvette Z06 (C6) | placeholder (sports) |
| Stage 4 | Classic | `cuda` | Plymouth Hemi 'Cuda '70 | 1970-71 Plymouth Hemi 'Cuda | placeholder (muscle) |
| Stage 4 | Muscle | `hellcat` | Dodge Challenger Hellcat | 2015-23 Dodge Challenger SRT Hellcat | placeholder (modern) |
| Stage 4 | JDM | `gtr` | Nissan GT-R R35 | 2009-16 Nissan GT-R (R35) | placeholder (coupe) |
| Stage 4 | Muscle | `viper` | Dodge Viper ACR | 2016-17 Dodge Viper ACR (VX) | placeholder (supercar) |
| Stage 5 | Euro | `p911` | Porsche 911 Turbo | 2007-12 Porsche 911 Turbo coupe (997) | placeholder (sports) |
| Stage 5 | Pro | `promod` | Pro Mod Camaro | Pro Mod Camaro (tube-chassis drag car, Camaro body) | placeholder (promod) |
| Stage 5 | Pro | `rail` | Top Dragster | Rear-engine Top Dragster / Top Alcohol rail | placeholder (dragster) |
| Stage 5 | Euro | `lambo` | Lamborghini Aventador SVJ | 2018-22 Lamborghini Aventador SVJ | placeholder (supercar) |
