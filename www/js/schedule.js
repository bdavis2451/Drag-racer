// ===========================================================================
// SCHEDULE — what happens when, the rhythm of a real racing week. Weekdays
// are the garage's and the underground's: test & tune and the dyno by day,
// street spots and callouts Monday, Tuesday, Thursday and Friday nights,
// and Wednesday night is Grudge Night at the strip (street racing, settled
// legally). The weekend's sanctioned: Friday's big street night and the
// no-prep, Saturday at the strip (day and under the lights), Sunday's
// brackets, class races and circuit race days, and the car shows Sunday
// night. The class King holds court on the 2nd and 4th Saturday night; the
// bracket King the last Sunday, the No-Prep King the last Friday night.
// A career race day (ProStreet): the stage's races in one window, scored.
// Every run scores points (a win, a good light, the margin; a close loss
// still scores); the best run of each race counts. Beat the WIN score for
// a bonus on the day's purses; beat DOMINATE and pick a reward. Race days
// come round every week until their races are won.
// Nothing moves the clock for you: when an event isn't on, you can go
// there (the clock jumps to its start), or do something else.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, h = UI.h, btn = UI.btn, A = DR.Audio, CAL = DR.Cal;

  // windows: { wd: [weekdays], from: hour, to: hour (past 24 = after midnight),
  // nth: [nth weekday of the month], last: true (the last one) }
  DR.SLOTS = {
    // the career's four kinds of event, each on its night (real race days:
    // the strip's gates open at 8, no-prep runs into the night, the street
    // after ten)
    fri:    { name: 'Friday street night', where: 'the street', win: [{ wd: [5], from: 22, to: 27 }] },
    sat:    { name: 'Saturday heads-up day', where: 'Pixel Dragway', win: [{ wd: [6], from: 8, to: 18 }] },
    satn:   { name: 'Saturday no-prep night', where: 'Pixel Dragway', win: [{ wd: [6], from: 18, to: 25 }] },
    sun:    { name: 'Sunday bracket day', where: 'Pixel Dragway', win: [{ wd: [0], from: 8, to: 18 }] },
    side:   { name: 'Sunday class races', where: 'Pixel Dragway', win: [{ wd: [0], from: 12, to: 17 }] },
    show:   { name: 'Sunday night car show', where: 'the show', win: [{ wd: [0], from: 17, to: 22 }] },
    meet:   { name: 'Friday night car meet', where: 'the grocery store lot', win: [{ wd: [5], from: 19, to: 23 }] },
    night:  { name: 'Monday, Tuesday, Thursday and Friday nights', where: 'the street', win: [{ wd: [1, 2, 4, 5], from: 21, to: 27 }] },
    grudge: { name: 'Wednesday nights', where: 'Pixel Dragway', win: [{ wd: [3], from: 18, to: 23 }] },
    tnt:    { name: 'whenever the strip\'s open (weekdays noon to 10 PM, weekends 9 to 5)', where: 'Pixel Dragway', win: [{ wd: [1, 2, 3, 4, 5], from: 12, to: 22 }, { wd: [6, 0], from: 9, to: 17 }] },
    dyno:   { name: 'Monday to Saturday, 8 AM to 6 PM', where: 'the dyno shop', win: [{ wd: [1, 2, 3, 4, 5, 6], from: 8, to: 18 }] },
    cup:    { name: 'Sunday circuit race day', where: 'the circuits', win: [{ wd: [0], from: 10, to: 18 }] },
    circ:   { name: 'circuit open races', where: 'the circuits', win: [{ wd: [0], from: 10, to: 18 }, { wd: [4], from: 18, to: 23 }] },
    series: { name: 'Night Series rounds', where: 'the street circuits', win: [{ wd: [6], from: 20, to: 24 }] },
    testday:{ name: 'Monday to Thursday, 9 AM to 5 PM', where: 'Pixel Raceway', win: [{ wd: [1, 2, 3, 4], from: 9, to: 17 }] },
    king:   { name: 'King race (2nd & 4th Saturday night)', where: 'Pixel Dragway', win: [{ wd: [6], from: 21, to: 24, nth: [2, 4] }] },
    kingb:  { name: 'Bracket King (last Sunday)', where: 'Pixel Dragway', win: [{ wd: [0], from: 12, to: 17, last: true }] },
    kingst: { name: 'No-Prep King (last Friday night)', where: 'the old airfield', win: [{ wd: [5], from: 22, to: 27, last: true }] }
  };
  function nthOf(d) { return Math.floor((d.d - 1) / 7) + 1; }
  function lastOf(d) { var nx = CAL.date((Date.UTC(d.y, d.m, d.d) - CAL.BASE) / 3600e3 + 24 * 7); return nx.m !== d.m; }
  // the window of a slot that day (dayStart) or null
  function windowOn(slot, d0) {
    var S = DR.SLOTS[slot], d = CAL.date(d0), out = null;
    S.win.forEach(function (w) {
      if (out || w.wd.indexOf(d.wd) < 0) return;
      if (w.nth && w.nth.indexOf(nthOf(d)) < 0) return;
      if (w.last && !lastOf(d)) return;
      out = { start: d0 + w.from, end: d0 + w.to };
    });
    return out;
  }
  // the window open at t, or the next one: { start, end, open }
  G.slotWindow = function (slot, t) {
    t = t == null ? G.now() : t;
    var d0 = CAL.dayStart(t);
    for (var k = -1; k < 70; k++) {
      var w = windowOn(slot, d0 + k * 24);
      if (w && w.end > t) { w.open = w.start <= t; return w; }
    }
    return null;
  };
  G.slotOpen = function (slot, t) { var w = G.slotWindow(slot, t); return !!(w && w.open); };
  DR.slotName = function (slot) { return DR.SLOTS[slot] ? DR.SLOTS[slot].name : slot; };

  // which slot a career event runs in
  DR.evSlot = function (ev) {
    if (!ev) return null;
    if (ev.king === 'bracket') return 'kingb';
    if (ev.king === 'street') return 'kingst';
    if (ev.ladder) return DR.themeById(ev.type).slot;
    if (ev.type === 'boss' || ev.type === 'callout') return 'king';
    if (ev.type === 'bracket') return 'sun';
    if (ev.type === 'class') return 'side';
    if (ev.type === 'show') return DR.showSlot(DR.showById(ev.show));
    if (ev.type === 'street' || ev.type === 'showcase' || ev.type === 'kingstreet') return 'fri';
    return DR.evCond(ev).night ? 'satn' : 'sat';
  };
  // the Friday Night Meet is on Friday night; the other shows on Sunday
  DR.showSlot = function (sh) { return sh && sh.id === 'meet' ? 'meet' : 'show'; };
  // when: "Sat Mar 4, 12 PM" or "on now (till 6 PM)"
  G.whenText = function (slot) {
    var w = G.slotWindow(slot); if (!w) return '';
    if (w.open) return 'On now, till ' + CAL.hourText(Math.floor(w.end % 24), Math.round((w.end % 1) * 60));
    return CAL.fmt(w.start) + ' (in ' + CAL.dur(w.start - G.now()) + ')';
  };
  // the old "Week 2 • Saturday" line: the real date now
  DR.raceDayWhen = function (ev) { var s = DR.evSlot(ev); return DR.slotName(s) + ' • ' + G.whenText(s); };

  // Not on now: say when, and offer to go (the clock jumps to the start).
  function gate(slot, what, go) {
    if (DR.SCHED_OFF) return go();   // (tests)
    var w = G.slotWindow(slot);
    if (!w || w.open) return go();
    var close;
    close = UI.modal([h('div', { class: 'pix acc' }, 'NOT ON RIGHT NOW'),
      h('p', {}, what + ': ' + DR.slotName(slot) + (DR.SLOTS[slot].where && DR.slotName(slot).indexOf(' at ') < 0 && what.toLowerCase().indexOf(DR.SLOTS[slot].where.replace(/^the /, '')) < 0 ? ', at ' + DR.SLOTS[slot].where : '') + '. Next: ' + CAL.fmt(w.start, { long: true }) + '.'),
      h('p', { class: 'gsmall' }, G.skipText(w.start)),
      h('div', { class: 'row', style: { justifyContent: 'flex-end', gap: '8px' } },
        btn('Cancel', function () { close(); }),
        UI.Calendar ? btn('Calendar', function () { close(); UI.show(UI.Calendar); }) : null,
        btn('Go there (' + CAL.dur(w.start - G.now()) + ')', function () { close(); var news = G.advanceTo(w.start); UI.timeNews(news); go(); }, 'primary'))]);
  }
  G.slotGate = gate;
  // What jumping the clock to t skips, in a line: how long, and the 1st of
  // the month (its bills) if it passes one.
  G.skipText = function (t, noWork) {
    var now = G.now(), dt = t - now, out = 'The clock jumps to ' + CAL.fmt(t) + ' (' + CAL.dur(dt) + ').';
    var first = CAL.firstOfNextMonth(now);
    if (first <= t) {
      var bills = (G.billsPreview ? G.billsPreview() : []).reduce(function (a, b) { return a + (b[1] || 0); }, 0);
      out += ' You\'ll pass the 1st' + (bills ? ': bills ' + DR.money(bills) + '.' : ' (no bills due).');
    }
    if (!noWork && G.benchHours && G.benchHours()) out += ' Garage work you haven\'t done waits (' + CAL.dur(G.benchHours()) + ').';
    return out;
  };
  // Go to something later: say what the jump skips first (anything within
  // the half hour just goes)
  UI.goThere = function (t, label, go) {
    if (DR.SCHED_OFF || t - G.now() < 0.5) { if (t > G.now()) UI.timeNews(G.advanceTo(t)); return go(); }
    var close = UI.modal([h('div', { class: 'pix acc' }, 'GO TO ' + String(label).toUpperCase()), h('p', {}, G.skipText(t)),
      h('div', { class: 'row', style: { justifyContent: 'flex-end', gap: '8px' } }, btn('Cancel', function () { close(); }),
        btn('Go', function () { close(); UI.timeNews(G.advanceTo(t)); go(); }, 'primary'))]);
  };
  function wrap(obj, name, fn) { var o = obj && obj[name]; if (!o) return; obj[name] = function () { var self = this, args = arguments; return fn.call(this, function () { return o.apply(self, args); }, args); }; }
  // career race days, callouts, Kings, street spots
  wrap(DR.Race, 'raceDay', function (go, a) {
    var cfg = a[0] || {}, slot = cfg.mode === 'career' && !(cfg.round > 0) ? DR.evSlot(cfg.ev) : cfg.grudge ? 'grudge' : cfg.mode === 'street' ? 'night' : null;
    if (!slot || cfg.hosted || cfg.wander) return go();
    return gate(slot, cfg.grudge ? 'Grudge Night' : cfg.mode === 'street' ? 'Street racing' : DR.raceDayName ? DR.raceDayName(cfg.ev) : 'That race', go);
  });
  wrap(DR.Race, 'careerEvent', function (go, a) { var ev = a[0], round = a[1]; if (round > 0) return go(); return gate(DR.evSlot(ev), DR.raceDayName(ev), go); });
  // test & tune passes (yours or the tuner's); a dealer test drive is any time
  wrap(DR.Race, 'start', function (go, a) {
    var cfg = a[0] || {};
    if (cfg.mode === 'test' && !cfg.inst) return gate('tnt', cfg.license ? 'The license test' : 'Test & tune', go);
    return go();
  });
  wrap(DR, 'enterShow', function (go, a) { var sh = a[0]; return gate(DR.showSlot(sh), sh ? 'The ' + sh.name : 'A car show', function () { G.advance(3); return go(); }); });
  if (DR.Tuner) {
    wrap(DR.Tuner, 'open', function (go) { return gate('dyno', 'The tuner (it starts on the dyno)', go); });
    wrap(DR.Tuner, 'openCircuit', function (go) { return gate('testday', 'A circuit test day', function () { var r = go(); return r; }); });
  }
  if (UI.Dyno) { var dyno0 = UI.Dyno; UI.Dyno = function () { if (!DR.SCHED_OFF && !G.slotOpen('dyno')) { var w = G.slotWindow('dyno'), self = this, args = arguments; setTimeout(function () { gate('dyno', 'The dyno shop', function () { UI.show(UI.Dyno); }); }, 30); return h('div', { class: 'screen' }, UI.sectionTop('upgrade', 'dyno'), h('div', { class: 'content' }, h('div', { class: 'awaybox' }, h('div', { class: 'pix acc' }, 'The dyno shop is closed'), h('div', {}, 'Open Monday to Saturday, 8 AM to 6 PM. Next: ' + CAL.fmt(w.start) + '.')))); } return dyno0.apply(this, arguments); }; }
  // the Race Team: career and team races on Sunday, open races Sunday and
  // Thursday night, Night Series rounds on Saturday night
  if (DR.Team) {
    var enter0 = DR.Team.enter;
    DR.Team.enter = function (clsId, uid, drvId, tid, opts) {
      var slot = opts && opts.ev ? 'cup' : opts && opts.series != null ? 'series' : opts && opts.mate ? 'cup' : 'circ';
      if (!DR.SCHED_OFF && !G.slotOpen(slot)) return { msg: 'Not on now: ' + DR.slotName(slot) + ' (next ' + G.whenText(slot) + '). Use the Calendar to go there.', slot: slot };
      var res = enter0.apply(this, arguments);
      // the race takes its time on the calendar: done when the clock passes it
      if (res.race) { res.race.calEnd = G.now() + res.race.end / 3600 + 0.5; G.save(); }
      return res;
    };
    // passing the clock beyond a race finishes it
    G.onTick(function () {
      var now = G.now(), any = false;
      DR.Team.active().forEach(function (r) { if (r.calEnd && now >= r.calEnd) { r.anc = { c: r.end + 1, t: Date.now() }; any = true; } });
      if (any && DR.Team.report) setTimeout(DR.Team.report, 50);
      return [];
    });
  }

  // ---------------------------------------------------------------- the clock on the day
  // Each run takes its time (the pits between rounds, the line, the return
  // road); a street race an hour (finding them, the cops).
  G.afterRun = function (cfg, r) {
    if (cfg.inst) return { news: [] };   // a dealer test drive
    var hours = cfg.mode === 'street' ? 1 : cfg.mode === 'test' ? 0.25 : 0.5, out = { news: [] };
    var news = G.advance(hours);
    out.news = out.news.concat(news);
    return out;
  };

  // a class's ladder events in a slot (the Saturday heads-up day, the
  // Friday street night, ...)
  var THEME_SLOTS = ['fri', 'sat', 'satn', 'sun'];
  DR.raceDayEvents = function (si, slot) {
    return DR.STAGES[si].events.filter(function (ev) { return DR.evSlot(ev) === slot && G.eventVisible(ev); });
  };
  // the coupon and the shop credit spend themselves (saves from when race
  // days gave them out)
  if (G.partPrice) { var pp0 = G.partPrice; G.partPrice = function (cat, opt) { var p = pp0.apply(this, arguments); return G.state.coupon ? Math.round(p * (1 - G.state.coupon) / 10) * 10 : p; }; }
  var buy0 = G.buyPart; G.buyPart = function () { var r = buy0.apply(this, arguments); if (r && G.state.coupon) { G.state.coupon = 0; G.save(); } return r; };
  if (G.rushQuote) { var rq0 = G.rushQuote; G.rushQuote = function (uid) { var q = rq0(uid), cr = G.state.shopCredit || 0; q.credit = Math.min(cr, q.cost); q.cost -= q.credit; return q; }; var rush0 = G.rush; G.rush = function (uid) { var q = G.rushQuote(uid), w = rush0(uid); if (!w && q.credit) { G.state.shopCredit -= q.credit; G.earn(q.credit); G.save(); } return w; }; }

  // ---------------------------------------------------------------- the calendar
  // what's on a day: [{ t, end, kind, label, go }]
  // Why the car you're in can't run something, and what fixes it:
  // { msg, fix: [label, fn] } or null
  function fixFor(msg) {
    if (/licen/i.test(msg)) return ['Licenses', function () { UI.show(UI.RaceMenu, 'practice'); }];
    if (/star/i.test(msg)) return ['Style', function () { UI.openSection('style'); }];
    if (/repair|broken|fix your car/i.test(msg)) return ['Garage', function () { UI.show(UI.Garage); }];
    if (/shop|bench|work/i.test(msg)) return ['Home', function () { UI.show(UI.Home); }];
    return ['Upgrade', function () { UI.openSection('upgrade'); }];
  }
  function carWhy(evs) {
    var car = G.car();
    if (!car) return { msg: 'You need a car', fix: ['Dealer', function () { UI.show(UI.Dealer); }] };
    if (car.damage) return { msg: 'Your ' + DR.CARS[car.carId].name + ' is broken', fix: ['Garage', function () { UI.show(UI.Garage); }] };
    if (G.carBusy && G.carBusy(car)) return { msg: 'Your ' + DR.CARS[car.carId].name + ' is being worked on', fix: ['Home', function () { UI.show(UI.Home); }] };
    var issues = evs.map(function (ev) { return G.carIssue(car, ev); });
    if (!issues.every(Boolean)) return null;
    return { msg: issues[0], fix: fixFor(issues[0]) };
  }
  DR.carWhy = carWhy;
  // ---------------------------------------------------------------- event days
  // Races that run at the strip (or on the street) at the same time are one
  // event: "Sunday at Pixel Dragway" holds the bracket day and the class
  // races, Saturday holds every class's Saturday races. The event's page
  // lists them all; enter as many as your car fits, one after another.
  var FAM = { sun: 'sun', side: 'sun', sat: 'sat', satn: 'satn', fri: 'fri' };
  DR.EVENT_DAYS = { sun: 'Sunday bracket day', sat: 'Saturday heads-up day', satn: 'Saturday no-prep night', fri: 'Friday street night' };
  function eventDays(out, d0) {
    var groups = {}, rest = [];
    out.forEach(function (e) {
      var f = e.evs && FAM[e.slot];
      if (!f) return rest.push(e);
      (groups[f] = groups[f] || []).push(e);
    });
    Object.keys(groups).forEach(function (f) {
      var items = groups[f], t = Math.min.apply(null, items.map(function (e) { return e.t; })), end = Math.max.apply(null, items.map(function (e) { return e.end; }));
      var n = items.reduce(function (a, e) { return a + e.evs.filter(function (ev) { return !G.eventWon(ev) || G.countsForContract(ev); }).length; }, 0);
      rest.push({ t: t, end: end, slot: items[0].slot, kind: 'drag', career: true, event: f, d0: d0, items: items,
        label: DR.EVENT_DAYS[f], sub: n + ' race' + (n === 1 ? '' : 's') + ': ' + items.map(function (e) { return e.short; }).join(', '),
        go: function () { UI.show(UI.EventDay, { event: f, d0: d0 }); },
        why: function () { var ws = items.map(function (e) { try { return e.why ? e.why() : null; } catch (x) { return null; } }); return ws.every(Boolean) ? ws[0] : null; } });
    });
    return rest;
  }
  G.dayAgenda = function (d0) {
    var out = [], c = G.careerState();
    // career: the career's own (it shows on This Week); why: can't-enter check
    function add(slot, kind, label, go, sub, career, why) { var w = windowOn(slot, d0); if (w) out.push({ t: w.start, end: w.end, slot: slot, kind: kind, label: label, sub: sub || '', go: go, career: !!career, why: why || null }); }
    // the drag career: each open class's events still to finish (or that a
    // win would still count for the contract), on their nights
    var nowW = {};
    THEME_SLOTS.forEach(function (slot) { var w = G.slotWindow(slot); nowW[slot] = w ? w.start : null; });
    for (var si = 0; si <= c.stage && si < DR.STAGES.length; si++) {
      THEME_SLOTS.forEach(function (slot) {
        // a later week: what you raced this week runs again then
        var w = windowOn(slot, d0), later = w && nowW[slot] != null && w.start > nowW[slot];
        var evs = DR.raceDayEvents(si, slot), open = evs.filter(function (ev) { return !G.eventLock(ev, { anyWeek: later }); }), todo = open.filter(function (ev) { return !G.eventWon(ev) || G.countsForContract(ev); });
        if (!todo.length) return;
        var n0 = out.length;
        add(slot, 'drag', DR.STAGES[si].name + ': ' + DR.slotName(slot), function () { UI.show(UI.RaceMenu, 'career'); }, todo.map(function (ev) { return DR.raceDayName(ev); }).join(', '), true, function () { return carWhy(todo); });
        if (out.length > n0) { out[n0].evs = todo; out[n0].short = DR.STAGES[si].name; }
      });
      var st = DR.STAGES[si];
      // the King event, on King nights, once the sections are done
      if (!G.eventWon(st.boss) && G.curSec && G.curSec(si) >= DR.SECTIONS) (function (st, si) {
        var pos = G.ladderPos(si), next = pos < 5 ? G.ladder(si)[pos] : st.boss, lk = G.eventLock(next);
        function toKing() { UI.careerSub = 'king'; UI.show(UI.RaceMenu, 'career'); }
        add('king', 'king', 'King night: ' + (pos < 5 ? '#' + (5 - pos) + ' ' + next.opps[0].name : 'the King of ' + st.name + ', ' + st.boss.opps[0].name), toKing, pos < 5 ? 'Beat them to move up' : 'For their car', true, function () {
          return lk ? { msg: lk, fix: /contract|sponsor/i.test(lk) ? ['Career', function () { UI.show(UI.RaceMenu, 'career'); }] : ['King', toKing] } : carWhy([next]);
        });
      })(st, si);
      // the car show goals
      st.side.forEach(function (ev) { if (ev.type === 'show' && G.eventVisible(ev) && !G.eventLock(ev) && !G.eventWon(ev)) add(DR.evSlot(ev), 'show', DR.showGoal(ev), function () {
        var issue = G.car() ? G.carIssue(G.car(), ev) : 'No car';
        if (issue) { UI.toast(issue); return UI.show(UI.RaceMenu, 'career'); }
        DR.enterShow(DR.showById(ev.show), ev);
      }, '', true, function () { return carWhy([ev]); }); });
    }
    if (DR.KINGS) ['bracket', 'street'].forEach(function (k) { var K = DR.KINGS[k]; if (K.ev && !G.kingWon(k) && !G.kingLock(k)) add(DR.evSlot(K.ev), 'king', K.name, function () { DR.Race.raceDay(DR.Race.eventCfg(K.ev, 0), K.name); }, '', true, function () { return carWhy([K.ev]); }); });
    // the circuit career's race days, the Night Series, an invitation
    if (DR.CSTAGES) { var cs = DR.CSTAGES[Math.min(G.cstage ? G.cstage() : c.stage, DR.CSTAGES.length - 1)], todoC = cs.all.filter(function (ev) { return !c.cwon[ev.id] && !G.cupLock(ev); }); if (todoC.length) add('cup', 'circuit', G.cclassName(cs.cup.stage) + ' race day', function () { UI.careerSub = 'circuit'; UI.show(UI.RaceMenu, 'career'); }, todoC.map(function (ev) { return ev.name; }).join(', ') + ' (your team)', true, function () {
      var T = DR.Team, s = T && T.state();
      if (!s || !s.drivers.length) return { msg: 'Your team needs a circuit driver', fix: ['Team', function () { UI.show(UI.TeamScreen); }] };
      if (s.drivers.every(function (d) { return T.driverBusy(d.id); })) return { msg: 'Your drivers are all racing', fix: ['Team', function () { UI.show(UI.TeamScreen); }] };
      if (!G.state.cars.some(function (x) { return !x.damage && !T.carAway(x.uid) && !(G.carBusy && G.carBusy(x)); })) return { msg: 'No car free to send', fix: ['Garage', function () { UI.show(UI.Garage); }] };
      return null;
    }); }
    if (DR.Team) {
      var se = DR.Team.series && DR.Team.series(); if (se && !se.done) add('series', 'circuit', 'Night Series round ' + (se.round + 1), function () { UI.circuitTab = 'races'; UI.show(UI.RaceMenu, 'circuit'); });
      var iv = DR.Team.invite && DR.Team.invite(); if (iv) add('cup', 'circuit', 'Team race invitation (' + iv.team + ')', function () { UI.circuitTab = 'races'; UI.show(UI.RaceMenu, 'circuit'); });
    }
    add('tnt', 'test', 'Test & tune', function () { UI.show(UI.RaceMenu, 'test'); });
    add('grudge', 'grudge', 'Grudge Night at the strip', function () { UI.show(UI.RaceMenu, 'map'); });
    if (CAL.date(d0).d === 1) out.push({ t: d0, end: d0, kind: 'bill', career: true, label: 'Bills due: ' + DR.money(G.weeklyBills()), go: function () { UI.show(UI.Home); } });
    if (G.bank) G.bank().loans.forEach(function (l) { if (l.kind === 'title' && CAL.dayStart(l.due) === d0) out.push({ t: l.due, end: l.due, kind: 'bill', career: true, label: 'Title loan due: ' + DR.money(G.owedOn(l)), go: function () { UI.bankModal(); } }); });
    if (G.extraAgenda) out = out.concat(G.extraAgenda(d0) || []);
    return eventDays(out, d0).sort(function (a, b) { return a.t - b.t; });
  };
  var KCOL = { grudge: '#ff4a3a', drag: '#ff6a00', king: '#ffd700', circuit: '#8a5cff', show: '#ff2bd6', test: '#3aa0ff', bill: '#c8102e', host: '#39ff14', wander: '#00e5ff', club: '#e8e8e8', series: '#2fb3a8' };
  DR.KCOL = KCOL;
  var calMonth = null, calSel = null;
  UI.Calendar = function () {
    var now = G.now(), today = CAL.dayStart(now), d = CAL.date(now);
    if (calMonth == null) calMonth = d.y * 12 + d.m;
    if (calSel == null || calSel < today) calSel = today;
    var y = Math.floor(calMonth / 12), m = calMonth % 12, first = (Date.UTC(y, m, 1) - CAL.BASE) / 3600e3, fd = CAL.date(first);
    var grid = h('div', { class: 'calgrid' }, CAL.WD.map(function (w) { return h('div', { class: 'calwd' }, w); }));
    for (var k = 0; k < fd.wd; k++) grid.appendChild(h('div', { class: 'calcell off' }));
    var dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    for (var dd = 1; dd <= dim; dd++) (function (dd) {
      var d0 = first + (dd - 1) * 24, ag = d0 + 24 > now ? G.dayAgenda(d0) : [];
      grid.appendChild(h('div', { class: 'calcell' + (d0 === today ? ' today' : '') + (d0 === calSel ? ' sel' : '') + (d0 + 24 <= now ? ' past' : ''), onclick: function () { if (d0 + 24 <= now) return; calSel = d0; UI.refresh(); } },
        h('div', { class: 'calnum' }, String(dd)),
        h('div', { class: 'caldots' }, ag.slice(0, 6).map(function (e) { return h('i', { style: { background: KCOL[e.kind] || '#888' } }); }))));
    })(dd);
    var ag = G.dayAgenda(calSel), dayEnd = calSel + 24;
    var list = h('div', { class: 'calday' }, h('div', { class: 'pix acc' }, CAL.fmt(calSel, { long: true, noTime: true })),
      ag.length ? ag.map(function (e) {
        var on = e.t <= now && now < e.end, past = e.end <= now && e.end !== e.t, why = !past && e.why ? e.why() : null;
        return h('div', { class: 'calev' + (past ? ' past' : '') }, h('i', { class: 'caldot', style: { background: KCOL[e.kind] || '#888' } }),
          h('div', { class: 'grow' }, h('div', {}, e.label), h('div', { class: 'gsmall dim' }, (e.end > e.t ? CAL.hourText(Math.floor(e.t % 24)) + '–' + CAL.hourText(Math.floor(e.end % 24)) : '') + (e.sub ? ' • ' + e.sub : ''))),
          past ? null : why ? h('div', { class: 'row', style: { gap: '4px', alignItems: 'center' } }, h('span', { class: 'gsmall warn' }, '⚠ ' + why.msg), btn(why.fix[0], why.fix[1], 'small')) : on ? btn('Go', function () { e.go(); }, 'small go') : btn(e.t > now ? 'Go (' + CAL.dur(e.t - now) + ')' : 'Go', function () { if (e.t > now) return UI.goThere(e.t, e.label, e.go); e.go(); }, 'small'));
      }) : h('div', { class: 'dim' }, 'Nothing on. Wrench, rest, or race the street at night (Race > Street).'),
      h('div', { class: 'gsmall dim', style: { marginTop: '6px' } }, 'Street spots: Mon, Tue, Thu and Fri nights, 9 PM–3 AM. Grudge Night: Wednesdays, 6–11 PM. King nights: the 2nd and 4th Saturday, 9 PM. The dyno shop: Mon–Sat, 8–6.'));
    var nav = h('div', { class: 'row calnav' }, btn('◀', function () { calMonth--; UI.refresh(); }, 'small'), h('div', { class: 'pix acc grow', style: { textAlign: 'center' } }, CAL.MONL[m] + ' ' + y), btn('▶', function () { calMonth++; UI.refresh(); }, 'small'));
    var legend = h('div', { class: 'gsmall callegend' }, [['drag', 'Drag race day'], ['king', 'King'], ['grudge', 'Grudge Night'], ['circuit', 'Circuit'], ['show', 'Show'], ['test', 'Test & tune'], ['host', 'Your event'], ['wander', 'Wanderer'], ['club', 'Club'], ['bill', 'Bills']].map(function (x) { return h('span', {}, h('i', { class: 'caldot', style: { background: KCOL[x[0]] } }), x[1]); }));
    return h('div', { class: 'screen' }, UI.top('CALENDAR', function () { UI.show(UI.Home); }),
      h('div', { class: 'content' },
        h('div', { class: 'calwrap' }, h('div', { class: 'calleft' }, nav, grid, legend), list)));
  };
})();
