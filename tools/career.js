// Prints every career event's opponents with their estimated ETs, so each
// stage ramps up and the bosses stay hardest.
const path = require('path');
for (const f of ['data.js', 'parts.js', 'physics.js', 'game.js', 'career.js']) require(path.join(__dirname, '..', 'www', 'js', f));
const DR = globalThis.DR;
DR.Game.state = DR.Game.defaults();
DR.STAGES.forEach((st, si) => {
  console.log('== Stage ' + (si + 1) + ': ' + st.name);
  st.all.forEach((ev) => {
    const T = DR.EVENT_TYPES[ev.type];
    const opps = ev.opps.map((o) => {
      const S = DR.buildSpec(DR.Game.oppInst(o)), r = DR.simulate(S, { skill: o.skill, dist: T.dist(), grip: T.grip });
      return o.name + ' ' + (r.crashed ? 'CRASH' : r.et.toFixed(2));
    });
    console.log('  ', (ev.type + (ev.stars ? ' ' + ev.stars + '*' : '')).padEnd(12), ('$' + ev.cash).padStart(7), ' ', opps.join(' | '), ev.unlocks.length ? '  -> ' + ev.unlocks.join(', ') : '');
  });
});
