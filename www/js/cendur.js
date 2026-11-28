// ===========================================================================
// ENDURANCE AND THE CIRCUIT KING — the circuit ladder's build C3 (owner's
// plan, Nov 28; research: SCCA 2026 GCR 3.1.2, SCCA / HSR / ChampCar enduro
// stops, track fuel use, club refueling).
//  * Endurance events run: 3x a Sprint, your own car under the class limit,
//    two of your drivers sharing it with one stop. You pick who starts, the
//    stop lap and new tires; the stop takes the pit lane and driver change,
//    the fuel the second stint needs and the tires (team.js), less what your
//    mechanic's hands save. 1.5x the Sprint's purse.
//  * The field: each regular with a co-driver; they stop near halfway and
//    take tires in the long races.
//  * A section opens with 3 of its 4 events now (open ones stay open).
//  * The Circuit King: after the GT Pro Championship, race Viktor Halvorsen
//    and Mara Engstrom's 911 GT racer, one endurance-format race at Pixel
//    Raceway, for their car and $120,000.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, T = DR.Team, CLD = DR.CL;
  function C() { return G.careerState(); }
  function r10(x) { return Math.round(x / 10) * 10; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function hash(str) { var x = 2166136261; for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------------------------------------------------------------- the events
  CLD.LIVE.endur = true;
  CLD.theme('endur').blurb = 'Three times a Sprint: two of your drivers share your car, with one stop for the driver change, fuel and (if you want) new tires. You pick who starts, the stop lap and the tires. Win it to finish the event.';
  CLD.theme('endur').soon = null;
  CLD.ENDUR_LAPS = 3;     // x the Sprint's
  CLD.ENDUR_PAY = 1.5;    // x the Sprint's purse
  DR.CSTAGES.forEach(function (cs) {
    cs.events.forEach(function (ev) {
      if (ev.theme !== 'endur') return;
      ev.laps = CLD.ENDUR_LAPS * T.lapsAt(cs.cls, 'pixel');
      ev.cash = r10(ev.cash * CLD.ENDUR_PAY);
      ev.fee = Math.max(10, r10(ev.cash * CLD.ENTRY_K));
    });
  });
  // the stop lap you may pick: the middle third
  CLD.stopRange = function (laps) { return [Math.max(1, Math.ceil(laps / 3)), Math.min(laps - 1, Math.floor(laps * 2 / 3))]; };
  // your mechanic at the stop: up to 10 s off the driver change and tires
  CLD.MECH_SAVE = 10;
  CLD.mechSave = function () { var m = T.mechanic && T.mechanic(); return m ? Math.round(CLD.MECH_SAVE * m.wr / 100 * 10) / 10 : 0; };
  // a stop's estimate for the entry card: { t, gal, fuelT, tires, save }
  CLD.stopEst = function (inst, ev, stop, tires) {
    var S = DR.buildSpec(T.circuitCar(inst)), lap = T.idealLap(inst, ev.track) * 1.04, laps2 = ev.laps - stop;
    var gal = T.PIT.gph * S.peakHp * laps2 * lap / 3600, fuelT = gal / T.PIT.rate, save = CLD.mechSave();
    return { t: Math.max(15, T.PIT.base + fuelT + (tires ? T.PIT.tires : 0) - save), gal: gal, fuelT: fuelT, tires: tires ? T.PIT.tires : 0, save: save };
  };

  // ---------------------------------------------------------------- the field
  // each regular with a co-driver (their skill within 10 of the regular's),
  // the stop within two laps of halfway, tires in races of 24 laps and up
  // (GT and above), else 1 in 3; their crew a few seconds either way
  var FIRST = ['Ana', 'Bo', 'Cass', 'Dov', 'Esme', 'Finn', 'Greta', 'Hal', 'Ines', 'Joss', 'Kira', 'Leo', 'Mae', 'Ned', 'Oona', 'Pim', 'Rhea', 'Saul', 'Tove', 'Vic'];
  var LAST = ['Abara', 'Brandt', 'Corso', 'Dahl', 'Eze', 'Falk', 'Gill', 'Hayes', 'Ivers', 'Juhl', 'Kemp', 'Lund', 'Moss', 'Nyberg', 'Orr', 'Pike', 'Rook', 'Sato', 'Teague', 'Voss'];
  var hpCache = {};
  function stockHp(carId) { if (hpCache[carId] == null) hpCache[carId] = DR.buildSpec({ carId: carId, engine: DR.CARS[carId].engine, parts: {}, tune: {} }).peakHp; return hpCache[carId]; }
  var field0 = CLD.field;
  CLD.field = function (ev) {
    if (ev.king) return [CLD.kingEntry()];
    var f = field0(ev);
    if (ev.theme !== 'endur') return f;
    var si = ev.stage;
    return f.map(function (e) {
      var R = CLD.ROSTER[si][e.reg], rnd = rng(hash('co-' + si + '-' + e.reg)), q2 = clamp(R.q + CLD.STEP[ev.sec] + Math.round((rnd() - 0.5) * 20), 10, 97);
      var rr = rng(hash(ev.id + ':' + e.reg));
      e.d2 = { name: FIRST[Math.floor(rnd() * FIRST.length)] + ' ' + LAST[Math.floor(rnd() * LAST.length)], brk: clamp(q2 + R.sk[0], 12, 97), cor: clamp(q2 + R.sk[1], 12, 97), con: clamp(q2 + R.sk[2], 12, 97) };
      e.stop = Math.round(ev.laps / 2) + Math.floor(rr() * 5) - 2;
      e.tires = ev.laps >= 24 || rr() < 1 / 3;
      e.hp = stockHp(e.car); e.save = Math.round((rr() * 6 - 3) * 10) / 10;
      return e;
    });
  };

  // ---------------------------------------------------------------- entering
  // the second driver: free and licensed for the class; your mechanic at the
  // stop (their day's wage)
  var enter0 = T.enter;
  T.enter = function (clsId, uid, drvId, tid, opts) {
    var ev = opts && opts.ev;
    if (!(ev && ev.cl && ev.theme === 'endur')) return enter0.apply(this, arguments);
    var en = opts.endur;
    if (!en || !en.drv2) return { msg: 'An endurance race needs two of your drivers in the car' };
    var d2 = T.driver(en.drv2);
    if (!d2 || en.drv2 === drvId) return { msg: 'Pick two different drivers' };
    if (CLD.licOk && !CLD.licOk(d2, ev.stage)) return { msg: CLD.licWhy(d2, ev.stage) };
    var o = {}, k; for (k in opts) o[k] = opts[k];
    var m = T.mechanic && T.mechanic(), rg = CLD.stopRange(ev.laps);
    o.endur = { drv2: en.drv2, stop: clamp(en.stop || Math.round(ev.laps / 2), rg[0], rg[1]), tires: !!en.tires, save: CLD.mechSave(), mechWage: m ? T.mechWage(m) : 0 };
    var res = enter0.call(this, clsId, uid, drvId, tid, o);
    if (res.race && m && T.learnMech) T.learnMech(m);
    return res;
  };

  // ---------------------------------------------------------------- the Circuit King
  // Viktor Halvorsen and Mara Engstrom in their Porsche 911 GT racer: the
  // cup car's chassis and aero on slicks, the engine breathing a little more
  CLD.KING = {
    name: 'Viktor Halvorsen', co: 'Mara Engstrom', team: 'Halvorsen Motorsport', col: '#ffd700',
    car: { carId: 'p911', engine: DR.CARS.p911.engine, color: '#f2f2f2', stripe: '#ffd700',
      parts: { springs: 'sp2', shocks: 'sh3', sway: 'sw2', brakes: 'br2', aero: 'a3', diff: 'lsd', wheels: 'forged18x11', fwheels: 'forged18x11', rtires: 'rr_slk', ftires: 'rr_slk', fwells: 'fw1', chassis: 'cg3', weight: 'w2', airfilter: 'af2', exhaust: 'e3', cooling: 'co2' },
      tune: {} },
    skill: { brk: 96, cor: 95, con: 94 }, skill2: { brk: 90, cor: 89, con: 90 }, cash: 120000
  };
  CLD.KING_EV = { id: 'CK', cl: true, king: true, theme: 'endur', stage: 4, sec: CLD.SECTIONS, idx: 99, cls: 'unl', track: 'pixel', top: 1,
    name: 'The Circuit King', laps: 30, cash: CLD.KING.cash, fee: 0, unlocks: [] };
  var kingInst = null;
  CLD.kingInst = function () { if (!kingInst) { var c = CLD.KING.car; kingInst = { uid: 'king', carId: c.carId, engine: c.engine, parts: JSON.parse(JSON.stringify(c.parts)), tune: {}, vis: {}, color: c.color, stripe: c.stripe, rim: '#c8c8c8', damage: 0 }; } return kingInst; };
  CLD.kingEntry = function () {
    var K = CLD.KING, inst = CLD.kingInst();
    return { name: K.name, team: K.team, car: inst.carId, col: K.col, pace: T.idealLap(inst, 'pixel'), d: { name: K.name, brk: K.skill.brk, cor: K.skill.cor, con: K.skill.con },
      d2: { name: K.co, brk: K.skill2.brk, cor: K.skill2.cor, con: K.skill2.con }, stop: 15, tires: true, hp: DR.buildSpec(inst).peakHp, save: 6 };
  };
  CLD.kingBeaten = function () { return !!(C().cl && C().cl.king); };
  var ev0 = G.cupEvent;
  G.cupEvent = function (id) { return id === 'CK' ? CLD.KING_EV : ev0.apply(this, arguments); };
  var lock0 = G.cupLock;
  G.cupLock = function (ev, opt) {
    if (!ev || !ev.king) return lock0.apply(this, arguments);
    var cl = CLD.state();
    if (!cl.won[DR.CSTAGES[4].champ.id]) return 'Win the ' + G.cupName(4) + ' first';
    if (cl.king) return 'You beat them: their car is yours';
    if (T.active().some(function (r) { return r.ev === ev.id; })) return 'Your team is racing them now';
    if (G.centeredThisWeek(ev) && !(opt && opt.anyWeek)) return 'You raced them this week: next Sunday again';
    return '';
  };
  var unl0 = G.cupUnlocks;
  G.cupUnlocks = function (ev) { return ev && ev.king ? [] : unl0.apply(this, arguments); };
  var kLock0 = G.kingLock, kWon0 = G.kingWon;
  G.kingLock = function (d) { return d === 'circuit' ? G.cupLock(CLD.KING_EV) : kLock0.apply(this, arguments); };
  // (an old save's Night Series title still counts as the Circuit King's)
  G.kingWon = function (d) { return d === 'circuit' ? CLD.kingBeaten() || kWon0.apply(this, arguments) : kWon0.apply(this, arguments); };
  if (DR.KINGS && DR.KINGS.circuit) DR.KINGS.circuit.blurb = 'Your team against the best: win the GT Pro Championship (Career > Circuit), then call out ' + CLD.KING.name + ' and ' + CLD.KING.co + ': one endurance race at Pixel Raceway, two drivers a car, for their Porsche 911 GT racer and ' + DR.money(CLD.KING.cash) + '.';
  // the finish: the title, their car and the purse
  var finish0 = G.cupFinish;
  G.cupFinish = function (id, pos, r) {
    if (id !== 'CK') return finish0.apply(this, arguments);
    var cl = CLD.state(), out = { name: 'the Circuit King race', cash: 0, unlocks: [], note: '' };
    if (pos !== 1) { out.note = 'the King holds on: race them again next Sunday'; G.save(); return out; }
    if (cl.king) { out.note = 'won again'; return out; }
    cl.king = true; out.cash = CLD.KING.cash;
    var c = CLD.KING.car, car = G.awardCar ? G.awardCar({ carId: c.carId, engine: c.engine, parts: c.parts, tune: c.tune, color: c.color, stripe: c.stripe, name: CLD.KING.name }) : null;
    out.unlocks.push('Their ' + DR.CARS[c.carId].name + ' GT racer is in your garage');
    out.note = 'YOU\'RE THE CIRCUIT KING';
    if (DR.Phone) DR.Phone.send('ray', 'cking');
    G.save();
    return out;
  };
})();
