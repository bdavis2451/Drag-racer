// ===========================================================================
// CITY MAP — a top-down pixel-art map of the city for the race menu. The
// places on it host the races (drag strip, runway, highway, downtown, the
// docks) or lead to the dealer, parts store, home garage and car shows.
// Drawn once at 320x180 (deterministic), then pins are drawn on top.
// Light comes from the top left; buildings cast short shadows down-right.
// ===========================================================================
(function () {
  var DR = globalThis.DR;
  var W = 320, H = 180;
  DR.CITY_W = W; DR.CITY_H = H;

  // places: x, y = pin position. events: which career event types happen
  // there. go: a screen to open instead.
  DR.CITY = [
    { id: 'strip', name: 'Pixel Dragway', x: 66, y: 118, blurb: 'The prepped quarter mile: grandstands, a timing tower and full grip.', events: ['quarter', 'eighth', 'sponsor', 'boss'], test: true },
    { id: 'runway', name: 'Airfield Runway', x: 248, y: 16, blurb: 'Knockout night on the old runway. Wide, flat and fast.', events: ['knockout'] },
    { id: 'highway', name: 'Route 99', x: 112, y: 32, blurb: 'Street racers meet at the on-ramp. Bet on yourself.', street: true },
    { id: 'downtown', name: 'Downtown', x: 196, y: 70, blurb: 'Stoplight to stoplight between the towers. Cold asphalt, less grip.', events: ['street'] },
    { id: 'docks', name: 'Harbor Docks', x: 268, y: 148, blurb: 'Invitation-only night races between the container stacks.', events: ['showcase'] },
    { id: 'dealer', name: 'Pixel Motors', x: 118, y: 108, blurb: 'New and used cars.', go: 'Dealer' },
    { id: 'parts', name: 'Parts Store', x: 172, y: 108, blurb: 'Performance parts and quick upgrade packages.', go: 'Shop' },
    { id: 'home', name: 'Your Garage', x: 40, y: 64, blurb: 'Home base.', go: 'Garage' },
    { id: 'shows', name: 'Convention Center', x: 286, y: 82, blurb: 'Car shows: park your build and win over the crowd.', go: 'Shows' }
  ];
  DR.cityPlaceOf = function (evType) {
    for (var i = 0; i < DR.CITY.length; i++) if ((DR.CITY[i].events || []).indexOf(evType) >= 0) return DR.CITY[i];
    return DR.CITY[0];
  };

  // ---------------------------------------------------------------- drawing
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function dith(x, y) { return BAYER[(y & 3) * 4 + (x & 3)] / 16; }
  function rnd(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  var base = null;

  function build() {
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var c = cv.getContext('2d'), R = rnd(2024);
    function px(x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
    // ---- ground: grass with a dithered two-tone texture
    var img = c.createImageData(W, H), d = img.data;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var n = (Math.sin(x * 0.21 + y * 0.13) + Math.sin(x * 0.07 - y * 0.19)) * 0.25 + 0.5;
      var col = n + dith(x, y) * 0.5 > 0.78 ? [86, 142, 70] : n + dith(x, y) * 0.5 > 0.42 ? [74, 128, 62] : [64, 114, 56];
      var i = (y * W + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
    // ---- the bay (bottom right) with a sandy shore and wave glints
    function inWater(x, y) { return y > 182 - (x - 186) * 0.62 + Math.sin(x * 0.09) * 4 && x > 150; }
    for (y = 0; y < H; y++) for (x = 150; x < W; x++) {
      if (!inWater(x, y)) { if (inWater(x + 2, y + 2) || inWater(x + 1, y + 3)) { i = (y * W + x) * 4; d[i] = 196; d[i + 1] = 180; d[i + 2] = 128; } continue; }
      var deep = inWater(x - 10, y - 10);
      i = (y * W + x) * 4;
      var wv = (x * 3 + y * 7) % 23 === 0 || ((x + y * 2) % 31 === 0);
      var wc = wv ? [120, 178, 214] : deep ? (dith(x, y) > 0.5 ? [36, 92, 150] : [40, 98, 158]) : [52, 118, 176];
      d[i] = wc[0]; d[i + 1] = wc[1]; d[i + 2] = wc[2];
    }
    c.putImageData(img, 0, 0);

    // ---- helpers: roads, buildings, trees
    function road(x, y, w, h, horiz, lanes) {
      px(x, y, w, h, '#3a3c42');
      px(x, y, horiz ? w : 1, horiz ? 1 : h, '#4e5058'); px(horiz ? x : x + w - 1, horiz ? y + h - 1 : y, horiz ? w : 1, horiz ? 1 : h, '#2a2b30');
      if (horiz) for (var k = x + 2; k < x + w - 3; k += 7) px(k, y + (h >> 1), 3, 1, lanes ? '#e8e8e8' : '#d8b234');
      else for (var j = y + 2; j < y + h - 3; j += 7) px(x + (w >> 1), j, 1, 3, lanes ? '#e8e8e8' : '#d8b234');
    }
    function shadow(x, y, w, h, k) { c.fillStyle = 'rgba(10,20,10,' + (0.32 * (k || 1)) + ')'; c.fillRect(x + 2, y + 2, w, h); }
    function building(x, y, w, h, roof, tall) {
      var s = tall ? 4 : 2;
      c.fillStyle = 'rgba(10,18,12,0.35)'; c.fillRect(x + s, y + s, w, h);
      px(x, y, w, h, roof);
      px(x, y, w, 1, shadeHex(roof, 0.3)); px(x, y, 1, h, shadeHex(roof, 0.18));
      px(x, y + h - 1, w, 1, shadeHex(roof, -0.35)); px(x + w - 1, y, 1, h, shadeHex(roof, -0.25));
      // rooftop kit: AC boxes and vents
      if (w > 7 && h > 6) { px(x + 2, y + 2, 2, 2, '#cfd3da'); px(x + 2, y + 4, 2, 1, '#7d828c'); if (w > 12) { px(x + w - 5, y + h - 5, 3, 2, '#9aa0aa'); } }
      if (tall) { px(x + 1, y + 1, w - 2, 1, shadeHex(roof, 0.45)); for (var k2 = x + 3; k2 < x + w - 3; k2 += 4) px(k2, y + h - 3, 2, 1, '#ffe9a0'); }
    }
    function tree(x, y, r2) {
      c.fillStyle = 'rgba(8,24,8,0.35)'; c.beginPath(); c.arc(x + 1.5, y + 1.5, r2, 0, 7); c.fill();
      for (var yy = -r2; yy <= r2; yy++) for (var xx = -r2; xx <= r2; xx++) {
        var dd = xx * xx + yy * yy; if (dd > r2 * r2 + r2 * 0.6) continue;
        px(x + xx, y + yy, 1, 1, xx + yy < -r2 * 0.5 ? '#5fae4c' : xx + yy > r2 * 0.7 ? '#245c26' : '#3a8a38');
      }
    }
    function sign(x, y, text, bg, fg) {
      var w = DR.pixTextW(text) + 4;
      px(x - 1, y - 1, w + 2, 9, '#101014'); px(x, y, w, 7, bg); DR.pixText(c, text, x + 2, y + 1, fg);
    }

    // ---- highway: a sweeping 4-lane road along the top with a median
    for (x = 0; x < W; x++) {
      var hy = Math.round(30 + Math.sin(x * 0.012 + 0.4) * 8 - (x > 220 ? (x - 220) * 0.05 : 0));
      px(x, hy - 1, 1, 13, '#2e3036');
      px(x, hy, 1, 11, '#3d3f46');
      if (x % 8 < 4) { px(x, hy + 3, 1, 1, '#e6e6e6'); px(x, hy + 8, 1, 1, '#e6e6e6'); }
      px(x, hy + 5, 1, 1, '#b8a040'); px(x, hy + 6, 1, 1, '#6a6c72');                   // median barrier
      px(x, hy - 2, 1, 1, '#7a7c84'); px(x, hy + 12, 1, 1, '#22242a');               // guard rails
    }
    // ---- streets: the avenue north-south, cross street, ring roads
    road(146, 40, 9, 140, false); road(0, 92, 300, 9, true); road(0, 142, 150, 7, true);
    road(250, 40, 7, 62, false); road(26, 40, 7, 54, false); road(155, 120, 95, 7, true);
    // on-ramp curling up to the highway at the pin
    for (var t = 0; t < 1; t += 0.01) { var rx = 112 + Math.cos(t * 3.1) * 14, ry = 52 - Math.sin(t * 3.1) * 10; px(Math.round(rx), Math.round(ry), 5, 5, '#3d3f46'); }
    px(108, 38, 9, 14, '#3d3f46');

    // ---- airfield (top right): runway with numbers and threshold bars,
    // a taxiway, hangars and the tower
    px(176, 2, 140, 22, '#5c7a4a');
    px(184, 9, 128, 12, '#4a4c52'); px(184, 9, 128, 1, '#5e6068'); px(184, 20, 128, 1, '#36383d');
    for (x = 192; x < 304; x += 8) px(x, 15, 4, 1, '#eeeeee');
    for (var k3 = 0; k3 < 4; k3++) { px(186, 11 + k3 * 2, 4, 1, '#eeeeee'); px(306, 11 + k3 * 2, 4, 1, '#eeeeee'); }
    DR.pixText(c, '09', 192, 11, '#e0e0e0'); DR.pixText(c, '27', 296, 11, '#e0e0e0');
    px(184, 21, 70, 3, '#55575d');
    building(186, 24, 14, 9, '#a8b0bc'); building(202, 24, 14, 9, '#a8b0bc');
    building(220, 25, 5, 5, '#d0d4da', true); px(221, 26, 3, 2, '#5ad0ff');
    // a parked plane
    px(232, 12, 16, 2, '#f0f2f6'); px(238, 7, 3, 12, '#e0e4ea'); px(232, 11, 2, 4, '#e0e4ea'); px(246, 12, 2, 2, '#d23a3a');

    // ---- downtown (north-east of the crossroads): towers and blocks
    var blocks = [[160, 46, 14, 12, '#7f8a9c', 1], [178, 44, 12, 18, '#5d6b80', 1], [194, 48, 16, 10, '#9a8f86', 0], [214, 44, 12, 14, '#6f7c8f', 1],
      [230, 50, 14, 10, '#8a7f74', 0], [160, 62, 10, 12, '#a4978a', 0], [174, 66, 14, 10, '#7c8696', 1], [192, 62, 10, 14, '#5a6474', 1],
      [206, 64, 16, 10, '#958a82', 0], [226, 64, 18, 12, '#6b7688', 1], [160, 78, 12, 10, '#8d8274', 0], [190, 80, 18, 8, '#7d8899', 0], [212, 79, 10, 9, '#a39a90', 0], [228, 80, 16, 8, '#86909e', 1]];
    blocks.forEach(function (b) { building(b[0], b[1], b[2], b[3], b[4], b[5]); });
    px(172, 44, 1, 46, '#3a3c42'); px(188, 44, 1, 46, '#3a3c42'); px(204, 44, 1, 46, '#3a3c42'); px(224, 44, 1, 46, '#3a3c42');

    // ---- convention center (east): big white roof with skylights
    building(262, 70, 34, 22, '#dfe3e8');
    for (x = 266; x < 292; x += 6) px(x, 74, 3, 14, '#9fc4e0');
    px(262, 94, 34, 6, '#4a4c52'); for (x = 264; x < 294; x += 4) px(x, 95, 2, 4, ['#d23a3a', '#3a7bd2', '#efe14b', '#f4f4f4'][(x >> 2) % 4]);

    // ---- residential west side: houses and trees, your garage
    for (var hx = 4; hx < 140; hx += 13) for (var hyy = 48; hyy < 88; hyy += 14) {
      if (hx > 22 && hx < 38) continue;
      if (R() < 0.75) building(hx + Math.floor(R() * 2), hyy + Math.floor(R() * 2), 8, 7, ['#a0503c', '#8a5a44', '#6e6a74', '#b06a4a', '#5a6a78'][Math.floor(R() * 5)]);
      else tree(hx + 4, hyy + 4, 3);
    }
    building(34, 58, 14, 11, '#c9a24a'); px(36, 68, 10, 3, '#2a2c32'); px(37, 69, 8, 1, '#f0c040');   // your garage

    // ---- dealership: showroom, flags, rows of cars on the lot
    building(100, 102, 18, 9, '#e8ecf2'); px(100, 102, 18, 2, '#d23a3a');
    var lotCols = ['#d23a3a', '#3a7bd2', '#f4f4f4', '#151515', '#efe14b', '#2fb3a8', '#ff7a00'];
    px(100, 113, 44, 16, '#55575d');
    for (var lr = 0; lr < 2; lr++) for (var lc = 0; lc < 7; lc++) { var cx2 = 102 + lc * 6, cy2 = 115 + lr * 7; px(cx2, cy2, 4, 5, lotCols[(lc + lr * 3) % 7]); px(cx2 + 1, cy2 + 1, 2, 2, '#1d2a3a'); }
    for (var fg = 0; fg < 3; fg++) { px(121 + fg * 7, 101, 1, 6, '#c8c8c8'); px(122 + fg * 7, 101, 3, 2, ['#d23a3a', '#ffcc00', '#3a7bd2'][fg]); }

    // ---- parts store: a long box store with a big sign and a lot
    building(160, 101, 24, 14, '#c7c0b4'); px(160, 101, 24, 3, '#e05a14');
    px(186, 102, 12, 13, '#55575d'); for (var pl = 104; pl < 114; pl += 3) px(188, pl, 8, 1, '#d8d8d8');

    // ---- the dragway (south-west): two lanes, timing tower, grandstands,
    // the tree, return road, parking
    px(6, 104, 140, 36, '#5f8f4c');
    px(10, 120, 132, 10, '#55575d'); px(10, 124, 132, 2, '#3f4146');                  // the strip, lane divider
    px(10, 120, 132, 1, '#6c6e76'); px(10, 129, 132, 1, '#2e3035');
    for (x = 14; x < 138; x += 2) { px(x, 120, 1, 1, '#e6e6e6'); px(x, 129, 1, 1, '#e6e6e6'); }   // lane lines
    px(22, 120, 1, 10, '#f4f4f4'); px(128, 120, 1, 10, '#f4f4f4');                     // start / finish
    px(13, 121, 2, 8, '#2a2c32'); px(14, 121, 1, 2, '#ffcc00'); px(14, 124, 1, 2, '#ffcc00'); px(14, 127, 1, 1, '#2bd45a');   // the tree
    building(24, 108, 60, 7, '#8a93a2'); for (x = 26; x < 82; x += 3) px(x, 109, 2, 4, ['#d23a3a', '#3a7bd2', '#efe14b', '#f4f4f4', '#7cd320'][(x / 3) % 5 | 0]);   // grandstand crowd
    building(88, 109, 7, 6, '#c8ccd4', true); px(89, 110, 5, 2, '#5ad0ff');               // timing tower
    px(10, 132, 132, 4, '#4a4c52');                                                     // return road
    px(96, 108, 40, 9, '#4a4c52'); for (var pk = 0; pk < 6; pk++) px(98 + pk * 6, 110, 4, 5, lotCols[(pk + 2) % 7]);

    // ---- harbor docks: piers, container stacks, a crane, a ship
    px(226, 128, 70, 14, '#7a7468');
    for (var pr = 0; pr < 3; pr++) px(236 + pr * 20, 142, 8, 22, '#8a8272');
    var cc = ['#c8402c', '#2c6ea8', '#e0a020', '#3a8a48', '#9a4ab0'];
    for (var cy3 = 0; cy3 < 2; cy3++) for (var cx3 = 0; cx3 < 7; cx3++) { var col3 = cc[(cx3 * 3 + cy3) % 5]; shadow(230 + cx3 * 9, 130 + cy3 * 5, 8, 4, 0.6); px(230 + cx3 * 9, 130 + cy3 * 5, 8, 4, col3); px(230 + cx3 * 9, 130 + cy3 * 5, 8, 1, shadeHex(col3, 0.3)); }
    px(288, 118, 2, 26, '#e0a020'); px(278, 118, 22, 2, '#e0a020'); px(282, 120, 1, 6, '#30323a');
    px(246, 160, 40, 9, '#2a2c34'); px(248, 161, 36, 3, '#c8402c'); px(278, 158, 6, 4, '#e8e8e8');

    // ---- parks and street trees
    [[60, 22], [70, 18], [140, 20], [8, 100], [150, 166], [120, 160], [30, 160], [60, 162], [90, 168], [20, 170], [252, 108], [300, 106], [134, 62], [300, 54]].forEach(function (t2) { tree(t2[0], t2[1], 3); });
    for (x = 4; x < 140; x += 9) tree(x, 154 + (x % 3), 2);
    // a pond in the park
    c.fillStyle = '#3a7ab8'; c.beginPath(); c.ellipse(90, 158, 10, 5, 0, 0, 7); c.fill(); px(84, 156, 3, 1, '#8ac4e8');
    return cv;
  }
  function shadeHex(h, k) {
    var c = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    c = c.map(function (v) { return Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)))); });
    return 'rgb(' + c.join(',') + ')';
  }

  // pins: { id: { n, next, boss } }. sel: selected place id.
  DR.drawCityMap = function (canvas, pins, sel, t) {
    if (!base) base = build();
    canvas.width = W; canvas.height = H;
    var c = canvas.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.drawImage(base, 0, 0);
    function px(x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
    DR.CITY.forEach(function (p) {
      var info = pins[p.id] || {}, on = p.id === sel, bob = on ? Math.round(Math.sin((t || 0) * 5)) : 0;
      var col = info.boss ? '#ff3a3a' : p.go ? '#4da3ff' : info.n || info.street ? '#ffcc00' : '#9aa0aa';
      var x = p.x, y = p.y - 14 + bob, hi = info.boss ? '#ff9a9a' : p.go ? '#a8d4ff' : info.n || info.street ? '#fff0a0' : '#d0d4dc';
      // selection ring on the ground
      if (on) { c.strokeStyle = 'rgba(255,255,255,0.85)'; c.setLineDash([2, 2]); c.strokeRect(p.x - 8.5, p.y - 3.5, 17, 7); c.setLineDash([]); }
      px(p.x - 3, p.y - 1, 7, 2, 'rgba(0,0,0,0.35)');
      // map pin: a rounded 9x9 head with the glyph inside, then a point
      px(x - 5, y + 1, 11, 7, '#101014'); px(x - 4, y, 9, 9, '#101014');
      px(x - 4, y + 1, 9, 7, col); px(x - 3, y, 7, 9, '#101014'); px(x - 3, y + 1, 7, 7, col);
      px(x - 3, y + 1, 7, 1, hi); px(x - 4, y + 2, 1, 2, hi);
      px(x - 2, y + 9, 5, 2, '#101014'); px(x - 1, y + 11, 3, 2, '#101014'); px(x - 1, y + 9, 3, 1, col); px(x, y + 10, 1, 2, col);
      var glyph = info.boss ? '!' : info.next ? '*' : info.street ? '$' : info.n ? String(Math.min(9, info.n)) : p.go === 'Dealer' ? 'D' : p.go === 'Shop' ? 'P' : p.go === 'Garage' ? 'H' : p.go === 'Shows' ? 'S' : '';
      if (glyph) DR.pixText(c, glyph, x - 1, y + 2, '#101014');
      if (info.next) { var f = Math.floor((t || 0) * 4) % 2 ? '#ffffff' : '#ffcc00'; px(x + 5, y - 3, 1, 5, f); px(x + 3, y - 1, 5, 1, f); }
      // label when selected
      if (on) {
        var w = DR.pixTextW(p.name.toUpperCase()) + 6, lx = Math.max(1, Math.min(W - w - 1, x - (w >> 1))), ly = y - 10 < 1 ? y + 16 : y - 10;
        px(lx - 1, ly - 1, w + 2, 9, '#101014'); px(lx, ly, w, 7, '#ffcc00'); DR.pixText(c, p.name.toUpperCase(), lx + 3, ly + 1, '#101014');
      }
    });
  };
  // which place is under a canvas pixel (x, y), within a few pixels of its pin
  DR.cityHit = function (x, y) {
    var best = null, bd = 196;
    DR.CITY.forEach(function (p) { var d = (p.x - x) * (p.x - x) + (p.y - 8 - y) * (p.y - 8 - y); if (d < bd) { bd = d; best = p; } });
    return best;
  };
})();
