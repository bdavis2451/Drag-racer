// ===========================================================================
// RENDER — pixel-art sprites & scene. Everything is drawn onto a small
// low-resolution canvas which CSS scales up with crisp (pixelated) edges.
// ===========================================================================
(function () {
  var DR = globalThis.DR;
  var PPM = 44;                 // pixels per metre
  DR.PPM = PPM;
  // Cars are drawn at SPR_RES x pixel density. A canvas that shows cars keeps
  // its logical size for layout and a backing store SPR_RES x larger.
  DR.SPR_RES = 2;
  DR.hiCanvas = function (c, w, h) {
    var R = DR.SPR_RES; w = w || c._lw || c.width; h = h || c._lh || c.height;
    c._lw = w; c._lh = h;
    if (c.width !== w * R) c.width = w * R;
    if (c.height !== h * R) c.height = h * R;
    var x = c.getContext('2d'); x.setTransform(R, 0, 0, R, 0, 0); x.imageSmoothingEnabled = false;
    return x;
  };
  DR.VIEW_W = 800; DR.VIEW_H = 450;

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

  // shared with cars.js
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  DR.BAYER = BAYER;
  DR.hexToRgb = hexToRgb;
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

  // ------------------------------------------------------------ particles
  // Tire smoke is volumetric: puffs are splatted into a half-resolution
  // density field per lane, then shaded from that field (thick smoke is
  // lit on top and shadowed underneath) and posterised into a few pixel
  // tones with dithered edges.
  DR.Particles = function () { this.list = []; };
  DR.Particles.prototype.add = function (p) { if (this.list.length < 700) this.list.push(p); };
  // wx, wy: world position (m). vx: ground speed of the car. o: {lane, slip
  // (tire surface speed over ground, m/s), dense, engine}
  DR.Particles.prototype.smoke = function (wx, wy, vx, amount, o) {
    o = o || {};
    var slip = o.slip || 0, still = Math.abs(vx) < 1;
    for (var i = 0; i < amount; i++) {
      var r = Math.random();
      this.add({ t: 'smoke', lane: o.lane, x: wx + (Math.random() - 0.5) * 0.5, y: wy + Math.random() * 0.15,
        // the tire throws smoke back; parked in the box it boils out all round
        vx: still ? (Math.random() * 4.2 - 2.8) : vx * 0.35 - slip * 0.08 - Math.random() * 1.5,
        vy: 0.15 + Math.random() * (still ? 0.9 : 0.6), ph: Math.random() * 6.3,
        life: (o.engine ? 1.8 : 2.4) + Math.random() * 1.8, age: 0, size: (5 + r * 6) * PPM / 32, grow: (9 + Math.random() * 10) * PPM / 32,
        dense: (o.dense || 0.75) * (0.7 + Math.random() * 0.5), dark: o.engine ? 1 : 0 });
    }
  };
  DR.Particles.prototype.flame = function (wx, wy, purple) {
    for (var i = 0; i < 4; i++)
      this.add({ t: purple ? 'nos' : 'flame', x: wx, y: wy, vx: -3 - Math.random() * 6, vy: (Math.random() - 0.3) * 1.5, life: 0.12 + Math.random() * 0.12, age: 0, size: 2 + Math.random() * 4 });
  };
  DR.Particles.prototype.update = function (dt) {
    var L = this.list;
    for (var i = L.length - 1; i >= 0; i--) {
      var p = L[i]; p.age += dt;
      if (p.age > p.life) { L.splice(i, 1); continue; }
      if (p.t === 'smoke') {
        p.vx *= Math.exp(-dt * 0.9);
        p.vy += (0.55 - p.vy) * dt * 0.5;                         // warm smoke drifts up
        var turb = Math.sin(p.ph + p.age * 1.9) * 0.45;
        p.x += (p.vx + turb) * dt; p.y += p.vy * dt;
        if (p.y < 0.05) { p.y = 0.05; p.vy = Math.abs(p.vy) * 0.3; }
        p.size += p.grow * dt * (1 - 0.45 * p.age / p.life);
      } else { p.x += p.vx * dt; p.y += p.vy * dt; }
    }
  };
  function pScreen(p, camX, laneY) { return [(p.x - camX) * PPM, p.lane != null ? laneY[p.lane] - p.y * PPM : p.sy - p.y * PPM]; }

  var SM = { w: 0, h: 0, d: null, cv: null, ctx: null, img: null };
  function smokeBuf() {
    var w = DR.VIEW_W >> 1, h = DR.VIEW_H >> 1;
    if (SM.w !== w) {
      SM.w = w; SM.h = h;
      SM.cv = document.createElement('canvas'); SM.cv.width = w; SM.cv.height = h;
      SM.ctx = SM.cv.getContext('2d'); SM.img = SM.ctx.createImageData(w, h);
    }
    return SM;
  }
  var SMOKE_T = [[118, 118, 132], [160, 160, 174], [200, 200, 212], [228, 228, 236], [248, 248, 252]];
  var ENG_T = [[30, 30, 34], [50, 50, 56], [72, 72, 80], [96, 96, 104], [122, 122, 130]];
  // Each puff is a lit sphere: bright crown toward the sun, shaded belly,
  // a darker rim where it overlaps the puffs behind it. Older puffs are
  // drawn first so fresh smoke rolls over them.
  function drawSmoke(ctx, list, camX, laneY) {
    if (!list.length) return;
    var B = smokeBuf(), W = B.w, H = B.h, px = B.img.data, x0 = W, x1 = 0, y0 = H, y1 = 0, i, x, y;
    list.sort(function (a, b) { return b.age / b.life - a.age / a.life; });
    var T = SMOKE_T;
    for (i = 0; i < list.length; i++) {
      var p = list[i], q = pScreen(p, camX, laneY), cx = q[0] / 2, cy = q[1] / 2, r = p.size / 2;
      var k = p.age / p.life, a = p.dense * (k < 0.06 ? 0.5 + k / 0.12 : 1) * Math.pow(1 - k, 0.8);
      if (a < 0.05) continue;
      var tones = p.dark ? ENG_T : SMOKE_T;
      var bx0 = Math.max(0, Math.floor(cx - r)), bx1 = Math.min(W - 1, Math.ceil(cx + r)), by0 = Math.max(0, Math.floor(cy - r)), by1 = Math.min(H - 1, Math.ceil(cy + r));
      if (bx0 > bx1 || by0 > by1) continue;
      if (bx0 < x0) x0 = bx0; if (bx1 > x1) x1 = bx1; if (by0 < y0) y0 = by0; if (by1 > y1) y1 = by1;
      var al = a > 0.75 ? 1 : a > 0.5 ? 0.82 : a > 0.3 ? 0.62 : 0.42, ir = 1 / r, fade = k > 0.7;
      for (y = by0; y <= by1; y++) {
        var dy = (y + 0.5 - cy) * ir;
        for (x = bx0; x <= bx1; x++) {
          var dx = (x + 0.5 - cx) * ir, dd = dx * dx + dy * dy;
          if (dd >= 1) continue;
          var th = BAYER[(y & 3) * 4 + (x & 3)] / 16;
          if (dd > 0.72 && (dd - 0.72) / 0.28 > th) continue;      // dithered soft edge
          if (fade && th < (k - 0.7) * 1.2) continue;                // thinning out as it dies
          var sh = -dy * 0.78 + dx * 0.3 + (1 - dd) * 0.25;           // sphere lit from the upper right
          var tone = sh > 0.62 ? 4 : sh > 0.3 ? 3 : sh > -0.05 ? 2 : sh > -0.45 ? 1 : 0;
          if (dd > 0.62) tone = Math.max(0, tone - 1);                 // rim
          var c = tones[tone], j = (y * W + x) * 4;
          px[j] = c[0]; px[j + 1] = c[1]; px[j + 2] = c[2]; px[j + 3] = Math.max(px[j + 3], al * 255);
        }
      }
    }
    if (x0 > x1) return;
    B.ctx.putImageData(B.img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    var smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(B.cv, x0, y0, x1 - x0 + 1, y1 - y0 + 1, x0 * 2, y0 * 2, (x1 - x0 + 1) * 2, (y1 - y0 + 1) * 2);
    ctx.imageSmoothingEnabled = smooth;
    for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) px[(y * W + x) * 4 + 3] = 0;
  }
  // lane: draw only that lane's particles (so the far lane's smoke sits
  // behind the near car); omit for all
  DR.Particles.prototype.draw = function (ctx, camX, laneY, lane) {
    var L = this.list, sm = [];
    for (var i = 0; i < L.length; i++) {
      var p = L[i];
      if (lane != null && p.lane !== lane) continue;
      if (p.t === 'smoke') { sm.push(p); continue; }
      var q = pScreen(p, camX, laneY), k = p.age / p.life;
      ctx.fillStyle = p.t === 'nos' ? (k < 0.5 ? '#f0dcff' : '#9b4dff') : (k < 0.4 ? '#fff6b8' : k < 0.7 ? '#ffae2a' : '#ff4a1a');
      ctx.fillRect(Math.round(q[0]), Math.round(q[1]), Math.ceil(p.size), Math.ceil(p.size * 0.7));
    }
    drawSmoke(ctx, sm, camX, laneY);
  };
  // additive glow for flames (lighting pass)
  DR.Particles.prototype.glows = function (camX, laneY, out) {
    for (var i = 0; i < this.list.length; i++) {
      var p = this.list[i];
      if (p.t === 'smoke') continue;
      var q = pScreen(p, camX, laneY);
      out.push({ x: q[0], y: q[1], r: 10 + p.size * 2, c: p.t === 'nos' ? [150, 90, 255] : [255, 140, 40], a: 0.5 * (1 - p.age / p.life) });
    }
  };

  // ------------------------------------------------------------ scene
  var LANE_Y = [396, 334];              // ground y for near (player) and far lane
  DR.LANE_Y = LANE_Y;
  var HZ = 232;                         // horizon

  var THEMES = {
    strip: { night: false, ground: [92, 140, 58], asphalt: [62, 62, 68], line: '#ececec' },
    street: { night: true, ground: [30, 40, 30], asphalt: [44, 44, 50], line: '#d8c050' },
    stripnight: { night: true, ground: [26, 44, 28], asphalt: [50, 50, 58], line: '#e4e4e4' }
  };

  function mk(w, h, fn) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d'); x.imageSmoothingEnabled = false; fn(x, w, h); return c;
  }
  function rgb(c, a) { return a == null ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')' : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')'; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  // vertical gradient, ordered-dithered into flat pixel bands
  function ditherV(ctx, x0, y0, w, h, stops) {
    for (var y = 0; y < h; y++) {
      var t = y / Math.max(1, h - 1), i = 0;
      while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
      var a = stops[i], b = stops[i + 1], f = (t - a[0]) / (b[0] - a[0]);
      var steps = 10, q = f * steps, lo = Math.floor(q), fr = q - lo;
      for (var x = 0; x < w; x += 4) for (var k = 0; k < 4 && x + k < w; k++) {
        var th = BAYER[(y & 3) * 4 + ((x + k) & 3)] / 16;
        ctx.fillStyle = rgb(mix(a[1], b[1], Math.min(1, (lo + (fr > th ? 1 : 0)) / steps)));
        ctx.fillRect(x0 + x + k, y0 + y, 1, 1);
      }
    }
  }
  function blob(ctx, x, y, r, base, hi, lo, sx) {
    // a pixel sphere-ish clump lit from the upper right
    for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
      var dd = dx * dx + dy * dy;
      if (dd > r * r) continue;
      var l = (dx * (sx || 0.5) - dy) / r;
      var th = BAYER[((y + dy) & 3) * 4 + ((x + dx) & 3)] / 16 - 0.5;
      ctx.fillStyle = rgb(l + th * 0.5 > 0.55 ? hi : l + th * 0.5 < -0.25 ? lo : base);
      ctx.fillRect(x + dx, y + dy, 1, 1);
    }
  }

  function Scene(theme, dist) {
    this.theme = THEMES[theme] || THEMES.strip;
    this.themeId = theme === 'street' ? 'street' : 'strip';
    this.dist = dist;
    this.glow = [];
    var r = rng(theme === 'street' ? 77 : 1234), night = this.theme.night, self = this;
    var W = DR.VIEW_W;

    // ---- sky (screen-fixed)
    this.sky = mk(W, HZ + 8, function (c, w, h) {
      if (!night) {
        ditherV(c, 0, 0, w, h, [[0, [62, 128, 206]], [0.55, [128, 182, 232]], [0.85, [226, 216, 200]], [1, [250, 206, 156]]]);
        // low sun with a halo
        for (var k = 7; k >= 0; k--) {
          c.fillStyle = rgb(mix([255, 250, 225], [250, 220, 170], k / 7), k ? 0.11 : 1);
          circle(c, 640, 96, 12 + k * (k < 2 ? 3 : 9));
        }
      } else {
        ditherV(c, 0, 0, w, h, [[0, [6, 8, 24]], [0.6, [18, 18, 46]], [0.9, [52, 34, 74]], [1, [88, 52, 84]]]);
        for (var i = 0; i < 140; i++) { c.fillStyle = r() < 0.2 ? '#ffffff' : '#9aa0c8'; c.fillRect(r() * w | 0, r() * h * 0.7 | 0, 1, 1); }
        for (k = 5; k >= 0; k--) { c.fillStyle = rgb([200, 210, 255], k ? 0.06 : 1); circle(c, 640, 70, 13 + k * 6); }
        c.fillStyle = '#c9cfe8'; c.fillRect(634, 64, 4, 3); c.fillRect(642, 74, 3, 3);
      }
    });
    // ---- clouds (slow parallax)
    this.clouds = mk(1600, 150, function (c) {
      if (night) return;
      for (var i = 0; i < 9; i++) {
        var cx = 80 + i * 175 + r() * 60, cy = 30 + r() * 80, n = 5 + (r() * 5 | 0);
        for (var j = 0; j < n; j++) {
          var rr = 7 + r() * 13;
          blob(c, cx + (j - n / 2) * 11 + (r() * 8 | 0), cy - rr * 0.4 + (r() * 6 | 0), rr | 0, [236, 236, 244], [255, 252, 240], [196, 192, 214], 0.8);
        }
        c.fillStyle = 'rgba(190,186,210,0.9)'; c.fillRect(cx - n * 6, cy + 4, n * 12, 3);
      }
    });
    // ---- far range: mountains (day) / skyline (night)
    this.far = mk(1600, 90, function (c, w, h) {
      var x, y, i;
      if (!night) {
        var hgt = 40 + r() * 20, v = 0;
        for (x = 0; x < w; x++) {
          v += (r() - 0.5) * 1.6; v *= 0.985; hgt = 44 + Math.sin(x / 140) * 18 + Math.sin(x / 47) * 6 + v * 3;
          for (y = h - hgt | 0; y < h; y++) {
            var t = (y - (h - hgt)) / hgt, ridge = y < h - hgt + 3 && Math.sin(x / 47) > 0;
            c.fillStyle = rgb(ridge ? [176, 194, 222] : mix([146, 166, 200], [168, 184, 210], t + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.2));
            c.fillRect(x, y, 1, 1);
          }
        }
      } else {
        x = 0;
        while (x < w) {
          var bw = 26 + (r() * 50 | 0), bh = 30 + (r() * 58 | 0);
          c.fillStyle = rgb(mix([22, 22, 48], [32, 30, 62], r())); c.fillRect(x, h - bh, bw, bh);
          if (r() < 0.3) { c.fillRect(x + bw / 2 - 1, h - bh - 8, 2, 8); c.fillStyle = '#ff3040'; c.fillRect(x + bw / 2 - 1, h - bh - 9, 2, 2); }
          for (y = h - bh + 4; y < h - 2; y += 6) for (i = x + 3; i < x + bw - 3; i += 5)
            if (r() < 0.45) { c.fillStyle = r() < 0.75 ? '#ffd27a' : '#a8d8ff'; c.fillRect(i, y, 2, 3); }
          x += bw + (r() * 4 | 0);
        }
      }
    });
    // ---- tree line
    this.trees = mk(1200, 70, function (c, w, h) {
      var base = night ? [16, 30, 22] : [58, 102, 44], hi = night ? [26, 44, 32] : [104, 150, 66], lo = night ? [8, 18, 14] : [34, 66, 32];
      c.fillStyle = rgb(lo); c.fillRect(0, h - 14, w, 14);
      for (var x = 0; x < w; x += 9 + (r() * 10 | 0)) {
        var th = 18 + r() * 30, rr = 8 + r() * 9;
        if (r() < 0.25) { // poplar
          for (var k = 0; k < 4; k++) blob(c, x | 0, (h - th + k * 8) | 0, (rr * 0.6) | 0, base, hi, lo, 0.6);
        } else {
          blob(c, x | 0, (h - th) | 0, rr | 0, base, hi, lo, 0.6);
          blob(c, (x + rr * 0.7) | 0, (h - th + rr * 0.6) | 0, (rr * 0.8) | 0, base, hi, lo, 0.6);
          blob(c, (x - rr * 0.6) | 0, (h - th + rr * 0.7) | 0, (rr * 0.75) | 0, base, hi, lo, 0.6);
        }
        c.fillStyle = rgb(lo); c.fillRect(x | 0, h - 10, 2, 10);
      }
    });

    if (this.themeId === 'strip') {
      // ---- grandstand: roof, shaded upper rows, crowd, rail (y 226..300)
      this.stand = mk(1200, 76, function (c, w, h) {
        c.fillStyle = '#585e68'; c.fillRect(0, 0, w, 8);
        c.fillStyle = '#9aa2ae'; c.fillRect(0, 0, w, 2);
        c.fillStyle = '#2b2f36'; c.fillRect(0, 8, w, 3);
        for (var x = 0; x < w; x += 100) { c.fillStyle = '#3c414a'; c.fillRect(x + 2, 8, 3, h - 8); c.fillStyle = '#6e7580'; c.fillRect(x + 2, 8, 1, h - 8); }
        for (var row = 0; row < 9; row++) {
          var y = 12 + row * 7, shadow = row < 3 ? 0.55 : row < 4 ? 0.8 : 1;
          c.fillStyle = rgb(mix([92, 96, 104], [168, 172, 180], shadow)); c.fillRect(0, y + 5, w, 2);
          c.fillStyle = rgb(mix([60, 62, 70], [120, 124, 132], shadow)); c.fillRect(0, y, w, 5);
          for (var px = (row % 2) * 2; px < w; px += 4) {
            if (r() < 0.28) continue;
            var shirt = mix([[200, 64, 60], [60, 100, 180], [220, 206, 180], [60, 112, 80], [214, 196, 90], [44, 44, 50], [214, 214, 214], [220, 120, 50]][r() * 8 | 0], [104, 108, 118], 0.45);
            var skin = mix([[234, 196, 160], [190, 140, 104], [124, 86, 62], [220, 176, 140]][r() * 4 | 0], [104, 108, 118], 0.3);
            c.fillStyle = rgb(mix([20, 20, 30], shirt, shadow)); c.fillRect(px, y + 2, 3, 4);
            c.fillStyle = rgb(mix([20, 20, 30], skin, shadow)); c.fillRect(px + 1, y, 2, 2);
            if (r() < 0.2) { c.fillStyle = rgb(mix([20, 20, 30], [40, 40, 40], shadow)); c.fillRect(px + 1, y - 1, 2, 1); }
          }
        }
        c.fillStyle = '#c8ccd2'; c.fillRect(0, h - 3, w, 1);
        for (x = 0; x < w; x += 8) c.fillRect(x, h - 3, 1, 3);
      });
      // ---- wall with sponsor banners & catch fence (y 288..320)
      this.wall = mk(960, 34, function (c, w, h) {
        // fence mesh
        c.fillStyle = 'rgba(40,44,52,0.35)';
        for (var x = 0; x < w; x += 3) c.fillRect(x, 0, 1, 14);
        for (var y = 0; y < 14; y += 3) c.fillRect(0, y, w, 1);
        c.fillStyle = '#5a5f68'; for (x = 0; x < w; x += 60) c.fillRect(x, 0, 2, 14);
        c.fillStyle = '#d9dade'; c.fillRect(0, 14, w, 20);
        c.fillStyle = '#ffffff'; c.fillRect(0, 14, w, 2);
        c.fillStyle = '#a8aab0'; c.fillRect(0, 32, w, 2);
        var ads = [['NITRO', '#d23a3a', '#fff'], ['BOOST', '#1c3f9a', '#fff'], ['SLICKS', '#f0a020', '#111'], ['PIXEL DRAG', '#151515', '#ffd700'], ['TORQUE', '#2e7d4f', '#fff'], ['RACE GAS', '#ffffff', '#d23a3a']];
        for (var i = 0; i < 6; i++) {
          var bx = i * 160 + 10, ad = ads[i];
          c.fillStyle = ad[1]; c.fillRect(bx, 17, 140, 13);
          c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(bx, 17, 140, 2);
          DR.pixText(c, ad[0], bx + 70 - DR.pixTextW(ad[0], 2) / 2, 19, ad[2], 2);
        }
        for (x = 0; x < w; x += 80) { c.fillStyle = '#b4b6bc'; c.fillRect(x, 16, 1, 16); }
      });
    } else {
      // ---- street: storefront row, with a separate emissive layer
      var lamps = [];
      this.stand = mk(1280, 96, function (c, w, h) {
        var x = 0, i = 0;
        while (x < w) {
          var bw = 90 + (r() * 70 | 0), bh = 70 + (r() * 26 | 0), col = [[52, 48, 72], [60, 50, 62], [44, 50, 66], [70, 56, 52]][i % 4];
          c.fillStyle = rgb(col); c.fillRect(x, h - bh, bw, bh);
          c.fillStyle = rgb(mix(col, [255, 255, 255], 0.15)); c.fillRect(x, h - bh, bw, 2);
          c.fillStyle = rgb(mix(col, [0, 0, 0], 0.3)); c.fillRect(x + bw - 3, h - bh, 3, bh);
          for (var wy = h - bh + 8; wy < h - 36; wy += 14) for (var wx = x + 8; wx < x + bw - 14; wx += 16) { c.fillStyle = '#1a1a26'; c.fillRect(wx, wy, 8, 9); c.fillStyle = '#2c2c3c'; c.fillRect(wx, wy, 8, 1); }
          c.fillStyle = '#20202a'; c.fillRect(x + 6, h - 30, bw - 12, 24);
          c.fillStyle = rgb([[200, 40, 90], [30, 110, 150], [150, 60, 30], [40, 120, 60]][i % 4]); c.fillRect(x + 4, h - 36, bw - 8, 5);
          lamps.push([x, bw, bh, i]);
          x += bw + 6; i++;
        }
      });
      this.standGlow = mk(1280, 96, function (c, w, h) {
        lamps.forEach(function (L) {
          var x = L[0], bw = L[1], bh = L[2], i = L[3], wx, wy;
          for (wy = h - bh + 8; wy < h - 36; wy += 14) for (wx = x + 8; wx < x + bw - 14; wx += 16) if (((wx * 7 + wy * 3) % 5) < 2) { c.fillStyle = (wx + wy) % 3 ? '#ffcf6a' : '#9fd8ff'; c.fillRect(wx, wy, 8, 9); }
          c.fillStyle = 'rgba(255,200,120,0.85)'; c.fillRect(x + 8, h - 28, bw - 16, 20);
          var neon = ['#ff3d9a', '#3df0ff', '#ffd23d', '#7dff6a'][i % 4], word = ['BAR', 'TUNE', 'PIZZA', 'PARTS', 'CLUB', 'AUTO'][i % 6];
          c.fillStyle = neon; DR.pixText(c, word, x + bw / 2 - DR.pixTextW(word, 2) / 2, h - bh + 2 > h - 50 ? h - 50 : h - 52, neon, 2);
          c.fillRect(x + bw / 2 - DR.pixTextW(word, 2) / 2 - 3, h - 55, DR.pixTextW(word, 2) + 6, 1);
        });
      });
      this.wall = null;
    }
    // ---- asphalt tile (y 320..404)
    var T = this.theme;
    this.asphalt = mk(512, 84, function (c, w, h) {
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var n = r(), v = (n - 0.5) * 9 + (n > 0.985 ? 20 : 0);
        // rubbered grooves where the tires run
        var gy = y + 320, dg = Math.min(Math.abs(gy - (LANE_Y[0] - 2)), Math.abs(gy - (LANE_Y[1] - 2)));
        v -= dg < 5 ? (5 - dg) * 2.4 : 0;
        if (y < 2) v -= 12;
        c.fillStyle = rgb([T.asphalt[0] + v, T.asphalt[1] + v, T.asphalt[2] + v + 2]); c.fillRect(x, y, 1, 1);
      }
      // cracks / sealer
      c.fillStyle = rgb(mix(T.asphalt, [0, 0, 0], 0.35));
      for (var i = 0; i < 6; i++) { var cx = r() * w | 0, cy = r() * h | 0; for (var k = 0; k < 14; k++) { c.fillRect(cx, cy, 1, 1); cx += 1; cy += (r() * 3 | 0) - 1; } }
    });
    // ---- launch pad + burnout box, in world space from 24 m behind the line
    this.pad = mk(84 * PPM, 82, function (c, w, h) {
      for (var x = 0; x < w; x++) {
        var wx = x / PPM - 24, fade = wx < 0 ? 1 : Math.max(0, 1 - wx / 60);
        c.fillStyle = 'rgba(150,150,154,' + (0.55 * fade).toFixed(3) + ')'; c.fillRect(x, 0, 1, h);
        if (wx > -8) {
          var rub = Math.min(1, 0.4 + fade) * (wx < 0 ? 0.6 : 1);
          c.fillStyle = 'rgba(16,16,18,' + (0.6 * rub).toFixed(3) + ')';
          c.fillRect(x, LANE_Y[0] - 7 - 321, 1, 9); c.fillRect(x, LANE_Y[1] - 6 - 321, 1, 8);
        }
        if (x % 64 === 0 && fade > 0.05) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x, 0, 1, h); }
      }
      // burnout box: wet, reflecting the sky
      var bx0 = 2 * PPM, bx1 = 14 * PPM, i;
      c.fillStyle = T.night ? 'rgba(40,50,90,0.45)' : 'rgba(70,110,160,0.42)'; c.fillRect(bx0, 0, bx1 - bx0, h);
      c.fillStyle = T.night ? 'rgba(160,170,255,0.18)' : 'rgba(220,235,255,0.35)';
      for (i = 0; i < 22; i++) c.fillRect(bx0 + ((i * 53) % (bx1 - bx0)), 3 + (i * 29) % 76, 10 + (i * 7) % 18, 1);
      c.fillStyle = '#e8e8e8'; c.fillRect(bx0, 0, 2, h); c.fillRect(bx1, 0, 2, h);
    });
    // ---- grass / sidewalk tile (foreground)
    this.grass = mk(256, 34, function (c, w, h) {
      var g = T.ground;
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var n = r(), v = (n - 0.5) * 18 - y * 0.4;
        c.fillStyle = rgb(night ? [g[0] + v * 0.4, g[1] + v * 0.4, g[2] + v * 0.4] : [g[0] + v * 0.6, g[1] + v, g[2] + v * 0.4]);
        c.fillRect(x, y, 1, 1);
      }
      if (!night) for (var i = 0; i < 90; i++) { var tx = r() * w | 0, ty = 4 + r() * (h - 4) | 0; c.fillStyle = '#b6d878'; c.fillRect(tx, ty, 1, 1); c.fillStyle = '#3e6a26'; c.fillRect(tx, ty + 1, 1, 1); }
    });
  }
  DR.Scene = Scene;

  function tileX(ctx, img, off, y) {
    var w = img.width, x = -(((off % w) + w) % w);
    for (; x < DR.VIEW_W; x += w) ctx.drawImage(img, Math.round(x), y);
  }

  Scene.prototype.drawBackground = function (ctx, camX, time) {
    var o = camX * PPM;
    this.glow.length = 0;
    ctx.drawImage(this.sky, 0, 0);
    if (!this.theme.night) tileX(ctx, this.clouds, o * 0.02 + time * 4, 6);
    tileX(ctx, this.far, o * 0.05, HZ - 90);
    tileX(ctx, this.trees, o * 0.22, HZ - 62);
  };

  Scene.prototype.drawTrack = function (ctx, camX, time) {
    var T = this.theme, W = DR.VIEW_W, i, o = camX * PPM, x;
    if (this.themeId === 'strip') {
      // stadium light towers (behind the stands), lit at night
      for (i = -1; i < 4; i++) {
        x = Math.round(i * 300 - ((o * 0.7) % 300 + 300) % 300 + 120);
        ctx.fillStyle = '#6a707a'; ctx.fillRect(x, 120, 3, 110); ctx.fillStyle = '#9aa1ac'; ctx.fillRect(x, 120, 1, 110);
        ctx.fillStyle = '#3a3f47'; ctx.fillRect(x - 12, 108, 27, 14);
        for (var lx = 0; lx < 4; lx++) for (var ly = 0; ly < 2; ly++) { ctx.fillStyle = T.night ? '#ffffff' : '#e8ecf2'; ctx.fillRect(x - 10 + lx * 6, 110 + ly * 6, 5, 4); }
        if (T.night) this.glow.push({ flood: true, x: x + 1, y: 114 });
      }
      tileX(ctx, this.stand, o * 0.85, 226);
      tileX(ctx, this.wall, o, 288);
    } else {
      tileX(ctx, this.stand, o * 0.9, 222);
      this._standOff = o * 0.9;
      ctx.fillStyle = '#4a4a52'; ctx.fillRect(0, 312, W, 8);
      ctx.fillStyle = '#6a6a74'; ctx.fillRect(0, 312, W, 1);
      // street lamps on the far side
      for (i = -1; i < 4; i++) {
        x = Math.round(i * 280 - ((o % 280) + 280) % 280 + 60);
        ctx.fillStyle = '#2a2a30'; ctx.fillRect(x, 238, 3, 82);
        ctx.fillRect(x, 238, 22, 3);
        ctx.fillStyle = '#ffeaa0'; ctx.fillRect(x + 14, 241, 10, 2);
        this.glow.push({ lamp: true, x: x + 19, y: 242 });
      }
    }
    // track
    tileX(ctx, this.asphalt, o, 320);
    var startX = -o;
    // concrete launch pad with heavy rubber, fading down the track (pre-rendered)
    var padL = Math.round(startX - 24 * PPM);
    if (padL + this.pad.width > 0 && padL < W) ctx.drawImage(this.pad, padL, 321);
    // lane divider
    ctx.fillStyle = T.line;
    if (this.themeId === 'strip') ctx.fillRect(0, 358, W, 2);
    else for (i = -1; i < W / 32 + 2; i++) ctx.fillRect(i * 32 - (o % 32), 358, 16, 2);
    // start line & staging beams
    if (startX > -40 && startX < W + 40) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(startX), 321, 3, 82);
      ctx.fillStyle = '#ffd400'; ctx.fillRect(Math.round(startX) - 14, 321, 2, 82);
      for (var ln = 0; ln < 2; ln++) { ctx.fillStyle = '#222'; ctx.fillRect(Math.round(startX) - 2, LANE_Y[ln] - 52 + 40, 2, 8); }
    }
    // distance boards
    var marks = [[60 * DR.FT, '60'], [330 * DR.FT, '330'], [DR.EIGHTH, '1/8'], [1000 * DR.FT, '1000'], [DR.QUARTER, '1/4']];
    for (i = 0; i < marks.length; i++) {
      if (marks[i][0] > this.dist + 1) continue;
      var mx = Math.round((marks[i][0] - camX) * PPM);
      if (mx < -60 || mx > W + 60) continue;
      ctx.fillStyle = '#2a2a2e'; ctx.fillRect(mx, 280, 2, 40);
      ctx.fillStyle = '#0d0d0f'; ctx.fillRect(mx - 21, 262, 44, 22);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(mx - 19, 264, 40, 18);
      ctx.fillStyle = '#d23a3a'; ctx.fillRect(mx - 19, 264, 40, 3);
      DR.pixText(ctx, marks[i][1], mx + 1 - Math.floor(DR.pixTextW(marks[i][1], 2) / 2), 270, '#111', 2);
    }
    // finish line & gantry
    var fx = Math.round((this.dist - camX) * PPM);
    if (fx > -80 && fx < W + 80) {
      for (var cy = 321; cy < 403; cy += 4) for (var cx = 0; cx < 8; cx += 4) { ctx.fillStyle = ((cy - 321) / 4 + cx / 4) % 2 ? '#111' : '#fff'; ctx.fillRect(fx + cx, cy, 4, 4); }
      ctx.fillStyle = '#3a3a40'; ctx.fillRect(fx - 4, 200, 5, 120); ctx.fillRect(fx + 66, 200, 5, 120);
      ctx.fillStyle = '#6a6a74'; ctx.fillRect(fx - 4, 200, 1, 120); ctx.fillRect(fx + 66, 200, 1, 120);
      ctx.fillStyle = '#b02020'; ctx.fillRect(fx - 8, 194, 84, 22);
      ctx.fillStyle = '#e04a4a'; ctx.fillRect(fx - 8, 194, 84, 2);
      DR.pixText(ctx, 'FINISH', fx + 34 - DR.pixTextW('FINISH', 2) / 2, 200, '#fff', 2);
      if (T.night) { this.glow.push({ x: fx + 34, y: 205, r: 50, c: [255, 80, 80], a: 0.35 }); }
    }
  };

  Scene.prototype.drawForeground = function (ctx, camX) {
    var T = this.theme, W = DR.VIEW_W, i, o = camX * PPM;
    // concrete barrier
    ctx.fillStyle = T.night ? '#6a6a70' : '#b8b8bc'; ctx.fillRect(0, 402, W, 14);
    ctx.fillStyle = T.night ? '#8a8a92' : '#e2e2e6'; ctx.fillRect(0, 402, W, 3);
    ctx.fillStyle = T.night ? '#3c3c42' : '#8a8a90'; ctx.fillRect(0, 413, W, 3);
    for (i = -1; i < W / 48 + 2; i++) { var jx = Math.round(i * 48 - (o % 48)); ctx.fillStyle = T.night ? '#45454c' : '#909096'; ctx.fillRect(jx, 402, 1, 14); }
    tileX(ctx, this.grass, o * 1.15, 416);
  };

  // The Christmas tree. state: {preStage, stage, amber:0-3, green, red:[bool,bool]}
  Scene.prototype.drawTree = function (ctx, camX, st) {
    var x = Math.round((0.6 - camX) * PPM);
    if (x < -40 || x > DR.VIEW_W + 40) return;
    var top = 182, self = this;
    ctx.fillStyle = '#2a2a2e'; ctx.fillRect(x + 9, top + 98, 5, 42);
    ctx.fillStyle = '#4a4a50'; ctx.fillRect(x + 9, top + 98, 1, 42);
    ctx.fillStyle = '#141416'; ctx.fillRect(x, top, 23, 100);
    ctx.fillStyle = '#3a3a40'; ctx.fillRect(x, top, 23, 2); ctx.fillRect(x, top, 1, 100);
    function bulb(bx, by, on, col) {
      ctx.fillStyle = '#060606'; ctx.fillRect(bx - 1, by - 1, 9, 7);
      ctx.fillStyle = on ? col : '#34343a'; ctx.fillRect(bx, by, 7, 5);
      ctx.fillStyle = on ? '#ffffff' : '#4a4a52'; ctx.fillRect(bx + 1, by + 1, 2, 1);
      if (on) self.glow.push({ x: bx + 3.5, y: by + 2.5, r: 16, c: hexToRgb(col), a: 0.55 });
    }
    for (var lane = 0; lane < 2; lane++) {
      var bx = lane === 0 ? x + 13 : x + 3;
      // pre-stage / stage bulbs light per lane as each car creeps in
      bulb(bx, top + 4, st.pre ? st.pre[lane] : st.stage, '#fffbe0');
      bulb(bx, top + 12, st.staged ? st.staged[lane] : st.stage, '#fffbe0');
      var am = st.amberL ? st.amberL[lane] : st.amber, gr = st.greenL ? st.greenL[lane] : st.green;
      for (var a = 0; a < 3; a++) bulb(bx, top + 24 + a * 12, am > a, '#ffb000');
      bulb(bx, top + 64, gr && !st.red[lane], '#22ff4a');
      bulb(bx, top + 76, st.red[lane], '#ff2222');
    }
  };

  // ------------------------------------------------------------ lighting pass
  // Day: warm low sun and a soft vignette. Night: the whole frame drops into
  // shadow, then lamps, windows, headlights and flames add their light back.
  // lamps: [{head:{x,y}, tail:{x,y}, brake}] from DR.carLamps.
  function radial(ctx, x, y, r, c, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgb(c, a)); g.addColorStop(1, rgb(c, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  Scene.prototype.light = function (ctx, camX, lamps, particles) {
    var W = DR.VIEW_W, H = DR.VIEW_H, glows = this.glow.slice(), self2 = this;
    if (particles) particles.glows(camX, LANE_Y, glows);
    ctx.save();
    if (!this.theme.night) {
      ctx.globalCompositeOperation = 'overlay';
      radial(ctx, 640, 96, 520, [255, 196, 120], 0.22);
      ctx.globalCompositeOperation = 'lighter';
      glows.forEach(function (g) { radial(ctx, g.x, g.y, g.r * 0.7, g.c, g.a * 0.6); });
      ctx.globalCompositeOperation = 'multiply';
      var v = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.45, W / 2, H * 0.55, W * 0.62);
      v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(1, 'rgba(150,140,150,1)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    } else {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgb(84,92,140)'; ctx.fillRect(0, 214, W, H - 214);
      ctx.globalCompositeOperation = 'lighter';
      if (this.standGlow) {
        // shop windows glow, but not through the cars parked in front of them
        var gl = this._glowBuf || (this._glowBuf = mk(W, H, function () {}));
        var g2 = gl.getContext('2d');
        g2.globalCompositeOperation = 'source-over'; g2.clearRect(0, 0, W, H);
        tileX(g2, this.standGlow, this._standOff || 0, 222);
        g2.globalCompositeOperation = 'destination-out';
        (lamps || []).forEach(function (L) { if (L.car) DR.drawCar(g2, L.car.spr, L.car.gx, L.car.gy, L.car.pitch, 0, { shadow: false }); });
        ctx.drawImage(gl, 0, 0);
      }
      var self = this;
      glows.forEach(function (g) {
        if (g.lamp) {
          // sodium street lamp: hot core, a cone down to the road, a pool on it
          radial(ctx, g.x, g.y, 22, [255, 220, 150], 0.8);
          var cg = ctx.createLinearGradient(0, g.y, 0, 404);
          cg.addColorStop(0, 'rgba(255,200,120,0.22)'); cg.addColorStop(1, 'rgba(255,190,110,0.05)');
          ctx.fillStyle = cg;
          ctx.beginPath(); ctx.moveTo(g.x - 6, g.y); ctx.lineTo(g.x + 6, g.y); ctx.lineTo(g.x + 70, 404); ctx.lineTo(g.x - 70, 404); ctx.closePath(); ctx.fill();
          ctx.save(); ctx.translate(g.x, 365); ctx.scale(1, 0.28); radial(ctx, 0, 0, 120, [255, 190, 110], 0.28); ctx.restore();
        } else if (g.flood) {
          // track lighting: a hot bank of lamps washing the strip below
          radial(ctx, g.x, g.y, 30, [235, 240, 255], 0.85);
          var fg = ctx.createLinearGradient(0, g.y, 0, 404);
          fg.addColorStop(0, 'rgba(220,228,255,0.16)'); fg.addColorStop(1, 'rgba(220,228,255,0.07)');
          ctx.fillStyle = fg;
          ctx.beginPath(); ctx.moveTo(g.x - 12, g.y); ctx.lineTo(g.x + 12, g.y); ctx.lineTo(g.x + 170, 404); ctx.lineTo(g.x - 120, 404); ctx.closePath(); ctx.fill();
          ctx.save(); ctx.translate(g.x + 25, 362); ctx.scale(1, 0.25); radial(ctx, 0, 0, 170, [225, 232, 255], 0.22); ctx.restore();
        } else radial(ctx, g.x, g.y, g.r, g.c, g.a);
      });
      (lamps || []).forEach(function (L) {
        if (L.head) {
          // headlight beam down the road
          var hx = L.head.x, hy = L.head.y;
          var bg = ctx.createLinearGradient(hx, 0, hx + 240, 0);
          bg.addColorStop(0, 'rgba(255,250,225,0.5)'); bg.addColorStop(1, 'rgba(255,250,225,0)');
          ctx.fillStyle = bg;
          ctx.beginPath(); ctx.moveTo(hx, hy - 2); ctx.lineTo(hx + 240, hy - 22); ctx.lineTo(hx + 240, L.ground + 4); ctx.lineTo(hx, hy + 3); ctx.closePath(); ctx.fill();
          radial(ctx, hx, hy, 12, [255, 250, 220], 0.9);
          ctx.save(); ctx.translate(hx + 90, L.ground); ctx.scale(1, 0.18); radial(ctx, 0, 0, 110, [255, 245, 210], 0.35); ctx.restore();
        }
        radial(ctx, L.tail.x, L.tail.y, L.brake ? 22 : 10, [255, 30, 30], L.brake ? 0.7 : 0.45);
      });
    }
    // neon underglow lights the ground (strong at night, a hint by day)
    ctx.globalCompositeOperation = 'lighter';
    (lamps || []).forEach(function (L) {
      if (!L.neon) return;
      ctx.save(); ctx.translate(L.neon.x, L.ground + 2); ctx.scale(1, 0.09);
      radial(ctx, 0, 0, L.neon.w * 0.62, L.neon.c, self2.theme.night ? 0.4 : 0.16); ctx.restore();
    });
    ctx.restore();
  };

  // ------------------------------------------------------------ garage backdrop
  DR.drawGarage = function (ctx, w, h) {
    var fl = Math.round(h * 0.68);
    var g = ctx.createLinearGradient(0, 0, 0, fl);
    g.addColorStop(0, '#1b1d22'); g.addColorStop(1, '#30333b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, fl);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (var x = 0; x < w; x += 24) ctx.fillRect(x, 0, 1, fl);
    ctx.fillStyle = '#ffde59'; ctx.fillRect(0, fl - 8, w, 2);
    ctx.fillStyle = '#1a1a1a'; for (x = 0; x < w; x += 12) ctx.fillRect(x, fl - 8, 6, 2);
    var fg = ctx.createLinearGradient(0, fl, 0, h);
    fg.addColorStop(0, '#4c5059'); fg.addColorStop(1, '#2a2c32');
    ctx.fillStyle = fg; ctx.fillRect(0, fl, w, h - fl);
    ctx.fillStyle = '#62666f'; ctx.fillRect(0, fl, w, 1);
    // overhead light and its pool
    ctx.fillStyle = '#fff6dc'; ctx.fillRect(Math.round(w * 0.38), 0, Math.round(w * 0.24), 3);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var cone = ctx.createLinearGradient(0, 0, 0, h);
    cone.addColorStop(0, 'rgba(255,236,200,0.16)'); cone.addColorStop(1, 'rgba(255,236,200,0.03)');
    ctx.fillStyle = cone;
    ctx.beginPath(); ctx.moveTo(w * 0.38, 3); ctx.lineTo(w * 0.62, 3); ctx.lineTo(w * 0.86, h); ctx.lineTo(w * 0.14, h); ctx.closePath(); ctx.fill();
    ctx.translate(w / 2, fl + (h - fl) * 0.4); ctx.scale(1, 0.25);
    var pg = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.4);
    pg.addColorStop(0, 'rgba(255,236,200,0.22)'); pg.addColorStop(1, 'rgba(255,236,200,0)');
    ctx.fillStyle = pg; ctx.fillRect(-w * 0.4, -w * 0.4, w * 0.8, w * 0.8);
    ctx.restore();
  };

  // Render a static preview of a car into a canvas element (garage/dealer).
  DR.drawPreview = function (canvas, inst, opts) {
    opts = opts || {};
    var spr = DR.carSprite(DR.carLook(inst));
    if (opts.fit !== false && !opts.groundY) {
      // size the canvas around the car so every preview fills its frame
      var fw = Math.max(160, Math.round(spr.lenPx * 1.5 + 40));
      canvas._lw = fw; canvas._lh = Math.round(fw * (opts.aspect || 0.45));
    }
    var ctx = DR.hiCanvas(canvas);
    var w = canvas._lw, h = canvas._lh;
    if (opts.bg !== false) DR.drawGarage(ctx, w, h); else ctx.clearRect(0, 0, w, h);
    var gy = opts.groundY || Math.round(h * 0.68) + 8;
    var gx = Math.round(w / 2 - spr.lenPx / 2 + (spr.wheelR.x - spr.padL));
    if (opts.bg !== false) {
      // a faint reflection in the polished floor
      ctx.save(); ctx.globalAlpha = 0.16; ctx.translate(0, gy * 2); ctx.scale(1, -1);
      DR.drawCar(ctx, spr, gx, gy, 0, opts.wheelAng || 0.3, { shadow: false });
      ctx.restore();
    }
    DR.drawCar(ctx, spr, gx, gy, 0, opts.wheelAng || 0.3);
  };
})();
