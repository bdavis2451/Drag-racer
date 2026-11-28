// ===========================================================================
// PROMOTER — host your own events (Juiced's best idea, taken further).
//  * A promoter permit (a year, and a clean record: no tickets in the last
//    30 days) and insurance on every event.
//  * Venues by reputation: a parking-lot night behind the Taco Shack, the
//    old airfield, a weeknight rental of Pixel Dragway, then a Sunday-night
//    invitational.
//  * You set the format (heads-up 1/8 or 1/4, a bracket, no-prep), the class
//    rule, the entry fee, the purse and how much to spend promoting it. The
//    field fills by how good it looks (purse against fee, your rep, the
//    promotion, the rules); the crowd pays at the gate.
//  * On the night: race it yourself (or send your driver) through an
//    eight-car ladder, or run it from the tower and bet on a favourite.
//    Outdoor venues can rain out (insurance pays half the rental).
//  * Promoter rep grows with full fields and a profit, and drops with a flop.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, h = UI.h, btn = UI.btn, A = DR.Audio, CAL = DR.Cal;
  var P = DR.Promo = {};
  P.PERMIT = 500; P.PERMIT_H = 365 * 24;
  P.VENUES = {
    lot: { name: 'Taco Shack parking lot', blurb: 'The owner looks the other way if you buy the tacos. Street cars, a crowd of friends.', rent: 150, ins: 0, cap: 16, ticket: 10, spect: 0.6, rep: 0, outdoor: true,
      win: [{ wd: [0, 1, 2, 3, 4], from: 21, to: 25 }], fmts: ['np18'] },
    airfield: { name: 'The old airfield', blurb: 'Bare concrete, generators and floodlights. No-prep the way it started.', rent: 1200, ins: 400, cap: 24, ticket: 10, spect: 1, rep: 20, outdoor: true,
      win: [{ wd: [1, 2, 3, 4], from: 20, to: 24 }], fmts: ['np18'] },
    strip: { name: 'Pixel Dragway (weeknight rental)', blurb: 'The strip, the tower, the timing system and a prepped track, rented for the night.', rent: 2500, ins: 600, cap: 32, ticket: 15, spect: 1.4, rep: 20,
      win: [{ wd: [1, 2, 3, 4], from: 18, to: 23 }], fmts: ['hu18', 'hu14', 'bk14'] },
    invite: { name: 'Pixel Dragway Invitational (Sunday night)', blurb: 'Your name on the marquee. The big crowd, the big cars.', rent: 6000, ins: 1500, cap: 32, ticket: 25, spect: 2.5, rep: 50,
      win: [{ wd: [0], from: 17, to: 22 }], fmts: ['hu14', 'bk14'] }
  };
  P.FMTS = {
    hu18: { name: 'Heads-up 1/8', type: 'hostko', dist: 'e', theme: 'strip', grip: 1, surface: 'prep' },
    hu14: { name: 'Heads-up 1/4', type: 'hostko', dist: 'q', theme: 'strip', grip: 1, surface: 'prep' },
    bk14: { name: 'Bracket 1/4', type: 'hostbk', dist: 'q', theme: 'strip', grip: 1, surface: 'prep' },
    np18: { name: 'No-prep 1/8', type: 'hostnp', dist: 'e', theme: 'street', grip: 0.92, surface: 'noprep' }
  };
  P.PROMO = [['None', 0, 0], ['Flyers', 100, 0.1], ['Radio spots', 500, 0.2], ['Magazine ad', 1500, 0.32]];
  DR.EVENT_TYPES.hostko = { name: 'Your event', dist: function () { return DR.QUARTER; }, theme: 'strip', grip: 1 };
  DR.EVENT_TYPES.hostbk = { name: 'Your bracket race', dist: function () { return DR.QUARTER; }, theme: 'strip', grip: 1 };
  DR.EVENT_TYPES.hostnp = { name: 'Your no-prep night', dist: function () { return DR.EIGHTH; }, theme: 'street', grip: 0.92 };
  // hosted events carry their own conditions and distance
  var cond0 = DR.evCond; DR.evCond = function (ev) { return ev && ev.hostCond ? ev.hostCond : cond0.apply(this, arguments); };
  var mr0 = DR.multiRound; DR.multiRound = function (ev) { return !!ev && ev.hosted ? ev.opps.length > 1 : mr0(ev); };
  var ec0 = DR.Race.eventCfg; DR.Race.eventCfg = function (ev, round) { var c = ec0.apply(this, arguments); if (ev.hosted) { c.dist = ev.hostDist; c.theme = ev.hostTheme; c.grip = ev.hostGrip; c.hosted = true; } return c; };
  var rdn0 = DR.raceDayName; DR.raceDayName = function (ev) { return ev && ev.hosted ? ev.title : rdn0.apply(this, arguments); };
  var lock0 = G.eventLock; G.eventLock = function (ev) { return ev && ev.hosted ? '' : lock0.apply(this, arguments); };
  var won0 = G.eventWon; G.eventWon = function (ev) { return ev && ev.hosted ? false : won0.apply(this, arguments); };
  var rew0 = G.eventReward; G.eventReward = function (ev) { return ev && ev.hosted ? 0 : rew0.apply(this, arguments); };

  function S() { var s = G.state; if (!s.promo) s.promo = { permit: 0, rep: 0, events: [], hist: [], nid: 1 }; return s.promo; }
  P.state = S;
  P.permitOk = function () { return S().permit > G.now(); };
  P.permitIssue = function () {
    if (G.state.lastTicket && G.now() - G.state.lastTicket < 30 * 24) return 'City Hall won\'t issue a permit with a ticket in the last 30 days (yours: ' + CAL.fmt(G.state.lastTicket, { noTime: true }) + ')';
    if (!G.canAfford(P.PERMIT)) return 'The permit costs ' + DR.money(P.PERMIT);
    return '';
  };
  P.buyPermit = function () { var w = P.permitIssue(); if (w) return w; G.pay(P.PERMIT); S().permit = G.now() + P.PERMIT_H; G.save(); return ''; };
  P.repName = function (r) { return r >= 80 ? 'Big time' : r >= 50 ? 'Known' : r >= 20 ? 'Local' : 'Unknown'; };
  function stageBase() { var c = G.careerState(); return DR.STAGES[Math.min(c.stage, DR.STAGES.length - 1)].base; }
  // the venue's windows in the next three weeks, without a clash
  P.dates = function (vid) {
    var V = P.VENUES[vid], out = [], now = G.now(), d0 = CAL.dayStart(now), taken = {};
    S().events.forEach(function (e) { if (e.status === 'planned') taken[CAL.dayStart(e.t)] = 1; });
    for (var k = 1; k <= 21; k++) {
      var d = d0 + k * 24, dt = CAL.date(d);
      V.win.forEach(function (w) { if (w.wd.indexOf(dt.wd) >= 0 && !taken[d]) out.push({ start: d + w.from, end: d + w.to }); });
    }
    return out;
  };
  // the numbers: how many come, how many watch, what it costs
  P.project = function (pl) {
    var V = P.VENUES[pl.venue], rep = S().rep, b = stageBase(), pr = P.PROMO[pl.promo || 0];
    var purseK = Math.min(1.6, pl.purse / (b * 4)), feeK = Math.min(2, pl.fee / Math.max(50, b * 0.5));
    // racers weigh the entry against what they could win: nobody pays half
    // the purse or more to enter, and it only fills up when the purse is
    // many times the entry (about 8x and up)
    var ratio = pl.fee > 0 ? pl.purse / pl.fee : 99, worth = pl.fee > 0 ? Math.max(0, Math.min(1, (ratio - 2) / 6)) : 1;
    var attract = Math.max(0.05, Math.min(1.3, 0.45 + 0.5 * purseK - 0.3 * feeK + pr[2] + rep / 250)) * (pl.rule && pl.rule !== 'open' ? 0.8 : 1) * worth;
    var mid = Math.max(worth > 0 ? 2 : 1, Math.min(V.cap, Math.round(V.cap * (0.45 + rep / 200) * attract * 1.6)));
    var spect = Math.round((mid * 5 + rep * 4 + purseK * 25) * V.spect * (1 + (pl.promo || 0) * 0.4));
    var costs = V.rent + V.ins + pr[1];
    return { field: mid, noShow: worth <= 0, lo: Math.max(mid > 1 ? 2 : 1, Math.round(mid * 0.75)), hi: Math.min(V.cap, Math.round(mid * 1.25)), spect: spect, gate: spect * V.ticket, entries: (mid - 1) * pl.fee, costs: costs,
      net: (mid - 1) * pl.fee + spect * V.ticket - costs - pl.purse };
  };
  P.plan = function (pl) {
    if (P.project(pl).noShow) return 'Nobody would enter: the purse has to be well over the entry fee';
    var V = P.VENUES[pl.venue], s = S();
    if (!P.permitOk()) return 'You need a promoter permit';
    if (s.rep < V.rep) return 'Venues like that want a promoter with ' + V.rep + ' rep (you: ' + Math.round(s.rep) + ')';
    var dep = V.rent + V.ins + P.PROMO[pl.promo || 0][1];
    if (!G.canAfford(dep)) return 'Booking takes the rental, insurance and promotion up front: ' + DR.money(dep);
    G.pay(dep);
    var e = { id: s.nid++, venue: pl.venue, fmt: pl.fmt, rule: pl.rule || 'open', fee: pl.fee, purse: pl.purse, promo: pl.promo || 0, t: pl.start, end: pl.end, status: 'planned', paid: dep };
    s.events.push(e); G.save();
    return '';
  };
  P.cancel = function (id) { var s = S(), e = s.events.filter(function (x) { return x.id === id; })[0]; if (!e) return; e.status = 'cancelled'; G.earn(Math.round(e.paid * 0.5)); s.rep = Math.max(0, s.rep - 5); G.save(); };
  P.title = function (e) { return (S().rep >= 50 ? '' : '') + P.FMTS[e.fmt].name + (e.rule !== 'open' ? ' (' + DR.CLASSES[e.rule].name + ')' : '') + ' at ' + P.VENUES[e.venue].name.replace(/ \(.*\)/, ''); };

  // ---------------------------------------------------------------- the night
  var NAMES = ['Spike', 'Rico', 'Jade', 'Duke', 'Sasha', 'Moose', 'Ziggy', 'Nova', 'Blaze', 'Cruz', 'Vega', 'Slim', 'Tex', 'Gunner', 'Roxy', 'Dash', 'Bubba', 'Kit', 'Mags', 'Ace'];
  var pool = null;
  function poolFor(fmt) {
    if (!pool) { pool = []; DR.STAGES.forEach(function (st) { st.all.forEach(function (ev) { ev.opps.forEach(function (o) { pool.push(o); }); }); }); }
    var F = P.FMTS[fmt], dist = F.dist === 'e' ? DR.EIGHTH : DR.QUARTER;
    return pool.map(function (o) { return { o: o, et: G.estimate(G.oppInst(o), dist, F.grip).et }; }).filter(function (x) { return x.et < 90; });
  }
  // who shows up: near your car's pace, quicker the bigger the purse
  function buildField(e) {
    var pr = P.project(e), n = Math.max(2, Math.min(P.VENUES[e.venue].cap, Math.round(pr.field * (0.85 + Math.random() * 0.3))));
    var F = P.FMTS[e.fmt], dist = F.dist === 'e' ? DR.EIGHTH : DR.QUARTER, mine = G.estimate(G.car(), dist, F.grip).et;
    var center = mine * (1 - 0.03 * Math.min(1.5, e.purse / (stageBase() * 4)));
    var rule = DR.CLASSES[e.rule], cands = poolFor(e.fmt).filter(function (x) { return !rule || rule.ok(DR.buildSpec(G.oppInst(x.o))); });
    cands.sort(function (a, b) { return Math.abs(a.et - center) - Math.abs(b.et - center) + (Math.random() - 0.5) * 0.4; });
    var out = cands.slice(0, n - 1).map(function (x, i) { var o = Object.assign({}, x.o); o.name = NAMES[(e.id * 7 + i) % NAMES.length] + ' ' + String.fromCharCode(65 + (i % 26)) + '.'; o.color = DR.PAINTS[(i * 5 + e.id) % DR.PAINTS.length]; o.et = x.et; return o; });
    out.sort(function (a, b) { return a.et - b.et; });
    return out;
  }
  // an AI match: the quicker car, usually (the driver, the light, luck)
  function sim(a, b) { var ta = a.et + (Math.random() - 0.5) * 0.12 * (1.3 - (a.skill || 0.6)) + (Math.random() < 0.04 ? 9 : 0), tb = b.et + (Math.random() - 0.5) * 0.12 * (1.3 - (b.skill || 0.6)) + (Math.random() < 0.04 ? 9 : 0); return ta <= tb ? a : b; }
  // the eight-car ladder (the quickest qualify), without you: its winner
  function runLadder(field) {
    var q = field.slice(0, 8); if (q.length < 2) return q[0] || null;
    while (q.length > 1) { var nx = []; for (var i = 0; i < q.length; i += 2) nx.push(q[i + 1] ? sim(q[i], q[i + 1]) : q[i]); q = nx; }
    return q[0];
  }
  // settle: money in and out, rep, the record
  function settle(e, winnerName, youWon, betLine) {
    var s = S(), pr = P.project(e), n = e.field ? e.field.length + 1 : pr.field, lines = [];
    var spect = Math.round(pr.spect * (n / Math.max(1, pr.field))), gate = spect * P.VENUES[e.venue].ticket, entries = (n - 1) * e.fee;
    var net = gate + entries - (youWon ? 0 : e.purse);
    G.earn(gate + entries); if (!youWon) G.pay(e.purse);
    lines.push(['Entries (' + (n - 1) + ' cars × ' + DR.money(e.fee) + ')', entries], ['Gate (' + spect + ' fans × ' + DR.money(P.VENUES[e.venue].ticket) + ')', gate],
      ['Venue, insurance & promotion (paid up front)', -e.paid], [youWon ? 'Purse: you won it, it stays in your pocket' : 'Purse to ' + winnerName, youWon ? 0 : -e.purse]);
    var profit = net - e.paid, drep = (n >= 8 ? 5 : n >= 6 ? 2 : -8) + (profit > 0 ? 3 : profit < -e.paid ? -4 : 0) + (spect > 150 ? 2 : 0);
    s.rep = Math.max(0, Math.min(100, s.rep + drep));
    e.status = 'done'; e.profit = profit; e.winner = winnerName; e.n = n;
    s.hist.unshift({ title: P.title(e), t: e.t, profit: profit, n: n, winner: winnerName }); s.hist = s.hist.slice(0, 12);
    G.save();
    var close;
    close = UI.modal([h('div', { class: 'pix acc' }, 'THE BOOKS • ' + P.title(e).toUpperCase()),
      h('div', {}, 'Winner: ', h('b', { class: youWon ? 'good' : 'acc' }, youWon ? 'You!' : winnerName)),
      h('div', { class: 'col' }, lines.map(function (l) { return h('div', { class: 'row jobrow' }, h('span', { class: 'grow' }, l[0]), h('span', { class: l[1] < 0 ? 'bad' : 'good' }, (l[1] > 0 ? '+' : '') + DR.money(l[1]))); })),
      betLine ? h('div', { class: 'acc' }, betLine) : null,
      h('div', { class: 'pix ' + (profit >= 0 ? 'good' : 'bad') }, (profit >= 0 ? 'PROFIT ' : 'LOSS ') + DR.money(Math.abs(profit))),
      h('div', { class: 'gsmall' }, 'Promoter rep ' + (drep >= 0 ? '+' : '') + drep + ' → ' + Math.round(s.rep) + ' (' + P.repName(s.rep) + ')'),
      h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, btn('OK', function () { close(); UI.refresh(); }, 'primary'))]);
    if (DR.Phone && profit > 0 && s.hist.length === 1) DR.Phone.send('ray', 'promoter');
  }
  // the night begins: the field, the crowd, the choice
  P.nightOf = function (e) {
    if (e.status !== 'planned') return;
    var V = P.VENUES[e.venue];
    if (V.outdoor && !e.rainChecked) { e.rainChecked = true; if (Math.random() < 0.08) { e.status = 'rained'; var back = V.ins ? Math.round(V.rent * 0.5) : 0; if (back) G.earn(back); S().rep = Math.max(0, S().rep - 2); G.save(); UI.toast('🌧 Rained out! ' + (back ? 'Insurance pays half the rental: +' + DR.money(back) + '.' : 'No insurance on a parking lot: the money\'s gone.')); return; } }
    if (!e.field) { e.field = buildField(e); G.save(); }
    var close, betOn = null, betAmt = Math.min(1000, Math.max(0, Math.floor(G.state.money / 4 / 50) * 50)), F = P.FMTS[e.fmt];
    var seeds = e.field.slice(0, 4), odds = [1.6, 2.5, 4, 6];
    close = UI.modal([h('div', { class: 'pix acc' }, 'EVENT NIGHT • ' + P.title(e).toUpperCase()),
      h('div', {}, (e.field.length + 1) + ' cars signed in (you included) • purse ' + DR.money(e.purse) + ' • entry ' + DR.money(e.fee)),
      h('div', { class: 'gsmall dim' }, 'The quickest: ' + seeds.map(function (o) { return o.name + ' (' + DR.CARS[o.carId].name + ', ' + o.et.toFixed(2) + ')'; }).join(' • ')),
      h('div', { class: 'col', style: { gap: '6px', marginTop: '6px' } },
        btn('Race it (an 8-car ladder: 3 rounds)', function () { close(); raceIt(e); }, 'primary'),
        h('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap', alignItems: 'center' } }, h('span', { class: 'gsmall' }, 'Or run it from the tower and bet ' + DR.money(betAmt) + ' on:'),
          seeds.map(function (o, i) { var bb = btn(o.name + ' ' + odds[i] + 'x', function () { betOn = i; Array.prototype.forEach.call(bb.parentNode.querySelectorAll('.btn'), function (x) { x.classList.remove('on'); }); bb.classList.add('on'); }, 'chip small'); return bb; })),
        btn('Run it from the tower', function () {
          close();
          var w = runLadder(e.field), betLine = null;
          if (betOn != null && betAmt > 0) { var won = w === seeds[betOn]; if (won) { G.earn(Math.round(betAmt * (odds[betOn] - 1))); betLine = 'Your bet on ' + seeds[betOn].name + ' came in: +' + DR.money(Math.round(betAmt * (odds[betOn] - 1))); } else { G.pay(betAmt); betLine = 'Your bet on ' + seeds[betOn].name + ' lost: -' + DR.money(betAmt); } }
          G.advance(3);
          settle(e, w ? w.name : 'nobody', false, betLine);
        }))]);
  };
  // racing your own event: three rounds against the field (the 8th
  // qualifier, the 4th, then the quickest that's left)
  var cur = null;
  function raceIt(e) {
    var F = P.FMTS[e.fmt], f = e.field, opps = [f[Math.min(f.length - 1, 6)], f[Math.min(f.length - 1, 3)], f[0]].filter(Boolean);
    opps = opps.filter(function (o, i) { return opps.indexOf(o) === i; });
    var ev = { id: 'H' + e.id, hosted: e.id, title: P.title(e), type: F.type === 'hostbk' ? 'bracket' : 'knockout', opps: opps.map(function (o) { return Object.assign({}, o); }), stage: G.careerState().stage, idx: 'H', needWins: 0, unlocks: [], cash: 0,
      hostCond: { surface: F.surface, night: true }, hostDist: F.dist === 'e' ? DR.EIGHTH : DR.QUARTER, hostTheme: F.theme, hostGrip: F.grip };
    if (F.type === 'hostbk') ev.type = 'bracket';
    cur = { e: e, ev: ev };
    DR.Race.raceDay(DR.Race.eventCfg(ev, 0), ev.title);
  }
  // your own event: a win is no purse (it's yours already); settle when you're out or you've won it
  var win0 = G.winEvent;
  G.winEvent = function (ev) {
    if (!ev || !ev.hosted) return win0.apply(this, arguments);
    return { purse: 0, cash: 0, unlocks: [], money: [], banner: 'You won your own event!', lines: [], first: false };
  };
  var after0 = G.afterRun;
  G.afterRun = function (cfg, r) {
    var out = after0.apply(this, arguments);
    if (!cfg.ev || !cfg.ev.hosted || !cur || cur.ev.hosted !== cfg.ev.hosted) return out;
    if (r.win === false || r.final) {
      // out: the one who beat you runs on against the rest of your side of the ladder
      var e = cur.e, youWon = !!r.final && r.win, rest = cur.ev.opps.slice(cfg.round || 0);
      var w = youWon ? null : rest.reduce(function (a, b) { return a ? sim(a, b) : b; }, null);
      cur = null;
      setTimeout(function () { settle(e, youWon ? 'you' : (w ? w.name : cfg.ev.opps[cfg.round].name), youWon); }, 1200);
    }
    return out;
  };
  // the night comes (you're there for it, or the clock passes it: your
  // crew runs it from the tower)
  G.onTick(function () {
    var now = G.now(), news = [];
    S().events.forEach(function (e) {
      if (e.status !== 'planned' || now < e.end) return;
      if (!e.field) e.field = buildField(e);
      var w = runLadder(e.field);
      news.push('🏁 Your event ran without you: ' + P.title(e) + '. ' + (w ? w.name + ' won.' : ''));
      setTimeout(function () { settle(e, w ? w.name : 'nobody', false); }, 300);
    });
    return news;
  });
  G.extraAgenda = (function (prev) {
    return function (d0) {
      var out = prev ? prev(d0) || [] : [];
      S().events.forEach(function (e) { if (e.status === 'planned' && CAL.dayStart(e.t) === d0) out.push({ t: e.t, end: e.end, kind: 'host', label: 'Your event: ' + P.title(e), sub: DR.money(e.purse) + ' purse • ' + DR.money(e.fee) + ' entry', go: function () { if (G.now() < e.t) UI.timeNews(G.advanceTo(e.t)); P.nightOf(e); } }); });
      return out;
    };
  })(G.extraAgenda);

  // ---------------------------------------------------------------- the promoter's desk
  UI.Promoter = function () { return h('div', { class: 'screen' }, UI.top('PROMOTER', function () { UI.show(UI.RaceMenu, 'week'); }), h('div', { class: 'content' }, UI.promoterBody())); };
  UI.promoterBody = function () {
    var s = S(), up = s.events.filter(function (e) { return e.status === 'planned'; });
    var permit = P.permitOk() ? h('div', { class: 'good gsmall' }, 'Permit valid till ' + CAL.fmt(s.permit, { noTime: true })) :
      h('div', { class: 'row', style: { gap: '8px', alignItems: 'center' } }, h('span', { class: 'gsmall grow' }, 'A promoter permit from City Hall: ' + DR.money(P.PERMIT) + ' a year, and a clean record (no tickets in the last 30 days).'),
        btn('Get the permit', function () { var w = P.buyPermit(); if (w) return UI.toast(w); UI.refresh(); }, 'small go'));
    return h('div', {},
        h('div', { class: 'trkcard' }, h('div', { class: 'row', style: { gap: '8px' } }, h('div', { class: 'grow' }, h('div', { class: 'pix acc' }, 'Promoter rep ' + Math.round(s.rep) + ' • ' + P.repName(s.rep)),
          h('div', { class: 'gsmall dim' }, 'Full fields and a profit build it; a flop sinks it. 20 rep opens the airfield and the strip, 50 the Sunday invitational.')),
          P.permitOk() ? btn('Plan an event', function () { planModal(); }, 'small go') : null), permit),
        h('div', { class: 'plvl secthead' }, 'BOOKED'),
        up.length ? h('div', { class: 'col' }, up.map(function (e) {
          return h('div', { class: 'calev' }, h('i', { class: 'caldot', style: { background: DR.KCOL.host } }), h('div', { class: 'grow' }, h('div', {}, P.title(e)), h('div', { class: 'gsmall dim' }, CAL.fmt(e.t) + ' • ' + DR.money(e.purse) + ' purse • ' + DR.money(e.fee) + ' entry • ' + P.PROMO[e.promo][0])),
            G.now() >= e.t ? btn('Run the night', function () { P.nightOf(e); }, 'small go') : btn('Go (' + CAL.dur(e.t - G.now()) + ')', function () { UI.goThere(e.t, P.title(e), function () { P.nightOf(e); }); }, 'small'),
            btn('Cancel', function () { UI.confirm('Cancel it? You get half the booking back and your rep takes a knock.', function () { P.cancel(e.id); UI.refresh(); }, 'Cancel it'); }, 'small red'));
        })) : h('div', { class: 'dim' }, 'Nothing booked.'),
        s.hist.length ? h('div', { class: 'plvl secthead' }, 'PAST EVENTS') : null,
        s.hist.length ? h('table', { class: 'trktab' }, s.hist.map(function (x) { return h('tr', {}, h('td', {}, CAL.fmt(x.t, { noTime: true })), h('td', {}, x.title), h('td', { class: 'dim' }, x.n + ' cars • ' + x.winner), h('td', { class: 'num ' + (x.profit >= 0 ? 'good' : 'bad') }, DR.money(x.profit))); })) : null);
  };
  function planModal() {
    var s = S(), vids = Object.keys(P.VENUES), pl = { venue: 'lot', fmt: 'np18', rule: 'open', fee: 0, purse: 0, promo: 1, start: null, end: null }, close;
    var b = stageBase(); pl.fee = Math.round(b * 0.1 / 10) * 10; pl.purse = Math.round(b / 50) * 50;
    var body = h('div', { class: 'col', style: { gap: '4px' } }), proj = h('div', { class: 'trkcard' });
    function chips(opts, cur, on) { return h('div', { class: 'row', style: { gap: '4px', flexWrap: 'wrap' } }, opts.map(function (o) { return btn(o[1], function () { on(o[0]); render(); }, 'chip small' + (o[0] === cur ? ' on' : '') + (o[2] ? ' nofit' : '')); })); }
    function num(label, val, step, on) { var i = h('input', { type: 'number', class: 'tinput', value: String(val), step: String(step), min: '0', style: { maxWidth: '110px' } }); i.addEventListener('change', function () { on(Math.max(0, Math.round(+i.value || 0))); render(); }); return h('div', { class: 'row', style: { gap: '8px', alignItems: 'center' } }, h('span', { class: 'plvl', style: { minWidth: '80px' } }, label), i); }
    function render() {
      var V = P.VENUES[pl.venue];
      if (V.fmts.indexOf(pl.fmt) < 0) pl.fmt = V.fmts[0];
      var dates = P.dates(pl.venue); if (!pl.start || !dates.some(function (d) { return d.start === pl.start; })) { pl.start = dates[0] && dates[0].start; pl.end = dates[0] && dates[0].end; }
      body.innerHTML = '';
      body.appendChild(h('div', { class: 'plvl' }, 'VENUE'));
      body.appendChild(chips(vids.map(function (v) { return [v, P.VENUES[v].name.replace(/ \(.*\)/, ''), s.rep < P.VENUES[v].rep]; }), pl.venue, function (v) { if (s.rep < P.VENUES[v].rep) return UI.toast('Needs ' + P.VENUES[v].rep + ' promoter rep'); pl.venue = v; }));
      body.appendChild(h('div', { class: 'gsmall dim' }, V.blurb + ' Rent ' + DR.money(V.rent) + (V.ins ? ' + insurance ' + DR.money(V.ins) : '') + ' • up to ' + V.cap + ' cars • ' + DR.money(V.ticket) + ' a ticket'));
      body.appendChild(h('div', { class: 'plvl' }, 'DATE'));
      body.appendChild(chips(dates.slice(0, 8).map(function (d) { return [d.start, CAL.fmt(d.start)]; }), pl.start, function (v) { pl.start = v; pl.end = dates.filter(function (d) { return d.start === v; })[0].end; }));
      body.appendChild(h('div', { class: 'plvl' }, 'FORMAT'));
      body.appendChild(chips(V.fmts.map(function (f) { return [f, P.FMTS[f].name]; }), pl.fmt, function (v) { pl.fmt = v; }));
      body.appendChild(h('div', { class: 'plvl' }, 'CLASS RULE'));
      body.appendChild(chips([['open', 'Open']].concat(Object.keys(DR.CLASSES).map(function (k) { return [k, DR.CLASSES[k].name]; })), pl.rule, function (v) { pl.rule = v; }));
      if (pl.rule !== 'open') body.appendChild(h('div', { class: 'gsmall dim' }, DR.CLASSES[pl.rule].rule + (DR.classIssue(pl.rule, G.car()) ? ' (your car doesn\'t fit it)' : ' (your car fits)')));
      body.appendChild(num('ENTRY FEE', pl.fee, 10, function (v) { pl.fee = v; }));
      body.appendChild(num('PURSE', pl.purse, 50, function (v) { pl.purse = v; }));
      body.appendChild(h('div', { class: 'plvl' }, 'PROMOTION'));
      body.appendChild(chips(P.PROMO.map(function (x, i) { return [i, x[0] + (x[1] ? ' ' + DR.money(x[1]) : '')]; }), pl.promo, function (v) { pl.promo = v; }));
      var pr = P.project(pl);
      proj.innerHTML = '';
      proj.appendChild(h('div', { class: 'gsmall' }, 'Expect ' + pr.lo + '–' + pr.hi + ' cars and ~' + pr.spect + ' fans. Entries ~' + DR.money(pr.entries) + ', gate ~' + DR.money(pr.gate) + '; costs ' + DR.money(pr.costs) + ' up front, the purse ' + DR.money(pl.purse) + ' unless you win it.'));
      if (pr.noShow) { proj.innerHTML = ''; proj.appendChild(h('div', { class: 'bad' }, 'Nobody pays ' + DR.money(pl.fee) + ' to race for ' + DR.money(pl.purse) + ': the purse has to be well over the entry (racers like it 8x or more). Raise the purse or lower the fee.')); return; }
      proj.appendChild(h('div', { class: 'pix ' + (pr.net >= 0 ? 'good' : 'bad') }, 'Projected ' + (pr.net >= 0 ? 'profit ' : 'loss ') + DR.money(Math.abs(pr.net))));
    }
    close = UI.modal([h('div', { class: 'pix acc' }, 'PLAN AN EVENT'), body, proj,
      h('div', { class: 'row', style: { justifyContent: 'flex-end', gap: '8px' } }, btn('Cancel', function () { close(); }), btn('Book it', function () {
        if (!pl.start) return UI.toast('No free date at that venue in the next three weeks');
        if (P.project(pl).noShow) return UI.toast('Nobody would enter: the purse has to be well over the entry fee');
        var w = P.plan(pl); if (w) return UI.toast(w); close(); A.cash && A.cash(); UI.toast('Booked: ' + CAL.fmt(pl.start)); UI.refresh();
      }, 'primary'))]);
    render();
  }
  P.planModal = planModal;
})();
