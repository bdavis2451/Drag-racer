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
        ['risk', -Math.max(S0.risk.engine, S0.risk.trans, S0.risk.axle) * 100, -Math.max(S1.risk.engine, S1.risk.trans, S1.risk.axle) * 100, '% risk']]);
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
    var cv = DR.roomCanvas(inst, { theme: 'garage' });
    function cycle(d) { var n = cars.length; G.state.active = cars[(idx + d + n) % n].uid; G.save(); UI.refresh(); }
    var dmg = null;
    if (inst.damage) {
      var cost = G.repairCost(inst);
      dmg = h('div', { class: 'gdmg warnbox' }, (inst.damage.engine ? 'ENGINE BLOWN! ' : inst.damage.axle ? 'BROKEN AXLE! ' : 'TRANSMISSION BROKEN! ') + 'Repair: ' + DR.money(cost) + ' ',
        btn('Repair', function () { if (G.repair(inst)) { A.cash(); UI.refresh(); } else UI.toast('Not enough money'); }, 'small go'));
    }
    var spare = G.state.inv.filter(function (it) { return !G.partFitIssue(it, inst); }).length;
    function mbtn(label, fn, cls, badge, icon) {
      return btn([icon ? iconEl(icon, 1, '', 24, 'gico') : null, h('span', {}, label), badge ? h('span', { class: 'badge' }, String(badge)) : null], fn, 'gbtn ' + (cls || ''));
    }
    var menu = h('div', { class: 'gmenu' },
      mbtn('Race', function () { if (inst.damage) return UI.toast('Repair your car first!'); UI.show(UI.RaceMenu); }, 'race', 0, 'g_race'),
      mbtn('Parts Shop', function () { UI.show(UI.Shop); }, 'shop', 0, 'g_shop'),
      mbtn('Install Parts', function () { UI.show(UI.Parts); }, 'blue', spare, 'g_install'),
      mbtn('Tune', function () { UI.show(UI.Tune); }, '', 0, 'g_tune'),
      mbtn('Dyno', function () { UI.show(UI.Dyno); }, '', 0, 'g_dyno'),
      mbtn('Body Shop', function () { UI.show(UI.Body); }, 'purple', 0, 'g_body'),
      mbtn('Paint', function () { UI.show(UI.Paint); }, '', 0, 'g_paint'),
      mbtn('Car Shows', function () { if (inst.damage) return UI.toast('Repair your car first!'); UI.show(UI.Shows); }, '', 0, 'g_shows'),
      mbtn('Dealer', function () { UI.show(UI.Dealer); }, '', G.newCarCount() ? 'NEW' : 0, 'g_dealer'));
    var stars = DR.starRating(inst);
    var stat = function (k, v, cls) { return h('div', { class: 'gst' }, h('span', { class: 'k' }, k), h('span', { class: 'v ' + (cls || '') }, v)); };
    var side = h('div', { class: 'gside' },
      stat('POWER', Math.round(S.peakHp) + (S.nosHp ? '+' + S.nosHp : '') + ' hp', 'acc'),
      stat('TORQUE', Math.round(S.peakTq) + ' lb-ft'),
      stat('WEIGHT', UI.kgLb(S.m)),
      stat('DRIVE', S.drive + ' • ' + DR.TRANS[S.transId].ratios.length + '-spd'),
      inst.best && inst.best.q ? stat('BEST 1/4', inst.best.q.toFixed(3) + 's', 'acc') : null,
      h('div', { class: 'gst' }, h('span', { class: 'k' }, 'LOOKS'), starMeter(stars)),
      S.risk.engine > 0.001 || S.risk.trans > 0.001 || S.risk.axle > 0.001 ? h('div', { class: 'bad gsmall' }, '⚠ ' + Math.round(Math.max(S.risk.engine, S.risk.trans, S.risk.axle) * 100) + '% failure risk') : null,
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
    // jump only when arriving (a refresh replays the same argument)
    if (jump && !UI.refreshing) { shopCat = jump; DR.PART_GROUPS.forEach(function (g) { if (g.cats.indexOf(jump) >= 0) shopGroup = g.id; }); }
    var group = groupById(shopGroup), weak = DR.bottlenecks(G.spec(inst));
    if (group.cats.indexOf(shopCat) < 0) shopCat = firstCat(group, inst);
    var rail = h('div', { class: 'srail' }, DR.PART_GROUPS.map(function (g) {
      var hot = g.cats.some(function (c) { return weak[c]; });
      return h('div', { class: 'srail-i' + (g.id === shopGroup ? ' on' : '') + (hot ? ' hot' : ''), onclick: function () { shopGroup = g.id; shopCat = firstCat(g, inst); UI.refresh(); } },
        iconEl(g.icon || g.cats[0], 2, '', 26), h('span', {}, g.name));
    }), h('div', { class: 'srail-i', onclick: function () { UI.show(UI.Body); } }, iconEl('aero', 4, '', 26), h('span', {}, 'Body Kits')),
      h('div', { class: 'srail-i', onclick: function () { UI.show(UI.Paint); } }, iconEl('fueltype', 1, '', 26), h('span', {}, 'Paint')));
    var chips = h('div', { class: 'schips' }, group.cats.map(function (c) {
      var fits = DR.partApplies(c, inst);
      return btn((weak[c] ? '! ' : '') + DR.catName(c), function () { shopCat = c; UI.refresh(); }, 'chip' + (c === shopCat ? ' on' : '') + (fits ? '' : ' nofit') + (weak[c] ? ' hot' : ''));
    }));
    var curId = DR.partId(shopCat, inst);
    var grid = h('div', { class: 'pgrid' });
    DR.partOptions(shopCat, inst).forEach(function (o) {
      if (!o.price) return;                                  // stock / factory parts are not sold
      var lvl = lvlOf(o), installed = o.id === curId, owned = G.ownedCount(shopCat, o.id), locked = !G.partUnlocked(shopCat, lvl);
      grid.appendChild(h('div', { class: 'pcard l' + lvl + (locked ? ' locked' : '') + (installed ? ' inst' : ''), onclick: function () { partModal(inst, shopCat, o.id); } },
        h('div', { class: 'pic' }, iconEl(shopCat, lvl, o.id, 48)),
        h('div', { class: 'plvl' }, DR.LEVEL_NAMES[lvl]),
        h('div', { class: 'pname' }, o.name),
        // what it does for this car, at a glance
        !locked && !installed && DR.partApplies(shopCat, inst) ? gainLine(inst, shopCat, o.id) : null,
        h('div', { class: 'pfoot' }, locked ? h('span', { class: 'tag' }, '🔒 LOCKED') : h('span', { class: 'price' + (G.canAfford(o.price) ? '' : ' bad') }, DR.money(o.price)),
          installed ? h('span', { class: 'tag g' }, 'ON CAR') : owned ? h('span', { class: 'tag b' }, 'OWNED ×' + owned) : null)));
    });
    if (!grid.children.length) grid.appendChild(h('div', { class: 'dim' }, 'Nothing for sale here.'));
    var note = weak[shopCat] && DR.partApplies(shopCat, inst) ? h('div', { class: 'warnbox', style: { marginBottom: '6px' } }, 'Holding your build back: ' + weak[shopCat] + '.') : !DR.partApplies(shopCat, inst) ? h('div', { class: 'warnbox', style: { marginBottom: '6px' } }, G.partFitIssue({ cat: shopCat, id: '' }, inst) + ' — you can still buy these for another car.') : null;
    return h('div', { class: 'screen' }, UI.top('PARTS SHOP', function () { UI.show(UI.Garage); }, btn('Install ▶', function () { UI.show(UI.Parts, shopCat); }, 'small blue')),
      h('div', { class: 'shopwrap' }, rail, h('div', { class: 'smain' }, storeHead(), chips, note, grid)));
  };

  var storeImg = null;
  function storeHead() {
    var c = h('canvas', { class: 'storehead', width: 560, height: 150 });
    if (!storeImg) { storeImg = document.createElement('canvas'); storeImg.width = 560; storeImg.height = 150; DR.drawStore(storeImg); }
    c.getContext('2d').drawImage(storeImg, 0, 0);
    return c;
  }
  function partModal(inst, cat, id) {
    var opt = DR.getOption(cat, inst, id), lvl = lvlOf(opt), locked = !G.partUnlocked(cat, lvl);
    var S0 = G.spec(inst), copy = hypothetical(inst, cat, id), S1 = DR.buildSpec(copy);
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
        Math.round(S0.safeHp) !== Math.round(S1.safeHp) ? ['Safe power', deltaRow(S0.safeHp, S1.safeHp, ' hp')] : null,
        S0.beLimit !== S1.beLimit ? ['Bottom end', deltaRow(S0.beLimit, S1.beLimit, ' rpm')] : null,
        S0.vtLimit !== S1.vtLimit ? ['Valve float', deltaRow(S0.vtLimit, S1.vtLimit, ' rpm')] : null,
        Math.round(S0.fuelW) !== Math.round(S1.fuelW) ? ['Fuel feeds', deltaRow(S0.fuelW / DR.HP, S1.fuelW / DR.HP, ' hp')] : null,
        S0.sparkPsi !== S1.sparkPsi && S1.fiType !== 'none' ? ['Ignition', deltaRow(S0.sparkPsi, S1.sparkPsi, ' psi')] : null,
        S0.maxBoost !== S1.maxBoost && S0.fiId === S1.fiId ? ['Max boost', deltaRow(S0.maxBoost, S1.maxBoost, ' psi', 1)] : null,
        Math.round(S0.axleTq) !== Math.round(S1.axleTq) ? ['Axles hold', deltaRow(S0.axleTq, S1.axleTq, ' Nm')] : null,
        Math.abs(S0.f - S1.f) > 0.002 ? ['Front weight', deltaRow(S0.f * 100, S1.f * 100, '%', 1, true)] : null,
        ['Weight', deltaRow(S0.m * 2.2046, S1.m * 2.2046, ' lb', 0, true)],
        ['Price', DR.money(opt.price), 'good'],
        owned ? ['In your parts', '×' + owned, 'acc'] : null
      ]) : h('div', { class: 'warnbox' }, G.partFitIssue({ cat: cat, id: id }, inst)),
      fits ? UI.riskBox(S1) : null,
      cat === 'engine' ? h('div', { class: 'dim' }, 'Swapping engines moves your current engine and its engine parts to your inventory.') : null,
      G.isEngineBound(cat) && cat !== 'engine' ? h('div', { class: 'dim' }, 'Built for your ' + DR.ENGINES[inst.engine].name + '.') : null,
      locked ? h('div', { class: 'warnbox' }, '🔒 ' + DR.LEVEL_NAMES[lvl] + '-level ' + (DR.UNLOCK_NAMES[DR.groupOf(cat)] || '').toLowerCase() + ' parts unlock as you win career races.') :
        h('div', { class: 'row', style: { flexWrap: 'wrap' } },
          btn('Buy ' + DR.money(opt.price), function () { buy(false); }, 'go' + (G.canAfford(opt.price) ? '' : ' disabled')),
          fits && !installed && owned ? btn('Install Yours', function () {
            var it = G.state.inv.filter(function (x) { return x.cat === cat && x.id === id; })[0];
            var r = G.installPart(inst, it.uid); UI.toast(r.msg); close(); UI.refresh();
          }, 'primary') : null,
          fits && !installed && !owned ? btn('Buy & Install', function () { buy(true); }, 'primary' + (G.canAfford(opt.price) ? '' : ' disabled')) : null),
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
    var inst = G.car(), S = G.spec(inst), weak = DR.bottlenecks(S);
    if (jump && !UI.refreshing) bayCat = jump;
    var cv = h('canvas', { class: 'preview' });
    DR.drawPreview(cv, inst);
    var list = h('div', { class: 'list bay-list' });
    DR.PART_GROUPS.forEach(function (g) {
      list.appendChild(h('div', { class: 'bay-h' }, g.name));
      g.cats.forEach(function (c) {
        var applies = DR.partApplies(c, inst);
        var spare = G.invFor(c).filter(function (it) { return !G.partFitIssue(it, inst); }).length;
        if (!applies && !G.invFor(c).length) return;
        var id = DR.partId(c, inst), opt = DR.getOption(c, inst, id), stock = id === DR.stockPart(c, inst);
        list.appendChild(h('div', { class: 'item' + (c === bayCat ? ' sel' : '') + (applies ? '' : ' locked'), onclick: function () { bayCat = c; UI.refresh(); } },
          iconEl(c, stock ? 0 : lvlOf(opt), id, 28),
          h('div', { class: 'name' }, h('div', { class: 'pix small' }, DR.catName(c)), h('div', { class: stock ? 'dim' : 'acc' }, opt.name),
            weak[c] && applies ? h('div', { class: 'bad', style: { fontSize: '14px' } }, '! ' + weak[c]) : null),
          spare ? h('span', { class: 'badge' }, String(spare)) : null));
      });
    });
    // the selected slot
    var id = DR.partId(bayCat, inst), opt = DR.getOption(bayCat, inst, id), stock = id === DR.stockPart(bayCat, inst);
    var right = h('div', { class: 'col' },
      h('h2', {}, DR.catName(bayCat)),
      h('div', { class: 'slot l' + (stock ? 0 : lvlOf(opt)) },
        iconEl(bayCat, stock ? 0 : lvlOf(opt), id, 44),
        h('div', { class: 'grow' }, h('div', { class: 'plvl' }, stock ? 'FACTORY' : 'INSTALLED • ' + DR.LEVEL_NAMES[lvlOf(opt)]), h('div', { class: 'pix' }, opt.name),
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
      var why = G.partFitIssue(it, inst), lvl = lvlOf(G.itemOption(it) || { price: it.price, lvl: DR.partLevel(it.price) });
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
          h('div', { class: 'row bay-quick' }, h('span', { class: 'acc' }, Math.round(S.peakHp + S.nosHp) + 'hp'), h('span', {}, UI.kgLb(S.m)), h('span', { class: 'good' }, inst.best && inst.best.q ? inst.best.q.toFixed(2) + 's' : '—')),
          UI.riskBox(S), list),
        h('div', { class: 'right' }, right))));
  };
})();
