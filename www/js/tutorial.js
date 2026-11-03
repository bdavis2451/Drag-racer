// ===========================================================================
// TUTORIAL — a short tour for a new career: cards on the garage, then into
// the Race menu (ending on a first test & tune pass), each pointing at the
// real button it talks about (a spotlight on
// it, the rest dimmed). Next / Back / Skip; nothing can be tapped behind it
// while it runs. Offered again from Settings. Texts on the phone wait till
// it's over.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, h = UI.h, btn = UI.btn;
  var T = DR.Tutorial = {};
  // where a step happens: the garage, or a tab of the Race menu
  var GAR = { fn: function () { return UI.Garage; } };
  function race(tab) { return { fn: function () { return UI.RaceMenu; }, arg: tab }; }
  T.STEPS = [
    { at: GAR, title: 'WELCOME TO THE STRIP', text: 'You start with one tired car, a little money and your uncle\'s couch. Each class has race days to win and a King to beat; win the class and the next one opens. This tour takes a couple of minutes. Skip it any time.' },
    { at: GAR, sel: '.gstatus.gcareer', title: 'YOUR CAREER', text: 'Where you are and what\'s next. Tap it any time for the race days, the ladder of rivals and the King.' },
    { at: GAR, sel: '.gbb.shop', title: 'UPGRADE', text: 'Buy parts and fit them. Fitting takes time on your bench (or pay the shop to rush it). Tuning, the dyno and the logbook live here too. Start with tires: power you can\'t put down is wasted.' },
    { at: GAR, sel: '.gstatus.ghome', title: 'HOME', text: 'Do the bench work, sleep to pass the time, and keep an eye on money: rent and wages come out on the 1st. The bank lends, if you must.' },
    { at: GAR, sel: '.gbb.team', title: 'TEAM', text: 'Hire drivers and a tuner. A tuner puts the car on the dyno, then sorts the chassis, the launch and the gearing at test & tune, with your driver at the wheel.' },
    { at: GAR, sel: '.phonebtn', title: 'YOUR PHONE', text: 'Uncle Ray texts now and then: advice, news, the odd invitation. A card drops in at the top when one arrives; tap it to read.' },
    { at: GAR, sel: '.gbb.race', title: 'RACE', text: 'Where the racing is. Let\'s look inside.' },
    { at: race('week'), sel: '.srail-i.rt-week', title: 'THIS WEEK', text: 'Everything has its day and hour, like a real racing week: test & tune Wednesday and Friday nights, race days at the weekend, the street at night. This is today and the week ahead.' },
    { at: race('week'), sel: '.nextup', title: 'NEXT UP', text: 'The next thing you can race. Go takes you there: if it isn\'t on yet, the clock jumps ahead to when it is (and the bills don\'t wait).' },
    { at: race('career'), sel: '.srail-i.rt-career', title: 'CAREER', text: 'Your class: its race days and what they pay, the ladder of rivals, the circuit side and the King. Win enough and the King will race you; beat him and the next class opens.' },
    { at: race('career'), sel: '.srail-i.rt-map', title: 'STREET & EVENTS', text: 'Street is the city at night: spots to race for cash, and the odd local legend. Events are the circuit races, clubs, short series and car shows.' },
    { at: race('practice'), sel: '.srail-i.rt-practice', title: 'PRACTICE', text: 'Test & tune: solo passes with nothing on the line, and where the license tests are. Your best times are kept.' },
    { at: race('practice'), sel: '.ecard.t-test .btn', title: 'YOUR FIRST PASS', text: 'Run a quarter mile and look at the slip: the 60-foot tells you how it launched, the ET what it all adds up to. Then you\'ll know what to fix first. The ? on the garage explains everything in detail.' }
  ];
  var i = 0, layer = null;
  function end(done) {
    UI.tutorialOn = false;
    if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    layer = null;
    if (G.state) { G.state.tutorial = done ? 'done' : 'skipped'; G.save(); }
    window.removeEventListener('resize', draw);
    if (DR.Phone && DR.Phone.pump) setTimeout(DR.Phone.pump, 800);
  }
  var nav = false;
  function onScreen(s) { return UI.cur && UI.cur.fn === s.at.fn() && (s.at.arg == null || UI.raceTab === s.at.arg); }
  function go(k) {
    i = k; var s = T.STEPS[i];
    if (!onScreen(s)) { nav = true; try { UI.show(s.at.fn(), s.at.arg); } finally { nav = false; } }
    setTimeout(draw, 80);
  }
  function draw() {
    if (!layer) return;
    layer.innerHTML = '';
    var s = T.STEPS[i], el = s.sel ? document.querySelector(s.sel) : null, r = el ? el.getBoundingClientRect() : null;
    // a target off the screen: bring it into view first, then draw
    if (r && (r.top < 0 || r.bottom > window.innerHeight) && !draw.scrolled) {
      draw.scrolled = true;
      try { el.scrollIntoView({ block: 'center' }); } catch (e) { el.scrollIntoView(); }
      return setTimeout(draw, 250);
    }
    draw.scrolled = false;
    if (r && (r.width === 0 || r.height === 0)) r = null;
    // the spotlight (its shadow dims everything else) or a plain dim
    if (r) layer.appendChild(h('div', { class: 'tut-ring', style: { left: (r.left - 5) + 'px', top: (r.top - 5) + 'px', width: (r.width + 10) + 'px', height: (r.height + 10) + 'px' } }));
    else layer.appendChild(h('div', { class: 'tut-dim' }));
    var low = r && r.top > window.innerHeight * 0.5;
    var card = h('div', { class: 'tut-card' + (low ? ' attop' : '') },
      h('div', { class: 'row', style: { justifyContent: 'space-between', alignItems: 'center' } }, h('span', { class: 'pix acc' }, s.title), h('span', { class: 'dim gsmall' }, (i + 1) + ' / ' + T.STEPS.length)),
      h('div', { class: 'tut-text' }, s.text),
      h('div', { class: 'row', style: { justifyContent: 'space-between', gap: '6px', marginTop: '8px' } },
        btn('Skip tour', function () { end(false); }, 'small'),
        h('div', { class: 'row', style: { gap: '6px' } },
          i ? btn('Back', function () { go(i - 1); }, 'small') : null,
          btn(i < T.STEPS.length - 1 ? 'Next' : 'Let\'s go', function () { if (i < T.STEPS.length - 1) go(i + 1); else end(true); }, 'small primary'))));
    layer.appendChild(card);
  }
  T.start = function () {
    if (layer) return;
    UI.tutorialOn = true;
    layer = h('div', { class: 'tut-layer' });
    document.body.appendChild(layer);
    window.addEventListener('resize', draw);
    go(0);
  };
  // a new career gets the tour on its first look at the garage
  var newGame0 = G.newGame;
  G.newGame = function () { var out = newGame0.apply(this, arguments); G.state.tutorial = 'pending'; G.save(); return out; };
  var show0 = UI.show;
  UI.show = function (fn) {
    var out = show0.apply(this, arguments);
    if (G.state && G.state.tutorial === 'pending' && fn === UI.Garage && !layer) setTimeout(T.start, 350);
    // the tour moving on is fine; anything else leaving its screen ends it
    else if (layer && !nav && !onScreen(T.STEPS[i])) end(false);
    else if (layer) setTimeout(draw, 30);
    return out;
  };
})();
