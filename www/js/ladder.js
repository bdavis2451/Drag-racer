// ===========================================================================
// LADDER — the drag career as a ladder (the owner's design, Nov 2026).
//  * Each class: five sections of four events (Heads-Up, Bracket, No-Prep,
//    Street), then the King event. Finish 3 of a section's 4 to open the
//    next.
//  * Heads-Up, Bracket and No-Prep are 16-car eliminations that must be won
//    outright: Heads-Up qualifies (2 paired passes) into a ladder, quickest
//    against slowest; Bracket runs 2 time trials, then dial-ins; No-Prep
//    draws chips for every round and shows no times. Street is a list night
//    of callouts: lose at most one.
//  * The fields are the class's regulars (roster.js), their cars stepping up
//    section by section. The rest of the field's races are worked out from
//    their times, lights and (brackets) dial-ins.
//  * Every event runs at its slot every week; one entry a week. Payouts by
//    round reached (real bracket racing); standings points, IRP style: 20
//    for racing, +10 a round won, +1 for the win.
//  * The King event: the class's five ladder rivals one at a time (a win
//    stays won) on King nights, then the King for their car.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game;
  function C() { return G.careerState(); }

  DR.EVENT_TYPES.headsup = { name: 'Heads-Up', dist: function () { return DR.QUARTER; }, theme: 'strip', grip: 1 };
  DR.EVENT_TYPES.noprep = { name: 'No-Prep', dist: function () { return DR.EIGHTH; }, theme: 'strip', grip: 0.92 };
  var TH = DR.THEMES = [
    { id: 'headsup', code: 'H', name: 'Heads-Up', fmt: 'elim', slot: 'sat', glyph: 'HU', blurb: 'Heads-up on a prepped strip. Two qualifying passes set a 16-car ladder, quickest against slowest. Win every round.' },
    { id: 'bracket', code: 'B', name: 'Bracket', fmt: 'elim', slot: 'sun', glyph: 'BKT', blurb: 'Two time trials, then 16-car eliminations on dial-ins: the slower car leaves first, and running quicker than your dial loses. Win every round.' },
    { id: 'noprep', code: 'N', name: 'No-Prep', fmt: 'elim', slot: 'satn', glyph: 'NP', blurb: 'An unprepped strip at night, 1/8 mile from a dig. Chips pick the pairs every round, and nobody shows times. Win every round.' },
    { id: 'street', code: 'S', name: 'Street', fmt: 'card', slot: 'fri', glyph: 'ST', blurb: 'A list night on the street: one race against each callout, slowest first. Lose no more than one.' }
  ];
  DR.themeById = function (id) { for (var i = 0; i < TH.length; i++) if (TH[i].id === id) return TH[i]; return null; };
  DR.SECTIONS = 5;      // sections per class
  DR.SEC_NEED = 3;      // events to finish in a section to open the next
  DR.FIELD = 16;        // cars in an elimination (you and 15 regulars)
  DR.CARD_N = [4, 5, 5, 6, 7];   // callouts on a list night, by section
  DR.QUALS = 2;         // Heads-Up qualifying passes / Bracket time trials
  // money: the winner's purse by section (x the class's base), the share of
  // it each round pays (lost in round 1, 2 = quarterfinal, semi, runner-up,
  // winner) and the entry
  DR.PURSE_K = [0.7, 0.8, 0.9, 1.0, 1.1];
  DR.THEME_K = { headsup: 1, bracket: 0.9, noprep: 1.1, street: 1 };
  DR.ROUND_PAY = [0, 0.1, 0.25, 0.5, 1];
  DR.ENTRY_K = 0.08;
  // standings points (IRP's E.T. series): to race, a round (or race) won,
  // the event won
  DR.PTS = { race: 20, round: 10, win: 1 };

  function eighth(si, s, th) {
    if (th === 'street' || th === 'noprep') return true;
    if (th === 'headsup') return (si === 3 && s % 2 === 1) || (si === 4 && s !== 4) || si === 5;
    if (th === 'bracket') return (si === 4 && s === 3) || (si === 5 && s % 2 === 1);
    return false;
  }

  // ---------------------------------------------------------------- the regulars
  // A regular as an opponent: their car built for this section (or their
  // King-ladder build: s === 'rung').
  DR.regOpp = function (si, r, s) {
    var R = DR.ROSTER[si][r], b = s === 'rung' ? R.rung : R.b[s];
    return { name: R.name, carId: R.carId, engine: b.engine, parts: b.parts, tune: b.tune, skill: R.skill, color: R.color, reg: [si, r], sec: s };
  };
  function hash(str) { var x = 2166136261; for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(a, rnd) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // ---------------------------------------------------------------- the classes
  // The class race rules (career.js) become the restricted events: the
  // first in section 2 (a Heads-Up), the second in section 4 (a Bracket).
  DR.STAGES.forEach(function (st, si) {
    var old = st.events, rules = (st.side || []).filter(function (ev) { return ev.type === 'class'; }).map(function (ev) { return ev.cls; });
    st.oldEvents = old;
    st.restrict = rules;
    // unlocks: the old race days' two per section, given to the first and
    // second events you finish in it (so 3 of 4 always gets them)
    st.packs = [];
    for (var s = 0; s < DR.SECTIONS; s++) st.packs.push([(old[2 * s] || {}).unlocks || [], (old[2 * s + 1] || {}).unlocks || []]);
    st.events = [];
    for (s = 0; s < DR.SECTIONS; s++) TH.forEach(function (th, k) {
      var ev = { id: si + '.E' + s + th.code, type: th.id, stage: si, sec: s, idx: s * 4 + k, fmt: th.fmt, needWins: 0, stars: 0, unlocks: [], opps: [], ladder: true };
      ev.dist = eighth(si, s, th.id) ? DR.EIGHTH : DR.QUARTER;
      if (s === 1 && th.id === 'headsup' && rules[0]) ev.cls = rules[0];
      if (s === 3 && th.id === 'bracket' && rules[1]) ev.cls = rules[1];
      ev.cash = Math.round(st.base * DR.PURSE_K[s] * DR.THEME_K[th.id] / 10) * 10;
      ev.entry = th.fmt === 'elim' ? Math.max(20, Math.round(ev.cash * DR.ENTRY_K / 10) * 10) : 0;
      st.events.push(ev);
    });
    // side events: the car show goals stay; class races became restricted
    // events and the bracket side races became the Bracket events
    st.side = (st.side || []).filter(function (ev) { return ev.type === 'show'; });
  });
  // what a ladder event is called, where and when it runs
  var DAYNAME = { headsup: 'Heads-Up Shootout', bracket: 'Bracket Race', noprep: 'No-Prep Night', street: 'Street List Night' };
  var dayName0 = DR.raceDayName;
  DR.raceDayName = function (ev) { if (ev && ev.ladder) return (ev.cls ? DR.CLASSES[ev.cls].name + ' ' : '') + DAYNAME[ev.type]; return dayName0.apply(this, arguments); };
  var cond0 = DR.evCond;
  DR.evCond = function (ev) {
    if (ev && ev.ladder) return { surface: ev.type === 'street' ? 'street' : ev.type === 'noprep' ? 'noprep' : 'prep', night: ev.type === 'street' || ev.type === 'noprep' };
    if (ev && (ev.type === 'callout' || (ev.type === 'boss' && !ev.king))) return { surface: 'prep', night: true };
    return cond0.apply(this, arguments);
  };

  // A regular's car set up to a class rule, where a few changes do it (the
  // rule is checked after: a car it can't fix, like a V8 for Four-Banger,
  // stays out): the factory engine without added boost or nitrous, no power
  // adders, street tires, a 275 radial with one power adder (no wheelie bar
  // for X275), a small block with one adder.
  var RADIAL = { st_195: 1, st_225: 1, st_255: 1, st_305: 1, dr_225: 1, dr_245: 1, dr_275: 1, dr_275s: 1 };
  function legalize(o, cls) {
    var x = JSON.parse(JSON.stringify(o)), p = x.parts, car = DR.CARS[x.carId];
    function oneAdder() { if (p.fi && p.fi !== 'none' && p.nitrous) delete p.nitrous; }
    if (cls === 'stock') { x.engine = car.engine; Object.keys(p).forEach(function (cat) { var op = DR.getOption(cat, G.oppInst(x), p[cat]); if (!op || op.id !== p[cat]) delete p[cat]; }); delete p.fi; delete p.nitrous; delete x.tune.boost; }
    else if (cls === 'na') { delete p.fi; delete p.nitrous; delete x.tune.boost; }
    else if (cls === 'street') { if (!/^st_/.test(p.rtires || 'st_')) p.rtires = 'st_305'; }
    else if (cls === 'radial' || cls === 'x275') { if (p.rtires && !RADIAL[p.rtires]) p.rtires = 'dr_275'; oneAdder(); if (cls === 'x275') delete p.wheeliebar; }
    else if (cls === 'small') oneAdder();
    return x;
  }
  // the field: 15 of the class's regulars (the same 15 every week, picked
  // per event), with their car for the section; a restricted event takes the
  // regulars (any class) whose car makes the rule, nearest the section's pace
  function field(ev) {
    if (ev._field) return ev._field;
    var si = ev.stage, R = DR.ROSTER[si], rnd = rng(hash(ev.id));
    var out;
    if (!ev.cls) {
      var idx = shuffle(R.map(function (x, i) { return i; }), rnd).slice(0, DR.FIELD - 1);
      out = idx.map(function (r) { return DR.regOpp(si, r, ev.sec); });
    } else {
      // the class's regulars bring their car set up to the rule where it can
      // be (off with the nitrous or the turbo, onto a 275 radial or a street
      // tire, no wheelie bar); a rule about the car itself (four cylinders,
      // weight, import, its own engine) takes legal cars from any class,
      // nearest the class's pace
      var K = DR.CLASSES[ev.cls], seen = {}; out = [];
      var legalOk = function (o) { var S = DR.buildSpec(G.oppInst(o)); return !S.noRun && !S.noRunFit && K.ok(S); };
      shuffle(R.map(function (x, i) { return i; }), rnd).forEach(function (r) {
        if (out.length >= DR.FIELD - 1) return;
        var o = legalize(DR.regOpp(si, r, ev.sec), ev.cls);
        if (o && legalOk(o)) { seen[si + ':' + r] = 1; out.push(o); }
      });
      if (out.length < DR.FIELD - 1) {
        var ets = R.map(function (x) { return x.et[ev.sec]; }), lo = Math.min.apply(null, ets), hi = Math.max.apply(null, ets), cands = [];
        DR.ROSTER.forEach(function (cls, ci) { cls.forEach(function (x, r) { for (var s = 0; s < 5; s++) cands.push({ ci: ci, r: r, s: s, et: x.et[s] }); }); });
        var mid = (lo + hi) / 2;
        cands.sort(function (a, b) { return Math.abs(a.et - mid) - Math.abs(b.et - mid); });
        for (var i = 0; i < cands.length && out.length < DR.FIELD - 1; i++) {
          var c = cands[i], key = c.ci + ':' + c.r; if (seen[key]) continue;
          var o2 = legalize(DR.regOpp(c.ci, c.r, c.s), ev.cls);
          if (!o2 || !legalOk(o2)) continue;
          seen[key] = 1; out.push(o2);
        }
      }
    }
    ev._field = out; ev.opps = out;
    return out;
  }
  DR.eventField = field;
  // a list night: callouts from the street regulars first, slowest first
  function card(ev) {
    if (ev._card) return ev._card;
    var si = ev.stage, R = DR.ROSTER[si], n = DR.CARD_N[ev.sec], rnd = rng(hash(ev.id));
    var street = R.map(function (x, i) { return i; }).filter(function (i) { return R[i].street; }), rest = R.map(function (x, i) { return i; }).filter(function (i) { return !R[i].street; });
    var pick = shuffle(street, rnd).concat(shuffle(rest, rnd)).slice(0, n);
    var out = pick.map(function (r) { return DR.regOpp(si, r, ev.sec); }).sort(function (a, b) { return DR.ROSTER[si][b.reg[1]].et[ev.sec] - DR.ROSTER[si][a.reg[1]].et[ev.sec]; });
    ev._card = out; ev.opps = out;
    return out;
  }
  DR.eventCard = card;
  // ev.opps for the code that looks at an event's opponents (the street
  // spots' pool, the event card): filled in for the elimination fields at
  // load (no simulation needed), lazily for restricted ones
  DR.STAGES.forEach(function (st) { st.events.forEach(function (ev) { if (ev.fmt === 'card') card(ev); else if (!ev.cls) field(ev); }); });

  // ---------------------------------------------------------------- the King event
  // The five ladder rivals: the class's five quickest regulars in their
  // King-ladder builds, #5 to #1 (old saves keep their climb: same ids).
  DR.STAGES.forEach(function (st, si) {
    st.ladder = [4, 3, 2, 1, 0].map(function (r, k) {
      var o = DR.regOpp(si, r, 'rung'); o.skill = Math.min(0.98, o.skill + 0.05);
      var ev = { type: 'callout', opps: [o], cash: Math.round(st.boss.cash * 0.25 / 10) * 10, unlocks: [], needWins: 0, stars: 0, rung: k, side: true, stage: si, idx: 'L' + k, id: si + '.L' + k };
      return ev;
    });
    st._sorted = true;
    st.all = st.events.concat(st.side, st.ladder, [st.boss]);
  });

  // ---------------------------------------------------------------- unlocks and cars
  // The dealer's car schedule (career.js) was keyed by the old race days:
  // a race day's cars now come with its unlock packet (si.s.p).
  var OLD_SCHED = DR.CAR_SCHEDULE;
  DR.CAR_SCHEDULE = {};
  Object.keys(DR.CARS).forEach(function (id) { DR.CAR_UNLOCK[id] = ''; DR.CAR_STAGE[id] = 0; });
  Object.keys(OLD_SCHED).forEach(function (k) {
    var p = k.split('.'), si = +p[0], key;
    if (p[1] === 'boss') key = k;
    else { var i = +p[1]; key = si + '.' + Math.floor(i / 2) + '.' + (i % 2); }
    DR.CAR_SCHEDULE[key] = OLD_SCHED[k];
    OLD_SCHED[k].forEach(function (id) { DR.CAR_UNLOCK[id] = key; DR.CAR_STAGE[id] = si; });
  });
  DR.STAGES.forEach(function (st, si) {
    st.packs.forEach(function (pk, s) { pk.forEach(function (list, p) { (DR.CAR_SCHEDULE[si + '.' + s + '.' + p] || []).forEach(function (id) { list.push('car:' + id); }); }); });
    st.boss.unlocks = st.boss.unlocks.filter(function (u) { return u.indexOf('car:') !== 0; }).concat((DR.CAR_SCHEDULE[si + '.boss'] || []).map(function (id) { return 'car:' + id; }));
  });

  // ---------------------------------------------------------------- progress
  G.secWon = function (si, s) { var c = C(); return DR.STAGES[si].events.filter(function (ev) { return ev.sec === s && c.won[ev.id]; }).length; };
  G.secDone = function (si, s) { return G.secWon(si, s) >= DR.SEC_NEED; };
  G.secOpen = function (si, s) { return s === 0 || G.secDone(si, s - 1); };
  // the section you're on in a class (5: all done, the King event's open)
  G.curSec = function (si) { for (var s = 0; s < DR.SECTIONS; s++) if (!G.secDone(si, s)) return s; return DR.SECTIONS; };
  G.stageWins = function (si) { var c = C(); return DR.STAGES[si].events.filter(function (ev) { return c.won[ev.id]; }).length; };
  // this week's window for an event's slot (null with the calendar off)
  function windowFor(ev) { if (DR.SCHED_OFF || !G.slotWindow) return null; return G.slotWindow(DR.evSlot(ev)); }
  G.enteredThisWeek = function (ev) { var c = C(), w = windowFor(ev); return !!(w && c.entered && c.entered[ev.id] === w.start); };

  var lock0 = G.eventLock;
  // opt.anyWeek: ignore this week's entry (a later week on the calendar)
  G.eventLock = function (ev, opt) {
    var c = C();
    if (ev && ev.ladder) {
      if (ev.stage > c.stage) return 'Beat the King of ' + DR.STAGES[ev.stage - 1].name + ' first';
      if (!G.secOpen(ev.stage, ev.sec)) return 'Finish ' + DR.SEC_NEED + ' events in section ' + ev.sec + ' first';
      var run = c.run;
      if (G.enteredThisWeek(ev) && !(opt && opt.anyWeek) && !(run && run.id === ev.id)) return 'You raced it this week: it runs again next ' + DR.slotName(DR.evSlot(ev)).replace(/ .*/, '');
      if (!(run && run.id === ev.id) && !(opt && opt.anyWeek) && DR.Ladder.lateLock) { var late = DR.Ladder.lateLock(ev); if (late) return late; }
      return '';
    }
    if (ev && ev.type === 'callout') return G.calloutLock(ev);
    if (ev && ev.type === 'boss' && ev.stage != null && !ev.king) {
      if (ev.stage > c.stage) return 'Beat the King of ' + DR.STAGES[ev.stage - 1].name + ' first';
      if (G.curSec(ev.stage) < DR.SECTIONS) return 'Finish the five sections first';
      var kl = lock0.apply(this, arguments); if (kl) return kl;
      return kingNightOver(ev.stage);
    }
    return lock0.apply(this, arguments);
  };
  // the King-ladder rivals: once the sections are done, in order
  G.calloutLock = function (ev) {
    var si = ev.stage, pos = G.ladderPos(si);
    if (si > C().stage) return 'Beat the King of ' + DR.STAGES[si - 1].name + ' first';
    if (G.curSec(si) < DR.SECTIONS) return 'Finish the five sections first';
    if (ev.rung < pos) return '';
    if (ev.rung > pos) return 'Beat #' + (5 - pos) + ' first';
    return kingNightOver(si);
  };
  // King nights: race your way up the ladder (and the King), and the night
  // ends at your first loss; the next King night you go again from there
  function kingNightOver(si) {
    var c = C(), w = !DR.SCHED_OFF && G.slotWindow ? G.slotWindow('king') : null;
    return w && c.kingNight && c.kingNight[si] === w.start ? 'You lost on this King night: go again on the next one' : '';
  }
  G.kingNightLost = function (si) {
    var c = C(), w = !DR.SCHED_OFF && G.slotWindow ? G.slotWindow('king') : null;
    if (!w) return;
    c.kingNight = c.kingNight || {}; c.kingNight[si] = w.start; G.save();
  };
  var vis0 = G.eventVisible;
  G.eventVisible = function (ev) {
    if (ev && ev.ladder) return ev.stage <= C().stage && G.secOpen(ev.stage, ev.sec);
    return vis0.apply(this, arguments);
  };

  // which unlock packet the next event finished in a section gets
  function nextPack(ev) {
    var c = C(), st = DR.STAGES[ev.stage];
    c.packs = c.packs || {}; var given = c.packs[ev.stage] = c.packs[ev.stage] || [];
    var n = given[ev.sec] || 0;
    return n < 2 ? st.packs[ev.sec][n] : [];
  }
  G.nextUnlocks = function (ev) { return ev && ev.ladder && !C().won[ev.id] ? nextPack(ev) : (ev ? ev.unlocks : []); };
  // Finishing an event: the class's unlocks for it (first time), the
  // contract, the sponsor's win bonus (career.js does those).
  G.finishLadderEvent = function (ev) {
    var c = C(), first = !c.won[ev.id], before = G.curSec(ev.stage);
    ev.unlocks = first ? nextPack(ev).slice() : [];
    var cash0 = ev.cash; ev.cash = 0;
    var out = G.winEvent(ev);
    ev.cash = cash0; ev.unlocks = [];
    if (first) { c.packs[ev.stage][ev.sec] = (c.packs[ev.stage][ev.sec] || 0) + 1; }
    var after = G.curSec(ev.stage);
    if (after > before) {
      out.banner = after >= DR.SECTIONS ? 'All five sections done: the King event is open!' : 'Section ' + (after + 1) + ' is open!';
      out.lines.push(out.banner.toUpperCase());
    }
    G.save();
    return out;
  };

  // ---------------------------------------------------------------- the field's races
  // A regular's pass at this event: their estimated time (as their car is
  // set up, in the day's conditions), the light and a little spread.
  function estOf(o, ev, cond) { return G.estimate(G.oppInst(o), ev.dist, (DR.EVENT_TYPES[ev.type].grip || 1) / ((DR.Race && DR.Race.SURF_BASE[cond.surface]) || 1), cond).et; }
  function rtOf(o, rnd) { return 0.02 + (1 - o.skill) * 0.28 + rnd() * 0.06; }
  function passOf(o, ev, cond, rnd) { var e = estOf(o, ev, cond); return e * (1 + (1 - o.skill) * 0.02 * rnd() + 0.003 * (rnd() - 0.5)); }
  function condOf(ev) { var c = DR.evCond(ev); return DR.conditions(c.surface, c.night); }
  // a race between two regulars: true when a wins
  function simRace(a, b, ev, cond, rnd) {
    var redA = rnd() < (1 - a.skill) * 0.04, redB = rnd() < (1 - b.skill) * 0.04;
    if (redA !== redB) return redB;
    var ra = rtOf(a, rnd), rb = rtOf(b, rnd), pa = passOf(a, ev, cond, rnd), pb = passOf(b, ev, cond, rnd);
    if (ev.type !== 'bracket') return ra + pa < rb + pb;
    // brackets: each dials a hair over what the car runs; quicker than the
    // dial is a breakout (both: the smaller one wins)
    var da = estOf(a, ev, cond) + 0.02, db = estOf(b, ev, cond) + 0.02, boA = pa < da, boB = pb < db;
    if (boA && !boB) return false; if (boB && !boA) return true;
    if (boA && boB) return da - pa < db - pb;
    return ra + pa - da < rb + pb - db;
  }

  // ---------------------------------------------------------------- a run
  // c.run: the event you're in today. phase: 'qual' (Heads-Up qualifying,
  // Bracket time trials), 'elim', 'card'.
  // entries: 'me' or the field index; the ladder pairs come in order (the
  // winners of pairs 0 and 1 meet next, and so on).
  var LADDER16 = [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11];
  DR.Ladder = {};
  DR.Ladder.run = function () { var r = C().run; return r && G.now && r.until && G.now() > r.until ? null : r; };
  DR.Ladder.runFor = function (ev) { var r = DR.Ladder.run(); return r && r.id === ev.id ? r : null; };
  DR.Ladder.evById = function (id) { var p = id.split('.'), st = DR.STAGES[+p[0]]; return st && st.all.filter(function (x) { return x.id === id; })[0]; };
  // enter: pay the entry (an elimination), mark the week, set the field
  DR.Ladder.enter = function (ev) {
    var c = C(), why = G.eventLock(ev); if (why) return why;
    if (DR.Ladder.runFor(ev)) return '';
    var other = DR.Ladder.run(); if (other && other.id !== ev.id) return 'You\'re still in another event: finish it or leave it first';
    // track credit (from a day you broke before round 1) comes off the entry
    var credit = Math.min(c.credit || 0, ev.entry || 0), due = (ev.entry || 0) - credit;
    if (due && !G.canAfford(due)) return 'The entry is ' + DR.money(due);
    if (credit) c.credit -= credit;
    if (due) G.pay(due);
    var w = windowFor(ev);
    c.entered = c.entered || {}; if (w) c.entered[ev.id] = w.start;
    var run = { id: ev.id, until: w ? w.end : null, paid: ev.entry || 0, earned: 0, rounds: 0, log: [] };
    // the day by the clock (the window's day; the gates open at the slot's start)
    if (w) run.day0 = w.start - plan(ev).gates;
    // driven there: the engine arrives warm; towed: at the air temperature
    run.drove = !(DR.Legal && DR.Legal.haulFor && DR.Legal.haulFor(G.car()) !== 'drive');
    if (ev.fmt === 'card') { card(ev); run.phase = 'card'; run.i = 0; run.wins = 0; run.losses = 0; run.n = ev.opps.length; }
    else {
      field(ev);
      run.phase = ev.type === 'noprep' ? 'elim' : 'qual'; run.q = 0; run.myQ = [];
      if (run.phase === 'elim') drawRound(ev, run, ['me'].concat(ev.opps.map(function (o, i) { return i; })));
    }
    c.run = run; G.save();
    return '';
  };
  // a chip draw (No-Prep every round, Bracket pairs): random pairs
  function drawRound(ev, run, alive) {
    var rnd = Math.random, a = shuffle(alive.slice(), rnd), pairs = [];
    for (var i = 0; i < a.length; i += 2) pairs.push([a[i], a[i + 1]]);
    run.pairs = pairs; run.ladder = false;
  }
  // after qualifying: the ladder (Heads-Up) or the first draw (Bracket)
  function seed(ev, run) {
    var cond = condOf(ev), rnd = Math.random;
    var times = ev.opps.map(function (o, i) { return { e: i, t: Math.min(passOf(o, ev, cond, rnd), passOf(o, ev, cond, rnd)) }; });
    var mine = run.myQ.filter(function (x) { return x < 90; });
    times.push({ e: 'me', t: mine.length ? Math.min.apply(null, mine) : 99 });
    times.sort(function (a, b) { return a.t - b.t; });
    run.qual = times.map(function (x) { return [x.e, x.t]; });
    run.myPos = times.map(function (x) { return x.e; }).indexOf('me') + 1;
    if (ev.type === 'headsup') {
      var pairs = [];
      for (var i = 0; i < 16; i += 2) pairs.push([times[LADDER16[i] - 1].e, times[LADDER16[i + 1] - 1].e]);
      run.pairs = pairs; run.ladder = true;
    } else drawRound(ev, run, times.map(function (x) { return x.e; }));
    run.phase = 'elim';
  }
  // your opponent this round ('me' is in exactly one pair)
  function myPair(run) { for (var i = 0; i < run.pairs.length; i++) if (run.pairs[i][0] === 'me' || run.pairs[i][1] === 'me') return run.pairs[i]; return null; }
  DR.Ladder.opponent = function (ev, run) {
    if (run.phase === 'card') return ev.opps[run.i];
    if (run.phase === 'qual') return ev.opps[(run.q * 7 + 3) % ev.opps.length];   // whoever's paired with you
    var p = myPair(run); if (!p) return null;
    var o = p[0] === 'me' ? p[1] : p[0];
    return o == null ? null : ev.opps[o];
  };
  // the round after yours: the other pairs raced, the winners go on
  function advance(ev, run, iWon) {
    var cond = condOf(ev), rnd = Math.random, winners = [];
    run.pairs.forEach(function (p) {
      if (p[0] === 'me' || p[1] === 'me') { winners.push(iWon ? 'me' : (p[0] === 'me' ? p[1] : p[0])); return; }
      if (p[1] == null) { winners.push(p[0]); return; }
      winners.push(simRace(ev.opps[p[0]], ev.opps[p[1]], ev, cond, rnd) ? p[0] : p[1]);
    });
    run.history = (run.history || []).concat([run.pairs]);
    run.rounds++;
    if (winners.length === 1) { run.champ = winners[0]; return; }
    if (run.ladder) { var pairs = []; for (var i = 0; i < winners.length; i += 2) pairs.push([winners[i], winners[i + 1]]); run.pairs = pairs; }
    else drawRound(ev, run, winners);
  }
  // the rest of the day without you: the field's races to the end (for the
  // standings and the results page)
  function finishWithout(ev, run) {
    while (run.pairs && run.pairs.length > 0 && run.champ == null) advance(ev, run, false);
  }
  // what the next race is, for the race-day screen
  DR.Ladder.stepLabel = function (cfg) {
    var ev = cfg.ev, run = DR.Ladder.runFor(ev); if (!run) return '';
    if (run.phase === 'qual') return (ev.type === 'bracket' ? 'Time trial ' : 'Qualifying pass ') + (run.q + 1) + ' of ' + DR.QUALS + ': only your time counts';
    if (run.phase === 'card') return 'Callout ' + (run.i + 1) + ' of ' + run.n + (run.losses ? ': no more losses' : ': lose no more than one');
    return DR.Ladder.roundName(run) + (ev.type === 'headsup' && run.myPos ? ' • you qualified #' + run.myPos : '') + ': win and go on';
  };
  DR.Ladder.roundName = function (run) {
    var left = run.pairs ? run.pairs.length * 2 : 16;
    return left === 2 ? 'Final' : left === 4 ? 'Semifinal' : left === 8 ? 'Quarterfinal' : 'Round 1';
  };

  // ---------------------------------------------------------------- the race
  // The race config for the next race of the run.
  DR.Ladder.cfg = function (ev, run) {
    var T = DR.EVENT_TYPES[ev.type], c = DR.evCond(ev), o = DR.Ladder.opponent(ev, run);
    var cfg = { mode: 'career', ev: ev, lad: true, opp: o, dist: ev.dist, theme: T.theme, grip: T.grip, surface: c.surface, night: c.night,
      round: run.phase === 'elim' ? run.rounds : 0, reward: ev.cash };
    if (run.phase === 'qual') { cfg.qual = true; cfg.round = 0; }
    if (ev.type === 'noprep') cfg.noTimes = true;
    // only the first race of the day is the trip there (and the day your
    // driver and the sponsor's stipend are paid for); a trip paid at the
    // entry (gear.js) shows on the first slip
    if (run.started) cfg.trip = { money: [], news: [], total: 0 };
    else { cfg.ladFirst = true; if (run.trip) cfg.trip = run.trip; }
    return cfg;
  };
  DR.Ladder.go = function (ev) {
    var run = DR.Ladder.runFor(ev);
    if (!run) { var w = DR.Ladder.enter(ev); if (w) return DR.UI.toast(w); run = DR.Ladder.runFor(ev); }
    if (!run) return;
    var cfg = DR.Ladder.cfg(ev, run);
    DR.Race.raceDay(cfg);
  };
  // the purse by round reached: won rounds before the loss (0: out in
  // round 1, 1: the quarterfinal, 2: the semi, 3: runner-up), or the win
  function payFor(ev, myWins, won) { var k = won ? DR.ROUND_PAY[4] : DR.ROUND_PAY[Math.min(myWins, 3)]; return Math.round(ev.cash * k / 10) * 10; }
  // points to the field's regulars (and you) for a finished elimination
  function award(ev, run) {
    var c = C(), si = ev.stage; c.pts = c.pts || {}; var P = c.pts[si] = c.pts[si] || { me: 0, r: {} };
    var wins = {};
    (run.history || []).forEach(function (pairs, k) {
      pairs.forEach(function (p) { [p[0], p[1]].forEach(function (e) { if (e != null && wins[e] == null) wins[e] = 0; }); });
    });
    // a round won: in the next round's pairs (or the champion)
    (run.history || []).forEach(function (pairs, k) {
      var next = run.history[k + 1], inNext = {};
      if (next) next.forEach(function (p) { inNext[p[0]] = 1; inNext[p[1]] = 1; });
      else if (run.champ != null) inNext[run.champ] = 1;
      pairs.forEach(function (p) { [p[0], p[1]].forEach(function (e) { if (e != null && inNext[e]) wins[e]++; }); });
    });
    var given = { me: 0, regs: [] };
    Object.keys(wins).forEach(function (e) {
      var pts = DR.PTS.race + DR.PTS.round * wins[e] + (String(run.champ) === e ? DR.PTS.win : 0);
      if (e === 'me') { P.me += pts; run.pts = pts; given.me = pts; }
      else { var o = ev.opps[+e]; P.r[o.name] = (P.r[o.name] || 0) + pts; given.regs.push([o, pts]); }
    });
    // (the bracket points list: kings.js)
    if (G.onAward) G.onAward(ev, given);
  }
  // After a race of the run: what the slip says and what comes next.
  // res: { win, red, et } (et: your elapsed time, 99 if no finish).
  DR.Ladder.after = function (cfg, res) {
    var ev = cfg.ev, run = DR.Ladder.runFor(ev), out = { money: [], news: [], notes: [], unlocks: [], next: null, done: false };
    if (!run) return out;
    // the pass, for your tuner's read in the pit (gear.js)
    if (res.pass) { res.pass.phase = run.phase; res.pass.round = run.rounds || 0; res.pass.broke = !!res.broke; run.passes = (run.passes || []).concat([res.pass]); if (DR.Pit && DR.Pit.readPass) DR.Pit.readPass(ev, run, res.pass); }
    // a bye: a solo pass, and any pass down the track (no red light) wins
    if (!cfg.opp && run.phase === 'elim') res.win = !res.red && res.et < 90 && !res.broke;
    // an engine that let go on a strip or no-prep track: oil down, a cleanup
    // fine and standings points (NHRA's oildown policy; a track sends you
    // home for a second)
    if (res.blown && ev.type !== 'street') {
      var fine = Math.max(50, Math.round(DR.STAGES[ev.stage].base * 0.25 / 10) * 10), cc = C(); cc.pts = cc.pts || {};
      var PP = cc.pts[ev.stage] = cc.pts[ev.stage] || { me: 0, r: {} };
      PP.me = Math.max(0, PP.me - DR.OIL_PTS); run.oil = (run.oil || 0) + 1;
      out.money.push(['Oil-down cleanup', -fine]); out.notes.push(['bad', 'Oil down: a ' + DR.money(fine) + ' cleanup fine and ' + DR.OIL_PTS + ' standings points']);
    }
    // broken in qualifying: fix it in the pit before round 1 (spares, tools
    // and someone who can do the job) and race on; if it can't be fixed
    // here, no eliminations today and an alternate takes your spot. Track
    // credit for half the entry, or the 20 points you'd have had for
    // racing: your pick (IRP, National Trail)
    if (res.broke && run.phase === 'qual' && DR.Pit && DR.Pit.canFix(ev, run, G.car(), res.dmg)) {
      run.started = true; run.brokeQ = true;
      run.myQ.push(res.et < 90 ? res.et : 99); run.q++;
      if (run.q >= DR.QUALS) seed(ev, run);
      out.news.push('Broken in ' + (ev.type === 'bracket' ? 'time trials' : 'qualifying') + '. Fix it in the pit before ' + (run.phase === 'qual' ? 'the next session' : 'round 1 is called') + ', or no eliminations for you today.');
      out.next = { label: run.phase === 'qual' ? (ev.type === 'bracket' ? 'Time trial ' : 'Qualifying ') + (run.q + 1) : 'Round 1', go: function () { DR.Ladder.go(ev); } };
      G.save(); return out;
    }
    if (res.broke && run.phase === 'qual') {
      run.myQ.push(99); run.phase = 'broke';
      out.news.push('Broken in ' + (ev.type === 'bracket' ? 'time trials' : 'qualifying') + ': no eliminations for you today. An alternate takes your spot.');
      out.choice = DR.Ladder.brokeChoices(ev);
      out.done = true; G.save(); return out;
    }
    // the street: break, and the night's over (no fixing it on the street)
    if (res.broke && run.phase === 'card') {
      var o3 = ev.opps[run.i]; run.losses++; run.log.push([o3.name, false]); run.i = run.n;
      out.news.push('Broken: the night\'s over. Tow it home.');
      return cardEnd(ev, run, out);
    }
    run.started = true;
    if (run.phase === 'qual') {
      run.myQ.push(res.et); run.q++;
      out.news.push((ev.type === 'bracket' ? 'Time trial ' : 'Qualifying pass ') + run.q + ' of ' + DR.QUALS + (res.et < 90 ? ': ' + res.et.toFixed(3) : ': no time'));
      if (run.q >= DR.QUALS) {
        seed(ev, run);
        var o = DR.Ladder.opponent(ev, run);
        out.news.push(ev.type === 'headsup' ? 'Qualified #' + run.myPos + ' of 16. Round 1: ' + (o ? o.name : 'a bye') : 'Pairs drawn. Round 1: ' + (o ? o.name : 'a bye'));
      }
      out.next = { label: run.phase === 'qual' ? (ev.type === 'bracket' ? 'Time trial ' : 'Qualifying ') + (run.q + 1) : 'Round 1', go: function () { DR.Ladder.go(ev); } };
      G.save(); return out;
    }
    if (run.phase === 'card') {
      var o2 = ev.opps[run.i], stake = Math.round(ev.cash * 1.25 / run.n / 10) * 10;
      if (res.win) { run.wins++; run.earned += stake; run.stakes = (run.stakes || 0) + stake; out.money.push(['Callout won: ' + o2.name, stake]); }
      else run.losses++;
      run.log.push([o2.name, !!res.win]);
      run.i++;
      var need = Math.ceil(run.n * 0.75), done = run.i >= run.n || run.losses > run.n - need;
      if (!done) {
        out.news.push((res.win ? 'Won' : 'Lost') + ' callout ' + run.i + ' of ' + run.n + '. Next: ' + ev.opps[run.i].name + (run.losses ? ' (no more losses)' : ''));
        out.next = { label: 'Next callout: ' + ev.opps[run.i].name, go: function () { DR.Ladder.go(ev); } };
        G.save(); return out;
      }
      return cardEnd(ev, run, out);
    }
    // eliminations
    var rWas = DR.Ladder.roundName(run);
    if (res.win) {
      run.myWins = (run.myWins || 0) + 1;
      advance(ev, run, true);
      if (run.champ === 'me') return endRun(ev, run, true, out);
      var nx = DR.Ladder.opponent(ev, run);
      out.news.push(rWas + ' won! ' + DR.Ladder.roundName(run) + ': ' + (nx ? nx.name : 'a bye'));
      out.next = { label: DR.Ladder.roundName(run) + (nx ? ': ' + nx.name : ''), go: function () { DR.Ladder.go(ev); } };
      G.save(); return out;
    }
    advance(ev, run, false); finishWithout(ev, run);
    out.news.push('Out in the ' + rWas.toLowerCase() + '.');
    return endRun(ev, run, false, out);
  };
  // a list night's end: the points (you, and the callouts who beat you),
  // done if you lost no more than one in four
  function cardEnd(ev, run, out) {
    var c = C(), si = ev.stage, need = Math.ceil(run.n * 0.75); c.pts = c.pts || {}; var P = c.pts[si] = c.pts[si] || { me: 0, r: {} };
    var ok = run.wins >= need;
    run.pts = DR.PTS.race + DR.PTS.round * run.wins + (ok ? DR.PTS.win : 0); P.me += run.pts;
    run.log.forEach(function (x) { if (!x[1]) P.r[x[0]] = (P.r[x[0]] || 0) + DR.PTS.round; });
    return endRun(ev, run, ok, out);
  }
  function endRun(ev, run, won, out) {
    var c = C();
    if (ev.fmt === 'elim') {
      award(ev, run);
      var mw = run.myWins || 0, pay = payFor(ev, mw, won);
      if (pay) { out.money.push([won ? 'Winner' : ['', 'Quarterfinal', 'Semifinal', 'Runner-up'][mw], pay]); run.earned += pay; }
      out.purse = pay;
    } else out.purse = run.stakes || 0;   // (style pays on the purse: the round money, or the night's stakes)
    if (won) {
      var res = G.finishLadderEvent(ev);
      out.money = out.money.concat(res.money || []);
      out.unlocks = res.unlocks || [];
      if (res.banner) out.news.push(res.banner);
      if (res.contract) out.news.push(res.contract); else if (res.contractLine) out.notes.push([/^Counted/.test(res.contractLine) ? 'good' : 'dim', res.contractLine]);
      out.news.unshift(ev.fmt === 'card' ? 'LIST NIGHT DONE: ' + run.wins + ' of ' + run.n + '!' : 'YOU WON THE ' + (DR.raceDayName(ev)).toUpperCase() + '!');
    } else {
      out.news.push(ev.fmt === 'card' ? run.losses + ' losses: the night\'s over. It runs again next week.' : 'It runs again next week.');
    }
    if (run.pts) out.notes.push(['acc', 'Standings: +' + run.pts + ' points']);
    // contingency, associates' bonuses, the track awards (sponsors.js)
    if (G.ladderAwards) G.ladderAwards(ev, run, won, out);
    run.phase = 'done'; run.won = won;
    c.lastRun = run; c.run = null;
    out.done = true;
    G.save();
    return out;
  };
  DR.OIL_PTS = 10;
  // broken before round 1: the two ways out
  DR.Ladder.brokeChoices = function (ev) {
    var run = DR.Ladder.runFor(ev), credit = run ? Math.round((run.paid || 0) * 0.5 / 10) * 10 : 0;
    return [{ label: 'Take ' + DR.money(credit) + ' track credit', go: function () { DR.Ladder.brokeOut(ev, 'credit'); } },
      { label: 'Take the ' + DR.PTS.race + ' broke points', go: function () { DR.Ladder.brokeOut(ev, 'points'); } }];
  };
  // the field races on without you (an alternate in your place) for the
  // standings; you take the credit (off your next entry) or the points
  DR.Ladder.brokeOut = function (ev, pick) {
    var run = DR.Ladder.runFor(ev), c = C(); if (!run) return;
    var credit = Math.round((run.paid || 0) * 0.5 / 10) * 10;
    if (pick === 'credit') c.credit = (c.credit || 0) + credit;
    else { c.pts = c.pts || {}; var P = c.pts[ev.stage] = c.pts[ev.stage] || { me: 0, r: {} }; P.me += DR.PTS.race; if (G.onAward) G.onAward(ev, { me: DR.PTS.race, regs: [] }); }
    // the alternate: a regular of the class who wasn't in the field
    var R = DR.ROSTER[ev.stage], inF = {}; ev.opps.forEach(function (o) { if (o.reg && o.reg[0] === ev.stage) inF[o.reg[1]] = 1; });
    var alt = R.map(function (x, i) { return i; }).filter(function (i) { return !inF[i]; })[0];
    var opps = ev.opps.slice(); if (alt != null) opps.push(DR.regOpp(ev.stage, alt, ev.sec));
    var sim = { pairs: null, rounds: 0, history: [] }, cond = condOf(ev), rnd = Math.random, ent = opps.map(function (o, i) { return i; });
    var ev2 = Object.assign({}, ev, { opps: opps });
    if (ev.type === 'headsup') { var t = ent.map(function (i) { return [i, passOf(opps[i], ev, cond, rnd)]; }).sort(function (a, b) { return a[1] - b[1]; }); sim.pairs = []; for (var k = 0; k < 16 && k + 1 < 16; k += 2) sim.pairs.push([t[LADDER16[k] - 1] ? t[LADDER16[k] - 1][0] : null, t[LADDER16[k + 1] - 1] ? t[LADDER16[k + 1] - 1][0] : null]); sim.ladder = true; }
    else drawRound(ev2, sim, ent);
    finishWithout(ev2, sim); award(ev2, sim);
    run.phase = 'done'; run.won = false; run.pick = pick; c.lastRun = run; c.run = null; G.save();
  };
  // leave a run before the end (the day's over for you): points for what
  // you raced, no payout for the rounds not run
  DR.Ladder.withdraw = function (ev) {
    var run = DR.Ladder.runFor(ev); if (!run) return;
    if (run.phase === 'elim') { advance(ev, run, false); finishWithout(ev, run); award(ev, run); }
    run.phase = 'done'; C().lastRun = run; C().run = null; G.save();
  };

  // a line for the class: where you are on it
  G.ladderLine = function (si) {
    var cur = G.curSec(si), won = G.stageWins(si);
    return (cur >= DR.SECTIONS ? 'King event' : 'Section ' + (cur + 1) + ' of ' + DR.SECTIONS) + ' • ' + won + '/' + DR.STAGES[si].events.length + ' events';
  };

  // ---------------------------------------------------------------- standings
  // the top three when you beat the King: a points-fund bonus (x the
  // class's base)
  DR.STAND_BONUS = [3, 2, 1];
  var win0 = G.winEvent;
  G.winEvent = function (ev) {
    var first = ev && ev.type === 'boss' && !ev.king && !C().won[ev.id];
    var out = win0.apply(this, arguments);
    if (first && out && DR.ROSTER[ev.stage]) {
      var rows = DR.Ladder.standings(ev.stage), pos = rows.map(function (r) { return !!r.me; }).indexOf(true);
      if (pos >= 0 && pos < 3) {
        var b = DR.STAGES[ev.stage].base * DR.STAND_BONUS[pos];
        out.cash = (out.cash || 0) + b; out.money = (out.money || []).concat([['Standings #' + (pos + 1) + ' bonus', b]]);
        (out.lines = out.lines || []).push('Class standings #' + (pos + 1) + ': bonus ' + DR.money(b));
      }
    }
    return out;
  };
  DR.Ladder.standings = function (si) {
    var c = C(), P = (c.pts || {})[si] || { me: 0, r: {} }, rows = [{ name: 'You', pts: P.me, me: true }];
    DR.ROSTER[si].forEach(function (R) { rows.push({ name: R.name, carId: R.carId, pts: P.r[R.name] || 0 }); });
    rows.sort(function (a, b) { return b.pts - a.pts || (a.me ? -1 : b.me ? 1 : 0); });
    return rows;
  };

  // ---------------------------------------------------------------- where things unlock
  // The shop's and dealer's lock tags: the class and section whose events
  // open it ('C2, section 3'), or the class's King.
  G.unlockWhere = function (cat, lvl, id) {
    var grp = DR.groupOf(cat), d = DR.partDisc(cat, id);
    if (d === 'circuit' && G.cupUnlockWhere) return G.cupUnlockWhere(grp, lvl);
    function hit(list) { return list.some(function (u) { var p = u.split(':'); return p[0] === 'perf' && (p[1] === grp || p[1] === 'all') && +p[2] >= lvl; }); }
    for (var si = 0; si < DR.STAGES.length; si++) {
      var st = DR.STAGES[si];
      for (var s = 0; s < DR.SECTIONS; s++) if (hit(st.packs[s][0]) || hit(st.packs[s][1])) return 'C' + (si + 1) + ', section ' + (s + 1);
      if (hit(st.boss.unlocks)) return 'C' + (si + 1) + ' King';
    }
    return 'Locked';
  };
  G.carUnlockWhere = function (carId) {
    var k = DR.CAR_UNLOCK[carId]; if (!k) return '';
    var p = k.split('.');
    return p[1] === 'boss' ? 'C' + (+p[0] + 1) + ' King' : 'C' + (+p[0] + 1) + ', section ' + (+p[1] + 1);
  };

  // ---------------------------------------------------------------- saves
  // The unlocks the sections' finished events earned (the packets given),
  // given back; and saves from before the ladder: a class whose King fell is
  // done, and in the class you're on each race day you'd won counts as one
  // event finished, three to a section in order.
  var sync0 = G.syncUnlocks;
  G.syncUnlocks = function () {
    sync0.apply(this, arguments);
    var c = C();
    c.packs = c.packs || {};
    if (!c.ladderV) {
      c.ladderV = 1;
      DR.STAGES.forEach(function (st, si) {
        var given = c.packs[si] = c.packs[si] || [];
        if (c.won[st.boss.id] || si < c.stage) {
          st.events.forEach(function (ev) { c.won[ev.id] = true; });
          for (var s = 0; s < DR.SECTIONS; s++) given[s] = 2;
        } else if (si === c.stage) {
          var n = (st.oldEvents || []).filter(function (ev) { return c.won[ev.id]; }).length;
          for (s = 0; s < DR.SECTIONS && n > 0; s++) for (var k = 0; k < 3 && n > 0; k++) { c.won[st.events[s * 4 + k].id] = true; given[s] = Math.min(2, (given[s] || 0) + 1); n--; }
        }
      });
    }
    DR.STAGES.forEach(function (st, si) {
      var given = c.packs[si] || [];
      for (var s = 0; s < DR.SECTIONS; s++) for (var p = 0; p < Math.min(2, given[s] || 0); p++) st.packs[s][p].forEach(G.applyUnlock);
    });
  };

  // ---------------------------------------------------------------- the day, by the clock
  // A race day runs like a real one: the gates open, the sessions run at
  // their times (Heads-Up qualifying, Bracket time trials), then the rounds,
  // each called to the lanes at its time. Be in the lanes before the call
  // closes or you're out: your opponent gets a solo run (IRP, WWT Raceway,
  // National Trail rules; No Prep Kings' one 10-minute call). Hours of the
  // window's day.
  DR.DAYPLAN = {
    headsup: { gates: 8, qual: [10, 12.5], rounds: [15, 15.75, 16.5, 17.25], call: 0.25 },
    bracket: { gates: 8, qual: [10, 11], rounds: [12.5, 13.5, 14.25, 14.75], call: 0.25 },
    noprep: { gates: 18, qual: [], rounds: [19, 19 + 40 / 60, 20 + 20 / 60, 21], call: 10 / 60 },
    street: { gates: 22, first: 22.5, every: 25 / 60, call: 0.25 }
  };
  function plan(ev) { return DR.DAYPLAN[ev.type]; }
  // the next session of the run: { t: called, close: lanes close, label }
  DR.Ladder.nextCall = function (ev, run) {
    if (!run || run.day0 == null) return null;
    var P = plan(ev), t;
    if (run.phase === 'qual') t = P.qual[run.q];
    else if (run.phase === 'elim') t = P.rounds[run.myWins || 0];
    else if (run.phase === 'card') t = P.first + run.i * P.every;
    if (t == null) return null;
    return { t: run.day0 + t, close: run.day0 + t + P.call, label: run.phase === 'qual' ? (ev.type === 'bracket' ? 'Time trial ' : 'Qualifying ') + (run.q + 1) : run.phase === 'card' ? 'Callout ' + (run.i + 1) : DR.Ladder.roundName(run) };
  };
  // the first session's call has closed: too late to enter today
  DR.Ladder.lateLock = function (ev) {
    if (DR.SCHED_OFF || !G.slotWindow) return '';
    var w = G.slotWindow(DR.evSlot(ev)); if (!w || !w.open) return '';
    var P = plan(ev), d0 = w.start - P.gates, first = P.qual && P.qual.length ? P.qual[0] : P.rounds ? P.rounds[0] : P.first;
    return G.now() > d0 + first + P.call ? 'Entries closed: the first ' + (ev.type === 'headsup' ? 'qualifying session' : ev.type === 'bracket' ? 'time trial' : ev.type === 'street' ? 'callout' : 'round') + ' was at ' + DR.Cal.hourText(Math.floor(first % 24), Math.round((first % 1) * 60)) : '';
  };
  // a missed call: the session went without you. Qualifying: no time from
  // it; a round: your opponent's solo run, and you're out; a callout: a loss.
  // Returns the news, or '' if nothing was missed.
  DR.Ladder.checkCall = function (ev) {
    var run = DR.Ladder.runFor(ev), out = [];
    if (!run || DR.SCHED_OFF || !G.now) return '';
    for (var guard = 0; guard < 12; guard++) {
      var nc = DR.Ladder.nextCall(ev, run);
      if (!nc || G.now() <= nc.close) break;
      if (run.phase === 'qual') {
        run.myQ.push(99); run.q++; out.push('Missed ' + nc.label.toLowerCase() + ': no time from it.');
        if (run.q >= DR.QUALS) seed(ev, run);
      } else if (run.phase === 'elim' && run.brokeQ && !(run.myWins > 0) && G.car() && G.car().damage) {
        // still broken from qualifying when round 1 closed: the broke rules
        // (credit or points, an alternate in your place)
        run.phase = 'broke';
        out.push('Still broken when round 1 was called: no eliminations for you today. An alternate takes your spot.');
        break;
      } else if (run.phase === 'elim') {
        var o = DR.Ladder.opponent(ev, run);
        out.push('Missed the call for ' + (/^Round/.test(nc.label) ? nc.label.toLowerCase() : 'the ' + nc.label.toLowerCase()) + ': ' + (o ? o.name + ' made a solo run' : 'the round went on without you') + '. You\'re out.');
        var res = { money: [], news: [], notes: [], unlocks: [] };
        advance(ev, run, false); finishWithout(ev, run); endRun(ev, run, false, res);
        break;
      } else if (run.phase === 'card') {
        var o2 = ev.opps[run.i];
        run.losses++; run.log.push([o2.name, false]); run.i++;
        out.push('Missed the callout with ' + o2.name + ': a loss.');
        var need = Math.ceil(run.n * 0.75);
        if (run.i >= run.n || run.losses > run.n - need) { cardEnd(ev, run, { money: [], news: [], notes: [], unlocks: [] }); break; }
      }
    }
    G.save();
    return out.join(' ');
  };

  // ---------------------------------------------------------------- heat through the day
  // The engine's coolant temperature (deg F): about 40 F a pass (more for a
  // big-power car on a long pass: Concato's chiller test), down between
  // passes as fast as the car's cooling lets it: hood up only ~45 min to
  // shed most of it; an electric water pump or electric fans ~25; both ~12
  // (racers: 10-15 min on a hot day); an ice-water engine chiller to ~55 F
  // in under 10 (Concato). Best near 120 F at the start (Reher-Morrison);
  // hot costs up to ~2.5% power (a tenth or so: Dragzine) and knocks sooner.
  function F(c) { return c * 9 / 5 + 32; }
  DR.Ladder.coolTau = function (inst) {
    var pump = ['pu2', 'pu3'].indexOf(DR.partId('pulleys', inst)) >= 0, fans = DR.partId('cooling', inst) !== 'stock';
    if (G.hasGear && G.hasGear('chiller')) return { tau: 0.05, floor: 50, how: 'the engine chiller' };
    if (pump && fans) return { tau: 0.2, how: 'the electric fans and water pump' };
    if (pump || fans) return { tau: 0.42, how: pump ? 'the electric water pump' : 'the electric fans' };
    return { tau: 0.75, how: 'the hood up' };
  };
  // the run's heat brought up to now (cooling since the last pass)
  function heatNow(ev, run, inst) {
    var cond = condOf(ev), amb = F(cond.air), h = run.heat;
    if (!h) h = run.heat = { T: run.drove ? 180 : amb, at: G.now ? G.now() : 0, nosP: 1, uid: inst.uid };
    var now = G.now ? G.now() : h.at, dt = Math.max(0, now - h.at);
    if (dt > 0) {
      var c = DR.Ladder.coolTau(inst), shade = !cond.night && G.hasGear && G.hasGear('canopy') ? 8 : 0;
      var floor = c.floor != null ? c.floor : amb - shade;
      h.T = floor + (h.T - floor) * Math.exp(-dt / c.tau);
      // the nitrous bottle back up to pressure: minutes with a heater, slowly without
      var heater = DR.getOption('nosheat', inst).nosk >= 1;
      h.nosP = 1 - (1 - h.nosP) * Math.exp(-dt / (heater ? 0.07 : 1));
      h.at = now;
    }
    return h;
  }
  DR.Ladder.engTemp = function (ev, inst) { var run = DR.Ladder.runFor(ev); return run ? heatNow(ev, run, inst).T : null; };
  // for the race: the heat as the physics wants it (engHeat units: 8 none,
  // 28 the most), an ice-tank intercooler halving what it does to the charge
  DR.Ladder.heatFor = function (inst, cfg) {
    var ev = cfg.ev, run = DR.Ladder.runFor(ev);
    if (!run) return { eng: 0, nosP: 1, uid: inst.uid };
    var h = heatNow(ev, run, inst), u = 20 * Math.max(0, Math.min(1, (h.T - 140) / 90));
    if (DR.partId('ic', inst) === 'ic3') u *= 0.5;
    return { lad: true, ev: ev, uid: inst.uid, eng: u > 0 ? 8 + u : 0, nosP: h.nosP, h: h };
  };
  DR.Ladder.heatAfter = function (hh, inst, S, sim) {
    var h = hh.h; if (!h) return;
    var load = (S.peakHp + S.nosHp) / Math.max(1, S.coolHp);
    h.T += 40 * Math.max(0.6, Math.min(1.8, load)) * Math.max(0.5, Math.min(sim.et || 10, 15) / 10);
    h.at = G.now ? G.now() : h.at;
    if (S.nosHp && sim.nosT > 0.5) {
      var heater = DR.getOption('nosheat', inst).nosk >= 1;
      h.nosP = Math.max(0.7, h.nosP - (heater ? 0.015 : 0.07) * Math.min(1.5, sim.nosT / 5));
    }
    G.save();
  };
})();
