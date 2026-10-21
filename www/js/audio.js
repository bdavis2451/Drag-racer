// ===========================================================================
// AUDIO — a small WebAudio synth: engine note follows RPM & cylinder count,
// plus tire squeal, turbo whistle, blow-off and backfire pops.
// ===========================================================================
(function () {
  var DR = globalThis.DR;
  var A = DR.Audio = { ctx: null, on: true, master: null, voices: [] };

  A.init = function () {
    if (A.ctx || !A.on) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { A.ctx = new AC(); } catch (e) { return; }
    A.master = A.ctx.createGain(); A.master.gain.value = 0.5; A.master.connect(A.ctx.destination);
    var len = A.ctx.sampleRate * 1.5, buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.noise = buf;
  };
  A.resume = function () { if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); };
  A.setOn = function (on) { A.on = on; if (!on) A.stopAll(); };

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
  function engineWave(layout) {
    if (waveCache[layout]) return waveCache[layout];
    var P = PROFILES[layout], N = 2048, n = P.amps.length, x = new Float32Array(N), i, k;
    for (var c = 0; c < n; c++) {
      var start = (c + P.jit[c]) / n, w = P.width / n;
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
    waveCache[layout] = A.ctx.createPeriodicWave(re, im);
    return waveCache[layout];
  }
  A._resetWaves = function () { waveCache = {};
  }

  function gritCurve(amount) {
    var n = 1024, curve = new Float32Array(n);
    for (var i = 0; i < n; i++) { var x = i / (n - 1) * 2 - 1; curve[i] = Math.tanh(x * amount) / Math.tanh(amount); }
    return curve;
  }

  // An engine voice. eng: engine data (name, cyl, rotary, diesel).
  // vol: 0..1 (the opponent is quieter).
  A.engine = function (eng, vol) {
    if (!A.ctx || !A.on) return null;
    var c = A.ctx, layout = layoutOf(eng), P = PROFILES[layout];
    var v = { eng: eng, vol: vol, P: P, cyclesPerRev: P.perRev ? 1 : 0.5 };
    v.out = c.createGain(); v.out.gain.value = 0; v.out.connect(A.master);
    v.filter = c.createBiquadFilter(); v.filter.type = 'lowpass'; v.filter.frequency.value = 400; v.filter.Q.value = 0.9;
    v.shaper = c.createWaveShaper(); v.shaper.curve = gritCurve(P.grit); v.shaper.oversample = '2x';
    v.pre = c.createGain(); v.pre.gain.value = 3;
    // engine pulses -> drive -> tone filter
    v.osc = c.createOscillator(); v.osc.setPeriodicWave(engineWave(layout));
    v.osc.connect(v.pre); v.pre.connect(v.shaper); v.shaper.connect(v.filter); v.filter.connect(v.out);
    // low "chest" thump at the cycle rate for big engines
    v.sub = c.createOscillator(); v.sub.type = 'sine'; v.subG = c.createGain(); v.subG.gain.value = 0;
    v.sub.connect(v.subG); v.subG.connect(v.out);
    // exhaust breath: noise shaped around the firing note
    v.en = noiseSrc(); v.ef = c.createBiquadFilter(); v.ef.type = 'bandpass'; v.ef.Q.value = 0.8; v.ef.frequency.value = 300;
    v.eg = c.createGain(); v.eg.gain.value = 0; v.en.connect(v.ef); v.ef.connect(v.eg); v.eg.connect(v.out);
    // tires
    v.tn = noiseSrc(); v.tf = c.createBiquadFilter(); v.tf.type = 'bandpass'; v.tf.frequency.value = 1400; v.tf.Q.value = 2.5;
    v.tg = c.createGain(); v.tg.gain.value = 0; v.tn.connect(v.tf); v.tf.connect(v.tg); v.tg.connect(A.master);
    // turbo whistle / blower whine
    v.wo = c.createOscillator(); v.wo.type = 'sine'; v.wg = c.createGain(); v.wg.gain.value = 0; v.wo.connect(v.wg); v.wg.connect(A.master);
    [v.osc, v.sub, v.en, v.tn, v.wo].forEach(function (n) { n.start(); });
    A.voices.push(v);
    return v;
  };

  A.update = function (v, rpm, thr, boost, slip, fiType) {
    if (!v || !A.ctx) return;
    var t = A.ctx.currentTime, k = 0.04, P = v.P;
    rpm = Math.max(300, rpm);
    var cycle = rpm / 60 * v.cyclesPerRev;                 // engine cycles per second
    var fire = cycle * P.amps.length;                       // firing pulses per second
    v.osc.frequency.setTargetAtTime(cycle, t, k);
    v.sub.frequency.setTargetAtTime(cycle * 2, t, k);
    v.subG.gain.setTargetAtTime((P.bright < 0.9 ? 0.35 : 0.06) * (0.4 + thr * 0.6), t, k);
    // darker at low rpm & off throttle, opens up with load
    v.filter.frequency.setTargetAtTime(Math.min(9000, (fire * 1.4 + 150 + thr * 900 + rpm * 0.06) * P.bright), t, k);
    v.pre.gain.setTargetAtTime((1.2 + thr * 2.3) * (P.drive || 1), t, k);
    v.ef.frequency.setTargetAtTime(Math.min(6000, fire * 1.2 * P.bright + 100), t, k);
    v.eg.gain.setTargetAtTime(0.05 + thr * 0.12, t, k);
    v.out.gain.setTargetAtTime(v.vol * (0.17 + thr * 0.27), t, k);
    v.tg.gain.setTargetAtTime(v.vol * Math.min(0.35, Math.max(0, slip - 0.15) * 0.25), t, 0.03);
    if (fiType === 'turbo') {
      v.wo.frequency.setTargetAtTime(1800 + boost * 90, t, 0.1);
      v.wg.gain.setTargetAtTime(v.vol * Math.min(0.05, boost * 0.0025), t, 0.1);
    } else if (fiType && fiType !== 'none') {
      v.wo.frequency.setTargetAtTime(600 + rpm * 0.35, t, 0.05);
      v.wg.gain.setTargetAtTime(v.vol * 0.02 * thr, t, 0.1);
    }
  };

  A.burst = function (dur, freq, q, gain, type) {
    if (!A.ctx || !A.on) return;
    var c = A.ctx, s = noiseSrc(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
    f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(A.master); s.start(t); s.stop(t + dur + 0.05);
  };
  A.pop = function () { A.burst(0.08, 300 + Math.random() * 200, 1, 0.5, 'lowpass'); };
  A.blowoff = function () { A.burst(0.35, 3000, 0.8, 0.12, 'highpass'); };
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
      try { [v.osc, v.sub, v.en, v.tn, v.wo].forEach(function (n) { n.stop(); }); v.out.disconnect(); v.tg.disconnect(); v.wg.disconnect(); } catch (e) { /* already stopped */ }
    });
    A.voices = [];
  };
})();
