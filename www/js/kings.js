// ===========================================================================
// THE BRACKET AND NO-PREP KINGS (career ladder, build 4). Each King has its
// own ladder first:
//  - The Bracket King: every Bracket event puts its points (IRP style) on a
//    bracket points list, yours and the regulars'. With 6 Bracket events
//    finished and a top-8 spot, you're invited to the King of the Track on
//    the last Sunday (Summit Racing's King of the Track: winners race head
//    to head on dial-ins): three rounds against three of the list's top
//    regulars, a loss ends your day, then the Bracket King.
//  - The No-Prep King: after 3 No-Prep events, a top-10 no-prep list (Street
//    Outlaws' list): call out #10, then anyone up to two spots above you,
//    one race a no-prep night; take their spot. Beat #1 and the No-Prep
//    King races you on the last Friday night.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, C = function () { return G.careerState(); };
  var KL = DR.KingLadders = {};
  KL.TOP = 8;            // invited to the King of the Track
  KL.KOTT_ROUNDS = 3;    // rounds before the Bracket King
  KL.NP_OPEN = 3;        // No-Prep events finished to get on the list
  KL.NP_REACH = 2;       // spots above you a callout can reach
  function wStart(slot) { var w = !DR.SCHED_OFF && G.slotWindow ? G.slotWindow(slot) : null; return w && w.open ? w.start : DR.SCHED_OFF ? 'test' : null; }
  function regKey(o) { return o.reg ? o.reg[0] + '.' + o.reg[1] : null; }
  function regOf(key) { var p = key.split('.'); return { si: +p[0], r: +p[1], R: DR.ROSTER[+p[0]][+p[1]] }; }

  // ---------------------------------------------------------------- bracket points
  function bp() { var c = C(); c.bkp = c.bkp || { me: 0, r: {} }; return c.bkp; }
  G.onAward = function (ev, given) {
    if (!ev || ev.type !== 'bracket') return;
    var b = bp(); b.me += given.me || 0;
    given.regs.forEach(function (x) { var k = regKey(x[0]); if (k) b.r[k] = (b.r[k] || 0) + x[1]; });
    G.save();
  };
  // the list: you and every regular with points, most points first
  KL.bracketList = function () {
    var b = bp(), rows = [{ me: true, name: 'You', pts: b.me }];
    Object.keys(b.r).forEach(function (k) { var g = regOf(k); rows.push({ key: k, name: g.R.name, carId: g.R.carId, si: g.si, pts: b.r[k] }); });
    rows.sort(function (a, c) { return c.pts - a.pts || (a.me ? -1 : c.me ? 1 : 0); });
    return rows;
  };
  KL.bracketRank = function () { var L = KL.bracketList(); for (var i = 0; i < L.length; i++) if (L[i].me) return i + 1; return L.length; };
  // the regulars at the King of the Track: the top of the list (filled from
  // the quickest regulars of the highest class you've reached)
  KL.kottField = function () {
    var keys = KL.bracketList().filter(function (x) { return !x.me; }).slice(0, KL.TOP - 1).map(function (x) { return x.key; });
    for (var si = Math.min(C().stage, DR.STAGES.length - 1); si >= 0 && keys.length < KL.TOP - 1; si--)
      DR.ROSTER[si].forEach(function (R, r) { var k = si + '.' + r; if (R.rung && keys.length < KL.TOP - 1 && keys.indexOf(k) < 0) keys.push(k); });
    return keys;
  };
  // the day's draw: three of the field (fixed for the day), then the King
  var KB = DR.KINGS.bracket.ev, KING_B = KB.opps[KB.opps.length - 1];
  KL.kottPrepare = function () {
    var c = C(), w = wStart('kingb') || 'next', k = c.kott;
    // picked ahead of the day: they're the day's field once it starts
    if (k && k.w === 'next' && w !== 'next') { k.w = w; G.save(); }
    if (!k || k.w !== w) {
      var f = KL.kottField().slice(), picks = [];
      while (picks.length < KL.KOTT_ROUNDS && f.length) picks.push(f.splice(Math.floor(Math.random() * f.length), 1)[0]);
      c.kott = k = { w: w, picks: picks, lost: false };
      G.save();
    }
    KB.opps = k.picks.map(function (key) { var g = regOf(key); return DR.regOpp(g.si, g.r, 4); }).concat([KING_B]);
    return KB;
  };

  // ---------------------------------------------------------------- the no-prep list
  // #1 and #2 class 6's quickest, #3-#5 class 5's, #6-#8 class 4's, #9 and
  // #10 class 3's, in their King-ladder builds; ordered by their no-prep
  // eighth (quickest #1)
  var NP_PICK = [[5, 2], [4, 3], [3, 3], [2, 2]];
  KL.npDefault = function () {
    var out = [];
    NP_PICK.forEach(function (pk) {
      var si = pk[0], rows = DR.ROSTER[si].map(function (R, r) { return { R: R, r: r }; }).filter(function (x) { return x.R.rung; });
      rows.sort(function (a, b) { return (a.R.rung.et || 99) - (b.R.rung.et || 99); });
      rows.slice(0, pk[1]).forEach(function (x) { out.push(si + '.' + x.r); });
    });
    return out;
  };
  // c.npl.order: ten spots, #1 first: a regular's key, or 'me'
  function npl() { var c = C(); if (!c.npl) c.npl = { order: KL.npDefault(), night: null }; var s = c.npl; s.me = s.order.indexOf('me') + 1 || null; return s; }
  KL.npState = npl;
  KL.npRows = function () {
    return npl().order.map(function (k, i) {
      if (k === 'me') return { me: true, name: 'You', rank: i + 1 };
      var g = regOf(k); return { key: k, name: g.R.name, carId: g.R.carId, si: g.si, rank: i + 1 };
    });
  };
  DR.EVENT_TYPES.npcall = { name: 'No-Prep Callout', dist: function () { return DR.EIGHTH; }, theme: 'street', grip: 0.92 };
  // the callout event for the racer at a rank (a fresh object each time)
  KL.npEvent = function (rank) {
    var row = KL.npRows()[rank - 1]; if (!row || row.me) return null;
    var g = regOf(row.key), o = DR.regOpp(g.si, g.r, 'rung');
    return { type: 'npcall', id: 'K.np.' + row.key, idx: 'Np', np: rank, opps: [o], cash: Math.round(DR.STAGES[g.si].base * 0.6 / 10) * 10, unlocks: [], needWins: 0, stars: 0, side: true, special: true };
  };
  KL.npLock = function (rank) {
    var s = npl();
    if (G.themeDone('noprep') < KL.NP_OPEN) return 'Finish ' + KL.NP_OPEN + ' No-Prep events to get a shot at the list (you have ' + G.themeDone('noprep') + ')';
    var top = s.me ? s.me - 1 : 10, low = s.me ? Math.max(1, s.me - KL.NP_REACH) : 10;
    if (rank > top || rank < low) return s.me ? 'From #' + s.me + ' you can call out #' + low + (low < top ? ' to #' + top : '') : 'Call out #10 first';
    if (!DR.SCHED_OFF) {
      var w = wStart('satn');
      if (!w) return 'Callouts are on no-prep nights (Saturday, 6 PM-1 AM)';
      if (s.night === w) return 'One callout a night: the next no-prep night';
    }
    return '';
  };

  // ---------------------------------------------------------------- the locks, the slots, the conditions
  var lock0 = G.eventLock;
  G.eventLock = function (ev) {
    if (ev && ev.type === 'npcall') return KL.npLock(ev.np);
    return lock0.apply(this, arguments);
  };
  var klock0 = G.kingLock;
  G.kingLock = function (d) {
    if (d === 'bracket') {
      if (G.kingWon('bracket')) return '';
      var have = G.themeDone('bracket');
      if (have < DR.KING_EVENTS) return 'Finish ' + DR.KING_EVENTS + ' Bracket events (you have ' + have + ')';
      var rk = KL.bracketRank();
      if (rk > KL.TOP) return 'The top ' + KL.TOP + ' on the bracket points are invited: you\'re #' + rk;
      var k = C().kott, w = wStart('kingb');
      if (k && k.lost && w && k.w === w) return 'Out at the King of the Track today: next month\'s, the last Sunday';
      return '';
    }
    if (d === 'street') {
      if (G.kingWon('street')) return '';
      var s = npl();
      if (s.me !== 1) return 'Get to #1 on the no-prep list first' + (s.me ? ' (you\'re #' + s.me + ')' : '');
      var ks = C().npk, w2 = wStart('kingst');
      if (ks && ks === w2) return 'Lost to the King tonight: the next one is the last Friday of next month';
      return '';
    }
    return klock0.apply(this, arguments);
  };
  var slot0 = DR.evSlot;
  DR.evSlot = function (ev) { return ev && ev.type === 'npcall' ? 'satn' : slot0.apply(this, arguments); };
  var cond0 = DR.evCond;
  DR.evCond = function (ev) { return ev && ev.type === 'npcall' ? { surface: 'noprep', night: true } : cond0.apply(this, arguments); };
  var cfg0 = DR.Race.eventCfg;
  DR.Race.eventCfg = function (ev, round) {
    if (ev && ev.king === 'bracket') KL.kottPrepare();
    var cfg = cfg0.apply(this, arguments);
    if (ev && (ev.type === 'npcall' || ev.king === 'street')) cfg.noTimes = true;
    return cfg;
  };
  var name0 = DR.raceDayName;
  DR.raceDayName = function (ev) {
    if (ev && ev.type === 'npcall') return 'No-Prep List: #' + ev.np;
    if (ev && ev.king === 'bracket') return 'King of the Track';
    return name0.apply(this, arguments);
  };

  // ---------------------------------------------------------------- results
  // a loss: out of the King of the Track for the day; a callout used for
  // the night; a loss to the No-Prep King for the night
  var after0 = G.afterRun;
  G.afterRun = function (cfg, r) {
    var out = after0.apply(this, arguments), c = C(), ev = cfg.ev;
    if (ev && !r.testDrive && r.win === false) {
      if (ev.king === 'bracket' && c.kott) { c.kott.lost = true; G.save(); }
      if (ev.king === 'street') { c.npk = wStart('kingst'); G.save(); }
    }
    if (ev && ev.type === 'npcall' && r.win != null && !r.testDrive) { npl().night = wStart('satn'); G.save(); }
    return out;
  };
  var win0 = G.winEvent;
  G.winEvent = function (ev) {
    if (ev && ev.type === 'npcall') {
      // you take their spot: they, and everyone between, move down one (off
      // the list: #10 drops off)
      var s = npl(), i = s.order.indexOf('me');
      if (i >= 0) s.order.splice(i, 1); else s.order.pop();
      s.order.splice(ev.np - 1, 0, 'me'); s.me = ev.np;
      G.save();
      return { purse: ev.cash, cash: ev.cash, unlocks: [], money: [], lines: [], first: true, banner: 'You\'re #' + ev.np + ' on the no-prep list' + (ev.np === 1 ? ': the No-Prep King will race you (the last Friday night)' : '') };
    }
    return win0.apply(this, arguments);
  };
})();

