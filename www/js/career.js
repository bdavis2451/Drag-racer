// ===========================================================================
// CAREER — an Underground 2 style career for the drag strip.
//  * Five stages of events. Winning events pays out and unlocks parts
//    (performance levels per shop group, body kit tiers), more events and,
//    with the stage boss, the next stage and the next tier of cars.
//  * A visual rating (0-10 stars) from cosmetic parts. It lives beside the
//    career rather than gating it: car shows and magazine covers reward it,
//    and only the looks-focused sponsor contract asks for it.
//  * One sponsor per stage: a signing bonus, a bonus for every win and a
//    contract that has to be fulfilled before the boss will race you.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game;

  // ---------------------------------------------------------------- cosmetics
  // Each slot: tiers 1-3 (index 0 = stock). stars: what the part adds to the
  // visual rating. Rims are styles, tint / finish / vinyl are levels.
  DR.VISUAL = [
    { id: 'fbumper', name: 'Front Bumper', tiers: [['Street Lip', 500, 0.5], ['Sport Splitter', 1400, 0.75], ['Carbon Race Splitter', 3000, 1]] },
    { id: 'rbumper', name: 'Rear Bumper', tiers: [['Rear Valance', 450, 0.5], ['Diffuser', 1300, 0.75], ['Carbon Race Diffuser', 2800, 1]] },
    { id: 'skirt', name: 'Side Skirts', tiers: [['Side Skirts', 450, 0.5], ['Sport Skirts', 1200, 0.75], ['Carbon Blades', 2600, 1]] },
    { id: 'spoiler', name: 'Spoiler', tiers: [['Ducktail', 400, 0.5], ['Mid Wing', 1200, 0.75], ['Carbon GT Wing', 2600, 1]] },
    { id: 'hood', name: 'Hood', tiers: [['Vented Hood', 600, 0.5], ['Cowl Hood', 1500, 0.75], ['Carbon Hood', 3000, 1]] },
    { id: 'roof', name: 'Roof Scoop', tiers: [null, ['Roof Scoop', 700, 0.5], null] },
    { id: 'rims', name: 'Rims', styles: true, tiers: [['mesh', 'pony'], ['turbine', 'split'], ['deep', 'drag']], prices: [800, 1600, 3000], stars: [0.5, 0.75, 1] },
    { id: 'tint', name: 'Window Tint', tiers: [['Light Tint', 200, 0.25], ['Limo Tint', 500, 0.5], null] },
    { id: 'neon', name: 'Neon Underglow', tiers: [null, ['Underglow', 1200, 1], null], colors: ['#00e5ff', '#ff2bd6', '#39ff14', '#ff3030', '#8a5cff', '#ffffff'] },
    { id: 'finish', name: 'Paint Finish', tiers: [['Metallic', 600, 0.25], ['Pearl', 1500, 0.5], ['Candy', 3000, 0.75]], extra: { matte: ['Matte', 1500, 0.5, 2] } },
    { id: 'vinyl', name: 'Vinyls', tiers: [['Sponsor Decals', 300, 0.25], ['Side Slash', 900, 0.5], ['Flames', 2000, 0.75]] },
    { id: 'tips', name: 'Exhaust Tip', tiers: [['Big Chrome Tip', 300, 0.25], null, null] }
  ];
  DR.RIM_NAMES = { mesh: 'Mesh 8-Spoke', pony: 'Pony 5-Hole', turbine: 'Turbine', split: 'Split 5-Spoke', deep: 'Deep Dish 6-Spoke', drag: 'Drag Star', five: 'Factory 5-Spoke' };
  DR.visSlot = function (id) { for (var i = 0; i < DR.VISUAL.length; i++) if (DR.VISUAL[i].id === id) return DR.VISUAL[i]; return null; };

  // Visual rating, 0-10 stars.
  DR.starRating = function (inst) {
    var v = inst.vis || {}, s = 0;
    DR.VISUAL.forEach(function (slot) {
      var x = v[slot.id];
      if (!x) return;
      if (slot.styles) { for (var t = 0; t < 3; t++) if (slot.tiers[t].indexOf(x) >= 0) s += slot.stars[t]; return; }
      if (slot.id === 'finish' && x === 'matte') { s += slot.extra.matte[2]; return; }
      if (slot.id === 'neon') { s += slot.tiers[1][2]; return; }
      var tier = slot.tiers[x - 1];
      if (tier) s += tier[2];
    });
    if (inst.stripe) s += 0.25;
    return Math.min(10, Math.round(s * 4) / 4);
  };
  DR.starText = function (n) { return '★ ' + (Math.round(n * 100) / 100).toFixed(n % 1 ? (n * 4 % 2 ? 2 : 1) : 0); };

  // ---------------------------------------------------------------- performance levels
  // Performance parts are grouped into levels 1-5 by price; each shop group
  // has its own unlocked level.
  DR.partLevel = function (price) { return !price ? 0 : price <= 700 ? 1 : price <= 1300 ? 2 : price <= 4500 ? 3 : price <= 12000 ? 4 : 5; };
  DR.groupOf = function (cat) {
    for (var i = 0; i < DR.PART_GROUPS.length; i++) if (DR.PART_GROUPS[i].cats.indexOf(cat) >= 0) return DR.PART_GROUPS[i].id;
    return 'engine';
  };
  DR.LEVEL_NAMES = ['Stock', 'Street', 'Sport', 'Pro', 'Race', 'Pro Mod'];

  // ---------------------------------------------------------------- sponsors
  // contract: {spon: sponsor races to win, stars: rating to reach, street: street wins}
  var SPONSORS = [
    { id: 'nitro', name: 'Nitro Cola', col: '#ff3030' }, { id: 'torque', name: 'Torque Tires', col: '#ffcc00' }, { id: 'slick', name: 'Slick Oil', col: '#2fb3a8' },
    { id: 'boost', name: 'BoostHouse', col: '#3a7bd2' }, { id: 'redline', name: 'Redline Radio', col: '#ff6a00' }, { id: 'apex', name: 'Apex Wheels', col: '#d0d0d0' },
    { id: 'volt', name: 'Volt Batteries', col: '#7cd320' }, { id: 'night', name: 'NightRunner Neon', col: '#ff2bd6' }, { id: 'octane', name: 'Octane Race Fuel', col: '#c8102e' },
    { id: 'grip', name: 'GripCo', col: '#8a5cff' }, { id: 'pixel', name: 'Pixel Performance', col: '#00e5ff' }, { id: 'hotrod', name: 'Hot Rod Monthly', col: '#f0a020' },
    { id: 'turbo', name: 'TurboTech', col: '#9aa8b4' }, { id: 'king', name: 'Kingpin Customs', col: '#ffd700' }, { id: 'vortex', name: 'Vortex Intakes', col: '#2e7d4f' }
  ];
  DR.SPONSORS = SPONSORS;

  // ---------------------------------------------------------------- stages
  var R = DR.RIVALS;           // the rival pool, grouped by skill band
  function rv(band, i, over) { var o = Object.assign({}, R[band][i]); for (var k in over) o[k] = over[k]; return o; }
  // event types
  DR.EVENT_TYPES = {
    quarter:  { name: '1/4 Mile', dist: function () { return DR.QUARTER; }, theme: 'strip', grip: 1 },
    eighth:   { name: '1/8 Mile', dist: function () { return DR.EIGHTH; }, theme: 'strip', grip: 1 },
    street:   { name: 'Street 1/8', dist: function () { return DR.EIGHTH; }, theme: 'street', grip: 0.85 },
    knockout: { name: 'Knockout', dist: function () { return DR.QUARTER; }, theme: 'strip', grip: 1 },
    sponsor:  { name: 'Sponsor Race', dist: function () { return DR.QUARTER; }, theme: 'strip', grip: 1 },
    showcase: { name: 'Night Invitational', dist: function () { return DR.QUARTER; }, theme: 'street', grip: 0.92 },
    boss:     { name: 'BOSS', dist: function () { return DR.QUARTER; }, theme: 'strip', grip: 1 }
  };
  // e(type, opponents, cash, unlocks, needWins, stars)
  function e(type, opps, cash, unlocks, needWins, stars) { return { type: type, opps: opps, cash: cash, unlocks: unlocks || [], needWins: needWins || 0, stars: stars || 0 }; }

  DR.STAGES = [
    { name: 'Rookie Nights', blurb: 'Parking-lot heroes and Friday night grudge matches.', sponsors: ['nitro', 'torque', 'slick'], base: 600,
      events: [
        e('quarter', [rv(0, 0)], 450, ['perf:engine:2', 'vis:rims:1'], 0),
        e('eighth', [rv(0, 1)], 450, ['vis:fbumper:1', 'vis:tint:1'], 0),
        e('street', [rv(0, 2, { name: 'Jess' })], 550, ['perf:tires:2', 'vis:vinyl:1'], 1),
        e('quarter', [rv(0, 1, { name: 'Tony B', color: '#2fb3a8', skill: 0.5 })], 550, ['perf:susp:2', 'vis:rbumper:1'], 1),
        e('sponsor', [rv(0, 3)], 800, ['perf:drive:2', 'vis:finish:1'], 2),
        e('knockout', [rv(0, 0, { name: 'Edna' }), rv(0, 2, { name: 'Kat', color: '#ff2bd6' }), rv(0, 3)], 1100, ['perf:power:2', 'vis:skirt:1'], 3),
        e('eighth', [rv(0, 4)], 650, ['vis:spoiler:1', 'vis:tips:1'], 3),
        e('showcase', [rv(0, 3, { name: 'Neon Nina', color: '#ff2bd6', vis: { neon: '#ff2bd6', fbumper: 1, rims: 'mesh', tint: 1, vinyl: 1 } })], 900, ['vis:hood:1'], 4),
        e('sponsor', [rv(0, 4, { name: 'Mike' })], 900, ['perf:body:2'], 5),
        e('street', [rv(1, 0, { name: 'Dale' })], 750, [], 5)
      ],
      boss: e('boss', [rv(1, 0, { name: 'Dale "The Mullet" Rhodes', skill: 0.7, vis: { spoiler: 1, rims: 'pony', vinyl: 2, tips: 1 }, stripe: '#ffffff' })], 3500, ['car:camss', 'perf:all:2'], 6) },

    { name: 'Bracket Bandits', blurb: 'Bolt-ons are not enough anymore. Real builds, real money.', sponsors: ['boost', 'redline', 'apex'], base: 1800,
      events: [
        e('quarter', [rv(1, 1)], 1400, ['perf:engine:3', 'vis:fbumper:2'], 0),
        e('street', [rv(1, 2)], 1500, ['vis:neon:2', 'vis:tint:2'], 0),
        e('eighth', [rv(1, 1, { name: 'Kenji' })], 1500, ['perf:tires:3', 'vis:rims:2'], 1),
        e('quarter', [rv(1, 3)], 1800, ['perf:power:3', 'vis:rbumper:2'], 1),
        e('sponsor', [rv(1, 2, { name: 'Rosa' })], 2400, ['perf:drive:3', 'vis:finish:2'], 2),
        e('knockout', [rv(1, 1, { name: 'Kenji' }), rv(1, 3, { name: 'Hiro' }), rv(1, 4)], 3200, ['perf:susp:3', 'vis:skirt:2'], 3),
        e('street', [rv(1, 4, { name: 'Earl' })], 2000, ['vis:spoiler:2', 'vis:roof:2'], 3),
        e('showcase', [rv(1, 3, { name: 'Chrome Carla', color: '#d0d0d0', vis: { fbumper: 2, rbumper: 2, skirt: 2, spoiler: 2, finish: 2, rims: 'split', neon: '#00e5ff', tint: 2 } })], 2800, ['vis:hood:2', 'vis:vinyl:2'], 4),
        e('sponsor', [rv(2, 0)], 2800, ['perf:body:3'], 5),
        e('eighth', [rv(2, 1)], 2200, [], 5)
      ],
      boss: e('boss', [rv(2, 2, { name: 'Lexi "Boost" Park', skill: 0.8, vis: { fbumper: 2, skirt: 2, spoiler: 2, vinyl: 2, rims: 'turbine', tint: 2, finish: 1 }, stripe: '#ff2bd6' })], 10000, ['car:supra', 'perf:all:3'], 6) },

    { name: 'Street Outlaws', blurb: 'Big turbos, nitrous and no excuses. The cops are watching.', sponsors: ['volt', 'night', 'octane'], base: 5000,
      events: [
        e('street', [rv(2, 0)], 3800, ['perf:engine:4', 'vis:fbumper:3'], 0),
        e('quarter', [rv(2, 1)], 4000, ['perf:power:4', 'vis:rims:3'], 0),
        e('eighth', [rv(2, 3)], 4000, ['perf:tires:4', 'vis:rbumper:3'], 1),
        e('street', [rv(2, 4)], 4500, ['perf:drive:4', 'vis:finish:3'], 1),
        e('sponsor', [rv(3, 0)], 6000, ['vis:skirt:3'], 2),
        e('knockout', [rv(2, 3, { name: 'Marcus' }), rv(2, 4, { name: 'Tank' }), rv(3, 1)], 8000, ['perf:susp:4', 'vis:spoiler:3'], 3),
        e('quarter', [rv(3, 1, { name: 'Ricky' })], 5000, ['vis:hood:3'], 3),
        e('showcase', [rv(3, 0, { name: 'Akira', vis: { fbumper: 3, rbumper: 3, skirt: 3, spoiler: 3, hood: 3, rims: 'deep', tint: 2, finish: 3, vinyl: 3, neon: '#39ff14' } })], 7000, ['vis:vinyl:3'], 4),
        e('sponsor', [rv(3, 2)], 7000, ['perf:body:4'], 5),
        e('eighth', [rv(3, 1, { name: 'Ricky Radial' })], 5500, [], 5)
      ],
      boss: e('boss', [rv(3, 2, { name: 'Nitro Nate', skill: 0.85, vis: { hood: 2, vinyl: 3, rims: 'drag', skirt: 2, tips: 1 } })], 25000, ['perf:all:4'], 6) },

    { name: 'Radial Wars', blurb: 'Drag radials, transbrakes and four-digit horsepower.', sponsors: ['grip', 'pixel', 'hotrod'], base: 12000,
      events: [
        e('quarter', [rv(3, 3)], 9000, ['perf:engine:5'], 0),
        e('street', [rv(3, 4)], 9500, ['perf:power:5'], 0),
        e('eighth', [rv(4, 0)], 10000, ['perf:tires:5'], 1),
        e('quarter', [rv(4, 1)], 11000, ['perf:drive:5'], 1),
        e('sponsor', [rv(4, 2)], 15000, [], 2),
        e('knockout', [rv(3, 4, { name: 'Murder Fox' }), rv(4, 0, { name: 'Gus' }), rv(4, 1, { name: 'Ken' })], 20000, ['perf:susp:5'], 3),
        e('street', [rv(4, 3)], 12000, [], 3),
        e('showcase', [rv(4, 2, { name: 'Lisa', vis: { fbumper: 3, rbumper: 3, skirt: 3, spoiler: 3, hood: 3, rims: 'deep', tint: 2, finish: 2, vinyl: 2, neon: '#8a5cff', roof: 2 }, stripe: '#151515' })], 16000, [], 4),
        e('sponsor', [rv(4, 3, { name: 'Hank' })], 16000, ['perf:body:5'], 5),
        e('eighth', [rv(4, 1, { name: 'Godzilla' })], 13000, [], 5)
      ],
      boss: e('boss', [rv(4, 4, { name: 'Twin Turbo Tina', skill: 0.9, vis: { fbumper: 3, skirt: 3, hood: 3, rims: 'drag', tint: 2, vinyl: 3, finish: 3 } })], 60000, ['perf:all:5'], 6) },

    { name: 'Pro Mod Legends', blurb: 'Six-second cars. One king.', sponsors: ['turbo', 'king', 'vortex'], base: 30000,
      events: [
        e('quarter', [rv(4, 3, { name: 'Hemi Hank' })], 22000, [], 0),
        e('eighth', [rv(5, 0)], 24000, [], 0),
        e('street', [rv(5, 1)], 26000, [], 1),
        e('quarter', [rv(5, 0, { name: 'Nick' })], 26000, [], 1),
        e('sponsor', [rv(5, 1, { name: 'Rin' })], 35000, [], 2),
        e('knockout', [rv(5, 0, { name: 'Nitrous Nick' }), rv(5, 1, { name: 'Rice Rocket Rin' }), rv(5, 3)], 50000, [], 3),
        e('eighth', [rv(5, 3, { name: 'Bill' })], 30000, [], 3),
        e('showcase', [rv(5, 2, { name: 'Tony', vis: { fbumper: 3, rbumper: 3, skirt: 3, hood: 3, rims: 'drag', tint: 2, finish: 3, vinyl: 3, neon: '#ff3030', tips: 1 } })], 40000, [], 4),
        e('sponsor', [rv(5, 2)], 40000, [], 5),
        e('street', [rv(5, 3, { name: 'Blower Bill' })], 32000, [], 5)
      ],
      boss: e('boss', [rv(5, 4, { vis: { fbumper: 3, rbumper: 3, skirt: 3, hood: 3, rims: 'drag', tint: 2, finish: 3, neon: '#ffd700', tips: 1 }, stripe: '#151515' })], 150000, [], 6) }
  ];
  DR.STAGES.forEach(function (st, si) {
    st.events.forEach(function (ev, i) { ev.id = si + '.' + i; ev.stage = si; ev.idx = i; });
    st.boss.id = si + '.boss'; st.boss.stage = si; st.boss.idx = 'boss';
    st.all = st.events.concat([st.boss]);
  });
  DR.CAR_STAGE = { fox: 0, hachi: 0, camss: 1, supra: 2 };

  // ---------------------------------------------------------------- state
  G.careerDefaults = function () {
    return { stage: 0, won: {}, sponsor: {}, perf: { engine: 1, power: 1, drive: 1, susp: 1, tires: 1, body: 1 }, vis: {}, cars: { fox: 1, hachi: 1 }, bestStars: 0 };
  };
  function C() { if (!G.state.career || G.state.career.perf == null) G.state.career = G.careerDefaults(); return G.state.career; }
  G.careerState = C;

  G.stageUnlocked = function (si) { return si <= C().stage; };
  G.stageWins = function (si) { var w = 0; DR.STAGES[si].events.forEach(function (ev) { if (C().won[ev.id]) w++; }); return w; };
  G.eventWon = function (ev) { return !!C().won[ev.id]; };
  G.carUnlocked = function (carId) { return !!C().cars[carId] || (DR.CAR_STAGE[carId] != null && DR.CAR_STAGE[carId] <= C().stage); };
  G.partUnlocked = function (cat, price) {
    var lvl = DR.partLevel(price);
    return lvl <= 1 || lvl <= (C().perf[DR.groupOf(cat)] || 1);
  };
  G.visUnlocked = function (slot, tier) { return tier <= (C().vis[slot] || 0); };

  // Why an event cannot be raced yet ('' = it can).
  G.eventLock = function (ev) {
    var c = C(), st = DR.STAGES[ev.stage];
    if (ev.stage > c.stage) return 'Beat the previous stage boss';
    var wins = G.stageWins(ev.stage);
    if (wins < ev.needWins) return 'Win ' + (ev.needWins - wins) + ' more race' + (ev.needWins - wins > 1 ? 's' : '') + ' in this stage';
    if (ev.type === 'boss') {
      var sp = c.sponsor[ev.stage];
      if (!sp) return 'Sign a sponsor first';
      var pr = G.contractProgress(ev.stage);
      if (!pr.done) return 'Fulfil your ' + DR.sponsorById(sp.id).name + ' contract';
    }
    if ((ev.type === 'sponsor') && !c.sponsor[ev.stage]) return 'Sign a sponsor first';
    return '';
  };
  G.eventVisible = function (ev) { return ev.stage <= C().stage && (G.stageWins(ev.stage) >= ev.needWins - 1 || ev.type === 'boss'); };

  // ---------------------------------------------------------------- sponsors
  DR.sponsorById = function (id) { for (var i = 0; i < SPONSORS.length; i++) if (SPONSORS[i].id === id) return SPONSORS[i]; return SPONSORS[0]; };
  // Three offers per stage with different trade-offs.
  G.sponsorOffers = function (si) {
    var st = DR.STAGES[si], b = st.base, starsReq = [0, 1.5, 3, 5, 7][si];
    return st.sponsors.map(function (id, k) {
      var sp = DR.sponsorById(id);
      if (k === 0) return { id: id, name: sp.name, col: sp.col, sign: b * 4, perWin: Math.round(b * 0.15), bonus: b * 3, contract: { spon: 2 }, pitch: 'Big signing check, small win bonuses.' };
      if (k === 1) return { id: id, name: sp.name, col: sp.col, sign: b * 2, perWin: Math.round(b * 0.3), bonus: b * 5, contract: { spon: 2, stars: Math.max(1, starsReq) }, pitch: 'Wants a car that looks the part. Pays well when it does.' };
      return { id: id, name: sp.name, col: sp.col, sign: b, perWin: Math.round(b * 0.5), bonus: b * 4, contract: { spon: 2, street: 2 }, pitch: 'Pays big for every win. Wants you racing on the street.' };
    });
  };
  G.signSponsor = function (si, offer) {
    var c = C();
    if (c.sponsor[si]) return false;
    c.sponsor[si] = { id: offer.id, sign: offer.sign, perWin: offer.perWin, bonus: offer.bonus, contract: offer.contract, spon: 0, street: 0, paid: false };
    G.earn(offer.sign); G.save();
    return true;
  };
  G.contractProgress = function (si) {
    var sp = C().sponsor[si];
    if (!sp) return { done: false, lines: [] };
    var k = sp.contract, lines = [], done = true;
    if (k.spon) { lines.push(['Sponsor races won', Math.min(sp.spon, k.spon) + '/' + k.spon, sp.spon >= k.spon]); done = done && sp.spon >= k.spon; }
    if (k.street) { lines.push(['Street races won', Math.min(sp.street, k.street) + '/' + k.street, sp.street >= k.street]); done = done && sp.street >= k.street; }
    if (k.stars) { var best = C().bestStars; lines.push(['Visual rating', DR.starText(Math.min(best, k.stars)) + ' / ' + DR.starText(k.stars), best >= k.stars]); done = done && best >= k.stars; }
    return { done: done, lines: lines };
  };
  // Keep the best visual rating reached (the looks sponsor checks it) and put
  // the car on a magazine cover the first time it reaches each star level.
  DR.COVER_BONUS = function (lvl) { return 100 * lvl; };
  var newCovers = [];
  G.noteStars = function () {
    var c = C(), inst = G.car(), cur = inst ? DR.starRating(inst) : 0, msgs = [];
    if (Math.floor(cur) > Math.floor(c.bestStars)) msgs.push('NEW STAR LEVEL: ' + Math.floor(cur) + ' STARS!');
    if (cur > c.bestStars) c.bestStars = cur;
    var covers = G.state.covers || (G.state.covers = []), have = {};
    covers.forEach(function (cv) { have[cv.lvl] = 1; });
    for (var l = 1; l <= Math.min(10, Math.floor(cur)); l++) {
      if (have[l]) continue;
      var cover = { lvl: l, bonus: DR.COVER_BONUS(l), inst: JSON.parse(JSON.stringify({ carId: inst.carId, engine: inst.engine, parts: inst.parts, vis: inst.vis, color: inst.color, stripe: inst.stripe, rim: inst.rim })) };
      covers.push(cover); newCovers.push(cover); G.earn(cover.bonus);
    }
    G.save();
    return msgs;
  };
  G.takeNewCovers = function () { var n = newCovers; newCovers = []; return n; };

  // ---------------------------------------------------------------- results
  function unlockText(u) {
    var p = u.split(':');
    if (p[0] === 'car') return 'New car at the dealer: ' + DR.CARS[p[1]].name;
    if (p[0] === 'perf') {
      if (p[1] === 'all') return 'All performance parts up to ' + DR.LEVEL_NAMES[+p[2]] + ' level';
      var g = DR.PART_GROUPS.filter(function (x) { return x.id === p[1]; })[0];
      return (g ? g.name : p[1]) + ' parts: ' + DR.LEVEL_NAMES[+p[2]] + ' level';
    }
    if (p[0] === 'vis') {
      var s = DR.visSlot(p[1]);
      return 'Body shop: ' + s.name + ' (tier ' + p[2] + ')';
    }
    return u;
  }
  DR.unlockText = unlockText;
  function apply(u) {
    var c = C(), p = u.split(':');
    if (p[0] === 'car') c.cars[p[1]] = 1;
    else if (p[0] === 'perf') {
      if (p[1] === 'all') DR.PART_GROUPS.forEach(function (g) { c.perf[g.id] = Math.max(c.perf[g.id] || 1, +p[2]); });
      else c.perf[p[1]] = Math.max(c.perf[p[1]] || 1, +p[2]);
    } else if (p[0] === 'vis') c.vis[p[1]] = Math.max(c.vis[p[1]] || 0, +p[2]);
  }
  // Called when an event is won (for a knockout: the final round).
  // Returns {cash, lines}.
  G.winEvent = function (ev) {
    var c = C(), st = DR.STAGES[ev.stage], first = !c.won[ev.id], lines = [], cash = first ? ev.cash : Math.round(ev.cash * 0.25);
    var sp = c.sponsor[ev.stage];
    var newlyVisible = [];
    if (first) {
      var before = st.all.filter(function (x) { return G.eventVisible(x) && !G.eventLock(x); }).map(function (x) { return x.id; });
      c.won[ev.id] = true;
      ev.unlocks.forEach(function (u) { apply(u); lines.push('UNLOCKED: ' + unlockText(u)); });
      if (sp) {
        if (ev.type === 'sponsor') sp.spon++;
        if (ev.type === 'street') sp.street++;
      }
      if (ev.type === 'boss') {
        if (ev.stage + 1 < DR.STAGES.length) {
          c.stage = Math.max(c.stage, ev.stage + 1);
          lines.push('STAGE ' + (ev.stage + 2) + ' UNLOCKED: ' + DR.STAGES[ev.stage + 1].name);
        } else lines.push('YOU ARE THE KING OF THE STRIP!');
      }
      st.all.forEach(function (x) { if (!c.won[x.id] && G.eventVisible(x) && !G.eventLock(x) && before.indexOf(x.id) < 0) newlyVisible.push(x); });
      if (newlyVisible.length) lines.push(newlyVisible.length + ' new race' + (newlyVisible.length > 1 ? 's' : '') + ' available');
    }
    if (sp) {
      cash += sp.perWin; lines.push(DR.sponsorById(sp.id).name + ' win bonus: ' + DR.money(sp.perWin));
      if (!sp.paid && G.contractProgress(ev.stage).done) { sp.paid = true; cash += sp.bonus; lines.push('CONTRACT FULFILLED! Bonus ' + DR.money(sp.bonus) + (ev.type === 'boss' ? '' : '. The boss will race you now.')); }
    }
    G.save();
    return { cash: cash, lines: lines, first: first };
  };
  // Stars can complete a contract too (checked when you come back to the menu).
  G.checkContracts = function () {
    var c = C(), msgs = [];
    for (var si in c.sponsor) {
      var sp = c.sponsor[si];
      if (!sp.paid && G.contractProgress(+si).done) { sp.paid = true; G.earn(sp.bonus); msgs.push(DR.sponsorById(sp.id).name + ' contract fulfilled! Bonus ' + DR.money(sp.bonus)); }
    }
    if (msgs.length) G.save();
    return msgs;
  };
  G.eventReward = function (ev) { return G.eventWon(ev) ? Math.round(ev.cash * 0.25) : ev.cash; };
})();
