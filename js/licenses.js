// ===========================================================================
// LICENSES — real drag racing's gate. NHRA requires a competition license
// for a car that runs 9.99 or quicker in the quarter (or 135 mph and up);
// the quickest classes need more. Here: a Competition license (9.99 / 135
// mph) and a Pro license (7.49 and quicker), each earned with observed
// passes at test & tune: three clean runs (finished, no tire shake, no
// breakage) in a car that runs the number, at least one of them at it.
// Tech checks the license at the strip, with the roll bar, cage and chute.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, h = UI.h, btn = UI.btn, A = DR.Audio;
  DR.LICENSES = {
    comp: { name: 'Competition license', et: 9.99, et8: 6.39, mph: 135, fee: 150, fine: 250, rule: '9.99 or quicker in the quarter (6.39 in the eighth), or 135 mph and up' },
    pro: { name: 'Pro license', et: 7.49, et8: 4.74, fee: 450, fine: 600, rule: '7.49 or quicker in the quarter (4.74 in the eighth)' }
  };
  DR.LIC_PASSES = 3; DR.LIC_TRIES = 5;
  function L() { var s = G.state; if (!s.lic) s.lic = {}; if (!s.lic.warned) s.lic.warned = {}; if (!s.lic.ban) s.lic.ban = {}; return s.lic; }
  G.hasLicense = function (tier) { var l = L(); return tier === 'comp' ? !!(l.comp || l.pro) : !!l[tier]; };
  // what a time slip asks for ('' = none)
  function runNeed(et, mph, eighth) {
    var P = DR.LICENSES.pro, C = DR.LICENSES.comp;
    if (et <= (eighth ? P.et8 : P.et)) return 'pro';
    if (et <= (eighth ? C.et8 : C.et) || (!eighth && mph >= C.mph)) return 'comp';
    return '';
  }
  // what this car has actually run ('' = nothing that needs a license yet).
  // Like the real thing, it's the time slip that counts, not what the car
  // might do on paper.
  G.licenseNeed = function (inst) {
    var b = inst.best || {}, q = b.q || 99, e = b.e || 99;
    var a = runNeed(q, b.qt || 0, false), c = runNeed(e, 0, true);
    return a === 'pro' || c === 'pro' ? 'pro' : a || c;
  };
  // what it could run (a heads-up on the license card)
  G.licenseCould = function (inst) { var e = G.estimate(inst); return runNeed(e.et, e.trap || 0, false); };
  // tech at the strip: run under the number without the license and you're
  // warned; do it again and it's a fine, and that car stays out until you
  // hold the license
  var tech0 = G.techIssue;
  G.techIssue = function (inst, ev) {
    var t = tech0.apply(this, arguments);
    if (t || DR.EVENT_TYPES[ev.type].theme !== 'strip') return t;
    var need = G.licenseNeed(inst), l = L();
    if (need && !G.hasLicense(need) && l.ban[need]) return 'License: this car has run ' + DR.LICENSES[need].rule.split(',')[0] + ' and tech has you on their list: it stays out until you hold a ' + DR.LICENSES[need].name + ' (Race > Practice: Licenses)';
    return '';
  };
  // a run at the strip under the number, unlicensed
  function techCheck(cfg, sim) {
    if (cfg.license || cfg.theme !== 'strip' || !sim || !sim.finished || sim.crashed) return '';
    var eighth = cfg.dist && cfg.dist < DR.QUARTER - 1, need = runNeed(sim.et, eighth ? 0 : (sim.trap || 0), eighth);
    if (!need || G.hasLicense(need)) return '';
    var l = L(), Lc = DR.LICENSES[need], what = sim.et.toFixed(3) + (!eighth && sim.trap ? ' @ ' + Math.round(sim.trap) + ' mph' : '');
    if (!l.warned[need]) { l.warned[need] = true; return { msg: 'TECH WARNING: ' + what + ' without a ' + Lc.name + '. Next time it\'s a ' + DR.money(Lc.fine) + ' fine and the car is out until you\'re licensed (Race > Practice: Licenses).' }; }
    l.ban[need] = true;
    return { msg: 'TECH: ' + what + ' unlicensed, again. Fined ' + DR.money(Lc.fine) + ', and a car that runs that doesn\'t race here until you hold a ' + Lc.name + '.', fine: Lc.fine };
  }
  // the test: pay, then observed passes at test & tune
  G.startLicense = function (tier) {
    var Lc = DR.LICENSES[tier], l = L();
    if (G.hasLicense(tier)) return 'You have it';
    if (tier === 'pro' && !G.hasLicense('comp')) return 'Get the Competition license first';
    if (!G.canAfford(Lc.fee)) return 'The test costs ' + DR.money(Lc.fee);
    G.pay(Lc.fee); l.test = { tier: tier, ok: 0, runs: 0, fast: false }; G.save();
    return '';
  };
  G.licensePass = function () { var t = L().test; if (!t) return; DR.Race.start({ mode: 'test', dist: DR.QUARTER, theme: 'strip', grip: 1, night: false, license: t.tier }); };
  // a license pass on the slip
  var after0 = G.afterRun;
  G.afterRun = function (cfg, r) {
    var out = after0 ? after0.apply(this, arguments) : { news: [] };
    var l = L(), t = l.test;
    var tc = r && !r.testDrive ? techCheck(cfg, r.sim) : '';
    // the safety gear that time asks for (a cage under 10.00, a chute over 150)
    var inst = G.car(), sim = r && r.sim;
    if (!r.testDrive && inst && sim && sim.finished && cfg.theme === 'strip' && !(cfg.dist && cfg.dist < DR.QUARTER - 1)) {
      var b0 = inst.best || {};
      inst.best = Object.assign({}, b0, { q: Math.min(b0.q || 99, sim.et), qt: Math.max(b0.qt || 0, Math.round(sim.trap || 0)) });
      var gear = G.techIssue(inst, { type: 'knockout' });
      inst.best = b0;
      if (gear && /^Tech: /.test(gear)) out.news = (out.news || []).concat(['TECH: after a ' + sim.et.toFixed(3) + ', ' + gear.replace(/^Tech: /, '') + ' before it races here again.']);
    }
    if (tc) {
      out.news = (out.news || []).concat([tc.msg]); out.license = tc.msg;
      if (tc.fine) { G.pay(tc.fine); out.money = (out.money || []).concat([['Tech fine (no license)', -tc.fine]]); }
      G.save();
    }
    if (!cfg.license || !t || !r.sim) return out;
    var Lc = DR.LICENSES[t.tier], sim = r.sim, clean = sim.finished && !sim.crashed && !sim.blown && !sim.broke && (sim.shakeMax || 0) < 0.6;
    var fast = clean && (sim.et <= Lc.et || (Lc.mph && (sim.trap || 0) >= Lc.mph));
    t.runs++; if (clean) t.ok++; if (fast) t.fast = true;
    var msg;
    if (t.ok >= DR.LIC_PASSES && t.fast) { l[t.tier] = true; l.test = null; msg = 'LICENSED: the ' + Lc.name + ' is yours. ' + DR.LICENSES[t.tier].rule.charAt(0).toUpperCase() + DR.LICENSES[t.tier].rule.slice(1) + ' is legal at the strip now.'; if (A.cash) A.cash(); }
    else if (t.runs >= DR.LIC_TRIES) { l.test = null; msg = 'License test failed: ' + t.ok + ' clean passes' + (t.fast ? '' : ', none at the number') + ' in ' + DR.LIC_TRIES + '. Pay again to retake it.'; }
    else msg = 'License pass ' + t.runs + ': ' + (clean ? 'clean' + (fast ? ', and at the number' : '') : 'not clean (' + (!sim.finished ? 'didn\'t finish' : sim.shakeMax >= 0.6 ? 'tire shake' : 'it broke') + ')') + '. ' + t.ok + '/' + DR.LIC_PASSES + ' clean' + (t.fast ? '' : ', still need one at ' + Lc.et.toFixed(2)) + ' • ' + (DR.LIC_TRIES - t.runs) + ' tries left';
    out.news = (out.news || []).concat([msg]);
    out.license = msg;
    G.save();
    return out;
  };
  // the card on the Drag Test tab
  UI.licenseCard = function (inst) {
    var l = L(), need = G.licenseNeed(inst), t = l.test, rows = [];
    ['comp', 'pro'].forEach(function (k) {
      var Lc = DR.LICENSES[k], have = G.hasLicense(k);
      rows.push(h('div', { class: 'row', style: { gap: '8px', alignItems: 'center' } }, h('span', { class: have ? 'good' : 'dim' }, have ? '✔' : '✗'), h('span', { class: 'grow' }, Lc.name, h('span', { class: 'gsmall dim' }, ' • ' + Lc.rule)),
        have ? null : t && t.tier === k ? btn('Observed pass ' + (t.runs + 1) + ' (' + t.ok + '/' + DR.LIC_PASSES + ' clean)', function () { G.licensePass(); }, 'small go') :
          btn('Take the test ' + DR.money(Lc.fee), function () { var w = G.startLicense(k); if (w) return UI.toast(w); UI.refresh(); }, 'small' + (G.canAfford(Lc.fee) ? '' : ' disabled'))));
    });
    return h('div', { class: 'trkcard' }, h('div', { class: 'plvl' }, 'LICENSES'),
      need && !G.hasLicense(need) ? h('div', { class: 'warn gsmall' }, 'Your ' + DR.CARS[inst.carId].name + ' has run ' + DR.LICENSES[need].rule.split(',')[0] + '. ' + (l.ban[need] ? 'Tech has it on their list: it can\'t race at the strip without a ' + DR.LICENSES[need].name + '.' : l.warned[need] ? 'You\'ve had your warning: the next unlicensed run like that is a ' + DR.money(DR.LICENSES[need].fine) + ' fine and a ban until you\'re licensed.' : 'Run it unlicensed and tech will warn you, then fine you.')) :
        !need && G.licenseCould(inst) && !G.hasLicense(G.licenseCould(inst)) ? h('div', { class: 'dim gsmall' }, 'On paper your ' + DR.CARS[inst.carId].name + ' could get under the ' + DR.LICENSES[G.licenseCould(inst)].name + ' number. Tech goes by the time slip: the first unlicensed run under it is a warning, the next a fine.') : null,
      rows, h('div', { class: 'gsmall dim' }, 'The test: ' + DR.LIC_PASSES + ' clean observed passes (finished, no shake, nothing broken) out of ' + DR.LIC_TRIES + ', at least one at the number, at test & tune.'));
  };
})();
