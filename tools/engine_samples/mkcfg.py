# banks.json for the loop banks: credits, engine -> bank (first that passes
# the gate), per-engine playback options
import json, os
sel = json.load(open('sel.json')); src = json.load(open('sources.json')); src.update(json.load(open('sources_extra.json')))
LB = os.environ.get('LBDIR', 'lbanks')
I6, V6, V8M, V8C, I4 = ['i6_pool', 'i6_r34'], ['v6_pool', 'v6_nsx'], ['v8_modern', 'v8_z06'], ['v8_classic', 'v8_modern'], ['i4_mx5', 'i4_ctr']
PREF = {
 'i3_10': ['i3_pool', 'i3_up'], 'f4_16': ['vw_beetle', 'boxer_sti'], 'i4_15': ['i4_ctr', 'i4_mx5'], 'i4_16': ['i4_mx5', 'i4_s2k'], 'i4_18': ['i4_ctr', 'i4_s2k'],
 'i4_20': ['i4_mx5', 'i4_ctr'], 'i4_20hi': ['i4_s2k', 'i4_ctr'], 'i4_20t': ['i4_evo', 'i4_240'], 'i4_20tev': ['i4_evo', 'i4_240'],
 'f4_25t': ['boxer_sti'], 'rot_13t': ['rotary_rx7'],
 'i6_30': I6, 'i6_32': I6, 'i6_26tt': ['i6_r34'] + I6, 'i6_30tt': I6,
 'v6_35': V6, 'v6_38t': V6, 'v6_38gnx': V6, 'v6_38tt': V6, 'f6_38tt': ['flat6_pool', 'flat6_996'],
 'v8_46sc': V8M, 'v8_50d': V8M, 'v8_57': V8M, 'v8_62': V8M, 'v8_70': V8M, 'v8_62sc': V8M,
 'v8_305': V8C, 'v8_50': V8C, 'v8_283': V8C, 'sbc350': V8C, 'v8_57tbi': V8C, 'hemi_70': V8C, 'bb_74': V8C, 'bb_94': V8C, 'v8_86b': V8C,
 'v10_84': ['v10_viper', 'v8_modern'], 'd_67': ['d_pool', 'd_defender'],
 # a V12 is two inline sixes firing in between each other: the six's
 # recordings, doubled half a firing apart
 'v12_65': I6,
}
OPTS = {'v12_65': {'dbl': 1}}
EXTRA_CREDIT = {
 'BMW M3 E92': '"2008 BMW M3 E92 s65 V8 Exhaust Sound Recordings (Raw WAV Files)" by Nate Lee, CC BY 4.0, via Internet Archive (https://archive.org/details/2008-bmw-m3-e92-s65-exhaust-sound-recordings)',
}
ok = {}
for bid in src:
    fn = f'{LB}/{bid}.json'
    if not os.path.exists(fn): continue
    ro = json.load(open(fn)).get('real_on') or []
    # gate: real recorded loops from near idle to 3200+ rpm
    # (the Viper's recording is sparse, but it is the only V10)
    if ro and ro[0] <= 1800 and ro[-1] >= 3200 and len(ro) >= (6 if bid == 'v10_viper' else 8): ok[bid] = ro
banks, by_engine = {}, {}
for eng, prefs in PREF.items():
    for b in prefs:
        if b in ok: by_engine[eng] = b; break
for b in sorted(set(by_engine.values())):
    cars = src[b][0] if isinstance(src[b][0], list) else [src[b][0]]
    parts = []
    for car in cars:
        if car in EXTRA_CREDIT: parts.append('%s: %s' % (car, EXTRA_CREDIT[car])); continue
        info = sel[car]; title = info['title'].replace('File:', '').rsplit('.', 1)[0]
        parts.append('%s: "%s" by %s, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/%s)' % (car, title, info['artist'].replace(' (YouTube)', '').replace('<', '').replace('>', ''), info['title'].replace(' ', '_')))
    banks[b] = {'credit': '; '.join(parts)}
json.dump({'banks': banks, 'by_layout': {}, 'by_engine': by_engine, 'opts': {e: o for e, o in OPTS.items() if e in by_engine}}, open('banks.json', 'w'), indent=1)
print('banks', len(banks), sorted(banks), 'engines voiced', len(by_engine), 'of', len(PREF))
print('unvoiced:', sorted(set(PREF) - set(by_engine)))
for e in sorted(by_engine): print(' ', e, by_engine[e], ok[by_engine[e]][0], ok[by_engine[e]][-1], len(ok[by_engine[e]]))
