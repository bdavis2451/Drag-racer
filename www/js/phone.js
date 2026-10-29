// ===========================================================================
// PHONE — the story, told the way Underground 2 told it: short texts at the
// moments that matter. Uncle Ray (whose couch you start on, whose shop you
// wrench in) has seen it all; the odd text comes from the track or a rival.
// Nothing to manage: messages arrive, the 📱 in the top bar shows how many
// are unread, and that's it.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, h = UI.h, btn = UI.btn;
  var P = DR.Phone = {};
  P.FROM = {
    ray: { name: 'Uncle Ray', col: '#ffcc00' },
    track: { name: 'Pixel Dragway', col: '#3aa0ff' },
    street: { name: 'Unknown number', col: '#ff2bd6' }
  };
  function stageName(n) { return DR.STAGES[n] ? DR.STAGES[n].name : ''; }
  // key: [from, text(data)]; once-only unless `again`
  var SCRIPT = {
    intro: ['ray', function () { return 'Couch is yours, kid. Bay three is yours too, as long as you sweep up and don\'t touch my lathe. Your car runs. Barely. Go find out how barely: the dragway does test and tune, and there\'s a Saturday heads-up for beaters.'; }],
    firstrace: ['ray', function () { return 'Saw your slip. Don\'t look at the ET, look at the 60 foot. That\'s where races are won and where yours isn\'t yet.'; }],
    firstwin: ['ray', function () { return 'A win! Frame the slip. Then spend the money on tires, not a wing.'; }],
    stage: ['track', function (n) { return 'Congratulations: you\'re moving up to ' + stageName(n) + '. New race days are on the board. The cars get quicker from here.'; }],
    stageRay: ['ray', function (n) { return n >= 4 ? 'People at the track ask me if I\'m your uncle now. Used to be the other way round. Proud of you.' : n >= 2 ? 'You\'re running with ' + stageName(n) + ' now. Keep the car together and let them break theirs.' : 'Next class up. Same advice: fix what broke, then add power.'; }],
    secondcar: ['ray', function () { return 'Two cars. Remember: two of everything breaks, two sets of tires, two insurance bills.'; }],
    broke: ['ray', function () { return 'Heard you\'re down to pocket change. Every racer\'s been there. Sell something off the shelf, run a cheap car, and don\'t bet what you don\'t have.'; }],
    hire: ['ray', function () { return 'You\'ve got people on the payroll now. They get paid every race day whether you win or not. Welcome to running a team.'; }],
    circuitwin: ['ray', function () { return 'Your driver won on the road course! Turning left AND right. Never thought I\'d see the day.'; }],
    pinkwon: ['street', function () { return 'Enjoy the car. I\'ll want a rematch. — your last victim'; }],
    king: ['ray', function () { return 'You beat a King. Half this town will want to race you now, and the other half will want to know your tune. Tell neither.'; }],
    moved: ['ray', function (hm) { return hm && hm.id === 'uncle' ? 'Couch is still here. Kept it warm.' : 'Moving out already? Fine. The couch was getting a dent. Come by when you need the lathe.'; }, true],
    evicted: ['ray', function () { return 'Landlord called me, kid. Couch is made up. Pay your rent first next time, then buy parts.'; }, true],
    ticket: ['ray', function (d) { return (d && d.fine >= 600 ? 'A ' + DR.money(d.fine) + ' stop? ' : 'Another ticket. ') + 'That\'s what trailers are for.'; }, true]
  };
  function st() {
    var s = G.state;
    if (!s.phone) {
      s.phone = { msgs: [], sent: {} };
      // an existing career: what's already happened has happened
      if (s.stats && s.stats.races) checks(true);
    }
    return s.phone;
  }
  P.send = function (key, data, arg) {
    // (callers outside: send('ray', key, data))
    if (P.FROM[key] && SCRIPT[data]) { key = data; data = arg; }
    var sc = SCRIPT[key]; if (!sc || !G.state) return;
    var ph = st(), id = key + (typeof data === 'number' ? data : '');
    if (!sc[2] && ph.sent[id]) return;
    ph.sent[id] = true;
    var m = { from: sc[0], text: sc[1](data), at: Date.now(), read: false };
    ph.msgs.unshift(m); ph.msgs = ph.msgs.slice(0, 40);
    G.save();
    setTimeout(function () { UI.toast('📱 ' + P.FROM[m.from].name + ': ' + (m.text.length > 70 ? m.text.slice(0, 68) + '…' : m.text)); refreshBtn(); }, 900);
  };
  P.unread = function () { return G.state && G.state.phone ? G.state.phone.msgs.filter(function (m) { return !m.read; }).length : 0; };

  // the moments, checked as you go (silent: mark them without texting)
  function checks(silent) {
    var s = G.state, c = s.career || {}, out = [];
    function hit(key, data) { if (silent) st().sent[key + (typeof data === 'number' ? data : '')] = true; else P.send(key, data); }
    if (s.stats.races >= 1) hit('firstrace');
    if (s.stats.wins >= 1) hit('firstwin');
    for (var n = 1; n <= (c.stage || 0); n++) { hit('stage', n); if (n === c.stage) hit('stageRay', n); }
    if (s.cars.length >= 2) hit('secondcar');
    if (s.cars.some(function (x) { return x.won; })) hit('pinkwon');
    if (c.kings && Object.keys(c.kings).length) hit('king');
    if (s.started && s.money < 150 && s.stats.races >= 3) hit('broke');
    var t = s.team;
    if (t && ((t.drivers || []).length + (t.ddrivers || []).length + (t.tuners || []).length)) hit('hire');
    if (t && (t.history || []).some(function (x) { return x.pos === 1; })) hit('circuitwin');
    return out;
  }
  // a new career starts with Ray
  var origNew = G.newGame;
  G.newGame = function () { var out = origNew.apply(this, arguments); G.state.phone = { msgs: [], sent: {} }; P.send('intro'); return out; };
  var origShow = UI.show;
  UI.show = function () { var out = origShow.apply(this, arguments); if (G.state && G.state.started) { st(); checks(false); } return out; };

  // ---------------------------------------------------------------- ui
  var btnEl = null;
  function refreshBtn() { var b = document.querySelector('.phonebtn'); if (b) b.textContent = '📱' + (P.unread() ? ' ' + P.unread() : ''); }
  P.button = function () {
    if (!G.state || !G.state.started) return null;
    var n = P.unread();
    btnEl = btn('📱' + (n ? ' ' + n : ''), function () { P.open(); }, 'small phonebtn' + (n ? ' unread' : ''), { title: 'Messages' });
    return btnEl;
  };
  P.open = function () {
    var ph = st(), close;
    close = UI.modal([h('div', { class: 'pix acc' }, 'MESSAGES'),
      h('div', { class: 'col phonelist' }, ph.msgs.length ? ph.msgs.map(function (m) {
        var f = P.FROM[m.from] || P.FROM.ray;
        return h('div', { class: 'sms' + (m.read ? '' : ' new') }, h('div', { class: 'smsfrom', style: { color: f.col } }, f.name), h('div', {}, m.text));
      }) : h('div', { class: 'dim' }, 'No messages.')),
      h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, btn('Close', function () { close(); refreshBtn(); }, 'primary'))]);
    ph.msgs.forEach(function (m) { m.read = true; });
    G.save();
  };
})();
