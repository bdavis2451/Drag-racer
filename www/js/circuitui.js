// ===========================================================================
// CIRCUIT UI — the test track: a top-down map of the circuit, a flying lap
// by an ideal test driver (DR.lapSim) played back on it, the car's handling
// figures, and telemetry (speed against distance, corner by corner) with
// each car's best lap kept to compare against.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, A = DR.Audio, h = UI.h, btn = UI.btn;
  var TRACK = 'pixel';
  var CW = 600, CH = 330, PAD = 34;   // map canvas (pixels, drawn pixelated)
  var VIS = 1.5;         // the track's drawn width vs its real 12 m: readable at this scale
  var STATE_COL = { 1: '#4cd964', 2: '#ffcc00', 3: '#ff4a3a' };
  var play = null;      // the lap on screen: { uid, sig, lap, T, t0, speed, done }
  var speedSel = 4, probe = -1;
  var baseCache = {};   // the drawn track, per track

  function kmh() { return G.state.settings.units === 'kmh'; }
  function spd(ms) { return Math.round(ms * (kmh() ? 3.6 : 2.23694)); }
  function spdU() { return kmh() ? 'km/h' : 'mph'; }
  function fmtLap(t) { var m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); }
  function fmtD(d) { return (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(2); }
  function ord(g) { return g + (g === 1 ? 'st' : g === 2 ? 'nd' : g === 3 ? 'rd' : 'th'); }
  // what the lap depends on: a changed part or tune means a new lap
  function sig(inst) { return JSON.stringify([inst.carId, inst.engine, inst.parts, inst.tune]); }

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
  UI.circuitView = function (inst) {
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
      play.prev = best;   // compare the corners to the best before this lap
      play.pb = saveLap(inst, lap);
      if (play.pb) A.click && A.click();
      best = bestOf(inst);
      var tc = document.querySelector('.topcar'); if (tc) tc.textContent = UI.circuitBest(inst);
      renderSide(); renderCorners(); renderControls(); renderTeleHead(); hudFor(0); redrawAll();
      if (play.pb && play.prev) UI.toast('New best lap: ' + fmtLap(lap.time) + ' (' + fmtD(lap.time - play.prev.t) + ')');
    }
    function frame() {
      if (!play || !play.lap || play.done || !cv.isConnected) return;
      var t = (Date.now() - play.t0) / 1000 * play.speed;
      if (t >= lap.time) { finish(); return; }
      play.fi = idxAt(play.T, t);
      // live sectors
      var sd = 0, acc = 0;
      for (var k = 0; k < lap.splits.length - 1; k++) { acc += lap.splits[k]; if (t >= acc) sd = k + 1; }
      if (sd !== play.secDone) { play.secDone = sd; renderSide(); }
      hudFor(play.fi); drawMap(cv, track, inst, play.fi);
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
          if (play && !play.done && o[0]) { var t = (Date.now() - play.t0) / 1000 * play.speed; play.speed = o[0]; play.t0 = Date.now() - t / o[0] * 1000; }
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
  };

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
})();
