// ===========================================================================
// STREET LEGAL — getting the car to the race. Drag Week style: any car that
// can live in traffic (a working cooling system, a body and glass) can be
// driven to the track or the street spot. The more illegal it is, the more
// likely a cop pulls it over on the way, and every violation they notice
// is a ticket. Tow it instead (a flatbed each trip, or your own truck and
// trailer) and nobody looks twice. No breakdowns on the way: it gets there.
// Fines are about what they run in the US: a modified exhaust ~$195
// (California's bail schedule), underglow $25-300, dark tint ~$250.
// ===========================================================================
(function () {
  var DR = globalThis.DR, G = DR.Game, UI = DR.UI, h = UI.h;
  var L = DR.Legal = {};
  L.FLATBED = 150;          // a flatbed tow there and back
  L.RIG = 8500;             // a used 3/4-ton pickup and an open car trailer
  L.RIG_TRIP = 40;          // the truck's gas, a trip

  // what a cop can write you up for: { name, fine, notice (chance they spot
  // it at a stop), pts (how much it draws attention) }
  function items(inst) {
    var p = function (cat) { return DR.partId(cat, inst); }, vis = inst.vis || {}, S = G.spec(inst), out = [];
    function add(id, name, fine, notice, pts) { out.push({ id: id, name: name, fine: fine, notice: notice, pts: pts }); }
    if (p('exhaust') === 'e3') add('exh', 'Open race exhaust (noise)', 390, 0.95, 3);
    else if (p('exhaust') === 'e2') add('exh', 'Modified exhaust, no mufflers', 195, 0.8, 2);
    if (p('headers') === 'h3' || p('downpipe') === 'dp2') add('cat', 'No catalytic converter (emissions tampering)', 500, 0.25, 1);
    if (p('launch') === 'l2') add('al', 'Anti-lag backfires', 150, 0.5, 1);
    if (vis.tint === 2) add('tint', 'Window tint too dark', 250, 0.7, 1);
    if (vis.neon) add('neon', 'Underglow lighting', 150, 0.9, 1);
    if (S.tire && /Slick/.test(S.tire.kind)) add('tire', 'Non-DOT racing slicks', 250, 0.6, 2);
    if (p('nitrous') !== 'stock') add('nos', 'Nitrous connected on the road', 250, 0.3, 1);
    if (p('weight') === 'w1' || p('weight') === 'w2') add('int', 'Passenger seat and belts removed', 150, 0.3, 1);
    if (p('weight') === 'w3') add('glass', 'Lexan windows (not safety glass)', 200, 0.5, 1);
    if (p('wheeliebar') !== 'stock') add('wb', 'Wheelie bars past the bumper', 100, 0.7, 1);
    return out;
  }
  // can it be driven there at all? '' if so, else why not
  L.undrivable = function (inst) {
    var car = DR.CARS[inst.carId], S = G.spec(inst);
    if (car.cat === 'Pro') return 'a pure race car: no lights, no plates, no cooling for traffic';
    if (DR.partId('weight', inst) === 'w4') return 'a tube chassis can\'t be registered for the road';
    if ((S.peakHp + (S.nosHp || 0)) > S.coolHp * 1.8) return 'it would overheat in traffic: it makes far more power than its radiator was made for';
    return '';
  };
  L.check = function (inst) {
    var it = items(inst), pts = it.reduce(function (a, x) { return a + x.pts; }, 0);
    return { items: it, pts: pts, stop: Math.min(0.55, pts * 0.06), why: L.undrivable(inst) };
  };
  L.hasRig = function () { return !!G.state.rig; };
  L.buyRig = function () { if (L.hasRig()) return ''; if (!G.canAfford(L.RIG)) return 'A truck and trailer cost ' + DR.money(L.RIG); G.pay(L.RIG); G.state.rig = true; G.save(); return ''; };
  // how this car gets there by default: driven if it can be, else towed
  L.haulFor = function (inst) {
    var hv = inst.haul || 'drive';
    if (hv === 'rig' && !L.hasRig()) hv = 'flatbed';
    if (hv === 'drive' && L.undrivable(inst)) hv = L.hasRig() ? 'rig' : 'flatbed';
    return hv;
  };
  // The trip: pay the tow, or roll the dice on the road. Night street racing
  // draws more attention. Returns { money, news, total } for the slip.
  L.trip = function (inst, night) {
    var hv = L.haulFor(inst), out = { money: [], news: [], total: 0, how: hv };
    function pay(label, amt) { G.pay(amt); out.money.push([label, -amt]); out.total -= amt; }
    if (hv === 'flatbed') { pay('Flatbed tow', L.FLATBED); return out; }
    if (hv === 'rig') { pay('Truck & trailer (gas)', L.RIG_TRIP); return out; }
    var c = L.check(inst), chance = c.stop * (night ? 1.3 : 1);
    if (!c.pts || Math.random() >= chance) return out;
    var seen = c.items.filter(function (x) { return Math.random() < x.notice; });
    if (!seen.length) { out.news.push('Pulled over on the way: let go with a warning.'); return out; }
    var fine = seen.reduce(function (a, x) { return a + x.fine; }, 0);
    // a ticket gets paid, even into the red
    G.pay(fine); out.total -= fine;
    seen.forEach(function (x) { out.money.push(['Ticket: ' + x.name, -x.fine]); });
    out.news.push('PULLED OVER on the way: ' + seen.length + ' ticket' + (seen.length > 1 ? 's' : '') + ', ' + DR.money(fine) + '.');
    G.state.stats.tickets = (G.state.stats.tickets || 0) + 1;
    if (DR.Phone) DR.Phone.send('ray', 'ticket', { fine: fine });
    G.save();
    return out;
  };
  // the trip happens when you head out for a race day or a street race
  var origStart = DR.Race.start;
  DR.Race.start = function (cfg) {
    var inst = cfg.inst || G.car();
    if (!cfg.inst && inst && (cfg.mode === 'career' || cfg.mode === 'street') && !(cfg.round > 0) && !cfg.trip && !cfg.tuner)
      cfg.trip = L.trip(inst, !!cfg.night || cfg.mode === 'street');
    return origStart.apply(this, arguments);
  };

  // the race day line: how the car's getting there
  L.haulPicker = function (inst) {
    var why = L.undrivable(inst), c = L.check(inst), cur = L.haulFor(inst);
    var sel = h('select', { class: 'tinput', style: { maxWidth: '260px' } });
    var opts = [['drive', why ? 'Drive it (can\'t: ' + why.split(':')[0] + ')' : 'Drive it' + (c.pts ? ' (' + Math.round(c.stop * 100) + '% chance of a stop)' : ' (street legal)')],
      ['flatbed', 'Flatbed tow (' + DR.money(L.FLATBED) + ')']];
    if (L.hasRig()) opts.push(['rig', 'Your truck & trailer (' + DR.money(L.RIG_TRIP) + ' gas)']);
    opts.forEach(function (o) { var e = h('option', { value: o[0] }, o[1]); if (o[0] === 'drive' && why) e.disabled = true; sel.appendChild(e); });
    sel.value = cur;
    sel.addEventListener('change', function () { inst.haul = sel.value; G.save(); });
    return h('div', { class: 'row', style: { gap: '8px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' } }, h('span', { class: 'plvl' }, 'GETTING THERE'), sel,
      c.items.length && !why ? h('span', { class: 'dim gsmall', title: c.items.map(function (x) { return x.name + ' ' + DR.money(x.fine); }).join('\n') }, c.items.length + ' thing' + (c.items.length > 1 ? 's' : '') + ' a cop could write up') : null);
  };
})();
