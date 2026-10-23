# Build an engine sample bank from one recording.
# usage: bank.py ID WAV K RED [octave_fix]
import sys, json, subprocess, base64, os, numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly
import track as T, extract as X
from lq import metrics

ID, WAV, K, RED = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
OCT = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0
OUT = 'banks'; os.makedirs(OUT, exist_ok=True)
tr = T.track(WAV, K, RED)
tr['f'] = tr['f'] * OCT
sr = 32000
x = X.highpass(resample_poly(tr['x'], 320, 441).astype(np.float32), sr)
rpm_all = X.smooth(tr['f'] / K * 60, 5)
# idle: the most common rpm among quiet, steady, confident frames
st = (np.abs(np.gradient(rpm_all)) < 15) & (tr['conf'] > 0.4)
idle = float(np.median(rpm_all[st & (rpm_all < 1400)])) if (st & (rpm_all < 1400)).sum() > 20 else 850.0
ladder = [idle]
r = max(idle * 1.35, 1300)
while r < RED * 0.97: ladder.append(r); r *= 1.3
ladder.append(RED * 0.95)
loops, report = [], []
for mode in ('on', 'off'):
    for rb in ladder:
        if mode == 'off' and (rb > RED * 0.8 or rb == idle): continue
        m = 'idle' if rb == idle else mode
        sc, _, _ = X.candidates(tr, K, rb, 'on' if m == 'idle' else mode)
        # the best few candidates, at least 0.3 s apart
        order, picked = np.argsort(-sc), []
        gapf = int(0.3 / (tr['t'][1] - tr['t'][0]))
        for i0 in order:
            if sc[i0] <= 0 or len(picked) >= 30: break
            if all(abs(i0 - p) > gapf for p in picked): picked.append(i0)
        best = None
        for i0 in picked:
            res = X.make_loop(x, sr, tr, K, int(i0), rb, dur=0.5 if m == 'idle' else min(0.36, max(0.12, 44 / (rb / 60 * K))), xf=0.07 if m == 'idle' else 0.035)
            if not res: continue
            lp, dev, M = res
            harm = metrics(lp, sr, K, rb)[0]
            if harm < 0.3: continue                    # mostly wind / road noise, or the wrong pitch
            # no dropouts or chopping: the level must stay steady through the loop
            w8 = int(0.008 * sr); env = np.sqrt(np.convolve(lp ** 2, np.ones(w8) / w8, 'valid')[::w8])
            if np.percentile(env, 5) < 0.3 * np.percentile(env, 95): continue
            # the pitch must really be flat: each quarter of the loop has to sit on the harmonics too
            qn = len(lp) // 4
            if min(metrics(lp[i * qn:(i + 1) * qn], sr, K, rb)[0] for i in range(4)) < max(0.22, 0.55 * harm): continue
            q = sc[i0] * (1 - min(0.9, dev * 3)) * min(1.0, harm)
            if best is None or q > best[0]: best = (q, lp, dev, float(tr['t'][i0]), harm)
        if best is None: report.append((mode, round(rb), 'none')); continue
        q, lp, dev, tc, harm = best
        if dev > (0.18 if rb < 3500 else 0.24): report.append((mode, round(rb), 'dev %.2f' % dev)); continue
        lp = lp / (np.sqrt(np.mean(lp ** 2)) + 1e-9) * 0.12
        loops.append(dict(rpm=round(rb), on=1 if mode == 'on' else 0, data=lp, t=tc, dev=dev))
        report.append((mode, round(rb), 'ok t=%.1f dev=%.2f q=%.2f h=%.2f' % (tc, dev, q, harm)))
        if m == 'idle' and mode == 'on':
            loops.append(dict(rpm=round(rb), on=0, data=lp, t=tc, dev=dev))   # idle serves both sets
for r_ in report: print(r_)
# pack at 32 kHz with gaps
SR2 = 32000; gap = np.zeros(int(0.12 * SR2), np.float32)
parts, meta, pos = [gap], [], len(gap)
for L in loops:
    d = L['data'].astype(np.float32)
    meta.append([L['rpm'], L['on'], round(pos / SR2, 6), round(len(d) / SR2, 6)])
    parts += [d, gap]; pos += len(d) + len(gap)
pcm = np.concatenate(parts)
pk = np.abs(pcm).max(); pcm = pcm / pk * 0.9
wavfile.write(f'{OUT}/{ID}.wav', SR2, (pcm * 32767).astype(np.int16))
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', f'{OUT}/{ID}.wav', '-c:a', 'libvorbis', '-q:a', '4', f'{OUT}/{ID}.ogg'], check=True)
json.dump(dict(id=ID, k=K, idle=round(idle), loops=meta, src=os.path.basename(WAV)), open(f'{OUT}/{ID}.json', 'w'))
print(ID, 'idle', round(idle), 'loops', len(meta), 'ogg', os.path.getsize(f'{OUT}/{ID}.ogg') // 1024, 'KB')
# diagnostic plot
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
fig, ax = plt.subplots(1, 1, figsize=(16, 4))
ax.plot(tr['t'], rpm_all, 'k', lw=0.7); ax.plot(tr['t'], tr['conf'] * RED * 0.3, 'g', lw=0.4)
for L in loops: ax.plot([L['t']], [L['rpm']], 'o' if L['on'] else 's', color='r' if L['on'] else 'b')
ax.set_ylim(0, RED * 1.1); ax.grid(True); plt.tight_layout(); plt.savefig(f'{OUT}/{ID}.png', dpi=55)
