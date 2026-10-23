# Loop bank (NFSU2 / AEMS style): a ladder of seamless constant-rpm loops,
# one every ~10% of rpm, pulling (on) and coasting (off), cut from real
# recordings. Each loop is built from the stretches of the recording that
# pass through its rpm: every stretch is pitch-flattened to the exact rpm
# (time-warped along the tracked firing phase), the best are joined end to
# end with phase-aligned crossfades, and the end is blended into the start.
# usage: loops.py ID WAVS K RED      (WAVS joined with '+')
import sys, json, os, subprocess, re, numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly, butter, sosfilt, sosfiltfilt

ID, WAVS, K, RED = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
E = lambda k, d: float(os.environ.get(k, d))
SR = 32000
SP = E('SP', 1.10)            # ladder step
TOL = E('TOL', 0.06)          # a stretch counts for a point within +-6% rpm
DUR_ON, DUR_OFF = E('DUR_ON', 0.75), E('DUR_OFF', 0.55)
MINDUR = E('MINDUR', 0.25)    # less real audio than this: make it from a neighbour
OUT = os.environ.get('OUT', 'lbanks'); os.makedirs(OUT, exist_ok=True)
CYCF = 2 * K                  # firings per engine cycle
VERB = os.environ.get('VERB')

def smooth(v, n):
    if n < 2: return v
    c = np.cumsum(np.pad(v, (n // 2, n - 1 - n // 2), mode='edge'), dtype=np.float64)
    c = np.concatenate([[0], c]); return (c[n:] - c[:-n]) / n

# ------------------------------------------------------------------ sources
srcs = []
for si, w in enumerate(WAVS.split('+')):
    sr, x = wavfile.read(w)
    x = x.astype(np.float32); x = x.mean(1) if x.ndim > 1 else x
    x /= np.abs(x).max() + 1e-9
    x = resample_poly(x, SR // 100, sr // 100).astype(np.float32) if sr != SR else x
    x = sosfiltfilt(butter(2, 30, 'hp', fs=SR, output='sos'), x).astype(np.float32)
    tr = np.load('tr/%s_%g.npz' % (os.path.basename(w)[:-4], K))
    t, f = tr['t'], tr['f']
    # the tracker's grid is 1/96 octave: smooth the steps away (a straight
    # ramp survives a moving average unchanged)
    f = smooth(f, 5)
    rpm = f / K * 60
    slope = np.gradient(smooth(rpm, 5), t[1] - t[0])
    loud = tr['rms'] / (np.percentile(tr['rms'], 98) + 1e-9)
    fs = np.interp(np.arange(len(x)) / SR, t, f)
    ph = np.cumsum(fs, dtype=np.float64) / SR     # firing phase per sample
    srcs.append(dict(x=x, t=t, rpm=rpm, slope=slope, loud=loud, conf=tr['conf'], ph=ph, name=os.path.basename(w)))

# a pooled bank prefers its best-covered recording, so neighbouring loops
# mostly come from the same car
cover = []
for s in srcs:
    good = (s['conf'] > 0.4) & (s['loud'] > 0.2)
    cover.append(len(np.unique(np.round(np.log(s['rpm'][good]) / np.log(SP) * 2))))
rank = np.argsort(-np.array(cover))
spref = {int(si): 1.0 - 0.3 * min(3, r) for r, si in enumerate(rank)}

hp3k = butter(4, 3000, 'hp', fs=SR, output='sos')
# highs that jump far above the recording's usual level around them: a pop,
# a click, a door. Measured on the source (1 ms hop) against a 0.5 s median.
from scipy.ndimage import median_filter
for s in srcs:
    h = sosfilt(hp3k, s['x']).astype(np.float64); w = int(0.002 * SR); hop = SR // 1000
    c = np.cumsum(h ** 2); e = np.sqrt(np.maximum(c[w:] - c[:-w], 0)[::hop] / w)
    ed = e[::10]; md = median_filter(ed, size=51, mode='nearest')
    s['hfr'] = e / (np.interp(np.arange(len(e)) / 10, np.arange(len(md)), md) + 1e-9)
    s['hthr'] = max(3.5, 1.3 * float(np.percentile(s['hfr'], 99)))
def burst_src(s, a, b):
    seg = s['hfr'][a * 1000 // SR:max(a * 1000 // SR + 1, b * 1000 // SR)]
    return float(seg.max() / s['hthr']) if len(seg) else 0.0

def local_phase(s, a, b):
    """firing phase over samples a..b, refined from the tracker's estimate:
    the engine-cycle period is measured every third of a cycle by matching
    each cycle against the next (sample accurate where the tracker steps)"""
    x = s['x']; ph = s['ph'][a:b + 1]
    fs = np.diff(s['ph'][a:b + 2]) * SR                 # tracked firing freq per sample
    pts, per = [], []
    c = a
    while c < b:
        Nc = SR * CYCF / max(1.0, fs[min(len(fs) - 1, c - a)])
        n = int(Nc); lo = int(Nc * 0.9); hi = int(Nc * 1.1) + 2
        if c - n // 2 < 0 or c - n // 2 + hi + n >= len(x): c += max(1, n // 3); continue
        A = x[c - n // 2:c - n // 2 + n].astype(np.float64)
        B = x[c - n // 2 + lo:c - n // 2 + hi + n].astype(np.float64)
        m = 1 << int(np.ceil(np.log2(len(B) + n)))
        cc = np.fft.irfft(np.conj(np.fft.rfft(A, m)) * np.fft.rfft(B, m), m)[:hi - lo]
        e = np.cumsum(np.concatenate([[0], B ** 2])); en = np.sqrt((e[n:n + hi - lo] - e[:hi - lo]) * np.dot(A, A) + 1e-12)
        r = cc / en; k = int(np.argmax(r))
        if r[k] > 0.35 and 0 < k < len(r) - 1:
            d = 0.5 * (r[k - 1] - r[k + 1]) / (r[k - 1] - 2 * r[k] + r[k + 1] + 1e-12)
            pts.append(c); per.append(lo + k + d)
        c += max(1, n // 3)
    if len(per) < 3: return ph
    per = np.array(per); per = np.maximum(per, 1)
    # one bad match shouldn't bend the pitch: median of three
    pm = per.copy(); pm[1:-1] = np.median(np.stack([per[:-2], per[1:-1], per[2:]]), axis=0)
    # trust the refined period only where it agrees with the tracker (+-6%)
    ft = np.interp(pts, np.arange(a, b + 1), fs[:b - a + 1])
    fr = SR * CYCF / pm
    ok = np.abs(np.log(fr / ft)) < 0.06
    if ok.sum() < 3: return ph
    f = np.interp(np.arange(a, b + 1), np.array(pts)[ok], fr[ok])
    return ph[0] + np.concatenate([[0], np.cumsum(f[:-1]) / SR])

def flatten(s, i0, i1, P):
    """stretch of frames i0..i1 of source s, time-warped to a constant P rpm"""
    fP = P / 60 * K
    a = int(s['t'][i0] * SR); b = min(len(s['x']) - 2, int(s['t'][i1] * SR))
    if b - a < 64: return None
    ph = local_phase(s, a, b) if REFINE else s['ph'][a:b + 1]
    n = int((ph[-1] - ph[0]) / fP * SR)
    if n < 64: return None
    target = ph[0] + np.arange(n) * fP / SR
    pos = np.interp(target, ph, np.arange(a, b + 1, dtype=np.float64))
    # read through a 4x oversampled copy: near band-limited interpolation
    lo = int(pos[0]) - 8; hi = int(pos[-1]) + 9
    up = resample_poly(s['x'][max(0, lo):hi], 4, 1)
    return np.interp((pos - max(0, lo)) * 4, np.arange(len(up)), up).astype(np.float32)
REFINE = E('REFINE', 1) > 0

def periodicity(y, N):
    """how well a stretch repeats at its engine cycle, or at its firing
    period (smooth many-cylinder engines repeat best pulse to pulse)"""
    best = 0.0
    for lag in (N, N / CYCF, 2 * N / CYCF):
        L = int(round(lag))
        if L < 8 or len(y) < L + max(64, L // 4): continue
        u, v = y[:-L], y[L:]
        best = max(best, float(np.dot(u, v) / (np.linalg.norm(u) * np.linalg.norm(v) + 1e-9)))
    return best

def stretches(P, layer, tol=TOL):
    """runs of frames near P, as (score, src, i0, i1)"""
    out = []
    for si, s in enumerate(srcs):
        r, sl, ld, cf = s['rpm'], s['slope'], s['loud'], s['conf']
        dev = np.abs(np.log(r / P))
        ok = (dev < tol) & (cf > 0.35) & (ld > 0.1)
        if layer == 'on': ok &= (sl > 250) | ((np.abs(sl) <= 250) & (ld > 0.4))
        else: ok &= (sl < -250) | ((np.abs(sl) <= 250) & (ld <= 0.4))
        idx = np.flatnonzero(np.diff(np.concatenate([[0], ok.astype(np.int8), [0]])))
        for i0, i1 in zip(idx[::2], idx[1::2] - 1):
            if i1 - i0 < 2: continue
            span = (i1 - i0) * (s['t'][1] - s['t'][0])
            sc = (0.55 + 0.45 * min(1.0, span / 0.3)) * float(np.mean(cf[i0:i1 + 1]) * np.mean(np.minimum(1, ld[i0:i1 + 1] * 2.5)) * (1 - 0.5 * np.mean(dev[i0:i1 + 1]) / tol)) * spref[si]
            out.append((sc, si, int(i0), int(i1)))
    return sorted(out, reverse=True)

def xcorr_best(a, b, maxlag):
    """lag in [0, maxlag) where b[lag:lag+len(a)] best matches a"""
    C = len(a); n = 1 << int(np.ceil(np.log2(C + maxlag + C)))
    seg = b[:maxlag + C]
    A = np.fft.rfft(a[::-1], n); B = np.fft.rfft(seg, n)
    cc = np.fft.irfft(A * B, n)[C - 1:C - 1 + maxlag]
    e = np.cumsum(np.concatenate([[0], seg.astype(np.float64) ** 2]))
    en = np.sqrt(np.maximum(e[C:C + maxlag] - e[:maxlag], 1e-12) * (np.dot(a, a) + 1e-12))
    sc = cc[:len(en)] / en
    k = int(np.argmax(sc)); return k, float(sc[k])

def env_db(seg):
    n = 2048; acc = np.zeros(n // 2 + 1); cnt = 0
    for o in range(0, max(1, len(seg) - n), n // 2):
        fr = seg[o:o + n]
        if len(fr) < n: fr = np.pad(fr, (0, n - len(fr)))
        acc += np.abs(np.fft.rfft(fr * np.hanning(n))) ** 2; cnt += 1
    e = 10 * np.log10(acc / max(1, cnt) + 1e-12)
    return smooth(e, 31)

def eq_to(seg, cur, tgt, lim=6.0):
    corr = np.clip(tgt - cur, -lim, lim)
    n = len(seg); m = 1 << int(np.ceil(np.log2(n + 4096)))
    S = np.fft.rfft(np.pad(seg, (2048, m - n - 2048), mode='wrap'))
    g = 10 ** (np.interp(np.linspace(0, 1, len(S)), np.linspace(0, 1, len(corr)), corr) / 20)
    return np.fft.irfft(S * g, m)[2048:2048 + n].astype(np.float32)

def xfade(r, c):
    """fade-out / fade-in curves for a join whose two sides correlate by c:
    amplitude-complementary when alike, power-complementary when not"""
    c = float(np.clip(c, 0, 1)); a = np.cos(r * np.pi / 2); b = np.sin(r * np.pi / 2)
    g = 1 / np.sqrt(1 + 2 * c * a * b)        # keeps the summed level even
    return (a * g).astype(np.float32), (b * g).astype(np.float32)

def cstep(y, N):
    """median level change from one engine cycle to the next, dB"""
    n = int(len(y) // N)
    if n < 3: return 0.0
    lv = [10 * np.log10(np.mean(y[int(i * N):int((i + 1) * N)] ** 2) + 1e-12) for i in range(n)]
    return float(np.median(np.abs(np.diff(lv))))

def detrend(y, N):
    """take out a stretch's crescendo (revs climbing get louder): fit a line
    to its per-cycle level in dB and undo it, so joined stretches don't make
    a sawtooth of level"""
    n = int(len(y) // N)
    if n < 2: return y
    c = (np.arange(n) + 0.5) * N
    lv = np.array([10 * np.log10(np.mean(y[int(i * N):int((i + 1) * N)] ** 2) + 1e-12) for i in range(n)])
    a, b = np.polyfit(c, lv, 1)
    g = 10 ** (-(a * np.arange(len(y)) + b - lv.mean()) / 20)
    return (y * g).astype(np.float32)

def cyc_levels(y, N, half=True):
    """level of each engine cycle (or half cycle at low rpm), dB, and its span"""
    W = N / 2 if half and N > 0.04 * SR else N
    n = int(len(y) // W)
    return [(10 * np.log10(np.mean(y[int(i * W):int((i + 1) * W)] ** 2) + 1e-12), int(i * W), int((i + 1) * W)) for i in range(n)], W

def clean_runs(y, N, drop=4.5):
    lv, W = cyc_levels(y, N)
    if len(lv) < 3: return [(0, len(y))]
    med = np.median([q[0] for q in lv]); bad = [q[0] < med - drop for q in lv]
    if not any(bad): return [(0, len(y))]
    runs, st = [], 0
    for i, b in enumerate(bad):
        if b:
            if i > st: runs.append((lv[st][1], lv[i - 1][2]))
            st = i + 1
    if st < len(lv): runs.append((lv[st][1], len(y)))
    return runs

# how much a loop's voice wobbles by itself (its spectral shape, level taken
# out, moving at 2-20 Hz): a loop stitched from stretches that don't quite
# agree, held at one rpm (a 2-step, the limiter), sounds like a garbled word
def wobble(y):
    z = np.tile(y, int(np.ceil(1.6 * SR / len(y))) + 1)[:int(1.6 * SR)]
    N, H = 2048, 320
    fr = np.lib.stride_tricks.sliding_window_view(z, N)[::H] * np.hanning(N)
    S_ = np.abs(np.fft.rfft(fr, axis=1)) ** 2; f = np.fft.rfftfreq(N, 1 / SR)
    ed = np.geomspace(150, 6000, 13)
    B = np.stack([S_[:, (f >= a) & (f < b)].sum(1) for a, b in zip(ed[:-1], ed[1:])], 1)
    Ld = 10 * np.log10(B + 1e-12); Ld = Ld - Ld.mean(1, keepdims=True)
    sh = np.stack([smooth(Ld[:, i], 5) for i in range(Ld.shape[1])], 1)
    w = sh - np.stack([smooth(sh[:, i], 50) for i in range(sh.shape[1])], 1)
    return float(np.mean(np.std(w[25:-25], 0)))
def build(P, layer):
    if P > E('REALCAP', 1e9): return None
    dur = DUR_ON if layer == 'on' else DUR_OFF
    N = SR * 120 / P                       # engine cycle, samples
    C = int(np.clip(N, 0.015 * SR, 0.05 * SR))
    cands = stretches(P, layer) + [c for c in stretches(P, layer, TOL * 1.7) if c[0] > 0]
    def gather(cands):
        pieces, got, used, taken = [], 0, [], []
        for sc, si, i0, i1 in cands:
            if got >= dur * SR + C or len(pieces) >= 10: break
            if any(si == q and i0 <= b1 and i1 >= a1 for q, a1, b1 in taken): continue
            y = flatten(srcs[si], i0, i1, P)
            if y is None or len(y) < max(E("MINCYC", 2.0) * N, 2 * C + 16): continue
            pr = periodicity(y, N)
            if pr < E('PMIN', 0.4): continue
            if burst_src(srcs[si], int(srcs[si]['t'][i0] * SR), int(srcs[si]['t'][i1] * SR)) > 1: continue
            y = detrend(y, N)
            if cstep(y, N) > E('CSTEP', 1.5): continue      # rough: level jumps cycle to cycle
            # a cycle that drops well below the rest (a gear change, a limiter
            # cut, a misfire) would be a hole in the loop: keep the runs between
            for a_, b_ in clean_runs(y, N):
                seg = y[a_:b_]
                if len(seg) < max(E("MINCYC", 2.0) * N, 2 * C + 16) or got >= dur * SR + C: continue
                seg = seg / (np.sqrt(np.mean(seg ** 2)) + 1e-9) * 0.1
                pieces.append(seg[:int(dur * SR + 3 * C + N) - got]); got += len(pieces[-1]) - C
            taken.append((si, i0, i1))
            used.append((srcs[si]['name'][:8], round(len(y) / SR, 2), round(pr, 2), round(cstep(detrend(y, N), N), 2)))
        return pieces, got, used
    # one car per loop: stretches of different cars strung together change
    # voice every tenth of a second, which held at one rpm repeats like a
    # garbled word. The recording with the most material here (preferring
    # the bank's main one) is used; another only if it has none.
    def assemble(pieces, used):
        # timbre: each stretch toward the loop's average
        envs = [env_db(p) for p in pieces]; me = np.mean(envs, axis=0)
        pieces = [eq_to(p, e, me, 6.0) for p, e in zip(pieces, envs)]
        # join, each next stretch started at the offset whose waveform best
        # continues the last one (keeps the firing pulses in step)
        y = pieces[0]
        for p in pieces[1:]:
            lag, c = xcorr_best(y[-C:], p, min(int(N) + 1, len(p) - C - 1))
            b = p[lag:]
            r = np.linspace(0, 1, C, endpoint=False).astype(np.float32)
            fo, fi = xfade(r, c)
            y = np.concatenate([y[:-C], y[-C:] * fo + b[:C] * fi, b[C:]])
        # close the loop: an end point whose continuation looks like the start
        if len(y) < 2 * C + N + 8: return None
        r = np.linspace(0, 1, C, endpoint=False).astype(np.float32)
        best = None
        # the loop holds exactly a whole number of engine cycles, so its pitch
        # is exact and every loop keeps the engine's cycle phase; of the last few
        # cycle ends, the one that blends into the start best is used
        j0 = int((len(y) - C - 1) // N)
        for back in range(0, 4):
            j = j0 - back
            if j < 3 or (back and j * N < 2 * C + N): break     # 3+ cycles: one cycle over and over is a buzz
            L = int(round(j * N))
            if L < C or L + C > len(y): continue
            a_, b_ = y[:C], y[L:L + C]
            c = float(np.dot(a_, b_) / (np.linalg.norm(a_) * np.linalg.norm(b_) + 1e-9))
            fo, fi = xfade(r, c)
            cand = y[:L].copy(); cand[:C] = y[L:L + C] * fo + y[:C] * fi
            lv = [q[0] for q in cyc_levels(np.concatenate([cand[-int(2 * N):], cand[:int(2 * N)]]), N)[0]]
            dip = (np.median(lv) - min(lv)) if lv else 0
            sc = c - 0.15 * max(0, dip - 2)
            if best is None or sc > best[0]: best = (sc, cand)
        if best is None: return None
        loop = best[1]
        if periodicity(np.concatenate([loop, loop]), N) < E('LPMIN', 0.3): return None   # no clear pitch
        return dict(y=loop, rpm=P, real=True, used=used, per=cstep(np.concatenate([loop, loop]), N))
    amt = {}
    for sc, si, i0, i1 in cands: amt[si] = amt.get(si, 0) + (i1 - i0) * spref[si]
    # first recording (in that order) whose loop is steady enough; else the
    # steadiest one made
    best = None
    for si in sorted(amt, key=lambda q: -amt[q])[:int(E('MAXSRC', 4))]:
        pieces, got, used = gather([c for c in cands if c[1] == si])
        if got < MINDUR * SR or not pieces: continue
        lp = assemble(pieces, used)
        if lp is None: continue
        lp['wob'] = wobble(lp['y'])
        if best is None or lp['wob'] < best['wob']: best = lp
        if lp['wob'] <= E('WOBMAX', 1.5): break
    return best

def psola(base, P0, P1):
    """re-space a constant-pitch loop's firing pulses from P0 to P1 rpm
    (pitch-synchronous overlap-add: each pulse keeps its shape and the
    pipe's resonance; only the firing rate changes)"""
    T0 = SR * 60 / (P0 * K); T1 = SR * 60 / (P1 * K)
    L0 = len(base); nf = max(1, int(round(L0 / T0)))
    nf = max(1, int(round(L0 / (T0 * CYCF)))) * int(round(CYCF))   # whole engine cycles
    T0 = L0 / nf                                  # exact firing spacing in the loop
    # marks on the pulses: the energy peak near each nominal firing
    env = smooth(np.abs(base).astype(np.float64), max(3, int(T0 / 6)))
    env3 = np.concatenate([env, env, env])
    fold = np.zeros(64)
    for m in range(nf):
        idx = (m * T0 + np.arange(64) * T0 / 64).astype(int) % L0
        fold += env[idx]
    ph0 = np.argmax(fold) / 64 * T0               # where pulses sit within a firing
    marks = []
    for m in range(nf):
        c = ph0 + m * T0; w = int(T0 / 4)
        seg = env3[int(c) + L0 - w:int(c) + L0 + w + 1]
        marks.append(c - w + int(np.argmax(seg)) if len(seg) else c)
    marks = np.array(marks)
    nout = nf                                      # same firings: loops stay whole
    L1 = int(round(nout * T1)); T1 = L1 / nout
    ext = np.concatenate([base, base, base])
    h = int(np.ceil(T0)); win = np.hanning(2 * h).astype(np.float32)
    out = np.zeros(L1 + 4 * h + 8); ws = np.zeros_like(out)
    for m in range(-3, nout + 3):
        mm = m % nf; wrap = (m - mm) // nf
        sm = marks[mm] + wrap * L0
        dev = (sm - (ph0 + m * T0)) * T1 / T0     # keep each pulse's timing quirk
        s0 = int(round(sm)) + L0 - h
        o0 = int(round(2 * h + ph0 * T1 / T0 + m * T1 + dev)) - h
        if o0 < 0 or o0 + 2 * h > len(out) or s0 < 0 or s0 + 2 * h > len(ext): continue
        out[o0:o0 + 2 * h] += ext[s0:s0 + 2 * h] * win; ws[o0:o0 + 2 * h] += win
    y = out / np.maximum(ws, 0.3)
    # fold the wrapped margins back so the loop is seamless
    yy = y[2 * h:2 * h + L1].copy()
    return yy.astype(np.float32)

from scipy.signal import resample as fft_resample
def extend(base, P0, P1):
    """a loop at P1 rpm made from a real one at P0: part re-spaced pulses,
    part plain speed-up (EXT_RS = share of the change done by resampling)"""
    r = P1 / P0; a = E('EXT_RS', 0.3)
    rs = r ** a; Pm = P0 * r / rs
    y = psola(base, P0, Pm) if abs(r / rs - 1) > 0.003 else base
    if abs(rs - 1) > 0.003:
        n = max(16, int(round(len(y) / rs)))
        y = fft_resample(y, n).astype(np.float32)   # cyclic: the loop point stays clean
    tilt = E('EXT_TILT', 0.0) * np.log2(r)           # dB per octave of rpm change, above 1 kHz
    if abs(tilt) > 0.05:
        Y = np.fft.rfft(y); f = np.fft.rfftfreq(len(y), 1 / SR)
        Y *= 10 ** (tilt * np.log2(np.maximum(f, 1000) / 1000) / 20)
        y = np.fft.irfft(Y, len(y)).astype(np.float32)
    return y

def level(y, N, strength):
    """even out the loop's loudness from one engine cycle to the next (a
    cyclic moving RMS one cycle long), keeping the shape within each cycle"""
    n = max(8, min(len(y), int(round(N)))); yy = np.concatenate([y[-n:], y, y[:n]]).astype(np.float64)
    c = np.cumsum(np.concatenate([[0], yy ** 2]))
    e = np.sqrt((c[n:] - c[:-n]) / n)[n // 2:n // 2 + len(y)] + 1e-9
    return (y * (np.sqrt(np.mean(y ** 2)) / e) ** strength).astype(np.float32)

def cycle_corr(a, ma, b, mb, rng=np.random.default_rng(7)):
    """how alike two phase-aligned loops sound mixed: correlation between
    random engine cycles of each (sets the crossfade law)"""
    Na, Nb = len(a) / ma, len(b) / mb; acc = []
    for _ in range(24):
        i, j = rng.integers(ma), rng.integers(mb)
        u = np.interp(i * Na + np.arange(1024) * Na / 1024, np.arange(len(a)), a)
        v = np.interp(j * Nb + np.arange(1024) * Nb / 1024, np.arange(len(b)), b)
        u -= u.mean(); v -= v.mean(); acc.append(np.dot(u, v) / (np.linalg.norm(u) * np.linalg.norm(v) + 1e-9))
    return float(np.clip(np.mean(acc), 0, 0.95))

def cycle_shape(y, m):
    """the loop's average engine cycle, 512 points"""
    N = len(y) / m; acc = np.zeros(512)
    for c in range(m):
        acc += np.interp(c * N + np.arange(512) * N / 512, np.arange(len(y) + 1), np.concatenate([y, y[:1]]))
    acc -= acc.mean(); return acc / (np.linalg.norm(acc) + 1e-9)

def align(y, m, ref):
    """rotate a loop so its engine cycle lines up with ref's (pulses in step
    while two loops crossfade)"""
    sh = cycle_shape(y, m)
    cc = np.fft.irfft(np.fft.rfft(ref) * np.conj(np.fft.rfft(sh)), 512)
    k = int(np.argmax(cc))
    return np.roll(y, int(round(k / 512 * len(y) / m)))

lo_rpm = 650
ladder = [lo_rpm * SP ** i for i in range(60) if lo_rpm * SP ** i <= RED * 1.06]
bank = {'on': {}, 'off': {}}
for layer in ('on', 'off'):
    top = RED * 1.06 if layer == 'on' else RED * 0.92
    for P in ladder:
        if P > top: continue
        lp = build(P, layer)
        if lp: bank[layer][round(P)] = lp
# clicks (a clipped mic, a stone, a pop) would come round every loop: where
# the highs burst far above the loop's usual level for a millisecond or two,
# turn just the highs down there
hp_dc = butter(4, 3500, 'hp', fs=SR, output='sos')
def declick(y, thr=E('DECLICK', 3.5)):
    n = len(y); y3 = np.concatenate([y, y, y]).astype(np.float64)
    h = sosfiltfilt(hp_dc, y3)
    w = SR // 1000; c = np.cumsum(np.concatenate([[0], h ** 2]))
    e = np.sqrt(np.maximum(c[w:] - c[:-w], 0) / w); e = np.concatenate([e, np.full(w, e[-1])])[:len(h)]
    med = np.median(e[n:2 * n]) + 1e-9
    g = np.minimum(1.0, thr * med / (e + 1e-12))
    # spread each dip so the gain moves smoothly (no new clicks)
    from scipy.ndimage import minimum_filter1d
    g = smooth(minimum_filter1d(g, 2 * w), w)
    out = y3 - h * (1 - g)
    return out[n:2 * n].astype(np.float32)
def _dbg(tag):
    if os.environ.get('PDBG'):
        print(tag, [(k, round(periodicity(np.concatenate([lp['y'], lp['y']]), SR * 120 / k), 2)) for k, lp in sorted(bank['on'].items())][:8])
_dbg('built')
for layer in ('on', 'off'):
    for k_, lp in bank[layer].items(): lp['y'] = declick(lp['y'])
_dbg('declick')
for layer in ('on', 'off'):
    for k_ in list(bank[layer]):
        bank[layer][k_]['wob'] = wobble(bank[layer][k_]['y'])
    # the unsteady ones are remade from a steady neighbour (if enough are left)
    # (relative to the bank: a boxer's burble is a wobble that is its voice;
    # only the loops much rougher than the engine's others go)
    wv = [lp['wob'] for lp in bank[layer].values()]
    thr = max(E('WOBMAX', 1.5), 1.35 * float(np.median(wv))) if wv else 9
    rough = [k_ for k_, lp in bank[layer].items() if lp['wob'] > thr]
    if len(bank[layer]) - len(rough) >= 4 and not os.environ.get('NODROP'):
        for k_ in rough: del bank[layer][k_]
    if VERB: print(layer, 'dropped unsteady', rough, sorted((k_, round(lp['wob'], 2)) for k_, lp in bank[layer].items()))
# fill gaps and the top from the nearest real loop below (or above): the
# closest, longest and steadiest
for layer in ('on', 'off'):
    real = sorted(bank[layer])
    if not real: continue
    top = RED * 1.06 if layer == 'on' else RED * 0.92
    for P in ladder:
        Pr = round(P)
        if P > top or Pr in bank[layer] or P < real[0] / 1.3: continue
        near = min(real, key=lambda q: abs(np.log(q / P)) * 3 - min(0.9, len(bank[layer][q]['y']) / SR) * 0.6 + 0.5 * bank[layer][q]['wob'])
        if abs(np.log(near / P)) > np.log(E('MAXEXT', 2.2)): continue
        lp = bank[layer][near]
        bank[layer][Pr] = dict(y=extend(lp['y'], lp['rpm'], P), rpm=P, real=False, used=['from %d' % near], per=0)
# a short loop repeats its few cycles several times a second (a flutter):
# lengthen it by stringing its own engine cycles together in a shuffled
# order. Every cycle is the same length and in the same phase, so each joins
# the next on a short crossfade.
def lengthen(y, P, target=E('LMIN', 0.45), seed=0, force=False):
    N = SR * 120 / P; m = max(1, int(round(len(y) / N)))
    if force: target = max(target, len(y) / SR)
    if (len(y) >= target * SR and not force) or m < 3: return y
    N = len(y) / m; X = max(8, int(N / 4))
    rng = np.random.default_rng(seed + int(P)); M = int(np.ceil(target * SR / N))
    order, last = [], -1
    while len(order) < M:
        p = list(rng.permutation(m))
        if p[0] == last: p = p[1:] + p[:1]
        order += p; last = order[-1]
    order = order[:M]
    if order[-1] == order[0] and M > 2: order[-1], order[-2] = order[-2], order[-1]
    yy = np.concatenate([y, y])
    L = int(round(M * N)); out = np.zeros(L + X + 2, np.float64)
    r = np.linspace(0, 1, X, endpoint=False)
    for j, c in enumerate(order):
        a = int(round(c * N)); o = int(round(j * N))
        seg = yy[a:a + int(round(N)) + X].astype(np.float64)
        w = np.ones(len(seg)); w[:X] = r; w[-X:] = 1 - r
        if j == 0: w[:X] = 1                    # the wrap blend is added below
        out[o:o + len(seg)] += seg * w
    # wrap: the tail past L overlaps the start
    tail = out[L:L + X].copy(); out[:X] = out[:X] * r + tail
    return out[:L].astype(np.float32)
for layer in ('on', 'off'):
    for k_, lp in bank[layer].items():
        # loops made from the same real one would comb against each other
        # when two play together (a flanging, talking sound): each gets its
        # cycles in its own order
        if not lp.get('borrowed'): lp['y'] = lengthen(lp['y'], lp['rpm'], force=not lp['real'])
# a layer missing at an rpm the other layer has: borrow it
for layer, other in (('on', 'off'), ('off', 'on')):
    for Pr, lp in list(bank[other].items()):
        if Pr not in bank[layer] and lp['real'] and (layer == 'on' or Pr < RED * 0.92) and not bank[layer]:
            bank[layer][Pr] = lp
_dbg('lengthen')
# smooth timbre along the ladder: each loop's spectral shape is EQ'd onto a
# smooth trend over rpm (a local straight-line fit across the neighbouring
# loops), so sweeping the revs glides through one engine's voice instead of
# hopping between colours, and each loop is set to the same perceived
# loudness (energy above ~300 Hz, which the ear weighs most; plain RMS is all
# bass and let the highs jump 10-18 dB between neighbours)
hp_loud = butter(2, 300, 'hp', fs=SR, output='sos')
def loudness(y):
    h = sosfiltfilt(hp_loud, np.concatenate([y, y, y]).astype(np.float64))[len(y):2 * len(y)]
    return float(np.sqrt(np.mean(h ** 2)) + 1e-9)
for layer in ('on', 'off'):
    ks = sorted(bank[layer])
    if not ks: continue
    envs = np.array([env_db(bank[layer][k]['y']) for k in ks])
    shp = envs - envs.mean(1, keepdims=True)                       # shape, level removed
    x = np.log(np.array(ks, float)) / np.log(SP)                    # ladder steps
    sig = E('TSMW', 2.0)
    for j, k in enumerate(ks):
        w = np.exp(-0.5 * ((x - x[j]) / sig) ** 2)
        X = np.stack([np.ones_like(x), x - x[j]], 1); WX = X * w[:, None]
        coef = np.linalg.lstsq(WX.T @ X + 1e-6 * np.eye(2), WX.T @ shp, rcond=None)[0]
        tgt = coef[0]                                               # the trend's value here
        y = bank[layer][k]['y']
        # EQ a wrapped copy so the loop point stays seamless
        yy = eq_to(np.concatenate([y, y, y]), shp[j], tgt, E('TSML', 10.0))[len(y):2 * len(y)]
        yy = level(yy, SR * 120 / k, E('LEVEL', 0.7))
        bank[layer][k]['y'] = (yy / loudness(yy) * 0.04).astype(np.float32)

_dbg('eq')
# whole engine cycles per loop, and the exact rpm that makes
for layer in ('on', 'off'):
    for k, lp in bank[layer].items():
        NP = SR * 120 / lp['rpm']; lp['m'] = max(1, int(round(len(lp['y']) / NP)))
        # resample (cyclically) to exactly m cycles at the loop's rpm
        n_ = int(round(lp['m'] * NP))
        if n_ != len(lp['y']): lp['y'] = fft_resample(lp['y'], n_).astype(np.float32)
        lp['rpm_eff'] = SR * 120 * lp['m'] / len(lp['y'])
_dbg('resample')
# line every loop's engine cycle up with its neighbour's, so two loops
# crossfading (or pulling and coasting blending) fire in step
ref = None
for k in sorted(bank['on']):
    lp = bank['on'][k]
    if ref is not None: lp['y'] = align(lp['y'], lp['m'], ref)
    ref = cycle_shape(lp['y'], lp['m'])
for k in sorted(bank['off']):
    lp = bank['off'][k]
    if bank['on']:
        q = min(bank['on'], key=lambda z: abs(np.log(z / k)))
        lp['y'] = align(lp['y'], lp['m'], cycle_shape(bank['on'][q]['y'], bank['on'][q]['m']))
for layer in ('on', 'off'):
    ks = sorted(bank[layer])
    for a_, b_ in zip(ks[:-1], ks[1:]):
        A_, B_ = bank[layer][a_], bank[layer][b_]
        A_['rho'] = cycle_corr(A_['y'], A_['m'], B_['y'], B_['m'])
pcm, table, pos = [np.zeros(64, np.float32)], [], 64
for li, layer in enumerate(('off', 'on')):
    for k in sorted(bank[layer]):
        y = bank[layer][k]['y']
        table.append([pos, len(y), round(bank[layer][k]['rpm_eff'], 2), li, 1 if bank[layer][k]['real'] else 0, bank[layer][k]['m'], round(bank[layer][k].get('rho', 0), 3)])
        # a few wrapped samples after each loop let playback interpolate across the seam
        pcm.append(y); pcm.append(y[:8]); pos += len(y) + 8
        if VERB: print(layer, k, 'final_cstep', round(cstep(np.concatenate([y, y]), SR * 120 / k), 2), round(len(y) / SR, 2), bank[layer][k]['used'], round(bank[layer][k]['per'], 2))
y = np.concatenate(pcm); pk = np.abs(y).max() + 1e-9; y = y / pk * 0.95
wavfile.write(f'{OUT}/{ID}.wav', SR, (y * 32767).astype(np.int16))
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', f'{OUT}/{ID}.wav', '-c:a', 'libvorbis', '-q:a', os.environ.get('Q', '3'), f'{OUT}/{ID}.ogg'], check=True)
real_on = sorted(k for k in bank['on'] if bank['on'][k]['real'])
real_off = sorted(k for k in bank['off'] if bank['off'][k]['real'])
json.dump(dict(id=ID, k=K, sr=SR, loops=table, real_on=real_on, real_off=real_off), open(f'{OUT}/{ID}.json', 'w'))
print(ID, 'on', len(bank['on']), 'real', real_on[:1], real_on[-1:], len(real_on), 'off', len(bank['off']), 'real', len(real_off),
      'sec', round(len(y) / SR, 1), 'ogg', os.path.getsize(f'{OUT}/{ID}.ogg') // 1024, 'KB')
