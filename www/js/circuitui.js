// ===========================================================================
// CIRCUIT UI — the test track: a top-down map of the circuit, a flying lap
// by an ideal test driver (DR.lapSim) played back on it, the car's handling
// figures, and telemetry (speed against distance, corner by corner) with
// each car's best lap kept to compare against.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, A = DR.Audio, h = UI.h, btn = UI.btn;
  var TRACK = 'pixel';   // the test lap's track (Race > Race Team > Test Lap)
  var CW = 600, CH = 330, PAD = 34;   // map canvas (pixels, drawn pixelated)
  var VIS = 1.5;         // the track's drawn width vs its real 12 m: readable at this scale
  var STATE_COL = { 1: '#4cd964', 2: '#ffcc00', 3: '#ff4a3a' };
  var play = null;      // the lap on screen: { uid, sig, lap, T, t0, speed, done }
  var speedSel = 4, probe = -1;
  var baseCache = {};   // the drawn track, per track

  // ---------------------------------------------------------------- sound
  // Your car's engine follows it round the lap (the same engine sound as
  // the drag strip): revs from its speed and gear, on and off the throttle.
  var eng = null;
  function engineStart(S) {
    if (!A || !A.engine || !G.state.settings.sound) return;
    A.init(); A.resume();
    if (eng && eng.S === S) return;
    engineStop();
    var me = eng = { S: S, voice: null };
    (function go() {
      if (eng !== me || me.voice) return;
      if (A.wkPending) return A.whenReady(go);
      if (A.banksReady && !A.banksReady([S.eng])) return A.whenBanks([S.eng], go);
      try { me.voice = A.engine(S.eng, 0.55, A.buildOf(S)); } catch (e) { me.voice = null; }
      if (DR.Music) DR.Music.duck(true);
    })();
  }
  // v (m/s), gear (0-based), state 1 throttle / 2 at the limit / 3 braking
  function engineAt(v, g, st, boost) {
    if (!eng || !eng.voice) return;
    var S = eng.S, rpm = Math.max(S.idle, Math.min(S.red, v / S.r * S.ratios[Math.min(g, S.ratios.length - 1)] * S.fd * 60 / (2 * Math.PI)));
    A.update(eng.voice, rpm, st === 1 ? 1 : st === 2 ? 0.55 : 0.05, boost || 0, 0, S.fiType);
  }
  function engineStop() {
    if (!eng) return;
    eng = null;
    try { A.stopAll(); } catch (e) { /* nothing playing */ }
    if (DR.Music) DR.Music.duck(false);
  }
  UI.circuitEngineStop = engineStop;

  function kmh() { return G.state.settings.units === 'kmh'; }
  function spd(ms) { return Math.round(ms * (kmh() ? 3.6 : 2.23694)); }
  function spdU() { return kmh() ? 'km/h' : 'mph'; }
  function fmtLap(t) { var m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); }
  function fmtD(d) { return (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(2); }
  function ord(g) { return g + (g === 1 ? 'st' : g === 2 ? 'nd' : g === 3 ? 'rd' : 'th'); }
  // what the lap depends on: a changed part or tune means a new lap
  function sig(inst) { return JSON.stringify([TRACK, inst.carId, inst.engine, inst.parts, inst.tune]); }

  // ---------------------------------------------------------------- records
  // G.state.circuit.records[track][uid] = { t, sp: sector times, top (m/s),
  //   tr: speed every 2nd point (m/s * 10), name }
  function recs(trackId) {
    var c = G.state.circuit || (G.state.circuit = { records: {} });
    c.records = c.records || {};
    return c.records[trackId] || (c.records[trackId] = {});
  }
  function bestOf(inst) { return recs(TRACK)[inst.uid] || null; }
  function saveLap(inst, lap) {
    var r = recs(TRACK), old = r[inst.uid];
    if (old && old.t <= lap.time + 1e-6) return false;
    var tr = [];
    for (var i = 0; i < lap.v.length; i += 2) tr.push(Math.round(lap.v[i] * 10));
    r[inst.uid] = { t: lap.time, sp: lap.splits.slice(), top: lap.top, tr: tr, name: DR.CARS[inst.carId].name };
    G.save();
    return true;
  }
  function bestSpeedAt(best, i) { return best && best.tr ? best.tr[Math.min(best.tr.length - 1, i >> 1)] / 10 : null; }

  // ---------------------------------------------------------------- the map
  function geom(track) {
    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, i;
    for (i = 0; i < track.cx.length; i++) {
      minX = Math.min(minX, track.cx[i]); maxX = Math.max(maxX, track.cx[i]);
      minY = Math.min(minY, track.cy[i]); maxY = Math.max(maxY, track.cy[i]);
    }
    var sc = Math.min((CW - 2 * PAD) / (maxX - minX), (CH - 2 * PAD) / (maxY - minY));
    var ox = (CW - (maxX - minX) * sc) / 2, oy = (CH - (maxY - minY) * sc) / 2;
    // y up on the track, down on the screen
    return { sc: sc, X: function (x) { return ox + (x - minX) * sc; }, Y: function (y) { return oy + (maxY - y) * sc; } };
  }
  // a fixed random sequence, so the trees stay put
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function centreNormals(track) {
    var n = track.cx.length, nx = [], ny = [];
    for (var i = 0; i < n; i++) {
      var a = (i - 1 + n) % n, b = (i + 1) % n, dx = track.cx[b] - track.cx[a], dy = track.cy[b] - track.cy[a], l = Math.hypot(dx, dy) || 1;
      nx.push(-dy / l); ny.push(dx / l);   // to the left
    }
    return { nx: nx, ny: ny };
  }
  function drawBase(track) {
    if (baseCache[track.id]) return baseCache[track.id];
    if (track.theme && STREET[track.theme]) return (baseCache[track.id] = drawStreet(track, STREET[track.theme]));
    var cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
    var c = cv.getContext('2d'), gm = geom(track), sc = gm.sc, n = track.cx.length, i;
    var N = centreNormals(track), r = rng(7);
    // grass, dithered
    c.fillStyle = '#2d6a2b'; c.fillRect(0, 0, CW, CH);
    for (i = 0; i < 2600; i++) { c.fillStyle = r() < 0.5 ? '#32752f' : '#286126'; c.fillRect(Math.floor(r() * CW), Math.floor(r() * CH), 2, 2); }
    // mown stripes
    c.fillStyle = 'rgba(255,255,255,0.025)';
    for (i = 0; i < CW; i += 24) c.fillRect(i, 0, 12, CH);
    function path(off, closed) {
      c.beginPath();
      for (var j = 0; j <= n; j++) {
        var k = j % n, x = gm.X(track.cx[k] + N.nx[k] * off), y = gm.Y(track.cy[k] + N.ny[k] * off);
        if (j) c.lineTo(x, y); else c.moveTo(x, y);
      }
      if (closed) c.closePath();
    }
    c.lineJoin = 'round'; c.lineCap = 'round';
    // gravel traps on the outside of the big corners
    var rl = track.lx.length;
    c.fillStyle = '#c9b27a';
    for (i = 0; i < n; i += 2) {
      var kc = curvAt(track, i);
      if (Math.abs(kc) < 0.012) continue;
      var side = kc > 0 ? -1 : 1, off = side * (track.half * VIS + 8);
      var rr = 7 * sc + 1;
      c.beginPath(); c.arc(gm.X(track.cx[i] + N.nx[i] * off), gm.Y(track.cy[i] + N.ny[i] * off), rr, 0, 7); c.fill();
    }
    // trees, kept off the track and the gravel
    var trees = [];
    for (i = 0; i < 260 && trees.length < 70; i++) {
      var tx = r() * CW, ty = r() * CH, ok = true;
      for (var j = 0; j < n; j += 3) { if (Math.hypot(gm.X(track.cx[j]) - tx, gm.Y(track.cy[j]) - ty) < (track.half * VIS + 22) * sc + 6) { ok = false; break; } }
      if (ok) trees.push([tx, ty]);
    }
    trees.sort(function (a, b) { return a[1] - b[1]; }).forEach(function (t) {
      var x = Math.round(t[0]), y = Math.round(t[1]);
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x - 3, y + 2, 8, 3);
      c.fillStyle = '#17401a'; c.fillRect(x - 3, y - 4, 7, 7);
      c.fillStyle = '#1f5523'; c.fillRect(x - 2, y - 5, 5, 6);
      c.fillStyle = '#2b6e2c'; c.fillRect(x - 1, y - 4, 2, 2);
    });
    // white edge lines, then the asphalt
    path(0, true); c.strokeStyle = '#e8e8e8'; c.lineWidth = (2 * track.half * VIS + 2.4) * sc; c.stroke();
    path(0, true); c.strokeStyle = '#4a4d57'; c.lineWidth = 2 * track.half * VIS * sc; c.stroke();
    // asphalt grain
    for (i = 0; i < n; i += 1) {
      var o = (r() - 0.5) * 2 * (track.half * VIS - 1);
      c.fillStyle = r() < 0.5 ? '#454852' : '#51545e';
      c.fillRect(Math.round(gm.X(track.cx[i] + N.nx[i] * o)), Math.round(gm.Y(track.cy[i] + N.ny[i] * o)), 1, 1);
    }
    // kerbs on the inside of the corners, red and white
    for (i = 0; i < n; i++) {
      var k2 = curvAt(track, i);
      if (Math.abs(k2) < 0.009) continue;
      var sd = k2 > 0 ? 1 : -1, ko = sd * (track.half * VIS - 0.6);
      c.fillStyle = Math.floor(i / 2) % 2 ? '#e33b2e' : '#f4f4f4';
      c.fillRect(Math.round(gm.X(track.cx[i] + N.nx[i] * ko)) - 1, Math.round(gm.Y(track.cy[i] + N.ny[i] * ko)) - 1, 2, 2);
    }
    // start/finish: a checkered band across the track where the lap starts
    var s0 = nearestCentre(track, track.lx[0], track.ly[0]);
    for (var q = -3; q <= 3; q++) {
      for (var w = -Math.round(track.half * VIS); w < Math.round(track.half * VIS); w += 2) {
        var a2 = (s0 + q + n) % n;
        c.fillStyle = ((q + 3) + (w / 2 | 0)) % 2 ? '#111' : '#fff';
        c.fillRect(Math.round(gm.X(track.cx[a2] + N.nx[a2] * w)), Math.round(gm.Y(track.cy[a2] + N.ny[a2] * w)), 2, 2);
      }
    }
    // pit building and grandstand by the start
    var gx = gm.X(track.cx[s0] + N.nx[s0] * (track.half * VIS + 16)), gy = gm.Y(track.cy[s0] + N.ny[s0] * (track.half * VIS + 16));
    c.fillStyle = '#1a1b20'; c.fillRect(Math.round(gx) - 22, Math.round(gy) - 5, 44, 10);
    for (i = 0; i < 10; i++) { c.fillStyle = ['#e31b6d', '#ffcc00', '#3aa0ff', '#f4f4f4'][i % 4]; c.fillRect(Math.round(gx) - 20 + i * 4, Math.round(gy) - 3, 3, 2); c.fillRect(Math.round(gx) - 19 + i * 4, Math.round(gy) + 1, 3, 2); }
    // sector marks
    (track.sectors || []).forEach(function (s) {
      var idx = Math.round(s / track.len * rl) % rl, m = nearestCentre(track, track.lx[idx], track.ly[idx]);
      c.fillStyle = '#3aa0ff';
      for (var w2 = -track.half * VIS; w2 <= track.half * VIS; w2 += 1.5) c.fillRect(Math.round(gm.X(track.cx[m] + N.nx[m] * w2)), Math.round(gm.Y(track.cy[m] + N.ny[m] * w2)), 1, 1);
    });
    baseCache[track.id] = { cv: cv, gm: gm };
    return baseCache[track.id];
  }
  // ---------------------------------------------------------------- street circuits
  // Underground-style night races: each theme draws its own surroundings.
  var STREET = {
    airfield: { ground: '#141a1f', ground2: '#18202a', road: '#2a2e36', edge: '#c9ccd2', line: '#e8e8e8', cones: true },
    highway: { ground: '#0c0f17', ground2: '#121726', road: '#30343c', edge: '#8a8f99', line: '#d8d8d8', lights: true, city: true },
    canyon: { ground: '#10170f', ground2: '#162013', road: '#2b2b2b', edge: '#d9d9d9', line: '#e3b23c', rails: true, forest: true },
    downtown: { ground: '#0a0c13', ground2: '#10131d', road: '#2e3037', edge: '#a3a8b2', line: '#d8d8d8', lights: true, city: true, dense: true, neon: true }
  };
  function drawStreet(track, th) {
    var cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
    var c = cv.getContext('2d'), gm = geom(track), sc = gm.sc, n = track.cx.length, i, j;
    var N = centreNormals(track), r = rng(11), W = track.half * VIS;
    function P(k, off) { return [gm.X(track.cx[k] + N.nx[k] * off), gm.Y(track.cy[k] + N.ny[k] * off)]; }
    function near(x, y, m) { for (var q = 0; q < n; q += 3) if (Math.hypot(gm.X(track.cx[q]) - x, gm.Y(track.cy[q]) - y) < m) return true; return false; }
    function path(off) { c.beginPath(); for (var q = 0; q <= n; q++) { var p = P(q % n, off); if (q) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); } c.closePath(); }
    // night ground, dithered
    c.fillStyle = th.ground; c.fillRect(0, 0, CW, CH);
    for (i = 0; i < 3000; i++) { c.fillStyle = r() < 0.5 ? th.ground2 : 'rgba(0,0,0,0.25)'; c.fillRect(Math.floor(r() * CW), Math.floor(r() * CH), 2, 2); }
    c.lineJoin = 'round'; c.lineCap = 'round';
    if (track.theme === 'airfield') {
      // the apron: a big pale slab with dark grass strips, hangars and a tower
      c.fillStyle = '#1d232b'; c.fillRect(0, 0, CW, CH);
      for (i = 0; i < 2600; i++) { c.fillStyle = r() < 0.5 ? '#222934' : '#192029'; c.fillRect(Math.floor(r() * CW), Math.floor(r() * CH), 2, 1); }
      for (i = 0; i < 9; i++) { var gx = r() * CW, gy = r() * CH; if (!near(gx, gy, 30)) { c.fillStyle = '#16231a'; c.fillRect(gx - 30, gy - 8, 60, 16); } }
      [[0.12, 0.83], [0.24, 0.85], [0.36, 0.84]].forEach(function (hh) {
        var x = hh[0] * CW, y = hh[1] * CH; if (near(x, y, 24)) return;
        c.fillStyle = '#0a0d11'; c.fillRect(x - 22, y - 12, 44, 24); c.fillStyle = '#2a313b'; c.fillRect(x - 20, y - 10, 40, 20);
        for (var k = 0; k < 6; k++) { c.fillStyle = '#3a4350'; c.fillRect(x - 18 + k * 7, y - 9, 3, 18); }
        c.fillStyle = '#ffcf5a'; c.fillRect(x - 3, y + 9, 6, 2);
      });
      var tx = 0.5 * CW, ty = 0.86 * CH; if (!near(tx, ty, 20)) { c.fillStyle = '#0a0d11'; c.fillRect(tx - 5, ty - 14, 10, 18); c.fillStyle = '#4a5560'; c.fillRect(tx - 4, ty - 13, 8, 8); c.fillStyle = '#7fd0ff'; c.fillRect(tx - 3, ty - 12, 6, 3); c.fillStyle = '#ff4a3a'; c.fillRect(tx - 1, ty - 16, 2, 2); }
    }
    if (th.city) {
      // city blocks with lit windows, kept off the road
      for (i = 0; i < 260; i++) {
        var bx = Math.floor(r() * CW), by = Math.floor(r() * CH), bw = 6 + Math.floor(r() * 14), bh = 5 + Math.floor(r() * 12);
        if (near(bx + bw / 2, by + bh / 2, W * sc + (th.dense ? 4 : 12) + Math.max(bw, bh) / 2)) continue;
        c.fillStyle = '#070910'; c.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
        c.fillStyle = r() < 0.5 ? '#1a1f2e' : '#20263a'; c.fillRect(bx, by, bw, bh);
        for (var wy = by + 1; wy < by + bh - 1; wy += 2) for (var wx = bx + 1; wx < bx + bw - 1; wx += 2) if (r() < 0.22) { c.fillStyle = r() < 0.7 ? '#ffd27a' : '#9fd8ff'; c.fillRect(wx, wy, 1, 1); }
        // neon signs on the street fronts
        if (th.neon && r() < 0.35) { var nc = ['#ff2bd6', '#2bf0ff', '#ffe02b', '#7cff4a'][Math.floor(r() * 4)], ng = c.createRadialGradient(bx + bw / 2, by + bh, 0, bx + bw / 2, by + bh, 8);
          ng.addColorStop(0, nc + '66'); ng.addColorStop(1, nc + '00'); c.fillStyle = ng; c.fillRect(bx + bw / 2 - 8, by + bh - 8, 16, 16); c.fillStyle = nc; c.fillRect(bx + 1, by + bh - 2, Math.max(2, bw - 2), 1); }
      }
    }
    if (th.forest) {
      // hills: dark terrain, rock outcrops and pines
      for (i = 0; i < 500; i++) { var fx = r() * CW, fy = r() * CH; if (near(fx, fy, W * sc + 6)) continue;
        if (r() < 0.12) { c.fillStyle = '#2a2722'; c.fillRect(fx, fy, 4, 3); c.fillStyle = '#3a3630'; c.fillRect(fx, fy, 3, 1); continue; }
        c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(fx - 2, fy + 2, 6, 2);
        c.fillStyle = '#0b1a0c'; c.fillRect(fx - 2, fy - 3, 5, 6); c.fillStyle = '#132a14'; c.fillRect(fx - 1, fy - 4, 3, 6); c.fillStyle = '#1d3b1c'; c.fillRect(fx, fy - 4, 1, 2); }
    }
    // the road: verge / barrier, then asphalt
    path(0); c.strokeStyle = th.edge; c.lineWidth = (2 * W + 2) * sc + 1; c.stroke();
    path(0); c.strokeStyle = th.road; c.lineWidth = 2 * W * sc; c.stroke();
    for (i = 0; i < n; i++) { var o = (r() - 0.5) * 2 * (W - 1), q2 = P(i, o); c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)'; c.fillRect(Math.round(q2[0]), Math.round(q2[1]), 1, 1); }
    // centre line: dashed white (runway / highway lanes) or a double yellow (back road)
    c.setLineDash(track.theme === 'canyon' ? [] : [3, 4]); path(0); c.strokeStyle = th.line; c.lineWidth = track.theme === 'canyon' ? 1 : 0.8; c.globalAlpha = 0.75; c.stroke(); c.globalAlpha = 1; c.setLineDash([]);
    if (track.theme === 'highway') { [-W * 0.5, W * 0.5].forEach(function (off) { c.setLineDash([2, 5]); path(off); c.strokeStyle = 'rgba(220,220,220,0.45)'; c.lineWidth = 0.6; c.stroke(); }); c.setLineDash([]); }
    // course dressing: cones at the airfield's corners, guard rails on the
    // canyon's outside edges, street lights along the highway
    for (i = 0; i < n; i += 2) {
      var kc = curvAt(track, i), side = kc > 0 ? -1 : 1;
      if (th.cones && Math.abs(kc) > 0.006 && i % 4 === 0) { [W + 0.5, -(W + 0.5)].forEach(function (off) { var q = P(i, off); c.fillStyle = '#000'; c.fillRect(Math.round(q[0]) - 1, Math.round(q[1]) - 1, 3, 3); c.fillStyle = '#ff7a1a'; c.fillRect(Math.round(q[0]), Math.round(q[1]) - 1, 1, 2); c.fillStyle = '#fff'; c.fillRect(Math.round(q[0]), Math.round(q[1]), 1, 1); }); }
      if (th.rails && Math.abs(kc) > 0.008) { var q3 = P(i, side * (W + 1.2)); c.fillStyle = (i >> 1) % 2 ? '#b9bec6' : '#7d838d'; c.fillRect(Math.round(q3[0]), Math.round(q3[1]), 2, 1); }
      if (th.lights && i % 14 === 0) { var q4 = P(i, (i % 28 ? 1 : -1) * (W + 2)); var gr = c.createRadialGradient(q4[0], q4[1], 0, q4[0], q4[1], 9); gr.addColorStop(0, 'rgba(255,170,70,0.35)'); gr.addColorStop(1, 'rgba(255,170,70,0)'); c.fillStyle = gr; c.fillRect(q4[0] - 9, q4[1] - 9, 18, 18); c.fillStyle = '#ffcf7a'; c.fillRect(Math.round(q4[0]), Math.round(q4[1]), 1, 1); }
    }
    if (th.dense) {
      // zebra crossings at the downtown corners
      for (i = 0; i < n; i += 3) { if (Math.abs(curvAt(track, i)) < 0.012 || i % 30) continue;
        for (var zw = -W + 1; zw < W; zw += 2) { var zq = P((i + 8) % n, zw); c.fillStyle = 'rgba(235,235,235,0.55)'; c.fillRect(Math.round(zq[0]), Math.round(zq[1]), 1, 2); } }
    }
    if (track.theme === 'airfield') {
      // runway lights along the straight's edges
      for (i = 0; i < n; i += 6) { if (Math.abs(curvAt(track, i)) > 0.002) continue; [W + 1.5, -(W + 1.5)].forEach(function (off) { var q = P(i, off); c.fillStyle = '#fff3c4'; c.fillRect(Math.round(q[0]), Math.round(q[1]), 1, 1); }); }
    }
    // start/finish: a checkered band and a painted gantry
    var s0 = nearestCentre(track, track.lx[0], track.ly[0]);
    for (var qq = -3; qq <= 3; qq++) for (var w = -Math.round(W); w < Math.round(W); w += 2) {
      var a2 = (s0 + qq + n) % n, pp = P(a2, w);
      c.fillStyle = ((qq + 3) + (w / 2 | 0)) % 2 ? '#111' : '#fff'; c.fillRect(Math.round(pp[0]), Math.round(pp[1]), 2, 2);
    }
    var rl = track.lx.length;
    (track.sectors || []).forEach(function (sx) {
      var idx = Math.round(sx / track.len * rl) % rl, m = nearestCentre(track, track.lx[idx], track.ly[idx]);
      for (var w2 = -W; w2 <= W; w2 += 1.5) { var q5 = P(m, w2); c.fillStyle = '#3aa0ff'; c.fillRect(Math.round(q5[0]), Math.round(q5[1]), 1, 1); }
    });
    // a cool night grade and a vignette
    c.fillStyle = 'rgba(20,30,70,0.12)'; c.fillRect(0, 0, CW, CH);
    var vg = c.createRadialGradient(CW / 2, CH / 2, CH * 0.4, CW / 2, CH / 2, CW * 0.65); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)'); c.fillStyle = vg; c.fillRect(0, 0, CW, CH);
    return { cv: cv, gm: gm, night: true };
  }

  // centreline curvature (for kerbs and gravel), from its normals' turn
  function curvAt(track, i) {
    var n = track.cx.length, a = (i - 2 + n) % n, b = (i + 2) % n;
    var ax = track.cx[i] - track.cx[a], ay = track.cy[i] - track.cy[a], bx = track.cx[b] - track.cx[i], by = track.cy[b] - track.cy[i];
    var cr = ax * by - ay * bx, la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    return 2 * cr / (la * lb * Math.hypot(bx + ax, by + ay) || 1);
  }
  function nearestCentre(track, x, y) {
    var best = 0, bd = 1e18;
    for (var i = 0; i < track.cx.length; i++) { var d = (track.cx[i] - x) * (track.cx[i] - x) + (track.cy[i] - y) * (track.cy[i] - y); if (d < bd) { bd = d; best = i; } }
    return best;
  }
  // the corner names, outside the corner they belong to: DOM labels over
  // the canvas, so they stay readable whatever size the map is shown at
  function cornerLabels(track) {
    var gm = drawBase(track).gm, rl = track.lx.length;
    return track.corners.map(function (cn, ci) {
      var mid = (cn.s0 + cn.s1) / 2, i = Math.round(mid / track.len * rl) % rl, kk = track.k[i];
      var a = (i - 1 + rl) % rl, b = (i + 1) % rl, dx = track.lx[b] - track.lx[a], dy = track.ly[b] - track.ly[a], l = Math.hypot(dx, dy) || 1;
      var side = kk > 0 ? -1 : 1, off = cn.lab || 34;   // outside of the turn
      var x = gm.X(track.lx[i] + (-dy / l) * side * off), y = gm.Y(track.ly[i] + (dx / l) * side * off);
      x = Math.max(64, Math.min(CW - 64, x)); y = Math.max(10, Math.min(CH - 10, y));
      return h('div', { class: 'trklbl', style: { left: (x / CW * 100) + '%', top: (y / CH * 100) + '%' } }, h('b', {}, String(ci + 1)), ' ' + cn.name);
    });
  }

  // cumulative time at every point of the lap
  function lapTimes(lap, track) {
    var n = lap.v.length, T = new Float64Array(n + 1), ds = track.len / n;
    for (var i = 0; i < n; i++) { var v1 = lap.v[i], v2 = lap.v[(i + 1) % n]; T[i + 1] = T[i] + 2 * ds / (v1 + v2); }
    // scale to the sim's own time (it integrates a little differently)
    var k = lap.time / T[n];
    for (i = 0; i <= n; i++) T[i] *= k;
    return T;
  }
  function idxAt(T, t) {
    var lo = 0, hi = T.length - 1;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; }
    return lo + (T[hi] > T[lo] ? (t - T[lo]) / (T[hi] - T[lo]) : 0);
  }

  // one frame of the map: base, the trail so far (coloured by what the car
  // is doing: green on the power, yellow at the limit, red on the brakes),
  // the car, and the probe from the telemetry
  function drawMap(cv, track, inst, fi) {
    var c = cv.getContext('2d'), base = drawBase(track), gm = base.gm, n = track.lx.length;
    c.imageSmoothingEnabled = false;
    c.drawImage(base.cv, 0, 0);
    var lap = play && play.lap, upto = lap ? (play.done ? n : Math.floor(fi)) : 0;
    // the racing line, faint
    c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,0.18)'; c.setLineDash([2, 3]);
    c.beginPath();
    for (var i = 0; i <= n; i++) { var k = i % n; if (i) c.lineTo(gm.X(track.lx[k]), gm.Y(track.ly[k])); else c.moveTo(gm.X(track.lx[k]), gm.Y(track.ly[k])); }
    c.stroke(); c.setLineDash([]);
    if (lap) {
      c.lineWidth = 2.6; c.lineCap = 'round';
      // one stroke per run of the same state
      for (i = 0; i < upto;) {
        var st = lap.state[i];
        c.strokeStyle = STATE_COL[st] || '#fff';
        c.beginPath(); c.moveTo(gm.X(track.lx[i]), gm.Y(track.ly[i]));
        while (i < upto && lap.state[i] === st) { var b = (i + 1) % n; c.lineTo(gm.X(track.lx[b]), gm.Y(track.ly[b])); i++; }
        c.stroke();
      }
    }
    if (lap && !play.done) drawCar(c, track, gm, fi, inst.color || '#e31b6d');
    if (probe >= 0) {
      var px = gm.X(track.lx[probe]), py = gm.Y(track.ly[probe]);
      c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.strokeRect(Math.round(px) - 4, Math.round(py) - 4, 8, 8);
    }
  }
  // the car: a little top-down sprite, pointing along the line
  function drawCar(c, track, gm, fi, col) {
    if (track.theme && STREET[track.theme]) {
      // headlights on the night circuits
      var n0 = track.lx.length, i0 = Math.floor(fi) % n0, j0 = (i0 + 6) % n0;
      var hx = gm.X(track.lx[j0]), hy = gm.Y(track.ly[j0]), gr0 = c.createRadialGradient(hx, hy, 0, hx, hy, 10);
      gr0.addColorStop(0, 'rgba(255,240,190,0.35)'); gr0.addColorStop(1, 'rgba(255,240,190,0)'); c.fillStyle = gr0; c.fillRect(hx - 10, hy - 10, 20, 20);
    }
    var n = track.lx.length, i = Math.floor(fi) % n, f = fi - Math.floor(fi), j = (i + 1) % n;
    var x = track.lx[i] + (track.lx[j] - track.lx[i]) * f, y = track.ly[i] + (track.ly[j] - track.ly[i]) * f;
    var a = (i - 2 + n) % n, b = (i + 2) % n, ang = Math.atan2(-(track.ly[b] - track.ly[a]), track.lx[b] - track.lx[a]);
    c.save(); c.translate(gm.X(x), gm.Y(y)); c.rotate(ang);
    c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(-6, -3, 13, 7);
    c.fillStyle = '#000'; c.fillRect(-7, -4, 14, 8);
    c.fillStyle = col; c.fillRect(-6, -3, 12, 6);
    c.fillStyle = '#9fd4ff'; c.fillRect(1, -2, 2, 4);
    c.fillStyle = '#fff6b0'; c.fillRect(5, -3, 1, 1); c.fillRect(5, 2, 1, 1);
    c.restore();
  }

  // the speed trace: this lap against the car's best, sectors and corners
  function drawTrace(cv, track, lap, best) {
    var cw = Math.round(cv.clientWidth || 0);
    if (cw > 0 && cv.width !== cw) cv.width = cw;
    var W = cv.width, H = cv.height, c = cv.getContext('2d'), n = lap ? lap.v.length : track.lx.length;
    var L = 30, R = 6, Tp = 12, B = 14, top = 0, i;
    c.fillStyle = '#121318'; c.fillRect(0, 0, W, H);
    if (lap) for (i = 0; i < n; i++) top = Math.max(top, lap.v[i]);
    if (best && best.tr) best.tr.forEach(function (v) { top = Math.max(top, v / 10); });
    top = Math.max(20, Math.ceil(spd(top) / 20) * 20);
    function X(i2) { return L + (W - L - R) * i2 / n; }
    function Y(ms) { return Tp + (H - Tp - B) * (1 - spd(ms) / top); }
    c.font = '7px "Press Start 2P", monospace'; c.textBaseline = 'middle';
    // grid
    for (var gv = 0; gv <= top; gv += top > 160 ? 40 : 20) {
      var yy = Tp + (H - Tp - B) * (1 - gv / top);
      c.fillStyle = '#23252e'; c.fillRect(L, Math.round(yy), W - L - R, 1);
      c.fillStyle = '#7d8190'; c.textAlign = 'right'; c.fillText(String(gv), L - 3, Math.round(yy));
    }
    // corners: shaded bands with their numbers
    track.corners.forEach(function (cn, ci) {
      var a = X(cn.s0 / track.len * n), b = X(cn.s1 / track.len * n);
      c.fillStyle = 'rgba(255,204,0,0.06)'; c.fillRect(Math.round(a), Tp, Math.max(1, Math.round(b - a)), H - Tp - B);
      c.fillStyle = '#ffcc00'; c.textAlign = 'center'; c.fillText(String(ci + 1), Math.round((a + b) / 2), H - 6);
    });
    (track.sectors || []).forEach(function (s, si) {
      var x = Math.round(X(s / track.len * n));
      c.fillStyle = '#3aa0ff'; c.fillRect(x, Tp, 1, H - Tp - B);
      c.textAlign = 'left'; c.fillText('S' + (si + 2), x + 2, Tp - 5);
    });
    c.fillStyle = '#3aa0ff'; c.textAlign = 'left'; c.fillText('S1', L + 2, Tp - 5);
    function line(get, col, w) {
      c.strokeStyle = col; c.lineWidth = w; c.beginPath();
      for (var j = 0; j < n; j++) { var v = get(j); if (v == null) continue; if (j) c.lineTo(X(j), Y(v)); else c.moveTo(X(j), Y(v)); }
      c.stroke();
    }
    if (best && best.tr) line(function (j) { return bestSpeedAt(best, j); }, '#6b6f7d', 1.5);
    if (lap) {
      // coloured by state, like the map
      c.lineWidth = 2;
      for (i = 0; i < n - 1; i++) {
        c.strokeStyle = STATE_COL[lap.state[i]];
        c.beginPath(); c.moveTo(X(i), Y(lap.v[i])); c.lineTo(X(i + 1), Y(lap.v[i + 1])); c.stroke();
      }
    }
    if (probe >= 0) { c.fillStyle = '#fff'; c.fillRect(Math.round(X(probe)), Tp, 1, H - Tp - B); }
    if (!lap && !(best && best.tr)) { c.fillStyle = '#7d8190'; c.textAlign = 'center'; c.fillText('RUN A LAP FOR TELEMETRY', W / 2, H / 2); }
  }

  // ---------------------------------------------------------------- advice
  // what's holding the car back on a circuit, in plain words
  function advice(inst, S, fig) {
    var H = fig.H, out = [], o = function (cat) { return DR.getOption(cat, inst); };
    var road = { Street: 1, Track: 1, 'Race Slick': 1 };
    if (o('ftires').lat) out.push('Skinny front runners: light for drag, but they let go early in corners. Matching Tires All Round fixes it.');
    if (!road[S.tire.kind]) out.push(S.tire.kind + ' tires on the drive wheels: great off the line, but they slide in corners. Street or track tires corner far harder.');
    if (H.bcap < 1) out.push('Drag brakes: light, but they can\'t stop hard from speed. A Big Brake Kit stops much shorter.');
    var other = S.drive === 'FWD' ? H.rear : H.front, mixed = S.drive !== 'AWD' && !o('ftires').lat && !o('ftires').match && road[S.tire.kind] && S.tire.lat > other.lat + 0.03;
    if (mixed) out.push('Your ' + S.tire.kind.toLowerCase() + ' tires are only on the drive wheels: the ' + (S.drive === 'FWD' ? 'rears' : 'fronts') + ' are still factory tires, so that end lets go first. Matching Tires All Round puts them on all four.');
    else if (fig.limit === 'front') out.push('Understeer: the front tires give up first. ' + (o('sway').adjR ? 'Move Anti-Roll Bar Balance toward the rear (−) in Tuning.' : 'Adjustable anti-roll bars let you move the balance.'));
    else if (fig.limit === 'rear') out.push('Oversteer: the rear lets go first. ' + (o('sway').adjR ? 'Move Anti-Roll Bar Balance toward the front (+) in Tuning.' : 'Adjustable anti-roll bars let you move the balance.'));
    var d = Math.abs(S.tune.psi - S.tire.optP) / S.tire.optP;
    if (d > 0.18) out.push('Tire pressure is ' + (S.tune.psi < S.tire.optP ? 'low' : 'high') + ' for corners (best near ' + S.tire.optP + ' psi): the drag launch setting costs grip here.');
    if (!out.length) out.push('A balanced build. More grip (tires, suspension, downforce) or power is what makes it faster now.');
    return out;
  }

  // ---------------------------------------------------------------- the view
  function testLapView(inst) {
    var track = DR.TRACKS[TRACK];
    if (!inst) return h('div', { class: 'dim' }, 'You need a car first.');
    var S = G.spec(inst), fig = DR.handlingFigures(inst, S), best = bestOf(inst), mySig = sig(inst);
    if (play && (play.uid !== inst.uid || play.sig !== mySig)) { play = null; probe = -1; }
    var lap = play && play.lap;
    // what this lap is measured against: the car's best before it
    function cmp() { return play && play.done ? play.prev : best; }
    function cmpName() { return play && play.done && play.pb ? 'previous best' : 'best lap'; }
    var teleHead = h('div', { class: 'plvl' });
    function renderTeleHead() { teleHead.textContent = 'TELEMETRY • speed (' + spdU() + ') around the lap' + (cmp() ? ' • grey: ' + cmpName() : ''); }

    var cv = h('canvas', { class: 'trkcv', width: CW, height: CH });
    var hud = h('div', { class: 'trkhud' });
    var hT = h('div', { class: 'hl' }), hS = h('div', { class: 'hr' }), hG = h('div', { class: 'hb' });
    hud.appendChild(hT); hud.appendChild(hS); hud.appendChild(hG);
    var trace = h('canvas', { class: 'trkspd', width: 640, height: 110 });
    var probeTxt = h('div', { class: 'gsmall dim trkprobe' }, 'Tap the trace to look at any point of the lap.');
    var side = h('div', { class: 'trkside' });

    // ---- side panel: the car, the lap, the handling figures, advice
    function sector(i) {
      var t = lap ? lap.splits[i] : null, cb = cmp(), b = cb && cb.sp[i];
      var shown = lap && (play.done || play.secDone > i);
      var cls = shown && b != null && Math.abs(t - b) > 0.005 ? (t < b ? 'good' : 'bad') : '';
      return h('div', { class: 'trksec' }, h('span', { class: 'k' }, 'S' + (i + 1)),
        h('span', { class: 'v ' + cls }, shown ? t.toFixed(2) : b != null ? b.toFixed(2) : '—'),
        shown && b != null && Math.abs(t - b) > 0.005 ? h('span', { class: 'd ' + cls }, fmtD(t - b)) : null);
    }
    function renderSide() {
      side.innerHTML = '';
      var done = lap && play.done;
      side.appendChild(h('div', { class: 'trkcard' },
        h('div', { class: 'plvl' }, 'TEST LAP • ' + track.name),
        h('div', { class: 'trklap ' + (done ? 'acc' : 'dim') }, done ? fmtLap(lap.time) : best ? fmtLap(best.t) : '-:--.--'),
        h('div', { class: 'gsmall dim' }, done ? (play.pb ? 'New best for this car!' : best ? 'Best ' + fmtLap(best.t) + ' (' + fmtD(lap.time - best.t) + ')' : '') : best ? 'Best lap for this car' : 'No lap yet: run one to see the time'),
        h('div', { class: 'trksecs' }, [0, 1, 2].map(sector)),
        done ? h('div', { class: 'gst' }, h('span', { class: 'k' }, 'TOP SPEED'), h('span', { class: 'v' }, spd(lap.top) + ' ' + spdU())) : null));
      var balTxt = fig.limit === 'front' ? 'Understeer' : fig.limit === 'rear' ? 'Oversteer' : 'Neutral';
      var bf = kmh() ? Math.round(fig.brake70 * 0.3048) + ' m' : Math.round(fig.brake70) + ' ft';
      side.appendChild(h('div', { class: 'trkcard' },
        h('div', { class: 'plvl' }, 'HANDLING'),
        gstx('SKIDPAD', fig.skidpad.toFixed(2) + ' g', 'Steady cornering grip on a 300 ft circle, like the magazines test it.'),
        gstx('70-0 MPH', bf, 'Shortest stop from 70 mph.'),
        gstx('BALANCE', balTxt, fig.limit === 'front' ? 'The front tires let go first: the car pushes wide.' : fig.limit === 'rear' ? 'The rear tires let go first: the tail steps out.' : 'Both ends grip about equally: the fastest setup.', fig.limit === 'both' ? 'good' : ''),
        gstx('TIRES', S.tire.kind, S.tire.name)));
      side.appendChild(h('div', { class: 'trkcard' }, h('div', { class: 'plvl' }, 'ENGINEER'),
        advice(inst, S, fig).map(function (t) { return h('div', { class: 'gsmall trkadv' }, t); })));
    }
    function gstx(k, v, tip, cls) { var el = h('div', { class: 'gst', title: tip }, h('span', { class: 'k' }, k), h('span', { class: 'v ' + (cls || '') }, v)); return el; }

    // ---- telemetry: speed trace + corners
    var cornerBox = h('div', { class: 'trkcorners' });
    function renderCorners() {
      cornerBox.innerHTML = '';
      if (!lap || !play.done) return;
      var rows = lap.corners.map(function (cn, ci) {
        var cb = cmp(), bs = cb && cb.tr ? (function () {
          var c0 = track.corners[ci], mn = 1e9;
          for (var j = 0; j < lap.v.length; j++) { var s = track.s[j]; if (s >= c0.s0 && s <= c0.s1) mn = Math.min(mn, bestSpeedAt(cb, j)); }
          return mn < 1e9 ? mn : null;
        })() : null;
        var bal = cn.bal < 0.985 ? 'push' : cn.bal > 1.015 ? 'loose' : 'neutral';
        var dv = bs != null ? spd(cn.min) - spd(bs) : null;
        return h('tr', { onclick: function () { probeAt(cn.at); } },
          h('td', { class: 'acc' }, String(ci + 1)), h('td', {}, cn.name),
          h('td', { class: 'num' }, spd(cn.min) + ' ' + spdU()),
          h('td', { class: 'num ' + (dv > 0 ? 'good' : dv < 0 ? 'bad' : '') }, dv ? (dv > 0 ? '+' : '') + dv : ''),
          h('td', { class: bal === 'neutral' ? 'good' : 'dim' }, bal));
      });
      cornerBox.appendChild(h('table', { class: 'trktab' },
        h('tr', {}, h('th', {}, '#'), h('th', {}, 'Corner'), h('th', {}, 'Min speed'), h('th', {}, 'vs best'), h('th', {}, 'Balance')), rows));
    }
    function setProbe(e) {
      var r = trace.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * trace.width;
      var n = track.lx.length, i = Math.round((x - 30) / (trace.width - 36) * n);
      if (i >= 0 && i < n) probeAt(i);
    }
    function probeAt(i) {
      probe = i;
      var lp = lap && play.done ? lap : null, b = bestSpeedAt(cmp(), i);
      var bits = [Math.round(track.s[i]) + ' m'];
      if (lp) bits.push(spd(lp.v[i]) + ' ' + spdU(), ord(lp.gear[i] + 1) + ' gear', ['', 'full throttle', 'at the grip limit', 'braking'][lp.state[i]]);
      if (b != null) bits.push(cmpName() + ' ' + spd(b) + ' ' + spdU());
      var cn = track.corners.filter(function (c) { return track.s[i] >= c.s0 && track.s[i] <= c.s1; })[0];
      if (cn) bits.unshift(cn.name);
      probeTxt.textContent = bits.join(' • ');
      redrawAll();
    }
    trace.addEventListener('pointerdown', function (e) { setProbe(e); trace.setPointerCapture && trace.setPointerCapture(e.pointerId); trace._drag = true; });
    trace.addEventListener('pointermove', function (e) { if (trace._drag) setProbe(e); });
    trace.addEventListener('pointerup', function () { trace._drag = false; });

    function hudFor(fi) {
      if (!lap) { hT.textContent = ''; hS.textContent = ''; hG.textContent = ''; hud.style.display = 'none'; return; }
      hud.style.display = '';
      var n = lap.v.length, i = Math.min(n - 1, Math.floor(fi));
      if (play.done) { hT.textContent = fmtLap(lap.time); hS.textContent = ''; hG.textContent = ''; hud.style.display = 'none'; return; }
      var t = Math.min(lap.time, (Date.now() - play.t0) / 1000 * play.speed);
      hT.textContent = fmtLap(t);
      hS.innerHTML = '';
      hS.appendChild(h('b', {}, String(spd(lap.v[i])))); hS.appendChild(document.createTextNode(' ' + spdU()));
      hG.innerHTML = '';
      hG.appendChild(h('span', { class: 'gear' }, String(lap.gear[i] + 1)));
      var st = lap.state[i];
      hG.appendChild(h('span', { class: 'pedal thr' + (st === 1 ? ' on' : st === 2 ? ' half' : '') }, 'THR'));
      hG.appendChild(h('span', { class: 'pedal brk' + (st === 3 ? ' on' : '') }, 'BRK'));
      if (S.fiType !== 'none') hG.appendChild(h('span', { class: 'gsmall dim' }, 'boost ' + lap.boost[i].toFixed(1)));
    }
    function redrawAll() {
      var fi = play && play.lap && !play.done ? play.fi : 0;
      drawMap(cv, track, inst, fi);
      drawTrace(trace, track, play && play.done ? lap : null, cmp());
    }

    // ---- the run
    function finish() {
      if (!play || play.done) return;
      play.done = true;
      engineStop();
      if (A.beep) { A.beep(660, 0.12); setTimeout(function () { A.beep(990, 0.25); }, 140); }
      play.prev = best;   // compare the corners to the best before this lap
      play.pb = saveLap(inst, lap);
      if (play.pb) A.click && A.click();
      best = bestOf(inst);
      var tc = document.querySelector('.topcar'); if (tc) tc.textContent = UI.circuitBest(inst);
      renderSide(); renderCorners(); renderControls(); renderTeleHead(); hudFor(0); redrawAll();
      if (play.pb && play.prev) UI.toast('New best lap: ' + fmtLap(lap.time) + ' (' + fmtD(lap.time - play.prev.t) + ')');
    }
    function frame() {
      if (!play || !play.lap || play.done || !cv.isConnected) { if (!cv.isConnected) engineStop(); return; }
      var t = (Date.now() - play.t0) / 1000 * play.speed;
      if (t >= lap.time) { finish(); return; }
      play.fi = idxAt(play.T, t);
      // live sectors
      var sd = 0, acc = 0;
      for (var k = 0; k < lap.splits.length - 1; k++) { acc += lap.splits[k]; if (t >= acc) sd = k + 1; }
      if (sd !== play.secDone) { play.secDone = sd; renderSide(); }
      hudFor(play.fi); drawMap(cv, track, inst, play.fi);
      var ei = Math.min(lap.v.length - 1, Math.floor(play.fi));
      if (play.speed === 1) engineAt(lap.v[ei], lap.gear[ei], lap.state[ei], lap.boost[ei]);
      requestAnimationFrame(frame);
    }
    function start() {
      runBtn.classList.add('busy'); runBtn.textContent = 'Running…';
      setTimeout(function () {
        var lp = DR.lapSim(inst, track, S);
        play = { uid: inst.uid, sig: mySig, lap: lp, T: lapTimes(lp, track), t0: Date.now(), speed: speedSel, done: false, secDone: 0, fi: 0 };
        lap = lp; probe = -1;
        probeTxt.textContent = 'Tap the trace to look at any point of the lap.';
        renderSide(); renderCorners(); renderControls(); renderTeleHead(); redrawAll();
        if (speedSel === 0) { finish(); return; }
        if (speedSel === 1) engineStart(S);
        requestAnimationFrame(frame);
      }, 40);
    }
    var controls = h('div', { class: 'trkctl' }), runBtn;
    function renderControls() {
      controls.innerHTML = '';
      var running = lap && !play.done;
      runBtn = btn(running ? 'Skip to end' : lap ? 'Run again' : 'Run test lap', function () { if (running) finish(); else start(); }, running ? 'small' : 'small go');
      controls.appendChild(runBtn);
      controls.appendChild(h('span', { class: 'gsmall dim' }, 'Replay'));
      [[1, '1x'], [4, '4x'], [0, 'Instant']].forEach(function (o) {
        controls.appendChild(btn(o[1], function () {
          speedSel = o[0];
          if (play && !play.done && o[0]) { var t = (Date.now() - play.t0) / 1000 * play.speed; play.speed = o[0]; play.t0 = Date.now() - t / o[0] * 1000; if (o[0] === 1) engineStart(S); else engineStop(); }
          else if (play && !play.done) finish();
          renderControls();
        }, 'chip' + (speedSel === o[0] ? ' on' : '')));
      });
    }
    renderControls(); renderSide(); renderCorners(); renderTeleHead();
    // fonts load late on a cold start: redraw once they're in
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (cv.isConnected) redrawAll(); });
    setTimeout(function () { redrawAll(); hudFor(play ? play.fi : 0); if (play && !play.done) requestAnimationFrame(frame); }, 0);
    redrawAll();

    var board = leaderboard(inst);
    return h('div', { class: 'trkview' },
      h('div', { class: 'trktop' },
        h('div', { class: 'trkmapcol' }, h('div', { class: 'trkframe' }, cv, cornerLabels(track), hud), controls),
        side),
      h('div', { class: 'trkcard trktele' }, teleHead,
        trace, probeTxt, cornerBox),
      board,
      h('div', { class: 'gsmall dim trknote' }, 'Laps are driven by the team\'s test driver: the ideal line, braking as late as the tires allow. Same parts and tune as the drag strip - except anti-roll bar balance, tires and brakes matter far more here. No money on the line.'));
  }

  UI.circuitBest = function (inst) { var b = inst && bestOf(inst); return b ? 'Best lap ' + fmtLap(b.t) : 'No lap yet'; };

  // the best lap of each of your cars on this track
  function leaderboard(inst) {
    var r = recs(TRACK), rows = G.state.cars.filter(function (c) { return r[c.uid]; }).sort(function (a, b) { return r[a.uid].t - r[b.uid].t; });
    if (!rows.length) return null;
    return h('div', { class: 'trkcard' }, h('div', { class: 'plvl' }, 'YOUR GARAGE • best laps'),
      h('table', { class: 'trktab' }, rows.map(function (c, i) {
        var rec = r[c.uid];
        return h('tr', { class: c.uid === inst.uid ? 'me' : '' }, h('td', { class: 'acc' }, String(i + 1)), h('td', {}, DR.CARS[c.carId].name),
          h('td', { class: 'num' }, fmtLap(rec.t)), h('td', { class: 'num dim' }, spd(rec.top) + ' ' + spdU()));
      })));
  }

  // ================================================================ TEAM RACING
  // The Circuit tab: Races (enter your drivers, watch them live), Team
  // (your drivers and the hiring board) and Test Lap (the ideal lap above).
  var TM = function () { return DR.Team; };
  UI.circuitTab = UI.circuitTab || 'races';
  UI.circuitView = function (inst) {
    var tab = UI.circuitTab;
    UI.cleanup = engineStop;   // leaving the screen silences the engine
    if (UI.circuitTestTrack) { if (UI.circuitTestTrack !== TRACK) { TRACK = UI.circuitTestTrack; play = null; probe = -1; } UI.circuitTestTrack = null; }
    var chips = h('div', { class: 'schips trktabs' },
      [['races', 'Races'], ['team', 'Team'], ['test', 'Test Lap']].map(function (t) {
        var n = t[0] === 'races' ? TM().active().length : t[0] === 'team' ? TM().state().drivers.length : 0;
        return btn(t[1] + (n ? ' (' + n + ')' : ''), function () { UI.circuitTab = t[0]; if (t[0] !== 'races') UI.watchRace = null; UI.refresh(); }, 'chip' + (tab === t[0] ? ' on' : ''));
      }));
    var body;
    if (tab === 'team') body = teamView();
    else if (tab === 'test' && !(inst && TM().carAway(inst.uid))) body = h('div', {}, trackChips(TRACK, function (id) { TRACK = id; play = null; probe = -1; UI.refresh(); }), testLapView(inst));
    else if (tab === 'test') body = inst && TM().carAway(inst.uid) ? h('div', { class: 'trkcard' }, h('div', {}, TM().awayText(inst.uid)), h('div', { class: 'dim gsmall' }, 'Pick another car in My Cars to run a test lap.')) : testLapView(inst);
    else {
      var r = UI.watchRace && TM().state().races.filter(function (x) { return x.id === UI.watchRace; })[0];
      body = r ? watchView(r) : racesView();
    }
    return h('div', {}, chips, body);
  };

  // a track's map as a postcard (the city map's venue cards)
  UI.circuitThumb = function (cv, track) { cv.getContext('2d').drawImage(drawBase(track).cv, 0, 0); };
  // pick one of the tracks
  function trackChips(cur, onPick) {
    return h('div', { class: 'schips trkpick' }, TM().VENUES.map(function (v) {
      var t = DR.TRACKS[v.id];
      return btn((t.theme ? '☾ ' : '') + t.name, function () { onPick(v.id); }, 'chip' + (cur === v.id ? ' on' : ''));
    }));
  }

  // ---------------------------------------------------------------- helmets
  function helmet(col, size) {
    var cv = document.createElement('canvas'); cv.width = 12; cv.height = 12; cv.className = 'helmet';
    cv.style.width = cv.style.height = (size || 24) + 'px';
    var c = cv.getContext('2d');
    c.fillStyle = '#000'; c.fillRect(2, 1, 8, 1); c.fillRect(1, 2, 10, 8); c.fillRect(2, 10, 9, 1);
    c.fillStyle = col; c.fillRect(2, 2, 8, 8); c.fillRect(3, 1, 6, 1);
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(3, 2, 3, 1);
    c.fillStyle = '#1a1d26'; c.fillRect(6, 4, 5, 3);
    c.fillStyle = '#7fd0ff'; c.fillRect(7, 4, 3, 1);
    c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(2, 8, 8, 2);
    return cv;
  }
  var SKILLS = [['brk', 'Braking'], ['cor', 'Cornering'], ['con', 'Consistency']];
  function bars(d) {
    return h('div', { class: 'skbars' }, SKILLS.map(function (k) {
      var v = Math.floor(d[k[0]]);
      return h('div', { class: 'skrow' }, h('span', { class: 'k' }, k[1]),
        h('span', { class: 'skbar' }, h('span', { class: 'pot', style: { width: d.pot + '%' } }), h('span', { class: 'val', style: { width: v + '%' } })),
        h('span', { class: 'v' }, String(v)));
    }));
  }
  function starsEl(n) { var s = ''; for (var i = 1; i <= 5; i++) s += n >= i ? '★' : n >= i - 0.5 ? '⯪' : '☆'; return h('span', { class: 'acc dstars', title: 'Potential' }, s); }
  function driverCard(d, foot, status) {
    return h('div', { class: 'ecard dcard' },
      h('div', { class: 'drow' }, helmet(d.col, 28), h('div', { class: 'grow' }, h('div', { class: 'acc ename' }, d.name),
        h('div', { class: 'gsmall dim' }, 'Age ' + d.age + ' • potential ', starsEl(TM().stars(d)))),
        status || null),
      bars(d),
      h('div', { class: 'gsmall dim' }, d.races ? d.races + ' races • ' + d.wins + ' wins • ' + d.podiums + ' podiums' : 'No races yet', ' • ', h('span', { class: 'acc' }, DR.money(d.wage) + '/race')),
      foot ? h('div', { class: 'efoot' }, foot) : null);
  }

  // ---------------------------------------------------------------- team
  function teamView() {
    var T = TM(), s = T.state();
    var mine = h('div', { class: 'egrid dgrid' });
    s.drivers.forEach(function (d) {
      var busy = T.active().filter(function (r) { return r.drv === d.id; })[0];
      mine.appendChild(driverCard(d,
        busy ? btn('Watch', function () { UI.circuitTab = 'races'; UI.watchRace = busy.id; UI.refresh(); }, 'small') :
          btn('Release', function () { UI.confirm('Release ' + d.name + '? They leave the team (no refund).', function () { var w = T.release(d.id); if (w) UI.toast(w); UI.refresh(); }, 'Release'); }, 'small red'),
        busy ? h('span', { class: 'ewon' }, 'RACING') : h('span', { class: 'etype good' }, 'FREE')));
    });
    for (var i = s.drivers.length; i < T.MAX; i++) mine.appendChild(h('div', { class: 'ecard dcard empty' }, h('div', { class: 'dim' }, 'Empty seat'), h('div', { class: 'gsmall dim' }, 'Hire a driver from the board below.')));
    var board = h('div', { class: 'egrid dgrid' });
    s.board.forEach(function (d, i) {
      var full = s.drivers.length >= T.MAX;
      board.appendChild(driverCard(d, btn('Hire ' + DR.money(d.fee), function () {
        var w = T.hire(i); if (w) return UI.toast(w);
        A.cash && A.cash(); UI.toast(d.name + ' joins the team!'); UI.refresh();
      }, 'small ' + (full || !G.canAfford(d.fee) ? 'nofit' : 'go'))));
    });
    var left = T.racesToNewBoard();
    return h('div', {},
      h('div', { class: 'stagehead' }, h('div', { class: 'grow' }, h('div', { class: 'plvl' }, 'YOUR TEAM • ' + s.drivers.length + ' / ' + T.MAX + ' drivers'),
        h('div', { class: 'dim' }, 'Drivers race your cars on the circuit. Braking and cornering decide how much of the car\'s limit they use; consistency how steady their laps are and how often they make a mistake. Skills grow as they race, up to their potential (★): young drivers have the most room to grow.'))),
      mine,
      h('div', { class: 'stagehead', style: { marginTop: '10px' } }, h('div', { class: 'grow' }, h('div', { class: 'plvl' }, 'HIRING BOARD'),
        h('div', { class: 'dim' }, 'Signing fee up front, then a wage every race they run. New faces in ' + left + ' race' + (left === 1 ? '' : 's') + '.')),
        btn('Scout now ' + DR.money(T.SCOUT_COST), function () { if (!T.scout()) return UI.toast('Scouting costs ' + DR.money(T.SCOUT_COST)); UI.refresh(); }, 'small')),
      board);
  }

  // ---------------------------------------------------------------- races
  function racesView() {
    var T = TM(), s = T.state(), live = T.active();
    var out = [];
    if (!s.drivers.length) out.push(h('div', { class: 'trkcard callout' }, h('div', { class: 'acc pix' }, 'No drivers yet'),
      h('div', {}, 'Circuit races are run by your hired drivers, in your cars. Hire one on the Team tab: rookies are cheap and learn fast.'),
      btn('Go to Team', function () { UI.circuitTab = 'team'; UI.refresh(); }, 'small go')));
    if (live.length) {
      var lg = h('div', { class: 'egrid' });
      live.forEach(function (r) {
        var cls = T.classById(r.cls), d = T.driver(r.drv), t = T.clock(r), rows = T.standings(r, t), me = rows.filter(function (x) { return x.e.you; })[0];
        var car = G.state.cars.filter(function (c) { return c.uid === r.car; })[0];
        lg.appendChild(h('div', { class: 'ecard livecard', onclick: function () { UI.watchRace = r.id; UI.refresh(); } },
          h('div', { class: 'drow' }, helmet(d ? d.col : '#888', 22), h('div', { class: 'grow' }, h('div', { class: 'acc ename' }, cls.name), h('div', { class: 'gsmall dim' }, (d ? d.name : '') + ' • ' + (car ? DR.CARS[car.carId].name : ''))), h('span', { class: 'ewon live' }, 'LIVE')),
          h('div', { class: 'gst' }, h('span', { class: 'k' }, 'P' + (rows.indexOf(me) + 1) + ' • LAP ' + Math.min(r.laps, me.w.lap + 1) + '/' + r.laps), h('span', { class: 'v' }, 'back in ' + T.fmtLeft(T.left(r)))),
          h('div', { class: 'efoot' }, btn('⏩ 4×' + (r.ff ? ' ON' : ''), function (e) { e.stopPropagation(); T.setFast(r, !r.ff); UI.refresh(); }, 'small chip' + (r.ff ? ' on' : '')),
            btn('Watch', function () { UI.watchRace = r.id; UI.refresh(); }, 'small go'))));
      });
      out.push(h('div', { class: 'plvl secthead' }, 'LIVE NOW'), lg);
    }
    out.push(seriesCard());
    // the venue: the circuit or one of the night street circuits
    var tid = DR.TRACKS[UI.circuitTrack] ? UI.circuitTrack : 'pixel', ven = T.venue(tid), trk = DR.TRACKS[tid];
    var thumb = h('canvas', { class: 'venthumb', width: CW, height: CH });
    thumb.getContext('2d').drawImage(drawBase(trk).cv, 0, 0);
    out.push(h('div', { class: 'plvl secthead' }, 'VENUE'), trackChips(tid, function (id) { UI.circuitTrack = id; UI.refresh(); }),
      h('div', { class: 'trkcard venue' }, h('div', { class: 'venrow' }, thumb, h('div', { class: 'grow' }, h('div', { class: 'acc pix' }, trk.name),
        h('div', { class: 'gsmall dim' }, (trk.len / 1000).toFixed(2) + ' km • ' + trk.corners.length + ' corners' + (trk.theme ? ' • night street circuit' : '')),
        h('div', {}, ven.blurb)))));
    var grid = h('div', { class: 'egrid' });
    T.CLASSES.forEach(function (cls) {
      var won = s.wins[cls.id] || 0, unl = [];
      if (!won) { if (cls.perf) unl.push(DR.LEVEL_NAMES[cls.perf] + ' parts'); var n = (cls.stages || []).reduce(function (a, si) { return a + DR.carsAtStage(si).filter(function (id) { return !G.careerState().cars[id]; }).length; }, 0); if (n) unl.push(n + ' cars'); }
      grid.appendChild(h('div', { class: 'ecard clcard' },
        h('div', { class: 'drow' }, h('span', { class: 'clbadge' }, cls.id), h('div', { class: 'grow' }, h('div', { class: 'acc ename' }, cls.name),
          h('div', { class: 'gsmall dim' }, cls.floor ? 'Ideal lap ' + T.fmtLap(cls.floor) + ' or slower' : 'Any car, no limits')), won ? h('span', { class: 'etype good' }, '✔ ' + won) : null),
        h('div', { class: 'gst' }, h('span', { class: 'k' }, 'LAPS'), h('span', { class: 'v' }, String(T.lapsAt(cls, tid)))),
        h('div', { class: 'gst' }, h('span', { class: 'k' }, 'ENTRY'), h('span', { class: 'v' }, DR.money(cls.fee) + ' + wage')),
        h('div', { class: 'gst' }, h('span', { class: 'k' }, 'WIN'), h('span', { class: 'v acc' }, DR.money(T.prize(cls, 1, tid)) + (T.isNight(tid) ? ' ☾' : ''))),
        unl.length ? h('div', { class: 'gsmall eunl' }, '🔓 First win: ' + unl.join(' + ')) : null,
        h('div', { class: 'efoot' }, h('span', { class: 'gsmall dim' }, 'Field of 6 • ~' + Math.max(1, Math.round(cls.laps * (cls.floor || cls.pace) / T.SPEED / 60)) + ' min'),
          btn('Enter', function () { entryModal(cls, tid); }, 'small go'))));
    });
    out.push(h('div', { class: 'plvl secthead' }, 'RACES • ' + trk.name), grid);
    if (s.history.length) {
      out.push(h('div', { class: 'plvl secthead' }, 'RECENT RESULTS'));
      out.push(h('div', { class: 'trkcard' }, h('table', { class: 'trktab' }, s.history.slice(0, 6).map(function (x) {
        return h('tr', {}, h('td', { class: x.pos === 1 ? 'acc' : '' }, 'P' + x.pos), h('td', {}, T.classById(x.cls).name, h('div', { class: 'gsmall dim' }, DR.TRACKS[x.track || 'pixel'].name)), h('td', {}, x.drv), h('td', { class: 'dim' }, DR.CARS[x.car] ? DR.CARS[x.car].name : ''),
          h('td', { class: 'num' }, x.prize ? '+' + DR.money(x.prize) : '—'));
      }))));
    }
    out.push(h('div', { class: 'gsmall dim trknote' }, 'Races run at 4x real time; ⏩ 4× time speeds a race up 4x more (16x), from the race card or while you watch. While a car is at the track it can\'t be drag raced, worked on, shown or sold. Circuit wins open parts and cars at the dealer, the same as drag racing does.'));
    return h('div', {}, out);
  }

  // the Night Series: start a season, or its table and next round
  var seriesCls = 'D';
  function seriesCard() {
    var T = TM(), se = T.series(), out = [h('div', { class: 'plvl secthead' }, '☾ NIGHT SERIES • street circuit championship')];
    if (!se || se.done) {
      var last = null;
      if (se && se.done) { var tb = T.seriesTable(); last = h('div', { class: 'gsmall acc' }, 'Last season: P' + se.pos + ' in the ' + T.classById(se.cls).name + (se.prize ? ', +' + DR.money(se.prize) : '') + ' • champion ' + tb[0].name + ' (' + tb[0].pts + ' pts)' + (tb[1] ? ', then ' + tb[1].name + ' ' + tb[1].pts + ', ' + (tb[2] ? tb[2].name + ' ' + tb[2].pts : '') : '')); }
      out.push(h('div', { class: 'trkcard' },
        h('div', {}, 'Four night rounds: Bayview Airfield, Route 99, Canyon Run and the Downtown Grand Prix. One car and one driver all season against the same five rivals; points 25-18-15-12-10-8 every round, and a title prize for the top three (3x the class win for the champion).'), last,
        h('div', { class: 'schips' }, T.CLASSES.map(function (c) { return btn(c.id + ' • ' + c.name, function () { seriesCls = c.id; UI.refresh(); }, 'chip' + (seriesCls === c.id ? ' on' : '')); })),
        h('div', { class: 'efoot' }, h('span', { class: 'gsmall dim' }, 'Each round: entry + wage as usual, night prizes +25%'),
          btn('Start a season', function () { entryModal(T.classById(seriesCls), T.SERIES[0], true); }, 'small go'))));
      return h('div', {}, out);
    }
    var cls = T.classById(se.cls), live = T.active().filter(function (r) { return r.series != null; })[0], d = T.driver(se.drv);
    var car = G.state.cars.filter(function (c) { return c.uid === se.car; })[0];
    var table = T.seriesTable();
    out.push(h('div', { class: 'trkcard' },
      h('div', { class: 'drow' }, h('span', { class: 'clbadge' }, cls.id), h('div', { class: 'grow' }, h('div', { class: 'acc ename' }, cls.name + ' Night Series'),
        h('div', { class: 'gsmall dim' }, (d ? d.name : '?') + ' • ' + (car ? DR.CARS[car.carId].name : '?') + ' • round ' + Math.min(se.round + 1, T.SERIES.length) + ' of ' + T.SERIES.length + ': ' + DR.TRACKS[T.SERIES[Math.min(se.round, T.SERIES.length - 1)]].name))),
      h('table', { class: 'trktab' }, h('tr', {}, h('th', {}, 'P'), h('th', {}, 'Driver'), T.SERIES.map(function (tid, k) { return h('th', { class: 'num' }, 'R' + (k + 1)); }), h('th', { class: 'num' }, 'Pts')),
        table.map(function (row, i) {
          return h('tr', { class: row.you ? 'me' : '' }, h('td', { class: 'acc' }, String(i + 1)), h('td', {}, h('span', { class: 'dot', style: { background: row.col } }), row.name, h('div', { class: 'gsmall dim' }, row.team)),
            T.SERIES.map(function (tid, k) { var res = se.res[k]; if (!res) return h('td', { class: 'num dim' }, '—'); var p = res.indexOf(row.you ? 'you' : row.name) + 1; return h('td', { class: 'num' + (p === 1 ? ' acc' : '') }, p ? 'P' + p : '—'); }),
            h('td', { class: 'num acc' }, String(row.pts)));
        })),
      h('div', { class: 'efoot' },
        btn('Retire', function () { UI.confirm('Retire from this season? Points so far are lost.', function () { var w = T.quitSeries(); if (w) UI.toast(w); UI.refresh(); }, 'Retire'); }, 'small red'),
        live ? btn('Watch round ' + (se.round + 1), function () { UI.watchRace = live.id; UI.refresh(); }, 'small go') :
          btn('Run round ' + (se.round + 1) + ': ' + DR.TRACKS[T.SERIES[se.round]].name, function (e) {
            var b = e.currentTarget; b.classList.add('busy'); b.textContent = 'Qualifying…';
            setTimeout(function () { var res = T.nextRound(); if (!res.race) { UI.toast(res.msg); UI.refresh(); return; } UI.watchRace = res.race.id; UI.refresh(); }, 30);
          }, 'small go'))));
    return h('div', {}, out);
  }

  // pick a car and a driver for a class
  function entryModal(cls, tid, series) {
    var T = TM(), s = T.state(), selCar = null, selDrv = null, close;
    var carBox = h('div', { class: 'col entlist' }), drvBox = h('div', { class: 'col entlist' }), sum = h('div', { class: 'entsum' }), go;
    var free = s.drivers.filter(function (d) { return !T.driverBusy(d.id); });
    if (!s.drivers.length) return UI.toast('Hire a driver first (Team tab)');
    if (!free.length) return UI.toast('All your drivers are racing');
    function status(inst) {
      if (T.carAway(inst.uid)) return 'At the track';
      if (inst.damage) return 'Broken';
      return T.eligible(inst, cls) ? 'Too quick' : '';
    }
    function render() {
      carBox.innerHTML = ''; drvBox.innerHTML = '';
      G.state.cars.forEach(function (inst) {
        var why = status(inst), lap = T.idealLap(inst);
        if (!selCar && !why) selCar = inst.uid;
        carBox.appendChild(h('div', { class: 'entrow' + (selCar === inst.uid ? ' on' : '') + (why ? ' off' : ''), onclick: function () { if (why) return UI.toast(why === 'Too quick' ? T.eligible(inst, cls) : why); selCar = inst.uid; render(); } },
          h('span', { class: 'grow' }, DR.CARS[inst.carId].name), h('span', { class: 'dim' }, 'rating ' + T.fmtLap(lap)), why ? h('span', { class: 'bad' }, why) : null));
      });
      free.forEach(function (d) { if (!selDrv) selDrv = d.id; });
      s.drivers.forEach(function (d) {
        var busy = T.driverBusy(d.id);
        drvBox.appendChild(h('div', { class: 'entrow' + (selDrv === d.id ? ' on' : '') + (busy ? ' off' : ''), onclick: function () { if (busy) return UI.toast(d.name + ' is racing'); selDrv = d.id; render(); } },
          helmet(d.col, 18), h('span', { class: 'grow' }, d.name), h('span', { class: 'dim' }, 'B' + Math.floor(d.brk) + ' C' + Math.floor(d.cor) + ' K' + Math.floor(d.con)), h('span', { class: 'acc' }, DR.money(d.wage))));
      });
      var d = T.driver(selDrv), cost = cls.fee + (d ? d.wage : 0);
      sum.innerHTML = '';
      sum.appendChild(h('div', {}, 'Entry ' + DR.money(cls.fee) + ' + wage ' + DR.money(d ? d.wage : 0) + ' = ', h('b', { class: 'acc' }, DR.money(cost))));
      sum.appendChild(h('div', { class: 'gsmall dim' }, 'Prizes: ' + cls.prize.filter(Boolean).map(function (p, i) { return 'P' + (i + 1) + ' ' + DR.money(T.prize(cls, i + 1, tid)); }).join(' • ') + (T.isNight(tid) ? ' (night race +25%)' : '')));
      if (series) sum.appendChild(h('div', { class: 'gsmall acc' }, 'Season: the same car and driver for all four rounds (Airfield, Route 99, Canyon, Downtown). Points 25-18-15-12-10-8; the champion wins ' + DR.money(Math.round(cls.prize[0] * T.TITLE[0] / 50) * 50) + '.'));
    }
    go = btn('Send to the track', function () {
      if (!selCar) return UI.toast('No car can enter this class');
      go.classList.add('busy'); go.textContent = 'Qualifying…';
      setTimeout(function () {
        var res = series ? T.startSeries(cls.id, selCar, selDrv) : T.enter(cls.id, selCar, selDrv, tid);
        if (!res.race) { go.classList.remove('busy'); go.textContent = 'Send to the track'; return UI.toast(res.msg); }
        close(); UI.watchRace = res.race.id; A.cash && A.cash(); UI.refresh();
      }, 30);
    }, 'primary');
    // ideal laps take a moment the first time: draw after the modal shows
    close = UI.modal([h('h2', {}, series ? cls.name + ' • Night Series' : cls.name + ' • ' + DR.TRACKS[tid].name), h('div', { class: 'gsmall dim' }, (cls.floor ? 'Cars whose ideal lap at Pixel Raceway is ' + T.fmtLap(cls.floor) + ' or slower' : 'Any car') + ' • ' + T.lapsAt(cls, tid) + ' laps • 6 cars'),
      h('div', { class: 'plvl' }, 'CAR'), carBox, h('div', { class: 'plvl' }, 'DRIVER'), drvBox, sum,
      h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '8px' } }, btn('Cancel', function () { close(); }), go)]);
    carBox.appendChild(h('div', { class: 'dim' }, 'Working out lap times…'));
    setTimeout(render, 30);
  }

  // ---------------------------------------------------------------- watch
  function watchView(r) {
    var T = TM(), track = DR.TRACKS[r.track || T.TRACK], cls = T.classById(r.cls), d = T.driver(r.drv);
    var cv = h('canvas', { class: 'trkcv', width: CW, height: CH }), table = h('div', { class: 'trkcard standings' }), head = h('div', { class: 'stagehead' });
    var base = drawBase(track), gm = base.gm, n = track.lx.length, lastTab = 0;
    function draw() {
      var t = r.done ? r.end : T.clock(r), c = cv.getContext('2d');
      c.imageSmoothingEnabled = false; c.drawImage(base.cv, 0, 0);
      var rows = T.standings(r, t);
      // your car's engine, while it's racing (silent at 16x: too fast to follow)
      var mine = rows.filter(function (x) { return x.e.you; })[0], car = G.state.cars.filter(function (c) { return c.uid === r.car; })[0];
      if (mine && r.snd && car && !mine.w.done && !r.done && !r.ff && cv.isConnected) {
        if (!eng) engineStart(G.spec(car));
        var si = Math.min(r.snd.v.length - 1, Math.floor(mine.w.frac * r.snd.v.length));
        engineAt(r.snd.v[si], r.snd.g[si], r.snd.s[si], r.snd.b[si]);
      } else if (eng) engineStop();
      rows.slice().reverse().forEach(function (x) {
        if (x.w.done) return;
        var fi = (x.w.frac * n) % n;
        drawCar(c, track, gm, fi, x.e.col);
        if (x.e.you) {
          var i = Math.floor(fi), px = gm.X(track.lx[i]), py = gm.Y(track.ly[i]);
          c.strokeStyle = '#ffcc00'; c.lineWidth = 1.5; c.beginPath(); c.arc(px, py, 9, 0, 7); c.stroke();
        }
      });
      return { t: t, rows: rows };
    }
    function renderTable(st) {
      var me = st.rows.filter(function (x) { return x.e.you; })[0], lead = st.rows[0];
      var allDone = r.done || st.rows.every(function (x) { return x.w.done; });
      head.innerHTML = '';
      head.appendChild(h('div', { class: 'grow' }, h('div', { class: 'plvl' }, cls.name.toUpperCase() + ' • ' + track.name),
        h('div', { class: 'pix acc' }, allDone ? 'FINISHED' : 'LAP ' + Math.min(r.laps, lead.w.lap + 1) + ' / ' + r.laps),
        h('div', { class: 'dim gsmall' }, allDone ? 'Results are in.' : 'Race time ' + T.fmtLeft(st.t) + ' • back in ' + T.fmtLeft(T.left(r)))));
      if (!allDone) head.appendChild(btn('⏩ 4× time' + (r.ff ? ' ON' : ''), function () { T.setFast(r, !r.ff); UI.refresh(); }, 'small chip' + (r.ff ? ' on' : '')));
      head.appendChild(btn('◀ Races', function () { UI.watchRace = null; UI.refresh(); }, 'small'));
      table.innerHTML = '';
      table.appendChild(h('table', { class: 'trktab' }, h('tr', {}, h('th', {}, 'P'), h('th', {}, 'Driver'), h('th', {}, 'Car'), h('th', {}, allDone ? 'Time' : 'Gap'), h('th', {}, 'Best')),
        st.rows.map(function (x, i) {
          var gap;
          if (allDone || x.w.done) gap = i === 0 ? T.fmtLap(x.e.cum[x.e.cum.length - 1]) : '+' + (x.e.cum[x.e.cum.length - 1] - lead.e.cum[lead.e.cum.length - 1]).toFixed(2);
          else if (i === 0) gap = 'Leader';
          else { var lapsDown = Math.floor(lead.prog) - Math.floor(x.prog); gap = lapsDown >= 1 && lead.w.lap > x.w.lap ? '+' + lapsDown + ' lap' : '+' + Math.max(0, (lead.prog - x.prog) * (r.base)).toFixed(1); }
          return h('tr', { class: x.e.you ? 'me' : '' }, h('td', { class: 'acc' }, String(i + 1)),
            h('td', {}, h('span', { class: 'dot', style: { background: x.e.col } }), x.e.name, h('div', { class: 'gsmall dim' }, x.e.team)),
            h('td', { class: 'dim' }, DR.CARS[x.e.car] ? DR.CARS[x.e.car].name : ''),
            h('td', { class: 'num' }, gap), h('td', { class: 'num dim' }, (x.w.lap > 1 || x.w.done) && x.e.best < 1e8 ? T.fmtLap(x.e.best) : '—'));
        })));
      if (allDone) {
        var pos = st.rows.indexOf(me) + 1, prize = T.prize(cls, pos, r.track), hist = T.state().history[0];
        table.appendChild(h('div', { class: 'resline' }, h('span', { class: pos === 1 ? 'acc pix' : 'pix' }, 'P' + pos), ' ', (d ? d.name : 'Your driver'),
          prize ? h('span', { class: 'good' }, ' +' + DR.money(prize)) : null,
          hist && hist.grew && Object.keys(hist.grew).length ? h('div', { class: 'gsmall' }, 'Learned: ' + Object.keys(hist.grew).map(function (k) { return SKILLS.filter(function (s2) { return s2[0] === k; })[0][1] + ' +' + hist.grew[k]; }).join(', ')) : null,
          hist && hist.unl && hist.unl.length ? h('div', { class: 'gsmall acc' }, 'UNLOCKED: ' + hist.unl.join(' • ')) : null,
          me.e.err ? h('div', { class: 'gsmall dim' }, me.e.err + ' mistake' + (me.e.err > 1 ? 's' : '') + ' (off line or a lock-up): consistency improves with racing') : null));
      }
    }
    (function loop() {
      if (!cv.isConnected && lastTab) { engineStop(); return; }
      var st = draw(), now = Date.now();
      if (now - lastTab > 300) { lastTab = now; renderTable(st); if (!r.done && T.clock(r) >= r.end) DR.Team.report(); }
      if (!r.done) requestAnimationFrame(loop);   // (stops itself once the screen is gone)
      else engineStop();
    })();
    return h('div', {}, head, h('div', { class: 'trktop' }, h('div', { class: 'trkmapcol' }, h('div', { class: 'trkframe' }, cv, cornerLabels(track))), h('div', { class: 'trkside wide' }, table)));
  }
})();

