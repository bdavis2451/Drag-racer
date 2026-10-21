// Prints each career opponent's estimated ET so the ladder stays in order.
const path = require('path');
for (const f of ['data.js', 'parts.js', 'physics.js', 'game.js']) require(path.join(__dirname, '..', 'www', 'js', f));
const DR = globalThis.DR;
DR.Game.state = DR.Game.defaults();
DR.CAREER.forEach((t, ti) => {
  console.log('== ' + t.name);
  t.opps.forEach((o, i) => {
    const inst = DR.Game.oppInst(o), S = DR.buildSpec(inst), r = DR.simulate(S, { skill: o.skill });
    const p = DR.simulate(S, {});
    console.log('  ', o.name.padEnd(18), DR.CARS[o.carId].name.padEnd(22), (S.peakHp + S.nosHp).toFixed(0).padStart(5) + 'hp',
      'ET(skill)', r.et.toFixed(2), '@', r.trap.toFixed(0), ' perfect', p.et.toFixed(2), r.crashed ? 'CRASH' : '', 'risk', S.risk.engine.toFixed(2), S.risk.trans.toFixed(2), S.risk.notes.join('; '));
  });
});
