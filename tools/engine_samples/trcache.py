# cache firing-frequency tracks of every source used by a bank: tr/NAME_K.npz
import json, re, os, sys, numpy as np
from multiprocessing import Pool
import track as T
src = json.load(open('sources.json'))
jobs = set()
for bid, (name, k, red) in src.items():
    for n in (name if isinstance(name, list) else [name]):
        w = 'wav/%s.wav' % re.sub(r'[^A-Za-z0-9]+', '_', n).strip('_')
        if os.path.exists(w): jobs.add((w, k, red))
def one(j):
    w, k, red = j
    out = 'tr/%s_%g.npz' % (os.path.basename(w)[:-4], k)
    if os.path.exists(out): return out
    r = T.track(w, k, red)
    np.savez(out, t=r['t'], f=r['f'], conf=r['conf'], rms=r['rms'], red=red)
    return out
with Pool(4) as p:
    for o in p.imap_unordered(one, sorted(jobs)): print(o, flush=True)
