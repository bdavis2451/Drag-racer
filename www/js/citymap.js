// ===========================================================================
// CITY MAP — the race menu's map of the city: the look of the Need for Speed
// Underground 2 world map (dark hills, teal sea, white highways, faint street
// grids) done as pixel art. The terrain, coast, roads and landmarks are
// rendered pixel by pixel at 480x270 with ordered dithering, then shown
// zoomed with crisp pixels. Our places sit on it as pixel-art marker badges.
// The map pans and zooms (drag, pinch, mouse wheel or the +/- buttons).
// ===========================================================================
(function () {
  var DR = globalThis.DR;
  var W = 480, H = 270;
  DR.CITY_W = W; DR.CITY_H = H;

  // places: x, y = marker position in map pixels. events: which career event
  // types happen there. go: a screen to open instead. icon: marker art.
  DR.CITY = [
    { id: 'strip', name: 'Pixel Dragway', x: 214, y: 229, icon: 'flag', blurb: 'The prepped quarter mile out on the island: grandstands, a timing tower and full grip.', events: ['quarter', 'eighth', 'sponsor', 'boss'], test: true },
    { id: 'runway', name: 'Airfield Runway', x: 442, y: 158, icon: 'plane', blurb: 'Knockout night on the old runway. Wide, flat and fast.', events: ['knockout'] },
    { id: 'highway', name: 'Route 99', x: 392, y: 118, icon: 'shield', blurb: 'Street racers meet on the loop. Bet on yourself.', street: true },
    { id: 'downtown', name: 'Downtown', x: 300, y: 134, icon: 'tower', blurb: 'Stoplight to stoplight between the towers. Cold asphalt, less grip.', events: ['street'] },
    { id: 'docks', name: 'Harbor Docks', x: 205, y: 163, icon: 'anchor', blurb: 'Invitation-only night races between the container stacks.', events: ['showcase'] },
    { id: 'dealer', name: 'Pixel Motors', x: 262, y: 104, icon: 'car', blurb: 'New and used cars.', go: 'Dealer' },
    { id: 'parts', name: 'Parts Store', x: 340, y: 158, icon: 'wrench', blurb: 'Performance parts and quick upgrade packages.', go: 'Shop' },
    { id: 'home', name: 'Your Garage', x: 434, y: 50, icon: 'house', blurb: 'Home base.', go: 'Garage' },
    { id: 'shows', name: 'Convention Center', x: 352, y: 60, icon: 'trophy', blurb: 'Car shows: park your build and win over the crowd.', go: 'Shows' }
  ];
  DR.cityPlaceOf = function (evType) {
    for (var i = 0; i < DR.CITY.length; i++) if ((DR.CITY[i].events || []).indexOf(evType) >= 0) return DR.CITY[i];
    return DR.CITY[0];
  };

  // ---------------------------------------------------------------- geography
  var MAINLAND = [[150, -8], [490, -8], [490, 200], [450, 207], [420, 196], [394, 202], [366, 194], [338, 197], [314, 188], [288, 190], [262, 180], [240, 174], [222, 164],
    [204, 156], [186, 152], [170, 140], [158, 122], [144, 112], [126, 104], [114, 88], [120, 70], [106, 56], [94, 42], [98, 22], [116, 6]];
  var BAY = [[264, 44], [288, 32], [320, 36], [336, 50], [330, 62], [314, 70], [290, 72], [270, 66], [258, 56]];
  var ISLAND = [[164, 224], [190, 210], [228, 205], [264, 211], [298, 207], [336, 213], [362, 226], [370, 244], [350, 259], [308, 265], [258, 263], [212, 259], [178, 251], [158, 239]];
  var ISLET = [[40, 150], [58, 141], [78, 147], [76, 163], [54, 168]];
  var ISLET2 = [[96, 196], [108, 190], [118, 196], [112, 206], [100, 206]];
  // the city proper is darker than the hills around it
  var ZONES = [
    [[232, 98], [254, 78], [300, 66], [356, 70], [388, 90], [402, 124], [398, 158], [372, 182], [320, 190], [272, 186], [242, 168], [226, 136]],   // downtown
    [[384, 16], [440, 10], [478, 26], [480, 86], [450, 98], [404, 90], [386, 58]],                                                                // eastside
    [[398, 142], [478, 140], [480, 190], [444, 198], [406, 182]],                                                                                  // airfield
    [[178, 132], [212, 120], [240, 134], [236, 168], [204, 160], [182, 152]],                                                                      // harbor
    [[172, 226], [232, 210], [300, 212], [352, 226], [360, 246], [312, 258], [230, 254], [176, 246]],                                              // island
    [[150, 30], [190, 22], [222, 44], [214, 72], [180, 80], [152, 64]]                                                                             // canyon village
  ];
  // highways: an angular outer ring, a tight inner loop and cross-town links
  // (like the NFSU2 map's knot of freeways), and spurs out to the districts
  var RING = [[234, 108], [256, 82], [298, 70], [334, 74], [350, 82], [388, 90], [404, 126], [398, 152], [378, 172], [352, 182], [306, 190], [266, 180], [244, 162], [228, 134]];
  var INNER = [[318, 92], [360, 84], [376, 110], [348, 134], [316, 120]];
  var HIGHWAYS = [
    [RING, 1],
    [INNER, 1],
    [[[256, 82], [276, 110], [292, 118], [298, 150], [306, 190]], 0],              // north-south link
    [[[228, 134], [262, 140], [300, 136], [332, 128]], 0],                           // west link into the inner loop
    [[[368, 98], [388, 90]], 0],
    [[[234, 108], [218, 92], [200, 80], [184, 66]], 0],                              // to the canyon
    [[[352, 182], [348, 198], [336, 214], [318, 224], [292, 228]], 0],               // bridge to the island
    [[[404, 126], [418, 136], [434, 146]], 0],                                       // to the airfield
    [[[388, 90], [404, 80], [418, 66]], 0]                                           // to the eastside
  ];
  var ARTERIALS = [
    [[418, 66], [430, 48], [454, 30], [476, 22]], [[396, 62], [420, 58], [448, 64], [474, 58]],
    [[212, 122], [218, 140], [212, 156], [198, 160]], [[230, 130], [214, 128], [196, 136]],
    [[292, 228], [262, 222], [232, 228], [204, 236], [184, 242]], [[322, 222], [336, 236], [352, 242]],
    [[434, 146], [440, 172], [462, 182]], [[184, 66], [170, 52], [160, 40]],
    [[302, 72], [298, 56], [292, 40]], [[352, 76], [356, 60], [360, 46]]
  ];
  // interchanges get a little cloverleaf
  var JUNCTIONS = [[256, 82], [228, 134], [306, 190], [388, 90], [404, 126], [352, 182], [234, 108], [332, 128]];

  // ---------------------------------------------------------------- helpers
  function rnd(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function bayer(x, y) { return (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16; }
  // smooth value noise, 0..1
  function noiseFn(seed) {
    var R = rnd(seed), g = [], N = 64;
    for (var i = 0; i < N * N; i++) g.push(R());
    function v(ix, iy) { return g[((iy % N + N) % N) * N + ((ix % N + N) % N)]; }
    return function (x, y) {
      var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      var a = v(ix, iy) + (v(ix + 1, iy) - v(ix, iy)) * fx, b = v(ix, iy + 1) + (v(ix + 1, iy + 1) - v(ix, iy + 1)) * fx;
      return a + (b - a) * fy;
    };
  }
  // a smooth closed or open curve through points (Catmull-Rom as Beziers)
  function curve(c, pts, closed) {
    var n = pts.length, i;
    function P(k) { return closed ? pts[(k + n) % n] : pts[Math.max(0, Math.min(n - 1, k))]; }
    c.moveTo(pts[0][0], pts[0][1]);
    for (i = 0; i < (closed ? n : n - 1); i++) {
      var p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    if (closed) c.closePath();
  }
  // draw with the canvas, then read back which pixels got covered (alpha 0..1)
  function cover(draw) {
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var c = cv.getContext('2d');
    c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineCap = 'round'; c.lineJoin = 'round';
    draw(c);
    var d = c.getImageData(0, 0, W, H).data, out = new Float32Array(W * H);
    for (var i = 0; i < out.length; i++) out[i] = d[i * 4 + 3] / 255;
    return out;
  }
  // straight runs with tight rounded corners: how freeways look on a map
  function polyR(c, pts, r, closed) {
    var n = pts.length, i;
    if (closed) {
      var a = pts[n - 1], b = pts[0];
      c.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      for (i = 0; i < n; i++) c.arcTo(pts[i][0], pts[i][1], pts[(i + 1) % n][0], pts[(i + 1) % n][1], r);
      c.closePath();
    } else {
      c.moveTo(pts[0][0], pts[0][1]);
      for (i = 1; i < n - 1; i++) c.arcTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r);
      c.lineTo(pts[n - 1][0], pts[n - 1][1]);
    }
  }
  function strokeHw(c, pts, w, closed) { c.lineWidth = w; c.beginPath(); polyR(c, pts, 9, closed); c.stroke(); }
  function fillShape(c, pts) { c.beginPath(); curve(c, pts, true); c.fill(); }
  function strokeLine(c, pts, w, closed) { c.lineWidth = w; c.beginPath(); curve(c, pts, closed); c.stroke(); }

  // ---------------------------------------------------------------- palette
  var P = {
    deep: [12, 29, 37], sea: [17, 40, 50], sea2: [21, 48, 58], shal: [29, 63, 72], shal2: [41, 82, 90], foam: [74, 120, 124],
    l0: [44, 50, 46], l1: [52, 59, 54], l2: [61, 69, 63], l3: [72, 81, 74], l4: [86, 96, 88], contour: [38, 43, 40], rim: [92, 104, 96],
    c0: [21, 24, 23], c1: [27, 31, 29], roof: [36, 41, 38], roof2: [44, 50, 46],
    st: [84, 92, 87], st2: [64, 71, 67], art: [140, 148, 143], hw: [238, 242, 238], hwE: [166, 174, 168], halo: [70, 78, 73],
    lane: [118, 126, 120], tar: [58, 62, 60], white: [226, 230, 226], red: [168, 52, 48], amber: [200, 150, 60], blue: [60, 98, 140], teal: [52, 112, 108]
  };

  var base = null;
  function build() {
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var cx = cv.getContext('2d'), img = cx.createImageData(W, H), d = img.data;
    var R = rnd(7), N1 = noiseFn(11), N2 = noiseFn(23), N3 = noiseFn(37), i, x, y;
    function put(x, y, col) { if (x < 0 || y < 0 || x >= W || y >= H) return; var k = (y * W + x) * 4; d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255; }
    function rect(x, y, w, h, col) { for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) put(xx, yy, col); }
    function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
    // dithered pick between two palette colours
    function dith(x, y, a, b, t) { return t > bayer(x, y) ? b : a; }

    // ---- masks
    var land = cover(function (c) {
      [MAINLAND, ISLAND, ISLET, ISLET2].forEach(function (s) { fillShape(c, s); });
      c.globalCompositeOperation = 'destination-out'; fillShape(c, BAY);
    });
    var isLand = new Uint8Array(W * H);
    for (i = 0; i < isLand.length; i++) isLand[i] = land[i] > 0.5 ? 1 : 0;
    // distance (in pixels) from the coast, both ways, up to 12
    function distFrom(src) {
      var dist = new Uint8Array(W * H).fill(255), q = [];
      for (i = 0; i < src.length; i++) if (src[i]) { dist[i] = 0; q.push(i); }
      for (var h = 0; h < q.length; h++) {
        var p = q[h], px = p % W, py = (p / W) | 0, nd = dist[p] + 1;
        if (nd > 12) continue;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) {
          var nx = px + o[0], ny = py + o[1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
          var n = ny * W + nx; if (dist[n] > nd) { dist[n] = nd; q.push(n); }
        });
      }
      return dist;
    }
    var seaDist = distFrom(isLand);
    var notLand = new Uint8Array(W * H); for (i = 0; i < W * H; i++) notLand[i] = 1 - isLand[i];
    var landDist = distFrom(notLand);
    var zone = cover(function (c) { c.filter = 'blur(4px)'; ZONES.forEach(function (z) { fillShape(c, z); }); });
    var core = cover(function (c) { c.beginPath(); polyR(c, RING, 9, true); c.fill(); });
    // streets: skewed grids in three downtown patches, radial avenues, suburbs
    var streets = cover(function (c) {
      c.save(); c.beginPath(); polyR(c, RING, 9, true); c.clip();
      [[272, 118, -0.38, 7, 9], [314, 160, 0.16, 8, 7], [356, 150, -0.05, 6, 8]].forEach(function (pt) {
        c.save(); c.translate(pt[0], pt[1]); c.rotate(pt[2]); c.lineWidth = 1;
        for (var a = -60; a <= 60; a += pt[3] + Math.floor(R() * 3)) for (var b = -50; b < 50; b += 9 + R() * 10) { if (R() < 0.18) continue; c.beginPath(); c.moveTo(a, b); c.lineTo(a, b + 8 + R() * 10); c.stroke(); }
        for (var b2 = -50; b2 <= 50; b2 += pt[4] + Math.floor(R() * 3)) for (var a2 = -60; a2 < 60; a2 += 10 + R() * 12) { if (R() < 0.2) continue; c.beginPath(); c.moveTo(a2, b2); c.lineTo(a2 + 9 + R() * 12, b2); c.stroke(); }
        c.restore();
      });
      // a round plaza with avenues fanning out of it
      c.lineWidth = 1.2; c.beginPath(); c.arc(298, 132, 5, 0, Math.PI * 2); c.stroke();
      for (var k = 0; k < 7; k++) { var an = k / 7 * Math.PI * 2 + 0.3; c.beginPath(); c.moveTo(298 + Math.cos(an) * 5, 132 + Math.sin(an) * 5); c.lineTo(298 + Math.cos(an) * 40, 132 + Math.sin(an) * 30); c.stroke(); }
      c.restore();
      // suburbs: winding lanes and cul-de-sacs
      c.lineWidth = 1;
      [[ZONES[1], 430, 50, 16], [ZONES[3], 206, 142, 7], [ZONES[4], 300, 238, 14], [ZONES[4], 220, 244, 6], [ZONES[5], 184, 48, 8], [ZONES[2], 450, 186, 4]].forEach(function (z) {
        for (var n = 0; n < z[3]; n++) {
          var px = z[1] + (R() - 0.5) * 44, py = z[2] + (R() - 0.5) * 26, an2 = R() * 6.28, pts = [[px, py]];
          for (var s = 0; s < 5; s++) { an2 += (R() - 0.5) * 1.2; px += Math.cos(an2) * (5 + R() * 4); py += Math.sin(an2) * (4 + R() * 3); pts.push([px, py]); }
          c.beginPath(); curve(c, pts, false); c.stroke();
          c.beginPath(); c.arc(px, py, 1.2, 0, Math.PI * 2); c.stroke();
        }
      });
      // the canyon run: a switchback road up into the hills
      var canyon = [[184, 66]];
      for (var t = 1; t <= 18; t++) { var u = t / 18; canyon.push([184 - u * 76 + Math.sin(u * 21) * 9, 66 - u * 50 + Math.cos(u * 25) * 7]); }
      c.lineWidth = 1.2; c.beginPath(); curve(c, canyon, false); c.stroke();
      c.beginPath(); curve(c, [[148, 36], [138, 60], [144, 86], [156, 104]], false); c.stroke();
    });
    var arts = cover(function (c) {
      ARTERIALS.forEach(function (a) { strokeLine(c, a, 1.4); });
      JUNCTIONS.forEach(function (j) { c.lineWidth = 1; c.beginPath(); c.arc(j[0] + 3, j[1] + 3, 2.5, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(j[0] - 3, j[1] - 3, 2.5, 0, Math.PI * 2); c.stroke(); });
    });
    var hwHalo = cover(function (c) { HIGHWAYS.forEach(function (h) { strokeHw(c, h[0], 6, !!h[1]); }); });
    var hwEdge = cover(function (c) { HIGHWAYS.forEach(function (h) { strokeHw(c, h[0], 3.4, !!h[1]); }); });
    var hwCore = cover(function (c) { HIGHWAYS.forEach(function (h) { strokeHw(c, h[0], 1.9, !!h[1]); }); });

    // ---- terrain & sea, pixel by pixel
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var p = y * W + x, col;
      if (!isLand[p]) {
        var sd = seaDist[p], swell = N2(x / 40, y / 30);
        col = dith(x, y, P.deep, P.sea, Math.min(1, 0.25 + swell * 0.9 - y / H * 0.2 + (1 - x / W) * 0.15));
        if (sd <= 8) col = dith(x, y, col, P.sea2, (8 - sd) / 8);
        if (sd <= 4) col = dith(x, y, P.sea2, P.shal, (4 - sd) / 3);
        if (sd <= 1) col = P.shal2;
        // wave glints: short horizontal dashes on the open sea
        if (sd > 4 && N3(x / 3, y / 1.2) > 0.82 && (x + y * 7) % 5 < 2) col = mix(col, P.foam, 0.45);
      } else {
        // hills: higher toward the north-west, with topographic contours
        var hill = Math.max(0, 1 - Math.hypot((x - 150) / 190, (y - 30) / 140));
        var hgt = N1(x / 26, y / 22) * 0.7 + N2(x / 9, y / 8) * 0.3;
        var e = hgt * (0.35 + hill * 0.9) + hill * 0.25;
        var tones = [P.l0, P.l1, P.l2, P.l3, P.l4], f = Math.min(3.999, e * 4), lo = Math.floor(f);
        col = dith(x, y, tones[lo], tones[lo + 1], f - lo);
        var band = Math.floor(e * 9), bandR = Math.floor((N1((x + 1) / 26, y / 22) * 0.7 + N2((x + 1) / 9, y / 8) * 0.3) * (0.35 + hill * 0.9) * 9 + hill * 0.25 * 9);
        var bandD = Math.floor((N1(x / 26, (y + 1) / 22) * 0.7 + N2(x / 9, (y + 1) / 8) * 0.3) * (0.35 + hill * 0.9) * 9 + hill * 0.25 * 9);
        if ((band !== bandR || band !== bandD) && hill > 0.15 && zone[p] < 0.3) col = P.contour;
        // the city is darker, dithered into the hills at its edges
        var zw = zone[p];
        if (zw > 0.02) col = dith(x, y, col, zw > 0.7 ? P.c0 : P.c1, Math.min(1, zw * 1.4));
        // a lit rim along the coast
        if (landDist[p] === 1) col = mix(col, P.rim, 0.55);
      }
      put(x, y, col);
    }
    // downtown blocks: roof tops between the streets, lit on the top-left
    for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) {
      var q = y * W + x;
      if (!isLand[q] || core[q] < 0.5 || streets[q] > 0.35) continue;
      var blk = N3(x / 3.1, y / 2.7);
      if (blk > 0.55) put(x, y, streets[q - W] > 0.35 || streets[q - 1] > 0.35 ? P.roof2 : P.roof);
    }
    // roads, back to front: streets, arterials, highway halo, edge and core
    for (i = 0; i < W * H; i++) {
      x = i % W; y = (i / W) | 0;
      if (streets[i] > 0.4 && isLand[i]) put(x, y, core[i] > 0.5 ? P.st : P.st2);
      if (arts[i] > 0.45) put(x, y, P.art);
    }
    for (i = 0; i < W * H; i++) {
      x = i % W; y = (i / W) | 0;
      if (hwHalo[i] > 0.3 && hwEdge[i] < 0.5 && bayer(x, y) < 0.5) put(x, y, isLand[i] ? P.halo : P.shal);
    }
    for (i = 0; i < W * H; i++) { x = i % W; y = (i / W) | 0; if (hwEdge[i] > 0.5) put(x, y, P.hwE); }
    for (i = 0; i < W * H; i++) { x = i % W; y = (i / W) | 0; if (hwCore[i] > 0.5) put(x, y, P.hw); }

    // ---- landmarks, as crisp pixel art
    // drag strip on the island: two lanes, start & finish, grandstand, tower
    rect(190, 233, 64, 6, P.tar); rect(190, 235, 64, 1, P.lane); rect(190, 236, 64, 1, P.c0);
    for (x = 190; x < 254; x += 4) put(x, 233, P.lane);
    for (y = 233; y < 239; y++) { put(190 + (y & 1), y, P.white); put(250, y, P.red); }
    rect(196, 228, 30, 4, P.roof2); for (x = 197; x < 225; x++) if ((x * 7) % 3) put(x, 229, [[150, 60, 60], [70, 110, 160], [200, 180, 90], [190, 190, 190]][x % 4]);
    rect(228, 226, 3, 6, P.l4); put(229, 225, P.amber);
    for (i = 0; i < 18; i++) put(194 + (i % 9) * 3, 241 + ((i / 9) | 0) * 2, [[140, 60, 60], [80, 90, 120], [160, 160, 150]][i % 3]);
    // airfield: runway with threshold bars and centre dashes, taxiway, hangars
    rect(414, 160, 62, 6, P.tar);
    for (x = 418; x < 472; x += 5) rect(x, 162, 3, 1, P.white);
    for (y = 160; y < 166; y += 2) { put(415, y, P.white); put(474, y, P.white); }
    rect(420, 168, 48, 1, P.lane); rect(426, 170, 10, 5, P.roof2); rect(438, 170, 10, 5, P.roof2); rect(450, 170, 6, 4, P.roof);
    put(442, 175, P.amber); rect(458, 152, 2, 6, P.l4); put(458, 151, P.red);
    // a little plane on the apron
    rect(429, 176, 7, 1, P.white); put(432, 175, P.white); put(432, 177, P.white); put(435, 176, P.white);
    // harbor: piers, container stacks, a crane and a ship
    for (i = 0; i < 4; i++) rect(196 + i * 7, 166 + i * 2, 2, 9, P.l3);
    [[208, 146, P.red], [212, 146, P.blue], [216, 146, P.teal], [208, 149, P.amber], [212, 149, P.red], [218, 150, P.blue], [222, 152, P.teal]].forEach(function (k) { rect(k[0], k[1], 3, 2, mix(k[2], P.c0, 0.25)); });
    rect(226, 144, 1, 9, P.amber); rect(222, 144, 8, 1, P.amber);
    rect(186, 176, 16, 3, P.c0); rect(188, 175, 4, 1, P.white); rect(197, 176, 2, 2, P.red);
    // convention center: a long hall with a striped roof
    rect(344, 64, 18, 8, P.roof2); for (x = 345; x < 361; x += 3) rect(x, 65, 1, 6, P.l4);
    // dealer lot: rows of little cars
    rect(256, 108, 12, 7, P.tar);
    for (i = 0; i < 8; i++) put(257 + (i % 4) * 3, 109 + ((i / 4) | 0) * 3, [[200, 60, 60], [220, 220, 220], [60, 110, 200], [230, 190, 60]][i % 4]);
    // parts store with its sign, and your garage
    rect(334, 162, 10, 5, P.roof2); rect(335, 162, 8, 1, P.amber);
    rect(430, 54, 6, 4, P.roof2); put(432, 53, P.l4); put(433, 53, P.l4); put(433, 57, P.amber);
    // a bridge deck where the highway crosses the water
    for (i = 0; i < W * H; i++) if (hwEdge[i] > 0.5 && !isLand[i] && (i % W) % 3 === 0) { x = i % W; y = (i / W) | 0; put(x, y + 2, P.c0); }

    // ---- a soft dark vignette, dithered
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var v = Math.max(0, Math.hypot((x - W / 2) / (W * 0.62), (y - H / 2) / (H * 0.62)) - 0.62) * 2.2;
      if (v > bayer(x, y) + 0.15) { var k2 = (y * W + x) * 4; d[k2] = d[k2] * 0.72; d[k2 + 1] = d[k2 + 1] * 0.72; d[k2 + 2] = d[k2 + 2] * 0.72; }
    }
    cx.putImageData(img, 0, 0);
    return cv;
  }

  // ---------------------------------------------------------------- markers
  // 9x9 icons: '#' dark, 'o' light
  var ICONS = {
    flag:   ['#o#o#o#  ', '#o#o#o#  ', 'o#o#o#o  ', 'o#o#o#o  ', '#o#o#o#  ', '#        ', '#        ', '#        ', '#        '],
    plane:  ['    #    ', '    #    ', '   ###   ', ' ####### ', '#########', '   ###   ', '    #    ', '   ###   ', '  #####  '],
    shield: [' ####### ', '#ooooooo#', '#o#o#oo#', '#o#o#oo#', '#ooooooo#', '#o9o9oo#'.replace(/9/g, '#') + ' ', ' #ooooo# ', '  #ooo#  ', '   ###   '],
    tower:  ['   ##    ', '   ##    ', '  #oo#   ', '  #o## ##', '  #oo# #o', '  #o## #o', '##ooo# #o', '#oo##o##o', '#########'],
    anchor: ['   ###   ', '   # #   ', '   ###   ', ' ####### ', '    #    ', '    #    ', '#   #   #', ' #  #  # ', '  #####  '],
    car:    ['         ', '  #####  ', ' #oo#oo# ', '#########', '#o#####o#', '#########', ' ##   ## ', ' ##   ## ', '         '],
    wrench: ['      ## ', '     # o#', '     #o# ', '    ###  ', '   ###   ', '  ###    ', ' ###     ', '###      ', '##       '],
    house:  ['    #    ', '   ###   ', '  #####  ', ' ####### ', '#########', ' #ooo##o ', ' #o#o##o ', ' #o#o### ', ' ####### '],
    trophy: ['#########', '#o#####o#', ' o#####o ', '  #####  ', '   ###   ', '    #    ', '    #    ', '  #####  ', ' ####### ']
  };
  var DIGITS = { 0: ['###', '# #', '# #', '# #', '###'], 1: [' # ', '## ', ' # ', ' # ', '###'], 2: ['###', '  #', '###', '#  ', '###'], 3: ['###', '  #', '###', '  #', '###'],
    4: ['# #', '# #', '###', '  #', '  #'], 5: ['###', '#  ', '###', '  #', '###'], 6: ['###', '#  ', '###', '# #', '###'], 7: ['###', '  #', '  #', '  #', '  #'], 8: ['###', '# #', '###', '# #', '###'], 9: ['###', '# #', '###', '  #', '###'] };

  // one marker: a rounded 13x13 badge with the icon, a point below, a count
  // bubble and (for the selected / next / boss places) animated extras.
  function drawMarker(c, sx, sy, s, p, info, on, T) {
    var col = info.boss ? [214, 48, 48] : p.go ? [64, 140, 230] : info.street ? [52, 196, 104] : info.n ? [240, 190, 40] : [120, 128, 122];
    var lit = col.map(function (v) { return Math.min(255, v + 60); }), dark = col.map(function (v) { return v * 0.55; });
    function rgb(a) { return 'rgb(' + (a[0] | 0) + ',' + (a[1] | 0) + ',' + (a[2] | 0) + ')'; }
    var bob = on ? Math.round(Math.sin(T * 6) * 1) : 0;
    var x0 = Math.round(sx - 6.5 * s), y0 = Math.round(sy - 17 * s) + bob * s;
    function px(x, y, w, h, cl) { c.fillStyle = cl; c.fillRect(x0 + x * s, y0 + y * s, w * s, h * s); }
    // shadow on the ground
    c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(Math.round(sx - 3 * s), Math.round(sy - s), 6 * s, 2 * s);
    // outline, body with a bevel, point
    px(1, 0, 11, 13, '#0b0d0c'); px(0, 1, 13, 11, '#0b0d0c');
    px(1, 1, 11, 11, rgb(col)); px(1, 1, 11, 1, rgb(lit)); px(1, 1, 1, 11, rgb(lit)); px(1, 11, 11, 1, rgb(dark)); px(11, 1, 1, 11, rgb(dark));
    px(4, 13, 5, 1, '#0b0d0c'); px(5, 14, 3, 1, '#0b0d0c'); px(6, 15, 1, 1, '#0b0d0c'); px(5, 13, 3, 1, rgb(dark)); px(6, 14, 1, 1, rgb(dark));
    // the icon
    var ic = ICONS[p.icon] || ICONS.flag;
    for (var yy = 0; yy < 9; yy++) for (var xx = 0; xx < 9; xx++) {
      var ch = ic[yy].charAt(xx);
      if (ch === '#') px(2 + xx, 2 + yy, 1, 1, '#14110e'); else if (ch === 'o') px(2 + xx, 2 + yy, 1, 1, '#f4f2ea');
    }
    // how many races are here
    if (info.n && !info.boss) {
      var dg = DIGITS[Math.min(9, info.n)];
      px(10, -3, 6, 8, '#0b0d0c'); px(11, -2, 4, 6, '#f4f2ea');
      for (var dy = 0; dy < 5; dy++) for (var dx = 0; dx < 3; dx++) if (dg[dy].charAt(dx) === '#') px(11.5 + dx, -1.5 + dy, 1, 1, '#14110e');
    }
    // boss: a pulsing pixel ring; next race: a bouncing arrow
    if (info.boss) {
      var r = 9 + (T * 8 % 6), a = 1 - (T * 8 % 6) / 6;
      c.globalAlpha = a; c.strokeStyle = '#ff5a4a'; c.lineWidth = s;
      c.strokeRect(Math.round(sx - r * s), Math.round(y0 + 6.5 * s - r * s), Math.round(2 * r * s), Math.round(2 * r * s)); c.globalAlpha = 1;
    }
    if (info.next) {
      var ay = -6 - Math.abs(Math.sin(T * 5)) * 3;
      px(4, ay, 5, 1, '#0b0d0c'); px(5, ay + 1, 3, 1, '#0b0d0c'); px(6, ay + 2, 1, 1, '#0b0d0c');
      px(5, ay, 3, 1, '#ffffff'); px(6, ay + 1, 1, 1, '#ffffff');
    }
    if (on) {
      c.globalAlpha = 0.6 + 0.4 * Math.sin(T * 8); px(-1, -1, 15, 1, '#ffffff'); px(-1, 13, 15, 1, '#ffffff'); px(-1, -1, 1, 15, '#ffffff'); px(13, -1, 1, 15, '#ffffff'); c.globalAlpha = 1;
    }
    return { x: sx, y: y0 + 6.5 * s, r: 9 * s };
  }

  // ---------------------------------------------------------------- view
  // view: { z: zoom 1..4, cx, cy: map point at the centre }
  function clampView(v) {
    v.z = Math.max(1, Math.min(4, v.z));
    var hw = W / 2 / v.z, hh = H / 2 / v.z;
    v.cx = Math.max(hw, Math.min(W - hw, v.cx)); v.cy = Math.max(hh, Math.min(H - hh, v.cy));
    return v;
  }
  DR.cityView = function () { return { z: 1, cx: W / 2, cy: H / 2 }; };
  var DISTRICTS = [['DOWNTOWN', 300, 116], ['EASTSIDE', 440, 34], ['AIRFIELD', 444, 186], ['HARBOR', 196, 128], ['PIXEL ISLAND', 270, 252], ['CANYON', 140, 24], ['THE BAY', 296, 54]];

  DR.drawCityMap = function (canvas, pins, sel, t, view) {
    if (!base) base = build();
    view = clampView(view || DR.cityView());
    // match the canvas to its on-screen size so pixels stay crisp
    var dpr = Math.min(2, globalThis.devicePixelRatio || 1), cw = Math.round((canvas.clientWidth || W * 2) * dpr), ch = Math.round(cw * H / W);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    var c = canvas.getContext('2d'), k = cw / W * view.z;
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#0b1d24'; c.fillRect(0, 0, cw, ch);
    c.drawImage(base, view.cx - W / 2 / view.z, view.cy - H / 2 / view.z, W / view.z, H / view.z, 0, 0, cw, ch);
    function toScreen(x, y) { return [(x - view.cx) * k + cw / 2, (y - view.cy) * k + ch / 2]; }
    var s = Math.max(2, Math.round(cw / 300)), T = t || 0;
    // district names fade in as you zoom
    if (view.z > 1.6) {
      c.globalAlpha = Math.min(0.5, (view.z - 1.6) * 0.6);
      DISTRICTS.forEach(function (dn) { var q = toScreen(dn[1], dn[2]); DR.pixText(c, dn[0], Math.round(q[0] - DR.pixTextW(dn[0], s) / 2), Math.round(q[1]), '#c8d2cc', s); });
      c.globalAlpha = 1;
    }
    var hits = [], label = null;
    DR.CITY.forEach(function (p) {
      var q = toScreen(p.x, p.y), info = pins[p.id] || {};
      var hb = drawMarker(c, q[0], q[1], s, p, info, p.id === sel, T);
      hits.push({ p: p, x: hb.x, y: hb.y, r: hb.r });
      if (p.id === sel) label = { p: p, x: q[0], y: hb.y - 12 * s };
    });
    if (label) {
      var str = label.p.name.toUpperCase(), lw = DR.pixTextW(str, s) + 6 * s, lh = 9 * s;
      var lx = Math.round(Math.max(2, Math.min(cw - lw - 2, label.x - lw / 2))), ly = Math.round(label.y - lh);
      if (ly < 2) ly = Math.round(label.y + 26 * s);
      c.fillStyle = '#0b0d0c'; c.fillRect(lx - s, ly - s, lw + 2 * s, lh + 2 * s);
      c.fillStyle = '#ffd030'; c.fillRect(lx, ly, lw, lh);
      c.fillStyle = '#b08a10'; c.fillRect(lx, ly + lh - s, lw, s);
      DR.pixText(c, str, lx + 3 * s, ly + 2 * s, '#14110e', s);
    }
    canvas._cityHits = hits;
  };

  // which place is under a canvas pixel (device pixels), generous radius
  DR.cityHitScreen = function (canvas, x, y) {
    var best = null, bd = Infinity;
    (canvas._cityHits || []).forEach(function (hb) { var d = Math.hypot(hb.x - x, hb.y - y); if (d < hb.r * 1.6 && d < bd) { bd = d; best = hb.p; } });
    return best;
  };

  // drag to pan, pinch / wheel to zoom, tap to pick. onTap(place or null).
  DR.cityMapControl = function (canvas, view, onTap, redraw) {
    var pts = {}, last = null, pinch = null, moved = false, downAt = null;
    canvas.style.touchAction = 'none';
    function dev(e) { var r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * canvas.width, (e.clientY - r.top) / r.height * canvas.height]; }
    function zoomAt(nz, fx, fy) {   // keep the map point under (fx, fy) in place
      var k0 = canvas.width / W * view.z, mx = view.cx + (fx - canvas.width / 2) / k0, my = view.cy + (fy - canvas.height / 2) / k0;
      view.z = Math.max(1, Math.min(4, nz));
      var k1 = canvas.width / W * view.z;
      view.cx = mx - (fx - canvas.width / 2) / k1; view.cy = my - (fy - canvas.height / 2) / k1;
      clampView(view); redraw();
    }
    canvas.addEventListener('pointerdown', function (e) {
      pts[e.pointerId] = dev(e); last = dev(e); moved = false; downAt = dev(e);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      var ids = Object.keys(pts);
      if (ids.length === 2) { var a = pts[ids[0]], b = pts[ids[1]]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: view.z, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; moved = true; }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) return;
      pts[e.pointerId] = dev(e);
      var ids = Object.keys(pts);
      if (pinch && ids.length >= 2) { var a = pts[ids[0]], b = pts[ids[1]]; zoomAt(pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / Math.max(1, pinch.d), pinch.m[0], pinch.m[1]); return; }
      var q = dev(e), dx = q[0] - last[0], dy = q[1] - last[1];
      if (!moved && Math.hypot(q[0] - downAt[0], q[1] - downAt[1]) < canvas.width / 80) return;
      moved = true; last = q;
      var k = canvas.width / W * view.z;
      view.cx -= dx / k; view.cy -= dy / k; clampView(view); redraw();
    });
    function up(e) {
      var wasTap = !moved && pts[e.pointerId] && e.type === 'pointerup';
      delete pts[e.pointerId];
      if (Object.keys(pts).length < 2) pinch = null;
      if (wasTap) { var q = dev(e); onTap(DR.cityHitScreen(canvas, q[0], q[1])); }
    }
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', function (e) { e.preventDefault(); var q = dev(e); zoomAt(view.z * (e.deltaY < 0 ? 1.2 : 1 / 1.2), q[0], q[1]); }, { passive: false });
    return { zoomBy: function (f) { zoomAt(view.z * f, canvas.width / 2, canvas.height / 2); }, reset: function () { view.z = 1; view.cx = W / 2; view.cy = H / 2; redraw(); },
      focus: function (p, z) { view.z = Math.max(view.z, z || 2); view.cx = p.x; view.cy = p.y; clampView(view); redraw(); } };
  };
})();
