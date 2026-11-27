// ===========================================================================
// CIRCUIT LADDER — the circuit career as a ladder, like the strip's (the
// owner's plan, Nov 2026; build C1). Your team races it: your hired drivers
// in your cars.
//  * Six classes, club to pro, each with a spec series: Club (Spec Miata),
//    Touring (Spec E46), Sport (Corvette Cup), GT (Porsche Carrera Cup), GT
//    Pro (Lamborghini Super Trofeo), Unlimited (the Super Trofeo World
//    Final). A pace floor per class: the car's ideal lap at Pixel Raceway,
//    this or slower (Unlimited: none).
//  * Each class: five sections of four events (Sprint, Spec, Endurance,
//    Night street), then the Championship weekend (qualifying and a longer
//    feature race). Finishing an event takes the win. Spec and Endurance
//    come in later builds (C2, C3): until then a section opens when its
//    Sprint and its Night race are won; after, 3 of 4 (an open section
//    stays open).
//  * The fields: the class's twelve regulars, the same every game, their
//    pace stepping up section by section; nine of them in a race (the
//    Championship: the nine quickest, the class's named rival leading).
//  * Money: the top five paid (100 / 60 / 40 / 25 / 15% of the win), the
//    entry 10% of the win plus the driver's wage. Each event runs once a
//    week: Sprints and the Championship on Sunday race days, Night races on
//    Saturday nights.
//  * The first win in a section opens what the old race days opened
//    (circuit parts, the road-course cars), the Championship what the old
//    Cup did, and the next class.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, T = DR.Team;
  function C() { return G.careerState(); }
  // the ladder's state: the class you're on, events won, the sections
  // opened (kept open), the unlock packs given, this week's entries
  function CL() {
    var c = C(), s = c.cl || (c.cl = {});
    if (s.cls == null) s.cls = 0;
    s.won = s.won || {}; s.open = s.open || {}; s.packs = s.packs || {}; s.entered = s.entered || {};
    return s;
  }
  var CLD = DR.CL = {};
  CLD.state = CL;

  // ---------------------------------------------------------------- the classes
  T.CCLASSES = [
    { id: 'club', name: 'Club', series: 'Spec Miata', spec: 'mira', floor: 104, spread: 9, laps: 5, ai: [30, 55] },
    { id: 'touring', name: 'Touring', series: 'Spec E46', spec: 'm3', floor: 98, spread: 8, laps: 6, ai: [36, 62] },
    { id: 'sport', name: 'Sport', series: 'Corvette Cup', spec: 'vette5', floor: 94, spread: 7, laps: 6, ai: [44, 70] },
    { id: 'gt', name: 'GT', series: 'Porsche Carrera Cup', spec: 'p911', floor: 89, spread: 6, laps: 8, ai: [52, 78] },
    { id: 'gtpro', name: 'GT Pro', series: 'Lamborghini Super Trofeo', spec: 'lambo', floor: 85, spread: 6, laps: 10, ai: [62, 88] },
    { id: 'unl', name: 'Unlimited', series: 'Super Trofeo World Final', spec: 'lambo', floor: 0, pace: 79, spread: 8, laps: 12, ai: [72, 95] }
  ];
  T.CCLASSES.forEach(function (k, si) { k.stage = si; k.career = true; k.fee = 0; k.prize = [0, 0, 0, 0, 0, 0]; });
  var byId0 = T.classById;
  T.classById = function (id) { return byId0(id) || T.CCLASSES.filter(function (k) { return k.id === id; })[0]; };

  // ---------------------------------------------------------------- the event kinds
  CLD.THEMES = [
    { id: 'sprint', code: 'S', name: 'Sprint', glyph: 'SPR', slot: 'cup', blurb: 'A club sprint at Pixel Raceway: one qualifying lap each sets the grid, then the race. Win it to finish the event.' },
    { id: 'spec', code: 'P', name: 'Spec', glyph: 'SPEC', slot: 'cup', soon: 'Coming in the next update: everyone in the series car, rented or your own built to the spec.' },
    { id: 'endur', code: 'E', name: 'Endurance', glyph: 'END', slot: 'cup', soon: 'Coming in a later update: three times a sprint, two of your drivers sharing the car, pit stops for fuel and tires.' },
    { id: 'night', code: 'N', name: 'Night', glyph: 'NGT', slot: 'cnight', blurb: 'A night race on a closed-off street circuit, a different one each section. Qualifying sets the grid. Win it to finish the event.' }
  ];
  CLD.theme = function (id) { return CLD.THEMES.filter(function (t) { return t.id === id; })[0] || null; };
  // what runs in this build (C2 adds Spec, C3 Endurance)
  CLD.LIVE = { sprint: true, night: true };
  CLD.SECTIONS = 5;
  CLD.FIELD = 9;              // regulars in a race (you make ten)
  CLD.REGS = 12;              // regulars a class
  CLD.need = function () { var n = CLD.THEMES.filter(function (t) { return CLD.LIVE[t.id]; }).length; return Math.min(3, n); };
  // pace: seconds off the class floor by section (the Championship last),
  // and the skill step
  CLD.GAP = [5, 3.75, 2.5, 1.5, 0.75, 0.3];
  CLD.STEP = [-8, -5, -2, 1, 4, 8];
  // money: the win by section (x the class base), the Championship, the
  // share of the win for P1-P5, the entry
  CLD.PURSE_K = [1, 1.2, 1.4, 1.6, 1.8];
  CLD.CHAMP_K = 5;
  CLD.PAY = [1, 0.6, 0.4, 0.25, 0.15];
  CLD.ENTRY_K = 0.1;
  var NIGHT = ['airfield', 'highway', 'canyon', 'downtown', 'airfield'];
  // the class's named rival: they lead the Championship
  var RIVALS = [
    { name: 'Maddie "Apex" Cole', col: '#ff6a00', team: 'Late Apex', car: 'mira' },
    { name: 'Dev Okafor', col: '#3aa0ff', team: 'Kerbside', car: 'm3' },
    { name: 'Sofia Brandt', col: '#e8e8e8', team: 'Apex Motorsport', car: 'vette5' },
    { name: 'Kaito Mori', col: '#ff2bd6', team: 'Slipstream', car: 'p911' },
    { name: 'Lucia Marchetti', col: '#c8102e', team: 'Redline Racing', car: 'lambo' },
    { name: 'Erik "The Professor" Lund', col: '#ffd700', team: 'Downforce', car: 'lambo' }
  ];
  function r10(x) { return Math.round(x / 10) * 10; }
  function hash(str) { var x = 2166136261; for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(a, rnd) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

  // ---------------------------------------------------------------- the regulars
  // Twelve a class, the same every game: their own car (the spec car the
  // most common), a team, a pace offset over the field (0.2 s to the class
  // spread) and skills from the class's band. The first is the class's
  // named rival, the quickest.
  var POOL = [
    ['mira', 'mira', 'hachi', 'kaze', 'ronin', 'silvia', 's2k', 'volta', 'cobaltss', 'fox', 'camaro6'],
    ['m3', 'm3', 'rx7', 'evo', 'sti', 'z35', 'supra', 'cobra03', 'camaro', 'silvia', 's2k'],
    ['vette5', 'vette5', 'z06', 'camss', 'stang15', 'r34', 'supra', 'rx7', 'cobra03', 'm3', 'evo'],
    ['p911', 'p911', 'viper', 'gtr', 'z06', 'hellcat', 'r34', 'vette5', 'stang15', 'camss', 'supra'],
    ['lambo', 'lambo', 'p911', 'viper', 'gtr', 'hellcat', 'z06', 'p911', 'viper', 'gtr', 'r34'],
    ['lambo', 'p911', 'viper', 'gtr', 'hellcat', 'z06', 'lambo', 'p911', 'viper', 'gtr', 'hellcat']
  ];
  var FIRST = ['Alex', 'Bea', 'Callum', 'Dina', 'Emil', 'Farah', 'Gus', 'Hollis', 'Ivy', 'Jules', 'Kenji', 'Lars', 'Mina', 'Nico', 'Olga', 'Pablo', 'Quinn', 'Rosa', 'Stellan', 'Tamsin',
    'Ugo', 'Vera', 'Wes', 'Ximena', 'Yara', 'Zeke', 'Arlo', 'Brigid', 'Cyrus', 'Delphine', 'Eamon', 'Fleur', 'Gideon', 'Hattie', 'Isak', 'Juno', 'Keanu', 'Lottie', 'Magnus', 'Noemi'];
  var LAST = ['Achterberg', 'Bellamy', 'Carrow', 'Delacroix', 'Ekström', 'Fairweather', 'Galloway', 'Hartigan', 'Iwata', 'Jansen', 'Kirkland', 'Lomax', 'Mercer', 'Nakashima', 'Oyelaran', 'Pryce',
    'Quintero', 'Rademacher', 'Sorensen', 'Thorne', 'Underwood', 'Valcourt', 'Whitlock', 'Yamada', 'Zielinski', 'Ashby', 'Brook', 'Castellano', 'Dunmore', 'Everhart'];
  var TEAMS = ['Apex Motorsport', 'Redline Racing', 'Kerbside', 'Slipstream', 'Late Apex', 'Grid Kings', 'Pit Lane Co.', 'Tarmac Union', 'Blue Flag', 'Chequered',
    'Night Shift', 'Torque Bros', 'Downforce', 'Heel & Toe', 'Hairpin Heroes'];
  var COLS = ['#e31b6d', '#ffcc00', '#3aa0ff', '#4cd964', '#ff6a00', '#b05cff', '#f4f4f4', '#2fb3a8', '#ff4a3a', '#c8a2ff', '#7fd3ff', '#ffa8d8'];
  var used = {};
  CLD.ROSTER = T.CCLASSES.map(function (k, si) {
    var rnd = rng(hash('circuit-regulars-' + k.id)), cars = shuffle(POOL[si].slice(), rnd), out = [];
    for (var r = 0; r < CLD.REGS; r++) {
      var name;
      if (r === 0) name = RIVALS[si].name;
      else { do name = FIRST[Math.floor(rnd() * FIRST.length)] + ' ' + LAST[Math.floor(rnd() * LAST.length)]; while (used[name]); }
      used[name] = 1;
      var off = r === 0 ? 0.1 : 0.2 + (k.spread - 0.2) * (r - 1 + rnd() * 0.9) / (CLD.REGS - 1);
      var q = r === 0 ? k.ai[1] : k.ai[0] + (k.ai[1] - k.ai[0]) * clamp(1 - (r - 1) / (CLD.REGS - 1) + (rnd() - 0.5) * 0.3, 0, 1);
      out.push({ name: name, team: r === 0 ? RIVALS[si].team : TEAMS[Math.floor(rnd() * TEAMS.length)], col: r === 0 ? RIVALS[si].col : COLS[Math.floor(rnd() * COLS.length)],
        car: r === 0 ? RIVALS[si].car : cars[r - 1], off: +off.toFixed(2), q: Math.round(q),
        sk: [Math.round((rnd() - 0.5) * 16), Math.round((rnd() - 0.5) * 16), Math.round((rnd() - 0.5) * 16)], rival: r === 0 });
    }
    return out;
  });
  // a regular at a section (5: the Championship): their pace at Pixel
  // Raceway (the race scales it per track) and their skills that day
  CLD.regEntry = function (si, r, s) {
    var k = T.CCLASSES[si], R = CLD.ROSTER[si][r], q = clamp(R.q + CLD.STEP[s], 10, 97);
    return { name: R.name, team: R.team, car: R.car, col: R.col, pace: (k.floor || k.pace) + CLD.GAP[s] + R.off, reg: r,
      d: { name: R.name, brk: clamp(q + R.sk[0], 12, 97), cor: clamp(q + R.sk[1], 12, 97), con: clamp(q + R.sk[2], 12, 97) } };
  };

  // ---------------------------------------------------------------- the events
  // unlocks, as the old race days had them: race day i of stage si is now
  // class si's section i (the first win there), the old Cup the
  // Championship
  var OLD_TRACKS = [['tires'], ['susp'], ['engine'], ['drive', 'body']];
  var OLD_CARS = { '1.1': ['m3'], '1.4': ['s2k'], '2.1': ['rx7'], '3.0': ['z06'], '3.4': ['gtr'], '4.2': ['p911'] };
  function oldUnlocks(si, i) {
    var lvl = Math.min(5, si + 2), out = [];
    if (si < 4) (OLD_TRACKS[i] || ['all']).forEach(function (t) { out.push('cperf:' + t + ':' + lvl); });
    (OLD_CARS[si + '.' + i] || []).forEach(function (id) { out.push('car:' + id); });
    return out;
  }
  var BY_ID = {};
  DR.CSTAGES = T.CCLASSES.map(function (k, si) {
    var base = DR.STAGES[si].base, evs = [], packs = [];
    for (var s = 0; s < CLD.SECTIONS; s++) {
      packs.push(s < 4 ? oldUnlocks(si, s) : []);
      CLD.THEMES.forEach(function (th, j) {
        var tid = th.id === 'night' ? NIGHT[s] : 'pixel', win = r10(base * CLD.PURSE_K[s]);
        var ev = { id: 'C' + si + '.' + s + th.code, cl: true, stage: si, sec: s, idx: s * 4 + j, theme: th.id, cls: k.id, track: tid, top: 1,
          name: k.name + ' ' + th.name + ', round ' + (s + 1),
          laps: T.lapsAt(k, tid), cash: win, fee: Math.max(10, r10(win * CLD.ENTRY_K)), unlocks: [] };
        evs.push(ev); BY_ID[ev.id] = ev;
      });
    }
    var cwin = r10(base * CLD.CHAMP_K);
    var champ = { id: 'C' + si + '.CH', cl: true, champ: true, stage: si, sec: CLD.SECTIONS, idx: 20, theme: 'champ', cls: k.id, track: 'pixel', top: 1,
      name: k.name + ' Championship', laps: T.lapsAt(k, 'pixel') + 2, cash: cwin, fee: Math.max(10, r10(cwin * CLD.ENTRY_K)), rival: RIVALS[si],
      unlocks: oldUnlocks(si, 4) };
    BY_ID[champ.id] = champ;
    return { cls: k, events: evs, champ: champ, cup: champ, all: evs.concat([champ]), packs: packs };
  });
  // the road-course cars: where they open
  DR.CSTAGES.forEach(function (cs, si) {
    cs.packs.forEach(function (pk, s) { pk.forEach(function (u) { var p = u.split(':'); if (p[0] === 'car') { DR.CAR_UNLOCK[p[1]] = 'C' + si + '.' + s; DR.CAR_STAGE[p[1]] = si; } }); });
    cs.champ.unlocks.forEach(function (u) { var p = u.split(':'); if (p[0] === 'car') { DR.CAR_UNLOCK[p[1]] = cs.champ.id; DR.CAR_STAGE[p[1]] = si; } });
  });
  CLD.ev = function (id) { return BY_ID[id] || null; };
  CLD.slotFor = function (ev) { var th = ev && CLD.theme(ev.theme); return th ? th.slot : 'cup'; };

  // the field for an event: nine of the class's regulars (picked per event,
  // the same every week), the Championship's nine quickest
  CLD.field = function (ev) {
    var si = ev.stage, ids = [];
    for (var r = 0; r < CLD.REGS; r++) ids.push(r);
    if (ev.champ) ids = ids.slice(0, CLD.FIELD);
    else ids = shuffle(ids, rng(hash(ev.id))).slice(0, CLD.FIELD).sort(function (a, b) { return a - b; });
    return ids.map(function (r) { return CLD.regEntry(si, r, ev.sec); });
  };
  CLD.purse = function (ev, pos) { return pos >= 1 && pos <= CLD.PAY.length ? r10(ev.cash * CLD.PAY[pos - 1]) : 0; };

  // ---------------------------------------------------------------- progress
  G.cstage = function () { return CL().cls; };
  // the furthest circuit class ever reached (the old career or this ladder)
  G.cbest = function () { var c = C(); return Math.max(c.cstage || 0, CL().cls); };
  G.cclassName = function (si) { var k = T.CCLASSES[si]; return 'Circuit ' + (si + 1) + ': ' + k.name + ' (' + k.series + ')'; };
  G.cupEvent = function (id) { return BY_ID[id] || null; };
  G.cupWon = function (si) { var cs = DR.CSTAGES[si]; return !!(cs && CL().won[cs.champ.id]); };
  G.cupName = function (si) { return DR.CSTAGES[si].champ.name; };
  G.cevWon = function (ev) { return !!CL().won[ev.id]; };
  G.cupWins = function (si) { var w = CL().won; return DR.CSTAGES[si].events.filter(function (ev) { return w[ev.id]; }).length; };
  G.csecWon = function (si, s) { var w = CL().won; return DR.CSTAGES[si].events.filter(function (ev) { return ev.sec === s && w[ev.id]; }).length; };
  G.csecDone = function (si, s) { return (CL().open[si] || 0) > s || G.csecWon(si, s) >= CLD.need(); };
  G.csecOpen = function (si, s) { return s === 0 || G.csecDone(si, s - 1); };
  // the section you're on in a class (5: the five are done)
  G.csec = function (si) { for (var s = 0; s < CLD.SECTIONS; s++) if (!G.csecDone(si, s)) return s; return CLD.SECTIONS; };
  // the class at a glance: 'Section 2 of 5 • 3/10 races won'
  CLD.liveEvents = function (si) { return DR.CSTAGES[si].events.filter(function (ev) { return CLD.LIVE[ev.theme]; }); };
  G.cladderLine = function (si) {
    var cur = G.csec(si);
    return (cur >= CLD.SECTIONS ? 'Championship' : 'Section ' + (cur + 1) + ' of ' + CLD.SECTIONS) + ' • ' + G.cupWins(si) + '/' + CLD.liveEvents(si).length + ' races won';
  };
  // this week's window for an event (null with the calendar off)
  function windowFor(ev) { if (DR.SCHED_OFF || !G.slotWindow) return null; return G.slotWindow(CLD.slotFor(ev)); }
  G.centeredThisWeek = function (ev) { var w = windowFor(ev); return !!(w && CL().entered[ev.id] === w.start); };
  function secRule() { return CLD.need() >= 3 ? '3 of the 4 events' : 'the ' + CLD.THEMES.filter(function (t) { return CLD.LIVE[t.id]; }).map(function (t) { return t.name; }).join(' and the ') + ' race'; }
  CLD.secRule = secRule;
  // why a circuit event can't be entered yet ('' = it can)
  // opt.anyWeek: leave out this week's entry (a later week on the calendar)
  G.cupLock = function (ev, opt) {
    var cl = CL(), si = ev.stage, th = CLD.theme(ev.theme);
    if (th && !CLD.LIVE[ev.theme]) return th.soon;
    if (si > cl.cls) return 'Win the ' + G.cupName(si - 1) + ' first';
    if (ev.champ) { if (G.csec(si) < CLD.SECTIONS) return 'Finish the five sections first'; }
    else if (!G.csecOpen(si, ev.sec)) return 'Win ' + secRule() + ' in section ' + ev.sec + ' first';
    if (T.active().some(function (r) { return r.ev === ev.id; })) return 'Your team is racing it now';
    if (G.centeredThisWeek(ev) && !(opt && opt.anyWeek)) return 'Your team raced it this week: it runs again next ' + (CLD.slotFor(ev) === 'cnight' ? 'Saturday night' : 'Sunday');
    return '';
  };
  // the unlocks the next win here gives: the section's pack until it's been
  // given (whichever event is won first), the Championship's own
  G.cupUnlocks = function (ev) {
    if (ev.champ) return CL().won[ev.id] ? [] : ev.unlocks;
    var pk = CL().packs[ev.stage] || {};
    return pk[ev.sec] ? [] : DR.CSTAGES[ev.stage].packs[ev.sec];
  };
  // a race entered: mark the week (once a week, like the strip)
  CLD.markEntered = function (ev) { var w = windowFor(ev); if (w) { CL().entered[ev.id] = w.start; G.save(); } };

  // A finished race: the purse for the top five, and with the win the
  // event, its unlocks and the next section (or class). Returns
  // { name, cash, unlocks, note }.
  G.cupFinish = function (id, pos) {
    var ev = BY_ID[id]; if (!ev) return null;
    var cl = CL(), si = ev.stage, out = { name: 'the ' + ev.name, cash: CLD.purse(ev, pos), unlocks: [], note: '' };
    if (pos !== 1) { out.note = 'needed the win'; G.save(); return out; }
    if (cl.won[ev.id]) { out.note = 'won again'; G.save(); return out; }
    var before = G.csec(si), list = G.cupUnlocks(ev).slice();
    cl.won[ev.id] = true;
    if (!ev.champ) { var pk = cl.packs[si] = cl.packs[si] || {}; pk[ev.sec] = 1; }
    list.forEach(function (u) { G.applyUnlock(u); out.unlocks.push(DR.unlockText(u)); });
    var after = G.csec(si);
    if (after > before) cl.open[si] = Math.max(cl.open[si] || 0, after);
    if (ev.champ) {
      if (cl.cls === si && si + 1 < DR.CSTAGES.length) { cl.cls = si + 1; out.note = 'CHAMPION! ' + G.cclassName(si + 1).toUpperCase() + ' IS OPEN'; }
      else out.note = 'CHAMPION!';
      if (DR.Phone) DR.Phone.send('ray', 'cup', si);
    } else if (after > before) out.note = after >= CLD.SECTIONS ? 'ALL FIVE SECTIONS DONE: THE ' + G.cupName(si).toUpperCase() + ' IS OPEN' : 'SECTION ' + (after + 1) + ' IS OPEN';
    else out.note = 'event won';
    G.save();
    return out;
  };

  // ---------------------------------------------------------------- entering
  // A ladder event: the lock, the field of regulars, the week marked
  var enter0 = T.enter;
  T.enter = function (clsId, uid, drvId, tid, opts) {
    var ev = opts && opts.ev;
    if (ev && ev.cl) {
      var why = G.cupLock(ev); if (why) return { msg: why };
      var o = {}; for (var k in opts) o[k] = opts[k];
      o.field = CLD.field(ev);
      var res = enter0.call(this, ev.cls, uid, drvId, ev.track, o);
      if (res.race) CLD.markEntered(ev);
      return res;
    }
    return enter0.apply(this, arguments);
  };

  // ---------------------------------------------------------------- the shop's tags
  G.cupUnlockWhere = function (grp, lvl) {
    function hit(list) { return list.some(function (u) { var p = u.split(':'); return p[0] === 'cperf' && (p[1] === grp || p[1] === 'all') && +p[2] >= lvl; }); }
    for (var si = 0; si < DR.CSTAGES.length; si++) {
      var cs = DR.CSTAGES[si];
      for (var s = 0; s < CLD.SECTIONS; s++) if (hit(cs.packs[s])) return 'Circuit ' + (si + 1) + ', section ' + (s + 1);
      if (hit(cs.champ.unlocks)) return 'Circuit ' + (si + 1) + ' Championship';
    }
    return 'Locked';
  };
  var carWhere0 = G.carUnlockWhere;
  G.carUnlockWhere = function (carId) {
    var id = DR.CAR_UNLOCK[carId];
    if (id && id.charAt(0) === 'C') { var p = id.slice(1).split('.'); return p[1] === 'CH' ? 'Circuit ' + (+p[0] + 1) + ' Championship' : 'Circuit ' + (+p[0] + 1) + ', section ' + (+p[1] + 1); }
    return carWhere0(carId);
  };

  // ---------------------------------------------------------------- saves
  // The circuit career starts over at class 1 (the owner's call): saves
  // from before keep everything the old race days and Cups opened (given
  // again here, never taken away), and the ladder's own unlocks.
  var sync0 = G.syncUnlocks;
  G.syncUnlocks = function () {
    sync0();
    var c = C(), cl = CL();
    Object.keys(c.cwon || {}).forEach(function (id) { var m = /^c(\d+)\.(\d+)$/.exec(id); if (m && c.cwon[id]) oldUnlocks(+m[1], +m[2]).forEach(G.applyUnlock); });
    DR.CSTAGES.forEach(function (cs, si) {
      var pk = cl.packs[si] || {};
      for (var s = 0; s < CLD.SECTIONS; s++) if (pk[s]) cs.packs[s].forEach(G.applyUnlock);
      if (cl.won[cs.champ.id]) cs.champ.unlocks.forEach(G.applyUnlock);
    });
  };
})();
