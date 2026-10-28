// ===========================================================================
// LOGBOOK — every pass a car makes, with the setup it made it on and the
// conditions, the way racers keep a notebook; and the data logger's traces
// (Fuel & Spark > Data Logger) for the passes it recorded. Numbers only:
// reading them is up to you.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, h = UI.h, btn = UI.btn;
  var MAX_LOG = 60, MAX_TRACES = 6, RATE = 0.05;

  // channels: [key, label, unit, colour, logger level that records it]
  var CH = [
    ['rpm', 'Engine', 'rpm', '#ffcc33', 1], ['mph', 'Speed', 'mph', '#7dff8a', 1], ['gear', 'Gear', '', '#c8c8d0', 1],
    ['wmph', 'Driveshaft', 'mph', '#3df0ff', 2], ['boost', 'Boost', 'psi', '#ff8a2a', 2], ['thr', 'Throttle', '%', '#ffffff', 2],
    ['afr', 'Air/fuel', ':1', '#ff3d9a', 3], ['tc', 'Timing pulled', 'deg', '#ff4d4d', 3], ['g', 'Accel', 'g', '#a8d8ff', 3], ['shock', 'Rear shock', 'mm', '#b48cff', 3]
  ];
  var STOICH = { stock: 14.7, race: 14.7, e85: 9.8, meth: 6.4 };

  var L = DR.Logbook = {};
  L.level = function (inst) { return DR.getOption('logger', inst).log || 0; };

  // Records a pass at 20 Hz from the launch to the stripe.
  L.recorder = function (inst, S) {
    var lvl = L.level(inst);
    if (!lvl) return null;
    var ch = {}, next = 0, t0 = null;
    CH.forEach(function (c) { if (c[4] <= lvl) ch[c[0]] = []; });
    // air/fuel: rich at full load on boost; lean where the fuel system runs
    // out (the wideband shows it climbing at the top of each gear)
    var lam = S.fiType !== 'none' ? 0.78 : 0.86, cap = S.fuelW / DR.HP, lean = S.fuelDemand > cap ? S.fuelDemand / cap : 1;
    var st = STOICH[S.fuelId] || 14.7;
    return {
      lvl: lvl, ch: ch,
      sample: function (sim, clock) {
        if (!sim.launched || sim.finished || sim.crashed) return;
        if (t0 === null) t0 = clock;
        if (clock - t0 < next) return;
        next += RATE;
        var rpm = sim.rpm(), load = Math.min(1, rpm / S.peakHpRpm);
        ch.rpm.push(Math.round(rpm)); ch.mph.push(+(sim.v * 2.23694).toFixed(1)); ch.gear.push(sim.gear + 1);
        if (lvl >= 2) { ch.wmph.push(+(sim.ww * S.r * 2.23694).toFixed(1)); ch.boost.push(+(sim.boost || 0).toFixed(1)); ch.thr.push(Math.round((sim.thr || 0) * 100)); }
        if (lvl >= 3) {
          var l = sim.thr > 0.5 ? lam * (1 + (lean - 1) * load * load) : 1;
          ch.afr.push(+(l * st).toFixed(1)); ch.tc.push(+((sim.tcRed || 0) * 20).toFixed(1));
          ch.g.push(+((sim.a || 0) / 9.81).toFixed(2)); ch.shock.push(Math.round((sim.cr || 0) * 1000));
        }
      }
    };
  };

  // the settings that matter on a timeslip, as they were for the pass
  var KEYS = ['boost', 'launchRpm', 'shiftRpm', 'revLimit', 'psi', 'launchThr', 'thrRamp', 'tcSlip', 'tcGain', 'stall', 'luGear', 'fd', 'antiSquat', 'nosDelay'];
  L.add = function (inst, info, rec) {
    var sim = info.sim, S = info.S, me = info.me, tune = {};
    KEYS.forEach(function (k) {
      var d = DR.TUNE_DEFS.filter(function (x) { return x.key === k; })[0];
      if (S.tune[k] != null && (!d || d.show(S))) tune[k] = S.tune[k];
    });
    var sp = {}; for (var k in sim.splits) sp[k] = [+sim.splits[k].t.toFixed(3), +sim.splits[k].mph.toFixed(1)];
    var w = inst.wear || {};
    var e = {
      id: (inst.logN = (inst.logN || 0) + 1), at: Date.now(), what: info.what, dist: info.dist > DR.EIGHTH + 1 ? 'q' : 'e',
      cond: info.cond ? { s: info.cond.surface, n: info.cond.night ? 1 : 0, a: info.cond.air, t: info.cond.trackT } : null,
      rt: me.red ? -1 : me.rt != null ? +me.rt.toFixed(3) : null, sp: sp,
      out: sim.crashed ? 'CRASH' : sim.blown ? 'BLOWN' : sim.broke ? 'BROKE' : sim.finished ? '' : 'DNF', res: info.result,
      tune: tune, parts: Object.assign({}, inst.parts), engine: inst.engine,
      tires: w.rtires ? Math.round(w.rtires.w * 100) : 0, water: Math.round(info.water || 0), shake: sim.shakeMax > 0.5 ? 1 : 0
    };
    inst.log = inst.log || [];
    inst.log.unshift(e);
    if (inst.log.length > MAX_LOG) inst.log.length = MAX_LOG;
    if (rec && rec.ch.rpm.length > 2) {
      inst.traces = inst.traces || {};
      inst.traces[e.id] = { lvl: rec.lvl, dt: RATE, ch: rec.ch };
      var ids = Object.keys(inst.traces).map(Number).sort(function (a, b) { return b - a; });
      ids.slice(MAX_TRACES).forEach(function (id) { delete inst.traces[id]; });
    }
  };

  // ---------------------------------------------------------------- screen
  function condShort(c) {
    if (!c) return '';
    return (c.n ? 'Night' : 'Day') + ' • ' + ({ prep: 'Prep', noprep: 'No-prep', street: 'Street' }[c.s] || '') + ' • ' + Math.round(c.a * 1.8 + 32) + '°F';
  }
  function cell(e, k, mph) { var s = e.sp[k]; return s ? (mph ? s[1].toFixed(1) : s[0].toFixed(3)) : '-'; }
  UI.Logbook = function () {
    var inst = G.car(), log = inst.log || [], lvl = L.level(inst);
    var tbl = h('table', { class: 'logtbl' });
    tbl.appendChild(h('tr', {}, ['#', 'Pass', 'Conditions', 'RT', '60\'', '330\'', '1/8', 'mph', '1/4', 'mph', ''].map(function (x) { return h('th', {}, x); })));
    log.forEach(function (e) {
      tbl.appendChild(h('tr', { class: 'logrow', onclick: function () { detail(inst, e); } },
        h('td', { class: 'dim' }, String(e.id)), h('td', {}, e.what + (inst.traces && inst.traces[e.id] ? ' ◆' : '')), h('td', { class: 'dim' }, condShort(e.cond)),
        h('td', {}, e.rt == null ? '-' : e.rt < 0 ? 'RED' : e.rt.toFixed(3)), h('td', {}, cell(e, '60ft')), h('td', {}, cell(e, '330ft')),
        h('td', {}, cell(e, '1/8')), h('td', {}, cell(e, '1/8', true)), h('td', {}, e.dist === 'q' ? cell(e, '1/4') : ''), h('td', {}, e.dist === 'q' ? cell(e, '1/4', true) : ''),
        h('td', { class: e.out ? 'bad' : e.res === 'W' ? 'good' : '' }, e.out || e.res)));
    });
    return h('div', { class: 'screen' }, UI.sectionTop('upgrade', 'log'),
      h('div', { class: 'content' },
        h('div', { class: 'dim gsmall' }, DR.CARS[inst.carId].name + ' • ' + log.length + ' pass' + (log.length === 1 ? '' : 'es') + ' logged • ' +
          (lvl ? DR.getOption('logger', inst).name + ': ◆ = traces recorded (last ' + MAX_TRACES + ')' : 'No data logger fitted: timeslips only (Fuel & Spark > Data Logger)')),
        log.length ? h('div', { class: 'logwrap' }, tbl) : h('p', { class: 'dim' }, 'No passes yet. Every pass this car makes goes in here.')));
  };

  // one pass: the slip, the setup (and what changed from the pass before), the traces
  function detail(inst, e) {
    var i = inst.log.indexOf(e), prev = inst.log[i + 1], tr = inst.traces && inst.traces[e.id];
    var setup = Object.keys(e.tune).map(function (k) {
      var d = DR.TUNE_DEFS.filter(function (x) { return x.key === k; })[0], ch = prev && prev.tune[k] !== e.tune[k];
      return h('div', { class: ch ? 'acc' : 'dim' }, (d ? d.label : k) + ': ' + e.tune[k] + (ch && prev.tune[k] != null ? ' (was ' + prev.tune[k] + ')' : ''));
    });
    var partsCh = [];
    if (prev) {
      var cats = {}; Object.keys(e.parts).concat(Object.keys(prev.parts)).forEach(function (c) { cats[c] = 1; });
      Object.keys(cats).forEach(function (c) { if (e.parts[c] !== prev.parts[c]) partsCh.push(DR.catName(c, inst) + ': ' + (e.parts[c] ? DR.getOption(c, inst, e.parts[c]).name : 'factory')); });
      if (e.engine !== prev.engine) partsCh.push('Engine: ' + DR.ENGINES[e.engine].name);
    }
    var body = [h('div', { class: 'pix acc' }, 'PASS #' + e.id + ' • ' + e.what),
      h('div', { class: 'dim' }, condShort(e.cond) + (e.cond ? ', track ' + Math.round(e.cond.t * 1.8 + 32) + '°F' : '') + (e.water ? ' • water ' + Math.round(195 + e.water * 1.8) + '°F' : '') + ' • drive tires ' + e.tires + '% worn'),
      h('div', { class: 'row', style: { gap: '14px', flexWrap: 'wrap', margin: '4px 0' } },
        h('span', {}, 'RT ' + (e.rt == null ? '-' : e.rt < 0 ? 'RED' : e.rt.toFixed(3))),
        DR.SPLITS.filter(function (s) { return e.sp[s[0]]; }).map(function (s) { return h('span', {}, s[0] + ' ' + e.sp[s[0]][0].toFixed(3) + (s[0] === '1/8' || s[0] === '1/4' ? ' @ ' + e.sp[s[0]][1].toFixed(1) : '')); }),
        e.out ? h('span', { class: 'bad' }, e.out) : null),
      tr ? graph(tr) : h('div', { class: 'dim gsmall' }, 'No trace for this pass.'),
      h('div', { class: 'row', style: { gap: '16px', alignItems: 'flex-start' } },
        h('div', { class: 'col gsmall' }, h('div', { class: 'plvl' }, 'SETUP'), setup),
        partsCh.length ? h('div', { class: 'col gsmall' }, h('div', { class: 'plvl' }, 'PARTS CHANGED SINCE #' + prev.id), partsCh.map(function (x) { return h('div', {}, x); })) : null),
      h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, btn('Close', function () { close(); }, 'primary'))];
    var close = UI.modal(body);
  }

  // the traces: pick channels; drag across to read values at a moment
  function graph(tr) {
    var on = { rpm: 1, mph: 1, wmph: 1, boost: 1 }, W = 520, H = 190, cur = null;
    var cv = h('canvas', { class: 'loggraph', width: W, height: H }), x = cv.getContext('2d'), readout = h('div', { class: 'gsmall' });
    var chans = CH.filter(function (c) { return tr.ch[c[0]]; }), n = tr.ch.rpm.length;
    function range(c) {
      var a = tr.ch[c[0]], lo = Math.min.apply(null, a), hi = Math.max.apply(null, a);
      // speed and driveshaft share a scale, so wheelspin shows as the gap
      if (c[0] === 'mph' || c[0] === 'wmph') { lo = 0; hi = Math.max.apply(null, tr.ch.mph.concat(tr.ch.wmph || [])); }
      if (c[0] === 'thr') { lo = 0; hi = 100; }
      return hi - lo < 1e-6 ? [lo - 1, hi + 1] : [lo, hi];
    }
    function draw() {
      x.fillStyle = '#0d0e12'; x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(255,255,255,0.06)';
      for (var s = 0; s <= n * tr.dt; s += 1) { var gx = s / (n * tr.dt) * W; x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, H); x.stroke(); }
      chans.forEach(function (c) {
        if (!on[c[0]]) return;
        var a = tr.ch[c[0]], r = range(c);
        x.strokeStyle = c[3]; x.lineWidth = 1.5; x.beginPath();
        a.forEach(function (v, i) { var px = i / (n - 1) * W, py = H - 6 - (v - r[0]) / (r[1] - r[0]) * (H - 12); if (i) x.lineTo(px, py); else x.moveTo(px, py); });
        x.stroke();
      });
      if (cur != null) { x.strokeStyle = 'rgba(255,255,255,0.6)'; x.beginPath(); x.moveTo(cur / (n - 1) * W, 0); x.lineTo(cur / (n - 1) * W, H); x.stroke(); }
      readout.textContent = cur == null ? 'Drag across the graph to read it.' : (cur * tr.dt).toFixed(2) + ' s: ' + chans.filter(function (c) { return on[c[0]]; }).map(function (c) { return c[1] + ' ' + tr.ch[c[0]][cur] + (c[2] ? ' ' + c[2] : ''); }).join(' • ');
    }
    function at(ev) { var b = cv.getBoundingClientRect(); cur = Math.max(0, Math.min(n - 1, Math.round((ev.clientX - b.left) / b.width * (n - 1)))); draw(); }
    cv.addEventListener('pointerdown', function (ev) { at(ev); cv.setPointerCapture(ev.pointerId); });
    cv.addEventListener('pointermove', function (ev) { if (ev.buttons || ev.pointerType === 'mouse') at(ev); });
    var keys = h('div', { class: 'row', style: { flexWrap: 'wrap', gap: '4px' } }, chans.map(function (c) {
      var b = h('button', { class: 'lchip' + (on[c[0]] ? ' on' : ''), onclick: function () { on[c[0]] = !on[c[0]]; b.classList.toggle('on', !!on[c[0]]); draw(); } }, c[1]);
      b.style.borderColor = c[3]; b.style.color = c[3];
      return b;
    }));
    draw();
    return h('div', { class: 'col' }, keys, cv, readout);
  }
})();
