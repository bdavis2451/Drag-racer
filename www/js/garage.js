// ===========================================================================
// GARAGE, PARTS SHOP & INSTALL BAY — laid out like Pixel Car Racer:
//  * Garage: the car big in the middle of a lit garage, arrows to switch
//    cars and five big buttons along the bottom (Upgrade, Style, Dealer,
//    Shows, Race).
//  * Parts Shop: part cards with pixel icons, colour-coded by level. Parts
//    go into your inventory.
//  * Parts (install bay): fit parts from your inventory, take parts off
//    (they go back on the shelf) and sell spares.
//  * Inventory: every spare part, filtered by car, kind and value.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, A = DR.Audio, h = UI.h, btn = UI.btn;

  DR.LEVEL_COLS = ['#8a8f99', '#c4c8d0', '#46e07a', '#4da3ff', '#b06bff', '#ff9a2e'];
  function lvlOf(o) { return o && o.price ? o.lvl : 0; }

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
      case 'rotor':
        // Wankel rotor: a Reuleaux triangle (each side an arc centred on the
        // opposite tip) with its gear in the middle
        var RV = [0, 1, 2].map(function (k2) { var an2 = -Math.PI / 2 + k2 * Math.PI * 2 / 3; return [12 + Math.cos(an2) * 9, 11 + Math.sin(an2) * 9]; }), RS2 = 9 * Math.sqrt(3);
        for (var ry = 0; ry < 24; ry++) for (var rx = 0; rx < 24; rx++) {
          if (RV.every(function (v) { return Math.hypot(rx + 0.5 - v[0], ry + 0.5 - v[1]) <= RS2; })) { x.fillStyle = ry < 8 ? M1 : ry < 16 ? M2 : M3; x.fillRect(rx, ry, 1, 1); }
        }
        disc(12, 12, 4, ac); disc(12, 12, 2, M4);
        RV.forEach(function (v) { r(Math.round(v[0]) - 1, Math.round(v[1]) - 1, 2, 2, M4); }); break;
      case 'pistons':
        r(6, 3, 12, 7, M1); r(6, 5, 12, 1, M3); r(6, 7, 12, 1, M3); r(7, 10, 10, 3, M2);
        r(11, 11, 2, 9, ac); r(9, 19, 6, 3, ac); disc(12, 20, 1, M4); break;
      case 'rods':
        ring(12, 5, 4, 2, M2); r(11, 8, 3, 9, ac); r(11, 8, 1, 9, DR.shadeHex(ac, 0.3)); ring(12, 18, 5, 3, M2); r(6, 18, 13, 1, M4); r(7, 21, 2, 2, M3); r(15, 21, 2, 2, M3); break;
      case 'crank':
        r(1, 11, 4, 2, M2); r(19, 11, 4, 2, M2);
        for (k = 0; k < 4; k++) { r(4 + k * 4, k % 2 ? 6 : 12, 3, 6, ac); r(4 + k * 4, k % 2 ? 6 : 12, 3, 1, DR.shadeHex(ac, 0.3)); r(7 + k * 4, 10, 1, 4, M1); }
        disc(3, 12, 1, M3); break;
      case 'block':
        r(3, 6, 18, 13, M3); r(3, 6, 18, 1, M2); r(3, 18, 18, 1, M4);
        for (k = 0; k < 4; k++) disc(6 + k * 4, 11, 1, BK);
        r(5, 15, 14, 2, ac); r(1, 9, 2, 6, M4); r(21, 9, 2, 6, M4); break;
      case 'oiling':
        r(6, 4, 9, 13, M3); r(6, 4, 9, 1, M2); r(8, 1, 5, 3, ac); r(15, 8, 4, 2, M2); r(18, 8, 2, 8, M2);
        x.fillStyle = '#d8a520'; x.fillRect(18, 17, 2, 2); x.fillRect(18, 20, 2, 2); r(4, 18, 13, 3, M4); break;
      case 'valvetrain':
        r(10, 1, 4, 3, M1); r(11, 4, 2, 16, M2);
        for (k = 0; k < 5; k++) { r(7, 6 + k * 2, 10, 1, ac); }
        r(6, 4, 12, 2, M1); r(8, 19, 8, 3, M3); r(7, 22, 10, 1, M4); break;
      case 'airfilter':
        for (k = 0; k < 7; k++) r(8 + k, 5 - (k > 3 ? 0 : 0), 1, 14, k % 2 ? ac : DR.shadeHex(ac, -0.35));
        r(7, 4, 9, 1, M1); r(7, 19, 9, 1, M1); r(16, 9, 6, 6, M2); r(16, 9, 6, 1, M1); r(4, 8, 3, 8, M3); break;
      case 'throttle':
        disc(11, 12, 8, M2); disc(11, 12, 6, BK); r(6, 11, 11, 2, ac); r(10, 7, 2, 10, DR.shadeHex(ac, -0.3)); r(19, 6, 4, 4, M3); r(18, 8, 2, 2, M1); break;
      case 'injectors':
        for (k = 0; k < 3; k++) { r(4 + k * 7, 3, 4, 3, M2); r(4 + k * 7, 6, 4, 9, ac); r(4 + k * 7, 6, 1, 9, DR.shadeHex(ac, 0.3)); r(5 + k * 7, 15, 2, 3, M3); x.fillStyle = 'rgba(120,200,255,0.8)'; x.fillRect(5 + k * 7, 19, 1, 2); x.fillRect(6 + k * 7, 20, 1, 2); }
        break;
      case 'fuelpump':
        r(7, 4, 10, 16, M3); r(7, 4, 10, 1, M2); r(8, 6, 8, 5, ac); r(10, 1, 4, 3, M2); r(10, 20, 4, 3, M2); r(17, 12, 5, 2, '#3a4a8a'); r(2, 12, 5, 2, '#3a4a8a'); break;
      case 'ignition':
        r(4, 3, 7, 13, M4); r(4, 3, 7, 1, M3); r(5, 5, 5, 3, ac); r(6, 16, 3, 3, M2); r(7, 19, 1, 3, M1);
        r(14, 3, 5, 9, '#d8d8d8'); r(15, 12, 3, 4, M2); r(16, 16, 1, 4, M1);
        x.fillStyle = '#ffe86a'; x.fillRect(18, 19, 2, 1); x.fillRect(19, 20, 2, 1); x.fillRect(17, 21, 2, 1); break;
      case 'wastegate':
        disc(12, 9, 6, M2); disc(12, 9, 3, ac); r(10, 15, 5, 6, M3); r(8, 20, 9, 2, M4); r(17, 12, 5, 2, M2); r(2, 16, 8, 2, M3); break;
      case 'bov':
        r(7, 6, 10, 11, M2); r(7, 6, 10, 1, M1); r(9, 3, 6, 3, ac); r(10, 17, 4, 4, M3); r(8, 21, 8, 2, M4);
        x.fillStyle = 'rgba(220,230,240,.6)'; x.fillRect(18, 9, 2, 1); x.fillRect(20, 7, 2, 1); x.fillRect(19, 12, 3, 1); break;
      case 'nosheat':
        r(8, 6, 8, 16, ac); r(8, 6, 2, 16, DR.shadeHex(ac, 0.35)); r(9, 4, 6, 2, ac); r(10, 1, 4, 3, M2);
        r(7, 10, 10, 6, '#3a3e47'); r(7, 12, 10, 1, '#ff5a2a'); r(7, 14, 10, 1, '#ff5a2a'); break;
      case 'rearend':
        disc(12, 12, 6, M3); disc(12, 12, 4, M2); disc(12, 12, 1, ac); r(1, 11, 5, 3, M2); r(18, 11, 5, 3, M2); r(0, 9, 2, 7, ac); r(22, 9, 2, 7, ac); break;
      case 'chassis':
        r(3, 4, 2, 17, ac); r(19, 4, 2, 17, ac); r(3, 4, 18, 2, ac); r(5, 12, 14, 2, DR.shadeHex(ac, -0.3));
        for (k = 0; k < 7; k++) r(5 + k * 2, 6 + k, 2, 1, M2); r(2, 20, 20, 2, M3); break;
      case 'frontsusp':
        r(3, 10, 18, 3, ac); r(3, 10, 18, 1, DR.shadeHex(ac, 0.3)); r(5, 6, 2, 4, M2); r(17, 6, 2, 4, M2);
        r(1, 13, 6, 2, M3); r(17, 13, 6, 2, M3); disc(2, 17, 2, M4); disc(21, 17, 2, M4); break;
      case 'brakes':
        disc(11, 12, 9, M2); ring(11, 12, 9, 7, M1); disc(11, 12, 3, M3);
        for (k = 0; k < 6; k++) { var a4 = k * Math.PI / 3; r(Math.round(11 + Math.cos(a4) * 5), Math.round(12 + Math.sin(a4) * 5), 1, 1, M4); }
        r(17, 4, 5, 9, ac); r(17, 4, 5, 1, DR.shadeHex(ac, 0.3)); break;
      case 'battery':
        r(3, 7, 18, 13, M4); r(3, 7, 18, 2, ac); r(5, 4, 4, 3, '#d23a3a'); r(15, 4, 4, 3, M2);
        DR.pixText(x, '+', 6, 12, '#ff6060', 1); DR.pixText(x, '-', 16, 12, '#c4c8d0', 1); break;
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
      case 'shifter':
        r(4, 18, 16, 4, M3); r(4, 18, 16, 1, M2); r(11, 7, 2, 11, M1); r(12, 7, 1, 11, M2);
        disc(12, 5, 4, ac); disc(11, 4, 1, DR.shadeHex(ac, 0.4)); r(6, 20, 1, 1, BK); r(17, 20, 1, 1, BK); break;
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
      // menu icons
      case 'u_career':
        r(6, 3, 12, 2, '#ffd23d'); r(7, 5, 10, 6, '#ffcc00'); r(8, 11, 8, 2, '#e0a800'); r(10, 13, 4, 3, '#c99a00'); r(7, 16, 10, 2, '#8a6a10'); r(6, 18, 12, 3, '#5a4510');
        r(3, 5, 3, 1, '#ffcc00'); r(3, 5, 1, 4, '#ffcc00'); r(3, 8, 4, 1, '#ffcc00'); r(18, 5, 3, 1, '#ffcc00'); r(20, 5, 1, 4, '#ffcc00'); r(17, 8, 4, 1, '#ffcc00'); r(9, 6, 2, 4, '#fff2a0'); break;
      case 'u_map':
        r(2, 4, 6, 17, '#3f8a4a'); r(8, 3, 7, 17, '#4f9e58'); r(15, 4, 7, 17, '#3f8a4a'); r(8, 3, 1, 17, '#2b5e33'); r(15, 4, 1, 17, '#2b5e33');
        r(2, 13, 20, 2, '#9aa0aa'); r(11, 3, 2, 17, '#9aa0aa'); r(16, 6, 5, 4, '#3a7fd0');
        r(5, 6, 3, 3, '#d23a3a'); r(4, 7, 5, 1, '#d23a3a'); r(6, 9, 1, 2, '#d23a3a'); r(5, 7, 1, 1, '#ffffff'); break;
      case 'u_street':
        r(2, 6, 20, 12, '#2e7d4f'); r(2, 6, 20, 1, '#46e07a'); r(4, 8, 16, 8, '#3fa463'); disc(12, 12, 4, '#2e7d4f'); DR.pixText(x, '$', 11, 10, '#d8ffd8', 1); r(4, 18, 20, 2, '#1e5a36'); break;
      case 'u_test':
        disc(12, 14, 9, M3); disc(12, 14, 7, M1); r(10, 2, 4, 3, M2); r(11, 4, 2, 2, M3); r(18, 5, 3, 2, M2);
        r(12, 8, 1, 6, BK); r(12, 13, 4, 1, '#d23a3a'); for (k = 0; k < 12; k++) { var a5 = k * Math.PI / 6; r(Math.round(12 + Math.cos(a5) * 6), Math.round(14 + Math.sin(a5) * 6), 1, 1, M3); } break;
      case 'u_paint':
        r(8, 7, 9, 15, ac); r(8, 7, 3, 15, DR.shadeHex(ac, 0.35)); r(9, 4, 7, 3, M2); r(11, 2, 3, 2, M3); r(4, 3, 2, 1, ac); r(2, 5, 2, 1, ac); r(4, 7, 1, 1, ac); r(8, 12, 9, 3, M1); break;
      case 'u_flag':
        r(4, 2, 2, 21, M2);
        for (var fy2 = 0; fy2 < 4; fy2++) for (var fx2 = 0; fx2 < 5; fx2++) r(6 + fx2 * 3, 3 + fy2 * 3, 3, 3, (fx2 + fy2) % 2 ? BK : '#ffffff'); break;
      case 'u_car':
        r(2, 11, 20, 6, ac); r(7, 7, 10, 4, ac); r(8, 8, 4, 3, '#2a3346'); r(13, 8, 3, 3, '#2a3346'); r(2, 11, 20, 1, DR.shadeHex(ac, 0.3));
        disc(6, 17, 3, BK); disc(18, 17, 3, BK); disc(6, 17, 1, M2); disc(18, 17, 1, M2); break;
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
      // garage menu glyphs
      case 'g_race':
        r(5, 3, 2, 19, M2); r(5, 3, 2, 1, M1);
        for (var gy = 0; gy < 4; gy++) for (var gx = 0; gx < 5; gx++) r(7 + gx * 3, 4 + gy * 3, 3, 3, (gx + gy) % 2 ? BK : '#f2f2f2');
        r(7, 16, 15, 1, 'rgba(0,0,0,.35)'); break;
      case 'g_shop':
        r(3, 7, 18, 13, '#c95a12'); r(3, 7, 18, 2, '#ff9a4a'); r(8, 3, 8, 2, M2); r(7, 4, 2, 4, M2); r(15, 4, 2, 4, M2);
        r(9, 11, 6, 5, '#ffd27a'); r(11, 12, 2, 3, '#8a3a08'); break;
      case 'g_install':
        r(4, 15, 3, 3, M2); r(6, 13, 3, 3, M2); r(8, 11, 3, 3, M2); r(10, 9, 3, 3, M2); r(12, 7, 3, 3, M2);
        r(14, 3, 3, 6, M1); r(18, 3, 3, 6, M1); r(14, 7, 7, 3, M1); r(16, 3, 1, 3, BK); r(3, 17, 3, 3, '#4da3ff'); break;
      case 'g_tune':
        r(5, 3, 2, 18, M3); r(11, 3, 2, 18, M3); r(17, 3, 2, 18, M3);
        r(3, 13, 6, 3, '#ffcc00'); r(9, 6, 6, 3, '#ffcc00'); r(15, 10, 6, 3, '#ffcc00'); r(3, 13, 6, 1, '#fff3a0'); r(9, 6, 6, 1, '#fff3a0'); r(15, 10, 6, 1, '#fff3a0'); break;
      case 'g_dyno':
        ring(12, 13, 9, 7, M2); disc(12, 13, 7, '#101116'); r(5, 18, 15, 3, '#101116');
        r(12, 12, 1, 2, '#ff4a3a'); r(13, 11, 2, 1, '#ff4a3a'); r(15, 9, 2, 2, '#ff4a3a'); r(17, 8, 1, 1, '#ff4a3a');
        r(6, 13, 2, 1, M1); r(8, 8, 1, 2, M1); r(12, 6, 1, 2, M1); disc(12, 13, 1, M1); break;
      case 'g_body':
        r(3, 12, 18, 5, '#b06bff'); r(7, 8, 9, 4, '#b06bff'); r(8, 9, 3, 3, '#cfe4ff'); r(12, 9, 3, 3, '#cfe4ff'); r(3, 12, 18, 1, '#d8b0ff');
        disc(7, 17, 2, BK); disc(17, 17, 2, BK); r(20, 13, 1, 2, '#ffe680'); break;
      case 'g_paint':
        r(8, 7, 8, 14, '#e33b6d'); r(8, 7, 2, 14, '#ff8fb0'); r(10, 4, 4, 3, M2); r(11, 2, 2, 2, M1);
        x.fillStyle = 'rgba(255,90,140,.7)'; x.fillRect(16, 3, 1, 1); x.fillRect(18, 2, 1, 1); x.fillRect(19, 4, 1, 1); x.fillRect(17, 5, 1, 1); x.fillRect(20, 6, 1, 1); break;
      case 'g_shows':
        r(7, 3, 10, 2, '#ffcc00'); r(8, 5, 8, 6, '#ffcc00'); r(9, 11, 6, 2, '#e0a800'); r(11, 13, 2, 4, '#c08a00'); r(8, 17, 8, 3, M3);
        r(5, 5, 2, 4, '#ffcc00'); r(17, 5, 2, 4, '#ffcc00'); r(9, 6, 2, 3, '#fff3a0'); break;
      case 'g_dealer':
        disc(8, 12, 5, '#ffcc00'); disc(8, 12, 2, '#3a2a00'); r(12, 11, 9, 3, '#ffcc00'); r(17, 14, 2, 3, '#ffcc00'); r(20, 14, 1, 2, '#ffcc00'); r(12, 11, 9, 1, '#fff3a0'); break;
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
      if (cat === 'fi' && (id === 'none' || DR.partId('fi', inst) === 'none')) delete copy.tune.boost;
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
    var dhp = Math.round(S1.peakHp + S1.nosHp - S0.peakHp - S0.nosHp), dlb = Math.round((S1.m - S0.m) * 2.2046);
    var out = [];
    if (cat === 'engine') {   // engine swaps: power change and what the engine itself weighs
      if (dhp) out.push(h('span', { class: dhp > 0 ? 'good' : 'bad' }, (dhp > 0 ? '+' : '') + dhp + 'hp'));
      out.push(h('span', { class: 'dim' }, Math.round(S1.eng.w * 2.2046) + 'lb'));
      return h('span', { class: 'gain' }, out);
    }
    if (dhp) out.push(h('span', { class: dhp > 0 ? 'good' : 'bad' }, (dhp > 0 ? '+' : '') + dhp + 'hp'));
    if (dlb) out.push(h('span', { class: dlb < 0 ? 'good' : 'bad' }, (dlb > 0 ? '+' : '') + dlb + 'lb'));
    // then the limit the part moves: its own rating first (an upgrade that
    // isn't the weak link yet still shows what it holds)
    if (out.length < 2) {
      var own = [];
      if (S1.partHold[cat] != null) own.push(['own', S0.partHold[cat], S1.partHold[cat], 'hp holds']);
      if (S1.partRpm[cat] != null && cat !== 'pistons' && cat !== 'rods' && cat !== 'crank') own.push(['own', S0.partRpm[cat], S1.partRpm[cat], 'rpm']);
      if (cat === 'injectors') own.push(['own', S0.fuelInj, S1.fuelInj, 'hp feeds']);
      if (cat === 'fuelpump') own.push(['own', S0.fuelPump, S1.fuelPump, 'hp feeds']);
      var lim = own.concat([['safe', S0.safeHp, S1.safeHp, 'hp safe'], ['fuel', S0.fuelW / DR.HP, S1.fuelW / DR.HP, 'hp fuel'],
        ['rpm', S0.mech, S1.mech, 'rpm safe'], ['vt', S0.vtLimit, S1.vtLimit, 'rpm valves'], ['spark', S0.sparkPsi, S1.sparkPsi, 'psi spark'],
        ['boost', S0.maxBoost, S1.maxBoost, 'psi max'], ['axle', S0.axleTq, S1.axleTq, 'Nm axles'],
        ['risk', -DR.riskMax(S0.risk) * 100, -DR.riskMax(S1.risk) * 100, '% risk']]);
      for (var i = 0; i < lim.length && out.length < 2; i++) {
        var d = Math.round(lim[i][2] - lim[i][1]);
        var v = lim[i][0] === 'risk' ? -d : d;
        if (d) out.push(h('span', { class: d > 0 ? 'good' : 'bad' }, (v > 0 ? '+' : '') + v + lim[i][3]));
      }
    }
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

  // ---------------------------------------------------------------- GARAGE (hub)
  UI.Garage = function () {
    var inst = G.car(), S = G.spec(inst), cars = G.state.cars, idx = cars.indexOf(inst);
    var cv = UI.dragCam(DR.roomCanvas(inst, { theme: 'garage' }));
    function cycle(d) { var n = cars.length; G.state.active = cars[(idx + d + n) % n].uid; G.save(); UI.refresh(); }
    var dmg = null;
    if (inst.damage) {
      var cost = G.repairCost(inst);
      dmg = h('div', { class: 'gdmg warnbox' }, (inst.damage.engine ? 'ENGINE BLOWN! ' : inst.damage.axle ? 'BROKEN AXLE! ' : inst.damage.chassis ? 'CRACKED CHASSIS! ' : 'TRANSMISSION BROKEN! ') + 'Repair: ' + DR.money(cost) + ' ',
        btn('Repair', function () { if (G.repair(inst)) { A.cash(); UI.refresh(); } else UI.toast('Not enough money'); }, 'small go'));
    }
    // the hub: what you're working toward on top, the car in the middle,
    // the five places to go along the bottom (Race on the right, under the thumb)
    var c = G.careerState(), st = DR.STAGES[c.stage], sp = c.sponsor[c.stage];
    var status = h('div', { class: 'gstatus', onclick: function () { UI.show(UI.RaceMenu, 'career'); } },
      h('span', { class: 'acc' }, 'Stage ' + (c.stage + 1) + ': ' + st.name),
      h('span', {}, G.stageWins(c.stage) + '/' + st.events.length + ' wins'),
      h('span', { class: sp ? '' : 'warn' }, sp ? DR.sponsorById(sp.id).name : 'No sponsor yet'));
    function bbtn(label, icon, fn, cls, badge) {
      return btn([iconEl(icon, 1, '', 26, 'gico'), h('span', {}, label), badge ? h('span', { class: badge === 'NEW' || badge === 'FREE' ? 'newdot' : 'badge' }, String(badge)) : null], fn, 'gbb ' + (cls || ''));
    }
    var spare = G.state.inv.filter(function (it) { return !it.stock && !G.partFitIssue(it, inst); }).length;
    var bar = h('div', { class: 'gbar' },
      bbtn('Upgrade', 'g_shop', function () { UI.openSection('upgrade'); }, 'shop', G.newPartsCount() ? 'NEW' : spare || 0),
      bbtn('Style', 'g_body', function () { UI.openSection('style'); }, 'purple', G.newVisCount() ? 'NEW' : 0),
      bbtn('Dealer', 'g_dealer', function () { UI.show(UI.Dealer); }, '', G.freeCars && G.freeCars() ? 'FREE' : G.newCarCount() ? 'NEW' : 0),
      bbtn('Shows', 'g_shows', function () { if (inst.damage) return UI.toast('Repair your car first!'); UI.show(UI.Shows); }, ''),
      bbtn('Race', 'g_race', function () { if (inst.damage) return UI.toast('Repair your car first!'); UI.show(UI.RaceMenu); }, 'race'));
    var stars = DR.starRating(inst);
    var stat = function (k, v, cls) { return h('div', { class: 'gst' }, h('span', { class: 'k' }, k), h('span', { class: 'v ' + (cls || '') }, v)); };
    var side = h('div', { class: 'gside' },
      stat('POWER', Math.round(S.peakHp) + (S.nosHp ? '+' + S.nosHp : '') + ' hp', 'acc'),
      stat('WEIGHT', UI.kgLb(S.m)),
      stat('DRIVE', S.drive + ' • ' + S.ratios.length + '-spd'),
      stat('BEST 1/4', inst.best && inst.best.q ? inst.best.q.toFixed(3) + 's' : '—', 'acc'),
      h('div', { class: 'gst' }, h('span', { class: 'k' }, 'LOOKS'), starMeter(stars)),
      S.fiType !== 'none' && !S.diesel && S.iat > 75 ? h('div', { class: 'bad gsmall' }, '🌡 Hot intake: ' + Math.round(S.iat) + ' C at ' + S.boostSet + ' psi') : null,
      DR.riskMax(S.risk) > 0.001 ? h('div', { class: 'bad gsmall' }, '⚠ ' + Math.round(DR.riskMax(S.risk) * 100) + '% failure risk') : null);
    var sel = h('div', { class: 'gsel' },
      cars.length > 1 ? btn('◀', function () { cycle(-1); }, 'arrow') : null,
      h('div', { class: 'gname', onclick: function () { UI.show(UI.Cars); } }, h('div', { class: 'pix acc' }, DR.CARS[inst.carId].name), h('div', { class: 'dim' }, (idx + 1) + ' / ' + cars.length + ' • My Cars ▸')),
      cars.length > 1 ? btn('▶', function () { cycle(1); }, 'arrow') : null);
    return h('div', { class: 'screen' }, UI.top('GARAGE', function () { UI.show(UI.Title); }, h('div', { class: 'row', style: { gap: '6px' } },
        btn('?', function () { UI.show(UI.Help, UI.Garage); }, 'small back', { title: 'How to play', 'aria-label': 'How to play' }), btn(h('span', { class: 'gearic', html: '<svg viewBox="0 0 16 16" width="14" height="14" shape-rendering="crispEdges"><path fill="currentColor" d="M7 0h2v2h2v1h1v1h1v2h2v4h-2v2h-1v1h-1v1H9v2H7v-2H5v-1H4v-1H3v-2H1V6h2V4h1V3h1V2h2zm0 5v1H6v4h1v1h2v-1h1V6H9V5z"/></svg>' }), function () { UI.show(UI.Settings, UI.Garage); }, 'small back', { title: 'Settings', 'aria-label': 'Settings' }))),
      h('div', { class: 'gwrap hub' }, cv, status, side, sel, dmg), bar);
  };

  // ---------------------------------------------------------------- PARTS SHOP
  var shopGroup = 'engine', shopCat = 'intake', partsGroup = 'engine';
  UI.openPackages = function () { if (shopGroup !== 'pkg') partsGroup = shopGroup; shopGroup = 'pkg'; UI.show(UI.Shop); };
  UI.openShop = function () { if (shopGroup === 'pkg') shopGroup = partsGroup; UI.show(UI.Shop); };
  function groupById(id) { return DR.PART_GROUPS.filter(function (g) { return g.id === id; })[0]; }
  function firstCat(group, inst) { return group.cats.filter(function (c) { return DR.partApplies(c, inst) || ((c === 'clutch' || c === 'converter') && DR.partExists(c, inst)); })[0] || group.cats[0]; }
  // the last shop section, category, body-kit slot and install slot, kept
  // in the save (UI.remember)
  function memory() {
    var m = UI.memory('garage');
    if (m) {
      if (m.shopGroup === 'pkg' || groupById(m.shopGroup)) shopGroup = m.shopGroup;
      if (m.shopCat && DR.PART_CATS[m.shopCat]) shopCat = m.shopCat;
      if (m.bodySlot && DR.visSlot(m.bodySlot)) bodySlot = m.bodySlot;
      if (m.bayCat && DR.PART_CATS[m.bayCat]) bayCat = m.bayCat;
    }
  }
  function remember() { UI.remember({ shopGroup: shopGroup, shopCat: shopCat, bodySlot: bodySlot, bayCat: bayCat }); }
  UI.Shop = function (jump) {
    var inst = G.car();
    memory();
    // jump only when arriving (a refresh replays the same argument)
    if (jump && !UI.refreshing) { shopCat = jump; DR.PART_GROUPS.forEach(function (g) { if (g.cats.indexOf(jump) >= 0) shopGroup = g.id; }); }
    remember();
    var group = groupById(shopGroup), weak = DR.bottlenecks(G.spec(inst));
    if (group && group.cats.indexOf(shopCat) < 0) shopCat = firstCat(group, inst);
    var rail = h('div', { class: 'srail' }, DR.PART_GROUPS.map(function (g) {
      var hot = g.cats.some(function (c) { return weak[c]; });
      return h('div', { class: 'srail-i' + (g.id === shopGroup ? ' on' : '') + (hot ? ' hot' : ''), onclick: function () { shopGroup = g.id; shopCat = firstCat(g, inst); UI.refresh(); } },
        iconEl(g.icon || g.cats[0], 2, '', 26), h('span', {}, g.name), G.groupHasNew(g) && g.id !== shopGroup ? h('span', { class: 'newdot' }, 'NEW') : null);
    }));
    if (shopGroup === 'pkg') return h('div', { class: 'screen' }, UI.sectionTop('upgrade', 'pkg'),
      h('div', { class: 'shopwrap' }, rail, packagesMain(inst)));
    var chips = h('div', { class: 'schips' }, group.cats.filter(function (c) { return DR.partExists(c, inst); }).map(function (c) {
      var fits = DR.partApplies(c, inst);
      return btn((weak[c] ? '! ' : '') + DR.catName(c, inst), function () { shopCat = c; UI.refresh(); }, 'chip' + (c === shopCat ? ' on' : '') + (fits ? '' : ' nofit') + (weak[c] ? ' hot' : ''));
    }));
    var curId = DR.partId(shopCat, inst), tunedNow = G.spec(inst).tuned;
    var grid = h('div', { class: 'pgrid' });
    DR.partOptions(shopCat, inst).forEach(function (o) {
      if (!o.price) return;                                  // stock / factory parts are not sold
      var lvl = lvlOf(o), installed = o.id === curId, owned = G.ownedCount(shopCat, o.id), locked = !G.partUnlocked(shopCat, lvl);
      grid.appendChild(h('div', { class: 'pcard l' + lvl + (locked ? ' locked' : '') + (installed ? ' inst' : ''), onclick: function () { partModal(inst, shopCat, o.id); } },
        h('div', { class: 'pic' }, iconEl(DR.iconCat(shopCat, inst), lvl, o.id, 48)),
        h('div', { class: 'plvl' }, DR.LEVEL_NAMES[lvl]),
        h('div', { class: 'pname' }, o.name),
        // what it does for this car, at a glance
        !locked && !installed && DR.partApplies(shopCat, inst) ? gainLine(inst, shopCat, o.id) : null,
        h('div', { class: 'pfoot' }, locked ? h('span', { class: 'tag' }, '🔒 ' + G.unlockWhere(shopCat, lvl)) : h('span', { class: 'price' + (G.canAfford(o.price + (o.install || 0)) ? '' : ' bad') }, DR.money(o.price + (o.install || 0)) + (o.install ? ' fitted' : '')),
          installed ? h('span', { class: 'tag g' }, 'ON CAR') : !locked && G.isNewPart(shopCat, lvl) ? h('span', { class: 'newdot' }, 'NEW') : o.fit && o.fit.block ? h('span', { class: 'tag' }, 'NEEDS RWD') : o.tune && o.tune !== true && !tunedNow ? h('span', { class: 'tag o' }, o.tune === 'soft' ? 'BEST TUNED' : 'NEEDS TUNE') : owned ? h('span', { class: 'tag b' }, 'OWNED ×' + owned) : null)));
    });
    if (!grid.children.length) grid.appendChild(h('div', { class: 'dim' }, 'Nothing for sale here.'));
    if (group) G.markGroupSeen(group);
    var note = weak[shopCat] && DR.partApplies(shopCat, inst) ? h('div', { class: 'warnbox', style: { marginBottom: '6px' } }, 'Holding your build back: ' + weak[shopCat] + '.') : !DR.partApplies(shopCat, inst) ? h('div', { class: 'warnbox', style: { marginBottom: '6px' } }, G.partFitIssue({ cat: shopCat, id: '' }, inst) + ' — you can still buy these for another car.') : null;
    return h('div', { class: 'screen' }, UI.sectionTop('upgrade', 'shop'),
      h('div', { class: 'shopwrap' }, rail, h('div', { class: 'smain' }, storeHead(), chips, note, grid)));
  };

  // ---------------------------------------------------------------- PACKAGES
  // Quick upgrade kits (Street / Pro / Extreme per shop group, or the whole
  // car): one tap buys and fits a matched set of parts at a discount.
  var PKG_LVL = [1, 2, 3, 5];
  function pkgGroups() { return [{ id: 'all', name: 'Full Car', groups: DR.PKG_ORDER }].concat(DR.PKG_ORDER.map(function (gid) { var g = groupById(gid); return { id: gid, name: g.name, groups: [gid], icon: g.icon }; })); }
  // A tier opens when every shop group in it reaches the tier's level
  // ('' = open, else where it unlocks); a locked tier previews its real parts
  function pkgLocked(pg, t) {
    var need = DR.PKG_TIERS[t].lvl, where = '';
    pg.groups.forEach(function (gid) { var cat = groupById(gid).cats[0]; if (!where && !G.partUnlocked(cat, need)) where = G.unlockWhere(cat, need); });
    return where;
  }
  function pkgPlan(inst, pg, t) { return DR.packagePlan(inst, pg.groups, t, !!pkgLocked(pg, t)); }
  function pkgCard(inst, pg, t) {
    var plan = pkgPlan(inst, pg, t), tier = DR.PKG_TIERS[t], lvl = PKG_LVL[t], locked = pkgLocked(pg, t);
    var done = !plan.steps.length;
    return h('div', { class: 'pcard pkgcard l' + lvl + (locked ? ' locked' : '') + (done ? ' inst' : ''), onclick: function () { if (!done) pkgModal(inst, pg, t, plan); } },
      h('div', { class: 'plvl' }, tier.name),
      h('div', { class: 'pname' }, tier.name + ' ' + (pg.id === 'all' ? 'Build' : 'Package')),
      done ? h('span', { class: 'gain dim' }, 'all fitted') : h('div', { class: 'dim', style: { fontSize: '15px' } }, plan.steps.length + ' parts'),
      done ? null : pkgGain(inst, plan),
      h('div', { class: 'pfoot' }, locked ? h('span', { class: 'tag' }, '🔒 ' + locked) : done ? h('span', { class: 'tag g' }, 'ON CAR') :
        h('span', { class: 'price' + (G.canAfford(plan.price) ? '' : ' bad') }, DR.money(plan.price)),
        !locked && !done ? h('span', { class: 'tag b' }, '-' + Math.round(DR.PKG_DISCOUNT * 100) + '%') : null));
  }
  function pkgGain(inst, plan) {
    var S0 = G.spec(inst), S1 = DR.buildSpec(plan.after), out = [];
    var dhp = Math.round(S1.peakHp + S1.nosHp - S0.peakHp - S0.nosHp), dlb = Math.round((S1.m - S0.m) * 2.2046);
    if (dhp) out.push(h('span', { class: dhp > 0 ? 'good' : 'bad' }, (dhp > 0 ? '+' : '') + dhp + 'hp'));
    if (dlb) out.push(h('span', { class: dlb < 0 ? 'good' : 'bad' }, (dlb > 0 ? '+' : '') + dlb + 'lb'));
    var rk = DR.riskMax(S1.risk);
    if (rk > 0.005) out.push(h('span', { class: 'bad' }, '⚠' + Math.round(rk * 100) + '%'));
    return out.length ? h('span', { class: 'gain' }, out) : h('span', { class: 'gain dim' }, 'handling & grip');
  }
  function packagesMain(inst) {
    var main = h('div', { class: 'smain' }, storeHead(),
      h('div', { class: 'tipline' }, 'Quick upgrades: a matched set of parts in one go, ' + Math.round(DR.PKG_DISCOUNT * 100) + '% off. Parts you already have that are as good or better are skipped; replaced parts go to your inventory.'));
    pkgGroups().forEach(function (pg, gi) {
      main.appendChild(h('h2', { style: { marginTop: '10px' } }, pg.name));
      var grid = h('div', { class: 'pgrid' });
      main.appendChild(grid);
      // the full-car row now, the rest a frame or two later
      var fillRow = function () { DR.PKG_TIERS.forEach(function (x, t) { grid.appendChild(pkgCard(inst, pg, t)); }); };
      if (gi === 0) fillRow(); else UI.later(fillRow);
    });
    return main;
  }
  function pkgModal(inst, pg, t, plan) {
    var tier = DR.PKG_TIERS[t], lvl = PKG_LVL[t], locked = pkgLocked(pg, t);
    var S0 = G.spec(inst), S1 = DR.buildSpec(plan.after), close;
    var list = h('div', { class: 'pkglist' }, plan.steps.map(function (s) {
      var lk = !!locked && !G.partUnlocked(s.cat, s.opt.lvl);
      return h('div', { class: 'pkgrow' + (lk ? ' bad' : '') }, iconEl(s.cat, s.opt.lvl, s.id, 20), h('span', { class: 'dim' }, DR.catName(s.cat, inst)), h('span', {}, (lk ? '🔒 ' : '') + s.opt.name.replace(' (Factory)', '')));
    }));
    close = UI.modal(h('div', { class: 'col pmodal l' + lvl },
      h('div', { class: 'plvl' }, tier.name + ' • ' + (pg.id === 'all' ? 'Full car' : pg.name)), h('div', { class: 'pix acc' }, tier.name + ' ' + (pg.id === 'all' ? 'Build' : pg.name + ' Package')),
      UI.statsGrid([
        ['Power', deltaRow(S0.peakHp + S0.nosHp, S1.peakHp + S1.nosHp, ' hp')],
        ['Weight', deltaRow(S0.m * 2.2046, S1.m * 2.2046, ' lb', 0, true)],
        S0.red !== S1.red ? ['Rev limiter', deltaRow(S0.red, S1.red, ' rpm')] : null,
        S1.fiType !== 'none' ? ['Boost', deltaRow(S0.boostSet, S1.boostSet, ' psi', 1)] : null,
        ['Parts', plan.steps.length + ' (' + DR.money(plan.full) + ' separately)'],
        ['Package price', DR.money(plan.price), 'good']
      ]),
      UI.riskBox(S1),
      locked ? h('div', { class: 'warnbox' }, '🔒 ' + tier.name + ' ' + (pg.id === 'all' ? 'builds' : 'packages') + ' unlock as you win career races: ' + locked + '.') :
        h('div', { class: 'row' }, btn('Buy & Install ' + DR.money(plan.price), function () {
          if (!G.canAfford(plan.price)) return UI.toast('Not enough money');
          G.buyPackage(inst, plan); A.cash(); close(); UI.toast(tier.name + ' ' + (pg.id === 'all' ? 'build' : 'package') + ' installed!'); UI.refresh();
        }, 'go grow' + (G.canAfford(plan.price) ? '' : ' disabled')), btn('Close', function () { close(); }, 'small')),
      h('h3', {}, 'IN THIS PACKAGE'), list,
      locked ? btn('Close', function () { close(); }, 'small') : null));
  }

  var storeImg = null;
  function storeHead() {
    var c = h('canvas', { class: 'storehead', width: 560, height: 150 });
    if (!storeImg) { storeImg = document.createElement('canvas'); storeImg.width = 560; storeImg.height = 150; DR.drawStore(storeImg); }
    c.getContext('2d').drawImage(storeImg, 0, 0);
    return c;
  }
  // engine swaps: the engine itself, then what it does to the car (the swap
  // takes the engine parts off, so these are the new engine as it comes)
  function engineRows(S0, S1, opt) {
    var e0 = S0.eng, e1 = S1.eng;
    function kgLb(kg) { return kg + ' kg / ' + Math.round(kg * 2.2046) + ' lb'; }
    return UI.statsGrid([
      ['Engine', DR.engineLayout(e1)],
      ['Power', h('span', {}, deltaRow(S0.peakHp, S1.peakHp, ' hp'), h('span', { class: 'dim' }, ' @ ' + S1.peakHpRpm))],
      ['Torque', deltaRow(S0.peakTq, S1.peakTq, ' lb-ft')],
      ['Redline', deltaRow(e0.red, e1.red, ' rpm')],
      ['Engine weight', h('span', { class: e1.w > e0.w ? 'bad' : e1.w < e0.w ? 'good' : 'dim' }, kgLb(e0.w) + ' → ' + kgLb(e1.w))],
      ['Car weight', deltaRow(S0.m * 2.2046, S1.m * 2.2046, ' lb', 0, true)],
      Math.abs(S0.f - S1.f) > 0.002 ? ['Front weight', deltaRow(S0.f * 100, S1.f * 100, '%', 1, true)] : null,
      ['Stock internals hold', Math.round(S1.safeHp) + ' hp'],
      ['Engine price', DR.money(opt.price), 'good']
    ].concat(opt.fit && !opt.fit.block ? opt.fit.lines.map(function (l) { return [l[0], DR.money(l[1])]; }).concat([['Installed price', DR.money(opt.price + opt.fit.install), 'acc']]) : []));
  }
  function partModal(inst, cat, id) {
    var opt = DR.getOption(cat, inst, id), lvl = lvlOf(opt), locked = !G.partUnlocked(cat, lvl);
    var S0 = G.spec(inst), copy = hypothetical(inst, cat, id), S1 = DR.buildSpec(copy);
    var fits = DR.partApplies(cat, inst), owned = G.ownedCount(cat, id), installed = DR.partId(cat, inst) === id;
    var close;
    var total = opt.price + (opt.install || 0);
    function buy(andInstall) {
      if (!G.canAfford(andInstall ? total : opt.price)) return UI.toast('Not enough money');
      var item = G.buyPart(cat, id); A.cash();
      if (andInstall) { var r = G.installPart(inst, item.uid); UI.toast(r.msg); } else UI.toast(opt.name + ' added to your inventory');
      close(); UI.refresh();
    }
    close = UI.modal(h('div', { class: 'col pmodal l' + lvl },
      h('div', { class: 'row', style: { alignItems: 'center' } }, h('div', { class: 'pic big' }, iconEl(cat, lvl, id, 72)),
        h('div', { class: 'grow' }, h('div', { class: 'plvl' }, DR.LEVEL_NAMES[lvl] + ' • ' + DR.catName(cat, inst)), h('div', { class: 'pix acc' }, opt.name),
          opt.desc ? h('div', { style: { marginTop: '4px' } }, opt.desc) : null)),
      fits && cat === 'engine' ? engineRows(S0, S1, opt) : fits ? UI.statsGrid([
        ['Power', deltaRow(S0.peakHp + S0.nosHp, S1.peakHp + S1.nosHp, ' hp')],
        S0.red !== S1.red ? ['Rev limiter', deltaRow(S0.red, S1.red, ' rpm')] : null,
        Math.round(S0.safeHp) !== Math.round(S1.safeHp) ? ['Safe power', deltaRow(S0.safeHp, S1.safeHp, ' hp')] : null,
        S0.beLimit !== S1.beLimit ? ['Bottom end', deltaRow(S0.beLimit, S1.beLimit, ' rpm')] : null,
        S0.vtLimit !== S1.vtLimit ? ['Valve float', deltaRow(S0.vtLimit, S1.vtLimit, ' rpm')] : null,
        Math.round(S0.fuelW) !== Math.round(S1.fuelW) ? ['Fuel feeds', deltaRow(S0.fuelW / DR.HP, S1.fuelW / DR.HP, ' hp')] : null,
        S0.sparkPsi !== S1.sparkPsi && S1.fiType !== 'none' ? ['Ignition', deltaRow(S0.sparkPsi, S1.sparkPsi, ' psi')] : null,
        S0.maxBoost !== S1.maxBoost && S0.fiId === S1.fiId ? ['Max boost', deltaRow(S0.maxBoost, S1.maxBoost, ' psi', 1)] : null,
        Math.round(S0.axleTq) !== Math.round(S1.axleTq) ? ['Axles hold', deltaRow(S0.axleTq, S1.axleTq, ' Nm')] : null,
        Math.abs(S0.f - S1.f) > 0.002 ? ['Front weight', deltaRow(S0.f * 100, S1.f * 100, '%', 1, true)] : null,
        Math.round(S0.m * 2.2046) !== Math.round(S1.m * 2.2046) ? ['Car weight', deltaRow(S0.m * 2.2046, S1.m * 2.2046, ' lb', 0, true)] : null,
        ['Price', DR.money(opt.price), 'good'],
        owned ? ['In your inventory', '×' + owned, 'acc'] : null
      ]) : h('div', { class: 'warnbox' }, G.partFitIssue({ cat: cat, id: id }, inst)),
      fits ? UI.riskBox(S1) : null,
      cat === 'engine' && opt.fit && opt.fit.block ? h('div', { class: 'warnbox' }, opt.fit.block + '.') : null,
      cat === 'engine' ? h('div', { class: 'dim' }, 'Swapping engines moves your current engine and its engine parts to your inventory. The install is paid when the engine goes in.') : null,
      G.isEngineBound(cat) && cat !== 'engine' ? h('div', { class: 'dim' }, 'Built for your ' + DR.ENGINES[inst.engine].name + '.') : null,
      opt.tune && opt.tune !== true && !S0.tuned ? h('div', { class: 'warnbox' }, opt.tune === 'soft' ? 'Runs on your stock ECU, but only makes about half its gain until you get an ECU flash (Fuel & Spark > ECU).' :
        cat === 'fi' ? 'Needs an ECU tune: on the stock ECU it can only run about 5 psi. Plan on injectors and a fuel pump too.' : 'Needs an ECU tune (Fuel & Spark > ECU: a flash or a standalone). Without one ' + (cat === 'injectors' ? 'it runs pig-rich and loses power.' : cat === 'fueltype' ? 'it runs lean and can burn a piston.' : 'the stock ECU can\'t run it properly.')) : null,
      locked ? h('div', { class: 'warnbox' }, '🔒 ' + DR.LEVEL_NAMES[lvl] + '-level ' + (DR.UNLOCK_NAMES[DR.groupOf(cat)] || '').toLowerCase() + ' parts unlock in the career: ' + G.unlockWhere(cat, lvl) + '.') :
        h('div', { class: 'row', style: { flexWrap: 'wrap' } },
          btn('Buy ' + DR.money(opt.price), function () { buy(false); }, 'go' + (G.canAfford(opt.price) ? '' : ' disabled')),
          fits && !installed && owned && !(opt.fit && opt.fit.block) ? btn('Install Yours' + (opt.install ? ' ' + DR.money(opt.install) : ''), function () {
            var it = G.state.inv.filter(function (x) { return x.cat === cat && x.id === id; })[0];
            var r = G.installPart(inst, it.uid); UI.toast(r.msg); close(); UI.refresh();
          }, 'primary') : null,
          fits && !installed && !owned && !(opt.fit && opt.fit.block) ? btn('Buy & Install' + (total !== opt.price ? ' ' + DR.money(total) : ''), function () { buy(true); }, 'primary' + (G.canAfford(total) ? '' : ' disabled')) : null),
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
    memory(); remember();
    if (!inst.vis) inst.vis = {};
    // parts already on the car count as owned (older saves)
    var own = inst.visOwned || (inst.visOwned = {});
    DR.VISUAL.forEach(function (sl) { var v = inst.vis[sl.id]; if (v) own[sl.id + ':' + (sl.id === 'neon' ? 'neon' : v)] = 1; });
    var slot = DR.visSlot(bodySlot);
    var rail = h('div', { class: 'srail' }, DR.VISUAL.map(function (sl) {
      return h('div', { class: 'srail-i' + (sl.id === bodySlot ? ' on' : ''), onclick: function () { bodySlot = sl.id; UI.refresh(); } },
        iconEl('v_' + sl.id, inst.vis[sl.id] ? 4 : 1, '', 26), h('span', {}, sl.name), sl.id !== bodySlot && G.visSlotHasNew(sl.id) ? h('span', { class: 'newdot' }, 'NEW') : null);
    }));
    var cv = UI.dragCam(h('canvas', { class: 'preview' }));
    DR.drawPreview(cv, inst, { aspect: 0.34 });
    var stars = DR.starRating(inst);
    var grid = h('div', { class: 'pgrid' });
    visOptions(slot).forEach(function (o) {
      var on = visOn(inst, slot, o), owned = visOwned(inst, slot, o), locked = o.tier && !G.visUnlocked(slot.id, o.tier), lvl = o.tier ? o.tier + 1 : 0;
      grid.appendChild(h('div', { class: 'pcard l' + lvl + (locked ? ' locked' : '') + (on ? ' inst' : ''), onclick: function () { if (!on) bodyModal(inst, slot, o); } },
        h('div', { class: 'pic' }, iconEl('v_' + slot.id, lvl, '', 44)),
        h('div', { class: 'plvl' }, o.tier ? 'Tier ' + o.tier + ' • +' + o.stars + ' stars' : 'Stock'),
        h('div', { class: 'pname' }, o.name),
        h('div', { class: 'pfoot' }, on ? h('span', { class: 'tag g' }, 'FITTED') : locked ? h('span', { class: 'tag' }, '🔒 WIN RACES') : G.isNewVis(slot.id, o.tier) && !owned ? h('span', { class: 'newdot' }, 'NEW') :
          owned && o.price ? h('span', { class: 'tag b' }, 'OWNED') : h('span', { class: 'price' }, o.price ? DR.money(o.price) : 'FREE'))));
    });
    G.markVisSeen(slot.id);
    var extra = null;
    if (slot.id === 'neon') {
      extra = h('div', {}, h('h3', {}, 'NEON COLOR' + (inst.vis.neon ? ' (free to change)' : '')), h('div', { class: 'swatches' }, slot.colors.map(function (c) {
        return h('div', { class: 'sw' + ((inst.vis.neon || neonPick || slot.colors[0]) === c ? ' on' : ''), style: { background: c }, onclick: function () {
          neonPick = c; if (inst.vis.neon) { inst.vis.neon = c; G.save(); } UI.refresh();
        } });
      })));
    }
    if (slot.id === 'vinyl' || slot.id === 'finish') extra = h('p', { class: 'dim' }, slot.id === 'vinyl' ? 'Vinyls use your stripe color from the Paint Shop when you have one.' : 'Finishes change how the paint catches the light.');
    return h('div', { class: 'screen' }, UI.sectionTop('style', 'body'),
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
    var inst = G.car(), S = G.spec(inst), weak = DR.bottlenecks(S);
    memory();
    if (jump && !UI.refreshing) bayCat = jump;
    remember();
    var cv = h('canvas', { class: 'preview' });
    DR.drawPreview(cv, inst);
    var list = h('div', { class: 'list bay-list' });
    DR.PART_GROUPS.forEach(function (g) {
      list.appendChild(h('div', { class: 'bay-h' }, g.name));
      g.cats.forEach(function (c) {
        var applies = DR.partApplies(c, inst);
        var spare = G.invFor(c).filter(function (it) { return !it.stock && !G.partFitIssue(it, inst); }).length;
        if (!applies && !G.invFor(c).length) return;
        var id = DR.partId(c, inst), opt = DR.getOption(c, inst, id), stock = id === DR.stockPart(c, inst);
        list.appendChild(h('div', { class: 'item' + (c === bayCat ? ' sel' : '') + (applies ? '' : ' locked'), onclick: function () { bayCat = c; UI.refresh(); } },
          iconEl(DR.iconCat(c, inst), stock ? 0 : lvlOf(opt), id, 28),
          h('div', { class: 'name' }, h('div', { class: 'pix small' }, DR.catName(c, inst)), h('div', { class: stock ? 'dim' : 'acc' }, opt.name),
            weak[c] && applies ? h('div', { class: 'bad', style: { fontSize: '14px' } }, '! ' + weak[c]) : null),
          spare ? h('span', { class: 'badge' }, String(spare)) : null));
      });
    });
    // the selected slot
    var id = DR.partId(bayCat, inst), opt = DR.getOption(bayCat, inst, id), stock = id === DR.stockPart(bayCat, inst);
    var right = h('div', { class: 'col' },
      h('h2', {}, DR.catName(bayCat, inst)),
      h('div', { class: 'slot l' + (stock ? 0 : lvlOf(opt)) },
        iconEl(DR.iconCat(bayCat, inst), stock ? 0 : lvlOf(opt), id, 44),
        h('div', { class: 'grow' }, h('div', { class: 'plvl' }, stock ? 'FACTORY' : 'INSTALLED • ' + DR.LEVEL_NAMES[lvlOf(opt)]), h('div', { class: 'pix' }, opt.name),
          opt.desc ? h('div', { class: 'dim', style: { fontSize: '16px' } }, opt.desc) : null),
        stock ? null : (function () {
          // the factory part goes back in: yours if you kept it, else a used one
          var fac = G.factoryFor(inst, bayCat);
          return btn('Remove' + (fac.cost ? ' ' + DR.money(fac.cost) : ''), function () {
            var why = G.removeIssue(inst, bayCat);
            if (why) return UI.toast(why);
            if (fac.cost && !G.canAfford(fac.cost)) return UI.toast('A used factory part costs ' + DR.money(fac.cost));
            var go = function () { if (!G.removePart(inst, bayCat)) return; A.click(); UI.toast(opt.name + ' moved to your inventory'); UI.refresh(); };
            var used = fac.cost ? ' You don\'t have the factory part any more: a used one costs ' + DR.money(fac.cost) + '.' : '';
            if (bayCat === 'engine') UI.confirm('Pull the ' + opt.name + '? It and its engine parts go to your inventory and the factory engine goes back in.' + used, go, 'Remove');
            else if (used) UI.confirm('Take off the ' + opt.name + '?' + used, go, 'Remove');
            else go();
          }, 'small red');
        })()),
      h('h3', {}, 'IN YOUR INVENTORY'));
    var items = G.invFor(bayCat);
    if (!items.length) right.appendChild(h('div', { class: 'dim' }, 'No spare ' + DR.catName(bayCat, inst).toLowerCase() + ' parts in your inventory.'));
    items.sort(function (a, b) { return (G.partFitIssue(a, inst) ? 1 : 0) - (G.partFitIssue(b, inst) ? 1 : 0) || b.price - a.price; }).forEach(function (it) {
      var why = G.partFitIssue(it, inst), lvl = lvlOf(G.itemOption(it) || { price: it.price, lvl: DR.partLevel(it.price) });
      right.appendChild(h('div', { class: 'item inv l' + lvl + (why ? ' locked' : '') },
        iconEl(it.cat, lvl, it.id, 32),
        h('div', { class: 'name' }, h('div', {}, G.partName(it)), why ? h('div', { class: 'warn', style: { fontSize: '15px' } }, why) : gainLine(inst, it.cat, it.id)),
        why ? null : btn('Install', function () {
          var go = function () { var r = G.installPart(inst, it.uid); UI.toast(r.msg); if (r.ok) A.click(); UI.refresh(); };
          var fee = it.cat === 'engine' ? DR.swapFit(inst, it.id).install : 0;
          if (it.cat === 'engine') UI.confirm('Swap in the ' + G.partName(it) + '?' + (fee ? ' The install costs ' + DR.money(fee) + '.' : '') + ' Your current engine parts come off with the old engine.', go, 'Swap');
          else go();
        }, 'small go'),
        btn('Sell ' + DR.money(G.partSellValue(it)), function () {
          UI.confirm('Sell the ' + G.partName(it) + ' for ' + DR.money(G.partSellValue(it)) + '?', function () { G.sellPart(it.uid); A.cash(); UI.refresh(); }, 'Sell');
        }, 'small')));
    });
    right.appendChild(btn('Shop for ' + DR.catName(bayCat, inst) + ' ▶', function () { UI.show(UI.Shop, bayCat); }, 'shop'));
    return h('div', { class: 'screen' }, UI.sectionTop('upgrade', 'install'),
      h('div', { class: 'content' }, h('div', { class: 'split' },
        h('div', { class: 'left bay-left' }, cv,
          h('div', { class: 'row bay-quick' }, h('span', { class: 'acc' }, Math.round(S.peakHp + S.nosHp) + 'hp'), h('span', {}, UI.kgLb(S.m)), h('span', { class: 'good' }, inst.best && inst.best.q ? '1/4 ' + inst.best.q.toFixed(2) + 's' : 'no 1/4 yet')),
          UI.riskBox(S), list),
        h('div', { class: 'right' }, right))));
  };
  // ---------------------------------------------------------------- INVENTORY
  // Every spare part you own, whatever car it came off. Filter by the car it
  // fits, the kind of part and what it's worth, then fit it or sell it.
  // Sales can be bought back (at the sale price) until your next race.
  var VALUE_BANDS = [['any', 'Any value', 0, Infinity], ['lt500', 'Under $500', 0, 500], ['mid', '$500-2k', 500, 2000], ['hi', '$2k-10k', 2000, 10000], ['top', '$10k+', 10000, Infinity]];
  var invF = { car: 'all', grp: 'all', val: 'any', kind: 'all', sort: 'hi' };
  function groupOfCat(cat) { for (var i = 0; i < DR.PART_GROUPS.length; i++) if (DR.PART_GROUPS[i].cats.indexOf(cat) >= 0) return DR.PART_GROUPS[i]; return null; }
  function carShort(inst) { var w = DR.CARS[inst.carId].name.split(' '); return w.length > 2 ? w.slice(1).join(' ') : w.join(' '); }
  UI.Inventory = function () {
    var m = UI.memory('inv');
    if (m && m.invF) for (var k in m.invF) invF[k] = m.invF[k];
    var cars = G.state.cars, inst = G.car();
    if (invF.car !== 'all' && invF.car !== 'none' && !cars.some(function (c) { return String(c.uid) === invF.car; })) invF.car = 'all';
    if (invF.open == null) invF.open = window.innerWidth >= 700;
    UI.remember({ invF: { car: invF.car, grp: invF.grp, val: invF.val, kind: invF.kind, sort: invF.sort, open: invF.open } });
    function set(k, v) { return function () { invF[k] = v; A.click(); UI.refresh(); }; }
    function chipRow(label, opts, key) {
      return h('div', { class: 'invrow' }, h('span', { class: 'invlbl pix small' }, label),
        h('div', { class: 'schips' }, opts.map(function (o) { return btn(o[1], set(key, o[0]), 'chip' + (invF[key] === o[0] ? ' on' : '')); })));
    }
    var fitsOf = function (it) { return cars.filter(function (c) { return !G.partFitIssue(it, c); }); };
    var band = VALUE_BANDS.filter(function (b) { return b[0] === invF.val; })[0] || VALUE_BANDS[0];
    var all = G.state.inv.map(function (it) { return { it: it, fits: fitsOf(it), v: G.partSellValue(it), g: groupOfCat(it.cat) }; });
    var shown = all.filter(function (r) {
      if (invF.car === 'none' ? r.fits.length : invF.car !== 'all' && !r.fits.some(function (c) { return String(c.uid) === invF.car; })) return false;
      if (invF.grp !== 'all' && (!r.g || r.g.id !== invF.grp)) return false;
      if (invF.kind !== 'all' && (invF.kind === 'stock') !== !!r.it.stock) return false;
      return r.v >= band[2] && r.v < band[3];
    });
    shown.sort(invF.sort === 'lo' ? function (a, b) { return a.v - b.v; } : invF.sort === 'new' ? function (a, b) { return b.it.uid - a.it.uid; } : function (a, b) { return b.v - a.v; });
    var total = shown.reduce(function (t, r) { return t + r.v; }, 0);
    var carOpts = [['all', 'All cars']].concat(cars.map(function (c) { return [String(c.uid), (c.uid === inst.uid ? '★ ' : '') + carShort(c)]; })).concat([['none', 'Fits none']]);
    var grpOpts = [['all', 'All']].concat(DR.PART_GROUPS.filter(function (g) { return all.some(function (r) { return r.g === g; }); }).map(function (g) { return [g.id, g.name]; }));
    var filtered = invF.car !== 'all' || invF.grp !== 'all' || invF.val !== 'any' || invF.kind !== 'all';
    var KINDS = [['all', 'All'], ['after', 'Aftermarket'], ['stock', 'Factory']];
    // what's filtered, as removable tags (shown above the list)
    function optName(opts, v) { return (opts.filter(function (o) { return o[0] === v; })[0] || ['', v])[1].replace('★ ', ''); }
    var active = [];
    if (invF.car !== 'all') active.push(['car', invF.car === 'none' ? 'Fits none' : 'Fits ' + optName(carOpts, invF.car)]);
    if (invF.grp !== 'all') active.push(['grp', optName(grpOpts, invF.grp)]);
    if (invF.val !== 'any') active.push(['val', optName(VALUE_BANDS.map(function (b) { return [b[0], b[1]]; }), invF.val)]);
    if (invF.kind !== 'all') active.push(['kind', optName(KINDS, invF.kind)]);
    var reset = { car: 'all', grp: 'all', val: 'any', kind: 'all' };
    var tags = active.length ? h('div', { class: 'invtags' }, active.map(function (a) { return btn(a[1] + ' ✕', function () { invF[a[0]] = reset[a[0]]; A.click(); UI.refresh(); }, 'chip on small'); }),
      active.length > 1 ? btn('Clear all', function () { invF.car = 'all'; invF.grp = 'all'; invF.val = 'any'; invF.kind = 'all'; A.click(); UI.refresh(); }, 'chip small') : null) : null;
    var toggle = btn((invF.open ? '◀ Hide filters' : '☰ Filters') + (active.length && !invF.open ? ' (' + active.length + ')' : ''), function () { invF.open = !invF.open; A.click(); UI.refresh(); }, 'small' + (active.length ? ' blue' : ''));
    var filters = !invF.open ? null : h('div', { class: 'invfilters' },
      chipRow('FITS', carOpts, 'car'), chipRow('KIND', KINDS, 'kind'), chipRow('TYPE', grpOpts, 'grp'), chipRow('VALUE', VALUE_BANDS.map(function (b) { return [b[0], b[1]]; }), 'val'),
      chipRow('SORT', [['hi', 'Most $'], ['lo', 'Least $'], ['new', 'Newest']], 'sort'));
    var bar = h('div', { class: 'invbar' },
      toggle,
      h('div', { class: 'grow' }, h('span', { class: 'pix small' }, (filtered ? shown.length + ' of ' + all.length : all.length) + (all.length === 1 ? ' part' : ' parts')), ' ', h('span', { class: 'good' }, 'worth ' + DR.money(total))),
      shown.length ? btn('Sell all shown ' + DR.money(total), function () {
        UI.confirm('Sell ' + shown.length + ' part' + (shown.length > 1 ? 's' : '') + ' for ' + DR.money(total) + '? You can buy them back until your next race.', function () {
          G.sellParts(shown.map(function (r) { return r.it.uid; })); A.cash(); UI.toast('Sold for ' + DR.money(total)); UI.refresh();
        }, 'Sell all');
      }, 'small red') : null);
    var list = h('div', { class: 'list invlist' });
    if (!all.length) list.appendChild(h('div', { class: 'dim', style: { padding: '10px' } }, 'No spare parts. Parts you buy, and parts you take off a car, land here.'));
    else if (!shown.length) list.appendChild(h('div', { class: 'dim', style: { padding: '10px' } }, 'Nothing matches these filters.'));
    shown.forEach(function (r) {
      var it = r.it, lvl = it.stock ? 0 : lvlOf(G.itemOption(it) || { price: it.price, lvl: DR.partLevel(it.price) });
      var from = it.from != null ? cars.filter(function (c) { return c.uid === it.from; })[0] : null;
      var fitsHere = r.fits.indexOf(inst) >= 0;
      var fitTxt = r.fits.length ? 'Fits: ' + r.fits.map(carShort).join(', ') : G.partFitIssue(it, inst) || 'Fits none of your cars';
      list.appendChild(h('div', { class: 'item inv l' + lvl + (r.fits.length ? '' : ' locked') },
        iconEl(DR.iconCat(it.cat, inst), lvl, it.id, 32),
        h('div', { class: 'name' },
          h('div', {}, it.stock ? h('span', { class: 'tag' }, 'FACTORY') : null, it.stock ? ' ' : null, G.partName(it)),
          h('div', { class: 'dim', style: { fontSize: '15px' } }, DR.catName(it.cat, inst) + (it.eng && DR.ENGINES[it.eng] ? ' • for ' + DR.ENGINES[it.eng].name : '') + (from ? ' • off your ' + carShort(from) : '')),
          h('div', { class: r.fits.length ? 'acc' : 'warn', style: { fontSize: '15px' } }, fitTxt)),
        fitsHere ? btn('Fit ▶', function () { UI.show(UI.Parts, it.cat); }, 'small go') : null,
        btn('Sell ' + DR.money(r.v), function () { G.sellPart(it.uid); A.cash(); UI.toast('Sold the ' + G.partName(it) + ' for ' + DR.money(r.v)); UI.refresh(); }, 'small')));
    });
    var sold = G.state.sold || [];
    var soldBox = sold.length ? h('div', { class: 'invsold' },
      h('h3', {}, 'SOLD - BUY BACK UNTIL YOUR NEXT RACE'),
      sold.map(function (s) {
        return h('div', { class: 'item inv' },
          h('div', { class: 'name' }, h('div', {}, G.partName(s.item)), h('div', { class: 'dim', style: { fontSize: '15px' } }, DR.catName(s.item.cat, inst))),
          btn('Buy back ' + DR.money(s.v), function () { if (G.buyBack(s.item.uid)) { A.cash(); UI.refresh(); } else UI.toast('Not enough cash'); }, 'small' + (G.canAfford(s.v) ? '' : ' disabled')));
      })) : null;
    return h('div', { class: 'screen' }, UI.sectionTop('upgrade', 'inv'),
      h('div', { class: 'content invwrap' }, filters, h('div', { class: 'invmain' }, bar, tags, list, soldBox)));
  };
})();
