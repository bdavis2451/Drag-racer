// ===========================================================================
// GAME — save data, money, garage, buying & selling, career ladder.
// ===========================================================================
(function () {
  var DR = globalThis.DR;
  var KEY = 'pixeldrag_save_v1';

  var G = DR.Game = { state: null };

  G.defaults = function () {
    return {
      v: 1, money: 6000, cars: [], active: null, uid: 1,
      career: {}, stats: { races: 0, wins: 0, earned: 0 },
      settings: { sound: true, autoShift: false, proTree: false, units: 'mph', pedal: 'hold' },
      started: false
    };
  };

  G.load = function () {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
    var d = G.defaults();
    if (!s || s.v !== 1) { G.state = d; return; }
    for (var k in d) if (s[k] == null) s[k] = d[k];
    for (k in d.settings) if (s.settings[k] == null) s.settings[k] = d.settings[k];
    G.state = s;
  };
  G.save = function () { try { localStorage.setItem(KEY, JSON.stringify(G.state)); } catch (e) { /* storage unavailable */ } };
  G.reset = function () { G.state = G.defaults(); G.save(); };

  G.newInst = function (carId) {
    var car = DR.CARS[carId];
    return { uid: G.state.uid++, carId: carId, engine: car.engine, parts: {}, tune: {}, color: car.col, stripe: '', rim: '#c8c8c8', spent: car.price, best: {}, damage: null };
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

  G.starters = ['ronin', 'fox', 'hachi'];
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
  // Returns {ok, msg}. Trade-in: 40% of the replaced part's price comes back.
  G.tradeIn = function (cat, inst) {
    var cur = DR.getOption(cat, inst);
    return Math.round((cur.price || 0) * 0.4 / 10) * 10;
  };
  G.buyPart = function (cat, optId) {
    var inst = G.car();
    var opt = DR.getOption(cat, inst, optId);
    if (DR.partId(cat, inst) === optId) return { ok: false, msg: 'Already installed' };
    var refund = G.tradeIn(cat, inst), price = opt.price || 0;
    if (cat === 'engine') {
      DR.ENGINE_BOUND.forEach(function (c) { refund += Math.round((DR.getOption(c, inst).price || 0) * 0.5); });
    }
    if (G.state.money + refund < price) return { ok: false, msg: 'Not enough money' };
    G.state.money += refund - price;
    inst.spent += price - refund;
    if (cat === 'engine') {
      DR.ENGINE_BOUND.forEach(function (c) { delete inst.parts[c]; });
      inst.engine = optId;
      delete inst.tune.boost; delete inst.tune.launchRpm; delete inst.tune.shiftRpm;
      if (inst.damage && inst.damage.engine) inst.damage = null;
    } else {
      if (optId === DR.stockPart(cat, inst)) delete inst.parts[cat]; else inst.parts[cat] = optId;
      if (cat === 'fi') delete inst.tune.boost;
      if (cat === 'trans') { delete inst.tune.gears; if (inst.damage && inst.damage.trans) inst.damage = null; }
      if (cat === 'rtires') delete inst.tune.psi;
      if (cat === 'rearsusp') delete inst.tune.antiSquat;
      if (cat === 'cams' || cat === 'internals') delete inst.tune.shiftRpm;
    }
    G.save();
    return { ok: true, msg: 'Installed ' + opt.name };
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

  // ---------------------------------------------------------------- career
  // An opponent: car + parts + tune + driver skill.
  function O(name, carId, engine, parts, tune, skill, color) {
    return { name: name, carId: carId, engine: engine || DR.CARS[carId].engine, parts: parts || {}, tune: tune || {}, skill: skill, color: color };
  }
  var BOLT = { intake: 'i1', exhaust: 'e1' };
  function P(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }

  DR.CAREER = [
    { name: 'Rookie Night', dist: DR.QUARTER, reward: [400, 550, 700, 900, 1500], opps: [
      O('Grandma Edna', 'pip', null, {}, {}, 0.3, '#ff8fb8'),
      O('Tyler', 'ronin', null, {}, {}, 0.4, '#3a7bd2'),
      O('Jess', 'bolt', null, BOLT, {}, 0.5, '#2fb3a8'),
      O('Danny', 'hachi', null, P(BOLT, { headers: 'h1', ecu: 'ecu1' }), {}, 0.55, '#151515'),
      O('Mullet Mike', 'fox', null, P(BOLT, { headers: 'h2' }), {}, 0.6, '#c01515')
    ]},
    { name: 'Bracket Bandits', dist: DR.QUARTER, reward: [1500, 1900, 2300, 2800, 4500], opps: [
      O('Kenji', 'silvia', null, P(BOLT, { ecu: 'ecu1' }), {}, 0.6, '#9aa8b4'),
      O('Hiro', 'rx7', null, P(BOLT, { ecu: 'ecu1', ic: 'ic1', rtires: 'st_305' }), { boost: 14 }, 0.65, '#d01818'),
      O('Rosa', 'z35', null, P(BOLT, { headers: 'h2', ecu: 'ecu1' }), {}, 0.6, '#b0b0b0'),
      O('Dale', 'nova', null, P(BOLT, { headers: 'h2', converter: 'tc1', rtires: 'dr_275' }), {}, 0.6, '#2e7d4f'),
      O('Big Earl', 'camaro', null, P(BOLT, { headers: 'h2', cams: 'c1', rtires: 'dr_275', rearsusp: 'rs1' }), {}, 0.7, '#244fa8')
    ]},
    { name: 'Street Outlaws', dist: DR.QUARTER, reward: [4000, 4800, 5600, 6500, 10000], opps: [
      O('Lexi', 'evo', null, P(BOLT, { headers: 'h2', fi: 't_med', ic: 'ic2', fueltype: 'e85', fuelsys: 'f2', internals: 'n2', ecu: 'ecu2', clutch: 'cl3', rtires: 'dr_275', launch: 'l1' }), { boost: 30 }, 0.72, '#f6f6f6'),
      O('Vince', 'supra', null, P(BOLT, { ecu: 'ecu1', ic: 'ic1', fueltype: 'e85', fuelsys: 'f1', rtires: 'dr_275' }), { boost: 18 }, 0.7, '#ff7a00'),
      O('Tank', 'hellcat', null, P(BOLT, { rtires: 'dr_315', fueltype: 'e85', fuelsys: 'f2', ecu: 'ecu2', converter: 'tc1', trans: 'a3_400' }), { boost: 16 }, 0.75, '#4b1a6e'),
      O('Marcus', 'stang15', null, P(BOLT, { nitrous: 'n150', rtires: 'dr_315', rearsusp: 'rs1' }), {}, 0.7, '#1c5bd6'),
      O('Shadow', 'gtr', null, P(BOLT, { ecu: 'ecu2', ic: 'ic2', fueltype: 'e85', fuelsys: 'f2', internals: 'n1' }), { boost: 21 }, 0.8, '#151515')
    ]},
    { name: 'Radial Wars', dist: DR.QUARTER, reward: [9000, 11000, 13000, 15000, 24000], opps: [
      O('Akira', 'supra', null, { intake: 'i2', exhaust: 'e2', headers: 'h3', fi: 't_large', ic: 'ic2', internals: 'n2', fuelsys: 'f3', fueltype: 'e85', ecu: 'ecu2', rtires: 'dr_315', trans: 'seq6', clutch: 'cl3', launch: 'l2', rearsusp: 'rs2', diff: 'spool' }, { boost: 30 }, 0.8, '#ffffff'),
      O('Bubba', 'hauler', 'bb_94', { fi: 'sc_roots', internals: 'n2', fuelsys: 'f2', fueltype: 'race', rtires: 'dr_315', trans: 'a3_400', converter: 'tc2', rearsusp: 'rs2', diff: 'spool', weight: 'w2' }, { boost: 10 }, 0.8, '#2b4d2b'),
      O('Ricky Radial', 'fox', 'v8_62', { intake: 'i2', exhaust: 'e2', headers: 'h2', fi: 't_med', ic: 'ic1', internals: 'n2', fuelsys: 'f2', fueltype: 'e85', rtires: 'dr_275', rearsusp: 'rs2', trans: 'a3_400', converter: 'tc2', diff: 'spool', launch: 'l1' }, { boost: 14 }, 0.75, '#c01515'),
      O('Nitro Nate', 'camaro', 'v8_70', { intake: 'i2', exhaust: 'e2', headers: 'h2', cams: 'c2', nitrous: 'n250', internals: 'n1', rtires: 'dr_315', rearsusp: 'rs2', trans: 'a3_400', converter: 'tc2', diff: 'spool' }, {}, 0.75, '#ffb300'),
      O('Murder Nova', 'nova', 'v8_70', { intake: 'i3', exhaust: 'e3', headers: 'h3', heads: 'hd2', cams: 'c3', fi: 't_twin', ic: 'ic2', internals: 'n3', fuelsys: 'f3', fueltype: 'e85', ecu: 'ecu3', rtires: 'ets_28', trans: 'pg2', converter: 'tc3', rearsusp: 'rs3', diff: 'spool', launch: 'l2', weight: 'w2', shocks: 'sh2', wheeliebar: 'wb1' }, { boost: 24, tcSlip: 20, barDeg: 3 }, 0.85, '#151515')
    ]},
    { name: 'Big Tire Shootout', dist: DR.QUARTER, reward: [20000, 24000, 28000, 32000, 50000], opps: [
      O('Gasser Gus', 'willys', 'bb_94', { fi: 'sc_roots', internals: 'n2', fuelsys: 'f3', fueltype: 'race', rtires: 'sl_33', trans: 'a3_400', converter: 'tc3', rearsusp: 'rs2', diff: 'spool', wheeliebar: 'wb1' }, { boost: 12, barDeg: 4 }, 0.8, '#efe14b'),
      O('Hemi Hank', 'cuda', 'hemi_70', { heads: 'hd3', cams: 'c3', fi: 'sc_1471', internals: 'n3', fuelsys: 'f4', fueltype: 'meth', rtires: 'sl_33', trans: 'a3_400', converter: 'tc4', rearsusp: 'rs3', diff: 'spool', weight: 'w3', wheeliebar: 'wb1' }, { boost: 20, barDeg: 3.5 }, 0.85, '#ff6a00'),
      O('Lisa Lightning', 'camss', 'v8_70', { intake: 'i3', exhaust: 'e3', headers: 'h3', heads: 'hd2', cams: 'c3', fi: 't_huge', ic: 'ic3', internals: 'n3', fuelsys: 'f3', fueltype: 'meth', ecu: 'ecu3', rtires: 'sl_33', trans: 'a3_400', converter: 'tc4', rearsusp: 'rs3', diff: 'spool', launch: 'l2', weight: 'w3', wheeliebar: 'wb1', shocks: 'sh3', springs: 'sp3' }, { boost: 28, tcSlip: 20 }, 0.88, '#ffb300'),
      O('Twin Turbo Tina', 'chevelle', 'bb_94', { intake: 'i3', exhaust: 'e3', headers: 'h3', fi: 't_twin', ic: 'ic2', internals: 'n3', fuelsys: 'f3', fueltype: 'e85', ecu: 'ecu3', rtires: 'sl_33', trans: 'pg2', converter: 'tc3', rearsusp: 'rs3', diff: 'spool', launch: 'l2', weight: 'w3', wheeliebar: 'wb1', shocks: 'sh2' }, { boost: 20, tcSlip: 22 }, 0.85, '#151515'),
      O('Godzilla Ken', 'r34', 'i6_30tt', { intake: 'i3', exhaust: 'e3', headers: 'h3', heads: 'hd3', cams: 'c4', fi: 't_huge', ic: 'ic3', internals: 'n4', fuelsys: 'f4', fueltype: 'meth', ecu: 'ecu3', rtires: 'sl_31', trans: 'seq6', clutch: 'cl4', launch: 'l2', weight: 'w3', diff: 'spool' }, { boost: 45, tcSlip: 20 }, 0.9, '#3757a8')
    ]},
    { name: 'Pro Mod Legends', dist: DR.QUARTER, reward: [55000, 65000, 75000, 90000, 150000], opps: [
      O('Rail Rachel', 'rail', null, { fi: 'sc_1471', internals: 'n3', fuelsys: 'f4', fueltype: 'meth', heads: 'hd3', cams: 'c3' }, { boost: 14 }, 0.88, '#ffde00'),
      O('Nitrous Nick', 'promod', null, { nitrous: 'n650', fuelsys: 'f3', rearsusp: 'rs3', clutch: 'cl5', wheeliebar: 'wb1', shocks: 'sh3', springs: 'sp3' }, { barDeg: 3 }, 0.85, '#7cd320'),
      O('Blower Bill', 'promod', null, { fi: 'sc_1471', fuelsys: 'f4', fueltype: 'meth', rearsusp: 'rs3', clutch: 'cl5', wheeliebar: 'wb1', shocks: 'sh3', springs: 'sp3', weight: 'w1' }, { boost: 25, barDeg: 3 }, 0.88, '#3a7bd2'),
      O('Turbo Tony', 'promod', null, { fi: 't_promod', ic: 'ic3', fuelsys: 'f4', fueltype: 'meth', ecu: 'ecu3', rearsusp: 'rs3', clutch: 'cl5', launch: 'l2', wheeliebar: 'wb1', shocks: 'sh3', springs: 'sp3', weight: 'w2' }, { boost: 30, tcSlip: 22, barDeg: 3.5 }, 0.9, '#e31b6d'),
      O('THE KING', 'promod', null, { intake: 'i3', exhaust: 'e3', headers: 'h3', heads: 'hd3', cams: 'c4', fi: 't_promod', ic: 'ic3', fuelsys: 'f4', fueltype: 'meth', ecu: 'ecu3', rearsusp: 'rs3', clutch: 'cl5', launch: 'l2', wheeliebar: 'wb1', shocks: 'sh3', springs: 'sp3', weight: 'w4', diff: 'spool' }, { boost: 36, tcSlip: 15, barDeg: 3, fd: 3.6 }, 0.95, '#ffd700')
    ]}
  ];

  G.oppInst = function (o) {
    return { uid: -1, carId: o.carId, engine: o.engine, parts: o.parts, tune: o.tune, color: o.color || DR.CARS[o.carId].col, stripe: '', rim: '#d0d0d0' };
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

  G.tierUnlocked = function (t) {
    if (t === 0) return true;
    var prev = G.state.career[t - 1] || [];
    return DR.CAREER[t - 1].opps.every(function (_, i) { return prev[i]; });
  };
  G.oppUnlocked = function (t, i) {
    if (!G.tierUnlocked(t)) return false;
    if (i === 0) return true;
    return !!(G.state.career[t] || [])[i - 1];
  };
  G.beat = function (t, i) {
    var c = G.state.career;
    if (!c[t]) c[t] = [];
    var first = !c[t][i];
    c[t][i] = true; G.save();
    return first;
  };
  G.beaten = function (t, i) { return !!(G.state.career[t] || [])[i]; };

  // Street race: opponents near the player's estimated 1/8-mile time.
  G.streetOpponents = function (playerET) {
    var pool = [];
    DR.CAREER.forEach(function (tier) { tier.opps.forEach(function (o) { pool.push(o); }); });
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
