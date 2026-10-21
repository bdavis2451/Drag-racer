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

  // An engine voice. vol: 0..1 (opponent quieter).
  A.engine = function (cyl, vol) {
    if (!A.ctx || !A.on) return null;
    var c = A.ctx, v = { cyl: cyl, vol: vol };
    v.out = c.createGain(); v.out.gain.value = 0; v.out.connect(A.master);
    v.filter = c.createBiquadFilter(); v.filter.type = 'lowpass'; v.filter.frequency.value = 900; v.filter.Q.value = 4;
    v.filter.connect(v.out);
    v.o1 = c.createOscillator(); v.o1.type = 'sawtooth';
    v.o2 = c.createOscillator(); v.o2.type = 'square';
    v.g1 = c.createGain(); v.g1.gain.value = 0.55; v.g2 = c.createGain(); v.g2.gain.value = 0.3;
    v.o1.connect(v.g1); v.g1.connect(v.filter); v.o2.connect(v.g2); v.g2.connect(v.filter);
    // tremolo "lope" for big V8s
    v.lfo = c.createOscillator(); v.lfo.type = 'sine'; v.lfoG = c.createGain(); v.lfoG.gain.value = 0;
    v.lfo.connect(v.lfoG); v.lfoG.connect(v.out.gain);
    // tires
    v.tn = noiseSrc(); v.tf = c.createBiquadFilter(); v.tf.type = 'bandpass'; v.tf.frequency.value = 1400; v.tf.Q.value = 2.5;
    v.tg = c.createGain(); v.tg.gain.value = 0; v.tn.connect(v.tf); v.tf.connect(v.tg); v.tg.connect(A.master);
    // turbo whistle
    v.wo = c.createOscillator(); v.wo.type = 'sine'; v.wg = c.createGain(); v.wg.gain.value = 0; v.wo.connect(v.wg); v.wg.connect(A.master);
    [v.o1, v.o2, v.lfo, v.tn, v.wo].forEach(function (n) { n.start(); });
    A.voices.push(v);
    return v;
  };

  A.update = function (v, rpm, thr, boost, slip, fiType) {
    if (!v || !A.ctx) return;
    var t = A.ctx.currentTime, k = 0.05;
    var fire = Math.max(20, rpm / 60 * v.cyl / 2);
    v.o1.frequency.setTargetAtTime(fire, t, k);
    v.o2.frequency.setTargetAtTime(fire * 0.5, t, k);
    v.lfo.frequency.setTargetAtTime(Math.max(2, rpm / 120), t, k);
    v.lfoG.gain.setTargetAtTime(v.vol * (v.cyl >= 8 ? 0.06 : 0.02) * (rpm < 2500 ? 1 : 0.3), t, k);
    v.filter.frequency.setTargetAtTime(500 + thr * 1600 + rpm * 0.12, t, k);
    v.out.gain.setTargetAtTime(v.vol * (0.12 + thr * 0.22), t, k);
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
      try { [v.o1, v.o2, v.lfo, v.tn, v.wo].forEach(function (n) { n.stop(); }); v.out.disconnect(); v.tg.disconnect(); v.wg.disconnect(); } catch (e) { /* already stopped */ }
    });
    A.voices = [];
  };
})();
