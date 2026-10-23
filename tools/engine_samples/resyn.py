# Resynthesis A/B: take a real rev from a recording, drive the players with
# its tracked rpm and load, and compare what they make with the real thing.
# usage: resyn.py NAME WAV K RED LBANK_ID GBANK_ID [t0 dur] [outdir]
import sys, os, json, subprocess, numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly, butter, sosfiltfilt, sosfilt
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt

NAME, WAV, K, RED, LB, GB = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), sys.argv[5], sys.argv[6]
T0 = float(sys.argv[7]) if len(sys.argv) > 7 and sys.argv[7] != 'auto' else None
DUR = float(sys.argv[8]) if len(sys.argv) > 8 else 5.0
OUT = sys.argv[9] if len(sys.argv) > 9 else 'ab'
LBDIR = os.environ.get('LBDIR', 'lbanks')
os.makedirs(OUT, exist_ok=True)
SR, BL = 32000, 128
HERE = os.path.dirname(os.path.abspath(__file__))

def smooth(v, n):
    c = np.cumsum(np.pad(v, (n // 2, n - 1 - n // 2), mode='edge')); c = np.concatenate([[0], c]); return (c[n:] - c[:-n]) / n

sr0, x = wavfile.read(WAV); x = x.astype(np.float32); x = x.mean(1) if x.ndim > 1 else x; x /= np.abs(x).max() + 1e-9
x = resample_poly(x, 320, sr0 // 100).astype(np.float32)
x = sosfiltfilt(butter(2, 30, 'hp', fs=SR, output='sos'), x).astype(np.float32)
tr = np.load('tr/%s_%g.npz' % (os.path.basename(WAV)[:-4], K))
t, rpm = tr['t'], smooth(tr['f'], 5) / K * 60
if T0 is None:
    # the window that covers the widest confident rpm range (a full rev)
    best, T0 = -1, 0
    dr = np.abs(np.diff(rpm, prepend=rpm[0]))
    for a in np.arange(0, t[-1] - DUR, 0.25):
        m = (t >= a) & (t < a + DUR)
        if np.mean(tr['conf'][m] > 0.45) < 0.9: continue
        # a clean rev: no jumps the engine can't make (tracker slips)
        if np.percentile(dr[m], 99.5) > 160: continue
        sp = np.percentile(rpm[m], 97) - np.percentile(rpm[m], 3)
        q = sp * np.mean(tr['conf'][m])
        if q > best: best, T0 = q, a
m = (t >= T0) & (t < T0 + DUR)
seg = x[int(T0 * SR):int((T0 + DUR) * SR)]
nb = len(seg) // BL
tb = T0 + (np.arange(nb) + 0.5) * BL / SR
r_b = np.interp(tb, t, rpm)
sl = np.gradient(smooth(r_b, 25), BL / SR)
loud = np.interp(tb, t, tr['rms'] / (np.percentile(tr['rms'], 98) + 1e-9))
# load: pulling while the revs climb (or hold loud), coasting while they fall
ld = np.clip((loud - 0.15) / 0.5, 0, 1) * np.where(sl < -250, 0.3, 1.0) + np.where(sl > 250, 0.3, 0)
ld = np.clip(ld, 0, 1)
ld = smooth(ld, 12)
json.dump(dict(sr=SR, block=BL, rpm=r_b.tolist(), load=ld.tolist()), open(f'{OUT}/{NAME}_ctrl.json', 'w'))
wavfile.write(f'{OUT}/{NAME}_real.wav', SR, (seg / (np.abs(seg).max() + 1e-9) * 0.9 * 32767).astype(np.int16))
renders = {'real': seg[:nb * BL]}
for mode, bid, d in (('loops', LB, LBDIR), ('grains', GB, 'gbanks')):
    if bid == '-': continue
    fn = f'{OUT}/{NAME}_{mode}.wav'
    args = ['node', os.path.join(HERE, 'wk.js'), mode, f'{d}/{bid}.json', f'{d}/{bid}.wav', f'{OUT}/{NAME}_ctrl.json', fn]
    if mode == 'grains': args.append(os.environ['OLDSRC'])
    elif os.environ.get('WKSRC'): args.append(os.environ['WKSRC'])
    subprocess.run(args, check=True)
    _, y = wavfile.read(fn); renders[mode] = y.astype(np.float32) / 32768

# ---------------------------------------------------------------- metrics
cyc_ph = np.cumsum(np.interp(np.arange(nb * BL) / SR + T0, t, rpm) / 120) / SR   # engine cycles
bounds = np.flatnonzero(np.diff(np.floor(cyc_ph)) > 0)
BANDS = 1000 * 2 ** (np.arange(-10, 13) / 3); BANDS = BANDS[BANDS < 13000]
hp4 = butter(4, 4000, 'hp', fs=SR, output='sos')
def fluct(y):
    """how much the sound's loudness wobbles at 2-20 Hz (what the ear hears as
    choppiness / fluctuation), per band, relative to its level"""
    N, H = 512, 64
    fr = np.lib.stride_tricks.sliding_window_view(y, N)[::H] * np.hanning(N)
    S = np.abs(np.fft.rfft(fr, axis=1)) ** 2; f = np.fft.rfftfreq(N, 1 / SR)
    edges = np.geomspace(60, 12000, 21)
    out = []
    for lo, hi in zip(edges[:-1], edges[1:]):
        e = S[:, (f >= lo) & (f < hi)].sum(1) ** 0.23           # specific loudness ~ E^0.23
        lp = smooth(e, 20)[::5]                                  # 40 ms average -> 100 Hz
        tr_ = smooth(lp, 50)                                     # 0.5 s trend (rpm sweep)
        out.append(np.std(lp - tr_) / (np.mean(lp) + 1e-12))
    return float(np.mean(out))

def metrics(y):
    y = y / (np.sqrt(np.mean(y ** 2)) + 1e-9) * 0.1
    lv, sp = [], []
    for a, b in zip(bounds[:-1], bounds[1:]):
        c = y[a:b]
        if len(c) < 64: continue
        lv.append(10 * np.log10(np.mean(c ** 2) + 1e-12))
        Y = np.abs(np.fft.rfft(c * np.hanning(len(c)), 4096)) ** 2; f = np.fft.rfftfreq(4096, 1 / SR)
        e = np.array([Y[(f >= q / 2 ** (1 / 6)) & (f < q * 2 ** (1 / 6))].sum() + 1e-12 for q in BANDS])
        sp.append(10 * np.log10(e))
    lv = np.array(lv); sp = np.array(sp)
    dl = np.abs(np.diff(lv))                                # cycle-to-cycle level step, dB
    fl = np.sqrt(np.mean(np.diff(sp, axis=0) ** 2, axis=1))  # cycle-to-cycle spectral change, dB
    # clicks: 1 ms bursts of highs far above the local level
    h = sosfilt(hp4, y); w = SR // 1000
    e = np.sqrt(np.mean(h[:len(h) // w * w].reshape(-1, w) ** 2, axis=1))
    from scipy.ndimage import median_filter
    md = median_filter(e, 101) + 1e-9
    clicks = int(np.sum(e / md > 6)) / (len(y) / SR)
    mean_sp = 10 * np.log10(np.mean(10 ** (sp / 10), axis=0)); mean_sp -= mean_sp.mean()
    return dict(fluct=fluct(y), step_med=np.median(dl), step_p95=np.percentile(dl, 95), flux_med=np.median(fl), flux_p95=np.percentile(fl, 95), clicks=clicks), mean_sp
res = {}
ref_sp = None
for k, y in renders.items():
    mt, msp = metrics(y)
    if k == 'real': ref_sp = msp
    mt['timbre_err'] = float(np.sqrt(np.mean((msp - ref_sp) ** 2)))
    res[k] = {a: round(float(b), 2) for a, b in mt.items()}
print(NAME, 'T0', T0, 'rpm %d-%d' % (r_b.min(), r_b.max()))
for k, v in res.items(): print('  %-7s' % k, v)
json.dump(dict(T0=T0, res=res), open(f'{OUT}/{NAME}_metrics.json', 'w'))
# spectrograms
fig, ax = plt.subplots(len(renders), 1, figsize=(14, 3.2 * len(renders)), sharex=True)
for a, (k, y) in zip(ax, renders.items()):
    a.specgram(y + 1e-7, NFFT=1024, Fs=SR, noverlap=896, cmap='magma', vmin=-120)
    a.plot(tb - T0, r_b / 60 * K, 'c', lw=0.6, alpha=0.7); a.plot(tb - T0, r_b / 60 * K * 2, 'c', lw=0.4, alpha=0.5)
    a.set_ylim(0, 6000); a.set_title(k)
plt.tight_layout(); plt.savefig(f'{OUT}/{NAME}_spec.png', dpi=60)
