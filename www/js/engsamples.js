// ===========================================================================
// ENGINE SAMPLES — real engine recordings layered under the modelled engine.
// Each bank (engbanks.js) is a set of short loops cut from a recording of a
// real car, each flattened to one steady rpm: "on" loops come from the
// engine pulling (revving up), "off" loops from it coasting down. At run time
// the two loops either side of the current rpm are crossfaded and
// pitch-shifted to the exact rpm (the way racing games do it), and throttle
// fades between the on and off sets. The physical model (enginesim.js) keeps
// doing the parts a recording can't: the rev limiter, pops and bangs, the
// blower and turbo, and how mufflers, headers and cams change the tone.
// ===========================================================================
(function () {
  var DR = globalThis.DR, A = DR.Audio;
  var decoded = {}, pending = {};

  // which bank voices an engine: the engine's own pick, else by layout
  DR.engineBank = function (eng) {
    var B = DR.ENG_BANKS || {};
    var own = (DR.ENG_BANK_BY_ENGINE || {})[eng.id];
    if (own && B[own]) return own;
    var lay = A.layoutOf(eng), byLay = DR.ENG_BANK_BY_LAYOUT || {};
    return byLay[lay] && B[byLay[lay]] ? byLay[lay] : null;
  };

  function b64ToBuf(s) {
    var bin = atob(s), n = bin.length, u = new Uint8Array(n);
    for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }
  // decode a bank once; fn(buffer or null)
  A.loadBank = function (id, fn) {
    if (!A.ctx || !id) return fn && fn(null);
    if (decoded[id]) return fn && fn(decoded[id]);
    if (pending[id]) { if (fn) pending[id].push(fn); return; }
    pending[id] = fn ? [fn] : [];
    var done = function (buf) { decoded[id] = buf || false; var q = pending[id]; delete pending[id]; q.forEach(function (f) { f(buf || null); }); };
    try {
      var p = A.ctx.decodeAudioData(b64ToBuf(DR.ENG_BANKS[id].data), done, function () { done(null); });
      if (p && p.catch) p.catch(function () { done(null); });
    } catch (e) { done(null); }
  };
  // warm up the banks for these engines so the race starts with them ready
  A.banksReady = function (engs) {
    return engs.every(function (e) { var id = DR.engineBank(e); return !id || decoded[id] !== undefined; });
  };
  A.preloadEngines = function (engs) { engs.forEach(function (e) { var id = DR.engineBank(e); if (id) A.loadBank(id); }); };

  // How the car's parts colour the recording: a stock muffler is darker and
  // quieter, straight pipes open it up. Turbos muffle the exhaust a bit.
  var TONE = { cut: [2600, 4200, 7000, 11000], lvl: [0.8, 0.95, 1.1, 1.22] };

  function attach(v, eng, build) {
    var id = DR.engineBank(eng), bank = id && DR.ENG_BANKS[id], buf = id && decoded[id];
    if (!buf) { if (id) A.loadBank(id); return false; }
    var c = A.ctx, ex = build.exhaust || 0;
    var sm = v.smp = { bank: bank, k: bank.k, loops: [], on: [], off: [] };
    sm.tone = c.createBiquadFilter(); sm.tone.type = 'lowpass'; sm.tone.Q.value = 0.6;
    sm.tone.frequency.value = TONE.cut[ex] * (build.turbo ? 0.75 : 1);
    sm.out = c.createGain(); sm.out.gain.value = 0;
    sm.tone.connect(sm.out); sm.out.connect(v.bus);
    sm.lvl = TONE.lvl[ex] * (build.turbo ? 0.8 : 1) * (bank.gain || 1);
    bank.loops.forEach(function (L) {
      var s = c.createBufferSource(), g = c.createGain();
      s.buffer = buf; s.loop = true; s.loopStart = L[2]; s.loopEnd = L[2] + L[3];
      g.gain.value = 0; s.connect(g); g.connect(sm.tone);
      // start each loop at a random point so the two cars never phase together
      s.start(0, L[2] + Math.random() * L[3]);
      var o = { rpm: L[0], src: s, g: g };
      sm.loops.push(o); (L[1] ? sm.on : sm.off).push(o);
    });
    var byRpm = function (a, b) { return a.rpm - b.rpm; };
    sm.on.sort(byRpm); sm.off.sort(byRpm);
    if (!sm.off.length) sm.off = sm.on;
    if (!sm.on.length) sm.on = sm.off;
    return true;
  }

  // weights for the loops of one set at this rpm (log-rpm crossfade)
  function weigh(set, rpm, scale, w) {
    var n = set.length, i;
    if (rpm <= set[0].rpm) { w.set(set[0], scale); return; }
    if (rpm >= set[n - 1].rpm) { w.set(set[n - 1], scale); return; }
    for (i = 0; i < n - 1; i++) if (rpm < set[i + 1].rpm) break;
    var a = set[i], b = set[i + 1], u = Math.log(rpm / a.rpm) / Math.log(b.rpm / a.rpm);
    // equal-power crossfade
    w.set(a, scale * Math.cos(u * Math.PI / 2)); w.set(b, scale * Math.sin(u * Math.PI / 2));
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
    var t = A.ctx.currentTime, dop = st.doppler || 1, r = Math.max(400, rpm);
    // load: throttle, smoothed so the on/off crossfade doesn't click
    sm.load = sm.load == null ? thr : sm.load + (thr - sm.load) * 0.25;
    var on = Math.min(1, Math.max(0, (sm.load - 0.08) / 0.5));
    // past the top of what was recorded, hand back to the modelled engine
    // rather than stretching the highest loop into a chipmunk
    function cover(set) { var top = set[set.length - 1].rpm; return Math.min(1, Math.max(0, (top * 1.3 - r) / (top * 0.3))); }
    var have = on * cover(sm.on) + (1 - on) * cover(sm.off);
    if (v.np) v.np.get('exh').setTargetAtTime(1 - 0.68 * have, t, 0.05);
    var want = new Map();
    var W = { set: function (o, g) { want.set(o, (want.get(o) || 0) + g); } };
    weigh(sm.on, r, Math.sqrt(on), W);
    weigh(sm.off, r, Math.sqrt(1 - on), W);
    sm.loops.forEach(function (o) {
      var g = want.get(o) || 0;
      o.g.gain.setTargetAtTime(g, t, 0.03);
      if (g > 0.001) o.src.playbackRate.setTargetAtTime(Math.min(4, Math.max(0.25, r / o.rpm * dop)), t, 0.015);
    });
    // level: quieter when coasting, a little louder high in the rev range;
    // the rev limiter chops it
    var lvl = v.vol * sm.lvl * (0.22 + 0.78 * sm.load) * (0.35 + 0.65 * Math.min(1, r / (v.b.red || 7000))) * (1 + (st.nos ? 0.15 : 0));
    var cut = st.cut && thr > 0.5;
    sm.out.gain.setTargetAtTime(lvl * have * (cut ? 0.3 : 1) * A.SMP_GAIN, t, cut ? 0.006 : 0.03);
  };
  A.SMP_GAIN = 1.6;

  var baseStop = A.stopAll;
  A.stopAll = function () {
    A.voices.forEach(function (v) { if (v.smp) v.smp.loops.forEach(function (o) { try { o.src.stop(); } catch (e) { /* stopped */ } }); });
    baseStop();
  };
})();
