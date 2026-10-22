// ===========================================================================
// GAME — save data, money, garage, buying & selling, career ladder.
// ===========================================================================
(function () {
  var DR = globalThis.DR;
  var KEY = 'pixeldrag_save_v1';

  var G = DR.Game = { state: null };

  G.defaults = function () {
    return {
      v: 3, money: 6000, cars: [], active: null, uid: 1,
      career: G.careerDefaults(), stats: { races: 0, wins: 0, earned: 0 }, shows: {}, covers: [], inv: [],
      settings: { sound: true, autoShift: false, proTree: false, units: 'mph', pedal: 'hold' },
      started: false
    };
  };

  G.load = function () {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
    var d = G.defaults();
    if (!s || (s.v !== 1 && s.v !== 2 && s.v !== 3)) { G.state = d; return; }
    if (s.v === 1) migrate1(s);
    if (s.v === 2) migrate2(s);
    for (var k in d) if (s[k] == null) s[k] = d[k];
    for (k in d.settings) if (s.settings[k] == null) s.settings[k] = d.settings[k];
    G.state = s;
  };
  // v1 -> v2: the car list was narrowed, converters were renamed and the
  // career ladder was rebuilt. Keep money, settings and any cars still sold.
  function migrate1(s) {
    var conv = { tc1: 'tcl', tc2: 'tcm', tc3: 'tch', tc4: 'tch' };
    s.cars = (s.cars || []).filter(function (c) { return DR.CARS[c.carId]; });
    s.cars.forEach(function (c) { if (c.parts && conv[c.parts.converter]) c.parts.converter = conv[c.parts.converter]; });
    if (!s.cars.some(function (c) { return c.uid === s.active; })) s.active = s.cars.length ? s.cars[0].uid : null;
    if (!s.cars.length) s.started = false;
    s.career = {};
    s.v = 2;
  }

  // v2 -> v3: the career became the stage / sponsor / unlock system and cars
  // got cosmetic parts. Keep money, cars and settings.
  function migrate2(s) {
    s.career = G.careerDefaults();
    (s.cars || []).forEach(function (c) { if (!c.vis) c.vis = {}; s.career.cars[c.carId] = 1; });
    s.v = 3;
  }

  G.save = function () { try { localStorage.setItem(KEY, JSON.stringify(G.state)); } catch (e) { /* storage unavailable */ } };
  G.reset = function () { G.state = G.defaults(); G.save(); };

  G.newInst = function (carId) {
    var car = DR.CARS[carId];
    return { uid: G.state.uid++, carId: carId, engine: car.engine, parts: {}, tune: {}, vis: {}, color: car.col, stripe: '', rim: '#c8c8c8', spent: car.price, best: {}, damage: null };
  };
  G.car = function () {
    var s = G.state;
    for (var i = 0; i < s.cars.length; i++) if (s.cars[i].uid === s.active) return s.cars[i];
    return s.cars[0] || null;
  };
  G.spec = function (inst) { return DR.buildSpec(inst || G.car()); };

  G.canAfford = function (p) { return G.state.money >= p; };
  G.pay = function (p) { G.state.money -= p; G.save(); };
  G.earn = function (p) { G.state.money += p; G.state.stats.earned += Math.max(0, p); G.save(); };

  G.starters = ['fox', 'hachi'];
  G.newGame = function (starterId) {
    G.state = G.defaults();
    var inst = G.newInst(starterId);
    inst.spent = Math.round(DR.CARS[starterId].price * 0.5);
    G.state.cars.push(inst); G.state.active = inst.uid; G.state.started = true;
    G.save();
  };

  // ---------------------------------------------------------------- cars
  G.buyCar = function (carId) {
    var p = DR.CARS[carId].price;
    if (!G.canAfford(p)) return false;
    G.pay(p);
    var inst = G.newInst(carId);
    G.state.cars.push(inst); G.state.active = inst.uid; G.save();
    return inst;
  };
  G.carValue = function (inst) { return Math.round(inst.spent * 0.6 / 50) * 50; };
  G.sellCar = function (uid) {
    var s = G.state;
    if (s.cars.length <= 1) return false;
    for (var i = 0; i < s.cars.length; i++) if (s.cars[i].uid === uid) {
      G.earn(G.carValue(s.cars[i]));
      s.cars.splice(i, 1);
      if (s.active === uid) s.active = s.cars[0].uid;
      G.save(); return true;
    }
    return false;
  };

  // ---------------------------------------------------------------- parts
  // Parts work like a real garage: the shop sells parts into your inventory
  // (G.state.inv) and you fit them to a car in the garage. Taking a part off
  // puts it back on the shelf, so it can go on another car or be sold.
  // Engine parts (intake, cams, turbos...) are made for one engine.
  //   item: { uid, cat, id, price, eng }
  G.isEngineBound = function (cat) { return DR.ENGINE_BOUND.indexOf(cat) >= 0; };
  G.partName = function (item) {
    if (item.cat === 'engine') return DR.ENGINES[item.id].name;
    if (item.cat === 'trans') return DR.TRANS[item.id].name;
    if (item.cat === 'rtires') return DR.TIRES[item.id].name;
    if (item.cat === 'fi') return DR.FI[item.id].name;
    var inst = G.car(), ctx = { carId: inst.carId, engine: item.eng || inst.engine, parts: {}, tune: {} };
    var opts = DR.partOptions(item.cat, ctx);
    for (var i = 0; i < opts.length; i++) if (opts[i].id === item.id) return opts[i].name.replace(' (Factory)', '');
    return item.id;
  };
  // '' when the item can go on this car, otherwise why not.
  G.partFitIssue = function (item, inst) {
    if (G.isEngineBound(item.cat) && item.eng !== inst.engine) return 'Made for the ' + DR.ENGINES[item.eng].name;
    if (!DR.partApplies(item.cat, inst)) {
      if (item.cat === 'clutch' || item.cat === 'flywheel') return 'Needs a manual gearbox';
      if (item.cat === 'converter' || item.cat === 'transbrake') return 'Needs an automatic';
      if (item.cat === 'ic' || item.cat === 'launch') return 'Needs a turbo or supercharger';
      if (item.cat === 'nosctrl') return 'Needs a nitrous kit';
      return 'Does not fit this car';
    }
    if (item.cat === 'engine' && item.id === inst.engine) return 'Already in this car';
    return '';
  };
  G.invFor = function (cat) { return G.state.inv.filter(function (it) { return it.cat === cat; }); };
  G.ownedCount = function (cat, id) { return G.state.inv.filter(function (it) { return it.cat === cat && it.id === id; }).length; };
  G.partSellValue = function (item) { return Math.round((item.price || 0) * 0.5 / 10) * 10; };

  // Moves the part installed in `cat` to the inventory (if it is not stock).
  function stash(inst, cat) {
    var id = DR.partId(cat, inst);
    if (id === DR.stockPart(cat, inst)) return null;
    var opt = DR.getOption(cat, inst, id);
    var item = { uid: G.state.uid++, cat: cat, id: id, price: opt.price || 0, eng: G.isEngineBound(cat) ? inst.engine : undefined };
    G.state.inv.push(item);
    inst.spent = Math.max(0, inst.spent - item.price);
    return item;
  }
  function clearTune(inst, cat) {
    if (cat === 'engine') { delete inst.tune.boost; delete inst.tune.launchRpm; delete inst.tune.shiftRpm; delete inst.tune.revLimit; }
    if (cat === 'fi') delete inst.tune.boost;
    if (cat === 'trans') delete inst.tune.gears;
    if (cat === 'rtires') delete inst.tune.psi;
    if (cat === 'rearsusp') delete inst.tune.antiSquat;
    if (cat === 'cams' || cat === 'internals' || cat === 'ecu') delete inst.tune.shiftRpm;
  }
  function setPart(inst, cat, id) {
    if (cat === 'engine') {
      DR.ENGINE_BOUND.forEach(function (c) { stash(inst, c); delete inst.parts[c]; });
      stash(inst, 'engine');
      inst.engine = id;
      if (inst.damage && inst.damage.engine) inst.damage = null;
    } else {
      stash(inst, cat);
      if (id === DR.stockPart(cat, inst)) delete inst.parts[cat]; else inst.parts[cat] = id;
      if (cat === 'trans' && inst.damage && inst.damage.trans) inst.damage = null;
    }
    clearTune(inst, cat);
  }

  G.buyPart = function (cat, id) {
    var inst = G.car(), opt = DR.getOption(cat, inst, id), price = opt.price || 0;
    if (!G.canAfford(price)) return null;
    G.pay(price);
    var item = { uid: G.state.uid++, cat: cat, id: id, price: price, eng: G.isEngineBound(cat) ? inst.engine : undefined };
    G.state.inv.push(item); G.save();
    return item;
  };
  G.installPart = function (inst, uid) {
    var inv = G.state.inv, item = null;
    for (var i = 0; i < inv.length; i++) if (inv[i].uid === uid) { item = inv[i]; inv.splice(i, 1); break; }
    if (!item) return { ok: false, msg: 'Part not found' };
    var why = G.partFitIssue(item, inst);
    if (why) { inv.push(item); return { ok: false, msg: why }; }
    setPart(inst, item.cat, item.id);
    inst.spent += item.price;
    G.save();
    return { ok: true, msg: 'Installed ' + G.partName(item) };
  };
  // Back to the factory part; the old one goes on the shelf.
  G.removePart = function (inst, cat) {
    if (DR.partId(cat, inst) === DR.stockPart(cat, inst)) return false;
    if (cat === 'engine') setPart(inst, 'engine', DR.CARS[inst.carId].engine);
    else { stash(inst, cat); delete inst.parts[cat]; clearTune(inst, cat); }
    G.save();
    return true;
  };
  G.sellPart = function (uid) {
    var inv = G.state.inv;
    for (var i = 0; i < inv.length; i++) if (inv[i].uid === uid) {
      var v = G.partSellValue(inv[i]);
      inv.splice(i, 1); G.earn(v); return v;
    }
    return 0;
  };

  // ---------------------------------------------------------------- damage
  G.repairCost = function (inst) {
    if (!inst.damage) return 0;
    if (inst.damage.engine) return Math.round((DR.ENGINES[inst.engine].price * 0.35 + 800) / 50) * 50;
    if (inst.damage.trans) return Math.round((DR.TRANS[DR.partId('trans', inst)].price * 0.4 + 500) / 50) * 50;
    return 0;
  };
  G.repair = function (inst) {
    var c = G.repairCost(inst);
    if (!G.canAfford(c)) return false;
    G.pay(c); inst.damage = null; G.save(); return true;
  };

  // ---------------------------------------------------------------- rivals
  // An opponent: car + parts + tune + driver skill.
  function O(name, carId, engine, parts, tune, skill, color) {
    return { name: name, carId: carId, engine: engine || DR.CARS[carId].engine, parts: parts || {}, tune: tune || {}, skill: skill, color: color };
  }
  var BOLT = { intake: 'i1', exhaust: 'e1' };
  function P(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }

  // The rival pool in six skill bands (career.js builds the stages from it).
  var BANDS = [
    { name: 'Rookie Night', opps: [
      O('Grandma Edna', 'pip', null, {}, {}, 0.25, '#ff8fb8'),
      O('Tyler', 'ronin', null, BOLT, {}, 0.4, '#3a7bd2'),
      O('Jess', 'monte', null, {}, {}, 0.5, '#2fb3a8'),
      O('Danny', 'mira', null, P(BOLT, { headers: 'h1', cams: 'c1', ecu: 'ecu1', rtires: 'st_225' }), {}, 0.55, '#151515'),
      O('Mullet Mike', 'fox', null, P(BOLT, { headers: 'h2' }), {}, 0.6, '#c01515')
    ]},
    { name: 'Bracket Bandits', opps: [
      O('Dale', 'camaro', null, {}, {}, 0.6, '#2e7d4f'),
      O('Kenji', 'silvia', null, P(BOLT, { rtires: 'st_225' }), {}, 0.6, '#9aa8b4'),
      O('Rosa', 'm3', null, {}, {}, 0.6, '#b0b0b0'),
      O('Hiro', 'supra', null, P(BOLT, { ecu: 'ecu1', ic: 'ic1', rtires: 'dr_275' }), { boost: 15 }, 0.65, '#d01818'),
      O('Big Earl', 'cobra03', 'v8_62', P(BOLT, { rtires: 'dr_275', converter: 'tcl' }), {}, 0.7, '#244fa8')
    ]},
    { name: 'Street Outlaws', opps: [
      O('Vince', 'r34', null, P(BOLT, { ecu: 'ecu1', ic: 'ic1', fueltype: 'e85', fuelsys: 'f1', rtires: 'dr_275' }), { boost: 22 }, 0.7, '#ff7a00'),
      O('Shadow', 'supra', null, P(BOLT, { headers: 'h2', fi: 't_large', ic: 'ic2', fueltype: 'e85', fuelsys: 'f2', internals: 'n2', ecu: 'ecu2', rtires: 'dr_315', clutch: 'cl3', launch: 'l1' }), { boost: 24 }, 0.8, '#151515'),
      O('Lexi', 'sti', null, P(BOLT, { headers: 'h2', fi: 't_med', ic: 'ic2', fueltype: 'e85', fuelsys: 'f2', internals: 'n2', ecu: 'ecu2', clutch: 'cl3', rtires: 'dr_275', launch: 'l1' }), { boost: 34 }, 0.72, '#f6f6f6'),
      O('Marcus', 'nova', 'v8_62', P(BOLT, { headers: 'h2', nitrous: 'n150', rtires: 'dr_315', rearsusp: 'rs1', clutch: 'cl2' }), {}, 0.72, '#1c5bd6'),
      O('Tank', 'chevelle', 'v8_62', P(BOLT, { headers: 'h2', nitrous: 'n250', rtires: 'dr_315', converter: 'tcm', transbrake: 'tb1', rearsusp: 'rs1' }), {}, 0.75, '#4b1a6e')
    ]},
    { name: 'Radial Wars', opps: [
      O('Akira', 'supra', null, { intake: 'i2', exhaust: 'e2', headers: 'h3', fi: 't_large', ic: 'ic2', internals: 'n2', fuelsys: 'f3', fueltype: 'e85', ecu: 'ecu2', rtires: 'dr_315', trans: 'seq6', clutch: 'cl3', launch: 'l2', rearsusp: 'rs2', diff: 'spool' }, { boost: 30 }, 0.8, '#ffffff'),
      O('Ricky Radial', 'fox', 'v8_62', { intake: 'i2', exhaust: 'e2', headers: 'h2', fi: 't_med', ic: 'ic1', internals: 'n2', fuelsys: 'f2', fueltype: 'e85', rtires: 'dr_275', rearsusp: 'rs2', trans: 'a3_400', converter: 'tcm', transbrake: 'tb1', diff: 'spool', launch: 'l1' }, { boost: 14 }, 0.75, '#c01515'),
      O('Nitro Nate', 'z06', 'v8_70', { intake: 'i2', exhaust: 'e2', headers: 'h2', cams: 'c2', nitrous: 'n250', internals: 'n1', rtires: 'dr_315', rearsusp: 'rs2', trans: 'a3_400', converter: 'tcm', transbrake: 'tb1', diff: 'spool' }, {}, 0.78, '#ffb300'),
      O('Kaz', 's2k', 'i6_30tt', { intake: 'i2', exhaust: 'e2', headers: 'h2', fi: 't_large', ic: 'ic2', internals: 'n2', fuelsys: 'f3', fueltype: 'e85', ecu: 'ecu3', rtires: 'dr_315', trans: 'seq6', clutch: 'cl4', launch: 'l2', rearsusp: 'rs2', diff: 'spool', wheeliebar: 'wb1' }, { boost: 32, tcSlip: 18 }, 0.8, '#7cd320'),
      O('Murder Fox', 'fox', 'v8_70', { intake: 'i3', exhaust: 'e3', headers: 'h3', heads: 'hd2', cams: 'c3', fi: 't_twin', ic: 'ic2', internals: 'n3', fuelsys: 'f3', fueltype: 'e85', ecu: 'ecu3', rtires: 'dr_315', trans: 'pg2', converter: 'tch', transbrake: 'tb1', rearsusp: 'rs3', diff: 'spool', launch: 'l2', weight: 'w2', shocks: 'sh2', wheeliebar: 'wb1' }, { boost: 22, tcSlip: 20, barDeg: 3 }, 0.85, '#151515')
    ]},
    { name: 'Big Tire Shootout', opps: [
      O('Gasser Gus', 'willys', 'bb_94', { fi: 'sc_roots', internals: 'n2', fuelsys: 'f3', fueltype: 'race', rtires: 'sl_33', trans: 'a3_400', converter: 'tch', transbrake: 'tb1', rearsusp: 'rs2', diff: 'spool', wheeliebar: 'wb1' }, { boost: 12, barDeg: 4 }, 0.8, '#efe14b'),
      O('Godzilla Ken', 'gtr', 'i6_30tt', { intake: 'i3', exhaust: 'e3', headers: 'h3', heads: 'hd3', cams: 'c4', fi: 't_huge', ic: 'ic3', internals: 'n4', fuelsys: 'f4', fueltype: 'meth', ecu: 'ecu3', rtires: 'sl_31', trans: 'seq6', clutch: 'cl4', launch: 'l2', weight: 'w3', diff: 'spool', rearsusp: 'rs3', wheeliebar: 'wb1' }, { boost: 45, tcSlip: 20 }, 0.9, '#3757a8'),
      O('Lisa Lightning', 'lightning', 'v8_70', { intake: 'i3', exhaust: 'e3', headers: 'h3', heads: 'hd2', cams: 'c3', fi: 't_huge', ic: 'ic3', internals: 'n3', fuelsys: 'f3', fueltype: 'meth', ecu: 'ecu3', rtires: 'sl_33', trans: 'a3_400', converter: 'tch', transbrake: 'tb1', rearsusp: 'rs3', diff: 'spool', launch: 'l2', weight: 'w3', wheeliebar: 'wb1', shocks: 'sh3', springs: 'sp3' }, { boost: 28, tcSlip: 20 }, 0.88, '#ffb300'),
      O('Hemi Hank', 'cuda', 'hemi_70', { heads: 'hd3', cams: 'c3', fi: 'sc_1471', internals: 'n3', fuelsys: 'f4', fueltype: 'meth', rtires: 'sl_33', trans: 'a3_400', converter: 'tch', transbrake: 'tb1', rearsusp: 'rs3', diff: 'spool', weight: 'w3', wheeliebar: 'wb1' }, { boost: 20, barDeg: 3.5 }, 0.85, '#ff6a00'),
      O('Twin Turbo Tina', 'chevelle', 'bb_94', { intake: 'i3', exhaust: 'e3', headers: 'h3', fi: 't_twin', ic: 'ic2', internals: 'n3', fuelsys: 'f3', fueltype: 'e85', ecu: 'ecu3', rtires: 'sl_33', trans: 'pg2', converter: 'tch', transbrake: 'tb1', rearsusp: 'rs3', diff: 'spool', launch: 'l2', weight: 'w3', wheeliebar: 'wb1', shocks: 'sh2' }, { boost: 20, tcSlip: 22 }, 0.85, '#151515')
    ]},
    { name: 'Pro Mod Legends', opps: [
      O('Nitrous Nick', 'promod', 'v8_86b', { nitrous: 'n650', internals: 'n2', fuelsys: 'f3', rtires: 'sl_33', trans: 'lenco5', clutch: 'cl5', diff: 'spool', rearsusp: 'rs3', wheeliebar: 'wb1', shocks: 'sh3', springs: 'sp3', weight: 'w4' }, { barDeg: 3 }, 0.85, '#7cd320'),
      O('Rice Rocket Rin', 'hachi', 'v8_86b', { fi: 'sc_1471', fuelsys: 'f4', fueltype: 'meth', internals: 'n3', rtires: 'sl_33', trans: 'pg2', converter: 'tch', transbrake: 'tb1', diff: 'spool', rearsusp: 'rs3', wheeliebar: 'wb1', shocks: 'sh3', springs: 'sp3', weight: 'w4' }, { boost: 22, barDeg: 3 }, 0.88, '#e31b6d'),
      O('Turbo Tony', 'supra', 'v8_86b', { fi: 't_promod', ic: 'ic3', fuelsys: 'f4', fueltype: 'meth', internals: 'n4', ecu: 'ecu3', rtires: 'sl_33', trans: 'lenco5', clutch: 'cl5', launch: 'l2', diff: 'spool', rearsusp: 'rs3', wheeliebar: 'wb1', shocks: 'sh3', springs: 'sp3', weight: 'w4' }, { boost: 30, tcSlip: 22, barDeg: 3.5 }, 0.9, '#ff7a00'),
      O('Blower Bill', 'charger', 'v8_86b', { fi: 'sc_1471', fuelsys: 'f4', fueltype: 'meth', internals: 'n3', rtires: 'sl_33', trans: 'lenco5', clutch: 'cl5', diff: 'spool', rearsusp: 'rs3', wheeliebar: 'wb1', shocks: 'sh3', springs: 'sp3', weight: 'w4' }, { boost: 25, barDeg: 3 }, 0.88, '#3a7bd2'),
      O('THE KING', 'promod', 'v8_86b', { intake: 'i3', exhaust: 'e3', headers: 'h3', heads: 'hd3', cams: 'c4', fi: 't_promod', ic: 'ic3', fuelsys: 'f4', fueltype: 'meth', internals: 'n4', ecu: 'ecu3', rtires: 'sl_33', trans: 'lenco5', clutch: 'cl5', launch: 'l2', diff: 'spool', rearsusp: 'rs3', wheeliebar: 'wb1', shocks: 'sh3', springs: 'sp3', weight: 'w4' }, { boost: 36, tcSlip: 15, barDeg: 3, fd: 3.6 }, 0.95, '#ffd700')
    ]}
  ];
  DR.RIVALS = BANDS.map(function (b) { return b.opps; });

  G.oppInst = function (o) {
    return { uid: -1, carId: o.carId, engine: o.engine, parts: o.parts, tune: o.tune, vis: o.vis || {}, color: o.color || DR.CARS[o.carId].col, stripe: o.stripe || '', rim: o.rim || '#d0d0d0' };
  };
  // Estimated ET for an opponent / car (cached per build).
  var etCache = {};
  G.estimate = function (inst, dist, grip) {
    var key = JSON.stringify([inst.carId, inst.engine, inst.parts, inst.tune, dist, grip || 1]);
    if (etCache[key]) return etCache[key];
    var r = DR.simulate(DR.buildSpec(inst), { dist: dist || DR.QUARTER, grip: grip || 1 });
    etCache[key] = { et: r.et, trap: r.trap };
    return etCache[key];
  };

  // Street race: opponents near the player's estimated 1/8-mile time.
  G.streetOpponents = function (playerET) {
    var pool = [];
    DR.RIVALS.forEach(function (band) { band.forEach(function (o) { pool.push(o); }); });
    var names = ['Spike', 'Rico', 'Jade', 'Duke', 'Sasha', 'Moose', 'Ziggy', 'Nova', 'Blaze', 'Cruz', 'Vega', 'Slim'];
    var scored = pool.map(function (o) {
      var est = G.estimate(G.oppInst(o), DR.EIGHTH, 0.85);
      return { o: o, et: est.et };
    }).filter(function (x) { return x.et < 90; });
    scored.sort(function (a, b) { return Math.abs(a.et - playerET) - Math.abs(b.et - playerET); });
    var pick = scored.slice(0, 6);
    for (var i = pick.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = pick[i]; pick[i] = pick[j]; pick[j] = tmp; }
    return pick.slice(0, 3).map(function (x) {
      var o = Object.assign({}, x.o);
      o.name = names[Math.floor(Math.random() * names.length)];
      o.color = DR.PAINTS[Math.floor(Math.random() * DR.PAINTS.length)];
      o.skill = Math.max(0.4, Math.min(0.9, o.skill + (Math.random() - 0.5) * 0.2));
      return o;
    });
  };

  DR.money = function (n) {
    var s = Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (n < 0 ? '-$' : '$') + s;
  };
})();
