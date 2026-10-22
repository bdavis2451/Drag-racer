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
  // A clean modern home garage: grey slatwall, a storage rack, a side door,
  // bikes on the wall, a TV, a neon sign, white cabinets with a tool rail,
  // a rolling tool chest and a polished epoxy floor that mirrors the car.
  function bike(x, cx, cy, col) {
    x.strokeStyle = '#1a1b1f'; x.lineWidth = 2;
    [[cx - 13, cy], [cx + 13, cy]].forEach(function (w) { x.beginPath(); x.arc(w[0], w[1], 9, 0, Math.PI * 2); x.stroke(); });
    x.strokeStyle = '#6a6e78'; x.lineWidth = 1;
    [[cx - 13, cy], [cx + 13, cy]].forEach(function (w) { for (var k = 0; k < 6; k++) { var a = k * Math.PI / 3; x.beginPath(); x.moveTo(w[0], w[1]); x.lineTo(w[0] + Math.cos(a) * 8, w[1] + Math.sin(a) * 8); x.stroke(); } });
    x.strokeStyle = col; x.lineWidth = 2;
    x.beginPath(); x.moveTo(cx - 13, cy); x.lineTo(cx - 2, cy - 1); x.lineTo(cx + 6, cy - 11); x.lineTo(cx - 6, cy - 11); x.lineTo(cx - 2, cy - 1); x.moveTo(cx - 6, cy - 11); x.lineTo(cx - 13, cy); x.moveTo(cx + 6, cy - 11); x.lineTo(cx + 13, cy); x.stroke();
    x.fillStyle = '#1a1b1f'; x.fillRect(cx - 9, cy - 14, 6, 2); x.fillRect(cx + 4, cy - 15, 5, 2);
  }
  function garageBg(x, W, H, fl) {
    var r = rects(x), i, k, rnd = DR.rng(5);
    // ceiling
    var cg = x.createLinearGradient(0, 0, 0, fl * 0.18);
    cg.addColorStop(0, '#9fa2a8'); cg.addColorStop(1, '#c4c6cb');
    x.fillStyle = cg; x.fillRect(0, 0, W, fl * 0.18);
    // slatwall
    var wt = Math.round(fl * 0.18);
    r(0, wt, W, fl - wt, '#c9cacd');
    for (i = wt; i < fl; i += 6) { r(0, i, W, 1, '#aeb0b4'); r(0, i + 1, W, 1, '#d6d7da'); }
    r(0, wt, W, 3, '#8e9096');
    // right side wall in perspective
    var sw0 = Math.round(W * 0.86);
    x.fillStyle = '#b4b6ba'; x.beginPath(); x.moveTo(sw0, wt); x.lineTo(W, wt - fl * 0.12); x.lineTo(W, fl + (H - fl) * 0.3); x.lineTo(sw0, fl); x.fill();
    // storage rack on the left (perspective uprights)
    var rx = Math.round(W * 0.02), rw = Math.round(W * 0.15);
    r(rx, wt - 6, 3, fl - wt + 10, '#5e5a70'); r(rx + rw, wt + 6, 3, fl - wt - 2, '#5e5a70');
    [0.12, 0.34, 0.56, 0.78].forEach(function (f, n) {
      var sy = Math.round(wt + (fl - wt) * f);
      r(rx, sy, rw + 3, 3, '#3a3747');
      for (k = 0; k < 9; k++) {
        if (n === 3 && k > 4) break;
        var bh = 6 + Math.floor(rnd() * 8), bx = rx + 4 + k * Math.floor(rw / 9);
        r(bx, sy - bh, Math.floor(rw / 9) - 2, bh, ['#d23a3a', '#2a62b5', '#e8e8e8', '#ffcc00', '#2e7d4f', '#b06bff', '#8a5a2b'][Math.floor(rnd() * 7)]);
        r(bx + 1, sy - bh, 1, bh, 'rgba(255,255,255,0.35)');
      }
    });
    // fire extinguisher and jack stands
    r(rx + rw + 6, fl - 26, 7, 20, '#c42a2a'); r(rx + rw + 6, fl - 26, 2, 20, '#e65050'); r(rx + rw + 7, fl - 29, 5, 3, '#222');
    [0.22, 0.25].forEach(function (f) { var jx = Math.round(W * f); r(jx, fl - 16, 2, 14, '#2a2c33'); x.fillStyle = '#2a2c33'; x.beginPath(); x.moveTo(jx - 6, fl); x.lineTo(jx + 8, fl); x.lineTo(jx + 1, fl - 8); x.fill(); r(jx - 2, fl - 17, 6, 2, '#e0e0e0'); });
    // side door with a step
    var dx = Math.round(W * 0.27), dw = Math.round(W * 0.07), dt = Math.round(wt + (fl - wt) * 0.18);
    r(dx - 3, dt - 3, dw + 6, fl - dt - 12, '#9a9ca2'); r(dx, dt, dw, fl - dt - 15, '#8a8d93'); r(dx + 2, dt + 2, dw - 4, fl - dt - 19, '#95989e');
    r(dx + dw - 6, dt + (fl - dt) * 0.45, 2, 6, '#2a2c33');
    r(dx - 10, fl - 12, dw + 28, 12, '#d8d9dc'); r(dx - 10, fl - 12, dw + 28, 2, '#ebecee');
    // bikes on wall hooks
    bike(x, Math.round(W * 0.42), Math.round(wt + (fl - wt) * 0.3), '#6b7d5e');
    bike(x, Math.round(W * 0.42), Math.round(wt + (fl - wt) * 0.6), '#7a7090');
    // wall TV
    var tx = Math.round(W * 0.5), tw = Math.round(W * 0.1), ty = Math.round(wt + (fl - wt) * 0.24);
    r(tx - 2, ty - 2, tw + 4, Math.round(tw * 0.56) + 4, '#2a2c33'); r(tx, ty, tw, Math.round(tw * 0.56), '#0b0c10');
    x.fillStyle = 'rgba(255,255,255,0.06)'; x.beginPath(); x.moveTo(tx + tw * 0.5, ty); x.lineTo(tx + tw, ty); x.lineTo(tx + tw, ty + tw * 0.3); x.fill();
    // neon sign
    if (!garageBg.noSign) {
      var sign = 'PIXEL', sgx = Math.round(W * 0.66 - DR.pixTextW(sign, 2) / 2), sgy = Math.round(wt + (fl - wt) * 0.1);
      x.save(); x.shadowColor = '#3df0c8'; x.shadowBlur = 8; DR.pixText(x, sign, sgx, sgy, '#7ffbe0', 2); x.restore();
      DR.pixText(x, sign, sgx, sgy, '#d8fff5', 2); r(sgx - 8, sgy + 4, 5, 2, '#2a2c33');
    }
    // cabinets: uppers, tool rail, lowers with a counter
    var cx0 = Math.round(W * 0.58), cw = Math.round(W * 0.27), ut = Math.round(wt + (fl - wt) * 0.04), ub = Math.round(wt + (fl - wt) * 0.36);
    r(cx0, ut, cw, ub - ut, '#e6e7ea'); for (k = 0; k <= 4; k++) r(cx0 + k * cw / 4, ut, 1, ub - ut, '#b9bbc0');
    for (k = 0; k < 4; k++) r(cx0 + k * cw / 4 + cw / 8 - 1, ub - 8, 2, 4, '#9a9ca2');
    r(cx0, ub, cw, 2, '#9a9ca2'); r(cx0 + 2, ub + 2, cw - 4, 1, '#ffffff');
    var tr = ub + 6;
    r(cx0 + 4, tr, cw - 8, 2, '#8a8d93');
    for (k = 0; k < cw - 14; k += 4) { var tlen = 6 + (k * 7 % 9); r(cx0 + 8 + k, tr + 2, 2, tlen, k % 12 === 0 ? '#8a8d93' : '#c8ccd4'); }
    r(cx0 + cw * 0.18, tr + 18, 14, 6, '#c42a2a'); r(cx0 + cw * 0.62, tr + 16, 12, 8, '#f0f0f0'); r(cx0 + cw * 0.62 + 2, tr + 18, 8, 4, '#d23a3a');
    var lt = Math.round(wt + (fl - wt) * 0.62);
    r(cx0 - 2, lt, cw + 4, 3, '#f4f4f6'); r(cx0, lt + 3, cw, fl - lt - 3, '#e2e3e6');
    for (k = 0; k <= 5; k++) r(cx0 + k * cw / 5, lt + 3, 1, fl - lt - 3, '#b9bbc0');
    for (k = 0; k < 5; k++) r(cx0 + k * cw / 5 + cw / 10 - 3, lt + 8, 6, 1, '#9a9ca2');
    // rolling tool chest
    var tcx = Math.round(W * 0.76), tcw = Math.round(W * 0.06), tct = Math.round(wt + (fl - wt) * 0.58);
    r(tcx, tct, tcw, fl - tct - 4, '#d8d9dc'); r(tcx + 2, tct + 3, tcw - 8, fl - tct - 10, '#141519');
    for (i = tct + 6; i < fl - 8; i += 5) r(tcx + 3, i, tcw - 10, 1, '#55585f');
    r(tcx + tcw - 5, tct + 3, 3, fl - tct - 10, '#b0b2b6');
    r(tcx + 1, fl - 4, 3, 3, '#222'); r(tcx + tcw - 4, fl - 4, 3, 3, '#222');
    // epoxy floor
    var fg = x.createLinearGradient(0, fl, 0, H);
    fg.addColorStop(0, '#77797e'); fg.addColorStop(1, '#4a4c51');
    x.fillStyle = fg; x.fillRect(0, fl, W, H - fl);
    r(0, fl, W, 2, '#5c5e63');
    // the wall reflected in the floor
    x.save(); x.globalAlpha = 0.16; x.translate(0, fl * 2 + 2); x.scale(1, -1);
    x.drawImage(x.canvas, 0, wt, W, fl - wt, 0, wt, W, fl - wt);
    x.restore();
    x.fillStyle = 'rgba(255,255,255,0.05)';
    for (k = 0; k < 4; k++) { x.beginPath(); x.moveTo(W * (0.1 + k * 0.25), fl); x.lineTo(W * (0.16 + k * 0.25), fl); x.lineTo(W * (0.1 + k * 0.25), H); x.lineTo(W * (0.02 + k * 0.25), H); x.fill(); }
    // soft overhead light
    x.save(); x.globalCompositeOperation = 'lighter';
    pool(x, W / 2, fl + (H - fl) * 0.45, W * 0.38, 'rgba(255,255,255,0.12)');
    x.restore();
    r(Math.round(W * 0.3), 4, Math.round(W * 0.4), 3, '#f4f6fa');
  }

  // ---------------------------------------------------------------- parts store
  // The parts shop interior: pegboard and counter with a clerk, a glass door,
  // slatwall shelving full of parts, wheels and tires, and a checker floor.
  DR.drawStore = function (canvas) {
    var W = canvas.width, H = canvas.height, x = canvas.getContext('2d'), r = rects(x), i, k;
    x.imageSmoothingEnabled = false;
    var fl = Math.round(H * 0.78), wt = Math.round(H * 0.24);
    // ceiling with strip lights in perspective
    r(0, 0, W, wt, '#b9bbbf');
    x.strokeStyle = '#ffffff'; x.lineWidth = 2;
    for (k = -4; k <= 4; k++) { x.beginPath(); x.moveTo(W / 2 + k * W * 0.08, wt - 4); x.lineTo(W / 2 + k * W * 0.2, 0); x.stroke(); }
    // slatwall
    r(0, wt, W, fl - wt, '#c4c5c8');
    for (i = wt; i < fl; i += 5) r(0, i, W, 1, '#a9abaf');
    // pegboard + counter + clerk
    var px = Math.round(W * 0.05), pw = Math.round(W * 0.24);
    r(px, wt + 4, pw, fl - wt - 30, '#e8e8e6'); x.fillStyle = '#9a9a98'; for (i = wt + 8; i < fl - 28; i += 4) for (k = px + 3; k < px + pw; k += 4) x.fillRect(k, i, 1, 1);
    r(px + 12, wt + 10, 14, 10, '#2a3a8a'); r(px + 14, wt + 12, 10, 6, '#4d6ad6');
    r(px + 40, wt + 10, 10, 12, '#c8ccd4'); r(px + 42, wt + 14, 6, 6, '#4da3ff');
    r(px + 58, wt + 14, 14, 3, '#8a5cff'); disc(x, px + 74, wt + 15, 3, '#8a5cff');
    r(px + 4, wt + 30, 26, 18, '#5a3a9a'); r(px + 4, wt + 38, 26, 10, '#ffcc00');
    // clerk
    var kx = Math.round(px + pw * 0.62), ky = fl - 46;
    r(kx, ky, 8, 8, '#e0b090'); r(kx, ky - 2, 8, 3, '#3a2a1a'); r(kx + 6, ky + 3, 1, 1, '#222');
    r(kx - 2, ky + 8, 12, 14, '#1a1b1f'); r(kx + 2, ky + 10, 4, 2, '#e8e8e8');
    // counter
    r(px - 6, fl - 26, pw + 12, 26, '#1d1e22'); r(px - 6, fl - 26, pw + 12, 3, '#3a3c42');
    r(px + 30, fl - 40, 22, 14, '#111'); r(px + 32, fl - 38, 18, 10, '#2a3546'); r(px + 39, fl - 26, 4, 0, '#111');
    // glass door with a green view
    var gx = Math.round(W * 0.34), gw = Math.round(W * 0.16);
    r(gx - 3, wt + 14, gw + 6, fl - wt - 14, '#1a1b1f');
    var gg = x.createLinearGradient(0, wt + 16, 0, fl); gg.addColorStop(0, '#5ab0ff'); gg.addColorStop(0.45, '#9ad0ff'); gg.addColorStop(0.46, '#3f8a38'); gg.addColorStop(0.55, '#2f6b2a'); gg.addColorStop(0.56, '#3a4a50'); gg.addColorStop(1, '#2a3238');
    x.fillStyle = gg; x.fillRect(gx, wt + 16, gw, fl - wt - 16);
    r(gx + gw / 2 - 1, wt + 16, 2, fl - wt - 16, '#1a1b1f');
    r(gx - 8, fl, gw + 16, 4, '#1a1b1f');
    // shelving with parts
    var sx = Math.round(W * 0.54), sw = W - sx - 4;
    r(sx, wt + 8, sw, fl - wt - 8, '#d0d1d4'); for (i = wt + 8; i < fl; i += 4) r(sx, i, sw, 1, '#b4b6ba');
    r(sx, wt + 8, 3, fl - wt - 8, '#1a1b1f'); r(sx + sw * 0.45, wt + 8, 3, fl - wt - 8, '#1a1b1f');
    [0.36, 0.62, 0.9].forEach(function (f) { r(sx + sw * 0.45, wt + (fl - wt) * f, sw * 0.55, 3, '#7ad13a'); });
    r(sx, fl - 3, sw, 3, '#7ad13a');
    // coilovers
    ['#d23a3a', '#3a7bd2', '#8a5cff'].forEach(function (c, n) {
      var cx = sx + 8 + n * 8, cy = wt + 14;
      r(cx, cy, 4, 26, '#c8ccd4'); for (i = 0; i < 8; i++) r(cx - 1, cy + 6 + i * 2, 6, 1, c);
      disc(x, cx + 2, cy, 2, '#555'); disc(x, cx + 2, cy + 26, 2, '#555');
    });
    // nitrous bottles
    for (k = 0; k < 2; k++) { var nx = sx + 10 + k * 10, ny = fl - 28; r(nx, ny, 8, 26, '#b03ad6'); r(nx, ny, 2, 26, '#d48aff'); r(nx + 2, ny - 3, 4, 3, '#555'); }
    // shelf items
    var c2 = sx + sw * 0.45 + 6;
    disc(x, c2 + 14, wt + (fl - wt) * 0.36 - 9, 8, '#d0d0d0'); disc(x, c2 + 14, wt + (fl - wt) * 0.36 - 9, 3, '#888'); r(c2 + 4, wt + (fl - wt) * 0.36 - 14, 4, 9, '#d23a3a');
    r(c2 + 6, wt + (fl - wt) * 0.62 - 12, 16, 12, '#1d3f9a'); for (i = 0; i < 4; i++) r(c2 + 8 + i * 4, wt + (fl - wt) * 0.62 - 11, 1, 10, '#0e1f50');
    r(c2 + 4, wt + (fl - wt) * 0.9 - 9, 24, 8, '#c8ccd4'); r(c2 + 26, wt + (fl - wt) * 0.9 - 7, 6, 4, '#555'); r(c2, wt + (fl - wt) * 0.9 - 6, 4, 3, '#6a5aa0');
    var c3 = c2 + 40;
    disc(x, c3 + 10, wt + (fl - wt) * 0.62 - 10, 8, '#c8ccd4'); disc(x, c3 + 10, wt + (fl - wt) * 0.62 - 10, 4, '#888'); r(c3 + 14, wt + (fl - wt) * 0.62 - 20, 8, 6, '#c8ccd4');
    r(c3 - 4, wt + (fl - wt) * 0.36 - 6, 40, 4, '#1a1b1f'); r(c3 - 6, wt + (fl - wt) * 0.36 - 10, 3, 8, '#1a1b1f'); r(c3 + 34, wt + (fl - wt) * 0.36 - 10, 3, 8, '#1a1b1f');
    ['#e8e8e8', '#3df0c8', '#3a7bd2'].forEach(function (c, n) { r(c3 + 6 + n * 7, wt + (fl - wt) * 0.36 - 26, 6, 14, '#e8e8e8'); r(c3 + 6 + n * 7, wt + (fl - wt) * 0.36 - 22, 6, 5, c); r(c3 + 7 + n * 7, wt + (fl - wt) * 0.36 - 28, 4, 2, '#999'); });
    // race seats
    for (k = 0; k < 2; k++) { var bx = c3 + 2 + k * 18, by = fl - 34; r(bx, by, 14, 30, '#18191d'); r(bx + 3, by + 3, 8, 3, '#2a2c33'); r(bx - 1, by + 22, 16, 10, '#111214'); }
    // wheels and tire stacks by the counter
    for (k = 0; k < 2; k++) { var wx = px + 4 + k * 22, wy = fl - 6; for (i = 0; i < 3; i++) r(wx, wy - i * 6 - 6, 20, 5, '#1a1b1f'); disc(x, wx + 10, wy - 26, 9, '#e8e8e8'); disc(x, wx + 10, wy - 26, 6, '#b0b4bc'); disc(x, wx + 10, wy - 26, 2, '#555'); }
    // checker floor
    r(0, fl, W, H - fl, '#9c968a');
    for (i = 0; i < 6; i++) for (k = -6; k < 30; k++) {
      if ((i + k) % 2) continue;
      var y0 = fl + Math.pow(i / 6, 1.3) * (H - fl), y1 = fl + Math.pow((i + 1) / 6, 1.3) * (H - fl);
      x.fillStyle = '#c9c3b6'; x.beginPath();
      x.moveTo(W / 2 + (k - 12) * 24 * (1 + i * 0.25), y0); x.lineTo(W / 2 + (k - 11) * 24 * (1 + i * 0.25), y0);
      x.lineTo(W / 2 + (k - 11) * 24 * (1 + (i + 1) * 0.25), y1); x.lineTo(W / 2 + (k - 12) * 24 * (1 + (i + 1) * 0.25), y1); x.fill();
    }
    vignette(x, W, H, 0.25);
  };

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

  var THEMES = { garage: { bg: garageBg, fl: 0.66, car: 0.36, refl: 0.3, vig: 0.3 }, showroom: { bg: showroomBg, fl: 0.62, car: 0.38, refl: 0.3 }, dyno: { bg: dynoBg, fl: 0.66, car: 0.3, refl: 0 }, lot: { bg: lotBg, fl: 0.6, car: 0.42, refl: 0, vig: 0.15 } };

  function hiRes(look, r) { return Object.assign({}, look, { res: r || 2 }); }
  DR.hiResLook = hiRes;
  DR.drawRoom = function (canvas, inst, opts) {
    opts = opts || {};
    var th = THEMES[opts.theme || 'garage'];
    // the car is drawn at 2x pixel density over a 1x background scaled up
    var spr = opts.spr || DR.carSprite(hiRes(DR.carLook(inst))), RS = spr.look.res || 1;
    var W1 = Math.max(420, Math.round(spr.lenPx / RS * (opts.zoom || 2.3))), H1 = Math.round(W1 / Math.max(1.5, Math.min(2.6, opts.aspect || 2.1)));
    var W = W1 * RS, H = H1 * RS;
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    var x = canvas.getContext('2d'); x.imageSmoothingEnabled = false;
    var fl1 = Math.round(H1 * th.fl), fl = fl1 * RS, key = (opts.theme || 'garage') + (opts.sign === false ? 'ns' : '') + W1 + 'x' + H1;
    if (!BG[key]) {
      var c = document.createElement('canvas'); c.width = W1; c.height = H1;
      var cx = c.getContext('2d'); cx.imageSmoothingEnabled = false;
      garageBg.noSign = opts.sign === false;
      th.bg(cx, W1, H1, fl1);
      garageBg.noSign = false;
      BG[key] = c;
    }
    x.drawImage(BG[key], 0, 0, W, H);
    var gy = fl + Math.round((H1 - fl1) * th.car) * RS, gx = Math.round(W / 2 - spr.lenPx / 2 + (spr.wheelR.x - spr.padL));
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
      var sp2 = DR.carSprite(hiRes(DR.carLook(o), RS)), sgx = n === 0 ? Math.round(-sp2.lenPx * 0.72 + (sp2.wheelR.x - sp2.padL)) : Math.round(W - sp2.lenPx * 0.28 + (sp2.wheelR.x - sp2.padL));
      DR.drawCar(x, sp2, sgx, gy, 0, 0.3);
      var tx = n === 0 ? sgx + sp2.lenPx * 0.48 : sgx + sp2.lenPx * 0.02, ty = gy - sp2.wheelR.r * 3.4;
      x.save(); x.translate(tx, ty); x.rotate(-0.25); x.scale(RS, RS); x.fillStyle = '#d63a3a'; x.fillRect(-11, -5, 22, 10); x.fillStyle = '#fff'; x.fillRect(-11, -5, 22, 1); DR.pixText(x, 'SALE', -7, -2, '#ffffff', 1); x.restore();
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
