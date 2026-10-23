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

    // Topology-preserving state-variable filter (stable when tuned on the fly);
    // used as a band-pass resonator for ringing parts of the engine.
    function SVF(fc, q, sr) { this.ic1 = 0; this.ic2 = 0; this.set(fc, q, sr); }
    SVF.prototype.set = function (fc, q, sr) {
      var g = Math.tan(Math.PI * Math.min(fc, sr * 0.45) / sr), k = 1 / q;
      this.a1 = 1 / (1 + g * (g + k)); this.a2 = g * this.a1; this.a3 = g * this.a2;
    };
    SVF.prototype.bp = function (x) {
      var v3 = x - this.ic2, v1 = this.a1 * this.ic1 + this.a2 * v3, v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
      this.ic1 = 2 * v1 - this.ic1; this.ic2 = 2 * v2 - this.ic2;
      return v1;
    };

    var seed = 22222;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }

    class EngineProc extends AudioWorkletProcessor {
      static get parameterDescriptors() {
        return [
          { name: 'rpm', defaultValue: 900, minValue: 0, maxValue: 20000, automationRate: 'k-rate' },
          { name: 'load', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
          { name: 'cut', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
          { name: 'nos', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
          { name: 'boost', defaultValue: 0, minValue: 0, maxValue: 100, automationRate: 'k-rate' },
          // how much of the modelled exhaust note to play (lower when a recording carries it)
          { name: 'exh', defaultValue: 1, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
          // engine-bay sounds (intake, valvetrain, block, belts); off when a recording plays
          { name: 'mech', defaultValue: 1, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
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
        this.knock = 0; this.tick = 0; this.nz = 0; this.mk = 0; this.spd = 1; this.spdS = 1;
        // Everything else in the cycle, timed from each cylinder's exhaust
        // valve opening (EVO): combustion ~140 deg before it, the exhaust valve
        // closes ~230 deg after, the intake gulps ~250 deg after and the
        // intake valve closes ~450 deg after. Types: 0 exhaust, 1 intake,
        // 2 valve closing, 3 combustion.
        var ev = [];
        for (i = 0; i < n; i++) {
          var a0 = c.angles[i], m = c.cycle;
          function at(d) { return ((a0 + d) % m + m) % m; }
          ev.push([a0, 0, i]);
          ev.push([at(c.rotary ? 140 : 250), 1, i]);
          if (!c.rotary) { ev.push([at(230), 2, i]); ev.push([at(450), 2, i]); }
          ev.push([at(-140), 3, i]);
        }
        this.ev = ev;
        this.tin = new Float32Array(n).fill(-1); this.ain = new Float32Array(n);
        this.inPipe = new Pipe(sr, c.inRunner, -0.3, 0.08);
        this.inLp = [new OnePole(c.inHz, sr), new OnePole(c.inHz, sr)];
        this.inNz = new SVF(c.inNoiseHz, 0.9, sr);
        this.hiss = new SVF(3800, 2.2, sr);
        this.valve = new SVF(c.valveHz, 9, sr); this.valve2 = new SVF(c.valveHz * 1.63, 11, sr);
        this.block1 = new SVF(c.blockHz, 7, sr); this.block2 = new SVF(c.blockHz * 2.1, 9, sr);
        this.kick = { v: 0, b: 0 };
        this.inHp = 0; this.bayHp = 0;
        this.accPh = 0; this.bPh = 0; this.inFlow = 0;
        this.bk = { t: new Float32Array(8).fill(-1), a: new Float32Array(8), f: new Float32Array(8), big: new Uint8Array(8), bank: new Uint8Array(8), next: 0 };
        this.pend = []; this.bnPrev = 0;
        this.bangLp = [new OnePole(c.bangHz, sr), new OnePole(c.bangHz, sr)];
        // limiter / 2-step bangs get their own, brighter and louder path
        this.bigLp = [new OnePole(Math.min(7000, c.bangHz * 1.7), sr), new OnePole(Math.min(7000, c.bangHz * 1.7), sr)];
        this.ring0 = new SVF(c.ringHz, 3.5, sr); this.ring1 = new SVF(c.ringHz * 1.06, 3.5, sr);
        this.ringIn0 = 0; this.ringIn1 = 0;
      }
      fire(i, load, cut, nos, rpm) {
        var c = this.c, b = c.banks[i];
        // pulse strength: more fuel & air under load; a pressurized collector
        // (a bank pulse just before) weakens the next one -> uneven V8 rhythm
        // every combustion differs a little (a few % cycle to cycle, more at idle)
        var cov = 1 + (rnd() - 0.5) * (0.05 + 0.07 * Math.max(0, 1 - rpm / 3000));
        var a = (c.idleBase + (1 - c.idleBase) * load) * c.cylVar[i] * cov * (1 - 0.3 * Math.min(1, this.bankP[b]));
        // overrun (off throttle at speed): lean, ragged combustion - firings
        // vary a lot and some barely burn, which turns a buzz into a burble
        var over = (1 - load) * Math.max(0, Math.min(1, (rpm - 1400) / 2200));
        if (over > 0) {
          a *= 1 - over * 0.55 * rnd();
          if (rnd() < over * 0.18) a *= 0.25;
        }
        this.bankP[b] += 0.7;
        // cam overlap: unsteady idle, occasional misfire
        var idle = Math.max(0, 1 - (rpm - 800) / 2500);
        a *= 1 - c.lope * idle * rnd();
        if (rnd() < c.misfire * idle) a *= 0.15;
        if (cut) a *= 0.08 + 0.1 * rnd();                 // ignition cut: no combustion
        a *= 1 + nos * 0.3;
        // unburnt fuel lighting off in the hot exhaust: crackles when lifting
        // at speed; big bangs on the rev limiter, 2-step, anti-lag and
        // sequential shift cuts
        this.pop[i] = 0;
        if (load < 0.12 && rpm > 2600 && rnd() < c.crackle * 0.05) this.bang(0.3 + rnd() * 0.45, false, b);
        if (cut && rnd() < c.bangChance) this.bang(0.9 + rnd() * 0.5, true, b);
        this.amp[i] = a; this.t[i] = 0;
        // each power stroke kicks the crank a little: firing timing wobbles,
        // most at idle where the flywheel spins slowly
        var jit = 0.006 + 0.03 * Math.max(0, 1 - (rpm - 700) / 2300) + over * 0.012;
        this.spd = 1 + (rnd() - 0.5) * jit;
        if (c.knock) this.knock = Math.max(this.knock, c.knock * (0.3 + 0.7 * load));
      }
      // A pop at the tailpipe: a sharp crack, a low thump body, then a few
      // smaller sizzling pops trailing behind.
      bang(amp, big, bank) {
        var k = this.bk, sr = sampleRate;
        k.t[k.next] = 0; k.a[k.next] = amp; k.big[k.next] = big ? 1 : 0;
        k.f[k.next] = (big ? 55 : 95) + rnd() * (big ? 35 : 70);
        k.bank[k.next] = this.c.panA !== 0.5 ? bank : 2;
        k.next = (k.next + 1) % k.t.length;
        var tails = big ? 1 + (rnd() * 3 | 0) : (rnd() < 0.45 ? 1 : 0);
        for (var j = 0; j < tails && this.pend.length < 8; j++) this.pend.push([(0.012 + rnd() * 0.07) * sr, amp * (0.25 + rnd() * 0.35), bank]);
      }
      process(inputs, outputs, P) {
        // a bug must never silence the engine for the rest of the race:
        // drop this block and carry on
        try { this.render(outputs, P); } catch (e) { this.c && this.setup(this.c); }
        return this.alive;
      }
      render(outputs, P) {
        var out = outputs[0], L = out[0], R = out[1] || out[0];
        if (!this.c) return;
        var c = this.c, n = c.angles.length, sr = sampleRate, i;
        var rpm = Math.max(200, P.rpm[0]), load = P.load[0], cut = P.cut[0] > 0.5, nos = P.nos[0], exh = P.exh[0], mech = P.mech[0];
        var dphi = rpm * 6 / sr * (c.cycle === 360 ? 1 : 1);   // crank degrees per sample
        // pulse rise time: the blowdown is a gas event lasting a millisecond or
        // two whatever the rpm, so at idle each pulse stays crisp
        // off throttle the cylinder holds little gas: weaker, softer pulses
        var tau = Math.max(1.5, Math.min(c.blowDeg / dphi, c.blowMs * 0.001 * sr)) * (1 + 0.7 * (1 - load));
        var invTau = 1 / tau, life = tau * 7;
        var noiseAmt = c.noise * (0.15 + 0.85 * load) * (1 + nos * 0.5);
        // off throttle the exhaust note goes darker and softer
        var mk = 0.55 + 0.45 * Math.min(1, load * 1.5 + Math.max(0, 1 - rpm / 1600));
        if (Math.abs(mk - (this.mk || 0)) > 0.02) {
          this.mk = mk;
          this.muf[0][0].set(c.mufHz * mk, sr); this.muf[0][1].set(c.mufHz * mk, sr);
          this.muf[1][0].set(c.mufHz * 1.04 * mk, sr); this.muf[1][1].set(c.mufHz * 1.04 * mk, sr);
        }
        // VTEC: past the crossover the high-lift cam lobes harden the exhaust
        // note and open up the intake howl
        var vt = c.vtec ? Math.max(0, Math.min(1, (rpm - c.vtec) / 250)) * load : 0;
        var drive = c.drive * (1 + nos * 0.6) * (1 + vt * 0.5), norm = 1 / Math.tanh(drive);
        // intake gulps last longer than exhaust blowdown (a few ms)
        var tauIn = Math.max(2, Math.min(70 / dphi, 0.0045 * sr)), invTauIn = 1 / tauIn, lifeIn = tauIn * 6;
        var inLvl = c.inLevel * (0.35 + 0.65 * load);
        inLvl *= (1 + vt * 2.5) * mech;
        var hissLvl = c.hissLvl * mech * (1 - load) * Math.min(1, rpm / 900) * (rpm < 2500 ? 1 : 0.5);
        var accHz = rpm / 60 * 2.7 * 12, accAmp = Math.min(1, rpm / 3000);
        var bHz = rpm / 60 * c.blowerRatio * c.blowerLobes;
        var bAmp = c.blowerLvl ? c.blowerLvl * (0.3 + 0.7 * load) * (c.blowerType === 'cent' ? Math.pow(Math.min(1, rpm / c.red), 2) * 1.6 : Math.min(1, rpm / 2500)) : 0;
        var x = c.xpipe, turbo = c.turbo ? Math.min(1, 0.45 + P.boost[0] * 0.02) : 0;
        for (var s = 0; s < L.length; s++) {
          var prev = this.phase;
          this.spdS += (this.spd - this.spdS) * 0.002;
          this.phase += dphi * this.spdS;
          var wrapped = this.phase >= c.cycle;
          if (wrapped) this.phase -= c.cycle;
          var kv = 0, kb = 0;
          for (var e = 0; e < this.ev.length; e++) {
            var E = this.ev[e], a = E[0];
            if (!(wrapped ? (a > prev || a <= this.phase) : (a > prev && a <= this.phase))) continue;
            i = E[2];
            if (E[1] === 0) this.fire(i, load, cut, nos, rpm);
            else if (E[1] === 1) {                       // intake gulp: bigger with the throttle open
              this.ain[i] = (0.08 + 0.92 * Math.pow(load, 0.8)) * c.cylVar[i] * (0.9 + 0.2 * rnd());
              this.tin[i] = 0;
            } else if (E[1] === 2) {                     // valve seating: impact grows with rpm
              kv += c.valveLvl * (0.35 + Math.min(1.2, rpm / 6500)) * (0.75 + 0.5 * rnd());
            } else if (!cut) {                           // combustion thump through the block
              kb += c.blockLvl * (0.25 + 0.75 * load) * (0.8 + 0.4 * rnd());
            }
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
          r0 = Math.tanh((r0 - this.dc2[0]) * c.gain * drive) * norm * exh;
          r1 = Math.tanh((r1 - this.dc2[1]) * c.gain * drive) * norm * exh;
          // ---- engine bay: intake, valvetrain, block, accessories, blower
          var ins = 0, flow = 0;
          for (i = 0; i < n; i++) {
            var ti = this.tin[i];
            if (ti >= 0) {
              var ui = ti * invTauIn, pv = this.ain[i] * ui * Math.exp(1 - ui);
              ins -= pv; flow += pv;
              this.tin[i] = ti + 1 > lifeIn ? -1 : ti + 1;
            }
          }
          this.inFlow += (flow - this.inFlow) * 0.01;
          var ip = this.inPipe.tick(ins);
          ip = this.inLp[1].tick(this.inLp[0].tick(ip));
          this.inHp += (ip - this.inHp) * this.hpK;
          var bay = (ip - this.inHp) * inLvl;
          bay += this.inNz.bp(rnd() * 2 - 1) * this.inFlow * inLvl * c.inRoar * (1 + vt * 0.6);    // air rushing in
          bay += this.hiss.bp(rnd() * 2 - 1) * hissLvl;                          // throttle plate hiss
          bay += (this.valve.bp(kv) * 6 + this.valve2.bp(kv) * 3) * mech;               // valve & lifter tick
          bay += (this.block1.bp(kb) * 5 + this.block2.bp(kb) * 3) * mech;              // combustion thump
          this.accPh += accHz / sr; if (this.accPh > 1) this.accPh -= 1;
          bay += Math.sin(2 * Math.PI * this.accPh) * c.accLvl * accAmp * mech;       // alternator / belts
          if (c.blowerLvl) {
            this.bPh += bHz / sr; if (this.bPh > 1) this.bPh -= 1;
            var ph = 2 * Math.PI * this.bPh, w;
            if (c.blowerType === 'cent') w = Math.sin(ph) + 0.25 * Math.sin(2 * ph);
            else w = Math.sin(ph) + 0.55 * Math.sin(2 * ph) + (c.blowerType === 'roots' ? 0.32 : 0.18) * Math.sin(3 * ph);
            bay += w * (1 + this.nz * c.blowerGrit) * bAmp;
          }
          this.bayHp += (bay - this.bayHp) * 0.004;
          bay -= this.bayHp;
          // ---- pops & bangs at the tailpipe(s)
          var bg0 = 0, bg1 = 0, bb0 = 0, bb1 = 0;
          if (this.pend.length) {
            var due = null;
            for (var q = this.pend.length - 1; q >= 0; q--) {
              if (--this.pend[q][0] <= 0) { (due || (due = [])).push(this.pend[q]); this.pend.splice(q, 1); }
            }
            if (due) for (q = 0; q < due.length; q++) this.bang(due[q][1], false, due[q][2]);
          }
          // texture noise is darkened (no hiss)
          this.bnPrev += (rnd() * 2 - 1 - this.bnPrev) * 0.25;
          var K = this.bk, wn = this.bnPrev;
          for (var j = 0; j < 8; j++) {
            var bt = K.t[j];
            if (bt < 0) continue;
            var tb = bt / sr, big = K.big[j];
            // the pop itself: one pressure wave, a sharp push then a pull
            // (an N-wave a few ms long), not a burst of noise
            var w = big ? 0.0032 : 0.0024, nw = 0;
            if (tb < w) { var u = tb / w; nw = Math.sin(6.2832 * u) * (1 - u) * (u < 0.08 ? u / 0.08 : 1); }
            // big bangs: a low thump of hot gas leaving the pipe
            var thump = Math.sin(6.2832 * K.f[j] * tb * (1 + 0.5 * Math.exp(-tb / 0.005))) * Math.exp(-tb / (big ? 0.045 : 0.01)) * Math.min(1, tb / 0.0004);
            var grit = wn * Math.exp(-tb / (big ? 0.0035 : 0.0015));
            var pulse = K.a[j] * nw;
            var bv = big ? pulse * 2.2 + K.a[j] * (thump * 1.5 + grit * 0.35)
                         : pulse * 1.4 + K.a[j] * (thump * 0.35 + grit * 0.3);
            // the pulse rings the tailpipe briefly: the "pap" of a pop
            if (K.bank[j] === 1) this.ringIn1 += pulse; else this.ringIn0 += pulse;
            if (big) { if (K.bank[j] === 0) bb0 += bv; else if (K.bank[j] === 1) bb1 += bv; else { bb0 += bv; bb1 += bv; } }
            else if (K.bank[j] === 0) bg0 += bv; else if (K.bank[j] === 1) bg1 += bv; else { bg0 += bv; bg1 += bv; }
            K.t[j] = tb > (big ? 0.3 : 0.08) ? -1 : bt + 1;
          }
          bg0 += this.ring0.bp(this.ringIn0) * 1.6; bg1 += this.ring1.bp(this.ringIn1 + (this.c.panA === 0.5 ? this.ringIn0 : 0)) * 1.6;
          this.ringIn0 = 0; this.ringIn1 = 0;
          bg0 = this.bangLp[0].tick(bg0); bg1 = this.bangLp[1].tick(bg1);
          bg0 = Math.tanh(bg0 * 1.4) * c.bangLvl; bg1 = Math.tanh(bg1 * 1.4) * c.bangLvl;
          // big bangs: driven harder and allowed well above the crackle level
          bg0 += Math.tanh(this.bigLp[0].tick(bb0) * 2.2) * c.bangLvl * 2.1;
          bg1 += Math.tanh(this.bigLp[1].tick(bb1) * 2.2) * c.bangLvl * 2.1;
          L[s] = r0 * c.panA + r1 * (1 - c.panA) + bay + bg0 * c.panA + bg1 * (1 - c.panA);
          R[s] = r1 * c.panA + r0 * (1 - c.panA) + bay + bg1 * c.panA + bg0 * (1 - c.panA);
        }
        return;
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
    v8ls:   { cycle: 720, angles: [0, 90, 180, 270, 360, 450, 540, 630], banks: [0, 1, 0, 1, 1, 0, 1, 0], twin: true },
    v8ford: { cycle: 720, angles: [0, 90, 180, 270, 360, 450, 540, 630], banks: [1, 1, 0, 1, 0, 0, 1, 0], twin: true },
    // Viper: odd-fire 90 deg V10, firing intervals alternate 90 and 54 deg
    v10:    { cycle: 720, angles: [0, 90, 144, 234, 288, 378, 432, 522, 576, 666], banks: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1], twin: true },
    v12:    { cycle: 720, angles: [0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660], banks: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], twin: true },
    // rotary: each rotor's peripheral exhaust port opens once per shaft turn
    rotary: { cycle: 360, angles: [0, 180],                               banks: [0, 0], sharp: true },
    // Porsche flat-6, 1-6-2-4-3-5: alternates banks, one turbo per side
    flat6:  { cycle: 720, angles: [0, 120, 240, 360, 480, 600],           banks: [0, 1, 0, 1, 0, 1], twin: true },
    // VW air-cooled flat-4, 1-4-3-2: equal-length heater boxes into one muffler
    flat4:  { cycle: 720, angles: [0, 180, 360, 540],                     banks: [0, 1, 1, 0] },
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
    if (build.oemSc && eng.scSound) build = Object.assign({}, build, { blowerType: eng.scSound });
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
      // idle pulse strength: free-flowing exhausts and big cams idle louder
      idleBase: Math.min(0.45, [0.22, 0.25, 0.32, 0.35][ex] + cam * 0.025),
      crackle: Math.max(EXH.crackle[ex] * (build.turbo ? 0.4 : 1), build.antilag ? 0.7 : 0),
      // chance per cut firing that the unburnt charge bangs in the pipe
      bangChance: Math.min(0.9, [0.05, 0.12, 0.28, 0.4][ex] + (build.twostep ? 0.22 : 0) + (build.antilag ? 0.3 : 0)),
      bangLvl: [0.4, 0.6, 0.85, 1.0][ex] * (build.turbo ? 0.8 : 1) * (0.75 + 0.25 * Math.min(1, eng.disp / 5)),
      bangHz: [1200, 2200, 3800, 5200][ex],    // mufflers soften the crack
      ringHz: 240 + 600 / Math.max(1, eng.disp),  // tailpipe ring: deeper on big engines
      turbo: !!build.turbo, turboHz: 330,
      knock: Lc.diesel ? 0.35 : 0,
      panA: twin ? 0.68 : 0.5,
      rotary: !!Lc.sharp, red: build.red || eng.red,
      // intake: stock airbox (muffled) -> cold-air -> ported -> race manifold
      inRunner: [0.42, 0.42, 0.36, 0.3][build.intake],
      inHz: [650, 1000, 1500, 2400][build.intake] * (Lc.sharp ? 1.3 : 1),
      inNoiseHz: [900, 1300, 1700, 2300][build.intake],
      inRoar: [0.6, 0.8, 1.0, 1.25][build.intake],
      inLevel: [0.12, 0.18, 0.25, 0.36][build.intake] * Math.sqrt(Math.min(2, eng.disp / 4)) *
        (build.turbo ? 0.35 : build.blower ? 0.5 : 1),
      hissLvl: build.turbo ? 0.004 : 0.008,
      // valvetrain: hydraulic lifters barely tick, solid rollers chatter
      valveHz: 4300 + (eng.cyl < 6 ? 600 : 0),
      valveLvl: Lc.sharp ? 0 : [0.008, 0.009, 0.011, 0.016, 0.03][cam] * (Lc.diesel ? 1.5 : 1),
      // combustion thump through the block (diesels clatter)
      blockHz: Lc.diesel ? 1500 : 1100 - Math.min(300, eng.disp * 30),
      blockLvl: Lc.diesel ? 0.12 : 0.02,
      accLvl: 0.0035,
      vtec: eng.vtec || 0,
      // superchargers: whine at rotor speed x lobes, belt-driven from the crank.
      // A factory blower can be a Roots (Eaton M112 on the Terminator).
      blowerType: build.blowerType || '',
      blowerRatio: { roots: 1.7, screw: 2.2, cent: 3.4 }[build.blowerType] || 0,
      blowerLobes: { roots: 6, screw: 5, cent: 11 }[build.blowerType] || 0,
      blowerLvl: { roots: 0.13, screw: 0.09, cent: 0.08 }[build.blowerType] || 0,
      blowerGrit: build.blowerType === 'roots' ? 0.9 : 0.4,
      // bigger engines move more gas per pulse and are louder
      gain: 1.15 * Math.pow(eng.disp / 3, 0.6) * EXH.makeup[ex]
    };
  };
  A.LAYOUTS = LAYOUTS;
})();
