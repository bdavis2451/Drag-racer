import json, urllib.request, time, os, re, sys
sel = json.load(open('sel.json'))
UA = 'PixelDragGame/1.0 (https://github.com/bdavis2451/drag-racer; bdavis2451@gmail.com) python-urllib'
def tu(u):
    u = u.split('?')[0]; base, name = u.rsplit('/', 1)
    return base.replace('/commons/', '/commons/transcoded/') + '/' + name + '/' + name + '.mp3'
order = sys.argv[1:] or list(sel)
for k in order:
    v = sel[k]
    fn = 'raw/' + re.sub(r'[^A-Za-z0-9]+', '_', k).strip('_') + '.mp3'
    if os.path.exists(fn): continue
    wait = 20
    while True:
        try:
            with urllib.request.urlopen(urllib.request.Request(tu(v['url']), headers={'User-Agent': UA}), timeout=90) as r:
                open(fn, 'wb').write(r.read())
            print('ok', k, flush=True); break
        except Exception as e:
            print('wait', wait, k, str(e)[:40], flush=True); time.sleep(wait); wait = min(600, wait * 1.5)
    time.sleep(4)
print('done')
