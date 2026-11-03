// ===========================================================================
// TUTORIAL — a short tour for a new career: a handful of cards on the
// garage, each pointing at the real button it talks about (a spotlight on
// it, the rest dimmed). Next / Back / Skip; nothing can be tapped behind it
// while it runs. Offered again from Settings. Texts on the phone wait till
// it's over.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, h = UI.h, btn = UI.btn;
  var T = DR.Tutorial = {};
  T.STEPS = [
    { title: 'WELCOME TO THE STRIP', text: 'You start with one tired car, a little money and your uncle\'s couch. Each class has race days to win and a King to beat; win the class and the next one opens. This tour takes a minute. Skip it any time.' },
    { sel: '.gstatus.gcareer', title: 'YOUR CAREER', text: 'Where you are and what\'s next. Tap it any time for the race days, the ladder of rivals and the King.' },
    { sel: '.gbb.race', title: 'RACE', text: 'What\'s on this week. Everything has its day and hour: test & tune Wednesday and Friday nights, race days at the weekend, the street at night. Go takes you there and the clock jumps ahead.' },
    { sel: '.gbb.shop', title: 'UPGRADE', text: 'Buy parts and fit them. Fitting takes time on your bench (or pay the shop to rush it). Tuning, the dyno and the logbook live here too. Start with tires: power you can\'t put down is wasted.' },
    { sel: '.gstatus.ghome', title: 'HOME', text: 'Do the bench work, sleep to pass the time, and keep an eye on money: rent and wages come out on the 1st. The bank lends, if you must.' },
    { sel: '.gbb.team', title: 'TEAM', text: 'Hire drivers and a tuner. A tuner puts the car on the dyno, then sorts the chassis, the launch and the gearing at test & tune, with your driver at the wheel.' },
    { sel: '.phonebtn', title: 'YOUR PHONE', text: 'Uncle Ray texts now and then: advice, news, the odd invitation. A card drops in at the top when one arrives; tap it to read.' },
    { sel: '[title="How to play"]', title: 'THAT\'S IT', text: 'The ? explains everything in detail when you want it. Now go find out how fast your car really is: test & tune is a good start.' }
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
  function draw() {
    if (!layer) return;
    layer.innerHTML = '';
    var s = T.STEPS[i], el = s.sel ? document.querySelector(s.sel) : null, r = el ? el.getBoundingClientRect() : null;
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
          i ? btn('Back', function () { i--; draw(); }, 'small') : null,
          btn(i < T.STEPS.length - 1 ? 'Next' : 'Let\'s go', function () { if (i < T.STEPS.length - 1) { i++; draw(); } else end(true); }, 'small primary'))));
    layer.appendChild(card);
  }
  T.start = function () {
    if (layer) return;
    if (!UI.cur || UI.cur.fn !== UI.Garage) UI.show(UI.Garage);
    i = 0; UI.tutorialOn = true;
    layer = h('div', { class: 'tut-layer' });
    document.body.appendChild(layer);
    window.addEventListener('resize', draw);
    setTimeout(draw, 60);
  };
  // a new career gets the tour on its first look at the garage
  var newGame0 = G.newGame;
  G.newGame = function () { var out = newGame0.apply(this, arguments); G.state.tutorial = 'pending'; G.save(); return out; };
  var show0 = UI.show;
  UI.show = function (fn) {
    var out = show0.apply(this, arguments);
    if (G.state && G.state.tutorial === 'pending' && fn === UI.Garage && !layer) setTimeout(T.start, 350);
    else if (layer && fn !== UI.Garage) end(false);
    else if (layer) setTimeout(draw, 30);
    return out;
  };
})();
