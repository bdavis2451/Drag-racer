// ===========================================================================
// ENGINE SIM — physically inspired engine & exhaust sound, run on the audio
// thread (AudioWorklet).
//
// Each cylinder fires an exhaust pulse at its real crank angle. The pulse
// travels down its own header pipe, merges with its bank in a collector, then
// runs down the exhaust (one pipe, or one per bank with an H/X crossover),
// through the muffler and out of the tailpipe. Pipe lengths, reflections,
// muffler damping, turbine smoothing, cam timing and ignition cuts all shape
// the sound, so an inline-4 and a cross-plane V8 differ in rhythm and tone,
// not just pitch. Falls back to the simple synth in audio.js if the device
// can't run an AudioWorklet.
// ===========================================================================
(function () {
  var DR = globalThis.DR, A = DR.Audio;

  // ---------------------------------------------------------------- worklet
  // This function's source is loaded into the audio thread as a module.
  function workletMain() {
    var C = 343;                                      // speed of sound in the pipe, m/s

    function Delay(size) { this.b = new Float32Array(size); this.n = size; this.i = 0; }
    Delay.prototype.write = function (x) { this.b[this.i] = x; this.i = this.i + 1 === this.n ? 0 : this.i + 1; };
    Delay.prototype.read = function (d) {             // d samples back, fractional
      var p = this.i - 1 - d;
      while (p < 0) p += this.n;
      var i0 = p | 0, f = p - i0, i1 = i0 + 1 === this.n ? 0 : i0 + 1;
      return this.b[i0] + (this.b[i1] - this.b[i0]) * f;
    };

    // A pipe closed at the inlet and open at the outlet: the wave travels the
    // length (delay D), part of it reflects back (inverted, losing highs) and
    // returns 2D later. Gives quarter-wave resonances set by the length.
    function Pipe(sr, len, refl, damp) {
      this.d = new Delay(16384); this.lp = 0;
      this.D = Math.max(2, Math.min(8000, len / C * sr)); this.g = refl; this.a = damp;
    }
    Pipe.prototype.tick = function (x) {
      var back = this.d.read(2 * this.D);
      this.lp += (back - this.lp) * this.a;
      this.d.write(x + this.g * this.lp);
      return this.d.read(this.D);
    };

    function OnePole(fc, sr) { this.y = 0; this.set(fc, sr); }
    OnePole.prototype.set = function (fc, sr) { this.k = 1 - Math.exp(-2 * Math.PI * fc / sr); };
    OnePole.prototype.tick = function (x) { this.y += (x - this.y) * this.k; return this.y; };

    var seed = 22222;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }

    class EngineProc extends AudioWorkletProcessor {
      static get parameterDescriptors() {
        return [
          { name: 'rpm', defaultValue: 900, minValue: 0, maxValue: 20000, automationRate: 'k-rate' },
          { name: 'load', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
          { name: 'cut', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
          { name: 'nos', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
          { name: 'boost', defaultValue: 0, minValue: 0, maxValue: 100, automationRate: 'k-rate' }
        ];
      }
      constructor() {
        super();
        this.c = null; this.alive = true;
        this.port.onmessage = (e) => { if (e.data === 'stop') this.alive = false; else this.setup(e.data); };
      }
      setup(c) {
        var sr = sampleRate, i, n = c.angles.length;
        this.c = c; this.phase = 0;
        this.t = new Float32Array(n).fill(-1); this.amp = new Float32Array(n); this.pop = new Float32Array(n);
        this.hdr = []; for (i = 0; i < n; i++) this.hdr.push(new Pipe(sr, c.hdrLen[i], c.hdrRefl, c.hdrDamp));
        this.main = [new Pipe(sr, c.pipeLen[0], c.pipeRefl, c.pipeDamp), new Pipe(sr, c.pipeLen[1], c.pipeRefl, c.pipeDamp)];
        this.muf = [[new OnePole(c.mufHz, sr), new OnePole(c.mufHz, sr)], [new OnePole(c.mufHz * 1.04, sr), new OnePole(c.mufHz * 1.04, sr)]];
        this.turb = [new OnePole(c.turboHz || 400, sr), new OnePole(c.turboHz || 400, sr)];
        this.bankP = [0, 0];
        this.prevY = [0, 0]; this.dc = [0, 0]; this.dc2 = [0, 0];
        this.hpK = 1 - Math.exp(-2 * Math.PI * 55 / sr);
        this.knock = 0; this.tick = 0; this.nz = 0;
        this.decayP = Math.exp(-1 / (sr * 0.0045));
      }
      fire(i, load, cut, nos, rpm) {
        var c = this.c, b = c.banks[i];
        // pulse strength: more fuel & air under load; a pressurized collector
        // (a bank pulse just before) weakens the next one -> uneven V8 rhythm
        // every combustion differs a little (a few % cycle to cycle, more at idle)
        var cov = 1 + (rnd() - 0.5) * (0.05 + 0.07 * Math.max(0, 1 - rpm / 3000));
        var a = (0.22 + 0.78 * load) * c.cylVar[i] * cov * (1 - 0.3 * Math.min(1, this.bankP[b]));
        this.bankP[b] += 0.7;
        // cam overlap: unsteady idle, occasional misfire
        var idle = Math.max(0, 1 - (rpm - 800) / 2500);
        a *= 1 - c.lope * idle * rnd();
        if (rnd() < c.misfire * idle) a *= 0.15;
        if (cut) a *= 0.08 + 0.1 * rnd();                 // ignition cut: no combustion
        a *= 1 + nos * 0.3;
        // lifting off at speed: unburnt fuel lights in the hot pipe
        var popNow = load < 0.12 && rpm > 2600 && rnd() < c.crackle * 0.022;
        this.pop[i] = popNow ? 1 : 0;
        if (popNow) a = 1.1 + rnd() * 0.9;
        this.amp[i] = a; this.t[i] = 0;
        if (c.knock) this.knock = Math.max(this.knock, c.knock * (0.3 + 0.7 * load));
      }
      process(inputs, outputs, P) {
        var out = outputs[0], L = out[0], R = out[1] || out[0];
        if (!this.c) { return this.alive; }
        var c = this.c, n = c.angles.length, sr = sampleRate, i;
        var rpm = Math.max(200, P.rpm[0]), load = P.load[0], cut = P.cut[0] > 0.5, nos = P.nos[0];
        var dphi = rpm * 6 / sr * (c.cycle === 360 ? 1 : 1);   // crank degrees per sample
        // pulse rise time: the blowdown is a gas event lasting a millisecond or
        // two whatever the rpm, so at idle each pulse stays crisp
        // off throttle the cylinder holds little gas: weaker, softer pulses
        var tau = Math.max(1.5, Math.min(c.blowDeg / dphi, c.blowMs * 0.001 * sr)) * (1 + 0.7 * (1 - load));
        var invTau = 1 / tau, life = tau * 7;
        var noiseAmt = c.noise * (0.15 + 0.85 * load) * (1 + nos * 0.5);
        var drive = c.drive * (1 + nos * 0.6), norm = 1 / Math.tanh(drive);
        var x = c.xpipe, turbo = c.turbo ? Math.min(1, 0.45 + P.boost[0] * 0.02) : 0;
        for (var s = 0; s < L.length; s++) {
          var prev = this.phase;
          this.phase += dphi;
          var wrapped = this.phase >= c.cycle;
          if (wrapped) this.phase -= c.cycle;
          for (i = 0; i < n; i++) {
            var a = c.angles[i];
            if (wrapped ? (a > prev || a <= this.phase) : (a > prev && a <= this.phase)) this.fire(i, load, cut, nos, rpm);
          }
          // turbulence: filtered noise (rasp rather than white hiss)
          this.nz += (rnd() * 2 - 1 - this.nz) * 0.35;
          // exhaust pulses -> header pipes -> bank collectors
          var col0 = 0, col1 = 0;
          for (i = 0; i < n; i++) {
            var v = 0, tt = this.t[i];
            if (tt >= 0) {
              var u = tt * invTau;
              v = this.amp[i] * u * Math.exp(1 - u);
              v += v * this.nz * 1.6 * (noiseAmt + this.pop[i] * 0.8);     // turbulent gas
              this.t[i] = tt + 1 > life ? -1 : tt + 1;
            }
            var h = this.hdr[i].tick(v);
            if (c.banks[i]) col1 += h; else col0 += h;
          }
          // collector pressure fades over ~100 crank degrees, at any rpm
          var dec = Math.exp(-dphi / 100);
          this.bankP[0] *= dec; this.bankP[1] *= dec;
          // H/X-pipe crossover mixes the banks
          var m0 = col0 + x * (col1 - col0), m1 = col1 + x * (col0 - col1);
          // turbine: smooths the pulses into a duller, quieter flow
          if (turbo) {
            m0 = m0 + (this.turb[0].tick(m0) * 1.4 - m0) * turbo;
            m1 = m1 + (this.turb[1].tick(m1) * 1.4 - m1) * turbo;
          }
          // diesel combustion clatter
          if (this.knock > 0.001) {
            var kn = (rnd() * 2 - 1) * this.knock;
            m0 += kn; m1 += kn; this.knock *= 0.993;
          }
          var o0 = this.main[0].tick(m0), o1 = this.main[1].tick(m1);
          // muffler: two-stage low-pass, some energy straight through
          var f0 = this.muf[0][1].tick(this.muf[0][0].tick(o0)), f1 = this.muf[1][1].tick(this.muf[1][0].tick(o1));
          o0 = f0 + (o0 - f0) * c.mufBypass; o1 = f1 + (o1 - f1) * c.mufBypass;
          // tailpipe radiation favours higher frequencies a little
          var r0 = o0 + c.rad * (o0 - this.prevY[0]), r1 = o1 + c.rad * (o1 - this.prevY[1]);
          this.prevY[0] = o0; this.prevY[1] = o1;
          // remove DC, then soft-clip for grit
          // high-pass ~55 Hz (12 dB/oct): the long pipe's sub-bass boom isn't what you hear
          this.dc[0] += (r0 - this.dc[0]) * this.hpK; this.dc[1] += (r1 - this.dc[1]) * this.hpK;
          r0 -= this.dc[0]; r1 -= this.dc[1];
          this.dc2[0] += (r0 - this.dc2[0]) * this.hpK; this.dc2[1] += (r1 - this.dc2[1]) * this.hpK;
          r0 = Math.tanh((r0 - this.dc2[0]) * c.gain * drive) * norm;
          r1 = Math.tanh((r1 - this.dc2[1]) * c.gain * drive) * norm;
          L[s] = r0 * c.panA + r1 * (1 - c.panA);
          R[s] = r1 * c.panA + r0 * (1 - c.panA);
        }
        return this.alive;
      }
    }
    registerProcessor('pd-engine', EngineProc);
  }

  // ---------------------------------------------------------------- loader
  A.wk = false; A.wkPending = false; A.wkQueue = [];
  A.loadWorklet = function (ctx) {
    if (!ctx.audioWorklet || typeof AudioWorkletNode === 'undefined') return Promise.resolve(false);
    var src = '(' + workletMain.toString() + ')();';
    var url = URL.createObjectURL(new Blob([src], { type: 'application/javascript' }));
    return ctx.audioWorklet.addModule(url).then(function () { return true; }, function () { return false; });
  };
  var baseInit = A.init;
  A.init = function () {
    var had = !!A.ctx;
    baseInit();
    if (had || !A.ctx) return;
    A.wkPending = true;
    A.loadWorklet(A.ctx).then(function (ok) {
      A.wk = ok; A.wkPending = false;
      var q = A.wkQueue; A.wkQueue = [];
      q.forEach(function (fn) { fn(); });
    });
  };
  // Run fn once the audio engine is ready (immediately if it already is).
  A.whenReady = function (fn) { if (A.wkPending) A.wkQueue.push(fn); else fn(); };

  // ---------------------------------------------------------------- engine layouts
  // angles: crank degrees at which each cylinder's exhaust pulse starts, in
  // firing order. banks: which collector (0/1) each cylinder feeds.
  var LAYOUTS = {
    i3:     { cycle: 720, angles: [0, 240, 480],                          banks: [0, 0, 0] },
    i4:     { cycle: 720, angles: [0, 180, 360, 540],                     banks: [0, 0, 0, 0] },
    boxer:  { cycle: 720, angles: [0, 180, 360, 540],                     banks: [0, 0, 1, 1], twin: true, unequal: true },
    i6:     { cycle: 720, angles: [0, 120, 240, 360, 480, 600],           banks: [0, 1, 0, 1, 0, 1] },
    v6:     { cycle: 720, angles: [0, 120, 240, 360, 480, 600],           banks: [0, 1, 0, 1, 0, 1], twin: true },
    // cross-plane V8, firing order 1-8-4-3-6-5-7-2: L R R L R L L R
    v8:     { cycle: 720, angles: [0, 90, 180, 270, 360, 450, 540, 630], banks: [0, 1, 1, 0, 1, 0, 0, 1], twin: true },
    v10:    { cycle: 720, angles: [0, 72, 144, 216, 288, 360, 432, 504, 576, 648], banks: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1], twin: true },
    v12:    { cycle: 720, angles: [0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660], banks: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], twin: true },
    // rotary: each rotor's peripheral exhaust port opens once per shaft turn
    rotary: { cycle: 360, angles: [0, 180],                               banks: [0, 0], sharp: true },
    diesel: { cycle: 720, angles: [0, 120, 240, 360, 480, 600],           banks: [0, 1, 0, 1, 0, 1], diesel: true }
  };
  //            stock   cat-back straight race(open)
  var EXH = {
    pipe:     [3.6,     3.4,     3.2,     1.6],    // m, header collector to tailpipe
    refl:     [-0.18,   -0.3,    -0.45,   -0.4],   // how much the pipe rings
    damp:     [0.025,   0.032,   0.045,   0.055],  // echoes come back low and soft (~180-400 Hz)
    mufHz:    [480,     1050,    2400,    3600],
    bypass:   [0.04,    0.12,    0.3,     0.42],
    xpipe:    [0.4,     0.28,    0.08,    0],      // bank crossover on twin-bank engines
    noise:    [0.1,     0.16,    0.24,    0.32],
    drive:    [0.7,     1.0,     1.5,     1.8],
    crackle:  [0,       0.2,     0.7,     1],
    makeup:   [2.7,     1.9,     1.25,    0.95]  // keeps stock ~8 dB under straight pipes, not 19
  };
  //            stock manifold, shorty, long-tube, race
  var HDR = { len: [0.32, 0.45, 0.85, 1.0], refl: [-0.1, -0.14, -0.22, -0.26], damp: [0.06, 0.08, 0.1, 0.12], rad: [0.2, 0.28, 0.38, 0.45] };

  function cfgRand(seed) { return function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }

  // Everything the audio thread needs to sound like this engine with these parts.
  A.engineConfig = function (eng, build) {
    var lay = A.layoutOf(eng), Lc = LAYOUTS[lay], n = Lc.angles.length;
    var ex = build.exhaust, hd = build.headers, cam = build.cam;
    var r = cfgRand(eng.disp * 1000 + eng.cyl * 7 + 3), i;
    var hdrLen = [], cylVar = [];
    for (i = 0; i < n; i++) {
      var len = HDR.len[hd];
      if (hd === 0) len *= 0.94 + r() * 0.12;                    // cast manifolds: runners differ a little
      if (Lc.unequal && hd < 2) len = Lc.banks[i] ? 0.95 : 0.35; // boxer: the classic rumble
      hdrLen.push(len);
      cylVar.push(0.98 + r() * 0.04);                            // no two cylinders are quite identical
    }
    var twin = !!Lc.twin;
    var pipe = EXH.pipe[ex];
    var big = Math.min(1, eng.disp / 7);
    return {
      cycle: Lc.cycle, angles: Lc.angles, banks: Lc.banks, cylVar: cylVar,
      hdrLen: hdrLen, hdrRefl: HDR.refl[hd], hdrDamp: HDR.damp[hd],
      pipeLen: [pipe, pipe * (twin ? 1.07 : 1)],
      pipeRefl: EXH.refl[ex], pipeDamp: EXH.damp[ex],
      mufHz: EXH.mufHz[ex] * (Lc.sharp ? 1.6 : 1) * (Lc.diesel ? 0.7 : 1) * (1.15 - big * 0.3),
      mufBypass: EXH.bypass[ex],
      xpipe: twin ? EXH.xpipe[ex] : 0.5,
      rad: HDR.rad[hd],
      // exhaust valve timing: bigger cams open earlier -> sharper blowdown
      blowDeg: (Lc.sharp ? 22 : Lc.diesel ? 50 : 62) - cam * 7 - hd * 2,
      blowMs: (Lc.sharp ? 1.1 : 2.8) - cam * 0.2 - hd * 0.08,
      noise: EXH.noise[ex] + cam * 0.04 + (Lc.sharp ? 0.15 : 0),
      drive: EXH.drive[ex] + (Lc.diesel ? 0.6 : 0),
      lope: [0, 0.12, 0.25, 0.4, 0.55][cam], misfire: [0, 0, 0.01, 0.03, 0.06][cam],
      crackle: Math.max(EXH.crackle[ex] * (build.turbo ? 0.4 : 1), build.antilag ? 0.7 : 0),
      turbo: !!build.turbo, turboHz: 330,
      knock: Lc.diesel ? 0.35 : 0,
      panA: twin ? 0.68 : 0.5,
      // bigger engines move more gas per pulse and are louder
      gain: 1.15 * Math.pow(eng.disp / 3, 0.6) * EXH.makeup[ex]
    };
  };
  A.LAYOUTS = LAYOUTS;
})();
