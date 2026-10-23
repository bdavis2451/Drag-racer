# real exhaust pops in the recordings: short loud transients that stand well
# above the engine around them, with both a low body (the thump of gas
# leaving the pipe) and a crack on top
import numpy as np, glob, os, json
from scipy.io import wavfile
from scipy.signal import butter, sosfiltfilt, resample_poly
SR = 32000
lo = butter(4, [80, 700], 'bp', fs=SR, output='sos'); hi = butter(4, 1500, 'hp', fs=SR, output='sos')
out = []
for w in sorted(glob.glob('wav/*.wav')):
    sr, x = wavfile.read(w); x = x.astype(np.float32); x = x.mean(1) if x.ndim > 1 else x; x /= np.abs(x).max() + 1e-9
    x = resample_poly(x, 320, sr // 100).astype(np.float32)
    clip = np.abs(x) > 0.985
    def env(s, ms):
        n = int(SR * ms / 1000); c = np.cumsum(np.concatenate([[0], s.astype(np.float64) ** 2])); return np.sqrt((c[n:] - c[:-n]) / n)
    el = env(sosfiltfilt(lo, x), 6); eh = env(sosfiltfilt(hi, x), 3)
    hop = SR // 1000; el = el[::hop]; eh = eh[:len(el) * hop:hop][:len(el)]
    from scipy.ndimage import median_filter
    bl = median_filter(el, 151); bh = median_filter(eh, 151)
    rl = el / (bl + 1e-9); rh = eh / (bh + 1e-9)
    i = 0; n = len(rl)
    while i < n:
        if rl[i] > 3.0 and rh[i] > 4.0:
            j = i + np.argmax(rl[i:i + 30]); dur = np.argmax(rl[j:j + 200] < 1.6)
            a = j * hop
            if 8 < dur < 120 and not clip[max(0, a - 400):a + 1600].any():
                out.append(dict(src=os.path.basename(w)[:-4], t=round(a / SR, 3), rl=round(float(rl[j]), 1), rh=round(float(rh[i:i + 30].max()), 1), dur=int(dur)))
            i = j + 150
        else: i += 1
print(len(out))
json.dump(out, open('popcands.json', 'w'))
from collections import Counter; print(Counter(o['src'] for o in out).most_common(30))
