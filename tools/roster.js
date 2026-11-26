// Generates www/js/roster.js: each drag class's regulars (the racers who
// fill the career's event fields) with their car built for each of the
// class's five sections, and the five King-ladder rivals.
//
// Each regular takes one of the game's hand-tuned rival builds (or a shop
// package) as the parts list for their car and builds it up from stock,
// part by part (an engine swap, a turbo or a shot size at a time, the boost
// psi by psi), only as far as each section asks: so they upgrade over the
// season, like real racers.
//
//   node tools/roster.js            all classes (one process per class;
//                                   ROSTER_CACHE=dir keeps each regular as
//                                   it's done, so a stopped run resumes)
//   node tools/roster.js --class 2  one class, printed as JSON (internal)
const path = require('path'), fs = require('fs'), cp = require('child_process');
const W = path.join(__dirname, '..', 'www', 'js');

// Top-of-field 1/4-mile ET (prepped strip, G.estimate) for each section,
// the King-ladder rungs (#5 to #1) and the field's spread (the slowest
// regular, as a share slower than the quickest).
const TARGETS = [
  { sec: [16.3, 15.8, 15.3, 14.9, 14.6], rungs: [14.55, 14.45, 14.35, 14.2, 14.1], spread: 0.10 },
  { sec: [13.6, 13.35, 13.1, 12.9, 12.75], rungs: [12.75, 12.68, 12.62, 12.56, 12.5], spread: 0.08 },
  { sec: [12.1, 11.7, 11.3, 10.95, 10.7], rungs: [10.65, 10.55, 10.45, 10.38, 10.3], spread: 0.08 },
  { sec: [10.0, 9.75, 9.5, 9.3, 9.15], rungs: [9.12, 9.08, 9.04, 9.0, 8.96], spread: 0.07 },
  { sec: [8.8, 8.4, 8.0, 7.7, 7.5], rungs: [7.45, 7.4, 7.35, 7.3, 7.27], spread: 0.07 },
  { sec: [7.1, 7.0, 6.92, 6.85, 6.8], rungs: [6.8, 6.78, 6.76, 6.74, 6.72], spread: 0.05 }
];
const N_REG = 20;          // regulars per class
const SKILL = [[0.3, 0.55], [0.45, 0.7], [0.55, 0.8], [0.65, 0.85], [0.75, 0.9], [0.82, 0.95]];
const NEW_NAMES = ['Wes', 'Darla', 'Hoss', 'Lupe', 'Cody', 'Marisol', 'Buck', 'Tamika', 'Jojo', 'Rusty', 'Nadia', 'Otis', 'Kendra', 'Bo', 'Priya', 'Clint',
  'Yolanda', 'Dewey', 'Mei', 'Tex', 'Ramona', 'Gil', 'Shay', 'Hector', 'Bonnie', 'Deacon', 'Imani', 'Lonnie', 'Ruth', 'Sal', 'Tasha', 'Vern', 'Ximena', 'Abe',
  'Cora', 'Duane', 'Esme', 'Flint', 'Gina', 'Hal', 'Ines', 'Jasper', 'Lenny', 'Mona', 'Ned', 'Opal', 'Quinn', 'Reba', 'Stu', 'Trina', 'Ulysses',
  'Val', 'Wade', 'Yuki', 'Zeke', 'Amos', 'Bree', 'Cash', 'Dot', 'Ezra', 'Ivy', 'Jett', 'Kirby', 'Lola', 'Mack', 'Nell', 'Orrin',
  'Paz', 'Raul', 'Skeeter', 'Tuck', 'Una', 'Viv', 'Wanda', 'Xavi', 'Yvette', 'Zora', 'Arlo', 'Bix', 'Cleo', 'Elroy', 'Frankie', 'Gabe', 'Hattie',
  'Ike', 'June', 'Knox', 'Lacey', 'Moe', 'Nash', 'Oz', 'Pearl', 'Rocco', 'Sunny', 'Tito', 'Waylon', 'Ace', 'Birdie', 'Chet', 'Dolly', 'Emmett',
  'Fern', 'Gordo', 'Huck', 'Iggy', 'Jolene', 'Kip', 'Lefty', 'Maddie', 'Nico', 'Odie', 'Roxy', 'Sly', 'Toby', 'Vonda', 'Woody'];

