// ===========================================================================
// SPONSORS (career ladder, build 3). Around the class sponsor (career.js /
// season.js: signing, stipend, per-win, the contract and a free car, a
// discount and a product rule) come:
//  - new contracts on the ladder's events (win 2 Heads-Up and a Bracket;
//    win strip events, the looks and a car show; No-Prep and the street);
//  - associates: two decal slots, a payment every race day, a bonus on a
//    win or runner-up; three event wins with one on the car and it offers
//    you a primary deal in the next class;
//  - decals and contingency: post a parts brand's decals and it pays when
//    you win (or are runner-up) with its product on the car (NHRA's
//    contingency program), and its discount grows with your wins (the
//    Speedmaster-style tiers);
//  - track awards at the strip eliminations: the quickest 60-foot of the
//    day and a hard-luck award for a first-round loser.
// Amounts are x the class's base. No deadlines.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, C = function () { return G.careerState(); };
  var SP = DR.Sponsor = {};
  function r10(x) { return Math.round(x / 10) * 10; }
  function base(si) { return DR.STAGES[Math.max(0, Math.min(DR.STAGES.length - 1, si))].base; }
  SP.ASSOC_MAX = 2;
  SP.K = { assocDay: 0.04, assocWin: 0.10, assocRU: 0.04, contWin: 0.05, contRU: 0.02, sixty: 0.05, hardLuck: 0.05 };
  SP.TIERS = [{ name: 'Bronze', wins: 0, pct: 0.05 }, { name: 'Silver', wins: 5, pct: 0.10 }, { name: 'Gold', wins: 12, pct: 0.15 }];
  SP.ASSOC_PROMOTE = 3;   // event wins with an associate on the car: a primary offer next class

  // ---------------------------------------------------------------- brands
  // A parts brand: its group (what it discounts) and its product (what has
  // to be on the car for its contingency): the one it names, else any
  // non-factory part of its group.
  SP.grpOf = function (id) { var p = DR.SPONSOR_PERKS[id]; return p ? (p.grp || (p.fuel ? 'fuel' : null)) : null; };
  SP.isProduct = function (id) { return !!SP.grpOf(id); };
  SP.productName = function (id) {
    var p = DR.SPONSOR_PERKS[id] || {}, g = SP.grpOf(id);
    if (p.prod) return p.prod[0];
    var nm = (DR.UNLOCK_NAMES[g] || g).toLowerCase();
    return g === 'fuel' ? 'race fuel or alcohol' : (/^[aeiou]/.test(nm) ? 'an ' : 'a ') + nm + ' part';
  };
  SP.productOn = function (id, inst) {
    var p = DR.SPONSOR_PERKS[id], g = SP.grpOf(id); if (!g || !inst) return false;
    if (p.prod) return !!p.prod[1](G.spec(inst), inst);
    if (g === 'fuel') return G.spec(inst).fuelId !== 'stock';
    return DR.PART_GROUPS.some(function (pg) {
      return (pg.unlock || pg.id) === g && pg.cats.some(function (cat) { return DR.partApplies(cat, inst) && DR.partId(cat, inst) !== DR.stockPart(cat, inst); });
    });
  };
  // ---------------------------------------------------------------- state
  // c.assoc: [{ id, wins: { si: n } }]; c.decals: { grp: brand id };
  // c.dwins: { brand id: wins with its product on }; c.assocOffer: { si: id }
  function st() { var c = C(); c.assoc = c.assoc || []; c.decals = c.decals || {}; c.dwins = c.dwins || {}; c.assocOffer = c.assocOffer || {}; return c; }
  SP.state = st;

  // ---------------------------------------------------------------- the class sponsor: ladder goals
  // contract v2: { v: 2, hu, bk, np, st (events of each kind to win), strip
  // (any strip events), stars, show (car shows) }
  var offers0 = G.sponsorOffers;
  G.sponsorOffers = function (si) {
    var out = offers0(si).map(function (o, k) {
      var stars = o.contract.stars;
      o.contract = k === 0 ? { v: 2, hu: 2, bk: 1 } : k === 1 ? { v: 2, strip: 2, stars: stars, show: 1 } : { v: 2, np: 1, st: 2 };
      return o;
    });
    // an associate that's been on the car for your wins: a better deal
    var aid = st().assocOffer[si];
    if (aid) {
      var b = DR.sponsorById(aid), p = DR.SPONSOR_PERKS[aid] || {}, plain = out[0];
      var o4 = { id: aid, name: b.name, col: b.col, sign: r10(plain.sign * 1.25), perWin: r10(plain.perWin * 1.25), bonus: r10(plain.bonus * 1.25), stipend: r10(plain.stipend * 1.25),
        contract: { v: 2, hu: 2, bk: 1 }, pitch: 'Your associate: they liked what they saw. A bigger deal to put them on the car.', assoc: true };
      if (p.grp) o4.disc = { grp: p.grp, pct: p.pct }; if (p.fuel) o4.fuelDisc = p.fuel; if (p.prod) o4.prod = p.prod[0];
      out = out.filter(function (o) { return o.id !== aid; }).concat([o4]);
    }
    return out;
  };
  var THEME_KEY = { headsup: 'hu', bracket: 'bk', noprep: 'np', street: 'st' };
  SP.KEY_TEXT = { hu: ['Heads-Up events', 'Heads-Up event'], bk: ['Bracket events', 'Bracket event'], np: ['No-Prep events', 'No-Prep event'], st: ['street list nights', 'street list night'], strip: ['strip events', 'strip event'], show: ['car shows', 'car show'] };
  // what a v2 contract has had counted (the events in sp.ids, by kind)
  function tally(sp) {
    var n = { hu: 0, bk: 0, np: 0, st: 0, strip: 0, show: sp.shows || 0 }, ids = G.contractIds(sp);
    Object.keys(ids).forEach(function (id) {
      var ev = DR.Ladder.evById(id); if (!ev || !THEME_KEY[ev.type]) return;
      n[THEME_KEY[ev.type]]++;
      if (ev.type !== 'street') n.strip++;
    });
    return n;
  }
  SP.tally = tally;
  // the goals a kind of event still needs
  function needs(sp, ev) {
    var k = sp.contract, n = tally(sp), key = THEME_KEY[ev.type];
    if (!key) return false;
    if ((k[key] || 0) > n[key]) return true;
    return key !== 'st' && (k.strip || 0) > n.strip;
  }
  var count0 = G.countsForContract;
  G.countsForContract = function (ev) {
    var sp = C().sponsor[ev.stage];
    if (!sp || !sp.contract || sp.contract.v !== 2) return count0.apply(this, arguments);
    return !sp.paid && !!ev.ladder && !G.contractIds(sp)[ev.id] && needs(sp, ev);
  };
  var prog0 = G.contractProgress;
  G.contractProgress = function (si) {
    var sp = C().sponsor[si];
    if (!sp || !sp.contract || sp.contract.v !== 2) return prog0.apply(this, arguments);
    var k = sp.contract, n = tally(sp), lines = [], done = true;
    ['hu', 'bk', 'np', 'strip', 'st', 'show'].forEach(function (key) {
      if (!k[key]) return;
      var ok = n[key] >= k[key];
      lines.push([(key === 'show' ? 'Car shows' : SP.KEY_TEXT[key][0].charAt(0).toUpperCase() + SP.KEY_TEXT[key][0].slice(1) + ' won'), Math.min(n[key], k[key]) + '/' + k[key], ok]);
      done = done && ok;
    });
    if (k.stars) { var best = C().bestStars; lines.push(['Visual rating', DR.starText(Math.min(best, k.stars)) + ' / ' + DR.starText(k.stars), best >= k.stars]); done = done && best >= k.stars; }
    return { done: done, lines: lines };
  };
  // the contract in words (the offers, the Sponsors tab)
  SP.contractText = function (k, prod) {
    if (!k) return '';
    if (k.v !== 2) {
      var r = ['win ' + k.spon + ' strip events'];
      if (k.street) r.push('win ' + k.street + ' street list nights');
      if (k.stars) r.push('reach a ' + (Math.round(k.stars * 100) / 100) + '-star visual rating');
      if (prod) r[0] += ' with ' + prod + ' on the car';
      return r.join(', ');
    }
    var out = [];
    ['hu', 'bk', 'np', 'strip', 'st'].forEach(function (key) { if (k[key]) out.push('win ' + k[key] + ' ' + SP.KEY_TEXT[key][k[key] > 1 ? 0 : 1] + (prod && key !== 'st' ? ' with ' + prod + ' on the car' : '')); });
    if (k.stars) out.push('reach a ' + (Math.round(k.stars * 100) / 100) + '-star visual rating');
    if (k.show) out.push('show the car at ' + (k.show > 1 ? k.show + ' car shows' : 'a car show'));
    return out.join(', ');
  };
  // the slip's line for a v2 contract
  var win0 = G.winEvent;
  G.winEvent = function (ev) {
    var c = C(), sp = c.sponsor[ev.stage], v2 = sp && sp.contract && sp.contract.v === 2 && !sp.paid;
    var wanted = v2 && ev.ladder && needs(sp, ev);
    var out = win0.apply(this, arguments);
    // a race of another class, while this class's contract wants one like it
    var cur = c.sponsor[c.stage];
    if (ev.ladder && ev.stage !== c.stage && cur && !cur.paid && cur.contract && cur.contract.v === 2 && needs(cur, ev))
      out.contractLine = 'Didn\'t count for ' + DR.sponsorById(cur.id).name + ': it\'s a Class ' + (ev.stage + 1) + ' event, your contract is Class ' + (c.stage + 1) + '.';
    if (v2 && ev.ladder && THEME_KEY[ev.type] && !out.contract) {
      var nm = DR.sponsorById(sp.id).name;
      if (out.noProd) out.contractLine = 'Didn\'t count for ' + nm + ': they want ' + (sp.prod || 'their product') + ' on the car.';
      else if (out.counted && wanted) out.contractLine = 'Counted for ' + nm + ': ' + G.contractProgress(ev.stage).lines.map(function (l) { return l[0] + ' ' + l[1]; }).join(', ') + '.';
      else out.contractLine = 'Didn\'t count for ' + nm + ': ' + (!out.counted && G.contractIds(sp)[ev.id] ? 'this event already counted.' : 'they want ' + SP.contractText(sp.contract, sp.prod) + '.');
    }
    return out;
  };
  // "show the car": a car show entered while signed with a looks sponsor
  G.showCounted = function () {
    var c = C(), sp = c.sponsor[c.stage];
    if (!sp || sp.paid || !sp.contract || sp.contract.v !== 2 || !sp.contract.show) return '';
    sp.shows = (sp.shows || 0) + 1; G.save();
    var msgs = G.checkContracts ? G.checkContracts() : [];
    return 'Shown for ' + DR.sponsorById(sp.id).name + ': car shows ' + Math.min(sp.shows, sp.contract.show) + '/' + sp.contract.show + (msgs.length ? '. ' + msgs.join('. ') : '');
  };

  // ---------------------------------------------------------------- associates
  // offers: brands of your class and the ones before, not your class sponsor
  SP.assocPay = function () { var b = base(C().stage); return { day: r10(b * SP.K.assocDay), win: r10(b * SP.K.assocWin), ru: r10(b * SP.K.assocRU) }; };
  SP.assocOffers = function () {
    var c = st(), prim = c.sponsor[c.stage], have = {}, out = [];
    c.assoc.forEach(function (a) { have[a.id] = 1; });
    for (var si = c.stage; si >= 0; si--) DR.STAGES[si].sponsors.forEach(function (id) {
      if (have[id] || (prim && prim.id === id) || out.indexOf(id) >= 0) return;
      out.push(id);
    });
    return out.slice(0, 6);
  };
  SP.signAssoc = function (id) {
    var c = st();
    if (c.assoc.length >= SP.ASSOC_MAX) return 'Both decal slots are taken: drop one first';
    if (c.assoc.some(function (a) { return a.id === id; })) return 'Already on the car';
    c.assoc.push({ id: id, wins: {} }); G.save(); return '';
  };
  SP.dropAssoc = function (id) { var c = st(); c.assoc = c.assoc.filter(function (a) { return a.id !== id; }); G.save(); };
  // an associate pays on a win / runner-up with its product on the car (a
  // brand that sells no parts: just its decals)
  SP.assocQualifies = function (id, inst) { return !SP.isProduct(id) || SP.productOn(id, inst); };

  // ---------------------------------------------------------------- decals and contingency
  SP.decalFor = function (grp) { return st().decals[grp] || null; };
  SP.decalBlock = function (id) {
    var c = st(), g = SP.grpOf(id), prim = c.sponsor[c.stage], pg = prim ? SP.grpOf(prim.id) : null;
    if (!g) return 'They sell no parts';
    if (prim && prim.id === id) return 'Your class sponsor: their decals are on already';
    if (pg && pg === g) return 'Your class sponsor, ' + DR.sponsorById(prim.id).name + ', sells ' + (g === 'fuel' ? 'race fuel' : (DR.UNLOCK_NAMES[g] || g).toLowerCase() + ' parts') + ': no rival decals';
    var cur = c.decals[g];
    if (cur && cur !== id) return 'You run ' + DR.sponsorById(cur).name + '\'s decals for ' + (g === 'fuel' ? 'race fuel' : (DR.UNLOCK_NAMES[g] || g).toLowerCase() + ' parts') + ': take them off first';
    return '';
  };
  SP.postDecal = function (id) { var w = SP.decalBlock(id); if (w) return w; st().decals[SP.grpOf(id)] = id; G.save(); return ''; };
  SP.removeDecal = function (id) { var c = st(), g = SP.grpOf(id); if (c.decals[g] === id) delete c.decals[g]; G.save(); };
  // the brands whose decals are on (posted, or your class sponsor's)
  SP.decalBrands = function () {
    var c = st(), out = [];
    Object.keys(c.decals).forEach(function (g) { out.push(c.decals[g]); });
    var prim = c.sponsor[c.stage]; if (prim && SP.isProduct(prim.id) && out.indexOf(prim.id) < 0) out.push(prim.id);
    return out;
  };
  SP.tier = function (id) { var w = st().dwins[id] || 0, t = SP.TIERS[0]; SP.TIERS.forEach(function (x) { if (w >= x.wins) t = x; }); return t; };
  SP.contPay = function (si) { var b = base(si); return { win: r10(b * SP.K.contWin), ru: r10(b * SP.K.contRU) }; };
  // the discounts: the class sponsor's (season.js) or a posted decal's tier
  var disc0 = G.partDiscount;
  G.partDiscount = function (cat) {
    var best = disc0.apply(this, arguments), g = DR.groupOf(cat), id = st().decals[g];
    if (id) best = Math.max(best, SP.tier(id).pct);
    return best;
  };
  var fuel0 = G.fuelDiscount;
  G.fuelDiscount = function () { var best = fuel0.apply(this, arguments), id = st().decals.fuel; return id ? Math.max(best, SP.tier(id).pct) : best; };

  // ---------------------------------------------------------------- the money on the day
  // every race day you turn up to: the associates' day money (lines for the slip)
  SP.dayPay = function () {
    var c = st(), pay = SP.assocPay(), out = [];
    c.assoc.forEach(function (a) { out.push([DR.sponsorById(a.id).name + ' (associate)', pay.day]); });
    return out;
  };
  // at the end of a ladder event: contingency, associates' bonuses, the
  // track awards; decal tiers and associates' wins counted
  G.ladderAwards = function (ev, run, won, out) {
    var c = st(), inst = G.car(), si = ev.stage, ru = !won && ev.fmt === 'elim' && (run.myWins || 0) === 3;
    function pay(label, amt) { if (amt > 0) { out.money.push([label, amt]); run.earned = (run.earned || 0) + amt; } }
    if (won || ru) {
      var cp = SP.contPay(si);
      SP.decalBrands().forEach(function (id) {
        if (!SP.productOn(id, inst)) return;
        pay('Contingency: ' + DR.sponsorById(id).name, won ? cp.win : cp.ru);
        if (won) c.dwins[id] = (c.dwins[id] || 0) + 1;
      });
      var ap = SP.assocPay();
      c.assoc.forEach(function (a) {
        if (!SP.assocQualifies(a.id, inst)) return;
        pay(DR.sponsorById(a.id).name + (won ? ' win bonus' : ' runner-up bonus'), won ? ap.win : ap.ru);
        if (won) {
          a.wins[si] = (a.wins[si] || 0) + 1;
          if (a.wins[si] >= SP.ASSOC_PROMOTE && si + 1 < DR.STAGES.length && !c.sponsor[si + 1] && !c.assocOffer[si + 1]) {
            c.assocOffer[si + 1] = a.id;
            out.notes.push(['acc', DR.sponsorById(a.id).name + ' wants to be your class sponsor in Class ' + (si + 2) + ': a better deal waits there.']);
          }
        }
      });
    }
    // the track awards (the strip eliminations)
    if (ev.fmt === 'elim' && (ev.type === 'headsup' || ev.type === 'bracket')) {
      var mine = (run.passes || []).filter(function (x) { return x.sixty && x.et < 90 && !x.red; }).reduce(function (a, x) { return Math.min(a, x.sixty); }, 99);
      if (mine < 90) {
        var cond = DR.conditions(DR.evCond(ev).surface, DR.evCond(ev).night), grip = (DR.EVENT_TYPES[ev.type].grip || 1) / ((DR.Race && DR.Race.SURF_BASE[cond.surface]) || 1);
        var field = ev.opps.reduce(function (a, o) {
          var e = G.estimate(G.oppInst(o), ev.dist, grip, cond);
          return e.sixty ? Math.min(a, e.sixty * (1 + (1 - (o.skill || 0.5)) * 0.04) * (1 + (Math.random() - 0.5) * 0.02)) : a;
        }, 99);
        if (mine < field) pay('Quickest 60 ft of the day (' + mine.toFixed(3) + ')', r10(base(si) * SP.K.sixty));
      }
      var r1 = (run.passes || []).slice(-1)[0];
      if (!won && !(run.myWins > 0) && r1 && r1.phase === 'elim' && !r1.round) {
        var close = r1.margin != null && r1.margin < 0.02, broke = !!r1.broke;
        if (close || broke || Math.random() < 1 / 8) pay('Hard-luck award', r10(base(si) * SP.K.hardLuck));
      }
    }
    G.save();
  };
  SP.TIER_TEXT = function (id) { var t = SP.tier(id), w = st().dwins[id] || 0, nx = SP.TIERS.filter(function (x) { return x.wins > w; })[0]; return t.name + ' (' + Math.round(t.pct * 100) + '% off' + (nx ? '; ' + nx.name + ' at ' + nx.wins + ' wins, ' + w + ' so far' : '') + ')'; };
})();

