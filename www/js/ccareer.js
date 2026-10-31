// ===========================================================================
// CIRCUIT CAREER — the other half of every stage. ProStreet built its
// career from race days that mixed disciplines and asked you to win them
// all; here each stage has its drag race days (career.js) and four circuit
// race days run by your Race Team, ending in the stage's Circuit Cup. The
// next stage opens when both the drag King and the Circuit Cup are won.
//  * Circuit wins open circuit and shared parts (DR.PART_DISC: brakes,
//    anti-roll bars, aero, cooling, sequential boxes, track tires) and the
//    road-course cars; drag wins open drag and shared parts.
//  * No class floor here: the field is set by the stage (its class's pace,
//    a little quicker race by race). Early race days ask for a podium,
//    later ones a win.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, T = DR.Team;
  function C() { return G.careerState(); }

  // venues and names, stage by stage (the last is the Cup)
  var VENUES = [
    ['pixel', 'airfield', 'pixel', 'canyon', 'pixel'],
    ['airfield', 'canyon', 'pixel', 'downtown', 'airfield'],
    ['pixel', 'highway', 'canyon', 'downtown', 'highway'],
    ['canyon', 'downtown', 'pixel', 'highway', 'downtown'],
    ['highway', 'airfield', 'canyon', 'pixel', 'pixel'],
    ['downtown', 'canyon', 'highway', 'airfield', 'highway']
  ];
  var NAMES = [
    ['Sunday Track Day', 'Airfield Night Sprint', 'Club Race', 'Canyon Run Shootout'],
    ['Taxiway Feature', 'Switchback Showdown', 'Pixel Raceway Sprint', 'Downtown After Dark'],
    ['Sport Series Opener', 'Route 99 Night Race', 'Canyon Invitational', 'Docks Grand Prix'],
    ['Back Road Feature', 'Tower Block Sprint', 'GT Challenge Round', 'Freeway Feature'],
    ['Midnight Freeway Run', 'Hangar Invitational', 'Canyon Supercar Duel', 'Supercar Trophy Round'],
    ['Downtown Unlimited', 'Canyon King of the Hill', 'Route 99 Unlimited', 'Airfield Grand Prix']
  ];
  var RIVALS = [
    { name: 'Maddie "Apex" Cole', col: '#ff6a00', team: 'Late Apex' },
    { name: 'Dev Okafor', col: '#3aa0ff', team: 'Kerbside' },
    { name: 'Sofia Brandt', col: '#e8e8e8', team: 'Apex Motorsport' },
    { name: 'Kaito Mori', col: '#ff2bd6', team: 'Slipstream' },
    { name: 'Lucia Marchetti', col: '#c8102e', team: 'Redline Racing' },
    { name: 'Erik "The Professor" Lund', col: '#ffd700', team: 'Downforce' }
  ];
  // the road-course cars come from here, not the drag strip
  var CARS = { '1.1': ['m3'], '1.4': ['s2k'], '2.1': ['rx7'], '3.0': ['z06'], '3.4': ['gtr'], '4.2': ['p911'] };
  var TRACKS = [['tires'], ['susp'], ['engine'], ['drive', 'body'], null];   // what each race day opens (null: the Cup, everything)
  var TOP = [3, 3, 1, 1, 1], NEED = [0, 0, 1, 2, 3], PACE = [5, 3.5, 2, 1, 0.3], AI = [[-8, -6], [-4, -2], [0, 0], [3, 3], [8, 8]], CASH = [1.6, 2, 2.6, 3, 8];

  DR.CSTAGES = DR.STAGES.map(function (st, si) {
    var cls = T.classById(T.stageClass(si)), lvl = Math.min(5, si + 2), evs = [];
    for (var i = 0; i < 5; i++) {
      var tid = VENUES[si][i], ev = {
        id: 'c' + si + '.' + i, stage: si, idx: i, cup: i === 4, cls: cls.id, track: tid,
        name: i === 4 ? st.name + ' Circuit Cup' : NAMES[si][i],
        laps: T.lapsAt(cls, tid) + (i === 4 ? 2 : 0), top: TOP[i], needWins: NEED[i], pace: PACE[i],
        ai: [Math.max(10, cls.ai[0] + AI[i][0]), Math.min(97, cls.ai[1] + AI[i][1])],
        cash: Math.round(st.base * CASH[i] / 10) * 10, fee: Math.round(st.base * 0.35 / 10) * 10,
        rival: i === 4 ? RIVALS[si] : null, unlocks: []
      };
      // parts: up to the level this stage's drag races open, for its tracks
      if (si < 4) (TRACKS[i] || ['all']).forEach(function (t) { ev.unlocks.push('cperf:' + t + ':' + lvl); });
      (CARS[si + '.' + i] || []).forEach(function (id) { ev.unlocks.push('car:' + id); DR.CAR_UNLOCK[id] = ev.id; DR.CAR_STAGE[id] = si; });
      evs.push(ev);
    }
    return { events: evs.slice(0, 4), cup: evs[4], all: evs };
  });
  G.cupEvent = function (id) { var p = String(id).slice(1).split('.'), cs = DR.CSTAGES[+p[0]]; return cs ? cs.all[+p[1]] : null; };
  G.cupWon = function (si) { var cs = DR.CSTAGES[si]; return !!(cs && C().cwon[cs.cup.id]); };
  G.cupName = function (si) { return DR.CSTAGES[si].cup.name; };
  G.cupWins = function (si) { return DR.CSTAGES[si].events.filter(function (ev) { return C().cwon[ev.id]; }).length; };
  // why a circuit race day can't be entered yet ('' = it can)
  G.cupLock = function (ev) {
    var c = C();
    if (ev.stage > c.stage) return 'Finish stage ' + ev.stage + ' first';
    var w = G.cupWins(ev.stage);
    if (w < ev.needWins) return 'Meet the goal at ' + (ev.needWins - w) + ' more circuit race day' + (ev.needWins - w > 1 ? 's' : '') + ' in this stage';
    if (T.active().some(function (r) { return r.ev === ev.id; })) return 'Your team is racing it now';
    return '';
  };
  // A finished career race: the purse and unlocks if the goal was met
  // (a rerun pays 35%, like the strip). Returns { name, cash, unlocks, note }.
  G.cupFinish = function (id, pos) {
    var ev = G.cupEvent(id); if (!ev) return null;
    var c = C(), met = pos <= ev.top, first = met && !c.cwon[ev.id], out = { name: 'the ' + ev.name, cash: 0, unlocks: [], note: '' };
    if (!met) { out.note = ev.top === 1 ? 'needed the win' : 'needed a podium'; return out; }
    out.cash = first ? ev.cash : Math.round(ev.cash * 0.35);
    if (first) {
      c.cwon[ev.id] = true;
      ev.unlocks.forEach(function (u) { G.applyUnlock(u); out.unlocks.push(DR.unlockText(u)); });
      if (ev.cup) {
        var adv = G.tryAdvance(ev.stage);
        out.note = adv ? adv.toUpperCase() : 'CUP WON! Beat the King of ' + DR.STAGES[ev.stage].name + ' on the strip to open stage ' + (ev.stage + 2);
        if (DR.Phone) DR.Phone.send('ray', 'cup', ev.stage);
      } else out.note = 'goal met';
    }
    G.save();
    return out;
  };
  // where a circuit part opens, for the shop's lock tag
  G.cupUnlockWhere = function (grp, lvl) {
    for (var si = 0; si < DR.CSTAGES.length; si++) {
      var all = DR.CSTAGES[si].all;
      for (var i = 0; i < all.length; i++) {
        if (all[i].unlocks.some(function (u) { var p = u.split(':'); return p[0] === 'cperf' && (p[1] === grp || p[1] === 'all') && +p[2] >= lvl; }))
          return 'Circuit S' + (si + 1) + ': ' + all[i].name;
      }
    }
    return 'Locked';
  };
  var carWhere0 = G.carUnlockWhere;
  G.carUnlockWhere = function (carId) {
    var id = DR.CAR_UNLOCK[carId];
    if (id && id.charAt(0) === 'c') { var ev = G.cupEvent(id); return 'Circuit S' + (ev.stage + 1) + ': ' + ev.name; }
    return carWhere0(carId);
  };
  // Saves from before: the stages already behind them count as done on the
  // circuit too (their Cups and race days, with what those open).
  var sync0 = G.syncUnlocks;
  G.syncUnlocks = function () {
    sync0();
    var c = C();
    DR.CSTAGES.forEach(function (cs, si) {
      cs.all.forEach(function (ev) {
        if (si < c.stage) c.cwon[ev.id] = true;
        if (c.cwon[ev.id]) ev.unlocks.forEach(G.applyUnlock);
      });
    });
  };
})();
