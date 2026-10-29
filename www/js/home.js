// ===========================================================================
// HOME — where you live is where the cars live (Test Drive Unlimited's
// houses, each with its own garage). You start on Uncle Ray's couch with
// one bay of his shop; rent a place with a bigger garage as the team grows.
//  * Garage bays are the number of cars you can keep. A car won on a pink
//    slip with no bay free goes into a storage unit (a fee every race day).
//  * Every race day (a career event you turn up to) is a week: rent, your
//    staff tuners' salaries and any storage are due.
//  * Miss rent and it's owed; miss it twice in a row and the third race day
//    you're evicted (back to Uncle Ray's, the deposit gone). Staff who can't
//    be paid walk. Storage left unpaid three race days running: the unit's
//    owner sells the car (a lien sale) and keeps what's owed.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, h = UI.h, btn = UI.btn;

  DR.HOMES = [
    { id: 'uncle', name: 'Uncle Ray\'s garage', bays: 1, rent: 0, blurb: 'The couch in the office and one bay of the shop. Free, as long as you sweep up.' },
    { id: 'apt', name: 'Apartment with a 2-car garage', bays: 2, rent: 300, blurb: 'A one-bedroom over a row of lock-up garages. Your own place, finally.' },
    { id: 'house', name: 'House with a 4-car garage', bays: 4, rent: 800, blurb: 'A rented ranch house on the edge of town, with a detached shop out back.' },
    { id: 'shop', name: 'Shop with a loft, 6 bays', bays: 6, rent: 1800, blurb: 'A light-industrial unit: six bays, a lift, and a loft to sleep in.' },
    { id: 'estate', name: 'Hillside house, 8-car garage', bays: 8, rent: 4000, blurb: 'Glass, a view of the city, and a garage bigger than the house.' }
  ];
  DR.STORAGE = 100;        // a car in a storage unit, a race day
  DR.RENT_GRACE = 2;       // missed race days before eviction
  DR.LIEN_AFTER = 3;       // unpaid storage race days before a lien sale
  DR.homeById = function (id) { return DR.HOMES.filter(function (x) { return x.id === id; })[0] || DR.HOMES[0]; };

  // a save from before homes: the smallest place that holds its cars
  function st() {
    var s = G.state;
    if (!s.home) {
      var n = (s.cars || []).length, hm = DR.HOMES.filter(function (x) { return x.bays >= n; })[0] || DR.HOMES[DR.HOMES.length - 1];
      // (the first three race days rent-free, while you get used to the bills)
      s.home = { id: hm.id, owed: 0, missed: 0, deposit: 0, store: 0, storeMissed: 0, free: hm.rent ? 3 : 0 };
    }
    return s.home;
  }
  // a new career starts on the couch
  var origNew = G.newGame;
  G.newGame = function () { var out = origNew.apply(this, arguments); G.state.home = { id: 'uncle', owed: 0, missed: 0, deposit: 0, store: 0, storeMissed: 0 }; G.save(); return out; };
  G.home = function () { return DR.homeById(st().id); };
  G.homeState = st;
  // bays: the cars you can keep (the dealer won't sell you one past it)
  G.carSlots = function () { return G.home().bays; };
  G.slotFree = function () { return G.state.cars.length < G.carSlots(); };
  G.storedCars = function () { return Math.max(0, G.state.cars.length - G.carSlots()); };

  // moving: a deposit of two weeks' rent, back when you leave on good terms
  G.moveCost = function (id) { var to = DR.homeById(id), s = st(); return to.rent * 2 - s.deposit + s.owed; };
  G.moveHome = function (id) {
    var s = st(), to = DR.homeById(id);
    if (to.id === s.id) return 'You live here';
    var cost = G.moveCost(id);
    if (cost > 0 && !G.canAfford(cost)) return 'Moving in takes ' + DR.money(cost) + (s.deposit ? ' (your deposit back counted)' : '') + (s.owed ? ' and the rent you owe' : '');
    if (cost > 0) G.pay(cost); else if (cost < 0) G.earn(-cost);
    s.id = to.id; s.deposit = to.rent * 2; s.owed = 0; s.missed = 0;
    G.save();
    return '';
  };

  // A race day's bills. Returns [[label, amount]] for the timeslip (amount
  // negative when paid, 0 when it couldn't be) and news lines.
  G.raceDayDues = function () {
    var s = st(), hm = G.home(), out = { money: [], news: [], total: 0 };
    G.state.week = (G.state.week || 0) + 1;
    function pay(label, amt) { G.pay(amt); out.money.push([label, -amt]); out.total -= amt; }
    // rent (with what's owed)
    if (hm.rent && s.free > 0) { s.free--; out.money.push(['Rent (free week, ' + s.free + ' left)', 0]); }
    else if (hm.rent) {
      var due = hm.rent + s.owed;
      if (G.canAfford(due)) { pay(s.owed ? 'Rent (and what you owed)' : 'Rent', due); s.owed = 0; s.missed = 0; }
      else {
        s.owed += hm.rent; s.missed++;
        if (s.missed > DR.RENT_GRACE) {
          out.news.push('EVICTED: three race days without rent. You\'re back on Uncle Ray\'s couch, and the landlord kept your deposit against the ' + DR.money(s.owed) + ' you owed.');
          s.id = 'uncle'; s.owed = 0; s.missed = 0; s.deposit = 0;
          if (DR.Phone) DR.Phone.send('ray', 'evicted');
        } else {
          out.money.push(['Rent unpaid (' + DR.money(s.owed) + ' owed)', 0]);
          out.news.push('Rent unpaid: ' + s.missed + ' of ' + DR.RENT_GRACE + ' race days before the landlord changes the locks.');
        }
      }
    }
    // staff tuners: paid every race day, or they walk
    if (DR.Team) DR.Team.state().tuners.slice().forEach(function (tu) {
      if (G.canAfford(tu.wage)) pay(tu.name + ' (tuner)', tu.wage);
      else { DR.Team.releaseStaff(tu.id); out.news.push(tu.name + ' quit: you couldn\'t make payroll.'); }
    });
    // storage for the cars that don't fit
    var n = G.storedCars();
    if (!n) { s.store = 0; s.storeMissed = 0; }
    else {
      var fee = n * DR.STORAGE + s.store;
      if (G.canAfford(fee)) { pay('Storage (' + n + ' car' + (n > 1 ? 's' : '') + ')', fee); s.store = 0; s.storeMissed = 0; }
      else {
        s.store += n * DR.STORAGE; s.storeMissed++;
        if (s.storeMissed >= DR.LIEN_AFTER) {
          // the last car in (not the one you're driving) goes to auction
          var car = G.state.cars.slice().reverse().filter(function (c) { return c.uid !== G.state.active && !(DR.Team && DR.Team.carAway(c.uid)); })[0];
          if (car) {
            var val = Math.round(G.carValue(car) * 0.5 / 50) * 50, back = Math.max(0, val - s.store);
            G.state.cars = G.state.cars.filter(function (c) { return c !== car; });
            if (back) G.earn(back);
            out.news.push('LIEN SALE: the storage company auctioned your ' + DR.CARS[car.carId].name + ' for ' + DR.money(val) + ' and kept the ' + DR.money(s.store) + ' you owed' + (back ? ' (+' + DR.money(back) + ' to you)' : '') + '.');
            s.store = 0; s.storeMissed = 0;
          }
        } else out.news.push('Storage unpaid: ' + DR.money(s.store) + ' owed (' + s.storeMissed + ' of ' + DR.LIEN_AFTER + ').');
      }
    }
    G.save();
    return out;
  };
  // what the next race day costs, for the home screen
  G.weeklyBills = function () {
    var t = G.home().rent + G.storedCars() * DR.STORAGE;
    if (DR.Team) DR.Team.state().tuners.forEach(function (tu) { t += tu.wage; });
    return t;
  };

  // ---------------------------------------------------------------- screen
  UI.homeModal = function () {
    var s = st(), cur = G.home(), close;
    var rows = DR.HOMES.map(function (hm) {
      var here = hm.id === cur.id, cost = G.moveCost(hm.id), fits = hm.bays >= G.state.cars.length;
      return h('div', { class: 'homerow' + (here ? ' on' : '') },
        h('div', { class: 'grow' }, h('div', { class: here ? 'acc' : '' }, hm.name),
          h('div', { class: 'gsmall dim' }, hm.blurb),
          h('div', { class: 'gsmall' }, hm.bays + ' bay' + (hm.bays > 1 ? 's' : '') + ' • ' + (hm.rent ? DR.money(hm.rent) + ' a race day' : 'free') + (here ? '' : ' • move in ' + (cost > 0 ? DR.money(cost) : cost < 0 ? '+' + DR.money(-cost) + ' back' : 'free')) + (!fits && !here ? ' • ' + (G.state.cars.length - hm.bays) + ' car' + (G.state.cars.length - hm.bays > 1 ? 's' : '') + ' to storage' : ''))),
        here ? h('span', { class: 'etype good' }, 'HOME') : btn('Move in', function () {
          UI.confirm('Move to the ' + hm.name.toLowerCase() + '? ' + (cost > 0 ? DR.money(cost) + ' (two race days\' rent as a deposit' + (s.deposit ? ', less your deposit back' : '') + ').' : cost < 0 ? 'You get ' + DR.money(-cost) + ' of your deposit back.' : '') + (fits ? '' : ' Cars that don\'t fit go into storage at ' + DR.money(DR.STORAGE) + ' each a race day.'), function () {
            var w = G.moveHome(hm.id); if (w) return UI.toast(w);
            close(); UI.toast('Moved in: ' + hm.name); if (DR.Phone) DR.Phone.send('ray', 'moved', hm); UI.refresh();
          }, 'Move');
        }, 'small' + (cost <= 0 || G.canAfford(cost) ? ' go' : ' disabled')));
    });
    close = UI.modal([h('div', { class: 'pix acc' }, 'HOME'),
      h('div', {}, 'You live where the cars live. Bays are the cars you can keep; rent' + (DR.Team && DR.Team.state().tuners.length ? ', your tuners\' salaries' : '') + ' and storage are due every race day (each career event you turn up to).'),
      s.owed ? h('div', { class: 'bad' }, 'Rent owed: ' + DR.money(s.owed) + ' (' + s.missed + ' of ' + DR.RENT_GRACE + ' race days missed). Miss another and you\'re evicted.') : null,
      G.storedCars() ? h('div', { class: 'warn' }, G.storedCars() + ' car' + (G.storedCars() > 1 ? 's' : '') + ' in storage: ' + DR.money(G.storedCars() * DR.STORAGE) + ' a race day' + (s.store ? ', ' + DR.money(s.store) + ' owed' : '') + '. Move somewhere bigger or sell.') : null,
      h('div', { class: 'gsmall dim' }, 'Next race day: ' + DR.money(G.weeklyBills()) + ' in bills.'),
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
        h('span', { class: 'grow' }, h('b', { class: 'acc' }, hm.name), ' • ' + Math.min(G.state.cars.length, hm.bays) + ' / ' + hm.bays + ' bays' + (n ? ' • ' + n + ' in storage' : '') + ' • ' + (hm.rent ? DR.money(hm.rent) + ' rent' : 'no rent') + ' a race day' +
          (G.freeCars() ? ' • ' + G.freeCars() + ' free sponsor car' + (G.freeCars() > 1 ? 's' : '') + ' to pick at the dealer' : '')),
        btn('Home', function () { UI.homeModal(); }, 'small go')));
    }
    return el;
  };
})();
