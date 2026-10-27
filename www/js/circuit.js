// ===========================================================================
// CIRCUIT — the road-course side of a build: how hard it corners, brakes and
// drives off a corner, and what that's worth over a lap.
//
// The lap is a quasi-steady-state lap simulation, the method commercial lap
// simulators use:
//   1. along a fixed racing line, the fastest speed the car can hold through
//      every point of every corner (lateral grip, with downforce);
//   2. a backward pass: braking into each corner, sharing the tires'
//      friction circle with the cornering;
//   3. a forward pass: driving out of each corner with the real engine curve,
//      gearing, shift times, turbo lag, drag and traction;
//   the slower of the two at every point is the lap.
//
// Grip is worked out per axle with lateral load transfer and tire load
// sensitivity (a tire's grip grows slower than its load, so weight transfer
// costs grip): the weaker axle sets the car's limit and tells you whether it
// understeers or oversteers. Everything comes from DR.buildSpec, so the same
// parts and tune that run the quarter mile run the lap.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = 9.81;
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

  // Tire grip falls with load: a tire's force ~ load^0.85.
  var LOAD_N = 0.85, BRAKE_K = 1.1;
  // Grip on a circuit vs the skidpad: on a warm track at speed (warm tires,
  // kerbs, camber, transient peaks) cars corner a little harder than on the
  // magazines' 300 ft skidpad. Calibrated so laps of the real Hockenheim GP
  // match sport auto's / Autozeitung's road-car times (C6 Z06 1:57.9, S550
  // Mustang GT 2:01.2, Aventador SVJ 1:47.3) within ~2.5%.
  DR.CIRCUIT_GRIP = 1.07;

  // ---------------------------------------------------------------- handling
  // Track width (m): from the car's length, a fair guess for a road car.
  function trackWidth(car) { return car.tw || clamp(0.3 * car.len + 0.2, 1.3, 1.75); }
  // Roll stiffness on the front axle: front-heavy cars carry more of it
  // (built-in understeer), FWD the most; the adjustable bars move it.
  function rollFront(car, S, T, sway) {
    var base = S.drive === 'FWD' ? 0.62 : car.ep === 'mid' ? 0.48 : car.ep === 'rear' ? 0.44 : 0.56;
    return clamp(base + (sway.adjR ? (T.rollBal || 0) * 0.025 : 0), 0.3, 0.8);
  }

  // The chassis and tire technology of the car's era: a 1990s car on a
  // performance tire still corners less than a modern one on the same size
  // (older compounds and suspension geometry). car.hc overrides it.
  function era(car) {
    if (car.hc) return car.hc;
    var y = +(String(car.real || '').match(/(19|20)\d\d/) || [2010])[0];
    return y < 1960 ? 0.86 : y < 1980 ? 0.9 : y < 1990 ? 0.93 : y < 2000 ? 0.95 : y < 2010 ? 0.97 : 1;
  }
  DR.carEra = era;
  // Everything a lap needs to know about a build. S from DR.buildSpec.
  DR.handling = function (inst, S) {
    S = S || DR.buildSpec(inst);
    var car = S.car, o = function (cat) { return DR.getOption(cat, inst); };
    var springs = o('springs'), shocks = o('shocks'), sway = o('sway'), brakes = o('brakes'), ft = o('ftires'), aero = o('aero');
    var T = S.tune || {};
    // tire pressure: the drag tune's pressure, which off the optimum costs
    // grip both ways (low = rolling sidewalls, high = small contact patch)
    var d = (T.psi - S.tire.optP) / S.tire.optP;
    var pressK = clamp(1 - 0.6 * d * d, 0.6, 1);
    var drive = S.tire, factory = DR.TIRES[car.tire];
    var road = { Street: 1, Track: 1, 'Race Slick': 1 };
    // the tires on the axle that isn't driven
    var other = ft.lat ? { lat: ft.lat, name: 'Skinny front runners', kind: 'Runner' } : ft.match && road[drive.kind] ? drive : factory;
    var front = S.drive === 'RWD' ? other : drive, rear = S.drive === 'FWD' ? other : drive;
    if (S.drive === 'AWD') { front = drive; rear = drive; }
    var hg = (springs.hg || 1) * (shocks.hg || 1) * (sway.hg || 1) * era(car);
    var muF = front.lat * hg * (front === drive ? pressK : 1);
    var muR = rear.lat * hg * (rear === drive ? pressK : 1);
    // driving off a corner: drive tires' straight-line grip on a circuit
    // (unprepped: about 72% of what they get on a prepped drag strip)
    var muX = Math.max(drive.lat, drive.mu * 0.72) * pressK;
    // downforce: the car's own (a few cars have real aero) plus the part
    var claCar = car.cla || 0, claPart = aero.cla || 0;
    var cla = claCar + claPart;
    var claF = cla ? ((car.cla || 0) * (car.claF || 0.4) + claPart * (aero.claF || 0)) / cla : 0;
    return {
      m: S.m, f: S.f, L: S.L, h: Math.max(0.3, S.h), tw: trackWidth(car), rollF: rollFront(car, S, T, sway),
      muF: muF, muR: muR, muX: muX, front: front, rear: rear, drive: S.drive,
      cla: cla, claF: claF, cda: S.cda, crr: S.crr,
      bcap: brakes.bcap || 1.3, bias: brakes.bias || 0.97,
      adjBal: !!sway.adjR
    };
  };

  // The most cornering one axle can do (m/s^2 of the whole car's lateral
  // acceleration): its two tires share the load the car puts on them, minus
  // what shifts from the inside to the outside, each tire's grip falling
  // with load.
  function axleLimit(H, v, front) {
    var share = front ? H.f : 1 - H.f;               // this axle's share of the cornering force
    var mu = front ? H.muF : H.muR, roll = front ? H.rollF : 1 - H.rollF;
    var down = 0.5 * DR.RHO * H.cla * v * v * (front ? H.claF : 1 - H.claF);
    var N = H.m * G * share + down, nom = H.m * G * share / 2;   // axle load, a tire's static load
    var lo = 0, hi = 4 * G;
    for (var k = 0; k < 30; k++) {
      var ay = (lo + hi) / 2, dF = H.m * ay * H.h / H.tw * roll;
      var inner = Math.max(0, N / 2 - dF), outer = N / 2 + dF;
      var cap = mu * Math.pow(nom, 1 - LOAD_N) * (Math.pow(inner, LOAD_N) + Math.pow(outer, LOAD_N));
      if (cap >= H.m * ay * share) lo = ay; else hi = ay;
    }
    return lo;
  }
  // Lateral limit of the car at a speed and which axle gives up first.
  DR.latLimit = function (H, v) {
    var f = axleLimit(H, v, true), r = axleLimit(H, v, false);
    return { ay: Math.min(f, r), front: f, rear: r, bal: f / r };   // bal < 1: understeer
  };
  // Hardest braking (m/s^2) at a speed, before drag: each axle's grip with
  // the load moved forward, brake balance, and what the brakes can do.
  DR.brakeLimit = function (H, v) {
    // tires brake a little harder than they corner (and ABS holds them there)
    var down = 0.5 * DR.RHO * H.cla * v * v, muBF = H.muF * BRAKE_K, muBR = H.muR * BRAKE_K;
    // a = bias * (muF*Nf + muR*Nr) / m with Nf = mgf + DFf + m a h/L
    var Nf0 = H.m * G * H.f + down * H.claF, Nr0 = H.m * G * (1 - H.f) + down * (1 - H.claF);
    var a = H.bias * (muBF * Nf0 + muBR * Nr0) / H.m / (1 - H.bias * (H.h / H.L) * (muBF - muBR));
    return Math.min(a, H.bcap * G + down / H.m * 0.5);
  };

  // Skidpad (300 ft circle) and braking from 70 mph, as the magazines test.
  DR.handlingFigures = function (inst, S) {
    S = S || DR.buildSpec(inst);
    var H = DR.handling(inst, S), R = 45.72, v = 20;
    for (var k = 0; k < 20; k++) v = Math.sqrt(DR.latLimit(H, v).ay * R);
    var lat = DR.latLimit(H, v);
    // 70-0: integrate braking (grip + drag + rolling)
    var x = 0, vv = 31.29, dt = 0.002;
    while (vv > 0) { var a = DR.brakeLimit(H, vv) + 0.5 * DR.RHO * H.cda * vv * vv / H.m + H.crr * G; x += vv * dt; vv -= a * dt; }
    return { skidpad: lat.ay / G, balance: lat.bal, limit: lat.bal < 0.985 ? 'front' : lat.bal > 1.015 ? 'rear' : 'both', brake70: x / 0.3048, H: H };
  };

  // ---------------------------------------------------------------- drive
  // Wheel force (N) at full throttle with a given boost, in a gear, at a
  // road speed; 0 past the rev limiter.
  function driveForce(S, gi, v, boost) {
    var ratio = S.ratios[gi] * S.fd, rpm = v / S.r * ratio * 60 / (2 * Math.PI);
    if (rpm > S.red + 1) return -1;
    rpm = Math.max(rpm, Math.min(S.red - 500, (S.tune && S.tune.launchRpm) || 3000));   // slipping the clutch below that
    var b = S.fiType === 'none' ? 0 : Math.min(boost, DR.steadyBoost(S, rpm));
    return DR.boostedTorque(S, rpm, b) * ratio * S.eff / S.r;
  }
  // The best gear at a speed (most force, under the limiter).
  function bestGear(S, v, boost) {
    var best = 0, bf = -1;
    for (var g = 0; g < S.ratios.length; g++) { var f = driveForce(S, g, v, boost); if (f > bf) { bf = f; best = g; } }
    return { g: best, F: Math.max(0, bf) };
  }
  // Mass plus the wheels, driveline and engine spinning up in a gear.
  function effMass(S, gi) { var ratio = S.ratios[gi] * S.fd; return S.m + (S.Iw + S.Ie * ratio * ratio * S.eff) / (S.r * S.r); }

  // ---------------------------------------------------------------- lap
  // track: { s: [] distance, k: [] curvature (1/m, signed), len, sectors: [s,..], corners: [{ name, s0, s1 }] }
  // Returns the lap: time, sector times, and per-point speed, gear, throttle/
  // brake/corner state and g's.
  DR.lapSim = function (inst, track, S) {
    S = S || DR.buildSpec(inst);
    // on the circuit, not the skidpad (see DR.CIRCUIT_GRIP)
    var H = Object.assign({}, DR.handling(inst, S)), n = track.s.length, ds = track.len / n, i, k;
    H.muF *= DR.CIRCUIT_GRIP; H.muR *= DR.CIRCUIT_GRIP; H.muX *= DR.CIRCUIT_GRIP;
    var vmax = 110;
    // 1. cornering speed at every point (downforce makes it a fixed point)
    var vc = new Float64Array(n), lim = new Array(n);
    for (i = 0; i < n; i++) {
      var kk = Math.abs(track.k[i]), v = vmax;
      if (kk > 1e-5) {
        v = 30;
        for (k = 0; k < 12; k++) v = Math.min(vmax, Math.sqrt(DR.latLimit(H, v).ay / kk));
      }
      vc[i] = v;
    }
    var mg = S.m * G;
    function ayUse(i2, v2) { var kk2 = Math.abs(track.k[i2]); if (kk2 < 1e-5) return 0; var L2 = DR.latLimit(H, v2); return clamp(v2 * v2 * kk2 / L2.ay, 0, 1); }
    // 2+3. forward (power) and backward (brakes) passes, twice round so the
    // lap is a flying lap
    function backward(vIn) {
      var v = new Float64Array(n);
      for (i = 0; i < n; i++) v[i] = vIn[i];
      for (var lap = 0; lap < 2; lap++) {
        for (var j = 2 * n - 1; j >= 0; j--) {
          var a = j % n, b = (j + 1) % n;
          var u = v[b], used = ayUse(a, u);
          var dec = DR.brakeLimit(H, u) * Math.sqrt(Math.max(0, 1 - used * used)) + 0.5 * DR.RHO * H.cda * u * u / S.m + H.crr * G;
          var vb = Math.sqrt(u * u + 2 * dec * ds);
          if (vb < v[a]) v[a] = vb;
        }
      }
      return v;
    }
    var vb = backward(vc);
    // forward pass with gears, shift times and turbo spool
    var v = new Float64Array(n), gear = new Int8Array(n), thr = new Float32Array(n), state = new Int8Array(n), boostA = new Float32Array(n), axA = new Float32Array(n);
    var full = S.fiType === 'none' ? 0 : S.boostSet;
    var cur = Math.min(vb[0], 20), g = bestGear(S, cur, full).g, shiftLeft = 0, boost = full * 0.5, t = 0, prevSt = 1;
    var tsec = [], secIdx = 0, sectors = (track.sectors || []).slice();
    for (var lap = 0; lap < 2; lap++) {
      if (lap === 1) { t = 0; tsec = []; secIdx = 0; }
      for (i = 0; i < n; i++) {
        var vNow = cur, used = ayUse(i, vNow);
        // gears: on the throttle, up a gear at the limiter or when the next
        // one pulls harder (a shift costs drive for the shift time); off it
        // (braking, turning in), down to whichever gear pulls best, free
        if (prevSt === 1) {
          var fNow = driveForce(S, g, vNow, boost);
          if (g < S.ratios.length - 1 && (fNow < 0 || driveForce(S, g + 1, vNow, boost) > fNow)) { g++; shiftLeft = S.shiftTime; }
        } else g = bestGear(S, vNow, boost).g;
        var F = shiftLeft > 0 ? 0 : driveForce(S, g, vNow, boost);
        if (F < 0) F = 0;
        // traction: the drive axle's grip, less what the cornering uses
        var axleN = H.drive === 'FWD' ? mg * H.f : H.drive === 'AWD' ? mg : mg * (1 - H.f);
        var down = 0.5 * DR.RHO * H.cla * vNow * vNow;
        axleN += H.drive === 'FWD' ? down * H.claF : H.drive === 'AWD' ? down : down * (1 - H.claF);
        var trac = H.muX * axleN * Math.sqrt(Math.max(0, 1 - used * used));
        var Fx = Math.min(F, trac);
        var acc = (Fx - 0.5 * DR.RHO * H.cda * vNow * vNow - H.crr * mg) / effMass(S, g);
        var vNext = Math.sqrt(Math.max(1, vNow * vNow + 2 * acc * ds));
        var nxt = (i + 1) % n, capV = Math.min(vc[nxt], vb[nxt]);
        var st;   // 1 full throttle, 2 cornering at the limit, 3 braking
        if (vNext > capV) {
          st = capV < vNow - 0.05 ? 3 : 2;
          vNext = capV;
        } else st = 1;
        var dt = 2 * ds / (vNow + vNext);
        t += dt;
        if (shiftLeft > 0) shiftLeft -= dt;
        // turbo: spools while on the throttle, falls away when off it
        var target = st === 1 ? full : st === 2 ? full * 0.55 : 0;
        var rpm = vNow / S.r * S.ratios[g] * S.fd * 60 / (2 * Math.PI);
        var tau = target > boost ? (S.lag || 0.3) * Math.sqrt((S.spoolHi || 4000) / Math.max(rpm, 1500)) : 0.25 + (S.bovT || 0.15);
        boost += (target - boost) * Math.min(1, dt / tau);
        if (lap === 1) {
          v[i] = vNow; gear[i] = g; state[i] = st; boostA[i] = boost; axA[i] = (vNext - vNow) / dt;
          thr[i] = st === 1 ? 1 : st === 2 ? 0.5 : 0;
          while (secIdx < sectors.length && track.s[i] >= sectors[secIdx]) { tsec.push(t); secIdx++; }
        }
        cur = vNext; prevSt = st;
      }
    }
    // sector times from the split marks
    var splits = [], prev = 0;
    tsec.push(t);
    for (k = 0; k < tsec.length; k++) { splits.push(tsec[k] - prev); prev = tsec[k]; }
    // per-corner minimum speeds and the car's balance there
    var corners = (track.corners || []).map(function (c) {
      var mn = 1e9, at = c.s0;
      for (var j = 0; j < n; j++) { var s = track.s[j], inC = c.s0 <= c.s1 ? s >= c.s0 && s <= c.s1 : s >= c.s0 || s <= c.s1; if (inC && v[j] < mn) { mn = v[j]; at = j; } }
      var L = DR.latLimit(H, mn);
      return { name: c.name, min: mn, at: at, bal: L.bal };
    });
    var top = 0, topAt = 0, ayPk = 0, brPk = 0;
    for (i = 0; i < n; i++) {
      if (v[i] > top) { top = v[i]; topAt = i; }
      var ay = v[i] * v[i] * Math.abs(track.k[i]); if (ay > ayPk) ayPk = ay;
      if (-axA[i] > brPk) brPk = -axA[i];
    }
    var fig = DR.handlingFigures(inst, S);
    return { time: t, splits: splits, v: v, gear: gear, state: state, thr: thr, boost: boostA, ax: axA, top: top, topAt: topAt, latPeak: ayPk / G, brakePeak: brPk / G,
      corners: corners, skidpad: fig.skidpad, balance: fig.balance, limit: fig.limit, brake70: fig.brake70, H: H };
  };

  // ---------------------------------------------------------------- racing line
  // The line through the corners, from a centerline with widths. This is
  // Remi Coulom's K1999 algorithm (the TORCS racing AI's): every point is
  // moved across the track until its curvature is the average of its
  // neighbours' - so curvature changes smoothly, which gives the classic
  // outside-inside-outside line - working coarse to fine (every 64th point,
  // then every 32nd, ... every point) so whole corners settle quickly.
  // pts: [{ x, y, wl, wr }] closed and evenly spaced (wl/wr: the track to
  // the left/right of the centerline). inside/outside: how close (m) the
  // car's centre comes to the inside and outside edges.
  DR.racingLine = function (pts, inside, outside, iterK) {
    var n = pts.length, i;
    inside = inside == null ? 1.0 : inside; outside = outside == null ? 1.2 : outside;
    // the edges, from directions and widths smoothed over a few points
    // (surveyed edges are a little ragged)
    var Lx = new Float64Array(n), Ly = new Float64Array(n), Rx = new Float64Array(n), Ry = new Float64Array(n), Wd = new Float64Array(n);
    var W = 3;
    for (i = 0; i < n; i++) {
      var a = pts[(i - W + n) % n], b = pts[(i + W) % n], tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1;
      var nx = -ty / l, ny = tx / l, wl = 0, wr = 0;
      for (var j0 = -W; j0 <= W; j0++) { wl += pts[(i + j0 + n) % n].wl; wr += pts[(i + j0 + n) % n].wr; }
      wl /= 2 * W + 1; wr /= 2 * W + 1;
      Lx[i] = pts[i].x + nx * wl; Ly[i] = pts[i].y + ny * wl;
      Rx[i] = pts[i].x - nx * wr; Ry[i] = pts[i].y - ny * wr;
      Wd[i] = wl + wr;
    }
    // lane: 0 on the left edge, 1 on the right
    var lane = new Float64Array(n), X = new Float64Array(n), Y = new Float64Array(n);
    function upd(j) { X[j] = Lx[j] + lane[j] * (Rx[j] - Lx[j]); Y[j] = Ly[j] + lane[j] * (Ry[j] - Ly[j]); }
    for (i = 0; i < n; i++) { lane[i] = pts[i].wl / (pts[i].wl + pts[i].wr); upd(i); }
    // signed curvature of the circle through three points (left turn > 0)
    function rInv(p, x, y, q) {
      var x1 = X[q] - x, y1 = Y[q] - y, x2 = X[p] - x, y2 = Y[p] - y, x3 = X[q] - X[p], y3 = Y[q] - Y[p];
      var det = x1 * y2 - x2 * y1, nnn = Math.sqrt((x1 * x1 + y1 * y1) * (x2 * x2 + y2 * y2) * (x3 * x3 + y3 * y3));
      return nnn ? 2 * det / nnn : 0;
    }
    function adjust(p, j, q, target, security) {
      var old = lane[j];
      // start from the straight line between the neighbours
      var dxp = X[q] - X[p], dyp = Y[q] - Y[p];
      var den = dyp * (Rx[j] - Lx[j]) - dxp * (Ry[j] - Ly[j]);
      if (Math.abs(den) > 1e-9) lane[j] = clamp((-dyp * (Lx[j] - X[p]) + dxp * (Ly[j] - Y[p])) / den, -0.2, 1.2);
      upd(j);
      // then a Newton step towards the target curvature
      var dl = 0.0001, dRI = rInv(p, X[j] + dl * (Rx[j] - Lx[j]), Y[j] + dl * (Ry[j] - Ly[j]), q);
      if (dRI > 1e-9) {
        lane[j] += dl / dRI * target;
        var ext = Math.min(0.5, (outside + security) / Wd[j]), intl = Math.min(0.5, (inside + security) / Wd[j]);
        if (target >= 0) {          // turning left: the left edge is the inside
          if (lane[j] < intl) lane[j] = intl;
          if (1 - lane[j] < ext) lane[j] = 1 - old < ext ? Math.min(old, lane[j]) : 1 - ext;
        } else {
          if (lane[j] < ext) lane[j] = old < ext ? Math.max(old, lane[j]) : ext;
          if (1 - lane[j] < intl) lane[j] = 1 - intl;
        }
      }
      upd(j);
    }
    function smooth(step) {
      var m = Math.floor(n / step) * step;
      var prev = m - step, pprev = prev - step, next = step, nnext = 2 * step;
      for (var j = 0; j < m; j += step) {
        var ri0 = rInv(pprev, X[prev], Y[prev], j), ri1 = rInv(j, X[next], Y[next], nnext);
        var lp = Math.hypot(X[j] - X[prev], Y[j] - Y[prev]), ln = Math.hypot(X[j] - X[next], Y[j] - Y[next]);
        var target = (ln * ri0 + lp * ri1) / (ln + lp);
        adjust(prev, j, next, target, lp * ln / 800);
        pprev = prev; prev = j; next = nnext; nnext = (next + step) % m;
      }
    }
    function interpolate(step) {   // the points in between, on a smooth curve
      var m = Math.floor(n / step) * step;
      for (var j = 0; j < m; j += step) {
        var p = j, q = (j + step) % m, pp = (j - step + m) % m, qq = (q + step) % m;
        var ri0 = rInv(pp, X[p], Y[p], q), ri1 = rInv(p, X[q], Y[q], qq);
        for (var k = 1; k < step; k++) {
          var t = j + k; if (t >= n) break;
          var x = k / step, target = x * ri1 + (1 - x) * ri0;
          adjust(p, t, q === 0 && m < n ? q : q, target, 0);
        }
      }
      for (var t2 = m; t2 < n; t2++) adjust(m - step, t2, 0, 0, 0);   // the last few, if n isn't a multiple
    }
    var iters = iterK || 100;
    for (var step = 128; (step = step >> 1) > 0;) {
      if (n / step < 8) continue;
      for (var r = Math.round(iters * Math.sqrt(step)); r > 0; r--) smooth(step);
      if (step > 1) interpolate(step);
    }
    var off = new Float64Array(n);
    for (i = 0; i < n; i++) off[i] = pts[i].wl - lane[i] * Wd[i];   // m left of the centreline
    return { x: X, y: Y, off: off, lane: lane };
  };
  // Resample a closed polyline every `step` m, and its curvature (smoothed).
  DR.trackProfile = function (X, Y, step, smooth) {
    var n = X.length, i, L = [0];
    for (i = 1; i <= n; i++) L.push(L[i - 1] + Math.hypot(X[i % n] - X[i - 1], Y[i % n] - Y[i - 1]));
    var len = L[n], m = Math.round(len / step), xs = [], ys = [], s = [], j = 0;
    for (i = 0; i < m; i++) {
      var d = i * len / m;
      while (L[j + 1] < d) j++;
      var t = (d - L[j]) / (L[j + 1] - L[j]), a = j % n, b = (j + 1) % n;
      xs.push(X[a] + (X[b] - X[a]) * t); ys.push(Y[a] + (Y[b] - Y[a]) * t); s.push(d);
    }
    // curvature from the heading change over +-w points (a smoothed 3-point fit)
    var w = smooth || 3, k = [];
    for (i = 0; i < m; i++) {
      var p0 = (i - w + m) % m, p1 = (i + w) % m;
      var h0 = Math.atan2(ys[i] - ys[p0], xs[i] - xs[p0]), h1 = Math.atan2(ys[p1] - ys[i], xs[p1] - xs[i]);
      var dh = h1 - h0; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
      k.push(dh / (w * len / m));
    }
    return { x: xs, y: ys, s: s, k: k, len: len };
  };
})();