function boot() {
  global.window = global;
  ['data.js', 'parts.js', 'physics.js', 'game.js', 'rivals.js', 'career.js', 'season.js'].forEach(function (f) { require(path.join(W, f)); });
  const DR = globalThis.DR; DR.Game.state = DR.Game.defaults();
  return DR;
}

// ---------------------------------------------------------------- one class
function buildClass(ci) {
  const DR = boot(), G = DR.Game;
  function ET(o) { const e = G.estimate(G.oppInst(o), DR.QUARTER).et; return e > 90 ? 99 : e; }
  // every hand-tuned rival build in the game: the templates
  const seen = {}, pool = [];
  function add(o, cls) { const k = JSON.stringify([o.carId, o.engine, o.parts, o.tune]); if (seen[k]) return; seen[k] = 1; pool.push({ carId: o.carId, engine: o.engine, parts: o.parts || {}, tune: o.tune || {}, skill: o.skill, cls: cls, et: ET(o) }); }
  DR.STAGES.forEach(function (st, si) { st.all.concat(st.ladder || []).forEach(function (ev) { (ev.opps || []).forEach(function (o) { add(o, si); }); }); });
  DR.RIVALS.forEach(function (b, bi) { b.forEach(function (o) { add(o, bi); }); });
  // and the shop's full-car packages on every car (its own engine), so any
  // car can be someone's car
  Object.keys(DR.CARS).forEach(function (id) {
    const car = DR.CARS[id], o = { carId: id, engine: car.engine, parts: {}, tune: {} };
    for (let t = 0; t < 4; t++) { const pl = DR.packagePlan(G.oppInst(o), DR.PKG_ORDER, t, true); add({ carId: id, engine: pl.after.engine, parts: pl.after.parts, tune: pl.after.tune, skill: 0.6 }, DR.CAR_STAGE[id]); }
  });
  const T = TARGETS[ci], used = {}, baseMemo = {};
  // the car as the regular bought it: stock
  function baseET(p) { const k = p.carId; if (baseMemo[k] == null) baseMemo[k] = ET({ carId: p.carId, engine: DR.CARS[p.carId].engine, parts: {}, tune: {} }); return baseMemo[k]; }
  // a template (a parts list) that can reach the late-season target, on a
  // car slow enough bare to start the class with; a car this class hasn't
  // used yet if there is one, then the nearest class, then the nearest time
  function template(late, early) {
    // cars open by the class after this one (a Pro race car only at the top)
    const era = function (p) { return DR.CAR_STAGE[p.carId] <= ci + 1 && (DR.CARS[p.carId].cat !== 'Pro' || ci >= 4); };
    let list = pool.filter(function (p) { return era(p) && p.et <= late && baseET(p) >= early * 0.97; });
    if (!list.length) list = pool.filter(function (p) { return era(p) && p.et <= late && baseET(p) >= early * 0.9; });
    if (!list.length) list = pool.filter(function (p) { return era(p) && p.et <= late; }).sort(function (a, b) { return baseET(b) - baseET(a); }).slice(0, 4);
    if (!list.length) list = pool.filter(function (p) { return p.et <= late; }).sort(function (a, b) { return b.et - a.et; }).slice(0, 3);
    list.sort(function (a, b) { return (used[a.carId] || 0) - (used[b.carId] || 0) || Math.abs(a.cls - ci) - Math.abs(b.cls - ci) || (late - a.et) - (late - b.et); });
    const p = list[0]; used[p.carId] = (used[p.carId] || 0) + 1;
    return p;
  }
  function price(o, cat, id) { const opt = DR.getOption(cat, G.oppInst(o), id); return opt && opt.price || 100; }
  // the options of a category in order (stock first) for this car as it is
  function optIds(o, cat) { const l = DR.partOptions ? DR.partOptions(cat, G.oppInst(o)) : null; return l ? l.map(function (x) { return x.id; }) : null; }
  // build up from the bare car toward the template: the engine swap (if
  // the template has one), then part by part (a category's options one
  // size at a time: a smaller turbo or shot before the big one) and the
  // boost a psi at a time; each step the change landing nearest the target
  // (short of it counts a bit worse than past it), else (a part that only
  // pays off with another) the cheapest one left. Past the target with
  // boost to spare: back the boost off toward it.
  function upTo(cur, tpl, target) {
    let e = ET(cur), best = { o: cur, e: e };
    for (let n = 0; n < 80 && e > target; n++) {
      const cands = [];
      if (cur.engine !== tpl.engine) {
        const c = JSON.parse(JSON.stringify(cur)); c.engine = tpl.engine;
        // parts that don't exist for the new engine go back to stock
        Object.keys(c.parts).forEach(function (cat) { const o = DR.getOption(cat, G.oppInst(c), c.parts[cat]); if (!o || o.id !== c.parts[cat]) delete c.parts[cat]; });
        cands.push({ o: c, cost: (DR.ENGINES[tpl.engine] || {}).price || 8000 });
      }
      Object.keys(tpl.parts).forEach(function (cat) {
        if (cur.parts[cat] === tpl.parts[cat]) return;
        const want = DR.getOption(cat, G.oppInst(cur), tpl.parts[cat]);
        if (!want || want.id !== tpl.parts[cat]) return;          // not with this engine (yet)
        const ids = optIds(cur, cat), at = ids ? ids.indexOf(cur.parts[cat] || ids[0]) : -1, to = ids ? ids.indexOf(tpl.parts[cat]) : -1;
        const steps = [tpl.parts[cat]];
        if (ids && at >= 0 && to > at + 1) steps.unshift(ids[at + 1]);
        steps.forEach(function (id) {
          const c = JSON.parse(JSON.stringify(cur)); c.parts[cat] = id;
          if (cat === 'fi' && tpl.tune.boost && !cur.parts.fi) c.tune.boost = Math.min(tpl.tune.boost, 5);
          cands.push({ o: c, cost: price(c, cat, id) });
        });
      });
      if (cur.parts.fi && tpl.tune.boost && (cur.tune.boost || 0) < tpl.tune.boost) { const c = JSON.parse(JSON.stringify(cur)); c.tune.boost = Math.min(tpl.tune.boost, (cur.tune.boost || 5) + 1); cands.push({ o: c, cost: 80 }); }
      if (!cands.length) break;
      cands.forEach(function (c) { c.e = ET(c.o); });
      const better = cands.filter(function (c) { return c.e < e - 0.003 && c.e < 90; });
      const miss = function (c) { return c.e <= target ? target - c.e : (c.e - target) * 1.5; };
      better.sort(function (a, b) { return miss(a) - miss(b) || a.cost - b.cost; });
      // nothing better alone: the engine swap if it's still to come (its
      // parts wait on it), else the cheapest part left (one that pays off
      // with another)
      const swap = cands.filter(function (c) { return c.o.engine !== cur.engine; })[0];
      const pick = better[0] || swap || cands.slice().sort(function (a, b) { return a.cost - b.cost; })[0];
      cur = pick.o; e = pick.e > 90 ? ET(cur) : pick.e;
      if (e < best.e) best = { o: cur, e: e };
    }
    // never slower than the best on the way there (a part that only hurt)
    if (e > best.e + 0.005) { cur = best.o; e = best.e; }
    // well past it on boost: back off toward the target (staying under it)
    while (cur.parts.fi && cur.tune.boost > 5 && e < target * 0.985) {
      const c = JSON.parse(JSON.stringify(cur)); c.tune.boost -= 1; const e2 = ET(c);
      if (e2 > target || e2 >= 90) break;
      cur = c; e = e2;
    }
    return { o: cur, e: e };
  }
  // a cache of the regulars done so far (ROSTER_CACHE=dir): a run that's
  // stopped picks up where it was
  const cacheFile = process.env.ROSTER_CACHE ? path.join(process.env.ROSTER_CACHE, 'class' + ci + '.jsonl') : null;
  const cached = cacheFile && fs.existsSync(cacheFile) ? fs.readFileSync(cacheFile, 'utf8').split('\n').filter(Boolean).map(function (l) { return JSON.parse(l); }) : [];
  const regs = [];
  for (let r = 0; r < N_REG; r++) {
    if (r < cached.length) { regs.push(cached[r]); used[cached[r].carId] = (used[cached[r].carId] || 0) + 1; continue; }
    const k = 1 + T.spread * r / (N_REG - 1);
    const t4 = T.sec[4] * k, rung = r < 5 ? T.rungs[4 - r] : null;
    const tpl = template(rung != null ? Math.min(rung, t4) : t4, T.sec[0] * k);
    const tune0 = JSON.parse(JSON.stringify(tpl.tune || {})); delete tune0.boost;
    // the car as they bought it: its own engine (a swap comes later, if the
    // template has one), the template's tune settings, no parts
    let cur = { carId: tpl.carId, engine: DR.CARS[tpl.carId].engine, parts: {}, tune: tune0 };
    const builds = [], et = [];
    for (let s = 0; s < 5; s++) { const d = upTo(cur, tpl, T.sec[s] * k); cur = d.o; builds[s] = { engine: cur.engine, parts: JSON.parse(JSON.stringify(cur.parts)), tune: JSON.parse(JSON.stringify(cur.tune)) }; et[s] = +d.e.toFixed(2); }
    let rb = null;
    if (rung != null) { const d = upTo(cur, tpl, rung); rb = { engine: d.o.engine, parts: d.o.parts, tune: d.o.tune, et: +d.e.toFixed(2) }; }
    const sk = SKILL[ci];
    regs.push({ carId: tpl.carId, skill: +(sk[0] + (sk[1] - sk[0]) * (1 - r / (N_REG - 1))).toFixed(2), b: builds, et: et, rung: rb });
    if (cacheFile) fs.appendFileSync(cacheFile, JSON.stringify(regs[regs.length - 1]) + '\n');
    process.stderr.write('class ' + (ci + 1) + ' regular ' + (r + 1) + ': ' + tpl.carId + ' ' + et.join(' ') + (rb ? ' rung ' + rb.et : '') + ' (targets ' + T.sec.map(function (x) { return (x * k).toFixed(2); }).join(' ') + ')\n');
  }
  return regs;
}

