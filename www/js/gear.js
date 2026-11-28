// ===========================================================================
// PIT GEAR, SPARES AND TRAILERS (career ladder, build 2). What you bring to
// a race day and how it gets there:
//   - tools (three levels), an engine chiller, a canopy;
//   - spares: drive tires on wheels, axle shafts, nitrous bottles, and any
//     part on your shelf (a second clutch or transmission is a spare);
//   - room for it all: the car's own trunk or bed (real cargo volumes), a
//     tow truck's bed, a trailer;
//   - trailers and hitches (they replace the old $8,500 truck & trailer):
//     small trailers behind any car with a hitch, car trailers behind a
//     truck of yours, up to what it's rated to tow;
//   - the work at the pit: who does it (you, your drag tuner, a hired
//     mechanic), with what tools, how long it takes.
// Prices and sizes: Summit, U-Haul, Pace / Car Mate / Nitro listings, Ram
// tow charts (docs/features/career-ladder.md, Research).
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, h = UI.h, btn = UI.btn, L = DR.Legal;
  var P = DR.Pit = {};
  function r10(x) { return Math.round(x / 10) * 10; }
  function r50(x) { return Math.round(x / 50) * 50; }
  function cu(x) { return (Math.round(x * 10) / 10) + ' cu ft'; }

  // ---------------------------------------------------------------- the gear
  // Tool levels: what jobs they open, how fast the work goes (x the garage's
  // hours), their room and weight.
  P.TOOLS = [
    { name: 'No tools', k: 1.4, room: 0, lb: 0 },
    { name: 'Basic Hand Tools', price: 350, k: 0.6, room: 4, lb: 100, desc: 'Sockets and wrenches, a floor jack and stands: the tune, tires, the nitrous bottle and small bolt-ons.' },
    { name: 'Pro Tools', price: 1800, k: 0.45, room: 10, lb: 250, desc: 'An impact gun, torque wrenches, an aluminum jack and a tool cart: axles, clutches, converters and gear swaps too, and everything faster.' },
    { name: 'Roll Cab & Air Tools', price: 5000, k: 0.35, room: 30, lb: 700, desc: 'A full roll cab and air tools: transmission swaps at the track, and the fastest at everything. It takes a trailer\'s room.' }
  ];
  P.GEAR = {
    chiller: { name: 'Engine Chiller', price: 1500, room: 8, lb: 70, desc: 'A 12-volt pump runs ice water through the engine between rounds: down to about 55°F in under 10 minutes. The ice is topped up for you.' },
    canopy: { name: 'Canopy 10x20', price: 650, room: 3, lb: 60, desc: 'Shade over your pit at day events: the engine cools a few degrees further in the shade.' }
  };
  P.BOTTLE = { price: 350, fill: 50, room: 0.5, lb: 25, name: 'Spare Nitrous Bottle (10 lb)', desc: 'A full, warm bottle to swap in between rounds: full pressure straight away. Refilled for ' + DR.money(50) + ' before your next event once it\'s used (or at a big event\'s vendor row).' };
  P.AXLE = { room: 1, lb: 25 };
  // Trailers: price, empty weight, room for spares (a car trailer's is
  // besides the car), whether it carries a car (trucks only).
  P.TRAILERS = {
    t48o: { name: '4x8 Open Utility Trailer', price: 1200, lb: 400, room: 60, car: false, desc: 'A small open trailer any car with a hitch can pull, Drag Week style: tires, tools and spares.' },
    t48e: { name: '4x8 Enclosed Cargo Trailer', price: 3500, lb: 850, room: 142, car: false, desc: 'A small enclosed cargo trailer (the Drag Week limit): any car with a hitch can pull it, and it holds a roll cab.' },
    t18o: { name: '18 ft Open Car Trailer', price: 4500, lb: 1900, room: 30, car: true, desc: 'An open car hauler: the race car rides, a little room on the deck for tires and a tool cart. Trucks only.' },
    t24s: { name: '24 ft Enclosed Car Trailer (Steel)', price: 16000, lb: 4200, room: 150, car: true, shade: true, desc: 'An enclosed car trailer with cabinets: the car, the spares and shade to work in. Heavy: it takes a big truck.' },
    t24a: { name: '24 ft Enclosed Car Trailer (Aluminum)', price: 25000, lb: 2800, room: 150, car: true, shade: true, desc: 'The same enclosed trailer in aluminum: 1,400 lb lighter, so a half-ton truck can pull it.' }
  };
  P.TRAILER_ORDER = ['t48o', 't48e', 't18o', 't24s', 't24a'];
  // Tow ratings, lb (Lightning: Ford; Ram 2500 Cummins: Ram's tow charts;
  // the C1500 5.7: ~7,000 from third-party ranges)
  DR.TOW = { hauler: 7000, lightning: 5000, diesel: 16000 };
  // Room for spares, cu ft: the trunk or the bed. EPA luggage volumes where
  // there are (fueleconomy.gov vehicles data), else the makers' and
  // reviewers' figures (Miata 4.8, RX-7 ~6, 350Z 6.8, C5 24.8, C6 ~22, R34
  // 180 l, Aventador ~140 l, Viper 14.7, 'Cuda 5.9, Beetle 4.9 front + 4.9
  // behind the seat); beds from their measurements (Ram 6'4" 57.5). Marked
  // est: no figure found (estimated from the body).
  DR.CARGO = {
    fox: 12, fox23: 12, camaro6: 12.9, camss: 11.3, hachi: 13, supra: 10, ronin: 13, bolt: 13, pip: 10, kaze: 13, volta: 15, cobaltss: 14,
    beetle: 9.8, mira: 4.8, silvia: 9, s2k: 5, rx7: 6, evo: 10, sti: 11, r34: 6.4, z35: 6.8, gtr: 9, m3: 9, p911: 5, lambo: 4.9,
    nova: 14 /* est */, chevelle: 16.9, charger: 15 /* est */, cuda: 5.9, belair: 15 /* est */, willys: 8 /* est */, monte: 16, gnx: 16,
    camaro: 12.9, cobra03: 11, stang15: 13.5, vette5: 24.8, z06: 22, hellcat: 16, viper: 14.7,
    hauler: 50, lightning: 40, diesel: 57, promod: 2, rail: 0.5
  };
  P.cargo = function (inst) { var v = DR.CARGO[inst.carId]; return v != null ? v : 8; };
  P.isTruck = function (inst) { return DR.CARS[inst.carId].cat === 'Truck'; };

  // ---------------------------------------------------------------- state
  // G.state.pit: { tools: level owned, chiller, canopy, bottles (full spares),
  // axles: { rearend id: count }, sets: [{ uid, car, tire, wheel, wear, n }],
  // trailers: [ids], last: the last load }
  function st() {
    var s = G.state.pit;
    if (!s) s = G.state.pit = {};
    s.tools = s.tools || 0; s.sets = s.sets || []; s.axles = s.axles || {}; s.bottles = s.bottles || 0; s.empties = s.empties || 0; s.trailers = s.trailers || [];
    return s;
  }
  P.state = st;
  P.owns = function (id) { var s = st(); return id === 'chiller' || id === 'canopy' ? !!s[id] : s.trailers.indexOf(id) >= 0; };

  // ---------------------------------------------------------------- spares
  // two drive tires on wheels: the tire and the wheel this car runs now
  function cheapest(cat, inst) { var o = DR.partOptions(cat, inst).filter(function (x) { return x.price; }).sort(function (a, b) { return a.price - b.price; })[0]; return o ? o.price : 300; }
  function partPrice(cat, inst, id) { var o = DR.getOption(cat, inst, id); return o && o.price ? (G.partPrice ? G.partPrice(cat, o) : o.price) : cheapest(cat, inst); }
  P.setNow = function (inst) { return { tire: DR.partId('rtires', inst), wheel: DR.partId('wheels', inst) }; };
  P.setPrice = function (inst) { var s = P.setNow(inst); return partPrice('rtires', inst, s.tire) + partPrice('wheels', inst, s.wheel); };
  P.setDims = function (inst, s) {
    var t = DR.tireSpec(inst, 'rtires', s.tire), w = DR.wheelSpec(inst, 'wheels', s.wheel);
    var od = t.r ? 2 * t.r / 0.0254 : 26, wid = Math.max(w.w || 8, Math.min(t.sec || 8, 18)) + 1;
    return { room: Math.round(2 * od * od * wid / 1728 * 10) / 10, lb: Math.round(2 * ((w.lb || 20) + (t.kind === 'Slick' ? 32 : 24))) };
  };
  P.setName = function (inst, s) {
    var t = DR.tireSpec(inst, 'rtires', s.tire), w = DR.wheelSpec(inst, 'wheels', s.wheel), wo = DR.getOption('wheels', inst, s.wheel);
    return (t.factory ? 'Factory tires ' + t.size : t.name) + ' on ' + (w.factory ? 'factory wheels' : (wo && wo.name) || (w.d + 'x' + w.w + ' wheels'));
  };
  // can this set go on this car? '' if so
  P.setFits = function (inst, s) {
    if (s.car && s.car !== inst.carId && (s.tire === DR.CARS[s.car].tire || s.wheel === 'stock')) return 'Factory tires or wheels for the ' + DR.CARS[s.car].name;
    var t = DR.tireSpec(inst, 'rtires', s.tire), w = DR.wheelSpec(inst, 'wheels', s.wheel);
    if (!DR.tireFits(t, w)) return 'The tires don\'t fit those wheels';
    var ax = DR.axleOf(inst, 'wheels');
    if (w.d < DR.minWheel(inst, ax)) return 'The wheels don\'t clear this car\'s brakes';
    if (DR.partOptions('rtires', inst).every(function (o) { return o.id !== s.tire; }) && s.tire !== DR.CARS[inst.carId].tire) return 'Those tires don\'t go on this car';
    if (DR.partOptions('wheels', inst).every(function (o) { return o.id !== s.wheel; })) return 'Those wheels don\'t go on this car';
    return '';
  };
  P.axleId = function (inst) { return DR.partId('rearend', inst); };
  P.axlePrice = function (inst) { var ax = DR.getOption('rearend', inst); return ax.price ? r50(ax.price * 0.25) : 250; };
  P.axleCount = function (inst) { return st().axles[P.axleId(inst)] || 0; };

  // ---------------------------------------------------------------- buying
  P.buy = function (kind, id) {
    var s = st(), inst = G.car(), price;
    if (kind === 'tools') { if (id !== s.tools + 1 || !P.TOOLS[id]) return 'One level at a time'; price = P.TOOLS[id].price; }
    else if (kind === 'gear') { if (s[id]) return 'You have one'; price = P.GEAR[id].price; }
    else if (kind === 'trailer') { if (P.owns(id)) return 'You have one'; price = P.TRAILERS[id].price; }
    else if (kind === 'bottle') price = P.BOTTLE.price + P.BOTTLE.fill;
    else if (kind === 'axle') price = P.axlePrice(inst);
    else if (kind === 'set') price = P.setPrice(inst);
    else return 'Not for sale';
    if (!G.canAfford(price)) return 'It costs ' + DR.money(price);
    G.pay(price);
    if (kind === 'tools') s.tools = id;
    else if (kind === 'gear') s[id] = true;
    else if (kind === 'trailer') s.trailers.push(id);
    else if (kind === 'bottle') s.bottles++;
    else if (kind === 'axle') { var a = P.axleId(inst); s.axles[a] = (s.axles[a] || 0) + 1; }
    else if (kind === 'set') { var n = P.setNow(inst); s.sets.push({ uid: G.state.uid++, car: inst.carId, tire: n.tire, wheel: n.wheel, wear: 0, n: 0, price: price }); }
    G.save();
    return '';
  };
  // selling: half what it cost (less wear for a tire set)
  P.sellValue = function (kind, x) {
    if (kind === 'trailer') return r10(P.TRAILERS[x].price * 0.6);
    if (kind === 'gear') return r10(P.GEAR[x].price * 0.5);
    if (kind === 'tools') return r10(P.TOOLS[x].price * 0.5);
    if (kind === 'set') return r10((x.price || 0) * 0.5 * (1 - 0.9 * (x.wear || 0)));
    return 0;
  };
  P.sell = function (kind, x) {
    var s = st(), v = P.sellValue(kind, x);
    if (kind === 'trailer') s.trailers = s.trailers.filter(function (t) { return t !== x; });
    else if (kind === 'gear') s[x] = false;
    else if (kind === 'tools') s.tools = x - 1;
    else if (kind === 'set') s.sets = s.sets.filter(function (z) { return z.uid !== x.uid; });
    G.state.money += v;
    G.save();
    return v;
  };

  // ---------------------------------------------------------------- getting there
  // Your trucks that can pull a car trailer: a Class IV hitch, road-ready,
  // not at the shop, not the car being towed.
  P.towTrucks = function (inst) {
    return (G.state.cars || []).filter(function (c) {
      return c.uid !== inst.uid && P.isTruck(c) && (c.parts || {}).hitch === 'hc4' && !c.damage && !(L && L.undrivable(c)) && !(G.carBusy && G.carBusy(c));
    });
  };
  P.hitchLb = function (inst) { var o = DR.getOption('hitch', inst); return o && o.hitch ? o.hitch : 0; };
  // a way to get there: { haul: 'drive' | 'flatbed' | 'tow', trailer, truck (uid) }
  P.ways = function (inst) {
    var s = st(), out = [], why = L ? L.undrivable(inst) : '';
    if (!why) {
      out.push({ haul: 'drive', label: 'Drive it' });
      if (P.hitchLb(inst)) s.trailers.forEach(function (t) { if (!P.TRAILERS[t].car) out.push({ haul: 'drive', trailer: t, label: 'Drive it, pulling the ' + P.TRAILERS[t].name.replace(/ Trailer$/, '').toLowerCase() + ' trailer' }); });
    }
    out.push({ haul: 'flatbed', label: 'Flatbed tow (' + DR.money(L ? L.FLATBED : 150) + ')' });
    P.towTrucks(inst).forEach(function (tr) {
      s.trailers.forEach(function (t) { if (P.TRAILERS[t].car) out.push({ haul: 'tow', trailer: t, truck: tr.uid, label: 'Tow it: your ' + DR.CARS[tr.carId].name.replace(/ '\d+$/, '') + ' and the ' + P.TRAILERS[t].name.replace(/ Car Trailer/, '').toLowerCase() }); });
    });
    return out;
  };
  P.truckOf = function (w) { return w && w.truck != null ? (G.state.cars || []).filter(function (c) { return c.uid === w.truck; })[0] || null : null; };
  // the room a way gives: the car's own, the tow truck's bed, the trailer's
  P.roomFor = function (inst, w) {
    var r = P.cargo(inst), tr = P.truckOf(w);
    if (tr) r += P.cargo(tr);
    if (w && w.trailer) r += P.TRAILERS[w.trailer].room;
    return r;
  };
  P.carLb = function (inst) { var S = G.spec(inst); return Math.round((S.m || S.mass || DR.CARS[inst.carId].m) * 2.2046); };
  // pulling it all: '' or what's over the limit
  P.towIssue = function (inst, w, loadLb) {
    if (!w || !w.trailer) return '';
    var T = P.TRAILERS[w.trailer];
    if (w.haul === 'drive') { var lim = P.hitchLb(inst), tot = T.lb + (loadLb || 0); return tot > lim ? 'The trailer and its load (' + tot.toLocaleString() + ' lb) are over the hitch\'s ' + lim.toLocaleString() + ' lb' : ''; }
    var tr = P.truckOf(w); if (!tr) return 'No truck to tow it';
    var rate = DR.TOW[tr.carId] || 5000, tot2 = T.lb + P.carLb(inst) + (loadLb || 0);
    return tot2 > rate ? 'The trailer, the car and the load (' + tot2.toLocaleString() + ' lb) are over the ' + DR.CARS[tr.carId].name.replace(/ '\d+$/, '') + '\'s ' + rate.toLocaleString() + ' lb tow rating' : '';
  };

  // ---------------------------------------------------------------- what you bring
  // The things you could pack for this car: each { key, name, room, lb }.
  // Tools: one level (the best that fits is picked first).
  var PART_ROOM = { trans: [6, 150], clutch: [1.5, 40], converter: [2, 40], flywheel: [1, 30], gears: [1, 35], diff: [1, 30], driveshaft: [3, 30],
    headers: [3, 35], exhaust: [4, 40], intake: [2, 25], throttle: [0.5, 8], tmanifold: [2, 30], downpipe: [2, 20], ic: [4, 40], wastegate: [0.5, 8], bov: [0.3, 3],
    nitrous: [2, 30], nosctrl: [0.3, 3], nosheat: [0.3, 3], injectors: [0.3, 5], fuelpump: [0.5, 8], ignition: [0.5, 8], ecu: [0.5, 5], logger: [0.3, 3],
    shocks: [1.5, 20], springs: [1, 25], sway: [1, 15], wheeliebar: [3, 30], brakes: [1.5, 30], battery: [0.5, 25], launch: [0.3, 3], transbrake: [0.5, 10],
    shifter: [0.5, 8], valvebody: [0.5, 15], mounts: [0.5, 10], airfilter: [0.5, 3], pulleys: [0.5, 10], cooling: [3, 30], carb: [1, 12], aero: [4, 25] };
  // jobs that don't happen at a track: the engine and the chassis
  var NOT_AT_TRACK = { engine: 1, heads: 1, cams: 1, valvetrain: 1, headstud: 1, pistons: 1, rods: 1, crank: 1, block: 1, oiling: 1, fi: 1, layout: 1,
    chassis: 1, weight: 1, tubs: 1, fwells: 1, rearend: 1, rearsusp: 1, frontsusp: 1, safety: 1, ballast: 1, hitch: 1, fueltype: 1, wmi: 1, theat: 1,
    rtires: 1, ftires: 1, wheels: 1, fwheels: 1 };
  P.atTrack = function (cat) { return !NOT_AT_TRACK[cat] && DR.jobHours(cat) <= 10; };
  P.packable = function (inst) {
    var s = st(), out = [];
    for (var t = s.tools; t >= 1; t--) out.push({ key: 'tools' + t, kind: 'tools', lvl: t, name: P.TOOLS[t].name, room: P.TOOLS[t].room, lb: P.TOOLS[t].lb });
    ['chiller', 'canopy'].forEach(function (g) { if (s[g]) out.push({ key: g, kind: 'gear', id: g, name: P.GEAR[g].name, room: P.GEAR[g].room, lb: P.GEAR[g].lb }); });
    s.sets.forEach(function (z) { if (!P.setFits(inst, z)) { var d = P.setDims(inst, z); out.push({ key: 'set' + z.uid, kind: 'set', set: z, name: 'Spare tires on wheels: ' + P.setName(inst, z) + (z.wear > 0.005 ? ' (' + Math.round(z.wear * 100) + '% worn)' : ''), room: d.room, lb: d.lb }); } });
    for (var b = 0; b < s.bottles; b++) if (DR.partId('nitrous', inst) !== 'stock') out.push({ key: 'bottle' + b, kind: 'bottle', name: 'Spare nitrous bottle', room: P.BOTTLE.room, lb: P.BOTTLE.lb });
    for (var a = 0; a < P.axleCount(inst); a++) out.push({ key: 'axle' + a, kind: 'axle', name: 'Spare axle shaft', room: P.AXLE.room, lb: P.AXLE.lb });
    // parts on your shelf that could go on this car at the track (a second
    // clutch or transmission like the one fitted is a spare)
    (G.state.inv || []).forEach(function (it) {
      if (!P.atTrack(it.cat)) return;
      var why = G.partFitIssue(it, inst), spare = why === 'Already on this car';
      if (why && !spare) return;
      if (spare && ['trans', 'clutch'].indexOf(it.cat) < 0) return;
      var pr = PART_ROOM[it.cat] || [1, 15];
      out.push({ key: 'inv' + it.uid, kind: 'part', item: it, spare: spare, name: (spare ? 'Spare ' : '') + G.partName(it), room: pr[0], lb: pr[1] });
    });
    return out;
  };
  // the best load that fits: tools first (the best level that fits), then
  // the chiller, a set of tires, the spares, the canopy, parts last
  P.autoLoad = function (inst, w, keep) {
    var items = P.packable(inst), room = P.roomFor(inst, w), used = 0, pick = {}, haveTools = false;
    function take(x) { if (used + x.room <= room + 1e-6) { pick[x.key] = true; used += x.room; return true; } return false; }
    var order = ['tools', 'gear:chiller', 'set', 'axle', 'bottle', 'part:spare', 'gear:canopy'];
    order.forEach(function (o) {
      var kk = o.split(':');
      items.forEach(function (x) {
        if (x.kind !== kk[0] || pick[x.key]) return;
        if (kk[0] === 'gear' && x.id !== kk[1]) return;
        if (kk[0] === 'part' && (kk[1] === 'spare') !== !!x.spare) return;
        if (kk[0] === 'tools') { if (haveTools) return; if (take(x)) haveTools = true; return; }
        if (kk[0] === 'set' && items.some(function (y) { return y.kind === 'set' && pick[y.key]; })) return;
        if (keep && keep[x.key] === false) return;
        take(x);
      });
    });
    return pick;
  };
  P.loadSum = function (items, pick) { var r = 0, lb = 0; items.forEach(function (x) { if (pick[x.key]) { r += x.room; lb += x.lb; } }); return { room: r, lb: lb }; };

  // ---------------------------------------------------------------- the crew
  // Who wrenches: you (about 25), your drag tuner (their engine skill), a
  // hired mechanic (their wrenching). The best of them leads the job; a
  // second pair of hands speeds it up.
  P.crew = function () {
    var T = DR.Team, mech = T && T.mechanic ? T.mechanic() : null, tu = T && T.tuner ? T.tuner('drag') : null, ld = P.load();
    if (ld && !ld.mech) mech = null;
    var lvl = 25, names = ['you'];
    if (tu) { lvl = Math.max(lvl, tu.eng * 0.8); names.push(tu.name.split(' ')[0] + ' (tuner)'); }
    if (mech) { lvl = Math.max(lvl, mech.wr); names.push(mech.name.split(' ')[0] + ' (mechanic)'); }
    return { lvl: lvl, k: (1.5 - lvl / 100) * (names.length >= 3 ? 0.85 : 1), names: names, mech: mech, tuner: tu };
  };
  // what a job needs: tools level and crew level
  function needFor(hours) { return hours <= 2 ? { tools: 1, crew: 0 } : hours <= 7 ? { tools: 2, crew: 40 } : { tools: 3, crew: 60 }; }

  // ---------------------------------------------------------------- at the event
  // The load you brought (on the run), and the gear it gives.
  function runNow() { return DR.Ladder && DR.Ladder.run ? DR.Ladder.run() : null; }
  P.load = function () { var r = runNow(); return r && r.load ? r.load : null; };
  G.hasGear = function (id) {
    var ld = P.load(); if (!ld) return false;
    if (id === 'canopy' && ld.way && ld.way.trailer && P.TRAILERS[ld.way.trailer].shade) return true;
    return !!ld.gear[id];
  };
  P.toolsHere = function () { var ld = P.load(); return ld ? ld.tools || 0 : 0; };
  // turn the picked keys into the run's load
  P.makeLoad = function (inst, w, pick) {
    var items = P.packable(inst), ld = { way: w, tools: 0, gear: {}, sets: [], bottles: 0, axles: 0, parts: [], room: P.roomFor(inst, w) };
    items.forEach(function (x) {
      if (!pick[x.key]) return;
      if (x.kind === 'tools') ld.tools = Math.max(ld.tools, x.lvl);
      else if (x.kind === 'gear') ld.gear[x.id] = true;
      else if (x.kind === 'set') ld.sets.push(x.set.uid);
      else if (x.kind === 'bottle') ld.bottles++;
      else if (x.kind === 'axle') ld.axles++;
      else if (x.kind === 'part') ld.parts.push(x.item.uid);
    });
    ld.sum = P.loadSum(items, pick);
    return ld;
  };
  P.loadLine = function (ld) {
    if (!ld) return '';
    var a = [];
    if (ld.tools) a.push(P.TOOLS[ld.tools].name.toLowerCase());
    if (ld.gear.chiller) a.push('the chiller'); if (ld.gear.canopy) a.push('the canopy');
    if (ld.sets.length) a.push(ld.sets.length + ' set' + (ld.sets.length > 1 ? 's' : '') + ' of tires on wheels');
    if (ld.axles) a.push(ld.axles + ' axle shaft' + (ld.axles > 1 ? 's' : ''));
    if (ld.bottles) a.push(ld.bottles + ' nitrous bottle' + (ld.bottles > 1 ? 's' : ''));
    if (ld.parts.length) a.push(ld.parts.length + ' part' + (ld.parts.length > 1 ? 's' : ''));
    return a.length ? a.join(', ') : 'nothing';
  };

  // ---------------------------------------------------------------- big events
  // The class's biggest shows (the last section's Heads-Up and No-Prep)
  // have a vendor row: parts at shop prices to fit in the pit, nitrous
  // refills.
  P.bigEvent = function (ev) { return !!ev && !!ev.ladder && ev.sec === DR.SECTIONS - 1 && (ev.type === 'headsup' || ev.type === 'noprep'); };
  P.refillHere = function (run) {
    var s = st(); if (!s.empties) return 'No empty bottles';
    if (!G.canAfford(P.BOTTLE.fill)) return 'A refill is ' + DR.money(P.BOTTLE.fill);
    G.pay(P.BOTTLE.fill); s.empties--; s.bottles++; if (run && run.load) run.load.bottles++; G.save(); return '';
  };
  // buy a part at the vendor row: on your shelf, and in the load to fit here
  P.vendorBuy = function (run, cat, id) {
    var it = G.buyPart(cat, id); if (!it) return 'Not enough money';
    if (run && run.load) run.load.parts.push(it.uid);
    return '';
  };

  // ---------------------------------------------------------------- your tuner's read
  // After each pass your staff drag tuner reads it (their data skill): what
  // it did (spun, shook, clean), the 60-foot against your best today, what
  // the hot engine cost, and at a bracket race the dial for the next round
  // from today's passes (closer the better they read data).
  function gauss() { var u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  P.heatCost = function (et, eng) { var p = 0.00125 * Math.max(0, Math.min(20, (eng || 0) - 8)); return et < 90 ? et * p / 3 : 0; };
  P.readPass = function (ev, run, pass) {
    var tu = DR.Team && DR.Team.tuner ? DR.Team.tuner('drag') : null; if (!tu) return;
    var d = tu.dat, first = tu.name.split(' ')[0], L = [], clean = pass.et < 90 && !pass.red;
    if (pass.et >= 90) L.push('No time from that one.');
    else if (pass.shake > 0.35) L.push('It shook the tires' + (pass.spin > 0.15 ? ' and spun' : '') + ': it needs calming down at the hit.');
    else if (pass.spin > 0.15) L.push('It spun off the line: too much at the hit for this track.');
    else L.push('Clean pass, it hooked.');
    if (d >= 50 && pass.sixty) {
      var best = (run.passes || []).filter(function (x) { return x.sixty && x !== pass; }).reduce(function (a, x) { return Math.min(a, x.sixty); }, 99);
      L.push('60 ft ' + pass.sixty.toFixed(3) + (best < 90 ? ' (your best today ' + best.toFixed(3) + ')' : ''));
    }
    var hc = P.heatCost(pass.et, pass.heat);
    if (d >= 65 && hc >= 0.01) L.push('The hot engine cost about ' + hc.toFixed(2) + ': cool it down before the next one.');
    // (once they've set it up for this track today, that isn't the answer
    // any more: say what is)
    if ((pass.shake > 0.35 || pass.spin > 0.15) && pass.et < 90) {
      if (run.setupAt == null) L.push('"Set it up for this track" in the pit would help.');
      else { var tk = G.car() ? G.spec(G.car()).tire.kind : '';
        L.push(pass.shake > 0.35 ? 'It\'s set up as far as it goes: it still shakes, so it needs less at the hit.'
          : /Drag|Slick/.test(tk) && tk !== 'Race Slick' ? 'It\'s set up as far as it goes: it needs more tire, or less at the hit.'
          : 'It\'s set up as far as it goes on these tires: drag radials would hook it.'); }
    }
    pass.read = { who: first, lines: L };
    // a bracket race: the next dial, from today's clean passes (the last
    // counts most), a hair under it; a tuner who reads data badly is further off
    if (ev.type === 'bracket') {
      var ok = (run.passes || []).filter(function (x) { return x.et < 90 && !x.red; }).slice(-3);
      if (ok.length) {
        var w = 0, sum = 0; ok.forEach(function (x, i) { var k = i + 1; sum += (x.et - P.heatCost(x.et, x.heat) * 0.5) * k; w += k; });
        var dial = Math.floor((sum / w + gauss() * (1 - d / 100) * 0.06 - 0.01) * 100) / 100;
        run.tunerDial = { dial: dial, who: first };
        pass.read.lines.push('Dial ' + dial.toFixed(2) + ' for the next round.');
      }
    }
    G.save();
  };

  // ---------------------------------------------------------------- pit jobs
  // The work you can do here now. Each: { id, label, hours, why (blocked),
  // go() }. Hours: the garage's hours x the tools x the crew.
  function invItem(uid) { return (G.state.inv || []).filter(function (x) { return x.uid === uid; })[0] || null; }
  function setById(uid) { return st().sets.filter(function (z) { return z.uid === uid; })[0] || null; }
  P.jobs = function (ev, run, inst) {
    var ld = run && run.load; if (!ld || !inst) return [];
    var crew = P.crew(), tl = ld.tools || 0, out = [], d = inst.damage;
    function job(id, label, base, need, go, extra) {
      var why = extra || '';
      if (!why && tl < need.tools) why = need.tools === 3 ? 'needs the roll cab and air tools' : need.tools === 2 ? 'needs pro tools' : 'needs tools';
      if (!why && crew.lvl < need.crew) why = 'needs a mechanic' + (need.crew >= 60 ? ' who knows transmissions' : '');
      out.push({ id: id, label: label, hours: base * P.TOOLS[Math.max(tl, need.tools ? need.tools : tl)].k * crew.k, why: why, go: go });
    }
    // repairs
    if (d && d.axle) {
      if (ld.axles > 0) job('axle', 'Replace the broken axle shaft', G.repairHours(inst), { tools: 2, crew: 30 }, function () { ld.axles--; var s = st(), a = P.axleId(inst); s.axles[a] = Math.max(0, (s.axles[a] || 0) - 1); inst.damage = null; return 'New axle shaft in.'; });
      else out.push({ id: 'axle', label: 'Replace the broken axle shaft', why: 'no spare axle shaft packed' });
    }
    if (d && d.trans) {
      var spare = ld.parts.map(invItem).filter(function (it) { return it && it.cat === 'trans' && it.id === DR.partId('trans', inst); })[0];
      var bill = G.repairBill(inst).lines.filter(function (l) { return !/Remove/.test(l[0]); }).reduce(function (a, l) { return a + l[1]; }, 0);
      if (spare) job('trans', 'Swap in the spare transmission (the broken one goes to the shop: ' + DR.money(bill) + ')', DR.jobHours('trans'), { tools: 3, crew: 60 }, function () {
        G.pay(bill); inst.damage = null; return 'The spare transmission is in. The broken one comes back rebuilt (' + DR.money(bill) + ').';
      }, G.canAfford(bill) ? '' : 'the rebuild of the broken one is ' + DR.money(bill));
      else out.push({ id: 'trans', label: 'Swap the transmission', why: 'no spare transmission packed' });
    }
    if (d && (d.engine || d.chassis)) out.push({ id: 'big', label: d.engine ? 'Rebuild the engine' : 'Fix the chassis', why: 'not at the track: that\'s shop work' });
    // tires on wheels
    ld.sets.forEach(function (uid) {
      var z = setById(uid); if (!z) return;
      var tw = inst.wear && inst.wear.rtires ? inst.wear.rtires.w : 0;
      job('set' + uid, 'Swap to the spare tires (' + P.setName(inst, z) + ', ' + Math.round((z.wear || 0) * 100) + '% worn; yours ' + Math.round(tw * 100) + '%)', 0.5, { tools: 1, crew: 0 }, function () {
        var cur = P.setNow(inst), w = inst.wear && inst.wear.rtires, oldWear = w ? w.w : 0, oldN = w ? w.n : 0;
        var vNew = partPrice('rtires', inst, z.tire) + partPrice('wheels', inst, z.wheel), vOld = partPrice('rtires', inst, cur.tire) + partPrice('wheels', inst, cur.wheel);
        [['rtires', z.tire], ['wheels', z.wheel]].forEach(function (p) { if (p[1] === DR.stockPart(p[0], inst)) delete inst.parts[p[0]]; else inst.parts[p[0]] = p[1]; });
        if (cur.tire !== z.tire && inst.tune) delete inst.tune.psi;
        inst.wear = inst.wear || {}; if (z.wear > 0.005) inst.wear.rtires = { w: z.wear, n: z.n || 0 }; else delete inst.wear.rtires;
        inst.spent = Math.max(0, (inst.spent || 0) + vNew - vOld);
        z.tire = cur.tire; z.wheel = cur.wheel; z.wear = oldWear; z.n = oldN; z.car = inst.carId; z.price = vOld;
        return 'Spare tires on. The ones that came off go back on the trailer.';
      }, P.setFits(inst, z));
    });
    // your drag tuner sets it up for this track (their chassis skill)
    if (crew.tuner && DR.Tuner && DR.Tuner.pitSetup) out.push({ id: 'setup', label: 'Set it up for this track (' + crew.tuner.name.split(' ')[0] + ': tire pressure and the launch' + (crew.tuner.chs >= 65 ? ', the shocks' : '') + ')', hours: 1 / 3, why: '', go: function () {
      var r = DR.Tuner.pitSetup(inst, crew.tuner, ev);
      if (DR.Team.learnTuner) DR.Team.learnTuner(crew.tuner);
      run.setupAt = (run.passes || []).length;
      return r ? crew.tuner.name.split(' ')[0] + ': ' + r.lines.join(', ') + '.' : crew.tuner.name.split(' ')[0] + ' looked it over: it\'s right for this track as it is.';
    } });
    // the bottle
    var hh = run.heat || {}, nosP = hh.nosP != null ? hh.nosP : 1;
    if (ld.bottles > 0 && DR.partId('nitrous', inst) !== 'stock') job('bottle', 'Swap in a full nitrous bottle (' + Math.round(nosP * 100) + '% pressure now)', 1 / 6 / 0.6, { tools: 1, crew: 0 }, function () {
      ld.bottles--; var s = st(); s.bottles = Math.max(0, s.bottles - 1); s.empties = (s.empties || 0) + 1; if (run.heat) run.heat.nosP = 1;
      return 'Full bottle on: full pressure. The empty gets refilled (' + DR.money(P.BOTTLE.fill) + ') before your next event' + (P.bigEvent(ev) ? ', or at the vendor row here' : '') + '.';
    }, nosP > 0.995 ? 'the bottle\'s at full pressure' : '');
    // a worn clutch for the spare
    var cw = inst.wear && inst.wear.clutch;
    ld.parts.map(invItem).forEach(function (it) {
      if (!it) return;
      if (it.cat === 'clutch' && it.id === DR.partId('clutch', inst)) {
        job('clutch' + it.uid, 'Swap in the spare clutch (yours is ' + Math.round((cw ? cw.w : 0) * 100) + '% worn' + (it.wear > 0.005 ? ', the spare ' + Math.round(it.wear * 100) + '%' : '') + ')', DR.jobHours('clutch'), { tools: 2, crew: 45 }, function () {
          var old = inst.wear && inst.wear.clutch; inst.wear = inst.wear || {};
          if (it.wear > 0.005) inst.wear.clutch = { w: it.wear, n: it.passes || 0 }; else delete inst.wear.clutch;
          it.wear = old ? Math.round(old.w * 1000) / 1000 : 0; it.passes = old ? old.n : 0;
          return 'The spare clutch is in.';
        }, (cw ? cw.w : 0) <= (it.wear || 0) + 0.01 ? 'the spare is no fresher than yours' : '');
        return;
      }
      if (it.cat === 'trans' && it.id === DR.partId('trans', inst)) return;   // the spare box: for a breakage
      var hrs = DR.jobHours(it.cat, inst, it.id), why = G.partFitIssue(it, inst);
      job('inv' + it.uid, 'Fit the ' + G.partName(it), hrs, needFor(hrs), function () {
        G.atPit = true; var r; try { r = G.installPart(inst, it.uid); } finally { G.atPit = false; }
        if (r.ok) ld.parts = ld.parts.filter(function (u) { return u !== it.uid; });
        return r.msg;
      }, why);
    });
    return out;
  };
  // do a job: the clock moves by its hours; the crew learns from it
  P.doJob = function (ev, run, inst, j) {
    if (j.why) return UI.toast('Can\'t: ' + j.why);
    var nc = DR.Ladder.nextCall(ev, run);
    function go() {
      if (j.id === 'setup' && !j.working) { j.working = true; UI.toast(P.crew().tuner.name.split(' ')[0] + ' is going over the car...'); return setTimeout(go, 60); }
      var news = G.advance(j.hours), msg = j.go();
      var c = P.crew(); if (c.mech && DR.Team.learnMech) DR.Team.learnMech(c.mech);
      G.save(); if (UI.timeNews) UI.timeNews(news);
      UI.toast(msg + ' (' + DR.Cal.dur(j.hours) + ')');
      UI.refresh();
    }
    if (nc && G.now() + j.hours > nc.close) return UI.confirm('That takes ' + DR.Cal.dur(j.hours) + ': it won\'t be done before the lanes close for ' + nc.label.toLowerCase() + ' (' + DR.Cal.hourText(Math.floor(nc.close % 24), Math.round((nc.close % 1) * 60) % 60) + '). You\'ll miss it. Do it anyway?', go, 'Do it');
    go();
  };
  // can this damage be fixed with what's here? (for the broke rules)
  P.canFix = function (ev, run, inst, dmg) {
    var ld = run && run.load; if (!ld || !dmg) return false;
    var c = P.crew();
    if (dmg.axle) return ld.axles > 0 && ld.tools >= 2 && c.lvl >= 30;
    if (dmg.trans) return ld.tools >= 3 && c.lvl >= 60 && ld.parts.map(invItem).some(function (it) { return it && it.cat === 'trans' && it.id === DR.partId('trans', inst); });
    return false;
  };

  // ---------------------------------------------------------------- the trip there
  // The load and the way there are chosen at the entry (UI.loadUp); the
  // trip's cost and the mechanic's day are paid then.
  var enter0 = DR.Ladder.enter;
  DR.Ladder.enter = function (ev, pack) {
    var inst = G.car(), w = pack && pack.way;
    if (w && inst) inst.haul = w.haul;
    var why = enter0.apply(this, arguments);
    if (why) return why;
    var run = DR.Ladder.runFor(ev);
    if (!run || run.load || !inst) return why;
    if (!w) { var ws = P.ways(inst).filter(function (x) { return !P.towIssue(inst, x, 0); }); w = ws.filter(function (x) { return x.haul === L.haulFor(inst); })[0] || ws[0] || P.ways(inst)[0]; }
    run.load = P.makeLoad(inst, w, pack && pack.pick ? pack.pick : P.autoLoad(inst, w));
    run.drove = w.haul === 'drive';
    var trip = L ? L.trip(inst, !!DR.evCond(ev).night || ev.type === 'street') : { money: [], news: [], total: 0 };
    var mech = DR.Team && DR.Team.mechanic ? DR.Team.mechanic() : null;
    run.load.mech = !!mech && !(pack && pack.noMech);
    if (run.load.mech) { var wage = DR.Team.mechWage(mech); G.pay(wage); trip.money.push([mech.name + ' (mechanic)', -wage]); trip.total -= wage; }
    var sp = st();
    if (sp.empties) { var fill = sp.empties * P.BOTTLE.fill; G.pay(fill); trip.money.push(['Nitrous bottles refilled (' + sp.empties + ')', -fill]); trip.total -= fill; sp.bottles += sp.empties; sp.empties = 0; }
    run.trip = trip;
    st().last = { pick: pack && pack.pick ? pack.pick : null, way: { haul: w.haul, trailer: w.trailer || null }, noMech: !!(pack && pack.noMech) };
    G.save();
    return '';
  };

  // ---------------------------------------------------------------- King nights
  // A King night is one race day however far up the ladder you go: the
  // trip, your driver's wage, the sponsor's stipend and the associates' day
  // money come with its first race only (the King-night window marks it).
  function kingWin() { return !DR.SCHED_OFF && G.slotWindow ? G.slotWindow('king') : null; }
  function kingNightEv(ev) { return ev && (ev.type === 'callout' || (ev.type === 'boss' && !ev.king)); }
  var kcfg0 = DR.Race.eventCfg;
  DR.Race.eventCfg = function (ev, round) {
    var cfg = kcfg0.apply(this, arguments), w = kingWin();
    if (kingNightEv(ev) && w && w.open && G.careerState().kingDay === w.start) cfg.sameDay = true;
    return cfg;
  };
  var kafter0 = G.afterRun;
  G.afterRun = function (cfg, r) {
    var out = kafter0.apply(this, arguments), w = kingWin();
    if (cfg && kingNightEv(cfg.ev) && r && !r.testDrive && w && w.open) { G.careerState().kingDay = w.start; G.save(); }
    return out;
  };

  // ---------------------------------------------------------------- the haul, everywhere
  // The old truck & trailer is gone: Ray buys it back at what you paid.
  // 'tow' = a truck of yours and a car trailer.
  if (L) {
    L.TOW_TRIP = 40;
    L.hasRig = function () { return P.ways(G.car() || { carId: 'fox', parts: {} }).some(function (w) { return w.haul === 'tow'; }); };
    L.canTow = function (inst) { return P.ways(inst).some(function (w) { return w.haul === 'tow' && !P.towIssue(inst, w, 0); }); };
    L.haulFor = function (inst) {
      var hv = inst.haul || 'drive';
      if (hv === 'rig') hv = 'tow';
      if (hv === 'tow' && !L.canTow(inst)) hv = 'flatbed';
      if (hv === 'drive' && L.undrivable(inst)) hv = L.canTow(inst) ? 'tow' : 'flatbed';
      return hv;
    };
    var trip0 = L.trip;
    L.trip = function (inst, night) {
      if (L.haulFor(inst) === 'tow') { G.pay(L.TOW_TRIP); return { money: [['Truck & trailer (gas)', -L.TOW_TRIP]], news: [], total: -L.TOW_TRIP, how: 'tow' }; }
      return trip0.apply(this, arguments);
    };
    // the race-day line for events that aren't ladder events
    L.haulPicker = function (inst) {
      var why = L.undrivable(inst), c = L.check(inst), cur = L.haulFor(inst);
      var sel = h('select', { class: 'tinput', style: { maxWidth: '260px' } });
      var opts = [['drive', why ? 'Drive it (can\'t: ' + why.split(':')[0] + ')' : 'Drive it' + (c.pts ? ' (' + Math.round(c.stop * 100) + '% chance of a stop)' : ' (street legal)')],
        ['flatbed', 'Flatbed tow (' + DR.money(L.FLATBED) + ')']];
      if (L.canTow(inst)) opts.push(['tow', 'Your truck & trailer (' + DR.money(L.TOW_TRIP) + ' gas)']);
      opts.forEach(function (o) { var e = h('option', { value: o[0] }, o[1]); if (o[0] === 'drive' && why) e.disabled = true; sel.appendChild(e); });
      sel.value = cur;
      sel.addEventListener('change', function () { inst.haul = sel.value; G.save(); });
      return h('div', { class: 'row', style: { gap: '8px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' } }, h('span', { class: 'plvl' }, 'GETTING THERE'), sel,
        L.canTow(inst) ? null : h('span', { class: 'dim gsmall' }, 'A truck with a hitch and a car trailer (Upgrade > Pit & Trailer) tows it.'),
        c.items.length && !why ? h('span', { class: 'dim gsmall', title: c.items.map(function (x) { return x.name + ' ' + DR.money(x.fine); }).join('\n') }, c.items.length + ' thing' + (c.items.length > 1 ? 's' : '') + ' a cop could write up') : null);
    };
  }
  // an old save's truck & trailer: refunded
  var load0 = G.load;
  G.load = function () {
    var out = load0.apply(this, arguments), s = G.state;
    if (s && s.rig) {
      var refund = (L && L.RIG) || 8500;
      s.money += refund; delete s.rig;
      (s.cars || []).forEach(function (c) { if (c.haul === 'rig') c.haul = 'flatbed'; });
      s.rigRefund = refund;
      if (DR.Phone && DR.Phone.send) setTimeout(function () { try { DR.Phone.send('ray', 'rigback'); } catch (e) { /* no phone */ } }, 0);
      G.save();
    }
    return out;
  };
})();

// ---------------------------------------------------------------- screens
// The load-up at an event's entry, and the Pit & Trailer shop.
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, h = UI.h, btn = UI.btn, P = DR.Pit, L = DR.Legal;
  function cu(x) { return (Math.round(x * 10) / 10) + ' cu ft'; }
  function sameWay(a, b) { return a && b && a.haul === b.haul && (a.trailer || null) === (b.trailer || null); }

  // Before an event: how the car gets there and what goes with it. go(pack)
  // enters with { way, pick }.
  UI.loadUp = function (ev, go) {
    var inst = G.car(), s = P.state(), ways = P.ways(inst), last = s.last || {};
    var ok = ways.filter(function (w) { return !P.towIssue(inst, w, 0); });
    var way = ok.filter(function (w) { return sameWay(w, last.way); })[0] || ok.filter(function (w) { return w.haul === L.haulFor(inst); })[0] || ok[0] || ways[0];
    var pick = P.autoLoad(inst, way), close = null, body = h('div', { class: 'col', style: { gap: '6px' } }), noMech = !!last.noMech;
    function draw() {
      while (body.firstChild) body.removeChild(body.firstChild);
      var items = P.packable(inst), room = P.roomFor(inst, way), sum = P.loadSum(items, pick), issue = P.towIssue(inst, way, sum.lb);
      var c = L.check(inst), credit = Math.min(G.careerState().credit || 0, ev.entry || 0), mech = DR.Team && DR.Team.mechanic ? DR.Team.mechanic() : null;
      var tripCost = way.haul === 'flatbed' ? L.FLATBED : way.haul === 'tow' ? L.TOW_TRIP : 0, wage = mech && !noMech ? DR.Team.mechWage(mech) : 0, fills = s.empties * P.BOTTLE.fill, total = (ev.entry || 0) - credit + tripCost + wage + fills;
      var sel = h('select', { class: 'tinput', style: { maxWidth: '100%' } });
      ways.forEach(function (w, i) { var o = h('option', { value: String(i) }, w.label); if (w === way) o.selected = true; sel.appendChild(o); });
      sel.addEventListener('change', function () { way = ways[+sel.value]; pick = P.autoLoad(inst, way); draw(); });
      body.appendChild(h('div', { class: 'pix acc' }, 'LOAD UP: ' + DR.raceDayName(ev).toUpperCase()));
      body.appendChild(h('div', { class: 'row', style: { gap: '8px', alignItems: 'center', flexWrap: 'wrap' } }, h('span', { class: 'plvl' }, 'GETTING THERE'), sel));
      if (way.haul === 'drive' && c.pts) body.appendChild(h('div', { class: 'gsmall dim' }, Math.round(c.stop * (DR.evCond(ev).night || ev.type === 'street' ? 1.3 : 1) * 100) + '% chance a cop stops you on the way (' + c.items.map(function (x) { return x.name.toLowerCase(); }).join(', ') + ')'));
      if (issue) body.appendChild(h('div', { class: 'bad gsmall' }, issue));
      var pct = room > 0 ? Math.min(100, sum.room / room * 100) : 100;
      body.appendChild(h('div', {}, h('span', { class: 'plvl' }, 'ROOM '), h('span', { class: sum.room > room + 1e-6 ? 'bad' : '' }, cu(sum.room) + ' of ' + cu(room)), h('span', { class: 'gsmall dim' }, ' • ' + sum.lb.toLocaleString() + ' lb'),
        h('div', { class: 'roombar' }, h('span', { style: { width: pct + '%' } }))));
      if (!items.length) body.appendChild(h('div', { class: 'gsmall dim' }, 'No pit gear yet: Upgrade > Pit & Trailer sells tools, an engine chiller, spares and trailers. Without tools there\'s nothing to fix or swap at the track.'));
      if (P.bigEvent(ev)) body.appendChild(h('div', { class: 'gsmall good' }, 'A big event: there\'s a vendor row (parts at shop prices to fit in the pit, nitrous refills).'));
      var list = h('div', { class: 'col loadlist', style: { gap: '2px' } });
      items.forEach(function (x) {
        var cb = h('input', { type: 'checkbox' }); cb.checked = !!pick[x.key];
        var fits = pick[x.key] || sum.room + x.room <= room + 1e-6;
        if (!fits) cb.disabled = true;
        cb.addEventListener('change', function () {
          if (cb.checked && x.kind === 'tools') items.forEach(function (y) { if (y.kind === 'tools') delete pick[y.key]; });
          if (cb.checked) pick[x.key] = true; else delete pick[x.key];
          draw();
        });
        list.appendChild(h('label', { class: 'row loadrow' + (fits ? '' : ' dim'), style: { gap: '6px', alignItems: 'center' } }, cb, h('span', { class: 'grow' }, x.name), h('span', { class: 'gsmall dim' }, cu(x.room))));
      });
      body.appendChild(list);
      if (mech) {
        var mcb = h('input', { type: 'checkbox' }); mcb.checked = !noMech;
        mcb.addEventListener('change', function () { noMech = !mcb.checked; draw(); });
        body.appendChild(h('label', { class: 'row loadrow', style: { gap: '6px', alignItems: 'center' } }, mcb, h('span', { class: 'grow' }, 'Bring ' + mech.name + ' (mechanic, wrenching ' + Math.floor(mech.wr) + ')'), h('span', { class: 'gsmall dim' }, DR.money(DR.Team.mechWage(mech)) + ' for the day')));
      }
      body.appendChild(h('div', { class: 'gsmall dim' }, 'Entry ' + DR.money(ev.entry || 0) + (credit ? ' less ' + DR.money(credit) + ' track credit' : '') + (tripCost ? ', ' + (way.haul === 'flatbed' ? 'the flatbed ' : 'gas ') + DR.money(tripCost) : '') + (wage ? ', the mechanic ' + DR.money(wage) : '') + (fills ? ', nitrous refills ' + DR.money(fills) : '') + '. One entry a week.'));
      var bad = issue || sum.room > room + 1e-6;
      body.appendChild(h('div', { class: 'row loadfoot', style: { justifyContent: 'flex-end', gap: '8px', marginTop: '6px' } },
        btn('Cancel', function () { close(); }),
        btn((ev.entry ? 'Enter ' : 'Go ') + DR.money(Math.max(0, total)), function () {
          if (bad) return UI.toast(issue || 'Too much for the room you have');
          if (!G.canAfford(total)) return UI.toast('That\'s ' + DR.money(total) + ' today');
          close(); go({ way: way, pick: pick, noMech: noMech });
        }, 'primary' + (bad ? ' disabled' : ''))));
    }
    draw();
    close = UI.modal(body);
  };

  // The vendor row at a big event: nitrous refills, and parts you can fit
  // in the pit (at shop prices), by slot.
  var vendorCat = null;
  UI.vendorRow = function (ev, run) {
    var inst = G.car(), close = null, body = h('div', { class: 'col', style: { gap: '6px' } });
    var cats = []; DR.PART_GROUPS.forEach(function (g) { g.cats.forEach(function (c) { if (P.atTrack(c) && DR.partApplies(c, inst) && DR.partOptions(c, inst).some(function (o) { return o.price && G.partUnlocked(c, o.lvl || 0, o.id); })) cats.push(c); }); });
    if (cats.indexOf(vendorCat) < 0) vendorCat = cats[0];
    function draw() {
      while (body.firstChild) body.removeChild(body.firstChild);
      var s = P.state();
      body.appendChild(h('div', { class: 'pix acc' }, 'VENDOR ROW'));
      body.appendChild(h('div', { class: 'row', style: { gap: '8px', alignItems: 'center' } }, h('span', { class: 'grow' }, 'Nitrous refills: ' + s.empties + ' empty'), s.empties ? btn('Refill one ' + DR.money(P.BOTTLE.fill), function () { var w = P.refillHere(run); if (w) return UI.toast(w); UI.updMoney && UI.updMoney(); draw(); }, 'small go') : null));
      var sel = h('select', { class: 'tinput' });
      cats.forEach(function (c) { var o = h('option', { value: c }, DR.PART_CATS[c].name); if (c === vendorCat) o.selected = true; sel.appendChild(o); });
      sel.addEventListener('change', function () { vendorCat = sel.value; draw(); });
      body.appendChild(h('div', { class: 'row', style: { gap: '8px', alignItems: 'center' } }, h('span', { class: 'plvl' }, 'PARTS'), sel));
      var list = h('div', { class: 'col loadlist', style: { gap: '2px' } }), cur = DR.partId(vendorCat, inst);
      DR.partOptions(vendorCat, inst).forEach(function (o) {
        if (!o.price || !G.partUnlocked(vendorCat, o.lvl || 0, o.id)) return;
        var pr = G.partPrice ? G.partPrice(vendorCat, o) : o.price;
        list.appendChild(h('div', { class: 'row loadrow', style: { gap: '8px', alignItems: 'center' } }, h('span', { class: 'grow' }, o.name + (o.id === cur ? ' (on the car)' : '')),
          btn('Buy ' + DR.money(pr), function () { var w = P.vendorBuy(run, vendorCat, o.id); if (w) return UI.toast(w); UI.toast(o.name + ' bought: fit it in the pit'); UI.updMoney && UI.updMoney(); }, 'small ' + (G.canAfford(pr) ? 'go' : 'nofit'))));
      });
      body.appendChild(list);
      body.appendChild(h('div', { class: 'row loadfoot', style: { justifyContent: 'flex-end' } }, btn('Back to the pit', function () { close(); UI.refresh(); }, 'primary')));
    }
    draw();
    close = UI.modal(body);
  };

  // ---------------------------------------------------------------- the shop
  UI.PitShop = function () {
    var inst = G.car(), s = P.state(), car = DR.CARS[inst.carId];
    function sec(title, sub) { return h('div', { class: 'stagehead', style: { marginTop: '10px' } }, h('div', { class: 'grow' }, h('div', { class: 'plvl' }, title), sub ? h('div', { class: 'dim gsmall' }, sub) : null)); }
    function buyBtn(label, price, kind, id) {
      return btn(label + ' ' + DR.money(price), function () { var w = P.buy(kind, id); if (w) return UI.toast(w); UI.updMoney && UI.updMoney(); UI.refresh(); }, 'small ' + (G.canAfford(price) ? 'go' : 'nofit'));
    }
    function sellBtn(kind, x, what) {
      var v = P.sellValue(kind, x);
      return btn('Sell ' + DR.money(v), function () { UI.confirm('Sell ' + what + ' for ' + DR.money(v) + '?', function () { P.sell(kind, x); UI.updMoney && UI.updMoney(); UI.refresh(); }, 'Sell'); }, 'small red');
    }
    function card(name, desc, meta, foot, on) {
      return h('div', { class: 'ecard pitcard' + (on ? ' on' : '') }, h('div', { class: 'acc ename' }, name), h('div', { class: 'gsmall' }, desc), meta ? h('div', { class: 'gsmall dim' }, meta) : null, foot ? h('div', { class: 'efoot' }, foot) : null);
    }
    var hitch = DR.getOption('hitch', inst), hitchTxt = hitch && hitch.hitch ? hitch.name + ': pulls up to ' + hitch.hitch.toLocaleString() + ' lb' + (P.isTruck(inst) ? ' (within the truck\'s ' + (DR.TOW[inst.carId] || 0).toLocaleString() + ' lb rating)' : '') : 'No hitch (Parts > Weight & Safety > Trailer Hitch)';
    var room = h('div', { class: 'gsmall' }, 'Your ' + car.name + ': ' + cu(P.cargo(inst)) + ' of ' + (P.isTruck(inst) ? 'bed' : 'trunk') + '. ' + hitchTxt + '.' + (car.cat === 'Pro' ? ' A race car: it goes on a trailer or a flatbed.' : ''));
    // tools
    var tools = h('div', { class: 'egrid' }, [1, 2, 3].map(function (t) {
      var T = P.TOOLS[t], own = s.tools >= t;
      return card(T.name, T.desc, cu(T.room) + ' • ' + T.lb + ' lb', own ? (s.tools === t ? sellBtn('tools', t, 'the ' + T.name.toLowerCase()) : h('span', { class: 'tag g' }, 'OWNED')) : s.tools === t - 1 ? buyBtn('Buy', T.price, 'tools', t) : h('span', { class: 'dim gsmall' }, 'After the ' + P.TOOLS[t - 1].name.toLowerCase()), own);
    }));
    var gear = h('div', { class: 'egrid' }, ['chiller', 'canopy'].map(function (g) {
      var X = P.GEAR[g];
      return card(X.name, X.desc, cu(X.room) + ' • ' + X.lb + ' lb', s[g] ? sellBtn('gear', g, 'the ' + X.name.toLowerCase()) : buyBtn('Buy', X.price, 'gear', g), s[g]);
    }));
    // spares for this car
    var now = P.setNow(inst), dims = P.setDims(inst, now), mine = s.sets.filter(function (z) { return !P.setFits(inst, z); }), other = s.sets.length - mine.length;
    var spares = h('div', { class: 'egrid' },
      card('Spare Tires on Wheels', 'A second set of your drive tires, mounted on their own wheels: swap them on in the pit when yours are worn (or for a different tire).', P.setName(inst, now) + ' • ' + cu(dims.room) + ' • ' + dims.lb + ' lb' + (mine.length ? ' • you have ' + mine.length + ' that fit' + (mine.length > 1 ? '' : 's') + ' this car' : '') + (other ? ' (' + other + ' for other cars or sizes)' : ''), buyBtn('Buy', P.setPrice(inst), 'set')),
      card('Spare Axle Shaft', 'For a snapped axle: replaced in the pit with pro tools and someone who can do it.', 'For your ' + DR.getOption('rearend', inst).name.toLowerCase() + ' • you have ' + P.axleCount(inst) + ' • ' + cu(P.AXLE.room), buyBtn('Buy', P.axlePrice(inst), 'axle')),
      card(P.BOTTLE.name, P.BOTTLE.desc, 'You have ' + s.bottles + ' full • ' + cu(P.BOTTLE.room) + (DR.partId('nitrous', inst) === 'stock' ? ' • this car has no nitrous' : ''), buyBtn('Buy', P.BOTTLE.price + P.BOTTLE.fill, 'bottle')),
      card('Clutch & Transmission', 'A second one like the one fitted, on your shelf, is a spare: bring it and swap it in at the pit (a clutch with pro tools, a transmission with the roll cab and a mechanic who knows them).', 'Buy them in Parts > Drivetrain.', btn('Drivetrain', function () { UI.show(UI.Shop, 'trans'); }, 'small')));
    var sets = s.sets.length ? h('div', { class: 'col', style: { gap: '4px' } }, s.sets.map(function (z) {
      var why = P.setFits(inst, z);
      return h('div', { class: 'row', style: { gap: '8px', alignItems: 'center' } }, h('span', { class: 'grow gsmall' + (why ? ' dim' : '') }, P.setName(inst, z) + (z.wear > 0.005 ? ' (' + Math.round(z.wear * 100) + '% worn)' : '') + (why ? ': ' + why : '')), sellBtn('set', z, 'this set'));
    })) : null;
    // trailers
    var trailers = h('div', { class: 'egrid' }, P.TRAILER_ORDER.map(function (t) {
      var X = P.TRAILERS[t];
      return card(X.name, X.desc, X.lb.toLocaleString() + ' lb empty • ' + cu(X.room) + (X.car ? ' besides the car' : '') + (X.shade ? ' • shade' : ''), P.owns(t) ? sellBtn('trailer', t, 'the ' + X.name.toLowerCase()) : buyBtn('Buy', X.price, 'trailer', t), P.owns(t));
    }));
    var trucks = P.towTrucks(inst), towLine = trucks.length ? 'Your tow truck' + (trucks.length > 1 ? 's' : '') + ': ' + trucks.map(function (t) { return DR.CARS[t.carId].name + ' (' + (DR.TOW[t.carId] || 0).toLocaleString() + ' lb)'; }).join(', ') + '.' : 'A car trailer needs a truck of yours (in a bay, with a Class IV hitch) to tow it: the C1500 about 7,000 lb, the Lightning 5,000, the Ram 2500 Cummins 16,000. Trailer, car and spares must be within it.';
    return h('div', { class: 'screen' }, UI.sectionTop('upgrade', 'pit'),
      h('div', { class: 'content' },
        h('div', { class: 'tipline' }, 'What you bring to a race day, and how it gets there. You pick the load when you enter an event.'),
        room,
        sec('TOOLS', 'One kit to bring: the better the kit, the more jobs and the faster.'), tools,
        sec('PIT GEAR'), gear,
        sec('SPARES', 'For the car you\'re on.'), spares, sets,
        sec('TRAILERS', 'Small trailers go behind any car with a hitch; car trailers behind your truck.'), h('div', { class: 'gsmall dim' }, towLine), trailers,
        sec('CREW', 'You do the small jobs. Your drag tuner and a hired mechanic (Team) do more, faster.')));
  };
  UI.SECTIONS.upgrade.push(['pit', 'Pit & Trailer', function () { UI.show(UI.PitShop); }]);
})();
