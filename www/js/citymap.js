// ===========================================================================
// CITY MAP — a dark top-down map of the city for the race menu, styled
// after the Need for Speed Underground 2 world map: dark land, teal water,
// a glowing highway loop and faint street grids. The places on it host the
// races (drag strip, runway, highway, downtown, the docks) or lead to the
// dealer, parts store, home garage and car shows.
// Laid out in 480x270 map units and drawn at 2x (deterministic), with the
// pins drawn on top each frame.
// ===========================================================================
(function () {
  var DR = globalThis.DR;
  var W = 480, H = 270, S = 2;
  DR.CITY_W = W; DR.CITY_H = H;

  // places: x, y = pin position. events: which career event types happen
  // there. go: a screen to open instead.
  DR.CITY = [
    { id: 'strip', name: 'Pixel Dragway', x: 229, y: 234, blurb: 'The prepped quarter mile out on the island: grandstands, a timing tower and full grip.', events: ['quarter', 'eighth', 'sponsor', 'boss'], test: true },
    { id: 'runway', name: 'Airfield Runway', x: 446, y: 160, blurb: 'Knockout night on the old runway. Wide, flat and fast.', events: ['knockout'] },
    { id: 'highway', name: 'Route 99', x: 374, y: 104, blurb: 'Street racers meet on the loop. Bet on yourself.', street: true },
    { id: 'downtown', name: 'Downtown', x: 306, y: 128, blurb: 'Stoplight to stoplight between the towers. Cold asphalt, less grip.', events: ['street'] },
    { id: 'docks', name: 'Harbor Docks', x: 210, y: 166, blurb: 'Invitation-only night races between the container stacks.', events: ['showcase'] },
    { id: 'dealer', name: 'Pixel Motors', x: 270, y: 104, blurb: 'New and used cars.', go: 'Dealer' },
    { id: 'parts', name: 'Parts Store', x: 342, y: 152, blurb: 'Performance parts and quick upgrade packages.', go: 'Shop' },
    { id: 'home', name: 'Your Garage', x: 432, y: 48, blurb: 'Home base.', go: 'Garage' },
    { id: 'shows', name: 'Convention Center', x: 356, y: 64, blurb: 'Car shows: park your build and win over the crowd.', go: 'Shows' }
  ];
  DR.cityPlaceOf = function (evType) {
    for (var i = 0; i < DR.CITY.length; i++) if ((DR.CITY[i].events || []).indexOf(evType) >= 0) return DR.CITY[i];
    return DR.CITY[0];
  };

  // ---------------------------------------------------------------- drawing
  function rnd(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  var base = null;

  // geography, in map units
  var MAINLAND = [[150, -6], [486, -6], [486, 198], [446, 205], [418, 194], [392, 200], [364, 192], [336, 195], [312, 186], [286, 188], [262, 178], [240, 172], [222, 162],
    [204, 154], [186, 150], [170, 138], [158, 120], [144, 110], [126, 102], [116, 86], [122, 68], [108, 54], [96, 40], [100, 22], [118, 8]];
  var BAY = [[266, 46], [290, 34], [322, 40], [334, 56], [318, 72], [292, 77], [272, 70], [260, 58]];
  var ISLAND = [[166, 224], [194, 208], [232, 205], [268, 211], [300, 207], [338, 213], [364, 226], [372, 244], [352, 259], [310, 265], [260, 263], [214, 259], [180, 251], [160, 239]];
  var ISLET = [[40, 150], [60, 140], [80, 148], [76, 164], [52, 168]];
  // the city proper is darker than the hills around it
  var ZONES = [
    [[236, 92], [262, 74], [306, 70], [352, 76], [386, 98], [392, 136], [376, 168], [334, 182], [288, 180], [250, 168], [228, 140]],     // downtown
    [[380, 18], [440, 12], [476, 28], [478, 84], [446, 96], [402, 88], [382, 58]],                                                      // northeast suburbs
    [[396, 140], [476, 138], [478, 188], [440, 196], [404, 180]],                                                                     // airfield
    [[180, 132], [214, 120], [242, 136], [236, 168], [204, 158], [184, 150]],                                                         // docks
    [[176, 226], [234, 210], [300, 212], [352, 226], [360, 246], [312, 258], [230, 254], [178, 246]]                                   // island
  ];
  var LOOP = [[246, 100], [270, 84], [306, 80], [346, 86], [374, 104], [380, 134], [366, 160], [332, 172], [292, 170], [258, 160], [240, 136], [238, 114]];

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
  function shape(c, pts, fill) { c.beginPath(); curve(c, pts, true); c.fillStyle = fill; c.fill(); }
  function road(c, pts, w, col, closed) { c.beginPath(); curve(c, pts, closed); c.lineWidth = w; c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); }
  function inPoly(pts, x, y) {
    var ins = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      if ((pts[i][1] > y) !== (pts[j][1] > y) && x < (pts[j][0] - pts[i][0]) * (y - pts[i][1]) / (pts[j][1] - pts[i][1]) + pts[i][0]) ins = !ins;
    }
    return ins;
  }
  // a wandering suburban street from (x, y)
  function wander(R, x, y, a, steps, len, area) {
    var pts = [[x, y]];
    for (var i = 0; i < steps; i++) {
      a += (R() - 0.5) * 0.7;
      var nx = x + Math.cos(a) * len, ny = y + Math.sin(a) * len;
      if (area && !inPoly(area, nx, ny)) { a += Math.PI * 0.6; continue; }
      x = nx; y = ny; pts.push([x, y]);
    }
    return pts;
  }

  function build() {
    var cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S;
    var c = cv.getContext('2d'), R = rnd(99), i, j;
    c.scale(S, S);
    // ---- sea: deep teal, a touch lighter toward the middle of the map
    var g = c.createRadialGradient(W * 0.45, H * 0.55, 20, W * 0.45, H * 0.55, W * 0.75);
    g.addColorStop(0, '#173843'); g.addColorStop(1, '#0b1d24');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // shallows: a soft lighter rim around every coast
    [[14, 'rgba(60,120,130,0.10)'], [8, 'rgba(70,135,145,0.14)'], [3.5, 'rgba(90,155,160,0.20)']].forEach(function (r) {
      [MAINLAND, ISLAND, ISLET].forEach(function (pts) { c.beginPath(); curve(c, pts, true); c.lineWidth = r[0]; c.strokeStyle = r[1]; c.lineJoin = 'round'; c.stroke(); });
    });
    // ---- land: grey-green hills
    shape(c, MAINLAND, '#353b37'); shape(c, ISLAND, '#353b37'); shape(c, ISLET, '#353b37');
    // terrain: soft lighter ridges in the hills, clipped to the land
    c.save(); c.beginPath(); curve(c, MAINLAND, true); curve(c, ISLAND, true); c.clip();
    for (i = 0; i < 26; i++) {
      var hx = 110 + R() * 140, hy = R() * 110, hr = 10 + R() * 26;
      if (hx > 230 && hy > 60) continue;
      var hg = c.createRadialGradient(hx, hy, 0, hx, hy, hr);
      hg.addColorStop(0, 'rgba(78,88,80,0.35)'); hg.addColorStop(1, 'rgba(78,88,80,0)');
      c.fillStyle = hg; c.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
    }
    // the city districts are darker, with soft edges
    c.filter = 'blur(3px)';
    ZONES.forEach(function (z) { shape(c, z, '#1d2120'); });
    c.filter = 'none';
    c.restore();
    // the bay inside the mainland
    [[6, 'rgba(70,135,145,0.16)'], [2.5, 'rgba(90,155,160,0.22)']].forEach(function (r) { c.beginPath(); curve(c, BAY, true); c.lineWidth = r[0]; c.strokeStyle = r[1]; c.stroke(); });
    shape(c, BAY, '#123039');

    // ---- streets
    var STREET = 'rgba(150,158,152,0.55)', LANE = 'rgba(170,178,172,0.8)';
    // downtown: a slightly skewed grid, clipped to the inside of the loop
    c.save(); c.beginPath(); curve(c, LOOP, true); c.clip();
    c.translate(306, 128); c.rotate(-0.28);
    c.strokeStyle = STREET; c.lineWidth = 0.7;
    for (i = -90; i <= 90; i += 8 + Math.floor(R() * 4)) {
      for (j = -70; j < 70; j += 10 + R() * 12) {
        if (R() < 0.12) continue;                                     // a missing block here and there
        var l = 10 + R() * 14;
        c.beginPath(); c.moveTo(i, j); c.lineTo(i + (R() - 0.5) * 1.5, j + l); c.stroke();
      }
    }
    for (j = -70; j <= 70; j += 7 + Math.floor(R() * 4)) {
      for (i = -90; i < 90; i += 12 + R() * 14) {
        if (R() < 0.15) continue;
        var l2 = 12 + R() * 16;
        c.beginPath(); c.moveTo(i, j); c.lineTo(i + l2, j + (R() - 0.5) * 1.5); c.stroke();
      }
    }
    // a couple of curving boulevards and a central plaza
    c.restore();
    road(c, [[262, 150], [290, 138], [318, 120], [350, 110]], 1.2, LANE);
    road(c, [[280, 96], [300, 118], [312, 146], [330, 166]], 1.2, LANE);
    c.beginPath(); c.arc(306, 128, 4, 0, Math.PI * 2); c.fillStyle = 'rgba(170,178,172,0.7)'; c.fill();
    // suburbs: winding streets and cul-de-sacs
    [[ZONES[1], 412, 40, 14], [ZONES[3], 206, 140, 6], [ZONES[4], 300, 236, 12], [ZONES[2], 430, 184, 4]].forEach(function (z) {
      for (i = 0; i < z[3]; i++) {
        var pts = wander(R, z[1] + (R() - 0.5) * 40, z[2] + (R() - 0.5) * 24, R() * 6.28, 3 + Math.floor(R() * 4), 7 + R() * 5, z[0]);
        if (pts.length > 2) road(c, pts, 0.8, STREET);
        var e = pts[pts.length - 1];
        c.beginPath(); c.arc(e[0], e[1], 1.1, 0, Math.PI * 2); c.fillStyle = STREET; c.fill();
      }
    });
    // arterial roads out of the city
    road(c, [[402, 88], [420, 70], [430, 48], [452, 30]], 1.1, LANE);
    road(c, [[392, 64], [416, 60], [446, 66], [470, 60]], 0.9, STREET);
    road(c, [[214, 122], [222, 140], [214, 156], [200, 160]], 0.9, STREET);
    road(c, [[260, 210], [240, 222], [206, 232], [186, 240]], 1.0, LANE);
    road(c, [[300, 226], [330, 236], [350, 244]], 0.9, STREET);
    // the canyon run: a switchback road up into the hills
    var canyon = [[186, 62]];
    for (i = 1; i <= 16; i++) { var t = i / 16; canyon.push([186 - t * 74 + Math.sin(t * 19) * 9, 62 - t * 48 + Math.cos(t * 23) * 7]); }
    road(c, canyon, 1.1, 'rgba(160,168,162,0.75)');
    road(c, [[150, 40], [140, 64], [146, 88], [158, 104]], 0.9, STREET);

    // ---- landmarks: plain light-grey footprints, like the shops on the NFSU2 map
    var LM = '#7d847f';
    function block(x, y, w, h, a) { c.save(); c.translate(x, y); c.rotate(a || 0); c.fillStyle = LM; c.fillRect(-w / 2, -h / 2, w, h); c.restore(); }
    // drag strip: twin lanes, start and finish, grandstand
    c.save(); c.translate(229, 234); c.rotate(-0.06);
    c.fillStyle = '#8d9590'; c.fillRect(-34, -3, 68, 6); c.fillStyle = '#1d2120'; c.fillRect(-34, -0.3, 68, 0.6);
    c.fillStyle = '#e8ece8'; c.fillRect(-34, -3, 1, 6); c.fillRect(31, -3, 1, 6);
    c.fillStyle = LM; c.fillRect(-20, -9, 30, 4); c.fillRect(-38, 5, 10, 7);
    c.restore();
    // airfield: runway with markings, taxiway and apron
    c.save(); c.translate(446, 160); c.rotate(-0.12);
    c.fillStyle = '#8d9590'; c.fillRect(-34, -4, 68, 8);
    c.fillStyle = '#c9cec9'; for (i = -30; i < 30; i += 6) c.fillRect(i, -0.4, 3, 0.8);
    c.fillStyle = LM; c.fillRect(-26, 8, 52, 2); c.fillRect(-12, 10, 20, 8); c.fillRect(12, 11, 6, 6);
    c.restore();
    // docks: piers and container yards
    for (i = 0; i < 4; i++) block(196 + i * 7, 172 + i * 3, 2.5, 10, 0.35);
    block(214, 156, 12, 5, 0.35); block(224, 160, 8, 4, 0.35);
    // dealer lot, parts store, convention center, home
    block(270, 112, 12, 6, -0.28); block(342, 160, 10, 6, -0.28); block(356, 72, 18, 9, -0.1); block(432, 56, 5, 4, 0.2);

    // ---- highways: the white loop, its cross-town link and the spurs, with a soft glow
    var HW = [
      [LOOP, 3.2, true],
      [[[270, 84], [292, 112], [314, 146], [332, 172]], 2.2],
      [[[246, 100], [226, 86], [204, 74], [186, 62]], 2.4],
      [[[332, 172], [328, 192], [318, 212], [298, 226], [268, 232]], 2.4],
      [[[380, 134], [408, 142], [430, 150]], 2.2],
      [[[374, 104], [392, 92], [404, 86]], 2.0]
    ];
    c.save(); c.shadowColor = 'rgba(255,255,255,0.55)'; c.shadowBlur = 6;
    HW.forEach(function (h) { road(c, h[0], h[1] + 1.4, 'rgba(255,255,255,0.18)', h[2]); });
    c.restore();
    HW.forEach(function (h) { road(c, h[0], h[1], '#f2f4f2', h[2]); });
    // the bridge to the island: railings over the water
    road(c, [[331, 184], [328, 194], [323, 204]], 0.5, 'rgba(30,40,40,0.9)');
    return cv;
  }

  DR.drawCityMap = function (canvas, pins, sel, t) {
    if (!base) base = build();
    if (canvas.width !== W * S) { canvas.width = W * S; canvas.height = H * S; }
    var c = canvas.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(base, 0, 0);
    c.imageSmoothingEnabled = false;
    var T = t || 0, label = null;
    DR.CITY.forEach(function (p) {
      var info = pins[p.id] || {}, on = p.id === sel;
      var col = info.boss ? '#ff4040' : p.go ? '#4aa8ff' : info.street ? '#3ee07a' : info.n ? '#ffd030' : '#8a918c';
      var x = p.x * S, y = p.y * S, r = 15;
      // pulse rings: the selected place, and your next race
      if (on || info.next || info.boss) {
        var ph = (T * (on ? 0.9 : 0.6)) % 1;
        c.beginPath(); c.arc(x, y, r + 2 + ph * 14, 0, Math.PI * 2);
        c.strokeStyle = on ? 'rgba(255,255,255,' + (0.8 * (1 - ph)) + ')' : col; c.globalAlpha = on ? 1 : 0.7 * (1 - ph);
        c.lineWidth = 2; c.stroke(); c.globalAlpha = 1;
      }
      // a glowing dot with a dark rim
      c.save(); c.shadowColor = col; c.shadowBlur = on ? 16 : 10;
      c.beginPath(); c.arc(x, y, r + 2, 0, Math.PI * 2); c.fillStyle = '#0c0e0d'; c.fill();
      c.restore();
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = col; c.fill();
      c.beginPath(); c.arc(x - 7, y - 7, 3, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,0.4)'; c.fill();
      var glyph = info.boss ? '!' : info.next ? '*' : info.street ? '$' : info.n ? String(Math.min(9, info.n)) : p.go === 'Dealer' ? 'D' : p.go === 'Shop' ? 'P' : p.go === 'Garage' ? 'H' : p.go === 'Shows' ? 'S' : '';
      if (glyph) DR.pixText(c, glyph, x - 4, y - 7, '#0c0e0d', 3);
      if (on) label = p;
    });
    if (label) {
      var str = label.name.toUpperCase(), w = DR.pixTextW(str, 3) + 18, lx = Math.max(4, Math.min(W * S - w - 4, label.x * S - (w >> 1)));
      var ly = label.y * S - 60 < 4 ? label.y * S + 26 : label.y * S - 60;
      c.fillStyle = 'rgba(8,10,9,0.9)'; c.fillRect(lx, ly, w, 29);
      c.strokeStyle = '#ffd030'; c.lineWidth = 2; c.strokeRect(lx + 1, ly + 1, w - 2, 27);
      DR.pixText(c, str, lx + 9, ly + 7, '#ffd030', 3);
    }
  };
  // which place is near map point (x, y), in map units
  DR.cityHit = function (x, y) {
    var best = null, bd = 16 * 16;
    DR.CITY.forEach(function (p) { var d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y); if (d < bd) { bd = d; best = p; } });
    return best;
  };
})();
