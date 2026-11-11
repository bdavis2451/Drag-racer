// ===========================================================================
// PHONE — the story, told the way Underground 2 told it: short texts at the
// moments that matter. Uncle Ray (whose couch you start on, whose shop you
// wrench in) has seen it all; the odd text comes from the track or a rival.
// Nothing to manage: messages arrive, the 📱 in the top bar shows how many
// are unread, and that's it.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, h = UI.h, btn = UI.btn, A = DR.Audio || {};
  var P = DR.Phone = {};
  P.FROM = {
    ray: { name: 'Uncle Ray', col: '#ffcc00' },
    track: { name: 'Pixel Dragway', col: '#3aa0ff' },
    street: { name: 'Unknown number', col: '#ff2bd6' },
    tuner: { name: 'Your tuner', col: '#46e07a' }
  };
  function stageName(n) { return DR.STAGES[n] ? DR.STAGES[n].name : ''; }
  // key: [from, text(data)]; once-only unless `again`
  var SCRIPT = {
    intro: ['ray', function () { return 'Couch is yours, kid. Bay three too, as long as you sweep up and don\'t touch my lathe. Your car runs. Barely. Go find out how barely: the strip\'s open for test and tune most days.'; }],
    circuit: ['ray', function () { return 'Danny says he\'s ready for the Sunday Track Day. Your team\'s circuit races are under Race > Career > Circuit, and they pay. Better drivers are on the Team board when you can afford them.'; }],
    cup: ['ray', function (n) { return 'Your team won the ' + (G.cupName ? G.cupName(n) : 'Cup') + '! The road course people will sell you their good stuff now: brakes, bars, wings.' + (n + 1 < DR.STAGES.length ? ' Next up for them: ' + G.cclassName(n + 1).replace(/^Circuit \d+: /, '') + '.' : ''); }],
    invite: ['street', function (iv) { return (iv && iv.team ? iv.team : 'A team') + ' here. Two of ours against two of yours and one more crew, ' + (iv ? DR.TRACKS[iv.track].name : 'this weekend') + '. Team points. You in? (Race > Events)'; }, true],
    firstrace: ['ray', function () { return 'Saw your slip. Don\'t look at the ET, look at the 60 foot. That\'s where races are won and where yours isn\'t yet.'; }],
    nitrous: ['ray', function () { return 'Lost one? Half that field is on the bottle. A 50-shot dry kit is $500 and the cheapest horsepower there is (Upgrade > Parts > Power Adders). Spray it once the car\'s hooked, not off the line, and mind your injectors.'; }],
    firstwin: ['ray', function () { return 'A win! Frame the slip. Then spend the money on tires, not a wing.'; }],
    stage: ['track', function (n) { return 'Congratulations: you\'re moving up to ' + stageName(n) + '. New race days are on the board. The cars get quicker from here.'; }],
    stageRay: ['ray', function (n) { return n >= 4 ? 'People at the track ask me if I\'m your uncle now. Used to be the other way round. Proud of you.' : n >= 2 ? 'You\'re running with ' + stageName(n) + ' now. Keep the car together and let them break theirs.' : 'Next class up. Same advice: fix what broke, then add power.'; }],
    secondcar: ['ray', function () { return 'Two cars. Remember: two of everything breaks, two sets of tires, two insurance bills.'; }],
    broke: ['ray', function () { return 'Heard you\'re down to pocket change. Every racer\'s been there. Sell something off the shelf, run a cheap car, and don\'t bet what you don\'t have.'; }],
    hire: ['ray', function () { return 'You\'ve got people on the payroll now. Drivers get paid every race they run; tuners on the 1st of the month, win or lose. Welcome to running a team.'; }],
    circuitwin: ['ray', function () { return 'Your driver won on the road course! Turning left AND right. Never thought I\'d see the day.'; }],
    pinkwon: ['street', function () { return 'Enjoy the car. I\'ll want a rematch. — your last victim'; }],
    king: ['ray', function () { return 'You beat a King. Half this town will want to race you now, and the other half will want to know your tune. Tell neither.'; }],
    moved: ['ray', function (hm) { return hm && hm.id === 'uncle' ? 'Couch is still here. Kept it warm.' : 'Moving out already? Fine. The couch was getting a dent. Come by when you need the lathe.'; }, true],
    repo: ['ray', function () { return 'Heard about the car. Lenders don\'t care how fast it was, kid. Borrow less than you can lose.'; }, true],
    promoter: ['ray', function () { return 'First event in the black! Your granddad ran Friday nights at the old airfield, you know. Keep the porta-johns clean and the purse honest and they\'ll keep coming.'; }],
    hint: ['street', function (t) { return t; }, true],
    streettune: ['tuner', function () { return 'Saw that one go up in smoke. The street hasn\'t got half the grip of the strip, and the car\'s set up for the strip. Book me for a street tune (Upgrade > Tune > Tuner, pick Street) and pick it before your street races.'; }],
    couchrent: ['ray', function () { return 'You\'re winning now, kid, so here\'s the deal: ' + DR.money(DR.COUCH_RENT) + ' a month toward the lights and the shop. Couch stays yours. If you\'re short, I\'ll run a tab.'; }],
    nephew: ['ray', function () { return 'My nephew Danny\'s been bugging me to race. He\'s green, but he\'s on your team now: he\'ll drive your circuit races (Race > Career > Circuit) while you run the strip. Pays by the race. Hire better drivers when you can.'; }],
    bailout: ['ray', function () { return 'Saw your bank balance. Put ' + DR.money(DR.BAILOUT) + ' in it. Once, kid. Next time you\'re in the red it\'s the bank, or selling something: a car, the parts on the shelf. That\'s how the rest of us did it.'; }],
    evicted: ['ray', function () { return 'Landlord called me, kid. Couch is made up. Pay your rent first next time, then buy parts.'; }, true],
    rig: ['ray', function () { return 'Get yourself a truck and trailer, kid. A used 3/4-ton and an open trailer runs ' + DR.money(DR.Legal ? DR.Legal.RIG : 8500) + ': buy it on the race-day "Getting there" line, or at Home. Cheaper than a tow every week, and nobody writes up a car on a trailer.'; }],
    ticket: ['ray', function (d) { return (d && d.fine >= 600 ? 'A ' + DR.money(d.fine) + ' stop? ' : 'Another ticket. ') + 'That\'s what trailers are for.'; }, true]
  };
  // Reactions to what just happened come straight away; the rest of the
  // story waits its turn, one text at a time, never mid-race or over a
  // dialog, the way a phone actually buzzes.
  var URGENT = { bailout: 1, repo: 1, evicted: 1, ticket: 1, moved: 1 };
  P.GAP = 30;            // seconds between story texts
  P.GAP_URGENT = 5;      // and after anything else for a reaction
  function st() {
    var s = G.state;
    if (!s.phone) {
      s.phone = { msgs: [], sent: {}, queue: [] };
      // an existing career: what's already happened has happened
      if (s.stats && s.stats.races) checks(true);
    }
    if (!s.phone.queue) s.phone.queue = [];
    return s.phone;
  }
  P.send = function (key, data, arg) {
    // (callers outside: send('ray', key, data))
    if (P.FROM[key] && SCRIPT[data]) { key = data; data = arg; }
    var sc = SCRIPT[key]; if (!sc || !G.state) return;
    var ph = st(), id = key + (typeof data === 'number' ? data : '');
    if (!sc[2] && ph.sent[id]) return;
    ph.sent[id] = true;
    var m = { from: sc[0], text: sc[1](data), urgent: !!URGENT[key] };
    if (m.urgent) ph.queue.unshift(m); else ph.queue.push(m);
    G.save();
    setTimeout(pump, 400);
  };
  P.unread = function () { return G.state && G.state.phone ? G.state.phone.msgs.filter(function (m) { return !m.read; }).length : 0; };
  P.pending = function () { return G.state && G.state.phone && G.state.phone.queue ? G.state.phone.queue.length : 0; };
  // a text arrives when the player can take it in
  var lastAt = 0;
  function busy() {
    if (!G.state || !G.state.started) return true;
    if (UI.tutorialOn) return true;
    if (document.querySelector('.modal')) return true;
    if (document.querySelector('.screen.race')) return true;
    return false;
  }
  function pump() {
    if (!G.state || !G.state.phone || !G.state.phone.queue || !G.state.phone.queue.length || busy()) return;
    var ph = G.state.phone, next = ph.queue[0], since = (Date.now() - lastAt) / 1000;
    if (since < (next.urgent ? P.GAP_URGENT : P.GAP)) return;
    ph.queue.shift();
    lastAt = Date.now();
    var m = { from: next.from, text: next.text, at: Date.now(), t: G.now ? G.now() : null, read: false };
    ph.msgs.unshift(m); ph.msgs = ph.msgs.slice(0, 60);
    G.save();
    notify(m); refreshBtn();
  }
  P.pump = pump;
  setInterval(pump, 2000);
  // the buzz: a card at the top of the screen, tap it to read
  var noteT = 0;
  function notify(m) {
    var f = P.FROM[m.from] || P.FROM.ray, old = document.getElementById('phonenote');
    if (old) old.parentNode.removeChild(old);
    var el = h('div', { id: 'phonenote', class: 'phonenote', onclick: function () { el.parentNode && el.parentNode.removeChild(el); P.open(m.from); } },
      h('div', { class: 'pnhead' }, h('span', {}, '📱'), h('span', { style: { color: f.col } }, f.name), h('span', { class: 'dim grow' }, 'now'),
        h('span', { class: 'pnx', title: 'Dismiss', onclick: function (e) { e.stopPropagation(); el.classList.remove('show'); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300); } }, '✕')),
      h('div', { class: 'pnbody' }, m.text.length > 96 ? m.text.slice(0, 94) + '…' : m.text),
      h('div', { class: 'pnhint dim' }, 'Tap to read'));
    document.body.appendChild(el);
    try { if (A.click) A.click(); } catch (e) { /* ignore */ }
    requestAnimationFrame(function () { el.classList.add('show'); });
    clearTimeout(noteT);
    noteT = setTimeout(function () { el.classList.remove('show'); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400); }, 6500);
  }
  // the moments, checked as you go (silent: mark them without texting)
  function checks(silent) {
    var s = G.state, c = s.career || {}, out = [];
    function hit(key, data) { if (silent) st().sent[key + (typeof data === 'number' ? data : '')] = true; else P.send(key, data); }
    if (s.stats.races >= 1) hit('firstrace');
    if (s.stats.races >= 2) hit('circuit');
    if (s.stats.wins >= 1) hit('firstwin');
    // the first loss, on a car with no nitrous: Ray says what everyone runs
    if (s.stats.races > s.stats.wins && !(s.cars || []).some(function (x) { return x.parts && x.parts.nitrous; })) hit('nitrous');
    for (var n = 1; n <= (c.stage || 0); n++) { hit('stage', n); if (n === c.stage) hit('stageRay', n); }
    if (s.cars.length >= 2) hit('secondcar');
    if (s.cars.some(function (x) { return x.won; })) hit('pinkwon');
    if (c.kings && Object.keys(c.kings).length) hit('king');
    if (s.started && s.money < 150 && s.stats.races >= 3) hit('broke');
    var t = s.team;
    if (t && ((t.drivers || []).filter(function (d) { return !d.nephew; }).length + (t.ddrivers || []).length + (t.tuners || []).length)) hit('hire');
    if (t && (t.history || []).some(function (x) { return x.pos === 1; })) hit('circuitwin');
    return out;
  }
  // The first time the bank goes negative, Ray covers it. Once. He says so
  // in person (a screen, when you're off the strip), and by text.
  DR.BAILOUT = 4000;
  function bailout() {
    var s = G.state;
    if (!s || !s.started || s.money >= 0 || s.bailedOut) return;
    s.bailedOut = true; s.bailoutSeen = { was: s.money }; s.money += DR.BAILOUT; G.save();
    P.send('bailout');
    setTimeout(bailoutScreen, 300);
  }
  function bailoutScreen() {
    var s = G.state, b = s && s.bailoutSeen;
    if (!b || b.shown) return;
    if (document.querySelector('.screen.race') || document.querySelector('.modal') || UI.tutorialOn) return;   // later: next screen
    b.shown = true; G.save();
    var close = UI.modal([h('div', { class: 'pix acc' }, 'UNCLE RAY'),
      h('p', {}, 'You went into the red: ' + DR.money(b.was) + '. Ray saw it.'),
      h('p', {}, '"I put ' + DR.money(DR.BAILOUT) + ' in your account. Once, kid. You\'re at ' + DR.money(G.state.money) + ' now. Next time you\'re short it\'s the bank, or selling something: a car, the parts on the shelf. Don\'t make me regret it."'),
      h('p', { class: 'gsmall dim' }, 'Ray bails you out once. After that: a bank loan (Home > Bank), or sell parts and cars.'),
      h('div', { class: 'row', style: { justifyContent: 'flex-end', gap: '8px' } },
        UI.bankModal ? btn('Bank', function () { close(); UI.bankModal(); }) : null,
        btn('Thanks, Ray', function () { close(); }, 'primary'))]);
  }
  P.bailoutScreen = bailoutScreen;
  ['pay', 'earn'].forEach(function (fn) { var o = G[fn]; G[fn] = function () { var r = o.apply(this, arguments); bailout(); return r; }; });
  P.bailout = bailout;
  // a new career starts with Ray
  var origNew = G.newGame;
  G.newGame = function () { var out = origNew.apply(this, arguments); G.state.phone = { msgs: [], sent: {}, queue: [] }; lastAt = Date.now() - (P.GAP - 6) * 1000; P.send('intro'); return out; };
  var origShow = UI.show;
  UI.show = function () { var out = origShow.apply(this, arguments); if (G.state && G.state.started) { st(); checks(false); bailout(); setTimeout(bailoutScreen, 450); setTimeout(pump, 600); } return out; };

  // ---------------------------------------------------------------- ui
  var btnEl = null;
  function refreshBtn() { var b = document.querySelector('.phonebtn'), n = P.unread(); if (b) { b.textContent = '📱' + (n ? ' ' + n : ''); b.classList.toggle('unread', !!n); } }
  P.button = function () {
    if (!G.state || !G.state.started) return null;
    var n = P.unread();
    btnEl = btn('📱' + (n ? ' ' + n : ''), function () { P.open(); }, 'small phonebtn' + (n ? ' unread' : ''), { title: 'Messages' });
    return btnEl;
  };
  // Messages: a conversation per sender (newest first), each a thread of
  // texts with the day and time they came in.
  function when(m) { return m.t != null && DR.Cal ? DR.Cal.fmt(m.t) : ''; }
  P.open = function (thread) {
    var ph = st(), close, body = h('div', { class: 'col phonelist' });
    function threads() {
      body.innerHTML = '';
      var by = {};
      ph.msgs.forEach(function (m) { (by[m.from] = by[m.from] || []).push(m); });
      var keys = Object.keys(by);
      if (!keys.length) return body.appendChild(h('div', { class: 'dim' }, 'No messages yet.'));
      keys.sort(function (a, b) { return by[b][0].at - by[a][0].at; }).forEach(function (k) {
        var f = P.FROM[k] || P.FROM.ray, list = by[k], unread = list.filter(function (m) { return !m.read; }).length;
        body.appendChild(h('div', { class: 'smsthread' + (unread ? ' new' : ''), onclick: function () { convo(k); } },
          h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'smsfrom', style: { color: f.col } }, f.name + (unread ? ' • ' + unread + ' new' : '')), h('span', { class: 'dim gsmall' }, when(list[0]))),
          h('div', { class: 'gsmall dim' }, list[0].text.length > 70 ? list[0].text.slice(0, 68) + '…' : list[0].text)));
      });
    }
    function convo(k) {
      body.innerHTML = '';
      var f = P.FROM[k] || P.FROM.ray;
      body.appendChild(h('div', { class: 'row', style: { gap: '8px', alignItems: 'center' } }, ph.msgs.some(function (m) { return m.from !== k; }) ? btn('◀', function () { threads(); }, 'small back') : null, h('span', { class: 'smsfrom', style: { color: f.col } }, f.name)));
      ph.msgs.filter(function (m) { return m.from === k; }).slice().reverse().forEach(function (m) {
        body.appendChild(h('div', { class: 'sms' + (m.read ? '' : ' new') }, h('div', { class: 'dim gsmall' }, when(m)), h('div', {}, m.text)));
        m.read = true;
      });
      G.save(); refreshBtn();
      setTimeout(function () { body.scrollTop = body.scrollHeight; }, 0);
    }
    close = UI.modal([h('div', { class: 'pix acc' }, 'MESSAGES'), body,
      h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, btn('Close', function () { close(); refreshBtn(); setTimeout(pump, 400); }, 'primary'))]);
    var senders = {}; ph.msgs.forEach(function (m) { senders[m.from] = 1; });
    if (thread && senders[thread]) convo(thread); else if (Object.keys(senders).length === 1) convo(Object.keys(senders)[0]); else threads();
  };
})();
