// ===========================================================================
// AUDIO CHECK — Settings > Audio check, for testers. Plays short engine
// tests one by one (a beep, the simple engine, the recordings alone, the
// full engine with one car and with two) and reports what the device does:
// whether the audio clock keeps running, whether there's signal, errors from
// the audio thread, and what the tester heard. "Copy report" puts it all on
// the clipboard to send back. It changes no sound setting.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, h = UI.h, btn = UI.btn, A = DR.Audio;

  var R = { info: null, prep: null, tests: {} };   // results, kept while the screen is open
  var running = null;

  var TESTS = [
    { id: 'beep', name: 'Beeps', what: 'Three plain beeps: basic sound works at all.' },
    { id: 'simple', name: 'Simple engine', what: 'The Simple engine sound (one car).', flags: [true, true] },
    { id: 'rec', name: 'Recordings only', what: 'The recorded engine loops alone, no modelled engine.', flags: [false, false], recOnly: true, needs: 'loops' },
    { id: 'model', name: 'Modelled engine only', what: 'The modelled engine alone, no recordings.', flags: [false, true], needs: 'wk' },
    { id: 'full1', name: 'Full engine, 1 car', what: 'Full sound as in a race, your car only.', flags: [false, false], needs: 'wk' },
    { id: 'full2', name: 'Full engine, 2 cars', what: 'Full sound with two cars: the load of a real race.', flags: [false, false], needs: 'wk', two: true }
  ];


  // a quiet monitor for real races: the audio clock and state while a race
  // screen is up, kept for the report (the last three races)
  R.races = [];
  (function () {
    var cur = null, lastW = 0, lastA = 0;
    setInterval(function () {
      var c = A.ctx, on = !!document.querySelector('.screen.race');
      if (on && c && !cur) {
        cur = { at: new Date().toTimeString().slice(0, 8), setting: A.quality ? A.quality() : '?', start: performance.now(), minClock: 9, stalls: 0, slow: 0, states: [c.state], nodes: '' };
        lastW = performance.now(); lastA = c.currentTime;
      } else if (cur && c) {
        var now = performance.now(), dw = (now - lastW) / 1000, da = c.currentTime - lastA;
        if (dw > 0.2) { var r = da / dw; cur.minClock = Math.min(cur.minClock, r); if (r < 0.2) cur.stalls++; if (r < 0.9) cur.slow++; lastW = now; lastA = c.currentTime; }
        if (cur.states[cur.states.length - 1] !== c.state) cur.states.push(c.state);
        if (!cur.nodes && A.voices.length) cur.nodes = A.voices.map(function (v) { return (v.wk ? 'model' : 'synth') + (v.smp ? '+rec' : ''); }).join(', ');
        if (!on) { cur.secs = Math.round((now - cur.start) / 1000); R.races.unshift(cur); R.races.length = Math.min(3, R.races.length); cur = null; }
      }
    }, 250);
  })();

  function ua() { return navigator.userAgent; }
  function iosVer() { var m = ua().match(/OS (\d+)[_.](\d+)(?:[_.](\d+))? like Mac OS X/); return m ? m[1] + '.' + m[2] + (m[3] ? '.' + m[3] : '') : null; }
  function canPlay(t) { try { var a = document.createElement('audio'); return a.canPlayType(t) || 'no'; } catch (e) { return '?'; } }
  function f(x, d) { return x == null || isNaN(x) ? '-' : (+x).toFixed(d == null ? 3 : d); }

  function gatherInfo() {
    var c = A.ctx, s = G.state && G.state.settings;
    R.info = {
      device: A.isIOS ? 'iOS ' + (iosVer() || '?') : (navigator.platform || '?'),
      ua: ua(),
      ctx: c ? c.state : 'none', rate: c ? c.sampleRate : null,
      baseLat: c && c.baseLatency, outLat: c && c.outputLatency,
      session: navigator.audioSession ? navigator.audioSession.type : 'n/a',
      worklet: !!(c && c.audioWorklet) && typeof AudioWorkletNode !== 'undefined',
      setting: A.quality ? A.quality() : '?', sound: s ? s.sound !== false : '?', volume: s ? s.volume : '?',
      ogg: canPlay('audio/ogg; codecs="vorbis"'), opus: canPlay('audio/ogg; codecs="opus"'), webm: canPlay('audio/webm; codecs="opus"'), m4a: canPlay('audio/mp4; codecs="mp4a.40.2"'),
      cores: navigator.hardwareConcurrency || '?', mem: navigator.deviceMemory || '?'
    };
  }

  function myCar() {
    var inst = G.car && G.car();
    if (!inst) return null;
    var S = G.spec(inst);
    return { S: S, eng: S.eng, build: A.buildOf(S), name: DR.CARS[inst.carId] ? DR.CARS[inst.carId].name : inst.carId };
  }

  // load the audio-thread code and the car's recording (even on Simple), timing each
  function prepare(done) {
    A.init(); A.resume();
    if (!A.ctx) { R.prep = { err: 'No Web Audio' }; return done(); }
    var t0 = performance.now(), p = R.prep = { wk: A.wk, loops: !!A.loopsWk };
    function afterWk() {
      p.wk = !!A.wk; p.loops = !!A.loopsWk; p.wkMs = Math.round(performance.now() - t0);
      var car = myCar(), id = car && DR.engineBank ? DR.engineBank(car.eng) : null;
      p.bank = id || 'none';
      if (!id || !A.loadBank) return done();
      var t1 = performance.now();
      A.loadBank(id, function (buf) {
        p.bankOk = !!buf; p.bankMs = Math.round(performance.now() - t1);
        if (buf) { p.bankSec = f(buf.duration, 1); p.bankRate = buf.sampleRate; }
        if (DR.ENG_POPS) A.loadBank('__pops', function (b2) { p.popsOk = !!b2; done(); }); else done();
      });
    }
    if (A.wk) return afterWk();
    if (A.wkPending) { A.wkQueue.push(afterWk); return; }
    if (!A.loadWorklet) return afterWk();
    A.wkPending = true;
    A.loadWorklet(A.ctx).then(function (ok) {
      A.wk = ok; A.wkPending = false;
      var q = A.wkQueue; A.wkQueue = []; q.forEach(function (fn) { fn(); });
      afterWk();
    }, function (e) { A.wkPending = false; p.wkErr = String(e); afterWk(); });
  }

  // one test: ~4.5 s of idle, a pull to near the limiter and a lift
  function runTest(T, onDone) {
    var c = A.ctx, out = R.tests[T.id] = { ran: true, heard: null, errs: [], states: [] };
    if (!c) { out.skip = 'no audio'; return onDone(); }
    if (T.needs === 'wk' && !A.wk) { out.skip = 'the modelled engine did not load'; return onDone(); }
    if (T.needs === 'loops' && !(A.loopsWk && R.prep && R.prep.bankOk)) { out.skip = !A.loopsWk ? 'the loop player did not load' : 'the recording did not decode'; return onDone(); }
    var car = myCar();
    if (!car && T.id !== 'beep') { out.skip = 'no car'; return onDone(); }
    A.resume();
    if (!A.__chk) { A.__chk = c.createAnalyser(); A.__chk.fftSize = 2048; A.master.connect(A.__chk); }
    var an = A.__chk, buf = new Float32Array(an.fftSize);
    var keep = [A.forceSynth, A.noSamples, A.wk], voices = [];
    var onState = function () { out.states.push(c.state); };
    c.addEventListener('statechange', onState);
    var cap = null;
    if (c.renderCapacity && c.renderCapacity.start) {
      try { cap = c.renderCapacity; out.load = []; cap.onupdate = function (e) { out.load.push([e.averageLoad, e.peakLoad, e.underrunRatio]); }; cap.start({ updateInterval: 0.5 }); } catch (e) { cap = null; }
    }
    if (T.id !== 'beep') {
      A.forceSynth = T.flags[0]; A.noSamples = T.flags[1];
      if (T.recOnly) A.wk = false;   // no modelled engine: a plain voice (muted) carries the recording
      try {
        voices.push(A.engine(car.eng, 1, car.build));
        if (T.two) voices.push(A.engine(car.eng, 0.6, car.build));
      } catch (e) { out.errs.push('create: ' + e.message); }
      A.wk = keep[2];
      voices = voices.filter(Boolean);
      voices.forEach(function (v) {
        [v.node, v.smp && v.smp.node].forEach(function (n) { if (n) n.onprocessorerror = function (e) { out.errs.push('audio thread error: ' + (e && e.message || 'processor failed')); }; });
      });
      out.nodes = voices.map(function (v) { return (v.wk ? 'model' : 'synth') + (v.smp ? '+rec' : ''); }).join(', ');
    }
    var red = (car && car.build && car.build.red) || (car && car.S.eng.redline) || 7000;
    var w0 = performance.now(), a0 = c.currentTime, lastW = w0, lastA = a0, rms = [], stalls = 0, slow = 0, minRatio = 9, longest = 0, stallStart = null;
    var tick = setInterval(function () {
      var now = performance.now(), t = (now - w0) / 1000, at = c.currentTime;
      // the audio clock against the wall clock: a stalled or starved audio thread falls behind
      var dw = (now - lastW) / 1000, da = at - lastA;
      if (dw > 0.05) {
        var r = da / dw; minRatio = Math.min(minRatio, r);
        if (r < 0.2) { stalls++; if (stallStart == null) stallStart = now; } else { if (stallStart != null) longest = Math.max(longest, now - stallStart); stallStart = null; }
        if (r < 0.9) slow++;
        lastW = now; lastA = at;
      }
      an.getFloatTimeDomainData(buf); var s = 0; for (var i = 0; i < buf.length; i++) s += buf[i] * buf[i]; rms.push(Math.sqrt(s / buf.length));
      if (T.id === 'beep') {
        if (rms.length === 1 || rms.length === 40 || rms.length === 80) A.beep(660, 0.3);
      } else {
        var rpm, thr;
        if (t < 0.8) { rpm = 900; thr = 0; } else if (t < 3.3) { thr = 1; rpm = 900 + (red * 0.9 - 900) * (t - 0.8) / 2.5; } else { thr = 0; rpm = Math.max(900, red * 0.9 - (t - 3.3) * 3500); }
        voices.forEach(function (v, k) {
          try { A.update(v, rpm * (k ? 0.97 : 1), thr, 0, 0, car.S.fiType, { doppler: 1 }); } catch (e) { if (out.errs.length < 5) out.errs.push('update: ' + e.message); }
          if (T.recOnly && v.trim) v.trim.gain.value = 0;   // the recording alone
        });
      }
      if (t > 4.5) finish();
    }, 30);
    function finish() {
      clearInterval(tick);
      if (stallStart != null) longest = Math.max(longest, performance.now() - stallStart);
      try { A.stopAll(); } catch (e) { out.errs.push('stop: ' + e.message); }
      A.forceSynth = keep[0]; A.noSamples = keep[1]; A.wk = keep[2];
      if (cap) try { cap.stop(); } catch (e) { /* ignore */ }
      c.removeEventListener('statechange', onState);
      var wall = (performance.now() - w0) / 1000, aud = c.currentTime - a0;
      out.clock = f(aud / wall, 2); out.minClock = f(minRatio === 9 ? null : minRatio, 2); out.stalls = stalls; out.slow = slow; out.longestStallMs = Math.round(longest);
      var sorted = rms.slice().sort(function (a, b) { return a - b; });
      out.rmsMax = f(sorted[sorted.length - 1], 4); out.rmsMed = f(sorted[Math.floor(sorted.length / 2)], 4);
      out.silent = rms.filter(function (x) { return x < 1e-4; }).length + '/' + rms.length;
      out.endState = c.state;
      if (out.load && out.load.length) { var L = out.load; out.loadAvg = f(L.reduce(function (a, x) { return a + x[0]; }, 0) / L.length, 2); out.loadPeak = f(Math.max.apply(null, L.map(function (x) { return x[1]; })), 2); out.underrun = f(Math.max.apply(null, L.map(function (x) { return x[2]; })), 3); }
      delete out.load;
      onDone();
    }
  }

  function report() {
    var i = R.info || {}, p = R.prep || {}, lines = [];
    lines.push('PIXEL DRAG AUDIO CHECK ' + new Date().toISOString().slice(0, 16));
    lines.push('device ' + i.device + ' | cores ' + i.cores + ' | mem ' + i.mem);
    lines.push('ua ' + i.ua);
    lines.push('ctx ' + i.ctx + ' @ ' + i.rate + ' Hz | latency base ' + f(i.baseLat) + ' out ' + f(i.outLat) + ' | session ' + i.session);
    lines.push('setting ' + i.setting + ' | sound ' + i.sound + ' | volume ' + i.volume + ' | worklet api ' + i.worklet);
    lines.push('codecs ogg/vorbis ' + i.ogg + ' | ogg/opus ' + i.opus + ' | webm/opus ' + i.webm + ' | m4a/aac ' + i.m4a);
    lines.push('load: model ' + p.wk + ' loops ' + p.loops + ' (' + (p.wkMs || '-') + ' ms)' + (p.wkErr ? ' ERR ' + p.wkErr : '') + ' | bank ' + p.bank + ' decoded ' + p.bankOk + ' (' + (p.bankMs || '-') + ' ms, ' + (p.bankSec || '-') + ' s @ ' + (p.bankRate || '-') + ') | pops ' + p.popsOk);
    TESTS.forEach(function (T) {
      var o = R.tests[T.id];
      if (!o) return lines.push(T.id + ': not run');
      if (o.skip) return lines.push(T.id + ': skipped (' + o.skip + ')');
      lines.push(T.id + ': heard ' + (o.heard || '?') + ' | clock ' + o.clock + ' min ' + o.minClock + ' stalls ' + o.stalls + ' slow ' + o.slow + ' longest ' + o.longestStallMs + 'ms | rms max ' + o.rmsMax + ' med ' + o.rmsMed + ' silent ' + o.silent +
        ' | end ' + o.endState + (o.states.length ? ' states ' + o.states.join('>') : '') + (o.nodes ? ' | ' + o.nodes : '') + (o.loadAvg ? ' | load ' + o.loadAvg + '/' + o.loadPeak + ' underrun ' + o.underrun : '') + (o.errs.length ? ' | ERR ' + o.errs.join('; ') : ''));
    });
    R.races.forEach(function (r, k) {
      lines.push('race ' + (k + 1) + ' (' + r.at + ', ' + r.secs + ' s, ' + r.setting + ', ' + (r.nodes || 'no engines') + '): clock min ' + f(r.minClock === 9 ? null : r.minClock, 2) + ' stalls ' + r.stalls + ' slow ' + r.slow + ' | states ' + r.states.join('>'));
    });
    if (!R.races.length) lines.push('races: none since the game was opened');
    return lines.join('\n');
  }

  function copy(text) {
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0'; document.body.appendChild(ta);
      ta.focus(); ta.select(); try { ta.setSelectionRange(0, text.length); } catch (e) { /* old */ }
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* no */ }
      document.body.removeChild(ta);
      UI.toast(ok ? 'Report copied: paste it in a message' : 'Copy failed: press and hold the report text to select it');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { UI.toast('Report copied: paste it in a message'); }, fallback);
    else fallback();
  }

  UI.AudioCheck = function (back) {
    if (!R.info) gatherInfo();
    var car = myCar();
    var rows = TESTS.map(function (T, k) {
      var o = R.tests[T.id], isRun = running === T.id;
      var right;
      if (isRun) right = h('span', { class: 'acc' }, 'Playing…');
      else if (o && o.skip) right = h('span', { class: 'dim gsmall' }, 'Skipped: ' + o.skip);
      else if (o && !o.heard) right = h('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' } }, h('span', { class: 'gsmall' }, 'Did you hear it?'),
        ['Yes', 'Choppy', 'No'].map(function (a) { return btn(a, function () { o.heard = a.toLowerCase(); UI.refresh(); }, 'small' + (a === 'Yes' ? ' primary' : '')); }));
      else right = h('div', { class: 'row', style: { gap: '6px', alignItems: 'center' } }, o ? h('span', { class: o.heard === 'yes' ? 'good gsmall' : 'bad gsmall' }, 'Heard: ' + o.heard) : null,
        btn(o ? 'Again' : 'Play', function () {
          if (running) return;
          running = T.id; UI.refresh();
          var go = function () { runTest(T, function () { running = null; if (UI.cur && UI.cur.fn === UI.AudioCheck) UI.refresh(); }); };
          if (!R.prep) prepare(function () { gatherInfo(); go(); }); else go();
        }, 'small' + (o ? '' : ' red')));
      return h('div', { class: 'item' }, h('div', { class: 'name' }, h('div', {}, (k + 1) + '. ' + T.name), h('div', { class: 'dim', style: { fontSize: '16px' } }, T.what)), right);
    });
    var text = report();
    return h('div', { class: 'screen' }, UI.top('AUDIO CHECK', function () { if (!running) UI.show(UI.Settings, back); }),
      h('div', { class: 'content' }, h('div', { class: 'col', style: { gap: '6px', maxWidth: '760px', margin: '0 auto' } },
        h('div', { class: 'panel' }, h('div', { class: 'acc' }, 'For testers'),
          h('p', { class: 'gsmall' }, 'Turn the ringer on and the volume up. Play each test in order and answer whether you heard it. Then run one race (on Full sound, if you can), come back here, tap Copy report and send it to the developer. ' + (car ? 'Tests use your ' + car.name + '.' : 'Pick a car in the garage first for the engine tests.'))),
        rows,
        h('div', { class: 'row', style: { gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' } },
          btn('Reset', function () { if (running) return; R.tests = {}; R.prep = null; gatherInfo(); UI.refresh(); }, 'small'),
          btn('Copy report', function () { copy(report()); }, 'primary')),
        h('pre', { class: 'panel gsmall', style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text', webkitUserSelect: 'text', fontSize: '12px', lineHeight: '1.3' } }, text))));
  };
  UI.AudioCheck.noMusic = true;
})();
