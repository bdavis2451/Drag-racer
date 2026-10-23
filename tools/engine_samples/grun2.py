import json, subprocess, re, os, sys
from multiprocessing import Pool
src = json.load(open('sources.json'))
LOOSE = {'v12_f12', 'v12_countach', 'v10_viper', 'v8_s550'}
MID = {'d_pool', 'v8_classic', 'v6_nsx', 'v6_laguna', 'v6_omega', 'd_defender', 'd_passat', 'v8_suburban', 'v8_gt500', 'v8_nova', 'v8_belair'}
def one(bid):
    name, k, red = src[bid]
    names = name if isinstance(name, list) else [name]
    wavs = ['wav/%s.wav' % re.sub(r'[^A-Za-z0-9]+', '_', n).strip('_') for n in names]
    wavs = [w for w in wavs if os.path.exists(w)]
    if not wavs: return bid, 'missing'
    fn = None
    env = dict(os.environ)
    if bid in LOOSE: env.update(SIM='0.3', CONT='0.15', MINRUN='2')
    elif bid in MID: env.update(SIM='0.3')
    r = subprocess.run(['python3', 'grains.py', bid, '+'.join(wavs), str(k), str(red)], capture_output=True, text=True, env=env)
    if r.returncode: return bid, r.stderr[-200:]
    m = json.load(open('gbanks/%s.json' % bid)); return bid, m.get('real_on'), m.get('real_off')
with Pool(4) as p:
    for l in p.imap_unordered(one, sys.argv[1:] or list(src)): print(l, flush=True)
