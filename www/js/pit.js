// ===========================================================================
// PIT — your pit at a ladder event, between the races of the day (build 2
// of the career ladder). The clock runs the day: the next call to the
// lanes and when they close (miss it and you're out), the engine's
// temperature cooling by the minute, the nitrous bottle coming back up, the
// tires, any damage. Jobs take their time; waiting for the call moves the
// clock to it; the lanes take you to the race.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, h = UI.h, btn = UI.btn, CAL = DR.Cal;
  function hm(t) { return CAL.hourText(Math.floor(t % 24), Math.round((t % 1) * 60) % 60); }
  function dur(hrs) { return CAL.dur(Math.max(0, hrs)); }

  // the upgrade screens' back button brings you back here while you're at
  // an event
  var pitEv = null;
  UI.pitReturn = function () {
    if (pitEv && DR.Ladder.runFor(pitEv)) { UI.show(UI.Pit, pitEv); return true; }
    pitEv = null; return false;
  };

  UI.Pit = function (ev) {
    pitEv = ev;
    var missed = DR.Ladder.checkCall(ev), run = DR.Ladder.runFor(ev), inst = G.car();
    if (missed) setTimeout(function () { UI.toast(missed); }, 300);
    var back = function () { UI.show(UI.RaceMenu, 'career'); };
    if (!run || !inst) {
      pitEv = null;
      var last = G.careerState().lastRun;
      return h('div', { class: 'screen' }, UI.top('PIT', back),
        h('div', { class: 'content' }, h('div', { class: 'pix acc' }, DR.raceDayName(ev)),
          h('p', {}, last && last.id === ev.id ? (last.won ? 'You won it.' : 'Your day here is over.') + (last.pts ? ' Standings: +' + last.pts + ' points.' : '') : 'Your day here is over.'),
          btn('Back to Career', back, 'primary')));
    }
    var now = G.now(), nc = DR.Ladder.nextCall(ev, run), opp = DR.Ladder.opponent(ev, run), S = G.spec(inst);
    // the schedule of the day: what's done, what's next
    var P = DR.DAYPLAN[ev.type], rows = [];
    if (run.day0 != null) {
      (P.qual || []).forEach(function (t, k) {
        var done = run.q > k || run.phase !== 'qual', et = run.myQ && run.myQ[k];
        rows.push([run.day0 + t, (ev.type === 'bracket' ? 'Time trial ' : 'Qualifying ') + (k + 1), done ? (et != null && et < 90 ? (ev.type === 'noprep' ? 'done' : et.toFixed(3)) : 'no time') : '']);
      });
      if (P.rounds) P.rounds.forEach(function (t, k) {
        var mw = run.myWins || 0, lbl = ['Round 1', 'Quarterfinal', 'Semifinal', 'Final'][k];
        rows.push([run.day0 + t, lbl, k < mw ? 'won' : '']);
      });
      if (P.first != null) for (var i = 0; i < (run.n || 0); i++) rows.push([run.day0 + P.first + i * P.every, 'Callout ' + (i + 1) + ': ' + ev.opps[i].name, i < run.i ? (run.log[i] && run.log[i][1] ? 'won' : 'lost') : '']);
    }
    var sched = h('div', { class: 'pitsched' }, rows.map(function (r) {
      var isNext = nc && Math.abs(r[0] - nc.t) < 1e-6;
      return h('div', { class: 'pitrow' + (isNext ? ' next' : '') + (r[2] ? ' done' : '') }, h('span', { class: 'gsmall' }, hm(r[0])), h('span', { class: 'grow' }, r[1]), h('span', { class: 'gsmall ' + (r[2] === 'lost' || r[2] === 'no time' ? 'bad' : 'good') }, r[2]));
    }));
    // the car
    var T = DR.Ladder.engTemp(ev, inst), cool = DR.Ladder.coolTau(inst), hh = run.heat || {};
    var toNice = T > 130 ? Math.max(0, -Math.log((130 - (cool.floor != null ? cool.floor : 70)) / Math.max(1, T - (cool.floor != null ? cool.floor : 70))) * cool.tau) : 0;
    var ws = G.wearList(inst), dmg = inst.damage;
    var carBox = h('div', { class: 'pitcar' },
      h('div', { class: 'plvl' }, 'YOUR CAR'),
      h('div', {}, 'Engine ' + Math.round(T) + '°F ' + (T <= 140 ? '(ready)' : T >= 200 ? '(hot: it costs power and knocks sooner)' : '(warm)')),
      h('div', { class: 'gsmall dim' }, 'Cooling with ' + cool.how + (T > 130 && isFinite(toNice) ? ': about ' + dur(toNice) + ' to 130°F' : '')),
      S.nosHp ? h('div', {}, 'Nitrous bottle ' + Math.round((hh.nosP != null ? hh.nosP : 1) * 100) + '% pressure') : null,
      h('div', { class: 'gsmall' }, ws.map(function (x) { return (x.cat === 'rtires' ? 'Tires ' : 'Clutch ') + Math.round(x.w * 100) + '% worn'; }).join(' • ')),
      dmg ? h('div', { class: 'bad' }, 'BROKEN: ' + (dmg.engine ? 'the engine' : dmg.axle ? 'an axle' : dmg.chassis ? 'the chassis' : 'the transmission') + '. It can\'t make the call.') : h('div', { class: 'good gsmall' }, 'No damage'));
    // the call
    var head;
    if (run.phase === 'broke') head = h('div', { class: 'pitnext' }, h('div', { class: 'bad' }, 'Broken before round 1: no eliminations today. An alternate takes your spot.'),
      h('div', { class: 'col', style: { gap: '6px', marginTop: '6px' } }, DR.Ladder.brokeChoices(ev).map(function (ch) { return btn(ch.label, function () { ch.go(); back(); }, 'primary'); })));
    else if (nc) {
      var open = now >= nc.t;
      head = h('div', { class: 'pitnext' },
        h('div', { class: 'pix small acc' }, 'NEXT: ' + nc.label.toUpperCase() + (opp ? ' vs ' + opp.name.toUpperCase() : run.phase === 'elim' ? ' (A BYE)' : '')),
        h('div', {}, open ? 'Called now: the lanes close at ' + hm(nc.close) + ' (' + dur(nc.close - now) + ')' : 'Called at ' + hm(nc.t) + ' (in ' + dur(nc.t - now) + '), the lanes close at ' + hm(nc.close)),
        opp && ev.type !== 'noprep' ? h('div', { class: 'gsmall dim' }, DR.CARS[opp.carId].name) : null);
    }
    function tune() { if (now + 1 / 6 > (nc ? nc.close : 1e9)) return UI.toast('No time for that before the call'); UI.timeNews(G.advance(1 / 6)); UI.show(UI.Tune); }
    var btns = h('div', { class: 'row pitbtns', style: { gap: '8px', flexWrap: 'wrap' } },
      run.phase !== 'broke' && nc ? btn(now >= nc.t ? 'To the lanes' : 'Wait for the call (' + dur(nc.t - now) + ')', function () {
        if (dmg) return UI.toast('The car\'s broken: it can\'t make the call');
        if (G.now() < nc.t) UI.timeNews(G.advanceTo(nc.t));
        if (now < nc.t) return UI.refresh();
        DR.Ladder.go(ev);
      }, 'primary') : null,
      run.phase !== 'broke' && nc && now < nc.t ? btn('To the lanes now', function () { if (dmg) return UI.toast('The car\'s broken: it can\'t make the call'); UI.timeNews(G.advanceTo(nc.t)); DR.Ladder.go(ev); }) : null,
      run.phase !== 'broke' ? btn('Tune (10 min)', tune) : null,
      btn('Leave the event', function () { UI.confirm('Leave ' + DR.raceDayName(ev) + '? Your day ends here: points for what you raced, no purse for the rounds you don\'t run.', function () { DR.Ladder.withdraw(ev); pitEv = null; back(); }, 'Leave'); }));
    return h('div', { class: 'screen' }, UI.top('PIT', back),
      h('div', { class: 'content pit' },
        h('div', { class: 'pix acc' }, DR.raceDayName(ev)), h('div', { class: 'gsmall dim' }, DR.Cal.fmt(now) + ' • ' + DR.STAGES[ev.stage].name + ' • section ' + (ev.sec + 1)),
        head, h('div', { class: 'pitcols' }, h('div', { class: 'grow' }, h('div', { class: 'plvl' }, 'THE DAY'), sched), carBox), btns));
  };
})();
