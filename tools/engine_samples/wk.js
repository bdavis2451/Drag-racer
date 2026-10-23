// Offline runner for the engine-sound worklets (no browser): renders a bank
// along an rpm/load curve.  usage:
//   node wk.js loops BANK.json BANK.wav CTRL.json OUT.wav [engsamples.js]
//   node wk.js grains BANK.json BANK.wav CTRL.json OUT.wav [old engsamples.js]
// CTRL.json: {sr: 32000, block: 128, rpm: [...], load: [...]} one value per block
const fs = require('fs');
const [mode, bankJ, bankW, ctrlJ, outW, src] = process.argv.slice(2);
function readWav(fn) {
  const b = fs.readFileSync(fn); let p = 12, sr = 0, data = null, bits = 16, ch = 1;
  while (p < b.length) {
    const id = b.toString('ascii', p, p + 4), sz = b.readUInt32LE(p + 4);
    if (id === 'fmt ') { ch = b.readUInt16LE(p + 10); sr = b.readUInt32LE(p + 12); bits = b.readUInt16LE(p + 22); }
    if (id === 'data') data = b.subarray(p + 8, p + 8 + sz);
    p += 8 + sz + (sz & 1);
  }
  const n = data.length / (bits / 8) / ch, x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = bits === 16 ? data.readInt16LE(i * 2 * ch) / 32768 : data.readFloatLE(i * 4 * ch);
  return { sr, x };
}
function writeWav(fn, x, sr) {
  const b = Buffer.alloc(44 + x.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(x[i] * 32767))), 44 + i * 2);
  fs.writeFileSync(fn, b);
}
const bank = JSON.parse(fs.readFileSync(bankJ)), wav = readWav(bankW), ctrl = JSON.parse(fs.readFileSync(ctrlJ));
const SR = ctrl.sr || wav.sr, BL = ctrl.block || 128;
globalThis.sampleRate = SR;
let Proc = null;
globalThis.AudioWorkletProcessor = class { constructor() { this.port = { postMessage() {}, onmessage: null }; } };
globalThis.registerProcessor = (name, cls) => { Proc = cls; };
let msg;
if (mode === 'loops') {
  globalThis.DR = { Audio: { loadWorklet: () => Promise.resolve(true), engineConfig: () => ({}), engine: () => null, update: () => {}, stopAll: () => {} } };
  eval(fs.readFileSync(src || require('path').join(__dirname, '..', '..', 'www', 'js', 'engsamples.js'), 'utf8'));
  DR.Audio.loopWorklet();
  msg = DR.Audio.bankMsg(bank, wav.x, wav.sr);
} else {
  const code = fs.readFileSync(src, 'utf8');
  const a = code.indexOf('function grainMain() {'), b = code.indexOf('  // load the grain worklet');
  eval('(' + code.slice(a, b) + ')()');
  const g = bank.grains, n = g.length, k = wav.sr / bank.sr;
  const arr = { s: new Float64Array(n), n: new Float64Array(n), rpm: new Float32Array(n), on: new Uint8Array(n), end: new Uint8Array(n) };
  for (let i = 0; i < n; i++) { arr.s[i] = g[i][0] * k; arr.n[i] = g[i][1] * k; arr.rpm[i] = g[i][2]; arr.on[i] = g[i][3]; arr.end[i] = g[i][4] ? 1 : 0; }
  msg = { pcm: wav.x, s: arr.s, n: arr.n, rpm: arr.rpm, on: arr.on, end: arr.end, xf: Math.round(wav.sr * 0.002), d: Math.round(wav.sr * 0.0006), cyc: Math.round(2 * bank.k) };
}
const p = new Proc();
p.port.onmessage({ data: msg });
const nb = ctrl.rpm.length, out = new Float32Array(nb * BL);
const buf = new Float32Array(BL);
for (let i = 0; i < nb; i++) {
  buf.fill(0);
  p.process([], [[buf]], { rpm: [ctrl.rpm[i]], load: [ctrl.load[i]], dop: [1], cut: [ctrl.cut ? ctrl.cut[i] : 0] });
  out.set(buf, i * BL);
}
writeWav(outW, out, SR);
