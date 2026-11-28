// ===========================================================================
// SPEC CARS AND LICENSES — the circuit ladder's build C2 (owner's plan, Nov
// 27-28; research: SCCA 2026 GCR, NASA 2026 Spec E46 rules, nasaspeed.news
// on the Corvette Cup, cup-car costs).
//  * Spec events run: everyone in the class's series car. Rent one for the
//    event (1.5x its win: the car built to the reference spec, prepped,
//    tires and fuel in; about 1 in 5 of your driver's mistakes bends it,
//    25% of the rental each), or bring your own built to the spec.
//  * The spec per class: the series' model, a stock engine (the free bits
//    the rules allow), the series' suspension, brakes, wheels and tire, a
//    cage, and its weight. In Touring the M3 stands in for the 330i of the
//    real Spec E46 and is held to 265 hp (225 whp) in these races.
//  * Licenses per circuit driver (SCCA style): a drivers' school ($495, a
//    weekend at Pixel Raceway) gives a novice permit for class 1; three race
//    weekends on it give the full license, class 2 up. Danny starts with a
//    permit, hires averaging 50+ come licensed; open races, team races and
//    the Night Series ask for none.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, T = DR.Team, CLD = DR.CL;
  function C() { return G.careerState(); }
  function r10(x) { return Math.round(x / 10) * 10; }
  function hash(str) { var x = 2166136261; for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // Spec events run now; a section opens with 2 of its 3 running events
  // (3 of 4 once Endurance runs, C3)
  CLD.LIVE.spec = true;
  CLD.need = function () { var n = CLD.THEMES.filter(function (t) { return CLD.LIVE[t.id]; }).length; return n >= 4 ? 3 : 2; };
  CLD.theme('spec').blurb = 'Everyone in the series car: rent one for the event, or bring your own built to the spec. One qualifying lap sets the grid, then the race. Win it to finish the event.';
  CLD.theme('spec').soon = null;

  // ---------------------------------------------------------------- the series specs
  // allow: per part slot, what may be fitted besides the factory part.
  // wheels: the diameter and the wheel styles allowed; tires: the series
  // tire(s), on both axles; ref: the reference build (rentals, the field).
  var KIT1 = { springs: ['sp1'], shocks: ['sh1'], sway: ['sw1', 'sw2'], brakes: ['br0'], diff: ['lsd'] };
  function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  var CUP = { springs: ['sp2'], shocks: ['sh1', 'sh3'], sway: ['sw1', 'sw2'], brakes: ['br0', 'br3', 'br2'], aero: ['a3'], diff: ['lsd'], shifter: ['ss1', 'ss2'], flywheel: ['fw1'], weight: ['w0', 'w1', 'w2'], tubs: ['rw1'], fwells: ['fw1'] };
  CLD.SPECS = [
    { series: 'Spec Miata', car: 'mira', minLb: 2275, wheel: 15, styles: ['street'], tires: ['tr_205'],
      allow: merge(KIT1, { airfilter: ['af1', 'af2'], exhaust: ['e1'], weight: ['w0', 'w1'], tubs: ['rw1'], fwells: ['fw1'] }),
      ref: { springs: 'sp1', shocks: 'sh1', sway: 'sw2', brakes: 'br0', diff: 'lsd', airfilter: 'af1', exhaust: 'e1', wheels: 'street15x7', fwheels: 'street15x7', rtires: 'tr_205', ftires: 'tr_205', chassis: 'cg3', weight: 'w0' },
      rules: ['The Mazda MX-5 Miata, stock engine (an air filter or cone filter and a cat-back exhaust allowed)', 'The spec kit: lowering springs, sport shocks, sport or adjustable anti-roll bars (or stock)', 'Brake pads; a limited-slip diff', 'Cast 15 in wheels and the Track Tire 205/50R15 all round', 'A roll cage', 'At least 2,275 lb with the driver (ballast if under); the interior may come out'] },
    { series: 'Spec E46', car: 'm3', capHp: 265, minLb: 2850, wheel: 17, styles: ['street'], tires: ['tr_255'],
      allow: merge(KIT1, { springs: ['sp1', 'sp2'], airfilter: ['af1'], exhaust: ['e1'], shifter: ['ss1'], weight: ['w0', 'w1'], tubs: ['rw1'], fwells: ['fw1'] }),
      ref: { springs: 'sp2', shocks: 'sh1', sway: 'sw2', brakes: 'br0', diff: 'lsd', airfilter: 'af1', exhaust: 'e1', wheels: 'street17x9', fwheels: 'street17x9', rtires: 'tr_255', ftires: 'tr_255', chassis: 'cg3', weight: 'w1' },
      rules: ['The BMW M3 E46 (the real series races the 330i), stock engine held to 265 hp (225 whp) by the spec tune in these races; a panel filter and a cat-back exhaust allowed', 'Coilovers or lowering springs, sport shocks, anti-roll bars (or stock)', 'Brake pads; a limited-slip diff; a short-throw shifter', 'Cast 17 in wheels and the Track Tire 255/40R17 all round', 'A roll cage', 'At least 2,850 lb with the driver; the interior may come out'] },
    { series: 'Corvette Cup', car: 'vette5', wheel: 18, styles: ['street', 'forged'], tires: ['tr_315'],
      allow: merge(KIT1, { springs: ['sp1', 'sp2'], airfilter: ['af1'], exhaust: ['e1'], weight: ['w0'], tubs: ['rw1'], fwells: ['fw1'] }),
      ref: { springs: 'sp2', shocks: 'sh1', sway: 'sw2', brakes: 'br0', diff: 'lsd', airfilter: 'af1', exhaust: 'e1', wheels: 'forged18x11', fwheels: 'forged18x11', rtires: 'tr_315', ftires: 'tr_315', fwells: 'fw1', chassis: 'cg3', weight: 'w0' },
      rules: ['The Corvette C5, stock engine (a panel filter and a cat-back exhaust allowed); no aero', 'Coilovers or lowering springs, sport shocks, anti-roll bars (or stock)', 'Brake pads; a limited-slip diff', '18 in wheels and the 315/30R18 track tire all round (rolled front fenders)', 'A roll cage', 'Only the spare, jack and A/C may come out'] },
    { series: 'Porsche Carrera Cup', car: 'p911', wheel: 18, styles: ['street', 'forged'], tires: ['rr_slk'], allow: CUP,
      ref: { springs: 'sp2', shocks: 'sh3', sway: 'sw2', brakes: 'br3', aero: 'a3', diff: 'lsd', wheels: 'forged18x11', fwheels: 'forged18x11', rtires: 'rr_slk', ftires: 'rr_slk', fwells: 'fw1', chassis: 'cg3', weight: 'w1' },
      rules: ['The Porsche 911 built like a cup car: stock engine', 'Race coilovers, sport or double-adjustable shocks, anti-roll bars', 'Pads, a big brake kit or carbon brakes; a front splitter and rear wing', '18 in wheels and the road race slick all round (rolled fenders)', 'A roll cage; weight out down to lightweight panels'] },
    { series: 'Lamborghini Super Trofeo', car: 'lambo', wheel: 20, styles: ['street', 'forged'], tires: ['tr_305'], allow: CUP,
      ref: { springs: 'sp2', shocks: 'sh3', sway: 'sw2', brakes: 'br3', aero: 'a3', diff: 'lsd', wheels: 'forged20x11', fwheels: 'forged20x11', rtires: 'tr_305', ftires: 'tr_305', fwells: 'fw1', chassis: 'cg3', weight: 'w1' },
      rules: ['The Lamborghini built like a Super Trofeo car: stock engine', 'Race coilovers, sport or double-adjustable shocks, anti-roll bars', 'Pads, a big brake kit or carbon brakes; a front splitter and rear wing', '20 in wheels and the Track Tire 305/30R20 all round (rolled fenders)', 'A roll cage; weight out down to lightweight panels'] }
  ];
  // Unlimited's World Final runs the Super Trofeo car too
  CLD.specOf = function (si) { return CLD.SPECS[Math.min(si, CLD.SPECS.length - 1)]; };
  // always free: no performance in them, or safety
  var FREE = { logger: 1, battery: 1, safety: 1, ballast: 1, cooling: 1, clutch: 1, mounts: 1, hitch: 1 };
  var CAGE = { cg2: 1, cg3: 1 };
  var EXTRA = ['engine', 'fi', 'trans', 'rtires', 'nitrous'];
  function cats() { var o = Object.keys(DR.PART_CATS); EXTRA.forEach(function (c) { if (o.indexOf(c) < 0) o.push(c); }); return o; }
  function catName(c) { return (DR.CAT_NAMES && DR.CAT_NAMES[c]) || (DR.PART_CATS[c] && DR.PART_CATS[c].name) || c; }
  function partName(c, inst, id) { var o = DR.getOption(c, inst, id); return o && o.name ? o.name : id; }
  var WHEEL_RE = /^([a-z]+)(\d+)x([\d.]+)$/;
  // what keeps a car from a class's spec races ('' = it's legal); list:
  // every reason
  CLD.specCheck = function (inst, si) {
    var sp = CLD.specOf(si), out = [];
    if (inst.carId !== sp.car) return ['Not the series car (the ' + DR.CARS[sp.car].name + ')'];
    cats().forEach(function (c) {
      if (!DR.partApplies(c, inst) || FREE[c]) return;
      var cur = DR.partId(c, inst), fac = DR.stockPart(c, inst);
      if (c === 'rtires' || c === 'ftires') { if (sp.tires.indexOf(cur) < 0) out.push('the series tire ' + (c === 'rtires' ? 'on the drive wheels' : 'all round') + ' (' + DR.TIRES[sp.tires[0]].name.replace(/ \(.*\)/, '') + ')'); return; }
      if (c === 'wheels' || c === 'fwheels') {
        var m = WHEEL_RE.exec(cur);
        // (the factory wheels pass here: the series tire must fit them)
        if (cur !== 'stock' && !(m && +m[2] === sp.wheel && sp.styles.indexOf(m[1]) >= 0)) out.push((sp.styles.length > 1 ? '' : 'cast ') + sp.wheel + ' in wheels (not ' + partName(c, inst, cur) + ')');
        return;
      }
      if (c === 'chassis') { if (!CAGE[cur]) out.push('a roll cage (Chassis)'); return; }
      if (cur === fac) return;
      if ((sp.allow[c] || []).indexOf(cur) >= 0) return;
      out.push(catName(c) + ': ' + partName(c, inst, cur) + ' isn\'t allowed');
    });
    if (sp.minLb && !out.length) {
      var lb = DR.buildSpec(inst).m * 2.2046;
      if (lb < sp.minLb - 0.5) out.push('weight: ' + Math.round(lb) + ' lb, the series minimum is ' + sp.minLb.toLocaleString('en-US') + ' lb with the driver (add ballast)');
    }
    return out;
  };
  CLD.specIssue = function (inst, si) { var l = CLD.specCheck(inst, si); return l.length ? 'Not to spec: ' + l[0] + (l.length > 1 ? ' (and ' + (l.length - 1) + ' more)' : '') : ''; };
  // the car as it races in a class's spec events (Touring: the power cap)
  CLD.specRaceCar = function (inst, si) {
    var sp = CLD.specOf(si);
    if (!sp.capHp) return inst;
    inst.wear = inst.wear || {};   // (the copy wears the real car's tires)
    var c = {}, k; for (k in inst) c[k] = inst[k];
    c.tune = {}; for (k in inst.tune || {}) c.tune[k] = inst.tune[k];
    c.tune.capHp = sp.capHp;
    return c;
  };
  // the reference build: the rental, and the regulars' cars
  var refs = {};
  CLD.refInst = function (si) {
    var sp = CLD.specOf(si);
    if (!refs[si]) {
      var inst = { uid: 'spec' + si, carId: sp.car, engine: DR.CARS[sp.car].engine, parts: merge({}, sp.ref), tune: {}, vis: {}, color: '#e8e8e8', stripe: '', rim: '#c8c8c8', damage: 0 };
      if (sp.capHp) inst.tune.capHp = sp.capHp;
      // ballast up to the series weight
      if (sp.minLb) ['bl1', 'bl2'].some(function (b) { if (DR.buildSpec(inst).m * 2.2046 >= sp.minLb) return true; inst.parts.ballast = b; return false; });
      refs[si] = inst;
    }
    return refs[si];
  };
  CLD.refIdeal = function (si) { return T.idealLap(CLD.refInst(si), 'pixel'); };
  // the rental: the reference car, 1.5x the event's win
  CLD.RENT_K = 1.5;
  CLD.DMG_P = 0.2;       // a mistake that bends the rental
  CLD.DMG_K = 0.25;      // of the rental, each
  CLD.rentPrice = function (ev) { return r10(ev.cash * CLD.RENT_K); };
  CLD.rentInst = function (ev) {
    var ref = CLD.refInst(ev.stage), c = JSON.parse(JSON.stringify(ref));
    c.uid = 'rent-' + ev.id; c.rental = true;
    return c;
  };

  // ---------------------------------------------------------------- the field in spec events
  // the regulars in the series car: its ideal lap, a setup gap by section
  // and a small spread of their own; skills step up as in the Sprints
  CLD.SPEC_GAP = [1.5, 1.1, 0.8, 0.5, 0.3];
  var field0 = CLD.field;
  CLD.field = function (ev) {
    var f = field0(ev);
    if (ev.theme !== 'spec') return f;
    var si = ev.stage, sp = CLD.specOf(si), ideal = CLD.refIdeal(si);
    return f.map(function (e) {
      var R = CLD.ROSTER[si][e.reg];
      e.car = sp.car; e.pace = ideal + CLD.SPEC_GAP[ev.sec] + R.off * 0.15;
      return e;
    });
  };

  // ---------------------------------------------------------------- licenses
  CLD.SCHOOL = 495;
  CLD.LIC_WEEKENDS = 3;
  // a driver's license, given once (old saves, Danny, hires): Danny a
  // permit (or the full license after 3 races), anyone with 3+ circuit
  // races or averaging 50+ the full license, everyone else none
  CLD.licFor = function (d) { return d.nephew ? (d.races >= 3 ? 'full' : 'novice') : d.races >= 3 || T.avg(d) >= 50 ? 'full' : 'none'; };
  CLD.lic = function (d) { if (!d) return 'none'; if (!d.lic) d.lic = CLD.licFor(d); return d.lic; };
  CLD.licNeeded = function (si) { return si === 0 ? 'novice' : 'full'; };
  CLD.licOk = function (d, si) { var l = CLD.lic(d); return l === 'full' || (l === 'novice' && si === 0); };
  CLD.licWhy = function (d, si) {
    var l = CLD.lic(d);
    if (CLD.licOk(d, si)) return '';
    if (l === 'novice') return d.name + ' has a novice permit (class 1 only): ' + (CLD.LIC_WEEKENDS - (d.licW || []).length) + ' more race weekend' + (CLD.LIC_WEEKENDS - (d.licW || []).length === 1 ? '' : 's') + ' in class 1 for the full license';
    return d.name + ' needs a license: send them to the drivers\' school (Team, ' + DR.money(CLD.SCHOOL) + ')';
  };
  CLD.licLabel = function (d) {
    var l = CLD.lic(d);
    if (d.school) return 'Drivers\' school booked';
    return l === 'full' ? 'Full license' : l === 'novice' ? 'Novice permit (' + (d.licW || []).length + '/' + CLD.LIC_WEEKENDS + ' race weekends)' : 'No license';
  };
  // the school: the next Saturday-Sunday school at Pixel Raceway (now, with
  // the calendar off)
  CLD.bookSchool = function (id) {
    var d = T.driver(id); if (!d) return 'Gone';
    if (CLD.lic(d) !== 'none') return d.name + ' already has a ' + (d.lic === 'full' ? 'license' : 'permit');
    if (d.school) return d.name + ' is booked already';
    if (!G.canAfford(CLD.SCHOOL)) return 'The school is ' + DR.money(CLD.SCHOOL);
    G.pay(CLD.SCHOOL);
    if (DR.SCHED_OFF || !G.slotWindow) { d.lic = 'novice'; G.save(); return ''; }
    var w = G.slotWindow('school');
    if (w && w.open) w = G.slotWindow('school', w.end + 0.01);
    d.school = { start: w.start, end: w.end };
    G.save();
    return '';
  };
  CLD.schoolText = function (d) {
    if (!d.school) return '';
    return (DR.Cal && DR.Cal.fmt ? DR.Cal.fmt(d.school.start, { noTime: true }) + ', 8 AM' : 'Saturday 8 AM') + ' to Sunday 6 PM at Pixel Raceway';
  };
  function inSchool(d) { if (!d || !d.school || !G.now) return false; var t = G.now(); return t >= d.school.start && t < d.school.end; }
  var busy0 = T.driverBusy;
  T.driverBusy = function (id) { return busy0(id) || inSchool(T.driver(id)); };
  // the school done: the permit
  function schoolTick() {
    var out = [];
    if (!G.state || !G.state.team || !G.now) return out;
    T.state().drivers.forEach(function (d) {
      if (d.school && G.now() >= d.school.end) {
        delete d.school; if (CLD.lic(d) === 'none') d.lic = 'novice';
        out.push({ text: d.name + ' passed the drivers\' school: a novice permit, for class 1 races', race: null, pos: 0, prize: 0, grew: null, unl: [] });
      }
    });
    if (out.length) G.save();
    return out;
  }
  var tick0 = T.tick;
  T.tick = function () { return tick0.apply(this, arguments).concat(schoolTick()); };
  // a race weekend on the permit: counted once a weekend (the week's Monday)
  function weekKey() { if (!G.now || !DR.Cal) return 0; var t = G.now(), d0 = DR.Cal.dayStart(t), wd = DR.Cal.date(d0).wd; return Math.round((d0 - ((wd + 6) % 7) * 24) / 24); }
  function credit(d) {
    if (!d || CLD.lic(d) !== 'novice') return '';
    var k = DR.SCHED_OFF ? 'r' + (d.licW || []).length : weekKey();
    d.licW = d.licW || [];
    if (d.licW.indexOf(k) < 0) d.licW.push(k);
    if (d.licW.length >= CLD.LIC_WEEKENDS) { d.lic = 'full'; delete d.licW; return d.name.split(' ')[0].toUpperCase() + ' EARNED THE FULL LICENSE'; }
    return '';
  }

  // ---------------------------------------------------------------- entering
  // a ladder event: the driver's license; a spec event: the rental or your
  // own car as it races there; a rental's damage rolled with the race
  var enter0 = T.enter;
  T.enter = function (clsId, uid, drvId, tid, opts) {
    var ev = opts && opts.ev;
    if (!(ev && ev.cl)) return enter0.apply(this, arguments);
    var d = T.driver(drvId);
    if (d && !CLD.licOk(d, ev.stage)) return { msg: CLD.licWhy(d, ev.stage) };
    var o = {}, k; for (k in opts) o[k] = opts[k];
    var rent = 0;
    if (ev.theme === 'spec') {
      if (opts.rent) { o.rentInst = CLD.rentInst(ev); rent = CLD.rentPrice(ev); uid = o.rentInst.uid; }
      else o.carFor = function (inst) { return CLD.specRaceCar(inst, ev.stage); };
      if (rent && !G.canAfford(rent + ev.fee + (d ? d.wage : 0))) return { msg: 'The rental, entry and wage: ' + DR.money(rent + ev.fee + (d ? d.wage : 0)) };
    }
    var res = enter0.call(this, clsId, uid, drvId, tid, o);
    if (res.race && rent) {
      var r = res.race, you = r.field.filter(function (e) { return e.you; })[0], rnd = rng(hash(r.id + ':' + (G.state.money || 0))), n = 0;
      for (var i = 0; i < (you ? you.err : 0); i++) if (rnd() < CLD.DMG_P) n++;
      G.pay(rent); r.cost += rent;
      r.rent = { price: rent, dmg: n, carId: o.rentInst.carId };
      G.save();
    }
    return res;
  };

  // ---------------------------------------------------------------- the finish
  // the race weekend toward the license; a rental's damage paid
  var finish0 = G.cupFinish;
  G.cupFinish = function (id, pos, r) {
    var out = finish0.apply(this, arguments);
    if (!out || !r) return out;
    var d = T.driver(r.drv), lic = credit(d), extra = [];
    if (r.rent && r.rent.dmg) {
      var bill = r10(r.rent.price * CLD.DMG_K) * r.rent.dmg;
      G.pay(bill); r.rent.bill = bill;
      extra.push('bent the rental' + (r.rent.dmg > 1 ? ' ' + r.rent.dmg + ' times' : '') + ': -' + DR.money(bill));
    }
    if (lic) extra.push(lic);
    if (extra.length) out.note = (out.note ? out.note + ' • ' : '') + extra.join(' • ');
    G.save();
    return out;
  };

  // ---------------------------------------------------------------- saves
  // licenses for the drivers already on the team (once)
  var sync0 = G.syncUnlocks;
  G.syncUnlocks = function () {
    sync0();
    if (G.state && G.state.team) T.state().drivers.forEach(function (d) { CLD.lic(d); });
  };
})();
