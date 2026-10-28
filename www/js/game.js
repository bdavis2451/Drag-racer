// ===========================================================================
// GAME — save data, money, garage, buying & selling, career ladder.
// ===========================================================================
(function () {
  var DR = globalThis.DR;
  var KEY = 'pixeldrag_save_v1';

  var G = DR.Game = { state: null };

  G.defaults = function () {
    return {
      v: 5, money: 4000, cars: [], active: null, uid: 1,
      career: G.careerDefaults(), stats: { races: 0, wins: 0, earned: 0 }, shows: {}, covers: [], inv: [],
      settings: { sound: true, music: true, autoShift: false, proTree: false, units: 'mph', pedal: 'hold', autoStage: true, autoRepair: false, volume: 1, sim: true },
      started: false
    };
  };

  G.load = function () {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
    var d = G.defaults();
    if (!s || (s.v !== 1 && s.v !== 2 && s.v !== 3 && s.v !== 4 && s.v !== 5)) { G.state = d; return; }
    if (s.v === 1) migrate1(s);
    if (s.v === 2) migrate2(s);
    if (s.v === 3) migrate3(s);
    if (s.v === 4) migrate4(s);
    for (var k in d) if (s[k] == null) s[k] = d[k];
    for (k in d.settings) if (s.settings[k] == null) s.settings[k] = d.settings[k];
    try { retired(s); } catch (e) { /* keep what loaded */ }
    try { sanitize(s); } catch (e) { /* keep what loaded */ }
    // older saves could put a rear-drive gearbox in a front-drive car: it
    // becomes the matching transaxle (and the other way around)
    (s.cars || []).forEach(function (c) { try { if (c.parts) DR.fitTrans(c); } catch (e) { /* keep it */ } });
    G.state = s;
    if (G.syncUnlocks) try { G.syncUnlocks(); } catch (e) { /* keep what loaded */ }
  };
  // Parts that changed under an old save: the alignment parts are gone
  // (refunded in full), and the final drive is a gear set now - a car that
  // was tuned off its factory ratio gets a free quick-change rear so it
  // keeps its gearing.
  var RETIRED = { align: { al1: 150, al2: 700 } };
  function retired(s) {
    var refund = 0;
    (s.cars || []).forEach(function (c) {
      var p = c.parts || {};
      Object.keys(RETIRED).forEach(function (cat) { if (p[cat]) { refund += RETIRED[cat][p[cat]] || 0; delete p[cat]; } });
      var car = DR.CARS[c.carId], fd = c.tune && c.tune.fd;
      if (car && fd != null && !p.gears && Math.abs(fd - car.fd) > 0.03) p.gears = 'qc';
      // turbo cars: the headers become a turbo manifold (free); the headers
      // go back on the shelf
      var fi = p.fi || (DR.ENGINES[c.engine || (car && car.engine)] || {}).fi && DR.ENGINES[c.engine || car.engine].fi.part;
      if (p.headers && fi && DR.FI[fi] && DR.FI[fi].type === 'turbo' && !p.tmanifold) {
        p.tmanifold = p.headers === 'h3' ? 'tm2' : 'tm1';
        (s.inv = s.inv || []).push({ uid: (s.uid = (s.uid || 1000) + 1), cat: 'headers', id: p.headers, price: 0, eng: c.engine });
        delete p.headers;
      }
    });
    s.inv = (s.inv || []).filter(function (it) { if (it && RETIRED[it.cat]) { refund += it.price || RETIRED[it.cat][it.id] || 0; return false; } return true; });
    if (refund) s.money = (s.money || 0) + refund;
  }
  // A save is checked against today's catalog: cars, engines and parts the
  // game no longer has are dropped (one bad entry must not stop the garage
  // from opening), missing fields get defaults, and spare engine parts from
  // old saves that never said which engine they fit get the current one.
  function sanitize(s) {
    function carOf(id) { return DR.CARS[id] || (DR.CARS_RESERVE && DR.CARS_RESERVE[id]); }
    function fits(cat, inst, id) {
      if (cat === 'engine') return !!DR.ENGINES[id];
      // (tires, gearbox and turbo/blower have their own catalogs outside
      // PART_CATS: partOptions knows every category)
      try { return (DR.partOptions(cat, inst) || []).some(function (o) { return o.id === id; }); } catch (e) { return false; }
    }
    s.cars = (s.cars || []).filter(function (c) { return c && carOf(c.carId); });
    s.cars.forEach(function (c) {
      if (!DR.ENGINES[c.engine]) c.engine = carOf(c.carId).engine;
      c.parts = c.parts || {}; c.tune = c.tune || {}; c.vis = c.vis || {};
      if (typeof c.spent !== 'number' || !isFinite(c.spent)) c.spent = 0;
      Object.keys(c.parts).forEach(function (cat) { if (!fits(cat, c, c.parts[cat])) delete c.parts[cat]; });
    });
    if (!s.cars.some(function (c) { return c.uid === s.active; })) s.active = s.cars.length ? s.cars[0].uid : null;
    if (!s.cars.length) s.started = false;
    var cur = s.cars.filter(function (c) { return c.uid === s.active; })[0];
    s.inv = (s.inv || []).filter(function (it) {
      if (!it || !it.cat) return false;
      if (G.isEngineBound(it.cat) && !DR.ENGINES[it.eng]) { if (!cur) return false; it.eng = cur.engine; }
      var ctx = { carId: cur ? cur.carId : 'fox', engine: it.eng || (cur ? cur.engine : 'v8_50'), parts: {}, tune: {} };
      return fits(it.cat, ctx, it.id);
    });
    if (typeof s.money !== 'number' || !isFinite(s.money)) s.money = 0;
  }
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

  // v3 -> v4: the parts catalog was split up (intake, internals, fuel
  // system, valvetrain...). Installed and spare parts become their new parts.
  function migrate3(s) {
    (s.cars || []).forEach(function (c) { c.parts = DR.expandParts(c.parts || {}); });
    var inv = [];
    (s.inv || []).forEach(function (it) {
      var one = {}; one[it.cat] = it.id;
      var ex = DR.expandParts(one), cats = Object.keys(ex);
      if (cats.length === 1 && ex[it.cat] === it.id) { inv.push(it); return; }
      cats.forEach(function (k, j) { inv.push({ uid: s.uid++, cat: k, id: ex[k], price: Math.round((it.price || 0) / cats.length / 10) * 10, eng: it.eng }); });
    });
    s.inv = inv;
    s.v = 4;
  }

  // v4 -> v5: a new first league (Backroad Beaters) went in ahead of the
  // others. Races won and sponsors move up one stage; a save already under
  // way starts in the stage it was in (the new league is there to race).
  function migrate4(s) {
    var c = s.career;
    if (c && c.won) {
      var won = {}, sp = {};
      Object.keys(c.won).forEach(function (id) { var p = id.split('.'); won[(+p[0] + 1) + '.' + p[1]] = c.won[id]; });
      Object.keys(c.sponsor || {}).forEach(function (si) { sp[+si + 1] = c.sponsor[si]; });
      c.won = won; c.sponsor = sp; c.stage = (c.stage || 0) + 1;
    }
    s.v = 5;
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
  // sim mode: the game shows the numbers and leaves the reading of them to you
  G.simMode = function () { return G.state.settings.sim !== false; };
  G.spec = function (inst) { return DR.buildSpec(inst || G.car()); };

  G.canAfford = function (p) { return G.state.money >= p; };
  G.pay = function (p) { G.state.money -= p; G.save(); };
  G.earn = function (p) { G.state.money += p; G.state.stats.earned += Math.max(0, p); G.save(); };

  // first-car choices: every car up to $8k except the Fox GT, which runs
  // with the first league's boss stock and is his car to win instead
  DR.NOT_STARTERS = { fox: 1 };
  G.starters = ['hachi'].concat(Object.keys(DR.CARS).filter(function (id) { return id !== 'hachi' && !DR.NOT_STARTERS[id] && DR.CARS[id].price <= 8000; })
    .sort(function (a, b) { return DR.CARS[b].price - DR.CARS[a].price; }));
  G.newGame = function (starterId) {
    G.state = G.defaults();
    var inst = G.newInst(starterId);
    inst.spent = Math.round(DR.CARS[starterId].price * 0.5);
    G.state.cars.push(inst); G.state.active = inst.uid; G.state.started = true;
    G.save();
  };

  // ---------------------------------------------------------------- cars
  // Garage slots (Underground 2 style): one to start, and every sponsor you
  // sign opens another. A save that already holds more keeps them all.
  // one slot to start, one more for every sponsor contract fulfilled
  G.carSlots = function () { var c = G.state.career || {}, n = 0; for (var k in c.sponsor || {}) if (c.sponsor[k].paid) n++; return 1 + n; };
  G.slotFree = function () { return G.state.cars.length < G.carSlots(); };
  G.buyCar = function (carId) {
    var p = DR.CARS[carId].price;
    if (!G.canAfford(p) || !G.slotFree()) return false;
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
  // The catalog entry for an inventory item (as it would be on this car).
  G.itemOption = function (item) {
    var inst = G.car(), ctx = { carId: inst.carId, engine: item.eng || inst.engine, parts: {}, tune: {} };
    var opts = DR.partOptions(item.cat, ctx);
    for (var i = 0; i < opts.length; i++) if (opts[i].id === item.id) return opts[i];
    return null;
  };
  G.partName = function (item) {
    var base = partBaseName(item), used = item.wear > 0.005 ? ' (used, ' + Math.round(item.wear * 100) + '% worn)' : '';
    // a factory part says what it came off
    if (item.stock && !G.isEngineBound(item.cat) && item.cat !== 'engine' && item.car && DR.CARS[item.car]) return base + ' (' + DR.CARS[item.car].name.replace(/ '\d+$/, '') + ')' + used;
    if (item.stock && G.isEngineBound(item.cat) && DR.ENGINES[item.eng]) return base + ' (' + DR.ENGINES[item.eng].name.replace(/ \(.*\)$/, '') + ')' + used;
    return base + used;
  };
  function partBaseName(item) {
    if (item.cat === 'engine') return DR.ENGINES[item.id].name;
    if (item.cat === 'trans') return DR.TRANS[item.id].name;
    if (item.cat === 'rtires') return DR.TIRES[item.id].name;
    if (item.cat === 'fi') return DR.FI[item.id].name;
    var inst = G.car(), ctx = { carId: inst.carId, engine: item.eng || inst.engine, parts: {}, tune: {} };
    var opts = DR.partOptions(item.cat, ctx);
    for (var i = 0; i < opts.length; i++) if (opts[i].id === item.id) return opts[i].name.replace(' (Factory)', '');
    return item.id;
  }
  // '' when the item can go on this car, otherwise why not.
  G.partFitIssue = function (item, inst) {
    // a generic factory part only fits the model it came off
    if (item.stock && item.id === 'stock' && !G.isEngineBound(item.cat) && item.car && item.car !== inst.carId) return 'Factory part for the ' + DR.CARS[item.car].name;
    if (DR.partId(item.cat, inst) === item.id && (item.id !== 'stock' || DR.stockPart(item.cat, inst) === 'stock')) return 'Already on this car';
    if (G.isEngineBound(item.cat) && item.eng !== inst.engine) return DR.ENGINES[item.eng] ? 'Made for the ' + DR.ENGINES[item.eng].name : 'Made for another engine';
    if (!DR.partApplies(item.cat, inst)) {
      if (item.cat === 'clutch' || item.cat === 'flywheel') return 'Needs a manual gearbox';
      if (item.cat === 'converter' || item.cat === 'transbrake') return 'Needs an automatic';
      if (item.cat === 'ic' || item.cat === 'launch') return 'Needs a turbo or supercharger';
      if (item.cat === 'wastegate' || item.cat === 'bov') return 'Needs a turbo';
      if (item.cat === 'nosctrl' || item.cat === 'nosheat') return 'Needs a nitrous kit';
      if (item.cat === 'headers') return 'A turbo car takes a turbo manifold instead (Power Adders)';
      return 'Does not fit this car';
    }
    if (item.cat === 'engine' && item.id === inst.engine) return 'Already in this car';
    if (item.cat === 'engine') { var fit = DR.swapFit(inst, item.id); if (fit.block) return fit.block; }
    if (item.cat === 'trans' && item.id && !DR.transFits(inst, item.id)) return DR.transMount(inst) === 'T' ? 'A rear-drive gearbox: this car takes a transaxle' : 'A transaxle only fits a car with a sideways engine and its factory driveline';
    if (item.cat === 'converter' && DR.getOption('converter', inst, item.id).lockup && !DR.TRANS[DR.partId('trans', inst)].lu) return 'Needs a lockup-capable automatic (Pro Mod Powerglide/TH400 or a factory electronic one)';
    if (item.cat === 'layout') {
      if (!DR.partOptions('layout', inst).some(function (o) { return o.id === item.id; })) return 'Does not fit this car';
      var opt = DR.getOption('layout', inst, item.id);
      if (opt.tv && DR.ENGINES[inst.engine].mount === 'L') return 'The ' + DR.ENGINES[inst.engine].name + ' sits lengthways: it needs the lengthways conversion';
    }
    return '';
  };
  G.invFor = function (cat) { return G.state.inv.filter(function (it) { return it.cat === cat; }); };
  G.ownedCount = function (cat, id) { return G.state.inv.filter(function (it) { return it.cat === cat && it.id === id; }).length; };
  G.partSellValue = function (item) { return Math.round((item.stock ? item.val || 0 : (item.price || 0) * 0.5) * (1 - 0.9 * (item.wear || 0)) / 10) * 10; };
  // Whether the factory "part" in a slot is a real part you can take off and
  // keep: not pump gas, an empty nitrous slot, the factory weight or layout,
  // or the block (studs, girdles and sleeves go on the same block); a
  // factory turbo's bits only when the engine came boosted.
  var NO_PART = { logger: 1, align: 1, wmi: 1, safety: 1, weight: 1, layout: 1, fueltype: 1, launch: 1, nitrous: 1, nosctrl: 1, nosheat: 1, transbrake: 1, wheeliebar: 1, aero: 1, chassis: 1, block: 1 };
  var FI_PARTS = { fi: 1, ic: 1, wastegate: 1, bov: 1 };
  G.stockIsPart = function (cat, inst) {
    if (cat === 'engine') return true;
    if (NO_PART[cat] || !DR.partApplies(cat, inst)) return false;
    if (FI_PARTS[cat]) return !!DR.ENGINES[inst.engine].fi;
    return true;
  };
  // What a used factory part is worth: an engine about a third of a new
  // one, anything else about 20% of the cheapest new part of its kind.
  G.stockValue = function (cat, inst, id) {
    if (cat === 'engine') return Math.round(DR.ENGINES[id].price * 0.35 / 10) * 10;
    var cheapest = DR.partOptions(cat, inst).filter(function (o) { return o.price; }).sort(function (a, b) { return a.price - b.price; })[0];
    return Math.max(10, Math.round((cheapest ? cheapest.price : 100) * 0.2 / 10) * 10);
  };

  // Moves the part installed in `cat` to the inventory. A factory part goes
  // too (as a used factory part, worth a little), unless it leaves with its
  // engine (keepStock: the engine's own factory bits stay on it).
  function stash(inst, cat, keepStock) {
    var id = DR.partId(cat, inst);
    if (id === DR.stockPart(cat, inst)) {
      if (keepStock || !G.stockIsPart(cat, inst)) { if (!keepStock && inst.wear) delete inst.wear[cat]; return null; }
      var st = { uid: G.state.uid++, cat: cat, id: id, price: 0, stock: true, val: G.stockValue(cat, inst, id), from: inst.uid };
      if (G.isEngineBound(cat)) st.eng = inst.engine; else if (id === 'stock') st.car = inst.carId;
      wearOff(inst, cat, st);
      G.state.inv.push(st);
      return st;
    }
    var opt = DR.getOption(cat, inst, id);
    var item = { uid: G.state.uid++, cat: cat, id: id, price: opt.price || 0, eng: G.isEngineBound(cat) ? inst.engine : undefined, from: inst.uid };
    wearOff(inst, cat, item);
    G.state.inv.push(item);
    inst.spent = Math.max(0, inst.spent - item.price);
    return item;
  }
  // a consumable coming off keeps its wear; the slot starts fresh
  function wearOff(inst, cat, item) {
    var w = inst.wear && inst.wear[cat];
    if (w && w.w > 0.005 && item) { item.wear = Math.round(w.w * 1000) / 1000; item.passes = w.n; }
    if (inst.wear) delete inst.wear[cat];
  }
  function clearTune(inst, cat, fiWas) {
    if (cat === 'engine') { delete inst.tune.boost; delete inst.tune.launchRpm; delete inst.tune.shiftRpm; delete inst.tune.revLimit; }
    if (cat === 'fi' && (fiWas === 'none' || DR.partId('fi', inst) === 'none')) delete inst.tune.boost;
    if (cat === 'trans') delete inst.tune.gears;
    if (cat === 'rtires') delete inst.tune.psi;
    if (cat === 'rearsusp') delete inst.tune.antiSquat;
    if (['heads', 'cams', 'valvetrain', 'pistons', 'rods', 'crank', 'oiling', 'ecu'].indexOf(cat) >= 0) delete inst.tune.shiftRpm;
  }
  function setPart(inst, cat, id) {
    var fiWas = DR.partId('fi', inst);
    if (cat === 'engine') {
      DR.ENGINE_BOUND.forEach(function (c) { stash(inst, c, true); delete inst.parts[c]; });
      stash(inst, 'engine');
      inst.engine = id;
      if (inst.damage && inst.damage.engine) inst.damage = null;
    } else {
      stash(inst, cat);
      if (id === DR.stockPart(cat, inst)) delete inst.parts[cat]; else inst.parts[cat] = id;
      if (cat === 'trans' && inst.damage && inst.damage.trans) inst.damage = null;
      if (cat === 'rearend' && inst.damage && inst.damage.axle) inst.damage = null;
      if (cat === 'chassis' && inst.damage && inst.damage.chassis) inst.damage = null;
    }
    clearTune(inst, cat, fiWas);
    if (cat === 'layout') swapBoxKind(inst);
  }
  // converting to (or back from) a lengthways driveline takes off a gearbox
  // that no longer fits; the conversion comes with a box of the right kind
  function swapBoxKind(inst) {
    var t = inst.parts.trans;
    if (t && !DR.transFits(inst, t)) { stash(inst, 'trans'); delete inst.parts.trans; delete inst.tune.gears; }
  }

  G.buyPart = function (cat, id) {
    var inst = G.car(), opt = DR.getOption(cat, inst, id), price = G.partPrice ? G.partPrice(cat, opt) : opt.price || 0;
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
    // an engine swap pays the shop for the install (labour, adapters,
    // fabrication); it is work, not a part, so it never comes back
    var fee = item.cat === 'engine' ? DR.swapFit(inst, item.id).install : 0;
    if (fee && !G.canAfford(fee)) { inv.push(item); return { ok: false, msg: 'The install costs ' + DR.money(fee) }; }
    if (fee) G.pay(fee);
    setPart(inst, item.cat, item.id);
    if (item.wear) { inst.wear = inst.wear || {}; inst.wear[item.cat] = { w: item.wear, n: item.passes || 0 }; }
    inst.spent += item.price;
    G.save();
    return { ok: true, msg: 'Installed ' + G.partName(item) };
  };
  // Why a part can't come off right now ('' if it can).
  G.removeIssue = function (inst, cat) {
    var car = DR.CARS[inst.carId];
    if (cat === 'layout' && car.drive === 'FWD' && DR.ENGINES[inst.engine].mount === 'L') return 'The ' + DR.ENGINES[inst.engine].name + ' needs the lengthways conversion. Swap the engine out first.';
    return '';
  };
  // The factory part that goes back in when an aftermarket one comes off:
  // yours from the inventory if you kept it, else a used one bought for
  // what it's worth. { item, cost }
  G.factoryFor = function (inst, cat) {
    var id = DR.stockPart(cat, inst);
    var mine = G.state.inv.filter(function (it) { return it.stock && it.cat === cat && it.id === id && !G.partFitIssueStock(it, inst); })[0];
    if (!G.stockIsPart(cat, inst)) return { item: null, cost: 0 };
    return { item: mine || null, cost: mine ? 0 : G.stockValue(cat, inst, cat === 'engine' ? DR.CARS[inst.carId].engine : id) };
  };
  G.partFitIssueStock = function (it, inst) {
    if (it.id === 'stock' && !G.isEngineBound(it.cat) && it.car && it.car !== inst.carId) return 'other car';
    if (G.isEngineBound(it.cat) && it.eng !== inst.engine) return 'other engine';
    return '';
  };
  // Back to the factory part; the old one goes to the inventory.
  G.removePart = function (inst, cat) {
    if (DR.partId(cat, inst) === DR.stockPart(cat, inst) || G.removeIssue(inst, cat)) return false;
    var f = G.factoryFor(inst, cat);
    if (f.cost && !G.canAfford(f.cost)) return false;
    if (f.item) G.state.inv.splice(G.state.inv.indexOf(f.item), 1); else if (f.cost) G.pay(f.cost);
    if (cat === 'engine') setPart(inst, 'engine', DR.CARS[inst.carId].engine);
    else { var fiWas = DR.partId('fi', inst); stash(inst, cat); delete inst.parts[cat]; clearTune(inst, cat, fiWas); if (cat === 'layout') swapBoxKind(inst); }
    G.save();
    return true;
  };
  // A quick upgrade package (DR.packagePlan): pay the package price, then
  // each part goes on the car (at its share of the discount) and anything
  // it replaces goes to the shelf. Sets the boost the package was built
  // around; the rest of the tune is the player's.
  G.buyPackage = function (inst, plan) {
    if (!plan.steps.length || !G.canAfford(plan.price)) return false;
    G.pay(plan.price);
    var k = plan.full ? plan.price / plan.full : 1;
    plan.steps.forEach(function (s) {
      var item = { uid: G.state.uid++, cat: s.cat, id: s.id, price: Math.round((s.opt.price || 0) * k), eng: G.isEngineBound(s.cat) ? inst.engine : undefined };
      G.state.inv.push(item);
      G.installPart(inst, item.uid);
    });
    if (plan.after.tune && plan.after.tune.boost != null) inst.tune.boost = plan.after.tune.boost;
    G.save();
    return true;
  };
  // Sold parts wait at the counter until your next race: buy one back for
  // what you sold it for, in case a sale was a mistake.
  G.sellPart = function (uid, noSave) {
    var inv = G.state.inv, sold = G.state.sold || (G.state.sold = []);
    for (var i = 0; i < inv.length; i++) if (inv[i].uid === uid) {
      var v = G.partSellValue(inv[i]);
      sold.unshift({ item: inv[i], v: v });
      if (sold.length > 30) sold.length = 30;
      inv.splice(i, 1); G.earn(v);
      if (!noSave) G.save();
      return v;
    }
    return 0;
  };
  G.sellParts = function (uids) {
    var t = 0;
    uids.forEach(function (u) { t += G.sellPart(u, true); });
    G.save(); return t;
  };
  G.buyBack = function (uid) {
    var sold = G.state.sold || [];
    for (var i = 0; i < sold.length; i++) if (sold[i].item.uid === uid) {
      if (!G.canAfford(sold[i].v)) return false;
      G.pay(sold[i].v); G.state.inv.push(sold[i].item); sold.splice(i, 1); G.save(); return true;
    }
    return false;
  };
  G.clearSold = function () { G.state.sold = []; };
  // Every aftermarket part comes off and goes to your shelf; the car keeps
  // its factory parts (and is worth that much).
  // What stripping a car costs: used factory parts for any you sold.
  G.stripCost = function (inst) {
    var cats = Object.keys(inst.parts).filter(function (c) { return DR.partId(c, inst) !== DR.stockPart(c, inst); });
    if (inst.engine !== DR.CARS[inst.carId].engine) cats.push('engine');
    return cats.reduce(function (t, c) { return t + G.factoryFor(inst, c).cost; }, 0);
  };
  G.stripCar = function (inst) {
    var n = G.state.inv.length;
    if (inst.engine !== DR.CARS[inst.carId].engine) G.removePart(inst, 'engine');
    Object.keys(inst.parts).forEach(function (c) { G.removePart(inst, c); });
    G.save();
    return G.state.inv.length - n;
  };

  // ---------------------------------------------------------------- running costs
  // What a race pass burns: fuel by power and fuel type, and the nitrous
  // actually sprayed (the tires wear instead: see wear). Paid automatically after every race against someone (never on
  // solo or test passes), and never more than you have.
  var FUEL_COST = { stock: 1, e85: 1.15, race: 1.8, meth: 1.5 };
  DR.runCost = function (S, nosT) {
    var k = 0.0006, fuel = k * Math.pow(S.peakHp, 1.8) * (FUEL_COST[S.fuelId] || 1);
    var nos = S.nosHp ? S.nosRated * (nosT == null ? 6 : nosT) * 0.035 : 0;
    var r = { fuel: Math.round(fuel), nos: Math.round(nos) };
    r.total = r.fuel + r.nos;
    return r;
  };
  G.payRunCost = function (S, nosT) {
    var c = DR.runCost(S, nosT);
    // a fuel sponsor's discount
    if (G.fuelDiscount && G.fuelDiscount()) { c.fuel = Math.round(c.fuel * (1 - G.fuelDiscount())); c.total = c.fuel + c.nos; }
    c.paid = Math.min(c.total, Math.max(0, G.state.money));
    if (c.paid) G.pay(c.paid);
    return c;
  };

  // ---------------------------------------------------------------- wear
  // Drive tires and clutch discs wear with the energy put through them:
  // the burnout, wheelspin and the clutch slipping off the line. Lives
  // from racers' figures: street tires take ~70 burnout-and-pass cycles,
  // drag radials 40-70, slicks 30-50 (fewer the more power), a clutch's
  // discs 60-170 hard launches (bigger clutches have more friction surface).
  G.WEAR_CATS = ['rtires', 'clutch'];
  var TIRE_LIFE = { Street: 0.8, 'Drag Radial': 0.67, Slick: 1.25, Track: 0.9, 'Race Slick': 0.8 };   // MJ per kg of tire
  G.addWear = function (inst, S, sim, passes) {
    if (inst.ai) return;
    passes = passes || 1;
    inst.wear = inst.wear || {};
    var t = inst.wear.rtires || (inst.wear.rtires = { w: 0, n: 0 });
    t.w = Math.min(1, t.w + sim.tireE / (S.tire.m * (TIRE_LIFE[S.tire.kind] || 0.8) * 1e6)); t.n += passes;
    if (S.trType !== 'auto' && S.clCapNew) {
      var c = inst.wear.clutch || (inst.wear.clutch = { w: 0, n: 0 });
      c.w = Math.min(1, c.w + sim.clutchE / (S.clCapNew * 0.02e6)); c.n += passes;
    }
  };
  // ---------------------------------------------------------------- heat
  // Through the rounds of an elimination the engine and the nitrous bottle
  // don't get back to where they started: ~25 minutes between rounds takes
  // out about two-thirds of a pass's heat; a bottle without a heater drops
  // pressure every time it's sprayed and only partly recovers.
  var heat = null;
  G.roundHeat = function (inst, cfg) {
    if (!(cfg.mode === 'career' && cfg.ev && cfg.round > 0 && heat && heat.ev === cfg.ev && heat.uid === inst.uid)) heat = { ev: cfg.ev, uid: inst.uid, eng: 0, nosP: 1 };
    return heat;
  };
  G.afterRound = function (inst, S, sim) {
    if (!heat || heat.uid !== inst.uid) return;
    var load = (S.peakHp + S.nosHp) / Math.max(1, S.coolHp);
    var eng = heat.eng + 16 * Math.max(0.3, Math.min(2.2, load)) * Math.min(sim.et || 10, 15) / 10;
    heat.eng = eng * 0.35;
    if (S.nosHp && sim.nosT > 0.5) {
      var heater = DR.getOption('nosheat', inst).nosk >= 1;
      heat.nosP = Math.max(0.7, heat.nosP - (heater ? 0.015 : 0.07) * Math.min(1.5, sim.nosT / 5));
      heat.nosP = Math.min(1, heat.nosP + (1 - heat.nosP) * (heater ? 0.8 : 0.3));
    }
  };

  // circuit distance: a tire lasts so many km of hard laps (race slicks a
  // race weekend or two, track tires a few, street tires a season)
  var TIRE_KM = { Street: 900, Track: 500, 'Race Slick': 300, 'Drag Radial': 250, Slick: 120 };
  G.addTireKm = function (inst, S, km) {
    if (inst.ai) return;
    inst.wear = inst.wear || {};
    var t = inst.wear.rtires || (inst.wear.rtires = { w: 0, n: 0 });
    t.w = Math.min(1, t.w + km / (TIRE_KM[S.tire.kind] || 500));
  };
  // what fitting a fresh one costs: the same part, new
  G.servicePrice = function (inst, cat) {
    var S = G.spec(inst);
    if (cat === 'rtires') return DR.TIRES[S.tireId].price || 300;
    var opt = DR.getOption(cat, inst);
    return opt.price || (cat === 'clutch' ? 600 : 0);
  };
  // the consumables on a car: [{cat, name, w, n, price}]
  G.wearList = function (inst) {
    var S = G.spec(inst), out = [];
    G.WEAR_CATS.forEach(function (cat) {
      if (cat === 'clutch' && S.trType === 'auto') return;
      var w = inst.wear && inst.wear[cat] || { w: 0, n: 0 };
      out.push({ cat: cat, name: cat === 'rtires' ? DR.TIRES[S.tireId].name : DR.getOption('clutch', inst).name, w: w.w, n: w.n, price: G.servicePrice(inst, cat) });
    });
    return out;
  };
  // Fit fresh ones of the same parts; the worn ones go on the shelf, used.
  G.service = function (inst, cats) {
    var cost = cats.reduce(function (a, c) { return a + G.servicePrice(inst, c); }, 0);
    if (!G.canAfford(cost)) return false;
    G.pay(cost);
    cats.forEach(function (cat) {
      var id = DR.partId(cat, inst), stock = id === DR.stockPart(cat, inst);
      var w = inst.wear && inst.wear[cat];
      var item = { uid: G.state.uid++, cat: cat, id: id, price: stock ? 0 : DR.getOption(cat, inst, id).price || 0, from: inst.uid };
      if (stock) { item.stock = true; item.val = G.stockValue(cat, inst, id); if (id === 'stock') item.car = inst.carId; }
      if (w && w.w > 0.005) { item.wear = Math.round(w.w * 1000) / 1000; item.passes = w.n; }
      G.state.inv.push(item);
      if (inst.wear) delete inst.wear[cat];
    });
    G.save();
    return true;
  };

  // ---------------------------------------------------------------- the tuner
  // Hire a tuner for a session of test hits (DR.runTuner). You pay the
  // tuner by the hit, the fuel and nitrous each hit burns, and the car takes
  // the wear (and whatever it breaks). The settings the tuner found go
  // into your tune.
  G.tunerQuote = function (inst, jobIds) {
    var S = G.spec(inst), jobs = DR.tunerJobs(inst).filter(function (j) { return jobIds.indexOf(j.id) >= 0; });
    var maxHits = DR.tunerMaxHits(jobs), perHit = DR.tunerFee(S) + DR.runCost(S).total;
    return { maxHits: maxHits, fee: DR.tunerFee(S), fuel: DR.runCost(S).total, perHit: perHit, max: maxHits * perHit };
  };
  // A session with the tuner (DR.tunerSession), driven a hit at a time:
  // each hit is paid for (the tuner's rate and the fuel) and wears the car
  // as it's made. tunerStep returns { hit, pause } where pause is why the
  // tuner stopped to ask you something: 'tires' / 'clutch' (worn out, fit
  // fresh ones to go on), 'money', or null.
  DR.TUNER_WORN = 0.75;
  G.startTuner = function (inst, jobIds) {
    var q = G.tunerQuote(inst, jobIds);
    if (!G.canAfford(q.perHit)) return null;
    var ss = DR.tunerSession(inst, jobIds);
    ss.cost = { fee: 0, fuel: 0, parts: 0 };
    ss.log = [];   // hits and pit stops, in order
    return ss;
  };
  G.tunerStep = function (inst, ss) {
    var q = G.tunerQuote(inst, []), S = G.spec(inst);
    if (!G.canAfford(q.perHit)) return { hit: null, pause: 'money' };
    var h = ss.step();
    if (!h) return { hit: null, pause: null };
    G.pay(q.fee + q.fuel); ss.cost.fee += q.fee; ss.cost.fuel += q.fuel;
    G.addWear(inst, h.S || S, h, 1);
    ss.log.push({ hit: h.label, et: h.et, sixty: h.sixty, broke: h.broke });
    if (h.broke) inst.damage = h.broke === 'engine' ? { engine: true } : h.broke === 'axle' ? { axle: true } : h.broke === 'chassis' ? { chassis: true } : { trans: true };
    G.save();
    if (ss.done) return { hit: h, pause: null };
    var w = inst.wear || {};
    if (w.rtires && w.rtires.w >= DR.TUNER_WORN) return { hit: h, pause: 'tires' };
    if (w.clutch && w.clutch.w >= DR.TUNER_WORN && S.trType !== 'auto') return { hit: h, pause: 'clutch' };
    return { hit: h, pause: null };
  };
  // fresh tires (and clutch) mid-session: the car has changed, so the
  // tuner makes a new baseline hit before carrying on
  G.tunerService = function (inst, ss, cats) {
    var cost = cats.reduce(function (a, c) { return a + G.servicePrice(inst, c); }, 0);
    if (!G.service(inst, cats)) return false;
    ss.cost.parts += cost; ss.rebase = true;
    ss.log.push({ pit: 'Fresh ' + cats.map(function (c) { return c === 'rtires' ? 'tires' : 'clutch'; }).join(' & ') + ' fitted (' + DR.money(cost) + ')' });
    return true;
  };
  // the settings the session found go into the tune
  G.finishTuner = function (inst, ss) {
    var ch = ss.changes();
    for (var k in ch) inst.tune[k] = ch[k];
    G.save();
    return ch;
  };

  // ---------------------------------------------------------------- damage
  // no other car that runs: the shop takes whatever you have, so a blown
  // engine can never leave you stuck with nothing to race
  G.mercyRepair = function (inst) { return !G.state.cars.some(function (c) { return c !== inst && !c.damage; }); };
  G.repairCost = function (inst) {
    var full = fullRepairCost(inst);
    return G.mercyRepair(inst) ? Math.min(full, Math.max(0, G.state.money)) : full;
  };
  function fullRepairCost(inst) { return G.repairBill(inst).total; }
  // The shop's bill after a breakage, line by line: the teardown, the parts
  // the failure took out (your own parts, at their price) and the labour.
  G.repairBill = function (inst) {
    var d = inst.damage, L = [], e = DR.ENGINES[inst.engine], r5 = function (x) { return Math.round(x / 50) * 50; };
    function partCost(cat, stockK) { var o = DR.getOption(cat, inst); return o.price ? o.price : r5(e.price * stockK); }
    if (!d) return { lines: [], total: 0 };
    if (d.engine) {
      L.push(['Teardown & inspection', r5(300 + e.cyl * 40)]);
      L.push(['Pistons & rings', r5(partCost('pistons', 0.06) * 0.8)]);
      L.push(['Connecting rods', r5(partCost('rods', 0.05) * 0.7)]);
      L.push(['Machine work (bore, hone, crank)', r5(250 + e.cyl * 35 + e.price * 0.05)]);
      L.push(['Bearings, gaskets & assembly', r5(200 + e.price * 0.06)]);
    } else if (d.trans) {
      var tr = DR.TRANS[DR.partId('trans', inst)];
      L.push(['Remove & refit', 300]); L.push(['Rebuild parts (gears, bands, clutches)', r5(tr.price * 0.3)]); L.push(['Rebuild labour', r5(150 + tr.price * 0.08)]);
    } else if (d.axle) {
      var ax = DR.getOption('rearend', inst);
      L.push(['Axle shaft', ax.price ? r5(ax.price * 0.25) : 250]); L.push(['Bearings & seals', 120]); L.push(['Labour', 230]);
    } else if (d.chassis) {
      L.push(['Frame straightening', r5(600 + DR.CARS[inst.carId].price * 0.02)]); L.push(['Welding & bracing', r5(Math.min(3000, 300 + DR.CARS[inst.carId].price * 0.02))]);
    }
    return { lines: L, total: L.reduce(function (a, x) { return a + x[1]; }, 0) };
  };
  G.repair = function (inst) {
    var c = G.repairCost(inst);
    if (!G.canAfford(c)) return false;
    G.pay(c); inst.damage = null; G.save(); return true;
  };

  // ---------------------------------------------------------------- rivals
  // An opponent: car + parts + tune + driver skill.
  function O(name, carId, engine, parts, tune, skill, color) {
    return DR.fitSupport({ name: name, carId: carId, engine: engine || DR.CARS[carId].engine, parts: DR.expandParts(parts || {}, true), tune: tune || {}, skill: skill, color: color });
  }
  // Rival builds are written with the older combined parts (internals,
  // fuelsys...); O() expands them and adds the support parts they need.
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
    // ai: a rival's build is always fuelled and tuned properly
    return { uid: -1, ai: true, carId: o.carId, engine: o.engine, parts: DR.fitTrans({ carId: o.carId, parts: Object.assign({}, o.parts) }).parts, tune: o.tune, vis: o.vis || {}, color: o.color || DR.CARS[o.carId].col, stripe: o.stripe || '', rim: o.rim || '#d0d0d0' };
  };
  // Estimated ET for an opponent / car (cached per build).
  var etCache = {};
  // cond (optional): the day's conditions (DR.conditions), grip then rating
  // the surface against its usual grip
  G.estimate = function (inst, dist, grip, cond) {
    var key = JSON.stringify([inst.carId, inst.engine, inst.parts, inst.tune, dist, grip || 1, !!inst.ai, cond || 0]);
    if (etCache[key]) return etCache[key];
    var r = DR.simulate(DR.buildSpec(inst), { dist: dist || DR.QUARTER, grip: grip || 1, cond: cond });
    etCache[key] = { et: r.et, trap: r.trap };
    return etCache[key];
  };

  // Street race: opponents near the player's estimated time at this spot.
  G.streetOpponents = function (playerET, dist, grip) {
    dist = dist || DR.EIGHTH; grip = grip || 0.85;
    // every career rival is a possible street opponent (they cover the
    // whole ladder, a step apart)
    var pool = [];
    (DR.STAGES || []).forEach(function (st) { st.all.forEach(function (ev) { ev.opps.forEach(function (o) { pool.push(o); }); }); });
    if (!pool.length) DR.RIVALS.forEach(function (band) { band.forEach(function (o) { pool.push(o); }); });
    var names = ['Spike', 'Rico', 'Jade', 'Duke', 'Sasha', 'Moose', 'Ziggy', 'Nova', 'Blaze', 'Cruz', 'Vega', 'Slim'];
    var scored = pool.map(function (o) {
      var est = G.estimate(G.oppInst(o), dist, grip);
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