// ---------------------------------------------------------------- the Sponsors tab
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, h = UI.h, btn = UI.btn, SP = DR.Sponsor;
  function head(t, sub) { return h('div', { class: 'stagehead', style: { marginTop: '10px' } }, h('div', { class: 'grow' }, h('div', { class: 'plvl' }, t), sub ? h('div', { class: 'dim gsmall' }, sub) : null)); }
  function brandName(id) { var b = DR.sponsorById(id); return h('span', { class: 'pix', style: { color: b.col } }, b.name); }
  UI.sponsorsView = function (si) {
    var c = SP.state(), inst = G.car(), sp = c.sponsor[si], out = [];
    // the class sponsor
    out.push(head('CLASS ' + (si + 1) + ' SPONSOR', 'One per class. The King only races sponsored drivers with the contract done.'));
    if (!sp) out.push(h('div', { class: 'spcard empty' }, h('div', { class: 'dim' }, 'Not signed yet.'), UI.sponsorPicker ? btn('Choose Sponsor', function () { UI.sponsorPicker(si); }, 'small go') : null));
    else {
      var pr = G.contractProgress(si), info = DR.sponsorById(sp.id);
      out.push(h('div', { class: 'spcard', style: { borderLeftColor: info.col } }, brandName(sp.id),
        h('div', { class: 'gsmall dim' }, DR.money(sp.stipend || 0) + ' every race day • ' + DR.money(sp.perWin) + ' per win • contract: ' + DR.money(sp.bonus) + ' and a free car' + (sp.paid ? ' (paid)' : '')),
        h('div', { class: 'gsmall' }, 'Contract: ' + SP.contractText(sp.contract, sp.prod) + '.'),
        pr.lines.map(function (l) { return h('div', { class: 'gsmall ' + (l[2] ? 'good' : '') }, (l[2] ? '✔ ' : '• ') + l[0] + ': ' + l[1]); })));
    }
    // associates
    var ap = SP.assocPay();
    out.push(head('ASSOCIATES • ' + c.assoc.length + ' / ' + SP.ASSOC_MAX, 'Two decal slots. Each pays ' + DR.money(ap.day) + ' every race day, ' + DR.money(ap.win) + ' on an event win and ' + DR.money(ap.ru) + ' runner-up (with their product on the car, if they sell parts). ' + SP.ASSOC_PROMOTE + ' wins with one on the car in a class and they offer to be your class sponsor in the next.'));
    c.assoc.forEach(function (a) {
      var ok = SP.assocQualifies(a.id, inst);
      out.push(h('div', { class: 'row lrow', style: { gap: '8px', alignItems: 'center' } }, h('div', { class: 'grow' }, brandName(a.id),
        h('div', { class: 'gsmall dim' }, (SP.isProduct(a.id) ? 'Wants ' + SP.productName(a.id) + (ok ? ' ✔ on your car' : ' (not on your car)') : 'Decals only') + ' • class ' + (si + 1) + ' wins with them: ' + (a.wins[si] || 0))),
        btn('Drop', function () { UI.confirm('Take ' + DR.sponsorById(a.id).name + '\'s decals off?', function () { SP.dropAssoc(a.id); UI.refresh(); }, 'Drop'); }, 'small red')));
    });
    if (c.assoc.length < SP.ASSOC_MAX) out.push(h('div', { class: 'col', style: { gap: '4px' } }, SP.assocOffers().map(function (id) {
      return h('div', { class: 'row lrow', style: { gap: '8px', alignItems: 'center' } }, h('div', { class: 'grow' }, brandName(id), h('div', { class: 'gsmall dim' }, SP.isProduct(id) ? 'Sells ' + SP.productName(id).replace(/^an? /, '') : 'Sells no parts: decals only')),
        btn('Sign', function () { var w = SP.signAssoc(id); if (w) return UI.toast(w); UI.toast(DR.sponsorById(id).name + ' is on the car'); UI.refresh(); }, 'small go'));
    })));
    // decals and contingency
    var cp = SP.contPay(si);
    out.push(head('DECALS & CONTINGENCY', 'Parts brands. Put their decals on (free, one brand per kind of part) and they pay ' + DR.money(cp.win) + ' when you win an event, ' + DR.money(cp.ru) + ' runner-up, with their product on the car. Their parts discount grows with your wins.'));
    var seen = {};
    DR.SPONSORS.forEach(function (b) {
      if (!SP.isProduct(b.id) || seen[b.id]) return; seen[b.id] = 1;
      var on = SP.decalBrands().indexOf(b.id) >= 0, block = SP.decalBlock(b.id), prod = SP.productOn(b.id, inst), prim = c.sponsor[c.stage] && c.sponsor[c.stage].id === b.id;
      out.push(h('div', { class: 'row lrow', style: { gap: '8px', alignItems: 'center' } }, h('div', { class: 'grow' }, brandName(b.id),
        h('div', { class: 'gsmall dim' }, 'Wants ' + SP.productName(b.id) + (prod ? ' ✔ on your car' : ' (not on your car)') + (prim ? ' • your class sponsor' : on ? ' • ' + SP.TIER_TEXT(b.id) : ''))),
        on && c.decals[SP.grpOf(b.id)] === b.id ? btn('Take off', function () { SP.removeDecal(b.id); UI.refresh(); }, 'small') :
          on ? h('span', { class: 'gsmall good' }, 'ON') :
            block ? h('span', { class: 'gsmall dim', style: { maxWidth: '40%' } }, block) : btn('Put on', function () { var w = SP.postDecal(b.id); if (w) return UI.toast(w); UI.refresh(); }, 'small go')));
    });
    // track awards
    out.push(head('TRACK AWARDS', 'At Heads-Up and Bracket events: the quickest 60-foot of the day ' + DR.money(Math.round(DR.STAGES[si].base * SP.K.sixty / 10) * 10) + ', and a hard-luck award to a first-round loser ' + DR.money(Math.round(DR.STAGES[si].base * SP.K.hardLuck / 10) * 10) + '.'));
    return h('div', { class: 'ladder sponsors' }, out);
  };
})();
