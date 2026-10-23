# Firing-frequency tracker for engine recordings.
# usage: track.py wav k red [png]   (k = firing pulses per crank rev, red = redline rpm)
import sys, numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly
from scipy.ndimage import median_filter

def load(fn):
    sr, x = wavfile.read(fn)
    x = x.astype(np.float32)
    if x.ndim > 1: x = x.mean(1)
    x /= (np.abs(x).max() + 1e-9)
    return sr, x

def salience(x, sr, k, red, hop_s=0.0116):
    # analysis at 11025 Hz
    xa = resample_poly(x, 1, 4) if sr == 44100 else x
    sa = 11025
    N, Z = 2048, 8192
    hop = int(round(hop_s * sa))
    win = np.hanning(N).astype(np.float32)
    nfr = max(1, (len(xa) - N) // hop)
    fmin = 520 / 60 * k; fmax = red * 1.08 / 60 * k
    grid = fmin * 2 ** (np.arange(0, np.log2(fmax / fmin) * 96 + 1) / 96)
    H = 12
    w = 0.88 ** np.arange(H)
    binhz = sa / Z
    S = np.zeros((nfr, len(grid)), np.float32)
    rms = np.zeros(nfr, np.float32)
    idx = np.array([[h * f / binhz for f in grid] for h in range(1, H + 1)])     # H x G fractional bins
    half = np.array([[(h - 0.5) * f / binhz for f in grid] for h in range(1, H + 1)])
    for i in range(nfr):
        seg = xa[i * hop:i * hop + N] * win
        rms[i] = np.sqrt(np.mean(seg ** 2))
        M = np.abs(np.fft.rfft(seg, Z)) ** 0.5
        # whiten: only peaks standing above the local spectral floor count,
        # so wind and road roar don't pull the pitch down
        env = median_filter(M, size=31, mode='nearest') + 1e-9
        M = np.maximum(M / env - 1.0, 0)
        # local max over +-1 bin so harmonics slightly off the grid still count
        Mm = np.maximum(M, np.maximum(np.roll(M, 1), np.roll(M, -1)))
        def at(b):
            b = np.clip(b, 0, len(Mm) - 2); i0 = b.astype(int); fr = b - i0
            return Mm[i0] * (1 - fr) + Mm[i0 + 1] * fr
        hs = (w[:, None] * at(idx)).sum(0)
        hh = (w[:, None] * at(half)).sum(0)
        S[i] = hs - 0.6 * hh
        S[i] /= (np.abs(S[i]).max() + 1e-9)
    # a bin that is high all the time is a steady noise, not the engine
    S = S - 0.6 * np.median(S, axis=0, keepdims=True)
    t = (np.arange(nfr) * hop + N / 2) / sa
    return t, grid, S, rms

def viterbi(S, maxjump=10, pen=0.04):
    # maxjump in grid steps (1/96 octave); cost grows with the jump
    T, G = S.shape
    score = S[0].copy(); back = np.zeros((T, G), np.int32)
    offs = np.arange(-maxjump, maxjump + 1)
    for i in range(1, T):
        best = np.full(G, -1e9); arg = np.zeros(G, np.int32)
        for o in offs:
            sh = np.full(G, -1e9)
            if o >= 0: sh[o:] = score[:G - o] if o else score
            else: sh[:o] = score[-o:]
            v = sh - pen * abs(o) / maxjump
            m = v > best; best[m] = v[m]; arg[m] = (np.arange(G) - o)[m]
        score = best + S[i]; back[i] = arg
    path = np.zeros(T, np.int32); path[-1] = int(np.argmax(score))
    for i in range(T - 1, 0, -1): path[i - 1] = back[i, path[i]]
    return path

def track(fn, k, red):
    sr, x = load(fn)
    t, grid, S, rms = salience(x, sr, k, red)
    p = viterbi(S)
    f = grid[p]
    conf = S[np.arange(len(p)), p]
    return dict(sr=sr, x=x, t=t, f=f, conf=conf, rms=rms, grid=grid, S=S, k=k)

if __name__ == '__main__':
    fn, k, red = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
    r = track(fn, k, red)
    rpm = r['f'] / k * 60
    np.savez(sys.argv[4] + '.npz', t=r['t'], f=r['f'], conf=r['conf'], rms=r['rms'])
    try:
        import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
        fig, ax = plt.subplots(2, 1, figsize=(16, 6), sharex=True)
        ax[0].imshow(r['S'].T, aspect='auto', origin='lower', extent=[r['t'][0], r['t'][-1], 0, len(r['grid'])], cmap='magma')
        ax[0].plot(r['t'], np.searchsorted(r['grid'], r['f']), 'c', lw=0.8)
        ax[1].plot(r['t'], rpm, 'k', lw=0.8); ax[1].plot(r['t'], r['conf'] * 2000, 'g', lw=0.5); ax[1].plot(r['t'], r['rms'] / r['rms'].max() * 2000, 'r', lw=0.5)
        ax[1].set_ylim(0, red * 1.1); ax[1].grid(True)
        plt.tight_layout(); plt.savefig(sys.argv[4] + '.png', dpi=60)
    except ImportError as e:
        print('no matplotlib', e)
    print('rpm pct 5/50/95', np.percentile(rpm, [5, 50, 95]).round())
