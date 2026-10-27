// ===========================================================================
// PARTS CATALOG — every upgrade category and what each option does.
// A car instance stores inst.parts[cat] = optionId (missing = stock).
// ===========================================================================
(function () {
  var DR = globalThis.DR;

  // Forced-induction units. type: turbo | roots | screw | cent
  //  maxBoost psi, flow = max crank hp the unit can feed, spool = rpm where a
  //  3.0L piston engine reaches 15 psi with it (bigger engines and rotaries
  //  spool it sooner, more boost takes more revs), lag = seconds,
  //  paras = supercharger drive loss. Spool grows with the turbine: a unit
  //  sized for twice the power needs about 1.4x the exhaust flow.
  DR.FI = {
    none:        { name: 'Naturally Aspirated', type: 'none' },
    fi_oem_s:    { name: 'Factory Turbo',             type: 'turbo', maxBoost: 20, flow: 380,  spool: 3200, lag: 0.30, w: 15 },
    fi_oem_tt:   { name: 'Factory Twin Turbos',       type: 'turbo', maxBoost: 22, flow: 620,  spool: 3700, lag: 0.30, w: 25 },
    fi_oem_sc:   { name: 'Factory Supercharger',      type: 'screw', maxBoost: 16, flow: 850,  paras: 0.10, w: 30 },
    fi_oem_vgt:  { name: 'Factory VGT Turbo',         type: 'turbo', maxBoost: 40, flow: 800,  spool: 2900, lag: 0.45, w: 20 },
    t_budget:    { name: 'Budget T3/T4 Turbo Kit',    type: 'turbo', maxBoost: 18, flow: 340,  spool: 3500, lag: 0.45, w: 20, price: 1200,  desc: 'A cheap journal-bearing turbo on a log manifold. Lazy, but it is boost.' },
    t_gt28:      { name: 'Ball-Bearing Turbo 50mm',   type: 'turbo', maxBoost: 22, flow: 380,  spool: 2900, lag: 0.24, w: 16, price: 2400,  desc: 'Small ball-bearing turbo: spools early, made for little engines.' },
    t_small:     { name: 'Small Turbo 54mm',          type: 'turbo', maxBoost: 24, flow: 480,  spool: 3300, lag: 0.30, w: 18, price: 3500,  desc: 'Quick spool, runs out of air up top.' },
    t_61:        { name: 'Turbo 61mm',                type: 'turbo', maxBoost: 28, flow: 640,  spool: 3600, lag: 0.36, w: 20, price: 4500, lvl: 4,  desc: 'A step up from the 54mm without much more lag.' },
    t_twin_sm:   { name: 'Twin 50mm Turbos',          type: 'turbo', maxBoost: 26, flow: 700,  spool: 3300, lag: 0.27, w: 32, price: 5500,  desc: 'Two small turbos, one per bank: quick spool on a V6 or V8.' },
    t_med:       { name: 'Medium Turbo 64mm',         type: 'turbo', maxBoost: 32, flow: 780,  spool: 3900, lag: 0.42, w: 22, price: 6000,  desc: 'The street/strip sweet spot.' },
    t_67:        { name: 'Turbo 67mm',                type: 'turbo', maxBoost: 35, flow: 950,  spool: 4300, lag: 0.48, w: 24, price: 7500, lvl: 5,  desc: 'Radial-tire power with street manners.' },
    t_large:     { name: 'Large Turbo 76mm',          type: 'turbo', maxBoost: 40, flow: 1150, spool: 4900, lag: 0.55, w: 26, price: 9500, lvl: 5,  desc: 'Big power, big lag. Pairs well with a 2-step.' },
    t_80:        { name: 'Turbo 80mm',                type: 'turbo', maxBoost: 45, flow: 1400, spool: 5000, lag: 0.6,  w: 28, price: 13000, desc: 'Big single for big power. Needs a 2-step to launch.' },
    t_twin:      { name: 'Twin 67mm Turbos',          type: 'turbo', maxBoost: 42, flow: 1500, spool: 4300, lag: 0.45, w: 40, price: 16000, desc: 'Two medium turbos: spools faster than one big one.' },
    t_huge:      { name: 'Huge Turbo 88mm',           type: 'turbo', maxBoost: 50, flow: 2000, spool: 5300, lag: 0.70, w: 32, price: 19000, desc: 'Radial-tire monster. Needs revs and an anti-lag.' },
    t_promod:    { name: 'Twin 98mm Pro Mod Turbos',  type: 'turbo', maxBoost: 60, flow: 3600, spool: 7600, lag: 0.80, w: 55, price: 45000, desc: 'Big-tire Pro Mod power.' },
    sc_m90:      { name: 'Small Roots Blower (M90)',  type: 'roots', maxBoost: 10, flow: 430,  paras: 0.12, w: 22, price: 2600,  desc: 'Factory-style blower: torque off idle, modest top end.' },
    sc_street:   { name: 'Centrifugal Street Kit',    type: 'cent',  maxBoost: 14, flow: 620,  paras: 0.06, w: 18, price: 3800,  desc: 'A bolt-on street blower. Boost builds with rpm.' },
    sc_roots:    { name: 'Roots Blower 6-71',         type: 'roots', maxBoost: 16, flow: 900,  paras: 0.14, w: 40, price: 7000,  desc: 'Instant boost from idle. Sticks out of the hood.' },
    sc_screw:    { name: 'Twin-Screw 2.9L',           type: 'screw', maxBoost: 22, flow: 1250, paras: 0.10, w: 35, price: 9000, lvl: 5,  desc: 'Efficient positive-displacement blower.' },
    sc_cent:     { name: 'Centrifugal Supercharger',  type: 'cent',  maxBoost: 30, flow: 1350, paras: 0.07, w: 25, price: 8000, lvl: 5,  desc: 'Boost climbs with RPM. Gentle on tires off the line.' },
    sc_screw2:   { name: 'Twin-Screw 4.5L',           type: 'screw', maxBoost: 30, flow: 1800, paras: 0.11, w: 45, price: 14000, desc: 'Big-displacement screw blower. Huge torque everywhere.' },
    sc_cent2:    { name: 'Race Centrifugal F-Series', type: 'cent',  maxBoost: 40, flow: 2100, paras: 0.08, w: 30, price: 15000, desc: 'Gear-driven race blower. Builds boost hard up top.' },
    sc_1471:     { name: '14-71 Screw Blower',        type: 'roots', maxBoost: 40, flow: 3200, paras: 0.17, w: 60, price: 38000, desc: 'Pro Mod blower. Brutal, instant torque.' }
  };
  // compressor efficiency at its sweet spot: cheap and small units and
  // roots blowers heat the air the most
  var ETA = { fi_oem_s: 0.68, fi_oem_tt: 0.7, fi_oem_sc: 0.62, fi_oem_vgt: 0.72, t_budget: 0.6, t_gt28: 0.72, t_small: 0.68, t_61: 0.73, t_twin_sm: 0.71,
    t_med: 0.74, t_67: 0.75, t_large: 0.76, t_80: 0.77, t_twin: 0.76, t_huge: 0.77, t_promod: 0.78,
    sc_m90: 0.55, sc_street: 0.68, sc_roots: 0.52, sc_screw: 0.66, sc_cent: 0.72, sc_screw2: 0.68, sc_cent2: 0.74, sc_1471: 0.6 };
  Object.keys(ETA).forEach(function (id) { if (DR.FI[id]) DR.FI[id].eta = ETA[id]; });
  DR.FI_SHOP = ['t_budget', 't_gt28', 't_small', 't_61', 't_twin_sm', 't_med', 't_67', 't_large', 't_80', 't_twin', 't_huge', 't_promod',
    'sc_m90', 'sc_street', 'sc_roots', 'sc_screw', 'sc_cent', 'sc_screw2', 'sc_cent2', 'sc_1471'];

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
    opt('c1', 'Stage 1 Cams', 800, { bw: 0.08, low: 0.05, stress: 0, tune: 'soft' }, 'Mild cams. Fine on stock valve springs.'),
    opt('c2', 'Stage 2 Cams', 1400, { bw: 0.16, low: 0.12, stress: 300, tune: 'hard' }, 'Moves the power peak up. More lift: floats stock springs 300 rpm sooner.'),
    opt('c3', 'Stage 3 Race Cams', 2600, { bw: 0.25, low: 0.22, stress: 600, tune: 'hard' }, 'Big power up top, lumpy idle. Needs real valve springs.'),
    opt('c4', 'Solid Roller Race Cams', 5000, { bw: 0.33, low: 0.30, stress: 900, tune: 'hard' }, 'All top end. Needs a race valvetrain to live.')
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
    opt('p4', 'Pro Mod Pistons', 9000, { lvl: 5, hold: 6, be: 2600, cr: 0 }, 'Coated skirts and gas ports. Holds 6x stock power.'),
    // the Lima's own upgrade: the forged, low-compression pistons Ford put in
    // the 2.3 Turbo (SVO, Thunderbird Turbo Coupe) drop straight into the NA block
    opt('p_lima', 'Factory 2.3 Turbo Pistons (Forged)', 900, { lvl: 2, hold: 2.0, be: 1000, cr: -1, only: ['i4_23'] }, 'Ford\'s forged, low-compression pistons from the 2.3 Turbo, a drop-in for the NA Lima. Holds 2x stock power. -2% power, +3 psi before knock.')
  ]};
  C.rods = { name: 'Connecting Rods', engineScaled: true, options: [
    opt('stock', 'Stock Rods', 0, { hold: 1.3, be: 800 }, 'Good for 1.3x stock power.'),
    opt('rb0', 'Stock Rods + ARP Rod Bolts', 350, { hold: 1.6, be: 1000 }, 'The rod bolts are what stretch first. Holds 1.6x stock power.'),
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
    opt('inj0', '440cc Injectors', 250, { tune: 'hard', fuel: 420 }, 'Feeds 420 hp on gasoline.'),
    opt('inj1', '550cc Injectors', 400, { tune: 'hard', fuel: 600 }, 'Feeds 600 hp on gasoline.'),
    opt('inj2', '1000cc Injectors', 800, { tune: 'hard', fuel: 1000 }, 'Feeds 1000 hp on gasoline.'),
    opt('inj3', '1700cc Injectors', 1500, { tune: 'hard', fuel: 1800 }, 'Feeds 1800 hp on gasoline.'),
    opt('inj4', '2400cc Injectors', 3000, { tune: 'hard', lvl: 4, fuel: 2800 }, 'Feeds 2800 hp on gasoline.'),
    opt('inj5', 'Twin Injectors per Cylinder', 6000, { tune: 'hard', lvl: 5, fuel: 5000 }, 'Feeds 5000 hp on gasoline, about 2750 on methanol.'),
    // what ~3000 hp+ methanol engines run: 16 race injectors of 325-500 lb/hr
    opt('inj6', 'Twin 500 lb/hr Race Injectors', 9500, { tune: 'hard', lvl: 5, fuel: 9000 }, 'Two huge race injectors per cylinder, the kind 3000+ hp methanol Pro Mods run. Feeds 9000 hp on gasoline, about 4950 on methanol.')
  ]};
  C.fuelpump = { name: 'Fuel Pump & Lines', options: [
    opt('stock', 'Stock Fuel Pump', 0, { fuel: 0 }),
    opt('fp0', '190 lph Pump + Rising-Rate Regulator', 180, { fuel: 430 }, 'Feeds 430 hp on gasoline.'),
    opt('fp1', '255 lph In-Tank Pump', 300, { fuel: 650 }, 'Feeds 650 hp on gasoline.'),
    opt('fp2', 'Dual 450 lph Pumps', 900, { fuel: 1100 }, 'Feeds 1100 hp on gasoline.'),
    opt('fp3', 'Brushless Pump + -10AN Lines', 2000, { fuel: 1800 }, 'Feeds 1800 hp on gasoline.'),
    opt('fp4', 'Belt-Driven Mechanical Pump', 4500, { lvl: 5, fuel: 5000 }, 'About 12 gallons a minute. Feeds 5000 hp on gasoline, about 2750 on methanol.'),
    opt('fp5', 'Big Belt-Driven Pump (20 GPM)', 7500, { lvl: 5, fuel: 8500 }, 'About 20 gallons a minute, the size alcohol-burning Pro Mods run. Feeds 8500 hp on gasoline, about 4700 on methanol.')
  ]};
  C.fueltype = { name: 'Fuel Type', options: [
    opt('stock', 'Pump Gas 93', 0, { knock: 17, fmul: 1, ff: 1 }, 'Knocks past 17 psi with a cool, intercooled charge, far sooner with a hot one.'),
    opt('e85', 'E85 Ethanol', 800, { tune: 'hard', knock: 30, fmul: 1.04, ff: 0.75, cool: 15 }, '+4% power, 30 psi safe with a cool charge, and it cools a hot one 15 C. Needs 33% more fuel flow.'),
    opt('race', 'Race Gas 116', 1200, { knock: 34, fmul: 1.03, ff: 1 }, '+3% power, 34 psi safe with a cool charge.'),
    opt('meth', 'Methanol', 2500, { tune: 'hard', knock: 50, fmul: 1.06, ff: 0.55, cool: 35 }, '+6% power, 50 psi safe, and it cools the charge 35 C: blown cars run it without an intercooler. Needs about 80% more fuel flow than gasoline: injectors and pumps feed only ~55% of their gasoline rating.')
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
    opt('ecu0', 'Performance Chip', 350, { bw: 0.015, ecu: 0 }, 'An off-the-shelf plug-in chip: a little more timing and fuel for a stock engine. It is not a tune: it can\'t scale new injectors, boost, alcohol fuel or cams. Keeps the factory limiter.'),
    opt('ecu1', 'Street Tune Flash', 600, { bw: 0.03, ecu: 1, tune: true }, 'A custom flash of the factory ECU for your parts: injectors, boost, E85, cams. Better fuel and timing, and the rev limiter goes as far as your engine parts safely allow (up to +800 rpm).'),
    opt('ecu2', 'Standalone ECU', 2000, { bw: 0.05, ecu: 2, tune: true }, 'Tuned for your parts. Fully adjustable rev limiter, launch throttle & throttle ramp tuning.'),
    opt('ecu3', 'Race ECU + Traction Mgmt', 4500, { lvl: 4, bw: 0.08, ecu: 3, tune: true }, 'Tuned for your parts. Adjustable rev limiter and traction control.')
  ]};
  C.ic = { name: 'Intercooler', needsFI: true, options: [
    opt('stock', 'Stock Intercooling', 0, { ic: 0 }, 'Factory boosted engines come with a small intercooler (takes out 60% of the heat); a bolt-on kit has none, so the charge goes in hot.'),
    opt('ic0', 'Budget Front-Mount', 500, { ic: 0.55 }, 'A thin core and long pipes: takes out 55% of the heat. Better than nothing.'),
    opt('ic1', 'Front-Mount Intercooler', 1200, { ic: 0.72 }, 'Takes out 72% of the heat: a cooler, denser charge makes more power per psi and knocks later.'),
    opt('ic2', 'Large Race Intercooler', 2200, { ic: 0.82 }, 'Takes out 82% of the heat.'),
    opt('ic3', 'Air-to-Water + Ice Tank', 4000, { lvl: 4, ic: 0.88, sink: 5 }, 'Ice water in the core: the charge can go in colder than the air outside.')
  ]};
  // gate: share of the turbo's max boost the wastegate can hold steady
  // (an aftermarket turbo's little internal gate creeps and can't hold much)
  // spring: psi the gate opens at (the least boost it runs); ctrl: boost
  // controller ('none' stays at the spring, 'mbc' a manual bleed valve up
  // to 2x the spring, 'ebc' electronic, up to the turbo's limit); creep:
  // how much of the engine's boost creep the gate lets through (internal
  // gates). gate: the old share-of-max model, kept for rival builds.
  C.wastegate = { name: 'Wastegate & Boost Control', needsTurbo: true, options: [
    opt('stock', 'Internal Wastegate, 7 psi Spring', 0, { gate: 0.7, spoolK: 1, spring: 7, ctrl: 'none', creep: 1 }, 'What a bolt-on kit comes with: the gate opens at 7 psi, so it runs 7 psi and no more. On a big engine the small internal gate lets boost creep up near redline. Factory turbos use their own gate and the ECU.'),
    opt('ws1', 'Stiffer Actuator Spring (10 psi)', 150, { gate: 0.76, spoolK: 1, spring: 10, ctrl: 'none', creep: 1 }, 'A 10 psi spring: it runs 10 psi, no more, no less.'),
    opt('ws2', 'Manual Boost Controller', 300, { lvl: 2, gate: 0.82, spoolK: 0.99, spring: 7, ctrl: 'mbc', creep: 1 }, 'A bleed valve on the actuator line holds the gate shut longer: 7 psi spring, up to 14 psi.'),
    opt('ws3', 'Ported Gate + 10 psi Spring + Controller', 650, { lvl: 2, gate: 0.86, spoolK: 0.98, spring: 10, ctrl: 'mbc', creep: 0.5 }, 'A ported flapper flows more (half the boost creep), a 10 psi spring and a manual controller: 10 to 20 psi.'),
    opt('wg1', 'External Wastegate + Manual Controller', 900, { gate: 0.9, spoolK: 0.95, spring: 10, ctrl: 'mbc', creep: 0 }, 'A big external gate: no boost creep and a little quicker spool. 10 psi spring with a manual controller: 10 to 20 psi.'),
    opt('wg2', 'Dual Gates + Electronic Boost Controller', 2200, { gate: 1, spoolK: 0.88, spring: 10, ctrl: 'ebc', creep: 0 }, 'Two external gates and an electronic controller: any target from 10 psi up to the turbo\'s limit, no creep, quicker spool.')
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
    // where the extra fuel comes from: a dry kit adds it through your
    // injectors (and pump); a wet kit sprays its own but draws on your pump;
    // the big foggers come with their own pump and lines
    opt('n50', '50 Shot Dry Kit', 500, { nos: 50, nosFuel: 'inj' }, 'Adds 50 hp when sprayed. The cheapest horsepower there is. Dry: the extra fuel comes through your injectors, so they and the pump must feed the engine plus the shot.'),
    opt('n75', '75 Shot Wet Kit', 800, { nos: 75, nosFuel: 'pump' }, 'Adds 75 hp when sprayed. Wet: sprays its own fuel, drawn from your fuel pump.'),
    opt('n150', '150 Shot Wet Kit', 1500, { nos: 150, nosFuel: 'pump' }, 'Wet: sprays its own fuel, drawn from your fuel pump.'),
    opt('n250', '250 Shot Plate System', 2500, { nos: 250, nosFuel: 'pump' }, 'Wet: sprays its own fuel, drawn from your fuel pump.'),
    opt('n400', '400 Shot Fogger', 4500, { lvl: 4, nos: 400, nosFuel: 'own' }, 'Comes with its own fuel pump and lines.'),
    opt('n650', '650 Shot Dual-Stage Fogger', 8000, { lvl: 5, nos: 650, nosFuel: 'own' }, 'Pro nitrous with its own fuel system. Spray it carefully!')
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
    opt('cls', 'Adjustable Slipper Clutch', 3600, { cap: 1700, engage: 0.22, slide: [0.6, 0.9] }, 'Holds 1700 Nm, and slips on purpose for the first second: a big turbo stays on boost instead of bogging.'),
    opt('cl4', 'Triple-Disc Clutch', 4200, { cap: 2400, engage: 0.17 }, 'Holds 2400 Nm.'),
    opt('cl5', 'Pro Multi-Disc Slider Clutch', 9000, { lvl: 5, cap: 4500, engage: 0.22, slide: [0.55, 1.2] }, 'Holds anything; slips on purpose for smooth launches.')
  ]};
  C.converter = { name: 'Torque Converter', needsConverter: true, options: [
    opt('stock', 'Stock Converter (2200 stall)', 0, { stall: 2200, tr: 1.9 }, 'Tight street converter. Soft launches, little wheelspin.'),
    opt('tcl', 'Low Stall Converter (2800)', 800, { stall: 2800, tr: 1.95 }, 'A little more RPM on the hit. Good for mild builds and street tires.'),
    opt('tcm', 'Medium Stall Converter (3800)', 1500, { stall: 3800, tr: 2.05 }, 'Gets the engine into its powerband before the car moves. Needs more grip.'),
    opt('tch', 'High Stall Converter (5000)', 2600, { stall: 5000, tr: 2.15 }, 'Flashes high on the hit and spools big turbos. For big power and slicks.'),
    // a clutch inside the converter locks engine to gearbox once the car is
    // moving: no slip, so more mph; the gear it locks in is set in Tuning
    opt('tclu', 'Lockup Race Converter (5000)', 4500, { lvl: 5, stall: 5000, tr: 2.15, lockup: true }, 'Flashes like a high stall on the hit, then a clutch inside it locks the engine to the gearbox from the gear you pick in Tuning: no converter slip, more mph. Lock too early and you lose the converter\'s torque multiplication and can shake the tires; most Pro Mod racers lock in high gear. Needs a lockup-capable automatic: a Pro Mod Powerglide or TH400, or a factory electronic automatic.')
  ]};
  C.transbrake = { name: 'Transbrake', needsConverter: true, options: [
    opt('stock', 'None (Foot Brake)', 0, { tbrake: false }, 'The foot brake can only hold so much torque, so you have to ease into the throttle on the line, and the launch is softer.'),
    opt('tb1', 'Transbrake', 1200, { tbrake: true }, 'Locks the transmission so you can hold full throttle (and boost) on the line. Releases instantly at the launch.')
  ]};
  C.shifter = { name: 'Shifter / Shift Kit', needsShifter: true, options: [
    opt('stock', 'Factory Shifter', 0, { shiftK: 1 }),
    opt('ss1', 'Short-Throw Shifter / Shift Kit', 300, { shiftK: 0.85 }, 'Shorter throws on a manual, firmer shifts from an automatic\'s valve body: 15% quicker shifts.'),
    opt('ss2', 'Race Shifter / Manual Valve Body', 1000, { shiftK: 0.72 }, 'A lockout race shifter, or a full manual valve body: 28% quicker shifts.')
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
    // lw: a sideways-engined car is rebuilt with a lengthways driveline
    // (rear-drive gearbox, tunnel, driveshaft)
    opt('rwd', 'RWD Conversion', 9000, { layout: 'RWD', lw: true }, 'Rear-wheel drive: weight transfer works for you. A front-drive car gets a lengthways driveline and a rear-drive gearbox.'),
    // tv: AWD that keeps the sideways engine and its transaxle, like a Golf
    // R or an Evo: a transfer unit on the gearbox, a propshaft, and a rear
    // diff in a new rear subframe. Front-drive cars with sideways engines only.
    opt('awdt', 'Transverse AWD Conversion', 9500, { layout: 'AWD', tv: true, lvl: 4 }, 'All four wheels drive and the sideways engine stays: a transfer unit on the transaxle drives a propshaft to a rear diff in a new rear subframe, like a Golf R or an Evo. +75 kg, most of it at the back, and some power loss. Sideways engines (and either-way ones) still bolt in; a lengthways engine needs the lengthways conversion.'),
    opt('awd', 'AWD Conversion', 16000, { layout: 'AWD', lw: true }, 'All four wheels drive. +90 kg and some power loss. A front-drive car gets a lengthways driveline and a rear-drive gearbox.')
  ]};
  // front-drivers with a factory AWD sibling to take the transverse AWD
  // parts from (rear diff, transfer unit, propshaft): a bolt-in kit job.
  // Anything else gets fabricated rear diff mounts and a custom propshaft.
  DR.AWD_DONOR = {
    ronin: 'Civic Wagon / CR-V Real Time 4WD rear diff and AWD transaxle, on a bolt-in diff mount kit',
    kaze: 'CR-V Real Time 4WD rear diff and AWD transaxle, on a bolt-in diff mount kit',
    volta: 'R32 4Motion (same platform): Haldex rear diff, transfer unit and rear subframe',
    pip: 'Suzuki Swift 4WD (same platform): transfer unit, propshaft and rear axle'
  };
  // sk: spring rate multiplier. low: fixed drop (m). adjS: ride height and
  // spring rates adjustable within ride [lo, hi] (m) and rate [lo, hi] (x).
  C.springs = { name: 'Springs', options: [
    // hg: cornering grip on a circuit (body control and camber), x stock
    opt('stock', 'Stock Springs', 0, { sk: 1, adjS: false, hg: 1 }),
    opt('sp1', 'Lowering Springs', 500, { sk: 1.25, adjS: false, low: 0.03, hg: 1.02 }, 'Drops the car 30 mm and stiffens it. Lower CG, less weight transfer, less travel.'),
    opt('sp2', 'Adjustable Coilovers', 1800, { sk: 1, adjS: true, ride: [-0.06, 0.03], rate: [0.6, 1.5], hg: 1.04 }, 'Set ride height and spring rate at each end. Good on a circuit too.'),
    opt('sp3', 'Drag Coilovers', 2600, { sk: 0.9, adjS: true, ride: [-0.06, 0.07], rate: [0.35, 1.8], hg: 0.97 }, 'Wide ride-height and spring range built for launching. Too soft for a road course.')
  ]};
  // z: damping ratio. adjD: 1 = front rebound + rear bump adjustable, 2 = bump
  // and rebound at both ends. lim: front travel (extension) limiter.
  C.shocks = { name: 'Shocks', options: [
    opt('stock', 'Stock Shocks', 0, { z: 0.42, adjD: 0, hg: 1 }),
    opt('sh1', 'Sport Shocks', 700, { z: 0.50, adjD: 0, hg: 1.02 }, 'Firmer damping: the car takes a set in corners sooner.'),
    opt('sh2', 'Adjustable Drag Shocks', 2500, { z: 0.45, adjD: 1, lim: true, hg: 0.98 }, 'Adjust front rebound and rear bump, plus a front travel limiter. Tuned to let the car squat, not to corner.'),
    opt('sh3', 'Double-Adjustable Race Shocks', 5000, { z: 0.45, adjD: 2, lim: true, pro: true, hg: 1.03 }, 'Bump and rebound at both ends, plus a front travel limiter. Works on a circuit too.')
  ]};
  // anti-roll bars: no use at the strip; on a circuit they hold the body
  // flat (hg) and, adjustable, set the balance (rollBal in Tuning)
  C.sway = { name: 'Anti-Roll Bars', options: [
    opt('stock', 'Stock Anti-Roll Bars', 0, { hg: 1 }),
    opt('sw1', 'Sport Anti-Roll Bars', 450, { hg: 1.02 }, 'Thicker bars: less body roll in corners. No effect at the drag strip.'),
    opt('sw2', 'Adjustable Race Anti-Roll Bars', 1300, { lvl: 2, hg: 1.03, adjR: true }, 'Less body roll, and you set the front/rear balance in Tuning: stiffer front = more understeer, stiffer rear = more oversteer.')
  ]};
  C.rearsusp = { name: 'Rear Suspension', options: [
    opt('stock', 'Stock Rear Suspension', 0, { as: 0.35, adjA: false }),
    opt('rs0', 'Poly Bushings + Lower Arms', 300, { as: 0.45, adjA: false }, 'Less axle wrap: the rear plants a little harder.'),
    opt('rs1', 'Traction Bars', 600, { as: 0.6, adjA: false }, 'Plants the rear tires harder.'),
    opt('rs2', 'Adjustable Ladder Bars', 2500, { as: 0.75, adjA: true, asMin: 0.3, asMax: 1.3 }, 'Adjustable instant centre (anti-squat).'),
    opt('rs3', 'Adjustable 4-Link', 5500, { as: 0.85, adjA: true, asMin: 0.2, asMax: 1.6, pro: true }, 'The ultimate drag suspension.')
  ]};
  // stiff: how much of the rear links' bite reaches the tires instead of
  // twisting the body; kg added
  C.chassis = { name: 'Chassis / Roll Cage', options: [
    opt('stock', 'Stock Unibody', 0, { stiff: 0.9, kg: 0, shellK: 1 }, 'The body twists on a hard launch.'),
    opt('cg1', 'Subframe Connectors', 400, { stiff: 0.95, kg: 7, shellK: 1.3 }, 'Ties the front and rear frame rails together: the shell takes 30% more power.'),
    opt('cg2', '8-Point Roll Bar', 1500, { stiff: 0.98, kg: 18, shellK: 1.8, tech: 1 }, 'Stiffer chassis, 80% more power before it twists, and tech lets you run quicker than 11.50.'),
    opt('cg3', '25.3 Chromoly Roll Cage', 4000, { stiff: 1, kg: 26, shellK: 3, tech: 2 }, 'A rigid chassis that takes 3x the power. Tech lets you run quicker than 10.00. Every bit of anti-squat goes to the tires.')
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
    // cla: downforce (lift coefficient x area, m^2); claF: share on the
    // front axle (circuit balance; the drag sim puts it all on the rear)
    opt('stock', 'Stock Body', 0, { cla: 0, dcda: 0 }),
    opt('a1', 'Rear Spoiler', 600, { cla: 0.25, dcda: 0.02, claF: 0 }, 'A little rear downforce at speed.'),
    opt('a3', 'Front Splitter + Rear Wing', 2200, { lvl: 2, cla: 0.8, dcda: 0.06, claF: 0.4 }, 'Balanced downforce front and rear: built for a road course.'),
    opt('a2', 'Big Rear Wing', 1400, { cla: 0.55, dcda: 0.05, claF: 0 }, 'More rear downforce, more drag. On a circuit, rear-only downforce pushes the car toward understeer.')
  ]};
  C.wheels = { name: 'Wheels', options: [
    opt('stock', 'Stock Wheels', 0, { wm: 0, bead: false }),
    opt('wh1', 'Lightweight Wheels', 800, { wm: -8, bead: false }, '-8 kg of rotating mass.'),
    opt('wh2', 'Forged Wheels', 2000, { wm: -14, bead: false }, '-14 kg of rotating mass.'),
    opt('wh3', 'Beadlock Drag Wheels', 2600, { wm: -10, bead: true }, 'Lets you run very low tire pressure safely.')
  ]};
  C.brakes = { name: 'Brakes', options: [
    // bcap: the most braking (g) the brakes can make (grip permitting);
    // bias: how close the front/rear balance gets to ideal
    opt('stock', 'Stock Brakes', 0, { bkg: 0, bcap: 1.3, bias: 0.95 }),
    opt('br1', 'Lightweight Drag Brakes', 900, { bkg: -10, bcap: 0.8, bias: 0.93 }, '-10 kg of rotating mass. Small rotors made to stop once from the end of a strip: weak on a circuit.'),
    opt('br3', 'Big Brake Kit', 1600, { lvl: 2, bkg: 4, bcap: 1.8, bias: 0.98 }, 'Big rotors and calipers with track pads and a better front/rear balance. +4 kg.'),
    opt('br2', 'Carbon Race Brakes', 3000, { bkg: -16, bcap: 2.2, bias: 0.98 }, '-16 kg of rotating mass, and they stop hard lap after lap.')
  ]};
  C.ftires = { name: 'Front Tires', options: [
    // circuit: what the tires on the axle that isn't driven are. stock: the
    // car's factory tire; skinny runners: barely any grip; match: the same
    // tire as the drive tires (road tires only, not drag tires)
    opt('stock', 'Stock Front Tires', 0, { fm: 0, roll: 1 }, 'The factory tires on the wheels that aren\'t driven.'),
    opt('ft1', 'Skinny Front Runners', 700, { fm: -14, roll: 0.75, lat: 0.6 }, 'Less weight & rolling resistance. Almost no cornering or braking grip.'),
    opt('ft2', 'Matching Tires All Round', 600, { fm: 0, roll: 1, match: true }, 'The wheels that aren\'t driven get the same road tire as the drive wheels (street, track or race slick). No use with drag tires.')
  ]};
  C.weight = { name: 'Weight Reduction', options: [
    opt('stock', 'Stock', 0, { wr: 0 }),
    opt('w0', 'Spare, Jack & A/C Delete', 250, { wr: 0.02 }, '-2% chassis weight.'),
    opt('w1', 'Stage 1: Interior Strip', 1000, { wr: 0.05 }, '-5% chassis weight.'),
    opt('w2', 'Stage 2: Lightweight Panels', 4000, { wr: 0.10 }, '-10% chassis weight.'),
    opt('w3', 'Stage 3: Carbon Body & Lexan', 12000, { wr: 0.16 }, '-16% chassis weight.'),
    opt('w4', 'Stage 4: Tube Chassis', 35000, { wr: 0.24, low: 0.03 }, '-24% chassis weight and a lower CG. A tube chassis with a certified cage: it takes any power.')
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
    { id: 'drive',  name: 'Drivetrain',    icon: 'trans',   cats: ['trans', 'clutch', 'converter', 'transbrake', 'shifter', 'flywheel', 'driveshaft', 'diff', 'rearend', 'layout'] },
    { id: 'susp',   name: 'Suspension',    icon: 'springs', cats: ['springs', 'shocks', 'sway', 'rearsusp', 'frontsusp', 'chassis', 'wheeliebar', 'aero'] },
    { id: 'tires',  name: 'Wheels & Tires',icon: 'rtires',  cats: ['rtires', 'wheels', 'ftires', 'brakes'] },
    { id: 'body',   name: 'Weight',        icon: 'weight',  cats: ['weight', 'battery'] }
  ];
  DR.UNLOCK_NAMES = { engine: 'Engine', power: 'Power adder', drive: 'Drivetrain', susp: 'Suspension', tires: 'Wheel & tire', body: 'Weight' };
  DR.CAT_NAMES = { engine: 'Engine Swap', fi: 'Turbo / Supercharger', trans: 'Transmission', rtires: 'Drive Tires' };

  DR.enginePriceMul = function (engId) {
    var e = DR.ENGINES[engId];
    return Math.max(0.6, Math.min(3, 0.5 + e.hp / 400));
  };

  // What it takes to put an engine in this car, on top of the engine:
  // { install: $, lines: [[what, $]], block: reason it can't go in yet }.
  // Same orientation and a bay big enough is a bolt-in job; a transverse
  // engine in a rear-drive car needs an adapter kit; a longitudinal engine
  // in a front-drive car needs the car converted first; every size over
  // what the bay takes means cutting and fabricating.
  DR.swapFit = function (inst, engId) {
    var car = DR.CARS[inst.carId], e = DR.ENGINES[engId], out = { install: 0, lines: [], block: '' };
    if (engId === car.engine) return out;
    var carMount = DR.converted(inst) ? 'L' : car.mount;
    function add(what, $) { out.lines.push([what, $]); out.install += $; }
    add('Labour, mounts & wiring harness', 550 + 250 * e.size);
    if (e.mount !== 'B' && e.mount !== carMount) {
      if (e.mount === 'T') add('Rear-drive adapter: bellhousing, custom mounts, driveshaft', 2500);
      else if (car.drive === 'FWD') out.block = 'A longitudinal engine needs a RWD or lengthways AWD conversion first (Drivetrain)';
      else add('Longitudinal conversion: transfer case & tunnel', 8000);
    }
    var over = e.size - car.bay;
    if (over === 1) add('Fabrication: crossmember notch, shock-tower & header clearance', 1800);
    else if (over === 2) add('Fabrication: tube front clip, firewall set back', 6000);
    else if (over >= 3) add('Fabrication: tube front half, engine set back', 12000);
    return out;
  };

  // "2.0L inline-4, turbocharged" style summary of an engine
  DR.engineLayout = function (e) {
    var lay = e.rotary ? 'twin-rotor Wankel' : (e.name.indexOf('Flat') >= 0 || e.name.indexOf('Boxer') >= 0 ? 'flat-' : e.cyl >= 6 && e.name.indexOf(' I6') < 0 ? 'V' : 'inline-') + (e.rotary ? '' : e.cyl);
    var fi = e.fi ? DR.FI[e.fi.part] : null;
    var asp = !fi ? 'naturally aspirated' : fi.type === 'turbo' ? (fi.name.indexOf('Twin') >= 0 ? 'twin-turbo' : fi.name.indexOf('VGT') >= 0 ? 'variable-geometry turbo' : 'turbocharged') : 'supercharged';
    return e.disp.toFixed(1) + 'L ' + lay + ', ' + asp + (e.diesel ? ' diesel' : '');
  };

  // Which gearboxes fit: a transverse car on its factory layout takes a
  // transaxle (T); anything rear- or all-wheel drive from a lengthways
  // driveline, including a car converted to one, takes a rear-drive box
  // (L). A transverse AWD conversion keeps the transaxle.
  DR.converted = function (inst) { var l = inst.parts && inst.parts.layout; return !!l && l !== 'stock' && !!(C.layout.options.filter(function (o) { return o.id === l; })[0] || {}).lw; };
  DR.transMount = function (inst) { return DR.CARS[inst.carId].mount === 'T' && !DR.converted(inst) ? 'T' : 'L'; };
  DR.transFits = function (inst, id) { return (DR.TRANS[id].mount || 'L') === DR.transMount(inst); };
  // the nearest box of the other kind (rear-drive box -> transaxle and back)
  var TX_EQUIV = { m5_light: 'tx5', m5_t5_4: 'tx5', m5_t5_v6: 'tx5', m5_t5_v8: 'tx5', m5_hd: 'tx5_hd', m4_cl: 'tx5_hd', m6: 'tx6', m6_hd: 'tx6_hd',
    a4: 'tx4a', a6: 'tx4a', a4_hd: 'tx4a', a6_hd: 'tx4a', m6_tr: 'tx6_hd', a8: 'tx4a', a3_400: 'tx4a', pg2: 'tx4a', a2_pg: 'tx4a', dct6: 'txdct', dct7: 'txdct', seq6: 'txseq', lenco5: 'txseq', pg_pm: 'tx4a', a3_pm: 'tx4a', dog4: 'tx6_hd', seq6_hd: 'txseq', cl5: 'txseq',
    tx5: 'm5_light', tx5_hd: 'm5_hd', tx6: 'm6', tx6_hd: 'm6_hd', tx4a: 'a4', txdct: 'dct7', txseq: 'seq6' };
  DR.transEquiv = function (id) { return TX_EQUIV[id] || id; };
  // a build (an opponent's, an old save's) with a gearbox that can't fit
  // gets the matching box of the right kind
  DR.fitTrans = function (inst) {
    var t = inst.parts && inst.parts.trans;
    if (t && !DR.transFits(inst, t)) { var q = DR.transEquiv(t); if (q === DR.stockPart('trans', inst)) delete inst.parts.trans; else inst.parts.trans = q; }
    return inst;
  };
  // Stock option id for a category on this car instance.
  DR.stockPart = function (cat, inst) {
    var car = DR.CARS[inst.carId];
    if (cat === 'engine') return car.engine;
    if (cat === 'trans') return DR.converted(inst) && DR.TX_REAR[car.trans] ? DR.TX_REAR[car.trans] : car.trans;
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
        var fit = DR.swapFit(inst, ids[i]);
        list.push({ id: ids[i], name: e.name, price: ids[i] === car.engine ? 0 : e.price, lvl: ids[i] === car.engine ? 0 : e.lvl, install: fit.install, fit: fit,
          desc: e.hp + ' hp at ' + e.pk + ' rpm. ' + DR.engineLayout(e) + '. Weighs ' + e.w + ' kg (' + Math.round(e.w * 2.2046) + ' lb) dressed.' +
            (fit.block ? ' ' + fit.block + '.' : fit.install ? ' Install in this car: $' + fit.install.toLocaleString('en-US') + '.' : '') });
      }
      return list;
    }
    if (cat === 'trans') {
      var fac = DR.stockPart('trans', inst);
      list.push({ id: fac, name: DR.TRANS[fac].name + (fac === car.trans ? ' (Factory)' : ' (with the conversion)'), price: 0, desc: transDesc(fac) });
      DR.TRANS_SHOP.forEach(function (t) { if (t !== fac && DR.transFits(inst, t)) list.push({ id: t, name: DR.TRANS[t].name, price: DR.TRANS[t].price, desc: transDesc(t) }); });
      return list;
    }
    if (cat === 'rtires') {
      list.push({ id: car.tire, name: DR.TIRES[car.tire].name + ' (Factory)', price: 0, desc: tireDesc(car.tire) });
      DR.TIRE_SHOP.forEach(function (t) { if (t !== car.tire) list.push({ id: t, name: DR.TIRES[t].name, price: DR.TIRES[t].price, lvl: DR.TIRES[t].lvl, desc: tireDesc(t) }); });
      return list;
    }
    if (cat === 'fi') {
      var st = DR.stockPart('fi', inst);
      list.push({ id: st, name: st === 'none' ? 'None (Naturally Aspirated)' : DR.FI[st].name + ' (Factory)', price: 0, desc: st === 'none' ? '' : 'Max ' + DR.FI[st].maxBoost + ' psi, feeds ~' + DR.FI[st].flow + ' hp.' });
      DR.FI_SHOP.forEach(function (f) { var u = DR.FI[f]; list.push({ id: f, name: u.name, price: u.price, lvl: u.lvl, tune: 'hard', desc: u.desc + ' Max ' + u.maxBoost + ' psi, feeds ~' + u.flow + ' hp. Needs an ECU tune: the stock one can only run ~5 psi. Plan on injectors and a pump too.' }); });
      return list;
    }
    if (cat === 'diff') {
      return C.diff.options.map(function (o) { return Object.assign({}, o, { price: o.id === car.diff ? 0 : o.price, name: o.name + (o.id === car.diff ? ' (Factory)' : '') }); });
    }
    if (cat === 'layout') {
      var tvCar = car.mount === 'T' && car.drive === 'FWD', donor = DR.AWD_DONOR[inst.carId];
      return C.layout.options.filter(function (o) { return o.id === 'stock' || (o.layout !== car.drive && (!o.tv || tvCar)); })
        .map(function (o) {
          if (o.id === 'stock') return Object.assign({}, o, { name: 'Factory ' + car.drive });
          if (o.tv) return Object.assign({}, o, donor ? { desc: o.desc + ' Parts from the ' + donor + '.' } : { price: 14000, desc: o.desc + ' There was never an AWD version of this car, so the rear diff mounts, propshaft and subframe are fabricated.' });
          if (o.id === 'awd' && tvCar) return Object.assign({}, o, { name: 'Lengthways AWD Conversion' });
          return o;
        });
    }
    var c = C[cat], mul = c.engineScaled ? DR.enginePriceMul(inst.engine || car.engine) : 1;
    var eng = DR.ENGINES[inst.engine || car.engine], rot = eng.rotary && ROTARY[cat];
    var engId = inst.engine || car.engine;
    return c.options.map(function (o, i) {
      if (o.only && o.only.indexOf(engId) < 0) return null;   // made for one engine
      if (rot) { var r = rot.options[i]; o = Object.assign({}, o, { name: r[0], desc: r[1] }, r[2] || {}); }
      var x = Object.assign({}, o, { price: Math.round(o.price * mul / 50) * 50, lvl: lvlOf(o) });
      if (o.hold) x.desc = (o.desc ? o.desc + ' ' : '') + 'About ' + Math.round(eng.safe * o.hold / 10) * 10 + ' hp on this engine.';
      if (o.tune === 'hard' || (o.tune === true && cat !== 'ecu')) x.desc = (x.desc ? x.desc + ' ' : '') + 'Needs an ECU tune (flash or standalone).';
      if (o.tune === 'soft') x.desc = (x.desc ? x.desc + ' ' : '') + 'Runs on the stock tune, but only makes about half its gain without one.';
      return x;
    }).filter(Boolean).sort(function (a, b) { return (a.price ? 1 : 0) - (b.price ? 1 : 0) || (b.only ? 1 : 0) - (a.only ? 1 : 0); });
  }

  // Whether a category applies to this car right now (e.g. clutch vs converter).
  // ---------------------------------------------------------------- engine kinds
  // A rotary has no pistons, rods, crank, cams or valves: it breathes through
  // ports in its housings, and its rotors, apex seals, eccentric shaft and
  // housings take the place of the bottom end. A diesel has no spark, no
  // throttle body and does not run gasoline or alcohol.
  DR.engineKind = function (inst) { var e = DR.ENGINES[inst.engine || DR.CARS[inst.carId].engine]; return e.rotary ? 'rotary' : e.diesel ? 'diesel' : 'piston'; };
  var NOT_FOR = { rotary: { rods: 1, cams: 1, valvetrain: 1 }, diesel: { ignition: 1, throttle: 1, fueltype: 1 } };
  // rotary versions of the bottom-end and head categories: same jobs (hold,
  // be, bw), rotary parts. Porting carries the breathing heads and cams give
  // a piston engine (0.30 + 0.33).
  var ROTARY = {
    heads: { name: 'Porting', options: [
      ['Factory Ports', 'Stock port timing.'],
      ['Street Port', 'Enlarged side ports: more air up top, a little lumpier idle.', { bw: 0.2, low: 0.05 }],
      ['Bridge Port', 'A second port bridged over each side port. Big top end, rough idle.', { bw: 0.42, low: 0.15 }],
      ['Peripheral Port', 'Race ports through the rotor housings: all top end.', { bw: 0.63, low: 0.3 }]] },
    pistons: { name: 'Rotors & Apex Seals', options: [
      ['Factory Rotors, 2mm Seals', 'The thin factory apex seals are the first thing to let go.'],
      ['Low-Comp Rotors + 3mm Seals', 'Holds 2x stock power. Lower compression: -2% power, +3 psi before detonation.'],
      ['High-Comp Rotors + 3mm Seals', 'Holds 1.7x stock power. Higher compression: +4% power, 3 psi less before detonation.'],
      ['Ceramic Apex Seals', 'Holds 3.4x stock power.'],
      ['Billet Rotors + Race Seals', 'Holds 6x stock power.']] },
    crank: { name: 'Eccentric Shaft', options: [
      ['Factory E-Shaft', 'Good for 1.5x stock power.'], ['Lightened E-Shaft', 'Holds 2.8x stock power.'],
      ['Billet E-Shaft', 'Holds 4.5x stock power.'], ['Pro Billet E-Shaft', 'Holds 6.5x stock power and revs quicker.']] },
    block: { name: 'Housings & Irons', options: [
      ['Factory Housings', 'The irons flex and the housings walk around 1.8x stock power.'], ['Studded Irons + Dowels', 'Holds 2.5x stock power.'],
      ['Studded Billet Plates', 'Holds 4x stock power.'], ['Billet Housings & Irons', 'Holds 7x stock power.']] }
  };
  // false for parts this kind of engine simply does not have (hidden, not
  // just 'does not fit')
  DR.partExists = function (cat, inst) { var nf = NOT_FOR[DR.engineKind(inst)]; return !(nf && nf[cat]); };
  // icon for a category on this car (a rotary's 'pistons' are rotors)
  DR.iconCat = function (cat, inst) { return cat === 'pistons' && inst && DR.engineKind(inst) === 'rotary' ? 'rotor' : cat; };
  DR.partApplies = function (cat, inst) {
    var nf = NOT_FOR[DR.engineKind(inst)];
    if (nf && nf[cat]) return false;
    var c = C[cat];
    if (!c) return true;
    var tr = DR.TRANS[DR.partId('trans', inst)];
    if (c.needsClutch) return tr.type !== 'auto';
    if (c.needsConverter) return tr.type === 'auto';
    if (c.needsFI) return DR.partId('fi', inst) !== 'none';
    if (c.needsTurbo) return DR.FI[DR.partId('fi', inst)].type === 'turbo';
    if (c.needsShifter) return tr.type === 'manual' || tr.type === 'auto';
    if (c.needsNos) return DR.partId('nitrous', inst) !== 'stock';
    return true;
  };

  DR.catName = function (cat, inst) {
    if (inst && ROTARY[cat] && DR.engineKind(inst) === 'rotary') return ROTARY[cat].name;
    return DR.CAT_NAMES[cat] || (C[cat] && C[cat].name) || cat;
  };

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
      (x.adj ? '. Adjustable gear ratios.' : '.') + (x.mount === 'T' ? ' A transaxle, for a sideways engine.' : '');
  }
  function tireDesc(t) {
    var x = DR.TIRES[t];
    return x.kind + '. Launch grip ' + x.mu.toFixed(2) + ', cornering grip ' + x.lat.toFixed(2) + ', best at ' + x.optP + ' psi & ' + x.topt + '°C. ' + Math.round(x.r * 2 / 0.0254) + '" tall.' +
      (x.kind === 'Drag Radial' ? ' Soft sidewalls: weak in corners.' : x.kind === 'Slick' ? ' A drag slick: almost no cornering grip.' : x.kind === 'Track' ? ' A road-course tire: sticky in corners.' : x.kind === 'Race Slick' ? ' A road-race slick: the most cornering grip there is.' : '');
  }

  // Engine-related categories that get removed on an engine swap.
  DR.ENGINE_BOUND = ['airfilter', 'intake', 'throttle', 'exhaust', 'headers', 'heads', 'cams', 'valvetrain',
    'pistons', 'rods', 'crank', 'block', 'oiling', 'fi', 'ic', 'wastegate', 'bov'];

  // ---------------------------------------------------------------- packages
  // Quick upgrade packages (like Need for Speed: Underground 2's Street / Pro
  // / Extreme kits): a matched set of parts per shop group, bought and fitted
  // in one go at a discount. An entry is [cat, id] or [cat, fn(inst) -> id]
  // so a package can suit the car (automatic vs manual, boosted vs NA).
  DR.PKG_TIERS = [{ id: 'budget', name: 'Budget', lvl: 1 }, { id: 'street', name: 'Street', lvl: 2 }, { id: 'pro', name: 'Pro', lvl: 3 }, { id: 'extreme', name: 'Extreme', lvl: 4 }];
  DR.PKG_DISCOUNT = 0.1;
  function auto(inst) { return DR.TRANS[DR.partId('trans', inst)].type === 'auto'; }
  function boosted(inst) { return DR.partId('fi', inst) !== 'none'; }
  function aftermarketFI(inst) { var f = DR.FI[DR.partId('fi', inst)]; return !!f.price || f.type === 'none'; }
  // parts sized to the car rather than fixed: a turbo that suits the
  // engine, fuel that feeds the power, a gearbox / clutch / axles that hold
  // the torque
  // a turbo that feeds about k x the engine's stock power; only the
  // Extreme kit (replace) swaps out a factory turbo, and only for a bigger one
  function turboFor(k, replace) { return function (inst) {
    if (!aftermarketFI(inst) && !replace) return null;
    var want = DR.ENGINES[inst.engine].hp * k, cur = DR.FI[DR.partId('fi', inst)];
    var t = DR.FI_SHOP.filter(function (f) { return DR.FI[f].type === 'turbo'; }).sort(function (a, b) { return DR.FI[a].flow - DR.FI[b].flow; });
    var pick = t[t.length - 1];
    for (var i = 0; i < t.length; i++) if (DR.FI[t[i]].flow >= want) { pick = t[i]; break; }
    if (DR.FI[pick].flow <= (cur.flow || 0)) return null;
    // A factory turbo is only swapped for one that really makes more power
    // where the engine lives (sized from the stock power of an engine that
    // already has boost, "k x" would pick a turbo that never spools): try
    // the bigger turbos smallest first, at the package's boost
    if (cur.type !== 'none' && !cur.price) {
      var base = bandPower(inst), best = null, bestP = base * 1.08;
      t.forEach(function (id) {
        if (DR.FI[id].flow <= cur.flow) return;
        var c = withParts(inst, { fi: id }); c.tune = Object.assign({}, c.tune); delete c.tune.boost;
        var S0 = DR.buildSpec(c); c.tune.boost = Math.max(S0.boostSet, Math.min(DR.PKG_BOOST[DR.PKG_BOOST.length - 1], S0.knock - 1, S0.sparkPsi, S0.maxBoost));
        var pw = bandPower(c);
        if (pw > bestP) { bestP = pw; best = id; }
      });
      return best;
    }
    return pick;
  }; }
  // average power over the top half of the rev range (where a drag car lives)
  function bandPower(inst) {
    var S = DR.buildSpec(inst), d = DR.dyno(S), sum = 0, n = 0;
    d.pts.forEach(function (q) { if (q.rpm >= S.red * 0.5 && q.rpm <= S.red) { sum += q.hp; n++; } });
    return n ? sum / n : d.peakHp;
  }
  // a converter that flashes to a useful rpm for this engine: never past
  // about 60% of the redline (a diesel or a low-revving big block bogs on a
  // converter made for a high-revving engine)
  function converterFor(maxId) { return function (inst) {
    var red = DR.buildSpec(inst).red, opts = C.converter.options, pick = null;
    for (var i = 1; i < opts.length; i++) {
      if (opts[i].stall <= red * 0.62) pick = opts[i].id;
      if (opts[i].id === maxId) break;
    }
    return pick;
  }; }
  function withParts(inst, p) { var c = JSON.parse(JSON.stringify(inst)); for (var k in p) c.parts[k] = p[k]; return c; }
  function fuelFor(cat, min) { return function (inst) {
    // power the engine would make with unlimited fuel, plus a margin
    var S = DR.buildSpec(withParts(inst, { injectors: 'inj6', fuelpump: 'fp5', ecu: DR.getOption('ecu', inst).tune ? DR.partId('ecu', inst) : 'ecu1' }));
    // nitrous that takes its fuel from this part counts too (dry: injectors
    // and pump; wet: the pump)
    var spray = S.nosHp && (S.nosFuel === 'inj' || (S.nosFuel === 'pump' && cat === 'fuelpump')) ? S.nosHp : 0;
    var need = (S.peakHp * 1.12 + spray) / (S.diesel ? 1 : DR.getOption('fueltype', inst).ff);
    // nothing to do if what's fitted already feeds it
    var now = DR.buildSpec(inst);
    if ((cat === 'injectors' ? now.fuelInj : now.fuelPump) >= need) return null;
    var opts = C[cat].options;
    for (var i = Math.max(1, min); i < opts.length; i++) if (opts[i].fuel >= need) return opts[i].id;
    return opts[opts.length - 1].id;
  }; }
  function torqueNm(inst) { var S = DR.buildSpec(inst); return S.peakTq / 0.7376 + (S.nosW ? S.nosW / (4000 * Math.PI / 30) : 0); }
  function transFor(inst) {
    var tr = DR.TRANS[DR.partId('trans', inst)], need = torqueNm(inst) * 1.08;
    if (tr.maxTq >= need) return null;
    // same kind of box if one holds it, else a manual steps up to a
    // sequential (still on a clutch); the strongest of its kind otherwise
    // (a dual-clutch only ever steps up to a sequential: a manual shifts slower)
    var fam = tr.type === 'auto' ? ['auto'] : tr.type === 'dct' ? ['dct', 'seq'] : [tr.type, 'manual', 'seq'];
    for (var f = 0; f < fam.length; f++) {
      var ok = DR.TRANS_SHOP.filter(function (t) { return DR.transFits(inst, t) && DR.TRANS[t].type === fam[f] && DR.TRANS[t].maxTq >= need; }).sort(function (a, b) { return DR.TRANS[a].price - DR.TRANS[b].price; });
      if (ok.length) return ok[0];
    }
    return DR.TRANS_SHOP.filter(function (t) { return DR.transFits(inst, t) && fam.indexOf(DR.TRANS[t].type) >= 0; }).sort(function (a, b) { return DR.TRANS[b].maxTq - DR.TRANS[a].maxTq; })[0];
  }
  function clutchFor(min) { return function (inst) {
    var need = torqueNm(inst) * 1.1, opts = C.clutch.options;
    for (var i = min; i < opts.length; i++) if (opts[i].cap >= need) return opts[i].id;
    return opts[opts.length - 1].id;
  }; }
  function axleFor(min) { return function (inst) {
    var S = DR.buildSpec(inst), need = S.risk.hit * 1.05, opts = C.rearend.options;
    for (var i = min; i < opts.length; i++) if (opts[i].axle >= need) return opts[i].id;
    return opts[opts.length - 1].id;
  }; }
  // the lightest chassis brace that keeps the body in one piece
  function chassisFor(inst) {
    var S = DR.buildSpec(inst), need = (S.peakHp + S.nosHp) / (S.shell / (DR.getOption('chassis', inst).shellK || 1)), opts = C.chassis.options;
    for (var i = 1; i < opts.length; i++) if (opts[i].shellK >= need) return opts[i].id;
    return opts[opts.length - 1].id;
  }
  DR.PACKAGES = {
    engine: [
      [['airfilter', 'af2'], ['intake', 'i1'], ['throttle', 'tb1'], ['headers', 'h1']],
      [['airfilter', 'af2'], ['intake', 'i1'], ['throttle', 'tb1'], ['headers', 'h1'], ['exhaust', 'e1']],
      [['airfilter', 'af2'], ['intake', 'i2'], ['throttle', 'tb2'], ['headers', 'h2'], ['exhaust', 'e2']],
      [['airfilter', 'af3'], ['intake', 'i3'], ['throttle', 'tb3'], ['headers', 'h3'], ['exhaust', 'e3']]],
    top: [
      [['cams', 'c1'], ['valvetrain', 'vt1']],
      [['heads', 'hd1'], ['cams', 'c1'], ['valvetrain', 'vt1']],
      [['heads', 'hd2'], ['cams', 'c2'], ['valvetrain', 'vt2']],
      [['heads', 'hd3'], ['cams', 'c3'], ['valvetrain', 'vt3']]],
    bottom: [
      [['rods', 'rb0'], ['oiling', 'o1']],
      [['pistons', function (i) { return boosted(i) ? 'p1' : 'p2'; }], ['rods', 'r1'], ['oiling', 'o1']],
      [['pistons', function (i) { return boosted(i) ? 'p1' : 'p2'; }], ['rods', 'r2'], ['crank', 'k1'], ['block', 'b1'], ['oiling', 'o1']],
      [['pistons', 'p3'], ['rods', 'r3'], ['crank', 'k2'], ['block', 'b2'], ['oiling', 'o2']]],
    fuel: [
      [['ignition', 'ig1'], ['ecu', 'ecu1'], ['injectors', fuelFor('injectors', 1)], ['fuelpump', fuelFor('fuelpump', 1)]],
      [['ignition', 'ig1'], ['ecu', 'ecu1'], ['injectors', fuelFor('injectors', 2)], ['fuelpump', fuelFor('fuelpump', 2)]],
      [['fueltype', 'e85'], ['ignition', 'ig2'], ['ecu', 'ecu2'], ['injectors', fuelFor('injectors', 3)], ['fuelpump', fuelFor('fuelpump', 3)]],
      [['fueltype', 'e85'], ['ignition', 'ig3'], ['ecu', 'ecu3'], ['injectors', fuelFor('injectors', 4)], ['fuelpump', fuelFor('fuelpump', 4)]]],
    power: [
      [['fi', turboFor(1.3)], ['ic', 'ic0'], ['wastegate', 'ws2'], ['bov', 'bov1']],
      [['fi', turboFor(1.5)], ['ic', 'ic1'], ['wastegate', 'wg1'], ['bov', 'bov1'], ['launch', 'l1']],
      [['fi', turboFor(2.5)], ['ic', 'ic2'], ['wastegate', 'wg2'], ['bov', 'bov1'], ['launch', 'l1']],
      [['fi', turboFor(4, true)], ['ic', 'ic3'], ['wastegate', 'wg2'], ['bov', 'bov2'], ['launch', 'l2']]],
    drive: [
      [['trans', transFor], ['clutch', clutchFor(1)], ['converter', converterFor('tcl')], ['shifter', 'ss1'], ['rearend', axleFor(1)]],
      [['trans', transFor], ['clutch', clutchFor(1)], ['converter', converterFor('tcl')], ['shifter', 'ss1'], ['flywheel', 'fw1'], ['diff', 'lsd'], ['driveshaft', 'ds1'], ['rearend', axleFor(1)]],
      [['trans', transFor], ['clutch', clutchFor(2)], ['converter', converterFor('tcm')], ['transbrake', 'tb1'], ['shifter', 'ss2'], ['flywheel', 'fw1'], ['diff', 'lsd'], ['driveshaft', 'ds1'], ['rearend', axleFor(1)]],
      [['trans', transFor], ['clutch', clutchFor(3)], ['converter', converterFor('tch')], ['transbrake', 'tb1'], ['shifter', 'ss2'], ['flywheel', 'fw2'], ['diff', 'spool'], ['driveshaft', 'ds2'], ['rearend', axleFor(2)],
        // a front-driver making real power is converted to drive the rear
        ['layout', function (i) { return DR.CARS[i.carId].drive === 'FWD' ? 'rwd' : null; }]]],
    susp: [
      [['springs', 'sp1'], ['rearsusp', 'rs0'], ['chassis', 'cg1']],
      [['springs', 'sp1'], ['shocks', 'sh1'], ['rearsusp', 'rs1'], ['chassis', 'cg1']],
      [['springs', 'sp2'], ['shocks', 'sh2'], ['rearsusp', 'rs2'], ['chassis', 'cg2'], ['frontsusp', 'fs1']],
      [['springs', 'sp3'], ['shocks', 'sh3'], ['rearsusp', 'rs3'], ['chassis', 'cg3'], ['frontsusp', 'fs2'], ['wheeliebar', function (i) { return DR.CARS[i.carId].drive === 'FWD' ? null : 'wb1'; }]]],
    tires: [
      [['rtires', 'dr_245']],
      [['rtires', 'dr_275'], ['wheels', 'wh1']],
      [['rtires', 'dr_315'], ['wheels', 'wh2'], ['brakes', 'br1']],
      [['rtires', 'sl_31'], ['wheels', 'wh3'], ['brakes', 'br2'], ['ftires', 'ft1']]],
    body: [
      [['weight', 'w0'], ['battery', 'bt1']],
      [['weight', 'w1'], ['battery', 'bt1']],
      [['weight', 'w2'], ['battery', 'bt2']],
      [['weight', 'w3'], ['battery', 'bt2']]]
  };
  // boost a package leaves the car on, if it fits a turbo / blower
  DR.PKG_BOOST = [8, 10, 15, 20];
  // the full-car package fits the power adders first, so the bottom end
  // and fuel pick parts for a boosted engine
  DR.PKG_ORDER = ['power', 'engine', 'top', 'bottom', 'fuel', 'drive', 'susp', 'tires', 'body'];

  // where an option ranks in its category (higher = better), for 'never
  // downgrade' checks
  function rank(cat, inst, id) {
    if (cat === 'fi') { var f = DR.FI[id]; return f.type === 'none' ? 0 : f.flow; }
    if (cat === 'rtires') return DR.TIRE_SHOP.indexOf(id);
    if (cat === 'diff') return ['open', 'lsd', 'spool'].indexOf(id);
    if (cat === 'trans') return DR.TRANS[id].maxTq;
    var opts = DR.partOptions(cat, inst);
    for (var i = 0; i < opts.length; i++) if (opts[i].id === id) return i;
    return -1;
  }
  // The parts a package would fit to this car: [{cat, id, opt}], plus the
  // car as it would be afterwards. Skips parts that do not fit and anything
  // already as good or better.
  DR.packagePlan = function (inst, groups, tier, anyLevel) {
    var copy = JSON.parse(JSON.stringify(inst)), steps = [];
    copy.parts = copy.parts || {}; copy.tune = copy.tune || {};
    // A package fits the best parts you have unlocked up to its tier's pick
    // (so it can always be bought, and gets better as the career opens up)
    function unl(cat, opt) { return anyLevel || !DR.Game || !DR.Game.partUnlocked || DR.Game.partUnlocked(cat, opt.lvl); }
    function pick(cat, id) {
      var want = DR.getOption(cat, copy, id);
      if (!want || want.id !== id) return null;
      if (unl(cat, want)) return id;
      var wr = rank(cat, copy, id), cr = rank(cat, copy, DR.partId(cat, copy)), best = null, br = -1;
      DR.partOptions(cat, copy).forEach(function (o) {
        var r = rank(cat, copy, o.id);
        if (o.price && unl(cat, o) && r <= wr && r > cr && r > br) { best = o.id; br = r; }
      });
      return best;
    }
    // capacity parts only go on if they hold more than what's fitted now
    // (a race car's factory fuel system, clutch or axles can out-rate the
    // early aftermarket ones)
    function weaker(cat, opt) {
      var cap = { injectors: 'fuel', fuelpump: 'fuel', clutch: 'cap', rearend: 'axle' }[cat];
      if (!cap || opt[cap] == null) return false;
      var S = DR.buildSpec(copy), now = cat === 'injectors' ? S.fuelInj : cat === 'fuelpump' ? S.fuelPump : cat === 'clutch' ? S.clCap : S.axleTq;
      return now != null && opt[cap] <= now;
    }
    function fit(cat, id) {
      var opt = DR.getOption(cat, copy, id);
      if (!opt || opt.id !== id || weaker(cat, opt)) return false;
      if (cat === 'fi') delete copy.tune.boost;
      if (id === DR.stockPart(cat, copy)) delete copy.parts[cat]; else copy.parts[cat] = id;
      steps.push({ cat: cat, id: id, opt: opt });
      if (cat !== 'ecu') ensureTune();
      return true;
    }
    // a part that needs a tune brings the tune with it (the cheapest ECU
    // flash unlocked), so the rest of the package is sized for a tuned car
    function ensureTune() {
      var S = DR.buildSpec(copy);
      if (S.tuned || !S.untuned.length) return;
      var t = DR.partOptions('ecu', copy).filter(function (o) { return o.tune && (unl('ecu', o) || anyLevel); }).sort(function (a, b) { return a.price - b.price; })[0];
      if (t) fit('ecu', t.id);
    }
    function risky(fuelLater) {
      var c = copy;
      // the fuel system is added after the power parts: judge as if fed
      if (fuelLater) { c = JSON.parse(JSON.stringify(copy)); c.parts.injectors = 'inj6'; c.parts.fuelpump = 'fp5'; if (!DR.getOption('ecu', c).tune) c.parts.ecu = 'ecu1'; }
      var r = DR.buildSpec(c).risk; return r.engine > 0 || r.trans > 0 || r.axle > 0;
    }
    // power packages turn the boost up to suit, within the fuel's knock
    // limit, the ignition and the turbo (never below what it was); done
    // straight after the power parts so the rest is sized for it
    function setBoost() {
      var S = DR.buildSpec(copy);
      if (S.fiType === 'none') return;
      var want = Math.min(DR.PKG_BOOST[tier], S.knock - 1, S.sparkPsi, S.maxBoost);
      var was = S.boostSet;
      copy.tune.boost = Math.max(was, Math.round(want * 2) / 2);
      // more boost heats the charge and lowers the knock limit: back off
      // until it is a psi under it again
      while (copy.tune.boost > was && DR.buildSpec(copy).knock - 1 < copy.tune.boost) copy.tune.boost -= 0.5;
      // and no more than the engine's internals take (that's the bottom-end
      // package's job)
      while (copy.tune.boost > was && DR.buildSpec(copy).risk.engine > 0) copy.tune.boost -= 0.5;
    }
    var boostPkg = groups.indexOf('power') >= 0;
    groups.forEach(function (gid) {
      if (gid !== 'power' && boostPkg && steps.length) setBoost();
      (DR.PACKAGES[gid] || [])[tier].forEach(function (e) {
        var cat = e[0], id = typeof e[1] === 'function' ? e[1](copy) : e[1];
        if (!id || !DR.partApplies(cat, copy)) return;
        var cur = DR.partId(cat, copy);
        if (rank(cat, copy, id) <= rank(cat, copy, cur)) return;
        id = pick(cat, id);
        if (!id || !fit(cat, id)) return;
        if (boostPkg && (cat === 'ignition' || cat === 'fueltype' || cat === 'wastegate')) setBoost();
      });
      // no turbo or blower unlocked yet: the power package is a nitrous kit
      if (gid === 'power' && DR.partId('fi', copy) === 'none' && DR.partApplies('nitrous', copy)) {
        var shots = DR.partOptions('nitrous', copy).filter(function (o) { return o.price && unl('nitrous', o); });
        var want = ['n50', 'n75', 'n150', 'n250'][tier];
        shots = shots.filter(function (o) { return rank('nitrous', copy, o.id) <= rank('nitrous', copy, want) && rank('nitrous', copy, o.id) > rank('nitrous', copy, DR.partId('nitrous', copy)); });
        for (var k = shots.length - 1; k >= 0; k--) {
          var keep = JSON.stringify(copy.parts);
          copy.parts.nitrous = shots[k].id;
          if (!risky(true)) { delete copy.parts.nitrous; copy.parts = JSON.parse(keep); fit('nitrous', shots[k].id); if (DR.partId('nosheat', copy) === 'stock') { var nh = pick('nosheat', 'nh1'); if (nh) fit('nosheat', nh); } break; }
          copy.parts = JSON.parse(keep);
        }
      }
    });
    if (boostPkg && steps.length) setBoost();
    // a package that adds power brings what that power needs: fuel to make
    // it, and a gearbox, clutch and axles to hold it (never a car one launch
    // away from breaking, or a turbo the injectors can't feed)
    if (steps.length) {
      // the ignition first: the coils set how much of the package's boost
      // can actually be used
      if (boostPkg) {
        var Sb = DR.buildSpec(copy);
        if (Sb.fiType !== 'none' && Sb.sparkPsi < Math.min(DR.PKG_BOOST[tier], Sb.knock - 1, Sb.maxBoost)) {
          var ig = DR.partOptions('ignition', copy).filter(function (o) { return o.id !== 'stock' && unl('ignition', o) && rank('ignition', copy, o.id) > rank('ignition', copy, DR.partId('ignition', copy)); })
            .filter(function (o) { return Sb.sparkPsi - (DR.getOption('ignition', copy).spark || 0) + (o.spark || 0) >= Math.min(DR.PKG_BOOST[tier], Sb.knock - 1, Sb.maxBoost); })[0];
          if (ig) { copy.parts.ignition = ig.id; steps.push({ cat: 'ignition', id: ig.id, opt: ig }); setBoost(); }
        }
      }
      var need = function (cat) {
        var S = DR.buildSpec(copy);
        if (cat === 'injectors' || cat === 'fuelpump') { var f = DR.fuelShort(S); return (cat === 'injectors' ? f.ri : f.rp) > 0.98; }
        if (cat === 'clutch') return S.clCap && S.peakTq / 0.7376 > S.clCap;
        if (cat === 'rearend') return S.risk.axle > 0;
        if (cat === 'trans') return S.risk.trans > 0;
        if (cat === 'chassis') return S.risk.chassis > 0;
        return true;
      };
      [['injectors', fuelFor('injectors', 1)], ['fuelpump', fuelFor('fuelpump', 1)], ['trans', transFor], ['clutch', clutchFor(1)], ['rearend', axleFor(1)], ['chassis', chassisFor]].forEach(function (e) {
        if (!need(e[0])) return;
        var id = e[1](copy);
        if (!id || !DR.partApplies(e[0], copy) || id === DR.partId(e[0], copy)) return;
        if (rank(e[0], copy, id) <= rank(e[0], copy, DR.partId(e[0], copy))) return;
        id = pick(e[0], id);
        if (id) fit(e[0], id);
      });
      // the fuel may have uncapped the power, or a strong enough gearbox
      // isn't unlocked yet: boost back within what the car can hold
      if (boostPkg && copy.tune.boost != null) {
        var floor = DR.buildSpec(inst).boostSet;
        while (copy.tune.boost > floor && risky()) copy.tune.boost -= 0.5;
      }
    }
    var price = steps.reduce(function (a, s) { return a + (s.opt.price || 0); }, 0);
    return { steps: steps, after: copy, full: price, price: Math.round(price * (1 - DR.PKG_DISCOUNT) / 50) * 50 };
  };

  // A usable (not refined) setup for a build: the rear gear, then a coarse
  // sweep of the 2-step rpm, plus launch throttle / ramp and traction
  // control where the ECU has them, each tried as a player would drive it (gas held on the
  // line, flat out after the hit). Only settings the parts allow.
  var launchMemo = {};
  DR.launchTune = function (inst) {
    var key = JSON.stringify([inst.carId, inst.engine, inst.parts, inst.tune && inst.tune.boost, !!inst.ai]);
    if (launchMemo[key]) return launchMemo[key];
    var S0 = DR.buildSpec(inst), out = {};
    // the rear gear first: keep the launch gear about where the factory had
    // it (a swapped gearbox brings its own ratios), whichever runs the
    // quicker quarter
    var car = DR.CARS[inst.carId], first0 = DR.boxRatios(car.trans, car)[0] * car.fd;
    var fds = [S0.fd, first0 / S0.ratios[0], first0 / S0.ratios[0] * 1.1, first0 / S0.ratios[0] * 0.9].map(function (f) { return Math.round(clampN(f, 2.2, 6.5) * 100) / 100; });
    var bestFd = S0.fd, bestEt = 1e9;
    fds.forEach(function (f) {
      var t = {}; for (var k in inst.tune) t[k] = inst.tune[k]; t.fd = f;
      var et = DR.playerPass(DR.buildSpec(inst, t), 60, true);
      if (et < bestEt - 0.02) { bestEt = et; bestFd = f; }
    });
    if (bestFd !== S0.fd) { out.fd = bestFd; inst = JSON.parse(JSON.stringify(inst)); inst.tune.fd = bestFd; S0 = DR.buildSpec(inst); }
    var rpms = [null], thr = [null], tcs = [null];
    if (S0.twostep) { rpms = []; var lo = S0.idle + 1200, hi = S0.red - 400; for (var i = 0; i < 6; i++) rpms.push(Math.round((lo + (hi - lo) * i / 5) / 100) * 100); }
    if (S0.ecu >= 2) thr = [[100, 0], [70, 0.5], [45, 0.9], [35, 1.6], [30, 2]];
    if (S0.ecu >= 3) tcs = [0, 20];
    if (rpms.length * thr.length * tcs.length <= 1) return (launchMemo[key] = out);
    var best = -1, fdOut = out.fd;
    rpms.forEach(function (rpm) { thr.forEach(function (th) { tcs.forEach(function (tc) {
      var t = {}; for (var k in inst.tune) t[k] = inst.tune[k];
      if (rpm != null) t.launchRpm = rpm;
      if (th) { t.launchThr = th[0]; t.thrRamp = th[1]; }
      if (tc != null) t.tcSlip = tc;
      // scored on a prepped strip and on the street, so it isn't a setup that
      // only works with perfect grip
      var St = DR.buildSpec(inst, t), x = DR.playerPass(St, 3) + DR.playerPass(St, 3, false, 0.85);
      if (x > best) { best = x; out = {}; if (fdOut != null) out.fd = fdOut; if (rpm != null) out.launchRpm = rpm; if (th) { out.launchThr = th[0]; out.thrRamp = th[1]; } if (tc != null) out.tcSlip = tc; }
    }); }); });
    return (launchMemo[key] = out);
  };
  // metres covered `secs` after the hit, driven like a player: gas held on
  // the line (eased against a foot brake), flat out, shifting at the tune's
  // shift point
  function clampN(x, a, b) { return Math.max(a, Math.min(b, x)); }
  DR.playerPass = function (S, secs, quarterEt, grip) {
    var sim = new DR.Sim(S, { grip: grip || 1, dist: DR.QUARTER, tireT: S.tire.topt }), dt = 1 / 200, brk = 1;
    for (var i = 0; i < 300; i++) {
      if (S.trType === 'auto' && !S.tbrake) brk = sim.brakeLimited ? Math.max(0.1, brk - dt * 3) : Math.min(1, brk + dt * 1.5);
      sim.step(dt, { throttle: brk });
    }
    sim.launch();
    while (sim.t < secs && !sim.crashed && !sim.finished) {
      if (!sim.shifting && sim.sinceShift > 0.25 && sim.t > 0.6) {
        var line = sim.ww * S.ratios[sim.gear] * S.fd * 30 / Math.PI;
        var trig = S.trType === 'auto' ? Math.max(line / 0.95, sim.rpm() >= S.limit - 60 ? sim.rpm() : 0) : sim.locked ? sim.rpm() : line;
        if (trig >= S.tune.shiftRpm) sim.shiftUp();
      }
      sim.step(dt, { throttle: 1 });
    }
    if (quarterEt) return sim.finished ? sim.et : 99;
    return sim.crashed ? 0 : sim.x;
  };

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
