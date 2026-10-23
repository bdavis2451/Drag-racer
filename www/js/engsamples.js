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
        this.st = { cont: 0, jump: 0, mis: 0 };
        this.port.onmessage = (e) => { if (e.data === 'stop') this.alive = false; else if (e.data === 'stats') this.port.postMessage(this.st); else this.setup(e.data); };
      }
      setup(d) {
        this.pcm = d.pcm; this.s = d.s; this.n = d.n; this.rpm = d.rpm; this.on = d.on; this.end = d.end; this.X = d.xf; this.D = d.d; this.off = 0;
        this.cyc = d.cyc;                     // firings per engine cycle
        this.hist = [-1, -1, -1, -1, -1, -1, -1, -1]; this.hp = 0;
        // each cycle's loudness, to level-match a splice
        this.rms = new Float32Array(this.s.length);
        for (var g = 0; g < this.s.length; g++) {
          var e = 0, a0 = this.s[g] | 0, n0 = this.n[g] | 0;
          for (var t = 0; t < n0; t += 2) { var v = this.pcm[a0 + t] || 0; e += v * v; }
          this.rms[g] = Math.sqrt(e / Math.max(1, n0 / 2)) + 1e-6;
        }
        var sets = [[], []], i;
        for (i = 0; i < this.s.length; i++) sets[this.on[i]].push(i);
        var self = this;
        sets.forEach(function (st) { st.sort(function (a, b) { return self.rpm[a] - self.rpm[b]; }); });
        if (!sets[0].length) sets[0] = sets[1];
        if (!sets[1].length) sets[1] = sets[0];
        this.sets = sets;
        this.lay = [0, 1].map(function () { return { i: -1, p: 0, r: 1, fi: -1, fp: 0, fr: 1, fade: 0, g: 1, jg: 1 }; });
        this.ready = this.s.length > 0;
      }
      // the next cycle to play: carry on through the recording while it stays
      // near the target rpm; otherwise splice to the cycle (and start offset)
      // whose opening best matches what would have followed, among those
      // recorded close to the target rpm (concatenative synthesis)
      pick(set, target, cur, pos) {
        if (cur >= 0 && !this.end[cur] && cur + 1 < this.s.length && Math.abs(this.rpm[cur + 1] / target - 1) < 0.15) { this.off = 0; return cur + 1; }
        var lo = 0, hi = set.length - 1;
        while (lo < hi) { var m = (lo + hi) >> 1; if (this.rpm[set[m]] < target) lo = m + 1; else hi = m; }
        var cands = [], k, o, q, j;
        for (k = Math.max(0, lo - 10); k <= Math.min(set.length - 1, lo + 9); k++) cands.push(set[k]);
        // when the recording runs ahead of or behind the game's rpm, skip or
        // repeat a cycle in the same stretch rather than leave it
        if (cur >= 0) {
          var rs = cur, re = cur;
          while (rs > 0 && !this.end[rs - 1] && cur - rs < 3) rs--;
          while (!this.end[re] && re + 1 < this.s.length && re - cur < 3) re++;
          for (j = rs; j <= re; j++) if (cands.indexOf(j) < 0) cands.push(j);
        }
        var best = set[lo], bs = 1e9, bo = 0, D = this.D;
        for (k = 0; k < cands.length; k++) {
          var c = cands[k], dr = Math.abs(Math.log(this.rpm[c] / target));
          if (dr > 0.09 && c !== set[lo]) continue;
          var same = cur >= 0 && Math.abs(c - cur) <= 3 && this.on[c] === this.on[cur];
          var pen = dr * 5 + (this.hist.indexOf(c) >= 0 ? 0.3 : 0) - (same ? 0.04 : 0);
          if (cur < 0) { if (pen < bs) { bs = pen; best = c; bo = 0; } continue; }
          // try starting the new cycle at each firing, so an uneven firing
          // pattern (a V8's lope, an odd-fire V10) stays in step, then
          // fine-tune the start by up to D samples
          var fp = this.n[c] / this.cyc, W = Math.min(fp * 0.9, this.D * 6), st = Math.max(1, W / 24);
          for (var f = 0; f < this.cyc; f++) {
            for (o = -D; o <= D; o += 4) {
              var oo = f * fp + o; if (f > 0 && oo > this.n[c] * 0.9) continue;
              var e1 = 0, e2 = 0;
              for (q = 0; q < W; q += st) { var u1 = this.pcm[(pos + q) | 0] || 0, u2 = this.pcm[(this.s[c] + oo + q) | 0] || 0; e1 += (u1 - u2) * (u1 - u2); e2 += u1 * u1 + u2 * u2; }
              var sc = e1 / (e2 + 1e-9) + pen;
              if (sc < bs) { bs = sc; best = c; bo = oo; }
            }
          }
        }
        // remember the last cycles so the same few don't loop (a buzz)
        this.hist[this.hp] = best; this.hp = (this.hp + 1) % this.hist.length; this.off = bo;
        return best;
      }
      // 4-point cubic (Catmull-Rom) interpolation: cleaner than linear when
      // a cycle is resampled to the exact rpm
      at(pos) {
        var i1 = pos | 0, f = pos - i1, P = this.pcm;
        var y0 = P[i1 - 1] || 0, y1 = P[i1] || 0, y2 = P[i1 + 1] || 0, y3 = P[i1 + 2] || 0;
        return y1 + 0.5 * f * (y2 - y0 + f * (2 * y0 - 5 * y1 + 4 * y2 - y3 + f * (3 * (y1 - y2) + y3 - y0)));
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
              L.fi = L.i; L.fp = L.p; L.fr = L.r;
              var ni = this.pick(set, target, L.i, L.i < 0 ? 0 : this.s[L.i] + L.p);
              // a straight continuation needs no blend; a splice gets one about
              // a third of a cycle long (2-8 ms)
              L.fade = L.fi < 0 || ni === L.fi + 1 ? 0 : Math.max(this.X, Math.min(this.X * 4, Math.round(this.n[ni] * 0.3)));
              L.fl = L.fade;
              if (L.i >= 0 && wj > 0.3) {
                if (ni === L.i + 1) this.st.cont++; else {
                  // how far the new cycle's start is from what would have followed
                  this.st.jump++; var e1 = 0, e2 = 0;
                  for (var q = 0; q < 32; q++) { var u1 = this.at(this.s[L.i] + this.n[L.i] + q), u2 = this.at(this.s[ni] + this.off + q); e1 += (u1 - u2) * (u1 - u2); e2 += u1 * u1 + u2 * u2; }
                  this.st.mis += e1 / (e2 + 1e-9);
                }
              }
              // match the level across a splice, then ease back over a few cycles
              if (L.fi >= 0 && ni !== L.fi + 1) L.g = Math.max(0.5, Math.min(2, L.g * this.rms[L.fi] / this.rms[ni]));
              else L.g = 1 + (L.g - 1) * 0.7;
              L.i = ni; L.p = this.off;
              // no two combustion cycles are identical: a touch of random
              // timing and level per cycle keeps it from sounding machine-made
              L.r = Math.min(2.2, Math.max(0.45, target / this.rpm[L.i] * dop * (1 + (Math.random() - 0.5) * 0.008)));
              L.jg = 1 + (Math.random() - 0.5) * 0.12;
            }
            var v = this.at(this.s[L.i] + L.p);
            if (L.fade > 0) {
              var u = 1 - L.fade / L.fl;
              v = v * Math.sin(u * Math.PI / 2) + this.at(this.s[L.fi] + L.fp) * Math.cos(u * Math.PI / 2);
              L.fp += L.fr; L.fade--;
            }
            L.p += L.r;
            out[s] += v * wj * L.g * L.jg;
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
    sm.node.port.postMessage({ pcm: buf.getChannelData(0).slice(), s: arr.s, n: arr.n, rpm: arr.rpm, on: arr.on, end: arr.end, xf: Math.round(buf.sampleRate * 0.002), d: Math.round(buf.sampleRate * 0.0006), cyc: Math.round(2 * bank.k) });
    sm.np = sm.node.parameters;
    sm.cut = TONE.cut[ex] * (build.turbo ? 0.78 : 1);
    sm.tone = c.createBiquadFilter(); sm.tone.type = 'lowpass'; sm.tone.Q.value = 0.6; sm.tone.frequency.value = sm.cut;
    sm.out = c.createGain(); sm.out.gain.value = 0;
    // the recordings come from camera mics: thin lows and a harsh top, so warm
    // them up (a low shelf for body, a gentle high shelf off the fizz)
    sm.low = c.createBiquadFilter(); sm.low.type = 'lowshelf'; sm.low.frequency.value = 110; sm.low.gain.value = 4;
    sm.high = c.createBiquadFilter(); sm.high.type = 'highshelf'; sm.high.frequency.value = 7000; sm.high.gain.value = -2.5;
    sm.node.connect(sm.low); sm.low.connect(sm.high); sm.high.connect(sm.tone); sm.tone.connect(sm.out); sm.out.connect(v.bus);
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
    // the rev limiter / shift cut flickers on and off many times a second:
    // smooth it into a stutter rather than a hard electronic chop
    sm.cutAmt = (sm.cutAmt || 0) + ((st.cut && thr > 0.5 ? 1 : 0) - (sm.cutAmt || 0)) * 0.3;
    sm.out.gain.setTargetAtTime(lvl * (1 - 0.5 * sm.cutAmt) * A.SMP_GAIN, t, 0.025);
  };
  A.SMP_GAIN = 1.5;

  var baseStop = A.stopAll;
  A.stopAll = function () {
    A.voices.forEach(function (v) { if (v.smp) try { v.smp.node.port.postMessage('stop'); v.smp.node.disconnect(); } catch (e) { /* gone */ } });
    baseStop();
  };
})();
