// ===========================================================================
// TEAM — the circuit racing team (Juiced style): up to four hired drivers
// with three skills that grow as they race, a hiring board, and circuit
// races your drivers run in your cars against AI teams on Pixel Raceway.
//
// A race is worked out when it's entered (every lap of every car), then
// plays out in real time at 4x: the car and the driver are away at the
// track until it's over, and can't be used for anything else.
//
// Skills (0-100):
//   Braking:     how close to the car's braking limit they brake
//   Cornering:   how much of the car's cornering grip they use
//   Consistency: lap-to-lap spread and how often they make a mistake
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI;
  var T = DR.Team = {};
  T.MAX = 4;
  T.SPEED = 4;              // race clock vs real time
  T.TRACK = 'pixel';
  T.SCOUT_COST = 750;
  T.REFRESH_EVERY = 3;      // finished races between new faces on the board

  // Classes by pace: a car may enter if its ideal (test) lap is no quicker
  // than the floor, like a breakout class; the AI field runs from the floor
  // to a few seconds slower. First win in each class opens parts and cars.
  T.CLASSES = [
    { id: 'D', name: 'Club Cup', floor: 105, spread: 9, laps: 5, fee: 300, prize: [2000, 1200, 700, 400, 200, 0], ai: [30, 55], perf: 2, stages: [0, 1] },
    { id: 'C', name: 'Sport Series', floor: 97, spread: 8, laps: 6, fee: 800, prize: [5000, 3000, 1800, 1000, 500, 0], ai: [40, 68], perf: 3, stages: [2] },
    { id: 'B', name: 'GT Challenge', floor: 91, spread: 6, laps: 8, fee: 2000, prize: [12000, 7200, 4200, 2400, 1200, 0], ai: [52, 78], perf: 4, stages: [3] },
    { id: 'A', name: 'Supercar Trophy', floor: 85, spread: 6, laps: 10, fee: 5000, prize: [30000, 18000, 10000, 6000, 3000, 0], ai: [62, 88], perf: 5, stages: [4] },
    { id: 'O', name: 'Unlimited GP', floor: 0, spread: 8, laps: 12, fee: 10000, prize: [60000, 36000, 20000, 12000, 6000, 0], ai: [72, 95], pace: 79, stages: [5] }
  ];
  T.classById = function (id) { return T.CLASSES.filter(function (c) { return c.id === id; })[0]; };

  // ---------------------------------------------------------------- state
  function st() {
    var s = G.state.team;
    if (!s) s = G.state.team = { drivers: [], board: null, races: [], history: [], done: 0, boardAt: 0, wins: {}, nid: 1 };
    s.drivers = s.drivers || []; s.races = s.races || []; s.history = s.history || []; s.wins = s.wins || {};
    if (!s.board) { s.board = makeBoard(); s.boardAt = s.done || 0; }
    return s;
  }
  T.state = st;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function gauss() { var u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  // ---------------------------------------------------------------- drivers
  var FIRST = ['Mika', 'Sofia', 'Dante', 'Aiko', 'Ruben', 'Nadia', 'Kofi', 'Lena', 'Marco', 'Priya', 'Jonas', 'Yuki', 'Andre', 'Elena', 'Tomas', 'Chloe', 'Ravi', 'Ines', 'Hugo', 'Zara',
    'Diego', 'Maya', 'Felix', 'Amara', 'Luca', 'Noor', 'Kai', 'Freya', 'Mateo', 'Hana', 'Oskar', 'Leila', 'Sam', 'Tess', 'Viktor', 'Jade', 'Rafa', 'Uma', 'Cole', 'Ayla'];
  var LAST = ['Okafor', 'Lindqvist', 'Moreau', 'Tanaka', 'Silva', 'Kowalski', 'Haddad', 'Reyes', 'Novak', 'Brennan', 'Sato', 'Mensah', 'Rossi', 'Varga', 'Kaur', 'Duarte', 'Berg',
    'Castillo', 'Nakamura', 'Osei', 'Petrov', 'Laurent', 'Quinn', 'Ferraro', 'Ibarra', 'Holm', 'Adeyemi', 'Marchetti', 'Ahn', 'Vance'];
  var COLORS = ['#e31b6d', '#ffcc00', '#3aa0ff', '#4cd964', '#ff6a00', '#b05cff', '#f4f4f4', '#2fb3a8', '#ff4a3a', '#c8a2ff'];
  function sk(q) { return Math.round(clamp(q + rnd(-12, 12), 12, 96)); }
  // a new driver around quality q (0-100)
  function makeDriver(q) {
    var age = Math.round(clamp(rnd(19, 30) + (q - 40) * 0.25 + rnd(-3, 8), 18, 46));
    var d = { name: pick(FIRST) + ' ' + pick(LAST), age: age, brk: sk(q), cor: sk(q), con: sk(q), col: pick(COLORS), races: 0, wins: 0, podiums: 0 };
    // room to grow: the young ones have it
    var top = Math.max(d.brk, d.cor, d.con);
    d.pot = Math.round(clamp(top + (age < 24 ? rnd(14, 34) : age < 30 ? rnd(8, 24) : age < 36 ? rnd(3, 12) : rnd(0, 5)), top, 99));
    d.fee = T.hireFee(d); d.wage = T.wage(d);
    return d;
  }
  T.avg = function (d) { return (d.brk + d.cor + d.con) / 3; };
  T.hireFee = function (d) { var a = T.avg(d); return Math.round((a * a * 2 + d.pot * 12) / 50) * 50; };
  T.wage = function (d) { var a = T.avg(d); return Math.round((40 + a * a * 0.06) / 10) * 10; };
  T.stars = function (d) { return Math.round(d.pot / 20 * 2) / 2; };   // potential, 0.5-5
  function makeBoard() {
    var qs = [rnd(18, 32), rnd(22, 38), rnd(28, 44), rnd(40, 58), rnd(45, 65), Math.random() < 0.35 ? rnd(72, 88) : rnd(58, 75)];
    return qs.map(function (q) { return makeDriver(q); });
  }
  T.scout = function () {
    if (!G.canAfford(T.SCOUT_COST)) return false;
    G.pay(T.SCOUT_COST);
    var s = st(); s.board = makeBoard(); s.boardAt = s.done; G.save();
    return true;
  };
  T.racesToNewBoard = function () { var s = st(); return Math.max(0, T.REFRESH_EVERY - (s.done - s.boardAt)); };
  T.hire = function (i) {
    var s = st(), d = s.board[i];
    if (!d) return 'Gone';
    if (s.drivers.length >= T.MAX) return 'Your team is full (' + T.MAX + ' drivers). Release one first.';
    if (!G.canAfford(d.fee)) return 'Signing ' + d.name + ' costs ' + DR.money(d.fee);
    G.pay(d.fee);
    d.id = 'd' + (s.nid++); d.hired = Date.now();
    s.drivers.push(d); s.board.splice(i, 1); G.save();
    return '';
  };
  T.release = function (id) {
    var s = st();
    if (T.driverBusy(id)) return 'They are racing right now';
    s.drivers = s.drivers.filter(function (d) { return d.id !== id; }); G.save();
    return '';
  };
  T.driver = function (id) { return st().drivers.filter(function (d) { return d.id === id; })[0]; };
  // how a driver's skills turn into the share of the car's limits they use
  T.factors = function (d) {
    return { lat: 0.88 + 0.12 * d.cor / 100, brk: 0.70 + 0.30 * d.brk / 100,
      sd: 0.002 + 0.010 * (1 - d.con / 100), err: 0.02 + 0.13 * (1 - d.con / 100) };
  };

  // ---------------------------------------------------------------- busy
  T.active = function () { return st().races.filter(function (r) { return !r.done; }); };
  T.raceFor = function (uid) { return T.active().filter(function (r) { return r.car === uid; })[0] || null; };
  T.carAway = function (uid) { return !!T.raceFor(uid); };
  T.driverBusy = function (id) { return T.active().some(function (r) { return r.drv === id; }); };
  T.clock = function (r) { return Math.max(0, (Date.now() - r.start) / 1000 * T.SPEED); };
  T.left = function (r) { return Math.max(0, (r.end - T.clock(r)) / T.SPEED); };
  T.awayText = function (uid) {
    var r = T.raceFor(uid); if (!r) return '';
    var d = T.driver(r.drv), c = T.classById(r.cls);
    return (d ? d.name : 'Your driver') + ' is racing it in the ' + c.name + ' at ' + DR.TRACKS[T.TRACK].name + ': back in ' + fmtLeft(T.left(r)) + '.';
  };
  function fmtLeft(s) { s = Math.ceil(s); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  T.fmtLeft = fmtLeft;

  // ---------------------------------------------------------------- pace
  // The car's ideal lap and how much a driver's shortfall costs it
  // (sensitivity to cornering and braking), cached per build.
  var paceCache = {};
  function sig(inst) { return JSON.stringify([inst.carId, inst.engine, inst.parts, inst.tune]); }
  T.idealLap = function (inst) {
    var k = sig(inst);
    if (!paceCache[k]) paceCache[k] = { ideal: DR.lapSim(inst, DR.TRACKS[T.TRACK]).time };
    return paceCache[k].ideal;
  };
  function sensitivity(inst, ideal) {
    var tr = DR.TRACKS[T.TRACK], S = DR.buildSpec(inst);
    return { lat: (DR.lapSim(inst, tr, S, { lat: 0.95 }).time / ideal - 1) / 0.05, brk: (DR.lapSim(inst, tr, S, { brk: 0.9 }).time / ideal - 1) / 0.1 };
  }
  T.eligible = function (inst, cls) {
    if (cls.floor && T.idealLap(inst) < cls.floor) return 'Too quick for this class: its ideal lap is ' + fmtLap(T.idealLap(inst)) + ', the class allows ' + fmtLap(cls.floor) + ' or slower';
    return '';
  };
  function fmtLap(t) { var m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); }
  T.fmtLap = fmtLap;

  // ---------------------------------------------------------------- the field
  var TEAMS = ['Apex Motorsport', 'Redline Racing', 'Kerbside', 'Slipstream', 'Late Apex', 'Grid Kings', 'Pit Lane Co.', 'Tarmac Union', 'Blue Flag', 'Chequered',
    'Night Shift', 'Torque Bros', 'Downforce', 'Heel & Toe', 'Hairpin Heroes'];
  // a car that runs about this pace, modified if it has to be
  function carFor(pace) {
    var stock = DR.TRACKS[T.TRACK].stock || {};
    var ids = Object.keys(stock).filter(function (id) { return id !== 'promod' && id !== 'rail' && id !== 'diesel' && id !== 'hauler' && stock[id] >= pace - 1 && stock[id] <= pace + 12; });
    if (!ids.length) ids = Object.keys(stock).sort(function (a, b) { return stock[a] - stock[b]; }).slice(0, 6);
    return pick(ids);
  }
  function aiField(cls, n) {
    var used = {}, out = [], base = cls.floor || cls.pace;
    for (var i = 0; i < n; i++) {
      var team; do team = pick(TEAMS); while (used[team]); used[team] = 1;
      var q = rnd(cls.ai[0], cls.ai[1]), d = makeDriver(q);
      var pace = base + rnd(0.2, cls.spread);
      out.push({ name: d.name, team: team, car: carFor(pace), col: d.col, pace: pace, d: d });
    }
    return out;
  }

  // ---------------------------------------------------------------- race
  // Every lap of every car, worked out up front. Overtaking: a quicker car
  // that catches the one ahead gets by if its pace advantage that lap is
  // big enough (luck helps); otherwise it's stuck behind for the lap.
  T.enter = function (clsId, uid, drvId) {
    var cls = T.classById(clsId), inst = G.state.cars.filter(function (c) { return c.uid === uid; })[0], d = T.driver(drvId), s = st();
    if (!cls || !inst || !d) return { msg: 'Pick a car and a driver' };
    if (inst.damage) return { msg: 'Repair the car first' };
    if (T.carAway(uid)) return { msg: 'That car is already at the track' };
    if (T.driverBusy(drvId)) return { msg: d.name + ' is already racing' };
    var why = T.eligible(inst, cls); if (why) return { msg: why };
    var cost = cls.fee + d.wage;
    if (!G.canAfford(cost)) return { msg: 'Entry and wages: ' + DR.money(cost) };
    var tr = DR.TRACKS[T.TRACK], S = DR.buildSpec(inst), ideal = T.idealLap(inst), sens = sensitivity(inst, ideal);
    var f = T.factors(d), you = DR.lapSim(inst, tr, S, { lat: f.lat, brk: f.brk });
    // the shape of a lap in time (fraction of the lap time at each point),
    // used to place every car on the map
    var Tt = [0], n = you.v.length, ds = tr.len / n;
    for (var i = 0; i < n; i++) Tt.push(Tt[i] + 2 * ds / (you.v[i] + you.v[(i + 1) % n]));
    var prof = []; for (i = 0; i <= n; i += 4) prof.push(+(Tt[i] / Tt[n]).toFixed(4));
    var field = [{ name: d.name, team: 'Your team', car: inst.carId, col: inst.color || d.col, base: you.time, f: f, you: true, drv: d.id }];
    aiField(cls, 5).forEach(function (o) {
      var of = T.factors(o.d);
      field.push({ name: o.name, team: o.team, car: o.car, col: o.col, base: o.pace * (1 + sens.lat * (1 - of.lat) + sens.brk * (1 - of.brk)), f: of });
    });
    // qualifying: one flying lap each
    field.forEach(function (e) { e.q = e.base * (1 + gauss() * e.f.sd) + (Math.random() < e.f.err * 0.5 ? rnd(0.5, 2.5) : 0); });
    var order = field.slice().sort(function (a, b) { return a.q - b.q; });
    order.forEach(function (e, gi) { e.grid = gi + 1; e.cum = []; e.laps = []; e.best = 1e9; e.err = 0; });
    var prev = order.map(function (e) { return 0; });
    for (var lap = 0; lap < cls.laps; lap++) {
      var raw = order.map(function (e, k) {
        var lt = e.base * (1 + gauss() * e.f.sd);
        if (Math.random() < e.f.err) { lt += rnd(0.8, 3.5); e.err++; }
        if (lap === 0) lt += 3.0 + (e.grid - 1) * 0.25;   // standing start, from the grid
        return { e: e, lt: lt, t: prev[k] + lt };
      });
      // resolve in running order: the car ahead is settled first
      for (var k = 1; k < raw.length; k++) {
        var ahead = raw[k - 1], me = raw[k];
        if (me.t < ahead.t + 0.3) {
          var adv = ahead.lt - me.lt, chance = clamp(0.15 + adv * 0.5, 0.05, 0.9);
          if (Math.random() >= chance) me.t = ahead.t + 0.3 + Math.random() * 0.25;
        }
      }
      raw.forEach(function (x) { var lt = x.t - (x.e.cum.length ? x.e.cum[x.e.cum.length - 1] : 0); x.e.cum.push(+x.t.toFixed(3)); x.e.laps.push(+lt.toFixed(3)); if (lap > 0 && lt < x.e.best) x.e.best = lt; });
      raw.sort(function (a, b) { return a.t - b.t; });
      order = raw.map(function (x) { return x.e; });
      prev = order.map(function (e) { return e.cum[e.cum.length - 1]; });
    }
    var end = Math.max.apply(null, order.map(function (e) { return e.cum[e.cum.length - 1]; }));
    G.pay(cost);
    var r = { id: 'r' + (s.nid++), cls: cls.id, car: uid, drv: d.id, start: Date.now(), end: end + 2, laps: cls.laps, prof: prof, cost: cost,
      field: order.map(function (e) { return { name: e.name, team: e.team, car: e.car, col: e.col, you: !!e.you, grid: e.grid, cum: e.cum, best: +e.best.toFixed(3), err: e.err }; }),
      ideal: ideal, base: you.time };
    s.races.push(r); G.save();
    return { race: r };
  };

  // where a car is at race time t: lap, fraction of the track, finished?
  T.where = function (r, e, t) {
    var L = 0; while (L < e.cum.length && e.cum[L] <= t) L++;
    if (L >= e.cum.length) return { lap: e.cum.length, frac: 0, done: true, t: e.cum[e.cum.length - 1] };
    var t0 = L ? e.cum[L - 1] : 0, x = (t - t0) / (e.cum[L] - t0), p = r.prof;
    var lo = 0, hi = p.length - 1;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (p[m] <= x) lo = m; else hi = m; }
    var fr = (lo + (p[hi] > p[lo] ? (x - p[lo]) / (p[hi] - p[lo]) : 0)) / (p.length - 1);
    return { lap: L, frac: fr, done: false };
  };
  // the running order at race time t, with gaps to the leader
  T.standings = function (r, t) {
    var rows = r.field.map(function (e) { var w = T.where(r, e, t); return { e: e, w: w, prog: w.done ? 1e6 - w.t : w.lap + w.frac }; });
    rows.sort(function (a, b) { return b.prog - a.prog; });
    return rows;
  };

  // ---------------------------------------------------------------- results
  // Finish the races that are over: prize money, the driver learns, the
  // class win opens parts and cars. Returns messages to show.
  T.tick = function () {
    var s = G.state && G.state.team; if (!s || !s.races) return [];
    var msgs = [];
    s.races.forEach(function (r) {
      if (r.done || T.clock(r) < r.end) return;
      r.done = true;
      var cls = T.classById(r.cls), you = r.field.filter(function (e) { return e.you; })[0], pos = r.field.indexOf(you) + 1, prize = cls.prize[pos - 1] || 0;
      var d = T.driver(r.drv), car = G.state.cars.filter(function (c) { return c.uid === r.car; })[0];
      if (prize) G.earn(prize);
      var grew = d ? learn(d, pos, r) : null;
      var line = (d ? d.name : 'Your driver') + ' finished P' + pos + ' in the ' + cls.name + (car ? ' (' + DR.CARS[car.carId].name + ')' : '') + (prize ? ': +' + DR.money(prize) : '');
      var unl = [];
      if (pos === 1 && !s.wins[cls.id]) unl = classUnlocks(cls);
      if (pos === 1) s.wins[cls.id] = (s.wins[cls.id] || 0) + 1;
      s.done++;
      if (s.done - s.boardAt >= T.REFRESH_EVERY) { s.board = makeBoard(); s.boardAt = s.done; }
      s.history.unshift({ cls: cls.id, pos: pos, prize: prize, drv: d ? d.name : '?', car: car ? car.carId : you.car, at: Date.now(), best: you.best, grew: grew, unl: unl });
      s.history = s.history.slice(0, 20);
      msgs.push({ text: line, race: r, pos: pos, prize: prize, grew: grew, unl: unl });
    });
    // keep just the last few finished races around to look at
    var fin = s.races.filter(function (r) { return r.done; });
    if (fin.length > 3) s.races = s.races.filter(function (r) { return !r.done || fin.indexOf(r) >= fin.length - 3; });
    if (msgs.length) G.save();
    return msgs;
  };
  // skills grow toward the driver's potential; racing at the front teaches more
  function learn(d, pos, r) {
    var ageK = d.age < 25 ? 1.3 : d.age < 31 ? 1 : d.age < 37 ? 0.6 : 0.3, posK = pos <= 3 ? 1.25 : 1;
    var you = r.field.filter(function (e) { return e.you; })[0], out = {};
    ['brk', 'cor', 'con'].forEach(function (k) {
      var g = Math.max(0, d.pot - d[k]) * rnd(0.025, 0.055) * ageK * posK;
      if (k === 'con' && you.err) g *= 0.6;   // mistakes slow it
      var before = Math.floor(d[k]);
      d[k] = Math.min(d.pot, d[k] + g);
      if (Math.floor(d[k]) > before) out[k] = Math.floor(d[k]) - before;
    });
    d.races++; if (pos === 1) d.wins++; if (pos <= 3) d.podiums++;
    d.wage = T.wage(d);
    return out;
  }
  function classUnlocks(cls) {
    var c = G.careerState(), out = [];
    if (cls.perf) {
      var any = false;
      DR.PART_GROUPS.forEach(function (g) { var u = g.unlock || g.id; if ((c.perf[u] || 1) < cls.perf) { c.perf[u] = cls.perf; any = true; } });
      if (any) out.push('All performance parts up to ' + DR.LEVEL_NAMES[cls.perf] + ' level');
    }
    var cars = [];
    (cls.stages || []).forEach(function (si) { DR.carsAtStage(si).forEach(function (id) { if (!c.cars[id]) { c.cars[id] = 1; cars.push(DR.CARS[id].name); } }); });
    if (cars.length) out.push(cars.length + ' new car' + (cars.length > 1 ? 's' : '') + ' at the dealer: ' + cars.slice(0, 3).join(', ') + (cars.length > 3 ? ' and ' + (cars.length - 3) + ' more' : ''));
    return out;
  }

  // ---------------------------------------------------------------- the rest of the game
  // A car at the track can't be raced, worked on, shown or sold.
  function awayScreen(inst) {
    var r = T.raceFor(inst.uid);
    return h('div', { class: 'screen' }, UI.top('AT THE TRACK', function () { UI.show(UI.Garage); }),
      h('div', { class: 'content' }, h('div', { class: 'awaybox' },
        h('div', { class: 'pix acc' }, DR.CARS[inst.carId].name + ' is away'),
        h('div', {}, T.awayText(inst.uid)),
        h('div', { class: 'dim gsmall' }, 'Cars at the circuit can\'t be raced, worked on, shown or sold until they\'re back.'),
        h('div', { class: 'row' },
          UI.btn('Watch the race', function () { UI.circuitTab = 'races'; UI.watchRace = r && r.id; UI.show(UI.RaceMenu, 'circuit'); }, 'primary'),
          G.state.cars.length > 1 ? UI.btn('Switch car', function () { UI.show(UI.Cars); }) : null,
          UI.btn('Garage', function () { UI.show(UI.Garage); })))));
  }
  var h = UI.h;
  ['Shop', 'Parts', 'Tune', 'Dyno', 'Body', 'Paint', 'Shows'].forEach(function (name) {
    var orig = UI[name];
    if (!orig) return;
    UI[name] = function (arg) {
      var inst = G.car();
      if (inst && T.carAway(inst.uid)) return awayScreen(inst);
      return orig.apply(this, arguments);
    };
  });
  // the garage says where the car is
  var origGarage = UI.Garage;
  UI.Garage = function () {
    var el = origGarage.apply(this, arguments), inst = G.car();
    if (inst && T.carAway(inst.uid)) {
      var r = T.raceFor(inst.uid);
      el.appendChild(h('div', { class: 'awaybanner', onclick: function () { UI.circuitTab = 'races'; UI.watchRace = r.id; UI.show(UI.RaceMenu, 'circuit'); } },
        h('span', { class: 'acc' }, 'AT THE TRACK'), h('span', {}, T.awayText(inst.uid)), h('span', { class: 'dim' }, 'Tap to watch ▸')));
    }
    return el;
  };
  var origStart = DR.Race.start;
  DR.Race.start = function (cfg) {
    var inst = cfg.inst || G.car();
    if (!cfg.inst && inst && T.carAway(inst.uid)) { UI.toast(T.awayText(inst.uid)); return; }
    return origStart.apply(this, arguments);
  };
  var origInstall = G.installPart;
  G.installPart = function (inst, uid) {
    if (inst && T.carAway(inst.uid)) return { ok: false, msg: 'The car is at the track' };
    return origInstall.apply(this, arguments);
  };
  ['removePart', 'stripCar', 'sellCar'].forEach(function (fn) {
    var orig = G[fn]; if (!orig) return;
    G[fn] = function (a) {
      var uid = typeof a === 'object' ? a && a.uid : a;
      if (T.carAway(uid)) { UI.toast('That car is at the track'); return fn === 'stripCar' ? 0 : false; }
      return orig.apply(this, arguments);
    };
  });

  // finished races report in wherever you are
  function report() {
    if (!G.state || !G.state.team) return;
    var msgs = T.tick();
    msgs.forEach(function (m, i) {
      setTimeout(function () { UI.toast('🏁 ' + m.text + (m.unl.length ? ' • UNLOCKED: ' + m.unl.join(' • ') : '')); }, i * 2600);
    });
    if (msgs.length && UI.cur && UI.cur.fn === UI.RaceMenu) UI.refresh();
  }
  T.report = report;
  setInterval(report, 3000);
  var origShow = UI.show;
  UI.show = function () { var out = origShow.apply(this, arguments); setTimeout(report, 0); return out; };
})();
