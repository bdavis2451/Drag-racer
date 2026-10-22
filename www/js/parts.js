// ===========================================================================
// PARTS CATALOG — every upgrade category and what each option does.
// A car instance stores inst.parts[cat] = optionId (missing = stock).
// ===========================================================================
(function () {
  var DR = globalThis.DR;

  // Forced-induction units. type: turbo | roots | screw | cent
  //  maxBoost psi, flow = max crank hp the unit can feed, spool = rpm of full
  //  boost on a 3.0L engine, lag = seconds, paras = supercharger drive loss
  DR.FI = {
    none:        { name: 'Naturally Aspirated', type: 'none' },
    fi_oem_s:    { name: 'Factory Turbo',             type: 'turbo', maxBoost: 20, flow: 380,  spool: 3200, lag: 0.30, w: 15 },
    fi_oem_tt:   { name: 'Factory Twin Turbos',       type: 'turbo', maxBoost: 22, flow: 620,  spool: 3600, lag: 0.30, w: 25 },
    fi_oem_sc:   { name: 'Factory Supercharger',      type: 'screw', maxBoost: 16, flow: 850,  paras: 0.10, w: 30 },
    fi_oem_vgt:  { name: 'Factory VGT Turbo',         type: 'turbo', maxBoost: 40, flow: 800,  spool: 2900, lag: 0.45, w: 20 },
    t_small:     { name: 'Small Turbo 54mm',          type: 'turbo', maxBoost: 24, flow: 480,  spool: 3300, lag: 0.30, w: 18, price: 3500,  desc: 'Quick spool, runs out of air up top.' },
    t_med:       { name: 'Medium Turbo 64mm',         type: 'turbo', maxBoost: 32, flow: 780,  spool: 3900, lag: 0.42, w: 22, price: 6000,  desc: 'The street/strip sweet spot.' },
    t_large:     { name: 'Large Turbo 76mm',          type: 'turbo', maxBoost: 40, flow: 1150, spool: 4500, lag: 0.55, w: 26, price: 9500,  desc: 'Big power, big lag. Pairs well with a 2-step.' },
    t_twin:      { name: 'Twin 67mm Turbos',          type: 'turbo', maxBoost: 42, flow: 1500, spool: 4000, lag: 0.45, w: 40, price: 16000, desc: 'Two medium turbos: spools faster than one big one.' },
    t_huge:      { name: 'Huge Turbo 88mm',           type: 'turbo', maxBoost: 50, flow: 2000, spool: 5000, lag: 0.70, w: 32, price: 19000, desc: 'Radial-tire monster. Needs revs and an anti-lag.' },
    t_promod:    { name: 'Twin 98mm Pro Mod Turbos',  type: 'turbo', maxBoost: 60, flow: 3600, spool: 5300, lag: 0.80, w: 55, price: 45000, desc: 'Big-tire Pro Mod power.' },
    sc_roots:    { name: 'Roots Blower 6-71',         type: 'roots', maxBoost: 16, flow: 900,  paras: 0.14, w: 40, price: 7000,  desc: 'Instant boost from idle. Sticks out of the hood.' },
    sc_screw:    { name: 'Twin-Screw 2.9L',           type: 'screw', maxBoost: 22, flow: 1250, paras: 0.10, w: 35, price: 9000,  desc: 'Efficient positive-displacement blower.' },
    sc_cent:     { name: 'Centrifugal Supercharger',  type: 'cent',  maxBoost: 30, flow: 1350, paras: 0.07, w: 25, price: 8000,  desc: 'Boost climbs with RPM. Gentle on tires off the line.' },
    sc_screw2:   { name: 'Twin-Screw 4.5L',           type: 'screw', maxBoost: 30, flow: 1800, paras: 0.11, w: 45, price: 14000, desc: 'Big-displacement screw blower. Huge torque everywhere.' },
    sc_cent2:    { name: 'Race Centrifugal F-Series', type: 'cent',  maxBoost: 40, flow: 2100, paras: 0.08, w: 30, price: 15000, desc: 'Gear-driven race blower. Builds boost hard up top.' },
    sc_1471:     { name: '14-71 Screw Blower',        type: 'roots', maxBoost: 40, flow: 3200, paras: 0.17, w: 60, price: 38000, desc: 'Pro Mod blower. Brutal, instant torque.' }
  };
  DR.FI_SHOP = ['t_small', 't_med', 't_large', 't_twin', 't_huge', 't_promod', 'sc_roots', 'sc_screw', 'sc_cent', 'sc_screw2', 'sc_cent2', 'sc_1471'];

  function opt(id, name, price, fx, desc) { var o = { id: id, name: name, price: price, desc: desc || '' }; for (var k in fx) o[k] = fx[k]; return o; }

  // Simple categories: fixed option lists. The first option is stock.
  // Engine-part prices are multiplied by DR.enginePriceMul(engine).
  var C = {};

  // Breathing parts. bw: the share of the engine's race-build headroom the
  // part unlocks (all race parts together = 1, see ENGINES bg / bp): power
  // AND the rpm of peak power move up together, and how much depends on the
  // engine (a Fox 5.0 on stock E7 heads gains far more than an LS3).
  // low: lost low-end torque (big cams, big runners).
  //   air filter .03 + manifold .07 + throttle .02 + headers .10 +
  //   exhaust .07 + heads .30 + cams .33 + ECU .08 = 1
  C.airfilter = { name: 'Air Filter / Cold Air', engineScaled: true, options: [
    opt('stock', 'Stock Airbox', 0, { bw: 0 }),
    opt('af1', 'High-Flow Panel Filter', 150, { bw: 0.01 }, 'Cotton gauze in the stock airbox.'),
    opt('af2', 'Cold Air Intake', 350, { bw: 0.02 }, 'Cone filter fed from outside the engine bay.'),
    opt('af3', 'Ram-Air Box / Velocity Stacks', 900, { bw: 0.03 }, 'Sealed cold-air box with smooth stacks.')
  ]};
  C.intake = { name: 'Intake Manifold', engineScaled: true, options: [
    opt('stock', 'Stock Intake Manifold', 0, { bw: 0 }),
    opt('i1', 'Port-Matched Stock Manifold', 500, { bw: 0.03 }, 'Gasket-matched and cleaned up.'),
    opt('i2', 'Performance Manifold', 1100, { bw: 0.05, low: 0.01 }, 'Bigger plenum and runners. Moves the torque up a little.'),
    opt('i3', 'Race Sheet-Metal Manifold', 2200, { bw: 0.07, low: 0.04 }, 'Short runners for high rpm. Gives up some low-end.')
  ]};
  C.throttle = { name: 'Throttle Body', engineScaled: true, options: [
    opt('stock', 'Stock Throttle Body', 0, { bw: 0 }),
    opt('tb1', 'Ported Throttle Body', 200, { bw: 0.005 }),
    opt('tb2', 'Big-Bore Throttle Body', 450, { bw: 0.01 }, 'A bigger blade for big-cam and boosted builds.'),
    opt('tb3', 'Billet Race Throttle Body', 900, { bw: 0.02 }, 'Never the restriction.')
  ]};
  C.headers = { name: 'Headers / Manifold', engineScaled: true, options: [
    opt('stock', 'Stock Manifolds', 0, { bw: 0 }),
    opt('h1', 'Shorty Headers', 500, { bw: 0.03 }, 'Better than cast manifolds.'),
    opt('h2', 'Long-Tube Headers', 1200, { bw: 0.07 }, 'Real gains through the mid-range and up top.'),
    opt('h3', 'Race Headers / Tubular Manifold', 2400, { bw: 0.10 }, 'Big primaries for high rpm and big boost.')
  ]};
  C.exhaust = { name: 'Exhaust', engineScaled: true, options: [
    opt('stock', 'Stock Exhaust', 0, { bw: 0 }),
    opt('e1', 'Cat-Back Exhaust', 600, { bw: 0.02 }, 'A little less back pressure.'),
    opt('e2', 'Straight Pipes', 1100, { bw: 0.05 }, 'Less back pressure. Loud.'),
    opt('e3', 'Race Exhaust (Open)', 2000, { bw: 0.07 }, 'No restriction at all.')
  ]};

  // Top end. stress: how much rpm a cam's lift and ramps take off the valve
  // springs' float limit; vt: what the valvetrain parts add to it.
  C.heads = { name: 'Cylinder Heads', engineScaled: true, options: [
    opt('stock', 'Stock Heads', 0, { bw: 0 }),
    opt('hd1', 'Ported & Polished Heads', 1200, { bw: 0.10 }, 'Cleaned-up ports flow more air.'),
    opt('hd2', 'CNC Ported Heads', 3000, { bw: 0.20 }, 'Big airflow gains; the peak moves up.'),
    opt('hd3', 'Billet Race Heads', 8000, { lvl: 4, bw: 0.30 }, 'Race-port heads. The biggest single gain.')
  ]};
  C.cams = { name: 'Camshafts', engineScaled: true, options: [
    opt('stock', 'Stock Cams', 0, { bw: 0, stress: 0 }),
    opt('c1', 'Stage 1 Cams', 800, { bw: 0.08, low: 0.05, stress: 0 }, 'Mild cams. Fine on stock valve springs.'),
    opt('c2', 'Stage 2 Cams', 1400, { bw: 0.16, low: 0.12, stress: 300 }, 'Moves the power peak up. More lift: floats stock springs 300 rpm sooner.'),
    opt('c3', 'Stage 3 Race Cams', 2600, { bw: 0.25, low: 0.22, stress: 600 }, 'Big power up top, lumpy idle. Needs real valve springs.'),
    opt('c4', 'Solid Roller Race Cams', 5000, { bw: 0.33, low: 0.30, stress: 900 }, 'All top end. Needs a race valvetrain to live.')
  ]};
  C.valvetrain = { name: 'Valvetrain', engineScaled: true, options: [
    opt('stock', 'Stock Valve Springs', 0, { vt: 0 }),
    opt('vt1', 'Beehive Valve Springs', 450, { vt: 500 }, 'Valves float 500 rpm later.'),
    opt('vt2', 'Dual Springs + Ti Retainers', 1200, { vt: 1000 }, 'Valves float 1000 rpm later.'),
    opt('vt3', 'Race Valvetrain (Shaft Rockers, Ti Valves)', 3500, { vt: 1600 }, 'Valves float 1600 rpm later.'),
    opt('vt4', 'Pro Mod Valvetrain', 8000, { lvl: 5, vt: 2300 }, 'Valves float 2300 rpm later.')
  ]};

  // Bottom end: the weakest link sets what the engine survives. Each part
  // holds `hold` x the engine's stock safe power and lets it spin `be` rpm
  // past the factory redline. cr: compression (+1 high: more power, less
  // boost before knock; -1 low: the other way round).
  C.pistons = { name: 'Pistons', engineScaled: true, options: [
    opt('stock', 'Stock Cast Pistons', 0, { hold: 1, be: 800, cr: 0 }, 'The first thing to break.'),
    opt('p1', 'Forged Pistons (Boost, Low Comp)', 1600, { hold: 2.0, be: 1200, cr: -1 }, 'Holds 2x stock power. Lower compression: -2% power, +3 psi before knock.'),
    opt('p2', 'Forged Pistons (NA, High Comp)', 1600, { hold: 1.7, be: 1200, cr: 1 }, 'Holds 1.7x stock power. Higher compression: +4% power, 3 psi less before knock.'),
    opt('p3', 'Billet Race Pistons', 4000, { lvl: 4, hold: 3.4, be: 1800, cr: 0 }, 'Holds 3.4x stock power.'),
    opt('p4', 'Pro Mod Pistons', 9000, { lvl: 5, hold: 6, be: 2600, cr: 0 }, 'Coated skirts and gas ports. Holds 6x stock power.')
  ]};
  C.rods = { name: 'Connecting Rods', engineScaled: true, options: [
    opt('stock', 'Stock Rods', 0, { hold: 1.3, be: 800 }, 'Good for 1.3x stock power.'),
    opt('r1', 'Forged I-Beam Rods', 900, { hold: 2.0, be: 1200 }, 'Holds 2x stock power.'),
    opt('r2', 'Forged H-Beam Rods', 1800, { hold: 2.8, be: 1600 }, 'Holds 2.8x stock power.'),
    opt('r3', 'Billet Aluminum Rods', 5000, { hold: 4.5, be: 2600 }, 'Light and shock-absorbing. Holds 4.5x stock power.'),
    opt('r4', 'Pro Billet Steel Rods', 9000, { lvl: 5, hold: 6.5, be: 2600 }, 'Holds 6.5x stock power.')
  ]};
  C.crank = { name: 'Crankshaft', engineScaled: true, options: [
    opt('stock', 'Stock Cast Crank', 0, { hold: 1.5, be: 800, ie: 1 }, 'Good for 1.5x stock power.'),
    opt('k1', 'Forged 4340 Crank', 2200, { hold: 2.8, be: 1400, ie: 1 }, 'Holds 2.8x stock power.'),
    opt('k2', 'Billet Crank', 6000, { hold: 4.5, be: 2200, ie: 0.97 }, 'Holds 4.5x stock power.'),
    opt('k3', 'Knife-Edged Pro Billet Crank', 11000, { lvl: 5, hold: 6.5, be: 2800, ie: 0.92 }, 'Holds 6.5x stock power and revs quicker.')
  ]};
  C.block = { name: 'Engine Block', engineScaled: true, options: [
    opt('stock', 'Stock Block', 0, { hold: 1.8 }, 'Splits the main webs around 1.8x stock power.'),
    opt('b1', 'Main Studs + Girdle', 800, { hold: 2.5 }, 'Holds 2.5x stock power.'),
    opt('b2', 'Sleeved & Filled Block', 4000, { lvl: 4, hold: 4 }, 'Holds 4x stock power.'),
    opt('b3', 'Billet Block', 15000, { lvl: 5, hold: 7 }, 'Holds 7x stock power.')
  ]};
  C.oiling = { name: 'Oiling', engineScaled: true, options: [
    opt('stock', 'Stock Oil Pump & Pan', 0, { be: 1000, pw: 0 }, 'Starves the bearings past +1000 rpm.'),
    opt('o1', 'High-Volume Pump + Baffled Pan', 500, { be: 1600, pw: 0 }, 'Bearings live to +1600 rpm.'),
    opt('o2', '3-Stage Dry Sump', 3500, { lvl: 4, be: 2600, pw: 0.015 }, 'Bearings live to +2600 rpm. Less windage: +1.5% power.'),
    opt('o3', '5-Stage Dry Sump + Vacuum Pump', 7000, { lvl: 5, be: 3200, pw: 0.03 }, 'Bearings live to +3200 rpm. +3% power.')
  ]};

  // Fuel: the smaller of the injectors and the pump sets the power the fuel
  // system feeds (hp on gasoline; alcohol needs more flow).
  C.injectors = { name: 'Fuel Injectors', options: [
    opt('stock', 'Stock Injectors', 0, { fuel: 0 }),
    opt('inj1', '550cc Injectors', 400, { fuel: 600 }, 'Feeds 600 hp on gasoline.'),
    opt('inj2', '1000cc Injectors', 800, { fuel: 1000 }, 'Feeds 1000 hp.'),
    opt('inj3', '1700cc Injectors', 1500, { fuel: 1800 }, 'Feeds 1800 hp.'),
    opt('inj4', '2400cc Injectors', 3000, { lvl: 4, fuel: 2800 }, 'Feeds 2800 hp.'),
    opt('inj5', 'Twin Injectors per Cylinder', 6000, { lvl: 5, fuel: 5000 }, 'Feeds 5000 hp.')
  ]};
  C.fuelpump = { name: 'Fuel Pump & Lines', options: [
    opt('stock', 'Stock Fuel Pump', 0, { fuel: 0 }),
    opt('fp1', '255 lph In-Tank Pump', 300, { fuel: 650 }, 'Feeds 650 hp on gasoline.'),
    opt('fp2', 'Dual 450 lph Pumps', 900, { fuel: 1100 }, 'Feeds 1100 hp.'),
    opt('fp3', 'Brushless Pump + -10AN Lines', 2000, { fuel: 1800 }, 'Feeds 1800 hp.'),
    opt('fp4', 'Belt-Driven Mechanical Pump', 4500, { lvl: 5, fuel: 5000 }, 'Feeds 5000 hp.')
  ]};
  C.fueltype = { name: 'Fuel Type', options: [
    opt('stock', 'Pump Gas 93', 0, { knock: 17, fmul: 1, ff: 1 }, 'Boost over 17 psi will knock and stress the engine.'),
    opt('e85', 'E85 Ethanol', 800, { knock: 30, fmul: 1.04, ff: 0.75 }, '+4% power, 30 psi safe. Needs 33% more fuel flow.'),
    opt('race', 'Race Gas 116', 1200, { knock: 34, fmul: 1.03, ff: 1 }, '+3% power, 34 psi safe.'),
    opt('meth', 'Methanol', 2500, { knock: 50, fmul: 1.06, ff: 0.62 }, '+6% power, 50 psi safe. Needs 60% more fuel flow.')
  ]};
  // spark: extra psi of boost (and nitrous) the ignition can light before it
  // starts to misfire (stock ignition gives out a few psi past factory boost)
  C.ignition = { name: 'Ignition', options: [
    opt('stock', 'Stock Coils & Plugs', 0, { spark: 0 }, 'Blows out the spark at high boost or a big nitrous shot.'),
    opt('ig1', 'Hot Coils + Colder Plugs', 300, { spark: 8 }, 'Lights about 8 psi more boost and 100 hp more nitrous.'),
    opt('ig2', 'CDI Ignition Box', 900, { spark: 20 }, 'Lights about 20 psi more boost and 300 hp more nitrous.'),
    opt('ig3', 'Race Ignition + Crank Trigger', 2500, { lvl: 4, spark: 60 }, 'Lights anything.')
  ]};
  C.ecu = { name: 'ECU / Engine Management', options: [
    opt('stock', 'Stock ECU', 0, { bw: 0, ecu: 0 }, 'Factory rev limiter, whatever your parts can take.'),
    opt('ecu1', 'Street Tune Flash', 600, { bw: 0.03, ecu: 1 }, 'Better fuel and timing. Raises the rev limiter as far as your engine parts safely allow (up to +800 rpm).'),
    opt('ecu2', 'Standalone ECU', 2000, { bw: 0.05, ecu: 2 }, 'Fully adjustable rev limiter, launch throttle & throttle ramp tuning.'),
    opt('ecu3', 'Race ECU + Traction Mgmt', 4500, { lvl: 4, bw: 0.08, ecu: 3 }, 'Adjustable rev limiter and traction control.')
  ]};
  C.ic = { name: 'Intercooler', needsFI: true, options: [
    opt('stock', 'Stock Intercooling', 0, { ic: 0 }, 'Factory boosted engines come with a small intercooler; aftermarket kits have none.'),
    opt('ic1', 'Front-Mount Intercooler', 1200, { ic: 0.93 }, 'Cooler charge = more power per psi.'),
    opt('ic2', 'Large Race Intercooler', 2200, { ic: 0.97 }),
    opt('ic3', 'Air-to-Water + Ice Tank', 4000, { lvl: 4, ic: 1.0 }, 'Maximum charge cooling.')
  ]};
  // gate: share of the turbo's max boost the wastegate can hold steady
  // (an aftermarket turbo's little internal gate creeps and can't hold much)
  C.wastegate = { name: 'Wastegate & Boost Control', needsTurbo: true, options: [
    opt('stock', 'Internal Wastegate', 0, { gate: 0.7, spoolK: 1 }, 'On a bolt-on turbo kit boost tops out at 70% of what the turbo can make. Factory turbos are fine.'),
    opt('wg1', 'External Wastegate', 900, { gate: 0.9, spoolK: 0.95 }, 'Holds up to 90% of a bolt-on turbo\'s max boost, and no boost creep: a little quicker spool.'),
    opt('wg2', 'Dual Gates + Electronic Boost Controller', 2200, { gate: 1, spoolK: 0.88 }, 'Full boost range, and the gates stay shut until target: quicker spool.')
  ]};
  // bov: how long boost hangs on while the throttle is shut for a shift (s)
  C.bov = { name: 'Blow-Off Valve', needsTurbo: true, options: [
    opt('stock', 'No Blow-Off Valve', 0, { bov: 0.15 }, 'Compressor surge kills boost on every shift.'),
    opt('bov1', 'Blow-Off Valve', 350, { bov: 0.35 }, 'Vents on the shift: the turbo keeps spinning.'),
    opt('bov2', 'Dual Race Blow-Off Valves', 800, { bov: 0.55 }, 'Holds the most boost through a shift.')
  ]};
  C.launch = { name: 'Launch Control', options: [
    opt('stock', 'None', 0, { twostep: 0 }),
    opt('l1', '2-Step Rev Limiter', 900, { twostep: 1 }, 'Holds a set launch RPM on the line and builds some boost.'),
    opt('l2', '2-Step + Anti-Lag', 3000, { lvl: 4, twostep: 2 }, 'Builds near-full boost on the line and keeps turbos lit between shifts.')
  ]};
  C.nitrous = { name: 'Nitrous Oxide', options: [
    opt('stock', 'None', 0, { nos: 0 }),
    opt('n75', '75 Shot Wet Kit', 800, { nos: 75 }, 'Adds 75 hp when sprayed.'),
    opt('n150', '150 Shot Wet Kit', 1500, { nos: 150 }),
    opt('n250', '250 Shot Plate System', 2500, { nos: 250 }),
    opt('n400', '400 Shot Fogger', 4500, { lvl: 4, nos: 400 }),
    opt('n650', '650 Shot Dual-Stage Fogger', 8000, { lvl: 5, nos: 650 }, 'Pro nitrous. Spray it carefully!')
  ]};
  C.nosctrl = { name: 'Nitrous Controller', needsNos: true, options: [
    opt('stock', 'On/Off Solenoid', 0, { prog: 0 }),
    opt('p1', 'Progressive Controller', 1200, { prog: 1 }, 'Auto-activates after a delay and ramps the shot in to save the tires.')
  ]};
  // nosk: share of the rated shot a cold bottle actually flows
  C.nosheat = { name: 'Bottle Heater', needsNos: true, options: [
    opt('stock', 'No Bottle Heater', 0, { nosk: 0.88 }, 'Bottle pressure drops: about 88% of the rated shot.'),
    opt('nh1', 'Bottle Heater + Blanket', 400, { nosk: 1 }, 'Holds 950 psi for the full shot.')
  ]};
  C.clutch = { name: 'Clutch', needsClutch: true, options: [
    opt('stock', 'Stock Clutch', 0, { cap: 0, engage: 0.32 }, 'Slips under big power.'),
    opt('cl1', 'Stage 1 Clutch', 600, { cap: 650, engage: 0.28 }, 'Holds 650 Nm.'),
    opt('cl2', 'Stage 2 Clutch', 1100, { cap: 950, engage: 0.24 }, 'Holds 950 Nm.'),
    opt('cl3', 'Twin-Disc Clutch', 2400, { cap: 1500, engage: 0.20 }, 'Holds 1500 Nm.'),
    opt('cl4', 'Triple-Disc Clutch', 4200, { cap: 2400, engage: 0.17 }, 'Holds 2400 Nm.'),
    opt('cl5', 'Pro Multi-Disc Slider Clutch', 9000, { lvl: 5, cap: 4500, engage: 0.22 }, 'Holds anything; slips on purpose for smooth launches.')
  ]};
  C.converter = { name: 'Torque Converter', needsConverter: true, options: [
    opt('stock', 'Stock Converter (2200 stall)', 0, { stall: 2200, tr: 1.9 }, 'Tight street converter. Soft launches, little wheelspin.'),
    opt('tcl', 'Low Stall Converter (2800)', 800, { stall: 2800, tr: 1.95 }, 'A little more RPM on the hit. Good for mild builds and street tires.'),
    opt('tcm', 'Medium Stall Converter (3800)', 1500, { stall: 3800, tr: 2.05 }, 'Gets the engine into its powerband before the car moves. Needs more grip.'),
    opt('tch', 'High Stall Converter (5000)', 2600, { stall: 5000, tr: 2.15 }, 'Flashes high on the hit and spools big turbos. For big power and slicks.')
  ]};
  C.transbrake = { name: 'Transbrake', needsConverter: true, options: [
    opt('stock', 'None (Foot Brake)', 0, { tbrake: false }, 'The foot brake can only hold so much torque, so you have to ease into the throttle on the line, and the launch is softer.'),
    opt('tb1', 'Transbrake', 1200, { tbrake: true }, 'Locks the transmission so you can hold full throttle (and boost) on the line. Releases instantly at the launch.')
  ]};
  C.flywheel = { name: 'Flywheel / Flexplate', options: [
    opt('stock', 'Stock Flywheel', 0, { fly: 1 }),
    opt('fw1', 'Lightweight Flywheel', 600, { fly: 0.8 }, 'Revs faster. Less stored energy for the launch.'),
    opt('fw2', 'Ultralight Aluminum Flywheel', 1200, { fly: 0.62 }, 'Very quick revving.')
  ]};
  C.driveshaft = { name: 'Driveshaft', options: [
    opt('stock', 'Stock Driveshaft', 0, { shaft: 1 }),
    opt('ds1', 'Aluminum Driveshaft', 700, { shaft: 0.85 }, 'Less rotating mass.'),
    opt('ds2', 'Carbon Fiber Driveshaft', 1600, { shaft: 0.72 }, 'Even less rotating mass.')
  ]};
  // axle: engine torque (Nm, through first gear) the axles and housing hold;
  // 0 = the factory parts, sized for the stock engine
  C.rearend = { name: 'Rear End & Axles', options: [
    opt('stock', 'Factory Axles', 0, { axle: 0, am: 0 }, 'Built for the factory engine. Big torque snaps axles.'),
    opt('ra1', 'Chromoly Axles', 900, { axle: 1100, am: 0 }, 'Holds 1100 Nm of engine torque.'),
    opt('ra2', 'Built 9-inch + 35-Spline Axles', 2600, { axle: 2000, am: 12 }, 'Holds 2000 Nm. Heavy but bulletproof.'),
    opt('ra3', 'Fabricated Pro Rear End + 40-Spline', 6500, { lvl: 5, axle: 9000, am: 8 }, 'Holds 9000 Nm.')
  ]};
  C.diff = { name: 'Differential', options: [
    opt('open', 'Open Differential', 0, { dgrip: 0.88 }, 'One-wheel peel: loses traction easily.'),
    opt('lsd', 'Limited-Slip Diff', 900, { dgrip: 0.96 }, 'Splits power between both wheels.'),
    opt('spool', 'Spool (Locked)', 1800, { dgrip: 1.0 }, 'Both wheels locked together. Best for straight lines.')
  ]};
  C.layout = { name: 'Drivetrain Layout', options: [
    opt('stock', 'Factory Layout', 0, {}),
    opt('rwd', 'RWD Conversion', 9000, { layout: 'RWD' }, 'Rear-wheel drive: weight transfer works for you.'),
    opt('awd', 'AWD Conversion', 16000, { layout: 'AWD' }, 'All four wheels drive. +90 kg and some power loss.')
  ]};
  // sk: spring rate multiplier. low: fixed drop (m). adjS: ride height and
  // spring rates adjustable within ride [lo, hi] (m) and rate [lo, hi] (x).
  C.springs = { name: 'Springs', options: [
    opt('stock', 'Stock Springs', 0, { sk: 1, adjS: false }),
    opt('sp1', 'Lowering Springs', 500, { sk: 1.25, adjS: false, low: 0.03 }, 'Drops the car 30 mm and stiffens it. Lower CG, less weight transfer, less travel.'),
    opt('sp2', 'Adjustable Coilovers', 1800, { sk: 1, adjS: true, ride: [-0.06, 0.03], rate: [0.6, 1.5] }, 'Set ride height and spring rate at each end.'),
    opt('sp3', 'Drag Coilovers', 2600, { sk: 0.9, adjS: true, ride: [-0.06, 0.07], rate: [0.35, 1.8] }, 'Wide ride-height and spring range built for launching.')
  ]};
  // z: damping ratio. adjD: 1 = front rebound + rear bump adjustable, 2 = bump
  // and rebound at both ends. lim: front travel (extension) limiter.
  C.shocks = { name: 'Shocks', options: [
    opt('stock', 'Stock Shocks', 0, { z: 0.42, adjD: 0 }),
    opt('sh1', 'Sport Shocks', 700, { z: 0.50, adjD: 0 }),
    opt('sh2', 'Adjustable Drag Shocks', 2500, { z: 0.45, adjD: 1, lim: true }, 'Adjust front rebound and rear bump, plus a front travel limiter.'),
    opt('sh3', 'Double-Adjustable Race Shocks', 5000, { z: 0.45, adjD: 2, lim: true, pro: true }, 'Bump and rebound at both ends, plus a front travel limiter.')
  ]};
  C.rearsusp = { name: 'Rear Suspension', options: [
    opt('stock', 'Stock Rear Suspension', 0, { as: 0.35, adjA: false }),
    opt('rs1', 'Traction Bars', 600, { as: 0.6, adjA: false }, 'Plants the rear tires harder.'),
    opt('rs2', 'Adjustable Ladder Bars', 2500, { as: 0.75, adjA: true, asMin: 0.3, asMax: 1.3 }, 'Adjustable instant centre (anti-squat).'),
    opt('rs3', 'Adjustable 4-Link', 5500, { as: 0.85, adjA: true, asMin: 0.2, asMax: 1.6, pro: true }, 'The ultimate drag suspension.')
  ]};
  // stiff: how much of the rear links' bite reaches the tires instead of
  // twisting the body; kg added
  C.chassis = { name: 'Chassis / Roll Cage', options: [
    opt('stock', 'Stock Unibody', 0, { stiff: 0.9, kg: 0 }, 'The body twists on a hard launch.'),
    opt('cg1', 'Subframe Connectors', 400, { stiff: 0.95, kg: 7 }, 'Ties the front and rear frame rails together.'),
    opt('cg2', '8-Point Roll Bar', 1500, { stiff: 0.98, kg: 18 }, 'Stiffer chassis and a safer car.'),
    opt('cg3', '25.3 Chromoly Roll Cage', 4000, { stiff: 1, kg: 26 }, 'A rigid chassis. Every bit of anti-squat goes to the tires.')
  ]};
  C.frontsusp = { name: 'Front Suspension', options: [
    opt('stock', 'Stock K-Member & Arms', 0, { fkg: 0 }),
    opt('fs1', 'Tubular K-Member', 1200, { fkg: -12 }, '-12 kg off the nose.'),
    opt('fs2', 'Tubular K-Member + Arms + Drag Struts', 2800, { fkg: -22 }, '-22 kg off the nose.')
  ]};
  C.wheeliebar = { name: 'Wheelie Bars', options: [
    opt('stock', 'None', 0, { bar: 0 }),
    opt('wb1', 'Adjustable Wheelie Bars', 1500, { bar: 1 }, 'Stops big wheelies. Set the height in Tuning.')
  ]};
  C.aero = { name: 'Aero', options: [
    opt('stock', 'Stock Body', 0, { cla: 0, dcda: 0 }),
    opt('a1', 'Rear Spoiler', 600, { cla: 0.25, dcda: 0.02 }, 'A little rear downforce at speed.'),
    opt('a2', 'Big Rear Wing', 1400, { cla: 0.55, dcda: 0.05 }, 'More rear downforce, more drag.')
  ]};
  C.wheels = { name: 'Wheels', options: [
    opt('stock', 'Stock Wheels', 0, { wm: 0, bead: false }),
    opt('wh1', 'Lightweight Wheels', 800, { wm: -8, bead: false }, '-8 kg of rotating mass.'),
    opt('wh2', 'Forged Wheels', 2000, { wm: -14, bead: false }, '-14 kg of rotating mass.'),
    opt('wh3', 'Beadlock Drag Wheels', 2600, { wm: -10, bead: true }, 'Lets you run very low tire pressure safely.')
  ]};
  C.brakes = { name: 'Brakes', options: [
    opt('stock', 'Stock Brakes', 0, { bkg: 0 }),
    opt('br1', 'Lightweight Drag Brakes', 900, { bkg: -10 }, '-10 kg of rotating mass.'),
    opt('br2', 'Carbon Race Brakes', 3000, { bkg: -16 }, '-16 kg of rotating mass.')
  ]};
  C.ftires = { name: 'Front Tires', options: [
    opt('stock', 'Stock Front Tires', 0, { fm: 0, roll: 1 }),
    opt('ft1', 'Skinny Front Runners', 700, { fm: -14, roll: 0.75 }, 'Less weight & rolling resistance.')
  ]};
  C.weight = { name: 'Weight Reduction', options: [
    opt('stock', 'Stock', 0, { wr: 0 }),
    opt('w1', 'Stage 1: Interior Strip', 1000, { wr: 0.05 }, '-5% chassis weight.'),
    opt('w2', 'Stage 2: Lightweight Panels', 4000, { wr: 0.10 }, '-10% chassis weight.'),
    opt('w3', 'Stage 3: Carbon Body & Lexan', 12000, { wr: 0.16 }, '-16% chassis weight.'),
    opt('w4', 'Stage 4: Tube Chassis', 35000, { wr: 0.24, low: 0.03 }, '-24% chassis weight and a lower CG.')
  ]};
  // bat: kg moved from the nose to the trunk; bkgW: kg saved
  C.battery = { name: 'Battery', options: [
    opt('stock', 'Stock Battery (Engine Bay)', 0, { bat: 0, batkg: 0 }),
    opt('bt1', 'Trunk Battery Relocation', 250, { bat: 20, batkg: 3 }, 'Moves 20 kg to the back of the car, over the drive wheels.'),
    opt('bt2', 'Lightweight Race Battery (Trunk)', 650, { bat: 8, batkg: -12 }, '-12 kg, mounted in the trunk.')
  ]};
  DR.PART_CATS = C;

  // Shop groups. unlock: which career unlock track the group's parts use.
  DR.PART_GROUPS = [
    { id: 'engine', name: 'Bolt-Ons',      icon: 'intake',  cats: ['engine', 'airfilter', 'intake', 'throttle', 'headers', 'exhaust'] },
    { id: 'top',    name: 'Top End',       icon: 'heads',   unlock: 'engine', cats: ['heads', 'cams', 'valvetrain'] },
    { id: 'bottom', name: 'Bottom End',    icon: 'pistons', unlock: 'engine', cats: ['pistons', 'rods', 'crank', 'block', 'oiling'] },
    { id: 'fuel',   name: 'Fuel & Spark',  icon: 'fuelsys', unlock: 'engine', cats: ['injectors', 'fuelpump', 'fueltype', 'ignition', 'ecu'] },
    { id: 'power',  name: 'Power Adders',  icon: 'fi',      cats: ['fi', 'ic', 'wastegate', 'bov', 'launch', 'nitrous', 'nosctrl', 'nosheat'] },
    { id: 'drive',  name: 'Drivetrain',    icon: 'trans',   cats: ['trans', 'clutch', 'converter', 'transbrake', 'flywheel', 'driveshaft', 'diff', 'rearend', 'layout'] },
    { id: 'susp',   name: 'Suspension',    icon: 'springs', cats: ['springs', 'shocks', 'rearsusp', 'frontsusp', 'chassis', 'wheeliebar', 'aero'] },
    { id: 'tires',  name: 'Wheels & Tires',icon: 'rtires',  cats: ['rtires', 'wheels', 'ftires', 'brakes'] },
    { id: 'body',   name: 'Weight',        icon: 'weight',  cats: ['weight', 'battery'] }
  ];
  DR.UNLOCK_NAMES = { engine: 'Engine', power: 'Power adder', drive: 'Drivetrain', susp: 'Suspension', tires: 'Wheel & tire', body: 'Weight' };
  DR.CAT_NAMES = { engine: 'Engine Swap', fi: 'Turbo / Supercharger', trans: 'Transmission', rtires: 'Drive Tires' };

  DR.enginePriceMul = function (engId) {
    var e = DR.ENGINES[engId];
    return Math.max(0.6, Math.min(3, 0.5 + e.hp / 400));
  };

  // Stock option id for a category on this car instance.
  DR.stockPart = function (cat, inst) {
    var car = DR.CARS[inst.carId];
    if (cat === 'engine') return car.engine;
    if (cat === 'trans') return car.trans;
    if (cat === 'rtires') return car.tire;
    if (cat === 'diff') return car.diff;
    if (cat === 'fi') { var e = DR.ENGINES[inst.engine || car.engine]; return e.fi ? e.fi.part : 'none'; }
    return 'stock';
  };
  DR.partId = function (cat, inst) {
    if (cat === 'engine') return inst.engine || DR.stockPart(cat, inst);
    return (inst.parts && inst.parts[cat]) || DR.stockPart(cat, inst);
  };

  // Part level (0 stock, 1 Street .. 5 Pro Mod): set on the part, or from
  // its base price (before engine scaling, so a part is the same level on
  // every car).
  DR.partLevel = function (price) { return !price ? 0 : price <= 700 ? 1 : price <= 1300 ? 2 : price <= 4500 ? 3 : price <= 12000 ? 4 : 5; };
  function lvlOf(o) { return !o.price ? 0 : o.lvl || DR.partLevel(o.price); }
  DR.partOptions = function (cat, inst) {
    return listOptions(cat, inst).map(function (o) { if (o.lvl == null) o.lvl = lvlOf(o); return o; });
  };
  // Full option list for a category on this car instance.
  function listOptions(cat, inst) {
    var car = DR.CARS[inst.carId], i, list = [];
    if (cat === 'engine') {
      var ids = Object.keys(DR.ENGINES).sort(function (a, b) { return DR.ENGINES[a].hp - DR.ENGINES[b].hp; });
      for (i = 0; i < ids.length; i++) {
        var e = DR.ENGINES[ids[i]];
        list.push({ id: ids[i], name: e.name, price: ids[i] === car.engine ? 0 : e.price,
          desc: e.hp + ' hp stock, ' + e.w + ' kg' + (e.fi ? ', factory boosted' : '') + (e.diesel ? ', diesel' : '') + '. Your current engine parts come off with the old engine.' });
      }
      return list;
    }
    if (cat === 'trans') {
      list.push({ id: car.trans, name: DR.TRANS[car.trans].name + ' (Factory)', price: 0, desc: transDesc(car.trans) });
      DR.TRANS_SHOP.forEach(function (t) { if (t !== car.trans) list.push({ id: t, name: DR.TRANS[t].name, price: DR.TRANS[t].price, desc: transDesc(t) }); });
      return list;
    }
    if (cat === 'rtires') {
      list.push({ id: car.tire, name: DR.TIRES[car.tire].name + ' (Factory)', price: 0, desc: tireDesc(car.tire) });
      DR.TIRE_SHOP.forEach(function (t) { if (t !== car.tire) list.push({ id: t, name: DR.TIRES[t].name, price: DR.TIRES[t].price, desc: tireDesc(t) }); });
      return list;
    }
    if (cat === 'fi') {
      var st = DR.stockPart('fi', inst);
      list.push({ id: st, name: st === 'none' ? 'None (Naturally Aspirated)' : DR.FI[st].name + ' (Factory)', price: 0, desc: st === 'none' ? '' : 'Max ' + DR.FI[st].maxBoost + ' psi, feeds ~' + DR.FI[st].flow + ' hp.' });
      DR.FI_SHOP.forEach(function (f) { var u = DR.FI[f]; list.push({ id: f, name: u.name, price: u.price, desc: u.desc + ' Max ' + u.maxBoost + ' psi, feeds ~' + u.flow + ' hp.' }); });
      return list;
    }
    if (cat === 'diff') {
      return C.diff.options.map(function (o) { return Object.assign({}, o, { price: o.id === car.diff ? 0 : o.price, name: o.name + (o.id === car.diff ? ' (Factory)' : '') }); });
    }
    if (cat === 'layout') {
      return C.layout.options.filter(function (o) { return o.id === 'stock' || o.layout !== car.drive; })
        .map(function (o) { return o.id === 'stock' ? Object.assign({}, o, { name: 'Factory ' + car.drive }) : o; });
    }
    var c = C[cat], mul = c.engineScaled ? DR.enginePriceMul(inst.engine || car.engine) : 1;
    var eng = DR.ENGINES[inst.engine || car.engine];
    return c.options.map(function (o) {
      var x = Object.assign({}, o, { price: Math.round(o.price * mul / 50) * 50, lvl: lvlOf(o) });
      if (o.hold) x.desc = (o.desc ? o.desc + ' ' : '') + 'About ' + Math.round(eng.safe * o.hold / 10) * 10 + ' hp on this engine.';
      return x;
    });
  }

  // Whether a category applies to this car right now (e.g. clutch vs converter).
  DR.partApplies = function (cat, inst) {
    var c = C[cat];
    if (!c) return true;
    var tr = DR.TRANS[DR.partId('trans', inst)];
    if (c.needsClutch) return tr.type !== 'auto';
    if (c.needsConverter) return tr.type === 'auto';
    if (c.needsFI) return DR.partId('fi', inst) !== 'none';
    if (c.needsTurbo) return DR.FI[DR.partId('fi', inst)].type === 'turbo';
    if (c.needsNos) return DR.partId('nitrous', inst) !== 'stock';
    return true;
  };

  DR.catName = function (cat) { return DR.CAT_NAMES[cat] || (C[cat] && C[cat].name) || cat; };

  DR.getOption = function (cat, inst, id) {
    id = id || DR.partId(cat, inst);
    var opts = DR.partOptions(cat, inst);
    for (var i = 0; i < opts.length; i++) if (opts[i].id === id) return opts[i];
    return opts[0];
  };

  function transDesc(t) {
    var x = DR.TRANS[t];
    var kind = { manual: 'Manual', auto: 'Automatic', seq: 'Sequential', dct: 'Dual-clutch' }[x.type];
    return kind + ', ' + x.ratios.length + ' gears, ' + Math.round(x.shift * 1000) + ' ms shifts, holds ' + x.maxTq + ' Nm' +
      (x.adj ? '. Adjustable gear ratios.' : '.');
  }
  function tireDesc(t) {
    var x = DR.TIRES[t];
    return x.kind + '. Grip ' + x.mu.toFixed(2) + ', best at ' + x.optP + ' psi & ' + x.topt + '°C. ' + Math.round(x.r * 2 / 0.0254) + '" tall.';
  }

  // Engine-related categories that get removed on an engine swap.
  DR.ENGINE_BOUND = ['airfilter', 'intake', 'throttle', 'exhaust', 'headers', 'heads', 'cams', 'valvetrain',
    'pistons', 'rods', 'crank', 'block', 'oiling', 'fi', 'ic', 'wastegate', 'bov'];

  // Older builds used combined parts (engine internals, fuel system, cams
  // with springs). Expands a parts map to today's catalog, keeping what the
  // old part did. Also used for the rivals' builds.
  var LEGACY = {
    internals: { n1: { pistons: 'p1' }, n2: { pistons: 'p1', rods: 'r2', crank: 'k1', block: 'b1' },
      n3: { pistons: 'p3', rods: 'r3', crank: 'k2', block: 'b2', oiling: 'o1' },
      n4: { pistons: 'p4', rods: 'r4', crank: 'k3', block: 'b3', oiling: 'o2' } },
    fuelsys: { f1: { injectors: 'inj1', fuelpump: 'fp1' }, f2: { injectors: 'inj2', fuelpump: 'fp2' },
      f3: { injectors: 'inj3', fuelpump: 'fp3' }, f4: { injectors: 'inj5', fuelpump: 'fp4' } },
    intake: { i1: { airfilter: 'af2', throttle: 'tb1' }, i2: { airfilter: 'af2', intake: 'i1', throttle: 'tb2' }, i3: { airfilter: 'af3', intake: 'i3', throttle: 'tb3' } },
    cams: { c1: { valvetrain: 'vt1' }, c2: { valvetrain: 'vt2' }, c3: { valvetrain: 'vt3' }, c4: { valvetrain: 'vt4' } }
  };
  DR.expandParts = function (parts, fresh) {
    var out = {}, k;
    for (k in parts) out[k] = parts[k];
    for (var cat in LEGACY) {
      var add = LEGACY[cat][parts[cat]];
      if (!add) continue;
      if (cat !== 'cams') delete out[cat];
      for (k in add) if (!out[k] || k === cat) out[k] = add[k];
    }
    // rivals (fresh): the support parts their power needs
    if (fresh) {
      var fi = DR.FI[parts.fi];
      if (fi && fi.type === 'turbo' && fi.price) { out.wastegate = out.wastegate || 'wg2'; out.bov = out.bov || 'bov1'; }
      if (fi && fi.price || parts.nitrous) out.ignition = out.ignition || (fi && fi.flow > 1500 || parts.nitrous === 'n650' ? 'ig3' : 'ig2');
      if (parts.nitrous) out.nosheat = out.nosheat || 'nh1';
      if (parts.rearsusp === 'rs3') out.chassis = out.chassis || 'cg3';
      else if (parts.rearsusp === 'rs2') out.chassis = out.chassis || 'cg2';
    }
    return out;
  };
})();
