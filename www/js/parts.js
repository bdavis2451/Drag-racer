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
    sc_1471:     { name: '14-71 Screw Blower',        type: 'roots', maxBoost: 40, flow: 3200, paras: 0.17, w: 60, price: 38000, desc: 'Pro Mod blower. Brutal, instant torque.' }
  };
  DR.FI_SHOP = ['t_small', 't_med', 't_large', 't_twin', 't_huge', 't_promod', 'sc_roots', 'sc_screw', 'sc_cent', 'sc_1471'];

  function opt(id, name, price, fx, desc) { var o = { id: id, name: name, price: price, desc: desc || '' }; for (var k in fx) o[k] = fx[k]; return o; }

  // Simple categories: fixed option lists. The first option is stock.
  // Engine-part prices are multiplied by DR.enginePriceMul(engine).
  var C = {};

  C.intake = { name: 'Intake', engineScaled: true, options: [
    opt('stock', 'Stock Intake', 0, { tq: 1 }),
    opt('i1', 'Cold Air Intake', 300, { tq: 1.03 }, '+3% power.'),
    opt('i2', 'Ported Intake + Big Throttle Body', 900, { tq: 1.05, rpm: 100 }, '+5% power, breathes better up top.'),
    opt('i3', 'Race Intake Manifold', 2200, { tq: 1.08, rpm: 300, low: 0.04 }, '+8% power, moves the powerband higher.')
  ]};
  C.exhaust = { name: 'Exhaust', engineScaled: true, options: [
    opt('stock', 'Stock Exhaust', 0, { tq: 1 }),
    opt('e1', 'Cat-Back Exhaust', 600, { tq: 1.03 }, '+3% power.'),
    opt('e2', 'Straight Pipes', 1100, { tq: 1.05 }, '+5% power. Loud.'),
    opt('e3', 'Race Exhaust (Open)', 2000, { tq: 1.07, rpm: 150 }, '+7% power.')
  ]};
  C.headers = { name: 'Headers / Manifold', engineScaled: true, options: [
    opt('stock', 'Stock Manifolds', 0, { tq: 1 }),
    opt('h1', 'Shorty Headers', 500, { tq: 1.02 }, '+2% power.'),
    opt('h2', 'Long-Tube Headers', 1200, { tq: 1.05, rpm: 100 }, '+5% power.'),
    opt('h3', 'Race Headers / Tubular Manifold', 2400, { tq: 1.07, rpm: 250 }, '+7% power, more top end.')
  ]};
  C.cams = { name: 'Camshafts & Valvetrain', engineScaled: true, options: [
    opt('stock', 'Stock Cams', 0, { tq: 1 }),
    opt('c1', 'Stage 1 Cams', 800, { tq: 1.04, rpm: 250, vt: 300, low: 0.05 }, '+4% power. Valvetrain safe to +300 rpm.'),
    opt('c2', 'Stage 2 Cams + Springs', 1600, { tq: 1.08, rpm: 500, vt: 600, low: 0.12 }, '+8% power, power peak +500 rpm. Valvetrain safe to +600 rpm. Loses some low-end.'),
    opt('c3', 'Stage 3 Race Cams', 3000, { tq: 1.13, rpm: 900, vt: 1000, low: 0.22 }, '+13% power, power peak +900 rpm. Valvetrain safe to +1000 rpm. Lumpy idle.'),
    opt('c4', 'Solid Roller Race Valvetrain', 6000, { tq: 1.17, rpm: 1300, vt: 1500, low: 0.30 }, '+17% power, power peak +1300 rpm. Valvetrain safe to +1500 rpm. All top end.')
  ]};
  C.heads = { name: 'Cylinder Heads', engineScaled: true, options: [
    opt('stock', 'Stock Heads', 0, { tq: 1 }),
    opt('hd1', 'Ported & Polished Heads', 1200, { tq: 1.05 }, '+5% power.'),
    opt('hd2', 'CNC Ported Heads', 3000, { tq: 1.09, rpm: 150 }, '+9% power.'),
    opt('hd3', 'Billet Race Heads', 8000, { tq: 1.14, rpm: 300 }, '+14% power.')
  ]};
  C.internals = { name: 'Engine Internals', engineScaled: true, options: [
    opt('stock', 'Stock Internals', 0, { safe: 1 }),
    opt('n1', 'Forged Pistons', 2500, { safe: 1.5, be: 300 }, 'Survives 1.5x its stock power. Bottom end safe to +300 rpm.'),
    opt('n2', 'Forged Rotating Assembly', 6000, { safe: 2.2, be: 700 }, 'Forged crank, rods & pistons. 2.2x safe power, +700 rpm.'),
    opt('n3', 'Billet Crank & Rods', 12000, { safe: 3.2, be: 1200 }, 'Survives 3.2x stock power. Bottom end safe to +1200 rpm.'),
    opt('n4', 'Billet Block & Race Internals', 30000, { safe: 5.5, be: 2000 }, 'Built to take massive boost, nitrous and +2000 rpm.')
  ]};
  C.fuelsys = { name: 'Fuel System', options: [
    opt('stock', 'Stock Fuel System', 0, { fuel: 0 }),
    opt('f1', 'Upgraded Pump & Injectors', 700, { fuel: 650 }, 'Supports 650 hp on gasoline.'),
    opt('f2', 'Dual Pumps & Big Injectors', 1500, { fuel: 1050 }, 'Supports 1050 hp.'),
    opt('f3', 'Mechanical Race Pump', 3500, { fuel: 1800 }, 'Supports 1800 hp.'),
    opt('f4', 'Pro Fuel System', 8000, { fuel: 5000 }, 'Supports 5000 hp.')
  ]};
  C.fueltype = { name: 'Fuel Type', options: [
    opt('stock', 'Pump Gas 93', 0, { knock: 17, fmul: 1, ff: 1 }, 'Boost over 17 psi will knock and stress the engine.'),
    opt('e85', 'E85 Ethanol', 800, { knock: 30, fmul: 1.04, ff: 0.75 }, '+4% power, 30 psi safe. Needs 33% more fuel flow.'),
    opt('race', 'Race Gas 116', 1200, { knock: 34, fmul: 1.03, ff: 1 }, '+3% power, 34 psi safe.'),
    opt('meth', 'Methanol', 2500, { knock: 50, fmul: 1.06, ff: 0.62 }, '+6% power, 50 psi safe. Needs 60% more fuel flow.')
  ]};
  C.ecu = { name: 'ECU / Engine Management', options: [
    opt('stock', 'Stock ECU', 0, { tq: 1, ecu: 0 }, 'Factory rev limiter, whatever your parts can take.'),
    opt('ecu1', 'Street Tune Flash', 600, { tq: 1.04, ecu: 1 }, '+4% power. Raises the rev limiter as far as your engine parts safely allow (up to +800 rpm).'),
    opt('ecu2', 'Standalone ECU', 2000, { tq: 1.06, ecu: 2 }, '+6% power. Fully adjustable rev limiter, launch throttle & throttle ramp tuning.'),
    opt('ecu3', 'Race ECU + Traction Mgmt', 4500, { tq: 1.08, ecu: 3 }, '+8% power. Adjustable rev limiter and traction control.')
  ]};
  C.ic = { name: 'Intercooler', needsFI: true, options: [
    opt('stock', 'Stock Intercooling', 0, { ic: 0 }, 'Factory boosted engines come with a small intercooler; aftermarket kits have none.'),
    opt('ic1', 'Front-Mount Intercooler', 1200, { ic: 0.93 }, 'Cooler charge = more power per psi.'),
    opt('ic2', 'Large Race Intercooler', 2200, { ic: 0.97 }),
    opt('ic3', 'Air-to-Water + Ice Tank', 4000, { ic: 1.0 }, 'Maximum charge cooling.')
  ]};
  C.launch = { name: 'Launch Control', options: [
    opt('stock', 'None', 0, { twostep: 0 }),
    opt('l1', '2-Step Rev Limiter', 900, { twostep: 1 }, 'Holds a set launch RPM on the line and builds some boost.'),
    opt('l2', '2-Step + Anti-Lag', 3000, { twostep: 2 }, 'Builds near-full boost on the line and keeps turbos lit between shifts.')
  ]};
  C.nitrous = { name: 'Nitrous Oxide', options: [
    opt('stock', 'None', 0, { nos: 0 }),
    opt('n75', '75 Shot Wet Kit', 800, { nos: 75 }, 'Adds 75 hp when sprayed.'),
    opt('n150', '150 Shot Wet Kit', 1500, { nos: 150 }),
    opt('n250', '250 Shot Plate System', 2500, { nos: 250 }),
    opt('n400', '400 Shot Fogger', 4500, { nos: 400 }),
    opt('n650', '650 Shot Dual-Stage Fogger', 8000, { nos: 650 }, 'Pro nitrous. Spray it carefully!')
  ]};
  C.nosctrl = { name: 'Nitrous Controller', needsNos: true, options: [
    opt('stock', 'On/Off Solenoid', 0, { prog: 0 }),
    opt('p1', 'Progressive Controller', 1200, { prog: 1 }, 'Auto-activates after a delay and ramps the shot in to save the tires.')
  ]};
  C.clutch = { name: 'Clutch', needsClutch: true, options: [
    opt('stock', 'Stock Clutch', 0, { cap: 0, engage: 0.32 }, 'Slips under big power.'),
    opt('cl1', 'Stage 1 Clutch', 600, { cap: 650, engage: 0.28 }, 'Holds 650 Nm.'),
    opt('cl2', 'Stage 2 Clutch', 1100, { cap: 950, engage: 0.24 }, 'Holds 950 Nm.'),
    opt('cl3', 'Twin-Disc Clutch', 2400, { cap: 1500, engage: 0.20 }, 'Holds 1500 Nm.'),
    opt('cl4', 'Triple-Disc Clutch', 4200, { cap: 2400, engage: 0.17 }, 'Holds 2400 Nm.'),
    opt('cl5', 'Pro Multi-Disc Slider Clutch', 9000, { cap: 4500, engage: 0.22 }, 'Holds anything; slips on purpose for smooth launches.')
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
  C.driveshaft = { name: 'Driveshaft & Axles', options: [
    opt('stock', 'Stock Driveshaft & Axles', 0, { shaft: 1 }),
    opt('ds1', 'Aluminum Driveshaft + Chromoly Axles', 900, { shaft: 0.85 }, 'Less rotating mass.'),
    opt('ds2', 'Carbon Driveshaft + Gun-Drilled Axles', 2000, { shaft: 0.72 }, 'Even less rotating mass.')
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
  DR.PART_CATS = C;

  DR.PART_GROUPS = [
    { id: 'engine', name: 'Engine',        cats: ['engine', 'intake', 'exhaust', 'headers', 'cams', 'heads', 'internals', 'fuelsys', 'fueltype', 'ecu'] },
    { id: 'power',  name: 'Power Adders',  cats: ['fi', 'ic', 'launch', 'nitrous', 'nosctrl'] },
    { id: 'drive',  name: 'Drivetrain',    cats: ['trans', 'clutch', 'converter', 'transbrake', 'flywheel', 'driveshaft', 'diff', 'layout'] },
    { id: 'susp',   name: 'Suspension',    cats: ['springs', 'shocks', 'rearsusp', 'wheeliebar', 'aero'] },
    { id: 'tires',  name: 'Wheels & Tires',cats: ['rtires', 'wheels', 'ftires'] },
    { id: 'body',   name: 'Weight',        cats: ['weight'] }
  ];
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

  // Full option list for a category on this car instance.
  DR.partOptions = function (cat, inst) {
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
    return c.options.map(function (o) { return Object.assign({}, o, { price: Math.round(o.price * mul / 50) * 50 }); });
  };

  // Whether a category applies to this car right now (e.g. clutch vs converter).
  DR.partApplies = function (cat, inst) {
    var c = C[cat];
    if (!c) return true;
    var tr = DR.TRANS[DR.partId('trans', inst)];
    if (c.needsClutch) return tr.type !== 'auto';
    if (c.needsConverter) return tr.type === 'auto';
    if (c.needsFI) return DR.partId('fi', inst) !== 'none';
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
  DR.ENGINE_BOUND = ['intake', 'exhaust', 'headers', 'cams', 'heads', 'internals', 'fi', 'ic'];
})();
