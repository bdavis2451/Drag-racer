// ===========================================================================
// ENGINE RECORDINGS — engines play real recordings of the car, granular
// style, the way Need for Speed Underground 2 ("Ginsu"), Codemasters and the
// REV engine do it. Each bank (engbanks.js) holds stretches of a recording
// cut into whole engine cycles (720 degrees of crank), each tagged with the
// rpm it was recorded at and whether the engine was pulling (revving up) or
// coasting (revving down). At run time a worklet strings cycles recorded at
// the current rpm end to end — following the recording where it can, jumping
// to another stretch when the rpm moves on — with a 2 ms crossfade at each
// joint and a resample of a few percent to land on the exact rpm. Throttle
// blends the pulling and coasting layers. The modelled engine (enginesim.js)
// stays silent except for what a recording can't give: rev-limiter cuts,
// pops and bangs, and the blower; the turbo comes from audio.js.
// ===========================================================================
(function () {
  var DR = globalThis.DR, A = DR.Audio;
  var decoded = {}, pending = {};

  // which bank voices an engine
  DR.engineBank = function (eng) {
    var B = DR.ENG_BANKS || {}, own = (DR.ENG_BANK_BY_ENGINE || {})[eng.id];
    return own && B[own] ? own : null;
  };

  // ---------------------------------------------------------------- worklet
  function grainMain() {
    class GrainProc extends AudioWorkletProcessor {
      static get parameterDescriptors() {
        return [
          { name: 'rpm', defaultValue: 900, minValue: 0, maxValue: 20000, automationRate: 'k-rate' },
          { name: 'load', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
          { name: 'dop', defaultValue: 1, minValue: 0.5, maxValue: 2, automationRate: 'k-rate' }
        ];
      }
      constructor() {
        super();
        this.alive = true; this.ready = false;
        this.port.onmessage = (e) => { if (e.data === 'stop') this.alive = false; else this.setup(e.data); };
      }
      setup(d) {
        this.pcm = d.pcm; this.s = d.s; this.n = d.n; this.rpm = d.rpm; this.on = d.on; this.end = d.end; this.X = d.xf;
        var sets = [[], []], i;
        for (i = 0; i < this.s.length; i++) sets[this.on[i]].push(i);
        var self = this;
        sets.forEach(function (st) { st.sort(function (a, b) { return self.rpm[a] - self.rpm[b]; }); });
        if (!sets[0].length) sets[0] = sets[1];
        if (!sets[1].length) sets[1] = sets[0];
        this.sets = sets;
        this.lay = [0, 1].map(function () { return { i: -1, p: 0, r: 1, fi: -1, fp: 0, fr: 1, fade: 0 }; });
        this.ready = this.s.length > 0;
      }
      // the next cycle to play: carry on through the recording while it stays
      // near the target rpm, else the nearest cycle recorded at that rpm
      pick(set, target, cur) {
        if (cur >= 0 && !this.end[cur] && cur + 1 < this.s.length && Math.abs(this.rpm[cur + 1] / target - 1) < 0.12) return cur + 1;
        var lo = 0, hi = set.length - 1;
        while (lo < hi) { var m = (lo + hi) >> 1; if (this.rpm[set[m]] < target) lo = m + 1; else hi = m; }
        var best = set[lo], bd = 1e9;
        for (var k = Math.max(0, lo - 3); k <= Math.min(set.length - 1, lo + 2); k++) {
          var d = Math.abs(Math.log(this.rpm[set[k]] / target)) + Math.random() * 0.012;  // a little variety
          if (d < bd) { bd = d; best = set[k]; }
        }
        return best;
      }
      at(pos) {
        var i0 = pos | 0, f = pos - i0, a = this.pcm[i0] || 0, b = this.pcm[i0 + 1] || 0;
        return a + (b - a) * f;
      }
      process(inputs, outputs, P) {
        var out = outputs[0][0];
        if (!this.alive) return false;
        if (!this.ready) { out.fill(0); return true; }
        var target = Math.max(300, P.rpm[0]), load = P.load[0], dop = P.dop[0];
        var w = [Math.cos(load * Math.PI / 2), Math.sin(load * Math.PI / 2)];
        out.fill(0);
        for (var j = 0; j < 2; j++) {
          var L = this.lay[j], set = this.sets[j], wj = w[j];
          for (var s = 0; s < out.length; s++) {
            if (L.i < 0 || L.p >= this.n[L.i]) {
              // the old cycle runs on into what followed it and fades out
              L.fi = L.i; L.fp = L.p; L.fr = L.r; L.fade = L.fi < 0 ? 0 : this.X;
              L.i = this.pick(set, target, L.i); L.p = 0;
              L.r = Math.min(2.2, Math.max(0.45, target / this.rpm[L.i] * dop));
            }
            var v = this.at(this.s[L.i] + L.p);
            if (L.fade > 0) {
              var u = 1 - L.fade / this.X;
              v = v * Math.sin(u * Math.PI / 2) + this.at(this.s[L.fi] + L.fp) * Math.cos(u * Math.PI / 2);
              L.fp += L.fr; L.fade--;
            }
            L.p += L.r;
            out[s] += v * wj;
          }
        }
        return true;
      }
    }
    registerProcessor('pd-grains', GrainProc);
  }

  // load the grain worklet alongside the engine model's
  var baseLoad = A.loadWorklet;
  A.loadWorklet = function (ctx) {
    return baseLoad(ctx).then(function (ok) {
      if (!ok) return ok;
      var url = URL.createObjectURL(new Blob(['(' + grainMain.toString() + ')();'], { type: 'application/javascript' }));
      return ctx.audioWorklet.addModule(url).then(function () { A.grainsWk = true; return ok; }, function () { return ok; });
    });
  };

  // ---------------------------------------------------------------- banks
  function b64ToBuf(s) {
    var bin = atob(s), n = bin.length, u = new Uint8Array(n);
    for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }
  // decode a bank once; fn(buffer or null)
  A.loadBank = function (id, fn) {
    if (!A.ctx || !id) return fn && fn(null);
    if (decoded[id] !== undefined) return fn && fn(decoded[id] || null);
    if (pending[id]) { if (fn) pending[id].push(fn); return; }
    pending[id] = fn ? [fn] : [];
    var done = function (buf) { decoded[id] = buf || false; var q = pending[id]; delete pending[id]; q.forEach(function (f) { f(buf || null); }); };
    try {
      var p = A.ctx.decodeAudioData(b64ToBuf(DR.ENG_BANKS[id].data), done, function () { done(null); });
      if (p && p.catch) p.catch(function () { done(null); });
    } catch (e) { done(null); }
  };
  A.banksReady = function (engs) {
    return engs.every(function (e) { var id = DR.engineBank(e); return !id || decoded[id] !== undefined; });
  };
  A.preloadEngines = function (engs) { engs.forEach(function (e) { var id = DR.engineBank(e); if (id) A.loadBank(id); }); };

  // How the car's parts colour the recording: a stock muffler is darker and
  // quieter, straight pipes open it up. Turbos muffle the exhaust a bit.
  var TONE = { cut: [3200, 5200, 8500, 13000], lvl: [0.82, 0.95, 1.1, 1.22] };

  function attach(v, eng, build) {
    var id = DR.engineBank(eng), bank = id && DR.ENG_BANKS[id], buf = id && decoded[id];
    if (!buf || !A.grainsWk) { if (id) A.loadBank(id); return false; }
    var c = A.ctx, ex = build.exhaust || 0, g = bank.grains, k = buf.sampleRate / bank.sr, n = g.length;
    var arr = { s: new Float64Array(n), n: new Float64Array(n), rpm: new Float32Array(n), on: new Uint8Array(n), end: new Uint8Array(n) };
    for (var i = 0; i < n; i++) { arr.s[i] = g[i][0] * k; arr.n[i] = g[i][1] * k; arr.rpm[i] = g[i][2]; arr.on[i] = g[i][3]; arr.end[i] = g[i][4] ? 1 : 0; }
    var sm = v.smp = { bank: bank };
    sm.node = new AudioWorkletNode(c, 'pd-grains', { numberOfInputs: 0, outputChannelCount: [1] });
    sm.node.port.postMessage({ pcm: buf.getChannelData(0).slice(), s: arr.s, n: arr.n, rpm: arr.rpm, on: arr.on, end: arr.end, xf: Math.round(buf.sampleRate * 0.002) });
    sm.np = sm.node.parameters;
    sm.cut = TONE.cut[ex] * (build.turbo ? 0.78 : 1);
    sm.tone = c.createBiquadFilter(); sm.tone.type = 'lowpass'; sm.tone.Q.value = 0.6; sm.tone.frequency.value = sm.cut;
    sm.out = c.createGain(); sm.out.gain.value = 0;
    sm.node.connect(sm.tone); sm.tone.connect(sm.out); sm.out.connect(v.bus);
    sm.lvl = TONE.lvl[ex] * (build.turbo ? 0.85 : 1) * (bank.gain || 1);
    // the recording carries the engine: silence the modelled exhaust note and
    // engine-bay sounds, keeping its limiter cuts, pops, bangs and blower
    if (v.np) { v.np.get('exh').value = 0; v.np.get('mech').value = 0; }
    return true;
  }

  var baseEngine = A.engine;
  A.engine = function (eng, vol, build) {
    var v = baseEngine(eng, vol, build);
    if (!v) return v;
    if (!A.forceSynth && !A.noSamples) attach(v, eng, build || {});
    return v;
  };

  var baseUpdate = A.update;
  A.update = function (v, rpm, thr, boost, slip, fiType, st) {
    baseUpdate(v, rpm, thr, boost, slip, fiType, st);
    var sm = v && v.smp;
    if (!sm) return;
    st = st || {};
    var t = A.ctx.currentTime, r = Math.max(400, rpm);
    // load: throttle, smoothed so the pull / coast blend doesn't click
    sm.load = sm.load == null ? thr : sm.load + (thr - sm.load) * 0.25;
    var on = Math.min(1, Math.max(0, (sm.load - 0.05) / 0.45));
    sm.np.get('rpm').setTargetAtTime(r, t, 0.012);
    sm.np.get('load').setTargetAtTime(on, t, 0.03);
    sm.np.get('dop').setTargetAtTime(st.doppler || 1, t, 0.05);
    // off throttle the exhaust note loses its top end (as racing-game sound
    // designers EQ it); level grows with load and rpm; the limiter chops it
    sm.tone.frequency.setTargetAtTime(sm.cut * (0.5 + 0.5 * on), t, 0.05);
    var lvl = v.vol * sm.lvl * (0.3 + 0.7 * sm.load) * (0.45 + 0.55 * Math.min(1, r / (v.b.red || 7000))) * (1 + (st.nos ? 0.15 : 0));
    var cut = st.cut && thr > 0.5;
    sm.out.gain.setTargetAtTime(lvl * (cut ? 0.25 : 1) * A.SMP_GAIN, t, cut ? 0.006 : 0.03);
  };
  A.SMP_GAIN = 1.5;

  var baseStop = A.stopAll;
  A.stopAll = function () {
    A.voices.forEach(function (v) { if (v.smp) try { v.smp.node.port.postMessage('stop'); v.smp.node.disconnect(); } catch (e) { /* gone */ } });
    baseStop();
  };
})();