// ---------------------------------------------------------------- names
// The class's own rivals from before keep their names (the faces a
// returning player knows), spread over the regulars by pace (the early,
// slow ones on slow cars, the late ones on quick cars), on their old car
// where a regular nearby has it; then new faces. No name twice in the game;
// the Kings keep theirs.
function name(DR, classes) {
  const taken = {};
  DR.STAGES.forEach(function (st) { taken[st.boss.opps[0].name] = 1; });
  let ni = 0;
  function fresh() { while (taken[NEW_NAMES[ni]]) ni++; const n = NEW_NAMES[ni++]; taken[n] = 1; return n; }
  // a short name the old career used for someone with a longer one ('Lisa'
  // for 'Lisa Lightning', 'Nick' for 'Nitrous Nick', 'Dale' for the King)
  // would now be a second person: those go
  const all = {};
  DR.STAGES.forEach(function (st) { (st.oldEvents || st.events).concat(st.side || [], [st.boss]).forEach(function (ev) { (ev.opps || []).forEach(function (o) { all[o.name] = 1; }); }); });
  const words = function (n) { return n.replace(/"[^"]*"/g, ' ').toLowerCase().split(/\s+/).filter(Boolean); };
  const short = function (n) { const w = words(n); return Object.keys(all).some(function (m) { if (m === n) return false; const mw = words(m); return mw.length > w.length && w.every(function (x) { return mw.indexOf(x) >= 0; }); }); };
  return classes.map(function (regs, ci) {
    const st = DR.STAGES[ci], old = [], seenN = {};
    (st.oldEvents || st.events).concat(st.side || []).forEach(function (ev) { (ev.opps || []).forEach(function (o) { if (!seenN[o.name] && !taken[o.name] && !short(o.name)) { seenN[o.name] = 1; old.push({ name: o.name, carId: o.carId }); } }); });
    // the old names in race order (slow to quick) spread over the regulars
    // slowest to quickest; a regular within three places with that rival's
    // old car takes it first
    const n = regs.length, names = [], rank = function (i) { return n - 1 - i; };   // 0 = slowest
    old.forEach(function (x, k) {
      const want = old.length > 1 ? Math.round(k * (n - 1) / (old.length - 1)) : 0;
      let best = -1;
      for (let d = 0; d <= 3 && best < 0; d++) [want - d, want + d].forEach(function (rk) { const i = n - 1 - rk; if (best < 0 && rk >= 0 && rk < n && !names[i] && regs[i].carId === x.carId) best = i; });
      for (let d = 0; best < 0 && d < n; d++) [want - d, want + d].forEach(function (rk) { const i = n - 1 - rk; if (best < 0 && rk >= 0 && rk < n && !names[i]) best = i; });
      if (best >= 0) { names[best] = x.name; taken[x.name] = 1; }
    });
    regs.forEach(function (r, i) { if (!names[i]) names[i] = fresh(); });
    return regs.map(function (r, i) { const o = Object.assign({}, r); o.name = names[i]; return Object.assign({ name: o.name }, o); });
  });
}
function header() {
  return '// Generated by tools/roster.js: each drag class\'s regulars, their car\n' +
    '// built for each of the five sections (b[0]..b[4]) and, for the five\n' +
    '// quickest, their King-ladder build (rung). et: their 1/4 (prepped strip).\n';
}

// ---------------------------------------------------------------- all
if (process.argv[2] === '--rename') {
  // names again, on the roster as it is (no rebuilding)
  const DR = boot(); global.DR = DR;
  require(path.join(W, 'roster.js'));
  const out = name(DR, DR.ROSTER.map(function (regs) { return regs.map(function (r) { const o = Object.assign({}, r); delete o.name; return o; }); }));
  fs.writeFileSync(path.join(W, 'roster.js'), header() + 'DR.ROSTER = ' + JSON.stringify(out) + ';\n');
  console.log('renamed: ' + out.map(function (c) { return c.slice(0, 3).map(function (r) { return r.name + ' (' + r.carId + ')'; }).join(', '); }).join(' | '));
} else if (process.argv[2] === '--class') {
  process.stdout.write(JSON.stringify(buildClass(+process.argv[3])));
} else {
  const DR = boot();
  const oldNames = DR.STAGES.map(function (st) { return Array.from(new Set(st.all.concat(st.ladder || []).flatMap(function (ev) { return (ev.opps || []).map(function (o) { return o.name; }); }))); });
  const jobs = TARGETS.map(function (t, ci) {
    return new Promise(function (res, rej) {
      const ch = cp.spawn(process.execPath, [__filename, '--class', String(ci)], { stdio: ['ignore', 'pipe', 'inherit'] });
      let out = ''; ch.stdout.on('data', function (d) { out += d; });
      ch.on('close', function (code) { if (code) rej(new Error('class ' + ci + ' failed')); else res(JSON.parse(out)); });
    });
  });
  Promise.all(jobs).then(function (classes) {
    const out = name(DR, classes.map(function (regs, ci) { return regs.map(function (r, i) { return Object.assign({ color: DR.PAINTS[(ci * 7 + i * 5) % DR.PAINTS.length], street: i % 5 === 1 || i % 5 === 3 }, r); }); }));
    const js = header() + 'DR.ROSTER = ' + JSON.stringify(out) + ';\n';
    fs.writeFileSync(path.join(W, 'roster.js'), js);
    console.log('wrote www/js/roster.js: ' + out.map(function (c) { return c.length; }).join(' + ') + ' regulars');
  }).catch(function (e) { console.error(e); process.exit(1); });
}
