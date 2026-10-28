// ===========================================================================
// CAREER — an Underground 2 style career for the drag strip.
//  * Six stages of events. Winning events pays out and unlocks parts
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
  DR.groupOf = function (cat) {
    for (var i = 0; i < DR.PART_GROUPS.length; i++) if (DR.PART_GROUPS[i].cats.indexOf(cat) >= 0) return DR.PART_GROUPS[i].unlock || DR.PART_GROUPS[i].id;
    return 'engine';
  };
  DR.LEVEL_NAMES = ['Stock', 'Street', 'Sport', 'Pro', 'Race', 'Pro Mod'];
  // every shop group starts at this level (cheap bolt-ons, a dry nitrous
  // kit, budget drag radials); the first league opens Street parts
  DR.BASE_PERF = 1;

  // ---------------------------------------------------------------- sponsors
  // contract: {spon: sponsor races to win, stars: rating to reach, street: street wins}
  var SPONSORS = [
    { id: 'junk', name: 'Junkyard Joe\'s', col: '#8b5a2b' }, { id: 'parts', name: 'Discount Auto Parts', col: '#d23a3a' }, { id: 'taco', name: 'Taco Shack', col: '#9ad600' },
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
    class:    { name: 'Class Race', dist: function () { return DR.QUARTER; }, theme: 'strip', grip: 1 },
    show:     { name: 'Car Show', dist: function () { return DR.QUARTER; }, theme: 'show', grip: 1 },
    showcase: { name: 'Night Invitational', dist: function () { return DR.QUARTER; }, theme: 'street', grip: 0.92 },
    boss:     { name: 'BOSS', dist: function () { return DR.QUARTER; }, theme: 'strip', grip: 1 }
  };
  // e(type, opponents, cash, unlocks, needWins, stars)
  function e(type, opps, cash, unlocks, needWins, stars) { return { type: type, opps: opps, cash: cash, unlocks: unlocks || [], needWins: needWins || 0, stars: stars || 0 }; }

  // a rival written out here (the first league's locals); the build comes from rivals.js
  function rk(name, carId, skill, color, over) { var o = { name: name, carId: carId, engine: DR.CARS[carId].engine, parts: {}, tune: {}, skill: skill, color: color }; for (var k in over) o[k] = over[k]; return o; }
  DR.STAGES = [
    { name: 'Backroad Beaters', blurb: 'Grocery-getters, beaters and whatever was in the driveway.', sponsors: ['junk', 'parts', 'taco'], base: 300,
      events: [
        e('quarter', [rk('Grandma Edna', 'beetle', 0.2, '#ff8fb8')], 300, ['perf:tires:2', 'vis:tint:1'], 0),
        e('eighth', [rk('Pizza Pete', 'pip', 0.25, '#ff6a00')], 300, ['perf:body:2', 'vis:tips:1'], 0),
        e('street', [rk('Cousin Ray', 'bolt', 0.35, '#3a7bd2')], 350, ['perf:susp:2'], 1),
        e('quarter', [rk('Coach Phil', 'ronin', 0.4, '#d23a3a')], 350, ['perf:engine:2', 'vis:vinyl:1'], 1),
        e('sponsor', [rk('Brenda', 'fox23', 0.4, '#2b3f8c')], 500, ['perf:drive:2'], 2),
        e('knockout', [rk('Skip', 'mira', 0.4, '#151515'), rk('Bubba', 'hauler', 0.45, '#2b4d2b'), rk('Lyle', 'monte', 0.45, '#2fb3a8')], 700, ['perf:power:2'], 3),
        e('eighth', [rk('Kenta', 'hachi', 0.45, '#f4f4f4')], 400, [], 3),
        e('showcase', [rk('Candy', 'camaro6', 0.45, '#ff8fb8', { vis: { tint: 1, vinyl: 1, tips: 1, rims: 'mesh' } })], 600, [], 4),
        e('sponsor', [rk('Old Earl', 'monte', 0.5, '#5a5a5a')], 600, [], 5),
        e('street', [rk('Rico', 'camaro6', 0.5, '#c0c4cc')], 500, [], 5)
      ],
      boss: e('boss', [rk('Big Lou', 'fox', 0.55, '#c01515', { vis: { tint: 1, vinyl: 1, tips: 1 }, stripe: '#ffffff' })], 2000, ['perf:all:2'], 6) },

    { name: 'Rookie Nights', blurb: 'Parking-lot heroes and Friday night grudge matches.', sponsors: ['nitro', 'torque', 'slick'], base: 600,
      events: [
        e('quarter', [rv(0, 0, { name: 'Ms. Patty' })], 450, ['perf:susp:3', 'vis:rims:1'], 0),
        e('eighth', [rv(0, 1)], 450, ['vis:fbumper:1'], 0),
        e('street', [rv(0, 2, { name: 'Jess' })], 550, ['perf:tires:3'], 1),
        e('quarter', [rv(0, 1, { name: 'Tony B', color: '#2fb3a8', skill: 0.5 })], 550, ['perf:engine:3', 'vis:rbumper:1'], 1),
        e('sponsor', [rv(0, 3)], 800, ['perf:drive:3', 'vis:finish:1'], 2),
        e('knockout', [rv(0, 0, { name: 'Patty' }), rv(0, 2, { name: 'Kat', color: '#ff2bd6' }), rv(0, 3)], 1100, ['perf:power:3', 'vis:skirt:1'], 3),
        e('eighth', [rv(0, 4)], 650, ['vis:spoiler:1'], 3),
        e('showcase', [rv(0, 3, { name: 'Neon Nina', color: '#ff2bd6', vis: { neon: '#ff2bd6', fbumper: 1, rims: 'mesh', tint: 1, vinyl: 1 } })], 900, ['vis:hood:1'], 4),
        e('sponsor', [rv(0, 4, { name: 'Mike' })], 900, ['perf:body:3'], 5),
        e('street', [rv(1, 0, { name: 'Dale' })], 750, [], 5)
      ],
      boss: e('boss', [rv(1, 0, { name: 'Dale "The Mullet" Rhodes', skill: 0.7, vis: { spoiler: 1, rims: 'pony', vinyl: 2, tips: 1 }, stripe: '#ffffff' })], 3500, ['perf:all:3'], 6) },

    { name: 'Bracket Bandits', blurb: 'Bolt-ons are not enough anymore. Real builds, real money.', sponsors: ['boost', 'redline', 'apex'], base: 1800,
      events: [
        e('quarter', [rv(1, 1)], 1400, ['perf:engine:4', 'vis:fbumper:2'], 0),
        e('street', [rv(1, 2)], 1500, ['vis:neon:2', 'vis:tint:2'], 0),
        e('eighth', [rv(1, 1, { name: 'Kenji' })], 1500, ['perf:tires:4', 'vis:rims:2'], 1),
        e('quarter', [rv(1, 3)], 1800, ['perf:power:4', 'vis:rbumper:2'], 1),
        e('sponsor', [rv(1, 2, { name: 'Rosa' })], 2400, ['perf:drive:4', 'vis:finish:2'], 2),
        e('knockout', [rv(1, 1, { name: 'Kenji' }), rv(1, 3, { name: 'Hiro' }), rv(1, 4)], 3200, ['perf:susp:4', 'vis:skirt:2'], 3),
        e('street', [rv(1, 4, { name: 'Earl' })], 2000, ['vis:spoiler:2', 'vis:roof:2'], 3),
        e('showcase', [rv(1, 3, { name: 'Chrome Carla', color: '#d0d0d0', vis: { fbumper: 2, rbumper: 2, skirt: 2, spoiler: 2, finish: 2, rims: 'split', neon: '#00e5ff', tint: 2 } })], 2800, ['vis:hood:2', 'vis:vinyl:2'], 4),
        e('sponsor', [rv(2, 0)], 2800, ['perf:body:4'], 5),
        e('eighth', [rv(2, 1)], 2200, [], 5)
      ],
      boss: e('boss', [rv(2, 2, { name: 'Lexi "Boost" Park', skill: 0.8, vis: { fbumper: 2, skirt: 2, spoiler: 2, vinyl: 2, rims: 'turbine', tint: 2, finish: 1 }, stripe: '#ff2bd6' })], 10000, ['perf:all:4'], 6) },

    { name: 'Street Outlaws', blurb: 'Big turbos, nitrous and no excuses. The cops are watching.', sponsors: ['volt', 'night', 'octane'], base: 5000,
      events: [
        e('street', [rv(2, 0)], 3800, ['perf:engine:5', 'vis:fbumper:3'], 0),
        e('quarter', [rv(2, 1)], 4000, ['perf:power:5', 'vis:rims:3'], 0),
        e('eighth', [rv(2, 3)], 4000, ['perf:tires:5', 'vis:rbumper:3'], 1),
        e('street', [rv(2, 4)], 4500, ['perf:drive:5', 'vis:finish:3'], 1),
        e('sponsor', [rv(3, 0)], 6000, ['vis:skirt:3'], 2),
        e('knockout', [rv(2, 3, { name: 'Marcus' }), rv(2, 4, { name: 'Tank' }), rv(3, 1)], 8000, ['perf:susp:5', 'vis:spoiler:3'], 3),
        e('quarter', [rv(3, 1, { name: 'Ricky' })], 5000, ['vis:hood:3'], 3),
        e('showcase', [rv(3, 0, { name: 'Akira', vis: { fbumper: 3, rbumper: 3, skirt: 3, spoiler: 3, hood: 3, rims: 'deep', tint: 2, finish: 3, vinyl: 3, neon: '#39ff14' } })], 7000, ['vis:vinyl:3'], 4),
        e('sponsor', [rv(3, 2)], 7000, ['perf:body:5'], 5),
        e('eighth', [rv(3, 1, { name: 'Ricky Radial' })], 5500, [], 5)
      ],
      boss: e('boss', [rv(3, 2, { name: 'Nitro Nate', skill: 0.85, vis: { hood: 2, vinyl: 3, rims: 'drag', skirt: 2, tips: 1 } })], 25000, ['perf:all:5'], 6) },

    { name: 'Radial Wars', blurb: 'Drag radials, transbrakes and four-digit horsepower.', sponsors: ['grip', 'pixel', 'hotrod'], base: 12000,
      events: [
        e('quarter', [rv(3, 3)], 9000, [], 0),
        e('street', [rv(3, 4)], 9500, [], 0),
        e('eighth', [rv(4, 0)], 10000, [], 1),
        e('quarter', [rv(4, 1)], 11000, [], 1),
        e('sponsor', [rv(4, 2)], 15000, [], 2),
        e('knockout', [rv(3, 4, { name: 'Murder Fox' }), rv(4, 0, { name: 'Gus' }), rv(4, 1, { name: 'Ken' })], 20000, [], 3),
        e('street', [rv(4, 3)], 12000, [], 3),
        e('showcase', [rv(4, 2, { name: 'Lisa', vis: { fbumper: 3, rbumper: 3, skirt: 3, spoiler: 3, hood: 3, rims: 'deep', tint: 2, finish: 2, vinyl: 2, neon: '#8a5cff', roof: 2 }, stripe: '#151515' })], 16000, [], 4),
        e('sponsor', [rv(4, 3, { name: 'Hank' })], 16000, [], 5),
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
  // ---------------------------------------------------------------- class races
  // Side races with a class rule, like real heads-up classes (X275, N/A,
  // small block): extra cash for a car built to the rule, never needed to
  // move on. They don't count toward the stage's wins or the boss.
  function adders(S) { return (S.fiType !== 'none' ? 1 : 0) + (S.nosHp ? 1 : 0); }
  var RADIAL_275 = { st_195: 1, st_225: 1, st_255: 1, st_305: 1, dr_245: 1, dr_275: 1 };
  DR.CLASSES = {
    four:    { name: 'Four-Banger', rule: '4 cylinders or fewer', ok: function (S) { return S.eng.cyl <= 4 && !S.eng.rotary; } },
    stock:   { name: 'Stock Motor', rule: 'Factory engine, no added turbo, blower or nitrous', ok: function (S) { return S.engId === S.car.engine && !S.nosHp && (S.eng.fi ? S.fiId === S.eng.fi.part : S.fiType === 'none'); } },
    na:      { name: 'All Motor', rule: 'No turbo, supercharger or nitrous', ok: function (S) { return !adders(S); } },
    street:  { name: 'Street Tire', rule: 'Street tires only: no drag radials or slicks', ok: function (S) { return S.tire.kind === 'Street'; } },
    radial:  { name: '275 Radial', rule: 'Tires no bigger than a 275 drag radial, one power adder', ok: function (S) { return RADIAL_275[S.tireId] && adders(S) <= 1; } },
    heavy:   { name: 'Heavyweight', rule: '1,600 kg (3,530 lb) or more as raced', ok: function (S) { return S.m >= 1600; } },
    import:  { name: 'Import', rule: 'JDM, Euro and compact cars', ok: function (S) { return ['JDM', 'Euro', 'Compact'].indexOf(S.car.cat) >= 0; } },
    small:   { name: 'Small Block', rule: 'Up to 6.2 L, one power adder', ok: function (S) { return S.eng.disp <= 6.2 && adders(S) <= 1; } },
    x275:    { name: 'X275', rule: '275 drag radial, one power adder, no wheelie bars', ok: function (S) { return RADIAL_275[S.tireId] && adders(S) <= 1 && !S.bar; } },
    light:   { name: 'Lightweight', rule: 'Under 1,150 kg (2,535 lb) as raced', ok: function (S) { return S.m < 1150; } },
    factory: { name: 'Factory Hot Rod', rule: 'The engine it came with (anything bolted to it)', ok: function (S) { return S.engId === S.car.engine; } }
  };
  DR.classIssue = function (cls, inst) { var K = DR.CLASSES[cls]; return !K || K.ok(DR.buildSpec(inst)) ? '' : 'Class: ' + K.rule.charAt(0).toLowerCase() + K.rule.slice(1); };
  function side(cls, needWins, cash, opp) { var ev = e('class', [opp], cash, [], needWins); ev.cls = cls; ev.side = true; return ev; }
  // a car show as a side event: place in the top `top` at that show
  function showEv(show, top, needWins, cash) { var ev = e('show', [], cash, [], needWins); ev.show = show; ev.top = top; ev.side = true; return ev; }
  var SHOW_SIDE = [showEv('meet', 3, 4, 500), showEv('meet', 1, 4, 900), showEv('regional', 3, 4, 2500), showEv('regional', 1, 4, 6000), showEv('expo', 3, 4, 14000), showEv('nationals', 3, 4, 35000)];
  var SIDE = [
    [side('four', 2, 600, rk('Tina "Twin Cam"', 'hachi', 0.45, '#ff8fb8')), side('stock', 5, 700, rk('Gus', 'monte', 0.45, '#8b5a2b'))],
    [side('na', 2, 1000, rk('Mo Torr', 'camaro', 0.55, '#151515')), side('street', 6, 1200, rk('Daily Dave', 'z35', 0.55, '#c0c4cc'))],
    [side('radial', 2, 3000, rk('Rad Riley', 'fox', 0.65, '#3a7bd2')), side('heavy', 6, 3500, rk('Big Bertha', 'monte', 0.65, '#5a5a5a'))],
    [side('import', 2, 7000, rk('Shin', 'supra', 0.75, '#f4f4f4')), side('small', 6, 8000, rk('Smokey', 'nova', 0.75, '#ff6a00'))],
    [side('x275', 2, 16000, rk('X-Ray', 'stang15', 0.82, '#2fb3a8')), side('na', 6, 18000, rk('Rat Motor Rick', 'chevelle', 0.82, '#2b4d2b'))],
    [side('light', 2, 38000, rk('Featherweight Fay', 'willys', 0.88, '#e31b6d')), side('factory', 6, 42000, rk('Hellraiser', 'hellcat', 0.88, '#c8102e'))]
  ];
  DR.STAGES.forEach(function (st, si) {
    st.events.forEach(function (ev, i) { ev.id = si + '.' + i; ev.stage = si; ev.idx = i; });
    st.side = (SIDE[si] || []).concat(SHOW_SIDE[si] ? [SHOW_SIDE[si]] : []);
    st.side.forEach(function (ev, i) { ev.id = si + '.s' + i; ev.stage = si; ev.idx = 's' + i; });
    st.boss.id = si + '.boss'; st.boss.stage = si; st.boss.idx = 'boss';
    st.all = st.events.concat(st.side, [st.boss]);
  });
  // Rival builds come from rivals.js (generated by building each rival's own
  // car up to the ET the ladder asks of that race); names, looks and cars
  // stay as written above.
  if (DR.RIVAL_SET) DR.STAGES.forEach(function (st) {
    st.all.forEach(function (ev) {
      var set = DR.RIVAL_SET[ev.id];
      if (set) ev.opps = ev.opps.map(function (o, i) { var g = set[i]; return g ? Object.assign({}, o, { carId: g.carId, engine: g.engine, parts: g.parts, tune: g.tune, skill: g.skill }) : o; });
    });
  });
  // Cars reach the dealer a few at a time, like Underground 2: the starters
  // from day one, the rest as rewards for particular races (event id ->
  // cars), so nobody can buy a Pro Mod before the career gets there,
  // however much money they have.
  DR.CAR_SCHEDULE = {
    '0.4': ['hauler'],
    '0.boss': ['fox', 'volta', 'cobaltss', 'camaro'],
    '1.2': ['kaze', 'silvia'], '1.4': ['z35', 'nova'], '1.6': ['m3', 'belair'], '1.8': ['s2k', 'vette5'],
    '1.boss': ['sti', 'evo', 'cobra03', 'camss'],
    '2.2': ['lightning', 'willys'], '2.4': ['rx7', 'gnx'], '2.6': ['stang15'], '2.8': ['chevelle', 'supra'],
    '2.boss': ['diesel', 'charger', 'r34'],
    '3.2': ['z06', 'cuda'], '3.5': ['hellcat'], '3.8': ['gtr'], '3.boss': ['viper'],
    '4.4': ['p911'], '4.boss': ['lambo'],
    '5.2': ['promod'], '5.5': ['rail']
  };
  DR.CAR_UNLOCK = {};   // car id -> event id ('' = from the start)
  DR.CAR_STAGE = {};    // car id -> stage it opens in
  Object.keys(DR.CARS).forEach(function (id) { DR.CAR_UNLOCK[id] = ''; DR.CAR_STAGE[id] = 0; });
  DR.STAGES.forEach(function (st) {
    st.all.forEach(function (ev) {
      (DR.CAR_SCHEDULE[ev.id] || []).forEach(function (id) { DR.CAR_UNLOCK[id] = ev.id; DR.CAR_STAGE[id] = ev.stage; ev.unlocks.push('car:' + id); });
    });
  });
  DR.carsAtStage = function (si) {
    return Object.keys(DR.CARS).filter(function (id) { return DR.CAR_STAGE[id] === si; }).sort(function (a, b) { return DR.CARS[a].price - DR.CARS[b].price; });
  };

  // ---------------------------------------------------------------- state
  G.careerDefaults = function () {
    return { stage: 0, won: {}, sponsor: {}, perf: { engine: DR.BASE_PERF, power: DR.BASE_PERF, drive: DR.BASE_PERF, susp: DR.BASE_PERF, tires: DR.BASE_PERF, body: DR.BASE_PERF }, vis: {}, cars: { hachi: 1 }, bestStars: 0, freeCars: 0, carTokens: 1 };
  };
  function C() { if (!G.state.career || G.state.career.perf == null) G.state.career = G.careerDefaults(); return G.state.career; }
  G.careerState = C;
  // Testing: open every stage, car, part level and body-kit tier, and top
  // up the bank. Career wins, sponsors and covers are left as they are.
  G.unlockAll = function () {
    var c = C();
    c.stage = DR.STAGES.length - 1;
    DR.PART_GROUPS.forEach(function (g) { c.perf[g.unlock || g.id] = 5; });
    DR.VISUAL.forEach(function (slot) { c.vis[slot.id] = 3; });
    Object.keys(DR.CARS).forEach(function (id) { c.cars[id] = 1; });
    G.state.money = Math.max(G.state.money, 5000000);
    G.save();
  };

  G.stageUnlocked = function (si) { return si <= C().stage; };
  G.stageWins = function (si) { var w = 0; DR.STAGES[si].events.forEach(function (ev) { if (C().won[ev.id]) w++; }); return w; };
  G.eventWon = function (ev) { return !!C().won[ev.id]; };
  // cars unlocked since you last looked at them in the dealer
  function seenCars() {
    var c = C();
    if (!c.seenCars) { c.seenCars = {}; Object.keys(DR.CARS).forEach(function (id) { if (G.carUnlocked(id)) c.seenCars[id] = 1; }); }
    return c.seenCars;
  }
  G.isNewCar = function (id) { return G.carUnlocked(id) && !seenCars()[id]; };
  G.markCarSeen = function (id) { var s = seenCars(); if (!s[id]) { s[id] = 1; G.save(); } };
  // Parts and body-shop items unlocked since you last opened their shop
  // section. A save that has never tracked this starts with everything seen.
  function seenParts() {
    var c = C();
    if (!c.seenPerf) { c.seenPerf = {}; DR.PART_GROUPS.forEach(function (g) { c.seenPerf[g.id] = c.perf[g.unlock || g.id] || 1; }); }
    if (!c.seenVis) { c.seenVis = {}; DR.VISUAL.forEach(function (v) { c.seenVis[v.id] = c.vis[v.id] || 0; }); }
    return c;
  }
  function shopGroupOf(cat) { for (var i = 0; i < DR.PART_GROUPS.length; i++) if (DR.PART_GROUPS[i].cats.indexOf(cat) >= 0) return DR.PART_GROUPS[i]; return null; }
  G.isNewPart = function (cat, lvl) { var g = shopGroupOf(cat); return !!g && lvl > 1 && G.partUnlocked(cat, lvl) && lvl > (seenParts().seenPerf[g.id] || 1); };
  G.groupHasNew = function (g) { return (C().perf[g.unlock || g.id] || 1) > (seenParts().seenPerf[g.id] || 1); };
  G.markGroupSeen = function (g) { var c = seenParts(), l = c.perf[g.unlock || g.id] || 1; if (c.seenPerf[g.id] !== l) { c.seenPerf[g.id] = l; G.save(); } };
  G.isNewVis = function (slot, tier) { return tier > 0 && G.visUnlocked(slot, tier) && tier > (seenParts().seenVis[slot] || 0); };
  G.visSlotHasNew = function (slot) { return (C().vis[slot] || 0) > (seenParts().seenVis[slot] || 0); };
  G.markVisSeen = function (slot) { var c = seenParts(), t = c.vis[slot] || 0; if (c.seenVis[slot] !== t) { c.seenVis[slot] = t; G.save(); } };
  G.newPartsCount = function () { return DR.PART_GROUPS.filter(G.groupHasNew).length; };
  G.newVisCount = function () { return DR.VISUAL.filter(function (v) { return G.visSlotHasNew(v.id); }).length; };
  G.newCarCount = function (cat) { return Object.keys(DR.CARS).filter(function (id) { return (!cat || DR.CARS[id].cat === cat) && G.isNewCar(id); }).length; };
  G.carUnlocked = function (carId) { return !!C().cars[carId] || DR.CAR_UNLOCK[carId] === ''; };
  G.partUnlocked = function (cat, lvl) {
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
  // Tech inspection, NHRA style, at the strip (street races have none): a
  // car that runs quicker than 11.50 needs a roll bar, quicker than 10.00 a
  // cage; an open car needs the roll bar from 13.50. Judged on the car's
  // estimated or best quarter, whichever is quicker.
  DR.TECH = [[10.0, 2, 'a roll cage'], [11.5, 1, 'a roll bar']];
  G.techIssue = function (inst, ev) {
    if (DR.EVENT_TYPES[ev.type].theme !== 'strip') return '';
    var S = G.spec(inst), q = Math.min(G.estimate(inst).et, inst.best && inst.best.q || 99);
    var open = DR.CARS[inst.carId].body === 'roadster', need = 0, what = '', line = 0;
    DR.TECH.forEach(function (t) { if (!need && q < t[0]) { need = t[1]; what = t[2]; line = t[0]; } });
    if (!need && open && q < 13.5) { need = 1; what = 'a roll bar'; line = 13.5; }
    // and a parachute over 150 mph (NHRA)
    var trap = Math.max(G.estimate(inst).trap || 0, inst.best && inst.best.qt || 0);
    if (S.tech >= need && trap >= 150 && !S.chute) return 'Tech: cars that trap over 150 mph need a parachute (Weight & Safety: Safety Equipment)';
    if (S.tech >= need) return '';
    return 'Tech: ' + (open && line === 13.5 ? 'open cars' : 'cars') + ' quicker than ' + line.toFixed(2) + ' need ' + what + ' (Suspension: Chassis)';
  };
  // Anything about this car that keeps it out of the event ('' = good to go).
  G.carIssue = function (inst, ev) { return ev.type === 'show' ? DR.showIssue(ev, inst) : (ev.cls && DR.classIssue(ev.cls, inst)) || G.techIssue(inst, ev); };
  DR.showIssue = function (ev, inst) {
    var sh = DR.showById(ev.show);
    if (DR.starRating(inst) < sh.minStars) return 'Needs a ' + sh.minStars + '-star car (yours: ' + (Math.floor(DR.starRating(inst) * 10) / 10) + ')';
    if (inst.damage) return 'Fix your car first: broken cars stay home';
    return '';
  };
  DR.showGoal = function (ev) { return ev.top === 1 ? 'Win the ' + DR.showById(ev.show).name : 'Place top ' + ev.top + ' at the ' + DR.showById(ev.show).name; };
  G.eventVisible = function (ev) { return ev.stage <= C().stage && (G.stageWins(ev.stage) >= ev.needWins - 1 || ev.type === 'boss'); };

  // ---------------------------------------------------------------- sponsors
  DR.sponsorById = function (id) { for (var i = 0; i < SPONSORS.length; i++) if (SPONSORS[i].id === id) return SPONSORS[i]; return SPONSORS[0]; };
  // Three offers per stage with different trade-offs.
  G.sponsorOffers = function (si) {
    var st = DR.STAGES[si], b = st.base, starsReq = [0, 0, 1.5, 3, 5, 7][si];
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
  // ---------------------------------------------------------------- sponsor cars
  // The free car comes from a short list: cars already at the dealer up to
  // a price that grows stage by stage, never the Pro race cars.
  DR.SPONSOR_CAR_CAP = [9000, 15000, 32000, 60000, 110000, 150000];
  G.freeCars = function () { return C().freeCars || 0; };
  // A fulfilled contract pays its bonus and, like Underground 2, opens a
  // garage slot with a car on the sponsor (picked at the dealer; an
  // unclaimed one carries over).
  function fulfil(sp) { sp.paid = true; C().freeCars = (C().freeCars || 0) + 1; }
  G.contractsDone = function () { var c = C(), n = 0; for (var k in c.sponsor) if (c.sponsor[k].paid) n++; return n; };
  G.sponsorCarOk = function (carId) {
    var car = DR.CARS[carId];
    return car.cat !== 'Pro' && G.carUnlocked(carId) && car.price <= DR.SPONSOR_CAR_CAP[Math.min(C().stage, DR.SPONSOR_CAR_CAP.length - 1)];
  };
  G.claimFreeCar = function (carId) {
    var c = C();
    if (!c.freeCars || !G.slotFree() || !G.sponsorCarOk(carId)) return false;
    c.freeCars--;
    var inst = G.newInst(carId);
    inst.spent = 0;   // the sponsor paid: it sells for its parts only
    G.state.cars.push(inst); G.state.active = inst.uid; G.save();
    return inst;
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
    if (p[0] === 'cars') {
      var ids = DR.carsAtStage(+p[1]), names = ids.slice(-3).reverse().map(function (id) { return DR.CARS[id].name; });
      return ids.length + ' new cars at the dealer: ' + names.join(', ') + (ids.length > 3 ? ' and ' + (ids.length - 3) + ' more' : '');
    }
    if (p[0] === 'perf') {
      if (p[1] === 'all') return 'All performance parts up to ' + DR.LEVEL_NAMES[+p[2]] + ' level';
      return (DR.UNLOCK_NAMES[p[1]] || p[1]) + ' parts: ' + DR.LEVEL_NAMES[+p[2]] + ' level';
    }
    if (p[0] === 'vis') {
      var s = DR.visSlot(p[1]);
      return 'Body shop: ' + s.name + ' (tier ' + p[2] + ')';
    }
    return u;
  }
  DR.unlockText = unlockText;
  // The short form for the time slip: { kind: parts|body|car, text }.
  DR.unlockChip = function (u) {
    var p = u.split(':');
    if (p[0] === 'car') return { kind: 'car', text: DR.CARS[p[1]].name };
    if (p[0] === 'perf') return { kind: 'parts', text: (p[1] === 'all' ? 'All parts' : DR.UNLOCK_NAMES[p[1]] || p[1]) + ' → ' + DR.LEVEL_NAMES[+p[2]] };
    if (p[0] === 'vis') return { kind: 'body', text: DR.visSlot(p[1]).name + (+p[2] > 1 ? ' ' + ['', 'I', 'II', 'III'][+p[2]] : '') };
    return { kind: 'parts', text: unlockText(u) };
  };
  function apply(u) {
    var c = C(), p = u.split(':');
    if (p[0] === 'car') c.cars[p[1]] = 1;
    else if (p[0] === 'perf') {
      if (p[1] === 'all') DR.PART_GROUPS.forEach(function (g) { var u = g.unlock || g.id; c.perf[u] = Math.max(c.perf[u] || 1, +p[2]); });
      else c.perf[p[1]] = Math.max(c.perf[p[1]] || 1, +p[2]);
    } else if (p[0] === 'vis') c.vis[p[1]] = Math.max(c.vis[p[1]] || 0, +p[2]);
  }
  // Saves made under an older unlock schedule: give back every unlock the
  // races already won earn now (never takes anything away).
  G.syncUnlocks = function () {
    var c = C();
    // saves from before sponsor cars: one owed per sponsor not yet used on a car
    // saves from before free cars came with fulfilled contracts (not signing)
    if (!c.carTokens) { c.carTokens = 1; c.freeCars = Math.max(0, G.contractsDone() - Math.max(0, (G.state.cars || []).length - 1)); }
    Object.keys(c.perf).forEach(function (k) { c.perf[k] = Math.max(c.perf[k] || 1, DR.BASE_PERF); });
    DR.STAGES.forEach(function (st) { st.all.forEach(function (ev) { if (c.won[ev.id]) ev.unlocks.forEach(apply); }); });
  };
  // a rival's name short enough for a lock tag ('Tony B', 'Rin', 'Mike')
  function shortName(name) {
    var nm = name.replace(/ ".*"/, '').split(' ');
    // three words or an alliterative nickname ('Mullet Mike'): the last word
    if (nm.length > 2 || (nm.length === 2 && nm[0][0] === nm[1][0])) return nm[nm.length - 1];
    return nm.length > 1 && nm[1].length <= 2 ? nm[0] + ' ' + nm[1] : nm[0];
  }
  // Where a part level opens: the first career race whose win unlocks it
  // ('Beat Tony B', 'S2 boss'), for the shop's lock tags.
  G.unlockWhere = function (cat, lvl) {
    var grp = DR.groupOf(cat);
    for (var si = 0; si < DR.STAGES.length; si++) {
      var evs = DR.STAGES[si].events.slice().sort(function (a, b) { return a.needWins - b.needWins || a.idx - b.idx; }).concat([DR.STAGES[si].boss]);
      for (var i = 0; i < evs.length; i++) {
        var hit = evs[i].unlocks.some(function (u) { var p = u.split(':'); return p[0] === 'perf' && (p[1] === grp || p[1] === 'all') && +p[2] >= lvl; });
        if (hit) {
          if (evs[i].type === 'boss') return 'S' + (si + 1) + ' boss';
          return 'Beat ' + shortName(evs[i].opps[evs[i].opps.length - 1].name);
        }
      }
    }
    return 'Locked';
  };
  // Where a car opens, for the dealer's lock tag ('Beat Kenji', 'S3 boss').
  G.carUnlockWhere = function (carId) {
    var id = DR.CAR_UNLOCK[carId];
    if (!id) return '';
    var p = id.split('.'), st = DR.STAGES[+p[0]], ev = p[1] === 'boss' ? st.boss : st.events[+p[1]];
    if (ev.type === 'boss') return 'S' + (+p[0] + 1) + ' boss';
    return 'S' + (+p[0] + 1) + ': beat ' + shortName(ev.opps[ev.opps.length - 1].name);
  };
  // Called when an event is won (for a knockout: the final round).
  // Returns {cash, lines}.
  G.winEvent = function (ev) {
    var c = C(), st = DR.STAGES[ev.stage], first = !c.won[ev.id], lines = [], cash = first ? ev.cash : Math.round(ev.cash * 0.35);
    var out = { purse: cash, unlocks: first ? ev.unlocks.slice() : [], money: [], banner: '', newRaces: 0 };
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
          out.banner = 'Stage ' + (ev.stage + 2) + ' unlocked: ' + DR.STAGES[ev.stage + 1].name;
        } else { lines.push('YOU ARE THE KING OF THE STRIP!'); out.banner = 'You are the King of the Strip!'; }
      }
      st.all.forEach(function (x) { if (!c.won[x.id] && G.eventVisible(x) && !G.eventLock(x) && before.indexOf(x.id) < 0) newlyVisible.push(x); });
      if (newlyVisible.length) lines.push(newlyVisible.length + ' new race' + (newlyVisible.length > 1 ? 's' : '') + ' available');
      out.newRaces = newlyVisible.length;
    }
    if (sp) {
      var spName = DR.sponsorById(sp.id).name;
      cash += sp.perWin; lines.push(spName + ' win bonus: ' + DR.money(sp.perWin)); out.money.push([spName, sp.perWin]);
      if (!sp.paid && G.contractProgress(ev.stage).done) {
        fulfil(sp); cash += sp.bonus; lines.push('CONTRACT FULFILLED! Bonus ' + DR.money(sp.bonus) + ' and a free car' + (ev.type === 'boss' ? '' : '. The boss will race you now.'));
        out.money.push(['Contract bonus', sp.bonus]); out.contract = ev.type === 'boss' ? 'Contract fulfilled: a free car is waiting at the dealer!' : 'Contract fulfilled: a free car is waiting at the dealer, and the boss will race you now.';
      }
    }
    G.save();
    out.cash = cash; out.lines = lines; out.first = first;
    return out;
  };
  // Stars can complete a contract too (checked when you come back to the menu).
  G.checkContracts = function () {
    var c = C(), msgs = [];
    for (var si in c.sponsor) {
      var sp = c.sponsor[si];
      if (!sp.paid && G.contractProgress(+si).done) { fulfil(sp); G.earn(sp.bonus); msgs.push(DR.sponsorById(sp.id).name + ' contract fulfilled! Bonus ' + DR.money(sp.bonus) + ' and a free car at the dealer'); }
    }
    if (msgs.length) G.save();
    return msgs;
  };
  // Style pays: the crowd and the magazines follow a good-looking car, so a
  // career win pays 3% more per star of visual rating (up to +30%).
  DR.STYLE_PER_STAR = 0.03;
  G.styleBonus = function (purse) { var inst = G.car(); return inst ? Math.round(purse * DR.STYLE_PER_STAR * DR.starRating(inst) / 10) * 10 : 0; };
  G.eventReward = function (ev) { return G.eventWon(ev) ? Math.round(ev.cash * 0.35) : ev.cash; };
})();
