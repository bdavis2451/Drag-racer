// ===========================================================================
// EXTRAS — the city between race days.
//  * Wanderers (Tokyo Xtreme Racer 2): lone racers who only turn up at one
//    street spot, on certain nights, and only race a certain kind of car.
//    Word gets around: texts from unknown numbers say where and when.
//  * Car clubs (Midnight Club 3): the muscle, import, truck and classic
//    clubs each hold a monthly tournament for cars of their kind (a
//    three-round ladder); win one and you're a member (a bigger purse).
//  * Short series (TOCA Race Driver): each stage offers two class series
//    of three Sundays; register, race each round (miss one, it's a loss),
//    win two to take the title.
// They share one kind of special career race (ev.special).
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, h = UI.h, btn = UI.btn, A = DR.Audio, CAL = DR.Cal;
  var X = DR.Extras = {};
  function S() { var s = G.state; if (!s.xs) s.xs = { wander: {}, hinted: {}, member: {}, clubLast: {}, series: null, seriesDone: {} }; return s.xs; }
  X.state = S;
  function stageBase() { var c = G.careerState(); return DR.STAGES[Math.min(c.stage, DR.STAGES.length - 1)].base; }
  // every career rival, with its estimated time (for picking fields)
  var pool = null;
  function rivals() { if (!pool) { pool = []; DR.STAGES.forEach(function (st) { st.all.forEach(function (ev) { ev.opps.forEach(function (o) { pool.push(o); }); }); }); } return pool; }
  function nearPace(filter, dist, grip, center, n) {
    var c = rivals().filter(function (o) { return !filter || filter(DR.buildSpec(G.oppInst(o)), o); }).map(function (o) { return { o: o, et: G.estimate(G.oppInst(o), dist, grip).et }; }).filter(function (x) { return x.et < 90; });
    c.sort(function (a, b) { return Math.abs(a.et - center) - Math.abs(b.et - center); });
    return c.slice(0, n);
  }

  // ---------------------------------------------------------------- special races
  // ev.special: { kind, title, cash, hostDist/Theme/Grip, hostCond, onWin(ev, final), onLose(ev) }
  var ec0 = DR.Race.eventCfg; DR.Race.eventCfg = function (ev, round) { var c = ec0.apply(this, arguments); if (ev.special) { c.dist = ev.hostDist; c.theme = ev.hostTheme; c.grip = ev.hostGrip; c.hosted = true; } return c; };
  var rdn0 = DR.raceDayName; DR.raceDayName = function (ev) { return ev && ev.special ? ev.title : rdn0.apply(this, arguments); };
  var lock0 = G.eventLock; G.eventLock = function (ev) { return ev && ev.special ? '' : lock0.apply(this, arguments); };
  var won0 = G.eventWon; G.eventWon = function (ev) { return ev && ev.special ? false : won0.apply(this, arguments); };
  var rew0 = G.eventReward; G.eventReward = function (ev) { return ev && ev.special ? ev.cash || 0 : rew0.apply(this, arguments); };
  var win0 = G.winEvent;
  G.winEvent = function (ev) {
    if (!ev || !ev.special) return win0.apply(this, arguments);
    var r = ev.onWin ? ev.onWin(ev) : { cash: ev.cash };
    return { purse: r.cash || 0, cash: r.cash || 0, unlocks: [], money: r.money || [], banner: r.banner || '', lines: [], first: false };
  };
  var after0 = G.afterRun;
  G.afterRun = function (cfg, r) {
    var out = after0.apply(this, arguments);
    if (cfg.ev && cfg.ev.special && r.win === false && cfg.ev.onLose) cfg.ev.onLose(cfg.ev, cfg.round || 0);
    if (cfg.wander && r.win) wanderWon(cfg.wander, cfg.bet);
    return out;
  };
  function special(o) {
    var dist = o.dist === 'e' ? DR.EIGHTH : DR.QUARTER;
    return Object.assign({ id: 'X:' + o.key, special: o.kind, stage: G.careerState().stage, idx: 'X', needWins: 0, unlocks: [], cash: 0,
      hostDist: dist, hostTheme: o.theme || 'strip', hostGrip: o.grip || 1, hostCond: { surface: o.surface || 'prep', night: !!o.night } }, o);
  }

  // ---------------------------------------------------------------- wanderers
  // win: their night and hours at the spot; ok(S, inst): '' or why not
  function era(S) { var y = +(String(S.car.real || '').match(/(19|20)\d\d/) || [2000])[0]; return y; }
  DR.WANDERERS = [
    { id: 'taxi', name: 'The Night Cabbie', car: 'monte', spot: 'downtown', stage: 0, win: { wd: [1, 2, 3], from: 25, to: 27 }, bet: 500,
      ok: function (S) { return S.engId === S.car.engine ? '' : 'He taps the meter: "Factory engines only. Swap motors are cheating."'; },
      hint: 'There\'s a cabbie downtown, Mon to Wed after 1 AM, who\'ll race anyone in a car with its factory engine. Fast cab.' },
    { id: 'gus', name: 'Grandpa Gus', car: 'nova', spot: 'downtown', stage: 1, win: { wd: [0], from: 21, to: 24 }, bet: 1000,
      ok: function (S) { return era(S) < 1980 ? '' : '"Come back in something built before disco died, sonny."'; },
      hint: 'An old-timer in a Nova cruises downtown Sunday nights. Only races cars older than 1980.' },
    { id: 'midnight', name: 'Midnight Mike', car: 'gnx', spot: 'downtown', stage: 1, win: { wd: [2], from: 24, to: 27 }, bet: 1500,
      ok: function (S) { return S.fiType === 'turbo' ? '' : 'He listens to your car idle: "No turbo whistle, no race."'; },
      hint: 'A black Buick shows up downtown after midnight on Tuesdays. Races turbo cars. Nothing else.' },
    { id: 'rin', name: 'Rotary Rin', car: 'rx7', spot: 'highway', stage: 1, win: { wd: [4], from: 22, to: 26 }, bet: 2500,
      ok: function (S) { return S.m < 1300 ? '' : '"Too fat. Come back under 1,300 kilos."'; },
      hint: 'Thursdays on Route 99 there\'s a rotary guy who only races lightweights: under 1,300 kg.' },
    { id: 'nancy', name: 'Nitro Nancy', car: 'cobra03', spot: 'highway', stage: 2, win: { wd: [5], from: 25, to: 27 }, bet: 5000,
      ok: function (S) { return S.nosHp ? '' : '"Where\'s your bottle? I only race spray."'; },
      hint: 'After the Friday street night, a Cobra on the 99 on-ramp races anyone on nitrous. 1 to 3 AM.' },
    { id: 'dan', name: 'Diesel Dan', car: 'diesel', spot: 'docks', stage: 2, win: { wd: [1], from: 22, to: 26 }, bet: 5000,
      ok: function (S) { return S.car.cat === 'Truck' ? '' : '"Trucks only, pal. Cars go to the car meet."'; },
      hint: 'Mondays at the docks there\'s a diesel truck that only races other trucks. Coal-rolling, big money.' },
    { id: 'max', name: 'Mileage Max', car: 'hellcat', spot: 'docks', stage: 3, win: { wd: [3], from: 22, to: 26 }, bet: 10000,
      ok: function (S, inst) { var n = (inst.log || []).length; return n >= 40 ? '' : '"Show me a car that\'s been driven: 40 passes in the logbook. Yours has ' + n + '."'; },
      hint: 'Wednesday nights at the docks, a Hellcat guy who hates trailer queens. Wants a car with 40+ logged passes.' },
    { id: 'ghost', name: 'The Ghost', car: 'supra', spot: 'runway', stage: 3, win: { wd: [0], from: 26, to: 28 }, bet: 25000,
      ok: function (S, inst, o) { var me = G.estimate(inst, DR.QUARTER, 0.92).et, him = G.estimate(G.oppInst(o), DR.QUARTER, 0.92).et; return Math.abs(me - him) <= 0.4 ? '' : 'A white Supra idles at the far end of the runway. It doesn\'t move. (Only races cars within 0.4 s of it: ' + him.toFixed(2) + '.)'; },
      hint: 'They say a white Supra runs the airfield at 2 AM Sunday nights. Only races cars as quick as it is.' },
    { id: 'sam', name: 'Silent Sam', car: 'gtr', spot: 'runway', stage: 4, win: { wd: [6], from: 26, to: 28 }, bet: 50000,
      ok: function (S) { return S.drive === 'AWD' ? '' : 'He points at your rear tires and shakes his head. (All-wheel drive only.)'; },
      hint: 'Saturday after the strip closes, a GT-R waits at the runway. AWD cars only. Doesn\'t talk.' },
    { id: 'mayor', name: 'The Mayor', car: 'viper', spot: 'downtown', stage: 4, win: { wd: [5], from: 27, to: 29 }, bet: 50000,
      ok: function () { return Object.keys(S().wander).length >= 3 ? '' : '"Beat three of the night people first. Then we talk."'; },
      hint: 'Rumor: the guy who runs downtown races at 3 AM Fridays, in a Viper. Only if you\'ve beaten three of the wanderers.' }
  ];
  function wWindow(w, t) {
    var d0 = CAL.dayStart(t);
    for (var k = -2; k <= 0; k++) { var d = d0 + k * 24, dt = CAL.date(d); if (w.win.wd.indexOf(dt.wd) >= 0) { var a = d + w.win.from, b = d + w.win.to; if (t >= a && t < b) return { start: a, end: b }; } }
    return null;
  }
  X.wandererAt = function (spot) { var c = G.careerState(), now = G.now(); return DR.WANDERERS.filter(function (w) { return w.spot === spot && c.stage >= w.stage && wWindow(w, now); })[0] || null; };
  function wOpp(w) {
    var o = rivals().filter(function (x) { return x.carId === w.car; }).sort(function (a, b) { return Math.abs(DR.STAGES.findIndex(function (st) { return st.all.some(function (ev) { return ev.opps.indexOf(a) >= 0; }); }) - w.stage - 1) - Math.abs(DR.STAGES.findIndex(function (st) { return st.all.some(function (ev) { return ev.opps.indexOf(b) >= 0; }); }) - w.stage - 1); })[0];
    o = Object.assign({}, o || DR.STAGES[Math.min(w.stage + 1, DR.STAGES.length - 1)].events[0].opps[0]);
    o.name = w.name; o.skill = Math.max(o.skill || 0.7, 0.85); o.color = '#151515';
    return o;
  }
  function wanderWon(id, bet) {
    var x = S(), first = !x.wander[id]; x.wander[id] = (x.wander[id] || 0) + 1;
    if (first) { G.earn(bet); UI.toast('First time anyone\'s beaten ' + DR.WANDERERS.filter(function (w) { return w.id === id; })[0].name + ' in a while: word gets around (+' + DR.money(bet) + ' from the crowd\'s side bets)'); }
    G.save();
  }
  UI.wanderCard = function (inst, p) {
    var w = X.wandererAt(p.id), x = S();
    if (!w) {
      var known = DR.WANDERERS.filter(function (ww) { return ww.spot === p.id && x.hinted[ww.id]; });
      return known.length ? h('div', { class: 'gsmall dim', style: { marginTop: '6px' } }, 'Word on the street: ' + known.map(function (ww) { return ww.hint; }).join(' ')) : null;
    }
    var o = wOpp(w), oi = G.oppInst(o), why = w.ok(G.spec(inst), inst, o), dist = p.dist === 'quarter' ? DR.QUARTER : DR.EIGHTH;
    return h('div', { class: 'trkcard wander', style: { marginTop: '8px' } },
      h('div', { class: 'row', style: { gap: '8px', alignItems: 'center' } }, h('span', { class: 'pix', style: { color: DR.KCOL.wander } }, 'WANDERER'), h('b', { class: 'grow' }, w.name + ' • ' + DR.CARS[o.carId].name), x.wander[w.id] ? h('span', { class: 'good gsmall' }, 'beaten ×' + x.wander[w.id]) : null),
      why ? h('div', { class: 'gsmall' }, why) : h('div', { class: 'gsmall' }, 'He\'ll race you for ' + DR.money(w.bet) + '. ' + (x.wander[w.id] ? '' : 'Nobody\'s beaten him in a long time.')),
      why ? null : btn('Race ' + w.name + ' for ' + DR.money(w.bet), function () {
        if (G.state.money < w.bet) return UI.toast('You can\'t cover ' + DR.money(w.bet));
        DR.Race.raceDay({ mode: 'street', opp: o, dist: dist, theme: 'street', grip: p.grip, bet: w.bet, wander: w.id }, w.name + ' • ' + DR.money(w.bet));
      }, 'small red'));
  };
  // word gets around: one hint a day for the wanderers your stage has opened
  G.onDay(function () {
    var c = G.careerState(), x = S(), w = DR.WANDERERS.filter(function (ww) { return c.stage >= ww.stage && !x.hinted[ww.id]; })[0];
    if (w && Math.random() < 0.5) { x.hinted[w.id] = true; if (DR.Phone) DR.Phone.send('street', 'hint', w.hint); }
    return [];
  });

  // ---------------------------------------------------------------- car clubs
  DR.CLUBS = [
    { id: 'muscle', name: 'Iron Horse Muscle Club', blurb: 'American V8s, rear-drive, loud.', dist: 'q', win: { wd: 6, nth: 1, from: 15, to: 19 },
      ok: function (S) { return (S.car.cat === 'Muscle' || (S.eng.cyl >= 8 && S.drive === 'RWD' && S.car.cat !== 'Pro')) ? '' : 'American V8, rear-drive cars only'; } },
    { id: 'import', name: 'Tuner Union Import Night', blurb: 'JDM, Euro and compacts under the lights.', dist: 'e', win: { wd: 5, nth: 2, from: 19, to: 23 }, night: true,
      ok: function (S) { return ['JDM', 'Euro', 'Compact'].indexOf(S.car.cat) >= 0 ? '' : 'Imports and compacts only'; } },
    { id: 'truck', name: 'Big Iron Truck Shootout', blurb: 'Pickups and the odd SUV, with the tailgates down.', dist: 'e', win: { wd: 0, nth: 3, from: 13, to: 17 },
      ok: function (S) { return S.car.cat === 'Truck' ? '' : 'Trucks only'; } },
    { id: 'classic', name: 'Chrome & Steel Classics', blurb: 'Built before 1980, and it shows.', dist: 'q', win: { wd: 6, last: true, from: 13, to: 17 },
      ok: function (S) { return era(S) < 1980 ? '' : 'Cars built before 1980 only'; } }
  ];
  function nthOf(d) { return Math.floor((d.d - 1) / 7) + 1; }
  function clubOn(cl, d0) {
    var d = CAL.date(d0); if (d.wd !== cl.win.wd) return null;
    if (cl.win.nth && nthOf(d) !== cl.win.nth) return null;
    if (cl.win.last) { var nx = CAL.date(d0 + 7 * 24); if (nx.m === d.m) return null; }
    return { start: d0 + cl.win.from, end: d0 + cl.win.to };
  }
  X.clubPurse = function (cl) { return Math.round(stageBase() * 3 * (S().member[cl.id] ? 1.25 : 1) / 50) * 50; };
  X.clubFee = function () { return Math.round(stageBase() * 0.25 / 10) * 10; };
  X.enterClub = function (cl) {
    var inst = G.car(), Sp = G.spec(inst), why = cl.ok(Sp), x = S(), w = clubOn(cl, CAL.dayStart(G.now()));
    if (why) return UI.toast(cl.name + ': ' + why);
    if (!w || G.now() < w.start || G.now() >= w.end) return UI.toast('It\'s not on now');
    if (x.clubLast[cl.id] === w.start) return UI.toast('You\'ve run this month\'s tournament');
    var fee = X.clubFee(); if (!G.canAfford(fee)) return UI.toast('Entry is ' + DR.money(fee));
    G.pay(fee); x.clubLast[cl.id] = w.start;
    var dist = cl.dist === 'e' ? DR.EIGHTH : DR.QUARTER, me = G.estimate(inst, dist).et;
    var f = nearPace(function (S2) { return !cl.ok(S2); }, dist, 1, me * 0.99, 6), opps = [f[4] || f[f.length - 1], f[2] || f[0], f[0]].filter(Boolean).map(function (q, i) { var o = Object.assign({}, q.o); o.name = ['Rusty', 'Kenji', 'Dutch', 'Moe', 'Lina', 'Hank'][(i + cl.id.length) % 6] + ' (' + cl.name.split(' ')[0] + ')'; return o; });
    if (!opps.length) return UI.toast('Nobody showed up in a car like yours this month');
    var ev = special({ key: 'club:' + cl.id, kind: 'club', title: cl.name, type: opps.length > 1 ? 'knockout' : 'quarter', opps: opps, dist: cl.dist, night: !!cl.night, cash: X.clubPurse(cl),
      onWin: function (e) { var m = !x.member[cl.id]; x.member[cl.id] = true; G.save(); return { cash: e.cash, money: [[cl.name + ' purse', e.cash]], banner: 'You won the ' + cl.name + (m ? ': you\'re a member now (+25% purses)' : '') }; } });
    G.save();
    DR.Race.raceDay(DR.Race.eventCfg(ev, 0), cl.name);
  };

  // ---------------------------------------------------------------- short series
  // two per stage, from the stage's class rules
  X.seriesFor = function (si) {
    var st = DR.STAGES[si], out = [];
    (st.side || []).filter(function (ev) { return ev.type === 'class'; }).slice(0, 2).forEach(function (ev, k) { out.push({ id: 'S' + si + '.' + k, cls: ev.cls, name: DR.CLASSES[ev.cls].name + ' Series', stage: si }); });
    return out;
  };
  X.seriesFee = function () { return Math.round(stageBase() * 0.5 / 10) * 10; };
  X.seriesPurse = function () { return Math.round(stageBase() * 4 / 50) * 50; };
  X.register = function (sd) {
    var x = S(); if (x.series && !x.series.done) return 'You\'re in a series already';
    var why = DR.classIssue(sd.cls, G.car()); if (why) return why;
    var fee = X.seriesFee(); if (!G.canAfford(fee)) return 'Registration is ' + DR.money(fee);
    var me = G.estimate(G.car(), DR.QUARTER).et, f = nearPace(function (S2) { return DR.CLASSES[sd.cls].ok(S2); }, DR.QUARTER, 1, me * 0.995, 5);
    if (f.length < 3) return 'Not enough cars in that class this season';
    G.pay(fee);
    var first = G.slotWindow('side'), rounds = [0, 1, 2].map(function (k) { return { start: first.start + k * 168, end: first.end + k * 168, res: null }; });
    x.series = { id: sd.id, name: sd.name, cls: sd.cls, rounds: rounds, opps: [f[2], f[1], f[0]].map(function (q, i) { var o = Object.assign({}, q.o); o.name = ['Dale', 'Rosa', 'Vic'][i] + ' ' + ['Hart', 'Ng', 'Ruiz'][i]; return o; }), pts: 0, done: false };
    G.save(); return '';
  };
  X.raceRound = function () {
    var x = S(), se = x.series; if (!se || se.done) return;
    var k = se.rounds.findIndex(function (r) { return !r.res; }), r = se.rounds[k], now = G.now();
    if (now < r.start || now >= r.end) return UI.toast('Round ' + (k + 1) + ' is ' + CAL.fmt(r.start));
    var why = DR.classIssue(se.cls, G.car()); if (why) return UI.toast(why);
    var ev = special({ key: 'series:' + se.id + ':' + k, kind: 'series', title: se.name + ' • round ' + (k + 1), type: 'quarter', cls: se.cls, opps: [se.opps[k]], dist: 'q',
      onWin: function () { r.res = 'W'; se.pts++; G.save(); return finishSeries(se) || { cash: 0, banner: se.name + ': round ' + (k + 1) + ' won (' + se.pts + ' of 3)' }; },
      onLose: function () { r.res = 'L'; G.save(); finishSeries(se); } });
    DR.Race.raceDay(DR.Race.eventCfg(ev, 0), ev.title);
  };
  function finishSeries(se) {
    if (se.rounds.some(function (r) { return !r.res; })) return null;
    se.done = true; S().seriesDone[se.id] = se.pts;
    var purse = se.pts >= 2 ? X.seriesPurse() : se.pts === 1 ? Math.round(X.seriesPurse() / 4 / 50) * 50 : 0;
    var msg = se.name + (se.pts >= 2 ? ' CHAMPION! ' : ' over: ') + se.pts + ' of 3 rounds' + (purse ? ', +' + DR.money(purse) : '');
    G.save();
    setTimeout(function () { UI.toast(msg); }, 2500);
    return { cash: purse, money: purse ? [[se.name + (se.pts >= 2 ? ' title' : ' runner-up'), purse]] : [], banner: msg };
  }
  // a round missed is a round lost
  G.onTick(function () {
    var se = S().series, news = [];
    if (se && !se.done) se.rounds.forEach(function (r, k) { if (!r.res && G.now() >= r.end) { r.res = 'L'; news.push(se.name + ': you missed round ' + (k + 1) + ' (a loss)'); var f = finishSeries(se); if (f && f.cash) G.earn(f.cash); } });
    return news;
  });

  // ---------------------------------------------------------------- on the calendar
  G.extraAgenda = (function (prev) {
    return function (d0) {
      var out = prev ? prev(d0) || [] : [], c = G.careerState(), x = S();
      DR.WANDERERS.forEach(function (w) {
        if (!x.hinted[w.id] || c.stage < w.stage) return;
        var dt = CAL.date(d0); if (w.win.wd.indexOf(dt.wd) < 0) return;
        var spot = (DR.CITY || []).filter(function (p) { return p.id === w.spot; })[0];
        out.push({ t: d0 + w.win.from, end: d0 + w.win.to, kind: 'wander', label: 'Rumor: ' + w.name + ' at ' + (spot ? spot.name : w.spot), sub: x.wander[w.id] ? 'beaten ×' + x.wander[w.id] : '', go: function () { UI.show(UI.RaceMenu, 'map'); } });
      });
      DR.CLUBS.forEach(function (cl) { var w = clubOn(cl, d0); if (!w) return; out.push({ t: w.start, end: w.end, kind: 'club', label: cl.name + (x.member[cl.id] ? ' (member)' : ''), sub: cl.blurb + ' Entry ' + DR.money(X.clubFee()) + ', purse ' + DR.money(X.clubPurse(cl)), go: function () { X.enterClub(cl); } }); });
      var se = x.series;
      if (se && !se.done) se.rounds.forEach(function (r, k) { if (CAL.dayStart(r.start) === d0 && !r.res) out.push({ t: r.start, end: r.end, kind: 'series', label: se.name + ': round ' + (k + 1) + ' vs ' + se.opps[k].name, sub: se.pts + ' pts', go: function () { X.raceRound(); } }); });
      else if (CAL.date(d0).wd === 0) X.seriesFor(Math.min(c.stage, DR.STAGES.length - 1)).forEach(function (sd) {
        if (x.seriesDone[sd.id] != null) return;
        var w = G.slotWindow('side', d0); if (!w || CAL.dayStart(w.start) !== d0) return;
        out.push({ t: w.start, end: w.end, kind: 'series', label: 'Register: ' + sd.name + ' (3 Sundays)', sub: 'Fee ' + DR.money(X.seriesFee()) + ', title ' + DR.money(X.seriesPurse()) + ' • ' + DR.CLASSES[sd.cls].rule, go: function () { var w2 = X.register(sd); if (w2) return UI.toast(w2); UI.toast('Registered: ' + sd.name); X.raceRound(); } });
      });
      return out;
    };
  })(G.extraAgenda);
})();
