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
  function rect(x0, y0, x1, y1) { return [[x0, y0, 1], [x1, y0, 1], [x1, y1, 1], [x0, y1, 1]]; }
  // Closed Catmull-Rom curve through the points; [x, y, 1] stays a corner.
  var smoothCache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function smooth(pts) {
    if (smoothCache && smoothCache.has(pts)) return smoothCache.get(pts);
    var n = pts.length, out = [];
    for (var i = 0; i < n; i++) {
      var p1 = pts[i], p2 = pts[(i + 1) % n];
      out.push([p1[0], p1[1]]);
      if (p1[2] && p2[2]) continue;
      var p0 = p1[2] ? p1 : pts[(i - 1 + n) % n], p3 = p2[2] ? p2 : pts[(i + 2) % n];
      var len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), steps = Math.max(2, Math.min(10, Math.round(len * 1.5)));
      for (var k = 1; k < steps; k++) {
        var t = k / steps, t2 = t * t, t3 = t2 * t;
        out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                  0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    if (smoothCache) smoothCache.set(pts, out);
    return out;
  }
  // x crossings of a polygon at height y, sorted (even-odd spans)
  function xsAt(pts, y) {
    var xs = [];
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var yi = pts[i][1], yj = pts[j][1];
      if ((yi > y) !== (yj > y)) xs.push(pts[i][0] + (y - yi) * (pts[j][0] - pts[i][0]) / (yj - yi));
    }
    return xs.sort(function (a, b) { return a - b; });
  }
  function bbox(pts) { var b = [1e9, 1e9, -1e9, -1e9]; pts.forEach(function (p) { b[0] = Math.min(b[0], p[0]); b[1] = Math.min(b[1], p[1]); b[2] = Math.max(b[2], p[0]); b[3] = Math.max(b[3], p[1]); }); return b; }

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
  // Built from each car's published length, wheelbase, height and
  // overhangs (x = % of length from the rear bumper, y in the same unit).
  // Outline points are smoothed into curves; [x, y, 1] marks a sharp corner.
  //  shell: the main body. kit: slot -> variants ({pts, mat, extra, lamps,
  //  details}); the look picks a variant per slot ('stock' by default).
  //  glass / pillars / interior: the greenhouse. belt: shoulder crease.
  //  creases: extra sculpt lines. rocker: bottom of the side.
  //  lamps / details: [material, polygon]. lines: [colour, polyline].
  //  seams: panel gaps (polylines). head / tail: lamp centres for lighting.
  var ART = {
    // All four are proportioned from side-view game screenshots the player
    // supplied (wheel centres, tire size, roof, cowl, hood, nose and tail
    // measured on a pixel grid); outlines, details and shading are our own.
    // wheelScale draws the wheels at the reference size (sprite only).
    // '87-'93 Mustang GT hatch: upright windshield, long flat roof, sloped
    // hatch, flat hood and a blunt nose
    fox: {
      wr: 21.3, wf: 77.7, belt: 19.0, rocker: 3.2, rim: 'pony', hood: [66, 92], frame: [16, 16, 18], wheelScale: 0.94, archGap: 1.4,
      shell: [[3.4,2.0,1],[0.8,3.0],[0,5.2,1],[0,11.6,1],[1.0,12.2,1],[1.9,18.6,1],[0.4,19.6,1],[5.5,19.7],[8.5,20.2],[15.4,22.4],[23.3,25.4],[26.6,26.8],[30,27.0],[50,27.0],[52.2,26.7],[54.9,25.6],
        [62.8,20.0],[65.2,18.6,1],[74.7,17.6],[84.6,16.8],[93.4,15.7],[96.4,14.9,1],[99.4,12.4,1],[99.2,11.0,1],[100,10.4,1],[100,5.4,1],[99.2,3.2,1],[97.6,2.0,1]],
      kit: {
        rbumper: { stock: { pts: [[1.0,12.2,1],[0,11.6,1],[0,5.2,1],[0.8,3.0],[3.4,2.0,1],[12.6,2.0,1],[12.6,12.2,1]], details: [['shade', [[0, 2.0], [12.6, 2.0], [12.6, 8.2], [0, 8.2]]], ['grille', [[0.8, 3.4], [6, 2.8], [6, 2.2], [2.4, 2.2]]]] } },
        fbumper: { stock: { pts: [[91.6,10.4,1],[91.6,2.0,1],[97.6,2.0,1],[99.2,3.2,1],[100,5.4,1],[100,10.4,1]],
          details: [['shade', [[91.6, 2.0], [100, 2.0], [100, 8.2], [91.6, 8.2]]], ['grille', [[95.4, 3.2], [99.4, 3.4], [99.8, 5.6], [95.8, 5.6]]], ['trim', [[91.6, 2.0], [97.6, 2.0], [99.2, 3.2], [91.6, 2.8]]]] } },
        skirt: { stock: { pts: [[29.6,2.0,1],[69.2,2.0,1],[69.2,5.6,1],[29.6,5.6,1]], details: [['shade', [[12.6, 2.0], [91.6, 2.0], [91.6, 8.2], [12.6, 8.2]]]] } },
        spoiler: { stock: { pts: [[0.4,19.6,1],[9.6,19.9],[10.6,20.6],[9.8,21.0],[0.6,20.6]] } },
        mirror: { stock: { mat: 'trim', pts: [[60.2,19.4],[63.4,19.4],[63.0,21.6],[60.6,21.4]] } }
      },
      glass: [[[21.6,19.2,1],[25.4,24.6],[28.4,25.9],[45,26.1,1],[45,19.2,1]], [[46.4,19.0,1],[46.4,26.1,1],[51.6,26.0],[62.5,19.0,1]]],
      pillars: [['trim', [[45, 19.0], [46.4, 19.0], [46.4, 26.1], [45, 26.1]]]],
      interior: [['seat', [[47.4, 19.0], [51, 19.0], [50.6, 22.6], [48, 23.0]]], ['head', [[48.2, 23.0], [50.6, 22.8], [50.4, 24.8], [48.4, 25.0]]],
        ['seat', [[32, 19.0], [35.6, 19.0], [35.2, 21.6], [32.4, 21.8]]], ['wheel', [[57.6, 19.4], [59, 22.2], [60, 21.6], [58.8, 19.2]]]],
      lamps: [['head', [[93.8, 13.4], [99.2, 13.2], [99.0, 15.0], [94.2, 15.4]]], ['amber', [[93.2, 10.4], [98.4, 10.4], [98.6, 12.6], [93.6, 12.6]]],
        ['taillouvre', [[1.2, 12.8], [4.6, 12.8], [4.8, 16.8], [1.7, 16.8]]]],
      details: [['handle', [[49.6, 16.6], [52.8, 16.6], [52.8, 17.3], [49.6, 17.3]]], ['badge', [[81, 13.4], [82.6, 13.4], [82.6, 14.6], [81, 14.6]]]],
      lines: [['#101012', [[65.2, 18.65], [61.2, 21.2]]]],
      seams: [[[63.6, 18.6], [64.2, 10], [63.2, 5.8]], [[44.8, 18.8], [44.6, 10], [45.6, 5.8]], [[64.8, 18.7], [91.6, 15.6]], [[12.6, 11.8], [12.6, 2.2]], [[91.6, 10.6], [91.6, 2.2]]],
      creases: [[[90, 12.8], [64, 13.4], [36, 13.6], [6, 13.2]]],
      head: [96.6, 14.2], tail: [2, 14.4], exhaust: [3.4, 3.2]
    },
    // Camaro SS: short slit greenhouse, long hood, short high deck with a
    // lip spoiler, deep sides
    camss: {
      wr: 20.2, wf: 82.4, belt: 18.7, rocker: 3.4, rim: 'five', hood: [66, 92], frame: [30, 30, 34], wheelScale: 0.95, archGap: 1.4,
      shell: [[5.4,2.8,1],[2.8,3.8,1],[0.8,6.6],[0.2,9.6],[0.4,12.6],[1.4,15.6],[2.6,19.2,1],[0.6,20.4,1],[1.0,21.0,1],[4.3,20.8],[12.3,20.6],[18.2,22.5],[24.1,24.5],[29.1,25.5],[39.9,25.9],[49.8,25.5],[56.7,23.1],[63.6,19.8,1],
        [75.5,18.9],[87.4,17.8],[94.3,16.6],[98.0,15.4],[99.4,14.6,1],[100,12.4,1],[99.2,10.0,1],[99.6,6.8],[98.8,5.4,1],[100,4.4,1],[99.8,3.4,1],[96.6,2.8,1]],
      kit: {
        rbumper: { stock: { pts: [[0.9,14.2,1],[0.4,12.6],[0.2,9.6],[0.8,6.6],[2.8,3.8,1],[5.4,2.8,1],[11,2.8,1],[11,14.2,1]], details: [['grille', [[1.4, 5.0], [8, 4.4], [8, 3.2], [3.4, 3.4]]], ['chrome', [[3.0, 4.0], [5.4, 4.0], [5.4, 4.8], [3.0, 4.8]]]],
          lamps: [['amber', [[1.0, 9.6], [3.4, 9.6], [3.4, 10.4], [1.0, 10.4]]]] } },
        fbumper: { stock: { pts: [[90,11.6,1],[90,2.8,1],[96.6,2.8,1],[99.8,3.4,1],[100,4.4,1],[98.8,5.4,1],[99.6,6.8],[99.2,10.0,1],[99.8,11.6,1]],
          details: [['grille', [[97.2, 6.0], [99.6, 6.4], [99.3, 9.8], [97.2, 9.6]]], ['grille', [[94.4, 3.8], [99.6, 4.0], [98.6, 5.2], [94.8, 5.2]]], ['trim', [[92, 2.8], [96.6, 2.8], [99.8, 3.4], [92, 3.4]]]],
          lamps: [['amber', [[96.6, 9.6], [97.4, 9.6], [97.4, 10.4], [96.6, 10.4]]]] } },
        skirt: { stock: { pts: [[28.2,2.6,1],[73.6,2.6,1],[73.6,5.0,1],[28.2,5.0,1]] } },
        spoiler: { stock: { pts: [[0.6,20.4,1],[5.6,20.8],[5.4,21.4],[0.4,21.6,1]] } },
        mirror: { stock: { mat: 'trim', pts: [[58.8,18.8],[63.2,18.8],[62.8,21.4],[59.2,21.2]] } }
      },
      glass: [[[26.6,19.9,1],[29.2,23.6],[34,24.4],[49.8,24.3],[55.6,22.6],[62.2,18.7,1],[38.4,18.6,1],[33,19.4]]],
      pillars: [['trim', [[38.6, 18.7], [39.6, 18.7], [39.6, 24.3], [38.6, 24.35]]]],
      interior: [['seat', [[44, 18.7], [48, 18.7], [47.6, 21.6], [44.6, 22.0]]], ['head', [[45, 22.0], [47.6, 21.8], [47.4, 23.6], [45.2, 23.8]]],
        ['wheel', [[55, 19.0], [56.6, 21.6], [57.6, 21.0], [56.2, 18.8]]]],
      lamps: [['headpro', [[93.4, 13.0], [99.0, 12.6], [99.5, 13.6], [99.0, 14.6], [94.0, 14.8]]], ['taildark', [[1.0, 16.6], [5.0, 16.4], [4.8, 18.6], [1.6, 18.8]]]],
      details: [['shade', [[64, 7.2], [43, 8.4], [37.6, 12.8], [35.2, 12.4], [38.4, 6.0], [64, 4.6]]], ['handle', [[41.6, 16.4], [44.8, 16.4], [44.8, 17.1], [41.6, 17.1]]], ['badge', [[78, 14.0], [81, 14.0], [81, 14.6], [78, 14.6]]]],
      lines: [['#101012', [[63.6, 19.25], [60, 21.2]]]],
      seams: [[[62.6, 18.4], [63.2, 10], [62.2, 5.4]], [[38.4, 18.4], [38.2, 10], [39, 5.4]], [[63.6, 19.0], [90, 16.6]], [[11, 12.6], [11, 3.0]], [[90, 11.6], [90, 3.0]]],
      creases: [[[64, 17.4], [40, 17.6], [14, 18.4]], [[90, 12.8], [74, 13.4]]],
      head: [96, 14.6], tail: [2.6, 16.8], exhaust: [3.2, 4.0]
    },
    // AE86 Sprinter Trueno hatch: wedge nose with pop-ups, tall airy
    // greenhouse, hatch with a lip spoiler, black bumpers, panda two-tone
    hachi: {
      wr: 23.3, wf: 80.4, belt: 21.1, rocker: 3.6, rim: 'mesh', hood: [70, 98], frame: [18, 18, 20], wheelScale: 0.94, archGap: 1.4,
      lower: { y: 11.4, c: [24, 24, 27] },
      shell: [[2.8,3.9,1],[0.9,4.8],[0,6.5],[0,9.8],[0.6,11.8,1],[1.5,15.2],[2.5,19.0],[2.7,21.8,1],[0.9,22.7,1],[6.0,24.8],[14.7,26.7],[23.3,28.7],[29.7,30.2],[33,30.6],[50,30.6],[52.4,30.4],
        [54.5,29.5],[61,25.4],[68.5,21.1,1],[81.5,19.7],[92,19.3],[98.7,19.0,1],[98.3,14.7,1],[100,13.4,1],[100,8.6,1],[99.1,4.7,1],[95.5,3.9,1]],
      kit: {
        rbumper: { stock: { mat: 'bumper', pts: [[0.6,11.8,1],[0,9.8],[0,6.5],[0.9,4.8],[2.8,3.9,1],[9.8,3.9,1],[9.8,11.8,1]], details: [['chrome', [[2.4, 5.7], [9.8, 5.7], [9.8, 6.3], [2.2, 6.3]]]] } },
        fbumper: { stock: { mat: 'bumper', pts: [[93.4,13.4,1],[93.4,3.9,1],[95.5,3.9,1],[99.1,4.7,1],[100,8.6,1],[100,13.4,1]],
          details: [['grille', [[96.4, 6.2], [99.6, 6.8], [99.6, 8.4], [96.4, 8.2]]]],
          lamps: [['amber', [[94.2, 13.6], [98.4, 13.6], [98.4, 14.5], [94.2, 14.5]]]] } },
        skirt: { stock: { mat: 'bumper', pts: [[31.6,3.4,1],[72,3.4,1],[72,5.0,1],[31.6,5.0,1]] } },
        spoiler: { stock: { mat: 'trim', pts: [[0.9,22.7,1],[6.0,24.6],[5.4,25.4],[-1.7,24.5],[-1.5,23.6,1]] } },
        mirror: { stock: { mat: 'trim', pts: [[62.6,21.4],[65.8,21.4],[65.4,23.8],[63,23.6]] } }
      },
      glass: [[[15.0,21.1,1],[16.0,24.1],[23.3,27.4],[29.7,28.9],[38.0,28.9,1],[38.0,21.1,1]], [[39.4,21.1,1],[39.4,28.9,1],[52.4,28.9],[63.8,21.1,1]]],
      pillars: [['trim', [[38.0, 21.1], [39.4, 21.1], [39.4, 28.9], [38.0, 28.9]]]],
      interior: [['seat', [[44, 21.1], [48, 21.1], [47.6, 24.6], [44.6, 25.0]]], ['head', [[45, 25.0], [47.6, 24.8], [47.4, 26.8], [45.2, 27.0]]],
        ['seat', [[28.4, 21.1], [32, 21.1], [31.6, 23.8], [28.8, 24.0]]], ['head', [[29, 24.0], [31.6, 23.8], [31.4, 25.6], [29.2, 25.8]]],
        ['wheel', [[56.4, 21.4], [58.2, 24.6], [59.2, 24.0], [57.6, 21.0]]]],
      lamps: [['tail', [[2.1, 16.8], [4.9, 16.8], [5.1, 19.8], [2.5, 19.8]]], ['amber', [[1.3, 13.9], [4.5, 13.9], [4.9, 16.8], [2.1, 16.8]]]],
      details: [['handle', [[41.4, 18.6], [44.4, 18.6], [44.4, 19.3], [41.4, 19.3]]], ['door', [[13.4, 15.6], [16, 15.6], [16, 17.8], [13.4, 17.8]]],
        ['badge', [[84, 16.0], [87.2, 16.0], [87.2, 16.6], [84, 16.6]]]],
      lines: [['#101012', [[68.5, 21.15], [64.4, 23.4]]]],
      creases: [[[92, 13.8], [60, 13.8], [30, 14.0], [6, 13.8]]],
      seams: [[[67.4, 20.9], [67.8, 12.8]], [[37.6, 20.7], [37.4, 12.8]], [[91, 19.2], [91, 18.2], [98.4, 18.0]], [[68.6, 20.6], [91, 19.2]], [[9.8, 11.8], [9.8, 4.0]], [[93.4, 13.4], [93.4, 4.0]]],
      head: [98.8, 14.0], tail: [2.6, 18.3], exhaust: [6.0, 4.6]
    },
    // A80 Supra: low cowl, long nose with oval lamps and a big front arch,
    // long flat roof, high rounded tail with round lamps and the hoop wing
    supra: {
      wr: 22.8, wf: 79.0, belt: 18.2, rocker: 3.0, rim: 'five', hood: [64, 92], frame: [14, 14, 16], wheelScale: 0.86, archGap: 1.4,
      shell: [[6.2,3.0,1],[3.6,3.8,1],[1.8,5.2],[0.6,7.6],[0,11.0],[0.2,13.2,1],[0.6,16.0],[1.4,18.2],[2.8,19.4],[4.8,19.9,1],[8.8,20.1],[15.4,21.9],[22.8,24.0],[27.5,25.5],[30,26.0],[45.3,26.0],[48.1,25.5],[55.6,22.4],[64.0,18.7,1],
        [73.4,17.4],[80,17.0],[86,16.3],[90.3,15.3],[93.6,14.3],[97.4,12.5],[99.3,10.8],[100,9.0,1],[99.3,6.6],[99.6,4.4,1],[99.0,3.0,1],[96.6,2.4,1]],
      kit: {
        rbumper: { stock: { pts: [[0.2,13.2,1],[0,11.0],[0.6,7.6],[1.8,5.2],[3.6,3.8,1],[6.2,3.0,1],[12.4,3.0,1],[12.4,13.2,1]],
          details: [['grille', [[1.2, 5.2], [7, 4.4], [7, 3.4], [3.0, 3.6]]]],
          lamps: [['amber', [[7.4, 9.2], [10.4, 9.2], [10.4, 10.0], [7.4, 10.0]]]] } },
        fbumper: { stock: { pts: [[87.8,10.8,1],[87.8,2.4,1],[96.6,2.4,1],[99.0,3.0,1],[99.6,4.4,1],[99.3,6.6],[100,9.0,1],[99.6,10.8,1]],
          details: [['grille', [[95.8, 4.8], [99.2, 5.0], [99.4, 7.8], [96.2, 7.6]]], ['grille', [[91, 3.4], [95, 3.4], [95, 4.6], [91, 4.6]]], ['trim', [[88.2, 2.4], [96.6, 2.4], [99.0, 3.0], [88.2, 3.0]]]],
          lamps: [['amber', [[90.6, 7.4], [93.6, 7.4], [93.6, 8.2], [90.6, 8.2]]]] } },
        skirt: { stock: { pts: [[30.6,2.4,1],[71.2,2.4,1],[71.2,4.6,1],[30.6,4.6,1]], details: [['trim', [[30.6, 2.4], [71.2, 2.4], [71.2, 3.0], [30.6, 3.0]]]] } },
        spoiler: { stock: { pts: [[-0.6,24.6],[6.0,25.0],[6.8,25.8],[5.8,26.4],[0.2,26.4],[-1.0,25.6]],
          extra: [[[8.6,20.0,1],[14.4,21.4,1],[6.8,25.1,1],[2.4,25.1,1]]] } },
        mirror: { stock: { pts: [[54.6,18.4],[58.8,18.4],[58.3,21.0],[55,20.8]] } }
      },
      glass: [[[27.5,21.4,1],[30,24.4],[36,25.2],[46.3,25.2],[56.2,18.3,1],[32.2,18.3,1]]],
      pillars: [['trim', [[37.6, 18.3], [38.5, 18.3], [38.5, 25.1], [37.6, 25.1]]]],
      interior: [['seat', [[42, 18.3], [46, 18.3], [45.6, 21.4], [42.6, 21.8]]], ['head', [[43, 21.8], [45.6, 21.6], [45.4, 23.4], [43.2, 23.6]]],
        ['wheel', [[52.4, 18.6], [54, 21.2], [55, 20.6], [53.6, 18.4]]]],
      lamps: [['headpro', [[90.8, 12.6], [93.4, 11.0], [97.4, 10.4], [98.4, 11.4], [95.8, 12.8], [91.4, 13.6]]],
        ['taildark', [[0.9, 15.0], [2.1, 14.3], [3.6, 14.5], [4.0, 16.0], [3.2, 17.4], [1.6, 17.4]]]],
      details: [['shade', [[63, 4.4], [38, 5.0], [34.6, 5.4], [36.8, 9.0], [44, 7.4], [63, 7.0]]], ['grille', [[31.8, 5.6], [34.4, 5.4], [37.0, 9.0], [35.0, 9.2]]], ['handle', [[40, 15.6], [43, 15.6], [43, 16.3], [40, 16.3]]]],
      lines: [['#101012', [[64.0, 18.75], [58.6, 20.9]]]],
      seams: [[[63.0, 18.4], [63.8, 10], [62.8, 4.6]], [[37.2, 18.2], [36.8, 10], [37.8, 4.6]], [[64.4, 18.5], [87.8, 15.4]], [[12.4, 11.4], [12.4, 3.2]], [[87.8, 10.8], [87.8, 2.8]]],
      creases: [[[70, 6.4], [52, 5.8], [34, 6.6]], [[30, 15.2], [18, 15.8], [6, 15.4]], [[92, 12.4], [78, 14.0], [64.4, 15.0]]],
      head: [95.6, 12.0], tail: [1.8, 15.8], exhaust: [3.6, 4.0]
    }
  };
  DR.CAR_ART = ART;
  // slots in draw order; appendages are thin parts shaded on their own
  var SLOTS = ['skirt', 'rbumper', 'fbumper', 'hood', 'spoiler', 'mirror'];
  var APPENDAGE = { spoiler: 1, mirror: 1, wing: 1, upright: 1, addon: 1 };
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
      kit: inst.kit || null, vis: inst.vis && Object.keys(inst.vis).length ? inst.vis : null,
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
  // Paint is shaded from a fixed seven-step ramp built from the colour
  // (three highlights, the base, three shadows), like hand-made pixel-art
  // palettes: big flat areas of one tone instead of smooth gradients.
  function rgb2hsv(c) {
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
    if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, mx ? d / mx : 0, mx];
  }
  function hsv2rgb(h, sat, v) {
    var i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - sat), q = v * (1 - f * sat), t = v * (1 - (1 - f) * sat), r, g, b;
    switch (i % 6) { case 0: r = v; g = t; b = p; break; case 1: r = q; g = v; b = p; break; case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break; case 4: r = t; g = p; b = v; break; default: r = v; g = p; b = q; }
    return [r * 255, g * 255, b * 255];
  }
  var rampCache = {};
  function rampOf(base) {
    var key = (base[0] | 0) + ',' + (base[1] | 0) + ',' + (base[2] | 0);
    if (rampCache[key]) return rampCache[key];
    var hsv = rgb2hsv(base), h = hsv[0], sat = hsv[1], v = hsv[2], dark = v < 0.35;
    function lt(k, cap, ds, n) {
      var vv = Math.max(v + 0.012 * n, Math.min(cap, v * k)), c = hsv2rgb(h, sat * ds, Math.min(1, vv));
      return dark ? mix(c, [150, 160, 182], 0.1 + 0.12 * n) : c;          // dark paints keep a clear-coat sheen
    }
    var r = [lt(1.55, 0.93, 0.66, 3), lt(1.42, 0.9, 0.79, 2), lt(1.3, 0.88, 0.92, 1), base.slice(),
      hsv2rgb(h, sat, v * 0.69), hsv2rgb(h, sat, v * 0.53), hsv2rgb(h, Math.min(1, sat * 1.05), v * 0.41)];
    rampCache[key] = r;
    return r;
  }
  function paint(base, ny, lm) {
    var r = rampOf(base);
    return (ny > 0.82 ? r[0] : ny > 0.42 ? r[1] : ny > 0.16 ? r[2] : ny > -0.1 ? r[3] : ny > -0.3 ? r[4] : ny > -0.55 ? r[5] : r[6]).slice();
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

  // carbon fibre weave
  function carbon(px, py, ny) {
    var w = ((px >> 1) + (py >> 1)) % 2 ? 34 : 22, l = ny > 0.6 ? 40 : ny < -0.3 ? -8 : 0;
    return [w + l, w + l, w + 4 + l];
  }

  // Aftermarket body kit, generated from each car's own geometry so every
  // part fits every car. vis: {fbumper, rbumper, skirt, spoiler, hood: tier
  // 1-3, roof, tips: 1+}
  function bodyKit(vis, A, shellS, parts, details, look, u) {
    function add(mat, pts) { parts.push({ id: 'addon', mat: mat, pts: pts }); }
    function stockBox(slot, fallback) { var v = A.kit && A.kit[slot] && A.kit[slot].stock; return v ? bbox(v.pts) : fallback; }
    var fb = stockBox('fbumper', [90, 4, 100, 12]), rb = stockBox('rbumper', [0, 4, 10, 12]);
    var ws = A.wheelScale || 1, rk = A.rocker || 5, arch = (Math.max(0.31 * PPM, look.tireR * PPM * 0.92) * ws + 3) / u;
    var y0, x0, t;
    if ((t = vis.fbumper)) {
      y0 = fb[1]; x0 = fb[0];
      if (t === 1) add('paint', [[x0 + 2, y0 + 0.3, 1], [100, y0 + 0.4, 1], [100.6, y0 - 1.0, 1], [x0 + 3, y0 - 1.1, 1]]);
      if (t === 2) {
        add('paint', [[x0 + 1.5, y0 + 0.3, 1], [100.2, y0 + 0.4, 1], [100.6, y0 - 1.1, 1], [x0 + 2.5, y0 - 1.2, 1]]);
        add('trim', [[x0 + 3, y0 - 1.0, 1], [101.2, y0 - 1.0, 1], [101.4, y0 - 1.5, 1], [x0 + 3, y0 - 1.5, 1]]);
        add('trim', [[98.6, y0 + 3.2, 1], [101.2, y0 + 3.6, 1], [99, y0 + 4.4, 1]]);
      }
      if (t === 3) {
        add('carbon', [[x0 + 0.5, y0 + 0.3, 1], [100.4, y0 + 0.5, 1], [102.4, y0 - 1.2, 1], [102.2, y0 - 1.7, 1], [x0 + 1.5, y0 - 1.7, 1]]);
        add('carbon', [[98.4, y0 + 3.0, 1], [101.6, y0 + 3.4, 1], [98.8, y0 + 4.4, 1]]);
        details.push(['vent', [[x0 + 2.5, y0 + 1.2], [x0 + 6.5, y0 + 1.2], [x0 + 6.5, y0 + 3.2], [x0 + 3, y0 + 3.2]]]);
      }
    }
    if ((t = vis.rbumper)) {
      y0 = rb[1]; var x1 = rb[2];
      if (t === 1) add('paint', [[0.6, y0 + 0.3, 1], [x1 - 1, y0 + 0.3, 1], [x1 - 2, y0 - 1.0, 1], [1.2, y0 - 1.0, 1]]);
      if (t >= 2) {
        add(t === 3 ? 'carbon' : 'trim', [[0.2, y0 + 0.3, 1], [x1 - 0.6, y0 + 0.3, 1], [x1 - 1.4, y0 - (t === 3 ? 1.5 : 1.1), 1], [-0.6, y0 - (t === 3 ? 1.6 : 1.2), 1]]);
        for (var fx = 1.5; fx < x1 - 2; fx += 2.4) add(t === 3 ? 'carbon' : 'trim', [[fx, y0 - 0.5, 1], [fx + 0.45, y0 - 0.5, 1], [fx + 0.45, y0 - (t === 3 ? 2.2 : 1.8), 1], [fx, y0 - (t === 3 ? 2.2 : 1.8), 1]]);
      }
    }
    if ((t = vis.skirt)) {
      var xa = A.wr + arch + 0.4, xb = A.wf - arch - 0.4;
      if (t === 1) add('paint', [[xa, rk + 0.4, 1], [xb, rk + 0.4, 1], [xb - 0.6, rk - 1.0, 1], [xa + 0.6, rk - 1.0, 1]]);
      if (t === 2) {
        add('paint', [[xa, rk + 0.4, 1], [xb, rk + 0.4, 1], [xb - 0.5, rk - 1.0, 1], [xa + 0.5, rk - 1.0, 1]]);
        add('trim', [[xa + 0.5, rk - 0.7, 1], [xb - 0.5, rk - 0.7, 1], [xb - 0.6, rk - 1.2, 1], [xa + 0.6, rk - 1.2, 1]]);
      }
      if (t === 3) add('carbon', [[xa, rk + 0.3, 1], [xb, rk + 0.3, 1], [xb + 1.2, rk - 1.2, 1], [xa - 1.2, rk - 1.2, 1]]);
    }
    if ((t = vis.spoiler) && !look.wing) {
      var d1 = topOf(shellS, 2.5), d2 = topOf(shellS, 10), h0;
      if (t === 1) add('paint', [[1.2, d1 - 0.3, 1], [10, d2 - 0.3, 1], [10.6, d2 + 0.5, 1], [3, d1 + 1.7, 1], [1.0, d1 + 1.1, 1]]);
      if (t === 2) {
        h0 = Math.max(d1, d2) + 3.2;
        add('trim', [[3, d1 - 0.5, 1], [4, d1 - 0.5, 1], [4.4, h0, 1], [3.4, h0, 1]]);
        add('trim', [[9, d2 - 0.5, 1], [10, d2 - 0.5, 1], [10.2, h0, 1], [9.2, h0, 1]]);
        add('paint', [[-0.6, h0, 1], [12.4, h0 + 0.2, 1], [13, h0 + 1.0, 1], [11.4, h0 + 1.6, 1], [0, h0 + 1.5, 1]]);
      }
      if (t === 3) {
        h0 = Math.max(d1, d2) + 7;
        add('trim', [[3.2, d1 - 0.5, 1], [4.4, d1 - 0.5, 1], [4.8, h0, 1], [3.6, h0, 1]]);
        add('trim', [[10, d2 - 0.5, 1], [11.2, d2 - 0.5, 1], [11.4, h0, 1], [10.2, h0, 1]]);
        add('carbon', [[-2.4, h0, 1], [15.6, h0 + 0.3, 1], [16.6, h0 + 1.3, 1], [15, h0 + 2.4, 1], [-1.8, h0 + 2.2, 1]]);
        add('trim', [[-3.2, h0 - 2, 1], [-1.8, h0 - 2, 1], [-1.8, h0 + 3.6, 1], [-3.2, h0 + 3.6, 1]]);
      }
    }
    if ((t = vis.hood)) {
      var ha = A.hood[0], hb = A.hood[1];
      if (t === 1) [0.3, 0.55].forEach(function (f) {
        var xv = ha + (hb - ha) * f, ty = topOf(shellS, xv), ty2 = topOf(shellS, xv + 4);
        details.push(['vent', [[xv, ty - 0.45], [xv + 4, ty2 - 0.45], [xv + 4, ty2 - 1.2], [xv, ty - 1.2]]]);
      });
      if (t === 2) {
        var c0 = ha - 1, c1 = ha + (hb - ha) * 0.65, tc0 = topOf(shellS, c0 + 0.5), tc1 = topOf(shellS, c1);
        add('paint', [[c0, tc0 - 0.4, 1], [c1, tc1 - 0.4, 1], [c0 + 3, tc0 + 1.5], [c0, tc0 + 1.6, 1]]);
        details.push(['vent', [[c0, tc0 + 0.1], [c0 + 0.7, tc0 + 0.1], [c0 + 0.7, tc0 + 1.3], [c0, tc0 + 1.3]]]);
      }
      if (t === 3) {
        var band = [], n = 12, i2;
        for (i2 = 0; i2 <= n; i2++) { var xh = ha + (hb - ha) * i2 / n; band.push([xh, topOf(shellS, xh) + 0.6]); }
        for (i2 = n; i2 >= 0; i2--) { var xh2 = ha + (hb - ha) * i2 / n; band.push([xh2, topOf(shellS, xh2) - 1.2]); }
        details.push(['carbon', band]);
      }
    }
    if (vis.roof) {
      var rx = 0, ry = 0;
      shellS.forEach(function (p) { if (p[1] > ry) { ry = p[1]; rx = p[0]; } });
      var r1 = topOf(shellS, rx - 3), r2 = topOf(shellS, rx + 3);
      add('paint', [[rx - 3.5, r1 - 0.3, 1], [rx + 3, r2 - 0.3, 1], [rx + 3, r2 + 1.2, 1], [rx - 0.5, r2 + 1.0, 1]]);
      details.push(['vent', [[rx + 2.4, r2 + 0.1], [rx + 3.2, r2 + 0.1], [rx + 3.2, r2 + 1.2], [rx + 2.4, r2 + 1.2]]]);
    }
    if (vis.tips) {
      var ey = A.exhaust ? A.exhaust[1] : 5;
      add('chrome', [[-1.6, ey - 0.6, 1], [2, ey - 0.6, 1], [2, ey + 0.7, 1], [-1.6, ey + 0.7, 1]]);
      details.push(['vent', [[-1.6, ey - 0.4], [-1.1, ey - 0.4], [-1.1, ey + 0.5], [-1.6, ey + 0.5]]]);
    }
    if (vis.vinyl === 1) {
      var fx0 = A.wf - arch - 7.5, ry0 = rk + 2.6;
      details.push(['decal', [[fx0, ry0], [fx0 + 5, ry0], [fx0 + 5, ry0 + 1.6], [fx0, ry0 + 1.6]]]);
      details.push(['decal', [[A.wr + arch + 1.5, ry0 + 0.2], [A.wr + arch + 5.5, ry0 + 0.2], [A.wr + arch + 5.5, ry0 + 1.5], [A.wr + arch + 1.5, ry0 + 1.5]]]);
    }
  }

  // ------------------------------------------------------------ car sprite
  DR.carSprite = function (look) {
    var key = JSON.stringify(look);
    if (spriteCache[key]) return spriteCache[key];
    var A = artFor(look);
    var lenPx = Math.round(look.len * PPM);
    var u = lenPx / 100;
    var kit = look.kit || {};

    // ---- assemble the parts
    var parts = [{ id: 'shell', mat: 'paint', pts: smooth(A.shell) }];
    var lamps = (A.lamps || []).slice(), details = (A.details || []).slice();
    SLOTS.forEach(function (slot) {
      var vs = A.kit && A.kit[slot]; if (!vs) return;
      if (slot === 'spoiler' && (look.wing || (look.vis && look.vis.spoiler))) return;   // an aftermarket wing replaces it
      var v = vs[kit[slot] || 'stock']; if (!v) return;
      parts.push({ id: slot, mat: v.mat || 'paint', pts: smooth(v.pts) });
      (v.extra || []).forEach(function (e) { parts.push({ id: slot === 'spoiler' ? 'upright' : slot, mat: v.mat || 'paint', pts: smooth(e) }); });
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
    var shellS = parts[0].pts;
    if (look.blower || look.scoop) {
      var hx = (A.hood[0] + A.hood[1]) / 2, hy = topOf(shellS, hx), k5 = 4.6 / look.len;   // ~0.046 m units
      if (look.blower) {
        // roots blower: polished case on a black manifold, belt drive in
        // front, bug-catcher scoop with a red lid on top
        parts.push({ id: 'addon', mat: 'trim', pts: rect(hx - 6.5 * k5, hy - 0.6, hx + 6.8 * k5, hy + 1.3 * k5) });
        parts.push({ id: 'addon', mat: 'chrome', pts: rect(hx - 5.6 * k5, hy + 1.3 * k5, hx + 5.6 * k5, hy + 5.6 * k5) });
        parts.push({ id: 'addon', mat: 'trim', pts: rect(hx + 5.6 * k5, hy + 1.6 * k5, hx + 7.4 * k5, hy + 4.8 * k5) });
        parts.push({ id: 'addon', mat: 'trim', pts: [[hx - 4.4 * k5, hy + 5.6 * k5, 1], [hx + 4.4 * k5, hy + 5.6 * k5, 1], [hx + 4.0 * k5, hy + 9.4 * k5, 1], [hx - 4.4 * k5, hy + 9.4 * k5, 1]] });
        parts.push({ id: 'addon', mat: 'red', pts: rect(hx - 4.6 * k5, hy + 9.4 * k5, hx + 4.2 * k5, hy + 10.4 * k5) });
        details.push(['vent', [[hx + 2.2 * k5, hy + 6.2 * k5], [hx + 4.1 * k5, hy + 6.2 * k5], [hx + 3.9 * k5, hy + 9.0 * k5], [hx + 2.2 * k5, hy + 9.0 * k5]]]);
        for (var rb = -4.4; rb < 4.6; rb += 1.6) details.push(['rib', rect(hx + rb * k5, hy + 2.0 * k5, hx + (rb + 0.5) * k5, hy + 5.0 * k5)]);
      } else {
        parts.push({ id: 'addon', mat: 'paint', pts: [[hx - 8 * k5, hy - 0.4, 1], [hx + 5 * k5, hy - 0.4, 1], [hx + 5 * k5, hy + 2.2 * k5, 1], [hx - 2 * k5, hy + 2.0 * k5], [hx - 6 * k5, hy + 0.8 * k5]] });
        details.push(['vent', rect(hx + 3.4 * k5, hy + 0.2 * k5, hx + 5 * k5, hy + 2.0 * k5)]);
      }
    }
    if (look.vis) bodyKit(look.vis, A, shellS, parts, details, look, u);
    parts.forEach(function (p) { p.bb = bbox(p.pts); });
    var glassS = (A.glass || []).map(function (g) { return smooth(g); });
    var maxY = 0, minX = 0;
    parts.forEach(function (p) { p.pts.forEach(function (q) { if (q[1] > maxY) maxY = q[1]; if (q[0] < minX) minX = q[0]; }); });
    var padL = 8 + Math.ceil(-minX * u), padT = 30;
    var W = lenPx + padL + 8, H = Math.ceil(maxY * u) + padT + 2;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    var img = ctx.createImageData(W, H), d = img.data;
    var base = hexToRgb(look.color), baseL = lum(base);
    var vis = look.vis || {}, finish = vis.finish || 0, tint = vis.tint || 0, vinyl = vis.vinyl || 0;
    var vinylCol = look.stripe ? hexToRgb(look.stripe) : baseL > 0.5 ? [22, 22, 26] : [238, 238, 240];
    // paint finishes: metallic flake, pearl colour shift, deep candy, flat matte
    function finished(col, ny, lm, px, py) {
      if (finish === 'matte') return paint(col, ny * 0.42, 0.95);
      if (finish === 3) {                                   // candy: richer, deeper colour
        var g = (col[0] + col[1] + col[2]) / 3, sat = [g + (col[0] - g) * 1.35, g + (col[1] - g) * 1.35, g + (col[2] - g) * 1.35].map(function (v) { return Math.max(0, Math.min(255, v)); });
        return paint(sat, ny * 1.18, lm * 0.7);
      }
      var c = paint(col, ny, lm);
      if (finish === 1) { c = paint(col, ny * 1.12, lm); if (ny > -0.2 && ((px * 7 + py * 13) ^ (px * py)) % 41 === 0) c = mix(c, [255, 255, 255], 0.16); }   // metallic flake
      if (finish === 2) c = ny > 0.05 ? mix(c, [236, 214, 255], 0.3 * ny) : mix(c, [40, 70, 120], -0.25 * ny);       // pearl
      return c;
    }
    // vinyl artwork in units: side slashes (2) or flames (3)
    function vinylAt(xu, yu) {
      var rk = A.rocker || 5, bt = A.belt;
      if (yu < rk + 1 || yu > bt - 0.6) return null;
      if (vinyl === 2) {
        var t = xu + (yu - rk) * 1.25;
        if ((t > 50 && t < 53.5) || (t > 55.5 && t < 57.5)) return vinylCol;
        return null;
      }
      if (vinyl === 3) {
        var band = (yu - rk) / 1.7, k = Math.floor(band), f = band - k;
        var hk = Math.sin(k * 12.9898 + 4.1) * 43758.5453; hk -= Math.floor(hk);
        var len = 34 + 28 * hk;
        var tip = 99 - len * (1 - Math.abs(f - 0.5) * 1.4);
        if (xu < tip) return null;
        var dd = xu - tip;
        return dd < 0.5 ? [110, 14, 10] : dd < 2 ? [214, 40, 24] : dd < 6 ? [255, 128, 24] : [255, 214, 70];
      }
      return null;
    }
    var stripe = look.stripe ? hexToRgb(look.stripe) : null;
    var groundY = H - 1;
    // wheelScale: drawn wheel size for cars whose art reads better with a
    // slightly smaller wheel (sprite only, physics keeps the real tire)
    var ws = A.wheelScale || 1;
    var rR = look.tireR * PPM * ws, rF = look.frontR * PPM * ws, stockR = 0.31 * PPM * ws;
    var wheelR = { x: padL + A.wr * u, y: groundY - rR, r: rR };
    var wheelF = { x: padL + A.wf * u, y: groundY - rF, r: rF };
    var gap = A.archGap != null ? A.archGap : 3;
    var archR = { x: wheelR.x, y: groundY - stockR, r: Math.max(stockR, rR * 0.92) + gap };
    var archF = { x: wheelF.x, y: groundY - stockR, r: Math.max(stockR, rF) + gap };
    function U(px, py) { return [(px - padL + 0.5) / u, (groundY - py + 0.5) / u]; }
    function inArch(px, py, a) { var dx = px + 0.5 - a.x, dy = py + 0.5 - a.y; return dx * dx + dy * dy < a.r * a.r && py + 0.5 > a.y - a.r * 0.95; }
    function put(px, py, c) { if (px < 0 || py < 0 || px >= W || py >= H) return; var i = (py * W + px) * 4; d[i] = Math.max(0, Math.min(255, c[0])); d[i + 1] = Math.max(0, Math.min(255, c[1])); d[i + 2] = Math.max(0, Math.min(255, c[2])); d[i + 3] = 255; }
    function get(px, py) { var i = (py * W + px) * 4; return [d[i], d[i + 1], d[i + 2]]; }

    // ---- raster: which part owns each pixel (-1 empty, -2 arch, -3 glass)
    var pid = new Int16Array(W * H).fill(-1), px, py, i, k;
    // scanline fill: each pixel centre takes the last part covering it
    function fillPoly(pts, fn) {
      var b = bbox(pts), r0 = Math.max(0, Math.floor(groundY - b[3] * u)), r1 = Math.min(H - 1, Math.ceil(groundY - b[1] * u));
      for (var yy = r0; yy <= r1; yy++) {
        var xs = xsAt(pts, (groundY - yy + 0.5) / u);
        for (var e = 0; e + 1 < xs.length; e += 2) {
          var a0 = Math.max(0, Math.ceil(padL + xs[e] * u - 0.5)), a1 = Math.min(W - 1, Math.floor(padL + xs[e + 1] * u - 0.5));
          for (var xx = a0; xx <= a1; xx++) fn(xx, yy);
        }
      }
    }
    parts.forEach(function (p, idx) { fillPoly(p.pts, function (x, y) { pid[y * W + x] = idx; }); });
    glassS.forEach(function (g) { fillPoly(g, function (x, y) { if (pid[y * W + x] === 0) pid[y * W + x] = -3; }); });
    if (!A.rail) for (py = 0; py < H; py++) for (px = 0; px < W; px++) {
      var o0 = pid[py * W + px];
      if ((o0 >= 0 && BODYPART[parts[o0].id] || o0 === -3) && (inArch(px, py, archR) || inArch(px, py, archF))) pid[py * W + px] = -2;
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
      else if (py < beltPx + 3.5) ny = 0.3;                  // lit shoulder band under the belt line
      else {
        var t = clamp01((py - beltPx) / Math.max(4, rockPx - beltPx));
        ny = t < 0.45 ? 0.12 - 0.1 * t : -0.18 - 0.16 * t;   // reflection horizon partway down
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
        var a2 = dA < 1.1 ? 26 : dA < 2.2 ? 12 : 6;
        put(px, py, [a2, a2, a2 + 3]); continue;
      }
      var q2 = U(px, py);
      if (v === -3) {
        // glass: interior silhouettes behind a blue-grey tint, sky on top
        var ic = [12, 14, 19], top3 = P(px, py - 1) !== -3, bot3 = P(px, py + 1) !== -3;
        for (k = 0; k < inter.length; k++) if (inPoly(inter[k][1], q2[0], q2[1])) {
          var it = inter[k][0], itop = !inPoly(inter[k][1], q2[0], q2[1] + 1 / u);
          ic = it === 'seat' || it === 'head' ? (itop ? [52, 50, 58] : [32, 30, 36]) : [20, 20, 24];
        }
        var g = mix(ic, [24, 28, 36], 0.3);
        if (((px * 2 + py * 3) % 53) === 0) g = mix(g, [180, 196, 216], 0.12);   // the odd glint
        if (tint) g = mix(g, [6, 8, 12], tint === 2 ? 0.62 : 0.36);
        if (top3) g = tint ? [70, 82, 98] : [96, 110, 130];
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
        if (vinyl && body && py <= lowerPx) {
          var vc = vinylAt(q2[0], q2[1]);
          if (vc) { col = vc; }
        }
        c = finished(col, nyq, lum(col), px, py);
        if (body && py > beltPx + 2 && py < rockPx - 2 && finish !== 'matte') {
          // soft diagonal sheen across the doors
          var sh = (px - padL) - 0.8 * (py - beltPx) - lenPx * 0.42;
          if (sh > 0 && sh < 2) c = mix(c, SKYT, 0.04);
        }
        if (edgeOut && P(px, py - 1) !== -1) c = mix(mul(col, 0.28), [8, 8, 12], 0.35);
        // panel gaps where a part sits against an earlier one
        var nb = [P(px - 1, py), P(px + 1, py), P(px, py - 1), P(px, py + 1)];
        for (k = 0; k < 4; k++) if (nb[k] >= 0 && nb[k] < v && parts[nb[k]].mat === 'paint' && !APPENDAGE[part.id]) { c = mul(c, 0.82); break; }
      } else if (mat === 'chrome') c = chrome(ny);
      else if (mat === 'bumper') c = plastic(ny, 28);
      else if (mat === 'red') c = paint([200, 30, 30], ny, 0.3);
      else if (mat === 'carbon') c = carbon(px, py, ny);
      else c = plastic(ny, 20);
      put(px, py, c);
    }

    // ---- soft edges: empty pixels on the silhouette get the outline colour
    // at the fraction of the pixel the body covers (4x4 supersampling)
    var edgeC = mix(mul(base, 0.3), [8, 8, 12], 0.35), aaList = [];
    for (py = 1; py < H - 1; py++) for (px = 1; px < W - 1; px++) {
      if (P(px, py) !== -1) continue;
      var nbS = solid(P(px - 1, py)) || solid(P(px + 1, py)) || solid(P(px, py - 1)) || solid(P(px, py + 1));
      if (!nbS) continue;
      // horizontal coverage of the pixel by the union of parts, 4 sub-rows
      var cov = 0, lx = (px - padL) / u, rx = (px + 1 - padL) / u;
      for (var sy = 0; sy < 4; sy++) {
        var qy = (groundY - py + 1 - (sy + 0.5) / 4) / u, best = 0;
        for (i = 0; i < parts.length; i++) {
          var b2 = parts[i].bb; if (qy < b2[1] || qy > b2[3] || rx < b2[0] || lx > b2[2]) continue;
          var xs = xsAt(parts[i].pts, qy);
          for (var e = 0; e + 1 < xs.length; e += 2) best = Math.max(best, Math.max(0, Math.min(rx, xs[e + 1]) - Math.max(lx, xs[e])));
        }
        cov += best / (rx - lx);
      }
      if (cov >= 0.75) aaList.push([px, py, cov / 4, solid(P(px, py + 1)) ? 1 : 0]);
    }
    aaList.forEach(function (e) {
      var j = (e[1] * W + e[0]) * 4, c = e[3] ? paint(base, 0.85, baseL) : edgeC;   // lit top edge, dark elsewhere
      d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = Math.round(e[2] * 200);
    });

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
      rib: function (x, y, e) { return [96, 104, 118]; },
      gill: function (x, y, e) { return e.edge ? (e.bot ? paint(base, 0.4, baseL) : paint(base, -0.55, baseL)) : (y % 2 ? [40, 40, 46] : paint(base, -0.3, baseL)); },
      chrome: function (x, y, e) { return chrome(e.top ? 0.8 : e.bot ? -0.5 : 0.25); },
      door: function (x, y, e) { return e.edge ? mul(paint(base, -0.1, baseL), 0.82) : null; },
      grille: function (x, y, e) { return e.edge ? [8, 8, 10] : ((x + y) % 2 ? [48, 49, 54] : [14, 14, 16]); },
      carbon: function (x, y, e) { return carbon(x, y, e.top ? 0.8 : 0); },
      decal: function (x, y, e) { return e.edge ? [20, 20, 24] : (y % 3 === 0 ? vinylCol : [240, 240, 236]); },
      vent: function (x, y, e) { return e.bot ? paint(base, 0.55, baseL) : e.top ? [4, 4, 6] : [14, 14, 17]; },
      head: function (x, y, e) { return e.edge ? (e.top ? [250, 252, 255] : [70, 74, 84]) : ((x * 3 + y) % 5 === 0 ? [255, 255, 255] : (y % 2 ? [206, 216, 230] : [176, 188, 206])); },
      fog: function (x, y, e) { return e.edge ? [60, 62, 70] : [236, 236, 214]; },
      amber: function (x, y, e) { return e.edge ? (e.top ? [255, 220, 140] : [120, 60, 10]) : [244, 146, 26]; },
      tail: function (x, y, e) { return e.edge ? (e.top ? [255, 130, 120] : [96, 8, 12]) : (y % 2 ? [168, 14, 20] : [216, 32, 36]); },
      // sculpted recess: darkens the paint, lit along its top edge
      shade: function (x, y, e) { var g = get(x, y); return e.top ? mix(g, [255, 255, 255], 0.1) : mul(g, 0.74); },
      hilite: function (x, y, e) { return mix(get(x, y), [255, 255, 255], e.edge ? 0.06 : 0.12); },
      // projector headlamp: dark housing, bright lens elements
      headpro: function (x, y, e) { return e.edge ? (e.top ? [168, 176, 190] : [10, 10, 14]) : (((x >> 1) % 3 === 0 && !e.bot) ? [240, 245, 255] : (y % 2 ? [34, 38, 48] : [48, 54, 66])); },
      taildark: function (x, y, e) { return e.edge ? (e.top ? [214, 74, 70] : [52, 4, 6]) : (y % 2 ? [118, 10, 14] : [168, 22, 26]); },
      taillouvre: function (x, y, e) { return e.edge ? [40, 6, 8] : (y % 2 ? [36, 8, 10] : [222, 34, 38]); }
    };
    details.forEach(function (f) { polyFill(f[1], MAT[f[0]] || MAT.trim); });
    lamps.forEach(function (f) { polyFill(f[1], MAT[f[0]] || MAT.tail); });
    (A.pillars || []).forEach(function (f) { polyFill(f[1], function (x, y, e) { return e.lf ? [44, 46, 52] : [16, 16, 19]; }); });
    (A.lines || []).forEach(function (L) {
      var lc = hexToRgb(L[0]), pl = L[1];
      for (var s2 = 0; s2 < pl.length - 1; s2++) {
        var ax = padL + pl[s2][0] * u, ay = groundY - pl[s2][1] * u, bx = padL + pl[s2 + 1][0] * u, by = groundY - pl[s2 + 1][1] * u;
        var n2 = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)));
        for (var j2 = 0; j2 <= n2; j2++) put(Math.round(ax + (bx - ax) * j2 / n2), Math.round(ay + (by - ay) * j2 / n2), lc);
      }
    });
    (A.seams || []).forEach(function (pl) {
      for (var s = 0; s < pl.length - 1; s++) {
        var ax = padL + pl[s][0] * u, ay = groundY - pl[s][1] * u, bx = padL + pl[s + 1][0] * u, by = groundY - pl[s + 1][1] * u;
        var n = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay))), vert = Math.abs(by - ay) > Math.abs(bx - ax);
        for (var j = 0; j <= n; j++) {
          var xx = Math.round(ax + (bx - ax) * j / n), yy = Math.round(ay + (by - ay) * j / n), o = P(xx, yy);
          if (o < 0 || parts[o].mat !== 'paint') continue;
          put(xx, yy, mul(get(xx, yy), 0.8));
          var hx = vert ? xx + 1 : xx, hy = vert ? yy : yy + 1, ho = P(hx, hy);
          if (ho >= 0 && parts[ho].mat === 'paint') { var hc = get(hx, hy); put(hx, hy, mix(hc, [255, 255, 255], 0.06)); }
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
    // a 1px dark outline round the body (and the wheel arches) so the car
    // reads crisply against any background
    var od = ctx.getImageData(0, 0, W, H), oa = od.data, edge = [];
    for (var oy = 0; oy < H; oy++) for (var ox = 0; ox < W; ox++) {
      if (oa[(oy * W + ox) * 4 + 3] > 96) continue;
      var nb = (ox > 0 && oa[(oy * W + ox - 1) * 4 + 3] > 160) || (ox < W - 1 && oa[(oy * W + ox + 1) * 4 + 3] > 160) ||
        (oy > 0 && oa[((oy - 1) * W + ox) * 4 + 3] > 160) || (oy < H - 1 && oa[((oy + 1) * W + ox) * 4 + 3] > 160);
      if (nb) edge.push((oy * W + ox) * 4);
    }
    edge.forEach(function (i) { oa[i] = 10; oa[i + 1] = 10; oa[i + 2] = 13; oa[i + 3] = 235; });
    ctx.putImageData(od, 0, 0);
    var tl = A.tail || [1, 15], hd = A.head;
    var spr = { canvas: cv, w: W, h: H, padL: padL, lenPx: lenPx, groundY: groundY, wheelR: wheelR, wheelF: wheelF,
      tail: { x: Math.round(padL + tl[0] * u), y: Math.round(groundY - tl[1] * u) },
      head: hd ? { x: Math.round(padL + hd[0] * u), y: Math.round(groundY - hd[1] * u) } : null,
      exhaust: { x: padL + (A.exhaust ? A.exhaust[0] : 1) * u - 2, y: groundY - Math.round((A.exhaust ? A.exhaust[1] : 6) * u) },
      rail: !!A.rail, bar: look.bar, look: look, rim: vis.rims || A.rim || 'five', neon: vis.neon || null };
    spriteCache[key] = spr;
    return spr;
  };

  // ------------------------------------------------------------ wheels
  // Pre-rendered per style / size / rotation step. Gaps between spokes are
  // left open so the brake rotor and caliper show through.
  var wheelCache = {};
  var RIMS = {
    deep:    { n: 6,  w: function (p, rr) { return rr > 0.7 || Math.abs(p - 0.5) < 0.07 + 0.05 * (1 - rr); } },
    pony:    { n: 5,  w: function (p, rr) { return !(rr > 0.36 && rr < 0.8 && Math.abs(p - 0.5) < 0.3 - 0.18 * Math.abs(rr - 0.58) / 0.22); } },
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
        if ((slick || radial) && sw > 0.3 && sw < 0.62 && ny > 0.45 && ((x + y) % 3)) g = 92 + ny * 40;
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
  // A soft, stepped elliptical shadow under the car (darker in the middle
  // and under the tires), fading as the nose lifts.
  function carShadow(ctx, spr, gx, gy, pitch) {
    var x0 = gx - (spr.wheelR.x - spr.padL), len = spr.lenPx, lift = Math.max(0, pitch) * len * 0.5;
    var k = Math.max(0.25, 1 - lift / 40), cx = x0 + len / 2, rx = len * 0.56, ry = Math.max(4, Math.round(len * 0.05));
    for (var dy = -2; dy <= ry; dy++) {
      var t = dy < 0 ? 0 : dy / ry, w = rx * Math.sqrt(Math.max(0, 1 - t * t));
      ctx.fillStyle = 'rgba(0,0,0,' + ((0.16 + 0.18 * (1 - t)) * k).toFixed(3) + ')';
      ctx.fillRect(Math.round(cx - w), Math.round(gy + dy), Math.round(w * 2), 1);
      if (w > rx * 0.5) { ctx.fillStyle = 'rgba(0,0,0,' + (0.12 * (1 - t) * k).toFixed(3) + ')'; ctx.fillRect(Math.round(cx - w * 0.7), Math.round(gy + dy), Math.round(w * 1.4), 1); }
    }
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
      var bl = Math.round(1.6 * PPM), endH = Math.max(3, Math.sin(opts.barRad || 0.05) * bl);
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
    if (spr.neon) {
      // underglow: a hot strip under the sills lighting the ground
      var nx0 = Math.round(spr.padL - rx + spr.lenPx * 0.1), nw = Math.round(spr.lenPx * 0.8), ny0 = -Math.round(spr.wheelR.r * 0.5);
      var ng = ctx.createLinearGradient(0, ny0, 0, 2);
      ng.addColorStop(0, spr.neon); ng.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.28; ctx.fillStyle = ng; ctx.fillRect(nx0, ny0, nw, -ny0 + 2);
      ctx.globalAlpha = 1; ctx.fillStyle = spr.neon; ctx.fillRect(nx0, ny0, nw, 1);
    }
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
    return { head: spr.head ? tr(spr.head.x, spr.head.y) : null, tail: tr(spr.tail.x, spr.tail.y),
      neon: spr.neon ? { c: hexToRgb(spr.neon), x: gx + (spr.padL + spr.lenPx / 2 - spr.wheelR.x), w: spr.lenPx } : null };
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
