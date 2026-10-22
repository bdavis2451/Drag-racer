// ===========================================================================
// RACE — burnout, staging, the tree, the run itself, HUD and the timeslip.
// cfg = {mode:'career'|'street'|'test', opp, tier, idx, dist, theme, grip,
//        reward, bet, back}
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, A = DR.Audio, UI = DR.UI, h = UI.h, btn = UI.btn;
  var DT = 1 / 600;
  var BOX_X = -16;           // where cars sit for the burnout (m)

  DR.Race = {
    start: function (cfg) {
      var inst = G.car();
      if (inst.damage) { UI.toast('Repair your car first!'); return; }
      UI.show(RaceScreen, cfg);
    }
  };

  function rollFailure(S) {
    var r = S.risk, est = DR.simulate(S, {}).et;
    var span = Math.max(1.5, Math.min(est, 12) * 0.8);
    if (Math.random() < r.engine) return { failAt: 0.6 + Math.random() * span, failType: 'engine' };
    if (Math.random() < r.trans) return { failAt: 0.4 + Math.random() * span, failType: 'trans' };
    return {};
  }

  function RaceScreen(cfg) {
    var settings = G.state.settings;
    var inst = G.car(), S = G.spec(inst);
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
    var ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
    var segs = []; var bar = h('div', { class: 'bar' });
    for (var i = 0; i < 24; i++) { var sg = h('i'); segs.push(sg); bar.appendChild(sg); }
    var gearEl = h('div', { class: 'gear' }, '1'), readEl = h('div', { class: 'read' });
    var shiftEl = h('div', { class: 'shiftlight' }, 'SHIFT');
    var msgEl = h('div', { class: 'msg' }), subEl = h('div', { class: 'sub' });
    var infoEl = h('div', { class: 'info' });
    var tempFill = h('b'), tempZone = h('s');
    var meter = h('div', { class: 'meter' }, h('div', { class: 'lbl' }, 'TIRE TEMP'), h('div', { class: 'm' }, tempZone, tempFill));
    var hud = h('div', { class: 'hud' }, h('div', { class: 'tach' }, gearEl, bar, readEl), shiftEl, infoEl, meter, msgEl, subEl);

    var gasFill = h('div', { class: 'fill', style: { height: '0%' } });
    var gasBtn = h('div', { class: 'pad gas' }, gasFill, h('span', {}, 'GAS'));
    var actLabel = h('span', {}, 'STAGE');
    var actBtn = h('div', { class: 'pad act go' }, actLabel);
    var nosBtn = h('div', { class: 'pad nos', style: { display: S.nosW && !S.prog ? 'flex' : 'none' } }, 'NOS');
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
      if (k === 'ArrowUp' || k === 'w' || k === 'W') { input.gasHeld = down; input.gas = down ? 1 : 0; e.preventDefault(); }
      else if (down && (k === ' ' || k === 'ArrowRight' || k === 'Enter')) { input.act = true; e.preventDefault(); }
      else if (down && (k === 'n' || k === 'N')) { input.nos = !input.nos; nosBtn.classList.toggle('on', input.nos); }
      else if (down && (k === 'b' || k === 'B') && phase === 'pre') startBurnout();
    }
    var kd = function (e) { key(e, true); }, ku = function (e) { key(e, false); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

    // ---------------------------------------------------------------- state
    var phase = 'pre', phaseT = 0, clock = 0;
    var tree = { stage: false, amber: 0, green: false, red: [false, false] };
    var treeStart = 0, greenAt = null, redLight = false, oppRed = false;
    var resultShown = false, doneT = 0;
    var voices = [];
    var flash = { text: '', t: 0 };

    function setMsg(m, sub) { msgEl.textContent = m || ''; subEl.textContent = sub || ''; }
    var vsLine = opp ? 'VS ' + opp.label : 'TEST & TUNE';
    infoEl.innerHTML = '';
    setMsg(vsLine, opp ? (cfg.mode === 'street' ? 'Bet: ' + DR.money(cfg.bet) + ' • ' : cfg.mode === 'career' ? 'Prize: ' + DR.money(cfg.reward) + ' • ' : '') + 'Burnout to heat the tires, or Stage to race.' : 'Burnout to heat the tires, or Stage to race.');

    function startBurnout() {
      if (phase !== 'pre') return;
      phase = 'burnout'; phaseT = 0;
      stageBar.innerHTML = '';
      var lineLock = you.sim.burnout(true);
      setMsg('', lineLock ? 'HOLD GAS to spin the tires. Watch the temp meter, then hit STAGE.'
        : 'AWD: all four wheels are on the brakes. HOLD GAS to scrub some heat in, then hit STAGE.');
    }
    function startStaging() {
      if (phase !== 'pre' && phase !== 'burnout') return;
      phase = 'roll'; phaseT = 0; stageBar.innerHTML = ''; setMsg('', '');
      you.sim.burnout(false); you.burn = 0;
      if (opp) { opp.sim.burnout(false); opp.burn = 0; opp.sim.tireT = Math.max(opp.sim.tireT, opp.burnTarget); }   // they did their burnout
      actLabel.textContent = 'LAUNCH'; actBtn.classList.remove('go');
    }

    function makeRacer(inst, S, lane, cfg, fail, label) {
      var sim = new DR.Sim(S, { grip: cfg.grip, dist: cfg.dist, tireT: 30, failAt: fail.failAt, failType: fail.failType });
      return { inst: inst, S: S, sim: sim, lane: lane, label: label, spr: DR.carSprite(DR.carLook(inst)), off: BOX_X, wheelAng: 0, burn: 0, voice: null, burnT: 0 };
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
      if (phase === 'pre') {
        if (act) startStaging();
        stepIdle(dt, playerThrottle());
      } else if (phase === 'burnout') {
        if (act) startStaging();
        var thr = playerThrottle();
        stepIdle(dt, thr);
        if (you.sim.burnMode) you.burn = burnAmt(you);
        else { you.sim.tireT += DR.clamp(S.peakHp / 250, 0.7, 2.6) * 8 * thr * 0.6 * dt; you.burn = thr * 0.5; }
        oppBurn(dt);
      } else if (phase === 'roll') {
        racers.forEach(function (r) { r.off = Math.min(0, BOX_X + (phaseT / 1.6) * -BOX_X); r.burn = 0; });
        var rollAng = dt * 6;
        racers.forEach(function (r) { r.wheelAng += rollAng; });
        stepIdle(dt, playerThrottle());
        if (phaseT >= 1.7) { racers.forEach(function (r) { r.off = 0; }); phase = 'tree'; phaseT = 0; tree.stage = true; treeStart = 0.8 + Math.random() * 1.4; A.beep(880, 0.06); }
      } else if (phase === 'tree' || phase === 'race') {
        runRace(dt, act);
      }
      // HUD flash timer
      if (flash.t > 0) { flash.t -= dt; if (flash.t <= 0 && (phase === 'race')) subEl.textContent = ''; }
    }

    function oppBurn(dt) {
      if (!opp) return;
      opp.burnT += dt;
      if (opp.sim.tireT < opp.burnTarget && opp.burnT < 6) {
        if (opp.sim.burnout(true)) { stepSim(opp, dt, opp.burnT < 0.4 ? opp.burnT / 0.4 : 0.85, true); opp.burn = burnAmt(opp); }
        else { opp.sim.tireT += DR.clamp(opp.S.peakHp / 250, 0.7, 2.6) * 8 * dt; opp.burn = 1; stepSim(opp, dt, 1, true); }
      } else { opp.sim.burnout(false); opp.burn = 0; stepSim(opp, dt, 0, true); }
    }
    // 0..1 how hard the drive tires are really spinning in the box
    function burnAmt(r) { return DR.clamp((r.sim.ww * r.S.r - 2) / 10, 0, 1); }

    function stepIdle(dt, thr) {
      stepSim(you, dt, thr, true);
      if (opp && phase !== 'burnout') stepSim(opp, dt, 0.0, true);
    }

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
          actLabel.textContent = 'SHIFT'; actBtn.classList.add('go');
          phase = 'race';
        } else if (act && you.sim.launched) { if (you.sim.shiftUp()) { act = false; } else act = false; }
        if (settings.autoShift && you.sim.launched && !you.sim.shifting && you.sim.sinceShift > 0.25) {
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
        you.sim.launch(); phase = 'race'; actLabel.textContent = 'SHIFT';
      }
      // finish conditions
      // show the timeslip once everyone has slowed down in the shutdown area
      var allDone = racers.every(function (r) {
        var s = r.sim;
        if (s.finished) return s.v < 9 || s.time - s.finishTime > 6;
        return s.crashed || s.blown || s.broke || (s.launched && s.t > 40);
      });
      var playerOut = you.sim.finished || you.sim.crashed || you.sim.blown || you.sim.broke;
      if (allDone || (playerOut && opp && opp.sim.launched && clock - greenAt > 25)) {
        doneT += dt;
        if (doneT > 0.6 && !resultShown) { resultShown = true; showResult(); }
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
      order.forEach(function (r) { lamps.push(drawRacer(r, camX, dt)); });
      parts.update(dt);
      parts.draw(ctx, camX, DR.LANE_Y);
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
      var pitch = sim.th + sim.phi * 1.6;
      // wheel rotation
      var spin = r.burn && !sim.burnMode ? 60 : sim.ww;
      r.wheelAng += spin * dt;
      if (sim.crashed) pitch = Math.min(1.6, (r.crashP = (r.crashP || sim.th) + dt * 2.5));
      DR.drawCar(ctx, spr, gx, gy, pitch, r.wheelAng, { barRad: r.S.barRad, brake: sim.brake, chute: Math.max(0, sim.chute || 0), t: clock, spin: spin, frontStill: sim.burnMode });
      var lamp = DR.carLamps(spr, gx, gy, pitch);
      lamp.brake = sim.brake > 0.05; lamp.ground = gy;
      // smoke from the drive tires
      var rearX = frontX - (spr.padL + spr.lenPx - spr.wheelR.x) / DR.PPM;
      var smoky = r.burn > 0.3 || (sim.launched && !sim.finished && sim.slip > r.S.tslip * 2 && sim.v < 70);
      if (smoky && Math.random() < 0.9) {
        var amt = r.burn ? 3 : Math.min(3, Math.ceil(sim.slip * 2));
        parts.smoke(rearX, 0.15, sim.v, amt);
        parts.list.slice(-amt).forEach(function (p) { p.lane = r.lane; });
      }
      if (sim.nosOn || (sim.cut && !sim.launched && r.S.twostep && Math.random() < 0.15)) {
        var ex = rearX - (spr.wheelR.x - spr.padL) / DR.PPM;
        parts.flame(ex, 0.35 + sim.th * 1.5, sim.nosOn);
        parts.list.slice(-4).forEach(function (p) { p.lane = r.lane; });
      }
      if ((sim.blown || sim.broke) && Math.random() < 0.6) {
        parts.smoke(frontX - 1, 0.8, sim.v, 2);
        parts.list.slice(-2).forEach(function (p) { p.lane = r.lane; });
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

    var lastGear = -1;
    function drawHud() {
      var sim = you.sim, Sx = you.S, rpm = sim.rpm();
      var top = Sx.red + 300, lit = Math.round(rpm / top * 24);
      var shiftOn = sim.launched && !sim.finished && rpm >= Sx.tune.shiftRpm - 50 && sim.gear < Sx.ratios.length - 1;
      var lz = (!sim.launched) ? Math.round((Sx.twostep ? Sx.tune.launchRpm : Sx.tune.launchRpm) / top * 24) : -9;
      for (var i = 0; i < 24; i++) {
        var on = i < lit, frac = i / 24 * top;
        var c = !on ? '' : shiftOn ? 'z' : frac > Sx.red ? 'r' : frac > Sx.red * 0.8 ? 'y' : 'g';
        segs[i].className = c;
        segs[i].style.outline = (!sim.launched && Math.abs(i - lz) <= 1) ? '2px solid #fff' : '';
      }
      shiftEl.className = 'shiftlight' + (shiftOn ? ' on' : '');
      if (sim.gear !== lastGear) { gearEl.textContent = String(sim.gear + 1); lastGear = sim.gear; }
      var mph = sim.v * 2.23694;
      readEl.innerHTML = UI.speed(mph) + '<br>' + Math.round(rpm) + ' RPM' + (Sx.fiType !== 'none' ? '<br>' + sim.boost.toFixed(1) + ' PSI' : '');
      // info top-left
      var lines = [];
      if (opp) lines.push(vsLine);
      if (greenAt !== null) {
        var el = sim.finished ? sim.et : sim.etStart !== null ? sim.time - sim.etStart : 0;
        lines.push('ET ' + el.toFixed(2));
        if (redLight) lines.push('<span class="warn">RED LIGHT!</span>');
      }
      if (sim.launched && sim.slip > Sx.tslip * 2.2 && !sim.finished && sim.v > 0.5) lines.push('<span class="warn">WHEELSPIN!</span>');
      if (sim.wheelie && sim.th > 0.05) lines.push('<span class="acc">WHEELIE ' + Math.round(sim.th * 57.3) + '°</span>');
      if (sim.nosOn) lines.push('<span style="color:#c89bff">NITROUS!</span>');
      if (sim.burnMode) lines.push('<span class="acc">LINE LOCK</span>');
      else if (!sim.launched && Sx.trType === 'auto') lines.push(Sx.tbrake ? '<span class="acc">TRANSBRAKE ON</span>' : sim.brakeLimited ? '<span class="warn">BRAKES AT LIMIT</span>' : '<span class="dim">FOOT BRAKE</span>');
      if (sim.tcCut > 0.2) lines.push('<span class="dim">TRACTION CTRL</span>');
      infoEl.innerHTML = lines.join('<br>');
      // tire temperature meter until the launch
      if (!sim.launched || phase !== 'race') {
        meter.style.display = '';
        var T = sim.tireT, t = Sx.tire, max = Math.max(130, t.topt + 50);
        tempFill.style.width = DR.clamp(T / max * 100, 0, 100) + '%';
        tempFill.style.background = T < t.topt - 10 ? '#4da3ff' : T > t.topt + 30 ? '#ff4d4d' : '#46e07a';
        tempZone.style.left = ((t.topt - 10) / max * 100) + '%'; tempZone.style.width = (40 / max * 100) + '%';
      } else meter.style.display = 'none';
      gasBtn.classList.toggle('on', input.gasHeld);
      gasFill.style.height = (input.gasHeld ? input.gas * 100 : 0) + '%';
      if (phase === 'tree' && greenAt === null && !redLight) setMsg('', tree.amber ? '' : 'Hold GAS to rev... tap LAUNCH on GREEN!');
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
      if (cfg.mode === 'career' && win) {
        moneyDelta = cfg.reward; firstWin = G.beat(cfg.tier, cfg.idx);
        if (firstWin && cfg.idx === 4) lines.push('TIER CLEARED! ' + (DR.CAREER[cfg.tier + 1] ? 'Next up: ' + DR.CAREER[cfg.tier + 1].name : 'You are the KING of the strip!'));
      }
      if (cfg.mode === 'street') moneyDelta = win ? cfg.bet : -cfg.bet;
      if (moneyDelta) G.earn(moneyDelta);
      if (them) { G.state.stats.races++; if (win) G.state.stats.wins++; }
      // personal bests
      var key = cfg.dist > 300 ? 'q' : 'e';
      if (you.sim.finished && cfg.grip >= 1 && !redLight && (!inst.best[key] || you.sim.et < inst.best[key])) { inst.best[key] = you.sim.et; lines.push('NEW PERSONAL BEST!'); }
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
        moneyDelta ? h('div', { class: 'pix ' + (moneyDelta > 0 ? 'good' : 'bad'), style: { textAlign: 'center' } }, (moneyDelta > 0 ? '+' : '') + DR.money(moneyDelta)) : null,
        lines.map(function (l) { return h('div', { class: 'acc', style: { textAlign: 'center' } }, l); }),
        h('div', { class: 'col' },
          btn('Garage', function () { UI.show(UI.Garage); }),
          btn('Tune', function () { UI.show(UI.Tune); }),
          !damaged ? btn(them ? (cfg.mode === 'street' ? 'Back to Street' : 'Back to Ladder') : 'Run Again', function () {
            if (them) UI.show(UI.RaceMenu, cfg.mode === 'street' ? 'street' : 'career');
            else DR.Race.start(cfg);
          }, 'primary') : null,
          !damaged && them && cfg.mode === 'career' && !win ? btn('Rematch', function () { DR.Race.start(cfg); }, 'red') : null,
          back && !damaged ? btn('Back to Tuning', function () { UI.show(back); }) : null))));
      if (win) A.cash();
      root.appendChild(slip);
      controls.style.display = 'none';
    }

    function quit() {
      if (you.sim.launched && cfg.mode === 'street' && !resultShown) {
        UI.confirm('Leaving now forfeits your ' + DR.money(cfg.bet) + ' bet. Quit?', function () { G.earn(-cfg.bet); G.state.stats.races++; G.save(); UI.show(UI.RaceMenu, 'street'); });
      } else UI.show(cfg.mode === 'test' ? UI.RaceMenu : UI.RaceMenu, cfg.mode === 'street' ? 'street' : cfg.mode === 'test' ? 'test' : 'career');
    }

    return root;
  }
})();
