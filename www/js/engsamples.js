// ===========================================================================
// ENGINE RECORDINGS — engines play real recordings of the car the way Need
// for Speed Underground 2 and most racing games do it: a ladder of seamless
// loops, one every ~10% of rpm, each holding the engine at one steady rpm,
// for pulling (throttle open) and coasting. The loops are cut from real
// recordings offline (tools/engine_samples/loops.py): every stretch of the
// recording that passes through a loop's rpm is time-warped to that exact
// rpm, the best stretches are joined with phase-aligned crossfades, and the
// end is blended into the start. At run time the two loops either side of
// the engine's rpm play together, sped up or slowed a few percent to land
// on it and crossfaded by how close each is; throttle blends pulling and
// coasting. Every loop is locked to one engine-cycle phase, so loops fading
// in and out fire in step (no doubled pulses, no chorus), and nothing is
// ever spliced while playing. The modelled engine (enginesim.js) stays
// silent except for limiter cuts, pops and bangs, and the blower; the turbo
// comes from audio.js.
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
  function loopMain() {
    class LoopProc extends AudioWorkletProcessor {
      static get parameterDescriptors() {
        return [
          { name: 'rpm', defaultValue: 900, minValue: 0, maxValue: 20000, automationRate: 'k-rate' },
          { name: 'load', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
          { name: 'dop', defaultValue: 1, minValue: 0.5, maxValue: 2, automationRate: 'k-rate' },
          { name: 'cut', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
        ];
      }
      constructor() {
        super();
        this.alive = true; this.ready = false;
        this.port.onmessage = (e) => { if (e.data === 'stop') this.alive = false; else this.setup(e.data); };
      }
      setup(d) {
        var n = d.s.length, i, self = this;
        this.pcm = d.pcm; this.s = d.s; this.n = d.n; this.rpm = d.rpm; this.m = d.m; this.rho = d.rho;
        this.ni = new Int32Array(n);
        for (i = 0; i < n; i++) this.ni[i] = Math.round(this.n[i]);
        var lay = [[], []];
        for (i = 0; i < n; i++) lay[d.lay[i]].push(i);
        lay.forEach(function (l) { l.sort(function (a, b) { return self.rpm[a] - self.rpm[b]; }); });
        if (!lay[0].length) lay[0] = lay[1];
        if (!lay[1].length) lay[1] = lay[0];
        this.lay = lay;
        this.g = new Float32Array(n);       // each loop's gain, gliding to tg
        this.tg = new Float32Array(n);
        this.q = new Float64Array(n);       // where each loop is, in engine cycles
        this.on = new Uint8Array(n); this.act = [];
        // every so often each loop jumps to another of its cycles (on a short
        // crossfade), so an rpm held for long - a 2-step, the limiter, a
        // cruise - never repeats the same stretch over and over
        this.jt = new Float64Array(n); this.qo = new Float64Array(n); this.xf = new Int32Array(n);
        this.XF = Math.round(sampleRate * 0.012); this.jump = d.jump !== false;
        this.spread = d.spread == null ? 0.7 : d.spread;    // in ladder steps
        this.ph = 0;                        // the engine's cycle phase (0-1)
        this.gk = 1 - Math.exp(-1 / (sampleRate * 0.01));   // ~10 ms crossfade glide
        // doubling (a V12 from an inline six): a second read half a firing
        // later and half the loop away, so the two banks fire in between
        this.dbl = d.dbl ? 1 / (4 * d.k) : 0;
        this.ready = n > 0;
      }
      // 4-point cubic read at pos within a loop of L samples, wrapping round
      read(st, pos, L) {
        var P_ = this.pcm, i1 = pos | 0, f = pos - i1;
        var i0 = i1 - 1 < 0 ? i1 - 1 + L : i1 - 1, i2 = i1 + 1 >= L ? i1 + 1 - L : i1 + 1, i3 = i1 + 2 >= L ? i1 + 2 - L : i1 + 2;
        if (i1 >= L) i1 -= L;
        var y0 = P_[st + i0], y1 = P_[st + i1], y2 = P_[st + i2], y3 = P_[st + i3];
        return y1 + 0.5 * f * (y2 - y0 + f * (2 * y0 - 5 * y1 + 4 * y2 - y3 + f * (3 * (y1 - y2) + y3 - y0)));
      }
      // a soft spread over the nearest few loops (by distance in pitch), so a
      // fast rev up or down glides through their voices instead of flicking
      // from one to the next; equal power, corrected for how alike they are
      weighSpread(list, target, w) {
        var tg = this.tg, rpm = this.rpm, S = this.spread, lt = Math.log(target), n = list.length, i, k;
        var lo = 0, hi = n - 1;
        while (hi - lo > 1) { var md = (lo + hi) >> 1; if (rpm[list[md]] <= target) lo = md; else hi = md; }
        var a = Math.max(0, lo - 2), b = Math.min(n - 1, hi + 2), ws = [], sp = Math.log(1.1) * S, tot = 0, cr = 0;
        for (i = a; i <= b; i++) {
          // outside the ladder the end loop takes it all
          var d = Math.max(0, i === 0 ? Math.log(rpm[list[0]] / target) : 0) || Math.abs(Math.log(rpm[list[i]]) - lt);
          if ((i === 0 && target < rpm[list[0]]) || (i === n - 1 && target > rpm[list[n - 1]])) d = 0;
          var x = Math.exp(-0.5 * (d / sp) * (d / sp)); ws.push(x); tot += x * x;
        }
        for (k = 0; k + 1 < ws.length; k++) cr += 2 * this.rho[list[a + k]] * ws[k] * ws[k + 1];
        var nrm = w / Math.sqrt(tot + cr);
        for (k = 0; k < ws.length; k++) if (ws[k] > 0.02) tg[list[a + k]] += ws[k] * nrm;
      }
      // the two loops either side of the rpm, equal-power by distance in pitch
      weigh(list, target, w) {
        var tg = this.tg, rpm = this.rpm, last = list.length - 1;
        if (target <= rpm[list[0]]) { tg[list[0]] += w; return; }
        if (target >= rpm[list[last]]) { tg[list[last]] += w; return; }
        var lo = 0, hi = last;
        while (hi - lo > 1) { var md = (lo + hi) >> 1; if (rpm[list[md]] <= target) lo = md; else hi = md; }
        var a = list[lo], b = list[hi], x = Math.log(target / rpm[a]) / Math.log(rpm[b] / rpm[a]);
        // equal power, corrected for how alike the two loops are (in step,
        // alike loops add up louder than unrelated ones would)
        var ca = Math.cos(x * Math.PI / 2), cb = Math.sin(x * Math.PI / 2), nrm = w / Math.sqrt(1 + 2 * this.rho[a] * ca * cb);
        tg[a] += ca * nrm; tg[b] += cb * nrm;
      }
      process(inputs, outputs, P) {
        var out = outputs[0][0], k, j, i;
        if (!this.alive) return false;
        out.fill(0);
        if (!this.ready) return true;
        var target = Math.max(200, P.rpm[0]), dop = P.dop[0];
        // ignition cut (rev limiter, 2-step, shift cut): no combustion, so the
        // pulling sound gives way to the coasting one for the cut
        var load = P.load[0] * (1 - 0.85 * P.cut[0]);
        this.tg.fill(0);
        var W = this.spread ? this.weighSpread : this.weigh;
        W.call(this, this.lay[0], target, Math.cos(load * Math.PI / 2));
        W.call(this, this.lay[1], target, Math.sin(load * Math.PI / 2));
        // a loop coming in starts on the engine's current cycle phase, at a
        // random whole cycle (so two loops never line up the same stretch)
        for (i = 0; i < this.tg.length; i++) {
          if (this.tg[i] > 0 && !this.on[i]) {
            this.on[i] = 1; this.act.push(i);
            this.q[i] = this.ph + Math.floor(Math.random() * this.m[i]);
            this.jt[i] = sampleRate * (0.2 + Math.random() * 0.35); this.xf[i] = 0;
          }
        }
        // engine cycles (two crank turns) per sample
        var dq = target / 120 / sampleRate * dop, gk = this.gk, act = this.act;
        for (j = 0; j < act.length; j++) {
          i = act[j];
          var g = this.g[i], tgi = this.tg[i], q = this.q[i], m = this.m[i], st = this.s[i], N = this.n[i] / m, L = this.ni[i];
          var q2 = this.dbl ? this.dbl + Math.floor(m / 2) : 0, qo = this.qo[i], xf = this.xf[i], XF = this.XF, jt = this.jt[i] - out.length;
          if (jt <= 0 && xf === 0 && m > 2 && this.jump) {
            // jump a whole number of cycles: same phase, other material
            qo = q; q += 1 + Math.floor(Math.random() * (m - 1)); if (q >= m) q -= m;
            xf = XF; jt = sampleRate * (0.2 + Math.random() * 0.35);
          }
          for (k = 0; k < out.length; k++) {
            g += (tgi - g) * gk;
            q += dq; if (q >= m) q -= m;
            var v = this.read(st, q * N, L);
            if (q2) { var qq = q + q2; if (qq >= m) qq -= m; v = 0.72 * (v + this.read(st, qq * N, L)); }
            if (xf > 0) {
              qo += dq; if (qo >= m) qo -= m;
              var vo = this.read(st, qo * N, L);
              if (q2) { var qr = qo + q2; if (qr >= m) qr -= m; vo = 0.72 * (vo + this.read(st, qr * N, L)); }
              var u = 1 - xf / XF; v = v * Math.sin(u * Math.PI / 2) + vo * Math.cos(u * Math.PI / 2); xf--;
            }
            out[k] += g * v;
          }
          this.g[i] = g; this.q[i] = q; this.qo[i] = qo; this.xf[i] = xf; this.jt[i] = jt;
        }
        // the engine phase moves on; loops that faded out leave
        this.ph = (this.ph + dq * out.length) % 1;
        for (j = act.length - 1; j >= 0; j--) {
          i = act[j];
          if (this.tg[i] === 0 && this.g[i] < 1e-4) { this.g[i] = 0; this.on[i] = 0; act.splice(j, 1); }
        }
        return true;
      }
    }
    registerProcessor('pd-loops', LoopProc);
  }
  A.loopWorklet = loopMain;

  // load the loop worklet alongside the engine model's
  var baseLoad = A.loadWorklet;
  A.loadWorklet = function (ctx) {
    return baseLoad(ctx).then(function (ok) {
      if (!ok) return ok;
      var url = URL.createObjectURL(new Blob(['(' + loopMain.toString() + ')();'], { type: 'application/javascript' }));
      return ctx.audioWorklet.addModule(url).then(function () { A.loopsWk = true; return ok; }, function () { return ok; });
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

  // the worklet's view of a bank: loop start, length (in the decoded
  // buffer's samples), rpm, layer (0 coasting, 1 pulling), engine cycles,
  // and how alike each loop is to the next one up
  A.bankMsg = function (bank, pcm, sr, opts) {
    var L = bank.loops, k = sr / bank.sr, n = L.length;
    var d = { dbl: !!(opts && opts.dbl), k: bank.k, pcm: pcm.slice(), s: new Int32Array(n), n: new Float64Array(n), rpm: new Float32Array(n), lay: new Uint8Array(n), m: new Int32Array(n), rho: new Float32Array(n) };
    for (var i = 0; i < n; i++) { d.s[i] = Math.round(L[i][0] * k); d.n[i] = L[i][1] * k; d.rpm[i] = L[i][2]; d.lay[i] = L[i][3]; d.m[i] = L[i][5]; d.rho[i] = L[i][6] || 0; }
    return d;
  };

  function attach(v, eng, build) {
    var id = DR.engineBank(eng), bank = id && DR.ENG_BANKS[id], buf = id && decoded[id];
    if (!buf || !A.loopsWk) { if (id) A.loadBank(id); return false; }
    var c = A.ctx, ex = build.exhaust || 0;
    var sm = v.smp = { bank: bank };
    sm.node = new AudioWorkletNode(c, 'pd-loops', { numberOfInputs: 0, outputChannelCount: [1] });
    sm.node.port.postMessage(A.bankMsg(bank, buf.getChannelData(0), buf.sampleRate, (DR.ENG_BANK_OPTS || {})[eng.id]));
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

  // with a recording carrying the engine, the modelled pops and limiter
  // bangs come far less often (a real limiter pops now and then; synthetic
  // bangs on every cut sound electronic)
  var baseCfg = A.engineConfig;
  A.engineConfig = function (eng, build) {
    var c = baseCfg(eng, build), id = DR.engineBank(eng);
    if (id && decoded[id] && A.loopsWk && !A.forceSynth && !A.noSamples) { c.bangChance *= 0.3; c.bangLvl *= 0.7; c.crackle *= 0.5; }
    return c;
  };

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
    // the rev limiter / 2-step / shift cut: each cut swaps the pulling sound
    // for the coasting one and drops the level, crisply (a slow swell on
    // every flicker of the limiter sounds like a wah, not an engine)
    var cut = st.cut && thr > 0.5 ? 1 : 0;
    sm.np.get('cut').setTargetAtTime(cut, t, 0.004);
    sm.out.gain.setTargetAtTime(lvl * (1 - 0.4 * cut) * A.SMP_GAIN, t, cut ? 0.005 : 0.01);
  };
  A.SMP_GAIN = 1.5;

  var baseStop = A.stopAll;
  A.stopAll = function () {
    A.voices.forEach(function (v) { if (v.smp) try { v.smp.node.port.postMessage('stop'); v.smp.node.disconnect(); } catch (e) { /* gone */ } });
    baseStop();
  };
})();
