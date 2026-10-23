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
          { name: 'lim', defaultValue: 0, minValue: 0, maxValue: 2, automationRate: 'k-rate' },  // share of time the ignition is cut (2: a shift cut)
          { name: 'pre', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },  // free revving (not launched)
          { name: 'ign', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },  // ignition-cut limiter (2-step, race ECU)
          { name: 'crk', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' }   // how readily it pops on a lift
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
        this.gkf = 1 - Math.exp(-1 / (sampleRate * 0.005));   // quick swap on an ignition cut
        // rev limiter: a bounce of its own (see limiter())
        this.lh = 0; this.bph = 0; this.bT = 0; this.bD = 0; this.depth = 0; this.wasCut = false;
        this.cg = 1; this.bark = 0; this.popAt = -1; this.env = new Float32Array(128);
        this.ck = 1 - Math.exp(-1 / (sampleRate * 0.003));      // firing again: straight back
        this.ckf = 1 - Math.exp(-1 / (sampleRate * 0.012));     // cut: the pipe rings down
        this.cutLvl = 0.45; this.barkAmt = 0.35;
        // real exhaust pops (a shared bank cut from the recordings)
        this.pp = d.pops || null; this.pv = []; this.popLvl = d.popLvl || 0.3;
        this.prevLoad = 0; this.crkT = 0;
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
      // The rev limiter. The game's physics cuts and restores the ignition
      // many times a frame (a few rpm either side of the limit), far faster
      // than any real engine bounces, and a frame only sees a sample of it.
      // So the sound bounces on its own, the way a real limiter does: cut
      // (no combustion - the revs sag, the note collapses to the dry pumping
      // of the engine), then the charge lights again with a bark and the
      // revs climb back, over and over. A stock fuel cut bounces slowly and
      // deeply ("bap-bap-bap"), an ignition cut (2-step, race ECU) fast and
      // shallow with the exhaust popping; in gear the car holds the revs up,
      // so the dips are shallower. A sustained cut (a sequential shift) is
      // just a cut.
      limiter(lim, pre, ign, crk, B) {
        var sr = sampleRate;
        if (lim > 0.02) this.lh = sr * 0.08; else this.lh -= B;
        if (this.lh <= 0) { this.bph = this.bT = 0; this.wasCut = false; return 0; }
        if (lim > 1.5) { this.wasCut = true; this.bph = this.bT = 0; return -1; }
        if (this.bph >= this.bT) {
          var f = ign ? (pre ? 16 : 13) : (pre ? 7 : 10);
          f *= 0.85 + 0.3 * Math.random();
          this.bT = sr / f; this.bD = this.bT * Math.min(0.62, Math.max(0.35, lim)); this.bph = 0;
          this.depth = (ign ? 0.022 : 0.05) * (pre ? 1 : 0.5) * (0.8 + 0.4 * Math.random());
          // no two bounces alike: how far the note falls and how hard it barks
          this.cutLvl = (ign ? 0.45 : 0.4) * (0.8 + 0.4 * Math.random()); this.barkAmt = 0.2 + 0.3 * Math.random();
          // unburnt charge lighting off in the hot pipe: an ignition cut pops
          // (more with a free-flowing exhaust), a fuel cut hardly ever
          var pc = ign ? (pre ? 0.22 + 0.35 * crk : 0.1 + 0.25 * crk) : 0.02 + 0.08 * crk;
          this.popAt = this.pp && Math.random() < pc ? Math.random() * 0.7 * this.bD : -1;
        }
        var c = this.bph < this.bD;
        var off = c ? -this.depth * this.bph / this.bD : -this.depth * (1 - (this.bph - this.bD) / (this.bT - this.bD));
        if (!c && this.wasCut) this.bark = this.barkAmt;   // the first firing after a cut
        this.wasCut = c;
        if (this.popAt >= 0 && this.bph >= this.popAt) { this.pop(0.6 + Math.random() * 0.4); this.popAt = -1; }
        this.bph += B;
        return c ? 1 + off : -(1 + off);              // sign: cut or firing; size: pitch factor
      }
      pop(g) {
        if (!this.pp || this.pv.length >= 4) return;
        var i = Math.floor(Math.random() * this.pp.s.length);
        this.pv.push({ s: this.pp.s[i], n: this.pp.n[i], p: 0, r: (0.88 + Math.random() * 0.24) * this.pp.k, g: g * this.popLvl });
      }
      process(inputs, outputs, P) {
        var out = outputs[0][0], k, j, i, B = out.length;
        if (!this.alive) return false;
        out.fill(0);
        if (!this.ready) return true;
        var target = Math.max(200, P.rpm[0]), dop = P.dop[0], rawLoad = P.load[0];
        var lm = this.limiter(P.lim[0], P.pre[0] > 0.5, P.ign[0] > 0.5, P.crk[0], B);
        var cutNow = lm > 0 || lm === -1;
        if (lm !== 0 && lm !== -1) target *= Math.abs(lm);
        // cut: no combustion, so the pulling sound gives way to the coasting one
        var load = cutNow ? rawLoad * 0.05 : rawLoad;
        // a lift at high revs with a free-flowing exhaust: unburnt fuel
        // lighting off in the pipe for a moment (crackles and pops)
        if (this.prevLoad - rawLoad > 0.03 && rawLoad < 0.3 && target > 2800) this.crkT = sampleRate * 0.9;
        this.prevLoad += (rawLoad - this.prevLoad) * 0.02;
        if (this.crkT > 0) { this.crkT -= B; if (Math.random() < P.crk[0] * 7 * B / sampleRate) this.pop(0.25 + Math.random() * 0.45); }
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
        var dq = target / 120 / sampleRate * dop, gk = this.lh > 0 ? this.gkf : this.gk, act = this.act;
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
        // the cut's level: the note collapses during a cut, and the first
        // firing after it barks
        // (the note dies away over ~15 ms as the pipe stops ringing, and comes
        // straight back when the charge lights)
        var cgT = cutNow ? (lm === -1 ? 0.45 : this.cutLvl) : 1, cg = this.cg, ck = cgT < cg ? this.ckf : this.ck, bark = this.bark, bd = Math.exp(-1 / (sampleRate * 0.02));
        for (k = 0; k < B; k++) { cg += (cgT - cg) * ck; bark *= bd; out[k] *= cg * (1 + bark); }
        this.cg = cg; this.bark = bark;
        // pops on top
        for (j = this.pv.length - 1; j >= 0; j--) {
          var pv = this.pv[j], PP = this.pp.pcm;
          for (k = 0; k < B && pv.p < pv.n - 1; k++) {
            var i0 = pv.p | 0, fr = pv.p - i0;
            out[k] += pv.g * (PP[pv.s + i0] * (1 - fr) + PP[pv.s + i0 + 1] * fr);
            pv.p += pv.r;
          }
          if (pv.p >= pv.n - 1) this.pv.splice(j, 1);
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
      var p = A.ctx.decodeAudioData(b64ToBuf(id === '__pops' ? DR.ENG_POPS.data : DR.ENG_BANKS[id].data), done, function () { done(null); });
      if (p && p.catch) p.catch(function () { done(null); });
    } catch (e) { done(null); }
  };
  A.banksReady = function (engs) {
    return (!DR.ENG_POPS || decoded.__pops !== undefined) && engs.every(function (e) { var id = DR.engineBank(e); return !id || decoded[id] !== undefined; });
  };
  // fn once every bank these engines need (and the pops) is decoded (or failed)
  A.whenBanks = function (engs, fn) {
    var ids = engs.map(function (e) { return DR.engineBank(e); }).filter(Boolean);
    if (DR.ENG_POPS) ids.push('__pops');
    var left = ids.length;
    if (!left) return fn();
    ids.forEach(function (id) { A.loadBank(id, function () { if (--left === 0) fn(); }); });
  };
  A.preloadEngines = function (engs) {
    if (DR.ENG_POPS) A.loadBank('__pops');
    engs.forEach(function (e) { var id = DR.engineBank(e); if (id) A.loadBank(id); });
  };

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
    // pops land about 10 dB over the engine's level
    var e = 0, cnt = 0;
    for (i = 0; i < d.pcm.length; i += 7) { e += d.pcm[i] * d.pcm[i]; cnt++; }
    d.popLvl = 3.2 * Math.sqrt(e / Math.max(1, cnt));
    var pb = decoded.__pops, PB = DR.ENG_POPS;
    if (pb && PB) {
      var pk = pb.sampleRate / PB.sr, np = PB.pops.length;
      d.pops = { pcm: pb.getChannelData(0).slice(), s: new Int32Array(np), n: new Int32Array(np), k: 1 };
      for (i = 0; i < np; i++) { d.pops.s[i] = Math.round(PB.pops[i][0] * pk); d.pops.n[i] = Math.round(PB.pops[i][1] * pk); }
      d.pops.k = pb.sampleRate / sr;
    }
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
    // how the limiter cuts: a race exhaust / ECU or a 2-step cuts the
    // ignition (fast, popping); a stock car cuts fuel (slow, deep bounce)
    sm.ign = build.twostep || build.antilag || ex >= 2 ? 1 : 0;
    // how readily it pops and crackles on a lift
    sm.crk = Math.min(1, [0.05, 0.25, 0.6, 0.9][ex] * (build.turbo ? 0.6 : 1) + (build.antilag ? 0.5 : 0));
    if (!decoded.__pops && DR.ENG_POPS) A.loadBank('__pops');
    // the recording carries the engine: silence the modelled exhaust note and
    // engine-bay sounds, keeping its limiter cuts, pops, bangs and blower
    if (v.np) { v.np.get('exh').value = 0; v.np.get('mech').value = 0; }
    return true;
  }

  // with a recording carrying the engine, its pops and bangs are real ones
  // too (played by the loop worklet): the modelled ones stay quiet
  var baseCfg = A.engineConfig;
  A.engineConfig = function (eng, build) {
    var c = baseCfg(eng, build), id = DR.engineBank(eng);
    if (id && decoded[id] && A.loopsWk && !A.forceSynth && !A.noSamples) { c.bangChance = 0; c.crackle = 0; }
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
    // the physics flickers a few rpm either side of the limit many times a
    // frame; on the limiter the worklet makes the bounce, so smooth it out
    var cf = Math.min(1, Math.max(0, st.cutFrac != null ? st.cutFrac : (st.cut ? 1 : 0))) * (thr > 0.5 || st.shiftCut ? 1 : 0);
    sm.np.get('rpm').setTargetAtTime(r, t, cf > 0 || sm.limT > t ? 0.05 : 0.012);
    if (cf > 0) sm.limT = t + 0.15;
    sm.np.get('lim').setValueAtTime(st.shiftCut ? 2 : cf, t);
    sm.np.get('pre').setValueAtTime(st.pre ? 1 : 0, t);
    sm.np.get('ign').setValueAtTime(sm.ign || (st.pre && st.twostep) ? 1 : 0, t);
    sm.np.get('crk').setValueAtTime(sm.crk, t);
    sm.np.get('load').setTargetAtTime(on, t, 0.03);
    sm.np.get('dop').setTargetAtTime(st.doppler || 1, t, 0.05);
    // off throttle the exhaust note loses its top end (as racing-game sound
    // designers EQ it); level grows with load and rpm
    sm.tone.frequency.setTargetAtTime(sm.cut * (0.5 + 0.5 * on), t, 0.05);
    var lvl = v.vol * sm.lvl * (0.3 + 0.7 * sm.load) * (0.45 + 0.55 * Math.min(1, r / (v.b.red || 7000))) * (1 + (st.nos ? 0.15 : 0));
    // (the limiter's cuts and the pops are shaped in the worklet)
    sm.out.gain.setTargetAtTime(lvl * A.SMP_GAIN, t, 0.02);
  };
  A.SMP_GAIN = 1.5;

  var baseStop = A.stopAll;
  A.stopAll = function () {
    A.voices.forEach(function (v) { if (v.smp) try { v.smp.node.port.postMessage('stop'); v.smp.node.disconnect(); } catch (e) { /* gone */ } });
    baseStop();
  };
})();
