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
      // Catmull-Rom tangents, capped at the segment length so a short edge
      // next to a long one can't overshoot
      var m1 = [(p2[0] - p0[0]) / 2, (p2[1] - p0[1]) / 2], m2 = [(p3[0] - p1[0]) / 2, (p3[1] - p1[1]) / 2];
      var c1 = Math.min(1, len / (Math.hypot(m1[0], m1[1]) || 1)), c2 = Math.min(1, len / (Math.hypot(m2[0], m2[1]) || 1));
      for (var k = 1; k < steps; k++) {
        var t = k / steps, t2 = t * t, t3 = t2 * t;
        var h00 = 2 * t3 - 3 * t2 + 1, h10 = (t3 - 2 * t2 + t) * c1, h01 = -2 * t3 + 3 * t2, h11 = (t3 - t2) * c2;
        out.push([h00 * p1[0] + h10 * m1[0] + h01 * p2[0] + h11 * m2[0], h00 * p1[1] + h10 * m1[1] + h01 * p2[1] + h11 * m2[1]]);
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
    // These four are traced from side-view game screenshots the player
    // supplied: the body and glass outlines come from the paint/glass
    // regions of the reference (bottom flattened under the arches, which the
    // renderer cuts itself), wheel centres and tire size from the rims.
    // Lamps, bumpers, seams and details are our own, placed on top.
    // '87-'93 Mustang GT hatch
    fox: {"wr":21.02,"wf":77.6,"belt":17.2,"rocker":3.21,"rim":"pony","hood":[65.54,91.6],"frame":[16,16,18],"wheelScale":0.941,"archGap":1.4,"shell":[[0.0,9.23,1],[0.05,6.34],[1.62,4.57],[2.06,2.5,1],[8.25,2.41],[10.22,1.42],[31.97,1.42],[33.2,2.01],[35.95,2.01],[37.23,1.42],[88.56,1.42],[89.78,2.01],[99.36,2.01],[99.95,2.6],[99.9,8.84,1],[97.25,10.76],[96.95,14.15,1],[95.48,15.08],[88.75,16.9],[75.64,17.49],[74.41,18.47],[65.8,19.05],[64.7,19.35],[64.0,20.2],[62.3,21.7],[60.0,23.3],[57.3,25.0],[54.3,26.4],[52.9,27.1],[52.0,27.25],[30.0,27.25],[29.0,27.1],[26.7,26.6],[24.0,25.5],[21.3,24.3],[18.3,23.0],[15.3,21.5],[13.0,20.3],[2.6,19.8,1],[2.0,19.2],[1.8,15.0],[1.8,10.7],[0.6,10.1]],"kit":{"rbumper":{"stock":{"pts":[[0.0,9.23,1],[0.05,6.34],[1.62,4.57],[2.06,2.5,1],[8.25,2.41],[10.22,1.42],[12.03,1.42,1],[12.03,20.14,1],[2.6,19.8,1],[2.0,19.2],[1.8,15.0],[1.8,10.7],[0.6,10.1]],"details":[["shade",[[-0.6,2.01],[12.03,2.01],[12.03,8.22],[-0.6,8.22]]]],"flush":true}},"fbumper":{"stock":{"pts":[[91.19,2.01,1],[99.36,2.01],[99.95,2.6],[99.9,8.84,1],[97.25,10.76],[96.95,14.15,1],[95.48,15.08],[91.19,16.24,1]],"details":[["shade",[[91.19,2.01],[99.61,2.01],[99.61,8.22],[91.19,8.22]]],["trim",[[91.19,2.01],[97.2,2.01],[98.8,3.21],[91.19,2.8]]]],"flush":true}},"mirror":{"stock":{"pts":[[59.6,18.3],[62.0,18.3],[62.6,19.1],[62.300000000000004,20.2],[60.2,20.400000000000002],[59.6,19.7]]}}},"glass":[[[61.2,17.2,1],[20.6,17.2,1],[22.4,19.0],[25.8,22.6],[29.9,25.4],[31.2,26.3],[51.6,26.3],[52.1,25.9]]],"pillars":[["trim",[[35.0,17.2],[36.0,17.2],[36.0,26.3],[35.0,26.3]]]],"interior":[["seat",[[46.9,19.04],[50.51,19.04],[50.11,22.65],[47.5,23.04]]],["head",[[47.71,23.04],[50.11,22.84],[49.9,24.85],[47.91,25.05]]],["seat",[[31.47,19.04],[35.08,19.04],[34.67,21.64],[31.87,21.84]]]],"lamps":[["amber",[[92.9,11.0],[95.0,11.0],[95.0,13.3],[94.0,12.6]]],["head",[[95.0,11.0],[97.7,11.0],[97.5,13.5],[95.0,13.3]]],["tailbox",[[1.8,10.8],[5.6,10.8],[5.6,15.2],[1.8,15.2]]]],"details":[["handle",[[49.11,16.63],[52.31,16.63],[52.31,17.34],[49.11,17.34]]]],"lines":[],"seams":[[[63.14,18.64],[63.73,10.02],[62.74,5.82]],[[44.3,18.84],[44.1,10.02],[45.1,5.82]],[[64.34,18.74],[91.19,15.63]]],"creases":[[[89.59,12.82],[63.53,13.43],[35.48,13.63],[5.42,13.23]]],"head":[96.2,14.23],"tail":[1.41,14.42],"exhaust":[2.81,3.21],"ws":[[[52.3,28.0],[66.4,19.6],[64.8,18.5],[61.4,18.2],[53.3,25.75],[52.5,26.9]],[[29.6,28.0],[12.2,20.8],[13.2,19.55],[15.3,19.65],[20.0,21.95],[24.3,24.35],[28.7,26.15],[29.6,26.9]]],"pillarLit":[[[53.3,25.75],[61.4,18.2],[60.6,18.15],[52.6,25.65]],[[28.7,26.15],[24.3,24.35],[20.0,21.95],[15.3,19.65],[17.6,19.55],[21.5,21.45],[25.6,23.65],[29.6,25.35]]],"pillarPaint":[]},
    // Camaro SS
    camss: {"wr":19.84,"wf":81.73,"belt":17.45,"rocker":3.41,"rim":"five","hood":[65.47,91.58],"frame":[30,30,34],"wheelScale":0.943,"archGap":1.4,"shell":[[0.0,13.36],[0.15,8.45,1],[3.24,6.53],[6.04,2.55],[9.04,1.42],[95.04,1.42],[96.27,2.01],[99.36,2.01],[99.95,2.6,1],[99.66,3.83,1],[98.04,3.98],[97.59,4.57],[97.69,6.24],[99.36,8.3],[98.72,14.15,1],[96.07,15.67],[92.53,16.85],[89.0,16.9],[87.77,17.49],[80.35,17.29],[79.13,18.27],[67.3,18.3],[66.0,18.85],[64.7,19.65],[62.3,20.95],[60.3,22.15],[58.0,23.25],[55.4,24.15],[53.2,24.9],[51.5,25.4],[50.0,25.55],[30.3,25.55],[28.5,25.3],[25.0,24.85],[22.7,24.15],[19.0,22.95],[15.3,21.85],[12.0,20.65],[10.1,19.95],[7.91,19.94],[4.91,21.56],[2.95,21.61],[1.77,20.43],[1.67,15.42]],"kit":{"rbumper":{"stock":{"pts":[[0.0,13.36],[0.15,8.45,1],[3.24,6.53],[6.04,2.55],[9.04,1.42],[10.25,1.42,1],[10.25,19.95,1],[9.97,19.84],[7.91,19.94],[4.91,21.56],[2.95,21.61],[1.77,20.43],[1.67,15.42]],"details":[["trim",[[0.6,5.0],[7.2,4.4],[7.2,3.2],[2.6,3.4]]]],"lamps":[["red",[[10.4,7.6],[11.0,7.6],[11.0,9.4],[10.4,9.4]]]],"flush":true}},"fbumper":{"stock":{"pts":[[89.57,1.42,1],[95.04,1.42],[96.27,2.01],[99.36,2.01],[99.95,2.6,1],[99.66,3.83,1],[98.04,3.98],[97.59,4.57],[97.69,6.24],[99.36,8.3],[98.72,14.15,1],[96.07,15.67],[92.53,16.85],[89.57,16.89,1]],"details":[["intake",[[93.9,4.8],[96.2,4.8],[96.5,7.9],[94.2,7.9]]],["trim",[[92.0,2.8],[99.6,2.9],[99.6,3.4],[92.0,3.4]]]],"lamps":[["amber",[[90.8,8.5],[91.4,8.5],[91.4,9.6],[90.8,9.6]]],["red",[[91.3,6.8],[91.9,6.8],[91.9,8.4],[91.3,8.4]]],["head",[[94.3,8.0],[95.4,8.0],[95.4,8.4],[94.3,8.4]]]],"flush":true}},"mirror":{"stock":{"pts":[[58.0,17.9],[61.0,17.9],[61.6,18.7],[61.300000000000004,19.799999999999997],[58.6,20.0],[58.0,19.299999999999997]]}}},"glass":[[[58.3,17.45,1],[37.7,17.55,1],[27.3,21.55,1],[28.0,22.45],[29.4,23.55],[31.5,24.25],[49.8,24.25],[53.7,22.55],[56.2,21.25],[57.8,19.75]]],"pillars":[["trim",[[36.6,17.55],[37.6,17.55],[37.6,24.25],[36.6,24.25]]]],"interior":[["seat",[[43.38,18.78],[47.4,18.78],[47.0,21.69],[43.99,22.09]]],["head",[[44.39,22.09],[47.0,21.89],[46.79,23.7],[44.59,23.9]]]],"lamps":[["headpro",[[92.2,13.3],[94.4,12.0],[97.2,12.9],[98.7,14.4],[96.0,14.5]]],["taildark",[[2.0,15.5],[5.3,15.6],[7.1,17.2],[6.5,18.2],[2.0,18.0]]]],"details":[["shade",[[63.46,7.23],[42.38,8.43],[36.96,12.85],[34.55,12.45],[37.76,6.02],[63.46,4.62]]],["handle",[[40.98,16.46],[44.19,16.46],[44.19,17.17],[40.98,17.17]]]],"lines":[],"seams":[[[62.06,18.47],[62.66,10.04],[61.65,5.42]],[[37.76,18.47],[37.56,10.04],[38.36,5.42]],[[63.07,19.08],[89.57,16.67]]],"creases":[[[63.46,17.47],[39.37,17.68],[13.26,18.47]]],"head":[95.59,14.66],"tail":[1.82,16.87],"exhaust":[2.42,4.02],"ws":[[[49.8,26.25],[56,24.65],[62,21.65],[67.8,18.65],[66.8,17.65],[63.0,17.6],[61.0,19.1],[59.0,20.3],[57.0,21.5],[54.3,22.8],[50.3,24.0],[49.8,24.7]]],"pillarLit":[[[50.3,24.0],[54.3,22.8],[57.0,21.5],[59.0,20.3],[61.0,19.1],[63.0,17.6],[61.6,17.5],[58.2,19.3],[56.3,20.9],[53.7,22.25],[50.3,23.45]]],"pillarPaint":[]},
    // AE86 Sprinter Trueno hatch
    hachi: {"wr":23.16,"wf":80.3,"belt":19.5,"rocker":3.64,"rim":"mesh","hood":[69.74,97.98],"frame":[18,18,20],"wheelScale":0.939,"archGap":1.4,"shell":[[0.49,24.19,1],[2.87,21.92,1],[2.3,20.9],[1.8,20.0],[1.7,15.9],[1.0,15.3],[0.97,13.31],[-0.22,11.69],[-0.05,8.87],[2.27,7.03],[3.03,5.25,1],[88.91,5.03],[90.26,4.38],[98.0,4.38],[99.46,6.11],[99.57,8.23],[100.38,9.36],[99.3,19.81],[98.59,20.4],[97.56,20.45],[94.59,18.4],[89.12,18.89],[85.77,20.24],[84.58,19.7],[77.92,19.91],[74.5,20.8],[72.1,21.3],[69.2,22.6],[66.3,24.0],[63.4,25.5],[60.5,27.0],[57.7,28.25],[55.1,29.5],[53.0,30.2],[51.2,30.4],[31.7,30.4],[29.1,29.9],[24.1,28.6],[20.1,27.3],[14.9,25.3],[11.1,24.0],[10.12,24.03],[6.93,24.03],[5.57,24.68]],"kit":{"rbumper":{"stock":{"pts":[[0.49,24.19,1],[2.87,21.92,1],[2.3,20.9],[1.8,20.0],[1.7,15.9],[1.0,15.3],[0.97,13.31],[-0.22,11.69],[-0.05,8.87],[2.27,7.03],[3.03,5.25,1],[9.02,5.23,1],[9.02,24.03,1],[6.93,24.03],[5.57,24.68]],"details":[["chrome",[[1.4,5.5],[11.8,5.5],[11.8,6.7],[1.4,6.7]]]],"flush":true}},"fbumper":{"stock":{"pts":[[93.34,4.38,1],[98.0,4.38],[99.46,6.11],[99.57,8.23],[100.38,9.36],[99.3,19.81],[98.59,20.4],[97.56,20.45],[94.59,18.4],[93.34,18.51,1]],"details":[["intake",[[96.4,6.3],[99.6,6.9],[99.6,8.5],[96.4,8.3]]]],"lamps":[["amber",[[93.7,14.4],[98.2,14.4],[98.2,15.1],[93.7,15.1]]],["head",[[97.0,11.3],[99.0,11.3],[99.0,12.0],[97.0,12.0]]]],"flush":true}},"mirror":{"stock":{"pts":[[63.0,19.7],[65.0,19.7],[65.6,20.5],[65.3,21.599999999999998],[63.6,21.8],[63.0,21.099999999999998]]}}},"glass":[[[66.3,19.5,1],[56.6,19.55],[13.2,20.4,1],[13.0,22.5],[14.7,24.0],[19.0,25.6],[23.7,27.2],[28.8,28.5],[31.5,29.3],[53.0,29.3],[54.4,28.2],[58.4,25.3],[61.3,23.1],[64.2,21.0]]],"pillars":[],"interior":[["seat",[[43.52,21.28],[47.54,21.28],[47.14,24.82],[44.12,25.22]]],["head",[[44.52,25.22],[47.14,25.02],[46.94,27.04],[44.72,27.24]]],["seat",[[27.78,21.28],[31.41,21.28],[31.0,24.0],[28.18,24.2]]],["head",[[28.38,24.2],[31.0,24.0],[30.8,25.82],[28.58,26.02]]]],"lamps":[["tailbox",[[1.7,18.4],[4.6,18.4],[4.6,20.3],[1.7,20.3]]],["ambersmoke",[[1.7,15.8],[4.6,15.8],[4.6,18.4],[1.7,18.4]]]],"details":[["handle",[[40.9,18.76],[43.92,18.76],[43.92,19.46],[40.9,19.46]]],["trim",[[95.0,18.4],[97.4,20.4],[98.6,20.5],[98.4,19.0],[96.5,18.4]]]],"lines":[],"creases":[[[91.94,13.92],[59.66,13.92],[29.4,14.12],[5.18,13.92]]],"seams":[[[67.12,21.08],[67.52,12.92]],[[37.06,20.88],[36.86,12.92]],[[90.92,19.36],[90.92,18.36],[98.38,18.16]],[[68.32,20.78],[90.92,19.36]]],"head":[98.78,14.12],"tail":[1.76,18.46],"exhaust":[5.18,4.64],"ws":[[[52.6,31.1],[73.4,21.4],[72.3,20.3],[67.0,19.85],[64.9,21.65],[62.3,23.35],[59.8,25.15],[56.6,27.15],[53.3,29.15]],[[32.0,31.1],[10.4,24.7],[11.5,23.35],[12.2,23.35],[14.7,24.45],[19.0,26.05],[23.7,27.65],[28.8,28.95],[31.3,29.45]]],"pillarLit":[[[53.3,29.15],[56.6,27.15],[59.8,25.15],[62.3,23.35],[64.9,21.65],[67.0,19.85],[66.3,19.25],[64.2,20.65],[61.3,22.75],[58.4,24.95],[54.4,27.85],[53.0,28.75]],[[28.8,28.95],[23.7,27.65],[19.0,26.05],[14.7,24.45],[12.2,23.35],[13.0,22.65],[14.7,23.65],[19.0,25.25],[23.7,26.85],[28.8,28.15],[31.4,28.85]]],"pillarPaint":[[[35.4,29.3],[37.3,29.3],[37.5,20.4],[36.3,20.4]]]},
    // A80 Supra
    supra: {"wr":22.63,"wf":78.29,"belt":16.6,"rocker":2.98,"rim":"five","hood":[63.45,91.3],"frame":[14,14,16],"wheelScale":0.872,"archGap":1.4,"shell":[[0.0,13.17,1],[0.56,5.61],[1.25,4.64],[3.62,3.43],[10.71,3.01],[11.87,2.46],[98.1,2.46],[99.35,3.39,1],[98.84,6.68,1],[99.95,7.84],[99.91,8.95],[99.3,10.4],[98.6,11.6],[97.2,12.6],[95.0,13.2],[92.6,13.7],[91.4,14.25],[90.17,14.8],[67.4,16.65],[66.6,16.85],[64.2,18.6],[61.1,20.2],[57.9,21.55],[54.8,22.7],[51.7,23.8],[49.6,24.7],[48.0,25.3],[46.5,25.45],[33.0,25.45],[30.2,24.95],[28.3,24.4],[25.8,23.8],[21.4,22.5],[17.0,21.6],[12.2,20.7],[11.0,20.3],[4.82,20.36],[2.37,18.04],[2.18,15.26]],"kit":{"rbumper":{"stock":{"pts":[[0.0,13.17,1],[0.56,5.61],[1.25,4.64],[3.62,3.43],[10.71,3.01],[11.87,2.46],[12.14,2.46,1],[12.14,20.39,1],[4.82,20.36],[2.37,18.04],[2.18,15.26]],"details":[["trim",[[1.2,4.9],[6.8,4.3],[6.8,3.4],[2.8,3.6]]]],"lamps":[["amber",[[6.5,9.8],[9.4,9.8],[9.4,11.1],[6.5,11.1]]]],"flush":true}},"fbumper":{"stock":{"pts":[[87.12,2.46,1],[98.1,2.46],[99.35,3.39,1],[98.84,6.68,1],[99.95,7.84],[99.91,8.95],[99.3,10.4],[98.6,11.6],[97.2,12.6],[95.0,13.2],[92.6,13.7],[91.4,14.25],[90.17,14.8],[87.12,15.04,1]],"details":[["intake",[[95.3,8.1],[97.4,8.1],[97.7,7.2],[97.6,4.6],[95.4,4.6],[95.2,7.0]]],["trim",[[87.5,2.4],[95.9,2.4],[98.3,3.0],[87.5,3.0]]]],"lamps":[["amber",[[89.1,6.7],[91.9,6.7],[91.9,7.9],[89.1,7.9]]]],"flush":true}},"spoiler":{"stock":{"pts":[[2.27,25.05,1],[2.37,23.61],[3.76,22.5],[4.82,20.5,1],[12.52,20.64,1],[10.71,21.66],[9.97,22.45],[9.65,23.61],[8.91,24.26],[5.89,25.42],[2.78,25.42]]}},"mirror":{"stock":{"pts":[[55.4,17.0],[58.0,17.0],[58.6,17.8],[58.300000000000004,18.9],[56.0,19.1],[55.4,18.4]]}}},"glass":[[[56.0,16.6,1],[49.5,16.9],[33.3,17.25],[30.5,17.9],[29.3,18.5],[28.8,19.5],[29.1,20.8],[30.3,22.0],[32.2,23.1],[35.0,24.0],[37.4,24.35],[47.6,24.35],[48.7,23.9],[55.9,19.2]]],"pillars":[["trim",[[36.0,17.1],[37.0,17.1],[37.0,24.4],[36.0,24.4]]]],"interior":[["seat",[[41.58,18.2],[45.56,18.2],[45.16,21.28],[42.17,21.68]]],["head",[[42.58,21.68],[45.16,21.48],[44.96,23.27],[42.78,23.47]]]],"lamps":[["headsilver",[[91.4,12.4],[92.6,12.95],[94.8,13.0],[96.6,12.5],[97.6,11.6],[97.2,10.6],[95.6,10.2],[93.0,10.3],[91.6,11.2]]],["taildark",[[1.3,14.8],[3.4,14.6],[4.2,15.6],[4.0,16.8],[2.9,17.2],[1.5,17.0]]]],"details":[["shade",[[62.46,4.38],[37.61,4.97],[34.22,5.37],[36.41,8.95],[43.57,7.36],[62.46,6.96]]],["shade",[[31.43,5.57],[34.02,5.37],[36.6,8.95],[34.62,9.14]]],["handle",[[39.59,15.51],[42.58,15.51],[42.58,16.21],[39.59,16.21]]]],"lines":[],"seams":[[[62.46,18.3],[63.25,9.95],[62.26,4.58]],[[36.8,18.1],[36.41,9.95],[37.41,4.58]],[[63.86,18.4],[87.12,15.32]]],"creases":[[[69.43,6.36],[51.52,5.77],[33.62,6.56]],[[29.65,15.12],[17.71,15.71],[5.78,15.32]],[[91.3,12.33],[77.38,13.92],[63.86,14.92]]],"head":[94.88,11.94],"tail":[1.6,15.71],"exhaust":[3.4,3.98],"ws":[[[48.6,26.1],[52,24.9],[58,22.5],[64,19.5],[68.2,17.1],[66.6,16.1],[62.6,16.5],[59.8,17.35],[49.8,23.9],[48.6,24.85]]],"pillarLit":[[[49.8,23.9],[59.8,17.35],[60.6,16.95],[59.0,16.75],[48.9,23.35]]],"pillarPaint":[]}
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
      bar: DR.partId('wheeliebar', inst) !== 'stock',
      ride: rideOf(inst)
    };
  };

  // static ride height [front, rear] in metres for drawing (0 = stock)
  function rideOf(inst) {
    var sp = DR.getOption('springs', inst), t = inst.tune || {};
    if (!sp.adjS) return [-(sp.low || 0), -(sp.low || 0)];
    function c(v) { return Math.max(sp.ride[0], Math.min(sp.ride[1], (v || 0) / 1000)); }
    return [c(t.rideF), c(t.rideR)];
  }
  DR.rideOf = rideOf;
  function artFor(look) {
    var art = ART[look.carId] || ART[(DR.CARS[look.carId] || {}).art];
    if (art) return art;
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
  // look.res: 2 draws the car at twice the pixel density (garage, shop and
  // showroom scenes); races use 1. Everything in units scales with PPM.
  DR.carSprite = function (look) {
    var key = JSON.stringify(look);
    if (spriteCache[key]) return spriteCache[key];
    if (!look.res) look = Object.assign({}, look, { res: DR.SPR_RES || 1 });
    PPM = DR.PPM * look.res;
    try { return buildSprite(look, key); } finally { PPM = DR.PPM; }
  };
  function buildSprite(look, key) {
    var RS = look.res || 1;
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
      parts.push({ id: slot, mat: v.mat || 'paint', pts: smooth(v.pts), flush: !!v.flush });
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
    var padL = 8 * RS + Math.ceil(-minX * u), padT = 30 * RS;
    var W = lenPx + padL + 8 * RS, H = Math.ceil(maxY * u) + padT + 2;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    var img = ctx.createImageData(W, H), d = img.data;
    var cvU = document.createElement('canvas'); cvU.width = W; cvU.height = H;
    var imgU = cvU.getContext('2d').createImageData(W, H), ud = imgU.data;
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
    var gap = (A.archGap != null ? A.archGap : 3) * RS;
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
    // windshield / hatch glass seen edge-on, then the painted pillars beside it
    var wsP = new Uint8Array(W * H);
    (A.ws || []).forEach(function (g) { fillPoly(smooth(g), function (x, y) { var o = pid[y * W + x]; if (o === 0 || o === -3) pid[y * W + x] = -4; }); });
    (A.pillarPaint || []).forEach(function (g) { fillPoly(g, function (x, y) { if (pid[y * W + x] === -3) pid[y * W + x] = 0; }); });
    (A.pillarLit || []).forEach(function (g) { fillPoly(g, function (x, y) { var o = pid[y * W + x]; if (o === 0 || o === -3) { pid[y * W + x] = 0; wsP[y * W + x] = 1; } }); });
    if (!A.rail) for (py = 0; py < H; py++) for (px = 0; px < W; px++) {
      var o0 = pid[py * W + px];
      if ((o0 >= 0 && BODYPART[parts[o0].id] || o0 === -3 || o0 === -4) && (inArch(px, py, archR) || inArch(px, py, archF))) pid[py * W + px] = -2;
    }
    function P(x, y) { return x < 0 || y < 0 || x >= W || y >= H ? -1 : pid[y * W + x]; }
    function isBody(v) { return v === -3 || v === -4 || (v >= 0 && BODYPART[parts[v].id]); }
    function solid(v) { return v === -3 || v === -4 || v >= 0; }
    var topB = new Int16Array(W).fill(-1), botB = new Int16Array(W).fill(-1);
    for (px = 0; px < W; px++) for (py = 0; py < H; py++) if (isBody(P(px, py))) { if (topB[px] < 0) topB[px] = py; botB[px] = py; }
    function slopeAt(x) { var a = topB[Math.max(0, x - 2)], b = topB[Math.min(W - 1, x + 2)]; return a < 0 || b < 0 ? 9 : (b - a) / 4; }
    // edge-on glass: depth below the top of its column, for shading
    var wsD = new Float32Array(W * H), wsT = new Float32Array(W * H);
    for (px = 0; px < W; px++) {
      var r0 = -1;
      for (py = 0; py <= H; py++) {
        var on4 = py < H && pid[py * W + px] === -4;
        if (on4 && r0 < 0) r0 = py;
        if (!on4 && r0 >= 0) { for (var r1 = r0; r1 < py; r1++) { wsD[r1 * W + px] = r1 - r0; wsT[r1 * W + px] = py - r0; } r0 = -1; }
      }
    }
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
      else if (py < beltPx + 1.5 + 2 * RS) ny = 0.3;                  // lit shoulder band under the belt line
      else {
        var t = clamp01((py - beltPx) / Math.max(4, rockPx - beltPx));
        ny = t < 0.45 ? 0.12 - 0.1 * t : -0.18 - 0.16 * t;   // reflection horizon partway down
        if (t > 0.8) ny -= (t - 0.8) * 3.2;
      }
      if (creaseSet[px + ',' + py]) ny = 0.6; else if (creaseSet[px + ',' + (py - 1)]) ny = -0.25;
      // fender flares bulge out around the wheel arches
      if (!A.rail && py > beltPx + 1) for (var fa = 0; fa < 2; fa++) {
        var a = fa ? archF : archR, ddx = px + 0.5 - a.x, ddy = py + 0.5 - a.y, rr = Math.sqrt(ddx * ddx + ddy * ddy) - a.r;
        if (rr > 0 && rr < 4 * RS && ddy < a.r * 0.4) ny += (rr < 1.2 * RS ? 0.26 : 0.1 * (1 - (rr - 1.2 * RS) / (2.8 * RS))) * clamp01(-ddy / a.r + 0.4);
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
        var a2 = dA < 1.1 * RS ? 26 : dA < 2.2 * RS ? 12 : 6;
        // goes on the under layer: the wheel is drawn between it and the body
        var ui = (py * W + px) * 4; ud[ui] = a2; ud[ui + 1] = a2; ud[ui + 2] = a2 + 3; ud[ui + 3] = 255; continue;
      }
      var q2 = U(px, py);
      if (v === -4) {
        // edge-on glass: sky-lit lip, then dark streaks running with the slope
        var wd = wsD[py * W + px], wt = wsT[py * W + px], wc;
        var f4 = (wd + 0.5) / wt;
        if (wd < 1) wc = [46, 52, 64];                                  // sky along the top edge
        else if (wd >= wt - 1) wc = [8, 9, 12];                         // shadow line against the pillar
        else wc = f4 < 0.45 ? [30, 34, 42] : [16, 18, 23];              // reflection fading down the glass
        if (tint) wc = mix(wc, [6, 8, 12], tint === 2 ? 0.5 : 0.3);
        put(px, py, wc); continue;
      }
      if (v === -3) {
        // glass: interior silhouettes behind a blue-grey tint, sky on top
        var ic = [12, 14, 19], top3 = P(px, py - 1) !== -3, bot3 = P(px, py + 1) !== -3;
        for (k = 0; k < inter.length; k++) if (inPoly(inter[k][1], q2[0], q2[1])) {
          var it = inter[k][0], itop = !inPoly(inter[k][1], q2[0], q2[1] + 1 / u);
          ic = it === 'seat' || it === 'head' ? (itop ? [27, 28, 33] : [21, 22, 26]) : [17, 17, 21];
        }
        var g = mix(ic, [24, 28, 36], 0.3);
        if (tint) g = mix(g, [6, 8, 12], tint === 2 ? 0.62 : 0.36);
        if (top3) g = mix(g, [44, 50, 60], tint ? 0.15 : 0.3);
        else if (bot3) g = mul(g, 0.7);
        put(px, py, g); continue;
      }
      var part = parts[v], mat = part.mat;
      // window frame / seals
      if (part.id === 'shell' && !wsP[py * W + px] && (P(px - 1, py) === -3 || P(px + 1, py) === -3 || P(px, py - 1) === -3 || P(px, py + 1) === -3)) {
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
        if (wsP[py * W + px]) nyq = Math.max(nyq, 0.5);   // pillar faces up into the light
        // rear face sits away from the light, the nose catches it
        if (body && px - bodyMinX < 2 && py > topB[px]) nyq -= 0.15;
        if (vinyl && body && py <= lowerPx) {
          var vc = vinylAt(q2[0], q2[1]);
          if (vc) { col = vc; }
        }
        c = finished(col, nyq, lum(col), px, py);
        if (edgeOut && P(px, py - 1) !== -1) c = mix(mul(col, 0.28), [8, 8, 12], 0.35);
        // panel gaps where a part sits against an earlier one
        var nb = [P(px - 1, py), P(px + 1, py), P(px, py - 1), P(px, py + 1)];
        for (k = 0; k < 4; k++) if (nb[k] >= 0 && nb[k] < v && parts[nb[k]].mat === 'paint' && !APPENDAGE[part.id] && !part.flush) { c = mul(c, 0.82); break; }
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
        var e = { top: !inPoly(pts, q[0], q[1] + 1 / u), bot: !inPoly(pts, q[0], q[1] - 1 / u), lf: !inPoly(pts, q[0] - 1 / u, q[1]), rt: !inPoly(pts, q[0] + 1 / u, q[1]),
          fy: (y1 - q[1]) / Math.max(0.01, y1 - y0), fx: (q[0] - x0) / Math.max(0.01, x1 - x0) };   // 0 at top / rear
        e.edge = e.top || e.bot || e.lf || e.rt;
        var c = fn(xx, yy, e);
        if (c) put(xx, yy, c);
      }
    }
    var MAT = {
      trim: function (x, y, e) { return plastic(e.top ? 0.8 : e.bot ? -0.5 : 0, 18); },
      soft: function (x, y, e) { return e.top ? [104, 106, 112] : e.bot ? [20, 20, 24] : [50, 51, 56]; },
      handle: function (x, y, e) { return e.top ? [120, 122, 128] : e.bot ? [10, 10, 12] : [36, 36, 40]; },
      badge: function (x, y, e) { return e.top ? [236, 240, 248] : [150, 160, 176]; },
      rib: function (x, y, e) { return [96, 104, 118]; },
      gill: function (x, y, e) { return e.edge ? (e.bot ? paint(base, 0.4, baseL) : paint(base, -0.55, baseL)) : (y % 2 ? [40, 40, 46] : paint(base, -0.3, baseL)); },
      chrome: function (x, y, e) { return chrome(e.top ? 0.8 : e.bot ? -0.5 : 0.25); },
      door: function (x, y, e) { return e.edge ? mul(paint(base, -0.1, baseL), 0.82) : null; },
      grille: function (x, y, e) { return e.edge ? [8, 8, 10] : ((y >> (RS - 1)) % 2 ? [44, 45, 50] : [14, 14, 16]); },
      // open intake: black inside, its upper lip catching light
      intake: function (x, y, e) { return e.top ? paint(base, 0.7, baseL) : e.bot ? [34, 34, 38] : mix([10, 10, 13], [30, 30, 34], e.fy * 0.6); },
      carbon: function (x, y, e) { return carbon(x, y, e.top ? 0.8 : 0); },
      decal: function (x, y, e) { return e.edge ? [20, 20, 24] : (y % 3 === 0 ? vinylCol : [240, 240, 236]); },
      vent: function (x, y, e) { return e.bot ? paint(base, 0.55, baseL) : e.top ? [4, 4, 6] : [14, 14, 17]; },
      // clear lens: bright top, cooler towards the bottom, a hot spot up front
      head: function (x, y, e) { if (e.edge) return e.top ? [250, 252, 255] : [70, 74, 84]; var c = mix([232, 238, 248], [150, 162, 182], e.fy); return e.fy < 0.45 && e.fx > 0.55 && e.fx < 0.85 ? [255, 255, 255] : c; },
      fog: function (x, y, e) { return e.edge ? [60, 62, 70] : [236, 236, 214]; },
      amber: function (x, y, e) { return e.edge ? (e.top ? [255, 220, 140] : [120, 60, 10]) : mix([255, 170, 50], [208, 108, 14], e.fy); },
      tail: function (x, y, e) { return e.edge ? (e.top ? [255, 130, 120] : [96, 8, 12]) : (e.fy < 0.3 && e.fx < 0.4 ? [255, 120, 110] : mix([226, 40, 40], [140, 10, 16], e.fy)); },
      // sculpted recess: darkens the paint, lit along its top edge
      shade: function (x, y, e) { var g = get(x, y); return e.top ? mix(g, [255, 255, 255], 0.1) : mul(g, 0.74); },
      hilite: function (x, y, e) { return mix(get(x, y), [255, 255, 255], e.edge ? 0.06 : 0.12); },
      // projector headlamp: dark housing, bright lens elements
      // projector headlamp: dark housing, a lens and an LED strip along the bottom
      headpro: function (x, y, e) {
        if (e.edge) return e.top ? [150, 158, 172] : e.bot ? [230, 240, 255] : [10, 10, 14];
        var dx = e.fx - 0.45, dy = e.fy - 0.42;
        return dx * dx * 4 + dy * dy < 0.06 ? (dy < -0.05 ? [255, 255, 255] : [190, 200, 216]) : mix([46, 52, 64], [18, 20, 26], e.fy);
      },
      headsilver: function (x, y, e) {
        if (e.edge) return e.top ? [236, 240, 246] : [40, 42, 48];
        var dx = e.fx - 0.4, dy = e.fy - 0.45;
        return dx * dx * 3 + dy * dy < 0.05 ? [252, 253, 255] : mix([224, 228, 236], [140, 146, 160], e.fy);
      },
      taildark: function (x, y, e) { return e.edge ? (e.top ? [214, 74, 70] : [52, 4, 6]) : (e.fy < 0.25 && e.fx < 0.45 ? [236, 96, 90] : mix([186, 26, 30], [96, 8, 12], e.fy)); },
      // recessed lamp in a black frame (fox box, ae86 smoked amber)
      tailbox: function (x, y, e) { return e.edge ? (e.top || e.lf ? [16, 4, 6] : [40, 8, 10]) : (e.fy < 0.2 && e.fx > 0.2 && e.fx < 0.6 ? [214, 60, 58] : mix([170, 22, 28], [104, 10, 14], e.fy)); },
      ambersmoke: function (x, y, e) { return e.edge ? (e.bot || e.lf ? [16, 6, 4] : [60, 26, 10]) : mix([150, 66, 22], [92, 38, 14], e.fy); },
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
    cvU.getContext('2d').putImageData(imgU, 0, 0);

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
    // raw: sprite pixels (what drawCar paints with); the top-level fields are
    // in screen units (sprite pixels / RS) for layout
    var raw = { w: W, h: H, padL: padL, lenPx: lenPx, groundY: groundY, wheelR: wheelR, wheelF: wheelF,
      tail: { x: Math.round(padL + tl[0] * u), y: Math.round(groundY - tl[1] * u) },
      head: hd ? { x: Math.round(padL + hd[0] * u), y: Math.round(groundY - hd[1] * u) } : null,
      exhaust: { x: padL + (A.exhaust ? A.exhaust[0] : 1) * u - 2 * RS, y: groundY - Math.round((A.exhaust ? A.exhaust[1] : 6) * u) } };
    function sc(o) { if (!o) return o; var r = {}; for (var kk in o) r[kk] = o[kk] / RS; return r; }
    var spr = { canvas: cv, under: cvU, RS: RS, raw: raw, w: W / RS, h: H / RS, padL: padL / RS, lenPx: lenPx / RS, groundY: groundY / RS,
      wheelR: sc(wheelR), wheelF: sc(wheelF), tail: sc(raw.tail), head: sc(raw.head), exhaust: sc(raw.exhaust),
      rail: !!A.rail, bar: look.bar, look: look, rim: vis.rims || A.rim || 'five', neon: vis.neon || null };
    spriteCache[key] = spr;
    return spr;
  }

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
    // layout in screen units, painting in sprite pixels (scaled by 1/RS)
    var RS = spr.RS || 1, R = spr.raw || spr, rx = R.wheelR.x, ground = R.groundY;
    if (opts.shadow !== false) carShadow(ctx, spr, gx, gy, pitch);
    ctx.save();
    ctx.translate(Math.round(gx * RS) / RS, Math.round(gy * RS) / RS);
    ctx.scale(1 / RS, 1 / RS);
    if (opts.chute > 0) drawChute(ctx, R, opts.chute, opts.t || 0, RS);
    ctx.rotate(-pitch);
    // wheelie bars: bolted to the chassis, the tail wheel touches down when
    // pitch reaches the tuned bar angle.
    if (spr.bar) {
      var bl = Math.round(1.6 * PPM * (spr.look.res || 1)), endH = Math.max(3, Math.sin(opts.barRad || 0.05) * bl);
      var ay = -R.wheelR.r * 0.7;
      for (var i = 4; i <= bl; i++) {
        var yy = Math.round(ay + (-endH - ay) * (i / bl));
        ctx.fillStyle = '#d4dae2'; ctx.fillRect(-i, yy, 1, 1);
        ctx.fillStyle = '#6d737c'; ctx.fillRect(-i, yy + 1, 1, 1);
      }
      ctx.fillStyle = '#9aa0a8'; for (i = 10; i < bl; i += 12) ctx.fillRect(-i, Math.round(ay + (-endH - ay) * (i / bl)) - 2, 1, 4);
      ctx.fillStyle = '#1c1c1c'; circle(ctx, -bl, Math.round(-endH), 3);
      ctx.fillStyle = '#b8bec8'; ctx.fillRect(-bl - 1, Math.round(-endH) - 1, 2, 2);
    }
    var bodyLift = opts.squat ? opts.squat * RS : 0;
    if (spr.neon) {
      // underglow: a hot strip under the sills lighting the ground
      var nx0 = Math.round(R.padL - rx + R.lenPx * 0.1), nw = Math.round(R.lenPx * 0.8), ny0 = -Math.round(R.wheelR.r * 0.5);
      var ng = ctx.createLinearGradient(0, ny0, 0, 2);
      ng.addColorStop(0, spr.neon); ng.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.28; ctx.fillStyle = ng; ctx.fillRect(nx0, ny0, nw, -ny0 + 2);
      ctx.globalAlpha = 1; ctx.fillStyle = spr.neon; ctx.fillRect(nx0, ny0, nw, 1);
    }
    // The body rides on its suspension: static ride height / rake from the
    // build, plus opts.susp {z (m), phi (rad)} from the sim. It turns about
    // the middle of the wheelbase; the wheels stay on the ground.
    var ppx = DR.PPM * RS, wbPx = R.wheelF.x - R.wheelR.x, mid = wbPx / 2;
    var ride = spr.look.ride || [0, 0], su = opts.susp || { z: 0, phi: 0 };
    var lift = ((ride[0] + ride[1]) / 2 + su.z) * ppx, bphi = (ride[0] - ride[1]) * ppx / wbPx + su.phi;
    function bodyXf() { ctx.translate(mid, Math.round(-lift + bodyLift)); ctx.rotate(-bphi); ctx.translate(-mid, 0); }
    var bx = Math.round(-rx), by = Math.round(-ground - 1);
    ctx.save(); bodyXf(); ctx.drawImage(spr.under, bx, by); ctx.restore();
    var look = spr.look, sp = opts.spin || 0;
    drawWheel(ctx, 0, -R.wheelR.r, R.wheelR.r, wheelAng, look, look.slick ? 'drag' : spr.rim, sp, null);
    var fk = opts.frontStill ? 0 : R.wheelR.r / R.wheelF.r;
    drawWheel(ctx, R.wheelF.x - rx, -R.wheelF.r, R.wheelF.r, opts.frontStill ? 0.3 : wheelAng * fk, look, spr.rail ? 'drag' : spr.rim, sp * fk, spr.rail ? null : '#b3202a');
    ctx.save(); bodyXf();
    ctx.drawImage(spr.canvas, bx, by);
    if (opts.brake > 0.05) {
      var lx = Math.round(R.tail.x - rx), ly = Math.round(R.tail.y - ground - 1);
      ctx.fillStyle = '#ffd0c8'; ctx.fillRect(lx - RS, ly - 2 * RS, 3 * RS, 4 * RS);
      ctx.globalAlpha = 0.45 * opts.brake; ctx.fillStyle = '#ff2020'; ctx.fillRect(lx - 4 * RS, ly - 4 * RS, 6 * RS, 8 * RS);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.restore();
  };

  // Screen-space lamp anchors of a drawn car (for the lighting pass).
  DR.carLamps = function (spr, gx, gy, pitch) {
    function tr(x, y) { var dx = x - spr.wheelR.x, dy = y - spr.groundY - 1 / (spr.RS || 1), c = Math.cos(-pitch), s = Math.sin(-pitch); return { x: gx + dx * c - dy * s, y: gy + dx * s + dy * c }; }
    return { head: spr.head ? tr(spr.head.x, spr.head.y) : null, tail: tr(spr.tail.x, spr.tail.y),
      neon: spr.neon ? { c: hexToRgb(spr.neon), x: gx + (spr.padL + spr.lenPx / 2 - spr.wheelR.x), w: spr.lenPx } : null };
  };

  // Parachute trailing behind the car. k: 0..1 how far it has deployed.
  function drawChute(ctx, spr, k, t, RS) {
    RS = RS || 1;
    var rearX = -(spr.wheelR.x - spr.padL), attachY = -Math.round(spr.wheelR.r * 1.6);
    var dist = (12 + 32 * k) * RS, cx = Math.round(rearX - dist), size = Math.round((4 + 10 * k) * RS);
    var cy = attachY - Math.round((4 + 4 * k + Math.sin(t * 9) * 2 * k) * RS);
    ctx.fillStyle = '#2a2a2a';
    for (var i = 0; i <= dist; i += 1) ctx.fillRect(Math.round(rearX - i), Math.round(attachY + (cy - attachY) * (i / dist)), 1, 1);
    for (var dy = -size; dy <= size; dy++) {
      var w = Math.round(Math.sqrt(Math.max(0, size * size - dy * dy)) * 0.55) + 1;
      var band = (Math.floor((dy + size) / (4 * RS)) % 2);
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
