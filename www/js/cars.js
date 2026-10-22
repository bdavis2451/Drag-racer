// ===========================================================================
// CARS — side-view car sprites. Each car is built from swappable parts
// (shell, bumpers, skirts, spoiler, mirrors...) so body kits can be added as
// new variants of a slot. Paint, glass, chrome, plastic and lamps are shaded
// per pixel from an estimated surface normal and a simple sky/ground
// environment, then the wheels, brakes and tires are drawn on top.
// ===========================================================================
(function () {
  var DR = globalThis.DR;
  var PPM = DR.PPM, BAYER = DR.BAYER, circle = DR.pixCircle, hexToRgb = DR.hexToRgb;
  function css(c) { return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function inPoly(pts, x, y) {
    var c = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }
  function rect(x0, y0, x1, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; }

  // ------------------------------------------------------------ generic bodies
  // x: 0 (rear bumper) .. 100 (front bumper). y: units above the ground, same
  // scale as x. Used by cars without hand-drawn art.
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
  // Traced from the real cars' side profiles, in the same units as BODIES.
  //  shell: the main body. kit: slot -> variants ({pts, mat, extra, lamps,
  //  details}); the look picks a variant per slot ('stock' by default).
  //  glass / pillars / interior: the greenhouse. belt: shoulder crease.
  //  rocker: bottom of the side. lamps / details: [material, polygon].
  //  seams: panel gaps (polylines). head / tail: lamp centres for lighting.
  var ART = {
    // '87-'93 Mustang GT hatch: aero nose, boxy flanks, long sloped hatch
    fox: {
      wr: 21, wf: 76.5, belt: 19.8, rocker: 5.2, rim: 'turbine', hood: [70, 90], frame: [18, 18, 20],
      shell: [[1.4,11],[0.6,15.5],[1.2,19.6],[2.2,20.6],[3.6,20.9],[4.4,20.7],[16,26.6],[22,28.5],[25,28.8],[46.5,28.8],[49,28.2],[63,21.8],[64.5,21.5],[88,19.8],[94,19.1],[97.2,18.3],[98.6,16.6],[98.8,13],[96,6.5],[90,5.2],[10,5.2],[3,6.5]],
      kit: {
        rbumper: { stock: { pts: [[2.8,5.1],[1,6.2],[0,8],[0,11.6],[0.6,12.6],[7.6,12.6],[7.6,5]],
          details: [['soft', rect(0.2, 10.8, 7.6, 11.9)], ['trim', rect(0.6, 5.2, 7, 6.2)]] } },
        fbumper: { stock: { pts: [[91.5,4.9],[97,5.3],[99.4,6.6],[100,8.6],[100,13.4],[99.2,14.4],[93,14.2],[91.5,12]],
          details: [['soft', rect(92, 10.8, 100, 11.9)], ['grille', rect(97.4, 8.8, 100, 10.4)], ['trim', [[92.5, 4.9], [99.5, 5.6], [100, 6.6], [92.5, 6]]]],
          lamps: [['fog', rect(98, 6.8, 100, 8.2)]] } },
        skirt: { stock: { pts: [[24,4.6],[66,4.6],[66,7.6],[24,7.6]], details: [['vent', [[28.6, 5.2], [33.2, 5.2], [33.2, 9.4], [30.2, 8.8]]]] } },
        spoiler: { stock: { pts: [[1.6,20.2],[5.8,21.4],[7,22.4],[2.8,22.3],[1.1,21.1]] } },
        mirror: { stock: { mat: 'trim', pts: [[57.6,22.2],[61,22.2],[60.4,24.6],[58.2,24.4]] } }
      },
      glass: [[[33.8,22.4],[33.8,27.8],[46.4,27.8],[60.6,22.2]], [[17.8,23.1],[23,27.1],[25.2,27.8],[31.6,27.8],[31.6,22.4]]],
      pillars: [['trim', rect(31.6, 22.4, 33.8, 27.8)]],
      interior: [['seat', [[40, 22.4], [43.6, 22.4], [43.2, 26.6], [40.8, 27.2]]], ['seat', [[27, 22.4], [30, 22.4], [29.6, 25.8], [27.4, 26]]], ['wheel', [[51.6, 23], [53.6, 25.4], [54.4, 24.6], [52.4, 22.4]]]],
      lamps: [['head', [[93.8, 17], [98.4, 16.7], [99, 14.8], [93.8, 15]]], ['amber', [[92.2, 15.1], [93.8, 15], [93.8, 17], [92.2, 17.1]]],
        ['taillouvre', [[0.3, 14], [2.8, 14], [2.8, 19], [1, 19]]], ['amber', rect(88.4, 12.6, 90.4, 13.5)], ['tail', rect(8.4, 12.6, 10.2, 13.5)]],
      details: [['soft', rect(7.6, 11.2, 92, 12.1)], ['handle', rect(35.2, 19.4, 37.8, 20.2)], ['badge', rect(83.5, 15.4, 86.5, 16.2)], ['door', rect(11.6, 15.2, 14.4, 17.6)]],
      seams: [[[62.6, 21.7], [62.9, 12], [62.6, 7.6]], [[33.1, 22.3], [32.7, 12], [33, 7.6]], [[64.5, 21.5], [90, 19.65]]],
      head: [98.6, 15.8], tail: [1.5, 16.5], exhaust: [5, 5.4]
    },
    // 6th-gen Camaro SS: long hood, high belt, gun-slit glass, short deck
    camss: {
      wr: 19.6, wf: 78.4, belt: 21.6, rocker: 6.4, rim: 'split', hood: [70, 88], frame: [14, 14, 16],
      shell: [[1.4,9],[0.4,17],[1.4,20.6],[2.6,21.6],[4,22.1],[13,22.7],[20,24],[26,26.4],[33,27.8],[48,27.9],[52,27],[60.5,23.6],[64,22.9],[80,22.2],[92,21.6],[97.4,20.8],[99.4,19.4],[99,12],[96,6.4],[10,6.4],[3,7.4]],
      kit: {
        rbumper: { stock: { pts: [[3,5],[0.6,7],[0,10],[0.4,14.4],[7,14.6],[9.4,5]],
          details: [['trim', [[0.6, 5.2], [9.4, 4.8], [9.4, 7.6], [0.8, 8.2]]], ['chrome', rect(1.2, 5.6, 3.4, 7)], ['chrome', rect(4.2, 5.6, 6.4, 7)]] } },
        fbumper: { stock: { pts: [[90,4.6],[96.4,5],[98,6.6],[98.8,9],[99.6,14],[100,17.6],[99,18.4],[92,16.4],[90,12]],
          details: [['grille', [[98.7, 17.4], [99.9, 17.3], [99.4, 12.4], [98.4, 12.6]]], ['grille', [[96.4, 6.8], [98.2, 7.2], [98.8, 10], [97, 9.8]]], ['trim', [[91, 4.4], [97.6, 5], [98, 6], [91, 5.4]]]] } },
        skirt: { stock: { mat: 'trim', pts: rect(22, 4.6, 71, 6.8) } },
        spoiler: { stock: { pts: [[3.4,21.8],[4,23.2],[10,23.3],[10.6,22.6]] } },
        mirror: { stock: { pts: [[55.6,24],[59.4,23.8],[59,26],[56.2,25.6]] } }
      },
      glass: [[[26.6,23.9],[33.4,27.2],[47.8,27.2],[58.4,23.9]]],
      pillars: [['trim', rect(31, 23.9, 32, 26.6)]],
      interior: [['seat', [[39.6, 23.9], [42.6, 23.9], [42.2, 26.4], [40.2, 26.8]]], ['wheel', [[51, 24], [53, 26.2], [53.6, 25.4], [52, 23.9]]]],
      lamps: [['head', [[93.4, 20.2], [99, 19.4], [99.4, 18.2], [94, 18.8]]], ['tail', [[0.3, 17.4], [3, 17.6], [3.3, 20.4], [1.4, 20.4]]],
        ['amber', rect(90, 15.8, 92, 16.6)], ['tail', rect(6.4, 16, 8.4, 16.8)]],
      details: [['vent', [[62.6, 13.4], [66.6, 13.4], [66.6, 16.2], [63.2, 15.9]]], ['vent', [[72, 21.1], [80, 20.6], [80, 21.3], [72, 21.8]]], ['handle', rect(34, 22.3, 36.6, 23)], ['badge', rect(68, 12.4, 71, 13.2)]],
      seams: [[[59.6, 23.5], [60, 8], [59, 6.8]], [[30.6, 23.8], [29.2, 12], [29.8, 6.8]], [[64, 22.9], [90, 21.7]]],
      creases: [[[66, 17.6], [93, 17.2]], [[8, 19.2], [26, 19.8]]],
      head: [98.5, 19.4], tail: [1.8, 19], exhaust: [3, 5.8]
    },
    // AE86 Trueno: wedge nose with pop-ups, black bumpers, airy greenhouse,
    // panda two-tone
    hachi: {
      wr: 21.4, wf: 78.5, belt: 20.6, rocker: 5.2, rim: 'mesh', hood: [70, 90], frame: [18, 18, 20],
      lower: { y: 12.9, c: [24, 24, 27] },
      shell: [[1,13.8],[1.4,20.4],[2.4,21.4],[3.6,21.7],[15.5,29.3],[19.5,31.2],[22,31.6],[48,31.8],[50,31.3],[63.5,23.4],[65,23.1],[92,20.3],[97.8,19.2],[99.2,17.8],[99.4,14],[96,13.6],[96,5.2],[5,5.2],[5,13.6]],
      kit: {
        rbumper: { stock: { mat: 'bumper', pts: [[0,6.2],[5.4,6],[5.4,14],[0,13.8]] } },
        fbumper: { stock: { mat: 'bumper', pts: [[95.2,6],[99,6.4],[100,8],[100,13.9],[95.2,13.9]], lamps: [['amber', rect(98.2, 10, 100, 11.8)]] } },
        skirt: { stock: { mat: 'bumper', pts: rect(5, 12.6, 95.4, 13.6) } },
        spoiler: { stock: { mat: 'trim', pts: [[1.4,20.4],[3.6,21.7],[5.2,22.9],[1.2,21.2]] } },
        mirror: { stock: { mat: 'trim', pts: [[58.2,23.7],[61.6,23.7],[61,26.4],[58.4,25.8]] } }
      },
      glass: [[[15,23.6],[19.6,28.8],[22.6,30.3],[31.6,30.4],[31.6,23.7]], [[33.4,23.7],[33.4,30.4],[47.8,30.4],[61.2,23.7]]],
      pillars: [['trim', rect(31.6, 23.7, 33.4, 30.4)]],
      interior: [['seat', [[39, 23.7], [42.4, 23.7], [42, 28.6], [39.6, 29.4]]], ['seat', [[24.6, 23.7], [27.6, 23.7], [27.2, 27.4], [25, 27.8]]], ['wheel', [[50.6, 24.4], [52.6, 27.2], [53.4, 26.4], [51.6, 24]]]],
      lamps: [['amber', [[96.6, 15.2], [99.4, 15.2], [99.3, 16.8], [96.6, 16.8]]], ['tail', [[0.9, 16.6], [3, 16.6], [3, 19.7], [1.4, 19.7]]], ['amber', [[0.8, 15], [3, 15], [3, 16.6], [0.9, 16.6]]]],
      details: [['handle', rect(34.6, 21.2, 37.2, 21.9)], ['door', rect(9.8, 16.4, 12.4, 18.6)], ['badge', rect(80, 16.4, 83, 17.1)]],
      seams: [[[62.6, 23.4], [63, 13.8]], [[32.5, 23.6], [32.3, 13.8]], [[86.5, 20.9], [86.5, 19.6], [96.8, 18.6]], [[65, 23.1], [86.5, 20.9]]],
      head: [99, 16], tail: [2, 17.4], exhaust: [5.5, 5.6]
    },
    // A80 Supra: long rounded nose, bubble roof, hoop wing
    supra: {
      wr: 21, wf: 77.7, belt: 18.2, rocker: 6.4, rim: 'five', hood: [66, 86], frame: [16, 16, 18],
      shell: [[1.2,10],[0.3,14.5],[1.2,17.6],[3,19.2],[8,20],[16,20.6],[22,22.4],[28,26.2],[33,27.8],[37,28.3],[45,28.1],[49,27.2],[58,22.4],[62,21.2],[74,19.6],[86,17.8],[93,15.8],[97.2,13.6],[98.6,11],[96,6.4],[12,6.4],[3,7]],
      kit: {
        rbumper: { stock: { pts: [[3,5.4],[0.6,7.2],[0,10.5],[0.4,13],[7,13.2],[10,5.4]],
          details: [['trim', [[1, 5.6], [10, 5], [10, 6.6], [1, 7.4]]], ['chrome', rect(1.6, 5.8, 4.4, 7.4)]] } },
        fbumper: { stock: { pts: [[88,4.6],[97,5],[99.4,6.6],[100,9],[99.4,11.2],[97.4,13.6],[92,13],[88,10]],
          details: [['grille', [[96.4, 8.8], [100, 9.4], [100, 7], [97, 6.6]]], ['trim', [[89, 4.4], [99, 5], [99.6, 6], [89, 5.4]]]],
          lamps: [['fog', [[97.4, 10.2], [99.4, 10.5], [99.1, 11.6], [97.4, 11.4]]]] } },
        skirt: { stock: { pts: rect(24, 4.6, 70, 7.2), details: [['trim', rect(24, 4.6, 70, 5.4)]] } },
        spoiler: { stock: { pts: [[0.4,24.6],[18,24.8],[19,26.4],[17.6,27.4],[1.6,27.6],[0,26.4]],
          extra: [[[4.2,19.6],[7.2,19.6],[8.2,25.2],[5.6,25.2]], [[13.4,20.2],[16.4,20.3],[17,25.2],[14.6,25.2]]] } },
        mirror: { stock: { pts: [[52.4,22],[56,22],[55.2,24.4],[52.8,24]] } }
      },
      glass: [[[26.2,21.4],[31.4,26.8],[45,26.9],[56,21.7]]],
      pillars: [['trim', rect(32.6, 21.5, 33.6, 26.8)]],
      interior: [['seat', [[38.2, 21.6], [41.4, 21.6], [41, 25.8], [38.6, 26.4]]], ['wheel', [[48.6, 22], [50.6, 24.6], [51.4, 23.8], [49.6, 21.8]]]],
      lamps: [['head', [[87.6, 16.6], [94.6, 14.9], [96.2, 13.6], [88.6, 15.3]]], ['tail', [[0.3, 14], [2.4, 14.4], [2.7, 17.4], [1, 17.2]]], ['amber', rect(85.6, 12.8, 87.6, 13.6)]],
      details: [['handle', rect(33.8, 19.6, 36.4, 20.3)], ['door', rect(14, 14.6, 16.6, 16.8)], ['badge', rect(78, 13.6, 81, 14.3)]],
      seams: [[[57, 22], [57.5, 10], [57, 7.2]], [[29.6, 21.6], [28.2, 12], [28.8, 7.2]], [[62, 21.2], [84, 18]]],
      creases: [[[8, 16.4], [24, 17]]],
      head: [95, 15], tail: [1.5, 15.7], exhaust: [3, 6.6]
    }
  };
  DR.CAR_ART = ART;
  // slots in draw order; appendages are thin parts shaded on their own
  var SLOTS = ['skirt', 'rbumper', 'fbumper', 'hood', 'spoiler', 'mirror'];
  var APPENDAGE = { spoiler: 1, mirror: 1, wing: 1, upright: 1 };
  var BODYPART = { shell: 1, skirt: 1, rbumper: 1, fbumper: 1, hood: 1 };

  // ------------------------------------------------------------ look
  var spriteCache = {};
  DR.carLook = function (inst) {
    var car = DR.CARS[inst.carId] || DR.CARS_RESERVE[inst.carId];
    var fi = DR.partId('fi', inst), fiu = DR.FI[fi];
    var aero = DR.partId('aero', inst);
    var tire = DR.TIRES[DR.partId('rtires', inst)];
    return {
      carId: inst.carId, body: car.body, len: car.len,
      color: inst.color || car.col, stripe: inst.stripe || '', rim: inst.rim || '#c8c8c8',
      kit: inst.kit || null,
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
    return { shell: B.pts, kit: {}, glass: B.win.length ? [B.win] : [], belt: B.win.length ? minW - 1.5 : maxY * 0.7, wr: B.wr, wf: B.wf, hood: B.hood,
      head: B.rail ? null : [98.5, 14], tail: [1, B.rail ? 10 : 15], exhaust: [1, 6], rim: 'five', rocker: 7, rail: B.rail, helmet: B.head,
      lamps: B.rail ? [] : [['head', rect(96.5, 13.2, 99.6, 14.8)], ['tail', rect(0, 14.4, 2.2, 16.2)]] };
  }

  // highest point of a polygon at x (units), for placing add-ons
  function topOf(pts, x) { for (var y = 60; y > 0; y -= 0.25) if (inPoly(pts, x, y)) return y; return 0; }

  // ------------------------------------------------------------ shading
  function dith(px, py) { return BAYER[(py & 3) * 4 + (px & 3)] / 16; }
  // banded (not dithered) shading, like hand-placed pixel-art ramps
  function qn(ny) { return Math.round(ny / 0.09) * 0.09; }
  var SKYT = [228, 238, 255], SHAD = [10, 10, 20];
  // car paint: brightens toward a sky-tinted white on surfaces facing up,
  // falls into a cool shadow facing down; dark paints get a stronger
  // clear-coat sheen so black still reads as glossy
  function paint(base, ny, lm) {
    var s;
    if (ny >= 0) {
      s = ny * (0.5 + (1 - lm) * 0.25);
      return [base[0] + (SKYT[0] - base[0]) * s, base[1] + (SKYT[1] - base[1]) * s, base[2] + (SKYT[2] - base[2]) * s];
    }
    s = Math.min(0.85, -ny * 0.78);
    return [base[0] + (SHAD[0] - base[0]) * s, base[1] + (SHAD[1] - base[1]) * s, base[2] + (SHAD[2] - base[2]) * s];
  }
  function chrome(ny) {
    if (ny > 0.5) return [236, 242, 252];
    if (ny > 0.1) return mix([150, 168, 196], [220, 230, 246], (ny - 0.1) / 0.4);
    if (ny > -0.1) return [250, 250, 255];
    return mix([110, 96, 82], [40, 36, 34], clamp01(-ny - 0.1));
  }
  function plastic(ny, dark) {
    var b = dark || 24;
    return ny > 0.6 ? [b + 62, b + 64, b + 70] : ny > 0.2 ? [b + 22, b + 22, b + 26] : ny > -0.3 ? [b + 8, b + 8, b + 11] : [b - 10, b - 10, b - 8];
  }
  function lum(c) { return (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255; }

  // ------------------------------------------------------------ car sprite
  DR.carSprite = function (look) {
    var key = JSON.stringify(look);
    if (spriteCache[key]) return spriteCache[key];
    var A = artFor(look);
    var lenPx = Math.round(look.len * PPM);
    var u = lenPx / 100;
    var kit = look.kit || {};

    // ---- assemble the parts
    var parts = [{ id: 'shell', mat: 'paint', pts: A.shell }];
    var lamps = (A.lamps || []).slice(), details = (A.details || []).slice();
    SLOTS.forEach(function (slot) {
      var vs = A.kit && A.kit[slot]; if (!vs) return;
      if (slot === 'spoiler' && look.wing) return;          // the aftermarket wing replaces it
      var v = vs[kit[slot] || 'stock']; if (!v) return;
      parts.push({ id: slot, mat: v.mat || 'paint', pts: v.pts });
      (v.extra || []).forEach(function (e) { parts.push({ id: slot === 'spoiler' ? 'upright' : slot, mat: v.mat || 'paint', pts: e }); });
      if (v.lamps) lamps = lamps.concat(v.lamps);
      if (v.details) details = details.concat(v.details);
    });
    if (look.wing) {
      // aftermarket wing on uprights above the deck
      var big = look.wing === 2, deck = Math.max(topOf(A.shell, 3), topOf(A.shell, 12)), h0 = deck + (big ? 9 : 2.5);
      parts.push({ id: 'upright', mat: 'trim', pts: rect(3.5, deck - 1, 4.8, h0) });
      parts.push({ id: 'upright', mat: 'trim', pts: rect(10.5, topOf(A.shell, 11) - 1, 11.8, h0) });
      parts.push({ id: 'wing', mat: 'paint', pts: [[-2, h0], [15, h0 + 0.2], [16, h0 + 1.4], [14.5, h0 + 2.6], [-1.2, h0 + 2.4], [-2.6, h0 + 1.4]] });
      if (big) parts.push({ id: 'upright', mat: 'trim', pts: rect(-3, h0 - 1.8, -1.6, h0 + 3.6) });
    }
    var maxY = 0, minX = 0;
    parts.forEach(function (p) { p.pts.forEach(function (q) { if (q[1] > maxY) maxY = q[1]; if (q[0] < minX) minX = q[0]; }); });
    var padL = 8 + Math.ceil(-minX * u), padT = 30;
    var W = lenPx + padL + 8, H = Math.ceil(maxY * u) + padT + 2;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    var img = ctx.createImageData(W, H), d = img.data;
    var base = hexToRgb(look.color), baseL = lum(base);
    var stripe = look.stripe ? hexToRgb(look.stripe) : null;
    var groundY = H - 1;
    var rR = look.tireR * PPM, rF = look.frontR * PPM, stockR = 0.31 * PPM;
    var wheelR = { x: padL + A.wr * u, y: groundY - rR, r: rR };
    var wheelF = { x: padL + A.wf * u, y: groundY - rF, r: rF };
    var archR = { x: wheelR.x, y: groundY - stockR, r: Math.max(stockR, rR * 0.92) + 3 };
    var archF = { x: wheelF.x, y: groundY - stockR, r: Math.max(stockR, rF) + 3 };
    function U(px, py) { return [(px - padL + 0.5) / u, (groundY - py + 0.5) / u]; }
    function inArch(px, py, a) { var dx = px + 0.5 - a.x, dy = py + 0.5 - a.y; return dx * dx + dy * dy < a.r * a.r && py + 0.5 > a.y - a.r * 0.95; }
    function put(px, py, c) { if (px < 0 || py < 0 || px >= W || py >= H) return; var i = (py * W + px) * 4; d[i] = Math.max(0, Math.min(255, c[0])); d[i + 1] = Math.max(0, Math.min(255, c[1])); d[i + 2] = Math.max(0, Math.min(255, c[2])); d[i + 3] = 255; }
    function get(px, py) { var i = (py * W + px) * 4; return [d[i], d[i + 1], d[i + 2]]; }

    // ---- raster: which part owns each pixel (-1 empty, -2 arch, -3 glass)
    var pid = new Int16Array(W * H).fill(-1), px, py, i, k;
    for (py = 0; py < H; py++) for (px = 0; px < W; px++) {
      var q = U(px, py), own = -1;
      for (i = parts.length - 1; i >= 0; i--) if (inPoly(parts[i].pts, q[0], q[1])) { own = i; break; }
      if (own < 0) continue;
      var pp = parts[own];
      if (!A.rail && BODYPART[pp.id] && (inArch(px, py, archR) || inArch(px, py, archF))) own = -2;
      else if (pp.id === 'shell') { for (k = 0; k < (A.glass || []).length; k++) if (inPoly(A.glass[k], q[0], q[1])) { own = -3; break; } }
      pid[py * W + px] = own;
    }
    function P(x, y) { return x < 0 || y < 0 || x >= W || y >= H ? -1 : pid[y * W + x]; }
    function isBody(v) { return v === -3 || (v >= 0 && BODYPART[parts[v].id]); }
    function solid(v) { return v === -3 || v >= 0; }
    var topB = new Int16Array(W).fill(-1), botB = new Int16Array(W).fill(-1);
    for (px = 0; px < W; px++) for (py = 0; py < H; py++) if (isBody(P(px, py))) { if (topB[px] < 0) topB[px] = py; botB[px] = py; }
    function slopeAt(x) { var a = topB[Math.max(0, x - 2)], b = topB[Math.min(W - 1, x + 2)]; return a < 0 || b < 0 ? 9 : (b - a) / 4; }
    var beltPx = groundY - A.belt * u, rockPx = groundY - (A.rocker || 5) * u;
    var lowerPx = A.lower ? groundY - A.lower.y * u : 1e9;
    var bodyMinX = W, bodyMaxX = 0;
    for (px = 0; px < W; px++) if (topB[px] >= 0) { bodyMinX = Math.min(bodyMinX, px); bodyMaxX = Math.max(bodyMaxX, px); }
    // extra crease lines (sculpting): rows that catch light
    var creaseSet = {};
    (A.creases || []).forEach(function (pl) {
      for (var s = 0; s < pl.length - 1; s++) {
        var ax = padL + pl[s][0] * u, ay = groundY - pl[s][1] * u, bx = padL + pl[s + 1][0] * u, by = groundY - pl[s + 1][1] * u, n = Math.ceil(Math.abs(bx - ax));
        for (var j = 0; j <= n; j++) creaseSet[Math.round(ax + (bx - ax) * j / n) + ',' + Math.round(ay + (by - ay) * j / n)] = 1;
      }
    });

    // normal estimate (vertical component) for the main body
    function bodyNy(px, py) {
      var t0 = topB[px], dd = py - t0, sl = slopeAt(px), flat = Math.abs(sl) < 0.8;
      var ny;
      if (dd === 0) ny = flat ? 1 : 0.8;
      else if (flat && dd <= 2) ny = 0.8 - dd * 0.12;
      else if (dd <= 1) ny = 0.55;
      else if (py < beltPx - 0.5) ny = 0.5 - 0.32 * clamp01((py - t0) / Math.max(1, beltPx - t0));
      else if (py < beltPx + 0.5) ny = 0.66;
      else if (py < beltPx + 1.5) ny = -0.32;
      else {
        var t = clamp01((py - beltPx) / Math.max(4, rockPx - beltPx));
        ny = t < 0.45 ? 0.16 - 0.1 * t : -0.12 - 0.12 * t;   // reflection horizon partway down
        if (t > 0.8) ny -= (t - 0.8) * 3.2;
      }
      if (creaseSet[px + ',' + py]) ny = 0.6; else if (creaseSet[px + ',' + (py - 1)]) ny = -0.25;
      // fender flares bulge out around the wheel arches
      if (!A.rail && py > beltPx + 1) for (var fa = 0; fa < 2; fa++) {
        var a = fa ? archF : archR, ddx = px + 0.5 - a.x, ddy = py + 0.5 - a.y, rr = Math.sqrt(ddx * ddx + ddy * ddy) - a.r;
        if (rr > 0 && rr < 5 && ddy < a.r * 0.4) ny += (rr < 1.5 ? 0.42 : 0.24 * (1 - (rr - 1.5) / 3.5)) * clamp01(-ddy / a.r + 0.4);
      }
      return ny;
    }
    // thin parts (spoilers, mirrors, wings): own top/bottom
    function localNy(px, py, id) {
      var up = P(px, py - 1) !== id, dn = P(px, py + 1) !== id, up2 = P(px, py - 2) !== id;
      return up ? 0.95 : up2 ? 0.45 : dn ? -0.6 : 0.05;
    }

    var gl = A.glass || [], inter = A.interior || [];
    for (py = 0; py < H; py++) for (px = 0; px < W; px++) {
      var v = P(px, py);
      if (v === -1) continue;
      if (v === -2) {
        // inner fender: lit lip, black inside
        var dA = Math.min(Math.abs(Math.hypot(px + 0.5 - archR.x, py + 0.5 - archR.y) - archR.r), Math.abs(Math.hypot(px + 0.5 - archF.x, py + 0.5 - archF.y) - archF.r));
        var a2 = dA < 1.3 ? 34 : dA < 2.6 ? 20 : 10;
        put(px, py, [a2, a2, a2 + 3]); continue;
      }
      var q2 = U(px, py);
      if (v === -3) {
        // glass: interior silhouettes behind a blue-grey tint, sky on top
        var ic = [12, 14, 19], top3 = P(px, py - 1) !== -3, bot3 = P(px, py + 1) !== -3;
        for (k = 0; k < inter.length; k++) if (inPoly(inter[k][1], q2[0], q2[1])) {
          var it = inter[k][0], itop = !inPoly(inter[k][1], q2[0], q2[1] + 1 / u);
          ic = it === 'seat' ? (itop ? [70, 66, 72] : [40, 38, 44]) : [30, 30, 34];
        }
        var g = mix(ic, [74, 96, 124], 0.3);
        var streak = ((px * 2 + py * 3) % 29);
        if (streak < 3) g = mix(g, [210, 225, 240], streak === 1 ? 0.45 : 0.25);
        if (top3) g = [150, 172, 198];
        else if (bot3) g = mul(g, 0.7);
        put(px, py, g); continue;
      }
      var part = parts[v], mat = part.mat;
      // window frame / seals
      if (part.id === 'shell' && (P(px - 1, py) === -3 || P(px + 1, py) === -3 || P(px, py - 1) === -3 || P(px, py + 1) === -3)) {
        put(px, py, A.frame ? (P(px, py + 1) === -3 ? A.frame : mix(A.frame, [90, 92, 98], 0.35)) : paint(base, -0.4, baseL)); continue;
      }
      var body = BODYPART[part.id];
      var ny = body ? bodyNy(px, py) : localNy(px, py, v);
      var edgeOut = !solid(P(px - 1, py)) || !solid(P(px + 1, py)) || P(px, py + 1) === -1;
      var c;
      if (mat === 'paint') {
        var col = base;
        if (body && py > lowerPx) col = A.lower.c;
        if (stripe && body && py <= lowerPx && Math.abs(py - (beltPx + (rockPx - beltPx) * 0.3)) < 2.4 * u) col = stripe;
        var nyq = qn(ny);
        // rear face sits away from the light, the nose catches it
        if (body && px - bodyMinX < 2 && py > topB[px]) nyq -= 0.15;
        c = paint(col, nyq, lum(col));
        if (body && py > beltPx + 2 && py < rockPx - 2) {
          // soft diagonal sheen across the doors
          var sh = (px - padL) - 0.8 * (py - beltPx) - lenPx * 0.42;
          if (sh > 0 && sh < 3) c = mix(c, SKYT, 0.1);
        }
        if (edgeOut && P(px, py - 1) !== -1) c = mix(mul(col, 0.28), [8, 8, 12], 0.35);
        // panel gaps where a part sits against an earlier one
        var nb = [P(px - 1, py), P(px + 1, py), P(px, py - 1), P(px, py + 1)];
        for (k = 0; k < 4; k++) if (nb[k] >= 0 && nb[k] < v && parts[nb[k]].mat === 'paint' && !APPENDAGE[part.id]) { c = mul(c, 0.62); break; }
      } else if (mat === 'chrome') c = chrome(ny);
      else if (mat === 'bumper') c = plastic(ny, 28);
      else c = plastic(ny, 20);
      put(px, py, c);
    }

    // ---- details, lamps and panel seams on top
    function polyFill(pts, fn) {
      var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      pts.forEach(function (p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
      var X0 = Math.floor(padL + x0 * u) - 1, X1 = Math.ceil(padL + x1 * u) + 1, Y0 = Math.floor(groundY - y1 * u) - 1, Y1 = Math.ceil(groundY - y0 * u) + 1;
      for (var yy = Math.max(0, Y0); yy <= Math.min(H - 1, Y1); yy++) for (var xx = Math.max(0, X0); xx <= Math.min(W - 1, X1); xx++) {
        var q = U(xx, yy);
        if (!inPoly(pts, q[0], q[1]) || P(xx, yy) === -1) continue;
        var e = { top: !inPoly(pts, q[0], q[1] + 1 / u), bot: !inPoly(pts, q[0], q[1] - 1 / u), lf: !inPoly(pts, q[0] - 1 / u, q[1]), rt: !inPoly(pts, q[0] + 1 / u, q[1]) };
        e.edge = e.top || e.bot || e.lf || e.rt;
        var c = fn(xx, yy, e);
        if (c) put(xx, yy, c);
      }
    }
    var MAT = {
      trim: function (x, y, e) { return plastic(e.top ? 0.8 : e.bot ? -0.5 : 0, 18); },
      soft: function (x, y, e) { return e.top ? [104, 106, 112] : e.bot ? [20, 20, 24] : [50, 51, 56]; },
      handle: function (x, y, e) { return e.top ? [120, 122, 128] : e.bot ? [10, 10, 12] : [36, 36, 40]; },
      badge: function (x, y, e) { return (x + y) % 2 ? [236, 240, 248] : [150, 160, 176]; },
      chrome: function (x, y, e) { return chrome(e.top ? 0.8 : e.bot ? -0.5 : 0.25); },
      door: function (x, y, e) { return e.edge ? mul(paint(base, -0.2, baseL), 0.55) : null; },
      grille: function (x, y, e) { return e.edge ? [8, 8, 10] : ((x + y) % 2 ? [48, 49, 54] : [14, 14, 16]); },
      vent: function (x, y, e) { return e.bot ? paint(base, 0.55, baseL) : e.top ? [4, 4, 6] : [14, 14, 17]; },
      head: function (x, y, e) { return e.edge ? (e.top ? [250, 252, 255] : [70, 74, 84]) : ((x * 3 + y) % 5 === 0 ? [255, 255, 255] : (y % 2 ? [206, 216, 230] : [176, 188, 206])); },
      fog: function (x, y, e) { return e.edge ? [60, 62, 70] : [236, 236, 214]; },
      amber: function (x, y, e) { return e.edge ? (e.top ? [255, 220, 140] : [120, 60, 10]) : [244, 146, 26]; },
      tail: function (x, y, e) { return e.edge ? (e.top ? [255, 130, 120] : [96, 8, 12]) : (y % 2 ? [168, 14, 20] : [216, 32, 36]); },
      taillouvre: function (x, y, e) { return e.edge ? [40, 6, 8] : (y % 2 ? [36, 8, 10] : [222, 34, 38]); }
    };
    details.forEach(function (f) { polyFill(f[1], MAT[f[0]] || MAT.trim); });
    lamps.forEach(function (f) { polyFill(f[1], MAT[f[0]] || MAT.tail); });
    (A.pillars || []).forEach(function (f) { polyFill(f[1], function (x, y, e) { return e.lf ? [44, 46, 52] : [16, 16, 19]; }); });
    (A.seams || []).forEach(function (pl) {
      for (var s = 0; s < pl.length - 1; s++) {
        var ax = padL + pl[s][0] * u, ay = groundY - pl[s][1] * u, bx = padL + pl[s + 1][0] * u, by = groundY - pl[s + 1][1] * u;
        var n = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay))), vert = Math.abs(by - ay) > Math.abs(bx - ax);
        for (var j = 0; j <= n; j++) {
          var xx = Math.round(ax + (bx - ax) * j / n), yy = Math.round(ay + (by - ay) * j / n), o = P(xx, yy);
          if (o < 0 || parts[o].mat !== 'paint') continue;
          put(xx, yy, mul(get(xx, yy), 0.42));
          var hx = vert ? xx + 1 : xx, hy = vert ? yy : yy + 1, ho = P(hx, hy);
          if (ho >= 0 && parts[ho].mat === 'paint') { var hc = get(hx, hy); put(hx, hy, mix(hc, [255, 255, 255], 0.12)); }
        }
      }
    });
    ctx.putImageData(img, 0, 0);

    function topAt(ux) { var x = Math.round(padL + ux * u); return topB[x] >= 0 ? topB[x] : groundY; }
    if (A.helmet) {
      var hx0 = Math.round(padL + A.helmet[0] * u), hy0 = Math.round(groundY - A.helmet[1] * u);
      ctx.fillStyle = '#e8e8e8'; circle(ctx, hx0, hy0 - 2, 3.4);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(hx0 - 2, hy0 - 5, 3, 1);
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(hx0 + 1, hy0 - 3, 3, 2);
    }
    if (look.blower) {
      // polished roots case, belt drive, bug-catcher scoop
      var hx = (A.hood[0] + A.hood[1]) / 2, top = topAt(hx), bx = Math.round(padL + hx * u) - 10;
      ctx.fillStyle = '#3a3e45'; ctx.fillRect(bx - 2, top - 3, 24, 4);
      ctx.fillStyle = '#7d848f'; ctx.fillRect(bx - 2, top - 3, 24, 1);
      for (var bi = 0; bi < 10; bi++) { ctx.fillStyle = css(chrome(0.95 - bi * 0.17)); ctx.fillRect(bx, top - 13 + bi, 20, 1); }
      ctx.fillStyle = 'rgba(40,44,52,0.55)'; for (var rb = 2; rb < 20; rb += 3) ctx.fillRect(bx + rb, top - 11, 1, 7);
      ctx.fillStyle = '#1b1b1b'; ctx.fillRect(bx + 17, top - 10, 6, 8);
      ctx.fillStyle = '#5a5a5a'; ctx.fillRect(bx + 18, top - 9, 4, 1);
      ctx.fillStyle = '#26262a'; ctx.fillRect(bx + 2, top - 20, 16, 7);
      ctx.fillStyle = '#c42a2a'; ctx.fillRect(bx + 2, top - 20, 16, 2);
      ctx.fillStyle = '#ff8a7a'; ctx.fillRect(bx + 2, top - 20, 16, 1);
      ctx.fillStyle = '#060606'; ctx.fillRect(bx + 13, top - 18, 5, 4);
      ctx.fillStyle = '#9aa0aa'; ctx.fillRect(bx + 1, top - 13, 18, 1);
    } else if (look.scoop) {
      var hx2 = (A.hood[0] + A.hood[1]) / 2, top2 = topAt(hx2), sx = Math.round(padL + hx2 * u) - 10;
      for (var si = 0; si < 5; si++) { ctx.fillStyle = css(paint(base, si === 0 ? 0.95 : si === 4 ? -0.5 : 0.35 - si * 0.1, baseL)); ctx.fillRect(sx + (4 - si), top2 - 5 + si, 20 - (4 - si), 1); }
      ctx.fillStyle = '#060608'; ctx.fillRect(sx + 16, top2 - 4, 4, 4);
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
  // Pre-rendered per style / size / rotation step. Gaps between spokes are
  // left open so the brake rotor and caliper show through.
  var wheelCache = {};
  var RIMS = {
    turbine: { n: 10, w: function (p, rr) { return Math.abs(((p + rr * 0.55) % 1) - 0.5) < 0.24; } },
    mesh:    { n: 8,  w: function (p, rr) { return Math.abs(p - 0.5) < 0.13 + 0.1 * (1 - rr); } },
    five:    { n: 5,  w: function (p, rr) { return Math.abs(p - 0.5) < 0.1 + 0.17 * (1 - rr); } },
    split:   { n: 5,  w: function (p, rr) { var w = 0.055 + 0.06 * (1 - rr); return Math.abs(p - 0.38) < w || Math.abs(p - 0.62) < w || (rr < 0.42 && Math.abs(p - 0.5) < 0.22); } },
    drag:    { n: 5,  w: function (p, rr) { return Math.abs(p - 0.5) < 0.045 + 0.05 * (1 - rr); } }
  };
  function wheelImage(r, style, rim, slick, radial, step, steps, blur) {
    var key = [r, style, rim, slick, radial, step, blur].join('|');
    if (wheelCache[key]) return wheelCache[key];
    var R = Math.ceil(r) + 1, S = R * 2 + 1;
    var cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    var ctx = cv.getContext('2d'), img = ctx.createImageData(S, S), d = img.data;
    var rc = hexToRgb(rim), st = RIMS[style] || RIMS.five, rl = lum(rc);
    var rimR = r * (slick ? 0.58 : radial ? 0.64 : 0.7);
    var rot = step / steps * Math.PI * 2 / st.n;
    for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) {
      var dx = x + 0.5 - R - 0.5, dy = y + 0.5 - R - 0.5, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > r + 0.3) continue;
      var c = null, ny = -dy / Math.max(1, dist);   // facing up on the top of a ring
      if (dist > rimR) {
        // tire: tread shoulder, sidewall bulge, raised lettering on drag tires
        var sw = (dist - rimR) / (r - rimR);
        var g = sw > 0.84 ? 12 + (ny > 0.5 ? 14 : 0) : 26 + 20 * clamp01(0.5 + ny * 0.5) * (1 - Math.abs(sw - 0.45));
        if ((slick || radial) && sw > 0.3 && sw < 0.62 && ny > 0.45 && ((x + y) % 3)) g = 168 + ny * 40;
        if (sw < 0.12) g = 10;
        c = [g, g, g + 3];
      } else {
        var rr = dist / rimR, ang = Math.atan2(dy, dx) - rot;
        ang = ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        var per = ang / (Math.PI * 2) * st.n, p = per - Math.floor(per);
        if (rr > 0.86) c = paint(rc, rr > 0.95 ? (ny > 0 ? 0.9 : -0.4) : (ny > 0 ? -0.35 : 0.6), rl);   // polished lip, dish shadow
        else if (rr < 0.2) c = paint(rc, rr < 0.08 ? 0.9 : -0.1 + ny * 0.4, rl);                         // centre cap
        else if (blur) c = mix(paint(rc, 0.05 + ny * 0.2, rl), [30, 30, 34], 0.45);
        else if (st.w(p, rr)) {
          // spokes: lit leading edge, shaded trailing edge
          var edge = st.w(p - 0.05, rr) ? (st.w(p + 0.05, rr) ? 0 : -1) : 1;
          c = paint(rc, 0.18 + ny * 0.3 + edge * 0.38, rl);
          if (rr > 0.24 && rr < 0.34 && Math.abs(p - 0.5) < 0.12) c = [40, 40, 44];                     // lug nut
        }
      }
      if (!c) continue;
      var i = (y * S + x) * 4; d[i] = Math.min(255, c[0]); d[i + 1] = Math.min(255, c[1]); d[i + 2] = Math.min(255, c[2]); d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    var res = { canvas: cv, R: R };
    wheelCache[key] = res;
    return res;
  }

  function drawWheel(ctx, x, y, r, ang, look, style, spin, caliper) {
    var steps = 12, st = RIMS[style] || RIMS.five;
    var per = Math.PI * 2 / st.n;
    var blur = Math.abs(spin || 0) > 38;
    var stp = ((Math.floor(((ang % per) + per) % per / per * steps)) % steps + steps) % steps;
    var rimR = r * (look.slick ? 0.58 : look.radial ? 0.64 : 0.7);
    // barrel, brake rotor (drilled) and caliper behind the spokes
    ctx.fillStyle = '#0e0e10'; circle(ctx, x, y, rimR * 0.95);
    ctx.fillStyle = '#3c3e44'; circle(ctx, x, y, rimR * 0.74);
    ctx.fillStyle = '#5e6168'; circle(ctx, x, y - 0.8, rimR * 0.56);
    ctx.fillStyle = '#1e1f22'; circle(ctx, x, y, rimR * 0.32);
    if (caliper) {
      var cw = Math.max(3, Math.round(rimR * 0.5)), ch = Math.max(2, Math.round(rimR * 0.42));
      ctx.fillStyle = caliper; ctx.fillRect(Math.round(x + rimR * 0.12), Math.round(y - rimR * 0.86), cw, ch);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(Math.round(x + rimR * 0.12), Math.round(y - rimR * 0.86), cw, 1);
    }
    var w = wheelImage(Math.round(r * 2) / 2, style, look.rim, look.slick, look.radial, blur ? 0 : stp, steps, blur);
    ctx.drawImage(w.canvas, Math.round(x - w.R - 0.5), Math.round(y - w.R - 0.5));
  }

  // Soft contact shadow under a car, drawn on the ground before the car.
  function carShadow(ctx, spr, gx, gy, pitch) {
    var x0 = gx - (spr.wheelR.x - spr.padL), len = spr.lenPx, lift = Math.max(0, pitch) * len * 0.5;
    var k = Math.max(0.25, 1 - lift / 40);
    ctx.fillStyle = 'rgba(0,0,0,' + (0.2 * k).toFixed(3) + ')';
    ctx.fillRect(Math.round(x0 - 3), Math.round(gy - 1), len + 6, 4);
    ctx.fillStyle = 'rgba(0,0,0,' + (0.26 * k).toFixed(3) + ')';
    ctx.fillRect(Math.round(x0 + 3), Math.round(gy - 1), len - 6, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(Math.round(gx - spr.wheelR.r * 0.85), Math.round(gy - 1), Math.round(spr.wheelR.r * 1.7), 2);
    if (pitch < 0.25) ctx.fillRect(Math.round(gx + spr.wheelF.x - spr.wheelR.x - spr.wheelF.r * 0.85), Math.round(gy - 1), Math.round(spr.wheelF.r * 1.7), 2);
  }
  DR.carShadow = carShadow;

  // Draw a car with its rear tire contact at (gx, gy) in screen space.
  // pitch: nose-up radians. wheelAng: wheel rotation radians.
  // opts: {barRad, brake, chute, t, spin (rad/s), frontStill, shadow}
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
      var bl = 52, endH = Math.max(3, Math.sin(opts.barRad || 0.05) * bl);
      var ay = -spr.wheelR.r * 0.7;
      for (var i = 4; i <= bl; i++) {
        var yy = Math.round(ay + (-endH - ay) * (i / bl));
        ctx.fillStyle = '#d4dae2'; ctx.fillRect(-i, yy, 1, 1);
        ctx.fillStyle = '#6d737c'; ctx.fillRect(-i, yy + 1, 1, 1);
      }
      ctx.fillStyle = '#9aa0a8'; for (i = 10; i < bl; i += 12) ctx.fillRect(-i, Math.round(ay + (-endH - ay) * (i / bl)) - 2, 1, 4);
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

  // Screen-space lamp anchors of a drawn car (for the lighting pass).
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
})();
