// ===========================================================================
// RACE — burnout, staging, the tree, the run itself, HUD and the timeslip.
// cfg = {mode:'career'|'street'|'test', opp, ev, round, dist, theme, grip,
//        reward, bet, back}
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, A = DR.Audio, UI = DR.UI, h = UI.h, btn = UI.btn;
  var DT = 1 / 600;
  var DASH_W = 200, DASH_H = 74;
  var BOX_X = -16;           // where cars sit for the burnout (m)

  DR.Race = {
    // cfg.inst: race a car you don't own (dealer test drive)
    start: function (cfg) {
      var inst = cfg.inst || G.car();
      if (inst.damage) { UI.toast('Repair your car first!'); return; }
      UI.show(RaceScreen, cfg);
    },
    // A career event (round: knockout round, 0-based).
    careerEvent: function (ev, round) {
      var T = DR.EVENT_TYPES[ev.type];
      round = round || 0;
      DR.Race.start({ mode: 'career', ev: ev, round: round, opp: ev.opps[round], dist: T.dist(), theme: T.theme, grip: T.grip, reward: G.eventReward(ev) });
    }
  };

  // ---------------------------------------------------------------- dash
  // Pixel instrument cluster: shift lights over a tach dial with the gear in
  // its middle, tire temp & boost bars on the left, speed and dash lights on
  // the right. Drawn at 200x74 and scaled up crisp by CSS.
  function px(c, x, y, w, hh, col) { c.fillStyle = col; c.fillRect(x, y, w, hh); }
  function drawDash(c, sim, Sx, phase) {
    var W = DASH_W, H = DASH_H, txt = DR.pixText;
    c.clearRect(0, 0, W, H);
    // panel: stepped corners, bevelled edge, carbon weave
    px(c, 3, 0, W - 6, H, '#0b0c10'); px(c, 0, 3, W, H - 3, '#0b0c10'); px(c, 1, 1, W - 2, H - 1, '#0b0c10');
    px(c, 4, 1, W - 8, H - 2, '#16181f'); px(c, 1, 4, W - 2, H - 5, '#16181f'); px(c, 2, 2, W - 4, H - 3, '#16181f');
    for (var yy = 4; yy < H - 2; yy += 2) for (var xx = 4 + (yy % 4 ? 1 : 0); xx < W - 4; xx += 4) px(c, xx, yy, 1, 1, '#1d2029');
    px(c, 4, 1, W - 8, 1, '#3a3e4c'); px(c, 1, 4, 1, H - 6, '#2c303b');
    // ---- tach
    var cx = 100, cy = 63, R = 43, rpm = sim.rpm(), top = Math.ceil((Sx.red + 600) / 1000) * 1000;
    var a0 = Math.PI, a1 = 0;
    function ang(r) { return a0 + (a1 - a0) * Math.min(1, Math.max(0, r / top)); }
    for (var rr = R; rr >= 0; rr--) { var w2 = Math.round(Math.sqrt(R * R - rr * rr)); px(c, cx - w2, cy - rr, w2 * 2, 1, rr > R - 2 ? '#2e3240' : '#07080b'); }
    // red zone
    for (var r2 = Sx.red; r2 <= top; r2 += 25) { var t = ang(r2); for (var d = R - 5; d <= R - 2; d++) px(c, Math.round(cx + Math.cos(t) * d), Math.round(cy - Math.sin(t) * d), 1, 1, '#c8202a'); }
    // ticks & numbers
    for (var k = 0; k <= top; k += 500) {
      var ta = ang(k), major = k % 1000 === 0, len = major ? 5 : 2;
      for (var q = 0; q < len; q++) px(c, Math.round(cx + Math.cos(ta) * (R - 3 - q)), Math.round(cy - Math.sin(ta) * (R - 3 - q)), 1, 1, k >= Sx.red ? '#ff6a6a' : '#cfd3dc');
      if (major && top <= 12000) { var nx = Math.round(cx + Math.cos(ta) * (R - 13)) - 1, ny = Math.round(cy - Math.sin(ta) * (R - 13)) - 2; txt(c, String(k / 1000), nx, ny, '#7d8291', 1); }
    }
    // needle
    var na = ang(rpm), ncol = rpm >= Sx.red ? '#ff4040' : '#ff8a2a';
    for (var n = 4; n < R - 4; n++) px(c, Math.round(cx + Math.cos(na) * n), Math.round(cy - Math.sin(na) * n), n < R - 12 ? 2 : 1, n < R - 12 ? 2 : 1, ncol);
    px(c, cx - 3, cy - 3, 6, 6, '#3a3e4c'); px(c, cx - 2, cy - 2, 4, 4, '#9aa0ad');
    txt(c, 'X1000', cx - 9, cy - 20, '#4a4f5c', 1);
    // ---- gear window (left)
    var gtxt = sim.launched || phase === 'tree' || phase === 'race' || sim.burnMode ? String(sim.gear + 1) : 'N';
    px(c, 7, 11, 26, 33, '#050608'); px(c, 8, 12, 24, 31, '#1a1408');
    txt(c, '8', 13, 15, '#2a2010', 5);
    txt(c, gtxt, 13, 15, '#ffd23d', 5);
    txt(c, 'GEAR', 12, 47, '#7d8291', 1);
    // ---- shift lights: green, yellow, red, then all blue at the shift point
    var shiftAt = Sx.tune.shiftRpm, lo = shiftAt - 1800, nL = 9, flash = sim.launched && !sim.finished && rpm >= shiftAt - 50 && sim.gear < Sx.ratios.length - 1;
    for (var l = 0; l < nL; l++) {
      var lx = cx - 30 + l * 7, on = rpm >= lo + (shiftAt - lo) * l / (nL - 1);
      var col = l < 4 ? '#2bd45a' : l < 7 ? '#ffd000' : '#ff3030';
      if (flash) { col = (Math.floor(performance.now() / 70) % 2) ? '#4f8dff' : '#0b0c10'; on = true; }
      px(c, lx, 3, 5, 4, '#050608'); px(c, lx + 1, 4, 3, 2, on ? col : '#23262e');
      if (on && !flash) px(c, lx + 1, 4, 1, 1, '#ffffff');
    }
    // ---- left: tire temp & boost bars
    var T = sim.tireT, tt = Sx.tire, tmax = Math.max(130, tt.topt + 50), bh = 44, by = 11;
    function vbar(x, frac, col, zone) {
      px(c, x - 1, by - 1, 7, bh + 2, '#050608'); px(c, x, by, 5, bh, '#101218');
      if (zone) px(c, x, by + bh - Math.round(zone[1] * bh), 5, Math.max(1, Math.round((zone[1] - zone[0]) * bh)), '#173a24');
      var fh = Math.round(Math.min(1, Math.max(0, frac)) * bh);
      for (var s2 = 0; s2 < fh; s2 += 2) px(c, x + 1, by + bh - s2 - 1, 3, 1, col);
    }
    var tcol = T < tt.topt - 10 ? '#4da3ff' : T > tt.topt + 30 ? '#ff4d4d' : '#46e07a';
    vbar(39, T / tmax, tcol, [(tt.topt - 10) / tmax, (tt.topt + 30) / tmax]);
    txt(c, 'T', 40, 58, '#7d8291', 1);
    if (Sx.fiType !== 'none') {
      vbar(48, sim.boost / Math.max(Sx.maxBoost, 5), '#ffcc33');
      txt(c, 'B', 49, 58, '#7d8291', 1);
    }
    txt(c, String(Math.round(T)) + (Sx.fiType !== 'none' ? ' ' + sim.boost.toFixed(0) : ''), 8, 64, '#5d6271', 1);
    // ---- right: speed and dash lights
    var mph = sim.v * 2.23694, km = G.state.settings.units === 'kmh', sp = String(Math.round(km ? mph * 1.609 : mph));
    while (sp.length < 3) sp = ' ' + sp;
    px(c, 150, 13, 44, 20, '#050608'); px(c, 151, 14, 42, 18, '#0f1a12');
    txt(c, '888', 152, 16, '#16281a', 3);
    txt(c, sp, 152, 16, '#7dff8a', 3);
    txt(c, km ? 'KM/H' : 'MPH', 180 - (km ? 4 : 0), 36, '#4a4f5c', 1);
    var lamps = [
      ['LOCK', sim.burnMode, '#ffcc00'],
      ['TB', Sx.trType === 'auto' && Sx.tbrake && !sim.launched && phase !== 'pre' && phase !== 'burnout', '#ffcc00'],
      ['2STP', Sx.twostep && !sim.launched && sim.cut, '#ff8a2a'],
      ['NOS', sim.nosOn, '#c89bff'],
      ['TC', sim.tcCut > 0.2, '#ff8a2a'],
      ['BRK', sim.brakeLimited, '#ff4040']];
    lamps.forEach(function (lp, i) {
      var lx2 = 150 + (i % 3) * 15, ly = 46 + Math.floor(i / 3) * 10;
      px(c, lx2, ly, 14, 8, '#050608'); px(c, lx2 + 1, ly + 1, 12, 6, lp[1] ? lp[2] : '#1a1c23');
      txt(c, lp[0].slice(0, 3), lx2 + 1, ly + 2, lp[1] ? '#0b0c10' : '#383c47', 1);
    });
  }

  function rollFailure(S) {
    var r = S.risk, est = DR.simulate(S, {}).et;
    var span = Math.max(1.5, Math.min(est, 12) * 0.8);
    if (Math.random() < r.engine) return { failAt: 0.6 + Math.random() * span, failType: 'engine' };
    if (Math.random() < r.trans) return { failAt: 0.4 + Math.random() * span, failType: 'trans' };
    return {};
  }

  function RaceScreen(cfg) {
    var settings = G.state.settings, testDrive = !!cfg.inst;
    var inst = cfg.inst || G.car(), S = G.spec(inst);
    var fail = rollFailure(S);
    var you = makeRacer(inst, S, 0, cfg, fail, 'YOU');
    var opp = null, ai = null;
    if (cfg.opp) {
      var oi = G.oppInst(cfg.opp), OS = DR.buildSpec(oi);
      opp = makeRacer(oi, OS, 1, cfg, {}, cfg.opp.name.toUpperCase());
      ai = new DR.AIDriver(cfg.opp.skill);
      opp.burnTarget = OS.tire.topt + (Math.random() - 0.5) * 12;
    }
    var racers = opp ? [you, opp] : [you];
    var scene = new DR.Scene(cfg.theme, cfg.dist);
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

    var gasFill = h('div', { class: 'fill', style: { height: '0%' } });
    var gasBtn = h('div', { class: 'pad gas' }, gasFill, h('span', { class: 'plab' }, 'GAS'));
    var actLabel = h('span', { class: 'plab' }, 'STAGE');
    var actBtn = h('div', { class: 'pad act go' }, actLabel);
    var nosBtn = h('div', { class: 'pad nos', style: { display: S.nosW && !S.prog ? 'flex' : 'none' } }, h('span', { class: 'plab' }, 'NOS'));
    var burnBtn = btn('Burnout', function () { startBurnout(); }, 'primary');
    var stageBar = h('div', { class: 'stagebar' }, burnBtn);
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
    actBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); A.init(); A.resume(); input.act = true; actBtn.classList.add('on'); });
    actBtn.addEventListener('pointerup', function () { actBtn.classList.remove('on'); });
    nosBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); input.nos = !input.nos; nosBtn.classList.toggle('on', input.nos); });
    function key(e, down) {
      if (e.repeat) return;
      var k = e.key;
      // on the timeslip: Enter / Space press its main button
      if (slipEl) { if (down && (k === 'Enter' || k === ' ')) { var pb = slipEl.querySelector('.btn.primary'); if (pb) { e.preventDefault(); pb.click(); } } return; }
      if (k === 'ArrowUp' || k === 'w' || k === 'W') { input.gasHeld = down; input.gas = down ? 1 : 0; e.preventDefault(); }
      else if (down && (k === ' ' || k === 'ArrowRight' || k === 'Enter')) { input.act = true; e.preventDefault(); }
      else if (down && (k === 'n' || k === 'N')) { input.nos = !input.nos; nosBtn.classList.toggle('on', input.nos); }
      else if (down && (k === 'b' || k === 'B') && phase === 'pre') startBurnout();
    }
    var kd = function (e) { key(e, true); }, ku = function (e) { key(e, false); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

    // ---------------------------------------------------------------- state
    var phase = 'pre', phaseT = 0, clock = 0;
    var tree = { stage: false, pre: [false, false], staged: [false, false], amber: 0, green: false, red: [false, false] };
    var treeStart = 0, greenAt = null, redLight = false, oppRed = false;
    var resultShown = false, slipEl = null;
    var voices = [];
    var flash = { text: '', t: 0 };

    function setMsg(m, sub) { msgEl.textContent = m || ''; subEl.textContent = sub || ''; }
    var estLine = '';
    if (testDrive) estLine = 'TEST DRIVE • ';
    var vsLine = opp ? 'VS ' + opp.label : 'TEST & TUNE';
    infoEl.innerHTML = '';
    setMsg(vsLine, opp ? (cfg.mode === 'street' ? 'Bet: ' + DR.money(cfg.bet) + ' • ' : cfg.mode === 'career' ? DR.EVENT_TYPES[cfg.ev.type].name + (cfg.ev.type === 'knockout' ? ' round ' + (cfg.round + 1) + '/' + cfg.ev.opps.length : '') + ' • Prize: ' + DR.money(cfg.reward) + ' • ' : '') + 'Burnout to heat the tires, or Stage to race.' : 'Burnout to heat the tires, or Stage to race.');
    if (estLine) subEl.textContent = estLine + subEl.textContent;

    function startBurnout() {
      if (phase !== 'pre') return;
      phase = 'burnout'; phaseT = 0;
      stageBar.innerHTML = '';
      var lineLock = you.sim.burnout(true);
      setMsg('', lineLock ? 'HOLD GAS to spin the tires. Watch the temp meter, then hit STAGE.'
        : 'AWD: all four wheels are on the brakes. HOLD GAS to scrub some heat in, then hit STAGE.');
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

    function makeRacer(inst, S, lane, cfg, fail, label) {
      var sim = new DR.Sim(S, { grip: cfg.grip, dist: cfg.dist, tireT: 30, failAt: fail.failAt, failType: fail.failType });
      return { inst: inst, S: S, sim: sim, lane: lane, label: label, spr: DR.carSprite(DR.carLook(inst)), off: BOX_X, wheelAng: 0, burn: 0, voice: null, burnT: 0,
        box: 'box', rollT: 0, waitT: 0.6 + Math.random() * 1.2 };
    }

    function ensureVoices() {
      if (voices.length || !A.ctx || A.wkPending) return;
      you.voice = A.engine(S.eng, 1, A.buildOf(S));
      if (opp) opp.voice = A.engine(opp.S.eng, 0.45, A.buildOf(opp.S));
      voices = [you.voice, opp && opp.voice];
    }

    // ---------------------------------------------------------------- loop
    var last = performance.now(), raf = 0, acc = 0;
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      ensureVoices();
      update(dt);
      draw(dt);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    UI.cleanup = function () {
      cancelAnimationFrame(raf); A.stopAll();
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
    };

    function playerThrottle() { return input.gasHeld ? input.gas : 0; }

    function update(dt) {
      phaseT += dt;
      var act = input.act; input.act = false;
      if (phase === 'pre' || phase === 'burnout' || phase === 'stage') {
        if (act && phase !== 'stage') startStaging();
        var thr = playerThrottle();
        stepSim(you, dt, thr, true);
        if (phase === 'burnout') {
          if (you.sim.burnMode) you.burn = burnAmt(you);
          else { you.sim.tireT += DR.clamp(S.peakHp / 250, 0.7, 2.6) * 8 * thr * 0.6 * dt; you.burn = thr * 0.5; }
          // tires in the window and off the gas: roll up to the line on its own
          var tt = S.tire.topt;
          you.offGas = thr > 0.05 ? 0 : (you.offGas || 0) + dt;
          if (settings.autoStage !== false && you.sim.tireT >= tt - 8 && you.sim.tireT <= tt + 30 && you.offGas > 0.5 && phaseT > 1) startStaging(true);
          else if (you.sim.tireT >= tt - 8 && thr > 0.05) setMsg('', you.sim.tireT > tt + 25 ? 'Too hot! Let off the gas.' : settings.autoStage !== false ? 'Tires are in the window. Let off the gas to pull up.' : 'Tires are in the window. Hit STAGE.');
        }
        stepRoll(you, dt);
        oppBox(dt);
        if (phase === 'stage' && you.box === 'staged') {
          if (!opp || opp.box === 'staged') { phase = 'tree'; phaseT = 0; tree.stage = true; treeStart = 0.8 + Math.random() * 1.0; setMsg('', ''); }
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
          if (settings.proTree) { if (t >= 0) tree.amber = 3; if (t >= 0.4 && greenAt === null) goGreen(); }
          else { tree.amber = t >= 1.0 ? 3 : t >= 0.5 ? 2 : t >= 0 ? 1 : 0; if (t >= 1.5 && greenAt === null) goGreen(); }
          if (tree.amber && t < 0.05 && t >= 0) { /* amber beep */ }
        }
        var tG = greenAt === null || !opp ? -1 : opp.sim.time - opp.greenT;
        // player
        if (act && !you.sim.launched) {
          if (greenAt === null) { redLight = true; tree.red[0] = true; A.beep(220, 0.4); }
          you.sim.launch(); act = false;
          actLabel.textContent = 'SHIFT'; actBtn.classList.add('shift');
          phase = 'race';
        } else if (act && you.sim.launched) {
          you.sim.shiftUp();
          act = false;
        }
        // auto-shift (setting); never in the first moments of the launch
        if (settings.autoShift && you.sim.launched && you.sim.t > 0.6 && !you.sim.shifting && you.sim.sinceShift > 0.25) {
          var Sy = you.S, line = you.sim.ww * Sy.ratios[you.sim.gear] * Sy.fd * 30 / Math.PI;
          var trig = Sy.trType === 'auto' ? Math.max(line / 0.95, you.sim.rpm() >= Sy.limit - 60 ? you.sim.rpm() : 0) : you.sim.locked ? you.sim.rpm() : line;
          if (trig >= Sy.tune.shiftRpm) you.sim.shiftUp();
        }
        you.sim.step(sdt, { throttle: playerThrottle(), nos: input.nos });
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

    function goGreen() {
      greenAt = clock; tree.green = true; A.beep(1320, 0.15);
      racers.forEach(function (r) { r.greenT = r.sim.time; });
      if (!redLight) setMsg('', '');
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
      var st = { nos: r.sim.nosOn, cut: r.sim.cut || seqShift, tire: r.S.tire.kind, gearWhine: r.S.trType === 'seq' };
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
      DR.drawCar(ctx, spr, gx, gy, pitch, r.wheelAng, { barRad: r.S.barRad, brake: sim.brake, chute: Math.max(0, sim.chute || 0), t: clock, spin: spin, frontStill: sim.burnMode,
        susp: { z: (sim.z || 0) * SUSP_VIS, phi: (sim.phi || 0) * SUSP_VIS } });
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
        if (n) parts.smoke(rearX, 0.12, sim.v, Math.min(6, n), { lane: r.lane, slip: slipV, dense: 0.55 + 0.35 * heavy });
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
          if (e === 'bar' && isYou) note('WHEELIE BARS!');
          if (e === 'crash') { if (isYou) { A.boom(); note('YOU FLIPPED IT!'); } else note(r.label + ' FLIPPED!'); }
          if (e === 'blown') { A.boom(); if (isYou) note('ENGINE BLEW UP!'); else note(r.label + ' BLEW UP!'); }
          if (e === 'broke') { if (isYou) note('TRANSMISSION BROKE!'); else note(r.label + ' BROKE!'); }
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
      gasFill.style.height = (input.gasHeld ? input.gas * 100 : 0) + '%';
      if (phase === 'tree' && greenAt === null && !redLight) setMsg('', tree.amber ? '' : 'Hold GAS to rev. Tap LAUNCH on green.');
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
      var win = null;
      if (them) {
        if (me.red && !them.red) win = false;
        else if (them.red && !me.red) win = true;
        else win = me.total < them.total;
      }
      var lines = [], moneyDelta = 0, firstWin = false;
      var damaged = you.sim.blown ? { engine: true } : you.sim.broke ? { trans: true } : null;
      var ev = cfg.ev, nextRound = null;
      if (cfg.mode === 'career' && win) {
        if (ev.type === 'knockout' && cfg.round < ev.opps.length - 1) {
          nextRound = cfg.round + 1;
          lines.push('ROUND ' + (cfg.round + 1) + ' OF ' + ev.opps.length + ' WON! Next up: ' + ev.opps[nextRound].name);
        } else {
          var res = G.winEvent(ev);
          moneyDelta = res.cash; firstWin = res.first;
          lines = lines.concat(res.lines);
        }
      }
      if (cfg.mode === 'career' && win === false && ev.type === 'knockout') lines.push('KNOCKED OUT in round ' + (cfg.round + 1) + '. Start over from round 1.');
      if (cfg.mode === 'street') moneyDelta = win ? cfg.bet : -cfg.bet;
      if (moneyDelta) G.earn(moneyDelta);
      if (them && !testDrive) { G.state.stats.races++; if (win) G.state.stats.wins++; }
      // personal bests
      var key = cfg.dist > 300 ? 'q' : 'e', prevBest = inst.best[key], pbLine = null;
      if (!testDrive && you.sim.finished && cfg.grip >= 1 && !redLight && (!inst.best[key] || you.sim.et < inst.best[key])) { inst.best[key] = you.sim.et; lines.push('NEW PERSONAL BEST!'); }
      else if (you.sim.finished && prevBest) pbLine = 'Your best ' + (key === 'q' ? '1/4' : '1/8') + ': ' + prevBest.toFixed(3) + ' (' + '+' + (you.sim.et - prevBest).toFixed(3) + ')';
      // how close it was
      var margin = null;
      if (them && me.total < Infinity && them.total < Infinity && !me.red && !them.red) margin = (win ? 'Won' : 'Lost') + ' by ' + Math.abs(them.total - me.total).toFixed(3) + 's';
      else if (them && win && them.total === Infinity && !them.red) margin = opp.label + (opp.sim.crashed ? ' crashed' : opp.sim.blown ? ' blew up' : opp.sim.broke ? ' broke' : ' did not finish');
      if (damaged && testDrive) { lines.push('Good thing it was a test drive.'); damaged = null; }
      if (damaged) {
        inst.damage = damaged;
        lines.push((damaged.engine ? 'Your engine is toast.' : 'Your transmission is broken.') + ' Repair cost: ' + DR.money(G.repairCost(inst)));
      }
      G.save();

      var head = them ? (win ? 'YOU WIN!' : 'YOU LOSE') : (you.sim.finished ? 'RUN COMPLETE' : 'DNF');
      var tbl = h('table');
      tbl.appendChild(h('tr', {}, h('th', {}, ''), h('th', {}, 'YOU'), them ? h('th', {}, opp.label) : null));
      function row(label, f) { tbl.appendChild(h('tr', {}, h('td', {}, label), h('td', {}, f(me)), them ? h('td', {}, f(them)) : null)); }
      row('Reaction', function (x) { return x.red ? 'RED' : x.rt == null ? '-' : x.rt.toFixed(3); });
      DR.SPLITS.forEach(function (sp) {
        if (sp[1] > cfg.dist + 0.01) return;
        row(sp[0] + (sp[0] === '1/8' || sp[0] === '1/4' ? ' ET' : ''), function (x) { var s = x.sim.splits[sp[0]]; return s ? s.t.toFixed(3) : '-'; });
        if (sp[0] === '1/8' || sp[0] === '1/4') row(sp[0] + ' speed', function (x) { var s = x.sim.splits[sp[0]]; return s ? UI.speed(s.mph) : '-'; });
      });
      row('Peak power', function (x) { return Math.round(x.sim.peakHp) + ' hp'; });
      row('RT + ET', function (x) { return x.sim.crashed ? 'CRASHED' : x.sim.blown ? 'BLOWN' : x.sim.broke ? 'BROKE' : x.red ? 'RED LIGHT' : x.total < Infinity ? x.total.toFixed(3) : 'DNF'; });

      var back = cfg.back === 'tune' ? UI.Tune : null;
      var slip = h('div', { class: 'slip' }, h('div', { class: 'panel row' },
        h('div', { class: 'grow' }, tbl),
        h('div', { class: 'col', style: { width: '38%', minWidth: '210px' } },
        h('div', { class: 'pix big ' + (win === false ? 'bad' : 'good'), style: { textAlign: 'center' } }, head),
        margin ? h('div', { class: 'margin' }, margin) : null,
        moneyDelta ? h('div', { class: 'pix ' + (moneyDelta > 0 ? 'good' : 'bad'), style: { textAlign: 'center' } }, (moneyDelta > 0 ? '+' : '') + DR.money(moneyDelta)) : null,
        pbLine ? h('div', { class: 'dim', style: { textAlign: 'center' } }, pbLine) : null,
        lines.map(function (l) { return h('div', { class: 'acc', style: { textAlign: 'center' } }, l); }),
        testDrive ? h('div', { class: 'col' },
          btn('Back to Dealer', function () { UI.show(UI.Dealer); }, 'primary'),
          btn('Run Again', function () { DR.Race.start(cfg); })) :
        h('div', { class: 'col' },
          btn('Garage', function () { UI.show(UI.Garage); }),
          btn('Tune', function () { UI.show(UI.Tune); }),
          !damaged && nextRound != null ? btn('Next Round', function () { DR.Race.careerEvent(ev, nextRound); }, 'primary') : null,
          !damaged && nextRound == null ? btn(them ? (cfg.mode === 'street' ? 'Back to Street' : 'Back to Career') : 'Run Again', function () {
            if (them) UI.show(UI.RaceMenu, cfg.mode === 'street' ? 'street' : 'career');
            else DR.Race.start(cfg);
          }, 'primary') : null,
          !damaged && them && cfg.mode === 'career' && !win ? btn(ev.type === 'knockout' ? 'Retry Knockout' : 'Rematch', function () { DR.Race.careerEvent(ev, 0); }, 'red') : null,
          !damaged && them && cfg.mode === 'career' && win && nextRound == null ? btn('Race Again (' + DR.money(G.eventReward(ev)) + ')', function () { DR.Race.careerEvent(ev, 0); }) : null,
          back && !damaged ? btn('Back to Tuning', function () { UI.show(back); }) : null))));
      // peek: slide the slip down to watch the cars coast through the shutdown
      var peekBtn = btn('▼ Watch', function () { var on = slip.classList.toggle('peek'); peekBtn.textContent = on ? '▲ Slip' : '▼ Watch'; }, 'small peekbtn');
      slip.firstChild.appendChild(peekBtn);
      if (win) A.cash();
      root.appendChild(slip);
      controls.style.display = 'none';
      slipEl = slip;
      root._back = testDrive ? function () { UI.show(UI.Dealer); } : function () { UI.show(UI.RaceMenu, cfg.mode === 'street' ? 'street' : cfg.mode === 'test' ? 'test' : 'career'); };
    }

    function quit() {
      if (you.sim.launched && cfg.mode === 'street' && !resultShown) {
        UI.confirm('Leaving now forfeits your ' + DR.money(cfg.bet) + ' bet. Quit?', function () { G.earn(-cfg.bet); G.state.stats.races++; G.save(); UI.show(UI.RaceMenu, 'street'); });
      } else if (testDrive) UI.show(UI.Dealer);
      else UI.show(UI.RaceMenu, cfg.mode === 'street' ? 'street' : cfg.mode === 'test' ? 'test' : 'career');
    }

    return root;
  }
})();
