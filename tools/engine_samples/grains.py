# Granular engine bank (NFSU2 "Ginsu" / REV style): cut a recording into whole
# engine cycles, each tagged with its rpm and load (rising revs = on, falling
# = off), keep runs of consecutive clean cycles, and pack the best runs per
# rpm band.  usage: grains.py ID WAV K RED
import sys, json, os, subprocess, numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly
import track as T, extract as X

ID, WAV, K, RED = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
SIM = float(os.environ.get('SIM', '0.42'))
CONT = float(os.environ.get('CONT', '0.08')); MINRUN = int(os.environ.get('MINRUN', '3'))
OUT = 'gbanks'; os.makedirs(OUT, exist_ok=True)
SR = 32000
tr = T.track(WAV, K, RED)
x = X.highpass(resample_poly(tr['x'], 320, 441).astype(np.float32), SR, 30)
t, f = tr['t'], X.smooth(tr['f'], 3)
rpm_fr = f / K * 60
slope = np.gradient(X.smooth(rpm_fr, 5), t[1] - t[0])
loud_fr = tr['rms'] / (np.percentile(tr['rms'], 98) + 1e-9)
ts = np.arange(len(x)) / SR
fs = np.interp(ts, t, f)                       # firing freq per sample
ph = np.cumsum(fs) / SR                          # firing phase (cycles)
CYC = 2 * K                                      # firings per engine cycle (720 deg)
cyc_idx = np.floor(ph / CYC).astype(np.int64)
starts = np.flatnonzero(np.diff(cyc_idx) > 0) + 1
grains = []
for a, b in zip(starts[:-1], starts[1:]):
    tm = (a + b) / 2 / SR
    j = min(len(t) - 1, max(0, int(np.searchsorted(t, tm))))
    grains.append(dict(a=int(a), b=int(b), rpm=float(SR / (b - a) * 60 * 2), conf=float(tr['conf'][j]), sl=float(slope[j]), loud=float(loud_fr[j])))
# similarity of each cycle to the next: an engine repeats itself, noise doesn't
def resamp(seg, n): return np.interp(np.linspace(0, len(seg) - 1, n), np.arange(len(seg)), seg)
for i in range(len(grains) - 1):
    g, h = grains[i], grains[i + 1]
    if g['b'] - g['a'] < 40 or h['b'] - h['a'] < 40: g['sim'] = 0; continue
    n = 256; u = resamp(x[g['a']:g['b']], n); v = resamp(x[h['a']:h['b']], n)
    u = u - u.mean(); v = v - v.mean()
    g['sim'] = float(np.dot(u, v) / (np.linalg.norm(u) * np.linalg.norm(v) + 1e-9))
grains[-1]['sim'] = 0
# a cycle with an outsized spike (a backfire, a door, a click) would be
# repeated over and over as a crackle: leave those out
from scipy.signal import butter, sosfilt
xh = sosfilt(butter(4, 3000, 'hp', fs=SR, output='sos'), x)
for g in grains:
    seg = x[g['a']:g['b']]; sh = xh[g['a']:g['b']]
    g['crest'] = float(np.abs(seg).max() / (np.sqrt(np.mean(seg ** 2)) + 1e-9)) if len(seg) > 8 else 99
    # ticks and crackles hide under the big low pulses: check the highs alone
    g['hcrest'] = float(np.abs(sh).max() / (np.sqrt(np.mean(sh ** 2)) + 1e-9)) if len(sh) > 8 else 99
HCREST = float(os.environ.get('HCREST', '6.5'))
CREST = float(os.environ.get('CREST', '4.2'))
# runs: consecutive cycles that are clean, similar and at a plausible rpm
def good(g, load):
    if not (450 < g['rpm'] < RED * 1.05) or g['conf'] < 0.35 or g['loud'] < 0.12 or g['sim'] < SIM or g['crest'] > CREST or g['hcrest'] > HCREST: return False
    return g['sl'] > -500 if load == 'on' else g['sl'] < 300
runs = {'on': [], 'off': []}
for load in ('on', 'off'):
    cur = []
    for i, g in enumerate(grains):
        if good(g, load) and (not cur or abs(g['rpm'] / grains[cur[-1]]['rpm'] - 1) < CONT): cur.append(i)
        else:
            if len(cur) >= MINRUN: runs[load].append(cur)
            cur = [i] if good(g, load) else []
    if len(cur) >= MINRUN: runs[load].append(cur)
