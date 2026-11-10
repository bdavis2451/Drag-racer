// ===========================================================================
// TUNER — having a car tuned, the way it's done:
//  1. The dyno: the engine is calibrated on the rollers, pull by pull. Boost
//     comes up until the wideband, the knock margin or what the engine's
//     internals will take says stop; then the rev limiter and the shift
//     points from the sheets. You watch every pull (or skip it).
//  2. The track: a handful of test passes for what only traction shows:
//     the launch, the converter and gearing, the suspension and tires. The
//     tuner makes an informed call on each setting (a better chassis tuner
//     is closer first time), and only spends another pass refining it when
//     the data says it's worth it. You drive every pass, or send one of
//     your drag drivers (and only then can a pass be skipped).
// A freelance tuner charges for the dyno tune and a day at the track; your
// staff tuner works for their wage (you pay the dyno time). Every pass
// costs fuel and a test-and-tune ticket, and wears the car.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, h = UI.h, btn = UI.btn, A = DR.Audio;
  var TU = DR.Tuner = {};
  TU.WORN = 0.75;          // stop for fresh tires / clutch past this
  TU.TRACK_FEE = 40;       // a test-and-tune pass
  TU.FREELANCE = {
    local: { name: 'Local tuner', eng: 45, chs: 45, dat: 40, dyno: 450, day: 250, blurb: 'Knows their way around a laptop. Leaves some on the table.' },
    pro: { name: 'Pro tuner', eng: 84, chs: 80, dat: 82, dyno: 950, day: 700, blurb: 'A name in the pits. Close on the first call, and knows a bad pass when they see one.' }
  };
  TU.JOBS = [
    { id: 'engine', name: 'Engine (dyno)', what: 'Boost, rev limiter, shift points' },
    { id: 'chassis', name: 'Chassis (track)', what: 'Tire pressure, front shocks & limiter, instant centre, rear shocks, wheelie bars' },
    { id: 'launch', name: 'Launch (track)', what: 'Boost in 1st & 2nd, 2-step rpm, launch throttle, traction control' },
    { id: 'drive', name: 'Drivetrain (track)', what: 'Slider clutch, converter stall, lockup, final drive (last: gear a car once it hooks)' },
    { id: 'nitrous', name: 'Nitrous (track)', what: 'When the nitrous comes in and how fast' }
  ];
  // The order a drag tuner works in (traction first, gearing last): the tire
  // pressure for a baseline, the front end (how the weight comes off it),
  // the rear (how it lands on the tires), then the launch on top of a car
  // that hooks, the converter and gear, then the nitrous.
  var KEYS = {
    chassis: ['psi', 'rebF', 'limitF', 'antiSquat', 'bumpR', 'rebR', 'barDeg'],
    launch: ['launchRpm', 'launchThr', 'thrRamp', 'gb1', 'gb2', 'tcSlip', 'tcGain'],
    drive: ['clBase', 'clLock', 'stall', 'luGear', 'fd'],
    nitrous: ['nosDelay', 'nosRamp']
  };
  // What a tuner knows to touch: anyone does tire pressure, the 2-step, the
  // traction control, the converter and the gear; a good chassis tuner
  // works the shocks and the instant centre; the best, everything.
  var SCOPE = {
    basic: ['psi', 'launchRpm', 'tcSlip', 'stall', 'fd', 'gb1', 'launchThr'],
    good: ['antiSquat', 'rebR', 'rebF', 'luGear', 'gb2', 'thrRamp', 'barDeg', 'nosDelay', 'clLock'],
    pro: ['limitF', 'bumpR', 'tcGain', 'nosRamp', 'clBase']
  };
  // Every tuner works every setting: skill decides how close they get
  // (see call(): the miss grows as the chassis skill drops)
  TU.knows = function () { return true; };
  // boost by gear, one gear at a time: gb1 = the cap in 1st, gb2 in 2nd
  // (first in the launch: a tuner tames wheelspin with the boost before
  // softening the launch)
  var GB = { gb1: 0, gb2: 1 };
  var GBDEF = { show: function (S) { var d = def('gearBoost'); return d && d.show(S); } };
  // how hard to lean on it: knock margin, rpm under the valvetrain, power
  // under what the internals take
  TU.AGG = {
    safe: { name: 'Safe', psi: 2, rpm: 400, hp: 0.1, fuel: 0.06 },
    bal: { name: 'Balanced', psi: 1, rpm: 200, hp: 0.04, fuel: 0.03 },
    edge: { name: 'On the edge', psi: 0.3, rpm: 50, hp: 0, fuel: 0.008 }
  };
  var STOICH = { stock: 14.7, race: 14.7, e85: 9.8, meth: 6.4 };
  function def(k) { if (GB && GB[k] != null) return GBDEF; return DR.TUNE_DEFS.filter(function (x) { return x.key === k; })[0]; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function gauss() { var u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function fmt(k, v) {
    if (GB[k] != null) return v >= 99 ? 'no cap' : (+v).toFixed(1) + ' psi';
    if (k === 'gearBoost' && Array.isArray(v)) return v.slice(0, 3).map(function (b, i) { return ['1st', '2nd', '3rd'][i] + ' ' + (+b).toFixed(1); }).join(', ') + ' psi';
    if (k === 'launchRpm' || k === 'stall' || k === 'shiftRpm' || k === 'revLimit') return Math.round(v) + ' rpm';
    if (k === 'launchThr' || k === 'tcSlip' || k === 'clBase') return v + '%';
    if (k === 'clLock' || k === 'nosDelay' || k === 'nosRamp') return (+v).toFixed(1) + ' s';
    if (k === 'thrRamp') return (+v).toFixed(1) + ' s';
    if (k === 'fd') return (+v).toFixed(2) + ':1';
    if (k === 'jets') return (v > 0 ? '+' : '') + Math.round(v) + ' size' + (Math.abs(v) === 1 ? '' : 's');
    if (k === 'boost') return (+v).toFixed(1) + ' psi';
    if (k === 'psi') return (+v).toFixed(1) + ' psi';
    if (k === 'luGear') return ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'][v - 1] + ' gear';
    return String(Math.round(v * 100) / 100);
  }
  TU.fmt = fmt;
  function label(k) { if (GB[k] != null) return 'Boost in ' + ['1st', '2nd'][GB[k]]; var d = def(k); return d ? d.label : k; }

  // ---------------------------------------------------------------- session
  // who: { name, eng, chs, dat, staff (team tuner object) | freelance tier }
  // where the tuning happens: the prepped strip (quarter mile), or the
  // street at night (eighth mile, street surface)
  TU.WHERE = { prep: { name: 'Strip', setup: 'Strip tune', night: false, dist: function () { return DR.QUARTER; } },
    street: { name: 'Street', setup: 'Street tune', night: true, dist: function () { return DR.EIGHTH; } } };
  TU.BOTH_K = 0.7;   // the second surface of a Strip + Street booking (1.7x in all)
  function condOf(ss) { return DR.conditions(ss.surf || 'prep', TU.WHERE[ss.surf || 'prep'].night); }
  TU.session = function (inst, who, jobs, agg, drvId, surf) {
    var t0 = JSON.parse(JSON.stringify(inst.tune || {}));
    var S0 = G.spec(inst), d0 = DR.fullTune(inst, S0);
    var ss = { inst: inst, who: who, jobs: jobs, agg: TU.AGG[agg] || TU.AGG.bal, t0: t0, d0: d0, log: [], cost: { labor: 0, driver: 0, dyno: 0, fuel: 0, track: 0, parts: 0 },
      pulls: [], passes: 0, best: null, items: [], phase: 'dyno', dayPaid: false, dynoPaid: false, surf: surf || 'prep', costK: 1, aggKey: agg, drvId: drvId };
    // who'll drive the passes: the tuner sets the car up for them
    var drs = DR.Team && DR.Team.dragDrivers ? DR.Team.dragDrivers() : [];
    ss.drv = drvId === 'me' ? null : (drvId && DR.Team.staff(drvId)) || drs[0] || null;
    // the dyno work
    if (jobs.indexOf('engine') >= 0) {
      if (S0.jets) ss.items.push({ k: 'jets' });
      if (S0.fiType !== 'none' && def('boost').show(S0)) ss.items.push({ k: 'boost' });
      if (def('revLimit').show(S0)) ss.items.push({ k: 'revLimit' });
      ss.items.push({ k: 'shiftRpm' });
    }
    if (!ss.items.length) ss.phase = 'track';
    // the track work: the settings the car's parts allow
    ss.track = [];
    // traction first (tires, suspension), then the launch, then the gearing:
    // gear a car that's spinning and you gear it too tall
    ['chassis', 'launch', 'drive', 'nitrous'].forEach(function (j) {
      if (jobs.indexOf(j) < 0) return;
      KEYS[j].forEach(function (k) { var dd = def(k); if (dd && dd.show(S0) && TU.knows(who, k)) ss.track.push({ k: k, grp: j }); });
    });
    ss.ti = 0; ss.sweep = 1; ss.keptSweep = false;
    // the launch as a package (worked out together in the tuner's head, then
    // one real pass): 2-step, tire pressure, gear, boost in 1st, shift point,
    // and the front/rear suspension that moves weight
    ss.comboKeys = jobs.indexOf('launch') >= 0 || jobs.indexOf('chassis') >= 0 ? ['launchRpm', 'psi', 'fd', 'gb1', 'shiftRpm', 'antiSquat', 'rebF', 'limitF'].filter(function (k) { var dd = def(k); return dd && dd.show(S0); }) : [];
    return ss;
  };
  // a boost cap at or over the boost target is no cap (shown as 99)
  function gbOf(tune, inst, i) { var a = tune.gearBoost || DR.fullTune(inst, G.spec(inst)).gearBoost, S = G.spec(inst); var b = a && a[i] != null ? a[i] : 99; return b >= S.boostSet - 0.01 ? 99 : b; }
  function gbSet(tune, inst, i, v) { var S = G.spec(inst), a = (tune.gearBoost || DR.fullTune(inst, S).gearBoost).slice(); a[i] = v >= 99 ? (S.maxBoost || 0) : v; tune.gearBoost = a; }
  function val(ss, k) { var t = ss.inst.tune; if (GB[k] != null) return gbOf(t, ss.inst, GB[k]); return t[k] != null ? t[k] : DR.fullTune(ss.inst, G.spec(ss.inst))[k]; }
  function setTune(ss, k, v) {
    if (GB[k] != null) return gbSet(ss.inst.tune, ss.inst, GB[k], v);
    ss.inst.tune[k] = v;
    if (k === 'shiftRpm') revWith(ss.inst.tune, ss.inst, v);
  }
  // the limiter follows the shift point (100 rpm over it), where it's adjustable
  function revWith(t, inst, v) { var rd = def('revLimit'), S = G.spec(inst); if (rd && rd.show(S)) t.revLimit = Math.min(rd.max(S), Math.max(rd.min(S), v + 100)); }
  // how high they'll let it rev: the valvetrain / bottom end, less how hard
  // you said to push and less for a greener tuner
  function revCeil(ss, S) { return Math.min(S.vtLimit, S.beLimit) - ss.agg.rpm - (1 - ss.who.eng / 100) * 150; }

  // ---------------------------------------------------------------- the dyno
  // what the engine is asking for at this boost: { knock, lean, safe, spark, top }
  function limits(ss, S) {
    var a = ss.agg, e = ss.who.eng / 100, margin = a.psi + (1 - e) * 1.5;
    return {
      knock: S.fiType !== 'none' && !S.diesel && S.boostSet > S.knock - margin,
      // fuel: how close to the injectors'/pump's rating they'll run (how
      // hard you said to push, less for a greener tuner)
      // and never into running lean with the nitrous shot on top (a dry kit
      // adds its fuel through the same injectors)
      lean: S.fuelDemand > (S.fuelW / DR.HP) * (1 - (a.fuel || 0.03) - (1 - e) * 0.03) || DR.fuelShort(S).ratio > 1.015,
      safe: S.peakHp + S.nosHp > S.safeHp * (1 - a.hp - (1 - e) * 0.08),
      spark: S.fiType !== 'none' && S.boostSet > S.sparkPsi,
      top: S.boostSet >= S.maxBoost - 0.01
    };
  }
  function fuelWhy(S) {
    var both = Math.abs(S.fuelInj - S.fuelPump) < 1;
    var what = both ? 'injectors and pump are' : S.fuelInj < S.fuelPump ? 'injectors are' : 'fuel pump is';
    return 'the ' + what + ' maxed out: they feed about ' + Math.round(Math.min(S.fuelInj, S.fuelPump) * S.fuelFF) + ' hp' + (S.fuelFF < 1 ? ' on ' + (S.fuelId === 'meth' ? 'methanol' : 'E85') : '') + '. Bigger ' + (both ? 'injectors and pump' : S.fuelInj < S.fuelPump ? 'injectors' : 'pump') + ' to go further';
  }
  function why(l, S) { return l.knock ? 'knock margin' : l.lean ? (S ? fuelWhy(S) : 'the fuel system is maxed out') : l.spark ? 'the ignition started to misfire' : l.safe ? 'that\'s what the internals take' : l.top ? 'the turbo/wastegate is maxed' : ''; }
  // a pull's sheet: wheel power and torque, boost and air/fuel against rpm
  function sheet(S) {
    var dy = DR.dyno(S), lam = S.fiType !== 'none' ? 0.78 : 0.86, cap = S.fuelW / DR.HP, lean = S.fuelDemand > cap ? S.fuelDemand / cap : 1, st = STOICH[S.fuelId] || 14.7;
    var pts = dy.pts.map(function (p) { var ld = p.hp / dy.peakHp; return { rpm: p.rpm, hp: p.hp * S.eff, tq: p.tq * S.eff, boost: p.boost, afr: lam * (1 + (lean - 1) * ld * ld) * st }; });
    var pk = pts.reduce(function (a, p) { return p.hp > a.hp ? p : a; }, pts[0]);
    return { pts: pts, peakHp: pk.hp, peakRpm: pk.rpm, afr: pk.afr, red: S.red, boost: S.boostSet, fi: S.fiType, maxBoost: S.maxBoost };
  }
  // the next pull: { label, note, sheet, S } (null when the dyno work is done)
  TU.nextPull = function (ss) {
    var inst = ss.inst;
    while (ss.items.length) {
      var it = ss.items[0], S, l;
      if (it.k === 'jets') {
        // jets for the parts; a careful tuner leaves it a touch rich. With a
        // data logger's wideband they read it exactly; without, plugs and a
        // tailpipe sniffer (it reads a little lean, so they err rich)
        S = G.spec(inst);
        var wbT = (DR.getOption('logger', inst).log || 0) >= 1;
        var j = S.jets, set = Math.round(j.need + ss.agg.psi * 0.25 + (wbT ? 0 : 0.6) + (1 - ss.who.eng / 100) * gauss() * (wbT ? 0.4 : 0.8));
        setTune(ss, 'jets', set); ss.items.shift(); S = G.spec(inst);
        var rd0 = DR.carbRead(S, DR.AMBIENT_C);
        return pull(ss, (j.mech ? 'Pill & nozzles ' : 'Jets ') + fmt('jets', set), 'Plugs read ' + rd0.text + (wbT ? ' (' + rd0.afr + ':1 on the wideband).' : ' (the tailpipe sniffer says about ' + (Math.round((rd0.afr + 0.3) * 10) / 10) + ':1).'), S);
      }
      if (it.k === 'boost') {
        var step = ss.who.eng >= 70 ? 1.5 : ss.who.eng >= 45 ? 1 : 0.5, bd = def('boost'), S1 = G.spec(inst);
        if (it.b == null) { it.b = val(ss, 'boost'); it.dir = 0; it.n = 0; }
        setTune(ss, 'boost', Math.round(clamp(it.b, bd.min(S1), bd.max(S1)) * 2) / 2);
        S = G.spec(inst); l = limits(ss, S); it.n++;
        var bad = l.knock || l.lean || l.safe || l.spark, note;
        if (it.dir === 0) it.dir = bad ? -1 : 1;
        if (it.fine) step = 0.5;
        if (it.dir > 0 && !bad && !l.top && it.n < 14) { note = 'Clean. Up ' + step + ' psi.'; it.ok = it.b; it.b += step; }
        else if (it.dir > 0) {
          // over the line: back to the last clean pull and stop there
          // a big step too far: come back and creep up half a psi at a time
          if (bad && it.ok != null && it.b - it.ok > 0.5 && it.n < 14) { note = 'Too far (' + why(l, S) + '). Half a psi at a time from ' + fmt('boost', it.ok) + '.'; it.fine = true; it.b = it.ok + 0.5; return pull(ss, 'Boost ' + fmt('boost', S.boostSet), note, S); }
          if (bad && it.ok != null) { setTune(ss, 'boost', it.ok); note = 'Too far (' + why(l, S) + '). Back to ' + fmt('boost', it.ok) + '.'; }
          else note = l.top ? 'That\'s all the hardware has: ' + fmt('boost', it.b) + '.' : 'Set.';
          ss.items.shift();
        }
        else if (bad && it.n < 14) { note = 'Over the line (' + why(l, S) + '). Down ' + step + ' psi.'; it.b -= step; }
        else { note = 'Safe here.'; ss.items.shift(); }
        return pull(ss, 'Boost ' + fmt('boost', S.boostSet), note, S);
      }
      if (it.k === 'revLimit') {
        var rd = def('revLimit'); S = G.spec(inst);
        var target = Math.round(clamp(revCeil(ss, S), rd.min(S), rd.max(S)) / 100) * 100;
        setTune(ss, 'revLimit', target); ss.items.shift(); S = G.spec(inst);
        return pull(ss, 'Rev limiter ' + fmt('revLimit', target), 'Valvetrain and bottom end good to ' + Math.min(S.vtLimit, S.beLimit) + ' rpm.', S);
      }
      if (it.k === 'shiftRpm') {
        ss.items.shift(); S = G.spec(inst);
        var sh = Math.round(Math.min(S.red - 100, DR.suggestShift(S)) / 100) * 100;
        setTune(ss, 'shiftRpm', sh); S = G.spec(inst);
        return pull(ss, 'Final pull', 'Shift points from the curve: ' + fmt('shiftRpm', sh) + '.', S);
      }
      ss.items.shift();
    }
    ss.phase = 'track';
    return null;
  };
  function pull(ss, lbl, note, S) {
    // the dyno time: a freelancer's tune price covers it, your staff tuner
    // books the dyno by the pull
    if (ss.who.staff) { var f = DR.dynoFee(S); G.pay(f); ss.cost.dyno += f; }
    else if (!ss.dynoPaid) { var fee = Math.round((ss.who.dyno + S.peakHp * 1.0) / 50) * 50; G.pay(fee); ss.cost.labor += fee; ss.dynoPaid = true; }
    var p = { label: lbl, note: note, sheet: sheet(S) };
    ss.pulls.push(p); ss.log.push({ pull: lbl, note: note, whp: p.sheet.peakHp, afr: p.sheet.afr });
    // a pull past the knock line can hurt it (a careful tuner backs off quick)
    var l = limits(ss, S);
    if (l.knock && S.boostSet > S.knock + 0.5 && Math.random() < 0.12 * (1 - ss.who.eng / 100)) { ss.inst.damage = { engine: true }; ss.broke = 'engine'; ss.log.push({ pit: 'It detonated on the rollers: the engine is hurt.' }); }
    G.save();
    return p;
  }

  // ---------------------------------------------------------------- the track
  // The tuner's call for a setting: what experience says this car wants
  // (worked out the way a tuner's notes from other cars would: a driven
  // quarter on a prepped strip, the tire shake rolled a few ways), missed
  // by however much their chassis skill misses by. Suspension and tire
  // pressure move in steps from where the car is, not across the whole
  // range, and a setting the car doesn't care about is left alone.
  var WIN = { psi: 4, antiSquat: 0.5, rebR: 4, rebF: 3, bumpR: 3, limitF: 30, barDeg: 2, tcGain: 3, stall: 800, clBase: 20, clLock: 1, fd: 0.5, launchRpm: 1200, nosDelay: 1, nosRamp: 1 };
  var GSTEP = { antiSquat: 0.05, fd: 0.1, launchRpm: 200, stall: 200, nosDelay: 0.2, nosRamp: 0.2, clLock: 0.2 };
  function grid(ss, k) {
    var S = G.spec(ss.inst), cur = val(ss, k), out = [], n = 7;
    if (GB[k] != null) {
      // the cap in this gear: none, or the target less 10% at a time
      var B = S.boostSet;
      [99, 0.9, 0.8, 0.7, 0.6, 0.5].forEach(function (f) { out.push(f === 99 ? 99 : Math.max(S.boostMin || 0, Math.round(B * f * 2) / 2)); });
      if (out.indexOf(cur) < 0) out.push(cur);
      return out.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
    }
    var dd = def(k), lo = dd.min(S), hi = dd.max(S), st = dd.step || 1;
    if (k === 'tcSlip') return [0, 6, 9, 12, 15, 18];
    if (k === 'luGear') { for (var g = 1; g <= hi; g++) out.push(g); return out; }
    if (k === 'psi') { var o = S.tire.optP; lo = Math.max(lo, o * 0.7); hi = Math.min(hi, o * 1.1); }
    // the whole sensible range, coarse (call() then looks finer around the best)
    if (k === 'fd') { lo = Math.max(lo, S.car.fd * 0.75); hi = Math.min(hi, S.car.fd * 1.25); }
    if (k === 'launchRpm') { lo = Math.max(lo, S.idle + 1000); hi = Math.min(hi, S.red - 300); }
    if (k === 'shiftRpm') {
      // past the limiter only where the tuner can raise it with the shift point
      var rdf = def('revLimit'), up = rdf && rdf.show(S) ? Math.min(rdf.max(S), revCeil(ss, S)) - 100 : S.limit - 50;
      lo = Math.max(lo, S.peakHpRpm - 300); hi = Math.max(lo, up);
    }
    n = 9;
    for (var i = 0; i < n; i++) out.push(Math.round((lo + (hi - lo) * i / (n - 1)) / st) * st);
    out.push(cur);
    out = out.map(function (v) { return +(+v).toFixed(3); });
    return out.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
  }
  // the model: a quarter on a prepped strip driven flat out, the shake
  // rolled three ways. A good tune has the car at its limit with the driver
  // never lifting: the 2-step, boost by gear and the traction control do
  // what a driver's foot would otherwise have to. So the model doesn't
  // pedal spin: from the hit to the stripe the throttle is pinned.
  // what the drive tires' wear costs a pass on a prepped strip (seconds):
  // the car on these tires against the same car on fresh ones
  TU.TIRES_FIRST = 0.25;    // the tuner wants fresh tires before tuning past this
  TU.tireCost = function (inst) {
    var w = inst.wear && inst.wear.rtires;
    if (!w || w.w < 0.05) return 0;
    var key = w.w.toFixed(3) + JSON.stringify(inst.tune || {}) + JSON.stringify(inst.parts || {});
    if (tcMemo.key === key && tcMemo.uid === inst.uid) return tcMemo.c;
    var cond = DR.conditions('prep', false);
    function et(S) {
      var sum = 0;
      [0.8, 1.2].forEach(function (sr) {
        var sim = new DR.Sim(S, { cond: cond, shakeRnd: sr, dist: DR.QUARTER, tireT: S.tire.topt }), ai = modelDriver(), dt = 1 / 400, tG = -1.2;
        while (!sim.finished && tG < 40 && !sim.crashed && !sim.blown) { sim.step(dt, ai.input(sim, tG, dt)); tG += dt; }
        sum += sim.finished ? sim.et : 30;
      });
      return sum / 2;
    }
    var worn = et(DR.buildSpec(inst, inst.tune));
    inst.wear.rtires = null;
    var fresh;
    try { fresh = et(DR.buildSpec(inst, inst.tune)); } finally { inst.wear.rtires = w; }
    tcMemo = { key: key, uid: inst.uid, c: Math.max(0, worn - fresh) };
    return tcMemo.c;
  };
  var tcMemo = {};
  // a hired tuner's word on the tires, for the garage and the timeslip
  // ('' with no tuner on the team, or tires that aren't costing time)
  TU.tireHint = function (inst) {
    var t = DR.Team && DR.Team.tuner('drag'), w = inst.wear && inst.wear.rtires;
    if (!t || !w || w.w < TU.TIRES_FIRST) return '';
    var c = TU.tireCost(inst);
    if (c < 0.02) return '';
    return t.name.split(' ')[0] + ': these tires cost about ' + c.toFixed(2) + ' s a pass.';
  };
  function modelDriver() {
    var ai = new DR.AIDriver(1, function () { return 0.5; });
    ai.react = 0; ai.launchErr = 0; ai.shiftErr = 0;
    var inp0 = ai.input;
    // (pinned, but for tire shake: every driver pedals that, and the tune
    // that shakes pays for the pedal)
    ai.input = function (sim, tG, dt) { var o = inp0.call(this, sim, tG, dt); if (sim.launched && !(sim.shake > 0.35)) o.throttle = 1; return o; };
    return ai;
  }
  function score(ss, k, v) {
    var t = JSON.parse(JSON.stringify(ss.inst.tune));
    if (GB[k] != null) gbSet(t, ss.inst, GB[k], v); else t[k] = v;
    if (k === 'shiftRpm') revWith(t, ss.inst, v);
    var key = JSON.stringify(t); ss.memo = ss.memo || {};
    if (ss.memo[key] != null) return ss.memo[key];
    var S = DR.buildSpec(ss.inst, t), cond = condOf(ss), sum = 0, dist = TU.WHERE[ss.surf || 'prep'].dist();
    ss.finfo = ss.finfo || {};
    [0.7, 1, 1.3].forEach(function (sr) {
      var sim = new DR.Sim(S, { cond: cond, shakeRnd: sr, dist: dist, tireT: S.tire.topt });
      var ai = modelDriver(ss), dt = 1 / 400, tG = -1.2;
      while (!sim.finished && tG < 40 && !sim.crashed && !sim.blown) { sim.step(dt, ai.input(sim, tG, dt)); tG += dt; }
      sum += sim.finished ? sim.et : 30;
      if (sr === 1) ss.finfo[key] = { toppedOut: sim.gear >= S.ratios.length - 1 && sim.rpm() >= S.limit - 150, endRpm: sim.rpm(), peak: S.peakHpRpm };
    });
    return (ss.memo[key] = sum / 3);
  }
  TU.score = score;
  // the model's ET for the tune as it is on the car now
  function scoreNow(ss) { var k = ss.comboKeys && ss.comboKeys[0] || 'psi'; return score(ss, k, val(ss, k)); }
  function fdKey(ss, v) { var t = JSON.parse(JSON.stringify(ss.inst.tune)); t.fd = v; return JSON.stringify(t); }
  var FLAT = 0.004, WORTH = 0.006;
  function call(ss, k) {
    var g = grid(ss, k), cur = val(ss, k), ci = g.indexOf(+(+cur).toFixed(3)), sc = g.map(function (v) { return score(ss, k, v); });
    if (k === 'fd') {
      // gear it to cross the stripe at (or a little past) peak power, not
      // lugging through the traps in a gear it doesn't pull
      var okFd = g.map(function (v) { var fi = ss.finfo[fdKey(ss, v)]; return !fi || fi.toppedOut || fi.endRpm >= 0.92 * fi.peak; });
      if (okFd.some(Boolean)) sc = sc.map(function (x, i) { return okFd[i] || i === ci ? x : x + 1; });
    }
    // finer around the coarse best (a click at a time between its neighbours)
    var b0 = sc.indexOf(Math.min.apply(null, sc)), fst = GSTEP[k] || (def(k) && def(k).step) || 1;
    if (GB[k] == null && k !== 'tcSlip' && k !== 'luGear') {
      var fl = g[Math.max(0, b0 - 1)], fh = g[Math.min(g.length - 1, b0 + 1)];
      for (var fv = fl; fv <= fh + 1e-9; fv += fst) { var vv = +(+fv).toFixed(3); if (g.indexOf(vv) < 0) { g.push(vv); sc.push(score(ss, k, vv)); } }
      var ord = g.map(function (v, i) { return [v, sc[i]]; }).sort(function (a, b) { return a[0] - b[0]; });
      g = ord.map(function (x) { return x[0]; }); sc = ord.map(function (x) { return x[1]; }); ci = g.indexOf(+(+cur).toFixed(3));
    }
    var bs = Math.min.apply(null, sc), bi = ci;
    // of the settings within a whisker of the best, the one nearest where the car is
    g.forEach(function (v, i) { if (sc[i] <= bs + FLAT && (bi < 0 || sc[bi] > bs + FLAT || Math.abs(i - ci) < Math.abs(bi - ci))) bi = i; });
    // not worth a pass: nothing to find there
    if (ci >= 0 && sc[ci] - sc[bi] < WORTH) bi = ci;
    var miss = bi === ci ? 0 : Math.round(gauss() * (1 - ss.who.chs / 100) * 2);
    var gi = clamp(bi + miss, 0, g.length - 1);
    return { opt: g[bi], guess: g[gi], gain: ci >= 0 ? sc[ci] - sc[bi] : 0 };
  }
  // the next pass: { label, k, v } (null when done). The setting goes on
  // the car for the pass.
  // the launch package: coordinate descent over the keys in the model,
  // round after round until nothing moves (settings work together), then a
  // miss by skill on each
  function comboCall(ss) {
    var keys = ss.comboKeys, start = {}, moved = false;
    keys.forEach(function (k) { start[k] = val(ss, k); });
    for (var round = 0; round < 3; round++) {
      var any = false;
      keys.forEach(function (k) {
        var c = call(ss, k), cur = val(ss, k);
        if (c.opt !== cur && score(ss, k, cur) - score(ss, k, c.opt) >= 0.002) { setTune(ss, k, c.opt); any = true; }
      });
      if (!any) break;
    }
    var out = {};
    keys.forEach(function (k) {
      // a setting they moved lands a click or two off by skill (fine steps;
      // the ones they left alone stay put)
      var v = val(ss, k), sd = 1 - ss.who.chs / 100;
      if (JSON.stringify(v) !== JSON.stringify(start[k])) {
        if (GB[k] != null || k === 'tcSlip' || k === 'luGear') {
          var g = grid(ss, k), i = g.indexOf(+(+v).toFixed(3)), m1 = Math.round(gauss() * sd * 0.8);
          if (m1 && i >= 0) { v = g[clamp(i + m1, 0, g.length - 1)]; setTune(ss, k, v); }
        } else {
          var dk = def(k), S = G.spec(ss.inst), fst = GSTEP[k] || dk.step || 1, m2 = Math.round(gauss() * sd * 1.5);
          if (m2) { v = +clamp(v + m2 * fst, dk.min(S), dk.max(S)).toFixed(3); setTune(ss, k, v); }
        }
      }
      if (JSON.stringify(v) !== JSON.stringify(start[k])) { out[k] = v; moved = true; }
    });
    // back to the start: the pass puts the package on
    keys.forEach(function (k) { setTune(ss, k, start[k]); });
    return moved ? { set: out, was: start } : null;
  }
  TU.nextPass = function (ss) {
    if (ss.broke) return null;
    if (ss.best == null) return { label: 'Baseline', k: null };
    if (ss.comboKeys && ss.comboKeys.length && !ss.comboDone) {
      ss.comboDone = true;
      var cb = comboCall(ss);
      if (cb) {
        Object.keys(cb.set).forEach(function (k) { setTune(ss, k, cb.set[k]); });
        return { label: 'Launch package: ' + Object.keys(cb.set).map(function (k) { return label(k) + ' ' + fmt(k, cb.set[k]); }).join(', '), k: '_combo', combo: cb };
      }
      ss.log.push({ check: 'Launch package', note: 'the launch settings already work together: no change' });
    }
    while (ss.ti < ss.track.length) {
      var it = ss.track[ss.ti];
      if (!it.call) it.call = call(ss, it.k);
      var cur = val(ss, it.k);
      if (!it.tried) {
        if (it.call.guess === cur) {
          it.tried = true; it.kept = true;
          // checked, and the data says leave it: on the notes, so the work shows
          ss.log.push({ check: label(it.k) + ' ' + fmt(it.k, cur), note: it.call.gain >= WORTH ? 'their read says leave it' : 'already right for this car: no pass needed' });
        }
        else { it.tried = true; it.was = cur; it.unset = GB[it.k] == null && ss.inst.tune[it.k] == null; it.v = it.call.guess; setTune(ss, it.k, it.v); return { label: label(it.k) + ' ' + fmt(it.k, it.v), k: it.k, v: it.v }; }
      }
      // a tuner who reads the data well goes once more, to where the data
      // points, if it's worth a pass from here
      if (!it.refined && ss.who.dat >= 55 && it.call.opt !== cur && (it.kept ? ss.who.dat >= 55 : ss.who.dat >= 70) && score(ss, it.k, cur) - score(ss, it.k, it.call.opt) >= WORTH) {
        it.refined = true; it.was = cur; it.unset = GB[it.k] == null && ss.inst.tune[it.k] == null; it.v = it.call.opt; setTune(ss, it.k, it.v);
        return { label: label(it.k) + ' ' + fmt(it.k, it.v) + ' (from the data)', k: it.k, v: it.v };
      }
      ss.ti++;
    }
    // settings move each other: once more round if anything changed
    if (ss.sweep === 1 && ss.keptSweep && ss.track.length) {
      ss.sweep = 2; ss.keptSweep = false; ss.ti = 0;
      ss.track.forEach(function (it) { it.tried = false; it.kept = false; it.refined = false; it.call = null; });
      ss.log.push({ check: 'Second sweep', note: 'settings move each other: going round once more' });
      return TU.nextPass(ss);
    }
    // the proof: one pass on the final tune against the baseline
    if (ss.changed && !ss.confirmed) { ss.confirmed = true; return { label: 'Confirm the tune', k: null, confirm: true }; }
    return null;
  };
  // after a pass: keep the change if it's quicker. One pass is noisy (a
  // couple of hundredths either way from the driver alone), so a tuner
  // weighs the slip against the 60-foot, the logger and what they know of
  // the car: the better they read data, the less one lucky or unlucky pass
  // fools them. Returns the tuner's note. res: { et, sixty, aborted }
  TU.record = function (ss, pass, res) {
    var S = G.spec(ss.inst), fuel = DR.runCost(S).total;
    G.pay(fuel + TU.TRACK_FEE); ss.cost.fuel += fuel; ss.cost.track += TU.TRACK_FEE; ss.passes++;
    if (!ss.who.staff && !ss.dayPaid) { var dayFee = Math.round(ss.who.day * (ss.costK || 1) / 10) * 10; G.pay(dayFee); ss.cost.labor += dayFee; ss.dayPaid = true; }
    var note, et = res.et;
    ss.log.push({ pass: pass.label, et: res.et, sixty: res.sixty, aborted: res.aborted });
    // a bad pass: a tuner who reads data well doesn't learn from it
    // (a data logger shows a spun pass for what it was: any tuner reruns it)
    var logLvl = DR.Logbook ? DR.Logbook.level(ss.inst) : 0;
    if (res.aborted && (ss.who.dat >= 45 || (logLvl >= 2 && res.aborted === 'the tires spun')) && !pass.rerun) {
      pass.rerun = true; ss.again = pass;
      note = 'Threw that one out (' + res.aborted + '). Run it again.';
    } else if (pass.confirm) {
      ss.confirmEt = et;
      note = 'The final tune: ' + (et < 90 ? et.toFixed(3) : 'DNF') + (ss.baseEt < 90 && et < 90 ? ' (baseline ' + ss.baseEt.toFixed(3) + ').' : '.');
    } else if (pass.k === null) {
      ss.best = et; ss.refEt = et; if (ss.baseEt == null) ss.baseEt = et; note = 'Baseline ' + (et < 90 ? et.toFixed(3) : 'DNF') + '.';
    } else if (pass.k === '_combo') {
      // the launch package, kept or undone as a whole
      var cb = pass.combo, keys = Object.keys(cb.set), mWith = scoreNow(ss);
      keys.forEach(function (k) { setTune(ss, k, cb.was[k]); });
      var mWas = scoreNow(ss);
      var measC = et < 90 && ss.best < 90 ? clamp(et - ss.best, -0.15, 0.15) : (et < 90 ? -0.15 : 0.15);
      var conC = ss.drv ? ss.drv.con / 100 : 0.7, wC = clamp(0.15 + 0.35 * ss.who.dat / 100 + 0.1 * logLvl, 0.15, 0.6);
      var judgedC = (1 - wC) * measC + wC * (mWith - mWas), refC = ss.refEt != null ? ss.refEt : ss.best;
      if (judgedC < -0.004 && et < 90 && et <= refC + 0.02) {
        keys.forEach(function (k) { setTune(ss, k, cb.set[k]); });
        ss.best = Math.min(ss.best, et); ss.refEt = et; ss.changed = true;
        note = et.toFixed(3) + ': the package works. Keeping it.';
      } else note = (et < 90 ? et.toFixed(3) : 'No time') + ': the package didn\'t pay off. Back to how it was.';
    } else {
      var it = ss.track[ss.ti], was = it ? it.was : val(ss, pass.k);
      var meas = et < 90 && ss.best < 90 ? clamp(et - ss.best, -0.08, 0.08) : (et < 90 ? -0.08 : 0.08);
      // how much one slip says: less from an inconsistent driver
      var con = ss.drv ? ss.drv.con / 100 : 0.7;
      // the car's data logger: the tuner reads each pass from the log, not
      // just the slip (Basic +0.1, Race +0.2, Pro +0.3)
      var model = score(ss, pass.k, pass.v) - score(ss, pass.k, was), w = clamp(0.15 + 0.35 * ss.who.dat / 100 + 0.15 * (1 - con) + 0.1 * logLvl, 0.15, 0.6);
      // (the slip against the last pass on the setup it's being compared with)
      var judged = (1 - w) * meas + w * model, quicker = et < (ss.refEt != null ? ss.refEt : ss.best) - 0.005;
      if (judged < -0.004 && et < 90 && et <= (ss.refEt != null ? ss.refEt : ss.best) + 0.02) {
        ss.best = Math.min(ss.best, ss.best + judged); ss.refEt = et; if (it) it.kept = true; ss.changed = true; ss.keptSweep = true;
        note = quicker ? 'Quicker: ' + et.toFixed(3) + '. Keeping ' + fmt(pass.k, pass.v) + '.' : (et < 90 ? et.toFixed(3) : 'No time') + ': the slip says no, but the 60-foot and the logger say it helps (that pass was off). Keeping ' + fmt(pass.k, pass.v) + '.';
      } else {
        if (it) { if (it.unset) delete ss.inst.tune[pass.k]; else setTune(ss, pass.k, it.was); }
        note = quicker ? et.toFixed(3) + ': quicker, but that was the pass, not the setting. Back to ' + fmt(pass.k, was) + '.' : (et < 90 ? et.toFixed(3) : 'No time') + ': no better. Back to ' + fmt(pass.k, was) + '.';
      }
    }
    ss.log[ss.log.length - 1].note = note;
    G.save();
    return note;
  };
  // the pass to make next (a rerun of a thrown-out one first)
  TU.upcoming = function (ss) {
    if (ss.again) { var p = ss.again; ss.again = null; if (p.k) setTune(ss, p.k, p.v); return p; }
    return TU.nextPass(ss);
  };
  // what the session changed, and the tuner learns from it
  TU.finish = function (ss) {
    var ch = {}, t = ss.inst.tune;
    // against what the car ran on before (its defaults where it had none)
    Object.keys(t).forEach(function (k) {
      var was = ss.t0[k] != null ? ss.t0[k] : ss.d0[k];
      if (t[k] !== was && JSON.stringify(t[k]) !== JSON.stringify(was)) ch[k] = t[k];
    });
    if (ss.who.staff && DR.Team) DR.Team.learnTuner(ss.who.staff);
    G.save();
    return ch;
  };
  // a pass made by one of your drag drivers, off screen
  TU.simPass = function (inst, drvId, surf) {
    var d = DR.Team.staff(drvId), S = G.spec(inst), w = TU.WHERE[surf || 'prep'], cond = DR.conditions(surf || 'prep', w.night);
    var sim = new DR.Sim(S, { cond: cond, shakeRnd: 0.6 + Math.random() * 0.8, dist: w.dist(), tireT: S.tire.topt });
    var ai = DR.AIDriver.fromDrag(d), dt = 1 / 400, tG = -1.2;
    while (!sim.finished && tG < 60 && !sim.crashed && !sim.blown && !sim.broke) { sim.step(dt, ai.input(sim, tG, dt)); tG += dt; }
    sim.tireE += S.peakHp * 745.7 * 0.9;     // their burnout
    G.addWear(inst, S, sim, 1);
    DR.Team.learnDrag(d, false);
    var res = { et: sim.finished ? sim.et : 99, sixty: sim.splits['60ft'] ? sim.splits['60ft'].t : 9, aborted: abortWhy(sim) || (DR.Logbook.level(inst) >= 2 && (sim.wspin || 0) > 0.3 ? 'the tires spun' : '') };
    if (sim.blown || sim.broke) { inst.damage = sim.blown ? { engine: true } : { trans: true }; res.broke = true; }
    return res;
  };
  function abortWhy(sim) { return sim.blown || sim.broke ? 'it broke' : !sim.finished ? 'didn\'t finish' : sim.shakeMax > 0.6 ? 'tire shake' : ''; }
  // a pass the tires spun on (a Race logger or better shows it)
  TU.abortWhy = abortWhy;

  // ---------------------------------------------------------------- screens
  TU.active = null;
  TU.open = function (inst) {
    if (inst.damage) return UI.toast('Repair your car first!');
    if (TU.active && TU.active.inst === inst) return passPrompt(TU.active);
    var staff = DR.Team && DR.Team.tuner('drag'), whoSel = staff ? 'staff' : 'local', jobs = { engine: true, chassis: true, launch: true, drive: false, nitrous: false }, agg = 'bal', where = 'prep', close;
    var S = G.spec(inst), quote = h('div', { class: 'dim gsmall' }), scope = h('div', { class: 'gsmall' }), go;
    var drivers = DR.Team ? DR.Team.dragDrivers() : [], drvSel = drivers.length ? drivers[0].id : 'me';
    function covers() {
      var w = who(), out = [];
      chosen().forEach(function (j) { (KEYS[j] || []).forEach(function (k) { var dd = def(k); if (dd && dd.show(S) && TU.knows(w, k)) out.push(label(k)); }); });
      var miss = [];
      chosen().forEach(function (j) { (KEYS[j] || []).forEach(function (k) { var dd = def(k); if (dd && dd.show(S) && !TU.knows(w, k)) miss.push(label(k)); }); });
      return (out.length ? 'Works on: ' + out.join(', ') + '.' : '') + (miss.length ? ' Won\'t touch (beyond them): ' + miss.join(', ') + '.' : '');
    }
    function who() {
      if (whoSel === 'staff') return { name: staff.name, eng: staff.eng, chs: staff.chs, dat: staff.dat, staff: staff };
      var f = TU.FREELANCE[whoSel]; return { name: f.name, eng: f.eng, chs: f.chs, dat: f.dat, dyno: f.dyno, day: f.day };
    }
    function chosen() { return TU.JOBS.filter(function (j) { return jobs[j.id]; }).map(function (j) { return j.id; }); }
    function upd() {
      var w = who(), js = chosen(), eng = js.indexOf('engine') >= 0, trk = js.some(function (j) { return j !== 'engine'; });
      var dynoCost = !eng ? 0 : w.staff ? DR.dynoFee(S) + ' a pull (about 4-10 pulls)' : DR.money(Math.round((w.dyno + S.peakHp) / 50) * 50) + ' for the dyno tune';
      quote.textContent = (eng ? 'Dyno: ' + (w.staff ? DR.money(DR.dynoFee(S)) + ' a pull, about 4-10 pulls. ' : dynoCost + '. ') : '') +
        (trk ? (where === 'both' ? 'Strip, then street: ' : where === 'street' ? 'Street: ' : 'Track: ') + (w.staff ? '' : DR.money(Math.round(w.day * (where === 'both' ? 1 + TU.BOTH_K : 1) / 10) * 10) + ' for the ' + (where === 'both' ? 'two tunes' : 'day') + ', ') + DR.money(DR.runCost(S).total + TU.TRACK_FEE) + ' a pass (fuel and the ticket), about ' + (2 + js.length * 2) * (where === 'both' ? 2 : 1) + ' passes, each one wearing the car.' : '');
      go.disabled = !js.length;
      scope.textContent = covers();
    }
    function radio(name, opts, cur, on) {
      return h('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap' } }, opts.map(function (o) {
        var b = btn(o[1], function () { on(o[0]); Array.prototype.forEach.call(b.parentNode.children, function (x) { x.classList.remove('on'); }); b.classList.add('on'); upd(); }, 'chip' + (o[0] === cur ? ' on' : ''));
        return b;
      }));
    }
    function start() {
      var js = chosen(), trackJobs = js.filter(function (j) { return j !== 'engine'; });
      var ss = TU.session(inst, who(), js, agg, drvSel, where === 'street' ? 'street' : 'prep');
      if (where === 'both' && trackJobs.length) ss.then = { jobs: trackJobs };
      TU.active = ss; close();
      if (ss.phase === 'dyno') dynoPhase(ss); else passPrompt(ss);
    }
    // tires first: a tune found on worn tires won't hold on fresh ones
    go = btn('Start', function () {
      var w = inst.wear && inst.wear.rtires, trk = chosen().some(function (j) { return j !== 'engine'; });
      if (!trk || !w || w.w < TU.TIRES_FIRST) return start();
      var cost = G.servicePrice(inst, 'rtires'), c = TU.tireCost(inst), close2;
      close2 = UI.modal([h('div', { class: 'pix acc' }, 'TIRES FIRST'),
        h('p', {}, who().name + ': "Your drive tires are ' + Math.round(w.w * 100) + '% worn' + (c >= 0.01 ? ', costing about ' + c.toFixed(2) + ' s a pass' : '') + '. A tune I find on them won\'t hold on fresh ones: I\'d put new ones on first."'),
        h('div', { class: 'row', style: { justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' } },
          btn('Cancel', function () { close2(); }),
          btn('Tune on these', function () { close2(); start(); }),
          btn('Fit fresh tires ' + DR.money(cost), function () {
            if (!G.service(inst, ['rtires'])) return UI.toast('Not enough money');
            A.cash(); close2(); start();
          }, 'primary' + (G.canAfford(cost) ? '' : ' disabled')))]);
    }, 'primary');
    var whoOpts = (staff ? [['staff', staff.name + ' (staff)']] : []).concat([['local', 'Local tuner'], ['pro', 'Pro tuner']]);
    close = UI.modal([h('div', { class: 'pix acc' }, 'TUNER'),
      h('div', { class: 'plvl' }, 'WHO'), radio('who', whoOpts, whoSel, function (v) { whoSel = v; }),
      h('div', { class: 'dim gsmall' }, staff ? 'Your staff tuner works for their wage.' : 'No staff tuner: hire one at Team (on the garage), or book a freelancer.'),
      h('div', { class: 'plvl', style: { marginTop: '6px' } }, 'WHO DRIVES'),
      radio('drv', drivers.map(function (d) { return [d.id, d.name]; }).concat([['me', 'Me']]), drvSel, function (v) { drvSel = v; }),
      h('div', { class: 'dim gsmall' }, 'The tuner tunes the car to run flat out, so whoever drives never has to lift: the 2-step, boost by gear and the traction control do that work. A more consistent driver\'s slips are easier to read.'),
      h('div', { class: 'plvl', style: { marginTop: '6px' } }, 'WHERE'),
      radio('where', [['prep', 'Strip (prepped)'], ['street', 'Street'], ['both', 'Both (' + Math.round((1 + TU.BOTH_K) * 10) / 10 + 'x)']], where, function (v) { where = v; }),
      h('div', { class: 'dim gsmall' }, 'The street has far less grip than a prepped strip: a strip tune spins there. Each tune is saved as a setup you pick before a race.'),
      h('div', { class: 'plvl', style: { marginTop: '6px' } }, 'HOW FAR TO GO'),
      h('div', { class: 'col' }, TU.JOBS.filter(function (j) { return j.id !== 'nitrous' || S.nosW; }).map(function (j) {
        var cb = h('input', { type: 'checkbox', checked: !!jobs[j.id] });
        cb.addEventListener('change', function () { jobs[j.id] = cb.checked; upd(); });
        return h('label', { class: 'row', style: { gap: '8px' } }, cb, h('span', {}, j.name), h('span', { class: 'dim gsmall' }, j.what));
      })),
      h('div', { class: 'plvl', style: { marginTop: '6px' } }, 'HOW HARD TO LEAN ON IT'),
      radio('agg', Object.keys(TU.AGG).map(function (k) { return [k, TU.AGG[k].name]; }), agg, function (v) { agg = v; }),
      scope, quote,
      h('div', { class: 'row', style: { justifyContent: 'flex-end', gap: '8px', marginTop: '8px' } }, btn('Cancel', function () { close(); }), go)]);
    upd();
  };

  // the dyno: watch every pull, or skip
  function dynoPhase(ss) {
    var inst = ss.inst, S = G.spec(inst), cv = h('canvas', { class: 'dynograph', width: 480, height: 190 }), lbl = h('div', { class: 'pix acc' }), note = h('div', {}), cnt = h('div', { class: 'dim gsmall' });
    var skipAll = false, cur = null, prev = null, p = 1, raf = 0, voice = null, close;
    function draw() {
      var c = cv.getContext('2d'), W = cv.width, H = cv.height;
      c.fillStyle = '#0c0d10'; c.fillRect(0, 0, W, H);
      if (!cur) return;
      var L = 30, R = W - 30, T = 10, B = H - 18, sh = cur.sheet, r1 = sh.red + 200;
      var maxV = Math.max(100, Math.max.apply(null, sh.pts.map(function (q) { return Math.max(q.hp, q.tq); })) * 1.15);
      function X(r) { return L + (r - 1000) / (r1 - 1000) * (R - L); }
      function Y(v) { return B - v / maxV * (B - T); }
      c.fillStyle = '#1b1d24'; for (var r = 1000; r <= r1; r += 1000) { c.fillRect(Math.round(X(r)), T, 1, B - T); DR.pixText(c, String(r / 1000), Math.round(X(r)) - 1, B + 5, '#666'); }
      function line(s, key, col, upto) { c.fillStyle = col; s.pts.forEach(function (q) { if (q.rpm <= upto) c.fillRect(Math.round(X(q.rpm)), Math.round(Y(q[key])), 2, 2); }); }
      if (prev) { c.globalAlpha = 0.3; line(prev.sheet, 'tq', '#4da3ff', 1e9); line(prev.sheet, 'hp', '#ffcc00', 1e9); c.globalAlpha = 1; }
      var lim = 1000 + (r1 - 1000) * p;
      line(sh, 'tq', '#4da3ff', lim); line(sh, 'hp', '#ffcc00', lim);
      if (sh.fi !== 'none') { c.fillStyle = '#46e07a'; sh.pts.forEach(function (q) { if (q.rpm <= lim) c.fillRect(Math.round(X(q.rpm)), Math.round(B - q.boost / Math.max(sh.maxBoost, 1) * (B - T) * 0.5), 1, 1); }); }
      DR.pixText(c, 'WHP', R + 2, T + 2, '#ffcc00'); DR.pixText(c, 'WTQ', R + 2, T + 10, '#4da3ff'); if (sh.fi !== 'none') DR.pixText(c, 'PSI', R + 2, T + 18, '#46e07a');
    }
    function stopVoice() { if (voice) { A.stopAll(); voice = null; } }
    function next() {
      prev = cur; cur = TU.nextPull(ss);
      if (!cur || ss.broke) { cancelAnimationFrame(raf); stopVoice(); close(); return ss.broke ? notes(ss) : passPrompt(ss); }
      lbl.textContent = 'PULL ' + ss.pulls.length + ': ' + cur.label; note.textContent = ''; cnt.textContent = '';
      if (skipAll) { p = 1; draw(); show(); return setTimeout(next, 30); }
      p = 0; var t0 = performance.now(), Sx = G.spec(inst);
      try { A.init(); A.resume(); if (!voice && A.engine && (!A.banksReady || A.banksReady([Sx.eng]))) voice = A.engine(Sx.eng, 0.7, A.buildOf(Sx)); } catch (e) { voice = null; }
      (function tick() {
        p = Math.min(1, (performance.now() - t0) / 2600);
        if (voice) A.update(voice, 1000 + (cur.sheet.red + 200 - 1000) * p, p < 1 ? 1 : 0, p < 1 ? DR.steadyBoost(Sx, 1000 + (cur.sheet.red - 800) * p) : 0, 0, Sx.fiType);
        draw();
        if (p < 1) raf = requestAnimationFrame(tick); else { show(); setTimeout(function () { if (!skipAll && cur) next(); }, 1400); }
      })();
    }
    function show() { note.textContent = cur.note; cnt.textContent = Math.round(cur.sheet.peakHp) + ' whp @ ' + cur.sheet.peakRpm + ' • AFR ' + cur.sheet.afr.toFixed(1) + ':1' + (cur.sheet.fi !== 'none' ? ' • ' + cur.sheet.boost.toFixed(1) + ' psi' : ''); }
    close = UI.modal([h('div', { class: 'plvl' }, 'ON THE DYNO WITH ' + ss.who.name.toUpperCase()), lbl, cv, cnt, note,
      h('div', { class: 'row', style: { justifyContent: 'flex-end', gap: '8px', marginTop: '6px' } },
        btn('Skip', function () { cancelAnimationFrame(raf); p = 1; draw(); show(); next(); }),
        btn('Skip all', function () { skipAll = true; cancelAnimationFrame(raf); stopVoice(); next(); }, 'primary'))]);
    next();
  }

  // the next pass: who drives it
  function passPrompt(ss) {
    var inst = ss.inst;
    if (inst.damage) return notes(ss);
    var due = G.wearList(inst).filter(function (x) { return x.w >= TU.WORN; });
    if (due.length) return pitStop(ss, due);
    var pass = TU.upcoming(ss);
    if (!pass) return notes(ss);
    ss.cur = pass;
    var drivers = DR.Team ? DR.Team.dragDrivers() : [], close;
    // the session's driver keeps going on their own
    if (ss.auto && drivers.some(function (d) { return d.id === ss.auto; })) { ss.cur = pass; return setTimeout(function () { simPass(ss, ss.auto); }, 30); }
    if (ss.drv) drivers = [ss.drv].concat(drivers.filter(function (d) { return d.id !== ss.drv.id; }));
    var rows = [];
    drivers.forEach(function (d, i) {
      rows.push(btn(d.name + ' drives', function () { close(); runPass(ss, d.id); }, i ? '' : 'primary'));
      rows.push(btn('Skip', function () { close(); simPass(ss, d.id); }));
      if (!i) rows.push(btn(d.name + ' runs the rest', function () { close(); ss.auto = d.id; simPass(ss, d.id); }));
    });
    rows.push(btn('Drive it yourself', function () { close(); runPass(ss, null); }, drivers.length ? 'small' : 'primary'));
    close = UI.modal([h('div', { class: 'plvl' }, 'TEST PASS ' + (ss.passes + 1) + ' • ' + ss.who.name.toUpperCase()),
      h('div', { class: 'pix acc' }, pass.label),
      h('div', { class: 'dim gsmall' }, 'Prepped strip, daytime. ' + (ss.best != null ? 'Best so far ' + ss.best.toFixed(3) + '.' : '') + ' Fuel and the ticket: ' + DR.money(DR.runCost(G.spec(inst)).total + TU.TRACK_FEE) + '.'),
      h('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap', marginTop: '8px' } }, rows),
      h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '8px' } }, btn('End the session', function () { close(); notes(ss); }, 'small'))]);
  }
  function pitStop(ss, due) {
    var cost = due.reduce(function (a, x) { return a + x.price; }, 0), what = due.map(function (x) { return x.cat === 'rtires' ? 'tires' : 'clutch'; }).join(' & '), close;
    close = UI.modal([h('div', { class: 'pix acc' }, 'PIT STOP'),
      h('p', {}, due.map(function (x) { return (x.cat === 'rtires' ? 'The drive tires are ' : 'The clutch is ') + Math.round(x.w * 100) + '% worn'; }).join('; ') + '. Tuning on them would tune the car to parts that are used up.'),
      h('div', { class: 'row', style: { justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' } },
        btn('End the session', function () { close(); notes(ss); }),
        btn('Fit fresh ' + what + ' ' + DR.money(cost), function () {
          if (!G.service(ss.inst, due.map(function (x) { return x.cat; }))) return UI.toast('Not enough money');
          ss.cost.parts += cost; ss.log.push({ pit: 'Fresh ' + what + ' fitted' });
          // a new baseline on the fresh parts
          ss.best = null; ss.refEt = null; ss.auto = ss.auto || null; A.cash(); close(); passPrompt(ss);
        }, 'primary' + (G.canAfford(cost) ? '' : ' disabled')))]);
  }
  function runPass(ss, drvId) {
    if (ss.surf === 'street') DR.Race.start({ mode: 'test', dist: DR.EIGHTH, theme: 'street', grip: DR.Race.SURF_BASE.street, night: true, surface: 'street', driver: drvId, tuner: { label: ss.cur.label }, back: 'tune' });
    else DR.Race.start({ mode: 'test', dist: DR.QUARTER, theme: 'strip', grip: 1, night: false, surface: 'prep', driver: drvId, tuner: { label: ss.cur.label }, back: 'tune' });
  }
  // a driver is paid for the day, once a session
  function payDriver(ss, drvId) {
    var d = drvId && DR.Team ? DR.Team.staff(drvId) : null;
    if (!d) return;
    ss.drvPaid = ss.drvPaid || {};
    if (ss.drvPaid[drvId]) return;
    ss.drvPaid[drvId] = true; G.pay(d.wage); ss.cost.driver += d.wage;
  }
  function simPass(ss, drvId) {
    payDriver(ss, drvId);
    var res = TU.simPass(ss.inst, drvId, ss.surf), noteTxt = TU.record(ss, ss.cur, res);
    if (res.broke) ss.broke = true;
    UI.toast(ss.cur.label + ': ' + (res.et < 90 ? res.et.toFixed(3) : 'DNF') + '. ' + noteTxt);
    if (res.broke) return notes(ss);
    setTimeout(function () { passPrompt(ss); }, 50);
  }
  // called from the timeslip of a tuner's pass
  TU.passDone = function (res, drvId) {
    var ss = TU.active; if (!ss) return '';
    payDriver(ss, drvId);
    if (ss.inst.damage) ss.broke = true;
    return TU.record(ss, ss.cur, res);
  };
  TU.resume = function () { var ss = TU.active; if (!ss) return; UI.show(UI.Tune); setTimeout(function () { passPrompt(ss); }, 60); };
  TU.end = function () { var ss = TU.active; if (!ss) return; UI.show(UI.Tune); setTimeout(function () { notes(ss); }, 60); };

  // the tuner's result is kept as a setup sheet ('Strip tune' / 'Street tune')
  function saveSetup(ss) {
    var inst = ss.inst, nm = TU.WHERE[ss.surf || 'prep'].setup, list = inst.setups || (inst.setups = []);
    var same = list.filter(function (x) { return x.name === nm; })[0], tune = JSON.parse(JSON.stringify(inst.tune));
    if (same) same.tune = tune; else { if (list.length >= 10) list.shift(); list.push({ name: nm, tune: tune }); }
    inst.activeSetup = nm; G.save();
    return nm;
  }
  TU.saveSetup = saveSetup;
  // Did the session leave the car quicker? The confirm pass against the
  // baseline (and the model, to steady one pass's noise). If not, the car
  // gets its old tune back and the session is on the tuner: refunded.
  TU.verdict = function (ss) {
    if (ss.broke || ss.inst.damage) return { keep: true };
    var paid = ss.cost.labor + ss.cost.dyno + ss.cost.track + ss.cost.fuel + ss.cost.driver;
    if (!ss.changed) return { keep: true, refund: paid, why: 'Nothing I found beat what you came in with.' };
    if (ss.confirmEt == null || !(ss.baseEt < 90)) return { keep: true };
    var now = JSON.parse(JSON.stringify(ss.inst.tune)), mNow = scoreNow(ss);
    ss.inst.tune = JSON.parse(JSON.stringify(ss.t0)); var mWas = scoreNow(ss); ss.inst.tune = now;
    var d = 0.6 * (ss.confirmEt < 90 ? ss.confirmEt - ss.baseEt : 0.2) + 0.4 * (mNow - mWas);
    if (d > -0.003) return { keep: false, refund: paid, why: 'Couldn\'t beat what you came in with (' + ss.baseEt.toFixed(3) + '): your old tune is back on.' };
    return { keep: true, gain: -d };
  };
  function notes(ss) {
    var vd = TU.verdict(ss);
    if (!vd.keep) { ss.inst.tune = JSON.parse(JSON.stringify(ss.t0)); G.save(); }
    if (vd.refund) { G.earn(vd.refund); ss.refunded = vd.refund; }
    var ch = vd.keep ? TU.finish(ss) : (TU.finish(ss), {}), close, n = 0;
    TU.active = null;
    var saved = ss.broke || ss.inst.damage ? null : saveSetup(ss);
    var then = ss.then && !ss.broke && !ss.inst.damage ? ss.then : null;
    var total = ss.cost.labor + ss.cost.driver + ss.cost.dyno + ss.cost.fuel + ss.cost.track + ss.cost.parts;
    close = UI.modal([h('div', { class: 'pix acc' }, 'TUNER\'S NOTES • ' + ss.who.name.toUpperCase()),
      h('div', { class: 'tunerlog' }, ss.log.map(function (x) {
        if (x.pit) return h('div', { class: 'row' }, h('span', { class: 'acc grow' }, '— ' + x.pit));
        if (x.check) return h('div', { class: 'row' }, h('span', { class: 'dim' }, 'CHECK'), h('span', { class: 'grow' }, x.check + ': ' + x.note));
        if (x.pull) return h('div', { class: 'row' }, h('span', { class: 'dim' }, 'DYNO'), h('span', { class: 'grow' }, x.pull + ': ' + x.note), h('span', {}, Math.round(x.whp) + ' whp'));
        n++;
        return h('div', { class: 'row' }, h('span', { class: 'dim' }, '#' + n), h('span', { class: 'grow' }, x.pass + (x.note ? ' — ' + x.note : '')), h('span', { class: x.aborted ? 'bad' : '' }, x.sixty < 9 ? x.sixty.toFixed(3) + ' / ' + (x.et < 90 ? x.et.toFixed(3) : 'DNF') : 'DNF'));
      })),
      h('p', {}, Object.keys(ch).length ? 'Set: ' + Object.keys(ch).map(function (k) { return label(k) + ' ' + fmt(k, ch[k]); }).join(' • ') : 'Nothing changed.'),
      ss.broke || ss.inst.damage ? h('p', { class: 'bad' }, 'The car is broken. It needs a repair.') : null,
      vd.why ? h('p', { class: 'warn' }, vd.why) : null,
      ss.refunded ? h('p', { class: 'good' }, 'No gain, no pay: ' + DR.money(ss.refunded) + ' refunded.') : null,
      saved ? h('p', { class: 'acc' }, 'Saved as your "' + saved + '" setup (Tune > Setups): pick it before a race.') : null,
      then ? h('p', {}, 'Next: the street tune, at ' + Math.round(TU.BOTH_K * 100) + '% of the price.') : null,
      h('p', { class: 'dim' }, ss.pulls.length + ' pulls, ' + ss.passes + ' passes: ' +
        [ss.cost.labor ? DR.money(ss.cost.labor) + ' tuner' : '', ss.cost.driver ? DR.money(ss.cost.driver) + ' driver' : '', ss.cost.dyno ? DR.money(ss.cost.dyno) + ' dyno time' : '', ss.cost.fuel ? DR.money(ss.cost.fuel) + ' fuel' : '', ss.cost.track ? DR.money(ss.cost.track) + ' track' : '', ss.cost.parts ? DR.money(ss.cost.parts) + ' parts' : ''].filter(Boolean).join(' + ') + ' = ' + DR.money(total)),
      h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, btn(then ? 'On to the street' : 'OK', function () {
        close(); UI.refresh();
        if (then) { var s2 = TU.session(ss.inst, ss.who, then.jobs, ss.aggKey, ss.drvId, 'street'); s2.costK = TU.BOTH_K; TU.active = s2; setTimeout(function () { passPrompt(s2); }, 60); }
      }, 'primary'))]);
  }

  // ---------------------------------------------------------------- circuit
  // A test day at Pixel Raceway: one of your circuit drivers runs short
  // stints (3 flying laps) while the tuner works through the setup that a
  // lap rewards: final drive, tire pressure, roll-bar balance, ride heights.
  // The result is the car's circuit setup (inst.ctune), used for circuit
  // races over its drag tune; it's what was found on the day, nothing more.
  TU.CTRACK = 600;          // a test day at the circuit
  TU.CLAPS = 3;             // laps a stint
  // A road-course test day's order: tire pressure first (the baseline every
  // other change sits on), the ride heights, then the bar balance for how
  // the car turns, and the gearing last, once the car's speed out of the
  // corners is what it will be (top gear just short of the limiter at the
  // end of the longest straight is what the lap time ends up asking for).
  TU.CKEYS = ['psi', 'rideF', 'rideR', 'rollBal', 'fd'];
  function cgrid(k, S, cur) {
    var d = def(k), lo = d.min(S), hi = d.max(S), st = d.step, out = [];
    if (k === 'fd') { lo = Math.max(lo, cur - 0.6); hi = Math.min(hi, cur + 0.6); st = 0.15; }
    else if (k === 'psi') { lo = Math.max(lo, cur - 6); hi = Math.min(hi, cur + 6); st = 2; }
    else if (k === 'rideF' || k === 'rideR') { lo = Math.max(lo, cur - 30); hi = Math.min(hi, cur + 30); st = 10; }
    else if (k === 'rollBal') { lo = Math.max(lo, cur - 2); hi = Math.min(hi, cur + 2); }
    for (var v = lo; v <= hi + 1e-6; v += st) out.push(+v.toFixed(2));
    if (out.indexOf(cur) < 0) out.push(cur);
    return out.sort(function (a, b) { return a - b; });
  }
  TU.circuitSession = function (inst, who, drvId) {
    var T = DR.Team, d = T.driver(drvId), f = T.factors(d), tr = DR.TRACKS[T.TRACK];
    var base = T.circuitCar(inst), S0 = DR.buildSpec(base), full = DR.fullTune(base, S0), set = {};
    TU.CKEYS.forEach(function (k) { var dd = def(k); if (dd && dd.show(S0)) set[k] = base.tune[k] != null ? base.tune[k] : full[k]; });
    return { inst: inst, who: who, d: d, f: f, tr: tr, set: set, keys: Object.keys(set), ki: -1, log: [], best: null, laps: 0, cost: { labor: 0, driver: 0, track: 0 }, done: false };
  };
  function clap(cs, set) {
    var c = {}, k; for (k in cs.inst) c[k] = cs.inst[k];
    c.tune = {}; for (k in cs.inst.tune) c.tune[k] = cs.inst.tune[k]; for (k in set) c.tune[k] = set[k];
    return DR.lapSim(c, cs.tr, DR.buildSpec(c), { lat: cs.f.lat, brk: cs.f.brk }).time;
  }
  // a stint: the average of the flying laps, as the timing shows it; a tuner
  // who reads the data (sectors, the logger) sees through the driver's noise
  function stint(cs, set) {
    var ideal = clap(cs, set), sd = cs.f.sd * ideal / Math.sqrt(TU.CLAPS), read = 1 - 0.85 * cs.who.dat / 100;
    cs.laps += TU.CLAPS;
    return ideal + gauss() * sd * read + (Math.random() < cs.f.err ? 0.6 * read : 0);
  }
  // the next stint, or null when the day's done. Returns { label, note }
  TU.circuitStep = function (cs) {
    var G2 = G, out;
    if (cs.best == null) {
      cs.best = stint(cs, cs.set);
      out = { label: 'Baseline', note: T_fmt(cs.best) };
    } else {
      cs.ki++;
      if (cs.ki >= cs.keys.length) { cs.done = true; return null; }
      var k = cs.keys[cs.ki], S = DR.buildSpec(T_car(cs)), g = cgrid(k, S, cs.set[k]), bi = 0, bt = 1e9;
      // the call: the best on paper (of the settings within a whisker of
      // it, the one nearest where the car is), off by a step for a weaker
      // chassis tuner; nothing worth a stint, and it stays where it is
      var lt = g.map(function (v) { var tr = {}; for (var q in cs.set) tr[q] = cs.set[q]; tr[k] = v; return clap(cs, tr); }), ci = g.indexOf(cs.set[k]);
      bt = Math.min.apply(null, lt); bi = ci;
      g.forEach(function (v, i) { if (lt[i] <= bt + 0.02 && (lt[bi] > bt + 0.02 || Math.abs(i - ci) < Math.abs(bi - ci))) bi = i; });
      if (lt[ci] - lt[bi] < 0.05) bi = ci;
      var miss = bi === ci ? 0 : Math.round(gauss() * (1 - cs.who.chs / 100) * 1.5), v = g[clamp(bi + miss, 0, g.length - 1)];
      if (v === cs.set[k]) { out = { label: label(k), note: 'Left at ' + fmt(k, v) + ': nothing to find there.', skip: true }; }
      else {
        var trial = {}; for (var q2 in cs.set) trial[q2] = cs.set[q2]; trial[k] = v;
        var t2 = stint(cs, trial);
        if (t2 < cs.best - 0.03) { out = { label: label(k) + ' ' + fmt(k, v), note: T_fmt(t2) + ', quicker: keeping it.' }; cs.set = trial; cs.best = t2; }
        else out = { label: label(k) + ' ' + fmt(k, v), note: T_fmt(t2) + ', no better: back to ' + fmt(k, cs.set[k]) + '.' };
      }
    }
    if (!out.skip) G2.addTireKm(cs.inst, G2.spec(cs.inst), TU.CLAPS * cs.tr.len / 1000);
    cs.log.push(out);
    return out;
  };
  function T_fmt(t) { return DR.Team.fmtLap(t); }
  function T_car(cs) { var c = {}, k; for (k in cs.inst) c[k] = cs.inst[k]; c.tune = {}; for (k in cs.inst.tune) c.tune[k] = cs.inst.tune[k]; for (k in cs.set) c.tune[k] = cs.set[k]; return c; }
  TU.circuitFinish = function (cs) {
    var changed = cs.keys.filter(function (k) { return cs.inst.tune[k] == null || cs.inst.tune[k] !== cs.set[k]; });
    cs.inst.ctune = { set: cs.set, by: cs.who.name, lap: +cs.best.toFixed(2), at: Date.now() };
    if (cs.who.staff) DR.Team.learnTuner(cs.who.staff);
    G.save();
    return changed;
  };
  TU.clearCircuit = function (inst) { delete inst.ctune; G.save(); };

  TU.openCircuit = function (inst) {
    var T = DR.Team, s = T.state();
    var cars = G.state.cars.filter(function (c) { return !c.damage && !T.carAway(c.uid) && !(G.carBusy && G.carBusy(c)); });
    if (!cars.length) return UI.toast('No car free to test: repaired and not at the track');
    if (!inst || cars.indexOf(inst) < 0) inst = cars[0];
    var free = s.drivers.filter(function (d) { return !T.driverBusy(d.id); });
    if (!free.length) return UI.toast(s.drivers.length ? 'All your circuit drivers are racing' : 'A circuit driver has to drive the test laps: hire one first');
    var staff = T.tuner('circuit'), whoSel = staff ? 'staff' : 'local', drv = free[0].id, close, quote = h('div', { class: 'dim gsmall' });
    function who() {
      if (whoSel === 'staff') return { name: staff.name, chs: staff.chs, dat: staff.dat, staff: staff };
      var f = TU.FREELANCE[whoSel]; return { name: f.name, chs: f.chs, dat: f.dat, day: f.day };
    }
    function cost() { var w = who(), d = T.driver(drv); return TU.CTRACK + (w.staff ? 0 : w.day) + (d ? d.wage : 0); }
    function upd() { var w = who(); quote.textContent = 'The test day: ' + DR.money(TU.CTRACK) + ' track hire' + (w.staff ? '' : ' + ' + DR.money(w.day) + ' tuner') + ' + ' + DR.money(T.driver(drv).wage) + ' driver = ' + DR.money(cost()) + '. About ' + (TU.CKEYS.length + 1) + ' stints of ' + TU.CLAPS + ' laps on the car\'s tires.'; }
    function radio(opts, cur, on) {
      return h('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap' } }, opts.map(function (o) {
        var b = btn(o[1], function () { on(o[0]); Array.prototype.forEach.call(b.parentNode.children, function (x) { x.classList.remove('on'); }); b.classList.add('on'); upd(); }, 'chip' + (o[0] === cur ? ' on' : ''));
        return b;
      }));
    }
    var go = btn('Book the day', function () {
      var c = cost(); if (!G.canAfford(c)) return UI.toast('The day costs ' + DR.money(c));
      var cs = TU.circuitSession(inst, who(), drv), w = who(), d = T.driver(drv);
      G.pay(c); cs.cost.track = TU.CTRACK; cs.cost.labor = w.staff ? 0 : w.day; cs.cost.driver = d.wage;
      close(); circuitDay(cs);
    }, 'primary');
    close = UI.modal([h('div', { class: 'pix acc' }, 'CIRCUIT SETUP'),
      cars.length > 1 ? radio(cars.map(function (c) { return [c.uid, DR.CARS[c.carId].name + (c.ctune ? ' ⚙' : '')]; }), inst.uid, function (v) { close(); TU.openCircuit(cars.filter(function (c) { return c.uid === v; })[0]); }) : h('div', { class: 'acc' }, DR.CARS[inst.carId].name),
      h('div', { class: 'gsmall' }, 'A test day at Pixel Raceway. The tuner works through the final drive, tire pressure, roll-bar balance and ride heights (what the car\'s parts let you adjust) and leaves the car with a circuit setup: it\'s used for circuit races only, so your drag tune stays as it is.'),
      inst.ctune ? h('div', { class: 'gsmall acc' }, 'Current circuit setup: by ' + inst.ctune.by + ', ' + T.fmtLap(inst.ctune.lap) + ' on the day. A new day starts from it.') : null,
      h('div', { class: 'plvl' }, 'TUNER'), radio((staff ? [['staff', staff.name + ' (staff)']] : []).concat([['local', 'Local tuner'], ['pro', 'Pro tuner']]), whoSel, function (v) { whoSel = v; }),
      h('div', { class: 'plvl' }, 'DRIVER'), radio(free.map(function (d) { return [d.id, d.name]; }), drv, function (v) { drv = v; }),
      quote,
      h('div', { class: 'row', style: { justifyContent: 'flex-end', gap: '8px', marginTop: '8px' } },
        inst.ctune ? btn('Remove setup', function () { TU.clearCircuit(inst); close(); UI.toast('Circuit setup removed: circuit races use the drag tune'); UI.refresh(); }, 'small red') : null,
        btn('Cancel', function () { close(); }), go)]);
    upd();
  };
  // the day as it goes: one line a stint, or skip to the end
  function circuitDay(cs) {
    var logEl = h('div', { class: 'tunerlog' }), close, timer, done = false;
    function line(o) { logEl.appendChild(h('div', { class: 'row' }, h('span', { class: 'grow' }, o.label), h('span', { class: o.skip ? 'dim' : '' }, o.note))); logEl.scrollTop = 1e6; }
    function finish() {
      if (done) return; done = true; clearTimeout(timer);
      while (TU.circuitStep(cs)) line(cs.log[cs.log.length - 1]);
      var ch = TU.circuitFinish(cs);
      logEl.appendChild(h('div', { class: 'row' }, h('span', { class: 'acc grow' }, '— Setup: ' + cs.keys.map(function (k) { return label(k) + ' ' + fmt(k, cs.set[k]); }).join(' • '))));
      foot.innerHTML = '';
      foot.appendChild(h('div', { class: 'dim gsmall grow' }, cs.laps + ' laps, ' + DR.money(cs.cost.track + cs.cost.labor + cs.cost.driver) + '. ' + (ch.length ? 'Circuit races now use this setup.' : 'Nothing worth changing.')));
      foot.appendChild(btn('OK', function () { close(); UI.refresh(); }, 'primary'));
    }
    function tick() {
      if (done) return;
      var o = TU.circuitStep(cs);
      if (!o) return finish();
      line(o);
      timer = setTimeout(tick, o.skip ? 500 : 1300);
    }
    var foot = h('div', { class: 'row', style: { justifyContent: 'flex-end', gap: '8px', marginTop: '8px' } }, btn('Skip to the end', function () { finish(); }, 'primary'));
    close = UI.modal([h('div', { class: 'pix acc' }, 'TEST DAY • ' + cs.who.name.toUpperCase() + ' • ' + cs.d.name.toUpperCase()), logEl, foot]);
    timer = setTimeout(tick, 400);
  }
})();
