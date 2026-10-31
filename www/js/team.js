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
  T.MAX = 3;                // circuit drivers
  T.DMAX = 2;               // drag drivers
  T.ROLES = { drag: 'Drag tuner', circuit: 'Circuit tuner' };   // one staff tuner each
  T.SPEED = 4;              // race clock vs real time
  T.TRACK = 'pixel';        // the reference track: classes go by the ideal lap here
  // where the team races: the purpose-built circuit and three night street
  // circuits, Underground style
  T.VENUES = [
    { id: 'pixel', blurb: 'The purpose-built circuit: kerbs, gravel traps, a long main straight. Daytime racing.' },
    { id: 'airfield', blurb: 'Night race at the old airfield: flat out down the runway, a cone hairpin onto the taxiway, round the hangars. Power counts.' },
    { id: 'highway', blurb: 'Route 99 after dark: flat-out freeway sweepers, a tight off-ramp and two city blocks. The fastest, longest lap.' },
    { id: 'canyon', blurb: 'The back road into the hills: narrow, twisty, guard rails and switchbacks. Light, nimble cars shine.' },
    { id: 'downtown', blurb: 'Closed-off city streets at night: square corners between the towers, neon, a long avenue by the docks. Braking and traction win here.' }
  ];
  T.venue = function (id) { return T.VENUES.filter(function (v) { return v.id === id; })[0] || T.VENUES[0]; };
  // laps scaled so a race is about as long on every track
  T.lapsAt = function (cls, tid) { return Math.max(2, Math.round(cls.laps * DR.TRACKS.pixel.len / DR.TRACKS[tid].len)); };
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
    // the drag side and the staff tuners (saves from before them start empty)
    s.ddrivers = s.ddrivers || []; s.tuners = s.tuners || [];
    if (!s.board) { s.board = makeBoard(); s.boardAt = s.done || 0; }
    if (!s.dboard) s.dboard = makeDragBoard();
    if (!s.tboard) s.tboard = makeTunerBoard();
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
  T.avg = function (d) { return d.kind === 'drag' ? (d.rt + d.lau + d.con) / 3 : d.kind === 'tuner' ? (d.eng + d.chs + d.dat) / 3 : (d.brk + d.cor + d.con) / 3; };
  T.hireFee = function (d) { var a = T.avg(d); return Math.round((a * a * 2 + d.pot * 12) / 50) * 50; };
  T.wage = function (d) { var a = T.avg(d); return Math.round((40 + a * a * 0.06) * (d.kind === 'tuner' ? 1.6 : 1) / 10) * 10; };
  T.stars = function (d) { return Math.round(d.pot / 20 * 2) / 2; };   // potential, 0.5-5
  function makeBoard() {
    var qs = [rnd(18, 32), rnd(22, 38), rnd(28, 44), rnd(40, 58), rnd(45, 65), Math.random() < 0.35 ? rnd(72, 88) : rnd(58, 75)];
    return qs.map(function (q) { return makeDriver(q); });
  }
  T.scout = function () {
    if (!G.canAfford(T.SCOUT_COST)) return false;
    G.pay(T.SCOUT_COST);
    var s = st(); s.board = makeBoard(); s.dboard = makeDragBoard(); s.tboard = makeTunerBoard(); s.boardAt = s.done; G.save();
    return true;
  };
  // ---------------------------------------------------------------- drag drivers
  // Drag racing asks different things of a driver (and the two crowds don't
  // mix: a drag driver doesn't run circuits):
  //   Reaction:    how quickly they leave on the green (and how rarely early)
  //   Launch:      leaving the line, feeding the throttle, pedalling tire shake
  //   Consistency: how little they vary pass to pass (the bracket racer's gift)
  function potFor(top, age) { return Math.round(clamp(top + (age < 24 ? rnd(14, 34) : age < 30 ? rnd(8, 24) : age < 36 ? rnd(3, 12) : rnd(0, 5)), top, 99)); }
  function makeDragDriver(q) {
    var age = Math.round(clamp(rnd(19, 32) + (q - 40) * 0.25 + rnd(-3, 8), 18, 52));
    var d = { kind: 'drag', name: pick(FIRST) + ' ' + pick(LAST), age: age, rt: sk(q), lau: sk(q), con: sk(q), col: pick(COLORS), races: 0, wins: 0, podiums: 0 };
    d.pot = potFor(Math.max(d.rt, d.lau, d.con), age);
    d.fee = T.hireFee(d); d.wage = T.wage(d);
    return d;
  }
  function makeDragBoard() { return [rnd(18, 34), rnd(28, 46), rnd(40, 60), Math.random() < 0.35 ? rnd(70, 88) : rnd(55, 72)].map(makeDragDriver); }
  // ---------------------------------------------------------------- tuners
  // A staff tuner, for the drag team or the circuit team:
  //   Engine:  calibration on the dyno (how close to the limits they dare go,
  //            and how few pulls they need)
  //   Chassis: launch, converter, gearing and suspension at the track or test day
  //   Data:    reading timeslips and logs (fewer passes, not fooled by a bad one)
  function makeTuner(q, role) {
    var age = Math.round(clamp(rnd(24, 40) + (q - 40) * 0.3 + rnd(-2, 8), 21, 64));
    var d = { kind: 'tuner', role: role, name: pick(FIRST) + ' ' + pick(LAST), age: age, eng: sk(q), chs: sk(q), dat: sk(q), col: pick(COLORS), jobs: 0 };
    d.pot = potFor(Math.max(d.eng, d.chs, d.dat), age - 6);
    d.fee = T.hireFee(d); d.wage = T.wage(d);
    return d;
  }
  function makeTunerBoard() { return [makeTuner(rnd(22, 40), 'drag'), makeTuner(rnd(40, 62), 'drag'), makeTuner(rnd(22, 40), 'circuit'), makeTuner(Math.random() < 0.35 ? rnd(68, 86) : rnd(45, 66), Math.random() < 0.5 ? 'drag' : 'circuit')]; }
  T.dragDrivers = function () { return st().ddrivers; };
  T.tuner = function (role) { return st().tuners.filter(function (x) { return x.role === role; })[0] || null; };
  // hire from a board: 'circuit' (drivers), 'drag' or 'tuner'
  T.hireFrom = function (which, i) {
    var s = st(), board = which === 'drag' ? s.dboard : which === 'tuner' ? s.tboard : s.board, d = board[i];
    if (!d) return 'Gone';
    if (which === 'circuit') return T.hire(i);
    if (which === 'drag' && s.ddrivers.length >= T.DMAX) return 'Your drag team is full (' + T.DMAX + ' drivers). Release one first.';
    if (which === 'tuner' && T.tuner(d.role)) return 'You already have a ' + T.ROLES[d.role].toLowerCase() + '. Release them first.';
    if (!G.canAfford(d.fee)) return 'Signing ' + d.name + ' costs ' + DR.money(d.fee);
    G.pay(d.fee);
    d.id = (which === 'drag' ? 'g' : 't') + (s.nid++); d.hired = Date.now();
    (which === 'drag' ? s.ddrivers : s.tuners).push(d); board.splice(i, 1); G.save();
    return '';
  };
  T.releaseStaff = function (id) {
    var s = st();
    s.ddrivers = s.ddrivers.filter(function (d) { return d.id !== id; });
    s.tuners = s.tuners.filter(function (d) { return d.id !== id; });
    G.save();
    return '';
  };
  T.staff = function (id) { var s = st(); return s.ddrivers.concat(s.tuners).filter(function (d) { return d.id === id; })[0] || null; };
  // a drag driver learns from every pass, more from the ones that matter
  T.learnDrag = function (d, won) {
    var ageK = d.age < 25 ? 1.3 : d.age < 31 ? 1 : d.age < 37 ? 0.6 : 0.3, out = {};
    ['rt', 'lau', 'con'].forEach(function (k) {
      var before = Math.floor(d[k]);
      d[k] = Math.min(d.pot, d[k] + Math.max(0, d.pot - d[k]) * rnd(0.012, 0.03) * ageK * (won ? 1.25 : 1));
      if (Math.floor(d[k]) > before) out[k] = Math.floor(d[k]) - before;
    });
    d.races++; if (won) d.wins++;
    d.wage = T.wage(d); G.save();
    return out;
  };
  // a tuner gets better with every job
  T.learnTuner = function (d) {
    var ageK = d.age < 30 ? 1.2 : d.age < 45 ? 1 : 0.5;
    ['eng', 'chs', 'dat'].forEach(function (k) { d[k] = Math.min(d.pot, d[k] + Math.max(0, d.pot - d[k]) * rnd(0.02, 0.04) * ageK); });
    d.jobs = (d.jobs || 0) + 1; d.wage = T.wage(d); G.save();
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
  // (a team race has two of your cars and drivers in it)
  function carsOf(r) { return r.cars || [r.car]; }
  function drvsOf(r) { return r.drvs || [r.drv]; }
  T.carsOf = carsOf; T.drvsOf = drvsOf;
  T.raceFor = function (uid) { return T.active().filter(function (r) { return carsOf(r).indexOf(uid) >= 0; })[0] || null; };
  T.carAway = function (uid) { return !!T.raceFor(uid); };
  T.driverBusy = function (id) { return T.active().some(function (r) { return drvsOf(r).indexOf(id) >= 0; }); };
  // the race clock runs at 4x real time, or 4x faster again with the time
  // multiplier on (switchable any time: the clock carries on from where it is)
  T.rate = function (r) { return T.SPEED * (r.ff ? 4 : 1); };
  T.clock = function (r) {
    var now = Date.now();
    return Math.max(0, r.anc ? r.anc.c + (now - r.anc.t) / 1000 * T.rate(r) : (now - r.start) / 1000 * T.SPEED);
  };
  T.left = function (r) { return Math.max(0, (r.end - T.clock(r)) / T.rate(r)); };
  T.setFast = function (r, on) {
    var c = T.clock(r);
    r.ff = !!on; r.anc = { c: c, t: Date.now() };
    st().fast = !!on; G.save();
  };
  T.awayText = function (uid) {
    var r = T.raceFor(uid); if (!r) return '';
    var i = carsOf(r).indexOf(uid), d = T.driver(drvsOf(r)[Math.max(0, i)]), c = T.classById(r.cls);
    return (d ? d.name : 'Your driver') + ' is racing it in the ' + c.name + ' at ' + DR.TRACKS[r.track || T.TRACK].name + ': back in ' + fmtLeft(T.left(r)) + '.';
  };
  function fmtLeft(s) { s = Math.ceil(s); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  T.fmtLeft = fmtLeft;

  // ---------------------------------------------------------------- pace
  // The car's ideal lap and how much a driver's shortfall costs it
  // (sensitivity to cornering and braking), cached per build.
  var paceCache = {};
  function sig(inst) { return JSON.stringify([inst.carId, inst.engine, inst.parts, inst.tune, inst.ctune]); }
  // The circuit setup a tuner worked out (inst.ctune) goes on for circuit
  // racing only, over the car's own (drag) tune.
  T.circuitCar = function (inst) {
    if (!inst || !inst.ctune || !inst.ctune.set) return inst;
    var c = {}; for (var k in inst) c[k] = inst[k];
    c.tune = {}; for (k in inst.tune) c.tune[k] = inst.tune[k];
    for (k in inst.ctune.set) c.tune[k] = inst.ctune.set[k];
    return c;
  };
  T.idealLap = function (inst, tid) {
    tid = tid || T.TRACK; inst = T.circuitCar(inst);
    var k = tid + sig(inst);
    if (!paceCache[k]) paceCache[k] = { ideal: DR.lapSim(inst, DR.TRACKS[tid]).time };
    return paceCache[k].ideal;
  };
  function sensitivity(inst, ideal, tid) {
    inst = T.circuitCar(inst);
    var tr = DR.TRACKS[tid], S = DR.buildSpec(inst);
    return { lat: (DR.lapSim(inst, tr, S, { lat: 0.95 }).time / ideal - 1) / 0.05, brk: (DR.lapSim(inst, tr, S, { brk: 0.9 }).time / ideal - 1) / 0.1 };
  }
  // ev: a career race (no class floor: the field is set by the stage)
  T.eligible = function (inst, cls, ev) {
    if (DR.CARS[inst.carId].cat === 'Pro') return 'Dragsters and Pro Mods don\'t turn: they can\'t race a circuit';
    if (ev) return '';
    if (cls.floor && T.idealLap(inst) < cls.floor) return 'Too quick for this class: its ideal lap is ' + fmtLap(T.idealLap(inst)) + ', the class allows ' + fmtLap(cls.floor) + ' or slower';
    return '';
  };
  function fmtLap(t) { var m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); }
  T.fmtLap = fmtLap;

  // lap time lost to cold tires on lap 1, and per lap of wear (x lap no.),
  // for a car of about 220 hp per tonne
  var TIRE_COLD = { Street: 0.006, Track: 0.012, 'Race Slick': 0.02, 'Drag Radial': 0.01, Slick: 0.02 };
  var TIRE_DEG = { Street: 0.0005, Track: 0.0008, 'Race Slick': 0.0011, 'Drag Radial': 0.0014, Slick: 0.0022 };

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
  // ev: a career race sets its own pace (seconds off the class's) and skill
  // band, and its named rival leads the field
  function aiField(cls, n, per, ev) {
    var used = {}, out = [], base = (cls.floor || cls.pace) + (ev ? ev.pace : 0), team, ai = ev ? ev.ai : cls.ai;
    for (var i = 0; i < n; i++) {
      if (i % (per || 1) === 0) { do team = pick(TEAMS); while (used[team]); used[team] = 1; }
      var q = rnd(ai[0], ai[1]), d = makeDriver(q);
      var pace = base + rnd(0.2, cls.spread);
      if (ev && ev.rival && i === 0) { d = makeDriver(ai[1]); d.name = ev.rival.name; d.col = ev.rival.col; team = ev.rival.team; pace = base + 0.1; }
      out.push({ name: d.name, team: team, car: ev && ev.rival && i === 0 && ev.rival.car ? ev.rival.car : carFor(pace), col: d.col, pace: pace, d: d });
    }
    return out;
  }

  // ---------------------------------------------------------------- race
  // Every lap of every car, worked out up front. Overtaking: a quicker car
  // that catches the one ahead gets by if its pace advantage that lap is
  // big enough (luck helps); otherwise it's stuck behind for the lap.
  // opts: { field: a fixed AI field (a championship's), series: round no. }
  // opts.mate: { uid, drv } a second car and driver: a team race, your two
  // against two AI teams of two, team points deciding it
  T.enter = function (clsId, uid, drvId, tid, opts) {
    opts = opts || {};
    tid = DR.TRACKS[tid] ? tid : T.TRACK;
    var cls = T.classById(clsId), s = st(), mine = [{ uid: uid, drv: drvId }].concat(opts.mate ? [opts.mate] : []);
    if (!cls) return { msg: 'Pick a class' };
    if (mine.length > 1 && (mine[0].uid === mine[1].uid || mine[0].drv === mine[1].drv)) return { msg: 'A team race needs two cars and two drivers' };
    var cost = 0;
    for (var m = 0; m < mine.length; m++) {
      var mi = mine[m];
      mi.inst = G.state.cars.filter(function (c) { return c.uid === mi.uid; })[0]; mi.d = T.driver(mi.drv);
      if (!mi.inst || !mi.d) return { msg: 'Pick ' + (mine.length > 1 ? 'two cars and two drivers' : 'a car and a driver') };
      if (mi.inst.damage) return { msg: 'Repair the ' + DR.CARS[mi.inst.carId].name + ' first' };
      if (T.carAway(mi.uid)) return { msg: 'The ' + DR.CARS[mi.inst.carId].name + ' is already at the track' };
      if (T.driverBusy(mi.drv)) return { msg: mi.d.name + ' is already racing' };
      var why = T.eligible(mi.inst, cls, opts.ev); if (why) return { msg: why };
      cost += (opts.ev ? opts.ev.fee : cls.fee) + mi.d.wage;
    }
    if (!G.canAfford(cost)) return { msg: 'Entry and wages: ' + DR.money(cost) };
    var inst = mine[0].inst, d = mine[0].d;
    var tr = DR.TRACKS[tid], S = DR.buildSpec(T.circuitCar(inst)), ideal = T.idealLap(inst, tid), sens = sensitivity(inst, ideal, tid), laps = opts.ev ? opts.ev.laps : T.lapsAt(cls, tid);
    var stock0 = DR.TRACKS[T.TRACK].stock || {}, stockT = tr.stock || stock0;
    var f = T.factors(d), you = DR.lapSim(T.circuitCar(inst), tr, S, { lat: f.lat, brk: f.brk });
    // the shape of a lap in time (fraction of the lap time at each point),
    // used to place every car on the map
    var Tt = [0], n = you.v.length, ds = tr.len / n;
    for (var i = 0; i < n; i++) Tt.push(Tt[i] + 2 * ds / (you.v[i] + you.v[(i + 1) % n]));
    var prof = []; for (i = 0; i <= n; i += 4) prof.push(+(Tt[i] / Tt[n]).toFixed(4));
    // the sound of your car round the lap: speed, gear, pedal, boost
    var snd = { v: [], g: [], s: [], b: [] };
    for (i = 0; i < n; i += 4) { snd.v.push(+you.v[i].toFixed(1)); snd.g.push(you.gear[i]); snd.s.push(you.state[i]); snd.b.push(+you.boost[i].toFixed(1)); }
    // heat: a build making far more power than its radiator was sized for
    // runs hot as the laps go by, and the ECU pulls timing (up to ~5%)
    // tires: cold for the first laps, then they go off a little every lap,
    // faster the softer the compound and the more power through them
    function entry(mi, S, lap) {
      var kg = S.m / 1000, powK = clamp((S.peakHp + S.nosHp) / kg / 220, 0.6, 2.2);
      return { name: mi.d.name, team: 'Your team', car: mi.inst.carId, col: mi.inst.color || mi.d.col, base: lap.time, f: T.factors(mi.d), you: true, drv: mi.d.id, uid: mi.uid,
        heat: Math.max(0, Math.min(1.5, (S.peakHp + S.nosHp) / S.coolHp - 1)), cold: TIRE_COLD[S.tire.kind] || 0.012, deg: (TIRE_DEG[S.tire.kind] || 0.0008) * powK };
    }
    var field = [entry(mine[0], S, you)];
    mine.slice(1).forEach(function (mi) {
      var ci = T.circuitCar(mi.inst), S2 = DR.buildSpec(ci), f2 = T.factors(mi.d);
      mi.S = S2; field.push(entry(mi, S2, DR.lapSim(ci, tr, S2, { lat: f2.lat, brk: f2.brk })));
    });
    (opts.field || (mine.length > 1 ? aiField(cls, 4, 2) : aiField(cls, 5, 1, opts.ev))).forEach(function (o) {
      var of = T.factors(o.d);
      // their pace here: the same car's stock lap here vs on the reference track
      var k2 = stockT[o.car] && stock0[o.car] ? stockT[o.car] / stock0[o.car] : tr.len / DR.TRACKS[T.TRACK].len;
      field.push({ name: o.name, team: o.team, car: o.car, col: o.col, base: o.pace * k2 * (1 + sens.lat * (1 - of.lat) + sens.brk * (1 - of.brk)), f: of, cold: TIRE_COLD.Track, deg: TIRE_DEG.Track });
    });
    // qualifying: one flying lap each
    field.forEach(function (e) { e.q = e.base * (1 + gauss() * e.f.sd) + (Math.random() < e.f.err * 0.5 ? rnd(0.5, 2.5) : 0); });
    var order = field.slice().sort(function (a, b) { return a.q - b.q; });
    order.forEach(function (e, gi) { e.grid = gi + 1; e.cum = []; e.laps = []; e.best = 1e9; e.err = 0; });
    var prev = order.map(function (e) { return 0; });
    for (var lap = 0; lap < laps; lap++) {
      var raw = order.map(function (e, k) {
        var lt = e.base * (1 + gauss() * e.f.sd);
        if (Math.random() < e.f.err) { lt += rnd(0.8, 3.5); e.err++; }
        if (lap === 0) lt += 3.0 + (e.grid - 1) * 0.25;   // standing start, from the grid
        // cold tires on the opening laps, worn ones later
        if (lap < 2) lt += e.base * e.cold * (lap === 0 ? 1 : 0.35);
        var tl = e.base * e.deg * lap; lt += tl; e.tires = (e.tires || 0) + tl;
        if (e.heat && lap >= 2) { var hl = e.base * Math.min(0.05, e.heat * 0.012 * (lap - 1)); lt += hl; e.hot = (e.hot || 0) + hl; }
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
    var r = { id: 'r' + (s.nid++), cls: cls.id, track: tid, car: uid, drv: d.id, start: Date.now(), end: end + 2, laps: laps, prof: prof, cost: cost, series: opts.series, ev: opts.ev ? opts.ev.id : undefined,
      cars: mine.length > 1 ? mine.map(function (x) { return x.uid; }) : undefined, drvs: mine.length > 1 ? mine.map(function (x) { return x.drv; }) : undefined, teams: mine.length > 1 || undefined,
      field: order.map(function (e) { return { name: e.name, team: e.team, car: e.car, col: e.col, you: !!e.you, drv: e.drv, uid: e.uid, grid: e.grid, cum: e.cum, best: +e.best.toFixed(3), err: e.err, hot: e.hot ? +e.hot.toFixed(1) : 0, tires: e.tires ? +e.tires.toFixed(1) : 0 }; }),
      ideal: ideal, base: you.time, snd: snd };
    s.races.push(r);
    // the race distance comes off your car's tires
    mine.forEach(function (mi) { G.addTireKm(mi.inst, mi.S || S, laps * tr.len / 1000); });
    if (s.fast) T.setFast(r, true); else G.save();
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
      var cls = T.classById(r.cls), you = r.field.filter(function (e) { return e.you; })[0], pos = r.field.indexOf(you) + 1, prize = T.prize(cls, pos, r.track);
      var d = T.driver(r.drv), car = G.state.cars.filter(function (c) { return c.uid === r.car; })[0], grew, line;
      if (r.teams) {
        // a team race: the team's points decide it, each driver learns from their own finish
        var tt = T.teamTable(r), tp = tt.findIndex(function (x) { return x.you; }) + 1, mine = tt[tp - 1];
        pos = tp; prize = T.teamPrize(cls, tp, r.track); grew = {};
        r.field.forEach(function (e, i) { if (!e.you) return; var dd = T.driver(e.drv); if (dd) { var g = learn(dd, i + 1, e); Object.keys(g).forEach(function (k) { grew[k] = (grew[k] || 0) + g[k]; }); } });
        if (prize) G.earn(prize);
        line = 'Team race, ' + cls.name + ' at ' + DR.TRACKS[r.track || T.TRACK].name + ': your team ' + ['won', 'came 2nd', 'came 3rd'][tp - 1] + ' on ' + mine.pts + ' points (' + mine.rows.map(function (e) { return e.name.split(' ')[0] + ' P' + (r.field.indexOf(e) + 1); }).join(', ') + ')' + (prize ? ': +' + DR.money(prize) : '');
        d = { name: mine.rows.map(function (e) { return e.name.split(' ')[0]; }).join(' & ') };
      } else {
        // a career race: its purse and unlocks if the goal was met
        var cr = r.ev && G.cupFinish ? G.cupFinish(r.ev, pos) : null;
        if (cr) prize = cr.cash;
        if (prize) G.earn(prize);
        grew = d ? learn(d, pos, you) : null;
        line = (d ? d.name : 'Your driver') + ' finished P' + pos + ' in ' + (cr ? cr.name : 'the ' + cls.name) + ' at ' + DR.TRACKS[r.track || T.TRACK].name + (car ? ' (' + DR.CARS[car.carId].name + ')' : '') + (prize ? ': +' + DR.money(prize) : '') + (cr && cr.note ? ' • ' + cr.note : '');
      }
      // open class races pay prize money; the career's circuit races open parts and cars
      var unl = cr ? cr.unlocks : [];
      if (pos === 1 && !r.ev) s.wins[cls.id] = (s.wins[cls.id] || 0) + 1;
      s.done++;
      T.rollInvite();
      if (s.done - s.boardAt >= T.REFRESH_EVERY) { s.board = makeBoard(); s.dboard = makeDragBoard(); s.tboard = makeTunerBoard(); s.boardAt = s.done; }
      s.history.unshift({ cls: cls.id, track: r.track || T.TRACK, pos: pos, team: r.teams || undefined, ev: r.ev, note: cr ? cr.note : undefined, prize: prize, drv: d ? d.name : '?', car: car ? car.carId : you.car, at: Date.now(), best: you.best, grew: grew, unl: unl });
      s.history = s.history.slice(0, 20);
      var sm = r.series != null ? seriesRound(r) : null;
      msgs.push({ text: line + (sm ? ' • ' + sm : ''), race: r, pos: pos, prize: prize, grew: grew, unl: unl });
    });
    // keep just the last few finished races around to look at
    var fin = s.races.filter(function (r) { return r.done; });
    if (fin.length > 3) s.races = s.races.filter(function (r) { return !r.done || fin.indexOf(r) >= fin.length - 3; });
    if (msgs.length) G.save();
    return msgs;
  };
  // night street circuits pay a bonus on every prize
  T.NIGHT_BONUS = 1.25;
  T.isNight = function (tid) { return !!(DR.TRACKS[tid] && DR.TRACKS[tid].theme); };
  T.prize = function (cls, pos, tid) { var p = cls.prize[pos - 1] || 0; return T.isNight(tid) ? Math.round(p * T.NIGHT_BONUS / 50) * 50 : p; };

  // ---------------------------------------------------------------- invitations
  // Team races (2v2v2) aren't on the board every day: now and then a team
  // invites yours, at your stage's class, and the invitation stands for a
  // few races. Never with fewer than two circuit drivers; likelier with
  // three. Rolled each time one of your races finishes.
  T.INVITE_P = [0, 0, 0.18, 0.32];   // by circuit drivers on the team
  T.INVITE_FOR = 4;                  // finished races it stands for
  T.invite = function () { var s = st(); if (s.invite && s.done >= s.invite.exp) s.invite = null; return s.invite || null; };
  T.rollInvite = function (force) {
    var s = st(), n = Math.min(3, s.drivers.length);
    if (T.invite()) return null;
    if (!force && Math.random() >= T.INVITE_P[n]) return null;
    var c = G.careerState(), cls = T.classById(T.stageClass(c.stage)), tid = pick(['pixel'].concat(T.SERIES));
    s.invite = { cls: cls.id, track: tid, team: pick(TEAMS), exp: s.done + T.INVITE_FOR };
    if (DR.Phone) DR.Phone.send('street', 'invite', s.invite);
    return s.invite;
  };
  T.STAGE_CLASS = ['D', 'D', 'C', 'B', 'A', 'O'];
  T.stageClass = function (si) { return T.STAGE_CLASS[Math.min(si, T.STAGE_CLASS.length - 1)]; };

  // ---------------------------------------------------------------- team races
  // Three teams of two, points 25-18-15-12-10-8 for every car; the most
  // points wins (ties: the better best finish). The team's prize, as a share
  // of the class's win prize: two entries' worth of the solo purse for the
  // winners, so a team race pays like two solo races run well.
  T.TEAM_PRIZE = [1.6, 0.8, 0.3];
  T.teamPrize = function (cls, tpos, tid) { var p = Math.round(cls.prize[0] * (T.TEAM_PRIZE[tpos - 1] || 0) / 50) * 50; return T.isNight(tid) ? Math.round(p * T.NIGHT_BONUS / 50) * 50 : p; };
  // [{ team, pts, you, rows: [field entries] }], best first. order: the
  // field in running order (default: the finish)
  T.teamTable = function (r, order) {
    order = order || r.field;
    var by = {}, out = [];
    order.forEach(function (e, i) {
      var k = e.you ? 'you' : e.team;
      if (!by[k]) out.push(by[k] = { team: e.you ? 'Your team' : e.team, you: !!e.you, pts: 0, best: i, rows: [] });
      by[k].pts += T.POINTS[i] || 0; by[k].rows.push(e);
    });
    return out.sort(function (a, b) { return b.pts - a.pts || a.best - b.best; });
  };

  // ---------------------------------------------------------------- Night Series
  // A championship across the four street circuits: one car and driver for
  // the season against the same five AI rivals, points every round, a title
  // prize at the end. Each round is entered when you're ready (the car can
  // be worked on between rounds, but must stay in its class).
  T.SERIES = ['airfield', 'highway', 'canyon', 'downtown'];
  T.POINTS = [25, 18, 15, 12, 10, 8];
  T.TITLE = [3, 1.5, 0.75];    // title prize: x the class's win prize
  T.series = function () { return st().series || null; };
  T.startSeries = function (clsId, uid, drvId) {
    var s = st(), cls = T.classById(clsId);
    if (s.series && !s.series.done) return { msg: 'A Night Series is already running' };
    var field = aiField(cls, 5);
    s.series = { cls: clsId, car: uid, drv: drvId, round: 0, field: field, pts: { you: 0 }, res: [], done: false };
    field.forEach(function (o) { s.series.pts[o.name] = 0; });
    var res = T.nextRound();
    if (!res.race) { s.series = null; G.save(); }
    return res;
  };
  T.nextRound = function () {
    var s = st(), se = s.series;
    if (!se || se.done) return { msg: 'No season running' };
    if (T.active().some(function (r) { return r.series != null; })) return { msg: 'This round is still running' };
    return T.enter(se.cls, se.car, se.drv, T.SERIES[se.round], { field: se.field, series: se.round });
  };
  T.quitSeries = function () { var s = st(); if (s.series && !T.active().some(function (r) { return r.series != null; })) { s.series = null; G.save(); return ''; } return 'Wait for this round to finish'; };
  // the season table: [{ name, team, pts, you }], leader first
  T.seriesTable = function () {
    var se = T.series(); if (!se) return [];
    var d = T.driver(se.drv), rows = [{ name: d ? d.name : 'Your driver', team: 'Your team', pts: se.pts.you, you: true, col: '#ffcc00' }];
    se.field.forEach(function (o) { rows.push({ name: o.name, team: o.team, pts: se.pts[o.name] || 0, col: o.col, car: o.car }); });
    return rows.sort(function (a, b) { return b.pts - a.pts || (a.you ? -1 : 1); });
  };
  function seriesRound(r) {
    var se = st().series; if (!se || se.done || r.series !== se.round) return '';
    r.field.forEach(function (e, i) { var k = e.you ? 'you' : e.name; se.pts[k] = (se.pts[k] || 0) + (T.POINTS[i] || 0); });
    se.res.push(r.field.map(function (e) { return e.you ? 'you' : e.name; }));
    se.round++;
    if (se.round < T.SERIES.length) return 'Night Series: round ' + se.round + ' of ' + T.SERIES.length + ' done';
    se.done = true;
    var table = T.seriesTable(), pos = table.findIndex(function (x) { return x.you; }) + 1, cls = T.classById(se.cls);
    var prize = T.TITLE[pos - 1] ? Math.round(cls.prize[0] * T.TITLE[pos - 1] / 50) * 50 : 0;
    if (prize) G.earn(prize);
    se.pos = pos; se.prize = prize;
    var s = st(); s.titles = s.titles || {}; if (pos === 1) s.titles[se.cls] = (s.titles[se.cls] || 0) + 1;
    return 'NIGHT SERIES FINAL: P' + pos + ' in the championship' + (prize ? ', title prize +' + DR.money(prize) : '');
  }

  // skills grow toward the driver's potential; racing at the front teaches more
  // you: the driver's entry in the race
  function learn(d, pos, you) {
    var ageK = d.age < 25 ? 1.3 : d.age < 31 ? 1 : d.age < 37 ? 0.6 : 0.3, posK = pos <= 3 ? 1.25 : 1;
    var out = {};
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
      (el.querySelector('.gstatuses') || el).appendChild(h('div', { class: 'awaybanner', onclick: function () { UI.circuitTab = 'races'; UI.watchRace = r.id; UI.show(UI.RaceMenu, 'circuit'); } },
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
    if (msgs.some(function (m) { return m.prize; }) && DR.Audio && DR.Audio.cash) { DR.Audio.init(); DR.Audio.cash(); }
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