// ---------------------------------------------------------------- the Kings tab: the two ladders
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, h = UI.h, btn = UI.btn, KL = DR.KingLadders;
  UI.kingExtra = function (d) {
    if (d === 'bracket') {
      var L = KL.bracketList(), rk = KL.bracketRank();
      return h('div', { class: 'kextra' },
        h('div', { class: 'plvl' }, 'BRACKET POINTS • you\'re #' + rk),
        L.slice(0, 10).map(function (x, i) { return h('div', { class: 'lrow' + (x.me ? ' you' : '') }, h('span', { class: 'lpos' }, '#' + (i + 1)), h('div', { class: 'grow' + (x.me ? ' acc' : '') }, x.name, x.carId ? h('span', { class: 'dim gsmall' }, ' • ' + DR.CARS[x.carId].name) : null), h('span', { class: 'gsmall' }, x.pts + ' pts')); }),
        h('div', { class: 'gsmall dim' }, 'Every Bracket event you race puts its points here, yours and the field\'s. The top ' + KL.TOP + ' (and ' + DR.KING_EVENTS + ' Bracket events finished) are invited to the King of the Track, the last Sunday: three rounds on dial-ins against the list\'s best, a loss ends your day, then the Bracket King.'));
    }
    if (d === 'street') {
      var s = KL.npState(), rows = KL.npRows();
      return h('div', { class: 'kextra' },
        h('div', { class: 'plvl' }, 'THE NO-PREP LIST' + (s.me ? ' • you\'re #' + s.me : '')),
        rows.map(function (x) {
          var lock = x.me ? '' : KL.npLock(x.rank), ev = x.me ? null : KL.npEvent(x.rank);
          return h('div', { class: 'lrow' + (x.me ? ' you' : '') }, h('span', { class: 'lpos' }, '#' + x.rank), h('div', { class: 'grow' + (x.me ? ' acc' : '') }, x.name, x.carId ? h('span', { class: 'dim gsmall' }, ' • ' + DR.CARS[x.carId].name) : null),
            x.me ? null : lock ? h('span', { class: 'dim gsmall' }, '') : btn('Call out', function () { DR.Race.raceDay(DR.Race.eventCfg(ev, 0), 'No-Prep List: #' + x.rank + ' ' + x.name); }, 'small red'));
        }),
        h('div', { class: 'gsmall dim' }, (KL.npLock(s.me ? s.me - 1 : 10) || 'Your callout is open tonight.') + ' One callout a no-prep night (Saturday, 6 PM-1 AM): #10 first, then anyone up to ' + KL.NP_REACH + ' spots above you. Win and you take their spot. Beat #1 and the No-Prep King races you on the last Friday night.'));
    }
    return null;
  };
})();
