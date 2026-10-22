// ===========================================================================
// ROOMS — the pixel scenes behind the menus: the garage bay, the dealership
// showroom and the dyno cell. Backgrounds are cached per size; the car is
// drawn on top each time (so the dyno can spin its wheels).
//   DR.drawRoom(canvas, inst, { theme, aspect, spr, spin, zoom })
// ===========================================================================
(function () {
  var DR = globalThis.DR;
  var BG = {};

  function rects(x) { return function (px, py, w, h, col) { x.fillStyle = col; x.fillRect(Math.round(px), Math.round(py), Math.round(w), Math.round(h)); }; }
  function disc(x, cx, cy, r, col) { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
  function cone(x, lx, top, spread, H, a) {
    var g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(255,240,210,' + a + ')'); g.addColorStop(1, 'rgba(255,240,210,0.02)');
    x.fillStyle = g; x.beginPath(); x.moveTo(lx - 26, top); x.lineTo(lx + 26, top); x.lineTo(lx + spread, H); x.lineTo(lx - spread, H); x.closePath(); x.fill();
  }
  function pool(x, cx, cy, rad, col) {
    x.save(); x.translate(cx, cy); x.scale(1, 0.22);
    var g = x.createRadialGradient(0, 0, 0, 0, 0, rad); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(-rad, -rad, rad * 2, rad * 2); x.restore();
  }
  function vignette(x, W, H, a) {
    var vg = x.createRadialGradient(W / 2, H * 0.55, H * 0.4, W / 2, H * 0.55, W * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,' + a + ')');
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
  }
  function floorLines(x, W, H, fl, col, rows, fan) {
    x.fillStyle = col;
    for (var i = 1; i < rows; i++) x.fillRect(0, fl + Math.round((H - fl) * Math.pow(i / rows, 1.4)), W, 1);
    for (var k = -12; k <= 12; k++) { x.beginPath(); x.moveTo(W / 2 + k * fan, fl); x.lineTo(W / 2 + k * fan * 2.4, H); x.lineTo(W / 2 + k * fan * 2.4 + 1, H); x.lineTo(W / 2 + k * fan + 1, fl); x.fill(); }
  }

  // ---------------------------------------------------------------- garage
  function garageBg(x, W, H, fl) {
    var r = rects(x), i, k;
    var g = x.createLinearGradient(0, 0, 0, fl);
    g.addColorStop(0, '#14161c'); g.addColorStop(1, '#2a2e38');
    x.fillStyle = g; x.fillRect(0, 0, W, fl);
    x.fillStyle = 'rgba(0,0,0,0.22)';
    for (i = 0; i < fl; i += 12) { x.fillRect(0, i, W, 1); for (k = ((i / 12) % 2) * 12; k < W; k += 24) x.fillRect(k, i, 1, 12); }
    // ceiling: rafters, a duct and a hanging cord
    r(0, 0, W, 10, '#0d0e12'); for (k = 8; k < W; k += 46) r(k, 0, 6, 10, '#1d2027');
    r(0, 12, W, 6, '#3a3f4a'); r(0, 12, W, 1, '#565c69'); for (k = 30; k < W; k += 90) r(k, 11, 3, 8, '#2a2e36');
    x.strokeStyle = '#111'; x.lineWidth = 1; x.beginPath(); x.moveTo(W * 0.62, 18); x.quadraticCurveTo(W * 0.64, fl * 0.42, W * 0.66, fl * 0.2); x.stroke();
    r(W * 0.66 - 2, fl * 0.2, 5, 7, '#d0a020');
    // wainscot
    r(0, fl - 26, W, 18, '#3a2f22'); r(0, fl - 26, W, 2, '#4a3c2b');
    // roll-up door with windows
    var dx = Math.round(W * 0.3), dw = Math.round(W * 0.4), dy = Math.round(fl * 0.24);
    r(dx - 5, dy - 5, dw + 10, fl - dy - 21, '#0e0f13'); r(dx - 5, dy - 5, dw + 10, 2, '#2c2f37');
    for (i = dy; i < fl - 26; i += 6) { r(dx, i, dw, 5, '#5b606b'); r(dx, i, dw, 1, '#6c717d'); r(dx, i + 4, dw, 1, '#4b505a'); }
    var wy = dy + 18;
    for (k = 0; k < 4; k++) {
      var wx = dx + 8 + k * (dw - 16) / 4;
      r(wx, wy, (dw - 16) / 4 - 6, 9, '#0b1428'); r(wx + 2, wy + 2, 4, 1, '#ffe7a0'); r(wx + 10, wy + 4, 2, 1, '#9ad0ff');
    }
    r(dx + dw / 2 - 8, fl - 34, 16, 3, '#2a2c33');
    for (k = dx; k < dx + dw; k += 16) r(k, fl - 30, 8, 3, '#ffcc00');
    // left wall: pegboard, tools, red tool chest with a radio on top
    var px0 = Math.round(W * 0.04), pw = Math.round(W * 0.2), pt = Math.round(fl * 0.2), ph = Math.round(fl * 0.34);
    r(px0, pt, pw, ph, '#6b5135'); r(px0, pt, pw, 2, '#7e6141');
    x.fillStyle = '#543f29'; for (i = pt + 4; i < pt + ph; i += 5) for (k = px0 + 3; k < px0 + pw; k += 5) x.fillRect(k, i, 1, 1);
    var ty = pt + 5;
    r(px0 + 6, ty, 3, 22, '#c8ccd4'); r(px0 + 4, ty, 7, 4, '#c8ccd4');
    r(px0 + 16, ty + 2, 2, 20, '#c8ccd4'); r(px0 + 15, ty + 14, 4, 9, '#d23a3a');
    r(px0 + 26, ty, 3, 18, '#c8ccd4'); r(px0 + 25, ty + 12, 5, 10, '#2a62b5');
    r(px0 + 36, ty + 4, 14, 4, '#9aa0ab'); r(px0 + 46, ty + 8, 4, 12, '#ffcc00');
    for (k = 0; k < 5; k++) r(px0 + 56 + k * 5, ty + 2 + k, 3, 16 - k * 2, '#c8ccd4');
    for (k = 0; k < 3; k++) { disc(x, px0 + 14 + k * 14, ty + 34, 5, '#2a2c33'); disc(x, px0 + 14 + k * 14, ty + 34, 2, '#6b5135'); }   // hose loops / pliers rack
    var cx0 = px0, cw = pw, cy0 = Math.round(fl * 0.58);
    r(cx0, cy0, cw, fl - cy0 + 4, '#9e1f1f'); r(cx0, cy0, cw, 3, '#c62f2f');
    for (i = cy0 + 6; i < fl; i += 8) { r(cx0 + 2, i, cw - 4, 1, '#7d1717'); r(cx0 + cw / 2 - 6, i + 3, 12, 2, '#d0d4dc'); }
    r(cx0 + 2, fl + 4, 4, 4, '#111'); r(cx0 + cw - 6, fl + 4, 4, 4, '#111');
    r(cx0 + 6, cy0 - 9, 20, 9, '#23252b'); disc(x, cx0 + 11, cy0 - 5, 3, '#555a64'); r(cx0 + 16, cy0 - 7, 8, 2, '#46e07a'); r(cx0 + 8, cy0 - 12, 1, 3, '#888');
    r(cx0 + cw - 14, cy0 - 7, 6, 7, '#e8e2d0'); r(cx0 + cw - 8, cy0 - 5, 2, 3, '#e8e2d0');
    // poster and clock
    var pX = Math.round(W * 0.245), pY = Math.round(fl * 0.26);
    r(pX, pY, Math.round(W * 0.045), Math.round(fl * 0.26), '#e8d9b0'); r(pX + 2, pY + 2, Math.round(W * 0.045) - 4, Math.round(fl * 0.12), '#d23a3a');
    r(pX + 4, pY + Math.round(fl * 0.1), Math.round(W * 0.045) - 8, 3, '#111'); r(pX + 4, pY + Math.round(fl * 0.16), Math.round(W * 0.045) - 8, 2, '#555');
    r(pX + 4, pY + Math.round(fl * 0.19), Math.round(W * 0.03), 2, '#555');
    var ckx = Math.round(W * 0.745), cky = Math.round(fl * 0.3);
    disc(x, ckx, cky, 9, '#111'); disc(x, ckx, cky, 7, '#efe9da'); r(ckx, cky - 5, 1, 5, '#111'); r(ckx, cky, 4, 1, '#d23a3a');
    // fire extinguisher
    var fx = Math.round(W * 0.74), fy = Math.round(fl * 0.6);
    r(fx, fy, 7, 18, '#c42a2a'); r(fx, fy, 2, 18, '#e65050'); r(fx + 1, fy - 3, 5, 3, '#222'); r(fx + 6, fy - 2, 4, 2, '#222'); r(fx - 2, fy - 8, 11, 2, '#888');
    // right: shelving with tires, boxes and oil cans
    var sx = Math.round(W * 0.79), sw = Math.round(W * 0.18), st = Math.round(fl * 0.12);
    r(sx, st, 3, fl - st, '#4b505b'); r(sx + sw - 3, st, 3, fl - st, '#4b505b');
    [0.3, 0.58, 0.86].forEach(function (f) { r(sx, Math.round(fl * f), sw, 3, '#5c6270'); });
    var tr = Math.round(fl * 0.1);
    for (k = 0; k < 3; k++) {
      var tx = sx + 6 + k * (tr * 2 + 2), tyy = Math.round(fl * 0.58) - tr;
      if (tx + tr * 2 > sx + sw) break;
      disc(x, tx + tr, tyy, tr, '#141416'); disc(x, tx + tr, tyy, tr * 0.55, '#5c6270'); disc(x, tx + tr, tyy, tr * 0.25, '#2a2b30');
    }
    [['#c99a00', 0.3, 0], ['#2a62b5', 0.3, 1], ['#b52a2a', 0.86, 0], ['#d8d8d8', 0.86, 1], ['#1e9e4a', 0.86, 2]].forEach(function (b) {
      var bw = Math.round(sw * 0.26), bh = Math.round(fl * 0.1), bx = sx + 6 + b[2] * (bw + 3), by = Math.round(fl * b[1]) - bh;
      r(bx, by, bw, bh, b[0]); r(bx, by, bw, 2, 'rgba(0,0,0,0.25)'); r(bx + 3, by + bh / 2, bw - 6, 2, 'rgba(255,255,255,0.35)');
    });
    for (k = 0; k < 4; k++) { var ox = sx + 6 + k * 9; if (ox + 7 > sx + sw) break; r(ox, Math.round(fl * 0.3) - 26, 7, 10, ['#1c3f9a', '#ffcc00', '#1c3f9a', '#d23a3a'][k]); r(ox + 2, Math.round(fl * 0.3) - 28, 3, 2, '#222'); }
    // neon shop sign
    if (garageBg.noSign) return floorAndLights();
    var sign = 'PIXEL DRAG', ss = 2, sgx = Math.round(W / 2 - DR.pixTextW(sign, ss) / 2), sgy = Math.round(fl * 0.1);
    r(sgx - 6, sgy - 5, DR.pixTextW(sign, ss) + 12, 20, 'rgba(0,0,0,0.35)');
    x.save(); x.shadowColor = '#ff2bd6'; x.shadowBlur = 10; DR.pixText(x, sign, sgx, sgy, '#ff7be8', ss); x.restore();
    DR.pixText(x, sign, sgx, sgy, '#ffd6f7', ss);
    floorAndLights();
    function floorAndLights() {
    var fg = x.createLinearGradient(0, fl, 0, H);
    fg.addColorStop(0, '#3f434c'); fg.addColorStop(1, '#202227');
    x.fillStyle = fg; x.fillRect(0, fl, W, H - fl);
    floorLines(x, W, H, fl, 'rgba(0,0,0,0.18)', 6, 30);
    r(0, fl, W, 1, '#62666f');
    r(0, fl + Math.round((H - fl) * 0.8), W, 2, '#ffcc00');
    // oil stain, drain, jack, cones, air hose
    x.save(); x.translate(W * 0.58, fl + (H - fl) * 0.62); x.scale(1, 0.25); disc(x, 0, 0, 26, 'rgba(10,8,6,0.35)'); disc(x, 10, 4, 12, 'rgba(10,8,6,0.3)'); x.restore();
    var dgx = Math.round(W * 0.45), dgy = Math.round(fl + (H - fl) * 0.88);
    r(dgx, dgy, 26, 5, '#191a1e'); for (k = 2; k < 26; k += 3) r(dgx + k, dgy + 1, 1, 3, '#4a4e57');
    var jx = Math.round(W * 0.18), jy = Math.round(fl + (H - fl) * 0.7);
    r(jx, jy, 30, 6, '#c42a2a'); r(jx, jy, 30, 2, '#e65050'); r(jx + 22, jy - 5, 8, 5, '#c42a2a'); r(jx + 24, jy - 7, 6, 2, '#888');
    disc(x, jx + 3, jy + 7, 2, '#111'); disc(x, jx + 26, jy + 7, 2, '#111');
    x.strokeStyle = '#999'; x.lineWidth = 2; x.beginPath(); x.moveTo(jx, jy + 2); x.lineTo(jx - 22, jy - 14); x.stroke(); r(jx - 26, jy - 17, 8, 3, '#222');
    [0.77, 0.81].forEach(function (f, n) {
      var cx = Math.round(W * f), cy = Math.round(fl + (H - fl) * (0.62 + n * 0.12));
      r(cx - 6, cy, 13, 2, '#222');
      for (k = 0; k < 12; k++) { var w = Math.max(1, Math.round((12 - k) * 0.45)); r(cx - w, cy - k, w * 2 + 1, 1, k === 5 || k === 6 ? '#f0f0f0' : '#ff6a00'); }
    });
    x.strokeStyle = '#d6b020'; x.lineWidth = 1.5;
    for (k = 0; k < 3; k++) { x.beginPath(); x.ellipse(W * 0.885, fl + (H - fl) * 0.45, 14 - k * 3, 5 - k, 0, 0, Math.PI * 2); x.stroke(); }
    // strip lights and their pools
    x.save(); x.globalCompositeOperation = 'lighter';
    [0.3, 0.7].forEach(function (f) { cone(x, Math.round(W * f), 22, 120, H, 0.13); });
    pool(x, W / 2, fl + (H - fl) * 0.45, W * 0.38, 'rgba(255,236,200,0.26)');
    x.restore();
    [0.3, 0.7].forEach(function (f) { var lx = Math.round(W * f); r(lx - 34, 18, 68, 5, '#2a2c33'); r(lx - 31, 21, 62, 2, '#fff6dc'); r(lx - 30, 12, 1, 6, '#222'); r(lx + 29, 12, 1, 6, '#222'); });
    }
  }

  // ---------------------------------------------------------------- showroom
  function showroomBg(x, W, H, fl) {
    var r = rects(x), i, k;
    r(0, 0, W, fl, '#c9ced8');
    // ceiling fascia with sign
    r(0, 0, W, Math.round(fl * 0.16), '#1d2230'); r(0, Math.round(fl * 0.16), W, 3, '#4da3ff');
    var sign = 'PIXEL MOTORS', ss = 2, sgx = Math.round(W / 2 - DR.pixTextW(sign, ss) / 2), sgy = Math.round(fl * 0.05);
    x.save(); x.shadowColor = '#4da3ff'; x.shadowBlur = 10; DR.pixText(x, sign, sgx, sgy, '#8fd0ff', ss); x.restore();
    DR.pixText(x, sign, sgx, sgy, '#e6f6ff', ss);
    // big windows: night city
    var wt = Math.round(fl * 0.2), wb = fl - 14;
    var sky = x.createLinearGradient(0, wt, 0, wb);
    sky.addColorStop(0, '#0a1330'); sky.addColorStop(1, '#3a3d6e');
    x.fillStyle = sky; x.fillRect(0, wt, W, wb - wt);
    var rnd = DR.rng(77);
    for (i = 0; i < 40; i++) r(rnd() * W, wt + rnd() * (wb - wt) * 0.4, 1, 1, 'rgba(255,255,255,0.6)');
    for (k = 0; k < W; k += 14 + Math.floor(rnd() * 20)) {
      var bw = 12 + Math.floor(rnd() * 22), bh = (wb - wt) * (0.25 + rnd() * 0.6);
      r(k, wb - bh, bw, bh, rnd() < 0.5 ? '#141a33' : '#1b2140');
      for (var yy = wb - bh + 4; yy < wb - 4; yy += 5) for (var xx = k + 3; xx < k + bw - 3; xx += 4) if (rnd() < 0.3) r(xx, yy, 2, 2, rnd() < 0.8 ? '#ffd27a' : '#9ad0ff');
    }
    r(0, wb - 6, W, 6, '#262a3a'); for (k = 0; k < W; k += 22) r(k, wb - 4, 10, 1, '#ffd27a');
    for (k = 0; k <= W; k += Math.round(W / 6)) { r(k - 3, wt, 6, wb - wt, '#8a909c'); r(k - 3, wt, 2, wb - wt, '#b5bac4'); }
    r(0, wt, W, 4, '#8a909c'); r(0, wb, W, 14, '#8a909c'); r(0, wb, W, 2, '#b5bac4');
    // plants
    [0.06, 0.94].forEach(function (f) {
      var px = Math.round(W * f), py = fl;
      r(px - 9, py - 18, 18, 18, '#3a3f4a'); r(px - 9, py - 18, 18, 2, '#565c69');
      for (k = 0; k < 9; k++) { x.fillStyle = k % 2 ? '#2e7d4f' : '#3fa463'; x.beginPath(); x.ellipse(px + (k - 4) * 3, py - 26 - Math.abs(k - 4) * -2 - (k % 3) * 5, 3, 9, (k - 4) * 0.25, 0, Math.PI * 2); x.fill(); }
    });
    // floor: glossy tiles
    var fg = x.createLinearGradient(0, fl, 0, H);
    fg.addColorStop(0, '#d9dce3'); fg.addColorStop(1, '#8d929c');
    x.fillStyle = fg; x.fillRect(0, fl, W, H - fl);
    floorLines(x, W, H, fl, 'rgba(60,64,74,0.25)', 5, 40);
    // turntable
    x.save(); x.translate(W / 2, fl + (H - fl) * 0.38); x.scale(1, 0.16);
    disc(x, 0, 0, W * 0.3, '#2a2e38'); disc(x, 0, 0, W * 0.29, '#3a3f4a');
    x.strokeStyle = 'rgba(77,163,255,0.9)'; x.lineWidth = 6; x.beginPath(); x.arc(0, 0, W * 0.295, 0, Math.PI * 2); x.stroke();
    x.restore();
    // spotlights
    x.save(); x.globalCompositeOperation = 'lighter';
    [0.3, 0.5, 0.7].forEach(function (f) { cone(x, Math.round(W * f), Math.round(fl * 0.16), 90, H, 0.1); });
    x.restore();
    [0.3, 0.5, 0.7].forEach(function (f) { var lx = Math.round(W * f); r(lx - 6, Math.round(fl * 0.16), 12, 6, '#111'); r(lx - 4, Math.round(fl * 0.16) + 6, 8, 2, '#fff6dc'); });
  }

  // ---------------------------------------------------------------- dyno cell
  function dynoBg(x, W, H, fl) {
    var r = rects(x), i, k;
    var g = x.createLinearGradient(0, 0, 0, fl);
    g.addColorStop(0, '#1a1c21'); g.addColorStop(1, '#30333b');
    x.fillStyle = g; x.fillRect(0, 0, W, fl);
    for (k = 0; k < W; k += 64) { r(k, 0, 1, fl, 'rgba(0,0,0,0.35)'); for (i = 10; i < fl - 20; i += 40) { r(k + 4, i, 2, 2, '#555a64'); r(k + 58, i, 2, 2, '#555a64'); } }
    for (k = -20; k < W; k += 16) { x.fillStyle = '#ffcc00'; x.beginPath(); x.moveTo(k, fl); x.lineTo(k + 8, fl); x.lineTo(k + 16, fl - 12); x.lineTo(k + 8, fl - 12); x.fill(); }
    r(0, fl - 12, W, 1, '#111');
    DR.pixText(x, 'DYNO CELL 1', Math.round(W * 0.63), 14, '#ffcc00', 2);
    // exhaust extraction hose from the ceiling
    var hx = Math.round(W * 0.16);
    for (i = 0; i < fl * 0.55; i += 4) { r(hx - 7, i, 14, 3, '#5c626e'); r(hx - 7, i + 3, 14, 1, '#2a2d34'); }
    r(hx - 9, Math.round(fl * 0.55), 18, 10, '#3a3f4a'); r(hx - 9, Math.round(fl * 0.55), 18, 2, '#565c69');
    // monitor with a graph
    var mx = Math.round(W * 0.38), my = Math.round(fl * 0.14), mw = Math.round(W * 0.22), mh = Math.round(fl * 0.3);
    r(mx - 3, my - 3, mw + 6, mh + 6, '#0b0c0f'); r(mx, my, mw, mh, '#06140c');
    x.strokeStyle = '#46e07a'; x.lineWidth = 1; x.beginPath();
    for (k = 0; k <= mw - 8; k += 2) { var t = k / (mw - 8); x.lineTo(mx + 4 + k, my + mh - 6 - (mh - 14) * Math.sin(t * 2.4) * (0.4 + t * 0.6)); } x.stroke();
    x.strokeStyle = '#4da3ff'; x.beginPath();
    for (k = 0; k <= mw - 8; k += 2) { var t2 = k / (mw - 8); x.lineTo(mx + 4 + k, my + mh - 6 - (mh - 14) * (0.55 + 0.25 * Math.sin(t2 * 3))); } x.stroke();
    r(mx + mw / 2 - 2, my + mh + 3, 4, 10, '#222');
    // big cooling fan in front of the car
    var fx = Math.round(W * 0.88), fy = Math.round(fl * 0.7), fr = Math.round(fl * 0.2);
    r(fx - fr - 4, fy - fr - 4, fr * 2 + 8, fr * 2 + 8, '#2a2d34'); disc(x, fx, fy, fr, '#111');
    x.fillStyle = '#6c717d'; for (k = 0; k < 5; k++) { x.beginPath(); x.ellipse(fx + Math.cos(k * 1.257) * fr * 0.5, fy + Math.sin(k * 1.257) * fr * 0.5, fr * 0.45, fr * 0.16, k * 1.257, 0, Math.PI * 2); x.fill(); }
    disc(x, fx, fy, 4, '#c8ccd4');
    x.strokeStyle = '#3a3f4a'; x.lineWidth = 1; for (k = 2; k < fr; k += 4) { x.beginPath(); x.arc(fx, fy, k, 0, Math.PI * 2); x.stroke(); }
    r(fx - 3, fy + fr + 4, 6, fl - fy - fr, '#2a2d34'); r(fx - 14, fl - 2, 28, 4, '#2a2d34');
    // steel floor plate
    var fg = x.createLinearGradient(0, fl, 0, H);
    fg.addColorStop(0, '#50555f'); fg.addColorStop(1, '#2a2d33');
    x.fillStyle = fg; x.fillRect(0, fl, W, H - fl);
    x.fillStyle = 'rgba(255,255,255,0.08)';
    for (i = fl + 3; i < H; i += 6) for (k = (i % 12 ? 0 : 4); k < W; k += 8) x.fillRect(k, i, 3, 1);
    r(0, fl, W, 1, '#6c717d');
    x.save(); x.globalCompositeOperation = 'lighter';
    cone(x, Math.round(W * 0.5), 0, 150, H, 0.1);
    pool(x, W / 2, fl + (H - fl) * 0.4, W * 0.35, 'rgba(255,236,200,0.2)');
    x.restore();
    r(Math.round(W * 0.5) - 40, 0, 80, 4, '#2a2c33'); r(Math.round(W * 0.5) - 37, 3, 74, 2, '#fff6dc');
  }


  // ---------------------------------------------------------------- dealer lot (day)
  function cloud(x, cx, cy, w) {
    var r = rects(x), k;
    var blobs = [[0, 0, 0.32], [0.28, -0.18, 0.3], [0.55, -0.05, 0.26], [-0.3, 0.06, 0.22], [0.8, 0.08, 0.18]];
    blobs.forEach(function (b) { disc(x, cx + b[0] * w, cy + b[1] * w, b[2] * w, '#ffffff'); });
    r(cx - 0.5 * w, cy + 0.08 * w, 1.45 * w, 0.18 * w, '#ffffff');
    x.fillStyle = '#d6ebff'; x.fillRect(cx - 0.5 * w, cy + 0.2 * w, 1.45 * w, 0.06 * w);
    for (k = 0; k < 3; k++) disc(x, cx + (k * 0.4 - 0.1) * w, cy + 0.1 * w, 0.12 * w, '#eef7ff');
  }
  function lotBg(x, W, H, fl) {
    var r = rects(x), i, k, rnd = DR.rng(31);
    var sky = x.createLinearGradient(0, 0, 0, fl);
    sky.addColorStop(0, '#3f9cf2'); sky.addColorStop(1, '#a9dcff');
    x.fillStyle = sky; x.fillRect(0, 0, W, fl);
    [[0.08, 0.1, 0.09], [0.52, 0.06, 0.07], [0.78, 0.14, 0.1], [0.36, 0.2, 0.05], [0.95, 0.04, 0.06]].forEach(function (c) { cloud(x, W * c[0], fl * c[1], W * c[2]); });
    // distant skyline
    for (k = -10; k < W; k += 10 + Math.floor(rnd() * 16)) {
      var bw = 14 + Math.floor(rnd() * 22), bh = fl * (0.3 + rnd() * 0.45), col = rnd() < 0.5 ? '#9fb2c9' : '#b4c3d6';
      r(k, fl - bh, bw, bh, col); r(k, fl - bh, 2, bh, 'rgba(255,255,255,0.25)');
      for (var yy = fl - bh + 4; yy < fl - 6; yy += 5) for (var xx = k + 3; xx < k + bw - 3; xx += 4) r(xx, yy, 2, 2, 'rgba(70,90,120,0.35)');
      if (rnd() < 0.3) r(k + bw / 2 - 1, fl - bh - 6, 2, 6, '#8496ae');
    }
    // smokestack
    var sx = Math.round(W * 0.13), st = Math.round(fl * 0.08);
    r(sx, st, 12, fl - st, '#e8e8e8'); r(sx, st, 3, fl - st, '#ffffff'); r(sx + 9, st, 3, fl - st, '#c8c8c8');
    [0, 0.12].forEach(function (f) { r(sx - 1, st + fl * f, 14, 6, '#d63a3a'); });
    // chain-link fence
    var ft = Math.round(fl * 0.55);
    x.fillStyle = 'rgba(120,128,140,0.55)';
    for (i = ft; i < fl; i += 3) for (k = (i % 6 ? 0 : 1.5); k < W; k += 3) x.fillRect(Math.round(k), i, 1, 1);
    r(0, ft - 2, W, 2, '#7a808c');
    for (k = 6; k < W; k += 48) r(k, ft - 4, 3, fl - ft + 4, '#6c717d');
    // utility poles and sagging wires
    [0.04, 0.66].forEach(function (f) { var px = Math.round(W * f); r(px, fl * 0.12, 5, fl * 0.88, '#6b4a2b'); r(px - 14, fl * 0.16, 33, 3, '#5a3d22'); r(px - 12, fl * 0.14, 3, 3, '#c8ccd4'); r(px + 14, fl * 0.14, 3, 3, '#c8ccd4'); });
    x.strokeStyle = 'rgba(20,20,24,0.8)'; x.lineWidth = 1;
    [-12, 15, 2].forEach(function (o, n) { x.beginPath(); x.moveTo(0, fl * (0.2 + n * 0.02)); x.quadraticCurveTo(W * 0.35, fl * (0.3 + n * 0.03), W * 0.66 + o, fl * 0.15); x.quadraticCurveTo(W * 0.85, fl * (0.26 + n * 0.02), W, fl * (0.2 + n * 0.03)); x.stroke(); });
    // dealership building
    var bx = Math.round(W * 0.2), bw2 = Math.round(W * 0.4), by = Math.round(fl * 0.16);
    r(bx + bw2 * 0.6, by - 8, bw2 * 0.22, 8, '#8a909c'); for (k = 0; k < 4; k++) r(bx + bw2 * 0.62 + k * 7, by - 7, 4, 3, '#5c626e');
    r(bx, by, bw2, fl - by, '#d4d4d0'); r(bx, by, bw2, 3, '#ecece8');
    for (k = bx; k < bx + bw2; k += Math.round(bw2 / 6)) r(k, by, 1, fl * 0.12, '#b0b0aa');
    x.fillStyle = 'rgba(0,0,0,0.05)'; for (i = 0; i < 140; i++) x.fillRect(bx + rnd() * bw2, by + rnd() * (fl - by), 1, 1);
    var gx0 = bx + 6, gy0 = by + Math.round(fl * 0.12), gw = bw2 - 12, gh = fl - gy0 - 6;
    var gg = x.createLinearGradient(0, gy0, 0, gy0 + gh); gg.addColorStop(0, '#1d4256'); gg.addColorStop(1, '#13293a');
    x.fillStyle = gg; x.fillRect(gx0, gy0, gw, gh);
    for (k = 0; k <= 6; k++) r(gx0 + k * gw / 6 - 1, gy0, 2, gh, '#2a2d33');
    r(gx0, gy0 + gh / 2 - 1, gw, 2, '#2a2d33');
    x.fillStyle = 'rgba(255,255,255,0.08)'; for (k = 0; k < 6; k++) { x.beginPath(); x.moveTo(gx0 + k * gw / 6 + 4, gy0 + gh); x.lineTo(gx0 + k * gw / 6 + 12, gy0 + gh); x.lineTo(gx0 + k * gw / 6 + 26, gy0); x.lineTo(gx0 + k * gw / 6 + 18, gy0); x.fill(); }
    // entrance with sign
    var ex = Math.round(bx + bw2 * 0.5 - 30), ew = 60, ey = gy0 + gh * 0.32;
    r(ex - 6, ey - 12, ew + 12, 12, '#ffffff'); r(ex - 6, ey - 12, ew + 12, 2, '#d63a3a'); r(ex - 6, ey - 2, ew + 12, 2, '#d63a3a');
    DR.pixText(x, 'PIXEL MOTORS', ex + ew / 2 - DR.pixTextW('PIXEL MOTORS', 1) / 2, ey - 9, '#222', 1);
    r(ex - 4, ey, 4, fl - ey, '#d4d4d0'); r(ex + ew, ey, 4, fl - ey, '#d4d4d0');
    r(ex, ey, ew, fl - ey, '#163444'); r(ex + ew / 2, ey, 1, fl - ey, '#2a2d33'); r(ex + ew / 2 - 4, ey + (fl - ey) * 0.35, 1, 8, '#c8ccd4'); r(ex + ew / 2 + 3, ey + (fl - ey) * 0.35, 1, 8, '#c8ccd4');
    // auto care bay
    var ax = bx + bw2 + 2, aw = Math.round(W * 0.15), ay = Math.round(fl * 0.4);
    r(ax, ay, aw, fl - ay, '#c4c4c0'); r(ax, ay, aw, 2, '#e0e0dc');
    r(ax, ay + 6, aw, 10, '#c42a2a'); DR.pixText(x, 'AUTO CARE', ax + aw - DR.pixTextW('AUTO CARE', 1) - 4, ay + 9, '#ffffff', 1);
    r(ax + 6, ay + 20, aw - 12, fl - ay - 20, '#0d0e12');
    for (i = ay + 20; i < ay + 26; i += 2) r(ax + 6, i, aw - 12, 1, '#9aa0ab');
    r(ax + 10, fl - 14, aw - 20, 3, '#ffcc00'); r(ax + 14, fl - 30, 3, 16, '#3a3f4a'); r(ax + aw - 17, fl - 30, 3, 16, '#3a3f4a');
    r(ax + aw * 0.3, fl - 10, aw * 0.4, 4, '#555a64'); disc(x, ax + aw * 0.36, fl - 4, 2, '#222'); disc(x, ax + aw * 0.64, fl - 4, 2, '#222');
    // vending machines
    var vx = ax + aw + 6;
    [['#3fa463', '#e0f0e0'], ['#e8e8e8', '#c42a2a']].forEach(function (v, n) {
      var mx = vx + n * 20, my = fl - 34;
      r(mx, my, 18, 34, v[0]); r(mx, my, 18, 2, '#ffffff');
      r(mx + 2, my + 3, 14, 15, '#20242c');
      for (var rr = 0; rr < 3; rr++) for (var cc = 0; cc < 5; cc++) r(mx + 3 + cc * 3, my + 4 + rr * 5, 2, 3, ['#d63a3a', '#ffcc00', '#4da3ff', '#46e07a', '#ff7be8'][(cc + rr + n) % 5]);
      r(mx + 3, my + 21, 12, 3, v[1]); r(mx + 5, my + 27, 8, 4, '#111');
    });
    // lot surface
    var fg = x.createLinearGradient(0, fl, 0, H);
    fg.addColorStop(0, '#47494f'); fg.addColorStop(1, '#2e3035');
    x.fillStyle = fg; x.fillRect(0, fl, W, H - fl);
    r(0, fl, W, 4, '#8a8d94'); r(0, fl + 4, W, 1, '#2a2c30');
    x.fillStyle = 'rgba(255,255,255,0.04)'; for (i = 0; i < 500; i++) x.fillRect(rnd() * W, fl + 5 + rnd() * (H - fl), 1, 1);
    // bollards
    for (k = 0; k < 3; k++) { var bxx = vx - 4 + k * 16; r(bxx, fl - 16, 4, 22, '#ffcc00'); r(bxx, fl - 16, 1, 22, '#fff2a0'); r(bxx - 1, fl - 17, 6, 2, '#e0a800'); }
    // grass strip at the very bottom
    r(0, H - Math.round(H * 0.05), W, Math.round(H * 0.05), '#2f6b2a');
    for (k = 0; k < W; k += 2) r(k, H - Math.round(H * 0.05) - (k * 7 % 3), 1, 3, '#3f8a38');
    x.save(); x.globalCompositeOperation = 'lighter'; pool(x, W / 2, fl + (H - fl) * 0.42, W * 0.3, 'rgba(255,255,255,0.06)'); x.restore();
  }

  var THEMES = { garage: { bg: garageBg, fl: 0.64, car: 0.36, refl: 0.18 }, showroom: { bg: showroomBg, fl: 0.62, car: 0.38, refl: 0.3 }, dyno: { bg: dynoBg, fl: 0.66, car: 0.3, refl: 0 }, lot: { bg: lotBg, fl: 0.6, car: 0.42, refl: 0, vig: 0.15 } };

  DR.drawRoom = function (canvas, inst, opts) {
    opts = opts || {};
    var th = THEMES[opts.theme || 'garage'];
    var spr = opts.spr || DR.carSprite(DR.carLook(inst));
    var W = Math.max(420, Math.round(spr.lenPx * (opts.zoom || 2.3))), H = Math.round(W / Math.max(1.5, Math.min(2.6, opts.aspect || 2.1)));
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    var x = canvas.getContext('2d'); x.imageSmoothingEnabled = false;
    var fl = Math.round(H * th.fl), key = (opts.theme || 'garage') + (opts.sign === false ? 'ns' : '') + W + 'x' + H;
    if (!BG[key]) {
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var cx = c.getContext('2d'); cx.imageSmoothingEnabled = false;
      garageBg.noSign = opts.sign === false;
      th.bg(cx, W, H, fl);
      garageBg.noSign = false;
      BG[key] = c;
    }
    x.drawImage(BG[key], 0, 0);
    var gy = fl + Math.round((H - fl) * th.car), gx = Math.round(W / 2 - spr.lenPx / 2 + (spr.wheelR.x - spr.padL));
    var wb = spr.wheelF.x - spr.wheelR.x, wr = spr.wheelR.r, spin = opts.spin || 0.3;
    if (opts.theme === 'dyno') {
      // roller pits under both axles; the drive axle's rollers turn
      var S = opts.S, fwd = S && S.drive === 'FWD', awd = S && S.drive === 'AWD';
      [[gx, !fwd || awd], [gx + wb, fwd || awd]].forEach(function (a) {
        var px = Math.round(a[0]);
        x.fillStyle = '#0b0c0f'; x.fillRect(px - wr - 6, gy - 1, wr * 2 + 12, 6);
        x.fillStyle = '#ffcc00'; x.fillRect(px - wr - 8, gy - 1, 2, 6); x.fillRect(px + wr + 6, gy - 1, 2, 6);
        [-1, 1].forEach(function (s) {
          var rx = px + s * wr * 0.55, ry = gy + 3;
          x.fillStyle = '#7a808c'; x.beginPath(); x.arc(rx, ry, wr * 0.42, Math.PI, 0); x.fill();
          if (a[1]) { x.fillStyle = '#c8ccd4'; for (var q = 0; q < 4; q++) { var an = Math.PI + ((spin * 1.8 + q * Math.PI / 4) % Math.PI); x.fillRect(Math.round(rx + Math.cos(an) * wr * 0.32), Math.round(ry + Math.sin(an) * wr * 0.32), 2, 2); } }
        });
      });
      // tie-down straps
      x.strokeStyle = '#ffcc00'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(gx - wr * 1.3, gy - wr * 1.1); x.lineTo(gx - wr * 2.4, gy + 3); x.stroke();
      x.beginPath(); x.moveTo(gx + wb + wr * 1.3, gy - wr * 1.1); x.lineTo(gx + wb + wr * 2.4, gy + 3); x.stroke();
    }
    if (th.refl) {
      x.save(); x.globalAlpha = th.refl; x.translate(0, gy * 2); x.scale(1, -1);
      DR.drawCar(x, spr, gx, gy, 0, spin, { shadow: false });
      x.restore();
    }
    // other cars on the lot, cut off at the edges (dealer)
    (opts.side || []).forEach(function (o, n) {
      if (!o) return;
      var sp2 = DR.carSprite(DR.carLook(o)), sgx = n === 0 ? Math.round(-sp2.lenPx * 0.72 + (sp2.wheelR.x - sp2.padL)) : Math.round(W - sp2.lenPx * 0.28 + (sp2.wheelR.x - sp2.padL));
      DR.drawCar(x, sp2, sgx, gy, 0, 0.3);
      var tx = n === 0 ? sgx + sp2.lenPx * 0.48 : sgx + sp2.lenPx * 0.02, ty = gy - sp2.wheelR.r * 3.4;
      x.save(); x.translate(tx, ty); x.rotate(-0.25); x.fillStyle = '#d63a3a'; x.fillRect(-11, -5, 22, 10); x.fillStyle = '#fff'; x.fillRect(-11, -5, 22, 1); DR.pixText(x, 'SALE', -7, -2, '#ffffff', 1); x.restore();
    });
    DR.drawCar(x, spr, gx, gy, 0, spin);
    if (opts.theme === 'dyno' && opts.running) {
      // exhaust haze off the tail
      x.save(); x.globalAlpha = 0.25 + 0.1 * Math.sin(spin * 7);
      for (var p = 0; p < 6; p++) disc(x, gx - wr * 2 - p * 9, gy - wr * 0.6 - p * 3, 4 + p * 2, '#c8ccd4');
      x.restore();
    }
    vignette(x, W, H, th.vig != null ? th.vig : opts.theme === 'showroom' ? 0.35 : 0.55);
    return { gx: gx, gy: gy, spr: spr, W: W, H: H };
  };
  // Draws now, then again at the element's real aspect once it is on screen.
  DR.roomCanvas = function (inst, opts, cls) {
    var cv = document.createElement('canvas'); cv.className = cls || 'bay';
    DR.drawRoom(cv, inst, opts);
    setTimeout(function () {
      var r = cv.getBoundingClientRect();
      if (r.width && r.height) { opts = Object.assign({}, opts, { aspect: r.width / r.height }); DR.drawRoom(cv, inst, opts); cv._opts = opts; }
    }, 0);
    cv._opts = opts;
    return cv;
  };
})();
