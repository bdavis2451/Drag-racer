// ===========================================================================
// MUSIC — menu music: a small chiptune sequencer, all synthesized (pulse
// lead, square arpeggio, triangle bass, noise drums, like an 8-bit console),
// so there are no files to load or license. Plays on the menus, fades out
// for races. settings.music turns it off; the ♪ button in the top bar
// toggles it anywhere.
// ===========================================================================
(function () {
  var DR = globalThis.DR, A = DR.Audio;
  var M = DR.Music = { playing: false };
  var BPM = 112, STEP = 60 / BPM / 4;   // one 16th note
  var LEVEL = 0.5;                      // music bus level (x master volume)
  var bus = null, lp = null, pulse = null, timer = 0, nextT = 0, step = 0, want = false, ducked = false;

  // ---------------------------------------------------------------- the song
  // A minor, i-VI-III-VII. Each bar: a chord, and a lead line in eighth
  // notes ('-' holds, '.' rests).
  var CH = { Am: [57, 60, 64], F: [53, 57, 60], C: [48, 52, 55], G: [55, 59, 62], E: [52, 56, 59], Em: [52, 55, 59] };
  var SECTIONS = {
    // intro / breakdown: arpeggio, bass and hats only
    I: [['Am', ''], ['F', ''], ['C', ''], ['G', '']],
    A: [['Am', 'A4 . C5 E5 . D5 C5 B4'], ['F', 'A4 - - - . F4 A4 C5'], ['C', 'E5 - D5 C5 - G4 - .'], ['G', 'D5 - B4 G4 - A4 B4 D5'],
        ['Am', 'E5 . E5 D5 C5 . A4 C5'], ['F', 'D5 - C5 A4 - F4 A4 C5'], ['G', 'B4 - D5 G5 - F5 E5 D5'], ['E', 'E5 - - - G#4 - B4 -']],
    B: [['F', 'C6 - A5 - F5 - A5 C6'], ['G', 'D6 - B5 - G5 - B5 D6'], ['Em', 'E6 - B5 G5 E5 - G5 B5'], ['Am', 'C6 - - B5 A5 - E5 -'],
        ['F', 'F5 A5 C6 A5 F5 A5 C6 E6'], ['G', 'D6 - B5 G5 D6 - B5 G5'], ['Am', 'A5 - E5 - C5 - E5 -'], ['Am', 'A5 - - - . . . .']]
  };
  var ORDER = ['I', 'A', 'B', 'A', 'B'];
  var NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  function midi(name) { var m = name.match(/^([A-G]#?)(\d)$/); return 12 * (+m[2] + 1) + NOTE[m[1]]; }
  function hz(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  // the song as bars: { chord, lead: [16 steps: midi note, -1 hold, null rest], drums, section }
  var BARS = [];
  ORDER.forEach(function (sec) {
    SECTIONS[sec].forEach(function (b) {
      var lead = [];
      b[1].split(' ').filter(Boolean).forEach(function (tok) {
        var v = tok === '-' ? -1 : tok === '.' ? null : midi(tok);
        lead.push(v, -1);   // eighth notes on the 16th grid
      });
      BARS.push({ chord: CH[b[0]], lead: lead.length ? lead : null, sec: sec });
    });
  });
  var TOTAL = BARS.length * 16;

  // ---------------------------------------------------------------- voices
  function build() {
    var c = A.ctx;
    bus = c.createGain(); bus.gain.value = 0;
    lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000; lp.Q.value = 0.3;
    bus.connect(lp); lp.connect(c.destination);
    // 25% pulse, the classic NES lead
    var n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (var k = 1; k < n; k++) im[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * 0.25);
    pulse = c.createPeriodicWave(re, im);
  }
  function tone(type, f, t, dur, vol, slide) {
    var c = A.ctx, o = c.createOscillator(), g = c.createGain();
    if (type === 'pulse') o.setPeriodicWave(pulse); else o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.setTargetAtTime(vol * 0.6, t + 0.03, 0.08);
    g.gain.setTargetAtTime(0, t + dur, 0.03);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.2);
  }
  function noise(t, dur, vol, type, freq) {
    var c = A.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = A.noise; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  function play(i, t) {
    var bar = BARS[Math.floor(i / 16)], s = i % 16, ch = bar.chord, intro = bar.sec === 'I';
    // lead: a note lasts until the next note or rest
    if (bar.lead && bar.lead[s] != null && bar.lead[s] >= 0) {
      var len = 1;
      while (s + len < 16 && bar.lead[s + len] === -1) len++;
      tone('pulse', hz(bar.lead[s]), t, len * STEP * 0.92, 0.075);
    }
    // arpeggio: up through the chord an octave below the lead, every 16th
    var arp = [ch[0], ch[1], ch[2], ch[0] + 12];
    tone('square', hz(arp[s % 4]), t, STEP * 0.7, intro ? 0.03 : 0.022);
    // bass: root on the eighths, octave bounce
    if (s % 2 === 0) tone('triangle', hz(ch[0] - 24 + (s % 4 === 2 ? 12 : 0)), t, STEP * 1.7, 0.2);
    // drums
    if (s % 2 === 0) noise(t, 0.03, 0.035, 'highpass', 7000);
    if (!intro) {
      if (s === 0 || s === 8 || s === 10) tone('sine', 150, t, 0.12, 0.32, 45);
      if (s === 4 || s === 12) { noise(t, 0.14, 0.12, 'bandpass', 1800); tone('triangle', 190, t, 0.05, 0.08, 120); }
    }
  }
  function tick() {
    if (!A.ctx || !bus) return;
    var now = A.ctx.currentTime;
    if (nextT < now - 0.05) nextT = now + 0.05;   // fell behind (tab asleep)
    while (nextT < now + 0.15) { play(step, nextT); step = (step + 1) % TOTAL; nextT += STEP; }
  }

  // ---------------------------------------------------------------- control
  function enabled() { var s = DR.Game.state && DR.Game.state.settings; return !!(s && s.sound && s.music !== false); }
  function level() { return ducked ? 0 : LEVEL * (A.volume == null ? 1 : A.volume); }
  // start (fading in) if it should be playing and the audio is unlocked
  M.update = function () {
    var go = want && enabled() && !ducked;
    if (go && !A.ctx) return;   // wait for the first tap to unlock audio
    if (go && !M.playing) {
      if (!bus) build();
      M.playing = true; nextT = A.ctx.currentTime + 0.1;
      bus.gain.cancelScheduledValues(A.ctx.currentTime);
      bus.gain.setTargetAtTime(level(), A.ctx.currentTime, 0.4);
      timer = setInterval(tick, 25); tick();
    } else if (!go && M.playing) {
      M.playing = false;
      var t = A.ctx.currentTime;
      bus.gain.cancelScheduledValues(t); bus.gain.setTargetAtTime(0, t, 0.15);
      clearInterval(timer);
    }
  };
  // the screen changed: menus want music, races don't
  M.screen = function (fn) { want = !(fn && fn.noMusic); ducked = false; M.update(); };
  // quiet while something else needs the speakers (the dyno's engine)
  M.duck = function (on) { ducked = !!on; M.update(); };
  M.setVolume = function () { if (bus && M.playing) bus.gain.setTargetAtTime(level(), A.ctx.currentTime, 0.05); };
  M.toggle = function () {
    var s = DR.Game.state.settings;
    s.music = s.music === false;
    if (s.music && !s.sound) { s.sound = true; A.setOn(true); }
    DR.Game.save(); A.init(); A.resume(); M.update();
    return s.music;
  };
  M.on = function () { return enabled(); };
})();
