// ===========================================================================
// SEASON — the career as a racing season, on top of career.js.
//  * Race days (ProStreet): each class's events are race days with a day,
//    a surface and the time of day. Finishing race days opens more.
//  * Rep: winning race days earns rep in the class and in its discipline
//    (heads-up, bracket, no-prep & street).
//  * The ladder (Most Wanted's Blacklist): the class's five quickest named
//    rivals. Enough rep lets you call out the one above you; beat them and
//    take their spot. Callouts can be run for pink slips, both ways, by
//    choice. Beat #1 and the class King will race you, for their car.
//  * Bracket racing: pick a dial-in, the slower dial leaves first, and the
//    first to the stripe without running quicker than their dial wins.
//  * Kings: one per discipline, each racing for their car once your rep in
//    the discipline is high enough; the heads-up King is the last class's.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game;
  function C() { return G.careerState(); }

  DR.EVENT_TYPES.bracket = { name: 'Bracket', dist: function () { return DR.QUARTER; }, theme: 'strip', grip: 1 };
  DR.EVENT_TYPES.callout = { name: 'Callout', dist: function () { return DR.QUARTER; }, theme: 'strip', grip: 1 };
  DR.EVENT_TYPES.king = { name: 'King', dist: function () { return DR.QUARTER; }, theme: 'strip', grip: 1 };
  DR.EVENT_TYPES.kingstreet = { name: 'No-Prep King', dist: function () { return DR.EIGHTH; }, theme: 'street', grip: 0.92 };

  // ---------------------------------------------------------------- race days
  DR.DISC = { headsup: 'Heads-Up', bracket: 'Bracket', street: 'No-Prep & Street', circuit: 'Circuit' };
  DR.evDisc = function (ev) {
    if (ev.type === 'street' || ev.type === 'showcase' || ev.type === 'kingstreet') return 'street';
    if (ev.type === 'bracket') return 'bracket';
    if (ev.type === 'show') return null;
    return 'headsup';
  };
  function hash(s) { var x = 0; for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) % 997; return x; }
  // the surface and time of day of an event: street nights, no-prep nights,
  // bracket Sundays, and some strip events under the lights
  DR.evCond = function (ev) {
    var surface = ev.type === 'street' ? 'street' : ev.type === 'showcase' || ev.type === 'kingstreet' ? 'noprep' : 'prep';
    var night = surface !== 'prep' || ev.type === 'callout' || (ev.type !== 'bracket' && hash(ev.opps[0] ? ev.opps[0].name : ev.id) % 3 === 0);
    return { surface: surface, night: night };
  };
  var DAY = { quarter: 'Heads-Up 1/4', eighth: 'Eighth-Mile Night', street: 'Street Night', knockout: 'Eliminations', sponsor: 'Sponsor Shootout', showcase: 'No-Prep Night',
    class: 'Class Shootout', boss: 'King of the Class', bracket: 'Bracket Race', callout: 'Callout', show: 'Car Show', king: 'King Race', kingstreet: 'No-Prep King' };
  DR.raceDayName = function (ev) {
    if (ev.type === 'class' && ev.cls) return DR.CLASSES[ev.cls].name + ' Shootout';
    if (ev.type === 'sponsor') { var sp = C().sponsor[ev.stage]; return (sp ? DR.sponsorById(sp.id).name + ' ' : '') + 'Shootout'; }
    return DAY[ev.type] || ev.type;
  };
  DR.raceDayWhen = function (ev) {
    var c = DR.evCond(ev), wk = (ev.needWins || 0) + 1;
    return 'Week ' + wk + ' • ' + (ev.type === 'bracket' ? 'Sunday' : c.night ? 'Friday night' : 'Saturday');
  };

  // ---------------------------------------------------------------- rep
  var REP = { quarter: 10, eighth: 10, street: 10, knockout: 20, sponsor: 12, showcase: 14, class: 8, bracket: 12, show: 6, boss: 30, callout: 0 };
  DR.LADDER_REP = [15, 30, 45, 60, 75];
  DR.KING_REP = 60;
  G.rep = function (si) { return (C().rep || {})[si] || 0; };
  G.discRep = function (d) { return (C().drep || {})[d] || 0; };
  function addRep(ev, first) {
    var c = C(), n = first ? (REP[ev.type] != null ? REP[ev.type] : 8) : ev.type === 'callout' ? 0 : 3, d = DR.evDisc(ev);
    if (!n) return 0;
    c.rep = c.rep || {}; c.drep = c.drep || {};
    if (ev.stage != null) c.rep[ev.stage] = (c.rep[ev.stage] || 0) + n;
    if (d) c.drep[d] = (c.drep[d] || 0) + n;
    return n;
  }

  // ---------------------------------------------------------------- brackets
  // Two bracket races a class (side races): a three-round bracket against
  // the class's regulars. The handicap start makes any car a contender.
  function pickOpps(st, idx) { return idx.map(function (i) { var ev = st.events[Math.min(i, st.events.length - 1)]; return Object.assign({}, ev.opps[ev.opps.length - 1]); }); }
  DR.STAGES.forEach(function (st, si) {
    var b1 = { type: 'bracket', opps: pickOpps(st, [0, 2, 4]), cash: Math.round(st.base * 1.6), unlocks: [], needWins: 1, stars: 0, side: true };
    var b2 = { type: 'bracket', opps: pickOpps(st, [5, 7, 9]), cash: Math.round(st.base * 3), unlocks: [], needWins: 4, stars: 0, side: true };
    [b1, b2].forEach(function (ev, k) { ev.id = si + '.b' + k; ev.stage = si; ev.idx = 'b' + k; st.side.push(ev); st.all.splice(st.all.length - 1, 0, ev); });
  });

  // ---------------------------------------------------------------- ladders
  // The class's five quickest regulars, #5 up to #1: the opponents of its
  // last main events (later in the season = quicker), one rung each.
  DR.STAGES.forEach(function (st, si) {
    var seen = {}, rungs = [];
    st.events.slice().sort(function (a, b) { return b.needWins - a.needWins || (b.idx - a.idx); }).forEach(function (ev) {
      var o = ev.opps[ev.opps.length - 1];
      if (rungs.length < 5 && !seen[o.name]) { seen[o.name] = 1; rungs.push({ o: o, cash: ev.cash }); }
    });
    rungs.reverse();   // #5 first
    st.ladder = rungs.map(function (r, k) {
      var ev = { type: 'callout', opps: [Object.assign({}, r.o, { skill: Math.min(0.98, (r.o.skill || 0.5) + 0.05) })], cash: Math.round(r.cash * 1.3), unlocks: [], needWins: 0, stars: 0, rung: k, side: true };
      ev.id = si + '.L' + k; ev.stage = si; ev.idx = 'L' + k;
      return ev;
    });
  });
  // the rungs in order of the times the rivals run (slowest is #5), worked
  // out the first time a ladder is looked at
  G.ladder = function (si) {
    var st = DR.STAGES[si];
    if (!st._sorted) {
      var opps = st.ladder.map(function (ev) { return { o: ev.opps[0], et: G.estimate(G.oppInst(ev.opps[0]), DR.QUARTER).et }; });
      opps.sort(function (a, b) { return b.et - a.et; });
      st.ladder.forEach(function (ev, k) { ev.opps = [opps[k].o]; });
      st._sorted = true;
    }
    return st.ladder;
  };
  G.ladderPos = function (si) {
    var c = C(); c.ladder = c.ladder || {};
    // a class whose King already fell (older saves) has its ladder climbed
    if (c.ladder[si] == null) c.ladder[si] = c.won[DR.STAGES[si].boss.id] || c.stage > si ? 5 : 0;
    return c.ladder[si];
  };
  // why a callout can't be raced ('' = it can)
  G.calloutLock = function (ev) {
    var si = ev.stage, pos = G.ladderPos(si);
    if (si > C().stage) return 'Beat the previous class King';
    if (ev.rung < pos) return '';                         // already beaten: a rematch
    if (ev.rung > pos) return 'Beat #' + (5 - pos) + ' first';
    var need = DR.LADDER_REP[ev.rung], have = G.rep(si);
    return have < need ? 'Needs ' + need + ' rep in this class (you have ' + have + ')' : '';
  };

  // ---------------------------------------------------------------- Kings
  // One per discipline, each racing for their car. The heads-up King is the
  // last class's King; the others open with rep in their discipline.
  var last = DR.STAGES[DR.STAGES.length - 1];
  function kingOpp(src, over) { return Object.assign({}, src, over); }
  DR.KINGS = {
    headsup: { name: 'Heads-Up King', ev: last.boss, blurb: 'The last class\'s King, at the top of the ladder.' },
    bracket: { name: 'Bracket King', blurb: 'Nobody cuts a better light or runs closer to their number.',
      ev: { type: 'bracket', id: 'K.bracket', idx: 'Kb', king: 'bracket', needWins: 0, stars: 0, unlocks: [], cash: 40000,
        opps: [kingOpp(DR.STAGES[2].events[9].opps[0], { name: 'Dead-On Dolores', skill: 0.97, color: '#e8c547' }),
          kingOpp(DR.STAGES[3].events[6].opps[0], { name: 'Point-Oh-One Pete', skill: 0.97, color: '#3a7bd2' }),
          kingOpp(DR.STAGES[4].events[1].opps[0], { name: 'The Bracket King', skill: 0.99, color: '#ffd700' })] } },
    street: { name: 'No-Prep King', blurb: 'Bare asphalt, no traction compound, and the meanest car in the city.',
      ev: { type: 'kingstreet', id: 'K.street', idx: 'Ks', king: 'street', needWins: 0, stars: 0, unlocks: [], cash: 120000,
        opps: [kingOpp(DR.STAGES[5].events[9].opps[0], { name: 'Asphalt Annie', skill: 0.95, color: '#ff2bd6' })] } },
    circuit: { name: 'Circuit King', blurb: 'Your team\'s drivers against the best: win the Supercar Trophy Night Series (Race Team).', circuit: true }
  };
  G.kingLock = function (d) {
    var K = DR.KINGS[d];
    if (d === 'headsup') return G.eventLock(K.ev);
    if (d === 'circuit') return '';
    var need = DR.KING_REP, have = G.discRep(d);
    return have < need ? 'Needs ' + need + ' ' + DR.DISC[d] + ' rep (you have ' + have + ')' : '';
  };
  G.kingWon = function (d) {
    if (d === 'headsup') return G.eventWon(DR.KINGS.headsup.ev);
    if (d === 'circuit') { var t = DR.Team && DR.Team.state().titles; return !!(t && t.A); }
    return !!(C().kings || {})[d];
  };

  // ---------------------------------------------------------------- pink slips
  // A car won on a pink slip comes home with its build and gets its own spot
  // in the garage; one lost goes with the winner.
  G.carSlotsBase = G.carSlots;
  G.carSlots = function () { return G.carSlotsBase() + ((G.state.career || {}).pinkSlots || 0); };
  G.awardCar = function (o) {
    var c = C(), inst = G.newInst(o.carId);
    inst.engine = o.engine || DR.CARS[o.carId].engine;
    inst.parts = DR.fitTrans({ carId: o.carId, parts: Object.assign({}, o.parts || {}) }).parts;
    inst.tune = JSON.parse(JSON.stringify(o.tune || {}));
    inst.vis = Object.assign({}, o.vis || {}); inst.color = o.color || DR.CARS[o.carId].col; inst.stripe = o.stripe || ''; inst.rim = o.rim || '#c8c8c8';
    inst.won = o.name;
    c.pinkSlots = (c.pinkSlots || 0) + 1;
    G.state.cars.push(inst);
    G.save();
    return inst;
  };
  G.loseCar = function (inst) {
    var s = G.state;
    if (s.cars.length < 2) return false;
    s.cars = s.cars.filter(function (x) { return x !== inst; });
    if (s.active === inst.uid) s.active = s.cars[0].uid;
    var c = C(); c.pinkSlots = Math.max(0, (c.pinkSlots || 0) - 1);
    G.save();
    return true;
  };

  // ---------------------------------------------------------------- sponsors
  // What each sponsor sells, so what it discounts while you're signed with
  // it, and what it wants on the car when you win its races.
  function drag(S) { return S.tire.kind === 'Drag Radial' || S.tire.kind === 'Slick'; }
  DR.SPONSOR_PERKS = {
    parts: { grp: 'engine', pct: 0.1 }, slick: { grp: 'engine', pct: 0.1 }, pixel: { grp: 'engine', pct: 0.1 },
    vortex: { grp: 'engine', pct: 0.12, prod: ['an aftermarket intake', function (S, inst) { return DR.partId('intake', inst) !== 'stock'; }] },
    torque: { grp: 'tires', pct: 0.15, prod: ['drag tires', drag] }, grip: { grp: 'tires', pct: 0.15, prod: ['drag tires', drag] }, apex: { grp: 'tires', pct: 0.1 },
    boost: { grp: 'power', pct: 0.15, prod: ['a turbo', function (S) { return S.fiType === 'turbo'; }] }, turbo: { grp: 'power', pct: 0.15, prod: ['a turbo', function (S) { return S.fiType === 'turbo'; }] },
    king: { grp: 'susp', pct: 0.15 }, volt: { grp: 'body', pct: 0.1 }, junk: { grp: 'drive', pct: 0.1 },
    octane: { fuel: 0.3, prod: ['race fuel or alcohol', function (S) { return S.fuelId !== 'stock'; }] }
  };
  var offers0 = G.sponsorOffers;
  G.sponsorOffers = function (si) {
    return offers0(si).map(function (o) {
      var p = DR.SPONSOR_PERKS[o.id] || {};
      o.stipend = Math.round(DR.STAGES[si].base * 0.08 / 10) * 10;
      if (p.grp) o.disc = { grp: p.grp, pct: p.pct };
      if (p.fuel) o.fuelDisc = p.fuel;
      if (p.prod) o.prod = p.prod[0];
      return o;
    });
  };
  var sign0 = G.signSponsor;
  G.signSponsor = function (si, offer) {
    if (!sign0(si, offer)) return false;
    var sp = C().sponsor[si];
    sp.stipend = offer.stipend; sp.disc = offer.disc; sp.fuelDisc = offer.fuelDisc; sp.prod = offer.prod;
    G.save();
    return true;
  };
  // sponsors' discounts: the best one on offer for a part's group
  G.partDiscount = function (cat) {
    var g = DR.groupOf(cat), best = 0, sps = C().sponsor || {};
    for (var k in sps) if (sps[k].disc && (sps[k].disc.grp === g)) best = Math.max(best, sps[k].disc.pct);
    return best;
  };
  G.partPrice = function (cat, opt) { return Math.round((opt.price || 0) * (1 - G.partDiscount(cat)) / 10) * 10; };
  G.fuelDiscount = function () { var best = 0, sps = C().sponsor || {}; for (var k in sps) best = Math.max(best, sps[k].fuelDisc || 0); return best; };
  // a sponsor race only counts for the contract with the product on the car
  G.sponsorProductOk = function (si, inst) {
    var sp = C().sponsor[si], p = sp && DR.SPONSOR_PERKS[sp.id];
    return !p || !p.prod || p.prod[1](G.spec(inst), inst);
  };

  // ---------------------------------------------------------------- hooks
  // Locks: the class King races you once you're #1 on the ladder (and your
  // sponsor contract is done); brackets and callouts have their own rules.
  var eventLock0 = G.eventLock;
  G.eventLock = function (ev) {
    if (ev.type === 'callout') return G.calloutLock(ev);
    if (ev.king) return G.kingLock(ev.king);
    if (ev.type === 'boss') {
      var l = eventLock0(Object.assign({}, ev, { needWins: 0 }));
      if (l) return l;
      if (G.ladderPos(ev.stage) < 5) return 'Climb the ladder: beat #1 first';
      return '';
    }
    return eventLock0(ev);
  };
  var eventVisible0 = G.eventVisible;
  G.eventVisible = function (ev) { return ev.king || ev.type === 'callout' ? true : eventVisible0(ev); };
  var eventWon0 = G.eventWon;
  G.eventWon = function (ev) { return ev.king && ev.king !== 'headsup' ? !!(C().kings || {})[ev.king] || eventWon0(ev) : eventWon0(ev); };
  // winning: rep, the ladder, a King's crown
  var winEvent0 = G.winEvent;
  G.winEvent = function (ev) {
    var c = C(), first = !c.won[ev.id];
    // a sponsor race won without the sponsor's product doesn't count for them
    var sp = ev.stage != null && c.sponsor[ev.stage], noProd = sp && ev.type === 'sponsor' && first && !G.sponsorProductOk(ev.stage, G.car());
    var out = ev.king ? null : winEvent0(ev);
    if (noProd) { sp.spon = Math.max(0, sp.spon - 1); out.contract = 'That win doesn\'t count for ' + DR.sponsorById(sp.id).name + ': they want ' + sp.prod + ' on the car.'; }
    if (ev.king) {
      var purse = first ? ev.cash : Math.round(ev.cash * 0.35);
      out = { purse: purse, cash: purse, unlocks: [], money: [], banner: '', lines: [], first: first };
      c.won[ev.id] = true; c.kings = c.kings || {}; c.kings[ev.king] = true;
      out.banner = 'You are the ' + DR.KINGS[ev.king].name + '!';
    }
    var rep = addRep(ev, first);
    if (rep) out.rep = rep;
    if (ev.type === 'callout' && ev.rung === G.ladderPos(ev.stage)) { c.ladder[ev.stage] = ev.rung + 1; out.banner = 'You took #' + (5 - ev.rung) + ' on the ' + DR.STAGES[ev.stage].name + ' ladder'; }
    G.save();
    return out;
  };
  // older saves: rep for the races already won, ladders for the classes done
  G.syncSeason = function () {
    var c = C();
    if (!c.rep) {
      c.rep = {}; c.drep = {};
      DR.STAGES.forEach(function (st) { st.all.forEach(function (ev) { if (c.won[ev.id]) addRep(ev, true); }); });
    }
    DR.STAGES.forEach(function (st, si) { G.ladderPos(si); });
  };
  var sync0 = G.syncUnlocks;
  G.syncUnlocks = function () { sync0(); G.syncSeason(); };
})();
