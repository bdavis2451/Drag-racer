import json, subprocess, re, os, sys
from multiprocessing import Pool
src = json.load(open('sources.json'))
src.update(json.load(open('sources_extra.json')) if os.path.exists('sources_extra.json') else {})
# recordings with little clean audio: shorter loops are allowed
SPARSE = dict(MINDUR='0.15', PMIN='0.3', LPMIN='0.25')
def one(bid):
    name, k, red = src[bid]
    names = name if isinstance(name, list) else [name]
    wavs = ['wav/%s.wav' % re.sub(r'[^A-Za-z0-9]+', '_', n).strip('_') for n in names]
    wavs = [w for w in wavs if os.path.exists(w)]
    if not wavs: return bid + ' missing'
    env = dict(os.environ, **SPARSE) if bid in ('v10_viper', 'v6_pool') else None
    r = subprocess.run(['python3', 'loops.py', bid, '+'.join(wavs), str(k), str(red)], capture_output=True, text=True, env=env)
    return r.stdout.strip() if not r.returncode else bid + ' ERR ' + r.stderr[-300:]
with Pool(4) as p:
    for l in p.imap_unordered(one, sys.argv[1:] or list(src)): print(l, flush=True)
