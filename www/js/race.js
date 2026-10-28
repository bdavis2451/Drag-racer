// ===========================================================================
// RACE — burnout, staging, the tree, the run itself, HUD and the timeslip.
// cfg = {mode:'career'|'street'|'test', opp, ev, round, dist, theme, grip,
//        reward, bet, back}
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, A = DR.Audio, UI = DR.UI, h = UI.h, btn = UI.btn;
  var DT = 1 / 600;
  var DASH_W = 232, DASH_H = 44;
  var BOX_X = -16;           // where cars sit for the burnout (m)

  // events raced in rounds (a knockout, a bracket elimination)
  DR.multiRound = function (ev) { return !!ev && ev.opps.length > 1 && (ev.type === 'knockout' || ev.type === 'bracket'); };
  var loading = null;   // the loading veil while a race screen is being built
  var lastStray = 0;    // when a tap last landed on the veil (or was ignored)
  DR.Race = {
    // cfg.inst: race a car you don't own (dealer test drive)
    start: function (cfg) {
      var inst = cfg.inst || G.car();
      if (!cfg.cond) cfg.cond = DR.Race.cond(cfg);
      if (inst.damage) { UI.toast('Repair your car first!'); return; }
      if (loading) return;            // already on the way: a second tap does nothing
      // show that the tap landed before the (slow) race screen is built; the
      // veil also eats any extra taps so none reach the STAGE button
      loading = document.createElement('div');
      loading.className = 'loadveil';
      loading.innerHTML = '<div class="loadbox"><div class="spin"></div><div class="pix">LOADING RACE</div></div>';
      ['pointerdown', 'pointerup', 'click', 'touchstart'].forEach(function (t) { loading.addEventListener(t, function (e) { e.preventDefault(); e.stopPropagation(); lastStray = Date.now(); }); });
      document.body.appendChild(loading);
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        try { UI.show(RaceScreen, cfg); } finally {
          // stay up a moment so taps queued while loading land here, then fade
          var v = loading;
          setTimeout(function () { v.classList.add('out'); setTimeout(function () { if (v.parentNode) v.parentNode.removeChild(v); if (loading === v) loading = null; }, 200); }, 350);
        }
      }); });
    },
    // A career event (round: knockout round, 0-based). Some strip events
    // run under the lights (the same ones every time).
    careerEvent: function (ev, round) { DR.Race.start(DR.Race.eventCfg(ev, round)); },
    eventCfg: function (ev, round) {
      var T = DR.EVENT_TYPES[ev.type];
      round = round || 0;
      var c = DR.evCond(ev);
      return { mode: 'career', ev: ev, round: round, opp: ev.opps[round], dist: T.dist(), theme: T.theme, grip: T.grip, reward: G.eventReward(ev),
        surface: c.surface, night: c.night };
    },
    // Race day: before you go to the lanes, the day's conditions, who you're
    // up against (their car and the time they've posted), tech, and the
    // state of your consumables.
    raceDay: function (cfg, title) {
      var inst = G.car(), S = G.spec(inst), cond = cfg.cond || (cfg.cond = DR.Race.cond(cfg)), close;
      var opps = cfg.mode === 'career' ? cfg.ev.opps : [cfg.opp];
      var dist = cfg.dist > DR.EIGHTH + 1 ? 'quarter' : 'eighth';
      var entries = opps.map(function (o, i) {
        var oi = G.oppInst(o), est = G.estimate(oi, cfg.dist, (cfg.grip || 1) / (DR.Race.SURF_BASE[cond.surface] || 1), cond);
        return h('div', { class: 'rdrow' }, h('span', { class: 'acc' }, (opps.length > 1 ? 'R' + (i + 1) + ' ' : '') + o.name), h('span', { class: 'dim' }, DR.CARS[o.carId].name),
          h('span', {}, 'posted ' + est.et.toFixed(2) + ' @ ' + Math.round(est.trap) + ' mph'));
      });
      var ws = G.wearList(inst), tech = cfg.mode === 'career' ? G.techIssue(inst, cfg.ev) : '';
      // bracket: your dial-in (your call: the logbook has your passes), and
      // the other car's, a hair slower than what it runs
      var ev = cfg.ev, isBk = ev && ev.type === 'bracket', dialIn = null, pinkCb = null;
      if (isBk) {
        var key = dist === 'quarter' ? 'q' : 'e', lastP = (inst.log || []).filter(function (x) { return x.dist === key && !x.out && x.sp[key === 'q' ? '1/4' : '1/8']; })[0];
        var dflt = lastP ? Math.ceil(lastP.sp[key === 'q' ? '1/4' : '1/8'][0] * 20) / 20 : inst.best && inst.best[key] ? Math.ceil(inst.best[key] * 20) / 20 : '';
        dialIn = h('input', { type: 'number', step: '0.01', min: '3', max: '30', value: dflt, class: 'tinput', style: { maxWidth: '110px' } });
      }
      var canPink = ev && ev.type === 'callout' && G.state.cars.length > 1;
      if (canPink) pinkCb = h('input', { type: 'checkbox' });
      var techLine = cfg.theme !== 'strip' ? 'No tech on the street' : tech ? tech : 'Passed' + (S.tech ? ' (' + ['', 'roll bar', 'roll cage'][Math.min(2, S.tech)] + ')' : '');
      close = UI.modal([h('div', { class: 'pix acc' }, 'RACE DAY'),
        h('div', { class: 'pix' }, title || (cfg.mode === 'career' ? DR.EVENT_TYPES[cfg.ev.type].name : 'Street race')),
        h('div', { class: 'dim' }, (dist === 'quarter' ? '1/4 mile' : '1/8 mile') + ' • ' + DR.condLabel(cond)),
        h('div', { class: 'plvl', style: { marginTop: '6px' } }, 'ENTRY LIST'), entries,
        isBk ? h('div', { class: 'row', style: { gap: '8px', alignItems: 'center', marginTop: '6px' } }, h('span', { class: 'plvl' }, 'YOUR DIAL-IN'), dialIn, h('span', { class: 'dim gsmall' }, 'Run quicker than it and you lose.')) : null,
        canPink ? h('label', { class: 'row', style: { gap: '8px', alignItems: 'center', marginTop: '6px' } }, pinkCb, h('span', { class: 'bad' }, 'Race for pink slips: win their car, or lose yours')) : null,
        ev && ev.type === 'callout' && !canPink ? h('div', { class: 'dim gsmall', style: { marginTop: '4px' } }, 'Pink slips need a second car in your garage.') : null,
        ev && (ev.type === 'boss' || ev.king) ? h('div', { class: 'acc', style: { marginTop: '4px' } }, 'The King races for their car.') : null,
        h('div', { class: 'plvl', style: { marginTop: '6px' } }, 'TECH'), h('div', { class: tech ? 'bad' : '' }, techLine),
        h('div', { class: 'plvl', style: { marginTop: '6px' } }, 'YOUR CAR'),
        h('div', { class: 'dim' }, ws.map(function (x) { return (x.cat === 'rtires' ? 'Tires ' : 'Clutch ') + Math.round(x.w * 100) + '% worn'; }).join(' • ') + ' • fuel about ' + DR.money(DR.runCost(S).total) + ' a pass'),
        h('div', { class: 'row', style: { justifyContent: 'flex-end', gap: '8px', marginTop: '10px' } },
          btn('Not yet', function () { close(); }),
          btn('To the lanes', function () {
            if (tech) return UI.toast(tech);
            if (isBk) {
              var d = parseFloat(dialIn.value);
              if (!(d > 3 && d < 30)) return UI.toast('Put a dial-in on the window first');
              // they dial off their own time trial, a little under it so they
              // don't break out (a bigger cushion the less consistent they are)
              var o = opps[cfg.round || 0], sk = o.skill || 0.5, oi = G.oppInst(o);
              var tt = Math.min(DR.Race.trial(oi, sk, cfg, cond), DR.Race.trial(oi, sk, cfg, cond));
              cfg.bracket = { dial: [Math.round(d * 100) / 100, Math.round((tt - 0.01 - (1 - sk) * 0.15) * 100) / 100] };
            }
            if (pinkCb && pinkCb.checked) cfg.pinks = true;
            close(); DR.Race.start(cfg);
          }, 'primary' + (tech ? ' disabled' : '')))]);
    },
    // The surface and time of day for a race. Street spots and the strip
    // keep their old grip figures as a rating against their surface.
    cond: function (cfg) {
      var surface = cfg.surface || (cfg.theme === 'street' ? ((cfg.grip || 0.85) >= 0.9 ? 'noprep' : 'street') : 'prep');
      return DR.conditions(surface, cfg.night != null ? cfg.night : cfg.theme === 'street');
    },
    SURF_BASE: { prep: 1, noprep: 0.92, street: 0.85 },
    // a time-trial pass by an AI driver in the day's conditions: its ET
    trial: function (inst, skill, cfg, cond) {
      var S = G.spec(inst), sim = new DR.Sim(S, { grip: (cfg.grip || 1) / DR.Race.SURF_BASE[cond.surface], cond: cond, shakeRnd: 1, dist: cfg.dist, tireT: S.tire.topt });
      var ai = new DR.AIDriver(skill, Math.random), dt = 1 / 400, tG = -1.2;
      while (!sim.finished && tG < 60 && !sim.crashed) { sim.step(dt, ai.input(sim, tG, dt)); tG += dt; }
      return sim.finished ? sim.et : 30;
    }
  };

  // ---------------------------------------------------------------- dash
  // Pixel race dash: an rpm sweep (rising LED segments that flash blue at
  // the shift point) over a big gear digit, tire temp & boost bars on the
  // left, LCD speed on the right, warning lights in the corners. Drawn at
  // 232x44 on a smoked, see-through panel and scaled up crisp by CSS.
  function px(c, x, y, w, hh, col) { c.fillStyle = col; c.fillRect(x, y, w, hh); }
  function drawDash(c, sim, Sx, phase) {
    var W = DASH_W, H = DASH_H, txt = DR.pixText;
    c.clearRect(0, 0, W, H);
    // smoked glass panel with stepped corners and a fine top highlight
    var glass = 'rgba(9,10,14,0.58)';
    px(c, 3, 0, W - 6, H, glass); px(c, 1, 1, 2, H - 2, glass); px(c, W - 3, 1, 2, H - 2, glass); px(c, 0, 3, 1, H - 6, glass); px(c, W - 1, 3, 1, H - 6, glass);
    px(c, 3, 0, W - 6, 1, 'rgba(255,255,255,0.14)');
    px(c, 60, 4, 1, H - 8, 'rgba(255,255,255,0.07)'); px(c, W - 61, 4, 1, H - 8, 'rgba(255,255,255,0.07)');
    // ---- rpm sweep
    var rpm = sim.rpm(), top = Math.ceil((Sx.red + 600) / 1000) * 1000, shiftAt = Sx.tune.shiftRpm;
    var x0 = 66, nSeg = 34, segW = 2, gap = 1;
    var flash = sim.launched && !sim.finished && rpm >= shiftAt - 50 && sim.gear < Sx.ratios.length - 1;
    var blink = Math.floor(performance.now() / 70) % 2;
    for (var i = 0; i < nSeg; i++) {
      var r0 = top * i / nSeg, on = rpm >= r0 + top / nSeg * 0.5, hgt = 3 + Math.round(i / (nSeg - 1) * 6), sx = x0 + i * (segW + gap), sy = 13 - hgt;
      var col = r0 >= Sx.red ? '#ff3a3a' : r0 >= shiftAt - 1200 ? '#ffd000' : '#36e06a';
      if (flash) { col = blink ? '#5b95ff' : col; }
      px(c, sx, sy, segW, hgt, on ? col : (r0 >= Sx.red ? 'rgba(255,58,58,0.18)' : 'rgba(255,255,255,0.09)'));
      if (on) px(c, sx, sy, segW, 1, 'rgba(255,255,255,0.55)');
    }
    for (var k = 1000; k < top; k += 1000) {
      var kx = x0 + Math.round(k / top * nSeg) * (segW + gap) - 1;
      txt(c, String(k / 1000), kx, 15, k >= Sx.red ? '#ff6a6a' : 'rgba(205,210,220,0.55)', 1);
    }
    // ---- gear
    var gtxt = sim.launched || phase === 'tree' || phase === 'race' || sim.burnMode ? String(sim.gear + 1) : 'N';
    txt(c, gtxt, 110, 21, 'rgba(0,0,0,0.5)', 4);
    txt(c, gtxt, 109, 20, '#ffd23d', 4);
    txt(c, Math.round(rpm) + '', 140, 34, 'rgba(205,210,220,0.6)', 1);
    txt(c, 'RPM', 140, 28, 'rgba(125,130,145,0.7)', 1);
    // ---- left: tire temp & boost
    function hbar(y, label, frac, col, zone) {
      txt(c, label, 6, y, 'rgba(125,130,145,0.9)', 1);
      px(c, 6, y + 7, 48, 4, 'rgba(255,255,255,0.08)');
      if (zone) px(c, 6 + Math.round(zone[0] * 48), y + 6, Math.max(1, Math.round((zone[1] - zone[0]) * 48)), 6, 'rgba(70,224,122,0.22)');
      var fw = Math.round(Math.min(1, Math.max(0, frac)) * 48);
      for (var q = 0; q < fw; q += 2) px(c, 6 + q, y + 7, 1, 4, col);
    }
    var T = sim.tireT, tt = Sx.tire, tmax = Math.max(130, tt.topt + 50);
    var sm = G.simMode(), tcol = sm ? '#c8c8d0' : T < tt.topt - 10 ? '#4da3ff' : T > tt.topt + 30 ? '#ff4d4d' : '#46e07a';
    hbar(4, 'TIRE ' + Math.round(T * 1.8 + 32), T / tmax, tcol, sm ? null : [(tt.topt - 10) / tmax, (tt.topt + 30) / tmax]);
    if (Sx.fiType !== 'none') hbar(18, 'BOOST ' + sim.boost.toFixed(0), sim.boost / Math.max(Sx.maxBoost, 5), '#ffcc33');
    // ---- right: speed
    var mph = sim.v * 2.23694, km = G.state.settings.units === 'kmh', sp = String(Math.round(km ? mph * 1.609 : mph));
    while (sp.length < 3) sp = ' ' + sp;
    txt(c, '888', W - 52, 5, 'rgba(125,255,138,0.08)', 3);
    txt(c, sp, W - 52, 5, '#7dff8a', 3);
    txt(c, km ? 'KM/H' : 'MPH', W - 22, 23, 'rgba(125,130,145,0.9)', 1);
    // ---- warning lights, bottom corners
    var lampsL = [['LCK', sim.burnMode, '#ffcc00'], ['TB', Sx.trType === 'auto' && Sx.tbrake && !sim.launched && phase !== 'pre' && phase !== 'burnout', '#ffcc00'], ['2ST', Sx.twostep && !sim.launched && sim.cut, '#ff8a2a']];
    var lampsR = [['NOS', sim.nosOn, '#c89bff'], ['TC', sim.tcCut > 0.05, '#ff8a2a'], ['BRK', sim.brakeLimited, '#ff4040']];
    function lamp(x, lp) {
      px(c, x, 33, 15, 7, lp[1] ? lp[2] : 'rgba(255,255,255,0.06)');
      txt(c, lp[0], x + 2, 34, lp[1] ? '#0b0c10' : 'rgba(205,210,220,0.28)', 1);
    }
    lampsL.forEach(function (lp, j) { lamp(6 + j * 17, lp); });
    lampsR.forEach(function (lp, j) { lamp(W - 57 + j * 17, lp); });
  }

  // ---------------------------------------------------------------- pedals
  // The touch controls are pixel art too, drawn small and scaled up crisp:
  // a drilled aluminium race pedal with a throttle meter, a round arcade
  // button whose cap takes the colour of what it does, and a nitrous button.
  var PEDAL = { gas: [52, 72], act: [64, 72], nos: [40, 26] };
  var ACT_COL = { go: ['#fff1a8', '#ffcc00', '#d19a00', '#6a4a00'], launch: ['#ffb0a4', '#ff3b30', '#bf2018', '#5a0c08'], shift: ['#bcd8ff', '#3b8bff', '#1d55c0', '#0a2460'] };
  function disc(c, cx, cy, r, col) { for (var y = -r; y <= r; y++) { var w = Math.floor(Math.sqrt(r * r + r * 0.8 - y * y)); px(c, cx - w, cy + y, w * 2 + 1, 1, col); } }
  function label(c, str, cx, y, col) {
    var tw = DR.pixTextW(str), lx = Math.round(cx - tw / 2);
    px(c, lx - 3, y, tw + 6, 9, 'rgba(8,9,12,0.82)'); px(c, lx - 2, y - 1, tw + 4, 1, 'rgba(8,9,12,0.82)'); px(c, lx - 2, y + 9, tw + 4, 1, 'rgba(8,9,12,0.82)');
    DR.pixText(c, str, lx, y + 2, col);
  }
  function shade(rgb, k) { return 'rgb(' + rgb.map(function (v) { return Math.max(0, Math.min(255, Math.round(v * k))); }).join(',') + ')'; }
  function drawGasPedal(c, held, level) {
    var W = PEDAL.gas[0], H = PEDAL.gas[1], cx = 24;
    c.clearRect(0, 0, W, H);
    // floor hinge and shadow; pressing tilts the plate back, so it
    // foreshortens (the top drops) and darkens
    px(c, 6, 61, 36, 3, 'rgba(0,0,0,0.4)');
    px(c, 15, 55, 18, 7, '#141519'); px(c, 16, 56, 16, 5, '#3c4049'); px(c, 16, 56, 16, 1, '#6b707c'); px(c, 18, 58, 2, 2, '#1d1f24'); px(c, 28, 58, 2, 2, '#1d1f24');
    var top = held ? 9 : 1, bot = 55, rows = bot - top, lit = held ? 0.84 : 1;
    for (var y = 0; y < rows; y++) {
      var k = y / rows, half = Math.round(21 - 4 * k), yy = top + y;
      px(c, cx - half - 1, yy, half * 2 + 2, 1, '#121317');
      if (y === 0 || y === rows - 1) continue;
      var base = [200 - 46 * k, 205 - 44 * k, 214 - 40 * k];
      for (var x = -half; x < half; x++) {
        var b = base, f = lit * (1 + ((x + y * 3) % 5 === 0 ? 0.035 : 0));          // brushed grain
        if (x === -half || x === -half + 1) f = lit * 1.18;                           // lit left bevel
        else if (x >= half - 2) f = lit * 0.72;                                        // shaded right bevel
        px(c, cx + x, yy, 1, 1, shade(b, f));
      }
    }
    px(c, cx - 19, top + 1, 38, 1, held ? '#dfe2e7' : '#ffffff');
    // drilled holes in three columns, each with a shadowed top and a lit lower rim
    var step = held ? 6 : 7, hh = held ? 2 : 3;
    for (var hy = top + 5; hy < bot - 8; hy += step) {
      var kk = (hy - top) / rows, hw = Math.round(21 - 4 * kk);
      [-hw + 6, -2, hw - 10].forEach(function (dx) {
        px(c, cx + dx + 1, hy, 4, hh, '#202227'); px(c, cx + dx, hy + 1, 6, hh - 1, '#202227');
        px(c, cx + dx + 1, hy, 4, 1, '#0d0e11');
        px(c, cx + dx + 1, hy + hh, 4, 1, held ? '#c9cdd4' : '#eef0f3');
      });
    }
    // green anodised toe strip
    px(c, cx - 17, bot - 6, 34, 4, held ? '#26a457' : '#3fd472'); px(c, cx - 17, bot - 6, 34, 1, held ? '#7dff9a' : '#b4ffca'); px(c, cx - 17, bot - 3, 34, 1, '#1a7a3e');
    // throttle meter up the right side
    var n = held ? Math.max(1, Math.round(level * 10)) : 0;
    for (var i = 0; i < 10; i++) {
      var on = i < n, sy = bot - 4 - i * 5;
      px(c, 47, sy, 4, 4, '#0c0d10'); px(c, 48, sy + 1, 2, 2, on ? (i > 7 ? '#d4ff6a' : '#46e07a') : '#2a2d33');
      if (on) px(c, 48, sy + 1, 2, 1, '#c8ffd8');
    }
    label(c, 'GAS', cx, 63, held ? '#7dff9a' : '#46e07a');
  }
  function drawActButton(c, mode, str, held) {
    var W = PEDAL.act[0], H = PEDAL.act[1], col = ACT_COL[mode] || ACT_COL.go, cx = 32, cy = 29, t = performance.now();
    c.clearRect(0, 0, W, H);
    disc(c, cx, cy + 3, 28, 'rgba(0,0,0,0.4)');                       // shadow
    disc(c, cx, cy, 28, '#121317');                                    // bezel ring
    disc(c, cx, cy, 27, '#6a707c'); disc(c, cx, cy + 1, 26, '#4a4f5a'); disc(c, cx, cy + 2, 24, '#383c45');
    px(c, cx - 14, cy - 26, 28, 1, '#a3a9b4'); px(c, cx - 19, cy - 24, 6, 1, '#8a909c'); px(c, cx + 13, cy - 24, 6, 1, '#8a909c');
    [[-18, -18], [18, -18], [-18, 18], [18, 18]].forEach(function (o) { px(c, cx + o[0] - 1, cy + o[1] - 1, 3, 3, '#1d1f24'); px(c, cx + o[0], cy + o[1], 1, 1, '#9aa0ab'); });
    disc(c, cx, cy + 1, 21, '#08090b');                                // well
    var d = held ? 3 : 0;
    if (!held) disc(c, cx, cy + 3, 19, col[3]);                        // cap skirt
    disc(c, cx, cy + d, 19, col[2]);                                   // cap: a darker crescent low right
    disc(c, cx - 1, cy - 1 + d, 17, held ? col[2] : col[1]);
    // curved highlight and specular
    for (var i = 0; i < 9; i++) { var a = Math.PI * (1.05 + i * 0.06); px(c, Math.round(cx + Math.cos(a) * 14), Math.round(cy + d + Math.sin(a) * 14), 2, 2, col[0]); }
    px(c, cx - 9, cy - 9 + d, 4, 3, '#ffffff'); px(c, cx - 10, cy - 6 + d, 2, 2, col[0]);
    px(c, cx - 2, cy + 16 + d, 10, 1, col[2]); px(c, cx + 8, cy + 13 + d, 4, 1, col[2]);
    if (mode === 'launch' && !held && Math.floor(t / 220) % 2) { disc(c, cx, cy, 9, col[0]); disc(c, cx, cy, 5, '#ffffff'); }
    label(c, str, cx, 62, col[1]);
  }
  function drawNosButton(c, armed) {
    var W = PEDAL.nos[0], H = PEDAL.nos[1], t = performance.now();
    c.clearRect(0, 0, W, H);
    px(c, 3, H - 3, W - 6, 3, 'rgba(0,0,0,0.4)');
    px(c, 1, 0, W - 2, H - 2, '#121317'); px(c, 0, 1, W, H - 4, '#121317');
    px(c, 1, 1, W - 2, H - 4, '#3a3e47'); px(c, 1, 1, W - 2, 1, '#6a707c');
    px(c, 3, 3, 1, 1, '#9aa0ab'); px(c, W - 4, 3, 1, 1, '#9aa0ab'); px(c, 3, H - 6, 1, 1, '#9aa0ab'); px(c, W - 4, H - 6, 1, 1, '#9aa0ab');
    var on = armed && Math.floor(t / 140) % 2;
    var cap = armed ? (on ? '#c49aff' : '#a26bff') : '#6b44b8';
    px(c, 6, 4, W - 12, H - 10, '#140a28'); px(c, 7, 5, W - 14, H - 12, cap);
    px(c, 7, 5, W - 14, 1, armed ? '#efe2ff' : '#a98ae6'); px(c, 7, H - 8, W - 14, 1, '#3a2068');
    DR.pixText(c, 'N2O', 14, 9, armed ? '#ffffff' : '#e3d6ff');
  }

  function rollFailure(S) {
    var r = S.risk, est = DR.simulate(S, {}).et;
    var span = Math.max(1.5, Math.min(est, 12) * 0.8);
    if (Math.random() < r.engine) return { failAt: 0.6 + Math.random() * span, failType: 'engine' };
    if (Math.random() < r.trans) return { failAt: 0.4 + Math.random() * span, failType: 'trans' };
    if (Math.random() < (r.axle || 0)) return { failAt: 0.05 + Math.random() * 0.5, failType: 'axle' };
    if (Math.random() < (r.chassis || 0)) return { failAt: 0.05 + Math.random() * 0.4, failType: 'chassis' };
    return {};
  }

  RaceScreen.noMusic = true;   // the engines are the soundtrack
  function RaceScreen(cfg) {
    var settings = G.state.settings, testDrive = !!cfg.inst;
    var inst = cfg.inst || G.car(), S = G.spec(inst);
    var fail = rollFailure(S);
    var heat = testDrive ? { eng: 0, nosP: 1 } : G.roundHeat(inst, cfg);
    // the data logger, if the car has one
    var rec = testDrive ? null : DR.Logbook.recorder(inst, S);
    var you = makeRacer(inst, S, 0, cfg, fail, 'YOU', heat);
    var opp = null, ai = null;
    if (cfg.opp) {
      var oi = G.oppInst(cfg.opp), OS = DR.buildSpec(oi);
      opp = makeRacer(oi, OS, 1, cfg, {}, cfg.opp.name.toUpperCase());
      ai = new DR.AIDriver(cfg.opp.skill);
      opp.burnTarget = OS.tire.topt + (Math.random() - 0.5) * 12;
    }
    var racers = opp ? [you, opp] : [you];
    var scene = new DR.Scene(cfg.theme === 'strip' && cfg.cond && cfg.cond.night ? 'stripnight' : cfg.theme, cfg.dist);
    var parts = new DR.Particles();

    // ---------------------------------------------------------------- DOM
    var cv = h('canvas', { class: 'world', width: DR.VIEW_W, height: DR.VIEW_H });
    var ctx = DR.hiCanvas(cv);
    // HUD: a pixel instrument cluster (drawn on its own low-res canvas), a
    // slim plate for the matchup and clock, and a ribbon for messages
    var dash = h('canvas', { class: 'dash', width: DASH_W, height: DASH_H }), dctx = dash.getContext('2d');
    var msgEl = h('div', { class: 'msg' }), subEl = h('div', { class: 'sub' });
    var infoEl = h('div', { class: 'info' });
    var ribbon = h('div', { class: 'ribbon' }, msgEl, subEl);
    var hud = h('div', { class: 'hud' }, infoEl, ribbon, dash);

    function pcv(k) { return h('canvas', { class: 'pcv', width: PEDAL[k][0], height: PEDAL[k][1] }); }
    var gasCv = pcv('gas'), actCv = pcv('act'), nosCv = pcv('nos');
    var gasBtn = h('div', { class: 'pad gas' }, gasCv);
    var actLabel = { textContent: 'STAGE' };
    var actBtn = h('div', { class: 'pad act go' }, actCv);
    var nosBtn = h('div', { class: 'pad nos', style: { display: S.nosW && !S.prog ? 'flex' : 'none' } }, nosCv);
    var padKey = '';
    function drawPads() {
      var mode = actBtn.classList.contains('shift') ? 'shift' : actBtn.classList.contains('go') ? 'go' : 'launch';
      var k = [input.gasHeld, Math.round(input.gas * 8), mode, actLabel.textContent, actBtn.classList.contains('on'), input.nos].join('|');
      var anim = mode === 'launch' || input.nos;
      if (k === padKey && !anim) return;
      padKey = k;
      drawGasPedal(gasCv.getContext('2d'), input.gasHeld, input.gas);
      drawActButton(actCv.getContext('2d'), mode, actLabel.textContent, actBtn.classList.contains('on'));
      if (S.nosW && !S.prog) drawNosButton(nosCv.getContext('2d'), input.nos);
    }
    var stageBar = h('div', { class: 'stagebar' });
    var quitBtn = btn('✖', function () { quit(); }, 'small back quit');
    var controls = h('div', { class: 'controls' }, gasBtn, actBtn, nosBtn, stageBar, quitBtn);
    var root = h('div', { class: 'screen race' }, cv, hud, controls);

    // ---------------------------------------------------------------- input
    var input = { gas: 0, act: false, nos: false, gasHeld: false };
    function gasFromEvent(e) {
      if (settings.pedal !== 'slide') return 1;
      var r = gasBtn.getBoundingClientRect();
      return DR.clamp((r.bottom - e.clientY) / (r.height * 0.85), 0.15, 1);
    }
    gasBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); A.init(); A.resume(); gasBtn.setPointerCapture(e.pointerId); input.gasHeld = true; input.gas = gasFromEvent(e); });
    gasBtn.addEventListener('pointermove', function (e) { if (input.gasHeld) input.gas = gasFromEvent(e); });
    function gasUp() { input.gasHeld = false; input.gas = 0; }
    gasBtn.addEventListener('pointerup', gasUp); gasBtn.addEventListener('pointercancel', gasUp);
    // STAGE ignores taps in the first second of the burnout, and any tap
    // that is part of a burst started on the Race button: a stray second
    // tap would otherwise end the burnout before it starts
    var actReady = Infinity;   // set when the burnout actually starts
    actBtn.addEventListener('pointerdown', function (e) {
      e.preventDefault(); A.init(); A.resume();
      // a burst of taps that started on the Race button: keep ignoring it
      // until the player pauses
      var now = Date.now();
      if (now < actReady || now - lastStray < 600) { lastStray = now; return; }
      input.act = true; actBtn.classList.add('on');
    });
    function actUp() { actBtn.classList.remove('on'); }
    actBtn.addEventListener('pointerup', actUp); actBtn.addEventListener('pointercancel', actUp); actBtn.addEventListener('pointerleave', actUp);
    nosBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); input.nos = !input.nos; nosBtn.classList.toggle('on', input.nos); });
    function key(e, down) {
      if (e.repeat) return;
      var k = e.key;
      // on the timeslip: Enter / Space press its main button
      if (slipEl) { if (down && (k === 'Enter' || k === ' ')) { var pb = slipEl.querySelector('.btn.primary'); if (pb) { e.preventDefault(); pb.click(); } } return; }
      if (k === 'ArrowUp' || k === 'w' || k === 'W') { input.gasHeld = down; input.gas = down ? 1 : 0; e.preventDefault(); }
      else if (down && (k === ' ' || k === 'ArrowRight' || k === 'Enter')) { input.act = true; e.preventDefault(); }
      else if (down && (k === 'n' || k === 'N')) { input.nos = !input.nos; nosBtn.classList.toggle('on', input.nos); }
    }
    var kd = function (e) { key(e, true); }, ku = function (e) { key(e, false); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

    // ---------------------------------------------------------------- state
    var phase = 'pre', phaseT = 0, clock = 0;
    var tree = { stage: false, pre: [false, false], staged: [false, false], amber: 0, green: false, red: [false, false], amberL: [0, 0], greenL: [false, false] };
    // bracket racing: the slower dial-in gets the green first, by the
    // difference between the two dials (a handicap start on a full tree)
    var bk = cfg.bracket || null, off = [0, 0];
    if (bk) { var mxd = Math.max(bk.dial[0], bk.dial[1]); off = [mxd - bk.dial[0], mxd - bk.dial[1]]; }
    var treeStart = 0, greenAt = null, redLight = false, oppRed = false;
    // read-only view of the race for automated play-testing
    DR.Race._dbg = function () { return { you: you, opp: opp, phase: phase, green: greenAt !== null, red: redLight, tree: tree }; };
    var resultShown = false, slipEl = null;
    var voices = [];
    var flash = { text: '', t: 0 };

    function setMsg(m, sub) { msgEl.textContent = m || ''; subEl.textContent = sub || ''; }
    var estLine = '';
    if (testDrive) estLine = 'TEST DRIVE • ';
    var vsLine = opp ? 'VS ' + opp.label : 'TEST & TUNE';
    infoEl.innerHTML = '';
    setMsg(vsLine, opp ? (cfg.mode === 'street' ? 'Bet: ' + DR.money(cfg.bet) + ' • ' : cfg.mode === 'career' ? DR.EVENT_TYPES[cfg.ev.type].name + (DR.multiRound(cfg.ev) ? ' round ' + (cfg.round + 1) + '/' + cfg.ev.opps.length : '') + ' • Prize: ' + DR.money(cfg.reward) + ' • ' : '') + 'Hold GAS to do your burnout.' : 'Hold GAS to do your burnout.');
    if (cfg.cond) subEl.textContent = DR.condLabel(cfg.cond) + (heat.eng > 1 ? ' • water ' + Math.round(195 + heat.eng * 1.8) + '°F' : '') + ' • ' + subEl.textContent;
    if (estLine) subEl.textContent = estLine + subEl.textContent;
    var introSub = subEl.textContent;

    // You start in the burnout box with the line lock on (an AWD car holds
    // all four on the brakes): hold GAS to heat the tires, then STAGE to end
    // the burnout and roll up to the line. STAGE straight away skips it.
    function startBurnout() {
      if (phase !== 'pre') return;
      phase = 'burnout'; phaseT = 0;
      you.lineLock = you.sim.burnout(true);
    }
    // Pull out of the box and creep into the beams. Each car does this on its
    // own; the tree comes down once both are staged.
    function startStaging(auto) {
      if (phase !== 'pre' && phase !== 'burnout') return;
      phase = 'stage'; phaseT = 0; stageBar.innerHTML = '';
      you.sim.burnout(false); you.burn = 0;
      beginRoll(you);
      setMsg('', auto ? 'Tires are hot. Pulling up to the line...' : '');
      actLabel.textContent = 'LAUNCH'; actBtn.classList.remove('go');
    }
    function beginRoll(r) { if (r.box === 'box' || r.box === 'burn') { r.box = 'roll'; r.rollT = 0; } }
    // roll from the box to the line: ease in, then creep through pre-stage
    function stepRoll(r, dt) {
      if (r.box !== 'roll') return;
      r.rollT += dt;
      var k = Math.min(1, r.rollT / 2.2), e = k < 0.75 ? (k / 0.75) * 0.93 : 0.93 + (k - 0.75) / 0.25 * 0.07;
      r.off = BOX_X * (1 - e); r.burn = 0;
      r.wheelAng += dt * (k < 0.75 ? 6 : 1.5);
      tree.pre[r.lane] = k > 0.8;
      if (k >= 1) { r.off = 0; r.box = 'staged'; tree.staged[r.lane] = true; if (r === you || !opp || opp.box !== 'staged') A.beep(880, 0.05); }
    }

    function makeRacer(inst, S, lane, cfg, fail, label, heat) {
      heat = heat || {};
      var cond = cfg.cond || DR.Race.cond(cfg);
      var sim = new DR.Sim(S, { grip: (cfg.grip || 1) / DR.Race.SURF_BASE[cond.surface], cond: cond, engHeat: heat.eng, nosP: heat.nosP, shakeRnd: 0.6 + Math.random() * 0.8, dist: cfg.dist, tireT: cond.trackT + 4, failAt: fail.failAt, failType: fail.failType });
      return { inst: inst, S: S, sim: sim, lane: lane, label: label, spr: DR.carSprite(DR.carLook(inst)), off: BOX_X, wheelAng: 0, burn: 0, voice: null, burnT: 0,
        box: 'box', rollT: 0, waitT: 0.6 + Math.random() * 1.2 };
    }

    function ensureVoices() {
      if (voices.length || !A.ctx || A.wkPending) return;
      // wait the moment it takes to decode the recordings of both engines
      var engs = [S.eng].concat(opp ? [opp.S.eng] : []);
      if (A.banksReady && !A.banksReady(engs)) { A.preloadEngines(engs); return; }
      you.voice = A.engine(S.eng, 1, A.buildOf(S));
      if (opp) opp.voice = A.engine(opp.S.eng, 0.45, A.buildOf(opp.S));
      voices = [you.voice, opp && opp.voice];
    }

    // ---------------------------------------------------------------- loop
    var last = performance.now(), raf = 0, acc = 0;
    function frame(now) {
      var dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;   // (the first frame can be stamped before the screen opened)
      ensureVoices();
      if (!tipOpen) update(dt);
      draw(dt);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    UI.cleanup = function () {
      cancelAnimationFrame(raf); A.stopAll();
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
    };

    function playerThrottle() { return input.gasHeld ? input.gas : 0; }

    // First race ever: how to leave the line, once, as the tree comes down
    // (the race waits while it's up)
    var tipOpen = false;
    function launchTip() {
      var seen = G.state.tips || (G.state.tips = {});
      if (seen.launch || testDrive || (G.state.stats && G.state.stats.races > 0)) return;
      seen.launch = true; G.save();
      tipOpen = true; input.gasHeld = false; input.gas = 0;
      var body = S.trType === 'auto' && !S.tbrake ?
        ['Ease into the GAS on the line: the foot brake only holds so much, and too much throttle rolls you through the beams (a red light).',
         'Tap LAUNCH when the light turns green. Your automatic shifts itself.',
         'A transbrake lets you hold full throttle on the line.'] :
        ['Rev it and tap LAUNCH on green, then tap SHIFT as the lights hit the top of the tach (or turn on auto-shift in Settings).',
         'Holding full gas sits on the rev limiter, and dumping the clutch from there spins the tires.',
         'A 2-step (Shop, Power Adders) holds the revs you pick, or switch the gas pedal to Slide in Settings and feather it yourself.'];
      var close = UI.modal([h('h2', {}, 'LAUNCHING'), body.map(function (t) { return h('p', {}, t); }),
        h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '8px' } }, btn('Got it', function () { done(); }, 'primary'))]);
      function done() { close(); tipOpen = false; input.act = false; last = performance.now(); }
      // a tap outside the panel closes it too
      setTimeout(function () { var m = document.querySelector('.modal'); if (m) m.addEventListener('click', function (e) { if (e.target === m) done(); }); }, 0);
    }

    function update(dt) {
      phaseT += dt;
      var act = input.act; input.act = false;
      if (phase === 'pre' || phase === 'burnout' || phase === 'stage') {
        if (phase === 'pre') { startBurnout(); actReady = Date.now() + 1000; }
        if (act && phase !== 'stage') startStaging();
        var tt = S.tire.topt, thr = playerThrottle();
        if (phase === 'burnout') {
          if (you.sim.burnMode) you.burn = burnAmt(you);
          else { you.sim.tireT += DR.clamp(S.peakHp / 250, 0.7, 2.6) * 8 * thr * 0.6 * dt; you.sim.tireE += S.peakHp * 745.7 * 0.25 * thr * dt; you.burn = thr * 0.5; }
          // coach the burnout off the tire temperature (sim mode: you judge
          // it by the smoke and the time on the gas)
          var tT = you.sim.tireT, msg;
          if (G.simMode()) msg = thr > 0.05 ? 'Spinning...' : you.spun ? 'Hit STAGE when you\'re ready.' : introSub;
          else if (tT > tt + 25) msg = 'Too hot! Ease off the gas.';
          else if (tT >= tt - 8) msg = thr > 0.05 ? 'Tires are in the window! Let off and hit STAGE.' : 'Tires are hot. Hit STAGE to pull up to the line.';
          else if (thr > 0.05) { msg = 'Spinning... keep it pinned.'; you.spun = true; }
          else if (!you.spun) msg = introSub;
          else msg = you.lineLock ? 'Hold GAS to spin the tires. Hit STAGE when they\'re hot.' : 'AWD: hold GAS to scrub heat in on the brakes. Hit STAGE when ready.';
          if (msg !== you.burnMsg) { you.burnMsg = msg; setMsg(vsLine, msg); }
        }
        stepSim(you, dt, thr, true);
        stepRoll(you, dt);
        oppBox(dt);
        if (phase === 'stage' && you.box === 'staged') {
          if (!opp || opp.box === 'staged') { phase = 'tree'; phaseT = 0; tree.stage = true; you.sim.creep = 0; you.sim.creepV = 0; treeStart = 0.8 + Math.random() * 1.0; setMsg('', ''); launchTip(); }
          else setMsg('', 'Staged. Waiting on ' + opp.label + '...');
        }
      } else if (phase === 'tree' || phase === 'race') {
        runRace(dt, act);
      }
      // HUD flash timer
      if (flash.t > 0) { flash.t -= dt; if (flash.t <= 0 && (phase === 'race')) subEl.textContent = ''; }
    }

    // The other driver does their own burnout as soon as the screen opens,
    // then pulls up and stages by themselves.
    function oppBox(dt) {
      if (!opp) return;
      if (opp.box === 'box') {
        opp.waitT -= dt; stepSim(opp, dt, 0, true);
        if (opp.waitT <= 0) { opp.box = 'burn'; opp.burnT = 0; }
      } else if (opp.box === 'burn') {
        opp.burnT += dt;
        if (opp.sim.tireT < opp.burnTarget && opp.burnT < 6) {
          if (opp.sim.burnout(true)) { stepSim(opp, dt, opp.burnT < 0.4 ? opp.burnT / 0.4 : 0.85, true); opp.burn = burnAmt(opp); }
          else { opp.sim.tireT += DR.clamp(opp.S.peakHp / 250, 0.7, 2.6) * 8 * dt; opp.burn = 1; stepSim(opp, dt, 1, true); }
        } else {
          opp.sim.burnout(false); opp.burn = 0; stepSim(opp, dt, 0, true);
          opp.coolT = (opp.coolT || 0) + dt;
          if (opp.coolT > 0.7) beginRoll(opp);      // a breath, then pull up
        }
      } else { stepSim(opp, dt, 0, true); stepRoll(opp, dt); }
    }
    // 0..1 how hard the drive tires are really spinning in the box
    function burnAmt(r) { return DR.clamp((r.sim.ww * r.S.r - 2) / 10, 0, 1); }

    function stepSim(r, dt, thr, idle) {
      var n = Math.max(1, Math.round(dt / DT));
      for (var k = 0; k < n; k++) r.sim.step(dt / n, { throttle: thr, nos: false });
    }

    function runRace(dt, act) {
      var n = Math.max(1, Math.round(dt / DT)), sdt = dt / n;
      for (var k = 0; k < n; k++) {
        clock += sdt;
        // tree sequence (times relative to tree start)
        if (phase === 'tree') {
          var t = clock - treeStart;
          if (settings.proTree && !bk) { if (t >= 0) { tree.amber = 3; tree.amberL = [3, 3]; } if (t >= 0.4 && greenAt === null) goGreen(); }
          else {
            for (var ln = 0; ln < 2; ln++) {
              var tl = t - off[ln];
              tree.amberL[ln] = tl >= 1.0 ? 3 : tl >= 0.5 ? 2 : tl >= 0 ? 1 : 0;
              if (tl >= 1.5 && !tree.greenL[ln]) laneGreen(ln);
            }
            tree.amber = tree.amberL[0];
          }
          if (tree.amber && t < 0.05 && t >= 0) { /* amber beep */ }
        }
        var tG = !opp || opp.greenT == null ? -1 : opp.sim.time - opp.greenT;
        // player: too much throttle against the foot brake rolls the car out
        // of the beams, which starts the run (a red light before the green)
        if (!you.sim.launched && you.sim.creep > 0.18) { act = true; if (greenAt === null) setMsg('', 'Rolled through the brakes!'); }
        if (act && !you.sim.launched) {
          if (greenAt === null) { redLight = true; tree.red[0] = true; A.beep(220, 0.4); }
          you.sim.launch(); act = false;
          actLabel.textContent = 'SHIFT'; actBtn.classList.add('shift');
          phase = 'race';
        } else if (act && you.sim.launched) {
          you.sim.shiftUp();
          act = false;
        }
        // auto-shift (setting; an automatic always shifts itself); never in
        // the first moments of the launch
        if ((settings.autoShift || you.S.trType === 'auto') && you.sim.launched && you.sim.t > 0.6 && !you.sim.shifting && you.sim.sinceShift > 0.25) {
          var Sy = you.S, line = you.sim.ww * Sy.ratios[you.sim.gear] * Sy.fd * 30 / Math.PI;
          var trig = Sy.trType === 'auto' ? Math.max(line / 0.95, you.sim.rpm() >= Sy.limit - 60 ? you.sim.rpm() : 0) : you.sim.locked ? you.sim.rpm() : line;
          if (trig >= Sy.tune.shiftRpm) you.sim.shiftUp();
        }
        you.sim.step(sdt, { throttle: playerThrottle(), nos: input.nos });
        if (rec) rec.sample(you.sim, clock);
        // opponent
        if (opp) {
          var inp = ai.input(opp.sim, tG, sdt);
          opp.sim.step(sdt, inp);
        }
      }
      if (greenAt !== null && phase === 'tree' && clock - greenAt > 4 && !you.sim.launched) {
        // driver asleep at the wheel: auto-launch so the race can finish
        you.sim.launch(); phase = 'race'; actLabel.textContent = 'SHIFT'; actBtn.classList.add('shift');
      }
      // finish conditions: the slip comes up a couple of seconds into the
      // shutdown (the cars keep coasting behind it); a slower opponent gets a
      // few more seconds to cross the line first
      racers.forEach(function (r) {
        var s2 = r.sim;
        if (r.doneAt == null && (s2.finished || s2.crashed || s2.blown || s2.broke || (s2.launched && s2.t > 40))) r.doneAt = clock;
      });
      if (!resultShown && you.doneAt != null && clock - you.doneAt > 2) {
        var oppDone = !opp || (opp.doneAt != null && clock - opp.doneAt > 0.4) || !opp.sim.launched && clock - you.doneAt > 3;
        if (oppDone || clock - you.doneAt > 6) { resultShown = true; showResult(); }
      }
    }

    function goGreen() { laneGreen(0); laneGreen(1); }
    // a lane's green: lane 0 is yours, lane 1 the other car's
    function laneGreen(ln) {
      tree.greenL[ln] = true;
      var r = racers.filter(function (x) { return x.lane === ln; })[0];
      if (r) r.greenT = r.sim.time;
      if (ln === 0) { greenAt = clock; tree.green = true; A.beep(1320, 0.15); if (!redLight) setMsg('', ''); }
    }

    // ---------------------------------------------------------------- drawing
    function draw(dt) {
      var you0 = you.sim.x + you.off;
      var camX = you0 - DR.VIEW_W * 0.575 / DR.PPM;
      if (camX < -30) camX = -30;
      scene.drawBackground(ctx, camX, clock);
      scene.drawTrack(ctx, camX, clock);
      scene.drawTree(ctx, camX, tree);
      // racers: far lane first
      var order = racers.slice().sort(function (a, b) { return b.lane - a.lane; });
      var lamps = [];
      parts.update(dt);
      order.forEach(function (r) { lamps.push(drawRacer(r, camX, dt)); parts.draw(ctx, camX, DR.LANE_Y, r.lane); });
      scene.drawForeground(ctx, camX);
      scene.light(ctx, camX, lamps, parts);
      drawHud();
      handleEvents();
      racers.forEach(function (r) {
        if (r.voice) A.update(r.voice, r.sim.rpm(), Math.max(r.sim.thr, r.burn * 0.9), r.sim.boost, tireSpin(r), r.S.fiType, soundState(r));
      });
    }

    // 0..1: how hard the drive tires are spinning beyond normal grip slip
    function tireSpin(r) {
      if (r.burn) return r.burn;
      var sim = r.sim;
      if (!sim.launched || sim.finished) return 0;
      var slipV = Math.max(0, sim.ww * r.S.r - sim.v), gripV = r.S.tslip * Math.max(sim.v, 2.5);
      return DR.clamp((slipV - gripV * 1.4) / 10, 0, 1);
    }
    function soundState(r) {
      var seqShift = r.sim.shifting && (r.S.trType === 'seq' || r.S.trType === 'dct');
      // share of the time since the last frame the ignition was cut
      var cutFrac = r.sim.stepT > 0 ? r.sim.cutT / r.sim.stepT : (r.sim.cut ? 1 : 0);
      r.sim.cutT = 0; r.sim.stepT = 0;
      var st = { nos: r.sim.nosOn, cut: r.sim.cut || seqShift, cutFrac: seqShift ? 1 : cutFrac, shiftCut: seqShift, pre: !r.sim.launched, twostep: !!r.S.twostep, tire: r.S.tire.kind, gearWhine: r.S.trType === 'seq' };
      if (r !== you) {
        // The camera rides along with your car, about 10 m off the track.
        // The other car is placed by where it is, gets quieter (1/distance)
        // and duller with distance, and its pitch shifts with how fast it is
        // closing on or pulling away from the camera (Doppler).
        var D = 10, dx = r.sim.x + r.off - (you.sim.x + you.off);
        var dist = Math.sqrt(dx * dx + D * D);
        var vr = dx / dist * (r.sim.v - you.sim.v);          // > 0: moving away
        var dop = DR.clamp(343 / (343 + vr), 0.75, 1.3);
        r.dop = r.dop ? r.dop + (dop - r.dop) * 0.2 : dop;
        st.doppler = r.dop;
        st.pan = DR.clamp(dx / 40, -0.7, 0.7);
        st.near = DR.clamp(D / dist, 0.04, 1);
      }
      return st;
    }

    function drawRacer(r, camX, dt) {
      var spr = r.spr, sim = r.sim;
      var frontX = sim.x + r.off;
      var gy = DR.LANE_Y[r.lane];
      var frontPx = (frontX - camX) * DR.PPM;
      var gx = frontPx - (spr.padL + spr.lenPx - spr.wheelR.x);
      // rigid pitch only for wheelies; the body moves on its springs on top
      var pitch = sim.th, SUSP_VIS = 1.8;
      // wheel rotation
      var spin = r.burn && !sim.burnMode ? 60 : sim.ww;
      r.wheelAng += spin * dt;
      if (sim.crashed) pitch = Math.min(1.6, (r.crashP = (r.crashP || sim.th) + dt * 2.5));
      DR.drawCar(ctx, spr, gx, gy, pitch, r.wheelAng, { barRad: r.S.barRad, brake: sim.brake, chute: Math.max(0, sim.chute || 0), t: clock, spin: spin, frontStill: sim.burnMode, fwd: r.S.drive === 'FWD',
        susp: { z: (sim.z || 0) * SUSP_VIS + (sim.shake ? sim.shake * 0.02 * Math.sin(sim.shakePh) : 0), phi: (sim.phi || 0) * SUSP_VIS + (sim.shake ? sim.shake * 0.012 * Math.cos(sim.shakePh * 0.5) : 0) } });
      var lamp = DR.carLamps(spr, gx, gy, pitch);
      lamp.brake = sim.brake > 0.05; lamp.ground = gy; lamp.car = { spr: spr, gx: gx, gy: gy, pitch: pitch };
      // smoke from the drive tires
      var rearX = frontX - (spr.padL + spr.lenPx - spr.wheelR.x) / DR.PPM;
      // tire smoke: more the harder the tires spin over the ground
      var slipV = Math.max(0, sim.ww * r.S.r - sim.v);
      var heavy = r.burn ? r.burn : (sim.launched && !sim.finished && sim.v < 70 && sim.slip > r.S.tslip * 2) ? Math.min(1, slipV / 12) : 0;
      if (heavy > 0.05) {
        r.smokeAcc = (r.smokeAcc || 0) + dt * 52 * heavy;
        var n = Math.floor(r.smokeAcc); r.smokeAcc -= n;
        // (from the front tires on a front-driver)
      if (n) parts.smoke(r.S.drive === 'FWD' ? rearX + (spr.wheelF.x - spr.wheelR.x) / DR.PPM : rearX, 0.12, sim.v, Math.min(6, n), { lane: r.lane, slip: slipV, dense: 0.55 + 0.35 * heavy });
      }
      if (sim.nosOn || (sim.cut && !sim.launched && r.S.twostep && Math.random() < 0.15)) {
        var ex = rearX - (spr.wheelR.x - spr.padL) / DR.PPM;
        parts.flame(ex, 0.35 + sim.th * 1.5, sim.nosOn);
        parts.list.slice(-4).forEach(function (p) { p.lane = r.lane; });
      }
      if ((sim.blown || sim.broke) && Math.random() < 0.6) {
        parts.smoke(frontX - 1, 0.8, sim.v, 1, { lane: r.lane, engine: true, dense: 0.7 });
      }
      return lamp;
    }

    function handleEvents() {
      racers.forEach(function (r) {
        var ev = r.sim.events; if (!ev.length) return;
        var isYou = r === you;
        ev.forEach(function (e) {
          if (e === 'shift' && r.S.fiType === 'turbo' && isYou) A.blowoff();
          if (e === 'backfire' && isYou && !(r.voice && r.voice.wk) && Math.random() < 0.3) A.pop();
          if (e === 'shake' && isYou && !G.simMode()) note('TIRE SHAKE - PEDAL IT!');
          if (e === 'crash') { if (isYou) { A.boom(); note('YOU FLIPPED IT!'); } else note(r.label + ' FLIPPED!'); }
          if (e === 'blown') { A.boom(); if (isYou) note('ENGINE BLEW UP!'); else note(r.label + ' BLEW UP!'); }
          if (e === 'broke') { if (isYou) note(r.sim.brokeWhat === 'axle' ? 'SNAPPED AN AXLE!' : r.sim.brokeWhat === 'chassis' ? 'CHASSIS CRACKED!' : 'TRANSMISSION BROKE!'); else note(r.label + ' BROKE!'); }
        });
        r.sim.events = [];
      });
    }
    function note(t) { subEl.textContent = t; flash.t = 1.6; }

    function drawHud() {
      var sim = you.sim, Sx = you.S;
      drawDash(dctx, sim, Sx, phase);
      // the plate: matchup, clock, red light
      var lines = [];
      lines.push('<span class="dim">' + (opp ? 'VS ' : '') + '</span>' + (opp ? opp.label : testDrive ? 'TEST DRIVE' : 'TEST &amp; TUNE'));
      if (greenAt !== null) {
        var el = sim.finished ? sim.et : sim.etStart !== null ? sim.time - sim.etStart : 0;
        lines.push('<span class="clock">' + el.toFixed(3) + '</span>');
        if (redLight) lines.push('<span class="warn">RED LIGHT</span>');
      }
      var html = lines.join('<br>');
      if (html !== infoEl._h) { infoEl.innerHTML = html; infoEl._h = html; }
      gasBtn.classList.toggle('on', input.gasHeld);
      drawPads();
      if (phase === 'tree' && greenAt === null && !redLight) setMsg('', you.sim.brakeLimited ? 'Brakes slipping! Ease off the gas.' : '');
      ribbon.classList.toggle('on', !!(msgEl.textContent || subEl.textContent));
    }

    // ---------------------------------------------------------------- results
    function runInfo(r, red) {
      var sim = r.sim;
      var rt = red ? -1 : sim.etStart !== null && r.greenT != null ? sim.etStart - r.greenT : null;
      var total = sim.finished && r.greenT != null ? sim.finishTime - r.greenT : Infinity;
      if (sim.crashed || sim.blown || sim.broke) total = Infinity;
      return { rt: rt, total: total, sim: sim, red: red };
    }

    function showResult() {
      var me = runInfo(you, redLight), them = opp ? runInfo(opp, oppRed) : null;
      var win = null, bkNote = null;
      if (them) {
        if (me.red && !them.red) win = false;
        else if (them.red && !me.red) win = true;
        else if (bk) {
          // bracket: first to the stripe on the handicap start wins, unless
          // they ran quicker than their dial-in (a breakout); if both broke
          // out, the smaller breakout wins
          var boY = me.total < Infinity && me.sim.et < bk.dial[0], boT = them.total < Infinity && them.sim.et < bk.dial[1];
          me.pkg = me.total - bk.dial[0]; them.pkg = them.total - bk.dial[1];
          if (boY && !boT) { win = false; bkNote = 'You broke out by ' + (bk.dial[0] - me.sim.et).toFixed(3); }
          else if (boT && !boY) { win = true; bkNote = opp.label + ' broke out by ' + (bk.dial[1] - them.sim.et).toFixed(3); }
          else if (boY && boT) { win = bk.dial[0] - me.sim.et < bk.dial[1] - them.sim.et; bkNote = 'Both broke out'; }
          else win = me.pkg < them.pkg;
        }
        else win = me.total < them.total;
      }
      // what the slip shows besides the times: news (stage unlocked, next
      // round), a money breakdown, unlock chips and a few short notes
      var moneyDelta = 0, firstWin = false, news = [], money = [], unlocks = [], notes = [];
      var damaged = you.sim.blown ? { engine: true } : you.sim.broke ? (you.sim.brokeWhat === 'axle' ? { axle: true } : you.sim.brokeWhat === 'chassis' ? { chassis: true } : { trans: true }) : null;
      var ev = cfg.ev, nextRound = null;
      if (cfg.mode === 'career' && win) {
        if (DR.multiRound(ev) && cfg.round < ev.opps.length - 1) {
          nextRound = cfg.round + 1;
          news.push('Round ' + (cfg.round + 1) + ' of ' + ev.opps.length + ' won! Next: ' + ev.opps[nextRound].name);
        } else {
          var res = G.winEvent(ev);
          moneyDelta = res.cash; firstWin = res.first;
          money.push([res.first ? 'Prize' : 'Prize (rerun)', res.purse]);
          money = money.concat(res.money);
          if (res.banner) news.push(res.banner);
          if (res.contract) news.push(res.contract);
          unlocks = res.unlocks;
          if (res.newRaces) notes.push(['dim', res.newRaces + ' new race' + (res.newRaces > 1 ? 's' : '') + ' to run']);
          // a launch bonus on the race purse (CSR's perfect-start bonus)
          var lb = me.rt != null && me.rt >= 0 ? (me.rt <= 0.05 ? 0.15 : me.rt <= 0.15 ? 0.05 : 0) : 0;
          var purse = res.purse;
          if (lb) { var bonus = Math.round(purse * lb / 10) * 10; moneyDelta += bonus; money.push([(lb > 0.1 ? 'Perfect' : 'Good') + ' launch', bonus]); }
          var style = G.styleBonus(purse);
          if (style) { moneyDelta += style; money.push(['Style ' + DR.starText(DR.starRating(inst)), style]); }
        }
      }
      if (cfg.mode === 'career' && win === false && DR.multiRound(ev)) news.push('Knocked out in round ' + (cfg.round + 1) + '. Back to round 1.');
      if (cfg.mode === 'street') { moneyDelta = win ? cfg.bet : -cfg.bet; money.push([win ? 'Bet won' : 'Bet lost', moneyDelta]); }
      // the sponsor's stipend: paid for every race day you turn up to
      var spn = cfg.mode === 'career' && ev && ev.stage != null && !(cfg.round > 0) ? G.careerState().sponsor[ev.stage] : null;
      if (spn && spn.stipend && !testDrive) { moneyDelta += spn.stipend; money.push([DR.sponsorById(spn.id).name + ' stipend', spn.stipend]); }
      if (moneyDelta) G.earn(moneyDelta);
      if (them && !testDrive && (cfg.mode === 'career' || cfg.mode === 'street')) {
        var rc = G.payRunCost(S, you.sim.nosT);
        if (rc.paid) { money.push(['Fuel' + (rc.nos ? ' & nitrous' : ''), -rc.paid]); moneyDelta -= rc.paid; }
      }
      // every pass wears the tires and the clutch (a dealer test drive isn't yours)
      if (!testDrive) {
        DR.Logbook.add(inst, { mode: cfg.mode, what: cfg.mode === 'career' ? DR.EVENT_TYPES[cfg.ev.type].name + (them ? ' vs ' + opp.label : '') : cfg.mode === 'street' ? 'Street vs ' + opp.label : 'Test & tune',
          dist: cfg.dist, cond: cfg.cond, me: me, sim: you.sim, S: S, water: heat.eng, result: them ? (win ? 'W' : 'L') : '' }, rec);
        G.addWear(inst, S, you.sim); G.afterRound(inst, S, you.sim);
      }
      if (them && !testDrive) { G.state.stats.races++; if (win) G.state.stats.wins++; G.clearSold(); }
      // personal bests
      var key = cfg.dist > 300 ? 'q' : 'e', prevBest = inst.best[key], pbLine = null;
      if (!testDrive && you.sim.finished && cfg.grip >= 1 && !redLight && (!inst.best[key] || you.sim.et < inst.best[key])) { inst.best[key] = you.sim.et; notes.unshift(['good', 'New personal best!']); }
      // the quickest trap speed, for tech (parachute over 150 mph)
      if (!testDrive && key === 'q' && you.sim.finished && !redLight) inst.best.qt = Math.max(inst.best.qt || 0, Math.round(you.sim.trap || 0));
      else if (you.sim.finished && prevBest) pbLine = 'Your best ' + (key === 'q' ? '1/4' : '1/8') + ': ' + prevBest.toFixed(3) + ' (' + '+' + (you.sim.et - prevBest).toFixed(3) + ')';
      // how close it was
      var margin = null;
      if (them && me.total < Infinity && them.total < Infinity && !me.red && !them.red) margin = (win ? 'Won' : 'Lost') + ' by ' + Math.abs(them.total - me.total).toFixed(3) + 's';
      else if (them && win && them.total === Infinity && !them.red) margin = opp.label + (opp.sim.crashed ? ' crashed' : opp.sim.blown ? ' blew up' : opp.sim.broke ? ' broke' : ' did not finish');
      if (bk && them) margin = bkNote || (me.total < Infinity && them.total < Infinity && !me.red && !them.red ? (win ? 'Won' : 'Lost') + ' by ' + Math.abs(them.pkg - me.pkg).toFixed(3) + ' at the stripe' : margin);
      // pink slips: a King always races for their car; a callout for pinks
      // puts both cars on the line
      var pinkWon = null, pinkLost = false;
      if (cfg.mode === 'career' && win && nextRound == null && (cfg.pinks || ((ev.type === 'boss' || ev.king) && res && res.first))) {
        pinkWon = G.awardCar(ev.opps[ev.opps.length - 1]);
        news.push('PINK SLIP: ' + opp.label + '\'s ' + DR.CARS[pinkWon.carId].name + ' is yours');
      }
      if (cfg.mode === 'career' && win === false && cfg.pinks && !testDrive) pinkLost = true;
      if (damaged && testDrive) { notes.push(['dim', 'Good thing it was a test drive.']); damaged = null; }
      if (damaged) {
        inst.damage = damaged;
        var what = damaged.engine ? 'Engine blown.' : damaged.axle ? 'Snapped an axle.' : damaged.chassis ? 'Cracked the chassis.' : 'Transmission broken.', fix = G.repairCost(inst);
        // auto-repair (Settings): the shop fixes it straight away when you can pay
        if (settings.autoRepair && G.canAfford(fix) && G.repair(inst)) { notes.push(['bad', what + ' Auto-repaired: ' + DR.money(fix)]); damaged = null; }
        else notes.push(['bad', what + ' Repair: ' + DR.money(fix)]);
      }
      var carGone = false;
      if (pinkLost && G.loseCar(inst)) { carGone = true; damaged = null; news.push('PINK SLIP: your ' + DR.CARS[inst.carId].name + ' goes home with ' + opp.label); }
      G.save();

      var head = them ? (win ? 'YOU WIN!' : 'YOU LOSE') : (you.sim.finished ? 'RUN COMPLETE' : 'DNF');
      var tbl = h('table');
      tbl.appendChild(h('tr', {}, h('th', {}, ''), h('th', {}, 'YOU'), them ? h('th', {}, opp.label) : null));
      function row(label, f) { tbl.appendChild(h('tr', {}, h('td', {}, label), h('td', {}, f(me)), them ? h('td', {}, f(them)) : null)); }
      if (bk) row('Dial-in', function (x) { return (x === me ? bk.dial[0] : bk.dial[1]).toFixed(2); });
      row('Reaction', function (x) { return x.red ? 'RED' : x.rt == null ? '-' : x.rt.toFixed(3); });
      DR.SPLITS.forEach(function (sp) {
        if (sp[1] > cfg.dist + 0.01) return;
        row(sp[0] + (sp[0] === '1/8' || sp[0] === '1/4' ? ' ET' : ''), function (x) { var s = x.sim.splits[sp[0]]; return s ? s.t.toFixed(3) : '-'; });
        if (sp[0] === '1/8' || sp[0] === '1/4') row(sp[0] + ' speed', function (x) { var s = x.sim.splits[sp[0]]; return s ? UI.speed(s.mph) : '-'; });
      });
      row('RT + ET', function (x) { return x.sim.crashed ? 'CRASHED' : x.sim.blown ? 'BLOWN' : x.sim.broke ? 'BROKE' : x.red ? 'RED LIGHT' : x.total < Infinity ? x.total.toFixed(3) : 'DNF'; });

      var back = cfg.back === 'tune' ? UI.Tune : null;
      var slip = h('div', { class: 'slip' }, h('div', { class: 'panel row' },
        h('div', { class: 'grow paper' },
          h('div', { class: 'phead' }, h('div', { class: 'ptrack' }, cfg.theme === 'street' ? 'BACKSTREET 1/8' : 'PIXEL DRAGWAY'),
            h('div', {}, (cfg.dist > DR.EIGHTH + 1 ? '1/4 MILE' : '1/8 MILE') + ' • ' + (them ? 'ELIMINATOR' : 'TEST & TUNE') + ' • RUN #' + (G.state.stats.races || 1)),
            cfg.cond ? h('div', {}, DR.condLabel(cfg.cond).toUpperCase()) : null),
          tbl,
          h('div', { class: 'pfoot2' }, '* THANKS FOR RACING *'),
          win != null ? h('div', { class: 'stamp ' + (win ? 'w' : 'l') }, win ? 'WIN' : 'LOSS') : null),
        h('div', { class: 'col slipside', style: { width: '38%', minWidth: '210px' } },
        h('div', { class: 'pix big ' + (win === false ? 'bad' : 'good'), style: { textAlign: 'center' } }, head),
        margin ? h('div', { class: 'margin' }, margin) : null,
        news.map(function (n) { return h('div', { class: 'slipnews' }, n); }),
        money.length ? h('div', { class: 'slipmoney' },
          h('div', { class: 'pix total ' + (moneyDelta >= 0 ? 'good' : 'bad') }, (moneyDelta > 0 ? '+' : '') + DR.money(moneyDelta)),
          money.length > 1 ? money.map(function (m) { return h('div', { class: 'mrow' }, h('span', {}, m[0]), h('span', { class: m[1] < 0 ? 'bad' : '' }, (m[1] > 0 ? '+' : '') + DR.money(m[1]))); }) : null) : null,
        unlockBox(unlocks),
        !testDrive && !carGone ? (function () { var wb = UI.wearBox(inst, function () { wb.parentNode.replaceChild(UI.wearBox(inst), wb); }); return wb; })() : null,
        notes.length ? h('div', { class: 'slipnote' }, notes.map(function (n, i) { return h('span', { class: n[0] }, (i ? ' • ' : '') + n[1]); })) : null,
        pbLine ? h('div', { class: 'slipnote dim' }, pbLine) : null,
        testDrive ? h('div', { class: 'col' },
          btn('Back to Dealer', function () { UI.show(UI.Dealer); }, 'primary'),
          btn('Run Again', function () { DR.Race.start(cfg); })) :
        // the main action on top, the rest two to a row
        carGone ? h('div', { class: 'col slipbtns' }, btn('Garage', function () { UI.show(UI.Garage); }, 'primary')) : h('div', { class: 'col slipbtns' },
          !damaged && nextRound != null ? btn('Next Round', function () { if (bk) DR.Race.raceDay(DR.Race.eventCfg(ev, nextRound)); else DR.Race.careerEvent(ev, nextRound); }, 'primary') : null,
          !damaged && nextRound == null ? btn(them ? (cfg.mode === 'street' ? 'Back to Street' : 'Back to Career') : 'Run Again', function () {
            if (them) UI.show(UI.RaceMenu, UI.raceTab === 'map' ? 'map' : cfg.mode === 'street' ? 'street' : 'career');
            else DR.Race.start(cfg);
          }, 'primary') : null,
          // broke something: fix it and go again from here
          damaged ? (function () {
            var fix = G.repairCost(inst), career = them && cfg.mode === 'career';
            if (!G.canAfford(fix)) return btn('Garage (repair ' + DR.money(fix) + ')', function () { UI.show(UI.Garage); }, 'primary');
            return btn('Repair ' + DR.money(fix) + (career ? ' & Race Again' : ''), function () {
              if (!G.repair(inst)) return UI.toast('Not enough money');
              A.cash();
              if (career) DR.Race.careerEvent(ev, nextRound != null ? nextRound : 0);
              else if (cfg.mode === 'street') UI.show(UI.RaceMenu, UI.raceTab === 'map' ? 'map' : 'street');
              else DR.Race.start(cfg);
            }, 'primary');
          })() : null,
          damaged ? btn('Garage', function () { UI.show(UI.Garage); }) : null,
          h('div', { class: 'btngrid' },
            !damaged && them && cfg.mode === 'career' && !win ? btn(DR.multiRound(ev) ? 'Retry KO' : 'Rematch', function () { DR.Race.raceDay(DR.Race.eventCfg(ev, 0)); }, 'red') : null,
            !damaged && them && cfg.mode === 'career' && win && nextRound == null ? btn('Again ' + DR.money(G.eventReward(ev)), function () { DR.Race.careerEvent(ev, 0); }) : null,
            back && !damaged ? btn('Back to Tuning', function () { UI.show(back); }) : null,
            damaged ? null : btn('Garage', function () { UI.show(UI.Garage); }),
            btn('Tune', function () { UI.show(UI.Tune); }))))));
      // peek: slide the slip down to watch the cars coast through the shutdown
      var peekBtn = btn('▼ Watch', function () { var on = slip.classList.toggle('peek'); peekBtn.textContent = on ? '▲ Slip' : '▼ Watch'; }, 'small peekbtn');
      slip.firstChild.appendChild(peekBtn);
      if (win) A.cash();
      root.appendChild(slip);
      controls.style.display = 'none';
      slipEl = slip;
      root._back = testDrive ? function () { UI.show(UI.Dealer); } : function () { UI.show(UI.RaceMenu, cfg.mode === 'test' ? 'test' : UI.raceTab === 'map' ? 'map' : cfg.mode === 'street' ? 'street' : 'career'); };
    }

    // unlocks as chips under three small headings, with "+N more" past a few
    function unlockBox(list) {
      if (!list || !list.length) return null;
      var by = { parts: [], body: [], car: [] };
      list.forEach(function (u) { var c = DR.unlockChip(u); by[c.kind].push(c.text); });
      var rows = [['parts', 'Parts'], ['body', 'Body shop'], ['car', 'New cars']].filter(function (k) { return by[k[0]].length; }).map(function (k) {
        var items = by[k[0]], shown = items.slice(0, 3);
        return h('div', { class: 'urow' }, h('span', { class: 'uhead' }, k[1]),
          shown.map(function (t) { return h('span', { class: 'chip c-' + k[0] }, t); }),
          items.length > 3 ? h('span', { class: 'chip more' }, '+' + (items.length - 3) + ' more') : null);
      });
      return h('div', { class: 'slipunl' }, h('div', { class: 'uttl' }, 'UNLOCKED'), rows);
    }
    function quit() {
      if (you.sim.launched && cfg.mode === 'street' && !resultShown) {
        UI.confirm('Leaving now forfeits your ' + DR.money(cfg.bet) + ' bet. Quit?', function () { G.earn(-cfg.bet); G.state.stats.races++; G.save(); UI.show(UI.RaceMenu, UI.raceTab === 'map' ? 'map' : 'street'); });
      } else if (testDrive) UI.show(UI.Dealer);
      else UI.show(UI.RaceMenu, cfg.mode === 'test' ? 'test' : UI.raceTab === 'map' ? 'map' : cfg.mode === 'street' ? 'street' : 'career');
    }

    return root;
  }
})();
