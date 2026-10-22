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
    // '87-'93 Mustang GT hatch (4.56 m, 2.55 m wb, 1.32 m), traced from
    // photos: flat hood, upright screen, tall glass, slanted quarter window
    // with a thick sail panel, hatch falling to a low lip spoiler
    fox: {
      wr: 23.5, wf: 79, belt: 18.8, rocker: 3.8, rim: 'turbine', hood: [72, 92], frame: [16, 16, 18],
      shell: [[99.3,3.7],[100,5,1],[100,9.8],[99.6,12.2],[99,13.6],[98.4,15.4],[97.2,16.3,1],[88,17.4],[78,18.3],[67.5,19.3,1],[55.8,27.3],[53.6,28.5],[50,28.8],[45,28.85],[40,28.8],[37.5,28.5],[31,27.2],[6.8,21.2,1],[3.2,21.2],[1.6,20.4,1],[0.9,15.9,1],[0.4,11.3],[0,10.8,1],[0,6.1],[1,4.3],[3.4,3.7,1],[96,3.7,1]],
      kit: {
        rbumper: { stock: { pts: [[0,10.9,1],[0,6.1],[1,4.3],[3.6,3.6,1],[9.6,3.6,1],[9.6,10.9,1]],
          details: [['trim', [[1.2, 4.0], [9.2, 3.8], [9.2, 4.9], [1.4, 5.2]]]] } },
        fbumper: { stock: { pts: [[90.5,12,1],[90.5,3.6,1],[99.2,3.6],[100,5,1],[100,9.8],[99.6,12,1]],
          details: [['grille', [[97.2, 7.8], [100, 7.8], [100, 9.4], [97.2, 9.4]]], ['trim', [[91, 3.7], [99, 3.7], [99.8, 4.8], [91, 4.6]]]],
          lamps: [['fog', [[98, 5.6], [99.9, 5.6], [99.9, 7.0], [98, 7.0]]]] } },
        skirt: { stock: { pts: [[30,3.6,1],[71,3.6,1],[71,8.0,1],[30,8.0,1]], details: [['vent', [[30.2, 4.2], [35.0, 4.2], [35.0, 9.4], [31.4, 8.8]]]] } },
        spoiler: { stock: { pts: [[1.6,20.4,1],[6.8,20.9],[8.2,21.7,1],[3.0,22.2],[1.3,21.4]] } },
        mirror: { stock: { mat: 'trim', pts: [[62.4,19.8],[66.4,19.8],[65.8,22.6],[62.9,22.3]] } }
      },
      glass: [[[65.6,19.8,1],[54.4,27.3],[52,27.75],[46,27.85],[42.3,27.8,1],[42.3,19.8,1]],
              [[40.6,19.8,1],[40.6,27.75,1],[36,27.5],[31.4,26.4,1],[26.8,20.0,1]],
              // the hatch glass wraps round and shows as a strip along the slope
              [[36.2,28.3,1],[30,26.8],[8.6,21.1,1],[8.8,20.1,1],[30,25.7],[35.6,27.1,1]]],
      pillars: [['trim', [[40.6, 19.8], [42.3, 19.8], [42.3, 27.85], [40.6, 27.75]]]],
      interior: [['seat', [[45, 19.8], [49, 19.8], [48.6, 23.8], [45.6, 24.2]]], ['head', [[46, 24.2], [48.6, 24.0], [48.4, 25.8], [46.2, 26.0]]],
        ['seat', [[31.6, 19.8], [35, 19.8], [34.6, 22.2], [32, 22.4]]], ['head', [[32.2, 22.4], [34.6, 22.2], [34.4, 23.8], [32.4, 24.0]]],
        ['wheel', [[57, 20.4], [58.8, 23.4], [59.8, 22.8], [58.2, 20.0]]]],
      lamps: [['head', [[92.6, 15.2], [98.4, 14.9], [99.2, 13.0], [92.6, 13.2]]], ['amber', [[90.8, 13.3], [92.6, 13.2], [92.6, 15.2], [90.8, 15.3]]],
        ['taillouvre', [[0.3, 11.6], [2.6, 11.6], [2.6, 15.9], [1.0, 15.9]]], ['amber', [[86.8, 9.0], [89, 9.0], [89, 10], [86.8, 10]]], ['tail', [[10.4, 8.4], [12.4, 8.4], [12.4, 9.4], [10.4, 9.4]]]],
      details: [['soft', [[0.2, 10.9], [100, 10.9], [100, 11.5], [0.2, 11.5]]], ['handle', [[43.2, 18.3], [46.4, 18.3], [46.4, 19.0], [43.2, 19.0]]],
        ['badge', [[84, 13.8], [87.4, 13.8], [87.4, 14.5], [84, 14.5]]], ['door', [[12.4, 13.6], [15.4, 13.6], [15.4, 16.2], [12.4, 16.2]]]],
      lines: [['#2a2a2e', [[71.5, 18.9], [67.6, 33.6]]], ['#101012', [[67.5, 19.35], [63.4, 22.2]]]],
      seams: [[[67.0, 19.3], [67.2, 8.6], [66.2, 8.0]], [[41.4, 19.8], [41.4, 8.6], [42.2, 8.0]], [[67.5, 18.8], [96, 16.0]]],
      creases: [[[10.4, 10.0], [90.5, 10.0]]],
      head: [98.6, 14.0], tail: [1.6, 13.8], exhaust: [6, 4.4]
    },
    // 6th-gen Camaro SS (4.78 m, 2.81 m wb, 1.35 m), traced from a side
    // photo: high hood and cowl, chopped glass under a thick roof band,
    // fastback onto a high deck, big door mirror, sculpted flanks
    camss: {
      wr: 20.6, wf: 79.6, belt: 18.9, rocker: 3.8, rim: 'split', hood: [72, 90], frame: [12, 12, 14],
      shell: [[98,2.6,1],[99.6,4.6],[100,9],[99.7,14.2,1],[97.6,15.8],[93,16.9],[86.2,18.8],[79.3,19.8],[72.3,20.5],[65.3,21.6,1],[63.3,22.3],[58,25.2],[55.6,26.1],[50,27.4],[44,27.65],[38,27.6],[34,27.4],[27.1,26.7],[20.8,25.0],[11.2,23.8],[4,23.4,1],[1.0,22.6],[0.2,20.4],[0,16,1],[0.4,12],[1.4,7.6],[3.3,6.0],[9.5,4.6,1],[30,3.8,1],[70,3.6,1],[90,2.6,1]],
      kit: {
        rbumper: { stock: { pts: [[0,14.6,1],[0.4,12],[1.4,7.6],[3.3,6.0],[9.5,4.6,1],[12.4,4.4,1],[12.4,14.6,1]],
          details: [['trim', [[1.6, 5.4], [12.4, 4.4], [12.4, 6.8], [2.0, 7.6]]], ['chrome', [[2.4, 5.8], [4.8, 5.6], [4.8, 7.0], [2.4, 7.2]]], ['chrome', [[5.6, 5.5], [8.0, 5.3], [8.0, 6.7], [5.6, 6.9]]]] } },
        fbumper: { stock: { pts: [[88,13.6,1],[88,2.6,1],[98,2.6,1],[99.6,4.6],[100,9],[99.7,14.2,1]],
          details: [['grille', [[98.6, 13.6], [99.8, 13.8], [99.9, 10.4], [98.8, 10.4]]], ['grille', [[97.0, 4.2], [99.6, 4.8], [99.9, 8.6], [97.6, 8.4]]], ['trim', [[88, 2.6], [98, 2.5], [98.8, 3.6], [88, 3.5]]]] } },
        skirt: { stock: { mat: 'trim', pts: [[29,3.8,1],[66,3.6,1],[66,5.0],[63,6.6,1],[30,7.2,1]] } },
        spoiler: { stock: { pts: [[1.2,23.0,1],[2.4,24.4],[8.4,24.3],[9.4,23.6,1]] } },
        mirror: { stock: { pts: [[55.6,18.0],[60.6,18.4],[60.8,21.4],[56.4,21.8],[55.4,20.4]] } }
      },
      glass: [[[64,19.8,1],[56.4,24.0],[51.4,24.7],[44,24.95],[36.1,25.1,1],[36.1,20.0,1]],
              [[35.2,20.0,1],[35.2,25.15,1],[29.1,25.05],[26.7,22.6],[28.6,20.4,1]]],
      pillars: [['trim', [[35.2, 20.0], [36.1, 20.0], [36.1, 25.15], [35.2, 25.15]]]],
      interior: [['seat', [[39, 20.0], [43, 20.0], [42.6, 22.4], [39.6, 22.8]]], ['head', [[40, 22.8], [42.6, 22.6], [42.4, 24.2], [40.2, 24.4]]],
        ['wheel', [[52, 20.2], [53.6, 22.8], [54.6, 22.2], [53.2, 20.0]]]],
      lamps: [['head', [[93, 16.6], [98.6, 15.6], [99.4, 14.6], [94, 15.4]]], ['tail', [[0.2, 17.0], [3.3, 17.2], [3.3, 19.4], [0.6, 19.4]]],
        ['amber', [[88.2, 6.6], [89.6, 6.6], [89.6, 9.4], [88.2, 9.4]]], ['tail', [[9.0, 8.7], [10.3, 8.7], [10.3, 11.5], [9.0, 11.5]]]],
      details: [['vent', [[78, 19.95], [85, 19.0], [85, 19.6], [78, 20.5]]], ['handle', [[36, 16.0], [40.8, 16.0], [40.8, 16.9], [36, 16.9]]],
        ['badge', [[67.4, 12.2], [69.4, 12.2], [69.4, 12.9], [67.4, 12.9]]],
        ['door', [[23.6, 16.0], [24.4, 15.2], [25.6, 15.0], [26.6, 15.6], [27.0, 16.8], [26.4, 18.2], [25.2, 18.8], [24, 18.4], [23.4, 17.2]]]],
      lines: [['#101012', [[65.3, 21.65], [61.4, 23.6]]]],
      seams: [[[63.8, 19.8], [63.8, 7.0]], [[29.8, 20.0], [29.2, 13], [30.4, 7.2]], [[65.3, 21.2], [91, 17.4]]],
      creases: [[[30, 14.8], [50, 14.4], [66, 13.9]], [[68, 14.2], [80, 15.0], [92, 15.6]], [[4, 17.6], [14, 18.3], [26, 17.4]]],
      head: [98.8, 15.4], tail: [1.6, 18.2], exhaust: [3.6, 5.8]
    },
    // AE86 Sprinter Trueno hatch (4.18 m, 2.40 m wb, 1.335 m): wedge nose
    // with pop-ups, big airy glass, black bumpers, panda two-tone
    hachi: {
      wr: 22.4, wf: 79.5, belt: 19.8, rocker: 4.2, rim: 'mesh', hood: [72, 92], frame: [18, 18, 20],
      lower: { y: 13.0, c: [24, 24, 27] },
      shell: [[1.2,4.0,1],[1.0,12.4,1],[1.2,14.3,1],[2.4,22.1],[4.2,22.9],[8.3,23.3,1],[29.8,31.4],[38,31.85],[46,31.85],[51.2,31.2,1],[66.7,20.1,1],[80,18.6],[95.2,16.7,1],[96.7,15.2],[97.6,12.4,1],[97.6,4.0,1]],
      kit: {
        rbumper: { stock: { mat: 'bumper', pts: [[0,5.2,1],[0.4,4.4],[6.2,4.2,1],[6.2,12.6,1],[0,12.0,1]] } },
        fbumper: { stock: { mat: 'bumper', pts: [[93.8,4.2,1],[99.4,4.4],[100,5.4,1],[100,12.0,1],[93.8,12.6,1]], lamps: [['amber', [[98.4, 8.6], [100, 8.6], [100, 10.6], [98.4, 10.6]]]] } },
        skirt: { stock: { mat: 'bumper', pts: [[6,12.4,1],[94,12.4,1],[94,13.4,1],[6,13.4,1]] } },
        spoiler: { stock: { mat: 'trim', pts: [[5.6,23.0,1],[9.2,23.4],[10,24.4,1],[6.2,24.2]] } },
        mirror: { stock: { mat: 'trim', pts: [[62,21.2],[65.6,21.2],[65,24],[62.4,23.6]] } }
      },
      glass: [[[64.6,21.2,1],[52,30.2],[48,30.85],[42,30.95],[36.4,30.85,1],[36.4,21.2,1]],
              [[34.8,21.2,1],[34.8,30.8,1],[29.8,30.4],[14,24.8],[11.6,22.8],[12.6,21.2,1]]],
      pillars: [['trim', [[34.8, 21.2], [36.4, 21.2], [36.4, 30.9], [34.8, 30.8]]]],
      interior: [['seat', [[42.4, 21.2], [46.6, 21.2], [46.2, 26.0], [43, 26.4]]], ['head', [[43.4, 26.4], [46.2, 26.2], [46, 28.2], [43.6, 28.4]]],
        ['seat', [[26.4, 21.2], [30.2, 21.2], [29.8, 24.4], [26.8, 24.6]]], ['head', [[27, 24.6], [29.8, 24.4], [29.6, 26.2], [27.2, 26.4]]],
        ['wheel', [[54, 22.0], [56, 25.4], [57, 24.8], [55.2, 21.6]]]],
      lamps: [['amber', [[96.2, 13.0], [99.4, 13.0], [99.2, 14.8], [96.2, 14.8]]], ['tail', [[1.4, 17.4], [4.0, 17.4], [4.0, 21.6], [2.2, 21.6]]], ['amber', [[1.2, 14.6], [4.0, 14.6], [4.0, 17.4], [1.4, 17.4]]]],
      details: [['handle', [[37.6, 19.4], [40.8, 19.4], [40.8, 20.2], [37.6, 20.2]]], ['door', [[11.4, 16.0], [14.2, 16.0], [14.2, 18.4], [11.4, 18.4]]],
        ['badge', [[82, 15.2], [85.6, 15.2], [85.6, 15.9], [82, 15.9]]]],
      lines: [['#101012', [[66.7, 20.15], [62.4, 23.2]]]],
      seams: [[[65.6, 21.0], [66, 13.6]], [[35.6, 21.0], [35.4, 13.6]], [[88.6, 17.8], [88.6, 16.4], [96.2, 15.6]], [[66.6, 19.7], [88.6, 17.8]]],
      head: [99, 13.8], tail: [2.4, 19], exhaust: [6.6, 4.6]
    },
    // A80 Supra (4.52 m, 2.55 m wb, 1.275 m): long low rounded nose, bubble
    // cabin, short tail and the hoop wing
    supra: {
      wr: 19.3, wf: 76, belt: 18.4, rocker: 5.2, rim: 'five', hood: [66, 88], frame: [14, 14, 16],
      shell: [[97.8,2.9,1],[99.6,5.2],[100,7.6],[99.6,10.4],[97.8,12.9],[95,14.6],[92.2,15.6],[86,16.9],[77.8,18.2],[62.7,20.4,1],[51.2,26.6],[48,27.8],[44,28.25],[38,28.2],[33.3,27.8],[27,25.4],[16.7,21.8,1],[5.6,21.3],[2.6,20.9],[1.1,20.0],[0.2,17.6],[0,14],[0,11.1],[0.4,6.2],[1.4,4.4],[3.3,3.6,1],[90,3.4,1]],
      kit: {
        rbumper: { stock: { pts: [[0.1,12.8,1],[0,11.1],[0.4,6.2],[1.4,4.4],[3.3,3.6,1],[12,3.4,1],[12,12.8,1]],
          details: [['trim', [[1.2, 3.8], [12, 3.5], [12, 5.6], [1.6, 6.0]]], ['chrome', [[2.0, 4.4], [5.4, 4.4], [5.4, 6.4], [2.0, 6.4]]]] } },
        fbumper: { stock: { pts: [[87,11.4,1],[87,3.4,1],[97.8,2.9,1],[99.6,5.2],[100,7.6],[99.6,10.4],[98.6,11.8,1]],
          details: [['grille', [[96.6, 4.0], [99.4, 4.6], [99.9, 7.4], [97.2, 7.2]]], ['trim', [[87.6, 2.9], [97.6, 2.8], [98.4, 3.6], [87.6, 3.6]]]],
          lamps: [['fog', [[97.6, 8.2], [99.7, 8.4], [99.5, 9.8], [97.6, 9.6]]]] } },
        skirt: { stock: { pts: [[26,3.4,1],[66,3.4,1],[66,6.8,1],[26,6.8,1]], details: [['trim', [[26, 3.4], [66, 3.4], [66, 4.2], [26, 4.2]]]] } },
        spoiler: { stock: { pts: [[-1.2,25.6],[17.4,25.9],[18.6,27.2],[17.2,28.2],[0,28.4],[-1.6,27.2]],
          extra: [[[3.8,21.0,1],[7.0,21.0,1],[7.8,26.0,1],[5.2,26.0,1]], [[13.6,21.2,1],[16.6,21.3,1],[17.0,26.0,1],[14.6,26.0,1]]] } },
        mirror: { stock: { pts: [[55.6,20.8],[59.4,20.8],[58.8,23.4],[56.2,23.0]] } }
      },
      glass: [[[60.2,20.9,1],[50.6,26.2],[47,27.1],[43.4,27.3],[37.6,27.15],[33.6,26.6],[29,24.4],[26.4,21.8],[27,20.9,1]]],
      pillars: [['trim', [[34.4, 20.9], [35.4, 20.9], [35.4, 26.9], [34.4, 26.7]]]],
      interior: [['seat', [[40, 20.9], [44, 20.9], [43.6, 23.6], [40.6, 24.0]]], ['head', [[41, 24.0], [43.6, 23.8], [43.4, 25.6], [41.2, 25.8]]],
        ['wheel', [[51, 21.0], [52.6, 23.8], [53.6, 23.2], [52.2, 20.8]]]],
      lamps: [['head', [[86.8, 16.5], [93.8, 15.0], [96.6, 13.4], [88, 15.0]]], ['tail', [[0.3, 14.4], [2.6, 14.8], [3.0, 18.4], [1.0, 18.2]]], ['amber', [[85, 11.6], [87, 11.6], [87, 12.4], [85, 12.4]]]],
      details: [['handle', [[35.8, 18.9], [38.8, 18.9], [38.8, 19.6], [35.8, 19.6]]], ['door', [[15, 14.8], [17.8, 14.8], [17.8, 17.0], [15, 17.0]]],
        ['badge', [[78.6, 13.0], [82, 13.0], [82, 13.7], [78.6, 13.7]]]],
      lines: [['#101012', [[62.7, 20.45], [58.6, 22.8]]]],
      seams: [[[60, 20.8], [60.4, 8.6], [59.4, 7.0]], [[33.6, 20.8], [33.2, 8.6], [34.2, 7.0]], [[62.6, 20.0], [86, 16.6]]],
      creases: [[[8, 16.8], [26, 17.4], [42, 16.2]]],
      head: [95.6, 14.2], tail: [1.5, 16.4], exhaust: [3.6, 5.4]
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
    var parts = [{ id: 'shell', mat: 'paint', pts: smooth(A.shell) }];
    var lamps = (A.lamps || []).slice(), details = (A.details || []).slice();
    SLOTS.forEach(function (slot) {
      var vs = A.kit && A.kit[slot]; if (!vs) return;
      if (slot === 'spoiler' && look.wing) return;          // the aftermarket wing replaces it
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
          ic = it === 'seat' || it === 'head' ? (itop ? [74, 70, 78] : [42, 40, 46]) : [26, 26, 30];
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
      else if (mat === 'red') c = paint([200, 30, 30], ny, 0.3);
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
          put(xx, yy, mul(get(xx, yy), 0.55));
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
