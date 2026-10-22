// ===========================================================================
// GARAGE, PARTS SHOP & INSTALL BAY — laid out like Pixel Car Racer:
//  * Garage: the car big in the middle of a lit garage, the menu down the
//    side and arrows to switch between your cars.
//  * Parts Shop: part cards with pixel icons, colour-coded by level. Parts
//    go into your inventory.
//  * Parts (install bay): fit parts from your inventory, take parts off
//    (they go back on the shelf) and sell spares.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, A = DR.Audio, h = UI.h, btn = UI.btn;

  DR.LEVEL_COLS = ['#8a8f99', '#c4c8d0', '#46e07a', '#4da3ff', '#b06bff', '#ff9a2e'];
  function lvlOf(price) { return price ? DR.partLevel(price) : 0; }

  // ---------------------------------------------------------------- icons
  // 24x24 pixel-art icons, one per part category, drawn from rectangles and
  // pixel discs so they stay crisp when scaled up.
  var ICON_CACHE = {};
  var M1 = '#e4e7ee', M2 = '#a7adb8', M3 = '#666c78', M4 = '#3a3e47', BK = '#18191d';
  DR.partIcon = function (cat, lvl, id) {
    var key = cat + '|' + lvl + '|' + (cat === 'fi' ? (DR.FI[id] || {}).type : cat === 'rtires' || cat === 'ftires' ? id : '');
    if (ICON_CACHE[key]) return ICON_CACHE[key];
    var c = document.createElement('canvas'); c.width = 24; c.height = 24;
    var x = c.getContext('2d'), ac = DR.LEVEL_COLS[lvl || 1];
    function r(px, py, w, hh, col) { x.fillStyle = col; x.fillRect(px, py, w, hh); }
    function disc(cx, cy, rad, col) { x.fillStyle = col; for (var yy = -rad; yy <= rad; yy++) for (var xx = -rad; xx <= rad; xx++) if (xx * xx + yy * yy <= rad * rad + rad * 0.6) x.fillRect(cx + xx, cy + yy, 1, 1); }
    function ring(cx, cy, r1, r0, col) { x.fillStyle = col; for (var yy = -r1; yy <= r1; yy++) for (var xx = -r1; xx <= r1; xx++) { var d = xx * xx + yy * yy; if (d <= r1 * r1 + r1 * 0.6 && d > r0 * r0 + r0 * 0.6) x.fillRect(cx + xx, cy + yy, 1, 1); } }
    var fiType = cat === 'fi' ? (DR.FI[id] || {}).type : '';
    switch (cat) {
      case 'engine':
        r(5, 9, 14, 9, M3); r(5, 9, 14, 1, M2); r(4, 6, 16, 3, ac); r(4, 6, 16, 1, M1); r(7, 18, 10, 2, M4);
        disc(3, 14, 2, M2); r(8, 11, 2, 2, BK); r(12, 11, 2, 2, BK); r(16, 11, 1, 2, BK); r(9, 3, 6, 3, M2); r(10, 2, 4, 1, M1); break;
      case 'intake':
        r(15, 9, 6, 6, M2); r(15, 9, 6, 1, M1);
        for (var i = 0; i < 9; i++) r(4 + i, 12 - Math.floor(i / 2) - 1, 1, 3 + Math.floor(i / 2) * 2, i % 2 ? ac : DR.shadeHex(ac, -0.35));
        r(3, 7, 2, 10, M1); break;
      case 'exhaust':
        r(1, 12, 6, 3, M2); r(6, 9, 10, 9, M3); r(6, 9, 10, 2, M2); r(16, 12, 4, 3, M2); r(19, 10, 4, 7, M1); r(20, 11, 2, 5, BK); r(7, 13, 8, 1, ac); break;
      case 'headers':
        for (var k = 0; k < 4; k++) { r(3 + k * 4, 3, 3, 9 + k, M2); r(3 + k * 4, 3, 1, 9 + k, M1); }
        r(3, 2, 16, 2, ac); r(6, 13, 12, 3, M2); r(9, 16, 6, 3, M2); r(10, 19, 4, 4, M3); break;
      case 'cams':
        r(1, 11, 22, 2, M2); r(1, 11, 22, 1, M1);
        for (k = 0; k < 4; k++) { r(3 + k * 5, 7, 3, 4, ac); r(4 + k * 5, 6, 1, 1, ac); r(3 + k * 5, 13, 3, 2, DR.shadeHex(ac, -0.3)); } break;
      case 'heads':
        r(2, 7, 20, 10, M2); r(2, 7, 20, 1, M1); r(2, 16, 20, 1, M4);
        for (k = 0; k < 4; k++) { disc(5 + k * 5, 12, 2, BK); r(4 + k * 5, 11, 1, 1, ac); } break;
      case 'internals':
        r(6, 3, 12, 7, M1); r(6, 5, 12, 1, M3); r(6, 7, 12, 1, M3); r(7, 10, 10, 3, M2);
        r(11, 11, 2, 9, ac); r(9, 19, 6, 3, ac); disc(12, 20, 1, M4); break;
      case 'fuelsys':
        r(9, 2, 6, 4, ac); r(10, 6, 4, 12, M2); r(10, 6, 1, 12, M1); r(11, 18, 2, 3, M3); r(7, 9, 10, 2, M3);
        x.fillStyle = 'rgba(120,200,255,0.8)'; x.fillRect(10, 21, 1, 2); x.fillRect(12, 21, 1, 2); x.fillRect(11, 22, 1, 2); break;
      case 'fueltype':
        r(5, 6, 14, 15, '#c42a2a'); r(5, 6, 14, 1, '#e65050'); r(14, 3, 4, 3, M2); r(7, 3, 6, 2, M4);
        r(7, 10, 10, 1, '#8a1a1a'); r(7, 13, 10, 1, '#8a1a1a'); r(7, 16, 10, 1, '#8a1a1a'); r(9, 9, 6, 9, ac); break;
      case 'ecu':
        r(5, 5, 14, 14, M4); r(5, 5, 14, 1, M3);
        for (k = 0; k < 5; k++) { r(2, 6 + k * 3, 3, 1, M2); r(19, 6 + k * 3, 3, 1, M2); r(6 + k * 3, 2, 1, 3, M2); r(6 + k * 3, 19, 1, 3, M2); }
        r(8, 8, 8, 8, ac); r(9, 9, 6, 6, DR.shadeHex(ac, -0.45)); break;
      case 'fi':
        if (fiType === 'roots' || fiType === 'screw') {
          r(3, 5, 18, 10, M1); r(3, 5, 18, 2, '#ffffff'); for (k = 0; k < 6; k++) r(4 + k * 3, 8, 1, 6, M3);
          r(5, 2, 4, 3, ac); r(15, 2, 4, 3, ac); r(5, 15, 14, 4, M4); r(2, 19, 20, 2, M3);
        } else if (fiType === 'cent') {
          disc(11, 13, 7, M2); disc(11, 13, 4, M1); r(11, 3, 10, 4, M2); r(18, 3, 3, 4, ac); disc(11, 13, 1, M4);
        } else {
          disc(10, 13, 7, M2); ring(10, 13, 7, 5, M1); disc(10, 13, 3, M4); r(14, 3, 8, 5, M2); r(19, 3, 3, 5, ac); r(1, 11, 3, 5, M3); r(8, 19, 5, 4, M3);
        }
        break;
      case 'ic':
        r(2, 6, 3, 12, M3); r(19, 6, 3, 12, M3); r(5, 7, 14, 10, M2);
        for (k = 0; k < 5; k++) r(5, 8 + k * 2, 14, 1, M4); r(5, 7, 14, 1, ac); break;
      case 'launch':
        r(4, 8, 12, 12, M4); r(4, 8, 12, 1, M3); r(6, 11, 8, 3, '#1c3a22'); DR.pixText(x, '2', 8, 12, '#46e07a', 1);
        r(17, 3, 1, 17, M2); r(18, 3, 5, 4, ac); r(18, 4, 1, 1, BK); r(20, 5, 1, 1, BK); break;
      case 'nitrous':
        r(8, 7, 8, 15, ac); r(8, 7, 2, 15, DR.shadeHex(ac, 0.35)); r(9, 5, 6, 2, ac); r(10, 2, 4, 3, M2); r(14, 3, 4, 1, M1); r(7, 21, 10, 1, M4);
        DR.pixText(x, 'N', 11, 12, '#ffffff', 1); break;
      case 'nosctrl':
        r(3, 5, 18, 14, M4); r(3, 5, 18, 1, M3); disc(9, 12, 4, M3); r(9, 9, 1, 3, ac); r(15, 9, 4, 2, '#46e07a'); r(15, 13, 4, 2, ac); break;
      case 'trans':
        for (k = 0; k < 7; k++) r(2 + k, 10 - k, 1, 4 + k * 2, M2);
        r(9, 5, 9, 12, M3); r(9, 5, 9, 1, M2); r(18, 9, 4, 4, M2); r(11, 8, 5, 1, ac); r(11, 11, 5, 1, ac); r(11, 14, 5, 1, ac); break;
      case 'clutch':
        disc(12, 12, 10, M3); disc(12, 12, 8, ac); disc(12, 12, 4, M2);
        for (k = 0; k < 6; k++) { var an = k * Math.PI / 3; r(Math.round(12 + Math.cos(an) * 6) - 1, Math.round(12 + Math.sin(an) * 6) - 1, 2, 2, M4); }
        disc(12, 12, 1, BK); break;
      case 'converter':
        disc(12, 12, 10, M2); ring(12, 12, 10, 8, M1); disc(12, 12, 6, M3); ring(12, 12, 6, 5, ac); disc(12, 12, 2, BK); break;
      case 'transbrake':
        r(4, 7, 14, 10, M3); r(4, 7, 14, 1, M2); r(18, 9, 4, 6, M2); disc(11, 12, 3, '#d23a3a'); r(10, 11, 2, 1, '#ff8080'); r(6, 17, 2, 4, ac); r(14, 17, 2, 4, ac); break;
      case 'flywheel':
        ring(12, 12, 11, 8, M2); for (k = 0; k < 16; k++) { var a2 = k * Math.PI / 8; r(Math.round(12 + Math.cos(a2) * 10), Math.round(12 + Math.sin(a2) * 10), 1, 1, M4); }
        disc(12, 12, 7, M3); disc(12, 12, 2, ac); break;
      case 'driveshaft':
        r(2, 10, 20, 4, M2); r(2, 10, 20, 1, M1); r(1, 8, 3, 8, ac); r(20, 8, 3, 8, ac); r(11, 9, 2, 6, M3); break;
      case 'diff':
        disc(12, 12, 7, M3); disc(12, 12, 5, M2); r(1, 11, 5, 3, M4); r(18, 11, 5, 3, M4); disc(12, 12, 2, ac); r(5, 5, 3, 2, M2); break;
      case 'layout':
        r(5, 3, 2, 18, M3); r(17, 3, 2, 18, M3); r(4, 3, 4, 4, BK); r(16, 3, 4, 4, BK); r(4, 17, 4, 4, BK); r(16, 17, 4, 4, BK);
        r(7, 4, 10, 2, ac); r(7, 18, 10, 2, ac); r(11, 6, 2, 12, M2); break;
      case 'springs':
        r(7, 2, 10, 2, M3); r(7, 20, 10, 2, M3);
        for (k = 0; k < 5; k++) { r(6, 5 + k * 3, 12, 2, ac); r(6, 5 + k * 3, 12, 1, DR.shadeHex(ac, 0.3)); } break;
      case 'shocks':
        r(10, 2, 4, 3, M2); r(11, 5, 2, 7, M1); r(8, 12, 8, 9, ac); r(8, 12, 2, 9, DR.shadeHex(ac, 0.3)); r(9, 21, 6, 2, M3); disc(12, 3, 2, M3); break;
      case 'rearsusp':
        r(3, 7, 18, 2, M2); r(3, 15, 18, 2, M2); disc(4, 8, 2, ac); disc(20, 8, 2, ac); disc(4, 16, 2, ac); disc(20, 16, 2, ac); r(11, 9, 2, 6, M3); break;
      case 'wheeliebar':
        r(1, 9, 16, 2, M2); r(1, 9, 16, 1, M1); r(15, 9, 2, 8, M3); disc(16, 18, 4, BK); disc(16, 18, 2, ac); r(3, 11, 2, 4, M3); break;
      case 'aero':
        r(2, 6, 20, 4, ac); r(2, 6, 20, 1, DR.shadeHex(ac, 0.3)); r(1, 4, 2, 9, M4); r(21, 4, 2, 9, M4); r(7, 10, 2, 10, M3); r(15, 10, 2, 10, M3); break;
      case 'rtires': case 'ftires':
        var slick = /^(sl|dr|pm|rad)/.test(id || '') || cat === 'rtires';
        disc(12, 12, slick ? 11 : 10, BK); ring(12, 12, slick ? 11 : 10, slick ? 9 : 8, '#2b2c31');
        disc(12, 12, 6, M2); disc(12, 12, 4, M3); disc(12, 12, 1, ac);
        for (k = 0; k < 5; k++) { var a3 = k * Math.PI * 2 / 5; r(Math.round(12 + Math.cos(a3) * 4), Math.round(12 + Math.sin(a3) * 4), 1, 1, M1); }
        r(4, 3, 3, 1, '#4a4c55'); break;
      case 'wheels':
        disc(12, 12, 10, M2); disc(12, 12, 8, M4);
        for (k = 0; k < 6; k++) { var a4 = k * Math.PI / 3; for (var q = 2; q <= 7; q++) r(Math.round(12 + Math.cos(a4) * q), Math.round(12 + Math.sin(a4) * q), 1, 1, M1); }
        disc(12, 12, 2, ac); break;
      case 'weight':
        r(3, 9, 18, 12, M3); r(3, 9, 18, 1, M2); r(8, 4, 8, 5, M4); r(10, 6, 4, 3, M3); DR.pixText(x, '-LB', 6, 13, ac, 1); break;
      // cosmetic slots: a little car with the part lit up
      case 'v_fbumper': case 'v_rbumper': case 'v_skirt': case 'v_spoiler': case 'v_hood': case 'v_roof':
      case 'v_rims': case 'v_tint': case 'v_neon': case 'v_finish': case 'v_vinyl': case 'v_tips':
        var bodyCol = cat === 'v_finish' ? ac : '#7a808c';
        if (cat === 'v_neon') { x.fillStyle = ac; x.globalAlpha = 0.45; x.fillRect(2, 19, 20, 3); x.globalAlpha = 1; x.fillRect(4, 18, 16, 1); }
        r(2, 11, 20, 6, bodyCol); r(7, 7, 10, 4, bodyCol); r(2, 11, 20, 1, DR.shadeHex(bodyCol, 0.25));
        r(8, 8, 4, 3, cat === 'v_tint' ? ac : '#2a3346'); r(13, 8, 3, 3, cat === 'v_tint' ? ac : '#2a3346');
        disc(6, 17, 3, BK); disc(18, 17, 3, BK); disc(6, 17, 1, cat === 'v_rims' ? ac : M2); disc(18, 17, 1, cat === 'v_rims' ? ac : M2);
        if (cat === 'v_rims') { ring(6, 17, 2, 1, ac); ring(18, 17, 2, 1, ac); }
        if (cat === 'v_fbumper') r(20, 13, 4, 4, ac);
        if (cat === 'v_rbumper') r(0, 12, 4, 5, ac);
        if (cat === 'v_skirt') r(9, 16, 7, 2, ac);
        if (cat === 'v_spoiler') { r(0, 6, 6, 2, ac); r(2, 8, 1, 3, ac); }
        if (cat === 'v_hood') { r(16, 10, 6, 2, ac); r(18, 9, 2, 1, ac); }
        if (cat === 'v_roof') r(10, 5, 4, 2, ac);
        if (cat === 'v_vinyl') { r(3, 13, 18, 1, ac); r(5, 14, 6, 1, ac); }
        if (cat === 'v_tips') r(0, 16, 3, 2, ac);
        break;
      default:
        disc(12, 12, 8, M3); disc(12, 12, 4, ac);
    }
    ICON_CACHE[key] = c;
    return c;
  };
  // Icon as a scaled-up canvas element with a level-coloured backdrop.
  function iconEl(cat, lvl, id, size, cls) {
    var c = h('canvas', { class: 'picon ' + (cls || ''), width: 24, height: 24, style: { width: size + 'px', height: size + 'px' } });
    c.getContext('2d').drawImage(DR.partIcon(cat, lvl, id), 0, 0);
    return c;
  }
  UI.partIconEl = iconEl;

  // ---------------------------------------------------------------- shared helpers
  function hypothetical(inst, cat, id) {
    var copy = JSON.parse(JSON.stringify(inst));
    if (cat === 'engine') { DR.ENGINE_BOUND.forEach(function (c) { delete copy.parts[c]; }); copy.engine = id; delete copy.tune.boost; delete copy.tune.launchRpm; delete copy.tune.shiftRpm; delete copy.tune.revLimit; }
    else {
      if (id === DR.stockPart(cat, copy)) delete copy.parts[cat]; else copy.parts[cat] = id;
      if (cat === 'fi') delete copy.tune.boost;
      if (cat === 'trans') delete copy.tune.gears;
      if (cat === 'rtires') delete copy.tune.psi;
      if (cat === 'rearsusp') delete copy.tune.antiSquat;
    }
    return copy;
  }
  UI.hypothetical = hypothetical;
  // Small "+42 hp  -0.31s" line for a part on this car.
  function gainLine(inst, cat, id) {
    var S0 = G.spec(inst), copy = hypothetical(inst, cat, id), S1 = DR.buildSpec(copy);
    var e0 = G.estimate(inst, DR.QUARTER).et, e1 = G.estimate(copy, DR.QUARTER).et;
    var dhp = Math.round(S1.peakHp + S1.nosHp - S0.peakHp - S0.nosHp), dlb = Math.round((S1.m - S0.m) * 2.2046), det = Math.min(e1, 99) - Math.min(e0, 99);
    var out = [];
    if (dhp) out.push(h('span', { class: dhp > 0 ? 'good' : 'bad' }, (dhp > 0 ? '+' : '') + dhp + 'hp'));
    if (dlb) out.push(h('span', { class: dlb < 0 ? 'good' : 'bad' }, (dlb > 0 ? '+' : '') + dlb + 'lb'));
    if (Math.abs(det) >= 0.005) out.push(h('span', { class: det < 0 ? 'good' : 'bad' }, (det > 0 ? '+' : '') + det.toFixed(2) + 's'));
    if (e1 >= 90 && e0 < 90) out.push(h('span', { class: 'bad' }, 'crashes!'));
    return out.length ? h('span', { class: 'gain' }, out) : h('span', { class: 'gain dim' }, 'no change');
  }
  function deltaRow(a, b, unit, dec, lowerBetter) {
    var diff = b - a, cls = Math.abs(diff) < Math.pow(10, -(dec || 0)) / 2 ? 'dim' : ((diff < 0) === !!lowerBetter ? 'good' : 'bad');
    return h('span', { class: cls }, a.toFixed(dec || 0) + ' → ' + b.toFixed(dec || 0) + unit);
  }
  function starMeter(stars) {
    var meter = h('div', { class: 'stars' });
    for (var i = 1; i <= 10; i++) meter.appendChild(h('span', { class: stars >= i ? 'on' : stars > i - 1 ? 'half' : '' }, '★'));
    return meter;
  }

  // ---------------------------------------------------------------- garage scene
  // A PCR-style garage bay: tool chest, pegboard, tire rack, roll-up door,
  // strip lights, a polished floor and the car front and centre.
  function drawBay(canvas, inst, aspect) {
    var spr = DR.carSprite(DR.carLook(inst));
    var W = Math.max(420, Math.round(spr.lenPx * 2.3)), H = Math.round(W / Math.max(1.5, Math.min(2.6, aspect || 2.1)));
    canvas.width = W; canvas.height = H;
    var x = canvas.getContext('2d'); x.imageSmoothingEnabled = false;
    var fl = Math.round(H * 0.64), i, k;
    // back wall: painted block
    var g = x.createLinearGradient(0, 0, 0, fl);
    g.addColorStop(0, '#15171d'); g.addColorStop(1, '#2a2e38');
    x.fillStyle = g; x.fillRect(0, 0, W, fl);
    x.fillStyle = 'rgba(0,0,0,0.22)';
    for (i = 0; i < fl; i += 12) { x.fillRect(0, i, W, 1); for (k = ((i / 12) % 2) * 12; k < W; k += 24) x.fillRect(k, i, 1, 12); }
    x.fillStyle = '#3a2f22'; x.fillRect(0, fl - 26, W, 18); x.fillStyle = '#4a3c2b'; x.fillRect(0, fl - 26, W, 2);   // wainscot
    // roll-up door behind the car
    var dx = Math.round(W * 0.27), dw = Math.round(W * 0.46), dy = Math.round(fl * 0.2);
    x.fillStyle = '#0e0f13'; x.fillRect(dx - 4, dy - 4, dw + 8, fl - dy - 22);
    for (i = dy; i < fl - 26; i += 6) { x.fillStyle = '#5b606b'; x.fillRect(dx, i, dw, 5); x.fillStyle = '#6c717d'; x.fillRect(dx, i, dw, 1); }
    x.fillStyle = '#ffcc00'; for (k = dx; k < dx + dw; k += 16) { x.fillRect(k, fl - 30, 8, 3); }
    // left: pegboard + red tool chest
    var px0 = Math.round(W * 0.04), pw = Math.round(W * 0.18);
    x.fillStyle = '#6b5135'; x.fillRect(px0, Math.round(fl * 0.16), pw, Math.round(fl * 0.36));
    x.fillStyle = '#543f29'; for (i = Math.round(fl * 0.16) + 3; i < fl * 0.52; i += 5) for (k = px0 + 3; k < px0 + pw; k += 5) x.fillRect(k, i, 1, 1);
    // tools on the pegboard
    var ty = Math.round(fl * 0.2);
    x.fillStyle = '#c8ccd4'; x.fillRect(px0 + 6, ty, 3, 22); x.fillRect(px0 + 4, ty, 7, 4);           // wrench
    x.fillRect(px0 + 16, ty + 2, 2, 20); x.fillStyle = '#d23a3a'; x.fillRect(px0 + 15, ty + 14, 4, 9); // screwdriver
    x.fillStyle = '#c8ccd4'; x.fillRect(px0 + 26, ty, 3, 18); x.fillStyle = '#2a62b5'; x.fillRect(px0 + 25, ty + 12, 5, 10);
    x.fillStyle = '#9aa0ab'; x.fillRect(px0 + 36, ty + 4, 14, 4); x.fillStyle = '#ffcc00'; x.fillRect(px0 + 46, ty + 8, 4, 12);   // ratchet
    x.fillStyle = '#c8ccd4'; for (k = 0; k < 4; k++) x.fillRect(px0 + 56 + k * 5, ty + 2 + k, 3, 16 - k * 2);
    var cx0 = px0, cw = pw, cy0 = Math.round(fl * 0.56);
    x.fillStyle = '#9e1f1f'; x.fillRect(cx0, cy0, cw, fl - cy0 + 4);
    x.fillStyle = '#c62f2f'; x.fillRect(cx0, cy0, cw, 3);
    for (i = cy0 + 6; i < fl; i += 8) { x.fillStyle = '#7d1717'; x.fillRect(cx0 + 2, i, cw - 4, 1); x.fillStyle = '#d0d4dc'; x.fillRect(cx0 + cw / 2 - 6, i + 3, 12, 2); }
    x.fillStyle = '#111'; x.fillRect(cx0 + 2, fl + 4, 4, 4); x.fillRect(cx0 + cw - 6, fl + 4, 4, 4);
    // right: shelf with tires and boxes
    var sx = Math.round(W * 0.79), sw = Math.round(W * 0.18);
    x.fillStyle = '#4b505b'; x.fillRect(sx, Math.round(fl * 0.12), 3, fl - Math.round(fl * 0.12)); x.fillRect(sx + sw - 3, Math.round(fl * 0.12), 3, fl - Math.round(fl * 0.12));
    [0.3, 0.58, 0.86].forEach(function (f) { x.fillStyle = '#5c6270'; x.fillRect(sx, Math.round(fl * f), sw, 3); });
    var tr = Math.round(fl * 0.1);
    for (k = 0; k < 3; k++) {
      var tx = sx + 6 + k * (tr * 2 + 2), tyy = Math.round(fl * 0.58) - tr;
      if (tx + tr * 2 > sx + sw) break;
      x.fillStyle = '#141416'; x.beginPath(); x.arc(tx + tr, tyy, tr, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#5c6270'; x.beginPath(); x.arc(tx + tr, tyy, tr * 0.5, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#2a2b30'; x.beginPath(); x.arc(tx + tr, tyy, tr * 0.25, 0, Math.PI * 2); x.fill();
    }
    [['#c99a00', 0.3, 0], ['#2a62b5', 0.3, 1], ['#b52a2a', 0.86, 0], ['#d8d8d8', 0.86, 1], ['#1e9e4a', 0.86, 2]].forEach(function (b) {
      var bw = Math.round(sw * 0.26), bh = Math.round(fl * 0.1);
      x.fillStyle = b[0]; x.fillRect(sx + 6 + b[2] * (bw + 3), Math.round(fl * b[1]) - bh, bw, bh);
      x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(sx + 6 + b[2] * (bw + 3), Math.round(fl * b[1]) - bh, bw, 2);
    });
    // neon shop sign
    var sign = 'PIXEL DRAG', ss = 2, sgx = Math.round(W / 2 - DR.pixTextW(sign, ss) / 2), sgy = Math.round(fl * 0.07);
    x.save(); x.shadowColor = '#ff2bd6'; x.shadowBlur = 10; DR.pixText(x, sign, sgx, sgy, '#ff7be8', ss); x.restore();
    DR.pixText(x, sign, sgx, sgy, '#ffd6f7', ss);
    // floor: polished epoxy with tiles and a yellow bay line
    var fg = x.createLinearGradient(0, fl, 0, H);
    fg.addColorStop(0, '#3f434c'); fg.addColorStop(1, '#22242a');
    x.fillStyle = fg; x.fillRect(0, fl, W, H - fl);
    x.fillStyle = 'rgba(0,0,0,0.18)';
    for (i = 0; i < 6; i++) { var yy = fl + Math.round((H - fl) * Math.pow(i / 6, 1.4)); x.fillRect(0, yy, W, 1); }
    for (k = -10; k <= 10; k++) { x.beginPath(); x.moveTo(W / 2 + k * 30, fl); x.lineTo(W / 2 + k * 70, H); x.lineTo(W / 2 + k * 70 + 1, H); x.lineTo(W / 2 + k * 30 + 1, fl); x.fill(); }
    x.fillStyle = '#ffcc00'; x.fillRect(0, fl + Math.round((H - fl) * 0.78), W, 2);
    x.fillStyle = '#62666f'; x.fillRect(0, fl, W, 1);
    // strip lights and their pools
    x.save(); x.globalCompositeOperation = 'lighter';
    [0.3, 0.7].forEach(function (f) {
      var lx = Math.round(W * f);
      var cone = x.createLinearGradient(0, 0, 0, H);
      cone.addColorStop(0, 'rgba(255,240,210,0.14)'); cone.addColorStop(1, 'rgba(255,240,210,0.02)');
      x.fillStyle = cone; x.beginPath(); x.moveTo(lx - 30, 4); x.lineTo(lx + 30, 4); x.lineTo(lx + 120, H); x.lineTo(lx - 120, H); x.closePath(); x.fill();
    });
    x.translate(W / 2, fl + (H - fl) * 0.45); x.scale(1, 0.22);
    var pg = x.createRadialGradient(0, 0, 0, 0, 0, W * 0.38);
    pg.addColorStop(0, 'rgba(255,236,200,0.26)'); pg.addColorStop(1, 'rgba(255,236,200,0)');
    x.fillStyle = pg; x.fillRect(-W * 0.4, -W * 0.4, W * 0.8, W * 0.8);
    x.restore();
    [0.3, 0.7].forEach(function (f) { var lx = Math.round(W * f); x.fillStyle = '#2a2c33'; x.fillRect(lx - 34, 0, 68, 5); x.fillStyle = '#fff6dc'; x.fillRect(lx - 31, 3, 62, 2); });
    // the car, with a reflection in the floor
    var gy = fl + Math.round((H - fl) * 0.36), gxx = Math.round(W / 2 - spr.lenPx / 2 + (spr.wheelR.x - spr.padL));
    x.save(); x.globalAlpha = 0.18; x.translate(0, gy * 2); x.scale(1, -1);
    DR.drawCar(x, spr, gxx, gy, 0, 0.3, { shadow: false });
    x.restore();
    DR.drawCar(x, spr, gxx, gy, 0, 0.3);
    // vignette
    var vg = x.createRadialGradient(W / 2, H * 0.55, H * 0.4, W / 2, H * 0.55, W * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
  }
  DR.drawBay = drawBay;

  // ---------------------------------------------------------------- GARAGE (hub)
  UI.Garage = function () {
    var inst = G.car(), S = G.spec(inst), cars = G.state.cars, idx = cars.indexOf(inst);
    var cv = h('canvas', { class: 'bay' });
    drawBay(cv, inst);
    // redraw at the real aspect once on screen so the floor is never cropped
    setTimeout(function () { var r = cv.getBoundingClientRect(); if (r.width && r.height) drawBay(cv, inst, r.width / r.height); }, 0);
    function cycle(d) { var n = cars.length; G.state.active = cars[(idx + d + n) % n].uid; G.save(); UI.refresh(); }
    var dmg = null;
    if (inst.damage) {
      var cost = G.repairCost(inst);
      dmg = h('div', { class: 'gdmg warnbox' }, (inst.damage.engine ? 'ENGINE BLOWN! ' : 'TRANSMISSION BROKEN! ') + 'Repair: ' + DR.money(cost) + ' ',
        btn('Repair', function () { if (G.repair(inst)) { A.cash(); UI.refresh(); } else UI.toast('Not enough money'); }, 'small go'));
    }
    var spare = G.state.inv.filter(function (it) { return !G.partFitIssue(it, inst); }).length;
    function mbtn(label, fn, cls, badge) {
      return btn([label, badge ? h('span', { class: 'badge' }, String(badge)) : null], fn, 'gbtn ' + (cls || ''));
    }
    var menu = h('div', { class: 'gmenu' },
      mbtn('⚑ Race', function () { if (inst.damage) return UI.toast('Repair your car first!'); UI.show(UI.RaceMenu); }, 'race'),
      mbtn('Parts Shop', function () { UI.show(UI.Shop); }, 'shop'),
      mbtn('Install Parts', function () { UI.show(UI.Parts); }, 'blue', spare),
      mbtn('Tune', function () { UI.show(UI.Tune); }),
      mbtn('Dyno', function () { UI.show(UI.Dyno); }),
      mbtn('Body Shop', function () { UI.show(UI.Body); }, 'purple'),
      mbtn('Paint', function () { UI.show(UI.Paint); }),
      mbtn('Car Shows', function () { if (inst.damage) return UI.toast('Repair your car first!'); UI.show(UI.Shows); }),
      mbtn('Dealer', function () { UI.show(UI.Dealer); }));
    var est = G.estimate(inst, DR.QUARTER), stars = DR.starRating(inst);
    var stat = function (k, v, cls) { return h('div', { class: 'gst' }, h('span', { class: 'k' }, k), h('span', { class: 'v ' + (cls || '') }, v)); };
    var side = h('div', { class: 'gside' },
      stat('POWER', Math.round(S.peakHp) + (S.nosHp ? '+' + S.nosHp : '') + ' hp', 'acc'),
      stat('TORQUE', Math.round(S.peakTq) + ' lb-ft'),
      stat('WEIGHT', UI.kgLb(S.m)),
      stat('DRIVE', S.drive + ' • ' + DR.TRANS[S.transId].ratios.length + '-spd'),
      stat('EST 1/4', est.et >= 90 ? 'crash!' : est.et.toFixed(2) + 's', 'good'),
      inst.best && inst.best.q ? stat('BEST 1/4', inst.best.q.toFixed(3) + 's', 'acc') : null,
      h('div', { class: 'gst' }, h('span', { class: 'k' }, 'LOOKS'), starMeter(stars)),
      S.risk.engine > 0.001 || S.risk.trans > 0.001 ? h('div', { class: 'bad gsmall' }, '⚠ ' + Math.round(Math.max(S.risk.engine, S.risk.trans) * 100) + '% failure risk') : null,
      h('div', { class: 'gsmall acc' }, UI.careerLine().textContent.replace('Career: ', '')),
      h('div', { class: 'gsmall dim' }, 'Record ' + G.state.stats.wins + 'W / ' + (G.state.stats.races - G.state.stats.wins) + 'L'));
    var sel = h('div', { class: 'gsel' },
      cars.length > 1 ? btn('◀', function () { cycle(-1); }, 'arrow') : null,
      h('div', { class: 'gname' }, h('div', { class: 'pix acc' }, DR.CARS[inst.carId].name), h('div', { class: 'dim' }, (idx + 1) + ' / ' + cars.length + ' • ' + DR.ENGINES[inst.engine].name)),
      cars.length > 1 ? btn('▶', function () { cycle(1); }, 'arrow') : null,
      btn('My Cars', function () { UI.show(UI.Cars); }, 'small back'));
    return h('div', { class: 'screen' }, UI.top('GARAGE', function () { UI.show(UI.Title); }, h('div', { class: 'row', style: { gap: '6px' } },
        btn('?', function () { UI.show(UI.Help, UI.Garage); }, 'small back'), btn('⚙', function () { UI.show(UI.Settings, UI.Garage); }, 'small back'))),
      h('div', { class: 'gwrap' }, cv, menu, side, sel, dmg));
  };

  // ---------------------------------------------------------------- PARTS SHOP
  var shopGroup = 'engine', shopCat = 'intake';
  function groupById(id) { return DR.PART_GROUPS.filter(function (g) { return g.id === id; })[0]; }
  function firstCat(group, inst) { return group.cats.filter(function (c) { return DR.partApplies(c, inst) || c === 'clutch' || c === 'converter'; })[0]; }
  UI.Shop = function (jump) {
    var inst = G.car();
    if (jump) { shopCat = jump; shopGroup = DR.groupOf(jump) || shopGroup; DR.PART_GROUPS.forEach(function (g) { if (g.cats.indexOf(jump) >= 0) shopGroup = g.id; }); }
    var group = groupById(shopGroup);
    if (group.cats.indexOf(shopCat) < 0) shopCat = firstCat(group, inst);
    var rail = h('div', { class: 'srail' }, DR.PART_GROUPS.map(function (g) {
      return h('div', { class: 'srail-i' + (g.id === shopGroup ? ' on' : ''), onclick: function () { shopGroup = g.id; shopCat = firstCat(g, inst); UI.refresh(); } },
        iconEl(g.cats[0] === 'engine' ? 'engine' : g.cats[0], 2, '', 26), h('span', {}, g.name));
    }), h('div', { class: 'srail-i', onclick: function () { UI.show(UI.Body); } }, iconEl('aero', 4, '', 26), h('span', {}, 'Body Kits')),
      h('div', { class: 'srail-i', onclick: function () { UI.show(UI.Paint); } }, iconEl('fueltype', 1, '', 26), h('span', {}, 'Paint')));
    var chips = h('div', { class: 'schips' }, group.cats.map(function (c) {
      var fits = DR.partApplies(c, inst);
      return btn(DR.catName(c), function () { shopCat = c; UI.refresh(); }, 'chip' + (c === shopCat ? ' on' : '') + (fits ? '' : ' nofit'));
    }));
    var curId = DR.partId(shopCat, inst);
    var grid = h('div', { class: 'pgrid' });
    DR.partOptions(shopCat, inst).forEach(function (o) {
      if (!o.price) return;                                  // stock / factory parts are not sold
      var lvl = lvlOf(o.price), installed = o.id === curId, owned = G.ownedCount(shopCat, o.id), locked = !G.partUnlocked(shopCat, o.price);
      grid.appendChild(h('div', { class: 'pcard l' + lvl + (locked ? ' locked' : '') + (installed ? ' inst' : ''), onclick: function () { partModal(inst, shopCat, o.id); } },
        h('div', { class: 'pic' }, iconEl(shopCat, lvl, o.id, 48)),
        h('div', { class: 'plvl' }, DR.LEVEL_NAMES[lvl]),
        h('div', { class: 'pname' }, o.name),
        h('div', { class: 'pfoot' }, locked ? h('span', { class: 'tag' }, '🔒 LOCKED') : h('span', { class: 'price' }, DR.money(o.price)),
          installed ? h('span', { class: 'tag g' }, 'ON CAR') : owned ? h('span', { class: 'tag b' }, 'OWNED ×' + owned) : null)));
    });
    if (!grid.children.length) grid.appendChild(h('div', { class: 'dim' }, 'Nothing for sale here.'));
    var note = !DR.partApplies(shopCat, inst) ? h('div', { class: 'warnbox', style: { marginBottom: '6px' } }, G.partFitIssue({ cat: shopCat, id: '' }, inst) + ' — you can still buy these for another car.') : null;
    return h('div', { class: 'screen' }, UI.top('PARTS SHOP', function () { UI.show(UI.Garage); }, btn('Install ▶', function () { UI.show(UI.Parts, shopCat); }, 'small blue')),
      h('div', { class: 'shopwrap' }, rail, h('div', { class: 'smain' }, chips, note, grid)));
  };

  function partModal(inst, cat, id) {
    var opt = DR.getOption(cat, inst, id), lvl = lvlOf(opt.price), locked = !G.partUnlocked(cat, opt.price);
    var S0 = G.spec(inst), copy = hypothetical(inst, cat, id), S1 = DR.buildSpec(copy);
    var e0 = G.estimate(inst, DR.QUARTER), e1 = G.estimate(copy, DR.QUARTER);
    var fits = DR.partApplies(cat, inst), owned = G.ownedCount(cat, id), installed = DR.partId(cat, inst) === id;
    var close;
    function buy(andInstall) {
      if (!G.canAfford(opt.price)) return UI.toast('Not enough money');
      var item = G.buyPart(cat, id); A.cash();
      if (andInstall) { var r = G.installPart(inst, item.uid); UI.toast(r.msg); } else UI.toast(opt.name + ' added to your parts');
      close(); UI.refresh();
    }
    close = UI.modal(h('div', { class: 'col pmodal l' + lvl },
      h('div', { class: 'row', style: { alignItems: 'center' } }, h('div', { class: 'pic big' }, iconEl(cat, lvl, id, 72)),
        h('div', { class: 'grow' }, h('div', { class: 'plvl' }, DR.LEVEL_NAMES[lvl] + ' • ' + DR.catName(cat)), h('div', { class: 'pix acc' }, opt.name),
          opt.desc ? h('div', { style: { marginTop: '4px' } }, opt.desc) : null)),
      fits ? UI.statsGrid([
        ['Power', deltaRow(S0.peakHp + S0.nosHp, S1.peakHp + S1.nosHp, ' hp')],
        S0.red !== S1.red ? ['Rev limiter', deltaRow(S0.red, S1.red, ' rpm')] : null,
        ['Weight', deltaRow(S0.m * 2.2046, S1.m * 2.2046, ' lb', 0, true)],
        ['Est. 1/4', deltaRow(Math.min(e0.et, 99), Math.min(e1.et, 99), 's', 2, true)],
        ['Price', DR.money(opt.price), 'good'],
        owned ? ['In your parts', '×' + owned, 'acc'] : null
      ]) : h('div', { class: 'warnbox' }, G.partFitIssue({ cat: cat, id: id }, inst)),
      fits ? UI.riskBox(S1) : null,
      cat === 'engine' ? h('div', { class: 'dim' }, 'Swapping engines moves your current engine and its engine parts to your inventory.') : null,
      G.isEngineBound(cat) && cat !== 'engine' ? h('div', { class: 'dim' }, 'Built for your ' + DR.ENGINES[inst.engine].name + '.') : null,
      locked ? h('div', { class: 'warnbox' }, '🔒 ' + DR.LEVEL_NAMES[lvl] + '-level ' + groupById(DR.groupOf(cat)).name.toLowerCase() + ' parts unlock as you win career races.') :
        h('div', { class: 'row', style: { flexWrap: 'wrap' } },
          btn('Buy ' + DR.money(opt.price), function () { buy(false); }, 'go' + (G.canAfford(opt.price) ? '' : ' disabled')),
          fits && !installed ? btn('Buy & Install', function () { buy(true); }, 'primary' + (G.canAfford(opt.price) ? '' : ' disabled')) : null),
      btn('Close', function () { close(); }, 'small')));
  }

  // ---------------------------------------------------------------- BODY SHOP
  // Cosmetic parts, shown like the parts shop. Every part adds to the visual
  // rating (stars). Parts you have bought for a car stay free to refit.
  var bodySlot = 'fbumper', neonPick = null;
  function visOptions(slot) {
    var out = [{ value: 0, name: 'Stock / None', price: 0, stars: 0, tier: 0 }];
    if (slot.styles) slot.tiers.forEach(function (list, t) { list.forEach(function (st) { out.push({ value: st, name: DR.RIM_NAMES[st], price: slot.prices[t], stars: slot.stars[t], tier: t + 1 }); }); });
    else slot.tiers.forEach(function (x, t) { if (x) out.push({ value: slot.id === 'neon' ? 'neon' : t + 1, name: x[0], price: x[1], stars: x[2], tier: t + 1 }); });
    if (slot.extra) for (var k in slot.extra) { var x = slot.extra[k]; out.push({ value: k, name: x[0], price: x[1], stars: x[2], tier: x[3] }); }
    return out;
  }
  function visOn(inst, slot, o) { var cur = inst.vis[slot.id]; return slot.id === 'neon' ? (!!cur === !!o.value) : (cur || 0) === o.value; }
  function visOwned(inst, slot, o) { return !o.price || !!(inst.visOwned && inst.visOwned[slot.id + ':' + o.value]); }
  function withVis(inst, slot, o) {
    var copy = JSON.parse(JSON.stringify(inst));
    if (o.value) copy.vis[slot.id] = slot.id === 'neon' ? (inst.vis.neon || neonPick || slot.colors[0]) : o.value; else delete copy.vis[slot.id];
    return copy;
  }
  function fitVis(inst, slot, o) {
    var owned = visOwned(inst, slot, o);
    if (!owned) {
      if (!G.canAfford(o.price)) return UI.toast('Not enough money');
      G.pay(o.price); inst.spent += o.price; A.cash();
      (inst.visOwned || (inst.visOwned = {}))[slot.id + ':' + o.value] = 1;
    }
    if (o.value) inst.vis[slot.id] = slot.id === 'neon' ? (inst.vis.neon || neonPick || slot.colors[0]) : o.value; else delete inst.vis[slot.id];
    G.save();
    UI.toast(o.value ? o.name + ' fitted!' : 'Back to stock');
    UI.afterStars(G.noteStars());
    G.checkContracts().forEach(function (m) { UI.toast(m); });
    UI.refresh();
  }
  UI.Body = function () {
    var inst = G.car();
    if (!inst.vis) inst.vis = {};
    // parts already on the car count as owned (older saves)
    var own = inst.visOwned || (inst.visOwned = {});
    DR.VISUAL.forEach(function (sl) { var v = inst.vis[sl.id]; if (v) own[sl.id + ':' + (sl.id === 'neon' ? 'neon' : v)] = 1; });
    var slot = DR.visSlot(bodySlot);
    var rail = h('div', { class: 'srail' }, DR.VISUAL.map(function (sl) {
      return h('div', { class: 'srail-i' + (sl.id === bodySlot ? ' on' : ''), onclick: function () { bodySlot = sl.id; UI.refresh(); } },
        iconEl('v_' + sl.id, inst.vis[sl.id] ? 4 : 1, '', 26), h('span', {}, sl.name));
    }));
    var cv = h('canvas', { class: 'preview' });
    DR.drawPreview(cv, inst, { aspect: 0.34 });
    var stars = DR.starRating(inst);
    var grid = h('div', { class: 'pgrid' });
    visOptions(slot).forEach(function (o) {
      var on = visOn(inst, slot, o), owned = visOwned(inst, slot, o), locked = o.tier && !G.visUnlocked(slot.id, o.tier), lvl = o.tier ? o.tier + 1 : 0;
      grid.appendChild(h('div', { class: 'pcard l' + lvl + (locked ? ' locked' : '') + (on ? ' inst' : ''), onclick: function () { if (!on) bodyModal(inst, slot, o); } },
        h('div', { class: 'pic' }, iconEl('v_' + slot.id, lvl, '', 44)),
        h('div', { class: 'plvl' }, o.tier ? 'Tier ' + o.tier + ' • +' + o.stars + ' stars' : 'Stock'),
        h('div', { class: 'pname' }, o.name),
        h('div', { class: 'pfoot' }, on ? h('span', { class: 'tag g' }, 'FITTED') : locked ? h('span', { class: 'tag' }, '🔒 WIN RACES') :
          owned && o.price ? h('span', { class: 'tag b' }, 'OWNED') : h('span', { class: 'price' }, o.price ? DR.money(o.price) : 'FREE'))));
    });
    var extra = null;
    if (slot.id === 'neon') {
      extra = h('div', {}, h('h3', {}, 'NEON COLOR' + (inst.vis.neon ? ' (free to change)' : '')), h('div', { class: 'swatches' }, slot.colors.map(function (c) {
        return h('div', { class: 'sw' + ((inst.vis.neon || neonPick || slot.colors[0]) === c ? ' on' : ''), style: { background: c }, onclick: function () {
          neonPick = c; if (inst.vis.neon) { inst.vis.neon = c; G.save(); } UI.refresh();
        } });
      })));
    }
    if (slot.id === 'vinyl' || slot.id === 'finish') extra = h('p', { class: 'dim' }, slot.id === 'vinyl' ? 'Vinyls use your stripe color from the Paint Shop when you have one.' : 'Finishes change how the paint catches the light.');
    return h('div', { class: 'screen' }, UI.top('BODY SHOP', function () { UI.show(UI.Garage); }, btn('Paint ▶', function () { UI.show(UI.Paint); }, 'small')),
      h('div', { class: 'shopwrap' }, rail, h('div', { class: 'smain' },
        h('div', { class: 'bodyhead' }, cv, h('div', { class: 'bodystars' }, h('span', { class: 'pix small acc' }, 'VISUAL RATING ' + (Math.round(stars * 100) / 100)), starMeter(stars))),
        h('h2', { style: { marginTop: '8px' } }, slot.name), grid, extra)));
  };
  function bodyModal(inst, slot, o) {
    var locked = o.tier && !G.visUnlocked(slot.id, o.tier), owned = visOwned(inst, slot, o), lvl = o.tier ? o.tier + 1 : 0;
    var copy = withVis(inst, slot, o), s0 = DR.starRating(inst), s1 = DR.starRating(copy);
    var cv = h('canvas', { class: 'preview', style: { width: '100%' } });
    DR.drawPreview(cv, copy, { aspect: 0.3 });
    var close = UI.modal(h('div', { class: 'col pmodal l' + lvl },
      cv,
      h('div', { class: 'plvl' }, (o.tier ? 'Tier ' + o.tier + ' • ' : '') + slot.name), h('div', { class: 'pix acc' }, o.name),
      UI.statsGrid([['Visual rating', deltaRow(s0, s1, ' ★', 2)], ['Price', owned ? (o.price ? 'Owned - free to refit' : 'Free') : DR.money(o.price), 'good']]),
      locked ? h('div', { class: 'warnbox' }, '🔒 Tier ' + o.tier + ' ' + slot.name.toLowerCase() + ' parts unlock as you win career races.') :
        btn(owned ? 'Fit' : 'Buy & Fit ' + DR.money(o.price), function () { close(); fitVis(inst, slot, o); }, 'go' + (owned || G.canAfford(o.price) ? '' : ' disabled')),
      btn('Close', function () { close(); }, 'small')));
  }

  // ---------------------------------------------------------------- INSTALL BAY
  var bayCat = 'intake';
  UI.Parts = function (jump) {
    var inst = G.car(), S = G.spec(inst);
    if (jump) bayCat = jump;
    var cv = h('canvas', { class: 'preview' });
    DR.drawPreview(cv, inst);
    var est = G.estimate(inst, DR.QUARTER);
    var list = h('div', { class: 'list bay-list' });
    DR.PART_GROUPS.forEach(function (g) {
      list.appendChild(h('div', { class: 'bay-h' }, g.name));
      g.cats.forEach(function (c) {
        var applies = DR.partApplies(c, inst);
        var spare = G.invFor(c).filter(function (it) { return !G.partFitIssue(it, inst); }).length;
        if (!applies && !G.invFor(c).length) return;
        var id = DR.partId(c, inst), opt = DR.getOption(c, inst, id), stock = id === DR.stockPart(c, inst);
        list.appendChild(h('div', { class: 'item' + (c === bayCat ? ' sel' : '') + (applies ? '' : ' locked'), onclick: function () { bayCat = c; UI.refresh(); } },
          iconEl(c, stock ? 0 : lvlOf(opt.price), id, 28),
          h('div', { class: 'name' }, h('div', { class: 'pix small' }, DR.catName(c)), h('div', { class: stock ? 'dim' : 'acc' }, opt.name)),
          spare ? h('span', { class: 'badge' }, String(spare)) : null));
      });
    });
    // the selected slot
    var id = DR.partId(bayCat, inst), opt = DR.getOption(bayCat, inst, id), stock = id === DR.stockPart(bayCat, inst);
    var right = h('div', { class: 'col' },
      h('h2', {}, DR.catName(bayCat)),
      h('div', { class: 'slot l' + (stock ? 0 : lvlOf(opt.price)) },
        iconEl(bayCat, stock ? 0 : lvlOf(opt.price), id, 44),
        h('div', { class: 'grow' }, h('div', { class: 'plvl' }, stock ? 'FACTORY' : 'INSTALLED • ' + DR.LEVEL_NAMES[lvlOf(opt.price)]), h('div', { class: 'pix' }, opt.name),
          opt.desc ? h('div', { class: 'dim', style: { fontSize: '16px' } }, opt.desc) : null),
        stock ? null : btn('Remove', function () {
          var go = function () { G.removePart(inst, bayCat); A.click(); UI.toast(opt.name + ' moved to your parts'); UI.refresh(); };
          if (bayCat === 'engine') UI.confirm('Pull the ' + opt.name + '? It and its engine parts go to your inventory and the factory engine goes back in.', go, 'Remove');
          else go();
        }, 'small red')),
      h('h3', {}, 'ON THE SHELF'));
    var items = G.invFor(bayCat);
    if (!items.length) right.appendChild(h('div', { class: 'dim' }, 'No spare ' + DR.catName(bayCat).toLowerCase() + ' parts.'));
    items.sort(function (a, b) { return (G.partFitIssue(a, inst) ? 1 : 0) - (G.partFitIssue(b, inst) ? 1 : 0) || b.price - a.price; }).forEach(function (it) {
      var why = G.partFitIssue(it, inst), lvl = lvlOf(it.price);
      right.appendChild(h('div', { class: 'item inv l' + lvl + (why ? ' locked' : '') },
        iconEl(it.cat, lvl, it.id, 32),
        h('div', { class: 'name' }, h('div', {}, G.partName(it)), why ? h('div', { class: 'warn', style: { fontSize: '15px' } }, why) : gainLine(inst, it.cat, it.id)),
        why ? null : btn('Install', function () {
          var go = function () { var r = G.installPart(inst, it.uid); UI.toast(r.msg); if (r.ok) A.click(); UI.refresh(); };
          if (it.cat === 'engine') UI.confirm('Swap in the ' + G.partName(it) + '? Your current engine parts come off with the old engine.', go, 'Swap');
          else go();
        }, 'small go'),
        btn('Sell ' + DR.money(G.partSellValue(it)), function () {
          UI.confirm('Sell the ' + G.partName(it) + ' for ' + DR.money(G.partSellValue(it)) + '?', function () { G.sellPart(it.uid); A.cash(); UI.refresh(); }, 'Sell');
        }, 'small')));
    });
    right.appendChild(btn('Shop for ' + DR.catName(bayCat) + ' ▶', function () { UI.show(UI.Shop, bayCat); }, 'shop'));
    return h('div', { class: 'screen' }, UI.top('INSTALL PARTS', function () { UI.show(UI.Garage); }, btn('Shop ▶', function () { UI.show(UI.Shop, bayCat); }, 'small shop')),
      h('div', { class: 'content' }, h('div', { class: 'split' },
        h('div', { class: 'left bay-left' }, cv,
          h('div', { class: 'row bay-quick' }, h('span', { class: 'acc' }, Math.round(S.peakHp + S.nosHp) + 'hp'), h('span', {}, UI.kgLb(S.m)), h('span', { class: 'good' }, est.et >= 90 ? 'crash' : est.et.toFixed(2) + 's')),
          UI.riskBox(S), list),
        h('div', { class: 'right' }, right))));
  };
})();