# pick per 150-rpm band the best run pieces (up to 8 cycles), on and off
BAND = 150
picked = {'on': {}, 'off': {}}
for load in ('on', 'off'):
    for run in runs[load]:
        for s0 in range(0, len(run), 4):
            piece = run[s0:s0 + 8]
            if len(piece) < MINRUN: continue
            r = np.mean([grains[i]['rpm'] for i in piece])
            q = np.mean([grains[i]['sim'] for i in piece]) * np.mean([min(1, grains[i]['loud'] * 2) for i in piece])
            if load == 'off' and r > RED * 0.85: continue
            band = int(r // BAND)
            cand = picked[load].setdefault(band, [])
            cand.append((q, piece)); cand.sort(key=lambda c: -c[0]); del cand[1:]
# a layer with no recording at some rpm borrows the other layer's real
# cycles there (still a recording, just pulling instead of coasting or back)
for load, other in (('on', 'off'), ('off', 'on')):
    for b, cand in list(picked[other].items()):
        if b not in picked[load] and not (load == 'off' and (b + 0.5) * BAND > RED * 0.85):
            picked[load][b] = cand
# fill the rpm bands the recording never held cleanly by re-spacing its own
# combustion pulses (pitch-synchronous overlap-add): the pulses keep their
# shape and the pipe's resonance, only the firing rate changes
def psola(piece, r_dst, ncyc):
    marks, widths = [], []
    for i in piece:
        a, b = grains[i]['a'], grains[i]['b']; T0 = (b - a) / CYC
        for m in range(int(CYC)): marks.append(a + T0 * (m + 0.5)); widths.append(T0)
    T1 = SR * 60 / (r_dst * K)
    L = int(round(ncyc * CYC * T1)) + 1
    pad = 2 * int(max(widths)) + 4
    out = np.zeros(L + 2 * pad + 4 * int(T1) + 8); wsum = np.zeros_like(out)
    for m in range(int(ncyc * CYC) + 2):
        sm = marks[m % len(marks)]; T0 = widths[m % len(widths)]
        h = int(T0); src0 = int(sm) - h
        if src0 < 0 or src0 + 2 * h >= len(x): continue
        win = np.hanning(2 * h)
        o0 = int(round(pad + (m + 0.5) * T1)) - h
        if o0 < 0 or o0 + 2 * h > len(out): continue
        out[o0:o0 + 2 * h] += x[src0:src0 + 2 * h] * win; wsum[o0:o0 + 2 * h] += win
    out = out / np.maximum(wsum, 0.35)
    return out[pad:pad + L].astype(np.float32), T1 * CYC
TOPB = int(RED * 1.02 // BAND)
synth = {'on': {}, 'off': {}}
for load in ('on', 'off'):
    have = sorted(picked[load])
    if not have: continue
    top = TOPB if load == 'on' else int(RED * 0.85 // BAND)
    for b in range(min(have), top + 1, 2):
        if any(abs(b - h) <= 1 for h in have): continue
        src_b = max([h for h in have if h < b], default=min(have))
        piece = picked[load][src_b][0][1]
        # make two cycles more than needed and keep the fully overlapped
        # middle, with a few ms of margin either side that never plays
        full, clen = psola(piece, (b + 0.5) * BAND, 8)
        PRE, POST = int(0.004 * SR), int(0.008 * SR)
        c0 = int(round(clen)); a_ = max(0, c0 - PRE); b_ = min(len(full), int(round(clen * 7)) + POST)
        synth[load][b] = (full[a_:b_].copy(), clen, tuple(piece), c0 - a_)
# timbre matching: pieces were recorded at different distances and angles,
# so EQ each one (smooth curve, +-9 dB) toward the bank's average spectrum
def env_of(seg):
    n = 4096; acc = np.zeros(n // 2 + 1); cnt = 0
    for o in range(0, max(1, len(seg) - n), n // 2):
        fr = seg[o:o + n]
        if len(fr) < n: fr = np.pad(fr, (0, n - len(fr)))
        acc += np.abs(np.fft.rfft(fr * np.hanning(n))) ** 2; cnt += 1
    e = 10 * np.log10(acc / max(1, cnt) + 1e-12)
    k = 25; return np.convolve(np.pad(e, k, mode='edge'), np.ones(2 * k + 1) / (2 * k + 1), 'valid')
def piece_audio(piece): return x[grains[piece[0]]['a']:grains[piece[-1]]['b']]
allp = [c[0][1] for L_ in picked.values() for c in L_.values()]
uniq = {tuple(p): p for p in allp}
envs = {k_: env_of(piece_audio(p)) for k_, p in uniq.items()}
mean_env = np.mean([e - e.max() for e in envs.values()], axis=0) if envs else None
def match(seg, key):
    e = envs[key]; corr = np.clip(mean_env - (e - e.max()), -9, 9)
    n = len(seg); m = 1 << int(np.ceil(np.log2(n + 2048)))
    S = np.fft.rfft(np.pad(seg, (1024, m - n - 1024), mode='reflect' if n > 1100 else 'constant'))
    g = 10 ** (np.interp(np.linspace(0, 1, len(S)), np.linspace(0, 1, len(corr)), corr) / 20)
    return np.fft.irfft(S * g, m)[1024:1024 + n].astype(np.float32)
# pack: each piece is copied with its cycles; a level-normalised stream
pcm, table, pos = [np.zeros(400, np.float32)], [], 400
for load in ('on', 'off'):
    for band in sorted(picked[load]):
        for q, piece in picked[load][band]:
            # keep some real recording either side of the cycles we use, so
            # the cut edges (and the EQ's ringing) stay outside them
            PRE, POST = int(0.004 * SR), int(0.008 * SR)
            a0 = max(0, grains[piece[0]]['a'] - PRE); b0 = min(len(x), grains[piece[-1]]['b'] + POST)
            seg = match(x[a0:b0].copy(), tuple(piece))
            g0 = a0
            # every cycle to the same level, with a smooth gain between them,
            # so pieces from different moments join without level jumps
            rms = np.array([np.sqrt(np.mean(x[grains[i]['a']:grains[i]['b']] ** 2)) + 1e-9 for i in piece])
            gains = 0.1 / rms
            env = np.interp(np.arange(len(seg)), [(grains[i]['a'] + grains[i]['b']) / 2 - g0 for i in piece], gains)
            seg = seg * env
            fi = grains[piece[0]]['a'] - a0; fo = b0 - grains[piece[-1]]['b']
            if fi > 1: seg[:fi] *= np.linspace(0, 1, fi)
            if fo > 1: seg[-fo:] *= np.linspace(1, 0, fo)
            for i in piece:
                g = grains[i]
                table.append([pos + g['a'] - g0, g['b'] - g['a'], round(g['rpm']), 1 if load == 'on' else 0])
            # mark the end of a run so playback knows where it breaks
            table[-1].append(1)
            pcm.append(seg.astype(np.float32)); pos += len(seg)
            pcm.append(np.zeros(200, np.float32)); pos += 200
    for b in sorted(synth[load]):
        seg, clen, key, off0 = synth[load][b]
        seg = match(seg, key) if key in envs else seg
        seg = seg / (np.sqrt(np.mean(seg ** 2)) + 1e-9) * 0.1
        if off0 > 1: seg[:off0] *= np.linspace(0, 1, off0)
        tail = len(seg) - off0 - int(round(clen * 6))
        if tail > 1: seg[-tail:] *= np.linspace(1, 0, tail)
        for c_ in range(6):
            table.append([int(round(pos + off0 + c_ * clen)), int(round(clen)), round((b + 0.5) * BAND), 1 if load == 'on' else 0])
        table[-1].append(1)
        pcm.append(seg); pos += len(seg); pcm.append(np.zeros(200, np.float32)); pos += 200
y = np.concatenate(pcm); y = y / (np.abs(y).max() + 1e-9) * 0.95
wavfile.write(f'{OUT}/{ID}.wav', SR, (y * 32767).astype(np.int16))
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', f'{OUT}/{ID}.wav', '-c:a', 'libvorbis', '-q:a', '3', f'{OUT}/{ID}.ogg'], check=True)
on = sorted(set(int(r[2] // 250 * 250) for r in table if r[3])); off = sorted(set(int(r[2] // 250 * 250) for r in table if not r[3]))
real_on = sorted(r for b in picked['on'] for r in [(b + 0.5) * BAND])
real_off = sorted(r for b in picked['off'] for r in [(b + 0.5) * BAND])
json.dump(dict(id=ID, k=K, sr=SR, grains=table, real_on=[real_on[0], real_on[-1], len(real_on)] if real_on else None,
               real_off=[real_off[0], real_off[-1], len(real_off)] if real_off else None), open(f'{OUT}/{ID}.json', 'w'))
cov = lambda s: '%d-%d (%d bands)' % (s[0], s[-1] + 250, len(s)) if s else 'none'
nreal = sum(len(p[0][1]) for L_ in picked.values() for p in L_.values())
print(ID, 'grains', len(table), 'real', nreal, 'on', cov(on), 'off', cov(off), 'ogg', os.path.getsize(f'{OUT}/{ID}.ogg') // 1024, 'KB')
