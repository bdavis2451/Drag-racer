// ===========================================================================
// CAR SHOWS & MAGAZINE COVERS — the visual rating's own side of the game.
//  * Car shows: park your build at a booth next to other custom rides. The
//    crowd wanders the floor and stops at whatever catches its eye (star
//    rating, rarity, power, a blower through the hood, neon at night...).
//    You're paid a little per visitor, the top three take home trophies and
//    prize money. Entry fees and a crowd that gets bored of the same build
//    keep it a side hustle, not a money printer.
//  * Magazine covers: the first time any of your cars reaches a new star
//    level it makes the cover of Pixel Tuner, with a small bonus.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, A = DR.Audio, h = UI.h, btn = UI.btn;

  // ---------------------------------------------------------------- shows
  //  crowd: visitors over the whole show   pay: $ per visitor at your booth
  //  prizes: 1st/2nd/3rd   field: rival star range   night: neon counts
  DR.SHOWS = [
    { id: 'meet', name: 'Friday Night Meet', where: 'Grocery store parking lot', entry: 0, minStars: 0, crowd: 70, pay: 2, prizes: [250, 120, 60], field: [0, 2.5], rivals: 4, night: true, theme: 'lot' },
    { id: 'regional', name: 'Tri-County Tuner Show', where: 'Fairground lot', entry: 300, minStars: 2, crowd: 150, pay: 4, prizes: [1200, 600, 300], field: [1.5, 5], rivals: 5, night: false, theme: 'lot' },
    { id: 'expo', name: 'Import vs Domestic Expo', where: 'Convention hall', entry: 1000, minStars: 5, crowd: 260, pay: 7, prizes: [4000, 2000, 1000], field: [3.5, 7.5], rivals: 5, night: false, theme: 'hall' },
    { id: 'nationals', name: 'Pixel Nationals', where: 'Arena show floor', entry: 3000, minStars: 7, crowd: 420, pay: 12, prizes: [12000, 6000, 3000], field: [5.5, 10], rivals: 6, night: true, theme: 'hall' }
  ];
  var NAMES = ['Marco', 'Jenna', 'Dev', 'Ayumi', 'Luis', 'Tasha', 'Ricky', 'Bea', 'Kofi', 'Hana', 'Vic', 'Sam', 'Nadia', 'Toby', 'Rene', 'Kai', 'Mo', 'Priya', 'Gus', 'Zoe'];
  var RARITY = { fox: 0.5, hachi: 0.7, camss: 0.5, supra: 0.9 };

  function showState(id) {
    var s = G.state.shows || (G.state.shows = {});
    return s[id] || (s[id] = { entries: 0, sig: '', places: [0, 0, 0], best: 0 });
  }
  // A build "signature": the crowd gets bored of seeing the same car.
  function buildSig(inst) { return inst.carId + '|' + Math.floor(DR.starRating(inst)) + '|' + inst.color; }

  // How much a car draws the crowd at this show.
  function appeal(inst, show) {
    var S = DR.buildSpec(inst), look = DR.carLook(inst), v = inst.vis || {};
    var a = 1 + DR.starRating(inst) * 1.1 + (RARITY[inst.carId] || 0.4);
    a += Math.min(1.6, (S.peakHp + S.nosHp) / 700);              // big power draws a crowd
    if (look.blower) a += 0.8;                                    // a blower through the hood always does
    if (look.wing === 2) a += 0.25;
    if (v.neon) a += show.night ? 0.9 : 0.2;
    if (v.finish === 3 || v.finish === 2) a += 0.3;
    if (v.vinyl === 3) a += 0.3;
    if (inst.damage) a -= 1.5;                                    // nobody wants to see a broken car
    return Math.max(0.3, a);
  }

  DR.showAppeal = function (inst, show) { return appeal(inst, show); };
  // Rival builds around the show's star range.
  function rival(show, i, rnd) {
    // street cars only: no rails or pro mods parked at a meet
    var ids = Object.keys(DR.CARS).filter(function (id) { return DR.CARS[id].cat !== 'Pro'; }), carId = ids[Math.floor(rnd() * ids.length)];
    var target = show.field[0] + (show.field[1] - show.field[0]) * Math.pow(rnd(), 0.8);
    var inst = { carId: carId, engine: DR.CARS[carId].engine, parts: {}, tune: {}, vis: {}, color: DR.PAINTS[Math.floor(rnd() * DR.PAINTS.length)], stripe: '', rim: ['#c8c8c8', '#151515', '#ffd700', '#ffffff', '#8a8f99'][Math.floor(rnd() * 5)] };
    // fill cosmetic slots in a random order until the rating is near the target
    var slots = ['fbumper', 'rims', 'rbumper', 'skirt', 'spoiler', 'tint', 'finish', 'hood', 'vinyl', 'neon', 'roof', 'tips'];
    for (var k = slots.length - 1; k > 0; k--) { var j = Math.floor(rnd() * (k + 1)), t = slots[k]; slots[k] = slots[j]; slots[j] = t; }
    var tier = target > 6 ? 3 : target > 3 ? 2 : 1;
    for (k = 0; k < slots.length && DR.starRating(inst) < target - 0.3; k++) {
      var s = slots[k], tr = Math.max(1, Math.min(3, tier + (rnd() < 0.3 ? -1 : 0)));
      if (s === 'rims') inst.vis.rims = DR.visSlot('rims').tiers[tr - 1][Math.floor(rnd() * 2)];
      else if (s === 'neon') inst.vis.neon = DR.visSlot('neon').colors[Math.floor(rnd() * 6)];
      else if (s === 'roof' || s === 'tips') inst.vis[s] = s === 'roof' ? 2 : 1;
      else if (s === 'tint') inst.vis.tint = Math.min(2, tr);
      else inst.vis[s] = tr;
      if (rnd() < 0.25 && !inst.stripe) inst.stripe = DR.PAINTS[Math.floor(rnd() * DR.PAINTS.length)];
    }
    // some show cars are built, not just dressed
    var r = rnd();
    if (show.id !== 'meet' && r < 0.18) inst.parts = { fi: 'sc_roots', rtires: 'dr_315' };
    else if (r < 0.35) inst.parts = { fi: 't_med', aero: rnd() < 0.5 ? 'a2' : 'a1' };
    else if (r < 0.5) inst.parts = { nitrous: 'n150', rtires: 'dr_275' };
    return { inst: inst, name: NAMES[(i * 7 + Math.floor(rnd() * 20)) % NAMES.length], you: false };
  }

  DR.showRival = rival;
  // ---------------------------------------------------------------- screen: list
  // a postcard of the venue: its backdrop and floor with your car parked
  function showThumb(show, inst) {
    var c = h('canvas', { class: 'ecv' }), x = DR.hiCanvas(c, 400, 168);
    var bg = backdrop(show, 800), top = GROUND + 50 - 168;
    x.translate(0, -top);
    x.drawImage(bg, -120, 0); floor(x, show, 0);
    var spr = DR.carSprite(DR.carLook(inst));
    DR.drawCar(x, spr, Math.round(200 - spr.lenPx / 2 + (spr.wheelR.x - spr.padL)), GROUND + 20, 0, 0.3, {});
    return c;
  }
  UI.Shows = function () {
    var inst = G.car(), stars = DR.starRating(inst);
    var grid = h('div', { class: 'egrid shows' });
    DR.SHOWS.forEach(function (sh) {
      var st = showState(sh.id), ok = stars >= sh.minStars, bored = st.sig === buildSig(inst) && st.entries > 0;
      grid.appendChild(h('div', { class: 'ecard' + (ok ? '' : ' locked') + (sh.theme === 'hall' ? ' t-showcase' : '') },
        h('div', { class: 'ecvwrap' }, showThumb(sh, inst), h('span', { class: 'etype' }, sh.minStars ? sh.minStars + '+ STARS' : 'OPEN TO ALL'), sh.night ? h('span', { class: 'ewon', style: { background: '#3a2a7a' } }, 'NIGHT') : null),
        h('div', { class: 'acc ename' }, sh.name),
        h('div', { class: 'gsmall dim' }, sh.where + ' • about ' + sh.crowd + ' visitors • ' + DR.money(sh.pay) + '/visitor'),
        h('div', { class: 'gsmall' }, 'Prizes ' + sh.prizes.map(DR.money).join(' / ')),
        h('div', { class: 'gsmall' }, '🥇' + st.places[0] + '  🥈' + st.places[1] + '  🥉' + st.places[2] + (st.best ? '  • best crowd ' + st.best : '')),
        bored ? h('div', { class: 'warn gsmall' }, 'The regulars have seen this build — change it up for a bigger crowd.') : null,
        !ok ? h('div', { class: 'warn gsmall' }, '🔒 Needs a ' + sh.minStars + '-star car') : null,
        h('div', { class: 'efoot' }, h('span', { class: 'efee' }, sh.entry ? 'Entry ' + DR.money(sh.entry) : 'Free entry'),
          btn('Enter', function () {
            if (!ok) return UI.toast('Your car needs a ' + sh.minStars + '-star rating for this show');
            if (inst.damage) return UI.toast('Fix your car first — broken cars stay home');
            if (!G.canAfford(sh.entry)) return UI.toast('You cannot cover the entry fee');
            UI.show(ShowScreen, sh);
          }, 'small ' + (ok ? 'go' : 'disabled')))));
    });
    var covers = (G.state.covers || []).length;
    return h('div', { class: 'screen' }, UI.top('CAR SHOWS', function () { UI.show(UI.Garage); }, btn('Covers ' + covers + '/10', function () { UI.show(UI.Covers); }, 'small blue')),
      h('div', { class: 'content' },
        h('div', { class: 'stagehead' }, h('div', { class: 'grow' }, h('div', { class: 'plvl' }, 'YOUR BUILD • ' + (Math.round(stars * 100) / 100) + ' STARS'),
          h('div', { class: 'dim' }, 'Park at a booth and see who stops to look. The crowd likes stars most, but rare cars, big power, a blower sticking out of the hood and neon at night shows all help.'))),
        grid));
  };

  // ---------------------------------------------------------------- the show
  var W = function () { return DR.VIEW_W; }, Hh = function () { return DR.VIEW_H; };
  var SPACING = 330, GROUND = 352;
  function ShowScreen(show) {
    var inst = G.car(), st = showState(show.id), seed = (Date.now() & 0xffff) + 7;
    var rnd = DR.rng(seed);
    G.pay(show.entry);
    // the field: your car somewhere in the row
    var n = show.rivals + 1, you = Math.floor(rnd() * n), field = [];
    for (var i = 0, r = 0; i < n; i++) {
      if (i === you) field.push({ inst: inst, name: 'YOU', you: true });
      else field.push(rival(show, r++, rnd));
    }
    var bored = st.sig === buildSig(inst) ? st.entries : 0;
    field.forEach(function (f, i) {
      f.spr = DR.carSprite(DR.carLook(f.inst));
      f.stars = DR.starRating(f.inst);
      f.appeal = appeal(f.inst, show) * (0.9 + rnd() * 0.2) * (f.you ? Math.max(0.5, 1 - 0.14 * bored) : 1);
      f.x = 120 + i * SPACING;            // booth left edge (world px)
      f.visits = 0; f.here = 0;
    });
    var total = 0; field.forEach(function (f) { total += Math.pow(f.appeal, 2.2); });
    var crowd = Math.round(show.crowd * (0.9 + rnd() * 0.2)), DUR = 22, spawned = 0;
    var people = [], t = 0, done = false, podiumT = -1, final = null;
    var rowW = field[n - 1].x + SPACING;

    var cv = h('canvas', { class: 'world' }), ctx = DR.hiCanvas(cv, W(), Hh());
    var hudTop = h('div', { class: 'showbar' }), hint = h('div', { class: 'msg' }, show.name), sub = h('div', { class: 'sub' }, show.where + ' • the crowd is walking the floor...');
    var skip = btn('Skip ▶▶', function () { t = Math.max(t, DUR - 0.01); }, 'small back quit');
    var root = h('div', { class: 'screen race' }, cv, h('div', { class: 'hud' }, hudTop, hint, sub), h('div', { class: 'controls' }, skip));
    var bg = backdrop(show, rowW);

    // ---- crowd
    function pick() {
      var x = rnd() * total;
      for (var i = 0; i < n; i++) { x -= Math.pow(field[i].appeal, 2.2); if (x <= 0) return i; }
      return n - 1;
    }
    function spawn() {
      // a visitor counts once they pick a booth; they wander in from up to a
      // few booths away so the whole crowd gets there before the show ends
      var tgt = pick(), f = field[tgt], away = (rnd() < 0.5 ? -1 : 1) * (200 + rnd() * 500);
      f.visits++;
      people.push({ x: Math.max(-30, Math.min(rowW + 30, f.x + away)), tx: f.x + 20 + rnd() * (f.spr.lenPx - 40), tgt: tgt, state: 'walk', stay: 2 + rnd() * 4, front: rnd() < 0.5,
        shirt: ['#d23a3a', '#3a7bd2', '#f0e0c0', '#2e7d4f', '#efe14b', '#222', '#eee', '#ff6a00', '#8a5cff'][Math.floor(rnd() * 9)],
        skin: ['#f1c8a0', '#c58c64', '#7a5038', '#e0b090'][Math.floor(rnd() * 4)], pants: ['#2a3a5a', '#222', '#555', '#6a5a40'][Math.floor(rnd() * 4)],
        sp: 34 + rnd() * 26, ph: rnd() * 6, cap: rnd() < 0.3, phone: rnd() < 0.35 });
    }

    var last = performance.now(), raf = 0;
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      update(dt); draw();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    UI.cleanup = function () { cancelAnimationFrame(raf); };

    function update(dt) {
      if (!done) {
        t += dt;
        var want = Math.min(crowd, Math.floor(crowd * Math.min(1, t / (DUR * 0.8))));
        while (spawned < want) { spawn(); spawned++; }
        if (t >= DUR) { finish(); }
      } else if (podiumT >= 0) podiumT += dt;
      people.forEach(function (p) {
        p.ph += dt * 9;
        if (p.state === 'walk') {
          var d = p.tx - p.x, s = p.sp * dt;
          if (Math.abs(d) <= s) { p.x = p.tx; p.state = 'look'; field[p.tgt].here++; }
          else p.x += Math.sign(d) * s;
        } else if (p.state === 'look') {
          p.stay -= dt;
          if (p.stay <= 0) { p.state = 'leave'; field[p.tgt].here--; p.tx = p.x < rowW / 2 ? -40 : rowW + 40; }
        } else if (p.state === 'leave') {
          var d2 = p.tx - p.x, s2 = p.sp * dt;
          if (Math.abs(d2) <= s2) p.state = 'gone'; else p.x += Math.sign(d2) * s2;
        }
      });
      if (people.length > 400) people = people.filter(function (p) { return p.state !== 'gone'; });
    }

    // camera: glide along the row, lingering a bit on your booth
    function camX() {
      var span = rowW - W(), k = (Math.sin(t / DUR * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      var mine = field[you].x + field[you].spr.lenPx / 2 - W() / 2;
      var base = span * k;
      var near = Math.max(0, 1 - Math.abs(base - mine) / 400);
      return Math.max(0, Math.min(span, base + (mine - base) * near * 0.5));
    }

    function draw() {
      if (podiumT >= 0) { drawPodium(); return; }
      var cx = camX();
      ctx.drawImage(bg, -Math.round(cx * 0.5) % bg.width, 0);
      if (-Math.round(cx * 0.5) % bg.width + bg.width < W()) ctx.drawImage(bg, -Math.round(cx * 0.5) % bg.width + bg.width, 0);
      floor(ctx, show, cx);
      // back row of visitors, cars, front row
      people.forEach(function (p) { if (!p.front && p.state !== 'gone') person(ctx, p, p.x - cx, GROUND - 6); });
      field.forEach(function (f) { booth(ctx, f, f.x - cx, show); });
      people.forEach(function (p) { if (p.front && p.state !== 'gone') person(ctx, p, p.x - cx, GROUND + 22); });
      if (t > 3.5) hint.style.display = sub.style.display = 'none';
      hudTop.textContent = 'YOUR BOOTH: ' + field[you].visits + ' visitors • ' + Math.max(0, Math.ceil(DUR - t)) + 's';
    }

    function finish() {
      done = true;
      var order = final = field.slice().sort(function (a, b) { return b.visits - a.visits || b.stars - a.stars; });
      var place = order.indexOf(field[you]);
      hint.style.display = sub.style.display = 'none';
      hudTop.textContent = show.name.toUpperCase() + ' • RESULTS';
      var mult = Math.max(0.5, 1 - 0.14 * bored);
      var visitCash = Math.round(field[you].visits * show.pay);
      var prize = place < 3 ? Math.round(show.prizes[place] * (st.places[place] ? 0.6 : 1) * mult) : 0;
      // remember for next time
      if (place < 3) st.places[place]++;
      st.entries = st.sig === buildSig(inst) ? st.entries + 1 : 1;
      st.sig = buildSig(inst);
      st.best = Math.max(st.best, field[you].visits);
      G.earn(visitCash + prize); G.save();
      if (visitCash + prize > 0) A.cash();
      podiumT = 0;
      showResult(order, place, visitCash, prize);
    }

    function drawPodium() {
      var order = final;
      ctx.drawImage(bg, 0, 0);
      floor(ctx, show, 0);
      // stage lights
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      [[200, 0.16], [400, 0.24], [600, 0.16]].forEach(function (L) {
        var g = ctx.createLinearGradient(0, 0, 0, GROUND + 20); g.addColorStop(0, 'rgba(255,240,200,' + L[1] + ')'); g.addColorStop(1, 'rgba(255,240,200,0.02)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(L[0] - 20, 0); ctx.lineTo(L[0] + 20, 0); ctx.lineTo(L[0] + 150, GROUND + 20); ctx.lineTo(L[0] - 150, GROUND + 20); ctx.closePath(); ctx.fill();
      });
      ctx.restore();
      // the podium: 2nd | 1st | 3rd
      var slots = [[1, 30, 34], [0, 300, 58], [2, 570, 18]];
      slots.forEach(function (sl) {
        var f = order[sl[0]], x = sl[1], hgt = sl[2], top = GROUND + 20 - hgt;
        ctx.fillStyle = '#1c1d22'; ctx.fillRect(x - 6, top, 212, hgt);
        ctx.fillStyle = ['#ffd23d', '#c8ccd4', '#cd7f32'][sl[0]]; ctx.fillRect(x - 6, top, 212, 3);
        DR.pixText(ctx, String(sl[0] + 1), x + 96, top + 10, ['#ffd23d', '#c8ccd4', '#cd7f32'][sl[0]], 3);
        if (!f) return;
        var bounce = sl[0] === 0 ? Math.round(Math.sin(podiumT * 4) * 1) : 0;
        DR.drawCar(ctx, f.spr, x + (f.spr.wheelR.x - f.spr.padL) + (200 - f.spr.lenPx) / 2, top + bounce, 0, 0.3, {});
        var label = (f.you ? 'YOU' : f.name.toUpperCase()) + ' ' + f.visits;
        DR.pixText(ctx, label, x + 100 - DR.pixTextW(label, 2) / 2, top - f.spr.h + 18, f.you ? '#ffd23d' : '#ffffff', 2);
      });
      // confetti
      var cr = DR.rng(99);
      for (var i = 0; i < 90; i++) {
        var px = cr() * W(), sp = 30 + cr() * 50, py = ((cr() * 500 + podiumT * sp) % 380) - 20;
        ctx.fillStyle = ['#ffd23d', '#ff3d9a', '#3df0ff', '#7dff6a', '#ffffff'][i % 5];
        ctx.fillRect(Math.round(px + Math.sin(podiumT * 3 + i) * 6), Math.round(py), 3, 2);
      }
    }

    function showResult(order, place, visitCash, prize) {
      var head = place === 0 ? '1ST PLACE!' : place === 1 ? '2ND PLACE' : place === 2 ? '3RD PLACE' : place + 1 + 'TH PLACE';
      var tbl = h('table');
      tbl.appendChild(h('tr', {}, h('th', {}, '#'), h('th', {}, 'Owner'), h('th', {}, 'Car'), h('th', {}, 'Rating'), h('th', {}, 'Visitors')));
      order.forEach(function (f, i) {
        tbl.appendChild(h('tr', { class: f.you ? 'acc' : '' }, h('td', {}, String(i + 1)), h('td', {}, f.you ? 'You' : f.name), h('td', {}, DR.CARS[f.inst.carId].name), h('td', {}, DR.starText(f.stars)), h('td', {}, String(f.visits))));
      });
      var lines = [];
      lines.push(field[you].visits + ' visitors × ' + DR.money(show.pay) + ' = ' + DR.money(visitCash));
      if (prize) lines.push(head + ' prize: ' + DR.money(prize) + (st.places[place] > 1 ? ' (repeat winner)' : ''));
      if (show.entry) lines.push('Entry fee: -' + DR.money(show.entry));
      if (bored) lines.push('The regulars had seen your build before.');
      var net = visitCash + prize - show.entry;
      setTimeout(function () {
        root.appendChild(h('div', { class: 'slip' }, h('div', { class: 'panel row' },
          h('div', { class: 'grow' }, tbl),
          h('div', { class: 'col', style: { width: '38%', minWidth: '210px' } },
            h('div', { class: 'pix big ' + (place < 3 ? 'good' : ''), style: { textAlign: 'center' } }, head),
            h('div', { class: 'pix ' + (net >= 0 ? 'good' : 'bad'), style: { textAlign: 'center' } }, (net >= 0 ? '+' : '') + DR.money(net)),
            lines.map(function (l) { return h('div', { class: 'dim', style: { textAlign: 'center' } }, l); }),
            btn('Back to Shows', function () { UI.show(UI.Shows); }, 'primary'),
            btn('Garage', function () { UI.show(UI.Garage); })))));
      }, 2600);
    }
    return root;
  }

  // ---------------------------------------------------------------- drawing
  function backdrop(show, rowW) {
    var c = document.createElement('canvas'); c.width = W() * 2; c.height = Hh();
    var x = c.getContext('2d'), w = c.width, i;
    if (show.theme === 'hall') {
      var g = x.createLinearGradient(0, 0, 0, GROUND);
      g.addColorStop(0, show.night ? '#0b0b16' : '#1c1f28'); g.addColorStop(1, show.night ? '#1b1630' : '#2c3140');
      x.fillStyle = g; x.fillRect(0, 0, w, Hh());
      // truss & hanging lights
      x.fillStyle = '#3a3f4a'; x.fillRect(0, 34, w, 4); x.fillRect(0, 50, w, 2);
      for (i = 0; i < w; i += 16) { x.fillRect(i, 38, 2, 12); }
      for (i = 40; i < w; i += 160) { x.fillStyle = '#101014'; x.fillRect(i, 52, 14, 8); x.fillStyle = '#fff6d8'; x.fillRect(i + 2, 60, 10, 2); }
      // sponsor banners
      ['PIXEL NATIONALS', 'BOOSTHOUSE', 'NITRO COLA', 'APEX WHEELS', 'GRIPCO', 'TORQUE TIRES'].forEach(function (s, k) {
        var bx = 60 + k * 270, col = ['#c42a2a', '#1c3f9a', '#ff3030', '#d0d0d0', '#8a5cff', '#ffcc00'][k];
        x.fillStyle = col; x.fillRect(bx, 92, 200, 34); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(bx, 122, 200, 4);
        DR.pixText(x, s, bx + 100 - DR.pixTextW(s, 2) / 2, 104, k === 3 || k === 5 ? '#111' : '#fff', 2);
      });
      // back wall & bleacher crowd silhouettes
      x.fillStyle = '#16181f'; x.fillRect(0, 200, w, GROUND - 200);
      var r = DR.rng(5);
      for (i = 0; i < w; i += 5) { x.fillStyle = 'rgba(80,90,110,' + (0.3 + r() * 0.4).toFixed(2) + ')'; var hh = 10 + r() * 8; x.fillRect(i, GROUND - 60 - hh, 4, hh); x.fillRect(i + 1, GROUND - 64 - hh, 2, 3); }
    } else {
      var g2 = x.createLinearGradient(0, 0, 0, GROUND);
      if (show.night) { g2.addColorStop(0, '#0a0c22'); g2.addColorStop(0.7, '#2a2048'); g2.addColorStop(1, '#5a3048'); }
      else { g2.addColorStop(0, '#5aa0e0'); g2.addColorStop(0.75, '#bcd8f0'); g2.addColorStop(1, '#f2dcc0'); }
      x.fillStyle = g2; x.fillRect(0, 0, w, Hh());
      if (show.night) { x.fillStyle = '#fff'; var r2 = DR.rng(11); for (i = 0; i < 90; i++) x.fillRect(r2() * w | 0, r2() * 160 | 0, 1, 1); }
      // store fronts / fair tents
      for (i = 0; i < w; i += 220) {
        x.fillStyle = show.night ? '#262640' : '#c9c2b4'; x.fillRect(i, 170, 200, GROUND - 170);
        x.fillStyle = show.night ? '#ffd27a' : '#7d8fa8'; for (var wx = i + 14; wx < i + 190; wx += 30) x.fillRect(wx, 200, 18, 40);
        x.fillStyle = ['#c42a2a', '#2e7d4f', '#1c3f9a'][(i / 220) % 3]; x.fillRect(i + 6, 176, 188, 12);
      }
      // string lights
      for (i = 0; i < w; i += 12) { x.fillStyle = ['#ff6a6a', '#ffd23d', '#7dff6a', '#6ab4ff'][(i / 12) % 4]; x.fillRect(i, 150 + Math.round(Math.sin(i / 40) * 6), 3, 3); }
    }
    return c;
  }
  function floor(ctx, show, cx) {
    var w = W();
    if (show.theme === 'hall') {
      ctx.fillStyle = '#202228'; ctx.fillRect(0, GROUND - 40, w, Hh());
      ctx.fillStyle = '#2b2e36';
      for (var i = -1; i < w / 64 + 2; i++) ctx.fillRect(Math.round(i * 64 - (cx % 64)), GROUND - 40, 1, Hh());
      ctx.fillStyle = '#7a1d1d'; ctx.fillRect(0, GROUND + 2, w, 34);             // red carpet aisle
      ctx.fillStyle = '#9a2a2a'; ctx.fillRect(0, GROUND + 2, w, 2);
    } else {
      ctx.fillStyle = show.night ? '#1d1d24' : '#55555c'; ctx.fillRect(0, GROUND - 40, w, Hh());
      ctx.fillStyle = show.night ? '#e8d070' : '#f2f2f2';
      for (var j = -1; j < w / SPACING + 2; j++) ctx.fillRect(Math.round(j * SPACING - (cx % SPACING) + 100), GROUND - 30, 2, 60);   // parking lines
    }
  }
  function booth(ctx, f, sx, show) {
    if (sx > W() + 40 || sx + f.spr.lenPx < -60) return;
    var cx = Math.round(sx + f.spr.lenPx / 2);
    // stanchions & rope
    ctx.fillStyle = '#c8b060';
    [sx - 14, sx + f.spr.lenPx + 10].forEach(function (px) { ctx.fillRect(Math.round(px), GROUND - 2, 3, 20); ctx.fillRect(Math.round(px) - 2, GROUND + 16, 7, 3); });
    ctx.fillStyle = '#8a1a1a';
    for (var i = 0; i <= f.spr.lenPx + 24; i += 2) ctx.fillRect(Math.round(sx - 13 + i), GROUND + 2 + Math.round(Math.sin(i / (f.spr.lenPx + 24) * Math.PI) * 5), 2, 2);
    // the car on a spotlight
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = show.night ? '#ffe9b0' : '#ffffff';
    ctx.beginPath(); ctx.ellipse(cx, GROUND, f.spr.lenPx * 0.62, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    DR.drawCar(ctx, f.spr, Math.round(sx + (f.spr.wheelR.x - f.spr.padL)), GROUND, 0, 0.3, {});
    if (f.spr.neon) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = show.night ? 0.35 : 0.15; ctx.fillStyle = f.spr.neon;
      ctx.beginPath(); ctx.ellipse(cx, GROUND + 2, f.spr.lenPx * 0.5, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    // booth sign
    var sy = 160, label = f.you ? 'YOU' : f.name.toUpperCase(), stars = DR.starText(f.stars).replace('★', '*');
    ctx.fillStyle = '#0c0d10'; ctx.fillRect(cx - 62, sy, 124, 40);
    ctx.fillStyle = f.you ? '#ffd23d' : '#3a3f4a'; ctx.fillRect(cx - 62, sy, 124, 3);
    DR.pixText(ctx, label, cx - DR.pixTextW(label, 2) / 2, sy + 8, f.you ? '#ffd23d' : '#ffffff', 2);
    DR.pixText(ctx, stars + '  ' + f.visits, cx - DR.pixTextW(stars + '  ' + f.visits, 2) / 2, sy + 24, '#9fd8ff', 2);
    ctx.fillStyle = '#2a2a2e'; ctx.fillRect(cx - 1, sy + 40, 2, 12);
  }
  // a tiny pixel visitor (walking or standing looking at a car)
  function person(ctx, p, x, y) {
    if (x < -10 || x > W() + 10) return;
    x = Math.round(x); var walk = p.state !== 'look', step = walk ? (Math.sin(p.ph) > 0 ? 1 : 0) : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 3, y, 8, 2);
    ctx.fillStyle = p.pants; ctx.fillRect(x - 1 + step, y - 7, 2, 7); ctx.fillRect(x + 2 - step, y - 7, 2, 7);
    ctx.fillStyle = p.shirt; ctx.fillRect(x - 2, y - 15, 7, 8);
    ctx.fillStyle = p.skin; ctx.fillRect(x - 1, y - 20, 5, 5);
    if (p.cap) { ctx.fillStyle = p.shirt; ctx.fillRect(x - 1, y - 21, 6, 2); }
    if (p.phone && !walk) { ctx.fillStyle = '#9fd8ff'; ctx.fillRect(x + 4, y - 17, 2, 3); }   // snapping a photo
  }

  // ---------------------------------------------------------------- magazine covers
  // Awarded by G.noteStars (career.js) the first time a new star level is hit.
  DR.drawCover = function (canvas, cover) {
    var c = DR.hiCanvas(canvas), w = canvas._lw, hh = canvas._lh;
    c.imageSmoothingEnabled = false;
    var hue = ['#c42a2a', '#1c3f9a', '#ff6a00', '#2e7d4f', '#8a5cff', '#ff2bd6', '#2fb3a8', '#151515', '#ffcc00', '#d0d0d0'][(cover.lvl - 1) % 10];
    var g = c.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, hue); g.addColorStop(1, '#0c0d10');
    c.fillStyle = g; c.fillRect(0, 0, w, hh);
    c.fillStyle = 'rgba(255,255,255,0.08)'; for (var i = 0; i < w; i += 6) c.fillRect(i, 0, 2, hh);
    DR.pixText(c, 'PIXEL', 10, 10, '#ffffff', 5); DR.pixText(c, 'TUNER', 10, 40, '#ffd23d', 5);
    DR.pixText(c, 'ISSUE ' + (100 + cover.lvl), w - 10 - DR.pixTextW('ISSUE ' + (100 + cover.lvl), 2), 14, '#ffffff', 2);
    var spr = DR.carSprite(DR.carLook(cover.inst));
    var gy = hh - 70;
    c.save(); c.globalAlpha = 0.25; c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(w / 2, gy, spr.lenPx * 0.6, 8, 0, 0, Math.PI * 2); c.fill(); c.restore();
    DR.drawCar(c, spr, Math.round(w / 2 - spr.lenPx / 2 + (spr.wheelR.x - spr.padL)), gy, 0, 0.3, {});
    var stars = cover.lvl + ' STAR BUILD';
    c.fillStyle = '#ffd23d'; c.fillRect(10, 86, DR.pixTextW(stars, 2) + 12, 22);
    DR.pixText(c, stars, 16, 92, '#111', 2);
    DR.pixText(c, DR.CARS[cover.inst.carId].name.toUpperCase(), 10, 118, '#ffffff', 2);
    ['10 MODS YOU NEED', 'NEON: YES OR NO?', 'STREET VS STRIP'].forEach(function (s, k) { DR.pixText(c, s, 10, hh - 46 + k * 12, '#ffffff', 1); });
    DR.pixText(c, '$4.99', w - 10 - DR.pixTextW('$4.99', 2), hh - 22, '#ffd23d', 2);
  };
  function coverCanvas(cover) { var cv = h('canvas', { width: 260, height: 300, style: { width: '100%', maxWidth: '300px', imageRendering: 'pixelated' } }); DR.drawCover(cv, cover); return cv; }
  // Pops up any covers just earned.
  UI.afterStars = function (msgs) {
    (msgs || []).forEach(function (m) { UI.toast(m); });
    var news = G.takeNewCovers ? G.takeNewCovers() : [];
    news.forEach(function (cover) {
      var close = UI.modal([h('h2', {}, 'YOU MADE THE COVER!'), coverCanvas(cover),
        h('p', {}, 'Your ' + DR.CARS[cover.inst.carId].name + ' is the ' + cover.lvl + '-star cover car of Pixel Tuner. Cover bonus: ' + DR.money(cover.bonus) + '.'),
        btn('Nice', function () { close(); }, 'go')]);
    });
    if (news.length) A.cash();
  };
  UI.Covers = function () {
    var grid = h('div', { class: 'cards' }), got = {};
    (G.state.covers || []).forEach(function (cv) { got[cv.lvl] = cv; });
    for (var l = 1; l <= 10; l++) {
      var cover = got[l];
      grid.appendChild(h('div', { class: 'card' + (cover ? '' : ' locked') }, cover ? coverCanvas(cover) : h('div', { class: 'pix dim', style: { padding: '40px 8px', textAlign: 'center' } }, '?'),
        h('div', { class: 't acc' }, l + '-star cover'), h('div', { class: 'dim' }, cover ? DR.CARS[cover.inst.carId].name + ' • ' + DR.money(cover.bonus) : 'Reach ' + DR.starText(l) + ' to make the cover')));
    }
    return h('div', { class: 'screen' }, UI.top('MAGAZINE COVERS', function () { UI.show(UI.Shows); }), h('div', { class: 'content' }, grid));
  };
})();
