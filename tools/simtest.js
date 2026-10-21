// Headless physics check: node tools/simtest.js [carId ...]
const path = require('path');
for (const f of ['data.js', 'parts.js', 'physics.js']) require(path.join(__dirname, '..', 'www', 'js', f));
const DR = globalThis.DR;
function run(inst, label) {
  const S = DR.buildSpec(inst);
  const r = DR.simulate(S, {});
  const s = r.splits;
  console.log((label || inst.carId).padEnd(22), 'hp', S.peakHp.toFixed(0).padStart(5), 'kg', S.m.toFixed(0).padStart(5), 'f', S.f.toFixed(2),
    '| 60ft', s['60ft'] ? s['60ft'].t.toFixed(2) : '-', ' 1/8', s['1/8'] ? s['1/8'].t.toFixed(2) : '-', ' ET', r.et.toFixed(2), '@', r.trap.toFixed(1),
    r.crashed ? 'CRASH' : '', 'wheelie', r.sim.wheelie ? 'Y' : '', 'peakhp', r.sim.peakHp.toFixed(0));
  return r;
}
module.exports = { run, DR };
if (require.main === module) {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(DR.CARS);
  for (const id of ids) run({ carId: id, engine: DR.CARS[id].engine, parts: {}, tune: {} });
}
