// ===========================================================================
// AUDIO — a small WebAudio synth: engine note follows RPM, layout and parts,
// plus tire squeal, turbo whistle, blow-off and backfire pops.
// ===========================================================================
(function () {
  var DR = globalThis.DR;
  var A = DR.Audio = { ctx: null, on: true, master: null, voices: [], WK_GAIN: 0.5 };

  A.init = function () {
    if (A.ctx || !A.on) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { A.ctx = new AC(); } catch (e) { return; }
    var len = A.ctx.sampleRate * 1.5, buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.noise = buf;
    A.buildMaster(A.ctx);
  };

  // master bus: everything -> gentle compressor -> speakers, plus a small
  // send into a short "open strip" reverb so it sounds like it's outdoors
  // between walls and grandstands instead of inside the speaker.
  A.buildMaster = function (ctx) {
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
    comp.connect(ctx.destination);
    A.master = ctx.createGain(); A.master.gain.value = 0.55 * A.volume; A.master.connect(comp);
    try {
      var rate = ctx.sampleRate, n = Math.floor(rate * 0.9), ir = ctx.createBuffer(2, n, rate);
      for (var ch = 0; ch < 2; ch++) {
        var x = ir.getChannelData(ch), lp = 0;
        for (var i = 0; i < n; i++) {
          var t = i / rate, early = (Math.abs(t - 0.023 - ch * 0.004) < 0.0015 || Math.abs(t - 0.061 + ch * 0.006) < 0.0015) ? 0.5 : 0;
          lp += ((Math.random() * 2 - 1) - lp) * 0.35;            // darker tail
          x[i] = (lp * Math.exp(-t / 0.22) + early * (Math.random() * 2 - 1)) * (t < 0.012 ? 0 : 1);
        }
      }
      var verb = ctx.createConvolver(); verb.buffer = ir;
      var wet = ctx.createGain(); wet.gain.value = 0.16;
      A.master.connect(verb); verb.connect(wet); wet.connect(comp);
      A.verbIn = verb;   // distant cars send extra signal here
    } catch (e) { /* no reverb on this device */ }
  };
  A.resume = function () { if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); };
  A.setOn = function (on) { A.on = on; if (!on) A.stopAll(); };
  A.volume = 1;
  A.setVolume = function (v) { A.volume = v; if (A.master) A.master.gain.value = 0.55 * v; };

  function noiseSrc() { var s = A.ctx.createBufferSource(); s.buffer = A.noise; s.loop = true; return s; }

  // ------------------------------------------------------------ engine voice
  // Each engine layout gets a "firing signature": one pulse per cylinder per
  // engine cycle, with its own strength and timing. Uneven pulses put energy
  // below the firing note, which is what makes a cross-plane V8 burble and
  // rumble while an inline-6 stays smooth and a rotary buzzes.
  var PROFILES = {
    v8:     { amps: [1, 0.35, 0.9, 0.3, 1, 0.42, 0.85, 0.28], jit: [0, 0.09, -0.05, 0.08, 0, -0.07, 0.05, -0.09], width: 0.95, bright: 0.55, grit: 1.3, drive: 0.6 },
    v6:     { amps: [1, 0.6, 0.9, 0.55, 0.95, 0.65], jit: [0, 0.05, -0.03, 0.04, 0, -0.04], width: 0.8, bright: 0.8, grit: 1.5, drive: 0.8 },
    boxer:  { amps: [1, 0.45, 0.95, 0.5], jit: [0, 0.08, 0, -0.07], width: 0.8, bright: 0.75, grit: 1.5, drive: 0.8 },
    i3:     { amps: [1, 0.8, 0.9], jit: [0, 0.02, -0.02], width: 0.6, bright: 1.0, grit: 1.6 },
    i4:     { amps: [1, 0.88, 0.96, 0.86], jit: [0, 0.01, 0, -0.01], width: 0.5, bright: 1.3, grit: 1.8, drive: 1.1 },
    i6:     { amps: [1, 0.96, 0.99, 0.95, 1, 0.97], jit: [0, 0, 0, 0, 0, 0], width: 0.6, bright: 1.0, grit: 1.4 },
    v10:    { amps: [1, 0.6, 0.95, 0.55, 0.9, 0.7, 1, 0.55, 0.9, 0.65], jit: [0, 0.05, -0.03, 0.04, 0, -0.05, 0.03, -0.04, 0.02, 0], width: 0.8, bright: 0.85, grit: 1.5, drive: 0.8 },
    v12:    { amps: [1, 0.95, 0.98, 0.94, 1, 0.96, 0.99, 0.95, 1, 0.96, 0.98, 0.95], jit: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], width: 0.55, bright: 1.25, grit: 1.4 },
    rotary: { amps: [1, 0.95], jit: [0, 0.01], width: 0.22, bright: 2.2, grit: 2.4, drive: 1.3, perRev: true },
    diesel: { amps: [1, 0.85, 0.95, 0.8, 1, 0.9], jit: [0, 0.02, -0.01, 0.02, 0, -0.02], width: 0.45, bright: 0.5, grit: 2.6 }
  };
  function layoutOf(eng) {
    var n = eng.name || '';
    if (eng.rotary) return 'rotary';
    if (eng.diesel) return 'diesel';
    if (/V8|Hemi|Big Block/.test(n)) return 'v8';
    if (/V10/.test(n)) return 'v10';
    if (/V12/.test(n)) return 'v12';
    if (/V6/.test(n)) return 'v6';
    if (/Flat|Boxer/.test(n)) return eng.cyl === 6 ? 'i6' : 'boxer';
    return { 3: 'i3', 4: 'i4', 6: 'i6' }[eng.cyl] || 'i4';
  }
  A.layoutOf = layoutOf;

  // One engine cycle (720 degrees, or one rotor-shaft turn) of exhaust
  // pulses, turned into a PeriodicWave so the oscillator can play it.
  var waveCache = {};
  // sharp: header factor, < 1 makes each exhaust pulse shorter and sharper
  // (more bark and rasp), the way tuned tube headers sound.
  function engineWave(layout, sharp) {
    var key = layout + ':' + sharp;
    if (waveCache[key]) return waveCache[key];
    var P = PROFILES[layout], N = 2048, n = P.amps.length, x = new Float32Array(N), i, k;
    for (var c = 0; c < n; c++) {
      var start = (c + P.jit[c]) / n, w = P.width * sharp / n;
      for (i = 0; i < N; i++) {
        var t = i / N - start; if (t < 0) t += 1;
        if (t < w) { var u = t / w; x[i] += P.amps[c] * Math.sin(Math.PI * u) * Math.exp(-2.5 * u); }
      }
    }
    var H = 128, re = new Float32Array(H + 1), im = new Float32Array(H + 1);
    for (k = 1; k <= H; k++) {
      var a = 0, b = 0;
      for (i = 0; i < N; i++) { var ph = 2 * Math.PI * k * i / N; a += x[i] * Math.cos(ph); b += x[i] * Math.sin(ph); }
      re[k] = a / N; im[k] = b / N;
    }
    waveCache[key] = A.ctx.createPeriodicWave(re, im);
    return waveCache[key];
  }

  // How the car's parts change its sound. Index = upgrade stage.
  var EXHAUST = {   // stock, cat-back, straight pipes, open race exhaust
    loud: [0.72, 0.9, 1.12, 1.28], bright: [0.78, 0.95, 1.15, 1.3], grit: [0, 0.2, 0.55, 0.85],
    breath: [0.6, 0.9, 1.35, 1.7], drone: [2, 4, 7, 6], droneHz: [190, 160, 135, 150], crackle: [0, 0.15, 0.6, 1]
  };
  var HEADERS = { sharp: [1, 0.92, 0.8, 0.7], bright: [1, 1.03, 1.08, 1.15], grit: [0, 0.05, 0.15, 0.3] };
  var CAM_LOPE = [0, 0.1, 0.22, 0.38, 0.5];
  function stage(id, list) { var i = list.indexOf(id); return i < 0 ? 0 : i; }

  // Sound settings for a built car (from its physics spec).
  A.buildOf = function (S) {
    var parts = S._parts || {};
    var fi = S.fiType;
    return {
      exhaust: stage(parts.exhaust, ['stock', 'e1', 'e2', 'e3']),
      intake: stage(parts.intake, ['stock', 'i1', 'i2', 'i3']),
      blowerType: fi === 'roots' || fi === 'screw' || fi === 'cent' ? fi : '',
      headers: stage(parts.headers, ['stock', 'h1', 'h2', 'h3']),
      cam: stage(parts.cams, ['stock', 'c1', 'c2', 'c3', 'c4']),
      turbo: fi === 'turbo',
      blower: fi === 'roots' || fi === 'screw' || fi === 'cent',
      antilag: S.twostep === 2,
      twostep: S.twostep > 0,
      red: S.red
    };
  };

  function gritCurve(amount) {
    var n = 1024, curve = new Float32Array(n);
    for (var i = 0; i < n; i++) { var x = i / (n - 1) * 2 - 1; curve[i] = Math.tanh(x * amount) / Math.tanh(amount); }
    return curve;
  }

  // An engine voice. eng: engine data (name, cyl, rotary, diesel).
  // vol: 0..1 (the opponent is quieter). build: from A.buildOf(spec).
  A.engine = function (eng, vol, build) {
    if (!A.ctx || !A.on) return null;
    build = build || { exhaust: 0, headers: 0, cam: 0 };
    var c = A.ctx, layout = layoutOf(eng), P = PROFILES[layout], ex = build.exhaust, hd = build.headers;
    var v = { eng: eng, vol: vol, P: P, b: build, cyclesPerRev: P.perRev ? 1 : 0.5, lastThr: 0, popT: 0 };
    // Turbos muffle the exhaust; blowers are a bit louder.
    v.loud = EXHAUST.loud[ex] * (build.turbo ? 0.75 : 1) * (build.blower ? 1.1 : 1);
    v.bright = P.bright * EXHAUST.bright[ex] * HEADERS.bright[hd] * (build.turbo ? 0.82 : 1) * (1 + build.cam * 0.04);
    v.lope = CAM_LOPE[build.cam] * (layout === 'v8' || layout === 'v6' ? 1 : 0.6);
    v.crackle = Math.max(EXHAUST.crackle[ex] * (build.turbo ? 0.5 : 1), build.antilag ? 0.8 : 0);
    v.out = c.createGain(); v.out.gain.value = 0; v.out.connect(A.master);
    v.wk = A.wk && !A.forceSynth;
    if (v.wk) {
      // physically modelled engine & exhaust on the audio thread (enginesim.js)
      v.node = new AudioWorkletNode(c, 'pd-engine', { numberOfInputs: 0, outputChannelCount: [2] });
      v.node.port.postMessage(A.engineConfig(eng, build));
      v.np = v.node.parameters;
      v.node.connect(v.out);
      // the simulation sets the exhaust tone & level; blowers are a bit louder
      v.loud = build.blower ? 1.0 : 1;
    } else {
      v.filter = c.createBiquadFilter(); v.filter.type = 'lowpass'; v.filter.frequency.value = 400; v.filter.Q.value = 0.9;
      // exhaust pipe resonance ("drone")
      v.body = c.createBiquadFilter(); v.body.type = 'peaking'; v.body.frequency.value = EXHAUST.droneHz[ex];
      v.body.Q.value = 1.1; v.body.gain.value = EXHAUST.drone[ex] * (build.turbo ? 0.5 : 1);
      v.shaper = c.createWaveShaper(); v.shaper.curve = gritCurve(P.grit + EXHAUST.grit[ex] + HEADERS.grit[hd]); v.shaper.oversample = '2x';
      v.pre = c.createGain(); v.pre.gain.value = 3;
      // engine pulses -> drive -> tone filter -> pipe resonance -> lope (cam) -> out
      v.lopeG = c.createGain(); v.lopeG.gain.value = 1;
      v.osc = c.createOscillator(); v.osc.setPeriodicWave(engineWave(layout, HEADERS.sharp[hd]));
      v.osc.connect(v.pre); v.pre.connect(v.shaper); v.shaper.connect(v.filter); v.filter.connect(v.body); v.body.connect(v.lopeG); v.lopeG.connect(v.out);
      // big cams: the idle surges and stumbles (amplitude wobble at half the cycle rate)
      v.lfo = c.createOscillator(); v.lfo.type = 'triangle'; v.lfoG = c.createGain(); v.lfoG.gain.value = 0;
      v.lfo.connect(v.lfoG); v.lfoG.connect(v.lopeG.gain);
      // low "chest" thump at the crank rate for big engines
      v.sub = c.createOscillator(); v.sub.type = 'sine'; v.subG = c.createGain(); v.subG.gain.value = 0;
      v.sub.connect(v.subG); v.subG.connect(v.out);
    }
    // exhaust breath: noise around the firing note (also the nitrous hiss)
    v.en = noiseSrc(); v.ef = c.createBiquadFilter(); v.ef.type = 'bandpass'; v.ef.Q.value = 0.8; v.ef.frequency.value = 300;
    v.eg = c.createGain(); v.eg.gain.value = 0; v.en.connect(v.ef); v.ef.connect(v.eg); v.eg.connect(v.out);
    // intake roar under load (shares the exhaust noise source)
    v.inf = c.createBiquadFilter(); v.inf.type = 'bandpass'; v.inf.Q.value = 1.3; v.inf.frequency.value = 900;
    v.ing = c.createGain(); v.ing.gain.value = 0; v.en.connect(v.inf); v.inf.connect(v.ing); v.ing.connect(v.out);
    // the voice's place in the stereo field (the opponent sits in the other lane)
    v.pan = c.createStereoPanner ? c.createStereoPanner() : null;
    v.bus = c.createGain(); v.bus.gain.value = 1;
    // distance: air absorbs highs, and far cars are heard more via echoes
    v.air = c.createBiquadFilter(); v.air.type = 'lowpass'; v.air.frequency.value = 18000; v.air.Q.value = 0.5;
    v.bus.connect(v.air);
    if (v.pan) { v.air.connect(v.pan); v.pan.connect(A.master); } else v.air.connect(A.master);
    if (A.verbIn) { v.send = c.createGain(); v.send.gain.value = 0; v.air.connect(v.send); v.send.connect(A.verbIn); }
    v.out.disconnect(); v.out.connect(v.bus);
    // tires: a wavering tonal squeal plus a low roar, mixed by tire compound
    v.tn = noiseSrc();
    v.tf = c.createBiquadFilter(); v.tf.type = 'bandpass'; v.tf.frequency.value = 1150; v.tf.Q.value = 6;
    v.tg = c.createGain(); v.tg.gain.value = 0; v.tn.connect(v.tf); v.tf.connect(v.tg); v.tg.connect(v.bus);
    v.rf = c.createBiquadFilter(); v.rf.type = 'lowpass'; v.rf.frequency.value = 650; v.rf.Q.value = 0.7;
    v.rg = c.createGain(); v.rg.gain.value = 0; v.tn.connect(v.rf); v.rf.connect(v.rg); v.rg.connect(v.bus);
    v.tire = 0;
    // turbo whistle / blower whine
    v.wo = c.createOscillator(); v.wo.type = build.blower ? 'triangle' : 'sine'; v.wg = c.createGain(); v.wg.gain.value = 0; v.wo.connect(v.wg); v.wg.connect(v.bus);
    // turbo whoosh: airflow noise through the compressor (shares the noise source)
    v.tw = c.createBiquadFilter(); v.tw.type = 'bandpass'; v.tw.Q.value = 2.2; v.tw.frequency.value = 2000;
    v.twg = c.createGain(); v.twg.gain.value = 0; v.en.connect(v.tw); v.tw.connect(v.twg); v.twg.connect(v.bus);
    // straight-cut gear whine (sequential / Lenco boxes)
    v.go = c.createOscillator(); v.go.type = 'triangle'; v.gg = c.createGain(); v.gg.gain.value = 0; v.go.connect(v.gg); v.gg.connect(v.bus);
    [v.osc, v.lfo, v.sub, v.en, v.tn, v.wo, v.go].forEach(function (n) { if (n) n.start(); });
    A.voices.push(v);
    return v;
  };

  // st (optional): {nos: spraying nitrous, cut: ignition cut (rev limiter)}
  A.update = function (v, rpm, thr, boost, slip, fiType, st) {
    if (!v || !A.ctx) return;
    st = st || {};
    var t = A.ctx.currentTime, k = 0.04, P = v.P;
    // Doppler: a car closing on the camera sounds higher, one pulling away lower
    var dop = st.doppler || 1;
    rpm = Math.max(300, rpm) * dop;
    var nos = st.nos ? 1 : 0;
    // cam lope: strongest at idle, gone by ~3500 rpm. Lifting off at speed
    // gives a softer overrun burble.
    var overrun = thr < 0.15 && rpm > 1800 ? Math.min(1, (rpm - 1800) / 3000) : 0;
    var lope = Math.max(v.lope * Math.max(0, 1 - (rpm - 900) / 2600) * (1 - thr * 0.5), overrun * 0.22);
    // every combustion is a little different, so a real engine never holds a
    // perfectly steady pitch
    var wob = 1 + (Math.random() - 0.5) * (0.006 + lope * 0.12);
    var cycle = rpm / 60 * v.cyclesPerRev * wob;            // engine cycles per second
    var fire = cycle * P.amps.length;                        // firing pulses per second
    if (v.wk) {
      var pt = t + 0.02;
      v.np.get('rpm').setTargetAtTime(rpm, t, 0.02);
      v.np.get('load').setTargetAtTime(Math.min(1, thr * (1 + nos * 0.2)), t, 0.03);
      v.np.get('cut').setValueAtTime(st.cut && thr > 0.5 ? 1 : 0, pt);
      v.np.get('nos').setValueAtTime(nos, pt);
      v.np.get('boost').setValueAtTime(boost || 0, pt);
    } else {
      v.osc.frequency.setTargetAtTime(cycle, t, k);
      v.lfo.frequency.setTargetAtTime(cycle * 0.5, t, k);
      v.lfoG.gain.setTargetAtTime(lope, t, k);
      v.sub.frequency.setTargetAtTime(cycle * 2, t, k);
      v.subG.gain.setTargetAtTime((P.bright < 0.9 ? 0.35 : 0.06) * (0.4 + thr * 0.6), t, k);
      // darker at low rpm & off throttle, opens up with load; nitrous gets harsh
      var bright = v.bright * (1 + nos * 0.25);
      v.filter.frequency.setTargetAtTime(Math.min(9000, (fire * 1.4 + 150 + thr * 900 + rpm * 0.06) * bright), t, k);
      v.pre.gain.setTargetAtTime((1.2 + thr * 2.3) * (P.drive || 1) * (1 + nos * 0.6) * (1 + (Math.random() - 0.5) * 0.06), t, k);
      v.ef.frequency.setTargetAtTime(nos ? 3500 : Math.min(6000, fire * 1.2 * bright + 100), t, k);
      v.eg.gain.setTargetAtTime((0.05 + thr * 0.12) * EXHAUST.breath[v.b.exhaust] * (v.b.turbo ? 0.6 : 1) + nos * 0.12, t, k);
      // the rev limiter chops the sound
      var level = v.vol * v.loud * (0.17 + thr * 0.27) * (1 + nos * 0.18) * (st.cut && thr > 0.5 ? 0.35 : 1);
      v.out.gain.setTargetAtTime(level, t, st.cut ? 0.008 : k);
    }
    // intake roar under load, nitrous hiss
    var fireHz = rpm / 60 * v.cyclesPerRev * P.amps.length;
    v.inf.frequency.setTargetAtTime(Math.min(5000, fireHz * 2.2 + 300), t, k);
    v.ing.gain.setTargetAtTime(v.wk ? 0 : thr * (v.b.turbo ? 0.03 : 0.07) * (rpm / 6000), t, k);
    if (v.wk) {
      v.ef.frequency.setTargetAtTime(3500, t, k);
      v.eg.gain.setTargetAtTime(nos * 0.1, t, k);
      v.out.gain.setTargetAtTime(v.vol * v.loud * A.WK_GAIN, t, k);
    }
    // tires: slip is how hard the tires are spinning (0 = hooked, 1 = full
    // burnout). Fade in/out smoothly so a quick chirp doesn't click.
    var want = Math.min(1, Math.max(0, slip || 0));
    v.tire += (want - v.tire) * (want > v.tire ? 0.35 : 0.12);
    var kind = st.tire || 'Street', tone = kind === 'Slick' ? 0.25 : kind === 'Drag Radial' ? 0.55 : 1;
    var tAmt = Math.pow(v.tire, 1.4);
    v.tf.frequency.setTargetAtTime((kind === 'Street' ? 1050 : 850) + (Math.random() - 0.5) * 160 + tAmt * 150, t, 0.03);
    v.tg.gain.setTargetAtTime(tAmt * tone * 0.6, t, 0.05);
    v.rg.gain.setTargetAtTime(tAmt * (1.1 - tone * 0.6) * 0.36, t, 0.05);
    // where the car is: stereo position and distance from the camera
    if (v.pan) v.pan.pan.setTargetAtTime(st.pan || 0, t, 0.1);
    var near = st.near != null ? st.near : 1;
    v.bus.gain.setTargetAtTime(near, t, 0.1);
    v.air.frequency.setTargetAtTime(Math.max(1500, Math.min(18000, 18000 * Math.pow(near, 1.6))), t, 0.1);
    if (v.send) v.send.gain.setTargetAtTime(0.35 * (1 - near), t, 0.1);
    if (st.gearWhine) {
      v.go.frequency.setTargetAtTime(rpm / 60 * 21, t, k);
      v.gg.gain.setTargetAtTime(v.vol * (0.004 + thr * 0.01) * Math.min(1, rpm / 4000), t, k);
    }
    if (fiType === 'turbo') {
      // The turbo is a spinning shaft: it takes time to spool up, winds down
      // slowly after a lift, and its whistle rises in pitch and volume with
      // shaft speed. A tone plus an airy whoosh, sitting under the engine.
      var dt = Math.min(0.1, Math.max(0.001, t - (v.tLast || t)));
      var flow = Math.min(1, (boost || 0) / 25) * 0.75 + Math.min(1, rpm / 7000) * thr * 0.25;
      v.spool = v.spool || 0;
      v.spool += (flow - v.spool) * Math.min(1, dt / (flow > v.spool ? 0.45 : 1.1));
      var sp = v.spool;
      v.wo.frequency.setTargetAtTime((2400 + sp * 5200) * dop, t, 0.05);
      v.wg.gain.setTargetAtTime(v.vol * 0.02 * sp * sp, t, 0.08);
      v.tw.frequency.setTargetAtTime(1600 + sp * 3600, t, 0.05);
      v.twg.gain.setTargetAtTime(v.vol * 0.12 * sp * sp * (0.3 + 0.7 * thr), t, 0.08);
      // lifting with boost up: blow-off valve
      if (v.lastThr - thr > 0.5 && sp > 0.3 && t > (v.bovT || 0)) { A.burst(0.5, 2600, 0.7, v.vol * 0.07 * sp, 'highpass'); v.bovT = t + 0.8; }
    } else if (fiType && fiType !== 'none' && !v.wk) {
      v.wo.frequency.setTargetAtTime(500 + rpm * 0.4, t, 0.05);
      v.wg.gain.setTargetAtTime(v.vol * (0.012 + 0.028 * thr), t, 0.1);
    }
    // lift off at high rpm with a free-flowing exhaust: crackles and pops
    if (!v.wk && v.crackle && v.lastThr - thr > 0.4 && rpm > 3200 && t > v.popT) {
      var n = Math.round(2 + v.crackle * 5);
      for (var i = 0; i < n; i++) if (Math.random() < 0.4 + v.crackle * 0.5)
        A.burst(0.05 + Math.random() * 0.05, 250 + Math.random() * 450, 1, v.vol * (0.25 + v.crackle * 0.25), 'lowpass', 0.05 + i * (0.05 + Math.random() * 0.06));
      v.popT = t + 0.6;
    }
    v.lastThr = thr; v.tLast = t;
  };

  A.burst = function (dur, freq, q, gain, type, delay) {
    if (!A.ctx || !A.on) return;
    var c = A.ctx, s = noiseSrc(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + (delay || 0);
    f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(A.master); s.start(t); s.stop(t + dur + 0.05);
  };
  A.pop = function () { A.burst(0.08, 300 + Math.random() * 200, 1, 0.5, 'lowpass'); };
  A.blowoff = function () { A.burst(0.45, 2600, 0.7, 0.07, 'highpass'); };
  A.boom = function () { A.burst(0.9, 120, 0.7, 0.9, 'lowpass'); };
  A.beep = function (freq, dur) {
    if (!A.ctx || !A.on) return;
    var c = A.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = 'square'; o.frequency.value = freq; g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + dur + 0.02);
  };
  A.cash = function () { A.beep(1320, 0.08); setTimeout(function () { A.beep(1760, 0.12); }, 80); };
  A.click = function () { A.beep(660, 0.03); };

  A.stopAll = function () {
    A.voices.forEach(function (v) {
      try { if (v.node) v.node.port.postMessage('stop'); [v.osc, v.lfo, v.sub, v.en, v.tn, v.wo, v.go].forEach(function (n) { if (n) n.stop(); }); v.bus.disconnect(); } catch (e) { /* already stopped */ }
    });
    A.voices = [];
  };
})();
