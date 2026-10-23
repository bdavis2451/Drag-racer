# Pop bank: real exhaust pops and bangs cut from the recordings (picked by
# eye from popfind.py's candidates), each a short clip from just before the
# crack to where it has died away, levelled to the same peak.
import json, subprocess, numpy as np, os, sys
from scipy.io import wavfile
from scipy.signal import resample_poly, butter, sosfiltfilt
SR = 32000
C = json.load(open('popsel.json'))
PICK = [int(i) for i in os.environ.get('PICK', '0,2,4,5,6,7,8,9,10,11,12,19,20,21,26,27,29,32,33,34,35,36,37,40,41,46,47').split(',')]
hp = butter(2, 60, 'hp', fs=SR, output='sos')
pcm, table, pos, used = [np.zeros(32, np.float32)], [], 32, set()
cache = {}
for i in PICK:
    c = C[i]
    if c['src'] not in cache:
        sr, x = wavfile.read(f"wav/{c['src']}.wav"); x = x.astype(np.float32); x = x.mean(1) if x.ndim > 1 else x
        cache[c['src']] = sosfiltfilt(hp, resample_poly(x / (np.abs(x).max() + 1e-9), 320, sr // 100)).astype(np.float32)
    x = cache[c['src']]; on = int(c['t'] * SR)
    # the true onset: first sample within 6 ms that reaches a third of the peak
    seg = x[on - int(0.004 * SR):on + int(0.03 * SR)]; pk = np.abs(seg).max()
    on = on - int(0.004 * SR) + int(np.argmax(np.abs(seg) > pk / 3))
    L = int(SR * (0.004 + max(0.05, c['dur'] / 1000 + 0.03)))
    y = x[on - int(0.004 * SR):on - int(0.004 * SR) + L].copy()
    f_in = int(0.003 * SR); y[:f_in] *= np.linspace(0, 1, f_in) ** 2
    t = np.arange(L) / SR; y *= np.exp(-np.maximum(0, t - 0.03) / 0.025)       # let it die away
    y[-int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR))
    y = y / (np.abs(y).max() + 1e-9) * 0.9
    table.append([pos, len(y)]); pcm.append(y); pcm.append(np.zeros(32, np.float32)); pos += len(y) + 32
    used.add(c['src'])
Y = np.concatenate(pcm)
wavfile.write('lbanks/pops.wav', SR, (Y * 32767).astype(np.int16))
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', 'lbanks/pops.wav', '-c:a', 'libvorbis', '-q:a', '7', 'lbanks/pops.ogg'], check=True)
json.dump(dict(sr=SR, pops=table, sources=sorted(used)), open('lbanks/pops.json', 'w'))
print(len(table), 'pops from', sorted(used), os.path.getsize('lbanks/pops.ogg') // 1024, 'KB')
