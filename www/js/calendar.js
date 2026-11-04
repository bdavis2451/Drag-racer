// ===========================================================================
// CALENDAR — time. The career runs on a clock (Juiced's calendar, with
// ProStreet's race days on it): every event has a day and an hour, and the
// clock only moves when you do something that takes time (race, wrench,
// sleep, wait). Nothing skips time for you.
//  * The clock: hours since midnight before Friday, March 3 2006.
//  * Garage work takes time. Fitting a part queues the job for that car;
//    the car stays in the bay until the work's done. You choose (work.js):
//    do it yourself (the clock moves while you wrench) or pay the shop.
//  * Days and months pass: hooks run for each (bills on the 1st, loans,
//    the race team's dates, events coming and going).
//  * The bank: a bank loan (monthly payments, a credit score that sets
//    the rate and the limit) or a title loan against one of your cars
//    (fast cash at the FTC's typical 25% a month, and the car's gone if
//    you can't pay).
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game;
  var CAL = DR.Cal = {};
  CAL.BASE = Date.UTC(2006, 2, 3);       // Friday, March 3 2006
  CAL.START = 10;                          // 10 AM on day one
  CAL.WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  CAL.WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  CAL.MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  CAL.MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  CAL.SHOP_RATE = 110;                     // shop labour, $ an hour (book time)

  function st() {
    var s = G.state;
    if (!s.cal) s.cal = { t: CAL.START, jobs: [], shop: [] };
    s.cal.jobs = s.cal.jobs || []; s.cal.shop = s.cal.shop || [];
    return s.cal;
  }
  G.calState = st;
  G.now = function () { return st().t; };
  // { y, m (0-11), d (1-31), wd (0=Sun), h, min, day (whole days since the start), mk (month key) }
  CAL.date = function (t) {
    var dt = new Date(CAL.BASE + t * 3600e3), day = Math.floor(t / 24);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), d: dt.getUTCDate(), wd: dt.getUTCDay(), h: dt.getUTCHours(), min: dt.getUTCMinutes(), day: day, mk: dt.getUTCFullYear() * 12 + dt.getUTCMonth() };
  };
  CAL.dayStart = function (t) { return Math.floor(t / 24) * 24; };
  CAL.hourText = function (h, min) { var hh = h % 12 || 12; return hh + (min ? ':' + ('0' + min).slice(-2) : '') + (h < 12 ? ' AM' : ' PM'); };
  CAL.fmt = function (t, o) {
    var d = CAL.date(t); o = o || {};
    var s = (o.long ? CAL.WDL[d.wd] + ', ' + CAL.MONL[d.m] : CAL.WD[d.wd] + ' ' + CAL.MON[d.m]) + ' ' + d.d + (o.year ? ', ' + d.y : '');
    return o.noTime ? s : s + ' • ' + CAL.hourText(d.h, d.min);
  };
  CAL.dur = function (h) { h = Math.max(0, h); if (h < 1) return Math.round(h * 60) + ' min'; if (h < 48) return (Math.round(h * 2) / 2) + ' h'; return Math.round(h / 24 * 2) / 2 + ' days'; };
  // the next time it's this weekday at this hour (today counts if it's not past)
  CAL.next = function (wd, hour, from) {
    from = from == null ? G.now() : from;
    var d0 = CAL.dayStart(from), wd0 = CAL.date(d0).wd;
    for (var k = 0; k < 8; k++) { var t = d0 + k * 24 + hour; if ((wd0 + k) % 7 === wd && t >= from) return t; }
    return d0 + 7 * 24 + hour;
  };
  CAL.firstOfNextMonth = function (t) { var d = CAL.date(t), dt = Date.UTC(d.y, d.m + 1, 1); return (dt - CAL.BASE) / 3600e3; };

  // ---------------------------------------------------------------- moving time
  var dayHooks = [], monthHooks = [], tickHooks = [];
  G.onDay = function (fn) { dayHooks.push(fn); };      // fn(dayStartT): each new day reached
  G.onMonth = function (fn) { monthHooks.push(fn); };  // fn(firstOfMonthT): each 1st reached
  G.onTick = function (fn) { tickHooks.push(fn); };    // fn(t0, t1): after any move
  // Move the clock on. work: hours of it spent at the bench (the job queue
  // goes down by that much). Returns the news (bills, jobs done, ...).
  G.advance = function (hours, work) {
    var c = st(), t0 = c.t, t1 = t0 + Math.max(0, hours), news = [];
    if (t1 <= t0) return news;
    if (work) news = news.concat(benchWork(Math.min(work, hours)));
    // day and month boundaries, in order
    var d = CAL.dayStart(t0) + 24;
    while (d <= t1) {
      c.t = d;
      var dt = CAL.date(d);
      if (dt.d === 1) monthHooks.forEach(function (fn) { try { news = news.concat(fn(d) || []); } catch (e) { console.error(e); } });
      dayHooks.forEach(function (fn) { try { news = news.concat(fn(d) || []); } catch (e) { console.error(e); } });
      d += 24;
    }
    c.t = t1;
    news = news.concat(shopWork());
    tickHooks.forEach(function (fn) { try { news = news.concat(fn(t0, t1) || []); } catch (e) { console.error(e); } });
    G.save();
    if (DR.UI && DR.UI.clockRefresh) DR.UI.clockRefresh();
    return news;
  };
  G.advanceTo = function (t, work) { return G.advance(t - G.now(), work); };

  // ---------------------------------------------------------------- garage work
  // Book hours for fitting a part (a backyard mechanic with decent tools).
  var HOURS = {
    airfilter: 0.5, intake: 3, throttle: 1, headers: 4, exhaust: 2, pulleys: 2, cooling: 3,
    heads: 10, cams: 6, valvetrain: 6, headstud: 8,
    pistons: 16, rods: 14, crank: 16, block: 24, oiling: 6,
    injectors: 3, fuelpump: 4, fueltype: 0.5, ignition: 2, ecu: 3, logger: 2,
    fi: 14, tmanifold: 6, downpipe: 3, theat: 2, ic: 6, wastegate: 3, bov: 1, wmi: 4, launch: 1, nitrous: 6, nosctrl: 1, nosheat: 1,
    trans: 10, clutch: 7, converter: 8, transbrake: 4, shifter: 2, flywheel: 7, driveshaft: 2, diff: 6, gears: 6, rearend: 12, mounts: 4, layout: 60,
    springs: 4, shocks: 3, sway: 2, rearsusp: 6, frontsusp: 8, chassis: 30, wheeliebar: 4, aero: 3,
    rtires: 1, wheels: 1, ftires: 1, brakes: 4, weight: 8, battery: 2, safety: 4
  };
  DR.jobHours = function (cat, inst, id) {
    if (cat === 'engine') { var f = inst && id ? DR.swapFit(inst, id) : null, e = id && DR.ENGINES[id]; return 24 + (e ? 6 * (e.size || 1) : 0) + (f && f.install > 3000 ? 16 : 0); }
    if (cat === 'chassis' && id === 'cg1') return 8;
    if (cat === 'weight' && id === 'w4') return 120;
    return HOURS[cat] != null ? HOURS[cat] : 2;
  };
  // put work on the bench for this car (or straight to the shop: rush)
  G.work = function (inst, hours, label) {
    if (!inst || inst.uid < 0 || !(hours > 0)) return;
    st().jobs.push({ uid: inst.uid, label: label, h: Math.round(hours * 4) / 4 });
    G.save();
  };
  function carName(uid) { var c = (G.state.cars || []).filter(function (x) { return x.uid === uid; })[0]; return c ? DR.CARS[c.carId].name : 'the car'; }
  function benchWork(h) {
    var q = st().jobs, out = [], done = {};
    while (h > 0 && q.length) {
      var j = q[0], take = Math.min(h, j.h);
      j.h -= take; h -= take;
      if (j.h <= 1e-6) { q.shift(); done[j.uid] = (done[j.uid] || []).concat(j.label); }
    }
    Object.keys(done).forEach(function (uid) { if (!G.carBusy(+uid)) out.push('🔧 ' + carName(+uid) + ' is back together: ' + done[uid].join(', ')); });
    return out;
  }
  function shopWork() {
    var c = st(), now = c.t, out = [];
    c.shop = c.shop.filter(function (j) { if (j.until <= now) { out.push('🔧 The shop finished your ' + carName(j.uid) + ': ' + j.label); return false; } return true; });
    return out;
  }
  // hours of bench work queued (all cars), and for one car: how long until
  // it's free if you work straight through (its jobs are in a queue behind
  // whatever's ahead of them)
  G.benchHours = function () { return st().jobs.reduce(function (a, j) { return a + j.h; }, 0); };
  G.carJobs = function (uid) { return st().jobs.filter(function (j) { return j.uid === uid; }); };
  G.carBusy = function (uidOrInst) {
    var uid = typeof uidOrInst === 'object' ? uidOrInst.uid : uidOrInst, c = st();
    var q = c.jobs, upto = 0, last = -1;
    q.forEach(function (j, i) { if (j.uid === uid) last = i; });
    for (var i = 0; i <= last; i++) upto += q[i].h;
    var shop = c.shop.filter(function (j) { return j.uid === uid; }).reduce(function (a, j) { return Math.max(a, j.until - c.t); }, 0);
    if (last < 0 && shop <= 0) return null;
    return { bench: upto, own: G.carJobs(uid).reduce(function (a, j) { return a + j.h; }, 0), shop: shop, jobs: G.carJobs(uid).map(function (j) { return j.label; }).concat(c.shop.filter(function (j) { return j.uid === uid; }).map(function (j) { return j.label + ' (shop)'; })) };
  };
  G.busyText = function (inst) {
    var b = G.carBusy(inst); if (!b) return '';
    return 'In the bay: ' + (b.own ? CAL.dur(b.own) + ' of work waiting (do it yourself or the shop)' : '') + (b.shop ? (b.own ? '; ' : '') + 'the shop is done in ' + CAL.dur(b.shop) : '') + '.';
  };
  // the shop takes the car's bench jobs: book hours at the shop rate, done
  // in about half the time (two techs and a lift)
  G.rushQuote = function (uid) { var h = G.carJobs(uid).reduce(function (a, j) { return a + j.h; }, 0); return { h: h, cost: Math.round(h * CAL.SHOP_RATE / 10) * 10, done: Math.max(0.5, h * 0.5) }; };
  G.rush = function (uid) {
    var q = G.rushQuote(uid), c = st();
    if (!q.h) return 'Nothing on the bench for it';
    if (!G.canAfford(q.cost)) return 'The shop wants ' + DR.money(q.cost);
    G.pay(q.cost);
    var labels = G.carJobs(uid).map(function (j) { return j.label; });
    c.jobs = c.jobs.filter(function (j) { return j.uid !== uid; });
    c.shop.push({ uid: uid, label: labels.join(', '), until: c.t + q.done });
    G.save();
    return '';
  };
  // the work the parts take: wrapped around the garage's actions
  function hook(name, fn) { var o = G[name]; G[name] = function () { var r = o.apply(this, arguments); try { fn.apply(this, [r].concat([].slice.call(arguments))); } catch (e) { console.error(e); } return r; }; }
  hook('installPart', function (r, inst, uid) {
    if (!r || !r.ok) return;
    var it = (G.state.cars || []).indexOf(inst) >= 0 ? inst : null; if (!it) return;
    var m = /Installed (.*)/.exec(r.msg || ''), name = m ? m[1] : 'parts';
    var cat = lastCat;
    G.work(inst, DR.jobHours(cat, inst, inst.parts[cat] || inst.engine), name);
  });
  // (installPart doesn't say what went on: catch the category on the way in)
  var lastCat = null, ip = G.installPart;
  G.installPart = function (inst, uid) { var item = G.state.inv.filter(function (x) { return x.uid === uid; })[0]; lastCat = item ? item.cat : null; return ip.apply(this, arguments); };
  hook('removePart', function (r, inst, cat) { if (r) G.work(inst, DR.jobHours(cat) * 0.6, 'Back to stock: ' + (DR.PART_CATS[cat] ? DR.PART_CATS[cat].name : cat)); });
  hook('buyPackage', function (r, inst, plan) {
    if (!r) return;
    var h = plan.steps.reduce(function (a, s) { return a + DR.jobHours(s.cat, inst, s.id); }, 0) * 0.7;   // done together, less of it twice
    G.work(inst, h, 'Package (' + plan.steps.length + ' parts)');
  });
  hook('service', function (r, inst, cats) { if (r) G.work(inst, cats.reduce(function (a, c) { return a + (c === 'clutch' ? 6 : 1); }, 0), 'Fresh ' + cats.map(function (c) { return c === 'rtires' ? 'tires' : 'clutch'; }).join(' & ')); });
  hook('moveOver', function (r, d, cat, target) { if (r && r.swap) { G.work(target, DR.jobHours('engine', target, target.engine), 'Engine swap (' + DR.ENGINES[target.engine].name + ')'); G.work(d, DR.jobHours('engine', d, d.engine), 'Engine swap (' + DR.ENGINES[d.engine].name + ')'); } });
  hook('stripCar', function (r, inst) { if (r) G.work(inst, Math.max(2, r * 1.5), 'Stripping ' + r + ' parts'); });
  var repair0 = G.repair;
  G.repair = function (inst) {
    var d = inst.damage, h = !d ? 0 : d.engine ? 20 : d.trans ? 10 : d.axle ? 4 : d.chassis ? 16 : 6;
    var r = repair0.apply(this, arguments);
    if (r && h) { var c = st(); c.shop.push({ uid: inst.uid, label: d.engine ? 'Engine rebuild' : d.trans ? 'Transmission rebuild' : d.axle ? 'New axle' : 'Chassis repair', until: c.t + h }); G.save(); }
    return r;
  };

  // ---------------------------------------------------------------- the bank
  // Rates from 2026 US personal-loan data (Bankrate ~12.5% average; ~27-36%
  // with bad credit). A title loan is the FTC's example: a 25% monthly fee
  // on 25-50% of the car's value, due in 30 days, the car repossessed if not.
  CAL.TITLE_FEE = 0.25; CAL.TITLE_SHARE = 0.4; CAL.TITLE_DAYS = 30; CAL.LATE_FEE = 35;
  function bank() { var s = G.state; if (!s.bank) s.bank = { loans: [], credit: 640, nid: 1 }; return s.bank; }
  G.bank = bank;
  G.creditBand = function () { var c = bank().credit; return c >= 740 ? 'Excellent' : c >= 680 ? 'Good' : c >= 620 ? 'Fair' : c >= 560 ? 'Poor' : 'Bad'; };
  G.loanAPR = function () { var c = bank().credit; return c >= 740 ? 0.11 : c >= 680 ? 0.15 : c >= 620 ? 0.21 : c >= 560 ? 0.29 : 0.36; };
  G.netWorth = function () { return G.state.money + (G.state.cars || []).reduce(function (a, c) { return a + G.carValue(c); }, 0); };
  G.loanLimit = function () {
    var b = bank(), owed = b.loans.filter(function (l) { return l.kind === 'bank'; }).reduce(function (a, l) { return a + l.balance; }, 0);
    if (b.credit < 520) return 0;
    var lim = 1500 + (b.credit - 560) * 25 + Math.max(0, G.netWorth()) * 0.25;
    return Math.max(0, Math.round((Math.min(250000, lim) - owed) / 100) * 100);
  };
  CAL.payment = function (P, apr, n) { var r = apr / 12; return r ? P * r / (1 - Math.pow(1 + r, -n)) : P / n; };
  G.takeLoan = function (amount, months) {
    var b = bank(), lim = G.loanLimit();
    if (!(amount > 0)) return 'How much?';
    if (amount > lim) return 'The bank will lend you up to ' + DR.money(lim);
    var apr = G.loanAPR(), pay = Math.ceil(CAL.payment(amount, apr, months));
    b.loans.push({ id: b.nid++, kind: 'bank', principal: amount, balance: amount, apr: apr, months: months, left: months, payment: pay, missed: 0, at: G.now() });
    b.credit = Math.max(300, b.credit - 8);   // a hard inquiry
    G.earn(amount); G.save();
    return '';
  };
  G.titleOffer = function (inst) { return Math.round(G.carValue(inst) * CAL.TITLE_SHARE / 50) * 50; };
  G.pledged = function (uid) { return bank().loans.filter(function (l) { return l.kind === 'title' && l.uid === uid; })[0] || null; };
  G.takeTitleLoan = function (inst) {
    if (G.pledged(inst.uid)) return 'That title is already with a lender';
    var amt = G.titleOffer(inst);
    if (amt < 200) return 'The car isn\'t worth enough to borrow against';
    var b = bank();
    b.loans.push({ id: b.nid++, kind: 'title', uid: inst.uid, principal: amt, balance: amt, due: G.now() + CAL.TITLE_DAYS * 24, at: G.now() });
    G.earn(amt); G.save();
    return '';
  };
  G.payOff = function (id) {
    var b = bank(), l = b.loans.filter(function (x) { return x.id === id; })[0];
    if (!l) return '';
    var owe = l.kind === 'title' ? Math.round(l.balance * (1 + CAL.TITLE_FEE)) : Math.round(l.balance);
    if (!G.canAfford(owe)) return 'Paying it off takes ' + DR.money(owe);
    G.pay(owe); b.loans.splice(b.loans.indexOf(l), 1);
    if (l.kind === 'bank') b.credit = Math.min(820, b.credit + 10);
    G.save(); return '';
  };
  G.owedOn = function (l) { return l.kind === 'title' ? Math.round(l.balance * (1 + CAL.TITLE_FEE)) : Math.round(l.balance); };
  // repossession: the car goes to the lender (gone from your garage)
  function repo(uid, why) {
    var car = G.state.cars.filter(function (c) { return c.uid === uid; })[0];
    if (!car) return '';
    G.state.cars = G.state.cars.filter(function (c) { return c !== car; });
    if (!G.state.cars.length) { var beater = G.newInst('beetle'); beater.spent = 0; G.state.cars.push(beater); }
    if (G.state.active === uid) G.state.active = G.state.cars[0].uid;
    st().jobs = st().jobs.filter(function (j) { return j.uid !== uid; });
    if (DR.Phone) DR.Phone.send('ray', 'repo');
    return 'REPOSSESSED: the ' + why + ' took your ' + DR.CARS[car.carId].name + '.';
  }
  // the 1st: bank loan payments come out
  G.onMonth(function () {
    var b = bank(), news = [];
    b.loans.slice().forEach(function (l) {
      if (l.kind !== 'bank') return;
      var interest = l.balance * l.apr / 12, due = Math.min(l.payment, l.balance + interest);
      if (G.canAfford(due)) {
        G.pay(Math.round(due)); l.balance = l.balance + interest - due; l.left--; l.missed = 0;
        b.credit = Math.min(820, b.credit + 6);
        news.push('🏦 Loan payment ' + DR.money(Math.round(due)) + (l.balance > 1 ? ' (' + DR.money(Math.round(l.balance)) + ' left)' : ': paid off!'));
        if (l.balance <= 1) b.loans.splice(b.loans.indexOf(l), 1);
      } else {
        l.missed++; l.balance += interest + CAL.LATE_FEE; b.credit = Math.max(300, b.credit - 45);
        if (l.missed >= 3) {
          // default: the bank sends it to collections, who take the car worth the most toward it
          b.loans.splice(b.loans.indexOf(l), 1); b.credit = Math.max(300, b.credit - 120);
          var cars = G.state.cars.slice().sort(function (a2, b2) { return G.carValue(b2) - G.carValue(a2); });
          var got = cars[0], msg = got ? repo(got.uid, 'bank\'s collections agency') : '';
          news.push('🏦 DEFAULT: three payments missed. ' + msg);
        } else news.push('🏦 Loan payment missed (' + l.missed + ' of 3 before default): a ' + DR.money(CAL.LATE_FEE) + ' late fee, and your credit takes a hit.');
      }
    });
    return news;
  });
  // title loans: due 30 days on. Paid if you can; rolled over (the fee
  // paid, 30 more days) if you can only cover that; else the car goes.
  G.onDay(function (d) {
    var b = bank(), news = [];
    b.loans.slice().forEach(function (l) {
      if (l.kind !== 'title' || l.due > d + 24) return;
      var owe = G.owedOn(l), fee = owe - l.balance;
      if (G.canAfford(owe)) { G.pay(owe); b.loans.splice(b.loans.indexOf(l), 1); news.push('🏦 Title loan repaid: ' + DR.money(owe) + '. The title\'s yours again.'); }
      else if (G.canAfford(fee)) { G.pay(fee); l.due += CAL.TITLE_DAYS * 24; news.push('🏦 Title loan rolled over: ' + DR.money(fee) + ' in fees for 30 more days. The ' + DR.money(l.balance) + ' is still owed.'); }
      else { b.loans.splice(b.loans.indexOf(l), 1); news.push('🏦 ' + repo(l.uid, 'title lender')); }
    });
    return news;
  });
  // a pledged car can't be sold or raced for pinks until it's paid off
  ['sellCar'].forEach(function (fn) {
    var o = G[fn]; if (!o) return;
    G[fn] = function (a) { var uid = typeof a === 'object' ? a && a.uid : a; if (G.pledged(uid)) { DR.UI.toast('The title lender holds that car\'s title: pay the loan off first'); return false; } return o.apply(this, arguments); };
  });

  // ---------------------------------------------------------------- a car in the bay
  // can't be raced, run on the dyno or taken to a tuner till the work's done
  function busyMsg(inst) { var b = G.carBusy(inst); return b ? 'The ' + DR.CARS[inst.carId].name + (b.own ? ' has ' + CAL.dur(b.own) + ' of work waiting: do it yourself or have the shop do it' : ' is at the shop till ' + CAL.fmt(G.now() + b.shop)) : ''; }
  G.busyMsg = busyMsg;
  function gate(obj, name, pick) {
    var o = obj && obj[name]; if (!o) return;
    obj[name] = function () { var inst = pick.apply(this, arguments); var m = inst && busyMsg(inst); if (m) { if (DR.UI.workPrompt) DR.UI.workPrompt(inst); else DR.UI.toast(m); return; } return o.apply(this, arguments); };
  }
  gate(DR.Race, 'start', function (cfg) { return cfg && cfg.inst ? null : G.car(); });
  gate(DR.Race, 'raceDay', function () { return G.car(); });
  gate(DR, 'enterShow', function () { return G.car(); });
  if (DR.Tuner) { gate(DR.Tuner, 'open', function (inst) { return inst; }); }
  if (DR.Team) {
    var enter0 = DR.Team.enter;
    DR.Team.enter = function (clsId, uid, drvId, tid, opts) {
      var uids = [uid].concat(opts && opts.mate ? [opts.mate.uid] : []);
      for (var i = 0; i < uids.length; i++) { var c = G.state.cars.filter(function (x) { return x.uid === uids[i]; })[0]; var m = c && busyMsg(c); if (m) return { msg: m }; }
      return enter0.apply(this, arguments);
    };
  }

  // the dyno won't take a car with half its parts on
  var UI = DR.UI;
  if (UI && UI.Dyno) {
    var dyno0 = UI.Dyno;
    UI.Dyno = function () {
      var inst = G.car(), m = inst && busyMsg(inst);
      if (!m) return dyno0.apply(this, arguments);
      var h = UI.h, b = G.carBusy(inst);
      return h('div', { class: 'screen' }, UI.sectionTop('upgrade', 'dyno'), h('div', { class: 'content' }, h('div', { class: 'awaybox' },
        h('div', { class: 'pix acc' }, 'In the bay'), h('div', {}, m + '.'),
        UI.workCard ? UI.workCard(inst) : null, h('div', { class: 'row' }, UI.btn('Garage', function () { UI.show(UI.Garage); })))));
    };
  }

  // ---------------------------------------------------------------- new game, old saves
  var origNew = G.newGame;
  G.newGame = function () { var out = origNew.apply(this, arguments); G.state.cal = { t: CAL.START, jobs: [], shop: [] }; G.state.bank = { loans: [], credit: 640, nid: 1 }; G.save(); return out; };
})();
