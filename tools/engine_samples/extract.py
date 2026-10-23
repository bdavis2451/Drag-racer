# Cut constant-pitch seamless loops at a ladder of rpm points from a tracked recording.
import numpy as np
from scipy.signal import butter, sosfiltfilt

def smooth(v, n):
    if n < 2: return v
    k = np.ones(n) / n
    return np.convolve(np.pad(v, (n // 2, n - 1 - n // 2), mode='edge'), k, mode='valid')

def candidates(tr, k, rpm_bin, mode, tol=0.10, min_rms=0.15):
    """frames near rpm_bin. mode: 'on' rising/steady at load, 'off' falling, 'idle' steady"""
    t, f, conf, rms = tr['t'], tr['f'], tr['conf'], tr['rms']
    rpm = smooth(f / k * 60, 5)
    dt = t[1] - t[0]
    slope = np.gradient(rpm, dt)
    loud = rms / (np.percentile(rms, 98) + 1e-9)
    near = np.abs(rpm - rpm_bin) / rpm_bin < tol
    ok = near & (conf > 0.35) & (loud > min_rms)
    if mode == 'on': ok &= slope > -400
    elif mode == 'off': ok &= (slope < 200) & (loud < 0.9)
    # score: confident, loud (for 'on'), and pitch close to the bin
    sc = conf * (0.5 + loud if mode == 'on' else 1) * (1 - np.abs(rpm - rpm_bin) / rpm_bin / tol * 0.5)
    sc[~ok] = 0
    if mode == 'on': sc *= 1 + np.clip(slope, 0, 3000) / 3000 * 0.3   # prefer real load (revving up)
    return sc, rpm, slope

def make_loop(x, sr, tr, k, i0, rpm_bin, dur=0.42, xf=0.07):
    """unwarp the pitch around frame i0 to a constant firing freq and loop it"""
    t, f = tr['t'], smooth(tr['f'], 3)
    fb = rpm_bin / 60 * k
    M = max(4, int(round(dur * fb))); C = max(2, int(round(xf * fb)))
    # source phase in cycles over sample time
    c0 = t[i0]
    # build phase around c0 out to +-1.5 s
    a = max(0, int((c0 - 1.5) * sr)); b = min(len(x), int((c0 + 1.5) * sr))
    tt = np.arange(a, b) / sr
    ff = np.interp(tt, t, f)
    ph = np.cumsum(ff) / sr
    ph -= np.interp(c0, tt, ph)
    need = M + 2 * C
    lo, hi = -need / 2, need / 2
    if ph[0] > lo or ph[-1] < hi: return None
    Lm = int(round(M / fb * sr)); Lc = int(round(C / fb * sr))
    Lout = Lm + 2 * Lc + 1
    php = lo + np.arange(Lout) * fb / sr
    src_t = np.interp(php, ph, tt)
    y = np.interp(src_t * sr - a, np.arange(b - a), x[a:b]).astype(np.float32)
    # deviation of the source pitch over the stretch used (pitch-shift amount)
    used = (tt >= src_t[0]) & (tt <= src_t[-1])
    dev = float(np.max(np.abs(ff[used] / fb - 1))) if used.any() else 1
    loop = y[Lc:Lc + Lm].copy()
    ramp = np.linspace(0, 1, Lc, endpoint=False).astype(np.float32)
    loop[:Lc] = y[Lc:2 * Lc] * ramp + y[Lc + Lm:Lc + Lm + Lc] * (1 - ramp)
    return loop, dev, M

def highpass(x, sr, hz=28):
    sos = butter(2, hz, 'hp', fs=sr, output='sos')
    return sosfiltfilt(sos, x).astype(np.float32)
