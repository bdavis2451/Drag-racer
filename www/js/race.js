// ===========================================================================
// RACE — burnout, staging, the tree, the run itself, HUD and the timeslip.
// cfg = {mode:'career'|'street'|'test', opp, ev, round, dist, theme, grip,
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
    },
    // A career event (round: knockout round, 0-based).
    careerEvent: function (ev, round) {
      var T = DR.EVENT_TYPES[ev.type];
      round = round || 0;
      DR.Race.start({ mode: 'career', ev: ev, round: round, opp: ev.opps[round], dist: T.dist(), theme: T.theme, grip: T.grip, reward: G.eventReward(ev) });
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
    var ctx = DR.hiCanvas(cv);
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
    var vsLine = opp ? 'VS ' + opp.label : 'TEST & TUNE';
    infoEl.innerHTML = '';
    setMsg(vsLine, opp ? (cfg.mode === 'street' ? 'Bet: ' + DR.money(cfg.bet) + ' • ' : cfg.mode === 'career' ? DR.EVENT_TYPES[cfg.ev.type].name + (cfg.ev.type === 'knockout' ? ' round ' + (cfg.round + 1) + '/' + cfg.ev.opps.length : '') + ' • Prize: ' + DR.money(cfg.reward) + ' • ' : '') + 'Burnout to heat the tires, or Stage to race.' : 'Burnout to heat the tires, or Stage to race.');

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
      var pitch = sim.th + sim.phi * 1.6;
      // wheel rotation
      var spin = r.burn && !sim.burnMode ? 60 : sim.ww;
      r.wheelAng += spin * dt;
      if (sim.crashed) pitch = Math.min(1.6, (r.crashP = (r.crashP || sim.th) + dt * 2.5));
      DR.drawCar(ctx, spr, gx, gy, pitch, r.wheelAng, { barRad: r.S.barRad, brake: sim.brake, chute: Math.max(0, sim.chute || 0), t: clock, spin: spin, frontStill: sim.burnMode });
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
      if (them) { G.state.stats.races++; if (win) G.state.stats.wins++; }
      // personal bests
      var key = cfg.dist > 300 ? 'q' : 'e', prevBest = inst.best[key], pbLine = null;
      if (you.sim.finished && cfg.grip >= 1 && !redLight && (!inst.best[key] || you.sim.et < inst.best[key])) { inst.best[key] = you.sim.et; lines.push('NEW PERSONAL BEST!'); }
      else if (you.sim.finished && prevBest) pbLine = 'Your best ' + (key === 'q' ? '1/4' : '1/8') + ': ' + prevBest.toFixed(3) + ' (' + '+' + (you.sim.et - prevBest).toFixed(3) + ')';
      // how close it was
      var margin = null;
      if (them && me.total < Infinity && them.total < Infinity && !me.red && !them.red) margin = (win ? 'Won' : 'Lost') + ' by ' + Math.abs(them.total - me.total).toFixed(3) + 's';
      else if (them && win && them.total === Infinity && !them.red) margin = opp.label + (opp.sim.crashed ? ' crashed' : opp.sim.blown ? ' blew up' : opp.sim.broke ? ' broke' : ' did not finish');
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
      root._back = function () { UI.show(UI.RaceMenu, cfg.mode === 'street' ? 'street' : cfg.mode === 'test' ? 'test' : 'career'); };
    }

    function quit() {
      if (you.sim.launched && cfg.mode === 'street' && !resultShown) {
        UI.confirm('Leaving now forfeits your ' + DR.money(cfg.bet) + ' bet. Quit?', function () { G.earn(-cfg.bet); G.state.stats.races++; G.save(); UI.show(UI.RaceMenu, 'street'); });
      } else UI.show(cfg.mode === 'test' ? UI.RaceMenu : UI.RaceMenu, cfg.mode === 'street' ? 'street' : cfg.mode === 'test' ? 'test' : 'career');
    }

    return root;
  }
})();
