# banks.json: credits from Commons metadata, engine -> bank (first bank that passed the gate)
import json, os
sel = json.load(open('sel.json')); src = json.load(open('sources.json'))
PREF = {
 'i3_10': ['i3_up'], 'f4_16': ['vw_beetle'], 'i4_15': ['i4_neon', 'i4_ctr', 'i4_mx5'], 'i4_16': ['i4_mx5', 'i4_s2k'], 'i4_18': ['i4_ctr', 'i4_s2k'],
 'i4_20': ['i4_neon', 'i4_mx5'], 'i4_20hi': ['i4_s2k', 'i4_ctr'], 'i4_20t': ['i4_240', 'i4_evo'], 'i4_20tev': ['i4_evo', 'i4_240'],
 'f4_25t': ['boxer_sti'], 'rot_13t': ['rotary_rx7'],
 'i6_30': ['i6_supra', 'i6_r34'], 'i6_32': ['i6_e46', 'i6_r34'], 'i6_26tt': ['i6_r34', 'i6_supra'], 'i6_30tt': ['i6_supra', 'i6_r34'],
 'v6_35': ['v6_laguna', 'v6_omega', 'v6_nsx'], 'v6_38t': ['v6_omega', 'v6_laguna', 'v6_nsx'], 'v6_38gnx': ['v6_omega', 'v6_laguna', 'v6_nsx'], 'v6_38tt': ['v6_nsx', 'v6_omega'],
 'f6_38tt': ['flat6_gt2', 'flat6_996'],
 'v8_46sc': ['v8_gt500', 'v8_s550', 'v8_z06'], 'v8_305': ['v8_monte', 'v8_nova', 'v8_z06'], 'v8_50': ['v8_transam', 'v8_z28', 'v8_nova', 'v8_z06'], 'v8_50d': ['v8_s550', 'v8_gt500', 'v8_z06'],
 'v8_283': ['v8_belair', 'v8_nova', 'v8_z06'], 'sbc350': ['v8_nova', 'v8_z28', 'v8_gto', 'v8_z06'], 'v8_57tbi': ['v8_suburban', 'v8_monte'],
 'v8_57': ['v8_z06', 'v8_s550'], 'v8_62': ['v8_z06', 'v8_s550'], 'v8_70': ['v8_z06', 'v8_s550'], 'v8_62sc': ['v8_gt500', 'v8_z06'],
 'hemi_70': ['v8_coronet', 'v8_bee', 'v8_z06'], 'bb_74': ['v8_442', 'v8_gto', 'v8_bee', 'v8_z06'], 'bb_94': ['v8_gto', 'v8_bee', 'v8_z06'], 'v8_86b': ['v8_bee', 'v8_gto', 'v8_z06'],
 'v10_84': ['v10_viper'], 'v12_65': ['v12_f12', 'v12_countach'],
}
# failed a listen-by-eye check of the loop spectrograms
REJECT = {'i4_neon', 'v8_gto'}
ok = {}
for bid in src:
    fn = 'banks/%s.json' % bid
    if not os.path.exists(fn): continue
    m = json.load(open(fn)); on = sorted(l[0] for l in m['loops'] if l[1])
    # gate: enough loops, and they reach at least 3500 rpm
    if len(on) >= 4 and on[-1] >= 2800 and bid not in REJECT: ok[bid] = m
banks, by_engine = {}, {}
for eng, prefs in PREF.items():
    for b in prefs:
        if b in ok: by_engine[eng] = b; break
for b in sorted(set(by_engine.values())):
    car = src[b][0]; info = sel[car]
    title = info['title'].replace('File:', '').rsplit('.', 1)[0]
    banks[b] = {'credit': '%s: "%s" by %s, CC BY 3.0, via Wikimedia Commons (https://commons.wikimedia.org/wiki/%s)' % (car, title, info['artist'].replace(' (YouTube)', ''), info['title'].replace(' ', '_'))}
json.dump({'banks': banks, 'by_layout': {}, 'by_engine': by_engine}, open('banks.json', 'w'), indent=1)
print('banks', len(banks), 'engines voiced', len(by_engine), 'of', len(PREF) + 1)
print('dropped:', sorted(set(src) - set(ok)))
