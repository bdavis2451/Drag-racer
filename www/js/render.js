// ===========================================================================
// RENDER — pixel-art sprites & scene. Everything is drawn onto a small
// low-resolution canvas which CSS scales up with crisp (pixelated) edges.
// ===========================================================================
(function () {
  var DR = globalThis.DR;
  var PPM = 32;                 // pixels per metre
  DR.PPM = PPM;
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

  // ------------------------------------------------------------ body profiles
  // x: 0 (rear bumper) .. 100 (front bumper). y: units above the ground, same
  // scale as x. wr / wf: wheel-centre x. hood: x range of the hood for blowers.
  // These are the generic shapes used by cars without hand-drawn art.
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

  // ------------------------------------------------------------ hand-drawn cars
  // Traced from the real cars' side profiles (same units as BODIES).
  //  win: glass   belt: crease / shoulder line   frame: window trim colour
  //  extra: more body-coloured shapes (wings...)   lower: two-tone lower body
  //  feats: [kind, shape] drawn on top: poly / line (units)
  //  rim: wheel style   head / tail: lamp centres for the lighting
  var ART = {
    // '87-'93 Mustang GT hatch: aero nose, boxy flanks, long sloped hatch
    fox: {
      pts: [[2,5],[0.6,7],[0,10.5],[0.4,15.5],[1.2,19.6],[2.2,20.6],[3.6,20.9],[4.4,20.7],[16,26.6],[22,28.5],[25,28.8],[46.5,28.8],[49,28.2],[63,21.8],[64.5,21.5],[88,19.8],[94,19.1],[97.6,18.2],[99.3,16.6],[100,13.5],[100,8.5],[99,6],[96,4.6],[85,4.4],[25,4.4],[6,4.6]],
      win: [[[33.6,22.4],[33.6,27.8],[46.4,27.8],[60.6,22.2]], [[17.8,23.1],[23,27.1],[25.2,27.8],[31.8,27.8],[31.8,22.4]]],
      frame: [20, 20, 22], belt: 19.8, wr: 21, wf: 76.5, hood: [70, 90], rim: 'turbine', rocker: 4.4,
      feats: [
        ['trim', [[31.8, 22.4], [33.6, 22.4], [33.6, 27.8], [31.8, 27.8]]],
        ['soft', [[0.2, 10.8], [96.5, 10.8], [96.5, 11.9], [0.2, 11.9]]],
        ['head', [[94.2, 16.8], [99.2, 16.5], [99.7, 14.7], [94.2, 14.9]]],
        ['amber', [[92.4, 15], [94.2, 14.9], [94.2, 16.8], [92.4, 16.9]]],
        ['grille', [[97.6, 9.2], [100, 9.2], [100, 10.6], [97.6, 10.6]]],
        ['head', [[98.4, 7], [100, 7], [100, 8.3], [98.4, 8.3]]],
        ['taillouvre', [[0.3, 14.2], [2.7, 14.2], [2.7, 18.9], [1, 18.9]]],
        ['vent', [[29, 5.8], [33.4, 5.8], [33.4, 9.4], [30.4, 8.8]]],
        ['amber', [[88.5, 12.6], [90.5, 12.6], [90.5, 13.5], [88.5, 13.5]]],
        ['trim', [[35.2, 19.5], [37.8, 19.5], [37.8, 20.2], [35.2, 20.2]]],
        ['trim', [[57.6, 22.2], [61, 22.2], [60.2, 24.8], [57.8, 24.4]]],
        ['seam', [[62.6, 21.7], [62.9, 12], [61.6, 5.4]]],
        ['seam', [[33.1, 22.3], [32.7, 12], [33.1, 5.4]]],
        ['seam', [[64.5, 21.5], [86, 19.95]]]
      ],
      head: [99, 15.7], tail: [1.5, 16.5], exhaust: [5, 5.2]
    },
    // 6th-gen Camaro SS: long hood, high belt, gun-slit glass, short deck
    camss: {
      pts: [[2,5.2],[0.4,7.5],[0,11],[0.4,17],[1.4,20.6],[2.6,21.6],[4,22.1],[4.6,22.9],[6,22.8],[13,22.7],[20,24],[26,26.4],[33,27.8],[48,27.9],[52,27],[60.5,23.6],[64,22.9],[80,22.2],[92,21.6],[97.4,20.8],[99.4,19.6],[100,17.4],[100,8.5],[99.4,6.4],[97.5,5],[90,4.4],[10,4.4]],
      win: [[[26.6,23.9],[33.4,27.2],[47.8,27.2],[58.4,23.9]]],
      frame: [16, 16, 18], belt: 21.6, wr: 19.6, wf: 78.4, hood: [70, 88], rim: 'split', rocker: 4.4,
      feats: [
        ['trim', [[31, 23.9], [32, 23.9], [32, 26.6], [31, 26.6]]],
        ['head', [[93.4, 20.2], [99.2, 19.4], [99.7, 18.2], [94, 18.8]]],
        ['grille', [[98.6, 17.6], [100, 17.4], [100, 11.6], [98.8, 11.8]]],
        ['grille', [[96.8, 7], [100, 7.5], [100, 9.6], [97.4, 9.5]]],
        ['tail', [[0.3, 17.4], [3, 17.6], [3.3, 20.4], [1.4, 20.4]]],
        ['trim', [[0.5, 5], [9, 4.6], [9, 7.4], [0.6, 8]]],
        ['vent', [[62.6, 13.4], [66.6, 13.4], [66.6, 16.2], [63.2, 15.9]]],
        ['vent', [[72, 21.1], [80, 20.6], [80, 21.3], [72, 21.8]]],
        ['trim', [[34, 22.4], [36.6, 22.4], [36.6, 23], [34, 23]]],
        ['soft', [[55.6, 24], [59.4, 23.8], [59, 26], [56.2, 25.6]]],
        ['trim', [[24, 4.4], [71, 4.4], [71, 6.4], [24, 6.4]]],
        ['seam', [[59.6, 23.5], [60, 8], [58.4, 6.4]]],
        ['seam', [[30.6, 23.8], [29.2, 12], [30.2, 6.4]]],
        ['seam', [[66, 17.6], [93, 17.2]]]
      ],
      head: [98.5, 19.4], tail: [1.8, 19], exhaust: [3, 5.6]
    },
    // AE86 Trueno: wedge nose with pop-ups, black bumpers, airy greenhouse,
    // panda two-tone
    hachi: {
      pts: [[2,5.6],[0.4,7],[0,9.5],[0,13.6],[0.8,14.4],[1.4,20.4],[2.4,21.4],[3.6,21.7],[15.5,29.3],[19.5,31.2],[22,31.6],[48,31.8],[50,31.3],[63.5,23.4],[65,23.1],[92,20.3],[97.8,19.2],[99.2,17.8],[99.6,15.2],[100,13.6],[100,8],[99,6],[96,5.2],[10,5]],
      win: [[[15,23.6],[19.6,28.8],[22.6,30.3],[31.6,30.4],[31.6,23.7]], [[33.4,23.7],[33.4,30.4],[47.8,30.4],[61.2,23.7]]],
      frame: [18, 18, 20], belt: 20.6, wr: 21.4, wf: 78.5, hood: [70, 90], rim: 'mesh', rocker: 5,
      lower: { y: 12.9, c: [22, 22, 24] },
      feats: [
        ['trim', [[31.6, 23.7], [33.4, 23.7], [33.4, 30.4], [31.6, 30.4]]],
        ['bumper', [[0, 6.2], [5.2, 6], [5.2, 13.9], [0, 13.7]]],
        ['bumper', [[95.2, 6], [99, 6.4], [100, 8], [100, 13.8], [95.2, 13.8]]],
        ['bumper', [[5, 12.6], [95.4, 12.6], [95.4, 13.6], [5, 13.6]]],
        ['amber', [[98.2, 10], [100, 10], [100, 11.8], [98.2, 11.8]]],
        ['amber', [[96.6, 15.2], [99.4, 15.2], [99.3, 16.8], [96.6, 16.8]]],
        ['seam', [[86.5, 20.9], [86.5, 19.6], [96.8, 18.6]]],
        ['tail', [[0.9, 15.1], [3, 15.1], [3, 19.7], [1.4, 19.7]]],
        ['trim', [[34.6, 21.2], [37.2, 21.2], [37.2, 21.9], [34.6, 21.9]]],
        ['trim', [[58.2, 23.7], [61.6, 23.7], [61, 26.4], [58.4, 25.8]]],
        ['trim', [[1.4, 20.4], [3.6, 21.7], [5.2, 22.9], [1.2, 21.2]]],
        ['seam', [[62.6, 23.4], [63, 13.8]]],
        ['seam', [[32.5, 23.6], [32.3, 13.8]]]
      ],
      head: [99, 16], tail: [2, 17.4], exhaust: [5.5, 5.6]
    },
    // A80 Supra: long rounded nose, bubble roof, hoop wing
    supra: {
      pts: [[3,5.4],[0.6,7.2],[0,10.5],[0.3,14.5],[1.2,17.6],[3,19.2],[8,20],[16,20.6],[22,22.4],[28,26.2],[33,27.8],[37,28.3],[45,28.1],[49,27.2],[58,22.4],[62,21.2],[74,19.6],[86,17.8],[93,15.8],[97.4,13.6],[99.4,11.2],[100,9],[99.4,6.6],[97,5],[88,4.6],[12,4.6]],
      win: [[[26.2,21.4],[31.4,26.8],[45,26.9],[56,21.7]]],
      extra: [[[4.2,19.6],[7.2,19.6],[8.2,25.2],[5.6,25.2]], [[13.4,20.2],[16.4,20.3],[17,25.2],[14.6,25.2]], [[0.4,24.6],[18,24.8],[19,26.4],[17.6,27.4],[1.6,27.6],[0,26.4]]],
      frame: [18, 18, 20], belt: 17.6, wr: 21, wf: 77.7, hood: [66, 86], rim: 'five', rocker: 4.6,
      feats: [
        ['trim', [[32.6, 21.5], [33.6, 21.5], [33.6, 26.8], [32.6, 26.8]]],
        ['head', [[87.6, 16.6], [94.6, 14.9], [96.2, 13.6], [88.6, 15.3]]],
        ['grille', [[96.4, 8.8], [100, 9.4], [100, 7], [97, 6.6]]],
        ['amber', [[97.4, 10.4], [99.2, 10.6], [99, 11.6], [97.4, 11.4]]],
        ['tail', [[0.3, 14], [2.4, 14.4], [2.7, 17.4], [1, 17.2]]],
        ['trim', [[1, 5.6], [10, 5], [10, 6.6], [1, 7.4]]],
        ['trim', [[33.8, 19.6], [36.4, 19.6], [36.4, 20.3], [33.8, 20.3]]],
        ['soft', [[52.4, 22], [56, 22], [55.2, 24.4], [52.8, 24]]],
        ['seam', [[57, 22], [57.5, 10], [56, 6]]],
        ['seam', [[29.6, 21.6], [28.2, 12], [29, 6]]],
        ['seam', [[62, 21.2], [80, 18.7]]]
      ],
      head: [95, 15], tail: [1.5, 15.7], exhaust: [3.5, 5.8]
    }
  };
  DR.CAR_ART = ART;

  function inPoly(pts, x, y) {
    var c = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }

  // 4x4 ordered dither: smooth gradients with crisp pixels
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  var LEVELS = []; for (var lv = -0.8; lv < 0.66; lv += 0.055) LEVELS.push(lv);
  function dq(s, px, py) {
    if (s <= LEVELS[0]) return LEVELS[0];
    for (var i = 0; i < LEVELS.length - 1; i++) {
      if (s < LEVELS[i + 1]) {
        var f = (s - LEVELS[i]) / (LEVELS[i + 1] - LEVELS[i]);
        return f * 16 > BAYER[(py & 3) * 4 + (px & 3)] + 0.5 ? LEVELS[i + 1] : LEVELS[i];
      }
    }
    return LEVELS[LEVELS.length - 1];
  }
  var SKY = [226, 236, 255], DEEP = [8, 9, 16];
  // paint under light: positive -> sky reflection, negative -> shadow
  function lit(c, s) {
    if (s >= 0) return [c[0] + (SKY[0] - c[0]) * s | 0, c[1] + (SKY[1] - c[1]) * s | 0, c[2] + (SKY[2] - c[2]) * s | 0];
    s = -s; return [c[0] + (DEEP[0] - c[0]) * s | 0, c[1] + (DEEP[1] - c[1]) * s | 0, c[2] + (DEEP[2] - c[2]) * s | 0];
  }

  // ------------------------------------------------------------ car sprite
  // look = {carId, color, stripe, rim, tireR, frontR, blower, wing, bar}
  var spriteCache = {};
  DR.carLook = function (inst) {
    var car = DR.CARS[inst.carId] || DR.CARS_RESERVE[inst.carId];
    var fi = DR.partId('fi', inst), fiu = DR.FI[fi];
    var aero = DR.partId('aero', inst);
    var tire = DR.TIRES[DR.partId('rtires', inst)];
    return {
      carId: inst.carId, body: car.body, len: car.len,
      color: inst.color || car.col, stripe: inst.stripe || '', rim: inst.rim || '#c8c8c8',
      tireR: tire.r, frontR: car.body === 'dragster' ? 0.24 : DR.partId('ftires', inst) !== 'stock' ? 0.30 : DR.TIRES[car.tire].r,
      slick: tire.kind === 'Slick', radial: tire.kind === 'Drag Radial',
      blower: !!(fiu.price && (fiu.type === 'roots' || fiu.type === 'screw')),
      scoop: !!(fiu.price && fiu.type === 'turbo' && fiu.flow > 1000),
      wing: aero === 'a2' ? 2 : aero === 'a1' ? 1 : 0,
      bar: DR.partId('wheeliebar', inst) !== 'stock'
    };
  };

  function artFor(look) {
    if (ART[look.carId]) return ART[look.carId];
    var B = BODIES[look.body] || BODIES.coupe, minW = 99;
    B.win.forEach(function (p) { if (p[1] < minW) minW = p[1]; });
    var maxY = 0; B.pts.forEach(function (p) { if (p[1] > maxY) maxY = p[1]; });
    return { pts: B.pts, win: B.win.length ? [B.win] : [], belt: B.win.length ? minW - 1.5 : maxY * 0.7, wr: B.wr, wf: B.wf, hood: B.hood,
      head: B.rail ? null : [98.5, 14], tail: [1, B.rail ? 10 : 15], exhaust: [1, 6], rim: 'five', rocker: 7, rail: B.rail, helmet: B.head,
      frame: null, feats: B.rail ? [] : [['head', [[96.5, 13.2], [99.6, 13.2], [99.6, 14.8], [96.5, 14.8]]], ['tail', [[0, 14.4], [2.2, 14.4], [2.2, 16.2], [0, 16.2]]]] };
  }

  DR.carSprite = function (look) {
    var key = JSON.stringify(look);
    if (spriteCache[key]) return spriteCache[key];
    var A = artFor(look);
    var lenPx = Math.round(look.len * PPM);
    var u = lenPx / 100;
    var maxY = 0;
    A.pts.concat.apply(A.pts, A.extra || []).forEach(function (p) { if (p[1] > maxY) maxY = p[1]; });
    var padL = 8, padT = 26;
    var W = lenPx + padL + 6, H = Math.ceil(maxY * u) + padT + 2;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    var img = ctx.createImageData(W, H), d = img.data;
    var base = hexToRgb(look.color);
    var stripe = look.stripe ? hexToRgb(look.stripe) : null;
    var groundY = H - 1;
    var unitM = look.len / 100;
    var rR = look.tireR * PPM, rF = look.frontR * PPM;
    var stockR = 0.31 * PPM;
    var wheelR = { x: padL + A.wr * u, y: groundY - rR, r: rR };
    var wheelF = { x: padL + A.wf * u, y: groundY - rF, r: rF };
    var archR = { x: wheelR.x, y: groundY - stockR, r: Math.max(stockR, rR * 0.92) + 2.6 };
    var archF = { x: wheelF.x, y: groundY - stockR, r: Math.max(stockR, rF) + 2.6 };
    function U(px, py) { return [(px - padL + 0.5) / u, (groundY - py + 0.5) / u]; }
    function inArch(px, py, a) { var dx = px + 0.5 - a.x, dy = py + 0.5 - a.y; return dx * dx + dy * dy < a.r * a.r && py + 0.5 > a.y - a.r * 0.95; }
    function put(px, py, c, a) { if (px < 0 || py < 0 || px >= W || py >= H) return; var i = (py * W + px) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a == null ? 255 : a; }

    // mask: 1 body, 2 wheel arch, 3 glass
    var mask = new Uint8Array(W * H), px, py, k;
    for (py = 0; py < H; py++) for (px = 0; px < W; px++) {
      var q = U(px, py), inB = inPoly(A.pts, q[0], q[1]);
      if (!inB && A.extra) for (k = 0; k < A.extra.length && !inB; k++) inB = inPoly(A.extra[k], q[0], q[1]);
      if (!inB) continue;
      if (!A.rail && (inArch(px, py, archR) || inArch(px, py, archF))) { mask[py * W + px] = 2; continue; }
      var g = false;
      for (k = 0; k < A.win.length && !g; k++) g = inPoly(A.win[k], q[0], q[1]);
      mask[py * W + px] = g ? 3 : 1;
    }
    function M(x, y) { return x < 0 || y < 0 || x >= W || y >= H ? 0 : mask[y * W + x]; }
    var solid = function (v) { return v === 1 || v === 3; };
    // top of the body in each column, for surface slope
    var topY = new Int16Array(W).fill(-1);
    for (px = 0; px < W; px++) for (py = 0; py < H; py++) if (solid(M(px, py))) { topY[px] = py; break; }
    function slopeAt(x) {
      var a = topY[Math.max(0, x - 2)], b = topY[Math.min(W - 1, x + 2)];
      if (a < 0 || b < 0) return 9;
      return (b - a) / 4;
    }
    var beltPx = groundY - A.belt * u, rockPx = groundY - (A.rocker || 5) * u;
    var lowerPx = A.lower ? groundY - A.lower.y * u : 9999;
    var minX = W, maxX = 0;
    for (px = 0; px < W; px++) if (topY[px] >= 0) { if (px < minX) minX = px; if (px > maxX) maxX = px; }

    for (py = 0; py < H; py++) for (px = 0; px < W; px++) {
      var mv = M(px, py);
      if (!mv) continue;
      if (mv === 2) {
        // inner fender: lit at the lip, black deep inside
        var dA = Math.min(Math.abs(Math.hypot(px + 0.5 - archR.x, py + 0.5 - archR.y) - archR.r), Math.abs(Math.hypot(px + 0.5 - archF.x, py + 0.5 - archF.y) - archF.r));
        var a2 = dA < 1.2 ? 38 : dA < 2.4 ? 24 : 12;
        put(px, py, [a2, a2, a2 + 3]); continue;
      }
      var up = M(px, py - 1), dn = M(px, py + 1), lf = M(px - 1, py), rt = M(px + 1, py);
      if (mv === 3) {
        // glass: sky reflection on top, darker inside, diagonal glints
        var wTop = !solid(M(px, py - 1)) || M(px, py - 1) !== 3, gy0 = py - topY[px];
        var glint = ((px * 2 + py * 3) % 23) < 3 || ((px * 2 + py * 3 + 9) % 23) === 0;
        var gc = wTop ? [150, 172, 196] : glint ? [96, 120, 150] : [30 + gy0 * 1.2, 42 + gy0 * 1.4, 58 + gy0 * 1.2];
        if (M(px, py + 1) !== 3) gc = [18, 22, 30];
        put(px, py, gc.map(function (v) { return Math.min(255, v | 0); })); continue;
      }
      // window trim
      if (A.frame && (M(px - 1, py) === 3 || M(px + 1, py) === 3 || M(px, py - 1) === 3 || M(px, py + 1) === 3)) {
        put(px, py, (M(px, py + 1) === 3 || M(px + 1, py) === 3) ? A.frame : A.frame.map(function (v) { return v + 26; })); continue;
      }
      var col = base;
      var yU = (groundY - py) / u;
      if (py > lowerPx) col = A.lower.c;
      if (stripe && py <= lowerPx && Math.abs(py - (beltPx + (rockPx - beltPx) * 0.32)) < 2.2 * u) col = stripe;
      var s, sl = slopeAt(px), dTop = py - topY[px];
      var flat = Math.abs(sl) < 0.75;
      if (!solid(up)) s = flat ? 0.6 : 0.42;                       // rim light on the top edge
      else if (dTop <= 2 && flat) s = 0.4 - dTop * 0.1;           // hood / roof / deck catch the sky
      else if (dTop <= 1) s = 0.22;
      else if (py < beltPx - 0.5) s = 0.24 - 0.04 * dTop / 4;      // shoulder above the crease
      else if (py < beltPx + 0.5) s = 0.58;                        // the crease catches a highlight
      else if (py < beltPx + 1.5) s = -0.32;                       // and shades just below
      else {
        var t = Math.min(1, Math.max(0, (py - beltPx) / Math.max(4, rockPx - beltPx)));
        s = 0.12 - 0.14 * t;
        if (t > 0.42) s -= 0.15;                                   // horizon line in the reflection
        if (t > 0.78) s -= (t - 0.78) * 1.6;                       // panel tucks under
      }
      if (px - minX < 2 && solid(up)) s -= 0.18;                   // rear face, away from the light
      if (maxX - px < 2 && solid(up)) s += 0.06;
      // fender lips around the wheel arches
      if (M(px, py + 1) === 2 || M(px - 1, py) === 2 || M(px + 1, py) === 2) s = -0.5;
      else if (M(px, py + 2) === 2) s += 0.2;
      if (!dn || !lf || !rt) { if (solid(up)) s = -0.72; }       // dark outline (except the lit top)
      put(px, py, lit(col, dq(s, px, py)));
    }

    // ---- details on top of the paint
    function polyFill(pts, fn) {
      var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      pts.forEach(function (p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
      var X0 = Math.floor(padL + x0 * u) - 1, X1 = Math.ceil(padL + x1 * u) + 1, Y0 = Math.floor(groundY - y1 * u) - 1, Y1 = Math.ceil(groundY - y0 * u) + 1;
      for (var yy = Math.max(0, Y0); yy <= Math.min(H - 1, Y1); yy++) for (var xx = Math.max(0, X0); xx <= Math.min(W - 1, X1); xx++) {
        var q = U(xx, yy);
        if (!inPoly(pts, q[0], q[1])) continue;
        var e = !inPoly(pts, q[0], q[1] + 1.2 / u), b = !inPoly(pts, q[0], q[1] - 1.2 / u);
        var c = fn(xx, yy, e, b);
        if (c) put(xx, yy, c);
      }
    }
    function polyLine(pts, fn) {
      for (var i = 0; i < pts.length - 1; i++) {
        var ax = padL + pts[i][0] * u, ay = groundY - pts[i][1] * u, bx = padL + pts[i + 1][0] * u, by = groundY - pts[i + 1][1] * u;
        var n = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)));
        for (var j = 0; j <= n; j++) { var xx = Math.round(ax + (bx - ax) * j / n), yy = Math.round(ay + (by - ay) * j / n); if (M(xx, yy) === 1) fn(xx, yy); }
      }
    }
    var PAL = {
      trim: function (x, y, top) { return top ? [62, 64, 70] : [18, 18, 21]; },
      soft: function (x, y, top, bot) { return top ? [96, 98, 104] : bot ? [24, 24, 28] : [48, 49, 54]; },
      bumper: function (x, y, top, bot) { return top ? [88, 90, 96] : bot ? [12, 12, 14] : (y % 3 === 0 ? [34, 34, 38] : [27, 27, 30]); },
      head: function (x, y, top) { return top ? [255, 255, 255] : ((x + y) % 3 === 0 ? [255, 250, 220] : [196, 210, 226]); },
      amber: function (x, y, top) { return top ? [255, 214, 120] : [240, 140, 20]; },
      tail: function (x, y, top) { return top ? [255, 120, 110] : (y % 2 ? [180, 16, 22] : [214, 30, 34]); },
      taillouvre: function (x, y, top) { return top ? [255, 120, 110] : (y % 2 ? [40, 8, 10] : [214, 30, 34]); },
      grille: function (x, y) { return y % 2 ? [42, 43, 48] : [10, 10, 12]; },
      vent: function (x, y, top, bot) { return bot ? lit(base, 0.3) : [10, 10, 12]; }
    };
    (A.feats || []).forEach(function (f) {
      if (f[0] === 'seam') polyLine(f[1], function (x, y) { put(x, y, lit(base, -0.42)); if (M(x, y - 1) === 1) put(x, y - 1, lit(base, 0.12)); });
      else polyFill(f[1], PAL[f[0]]);
    });
    ctx.putImageData(img, 0, 0);

    function topAt(ux) { var x = Math.round(padL + ux * u); return topY[x] >= 0 ? topY[x] : groundY; }
    // driver helmet for open cars
    if (A.helmet) {
      var hx0 = Math.round(padL + A.helmet[0] * u), hy0 = Math.round(groundY - A.helmet[1] * u);
      ctx.fillStyle = '#e8e8e8'; circle(ctx, hx0, hy0 - 2, 3.4);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(hx0 - 2, hy0 - 5, 3, 1);
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(hx0 + 1, hy0 - 3, 3, 2);
    }
    if (look.blower) {
      // polished roots case, belt, bug-catcher scoop
      var hx = (A.hood[0] + A.hood[1]) / 2, top = topAt(hx), bx = Math.round(padL + hx * u) - 9;
      ctx.fillStyle = '#5d636d'; ctx.fillRect(bx - 1, top - 2, 20, 3);
      for (var bi = 0; bi < 9; bi++) { ctx.fillStyle = bi === 0 ? '#ffffff' : bi < 3 ? '#dfe4ea' : bi < 6 ? '#b8bec8' : '#8a919c'; ctx.fillRect(bx, top - 11 + bi, 18, 1); }
      ctx.fillStyle = '#6b727c'; for (var rb = 2; rb < 18; rb += 3) ctx.fillRect(bx + rb, top - 9, 1, 6);
      ctx.fillStyle = '#1b1b1b'; ctx.fillRect(bx + 15, top - 8, 5, 7);
      ctx.fillStyle = '#2a2a2a'; ctx.fillRect(bx + 2, top - 17, 14, 6);
      ctx.fillStyle = '#d23a3a'; ctx.fillRect(bx + 2, top - 17, 14, 2);
      ctx.fillStyle = '#ff7a7a'; ctx.fillRect(bx + 2, top - 17, 14, 1);
      ctx.fillStyle = '#0c0c0c'; ctx.fillRect(bx + 12, top - 15, 4, 4);
    } else if (look.scoop) {
      var hx2 = (A.hood[0] + A.hood[1]) / 2, top2 = topAt(hx2), sx = Math.round(padL + hx2 * u) - 9;
      for (var si = 0; si < 4; si++) { ctx.fillStyle = css(lit(base, si === 0 ? 0.5 : si === 3 ? -0.4 : 0.1)); ctx.fillRect(sx + (3 - si), top2 - 4 + si, 18 - (3 - si), 1); }
      ctx.fillStyle = '#0d0d0d'; ctx.fillRect(sx + 15, top2 - 3, 3, 3);
    }
    if (look.wing) {
      var big = look.wing === 2, wx = padL + 1, base0 = topAt(5), wTop = base0 - (big ? 14 : 4);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(wx + 4, wTop + 2, 2, topAt(5) - wTop - 1);
      ctx.fillRect(wx + 12, wTop + 2, 2, topAt(12) - wTop - 1);
      var ww = big ? 26 : 18;
      ctx.fillStyle = css(lit(base, -0.35)); ctx.fillRect(wx - 3, wTop, ww, 3);
      ctx.fillStyle = css(lit(base, 0.45)); ctx.fillRect(wx - 3, wTop, ww, 1);
      if (big) { ctx.fillStyle = '#151515'; ctx.fillRect(wx - 4, wTop - 3, 2, 7); }
    }
    var tl = A.tail || [1, 15], hd = A.head;
    var spr = { canvas: cv, w: W, h: H, padL: padL, lenPx: lenPx, groundY: groundY, wheelR: wheelR, wheelF: wheelF,
      tail: { x: Math.round(padL + tl[0] * u), y: Math.round(groundY - tl[1] * u) },
      head: hd ? { x: Math.round(padL + hd[0] * u), y: Math.round(groundY - hd[1] * u) } : null,
      exhaust: { x: padL + (A.exhaust ? A.exhaust[0] : 1) * u - 2, y: groundY - Math.round((A.exhaust ? A.exhaust[1] : 6) * u) },
      rail: !!A.rail, bar: look.bar, look: look, rim: A.rim || 'five' };
    spriteCache[key] = spr;
    return spr;
  };

  // ------------------------------------------------------------ wheels
  // Pre-rendered per style / size / rotation step; spokes are transparent so
  // the brake disc and caliper show through.
  var wheelCache = {};
  var RIMS = {
    turbine: { n: 10, f: function (a, rr) { var p = ((a + rr * 1.6) / (Math.PI * 2 / 10)) % 1; return p < 0.38 ? 0 : 1; } },
    mesh:    { n: 8,  f: function (a, rr) { var p = (a / (Math.PI * 2 / 8)) % 1; return Math.abs(p - 0.5) < 0.17 + 0.12 * (1 - rr) ? 1 : 0; } },
    five:    { n: 5,  f: function (a, rr) { var p = (a / (Math.PI * 2 / 5)) % 1; return Math.abs(p - 0.5) < 0.1 + 0.18 * (1 - rr) ? 1 : 0; } },
    split:   { n: 5,  f: function (a, rr) { var p = (a / (Math.PI * 2 / 5)) % 1, w = 0.06 + 0.06 * (1 - rr); return Math.abs(p - 0.38) < w || Math.abs(p - 0.62) < w || (rr < 0.45 && Math.abs(p - 0.5) < 0.2) ? 1 : 0; } },
    drag:    { n: 5,  f: function (a, rr) { var p = (a / (Math.PI * 2 / 5)) % 1; return Math.abs(p - 0.5) < 0.05 + 0.05 * (1 - rr) ? 1 : 0; } }
  };
  function wheelImage(r, style, rim, slick, radial, step, steps, blur) {
    var key = [r, style, rim, slick, radial, step, blur].join('|');
    if (wheelCache[key]) return wheelCache[key];
    var R = Math.ceil(r) + 1, S = R * 2 + 1;
    var cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    var ctx = cv.getContext('2d'), img = ctx.createImageData(S, S), d = img.data;
    var rc = hexToRgb(rim), st = RIMS[style] || RIMS.five;
    var rimR = r * (slick ? 0.55 : radial ? 0.6 : 0.66);
    var rot = step / steps * Math.PI * 2 / st.n;
    for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) {
      var dx = x + 0.5 - R - 0.5, dy = y + 0.5 - R - 0.5, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > r) continue;
      var c, a = 255, lt = -dy / r * 0.5 - dx / r * 0.15;   // light from above
      if (dist > rimR) {
        // rubber: tread edge, sidewall
        var sw = (dist - rimR) / (r - rimR);
        var g = sw > 0.86 ? 14 : 30 + 16 * lt + (sw < 0.18 ? 10 : 0);
        if ((slick || radial) && sw > 0.35 && sw < 0.6 && dy < -rimR * 0.2 && Math.abs(dx) < rimR * 0.8) g += 34;   // sidewall lettering
        c = [g, g, g + 2];
      } else {
        var rr = dist / rimR, ang = Math.atan2(dy, dx) - rot;
        ang = ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        var on = rr > 0.86 || rr < 0.22 || (blur ? 0.6 > 0.5 : st.f(ang, rr));
        if (blur && rr >= 0.22 && rr <= 0.86) { c = lit(rc, -0.35 + lt * 0.4); a = 200; }
        else if (on) {
          var sh = rr > 0.86 ? 0.35 + lt * 0.6 : rr < 0.22 ? (rr < 0.09 ? 0.5 : -0.1) : 0.05 + lt * 0.5;
          c = lit(rc, Math.max(-0.7, Math.min(0.7, sh)));
          if (rr > 0.15 && rr < 0.22 && Math.floor((Math.atan2(dy, dx) - rot) / (Math.PI * 2) * st.n * 2 + 100) % 2 === 0) c = lit(rc, -0.5);   // lug nuts
        } else { a = 0; c = [0, 0, 0]; }
      }
      var i = (y * S + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a;
    }
    ctx.putImageData(img, 0, 0);
    var res = { canvas: cv, R: R, steps: steps };
    wheelCache[key] = res;
    return res;
  }

  function drawWheel(ctx, x, y, r, ang, look, style, spin, caliper) {
    var steps = 12, st = RIMS[style] || RIMS.five;
    var per = Math.PI * 2 / st.n;
    var blur = Math.abs(spin || 0) > 38;
    var stp = ((Math.floor(((ang % per) + per) % per / per * steps)) % steps + steps) % steps;
    var rimR = r * (look.slick ? 0.55 : look.radial ? 0.6 : 0.66);
    // brake disc & caliper behind the spokes
    ctx.fillStyle = '#2c2d31'; circle(ctx, x, y, rimR * 0.92);
    ctx.fillStyle = '#5a5c62'; circle(ctx, x, y, rimR * 0.72);
    ctx.fillStyle = '#26272b'; circle(ctx, x, y, rimR * 0.3);
    if (caliper) { ctx.fillStyle = caliper; ctx.fillRect(Math.round(x + rimR * 0.18), Math.round(y - rimR * 0.82), Math.max(2, Math.round(rimR * 0.42)), Math.max(2, Math.round(rimR * 0.36))); }
    var w = wheelImage(Math.round(r * 2) / 2, style, look.rim, look.slick, look.radial, blur ? 0 : stp, steps, blur);
    ctx.drawImage(w.canvas, Math.round(x - w.R - 0.5), Math.round(y - w.R - 0.5));
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

  // Soft contact shadow under a car, drawn on the ground before the car.
  function carShadow(ctx, spr, gx, gy, pitch) {
    var x0 = gx - (spr.wheelR.x - spr.padL), len = spr.lenPx, lift = Math.max(0, pitch) * len * 0.5;
    var k = Math.max(0.25, 1 - lift / 40);
    ctx.fillStyle = 'rgba(0,0,0,' + (0.22 * k).toFixed(3) + ')';
    ctx.fillRect(Math.round(x0 - 2), Math.round(gy - 1), len + 4, 3);
    ctx.fillStyle = 'rgba(0,0,0,' + (0.28 * k).toFixed(3) + ')';
    ctx.fillRect(Math.round(x0 + 3), Math.round(gy - 1), len - 6, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(Math.round(gx - spr.wheelR.r * 0.8), Math.round(gy - 1), Math.round(spr.wheelR.r * 1.6), 2);
    if (pitch < 0.25) ctx.fillRect(Math.round(gx + spr.wheelF.x - spr.wheelR.x - spr.wheelF.r * 0.8), Math.round(gy - 1), Math.round(spr.wheelF.r * 1.6), 2);
  }
  DR.carShadow = carShadow;

  // Draw a car with its rear tire contact at (gx, gy) in screen space.
  // pitch: nose-up radians. wheelAng: wheel rotation radians.
  // opts: {barRad, brake, chute, t, spin (rad/s), shadow (default on)}
  DR.drawCar = function (ctx, spr, gx, gy, pitch, wheelAng, opts) {
    opts = opts || {};
    var rx = spr.wheelR.x, ground = spr.groundY;
    if (opts.shadow !== false) carShadow(ctx, spr, gx, gy, pitch);
    ctx.save();
    ctx.translate(Math.round(gx), Math.round(gy));
    if (opts.chute > 0) drawChute(ctx, spr, opts.chute, opts.t || 0);
    ctx.rotate(-pitch);
    // wheelie bars: bolted to the chassis, the tail wheel touches down when
    // pitch reaches the tuned bar angle.
    if (spr.bar) {
      var bl = 48, endH = Math.max(3, Math.sin(opts.barRad || 0.05) * bl);
      var ay = -spr.wheelR.r * 0.7;
      for (var i = 4; i <= bl; i++) {
        var yy = Math.round(ay + (-endH - ay) * (i / bl));
        ctx.fillStyle = '#c4cad2'; ctx.fillRect(-i, yy, 1, 1);
        ctx.fillStyle = '#6d737c'; ctx.fillRect(-i, yy + 1, 1, 1);
      }
      ctx.fillStyle = '#1c1c1c'; circle(ctx, -bl, Math.round(-endH), 3);
      ctx.fillStyle = '#b8bec8'; ctx.fillRect(-bl - 1, Math.round(-endH) - 1, 2, 2);
    }
    var bodyLift = opts.squat ? opts.squat : 0;
    ctx.drawImage(spr.canvas, Math.round(-rx), Math.round(-ground - 1 + bodyLift));
    if (opts.brake > 0.05) {
      var lx = Math.round(spr.tail.x - rx), ly = Math.round(spr.tail.y - ground - 1 + bodyLift);
      ctx.fillStyle = '#ffd0c8'; ctx.fillRect(lx - 1, ly - 2, 3, 4);
      ctx.globalAlpha = 0.45 * opts.brake; ctx.fillStyle = '#ff2020'; ctx.fillRect(lx - 4, ly - 4, 6, 8);
      ctx.globalAlpha = 1;
    }
    var look = spr.look, sp = opts.spin || 0;
    drawWheel(ctx, 0, -spr.wheelR.r, spr.wheelR.r, wheelAng, look, look.slick ? 'drag' : spr.rim, sp, null);
    var fk = opts.frontStill ? 0 : spr.wheelR.r / spr.wheelF.r;
    drawWheel(ctx, spr.wheelF.x - rx, -spr.wheelF.r, spr.wheelF.r, opts.frontStill ? 0.3 : wheelAng * fk, look, spr.rail ? 'drag' : spr.rim, sp * fk, spr.rail ? null : '#b3202a');
    ctx.restore();
  };

  // World-space light anchors of a drawn car (for the lighting pass).
  DR.carLamps = function (spr, gx, gy, pitch) {
    function tr(x, y) { var dx = x - spr.wheelR.x, dy = y - spr.groundY - 1, c = Math.cos(-pitch), s = Math.sin(-pitch); return { x: gx + dx * c - dy * s, y: gy + dx * s + dy * c }; }
    return { head: spr.head ? tr(spr.head.x, spr.head.y) : null, tail: tr(spr.tail.x, spr.tail.y) };
  };

  // Parachute trailing behind the car. k: 0..1 how far it has deployed.
  function drawChute(ctx, spr, k, t) {
    var rearX = -(spr.wheelR.x - spr.padL), attachY = -Math.round(spr.wheelR.r * 1.6);
    var dist = 12 + 32 * k, cx = Math.round(rearX - dist), size = 4 + 10 * k;
    var cy = attachY - Math.round(4 + 4 * k + Math.sin(t * 9) * 2 * k);
    ctx.fillStyle = '#2a2a2a';
    for (var i = 0; i <= dist; i += 1) ctx.fillRect(Math.round(rearX - i), Math.round(attachY + (cy - attachY) * (i / dist)), 1, 1);
    for (var dy = -size; dy <= size; dy++) {
      var w = Math.round(Math.sqrt(Math.max(0, size * size - dy * dy)) * 0.55) + 1;
      var band = (Math.floor((dy + size) / 4) % 2);
      ctx.fillStyle = band ? '#f2f2f2' : '#d23a3a';
      ctx.fillRect(cx - w, cy + dy, w, 1);
      ctx.fillStyle = band ? '#b9b9b9' : '#8f2020';
      ctx.fillRect(cx - w, cy + dy, 1, 1);
    }
  }

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
      this.add({ t: 'smoke', x: wx + (Math.random() - 0.5) * 0.4, y: wy - Math.random() * 0.3, vx: vx * 0.15 - Math.random() * 1.5, vy: 0.4 + Math.random() * 0.9, life: 1.6 + Math.random(), age: 0, size: 4 + Math.random() * 4 });
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
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.t === 'smoke') { p.vx *= 1 - dt * 0.8; p.size += dt * 10; }
    }
  };
  function pScreen(p, camX, laneY) { return [(p.x - camX) * PPM, p.lane != null ? laneY[p.lane] - p.y * PPM : p.sy - p.y * PPM]; }
  DR.Particles.prototype.draw = function (ctx, camX, laneY) {
    var L = this.list;
    for (var i = 0; i < L.length; i++) {
      var p = L[i], q = pScreen(p, camX, laneY), sx = q[0], sy = q[1];
      var k = p.age / p.life;
      if (p.t === 'smoke') {
        // lit from above: bright crown, shaded belly
        var g = Math.round(222 - k * 46);
        ctx.globalAlpha = Math.max(0, 0.62 * (1 - k));
        ctx.fillStyle = 'rgb(' + (g - 34) + ',' + (g - 32) + ',' + (g - 24) + ')';
        circle(ctx, sx, sy, p.size);
        ctx.fillStyle = 'rgb(' + g + ',' + g + ',' + (g + 4) + ')';
        circle(ctx, sx - p.size * 0.15, sy - p.size * 0.2, p.size * 0.78);
        ctx.fillStyle = 'rgb(' + Math.min(255, g + 22) + ',' + Math.min(255, g + 22) + ',' + Math.min(255, g + 26) + ')';
        circle(ctx, sx - p.size * 0.3, sy - p.size * 0.4, p.size * 0.42);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = p.t === 'nos' ? (k < 0.5 ? '#f0dcff' : '#9b4dff') : (k < 0.4 ? '#fff6b8' : k < 0.7 ? '#ffae2a' : '#ff4a1a');
        ctx.fillRect(Math.round(sx), Math.round(sy), Math.ceil(p.size), Math.ceil(p.size * 0.7));
      }
    }
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
  var LANE_Y = [392, 336];              // ground y for near (player) and far lane
  DR.LANE_Y = LANE_Y;
  var HZ = 232;                         // horizon

  var THEMES = {
    strip: { night: false, ground: [92, 140, 58], asphalt: [62, 62, 68], line: '#ececec' },
    street: { night: true, ground: [30, 40, 30], asphalt: [44, 44, 50], line: '#d8c050' }
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

    if (!night) {
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
    if (!T.night) {
      // stadium light towers (behind the stands)
      for (i = -1; i < 4; i++) {
        x = Math.round(i * 300 - ((o * 0.7) % 300 + 300) % 300 + 120);
        ctx.fillStyle = '#6a707a'; ctx.fillRect(x, 120, 3, 110); ctx.fillStyle = '#9aa1ac'; ctx.fillRect(x, 120, 1, 110);
        ctx.fillStyle = '#3a3f47'; ctx.fillRect(x - 12, 108, 27, 14);
        for (var lx = 0; lx < 4; lx++) for (var ly = 0; ly < 2; ly++) { ctx.fillStyle = '#e8ecf2'; ctx.fillRect(x - 10 + lx * 6, 110 + ly * 6, 5, 4); }
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
    if (!T.night) ctx.fillRect(0, 358, W, 2);
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
      bulb(bx, top + 4, st.stage, '#fffbe0');
      bulb(bx, top + 12, st.stage, '#fffbe0');
      for (var a = 0; a < 3; a++) bulb(bx, top + 24 + a * 12, st.amber > a, '#ffb000');
      bulb(bx, top + 64, st.green && !st.red[lane], '#22ff4a');
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
    var W = DR.VIEW_W, H = DR.VIEW_H, glows = this.glow.slice();
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
      if (this.standGlow) tileX(ctx, this.standGlow, this._standOff || 0, 222);
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
      canvas.width = fw; canvas.height = Math.round(fw * (opts.aspect || 0.45));
    }
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    var w = canvas.width, h = canvas.height;
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
