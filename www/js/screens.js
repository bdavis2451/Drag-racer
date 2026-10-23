// ===========================================================================
// SCREENS — title, starter pick, race menu, tuning, dyno, dealership, my
// cars and paint, all in the same Pixel Car Racer style as the garage and
// parts shop (side rail, cards, pixel scenes).
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, A = DR.Audio, h = UI.h, btn = UI.btn;
  function icon(cat, lvl, size) { return UI.partIconEl(cat, lvl || 2, '', size || 26); }
  function railItem(cat, lvl, label, on, fn) { return h('div', { class: 'srail-i' + (on ? ' on' : ''), onclick: fn }, icon(cat, lvl), h('span', {}, label)); }
  // no predicted times anywhere: you find out what a car runs by running it
  function bestText(inst) { return inst && inst.best && inst.best.q ? 'Best 1/4 ' + inst.best.q.toFixed(3) + 's' : 'No timeslip yet'; }
  function chip(label, on, fn, extra) { return btn(label, fn, 'chip' + (on ? ' on' : '') + (extra ? ' ' + extra : '')); }
  function gst(k, v, cls) { return h('div', { class: 'gst' }, h('span', { class: 'k' }, k), h('span', { class: 'v ' + (cls || '') }, v)); }

  // ---------------------------------------------------------------- TITLE
  UI.Title = function () {
    var s = G.state;
    var demo = { carId: 'fox', engine: 'v8_86b', parts: { fi: 'sc_1471', wheeliebar: 'wb1', aero: 'a2', rtires: 'sl_33' }, vis: { neon: '#ff2bd6', rims: 'drag', vinyl: 3 }, color: '#e31b6d', stripe: '#ffffff', rim: '#d0d0d0' };
    if (s.started && G.car()) demo = G.car();
    var cv = DR.roomCanvas(demo, { theme: 'garage', zoom: 2.6, sign: false });
    return h('div', { class: 'screen title2' }, cv,
      h('div', { class: 'tpanel' },
        h('div', { class: 'logo' }, 'PIXEL DRAG'),
        h('div', { class: 'tag2' }, 'BUILD • TUNE • LAUNCH'),
        h('div', { class: 'row', style: { justifyContent: 'center', flexWrap: 'wrap' } },
          s.started ? btn('Continue', function () { UI.show(UI.Garage); }, 'primary') : null,
          btn(s.started ? 'New Game' : 'Start Career', function () {
            if (s.started) UI.confirm('Start over? Your garage and money will be lost.', function () { UI.show(UI.Starter); });
            else UI.show(UI.Starter);
          }, s.started ? '' : 'primary'),
          btn('How to Play', function () { UI.show(UI.Help, UI.Title); }),
          btn('Settings', function () { UI.show(UI.Settings, UI.Title); }))));
  };

  // ---------------------------------------------------------------- STARTER
  var starterIdx = 0;
  UI.Starter = function () {
    var ids = G.starters, id = ids[starterIdx % ids.length], car = DR.CARS[id];
    var inst = { carId: id, engine: car.engine, parts: {}, tune: {}, vis: {}, color: car.col };
    var S = DR.buildSpec(inst);
    var cv = DR.roomCanvas(inst, { theme: 'lot' });
    function cyc(d) { starterIdx = (starterIdx + d + ids.length) % ids.length; UI.refresh(); }
    return h('div', { class: 'screen' }, UI.top('PICK YOUR FIRST CAR', function () { UI.show(UI.Title); }),
      h('div', { class: 'gwrap' }, cv,
        h('div', { class: 'gside' }, h('div', { class: 'pix acc' }, car.name),
            h('div', { class: 'gsmall dim' }, car.real), statBars(S),
          gst('ENGINE', S.eng.name), gst('POWER', Math.round(S.peakHp) + ' hp', 'acc'), gst('WEIGHT', UI.kgLb(S.m)), gst('DRIVE', S.drive),
          h('div', { class: 'gsmall dim' }, 'Free to start, plus $6,000 for parts.')),
        h('div', { class: 'gsel' }, btn('◀', function () { cyc(-1); }, 'arrow'),
          h('div', { class: 'gname' }, h('div', { class: 'pix acc' }, car.name), h('div', { class: 'dim' }, (starterIdx % ids.length + 1) + ' / ' + ids.length + ' • starter car')),
          btn('▶', function () { cyc(1); }, 'arrow'),
          btn('Choose', function () { G.newGame(id); UI.toast('Welcome to the strip! You have ' + DR.money(G.state.money) + ' to spend.'); UI.show(UI.Garage); }, 'go'))));
  };

  // ---------------------------------------------------------------- RACE MENU
  var streetOpps = null, selStage = null, betSel = 1000;
  UI.RaceMenu = function (tab) {
    tab = tab || 'map';
    UI.raceTab = tab;
    var inst = G.car();
    var rail = h('div', { class: 'srail' },
      railItem('u_map', 2, 'City Map', tab === 'map', function () { UI.show(UI.RaceMenu, 'map'); }),
      railItem('u_career', 2, 'Career', tab === 'career', function () { UI.show(UI.RaceMenu, 'career'); }),
      railItem('u_street', 2, 'Street $', tab === 'street', function () { UI.show(UI.RaceMenu, 'street'); }),
      railItem('u_test', 2, 'Test & Tune', tab === 'test', function () { UI.show(UI.RaceMenu, 'test'); }));
    var body = tab === 'map' ? mapView(inst) : tab === 'career' ? careerView() : tab === 'street' ? streetView(inst) : testView(inst);
    return h('div', { class: 'screen' }, UI.top('RACE', function () { UI.show(UI.Garage); }, h('span', { class: 'topcar' }, DR.CARS[inst.carId].name + ' • ' + bestText(inst))),
      h('div', { class: 'shopwrap' }, rail, h('div', { class: 'smain' }, body)));
  };

  function stageChips() {
    return h('div', { class: 'schips' }, DR.STAGES.map(function (st, si) {
      var un = G.stageUnlocked(si), boss = G.eventWon(st.boss);
      return chip((boss ? '✔ ' : un ? '' : '🔒 ') + 'Stage ' + (si + 1), si === selStage, function () { if (!un) return UI.toast('Beat the stage ' + si + ' boss first'); selStage = si; selPlace = null; UI.refresh(); }, un ? '' : 'nofit');
    }));
  }
  function nextEvent(st) {
    var next = null;
    st.all.forEach(function (ev) { if (!next && G.eventVisible(ev) && !G.eventWon(ev) && !G.eventLock(ev)) next = ev; });
    return next;
  }

  // the city map: tap a place to see what races are there, or to go shopping
  var selPlace = null;
  function mapView(inst) {
    var c = G.careerState();
    if (selStage == null || selStage > c.stage) selStage = c.stage;
    G.checkContracts().forEach(function (m) { UI.toast(m); });
    var st = DR.STAGES[selStage], next = nextEvent(st), pins = {};
    st.all.forEach(function (ev) {
      if (!G.eventVisible(ev) || G.eventWon(ev)) return;
      var p = DR.cityPlaceOf(ev.type), pin = pins[p.id] || (pins[p.id] = { n: 0 });
      pin.n++;
      if (ev === next) pin.next = true;
      if (ev.type === 'boss') pin.boss = true;
    });
    pins.highway = { street: true };
    if (!selPlace) selPlace = next ? DR.cityPlaceOf(next.type).id : 'strip';
    var place = DR.CITY.filter(function (p) { return p.id === selPlace; })[0] || DR.CITY[0];
    var cv = h('canvas', { class: 'citycv', width: DR.CITY_W, height: DR.CITY_H });
    var t0 = Date.now(), last = -1;
    (function frame() {
      if (!cv.isConnected && last >= 0) return;
      var f = Math.floor((Date.now() - t0) / 100);
      if (f !== last) { last = f; DR.drawCityMap(cv, pins, selPlace, f / 10); }
      requestAnimationFrame(frame);
    })();
    cv.addEventListener('click', function (e) {
      var r = cv.getBoundingClientRect();
      var p = DR.cityHit((e.clientX - r.left) / r.width * DR.CITY_W, (e.clientY - r.top) / r.height * DR.CITY_H);
      if (!p) return;
      if (p.id === selPlace && p.go) return UI.show(UI[p.go]);
      selPlace = p.id; A.click(); UI.refresh();
    });
    var wins = G.stageWins(selStage);
    var legend = h('div', { class: 'gsmall dim citylegend' },
      h('span', { class: 'lg y' }, 'races'), h('span', { class: 'lg r' }, 'boss'), h('span', { class: 'lg g' }, 'street $'), h('span', { class: 'lg b' }, 'places'),
      h('span', {}, 'Stage ' + (selStage + 1) + ': ' + wins + ' / ' + st.events.length + ' won'));
    var spBar = c.sponsor[selStage] ? null : h('div', { class: 'warnbox citysp' }, h('span', { class: 'grow' }, 'No sponsor for stage ' + (selStage + 1) + ' yet. Sponsors pay per win, and the boss only races sponsored drivers.'),
      btn('Choose Sponsor', function () { sponsorPicker(selStage); }, 'small go'));
    return h('div', {}, stageChips(), spBar,
      h('div', { class: 'citywrap' }, h('div', { class: 'citymap' }, cv, legend), h('div', { class: 'cityside' }, placePanel(place, st, next, inst))));
  }
  function placePanel(p, st, next, inst) {
    var head = h('div', { class: 'stagehead' }, h('div', { class: 'grow' }, h('div', { class: 'plvl' }, p.go ? 'VISIT' : 'RACE SPOT'), h('div', { class: 'pix acc' }, p.name), h('div', { class: 'dim' }, p.blurb)));
    if (p.go) return h('div', {}, head, btn(p.go === 'Garage' ? 'Go Home' : 'Go to ' + p.name, function () { UI.show(UI[p.go]); }, 'go'));
    if (p.street) return streetView(inst);
    var grid = h('div', { class: 'egrid' }), n = 0;
    // races still to win first, then the ones already won
    st.all.filter(function (ev) { return G.eventVisible(ev) && DR.cityPlaceOf(ev.type) === p; })
      .sort(function (a, b) { return G.eventWon(a) - G.eventWon(b); })
      .forEach(function (ev) { n++; grid.appendChild(eventCard(ev, ev === next)); });
    if (!n) grid = h('div', { class: 'dim cityempty' }, 'No races here in stage ' + (selStage + 1) + ' yet. Keep winning to open this spot up.');
    return h('div', {}, head, grid, p.test ? h('div', { style: { marginTop: '8px' } }, btn('Test & Tune', function () { UI.show(UI.RaceMenu, 'test'); }, 'small')) : null);
  }

  function careerView() {
    var c = G.careerState();
    if (selStage == null || selStage > c.stage) selStage = c.stage;
    G.checkContracts().forEach(function (m) { UI.toast(m); });
    var chips = stageChips();
    var st = DR.STAGES[selStage], wins = G.stageWins(selStage);
    var head = h('div', { class: 'stagehead' },
      h('div', { class: 'grow' }, h('div', { class: 'plvl' }, 'STAGE ' + (selStage + 1)), h('div', { class: 'pix acc' }, st.name), h('div', { class: 'dim' }, st.blurb),
        h('div', { class: 'pbar' }, h('b', { style: { width: Math.round(wins / st.events.length * 100) + '%' } })),
        h('div', { class: 'gsmall dim' }, wins + ' / ' + st.events.length + ' races won')),
      sponsorCard(c));
    var grid = h('div', { class: 'egrid' }), hidden = 0, next = null;
    st.all.forEach(function (ev) { if (!next && G.eventVisible(ev) && !G.eventWon(ev) && !G.eventLock(ev)) next = ev; });
    st.all.forEach(function (ev) {
      if (!G.eventVisible(ev)) { hidden++; return; }
      var card = eventCard(ev, ev === next);
      grid.appendChild(card);
      if (ev === next) setTimeout(function () { if (card.scrollIntoView && card.getBoundingClientRect().bottom > window.innerHeight) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 60);
    });
    if (hidden) grid.appendChild(h('div', { class: 'ecard locked hiddenev' }, h('div', { class: 'pix big dim' }, '?'), h('div', { class: 'dim' }, hidden + ' more race' + (hidden > 1 ? 's' : '') + ' — keep winning to reveal them')));
    return h('div', {}, chips, head, grid);
  }
  function sponsorCard(c) {
    var sp = c.sponsor[selStage];
    if (!sp) return h('div', { class: 'spcard empty' }, h('div', { class: 'plvl' }, 'SPONSOR'), h('div', { class: 'dim' }, 'Sponsors pay a signing bonus and a bonus per win. The boss only races sponsored drivers.'),
      btn('Choose Sponsor', function () { sponsorPicker(selStage); }, 'small go'));
    var info = DR.sponsorById(sp.id), pr = G.contractProgress(selStage);
    return h('div', { class: 'spcard', style: { borderLeftColor: info.col } },
      h('div', { class: 'plvl' }, 'SPONSOR'), h('div', { class: 'pix', style: { color: info.col } }, info.name),
      h('div', { class: 'gsmall dim' }, '+' + DR.money(sp.perWin) + ' per win • bonus ' + DR.money(sp.bonus) + (sp.paid ? ' (paid)' : '')),
      pr.lines.map(function (l) { return h('div', { class: 'gsmall ' + (l[2] ? 'good' : '') }, (l[2] ? '✔ ' : '• ') + l[0] + ': ' + l[1]); }));
  }
  function oppCanvas(oi) { return UI.lazyPreview('ecv', oi, { aspect: 0.42 }); }
  function eventCard(ev, isNext) {
    var T = DR.EVENT_TYPES[ev.type], lock = G.eventLock(ev), won = G.eventWon(ev), o = ev.opps[0], oi = G.oppInst(o);
    var who = ev.opps.length > 1 ? ev.opps.map(function (x) { return x.name; }).join(' → ') : o.name;
    var cls = 'ecard t-' + ev.type + (lock ? ' locked' : '') + (won ? ' won' : '') + (isNext ? ' next' : '');
    return h('div', { class: cls },
      h('div', { class: 'ecvwrap' }, oppCanvas(oi), h('span', { class: 'etype' }, ev.type === 'boss' ? 'BOSS' : T.name), won ? h('span', { class: 'ewon' }, 'WON') : null,
        isNext ? h('span', { class: 'enext' }, 'NEXT UP') : null),
      h('div', { class: 'acc ename' }, who),
      h('div', { class: 'dim gsmall' }, DR.CARS[o.carId].name),
      ev.unlocks.length && !won ? h('div', { class: 'gsmall eunl' }, '🔓 ' + ev.unlocks.map(DR.unlockText).join(' • ')) : null,
      lock ? h('div', { class: 'warn gsmall' }, '🔒 ' + lock) : null,
      h('div', { class: 'efoot' }, h('span', { class: 'price' }, DR.money(G.eventReward(ev))),
        btn('Race', function () { if (lock) return UI.toast(lock); DR.Race.careerEvent(ev, 0); }, 'small ' + (lock ? 'disabled' : 'red'))));
  }
  function sponsorPicker(si) {
    var offers = G.sponsorOffers(si), close;
    var rows = offers.map(function (o) {
      var k = o.contract, req = ['Win ' + k.spon + ' sponsor races'];
      if (k.street) req.push('win ' + k.street + ' street races');
      if (k.stars) req.push('reach a ' + (Math.round(k.stars * 100) / 100) + '-star visual rating');
      return h('div', { class: 'spcard', style: { borderLeftColor: o.col } },
        h('div', { class: 'pix', style: { color: o.col } }, o.name), h('div', { class: 'dim' }, o.pitch),
        h('div', { class: 'gsmall' }, 'Contract: ' + req.join(', ') + '.'),
        h('div', { class: 'good gsmall' }, 'Signing ' + DR.money(o.sign) + ' • ' + DR.money(o.perWin) + ' per win • ' + DR.money(o.bonus) + ' when fulfilled'),
        btn('Sign', function () { G.signSponsor(si, o); A.cash(); close(); UI.toast('Signed with ' + o.name + '!'); UI.refresh(); }, 'small go'));
    });
    close = UI.modal([h('h2', {}, 'Stage ' + (si + 1) + ' sponsors'), h('p', { class: 'dim' }, 'You can only sign one per stage, so choose carefully.'), h('div', { class: 'col' }, rows), btn('Not yet', function () { close(); }, 'small')]);
  }

  function streetView(inst) {
    var mine = G.estimate(inst, DR.EIGHTH, 0.85);
    if (!streetOpps) streetOpps = G.streetOpponents(mine.et);
    var bets = [500, 1000, 2500, 5000, 10000, 25000, 50000];
    var grid = h('div', { class: 'egrid' });
    streetOpps.forEach(function (o) {
      var oi = G.oppInst(o);
      grid.appendChild(h('div', { class: 'ecard t-street' },
        h('div', { class: 'ecvwrap' }, oppCanvas(oi), h('span', { class: 'etype' }, 'STREET')),
        h('div', { class: 'acc ename' }, o.name), h('div', { class: 'dim gsmall' }, DR.CARS[o.carId].name),
        h('div', { class: 'efoot' }, h('span', { class: 'price' }, 'Pot ' + DR.money(betSel * 2)),
          btn('Race', function () {
            if (G.state.money < betSel) return UI.toast('You cannot cover that bet');
            var opp = o; streetOpps = null;
            DR.Race.start({ mode: 'street', opp: opp, dist: DR.EIGHTH, theme: 'street', grip: 0.85, bet: betSel });
          }, 'small red'))));
    });
    return h('div', {},
      h('div', { class: 'stagehead' }, h('div', { class: 'grow' }, h('div', { class: 'plvl' }, 'STREET RACE'), h('div', { class: 'pix acc' }, '1/8 mile • night • no prep'),
        h('div', { class: 'dim' }, 'Winner takes the pot. The street has less grip than the strip. Size them up and pick your fight.'))),
      h('div', { class: 'schips' }, h('span', { class: 'pix small', style: { alignSelf: 'center' } }, 'BET'), bets.map(function (b) {
        return chip(DR.money(b), b === betSel, function () { betSel = b; UI.refresh(); }, b > G.state.money ? 'disabled' : '');
      })),
      grid, h('div', { style: { marginTop: '8px' } }, btn('New Opponents', function () { streetOpps = null; UI.refresh(); }, 'small')));
  }

  // little track postcards for the test & tune cards
  function trackThumb(kind) {
    var c = h('canvas', { class: 'ecv', width: 160, height: 70 }), x = c.getContext('2d'), i;
    x.imageSmoothingEnabled = false;
    if (kind === 'street') {
      x.fillStyle = '#070912'; x.fillRect(0, 0, 160, 70);
      for (i = 0; i < 25; i++) { x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect((i * 37) % 160, (i * 13) % 26, 1, 1); }
      for (i = 0; i < 160; i += 26) { x.fillStyle = '#141a2c'; x.fillRect(i, 22 - (i % 3) * 4, 22, 28 + (i % 3) * 4); x.fillStyle = '#ffd27a'; x.fillRect(i + 4, 28, 3, 2); x.fillRect(i + 12, 34, 3, 2); }
      x.fillStyle = '#1b1c22'; x.fillRect(0, 50, 160, 20); x.fillStyle = '#d8d8d8'; for (i = 0; i < 160; i += 20) x.fillRect(i, 60, 10, 1);
      [30, 110].forEach(function (lx) { x.fillStyle = '#333'; x.fillRect(lx, 18, 2, 32); x.fillStyle = '#ffdd88'; x.fillRect(lx - 4, 17, 8, 2); x.fillStyle = 'rgba(255,220,140,.12)'; x.beginPath(); x.moveTo(lx - 3, 19); x.lineTo(lx + 4, 19); x.lineTo(lx + 16, 60); x.lineTo(lx - 15, 60); x.fill(); });
    } else {
      var g = x.createLinearGradient(0, 0, 0, 40); g.addColorStop(0, '#4d8fe0'); g.addColorStop(1, '#bfe0ff');
      x.fillStyle = g; x.fillRect(0, 0, 160, 40);
      x.fillStyle = '#6b7380'; x.fillRect(10, 22, 70, 18); x.fillStyle = '#8a93a2'; for (i = 0; i < 4; i++) x.fillRect(10, 24 + i * 4, 70, 1);
      x.fillStyle = '#2e7d4f'; x.fillRect(0, 38, 160, 4);
      x.fillStyle = '#3a3d44'; x.fillRect(0, 42, 160, 28); x.fillStyle = '#26282d'; x.fillRect(0, 50, 160, 6); x.fillRect(0, 62, 160, 6);
      x.fillStyle = '#fff'; x.fillRect(0, 58, 160, 1);
      x.fillStyle = '#222'; x.fillRect(120, 22, 4, 20); ['#ffcc00', '#ffcc00', '#ffcc00', '#2bd45a'].forEach(function (cc, k) { x.fillStyle = cc; x.fillRect(118, 23 + k * 4, 3, 3); x.fillRect(123, 23 + k * 4, 3, 3); });
      if (kind === 'eighth') { x.fillStyle = '#d23a3a'; x.fillRect(60, 42, 2, 28); }
    }
    return c;
  }
  function testView(inst) {
    var runs = [
      ['quarter', '1/4 Mile', 'Prepped strip, full grip.', { mode: 'test', dist: DR.QUARTER, theme: 'strip', grip: 1 }, inst.best && inst.best.q],
      ['eighth', '1/8 Mile', 'Half the track, all about the launch.', { mode: 'test', dist: DR.EIGHTH, theme: 'strip', grip: 1 }, inst.best && inst.best.e],
      ['street', 'Street 1/8', 'Night, cold asphalt, 85% grip.', { mode: 'test', dist: DR.EIGHTH, theme: 'street', grip: 0.85 }, null]];
    var grid = h('div', { class: 'egrid' });
    runs.forEach(function (r) {
      grid.appendChild(h('div', { class: 'ecard t-test' }, h('div', { class: 'ecvwrap' }, trackThumb(r[0])),
        h('div', { class: 'acc ename' }, r[1]), h('div', { class: 'dim gsmall' }, r[2]),
        h('div', { class: 'efoot' }, h('span', { class: 'gsmall acc' }, r[4] ? 'Best ' + r[4].toFixed(3) + 's' : 'No runs yet'),
          btn('Run', function () { DR.Race.start(r[3]); }, 'small go'))));
    });
    return h('div', {}, h('div', { class: 'stagehead' }, h('div', { class: 'grow' }, h('div', { class: 'plvl' }, 'TEST & TUNE'), h('div', { class: 'pix acc' }, 'Solo passes'),
      h('div', { class: 'dim' }, 'No money on the line - dial in your tune. Your best times are saved.'))), grid);
  }

  // ---------------------------------------------------------------- TUNE
  var TUNE_ICONS = { Engine: 'engine', Drivetrain: 'trans', Tires: 'rtires', Suspension: 'springs', Nitrous: 'nitrous' };
  var tuneGroup = 'Engine';
  function slider(label, val, mn, mx, step, unit, onchange, fmt, onReset) {
    var dec = step < 0.1 ? 2 : step < 1 ? 1 : 0;
    var vEl = h('span', { class: 'val' });
    function show(v) { var f = fmt && fmt(v); vEl.textContent = f || (Number(v).toFixed(dec) + ' ' + unit); }
    var inp = h('input', { type: 'range', min: mn, max: mx, step: step, value: val });
    inp.addEventListener('input', function () { var v = parseFloat(inp.value); show(v); onchange(v); });
    show(val);
    // ↺ puts a changed setting back to its default
    var rs = onReset ? h('button', { class: 'treset', title: 'Back to default', onclick: function (e) { e.stopPropagation(); onReset(); } }, '↺') : null;
    return h('div', { class: 'tune-row' }, h('div', { class: 'lab' }, h('span', {}, label, rs), vEl), inp);
  }
  UI.Tune = function () {
    var inst = G.car(), S = G.spec(inst);
    var rail = h('div', { class: 'srail' }, Object.keys(TUNE_ICONS).map(function (g) {
      return railItem(TUNE_ICONS[g], 3, g, g === tuneGroup, function () { tuneGroup = g; UI.refresh(); });
    }));
    var list = h('div', { class: 'col' });
    var statBox = h('div', { class: 'tstats' }), statInner = h('div');
    var pv = h('canvas', { class: 'preview' }); DR.drawPreview(pv, inst, { aspect: 0.36 });
    statBox.appendChild(pv); statBox.appendChild(statInner);
    var timer = 0;
    function recalc() {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var S2 = G.spec(inst), best = inst.best || {};
        DR.drawPreview(pv, inst, { aspect: 0.36 });   // ride height / rake show on the car
        statInner.innerHTML = '';
        [gst('POWER', UI.fmtHp(S2.peakHp) + ' @ ' + S2.peakHpRpm, 'acc'), gst('TORQUE', Math.round(S2.peakTq) + ' lb-ft'),
          S2.nosHp ? gst('NITROUS', '+' + S2.nosHp + ' hp') : null, gst('REDLINE', S2.red + ' rpm'),
          gst('BEST 1/8', best.e ? best.e.toFixed(3) + 's' : '—', 'good'),
          gst('BEST 1/4', best.q ? best.q.toFixed(3) + 's' : '—', 'good')].concat(UI.riskBox(S2)).forEach(function (el) { if (el) statInner.appendChild(el); });
      }, 120);
    }
    DR.TUNE_DEFS.forEach(function (def) {
      if (def.group !== tuneGroup) return;
      var unlocked = def.show(S);
      if (!unlocked) { list.appendChild(h('div', { class: 'tune-row locked' }, h('div', { class: 'lab' }, h('span', {}, def.label), h('span', { class: 'tag r' }, '🔒 NEEDS PART')), h('div', { class: 'help' }, def.req))); return; }
      if (def.key === 'gears') {
        var gg = h('div', { class: 'gear-grid' });
        S.tune.gears.forEach(function (g, gi) {
          gg.appendChild(slider('Gear ' + (gi + 1), g, 0.5, 4.5, 0.01, ':1', function (v) {
            var arr = (inst.tune.gears || S.tune.gears).slice(); arr[gi] = v; inst.tune.gears = arr; G.save(); recalc();
          }));
        });
        list.appendChild(h('div', { class: 'tune-row' }, h('div', { class: 'lab' }, h('span', {}, def.label,
          inst.tune.gears ? h('button', { class: 'treset', title: 'Back to default', onclick: function () { delete inst.tune.gears; G.save(); UI.refresh(); } }, '↺') : null)), gg));
        return;
      }
      var row = slider(def.label, S.tune[def.key], def.min(S), def.max(S), def.step, def.unit, function (v) { inst.tune[def.key] = v; G.save(); recalc(); }, def.key === 'tcSlip' ? function (v) { return v === 0 ? 'OFF' : null; } : null,
        inst.tune[def.key] != null ? function () { delete inst.tune[def.key]; G.save(); UI.refresh(); } : null);
      row.appendChild(h('div', { class: 'help' }, def.help + (def.key === 'psi' ? ' Ideal: ' + S.tire.optP + ' psi.' : '') + (def.key === 'boost' ? ' Fuel knock limit: ' + S.knock + ' psi.' : '')));
      list.appendChild(row);
    });
    if (!list.children.length) list.appendChild(h('div', { class: 'dim' }, 'Nothing to adjust here yet.'));
    recalc();
    statBox.appendChild(h('div', { class: 'row', style: { flexWrap: 'wrap', marginTop: '6px' } },
      btn('Auto Shift', function () { inst.tune.shiftRpm = DR.suggestShift(G.spec(inst)); G.save(); UI.toast('Shift point set to ' + inst.tune.shiftRpm + ' rpm'); UI.refresh(); }, 'small'),
      btn('Reset', function () { UI.confirm('Reset every tuning value to default?', function () { inst.tune = {}; G.save(); UI.refresh(); }); }, 'small red'),
      btn('Dyno', function () { UI.show(UI.Dyno); }, 'small'),
      btn('Test Run', function () { DR.Race.start({ mode: 'test', dist: DR.QUARTER, theme: 'strip', grip: 1, back: 'tune' }); }, 'small go')));
    return h('div', { class: 'screen' }, UI.top('TUNING', function () { UI.show(UI.Garage); }),
      h('div', { class: 'shopwrap' }, rail, h('div', { class: 'smain tunemain' }, h('div', { class: 'col grow' }, h('h2', {}, tuneGroup), list), statBox)));
  };

  // ---------------------------------------------------------------- DYNO
  // the last pull of each car, drawn faded behind a new one after changes
  var lastPull = {};
  UI.Dyno = function () {
    var inst = G.car(), S = G.spec(inst), dy = DR.dyno(S);
    var bkey = JSON.stringify([inst.engine, inst.parts, inst.tune]), prev = lastPull[inst.uid];
    if (prev && prev.key === bkey) prev = null;
    lastPull[inst.uid] = { key: bkey, pts: dy.pts, peakHp: dy.peakHp, peakTq: dy.peakTq, nosHp: S.nosHp };
    var spr = DR.carSprite(DR.carLook(inst));
    var room = DR.roomCanvas(inst, { theme: 'dyno', spr: spr, S: S, zoom: 2.2 }, 'dynoroom');
    var cv = h('canvas', { class: 'dynograph', width: 480, height: 200 });
    var sweep = { p: 1 }, rpmEl = h('div', { class: 'dynorpm' }, 'READY');
    function draw() {
      var ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#0c0d10'; ctx.fillRect(0, 0, W, H);
      var L = 34, R = W - 30, T = 12, B = H - 22;
      var maxHp = Math.max(100, (dy.peakHp + S.nosHp) * 1.12), maxTq = Math.max(100, dy.peakTq * 1.15 + (S.nosW ? S.nosHp * 5252 / 3000 : 0));
      var maxV = Math.max(maxHp, maxTq), r0 = 1000, r1 = S.red + 200;
      function X(r) { return L + (r - r0) / (r1 - r0) * (R - L); }
      function Y(v) { return B - v / maxV * (B - T); }
      ctx.fillStyle = '#1b1d24';
      for (var r = 1000; r <= r1; r += 1000) { ctx.fillRect(Math.round(X(r)), T, 1, B - T); DR.pixText(ctx, String(r / 1000), Math.round(X(r)) - 1, B + 6, '#666'); }
      var stepV = [25, 50, 100, 200, 250, 500, 1000].filter(function (st) { return maxV / st <= 6; })[0] || 1000;
      for (var v = 0; v <= maxV; v += stepV) { ctx.fillRect(L, Math.round(Y(v)), R - L, 1); DR.pixText(ctx, String(v), 2, Math.round(Y(v)) - 2, '#666'); }
      ctx.fillStyle = 'rgba(255,48,48,.15)'; ctx.fillRect(Math.round(X(S.red)), T, R - Math.round(X(S.red)), B - T);
      ctx.fillStyle = '#ff3030'; ctx.fillRect(Math.round(X(S.red)), T, 1, B - T);
      var limit = r0 + (r1 - r0) * sweep.p;
      function line(key, col, addf) {
        ctx.fillStyle = col;
        for (var i = 1; i < dy.pts.length; i++) {
          var a = dy.pts[i - 1], b = dy.pts[i];
          if (b.rpm > limit) break;
          var va = a[key] + (addf ? addf(a) : 0), vb = b[key] + (addf ? addf(b) : 0);
          var steps = Math.ceil(X(b.rpm) - X(a.rpm));
          for (var k = 0; k <= steps; k++) { var t = k / steps; ctx.fillRect(Math.round(X(a.rpm + (b.rpm - a.rpm) * t)), Math.round(Y(va + (vb - va) * t)), 2, 2); }
        }
      }
      if (prev) {
        // previous pull: faded, full length
        ctx.globalAlpha = 0.35;
        [['tq', '#4da3ff'], ['hp', '#ffcc00']].forEach(function (k) {
          ctx.fillStyle = k[1];
          for (var i = 1; i < prev.pts.length; i++) {
            var a = prev.pts[i - 1], b = prev.pts[i], steps = Math.ceil(X(b.rpm) - X(a.rpm));
            for (var q = 0; q <= steps; q++) { var tt = q / steps; ctx.fillRect(Math.round(X(a.rpm + (b.rpm - a.rpm) * tt)), Math.round(Y(a[k[0]] + (b[k[0]] - a[k[0]]) * tt)), 1, 1); }
          }
        });
        ctx.globalAlpha = 1;
      }
      if (S.nosHp) line('hp', '#7a3ad6', function (p) { return p.rpm > 2200 ? S.nosHp : 0; });
      line('tq', '#4da3ff'); line('hp', '#ffcc00');
      if (S.fiType !== 'none') { ctx.fillStyle = '#46e07a'; dy.pts.forEach(function (p) { if (p.rpm <= limit) ctx.fillRect(Math.round(X(p.rpm)), Math.round(B - p.boost / Math.max(S.maxBoost, 1) * (B - T) * 0.5), 1, 1); }); }
      if (sweep.p < 1) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(Math.round(X(limit)), T, 1, B - T); }
      DR.pixText(ctx, 'HP', R + 6, T + 2, '#ffcc00'); DR.pixText(ctx, 'TQ', R + 6, T + 10, '#4da3ff');
      if (S.fiType !== 'none') DR.pixText(ctx, 'PSI', R + 2, T + 18, '#46e07a');
      if (S.nosHp) DR.pixText(ctx, 'N2O', R + 2, T + 26, '#9b4dff');
      DR.pixText(ctx, 'RPM X1000', Math.round((L + R) / 2) - 18, B + 13, '#666');
    }
    var info = h('div', { class: 'tstats' },
      h('div', { class: 'row', style: { marginBottom: '6px' } }, btn('▶ Run Dyno', run, 'go'), btn('Tune', function () { UI.show(UI.Tune); })),
      gst('PEAK HP', Math.round(dy.peakHp) + ' @ ' + dy.peakHpRpm + delta(dy.peakHp, prev && prev.peakHp), 'acc'), gst('PEAK TQ', Math.round(dy.peakTq) + ' lb-ft' + delta(dy.peakTq, prev && prev.peakTq)),
      prev ? h('div', { class: 'gsmall dim' }, 'Faded lines: your last pull before the changes.') : null,
      S.nosHp ? gst('W/ NITROUS', Math.round(dy.peakHp + S.nosHp) + ' hp', 'acc') : null,
      S.fiType !== 'none' ? gst('BOOST', S.boostSet.toFixed(1) + ' psi') : null,
      gst('LIMITER', S.red + ' rpm' + (S.ecu === 0 ? ' (stock)' : ''), S.red > S.mech ? 'bad' : ''),
      S.rotary ? null : gst('VALVETRAIN', S.vtLimit + ' rpm', S.red > S.vtLimit ? 'bad' : ''), gst(S.rotary ? 'ROTATING' : 'BOTTOM END', S.beLimit + ' rpm (' + DR.catName(S.beWeak, inst).toLowerCase() + ')', S.red > S.beLimit ? 'bad' : ''),
      gst('SAFE POWER', Math.round(S.safeHp) + ' hp (' + DR.catName(S.safeWeak, inst).toLowerCase() + ')', (dy.peakHp + S.nosHp) > S.safeHp ? 'bad' : 'good'),
      gst('FUEL', Math.round(S.fuelW / DR.HP) + ' hp (' + (S.fuelInj < S.fuelPump ? 'injectors' : S.fuelPump < S.fuelInj ? 'pump' : 'stock') + ')', S.fuelW < dy.peakHp * DR.HP * 1.001 ? 'bad' : ''),
      S.fiType !== 'none' && !S.diesel ? gst('IGNITION', S.sparkPsi + ' psi', S.boostSet > S.sparkPsi ? 'bad' : '') : null,
      UI.riskBox(S));
    function delta(v, p0) { if (p0 == null) return ''; var d = Math.round(v - p0); return d ? ' (' + (d > 0 ? '+' : '') + d + ')' : ''; }
    draw();
    // match the graph's pixels to its on-screen size so the text stays square
    setTimeout(function () { var rc = cv.getBoundingClientRect(); if (rc.width > 50 && rc.height > 50) { cv.width = Math.round(rc.width / 1.5); cv.height = Math.round(rc.height / 1.5); draw(); } }, 0);
    var raf = 0, voice = null, idleRaf = 0;
    function drawRoom(spin, running) { var o = Object.assign({}, room._opts, { spin: spin, running: running }); DR.drawRoom(room, inst, o); }
    function run() {
      A.init(); A.resume();
      if (voice) return;
      if (A.wkPending) { A.whenReady(run); return; }
      voice = A.engine(S.eng, 0.8, A.buildOf(S));
      var t0 = performance.now(), ang = 0, last = t0;
      sweep.p = 0;
      (function tick() {
        var now = performance.now(), t = (now - t0) / 3000;
        sweep.p = Math.min(1, t);
        var rpm = 1000 + (S.red + 200 - 1000) * sweep.p;
        A.update(voice, rpm, 1, DR.steadyBoost(S, rpm), 0, S.fiType);
        ang += (now - last) / 1000 * rpm / 300; last = now;
        rpmEl.textContent = Math.round(rpm) + ' RPM';
        draw(); drawRoom(ang, true);
        if (t < 1) raf = requestAnimationFrame(tick);
        else {
          A.update(voice, S.idle, 0, 0, 0, S.fiType); rpmEl.textContent = 'PEAK ' + Math.round(dy.peakHp) + ' HP';
          var t1 = performance.now();
          (function coast() { var k = (performance.now() - t1) / 1500; ang += 0.4 * (1 - k); drawRoom(ang, false); if (k < 1) idleRaf = requestAnimationFrame(coast); })();
          setTimeout(function () { A.stopAll(); voice = null; }, 900);
        }
      })();
    }
    UI.cleanup = function () { cancelAnimationFrame(raf); cancelAnimationFrame(idleRaf); A.stopAll(); voice = null; };
    return h('div', { class: 'screen' }, UI.top('DYNO', function () { UI.show(UI.Garage); }),
      h('div', { class: 'dynowrap' }, h('div', { class: 'dynomain' }, h('div', { class: 'dynoscene' }, room, rpmEl), cv), info));
  };

  // ---------------------------------------------------------------- DEALER
  // PCR-style bars, scaled against every car on sale
  var BAR_MAX = null;
  // a rough top-end index from power, weight and drag (not a time)
  function speedIdx(S) { return Math.pow(S.peakHp / (S.cda + S.m / 4000), 1 / 3); }
  function statBars(S) {
    if (!BAR_MAX) {
      BAR_MAX = { hp: 1, trap: 1, m: 1, mu: 1 };
      Object.keys(DR.CARS).forEach(function (cid) {
        var c = DR.CARS[cid], i = { carId: cid, engine: c.engine, parts: {}, tune: {} }, s2 = DR.buildSpec(i);
        BAR_MAX.hp = Math.max(BAR_MAX.hp, s2.peakHp); BAR_MAX.trap = Math.max(BAR_MAX.trap, speedIdx(s2)); BAR_MAX.m = Math.max(BAR_MAX.m, s2.m); BAR_MAX.mu = Math.max(BAR_MAX.mu, s2.tire.mu);
      });
    }
    function bar(label, f) {
      var b = h('div', { class: 'sbar' }); for (var i = 0; i < 10; i++) b.appendChild(h('i', { class: i < Math.round(f * 10) ? 'on' : '' }));
      return h('div', { class: 'sbarrow' }, h('span', { class: 'k' }, label), b);
    }
    return h('div', { class: 'sbars' }, bar('SPEED', speedIdx(S) / BAR_MAX.trap), bar('POWER', S.peakHp / BAR_MAX.hp), bar('WEIGHT', S.m / BAR_MAX.m), bar('GRIP', S.tire.mu / BAR_MAX.mu));
  }
  var dealerCat = DR.CAR_CATS[0], dealerIdx = 0;
  UI.Dealer = function () {
    var ids = Object.keys(DR.CARS).filter(function (id) { return DR.CARS[id].cat === dealerCat; }).sort(function (a, b) { return DR.CARS[a].price - DR.CARS[b].price; });
    if (dealerIdx >= ids.length) dealerIdx = 0;
    var rail = h('div', { class: 'srail' }, DR.CAR_CATS.map(function (c, k) {
      var it = railItem('u_car', [2, 3, 4, 5, 1][k % 5], c, c === dealerCat, function () { dealerCat = c; dealerIdx = 0; UI.refresh(); });
      if (G.newCarCount(c)) it.appendChild(h('span', { class: 'newdot' }, 'NEW'));
      return it;
    }));
    var id = ids[dealerIdx], car = DR.CARS[id], inst = { carId: id, engine: car.engine, parts: {}, tune: {}, vis: {}, color: car.col };
    var wasNew = G.isNewCar(id); G.markCarSeen(id);
    var S = DR.buildSpec(inst), locked = !G.carUnlocked(id), owned = G.state.cars.filter(function (c) { return c.carId === id; }).length;
    var all = Object.keys(DR.CARS).sort(function (a, b) { return DR.CARS[a].price - DR.CARS[b].price; }), ai = all.indexOf(id);
    function stockInst(cid) { var c3 = DR.CARS[cid]; return { carId: cid, engine: c3.engine, parts: {}, tune: {}, color: c3.col }; }
    var side = all.length > 1 ? [stockInst(all[(ai - 1 + all.length) % all.length]), stockInst(all[(ai + 1) % all.length])] : [];
    var cv = UI.dragCam(DR.roomCanvas(inst, { theme: 'lot', side: side }));
    function cyc(d) { dealerIdx = (dealerIdx + d + ids.length) % ids.length; UI.refresh(); }
    var strip = h('div', { class: 'dstrip' }, ids.map(function (cid, k) {
      var c2 = DR.CARS[cid], i2 = { carId: cid, engine: c2.engine, parts: {}, tune: {}, color: c2.col };
      var t = UI.lazyPreview('ecv', i2, { aspect: 0.42 });
      return h('div', { class: 'dthumb' + (k === dealerIdx ? ' on' : '') + (G.carUnlocked(cid) ? '' : ' locked'), onclick: function () { dealerIdx = k; UI.refresh(); } }, t, h('span', {}, c2.name),
        G.isNewCar(cid) || (cid === id && wasNew) ? h('b', { class: 'newdot' }, 'NEW') : null);
    }));
    return h('div', { class: 'screen' }, UI.top('DEALERSHIP', function () { UI.show(UI.Garage); }),
      h('div', { class: 'shopwrap' }, rail, h('div', { class: 'dmain' },
        h('div', { class: 'gwrap' }, cv,
          h('div', { class: 'gside' }, h('div', { class: 'pix acc' }, car.name),
            h('div', { class: 'gsmall dim' }, car.real), statBars(S),
            gst('ENGINE', S.eng.name), gst('POWER', Math.round(S.peakHp) + ' hp', 'acc'), gst('TORQUE', Math.round(S.peakTq) + ' lb-ft'),
            gst('WEIGHT', UI.kgLb(S.m) + ' ' + Math.round(S.f * 100) + '%F'), gst('DRIVE', S.drive + ' • ' + DR.TRANS[S.transId].ratios.length + '-spd'),
            gst('TIRES', S.tire.name),
            owned ? h('div', { class: 'gsmall acc' }, 'You own ' + owned) : null),
          h('div', { class: 'gsel' }, ids.length > 1 ? btn('◀', function () { cyc(-1); }, 'arrow') : null,
            h('div', { class: 'gname' }, h('div', { class: 'price big' }, DR.money(car.price)), h('div', { class: 'dim' }, (dealerIdx + 1) + ' / ' + ids.length + ' • ' + dealerCat)),
            ids.length > 1 ? btn('▶', function () { cyc(1); }, 'arrow') : null,
            btn('Test Drive', function () {
              var td = { uid: -2, carId: id, engine: car.engine, parts: {}, tune: {}, vis: {}, color: car.col, best: {}, inv: [] };
              DR.Race.start({ mode: 'test', inst: td, dist: DR.QUARTER, theme: 'strip', grip: 1 });
            }, 'small'),
            locked ? h('span', { class: 'tag' }, '🔒 STAGE ' + (DR.CAR_STAGE[id] + 1)) : btn('Buy', function () {
              if (!G.canAfford(car.price)) return UI.toast('Not enough money');
              UI.confirm('Buy the ' + car.name + ' for ' + DR.money(car.price) + '?', function () { G.buyCar(id); A.cash(); UI.toast('You bought the ' + car.name + '!'); UI.show(UI.Garage); }, 'Buy');
            }, 'go' + (G.canAfford(car.price) ? '' : ' disabled')))),
        strip)));
  };

  // ---------------------------------------------------------------- MY CARS
  UI.Cars = function () {
    var grid = h('div', { class: 'egrid' });
    G.state.cars.forEach(function (inst) {
      var S = DR.buildSpec(inst), active = inst.uid === G.state.active, stars = DR.starRating(inst);
      var cv = UI.lazyPreview('ecv', inst, { aspect: 0.42 });
      grid.appendChild(h('div', { class: 'ecard' + (active ? ' won' : '') },
        h('div', { class: 'ecvwrap' }, cv, active ? h('span', { class: 'etype good' }, 'DRIVING') : null, inst.damage ? h('span', { class: 'ewon bad' }, 'BROKEN') : null),
        h('div', { class: 'acc ename' }, DR.CARS[inst.carId].name),
        h('div', { class: 'gsmall dim' }, Math.round(S.peakHp + S.nosHp) + ' hp • ' + UI.kgLb(S.m) + ' • ' + (Math.round(stars * 100) / 100) + ' stars'),
        h('div', { class: 'gsmall' }, inst.best && inst.best.q ? 'Best 1/4: ' + inst.best.q.toFixed(3) + 's' : 'No timeslip yet'),
        h('div', { class: 'efoot' },
          active ? h('span', { class: 'tag g' }, 'IN THE BAY') : btn('Drive', function () { G.state.active = inst.uid; G.save(); UI.show(UI.Garage); }, 'small go'),
          G.state.cars.length > 1 ? btn('Sell ' + DR.money(G.carValue(inst)), function () {
            UI.confirm('Sell the ' + DR.CARS[inst.carId].name + ' for ' + DR.money(G.carValue(inst)) + '? Installed parts go with it.', function () { G.sellCar(inst.uid); A.cash(); UI.refresh(); }, 'Sell');
          }, 'small red') : null)));
    });
    return h('div', { class: 'screen' }, UI.top('MY CARS', function () { UI.show(UI.Garage); }, btn('Dealer ▶', function () { UI.show(UI.Dealer); }, 'small')), h('div', { class: 'content' }, grid));
  };

  // ---------------------------------------------------------------- PAINT
  var paintTab = 'color';
  var PAINT_TABS = [['color', 'Body', 400, 'u_paint'], ['stripe', 'Stripe', 200, 'v_vinyl'], ['rim', 'Wheels', 150, 'wheels']];
  var RIM_COLS = ['#c8c8c8', '#ffffff', '#ffd700', '#151515', '#d23a3a', '#3a7bd2', '#7cd320', '#ff6a00', '#8a8f99', '#b06bff'];
  var paintDraft = null;
  UI.Paint = function () {
    var inst = G.car();
    if (!paintDraft || paintDraft.uid !== inst.uid) paintDraft = { uid: inst.uid, color: inst.color, stripe: inst.stripe, rim: inst.rim };
    var d = paintDraft;
    function look() { return { carId: inst.carId, engine: inst.engine, parts: inst.parts, vis: inst.vis, color: d.color, stripe: d.stripe, rim: d.rim }; }
    function cost() { return (d.color !== inst.color ? 400 : 0) + (d.stripe !== inst.stripe ? 200 : 0) + (d.rim !== inst.rim ? 150 : 0); }
    var cv = UI.dragCam(DR.roomCanvas(look(), { theme: 'garage' }));
    var costEl = h('span', { class: 'pix acc' });
    function redraw() { DR.drawRoom(cv, look(), cv._opts); costEl.textContent = 'COST ' + DR.money(cost()); }
    var rail = h('div', { class: 'srail' }, PAINT_TABS.map(function (t) {
      return railItem(t[3], 3, t[1] + ' $' + t[2], t[0] === paintTab, function () { paintTab = t[0]; UI.refresh(); });
    }));
    var colors = paintTab === 'rim' ? RIM_COLS : DR.PAINTS;
    var sw = h('div', { class: 'swatches big' });
    if (paintTab === 'stripe') sw.appendChild(h('div', { class: 'sw' + (!d.stripe ? ' on' : ''), style: { background: 'repeating-linear-gradient(45deg,#333 0 4px,#555 4px 8px)' }, onclick: function () { d.stripe = ''; mark(this); redraw(); } }));
    colors.forEach(function (c) { sw.appendChild(h('div', { class: 'sw' + (d[paintTab] === c ? ' on' : ''), style: { background: c }, onclick: function () { d[paintTab] = c; mark(this); redraw(); } })); });
    function mark(el) { Array.prototype.forEach.call(sw.children, function (x) { x.classList.remove('on'); }); el.classList.add('on'); }
    redraw();
    var apply = btn('Apply', function () {
      var c = cost();
      if (!c) return UI.toast('Nothing changed');
      if (!G.canAfford(c)) return UI.toast('Not enough money');
      G.pay(c); inst.color = d.color; inst.stripe = d.stripe; inst.rim = d.rim; G.save(); A.cash(); UI.toast('Fresh paint!');
      paintDraft = null;
      UI.afterStars(G.noteStars());
      UI.show(UI.Garage);
    }, 'go');
    return h('div', { class: 'screen' }, UI.top('PAINT SHOP', function () { paintDraft = null; UI.show(UI.Garage); }, btn('Body Shop ▶', function () { UI.show(UI.Body); }, 'small')),
      h('div', { class: 'shopwrap' }, rail, h('div', { class: 'dmain' },
        h('div', { class: 'gwrap' }, cv, h('div', { class: 'gsel topsel' }, costEl, btn('Undo', function () { paintDraft = null; UI.refresh(); }, 'small'), apply)),
        h('div', { class: 'paintbar' }, h('div', { class: 'plvl' }, paintTab === 'stripe' ? 'STRIPE • +0.25 STARS' : paintTab === 'rim' ? 'WHEEL COLOR' : 'BODY COLOR'), sw))));
  };
})();
