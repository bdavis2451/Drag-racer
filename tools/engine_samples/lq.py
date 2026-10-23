import json, numpy as np
from scipy.io import wavfile
def metrics(L, sr, k, rpm):
    seg = np.tile(L, max(1, int(1.0 * sr / len(L))))
    M = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2; f = np.fft.rfftfreq(len(seg), 1 / sr)
    fb = rpm / 60 * k
    band = (f > 30) & (f < 3000)
    def at(mult):
        e = 0
        for h in mult:
            m = np.abs(f - h * fb) < max(3, 0.02 * h * fb) ; e += M[m].sum()
        return e
    H = [h for h in range(1, int(3000 / fb) + 1)]
    # engines also put energy at half the firing rate (a cross-plane V8's
    # burble, odd-fire V10s), so harmonicity counts the half orders too
    harm = at([h / 2 for h in range(1, int(6000 / fb) + 1)]); odd = at([h for h in H if h % 2]); even = at([h for h in H if h % 2 == 0])
    half = at([h + 0.5 for h in range(0, int(3000 / fb))])
    tot = M[band].sum() + 1e-9
    return harm / tot, odd / (even + 1e-9), half / (harm + 1e-9)
if __name__ == '__main__':
    import glob, sys
    for fn in sorted(glob.glob('banks/*.json')):
        m = json.load(open(fn)); sr, x = wavfile.read(fn[:-5] + '.wav'); x = x.astype(float)
        out = []
        for rpm, on, t0, d in m['loops']:
            a = round(t0 * sr); b = round((t0 + d) * sr)
            h, oe, hf = metrics(x[a:b], sr, m['k'], rpm)
            out.append('%d%s:%.2f/%.1f' % (rpm, '+' if on else '-', h, oe))
        print(m['id'].ljust(13), ' '.join(out))
