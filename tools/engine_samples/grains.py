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
# several recordings of the same engine type can share a bank ("a.wav+b.wav"):
# each is tracked on its own and the cycles are pooled
xs, grains, off = [], [], 0
for si, wav in enumerate(WAV.split('+')):
    tr = T.track(wav, K, RED)
    xi = X.highpass(resample_poly(tr['x'], 320, 441).astype(np.float32), SR, 30)
    t, f = tr['t'], X.smooth(tr['f'], 3)
    slope = np.gradient(X.smooth(f / K * 60, 5), t[1] - t[0])
    loud_fr = tr['rms'] / (np.percentile(tr['rms'], 98) + 1e-9)
    fs = np.interp(np.arange(len(xi)) / SR, t, f)   # firing freq per sample
    ph = np.cumsum(fs) / SR                          # firing phase (cycles)
    cyc_idx = np.floor(ph / (2 * K)).astype(np.int64)
    starts = np.flatnonzero(np.diff(cyc_idx) > 0) + 1
    for a_, b_ in zip(starts[:-1], starts[1:]):
        tm = (a_ + b_) / 2 / SR
        j = min(len(t) - 1, max(0, int(np.searchsorted(t, tm))))
        grains.append(dict(a=int(a_) + off, b=int(b_) + off, src=si, rpm=float(SR / (b_ - a_) * 60 * 2), conf=float(tr['conf'][j]), sl=float(slope[j]), loud=float(loud_fr[j])))
    xs.append(xi); xs.append(np.zeros(SR // 2, np.float32)); off += len(xi) + SR // 2
x = np.concatenate(xs)
CYC = 2 * K                                      # firings per engine cycle (720 deg)
# similarity of each cycle to the next: an engine repeats itself, noise doesn't
def resamp(seg, n): return np.interp(np.linspace(0, len(seg) - 1, n), np.arange(len(seg)), seg)
for i in range(len(grains) - 1):
    g, h = grains[i], grains[i + 1]
    if g['b'] - g['a'] < 40 or h['b'] - h['a'] < 40 or g['src'] != h['src']: g['sim'] = 0; continue
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
        if good(g, load) and (not cur or (abs(g['rpm'] / grains[cur[-1]]['rpm'] - 1) < CONT and grains[cur[-1]]['src'] == g['src'])): cur.append(i)
        else:
            if len(cur) >= MINRUN: runs[load].append(cur)
            cur = [i] if good(g, load) else []
    if len(cur) >= MINRUN: runs[load].append(cur)
# keep long stretches: the best runs first, each cut where its rpm band
# already holds CAP cycles, so a recorded sweep stays one continuous piece
# that playback can follow (the way Ginsu plays an acceleration ramp)
BAND = 150
CAP = int(os.environ.get('CAP', '6'))
def band(i): return int(grains[i]['rpm'] // BAND)
def qual(i): return grains[i]['sim'] * min(1, grains[i]['loud'] * 2)
pieces = {'on': [], 'off': []}
picked = {'on': {}, 'off': {}}
def accept(load, cur):
    pieces[load].append(cur)
    for j in cur: picked[load].setdefault(band(j), []).append(j)
for load in ('on', 'off'):
    for run in sorted(runs[load], key=lambda r: -sum(qual(i) for i in r)):
        cur = []
        for i in run + [None]:
            ok = i is not None and not (load == 'off' and grains[i]['rpm'] > RED * 0.85) and len(picked[load].get(band(i), [])) < CAP
            if ok: cur.append(i); continue
            if len(cur) >= MINRUN: accept(load, cur)
            cur = []
# a layer with no recording at some rpm borrows the other layer's real
# cycles there (still a recording, just pulling instead of coasting or back)
for load, other in (('on', 'off'), ('off', 'on')):
    missing = lambda i: band(i) not in picked[load] and not (load == 'off' and grains[i]['rpm'] > RED * 0.85)
    for p in list(pieces[other]):
        cur = []
        for i in p + [None]:
            if i is not None and missing(i): cur.append(i); continue
            if len(cur) >= MINRUN: accept(load, cur)
            cur = []
def band_piece(load, b):
    best = []
    for p in pieces[load]:
        sub = [i for i in p if band(i) == b]
        if len(sub) > len(best): best = sub
    return best
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
    rng = np.random.default_rng(len(marks) + int(r_dst))
    ncy = max(1, len(marks) // int(CYC)); cyc_pick = 0
    for m in range(int(ncyc * CYC) + 2):
        if m % int(CYC) == 0: cyc_pick = int(rng.integers(ncy))   # a random recorded cycle each time
        mi = cyc_pick * int(CYC) + m % int(CYC)
        sm = marks[mi % len(marks)]; T0 = widths[mi % len(widths)]
        h = int(T0); src0 = int(sm) - h
        if src0 < 0 or src0 + 2 * h >= len(x): continue
        win = np.hanning(2 * h)
        o0 = int(round(pad + (m + 0.5) * T1)) - h
        if o0 < 0 or o0 + 2 * h > len(out): continue
        g_ = x[src0:src0 + 2 * h]
        # stretched far, an uneven firing pattern gets exaggerated (real engines
        # smooth out at high rpm): blend the same firing from another cycle
        if T0 / T1 > 1.25 and len(marks) > 2 * CYC:
            sm2 = marks[(mi + int(CYC) * (1 + m % 3)) % len(marks)]; s2 = int(sm2) - h
            if 0 <= s2 and s2 + 2 * h < len(x): g_ = 0.5 * (g_ + x[s2:s2 + 2 * h])
        out[o0:o0 + 2 * h] += g_ * win; wsum[o0:o0 + 2 * h] += win
    out = out / np.maximum(wsum, 0.35)
    return out[pad:pad + L].astype(np.float32), T1 * CYC
TOPB = int(RED * 1.02 // BAND)
synth = {'on': {}, 'off': {}}
for load in ('on', 'off'):
    have = sorted(picked[load])
    if not have: continue
    top = TOPB if load == 'on' else int(RED * 0.85 // BAND)
    for b in range(min(have), top + 1):
        if b in have: continue
        below = sorted([h for h in have if h < b], reverse=True)[:3] or [min(have)]
        src_b = below[0]
        # source pulses from up to three nearby recorded stretches, so the
        # re-spaced cycles never repeat one recorded pattern (a buzz)
        piece = [i for sb in below for i in band_piece(load, sb)]
        # make two cycles more than needed and keep the fully overlapped
        # middle, with a few ms of margin either side that never plays
        full, clen = psola(piece, (b + 0.5) * BAND, 12)
        PRE, POST = int(0.004 * SR), int(0.008 * SR)
        c0 = int(round(clen)); a_ = max(0, c0 - PRE); b_ = min(len(full), int(round(clen * 11)) + POST)
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
uniq = {tuple(p): p for L_ in pieces.values() for p in L_}
envs = {k_: env_of(piece_audio(p)) for k_, p in uniq.items()}
mean_env = np.mean([e - e.max() for e in envs.values()], axis=0) if envs else None
def match(seg, key):
    e = envs[key]; corr = np.clip(mean_env - (e - e.max()), -9, 9)
    n = len(seg); m = 1 << int(np.ceil(np.log2(n + 2048)))
    S = np.fft.rfft(np.pad(seg, (1024, m - n - 1024), mode='reflect' if n > 1100 else 'constant'))
    g = 10 ** (np.interp(np.linspace(0, 1, len(S)), np.linspace(0, 1, len(corr)), corr) / 20)
    return np.fft.irfft(S * g, m)[1024:1024 + n].astype(np.float32)
# last check on everything packed: a segment whose highs burst (a pop,
# crackle or click that slipped through) is left out; playback uses a
# neighbouring one instead
_hp = butter(4, 3500, 'hp', fs=SR, output='sos')
def hf_ratio(seg):
    h = sosfilt(_hp, seg); w = int(0.002 * SR)
    if len(h) < 10 * w: return 0
    e = np.sqrt(np.convolve(h ** 2, np.ones(w) / w, 'valid')[::w // 2])
    return np.max(e) / (np.median(e) + 1e-9)
# the threshold adapts to the recording: some engines (a boxer with crackle)
# are bursty all the time, and that is their sound; only outliers go
_base = [hf_ratio(x[grains[p[0]]['a']:grains[p[-1]]['b']]) for L_ in pieces.values() for p in L_]
HF_THR = max(float(os.environ.get('HFBAD', '3.2')), 1.3 * float(np.median(_base)) if _base else 0)
def hf_bad(seg): return hf_ratio(seg) > HF_THR
dropped = [0, 0]
# pack: each piece is copied with its cycles; a level-normalised stream
pcm, table, pos = [np.zeros(400, np.float32)], [], 400
for load in ('on', 'off'):
    for piece in pieces[load]:
        if True:
            # keep some real recording either side of the cycles we use, so
            # the cut edges (and the EQ's ringing) stay outside them
            PRE, POST = int(0.004 * SR), int(0.008 * SR)
            a0 = max(0, grains[piece[0]]['a'] - PRE); b0 = min(len(x), grains[piece[-1]]['b'] + POST)
            seg = match(x[a0:b0].copy(), tuple(piece))
            g0 = a0
            # every cycle to the same level, with a smooth gain between them,
            # so pieces from different moments join without level jumps
            rms = np.array([np.sqrt(np.mean(x[grains[i]['a']:grains[i]['b']] ** 2)) + 1e-9 for i in piece])
            # level correction smoothed over ~7 cycles: evens out distance and
            # mic changes but keeps the natural cycle-to-cycle variation
            sm_rms = np.convolve(np.pad(rms, 3, mode='edge'), np.ones(7) / 7, 'valid')
            gains = 0.1 / sm_rms
            env = np.interp(np.arange(len(seg)), [(grains[i]['a'] + grains[i]['b']) / 2 - g0 for i in piece], gains)
            seg = seg * env
            fi = grains[piece[0]]['a'] - a0; fo = b0 - grains[piece[-1]]['b']
            if hf_bad(seg[fi:len(seg) - fo]): dropped[0] += 1; continue
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
        if key not in envs: envs[key] = env_of(piece_audio(list(key)))
        seg = match(seg, key)
        seg = seg / (np.sqrt(np.mean(seg ** 2)) + 1e-9) * 0.1
        if hf_bad(seg[off0:off0 + int(round(clen * 10))]): dropped[1] += 1; continue
        if off0 > 1: seg[:off0] *= np.linspace(0, 1, off0)
        tail = len(seg) - off0 - int(round(clen * 10))
        if tail > 1: seg[-tail:] *= np.linspace(1, 0, tail)
        for c_ in range(10):
            table.append([int(round(pos + off0 + c_ * clen)), int(round(clen)), round((b + 0.5) * BAND), 1 if load == 'on' else 0])
        table[-1].append(1)
        pcm.append(seg); pos += len(seg); pcm.append(np.zeros(200, np.float32)); pos += 200
y = np.concatenate(pcm); y = y / (np.abs(y).max() + 1e-9) * 0.95
wavfile.write(f'{OUT}/{ID}.wav', SR, (y * 32767).astype(np.int16))
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', f'{OUT}/{ID}.wav', '-c:a', 'libvorbis', '-q:a', '4', f'{OUT}/{ID}.ogg'], check=True)
on = sorted(set(int(r[2] // 250 * 250) for r in table if r[3])); off = sorted(set(int(r[2] // 250 * 250) for r in table if not r[3]))
real_on = sorted(r for b in picked['on'] for r in [(b + 0.5) * BAND])
real_off = sorted(r for b in picked['off'] for r in [(b + 0.5) * BAND])
json.dump(dict(id=ID, k=K, sr=SR, grains=table, real_on=[real_on[0], real_on[-1], len(real_on)] if real_on else None,
               real_off=[real_off[0], real_off[-1], len(real_off)] if real_off else None), open(f'{OUT}/{ID}.json', 'w'))
cov = lambda s: '%d-%d (%d bands)' % (s[0], s[-1] + 250, len(s)) if s else 'none'
nreal = sum(len(p) for L_ in pieces.values() for p in L_)
print(ID, 'grains', len(table), 'real', nreal, 'dropped', dropped, 'on', cov(on), 'off', cov(off), 'ogg', os.path.getsize(f'{OUT}/{ID}.ogg') // 1024, 'KB')
