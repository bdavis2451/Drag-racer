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
  // Work spread over frames (~8 ms a frame) so screens appear at once:
  // UI.later for the current screen (dropped when the screen changes),
  // UI.warm for background cache warming (runs when nothing else is queued).
  var jobs = [], warmJobs = [], pumping = false;
  function pump() {
    var t0 = performance.now();
    while ((jobs.length || warmJobs.length) && performance.now() - t0 < 8) {
      var f = jobs.length ? jobs.shift() : warmJobs.shift();
      try { f(); } catch (e) { /* a stale job */ }
    }
    if (jobs.length || warmJobs.length) requestAnimationFrame(pump); else pumping = false;
  }
  function kick() { if (!pumping) { pumping = true; requestAnimationFrame(pump); } }
  // Draggable camera on a car view (garage, dealer, body shop, paint):
  // dragging zooms in a little and pans so the nose or tail can be seen up
  // close on small screens; pinch / mouse wheel zoom, double-tap resets.
  // The view never pans past its own edges.
  UI.dragCam = function (el) {
    var z = 1, tx = 0, ty = 0, pts = {}, last = null, pinch = null, lastTap = 0, moved = false;
    el.classList.add('dragcam');
    function apply(anim) {
      var w = el.clientWidth, hh = el.clientHeight, mx = (z - 1) / 2 * w, my = (z - 1) / 2 * hh;
      tx = Math.max(-mx, Math.min(mx, tx)); ty = Math.max(-my, Math.min(my, ty));
      el.style.transition = anim ? 'transform .2s ease-out' : 'none';
      el.style.transform = z === 1 ? '' : 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + z.toFixed(3) + ')';
    }
    function zoomTo(nz, anim) { var k = nz / z; tx *= k; ty *= k; z = Math.max(1, Math.min(2.6, nz)); apply(anim); }
    function ids() { return Object.keys(pts); }
    el.addEventListener('pointerdown', function (e) {
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      moved = false; last = { x: e.clientX, y: e.clientY };
      if (ids().length === 2) { var a = pts[ids()[0]], b = pts[ids()[1]]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: z }; }
    });
    el.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (pinch && ids().length >= 2) { var a = pts[ids()[0]], b = pts[ids()[1]]; zoomTo(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.d)); moved = true; return; }
      var dx = e.clientX - last.x, dy = e.clientY - last.y;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      if (!moved && z === 1) zoomTo(1.6, true);
      moved = true; last = { x: e.clientX, y: e.clientY };
      tx += dx; ty += dy; apply(false);
    });
    function up(e) {
      delete pts[e.pointerId];
      if (ids().length < 2) pinch = null;
      if (!moved && e.type === 'pointerup') {
        var now = Date.now();
        if (now - lastTap < 320) { z = 1; tx = 0; ty = 0; apply(true); lastTap = 0; } else lastTap = now;
      }
    }
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', function (e) { e.preventDefault(); zoomTo(z * (e.deltaY < 0 ? 1.12 : 1 / 1.12), true); }, { passive: false });
    return el;
  };
  UI.later = function (fn) { jobs.push(fn); kick(); };
  UI.warm = function (fn) { warmJobs.push(fn); kick(); };
  // A car preview canvas that draws itself a frame or two later.
  UI.lazyPreview = function (cls, inst, opts) {
    var c = h('canvas', { class: cls });
    UI.later(function () { DR.drawPreview(c, inst, opts); });
    return c;
  };

  UI.show = function (fn, arg) {
    if (UI.cleanup) { try { UI.cleanup(); } catch (e) { /* ignore */ } }
    UI.cleanup = null;
    jobs.length = 0;
    // a dialog belongs to the screen it was opened on: leaving closes it
    if (!UI.refreshing) document.querySelectorAll('.modal').forEach(function (m) { m.parentNode.removeChild(m); });
    // redrawn in place: every scrolled row and list keeps its place
    var scrolls = UI.refreshing && UI.cur && UI.cur.fn === fn ? scrollSnap() : null;
    UI.app.innerHTML = '';
    UI.app.appendChild(fn(arg));
    UI.cur = { fn: fn, arg: arg };
    UI.app.querySelectorAll('input[type=range]').forEach(rangeFill);
    if (scrolls) { scrollRestore(scrolls); requestAnimationFrame(function () { scrollRestore(scrolls); showSelected(true); }); }
    else requestAnimationFrame(function () { showSelected(false); });
  };
  // Which tab, category or slot each screen was last on, kept in the save so
  // the game reopens where you left it. UI.memory(owner) is true once per
  // loaded game (time to read G.state.ui); UI.remember stores and saves.
  var memLoaded = {}, memTimer = null;
  UI.memory = function (owner) {
    if (memLoaded[owner] === G.state) return null;
    memLoaded[owner] = G.state;
    return G.state.ui || {};
  };
  UI.remember = function (o) {
    var m = G.state.ui || (G.state.ui = {}), changed = false;
    for (var k in o) if (m[k] !== o[k]) { m[k] = o[k]; changed = true; }
    if (changed) { clearTimeout(memTimer); memTimer = setTimeout(function () { G.save(); }, 400); }
  };
  // scroll positions by element class and position among its look-alikes
  function scrollKeys() {
    var seen = {}, out = [];
    UI.app.querySelectorAll('*').forEach(function (el) {
      if (el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1) return;
      var k = el.tagName + '.' + el.className, n = seen[k] = (seen[k] || 0) + 1;
      out.push([k + '#' + n, el]);
    });
    return out;
  }
  function scrollSnap() { var m = {}; scrollKeys().forEach(function (e) { if (e[1].scrollLeft || e[1].scrollTop) m[e[0]] = [e[1].scrollLeft, e[1].scrollTop]; }); return m; }
  function scrollRestore(m) { scrollKeys().forEach(function (e) { var v = m[e[0]]; if (v) { e[1].scrollLeft = v[0]; e[1].scrollTop = v[1]; } }); }
  // a selected chip or tab that sits off the edge of its row slides into the middle
  function showSelected(smooth) {
    UI.app.querySelectorAll('.schips').forEach(function (row) {
      var on = row.querySelector('.on');
      if (!on || row.scrollWidth <= row.clientWidth + 1) return;
      var l = on.offsetLeft, r = l + on.offsetWidth;
      if (l >= row.scrollLeft && r <= row.scrollLeft + row.clientWidth) return;
      var to = Math.max(0, l - (row.clientWidth - on.offsetWidth) / 2);
      if (smooth && row.scrollTo) row.scrollTo({ left: to, behavior: 'smooth' }); else row.scrollLeft = to;
    });
  }
  // sliders fill their track up to the value (CSS --p)
  function rangeFill(el) {
    var lo = +el.min || 0, hi = el.max === '' ? 100 : +el.max;
    el.style.setProperty('--p', (hi > lo ? (el.value - lo) / (hi - lo) * 100 : 0) + '%');
  }
  document.addEventListener('input', function (e) { if (e.target && e.target.type === 'range') rangeFill(e.target); }, true);
  // UI.refreshing: the screen is being redrawn in place, not opened
  UI.refresh = function () { if (UI.cur) { UI.refreshing = true; try { UI.show(UI.cur.fn, UI.cur.arg); } finally { UI.refreshing = false; } } };
  // Back (Android back button, browser back, Escape): close the top dialog,
  // otherwise press the screen's own back / quit button.
  UI.goBack = function () {
    var ms = document.querySelectorAll('.modal');
    if (ms.length) { var m = ms[ms.length - 1]; m.parentNode.removeChild(m); return true; }
    var root = UI.app && UI.app.firstChild;
    if (root && root._back) { root._back(); return true; }
    var b = UI.app && (UI.app.querySelector('.top .back') || UI.app.querySelector('.controls .quit'));
    if (b && b.offsetParent !== null) { b.click(); return true; }
    return false;
  };

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

  UI.top = function (t, b, x) { return top(t, b, x); };
  function top(title, back, extra) {
    return h('div', { class: 'top' },
      back ? btn('◀', back, 'back') : null,
      h('h1', {}, title),
      h('div', { class: 'money', id: 'money' }, DR.money(G.state.money)), extra || null);
  }
  // The garage's two work areas share one header: back to the garage, a row
  // of tabs, the money. Upgrade = everything that makes the car quicker,
  // Style = everything that makes it look good.
  UI.SECTIONS = {
    upgrade: [['shop', 'Shop', function () { UI.openShop(); }], ['pkg', 'Packages', function () { UI.openPackages(); }],
      ['install', 'Install', function () { UI.show(UI.Parts); }], ['inv', 'Inventory', function () { UI.show(UI.Inventory); }],
      ['tune', 'Tune', function () { UI.show(UI.Tune); }], ['dyno', 'Dyno', function () { UI.show(UI.Dyno); }]],
    style: [['body', 'Body Kits', function () { UI.show(UI.Body); }], ['paint', 'Paint', function () { UI.show(UI.Paint); }]]
  };
  UI.sectionTop = function (section, active, onLeave) {
    var inst = G.car();
    function badge(id) {
      if (id === 'shop' && G.newPartsCount && G.newPartsCount()) return 'NEW';
      if (id === 'body' && G.newVisCount && G.newVisCount()) return 'NEW';
      if (id === 'install' && inst) { var n = G.state.inv.filter(function (it) { return !it.stock && !G.partFitIssue(it, inst); }).length; return n ? String(n) : ''; }
      if (id === 'inv') return G.state.inv.length ? String(G.state.inv.length) : '';
      return '';
    }
    var tabs = h('div', { class: 'schips stabs' }, UI.SECTIONS[section].map(function (t) {
      var b = badge(t[0]);
      return btn([h('span', {}, t[1]), b ? h('span', { class: b === 'NEW' ? 'newdot' : 'tcount' }, b) : null], function () { if (t[0] === active) return; if (onLeave) onLeave(); t[2](); }, 'chip stab' + (t[0] === active ? ' on' : ''));
    }));
    var rem = {}; rem['sec_' + section] = active; UI.remember(rem);
    return h('div', { class: 'top sectop' },
      btn('◀', function () { if (onLeave) onLeave(); UI.show(UI.Garage); }, 'back'),
      h('h1', { class: 'sectitle' }, section === 'upgrade' ? 'UPGRADE' : 'STYLE'), tabs,
      h('div', { class: 'money', id: 'money' }, DR.money(G.state.money)));
  };
  // open a section on the tab it was last left on
  UI.openSection = function (section) {
    var last = (G.state.ui || {})['sec_' + section], tabs = UI.SECTIONS[section];
    (tabs.filter(function (t) { return t[0] === last; })[0] || tabs[0])[2]();
  };
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
    if (r.axle > 0.001) out.push(h('div', { class: 'warnbox' }, 'Broken axle risk: ' + Math.round(r.axle * 100) + '% per run'));
    if (r.chassis > 0.001) out.push(h('div', { class: 'warnbox' }, 'Cracked chassis risk: ' + Math.round(r.chassis * 100) + '% per run'));
    r.notes.forEach(function (n) { out.push(h('div', { class: 'dim', style: { fontSize: '16px' } }, '• ' + n)); });
    return out;
  }
  UI.riskBox = riskBox;

  function carStats(inst, S) {
    var tr = DR.TRANS[S.transId];
    return statsGrid([
      ['Engine', S.eng.name],
      ['Power', fmtHp(S.peakHp) + (S.nosHp ? ' +' + S.nosHp + ' N2O' : ''), 'acc'],
      ['Torque', Math.round(S.peakTq) + ' lb-ft'],
      S.fiType !== 'none' ? ['Boost', S.boostSet.toFixed(1) + ' psi ' + DR.FI[S.fiId].name.replace('Factory ', '')] : null,
      S.fiType !== 'none' ? ['Intake air', Math.round(S.iat) + ' C / ' + Math.round(S.iat * 1.8 + 32) + ' F at full boost • knocks past ' + S.knock + ' psi', S.iat > 75 || S.boostSet > S.knock + 0.5 ? 'bad' : ''] : null,
      ['Weight', kgLb(S.m) + ' (' + Math.round(S.f * 100) + '% front)'],
      ['Drive', S.drive + ', ' + S.ratios.length + '-spd ' + { manual: 'manual', auto: 'auto', seq: 'sequential', dct: 'DCT' }[tr.type]],
      tr.type === 'auto' ? ['Converter', S.stall + ' stall' + (S.tbrake ? ' + transbrake' : ', foot brake')] : null,
      ['Tires', S.tire.name],
      ['Chassis', (S.shell === Infinity ? 'takes any power' : 'takes ' + Math.round(S.shell) + ' hp') + ' • ' + ['no roll bar', 'roll bar', 'roll cage'][S.tech || 0], S.peakHp + S.nosHp > S.shell ? 'bad' : ''],
      ['Visual rating', DR.starText(DR.starRating(inst)), 'acc'],
      inst.best && inst.best.q ? ['Best 1/4', inst.best.q.toFixed(3) + 's', 'acc'] : null,
      inst.best && inst.best.e ? ['Best 1/8', inst.best.e.toFixed(3) + 's', 'acc'] : null
    ]);
  }

  UI.statsGrid = statsGrid; UI.carStats = carStats; UI.fmtHp = fmtHp; UI.kgLb = kgLb;
  UI.careerLine = function () { return careerLine(); };

  function careerLine() {
    var c = G.careerState(), st = DR.STAGES[c.stage], sp = c.sponsor[c.stage];
    return h('div', { class: 'acc', style: { fontSize: '16px', marginTop: '6px' } }, 'Career: Stage ' + (c.stage + 1) + ' (' + st.name + ') • ' + G.stageWins(c.stage) + '/' + st.events.length + ' wins' +
      (sp ? ' • ' + DR.sponsorById(sp.id).name : ' • no sponsor'));
  }

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
        (function () {
          var val = h('span', { class: 'acc' }, Math.round(s.volume * 100) + '%');
          var r = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s.volume, style: { width: '180px' } });
          r.addEventListener('input', function () { s.volume = parseFloat(r.value); A.setVolume(s.volume); val.textContent = Math.round(s.volume * 100) + '%'; });
          r.addEventListener('change', function () { G.save(); A.init(); A.resume(); A.beep(660, 0.08); });
          return h('div', { class: 'item' }, h('div', { class: 'name' }, h('div', {}, 'Volume')), val, r);
        })(),
        toggle('Shifting', 'autoShift', false, true, 'Manual', 'Auto', 'Auto-shift uses the shift RPM from your tune. Automatic transmissions always shift themselves.'),
        toggle('Christmas tree', 'proTree', false, true, 'Sportsman', 'Pro', 'Pro tree: all ambers flash at once, green 0.4s later.'),
        toggle('Speed units', 'units', 'mph', 'kmh', 'MPH', 'KM/H'),
        toggle('Gas pedal', 'pedal', 'hold', 'slide', 'Hold', 'Slide', 'Slide: how high you touch the pedal sets the throttle - feather it to stop wheelspin.'),
        toggle('Auto-repair', 'autoRepair', false, true, 'Off', 'On', 'On: anything you break is fixed and paid for right after the race, when you have the cash.'),
        h('div', { class: 'item' }, h('div', { class: 'name' }, h('div', {}, 'Unlock everything'), h('div', { class: 'dim', style: { fontSize: '16px' } }, 'For testing: every stage, car, part level and body-kit tier, plus $5,000,000.')),
          btn('Unlock', function () {
            UI.confirm('Unlock everything on this save? This cannot be undone (except by erasing the save).', function () { G.unlockAll(); A.cash(); UI.toast('Everything unlocked'); UI.refresh(); }, 'Unlock');
          }, 'small')),
        h('div', { class: 'item' }, h('div', { class: 'name' }, 'Erase save data'), btn('Reset', function () {
          UI.confirm('Erase everything and start over?', function () { G.reset(); UI.show(UI.Title); }, 'Erase');
        }, 'small red')))));
  };

  // ------------------------------------------------------------ HELP
  UI.Help = function (back) {
    function p(t) { return h('p', { style: { margin: '0 0 8px' } }, t); }
    var panel, scr = h('div', { class: 'screen' }, top('HOW TO PLAY', function () { UI.show(back || UI.Garage); }),
      h('div', { class: 'content' }, panel = h('div', { class: 'panel', style: { maxWidth: '820px' } },
        h('h2', {}, 'Racing'),
        p('1. Every race starts in the burnout box with the line lock on. Hold GAS to spin the rear tires and heat them (slicks need heat to grip - watch the tire temp meter), then hit STAGE to end the burnout and roll up to the line. Hit STAGE straight away to skip it and race on cold tires.'),
        p('2. Your opponent does their own burnout and stages when they are ready; the tree comes down once both cars are staged. Hold GAS to rev the engine and keep the RPM in the green launch zone (a 2-step holds it for you).'),
        p('Automatics: the torque converter decides how high the engine revs on the line (low, medium or high stall). Without a transbrake you are on the foot brake: it can only hold so much, so the game eases off the throttle for you (BRAKES AT LIMIT) and the launch is a bit softer. A transbrake holds full throttle and boost and lets go instantly.'),
        p('3. When the light turns GREEN, tap LAUNCH. Too early = red light and you lose.'),
        p('4. Keep holding GAS. Tap SHIFT when the shift lights on the dash flash blue. If the tires go up in smoke, ease off the gas for a moment.'),
        p('5. Got nitrous? Tap NOS to spray. Big wheelies can flip the car - lift off the gas or install wheelie bars.'),
        p('6. The time slip comes up a couple of seconds after the finish. Tap WATCH to slide it away and see the cars coast down the shutdown. The back button (or Esc) always takes you back a screen.'),
        h('h2', {}, 'Career'),
        p('Race opens on the career road: each stop is a race, in the order they open. Two stops stacked means either one. Side races branch off above the road and have entry rules; the boss waits at the end. Tap a stop to see it. The City Map tab shows the same races by where they happen (yellow races, red boss, green the Route 99 street-race meet). Drag to pan, pinch or use + and - to zoom.'),
        p('The Street Map tab is the city\'s street-racing scene: bet races against locals at spots around town. Each spot has its own distance, grip and stakes, and more open up as you move up the career. Win and you take their bet; lose and they take yours.'),
        p('The career has six stages, from backroad beaters to Pro Mods. Each stage has a run of races (1/4 mile, 1/8 mile, night street races, three-round knockouts, sponsor races and night invitationals) and ends with a boss. Winning races reveals more races and unlocks parts. Beat the boss to open the next stage and new cars at the dealer.'),
        p('Class races are side races with a rule, like real heads-up classes: four cylinders only, all motor, street tires, 275 radials, small blocks and more. They pay well for a car built to the rule, but you never need them to move on.'),
        p('A quick launch pays: a career win with a reaction time of 0.05 s or better earns a 15% perfect-launch bonus, 0.15 s or better a 5% good-launch bonus.'),
        p('Garage slots work like Underground 2: you start with one car, and every sponsor contract you fulfil opens another slot and pays for a car. Pick it at the dealer from the cars marked Take free (cars up to a price that grows each stage; Pro race cars are cash only). An unclaimed sponsor car waits for you. Sell a car to free up a slot; a sponsor car sells for its parts only.'),
        p('Sign one sponsor per stage. You get a signing bonus and a bonus for every win, plus a big payout when you fulfil the contract. The boss will only race you once your contract is done.'),
        p('Style pays: every star of visual rating adds 3% to your career race winnings (+30% at 10 stars), and new star levels put you on magazine covers.'),
        p('Your visual rating (up to 10 stars) comes from Body Shop parts: bumpers, skirts, spoilers, hoods, roof scoops, rims, tint, neon, paint finishes and vinyls. Stars never block career races; only the sponsor who wants a car that looks the part asks for a rating.'),
        h('h2', {}, 'Car Shows & Covers'),
        p('Each career stage also has a car show side event on the road: place high enough at that show to win it. You can enter from the road or from Shows in the garage.'),
        p('Park your car at a booth at a car show. Your rating, how rare and loud the build is, and the show itself decide how many people stop by. You earn a little per visitor, and the three most-visited cars take the podium and the prize money. Show judges get bored of the same build: change something up between entries. Each new star level also puts your car on the cover of Pixel Tuner, with a small bonus.'),
        h('h2', {}, 'Building'),
        p('Spend your winnings under Upgrade > Shop: engine swaps, turbos, superchargers, nitrous, gearboxes, suspension, tires and more. Parts come in levels (Street, Sport, Pro, Race, Pro Mod, colour-coded grey, green, blue, purple and orange) and higher levels unlock as you win career races.'),
        p('The garage is home: Upgrade (shop, packages, install, inventory, tune, dyno), Style (body kits, paint), Dealer, Shows and Race sit along the bottom. Use the arrows to switch cars; tap the car name for My Cars.'),
        p('Bought parts go into your inventory. Fit them under Upgrade > Install: the old part comes off and goes back to your inventory, so you can swap it back, move it to another car or sell it for half price. Engine parts are built for one engine; swapping engines takes its parts off with it. Upgrade > Inventory lists every spare part: filter by the car it fits, the kind of part and its value, sell one or everything shown, and buy back anything you sold until your next race. In My Cars you can strip a car of its parts, or strip it before you sell it.'),
        p('Watch the risk warnings: too much power for your weakest bottom-end part (pistons, rods, crank or block), boost past your fuel\'s knock limit, or more torque than the gearbox or axles can hold can break parts mid-race. Repairs cost money!'),
        p('Engine swaps pay the shop to fit the engine, on top of the engine. An engine that sits the same way as the old one (sideways in a front-drive car, lengthways in a rear-drive car) and fits the engine bay is a bolt-in job. A sideways (transverse) engine in a rear-drive car needs an adapter kit; a lengthways engine in a front-drive car needs a RWD or AWD conversion first. Gearboxes follow the driveline: a front-drive car (and an AWD car built from one) takes a transaxle, everything else a rear-drive gearbox, and a conversion comes with a rear-drive box. Every size bigger than the bay was built for means cutting and fabricating, up to a tube front half for a big-block in a small car.'),
        p('Boost heats the air: the harder a compressor works, and the cheaper or smaller it is for the boost you ask, the hotter the charge. Hot air is thin (less power per psi) and knocks sooner: pump gas knocks around 17 psi with a cool intercooled charge but near 8-10 psi with no intercooler. An intercooler takes most of the heat back out (an ice-tank air-to-water core even cools below the air outside), and E85 and methanol cool the charge as they evaporate, which is why blown alcohol cars skip the intercooler. Factory turbo engines come with their own intercooler and are built for their factory boost. The garage shows your intake temperature and knock limit.'),
        p('Every body has a limit: past the power the stock shell takes, it twists on the launch and can crack. Subframe connectors, a roll bar or a cage let it take more; a tube chassis takes anything.'),
        p('Tech inspection at the strip works like the NHRA\'s: a car that runs quicker than 11.50 in the quarter needs a roll bar, quicker than 10.00 a roll cage, and open cars need the roll bar from 13.50. Street races have no tech.'),
        p('Racing costs a little: after every race against someone you pay for the fuel, tire wear and any nitrous you sprayed. More power, race fuel and slicks cost more per pass. It comes out automatically, never more than you have, and test passes are free.'),
        p('Drag the garage, dealer, body shop or paint shop view to look around the car up close (pinch or scroll to zoom, double-tap to reset).'),
        p('In a hurry? Upgrade > Packages sells Budget, Street, Pro and Extreme kits for each group (or the whole car) at 10% off. They fit a matched set of parts sized to your car and skip anything you already have that is as good.'),
        p('Builds are only as strong as their weakest part. The shop marks the parts holding you back with a red "!": maxed-out injectors or pump, an ignition that misfires under boost, valve springs that float, axles that will snap.'),
        p('Factory fuel systems are sized for the factory engine, with about 25% to spare (less on a factory turbo engine). Add power past that and the injectors or pump can\'t keep up: the engine runs lean, and lean engines burn pistons. The dyno\'s FUEL row shows what the injectors or pump feed against what the build needs.'),
        p('Some parts need an ECU tune (a Street Tune Flash or a standalone ECU), just like a real car. Bigger injectors run pig-rich without one; E85 and methanol run lean; a turbo or supercharger kit only runs about 5 psi on the stock ECU; stage 2 and bigger cams surge and lose power. A stage 1 cam runs on the stock ECU, but makes only about half its gain until it\'s tuned. A performance chip is not a tune. Parts that need one say NEEDS TUNE in the shop, and packages bring the tune and the fuel parts their power needs.'),
        p('Parts you take off go to your inventory, factory parts included. A factory part is worth a little as a used part and fits the car (or engine) it came off. Taking an aftermarket part off puts your factory one back in; if you sold it, a used one is bought for you.'),
        p('Boost: a turbo\'s wastegate spring is the least boost it runs (the gate opens at spring pressure). With no boost controller it stays at the spring; a manual controller takes it to about twice the spring, an electronic one up to what the turbo\'s compressor can make. A small internal gate on a big engine can\'t dump enough exhaust, so boost creeps past the target near redline; a ported gate halves it and an external gate stops it. Factory turbos run what the ECU asks for, about 40% more with a flash. Blowers are set by the pulley. The Tune screen shows exactly what sets your range.'),
        p('Nitrous needs fuel too. A dry kit adds its fuel through your injectors, so the injectors and pump must feed the engine plus the shot; a wet kit sprays its own fuel but draws it from your pump; the big foggers bring their own. Short on fuel, the spray runs lean and can burn a piston: the dyno shows SPRAY FUEL.'),
        h('h2', {}, 'Tuning'),
        p('Grip comes from tire compound, tire pressure (each tire has an ideal psi), tire temperature and weight transfer. Ladder bars / 4-links, springs and shocks change how hard the car hits the tires. Gearing, launch RPM, boost, and throttle management decide whether you hook or go up in smoke.'),
        p('Use the Dyno to see your power curve. There are no predicted times: make a Test & Tune pass (free) to see whether a change helped.'),
        p('Suspension: with coilovers and adjustable shocks you can set ride height, spring rates, bump and rebound at each end, a front travel limiter, anti-squat and wheelie bar height. A soft, loose front lets the nose rise and pushes weight onto the rear tires; too loose and it wheelies and bounces. Too low and the rear bottoms out on the bump stops.'),
        h('h2', {}, 'Engine sounds'),
        p('Every engine is voiced by recordings of real cars, played the way Need for Speed Underground 2 and most racing games do it: a ladder of seamless loops, one every 10% of rpm, each holding the engine steady at one rpm, with separate pulling and coasting sounds. The two loops either side of your rpm play together, tuned to the exact rpm. Your exhaust parts change its tone; turbos, blowers, the rev limiter and backfires are added on top. Recordings from Wikimedia Commons (CC BY 3.0) and the Internet Archive (CC BY 4.0):'),
        h('div', { class: 'gsmall dim credits' }, Object.keys(DR.ENG_BANKS || {}).reduce(function (a, k) { return a.concat(DR.ENG_BANKS[k].credit.split('; ')); }, []).concat(DR.ENG_POPS ? DR.ENG_POPS.credit.split('; ') : []).map(function (c) { return h('div', {}, c); })))));
    // jump straight to a topic
    var heads = [].slice.call(panel.querySelectorAll('h2'));
    panel.insertBefore(h('div', { class: 'schips helpjump' }, heads.map(function (hd) { return btn(hd.textContent, function () { hd.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 'chip'); })), panel.firstChild);
    return scr;
  };
})();
