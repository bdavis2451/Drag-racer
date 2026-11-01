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
    comp: { name: 'Competition license', et: 9.99, mph: 135, fee: 150, rule: '9.99 or quicker in the quarter, or 135 mph and up' },
    pro: { name: 'Pro license', et: 7.49, fee: 450, rule: '7.49 or quicker in the quarter' }
  };
  DR.LIC_PASSES = 3; DR.LIC_TRIES = 5;
  function L() { var s = G.state; if (!s.lic) s.lic = {}; return s.lic; }
  G.hasLicense = function (tier) { var l = L(); return tier === 'comp' ? !!(l.comp || l.pro) : !!l[tier]; };
  // what this car's numbers ask for ('' = none)
  G.licenseNeed = function (inst) {
    var e = G.estimate(inst), q = Math.min(e.et, inst.best && inst.best.q || 99), mph = Math.max(e.trap || 0, inst.best && inst.best.qt || 0);
    if (q <= DR.LICENSES.pro.et) return 'pro';
    if (q <= DR.LICENSES.comp.et || mph >= DR.LICENSES.comp.mph) return 'comp';
    return '';
  };
  // tech at the strip checks it too
  var tech0 = G.techIssue;
  G.techIssue = function (inst, ev) {
    var t = tech0.apply(this, arguments);
    if (t || DR.EVENT_TYPES[ev.type].theme !== 'strip') return t;
    var need = G.licenseNeed(inst);
    if (need && !G.hasLicense(need)) return 'License: a car that runs ' + DR.LICENSES[need].rule + ' needs a ' + DR.LICENSES[need].name + ' (Race > Drag Test: License)';
    return '';
  };
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
      need && !G.hasLicense(need) ? h('div', { class: 'warn gsmall' }, 'Your ' + DR.CARS[inst.carId].name + ' runs ' + DR.LICENSES[need].rule + ': tech won\'t pass it at the strip without a ' + DR.LICENSES[need].name + '.') : null,
      rows, h('div', { class: 'gsmall dim' }, 'The test: ' + DR.LIC_PASSES + ' clean observed passes (finished, no shake, nothing broken) out of ' + DR.LIC_TRIES + ', at least one at the number, at test & tune.'));
  };
})();
