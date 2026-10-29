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
    { id: 'launch', name: 'Launch (track)', what: 'Launch rpm, launch throttle, traction control' },
    { id: 'drive', name: 'Drivetrain (track)', what: 'Converter stall, lockup gear, final drive' },
    { id: 'chassis', name: 'Chassis (track)', what: 'Tire pressure, anti-squat, rear rebound' }
  ];
  var KEYS = { launch: ['launchRpm', 'launchThr', 'thrRamp', 'tcSlip'], drive: ['stall', 'luGear', 'fd'], chassis: ['psi', 'antiSquat', 'rebR'] };
  // how hard to lean on it: knock margin, rpm under the valvetrain, power
  // under what the internals take
  TU.AGG = {
    safe: { name: 'Safe', psi: 2, rpm: 400, hp: 0.1 },
    bal: { name: 'Balanced', psi: 1, rpm: 200, hp: 0.04 },
    edge: { name: 'On the edge', psi: 0.3, rpm: 50, hp: 0 }
  };
  var STOICH = { stock: 14.7, race: 14.7, e85: 9.8, meth: 6.4 };
  function def(k) { return DR.TUNE_DEFS.filter(function (x) { return x.key === k; })[0]; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function gauss() { var u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function fmt(k, v) {
    if (k === 'launchRpm' || k === 'stall' || k === 'shiftRpm' || k === 'revLimit') return Math.round(v) + ' rpm';
    if (k === 'launchThr' || k === 'tcSlip') return v + '%';
    if (k === 'thrRamp') return (+v).toFixed(1) + ' s';
    if (k === 'fd') return (+v).toFixed(2) + ':1';
    if (k === 'boost') return (+v).toFixed(1) + ' psi';
    if (k === 'psi') return (+v).toFixed(1) + ' psi';
    if (k === 'luGear') return ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'][v - 1] + ' gear';
    return String(Math.round(v * 100) / 100);
  }
  TU.fmt = fmt;
  function label(k) { var d = def(k); return d ? d.label : k; }

  // ---------------------------------------------------------------- session
  // who: { name, eng, chs, dat, staff (team tuner object) | freelance tier }
  TU.session = function (inst, who, jobs, agg) {
    var t0 = JSON.parse(JSON.stringify(inst.tune || {}));
    var S0 = G.spec(inst), d0 = DR.fullTune(inst, S0);
    var ss = { inst: inst, who: who, jobs: jobs, agg: TU.AGG[agg] || TU.AGG.bal, t0: t0, d0: d0, log: [], cost: { labor: 0, driver: 0, dyno: 0, fuel: 0, track: 0, parts: 0 },
      pulls: [], passes: 0, best: null, items: [], phase: 'dyno', dayPaid: false, dynoPaid: false };
    // the dyno work
    if (jobs.indexOf('engine') >= 0) {
      if (S0.fiType !== 'none' && def('boost').show(S0)) ss.items.push({ k: 'boost' });
      if (def('revLimit').show(S0)) ss.items.push({ k: 'revLimit' });
      ss.items.push({ k: 'shiftRpm' });
    }
    if (!ss.items.length) ss.phase = 'track';
    // the track work: the settings the car's parts allow
    ss.track = [];
    ['launch', 'drive', 'chassis'].forEach(function (j) {
      if (jobs.indexOf(j) < 0) return;
      KEYS[j].forEach(function (k) { var dd = def(k); if (dd && dd.show(S0)) ss.track.push({ k: k, grp: j }); });
    });
    ss.ti = 0;
    return ss;
  };
  function val(ss, k) { var t = ss.inst.tune; return t[k] != null ? t[k] : DR.fullTune(ss.inst, G.spec(ss.inst))[k]; }
  function setTune(ss, k, v) { ss.inst.tune[k] = v; }

  // ---------------------------------------------------------------- the dyno
  // what the engine is asking for at this boost: { knock, lean, safe, spark, top }
  function limits(ss, S) {
    var a = ss.agg, e = ss.who.eng / 100, margin = a.psi + (1 - e) * 1.5;
    return {
      knock: S.fiType !== 'none' && !S.diesel && S.boostSet > S.knock - margin,
      lean: S.fuelDemand > (S.fuelW / DR.HP) * (0.99 - (1 - e) * 0.05),
      safe: S.peakHp + S.nosHp > S.safeHp * (1 - a.hp - (1 - e) * 0.08),
      spark: S.fiType !== 'none' && S.boostSet > S.sparkPsi,
      top: S.boostSet >= S.maxBoost - 0.01
    };
  }
  function why(l) { return l.knock ? 'knock margin' : l.lean ? 'the wideband went lean' : l.spark ? 'the ignition started to misfire' : l.safe ? 'that\'s what the internals take' : l.top ? 'the turbo/wastegate is maxed' : ''; }
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
      if (it.k === 'boost') {
        var step = ss.who.eng >= 70 ? 1.5 : ss.who.eng >= 45 ? 1 : 0.5, bd = def('boost'), S1 = G.spec(inst);
        if (it.b == null) { it.b = val(ss, 'boost'); it.dir = 0; it.n = 0; }
        setTune(ss, 'boost', Math.round(clamp(it.b, bd.min(S1), bd.max(S1)) * 2) / 2);
        S = G.spec(inst); l = limits(ss, S); it.n++;
        var bad = l.knock || l.lean || l.safe || l.spark, note;
        if (it.dir === 0) it.dir = bad ? -1 : 1;
        if (it.dir > 0 && !bad && !l.top && it.n < 14) { note = 'Clean. Up ' + step + ' psi.'; it.ok = it.b; it.b += step; }
        else if (it.dir > 0) {
          // over the line: back to the last clean pull and stop there
          if (bad && it.ok != null) { setTune(ss, 'boost', it.ok); note = 'Too far (' + why(l) + '). Back to ' + fmt('boost', it.ok) + '.'; }
          else note = l.top ? 'That\'s all the hardware has: ' + fmt('boost', it.b) + '.' : 'Set.';
          ss.items.shift();
        }
        else if (bad && it.n < 14) { note = 'Over the line (' + why(l) + '). Down ' + step + ' psi.'; it.b -= step; }
        else { note = 'Safe here.'; ss.items.shift(); }
        return pull(ss, 'Boost ' + fmt('boost', S.boostSet), note, S);
      }
      if (it.k === 'revLimit') {
        var rd = def('revLimit'); S = G.spec(inst);
        var target = Math.round(clamp(Math.min(S.vtLimit, S.beLimit) - ss.agg.rpm - (1 - ss.who.eng / 100) * 300, rd.min(S), rd.max(S)) / 100) * 100;
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
  // The tuner's call for a setting: what experience says is right for this
  // car (worked out from short runs, like a tuner's notes from other cars),
  // missed by however much their chassis skill misses by.
  function grid(ss, k) {
    var S = G.spec(ss.inst), dd = def(k), lo = dd.min(S), hi = dd.max(S), st = dd.step || 1, out = [];
    if (k === 'tcSlip') return [0, 6, 9, 12, 15, 18];
    if (k === 'luGear') { for (var g = 1; g <= hi; g++) out.push(g); return out; }
    if (k === 'psi') { var o = S.tire.optP; lo = Math.max(lo, o * 0.7); hi = Math.min(hi, o * 1.1); }
    if (k === 'fd') { var f0 = S.fd; lo = Math.max(lo, f0 * 0.8); hi = Math.min(hi, f0 * 1.25); }
    if (k === 'launchRpm') { lo = Math.max(lo, S.idle + 1200); hi = Math.min(hi, S.red - 400); }
    for (var i = 0; i < 7; i++) out.push(Math.round((lo + (hi - lo) * i / 6) / st) * st);
    return out.filter(function (v, i, a) { return a.indexOf(v) === i; });
  }
  function score(ss, k, v) {
    var t = JSON.parse(JSON.stringify(ss.inst.tune)); t[k] = v;
    var S = DR.buildSpec(ss.inst, t);
    if (k === 'fd' || k === 'luGear') return -DR.playerPass(S, 30, true);
    return DR.playerPass(S, 3) + DR.playerPass(S, 3, false, 0.85);
  }
  function call(ss, k) {
    var g = grid(ss, k), best = g[0], bs = -1e9;
    g.forEach(function (v) { var x = score(ss, k, v); if (x > bs) { bs = x; best = v; } });
    var dd = def(k), S = G.spec(ss.inst), lo = dd.min(S), hi = dd.max(S), st = dd.step || 1;
    var miss = gauss() * (1 - ss.who.chs / 100) * (g[g.length - 1] - g[0]) * 0.22;
    return { opt: best, guess: Math.round(clamp(best + miss, lo, hi) / st) * st };
  }
  // the next pass: { label, k, v } (null when done). The setting goes on
  // the car for the pass.
  TU.nextPass = function (ss) {
    if (ss.broke) return null;
    if (ss.best == null) return { label: 'Baseline', k: null };
    while (ss.ti < ss.track.length) {
      var it = ss.track[ss.ti];
      if (!it.call) it.call = call(ss, it.k);
      var cur = val(ss, it.k);
      if (!it.tried) {
        if (it.call.guess === cur) { it.tried = true; it.kept = true; }
        else { it.tried = true; it.was = cur; it.unset = ss.inst.tune[it.k] == null; it.v = it.call.guess; setTune(ss, it.k, it.v); return { label: label(it.k) + ' ' + fmt(it.k, it.v), k: it.k, v: it.v }; }
      }
      // a tuner who reads the data well goes once more, to where the data points
      if (!it.refined && ss.who.dat >= 55 && it.call.opt !== val(ss, it.k) && (it.kept ? ss.who.dat >= 55 : ss.who.dat >= 70)) {
        it.refined = true; it.was = val(ss, it.k); it.unset = ss.inst.tune[it.k] == null; it.v = it.call.opt; setTune(ss, it.k, it.v);
        return { label: label(it.k) + ' ' + fmt(it.k, it.v) + ' (from the data)', k: it.k, v: it.v };
      }
      ss.ti++;
    }
    return null;
  };
  // after a pass: keep the change if the slip says it's quicker. Returns the
  // tuner's note. res: { et, sixty, aborted }
  TU.record = function (ss, pass, res) {
    var S = G.spec(ss.inst), fuel = DR.runCost(S).total;
    G.pay(fuel + TU.TRACK_FEE); ss.cost.fuel += fuel; ss.cost.track += TU.TRACK_FEE; ss.passes++;
    if (!ss.who.staff && !ss.dayPaid) { G.pay(ss.who.day); ss.cost.labor += ss.who.day; ss.dayPaid = true; }
    var note, et = res.et;
    ss.log.push({ pass: pass.label, et: res.et, sixty: res.sixty, aborted: res.aborted });
    // a bad pass: a tuner who reads data well doesn't learn from it
    if (res.aborted && ss.who.dat >= 45 && !pass.rerun) {
      pass.rerun = true; ss.again = pass;
      note = 'Threw that one out (' + res.aborted + '). Run it again.';
    } else if (pass.k === null) {
      ss.best = et; note = 'Baseline ' + (et < 90 ? et.toFixed(3) : 'DNF') + '.';
    } else {
      var it = ss.track[ss.ti];
      if (et < ss.best - 0.005) { ss.best = et; if (it) it.kept = true; note = 'Quicker: ' + et.toFixed(3) + '. Keeping ' + fmt(pass.k, pass.v) + '.'; }
      else { if (it) { if (it.unset) delete ss.inst.tune[pass.k]; else setTune(ss, pass.k, it.was); } note = (et < 90 ? et.toFixed(3) : 'No time') + ': no better. Back to ' + fmt(pass.k, it ? it.was : val(ss, pass.k)) + '.'; }
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
  TU.simPass = function (inst, drvId) {
    var d = DR.Team.staff(drvId), S = G.spec(inst), cond = DR.conditions('prep', false);
    var sim = new DR.Sim(S, { cond: cond, shakeRnd: 0.6 + Math.random() * 0.8, dist: DR.QUARTER, tireT: S.tire.topt });
    var ai = DR.AIDriver.fromDrag(d), dt = 1 / 400, tG = -1.2;
    while (!sim.finished && tG < 60 && !sim.crashed && !sim.blown && !sim.broke) { sim.step(dt, ai.input(sim, tG, dt)); tG += dt; }
    sim.tireE += S.peakHp * 745.7 * 0.9;     // their burnout
    G.addWear(inst, S, sim, 1);
    DR.Team.learnDrag(d, false);
    var res = { et: sim.finished ? sim.et : 99, sixty: sim.splits['60ft'] ? sim.splits['60ft'].t : 9, aborted: abortWhy(sim) };
    if (sim.blown || sim.broke) { inst.damage = sim.blown ? { engine: true } : { trans: true }; res.broke = true; }
    return res;
  };
  function abortWhy(sim) { return sim.blown || sim.broke ? 'it broke' : !sim.finished ? 'didn\'t finish' : sim.shakeMax > 0.6 ? 'tire shake' : ''; }
  TU.abortWhy = abortWhy;

  // ---------------------------------------------------------------- screens
  TU.active = null;
  TU.open = function (inst) {
    if (inst.damage) return UI.toast('Repair your car first!');
    if (TU.active && TU.active.inst === inst) return passPrompt(TU.active);
    var staff = DR.Team && DR.Team.tuner('drag'), whoSel = staff ? 'staff' : 'local', jobs = { engine: true, launch: true, drive: false, chassis: false }, agg = 'bal', close;
    var S = G.spec(inst), quote = h('div', { class: 'dim gsmall' }), go;
    function who() {
      if (whoSel === 'staff') return { name: staff.name, eng: staff.eng, chs: staff.chs, dat: staff.dat, staff: staff };
      var f = TU.FREELANCE[whoSel]; return { name: f.name, eng: f.eng, chs: f.chs, dat: f.dat, dyno: f.dyno, day: f.day };
    }
    function chosen() { return TU.JOBS.filter(function (j) { return jobs[j.id]; }).map(function (j) { return j.id; }); }
    function upd() {
      var w = who(), js = chosen(), eng = js.indexOf('engine') >= 0, trk = js.some(function (j) { return j !== 'engine'; });
      var dynoCost = !eng ? 0 : w.staff ? DR.dynoFee(S) + ' a pull (about 4-10 pulls)' : DR.money(Math.round((w.dyno + S.peakHp) / 50) * 50) + ' for the dyno tune';
      quote.textContent = (eng ? 'Dyno: ' + (w.staff ? DR.money(DR.dynoFee(S)) + ' a pull, about 4-10 pulls. ' : dynoCost + '. ') : '') +
        (trk ? 'Track: ' + (w.staff ? '' : DR.money(w.day) + ' for the day, ') + DR.money(DR.runCost(S).total + TU.TRACK_FEE) + ' a pass (fuel and the test-and-tune ticket), about ' + (2 + js.length * 2) + ' passes, each one driven by you or a drag driver, and each one wearing the car.' : '');
      go.disabled = !js.length;
    }
    function radio(name, opts, cur, on) {
      return h('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap' } }, opts.map(function (o) {
        var b = btn(o[1], function () { on(o[0]); Array.prototype.forEach.call(b.parentNode.children, function (x) { x.classList.remove('on'); }); b.classList.add('on'); upd(); }, 'chip' + (o[0] === cur ? ' on' : ''));
        return b;
      }));
    }
    go = btn('Start', function () {
      var ss = TU.session(inst, who(), chosen(), agg);
      TU.active = ss; close();
      if (ss.phase === 'dyno') dynoPhase(ss); else passPrompt(ss);
    }, 'primary');
    var whoOpts = (staff ? [['staff', staff.name + ' (staff)']] : []).concat([['local', 'Local tuner'], ['pro', 'Pro tuner']]);
    close = UI.modal([h('div', { class: 'pix acc' }, 'TUNER'),
      h('div', { class: 'plvl' }, 'WHO'), radio('who', whoOpts, whoSel, function (v) { whoSel = v; }),
      h('div', { class: 'dim gsmall' }, staff ? 'Your staff tuner works for their wage.' : 'No staff tuner: hire one on the Race Team\'s Team tab, or book a freelancer.'),
      h('div', { class: 'plvl', style: { marginTop: '6px' } }, 'HOW FAR TO GO'),
      h('div', { class: 'col' }, TU.JOBS.map(function (j) {
        var cb = h('input', { type: 'checkbox', checked: !!jobs[j.id] });
        cb.addEventListener('change', function () { jobs[j.id] = cb.checked; upd(); });
        return h('label', { class: 'row', style: { gap: '8px' } }, cb, h('span', {}, j.name), h('span', { class: 'dim gsmall' }, j.what));
      })),
      h('div', { class: 'plvl', style: { marginTop: '6px' } }, 'HOW HARD TO LEAN ON IT'),
      radio('agg', Object.keys(TU.AGG).map(function (k) { return [k, TU.AGG[k].name]; }), agg, function (v) { agg = v; }),
      quote,
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
    var rows = [btn('Drive it', function () { close(); runPass(ss, null); }, 'primary')];
    drivers.forEach(function (d) {
      rows.push(btn(d.name + ' drives', function () { close(); runPass(ss, d.id); }));
      rows.push(btn(d.name + ' drives (skip)', function () { close(); simPass(ss, d.id); }));
    });
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
          ss.best = null; A.cash(); close(); passPrompt(ss);
        }, 'primary' + (G.canAfford(cost) ? '' : ' disabled')))]);
  }
  function runPass(ss, drvId) {
    DR.Race.start({ mode: 'test', dist: DR.QUARTER, theme: 'strip', grip: 1, night: false, surface: 'prep', driver: drvId, tuner: { label: ss.cur.label }, back: 'tune' });
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
    var res = TU.simPass(ss.inst, drvId), noteTxt = TU.record(ss, ss.cur, res);
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

  function notes(ss) {
    var ch = TU.finish(ss), close, n = 0;
    TU.active = null;
    var total = ss.cost.labor + ss.cost.driver + ss.cost.dyno + ss.cost.fuel + ss.cost.track + ss.cost.parts;
    close = UI.modal([h('div', { class: 'pix acc' }, 'TUNER\'S NOTES • ' + ss.who.name.toUpperCase()),
      h('div', { class: 'tunerlog' }, ss.log.map(function (x) {
        if (x.pit) return h('div', { class: 'row' }, h('span', { class: 'acc grow' }, '— ' + x.pit));
        if (x.pull) return h('div', { class: 'row' }, h('span', { class: 'dim' }, 'DYNO'), h('span', { class: 'grow' }, x.pull + ': ' + x.note), h('span', {}, Math.round(x.whp) + ' whp'));
        n++;
        return h('div', { class: 'row' }, h('span', { class: 'dim' }, '#' + n), h('span', { class: 'grow' }, x.pass + (x.note ? ' — ' + x.note : '')), h('span', { class: x.aborted ? 'bad' : '' }, x.sixty < 9 ? x.sixty.toFixed(3) + ' / ' + (x.et < 90 ? x.et.toFixed(3) : 'DNF') : 'DNF'));
      })),
      h('p', {}, Object.keys(ch).length ? 'Set: ' + Object.keys(ch).map(function (k) { return label(k) + ' ' + fmt(k, ch[k]); }).join(' • ') : 'Nothing changed.'),
      ss.broke || ss.inst.damage ? h('p', { class: 'bad' }, 'The car is broken. It needs a repair.') : null,
      h('p', { class: 'dim' }, ss.pulls.length + ' pulls, ' + ss.passes + ' passes: ' +
        [ss.cost.labor ? DR.money(ss.cost.labor) + ' tuner' : '', ss.cost.driver ? DR.money(ss.cost.driver) + ' driver' : '', ss.cost.dyno ? DR.money(ss.cost.dyno) + ' dyno time' : '', ss.cost.fuel ? DR.money(ss.cost.fuel) + ' fuel' : '', ss.cost.track ? DR.money(ss.cost.track) + ' track' : '', ss.cost.parts ? DR.money(ss.cost.parts) + ' parts' : ''].filter(Boolean).join(' + ') + ' = ' + DR.money(total)),
      h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, btn('OK', function () { close(); UI.refresh(); }, 'primary'))]);
  }

  // ---------------------------------------------------------------- circuit
  // A test day at Pixel Raceway: one of your circuit drivers runs short
  // stints (3 flying laps) while the tuner works through the setup that a
  // lap rewards: final drive, tire pressure, roll-bar balance, ride heights.
  // The result is the car's circuit setup (inst.ctune), used for circuit
  // races over its drag tune; it's what was found on the day, nothing more.
  TU.CTRACK = 600;          // a test day at the circuit
  TU.CLAPS = 3;             // laps a stint
  TU.CKEYS = ['fd', 'psi', 'rollBal', 'rideF', 'rideR'];
  function cgrid(k, S, cur) {
    var d = def(k), lo = d.min(S), hi = d.max(S), st = d.step, out = [];
    if (k === 'fd') { lo = Math.max(lo, cur - 0.6); hi = Math.min(hi, cur + 0.6); st = 0.15; }
    else if (k === 'psi') { lo = Math.max(lo, cur - 6); hi = Math.min(hi, cur + 6); st = 2; }
    else if (k === 'rideF' || k === 'rideR') st = Math.max(st, Math.round((hi - lo) / 6 / 5) * 5 || 5);
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
      // the call: the best on paper, off by a step or two for a weaker chassis tuner
      g.forEach(function (v, i) { var tr = {}; for (var q in cs.set) tr[q] = cs.set[q]; tr[k] = v; var t = clap(cs, tr); if (t < bt) { bt = t; bi = i; } });
      var miss = Math.round(gauss() * (1 - cs.who.chs / 100) * 2.2), v = g[clamp(bi + miss, 0, g.length - 1)];
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
    var cars = G.state.cars.filter(function (c) { return !c.damage && !T.carAway(c.uid); });
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
