// ===========================================================================
// WORK — the car's work, done one of two ways, chosen at the checkout:
//  * Do it yourself: free, and the clock moves while you wrench. Up to ten
//    hours a day, sleeping in between; once a month an enthusiast pulls a
//    long one (up to fourteen) to get a job done that day.
//  * The shop: book time at the shop rate, two techs and a lift, open
//    Monday to Saturday 8 to 6. The car's away till it's done; carry on
//    with something else, or wait for it.
// Parts, swaps, services, body work and paint all add to the car's work;
// nothing happens to it until you pick one (and nothing races till then).
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, h = UI.h, btn = UI.btn, A = DR.Audio, CAL = DR.Cal;
  var W = DR.Work = {};
  W.DAY = 10;          // hours of wrenching in a normal day
  W.LONG = 14;         // the once-a-month long one
  W.START = 8;         // you start at 8 AM after a night's sleep
  W.LATE = 20;         // past 8 PM, a job waits for the morning

  function cal() { return G.state.cal; }
  function car(uid) { return (G.state.cars || []).filter(function (x) { return x.uid === uid; })[0]; }
  function nm(uid) { var c = car(uid); return c ? DR.CARS[c.carId].name : 'the car'; }
  W.pending = function (uid) { return G.carJobs(uid).reduce(function (a, j) { return a + j.h; }, 0); };
  function monthKey(t) { var d = CAL.date(t); return d.y + '-' + d.m; }
  function longFree(t) { return cal().longDay !== monthKey(t); }

  // the plan: sessions of work, day by day { sessions: [{ t, h }], end, long }
  W.diyPlan = function (uid) {
    var H = W.pending(uid), t = G.now(), out = { hours: H, sessions: [], long: false };
    if (!(H > 0)) return null;
    var hr = CAL.date(t).h + CAL.date(t).min / 60;
    if (hr >= W.LATE || hr < 5) t = CAL.dayStart(t) + (hr < 5 ? 0 : 24) + W.START;   // too late: in the morning
    var rem = H;
    while (rem > 1e-6) {
      var cap = W.DAY;
      if (rem > W.DAY && rem <= W.LONG && !out.long && longFree(t)) { cap = W.LONG; out.long = true; }
      var take = Math.min(rem, cap);
      out.sessions.push({ t: t, h: take });
      rem -= take;
      if (rem > 1e-6) t = CAL.dayStart(t) + 24 + W.START;
      else out.end = t + take;
    }
    return out;
  };
  // the shop: book time at the rate, done in shop hours (Mon-Sat 8-6)
  W.shopPlan = function (uid) {
    var q = G.rushQuote(uid);
    if (!q.h) return null;
    var need = Math.max(0.5, q.h * 0.5), t = G.now(), guard = 0;
    while (need > 1e-6 && guard++ < 400) {
      var w = G.slotWindow('dyno', t);           // the shops keep the dyno shop's hours
      if (!w) break;
      if (t < w.start) t = w.start;
      var take = Math.min(need, w.end - t);
      t += take; need -= take;
      if (need > 1e-6) t = w.end + 0.01;
    }
    return { hours: q.h, cost: q.cost, credit: q.credit || 0, until: t };
  };
  // what doing it yourself would mean you miss (career events that start
  // while you're under the car)
  W.misses = function (from, to) {
    var out = [], seen = {};
    for (var d = CAL.dayStart(from); d < to; d += 24) G.dayAgenda(d).forEach(function (e) {
      if (!e.career || e.kind === 'bill' || e.t < from || e.t >= to || seen[e.label]) return;
      seen[e.label] = 1; out.push(e.label + ' (' + CAL.fmt(e.t) + ')');
    });
    return out;
  };
  // do it: the clock moves session by session; the car's work goes first
  W.doItMyself = function (uid) {
    var p = W.diyPlan(uid); if (!p) return [];
    var c = cal(), mine = c.jobs.filter(function (j) { return j.uid === uid; });
    c.jobs = mine.concat(c.jobs.filter(function (j) { return j.uid !== uid; }));
    if (p.long) c.longDay = monthKey(p.sessions[p.sessions.length - 1].t);
    var news = [];
    p.sessions.forEach(function (s) {
      if (s.t > G.now()) news = news.concat(G.advanceTo(s.t));
      news = news.concat(G.advance(s.h, s.h));
    });
    G.save();
    return news;
  };
  W.toShop = function (uid) {
    var p = W.shopPlan(uid); if (!p) return 'Nothing to do';
    var w = G.rush(uid); if (w) return w;
    var c = cal(), last = c.shop.filter(function (j) { return j.uid === uid; }).pop();
    if (last) last.until = p.until;
    G.save();
    return '';
  };
  W.atShop = function (uid) { var c = cal(); return c.shop.filter(function (j) { return j.uid === uid; }).reduce(function (a, j) { return Math.max(a, j.until); }, 0); };

  // ---------------------------------------------------------------- the checkout
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function diyLabel(p) {
    var days = p.sessions.length;
    return days === 1 ? CAL.dur(p.hours) + ', done ' + CAL.fmt(p.end) : plural(days, 'day') + ', done ' + CAL.fmt(p.end);
  }
  // the two ways, on a card (compact: the garage hub's banner)
  W.card = function (inst, compact) {
    var uid = inst.uid, jobs = G.carJobs(uid), until = W.atShop(uid), now = G.now();
    if (until > now && !jobs.length) {
      return h('div', { class: 'baybanner workcard' }, h('span', { class: 'acc' }, 'AT THE SHOP'), h('span', { class: 'grow gsmall' }, 'Ready ' + CAL.fmt(until) + ' (in ' + CAL.dur(until - now) + ')'),
        btn('Wait for it', function () { UI.goThere(until, 'the shop', function () { UI.refresh(); }); }, 'small'));
    }
    if (!jobs.length) return null;
    var d = W.diyPlan(uid), s = W.shopPlan(uid), labels = jobs.map(function (j) { return j.label; });
    var what = plural(jobs.length, 'job') + ': ' + labels.slice(0, compact ? 2 : 4).join(', ') + (labels.length > (compact ? 2 : 4) ? ' +' + (labels.length - (compact ? 2 : 4)) + ' more' : '');
    return h('div', { class: 'baybanner workcard' },
      h('span', { class: 'acc' }, 'WORK TO DO'), h('span', { class: 'grow gsmall bayjobs', title: labels.join(', ') }, what + ' • ' + CAL.dur(d.hours) + ' book time'),
      btn(compact ? 'Myself, ' + (d.sessions.length > 1 ? plural(d.sessions.length, 'day') : CAL.dur(d.hours)) : 'Myself: ' + diyLabel(d), function () { W.confirmDiy(inst); }, 'small go'),
      btn(compact ? 'Shop ' + DR.money(s.cost) : 'Shop ' + DR.money(s.cost) + (s.credit ? ' (after credit)' : '') + ', ready ' + CAL.fmt(s.until), function () { W.confirmShop(inst); }, 'small'));
  };
  UI.workCard = W.card;
  // the checkout: the Upgrade and Style screens carry the active car's
  // work card under their tabs while there's work to choose for
  var top0 = UI.sectionTop;
  UI.sectionTop = function (section) {
    var top = top0.apply(this, arguments), inst = G.car();
    if ((section === 'upgrade' || section === 'style') && inst) { var card = W.card(inst, true); if (card) return [top, h('div', { class: 'checkout' }, card)]; }
    return top;
  };
  W.confirmDiy = function (inst, then) {
    var p = W.diyPlan(inst.uid); if (!p) return;
    var miss = W.misses(G.now(), p.end), close;
    close = UI.modal([h('div', { class: 'pix acc' }, 'DO IT YOURSELF'),
      h('p', {}, 'The ' + nm(inst.uid) + ': ' + CAL.dur(p.hours) + ' of work. ' + (p.sessions.length === 1 ? 'You\'ll have it done ' + CAL.fmt(p.end) + '.' : 'About ' + plural(p.sessions.length, 'day') + ' of wrenching (up to ' + W.DAY + ' hours a day), done ' + CAL.fmt(p.end) + '.') + (p.long ? ' One long ' + W.LONG + '-hour day in there (once a month).' : '')),
      h('p', { class: 'gsmall' }, G.skipText(p.end, true)),
      miss.length ? h('p', { class: 'gsmall warn' }, 'You\'ll miss: ' + miss.join(', ') + '.') : null,
      h('div', { class: 'row', style: { justifyContent: 'flex-end', gap: '8px' } }, btn('Cancel', function () { close(); }),
        btn('Wrench it', function () { close(); var news = W.doItMyself(inst.uid); A.click && A.click(); news.unshift('🔧 Done: the ' + nm(inst.uid) + ' is back together.'); UI.timeNews(news); UI.refresh(); if (then) then(); }, 'primary'))]);
  };
  W.confirmShop = function (inst) {
    var p = W.shopPlan(inst.uid); if (!p) return;
    UI.confirm('Have the shop do it? ' + DR.money(p.cost) + ' (' + CAL.dur(p.hours) + ' book time at ' + DR.money(CAL.SHOP_RATE) + '/h' + (p.credit ? ', ' + DR.money(p.credit) + ' of shop credit off' : '') + '). The ' + nm(inst.uid) + ' is theirs till ' + CAL.fmt(p.until) + ' (open Mon to Sat, 8 to 6); carry on, or wait for it.', function () {
      var w = W.toShop(inst.uid); if (w) return UI.toast(w);
      A.cash && A.cash(); UI.refresh();
    }, 'Pay');
  };
  // a car with work to do that you tried to use: the choice, in a dialog
  UI.workPrompt = function (inst) {
    var card = W.card(inst), close;
    if (!card) return;
    close = UI.modal([h('div', { class: 'pix acc' }, 'THE ' + DR.CARS[inst.carId].name.toUpperCase() + ' ISN\'T READY'),
      h('p', { class: 'gsmall' }, 'It has work waiting. Do it yourself (free, takes your time) or have the shop do it (costs money, takes the car).'), card,
      h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, btn('Close', function () { close(); }))]);
    // a choice made in the card closes the dialog
    card.addEventListener('click', function (e) { if (e.target.closest('button')) setTimeout(close, 0); }, true);
  };
})();
