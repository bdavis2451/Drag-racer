// ===========================================================================
// HOME — where you live is where the cars live (Test Drive Unlimited's
// houses, each with its own garage). You start on Uncle Ray's couch with
// one bay of his shop; rent a place with a bigger garage as the team grows.
//  * Garage bays are the number of cars you can keep. A car won on a pink
//    slip with no bay free goes into a storage unit (a monthly fee).
//  * Bills come on the 1st of the month: rent, your staff tuners'
//    salaries, storage (and the bank's loan payments, calendar.js).
//  * Miss rent and it's owed with a late fee; still owed on the next 1st
//    and you're evicted (back to Uncle Ray's, the deposit gone). Staff who
//    can't be paid walk. Storage unpaid two months: a lien sale.
//  * The Home screen is your room: the bed (sleep, wait), the desk (bills,
//    the bank), the wall calendar, and the door to the garage.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, h = UI.h, btn = UI.btn;

  // Monthly rents (2026 US ballpark: a one-bedroom with a garage ~$1,400, a
  // rented house ~$2,800, a light-industrial unit ~$5,500).
  DR.HOMES = [
    { id: 'uncle', name: 'Uncle Ray\'s garage', bays: 1, rent: 0, blurb: 'The couch in the office and one bay of the shop. Free, as long as you sweep up.' },
    { id: 'apt', name: 'Apartment with a 2-car garage', bays: 2, rent: 1400, blurb: 'A one-bedroom over a row of lock-up garages. Your own place, finally.' },
    { id: 'house', name: 'House with a 4-car garage', bays: 4, rent: 2800, blurb: 'A rented ranch house on the edge of town, with a detached shop out back.' },
    { id: 'shop', name: 'Shop with a loft, 6 bays', bays: 6, rent: 5500, blurb: 'A light-industrial unit: six bays, a lift, and a loft to sleep in.' },
    { id: 'estate', name: 'Hillside house, 8-car garage', bays: 8, rent: 12000, blurb: 'Glass, a view of the city, and a garage bigger than the house.' }
  ];
  DR.STORAGE = 250;        // a car in a storage unit, a month
  DR.RENT_GRACE = 1;       // months owed before the next 1st brings eviction
  DR.LIEN_AFTER = 2;       // unpaid storage months before a lien sale
  DR.homeById = function (id) { return DR.HOMES.filter(function (x) { return x.id === id; })[0] || DR.HOMES[0]; };

  // a save from before homes: the smallest place that holds its cars
  function st() {
    var s = G.state;
    if (!s.home) {
      var n = (s.cars || []).length, hm = DR.HOMES.filter(function (x) { return x.bays >= n; })[0] || DR.HOMES[DR.HOMES.length - 1];
      s.home = { id: hm.id, owed: 0, missed: 0, deposit: 0, store: 0, storeMissed: 0, free: hm.rent ? 1 : 0 };
    }
    var h0 = s.home;
    // saves from the per-race-day rent: a free first month instead
    if (!h0.monthly) { h0.monthly = true; h0.free = h0.free ? 1 : 0; h0.owed = 0; h0.missed = 0; h0.store = 0; h0.storeMissed = 0; }
    return h0;
  }
  // a new career starts on the couch
  var origNew = G.newGame;
  G.newGame = function () { var out = origNew.apply(this, arguments); G.state.home = { id: 'uncle', owed: 0, missed: 0, deposit: 0, store: 0, storeMissed: 0, monthly: true }; G.save(); return out; };
  G.home = function () { return DR.homeById(st().id); };
  G.homeState = st;
  // bays: the cars you can keep (the dealer won't sell you one past it)
  G.carSlots = function () { return G.home().bays; };
  G.slotFree = function () { return G.state.cars.length < G.carSlots(); };
  G.storedCars = function () { return Math.max(0, G.state.cars.length - G.carSlots()); };
  // a staff tuner's salary, a month (their day rate x ~4 race weekends)
  G.salary = function (tu) { return tu.wage * 4; };

  // moving: a month's rent as the deposit, back when you leave on good terms
  G.moveCost = function (id) { var to = DR.homeById(id), s = st(); return to.rent - s.deposit + s.owed; };
  G.moveHome = function (id) {
    var s = st(), to = DR.homeById(id);
    if (to.id === s.id) return 'You live here';
    var cost = G.moveCost(id);
    if (cost > 0 && !G.canAfford(cost)) return 'Moving in takes ' + DR.money(cost) + (s.deposit ? ' (your deposit back counted)' : '') + (s.owed ? ' and the rent you owe' : '');
    if (cost > 0) G.pay(cost); else if (cost < 0) G.earn(-cost);
    s.id = to.id; s.deposit = to.rent; s.owed = 0; s.missed = 0;
    G.save();
    return '';
  };

  // The 1st of the month: rent, your tuners' salaries, storage. Rent owed
  // through to the next 1st is eviction; staff who can't be paid walk;
  // storage unpaid two months running, the unit sells the car.
  G.onMonth(function () {
    var s = st(), hm = G.home(), news = [];
    function pay(label, amt) { G.pay(amt); news.push('🧾 ' + label + ': ' + DR.money(amt)); }
    if (hm.rent && s.free > 0) { s.free--; news.push('🧾 Rent: this month\'s on the house (moving-in special)'); }
    else if (hm.rent) {
      var due = hm.rent + s.owed;
      if (G.canAfford(due)) { pay(s.owed ? 'Rent and what you owed' : 'Rent', due); s.owed = 0; s.missed = 0; }
      else {
        s.missed++;
        if (s.missed > DR.RENT_GRACE) {
          news.push('🧾 EVICTED: two months without rent. You\'re back on Uncle Ray\'s couch, and the landlord kept your deposit against the ' + DR.money(s.owed + hm.rent) + ' you owed.');
          s.id = 'uncle'; s.owed = 0; s.missed = 0; s.deposit = 0;
          if (DR.Phone) DR.Phone.send('ray', 'evicted');
        } else {
          s.owed += Math.round(hm.rent * 1.1);   // and a 10% late fee
          news.push('🧾 Rent unpaid: ' + DR.money(s.owed) + ' owed with the late fee. Pay it by the 1st or the landlord changes the locks.');
        }
      }
    }
    if (DR.Team) DR.Team.state().tuners.slice().forEach(function (tu) {
      var sal = G.salary(tu);
      if (G.canAfford(sal)) pay(tu.name + '\'s salary', sal);
      else { DR.Team.releaseStaff(tu.id); news.push('🧾 ' + tu.name + ' quit: you couldn\'t make payroll.'); }
    });
    var n = G.storedCars();
    if (!n) { s.store = 0; s.storeMissed = 0; }
    else {
      var fee = n * DR.STORAGE + s.store;
      if (G.canAfford(fee)) { pay('Storage (' + n + ' car' + (n > 1 ? 's' : '') + ')', fee); s.store = 0; s.storeMissed = 0; }
      else {
        s.store += n * DR.STORAGE; s.storeMissed++;
        if (s.storeMissed >= DR.LIEN_AFTER) {
          var car = G.state.cars.slice().reverse().filter(function (c) { return c.uid !== G.state.active && !(DR.Team && DR.Team.carAway(c.uid)) && !(G.pledged && G.pledged(c.uid)); })[0];
          if (car) {
            var val = Math.round(G.carValue(car) * 0.5 / 50) * 50, back = Math.max(0, val - s.store);
            G.state.cars = G.state.cars.filter(function (c) { return c !== car; });
            if (back) G.earn(back);
            news.push('🧾 LIEN SALE: the storage company auctioned your ' + DR.CARS[car.carId].name + ' for ' + DR.money(val) + ' and kept the ' + DR.money(s.store) + ' you owed' + (back ? ' (+' + DR.money(back) + ' to you)' : '') + '.');
            s.store = 0; s.storeMissed = 0;
          }
        } else news.push('🧾 Storage unpaid: ' + DR.money(s.store) + ' owed. Another month and they sell a car.');
      }
    }
    return news;
  });
  // the next 1st's bills: [[what, $]]
  G.billsPreview = function () {
    var s = st(), hm = G.home(), out = [];
    if (hm.rent) out.push(['Rent' + (s.free ? ' (free this month)' : '') + (s.owed ? ' + owed' : ''), s.free ? 0 : hm.rent + s.owed]);
    if (DR.Team) DR.Team.state().tuners.forEach(function (tu) { out.push([tu.name + ' (salary)', G.salary(tu)]); });
    if (G.storedCars()) out.push(['Storage', G.storedCars() * DR.STORAGE + s.store]);
    if (G.bank) G.bank().loans.forEach(function (l) { if (l.kind === 'bank') out.push(['Loan payment', Math.round(Math.min(l.payment, l.balance * (1 + l.apr / 12)))]); });
    return out;
  };
  G.weeklyBills = function () { return G.billsPreview().reduce(function (a, x) { return a + x[1]; }, 0); };
  // (bills used to come every race day; they're monthly now)
  G.raceDayDues = function () { return { money: [], news: [], total: 0 }; };

  // ---------------------------------------------------------------- screen
  UI.homeModal = function () {
    var s = st(), cur = G.home(), close;
    var rows = DR.HOMES.map(function (hm) {
      var here = hm.id === cur.id, cost = G.moveCost(hm.id), fits = hm.bays >= G.state.cars.length;
      return h('div', { class: 'homerow' + (here ? ' on' : '') },
        h('div', { class: 'grow' }, h('div', { class: here ? 'acc' : '' }, hm.name),
          h('div', { class: 'gsmall dim' }, hm.blurb),
          h('div', { class: 'gsmall' }, hm.bays + ' bay' + (hm.bays > 1 ? 's' : '') + ' • ' + (hm.rent ? DR.money(hm.rent) + ' a month' : 'free') + (here ? '' : ' • move in ' + (cost > 0 ? DR.money(cost) : cost < 0 ? '+' + DR.money(-cost) + ' back' : 'free')) + (!fits && !here ? ' • ' + (G.state.cars.length - hm.bays) + ' car' + (G.state.cars.length - hm.bays > 1 ? 's' : '') + ' to storage' : ''))),
        here ? h('span', { class: 'good pix' }, 'HOME') : btn('Move in', function () {
          UI.confirm('Move to the ' + hm.name.toLowerCase() + '? ' + (cost > 0 ? DR.money(cost) + ' (a month\'s rent as a deposit' + (s.deposit ? ', less your deposit back' : '') + ').' : cost < 0 ? 'You get ' + DR.money(-cost) + ' of your deposit back.' : '') + (fits ? '' : ' Cars that don\'t fit go into storage at ' + DR.money(DR.STORAGE) + ' each a month.'), function () {
            var w = G.moveHome(hm.id); if (w) return UI.toast(w);
            close(); UI.toast('Moved in: ' + hm.name); if (DR.Phone) DR.Phone.send('ray', 'moved', hm); UI.refresh();
          }, 'Move');
        }, 'small' + (cost <= 0 || G.canAfford(cost) ? ' go' : ' disabled')));
    });
    close = UI.modal([h('div', { class: 'pix acc' }, 'HOME'),
      h('div', {}, 'You live where the cars live. Bays are the cars you can keep; rent' + (DR.Team && DR.Team.state().tuners.length ? ', your tuners\' salaries' : '') + ' and storage are due on the 1st of every month.'),
      s.owed ? h('div', { class: 'bad' }, 'Rent owed: ' + DR.money(s.owed) + '. Still owed on the 1st and you\'re evicted.') : null,
      G.storedCars() ? h('div', { class: 'warn' }, G.storedCars() + ' car' + (G.storedCars() > 1 ? 's' : '') + ' in storage: ' + DR.money(G.storedCars() * DR.STORAGE) + ' a month' + (s.store ? ', ' + DR.money(s.store) + ' owed' : '') + '. Move somewhere bigger or sell.') : null,
      h('div', { class: 'gsmall dim' }, 'Due on the 1st: ' + DR.money(G.weeklyBills()) + ' in bills.'),
      h('div', { class: 'col homelist' }, rows),
      DR.Legal ? h('div', { class: 'row', style: { gap: '8px', alignItems: 'center' } }, h('span', { class: 'grow gsmall' }, DR.Legal.hasRig() ? 'Your truck & trailer is parked out front: tow any car to a race for the gas.' : 'A used 3/4-ton pickup and an open car trailer: tow any car to a race (no tickets, and race cars that can\'t be driven) for the gas. It parks on the street.'),
        DR.Legal.hasRig() ? null : btn('Buy ' + DR.money(DR.Legal.RIG), function () { var w = DR.Legal.buyRig(); if (w) return UI.toast(w); close(); UI.toast('Truck & trailer bought'); UI.homeModal(); }, 'small' + (G.canAfford(DR.Legal.RIG) ? ' go' : ' disabled'))) : null,
      h('div', { class: 'row', style: { justifyContent: 'flex-end' } }, btn('Close', function () { close(); }, 'primary'))]);
  };
  // My Cars: home and bays on top
  var origCars = UI.Cars;
  UI.Cars = function () {
    var el = origCars.apply(this, arguments), tip = el.querySelector('.tipline'), hm = G.home(), n = G.storedCars();
    if (tip) {
      tip.innerHTML = '';
      tip.appendChild(h('div', { class: 'row', style: { gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
        h('span', { class: 'grow' }, h('b', { class: 'acc' }, hm.name), ' • ' + Math.min(G.state.cars.length, hm.bays) + ' / ' + hm.bays + ' bays' + (n ? ' • ' + n + ' in storage' : '') + ' • ' + (hm.rent ? DR.money(hm.rent) + ' rent a month' : 'no rent') +
          (G.freeCars() ? ' • ' + G.freeCars() + ' free sponsor car' + (G.freeCars() > 1 ? 's' : '') + ' to pick at the dealer' : '')),
        btn('Home', function () { UI.show(UI.Home); }, 'small go')));
    }
    return el;
  };

  // ---------------------------------------------------------------- the Home screen
  // Your room, by where you live: the bed (sleep, wait), the desk (bills and
  // the bank), the wall calendar, the door to the garage. Time only moves
  // when you choose: work on the cars, sleep, wait.
  var CAL = DR.Cal;
  var ROOMS = {
    uncle: { wall: '#4a4f57', floor: '#3a3a3a', bed: 'couch', bedCol: '#6b4a2f', deco: 'tools' },
    apt: { wall: '#6d6a8a', floor: '#5a4636', bed: 'bed', bedCol: '#3a6ea5', deco: 'poster' },
    house: { wall: '#7a8a6d', floor: '#7a5a3a', bed: 'bed', bedCol: '#a54a3a', deco: 'tv' },
    shop: { wall: '#5d6670', floor: '#4d5560', bed: 'bed', bedCol: '#2f6a4a', deco: 'rail' },
    estate: { wall: '#2a2f3a', floor: '#c8c0b0', bed: 'bed', bedCol: '#e8e8e8', deco: 'glass' }
  };
  function sky(hh) { return hh >= 7 && hh < 18 ? ['#7ec8f0', '#bfe6ff'] : hh >= 18 && hh < 20 ? ['#f08a4a', '#5a3a6a'] : hh >= 5 && hh < 7 ? ['#e8a070', '#7090c0'] : ['#0a1028', '#1a2048']; }
  // the hotspots, in the canvas's own pixels (320 x 150)
  var SPOTS = { bed: [10, 92, 120, 44], desk: [196, 86, 70, 50], cal: [138, 24, 40, 36], door: [278, 40, 36, 96], win: [44, 18, 80, 50] };
  function drawRoom(cv, hm) {
    var c = cv.getContext('2d'), R = ROOMS[hm.id] || ROOMS.apt, d = CAL.date(G.now()), W = 320, H = 150;
    c.imageSmoothingEnabled = false;
    function r(x, y, w, h2, col) { c.fillStyle = col; c.fillRect(x, y, w, h2); }
    r(0, 0, W, H, R.wall); r(0, 110, W, 40, R.floor); r(0, 108, W, 3, '#00000040');
    // the window: the sky at this hour (the estate's whole wall is glass)
    var sk = sky(d.h), wx = R.deco === 'glass' ? 6 : 44, ww = R.deco === 'glass' ? 180 : 80;
    var g = c.createLinearGradient(0, 18, 0, 68); g.addColorStop(0, sk[0]); g.addColorStop(1, sk[1]);
    c.fillStyle = g; c.fillRect(wx, 18, ww, 50);
    var night = d.h < 6 || d.h >= 19;
    for (var k = 0; k < (R.deco === 'glass' ? 24 : 9); k++) { var bx = wx + 4 + (k * 37) % (ww - 10), bh = 8 + (k * 13) % 20; r(bx, 68 - bh, 7, bh, night ? '#1a1a2a' : '#5a6a7a'); if (night) r(bx + 2, 68 - bh + 3, 2, 2, '#ffd86a'); }
    if (night) for (k = 0; k < 6; k++) r(wx + 6 + k * 13, 22 + (k * 7) % 12, 1, 1, '#ffffff');
    r(wx - 2, 16, ww + 4, 2, '#222'); r(wx - 2, 68, ww + 4, 3, '#222'); r(wx + ww / 2 - 1, 18, 2, 50, '#222');
    // the bed (or Ray's couch)
    if (R.bed === 'couch') { r(12, 104, 116, 22, R.bedCol); r(12, 94, 116, 12, '#5a3a22'); r(12, 94, 10, 32, '#4a2f1a'); r(118, 94, 10, 32, '#4a2f1a'); r(30, 98, 30, 10, '#c8b890'); }
    else { r(12, 100, 116, 8, '#3a2a1a'); r(14, 92, 112, 14, '#f0f0f0'); r(40, 92, 86, 16, R.bedCol); r(16, 86, 22, 10, '#ffffff'); r(12, 84, 4, 42, '#3a2a1a'); r(124, 96, 4, 30, '#3a2a1a'); }
    // the wall calendar, today circled
    r(140, 26, 36, 32, '#f4f4f4'); r(140, 26, 36, 8, '#c8102e');
    for (k = 0; k < 20; k++) r(143 + (k % 5) * 6, 37 + Math.floor(k / 5) * 5, 3, 3, k === (d.d % 20) ? '#c8102e' : '#9a9a9a');
    // the desk and the laptop
    r(198, 98, 66, 6, '#5a3a22'); r(200, 104, 4, 22, '#4a2f1a'); r(256, 104, 4, 22, '#4a2f1a');
    r(214, 84, 30, 14, '#222'); r(216, 86, 26, 10, '#3a8ad0'); r(210, 98, 38, 2, '#555');
    // the door to the garage
    r(280, 42, 32, 84, '#6a4a2a'); r(282, 44, 28, 80, '#7a5a3a'); r(304, 84, 3, 3, '#e8c040');
    // what's on the walls
    if (R.deco === 'tools') { r(186, 22, 84, 40, '#8a7a5a'); for (k = 0; k < 7; k++) r(190 + k * 11, 28 + (k % 2) * 8, 3, 18, '#c0c0c0'); }
    if (R.deco === 'poster') { r(196, 24, 34, 44, '#ff2bd6'); r(200, 30, 26, 20, '#151515'); r(204, 54, 18, 4, '#ffd800'); }
    if (R.deco === 'tv') { r(196, 30, 54, 32, '#111'); r(198, 32, 50, 28, night ? '#2a4a8a' : '#333'); }
    if (R.deco === 'rail') { r(0, 106, 320, 2, '#9aa8b4'); for (k = 0; k < 16; k++) r(k * 20, 96, 2, 12, '#9aa8b4'); }
    // labels on hover-free screens: small tags
    function tag(x, y, t) { c.font = '7px monospace'; var w2 = c.measureText(t).width + 4; r(x, y, w2, 9, '#000000b0'); c.fillStyle = '#ffcc00'; c.fillText(t, x + 2, y + 7); }
    tag(16, 128, 'SLEEP'); tag(202, 128, 'DESK'); tag(141, 60, 'CALENDAR'); tag(281, 128, 'GARAGE');
  }
  function newsToast(news) { news.forEach(function (n, i) { setTimeout(function () { UI.toast(n); }, i * 2400); }); }
  UI.timeNews = newsToast;
  // move the clock: shows what happened, then the screen again
  function pass(hours, work) { var news = G.advance(hours, work); newsToast(news); UI.refresh(); }
  UI.passTime = pass;
  function sleepModal() {
    var close, now = G.now(), d = CAL.date(now), wake = CAL.dayStart(now) + (d.h < 5 ? 8 : 32);
    close = UI.modal([h('div', { class: 'pix acc' }, (G.home().id === 'uncle' ? 'THE COUCH' : 'BED')),
      h('div', {}, 'It\'s ' + CAL.fmt(now, { long: true }) + '.'),
      h('div', { class: 'col', style: { gap: '6px', marginTop: '6px' } },
        btn('Sleep till 8 AM (' + CAL.dur(wake - now) + ')', function () { close(); pass(wake - now); }, 'primary'),
        btn('Nap 3 hours', function () { close(); pass(3); }),
        btn('Wait an hour', function () { close(); pass(1); })),
      h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '6px' } }, btn('Cancel', function () { close(); }, 'small'))]);
  }
  UI.sleepModal = sleepModal;
  // the bench: jobs in the order you'll do them, and what the shop has
  function benchCard() {
    var c = G.calState(), out = [];
    if (!c.jobs.length && !c.shop.length) return h('div', { class: 'dim gsmall' }, 'Nothing on the bench.');
    c.jobs.forEach(function (j) { var car = G.state.cars.filter(function (x) { return x.uid === j.uid; })[0]; out.push(h('div', { class: 'row jobrow' }, h('span', { class: 'grow' }, (car ? DR.CARS[car.carId].name + ': ' : '') + j.label), h('span', { class: 'dim' }, CAL.dur(j.h)))); });
    c.shop.forEach(function (j) { var car = G.state.cars.filter(function (x) { return x.uid === j.uid; })[0]; out.push(h('div', { class: 'row jobrow' }, h('span', { class: 'grow' }, (car ? DR.CARS[car.carId].name + ': ' : '') + j.label), h('span', { class: 'acc' }, 'shop, ' + CAL.dur(j.until - c.t)))); });
    var bh = G.benchHours();
    return h('div', { class: 'col' }, out, bh ? h('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap', marginTop: '4px' } },
      btn('Work till it\'s done (' + CAL.dur(bh) + ')', function () { pass(bh, bh); }, 'small go'),
      bh > 4 ? btn('Work 4 hours', function () { pass(4, 4); }, 'small') : null) : null);
  }
  UI.benchCard = benchCard;
  function billsCard() {
    var b = G.billsPreview(), tot = b.reduce(function (a, x) { return a + x[1]; }, 0), next = CAL.firstOfNextMonth(G.now());
    return h('div', { class: 'col' }, h('div', { class: 'gsmall' }, 'Due ' + CAL.fmt(next, { noTime: true }) + ' (' + CAL.dur(next - G.now()) + '): ', h('b', { class: tot > G.state.money ? 'bad' : 'acc' }, DR.money(tot))),
      b.map(function (x) { return h('div', { class: 'row jobrow' }, h('span', { class: 'grow dim' }, x[0]), h('span', {}, DR.money(x[1]))); }));
  }
  UI.Home = function () {
    var hm = G.home(), cv = h('canvas', { class: 'roomcv', width: 320, height: 150 });
    drawRoom(cv, hm);
    cv.addEventListener('click', function (e) {
      var rc = cv.getBoundingClientRect(), x = (e.clientX - rc.left) / rc.width * 320, y = (e.clientY - rc.top) / rc.height * 150;
      function inS(k) { var a = SPOTS[k]; return x >= a[0] && x <= a[0] + a[2] && y >= a[1] && y <= a[1] + a[3]; }
      if (inS('bed')) sleepModal(); else if (inS('desk')) UI.bankModal(); else if (inS('cal')) { if (UI.Calendar) UI.show(UI.Calendar); } else if (inS('door')) UI.show(UI.Garage);
    });
    var side = h('div', { class: 'homeside' },
      h('div', { class: 'pix acc homeclock' }, CAL.fmt(G.now())),
      h('div', { class: 'gsmall dim' }, hm.name + ' • ' + Math.min(G.state.cars.length, hm.bays) + '/' + hm.bays + ' bays' + (hm.rent ? ' • ' + DR.money(hm.rent) + '/mo' : '')),
      h('div', { class: 'plvl' }, 'THE BENCH'), benchCard(),
      h('div', { class: 'plvl' }, 'BILLS'), billsCard(),
      h('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap', marginTop: '6px' } },
        btn('Sleep / wait', sleepModal, 'small'), btn('Bank', function () { UI.bankModal(); }, 'small'), UI.Calendar ? btn('Calendar', function () { UI.show(UI.Calendar); }, 'small') : null,
        btn('Move house', function () { UI.homeModal(); }, 'small')));
    return h('div', { class: 'screen' }, UI.top('HOME', function () { UI.show(UI.Garage); }),
      h('div', { class: 'content' }, h('div', { class: 'homewrap' }, h('div', { class: 'roomwrap' }, cv), side)));
  };

  // ---------------------------------------------------------------- the bank
  UI.bankModal = function () {
    var b = G.bank(), close, lim = G.loanLimit(), apr = G.loanAPR(), amt = h('input', { type: 'number', class: 'tinput', min: '500', step: '500', value: String(Math.min(lim, 5000)), style: { maxWidth: '120px' } });
    var term = 12, quote = h('div', { class: 'gsmall' });
    function upd() { var a = +amt.value || 0; quote.textContent = a > 0 ? DR.money(Math.ceil(DR.Cal.payment(a, apr, term))) + ' a month for ' + term + ' months (' + DR.money(Math.round(DR.Cal.payment(a, apr, term) * term - a)) + ' interest)' : ''; }
    amt.addEventListener('input', upd);
    var terms = h('div', { class: 'row', style: { gap: '6px' } }, [6, 12, 24, 36].map(function (n) {
      var bb = btn(n + ' mo', function () { term = n; Array.prototype.forEach.call(terms.children, function (x) { x.classList.remove('on'); }); bb.classList.add('on'); upd(); }, 'chip' + (n === term ? ' on' : ''));
      return bb;
    }));
    var loans = b.loans.map(function (l) {
      var car = l.kind === 'title' && G.state.cars.filter(function (c) { return c.uid === l.uid; })[0];
      return h('div', { class: 'homerow' }, h('div', { class: 'grow' },
        h('div', { class: 'acc' }, l.kind === 'title' ? 'Title loan on the ' + (car ? DR.CARS[car.carId].name : 'car') : 'Bank loan, ' + Math.round(l.apr * 100) + '% APR'),
        h('div', { class: 'gsmall dim' }, l.kind === 'title' ? DR.money(G.owedOn(l)) + ' due ' + DR.Cal.fmt(l.due, { noTime: true }) + ' (or ' + DR.money(G.owedOn(l) - l.balance) + ' to roll it over 30 days)' : DR.money(l.payment) + '/month • ' + DR.money(Math.round(l.balance)) + ' left • ' + l.left + ' payments' + (l.missed ? ' • ' + l.missed + ' missed' : ''))),
        btn('Pay off ' + DR.money(G.owedOn(l)), function () { var w = G.payOff(l.id); if (w) return UI.toast(w); close(); UI.bankModal(); UI.refresh(); }, 'small' + (G.canAfford(G.owedOn(l)) ? ' go' : ' disabled')));
    });
    var titleCars = G.state.cars.filter(function (c) { return !G.pledged(c.uid) && G.titleOffer(c) >= 200; });
    close = UI.modal([h('div', { class: 'pix acc' }, 'THE BANK'),
      h('div', { class: 'gsmall' }, 'Credit: ', h('b', { class: b.credit >= 680 ? 'good' : b.credit >= 620 ? 'acc' : 'bad' }, b.credit + ' (' + G.creditBand() + ')'), ' • on-time payments raise it, missed ones sink it'),
      loans.length ? h('div', { class: 'col homelist' }, loans) : null,
      h('div', { class: 'plvl' }, 'BANK LOAN'),
      lim > 0 ? h('div', { class: 'col', style: { gap: '4px' } },
        h('div', { class: 'gsmall dim' }, 'Up to ' + DR.money(lim) + ' at ' + Math.round(apr * 100) + '% APR, by your credit and what you own. Paid monthly on the 1st; miss three and collections take your most valuable car.'),
        h('div', { class: 'row', style: { gap: '8px', alignItems: 'center', flexWrap: 'wrap' } }, amt, terms), quote,
        btn('Borrow', function () { var w = G.takeLoan(Math.round(+amt.value || 0), term); if (w) return UI.toast(w); close(); UI.toast('The money\'s in your account'); UI.refresh(); }, 'small go')) :
        h('div', { class: 'gsmall bad' }, 'The bank won\'t lend to you right now (credit too low or you owe too much).'),
      h('div', { class: 'plvl' }, 'TITLE LOAN'),
      h('div', { class: 'gsmall dim' }, 'Cash now against a car you own: ' + Math.round(DR.Cal.TITLE_SHARE * 100) + '% of its value, a ' + Math.round(DR.Cal.TITLE_FEE * 100) + '% fee, due in 30 days. Can\'t pay, and the lender takes the car. (That\'s ~300% APR: the FTC\'s own example.)'),
      titleCars.length ? h('div', { class: 'col', style: { gap: '4px' } }, titleCars.map(function (c) {
        return h('div', { class: 'row', style: { gap: '8px', alignItems: 'center' } }, h('span', { class: 'grow' }, DR.CARS[c.carId].name), h('span', { class: 'acc' }, DR.money(G.titleOffer(c))),
          btn('Pledge', function () { UI.confirm('Borrow ' + DR.money(G.titleOffer(c)) + ' against the ' + DR.CARS[c.carId].name + '? You owe ' + DR.money(Math.round(G.titleOffer(c) * (1 + DR.Cal.TITLE_FEE))) + ' in 30 days, or the car goes.', function () { var w = G.takeTitleLoan(c); if (w) return UI.toast(w); close(); UI.refresh(); }, 'Borrow'); }, 'small red'));
      })) : h('div', { class: 'gsmall dim' }, 'No car to borrow against.'),
      h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '6px' } }, btn('Close', function () { close(); }, 'primary'))]);
    upd();
  };
})();
