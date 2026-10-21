// ===========================================================================
// RENDER — pixel-art sprites & scene. Everything is drawn onto a small
// low-resolution canvas which CSS scales up with crisp (pixelated) edges.
// ===========================================================================
(function () {
  var DR = globalThis.DR;
  var PPM = 14;                 // pixels per metre
  DR.PPM = PPM;
  DR.VIEW_W = 400; DR.VIEW_H = 225;

  // ------------------------------------------------------------ colour helpers
  function hexToRgb(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function shade(rgb, f) { return f >= 0 ? rgb.map(function (c) { return Math.round(c + (255 - c) * f); }) : rgb.map(function (c) { return Math.round(c * (1 + f)); }); }
  function css(rgb) { return 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')'; }
  DR.shadeHex = function (hex, f) { return css(shade(hexToRgb(hex), f)); };

  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  DR.rng = rng;

  // ------------------------------------------------------------ pixel font 3x5
  var GLYPH = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
    '5': '111100111001111', '6': '111100111101111', '7': '111001001010010', '8': '111101111101111', '9': '111101111001111',
    'A': '010101111101101', 'B': '110101110101110', 'C': '011100100100011', 'D': '110101101101110', 'E': '111100110100111',
    'F': '111100110100100', 'G': '011100101101011', 'H': '101101111101101', 'I': '111010010010111', 'J': '001001001101010',
    'K': '101101110101101', 'L': '100100100100111', 'M': '101111111101101', 'N': '110101101101101', 'O': '010101101101010',
    'P': '110101110100100', 'Q': '010101101110011', 'R': '110101110101101', 'S': '011100010001110', 'T': '111010010010010',
    'U': '101101101101111', 'V': '101101101101010', 'W': '101101111111101', 'X': '101101010101101', 'Y': '101101010010010',
    'Z': '111001010100111', '.': '000000000000010', ':': '000010000010000', '/': '001001010100100', '-': '000000111000000',
    "'": '010010000000000', '$': '011110010011110', '!': '010010010000010', ' ': '000000000000000', '%': '101001010100101'
  };
  DR.pixText = function (ctx, str, x, y, color, scale) {
    scale = scale || 1; ctx.fillStyle = color;
    str = String(str).toUpperCase();
    for (var i = 0; i < str.length; i++) {
      var g = GLYPH[str[i]] || GLYPH[' '];
      for (var p = 0; p < 15; p++) if (g[p] === '1') ctx.fillRect(x + (p % 3) * scale, y + Math.floor(p / 3) * scale, scale, scale);
      x += 4 * scale;
    }
  };
  DR.pixTextW = function (str, scale) { return String(str).length * 4 * (scale || 1) - (scale || 1); };

  // ------------------------------------------------------------ body profiles
  // x: 0 (rear bumper) .. 100 (front bumper). y: units above the ground, same
  // scale as x. wr / wf: wheel-centre x. hood: x range of the hood for blowers.
  var BODIES = {
    hatch:    { pts: [[1,6],[0,12],[1,21],[9,24],[22,34],[30,35.5],[57,34.5],[73,23],[96,19],[100,15],[99,6]], win: [[11,23.5],[23,32.5],[56,32.5],[69,23]], wr: 17, wf: 82, hood: [74, 92] },
    sedan:    { pts: [[0,8],[1,18],[14,20],[26,31],[56,32],[68,21.5],[96,18.5],[100,14],[99,7]], win: [[28,21.5],[33,29.5],[55,30],[64,21.5]], wr: 17, wf: 81, hood: [70, 90] },
    coupe:    { pts: [[0,9],[1,17.5],[16,19.5],[30,28.5],[54,29.5],[66,20],[97,16.5],[100,12],[99,7]], win: [[32,20.5],[37,26.5],[53,27.5],[62,20.5]], wr: 17, wf: 82, hood: [68, 90] },
    sports:   { pts: [[0,9],[1,16.5],[8,18],[30,27.5],[48,27.5],[62,18],[97,13.5],[100,10],[99,6]], win: [[23,19],[32,25.5],[47,25.5],[57,18.5]], wr: 17, wf: 82, hood: [64, 88] },
    modern:   { pts: [[0,9],[1,18.5],[12,20],[32,29],[52,29],[64,21],[97,18],[100,13],[99,7]], win: [[30,21.5],[36,27],[51,27],[60,21.5]], wr: 17, wf: 81, hood: [66, 90] },
    muscle:   { pts: [[0,8],[0,18.5],[18,19.5],[30,28],[52,28],[60,19.5],[100,18],[100,8]], win: [[31,20],[35,26.5],[51,26.5],[57,20]], wr: 17, wf: 80, hood: [62, 92] },
    classic:  { pts: [[0,9],[0,21],[6,22],[10,19.5],[30,20],[34,30],[56,30],[62,20],[100,19],[100,9]], win: [[35,21],[37,28.5],[55,28.5],[59,21]], wr: 18, wf: 80, hood: [64, 92] },
    gasser:   { pts: [[0,10],[0,22],[12,24],[18,36],[42,36],[46,26],[95,27],[100,23],[100,15],[60,13]], win: [[20,27],[22,34],[40,34],[43,27]], wr: 16, wf: 83, hood: [50, 90] },
    beetle:   { pts: [[0,8],[0,16],[6,24],[24,36],[50,37],[68,28],[88,22],[100,15],[100,8]], win: [[26,27],[30,33.5],[50,34],[62,27]], wr: 17, wf: 81, hood: [70, 92] },
    roadster: { pts: [[0,9],[1,18],[30,19],[38,20],[43,25],[46,19],[97,15],[100,11],[99,7]], win: [[42,20],[44.5,24]], wr: 17, wf: 82, hood: [50, 90], head: [37, 23] },
    supercar: { pts: [[0,10],[0,17],[22,22],[45,28],[57,27.5],[78,17],[100,12],[99,6],[0,6]], win: [[34,22.5],[45,26.5],[56,26],[70,18.5]], wr: 18, wf: 84, hood: [8, 30] },
    truck:    { pts: [[0,11],[0,25],[40,25],[41,26],[44,40],[62,40],[68,28],[97,26],[100,21],[100,11]], win: [[46,29],[48,37.5],[61,37.5],[65,29]], wr: 15, wf: 81, hood: [70, 94] },
    promod:   { pts: [[0,8],[0,17],[14,19],[32,27],[52,27],[63,19],[97,15],[100,11],[99,6]], win: [[30,19.5],[35,25],[51,25],[59,19.5]], wr: 16, wf: 82, hood: [66, 90] },
    dragster: { pts: [[0,8],[0,13],[9,13],[13,18],[22,18],[24,12],[100,9],[100,7],[0,7]], win: [], wr: 7, wf: 97, hood: [16, 22], head: [17, 20], rail: true }
  };
  DR.BODIES = BODIES;

  function inPoly(pts, x, y) {
    var c = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }

  // ------------------------------------------------------------ car sprite
  // look = {carId, color, stripe, rim, tireR, frontR, blower, wing, bar}
  var spriteCache = {};
  DR.carLook = function (inst) {
    var car = DR.CARS[inst.carId];
    var fi = DR.partId('fi', inst), fiu = DR.FI[fi];
    var aero = DR.partId('aero', inst);
    var tire = DR.TIRES[DR.partId('rtires', inst)];
    return {
      carId: inst.carId, body: car.body, len: car.len,
      color: inst.color || car.col, stripe: inst.stripe || '', rim: inst.rim || '#c8c8c8',
      tireR: tire.r, frontR: car.body === 'dragster' ? 0.24 : DR.partId('ftires', inst) !== 'stock' ? 0.30 : DR.TIRES[car.tire].r,
      slick: tire.kind === 'Slick',
      blower: !!(fiu.price && (fiu.type === 'roots' || fiu.type === 'screw')),
      scoop: !!(fiu.price && fiu.type === 'turbo' && fiu.flow > 1000),
      wing: aero === 'a2' ? 2 : aero === 'a1' ? 1 : 0,
      bar: DR.partId('wheeliebar', inst) !== 'stock'
    };
  };

  DR.carSprite = function (look) {
    var key = JSON.stringify(look);
    if (spriteCache[key]) return spriteCache[key];
    var B = BODIES[look.body] || BODIES.coupe;
    var lenPx = Math.round(look.len * PPM);
    var u = lenPx / 100;
    var maxY = 0; B.pts.forEach(function (p) { if (p[1] > maxY) maxY = p[1]; });
    var padL = 4, padT = 12;
    var W = lenPx + padL + 3, H = Math.ceil(maxY * u) + padT + 2;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    var img = ctx.createImageData(W, H), d = img.data;
    var base = hexToRgb(look.color);
    var stripe = look.stripe ? hexToRgb(look.stripe) : null;
    var groundY = H - 1;
    var rR = look.tireR * PPM, rF = look.frontR * PPM;
    var stockR = 0.31 * PPM;
    var wheelR = { x: padL + B.wr * u, y: groundY - rR, r: rR };
    var wheelF = { x: padL + B.wf * u, y: groundY - rF, r: rF };
    var archR = { x: wheelR.x, y: groundY - stockR, r: Math.max(stockR, rR * 0.92) + 1.2 };
    var archF = { x: wheelF.x, y: groundY - stockR, r: Math.max(stockR, rF) + 1.2 };

    function body(px, py) {
      var ux = (px - padL + 0.5) / u, uy = (groundY - py + 0.5) / u;
      return inPoly(B.pts, ux, uy);
    }
    function win(px, py) {
      if (!B.win.length) return false;
      return inPoly(B.win, (px - padL + 0.5) / u, (groundY - py + 0.5) / u);
    }
    function inArch(px, py, a) { var dx = px + 0.5 - a.x, dy = py + 0.5 - a.y; return dx * dx + dy * dy < a.r * a.r && py + 0.5 > a.y - a.r * 0.95; }
    function put(px, py, c, a) { var i = (py * W + px) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a == null ? 255 : a; }

    var mask = new Uint8Array(W * H);
    for (var py = 0; py < H; py++) for (var px = 0; px < W; px++) {
      if (!body(px, py)) continue;
      if (!B.rail && (inArch(px, py, archR) || inArch(px, py, archF))) { mask[py * W + px] = 2; continue; }
      mask[py * W + px] = 1;
    }
    var winC = [28, 40, 58], winH = [90, 120, 150], archC = [16, 16, 18];
    for (py = 0; py < H; py++) for (px = 0; px < W; px++) {
      var mv = mask[py * W + px];
      if (!mv) continue;
      if (mv === 2) { put(px, py, archC); continue; }
      var up = py > 0 ? mask[(py - 1) * W + px] : 0, dn = py < H - 1 ? mask[(py + 1) * W + px] : 0;
      var lf = px > 0 ? mask[py * W + px - 1] : 0, rt = px < W - 1 ? mask[py * W + px + 1] : 0;
      var up2 = py > 1 ? mask[(py - 2) * W + px] : 0;
      var edge = up !== 1 || dn === 0 || lf === 0 || rt === 0;
      var c;
      if (win(px, py)) {
        c = ((px + (H - py)) % 9 === 0 || (px + (H - py)) % 9 === 1) ? winH : winC;
      } else {
        var rel = (groundY - py) / (maxY * u);
        c = edge ? shade(base, -0.55) : (up2 !== 1 ? shade(base, 0.32) : rel < 0.28 ? shade(base, -0.22) : base);
        if (stripe && !edge && rel > 0.45 && rel < 0.55) c = stripe;
      }
      put(px, py, c);
    }
    ctx.putImageData(img, 0, 0);

    // lights
    var tailY = Math.round(groundY - (B.rail ? 10 : 15) * u);
    ctx.fillStyle = '#ff2a2a'; ctx.fillRect(padL, tailY, 2, 2);
    if (!B.rail) {
      var frontX = Math.round(padL + 98.5 * u) - 2, headY = Math.round(groundY - 14 * u);
      ctx.fillStyle = '#ffe9a0'; ctx.fillRect(frontX, headY, 2, 2);
    }
    // driver helmet for open cars
    if (B.head) {
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(Math.round(padL + B.head[0] * u) - 1, Math.round(groundY - B.head[1] * u) - 2, 3, 3);
      ctx.fillStyle = '#222'; ctx.fillRect(Math.round(padL + B.head[0] * u) + 1, Math.round(groundY - B.head[1] * u) - 1, 1, 1);
    }
    // hood: find top of body at the hood centre
    function topAt(ux) { var px = Math.round(padL + ux * u); for (var y = 0; y < H; y++) if (mask[y * W + px] === 1) return y; return groundY; }
    if (look.blower) {
      var hx = (B.hood[0] + B.hood[1]) / 2, top = topAt(hx), bx = Math.round(padL + hx * u) - 4;
      ctx.fillStyle = '#b8bec8'; ctx.fillRect(bx, top - 5, 8, 5);
      ctx.fillStyle = '#7d848f'; ctx.fillRect(bx, top - 2, 8, 1);
      ctx.fillStyle = '#2b2b2b'; ctx.fillRect(bx + 1, top - 8, 6, 3);
      ctx.fillStyle = '#d23a3a'; ctx.fillRect(bx + 1, top - 8, 6, 1);
    } else if (look.scoop) {
      var hx2 = (B.hood[0] + B.hood[1]) / 2, top2 = topAt(hx2), sx = Math.round(padL + hx2 * u) - 4;
      ctx.fillStyle = css(shade(base, -0.1)); ctx.fillRect(sx, top2 - 2, 9, 2);
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(sx + 7, top2 - 2, 2, 2);
    }
    if (look.wing) {
      var wTop = topAt(3) - (look.wing === 2 ? 6 : 2);
      ctx.fillStyle = '#1d1d1d';
      ctx.fillRect(padL + 2, wTop + 1, 1, topAt(3) - wTop);
      ctx.fillRect(padL + 6, wTop + 1, 1, topAt(7) - wTop);
      ctx.fillStyle = css(shade(base, -0.3)); ctx.fillRect(padL - 2, wTop, look.wing === 2 ? 12 : 9, 2);
    }
    var spr = { canvas: cv, w: W, h: H, padL: padL, lenPx: lenPx, groundY: groundY, wheelR: wheelR, wheelF: wheelF,
      exhaust: { x: padL - 1, y: groundY - Math.round(6 * u) }, rail: !!B.rail, bar: look.bar, look: look };
    spriteCache[key] = spr;
    return spr;
  };

  function drawWheel(ctx, x, y, r, ang, rimColor, slick) {
    ctx.fillStyle = '#121212';
    circle(ctx, x, y, r);
    ctx.fillStyle = slick ? '#1e1e1e' : '#262626';
    circle(ctx, x, y, r - 1);
    ctx.fillStyle = rimColor;
    var rr = Math.max(1.5, r * (slick ? 0.5 : 0.62));
    circle(ctx, x, y, rr);
    ctx.fillStyle = '#3a3a3a';
    for (var k = 0; k < 3; k++) {
      var a = ang + k * Math.PI * 2 / 3;
      ctx.fillRect(Math.round(x + Math.cos(a) * rr * 0.6) - 0.5, Math.round(y + Math.sin(a) * rr * 0.6) - 0.5, 1, 1);
    }
    ctx.fillStyle = '#888'; ctx.fillRect(Math.round(x) - 0.5, Math.round(y) - 0.5, 1, 1);
  }
  function circle(ctx, x, y, r) {
    // pixel circle via horizontal spans
    var R = Math.max(1, r);
    for (var dy = -Math.ceil(R); dy <= Math.ceil(R); dy++) {
      var w = Math.sqrt(Math.max(0, R * R - dy * dy));
      if (w <= 0) continue;
      ctx.fillRect(Math.round(x - w), Math.round(y + dy), Math.round(w * 2), 1);
    }
  }
  DR.pixCircle = circle;

  // Draw a car with its rear tire contact at (gx, gy) in screen space.
  // pitch: nose-up radians. wheelAng: wheel rotation radians.
  DR.drawCar = function (ctx, spr, gx, gy, pitch, wheelAng, opts) {
    opts = opts || {};
    var rx = spr.wheelR.x, ground = spr.groundY;
    ctx.save();
    ctx.translate(Math.round(gx), Math.round(gy));
    ctx.rotate(-pitch);
    // wheelie bars: bolted to the chassis, the tail wheel touches down when
    // pitch reaches the tuned bar angle.
    if (spr.bar) {
      var bl = 24, endH = Math.max(1.5, Math.sin(opts.barRad || 0.05) * bl);
      var ay = -spr.wheelR.r * 0.7;
      ctx.fillStyle = '#9aa0a8';
      for (var i = 2; i <= bl; i++) ctx.fillRect(-i, Math.round(ay + (-endH - ay) * (i / bl)), 1, 1);
      ctx.fillStyle = '#222'; ctx.fillRect(-bl - 1, Math.round(-endH) - 1, 3, 3);
    }
    var bodyLift = opts.squat ? opts.squat : 0;
    ctx.drawImage(spr.canvas, Math.round(-rx), Math.round(-ground - 1 + bodyLift));
    var look = spr.look;
    drawWheel(ctx, 0, -spr.wheelR.r, spr.wheelR.r, wheelAng, look.rim, look.slick);
    drawWheel(ctx, spr.wheelF.x - rx, -spr.wheelF.r, spr.wheelF.r, wheelAng * spr.wheelR.r / spr.wheelF.r, look.rim, false);
    ctx.restore();
  };

  // Where the exhaust tip is in screen space for particles.
  DR.exhaustPos = function (spr, gx, gy, pitch) {
    var ex = spr.exhaust.x - spr.wheelR.x, ey = spr.exhaust.y - spr.groundY;
    var c = Math.cos(-pitch), s = Math.sin(-pitch);
    return { x: gx + ex * c - ey * s, y: gy + ex * s + ey * c };
  };

  // ------------------------------------------------------------ particles
  DR.Particles = function () { this.list = []; };
  DR.Particles.prototype.add = function (p) { if (this.list.length < 400) this.list.push(p); };
  DR.Particles.prototype.smoke = function (wx, wy, vx, amount) {
    for (var i = 0; i < amount; i++)
      this.add({ t: 'smoke', x: wx + (Math.random() - 0.5) * 0.4, y: wy - Math.random() * 0.3, vx: vx * 0.15 - Math.random() * 1.5, vy: 0.4 + Math.random() * 0.9, life: 1.6 + Math.random(), age: 0, size: 2 + Math.random() * 2 });
  };
  DR.Particles.prototype.flame = function (wx, wy, purple) {
    for (var i = 0; i < 4; i++)
      this.add({ t: purple ? 'nos' : 'flame', x: wx, y: wy, vx: -3 - Math.random() * 6, vy: (Math.random() - 0.3) * 1.5, life: 0.12 + Math.random() * 0.12, age: 0, size: 1 + Math.random() * 2 });
  };
  DR.Particles.prototype.update = function (dt) {
    var L = this.list;
    for (var i = L.length - 1; i >= 0; i--) {
      var p = L[i]; p.age += dt;
      if (p.age > p.life) { L.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.t === 'smoke') { p.vx *= 1 - dt * 0.8; p.size += dt * 5; }
    }
  };
  DR.Particles.prototype.draw = function (ctx, camX, laneY) {
    var L = this.list;
    for (var i = 0; i < L.length; i++) {
      var p = L[i], sx = (p.x - camX) * PPM, sy = p.lane != null ? laneY[p.lane] - p.y * PPM : p.sy - p.y * PPM;
      var k = p.age / p.life;
      if (p.t === 'smoke') {
        var g = Math.round(225 - k * 40);
        ctx.globalAlpha = Math.max(0, 0.75 * (1 - k));
        ctx.fillStyle = 'rgb(' + g + ',' + g + ',' + (g + 5) + ')';
        circle(ctx, sx, sy, p.size);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = p.t === 'nos' ? (k < 0.5 ? '#e6c8ff' : '#9b4dff') : (k < 0.4 ? '#fff3a0' : k < 0.7 ? '#ffae2a' : '#ff4a1a');
        ctx.fillRect(Math.round(sx), Math.round(sy), Math.ceil(p.size), Math.ceil(p.size));
      }
    }
  };

  // ------------------------------------------------------------ scene
  var LANE_Y = [196, 168];              // ground y for near (player) and far lane
  DR.LANE_Y = LANE_Y;

  var THEMES = {
    strip: { sky: ['#5ec6ff', '#86d6ff', '#b5e6ff', '#dff4ff'], far: '#7d97b8', far2: '#5f7a9e', ground: '#5c8c3a', asphalt: '#3a3a40', asphalt2: '#34343a', line: '#e8e8e8', wall: '#c9c9c9', night: false },
    street: { sky: ['#0b0b24', '#151538', '#22224d', '#33335e'], far: '#1c1c3a', far2: '#26264a', ground: '#1e2a1e', asphalt: '#2b2b30', asphalt2: '#26262b', line: '#d8c050', wall: '#555', night: true }
  };

  function Scene(theme, dist) {
    this.theme = THEMES[theme] || THEMES.strip;
    this.themeId = theme;
    this.dist = dist;
    var r = rng(theme === 'street' ? 77 : 1234);
    // skyline buildings
    this.city = [];
    var x = 0;
    while (x < 2000) { var w = 14 + Math.floor(r() * 26), h = 18 + Math.floor(r() * 50); this.city.push({ x: x, w: w, h: h, win: r() }); x += w + Math.floor(r() * 6); }
    this.hills = [];
    for (var i = 0; i < 80; i++) this.hills.push(10 + r() * 14);
    this.crowd = [];
    for (i = 0; i < 600; i++) this.crowd.push(r());
    this.stars = [];
    for (i = 0; i < 60; i++) this.stars.push([r() * 400, r() * 80]);
  }
  DR.Scene = Scene;

  Scene.prototype.drawBackground = function (ctx, camX, time) {
    var T = this.theme, W = DR.VIEW_W, H = DR.VIEW_H, i;
    // sky bands
    var bands = [0, 40, 70, 95, 115];
    for (i = 0; i < 4; i++) { ctx.fillStyle = T.sky[i]; ctx.fillRect(0, bands[i], W, bands[i + 1] - bands[i]); }
    if (T.night) {
      ctx.fillStyle = '#fff';
      this.stars.forEach(function (s) { ctx.fillRect(s[0], s[1], 1, 1); });
      ctx.fillStyle = '#f4f0d0'; DR.pixCircle(ctx, 330, 26, 9); ctx.fillStyle = T.sky[0]; DR.pixCircle(ctx, 335, 23, 8);
    } else {
      ctx.fillStyle = '#fff8c8'; DR.pixCircle(ctx, 330, 26, 9);
      // clouds
      ctx.fillStyle = '#ffffff';
      for (i = 0; i < 5; i++) {
        var cx = ((i * 97 - camX * PPM * 0.03 - time * 2) % 480 + 480) % 480 - 40, cy = 20 + (i * 13) % 40;
        ctx.fillRect(cx, cy, 26, 4); ctx.fillRect(cx + 5, cy - 3, 14, 3);
      }
    }
    // distant skyline (parallax)
    var off = camX * PPM * 0.12;
    for (i = 0; i < this.city.length; i++) {
      var b = this.city[i], bx = b.x - (off % 1200) - 200;
      if (bx > W || bx + b.w < -1200) continue;
      for (var rep = 0; rep < 2; rep++) {
        var X = bx + rep * 1200;
        if (X > W || X + b.w < 0) continue;
        ctx.fillStyle = i % 2 ? T.far : T.far2;
        ctx.fillRect(X, 115 - b.h, b.w, b.h);
        if (T.night || b.win > 0.6) {
          ctx.fillStyle = T.night ? '#ffd86a' : '#a9c1de';
          for (var wy = 115 - b.h + 3; wy < 112; wy += 5) for (var wx = X + 2; wx < X + b.w - 2; wx += 4)
            if (((wx * 7 + wy * 13 + i) % 5) < 2) ctx.fillRect(wx, wy, 1, 2);
        }
      }
    }
    // hills / trees
    var off2 = camX * PPM * 0.35;
    ctx.fillStyle = T.night ? '#14241a' : '#4f7d36';
    for (i = -1; i < 30; i++) {
      var hx = i * 16 - (off2 % 16), hi = this.hills[(i + Math.floor(off2 / 16) + 800) % this.hills.length];
      ctx.fillRect(hx, 118 - hi * 0.6, 17, hi * 0.6 + 4);
    }
  };

  Scene.prototype.drawTrack = function (ctx, camX, time) {
    var T = this.theme, W = DR.VIEW_W, i;
    var o = camX * PPM;
    if (this.themeId === 'strip') {
      // grandstands with crowd (parallax 0.85)
      var so = camX * PPM * 0.85;
      ctx.fillStyle = '#8a8f99'; ctx.fillRect(0, 120, W, 30);
      ctx.fillStyle = '#6e737d';
      for (var y = 122; y < 150; y += 4) ctx.fillRect(0, y, W, 1);
      for (i = 0; i < 400; i++) {
        var px = ((i * 3 - so) % 1200 + 1200) % 1200;
        if (px > W) continue;
        var c = this.crowd[i];
        ctx.fillStyle = c < 0.25 ? '#d23a3a' : c < 0.5 ? '#3a7bd2' : c < 0.7 ? '#f0e0c0' : c < 0.85 ? '#2e7d4f' : '#efe14b';
        var row = i % 7;
        ctx.fillRect(px, 123 + row * 4 + ((Math.floor(time * 3 + i) % 9 === 0) ? -1 : 0), 2, 2);
      }
      // wall with banners
      ctx.fillStyle = T.wall; ctx.fillRect(0, 150, W, 10);
      for (i = -1; i < 6; i++) {
        var bx = i * 90 - (o % 90);
        ctx.fillStyle = ['#d23a3a', '#1c3f9a', '#f0a020'][((i + Math.floor(o / 90)) % 3 + 3) % 3];
        ctx.fillRect(bx + 4, 151, 60, 8);
        DR.pixText(ctx, ['NITRO', 'BOOST', 'SLICKS'][((i + Math.floor(o / 90)) % 3 + 3) % 3], bx + 10, 153, '#fff');
      }
    } else {
      // street: buildings front row & street lights
      ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 118, W, 42);
      for (i = -1; i < 8; i++) {
        var hx = i * 64 - (o * 0.9 % 64);
        ctx.fillStyle = i % 2 ? '#24243e' : '#2c2c48'; ctx.fillRect(hx, 112, 60, 48);
        ctx.fillStyle = '#ffcf5a';
        for (var ww = 0; ww < 4; ww++) if (((i + Math.floor(o * 0.9 / 64)) * 3 + ww) % 3) ctx.fillRect(hx + 6 + ww * 13, 122, 6, 7);
        ctx.fillStyle = '#e04080'; ctx.fillRect(hx + 10, 140, 34, 5);
      }
      ctx.fillStyle = '#3a3a3a'; ctx.fillRect(0, 156, W, 4);
    }
    // track surfaces
    ctx.fillStyle = T.asphalt; ctx.fillRect(0, 160, W, 42);
    ctx.fillStyle = T.asphalt2;
    for (i = -1; i < W / 8 + 2; i++) { var gx = i * 8 - (o % 8); ctx.fillRect(gx, 172 + (i % 3), 3, 1); ctx.fillRect(gx + 4, 188 + (i % 2) * 4, 2, 1); }
    // rubbered launch area
    var startX = -o;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    if (startX + 900 > 0 && startX < W) ctx.fillRect(startX, 161, 60 * PPM, 40);
    // lane divider
    ctx.fillStyle = T.line;
    if (this.themeId === 'strip') ctx.fillRect(0, 179, W, 1);
    else for (i = -1; i < W / 16 + 2; i++) ctx.fillRect(i * 16 - (o % 16), 179, 8, 1);
    // start line & burnout box
    if (startX > -20 && startX < W + 400) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(startX), 161, 2, 40);
      ctx.fillStyle = 'rgba(80,110,140,0.35)'; ctx.fillRect(Math.round(startX - 22 * PPM), 161, 12 * PPM, 40);
    }
    // distance markers
    var marks = [[60 * DR.FT, '60'], [330 * DR.FT, '330'], [DR.EIGHTH, '1/8'], [1000 * DR.FT, '1000'], [DR.QUARTER, '1/4']];
    for (i = 0; i < marks.length; i++) {
      if (marks[i][0] > this.dist + 1) continue;
      var mx = Math.round((marks[i][0] - camX) * PPM);
      if (mx < -30 || mx > W + 30) continue;
      ctx.fillStyle = '#222'; ctx.fillRect(mx, 140, 1, 20);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(mx - 9, 132, 19, 9);
      DR.pixText(ctx, marks[i][1], mx - Math.floor(DR.pixTextW(marks[i][1]) / 2), 134, '#111');
    }
    // finish line
    var fx = Math.round((this.dist - camX) * PPM);
    if (fx > -20 && fx < W + 20) {
      for (var cy = 161; cy < 201; cy += 2) for (var cx = 0; cx < 4; cx += 2) {
        ctx.fillStyle = ((cy + cx) / 2) % 2 ? '#111' : '#fff'; ctx.fillRect(fx + cx, cy, 2, 2);
      }
      ctx.fillStyle = '#222'; ctx.fillRect(fx - 1, 100, 2, 60); ctx.fillRect(fx + 30, 100, 2, 60);
      ctx.fillStyle = '#d23a3a'; ctx.fillRect(fx - 2, 98, 36, 10);
      DR.pixText(ctx, 'FINISH', fx + 4, 100, '#fff');
    }
  };

  Scene.prototype.drawForeground = function (ctx, camX) {
    var T = this.theme, W = DR.VIEW_W, i, o = camX * PPM;
    ctx.fillStyle = '#9a9a9a'; ctx.fillRect(0, 201, W, 6);
    ctx.fillStyle = '#7d7d7d';
    for (i = -1; i < W / 20 + 2; i++) ctx.fillRect(i * 20 - (o % 20), 201, 1, 6);
    ctx.fillStyle = T.ground; ctx.fillRect(0, 207, W, 18);
    ctx.fillStyle = T.night ? '#16201a' : '#4c7a30';
    for (i = -1; i < W / 6 + 2; i++) ctx.fillRect(i * 6 - (o * 1.15 % 6), 209 + (i % 3) * 4, 2, 1);
    if (T.night) {
      for (i = -1; i < 4; i++) {
        var lx = i * 140 - (o % 140);
        ctx.fillStyle = '#444'; ctx.fillRect(lx, 120, 2, 87);
        ctx.fillStyle = '#ffeaa0'; ctx.fillRect(lx - 3, 118, 8, 3);
        ctx.fillStyle = 'rgba(255,234,160,0.08)'; ctx.fillRect(lx - 14, 121, 30, 86);
      }
    }
  };

  // The Christmas tree. state: {preStage, stage, amber:0-3, green, red:[bool,bool]}
  Scene.prototype.drawTree = function (ctx, camX, st) {
    var x = Math.round((0.6 - camX) * PPM);
    if (x < -20 || x > DR.VIEW_W + 20) return;
    var top = 92;
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x + 4, top + 48, 3, 22);
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x, top, 11, 50);
    function bulb(bx, by, on, col) { ctx.fillStyle = on ? col : '#3b3b3b'; ctx.fillRect(bx, by, 4, 3); }
    for (var lane = 0; lane < 2; lane++) {
      var bx = lane === 0 ? x + 6 : x + 1;
      bulb(bx, top + 2, st.stage, '#fffbe0');
      bulb(bx, top + 6, st.stage, '#fffbe0');
      for (var a = 0; a < 3; a++) bulb(bx, top + 12 + a * 6, st.amber > a, '#ffb000');
      bulb(bx, top + 32, st.green && !st.red[lane], '#22ff4a');
      bulb(bx, top + 38, st.red[lane], '#ff2222');
    }
  };

  // ------------------------------------------------------------ garage backdrop
  DR.drawGarage = function (ctx, w, h) {
    ctx.fillStyle = '#23252b'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2b2e35';
    for (var x = 0; x < w; x += 24) ctx.fillRect(x, 0, 12, h * 0.68);
    ctx.fillStyle = '#3a3d45'; ctx.fillRect(0, Math.round(h * 0.68), w, 2);
    ctx.fillStyle = '#4a4d55'; ctx.fillRect(0, Math.round(h * 0.68) + 2, w, h);
    ctx.fillStyle = '#545760';
    for (var i = 0; i < w; i += 18) ctx.fillRect(i, Math.round(h * 0.68) + 6, 9, 1);
    ctx.fillStyle = '#ffde59'; ctx.fillRect(0, Math.round(h * 0.68) - 6, w, 1);
    ctx.fillStyle = 'rgba(255,240,200,0.07)';
    ctx.fillRect(w * 0.25, 0, w * 0.5, h * 0.68);
    ctx.fillStyle = '#ffeebb'; ctx.fillRect(w * 0.4, 0, w * 0.2, 2);
  };

  // Render a static preview of a car into a canvas element (garage/dealer).
  DR.drawPreview = function (canvas, inst, opts) {
    opts = opts || {};
    var spr = DR.carSprite(DR.carLook(inst));
    if (opts.fit !== false && !opts.groundY) {
      // size the canvas around the car so every preview fills its frame
      var fw = Math.max(80, Math.round(spr.lenPx * 1.5 + 24));
      canvas.width = fw; canvas.height = Math.round(fw * (opts.aspect || 0.45));
    }
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    var w = canvas.width, h = canvas.height;
    if (opts.bg !== false) DR.drawGarage(ctx, w, h); else ctx.clearRect(0, 0, w, h);
    var gy = opts.groundY || Math.round(h * 0.68) + 4;
    var gx = Math.round(w / 2 - spr.lenPx / 2 + (spr.wheelR.x - spr.padL));
    // floor shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(gx - spr.wheelR.x + spr.padL, gy - 1, spr.lenPx, 2);
    DR.drawCar(ctx, spr, gx, gy, 0, opts.wheelAng || 0.3);
  };
})();
