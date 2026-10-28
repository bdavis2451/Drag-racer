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
    return h('div', { class: 'screen title2' }, cv, h('div', { class: 'titlemus' }, UI.musicBtn()),
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
          gst('ENGINE', S.eng.name), gst('POWER', Math.round(S.peakHp) + ' hp', 'acc'), gst('WEIGHT', UI.kgLb(S.m)), gst('DRIVE', S.drive)),
        h('div', { class: 'gsel' }, btn('◀', function () { cyc(-1); }, 'arrow'),
          h('div', { class: 'gname' }, h('div', { class: 'pix acc' }, car.name), h('div', { class: 'dim' }, (starterIdx % ids.length + 1) + ' / ' + ids.length + ' • free, plus ' + DR.money(G.defaults().money) + ' for parts')),
          btn('▶', function () { cyc(1); }, 'arrow'),
          btn('Choose', function () { G.newGame(id); UI.toast('Welcome to the strip! You have ' + DR.money(G.state.money) + ' to spend.'); UI.show(UI.Garage); }, 'go'))));
  };

  // ---------------------------------------------------------------- RACE MENU
  var streetOpps = null, selStage = null, seenStage = null, betSel = 1000;
  // the stage to show: the newest one as soon as it opens up (or after a
  // new game), otherwise whichever the player picked
  // the last race tab, stage, tune section, dealer category and paint tab,
  // kept in the save (UI.remember)
  function memory() {
    var m = UI.memory('screens');
    if (!m) return;
    if (['map', 'career', 'street', 'test', 'circuit'].indexOf(m.raceTab) >= 0) UI.raceTab = m.raceTab;
    if (m.selStage != null) { selStage = m.selStage; seenStage = m.seenStage; }
    if (TUNE_ICONS[m.tuneGroup]) tuneGroup = m.tuneGroup;
    if (DR.CAR_CATS.indexOf(m.dealerCat) >= 0) dealerCat = m.dealerCat;
    if (PAINT_TABS.some(function (t) { return t[0] === m.paintTab; })) paintTab = m.paintTab;
  }
  function remember() { UI.remember({ raceTab: UI.raceTab, selStage: selStage, seenStage: seenStage, tuneGroup: tuneGroup, dealerCat: dealerCat, paintTab: paintTab }); }
  function pickStage(c) {
    if (selStage == null || selStage > c.stage || seenStage !== c.stage) selStage = c.stage;
    seenStage = c.stage;
  }
  UI.RaceMenu = function (tab) {
    memory();
    tab = tab || UI.raceTab || 'career';
    if (tab === 'street') tab = 'map';
    UI.raceTab = tab;
    remember();
    var inst = G.car();
    var rail = h('div', { class: 'srail' },
      railItem('u_career', 2, 'Drag Career', tab === 'career', function () { UI.show(UI.RaceMenu, 'career'); }),
      railItem('u_test', 2, 'Drag Test', tab === 'test', function () { UI.show(UI.RaceMenu, 'test'); }),
      railItem('u_map', 2, 'City Map', tab === 'map', function () { UI.show(UI.RaceMenu, 'map'); }),
      railItem('u_circuit', 2, 'Race Team', tab === 'circuit', function () { UI.show(UI.RaceMenu, 'circuit'); }));
    var body = tab === 'map' ? mapView(inst) : tab === 'career' ? careerView() : tab === 'circuit' ? UI.circuitView(inst) : testView(inst);
    return h('div', { class: 'screen' }, UI.top('RACE', function () { UI.show(UI.Garage); }, h('span', { class: 'topcar' }, tab === 'circuit' ? UI.circuitBest(inst) : bestText(inst))),
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
    st.all.forEach(function (ev) { if (!next && !ev.side && G.eventVisible(ev) && !G.eventWon(ev) && !G.eventLock(ev)) next = ev; });
    return next;
  }

  // the street map: the city's street-race spots. Tap one to see who is
  // there and what they race for; more spots open up with the career.
  var selPlace = null, cityView = null;
  function spotOpen(p) { return G.careerState().stage >= p.stage; }
  function mapView(inst) {
    var pins = {};
    DR.CITY.forEach(function (p) { pins[p.id] = p.circuit ? { circuit: true } : spotOpen(p) ? { street: true } : {}; });
    if (!selPlace || !DR.CITY.some(function (p) { return p.id === selPlace; })) selPlace = DR.CITY[0].id;
    var place = DR.CITY.filter(function (p) { return p.id === selPlace; })[0];
    var cv = h('canvas', { class: 'citycv' }), t0 = Date.now(), last = -1, dirty = true;
    if (!cityView) cityView = DR.cityView();
    function redraw() { dirty = true; }
    (function frame() {
      if (!cv.isConnected && last >= 0) return;
      var f = Math.floor((Date.now() - t0) / 80);
      if (f !== last || dirty) { last = f; dirty = false; DR.drawCityMap(cv, pins, selPlace, (Date.now() - t0) / 1000, cityView); }
      requestAnimationFrame(frame);
    })();
    var ctl = DR.cityMapControl(cv, cityView, function (p) {
      if (!p || p.id === selPlace) return;
      selPlace = p.id; streetOpps = null; A.click(); UI.refresh();
    }, redraw);
    var spots = DR.CITY.filter(function (p) { return !p.circuit; }), open = spots.filter(spotOpen).length;
    var legend = h('div', { class: 'gsmall dim citylegend' },
      h('span', { class: 'lg g' }, 'street race'), h('span', { class: 'lg c' }, 'circuit'), h('span', { class: 'lg' }, 'opens later'), h('span', {}, open + ' / ' + spots.length + ' spots open'), h('span', {}, 'drag / pinch to zoom'));
    return h('div', {},
      h('div', { class: 'citywrap' }, h('div', { class: 'citymap' }, h('div', { class: 'cityframe' }, cv, zoomBar(ctl)), legend), h('div', { class: 'cityside' }, place.circuit ? circuitSpot(place) : streetView(inst, place))));
  }
  function zoomBar(ctl) {
    return h('div', { class: 'cityzoom' }, btn('+', function () { ctl.zoomBy(1.5); }, 'small'), btn('−', function () { ctl.zoomBy(1 / 1.5); }, 'small'), btn('⤢', function () { ctl.reset(); }, 'small'));
  }

  // The stage as a road (No Limits style): races in the order they open,
  // two stacked where you can pick either, side races branching off above,
  // and the boss at the end. Tap a stop to see it on the right.
  var selEv = null;
  var NODE_GLYPH = { quarter: '1/4', eighth: '1/8', street: 'ST', knockout: 'KO', sponsor: 'SPON', showcase: 'NP', show: 'SHOW', boss: 'KING', 'class': 'SIDE', bracket: 'BKT' };
  var careerTab = 'days';
  // the class page: its race days, its ladder, and the Kings
  function careerView() {
    var c = G.careerState();
    pickStage(c); remember();
    var tabs = h('div', { class: 'schips' },
      chip('Race Days', careerTab === 'days', function () { careerTab = 'days'; UI.refresh(); }),
      chip('Ladder', careerTab === 'ladder', function () { careerTab = 'ladder'; UI.refresh(); }),
      chip('Kings', careerTab === 'kings', function () { careerTab = 'kings'; UI.refresh(); }),
      h('span', { class: 'gsmall acc', style: { marginLeft: 'auto' } }, 'Class rep ' + G.rep(selStage)));
    if (careerTab === 'ladder') return h('div', {}, stageChips(), tabs, ladderView(selStage));
    if (careerTab === 'kings') return h('div', {}, tabs, kingsView());
    return h('div', {}, stageChips(), tabs, raceDaysView(c));
  }
  // the ladder: #5 up to #1, then the King. Call out the rival above you
  // once your rep in the class is high enough.
  function ladderView(si) {
    var st = DR.STAGES[si], pos = G.ladderPos(si), rows = [];
    var king = st.boss, kLock = G.eventLock(king), kWon = G.eventWon(king);
    rows.push(h('div', { class: 'lrow king' + (kWon ? ' won' : '') },
      h('span', { class: 'lpos' }, '♛'), h('div', { class: 'grow' }, h('div', { class: 'acc' }, king.opps[0].name + ' — King'), h('div', { class: 'dim gsmall' }, DR.CARS[king.opps[0].carId].name + ' • races for the car')),
      kWon ? h('span', { class: 'good' }, 'BEATEN') : kLock ? h('span', { class: 'dim gsmall' }, '🔒 ' + kLock) : btn('Race', function () { DR.Race.raceDay(DR.Race.eventCfg(king, 0), 'King of ' + st.name); }, 'small red')));
    G.ladder(si).slice().reverse().forEach(function (ev) {
      var o = ev.opps[0], beaten = ev.rung < pos, lock = G.calloutLock(ev), est = G.estimate(G.oppInst(o), DR.QUARTER).et;
      rows.push(h('div', { class: 'lrow' + (beaten ? ' won' : '') + (ev.rung === pos ? ' next' : '') },
        h('span', { class: 'lpos' }, '#' + (5 - ev.rung)), h('div', { class: 'grow' }, h('div', {}, o.name), h('div', { class: 'dim gsmall' }, DR.CARS[o.carId].name + ' • posted ' + est.toFixed(2))),
        beaten ? h('span', { class: 'good gsmall' }, 'BEATEN ') : null,
        lock && !beaten ? h('span', { class: 'dim gsmall' }, '🔒 ' + lock) : btn(beaten ? 'Rematch' : 'Call out', function () { DR.Race.raceDay(DR.Race.eventCfg(ev, 0), 'Callout: ' + o.name); }, 'small ' + (beaten ? '' : 'red'))));
      if (ev.rung === pos) rows.push(h('div', { class: 'lrow you' }, h('span', { class: 'lpos' }, '▲'), h('div', { class: 'grow acc' }, 'You'), h('span', { class: 'dim gsmall' }, 'rep ' + G.rep(si) + ' / next callout ' + DR.LADDER_REP[pos])));
    });
    if (pos >= 5 && !kWon) rows.splice(1, 0, h('div', { class: 'lrow you' }, h('span', { class: 'lpos' }, '▲'), h('div', { class: 'grow acc' }, 'You: #1'), h('span', {}, '')));
    return h('div', { class: 'ladder' }, h('div', { class: 'dim gsmall' }, 'Race days earn rep. With enough, call out the rival above you: win and take their spot. Any callout can be run for pink slips.'), rows);
  }
  function kingsView() {
    return h('div', { class: 'kings' }, Object.keys(DR.KINGS).map(function (d) {
      var K = DR.KINGS[d], won = G.kingWon(d), lock = G.kingLock(d);
      return h('div', { class: 'kcard' + (won ? ' won' : '') },
        h('div', { class: 'pix acc' }, K.name), h('div', { class: 'dim gsmall' }, K.blurb),
        K.ev ? h('div', { class: 'gsmall' }, K.ev.opps[K.ev.opps.length - 1].name + ' • ' + DR.CARS[K.ev.opps[K.ev.opps.length - 1].carId].name) : null,
        d !== 'circuit' && d !== 'headsup' ? h('div', { class: 'gsmall' }, DR.DISC[d] + ' rep: ' + G.discRep(d) + ' / ' + DR.KING_REP) : null,
        won ? h('div', { class: 'good' }, '♛ YOURS') : d === 'circuit' ? h('div', { class: 'dim gsmall' }, 'Not yet.') :
          lock ? h('div', { class: 'dim gsmall' }, '🔒 ' + lock) : btn('Race the King', function () { DR.Race.raceDay(DR.Race.eventCfg(K.ev, 0), K.name); }, 'small red'));
    }));
  }
  function raceDaysView(c) {
    G.checkContracts().forEach(function (m) { UI.toast(m); });
    var st = DR.STAGES[selStage], wins = G.stageWins(selStage), next = nextEvent(st), arriving = !UI.refreshing;
    if (arriving) selEv = null;
    if (!selEv || selEv.stage !== selStage || !G.eventVisible(selEv)) selEv = next || st.boss;
    var cols = [];
    function col(n) { while (cols.length <= n) cols.push({ main: [], side: [] }); return cols[n]; }
    st.events.slice().sort(function (a, b) { return a.needWins - b.needWins || a.idx - b.idx; }).forEach(function (ev) { col(ev.needWins).main.push(ev); });
    var bossCol = col(Math.max(cols.length, st.boss.needWins)); bossCol.main.push(st.boss); bossCol.boss = true;
    st.side.forEach(function (ev) { col(Math.min(ev.needWins, cols.length - 1)).side.push(ev); });
    function node(ev) {
      var vis = G.eventVisible(ev), won = G.eventWon(ev), lock = vis && G.eventLock(ev);
      var cls = 'rnode t-' + ev.type + (won ? ' won' : '') + (!vis ? ' hidden' : lock ? ' locked' : '') + (ev === next ? ' next' : '') + (ev === selEv ? ' sel' : '');
      var label = !vis ? '?' : ev.cls ? DR.CLASSES[ev.cls].name.split(' ')[0].toUpperCase() : NODE_GLYPH[ev.type] || ev.type;
      return h('div', { class: cls, onclick: function () { if (!vis) return UI.toast('Win more races in this stage to reveal this one'); selEv = ev; A.click(); UI.refresh(); } },
        h('span', { class: 'rglyph' }, label), won ? h('span', { class: 'rmark good' }, '✔') : lock && vis ? h('span', { class: 'rmark' }, '🔒') : null);
    }
    var road = h('div', { class: 'road' }, cols.map(function (k, i) {
      return h('div', { class: 'rcol' + (k.boss ? ' boss' : '') + (k.main.length > 1 ? ' fork' : '') },
        h('div', { class: 'rside' }, k.side.map(function (ev) { return h('div', { class: 'rbranch' + (ev.type === 'show' ? ' show' : '') }, node(ev)); })),
        h('div', { class: 'rmain' }, k.main.map(node)),
        h('div', { class: 'rwins gsmall dim' }, k.boss ? 'KING' : 'WEEK ' + (i + 1)));
    }));
    var head = h('div', { class: 'rhead' },
      h('div', { class: 'grow' }, h('span', { class: 'pix acc' }, st.name), ' ', h('span', { class: 'gsmall dim' }, wins + ' / ' + st.events.length + ' won'),
        h('div', { class: 'pbar' }, h('b', { style: { width: Math.round(wins / st.events.length * 100) + '%' } }))));
    var side = h('div', { class: 'rdetail' }, eventCard(selEv, selEv === next), sponsorCard(c));
    setTimeout(function () { var el = road.querySelector('.rnode.sel'); if (el && arriving) road.scrollLeft = Math.max(0, el.offsetLeft - road.clientWidth / 2 + 28); }, 0);
    return h('div', { class: 'rwrap' }, h('div', { class: 'rleft' }, head, road, h('div', { class: 'gsmall dim rtip' }, 'Each week opens as you win race days. Side races (class shootouts, brackets, shows) sit above the road.')), side);
  }
  function sponsorCard(c) {
    var sp = c.sponsor[selStage];
    if (!sp) return h('div', { class: 'spcard empty' }, h('div', { class: 'plvl' }, 'SPONSOR'), h('div', { class: 'dim' }, 'Sponsors pay a signing bonus and a bonus per win. The boss only races sponsored drivers. Fulfil the contract for a big bonus plus a free car and a new garage slot.'),
      btn('Choose Sponsor', function () { sponsorPicker(selStage); }, 'small go'));
    var info = DR.sponsorById(sp.id), pr = G.contractProgress(selStage);
    return h('div', { class: 'spcard', style: { borderLeftColor: info.col } },
      h('div', { class: 'plvl' }, 'SPONSOR'), h('div', { class: 'pix', style: { color: info.col } }, info.name),
      h('div', { class: 'gsmall dim' }, '+' + DR.money(sp.perWin) + ' per win • contract: ' + DR.money(sp.bonus) + ' + a free car' + (sp.paid ? ' (paid)' : '')),
      pr.lines.map(function (l) { return h('div', { class: 'gsmall ' + (l[2] ? 'good' : '') }, (l[2] ? '✔ ' : '• ') + l[0] + ': ' + l[1]); }));
  }
  function oppCanvas(oi) { return UI.lazyPreview('ecv', oi, { aspect: 0.42 }); }
  function showCard(ev) {
    var sh = DR.showById(ev.show), lock = G.eventLock(ev), won = G.eventWon(ev), issue = G.car() ? G.carIssue(G.car(), ev) : '';
    return h('div', { class: 'ecard t-show' + (lock ? ' locked' : '') + (won ? ' won' : '') },
      h('div', { class: 'ecvwrap' }, DR.showThumb(sh, G.car()), h('span', { class: 'etype' }, 'CAR SHOW'), won ? h('span', { class: 'ewon' }, 'WON') : null),
      h('div', { class: 'acc ename' }, sh.name),
      h('div', { class: 'dim gsmall' }, sh.where + (sh.night ? ' • night (neon counts)' : '')),
      h('div', { class: 'gsmall acc' }, 'Side event • ' + DR.showGoal(ev).replace(' at the ' + sh.name, '')),
      lock ? h('div', { class: 'warn gsmall' }, '🔒 ' + lock) : null,
      !lock && issue ? h('div', { class: 'warn gsmall' }, '⚠ ' + issue) : null,
      h('div', { class: 'efoot' }, h('span', { class: 'price' }, DR.money(G.eventReward(ev))), h('span', { class: 'dim gsmall' }, sh.entry ? 'Entry ' + DR.money(sh.entry) : 'Free entry'),
        btn('Enter', function () { if (lock || issue) return UI.toast(lock || issue); DR.enterShow(sh, ev); }, 'small ' + (lock || issue ? 'disabled' : 'go'))));
  }
  function eventCard(ev, isNext) {
    if (ev.type === 'show') return showCard(ev);
    var T = DR.EVENT_TYPES[ev.type], lock = G.eventLock(ev), won = G.eventWon(ev), o = ev.opps[0], oi = G.oppInst(o);
    var issue = G.car() ? G.carIssue(G.car(), ev) : '';
    var who = ev.opps.length > 1 ? ev.opps.map(function (x) { return x.name; }).join(' → ') : o.name;
    var cls = 'ecard t-' + ev.type + (lock ? ' locked' : '') + (won ? ' won' : '') + (isNext ? ' next' : '');
    return h('div', { class: cls },
      h('div', { class: 'ecvwrap' }, oppCanvas(oi), h('span', { class: 'etype' }, ev.type === 'boss' ? 'KING' : ev.cls ? DR.CLASSES[ev.cls].name.toUpperCase() : T.name), won ? h('span', { class: 'ewon' }, 'WON') : null,
        isNext ? h('span', { class: 'enext' }, 'NEXT UP') : null),
      h('div', { class: 'pix small' }, DR.raceDayName(ev)),
      h('div', { class: 'dim gsmall' }, DR.raceDayWhen(ev) + ' • ' + (DR.SURFACES[DR.evCond(ev).surface] || {}).name),
      h('div', { class: 'acc ename' }, who),
      h('div', { class: 'dim gsmall' }, DR.CARS[o.carId].name),
      ev.cls ? h('div', { class: 'gsmall acc' }, 'Side race • ' + DR.CLASSES[ev.cls].rule) : null,
      ev.unlocks.length && !won ? h('div', { class: 'gsmall eunl' }, '🔓 ' + ev.unlocks.map(DR.unlockText).join(' • ')) : null,
      lock ? h('div', { class: 'warn gsmall' }, '🔒 ' + lock) : null,
      !lock && issue ? h('div', { class: 'warn gsmall' }, '⚠ ' + issue) : null,
      h('div', { class: 'efoot' }, h('span', { class: 'price' }, DR.money(G.eventReward(ev))), G.car() ? h('span', { class: 'dim gsmall' }, '−' + DR.money(DR.runCost(G.spec(G.car())).total) + ' run') : null,
        btn('Race', function () { if (lock || issue) return UI.toast(lock || issue); DR.Race.raceDay(DR.Race.eventCfg(ev, 0)); }, 'erace ' + (lock || issue ? 'disabled' : 'red'))));
  }
  function sponsorPicker(si) {
    var offers = G.sponsorOffers(si), close;
    var rows = offers.map(function (o) {
      var k = o.contract, req = ['Win ' + k.spon + ' sponsor races'];
      if (k.street) req.push('win ' + k.street + ' street races');
      if (k.stars) req.push('reach a ' + (Math.round(k.stars * 100) / 100) + '-star visual rating');
      if (o.prod) req[0] += ' with ' + o.prod + ' on the car';
      return h('div', { class: 'spcard', style: { borderLeftColor: o.col } },
        h('div', { class: 'pix', style: { color: o.col } }, o.name), h('div', { class: 'dim' }, o.pitch),
        h('div', { class: 'gsmall' }, 'Contract: ' + req.join(', ') + '.'),
        h('div', { class: 'good gsmall' }, 'Signing ' + DR.money(o.sign) + ' • ' + DR.money(o.stipend) + ' every race day • ' + DR.money(o.perWin) + ' per win • ' + DR.money(o.bonus) + ' and a free car when fulfilled'),
        o.disc || o.fuelDisc ? h('div', { class: 'acc gsmall' }, o.disc ? Math.round(o.disc.pct * 100) + '% off ' + (DR.UNLOCK_NAMES[o.disc.grp] || o.disc.grp).toLowerCase() + ' parts while signed' : Math.round(o.fuelDisc * 100) + '% off race fuel while signed') : null,
        btn('Sign', function () { G.signSponsor(si, o); A.cash(); close(); UI.toast('Signed with ' + o.name + '! Fulfil the contract to earn a free car.'); UI.refresh(); }, 'small go'));
    });
    close = UI.modal([h('h2', {}, 'Stage ' + (si + 1) + ' sponsors'), h('p', { class: 'dim' }, 'You can only sign one per stage, so choose carefully.'), h('div', { class: 'col' }, rows), btn('Not yet', function () { close(); }, 'small')]);
  }

  // a circuit venue on the map: what races there, and the way in
  function circuitSpot(p) {
    var t = DR.TRACKS[p.circuit], T = DR.Team, live = T.active().filter(function (r) { return (r.track || 'pixel') === p.circuit; });
    var thumb = h('canvas', { class: 'ecv', width: 600, height: 330 });
    UI.later(function () { if (UI.circuitThumb) UI.circuitThumb(thumb, t); });
    return h('div', {}, h('div', { class: 'stagehead' }, h('div', { class: 'grow' }, h('div', { class: 'plvl' }, 'CIRCUIT • ' + (t.len / 1000).toFixed(2) + ' KM • ' + t.corners.length + ' CORNERS' + (t.theme ? ' • NIGHT' : '')),
      h('div', { class: 'pix acc' }, t.name), h('div', { class: 'dim' }, p.blurb))),
      h('div', { class: 'ecard' }, h('div', { class: 'ecvwrap' }, thumb),
        h('div', { class: 'gsmall dim' }, live.length ? live.length + ' of your cars racing here now' : 'Team races: your hired drivers in your cars, against five AI teams. Five classes, from Club Cup to Unlimited GP.'),
        h('div', { class: 'efoot' }, btn('Test lap', function () { UI.circuitTab = 'test'; UI.circuitTestTrack = p.circuit; UI.show(UI.RaceMenu, 'circuit'); }, 'small'),
          btn('Race here', function () { UI.circuitTab = 'races'; UI.circuitTrack = p.circuit; UI.watchRace = null; UI.show(UI.RaceMenu, 'circuit'); }, 'small go'))));
  }
  function streetView(inst, p) {
    var head = h('div', { class: 'stagehead' }, h('div', { class: 'grow' }, h('div', { class: 'plvl' }, 'STREET SPOT • ' + (p.dist === 'quarter' ? '1/4' : '1/8') + ' MILE • ' + (p.grip >= 0.9 ? 'NO-PREP' : 'STREET') + ' • NIGHT'),
      h('div', { class: 'pix acc' }, p.name), h('div', { class: 'dim' }, p.blurb)));
    if (!spotOpen(p)) return h('div', {}, head, h('div', { class: 'warnbox' }, '🔒 Opens in stage ' + (p.stage + 1) + ' of the career.'));
    var dist = p.dist === 'quarter' ? DR.QUARTER : DR.EIGHTH;
    if (p.bets.indexOf(betSel) < 0) betSel = p.bets.filter(function (b) { return b <= G.state.money; }).pop() || p.bets[0];
    if (!streetOpps) streetOpps = G.streetOpponents(G.estimate(inst, dist, p.grip).et, dist, p.grip);
    var grid = h('div', { class: 'egrid' });
    streetOpps.forEach(function (o) {
      var oi = G.oppInst(o), oS = G.spec(oi);
      grid.appendChild(h('div', { class: 'ecard t-street' },
        h('div', { class: 'ecvwrap' }, oppCanvas(oi), h('span', { class: 'etype' }, 'STREET')),
        h('div', { class: 'acc ename' }, o.name), h('div', { class: 'dim gsmall' }, DR.CARS[o.carId].name + ' • about ' + Math.round((oS.peakHp + oS.nosHp) / 25) * 25 + ' hp'),
        h('div', { class: 'efoot' }, h('span', { class: 'price' }, 'Win ' + DR.money(betSel)),
          btn('Race', function () {
            if (G.state.money < betSel) return UI.toast('You can\'t cover a ' + DR.money(betSel) + ' bet');
            var opp = o; streetOpps = null;
            DR.Race.raceDay({ mode: 'street', opp: opp, dist: dist, theme: 'street', grip: p.grip, bet: betSel }, p.name + ' • ' + DR.money(betSel) + ' bet');
          }, 'small red'))));
    });
    return h('div', {}, head,
      h('div', { class: 'schips' }, h('span', { class: 'pix small', style: { alignSelf: 'center' } }, 'BET'), p.bets.map(function (b) {
        return chip(DR.money(b), b === betSel, function () { betSel = b; UI.refresh(); }, b > G.state.money ? 'disabled' : '');
      })),
      h('div', { class: 'gsmall dim' }, 'Win and you take their ' + DR.money(betSel) + '; lose and they take yours.'),
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
      ['quarter', '1/4 Mile', 'Prepped strip, daytime.', { mode: 'test', dist: DR.QUARTER, theme: 'strip', grip: 1, night: false }, inst.best && inst.best.q],
      ['quarter', '1/4 Mile Night', 'Prepped strip under the lights: cooler air, a colder track.', { mode: 'test', dist: DR.QUARTER, theme: 'strip', grip: 1, night: true }, null],
      ['eighth', '1/8 Mile', 'Half the track, all about the launch.', { mode: 'test', dist: DR.EIGHTH, theme: 'strip', grip: 1, night: false }, inst.best && inst.best.e],
      ['street', 'No-Prep 1/8', 'The old airfield at night: bare concrete, no traction compound.', { mode: 'test', dist: DR.EIGHTH, theme: 'street', grip: 0.92, surface: 'noprep', night: true }, null],
      ['street', 'Street 1/8', 'A closed-off road at night: dusty asphalt.', { mode: 'test', dist: DR.EIGHTH, theme: 'street', grip: 0.85, surface: 'street', night: true }, null]];
    var grid = h('div', { class: 'egrid' });
    runs.forEach(function (r) {
      grid.appendChild(h('div', { class: 'ecard t-test' }, h('div', { class: 'ecvwrap' }, trackThumb(r[0])),
        h('div', { class: 'acc ename' }, r[1]), h('div', { class: 'dim gsmall' }, r[2]),
        h('div', { class: 'efoot' }, h('span', { class: 'gsmall acc' }, r[4] ? 'Best ' + r[4].toFixed(3) + 's' : 'No runs yet'),
          btn('Run', function () { DR.Race.start(r[3]); }, 'small go'))));
    });
    return h('div', {}, h('div', { class: 'stagehead' }, h('div', { class: 'grow' }, h('div', { class: 'plvl' }, 'DRAG TEST & TUNE'), h('div', { class: 'pix acc' }, 'Solo passes'),
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
    memory(); remember();
    var inst = G.car(), S = G.spec(inst);
    var rail = h('div', { class: 'srail' }, Object.keys(TUNE_ICONS).map(function (g) {
      return railItem(TUNE_ICONS[g], 3, g, g === tuneGroup, function () { tuneGroup = g; UI.refresh(); });
    }));
    var list = h('div', { class: 'col' }), lockedRows = [];
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
      if (!unlocked) { lockedRows.push(h('div', { class: 'tune-row locked' }, h('span', { class: 'lab' }, '🔒 ' + def.label), h('span', { class: 'help' }, def.req))); return; }
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
      if (def.key === 'gearBoost') {
        var gb = h('div', { class: 'gear-grid' });
        S.tune.gearBoost.forEach(function (b, gi) {
          gb.appendChild(slider('Gear ' + (gi + 1), b, def.min(S), def.max(S), 0.5, 'psi', function (v) {
            var arr = (inst.tune.gearBoost || S.tune.gearBoost).slice(); arr[gi] = v; inst.tune.gearBoost = arr; G.save(); recalc();
          }, function (v) { return v >= S.tune.boost ? 'Full (' + S.tune.boost + ')' : v.toFixed(1) + ' psi'; }));
        });
        list.appendChild(h('div', { class: 'tune-row' }, h('div', { class: 'lab' }, h('span', {}, def.label,
          inst.tune.gearBoost ? h('button', { class: 'treset', title: 'Back to default', onclick: function () { delete inst.tune.gearBoost; G.save(); UI.refresh(); } }, '↺') : null)), gb,
          h('div', { class: 'help' }, def.help)));
        return;
      }
      var row = slider(def.label, S.tune[def.key], def.min(S), def.max(S), def.step, def.unit, function (v) { inst.tune[def.key] = v; G.save(); recalc(); }, def.fmt || (def.key === 'tcSlip' ? function (v) { return v === 0 ? 'OFF' : null; } : null),
        inst.tune[def.key] != null ? function () { delete inst.tune[def.key]; G.save(); UI.refresh(); } : null);
      row.appendChild(h('div', { class: 'help' }, def.help + (def.key === 'psi' ? ' Ideal: ' + S.tire.optP + ' psi.' : '') + (def.key === 'boost' ? ' Charge at full boost: ' + Math.round(S.iat) + ' C (' + Math.round(S.iat * 1.8 + 32) + ' F); knock limit ' + S.knock + ' psi.' : '')));
      // what sets the boost range, part by part
      if (def.key === 'boost') row.appendChild(h('div', { class: 'boostwhy' }, h('div', { class: 'plvl' }, 'RANGE ' + (S.boostMin || 0) + '-' + S.maxBoost + ' PSI: WHY'), DR.boostWhy(S).map(function (l) { return h('div', { class: 'help' }, '• ' + l); })));
      list.appendChild(row);
    });
    if (!list.children.length) list.appendChild(h('div', { class: 'dim' }, lockedRows.length ? 'Nothing to adjust yet: every setting here needs a part first.' : 'Nothing to adjust here yet.'));
    // settings that need a part sit at the bottom, one line each
    if (lockedRows.length) list.appendChild(h('div', { class: 'tlocked' }, h('h3', {}, 'NEEDS A PART (' + lockedRows.length + ')'), lockedRows));
    recalc();
    statBox.appendChild(h('div', { class: 'row', style: { flexWrap: 'wrap', marginTop: '6px' } },
      btn('Setups', function () { setupsModal(inst); }, 'small'),
      btn('Hire a Tuner', function () { tunerModal(inst); }, 'small'),
      btn('Reset Tune', function () { UI.confirm('Put every tuning setting back to default?', function () { inst.tune = {}; G.save(); UI.refresh(); }, 'Reset'); }, 'small red'),
      btn('Test Run', function () { DR.Race.start({ mode: 'test', dist: DR.QUARTER, theme: 'strip', grip: 1, back: 'tune' }); }, 'small go')));
    return h('div', { class: 'screen' }, UI.sectionTop('upgrade', 'tune'),
      h('div', { class: 'shopwrap' }, rail, h('div', { class: 'smain tunemain' }, h('div', { class: 'col grow' }, h('h2', {}, tuneGroup), list), statBox)));
  };

  // Setup sheets: named copies of the whole tune (a strip setup, a street
  // setup, ...) to switch between in one tap.
  function setupsModal(inst) {
    var list = inst.setups || (inst.setups = []), close;
    var name = h('input', { type: 'text', maxlength: 24, placeholder: 'Name this setup', class: 'tinput' });
    function summary(t) {
      var bits = [];
      if (t.boost != null) bits.push(t.boost + ' psi');
      if (t.launchRpm != null) bits.push('launch ' + t.launchRpm);
      if (t.psi != null) bits.push(t.psi + ' psi tires');
      if (t.fd != null) bits.push(t.fd.toFixed(2) + ' gear');
      if (t.stall != null) bits.push(t.stall + ' stall');
      return bits.join(' • ') || 'defaults';
    }
    close = UI.modal([h('div', { class: 'pix acc' }, 'SETUP SHEETS'),
      h('div', { class: 'col', style: { gap: '4px', margin: '6px 0' } }, list.length ? list.map(function (st, i) {
        return h('div', { class: 'row', style: { gap: '8px', alignItems: 'center' } },
          h('div', { class: 'grow' }, h('div', {}, st.name), h('div', { class: 'dim gsmall' }, summary(st.tune))),
          btn('Load', function () { inst.tune = JSON.parse(JSON.stringify(st.tune)); G.save(); close(); UI.toast('Loaded ' + st.name); UI.refresh(); }, 'small go'),
          btn('✕', function () { list.splice(i, 1); G.save(); close(); setupsModal(inst); }, 'small red'));
      }) : h('div', { class: 'dim' }, 'No saved setups for this car yet.')),
      h('div', { class: 'row', style: { gap: '8px' } }, name,
        btn('Save current', function () {
          var n = (name.value || '').trim() || 'Setup ' + (list.length + 1);
          var same = list.filter(function (x) { return x.name === n; })[0];
          if (same) same.tune = JSON.parse(JSON.stringify(inst.tune));
          else { if (list.length >= 10) return UI.toast('Ten setups is the most: delete one first'); list.push({ name: n, tune: JSON.parse(JSON.stringify(inst.tune)) }); }
          G.save(); close(); UI.toast('Saved ' + n); setupsModal(inst);
        }, 'small primary')),
      h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '8px' } }, btn('Close', function () { close(); }))]);
  }

  // The tuner: pick what to dial in, see the rate, let them make their hits.
  function tunerModal(inst) {
    if (inst.damage) return UI.toast('Repair your car first!');
    var jobs = DR.tunerJobs(inst), pick = {}, close;
    jobs.forEach(function (j) { pick[j.id] = true; });
    var quoteEl = h('div', { class: 'dim' }), goBtn;
    function ids() { return jobs.filter(function (j) { return pick[j.id]; }).map(function (j) { return j.id; }); }
    function quote() {
      var q = G.tunerQuote(inst, ids());
      quoteEl.textContent = DR.money(q.fee) + ' a hit + ' + DR.money(q.fuel) + ' fuel. A baseline hit, then up to ' + (q.maxHits - 1) + ' more: up to ' + DR.money(q.max) + '. Every hit wears your tires and clutch, and a car on the edge can break.';
      goBtn.disabled = !ids().length || !G.canAfford(q.max);
    }
    goBtn = btn('Start', function () {
      var chosen = ids(); close();
      var wait = UI.modal([h('div', { class: 'pix acc' }, 'AT THE TRACK'), h('p', {}, 'The tuner is making passes...')]);
      setTimeout(function () {
        var res = G.hireTuner(inst, chosen); wait();
        if (!res) return UI.toast('Not enough money');
        A.cash();
        var changes = Object.keys(res.tune).map(function (k) { var d = DR.TUNE_DEFS.filter(function (x) { return x.key === k; })[0]; return (d ? d.label : k) + ': ' + res.tune[k]; });
        var done = UI.modal([h('div', { class: 'pix acc' }, 'TUNER\'S NOTES'),
          h('div', { class: 'tunerlog' }, res.hits.map(function (x, i) {
            return h('div', { class: 'row' }, h('span', { class: 'dim' }, '#' + (i + 1)), h('span', { class: 'grow' }, x.label), x.broke ? h('span', { class: 'bad' }, 'BROKE: ' + x.broke) : h('span', {}, x.sixty.toFixed(3) + ' / ' + (x.et < 90 ? x.et.toFixed(3) : 'DNF')));
          })),
          h('p', {}, changes.length ? 'Set: ' + changes.join(' • ') : 'Nothing beat your current settings.'),
          res.broke ? h('p', { class: 'bad' }, 'The car broke on hit #' + res.hits.length + ' (' + res.broke + '). It needs a repair.') : null,
          h('p', { class: 'dim' }, res.hits.length + ' hits: ' + DR.money(res.cost.fee) + ' tuner + ' + DR.money(res.cost.fuel) + ' fuel = ' + DR.money(res.cost.total)),
          h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, btn('OK', function () { done(); UI.refresh(); }, 'primary'))]);
      }, 60);
    }, 'primary');
    close = UI.modal([h('div', { class: 'pix acc' }, 'HIRE A TUNER'),
      h('p', { class: 'dim' }, 'Test hits on a prepped strip, one setting at a time; they keep what the timeslips say is quicker.'),
      h('div', { class: 'col' }, jobs.map(function (j) {
        var cb = h('input', { type: 'checkbox', checked: true });
        cb.addEventListener('change', function () { pick[j.id] = cb.checked; quote(); });
        return h('label', { class: 'row', style: { gap: '8px' } }, cb, h('span', {}, j.name));
      })),
      quoteEl,
      h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '8px', gap: '8px' } }, btn('Cancel', function () { close(); }), goBtn)]);
    quote();
  }

  // ---------------------------------------------------------------- DYNO
  // A chassis dyno pull: power and torque at the rollers (through the
  // drivetrain), corrected to SAE J1349 standard air (77 F, 29.23 inHg dry)
  // from the day's air in the dyno cell, with boost and the wideband's
  // air/fuel against rpm. Each pull costs dyno time.
  var STOICH = { stock: 14.7, race: 14.7, e85: 9.8, meth: 6.4 };
  DR.dynoFee = function (S) { return Math.round((50 + (S.peakHp + S.nosHp) * 0.03) / 5) * 5; };
  function dynoSheet(inst, S) {
    var dy = DR.dyno(S), eff = S.eff, temp = Math.round(66 + Math.random() * 28), baro = Math.round((29 + Math.random() * 1.1) * 100) / 100;
    var cf = 1.18 * (29.23 / baro) * Math.sqrt((temp + 460) / 537) - 0.18;
    var lam = S.fiType !== 'none' ? 0.78 : 0.86, cap = S.fuelW / DR.HP, lean = S.fuelDemand > cap ? S.fuelDemand / cap : 1, st = STOICH[S.fuelId] || 14.7;
    var pts = dy.pts.map(function (p) {
      var ld = p.hp / dy.peakHp;
      return { rpm: p.rpm, hp: +(p.hp * eff).toFixed(1), tq: +(p.tq * eff).toFixed(1), boost: +p.boost.toFixed(1), afr: +(lam * (1 + (lean - 1) * ld * ld) * st).toFixed(2) };
    });
    var pk = pts.reduce(function (a, p) { return p.hp > a.hp ? p : a; }, pts[0]), pt = pts.reduce(function (a, p) { return p.tq > a.tq ? p : a; }, pts[0]);
    return { key: JSON.stringify([inst.engine, inst.parts, inst.tune]), at: Date.now(), pts: pts, peakHp: pk.hp, peakHpRpm: pk.rpm, peakTq: pt.tq, nosHp: Math.round(S.nosHp * eff), red: S.red,
      maxBoost: S.maxBoost, fi: S.fiType, cf: +cf.toFixed(3), temp: temp, baro: baro, afrPk: pk.afr, crank: Math.round(dy.peakHp) };
  }
  UI.Dyno = function () {
    var inst = G.car(), S = G.spec(inst), fee = DR.dynoFee(S);
    var bkey = JSON.stringify([inst.engine, inst.parts, inst.tune]);
    var dy = inst.dyno || null, prev = inst.dynoPrev || null, stale = dy && dy.key !== bkey;
    var spr = DR.carSprite(DR.carLook(inst));
    var room = DR.roomCanvas(inst, { theme: 'dyno', spr: spr, S: S, zoom: 2.2 }, 'dynoroom');
    var cv = h('canvas', { class: 'dynograph', width: 480, height: 200 });
    var sweep = { p: 1 }, rpmEl = h('div', { class: 'dynorpm' }, 'READY');
    function draw() {
      var ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#0c0d10'; ctx.fillRect(0, 0, W, H);
      if (!dy) { DR.pixText(ctx, 'NO PULLS YET', Math.round(W / 2) - 24, Math.round(H / 2) - 2, '#666'); return; }
      var L = 34, R = W - 30, T = 12, B = H - 22;
      var maxHp = Math.max(100, (dy.peakHp + dy.nosHp) * 1.12), maxTq = Math.max(100, dy.peakTq * 1.15 + (dy.nosHp ? dy.nosHp * 5252 / 3000 : 0));
      var maxV = Math.max(maxHp, maxTq), r0 = 1000, r1 = dy.red + 200;
      function X(r) { return L + (r - r0) / (r1 - r0) * (R - L); }
      function Y(v) { return B - v / maxV * (B - T); }
      ctx.fillStyle = '#1b1d24';
      for (var r = 1000; r <= r1; r += 1000) { ctx.fillRect(Math.round(X(r)), T, 1, B - T); DR.pixText(ctx, String(r / 1000), Math.round(X(r)) - 1, B + 6, '#666'); }
      var stepV = [25, 50, 100, 200, 250, 500, 1000].filter(function (st) { return maxV / st <= 6; })[0] || 1000;
      for (var v = 0; v <= maxV; v += stepV) { ctx.fillRect(L, Math.round(Y(v)), R - L, 1); DR.pixText(ctx, String(v), 2, Math.round(Y(v)) - 2, '#666'); }
      ctx.fillStyle = 'rgba(255,48,48,.15)'; ctx.fillRect(Math.round(X(dy.red)), T, R - Math.round(X(dy.red)), B - T);
      ctx.fillStyle = '#ff3030'; ctx.fillRect(Math.round(X(dy.red)), T, 1, B - T);
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
      if (dy.nosHp) line('hp', '#7a3ad6', function (p) { return p.rpm > 2200 ? dy.nosHp : 0; });
      line('tq', '#4da3ff'); line('hp', '#ffcc00');
      if (dy.fi !== 'none') { ctx.fillStyle = '#46e07a'; dy.pts.forEach(function (p) { if (p.rpm <= limit) ctx.fillRect(Math.round(X(p.rpm)), Math.round(B - p.boost / Math.max(dy.maxBoost, 1) * (B - T) * 0.5), 1, 1); }); }
      // air/fuel on its own scale (10-16:1 for gasoline), along the top
      var st0 = dy.pts[0] ? dy.pts[0].afr / (dy.fi !== 'none' ? 0.78 : 0.86) : 14.7;
      ctx.fillStyle = '#ff3d9a'; dy.pts.forEach(function (p) { if (p.rpm <= limit && p.rpm > 1500) ctx.fillRect(Math.round(X(p.rpm)), Math.round(T + (1 - (p.afr / st0 - 0.68) / 0.42) * (B - T) * 0.45), 1, 1); });
      if (sweep.p < 1) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(Math.round(X(limit)), T, 1, B - T); }
      DR.pixText(ctx, 'WHP', R + 2, T + 2, '#ffcc00'); DR.pixText(ctx, 'WTQ', R + 2, T + 10, '#4da3ff');
      if (dy.fi !== 'none') DR.pixText(ctx, 'PSI', R + 2, T + 18, '#46e07a');
      DR.pixText(ctx, 'AFR', R + 2, T + 26, '#ff3d9a');
      if (dy.nosHp) DR.pixText(ctx, 'N2O', R + 2, T + 34, '#9b4dff');
      DR.pixText(ctx, 'RPM X1000', Math.round((L + R) / 2) - 18, B + 13, '#666');
    }
    var info = h('div', { class: 'tstats' },
      h('div', { class: 'row', style: { marginBottom: '6px' } }, btn('▶ Pull ' + DR.money(fee), run, 'go')),
      dy ? gst('PEAK WHP', Math.round(dy.peakHp) + ' @ ' + dy.peakHpRpm + delta(dy.peakHp, prev && prev.peakHp), 'acc') : h('div', { class: 'dim gsmall' }, 'No pulls on this car yet.'),
      dy ? gst('PEAK WTQ', Math.round(dy.peakTq) + ' lb-ft' + delta(dy.peakTq, prev && prev.peakTq)) : null,
      dy ? gst('SAE CF', dy.cf.toFixed(3) + ' • ' + dy.temp + '°F ' + dy.baro.toFixed(2) + ' inHg', '') : null,
      dy ? gst('OBSERVED', Math.round(dy.peakHp / dy.cf) + ' whp uncorrected', '') : null,
      dy ? gst('AFR @ PEAK', dy.afrPk.toFixed(1) + ':1', '') : null,
      dy && !G.simMode() ? gst('CRANK (EST.)', dy.crank + ' hp', 'dim') : null,
      stale ? h('div', { class: 'gsmall warn' }, 'The car has changed since this pull.') : null,
      prev && dy ? h('div', { class: 'gsmall dim' }, 'Faded lines: the pull before.') : null,
      dy && dy.nosHp ? gst('W/ NITROUS', Math.round(dy.peakHp + dy.nosHp) + ' whp', 'acc') : null,
      S.fiType !== 'none' ? gst('BOOST', S.boostSet.toFixed(1) + ' psi' + (S.creep ? ' (+' + S.creep + ' creep)' : '') + ' • range ' + (S.boostMin || 0) + '-' + S.maxBoost, S.creep ? 'acc' : '') : null,
      gst('LIMITER', S.red + ' rpm' + (S.ecu === 0 ? ' (stock)' : ''), S.red > S.mech ? 'bad' : ''),
      S.rotary ? null : gst('VALVETRAIN', S.vtLimit + ' rpm', S.red > S.vtLimit ? 'bad' : ''), gst(S.rotary ? 'ROTATING' : 'BOTTOM END', S.beLimit + ' rpm (' + DR.catName(S.beWeak, inst).toLowerCase() + ')', S.red > S.beLimit ? 'bad' : ''),
      gst('SAFE POWER', Math.round(S.safeHp) + ' hp (' + DR.catName(S.safeWeak, inst).toLowerCase() + ')', (S.peakHp + S.nosHp) > S.safeHp && !G.simMode() ? 'bad' : ''),
      (function () {
        // what the injectors / pump feed against what the engine (and any shot) wants
        var fs = DR.fuelShort(S), lean = fs.ratio > 1.02;
        return gst('FUEL', Math.round(fs.cap) + ' hp ' + (fs.by === 'injectors' ? 'injectors' : 'pump') + (S.stockFuel ? ' (stock)' : '') + (G.simMode() ? '' : ' • needs ' + Math.round(fs.need)), G.simMode() ? '' : lean ? 'bad' : fs.ratio > 0.9 ? 'acc' : 'good');
      })(),
      S.untuned && S.untuned.length ? gst('TUNE', 'Untuned: ' + S.untuned.map(function (u) { return DR.catName(u[0], inst).toLowerCase(); }).join(', '), 'bad') : gst('TUNE', S.tuned ? 'Tuned' : 'Stock ECU', ''),
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
      if (!run.paid) {
        if (inst.damage) return UI.toast('Repair your car first!');
        if (!G.canAfford(fee)) return UI.toast('A pull costs ' + DR.money(fee));
        G.pay(fee); UI.updMoney(); run.paid = true;
        if (dy) inst.dynoPrev = dy;
        prev = inst.dynoPrev; dy = inst.dyno = dynoSheet(inst, S); G.save();
      }
      if (A.wkPending) { A.whenReady(run); return; }
      if (A.banksReady && !A.banksReady([S.eng])) { if (!run.wait) { run.wait = true; A.whenBanks([S.eng], function () { run.wait = false; run(); }); } return; }
      voice = A.engine(S.eng, 0.8, A.buildOf(S));
      if (DR.Music) DR.Music.duck(true);
      var t0 = performance.now(), ang = 0, last = t0;
      sweep.p = 0;
      (function tick() {
        var now = performance.now(), t = (now - t0) / 3000;
        sweep.p = Math.min(1, t);
        var rpm = 1000 + (S.red + 200 - 1000) * sweep.p;
        A.update(voice, rpm, 1, DR.steadyBoost(S, rpm), 0, S.fiType);
        ang += Math.max(0, now - last) / 1000 * rpm / 300; last = now;
        rpmEl.textContent = Math.round(rpm) + ' RPM';
        draw(); drawRoom(ang, true);
        if (t < 1) raf = requestAnimationFrame(tick);
        else {
          A.update(voice, S.idle, 0, 0, 0, S.fiType); rpmEl.textContent = 'PEAK ' + Math.round(dy.peakHp) + ' WHP'; run.paid = false;
          setTimeout(function () { if (UI.cur && UI.cur.fn === UI.Dyno) UI.refresh(); }, 1600);
          var t1 = performance.now();
          (function coast() { var k = (performance.now() - t1) / 1500; ang += 0.4 * (1 - k); drawRoom(ang, false); if (k < 1) idleRaf = requestAnimationFrame(coast); })();
          setTimeout(function () { A.stopAll(); voice = null; if (DR.Music) DR.Music.duck(false); }, 900);
        }
      })();
    }
    UI.cleanup = function () { cancelAnimationFrame(raf); cancelAnimationFrame(idleRaf); A.stopAll(); voice = null; };
    return h('div', { class: 'screen' }, UI.sectionTop('upgrade', 'dyno'),
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
    memory(); remember();
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
            gst('WEIGHT', UI.kgLb(S.m) + ' ' + Math.round(S.f * 100) + '%F'), gst('DRIVE', S.drive + ' • ' + S.ratios.length + '-spd'),
            gst('TIRES', S.tire.name),
            owned ? h('div', { class: 'gsmall acc' }, 'You own ' + owned) : null,
            h('div', { class: 'gsmall dim' }, 'Garage slots: ' + G.state.cars.length + ' / ' + G.carSlots()),
            G.freeCars() ? h('div', { class: 'gsmall acc' }, G.freeCars() + ' free sponsor car' + (G.freeCars() > 1 ? 's' : '') + ' to claim' + (G.sponsorCarOk(id) ? '' : ' (not this one: up to ' + DR.money(DR.SPONSOR_CAR_CAP[Math.min(G.careerState().stage, DR.SPONSOR_CAR_CAP.length - 1)]) + ', no Pro cars)')) : null),
          h('div', { class: 'gsel' }, ids.length > 1 ? btn('◀', function () { cyc(-1); }, 'arrow') : null,
            h('div', { class: 'gname' }, h('div', { class: 'price big' }, DR.money(car.price)), h('div', { class: 'dim' }, (dealerIdx + 1) + ' / ' + ids.length + ' • ' + (!locked && G.freeCars() && G.sponsorCarOk(id) ? 'free with your sponsor' : dealerCat))),
            ids.length > 1 ? btn('▶', function () { cyc(1); }, 'arrow') : null,
            btn('Test Drive', function () {
              var td = { uid: -2, carId: id, engine: car.engine, parts: {}, tune: {}, vis: {}, color: car.col, best: {}, inv: [] };
              DR.Race.start({ mode: 'test', inst: td, dist: DR.QUARTER, theme: 'strip', grip: 1 });
            }, 'small'),
            locked ? h('span', { class: 'tag' }, '🔒 ' + G.carUnlockWhere(id)) : G.freeCars() && G.slotFree() && G.sponsorCarOk(id) ? btn('Take free', function () {
              UI.confirm('Take the ' + car.name + ' as your free sponsor car?', function () { G.claimFreeCar(id); UI.toast('Your sponsor bought you the ' + car.name + '!'); UI.show(UI.Garage); }, 'Take it');
            }, 'go') : !G.slotFree() ? btn('Garage full', function () {
              UI.toast('All ' + G.carSlots() + ' garage slots are taken. Fulfil a sponsor contract to open another, or sell a car.');
            }, 'disabled') : btn('Buy', function () {
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
      var away = DR.Team && DR.Team.carAway(inst.uid);
      var cv = UI.lazyPreview('ecv', inst, { aspect: 0.42 });
      grid.appendChild(h('div', { class: 'ecard' + (active ? ' won' : '') },
        h('div', { class: 'ecvwrap' }, cv, active ? h('span', { class: 'etype good' }, 'DRIVING') : null, away ? h('span', { class: 'ewon' }, 'AT THE TRACK') : null, inst.damage ? h('span', { class: 'ewon bad' }, 'BROKEN') : null),
        h('div', { class: 'acc ename' }, DR.CARS[inst.carId].name),
        h('div', { class: 'gsmall dim' }, Math.round(S.peakHp + S.nosHp) + ' hp • ' + UI.kgLb(S.m) + ' • ' + (Math.round(stars * 100) / 100) + ' stars'),
        h('div', { class: 'gsmall' }, inst.best && inst.best.q ? 'Best 1/4: ' + inst.best.q.toFixed(3) + 's' : 'No timeslip yet'),
        h('div', { class: 'efoot' },
          active ? null : btn('Drive', function () { G.state.active = inst.uid; G.save(); UI.show(UI.Garage); }, 'small go'),
          away ? h('span', { class: 'gsmall dim' }, DR.Team.awayText(inst.uid)) : null,
          !away && modded(inst) ? btn('Strip parts', function () {
            var sc = G.stripCost(inst);
            if (sc && !G.canAfford(sc)) return UI.toast('Used factory parts to replace the ones you sold cost ' + DR.money(sc));
            UI.confirm('Take every aftermarket part off the ' + DR.CARS[inst.carId].name + '? They go to your inventory and its factory parts go back in' + (sc ? ' (used ones for those you sold: ' + DR.money(sc) + ')' : '') + '.', function () {
              var n = G.stripCar(inst); A.click(); UI.toast(n + ' part' + (n === 1 ? '' : 's') + ' moved to your inventory'); UI.refresh();
            }, 'Strip');
          }, 'small') : null,
          !away && G.state.cars.length > 1 ? btn('Sell ' + DR.money(G.carValue(inst)), function () { sellCarModal(inst); }, 'small red') : null)));
    });
    return h('div', { class: 'screen' }, UI.top('MY CARS', function () { UI.show(UI.Garage); }, btn('Dealer ▶', function () { UI.show(UI.Dealer); }, 'small')),
      h('div', { class: 'content' }, h('div', { class: 'tipline' }, 'Garage slots: ' + G.state.cars.length + ' / ' + G.carSlots() + '. Every sponsor contract you fulfil opens another slot and pays for a car.' + (G.freeCars() ? ' You have ' + G.freeCars() + ' free sponsor car' + (G.freeCars() > 1 ? 's' : '') + ' to pick at the dealer.' : '')), grid));
  };

  function modded(inst) { return inst.engine !== DR.CARS[inst.carId].engine || Object.keys(inst.parts).length > 0; }
  // Sell as it sits (parts go with it, at 60% of what went into it), or pull
  // the parts first and sell the shell (the parts stay yours).
  function sellCarModal(inst) {
    var name = DR.CARS[inst.carId].name, close = UI.modal([h('p', { class: 'pix' }, 'Sell the ' + name + '?'),
      modded(inst) ? h('p', { class: 'dim' }, 'Sell it as it sits and the parts go with it, or strip the parts to your inventory first and sell the factory car.') : null,
      h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '10px', flexWrap: 'wrap', gap: '6px' } },
        btn('Cancel', function () { close(); }),
        modded(inst) ? btn('Strip, then sell' + (G.stripCost(inst) ? ' (-' + DR.money(G.stripCost(inst)) + ')' : ''), function () { close(); var n = G.stripCar(inst), v = G.carValue(inst); G.sellCar(inst.uid); A.cash(); UI.toast('Sold for ' + DR.money(v) + ' • ' + n + ' parts kept'); UI.refresh(); }) : null,
        btn('Sell ' + DR.money(G.carValue(inst)), function () { close(); G.sellCar(inst.uid); A.cash(); UI.refresh(); }, 'primary'))]);
  }

  // ---------------------------------------------------------------- PAINT
  var paintTab = 'color';
  var PAINT_TABS = [['color', 'Body', 400, 'u_paint'], ['stripe', 'Stripe', 200, 'v_vinyl'], ['rim', 'Wheels', 150, 'wheels']];
  var RIM_COLS = ['#c8c8c8', '#ffffff', '#ffd700', '#151515', '#d23a3a', '#3a7bd2', '#7cd320', '#ff6a00', '#8a8f99', '#b06bff'];
  var paintDraft = null;
  UI.Paint = function () {
    memory(); remember();
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
      UI.show(UI.Garage);
      UI.afterStars(G.noteStars());
    }, 'go');
    return h('div', { class: 'screen' }, UI.sectionTop('style', 'paint', function () { paintDraft = null; }),
      h('div', { class: 'shopwrap' }, rail, h('div', { class: 'dmain' },
        h('div', { class: 'gwrap' }, cv, h('div', { class: 'gsel topsel' }, costEl, btn('Undo', function () { paintDraft = null; UI.refresh(); }, 'small'), apply)),
        h('div', { class: 'paintbar' }, h('div', { class: 'plvl' }, paintTab === 'stripe' ? 'STRIPE • +0.25 STARS' : paintTab === 'rim' ? 'WHEEL COLOR' : 'BODY COLOR'), sw))));
  };
})();
