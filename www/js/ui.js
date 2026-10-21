// ===========================================================================
// UI — all menu screens (DOM based). Each screen is a function returning an
// element; UI.show() swaps it into #app.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, A = DR.Audio;
  var UI = DR.UI = {};

  // ------------------------------------------------------------ helpers
  function h(tag, props) {
    var el = document.createElement(tag), i, k;
    props = props || {};
    for (k in props) {
      var v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v);
    }
    for (i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  UI.h = h;
  function btn(label, onclick, cls, attrs) {
    var b = h('button', Object.assign({ class: 'btn ' + (cls || '') }, attrs || {}), label);
    b.addEventListener('click', function (e) { A.init(); A.resume(); A.click(); onclick && onclick(e); });
    return b;
  }
  UI.btn = btn;
  function fmtHp(x) { return Math.round(x) + ' hp'; }
  function kgLb(kg) { return Math.round(kg * 2.2046) + ' lb'; }
  UI.speed = function (mph) { return G.state.settings.units === 'kmh' ? (mph * 1.609).toFixed(1) + ' km/h' : mph.toFixed(1) + ' mph'; };
  function et(x) { return x >= 90 ? '--.--' : x.toFixed(3) + 's'; }
  UI.et = et;

  UI.app = null;
  UI.show = function (fn, arg) {
    if (UI.cleanup) { try { UI.cleanup(); } catch (e) { /* ignore */ } }
    UI.cleanup = null;
    UI.app.innerHTML = '';
    UI.app.appendChild(fn(arg));
    UI.cur = { fn: fn, arg: arg };
  };
  UI.refresh = function () { if (UI.cur) UI.show(UI.cur.fn, UI.cur.arg); };

  var toastT = 0;
  UI.toast = function (msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.className = 'show';
    clearTimeout(toastT); toastT = setTimeout(function () { t.className = ''; }, 2200);
  };
  UI.modal = function (content) {
    var m = h('div', { class: 'modal' }, h('div', { class: 'panel' }, content));
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    function close() { if (m.parentNode) m.parentNode.removeChild(m); }
    document.body.appendChild(m);
    return close;
  };
  UI.confirm = function (text, yes, yesLabel) {
    var close = UI.modal([h('p', { class: 'pix' }, text), h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '10px' } },
      btn('Cancel', function () { close(); }), btn(yesLabel || 'Yes', function () { close(); yes(); }, 'primary'))]);
  };

  function top(title, back, extra) {
    return h('div', { class: 'top' },
      back ? btn('◀', back, 'back') : null,
      h('h1', {}, title),
      h('div', { class: 'money', id: 'money' }, DR.money(G.state.money)), extra || null);
  }
  function updMoney() { var m = document.getElementById('money'); if (m) m.textContent = DR.money(G.state.money); }
  UI.updMoney = updMoney;

  function previewCanvas(inst, w, hgt, opts) {
    var c = h('canvas', { class: 'preview', width: w || 300, height: hgt || 130 });
    DR.drawPreview(c, inst, opts);
    return c;
  }
  UI.previewCanvas = previewCanvas;

  function statsGrid(pairs) {
    var g = h('div', { class: 'stats' });
    pairs.forEach(function (p) { if (p) { g.appendChild(h('div', { class: 'k' }, p[0])); g.appendChild(h('div', { class: 'v ' + (p[2] || '') }, p[1])); } });
    return g;
  }

  function riskBox(S) {
    var r = S.risk, out = [];
    if (r.engine > 0.001) out.push(h('div', { class: 'warnbox' }, 'Engine failure risk: ' + Math.round(r.engine * 100) + '% per run'));
    if (r.trans > 0.001) out.push(h('div', { class: 'warnbox' }, 'Transmission failure risk: ' + Math.round(r.trans * 100) + '% per run'));
    r.notes.forEach(function (n) { out.push(h('div', { class: 'dim', style: { fontSize: '16px' } }, '• ' + n)); });
    return out;
  }
  UI.riskBox = riskBox;

  function carStats(inst, S) {
    var est = G.estimate(inst, DR.QUARTER);
    var tr = DR.TRANS[S.transId];
    return statsGrid([
      ['Engine', S.eng.name],
      ['Power', fmtHp(S.peakHp) + (S.nosHp ? ' +' + S.nosHp + ' N2O' : ''), 'acc'],
      ['Torque', Math.round(S.peakTq) + ' lb-ft'],
      S.fiType !== 'none' ? ['Boost', S.boostSet.toFixed(1) + ' psi ' + DR.FI[S.fiId].name.replace('Factory ', '')] : null,
      ['Weight', kgLb(S.m) + ' (' + Math.round(S.f * 100) + '% front)'],
      ['Drive', S.drive + ', ' + tr.ratios.length + '-spd ' + { manual: 'manual', auto: 'auto', seq: 'sequential', dct: 'DCT' }[tr.type]],
      tr.type === 'auto' ? ['Converter', S.stall + ' stall' + (S.tbrake ? ' + transbrake' : ', foot brake')] : null,
      ['Tires', S.tire.name],
      ['Est. 1/4 mile', est.et >= 90 ? 'crash!' : est.et.toFixed(2) + 's @ ' + Math.round(est.trap), 'good'],
      inst.best && inst.best.q ? ['Best 1/4', inst.best.q.toFixed(3) + 's', 'acc'] : null,
      inst.best && inst.best.e ? ['Best 1/8', inst.best.e.toFixed(3) + 's', 'acc'] : null
    ]);
  }

  // ------------------------------------------------------------ TITLE
  UI.Title = function () {
    var s = G.state;
    var c = h('canvas', { width: 300, height: 110, style: { width: 'min(520px, 80vw)', marginBottom: '12px' } });
    var demo = { carId: 'fox', engine: 'v8_86b', parts: { fi: 'sc_1471', wheeliebar: 'wb1', aero: 'a2', rtires: 'sl_33' }, color: '#e31b6d', stripe: '#ffffff', rim: '#d0d0d0' };
    DR.drawPreview(c, demo, { groundY: 92 });
    return h('div', { class: 'screen title' },
      h('div', { class: 'logo' }, 'PIXEL DRAG'),
      h('div', { class: 'tag2' }, 'BUILD • TUNE • LAUNCH'),
      c,
      h('div', { class: 'row', style: { justifyContent: 'center', flexWrap: 'wrap' } },
        s.started ? btn('Continue', function () { UI.show(UI.Garage); }, 'primary') : null,
        btn(s.started ? 'New Game' : 'Start Career', function () {
          if (s.started) UI.confirm('Start over? Your garage and money will be lost.', function () { UI.show(UI.Starter); });
          else UI.show(UI.Starter);
        }, s.started ? '' : 'primary'),
        btn('How to Play', function () { UI.show(UI.Help, UI.Title); }),
        btn('Settings', function () { UI.show(UI.Settings, UI.Title); })
      ));
  };

  // ------------------------------------------------------------ STARTER
  UI.Starter = function () {
    var grid = h('div', { class: 'cards' });
    G.starters.forEach(function (id) {
      var car = DR.CARS[id], inst = { carId: id, engine: car.engine, parts: {}, tune: {}, color: car.col };
      var S = DR.buildSpec(inst), est = G.estimate(inst, DR.QUARTER);
      var cv = h('canvas', { width: 200, height: 100 });
      DR.drawPreview(cv, inst);
      grid.appendChild(h('div', { class: 'card' }, cv,
        h('div', { class: 't acc' }, car.name),
        statsGrid([['Engine', S.eng.name], ['Power', fmtHp(S.peakHp)], ['Weight', kgLb(S.m)], ['Drive', S.drive], ['1/4 mile', est.et.toFixed(2) + 's']]),
        btn('Choose', function () { G.newGame(id); UI.toast('Welcome to the strip! You have ' + DR.money(G.state.money) + ' to spend.'); UI.show(UI.Garage); }, 'primary')));
    });
    return h('div', { class: 'screen' }, top('Pick your first car', function () { UI.show(UI.Title); }),
      h('div', { class: 'content' }, h('p', { class: 'dim' }, 'Every legend starts somewhere. Pick a cheap starter - you get it for free, plus $6,000 cash for parts.'), grid));
  };

  // ------------------------------------------------------------ GARAGE (hub)
  UI.Garage = function () {
    var inst = G.car(), S = G.spec(inst);
    var cv = previewCanvas(inst, 320, 140);
    var dmg = null;
    if (inst.damage) {
      var cost = G.repairCost(inst);
      dmg = h('div', { class: 'warnbox' }, (inst.damage.engine ? 'ENGINE BLOWN! ' : 'TRANSMISSION BROKEN! ') + 'Repair: ' + DR.money(cost) + ' ',
        btn('Repair', function () { if (G.repair(inst)) { A.cash(); UI.refresh(); } else UI.toast('Not enough money'); }, 'small go'));
    }
    var menu = h('div', { class: 'menu-grid' },
      btn('⚑ Race', function () { if (inst.damage) return UI.toast('Repair your car first!'); UI.show(UI.RaceMenu); }, 'race'),
      btn('Upgrade', function () { UI.show(UI.Shop); }, 'blue'),
      btn('Tune', function () { UI.show(UI.Tune); }),
      btn('Dyno', function () { UI.show(UI.Dyno); }),
      btn('Paint', function () { UI.show(UI.Paint); }),
      btn('My Cars', function () { UI.show(UI.Cars); }),
      btn('Dealer', function () { UI.show(UI.Dealer); }));
    return h('div', { class: 'screen' }, top('GARAGE', function () { UI.show(UI.Title); }, h('div', { class: 'row', style: { gap: '6px' } },
        btn('?', function () { UI.show(UI.Help, UI.Garage); }, 'small back'), btn('⚙', function () { UI.show(UI.Settings, UI.Garage); }, 'small back'))),
      h('div', { class: 'content' }, h('div', { class: 'garage' },
        h('div', { class: 'view' }, cv, h('div', { class: 'pix acc', style: { textAlign: 'center' } }, DR.CARS[inst.carId].name), dmg, menu),
        h('div', { class: 'side panel' }, carStats(inst, S), riskBox(S),
          h('div', { class: 'dim', style: { fontSize: '16px' } }, 'Record: ' + G.state.stats.wins + ' W / ' + (G.state.stats.races - G.state.stats.wins) + ' L')))));
  };

  // ------------------------------------------------------------ RACE MENU
  var streetOpps = null;
  UI.RaceMenu = function (tab) {
    tab = tab || 'career';
    var inst = G.car();
    var body = h('div');
    var tabs = h('div', { class: 'tabs' },
      [['career', 'Career Ladder'], ['street', 'Street Race $'], ['test', 'Test & Tune']].map(function (t) {
        return btn(t[1], function () { UI.show(UI.RaceMenu, t[0]); }, tab === t[0] ? 'on' : '');
      }));
    if (tab === 'career') body.appendChild(careerView());
    else if (tab === 'street') body.appendChild(streetView(inst));
    else body.appendChild(testView());
    return h('div', { class: 'screen' }, top('RACE', function () { UI.show(UI.Garage); }), h('div', { class: 'content' }, tabs, body));
  };

  var selTier = null;
  function careerView() {
    if (selTier == null) { selTier = 0; for (var t = 0; t < DR.CAREER.length; t++) if (G.tierUnlocked(t)) selTier = t; }
    var left = h('div', { class: 'list' }), right = h('div', { class: 'list' });
    DR.CAREER.forEach(function (tier, ti) {
      var un = G.tierUnlocked(ti), done = tier.opps.filter(function (_, i) { return G.beaten(ti, i); }).length;
      left.appendChild(h('div', { class: 'item' + (ti === selTier ? ' sel' : '') + (un ? '' : ' locked'), onclick: function () { if (!un) return UI.toast('Beat every racer in the previous tier first'); selTier = ti; UI.refresh(); } },
        h('div', { class: 'name' }, h('div', { class: 'pix small' }, 'TIER ' + (ti + 1)), tier.name),
        h('span', { class: 'tag ' + (done === 5 ? 'g' : '') }, un ? done + '/5' : 'LOCKED')));
    });
    var tier = DR.CAREER[selTier];
    tier.opps.forEach(function (o, i) {
      var oi = G.oppInst(o), est = G.estimate(oi, tier.dist), un = G.oppUnlocked(selTier, i), beat = G.beaten(selTier, i);
      var reward = beat ? Math.round(tier.reward[i] * 0.3) : tier.reward[i];
      var cv = h('canvas', { width: 120, height: 50, style: { width: '96px', height: '40px', flex: 'none' } });
      DR.drawPreview(cv, oi, { aspect: 0.42 });
      right.appendChild(h('div', { class: 'item' + (un ? '' : ' locked') }, cv,
        h('div', { class: 'name' }, h('div', { class: 'acc' }, (i === 4 ? '★ BOSS: ' : '') + o.name), h('div', { class: 'dim' }, DR.CARS[o.carId].name + ' • ' + (est.et >= 90 ? '??' : est.et.toFixed(2) + 's'))),
        beat ? h('span', { class: 'tag g' }, 'BEATEN') : null,
        h('span', { class: 'price' }, DR.money(reward)),
        btn('Race', function () {
          if (!un) return UI.toast('Beat the previous racer first');
          DR.Race.start({ mode: 'career', tier: selTier, idx: i, opp: o, dist: tier.dist, theme: 'strip', grip: 1, reward: reward });
        }, 'small ' + (un ? 'red' : 'disabled'))));
    });
    var yourEst = G.estimate(G.car(), DR.QUARTER);
    return h('div', { class: 'split' }, h('div', { class: 'left' }, left),
      h('div', { class: 'right' }, h('h2', {}, tier.name + ' — 1/4 mile'), h('p', { class: 'dim', style: { margin: '0 0 8px' } }, 'Your estimated ET: ' + (yourEst.et >= 90 ? '??' : yourEst.et.toFixed(2) + 's') + '. Beat each racer to unlock the next. Rematches pay 30%.'), right));
  }

  var betSel = 1000;
  function streetView(inst) {
    var mine = G.estimate(inst, DR.EIGHTH, 0.85);
    if (!streetOpps) streetOpps = G.streetOpponents(mine.et);
    var bets = [500, 1000, 2500, 5000, 10000, 25000, 50000];
    var list = h('div', { class: 'list' });
    streetOpps.forEach(function (o) {
      var oi = G.oppInst(o), est = G.estimate(oi, DR.EIGHTH, 0.85);
      var cv = h('canvas', { width: 120, height: 50, style: { width: '96px', height: '40px', flex: 'none' } });
      DR.drawPreview(cv, oi, { aspect: 0.42 });
      list.appendChild(h('div', { class: 'item' }, cv,
        h('div', { class: 'name' }, h('div', { class: 'acc' }, o.name), h('div', { class: 'dim' }, DR.CARS[o.carId].name + ' • runs ~' + est.et.toFixed(2) + 's')),
        btn('Race', function () {
          if (G.state.money < betSel) return UI.toast('You cannot cover that bet');
          var opp = o; streetOpps = null;
          DR.Race.start({ mode: 'street', opp: opp, dist: DR.EIGHTH, theme: 'street', grip: 0.85, bet: betSel });
        }, 'small red')));
    });
    return h('div', {},
      h('h2', {}, 'Street Race — 1/8 mile, night, no prep'),
      h('p', { class: 'dim', style: { margin: '0 0 8px' } }, 'Winner takes the pot. The street has less grip than the strip. Your car runs ~' + (mine.et >= 90 ? '??' : mine.et.toFixed(2) + 's') + ' here.'),
      h('div', { class: 'tabs' }, h('span', { class: 'pix small', style: { alignSelf: 'center' } }, 'BET:'), bets.map(function (b) {
        return btn(DR.money(b), function () { betSel = b; UI.refresh(); }, (b === betSel ? 'on' : '') + (b > G.state.money ? ' disabled' : ''));
      })),
      list, h('div', { style: { marginTop: '8px' } }, btn('New Opponents', function () { streetOpps = null; UI.refresh(); }, 'small')));
  }

  function testView() {
    return h('div', { class: 'col' },
      h('h2', {}, 'Test & Tune'),
      h('p', { class: 'dim', style: { margin: 0 } }, 'Solo passes on a prepped strip. No money on the line - perfect for dialing in your tune. Your best times are saved.'),
      h('div', { class: 'row', style: { flexWrap: 'wrap' } },
        btn('1/4 Mile', function () { DR.Race.start({ mode: 'test', dist: DR.QUARTER, theme: 'strip', grip: 1 }); }, 'primary'),
        btn('1/8 Mile', function () { DR.Race.start({ mode: 'test', dist: DR.EIGHTH, theme: 'strip', grip: 1 }); }, 'primary'),
        btn('Street 1/8 (night)', function () { DR.Race.start({ mode: 'test', dist: DR.EIGHTH, theme: 'street', grip: 0.85 }); })));
  }

  // ------------------------------------------------------------ SHOP
  var shopGroup = 'engine', shopCat = 'intake';
  UI.Shop = function () {
    var inst = G.car();
    var groupTabs = h('div', { class: 'tabs' }, DR.PART_GROUPS.map(function (g) {
      return btn(g.name, function () { shopGroup = g.id; shopCat = g.cats.filter(function (c) { return DR.partApplies(c, inst); })[0]; UI.refresh(); }, shopGroup === g.id ? 'on' : '');
    }));
    var group = DR.PART_GROUPS.filter(function (g) { return g.id === shopGroup; })[0];
    var cats = h('div', { class: 'list' });
    group.cats.forEach(function (c) {
      if (!DR.partApplies(c, inst)) return;
      var cur = DR.getOption(c, inst);
      cats.appendChild(h('div', { class: 'item' + (c === shopCat ? ' sel' : ''), onclick: function () { shopCat = c; UI.refresh(); } },
        h('div', { class: 'name' }, h('div', { class: 'pix small' }, DR.catName(c)), h('div', { class: 'dim' }, cur.name))));
    });
    if (!DR.partApplies(shopCat, inst)) shopCat = group.cats.filter(function (c) { return DR.partApplies(c, inst); })[0];
    var opts = DR.partOptions(shopCat, inst), curId = DR.partId(shopCat, inst);
    var olist = h('div', { class: 'list' });
    opts.forEach(function (o) {
      var installed = o.id === curId;
      olist.appendChild(h('div', { class: 'item' + (installed ? ' sel' : ''), onclick: function () { openPart(inst, shopCat, o.id); } },
        h('div', { class: 'name' }, o.name), installed ? h('span', { class: 'tag g' }, 'INSTALLED') : h('span', { class: 'price' }, o.price ? DR.money(o.price) : 'FREE')));
    });
    return h('div', { class: 'screen' }, top('UPGRADE SHOP', function () { UI.show(UI.Garage); }),
      h('div', { class: 'content' }, groupTabs, h('div', { class: 'split' },
        h('div', { class: 'left' }, cats),
        h('div', { class: 'right' }, h('h2', {}, DR.catName(shopCat)), olist))));
  };

  function hypothetical(inst, cat, id) {
    var copy = JSON.parse(JSON.stringify(inst));
    if (cat === 'engine') { DR.ENGINE_BOUND.forEach(function (c) { delete copy.parts[c]; }); copy.engine = id; delete copy.tune.boost; delete copy.tune.launchRpm; delete copy.tune.shiftRpm; }
    else {
      if (id === DR.stockPart(cat, copy)) delete copy.parts[cat]; else copy.parts[cat] = id;
      if (cat === 'fi') delete copy.tune.boost;
      if (cat === 'trans') delete copy.tune.gears;
      if (cat === 'rtires') delete copy.tune.psi;
      if (cat === 'rearsusp') delete copy.tune.antiSquat;
    }
    return copy;
  }

  function openPart(inst, cat, id) {
    var close = UI.modal(partDetail(inst, cat, id, function () { close(); }));
  }

  function partDetail(inst, cat, id, close) {
    var opt = DR.getOption(cat, inst, id), cur = DR.partId(cat, inst);
    var S0 = G.spec(inst), copy = hypothetical(inst, cat, id), S1 = DR.buildSpec(copy);
    var e0 = G.estimate(inst, DR.QUARTER), e1 = G.estimate(copy, DR.QUARTER);
    function d(a, b, unit, dec, lowerBetter) {
      var diff = b - a, cls = Math.abs(diff) < Math.pow(10, -(dec || 0)) / 2 ? 'dim' : ((diff < 0) === !!lowerBetter ? 'good' : 'bad');
      return h('span', { class: cls }, a.toFixed(dec || 0) + ' → ' + b.toFixed(dec || 0) + unit);
    }
    var refund = G.tradeIn(cat, inst);
    if (cat === 'engine') DR.ENGINE_BOUND.forEach(function (c) { refund += Math.round((DR.getOption(c, inst).price || 0) * 0.5); });
    var net = (opt.price || 0) - refund;
    return h('div', { class: 'panel col' },
      h('div', { class: 'pix acc' }, opt.name),
      opt.desc ? h('div', {}, opt.desc) : null,
      statsGrid([
        ['Power', d(S0.peakHp + S0.nosHp, S1.peakHp + S1.nosHp, ' hp')],
        ['Weight', d(S0.m * 2.2046, S1.m * 2.2046, ' lb', 0, true)],
        ['Est. 1/4', d(Math.min(e0.et, 99), Math.min(e1.et, 99), 's', 2, true)],
        ['Price', DR.money(opt.price || 0)],
        refund ? ['Trade-in', '+' + DR.money(refund), 'good'] : null
      ]),
      riskBox(S1),
      id === cur ? h('div', { class: 'okbox' }, 'Installed on this car.') :
        btn(net > 0 ? 'Buy & Install (' + DR.money(net) + ')' : 'Install (+' + DR.money(-net) + ')', function () {
          var r = G.buyPart(cat, id);
          UI.toast(r.msg);
          if (r.ok) { A.cash(); close(); UI.refresh(); }
        }, 'go' + (G.state.money + refund < (opt.price || 0) ? ' disabled' : '')),
      btn('Close', function () { close(); }, 'small'));
  }

  // ------------------------------------------------------------ TUNE
  var tuneGroup = 'Engine';
  UI.Tune = function () {
    var inst = G.car(), S = G.spec(inst);
    var groups = ['Engine', 'Drivetrain', 'Tires', 'Suspension', 'Nitrous'];
    var tabs = h('div', { class: 'tabs' }, groups.map(function (g) { return btn(g, function () { tuneGroup = g; UI.refresh(); }, g === tuneGroup ? 'on' : ''); }));
    var list = h('div', { class: 'col' });
    var statBox = h('div', { class: 'panel col' });
    var timer = 0;
    function recalc() {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var S2 = G.spec(inst), est = G.estimate(inst, DR.QUARTER), est8 = G.estimate(inst, DR.EIGHTH);
        statBox.innerHTML = '';
        add(statBox, [statsGrid([
          ['Peak power', fmtHp(S2.peakHp) + ' @ ' + S2.peakHpRpm, 'acc'],
          ['Peak torque', Math.round(S2.peakTq) + ' lb-ft'],
          S2.nosHp ? ['Nitrous', '+' + S2.nosHp + ' hp'] : null,
          ['Redline', S2.red + ' rpm'],
          ['Est. 1/8', est8.et >= 90 ? 'crash!' : est8.et.toFixed(2) + 's', 'good'],
          ['Est. 1/4', est.et >= 90 ? 'crash!' : est.et.toFixed(2) + 's @ ' + Math.round(est.trap), 'good']
        ]), riskBox(S2)]);
      }, 120);
    }
    DR.TUNE_DEFS.forEach(function (def) {
      if (def.group !== tuneGroup) return;
      var unlocked = def.show(S);
      if (def.key === 'gears') {
        if (!unlocked) { list.appendChild(h('div', { class: 'tune-row locked' }, h('div', { class: 'lab' }, h('span', {}, def.label), h('span', { class: 'tag r' }, 'LOCKED')), h('div', { class: 'help' }, def.req))); return; }
        var gg = h('div', { class: 'gear-grid' });
        S.tune.gears.forEach(function (g, gi) {
          gg.appendChild(slider('Gear ' + (gi + 1), g, 0.5, 4.5, 0.01, ':1', function (v) {
            var arr = (inst.tune.gears || S.tune.gears).slice(); arr[gi] = v; inst.tune.gears = arr; G.save(); recalc();
          }));
        });
        list.appendChild(h('div', { class: 'tune-row' }, h('div', { class: 'lab' }, h('span', {}, def.label)), gg));
        return;
      }
      if (!unlocked) {
        list.appendChild(h('div', { class: 'tune-row locked' }, h('div', { class: 'lab' }, h('span', {}, def.label), h('span', { class: 'tag r' }, 'LOCKED')), h('div', { class: 'help' }, def.req)));
        return;
      }
      var mn = def.min(S), mx = def.max(S);
      var row = slider(def.label, S.tune[def.key], mn, mx, def.step, def.unit, function (v) { inst.tune[def.key] = v; G.save(); recalc(); }, def.key === 'tcSlip' ? function (v) { return v === 0 ? 'OFF' : null; } : null);
      row.appendChild(h('div', { class: 'help' }, def.help + (def.key === 'psi' ? ' Ideal: ' + S.tire.optP + ' psi.' : '') + (def.key === 'boost' ? ' Fuel knock limit: ' + S.knock + ' psi.' : '')));
      list.appendChild(row);
    });
    recalc();
    var tools = h('div', { class: 'row', style: { flexWrap: 'wrap' } },
      btn('Auto Shift Point', function () { inst.tune.shiftRpm = DR.suggestShift(G.spec(inst)); G.save(); UI.toast('Shift point set to ' + inst.tune.shiftRpm + ' rpm'); UI.refresh(); }, 'small'),
      btn('Reset Tune', function () { UI.confirm('Reset every tuning value to default?', function () { inst.tune = {}; G.save(); UI.refresh(); }); }, 'small red'),
      btn('Dyno', function () { UI.show(UI.Dyno); }, 'small'),
      btn('Test Run', function () { DR.Race.start({ mode: 'test', dist: DR.QUARTER, theme: 'strip', grip: 1, back: 'tune' }); }, 'small go'));
    return h('div', { class: 'screen' }, top('TUNING', function () { UI.show(UI.Garage); }),
      h('div', { class: 'content' }, tabs, h('div', { class: 'split' },
        h('div', { class: 'right' }, list),
        h('div', { class: 'left', style: { width: '34%' } }, statBox, h('div', { style: { height: '8px' } }), tools))));
  };

  function slider(label, val, mn, mx, step, unit, onchange, fmt) {
    var dec = step < 0.1 ? 2 : step < 1 ? 1 : 0;
    var vEl = h('span', { class: 'val' });
    function show(v) { var f = fmt && fmt(v); vEl.textContent = f || (Number(v).toFixed(dec) + ' ' + unit); }
    var inp = h('input', { type: 'range', min: mn, max: mx, step: step, value: val });
    inp.addEventListener('input', function () { var v = parseFloat(inp.value); show(v); onchange(v); });
    show(val);
    return h('div', { class: 'tune-row' }, h('div', { class: 'lab' }, h('span', {}, label), vEl), inp);
  }

  // ------------------------------------------------------------ DYNO
  UI.Dyno = function () {
    var inst = G.car(), S = G.spec(inst), dy = DR.dyno(S);
    var cv = h('canvas', { width: 480, height: 220 });
    var info = h('div', { class: 'panel' });
    var sweep = { p: 1 };
    function draw() {
      var ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#0c0d10'; ctx.fillRect(0, 0, W, H);
      var L = 34, R = W - 30, T = 14, B = H - 22;
      var maxHp = Math.max(100, (dy.peakHp + S.nosHp) * 1.12), maxTq = Math.max(100, dy.peakTq * 1.15 + (S.nosW ? S.nosHp * 5252 / 3000 : 0));
      var maxV = Math.max(maxHp, maxTq);
      var r0 = 1000, r1 = S.red + 200;
      function X(r) { return L + (r - r0) / (r1 - r0) * (R - L); }
      function Y(v) { return B - v / maxV * (B - T); }
      ctx.fillStyle = '#1b1d24';
      for (var r = 1000; r <= r1; r += 1000) { ctx.fillRect(Math.round(X(r)), T, 1, B - T); DR.pixText(ctx, String(r / 1000), Math.round(X(r)) - 1, B + 6, '#666'); }
      var stepV = [25, 50, 100, 200, 250, 500, 1000].filter(function (st) { return maxV / st <= 6; })[0] || 1000;
      for (var v = 0; v <= maxV; v += stepV) { ctx.fillRect(L, Math.round(Y(v)), R - L, 1); DR.pixText(ctx, String(v), 2, Math.round(Y(v)) - 2, '#666'); }
      ctx.fillStyle = '#ff3030'; ctx.fillRect(Math.round(X(S.red)), T, 1, B - T);
      var limit = r0 + (r1 - r0) * sweep.p;
      function line(key, col, add) {
        ctx.fillStyle = col;
        for (var i = 1; i < dy.pts.length; i++) {
          var a = dy.pts[i - 1], b = dy.pts[i];
          if (b.rpm > limit) break;
          var va = a[key] + (add ? add(a) : 0), vb = b[key] + (add ? add(b) : 0);
          var steps = Math.ceil(X(b.rpm) - X(a.rpm));
          for (var k = 0; k <= steps; k++) { var t = k / steps; ctx.fillRect(Math.round(X(a.rpm + (b.rpm - a.rpm) * t)), Math.round(Y(va + (vb - va) * t)), 2, 2); }
        }
      }
      if (S.nosHp) line('hp', '#7a3ad6', function (p) { return p.rpm > 2200 ? S.nosHp : 0; });
      line('tq', '#4da3ff'); line('hp', '#ffcc00');
      if (S.fiType !== 'none') {
        ctx.fillStyle = '#46e07a';
        dy.pts.forEach(function (p) { if (p.rpm <= limit) ctx.fillRect(Math.round(X(p.rpm)), Math.round(B - p.boost / Math.max(S.maxBoost, 1) * (B - T) * 0.5), 1, 1); });
      }
      DR.pixText(ctx, 'HP', R + 6, T + 2, '#ffcc00'); DR.pixText(ctx, 'TQ', R + 6, T + 10, '#4da3ff');
      if (S.fiType !== 'none') DR.pixText(ctx, 'PSI', R + 2, T + 18, '#46e07a');
      if (S.nosHp) DR.pixText(ctx, 'N2O', R + 2, T + 26, '#9b4dff');
      DR.pixText(ctx, 'RPM X1000', Math.round((L + R) / 2) - 18, B + 13, '#666');
    }
    info.appendChild(statsGrid([
      ['Peak HP', Math.round(dy.peakHp) + ' @ ' + dy.peakHpRpm + ' rpm', 'acc'],
      ['Peak torque', Math.round(dy.peakTq) + ' lb-ft'],
      S.nosHp ? ['With nitrous', Math.round(dy.peakHp + S.nosHp) + ' hp', 'acc'] : null,
      S.fiType !== 'none' ? ['Boost', S.boostSet.toFixed(1) + ' psi'] : null,
      ['Redline', S.red + ' rpm'],
      ['Safe power', Math.round(S.safeHp) + ' hp', (dy.peakHp + S.nosHp) > S.safeHp ? 'bad' : 'good']
    ]));
    draw();
    var raf = 0, voice = null;
    function run() {
      A.init(); A.resume();
      if (voice) return;
      voice = A.engine(S.eng.cyl, 0.8);
      var t0 = performance.now();
      sweep.p = 0;
      (function tick() {
        var t = (performance.now() - t0) / 3000;
        sweep.p = Math.min(1, t);
        var rpm = 1000 + (S.red + 200 - 1000) * sweep.p;
        A.update(voice, rpm, 1, DR.steadyBoost(S, rpm), 0, S.fiType);
        draw();
        if (t < 1) raf = requestAnimationFrame(tick);
        else { A.update(voice, S.idle, 0, 0, 0, S.fiType); A.pop(); setTimeout(function () { A.stopAll(); voice = null; }, 400); }
      })();
    }
    UI.cleanup = function () { cancelAnimationFrame(raf); A.stopAll(); voice = null; };
    return h('div', { class: 'screen' }, top('DYNO', function () { UI.show(UI.Garage); }),
      h('div', { class: 'content' }, h('div', { class: 'split dyno' },
        h('div', { class: 'right' }, cv),
        h('div', { class: 'left', style: { width: '32%' } }, info, h('div', { style: { height: '8px' } }), riskBox(S), h('div', { style: { height: '8px' } }),
          h('div', { class: 'row' }, btn('▶ Run Dyno', run, 'go'), btn('Tune', function () { UI.show(UI.Tune); }))))));
  };

  // ------------------------------------------------------------ DEALER
  var dealerCat = 'Compact', dealerSel = null;
  UI.Dealer = function () {
    var tabs = h('div', { class: 'tabs' }, DR.CAR_CATS.map(function (c) { return btn(c, function () { dealerCat = c; dealerSel = null; UI.refresh(); }, c === dealerCat ? 'on' : ''); }));
    var grid = h('div', { class: 'cards' });
    Object.keys(DR.CARS).filter(function (id) { return DR.CARS[id].cat === dealerCat; })
      .sort(function (a, b) { return DR.CARS[a].price - DR.CARS[b].price; })
      .forEach(function (id) {
        var car = DR.CARS[id], inst = { carId: id, engine: car.engine, parts: {}, tune: {}, color: car.col };
        var S = DR.buildSpec(inst);
        var cv = h('canvas', { width: 200, height: 100 });
        DR.drawPreview(cv, inst);
        grid.appendChild(h('div', { class: 'card' + (dealerSel === id ? ' sel' : ''), onclick: function () { dealerSel = id; showCar(id); } }, cv,
          h('div', { class: 't acc' }, car.name),
          h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'dim' }, Math.round(S.peakHp) + 'hp • ' + S.drive), h('span', { class: 'price' }, DR.money(car.price)))));
      });
    function showCar(id) {
      var car = DR.CARS[id], inst = { carId: id, engine: car.engine, parts: {}, tune: {}, color: car.col };
      var S = DR.buildSpec(inst), est = G.estimate(inst, DR.QUARTER);
      var cv = h('canvas', { width: 300, height: 120, style: { width: '100%' } });
      DR.drawPreview(cv, inst);
      var close = UI.modal([cv, h('h2', {}, car.name), statsGrid([
        ['Engine', S.eng.name], ['Power', fmtHp(S.peakHp)], ['Torque', Math.round(S.peakTq) + ' lb-ft'], ['Weight', kgLb(S.m) + ' (' + Math.round(S.f * 100) + '% front)'],
        ['Drive', S.drive + ', ' + DR.TRANS[S.transId].name], ['Tires', S.tire.name], ['Est. 1/4', est.et.toFixed(2) + 's @ ' + Math.round(est.trap)], ['Price', DR.money(car.price), 'good']]),
        h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '10px' } },
          btn('Close', function () { close(); }),
          btn('Buy', function () {
            if (!G.canAfford(car.price)) return UI.toast('Not enough money');
            G.buyCar(id); A.cash(); close(); UI.toast('You bought the ' + car.name + '!'); UI.show(UI.Garage);
          }, 'go' + (G.canAfford(car.price) ? '' : ' disabled')))]);
    }
    return h('div', { class: 'screen' }, top('DEALERSHIP', function () { UI.show(UI.Garage); }), h('div', { class: 'content' }, tabs, grid));
  };

  // ------------------------------------------------------------ MY CARS
  UI.Cars = function () {
    var grid = h('div', { class: 'cards' });
    G.state.cars.forEach(function (inst) {
      var S = DR.buildSpec(inst), active = inst.uid === G.state.active;
      var cv = h('canvas', { width: 200, height: 100 });
      DR.drawPreview(cv, inst);
      grid.appendChild(h('div', { class: 'card' + (active ? ' sel' : '') }, cv,
        h('div', { class: 't acc' }, DR.CARS[inst.carId].name),
        h('div', { class: 'dim' }, Math.round(S.peakHp + S.nosHp) + 'hp • ' + (inst.best && inst.best.q ? inst.best.q.toFixed(2) + 's' : 'no time') + (inst.damage ? ' • BROKEN' : '')),
        h('div', { class: 'row' },
          active ? h('span', { class: 'tag g' }, 'DRIVING') : btn('Drive', function () { G.state.active = inst.uid; G.save(); UI.show(UI.Garage); }, 'small go'),
          G.state.cars.length > 1 ? btn('Sell ' + DR.money(G.carValue(inst)), function () {
            UI.confirm('Sell the ' + DR.CARS[inst.carId].name + ' for ' + DR.money(G.carValue(inst)) + '?', function () { G.sellCar(inst.uid); A.cash(); UI.refresh(); });
          }, 'small red') : null)));
    });
    return h('div', { class: 'screen' }, top('MY CARS', function () { UI.show(UI.Garage); }), h('div', { class: 'content' }, grid));
  };

  // ------------------------------------------------------------ PAINT
  UI.Paint = function () {
    var inst = G.car();
    var draft = { color: inst.color, stripe: inst.stripe, rim: inst.rim };
    var cv = h('canvas', { class: 'preview', width: 320, height: 140, style: { width: '100%' } });
    var costEl = h('span', { class: 'pix acc' });
    function cost() { return (draft.color !== inst.color ? 400 : 0) + (draft.stripe !== inst.stripe ? 200 : 0) + (draft.rim !== inst.rim ? 150 : 0); }
    function redraw() {
      DR.drawPreview(cv, { carId: inst.carId, engine: inst.engine, parts: inst.parts, color: draft.color, stripe: draft.stripe, rim: draft.rim });
      costEl.textContent = 'Cost: ' + DR.money(cost());
    }
    function swatches(key, colors, allowNone) {
      var wrap = h('div', { class: 'swatches' });
      if (allowNone) wrap.appendChild(h('div', { class: 'sw' + (!draft[key] ? ' on' : ''), style: { background: 'repeating-linear-gradient(45deg,#333 0 4px,#555 4px 8px)' }, onclick: function () { draft[key] = ''; mark(wrap, this); redraw(); } }));
      colors.forEach(function (c) {
        wrap.appendChild(h('div', { class: 'sw' + (draft[key] === c ? ' on' : ''), style: { background: c }, onclick: function () { draft[key] = c; mark(wrap, this); redraw(); } }));
      });
      return wrap;
    }
    function mark(wrap, el) { Array.prototype.forEach.call(wrap.children, function (x) { x.classList.remove('on'); }); el.classList.add('on'); }
    redraw();
    var rims = ['#c8c8c8', '#ffffff', '#ffd700', '#151515', '#d23a3a', '#3a7bd2', '#7cd320', '#ff6a00', '#8a8f99', '#b06bff'];
    return h('div', { class: 'screen' }, top('PAINT SHOP', function () { UI.show(UI.Garage); }),
      h('div', { class: 'content' }, h('div', { class: 'split' },
        h('div', { class: 'left', style: { width: '45%' } }, cv, h('div', { style: { margin: '8px 0' } }, costEl),
          btn('Apply', function () {
            var c = cost();
            if (!c) return UI.toast('Nothing changed');
            if (!G.canAfford(c)) return UI.toast('Not enough money');
            G.pay(c); inst.color = draft.color; inst.stripe = draft.stripe; inst.rim = draft.rim; G.save(); A.cash(); UI.toast('Fresh paint!'); UI.show(UI.Garage);
          }, 'go')),
        h('div', { class: 'right' }, h('h3', {}, 'BODY ($400)'), swatches('color', DR.PAINTS), h('h3', {}, 'STRIPE ($200)'), swatches('stripe', DR.PAINTS, true), h('h3', {}, 'WHEELS ($150)'), swatches('rim', rims)))));
  };

  // ------------------------------------------------------------ SETTINGS
  UI.Settings = function (back) {
    var s = G.state.settings;
    function toggle(label, key, a, b, la, lb, help) {
      return h('div', { class: 'item' }, h('div', { class: 'name' }, h('div', {}, label), help ? h('div', { class: 'dim', style: { fontSize: '16px' } }, help) : null),
        btn(la, function () { s[key] = a; G.save(); if (key === 'sound') A.setOn(a); UI.refresh(); }, 'small ' + (s[key] === a ? 'primary' : '')),
        btn(lb, function () { s[key] = b; G.save(); if (key === 'sound') A.setOn(b); UI.refresh(); }, 'small ' + (s[key] === b ? 'primary' : '')));
    }
    return h('div', { class: 'screen' }, top('SETTINGS', function () { UI.show(back || UI.Garage); }),
      h('div', { class: 'content' }, h('div', { class: 'list' },
        toggle('Sound', 'sound', true, false, 'On', 'Off'),
        toggle('Shifting', 'autoShift', false, true, 'Manual', 'Auto', 'Auto-shift uses the shift RPM from your tune.'),
        toggle('Christmas tree', 'proTree', false, true, 'Sportsman', 'Pro', 'Pro tree: all ambers flash at once, green 0.4s later.'),
        toggle('Speed units', 'units', 'mph', 'kmh', 'MPH', 'KM/H'),
        toggle('Gas pedal', 'pedal', 'hold', 'slide', 'Hold', 'Slide', 'Slide: how high you touch the pedal sets the throttle - feather it to stop wheelspin.'),
        h('div', { class: 'item' }, h('div', { class: 'name' }, 'Erase save data'), btn('Reset', function () {
          UI.confirm('Erase everything and start over?', function () { G.reset(); UI.show(UI.Title); }, 'Erase');
        }, 'small red')))));
  };

  // ------------------------------------------------------------ HELP
  UI.Help = function (back) {
    function p(t) { return h('p', { style: { margin: '0 0 8px' } }, t); }
    return h('div', { class: 'screen' }, top('HOW TO PLAY', function () { UI.show(back || UI.Garage); }),
      h('div', { class: 'content' }, h('div', { class: 'panel', style: { maxWidth: '820px' } },
        h('h2', {}, 'Racing'),
        p('1. Optional: hit BURNOUT and hold GAS to heat your tires. Slicks need heat to grip - watch the tire temp meter.'),
        p('2. Hit STAGE. Hold GAS to rev the engine. Keep the RPM in the green launch zone (a 2-step holds it for you).'),
        p('Automatics: the torque converter decides how high the engine revs on the line (low, medium or high stall). Without a transbrake you are on the foot brake: it can only hold so much, so the game eases off the throttle for you (BRAKES AT LIMIT) and the launch is a bit softer. A transbrake holds full throttle and boost and lets go instantly.'),
        p('3. When the light turns GREEN, tap LAUNCH. Too early = red light and you lose.'),
        p('4. Keep holding GAS. Tap SHIFT when the blue shift light flashes. If the tires spin (SPIN warning / smoke), ease off the gas for a moment.'),
        p('5. Got nitrous? Tap NOS to spray. Big wheelies can flip the car - lift off the gas or install wheelie bars.'),
        h('h2', {}, 'Building'),
        p('Win money in the Career Ladder and Street Races, then spend it in the Upgrade Shop: engine swaps, turbos, superchargers, nitrous, gearboxes, suspension, tires and more.'),
        p('Watch the risk warnings: too much power for your internals, boost past your fuel\'s knock limit or more torque than the gearbox can hold can break parts mid-race. Repairs cost money!'),
        h('h2', {}, 'Tuning'),
        p('Grip comes from tire compound, tire pressure (each tire has an ideal psi), tire temperature and weight transfer. Ladder bars / 4-links, springs and shocks change how hard the car hits the tires. Gearing, launch RPM, boost, and throttle management decide whether you hook or go up in smoke.'),
        p('Use the Dyno to see your power curve and Test & Tune to try changes for free.'))));
  };
})();
